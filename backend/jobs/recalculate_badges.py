#!/usr/bin/env python3
"""Recalculate user trading badges

Runs daily to update user badges based on their trading performance.
"""

import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
import logging

# Add parent directory to path to import badge_system
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from badge_system import get_badge_system

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx')

async def main():
    """
    Recalculate badges for all users
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        logger.info("🚀 Starting badge recalculation job...")
        
        badge_system = get_badge_system(db)
        result = await badge_system.recalculate_all_badges()
        
        if result["success"]:
            logger.info(f"✅ Job completed. Updated {result['updated_count']} users.")
        else:
            logger.error(f"❌ Job failed: {result.get('error')}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Job error: {str(e)}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n⏹️  Job interrupted")
        sys.exit(0)
