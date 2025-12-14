#!/usr/bin/env python3
"""
Debug balance issue - check what happened to user's GBP balance
"""

import requests
import json
import time

BASE_URL = "https://payflow-crypto-3.preview.emergentagent.com/api"

def debug_balance():
    session = requests.Session()
    
    # Create a new user
    timestamp = str(int(time.time()))
    register_data = {
        "email": f"debug_balance_{timestamp}@test.com",
        "password": "Test123456",
        "full_name": "Debug Balance User"
    }
    
    # Register
    response = session.post(f"{BASE_URL}/auth/register", json=register_data)
    if response.status_code != 200:
        print(f"Registration failed: {response.status_code}")
        return
    
    user_id = response.json().get("user", {}).get("user_id")
    print(f"Created user: {user_id}")
    
    # Login
    login_data = {
        "email": f"debug_balance_{timestamp}@test.com",
        "password": "Test123456"
    }
    session.post(f"{BASE_URL}/auth/login", json=login_data)
    
    # Mock KYC
    session.post(f"{BASE_URL}/auth/mock-kyc", json={"user_id": user_id})
    
    # Activate seller
    session.post(f"{BASE_URL}/p2p/activate-seller", json={"user_id": user_id})
    
    # Add 100 GBP
    print("\n1. Adding £100 GBP...")
    response = session.post(f"{BASE_URL}/trader/balance/add-funds", 
                           params={"trader_id": user_id, "currency": "GBP", "amount": 100.0})
    print(f"Add funds response: {response.status_code}")
    
    # Check balance after adding funds
    response = session.get(f"{BASE_URL}/trader/my-balances/{user_id}")
    if response.status_code == 200:
        data = response.json()
        balances = data.get("balances", [])
        for balance in balances:
            if balance.get("currency") == "GBP":
                print(f"GBP balance after adding funds: £{balance.get('available_balance', 0)}")
                break
    
    # Add BTC
    session.post(f"{BASE_URL}/trader/balance/add-funds", 
                params={"trader_id": user_id, "currency": "BTC", "amount": 1.0})
    
    # Create an offer
    print("\n2. Creating BTC sell offer...")
    offer_data = {
        "user_id": user_id,
        "ad_type": "sell",
        "crypto_currency": "BTC",
        "fiat_currency": "GBP",
        "price_type": "fixed",
        "price_value": 48000,
        "min_amount": 100,
        "max_amount": 5000,
        "available_amount": 1.0,
        "payment_methods": ["Bank Transfer"],
        "terms": "Test offer"
    }
    
    response = session.post(f"{BASE_URL}/p2p/create-ad", json=offer_data)
    if response.status_code == 200:
        ad_data = response.json().get("ad", {})
        ad_id = ad_data.get("ad_id")
        print(f"Created offer: {ad_id}")
        
        # Check balance after creating offer
        response = session.get(f"{BASE_URL}/trader/my-balances/{user_id}")
        if response.status_code == 200:
            data = response.json()
            balances = data.get("balances", [])
            for balance in balances:
                if balance.get("currency") == "GBP":
                    print(f"GBP balance after creating offer: £{balance.get('available_balance', 0)}")
                    break
        
        # Boost the offer
        print("\n3. Boosting offer for daily (£10)...")
        boost_data = {
            "user_id": user_id,
            "ad_id": ad_id,
            "duration_type": "daily"
        }
        
        response = session.post(f"{BASE_URL}/p2p/boost-offer", json=boost_data)
        print(f"Boost response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Boost cost: £{data.get('cost', 'unknown')}")
        else:
            print(f"Boost error: {response.text}")
        
        # Check final balance
        response = session.get(f"{BASE_URL}/trader/my-balances/{user_id}")
        if response.status_code == 200:
            data = response.json()
            balances = data.get("balances", [])
            for balance in balances:
                if balance.get("currency") == "GBP":
                    final_balance = balance.get('available_balance', 0)
                    print(f"GBP balance after boost: £{final_balance}")
                    print(f"Expected: £90, Actual: £{final_balance}, Difference: £{90 - final_balance}")
                    break
    else:
        print(f"Failed to create offer: {response.status_code}")

if __name__ == "__main__":
    debug_balance()