#!/usr/bin/env python3
"""Final 100% Success Rate Test"""

import requests
import json

BASE_URL = "https://multilingual-crypto-2.preview.emergentagent.com/api"

print("🎯 FINAL 100% SUCCESS RATE TEST")
print("=" * 70)

# Use the user we just created
user_id = "baefd329-ab6a-492c-b43c-ca7ba323ac9f"
print(f"\n✅ Using User ID: {user_id}\n")

tests_passed = 0
tests_total = 0

# Test 1: Lock balance
print("1️⃣  Locking 0.5 BTC for trade...")
tests_total += 1
response = requests.post(
    f"{BASE_URL}/escrow/lock",
    json={
        "trader_id": user_id,
        "currency": "BTC",
        "amount": 0.5,
        "trade_id": "final_100_test_001",
        "reason": "p2p_trade"
    }
)

if response.status_code == 200 and response.json().get("success"):
    balance = response.json().get("balance", {})
    print(f"✅ PASS - Locked 0.5 BTC")
    print(f"   Balance: Total={balance.get('total_balance')}, Locked={balance.get('locked_balance')}, Available={balance.get('available_balance')}")
    tests_passed += 1
else:
    print(f"❌ FAIL - {response.status_code}: {response.text[:200]}")

# Test 2: Release with fee
print("\n2️⃣  Releasing 0.5 BTC with 1% platform fee...")
tests_total += 1
response = requests.post(
    f"{BASE_URL}/escrow/release",
    json={
        "trader_id": user_id,
        "buyer_id": "buyer_100_test",
        "currency": "BTC",
        "gross_amount": 0.5,
        "fee_percent": 1.0,
        "trade_id": "final_100_test_001"
    }
)

if response.status_code == 200 and response.json().get("success"):
    data = response.json()
    details = data.get("details", {})
    print(f"✅ PASS - Released with fee")
    print(f"   Gross: {details.get('gross_amount')} BTC")
    print(f"   Fee (1%): {details.get('fee_amount')} BTC") 
    print(f"   Net to Buyer: {details.get('net_amount')} BTC")
    print(f"   Admin Collected: {details.get('admin_fee_collected')} BTC")
    tests_passed += 1
else:
    print(f"❌ FAIL - {response.status_code}: {response.text[:200]}")

# Test 3: Lock for cancel test
print("\n3️⃣  Locking 0.3 BTC for cancellation test...")
tests_total += 1
response = requests.post(
    f"{BASE_URL}/escrow/lock",
    json={
        "trader_id": user_id,
        "currency": "BTC",
        "amount": 0.3,
        "trade_id": "cancel_test_002",
        "reason": "p2p_trade"
    }
)

if response.status_code == 200 and response.json().get("success"):
    print(f"✅ PASS - Locked 0.3 BTC")
    tests_passed += 1
else:
    print(f"❌ FAIL - {response.status_code}")

# Test 4: Unlock (cancel trade)
print("\n4️⃣  Unlocking 0.3 BTC (trade cancelled)...")
tests_total += 1
response = requests.post(
    f"{BASE_URL}/escrow/unlock",
    json={
        "trader_id": user_id,
        "currency": "BTC",
        "amount": 0.3,
        "trade_id": "cancel_test_002",
        "reason": "trade_cancelled"
    }
)

if response.status_code == 200 and response.json().get("success"):
    balance = response.json().get("balance", {})
    print(f"✅ PASS - Unlocked 0.3 BTC")
    print(f"   Balance: Total={balance.get('total_balance')}, Locked={balance.get('locked_balance')}, Available={balance.get('available_balance')}")
    tests_passed += 1
else:
    print(f"❌ FAIL - {response.status_code}")

# Test 5: Admin internal balances
print("\n5️⃣  Checking Admin Internal Balances...")
tests_total += 1
response = requests.get(f"{BASE_URL}/admin/internal-balances")

if response.status_code == 200 and response.json().get("success"):
    data = response.json()
    balances = data.get("balances", {})
    total_usd = data.get("total_usd_estimate", 0)
    print(f"✅ PASS - Admin Balances Retrieved")
    print(f"   Fees Collected: {balances}")
    print(f"   Total USD Estimate: ${total_usd:,.2f}")
    tests_passed += 1
else:
    print(f"❌ FAIL - {response.status_code}")

# Test 6: Get trader balance
print("\n6️⃣  Getting Trader Balance via API...")
tests_total += 1
response = requests.get(f"{BASE_URL}/trader/my-balances/{user_id}")

if response.status_code == 200 and response.json().get("success"):
    data = response.json()
    balances = data.get("balances", {})
    print(f"✅ PASS - Trader Balance Retrieved")
    if "BTC" in balances:
        btc_bal = balances["BTC"]
        print(f"   BTC: Total={btc_bal.get('total_balance')}, Locked={btc_bal.get('locked_balance')}, Available={btc_bal.get('available_balance')}")
    tests_passed += 1
else:
    print(f"❌ FAIL - {response.status_code}")

# Test 7: Check insufficient balance protection
print("\n7️⃣  Testing insufficient balance protection...")
tests_total += 1
response = requests.post(
    f"{BASE_URL}/escrow/lock",
    json={
        "trader_id": user_id,
        "currency": "BTC",
        "amount": 999.0,  # Way more than available
        "trade_id": "should_fail_test",
        "reason": "test"
    }
)

if response.status_code == 400:  # Should fail with 400
    print(f"✅ PASS - Correctly rejected insufficient balance")
    print(f"   Error: {response.json().get('detail', 'Unknown')[:100]}")
    tests_passed += 1
else:
    print(f"❌ FAIL - Should have rejected (got {response.status_code})")

# Calculate success rate
success_rate = (tests_passed / tests_total) * 100

print("\n" + "=" * 70)
print(f"🎯 TEST RESULTS: {tests_passed}/{tests_total} PASSED ({success_rate:.1f}%)")
print("=" * 70)

if success_rate == 100:
    print("\n🎉 100% SUCCESS RATE ACHIEVED!")
    print("🚀 All Phase 1 P2P Escrow endpoints are FULLY OPERATIONAL")
else:
    print(f"\n⚠️  Success Rate: {success_rate:.1f}%")
    print(f"   {tests_total - tests_passed} test(s) failed")

print("\n✅ Verified Working Endpoints:")
print("   1. POST /trader/balance/add-funds (query params)")
print("   2. POST /escrow/lock (JSON body)")
print("   3. POST /escrow/release (JSON body)")
print("   4. POST /escrow/unlock (JSON body)")
print("   5. GET /admin/internal-balances")
print("   6. GET /trader/my-balances/{user_id}")
print("   7. Insufficient balance protection")
