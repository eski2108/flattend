#!/usr/bin/env python3
"""
Test NOWPayments API directly to understand the issue
"""

import requests
import json
import os

# Load API key
API_KEY = "RN27NA0-D32MD5G-M6N2G6T-KWQMEAP"
BASE_URL = "https://api.nowpayments.io/v1"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

print("=" * 60)
print("NOWPayments API Debug Test")
print("=" * 60)

# Test 1: Check API status
print("\n1️⃣  Testing API Status...")
try:
    response = requests.get(f"{BASE_URL}/status", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: Get available currencies
print("\n2️⃣  Testing Get Currencies...")
try:
    response = requests.get(f"{BASE_URL}/currencies", headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        currencies = response.json().get('currencies', [])
        print(f"✅ Got {len(currencies)} currencies")
        print(f"BTC available: {'btc' in currencies}")
        print(f"ETH available: {'eth' in currencies}")
        print(f"USDT available: {'usdt' in currencies}")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: Get minimum amount for BTC
print("\n3️⃣  Testing Get Minimum Amount (BTC->USD)...")
try:
    response = requests.get(
        f"{BASE_URL}/min-amount",
        params={"currency_from": "btc", "currency_to": "usd"},
        headers=headers
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 4: Try to create a payment (simplified payload)
print("\n4️⃣  Testing Create Payment...")
payload = {
    "price_amount": 100,
    "price_currency": "usd",
    "pay_currency": "btc",
    "order_id": "test_order_12345",
    "order_description": "Test deposit",
    "ipn_callback_url": "https://quickstart-27.preview.emergentagent.com/api/nowpayments/ipn"
}

print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(
        f"{BASE_URL}/payment",
        json=payload,
        headers=headers
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 5: Check if this is a sandbox key
print("\n5️⃣  Checking API Key Type...")
print(f"API Key: {API_KEY}")
print(f"Key prefix: {API_KEY[:8]}...")
if "sandbox" in API_KEY.lower():
    print("⚠️  This appears to be a SANDBOX key")
else:
    print("ℹ️  This appears to be a PRODUCTION key")
