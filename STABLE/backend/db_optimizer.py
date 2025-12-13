#!/usr/bin/env python3
"""
Database Optimization Script
Adds indexes to MongoDB collections for improved query performance
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

async def create_indexes():
    """Create performance-critical indexes"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        logger.info("🚀 Starting database optimization...")
        
        # Wallets collection - heavily queried by user_id and currency
        logger.info("Creating indexes for 'wallets' collection...")
        try:
            await db.wallets.create_index([("user_id", 1)])
        except:
            pass  # Index might already exist
        try:
            await db.wallets.create_index([("currency", 1)])
        except:
            pass
        logger.info("✅ Wallets indexes created/verified")
        
        # Transactions collection - queried by user_id and timestamp
        logger.info("Creating indexes for 'transactions' collection...")
        await db.transactions.create_index([("user_id", 1)])
        await db.transactions.create_index([("timestamp", -1)])  # Descending for recent first
        await db.transactions.create_index([("user_id", 1), ("timestamp", -1)])
        await db.transactions.create_index([("status", 1)])
        await db.transactions.create_index([("transaction_type", 1)])
        logger.info("✅ Transactions indexes created")
        
        # Internal balances - admin wallet queries
        logger.info("Creating indexes for 'internal_balances' collection...")
        await db.internal_balances.create_index([("user_id", 1)])
        await db.internal_balances.create_index([("currency", 1)])
        await db.internal_balances.create_index([("user_id", 1), ("currency", 1)])
        logger.info("✅ Internal balances indexes created")
        
        # P2P trades collection
        logger.info("Creating indexes for 'p2p_trades' collection...")
        await db.p2p_trades.create_index([("buyer_id", 1)])
        await db.p2p_trades.create_index([("seller_id", 1)])
        await db.p2p_trades.create_index([("status", 1)])
        await db.p2p_trades.create_index([("created_at", -1)])
        logger.info("✅ P2P trades indexes created")
        
        # Trading orders collection
        logger.info("Creating indexes for 'trading_orders' collection...")
        await db.trading_orders.create_index([("user_id", 1)])
        await db.trading_orders.create_index([("status", 1)])
        await db.trading_orders.create_index([("trading_pair", 1)])
        await db.trading_orders.create_index([("created_at", -1)])
        logger.info("✅ Trading orders indexes created")
        
        # User accounts - login queries
        logger.info("Creating indexes for 'user_accounts' collection...")
        await db.user_accounts.create_index([("email", 1)], unique=True)
        await db.user_accounts.create_index([("user_id", 1)], unique=True)
        logger.info("✅ User accounts indexes created")
        
        # Swap transactions
        logger.info("Creating indexes for 'swap_transactions' collection...")
        await db.swap_transactions.create_index([("user_id", 1)])
        await db.swap_transactions.create_index([("timestamp", -1)])
        await db.swap_transactions.create_index([("status", 1)])
        logger.info("✅ Swap transactions indexes created")
        
        # List all indexes for verification
        logger.info("\n📊 Listing all indexes created:")
        for collection_name in ['wallets', 'transactions', 'internal_balances', 'p2p_trades', 
                                'trading_orders', 'user_accounts', 'swap_transactions']:
            indexes = await db[collection_name].index_information()
            logger.info(f"\n{collection_name}: {len(indexes)} indexes")
            for idx_name, idx_info in indexes.items():
                logger.info(f"  - {idx_name}: {idx_info['key']}")
        
        logger.info("\n✅ Database optimization complete!")
        
        client.close()
        
    except Exception as e:
        logger.error(f"❌ Error during optimization: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_indexes())
