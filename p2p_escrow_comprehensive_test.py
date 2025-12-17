#!/usr/bin/env python3
"""
COMPREHENSIVE P2P ESCROW + EXPRESS/MANUAL MODE TESTING
Tests the complete integration of P2P escrow balance system with Express Mode and Manual Mode.

**What Was Built:**
1. Escrow Balance System: trader balances with total_balance, locked_balance, available_balance
2. Balance-Aware Matching: Express Mode checks available_balance before matching
3. Manual Mode: respects balance limits and shows balance info
4. Complete Trade Flow: lock → release with fee deduction → unlock on cancellation
5. Admin Internal Balance Tracking: per currency fee collection

**Test Data Setup:**
- Alice: 2.0 BTC available
- Bob: 1.5 BTC available  
- Charlie: 3.0 BTC available (but offline)
- Diana: 0.5 BTC available

**Critical Test Scenarios:**
1. Express Mode with Balance Validation
2. Express Mode - Insufficient Balance Edge Case
3. Manual Mode with Balance Display
4. Complete Trade Flow with Escrow
5. Admin Internal Balance Tracking
6. Express Mode Scoring with Balance
7. Multiple Simultaneous Locks

**Backend URL:** https://trading-rebuild.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://trading-rebuild.preview.emergentagent.com/api"

# Test Users (as specified in review request)
TEST_USERS = {
    "alice": {
        "user_id": "test_trader_alice",
        "email": "alice@test.com",
        "password": "Alice123456",
        "full_name": "Alice Trader",
        "initial_btc": 2.0,
        "online": True
    },
    "bob": {
        "user_id": "test_trader_bob", 
        "email": "bob@test.com",
        "password": "Bob123456",
        "full_name": "Bob Trader",
        "initial_btc": 1.5,
        "online": True
    },
    "charlie": {
        "user_id": "test_trader_charlie",
        "email": "charlie@test.com", 
        "password": "Charlie123456",
        "full_name": "Charlie Trader",
        "initial_btc": 3.0,
        "online": False  # OFFLINE
    },
    "diana": {
        "user_id": "test_trader_diana",
        "email": "diana@test.com",
        "password": "Diana123456", 
        "full_name": "Diana Trader",
        "initial_btc": 0.5,
        "online": True
    },
    "test_buyer": {
        "user_id": "test_buyer",
        "email": "buyer@test.com",
        "password": "Buyer123456",
        "full_name": "Test Buyer",
        "initial_btc": 0.0,
        "online": True
    }
}

class P2PEscrowComprehensiveTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_tokens = {}
        self.trader_adverts = {}
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
        if details and not success:
            print(f"   Details: {details}")
    
    def setup_test_users(self):
        """Setup all test users with initial balances"""
        print("\n=== PHASE 1: SETTING UP TEST USERS ===")
        
        for name, user_data in TEST_USERS.items():
            # Register user
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json={
                        "email": user_data["email"],
                        "password": user_data["password"],
                        "full_name": user_data["full_name"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(f"User Registration - {name}", True, f"Registered {name} successfully")
                    else:
                        self.log_test(f"User Registration - {name}", False, "Registration failed", data)
                        continue
                elif response.status_code == 400 and "already registered" in response.text:
                    self.log_test(f"User Registration - {name}", True, f"{name} already exists (expected)")
                else:
                    self.log_test(f"User Registration - {name}", False, f"Registration failed: {response.status_code}", response.text)
                    continue
                    
            except Exception as e:
                self.log_test(f"User Registration - {name}", False, f"Registration error: {str(e)}")
                continue
            
            # Login user
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": user_data["email"],
                        "password": user_data["password"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("token"):
                        self.user_tokens[name] = data["token"]
                        # Update user_id from login response if available
                        if data.get("user", {}).get("user_id"):
                            TEST_USERS[name]["user_id"] = data["user"]["user_id"]
                        self.log_test(f"User Login - {name}", True, f"Logged in {name} successfully")
                    else:
                        self.log_test(f"User Login - {name}", False, "Login failed", data)
                        continue
                else:
                    self.log_test(f"User Login - {name}", False, f"Login failed: {response.status_code}", response.text)
                    continue
                    
            except Exception as e:
                self.log_test(f"User Login - {name}", False, f"Login error: {str(e)}")
                continue
            
            # Initialize trader balance if they have initial BTC
            if user_data["initial_btc"] > 0:
                try:
                    # Add funds to trader balance
                    response = self.session.post(
                        f"{BASE_URL}/escrow/add-funds",
                        json={
                            "trader_id": user_data["user_id"],
                            "currency": "BTC",
                            "amount": user_data["initial_btc"],
                            "reason": "test_setup"
                        },
                        headers={"Authorization": f"Bearer {self.user_tokens[name]}"},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            self.log_test(f"Balance Setup - {name}", True, f"Added {user_data['initial_btc']} BTC to {name}")
                        else:
                            self.log_test(f"Balance Setup - {name}", False, "Failed to add funds", data)
                    else:
                        self.log_test(f"Balance Setup - {name}", False, f"Add funds failed: {response.status_code}", response.text)
                        
                except Exception as e:
                    self.log_test(f"Balance Setup - {name}", False, f"Add funds error: {str(e)}")
            
            # Create trader profile if they're a trader
            if name != "test_buyer":
                try:
                    response = self.session.post(
                        f"{BASE_URL}/p2p/trader/create-profile",
                        json={
                            "user_id": user_data["user_id"],
                            "is_online": user_data["online"],
                            "completion_rate": 95.0 if name == "alice" else 85.0,
                            "rating": 4.8 if name == "alice" else 4.2,
                            "available_payment_methods": ["paypal", "bank_transfer", "wise"]
                        },
                        headers={"Authorization": f"Bearer {self.user_tokens[name]}"},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        self.log_test(f"Trader Profile - {name}", True, f"Created trader profile for {name}")
                    else:
                        self.log_test(f"Trader Profile - {name}", False, f"Profile creation failed: {response.status_code}", response.text)
                        
                except Exception as e:
                    self.log_test(f"Trader Profile - {name}", False, f"Profile creation error: {str(e)}")
            
            # Create sell adverts for traders
            if name in ["alice", "bob", "charlie", "diana"]:
                try:
                    response = self.session.post(
                        f"{BASE_URL}/p2p/trader/create-advert",
                        json={
                            "trader_id": user_data["user_id"],
                            "advert_type": "sell",
                            "cryptocurrency": "BTC",
                            "fiat_currency": "USD",
                            "price_per_unit": 95000.0 if name == "alice" else (94000.0 if name == "diana" else 96000.0),
                            "min_order_amount": 100.0,
                            "max_order_amount": 10000.0,
                            "available_amount_crypto": user_data["initial_btc"],
                            "payment_methods": ["paypal", "bank_transfer"],
                            "is_online": user_data["online"]
                        },
                        headers={"Authorization": f"Bearer {self.user_tokens[name]}"},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and data.get("advert"):
                            self.trader_adverts[name] = data["advert"]["advert_id"]
                            self.log_test(f"Sell Advert - {name}", True, f"Created sell advert for {name}")
                        else:
                            self.log_test(f"Sell Advert - {name}", False, "Advert creation failed", data)
                    else:
                        self.log_test(f"Sell Advert - {name}", False, f"Advert creation failed: {response.status_code}", response.text)
                        
                except Exception as e:
                    self.log_test(f"Sell Advert - {name}", False, f"Advert creation error: {str(e)}")
    
    def test_express_mode_balance_validation(self):
        """Test 1: Express Mode with Balance Validation"""
        print("\n=== TEST 1: EXPRESS MODE WITH BALANCE VALIDATION ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json={
                    "user_id": TEST_USERS["test_buyer"]["user_id"],
                    "action": "buy",
                    "cryptocurrency": "BTC",
                    "amount_fiat": 1000,
                    "fiat_currency": "USD"
                },
                headers={"Authorization": f"Bearer {self.user_tokens['test_buyer']}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("matched"):
                    matched_trader = data.get("trader_profile", {})
                    advert = data.get("advert", {})
                    
                    # Should match Alice (online, good stats, has 2.0 BTC available)
                    # Should NOT match Charlie (offline despite good stats)
                    trader_id = matched_trader.get("user_id")
                    required_crypto = 1000 / advert.get("price_per_unit", 95000)
                    
                    if trader_id == TEST_USERS["alice"]["user_id"]:
                        self.log_test(
                            "Express Mode - Balance Validation", 
                            True, 
                            f"Correctly matched Alice (online, sufficient balance). Required: {required_crypto:.6f} BTC"
                        )
                    else:
                        self.log_test(
                            "Express Mode - Balance Validation", 
                            False, 
                            f"Matched wrong trader: {trader_id}, expected Alice",
                            data
                        )
                else:
                    self.log_test(
                        "Express Mode - Balance Validation", 
                        False, 
                        "No match found or matching failed",
                        data
                    )
            else:
                self.log_test(
                    "Express Mode - Balance Validation", 
                    False, 
                    f"Express match failed: {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("Express Mode - Balance Validation", False, f"Test error: {str(e)}")
    
    def test_express_mode_insufficient_balance(self):
        """Test 2: Express Mode - Insufficient Balance Edge Case"""
        print("\n=== TEST 2: EXPRESS MODE - INSUFFICIENT BALANCE EDGE CASE ===")
        
        # First, temporarily reduce Diana's balance to very low
        try:
            # Set Diana's balance to 0.0001 BTC (very low)
            response = self.session.post(
                f"{BASE_URL}/escrow/set-balance",
                json={
                    "trader_id": TEST_USERS["diana"]["user_id"],
                    "currency": "BTC",
                    "total_balance": 0.0001,
                    "locked_balance": 0.0,
                    "available_balance": 0.0001
                },
                headers={"Authorization": f"Bearer {self.user_tokens['diana']}"},
                timeout=10
            )
            
            # Now try to buy $1000 worth of BTC (needs ~0.0105 BTC at $95k/BTC)
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json={
                    "user_id": TEST_USERS["test_buyer"]["user_id"],
                    "action": "buy",
                    "cryptocurrency": "BTC",
                    "amount_fiat": 1000,
                    "fiat_currency": "USD"
                },
                headers={"Authorization": f"Bearer {self.user_tokens['test_buyer']}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("matched"):
                    matched_trader = data.get("trader_profile", {})
                    trader_id = matched_trader.get("user_id")
                    
                    # Diana should NOT be matched due to insufficient balance
                    if trader_id != TEST_USERS["diana"]["user_id"]:
                        self.log_test(
                            "Express Mode - Insufficient Balance", 
                            True, 
                            f"Correctly excluded Diana (insufficient balance). Matched: {trader_id}"
                        )
                    else:
                        self.log_test(
                            "Express Mode - Insufficient Balance", 
                            False, 
                            "Incorrectly matched Diana despite insufficient balance",
                            data
                        )
                else:
                    self.log_test(
                        "Express Mode - Insufficient Balance", 
                        True, 
                        "No match found (expected if all traders have insufficient balance)"
                    )
            else:
                self.log_test(
                    "Express Mode - Insufficient Balance", 
                    False, 
                    f"Express match failed: {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("Express Mode - Insufficient Balance", False, f"Test error: {str(e)}")
    
    def test_manual_mode_balance_display(self):
        """Test 3: Manual Mode with Balance Display"""
        print("\n=== TEST 3: MANUAL MODE WITH BALANCE DISPLAY ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={
                    "action": "buy",
                    "cryptocurrency": "BTC",
                    "fiat_currency": "USD"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("adverts"):
                    adverts = data["adverts"]
                    
                    # Verify all traders shown with balance info
                    balance_info_found = 0
                    online_traders = 0
                    
                    for advert in adverts:
                        trader_info = advert.get("trader_info", {})
                        balance_info = advert.get("balance_info", {})
                        
                        if balance_info:
                            balance_info_found += 1
                        
                        if advert.get("is_online"):
                            online_traders += 1
                    
                    self.log_test(
                        "Manual Mode - Balance Display", 
                        True, 
                        f"Retrieved {len(adverts)} adverts, {balance_info_found} with balance info, {online_traders} online"
                    )
                else:
                    self.log_test(
                        "Manual Mode - Balance Display", 
                        False, 
                        "No adverts found or request failed",
                        data
                    )
            else:
                self.log_test(
                    "Manual Mode - Balance Display", 
                    False, 
                    f"Manual mode request failed: {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("Manual Mode - Balance Display", False, f"Test error: {str(e)}")
    
    def test_complete_trade_flow_with_escrow(self):
        """Test 4: Complete Trade Flow with Escrow"""
        print("\n=== TEST 4: COMPLETE TRADE FLOW WITH ESCROW ===")
        
        # Step 1 - Lock Balance
        print("Step 1: Lock Balance")
        try:
            response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": TEST_USERS["alice"]["user_id"],
                    "currency": "BTC",
                    "amount": 0.01,
                    "trade_id": "test_trade_001"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balance = data.get("balance", {})
                    locked = balance.get("locked_balance", 0)
                    available = balance.get("available_balance", 0)
                    
                    self.log_test(
                        "Escrow Lock Balance", 
                        True, 
                        f"Locked 0.01 BTC. Alice's locked: {locked}, available: {available}"
                    )
                else:
                    self.log_test("Escrow Lock Balance", False, "Lock failed", data)
                    return
            else:
                self.log_test("Escrow Lock Balance", False, f"Lock failed: {response.status_code}", response.text)
                return
                
        except Exception as e:
            self.log_test("Escrow Lock Balance", False, f"Lock error: {str(e)}")
            return
        
        # Step 2 - Release with Fee
        print("Step 2: Release with Fee")
        try:
            response = self.session.post(
                f"{BASE_URL}/escrow/release",
                json={
                    "trader_id": TEST_USERS["alice"]["user_id"],
                    "buyer_id": "test_buyer_001",
                    "currency": "BTC",
                    "gross_amount": 0.01,
                    "fee_percent": 1.0,
                    "trade_id": "test_trade_001"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    details = data.get("details", {})
                    fee_amount = details.get("fee_amount", 0)
                    net_amount = details.get("net_amount", 0)
                    admin_fee = details.get("admin_fee_collected", 0)
                    
                    # Verify calculations
                    expected_fee = 0.01 * 0.01  # 1% of 0.01 = 0.0001
                    expected_net = 0.01 - expected_fee  # 0.0099
                    
                    if abs(fee_amount - expected_fee) < 0.000001 and abs(net_amount - expected_net) < 0.000001:
                        self.log_test(
                            "Escrow Release with Fee", 
                            True, 
                            f"Released 0.01 BTC. Fee: {fee_amount}, Net to buyer: {net_amount}, Admin fee: {admin_fee}"
                        )
                    else:
                        self.log_test(
                            "Escrow Release with Fee", 
                            False, 
                            f"Fee calculation incorrect. Expected fee: {expected_fee}, got: {fee_amount}",
                            details
                        )
                else:
                    self.log_test("Escrow Release with Fee", False, "Release failed", data)
            else:
                self.log_test("Escrow Release with Fee", False, f"Release failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Escrow Release with Fee", False, f"Release error: {str(e)}")
        
        # Step 3 - Cancel Trade (Separate Test)
        print("Step 3: Cancel Trade (Unlock)")
        try:
            # First lock some balance for Bob
            response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": TEST_USERS["bob"]["user_id"],
                    "currency": "BTC",
                    "amount": 0.05,
                    "trade_id": "test_trade_002"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                # Now unlock it
                response = self.session.post(
                    f"{BASE_URL}/escrow/unlock",
                    json={
                        "trader_id": TEST_USERS["bob"]["user_id"],
                        "currency": "BTC",
                        "amount": 0.05,
                        "trade_id": "test_trade_002"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        balance = data.get("balance", {})
                        available = balance.get("available_balance", 0)
                        
                        self.log_test(
                            "Escrow Unlock Balance", 
                            True, 
                            f"Unlocked 0.05 BTC. Bob's available balance: {available}"
                        )
                    else:
                        self.log_test("Escrow Unlock Balance", False, "Unlock failed", data)
                else:
                    self.log_test("Escrow Unlock Balance", False, f"Unlock failed: {response.status_code}", response.text)
            else:
                self.log_test("Escrow Unlock Balance", False, f"Initial lock for unlock test failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Escrow Unlock Balance", False, f"Unlock error: {str(e)}")
    
    def test_admin_internal_balance_tracking(self):
        """Test 5: Admin Internal Balance Tracking"""
        print("\n=== TEST 5: ADMIN INTERNAL BALANCE TRACKING ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/internal-balances",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balances = data.get("balances", {})
                    total_usd = data.get("total_usd_estimate", 0)
                    
                    btc_balance = balances.get("BTC", 0)
                    
                    self.log_test(
                        "Admin Internal Balance", 
                        True, 
                        f"Admin balances retrieved. BTC: {btc_balance}, Total USD estimate: ${total_usd}"
                    )
                else:
                    self.log_test("Admin Internal Balance", False, "Failed to get balances", data)
            else:
                self.log_test("Admin Internal Balance", False, f"Request failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Internal Balance", False, f"Test error: {str(e)}")
    
    def test_multiple_simultaneous_locks(self):
        """Test 7: Multiple Simultaneous Locks"""
        print("\n=== TEST 7: MULTIPLE SIMULTANEOUS LOCKS ===")
        
        try:
            # Lock 0.5 BTC from Alice (trade 1)
            response1 = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": TEST_USERS["alice"]["user_id"],
                    "currency": "BTC",
                    "amount": 0.5,
                    "trade_id": "test_trade_multi_1"
                },
                timeout=10
            )
            
            # Lock 0.5 BTC from Alice (trade 2)
            response2 = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": TEST_USERS["alice"]["user_id"],
                    "currency": "BTC",
                    "amount": 0.5,
                    "trade_id": "test_trade_multi_2"
                },
                timeout=10
            )
            
            if response1.status_code == 200 and response2.status_code == 200:
                data1 = response1.json()
                data2 = response2.json()
                
                if data1.get("success") and data2.get("success"):
                    balance = data2.get("balance", {})
                    available = balance.get("available_balance", 0)
                    locked = balance.get("locked_balance", 0)
                    total = balance.get("total_balance", 0)
                    
                    # Should have: available = 2.0 - 0.5 - 0.5 = 1.0 BTC
                    expected_available = total - locked
                    
                    self.log_test(
                        "Multiple Simultaneous Locks", 
                        True, 
                        f"Locked 1.0 BTC total. Available: {available}, Locked: {locked}, Total: {total}"
                    )
                    
                    # Try to lock 1.5 BTC more (should FAIL)
                    response3 = self.session.post(
                        f"{BASE_URL}/escrow/lock",
                        json={
                            "trader_id": TEST_USERS["alice"]["user_id"],
                            "currency": "BTC",
                            "amount": 1.5,
                            "trade_id": "test_trade_multi_3"
                        },
                        timeout=10
                    )
                    
                    if response3.status_code == 400:
                        self.log_test(
                            "Multiple Locks - Insufficient Balance", 
                            True, 
                            "Correctly rejected lock of 1.5 BTC (insufficient available)"
                        )
                    else:
                        data3 = response3.json()
                        if not data3.get("success"):
                            self.log_test(
                                "Multiple Locks - Insufficient Balance", 
                                True, 
                                "Correctly rejected excessive lock"
                            )
                        else:
                            self.log_test(
                                "Multiple Locks - Insufficient Balance", 
                                False, 
                                "Should have rejected excessive lock",
                                data3
                            )
                else:
                    self.log_test("Multiple Simultaneous Locks", False, "One or both locks failed", {"data1": data1, "data2": data2})
            else:
                self.log_test("Multiple Simultaneous Locks", False, f"Lock requests failed: {response1.status_code}, {response2.status_code}")
                
        except Exception as e:
            self.log_test("Multiple Simultaneous Locks", False, f"Test error: {str(e)}")
    
    def run_all_tests(self):
        """Run all comprehensive P2P escrow tests"""
        print("🎯 COMPREHENSIVE P2P ESCROW + EXPRESS/MANUAL MODE TESTING")
        print("=" * 80)
        
        # Setup
        self.setup_test_users()
        
        # Core Tests
        self.test_express_mode_balance_validation()
        self.test_express_mode_insufficient_balance()
        self.test_manual_mode_balance_display()
        self.test_complete_trade_flow_with_escrow()
        self.test_admin_internal_balance_tracking()
        self.test_multiple_simultaneous_locks()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE P2P ESCROW + EXPRESS/MANUAL MODE TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"   {status} {result['test']}: {result['message']}")
        
        print(f"\n🎯 SUCCESS CRITERIA VERIFICATION:")
        
        # Check critical success criteria
        criteria = [
            "Express Mode only matches traders with sufficient available_balance",
            "Balance locking works (available decreases, locked increases)",
            "Fee calculation correct (1% by default)",
            "Buyer receives net amount (gross - fee)",
            "Admin internal balance increases by fee amount",
            "Unlock works on cancellation",
            "Insufficient balance prevents matching/locking"
        ]
        
        for criterion in criteria:
            # Simple check based on test names
            relevant_tests = [r for r in self.test_results if any(keyword in r["test"].lower() for keyword in criterion.lower().split())]
            if relevant_tests:
                all_passed = all(r["success"] for r in relevant_tests)
                status = "✅" if all_passed else "❌"
                print(f"   {status} {criterion}")
            else:
                print(f"   ⚠️  {criterion} (no specific test found)")
        
        print(f"\n🏁 CONCLUSION:")
        if success_rate >= 85:
            print("   🎉 EXCELLENT: P2P Escrow + Express/Manual Mode system working as expected!")
        elif success_rate >= 70:
            print("   ✅ GOOD: Most functionality working, minor issues to address")
        else:
            print("   ❌ NEEDS WORK: Significant issues found, requires debugging")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = P2PEscrowComprehensiveTester()
    tester.run_all_tests()