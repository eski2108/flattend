#!/usr/bin/env python3
"""
Add missing database indexes for performance
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

async def add_indexes():
    """Add missing indexes"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        logger.info("🚀 Adding missing database indexes...\n")
        
        # Transactions collection - queried by user_id and timestamp
        logger.info("Adding indexes for 'transactions' collection...")
        try:
            await db.transactions.create_index([("user_id", 1)])
            logger.info("  ✓ user_id index created")
        except Exception as e:
            logger.info(f"  ✓ user_id index already exists")
        
        try:
            await db.transactions.create_index([("timestamp", -1)])
            logger.info("  ✓ timestamp index created")
        except Exception as e:
            logger.info(f"  ✓ timestamp index already exists")
        
        try:
            await db.transactions.create_index([("status", 1)])
            logger.info("  ✓ status index created")
        except Exception as e:
            logger.info(f"  ✓ status index already exists")
        
        # Internal balances - admin wallet queries
        logger.info("\nAdding indexes for 'internal_balances' collection...")
        try:
            await db.internal_balances.create_index([("user_id", 1)])
            logger.info("  ✓ user_id index created")
        except Exception as e:
            logger.info(f"  ✓ user_id index already exists")
        
        try:
            await db.internal_balances.create_index([("currency", 1)])
            logger.info("  ✓ currency index created")
        except Exception as e:
            logger.info(f"  ✓ currency index already exists")
        
        # P2P trades collection
        logger.info("\nAdding indexes for 'p2p_trades' collection...")
        try:
            await db.p2p_trades.create_index([("buyer_id", 1)])
            logger.info("  ✓ buyer_id index created")
        except Exception as e:
            logger.info(f"  ✓ buyer_id index already exists")
        
        try:
            await db.p2p_trades.create_index([("seller_id", 1)])
            logger.info("  ✓ seller_id index created")
        except Exception as e:
            logger.info(f"  ✓ seller_id index already exists")
        
        try:
            await db.p2p_trades.create_index([("status", 1)])
            logger.info("  ✓ status index created")
        except Exception as e:
            logger.info(f"  ✓ status index already exists")
        
        try:
            await db.p2p_trades.create_index([("created_at", -1)])
            logger.info("  ✓ created_at index created")
        except Exception as e:
            logger.info(f"  ✓ created_at index already exists")
        
        # Trading orders collection
        logger.info("\nAdding indexes for 'trading_orders' collection...")
        try:
            await db.trading_orders.create_index([("user_id", 1)])
            logger.info("  ✓ user_id index created")
        except Exception as e:
            logger.info(f"  ✓ user_id index already exists")
        
        try:
            await db.trading_orders.create_index([("status", 1)])
            logger.info("  ✓ status index created")
        except Exception as e:
            logger.info(f"  ✓ status index already exists")
        
        try:
            await db.trading_orders.create_index([("trading_pair", 1)])
            logger.info("  ✓ trading_pair index created")
        except Exception as e:
            logger.info(f"  ✓ trading_pair index already exists")
        
        try:
            await db.trading_orders.create_index([("created_at", -1)])
            logger.info("  ✓ created_at index created")
        except Exception as e:
            logger.info(f"  ✓ created_at index already exists")
        
        # User accounts - login queries
        logger.info("\nAdding indexes for 'user_accounts' collection...")
        try:
            await db.user_accounts.create_index([("email", 1)], unique=True)
            logger.info("  ✓ email unique index created")
        except Exception as e:
            logger.info(f"  ✓ email index already exists")
        
        try:
            await db.user_accounts.create_index([("user_id", 1)], unique=True)
            logger.info("  ✓ user_id unique index created")
        except Exception as e:
            logger.info(f"  ✓ user_id index already exists")
        
        # Swap transactions
        logger.info("\nAdding indexes for 'swap_transactions' collection...")
        try:
            await db.swap_transactions.create_index([("user_id", 1)])
            logger.info("  ✓ user_id index created")
        except Exception as e:
            logger.info(f"  ✓ user_id index already exists")
        
        try:
            await db.swap_transactions.create_index([("timestamp", -1)])
            logger.info("  ✓ timestamp index created")
        except Exception as e:
            logger.info(f"  ✓ timestamp index already exists")
        
        try:
            await db.swap_transactions.create_index([("status", 1)])
            logger.info("  ✓ status index created")
        except Exception as e:
            logger.info(f"  ✓ status index already exists")
        
        logger.info("\n✅ Database index optimization complete!")
        
        client.close()
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(add_indexes())
