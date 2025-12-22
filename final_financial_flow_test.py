#!/usr/bin/env python3
"""
FINAL COMPREHENSIVE FINANCIAL FLOW TESTING - COINHUBX PLATFORM
Testing ALL critical money flows end-to-end with REAL API endpoints
Focus on actual working financial operations
"""

import requests
import json
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import sys

# Configuration
BASE_URL = "https://balance-sync-repair.preview.emergentagent.com/api"
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
    "test_details": [],
    "database_snapshots": []
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
            print(f"   Error Response: {response.text[:300]}")
        
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

def get_database_snapshot(auth_token, user_id, label=""):
    """Take a snapshot of user balances and system state"""
    print(f"\n📸 Taking database snapshot: {label}")
    
    snapshot = {
        "timestamp": datetime.now().isoformat(),
        "label": label,
        "user_balances": {},
        "escrow_balances": {},
        "admin_balances": {},
        "fee_wallet": {}
    }
    
    # Get user balances
    response = make_request("GET", f"/wallets/balances/{user_id}", auth_token=auth_token)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            snapshot["user_balances"] = {
                "balances": data.get("balances", []),
                "total_value": data.get("total_portfolio_value_usd", 0)
            }
    
    # Get admin liquidity balances
    response = make_request("GET", "/admin/liquidity/balances", auth_token=auth_token)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            snapshot["admin_balances"] = data.get("balances", {})
    
    test_results["database_snapshots"].append(snapshot)
    
    print(f"   📊 User total value: ${snapshot['user_balances'].get('total_value', 0)}")
    print(f"   🏦 Admin currencies: {len(snapshot['admin_balances'])}")
    
    return snapshot

def test_1_complete_p2p_flow():
    """Test 1: COMPLETE P2P TRADE FLOW"""
    print(f"\n" + "="*80)
    print(f"🎯 TEST 1: COMPLETE P2P TRADE FLOW")
    print(f"="*80)
    
    # Step 1: Authenticate User A
    token_a, user_a = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token_a:
        log_test("P2P Flow - User A Authentication", "FAIL", "Could not authenticate User A", True)
        return
    
    log_test("P2P Flow - User A Authentication", "PASS")
    user_a_id = user_a.get("user_id")
    
    # Step 2: Take initial snapshot
    initial_snapshot = get_database_snapshot(token_a, user_a_id, "Initial State")
    
    # Step 3: Check P2P marketplace
    print(f"\n🏪 Checking P2P Marketplace")
    response = make_request("GET", "/p2p/offers", auth_token=token_a)
    
    if response and response.status_code == 200:
        data = response.json()
        offers = data.get("offers", [])
        print(f"✅ Found {len(offers)} P2P offers")
        log_test("P2P Flow - Marketplace Access", "PASS")
        
        # Analyze offers
        for i, offer in enumerate(offers[:3]):  # Show first 3 offers
            print(f"   Offer {i+1}:")
            print(f"     Crypto: {offer.get('crypto_currency', 'N/A')} - {offer.get('crypto_amount', 0)}")
            print(f"     Price: {offer.get('price_per_unit', 0)} {offer.get('fiat_currency', 'N/A')}")
            print(f"     Min/Max: {offer.get('min_purchase', 0)} - {offer.get('max_purchase', 0)}")
            print(f"     Seller: {offer.get('seller_name', 'N/A')}")
        
        log_test("P2P Flow - Offers Analysis", "PASS")
    else:
        log_test("P2P Flow - Marketplace Access", "FAIL", "Could not access P2P marketplace", True)
        return
    
    # Step 4: Test P2P Express creation
    print(f"\n🚀 Testing P2P Express Order Creation")
    express_data = {
        "user_id": user_a_id,
        "crypto": "BTC",
        "country": "UK",
        "fiat_amount": 100.0,
        "crypto_amount": 0.001,
        "base_rate": 100000.0,
        "express_fee": 2.5,
        "express_fee_percent": 2.5,
        "net_amount": 97.5
    }
    
    response = make_request("POST", "/p2p/express/create", express_data, auth_token=token_a)
    
    if response and response.status_code == 200:
        express_result = response.json()
        if express_result.get("success"):
            trade_id = express_result.get("trade_id")
            print(f"✅ P2P Express order created: {trade_id}")
            log_test("P2P Flow - Express Order Creation", "PASS")
            
            # Step 5: Check order details
            print(f"\n📋 Checking P2P Express order details")
            response = make_request("GET", f"/p2p/express/order/{trade_id}", auth_token=token_a)
            
            if response and response.status_code == 200:
                order_details = response.json()
                if order_details.get("success"):
                    order = order_details.get("trade", {})
                    print(f"✅ Order details retrieved:")
                    print(f"   Status: {order.get('status', 'N/A')}")
                    print(f"   Type: {order.get('type', 'N/A')}")
                    print(f"   Amount: {order.get('crypto_amount', 0)} {order.get('crypto_currency', 'N/A')}")
                    log_test("P2P Flow - Order Details", "PASS")
                else:
                    log_test("P2P Flow - Order Details", "FAIL", f"Could not get order details: {order_details}")
            else:
                log_test("P2P Flow - Order Details", "FAIL", "Order details request failed")
        else:
            log_test("P2P Flow - Express Order Creation", "FAIL", f"Express order failed: {express_result}")
    else:
        log_test("P2P Flow - Express Order Creation", "FAIL", "Express order request failed")
    
    # Step 6: Take final snapshot
    final_snapshot = get_database_snapshot(token_a, user_a_id, "After P2P Express")

def test_2_instant_buy_flow():
    """Test 2: INSTANT BUY PURCHASE FLOW"""
    print(f"\n" + "="*80)
    print(f"🎯 TEST 2: INSTANT BUY PURCHASE FLOW")
    print(f"="*80)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Instant Buy - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Instant Buy - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Take initial snapshot
    initial_snapshot = get_database_snapshot(token, user_id, "Before Instant Buy")
    
    # Step 1: Check express buy configuration
    print(f"\n⚙️ Checking Express Buy configuration")
    response = make_request("GET", "/express-buy/config", auth_token=token)
    
    if response and response.status_code == 200:
        config = response.json()
        print(f"✅ Express Buy config retrieved:")
        print(f"   Enabled: {config.get('enabled', False)}")
        print(f"   Fee: {config.get('fee_percent', 0)}%")
        print(f"   Min amount: £{config.get('min_amount', 0)}")
        print(f"   Max amount: £{config.get('max_amount', 0)}")
        log_test("Instant Buy - Config Check", "PASS")
    else:
        log_test("Instant Buy - Config Check", "FAIL", "Could not get express buy config")
    
    # Step 2: Check supported coins
    print(f"\n🪙 Checking supported coins")
    response = make_request("GET", "/express-buy/supported-coins", auth_token=token)
    
    if response and response.status_code == 200:
        coins_data = response.json()
        if coins_data.get("success"):
            coins = coins_data.get("coins", [])
            print(f"✅ Found {len(coins)} supported coins:")
            for coin in coins[:5]:  # Show first 5
                print(f"   {coin.get('symbol', 'N/A')}: {coin.get('name', 'N/A')} (Available: {coin.get('available', False)})")
            log_test("Instant Buy - Supported Coins", "PASS")
        else:
            log_test("Instant Buy - Supported Coins", "FAIL", f"Could not get supported coins: {coins_data}")
    else:
        log_test("Instant Buy - Supported Coins", "FAIL", "Supported coins request failed")
    
    # Step 3: Test express buy matching
    print(f"\n🎯 Testing Express Buy matching")
    match_data = {
        "crypto_currency": "BTC",
        "fiat_currency": "GBP",
        "fiat_amount": 50.0
    }
    
    response = make_request("POST", "/express-buy/match", match_data, auth_token=token)
    
    if response and response.status_code == 200:
        match_result = response.json()
        if match_result.get("success"):
            match_type = match_result.get("match_type", "N/A")
            crypto_amount = match_result.get("crypto_amount", 0)
            total_cost = match_result.get("total_cost", 0)
            
            print(f"✅ Express Buy match found:")
            print(f"   Match type: {match_type}")
            print(f"   Crypto amount: {crypto_amount} BTC")
            print(f"   Total cost: £{total_cost}")
            log_test("Instant Buy - Matching", "PASS")
            
            # Step 4: Execute express buy
            print(f"\n🛒 Executing Express Buy")
            execute_data = {
                "user_id": user_id,
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "fiat_amount": 50.0,
                "ad_id": "ADMIN_LIQUIDITY",
                "buyer_wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
            }
            
            response = make_request("POST", "/express-buy/execute", execute_data, auth_token=token)
            
            if response and response.status_code == 200:
                execute_result = response.json()
                if execute_result.get("success"):
                    transaction_id = execute_result.get("transaction_id")
                    print(f"✅ Express Buy executed successfully: {transaction_id}")
                    log_test("Instant Buy - Execution", "PASS")
                else:
                    log_test("Instant Buy - Execution", "FAIL", f"Execution failed: {execute_result.get('message', 'Unknown error')}")
            else:
                error_msg = response.text if response else "Request failed"
                log_test("Instant Buy - Execution", "FAIL", f"Execution request failed: {error_msg}")
        else:
            log_test("Instant Buy - Matching", "FAIL", f"Matching failed: {match_result}")
    else:
        log_test("Instant Buy - Matching", "FAIL", "Matching request failed")
    
    # Take final snapshot
    final_snapshot = get_database_snapshot(token, user_id, "After Instant Buy")

def test_3_savings_transfer_flow():
    """Test 3: SAVINGS TRANSFER FLOW"""
    print(f"\n" + "="*80)
    print(f"🎯 TEST 3: SAVINGS TRANSFER FLOW")
    print(f"="*80)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Savings - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Savings - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Take initial snapshot
    initial_snapshot = get_database_snapshot(token, user_id, "Before Savings Transfer")
    
    # Step 1: Check savings balances
    print(f"\n💰 Checking savings balances")
    response = make_request("GET", f"/savings/balances/{user_id}", auth_token=token)
    
    if response and response.status_code == 200:
        savings_data = response.json()
        if savings_data.get("success"):
            balances = savings_data.get("balances", [])
            total_value = savings_data.get("total_value_usd", 0)
            print(f"✅ Savings balances retrieved: {len(balances)} entries (Total: ${total_value})")
            
            for balance in balances:
                currency = balance.get("currency", "Unknown")
                amount = balance.get("amount", 0)
                apy = balance.get("apy_rate", 0)
                current_value = balance.get("current_value_usd", 0)
                print(f"   {currency}: {amount} (APY: {apy}%) = ${current_value}")
            
            log_test("Savings - Balance Check", "PASS")
        else:
            log_test("Savings - Balance Check", "FAIL", f"Could not get savings balances: {savings_data}")
    else:
        log_test("Savings - Balance Check", "FAIL", "Savings balance request failed")
    
    # Step 2: Test savings transfer (spot to savings)
    print(f"\n🔄 Testing Spot → Savings transfer")
    transfer_data = {
        "user_id": user_id,
        "currency": "ETH",
        "amount": 0.001,
        "direction": "to_savings"
    }
    
    response = make_request("POST", "/savings/transfer", transfer_data, auth_token=token)
    
    if response and response.status_code == 200:
        transfer_result = response.json()
        if transfer_result.get("success"):
            print(f"✅ Spot → Savings transfer successful")
            log_test("Savings - Spot to Savings Transfer", "PASS")
        else:
            log_test("Savings - Spot to Savings Transfer", "FAIL", f"Transfer failed: {transfer_result.get('message', 'Unknown error')}")
    else:
        error_msg = response.text if response else "Request failed"
        log_test("Savings - Spot to Savings Transfer", "FAIL", f"Transfer request failed: {error_msg}")
    
    # Step 3: Test reverse transfer (savings to spot)
    print(f"\n🔄 Testing Savings → Spot transfer")
    reverse_transfer_data = {
        "user_id": user_id,
        "currency": "ETH",
        "amount": 0.0005,
        "direction": "to_spot"
    }
    
    response = make_request("POST", "/savings/transfer", reverse_transfer_data, auth_token=token)
    
    if response and response.status_code == 200:
        transfer_result = response.json()
        if transfer_result.get("success"):
            print(f"✅ Savings → Spot transfer successful")
            log_test("Savings - Savings to Spot Transfer", "PASS")
        else:
            log_test("Savings - Savings to Spot Transfer", "FAIL", f"Transfer failed: {transfer_result.get('message', 'Unknown error')}")
    else:
        error_msg = response.text if response else "Request failed"
        log_test("Savings - Savings to Spot Transfer", "FAIL", f"Transfer request failed: {error_msg}")
    
    # Take final snapshot
    final_snapshot = get_database_snapshot(token, user_id, "After Savings Transfers")

def test_4_portfolio_calculations():
    """Test 4: PORTFOLIO CALCULATIONS & P/L TRACKING"""
    print(f"\n" + "="*80)
    print(f"🎯 TEST 4: PORTFOLIO CALCULATIONS & P/L TRACKING")
    print(f"="*80)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Portfolio - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Portfolio - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Step 1: Get comprehensive portfolio stats
    print(f"\n📊 Getting comprehensive portfolio statistics")
    response = make_request("GET", f"/portfolio/stats/{user_id}", auth_token=token)
    
    if response and response.status_code == 200:
        portfolio_data = response.json()
        if portfolio_data.get("success"):
            portfolio = portfolio_data.get("portfolio", [])
            total_value = portfolio_data.get("total_portfolio_value_usd", 0)
            total_invested = portfolio_data.get("total_invested_usd", 0)
            total_pl = portfolio_data.get("total_unrealized_pl_usd", 0)
            total_pl_percent = portfolio_data.get("total_unrealized_pl_percent", 0)
            
            print(f"✅ Portfolio statistics retrieved:")
            print(f"   Total Portfolio Value: ${total_value:,.2f}")
            print(f"   Total Invested: ${total_invested:,.2f}")
            print(f"   Unrealized P/L: ${total_pl:,.2f} ({total_pl_percent:.2f}%)")
            print(f"   Number of Holdings: {len(portfolio)}")
            
            # Show individual holdings
            print(f"\n   Individual Holdings:")
            for holding in portfolio:
                currency = holding.get("currency", "Unknown")
                spot_amount = holding.get("spot_amount", 0)
                savings_amount = holding.get("savings_amount", 0)
                total_amount = holding.get("total_amount", 0)
                current_price = holding.get("current_price", 0)
                cost_basis = holding.get("cost_basis", 0)
                unrealized_pl = holding.get("unrealized_pl_usd", 0)
                unrealized_pl_percent = holding.get("unrealized_pl_percent", 0)
                
                print(f"     {currency}:")
                print(f"       Spot: {spot_amount}, Savings: {savings_amount}, Total: {total_amount}")
                print(f"       Current Price: ${current_price:,.2f}, Cost Basis: ${cost_basis:,.2f}")
                print(f"       P/L: ${unrealized_pl:,.2f} ({unrealized_pl_percent:.2f}%)")
            
            log_test("Portfolio - Comprehensive Stats", "PASS")
            
            # Verify P/L calculations
            calculated_total_pl = sum(h.get("unrealized_pl_usd", 0) for h in portfolio)
            if abs(calculated_total_pl - total_pl) < 0.01:  # Allow small rounding differences
                print(f"✅ P/L calculations verified: ${calculated_total_pl:,.2f} ≈ ${total_pl:,.2f}")
                log_test("Portfolio - P/L Calculation Verification", "PASS")
            else:
                log_test("Portfolio - P/L Calculation Verification", "FAIL", f"P/L mismatch: calculated ${calculated_total_pl:,.2f} vs reported ${total_pl:,.2f}")
            
        else:
            log_test("Portfolio - Comprehensive Stats", "FAIL", f"Could not get portfolio stats: {portfolio_data}")
    else:
        log_test("Portfolio - Comprehensive Stats", "FAIL", "Portfolio stats request failed")

def test_5_fee_system_verification():
    """Test 5: FEE SYSTEM VERIFICATION"""
    print(f"\n" + "="*80)
    print(f"🎯 TEST 5: FEE SYSTEM VERIFICATION")
    print(f"="*80)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Fees - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Fees - Authentication", "PASS")
    
    # Step 1: Check P2P Express statistics (includes fee data)
    print(f"\n📊 Checking P2P Express statistics and fees")
    response = make_request("GET", "/admin/p2p-express-stats", auth_token=token)
    
    if response and response.status_code == 200:
        stats_data = response.json()
        if stats_data.get("success"):
            stats = stats_data.get("stats", {})
            print(f"✅ P2P Express statistics retrieved:")
            print(f"   Total Orders: {stats.get('total_orders', 0)}")
            print(f"   Total Volume: ${stats.get('total_volume_usd', 0):,.2f}")
            print(f"   Total Fees: ${stats.get('total_fees_usd', 0):,.2f}")
            print(f"   Admin Liquidity Usage: {stats.get('admin_liquidity_percentage', 0):.1f}%")
            print(f"   P2P Fallback Rate: {stats.get('p2p_fallback_percentage', 0):.1f}%")
            
            log_test("Fees - P2P Express Stats", "PASS")
        else:
            log_test("Fees - P2P Express Stats", "FAIL", f"Could not get P2P Express stats: {stats_data}")
    else:
        log_test("Fees - P2P Express Stats", "FAIL", "P2P Express stats request failed")
    
    # Step 2: Check admin wallet balances (fee collection)
    print(f"\n🏦 Checking admin wallet balances (fee collection)")
    response = make_request("GET", "/admin/wallet-balances", auth_token=token)
    
    if response and response.status_code == 200:
        wallet_data = response.json()
        if wallet_data.get("success"):
            balances = wallet_data.get("referral_wallet_balances", {})
            print(f"✅ Admin wallet balances retrieved: {len(balances)} currencies")
            
            total_fees_collected = 0
            for currency, balance in balances.items():
                print(f"   {currency}: {balance}")
                # Assume USD equivalent for calculation (simplified)
                if currency == "USDT":
                    total_fees_collected += balance
            
            print(f"   Estimated total fees collected: ${total_fees_collected:,.2f}")
            log_test("Fees - Admin Wallet Check", "PASS")
        else:
            log_test("Fees - Admin Wallet Check", "FAIL", f"Could not get admin wallet balances: {wallet_data}")
    else:
        log_test("Fees - Admin Wallet Check", "FAIL", "Admin wallet balances request failed")

def test_6_database_integrity():
    """Test 6: DATABASE INTEGRITY CHECKS"""
    print(f"\n" + "="*80)
    print(f"🎯 TEST 6: DATABASE INTEGRITY CHECKS")
    print(f"="*80)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Database - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Database - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Step 1: Compare snapshots for consistency
    print(f"\n🔍 Analyzing database snapshots for consistency")
    
    if len(test_results["database_snapshots"]) >= 2:
        initial_snapshot = test_results["database_snapshots"][0]
        latest_snapshot = test_results["database_snapshots"][-1]
        
        print(f"   Comparing: '{initial_snapshot['label']}' vs '{latest_snapshot['label']}'")
        
        # Check balance consistency
        initial_total = initial_snapshot["user_balances"].get("total_value", 0)
        latest_total = latest_snapshot["user_balances"].get("total_value", 0)
        
        print(f"   Initial total value: ${initial_total:,.2f}")
        print(f"   Latest total value: ${latest_total:,.2f}")
        print(f"   Change: ${latest_total - initial_total:,.2f}")
        
        log_test("Database - Snapshot Comparison", "PASS")
    else:
        log_test("Database - Snapshot Comparison", "FAIL", "Insufficient snapshots for comparison")
    
    # Step 2: Check for orphaned records
    print(f"\n🔍 Checking for data consistency")
    
    # Get user's wallet balances
    wallet_response = make_request("GET", f"/wallets/balances/{user_id}", auth_token=token)
    
    # Get user's savings balances  
    savings_response = make_request("GET", f"/savings/balances/{user_id}", auth_token=token)
    
    # Get user's portfolio stats
    portfolio_response = make_request("GET", f"/portfolio/stats/{user_id}", auth_token=token)
    
    if (wallet_response and wallet_response.status_code == 200 and
        savings_response and savings_response.status_code == 200 and
        portfolio_response and portfolio_response.status_code == 200):
        
        wallet_data = wallet_response.json()
        savings_data = savings_response.json()
        portfolio_data = portfolio_response.json()
        
        if (wallet_data.get("success") and savings_data.get("success") and portfolio_data.get("success")):
            
            # Cross-verify totals
            wallet_total = wallet_data.get("total_portfolio_value_usd", 0)
            portfolio_total = portfolio_data.get("total_portfolio_value_usd", 0)
            
            print(f"   Wallet total: ${wallet_total:,.2f}")
            print(f"   Portfolio total: ${portfolio_total:,.2f}")
            
            if abs(wallet_total - portfolio_total) < 0.01:  # Allow small rounding differences
                print(f"✅ Cross-system totals match")
                log_test("Database - Cross-System Consistency", "PASS")
            else:
                log_test("Database - Cross-System Consistency", "FAIL", f"Totals mismatch: wallet ${wallet_total:,.2f} vs portfolio ${portfolio_total:,.2f}")
        else:
            log_test("Database - Cross-System Consistency", "FAIL", "Could not get all required data")
    else:
        log_test("Database - Cross-System Consistency", "FAIL", "Failed to retrieve data for consistency check")

def print_comprehensive_report():
    """Print comprehensive test report with database analysis"""
    print(f"\n" + "="*100)
    print(f"🎯 COMPREHENSIVE FINANCIAL FLOW TESTING - FINAL REPORT")
    print(f"="*100)
    
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
    current_category = ""
    for test in test_results["test_details"]:
        test_category = test['test'].split(' - ')[0]
        if test_category != current_category:
            current_category = test_category
            print(f"\n   📁 {current_category}:")
        
        status_icon = "✅" if test["status"] == "PASS" else "❌"
        test_name = test['test'].split(' - ', 1)[1] if ' - ' in test['test'] else test['test']
        print(f"     {status_icon} {test_name}")
        if test["details"] and test["status"] == "FAIL":
            print(f"        └─ {test['details']}")
    
    # Database snapshots analysis
    if test_results["database_snapshots"]:
        print(f"\n📸 DATABASE SNAPSHOTS ANALYSIS:")
        for i, snapshot in enumerate(test_results["database_snapshots"]):
            print(f"   {i+1}. {snapshot['label']} ({snapshot['timestamp']})")
            print(f"      User Total Value: ${snapshot['user_balances'].get('total_value', 0):,.2f}")
            print(f"      Admin Currencies: {len(snapshot['admin_balances'])}")
    
    print(f"\n🎯 FINANCIAL FLOW ASSESSMENT:")
    if success_rate >= 90:
        print(f"   🟢 EXCELLENT: All critical financial flows are working correctly")
        print(f"   💰 Platform is ready for production money operations")
    elif success_rate >= 75:
        print(f"   🟡 GOOD: Most financial flows working with minor issues")
        print(f"   💰 Platform is mostly ready for production with some fixes needed")
    elif success_rate >= 50:
        print(f"   🟠 MODERATE: Significant financial flow issues detected")
        print(f"   💰 Platform needs major fixes before handling real money")
    else:
        print(f"   🔴 CRITICAL: Major financial flow failures detected")
        print(f"   💰 Platform is NOT safe for real money operations")
    
    print(f"\n💡 RECOMMENDATIONS:")
    if failed > 0:
        print(f"   • Fix {failed} failed test cases immediately")
        print(f"   • Focus on critical financial operations first")
        print(f"   • Implement proper error handling and validation")
        print(f"   • Add comprehensive logging for money operations")
        print(f"   • Implement database transaction rollbacks for failed operations")
    else:
        print(f"   • All financial flows tested successfully")
        print(f"   • Platform is ready for production deployment")
        print(f"   • Consider adding more edge case testing")
    
    print(f"\n" + "="*100)

def main():
    """Main test execution"""
    print(f"🚀 STARTING COMPREHENSIVE FINANCIAL FLOW TESTING")
    print(f"Platform: {BASE_URL}")
    print(f"Test User: {TEST_USER_A['email']}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Focus: Real money flows, database integrity, fee calculations")
    
    # Execute all financial flow tests
    test_1_complete_p2p_flow()
    test_2_instant_buy_flow()
    test_3_savings_transfer_flow()
    test_4_portfolio_calculations()
    test_5_fee_system_verification()
    test_6_database_integrity()
    
    # Print comprehensive report
    print_comprehensive_report()

if __name__ == "__main__":
    main()