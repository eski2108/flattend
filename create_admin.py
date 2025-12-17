import requests
import json

# Backend URL
BASE_URL = "https://trading-rebuild.preview.emergentagent.com/api"

# Register admin user
print("Creating admin account...")
register_data = {
    "email": "gads21083@gmail.com",
    "password": "1231123",
    "full_name": "Coin Hub X Admin"
}

try:
    response = requests.post(f"{BASE_URL}/auth/register", json=register_data, timeout=10)
    print(f"Registration response: {response.status_code}")
    print(response.json())
except Exception as e:
    print(f"Registration result: {e}")
    print("(User may already exist - this is fine)")

# Now test admin login
print("\nTesting admin login...")
admin_login_data = {
    "email": "gads21083@gmail.com",
    "password": "1231123",
    "admin_code": "CRYPTOLEND_ADMIN_2025"
}

try:
    response = requests.post(f"{BASE_URL}/admin/login", json=admin_login_data, timeout=10)
    print(f"Admin login response: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))
    
    if result.get("success"):
        print("\n✅ ADMIN ACCOUNT READY!")
        print(f"Email: gads21083@gmail.com")
        print(f"Password: 1231123")
        print(f"Admin Code: CRYPTOLEND_ADMIN_2025")
        print(f"Admin URL: https://trading-rebuild.preview.emergentagent.com/admin/login")
except Exception as e:
    print(f"Error: {e}")

