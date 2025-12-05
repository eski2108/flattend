#!/usr/bin/env python3
"""MongoDB Atlas Connection Tester

Use this script to verify your MongoDB Atlas connection works before deploying.
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def test_connection(mongo_url, db_name="coinhubx_production"):
    print("\n" + "="*70)
    print("🔍 TESTING MONGODB ATLAS CONNECTION")
    print("="*70)
    
    # Validate URL format
    if not mongo_url or mongo_url == "mongodb://localhost:27017":
        print("\n❌ ERROR: Still using local database!")
        print("   MONGO_URL: mongodb://localhost:27017")
        print("\n⚠️  This is the preview database. Production needs MongoDB Atlas.")
        print("\n📋 Next Steps:")
        print("   1. Create MongoDB Atlas account: https://www.mongodb.com/cloud/atlas/register")
        print("   2. Get your connection string")
        print("   3. Run this script again with: python test_mongodb_atlas_connection.py 'mongodb+srv://...'")
        return False
    
    if not mongo_url.startswith("mongodb+srv://"):
        print("\n⚠️  WARNING: URL doesn't look like MongoDB Atlas")
        print(f"   Your URL: {mongo_url[:50]}...")
        print("   Expected format: mongodb+srv://...")
        print("\n   Continue anyway? [y/N]: ", end="")
        
    print(f"\n📡 Connecting to: {mongo_url[:50]}...")
    print(f"📊 Database: {db_name}")
    
    try:
        # Create client
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        
        # Test connection
        print("\n⏳ Testing connection...")
        await client.admin.command('ping')
        print("✅ Connection successful!")
        
        # Get database
        db = client[db_name]
        
        # Create test document
        print("\n⏳ Writing test document...")
        test_collection = db.connection_test
        test_doc = {
            "test": "MongoDB Atlas Connection Test",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success"
        }
        result = await test_collection.insert_one(test_doc)
        print(f"✅ Test document created with ID: {result.inserted_id}")
        
        # Read test document
        print("\n⏳ Reading test document...")
        retrieved = await test_collection.find_one({"_id": result.inserted_id})
        if retrieved:
            print("✅ Test document retrieved successfully")
            print(f"   Timestamp: {retrieved['timestamp']}")
        
        # Clean up
        print("\n⏳ Cleaning up test document...")
        await test_collection.delete_one({"_id": result.inserted_id})
        print("✅ Test document deleted")
        
        # Get cluster info
        print("\n📊 Cluster Information:")
        db_list = await client.list_database_names()
        print(f"   Available databases: {', '.join(db_list)}")
        
        # Close connection
        client.close()
        
        print("\n" + "="*70)
        print("🎉 SUCCESS! MongoDB Atlas connection is working perfectly")
        print("="*70)
        print("\n✅ Your production database is ready!")
        print("✅ Data will be stored on MongoDB Atlas")
        print("✅ Protected from preview resets")
        print("✅ Safe to deploy to production")
        print("\n" + "="*70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("   1. Check your connection string is correct")
        print("   2. Verify password doesn't have special characters that need URL encoding")
        print("   3. Ensure Network Access is set to 0.0.0.0/0 in MongoDB Atlas")
        print("   4. Verify database user has 'Read and write to any database' permission")
        print("   5. Check cluster is not paused in MongoDB Atlas")
        print("\n📚 Full guide: /app/PRODUCTION_DATABASE_SETUP.md")
        return False

if __name__ == "__main__":
    print("\n🔐 MongoDB Atlas Connection Tester for CoinHubX")
    
    if len(sys.argv) > 1:
        # Connection string provided as argument
        mongo_url = sys.argv[1]
    else:
        # Prompt for connection string
        print("\nEnter your MongoDB Atlas connection string:")
        print("(Format: mongodb+srv://username:password@cluster.mongodb.net/)")
        print("\nConnection string: ", end="")
        mongo_url = input().strip()
    
    # Run test
    success = asyncio.run(test_connection(mongo_url))
    
    sys.exit(0 if success else 1)
