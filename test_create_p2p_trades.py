#!/usr/bin/env python3
"""
Create test P2P trades in various statuses for UI testing
"""
import sys
import os
sys.path.append('/app/backend')

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import uuid

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'coinhubx')

async def create_test_trades():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    buyer_id = "test_buyer_123"
    seller_id = "test_seller_456"
    
    # Ensure users exist
    await db.users.update_one(
        {"user_id": buyer_id},
        {"$set": {
            "username": "TestBuyer",
            "email": "buyer@test.com",
            "wallets": {"BTC": 0, "ETH": 0, "GBP": 10000},
            "join_date": datetime.now()
        }},
        upsert=True
    )
    
    await db.users.update_one(
        {"user_id": seller_id},
        {"$set": {
            "username": "TestSeller",
            "email": "seller@test.com",
            "wallets": {"BTC": 10, "ETH": 50, "GBP": 0},
            "payment_methods": [{
                "name": "Bank Transfer",
                "bank_name": "Test Bank",
                "account_name": "Test Seller",
                "account_number": "12345678",
                "sort_code": "12-34-56",
                "notes": "Reference: P2P-TRADE"
            }],
            "join_date": datetime.now()
        }},
        upsert=True
    )
    
    trades = []
    
    # 1. PENDING_PAYMENT - Just created, waiting for buyer to pay
    trade1_id = str(uuid.uuid4())
    trade1 = {
        "trade_id": trade1_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.5,
        "fiat_amount": 25000.0,
        "price_per_unit": 50000.0,
        "status": "pending_payment",
        "escrow_locked": True,
        "seller_payment_details": {
            "bank_name": "Test Bank",
            "account_name": "Test Seller",
            "account_number": "12345678",
            "sort_code": "12-34-56",
            "notes": "Reference: " + trade1_id[:8]
        },
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(minutes=30),
        "payment_method": "Bank Transfer"
    }
    trades.append(trade1)
    
    # 2. PAYMENT_MADE - Buyer marked as paid, seller needs to release
    trade2_id = str(uuid.uuid4())
    trade2 = {
        "trade_id": trade2_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "ETH",
        "crypto_amount": 5.0,
        "fiat_amount": 10000.0,
        "price_per_unit": 2000.0,
        "status": "payment_made",
        "escrow_locked": True,
        "seller_payment_details": {
            "bank_name": "Test Bank",
            "account_name": "Test Seller",
            "account_number": "12345678",
            "sort_code": "12-34-56",
            "notes": "Reference: " + trade2_id[:8]
        },
        "created_at": datetime.now() - timedelta(minutes=10),
        "payment_marked_at": datetime.now() - timedelta(minutes=2),
        "expires_at": datetime.now() + timedelta(minutes=20),
        "payment_method": "Bank Transfer"
    }
    trades.append(trade2)
    
    # 3. COMPLETED - Successful trade
    trade3_id = str(uuid.uuid4())
    trade3 = {
        "trade_id": trade3_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.1,
        "fiat_amount": 5000.0,
        "price_per_unit": 50000.0,
        "status": "completed",
        "escrow_locked": False,
        "seller_payment_details": {
            "bank_name": "Test Bank",
            "account_name": "Test Seller",
            "account_number": "12345678",
            "sort_code": "12-34-56"
        },
        "created_at": datetime.now() - timedelta(hours=1),
        "payment_marked_at": datetime.now() - timedelta(minutes=50),
        "completed_at": datetime.now() - timedelta(minutes=45),
        "expires_at": datetime.now() + timedelta(minutes=30),
        "payment_method": "Bank Transfer"
    }
    trades.append(trade3)
    
    # 4. CANCELLED - Trade was cancelled
    trade4_id = str(uuid.uuid4())
    trade4 = {
        "trade_id": trade4_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "ETH",
        "crypto_amount": 2.0,
        "fiat_amount": 4000.0,
        "price_per_unit": 2000.0,
        "status": "cancelled",
        "escrow_locked": False,
        "cancelled_by": buyer_id,
        "cancelled_reason": "Changed my mind",
        "created_at": datetime.now() - timedelta(hours=2),
        "cancelled_at": datetime.now() - timedelta(hours=1, minutes=55),
        "expires_at": datetime.now() - timedelta(minutes=30),
        "payment_method": "Bank Transfer"
    }
    trades.append(trade4)
    
    # 5. DISPUTED - Trade in dispute
    trade5_id = str(uuid.uuid4())
    trade5 = {
        "trade_id": trade5_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.2,
        "fiat_amount": 10000.0,
        "price_per_unit": 50000.0,
        "status": "disputed",
        "escrow_locked": True,
        "seller_payment_details": {
            "bank_name": "Test Bank",
            "account_name": "Test Seller",
            "account_number": "12345678",
            "sort_code": "12-34-56"
        },
        "created_at": datetime.now() - timedelta(minutes=45),
        "payment_marked_at": datetime.now() - timedelta(minutes=30),
        "disputed_at": datetime.now() - timedelta(minutes=10),
        "dispute_reason": "Seller not responding",
        "expires_at": datetime.now() + timedelta(minutes=30),
        "payment_method": "Bank Transfer"
    }
    trades.append(trade5)
    
    # Insert all trades
    for trade in trades:
        result = await db.p2p_trades.update_one(
            {"trade_id": trade["trade_id"]},
            {"$set": trade},
            upsert=True
        )
        print(f"✅ Created {trade['status']} trade: {trade['trade_id']}")
    
    print("\n📋 Test Trade URLs:")
    print(f"1. Pending Payment: https://multilingual-crypto-2.preview.emergentagent.com/order/{trade1_id}")
    print(f"2. Payment Made: https://multilingual-crypto-2.preview.emergentagent.com/order/{trade2_id}")
    print(f"3. Completed: https://multilingual-crypto-2.preview.emergentagent.com/order/{trade3_id}")
    print(f"4. Cancelled: https://multilingual-crypto-2.preview.emergentagent.com/order/{trade4_id}")
    print(f"5. Disputed: https://multilingual-crypto-2.preview.emergentagent.com/order/{trade5_id}")
    
    # Save trade IDs to file for screenshot testing
    with open('/tmp/test_trade_ids.txt', 'w') as f:
        f.write(f"{trade1_id}\n{trade2_id}\n{trade3_id}\n{trade4_id}\n{trade5_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_trades())
