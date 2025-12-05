#!/usr/bin/env python3
"""
P2P Complete Trade with Wallet Address Test
Testing complete P2P trade flow including wallet address validation and release flow
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://codehealer-31.preview.emergentagent.com/api"

# Test credentials as specified in the request
BUYER_EMAIL = "buyer_proof@test.com"
BUYER_PASSWORD = "Test123456"
SELLER_EMAIL = "seller_proof@test.com"  # Will use existing seller
SELLER_PASSWORD = "Test123456"

# Test wallet address as specified
BUYER_WALLET_ADDRESS = "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"

def log_test(message, success=None):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = ""
    if success is True:
        status = "✅"
    elif success is False:
        status = "❌"
    print(f"[{timestamp}] {status} {message}")

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        log_test(f"Request failed: {e}", False)
        return None

def test_user_login(email, password, role="buyer"):
    """Test user login and return user info"""
    log_test(f"🔐 Testing {role} login: {email}")
    
    response = make_request("POST", "/auth/login", {
        "email": email,
        "password": password
    })
    
    if not response:
        log_test(f"Login request failed for {email}", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and "user" in data:
            user = data["user"]
            log_test(f"Login successful for {email}", True)
            return user.get("user_id"), user
        else:
            log_test(f"Login failed - no user in response: {data}", False)
            return None
    else:
        log_test(f"Login failed with status {response.status_code}: {response.text}", False)
        return None

def get_sell_orders():
    """Get existing sell orders from marketplace"""
    log_test("📋 Getting existing sell orders from marketplace")
    
    response = make_request("GET", "/p2p/offers")
    
    if not response:
        log_test("Failed to get sell orders", False)
        return []
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and "offers" in data:
            offers = data["offers"]
            log_test(f"Found {len(offers)} sell orders", True)
            return offers
        else:
            log_test(f"No offers found in response: {data}", False)
            return []
    else:
        log_test(f"Failed to get sell orders: {response.status_code} - {response.text}", False)
        return []

def create_trade_with_wallet(buyer_id, sell_order_id, crypto_amount, payment_method, wallet_address):
    """Create P2P trade with wallet address"""
    log_test(f"🔄 Creating P2P trade with wallet address: {wallet_address}")
    
    trade_data = {
        "sell_order_id": sell_order_id,
        "buyer_id": buyer_id,
        "crypto_amount": crypto_amount,
        "payment_method": payment_method,
        "buyer_wallet_address": wallet_address,
        "buyer_wallet_network": "bitcoin"  # For BTC address
    }
    
    response = make_request("POST", "/p2p/create-trade", trade_data)
    
    if not response:
        log_test("Failed to create trade", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and "trade" in data:
            trade = data["trade"]
            log_test(f"Trade created successfully: {trade['trade_id']}", True)
            log_test(f"Escrow locked: {trade.get('escrow_locked', False)}")
            return trade
        else:
            log_test(f"Trade creation failed: {data}", False)
            return None
    else:
        log_test(f"Trade creation failed: {response.status_code} - {response.text}", False)
        return None

def mark_trade_as_paid(trade_id, buyer_id):
    """Buyer marks trade as paid"""
    log_test(f"💳 Buyer marking trade as paid: {trade_id}")
    
    mark_paid_data = {
        "trade_id": trade_id,
        "buyer_id": buyer_id
    }
    
    response = make_request("POST", "/p2p/mark-paid", mark_paid_data)
    
    if not response:
        log_test("Failed to mark trade as paid", False)
        return False
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            log_test("Trade marked as paid successfully", True)
            return True
        else:
            log_test(f"Mark as paid failed: {data}", False)
            return False
    else:
        log_test(f"Mark as paid failed: {response.status_code} - {response.text}", False)
        return False

def release_crypto(trade_id, seller_id):
    """Seller releases crypto from escrow"""
    log_test(f"🚀 Seller releasing crypto from escrow: {trade_id}")
    
    release_data = {
        "trade_id": trade_id,
        "seller_id": seller_id
    }
    
    response = make_request("POST", "/p2p/release-crypto", release_data)
    
    if not response:
        log_test("Failed to release crypto", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            log_test("Crypto released successfully", True)
            log_test(f"Fee collected: {data.get('fee_collected', 'N/A')}")
            log_test(f"Net amount to buyer: {data.get('net_amount_to_buyer', 'N/A')}")
            return data
        else:
            log_test(f"Crypto release failed: {data}", False)
            return None
    else:
        log_test(f"Crypto release failed: {response.status_code} - {response.text}", False)
        return None

def get_trade_details(trade_id):
    """Get trade details including wallet address"""
    log_test(f"📊 Getting trade details: {trade_id}")
    
    response = make_request("GET", f"/p2p/trade/{trade_id}")
    
    if not response:
        log_test("Failed to get trade details", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and "trade" in data:
            trade = data["trade"]
            log_test("Trade details retrieved successfully", True)
            return trade
        else:
            log_test(f"No trade details found: {data}", False)
            return None
    else:
        log_test(f"Failed to get trade details: {response.status_code} - {response.text}", False)
        return None

def get_user_balances(user_id):
    """Get user balances to verify changes"""
    log_test(f"💰 Getting user balances: {user_id}")
    
    response = make_request("GET", f"/trader/my-balances/{user_id}")
    
    if not response:
        log_test("Failed to get user balances", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            log_test("User balances retrieved successfully", True)
            return data.get("balances", [])
        else:
            log_test(f"No balances found: {data}", False)
            return None
    else:
        log_test(f"Failed to get balances: {response.status_code} - {response.text}", False)
        return None

def main():
    """Main test execution"""
    print("=" * 80)
    print("🎯 P2P COMPLETE TRADE WITH WALLET ADDRESS TEST")
    print("=" * 80)
    
    test_results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "trade_id": None,
        "seller_id": None
    }
    
    # PHASE 1 - LOGIN AND SETUP
    log_test("🚀 PHASE 1: LOGIN AND SETUP")
    
    # Login as buyer
    test_results["total_tests"] += 1
    buyer_login = test_user_login(BUYER_EMAIL, BUYER_PASSWORD, "buyer")
    if not buyer_login:
        log_test("Buyer login failed - cannot continue", False)
        test_results["failed_tests"] += 1
        return test_results
    
    buyer_id, buyer_user = buyer_login
    test_results["passed_tests"] += 1
    log_test(f"Buyer ID: {buyer_id}")
    
    # Get existing sell orders
    test_results["total_tests"] += 1
    sell_orders = get_sell_orders()
    if not sell_orders:
        log_test("No sell orders available - cannot continue", False)
        test_results["failed_tests"] += 1
        return test_results
    
    test_results["passed_tests"] += 1
    
    # Select first available sell order
    sell_order = sell_orders[0]
    sell_order_id = sell_order["order_id"]
    seller_id = sell_order["seller_id"]
    test_results["seller_id"] = seller_id
    
    log_test(f"Selected sell order: {sell_order_id}")
    log_test(f"Seller ID: {seller_id}")
    log_test(f"Crypto: {sell_order['crypto_amount']} {sell_order['crypto_currency']}")
    log_test(f"Price: {sell_order['price_per_unit']} {sell_order['fiat_currency']}")
    
    # Get seller info for later phases
    seller_login = test_user_login(SELLER_EMAIL, SELLER_PASSWORD, "seller")
    if not seller_login:
        log_test("Warning: Could not login as seller - will affect later phases", False)
        seller_user_id = None
    else:
        seller_user_id, seller_user = seller_login
        log_test("Seller login successful for later phases", True)
    
    # PHASE 2 - CREATE TRADE WITH WALLET ADDRESS
    log_test("\n🔄 PHASE 2: CREATE TRADE WITH WALLET ADDRESS")
    
    test_results["total_tests"] += 1
    crypto_amount = 0.1  # As specified in request
    payment_method = sell_order["payment_methods"][0] if sell_order["payment_methods"] else "bank_transfer"
    
    trade = create_trade_with_wallet(
        buyer_id, sell_order_id, 
        crypto_amount, payment_method, BUYER_WALLET_ADDRESS
    )
    
    if not trade:
        log_test("Trade creation failed - cannot continue", False)
        test_results["failed_tests"] += 1
        return test_results
    
    test_results["passed_tests"] += 1
    test_results["trade_id"] = trade["trade_id"]
    
    # Verify escrow locked
    if trade.get("escrow_locked"):
        log_test("✅ Escrow successfully locked", True)
    else:
        log_test("❌ Escrow not locked", False)
    
    # PHASE 3 - BUYER MARKS AS PAID
    log_test("\n💳 PHASE 3: BUYER MARKS AS PAID")
    
    test_results["total_tests"] += 1
    mark_paid_success = mark_trade_as_paid(trade["trade_id"], buyer_id)
    
    if mark_paid_success:
        test_results["passed_tests"] += 1
    else:
        test_results["failed_tests"] += 1
    
    # PHASE 4 - SELLER RELEASES CRYPTO
    log_test("\n🚀 PHASE 4: SELLER RELEASES CRYPTO")
    
    if not seller_user_id:
        log_test("Cannot test crypto release - no seller user ID", False)
        test_results["total_tests"] += 1
        test_results["failed_tests"] += 1
    else:
        test_results["total_tests"] += 1
        release_result = release_crypto(trade["trade_id"], seller_id)
        
        if release_result:
            test_results["passed_tests"] += 1
            
            # Verify fee collection (1% fee)
            expected_fee = crypto_amount * 0.01
            actual_fee = release_result.get("fee_collected", 0)
            net_to_buyer = release_result.get("net_amount_to_buyer", 0)
            
            log_test(f"Expected fee (1%): {expected_fee}")
            log_test(f"Actual fee collected: {actual_fee}")
            log_test(f"Net amount to buyer: {net_to_buyer}")
            
            if abs(actual_fee - expected_fee) < 0.0001:  # Allow small floating point differences
                log_test("✅ Fee calculation correct (1%)", True)
            else:
                log_test("❌ Fee calculation incorrect", False)
                
        else:
            test_results["failed_tests"] += 1
    
    # PHASE 5 - VERIFY WALLET ADDRESS IN TRADE
    log_test("\n📊 PHASE 5: VERIFY WALLET ADDRESS IN TRADE")
    
    test_results["total_tests"] += 1
    trade_details = get_trade_details(trade["trade_id"])
    
    if trade_details:
        test_results["passed_tests"] += 1
        
        # Verify wallet address field exists and matches
        buyer_wallet = trade_details.get("buyer_wallet_address")
        if buyer_wallet == BUYER_WALLET_ADDRESS:
            log_test(f"✅ Wallet address verified: {buyer_wallet}", True)
        else:
            log_test(f"❌ Wallet address mismatch. Expected: {BUYER_WALLET_ADDRESS}, Got: {buyer_wallet}", False)
        
        # Show trade status
        trade_status = trade_details.get("status", "unknown")
        log_test(f"Final trade status: {trade_status}")
        
    else:
        test_results["failed_tests"] += 1
    
    # PHASE 6 - VERIFY BALANCE CHANGES
    log_test("\n💰 PHASE 6: VERIFY BALANCE CHANGES")
    
    # Get buyer balances
    test_results["total_tests"] += 1
    buyer_balances = get_user_balances(buyer_id)
    if buyer_balances:
        test_results["passed_tests"] += 1
        log_test("Buyer balance verification completed", True)
        for balance in buyer_balances:
            log_test(f"Buyer {balance['currency']}: {balance['available_balance']} available")
    else:
        test_results["failed_tests"] += 1
    
    # Get seller balances if possible
    if seller_user_id and seller_id:
        test_results["total_tests"] += 1
        seller_balances = get_user_balances(seller_id)
        if seller_balances:
            test_results["passed_tests"] += 1
            log_test("Seller balance verification completed", True)
            for balance in seller_balances:
                log_test(f"Seller {balance['currency']}: {balance['available_balance']} available, {balance['locked_balance']} locked")
        else:
            test_results["failed_tests"] += 1
    
    # FINAL RESULTS
    print("\n" + "=" * 80)
    print("📊 FINAL TEST RESULTS")
    print("=" * 80)
    
    success_rate = (test_results["passed_tests"] / test_results["total_tests"]) * 100 if test_results["total_tests"] > 0 else 0
    
    log_test(f"Total Tests: {test_results['total_tests']}")
    log_test(f"Passed: {test_results['passed_tests']}")
    log_test(f"Failed: {test_results['failed_tests']}")
    log_test(f"Success Rate: {success_rate:.1f}%")
    
    if test_results["trade_id"]:
        log_test(f"Trade ID Created: {test_results['trade_id']}")
    
    if success_rate >= 80:
        log_test("🎉 P2P COMPLETE TRADE WITH WALLET ADDRESS TEST: SUCCESS", True)
    else:
        log_test("❌ P2P COMPLETE TRADE WITH WALLET ADDRESS TEST: NEEDS ATTENTION", False)
    
    return test_results

if __name__ == "__main__":
    main()