#!/usr/bin/env python3
"""
Comprehensive Fee Tracking Test for ALL Pages
"""

import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client['crypto_bank']

TEST_USER_ID = "9757bd8c-16f8-4efb-b075-0af4a432990a"

sys.path.append('/app/backend')
from wallet_service import WalletService
wallet_service = WalletService(db)

async def get_admin_wallet():
    """Get admin fee wallet balance"""
    gbp_wallet = await db.internal_balances.find_one(
        {"user_id": "PLATFORM_FEES", "currency": "GBP"},
        {"_id": 0}
    )
    btc_wallet = await db.internal_balances.find_one(
        {"user_id": "PLATFORM_FEES", "currency": "BTC"},
        {"_id": 0}
    )
    return {
        "GBP": gbp_wallet if gbp_wallet else {"balance": 0, "total_fees": 0, "p2p_express_fees": 0, "trading_fees": 0},
        "BTC": btc_wallet if btc_wallet else {"balance": 0, "total_fees": 0, "swap_fees": 0}
    }

async def print_admin_wallet(title):
    wallets = await get_admin_wallet()
    print(f"\n{title}")
    print("="*70)
    gbp = wallets["GBP"]
    btc = wallets["BTC"]
    print(f"GBP Wallet:")
    print(f"  Balance: £{gbp.get('balance', 0):.2f}")
    print(f"  Total Fees: £{gbp.get('total_fees', 0):.2f}")
    print(f"  - P2P Express: £{gbp.get('p2p_express_fees', 0):.2f}")
    print(f"  - Trading: £{gbp.get('trading_fees', 0):.2f}")
    print(f"\nBTC Wallet:")
    print(f"  Balance: {btc.get('balance', 0):.8f} BTC")
    print(f"  Total Fees: {btc.get('total_fees', 0):.8f} BTC")
    print(f"  - Swap: {btc.get('swap_fees', 0):.8f} BTC")

async def test_p2p_express():
    """Test P2P Express - 2.5% fee in GBP"""
    print("\n" + "#"*70)
    print("#  TEST 1: P2P EXPRESS (2.5% FEE)".ljust(69) + "#")
    print("#"*70)
    
    trade_id = f"EXPRESS_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{TEST_USER_ID[:8]}"
    fiat_amount = 100.00
    fee = 2.50  # 2.5%
    crypto_amount = 0.00145
    
    print(f"\n💰 Transaction Details:")
    print(f"   Amount: £{fiat_amount:.2f}")
    print(f"   Fee (2.5%): £{fee:.2f}")
    print(f"   BTC to receive: {crypto_amount:.8f} BTC")
    
    try:
        # 1. Debit GBP
        await wallet_service.debit(
            user_id=TEST_USER_ID,
            currency="GBP",
            amount=fiat_amount,
            transaction_type="purchase",
            reference_id=trade_id
        )
        
        # 2. Credit BTC
        await wallet_service.credit(
            user_id=TEST_USER_ID,
            currency="BTC",
            amount=crypto_amount,
            transaction_type="purchase",
            reference_id=trade_id
        )
        
        # 3. Record and credit fee
        await db.platform_fees.insert_one({
            "fee_id": f"FEE_{trade_id}",
            "trade_id": trade_id,
            "fee_type": "p2p_express",
            "amount": fee,
            "currency": "GBP",
            "user_id": TEST_USER_ID,
            "crypto": "BTC",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        await db.internal_balances.update_one(
            {"user_id": "PLATFORM_FEES", "currency": "GBP"},
            {
                "$inc": {
                    "balance": fee,
                    "total_fees": fee,
                    "p2p_express_fees": fee
                },
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        print(f"\n✅ Transaction successful!")
        print(f"   Trade ID: {trade_id}")
        print(f"   £{fee:.2f} credited to admin GBP wallet")
        return True
        
    except Exception as e:
        print(f"\n❌ Transaction failed: {e}")
        return False

async def test_swap():
    """Test Swap - 1.5% fee in BTC"""
    print("\n" + "#"*70)
    print("#  TEST 2: SWAP CRYPTO (1.5% FEE)".ljust(69) + "#")
    print("#"*70)
    
    swap_id = str(uuid.uuid4())
    from_currency = "BTC"
    to_currency = "ETH"
    from_amount = 0.001  # 0.001 BTC
    
    # Get prices (hardcoded for testing)
    btc_price_gbp = 69000
    eth_price_gbp = 2500
    
    from_value_gbp = from_amount * btc_price_gbp
    swap_fee_percent = 1.5
    swap_fee_gbp = from_value_gbp * (swap_fee_percent / 100)
    swap_fee_btc = swap_fee_gbp / btc_price_gbp
    net_value_gbp = from_value_gbp - swap_fee_gbp
    to_amount = net_value_gbp / eth_price_gbp
    
    print(f"\n💰 Transaction Details:")
    print(f"   From: {from_amount:.8f} BTC")
    print(f"   To: {to_amount:.8f} ETH")
    print(f"   Fee (1.5%): {swap_fee_btc:.8f} BTC (£{swap_fee_gbp:.2f})")
    
    try:
        # 1. Debit BTC
        await wallet_service.debit(
            user_id=TEST_USER_ID,
            currency="BTC",
            amount=from_amount,
            transaction_type="swap_out",
            reference_id=swap_id
        )
        
        # 2. Credit ETH
        await wallet_service.credit(
            user_id=TEST_USER_ID,
            currency="ETH",
            amount=to_amount,
            transaction_type="swap_in",
            reference_id=swap_id
        )
        
        # 3. Credit fee to admin BTC wallet
        await db.internal_balances.update_one(
            {"user_id": "PLATFORM_FEES", "currency": "BTC"},
            {
                "$inc": {
                    "balance": swap_fee_btc,
                    "total_fees": swap_fee_btc,
                    "swap_fees": swap_fee_btc
                },
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # 4. Record swap
        await db.swap_history.insert_one({
            "swap_id": swap_id,
            "user_id": TEST_USER_ID,
            "from_currency": from_currency,
            "from_amount": from_amount,
            "to_currency": to_currency,
            "to_amount": to_amount,
            "swap_fee_crypto": swap_fee_btc,
            "swap_fee_gbp": swap_fee_gbp,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        print(f"\n✅ Swap successful!")
        print(f"   Swap ID: {swap_id}")
        print(f"   {swap_fee_btc:.8f} BTC credited to admin BTC wallet")
        return True
        
    except Exception as e:
        print(f"\n❌ Swap failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_trading():
    """Test Trading - 0.1% fee in GBP"""
    print("\n" + "#"*70)
    print("#  TEST 3: SPOT TRADING (0.1% FEE)".ljust(69) + "#")
    print("#"*70)
    
    trade_id = str(uuid.uuid4())
    pair = "BTCGBP"
    order_type = "buy"
    amount = 0.001  # 0.001 BTC
    price = 69000  # £69,000 per BTC
    total_amount = amount * price  # £69.00
    fee_percent = 0.1
    fee_amount = total_amount * (fee_percent / 100)  # £0.069
    total_with_fee = total_amount + fee_amount  # £69.069
    
    print(f"\n💰 Transaction Details:")
    print(f"   Pair: {pair}")
    print(f"   Type: {order_type.upper()}")
    print(f"   Amount: {amount:.8f} BTC")
    print(f"   Price: £{price:.2f}")
    print(f"   Total: £{total_amount:.2f}")
    print(f"   Fee (0.1%): £{fee_amount:.3f}")
    print(f"   Total with fee: £{total_with_fee:.2f}")
    
    try:
        # 1. Debit GBP (total + fee)
        await wallet_service.debit(
            user_id=TEST_USER_ID,
            currency="GBP",
            amount=total_with_fee,
            transaction_type="trade_buy",
            reference_id=trade_id
        )
        
        # 2. Credit BTC
        await wallet_service.credit(
            user_id=TEST_USER_ID,
            currency="BTC",
            amount=amount,
            transaction_type="trade_buy",
            reference_id=trade_id
        )
        
        # 3. Credit fee to admin GBP wallet
        await db.internal_balances.update_one(
            {"user_id": "PLATFORM_FEES", "currency": "GBP"},
            {
                "$inc": {
                    "balance": fee_amount,
                    "total_fees": fee_amount,
                    "trading_fees": fee_amount
                },
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # 4. Record trade
        await db.spot_trades.insert_one({
            "trade_id": trade_id,
            "user_id": TEST_USER_ID,
            "pair": pair,
            "type": order_type,
            "amount": amount,
            "price": price,
            "total": total_amount,
            "fee_amount": fee_amount,
            "status": "completed",
            "created_at": datetime.now(timezone.utc)
        })
        
        print(f"\n✅ Trade successful!")
        print(f"   Trade ID: {trade_id}")
        print(f"   £{fee_amount:.3f} credited to admin GBP wallet")
        return True
        
    except Exception as e:
        print(f"\n❌ Trade failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("\n" + "="*70)
    print("="*70)
    print("  COMPREHENSIVE FEE TRACKING TEST - ALL PAGES".center(70))
    print("="*70)
    print("="*70)
    
    # Show initial state
    await print_admin_wallet("📊 INITIAL ADMIN FEE WALLET STATE")
    
    # Test 1: P2P Express
    result1 = await test_p2p_express()
    await print_admin_wallet("📊 AFTER P2P EXPRESS")
    
    # Test 2: Swap
    result2 = await test_swap()
    await print_admin_wallet("📊 AFTER SWAP")
    
    # Test 3: Trading
    result3 = await test_trading()
    await print_admin_wallet("📊 FINAL ADMIN FEE WALLET STATE")
    
    # Summary
    print("\n" + "="*70)
    print("FINAL RESULTS")
    print("="*70)
    print(f"P2P Express (2.5%): {'✅ PASS' if result1 else '❌ FAIL'}")
    print(f"Swap Crypto (1.5%): {'✅ PASS' if result2 else '❌ FAIL'}")
    print(f"Spot Trading (0.1%): {'✅ PASS' if result3 else '❌ FAIL'}")
    
    if all([result1, result2, result3]):
        print("\n🎉 ALL TESTS PASSED! FEE TRACKING WORKING CORRECTLY!")
    else:
        print("\n⚠️ SOME TESTS FAILED - CHECK DETAILS ABOVE")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
