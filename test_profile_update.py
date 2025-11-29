#!/usr/bin/env python3
"""
Test script for the profile update functionality
"""
import asyncio
import requests
import json
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

BACKEND_URL = "http://localhost:8001"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def test_profile_update():
    """Test the complete profile update flow"""
    print("🧪 Testing Profile Update Functionality")
    print("=" * 50)
    
    # Connect to database
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # 1. Create a test user
        test_user_id = str(uuid.uuid4())
        test_user = {
            'user_id': test_user_id,
            'email': 'profile_test@example.com',
            'full_name': 'Original Name',
            'role': 'user',
            'created_at': '2025-11-29T11:00:00.000000'
        }
        
        await db.user_accounts.insert_one(test_user)
        print(f"✅ Created test user: {test_user_id}")
        print(f"   Original name: {test_user['full_name']}")
        
        # 2. Test the profile update API
        update_data = {
            'user_id': test_user_id,
            'full_name': 'Updated Profile Name'
        }
        
        response = requests.put(
            f"{BACKEND_URL}/api/user/profile",
            headers={'Content-Type': 'application/json'},
            json=update_data
        )
        
        print(f"\n📡 API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Profile update successful!")
            print(f"   Updated name: {result['user']['full_name']}")
            
            # 3. Verify the update in database
            updated_user = await db.user_accounts.find_one(
                {'user_id': test_user_id}, 
                {'_id': 0}
            )
            
            if updated_user and updated_user['full_name'] == 'Updated Profile Name':
                print("✅ Database verification successful!")
                print(f"   Database name: {updated_user['full_name']}")
            else:
                print("❌ Database verification failed!")
                print(f"   Expected: Updated Profile Name")
                print(f"   Got: {updated_user.get('full_name', 'None')}")
        else:
            print(f"❌ Profile update failed!")
            print(f"   Response: {response.text}")
        
        # 4. Test error cases
        print(f"\n🧪 Testing error cases...")
        
        # Test with non-existent user
        error_response = requests.put(
            f"{BACKEND_URL}/api/user/profile",
            headers={'Content-Type': 'application/json'},
            json={'user_id': 'non-existent-id', 'full_name': 'Test'}
        )
        
        if error_response.status_code == 404:
            print("✅ Non-existent user error handling works")
        else:
            print(f"❌ Expected 404, got {error_response.status_code}")
        
        # Test with missing user_id
        error_response2 = requests.put(
            f"{BACKEND_URL}/api/user/profile",
            headers={'Content-Type': 'application/json'},
            json={'full_name': 'Test'}
        )
        
        if error_response2.status_code == 400:
            print("✅ Missing user_id error handling works")
        else:
            print(f"❌ Expected 400, got {error_response2.status_code}")
        
        # 5. Cleanup
        await db.user_accounts.delete_one({'user_id': test_user_id})
        print(f"\n🧹 Cleaned up test user")
        
        print(f"\n🎉 Profile update functionality test completed!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_profile_update())