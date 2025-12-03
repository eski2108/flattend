#!/usr/bin/env python3
"""
Setup test data for referral dashboard testing
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid

async def setup_test_data():
    """Setup comprehensive test data for referral testing"""
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['coinhubx']
    
    # Test user ID
    test_user_id = "gads21083@gmail.com"
    
    print(f"🚀 Setting up test data for user: {test_user_id}")
    
    # 1. Ensure user exists
    user_exists = await db.user_accounts.find_one({"user_id": test_user_id})
    if not user_exists:
        user_doc = {
            "user_id": test_user_id,
            "email": test_user_id,
            "full_name": "Test User",
            "referral_tier": "standard",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_accounts.insert_one(user_doc)
        print(f"✅ Created user account for {test_user_id}")
    
    # 2. Create referral code if doesn't exist
    referral_code_exists = await db.referral_codes.find_one({"user_id": test_user_id})
    if not referral_code_exists:
        referral_code_doc = {
            "user_id": test_user_id,
            "referral_code": "GADS2024",
            "referral_link": "https://coinhubx.com/register?ref=GADS2024",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.referral_codes.insert_one(referral_code_doc)
        print(f"✅ Created referral code for {test_user_id}")
    
    # 3. Create referred users
    referred_users = []
    for i in range(3):
        referred_user_id = f"referred_user_{i}@test.com"
        referred_user_doc = {
            "user_id": referred_user_id,
            "email": referred_user_id,
            "full_name": f"Referred User {i+1}",
            "referred_by": test_user_id,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30-i*10)).isoformat()
        }
        
        # Check if user already exists
        existing = await db.user_accounts.find_one({"user_id": referred_user_id})
        if not existing:
            await db.user_accounts.insert_one(referred_user_doc)
            referred_users.append(referred_user_id)
            print(f"✅ Created referred user: {referred_user_id}")
    
    # 4. Create referral commissions
    commission_types = ["trading_fee", "swap_fee", "p2p_fee", "withdrawal_fee"]
    
    for i, referred_user_id in enumerate(referred_users):
        # Create multiple commissions for each referred user
        for j in range(2):
            commission_doc = {
                "commission_id": str(uuid.uuid4()),
                "referrer_user_id": test_user_id,
                "referred_user_id": referred_user_id,
                "transaction_type": commission_types[j % len(commission_types)],
                "commission_amount": round(5.0 + (i * 2.5) + (j * 1.2), 2),
                "currency": "GBP",
                "status": "completed",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=20-i*5-j*2)).isoformat()
            }
            await db.referral_commissions.insert_one(commission_doc)
            print(f"✅ Created commission: £{commission_doc['commission_amount']} from {referred_user_id}")
    
    # 5. Verify data
    total_commissions = await db.referral_commissions.count_documents({"referrer_user_id": test_user_id})
    total_referred = await db.user_accounts.count_documents({"referred_by": test_user_id})
    
    print(f"\n📊 Test data summary:")
    print(f"   - Total referred users: {total_referred}")
    print(f"   - Total commissions: {total_commissions}")
    
    # Calculate total earnings
    pipeline = [
        {"$match": {"referrer_user_id": test_user_id, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
    ]
    result = await db.referral_commissions.aggregate(pipeline).to_list(1)
    total_earnings = result[0]["total"] if result else 0
    print(f"   - Total earnings: £{total_earnings}")
    
    print(f"\n✅ Test data setup complete!")

if __name__ == "__main__":
    asyncio.run(setup_test_data())