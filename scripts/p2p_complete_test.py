#!/usr/bin/env python3
"""
P2P COMPLETE TEST - ALL ENDPOINTS
=================================
Tests: Mark Paid, Release, Cancel, Upload Proof, Dispute
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

API_URL = "https://trade-form-polish.preview.emergentagent.com"

async def run_test():
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client["coinhubx_production"]
    
    print("=" * 70)
    print("P2P COMPLETE TEST - ALL ENDPOINTS")
    print("=" * 70)
    
    buyer_id = f"buyer_{uuid.uuid4().hex[:6]}"
    seller_id = f"seller_{uuid.uuid4().hex[:6]}"
    
    # Create users with email for notification test
    await db.users.insert_one({
        "user_id": buyer_id,
        "email": f"{buyer_id}@test.com",
        "wallets": {"BTC": 0.5},
    })
    await db.users.insert_one({
        "user_id": seller_id,
        "email": f"{seller_id}@test.com",
        "wallets": {"BTC": 1.0},
    })
    
    trade_ids = []
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 1: MARK AS PAID + RELEASE (Happy Path)
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("TEST 1: MARK AS PAID + RELEASE CRYPTO")
    print("=" * 70)
    
    trade_id_1 = f"TEST1_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_1)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_1,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.1,
        "fiat_amount": 5000.0,
        "status": "pending_payment",
        "escrow_locked": True,
    })
    await db.users.update_one({"user_id": seller_id}, {"$inc": {"wallets.BTC": -0.1}})
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        # Mark as paid
        r = await http.post(
            f"{API_URL}/api/p2p/trade/mark-paid",
            json={"trade_id": trade_id_1, "user_id": buyer_id},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"Mark Paid: {r.status_code} - {r.json()}")
        
        # Release
        r = await http.post(
            f"{API_URL}/api/p2p/trade/release",
            json={"trade_id": trade_id_1, "user_id": seller_id},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"Release:   {r.status_code} - {r.json()}")
    
    trade = await db.p2p_trades.find_one({"trade_id": trade_id_1})
    print(f"Final status: {trade['status']}")
    print(f"✅ TEST 1: {'PASS' if trade['status'] == 'completed' else 'FAIL'}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 2: CANCEL ORDER
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("TEST 2: CANCEL ORDER (Buyer cancels before payment)")
    print("=" * 70)
    
    trade_id_2 = f"TEST2_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_2)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_2,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.05,
        "fiat_amount": 2500.0,
        "status": "pending_payment",
        "escrow_locked": True,
    })
    
    seller_before = await db.users.find_one({"user_id": seller_id})
    print(f"Seller BTC before cancel: {seller_before.get('wallets', {}).get('BTC', 0)}")
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(
            f"{API_URL}/api/p2p/trade/cancel",
            json={"trade_id": trade_id_2, "user_id": buyer_id},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"Cancel: {r.status_code} - {r.json()}")
    
    trade = await db.p2p_trades.find_one({"trade_id": trade_id_2})
    seller_after = await db.users.find_one({"user_id": seller_id})
    
    print(f"Trade status: {trade['status']}")
    print(f"Seller BTC after cancel: {seller_after.get('wallets', {}).get('BTC', 0)}")
    print(f"✅ TEST 2: {'PASS' if trade['status'] == 'cancelled' else 'FAIL'}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 3: DISPUTE (with fixed email)
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("TEST 3: DISPUTE (with email fix)")
    print("=" * 70)
    
    trade_id_3 = f"TEST3_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_3)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_3,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.02,
        "fiat_amount": 1000.0,
        "status": "pending_payment",
        "escrow_locked": True,
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.post(
            f"{API_URL}/api/p2p/trade/dispute",
            json={"trade_id": trade_id_3, "user_id": buyer_id, "reason": "Seller not responding"},
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"Dispute: {r.status_code} - {r.json()}")
    
    trade = await db.p2p_trades.find_one({"trade_id": trade_id_3})
    dispute = await db.p2p_disputes.find_one({"trade_id": trade_id_3})
    
    print(f"Trade status: {trade['status']}")
    print(f"Dispute exists: {dispute is not None}")
    print(f"Escrow still locked: {trade.get('escrow_locked', False)}")
    print(f"✅ TEST 3: {'PASS' if trade['status'] == 'disputed' and dispute else 'FAIL'}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 4: UPLOAD PROOF (Message with attachment)
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("TEST 4: UPLOAD PAYMENT PROOF")
    print("=" * 70)
    
    trade_id_4 = f"TEST4_{uuid.uuid4().hex[:8]}"
    trade_ids.append(trade_id_4)
    
    await db.p2p_trades.insert_one({
        "trade_id": trade_id_4,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.03,
        "fiat_amount": 1500.0,
        "status": "pending_payment",
        "escrow_locked": True,
    })
    
    async with httpx.AsyncClient(timeout=30.0) as http:
        # Send message with "proof" (simulated - no actual file)
        r = await http.post(
            f"{API_URL}/api/p2p/trade/message",
            json={
                "trade_id": trade_id_4,
                "sender_id": buyer_id,
                "message": "Here is my payment proof - bank transfer confirmation #12345",
                "attachment_url": "https://example.com/proof/payment_receipt.png"
            },
            headers={"Idempotency-Key": str(uuid.uuid4())}
        )
        print(f"Message: {r.status_code} - {r.json()}")
    
    # Check if message was stored
    message = await db.trade_messages.find_one({"trade_id": trade_id_4})
    print(f"Message stored: {message is not None}")
    if message:
        print(f"Message text: {message.get('message', '')[:50]}...")
        print(f"Attachment: {message.get('attachment_url', 'None')}")
    print(f"✅ TEST 4: {'PASS' if message else 'FAIL'}")
    
    # ═══════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    t1 = await db.p2p_trades.find_one({"trade_id": trade_id_1})
    t2 = await db.p2p_trades.find_one({"trade_id": trade_id_2})
    t3 = await db.p2p_trades.find_one({"trade_id": trade_id_3})
    msg = await db.trade_messages.find_one({"trade_id": trade_id_4})
    
    results = {
        "Mark Paid + Release": t1['status'] == 'completed',
        "Cancel Order": t2['status'] == 'cancelled',
        "Dispute": t3['status'] == 'disputed',
        "Upload Proof": msg is not None
    }
    
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
    await db.trade_messages.delete_many({"trade_id": {"$in": trade_ids}})
    print("✅ Cleaned up")
    
    client.close()
    return all_passed

if __name__ == "__main__":
    result = asyncio.run(run_test())
    sys.exit(0 if result else 1)
