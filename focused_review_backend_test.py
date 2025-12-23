#!/usr/bin/env python3
"""
FOCUSED BACKEND TESTING FOR REVIEW REQUEST
Tests the actual implemented backend endpoints based on the review priorities:

**Critical Areas to Test:**
1. Authentication & User Management (email-based registration/login, JWT tokens)
2. Platform Wallet & Admin Features (balance retrieval, admin endpoints)
3. Price Alerts System (creation, retrieval)
4. P2P Trading System (offers, trades, escrow)
5. Crypto Bank API Endpoints
6. Email Service Integration

**Backend URL:** https://binancelike-ui.preview.emergentagent.com/api
"""

import requests
import json
import sys
import time
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://binancelike-ui.preview.emergentagent.com/api"

# Test Users
TEST_USERS = [
    {
        "email": f"focused_test_user_{int(time.time())}@test.com",
        "password": "FocusedTest123!",
        "full_name": "Focused Test User"
    },
    {
        "email": f"focused_seller_{int(time.time())}@test.com", 
        "password": "FocusedSeller123!",
        "full_name": "Focused Test Seller"
    }
]

class FocusedReviewTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_tokens = {}
        self.user_ids = {}
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results with detailed output"""
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
    
    def test_authentication_system(self):
        """Test Authentication & User Management"""
        print("\n" + "="*60)
        print("PRIORITY 1: AUTHENTICATION & USER MANAGEMENT")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        for i, user_data in enumerate(TEST_USERS):
            user_type = "User" if i == 0 else "Seller"
            
            # Test Registration
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json=user_data,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        user_id = data["user"]["user_id"]
                        self.user_ids[user_type.lower()] = user_id
                        email_verified = data["user"].get("email_verified", False)
                        
                        self.log_test(
                            f"{user_type} Registration", 
                            True, 
                            f"Registration successful - User ID: {user_id}, Email Verified: {email_verified}"
                        )
                        success_count += 1
                    else:
                        self.log_test(f"{user_type} Registration", False, "Missing user_id in response", data)
                elif response.status_code == 400 and "already registered" in response.text:
                    self.log_test(f"{user_type} Registration", True, "User already exists (acceptable)")
                    success_count += 1
                else:
                    self.log_test(f"{user_type} Registration", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test(f"{user_type} Registration", False, f"Request failed: {str(e)}")
            
            # Test Login
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": user_data["email"],
                        "password": user_data["password"]
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("token"):
                        token = data["token"]
                        user_id = data.get("user", {}).get("user_id")
                        self.user_tokens[user_type.lower()] = token
                        if user_id:
                            self.user_ids[user_type.lower()] = user_id
                        
                        # Verify JWT token structure
                        token_parts = token.split('.')
                        valid_jwt = len(token_parts) == 3
                        
                        self.log_test(
                            f"{user_type} Login", 
                            True, 
                            f"Login successful - Valid JWT: {valid_jwt}, User ID: {user_id}"
                        )
                        success_count += 1
                    else:
                        self.log_test(f"{user_type} Login", False, "Missing token in response", data)
                else:
                    self.log_test(f"{user_type} Login", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test(f"{user_type} Login", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Authentication Tests: {success_count}/{total_tests} passed")
        return success_count, total_tests
    
    def test_crypto_bank_system(self):
        """Test Crypto Bank API Endpoints"""
        print("\n" + "="*60)
        print("PRIORITY 2: CRYPTO BANK API ENDPOINTS")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        user_id = self.user_ids.get("user")
        if not user_id:
            self.log_test("Crypto Bank System", False, "No user ID available for testing")
            return 0, 1
        
        # Test Crypto Balances
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{user_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    expected_currencies = ["BTC", "ETH", "USDT"]
                    currency_balances = {b.get("currency"): b.get("balance", 0) for b in balances}
                    all_present = all(currency in currency_balances for currency in expected_currencies)
                    
                    if all_present:
                        balance_summary = ", ".join([f"{curr}: {currency_balances[curr]}" for curr in expected_currencies])
                        self.log_test(
                            "Crypto Bank Balances", 
                            True, 
                            f"User balances retrieved - {balance_summary}"
                        )
                        success_count += 1
                    else:
                        missing = [c for c in expected_currencies if c not in currency_balances]
                        self.log_test("Crypto Bank Balances", False, f"Missing currencies: {missing}")
                else:
                    self.log_test("Crypto Bank Balances", False, "Invalid balances response", data)
            else:
                self.log_test("Crypto Bank Balances", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Crypto Bank Balances", False, f"Request failed: {str(e)}")
        
        # Test Crypto Deposit
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": user_id,
                    "currency": "BTC",
                    "amount": 0.1
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    transaction_id = data.get("transaction_id", "")
                    self.log_test(
                        "Crypto Bank Deposit", 
                        True, 
                        f"Deposit successful - Transaction ID: {transaction_id}"
                    )
                    success_count += 1
                else:
                    self.log_test("Crypto Bank Deposit", False, "Deposit failed", data)
            else:
                self.log_test("Crypto Bank Deposit", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Crypto Bank Deposit", False, f"Request failed: {str(e)}")
        
        # Test Crypto Withdrawal
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": user_id,
                    "currency": "BTC",
                    "amount": 0.05,
                    "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5ce8KNQvJ1gd"
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    transaction_id = data.get("transaction_id", "")
                    self.log_test(
                        "Crypto Bank Withdrawal", 
                        True, 
                        f"Withdrawal successful - Transaction ID: {transaction_id}"
                    )
                    success_count += 1
                else:
                    self.log_test("Crypto Bank Withdrawal", False, "Withdrawal failed", data)
            else:
                self.log_test("Crypto Bank Withdrawal", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Crypto Bank Withdrawal", False, f"Request failed: {str(e)}")
        
        # Test Transaction History
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/transactions/{user_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    self.log_test(
                        "Transaction History", 
                        True, 
                        f"Transaction history retrieved - {len(transactions)} transactions"
                    )
                    success_count += 1
                else:
                    self.log_test("Transaction History", False, "Invalid transactions response", data)
            else:
                self.log_test("Transaction History", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Transaction History", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Crypto Bank Tests: {success_count}/{total_tests} passed")
        return success_count, total_tests
    
    def test_price_alerts_system(self):
        """Test Price Alerts System"""
        print("\n" + "="*60)
        print("PRIORITY 3: PRICE ALERTS SYSTEM")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        user_id = self.user_ids.get("user")
        if not user_id:
            self.log_test("Price Alerts System", False, "No user ID available for testing")
            return 0, 1
        
        # Test Price Alert Creation
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/price-alerts/create",
                json={
                    "user_id": user_id,
                    "cryptocurrency": "BTC",
                    "target_price": 50000.0,
                    "condition": "above",
                    "notification_method": "email"
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("alert_id"):
                    alert_id = data["alert_id"]
                    self.log_test(
                        "Price Alert Creation", 
                        True, 
                        f"Price alert created - ID: {alert_id}"
                    )
                    success_count += 1
                else:
                    self.log_test("Price Alert Creation", False, "Missing alert_id", data)
            else:
                self.log_test("Price Alert Creation", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Price Alert Creation", False, f"Request failed: {str(e)}")
        
        # Test Price Alert Retrieval
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/price-alerts/user/{user_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "alerts" in data:
                    alerts = data["alerts"]
                    active_alerts = [a for a in alerts if a.get("is_active", False)]
                    self.log_test(
                        "Price Alert Retrieval", 
                        True, 
                        f"Price alerts retrieved - Total: {len(alerts)}, Active: {len(active_alerts)}"
                    )
                    success_count += 1
                else:
                    self.log_test("Price Alert Retrieval", False, "Missing alerts", data)
            else:
                self.log_test("Price Alert Retrieval", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Price Alert Retrieval", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Price Alerts Tests: {success_count}/{total_tests} passed")
        return success_count, total_tests
    
    def test_platform_wallet_admin(self):
        """Test Platform Wallet & Admin Features"""
        print("\n" + "="*60)
        print("PRIORITY 4: PLATFORM WALLET & ADMIN FEATURES")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        # Test Platform Wallet Balance
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-wallet/balance",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balances = data.get("balances", {})
                    total_balance = sum(balances.values()) if balances else 0
                    self.log_test(
                        "Platform Wallet Balance", 
                        True, 
                        f"Platform wallet balance retrieved - Total currencies: {len(balances)}, Sample balance: {total_balance}"
                    )
                    success_count += 1
                else:
                    self.log_test("Platform Wallet Balance", False, "Balance retrieval failed", data)
            else:
                self.log_test("Platform Wallet Balance", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Platform Wallet Balance", False, f"Request failed: {str(e)}")
        
        # Test Admin Internal Balances
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/internal-balances",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balances = data.get("balances", {})
                    self.log_test(
                        "Admin Internal Balances", 
                        True, 
                        f"Internal balances retrieved - Currencies: {len(balances)}"
                    )
                    success_count += 1
                else:
                    self.log_test("Admin Internal Balances", False, "Internal balances failed", data)
            else:
                self.log_test("Admin Internal Balances", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Admin Internal Balances", False, f"Request failed: {str(e)}")
        
        # Test Admin CMS Coins
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/cms/coins",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    coins = data["coins"]
                    enabled_coins = [c for c in coins if c.get("enabled", False)]
                    self.log_test(
                        "Admin CMS Coins", 
                        True, 
                        f"CMS coins retrieved - Total: {len(coins)}, Enabled: {len(enabled_coins)}"
                    )
                    success_count += 1
                else:
                    self.log_test("Admin CMS Coins", False, "Missing coins data", data)
            else:
                self.log_test("Admin CMS Coins", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Admin CMS Coins", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Platform Wallet & Admin Tests: {success_count}/{total_tests} passed")
        return success_count, total_tests
    
    def test_p2p_trading_system(self):
        """Test P2P Trading System"""
        print("\n" + "="*60)
        print("PRIORITY 5: P2P TRADING SYSTEM")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        # Test P2P Offers
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/offers",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    offers = data["offers"]
                    self.log_test(
                        "P2P Offers Retrieval", 
                        True, 
                        f"P2P offers retrieved - {len(offers)} offers found"
                    )
                    success_count += 1
                else:
                    self.log_test("P2P Offers Retrieval", False, "Missing offers data", data)
            else:
                self.log_test("P2P Offers Retrieval", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("P2P Offers Retrieval", False, f"Request failed: {str(e)}")
        
        # Test Legacy Crypto Market Orders
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-market/sell/orders",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "orders" in data:
                    orders = data["orders"]
                    self.log_test(
                        "Legacy Sell Orders", 
                        True, 
                        f"Legacy sell orders retrieved - {len(orders)} orders found"
                    )
                    success_count += 1
                else:
                    self.log_test("Legacy Sell Orders", False, "Missing orders data", data)
            else:
                self.log_test("Legacy Sell Orders", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Legacy Sell Orders", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 P2P Trading Tests: {success_count}/{total_tests} passed")
        return success_count, total_tests
    
    def test_email_service_integration(self):
        """Test Email Service Integration"""
        print("\n" + "="*60)
        print("PRIORITY 6: EMAIL SERVICE INTEGRATION")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        # Test Email Verification
        total_tests += 1
        try:
            # Test with a dummy token to see if endpoint exists
            response = self.session.get(
                f"{BASE_URL}/auth/verify-email",
                params={"token": "dummy_token_for_testing"},
                timeout=15
            )
            
            # We expect this to fail with a proper error message, not 404
            if response.status_code in [400, 401, 403]:
                self.log_test(
                    "Email Verification Endpoint", 
                    True, 
                    f"Email verification endpoint exists - Status: {response.status_code}"
                )
                success_count += 1
            elif response.status_code == 404:
                self.log_test("Email Verification Endpoint", False, "Endpoint not found")
            else:
                self.log_test("Email Verification Endpoint", False, f"Unexpected status {response.status_code}")
                
        except Exception as e:
            self.log_test("Email Verification Endpoint", False, f"Request failed: {str(e)}")
        
        # Test Password Reset
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/forgot-password",
                json={"email": "test@example.com"},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Password Reset Email", 
                        True, 
                        "Password reset email endpoint working"
                    )
                    success_count += 1
                else:
                    self.log_test("Password Reset Email", False, "Password reset failed", data)
            else:
                self.log_test("Password Reset Email", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Password Reset Email", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Email Service Tests: {success_count}/{total_tests} passed")
        return success_count, total_tests
    
    def run_focused_test(self):
        """Run all focused backend tests"""
        print("🚀 STARTING FOCUSED BACKEND TESTING FOR REVIEW")
        print("=" * 80)
        print(f"Backend URL: {BASE_URL}")
        print(f"Test Started: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # Track overall results
        test_sections = []
        
        # Run all priority tests
        auth_success, auth_total = self.test_authentication_system()
        test_sections.append(("Authentication & User Management", auth_success, auth_total))
        
        crypto_success, crypto_total = self.test_crypto_bank_system()
        test_sections.append(("Crypto Bank API Endpoints", crypto_success, crypto_total))
        
        alerts_success, alerts_total = self.test_price_alerts_system()
        test_sections.append(("Price Alerts System", alerts_success, alerts_total))
        
        wallet_success, wallet_total = self.test_platform_wallet_admin()
        test_sections.append(("Platform Wallet & Admin Features", wallet_success, wallet_total))
        
        p2p_success, p2p_total = self.test_p2p_trading_system()
        test_sections.append(("P2P Trading System", p2p_success, p2p_total))
        
        email_success, email_total = self.test_email_service_integration()
        test_sections.append(("Email Service Integration", email_success, email_total))
        
        # Generate final summary
        print("\n" + "="*80)
        print("🎯 FOCUSED BACKEND TEST RESULTS SUMMARY")
        print("="*80)
        
        total_passed = 0
        total_tests = 0
        
        for section_name, section_passed, section_total in test_sections:
            success_rate = (section_passed / section_total * 100) if section_total > 0 else 0
            status = "✅ PASS" if section_passed == section_total else "⚠️  PARTIAL" if section_passed > 0 else "❌ FAIL"
            print(f"{status} {section_name}: {section_passed}/{section_total} ({success_rate:.1f}%)")
            total_passed += section_passed
            total_tests += section_total
        
        overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        print(f"\n📊 Overall Results: {total_passed}/{total_tests} tests passed ({overall_success_rate:.1f}%)")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print(f"\n⏰ Test Completed: {datetime.now().isoformat()}")
        print("="*80)
        
        return overall_success_rate > 70  # Consider success if >70% pass

if __name__ == "__main__":
    tester = FocusedReviewTester()
    success = tester.run_focused_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)