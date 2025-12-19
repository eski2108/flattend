"""
🔐 SESSION MANAGEMENT SERVICE (P1)

Provides session revocation capabilities:
- Revoke all sessions for a user
- Auto-revoke on user freeze
- Force re-authentication
- Full audit trail

Usage:
    session_service = SessionService(db)
    
    # Revoke all sessions for a user
    await session_service.revoke_all_sessions(user_id, admin_id, reason)
    
    # Check if session is valid
    is_valid = await session_service.is_session_valid(user_id, session_token)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid

logger = logging.getLogger(__name__)


class SessionService:
    """
    Session management and revocation service.
    """
    
    def __init__(self, db):
        self.db = db
        self._initialized = False
    
    async def initialize(self):
        """Initialize indexes"""
        if self._initialized:
            return
        
        try:
            # Index for session lookups
            await self.db.user_sessions.create_index(
                [("user_id", 1), ("session_token", 1)],
                name="session_lookup"
            )
            
            # Index for revocation lookups
            await self.db.session_revocations.create_index(
                [("user_id", 1), ("revoked_at", -1)],
                name="revocation_lookup"
            )
            
            # TTL index for session cleanup (7 days)
            await self.db.user_sessions.create_index(
                "created_at",
                expireAfterSeconds=604800,  # 7 days
                name="session_ttl"
            )
            
            self._initialized = True
            logger.info("🔐 Session service initialized")
            
        except Exception as e:
            if "already exists" not in str(e).lower():
                logger.error(f"Error initializing session service: {e}")
            self._initialized = True
    
    async def create_session(
        self,
        user_id: str,
        session_token: str,
        ip_address: str = None,
        user_agent: str = None,
        device_info: dict = None
    ) -> dict:
        """
        Create a new session for a user.
        """
        await self.initialize()
        
        session = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_info": device_info,
            "created_at": datetime.now(timezone.utc),
            "last_activity": datetime.now(timezone.utc),
            "is_active": True
        }
        
        await self.db.user_sessions.insert_one(session)
        logger.info(f"🔐 Session created for user {user_id[:8]}...")
        
        return {"session_id": session["session_id"], "created": True}
    
    async def is_session_valid(self, user_id: str, session_token: str = None) -> bool:
        """
        Check if a user's session is valid (not revoked).
        
        Returns False if:
        - User has a revocation entry newer than their last login
        - User is frozen
        - Session token is explicitly revoked
        """
        await self.initialize()
        
        # Check if user is frozen
        user = await self.db.users.find_one({"user_id": user_id})
        if not user:
            user = await self.db.user_accounts.find_one({"user_id": user_id})
        
        if user and user.get("is_frozen"):
            return False
        
        # Check for revocation
        revocation = await self.db.session_revocations.find_one(
            {"user_id": user_id},
            sort=[("revoked_at", -1)]
        )
        
        if revocation:
            # All sessions before revocation time are invalid
            revoked_at = revocation.get("revoked_at")
            if isinstance(revoked_at, str):
                revoked_at = datetime.fromisoformat(revoked_at.replace('Z', '+00:00'))
            
            # If user logged in after revocation, they're valid
            last_login = user.get("last_login") if user else None
            if last_login:
                if isinstance(last_login, str):
                    last_login = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
                if last_login > revoked_at:
                    return True
            
            # Session created before revocation is invalid
            if session_token:
                session = await self.db.user_sessions.find_one({
                    "user_id": user_id,
                    "session_token": session_token
                })
                if session:
                    created_at = session.get("created_at")
                    if isinstance(created_at, datetime) and created_at < revoked_at:
                        return False
            else:
                # No specific token, check if any revocation exists that hasn't been superseded by login
                return False
        
        return True
    
    async def revoke_all_sessions(
        self,
        user_id: str,
        admin_id: str,
        reason: str,
        triggered_by: str = "manual"  # manual, freeze, security
    ) -> dict:
        """
        Revoke all active sessions for a user.
        
        Args:
            user_id: Target user
            admin_id: Admin performing revocation
            reason: Mandatory reason
            triggered_by: What triggered the revocation
        """
        await self.initialize()
        
        if not reason or len(reason.strip()) < 10:
            raise ValueError("Reason is required (minimum 10 characters)")
        
        timestamp = datetime.now(timezone.utc)
        correlation_id = str(uuid.uuid4())
        
        # Get user info
        user = await self.db.users.find_one({"user_id": user_id})
        if not user:
            user = await self.db.user_accounts.find_one({"user_id": user_id})
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Count active sessions before revocation
        active_sessions = await self.db.user_sessions.count_documents({
            "user_id": user_id,
            "is_active": True
        })
        
        # Create revocation record
        revocation = {
            "revocation_id": str(uuid.uuid4()),
            "correlation_id": correlation_id,
            "user_id": user_id,
            "user_email": user.get("email"),
            "admin_id": admin_id,
            "reason": reason.strip(),
            "triggered_by": triggered_by,
            "sessions_revoked": active_sessions,
            "revoked_at": timestamp,
            "immutable": True
        }
        await self.db.session_revocations.insert_one(revocation)
        
        # Mark all sessions as inactive
        result = await self.db.user_sessions.update_many(
            {"user_id": user_id, "is_active": True},
            {"$set": {
                "is_active": False,
                "revoked_at": timestamp,
                "revoked_by": admin_id,
                "revoke_reason": reason.strip()
            }}
        )
        
        # Update user's session_revoked_at field
        await self.db.users.update_one(
            {"user_id": user_id},
            {"$set": {"session_revoked_at": timestamp.isoformat()}}
        )
        await self.db.user_accounts.update_one(
            {"user_id": user_id},
            {"$set": {"session_revoked_at": timestamp.isoformat()}}
        )
        
        # Audit log
        audit_entry = {
            "audit_id": str(uuid.uuid4()),
            "correlation_id": correlation_id,
            "action": "SESSION_REVOCATION",
            "admin_id": admin_id,
            "target_user_id": user_id,
            "target_email": user.get("email"),
            "sessions_revoked": active_sessions,
            "triggered_by": triggered_by,
            "reason": reason.strip(),
            "timestamp": timestamp.isoformat(),
            "immutable": True
        }
        await self.db.admin_audit_logs.insert_one(audit_entry)
        
        logger.warning(
            f"🔐 SESSIONS REVOKED: {active_sessions} sessions for user {user_id} "
            f"by {admin_id}. Triggered by: {triggered_by}. Reason: {reason}"
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "sessions_revoked": active_sessions,
            "revoked_at": timestamp.isoformat(),
            "correlation_id": correlation_id,
            "triggered_by": triggered_by
        }
    
    async def get_user_sessions(self, user_id: str) -> List[dict]:
        """Get all sessions for a user"""
        sessions = await self.db.user_sessions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).to_list(100)
        
        for s in sessions:
            if "_id" in s:
                del s["_id"]
            # Convert datetime to string
            for key in ["created_at", "last_activity", "revoked_at"]:
                if key in s and isinstance(s[key], datetime):
                    s[key] = s[key].isoformat()
        
        return sessions
    
    async def get_revocation_history(self, user_id: str, limit: int = 20) -> List[dict]:
        """Get revocation history for a user"""
        history = await self.db.session_revocations.find(
            {"user_id": user_id}
        ).sort("revoked_at", -1).limit(limit).to_list(limit)
        
        for h in history:
            if "_id" in h:
                del h["_id"]
            if "revoked_at" in h and isinstance(h["revoked_at"], datetime):
                h["revoked_at"] = h["revoked_at"].isoformat()
        
        return history


# Singleton instance
_session_service = None

def get_session_service(db) -> SessionService:
    """Get or create session service singleton"""
    global _session_service
    if _session_service is None:
        _session_service = SessionService(db)
    return _session_service
