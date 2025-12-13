#!/usr/bin/env python3
"""
P2P System Verification Script
Quick check that all P2P endpoints and data are working
"""

import asyncio
import aiohttp
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

BACKEND_URL = "http://localhost:8001"
MONGO_URL = "mongodb+srv://coinhubx:mummy1231123@cluster0.ctczzad.mongodb.net/?appName=Cluster0&retryWrites=true&w=majority"
DB_NAME = "coinhubx_production"
TEST_USER_ID = "aby-925330f1"
TEST_EMAIL = "aby@test.com"

async def check_database():
    """Check database connection and test user"""
    print("\n" + "="*60)
    print("📦 DATABASE CHECK")
    print("="*60)
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check user exists
        user = await db.users.find_one({"email": TEST_EMAIL})
        if user:
            print(f"✅ User found: {TEST_EMAIL}")
            print(f"   User ID: {user.get('user_id')}")
            print(f"   Is Seller: {user.get('is_seller')}")
            print(f"   Seller Activated: {user.get('seller_activated')}")
        else:
            print(f"❌ User NOT found: {TEST_EMAIL}")
            return False
        
        # Check ads
        ads_count = await db.p2p_ads.count_documents({"seller_id": TEST_USER_ID})
        print(f"   Active Ads: {ads_count}")
        
        if ads_count > 0:
            ads = await db.p2p_ads.find({"seller_id": TEST_USER_ID}).to_list(10)
            for i, ad in enumerate(ads, 1):
                print(f"   Ad {i}: {ad.get('crypto_currency')}/{ad.get('fiat_currency')} @ {ad.get('price_per_unit')}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

async def check_create_ad_endpoint():
    """Test create ad endpoint"""
    print("\n" + "="*60)
    print("🎯 ENDPOINT TEST: Create Ad")
    print("="*60)
    
    payload = {
        "user_id": TEST_USER_ID,
        "ad_type": "sell",
        "crypto_currency": "BTC",
        "fiat_currency": "GBP",
        "price_value": 48000.00,
        "min_amount": 100,
        "max_amount": 3000,
        "payment_methods": ["bank_transfer"],
        "terms": "Verification test ad - " + datetime.now().isoformat()
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BACKEND_URL}/api/p2p/create-ad", json=payload, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('success'):
                        print(f"✅ Create ad endpoint: WORKING")
                        print(f"   Ad ID: {data.get('ad_id')}")
                        return data.get('ad_id')
                    else:
                        print(f"❌ Create ad failed: {data}")
                        return None
                else:
                    text = await resp.text()
                    print(f"❌ Create ad HTTP {resp.status}: {text[:200]}")
                    return None
    except Exception as e:
        print(f"❌ Create ad error: {e}")
        return None

async def check_my_ads_endpoint():
    """Test my ads endpoint"""
    print("\n" + "="*60)
    print("📊 ENDPOINT TEST: My Ads")
    print("="*60)
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}/api/p2p/my-ads/{TEST_USER_ID}", timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('success'):
                        ads = data.get('ads', [])
                        print(f"✅ My ads endpoint: WORKING")
                        print(f"   Found {len(ads)} ads")
                        for i, ad in enumerate(ads, 1):
                            print(f"   Ad {i}: {ad.get('ad_id')[:8]}... - {ad.get('crypto_currency')}/{ad.get('fiat_currency')} @ {ad.get('price_per_unit')}")
                        return True
                    else:
                        print(f"❌ My ads failed: {data}")
                        return False
                else:
                    text = await resp.text()
                    print(f"❌ My ads HTTP {resp.status}: {text[:200]}")
                    return False
    except Exception as e:
        print(f"❌ My ads error: {e}")
        return False

async def verify_ad_in_db(ad_id):
    """Verify created ad is in database"""
    if not ad_id:
        return False
    
    print("\n" + "="*60)
    print("🔍 DATABASE VERIFICATION")
    print("="*60)
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        ad = await db.p2p_ads.find_one({"ad_id": ad_id})
        if ad:
            print(f"✅ Ad found in database: {ad_id}")
            print(f"   Seller: {ad.get('seller_id')}")
            print(f"   Price: {ad.get('price_per_unit')}")
            print(f"   Status: {ad.get('status')}")
            
            # Clean up test ad
            await db.p2p_ads.delete_one({"ad_id": ad_id})
            print(f"✅ Test ad cleaned up")
            return True
        else:
            print(f"❌ Ad NOT found in database: {ad_id}")
            return False
        
        client.close()
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

async def main():
    """Run all checks"""
    print("🚀 P2P SYSTEM VERIFICATION")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend: {BACKEND_URL}")
    print(f"Database: {DB_NAME}")
    
    # Check 1: Database
    db_ok = await check_database()
    if not db_ok:
        print("\n❌ Database check failed. Aborting.")
        return
    
    # Check 2: Create Ad Endpoint
    ad_id = await check_create_ad_endpoint()
    
    # Check 3: My Ads Endpoint
    my_ads_ok = await check_my_ads_endpoint()
    
    # Check 4: Verify in DB
    if ad_id:
        db_verify_ok = await verify_ad_in_db(ad_id)
    else:
        db_verify_ok = False
    
    # Summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    print(f"Database Connection:     {'PASS' if db_ok else 'FAIL'}")
    print(f"Test User Exists:        {'PASS' if db_ok else 'FAIL'}")
    print(f"Create Ad Endpoint:      {'PASS' if ad_id else 'FAIL'}")
    print(f"My Ads Endpoint:         {'PASS' if my_ads_ok else 'FAIL'}")
    print(f"Database Persistence:    {'PASS' if db_verify_ok else 'FAIL'}")
    
    all_pass = db_ok and ad_id and my_ads_ok and db_verify_ok
    
    if all_pass:
        print("\n✅ ALL CHECKS PASSED - System is working correctly")
    else:
        print("\n❌ SOME CHECKS FAILED - Review errors above")
    
    print("\n" + "="*60)
    print("🎯 NEXT STEPS")
    print("="*60)
    print("1. Login to preview URL as aby@test.com / test123")
    print("2. Navigate to Merchant Center (/p2p/merchant)")
    print("3. Verify 'My Active Ads' shows ads")
    print("4. Create a new ad via UI")
    print("5. Verify new ad appears in the list")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
