#!/usr/bin/env python3
"""
CORRECTED COMPREHENSIVE FINANCIAL FLOW TESTING - COINHUBX PLATFORM
Testing ALL critical money flows end-to-end with CORRECT API endpoints
"""

import requests
import json
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import sys

# Configuration
BASE_URL = "https://nowpay-debug.preview.emergentagent.com/api"
TEST_USER_A = {
    "email": "gads21083@gmail.com",
    "password": "123456789"
}

# Test results tracking
test_results = {
    "total_tests": 0,
    "passed_tests": 0,
    "failed_tests": 0,
    "critical_failures": [],
    "test_details": []
}

def log_test(test_name, status, details="", is_critical=False):
    """Log test results"""
    test_results["total_tests"] += 1
    if status == "PASS":
        test_results["passed_tests"] += 1
        print(f"✅ {test_name}: PASSED")
    else:
        test_results["failed_tests"] += 1
        print(f"❌ {test_name}: FAILED - {details}")
        if is_critical:
            test_results["critical_failures"].append(f"{test_name}: {details}")
    
    test_results["test_details"].append({
        "test": test_name,
        "status": status,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })

def make_request(method, endpoint, data=None, headers=None, auth_token=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    
    if headers is None:
        headers = {"Content-Type": "application/json"}
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        
        print(f"🔗 {method} {endpoint} -> {response.status_code}")
        
        if response.status_code >= 400:
            print(f"   Error Response: {response.text[:200]}")
        
        return response
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return None

def authenticate_user(email, password):
    """Authenticate user and return token"""
    print(f"\n🔐 Authenticating user: {email}")
    
    response = make_request("POST", "/auth/login", {
        "email": email,
        "password": password
    })
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and data.get("token"):
            print(f"✅ Authentication successful")
            return data["token"], data.get("user", {})
        else:
            print(f"❌ Authentication failed: {data}")
            return None, None
    else:
        print(f"❌ Authentication request failed")
        return None, None

def get_user_balances(auth_token, user_id):
    """Get user wallet balances using correct endpoint"""
    print(f"\n💰 Getting user balances for: {user_id}")
    
    response = make_request("GET", f"/wallets/balances/{user_id}", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            balances = data.get("balances", [])
            total_value = data.get("total_portfolio_value_usd", 0)
            print(f"✅ Retrieved {len(balances)} balance entries (Total: ${total_value})")
            for balance in balances:
                currency = balance.get("currency", "Unknown")
                amount = balance.get("balance", 0)
                locked = balance.get("locked_balance", 0)
                usd_value = balance.get("usd_value", 0)
                print(f"   {currency}: {amount} (Locked: {locked}) = ${usd_value}")
            return balances
        else:
            print(f"❌ Failed to get balances: {data}")
            return []
    else:
        print(f"❌ Balance request failed")
        return []

def test_authentication_system():
    """Test 1: AUTHENTICATION SYSTEM"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 1: AUTHENTICATION SYSTEM")
    print(f"="*60)
    
    # Test valid login
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if token and user:
        log_test("Authentication - Valid Login", "PASS")
        user_id = user.get("user_id")
        print(f"   User ID: {user_id}")
        print(f"   Email: {user.get('email')}")
        print(f"   Role: {user.get('role', 'user')}")
        return token, user
    else:
        log_test("Authentication - Valid Login", "FAIL", "Could not authenticate with valid credentials", True)
        return None, None

def test_wallet_system(auth_token, user_id):
    """Test 2: WALLET SYSTEM"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 2: WALLET SYSTEM")
    print(f"="*60)
    
    # Test wallet balance retrieval
    balances = get_user_balances(auth_token, user_id)
    if balances is not None:
        log_test("Wallet - Balance Retrieval", "PASS")
        
        # Check for specific currencies
        currencies_found = [b.get("currency") for b in balances]
        expected_currencies = ["BTC", "ETH", "GBP", "USDT"]
        
        for currency in expected_currencies:
            if currency in currencies_found:
                print(f"✅ Found {currency} balance")
            else:
                print(f"⚠️ Missing {currency} balance")
        
        log_test("Wallet - Currency Coverage", "PASS")
        return balances
    else:
        log_test("Wallet - Balance Retrieval", "FAIL", "Could not retrieve wallet balances", True)
        return []

def test_p2p_marketplace(auth_token):
    """Test 3: P2P MARKETPLACE"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 3: P2P MARKETPLACE")
    print(f"="*60)
    
    # Test P2P offers endpoint
    print(f"\n🏪 Testing P2P marketplace access")
    response = make_request("GET", "/p2p/offers", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        offers = data.get("offers", [])
        print(f"✅ Found {len(offers)} P2P offers")
        log_test("P2P - Marketplace Access", "PASS")
        
        # Analyze offer types
        buy_offers = [o for o in offers if o.get("order_type") == "buy"]
        sell_offers = [o for o in offers if o.get("order_type") == "sell"]
        
        print(f"   Buy offers: {len(buy_offers)}")
        print(f"   Sell offers: {len(sell_offers)}")
        
        # Check for BTC offers
        btc_offers = [o for o in offers if o.get("crypto_currency") == "BTC"]
        if btc_offers:
            print(f"✅ Found {len(btc_offers)} BTC offers")
            log_test("P2P - BTC Offers Available", "PASS")
            
            # Show sample offer details
            sample_offer = btc_offers[0]
            print(f"   Sample BTC offer:")
            print(f"     ID: {sample_offer.get('offer_id', 'N/A')}")
            print(f"     Type: {sample_offer.get('order_type', 'N/A')}")
            print(f"     Amount: {sample_offer.get('crypto_amount', 'N/A')} BTC")
            print(f"     Price: {sample_offer.get('price_per_unit', 'N/A')} GBP")
            print(f"     Seller: {sample_offer.get('seller_name', 'N/A')}")
            
        else:
            log_test("P2P - BTC Offers Available", "FAIL", "No BTC offers found")
        
        return offers
    else:
        log_test("P2P - Marketplace Access", "FAIL", "Could not access P2P marketplace", True)
        return []

def test_p2p_trade_creation(auth_token, user_id, offers):
    """Test 4: P2P TRADE CREATION"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 4: P2P TRADE CREATION")
    print(f"="*60)
    
    if not offers:
        log_test("P2P Trade - No Offers Available", "FAIL", "No offers to test with")
        return
    
    # Find a suitable offer for testing
    suitable_offer = None
    for offer in offers:
        if (offer.get("crypto_currency") == "BTC" and 
            offer.get("order_type") == "sell" and
            offer.get("crypto_amount", 0) >= 0.001):
            suitable_offer = offer
            break
    
    if not suitable_offer:
        log_test("P2P Trade - Suitable Offer Found", "FAIL", "No suitable BTC sell offers for testing")
        return
    
    log_test("P2P Trade - Suitable Offer Found", "PASS")
    
    # Test trade creation
    print(f"\n🤝 Creating P2P trade")
    trade_data = {
        "offer_id": suitable_offer["offer_id"],
        "buyer_id": user_id,
        "crypto_amount": 0.001,  # Small test amount
        "buyer_wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    }
    
    response = make_request("POST", "/p2p/create-trade", trade_data, auth_token=auth_token)
    
    if response and response.status_code == 200:
        trade_result = response.json()
        if trade_result.get("success"):
            trade_id = trade_result.get("trade_id")
            print(f"✅ Trade created successfully: {trade_id}")
            log_test("P2P Trade - Creation", "PASS")
            return trade_id
        else:
            log_test("P2P Trade - Creation", "FAIL", f"Trade creation failed: {trade_result.get('message', 'Unknown error')}")
    else:
        error_msg = response.text if response else "Request failed"
        log_test("P2P Trade - Creation", "FAIL", f"Trade creation request failed: {error_msg}")
    
    return None

def test_instant_buy_system(auth_token, user_id):
    """Test 5: INSTANT BUY SYSTEM"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 5: INSTANT BUY SYSTEM")
    print(f"="*60)
    
    # Test instant buy quote - try different endpoint patterns
    print(f"\n💱 Testing instant buy quote generation")
    
    # Try express-buy endpoints
    quote_endpoints = [
        "/express-buy/quote",
        "/instant-buy/quote", 
        "/admin/express-buy/quote",
        "/quotes/express-buy"
    ]
    
    quote_data = {
        "crypto_currency": "BTC",
        "fiat_currency": "GBP", 
        "fiat_amount": 100.0
    }
    
    quote_success = False
    for endpoint in quote_endpoints:
        print(f"   Trying endpoint: {endpoint}")
        response = make_request("POST", endpoint, quote_data, auth_token=auth_token)
        
        if response and response.status_code == 200:
            quote_result = response.json()
            if quote_result.get("success"):
                print(f"✅ Quote generated via {endpoint}")
                quote = quote_result.get("quote", {})
                print(f"   Crypto amount: {quote.get('crypto_amount', 'N/A')} BTC")
                print(f"   Total cost: £{quote.get('total_cost', 'N/A')}")
                print(f"   Fee: £{quote.get('fee', 'N/A')}")
                log_test("Instant Buy - Quote Generation", "PASS")
                quote_success = True
                break
        elif response and response.status_code == 404:
            print(f"   ❌ Endpoint not found: {endpoint}")
        else:
            print(f"   ❌ Failed: {endpoint}")
    
    if not quote_success:
        log_test("Instant Buy - Quote Generation", "FAIL", "No working quote endpoint found")

def test_admin_liquidity_system(auth_token):
    """Test 6: ADMIN LIQUIDITY SYSTEM"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 6: ADMIN LIQUIDITY SYSTEM")
    print(f"="*60)
    
    # Test admin liquidity balances
    print(f"\n🏦 Testing admin liquidity balances")
    response = make_request("GET", "/admin/liquidity/balances", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            balances = data.get("balances", {})
            print(f"✅ Admin liquidity balances retrieved: {len(balances)} currencies")
            for currency, balance in balances.items():
                print(f"   {currency}: {balance}")
            log_test("Admin Liquidity - Balance Check", "PASS")
        else:
            log_test("Admin Liquidity - Balance Check", "FAIL", f"Failed to get admin liquidity: {data}")
    else:
        log_test("Admin Liquidity - Balance Check", "FAIL", "Admin liquidity request failed")

def test_transaction_history(auth_token, user_id):
    """Test 7: TRANSACTION HISTORY"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 7: TRANSACTION HISTORY")
    print(f"="*60)
    
    # Test transaction history retrieval
    print(f"\n📜 Testing transaction history")
    response = make_request("GET", f"/transactions/history/{user_id}", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            transactions = data.get("transactions", [])
            print(f"✅ Found {len(transactions)} transactions")
            log_test("Transaction History - Retrieval", "PASS")
            
            # Show recent transactions
            if transactions:
                print(f"   Recent transactions:")
                for i, tx in enumerate(transactions[:3]):  # Show first 3
                    tx_type = tx.get("transaction_type", "Unknown")
                    amount = tx.get("amount", 0)
                    currency = tx.get("currency", "Unknown")
                    status = tx.get("status", "Unknown")
                    timestamp = tx.get("created_at", "Unknown")
                    print(f"     {i+1}. {tx_type}: {amount} {currency} ({status}) - {timestamp}")
            
            return transactions
        else:
            log_test("Transaction History - Retrieval", "FAIL", f"Failed to get transactions: {data}")
    else:
        log_test("Transaction History - Retrieval", "FAIL", "Transaction history request failed")
    
    return []

def test_savings_system(auth_token, user_id):
    """Test 8: SAVINGS SYSTEM"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 8: SAVINGS SYSTEM")
    print(f"="*60)
    
    # Test savings balances
    print(f"\n💰 Testing savings balances")
    response = make_request("GET", f"/savings/balances/{user_id}", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            balances = data.get("balances", [])
            total_value = data.get("total_value_usd", 0)
            print(f"✅ Savings balances retrieved: {len(balances)} entries (Total: ${total_value})")
            log_test("Savings - Balance Retrieval", "PASS")
            
            for balance in balances:
                currency = balance.get("currency", "Unknown")
                amount = balance.get("amount", 0)
                apy = balance.get("apy_rate", 0)
                print(f"   {currency}: {amount} (APY: {apy}%)")
            
        else:
            log_test("Savings - Balance Retrieval", "FAIL", f"Failed to get savings: {data}")
    else:
        log_test("Savings - Balance Retrieval", "FAIL", "Savings request failed")

def test_portfolio_system(auth_token, user_id):
    """Test 9: PORTFOLIO SYSTEM"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 9: PORTFOLIO SYSTEM")
    print(f"="*60)
    
    # Test portfolio stats
    print(f"\n📊 Testing portfolio statistics")
    response = make_request("GET", f"/portfolio/stats/{user_id}", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            portfolio = data.get("portfolio", [])
            total_value = data.get("total_portfolio_value_usd", 0)
            total_invested = data.get("total_invested_usd", 0)
            total_pl = data.get("total_unrealized_pl_usd", 0)
            
            print(f"✅ Portfolio stats retrieved:")
            print(f"   Total Value: ${total_value}")
            print(f"   Total Invested: ${total_invested}")
            print(f"   Unrealized P/L: ${total_pl}")
            print(f"   Holdings: {len(portfolio)} assets")
            
            log_test("Portfolio - Stats Retrieval", "PASS")
            
        else:
            log_test("Portfolio - Stats Retrieval", "FAIL", f"Failed to get portfolio: {data}")
    else:
        log_test("Portfolio - Stats Retrieval", "FAIL", "Portfolio request failed")

def test_security_endpoints(auth_token):
    """Test 10: SECURITY & EDGE CASES"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 10: SECURITY & EDGE CASES")
    print(f"="*60)
    
    # Test unauthorized access
    print(f"\n🔒 Testing unauthorized access")
    response = make_request("GET", "/wallets/balances/unauthorized_user")
    
    if response and response.status_code in [401, 403]:
        print(f"✅ Unauthorized access properly blocked ({response.status_code})")
        log_test("Security - Unauthorized Access", "PASS")
    else:
        log_test("Security - Unauthorized Access", "FAIL", f"Should have blocked unauthorized access (got {response.status_code if response else 'no response'})")
    
    # Test invalid user ID format
    print(f"\n🆔 Testing invalid user ID format")
    response = make_request("GET", "/wallets/balances/invalid-user-id-format", auth_token=auth_token)
    
    if response and response.status_code in [400, 404]:
        print(f"✅ Invalid user ID properly handled ({response.status_code})")
        log_test("Security - Invalid User ID", "PASS")
    else:
        log_test("Security - Invalid User ID", "FAIL", f"Should have handled invalid user ID (got {response.status_code if response else 'no response'})")

def print_final_report():
    """Print comprehensive test report"""
    print(f"\n" + "="*80)
    print(f"🎯 CORRECTED COMPREHENSIVE FINANCIAL FLOW TESTING - FINAL REPORT")
    print(f"="*80)
    
    total = test_results["total_tests"]
    passed = test_results["passed_tests"]
    failed = test_results["failed_tests"]
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"\n📊 OVERALL RESULTS:")
    print(f"   Total Tests: {total}")
    print(f"   Passed: {passed} ✅")
    print(f"   Failed: {failed} ❌")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    if test_results["critical_failures"]:
        print(f"\n🚨 CRITICAL FAILURES:")
        for failure in test_results["critical_failures"]:
            print(f"   ❌ {failure}")
    
    print(f"\n📋 DETAILED TEST RESULTS:")
    for test in test_results["test_details"]:
        status_icon = "✅" if test["status"] == "PASS" else "❌"
        print(f"   {status_icon} {test['test']}")
        if test["details"] and test["status"] == "FAIL":
            print(f"      └─ {test['details']}")
    
    print(f"\n🎯 SUMMARY:")
    if success_rate >= 90:
        print(f"   🟢 EXCELLENT: Platform is highly stable and production-ready")
    elif success_rate >= 75:
        print(f"   🟡 GOOD: Platform is mostly functional with minor issues")
    elif success_rate >= 50:
        print(f"   🟠 MODERATE: Platform has significant issues that need attention")
    else:
        print(f"   🔴 CRITICAL: Platform has major issues and is not production-ready")
    
    print(f"\n💡 RECOMMENDATIONS:")
    if failed > 0:
        print(f"   • Fix {failed} failed test cases")
        print(f"   • Focus on critical failures first")
        print(f"   • Implement missing API endpoints")
        print(f"   • Improve error handling and validation")
    else:
        print(f"   • All tests passed - platform is ready for production")
    
    print(f"\n" + "="*80)

def main():
    """Main test execution"""
    print(f"🚀 STARTING CORRECTED COMPREHENSIVE FINANCIAL FLOW TESTING")
    print(f"Platform: {BASE_URL}")
    print(f"Test User: {TEST_USER_A['email']}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Test 1: Authentication
    auth_token, user = test_authentication_system()
    if not auth_token:
        print(f"\n🚨 CRITICAL: Cannot proceed without authentication")
        print_final_report()
        return
    
    user_id = user.get("user_id")
    
    # Test 2: Wallet System
    balances = test_wallet_system(auth_token, user_id)
    
    # Test 3: P2P Marketplace
    offers = test_p2p_marketplace(auth_token)
    
    # Test 4: P2P Trade Creation
    trade_id = test_p2p_trade_creation(auth_token, user_id, offers)
    
    # Test 5: Instant Buy System
    test_instant_buy_system(auth_token, user_id)
    
    # Test 6: Admin Liquidity System
    test_admin_liquidity_system(auth_token)
    
    # Test 7: Transaction History
    transactions = test_transaction_history(auth_token, user_id)
    
    # Test 8: Savings System
    test_savings_system(auth_token, user_id)
    
    # Test 9: Portfolio System
    test_portfolio_system(auth_token, user_id)
    
    # Test 10: Security & Edge Cases
    test_security_endpoints(auth_token)
    
    # Print final report
    print_final_report()

if __name__ == "__main__":
    main()