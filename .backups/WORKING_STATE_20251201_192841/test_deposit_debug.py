#!/usr/bin/env python3
"""
Test NOWPayments deposit creation to debug 400 error
"""

import requests
import json

BACKEND_URL = "https://tradingplatform-14.preview.emergentagent.com/api"

# Step 1: Register/Login a test user
print("Step 1: Logging in...")
login_data = {
    "email": "wallet_test_16c38826@test.com",
    "password": "Test123456"
}

login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
print(f"Login Status: {login_response.status_code}")

if login_response.status_code == 200:
    login_result = login_response.json()
    if login_result.get("success"):
        user_id = login_result["user"]["user_id"]
        print(f"✅ Logged in successfully. User ID: {user_id}")
        
        # Step 2: Try to create a deposit
        print("\nStep 2: Creating deposit...")
        deposit_data = {
            "user_id": user_id,
            "amount": 100,
            "currency": "usd",
            "pay_currency": "btc"
        }
        
        print(f"Request payload: {json.dumps(deposit_data, indent=2)}")
        
        deposit_response = requests.post(
            f"{BACKEND_URL}/nowpayments/create-deposit",
            json=deposit_data
        )
        
        print(f"\nDeposit Response Status: {deposit_response.status_code}")
        print(f"Deposit Response Body:")
        try:
            print(json.dumps(deposit_response.json(), indent=2))
        except:
            print(deposit_response.text)
            
        # Check backend logs for more details
        print("\n" + "="*50)
        print("Check backend logs with:")
        print("tail -n 30 /var/log/supervisor/backend.err.log")
    else:
        print(f"❌ Login failed: {login_result.get('message')}")
else:
    print(f"❌ Login request failed: {login_response.text}")
