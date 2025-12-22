#!/usr/bin/env python3
"""
Initialize Admin Wallets for Fee Collection
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
import uuid

sys.path.insert(0, '/app/backend')

async def init_admin_wallets():
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.coinhubx
    
    print("Initializing admin wallets for P2P fee collection...")
    
    # 1. Initialize PLATFORM_TREASURY_WALLET in internal_balances
    currencies = ["GBP", "BTC", "ETH", "USDT"]
    
    for currency in currencies:
        existing = await db.internal_balances.find_one({
            "user_id": "PLATFORM_TREASURY_WALLET",
            "currency": currency
        })
        
        if not existing:
            await db.internal_balances.insert_one({
                "balance_id": str(uuid.uuid4()),
                "user_id": "PLATFORM_TREASURY_WALLET",
                "currency": currency,
                "balance": 0.0,
                "locked_balance": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"✅ Created PLATFORM_TREASURY_WALLET for {currency}")
        else:
            print(f"✓ PLATFORM_TREASURY_WALLET for {currency} already exists")
    
    # 2. Initialize admin_wallet in wallets collection
    for currency in currencies:
        existing = await db.wallets.find_one({
            "user_id": "admin_wallet",
            "currency": currency
        })
        
        if not existing:
            await db.wallets.insert_one({
                "wallet_id": str(uuid.uuid4()),
                "user_id": "admin_wallet",
                "currency": currency,
                "available_balance": 0.0,
                "locked_balance": 0.0,
                "total_balance": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"✅ Created admin_wallet for {currency}")
        else:
            print(f"✓ admin_wallet for {currency} already exists")
    
    # 3. Initialize PLATFORM_FEES in internal_balances
    for currency in currencies:
        existing = await db.internal_balances.find_one({
            "user_id": "PLATFORM_FEES",
            "currency": currency
        })
        
        if not existing:
            await db.internal_balances.insert_one({
                "balance_id": str(uuid.uuid4()),
                "user_id": "PLATFORM_FEES",
                "currency": currency,
                "balance": 0.0,
                "locked_balance": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"✅ Created PLATFORM_FEES for {currency}")
        else:
            print(f"✓ PLATFORM_FEES for {currency} already exists")
    
    print("\n✅ Admin wallets initialized successfully!")
    print("\nFee collection targets:")
    print("  - Maker Fee (crypto) → PLATFORM_TREASURY_WALLET")
    print("  - Taker Fee (fiat) → admin_wallet")
    print("  - Express Fee (fiat) → PLATFORM_FEES")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_admin_wallets())
