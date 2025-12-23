#!/usr/bin/env python3
"""
P2P COMPLETE TEST V2 - ALL ENDPOINTS
====================================
Fixed: Form data for message endpoint
"""

import asyncio
import os
import sys
import uuid
import httpx
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('/app/backend/.env'))

from motor.motor_asyncio import AsyncIOMotorClient

API_URL = "https://peer-listings.preview.emergentagent.com"

async def run_test():
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client["coinhubx_production"]
    
    print("=" * 70)
    print("P2P COMPLETE TEST V2 - ALL ENDPOINTS")
    print("=" * 70)
    
    buyer_id = f"buyer_{uuid.uuid4().hex[:6]}"
    seller_id = f"seller_{uuid.uuid4().hex[:6]}"
    
    await db.users.insert_one({"user_id": buyer_id, "email": f"{buyer_id}@test.com", "wallets": {"BTC": 0.5}})
    await db.users.insert_one({"user_id": seller_id, "email": f"{seller_id}@test.com", "wallets": {"BTC": 1.0}})
    
    trade_ids = []
    results = {}
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 1: MARK AS PAID + RELEASE
    # ═══════════════════════════════════════════════════════════════
    print("\n[TEST 1] MARK AS PAID + RELEASE")
    trade_id_1 = f"T1_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_1)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_1, "buyer_id": buyer_id, "seller_id": seller_id,
        "crypto_currency": "BTC", "crypto_amount": 0.1, "fiat_amount": 5000.0,
        "status": "pending_payment", "escrow_locked": True,
    })
    await db.users.update_one({"user_id": seller_id}, {"$inc": {"wallets.BTC": -0.1}})
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        r1 = await http.post(f"{API_URL}/api/p2p/trade/mark-paid",
            json={"trade_id": trade_id_1, "user_id": buyer_id},
            headers={"Idempotency-Key": str(uuid.uuid4())})
        r2 = await http.post(f"{API_URL}/api/p2p/trade/release",
            json={"trade_id": trade_id_1, "user_id": seller_id},
            headers={"Idempotency-Key": str(uuid.uuid4())})
    
    t1 = await db.p2p_trades.find_one({"trade_id": trade_id_1})
    results["Mark Paid"] = r1.status_code == 200
    results["Release"] = r2.status_code == 200 and t1['status'] == 'completed'
    print(f"  Mark Paid: {r1.status_code} | Release: {r2.status_code} | Status: {t1['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 2: CANCEL ORDER
    # ═══════════════════════════════════════════════════════════════
    print("\n[TEST 2] CANCEL ORDER")
    trade_id_2 = f"T2_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_2)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_2, "buyer_id": buyer_id, "seller_id": seller_id,
        "crypto_currency": "BTC", "crypto_amount": 0.05, "fiat_amount": 2500.0,
        "status": "pending_payment", "escrow_locked": True,
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(f"{API_URL}/api/p2p/trade/cancel",
            json={"trade_id": trade_id_2, "user_id": buyer_id},
            headers={"Idempotency-Key": str(uuid.uuid4())})
    
    t2 = await db.p2p_trades.find_one({"trade_id": trade_id_2})
    results["Cancel"] = r.status_code == 200 and t2['status'] == 'cancelled'
    print(f"  Cancel: {r.status_code} | Status: {t2['status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 3: DISPUTE
    # ═══════════════════════════════════════════════════════════════
    print("\n[TEST 3] DISPUTE")
    trade_id_3 = f"T3_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_3)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_3, "buyer_id": buyer_id, "seller_id": seller_id,
        "crypto_currency": "BTC", "crypto_amount": 0.02, "fiat_amount": 1000.0,
        "status": "pending_payment", "escrow_locked": True,
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(f"{API_URL}/api/p2p/trade/dispute",
            json={"trade_id": trade_id_3, "user_id": buyer_id, "reason": "Test dispute"},
            headers={"Idempotency-Key": str(uuid.uuid4())})
    
    t3 = await db.p2p_trades.find_one({"trade_id": trade_id_3})
    d3 = await db.p2p_disputes.find_one({"trade_id": trade_id_3})
    results["Dispute"] = t3['status'] == 'disputed' and d3 is not None
    print(f"  Dispute: {r.status_code} | Status: {t3['status']} | Dispute record: {d3 is not None}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 4: UPLOAD PROOF (Form data)
    # ═══════════════════════════════════════════════════════════════
    print("\n[TEST 4] UPLOAD PAYMENT PROOF (Form data)")
    trade_id_4 = f"T4_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_4)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_4, "buyer_id": buyer_id, "seller_id": seller_id,
        "crypto_currency": "BTC", "crypto_amount": 0.03, "fiat_amount": 1500.0,
        "status": "pending_payment", "escrow_locked": True,
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        # Use form data, not JSON
        r = await http.post(f"{API_URL}/api/p2p/trade/message",
            data={
                "trade_id": trade_id_4,
                "sender_id": buyer_id,
                "message": "Payment proof: Bank transfer ref #12345"
            },
            headers={"Idempotency-Key": str(uuid.uuid4())})
    
    # Check p2p_trade_messages (correct collection)
    msg = await db.p2p_trade_messages.find_one({"trade_id": trade_id_4})
    results["Upload Proof"] = r.status_code == 200 and msg is not None
    print(f"  Message: {r.status_code} | Stored: {msg is not None}")
    if msg:
        print(f"  Content: {msg.get('message', '')[:50]}...")
    
    # ═══════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("FINAL RESULTS")
    print("=" * 70)
    
    for test, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test}: {status}")
    
    all_passed = all(results.values())
    print(f"\n{'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    
    # Cleanup
    print("\n[CLEANUP]")
    await db.users.delete_many({"user_id": {"$in": [buyer_id, seller_id]}})
    await db.p2p_trades.delete_many({"trade_id": {"$in": trade_ids}})
    await db.p2p_disputes.delete_many({"trade_id": {"$in": trade_ids}})
    await db.p2p_trade_messages.delete_many({"trade_id": {"$in": trade_ids}})
    print("✅ Done")
    
    client.close()
    return all_passed

if __name__ == "__main__":
    result = asyncio.run(run_test())
    sys.exit(0 if result else 1)
