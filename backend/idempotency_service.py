"""
🔒 IDEMPOTENCY SERVICE (P0-3)

Provides backend-authoritative duplicate request protection.

Features:
- Stores idempotency keys with TTL (24 hours)
- Atomic insert with unique index to handle race conditions
- Returns cached response for duplicate requests
- Logs duplicate attempts for audit

Usage:
    idempotency = IdempotencyService(db)
    
    # Check if request is duplicate
    cached = await idempotency.check_and_lock(user_id, action_type, idempotency_key)
    if cached:
        return cached['response']  # Return same response
    
    # Process request...
    result = do_business_logic()
    
    # Store successful response
    await idempotency.store_response(user_id, action_type, idempotency_key, result)
    return result
"""

import logging
from datetime import datetime, timezone, timedelta
import uuid
from typing import Optional, Any
import hashlib
import json

logger = logging.getLogger(__name__)

# TTL for idempotency keys (24 hours)
IDEMPOTENCY_TTL_HOURS = 24


class IdempotencyService:
    """
    Backend-authoritative idempotency protection.
    
    Uses MongoDB with unique index on (user_id, action_type, idempotency_key)
    to handle race conditions atomically.
    """
    
    def __init__(self, db):
        self.db = db
        self.collection = db.idempotency_keys
        self._index_created = False
    
    async def ensure_indexes(self):
        """Create unique index for atomic duplicate detection"""
        if self._index_created:
            return
        
        try:
            # Unique compound index for race-condition-safe duplicate detection
            await self.collection.create_index(
                [("user_id", 1), ("action_type", 1), ("idempotency_key", 1)],
                unique=True,
                name="idempotency_unique"
            )
            
            # TTL index for automatic cleanup
            await self.collection.create_index(
                "expires_at",
                expireAfterSeconds=0,
                name="idempotency_ttl"
            )
            
            self._index_created = True
            logger.info("✅ Idempotency indexes created")
        except Exception as e:
            # Index might already exist
            if "already exists" not in str(e).lower():
                logger.error(f"Error creating idempotency indexes: {e}")
            self._index_created = True
    
    async def check_and_lock(
        self,
        user_id: str,
        action_type: str,
        idempotency_key: str,
        request_hash: str = None
    ) -> Optional[dict]:
        """
        Check if request is duplicate and atomically lock if new.
        
        Returns:
            - None if this is a new request (lock acquired)
            - Cached response dict if duplicate
            
        Race condition handling:
            Uses atomic insert with unique index.
            If two requests arrive simultaneously, only one will succeed.
        """
        await self.ensure_indexes()
        
        if not idempotency_key:
            # No idempotency key provided - allow request
            return None
        
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=IDEMPOTENCY_TTL_HOURS)
        correlation_id = str(uuid.uuid4())
        
        # Try atomic insert
        try:
            record = {
                "user_id": user_id,
                "action_type": action_type,
                "idempotency_key": idempotency_key,
                "request_hash": request_hash,
                "correlation_id": correlation_id,
                "status": "processing",
                "response": None,
                "created_at": now.isoformat(),
                "expires_at": expires_at,
                "completed_at": None
            }
            
            await self.collection.insert_one(record)
            
            # New request - lock acquired
            logger.info(f"🔐 Idempotency lock acquired: {action_type} for user {user_id[:8]}... key={idempotency_key[:8]}...")
            return None
            
        except Exception as e:
            if "duplicate key" in str(e).lower() or "E11000" in str(e):
                # Duplicate - check if we have a cached response
                existing = await self.collection.find_one({
                    "user_id": user_id,
                    "action_type": action_type,
                    "idempotency_key": idempotency_key
                })
                
                if existing:
                    if existing.get("status") == "completed" and existing.get("response"):
                        # Return cached response
                        logger.warning(
                            f"🔁 DUPLICATE_REQUEST_BLOCKED: {action_type} for user {user_id[:8]}... "
                            f"key={idempotency_key[:8]}... correlation={existing.get('correlation_id')}"
                        )
                        
                        # Log to audit
                        await self._log_duplicate(user_id, action_type, idempotency_key, existing.get('correlation_id'))
                        
                        return {
                            "is_duplicate": True,
                            "response": existing["response"],
                            "original_correlation_id": existing.get("correlation_id"),
                            "original_timestamp": existing.get("created_at")
                        }
                    elif existing.get("status") == "processing":
                        # Request is still processing (race condition)
                        # Return 409 Conflict to signal retry
                        logger.warning(
                            f"⏳ CONCURRENT_REQUEST_BLOCKED: {action_type} still processing for user {user_id[:8]}..."
                        )
                        return {
                            "is_duplicate": True,
                            "is_processing": True,
                            "response": {
                                "success": False,
                                "message": "Request is already being processed. Please wait.",
                                "retry_after": 2
                            }
                        }
                
                # Shouldn't happen, but allow request to proceed
                return None
            else:
                # Other error - log and allow request
                logger.error(f"Idempotency check error: {e}")
                return None
    
    async def store_response(
        self,
        user_id: str,
        action_type: str,
        idempotency_key: str,
        response: Any
    ) -> bool:
        """
        Store successful response for future duplicate requests.
        """
        if not idempotency_key:
            return True
        
        try:
            # Serialize response (handle non-JSON types)
            if hasattr(response, 'dict'):
                response_data = response.dict()
            elif hasattr(response, 'model_dump'):
                response_data = response.model_dump()
            elif isinstance(response, dict):
                response_data = response
            else:
                response_data = {"raw": str(response)}
            
            result = await self.collection.update_one(
                {
                    "user_id": user_id,
                    "action_type": action_type,
                    "idempotency_key": idempotency_key
                },
                {
                    "$set": {
                        "status": "completed",
                        "response": response_data,
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error storing idempotency response: {e}")
            return False
    
    async def release_lock(
        self,
        user_id: str,
        action_type: str,
        idempotency_key: str
    ):
        """
        Release lock on failure (allow retry with same key).
        """
        if not idempotency_key:
            return
        
        try:
            await self.collection.delete_one({
                "user_id": user_id,
                "action_type": action_type,
                "idempotency_key": idempotency_key,
                "status": "processing"  # Only delete if still processing
            })
        except Exception as e:
            logger.error(f"Error releasing idempotency lock: {e}")
    
    async def _log_duplicate(self, user_id: str, action_type: str, idempotency_key: str, correlation_id: str):
        """Log duplicate request to audit trail"""
        try:
            await self.db.admin_audit_logs.insert_one({
                "audit_id": str(uuid.uuid4()),
                "action": "DUPLICATE_REQUEST_BLOCKED",
                "user_id": user_id,
                "action_type": action_type,
                "idempotency_key": idempotency_key[:16] + "...",  # Truncate for security
                "original_correlation_id": correlation_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "immutable": True
            })
        except Exception as e:
            logger.error(f"Error logging duplicate request: {e}")


# Singleton instance (initialized in server.py)
_idempotency_service = None

def get_idempotency_service(db) -> IdempotencyService:
    """Get or create idempotency service singleton"""
    global _idempotency_service
    if _idempotency_service is None:
        _idempotency_service = IdempotencyService(db)
    return _idempotency_service


def extract_idempotency_key(request) -> Optional[str]:
    """Extract idempotency key from request headers"""
    try:
        # FastAPI Request object
        if hasattr(request, 'headers'):
            return request.headers.get('Idempotency-Key') or request.headers.get('idempotency-key')
        # Dict-like
        if isinstance(request, dict):
            return request.get('idempotency_key')
    except:
        pass
    return None
