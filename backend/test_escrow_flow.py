"""
Comprehensive P2P Escrow System Testing
Tests the complete flow: balance locking → trade → release/cancel → fee collection
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def test_escrow_flow():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client['cryptobank']
    
    print("🔬 TESTING P2P ESCROW SYSTEM")
    print("="*80)
    
    # Import escrow functions
    import sys
    sys.path.append('/app/backend')
    from escrow_balance_system import (
        initialize_trader_balance,
        add_funds_to_trader,
        get_trader_balance,
        lock_balance_for_trade,
        unlock_balance_from_cancelled_trade,
        release_balance_from_completed_trade,
        BalanceLockRequest,
        BalanceUnlockRequest,
        BalanceReleaseRequest
    )
    
    # Test data
    trader_alice = "test_trader_alice"
    trader_bob = "test_trader_bob"
    buyer_charlie = "test_buyer_charlie"
    
    print("\n📊 PHASE 1: Initialize Balances")
    print("-"*80)
    
    # Initialize balances for traders
    await initialize_trader_balance(db, trader_alice, "BTC", 0.0)
    await add_funds_to_trader(db, trader_alice, "BTC", 1.0, "test_deposit")
    print(f"✅ Alice: Initialized with 1.0 BTC")
    
    await initialize_trader_balance(db, trader_bob, "BTC", 0.0)
    await add_funds_to_trader(db, trader_bob, "BTC", 0.5, "test_deposit")
    print(f"✅ Bob: Initialized with 0.5 BTC")
    
    await initialize_trader_balance(db, buyer_charlie, "BTC", 0.0)
    print(f"✅ Charlie (buyer): Initialized with 0.0 BTC")
    
    # Check initial balances
    alice_balance = await get_trader_balance(db, trader_alice, "BTC")
    print(f"\n📈 Alice Balance: Total={alice_balance['total_balance']}, Locked={alice_balance['locked_balance']}, Available={alice_balance['available_balance']}")
    
    print("\n📊 PHASE 2: Create Trade & Lock Balance")
    print("-"*80)
    
    # Trade 1: Charlie buys 0.1 BTC from Alice
    trade1_id = str(uuid.uuid4())
    trade1_amount = 0.1
    
    lock_result = await lock_balance_for_trade(db, BalanceLockRequest(
        trader_id=trader_alice,
        currency="BTC",
        amount=trade1_amount,
        trade_id=trade1_id,
        reason="trade_escrow"
    ))
    
    if lock_result["success"]:
        print(f"✅ LOCKED: {trade1_amount} BTC from Alice for trade {trade1_id}")
        alice_balance = lock_result["balance"]
        print(f"   Alice Balance: Total={alice_balance['total_balance']}, Locked={alice_balance['locked_balance']}, Available={alice_balance['available_balance']}")
    else:
        print(f"❌ LOCK FAILED: {lock_result['message']}")
    
    print("\n📊 PHASE 3A: Complete Trade & Release with Fee")
    print("-"*80)
    
    # Release trade 1 (1% fee)
    release_result = await release_balance_from_completed_trade(db, BalanceReleaseRequest(
        trader_id=trader_alice,
        buyer_id=buyer_charlie,
        currency="BTC",
        gross_amount=trade1_amount,
        fee_percent=1.0,
        trade_id=trade1_id
    ), admin_wallet_id="platform_admin")
    
    if release_result["success"]:
        print(f"✅ RELEASED: Trade {trade1_id} completed with fee")
        details = release_result["details"]
        print(f"   Gross Amount: {details['gross_amount']} BTC")
        print(f"   Fee (1%): {details['fee_amount']} BTC")
        print(f"   Net to Buyer: {details['net_amount']} BTC")
        print(f"   Admin Fee Collected: {details['admin_fee_collected']} BTC")
        print(f"   Alice New Balance: Total={details['trader_new_balance']['total']}, Locked={details['trader_new_balance']['locked']}, Available={details['trader_new_balance']['available']}")
    else:
        print(f"❌ RELEASE FAILED: {release_result['message']}")
    
    # Check buyer balance
    charlie_balance = await get_trader_balance(db, buyer_charlie, "BTC")
    print(f"   Charlie Balance: Total={charlie_balance['total_balance']} BTC (should be ~0.099)")
    
    # Check admin internal balance
    admin_balance = await db.admin_internal_balances.find_one({"currency": "BTC"})
    if admin_balance:
        print(f"   Admin Internal Balance: {admin_balance['amount']} BTC")
    
    print("\n📊 PHASE 3B: Test Cancelled Trade (Unlock)")
    print("-"*80)
    
    # Trade 2: Lock another trade from Bob
    trade2_id = str(uuid.uuid4())
    trade2_amount = 0.2
    
    lock_result2 = await lock_balance_for_trade(db, BalanceLockRequest(
        trader_id=trader_bob,
        currency="BTC",
        amount=trade2_amount,
        trade_id=trade2_id,
        reason="trade_escrow"
    ))
    
    if lock_result2["success"]:
        print(f"✅ LOCKED: {trade2_amount} BTC from Bob for trade {trade2_id}")
        bob_balance = lock_result2["balance"]
        print(f"   Bob Balance: Total={bob_balance['total_balance']}, Locked={bob_balance['locked_balance']}, Available={bob_balance['available_balance']}")
    
    # Cancel trade 2
    unlock_result = await unlock_balance_from_cancelled_trade(db, BalanceUnlockRequest(
        trader_id=trader_bob,
        currency="BTC",
        amount=trade2_amount,
        trade_id=trade2_id,
        reason="trade_cancelled"
    ))
    
    if unlock_result["success"]:
        print(f"✅ UNLOCKED: {trade2_amount} BTC returned to Bob (trade cancelled)")
        bob_balance = unlock_result["balance"]
        print(f"   Bob Balance: Total={bob_balance['total_balance']}, Locked={bob_balance['locked_balance']}, Available={bob_balance['available_balance']}")
    else:
        print(f"❌ UNLOCK FAILED: {unlock_result['message']}")
    
    print("\n📊 PHASE 4: Test Insufficient Balance Protection")
    print("-"*80)
    
    # Try to lock more than available
    trade3_id = str(uuid.uuid4())
    too_much = 2.0  # Bob only has 0.5 BTC
    
    lock_result3 = await lock_balance_for_trade(db, BalanceLockRequest(
        trader_id=trader_bob,
        currency="BTC",
        amount=too_much,
        trade_id=trade3_id,
        reason="trade_escrow"
    ))
    
    if not lock_result3["success"]:
        print(f"✅ CORRECTLY REJECTED: Tried to lock {too_much} BTC when Bob only has {bob_balance['available_balance']} BTC available")
        print(f"   Error: {lock_result3['message']}")
    else:
        print(f"❌ SHOULD HAVE REJECTED: Allowed locking more than available balance!")
    
    print("\n📊 FINAL SUMMARY")
    print("="*80)
    
    # Get final balances
    alice_final = await get_trader_balance(db, trader_alice, "BTC")
    bob_final = await get_trader_balance(db, trader_bob, "BTC")
    charlie_final = await get_trader_balance(db, buyer_charlie, "BTC")
    admin_final = await db.admin_internal_balances.find_one({"currency": "BTC"})
    
    print(f"\n👤 Alice (Seller):")
    print(f"   Started with: 1.0 BTC")
    print(f"   Sold: 0.1 BTC")
    print(f"   Final: Total={alice_final['total_balance']}, Locked={alice_final['locked_balance']}, Available={alice_final['available_balance']}")
    print(f"   Expected: Total=0.9 BTC (1.0 - 0.1 sold)")
    
    print(f"\n👤 Bob (Trader):")
    print(f"   Started with: 0.5 BTC")
    print(f"   Final: Total={bob_final['total_balance']}, Locked={bob_final['locked_balance']}, Available={bob_final['available_balance']}")
    print(f"   Expected: Total=0.5 BTC (no trades completed)")
    
    print(f"\n👤 Charlie (Buyer):")
    print(f"   Started with: 0.0 BTC")
    print(f"   Bought: 0.099 BTC (0.1 BTC minus 1% fee)")
    print(f"   Final: Total={charlie_final['total_balance']} BTC")
    print(f"   Expected: ~0.099 BTC")
    
    print(f"\n💰 Admin (Platform Fees):")
    if admin_final:
        print(f"   Collected Fees: {admin_final['amount']} BTC")
        print(f"   Expected: 0.001 BTC (1% of 0.1 BTC trade)")
    else:
        print(f"   No fees collected yet")
    
    print("\n✅ ESCROW SYSTEM TEST COMPLETED")
    print("="*80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_escrow_flow())
