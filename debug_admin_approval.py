#!/usr/bin/env python3
"""
Debug Admin Approval Issue - Test different approval request formats
"""

import requests
import json

BASE_URL = "https://savingsflow.preview.emergentagent.com/api"
ADMIN_USER_EMAIL = "admin_test@demo.com"
ADMIN_USER_PASSWORD = "Admin123!"

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with detailed logging"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        else:
            response = requests.get(url, headers=headers, timeout=30)
            
        print(f"\n{method} {endpoint}")
        print(f"Request Data: {json.dumps(data, indent=2) if data else 'None'}")
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

def debug_admin_approval():
    print("🔍 DEBUG ADMIN APPROVAL ISSUE")
    print("=" * 50)
    
    # 1. Login as admin
    print("\n1. ADMIN LOGIN")
    login_data = {"email": ADMIN_USER_EMAIL, "password": ADMIN_USER_PASSWORD}
    response = make_request("POST", "/auth/login", login_data)
    
    if not response or response.status_code != 200:
        print("❌ Cannot proceed - admin login failed")
        return
        
    data = response.json()
    admin_token = data.get("token")
    admin_id = data.get("user", {}).get("user_id")
    
    if not admin_token or not admin_id:
        print("❌ Cannot proceed - missing token or admin_id")
        return
        
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Get pending withdrawals
    print("\n2. GET PENDING WITHDRAWALS")
    response = make_request("GET", "/admin/withdrawals/pending", headers=headers)
    
    if response and response.status_code == 200:
        data = response.json()
        withdrawals = data.get("withdrawals", [])
        
        if withdrawals:
            withdrawal_id = withdrawals[0].get("transaction_id") or withdrawals[0].get("withdrawal_id")
            print(f"\nFound withdrawal to test: {withdrawal_id}")
            
            # 3. Try different approval formats
            print("\n3. TESTING DIFFERENT APPROVAL FORMATS")
            
            approval_formats = [
                {
                    "name": "Standard Format",
                    "data": {
                        "withdrawal_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "notes": "Test approval"
                    }
                },
                {
                    "name": "With Fee Amount",
                    "data": {
                        "withdrawal_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "notes": "Test approval",
                        "fee_amount": 0.0000025
                    }
                },
                {
                    "name": "With Rejection Reason",
                    "data": {
                        "withdrawal_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "rejection_reason": None
                    }
                },
                {
                    "name": "Alternative Field Names",
                    "data": {
                        "transaction_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve",
                        "admin_notes": "Test approval"
                    }
                },
                {
                    "name": "Minimal Format",
                    "data": {
                        "withdrawal_id": withdrawal_id,
                        "admin_id": admin_id,
                        "action": "approve"
                    }
                }
            ]
            
            for format_test in approval_formats:
                print(f"\n--- Testing {format_test['name']} ---")
                response = make_request("POST", "/admin/withdrawals/review", format_test["data"], headers)
                
                if response and response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        print(f"✅ SUCCESS with {format_test['name']}")
                        break
                    else:
                        print(f"❌ FAILED: {data.get('message', 'Unknown error')}")
                else:
                    print(f"❌ HTTP ERROR: {response.status_code if response else 'No response'}")
        else:
            print("No pending withdrawals found to test")
    else:
        print("Failed to get pending withdrawals")

if __name__ == "__main__":
    debug_admin_approval()