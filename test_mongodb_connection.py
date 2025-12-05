#!/usr/bin/env python3
"""
Test MongoDB Connection
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def test_mongodb_connection():
    """Test MongoDB connection"""
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    print(f"Testing MongoDB connection...")
    print(f"Database: {db_name}")
    print(f"Connection string: {mongo_url[:50]}...")
    print()
    
    try:
        # Create client
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Test connection
        print("Attempting to connect...")
        server_info = await client.server_info()
        print(f"✅ Connected successfully!")
        print(f"MongoDB version: {server_info.get('version', 'Unknown')}")
        
        # Test database access
        print("\nTesting database access...")
        collections = await db.list_collection_names()
        print(f"✅ Database accessible, found {len(collections)} collections")
        
        # Test a simple query
        print("\nTesting query...")
        count = await db.user_accounts.count_documents({})
        print(f"✅ Query successful, found {count} user accounts")
        
        await client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {str(e)}")
        return False

async def main():
    success = await test_mongodb_connection()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)