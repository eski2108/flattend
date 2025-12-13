#!/usr/bin/env python3
"""
Check existing database indexes
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx')

async def check_indexes():
    """Check existing indexes"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        logger.info("📊 Checking existing database indexes...\n")
        
        collections = ['wallets', 'transactions', 'internal_balances', 'p2p_trades', 
                      'trading_orders', 'user_accounts', 'swap_transactions']
        
        for collection_name in collections:
            indexes = await db[collection_name].index_information()
            logger.info(f"📂 {collection_name}: {len(indexes)} indexes")
            for idx_name, idx_info in indexes.items():
                logger.info(f"  ✓ {idx_name}: {idx_info['key']}")
            logger.info("")
        
        logger.info("✅ Index check complete!")
        
        client.close()
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(check_indexes())
