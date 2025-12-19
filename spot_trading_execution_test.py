#!/usr/bin/env python3
"""
Comprehensive Spot Trading Execution Flow Test
Tests the /api/trading/execute endpoint with all requested scenarios
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://controlpanel-4.preview.emergentagent.com"
TEST_USER_ID = "test_user_123"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_symbol} {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_trading_pairs_endpoint():
    """Test GET /api/trading/pairs endpoint"""
    print("🔍 TESTING TRADING PAIRS ENDPOINT")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/trading/pairs")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success") and "pairs" in data:
                pairs = data["pairs"]
                expected_pairs = ["BTC/GBP", "ETH/GBP", "USDT/GBP", "BNB/GBP", "SOL/GBP", "LTC/GBP"]
                
                found_pairs = [pair["symbol"] for pair in pairs]
                
                # Check all expected pairs exist
                missing_pairs = [p for p in expected_pairs if p not in found_pairs]
                
                if not missing_pairs:
                    log_test("Trading Pairs Endpoint", "PASS", 
                           f"Found all 6 expected pairs: {', '.join(found_pairs)}")
                    
                    # Check pair structure
                    sample_pair = pairs[0]
                    required_fields = ["symbol", "base", "quote", "available_liquidity", "is_tradable", "status"]
                    
                    if all(field in sample_pair for field in required_fields):
                        log_test("Pair Structure Validation", "PASS", 
                               f"All required fields present: {', '.join(required_fields)}")
                        return True, pairs
                    else:
                        missing_fields = [f for f in required_fields if f not in sample_pair]
                        log_test("Pair Structure Validation", "FAIL", 
                               f"Missing fields: {', '.join(missing_fields)}")
                        return False, None
                else:
                    log_test("Trading Pairs Endpoint", "FAIL", 
                           f"Missing pairs: {', '.join(missing_pairs)}")
                    return False, None
            else:
                log_test("Trading Pairs Endpoint", "FAIL", 
                       f"Invalid response structure: {data}")
                return False, None
        else:
            log_test("Trading Pairs Endpoint", "FAIL", 
                   f"HTTP {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Trading Pairs Endpoint", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_buy_execution():
    """Test BUY button execution"""
    print("🔍 TESTING BUY EXECUTION")
    print("=" * 50)
    
    buy_request = {
        "user_id": TEST_USER_ID,
        "pair": "BTC/GBP",
        "type": "buy",
        "amount": 0.01,
        "price": 47500
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/trading/execute",
            json=buy_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                transaction = data.get("transaction", {})
                
                # Check required transaction fields
                required_fields = ["pair", "type", "amount", "price", "total", "fee", "final_amount"]
                missing_fields = [f for f in required_fields if f not in transaction]
                
                if not missing_fields:
                    # Verify transaction details
                    if (transaction["pair"] == "BTC/GBP" and 
                        transaction["type"] == "buy" and
                        transaction["amount"] == 0.01 and
                        transaction["price"] > 47500):  # Should include markup
                        
                        log_test("BUY Transaction Success", "PASS", 
                               f"Transaction: {transaction['amount']} {transaction['pair']} at £{transaction['price']:.2f}")
                        log_test("Hidden Markup Applied", "PASS", 
                               f"Adjusted price (£{transaction['price']:.2f}) > Market price (£47500)")
                        
                        return True, transaction
                    else:
                        log_test("BUY Transaction Validation", "FAIL", 
                               f"Invalid transaction details: {transaction}")
                        return False, None
                else:
                    log_test("BUY Transaction Structure", "FAIL", 
                           f"Missing fields: {', '.join(missing_fields)}")
                    return False, None
            else:
                log_test("BUY Transaction", "FAIL", 
                       f"Transaction failed: {data.get('message', 'Unknown error')}")
                return False, None
        else:
            log_test("BUY Transaction", "FAIL", 
                   f"HTTP {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("BUY Transaction", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_sell_execution():
    """Test SELL button execution"""
    print("🔍 TESTING SELL EXECUTION")
    print("=" * 50)
    
    sell_request = {
        "user_id": TEST_USER_ID,
        "pair": "BTC/GBP",
        "type": "sell",
        "amount": 0.01,
        "price": 47500
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/trading/execute",
            json=sell_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                transaction = data.get("transaction", {})
                
                # Check required transaction fields
                required_fields = ["pair", "type", "amount", "price", "total", "fee", "final_amount"]
                missing_fields = [f for f in required_fields if f not in transaction]
                
                if not missing_fields:
                    # Verify transaction details
                    if (transaction["pair"] == "BTC/GBP" and 
                        transaction["type"] == "sell" and
                        transaction["amount"] == 0.01 and
                        transaction["price"] < 47500):  # Should include markdown
                        
                        log_test("SELL Transaction Success", "PASS", 
                               f"Transaction: {transaction['amount']} {transaction['pair']} at £{transaction['price']:.2f}")
                        log_test("Hidden Markdown Applied", "PASS", 
                               f"Adjusted price (£{transaction['price']:.2f}) < Market price (£47500)")
                        
                        return True, transaction
                    else:
                        log_test("SELL Transaction Validation", "FAIL", 
                               f"Invalid transaction details: {transaction}")
                        return False, None
                else:
                    log_test("SELL Transaction Structure", "FAIL", 
                           f"Missing fields: {', '.join(missing_fields)}")
                    return False, None
            else:
                log_test("SELL Transaction", "FAIL", 
                       f"Transaction failed: {data.get('message', 'Unknown error')}")
                return False, None
        else:
            log_test("SELL Transaction", "FAIL", 
                   f"HTTP {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("SELL Transaction", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_hidden_markup_verification(buy_transaction, sell_transaction):
    """Test hidden markup/markdown verification"""
    print("🔍 TESTING HIDDEN MARKUP VERIFICATION")
    print("=" * 50)
    
    if not buy_transaction or not sell_transaction:
        log_test("Hidden Markup Verification", "FAIL", "Missing transaction data")
        return False
    
    try:
        # Check if adjusted_price exists and differs from market_price
        buy_price = buy_transaction.get("price")
        sell_price = sell_transaction.get("price")
        market_price = 47500
        
        # Buy should be higher than market (markup)
        buy_markup_applied = buy_price > market_price
        # Sell should be lower than market (markdown)
        sell_markdown_applied = sell_price < market_price
        
        if buy_markup_applied and sell_markdown_applied:
            buy_markup_percent = ((buy_price - market_price) / market_price) * 100
            sell_markdown_percent = ((market_price - sell_price) / market_price) * 100
            
            log_test("Buy Markup Verification", "PASS", 
                   f"Buy markup: {buy_markup_percent:.2f}% (£{market_price} → £{buy_price:.2f})")
            log_test("Sell Markdown Verification", "PASS", 
                   f"Sell markdown: {sell_markdown_percent:.2f}% (£{market_price} → £{sell_price:.2f})")
            
            # Check that markup_percent is not exposed in response
            markup_exposed = "markup_percent" in buy_transaction or "markdown_percent" in sell_transaction
            
            if not markup_exposed:
                log_test("Markup Privacy", "PASS", "Markup percentages not exposed to frontend")
                return True
            else:
                log_test("Markup Privacy", "FAIL", "Markup percentages exposed in response")
                return False
        else:
            log_test("Markup/Markdown Application", "FAIL", 
                   f"Buy markup: {buy_markup_applied}, Sell markdown: {sell_markdown_applied}")
            return False
            
    except Exception as e:
        log_test("Hidden Markup Verification", "FAIL", f"Exception: {str(e)}")
        return False

def test_insufficient_liquidity():
    """Test error handling for insufficient liquidity"""
    print("🔍 TESTING INSUFFICIENT LIQUIDITY ERROR HANDLING")
    print("=" * 50)
    
    # Try to buy a very large amount that should exceed admin liquidity
    large_buy_request = {
        "user_id": TEST_USER_ID,
        "pair": "BTC/GBP",
        "type": "buy",
        "amount": 1000000,  # 1 million BTC - should exceed any liquidity
        "price": 47500
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/trading/execute",
            json=large_buy_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                error_message = data.get("message", "")
                
                if "insufficient" in error_message.lower() or "liquidity" in error_message.lower():
                    log_test("Insufficient Liquidity Error", "PASS", 
                           f"Proper error message: {error_message}")
                    return True
                else:
                    log_test("Insufficient Liquidity Error", "FAIL", 
                           f"Unexpected error message: {error_message}")
                    return False
            else:
                log_test("Insufficient Liquidity Error", "FAIL", 
                       "Transaction succeeded when it should have failed")
                return False
        else:
            log_test("Insufficient Liquidity Error", "FAIL", 
                   f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Insufficient Liquidity Error", "FAIL", f"Exception: {str(e)}")
        return False

def check_database_collections():
    """Check if database collections exist (indirect verification)"""
    print("🔍 TESTING DATABASE STRUCTURE (INDIRECT)")
    print("=" * 50)
    
    # We can't directly access MongoDB, but we can infer from API responses
    # Check if admin liquidity endpoint exists
    try:
        response = requests.get(f"{BACKEND_URL}/api/admin/trading-liquidity")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success") and "liquidity" in data:
                log_test("Admin Liquidity Collection", "PASS", 
                       "admin_liquidity_wallets collection accessible")
                
                # Check if we can see BTC liquidity
                liquidity_data = data["liquidity"]
                btc_liquidity = next((item for item in liquidity_data if item["currency"] == "BTC"), None)
                
                if btc_liquidity:
                    log_test("BTC Liquidity Record", "PASS", 
                           f"BTC available: {btc_liquidity.get('available', 0)}")
                    return True
                else:
                    log_test("BTC Liquidity Record", "FAIL", "No BTC liquidity found")
                    return False
            else:
                log_test("Admin Liquidity Collection", "FAIL", 
                       f"Invalid response: {data}")
                return False
        else:
            log_test("Admin Liquidity Collection", "FAIL", 
                   f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Database Structure Check", "FAIL", f"Exception: {str(e)}")
        return False

def run_comprehensive_test():
    """Run all spot trading execution tests"""
    print("🚀 SPOT TRADING EXECUTION FLOW COMPREHENSIVE TEST")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test User ID: {TEST_USER_ID}")
    print("=" * 60)
    print()
    
    test_results = []
    
    # Test 1: Trading Pairs Endpoint
    pairs_success, pairs_data = test_trading_pairs_endpoint()
    test_results.append(("Trading Pairs", pairs_success))
    
    # Test 2: BUY Execution
    buy_success, buy_transaction = test_buy_execution()
    test_results.append(("BUY Execution", buy_success))
    
    # Test 3: SELL Execution
    sell_success, sell_transaction = test_sell_execution()
    test_results.append(("SELL Execution", sell_success))
    
    # Test 4: Hidden Markup Verification
    if buy_success and sell_success:
        markup_success = test_hidden_markup_verification(buy_transaction, sell_transaction)
        test_results.append(("Hidden Markup", markup_success))
    else:
        test_results.append(("Hidden Markup", False))
    
    # Test 5: Error Handling
    error_success = test_insufficient_liquidity()
    test_results.append(("Error Handling", error_success))
    
    # Test 6: Database Structure
    db_success = check_database_collections()
    test_results.append(("Database Structure", db_success))
    
    # Summary
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed_tests = sum(1 for _, success in test_results if success)
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    for test_name, success in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print()
    print(f"🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
    
    if success_rate >= 80:
        print("🎉 SPOT TRADING EXECUTION FLOW IS OPERATIONAL!")
    elif success_rate >= 60:
        print("⚠️  SPOT TRADING EXECUTION FLOW HAS MINOR ISSUES")
    else:
        print("❌ SPOT TRADING EXECUTION FLOW HAS CRITICAL ISSUES")
    
    return success_rate, test_results

if __name__ == "__main__":
    run_comprehensive_test()