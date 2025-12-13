#!/usr/bin/env python3
"""Auto-expire inactive P2P listings

Runs periodically to expire stale listings that haven't had activity
within the configured timeframe.
"""

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx')

async def auto_expire_listings():
    """
    Find and expire inactive P2P listings
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Get auto-expire settings
        settings = await db.platform_settings.find_one({"setting_id": "p2p_auto_expire"})
        
        if not settings:
            # Create default settings
            settings = {
                "setting_id": "p2p_auto_expire",
                "auto_expire_hours": 48,
                "notify_before_expiry_hours": 6,
                "auto_expire_enabled": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.platform_settings.insert_one(settings)
            logger.info("✅ Created default P2P auto-expire settings")
        
        if not settings.get("auto_expire_enabled", True):
            logger.info("⏸️  Auto-expire is disabled")
            return
        
        expire_hours = settings.get("auto_expire_hours", 48)
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=expire_hours)
        
        logger.info(f"🔍 Checking for listings inactive since {cutoff_time.isoformat()}")
        
        # Find active listings that are stale
        # First, ensure last_active_at exists on all listings
        await db.p2p_listings.update_many(
            {"last_active_at": {"$exists": False}},
            {"$set": {"last_active_at": "$created_at"}}
        )
        
        # Find stale listings
        stale_count = await db.p2p_listings.count_documents({
            "status": "active",
            "last_active_at": {"$lt": cutoff_time.isoformat()}
        })
        
        if stale_count == 0:
            logger.info("✅ No stale listings found")
            client.close()
            return
        
        logger.info(f"⚠️  Found {stale_count} stale listings")
        
        # Expire them
        result = await db.p2p_listings.update_many(
            {
                "status": "active",
                "last_active_at": {"$lt": cutoff_time.isoformat()}
            },
            {
                "$set": {
                    "status": "expired",
                    "expired_at": datetime.now(timezone.utc).isoformat(),
                    "expired_reason": "auto_expire",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Auto-expired {result.modified_count} listings")
        
        # TODO: Send notifications to sellers
        # This can be implemented later with email/Telegram integration
        
    except Exception as e:
        logger.error(f"❌ Error in auto-expire job: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    try:
        asyncio.run(auto_expire_listings())
    except KeyboardInterrupt:
        logger.info("\n⏹️  Job interrupted")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Job failed: {str(e)}")
        sys.exit(1)
