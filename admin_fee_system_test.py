#!/usr/bin/env python3
"""
COMPREHENSIVE ADMIN FEE SYSTEM END-TO-END TESTING
=================================================

This test covers the complete admin fee collection flow as requested:
1. P2P Trade with Fee Collection - Create complete P2P trade and verify 1% fee collected from seller
2. Admin Balance Update - Verify collected fee appears in admin wallet balance
3. Payout Request Flow - Test payout request system (admin requesting to withdraw collected fees)
4. Payout Completion - Test marking payout as completed with transaction hash

Test Credentials:
- Buyer: feebuyertest@test.com / Test123456
- Seller: feesellertest@test.com / Test123456
- Admin: existing admin account with CRYPTOLEND_ADMIN_2025 code
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://bugsecurehub.preview.emergentagent.com/api"
ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class AdminFeeSystemTester:
    def __init__(self):
        self.buyer_token = None
        self.seller_token = None
        self.admin_token = None
        self.buyer_id = None
        self.seller_id = None
        self.sell_order_id = None
        self.buy_order_id = None
        self.trade_id = None
        self.payout_transaction_id = None
        
        # Test results tracking
        self.results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": []
        }
    
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        self.results["total_tests"] += 1
        if success:
            self.results["passed_tests"] += 1
            status = "✅ PASS"
        else:
            self.results["failed_tests"] += 1
            status = "❌ FAIL"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.results["test_details"].append(result)
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request error for {method} {endpoint}: {str(e)}")
            return None
    
    def test_user_registration_and_login(self):
        """Test 1: Register buyer and seller accounts"""
        print("\n🔐 TESTING USER REGISTRATION & LOGIN")
        
        # Register buyer
        buyer_data = {
            "email": "feebuyertest@test.com",
            "password": "Test123456",
            "full_name": "Fee Buyer Test"
        }
        
        response = self.make_request("POST", "/auth/register", buyer_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.buyer_id = data.get("user", {}).get("user_id")
                self.log_test("Buyer Registration", True, f"Buyer ID: {self.buyer_id}")
            else:
                self.log_test("Buyer Registration", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Buyer Registration", False, f"HTTP {response.status_code if response else 'No response'}")
        
        # Register seller
        seller_data = {
            "email": "feesellertest@test.com", 
            "password": "Test123456",
            "full_name": "Fee Seller Test"
        }
        
        response = self.make_request("POST", "/auth/register", seller_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.seller_id = data.get("user", {}).get("user_id")
                self.log_test("Seller Registration", True, f"Seller ID: {self.seller_id}")
            else:
                self.log_test("Seller Registration", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Seller Registration", False, f"HTTP {response.status_code if response else 'No response'}")
        
        # Login buyer
        response = self.make_request("POST", "/auth/login", {
            "email": "feebuyertest@test.com",
            "password": "Test123456"
        })
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.buyer_token = data.get("token")
                self.log_test("Buyer Login", True, "Token received")
            else:
                self.log_test("Buyer Login", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Buyer Login", False, f"HTTP {response.status_code if response else 'No response'}")
        
        # Login seller
        response = self.make_request("POST", "/auth/login", {
            "email": "feesellertest@test.com",
            "password": "Test123456"
        })
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.seller_token = data.get("token")
                self.log_test("Seller Login", True, "Token received")
            else:
                self.log_test("Seller Login", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Seller Login", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_admin_login(self):
        """Test 2: Admin login with CRYPTOLEND_ADMIN_2025 code"""
        print("\n👑 TESTING ADMIN LOGIN")
        
        response = self.make_request("POST", "/auth/admin-login", {
            "email": "admin@coinhubx.com",
            "password": "admin123",
            "admin_code": ADMIN_CODE
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.admin_token = data.get("token")
                self.log_test("Admin Login", True, "Admin token received")
            else:
                self.log_test("Admin Login", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Admin Login", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_setup_user_balances(self):
        """Test 3: Setup initial balances for buyer and seller"""
        print("\n💰 SETTING UP USER BALANCES")
        
        # Give seller 0.1 BTC balance
        if self.seller_id:
            response = self.make_request("POST", "/crypto-bank/deposit", {
                "user_id": self.seller_id,
                "currency": "BTC",
                "amount": 0.1
            })
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Seller BTC Deposit", True, "0.1 BTC deposited")
                else:
                    self.log_test("Seller BTC Deposit", False, data.get("message", "Unknown error"))
            else:
                self.log_test("Seller BTC Deposit", False, f"HTTP {response.status_code if response else 'No response'}")
        
        # Give buyer 0.1 BTC balance (for potential future trades)
        if self.buyer_id:
            response = self.make_request("POST", "/crypto-bank/deposit", {
                "user_id": self.buyer_id,
                "currency": "BTC", 
                "amount": 0.1
            })
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Buyer BTC Deposit", True, "0.1 BTC deposited")
                else:
                    self.log_test("Buyer BTC Deposit", False, data.get("message", "Unknown error"))
            else:
                self.log_test("Buyer BTC Deposit", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_create_sell_order(self):
        """Test 4: Seller creates sell order for 0.05 BTC"""
        print("\n📝 CREATING SELL ORDER")
        
        if not self.seller_id:
            self.log_test("Create Sell Order", False, "No seller ID available")
            return
        
        sell_data = {
            "seller_id": self.seller_id,
            "crypto_currency": "BTC",
            "crypto_amount": 0.05,
            "fiat_currency": "GBP",
            "price_per_unit": 70000,  # £70,000 per BTC
            "min_purchase": 0.01,
            "max_purchase": 0.05,
            "payment_methods": ["bank_transfer", "faster_payments"],
            "seller_requirements": []
        }
        
        response = self.make_request("POST", "/p2p/create-offer", sell_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.sell_order_id = data.get("offer", {}).get("order_id")
                self.log_test("Create Sell Order", True, f"Order ID: {self.sell_order_id}, Amount: 0.05 BTC at £70,000/BTC")
            else:
                self.log_test("Create Sell Order", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Create Sell Order", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_create_buy_order(self):
        """Test 5: Buyer creates buy order"""
        print("\n🛒 CREATING BUY ORDER")
        
        if not self.sell_order_id or not self.buyer_id:
            self.log_test("Create Buy Order", False, "Missing sell order ID or buyer ID")
            return
        
        # First create trade via enhanced P2P system
        trade_data = {
            "sell_order_id": self.sell_order_id,
            "buyer_id": self.buyer_id,
            "crypto_amount": 0.05,
            "payment_method": "bank_transfer"
        }
        
        response = self.make_request("POST", "/p2p/create-trade", trade_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.trade_id = data.get("trade", {}).get("trade_id")
                total_price = data.get("trade", {}).get("fiat_amount")
                self.log_test("Create P2P Trade", True, f"Trade ID: {self.trade_id}, Total: £{total_price}")
            else:
                self.log_test("Create P2P Trade", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Create P2P Trade", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_mark_payment_as_paid(self):
        """Test 6: Buyer marks payment as paid"""
        print("\n💳 MARKING PAYMENT AS PAID")
        
        if not self.trade_id or not self.buyer_id:
            self.log_test("Mark Payment as Paid", False, "Missing trade ID or buyer ID")
            return
        
        payment_data = {
            "trade_id": self.trade_id,
            "buyer_id": self.buyer_id,
            "payment_reference": "BANK_REF_123456789"
        }
        
        response = self.make_request("POST", "/p2p/mark-paid", payment_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Mark Payment as Paid", True, "Payment marked successfully")
            else:
                self.log_test("Mark Payment as Paid", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Mark Payment as Paid", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_release_crypto_with_fee_collection(self):
        """Test 7: Seller releases crypto - CRITICAL TEST FOR 1% FEE COLLECTION"""
        print("\n🚀 RELEASING CRYPTO WITH FEE COLLECTION (CRITICAL TEST)")
        
        if not self.trade_id or not self.seller_id:
            self.log_test("Release Crypto with Fee", False, "Missing trade ID or seller ID")
            return
        
        # Get admin wallet balance before trade
        admin_balance_before = self.get_admin_wallet_balance()
        btc_balance_before = admin_balance_before.get("BTC", 0) if admin_balance_before else 0
        
        release_data = {
            "trade_id": self.trade_id,
            "seller_id": self.seller_id
        }
        
        response = self.make_request("POST", "/p2p/release-crypto", release_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                buyer_received = data.get("buyer_received")
                platform_fee = data.get("platform_fee")
                
                # Verify fee calculation (1% of 0.05 BTC = 0.0005 BTC)
                expected_fee = 0.05 * 0.01  # 1% of 0.05 BTC
                expected_buyer_amount = 0.05 - expected_fee  # 0.0495 BTC
                
                fee_correct = abs(platform_fee - expected_fee) < 0.000001 if platform_fee else False
                buyer_amount_correct = abs(buyer_received - expected_buyer_amount) < 0.000001 if buyer_received else False
                
                if fee_correct and buyer_amount_correct:
                    self.log_test("Release Crypto with Fee", True, 
                                f"Fee: {platform_fee} BTC (expected: {expected_fee}), Buyer received: {buyer_received} BTC")
                else:
                    self.log_test("Release Crypto with Fee", False, 
                                f"Fee calculation incorrect. Got fee: {platform_fee}, buyer: {buyer_received}")
                
                # Wait a moment for balance update
                time.sleep(2)
                
                # Verify admin wallet balance increased
                admin_balance_after = self.get_admin_wallet_balance()
                btc_balance_after = admin_balance_after.get("BTC", 0) if admin_balance_after else 0
                
                balance_increase = btc_balance_after - btc_balance_before
                if abs(balance_increase - expected_fee) < 0.000001:
                    self.log_test("Admin Wallet Balance Update", True, 
                                f"Admin BTC balance increased by {balance_increase} BTC (expected: {expected_fee})")
                else:
                    self.log_test("Admin Wallet Balance Update", False, 
                                f"Balance increase {balance_increase} doesn't match expected fee {expected_fee}")
                
            else:
                self.log_test("Release Crypto with Fee", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Release Crypto with Fee", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def get_admin_wallet_balance(self):
        """Helper: Get admin wallet balance"""
        response = self.make_request("GET", "/admin/wallet/balance")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return data.get("balances", {})
        return {}
    
    def test_platform_earnings_endpoint(self):
        """Test 8: Verify platform earnings endpoint shows collected fees"""
        print("\n📊 TESTING PLATFORM EARNINGS ENDPOINT")
        
        response = self.make_request("GET", "/admin/platform-earnings")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                earnings = data.get("earnings", {})
                btc_earnings = earnings.get("BTC", 0)
                
                if btc_earnings > 0:
                    self.log_test("Platform Earnings Endpoint", True, 
                                f"BTC earnings: {btc_earnings} BTC")
                else:
                    self.log_test("Platform Earnings Endpoint", False, 
                                "No BTC earnings found")
            else:
                self.log_test("Platform Earnings Endpoint", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Platform Earnings Endpoint", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_save_external_wallet_address(self):
        """Test 9: Admin saves external wallet address for payouts"""
        print("\n🏦 SAVING EXTERNAL WALLET ADDRESS")
        
        wallet_data = {
            "wallets": {
                "BTC": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"  # Genesis block address for testing
            }
        }
        
        response = self.make_request("POST", "/admin/save-external-wallet", wallet_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Save External Wallet", True, "BTC address saved successfully")
            else:
                self.log_test("Save External Wallet", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Save External Wallet", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_verify_external_wallets(self):
        """Test 10: Verify saved external wallet addresses"""
        print("\n🔍 VERIFYING EXTERNAL WALLETS")
        
        response = self.make_request("GET", "/admin/external-wallets")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                wallets = data.get("wallets", {})
                btc_address = wallets.get("BTC")
                
                if btc_address == "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa":
                    self.log_test("Verify External Wallets", True, f"BTC address: {btc_address}")
                else:
                    self.log_test("Verify External Wallets", False, f"Unexpected BTC address: {btc_address}")
            else:
                self.log_test("Verify External Wallets", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Verify External Wallets", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_admin_payout_request(self):
        """Test 11: Admin requests payout of collected fees"""
        print("\n💸 TESTING ADMIN PAYOUT REQUEST")
        
        # Get current admin balance
        admin_balance = self.get_admin_wallet_balance()
        btc_balance = admin_balance.get("BTC", 0)
        
        if btc_balance <= 0:
            self.log_test("Admin Payout Request", False, "No BTC balance available for payout")
            return
        
        # Request payout of collected fees (should be around 0.0005 BTC)
        payout_amount = min(btc_balance, 0.0005)  # Payout the fee we collected
        
        payout_data = {
            "currency": "BTC",
            "amount": payout_amount,
            "external_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        response = self.make_request("POST", "/admin/wallet/payout", payout_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.payout_transaction_id = data.get("transaction_id")
                self.log_test("Admin Payout Request", True, 
                            f"Payout requested: {payout_amount} BTC, TX ID: {self.payout_transaction_id}")
            else:
                self.log_test("Admin Payout Request", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Admin Payout Request", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_pending_payouts_list(self):
        """Test 12: Verify pending payouts list shows the request"""
        print("\n📋 TESTING PENDING PAYOUTS LIST")
        
        response = self.make_request("GET", "/admin/pending-payouts")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                pending_payouts = data.get("pending_payouts", [])
                count = data.get("count", 0)
                
                # Look for our payout transaction
                found_our_payout = False
                if self.payout_transaction_id:
                    for payout in pending_payouts:
                        if payout.get("transaction_id") == self.payout_transaction_id:
                            found_our_payout = True
                            break
                
                if found_our_payout:
                    self.log_test("Pending Payouts List", True, f"Found our payout in {count} pending payouts")
                else:
                    self.log_test("Pending Payouts List", False, f"Our payout not found in {count} pending payouts")
            else:
                self.log_test("Pending Payouts List", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Pending Payouts List", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_complete_payout(self):
        """Test 13: Admin marks payout as completed with transaction hash"""
        print("\n✅ TESTING PAYOUT COMPLETION")
        
        if not self.payout_transaction_id:
            self.log_test("Complete Payout", False, "No payout transaction ID available")
            return
        
        completion_data = {
            "transaction_id": self.payout_transaction_id,
            "tx_hash": "abc123def456"  # Fake transaction hash as requested
        }
        
        response = self.make_request("POST", "/admin/confirm-payout", completion_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Complete Payout", True, 
                            f"Payout marked as completed with TX hash: abc123def456")
            else:
                self.log_test("Complete Payout", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Complete Payout", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def test_verify_payout_completion(self):
        """Test 14: Verify payout is marked as completed"""
        print("\n🔍 VERIFYING PAYOUT COMPLETION")
        
        # Check pending payouts - our payout should no longer be there
        response = self.make_request("GET", "/admin/pending-payouts")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                pending_payouts = data.get("pending_payouts", [])
                
                # Our payout should NOT be in pending list anymore
                found_our_payout = False
                if self.payout_transaction_id:
                    for payout in pending_payouts:
                        if payout.get("transaction_id") == self.payout_transaction_id:
                            found_our_payout = True
                            break
                
                if not found_our_payout:
                    self.log_test("Verify Payout Completion", True, "Payout no longer in pending list")
                else:
                    self.log_test("Verify Payout Completion", False, "Payout still in pending list")
            else:
                self.log_test("Verify Payout Completion", False, data.get("message", "Unknown error"))
        else:
            self.log_test("Verify Payout Completion", False, f"HTTP {response.status_code if response else 'No response'}")
    
    def run_comprehensive_test(self):
        """Run the complete admin fee system test suite"""
        print("=" * 80)
        print("🎯 COMPREHENSIVE ADMIN FEE SYSTEM END-TO-END TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Execute all tests in sequence
        self.test_user_registration_and_login()
        self.test_admin_login()
        self.test_setup_user_balances()
        self.test_create_sell_order()
        self.test_create_buy_order()
        self.test_mark_payment_as_paid()
        self.test_release_crypto_with_fee_collection()  # CRITICAL TEST
        self.test_platform_earnings_endpoint()
        self.test_save_external_wallet_address()
        self.test_verify_external_wallets()
        self.test_admin_payout_request()
        self.test_pending_payouts_list()
        self.test_complete_payout()
        self.test_verify_payout_completion()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 FINAL TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']} ✅")
        print(f"Failed: {self.results['failed_tests']} ❌")
        
        success_rate = (self.results['passed_tests'] / self.results['total_tests'] * 100) if self.results['total_tests'] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.results['failed_tests'] > 0:
            print("\n❌ FAILED TESTS:")
            for detail in self.results['test_details']:
                if "❌ FAIL" in detail:
                    print(f"  {detail}")
        
        print("\n✅ PASSED TESTS:")
        for detail in self.results['test_details']:
            if "✅ PASS" in detail:
                print(f"  {detail}")
        
        print("=" * 80)
        
        # Critical test summary
        critical_tests = [
            "Release Crypto with Fee",
            "Admin Wallet Balance Update", 
            "Platform Earnings Endpoint",
            "Admin Payout Request",
            "Complete Payout"
        ]
        
        critical_passed = 0
        for detail in self.results['test_details']:
            for critical_test in critical_tests:
                if critical_test in detail and "✅ PASS" in detail:
                    critical_passed += 1
                    break
        
        print(f"\n🎯 CRITICAL ADMIN FEE SYSTEM TESTS: {critical_passed}/{len(critical_tests)} PASSED")
        
        if critical_passed == len(critical_tests):
            print("🎉 ALL CRITICAL ADMIN FEE SYSTEM FUNCTIONALITY WORKING!")
        else:
            print("⚠️  SOME CRITICAL ADMIN FEE SYSTEM FUNCTIONALITY NEEDS ATTENTION")
        
        return success_rate >= 80  # Consider test suite successful if 80%+ pass rate

if __name__ == "__main__":
    tester = AdminFeeSystemTester()
    success = tester.run_comprehensive_test()
    exit(0 if success else 1)