"""Unified User Service - Single Source of Truth for User Data

This service resolves the dual-collection issue by providing a unified interface
for all user operations. It ensures data consistency between 'users' and 'user_accounts'
collections while we migrate to a single collection.

Architecture:
- Primary Collection: user_accounts (modern, email-based auth)
- Legacy Collection: users (old wallet-based system)
- All writes go to BOTH collections
- All reads check user_accounts first, then users (with fallback)
- Eventual goal: Migrate all to user_accounts and deprecate users
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, List
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class UserService:
    """Unified user management service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.primary_collection = "user_accounts"  # Modern collection
        self.legacy_collection = "users"  # Legacy collection
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by user_id from either collection
        
        Priority:
        1. Check user_accounts (primary)
        2. Fallback to users (legacy)
        """
        # Check primary collection first
        user = await self.db[self.primary_collection].find_one(
            {"user_id": user_id}, 
            {"_id": 0}
        )
        
        if user:
            logger.debug(f"Found user {user_id} in {self.primary_collection}")
            return user
        
        # Fallback to legacy collection
        user = await self.db[self.legacy_collection].find_one(
            {"user_id": user_id}, 
            {"_id": 0}
        )
        
        if user:
            logger.debug(f"Found user {user_id} in {self.legacy_collection} (legacy)")
            # Optionally: Auto-migrate to primary collection
            await self._migrate_user_to_primary(user)
            return user
        
        logger.warning(f"User {user_id} not found in any collection")
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email from either collection"""
        # Check primary collection first
        user = await self.db[self.primary_collection].find_one(
            {"email": email}, 
            {"_id": 0}
        )
        
        if user:
            return user
        
        # Fallback to legacy collection
        user = await self.db[self.legacy_collection].find_one(
            {"email": email}, 
            {"_id": 0}
        )
        
        if user:
            await self._migrate_user_to_primary(user)
            return user
        
        return None
    
    async def get_user_by_wallet(self, wallet_address: str) -> Optional[Dict]:
        """Get user by wallet address (legacy compatibility)"""
        # Check both collections
        user = await self.db[self.primary_collection].find_one(
            {"wallet_address": wallet_address}, 
            {"_id": 0}
        )
        
        if user:
            return user
        
        user = await self.db[self.legacy_collection].find_one(
            {"wallet_address": wallet_address}, 
            {"_id": 0}
        )
        
        if user:
            await self._migrate_user_to_primary(user)
            return user
        
        return None
    
    async def update_user(self, user_id: str, update_data: Dict) -> bool:
        """Update user in BOTH collections to maintain consistency
        
        Critical: All updates must be synchronized between collections
        """
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update primary collection
        result1 = await self.db[self.primary_collection].update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        # Update legacy collection (if user exists there)
        result2 = await self.db[self.legacy_collection].update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        updated = result1.modified_count > 0 or result2.modified_count > 0
        
        if updated:
            logger.info(f"Updated user {user_id} in both collections")
        else:
            logger.warning(f"User {user_id} not found in either collection for update")
        
        return updated
    
    async def create_user(self, user_data: Dict) -> str:
        """Create user in primary collection (user_accounts)
        
        New users should only be created in user_accounts.
        Legacy 'users' collection is deprecated for new users.
        """
        # Ensure user_id exists
        if "user_id" not in user_data:
            import uuid
            user_data["user_id"] = str(uuid.uuid4())
        
        # Add timestamps
        if "created_at" not in user_data:
            user_data["created_at"] = datetime.now(timezone.utc).isoformat()
        user_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Insert into primary collection
        await self.db[self.primary_collection].insert_one(user_data)
        
        logger.info(f"Created new user {user_data['user_id']} in {self.primary_collection}")
        return user_data["user_id"]
    
    async def user_exists(self, email: str = None, user_id: str = None) -> bool:
        """Check if user exists in either collection"""
        if email:
            user = await self.get_user_by_email(email)
        elif user_id:
            user = await self.get_user_by_id(user_id)
        else:
            return False
        
        return user is not None
    
    async def find_users(self, query: Dict, limit: int = 100) -> List[Dict]:
        """Find multiple users across both collections"""
        # Search in primary collection
        primary_users = await self.db[self.primary_collection].find(
            query, 
            {"_id": 0}
        ).limit(limit).to_list(length=limit)
        
        # Get user_ids already found
        found_ids = {u["user_id"] for u in primary_users if "user_id" in u}
        
        # Search in legacy collection (exclude already found users)
        legacy_query = {**query, "user_id": {"$nin": list(found_ids)}}
        legacy_users = await self.db[self.legacy_collection].find(
            legacy_query, 
            {"_id": 0}
        ).limit(limit - len(primary_users)).to_list(length=limit)
        
        # Combine results
        all_users = primary_users + legacy_users
        
        logger.debug(f"Found {len(all_users)} users: {len(primary_users)} from primary, {len(legacy_users)} from legacy")
        
        return all_users
    
    async def get_all_users(self, skip: int = 0, limit: int = 100) -> List[Dict]:
        """Get all users (paginated) from both collections without duplicates"""
        # Get from primary collection
        primary_users = await self.db[self.primary_collection].find(
            {}, 
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(length=limit)
        
        # Get user_ids from primary
        found_ids = {u["user_id"] for u in primary_users if "user_id" in u}
        
        # Get from legacy (excluding those in primary)
        remaining_limit = limit - len(primary_users)
        if remaining_limit > 0:
            legacy_users = await self.db[self.legacy_collection].find(
                {"user_id": {"$nin": list(found_ids)}},
                {"_id": 0}
            ).skip(max(0, skip - len(found_ids))).limit(remaining_limit).to_list(length=remaining_limit)
        else:
            legacy_users = []
        
        return primary_users + legacy_users
    
    async def _migrate_user_to_primary(self, user_data: Dict):
        """Auto-migrate user from legacy collection to primary collection
        
        This happens transparently when a user is accessed from legacy collection.
        """
        user_id = user_data.get("user_id")
        if not user_id:
            logger.warning("Cannot migrate user without user_id")
            return
        
        # Check if already exists in primary
        exists = await self.db[self.primary_collection].find_one(
            {"user_id": user_id}, 
            {"_id": 0}
        )
        
        if exists:
            logger.debug(f"User {user_id} already exists in primary collection")
            return
        
        # Migrate to primary collection
        try:
            # Remove MongoDB _id if present
            user_data.pop("_id", None)
            user_data["migrated_at"] = datetime.now(timezone.utc).isoformat()
            user_data["migrated_from"] = "users_collection"
            
            await self.db[self.primary_collection].insert_one(user_data)
            logger.info(f"✅ Auto-migrated user {user_id} to primary collection")
        except Exception as e:
            logger.error(f"Failed to migrate user {user_id}: {str(e)}")
    
    async def sync_collections(self) -> Dict:
        """Sync all users from legacy to primary collection
        
        This is a maintenance operation to ensure data consistency.
        """
        logger.info("Starting full collection sync...")
        
        # Get all users from legacy collection
        legacy_users = await self.db[self.legacy_collection].find(
            {}, 
            {"_id": 0}
        ).to_list(length=None)
        
        migrated = 0
        skipped = 0
        errors = 0
        
        for user in legacy_users:
            user_id = user.get("user_id")
            if not user_id:
                errors += 1
                continue
            
            # Check if exists in primary
            exists = await self.db[self.primary_collection].find_one(
                {"user_id": user_id}
            )
            
            if exists:
                skipped += 1
                continue
            
            # Migrate
            try:
                user["migrated_at"] = datetime.now(timezone.utc).isoformat()
                user["migrated_from"] = "sync_operation"
                await self.db[self.primary_collection].insert_one(user)
                migrated += 1
            except Exception as e:
                logger.error(f"Failed to sync user {user_id}: {str(e)}")
                errors += 1
        
        result = {
            "total_legacy_users": len(legacy_users),
            "migrated": migrated,
            "skipped": skipped,
            "errors": errors
        }
        
        logger.info(f"Sync complete: {result}")
        return result

# Singleton instance (will be initialized with db connection)
_user_service_instance = None

def get_user_service(db: AsyncIOMotorDatabase) -> UserService:
    """Get singleton user service instance"""
    global _user_service_instance
    if _user_service_instance is None:
        _user_service_instance = UserService(db)
    return _user_service_instance
