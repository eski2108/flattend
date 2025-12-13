"""User Collection Migration Script

This script migrates and syncs users between 'users' and 'user_accounts' collections.
It ensures data consistency and creates a unified user base.

Usage:
    python migrate_users.py [--dry-run]
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx')

async def analyze_collections(db):
    """Analyze both collections and report differences"""
    logger.info("=" * 60)
    logger.info("ANALYZING USER COLLECTIONS")
    logger.info("=" * 60)
    
    # Count users in each collection
    user_accounts_count = await db.user_accounts.count_documents({})
    users_count = await db.users.count_documents({})
    
    logger.info(f"\n📊 COLLECTION STATS:")
    logger.info(f"  user_accounts: {user_accounts_count} users")
    logger.info(f"  users (legacy): {users_count} users")
    
    # Get user_ids from both collections
    user_accounts_ids = set()
    async for user in db.user_accounts.find({}, {"user_id": 1}):
        if "user_id" in user:
            user_accounts_ids.add(user["user_id"])
    
    users_ids = set()
    async for user in db.users.find({}, {"user_id": 1}):
        if "user_id" in user:
            users_ids.add(user["user_id"])
    
    # Find differences
    only_in_accounts = user_accounts_ids - users_ids
    only_in_users = users_ids - user_accounts_ids
    in_both = user_accounts_ids & users_ids
    
    logger.info(f"\n🔍 USER DISTRIBUTION:")
    logger.info(f"  In BOTH collections: {len(in_both)} users")
    logger.info(f"  Only in user_accounts: {len(only_in_accounts)} users")
    logger.info(f"  Only in users (legacy): {len(only_in_users)} users")
    
    # Check for users without user_id
    no_id_accounts = await db.user_accounts.count_documents({"user_id": {"$exists": False}})
    no_id_users = await db.users.count_documents({"user_id": {"$exists": False}})
    
    if no_id_accounts > 0 or no_id_users > 0:
        logger.warning(f"\n⚠️  USERS WITHOUT user_id:")
        logger.warning(f"  user_accounts: {no_id_accounts}")
        logger.warning(f"  users: {no_id_users}")
    
    return {
        "user_accounts_count": user_accounts_count,
        "users_count": users_count,
        "in_both": len(in_both),
        "only_in_accounts": len(only_in_accounts),
        "only_in_users": len(only_in_users),
        "only_in_users_list": list(only_in_users)[:10]  # First 10 for reference
    }

async def migrate_users_to_primary(db, dry_run=False):
    """Migrate users from 'users' collection to 'user_accounts' (primary)"""
    logger.info("\n" + "=" * 60)
    logger.info("MIGRATING USERS TO PRIMARY COLLECTION")
    logger.info("=" * 60)
    
    if dry_run:
        logger.info("\n🔍 DRY RUN MODE - No actual changes will be made\n")
    
    # Get all users from legacy collection
    legacy_users = await db.users.find({}, {"_id": 0}).to_list(length=None)
    
    migrated = 0
    skipped = 0
    errors = 0
    
    for user in legacy_users:
        user_id = user.get("user_id")
        email = user.get("email")
        wallet = user.get("wallet_address")
        
        if not user_id:
            logger.warning(f"⚠️  Skipping user without user_id: {email or wallet}")
            errors += 1
            continue
        
        # Check if already exists in primary
        existing = await db.user_accounts.find_one(
            {"user_id": user_id},
            {"_id": 1}
        )
        
        if existing:
            skipped += 1
            logger.debug(f"⏭️  User {user_id} already exists in user_accounts")
            continue
        
        # Migrate user
        if not dry_run:
            try:
                user["migrated_at"] = datetime.now(timezone.utc).isoformat()
                user["migrated_from"] = "users_collection"
                user["migration_script"] = "migrate_users.py"
                
                await db.user_accounts.insert_one(user)
                migrated += 1
                logger.info(f"✅ Migrated user {user_id} ({email or wallet})")
            except Exception as e:
                logger.error(f"❌ Failed to migrate user {user_id}: {str(e)}")
                errors += 1
        else:
            logger.info(f"[DRY RUN] Would migrate user {user_id} ({email or wallet})")
            migrated += 1
    
    logger.info("\n" + "=" * 60)
    logger.info("MIGRATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"\n📊 RESULTS:")
    logger.info(f"  Total legacy users: {len(legacy_users)}")
    logger.info(f"  ✅ Migrated: {migrated}")
    logger.info(f"  ⏭️  Skipped (already exist): {skipped}")
    logger.info(f"  ❌ Errors: {errors}")
    
    return {
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors
    }

async def sync_user_fields(db, dry_run=False):
    """Sync user fields from user_accounts to users (for users in both collections)"""
    logger.info("\n" + "=" * 60)
    logger.info("SYNCING USER FIELDS BETWEEN COLLECTIONS")
    logger.info("=" * 60)
    
    if dry_run:
        logger.info("\n🔍 DRY RUN MODE - No actual changes will be made\n")
    
    # Important fields to sync from user_accounts (source of truth) to users
    sync_fields = [
        "email", "full_name", "phone_number", "wallet_address",
        "email_verified", "phone_verified", "kyc_verified",
        "is_golden_referrer", "is_admin", "telegram_chat_id",
        "referred_by", "referral_code_used", "referral_tier"
    ]
    
    # Get all users from user_accounts
    all_users = await db.user_accounts.find({}, {"_id": 0}).to_list(length=None)
    
    synced = 0
    skipped = 0
    errors = 0
    
    for user_account in all_users:
        user_id = user_account.get("user_id")
        if not user_id:
            continue
        
        # Check if user exists in legacy collection
        legacy_user = await db.users.find_one({"user_id": user_id})
        
        if not legacy_user:
            skipped += 1
            continue
        
        # Build update document with fields that exist in user_accounts
        update_doc = {}
        for field in sync_fields:
            if field in user_account:
                update_doc[field] = user_account[field]
        
        if not update_doc:
            skipped += 1
            continue
        
        # Add sync metadata
        update_doc["last_synced_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update legacy collection
        if not dry_run:
            try:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": update_doc}
                )
                synced += 1
                logger.info(f"✅ Synced user {user_id}")
            except Exception as e:
                logger.error(f"❌ Failed to sync user {user_id}: {str(e)}")
                errors += 1
        else:
            logger.info(f"[DRY RUN] Would sync user {user_id} with {len(update_doc)} fields")
            synced += 1
    
    logger.info("\n" + "=" * 60)
    logger.info("SYNC COMPLETE")
    logger.info("=" * 60)
    logger.info(f"\n📊 RESULTS:")
    logger.info(f"  Total users checked: {len(all_users)}")
    logger.info(f"  ✅ Synced: {synced}")
    logger.info(f"  ⏭️  Skipped: {skipped}")
    logger.info(f"  ❌ Errors: {errors}")
    
    return {
        "synced": synced,
        "skipped": skipped,
        "errors": errors
    }

async def main():
    """Main migration process"""
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        logger.info("\n" + "*" * 60)
        logger.info("  RUNNING IN DRY RUN MODE")
        logger.info("  No actual changes will be made to the database")
        logger.info("*" * 60 + "\n")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Step 1: Analyze collections
        analysis = await analyze_collections(db)
        
        # Step 2: Migrate users from legacy to primary
        if analysis["only_in_users"] > 0:
            logger.info(f"\n🔄 Found {analysis['only_in_users']} users that need migration")
            await migrate_users_to_primary(db, dry_run)
        else:
            logger.info("\n✅ All users already in primary collection")
        
        # Step 3: Sync fields between collections
        if analysis["in_both"] > 0:
            logger.info(f"\n🔄 Syncing {analysis['in_both']} users that exist in both collections")
            await sync_user_fields(db, dry_run)
        
        logger.info("\n" + "=" * 60)
        logger.info("MIGRATION PROCESS COMPLETE")
        logger.info("=" * 60)
        
        if dry_run:
            logger.info("\n💡 To apply these changes, run without --dry-run flag")
        else:
            logger.info("\n✅ All changes have been applied to the database")
        
    except Exception as e:
        logger.error(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
