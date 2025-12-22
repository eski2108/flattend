#!/usr/bin/env python3
"""
P2P LIVE END-TO-END TEST V2
===========================
With proper idempotency headers
"""

import asyncio
import os
import sys
import uuid
import httpx
from datetime import datetime, timezone

sys.path.insert(0, '/app/backend')

API_URL = "https://i18n-p2p-fixes.preview.emergentagent.com"

async def run_test():
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db_name = os.environ.get('DB_NAME', 'coinhubx_production')
    db = client[db_name]
    
    print("=" * 70)
    print("P2P LIVE END-TO-END TEST V2")
    print("=" * 70)
    
    # Create test users
    buyer_id = f"test_buyer_{uuid.uuid4().hex[:8]}"
    seller_id = f"test_seller_{uuid.uuid4().hex[:8]}"
    
    print(f"Buyer ID: {buyer_id}")
    print(f"Seller ID: {seller_id}")
    
    # Create users
    await db.users.insert_one({
        "user_id": buyer_id,
        "email": f"{buyer_id}@test.com",
        "full_name": "Test Buyer",
        "password_hash": "test",
        "wallets": {"BTC": 0.0},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.users.insert_one({
        "user_id": seller_id,
        "email": f"{seller_id}@test.com",
        "full_name": "Test Seller",
        "password_hash": "test",
        "wallets": {"BTC": 1.0},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create wallets
    await db.wallets.insert_one({
        "wallet_id": str(uuid.uuid4()),
        "user_id": seller_id,
        "currency": "BTC",
        "available_balance": 1.0,
        "locked_balance": 0.0,
        "total_balance": 1.0
    })
    
    await db.wallets.insert_one({
        "wallet_id": str(uuid.uuid4()),
        "user_id": buyer_id,
        "currency": "BTC",
        "available_balance": 0.0,
        "locked_balance": 0.0,
        "total_balance": 0.0
    })
    
    print("✅ Test users created\n")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP A: INITIAL BALANCES
    # ═══════════════════════════════════════════════════════════════
    print("=" * 70)
    print("STEP A: INITIAL BALANCES")
    print("=" * 70)
    
    seller_wallet = await db.wallets.find_one({"user_id": seller_id, "currency": "BTC"})
    buyer_wallet = await db.wallets.find_one({"user_id": buyer_id, "currency": "BTC"})
    
    print(f"SELLER: available={seller_wallet['available_balance']} locked={seller_wallet['locked_balance']}")
    print(f"BUYER:  available={buyer_wallet['available_balance']}")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP B: CREATE TRADE & LOCK ESCROW
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP B: CREATE TRADE (Escrow Lock)")
    print("=" * 70)
    
    trade_id = f"trade_{uuid.uuid4().hex[:8]}"
    crypto_amount = 0.1
    
    # Create trade
    await db.p2p_trades.insert_one({
        "trade_id": trade_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": crypto_amount,
        "fiat_currency": "GBP",
        "fiat_amount": 5000.0,
        "status": "pending_payment",
        "escrow_locked": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Lock escrow
    await db.wallets.update_one(
        {"user_id": seller_id, "currency": "BTC"},
        {"$inc": {"available_balance": -crypto_amount, "locked_balance": crypto_amount}}
    )
    
    seller_wallet = await db.wallets.find_one({"user_id": seller_id, "currency": "BTC"})
    print(f"Trade ID: {trade_id}")
    print(f"SELLER after lock: available={seller_wallet['available_balance']} locked={seller_wallet['locked_balance']}")
    print("✅ Escrow locked")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP C: BUYER MARKS AS PAID (with idempotency key)
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP C: BUYER MARKS AS PAID")
    print("=" * 70)
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        response = await http.post(
            f"{API_URL}/api/p2p/trade/mark-paid",
            json={"trade_id": trade_id, "user_id": buyer_id},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"API: POST /api/p2p/trade/mark-paid")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    print(f"DB trade status: {trade['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP D: SELLER RELEASES CRYPTO
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP D: SELLER RELEASES CRYPTO")
    print("=" * 70)
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        response = await http.post(
            f"{API_URL}/api/p2p/trade/release",
            json={"trade_id": trade_id, "user_id": seller_id},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"API: POST /api/p2p/trade/release")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    
    # Check final balances
    seller_wallet = await db.wallets.find_one({"user_id": seller_id, "currency": "BTC"})
    buyer_wallet = await db.wallets.find_one({"user_id": buyer_id, "currency": "BTC"})
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    
    print(f"\nFINAL BALANCES:")
    print(f"SELLER: available={seller_wallet['available_balance']} locked={seller_wallet['locked_balance']}")
    print(f"BUYER:  available={buyer_wallet['available_balance']}")
    print(f"Trade status: {trade['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP E: DISPUTE TEST
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP E: DISPUTE FLOW")
    print("=" * 70)
    
    dispute_trade_id = f"trade_{uuid.uuid4().hex[:8]}"
    
    await db.p2p_trades.insert_one({
        "trade_id": dispute_trade_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.05,
        "fiat_currency": "GBP",
        "fiat_amount": 2500.0,
        "status": "pending_payment",
        "escrow_locked": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        response = await http.post(
            f"{API_URL}/api/p2p/trade/dispute",
            json={
                "trade_id": dispute_trade_id,
                "user_id": buyer_id,
                "reason": "Seller not responding"
            },
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"API: POST /api/p2p/trade/dispute")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    
    dispute_trade = await db.p2p_trades.find_one({"trade_id": dispute_trade_id})
    dispute_record = await db.p2p_disputes.find_one({"trade_id": dispute_trade_id})
    
    print(f"\nTrade status: {dispute_trade['status']}")
    print(f"Dispute record exists: {dispute_record is not None}")
    if dispute_record:
        print(f"Dispute ID: {dispute_record.get('dispute_id', 'N/A')}")
    
    # ═══════════════════════════════════════════════════════════════
    # CLEANUP
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("CLEANUP")
    print("=" * 70)
    
    await db.users.delete_many({"user_id": {"$in": [buyer_id, seller_id]}})
    await db.wallets.delete_many({"user_id": {"$in": [buyer_id, seller_id]}})
    await db.p2p_trades.delete_many({"trade_id": {"$in": [trade_id, dispute_trade_id]}})
    await db.p2p_disputes.delete_many({"trade_id": dispute_trade_id})
    print("✅ Test data cleaned up")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run_test())
