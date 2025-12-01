"""
Database Indexing Setup for Production Performance
Run this once to create all necessary indexes for optimal query performance
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DATABASE_NAME = 'cryptobank'

async def setup_indexes():
    """Create all indexes for production performance"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]
    
    print("🔧 Setting up production database indexes...")
    
    # Users collection indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("username")
    await db.users.create_index("referral_code")
    print("✅ Users indexes created")
    
    # Internal balances (wallet) indexes
    await db.internal_balances.create_index([("user_id", 1), ("currency", 1)], unique=True)
    await db.internal_balances.create_index("user_id")
    await db.internal_balances.create_index("currency")
    print("✅ Internal balances indexes created")
    
    # Savings balances indexes
    await db.savings_balances.create_index([("user_id", 1), ("currency", 1)], unique=True)
    await db.savings_balances.create_index("user_id")
    print("✅ Savings balances indexes created")
    
    # Transactions indexes
    await db.transactions.create_index([("user_id", 1), ("timestamp", -1)])
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("timestamp")
    await db.transactions.create_index("tx_type")
    await db.transactions.create_index([("user_id", 1), ("tx_type", 1)])
    print("✅ Transactions indexes created")
    
    # Referrals indexes
    await db.referrals.create_index("referrer_id")
    await db.referrals.create_index("referred_id")
    await db.referrals.create_index([("referrer_id", 1), ("timestamp", -1)])
    print("✅ Referrals indexes created")
    
    # P2P Listings indexes
    await db.p2p_listings.create_index("seller_id")
    await db.p2p_listings.create_index("status")
    await db.p2p_listings.create_index("currency")
    await db.p2p_listings.create_index([("status", 1), ("currency", 1)])
    await db.p2p_listings.create_index([("seller_id", 1), ("status", 1)])
    await db.p2p_listings.create_index("created_at")
    await db.p2p_listings.create_index("boosted")
    print("✅ P2P Listings indexes created")
    
    # Orders indexes
    await db.orders.create_index("buyer_id")
    await db.orders.create_index("seller_id")
    await db.orders.create_index("status")
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index([("buyer_id", 1), ("status", 1)])
    await db.orders.create_index([("seller_id", 1), ("status", 1)])
    await db.orders.create_index("created_at")
    print("✅ Orders indexes created")
    
    # Admin fees indexes
    await db.admin_fees.create_index("fee_type", unique=True)
    print("✅ Admin fees indexes created")
    
    # Live prices cache index
    await db.live_prices.create_index("last_updated")
    print("✅ Live prices indexes created")
    
    # Platform stats indexes
    await db.platform_stats.create_index("timestamp")
    print("✅ Platform stats indexes created")
    
    # Withdrawal requests indexes
    await db.withdrawal_requests.create_index("user_id")
    await db.withdrawal_requests.create_index("status")
    await db.withdrawal_requests.create_index([("user_id", 1), ("status", 1)])
    await db.withdrawal_requests.create_index("created_at")
    print("✅ Withdrawal requests indexes created")
    
    # Sessions indexes (if used)
    await db.sessions.create_index("user_id")
    await db.sessions.create_index("expires_at")
    print("✅ Sessions indexes created")
    
    print("\n🎉 All production indexes created successfully!")
    print("📊 Database is now optimized for high-traffic queries")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_indexes())
