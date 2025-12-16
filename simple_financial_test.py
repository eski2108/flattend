#!/usr/bin/env python3
"""
Simple Financial Engine Test - Check Available Endpoints and Execute Basic Transactions
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime

BACKEND_URL = "https://finance-check-5.preview.emergentagent.com/api"

async def test_endpoints():
    """Test available endpoints and execute basic transactions"""
    
    async with aiohttp.ClientSession() as session:
        print("🚀 SIMPLE FINANCIAL ENGINE TEST")
        print("=" * 50)
        
        # 1. Test Health
        print("\n1. Testing Health Endpoint...")
        async with session.get(f"{BACKEND_URL}/health") as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ Health: {result}")
            else:
                print(f"❌ Health failed: {response.status}")
        
        # 2. Create a test user
        print("\n2. Creating Test User...")
        user_data = {
            "email": f"test_user_{uuid.uuid4().hex[:8]}@test.com",
            "password": "Test123!",
            "full_name": "Test User",
            "phone_number": "+447700900123"
        }
        
        async with session.post(f"{BACKEND_URL}/auth/register", json=user_data) as response:
            if response.status == 200:
                result = await response.json()
                user_id = result.get("user_id")
                print(f"✅ User created: {user_id}")
            else:
                print(f"❌ User creation failed: {response.status}")
                text = await response.text()
                print(f"Error: {text}")
                return
        
        # 3. Check user wallet balances
        print(f"\n3. Checking User Wallet Balances...")
        async with session.get(f"{BACKEND_URL}/wallets/balances/{user_id}") as response:
            if response.status == 200:
                result = await response.json()
                balances = result.get("balances", [])
                print(f"✅ Found {len(balances)} currency balances:")
                for balance in balances[:5]:  # Show first 5
                    currency = balance.get("currency")
                    total = balance.get("total_balance", 0)
                    available = balance.get("available_balance", 0)
                    print(f"   {currency}: Total={total}, Available={available}")
            else:
                print(f"❌ Wallet balances failed: {response.status}")
        
        # 4. Check PLATFORM_FEES balance
        print(f"\n4. Checking PLATFORM_FEES Balance...")
        query_data = {
            "query": 'internal_balances.findOne({"user_id": "PLATFORM_FEES", "currency": "GBP"})'
        }
        async with session.post(f"{BACKEND_URL}/execute-query", json=query_data) as response:
            if response.status == 200:
                result = await response.json()
                if result.get("success"):
                    data = result.get("data", {})
                    balance = data.get("balance", 0)
                    print(f"✅ PLATFORM_FEES GBP Balance: {balance}")
                else:
                    print(f"⚠️ PLATFORM_FEES query returned: {result}")
            else:
                print(f"❌ PLATFORM_FEES query failed: {response.status}")
        
        # 5. Check Admin Liquidity
        print(f"\n5. Checking Admin Liquidity...")
        query_data = {
            "query": 'admin_liquidity_wallets.find({})'
        }
        async with session.post(f"{BACKEND_URL}/execute-query", json=query_data) as response:
            if response.status == 200:
                result = await response.json()
                if result.get("success"):
                    data = result.get("data", [])
                    print(f"✅ Found {len(data)} admin liquidity wallets:")
                    for wallet in data[:5]:  # Show first 5
                        currency = wallet.get("currency")
                        balance = wallet.get("balance", 0)
                        available = wallet.get("available", 0)
                        reserved = wallet.get("reserved", 0)
                        print(f"   {currency}: Balance={balance}, Available={available}, Reserved={reserved}")
                else:
                    print(f"⚠️ Admin liquidity query returned: {result}")
            else:
                print(f"❌ Admin liquidity query failed: {response.status}")
        
        # 6. Test Trading Pairs
        print(f"\n6. Testing Trading Pairs...")
        async with session.get(f"{BACKEND_URL}/trading/pairs") as response:
            if response.status == 200:
                result = await response.json()
                pairs = result.get("pairs", [])
                print(f"✅ Found {len(pairs)} trading pairs:")
                for pair in pairs[:5]:  # Show first 5
                    symbol = pair.get("symbol")
                    base = pair.get("base_currency")
                    quote = pair.get("quote_currency")
                    print(f"   {symbol}: {base}/{quote}")
            else:
                print(f"❌ Trading pairs failed: {response.status}")
        
        # 7. Test P2P Offers
        print(f"\n7. Testing P2P Offers...")
        async with session.get(f"{BACKEND_URL}/p2p/offers") as response:
            if response.status == 200:
                result = await response.json()
                offers = result.get("offers", [])
                print(f"✅ Found {len(offers)} P2P offers")
                if offers:
                    for offer in offers[:3]:  # Show first 3
                        crypto = offer.get("crypto_currency")
                        amount = offer.get("crypto_amount")
                        price = offer.get("price_per_unit")
                        print(f"   {crypto}: {amount} @ £{price}")
            else:
                print(f"❌ P2P offers failed: {response.status}")
        
        # 8. Test Express Buy Config
        print(f"\n8. Testing Express Buy Config...")
        async with session.get(f"{BACKEND_URL}/express-buy/config") as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ Express Buy Config: {result}")
            else:
                print(f"❌ Express Buy config failed: {response.status}")
        
        # 9. Test Express Buy Supported Coins
        print(f"\n9. Testing Express Buy Supported Coins...")
        async with session.get(f"{BACKEND_URL}/express-buy/supported-coins") as response:
            if response.status == 200:
                result = await response.json()
                coins = result.get("coins", [])
                print(f"✅ Found {len(coins)} supported coins for Express Buy:")
                for coin in coins[:5]:  # Show first 5
                    symbol = coin.get("symbol")
                    available = coin.get("available_amount", 0)
                    print(f"   {symbol}: {available} available")
            else:
                print(f"❌ Express Buy supported coins failed: {response.status}")
        
        # 10. Test Swap Available Coins
        print(f"\n10. Testing Swap Available Coins...")
        async with session.get(f"{BACKEND_URL}/swap/available-coins") as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ Swap Available Coins: {result}")
            else:
                print(f"❌ Swap available coins failed: {response.status}")
        
        print(f"\n🎯 SIMPLE TEST COMPLETED")
        print("=" * 50)

if __name__ == "__main__":
    asyncio.run(test_endpoints())