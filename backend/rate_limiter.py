"""Rate Limiting and Double-Trade Protection

Prevents users from submitting multiple rapid trade requests.
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, db):
        self.db = db
        self.cooldown_seconds = 2  # Minimum time between trades
    
    async def check_rate_limit(self, user_id: str, action: str) -> dict:
        """
        Check if user can perform action based on rate limits.
        Returns {"allowed": bool, "wait_seconds": int}
        """
        # Check last action timestamp
        last_action = await self.db.rate_limit_log.find_one(
            {"user_id": user_id, "action": action},
            sort=[("timestamp", -1)]
        )
        
        if last_action:
            last_timestamp = datetime.fromisoformat(last_action["timestamp"])
            now = datetime.now(timezone.utc)
            elapsed = (now - last_timestamp).total_seconds()
            
            if elapsed < self.cooldown_seconds:
                wait_seconds = int(self.cooldown_seconds - elapsed) + 1
                logger.warning(f"⏱️ Rate limit: {user_id} must wait {wait_seconds}s for {action}")
                return {"allowed": False, "wait_seconds": wait_seconds}
        
        # Record this action
        await self.db.rate_limit_log.insert_one({
            "user_id": user_id,
            "action": action,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"allowed": True, "wait_seconds": 0}
    
    async def cleanup_old_logs(self, hours: int = 24):
        """
        Clean up old rate limit logs
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.db.rate_limit_log.delete_many({
            "timestamp": {"$lt": cutoff.isoformat()}
        })
        if result.deleted_count > 0:
            logger.info(f"🧹 Cleaned up {result.deleted_count} old rate limit logs")
        return result.deleted_count
