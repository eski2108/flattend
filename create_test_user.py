#!/usr/bin/env python3
"""
Create test user with crypto holdings for Portfolio Dashboard testing
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid
import bcrypt

# Load environment variables
load_dotenv('backend/.env')
mongo_url = os.environ.get('MONGO_URL')

async def create_test_user():
    """Create test user with crypto holdings"""
    client = AsyncIOMotorClient(mongo_url)
    db = client.cryptobank
    
    # Test user data
    user_id = "test-user-123"
    email = "test@example.com"
    
    # Create user if doesn't exist
    existing_user = await db.users.find_one({"user_id": user_id})
    if not existing_user:
        # Hash password
        password_hash = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        
        user_doc = {
            "user_id": user_id,
            "email": email,
            "first_name": "Test",
            "last_name": "User",
            "password_hash": password_hash.decode('utf-8'),
            "is_verified": True,
            "created_at": datetime.now(timezone.utc),
            "referral_code": "HZZCUVHF"
        }
        await db.users.insert_one(user_doc)
        print(f"✅ Created user: {email}")
    
    # Create wallet balances as mentioned in the request:
    # £3,907 GBP, 0.003 BTC, 0.2 ETH, 1 SOL, 10 XRP
    
    holdings = [
        {"currency": "GBP", "available_balance": 3907.0, "locked_balance": 0.0, "total_balance": 3907.0},
        {"currency": "BTC", "available_balance": 0.003, "locked_balance": 0.0, "total_balance": 0.003},
        {"currency": "ETH", "available_balance": 0.2, "locked_balance": 0.0, "total_balance": 0.2},
        {"currency": "SOL", "available_balance": 1.0, "locked_balance": 0.0, "total_balance": 1.0},
        {"currency": "XRP", "available_balance": 10.0, "locked_balance": 0.0, "total_balance": 10.0}
    ]
    
    # Clear existing wallets for this user
    await db.wallets.delete_many({"user_id": user_id})
    
    # Insert wallet balances
    for holding in holdings:
        wallet_doc = {
            "user_id": user_id,
            "currency": holding["currency"],
            "available_balance": holding["available_balance"],
            "locked_balance": holding["locked_balance"],
            "total_balance": holding["total_balance"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.wallets.insert_one(wallet_doc)
        print(f"✅ Created wallet: {holding['currency']} = {holding['total_balance']}")
    
    # Also create some transaction history for P/L calculation
    transactions = [
        {
            "user_id": user_id,
            "transaction_id": str(uuid.uuid4()),
            "type": "deposit",
            "currency": "GBP",
            "amount": 4000.0,
            "amount_gbp": 4000.0,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "user_id": user_id,
            "transaction_id": str(uuid.uuid4()),
            "type": "buy",
            "currency": "BTC",
            "amount": 0.003,
            "amount_gbp": 93.0,  # Spent £93 on BTC
            "status": "completed",
            "timestamp": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing transactions
    await db.transactions.delete_many({"user_id": user_id})
    
    # Insert transactions
    for tx in transactions:
        await db.transactions.insert_one(tx)
        print(f"✅ Created transaction: {tx['type']} {tx['amount']} {tx['currency']}")
    
    print(f"\n🎉 Test user created successfully!")
    print(f"User ID: {user_id}")
    print(f"Email: {email}")
    print(f"Password: password123")
    print(f"Referral Code: HZZCUVHF")
    print(f"\nHoldings:")
    for holding in holdings:
        print(f"  {holding['currency']}: {holding['total_balance']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
