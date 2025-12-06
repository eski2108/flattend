#!/usr/bin/env python3
"""Test authentication flow to understand the 15% failure"""

import requests

BASE_URL = "https://spottrading-fix.preview.emergentagent.com/api"

print("🔍 TESTING AUTHENTICATION FLOW\n")
print("=" * 60)

# Test 1: Login
print("\n1. Testing Login...")
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "email": "frontend_100_test@coinhubx.com",
        "password": "Test123456"
    }
)

print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"✅ Login successful")
    print(f"Response structure: {list(data.keys())}")
    
    if 'user' in data:
        user = data['user']
        print(f"\nUser object keys: {list(user.keys())}")
        print(f"User ID: {user.get('user_id')}")
        print(f"Email: {user.get('email')}")
    else:
        print("\n❌ No 'user' key in response!")
        print(f"Full response: {data}")
else:
    print(f"❌ Login failed: {response.text[:200]}")

print("\n" + "=" * 60)
