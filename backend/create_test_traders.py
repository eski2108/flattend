"""
Create test trader profiles and adverts for Express Mode testing
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def create_test_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client['cryptobank']
    
    print("🚀 Creating test traders and adverts...")
    
    # Test Trader 1: Alice (High completion rate, online, good price)
    trader1 = {
        "user_id": "test_trader_alice",
        "is_trader": True,
        "is_online": True,
        "completion_rate": 95.5,
        "total_trades": 150,
        "successful_trades": 143,
        "rating": 4.8,
        "total_ratings": 120,
        "average_response_time_minutes": 3.5,
        "max_daily_trades": 20,
        "available_payment_methods": ["bank_transfer", "wise", "revolut"],
        "verified_phone": True,
        "verified_email": True,
        "verified_id": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat()
    }
    
    # Test Trader 2: Bob (Medium completion rate, online, lower price)
    trader2 = {
        "user_id": "test_trader_bob",
        "is_trader": True,
        "is_online": True,
        "completion_rate": 78.0,
        "total_trades": 50,
        "successful_trades": 39,
        "rating": 4.2,
        "total_ratings": 45,
        "average_response_time_minutes": 8.0,
        "max_daily_trades": 10,
        "available_payment_methods": ["bank_transfer", "paypal"],
        "verified_phone": True,
        "verified_email": True,
        "verified_id": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat()
    }
    
    # Test Trader 3: Charlie (High completion rate, offline)
    trader3 = {
        "user_id": "test_trader_charlie",
        "is_trader": True,
        "is_online": False,
        "completion_rate": 92.0,
        "total_trades": 200,
        "successful_trades": 184,
        "rating": 4.9,
        "total_ratings": 180,
        "average_response_time_minutes": 2.0,
        "max_daily_trades": 25,
        "available_payment_methods": ["bank_transfer", "wise"],
        "verified_phone": True,
        "verified_email": True,
        "verified_id": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat()
    }
    
    # Test Trader 4: Diana (Lower completion rate, online, best price)
    trader4 = {
        "user_id": "test_trader_diana",
        "is_trader": True,
        "is_online": True,
        "completion_rate": 65.0,
        "total_trades": 20,
        "successful_trades": 13,
        "rating": 3.8,
        "total_ratings": 15,
        "average_response_time_minutes": 15.0,
        "max_daily_trades": 5,
        "available_payment_methods": ["bank_transfer"],
        "verified_phone": True,
        "verified_email": False,
        "verified_id": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert traders
    await db.trader_profiles.delete_many({"user_id": {"$in": ["test_trader_alice", "test_trader_bob", "test_trader_charlie", "test_trader_diana"]}})
    await db.trader_profiles.insert_many([trader1, trader2, trader3, trader4])
    print("✅ Created 4 test traders")
    
    # Create adverts for BTC/USD
    adverts = [
        # Alice's sell advert - Best overall (high rating, online, decent price)
        {
            "advert_id": str(uuid.uuid4()),
            "trader_id": "test_trader_alice",
            "advert_type": "sell",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "price_per_unit": 95000.00,
            "min_order_amount": 100.0,
            "max_order_amount": 10000.0,
            "available_amount_crypto": 0.5,
            "payment_methods": ["bank_transfer", "wise", "revolut"],
            "payment_time_limit_minutes": 30,
            "terms_and_conditions": "Fast trader with high completion rate. Online 24/7.",
            "is_active": True,
            "is_online": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # Bob's sell advert - Lower price but medium rating
        {
            "advert_id": str(uuid.uuid4()),
            "trader_id": "test_trader_bob",
            "advert_type": "sell",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "price_per_unit": 94500.00,
            "min_order_amount": 50.0,
            "max_order_amount": 5000.0,
            "available_amount_crypto": 0.3,
            "payment_methods": ["bank_transfer", "paypal"],
            "payment_time_limit_minutes": 30,
            "terms_and_conditions": "Good prices, reliable trader.",
            "is_active": True,
            "is_online": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # Charlie's sell advert - High rating but offline
        {
            "advert_id": str(uuid.uuid4()),
            "trader_id": "test_trader_charlie",
            "advert_type": "sell",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "price_per_unit": 94800.00,
            "min_order_amount": 200.0,
            "max_order_amount": 20000.0,
            "available_amount_crypto": 1.0,
            "payment_methods": ["bank_transfer", "wise"],
            "payment_time_limit_minutes": 60,
            "terms_and_conditions": "Professional trader, large orders welcome.",
            "is_active": True,
            "is_online": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # Diana's sell advert - Best price but low rating
        {
            "advert_id": str(uuid.uuid4()),
            "trader_id": "test_trader_diana",
            "advert_type": "sell",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "price_per_unit": 94000.00,
            "min_order_amount": 100.0,
            "max_order_amount": 2000.0,
            "available_amount_crypto": 0.2,
            "payment_methods": ["bank_transfer"],
            "payment_time_limit_minutes": 30,
            "terms_and_conditions": "New trader, best prices!",
            "is_active": True,
            "is_online": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # ETH adverts
        {
            "advert_id": str(uuid.uuid4()),
            "trader_id": "test_trader_alice",
            "advert_type": "sell",
            "cryptocurrency": "ETH",
            "fiat_currency": "USD",
            "price_per_unit": 3500.00,
            "min_order_amount": 50.0,
            "max_order_amount": 5000.0,
            "available_amount_crypto": 5.0,
            "payment_methods": ["bank_transfer", "wise"],
            "payment_time_limit_minutes": 30,
            "terms_and_conditions": "ETH trading available.",
            "is_active": True,
            "is_online": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        # USDT adverts
        {
            "advert_id": str(uuid.uuid4()),
            "trader_id": "test_trader_bob",
            "advert_type": "sell",
            "cryptocurrency": "USDT",
            "fiat_currency": "USD",
            "price_per_unit": 1.02,
            "min_order_amount": 100.0,
            "max_order_amount": 10000.0,
            "available_amount_crypto": 50000.0,
            "payment_methods": ["bank_transfer", "paypal"],
            "payment_time_limit_minutes": 15,
            "terms_and_conditions": "USDT quick trades.",
            "is_active": True,
            "is_online": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.trader_adverts.delete_many({"trader_id": {"$in": ["test_trader_alice", "test_trader_bob", "test_trader_charlie", "test_trader_diana"]}})
    await db.trader_adverts.insert_many(adverts)
    print("✅ Created 6 test adverts (4 BTC, 1 ETH, 1 USDT)")
    
    print("\n📊 Test Data Summary:")
    print("=" * 60)
    print("\n🧑‍💼 TRADERS:")
    print(f"  • Alice: ⭐ 4.8/5 | ✅ 95.5% | 🟢 Online | 💰 $95,000/BTC")
    print(f"  • Bob: ⭐ 4.2/5 | ✅ 78% | 🟢 Online | 💰 $94,500/BTC")
    print(f"  • Charlie: ⭐ 4.9/5 | ✅ 92% | 🔴 Offline | 💰 $94,800/BTC")
    print(f"  • Diana: ⭐ 3.8/5 | ✅ 65% | 🟢 Online | 💰 $94,000/BTC (Best Price)")
    
    print("\n🎯 EXPRESS MODE TESTING:")
    print("  1. Go to: http://localhost:3000/marketplace/express")
    print("  2. Select 'Buy BTC'")
    print("  3. Select 'USD'")
    print("  4. Enter amount: $1000")
    print("  5. Click 'Find Best Trader'")
    print("\n  Expected match: Alice (best overall score)")
    print("  - High rating + completion rate")
    print("  - Online status")
    print("  - Good price")
    
    print("\n📋 MANUAL MODE TESTING:")
    print("  1. Switch to 'Manual Mode'")
    print("  2. You should see all 4 BTC traders listed")
    print("  3. Try filters: online only, sort by price")
    
    print("\n" + "=" * 60)
    print("✨ Test data ready! Start testing Express Mode!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())
