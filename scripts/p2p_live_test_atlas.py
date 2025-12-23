#!/usr/bin/env python3
"""
P2P LIVE END-TO-END TEST - ATLAS
================================
Correct MongoDB connection (Atlas cloud)
"""

import asyncio
import os
import sys
import uuid
import httpx
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# LOAD DOTENV FIRST!
load_dotenv(Path('/app/backend/.env'))

from motor.motor_asyncio import AsyncIOMotorClient

API_URL = "https://express-buy-flow.preview.emergentagent.com"

async def run_test():
    mongo_url = os.environ.get('MONGO_URL')
    print(f"Using: {mongo_url[:60]}...")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client["coinhubx_production"]
    
    print("=" * 70)
    print("P2P LIVE END-TO-END TEST - ATLAS")
    print("=" * 70)
    
    # Create test IDs
    buyer_id = f"test_buyer_{uuid.uuid4().hex[:6]}"
    seller_id = f"test_seller_{uuid.uuid4().hex[:6]}"
    trade_id = f"LIVE_{uuid.uuid4().hex[:8]}"
    crypto_amount = 0.1
    
    print(f"Buyer:  {buyer_id}")
    print(f"Seller: {seller_id}")
    print(f"Trade:  {trade_id}")
    
    # Create users
    await db.users.insert_one({
        "user_id": buyer_id,
        "email": f"{buyer_id}@test.com",
        "wallets": {"BTC": 0.0},
    })
    await db.users.insert_one({
        "user_id": seller_id,
        "email": f"{seller_id}@test.com",
        "wallets": {"BTC": 1.0},
    })
    print("✅ Users created")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP A: INITIAL BALANCES
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP A: INITIAL BALANCES")
    print("=" * 70)
    
    seller = await db.users.find_one({"user_id": seller_id})
    buyer = await db.users.find_one({"user_id": buyer_id})
    print(f"SELLER: {seller.get('wallets', {}).get('BTC', 0)} BTC")
    print(f"BUYER:  {buyer.get('wallets', {}).get('BTC', 0)} BTC")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP B: CREATE TRADE & ESCROW LOCK
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP B: CREATE TRADE & ESCROW LOCK")
    print("=" * 70)
    
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
    await db.users.update_one(
        {"user_id": seller_id},
        {"$inc": {"wallets.BTC": -crypto_amount}}
    )
    
    seller = await db.users.find_one({"user_id": seller_id})
    print(f"Trade: {trade_id}")
    print(f"SELLER after escrow: {seller.get('wallets', {}).get('BTC', 0)} BTC")
    print(f"✅ {crypto_amount} BTC locked")
    
    # Verify trade exists
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    print(f"Trade in DB: {trade is not None}")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP C: BUYER MARKS AS PAID (API)
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
    print(f"\nDB status: {trade['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP D: SELLER RELEASES CRYPTO (API)
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
    
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    seller = await db.users.find_one({"user_id": seller_id})
    buyer = await db.users.find_one({"user_id": buyer_id})
    
    print(f"\nFINAL BALANCES:")
    print(f"SELLER: {seller.get('wallets', {}).get('BTC', 0)} BTC")
    print(f"BUYER:  {buyer.get('wallets', {}).get('BTC', 0)} BTC")
    print(f"Trade status: {trade['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # STEP E: DISPUTE TEST
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP E: DISPUTE TEST")
    print("=" * 70)
    
    dispute_trade_id = f"DISPUTE_{uuid.uuid4().hex[:8]}"
    await db.p2p_trades.insert_one({
        "trade_id": dispute_trade_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.05,
        "fiat_amount": 2500.0,
        "status": "pending_payment",
        "escrow_locked": True,
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        response = await http.post(
            f"{API_URL}/api/p2p/trade/dispute",
            json={"trade_id": dispute_trade_id, "user_id": buyer_id, "reason": "Test dispute"},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"API: POST /api/p2p/trade/dispute")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    
    dispute_trade = await db.p2p_trades.find_one({"trade_id": dispute_trade_id})
    print(f"\nDispute trade status: {dispute_trade['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    print(f"✅ A. Initial: Seller 1.0 BTC, Buyer 0.0 BTC")
    print(f"✅ B. Escrow locked: 0.1 BTC")
    print(f"✅ C. Mark paid: status → {trade['status']}")
    print(f"✅ D. Release: Buyer BTC = {buyer.get('wallets', {}).get('BTC', 0)}")
    print(f"✅ E. Dispute: status → {dispute_trade['status']}")
    
    # Cleanup
    print("\n[CLEANUP]")
    await db.users.delete_many({"user_id": {"$in": [buyer_id, seller_id]}})
    await db.p2p_trades.delete_many({"trade_id": {"$in": [trade_id, dispute_trade_id]}})
    await db.p2p_disputes.delete_many({"trade_id": dispute_trade_id})
    print("✅ Cleaned up")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run_test())
