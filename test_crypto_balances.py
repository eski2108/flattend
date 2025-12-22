#!/usr/bin/env python3
"""
Test crypto balances endpoint specifically
"""

import requests
import json

BASE_URL = "https://crypto-integrify.preview.emergentagent.com/api"
USER_ID = "b382449d-f995-4c9e-a02d-39b7bf1ebb5d"

def test_crypto_balances():
    try:
        response = requests.get(
            f"{BASE_URL}/crypto-bank/balances/{USER_ID}",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response Data: {json.dumps(data, indent=2)}")
            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {e}")
                print(f"Raw Response: {response.text}")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {str(e)}")

if __name__ == "__main__":
    test_crypto_balances()