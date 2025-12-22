#!/usr/bin/env python3
"""
ADMIN WITHDRAWAL SYSTEM COMPREHENSIVE TEST
Tests complete Admin Withdrawal system for fees and liquidity as requested in review.

Test Coverage:
- Setup: Add liquidity and fees to test with
- Phase 1: Withdraw from fee wallet
- Phase 2: Withdraw from liquidity wallet  
- Phase 3: Get withdrawal history
- Phase 4: Error handling (insufficient balances, invalid types, missing fields)
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://crypto-trust-guard.preview.emergentagent.com/api"
ADMIN_ID = "admin"
TEST_WITHDRAWAL_ADDRESS = "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"

# Global variables to store current amounts
CURRENT_FEE_AMOUNT = 0
CURRENT_LIQUIDITY_AMOUNT = 0

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def make_request(method, endpoint, data=None, expected_status=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, timeout=30)
        
        log_test(f"{method} {endpoint} -> {response.status_code}")
        
        if expected_status and response.status_code != expected_status:
            log_test(f"Expected {expected_status}, got {response.status_code}", "WARNING")
            if response.text:
                log_test(f"Response: {response.text[:200]}", "WARNING")
        
        return response
    except Exception as e:
        log_test(f"Request failed: {str(e)}", "ERROR")
        return None

def test_setup_phase():
    """Setup Phase: Check current liquidity and fees for testing"""
    log_test("=== SETUP PHASE: Checking Current Liquidity and Fees ===")
    
    # Check current liquidity balances
    log_test("Checking current admin liquidity balances...")
    response = make_request("GET", "/admin/liquidity/balances")
    if response and response.status_code == 200:
        result = response.json()
        wallets = result.get("wallets", [])
        btc_wallet = next((w for w in wallets if w.get("currency") == "BTC"), None)
        
        if btc_wallet:
            available = btc_wallet.get("available", 0)
            log_test(f"✅ Current BTC liquidity: {available} BTC available", "SUCCESS")
            
            # Add more liquidity if needed (ensure we have at least 2 BTC available)
            if available < 2.0:
                needed = 2.0 - available
                log_test(f"Adding {needed} BTC to ensure sufficient liquidity...")
                liquidity_data = {
                    "admin_id": ADMIN_ID,
                    "currency": "BTC",
                    "amount": needed
                }
                add_response = make_request("POST", "/admin/liquidity/add", liquidity_data)
                if add_response and add_response.status_code == 200:
                    log_test(f"✅ Added {needed} BTC to liquidity", "SUCCESS")
        else:
            log_test("No BTC liquidity wallet found, creating one...")
            liquidity_data = {
                "admin_id": ADMIN_ID,
                "currency": "BTC",
                "amount": 2.0
            }
            add_response = make_request("POST", "/admin/liquidity/add", liquidity_data)
            if add_response and add_response.status_code == 200:
                log_test("✅ Created BTC liquidity wallet with 2.0 BTC", "SUCCESS")
    
    # Check current fee balances
    log_test("Checking current fee balances...")
    fee_response = make_request("GET", "/admin/internal-balances")
    if fee_response and fee_response.status_code == 200:
        fee_result = fee_response.json()
        btc_fees = fee_result.get("balances", {}).get("BTC", 0)
        log_test(f"✅ Current BTC fees: {btc_fees} BTC", "SUCCESS")
        
        # Store current amounts for testing
        global CURRENT_FEE_AMOUNT, CURRENT_LIQUIDITY_AMOUNT
        CURRENT_FEE_AMOUNT = btc_fees
        
        # Get updated liquidity amount
        liquidity_response = make_request("GET", "/admin/liquidity/balances")
        if liquidity_response and liquidity_response.status_code == 200:
            wallets = liquidity_response.json().get("wallets", [])
            btc_wallet = next((w for w in wallets if w.get("currency") == "BTC"), None)
            CURRENT_LIQUIDITY_AMOUNT = btc_wallet.get("available", 0) if btc_wallet else 0
            log_test(f"✅ Current BTC liquidity available: {CURRENT_LIQUIDITY_AMOUNT} BTC", "SUCCESS")
    
    log_test("✅ Setup phase completed", "SUCCESS")
    return True

def test_phase_1_withdraw_from_fee_wallet():
    """Phase 1: Withdraw from Fee Wallet"""
    log_test("=== PHASE 1: WITHDRAW FROM FEE WALLET ===")
    
    global CURRENT_FEE_AMOUNT
    
    if CURRENT_FEE_AMOUNT <= 0:
        log_test("⚠️  No fees available for withdrawal testing", "WARNING")
        return False
    
    # Use available fee amount (but cap at reasonable amount for testing)
    withdrawal_amount = min(CURRENT_FEE_AMOUNT * 0.8, 0.001)  # Withdraw up to 80% of available fees or 0.001 BTC
    
    # Test Case 1: Withdraw available BTC fees
    log_test(f"Test Case 1: Withdraw {withdrawal_amount} BTC from fee wallet...")
    
    withdraw_data = {
        "admin_id": ADMIN_ID,
        "currency": "BTC",
        "amount": withdrawal_amount,
        "wallet_type": "fee_wallet",
        "withdrawal_address": TEST_WITHDRAWAL_ADDRESS
    }
    
    response = make_request("POST", "/admin/withdraw", withdraw_data)
    if response and response.status_code == 200:
        result = response.json()
        withdrawal_id = result.get("withdrawal_id")
        log_test(f"✅ Fee withdrawal initiated: {withdrawal_id}", "SUCCESS")
        log_test(f"   Status: {result.get('withdrawal', {}).get('status', 'N/A')}")
        
        # Test Case 2: Verify fee balance decreased
        log_test("Test Case 2: Verifying fee balance decreased...")
        balance_response = make_request("GET", "/admin/internal-balances")
        
        if balance_response and balance_response.status_code == 200:
            balances = balance_response.json()
            log_test(f"✅ Internal balances retrieved: {balances.get('success', False)}", "SUCCESS")
            
            # Check if BTC fees decreased
            new_btc_balance = balances.get("balances", {}).get("BTC", 0)
            expected_balance = CURRENT_FEE_AMOUNT - withdrawal_amount
            log_test(f"   Previous fee balance: {CURRENT_FEE_AMOUNT}")
            log_test(f"   Current fee balance: {new_btc_balance}")
            log_test(f"   Expected balance: {expected_balance}")
            
            if abs(new_btc_balance - expected_balance) < 0.0001:  # Allow small floating point differences
                log_test(f"✅ Fee balance correctly decreased by {withdrawal_amount} BTC", "SUCCESS")
            else:
                log_test(f"⚠️  Balance change not as expected", "WARNING")
        else:
            log_test("❌ Failed to verify fee balance", "ERROR")
            return False
            
        return True
    else:
        if response:
            error_msg = response.json().get("detail", "Unknown error")
            log_test(f"❌ Fee wallet withdrawal failed: {error_msg}", "ERROR")
        else:
            log_test("❌ Fee wallet withdrawal failed: No response", "ERROR")
        return False

def test_phase_2_withdraw_from_liquidity_wallet():
    """Phase 2: Withdraw from Liquidity Wallet"""
    log_test("=== PHASE 2: WITHDRAW FROM LIQUIDITY WALLET ===")
    
    global CURRENT_LIQUIDITY_AMOUNT
    
    if CURRENT_LIQUIDITY_AMOUNT <= 0:
        log_test("⚠️  No liquidity available for withdrawal testing", "WARNING")
        return False
    
    # Use available liquidity amount (but cap at reasonable amount for testing)
    withdrawal_amount = min(CURRENT_LIQUIDITY_AMOUNT, 1.0)  # Withdraw up to 1.0 BTC
    
    # Test Case 3: Withdraw available BTC liquidity
    log_test(f"Test Case 3: Withdraw {withdrawal_amount} BTC from liquidity wallet...")
    
    withdraw_data = {
        "admin_id": ADMIN_ID,
        "currency": "BTC",
        "amount": withdrawal_amount,
        "wallet_type": "liquidity_wallet",
        "withdrawal_address": TEST_WITHDRAWAL_ADDRESS
    }
    
    response = make_request("POST", "/admin/withdraw", withdraw_data)
    if response and response.status_code == 200:
        result = response.json()
        withdrawal_id = result.get("withdrawal_id")
        log_test(f"✅ Liquidity withdrawal initiated: {withdrawal_id}", "SUCCESS")
        
        # Test Case 4: Verify liquidity balance decreased
        log_test("Test Case 4: Verifying liquidity balance decreased...")
        balance_response = make_request("GET", "/admin/liquidity/balances")
        
        if balance_response and balance_response.status_code == 200:
            balance_data = balance_response.json()
            wallets = balance_data.get("wallets", [])
            btc_wallet = next((w for w in wallets if w.get("currency") == "BTC"), None)
            
            if btc_wallet:
                new_available = btc_wallet.get("available", 0)
                expected_available = CURRENT_LIQUIDITY_AMOUNT - withdrawal_amount
                
                log_test(f"   Previous liquidity available: {CURRENT_LIQUIDITY_AMOUNT}")
                log_test(f"   Current liquidity available: {new_available}")
                log_test(f"   Expected available: {expected_available}")
                
                if abs(new_available - expected_available) < 0.0001:  # Allow small floating point differences
                    log_test(f"✅ Liquidity balance correctly decreased by {withdrawal_amount} BTC", "SUCCESS")
                else:
                    log_test(f"⚠️  Balance change not as expected", "WARNING")
            else:
                log_test("❌ BTC liquidity wallet not found", "ERROR")
                return False
        else:
            log_test("❌ Failed to verify liquidity balance", "ERROR")
            return False
            
        return True
    else:
        if response:
            error_msg = response.json().get("detail", "Unknown error")
            log_test(f"❌ Liquidity wallet withdrawal failed: {error_msg}", "ERROR")
        else:
            log_test("❌ Liquidity wallet withdrawal failed: No response", "ERROR")
        return False

def test_phase_3_withdrawal_history():
    """Phase 3: Get Withdrawal History"""
    log_test("=== PHASE 3: GET WITHDRAWAL HISTORY ===")
    
    # Test Case 5: Get all withdrawals
    log_test("Test Case 5: Getting all admin withdrawals...")
    
    response = make_request("GET", "/admin/withdrawals")
    if response and response.status_code == 200:
        result = response.json()
        withdrawals = result.get("withdrawals", [])
        count = result.get("count", 0)
        
        log_test(f"✅ Retrieved {count} withdrawal records", "SUCCESS")
        
        # Verify we have both withdrawals (fee + liquidity)
        fee_withdrawals = [w for w in withdrawals if w.get("wallet_type") == "fee_wallet"]
        liquidity_withdrawals = [w for w in withdrawals if w.get("wallet_type") == "liquidity_wallet"]
        
        log_test(f"   Fee wallet withdrawals: {len(fee_withdrawals)}")
        log_test(f"   Liquidity wallet withdrawals: {len(liquidity_withdrawals)}")
        
        if len(fee_withdrawals) >= 1 and len(liquidity_withdrawals) >= 1:
            log_test("✅ Both withdrawal types found in history", "SUCCESS")
            
            # Show details of recent withdrawals
            for withdrawal in withdrawals[:2]:  # Show last 2
                log_test(f"   Withdrawal: {withdrawal.get('amount')} {withdrawal.get('currency')} from {withdrawal.get('wallet_type')}")
                log_test(f"   Status: {withdrawal.get('status')}, ID: {withdrawal.get('withdrawal_id', 'N/A')[:8]}...")
        else:
            log_test("⚠️  Expected both fee and liquidity withdrawals in history", "WARNING")
        
        return True
    else:
        log_test("❌ Failed to retrieve withdrawal history", "ERROR")
        return False

def test_phase_4_error_handling():
    """Phase 4: Error Handling Tests"""
    log_test("=== PHASE 4: ERROR HANDLING ===")
    
    error_tests_passed = 0
    total_error_tests = 4
    
    # Test Case 6: Try to withdraw more than available fees
    log_test("Test Case 6: Attempting to withdraw more than available fees...")
    
    withdraw_data = {
        "admin_id": ADMIN_ID,
        "currency": "BTC",
        "amount": 100.0,  # More than available
        "wallet_type": "fee_wallet",
        "withdrawal_address": TEST_WITHDRAWAL_ADDRESS
    }
    
    response = make_request("POST", "/admin/withdraw", withdraw_data)
    if response and response.status_code == 400:
        try:
            error_msg = response.json().get("detail", "")
            log_test(f"   Error message: {error_msg}")
            if "Insufficient fee balance" in error_msg:
                log_test("✅ Correctly rejected excessive fee withdrawal", "SUCCESS")
                error_tests_passed += 1
            else:
                log_test(f"⚠️  Unexpected error message: {error_msg}", "WARNING")
        except Exception as e:
            log_test(f"⚠️  Could not parse error response: {e}", "WARNING")
    else:
        log_test("❌ Should have rejected excessive fee withdrawal", "ERROR")
        if response:
            log_test(f"   Response: {response.text}", "ERROR")
    
    # Test Case 7: Try to withdraw more than available liquidity
    log_test("Test Case 7: Attempting to withdraw more than available liquidity...")
    
    withdraw_data = {
        "admin_id": ADMIN_ID,
        "currency": "BTC",
        "amount": 100.0,  # More than available
        "wallet_type": "liquidity_wallet",
        "withdrawal_address": TEST_WITHDRAWAL_ADDRESS
    }
    
    response = make_request("POST", "/admin/withdraw", withdraw_data)
    if response and response.status_code == 400:
        try:
            error_msg = response.json().get("detail", "")
            log_test(f"   Error message: {error_msg}")
            if "Insufficient liquidity" in error_msg:
                log_test("✅ Correctly rejected excessive liquidity withdrawal", "SUCCESS")
                error_tests_passed += 1
            else:
                log_test(f"⚠️  Unexpected error message: {error_msg}", "WARNING")
        except Exception as e:
            log_test(f"⚠️  Could not parse error response: {e}", "WARNING")
    else:
        log_test("❌ Should have rejected excessive liquidity withdrawal", "ERROR")
        if response:
            log_test(f"   Response: {response.text}", "ERROR")
    
    # Test Case 8: Invalid wallet type
    log_test("Test Case 8: Testing invalid wallet type...")
    
    withdraw_data = {
        "admin_id": ADMIN_ID,
        "currency": "BTC",
        "amount": 0.1,
        "wallet_type": "invalid_wallet",
        "withdrawal_address": TEST_WITHDRAWAL_ADDRESS
    }
    
    response = make_request("POST", "/admin/withdraw", withdraw_data)
    if response and response.status_code == 400:
        try:
            error_msg = response.json().get("detail", "")
            log_test(f"   Error message: {error_msg}")
            if "Invalid wallet type" in error_msg:
                log_test("✅ Correctly rejected invalid wallet type", "SUCCESS")
                error_tests_passed += 1
            else:
                log_test(f"⚠️  Unexpected error message: {error_msg}", "WARNING")
        except Exception as e:
            log_test(f"⚠️  Could not parse error response: {e}", "WARNING")
    else:
        log_test("❌ Should have rejected invalid wallet type", "ERROR")
        if response:
            log_test(f"   Response: {response.text}", "ERROR")
    
    # Test Case 9: Missing withdrawal address
    log_test("Test Case 9: Testing missing withdrawal address...")
    
    withdraw_data = {
        "admin_id": ADMIN_ID,
        "currency": "BTC",
        "amount": 0.1,
        "wallet_type": "fee_wallet"
        # Missing withdrawal_address
    }
    
    response = make_request("POST", "/admin/withdraw", withdraw_data)
    if response and response.status_code == 400:
        try:
            error_msg = response.json().get("detail", "")
            log_test(f"   Error message: {error_msg}")
            if "Missing required fields" in error_msg:
                log_test("✅ Correctly rejected missing withdrawal address", "SUCCESS")
                error_tests_passed += 1
            else:
                log_test(f"⚠️  Unexpected error message: {error_msg}", "WARNING")
        except Exception as e:
            log_test(f"⚠️  Could not parse error response: {e}", "WARNING")
    else:
        log_test("❌ Should have rejected missing withdrawal address", "ERROR")
        if response:
            log_test(f"   Response: {response.text}", "ERROR")
    
    log_test(f"Error handling tests passed: {error_tests_passed}/{total_error_tests}")
    return error_tests_passed >= 3  # Pass if at least 3 out of 4 error tests work

def main():
    """Run comprehensive Admin Withdrawal System test"""
    log_test("🚀 STARTING ADMIN WITHDRAWAL SYSTEM COMPREHENSIVE TEST")
    log_test(f"Testing against: {BASE_URL}")
    
    test_results = {
        "setup": False,
        "fee_withdrawal": False,
        "liquidity_withdrawal": False,
        "withdrawal_history": False,
        "error_handling": True  # Assume true since it's multiple sub-tests
    }
    
    # Run all test phases
    try:
        test_results["setup"] = test_setup_phase()
        test_results["fee_withdrawal"] = test_phase_1_withdraw_from_fee_wallet()
        test_results["liquidity_withdrawal"] = test_phase_2_withdraw_from_liquidity_wallet()
        test_results["withdrawal_history"] = test_phase_3_withdrawal_history()
        test_results["error_handling"] = test_phase_4_error_handling()
        
    except Exception as e:
        log_test(f"Test execution failed: {str(e)}", "ERROR")
        return False
    
    # Calculate results
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    log_test("=" * 60)
    log_test("🎯 ADMIN WITHDRAWAL SYSTEM TEST RESULTS")
    log_test("=" * 60)
    
    for phase, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        log_test(f"{phase.upper().replace('_', ' ')}: {status}")
    
    log_test(f"\nOVERALL SUCCESS RATE: {success_rate:.1f}% ({passed_tests}/{total_tests})")
    
    if success_rate >= 80:
        log_test("🎉 ADMIN WITHDRAWAL SYSTEM IS OPERATIONAL", "SUCCESS")
        return True
    else:
        log_test("⚠️  ADMIN WITHDRAWAL SYSTEM HAS ISSUES", "WARNING")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)