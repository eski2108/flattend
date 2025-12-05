#!/usr/bin/env python3
"""Setup demo traders with stats to showcase badge system"""

import requests
from datetime import datetime, timezone
import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "crypto_lending"

async def setup_demo_traders():
    """Insert trader profiles directly into MongoDB with stats"""
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🏆 Setting up demo traders with badges...")
    print("=" * 60)
    
    # Get user IDs
    users = {
        "elite_trader@test.com": None,
        "pro_trader@test.com": None,
        "verified_trader@test.com": None
    }
    
    for email in users.keys():
        user = await db.user_accounts.find_one({"email": email})
        if user:
            users[email] = user["user_id"]
            print(f"✅ Found {email}: {user['user_id'][:8]}...")
    
    # Create trader profiles with stats
    profiles = [
        {
            "user_id": users["elite_trader@test.com"],
            "email": "elite_trader@test.com",
            "completion_rate": 98.0,
            "total_trades": 150,
            "completed_trades": 147,
            "cancelled_trades": 3,
            "total_volume_usd": 250000,
            "rating": 4.8,
            "review_count": 45,
            "avg_response_time": 180,
            "kyc_verified": True,
            "last_trade_date": datetime.now(timezone.utc).isoformat(),
            "is_online": True
        },
        {
            "user_id": users["pro_trader@test.com"],
            "email": "pro_trader@test.com",
            "completion_rate": 90.0,
            "total_trades": 75,
            "completed_trades": 68,
            "cancelled_trades": 7,
            "total_volume_usd": 75000,
            "rating": 4.3,
            "review_count": 28,
            "avg_response_time": 240,
            "kyc_verified": True,
            "last_trade_date": datetime.now(timezone.utc).isoformat(),
            "is_online": True
        },
        {
            "user_id": users["verified_trader@test.com"],
            "email": "verified_trader@test.com",
            "completion_rate": 75.0,
            "total_trades": 20,
            "completed_trades": 15,
            "cancelled_trades": 5,
            "total_volume_usd": 15000,
            "rating": 4.0,
            "review_count": 8,
            "avg_response_time": 600,
            "kyc_verified": True,
            "last_trade_date": "2025-11-01T10:00:00+00:00",  # Old date, won't get "Active Today"
            "is_online": False
        }
    ]
    
    for profile in profiles:
        if profile["user_id"]:
            await db.trader_profiles.update_one(
                {"user_id": profile["user_id"]},
                {"$set": profile},
                upsert=True
            )
            print(f"✅ Created profile for {profile['email']}")
    
    print("\n✅ Trader profiles created! Now calculating badges...")
    
    # Call API to calculate badges for each
    BASE_URL = "https://tradefix-preview.preview.emergentagent.com/api"
    
    for email, user_id in users.items():
        if user_id:
            response = requests.post(f"{BASE_URL}/trader/badges/calculate/{user_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    badges = data.get("badges", [])
                    print(f"\n{email}:")
                    print(f"   Earned {len(badges)} badge(s):")
                    for badge in badges:
                        print(f"      {badge['icon']} {badge['name']}")
    
    client.close()
    print("\n🎉 Demo traders with badges are ready!")

if __name__ == "__main__":
    asyncio.run(setup_demo_traders())
