"""
Wallet Balance Migration Script
Consolidates balances from multiple collections into single wallets collection
Run this ONCE to migrate existing user data
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_balances():
    """
    Migrate all existing balances to new wallets collection
    Source collections: internal_balances, trader_balances, crypto_balances, savings_balances
    Target collection: wallets (centralized)
    """
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.coin_hub_x
    
    logger.info("🚀 Starting balance migration...")
    
    migration_stats = {
        "internal_balances": 0,
        "trader_balances": 0,
        "crypto_balances": 0,
        "savings_balances": 0,
        "total_migrated": 0,
        "errors": []
    }
    
    try:
        # 1. Migrate from internal_balances (main wallet)
        logger.info("📦 Migrating internal_balances...")
        internal = await db.internal_balances.find({}).to_list(10000)
        for balance in internal:
            try:
                user_id = balance.get('user_id')
                currency = balance.get('currency')
                amount = float(balance.get('balance', 0))
                
                if not user_id or not currency:
                    continue
                
                # Check if wallet already exists
                existing = await db.wallets.find_one({
                    "user_id": user_id,
                    "currency": currency
                })
                
                if existing:
                    # Update existing
                    await db.wallets.update_one(
                        {"user_id": user_id, "currency": currency},
                        {"$inc": {"available_balance": amount, "total_balance": amount}}
                    )
                else:
                    # Create new
                    await db.wallets.insert_one({
                        "user_id": user_id,
                        "currency": currency,
                        "available_balance": amount,
                        "locked_balance": 0.0,
                        "total_balance": amount,
                        "created_at": datetime.now(timezone.utc),
                        "last_updated": datetime.now(timezone.utc),
                        "migrated_from": "internal_balances"
                    })
                
                migration_stats["internal_balances"] += 1
                
            except Exception as e:
                logger.error(f"Error migrating internal balance: {str(e)}")
                migration_stats["errors"].append(f"internal_balances: {str(e)}")
        
        # 2. Migrate from trader_balances (P2P escrow)
        logger.info("📦 Migrating trader_balances...")
        trader = await db.trader_balances.find({}).to_list(10000)
        for balance in trader:
            try:
                user_id = balance.get('trader_id')
                currency = balance.get('currency')
                total = float(balance.get('balance', 0))
                locked = float(balance.get('locked_balance', 0))
                available = total - locked
                
                if not user_id or not currency:
                    continue
                
                existing = await db.wallets.find_one({
                    "user_id": user_id,
                    "currency": currency
                })
                
                if existing:
                    await db.wallets.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {
                                "available_balance": available,
                                "locked_balance": locked,
                                "total_balance": total
                            }
                        }
                    )
                else:
                    await db.wallets.insert_one({
                        "user_id": user_id,
                        "currency": currency,
                        "available_balance": available,
                        "locked_balance": locked,
                        "total_balance": total,
                        "created_at": datetime.now(timezone.utc),
                        "last_updated": datetime.now(timezone.utc),
                        "migrated_from": "trader_balances"
                    })
                
                migration_stats["trader_balances"] += 1
                
            except Exception as e:
                logger.error(f"Error migrating trader balance: {str(e)}")
                migration_stats["errors"].append(f"trader_balances: {str(e)}")
        
        # 3. Migrate from crypto_balances (legacy)
        logger.info("📦 Migrating crypto_balances...")
        crypto = await db.crypto_balances.find({}).to_list(10000)
        for balance in crypto:
            try:
                user_id = balance.get('user_id')
                currency = balance.get('currency')
                amount = float(balance.get('balance', 0))
                
                if not user_id or not currency:
                    continue
                
                existing = await db.wallets.find_one({
                    "user_id": user_id,
                    "currency": currency
                })
                
                if existing:
                    await db.wallets.update_one(
                        {"user_id": user_id, "currency": currency},
                        {"$inc": {"available_balance": amount, "total_balance": amount}}
                    )
                else:
                    await db.wallets.insert_one({
                        "user_id": user_id,
                        "currency": currency,
                        "available_balance": amount,
                        "locked_balance": 0.0,
                        "total_balance": amount,
                        "created_at": datetime.now(timezone.utc),
                        "last_updated": datetime.now(timezone.utc),
                        "migrated_from": "crypto_balances"
                    })
                
                migration_stats["crypto_balances"] += 1
                
            except Exception as e:
                logger.error(f"Error migrating crypto balance: {str(e)}")
                migration_stats["errors"].append(f"crypto_balances: {str(e)}")
        
        # 4. Migrate from savings_balances
        logger.info("📦 Migrating savings_balances...")
        savings = await db.savings_balances.find({}).to_list(10000)
        for balance in savings:
            try:
                user_id = balance.get('user_id')
                currency = balance.get('currency')
                amount = float(balance.get('balance', 0))
                
                if not user_id or not currency:
                    continue
                
                # Savings balances go to available (users can move them freely)
                existing = await db.wallets.find_one({
                    "user_id": user_id,
                    "currency": currency
                })
                
                if existing:
                    await db.wallets.update_one(
                        {"user_id": user_id, "currency": currency},
                        {"$inc": {"available_balance": amount, "total_balance": amount}}
                    )
                else:
                    await db.wallets.insert_one({
                        "user_id": user_id,
                        "currency": currency,
                        "available_balance": amount,
                        "locked_balance": 0.0,
                        "total_balance": amount,
                        "created_at": datetime.now(timezone.utc),
                        "last_updated": datetime.now(timezone.utc),
                        "migrated_from": "savings_balances"
                    })
                
                migration_stats["savings_balances"] += 1
                
            except Exception as e:
                logger.error(f"Error migrating savings balance: {str(e)}")
                migration_stats["errors"].append(f"savings_balances: {str(e)}")
        
        # Calculate total
        migration_stats["total_migrated"] = (
            migration_stats["internal_balances"] +
            migration_stats["trader_balances"] +
            migration_stats["crypto_balances"] +
            migration_stats["savings_balances"]
        )
        
        # Create indexes on new collection
        logger.info("📇 Creating indexes on wallets collection...")
        await db.wallets.create_index([("user_id", 1), ("currency", 1)], unique=True)
        await db.wallets.create_index("user_id")
        await db.wallets.create_index("currency")
        await db.wallets.create_index("total_balance")
        
        logger.info("✅ Migration complete!")
        logger.info(f"📊 Migration Statistics:")
        logger.info(f"  - internal_balances: {migration_stats['internal_balances']}")
        logger.info(f"  - trader_balances: {migration_stats['trader_balances']}")
        logger.info(f"  - crypto_balances: {migration_stats['crypto_balances']}")
        logger.info(f"  - savings_balances: {migration_stats['savings_balances']}")
        logger.info(f"  - Total migrated: {migration_stats['total_migrated']}")
        logger.info(f"  - Errors: {len(migration_stats['errors'])}")
        
        if migration_stats['errors']:
            logger.warning("⚠️ Errors encountered:")
            for error in migration_stats['errors'][:10]:  # Show first 10
                logger.warning(f"  - {error}")
        
        return migration_stats
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_balances())
