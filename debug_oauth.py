#!/usr/bin/env python3
import requests

# Test the actual API endpoint
print("Testing /api/auth/google:")
response = requests.get("https://nowpay-debug.preview.emergentagent.com/api/auth/google", allow_redirects=False)
print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
if 'location' in response.headers:
    print(f"Location: {response.headers['location']}")

print("\nTesting /auth/google:")
response2 = requests.get("https://nowpay-debug.preview.emergentagent.com/auth/google", allow_redirects=False)
print(f"Status: {response2.status_code}")
print(f"Headers: {dict(response2.headers)}")
if 'location' in response2.headers:
    print(f"Location: {response2.headers['location']}")