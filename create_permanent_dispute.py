#!/usr/bin/env python3
"""
Create a permanent P2P dispute for testing the dispute detail page
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
BACKEND_URL = "https://nowpay-debug.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "coinhubx"

async def create_permanent_dispute():
    """Create a permanent P2P dispute for testing"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create permanent trade
    trade_id = "trade_permanent_dispute_test"
    buyer_id = "buyer_permanent_test"
    seller_id = "seller_permanent_test"
    
    trade_data = {
        "trade_id": trade_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.01,  # EXACTLY 0.01 BTC as requested
        "fiat_currency": "GBP",
        "fiat_amount": 500.00,  # EXACTLY £500 as requested
        "status": "buyer_marked_paid",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "payment_method": "faster_payments",
        "escrow_locked": True,
        "payment_marked_at": datetime.now(timezone.utc).isoformat(),
        "buyer_wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "seller_wallet_address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        "price_per_unit": 50000.00,
        "payment_reference": "FP12345678901",
        "terms": "Payment within 30 minutes. Include reference number."
    }
    
    # Remove existing trade if it exists
    await db.p2p_trades.delete_one({"trade_id": trade_id})
    
    # Insert permanent trade
    await db.p2p_trades.insert_one(trade_data)
    print(f"✅ Permanent trade created: {trade_id}")
    
    # Create dispute via API
    session = aiohttp.ClientSession()
    
    dispute_data = {
        "trade_id": trade_id,
        "user_id": buyer_id,
        "reason": "crypto_not_released",
        "description": "I have completed the payment of £500 for 0.01 BTC as agreed in the trade. The payment was made via Faster Payments with reference FP12345678901 and I have provided proof of payment. However, the seller has not released the cryptocurrency after 24 hours despite multiple attempts to contact them. I am requesting admin intervention to resolve this dispute and release my purchased cryptocurrency."
    }
    
    url = f"{BACKEND_URL}/p2p/disputes/create"
    
    try:
        async with session.post(url, json=dispute_data) as response:
            response_text = await response.text()
            print(f"API Response Status: {response.status}")
            print(f"API Response: {response_text}")
            
            if response.status == 200:
                result = json.loads(response_text)
                if result.get("success"):
                    dispute_id = result.get("dispute_id")
                    print(f"\n🎯 PERMANENT DISPUTE CREATED FOR TESTING!")
                    print(f"🆔 FULL DISPUTE ID: {dispute_id}")
                    print(f"\n🌐 EXACT URLs FOR TESTING:")
                    print(f"   Localhost: http://localhost:3000/admin/disputes/{dispute_id}")
                    print(f"   Frontend:  https://nowpay-debug.preview.emergentagent.com/admin/disputes/{dispute_id}")
                    print(f"\n📋 API ENDPOINT TO TEST:")
                    print(f"   GET {BACKEND_URL}/p2p/disputes/{dispute_id}")
                    
                    # Test the API endpoint
                    async with session.get(f"{BACKEND_URL}/p2p/disputes/{dispute_id}") as test_response:
                        test_data = await test_response.text()
                        print(f"\n✅ API TEST RESULT:")
                        print(f"   Status: {test_response.status}")
                        if test_response.status == 200:
                            dispute_json = json.loads(test_data)
                            if dispute_json.get("success") and dispute_json.get("dispute"):
                                dispute = dispute_json["dispute"]
                                print(f"   ✅ All required fields present:")
                                print(f"      - dispute_id: {dispute.get('dispute_id')}")
                                print(f"      - trade_id: {dispute.get('trade_id')}")
                                print(f"      - amount: {dispute.get('amount')}")
                                print(f"      - currency: {dispute.get('currency')}")
                                print(f"      - buyer_id: {dispute.get('buyer_id')}")
                                print(f"      - seller_id: {dispute.get('seller_id')}")
                                print(f"      - reason: {dispute.get('reason')}")
                                print(f"      - description: Present ({len(dispute.get('description', ''))} chars)")
                                print(f"      - created_at: {dispute.get('created_at')}")
                                print(f"      - status: {dispute.get('status')}")
                                print(f"      - messages: {len(dispute.get('messages', []))} messages")
                        else:
                            print(f"   ❌ API test failed: {test_data}")
                    
                    return dispute_id
                else:
                    print(f"❌ Dispute creation failed: {result}")
            else:
                print(f"❌ HTTP Error {response.status}: {response_text}")
                
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
    finally:
        await session.close()
        client.close()
    
    return None

if __name__ == "__main__":
    asyncio.run(create_permanent_dispute())