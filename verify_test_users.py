#!/usr/bin/env python3
"""
Quick script to verify test users for file attachment testing
"""

import requests
import json

BASE_URL = "https://nowpay-debug.preview.emergentagent.com/api"

def verify_user_directly(email):
    """Try to verify user by updating database directly via API"""
    try:
        # Try to get user info first
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "Test123456"
        })
        
        if response.status_code == 403:
            print(f"❌ User {email} needs verification")
            return False
        elif response.status_code == 200:
            print(f"✅ User {email} is already verified")
            return True
        else:
            print(f"❓ User {email} status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking {email}: {e}")
        return False

def main():
    """Check and verify test users"""
    test_users = [
        "buyer_proof@test.com",
        "seller_proof@test.com",
        "p2p_seller_final@test.com",
        "p2p_buyer_final@test.com"
    ]
    
    print("🔍 Checking test user verification status...")
    
    verified_users = []
    for email in test_users:
        if verify_user_directly(email):
            verified_users.append(email)
    
    print(f"\n✅ Verified users found: {len(verified_users)}")
    for email in verified_users:
        print(f"  - {email}")
    
    return verified_users

if __name__ == "__main__":
    main()