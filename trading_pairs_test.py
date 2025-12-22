#!/usr/bin/env python3
"""
Comprehensive Trading Pairs Testing Script
Tests ALL trading pairs on the Trading Platform as requested:
1. BTC/USD - place buy order for 0.001 BTC
2. ETH/USD - place buy order for 0.1 ETH  
3. SOL/USD - place buy order for 1 SOL
4. XRP/USD - place buy order for 10 XRP
5. BNB/USD - place buy order for 0.1 BNB

For each pair:
- Call POST /api/trading/place-order
- User ID: c99d7bb9-2ae0-4a06-8f6f-61829f8eafce
- Type: buy
- fee_percent: 0.1
- Use market price
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://multilingual-crypto-2.preview.emergentagent.com/api"
USER_ID = "c99d7bb9-2ae0-4a06-8f6f-61829f8eafce"
FEE_PERCENT = 0.1

# Trading pairs to test with their amounts
TRADING_PAIRS = [
    {"pair": "BTCUSD", "amount": 0.001, "symbol": "BTC"},
    {"pair": "ETHUSD", "amount": 0.1, "symbol": "ETH"},
    {"pair": "SOLUSD", "amount": 1.0, "symbol": "SOL"},
    {"pair": "XRPUSD", "amount": 10.0, "symbol": "XRP"},
    {"pair": "BNBUSD", "amount": 0.1, "symbol": "BNB"}
]

def log_test(message):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_live_price(symbol):
    """Get live price for a cryptocurrency"""
    try:
        url = f"{BASE_URL}/prices/live/{symbol}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return data.get("price_usd", 0)
        
        log_test(f"❌ Failed to get live price for {symbol}: {response.status_code}")
        return None
        
    except Exception as e:
        log_test(f"❌ Error getting live price for {symbol}: {str(e)}")
        return None

def get_trading_pairs():
    """Get available trading pairs"""
    try:
        url = f"{BASE_URL}/trading/pairs"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return data.get("pairs", [])
        
        log_test(f"❌ Failed to get trading pairs: {response.status_code}")
        return []
        
    except Exception as e:
        log_test(f"❌ Error getting trading pairs: {str(e)}")
        return []

def check_user_balance(user_id):
    """Check user's GBP balance for trading"""
    try:
        url = f"{BASE_URL}/wallet/balances/{user_id}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", [])
                for balance in balances:
                    if balance.get("currency") == "GBP":
                        return balance.get("balance", 0)
        
        log_test(f"❌ Failed to get user balance: {response.status_code}")
        return 0
        
    except Exception as e:
        log_test(f"❌ Error getting user balance: {str(e)}")
        return 0

def place_trading_order(pair, amount, price, order_type="buy"):
    """Place a trading order"""
    try:
        url = f"{BASE_URL}/trading/place-order"
        
        payload = {
            "user_id": USER_ID,
            "pair": pair,
            "type": order_type,
            "amount": amount,
            "price": price,
            "fee_percent": FEE_PERCENT
        }
        
        log_test(f"📤 Placing {order_type} order: {amount} {pair[:3]} at ${price:.2f}")
        log_test(f"   Request: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=15)
        
        log_test(f"📥 Response Status: {response.status_code}")
        
        try:
            response_data = response.json()
            log_test(f"   Response: {json.dumps(response_data, indent=2)}")
            return response.status_code, response_data
        except:
            log_test(f"   Response Text: {response.text}")
            return response.status_code, {"error": "Invalid JSON response"}
            
    except Exception as e:
        log_test(f"❌ Error placing trading order: {str(e)}")
        return 500, {"error": str(e)}

def test_trading_pair(pair_info):
    """Test a single trading pair"""
    pair = pair_info["pair"]
    amount = pair_info["amount"]
    symbol = pair_info["symbol"]
    
    log_test(f"\n🔍 TESTING TRADING PAIR: {pair}")
    log_test(f"   Target Amount: {amount} {symbol}")
    
    # Get live price
    log_test(f"📊 Getting live price for {symbol}...")
    price = get_live_price(symbol)
    
    if price is None or price <= 0:
        log_test(f"❌ FAILED: Could not get valid price for {symbol}")
        return {
            "pair": pair,
            "success": False,
            "error": "Could not get live price",
            "price": None,
            "amount": amount
        }
    
    log_test(f"✅ Live price for {symbol}: ${price:.2f}")
    
    # Calculate total cost
    total_cost = amount * price
    fee_amount = total_cost * (FEE_PERCENT / 100)
    total_with_fee = total_cost + fee_amount
    
    log_test(f"💰 Order Details:")
    log_test(f"   Amount: {amount} {symbol}")
    log_test(f"   Price: ${price:.2f}")
    log_test(f"   Total Cost: ${total_cost:.2f}")
    log_test(f"   Fee ({FEE_PERCENT}%): ${fee_amount:.4f}")
    log_test(f"   Total with Fee: ${total_with_fee:.2f}")
    
    # Place the order
    status_code, response_data = place_trading_order(pair, amount, price)
    
    # Analyze result
    success = status_code == 200 and response_data.get("success", False)
    
    result = {
        "pair": pair,
        "symbol": symbol,
        "amount": amount,
        "price": price,
        "total_cost": total_cost,
        "fee_amount": fee_amount,
        "total_with_fee": total_with_fee,
        "status_code": status_code,
        "success": success,
        "response": response_data
    }
    
    if success:
        log_test(f"✅ SUCCESS: {pair} order placed successfully!")
        trade_info = response_data.get("trade", {})
        if trade_info:
            log_test(f"   Trade ID: {trade_info.get('trade_id', 'N/A')}")
            log_test(f"   Executed Amount: {trade_info.get('amount', 'N/A')} {symbol}")
            log_test(f"   Executed Price: ${trade_info.get('price', 'N/A')}")
            log_test(f"   Total: ${trade_info.get('total', 'N/A')}")
            log_test(f"   Fee: ${trade_info.get('fee', 'N/A')}")
    else:
        log_test(f"❌ FAILED: {pair} order failed")
        error_msg = response_data.get("message", response_data.get("error", "Unknown error"))
        log_test(f"   Error: {error_msg}")
        result["error"] = error_msg
    
    return result

def main():
    """Main test execution"""
    log_test("🚀 STARTING COMPREHENSIVE TRADING PAIRS TEST")
    log_test("=" * 60)
    
    # Test configuration
    log_test(f"📋 Test Configuration:")
    log_test(f"   Base URL: {BASE_URL}")
    log_test(f"   User ID: {USER_ID}")
    log_test(f"   Fee Percent: {FEE_PERCENT}%")
    log_test(f"   Trading Pairs: {len(TRADING_PAIRS)}")
    
    # Check available trading pairs
    log_test(f"\n📊 Checking available trading pairs...")
    available_pairs = get_trading_pairs()
    log_test(f"✅ Found {len(available_pairs)} available trading pairs")
    
    if available_pairs:
        log_test("   Available pairs:")
        for pair in available_pairs[:10]:  # Show first 10
            status = "🟢" if pair.get("is_tradable") else "🔴"
            log_test(f"   {status} {pair.get('symbol', 'N/A')} - Liquidity: {pair.get('available_liquidity', 0)}")
    
    # Check user balance
    log_test(f"\n💰 Checking user balance...")
    gbp_balance = check_user_balance(USER_ID)
    log_test(f"✅ User GBP Balance: £{gbp_balance:.2f}")
    
    # Test each trading pair
    results = []
    successful_trades = 0
    failed_trades = 0
    
    for i, pair_info in enumerate(TRADING_PAIRS, 1):
        log_test(f"\n{'='*20} TEST {i}/{len(TRADING_PAIRS)} {'='*20}")
        result = test_trading_pair(pair_info)
        results.append(result)
        
        if result["success"]:
            successful_trades += 1
        else:
            failed_trades += 1
    
    # Final summary
    log_test(f"\n{'='*60}")
    log_test(f"🏁 TRADING PAIRS TEST SUMMARY")
    log_test(f"{'='*60}")
    
    log_test(f"📊 Overall Results:")
    log_test(f"   Total Pairs Tested: {len(TRADING_PAIRS)}")
    log_test(f"   Successful Trades: {successful_trades}")
    log_test(f"   Failed Trades: {failed_trades}")
    log_test(f"   Success Rate: {(successful_trades/len(TRADING_PAIRS)*100):.1f}%")
    
    log_test(f"\n📋 Detailed Results:")
    for result in results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        pair = result["pair"]
        amount = result["amount"]
        symbol = result["symbol"]
        
        log_test(f"   {status} {pair}: {amount} {symbol}")
        
        if result["success"]:
            log_test(f"        Price: ${result['price']:.2f}")
            log_test(f"        Total: ${result['total_with_fee']:.2f}")
            trade_id = result["response"].get("trade", {}).get("trade_id", "N/A")
            log_test(f"        Trade ID: {trade_id}")
        else:
            error = result.get("error", "Unknown error")
            log_test(f"        Error: {error}")
    
    # Working vs Failed pairs
    log_test(f"\n🟢 WORKING PAIRS:")
    working_pairs = [r for r in results if r["success"]]
    if working_pairs:
        for result in working_pairs:
            log_test(f"   ✅ {result['pair']}: {result['amount']} {result['symbol']} at ${result['price']:.2f}")
    else:
        log_test(f"   None")
    
    log_test(f"\n🔴 FAILED PAIRS:")
    failed_pairs = [r for r in results if not r["success"]]
    if failed_pairs:
        for result in failed_pairs:
            error = result.get("error", "Unknown error")
            log_test(f"   ❌ {result['pair']}: {error}")
    else:
        log_test(f"   None")
    
    # Return results for further processing
    return {
        "total_tested": len(TRADING_PAIRS),
        "successful": successful_trades,
        "failed": failed_trades,
        "success_rate": (successful_trades/len(TRADING_PAIRS)*100),
        "results": results,
        "working_pairs": working_pairs,
        "failed_pairs": failed_pairs
    }

if __name__ == "__main__":
    try:
        results = main()
        
        # Exit with appropriate code
        if results["failed"] == 0:
            log_test(f"\n🎉 ALL TRADING PAIRS WORKING! Test completed successfully.")
            sys.exit(0)
        else:
            log_test(f"\n⚠️  {results['failed']} trading pairs failed. Check errors above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        log_test(f"\n⏹️  Test interrupted by user")
        sys.exit(130)
    except Exception as e:
        log_test(f"\n💥 Test failed with exception: {str(e)}")
        sys.exit(1)