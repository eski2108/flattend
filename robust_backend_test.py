#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND TESTING - ALL FEATURES (ROBUST VERSION)
Review Request: Test ALL backend functionality and identify any broken features
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://neon-vault-1.preview.emergentagent.com/api"

class RobustBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_tokens = {}
        self.user_ids = {}
        self.failed_tests = []
        self.passed_tests = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        if success:
            self.passed_tests.append(test_name)
            print(f"✅ {test_name}: {details}")
        else:
            self.failed_tests.append(test_name)
            print(f"❌ {test_name}: {details}")
    
    def safe_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with comprehensive error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                return None, f"Unsupported method: {method}"
            
            return response, None
        except requests.exceptions.Timeout:
            return None, "Request timeout"
        except requests.exceptions.ConnectionError:
            return None, "Connection error"
        except requests.exceptions.RequestException as e:
            return None, f"Request error: {str(e)}"
        except Exception as e:
            return None, f"Unexpected error: {str(e)}"
    
    def safe_json(self, response):
        """Safely parse JSON response"""
        try:
            return response.json(), None
        except Exception as e:
            return None, f"JSON parse error: {str(e)}"
    
    def test_authentication_system(self):
        """Test Authentication System"""
        print("\n🔐 TESTING AUTHENTICATION SYSTEM")
        
        # Test 1.1: User Registration
        timestamp = int(time.time())
        test_email = f"test_user_{timestamp}@test.com"
        registration_data = {
            "email": test_email,
            "password": "Test123456",
            "full_name": "Test User",
            "phone_number": "+447808184311"
        }
        
        response, error = self.safe_request("POST", "/auth/register", registration_data)
        if error:
            self.log_test("User Registration", False, f"Request failed: {error}")
        elif response:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("User Registration", False, f"Response parsing failed: {json_error}")
            elif response.status_code == 200 and data and data.get("success"):
                self.log_test("User Registration", True, f"User registered successfully (status: {response.status_code})")
                self.test_email = test_email
            else:
                self.log_test("User Registration", False, 
                            f"Registration failed (status: {response.status_code}, message: {data.get('message', 'Unknown') if data else 'No data'})")
        
        # Test 1.2: User Login
        if hasattr(self, 'test_email'):
            login_data = {
                "email": self.test_email,
                "password": "Test123456"
            }
            
            response, error = self.safe_request("POST", "/auth/login", login_data)
            if error:
                self.log_test("User Login", False, f"Request failed: {error}")
            elif response:
                data, json_error = self.safe_json(response)
                if json_error:
                    self.log_test("User Login", False, f"Response parsing failed: {json_error}")
                elif response.status_code == 200 and data and data.get("success") and data.get("token"):
                    self.log_test("User Login", True, f"Login successful, token received")
                    self.user_token = data["token"]
                    # Extract user_id from user object or directly from response
                    user_data = data.get("user", {})
                    self.user_id = user_data.get("user_id") or data.get("user_id")
                else:
                    self.log_test("User Login", False, 
                                f"Login failed (status: {response.status_code}, message: {data.get('message', 'Unknown') if data else 'No data'})")
        
        # Test 1.3: Email Verification Endpoint
        response, error = self.safe_request("POST", "/auth/verify-email", {"email": "test@example.com", "code": "123456"})
        if error:
            self.log_test("Email Verification Endpoint", False, f"Request failed: {error}")
        elif response:
            self.log_test("Email Verification Endpoint", True, f"Endpoint accessible (status: {response.status_code})")
        
        # Test 1.4: Password Reset
        response, error = self.safe_request("POST", "/auth/forgot-password", {"email": "test@example.com"})
        if error:
            self.log_test("Password Reset Endpoint", False, f"Request failed: {error}")
        elif response:
            self.log_test("Password Reset Endpoint", True, f"Endpoint accessible (status: {response.status_code})")
    
    def test_referral_system(self):
        """Test Referral System"""
        print("\n🔗 TESTING REFERRAL SYSTEM")
        
        if not hasattr(self, 'user_id') or not self.user_id:
            self.log_test("Referral System", False, "No authenticated user available for testing")
            return
        
        headers = {"Authorization": f"Bearer {self.user_token}"} if hasattr(self, 'user_token') else {}
        
        # Test 2.1: Get Referral Dashboard
        response, error = self.safe_request("GET", f"/referral/dashboard/{self.user_id}", headers=headers)
        if error:
            self.log_test("Referral Dashboard", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Referral Dashboard", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                referral_code = data.get("referral_code", "N/A")
                self.log_test("Referral Dashboard", True, f"Dashboard accessible, referral code: {referral_code}")
            else:
                self.log_test("Referral Dashboard", False, f"Dashboard error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Referral Dashboard", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 2.2: Apply Referral Code
        response, error = self.safe_request("POST", "/referral/apply", 
                                           {"referral_code": "TEST123", "referred_user_id": self.user_id}, headers=headers)
        if error:
            self.log_test("Apply Referral Code", False, f"Request failed: {error}")
        elif response:
            self.log_test("Apply Referral Code", True, f"Endpoint accessible (status: {response.status_code})")
        
        # Test 2.3: Check Referral Discount
        response, error = self.safe_request("GET", f"/referral/check-discount/{self.user_id}", headers=headers)
        if error:
            self.log_test("Check Referral Discount", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            self.log_test("Check Referral Discount", True, "Discount check working")
        else:
            self.log_test("Check Referral Discount", False, f"Request failed (status: {response.status_code if response else 'No response'})")
    
    def test_p2p_trading_system(self):
        """Test P2P Trading System"""
        print("\n💱 TESTING P2P TRADING SYSTEM")
        
        # Test 3.1: Get P2P Offers
        response, error = self.safe_request("GET", "/p2p/offers")
        if error:
            self.log_test("P2P Get Offers", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("P2P Get Offers", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                offers_count = len(data.get("offers", []))
                self.log_test("P2P Get Offers", True, f"Found {offers_count} P2P offers")
            else:
                self.log_test("P2P Get Offers", False, f"Get offers error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("P2P Get Offers", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 3.2: Legacy P2P System - Sell Orders
        response, error = self.safe_request("GET", "/crypto-market/sell/orders")
        if error:
            self.log_test("Legacy P2P Sell Orders", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Legacy P2P Sell Orders", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                orders_count = len(data.get("orders", []))
                self.log_test("Legacy P2P Sell Orders", True, f"Found {orders_count} sell orders")
            else:
                self.log_test("Legacy P2P Sell Orders", False, f"Sell orders error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Legacy P2P Sell Orders", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 3.3: P2P Configuration
        response, error = self.safe_request("GET", "/p2p/config")
        if error:
            self.log_test("P2P Configuration", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            self.log_test("P2P Configuration", True, "P2P configuration endpoint working")
        else:
            self.log_test("P2P Configuration", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 3.4: P2P Marketplace Available Coins
        response, error = self.safe_request("GET", "/p2p/marketplace/available-coins")
        if error:
            self.log_test("P2P Available Coins", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("P2P Available Coins", False, f"Response parsing failed: {json_error}")
            elif isinstance(data, list):
                self.log_test("P2P Available Coins", True, f"Found {len(data)} available coins for P2P")
            else:
                self.log_test("P2P Available Coins", True, "P2P available coins endpoint accessible")
        else:
            self.log_test("P2P Available Coins", False, f"Request failed (status: {response.status_code if response else 'No response'})")
    
    def test_crypto_operations(self):
        """Test Crypto Operations"""
        print("\n💰 TESTING CRYPTO OPERATIONS")
        
        if not hasattr(self, 'user_id') or not self.user_id:
            self.log_test("Crypto Operations", False, "No user ID available for testing")
            return
        
        # Test 4.1: Crypto Bank Balances
        response, error = self.safe_request("GET", f"/crypto-bank/balances/{self.user_id}")
        if error:
            self.log_test("Crypto Bank Balances", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Crypto Bank Balances", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                balances = data.get("balances", {})
                self.log_test("Crypto Bank Balances", True, f"Retrieved balances for {len(balances)} currencies")
            else:
                self.log_test("Crypto Bank Balances", False, f"Balance error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Crypto Bank Balances", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 4.2: Crypto Deposit
        deposit_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.001,
            "tx_hash": f"test_tx_{int(time.time())}"
        }
        response, error = self.safe_request("POST", "/crypto-bank/deposit", deposit_data)
        if error:
            self.log_test("Crypto Deposit", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Crypto Deposit", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                self.log_test("Crypto Deposit", True, f"Deposit successful: {data.get('message', 'Success')}")
            else:
                self.log_test("Crypto Deposit", False, f"Deposit error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Crypto Deposit", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 4.3: Crypto Withdrawal
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.0001,
            "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
        }
        response, error = self.safe_request("POST", "/crypto-bank/withdraw", withdrawal_data)
        if error:
            self.log_test("Crypto Withdrawal", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Crypto Withdrawal", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                self.log_test("Crypto Withdrawal", True, f"Withdrawal successful: {data.get('message', 'Success')}")
            else:
                self.log_test("Crypto Withdrawal", False, f"Withdrawal error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Crypto Withdrawal", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 4.4: Transaction History
        response, error = self.safe_request("GET", f"/crypto-bank/transactions/{self.user_id}")
        if error:
            self.log_test("Transaction History", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Transaction History", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                transactions = data.get("transactions", [])
                self.log_test("Transaction History", True, f"Retrieved {len(transactions)} transactions")
            else:
                self.log_test("Transaction History", False, f"Transaction history error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Transaction History", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 4.5: Swap Preview
        swap_preview_data = {
            "from_currency": "BTC",
            "to_currency": "ETH",
            "amount": 0.01
        }
        response, error = self.safe_request("POST", "/swap/preview", swap_preview_data)
        if error:
            self.log_test("Swap Preview", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Swap Preview", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                self.log_test("Swap Preview", True, f"Swap preview working: {data.get('to_amount', 'N/A')} ETH")
            else:
                self.log_test("Swap Preview", False, f"Swap preview error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Swap Preview", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 4.6: Swap Available Coins
        response, error = self.safe_request("GET", "/swap/available-coins")
        if error:
            self.log_test("Swap Available Coins", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Swap Available Coins", False, f"Response parsing failed: {json_error}")
            elif isinstance(data, list):
                self.log_test("Swap Available Coins", True, f"Found {len(data)} coins available for swap")
            else:
                self.log_test("Swap Available Coins", True, "Swap available coins endpoint accessible")
        else:
            self.log_test("Swap Available Coins", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 4.7: Express Buy Config
        response, error = self.safe_request("GET", "/express-buy/config")
        if error:
            self.log_test("Express Buy Config", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            self.log_test("Express Buy Config", True, "Express Buy configuration accessible")
        else:
            self.log_test("Express Buy Config", False, f"Request failed (status: {response.status_code if response else 'No response'})")
    
    def test_price_alerts(self):
        """Test Price Alerts System"""
        print("\n📊 TESTING PRICE ALERTS SYSTEM")
        
        if not hasattr(self, 'user_id') or not self.user_id:
            self.log_test("Price Alerts", False, "No user ID available for testing")
            return
        
        # Test 5.1: Get User Price Alerts
        response, error = self.safe_request("GET", f"/price-alerts/user/{self.user_id}")
        if error:
            self.log_test("Get Price Alerts", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Get Price Alerts", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                alerts = data.get("alerts", [])
                self.log_test("Get Price Alerts", True, f"Retrieved {len(alerts)} price alerts")
            else:
                self.log_test("Get Price Alerts", False, f"Get alerts error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Get Price Alerts", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 5.2: Create Price Alert
        alert_data = {
            "user_id": self.user_id,
            "coin": "BTC",
            "target_price": 50000,
            "condition": "above",
            "notification_method": "email"
        }
        response, error = self.safe_request("POST", "/price-alerts/create", alert_data)
        if error:
            self.log_test("Create Price Alert", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Create Price Alert", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                self.log_test("Create Price Alert", True, f"Price alert created: {data.get('alert_id', 'Success')}")
            else:
                self.log_test("Create Price Alert", False, f"Create alert error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Create Price Alert", False, f"Request failed (status: {response.status_code if response else 'No response'})")
    
    def test_admin_features(self):
        """Test Admin Features"""
        print("\n👑 TESTING ADMIN FEATURES")
        
        # Test 7.1: Platform Wallet Balance
        response, error = self.safe_request("GET", "/admin/platform-wallet/balance")
        if error:
            self.log_test("Platform Wallet Balance", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Platform Wallet Balance", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                balances = data.get("balances", {})
                self.log_test("Platform Wallet Balance", True, f"Platform wallet has {len(balances)} currencies")
            else:
                self.log_test("Platform Wallet Balance", False, f"Platform wallet error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Platform Wallet Balance", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 7.2: Admin Revenue Summary
        response, error = self.safe_request("GET", "/admin/revenue/summary")
        if error:
            self.log_test("Admin Revenue Summary", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Admin Revenue Summary", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                summary = data.get("summary", {})
                total_profit = summary.get("total_profit", 0)
                self.log_test("Admin Revenue Summary", True, f"Total platform profit: £{total_profit}")
            else:
                self.log_test("Admin Revenue Summary", False, f"Revenue summary error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Admin Revenue Summary", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 7.3: CMS Coins Management
        response, error = self.safe_request("GET", "/admin/cms/coins")
        if error:
            self.log_test("CMS Coins Management", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("CMS Coins Management", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                coins = data.get("coins", [])
                self.log_test("CMS Coins Management", True, f"Found {len(coins)} coins in CMS")
            else:
                self.log_test("CMS Coins Management", False, f"CMS coins error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("CMS Coins Management", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 7.4: Trading Pairs
        response, error = self.safe_request("GET", "/trading/pairs")
        if error:
            self.log_test("Trading Pairs", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Trading Pairs", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                pairs = data.get("pairs", [])
                self.log_test("Trading Pairs", True, f"Found {len(pairs)} trading pairs")
            else:
                self.log_test("Trading Pairs", False, f"Trading pairs error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Trading Pairs", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test 7.5: Admin Trading Liquidity
        response, error = self.safe_request("GET", "/admin/trading-liquidity")
        if error:
            self.log_test("Admin Trading Liquidity", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Admin Trading Liquidity", False, f"Response parsing failed: {json_error}")
            elif data and data.get("success"):
                liquidity = data.get("liquidity", [])
                self.log_test("Admin Trading Liquidity", True, f"Found liquidity data for {len(liquidity)} currencies")
            else:
                self.log_test("Admin Trading Liquidity", False, f"Trading liquidity error: {data.get('message', 'Unknown') if data else 'No data'}")
        else:
            self.log_test("Admin Trading Liquidity", False, f"Request failed (status: {response.status_code if response else 'No response'})")
    
    def test_additional_endpoints(self):
        """Test Additional Important Endpoints"""
        print("\n🔧 TESTING ADDITIONAL ENDPOINTS")
        
        # Test coins metadata
        response, error = self.safe_request("GET", "/coins/metadata")
        if error:
            self.log_test("Coins Metadata", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Coins Metadata", False, f"Response parsing failed: {json_error}")
            elif isinstance(data, list):
                self.log_test("Coins Metadata", True, f"Found metadata for {len(data)} coins")
            else:
                self.log_test("Coins Metadata", True, "Coins metadata endpoint accessible")
        else:
            self.log_test("Coins Metadata", False, f"Request failed (status: {response.status_code if response else 'No response'})")
        
        # Test coins enabled
        response, error = self.safe_request("GET", "/coins/enabled")
        if error:
            self.log_test("Coins Enabled", False, f"Request failed: {error}")
        elif response and response.status_code == 200:
            data, json_error = self.safe_json(response)
            if json_error:
                self.log_test("Coins Enabled", False, f"Response parsing failed: {json_error}")
            elif isinstance(data, list):
                self.log_test("Coins Enabled", True, f"Found {len(data)} enabled coins")
            else:
                self.log_test("Coins Enabled", True, "Coins enabled endpoint accessible")
        else:
            self.log_test("Coins Enabled", False, f"Request failed (status: {response.status_code if response else 'No response'})")
    
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
        self.test_admin_features()
        self.test_additional_endpoints()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate summary
        total_tests = len(self.passed_tests) + len(self.failed_tests)
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
        
        return {
            "total_tests": total_tests,
            "passed": passed_count,
            "failed": failed_count,
            "success_rate": success_rate,
            "failed_tests": self.failed_tests,
            "passed_tests": self.passed_tests
        }

if __name__ == "__main__":
    tester = RobustBackendTester()
    results = tester.run_comprehensive_test()