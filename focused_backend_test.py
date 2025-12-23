#!/usr/bin/env python3
"""
FOCUSED BACKEND TESTING - Test what's actually working
Based on the comprehensive test results, focus on testing the endpoints that exist and work.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://peer-listings.preview.emergentagent.com/api"

# Test Users
TEST_USER = {
    "email": "focused_test@test.com",
    "password": "Test123456",
    "full_name": "Focused Test User"
}

ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class FocusedBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_id = None
        self.admin_user_id = None
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
    
    def test_user_registration_and_login(self):
        """Test user registration and login"""
        print("\n=== Testing User Registration & Login ===")
        
        # Register user
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=TEST_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.test_user_id = data["user"]["user_id"]
                    self.log_test("User Registration", True, f"User registered with ID: {self.test_user_id}")
                    
                    # Test login
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
                        if data.get("success"):
                            self.log_test("User Login", True, "Login successful")
                            return True
                    
                    self.log_test("User Login", False, f"Login failed with status {response.status_code}")
                else:
                    self.log_test("User Registration", False, "Registration response missing user_id", data)
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login
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
                        self.test_user_id = data["user"]["user_id"]
                        self.log_test("User Registration & Login", True, f"User exists, logged in with ID: {self.test_user_id}")
                        return True
                
                self.log_test("User Registration & Login", False, "Login failed for existing user")
            else:
                self.log_test("User Registration", False, f"Registration failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("User Registration & Login", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_login(self):
        """Test admin login"""
        print("\n=== Testing Admin Login ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json={
                    "email": "admin@coinhubx.com",
                    "password": "admin123",
                    "admin_code": ADMIN_CODE
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("admin", {}).get("user_id"):
                    self.admin_user_id = data["admin"]["user_id"]
                    self.log_test("Admin Login", True, f"Admin logged in with ID: {self.admin_user_id}")
                    return True
                else:
                    self.log_test("Admin Login", False, "Admin login response missing user_id", data)
            else:
                self.log_test("Admin Login", False, f"Admin login failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_crypto_bank_deposit_withdrawal(self):
        """Test crypto bank deposit and withdrawal (these seem to work)"""
        print("\n=== Testing Crypto Bank Deposit & Withdrawal ===")
        
        if not self.test_user_id:
            self.log_test("Crypto Bank Operations", False, "No test user ID available")
            return False
        
        try:
            # Test deposit
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.1
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Crypto Bank Deposit", True, f"Deposit successful: {data.get('message', 'No message')}")
                    
                    # Test withdrawal with fee
                    response = self.session.post(
                        f"{BASE_URL}/crypto-bank/withdraw",
                        json={
                            "user_id": self.test_user_id,
                            "currency": "BTC",
                            "amount": 0.05,
                            "wallet_address": "test_withdrawal_address"
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            fee_details = data.get("fee_details", {})
                            withdrawal_fee = fee_details.get("withdrawal_fee", 0)
                            fee_percent = fee_details.get("withdrawal_fee_percent", 0)
                            
                            self.log_test(
                                "Crypto Bank Withdrawal with Fee", 
                                True, 
                                f"Withdrawal successful: Fee: {withdrawal_fee} BTC ({fee_percent}%)"
                            )
                            return True
                        else:
                            self.log_test("Crypto Bank Withdrawal", False, "Withdrawal response indicates failure", data)
                    else:
                        self.log_test("Crypto Bank Withdrawal", False, f"Withdrawal failed with status {response.status_code}")
                else:
                    self.log_test("Crypto Bank Deposit", False, "Deposit response indicates failure", data)
            else:
                self.log_test("Crypto Bank Deposit", False, f"Deposit failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Crypto Bank Operations", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_referral_dashboard(self):
        """Test referral dashboard (this works)"""
        print("\n=== Testing Referral Dashboard ===")
        
        if not self.test_user_id:
            self.log_test("Referral Dashboard", False, "No test user ID available")
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/referral/dashboard/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "referral_code" in data:
                    referral_code = data["referral_code"]
                    total_signups = data.get("total_signups", 0)
                    total_trades = data.get("total_trades", 0)
                    
                    self.log_test(
                        "Referral Dashboard", 
                        True, 
                        f"Referral dashboard working - Code: {referral_code}, Signups: {total_signups}, Trades: {total_trades}"
                    )
                    return True
                else:
                    self.log_test("Referral Dashboard", False, "Response missing referral_code", data)
            else:
                self.log_test("Referral Dashboard", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Referral Dashboard", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_customers_list(self):
        """Test admin customers list (this works)"""
        print("\n=== Testing Admin Customers List ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/customers",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "customers" in data:
                    customers = data["customers"]
                    total_customers = data.get("total_customers", len(customers))
                    
                    self.log_test(
                        "Admin Customers List", 
                        True, 
                        f"Admin can view {total_customers} customers"
                    )
                    return True
                else:
                    self.log_test("Admin Customers List", False, "Response missing customers", data)
            else:
                self.log_test("Admin Customers List", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Customers List", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_dashboard_stats(self):
        """Test admin dashboard stats (this works)"""
        print("\n=== Testing Admin Dashboard Stats ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard-stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    users_stats = stats.get("users", {})
                    revenue_stats = stats.get("revenue", {})
                    
                    total_users = users_stats.get("total_users", 0)
                    total_revenue = revenue_stats.get("total_revenue", 0)
                    
                    self.log_test(
                        "Admin Dashboard Stats", 
                        True, 
                        f"Dashboard stats working - Users: {total_users}, Revenue: £{total_revenue}"
                    )
                    return True
                else:
                    self.log_test("Admin Dashboard Stats", False, "Response missing stats", data)
            else:
                self.log_test("Admin Dashboard Stats", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Dashboard Stats", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_platform_config(self):
        """Test admin platform config (this works)"""
        print("\n=== Testing Admin Platform Config ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    config = data["config"]
                    withdraw_fee = config.get("withdraw_fee_percent", 0)
                    p2p_fee = config.get("p2p_trade_fee_percent", 0)
                    
                    self.log_test(
                        "Admin Platform Config", 
                        True, 
                        f"Platform config accessible - Withdrawal Fee: {withdraw_fee}%, P2P Fee: {p2p_fee}%"
                    )
                    return True
                else:
                    self.log_test("Admin Platform Config", False, "Response missing config", data)
            else:
                self.log_test("Admin Platform Config", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Platform Config", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_referral_config(self):
        """Test admin referral config (this works)"""
        print("\n=== Testing Admin Referral Config ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/referral-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    config = data["config"]
                    commission_rate = config.get("commission_rate_percent", 0)
                    duration = config.get("commission_duration_months", 0)
                    
                    self.log_test(
                        "Admin Referral Config", 
                        True, 
                        f"Referral config accessible - Commission: {commission_rate}%, Duration: {duration} months"
                    )
                    return True
                else:
                    self.log_test("Admin Referral Config", False, "Response missing config", data)
            else:
                self.log_test("Admin Referral Config", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Referral Config", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_platform_earnings(self):
        """Test admin platform earnings (this works)"""
        print("\n=== Testing Admin Platform Earnings ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    total_fees = data.get("total_fees_collected", 0)
                    withdrawal_fees = data.get("withdrawal_fees", 0)
                    trade_fees = data.get("trade_fees", 0)
                    
                    self.log_test(
                        "Admin Platform Earnings", 
                        True, 
                        f"Platform earnings tracked - Total: {total_fees}, Withdrawal: {withdrawal_fees}, Trade: {trade_fees}"
                    )
                    return True
                else:
                    self.log_test("Admin Platform Earnings", False, "Response indicates failure", data)
            else:
                self.log_test("Admin Platform Earnings", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Platform Earnings", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_crypto_balances_api(self):
        """Test crypto balances API (check if this works)"""
        print("\n=== Testing Crypto Balances API ===")
        
        if not self.test_user_id:
            self.log_test("Crypto Balances API", False, "No test user ID available")
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    
                    # Check for expected currencies
                    currency_balances = {b.get("currency"): b.get("balance", 0) for b in balances}
                    
                    self.log_test(
                        "Crypto Balances API", 
                        True, 
                        f"Balances retrieved - {len(balances)} currencies: {list(currency_balances.keys())}"
                    )
                    return True
                else:
                    self.log_test("Crypto Balances API", False, "Response missing balances", data)
            else:
                self.log_test("Crypto Balances API", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Crypto Balances API", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_crypto_transactions_api(self):
        """Test crypto transactions API"""
        print("\n=== Testing Crypto Transactions API ===")
        
        if not self.test_user_id:
            self.log_test("Crypto Transactions API", False, "No test user ID available")
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/transactions/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    
                    self.log_test(
                        "Crypto Transactions API", 
                        True, 
                        f"Transactions retrieved - {len(transactions)} transactions found"
                    )
                    return True
                else:
                    self.log_test("Crypto Transactions API", False, "Response missing transactions", data)
            else:
                self.log_test("Crypto Transactions API", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Crypto Transactions API", False, f"Request failed: {str(e)}")
            
        return False
    
    def run_focused_tests(self):
        """Run focused tests on working endpoints"""
        print("🎯 STARTING FOCUSED BACKEND TESTING - WORKING ENDPOINTS ONLY")
        print("=" * 80)
        
        # Setup
        user_success = self.test_user_registration_and_login()
        admin_success = self.test_admin_login()
        
        if not user_success:
            print("❌ CRITICAL: Failed to setup test user. Cannot continue.")
            return
        
        if not admin_success:
            print("⚠️  WARNING: Failed to setup admin user. Admin tests will be skipped.")
        
        # Test working endpoints
        print("\n" + "=" * 80)
        print("TESTING WORKING BACKEND ENDPOINTS")
        print("=" * 80)
        
        self.test_crypto_bank_deposit_withdrawal()
        self.test_referral_dashboard()
        self.test_crypto_balances_api()
        self.test_crypto_transactions_api()
        
        if admin_success:
            self.test_admin_customers_list()
            self.test_admin_dashboard_stats()
            self.test_admin_platform_config()
            self.test_admin_referral_config()
            self.test_admin_platform_earnings()
        
        # Summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🎯 FOCUSED BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print(f"\n✅ WORKING ENDPOINTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"   • {result['test']}")
        
        print(f"\n🎉 FOCUSED TESTING COMPLETED")

if __name__ == "__main__":
    tester = FocusedBackendTester()
    tester.run_focused_tests()