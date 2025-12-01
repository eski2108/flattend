"""
Redis Caching Service for Maximum Performance
"""

import redis
import json
import os
from typing import Any, Optional
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Connect to Redis"""
        try:
            redis_host = os.environ.get('REDIS_HOST', 'localhost')
            redis_port = int(os.environ.get('REDIS_PORT', 6379))
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Redis cache connected")
        except Exception as e:
            logger.warning(f"⚠️  Redis not available: {e}. Running without cache.")
            self.redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 30):
        """Set value in cache with TTL in seconds"""
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(value)
            )
            return True
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
            return False
    
    def delete(self, key: str):
        """Delete key from cache"""
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
            return False
    
    def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern"""
        if not self.redis_client:
            return False
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Cache clear error for pattern {pattern}: {e}")
            return False

# Global cache instance
cache = CacheService()

# Cache key builders
def price_cache_key(coin: str) -> str:
    return f"price:{coin.upper()}"

def balance_cache_key(user_id: str, currency: str) -> str:
    return f"balance:{user_id}:{currency.upper()}"

def p2p_listings_cache_key() -> str:
    return "p2p:listings"

def user_profile_cache_key(user_id: str) -> str:
    return f"user:profile:{user_id}"

# Cache TTLs (in seconds)
PRICE_CACHE_TTL = 30  # 30 seconds
BALANCE_CACHE_TTL = 10  # 10 seconds  
P2P_LISTINGS_TTL = 60  # 1 minute
USER_PROFILE_TTL = 300  # 5 minutes
