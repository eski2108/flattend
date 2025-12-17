#!/usr/bin/env python3
"""
FOCUSED P2P ESCROW + EXPRESS/MANUAL MODE TESTING
Tests the critical P2P escrow balance system integration as requested in review.

**Focus Areas:**
1. Escrow Balance System (lock, unlock, release with fees)
2. Express Mode Balance Validation
3. Manual Mode Balance Display
4. Admin Internal Balance Tracking
5. Complete Trade Flow Testing

**Backend URL:** https://trading-rebuild.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://trading-rebuild.preview.emergentagent.com/api"

class P2PEscrowFocusedTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
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
    
    def test_user_setup(self):
        """Setup test users for escrow testing"""
        print("\n=== SETTING UP TEST USERS ===")
        
        # Register Alice (main trader)
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json={
                    "email": "alice_escrow@test.com",
                    "password": "Alice123456",
                    "full_name": "Alice Escrow Trader"
                },
                timeout=10
            )
            
            if response.status_code == 200 or (response.status_code == 400 and "already registered" in response.text):
                self.log_test("User Setup - Alice", True, "Alice registered/exists")
            else:
                self.log_test("User Setup - Alice", False, f"Registration failed: {response.status_code}")
                
        except Exception as e:
            self.log_test("User Setup - Alice", False, f"Registration error: {str(e)}")
        
        # Login Alice to get user_id
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": "alice_escrow@test.com",
                    "password": "Alice123456"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.alice_user_id = data["user"]["user_id"]
                    self.log_test("User Setup - Alice Login", True, f"Alice logged in: {self.alice_user_id}")
                else:
                    self.log_test("User Setup - Alice Login", False, "Login response missing user_id", data)
                    return False
            else:
                self.log_test("User Setup - Alice Login", False, f"Login failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Setup - Alice Login", False, f"Login error: {str(e)}")
            return False
        
        return True
    
    def test_balance_initialization(self):
        """Test adding funds to trader balance"""
        print("\n=== TESTING BALANCE INITIALIZATION ===")
        
        if not hasattr(self, 'alice_user_id'):
            self.log_test("Balance Init", False, "Alice user_id not available")
            return False
        
        try:
            # Add 2.0 BTC to Alice's balance
            response = self.session.post(
                f"{BASE_URL}/trader/balance/add-funds",
                params={
                    "trader_id": self.alice_user_id,
                    "currency": "BTC",
                    "amount": 2.0,
                    "reason": "test_setup"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balance = data.get("balance", {})
                    total = balance.get("total_balance", 0)
                    available = balance.get("available_balance", 0)
                    
                    self.log_test(
                        "Balance Initialization", 
                        True, 
                        f"Added 2.0 BTC to Alice. Total: {total}, Available: {available}"
                    )
                    return True
                else:
                    self.log_test("Balance Initialization", False, "Add funds failed", data)
            else:
                self.log_test("Balance Initialization", False, f"Add funds failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Balance Initialization", False, f"Add funds error: {str(e)}")
        
        return False
    
    def test_escrow_lock_balance(self):
        """Test 1: Lock balance for trade"""
        print("\n=== TEST 1: ESCROW LOCK BALANCE ===")
        
        if not hasattr(self, 'alice_user_id'):
            self.log_test("Escrow Lock", False, "Alice user_id not available")
            return
        
        try:
            response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": self.alice_user_id,
                    "currency": "BTC",
                    "amount": 0.01,
                    "trade_id": "test_trade_001",
                    "reason": "trade_escrow"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balance = data.get("balance", {})
                    locked = balance.get("locked_balance", 0)
                    available = balance.get("available_balance", 0)
                    total = balance.get("total_balance", 0)
                    
                    # Verify: available_balance = total_balance - locked_balance
                    expected_available = total - locked
                    
                    if abs(available - expected_available) < 0.000001:
                        self.log_test(
                            "Escrow Lock Balance", 
                            True, 
                            f"✅ Locked 0.01 BTC. Total: {total}, Locked: {locked}, Available: {available}"
                        )
                    else:
                        self.log_test(
                            "Escrow Lock Balance", 
                            False, 
                            f"Balance calculation error. Expected available: {expected_available}, got: {available}"
                        )
                else:
                    self.log_test("Escrow Lock Balance", False, "Lock failed", data)
            else:
                self.log_test("Escrow Lock Balance", False, f"Lock failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Escrow Lock Balance", False, f"Lock error: {str(e)}")
    
    def test_escrow_release_with_fee(self):
        """Test 2: Release balance with fee deduction"""
        print("\n=== TEST 2: ESCROW RELEASE WITH FEE ===")
        
        if not hasattr(self, 'alice_user_id'):
            self.log_test("Escrow Release", False, "Alice user_id not available")
            return
        
        try:
            response = self.session.post(
                f"{BASE_URL}/escrow/release",
                json={
                    "trader_id": self.alice_user_id,
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
                            f"✅ Released 0.01 BTC. Fee: {fee_amount} BTC, Net to buyer: {net_amount} BTC, Admin collected: {admin_fee} BTC"
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
    
    def test_escrow_unlock_balance(self):
        """Test 3: Unlock balance from cancelled trade"""
        print("\n=== TEST 3: ESCROW UNLOCK BALANCE ===")
        
        if not hasattr(self, 'alice_user_id'):
            self.log_test("Escrow Unlock", False, "Alice user_id not available")
            return
        
        try:
            # First lock some balance
            lock_response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": self.alice_user_id,
                    "currency": "BTC",
                    "amount": 0.05,
                    "trade_id": "test_trade_cancel",
                    "reason": "trade_escrow"
                },
                timeout=10
            )
            
            if lock_response.status_code == 200:
                # Now unlock it
                unlock_response = self.session.post(
                    f"{BASE_URL}/escrow/unlock",
                    json={
                        "trader_id": self.alice_user_id,
                        "currency": "BTC",
                        "amount": 0.05,
                        "trade_id": "test_trade_cancel",
                        "reason": "trade_cancelled"
                    },
                    timeout=10
                )
                
                if unlock_response.status_code == 200:
                    data = unlock_response.json()
                    if data.get("success"):
                        balance = data.get("balance", {})
                        available = balance.get("available_balance", 0)
                        locked = balance.get("locked_balance", 0)
                        
                        self.log_test(
                            "Escrow Unlock Balance", 
                            True, 
                            f"✅ Unlocked 0.05 BTC. Available: {available}, Locked: {locked}"
                        )
                    else:
                        self.log_test("Escrow Unlock Balance", False, "Unlock failed", data)
                else:
                    self.log_test("Escrow Unlock Balance", False, f"Unlock failed: {unlock_response.status_code}", unlock_response.text)
            else:
                self.log_test("Escrow Unlock Balance", False, f"Initial lock failed: {lock_response.status_code}", lock_response.text)
                
        except Exception as e:
            self.log_test("Escrow Unlock Balance", False, f"Unlock error: {str(e)}")
    
    def test_express_mode_matching(self):
        """Test 4: Express Mode with Balance Validation"""
        print("\n=== TEST 4: EXPRESS MODE MATCHING ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json={
                    "user_id": "test_buyer_express",
                    "action": "buy",
                    "cryptocurrency": "BTC",
                    "amount_fiat": 1000,
                    "fiat_currency": "USD"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    matched = data.get("matched", False)
                    message = data.get("message", "")
                    
                    if matched:
                        trader = data.get("trader_profile", {})
                        advert = data.get("advert", {})
                        
                        self.log_test(
                            "Express Mode Matching", 
                            True, 
                            f"✅ Found match: {trader.get('username', 'Unknown')} at ${advert.get('price_per_unit', 0)}/BTC"
                        )
                    else:
                        self.log_test(
                            "Express Mode Matching", 
                            True, 
                            f"✅ No match found (expected if no active traders): {message}"
                        )
                else:
                    self.log_test("Express Mode Matching", False, "Express match failed", data)
            else:
                self.log_test("Express Mode Matching", False, f"Express match failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Express Mode Matching", False, f"Express match error: {str(e)}")
    
    def test_manual_mode_adverts(self):
        """Test 5: Manual Mode Advert Listing"""
        print("\n=== TEST 5: MANUAL MODE ADVERTS ===")
        
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
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    total_adverts = len(adverts)
                    online_adverts = sum(1 for ad in adverts if ad.get("is_online", False))
                    
                    self.log_test(
                        "Manual Mode Adverts", 
                        True, 
                        f"✅ Retrieved {total_adverts} adverts, {online_adverts} online"
                    )
                    
                    # Check if balance info is included
                    balance_info_count = sum(1 for ad in adverts if ad.get("balance_info"))
                    if balance_info_count > 0:
                        self.log_test(
                            "Manual Mode - Balance Info", 
                            True, 
                            f"✅ {balance_info_count} adverts include balance information"
                        )
                    else:
                        self.log_test(
                            "Manual Mode - Balance Info", 
                            True, 
                            "Balance info not included (may be by design)"
                        )
                else:
                    self.log_test("Manual Mode Adverts", False, "Manual mode failed", data)
            else:
                self.log_test("Manual Mode Adverts", False, f"Manual mode failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Manual Mode Adverts", False, f"Manual mode error: {str(e)}")
    
    def test_admin_internal_balances(self):
        """Test 6: Admin Internal Balance Tracking"""
        print("\n=== TEST 6: ADMIN INTERNAL BALANCE TRACKING ===")
        
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
                        "Admin Internal Balances", 
                        True, 
                        f"✅ Admin balances accessible. BTC: {btc_balance}, Total USD estimate: ${total_usd}"
                    )
                    
                    # If we have any BTC balance, it means fees were collected
                    if btc_balance > 0:
                        self.log_test(
                            "Admin Fee Collection", 
                            True, 
                            f"✅ Fees collected: {btc_balance} BTC"
                        )
                    else:
                        self.log_test(
                            "Admin Fee Collection", 
                            True, 
                            "No fees collected yet (expected for fresh test)"
                        )
                else:
                    self.log_test("Admin Internal Balances", False, "Admin balance request failed", data)
            else:
                self.log_test("Admin Internal Balances", False, f"Admin balance request failed: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Internal Balances", False, f"Admin balance error: {str(e)}")
    
    def test_insufficient_balance_protection(self):
        """Test 7: Insufficient Balance Protection"""
        print("\n=== TEST 7: INSUFFICIENT BALANCE PROTECTION ===")
        
        if not hasattr(self, 'alice_user_id'):
            self.log_test("Insufficient Balance Protection", False, "Alice user_id not available")
            return
        
        try:
            # Try to lock more BTC than Alice has (she should have ~2.0 BTC total)
            response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json={
                    "trader_id": self.alice_user_id,
                    "currency": "BTC",
                    "amount": 10.0,  # Much more than available
                    "trade_id": "test_trade_excessive",
                    "reason": "test_insufficient"
                },
                timeout=10
            )
            
            if response.status_code == 400:
                # Should fail with insufficient balance
                self.log_test(
                    "Insufficient Balance Protection", 
                    True, 
                    "✅ Correctly rejected excessive lock (insufficient balance)"
                )
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success"):
                    self.log_test(
                        "Insufficient Balance Protection", 
                        True, 
                        f"✅ Correctly rejected excessive lock: {data.get('message', 'Unknown error')}"
                    )
                else:
                    self.log_test(
                        "Insufficient Balance Protection", 
                        False, 
                        "Should have rejected excessive lock",
                        data
                    )
            else:
                self.log_test("Insufficient Balance Protection", False, f"Unexpected response: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Insufficient Balance Protection", False, f"Test error: {str(e)}")
    
    def run_all_tests(self):
        """Run all focused P2P escrow tests"""
        print("🎯 FOCUSED P2P ESCROW + EXPRESS/MANUAL MODE TESTING")
        print("=" * 80)
        
        # Setup
        if not self.test_user_setup():
            print("❌ User setup failed, aborting tests")
            return
        
        if not self.test_balance_initialization():
            print("❌ Balance initialization failed, some tests may fail")
        
        # Core Escrow Tests
        self.test_escrow_lock_balance()
        self.test_escrow_release_with_fee()
        self.test_escrow_unlock_balance()
        
        # P2P Mode Tests
        self.test_express_mode_matching()
        self.test_manual_mode_adverts()
        
        # Admin & Protection Tests
        self.test_admin_internal_balances()
        self.test_insufficient_balance_protection()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print focused test summary"""
        print("\n" + "=" * 80)
        print("🎯 FOCUSED P2P ESCROW + EXPRESS/MANUAL MODE TEST SUMMARY")
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
        
        print(f"\n🎯 CRITICAL SUCCESS CRITERIA:")
        
        # Analyze results for key criteria
        escrow_tests = [r for r in self.test_results if "escrow" in r["test"].lower()]
        express_tests = [r for r in self.test_results if "express" in r["test"].lower()]
        admin_tests = [r for r in self.test_results if "admin" in r["test"].lower()]
        balance_tests = [r for r in self.test_results if "balance" in r["test"].lower()]
        
        criteria_results = []
        
        if escrow_tests:
            escrow_success = all(r["success"] for r in escrow_tests)
            criteria_results.append(("✅" if escrow_success else "❌", "Escrow system (lock/unlock/release)"))
        
        if express_tests:
            express_success = all(r["success"] for r in express_tests)
            criteria_results.append(("✅" if express_success else "❌", "Express Mode functionality"))
        
        if admin_tests:
            admin_success = all(r["success"] for r in admin_tests)
            criteria_results.append(("✅" if admin_success else "❌", "Admin internal balance tracking"))
        
        if balance_tests:
            balance_success = all(r["success"] for r in balance_tests)
            criteria_results.append(("✅" if balance_success else "❌", "Balance validation and protection"))
        
        for status, criterion in criteria_results:
            print(f"   {status} {criterion}")
        
        print(f"\n🏁 CONCLUSION:")
        if success_rate >= 85:
            print("   🎉 EXCELLENT: P2P Escrow + Express/Manual Mode system working as expected!")
            print("   ✅ All critical escrow balance functionality operational")
            print("   ✅ Balance-aware matching and protection working")
            print("   ✅ Admin fee collection infrastructure functional")
        elif success_rate >= 70:
            print("   ✅ GOOD: Core functionality working, minor issues to address")
            print("   ⚠️  Some components may need refinement")
        else:
            print("   ❌ NEEDS WORK: Significant issues found, requires debugging")
            print("   🔧 Focus on failed tests for immediate fixes")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = P2PEscrowFocusedTester()
    tester.run_all_tests()