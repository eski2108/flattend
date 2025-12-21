#!/usr/bin/env python3
"""Testing to achieve 100% success rate"""

import requests
import json

BASE_URL = "https://nowpay-debug.preview.emergentagent.com/api"

print("🎯 ACHIEVING 100% SUCCESS RATE - TESTING ALL ENDPOINTS CORRECTLY\n")
print("=" * 70)

# Setup user
print("\n1️⃣  Setting up test trader...")
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "alice_escrow@coinhubx.com", "password": "Alice123456"},
    timeout=10
)

if response.status_code != 200:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": "alice_escrow@coinhubx.com", "password": "Alice123456", "full_name": "Alice Trader"},
        timeout=10
    )
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "alice_escrow@coinhubx.com", "password": "Alice123456"},
        timeout=10
    )

user_id = response.json().get("user", {}).get("user_id")
print(f"✅ User ID: {user_id}")

# Add funds using CORRECT endpoint
print("\n2️⃣  Adding funds (using CORRECT endpoint /trader/balance/add-funds)...")
response = requests.post(
    f"{BASE_URL}/trader/balance/add-funds",
    json={"user_id": user_id, "currency": "BTC", "amount": 3.0, "reason": "test_deposit"},
    timeout=10
)

if response.status_code == 200:
    data = response.json()
    if data.get("success"):
        balance = data.get("balance", {})
        print(f"✅ Added 3.0 BTC successfully")
        print(f"   Total: {balance.get('total_balance')} | Locked: {balance.get('locked_balance')} | Available: {balance.get('available_balance')}")
    else:
        print(f"❌ Failed: {data}")
        exit(1)
else:
    print(f"❌ Failed with status {response.status_code}")
    exit(1)

# Lock balance
print("\n3️⃣  Locking 0.5 BTC for trade...")
response = requests.post(
    f"{BASE_URL}/escrow/lock",
    json={
        "trader_id": user_id,
        "currency": "BTC",
        "amount": 0.5,
        "trade_id": "final_test_trade_001",
        "reason": "p2p_trade"
    },
    timeout=10
)

if response.status_code == 200:
    data = response.json()
    if data.get("success"):
        balance = data.get("balance", {})
        print(f"✅ Locked 0.5 BTC successfully")
        print(f"   Total: {balance.get('total_balance')} | Locked: {balance.get('locked_balance')} | Available: {balance.get('available_balance')}")
    else:
        print(f"❌ Failed: {data}")
        exit(1)
else:
    print(f"❌ Failed with status {response.status_code}")
    exit(1)

# Release with fee (THE 9% FAILURE POINT - NOW WITH CORRECT PARAMS)
print("\n4️⃣  Releasing 0.5 BTC with 1% fee (CORRECT PARAMETERS)...")
response = requests.post(
    f"{BASE_URL}/escrow/release",
    json={
        "trader_id": user_id,
        "buyer_id": "buyer_final_test",
        "currency": "BTC",
        "gross_amount": 0.5,
        "fee_percent": 1.0,
        "trade_id": "final_test_trade_001"
    },
    timeout=10
)

print(f"   Status Code: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    if data.get("success"):
        print(f"✅ RELEASE SUCCESSFUL!")
        details = data.get("details", {})
        print(f"\n   📊 Transaction Details:")
        print(f"   ├─ Gross Amount: {details.get('gross_amount')} BTC")
        print(f"   ├─ Platform Fee (1%): {details.get('fee_amount')} BTC")
        print(f"   ├─ Net to Buyer: {details.get('net_amount')} BTC")
        print(f"   ├─ Admin Fee Collected: {details.get('admin_fee_collected')} BTC")
        print(f"   └─ Seller New Balance:")
        trader_bal = details.get('trader_new_balance', {})
        print(f"      Total: {trader_bal.get('total')} | Locked: {trader_bal.get('locked')} | Available: {trader_bal.get('available')}")
    else:
        print(f"❌ Failed: {data}")
        exit(1)
else:
    print(f"❌ Failed: {response.text[:300]}")
    exit(1)

# Check admin balances
print("\n5️⃣  Checking Admin Internal Balances...")
response = requests.get(f"{BASE_URL}/admin/internal-balances", timeout=10)

if response.status_code == 200:
    data = response.json()
    if data.get("success"):
        print(f"✅ ADMIN BALANCES RETRIEVED!")
        balances = data.get("balances", {})
        total_usd = data.get("total_usd_estimate", 0)
        print(f"\n   💰 Admin Collected Fees (All Time):")
        for currency, amount in balances.items():
            print(f"   ├─ {currency}: {amount} (≈ ${amount * 95000:,.2f} USD)")
        print(f"   └─ Total Estimate: ${total_usd:,.2f} USD")
    else:
        print(f"❌ Failed: {data}")
        exit(1)
else:
    print(f"❌ Failed with status {response.status_code}")
    exit(1)

# Unlock test
print("\n6️⃣  Testing unlock (lock new trade then cancel)...")
response = requests.post(
    f"{BASE_URL}/escrow/lock",
    json={
        "trader_id": user_id,
        "currency": "BTC",
        "amount": 0.2,
        "trade_id": "cancel_test_trade_002",
        "reason": "p2p_trade"
    },
    timeout=10
)

if response.status_code == 200:
    print(f"✅ Locked 0.2 BTC for cancellation test")
    
    # Now unlock it
    response = requests.post(
        f"{BASE_URL}/escrow/unlock",
        json={
            "trader_id": user_id,
            "currency": "BTC",
            "amount": 0.2,
            "trade_id": "cancel_test_trade_002",
            "reason": "trade_cancelled"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"✅ Unlocked 0.2 BTC successfully (trade cancelled)")
            balance = data.get("balance", {})
            print(f"   Total: {balance.get('total_balance')} | Locked: {balance.get('locked_balance')} | Available: {balance.get('available_balance')}")
    else:
        print(f"❌ Unlock failed")
        exit(1)
else:
    print(f"❌ Lock failed")
    exit(1)

print("\n" + "=" * 70)
print("🎉 100% SUCCESS RATE ACHIEVED!")
print("=" * 70)
print("\n✅ All Core Escrow Endpoints Working:")
print("   1. Add Funds - ✅")
print("   2. Lock Balance - ✅")
print("   3. Release Balance (with fee) - ✅")
print("   4. Unlock Balance (cancel) - ✅")
print("   5. Admin Internal Balances - ✅")
print("\n🚀 Phase 1 P2P Escrow System: FULLY OPERATIONAL")
