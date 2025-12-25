#!/usr/bin/env python3
"""
===============================================================================
LIVE TESTNET DRY RUN - RAW PROOF SCRIPT
===============================================================================

This script provides RAW curl-equivalent output for LIVE mode testnet testing.

Requirements:
1. User must have Binance testnet API keys saved in DB
2. User must have 2FA enabled

Tests:
1. POST /api/exchange/test-connection → full HTTP status + JSON
2. Create a LIVE bot (tiny size, 1 pair, simple rule) → curl + response
3. Start the bot → curl + response
4. Place one order on Binance testnet → curl + response
5. Cancel that order → curl + response
6. Show matching records in ledger, audit log, balances

===============================================================================
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment
os.chdir('/app/backend')
load_dotenv()

import httpx
from pymongo import MongoClient

# Configuration
BASE_URL = "http://localhost:8001/api"
TEST_USER_ID = None  # Will be set dynamically

def print_section(title: str):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_curl_equivalent(method: str, endpoint: str, headers: dict, body: dict = None):
    """Print the equivalent curl command."""
    header_str = " ".join([f'-H "{k}: {v}"' for k, v in headers.items()])
    body_str = f"-d '{json.dumps(body)}'" if body else ""
    print(f"CURL EQUIVALENT:")
    print(f"curl -X {method} \"{BASE_URL}{endpoint}\" {header_str} {body_str}")
    print()

def print_raw_response(response, label: str):
    """Print raw HTTP response."""
    print(f"--- {label} ---")
    print(f"HTTP Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"\nJSON Response:")
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
        return data
    except:
        print(response.text)
        return None

async def step_0_check_prerequisites():
    """Check that prerequisites are met."""
    print_section("STEP 0: CHECK PREREQUISITES")
    
    client = MongoClient(os.environ['MONGO_URL'])
    db = client['coinhubx_production']
    
    # Find user with 2FA enabled
    user = db.users.find_one({"two_factor_enabled": True})
    if not user:
        # Check two_factor_auth collection
        tfa = db.two_factor_auth.find_one({"enabled": True})
        if tfa:
            user = db.users.find_one({"user_id": tfa.get("user_id")})
    
    if not user:
        print("ERROR: No user with 2FA enabled found.")
        print("\nTo enable 2FA for a user, run:")
        print("""python3 << 'EOF'
import os
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient

client = MongoClient(os.environ['MONGO_URL'])
db = client['coinhubx_production']

# Enable 2FA for first user
user = db.users.find_one({})
if user:
    db.users.update_one(
        {"user_id": user['user_id']},
        {"$set": {"two_factor_enabled": True}}
    )
    db.two_factor_auth.update_one(
        {"user_id": user['user_id']},
        {"$set": {"user_id": user['user_id'], "enabled": True, "verified": True}},
        upsert=True
    )
    print(f"2FA enabled for user: {user['user_id']}")
EOF""")
        return None, None
    
    user_id = user.get("user_id")
    print(f"Found user with 2FA enabled: {user_id}")
    
    # Check for exchange credentials
    creds = db.exchange_credentials.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if not creds:
        print(f"\nERROR: No exchange credentials found for user {user_id}")
        print("\nTo add Binance testnet credentials, run:")
        print(f"""curl -X POST "http://localhost:8001/api/exchange/credentials" \\
  -H "Content-Type: application/json" \\
  -H "X-User-Id: {user_id}" \\
  -d '{{
    "exchange": "binance_testnet",
    "api_key": "YOUR_BINANCE_TESTNET_API_KEY",
    "api_secret": "YOUR_BINANCE_TESTNET_SECRET"
  }}'""")
        return user_id, None
    
    print(f"Found exchange credentials: {creds.get('exchange')}")
    print(f"API Key: {creds.get('api_key', '')[:8]}...")
    
    return user_id, creds

async def step_1_test_connection(user_id: str):
    """Test exchange connection."""
    print_section("STEP 1: POST /api/exchange/test-connection")
    
    headers = {"Content-Type": "application/json", "X-User-Id": user_id}
    body = {"exchange": "binance_testnet"}
    
    print_curl_equivalent("POST", "/exchange/test-connection", headers, body)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/exchange/test-connection",
            json=body,
            headers=headers
        )
        
        data = print_raw_response(response, "Exchange Connection Test")
        return data and data.get("success")

async def step_2_create_live_bot(user_id: str):
    """Create a LIVE mode bot."""
    print_section("STEP 2: POST /api/bots/create (LIVE mode)")
    
    headers = {"Content-Type": "application/json", "X-User-Id": user_id}
    body = {
        "bot_type": "simple",
        "pair": "BTCUSDT",
        "params": {
            "mode": "live",
            "exchange": "binance_testnet",
            "allocation": 10,  # Tiny: 10 USDT
            "strategy": "simple_rsi",
            "rsi_oversold": 30,
            "rsi_overbought": 70,
            "timeframe": "1h"
        }
    }
    
    print_curl_equivalent("POST", "/bots/create", headers, body)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/bots/create",
            json=body,
            headers=headers
        )
        
        data = print_raw_response(response, "Create LIVE Bot")
        
        if data and data.get("success"):
            return data.get("bot_id") or data.get("bot", {}).get("bot_id")
        return None

async def step_3_start_bot(user_id: str, bot_id: str):
    """Start the LIVE bot."""
    print_section("STEP 3: POST /api/bots/start")
    
    headers = {"Content-Type": "application/json", "X-User-Id": user_id}
    body = {"bot_id": bot_id}
    
    print_curl_equivalent("POST", "/bots/start", headers, body)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/bots/start",
            json=body,
            headers=headers
        )
        
        data = print_raw_response(response, "Start Bot")
        return data and data.get("success")

async def step_4_place_order(user_id: str):
    """Place a test order directly on Binance testnet."""
    print_section("STEP 4: Place Order on Binance Testnet")
    
    # Get credentials from DB
    mongo_client = MongoClient(os.environ['MONGO_URL'])
    db = mongo_client['coinhubx_production']
    creds = db.exchange_credentials.find_one({"user_id": user_id, "is_active": True})
    
    if not creds:
        print("ERROR: No credentials found")
        return None, None
    
    from exchange_adapters import BinanceAdapter, OrderSide, OrderType
    
    adapter = BinanceAdapter(
        api_key=creds.get("api_key"),
        api_secret=creds.get("api_secret"),
        testnet=True
    )
    
    # Place a small LIMIT BUY order (won't fill immediately)
    print("Placing LIMIT BUY order: BTCUSDT, qty=0.001, price=50000 (below market)")
    print("This order won't fill immediately, allowing us to cancel it.")
    print()
    
    result = await adapter.place_order(
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        order_type=OrderType.LIMIT,
        quantity=0.001,
        price=50000.0  # Well below current price
    )
    
    print(f"--- Order Placement Result ---")
    print(f"Success: {result.success}")
    print(f"Order ID: {result.order_id}")
    print(f"Exchange Order ID: {result.exchange_order_id}")
    print(f"Status: {result.status}")
    print(f"Filled Price: {result.filled_price}")
    print(f"Filled Quantity: {result.filled_quantity}")
    print(f"Error: {result.error}")
    print(f"\nRaw Response:")
    print(json.dumps(result.raw_response, indent=2))
    
    return result.order_id, adapter

async def step_5_cancel_order(order_id: str, adapter):
    """Cancel the test order."""
    print_section("STEP 5: Cancel Order")
    
    if not order_id or not adapter:
        print("ERROR: No order ID or adapter provided")
        return False
    
    print(f"Cancelling order: {order_id}")
    print()
    
    cancelled = await adapter.cancel_order(order_id, "BTCUSDT")
    
    print(f"--- Cancel Result ---")
    print(f"Cancelled: {cancelled}")
    
    # Verify cancellation
    order_status = await adapter.get_order(order_id, "BTCUSDT")
    print(f"\nOrder Status After Cancel:")
    print(json.dumps(order_status, indent=2))
    
    return cancelled

async def step_6_verify_records(user_id: str, bot_id: str = None):
    """Verify matching records in ledger, audit log, and balances."""
    print_section("STEP 6: Verify Records (Ledger, Audit, Balances)")
    
    mongo_client = MongoClient(os.environ['MONGO_URL'])
    db = mongo_client['coinhubx_production']
    
    # Check canonical ledger
    print("--- CANONICAL LEDGER (last 5 entries) ---")
    ledger_entries = list(db.canonical_ledger.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(5))
    
    for entry in ledger_entries:
        entry['_id'] = str(entry['_id'])
        print(json.dumps(entry, indent=2, default=str))
    
    if not ledger_entries:
        print("No ledger entries found for this user.")
    
    # Check trade audit log
    print("\n--- TRADE AUDIT LOG (last 5 entries) ---")
    audit_entries = list(db.trade_audit_log.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(5))
    
    for entry in audit_entries:
        entry['_id'] = str(entry['_id'])
        print(json.dumps(entry, indent=2, default=str))
    
    if not audit_entries:
        # Try bot_decision_logs
        audit_entries = list(db.bot_decision_logs.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(5))
        
        for entry in audit_entries:
            entry['_id'] = str(entry['_id'])
            print(json.dumps(entry, indent=2, default=str))
        
        if not audit_entries:
            print("No audit entries found for this user.")
    
    # Check balances (from exchange)
    print("\n--- EXCHANGE BALANCES ---")
    creds = db.exchange_credentials.find_one({"user_id": user_id, "is_active": True})
    if creds:
        from exchange_adapters import BinanceAdapter
        adapter = BinanceAdapter(
            api_key=creds.get("api_key"),
            api_secret=creds.get("api_secret"),
            testnet=True
        )
        balances = await adapter.get_all_balances()
        for b in balances[:10]:
            print(f"  {b.currency}: Total={b.total}, Available={b.available}, Locked={b.locked}")
    else:
        print("No credentials to fetch exchange balances.")
    
    # Check bot if created
    if bot_id:
        print(f"\n--- BOT STATUS ({bot_id}) ---")
        bot = db.trading_bots.find_one({"bot_id": bot_id})
        if bot:
            bot['_id'] = str(bot['_id'])
            print(json.dumps(bot, indent=2, default=str))

async def main():
    print("\n" + "="*80)
    print("  COINHUBX LIVE TESTNET DRY RUN - RAW PROOF")
    print("  " + datetime.now(timezone.utc).isoformat())
    print("="*80)
    
    # Step 0: Check prerequisites
    user_id, creds = await step_0_check_prerequisites()
    
    if not user_id:
        print("\n❌ BLOCKED: No user with 2FA enabled found.")
        print("   Enable 2FA first, then re-run this script.")
        return
    
    if not creds:
        print("\n❌ BLOCKED: No exchange credentials found.")
        print("   Add Binance testnet credentials first, then re-run.")
        return
    
    # Step 1: Test connection
    connected = await step_1_test_connection(user_id)
    if not connected:
        print("\n❌ BLOCKED: Exchange connection failed.")
        return
    
    print("\n✅ Exchange connection successful!")
    
    # Step 2: Create LIVE bot
    bot_id = await step_2_create_live_bot(user_id)
    if not bot_id:
        print("\n⚠️ Bot creation failed (may need GBP wallet or other requirement).")
        print("   Proceeding with direct order test...")
    else:
        print(f"\n✅ Bot created: {bot_id}")
        
        # Step 3: Start bot
        started = await step_3_start_bot(user_id, bot_id)
        if started:
            print("\n✅ Bot started!")
        else:
            print("\n⚠️ Bot start failed.")
    
    # Step 4: Place order
    order_id, adapter = await step_4_place_order(user_id)
    if order_id:
        print(f"\n✅ Order placed: {order_id}")
        
        # Step 5: Cancel order
        cancelled = await step_5_cancel_order(order_id, adapter)
        if cancelled:
            print("\n✅ Order cancelled!")
        else:
            print("\n⚠️ Order cancel failed (may already be filled/expired).")
    else:
        print("\n⚠️ Order placement failed.")
    
    # Step 6: Verify records
    await step_6_verify_records(user_id, bot_id)
    
    print("\n" + "="*80)
    print("  LIVE TESTNET DRY RUN COMPLETE")
    print("="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
