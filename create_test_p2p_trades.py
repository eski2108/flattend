#!/usr/bin/env python3
"""
Create test P2P trades for leaderboard testing
Creates 30 completed P2P trades with 3 test users as mentioned in the review request.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid
import random

async def create_test_trades():
    """Create test P2P trades for leaderboard testing"""
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['coinhubx']
    
    # Test users (sellers)
    test_users = [
        {
            "user_id": "test-seller-1",
            "username": "CryptoTrader1",
            "full_name": "Alice Johnson",
            "country": "United Kingdom",
            "kyc_verified": True,
            "badges": ["early_adopter", "verified_seller"]
        },
        {
            "user_id": "test-seller-2", 
            "username": "BTCMaster",
            "full_name": "Bob Smith",
            "country": "United States",
            "kyc_verified": True,
            "badges": ["power_trader"]
        },
        {
            "user_id": "test-seller-3",
            "username": "EthereumPro",
            "full_name": "Carol Davis",
            "country": "Canada",
            "kyc_verified": False,
            "badges": []
        }
    ]
    
    # Create/update test users in user_accounts collection
    for user in test_users:
        await db.user_accounts.update_one(
            {"user_id": user["user_id"]},
            {"$set": user},
            upsert=True
        )
    
    print(f"✅ Created/updated {len(test_users)} test users")
    
    # Create 30 completed P2P trades distributed over the past 30 days
    trades = []
    now = datetime.now(timezone.utc)
    
    for i in range(30):
        # Random seller from test users
        seller = random.choice(test_users)
        
        # Random trade date within past 30 days
        days_ago = random.randint(0, 30)
        trade_date = now - timedelta(days=days_ago)
        
        # Random trade amounts
        crypto_amount = round(random.uniform(0.01, 2.0), 8)  # BTC amount
        btc_price_gbp = random.uniform(45000, 75000)  # BTC price in GBP
        fiat_amount = round(crypto_amount * btc_price_gbp, 2)
        
        # Random release time (in seconds)
        release_time = random.randint(300, 3600)  # 5 minutes to 1 hour
        
        trade = {
            "trade_id": f"test-trade-{i+1:03d}",
            "seller_id": seller["user_id"],
            "buyer_id": f"test-buyer-{random.randint(1, 10)}",
            "crypto_currency": "BTC",
            "fiat_currency": "GBP",
            "crypto_amount": crypto_amount,
            "fiat_amount": fiat_amount,
            "status": "completed",
            "created_at": trade_date.isoformat(),
            "completed_at": (trade_date + timedelta(seconds=release_time)).isoformat(),
            "release_time_seconds": release_time,
            "payment_method": random.choice(["faster_payments", "bank_transfer", "paypal"]),
            "trade_type": "sell"
        }
        
        trades.append(trade)
    
    # Insert all trades
    if trades:
        await db.p2p_trades.insert_many(trades)
        print(f"✅ Created {len(trades)} completed P2P trades")
    
    # Show summary by seller
    print("\n📊 Trade Summary by Seller:")
    for user in test_users:
        user_trades = [t for t in trades if t["seller_id"] == user["user_id"]]
        total_volume = sum(t["fiat_amount"] for t in user_trades)
        avg_release_time = sum(t["release_time_seconds"] for t in user_trades) / len(user_trades) if user_trades else 0
        
        print(f"  {user['username']}: {len(user_trades)} trades, £{total_volume:,.2f} volume, {avg_release_time:.0f}s avg release")
    
    client.close()
    print("\n🎯 Test data created successfully! Ready for leaderboard testing.")

if __name__ == "__main__":
    asyncio.run(create_test_trades())