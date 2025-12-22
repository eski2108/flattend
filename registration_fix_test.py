#!/usr/bin/env python3
"""
Registration Fix Test - Testing with correct field names
"""

import asyncio
import aiohttp
import json
import sys
import time
from datetime import datetime, timezone

# Backend URL from frontend .env
BACKEND_URL = "https://balance-sync-repair.preview.emergentagent.com"

async def test_registration_fix():
    """Test registration with correct field names"""
    
    async with aiohttp.ClientSession() as session:
        # Test with correct field name: phone_number instead of phone
        correct_data = {
            "email": "testuser@test.com",
            "password": "TestPass123!",
            "full_name": "Test User",
            "phone_number": "+447700900000"
        }
        
        print("🔐 Testing Registration with CORRECT field names...")
        print(f"Data: {json.dumps(correct_data, indent=2)}")
        print()
        
        try:
            url = f"{BACKEND_URL}/api/auth/register"
            async with session.post(url, json=correct_data) as response:
                response_time = time.time()
                
                try:
                    data = await response.json()
                except:
                    data = await response.text()
                
                print(f"Status Code: {response.status}")
                print(f"Response: {json.dumps(data, indent=2)}")
                
                if response.status == 200:
                    print("✅ Registration SUCCESSFUL!")
                    return True
                elif response.status == 500:
                    print("❌ Internal Server Error - Backend issue")
                    return False
                else:
                    print(f"❌ Registration failed with status {response.status}")
                    return False
                    
        except Exception as e:
            print(f"❌ Request failed: {str(e)}")
            return False

async def main():
    result = await test_registration_fix()
    return 0 if result else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)