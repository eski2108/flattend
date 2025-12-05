#!/usr/bin/env python3
"""Quick test to verify the 9% failed endpoints with CORRECT parameters"""

import requests
import json

BASE_URL = "https://codehealer-31.preview.emergentagent.com/api"

print("🔍 TESTING THE 9% FAILED ENDPOINTS WITH CORRECT PARAMETERS\n")
print("=" * 60)

# First, let's create a test user and add funds
print("\n1. Setting up test trader...")
try:
    # Register/Login user
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "release_test@coinhubx.com",
            "password": "Test123456",
            "full_name": "Release Test User"
        },
        timeout=10
    )
    
    if response.status_code == 400 and "already registered" in response.text:
        # Login instead
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "release_test@coinhubx.com", "password": "Test123456"},
            timeout=10
        )
    
    if response.status_code == 200:
        data = response.json()
        user_id = data.get("user", {}).get("user_id")
        print(f"✅ User ready: {user_id}")
    else:
        print(f"❌ Failed to setup user: {response.status_code}")
        exit(1)
        
except Exception as e:
    print(f"❌ Error: {str(e)}")
    exit(1)

# Add funds to trader
print("\n2. Adding funds to trader...")
try:
    response = requests.post(
        f"{BASE_URL}/trader/add-funds",
        json={"user_id": user_id, "currency": "BTC", "amount": 2.0},
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"✅ Added 2.0 BTC to trader")
        else:
            print(f"❌ Failed: {data}")
    else:
        print(f"❌ Failed with status {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Lock some balance
print("\n3. Locking balance for trade...")
try:
    response = requests.post(
        f"{BASE_URL}/escrow/lock",
        json={
            "trader_id": user_id,
            "currency": "BTC",
            "amount": 0.1,
            "trade_id": "test_trade_001",
            "reason": "test_trade"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"✅ Locked 0.1 BTC successfully")
            balance = data.get("balance", {})
            print(f"   Balance: Total={balance.get('total_balance')}, Locked={balance.get('locked_balance')}, Available={balance.get('available_balance')}")
        else:
            print(f"❌ Failed: {data}")
    else:
        print(f"❌ Failed with status {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Now test RELEASE with CORRECT parameters (trader_id, buyer_id, gross_amount, fee_percent)
print("\n4. Testing ESCROW RELEASE with CORRECT parameters...")
try:
    response = requests.post(
        f"{BASE_URL}/escrow/release",
        json={
            "trader_id": user_id,  # Correct parameter name
            "buyer_id": "buyer_test_001",  # Correct parameter name
            "currency": "BTC",
            "gross_amount": 0.1,  # Correct parameter name
            "fee_percent": 1.0,  # Correct parameter name (not fee_percentage)
            "trade_id": "test_trade_001"
        },
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ ESCROW RELEASE WORKS! Response:")
        print(json.dumps(data, indent=2))
        
        if data.get("success"):
            details = data.get("details", {})
            print(f"\n   📊 Release Details:")
            print(f"   - Gross Amount: {details.get('gross_amount')} BTC")
            print(f"   - Fee: {details.get('fee_amount')} BTC ({details.get('fee_percent')}%)")
            print(f"   - Net to Buyer: {details.get('net_amount')} BTC")
            print(f"   - Admin Fee Collected: {details.get('admin_fee_collected')} BTC")
    else:
        print(f"❌ Failed with status {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Test admin internal balances
print("\n5. Testing ADMIN INTERNAL BALANCES endpoint...")
try:
    response = requests.get(
        f"{BASE_URL}/admin/internal-balances",
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ ADMIN INTERNAL BALANCES WORKS! Response:")
        print(json.dumps(data, indent=2))
        
        if data.get("success"):
            balances = data.get("balances", {})
            total_usd = data.get("total_usd_estimate", 0)
            print(f"\n   💰 Admin Collected Fees:")
            for currency, amount in balances.items():
                print(f"   - {currency}: {amount}")
            print(f"   - Total USD Estimate: ${total_usd:,.2f}")
    else:
        print(f"❌ Failed with status {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "=" * 60)
print("🎯 TESTING COMPLETE")
