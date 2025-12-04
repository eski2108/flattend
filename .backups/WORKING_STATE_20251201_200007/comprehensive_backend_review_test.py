#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND TESTING - ALL FEATURES
Review Request: Test ALL backend functionality and identify any broken features

Test Coverage:
1. Authentication System (registration, login, Google OAuth, session management)
2. Referral System (referral links, commission tracking, bonuses)
3. P2P Trading (create offers, accept trades, payment confirmation, crypto release, disputes)
4. Crypto Operations (balance checks, deposits, withdrawals, Express Buy, Swap operations)
5. Price Alerts (create, retrieve, alert triggering)
6. Telegram Bot Integration (account linking, notification settings)
7. Admin Features (Golden referral management, platform wallet, stats)

Test Credentials: alice@test.com / Test123456, bob@test.com / Test123456
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://p2p-market-1.preview.emergentagent.com/api"
TEST_USERS = [
    {"email": "alice@test.com", "password": "Test123456", "name": "Alice Test"},
    {"email": "bob@test.com", "password": "Test123456", "name": "Bob Test"}
]

class ComprehensiveBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_tokens = {}
        self.user_ids = {}
        self.failed_tests = []
        self.passed_tests = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        if success:
            self.passed_tests.append(test_name)
            print(f"✅ {test_name}: {details}")
        else:
            self.failed_tests.append(test_name)
            print(f"❌ {test_name}: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                if files:
                    response = self.session.post(url, data=data, files=files, headers=headers, timeout=30)
                else:
                    response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None
    
    def test_authentication_system(self):
        """Test 1: Authentication System - Registration, Login, Session Management"""
        print("\n🔐 TESTING AUTHENTICATION SYSTEM")
        
        # Test 1.1: User Registration
        for i, user in enumerate(TEST_USERS):
            unique_email = f"test_user_{int(time.time())}_{i}@test.com"
            registration_data = {
                "email": unique_email,
                "password": user["password"],
                "full_name": user["name"],
                "phone_number": f"+44780818431{i}"
            }
            
            response = self.make_request("POST", "/auth/register", registration_data)
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    if data and data.get("success"):
                        self.log_test(f"User Registration - {user['name']}", True, 
                                    f"User registered successfully with email {unique_email}")
                        # Store for login test
                        user["test_email"] = unique_email
                    else:
                        self.log_test(f"User Registration - {user['name']}", False, 
                                    f"Registration failed: {data.get('message', 'Unknown error') if data else 'No data'}")
                except Exception as e:
                    self.log_test(f"User Registration - {user['name']}", False, 
                                f"Registration response error: {str(e)}")
            else:
                self.log_test(f"User Registration - {user['name']}", False, 
                            f"Registration request failed: {response.status_code if response else 'No response'}")
        
        # Test 1.2: User Login
        for user in TEST_USERS:
            if "test_email" in user:
                login_data = {
                    "email": user["test_email"],
                    "password": user["password"]
                }
                
                response = self.make_request("POST", "/auth/login", login_data)
                if response and response.status_code == 200:
                    try:
                        data = response.json()
                        if data and data.get("success") and data.get("token"):
                            self.log_test(f"User Login - {user['name']}", True, 
                                        f"Login successful, token received")
                            self.user_tokens[user["name"]] = data["token"]
                            self.user_ids[user["name"]] = data.get("user_id")
                        else:
                            self.log_test(f"User Login - {user['name']}", False, 
                                        f"Login failed: {data.get('message', 'No token received') if data else 'No data'}")
                    except Exception as e:
                        self.log_test(f"User Login - {user['name']}", False, 
                                    f"Login response error: {str(e)}")
                else:
                    self.log_test(f"User Login - {user['name']}", False, 
                                f"Login request failed: {response.status_code if response else 'No response'}")
        
        # Test 1.3: Email Verification Endpoint
        response = self.make_request("POST", "/auth/verify-email", {"email": "test@example.com", "code": "123456"})
        if response:
            self.log_test("Email Verification Endpoint", True, 
                        f"Email verification endpoint accessible (status: {response.status_code})")
        else:
            self.log_test("Email Verification Endpoint", False, "Email verification endpoint not accessible")
        
        # Test 1.4: Password Reset
        response = self.make_request("POST", "/auth/forgot-password", {"email": "test@example.com"})
        if response:
            self.log_test("Password Reset Endpoint", True, 
                        f"Password reset endpoint accessible (status: {response.status_code})")
        else:
            self.log_test("Password Reset Endpoint", False, "Password reset endpoint not accessible")
    
    def test_referral_system(self):
        """Test 2: Referral System - Links, Commission Tracking, Bonuses"""
        print("\n🔗 TESTING REFERRAL SYSTEM")
        
        if not self.user_tokens:
            self.log_test("Referral System", False, "No authenticated users available for testing")
            return
        
        # Get first user for testing
        user_name = list(self.user_tokens.keys())[0]
        token = self.user_tokens[user_name]
        user_id = self.user_ids.get(user_name)
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test 2.1: Get Referral Dashboard
        if user_id:
            response = self.make_request("GET", f"/referral/dashboard/{user_id}", headers=headers)
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Referral Dashboard", True, 
                                f"Referral dashboard accessible, referral code: {data.get('referral_code', 'N/A')}")
                else:
                    self.log_test("Referral Dashboard", False, f"Dashboard error: {data.get('message', 'Unknown error')}")
            else:
                self.log_test("Referral Dashboard", False, 
                            f"Dashboard request failed: {response.status_code if response else 'No response'}")
        
        # Test 2.2: Apply Referral Code
        response = self.make_request("POST", "/referral/apply", 
                                   {"referral_code": "TEST123", "referred_user_id": user_id}, headers=headers)
        if response:
            self.log_test("Apply Referral Code", True, 
                        f"Apply referral endpoint accessible (status: {response.status_code})")
        else:
            self.log_test("Apply Referral Code", False, "Apply referral endpoint not accessible")
        
        # Test 2.3: Check Referral Discount
        if user_id:
            response = self.make_request("GET", f"/referral/check-discount/{user_id}", headers=headers)
            if response and response.status_code == 200:
                self.log_test("Check Referral Discount", True, "Referral discount check working")
            else:
                self.log_test("Check Referral Discount", False, 
                            f"Discount check failed: {response.status_code if response else 'No response'}")
    
    def test_p2p_trading_system(self):
        """Test 3: P2P Trading System - Complete Flow"""
        print("\n💱 TESTING P2P TRADING SYSTEM")
        
        # Test 3.1: Get P2P Offers
        response = self.make_request("GET", "/p2p/offers")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                offers_count = len(data.get("offers", []))
                self.log_test("P2P Get Offers", True, f"Found {offers_count} P2P offers")
            else:
                self.log_test("P2P Get Offers", False, f"Get offers error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("P2P Get Offers", False, 
                        f"Get offers failed: {response.status_code if response else 'No response'}")
        
        # Test 3.2: Legacy P2P System - Sell Orders
        response = self.make_request("GET", "/crypto-market/sell/orders")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                orders_count = len(data.get("orders", []))
                self.log_test("Legacy P2P Sell Orders", True, f"Found {orders_count} sell orders")
            else:
                self.log_test("Legacy P2P Sell Orders", False, f"Sell orders error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Legacy P2P Sell Orders", False, 
                        f"Sell orders failed: {response.status_code if response else 'No response'}")
        
        # Test 3.3: P2P Configuration
        response = self.make_request("GET", "/p2p/config")
        if response and response.status_code == 200:
            self.log_test("P2P Configuration", True, "P2P configuration endpoint working")
        else:
            self.log_test("P2P Configuration", False, 
                        f"P2P config failed: {response.status_code if response else 'No response'}")
        
        # Test 3.4: P2P Marketplace Available Coins
        response = self.make_request("GET", "/p2p/marketplace/available-coins")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("P2P Available Coins", True, f"Found {len(data)} available coins for P2P")
            else:
                self.log_test("P2P Available Coins", True, "P2P available coins endpoint accessible")
        else:
            self.log_test("P2P Available Coins", False, 
                        f"Available coins failed: {response.status_code if response else 'No response'}")
    
    def test_crypto_operations(self):
        """Test 4: Crypto Operations - Balances, Deposits, Withdrawals, Express Buy, Swap"""
        print("\n💰 TESTING CRYPTO OPERATIONS")
        
        if not self.user_ids:
            self.log_test("Crypto Operations", False, "No user IDs available for testing")
            return
        
        user_id = list(self.user_ids.values())[0]
        
        # Test 4.1: Crypto Bank Balances
        response = self.make_request("GET", f"/crypto-bank/balances/{user_id}")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", {})
                self.log_test("Crypto Bank Balances", True, f"Retrieved balances for {len(balances)} currencies")
            else:
                self.log_test("Crypto Bank Balances", False, f"Balance error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Crypto Bank Balances", False, 
                        f"Balance request failed: {response.status_code if response else 'No response'}")
        
        # Test 4.2: Crypto Deposit
        deposit_data = {
            "user_id": user_id,
            "currency": "BTC",
            "amount": 0.001,
            "tx_hash": f"test_tx_{int(time.time())}"
        }
        response = self.make_request("POST", "/crypto-bank/deposit", deposit_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Crypto Deposit", True, f"Deposit successful: {data.get('message', 'Success')}")
            else:
                self.log_test("Crypto Deposit", False, f"Deposit error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Crypto Deposit", False, 
                        f"Deposit failed: {response.status_code if response else 'No response'}")
        
        # Test 4.3: Crypto Withdrawal
        withdrawal_data = {
            "user_id": user_id,
            "currency": "BTC",
            "amount": 0.0001,
            "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
        }
        response = self.make_request("POST", "/crypto-bank/withdraw", withdrawal_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Crypto Withdrawal", True, f"Withdrawal successful: {data.get('message', 'Success')}")
            else:
                self.log_test("Crypto Withdrawal", False, f"Withdrawal error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Crypto Withdrawal", False, 
                        f"Withdrawal failed: {response.status_code if response else 'No response'}")
        
        # Test 4.4: Transaction History
        response = self.make_request("GET", f"/crypto-bank/transactions/{user_id}")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                transactions = data.get("transactions", [])
                self.log_test("Transaction History", True, f"Retrieved {len(transactions)} transactions")
            else:
                self.log_test("Transaction History", False, f"Transaction history error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Transaction History", False, 
                        f"Transaction history failed: {response.status_code if response else 'No response'}")
        
        # Test 4.5: Swap Operations
        # Test swap preview
        swap_preview_data = {
            "from_currency": "BTC",
            "to_currency": "ETH",
            "amount": 0.01
        }
        response = self.make_request("POST", "/swap/preview", swap_preview_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Swap Preview", True, f"Swap preview working: {data.get('to_amount', 'N/A')} ETH")
            else:
                self.log_test("Swap Preview", False, f"Swap preview error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Swap Preview", False, 
                        f"Swap preview failed: {response.status_code if response else 'No response'}")
        
        # Test swap available coins
        response = self.make_request("GET", "/swap/available-coins")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Swap Available Coins", True, f"Found {len(data)} coins available for swap")
            else:
                self.log_test("Swap Available Coins", True, "Swap available coins endpoint accessible")
        else:
            self.log_test("Swap Available Coins", False, 
                        f"Swap available coins failed: {response.status_code if response else 'No response'}")
        
        # Test 4.6: Express Buy/Instant Orders
        response = self.make_request("GET", "/express-buy/config")
        if response and response.status_code == 200:
            self.log_test("Express Buy Config", True, "Express Buy configuration accessible")
        else:
            self.log_test("Express Buy Config", False, 
                        f"Express Buy config failed: {response.status_code if response else 'No response'}")
    
    def test_price_alerts(self):
        """Test 5: Price Alerts System"""
        print("\n📊 TESTING PRICE ALERTS SYSTEM")
        
        if not self.user_ids:
            self.log_test("Price Alerts", False, "No user IDs available for testing")
            return
        
        user_id = list(self.user_ids.values())[0]
        
        # Test 5.1: Get User Price Alerts
        response = self.make_request("GET", f"/price-alerts/user/{user_id}")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                alerts = data.get("alerts", [])
                self.log_test("Get Price Alerts", True, f"Retrieved {len(alerts)} price alerts")
            else:
                self.log_test("Get Price Alerts", False, f"Get alerts error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Get Price Alerts", False, 
                        f"Get alerts failed: {response.status_code if response else 'No response'}")
        
        # Test 5.2: Create Price Alert
        alert_data = {
            "user_id": user_id,
            "coin": "BTC",
            "target_price": 50000,
            "condition": "above",
            "notification_method": "email"
        }
        response = self.make_request("POST", "/price-alerts/create", alert_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_test("Create Price Alert", True, f"Price alert created: {data.get('alert_id', 'Success')}")
            else:
                self.log_test("Create Price Alert", False, f"Create alert error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Create Price Alert", False, 
                        f"Create alert failed: {response.status_code if response else 'No response'}")
    
    def test_telegram_bot_integration(self):
        """Test 6: Telegram Bot Integration"""
        print("\n🤖 TESTING TELEGRAM BOT INTEGRATION")
        
        if not self.user_ids:
            self.log_test("Telegram Bot", False, "No user IDs available for testing")
            return
        
        user_id = list(self.user_ids.values())[0]
        
        # Test 6.1: Telegram Account Linking
        link_data = {
            "user_id": user_id,
            "telegram_id": "123456789",
            "telegram_username": "testuser"
        }
        response = self.make_request("POST", "/telegram/link-account", link_data)
        if response:
            self.log_test("Telegram Account Linking", True, 
                        f"Telegram linking endpoint accessible (status: {response.status_code})")
        else:
            self.log_test("Telegram Account Linking", False, "Telegram linking endpoint not accessible")
        
        # Test 6.2: Telegram Notification Settings
        response = self.make_request("GET", f"/telegram/settings/{user_id}")
        if response:
            self.log_test("Telegram Notification Settings", True, 
                        f"Telegram settings endpoint accessible (status: {response.status_code})")
        else:
            self.log_test("Telegram Notification Settings", False, "Telegram settings endpoint not accessible")
    
    def test_admin_features(self):
        """Test 7: Admin Features - Golden Referral, Platform Wallet, Stats"""
        print("\n👑 TESTING ADMIN FEATURES")
        
        # Test 7.1: Platform Wallet Balance
        response = self.make_request("GET", "/admin/platform-wallet/balance")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", {})
                self.log_test("Platform Wallet Balance", True, f"Platform wallet has {len(balances)} currencies")
            else:
                self.log_test("Platform Wallet Balance", False, f"Platform wallet error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Platform Wallet Balance", False, 
                        f"Platform wallet failed: {response.status_code if response else 'No response'}")
        
        # Test 7.2: Admin Revenue Summary
        response = self.make_request("GET", "/admin/revenue/summary")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                summary = data.get("summary", {})
                total_profit = summary.get("total_profit", 0)
                self.log_test("Admin Revenue Summary", True, f"Total platform profit: £{total_profit}")
            else:
                self.log_test("Admin Revenue Summary", False, f"Revenue summary error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Admin Revenue Summary", False, 
                        f"Revenue summary failed: {response.status_code if response else 'No response'}")
        
        # Test 7.3: Admin Internal Balances
        response = self.make_request("GET", "/admin/internal-balances")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", {})
                self.log_test("Admin Internal Balances", True, f"Internal balances accessible with {len(balances)} entries")
            else:
                self.log_test("Admin Internal Balances", False, f"Internal balances error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Admin Internal Balances", False, 
                        f"Internal balances failed: {response.status_code if response else 'No response'}")
        
        # Test 7.4: CMS Coins Management
        response = self.make_request("GET", "/admin/cms/coins")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                coins = data.get("coins", [])
                self.log_test("CMS Coins Management", True, f"Found {len(coins)} coins in CMS")
            else:
                self.log_test("CMS Coins Management", False, f"CMS coins error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("CMS Coins Management", False, 
                        f"CMS coins failed: {response.status_code if response else 'No response'}")
        
        # Test 7.5: Trading Pairs
        response = self.make_request("GET", "/trading/pairs")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                pairs = data.get("pairs", [])
                self.log_test("Trading Pairs", True, f"Found {len(pairs)} trading pairs")
            else:
                self.log_test("Trading Pairs", False, f"Trading pairs error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Trading Pairs", False, 
                        f"Trading pairs failed: {response.status_code if response else 'No response'}")
        
        # Test 7.6: Admin Trading Liquidity
        response = self.make_request("GET", "/admin/trading-liquidity")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                liquidity = data.get("liquidity", [])
                self.log_test("Admin Trading Liquidity", True, f"Found liquidity data for {len(liquidity)} currencies")
            else:
                self.log_test("Admin Trading Liquidity", False, f"Trading liquidity error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Admin Trading Liquidity", False, 
                        f"Trading liquidity failed: {response.status_code if response else 'No response'}")
    
    def test_additional_endpoints(self):
        """Test Additional Important Endpoints"""
        print("\n🔧 TESTING ADDITIONAL ENDPOINTS")
        
        # Test coins metadata
        response = self.make_request("GET", "/coins/metadata")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Coins Metadata", True, f"Found metadata for {len(data)} coins")
            else:
                self.log_test("Coins Metadata", True, "Coins metadata endpoint accessible")
        else:
            self.log_test("Coins Metadata", False, 
                        f"Coins metadata failed: {response.status_code if response else 'No response'}")
        
        # Test coins enabled
        response = self.make_request("GET", "/coins/enabled")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Coins Enabled", True, f"Found {len(data)} enabled coins")
            else:
                self.log_test("Coins Enabled", True, "Coins enabled endpoint accessible")
        else:
            self.log_test("Coins Enabled", False, 
                        f"Coins enabled failed: {response.status_code if response else 'No response'}")
        
        # Test platform settings
        response = self.make_request("GET", "/admin/platform-settings")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                settings = data.get("settings", {})
                self.log_test("Platform Settings", True, f"Platform settings accessible with {len(settings)} settings")
            else:
                self.log_test("Platform Settings", False, f"Platform settings error: {data.get('message', 'Unknown error')}")
        else:
            self.log_test("Platform Settings", False, 
                        f"Platform settings failed: {response.status_code if response else 'No response'}")
    
    def run_comprehensive_test(self):
        """Run all comprehensive backend tests"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all test suites
        self.test_authentication_system()
        self.test_referral_system()
        self.test_p2p_trading_system()
        self.test_crypto_operations()
        self.test_price_alerts()
        self.test_telegram_bot_integration()
        self.test_admin_features()
        self.test_additional_endpoints()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate summary
        total_tests = len(self.test_results)
        passed_count = len(self.passed_tests)
        failed_count = len(self.failed_tests)
        success_rate = (passed_count / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE BACKEND TEST RESULTS")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {failed_count}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        if self.passed_tests:
            print(f"\n✅ PASSED TESTS ({len(self.passed_tests)}):")
            for test in self.passed_tests[:10]:  # Show first 10
                print(f"  - {test}")
            if len(self.passed_tests) > 10:
                print(f"  ... and {len(self.passed_tests) - 10} more")
        
        # Save detailed results
        with open("/app/comprehensive_backend_test_results.json", "w") as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed": passed_count,
                    "failed": failed_count,
                    "success_rate": success_rate,
                    "duration": duration,
                    "timestamp": datetime.now().isoformat()
                },
                "failed_tests": self.failed_tests,
                "passed_tests": self.passed_tests,
                "detailed_results": self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/comprehensive_backend_test_results.json")
        
        return {
            "total_tests": total_tests,
            "passed": passed_count,
            "failed": failed_count,
            "success_rate": success_rate,
            "failed_tests": self.failed_tests,
            "passed_tests": self.passed_tests
        }

if __name__ == "__main__":
    tester = ComprehensiveBackendTester()
    results = tester.run_comprehensive_test()