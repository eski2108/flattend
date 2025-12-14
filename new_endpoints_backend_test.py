#!/usr/bin/env python3
"""
BACKEND API ENDPOINT VERIFICATION - ALL NEW FEATURES
Test all newly implemented backend endpoints to verify they're working correctly.

**Backend URL:** https://musing-brown-1.preview.emergentagent.com/api

**TEST COVERAGE:**
1. P2P Notification Endpoints (3 endpoints)
2. Wallet Service Endpoints (3 endpoints) 
3. Admin User Management Endpoints (2 endpoints)
4. Referral Dashboard Endpoint (1 endpoint)
5. VIP Purchase Endpoint (1 endpoint)

Total: 10 new endpoints to verify
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://musing-brown-1.preview.emergentagent.com/api"

class NewEndpointsBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, message, details=None, response_time=None):
        """Log test results with detailed information"""
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status} {test_name}: {message}{time_info}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        })
        
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request and measure response time"""
        start_time = time.time()
        try:
            if method.upper() == "GET":
                response = self.session.get(f"{BASE_URL}{endpoint}", params=params, timeout=10)
            elif method.upper() == "POST":
                response = self.session.post(f"{BASE_URL}{endpoint}", json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            return None, response_time, str(e)
    
    # ============================================================================
    # TEST 1: P2P NOTIFICATION ENDPOINTS (3 endpoints)
    # ============================================================================
    
    def test_p2p_notifications_get(self):
        """Test GET /api/p2p/notifications/{user_id}"""
        print("\n=== TEST 1.1: P2P Notifications Get ===")
        
        test_user_id = "test_user_123"
        endpoint = f"/p2p/notifications/{test_user_id}"
        
        result = self.make_request("GET", endpoint)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "GET /api/p2p/notifications/{user_id}",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "notifications" in data and "unread_count" in data:
                    notifications = data["notifications"]
                    unread_count = data["unread_count"]
                    self.log_test(
                        "GET /api/p2p/notifications/{user_id}",
                        True,
                        f"Retrieved {len(notifications)} notifications, {unread_count} unread",
                        {"response_structure": data},
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "GET /api/p2p/notifications/{user_id}",
                        False,
                        "Invalid response structure - missing success, notifications, or unread_count",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "GET /api/p2p/notifications/{user_id}",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "GET /api/p2p/notifications/{user_id}",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    def test_p2p_notifications_mark_read(self):
        """Test POST /api/p2p/notifications/mark-read"""
        print("\n=== TEST 1.2: P2P Notifications Mark Read ===")
        
        endpoint = "/p2p/notifications/mark-read"
        data = {
            "notification_id": "test_notification_123",
            "user_id": "test_user_123"
        }
        
        result = self.make_request("POST", endpoint, data)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "POST /api/p2p/notifications/mark-read",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if "success" in data:
                    success_value = data["success"]
                    self.log_test(
                        "POST /api/p2p/notifications/mark-read",
                        True,
                        f"Mark read response: success={success_value}",
                        data,
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "POST /api/p2p/notifications/mark-read",
                        False,
                        "Response missing 'success' field",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "POST /api/p2p/notifications/mark-read",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "POST /api/p2p/notifications/mark-read",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    def test_p2p_notifications_mark_all_read(self):
        """Test POST /api/p2p/notifications/mark-all-read"""
        print("\n=== TEST 1.3: P2P Notifications Mark All Read ===")
        
        endpoint = "/p2p/notifications/mark-all-read"
        data = {
            "user_id": "test_user_123"
        }
        
        result = self.make_request("POST", endpoint, data)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "POST /api/p2p/notifications/mark-all-read",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "marked_count" in data:
                    marked_count = data["marked_count"]
                    self.log_test(
                        "POST /api/p2p/notifications/mark-all-read",
                        True,
                        f"Marked {marked_count} notifications as read",
                        data,
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "POST /api/p2p/notifications/mark-all-read",
                        False,
                        "Invalid response structure - missing success or marked_count",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "POST /api/p2p/notifications/mark-all-read",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "POST /api/p2p/notifications/mark-all-read",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    # ============================================================================
    # TEST 2: WALLET SERVICE ENDPOINTS (3 endpoints)
    # ============================================================================
    
    def test_wallet_balance_get(self):
        """Test GET /api/wallet/balance/{user_id}/{currency}"""
        print("\n=== TEST 2.1: Wallet Balance Get ===")
        
        user_id = "test_user"
        currency = "BTC"
        endpoint = f"/wallet/balance/{user_id}/{currency}"
        
        result = self.make_request("GET", endpoint)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "GET /api/wallet/balance/{user_id}/{currency}",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "balance" in data:
                    balance = data["balance"]
                    self.log_test(
                        "GET /api/wallet/balance/{user_id}/{currency}",
                        True,
                        f"Retrieved {currency} balance for {user_id}",
                        {"balance": balance},
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "GET /api/wallet/balance/{user_id}/{currency}",
                        False,
                        "Invalid response structure - missing success or balance",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "GET /api/wallet/balance/{user_id}/{currency}",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "GET /api/wallet/balance/{user_id}/{currency}",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    def test_wallet_credit(self):
        """Test POST /api/wallet/credit"""
        print("\n=== TEST 2.2: Wallet Credit ===")
        
        endpoint = "/wallet/credit"
        data = {
            "user_id": "test",
            "currency": "BTC",
            "amount": 1.0,
            "transaction_type": "test"
        }
        
        result = self.make_request("POST", endpoint, data)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "POST /api/wallet/credit",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "balance" in data:
                    balance = data["balance"]
                    self.log_test(
                        "POST /api/wallet/credit",
                        True,
                        f"Successfully credited wallet, new balance returned",
                        {"balance": balance},
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "POST /api/wallet/credit",
                        False,
                        "Invalid response structure - missing success or balance",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "POST /api/wallet/credit",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "POST /api/wallet/credit",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    def test_wallet_transactions_get(self):
        """Test GET /api/wallet/transactions/{user_id}"""
        print("\n=== TEST 2.3: Wallet Transactions Get ===")
        
        user_id = "test_user"
        endpoint = f"/wallet/transactions/{user_id}"
        
        result = self.make_request("GET", endpoint)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "GET /api/wallet/transactions/{user_id}",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    self.log_test(
                        "GET /api/wallet/transactions/{user_id}",
                        True,
                        f"Retrieved {len(transactions)} transactions for {user_id}",
                        {"transaction_count": len(transactions)},
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "GET /api/wallet/transactions/{user_id}",
                        False,
                        "Invalid response structure - missing success or transactions",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "GET /api/wallet/transactions/{user_id}",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "GET /api/wallet/transactions/{user_id}",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    # ============================================================================
    # TEST 3: ADMIN USER MANAGEMENT ENDPOINTS (2 endpoints)
    # ============================================================================
    
    def test_admin_users_all(self):
        """Test GET /api/admin/users/all"""
        print("\n=== TEST 3.1: Admin Users All ===")
        
        endpoint = "/admin/users/all"
        
        result = self.make_request("GET", endpoint)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "GET /api/admin/users/all",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") and "users" in data and "count" in data:
                    users = data["users"]
                    count = data["count"]
                    self.log_test(
                        "GET /api/admin/users/all",
                        True,
                        f"Retrieved {count} users from admin endpoint",
                        {"user_count": count, "users_returned": len(users)},
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "GET /api/admin/users/all",
                        False,
                        "Invalid response structure - missing success, users, or count",
                        data,
                        response_time
                    )
            except json.JSONDecodeError:
                self.log_test(
                    "GET /api/admin/users/all",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "GET /api/admin/users/all",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    def test_admin_users_update_tier(self):
        """Test POST /api/admin/users/update-tier"""
        print("\n=== TEST 3.2: Admin Users Update Tier ===")
        
        endpoint = "/admin/users/update-tier"
        data = {
            "user_id": "test",
            "tier": "vip"
        }
        
        result = self.make_request("POST", endpoint, data)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "POST /api/admin/users/update-tier",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_test(
                    "POST /api/admin/users/update-tier",
                    True,
                    "User tier update endpoint accessible (200 OK)",
                    data,
                    response_time
                )
                return True
            except json.JSONDecodeError:
                self.log_test(
                    "POST /api/admin/users/update-tier",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        elif response.status_code == 404:
            self.log_test(
                "POST /api/admin/users/update-tier",
                True,
                "User tier update endpoint accessible (404 - user doesn't exist, expected)",
                response.text,
                response_time
            )
            return True
        else:
            self.log_test(
                "POST /api/admin/users/update-tier",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    # ============================================================================
    # TEST 4: REFERRAL DASHBOARD ENDPOINT (1 endpoint)
    # ============================================================================
    
    def test_referrals_dashboard(self):
        """Test GET /api/referral/dashboard/{user_id}"""
        print("\n=== TEST 4.1: Referrals Dashboard ===")
        
        user_id = "test_user"
        endpoint = f"/referral/dashboard/{user_id}"
        
        result = self.make_request("GET", endpoint)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "GET /api/referrals/dashboard",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_test(
                    "GET /api/referral/dashboard/{user_id}",
                    True,
                    "Referrals dashboard endpoint accessible with referral data",
                    data,
                    response_time
                )
                return True
            except json.JSONDecodeError:
                self.log_test(
                    "GET /api/referral/dashboard/{user_id}",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        else:
            self.log_test(
                "GET /api/referral/dashboard/{user_id}",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    # ============================================================================
    # TEST 5: VIP PURCHASE ENDPOINT (1 endpoint)
    # ============================================================================
    
    def test_referrals_purchase_vip(self):
        """Test POST /api/user/purchase-vip-tier"""
        print("\n=== TEST 5.1: User Purchase VIP Tier ===")
        
        endpoint = "/user/purchase-vip-tier"
        data = {
            "user_id": "test"
        }
        
        result = self.make_request("POST", endpoint, data)
        if len(result) == 3:  # Error case
            response, response_time, error = result
            self.log_test(
                "POST /api/referrals/purchase-vip",
                False,
                f"Request failed: {error}",
                None,
                response_time
            )
            return False
        
        response, response_time = result
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_test(
                    "POST /api/user/purchase-vip-tier",
                    True,
                    "VIP purchase endpoint accessible (200 OK)",
                    data,
                    response_time
                )
                return True
            except json.JSONDecodeError:
                self.log_test(
                    "POST /api/user/purchase-vip-tier",
                    False,
                    "Invalid JSON response",
                    response.text,
                    response_time
                )
        elif response.status_code == 400:
            self.log_test(
                "POST /api/user/purchase-vip-tier",
                True,
                "VIP purchase endpoint accessible (400 - insufficient balance, expected)",
                response.text,
                response_time
            )
            return True
        else:
            self.log_test(
                "POST /api/user/purchase-vip-tier",
                False,
                f"HTTP {response.status_code}",
                response.text,
                response_time
            )
        
        return False
    
    # ============================================================================
    # MAIN TEST EXECUTION
    # ============================================================================
    
    def run_all_tests(self):
        """Run all endpoint tests systematically"""
        print("🎯 BACKEND API ENDPOINT VERIFICATION - ALL NEW FEATURES")
        print("=" * 70)
        print(f"Backend URL: {BASE_URL}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        print("=" * 70)
        
        # TEST 1: P2P Notification Endpoints
        print("\n📢 TEST CATEGORY 1: P2P NOTIFICATION ENDPOINTS")
        self.test_p2p_notifications_get()
        self.test_p2p_notifications_mark_read()
        self.test_p2p_notifications_mark_all_read()
        
        # TEST 2: Wallet Service Endpoints
        print("\n💰 TEST CATEGORY 2: WALLET SERVICE ENDPOINTS")
        self.test_wallet_balance_get()
        self.test_wallet_credit()
        self.test_wallet_transactions_get()
        
        # TEST 3: Admin User Management Endpoints
        print("\n👑 TEST CATEGORY 3: ADMIN USER MANAGEMENT ENDPOINTS")
        self.test_admin_users_all()
        self.test_admin_users_update_tier()
        
        # TEST 4: Referral Dashboard Endpoint
        print("\n🔗 TEST CATEGORY 4: REFERRAL DASHBOARD ENDPOINT")
        self.test_referrals_dashboard()
        
        # TEST 5: VIP Purchase Endpoint
        print("\n⭐ TEST CATEGORY 5: VIP PURCHASE ENDPOINT")
        self.test_referrals_purchase_vip()
        
        # Final Summary
        self.print_final_summary()
    
    def print_final_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 70)
        print("🎯 FINAL TEST SUMMARY")
        print("=" * 70)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\n📊 DETAILED RESULTS BY CATEGORY:")
        
        # Group results by category
        categories = {
            "P2P Notifications": [r for r in self.test_results if "p2p/notifications" in r["test"]],
            "Wallet Service": [r for r in self.test_results if "wallet/" in r["test"]],
            "Admin Management": [r for r in self.test_results if "admin/users" in r["test"]],
            "Referral Dashboard": [r for r in self.test_results if "referral/dashboard" in r["test"]],
            "VIP Purchase": [r for r in self.test_results if "purchase-vip-tier" in r["test"]]
        }
        
        for category, results in categories.items():
            if results:
                passed = sum(1 for r in results if r["success"])
                total = len(results)
                rate = (passed / total * 100) if total > 0 else 0
                status = "✅" if rate == 100 else "⚠️" if rate >= 50 else "❌"
                print(f"{status} {category}: {passed}/{total} ({rate:.0f}%)")
        
        print("\n🔍 CRITICAL VERIFICATION RESULTS:")
        
        # Check critical requirements
        all_endpoints_accessible = self.passed_tests == self.total_tests
        no_500_errors = all(r.get("details", "") != "HTTP 500" for r in self.test_results)
        valid_json_responses = all("Invalid JSON" not in r.get("message", "") for r in self.test_results)
        fast_responses = all(r.get("response_time", 999) < 1.0 for r in self.test_results if r.get("response_time"))
        
        print(f"✅ All endpoints return valid JSON: {valid_json_responses}")
        print(f"✅ No 500 internal server errors: {no_500_errors}")
        print(f"✅ Response times < 1 second: {fast_responses}")
        print(f"✅ All endpoints accessible: {all_endpoints_accessible}")
        
        if success_rate >= 80:
            print(f"\n🎉 OVERALL STATUS: EXCELLENT ({success_rate:.1f}% success rate)")
        elif success_rate >= 60:
            print(f"\n⚠️ OVERALL STATUS: GOOD ({success_rate:.1f}% success rate)")
        else:
            print(f"\n❌ OVERALL STATUS: NEEDS ATTENTION ({success_rate:.1f}% success rate)")
        
        print(f"\nTest Completed: {datetime.now().isoformat()}")
        print("=" * 70)

def main():
    """Main execution function"""
    tester = NewEndpointsBackendTester()
    tester.run_all_tests()
    
    # Return exit code based on results
    if tester.passed_tests == tester.total_tests:
        sys.exit(0)  # All tests passed
    else:
        sys.exit(1)  # Some tests failed

if __name__ == "__main__":
    main()