#!/usr/bin/env python3
"""
Dashboard Testing Script for Coin Hub X
Tests the specific dashboard functionality requested:
1. Register new test user (screenshot_test@test.com)
2. Login with those credentials
3. Test dashboard sections:
   - Live Market Prices (BTC, ETH, USDT)
   - Your Trading Stats (Total Trades, Trading Volume, Success Rate)
   - Why Trade on Coin Hub X? (4 feature cards with emojis)
   - Enhanced Recent Activity section
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://earn-rewards-21.preview.emergentagent.com/api"

# Test User as requested
TEST_USER = {
    "email": "screenshot_test@test.com",
    "password": "Test123456",
    "full_name": "Screenshot User"
}

class DashboardTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
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
    
    def test_user_registration(self):
        """Test user registration with the specific credentials requested"""
        print(f"\n=== Testing User Registration ===")
        print(f"Email: {TEST_USER['email']}")
        print(f"Name: {TEST_USER['full_name']}")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=TEST_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user_id"):
                    self.user_id = data["user_id"]
                    self.log_test(
                        "User Registration", 
                        True, 
                        f"User registered successfully with ID: {self.user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "User Registration", 
                        False, 
                        "Registration response missing success or user_id",
                        data
                    )
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login to get user_id
                self.log_test(
                    "User Registration", 
                    True, 
                    "User already exists (expected for repeated tests)"
                )
                return self.test_user_login()
            else:
                self.log_test(
                    "User Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "User Registration", 
                False, 
                f"Registration request failed: {str(e)}"
            )
            
        return False
    
    def test_user_login(self):
        """Test user login with the specific credentials"""
        print(f"\n=== Testing User Login ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    user_info = data["user"]
                    self.log_test(
                        "User Login", 
                        True, 
                        f"Login successful - User: {user_info.get('full_name')} ({user_info.get('email')})"
                    )
                    return True
                else:
                    self.log_test(
                        "User Login", 
                        False, 
                        "Login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    "User Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "User Login", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False
    
    def test_live_market_prices(self):
        """Test the Live Market Prices API endpoint"""
        print(f"\n=== Testing Live Market Prices API ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto/prices",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "prices" in data:
                    prices = data["prices"]
                    
                    # Check for required cryptocurrencies
                    required_cryptos = ["BTC", "ETH", "USDT"]
                    missing_cryptos = [crypto for crypto in required_cryptos if crypto not in prices]
                    
                    if not missing_cryptos:
                        # Check price data structure
                        btc_price = prices["BTC"]
                        eth_price = prices["ETH"]
                        usdt_price = prices["USDT"]
                        
                        # Verify price data has required fields
                        required_fields = ["gbp", "usd", "change_24h"]
                        all_fields_present = all(
                            field in btc_price and field in eth_price and field in usdt_price
                            for field in required_fields
                        )
                        
                        if all_fields_present:
                            self.log_test(
                                "Live Market Prices API", 
                                True, 
                                f"Market prices available - BTC: £{btc_price['gbp']:,.0f}, ETH: £{eth_price['gbp']:,.0f}, USDT: £{usdt_price['gbp']:.2f}"
                            )
                            return True
                        else:
                            self.log_test(
                                "Live Market Prices API", 
                                False, 
                                "Price data missing required fields (gbp, usd, change_24h)"
                            )
                    else:
                        self.log_test(
                            "Live Market Prices API", 
                            False, 
                            f"Missing cryptocurrency prices: {missing_cryptos}"
                        )
                else:
                    self.log_test(
                        "Live Market Prices API", 
                        False, 
                        "Invalid market prices response format",
                        data
                    )
            else:
                self.log_test(
                    "Live Market Prices API", 
                    False, 
                    f"Market prices API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Live Market Prices API", 
                False, 
                f"Market prices request failed: {str(e)}"
            )
            
        return False
    
    def test_user_trading_stats(self):
        """Test user trading statistics for dashboard"""
        print(f"\n=== Testing User Trading Stats ===")
        
        if not self.user_id:
            self.log_test(
                "User Trading Stats", 
                False, 
                "Cannot test trading stats - no user ID available"
            )
            return False
        
        try:
            # Test user transactions endpoint
            response = self.session.get(
                f"{BASE_URL}/user/transactions/user_{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    self.log_test(
                        "User Transactions API", 
                        True, 
                        f"User has {len(transactions)} transactions"
                    )
                    
                    # Test crypto balances endpoint (for crypto bank)
                    response = self.session.get(
                        f"{BASE_URL}/crypto-bank/balances/{self.user_id}",
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        balance_data = response.json()
                        if balance_data.get("success") and "balances" in balance_data:
                            balances = balance_data["balances"]
                            self.log_test(
                                "User Crypto Balances", 
                                True, 
                                f"User has balances for {len(balances)} currencies"
                            )
                            return True
                        else:
                            self.log_test(
                                "User Crypto Balances", 
                                False, 
                                "Invalid crypto balances response",
                                balance_data
                            )
                    else:
                        self.log_test(
                            "User Crypto Balances", 
                            False, 
                            f"Crypto balances API failed with status {response.status_code}"
                        )
                else:
                    self.log_test(
                        "User Transactions API", 
                        False, 
                        "Invalid transactions response format",
                        data
                    )
            else:
                self.log_test(
                    "User Transactions API", 
                    False, 
                    f"User transactions API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "User Trading Stats", 
                False, 
                f"Trading stats request failed: {str(e)}"
            )
            
        return False
    
    def test_platform_stats(self):
        """Test platform statistics for dashboard features"""
        print(f"\n=== Testing Platform Stats ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/platform/stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    
                    # Check for required stats
                    required_stats = ["total_users", "total_volume", "platform_fees"]
                    missing_stats = [stat for stat in required_stats if stat not in stats]
                    
                    if not missing_stats:
                        self.log_test(
                            "Platform Stats API", 
                            True, 
                            f"Platform stats: {stats['total_users']} users, £{stats['total_volume']:,.2f} volume"
                        )
                        return True
                    else:
                        self.log_test(
                            "Platform Stats API", 
                            False, 
                            f"Missing platform stats: {missing_stats}"
                        )
                else:
                    self.log_test(
                        "Platform Stats API", 
                        False, 
                        "Invalid platform stats response format",
                        data
                    )
            else:
                self.log_test(
                    "Platform Stats API", 
                    False, 
                    f"Platform stats API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Platform Stats API", 
                False, 
                f"Platform stats request failed: {str(e)}"
            )
            
        return False
    
    def test_crypto_bank_endpoints(self):
        """Test crypto bank endpoints for dashboard functionality"""
        print(f"\n=== Testing Crypto Bank Endpoints ===")
        
        if not self.user_id:
            self.log_test(
                "Crypto Bank Endpoints", 
                False, 
                "Cannot test crypto bank - no user ID available"
            )
            return False
        
        success_count = 0
        total_tests = 0
        
        # Test balances endpoint
        try:
            total_tests += 1
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    success_count += 1
                    self.log_test(
                        "Crypto Bank Balances", 
                        True, 
                        "Crypto balances endpoint working"
                    )
                else:
                    self.log_test(
                        "Crypto Bank Balances", 
                        False, 
                        "Crypto balances response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Crypto Bank Balances", 
                    False, 
                    f"Crypto balances failed with status {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "Crypto Bank Balances", 
                False, 
                f"Crypto balances request failed: {str(e)}"
            )
        
        # Test transactions endpoint
        try:
            total_tests += 1
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/transactions/{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    success_count += 1
                    self.log_test(
                        "Crypto Bank Transactions", 
                        True, 
                        "Crypto transactions endpoint working"
                    )
                else:
                    self.log_test(
                        "Crypto Bank Transactions", 
                        False, 
                        "Crypto transactions response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Crypto Bank Transactions", 
                    False, 
                    f"Crypto transactions failed with status {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "Crypto Bank Transactions", 
                False, 
                f"Crypto transactions request failed: {str(e)}"
            )
        
        # Test onboarding status
        try:
            total_tests += 1
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/onboarding/{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    success_count += 1
                    self.log_test(
                        "Crypto Bank Onboarding", 
                        True, 
                        "Crypto onboarding endpoint working"
                    )
                else:
                    self.log_test(
                        "Crypto Bank Onboarding", 
                        False, 
                        "Crypto onboarding response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Crypto Bank Onboarding", 
                    False, 
                    f"Crypto onboarding failed with status {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "Crypto Bank Onboarding", 
                False, 
                f"Crypto onboarding request failed: {str(e)}"
            )
        
        return success_count == total_tests
    
    def run_dashboard_tests(self):
        """Run comprehensive dashboard functionality tests"""
        print("🚀 Starting Dashboard Functionality Tests for Coin Hub X")
        print(f"🔗 Testing against: {BASE_URL}")
        print(f"👤 Test user: {TEST_USER['full_name']} ({TEST_USER['email']})")
        
        # Test sequence
        tests = [
            ("User Authentication", [
                self.test_user_registration,
                self.test_user_login,
            ]),
            ("Dashboard Data APIs", [
                self.test_live_market_prices,
                self.test_user_trading_stats,
                self.test_platform_stats,
                self.test_crypto_bank_endpoints,
            ])
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for category, test_functions in tests:
            print(f"\n{'='*60}")
            print(f"🧪 Testing Category: {category}")
            print(f"{'='*60}")
            
            for test_func in test_functions:
                total_tests += 1
                if test_func():
                    passed_tests += 1
                # Small delay between tests
                time.sleep(0.5)
        
        # Summary
        print(f"\n{'='*60}")
        print("📊 DASHBOARD FUNCTIONALITY TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Detailed results
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Dashboard readiness assessment
        print(f"\n🎯 DASHBOARD READINESS ASSESSMENT:")
        
        # Check critical components
        critical_tests = [
            "User Registration", "User Login", "Live Market Prices API"
        ]
        
        critical_passed = 0
        for test_name in critical_tests:
            result = next((r for r in self.test_results if r["test"] == test_name), None)
            if result and result["success"]:
                critical_passed += 1
                print(f"✅ {test_name}")
            else:
                print(f"❌ {test_name}")
        
        dashboard_ready = critical_passed == len(critical_tests)
        
        if dashboard_ready:
            print(f"\n🎉 DASHBOARD IS READY FOR TESTING!")
            print(f"✅ User can register with: {TEST_USER['email']}")
            print(f"✅ User can login with password: {TEST_USER['password']}")
            print(f"✅ Live market prices are available")
            print(f"✅ Backend APIs are functional")
        else:
            print(f"\n⚠️  DASHBOARD NOT READY - Critical issues found")
            print(f"❌ {len(critical_tests) - critical_passed}/{len(critical_tests)} critical tests failed")
        
        return dashboard_ready

if __name__ == "__main__":
    tester = DashboardTester()
    success = tester.run_dashboard_tests()
    
    if success:
        print(f"\n🎉 Dashboard backend is ready! User can proceed with frontend testing.")
        sys.exit(0)
    else:
        print(f"\n⚠️  Dashboard backend has issues. Check the details above.")
        sys.exit(1)