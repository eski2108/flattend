#!/usr/bin/env python3
"""Test the Phase 2 Trader Badge System"""

import requests
import json

BASE_URL = "https://crypto-trust-guard.preview.emergentagent.com/api"

print("🏆 PHASE 2: TRADER BADGE SYSTEM TESTING")
print("=" * 70)

# Test 1: Get badge definitions
print("\n1️⃣  Getting Badge Definitions...")
response = requests.get(f"{BASE_URL}/badges/definitions")

if response.status_code == 200:
    data = response.json()
    if data.get("success"):
        badges = data.get("badges", {})
        print(f"✅ Found {len(badges)} badge types:")
        for badge_id, badge_info in badges.items():
            print(f"   {badge_info['icon']} {badge_info['name']} - {badge_info['description']}")
    else:
        print(f"❌ Failed: {data}")
else:
    print(f"❌ Failed with status {response.status_code}")

# Test 2: Create test traders with different stats to earn badges
print("\n2️⃣  Setting up test traders with stats for badges...")

test_traders = [
    {
        "email": "elite_trader@test.com",
        "password": "Test123456",
        "full_name": "Elite Trader",
        "stats": {
            "completion_rate": 98.0,
            "total_trades": 150,
            "completed_trades": 147,
            "cancelled_trades": 3,
            "total_volume_usd": 250000,
            "rating": 4.8,
            "review_count": 45,
            "avg_response_time": 180,  # 3 minutes
            "kyc_verified": True
        }
    },
    {
        "email": "pro_trader@test.com",
        "password": "Test123456",
        "full_name": "Pro Trader",
        "stats": {
            "completion_rate": 90.0,
            "total_trades": 75,
            "completed_trades": 68,
            "cancelled_trades": 7,
            "total_volume_usd": 75000,
            "rating": 4.3,
            "review_count": 28,
            "avg_response_time": 240,  # 4 minutes
            "kyc_verified": True
        }
    },
    {
        "email": "verified_trader@test.com",
        "password": "Test123456",
        "full_name": "Verified Trader",
        "stats": {
            "completion_rate": 75.0,
            "total_trades": 20,
            "completed_trades": 15,
            "cancelled_trades": 5,
            "total_volume_usd": 15000,
            "rating": 4.0,
            "review_count": 8,
            "avg_response_time": 600,  # 10 minutes
            "kyc_verified": True
        }
    }
]

for trader_info in test_traders:
    # Register/Login
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": trader_info["email"], "password": trader_info["password"]})
    
    if response.status_code != 200:
        # Try to register
        response = requests.post(f"{BASE_URL}/auth/register", json=trader_info)
        response = requests.post(f"{BASE_URL}/auth/login", json={"email": trader_info["email"], "password": trader_info["password"]})
    
    if response.status_code == 200:
        user_data = response.json()
        user_id = user_data.get("user", {}).get("user_id")
        print(f"\n   ✅ {trader_info['full_name']} ({user_id[:8]}...)")
        
        # Insert trader stats directly into database (via update endpoint would be better in production)
        # For now, we'll insert via the MongoDB directly or use a test endpoint
        # Let's calculate badges for this user
        
        response = requests.post(f"{BASE_URL}/trader/badges/calculate/{user_id}")
        if response.status_code == 200:
            badge_data = response.json()
            if badge_data.get("success"):
                badges = badge_data.get("badges", [])
                print(f"      Earned {len(badges)} badges:")
                for badge in badges:
                    print(f"         {badge['icon']} {badge['name']}")
            else:
                print(f"      No badges earned yet (stats need to be set)")
        else:
            print(f"      Badge calculation returned {response.status_code}")

# Test 3: Get badges for a specific trader
print("\n3️⃣  Retrieving badges for a trader...")
response = requests.post(f"{BASE_URL}/auth/login", json={"email": "elite_trader@test.com", "password": "Test123456"})
if response.status_code == 200:
    user_data = response.json()
    user_id = user_data.get("user", {}).get("user_id")
    
    response = requests.get(f"{BASE_URL}/trader/badges/{user_id}")
    if response.status_code == 200:
        badge_data = response.json()
        if badge_data.get("success"):
            badges = badge_data.get("badges", [])
            print(f"✅ Elite Trader has {len(badges)} badge(s)")
            for badge in badges:
                print(f"   {badge['icon']} {badge['name']} - {badge['description']}")
        else:
            print(f"❌ No badges: {badge_data}")
    else:
        print(f"❌ Failed with status {response.status_code}")

# Test 4: Admin view all badges
print("\n4️⃣  Admin viewing all trader badges...")
response = requests.get(f"{BASE_URL}/admin/badges/all")

if response.status_code == 200:
    data = response.json()
    if data.get("success"):
        total = data.get("total_traders_with_badges", 0)
        distribution = data.get("badge_distribution", {})
        print(f"✅ {total} traders have badges")
        print(f"   Badge Distribution:")
        for badge_id, count in distribution.items():
            print(f"      {badge_id}: {count} trader(s)")
    else:
        print(f"❌ Failed: {data}")
else:
    print(f"❌ Failed with status {response.status_code}")

print("\n" + "=" * 70)
print("🎉 BADGE SYSTEM TESTING COMPLETE!")
