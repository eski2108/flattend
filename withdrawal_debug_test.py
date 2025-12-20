#!/usr/bin/env python3
"""
Withdrawal System Debug Test - Investigate specific issues found
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://savingsflow-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = "withdrawal_test@demo.com"
TEST_USER_PASSWORD = "Test123!"
ADMIN_USER_EMAIL = "admin_test@demo.com"
ADMIN_USER_PASSWORD = "Admin123!"

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with detailed logging"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        print(f"\n{method} {endpoint}")
        print(f"Status: {response.status_code}")
        try:
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
            return response
        except:
            print(f"Response (text): {response.text}")
            return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return None

def debug_withdrawal_system():
    print("🔍 WITHDRAWAL SYSTEM DEBUG ANALYSIS")
    print("=" * 60)
    
    # 1. Login as user
    print("\n1. USER LOGIN")
    login_data = {"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    response = make_request("POST", "/auth/login", login_data)
    
    if not response or response.status_code != 200:
        print("❌ Cannot proceed - user login failed")
        return
        
    data = response.json()
    user_token = data.get("token")
    user_id = data.get("user", {}).get("user_id")
    
    if not user_token or not user_id:
        print("❌ Cannot proceed - missing token or user_id")
        return
        
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 2. Check user balance endpoints
    print("\n2. USER BALANCE INVESTIGATION")
    balance_endpoints = [
        f"/wallets/balances/{user_id}",
        f"/crypto-bank/balances/{user_id}",
        f"/user/balances/{user_id}",
        f"/balances/{user_id}"
    ]
    
    for endpoint in balance_endpoints:
        make_request("GET", endpoint, headers=headers)
    
    # 3. Check if user has any BTC balance - try to fund first
    print("\n3. FUNDING USER WITH BTC")
    funding_endpoints = [
        "/crypto-bank/deposit",
        "/admin/manual-deposit",
        "/user/deposit"
    ]
    
    funding_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 0.01
    }
    
    for endpoint in funding_endpoints:
        make_request("POST", endpoint, funding_data, headers)
    
    # 4. Check balance again after funding attempt
    print("\n4. BALANCE CHECK AFTER FUNDING")
    make_request("GET", f"/wallets/balances/{user_id}", headers=headers)
    
    # 5. Submit withdrawal
    print("\n5. WITHDRAWAL SUBMISSION")
    withdrawal_data = {
        "user_id": user_id,
        "currency": "BTC", 
        "amount": 0.0005,
        "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    }
    
    response = make_request("POST", "/user/withdraw", withdrawal_data, headers)
    
    if response and response.status_code == 200:
        data = response.json()
        withdrawal_id = data.get("transaction_id")
        
        # 6. Check transaction history
        print("\n6. TRANSACTION HISTORY INVESTIGATION")
        tx_endpoints = [
            f"/transactions/{user_id}",
            f"/user/transactions/{user_id}",
            f"/crypto-bank/transactions/{user_id}",
            f"/withdrawal-requests/{user_id}"
        ]
        
        for endpoint in tx_endpoints:
            make_request("GET", endpoint, headers=headers)
        
        # 7. Login as admin
        print("\n7. ADMIN LOGIN")
        admin_login_data = {"email": ADMIN_USER_EMAIL, "password": ADMIN_USER_PASSWORD}
        admin_response = make_request("POST", "/auth/login", admin_login_data)
        
        if admin_response and admin_response.status_code == 200:
            admin_data = admin_response.json()
            admin_token = admin_data.get("token")
            admin_id = admin_data.get("user", {}).get("user_id")
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            
            # 8. Check admin withdrawal endpoints
            print("\n8. ADMIN WITHDRAWAL ENDPOINTS")
            admin_endpoints = [
                "/admin/withdrawals/pending",
                "/admin/withdrawals",
                "/admin/withdrawal-requests",
                "/withdrawals/pending"
            ]
            
            for endpoint in admin_endpoints:
                make_request("GET", endpoint, headers=admin_headers)
            
            # 9. Try to approve withdrawal with different data structures
            print("\n9. WITHDRAWAL APPROVAL ATTEMPTS")
            if withdrawal_id:
                approval_attempts = [
                    {
                        "withdrawal_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "notes": "Test approval"
                    },
                    {
                        "withdrawal_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "notes": "Test approval",
                        "fee_amount": 0.000005
                    },
                    {
                        "transaction_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "notes": "Test approval"
                    },
                    {
                        "id": withdrawal_id,
                        "status": "approved",
                        "admin_notes": "Test approval"
                    }
                ]
                
                approval_endpoints = [
                    "/admin/withdrawals/review",
                    "/admin/withdrawals/approve",
                    "/withdrawals/approve"
                ]
                
                for i, approval_data in enumerate(approval_attempts):
                    for endpoint in approval_endpoints:
                        print(f"\nApproval attempt {i+1} on {endpoint}")
                        make_request("POST", endpoint, approval_data, admin_headers)
    
    print("\n" + "=" * 60)
    print("🔍 DEBUG ANALYSIS COMPLETE")

if __name__ == "__main__":
    debug_withdrawal_system()