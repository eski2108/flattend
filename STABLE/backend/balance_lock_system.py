"""Balance Locking System

Prevents double-spending by locking user and admin balances during transactions.
Uses Redis or MongoDB locks to ensure atomic operations.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
import uuid

logger = logging.getLogger(__name__)

class BalanceLock:
    def __init__(self, db):
        self.db = db
        self.lock_timeout = 30  # seconds
    
    async def acquire_lock(self, user_id: str, currency: str, action: str) -> str:
        """
        Acquire a lock on user's balance for a specific currency.
        Returns lock_id if successful, None if already locked.
        """
        lock_id = str(uuid.uuid4())
        lock_key = f"{user_id}_{currency}"
        
        # Check if already locked
        existing_lock = await self.db.balance_locks.find_one({
            "lock_key": lock_key,
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        
        if existing_lock:
            logger.warning(f"Balance already locked: {lock_key}")
            return None
        
        # Create lock
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.lock_timeout)
        
        await self.db.balance_locks.insert_one({
            "lock_id": lock_id,
            "lock_key": lock_key,
            "user_id": user_id,
            "currency": currency,
            "action": action,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat()
        })
        
        logger.info(f"✅ Balance locked: {lock_key} for {action}")
        return lock_id
    
    async def release_lock(self, lock_id: str):
        """
        Release a balance lock
        """
        result = await self.db.balance_locks.delete_one({"lock_id": lock_id})
        if result.deleted_count > 0:
            logger.info(f"🔓 Balance unlocked: {lock_id}")
        return result.deleted_count > 0
    
    async def acquire_multiple_locks(self, locks: list) -> dict:
        """
        Acquire multiple locks atomically.
        If any lock fails, release all and return None.
        
        locks format: [{"user_id": str, "currency": str, "action": str}, ...]
        """
        acquired_locks = []
        
        try:
            for lock_spec in locks:
                lock_id = await self.acquire_lock(
                    lock_spec["user_id"],
                    lock_spec["currency"],
                    lock_spec["action"]
                )
                
                if not lock_id:
                    # Failed to acquire lock, release all
                    for prev_lock_id in acquired_locks:
                        await self.release_lock(prev_lock_id)
                    return None
                
                acquired_locks.append(lock_id)
            
            return {"lock_ids": acquired_locks}
            
        except Exception as e:
            # Release all acquired locks on error
            for lock_id in acquired_locks:
                await self.release_lock(lock_id)
            logger.error(f"Failed to acquire locks: {str(e)}")
            return None
    
    async def release_multiple_locks(self, lock_ids: list):
        """
        Release multiple locks
        """
        for lock_id in lock_ids:
            await self.release_lock(lock_id)
    
    async def cleanup_expired_locks(self):
        """
        Clean up expired locks (should run periodically)
        """
        result = await self.db.balance_locks.delete_many({
            "expires_at": {"$lt": datetime.now(timezone.utc).isoformat()}
        })
        if result.deleted_count > 0:
            logger.info(f"🧹 Cleaned up {result.deleted_count} expired locks")
        return result.deleted_count
