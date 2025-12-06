#!/usr/bin/env python3
"""
MongoDB Atlas Connection Tester for CoinHubX

Usage:
    python3 test_atlas_connection.py "your-connection-string-here"

Example:
    python3 test_atlas_connection.py "mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
"""

import sys
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_connection(mongo_url):
    print("\n" + "="*60)
    print("MongoDB Atlas Connection Test")
    print("="*60)
    print(f"\nConnection String: {mongo_url[:50]}...")
    print("\nTesting connection...\n")
    
    try:
        # Create client with 10 second timeout
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
        
        # Test ping
        print("⏳ Attempting to connect...")
        await client.admin.command('ping')
        print("✅ SUCCESS: Connected to MongoDB Atlas!\n")
        
        # List databases
        print("📊 Fetching databases...")
        dbs = await client.list_database_names()
        print(f"\nAvailable databases ({len(dbs)}):")
        for db in dbs:
            print(f"  - {db}")
        
        # Check for CoinHubX databases
        print("\n" + "-"*60)
        print("Checking for CoinHubX data...")
        print("-"*60)
        
        for db_name in ['cryptobank', 'coinhubx_production', 'coinhubx']:
            if db_name in dbs:
                print(f"\n✅ Found database: {db_name}")
                db = client[db_name]
                
                # Get collections
                collections = await db.list_collection_names()
                print(f"\n   Collections ({len(collections)}):")
                for col in sorted(collections):
                    count = await db[col].count_documents({})
                    print(f"     - {col}: {count} documents")
                
                # Check critical collections
                print("\n   Critical Data Check:")
                
                if 'users' in collections:
                    user_count = await db.users.count_documents({})
                    print(f"     ✅ Users: {user_count}")
                    
                    # Check for admin user
                    admin = await db.users.find_one({'email': 'admin@coinhubx.net'}, {'email': 1, 'user_id': 1})
                    if admin:
                        print(f"     ✅ Admin user found: {admin.get('email')}")
                    else:
                        print("     ⚠️  Admin user (admin@coinhubx.net) NOT found")
                else:
                    print("     ❌ Users collection NOT found")
                
                if 'supported_coins' in collections:
                    coin_count = await db.supported_coins.count_documents({'enabled': True})
                    print(f"     ✅ Enabled coins: {coin_count}")
                else:
                    print("     ❌ Supported coins collection NOT found")
                
                if 'admin_liquidity_wallets' in collections:
                    liquidity_count = await db.admin_liquidity_wallets.count_documents({})
                    print(f"     ✅ Liquidity wallets: {liquidity_count}")
                else:
                    print("     ❌ Admin liquidity wallets NOT found")
                
                if 'internal_balances' in collections:
                    balance_count = await db.internal_balances.count_documents({})
                    print(f"     ✅ Internal balances: {balance_count}")
                else:
                    print("     ❌ Internal balances collection NOT found")
        
        # If no CoinHubX databases found
        if not any(db in dbs for db in ['cryptobank', 'coinhubx_production', 'coinhubx']):
            print("\n⚠️  WARNING: No CoinHubX databases found!")
            print("   Expected: 'cryptobank' or 'coinhubx_production'")
            print("   This might be an empty cluster or wrong cluster.")
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ CONNECTION TEST COMPLETED SUCCESSFULLY")
        print("="*60)
        print("\nNext steps:")
        print("1. Update /app/backend/.env with this connection string")
        print("2. Set DB_NAME to the database name that has your data")
        print("3. Restart backend: sudo supervisorctl restart backend")
        print("\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED: {str(e)}\n")
        print("-"*60)
        print("Common Issues & Solutions:")
        print("-"*60)
        print("\n1. SERVER IP NOT WHITELISTED")
        print("   Solution: Add IP 34.16.56.64 to Atlas Network Access")
        print("   https://cloud.mongodb.com/ > Network Access > Add IP")
        
        print("\n2. WRONG PASSWORD")
        print("   Solution: Get fresh connection string from Atlas")
        print("   Click 'Connect' > 'Connect your application' > Copy string")
        
        print("\n3. WRONG CLUSTER")
        print("   Solution: Try the other cluster if you have multiple")
        
        print("\n4. FIREWALL BLOCKING")
        print("   Solution: Test with: nc -zv <cluster-url> 27017")
        
        print("\n5. SSL/TLS ERROR")
        print("   Solution: Remove 'tlsAllowInvalidCertificates' from URL")
        
        print("\n" + "="*60)
        print("❌ TEST FAILED - Please fix issues above and retry")
        print("="*60 + "\n")
        
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\n❌ ERROR: Missing connection string")
        print("\nUsage:")
        print('  python3 test_atlas_connection.py "mongodb+srv://user:pass@cluster.mongodb.net/..."')
        print("\nExample:")
        print('  python3 test_atlas_connection.py "mongodb+srv://coinhubx:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"')
        print("\n")
        sys.exit(1)
    
    connection_string = sys.argv[1]
    
    # Basic validation
    if not connection_string.startswith("mongodb"):
        print("\n❌ ERROR: Invalid connection string")
        print("   Must start with 'mongodb://' or 'mongodb+srv://'")
        print("\n")
        sys.exit(1)
    
    success = asyncio.run(test_connection(connection_string))
    sys.exit(0 if success else 1)
