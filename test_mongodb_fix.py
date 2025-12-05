#!/usr/bin/env python3
"""
Test MongoDB Connection with TLS fixes
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def test_mongodb_with_tls_fix():
    """Test MongoDB connection with TLS fixes"""
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    print(f"Testing MongoDB connection with TLS fixes...")
    print(f"Database: {db_name}")
    print()
    
    # Try different connection configurations
    configs = [
        {
            "name": "Standard connection with explicit TLS",
            "params": {
                "tls": True,
                "tlsAllowInvalidCertificates": False
            }
        },
        {
            "name": "Connection with TLS and certificate validation disabled (testing only)",
            "params": {
                "tls": True,
                "tlsAllowInvalidCertificates": True
            }
        },
        {
            "name": "Connection with SSL parameter (legacy)",
            "params": {
                "ssl": True,
                "ssl_cert_reqs": None
            }
        },
        {
            "name": "Basic connection (no extra params)",
            "params": {}
        }
    ]
    
    for config in configs:
        print(f"Trying: {config['name']}")
        try:
            # Create client with specific parameters
            client = AsyncIOMotorClient(mongo_url, **config['params'])
            
            # Test connection with timeout
            server_info = await asyncio.wait_for(client.server_info(), timeout=10.0)
            print(f"✅ SUCCESS! Connected with {config['name']}")
            print(f"MongoDB version: {server_info.get('version', 'Unknown')}")
            
            # Test database access
            db = client[db_name]
            collections = await db.list_collection_names()
            print(f"✅ Database accessible, found {len(collections)} collections")
            
            await client.close()
            return True, config
            
        except asyncio.TimeoutError:
            print(f"❌ Timeout with {config['name']}")
        except Exception as e:
            print(f"❌ Failed with {config['name']}: {str(e)[:100]}...")
        
        print()
    
    return False, None

async def main():
    success, working_config = await test_mongodb_with_tls_fix()
    
    if success:
        print("=" * 60)
        print("✅ SOLUTION FOUND!")
        print(f"Working configuration: {working_config['name']}")
        print(f"Parameters: {working_config['params']}")
        print("=" * 60)
        return 0
    else:
        print("=" * 60)
        print("❌ NO WORKING CONFIGURATION FOUND")
        print("This appears to be a network/infrastructure issue")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)