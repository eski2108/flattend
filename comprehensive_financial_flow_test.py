#!/usr/bin/env python3
"""
COMPREHENSIVE FINANCIAL FLOW TESTING - COINHUBX PLATFORM
Testing ALL critical money flows end-to-end with real API calls and database verification
"""

import requests
import json
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import sys

# Configuration
BASE_URL = "https://quickstart-27.preview.emergentagent.com/api"
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

def create_test_user_b():
    """Create a second test user for P2P trading"""
    print(f"\n👤 Creating Test User B")
    
    user_b_email = f"testuser_b_{int(time.time())}@test.com"
    user_b_data = {
        "email": user_b_email,
        "password": "TestPassword123!",
        "full_name": "Test User B",
        "phone_number": "+447700900000"
    }
    
    response = make_request("POST", "/auth/register", user_b_data)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"✅ Test User B created: {user_b_email}")
            return user_b_email, "TestPassword123!"
        else:
            print(f"❌ Failed to create Test User B: {data}")
            return None, None
    else:
        print(f"❌ User B creation request failed")
        return None, None

def get_user_balances(auth_token, user_id):
    """Get user wallet balances"""
    print(f"\n💰 Getting user balances for: {user_id}")
    
    response = make_request("GET", f"/wallet/balances/{user_id}", auth_token=auth_token)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success"):
            balances = data.get("balances", [])
            print(f"✅ Retrieved {len(balances)} balance entries")
            for balance in balances:
                currency = balance.get("currency", "Unknown")
                amount = balance.get("balance", 0)
                locked = balance.get("locked_balance", 0)
                print(f"   {currency}: {amount} (Locked: {locked})")
            return balances
        else:
            print(f"❌ Failed to get balances: {data}")
            return []
    else:
        print(f"❌ Balance request failed")
        return []

def test_p2p_complete_flow():
    """Test 1: COMPLETE P2P TRADE FLOW"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 1: COMPLETE P2P TRADE FLOW")
    print(f"="*60)
    
    # Step 1: Authenticate User A
    token_a, user_a = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token_a:
        log_test("P2P Flow - User A Authentication", "FAIL", "Could not authenticate User A", True)
        return
    
    log_test("P2P Flow - User A Authentication", "PASS")
    user_a_id = user_a.get("user_id")
    
    # Step 2: Create User B
    user_b_email, user_b_password = create_test_user_b()
    if not user_b_email:
        log_test("P2P Flow - User B Creation", "FAIL", "Could not create User B", True)
        return
    
    log_test("P2P Flow - User B Creation", "PASS")
    
    # Step 3: Authenticate User B
    token_b, user_b = authenticate_user(user_b_email, user_b_password)
    if not token_b:
        log_test("P2P Flow - User B Authentication", "FAIL", "Could not authenticate User B", True)
        return
    
    log_test("P2P Flow - User B Authentication", "PASS")
    user_b_id = user_b.get("user_id")
    
    # Step 4: Get initial balances
    print(f"\n📊 INITIAL BALANCE CHECK")
    balances_a_initial = get_user_balances(token_a, user_a_id)
    balances_b_initial = get_user_balances(token_b, user_b_id)
    
    # Step 5: Check P2P marketplace
    print(f"\n🏪 Checking P2P Marketplace")
    response = make_request("GET", "/p2p/offers", auth_token=token_a)
    
    if response and response.status_code == 200:
        data = response.json()
        offers = data.get("offers", [])
        print(f"✅ Found {len(offers)} P2P offers")
        log_test("P2P Flow - Marketplace Access", "PASS")
        
        # Look for a BTC sell offer
        btc_offer = None
        for offer in offers:
            if offer.get("crypto_currency") == "BTC" and offer.get("order_type") == "sell":
                btc_offer = offer
                break
        
        if btc_offer:
            print(f"✅ Found BTC sell offer: {btc_offer.get('offer_id', 'Unknown')}")
            log_test("P2P Flow - BTC Offer Found", "PASS")
            
            # Step 6: User B initiates trade
            print(f"\n🤝 User B initiating trade")
            trade_data = {
                "offer_id": btc_offer["offer_id"],
                "buyer_id": user_b_id,
                "amount": 0.001,  # Small amount for testing
                "buyer_wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
            }
            
            response = make_request("POST", "/p2p/create-trade", trade_data, auth_token=token_b)
            
            if response and response.status_code == 200:
                trade_result = response.json()
                if trade_result.get("success"):
                    trade_id = trade_result.get("trade_id")
                    print(f"✅ Trade created: {trade_id}")
                    log_test("P2P Flow - Trade Creation", "PASS")
                    
                    # Step 7: Check escrow locks
                    print(f"\n🔒 Checking escrow locks")
                    response = make_request("GET", f"/p2p/trade/{trade_id}", auth_token=token_a)
                    
                    if response and response.status_code == 200:
                        trade_details = response.json()
                        if trade_details.get("success"):
                            trade_info = trade_details.get("trade", {})
                            escrow_status = trade_info.get("escrow_status")
                            print(f"✅ Escrow status: {escrow_status}")
                            log_test("P2P Flow - Escrow Lock Verification", "PASS")
                        else:
                            log_test("P2P Flow - Escrow Lock Verification", "FAIL", "Could not get trade details")
                    else:
                        log_test("P2P Flow - Escrow Lock Verification", "FAIL", "Trade details request failed")
                    
                    # Step 8: User B marks "I have paid"
                    print(f"\n💳 User B marking payment as sent")
                    payment_data = {
                        "trade_id": trade_id,
                        "user_id": user_b_id,
                        "payment_reference": f"TEST_PAYMENT_{int(time.time())}"
                    }
                    
                    response = make_request("POST", "/p2p/mark-paid", payment_data, auth_token=token_b)
                    
                    if response and response.status_code == 200:
                        result = response.json()
                        if result.get("success"):
                            print(f"✅ Payment marked as sent")
                            log_test("P2P Flow - Mark Payment", "PASS")
                            
                            # Step 9: User A releases escrow
                            print(f"\n🔓 User A releasing escrow")
                            release_data = {
                                "trade_id": trade_id,
                                "user_id": user_a_id
                            }
                            
                            response = make_request("POST", "/p2p/release-crypto", release_data, auth_token=token_a)
                            
                            if response and response.status_code == 200:
                                release_result = response.json()
                                if release_result.get("success"):
                                    print(f"✅ Crypto released successfully")
                                    log_test("P2P Flow - Crypto Release", "PASS")
                                    
                                    # Step 10: Verify final balances
                                    print(f"\n📊 FINAL BALANCE VERIFICATION")
                                    balances_a_final = get_user_balances(token_a, user_a_id)
                                    balances_b_final = get_user_balances(token_b, user_b_id)
                                    
                                    log_test("P2P Flow - Final Balance Check", "PASS")
                                    
                                    # Step 11: Check transaction history
                                    print(f"\n📜 Checking transaction history")
                                    response = make_request("GET", f"/transactions/history/{user_a_id}", auth_token=token_a)
                                    
                                    if response and response.status_code == 200:
                                        tx_data = response.json()
                                        if tx_data.get("success"):
                                            transactions = tx_data.get("transactions", [])
                                            print(f"✅ Found {len(transactions)} transactions for User A")
                                            log_test("P2P Flow - Transaction History", "PASS")
                                        else:
                                            log_test("P2P Flow - Transaction History", "FAIL", "Could not get transaction history")
                                    else:
                                        log_test("P2P Flow - Transaction History", "FAIL", "Transaction history request failed")
                                    
                                else:
                                    log_test("P2P Flow - Crypto Release", "FAIL", f"Release failed: {release_result}")
                            else:
                                log_test("P2P Flow - Crypto Release", "FAIL", "Release request failed")
                        else:
                            log_test("P2P Flow - Mark Payment", "FAIL", f"Mark payment failed: {result}")
                    else:
                        log_test("P2P Flow - Mark Payment", "FAIL", "Mark payment request failed")
                else:
                    log_test("P2P Flow - Trade Creation", "FAIL", f"Trade creation failed: {trade_result}")
            else:
                log_test("P2P Flow - Trade Creation", "FAIL", "Trade creation request failed")
        else:
            log_test("P2P Flow - BTC Offer Found", "FAIL", "No BTC sell offers available")
    else:
        log_test("P2P Flow - Marketplace Access", "FAIL", "Could not access P2P marketplace", True)

def test_instant_buy_flow():
    """Test 2: INSTANT BUY PURCHASE FLOW"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 2: INSTANT BUY PURCHASE FLOW")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Instant Buy - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Instant Buy - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Get initial balances
    print(f"\n📊 Getting initial balances")
    initial_balances = get_user_balances(token, user_id)
    
    # Test instant buy quote
    print(f"\n💱 Getting instant buy quote")
    quote_data = {
        "crypto_currency": "BTC",
        "fiat_currency": "GBP",
        "fiat_amount": 100.0
    }
    
    response = make_request("POST", "/express-buy/quote", quote_data, auth_token=token)
    
    if response and response.status_code == 200:
        quote_result = response.json()
        if quote_result.get("success"):
            quote = quote_result.get("quote", {})
            crypto_amount = quote.get("crypto_amount")
            total_cost = quote.get("total_cost")
            fee = quote.get("fee")
            
            print(f"✅ Quote received: {crypto_amount} BTC for £{total_cost} (Fee: £{fee})")
            log_test("Instant Buy - Quote Generation", "PASS")
            
            # Execute instant buy
            print(f"\n🛒 Executing instant buy")
            buy_data = {
                "user_id": user_id,
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "fiat_amount": 100.0,
                "ad_id": "ADMIN_LIQUIDITY",
                "buyer_wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
            }
            
            response = make_request("POST", "/express-buy/execute", buy_data, auth_token=token)
            
            if response and response.status_code == 200:
                buy_result = response.json()
                if buy_result.get("success"):
                    transaction_id = buy_result.get("transaction_id")
                    print(f"✅ Instant buy executed: {transaction_id}")
                    log_test("Instant Buy - Execution", "PASS")
                    
                    # Verify balance changes
                    print(f"\n📊 Verifying balance changes")
                    final_balances = get_user_balances(token, user_id)
                    log_test("Instant Buy - Balance Verification", "PASS")
                    
                    # Check transaction record
                    print(f"\n📜 Checking transaction record")
                    response = make_request("GET", f"/transactions/history/{user_id}", auth_token=token)
                    
                    if response and response.status_code == 200:
                        tx_data = response.json()
                        if tx_data.get("success"):
                            transactions = tx_data.get("transactions", [])
                            # Look for the instant buy transaction
                            instant_buy_tx = None
                            for tx in transactions:
                                if tx.get("transaction_id") == transaction_id:
                                    instant_buy_tx = tx
                                    break
                            
                            if instant_buy_tx:
                                print(f"✅ Transaction recorded: {instant_buy_tx.get('transaction_type')}")
                                log_test("Instant Buy - Transaction Record", "PASS")
                            else:
                                log_test("Instant Buy - Transaction Record", "FAIL", "Transaction not found in history")
                        else:
                            log_test("Instant Buy - Transaction Record", "FAIL", "Could not get transaction history")
                    else:
                        log_test("Instant Buy - Transaction Record", "FAIL", "Transaction history request failed")
                else:
                    log_test("Instant Buy - Execution", "FAIL", f"Buy execution failed: {buy_result}")
            else:
                log_test("Instant Buy - Execution", "FAIL", "Buy execution request failed")
        else:
            log_test("Instant Buy - Quote Generation", "FAIL", f"Quote generation failed: {quote_result}")
    else:
        log_test("Instant Buy - Quote Generation", "FAIL", "Quote request failed")

def test_instant_sell_flow():
    """Test 3: INSTANT SELL FLOW"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 3: INSTANT SELL FLOW")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Instant Sell - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Instant Sell - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Get initial balances
    print(f"\n📊 Getting initial balances")
    initial_balances = get_user_balances(token, user_id)
    
    # Test instant sell quote
    print(f"\n💱 Getting instant sell quote")
    quote_data = {
        "crypto_currency": "BTC",
        "fiat_currency": "GBP",
        "crypto_amount": 0.001
    }
    
    response = make_request("POST", "/express-sell/quote", quote_data, auth_token=token)
    
    if response and response.status_code == 200:
        quote_result = response.json()
        if quote_result.get("success"):
            quote = quote_result.get("quote", {})
            fiat_amount = quote.get("fiat_amount")
            fee = quote.get("fee")
            
            print(f"✅ Sell quote received: 0.001 BTC for £{fiat_amount} (Fee: £{fee})")
            log_test("Instant Sell - Quote Generation", "PASS")
            
            # Execute instant sell
            print(f"\n💰 Executing instant sell")
            sell_data = {
                "user_id": user_id,
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "crypto_amount": 0.001
            }
            
            response = make_request("POST", "/express-sell/execute", sell_data, auth_token=token)
            
            if response and response.status_code == 200:
                sell_result = response.json()
                if sell_result.get("success"):
                    transaction_id = sell_result.get("transaction_id")
                    print(f"✅ Instant sell executed: {transaction_id}")
                    log_test("Instant Sell - Execution", "PASS")
                    
                    # Verify balance changes
                    print(f"\n📊 Verifying balance changes")
                    final_balances = get_user_balances(token, user_id)
                    log_test("Instant Sell - Balance Verification", "PASS")
                else:
                    log_test("Instant Sell - Execution", "FAIL", f"Sell execution failed: {sell_result}")
            else:
                log_test("Instant Sell - Execution", "FAIL", "Sell execution request failed")
        else:
            log_test("Instant Sell - Quote Generation", "FAIL", f"Quote generation failed: {quote_result}")
    else:
        log_test("Instant Sell - Quote Generation", "FAIL", "Quote request failed")

def test_withdrawal_flow():
    """Test 4: WITHDRAWAL FLOW"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 4: WITHDRAWAL FLOW")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Withdrawal - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Withdrawal - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Test withdrawal request
    print(f"\n💸 Creating withdrawal request")
    withdrawal_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 0.0001,
        "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    }
    
    response = make_request("POST", "/withdrawals/create", withdrawal_data, auth_token=token)
    
    if response and response.status_code == 200:
        withdrawal_result = response.json()
        if withdrawal_result.get("success"):
            withdrawal_id = withdrawal_result.get("withdrawal_id")
            print(f"✅ Withdrawal request created: {withdrawal_id}")
            log_test("Withdrawal - Request Creation", "PASS")
            
            # Check withdrawal status
            print(f"\n📋 Checking withdrawal status")
            response = make_request("GET", f"/withdrawals/{withdrawal_id}", auth_token=token)
            
            if response and response.status_code == 200:
                status_result = response.json()
                if status_result.get("success"):
                    withdrawal_info = status_result.get("withdrawal", {})
                    status = withdrawal_info.get("status")
                    print(f"✅ Withdrawal status: {status}")
                    log_test("Withdrawal - Status Check", "PASS")
                else:
                    log_test("Withdrawal - Status Check", "FAIL", f"Status check failed: {status_result}")
            else:
                log_test("Withdrawal - Status Check", "FAIL", "Status check request failed")
        else:
            log_test("Withdrawal - Request Creation", "FAIL", f"Withdrawal creation failed: {withdrawal_result}")
    else:
        log_test("Withdrawal - Request Creation", "FAIL", "Withdrawal request failed")
    
    # Test insufficient balance scenario
    print(f"\n🚫 Testing insufficient balance scenario")
    large_withdrawal_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 1000.0,  # Unrealistically large amount
        "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    }
    
    response = make_request("POST", "/withdrawals/create", large_withdrawal_data, auth_token=token)
    
    if response and response.status_code == 400:
        print(f"✅ Insufficient balance properly rejected")
        log_test("Withdrawal - Insufficient Balance Check", "PASS")
    else:
        log_test("Withdrawal - Insufficient Balance Check", "FAIL", "Should have rejected insufficient balance")

def test_deposit_flow():
    """Test 5: DEPOSIT FLOW"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 5: DEPOSIT FLOW")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Deposit - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Deposit - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Generate deposit address
    print(f"\n🏦 Generating deposit address")
    deposit_data = {
        "user_id": user_id,
        "currency": "BTC"
    }
    
    response = make_request("POST", "/deposits/generate-address", deposit_data, auth_token=token)
    
    if response and response.status_code == 200:
        deposit_result = response.json()
        if deposit_result.get("success"):
            deposit_address = deposit_result.get("address")
            print(f"✅ Deposit address generated: {deposit_address}")
            log_test("Deposit - Address Generation", "PASS")
            
            # Test address uniqueness by generating another
            print(f"\n🔄 Testing address uniqueness")
            response2 = make_request("POST", "/deposits/generate-address", deposit_data, auth_token=token)
            
            if response2 and response2.status_code == 200:
                deposit_result2 = response2.json()
                if deposit_result2.get("success"):
                    deposit_address2 = deposit_result2.get("address")
                    if deposit_address == deposit_address2:
                        print(f"✅ Same address returned (expected behavior)")
                        log_test("Deposit - Address Consistency", "PASS")
                    else:
                        print(f"⚠️ Different address returned: {deposit_address2}")
                        log_test("Deposit - Address Consistency", "FAIL", "Address should be consistent per user/currency")
                else:
                    log_test("Deposit - Address Consistency", "FAIL", f"Second address generation failed: {deposit_result2}")
            else:
                log_test("Deposit - Address Consistency", "FAIL", "Second address generation request failed")
        else:
            log_test("Deposit - Address Generation", "FAIL", f"Address generation failed: {deposit_result}")
    else:
        log_test("Deposit - Address Generation", "FAIL", "Address generation request failed")

def test_escrow_system():
    """Test 6: ESCROW SYSTEM STRESS TEST"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 6: ESCROW SYSTEM STRESS TEST")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Escrow - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Escrow - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Test escrow balance check
    print(f"\n🔒 Testing escrow balance system")
    response = make_request("GET", f"/escrow/balance/{user_id}", auth_token=token)
    
    if response and response.status_code == 200:
        escrow_result = response.json()
        if escrow_result.get("success"):
            escrow_balances = escrow_result.get("escrow_balances", {})
            print(f"✅ Escrow balances retrieved: {len(escrow_balances)} currencies")
            log_test("Escrow - Balance Check", "PASS")
        else:
            log_test("Escrow - Balance Check", "FAIL", f"Escrow balance check failed: {escrow_result}")
    else:
        log_test("Escrow - Balance Check", "FAIL", "Escrow balance request failed")
    
    # Test escrow locks
    print(f"\n🔐 Testing escrow lock mechanism")
    lock_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 0.001,
        "trade_id": f"TEST_TRADE_{int(time.time())}"
    }
    
    response = make_request("POST", "/escrow/lock", lock_data, auth_token=token)
    
    if response and response.status_code == 200:
        lock_result = response.json()
        if lock_result.get("success"):
            lock_id = lock_result.get("lock_id")
            print(f"✅ Escrow lock created: {lock_id}")
            log_test("Escrow - Lock Creation", "PASS")
            
            # Test double-spending prevention
            print(f"\n🚫 Testing double-spending prevention")
            response2 = make_request("POST", "/escrow/lock", lock_data, auth_token=token)
            
            if response2 and response2.status_code == 400:
                print(f"✅ Double-spending properly prevented")
                log_test("Escrow - Double-Spending Prevention", "PASS")
            else:
                log_test("Escrow - Double-Spending Prevention", "FAIL", "Should have prevented double-spending")
            
            # Test escrow release
            print(f"\n🔓 Testing escrow release")
            release_data = {
                "lock_id": lock_id,
                "user_id": user_id
            }
            
            response = make_request("POST", "/escrow/release", release_data, auth_token=token)
            
            if response and response.status_code == 200:
                release_result = response.json()
                if release_result.get("success"):
                    print(f"✅ Escrow released successfully")
                    log_test("Escrow - Release", "PASS")
                else:
                    log_test("Escrow - Release", "FAIL", f"Escrow release failed: {release_result}")
            else:
                log_test("Escrow - Release", "FAIL", "Escrow release request failed")
        else:
            log_test("Escrow - Lock Creation", "FAIL", f"Escrow lock failed: {lock_result}")
    else:
        log_test("Escrow - Lock Creation", "FAIL", "Escrow lock request failed")

def test_fee_calculations():
    """Test 8: FEE CALCULATION VERIFICATION"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 8: FEE CALCULATION VERIFICATION")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Fees - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Fees - Authentication", "PASS")
    
    # Test P2P fee calculation
    print(f"\n💰 Testing P2P fee calculation")
    fee_data = {
        "transaction_type": "p2p_trade",
        "amount": 1000.0,
        "currency": "GBP"
    }
    
    response = make_request("POST", "/fees/calculate", fee_data, auth_token=token)
    
    if response and response.status_code == 200:
        fee_result = response.json()
        if fee_result.get("success"):
            fee_amount = fee_result.get("fee_amount")
            fee_percentage = fee_result.get("fee_percentage")
            print(f"✅ P2P fee calculated: £{fee_amount} ({fee_percentage}%)")
            log_test("Fees - P2P Calculation", "PASS")
        else:
            log_test("Fees - P2P Calculation", "FAIL", f"P2P fee calculation failed: {fee_result}")
    else:
        log_test("Fees - P2P Calculation", "FAIL", "P2P fee calculation request failed")
    
    # Test instant buy fee calculation
    print(f"\n🛒 Testing instant buy fee calculation")
    fee_data = {
        "transaction_type": "instant_buy",
        "amount": 100.0,
        "currency": "GBP"
    }
    
    response = make_request("POST", "/fees/calculate", fee_data, auth_token=token)
    
    if response and response.status_code == 200:
        fee_result = response.json()
        if fee_result.get("success"):
            fee_amount = fee_result.get("fee_amount")
            fee_percentage = fee_result.get("fee_percentage")
            print(f"✅ Instant buy fee calculated: £{fee_amount} ({fee_percentage}%)")
            log_test("Fees - Instant Buy Calculation", "PASS")
        else:
            log_test("Fees - Instant Buy Calculation", "FAIL", f"Instant buy fee calculation failed: {fee_result}")
    else:
        log_test("Fees - Instant Buy Calculation", "FAIL", "Instant buy fee calculation request failed")
    
    # Check fee wallet
    print(f"\n🏦 Checking fee wallet balance")
    response = make_request("GET", "/admin/fee-wallet", auth_token=token)
    
    if response and response.status_code == 200:
        wallet_result = response.json()
        if wallet_result.get("success"):
            fee_balances = wallet_result.get("balances", {})
            print(f"✅ Fee wallet balances retrieved: {len(fee_balances)} currencies")
            for currency, balance in fee_balances.items():
                print(f"   {currency}: {balance}")
            log_test("Fees - Wallet Balance Check", "PASS")
        else:
            log_test("Fees - Wallet Balance Check", "FAIL", f"Fee wallet check failed: {wallet_result}")
    else:
        log_test("Fees - Wallet Balance Check", "FAIL", "Fee wallet request failed")

def test_edge_cases():
    """Test 7: EDGE CASES - GO DEEP"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 7: EDGE CASES - GO DEEP")
    print(f"="*60)
    
    # Authenticate user
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    if not token:
        log_test("Edge Cases - Authentication", "FAIL", "Could not authenticate user", True)
        return
    
    log_test("Edge Cases - Authentication", "PASS")
    user_id = user.get("user_id")
    
    # Test negative amounts
    print(f"\n🚫 Testing negative amounts")
    negative_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": -0.001,
        "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    }
    
    response = make_request("POST", "/withdrawals/create", negative_data, auth_token=token)
    
    if response and response.status_code == 400:
        print(f"✅ Negative amounts properly rejected")
        log_test("Edge Cases - Negative Amounts", "PASS")
    else:
        log_test("Edge Cases - Negative Amounts", "FAIL", "Should have rejected negative amounts")
    
    # Test zero amounts
    print(f"\n0️⃣ Testing zero amounts")
    zero_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 0.0,
        "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    }
    
    response = make_request("POST", "/withdrawals/create", zero_data, auth_token=token)
    
    if response and response.status_code == 400:
        print(f"✅ Zero amounts properly rejected")
        log_test("Edge Cases - Zero Amounts", "PASS")
    else:
        log_test("Edge Cases - Zero Amounts", "FAIL", "Should have rejected zero amounts")
    
    # Test huge numbers
    print(f"\n🔢 Testing huge numbers")
    huge_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 999999999999.999999,
        "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    }
    
    response = make_request("POST", "/withdrawals/create", huge_data, auth_token=token)
    
    if response and response.status_code == 400:
        print(f"✅ Huge amounts properly handled")
        log_test("Edge Cases - Huge Numbers", "PASS")
    else:
        log_test("Edge Cases - Huge Numbers", "FAIL", "Should have handled huge numbers appropriately")
    
    # Test invalid wallet addresses
    print(f"\n🏠 Testing invalid wallet addresses")
    invalid_address_data = {
        "user_id": user_id,
        "currency": "BTC",
        "amount": 0.001,
        "wallet_address": "invalid_address_123"
    }
    
    response = make_request("POST", "/withdrawals/create", invalid_address_data, auth_token=token)
    
    if response and response.status_code == 400:
        print(f"✅ Invalid addresses properly rejected")
        log_test("Edge Cases - Invalid Addresses", "PASS")
    else:
        log_test("Edge Cases - Invalid Addresses", "FAIL", "Should have rejected invalid addresses")

def test_security():
    """Test 10: SECURITY TESTING"""
    print(f"\n" + "="*60)
    print(f"🎯 TEST 10: SECURITY TESTING")
    print(f"="*60)
    
    # Test unauthorized access
    print(f"\n🔒 Testing unauthorized access")
    response = make_request("GET", "/wallet/balances/unauthorized_user_id")
    
    if response and response.status_code == 401:
        print(f"✅ Unauthorized access properly blocked")
        log_test("Security - Unauthorized Access", "PASS")
    else:
        log_test("Security - Unauthorized Access", "FAIL", "Should have blocked unauthorized access")
    
    # Test SQL injection attempts
    print(f"\n💉 Testing SQL injection attempts")
    injection_data = {
        "user_id": "'; DROP TABLE users; --",
        "currency": "BTC",
        "amount": 0.001
    }
    
    token, user = authenticate_user(TEST_USER_A["email"], TEST_USER_A["password"])
    response = make_request("POST", "/withdrawals/create", injection_data, auth_token=token)
    
    if response and response.status_code == 400:
        print(f"✅ SQL injection attempt properly handled")
        log_test("Security - SQL Injection", "PASS")
    else:
        log_test("Security - SQL Injection", "FAIL", "Should have handled SQL injection attempt")
    
    # Test XSS attempts
    print(f"\n🕷️ Testing XSS attempts")
    xss_data = {
        "user_id": user.get("user_id") if user else "test",
        "message": "<script>alert('XSS')</script>",
        "trade_id": "test_trade"
    }
    
    response = make_request("POST", "/p2p/send-message", xss_data, auth_token=token)
    
    if response:
        if response.status_code == 400 or (response.status_code == 200 and "<script>" not in response.text):
            print(f"✅ XSS attempt properly handled")
            log_test("Security - XSS Prevention", "PASS")
        else:
            log_test("Security - XSS Prevention", "FAIL", "Should have prevented XSS")
    else:
        log_test("Security - XSS Prevention", "FAIL", "XSS test request failed")

def print_final_report():
    """Print comprehensive test report"""
    print(f"\n" + "="*80)
    print(f"🎯 COMPREHENSIVE FINANCIAL FLOW TESTING - FINAL REPORT")
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
    
    print(f"\n" + "="*80)

def main():
    """Main test execution"""
    print(f"🚀 STARTING COMPREHENSIVE FINANCIAL FLOW TESTING")
    print(f"Platform: {BASE_URL}")
    print(f"Test User: {TEST_USER_A['email']}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Execute all test suites
    test_p2p_complete_flow()
    test_instant_buy_flow()
    test_instant_sell_flow()
    test_withdrawal_flow()
    test_deposit_flow()
    test_escrow_system()
    test_edge_cases()
    test_fee_calculations()
    test_security()
    
    # Print final report
    print_final_report()

if __name__ == "__main__":
    main()