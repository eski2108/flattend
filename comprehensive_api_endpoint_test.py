#!/usr/bin/env python3
"""
COMPREHENSIVE API ENDPOINT VERIFICATION TEST
Testing ALL critical API endpoints as requested in review
"""

import requests
import json
import time
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://codehealer-31.preview.emergentagent.com/api"
TEST_USER_EMAIL = "gads21083@gmail.com"
TEST_USER_PASSWORD = "123456789"
TEST_ADMIN_EMAIL = "info@coinhubx.net"
TEST_ADMIN_PASSWORD = "Demo1234"
TEST_ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, endpoint, method, status_code, success, details="", response_time=0):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "success": success,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_emoji = "✅" if success else "❌"
        print(f"{status_emoji} {method} {endpoint} - {status_code} ({response_time:.2f}s) - {details}")
        
    def test_endpoint(self, endpoint, method="GET", data=None, headers=None, expected_status=200):
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        start_time = time.time()
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=10)
            
            response_time = time.time() - start_time
            
            # Check if response time is under 2 seconds
            performance_ok = response_time < 2.0
            
            success = response.status_code == expected_status and performance_ok
            
            details = f"Expected {expected_status}, got {response.status_code}"
            if not performance_ok:
                details += f" (SLOW: {response_time:.2f}s)"
                
            try:
                response_data = response.json()
                if not success and 'detail' in response_data:
                    details += f" - {response_data['detail']}"
            except:
                pass
                
            self.log_result(endpoint, method, response.status_code, success, details, response_time)
            return response
            
        except requests.exceptions.Timeout:
            self.log_result(endpoint, method, 0, False, "TIMEOUT (>10s)", 10.0)
            return None
        except Exception as e:
            self.log_result(endpoint, method, 0, False, f"ERROR: {str(e)}", 0)
            return None

    def authenticate_user(self):
        """Authenticate test user"""
        print("\n🔐 AUTHENTICATING USER...")
        
        # Try to login
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.test_endpoint("/auth/login", "POST", login_data)
        if response and response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "token" in data:
                    self.auth_token = data["token"]
                    self.user_id = data.get("user", {}).get("user_id")
                    print(f"✅ User authenticated successfully - User ID: {self.user_id}")
                    return True
            except:
                pass
        
        print("❌ User authentication failed")
        return False
        
    def authenticate_admin(self):
        """Authenticate admin user"""
        print("\n🔐 AUTHENTICATING ADMIN...")
        
        admin_data = {
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
            "admin_code": TEST_ADMIN_CODE
        }
        
        response = self.test_endpoint("/admin/login", "POST", admin_data)
        if response and response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "token" in data:
                    self.admin_token = data["token"]
                    print("✅ Admin authenticated successfully")
                    return True
            except:
                pass
        
        print("❌ Admin authentication failed")
        return False

    def test_authentication_endpoints(self):
        """Test all authentication endpoints"""
        print("\n🔑 TESTING AUTHENTICATION ENDPOINTS...")
        
        # Test registration with rate limiting
        print("\n📝 Testing Registration Rate Limiting...")
        for i in range(6):  # Try 6 registrations to test rate limit
            reg_data = {
                "email": f"test{i}_{uuid.uuid4().hex[:8]}@test.com",
                "password": "TestPass123!",
                "full_name": f"Test User {i}",
                "phone_number": f"+44780818431{i}"
            }
            
            expected_status = 429 if i >= 3 else 201  # Rate limit after 3 attempts
            response = self.test_endpoint("/auth/register", "POST", reg_data, expected_status=expected_status)
            
            if i >= 3 and response and response.status_code == 429:
                print("✅ Rate limiting working correctly")
                break
        
        # Test login
        self.authenticate_user()
        
        # Test Google OAuth endpoint
        self.test_endpoint("/auth/google", "GET", expected_status=302)
        
        # Test 2FA verify (without actual 2FA setup)
        if self.user_id:
            twofa_data = {
                "user_id": self.user_id,
                "code": "123456"
            }
            self.test_endpoint("/auth/2fa/verify", "POST", twofa_data, expected_status=400)

    def test_wallet_endpoints(self):
        """Test all wallet endpoints"""
        print("\n💰 TESTING WALLET ENDPOINTS...")
        
        if not self.user_id:
            print("❌ Cannot test wallet endpoints - no authenticated user")
            return
            
        headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
        
        # Test wallet balances
        self.test_endpoint(f"/wallets/balances/{self.user_id}", "GET", headers=headers)
        
        # Test portfolio
        self.test_endpoint(f"/wallets/portfolio/{self.user_id}", "GET", headers=headers)
        
        # Test transactions
        self.test_endpoint(f"/wallets/transactions/{self.user_id}", "GET", headers=headers)
        
        # Test individual wallet balance
        self.test_endpoint(f"/wallet/balance/{self.user_id}/BTC", "GET", headers=headers)
        self.test_endpoint(f"/wallet/balance/{self.user_id}/ETH", "GET", headers=headers)
        
        # Test wallet credit
        credit_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.001,
            "transaction_type": "test_credit"
        }
        self.test_endpoint("/wallet/credit", "POST", credit_data, headers=headers)
        
        # Test wallet withdraw
        withdraw_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.0001,
            "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        }
        self.test_endpoint("/wallet/withdraw", "POST", withdraw_data, headers=headers)
        
        # Test withdrawals list
        self.test_endpoint(f"/wallet/withdrawals/{self.user_id}", "GET", headers=headers)
        
        # Test deposit submission
        deposit_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.001,
            "tx_hash": "test_tx_hash_" + uuid.uuid4().hex[:16]
        }
        self.test_endpoint("/wallet/submit-deposit", "POST", deposit_data, headers=headers)
        
        # Test deposits list
        self.test_endpoint(f"/wallet/deposits/{self.user_id}", "GET", headers=headers)

    def test_p2p_endpoints(self):
        """Test all P2P endpoints"""
        print("\n🤝 TESTING P2P ENDPOINTS...")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
        
        # Test marketplace offers
        self.test_endpoint("/p2p/marketplace/offers", "GET")
        
        # Test create offer
        if self.user_id:
            offer_data = {
                "user_id": self.user_id,
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "amount": 0.01,
                "price": 50000,
                "payment_methods": ["bank_transfer"],
                "offer_type": "sell"
            }
            self.test_endpoint("/p2p/create-offer", "POST", offer_data, headers=headers)
        
        # Test preview order
        preview_data = {
            "offer_id": "test_offer_id",
            "amount": 0.01,
            "user_id": self.user_id or "test_user"
        }
        self.test_endpoint("/p2p/preview-order", "POST", preview_data, headers=headers)
        
        # Test create trade
        trade_data = {
            "offer_id": "test_offer_id",
            "buyer_id": self.user_id or "test_user",
            "amount": 0.01,
            "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        }
        self.test_endpoint("/p2p/create-trade", "POST", trade_data, headers=headers)
        
        # Test get trade (with dummy trade ID)
        self.test_endpoint("/p2p/trade/test_trade_id", "GET", headers=headers)
        
        # Test mark paid
        mark_paid_data = {
            "trade_id": "test_trade_id",
            "user_id": self.user_id or "test_user",
            "payment_reference": "TEST_REF_123"
        }
        self.test_endpoint("/p2p/mark-paid", "POST", mark_paid_data, headers=headers)
        
        # Test release crypto
        release_data = {
            "trade_id": "test_trade_id",
            "user_id": self.user_id or "test_user"
        }
        self.test_endpoint("/p2p/release-crypto", "POST", release_data, headers=headers)
        
        # Test cancel trade
        cancel_data = {
            "trade_id": "test_trade_id",
            "user_id": self.user_id or "test_user",
            "reason": "Test cancellation"
        }
        self.test_endpoint("/p2p/cancel-trade", "POST", cancel_data, headers=headers)
        
        # Test user trades
        if self.user_id:
            self.test_endpoint(f"/p2p/trades/user/{self.user_id}", "GET", headers=headers)
        
        # Test express match
        express_data = {
            "user_id": self.user_id or "test_user",
            "crypto_currency": "BTC",
            "fiat_currency": "GBP",
            "amount": 0.01,
            "trade_type": "buy"
        }
        self.test_endpoint("/p2p/express-match", "POST", express_data, headers=headers)

    def test_instant_buy_sell_endpoints(self):
        """Test instant buy/sell endpoints"""
        print("\n⚡ TESTING INSTANT BUY/SELL ENDPOINTS...")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
        
        # Test available coins
        self.test_endpoint("/instant-buy/available-coins", "GET")
        
        # Test admin liquidity quote
        quote_data = {
            "crypto_currency": "BTC",
            "fiat_currency": "GBP",
            "amount": 0.01,
            "trade_type": "buy"
        }
        self.test_endpoint("/admin-liquidity/quote", "POST", quote_data, headers=headers)
        
        # Test admin liquidity execute
        execute_data = {
            "quote_id": "test_quote_id",
            "user_id": self.user_id or "test_user",
            "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        }
        self.test_endpoint("/admin-liquidity/execute", "POST", execute_data, headers=headers)
        
        # Test get quote
        self.test_endpoint("/admin-liquidity/quote/test_quote_id", "GET", headers=headers)
        
        # Test instant sell
        sell_data = {
            "user_id": self.user_id or "test_user",
            "crypto_currency": "BTC",
            "amount": 0.001,
            "fiat_currency": "GBP"
        }
        self.test_endpoint("/monetization/instant-sell", "POST", sell_data, headers=headers)

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n👑 TESTING ADMIN ENDPOINTS...")
        
        # Authenticate admin first
        admin_authenticated = self.authenticate_admin()
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
        
        # Test admin dashboard stats
        self.test_endpoint("/admin/dashboard/stats", "GET", headers=admin_headers)
        
        # Test create admin liquidity offer
        if admin_authenticated:
            liquidity_data = {
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "amount": 1.0,
                "price": 50000,
                "offer_type": "sell"
            }
            self.test_endpoint("/admin/p2p/create-admin-liquidity-offer", "POST", liquidity_data, headers=admin_headers)
        
        # Test admin wallet balance
        self.test_endpoint("/admin/wallet/balance", "GET", headers=admin_headers)

    def test_security_features(self):
        """Test security features"""
        print("\n🔒 TESTING SECURITY FEATURES...")
        
        # Test unauthorized access (should return 401/403, not 404)
        print("\n🚫 Testing Unauthorized Access...")
        
        # Test protected endpoints without auth
        protected_endpoints = [
            "/wallets/balances/test_user",
            "/wallet/credit",
            "/p2p/create-offer",
            "/admin/dashboard/stats"
        ]
        
        for endpoint in protected_endpoints:
            response = self.test_endpoint(endpoint, "GET", expected_status=401)
            if response and response.status_code == 404:
                print(f"⚠️  Security issue: {endpoint} returns 404 instead of 401 for unauthorized access")
        
        # Test input validation
        print("\n✅ Testing Input Validation...")
        
        # Test invalid data formats
        invalid_data_tests = [
            ("/wallet/credit", {"user_id": "", "currency": "", "amount": -1}),
            ("/p2p/create-offer", {"amount": "invalid", "price": -100}),
            ("/auth/login", {"email": "invalid-email", "password": ""})
        ]
        
        for endpoint, invalid_data in invalid_data_tests:
            self.test_endpoint(endpoint, "POST", invalid_data, expected_status=400)

    def test_performance(self):
        """Test performance requirements"""
        print("\n⚡ TESTING PERFORMANCE...")
        
        # Test response times for critical endpoints
        critical_endpoints = [
            "/health",
            "/p2p/marketplace/offers",
            "/instant-buy/available-coins"
        ]
        
        for endpoint in critical_endpoints:
            start_time = time.time()
            response = self.test_endpoint(endpoint, "GET")
            response_time = time.time() - start_time
            
            if response_time > 2.0:
                print(f"⚠️  Performance issue: {endpoint} took {response_time:.2f}s (>2s threshold)")
            else:
                print(f"✅ Performance OK: {endpoint} took {response_time:.2f}s")

    def run_comprehensive_test(self):
        """Run all tests"""
        print("🚀 STARTING COMPREHENSIVE API ENDPOINT VERIFICATION")
        print("=" * 60)
        
        start_time = time.time()
        
        # Test health check first
        self.test_endpoint("/health", "GET")
        
        # Run all test suites
        self.test_authentication_endpoints()
        self.test_wallet_endpoints()
        self.test_p2p_endpoints()
        self.test_instant_buy_sell_endpoints()
        self.test_admin_endpoints()
        self.test_security_features()
        self.test_performance()
        
        # Generate summary
        total_time = time.time() - start_time
        self.generate_summary(total_time)

    def generate_summary(self, total_time):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Total Time: {total_time:.2f}s")
        
        # Group results by category
        categories = {}
        for result in self.test_results:
            endpoint = result["endpoint"]
            category = endpoint.split("/")[1] if "/" in endpoint else "other"
            if category not in categories:
                categories[category] = {"passed": 0, "failed": 0}
            
            if result["success"]:
                categories[category]["passed"] += 1
            else:
                categories[category]["failed"] += 1
        
        print("\n📈 RESULTS BY CATEGORY:")
        for category, stats in categories.items():
            total = stats["passed"] + stats["failed"]
            rate = (stats["passed"] / total * 100) if total > 0 else 0
            print(f"  {category}: {stats['passed']}/{total} ({rate:.1f}%)")
        
        # Show failed tests
        failed_results = [r for r in self.test_results if not r["success"]]
        if failed_results:
            print(f"\n❌ FAILED TESTS ({len(failed_results)}):")
            for result in failed_results:
                print(f"  {result['method']} {result['endpoint']} - {result['status_code']} - {result['details']}")
        
        # Performance issues
        slow_tests = [r for r in self.test_results if r["response_time"] > 2.0]
        if slow_tests:
            print(f"\n⚠️  SLOW RESPONSES (>{2.0}s):")
            for result in slow_tests:
                print(f"  {result['endpoint']} - {result['response_time']:.2f}s")
        
        print("\n✅ COMPREHENSIVE API ENDPOINT VERIFICATION COMPLETED")

if __name__ == "__main__":
    tester = APITester()
    tester.run_comprehensive_test()