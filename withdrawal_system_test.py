#!/usr/bin/env python3
"""
COMPREHENSIVE END-TO-END WITHDRAWAL SYSTEM VERIFICATION
Testing complete withdrawal flow from user submission to admin approval to balance update
"""

import requests
import json
import time
from datetime import datetime

# Test Configuration
BACKEND_URL = "https://fund-release-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test Credentials - trying different users that might exist
TEST_USER_OPTIONS = [
    {"email": "withdrawal_test@demo.com", "password": "Test123!"},
    {"email": "demo@coinhubx.com", "password": "Test123!"},
    {"email": "test@coinhubx.com", "password": "Test123456"},
    {"email": "gads21083@gmail.com", "password": "test123"},
    {"email": "alice@test.com", "password": "test123"}
]

ADMIN_USER_OPTIONS = [
    {"email": "admin_test@demo.com", "password": "Admin123!", "admin_code": "CRYPTOLEND_ADMIN_2025"},
    {"email": "admin@coinhubx.com", "password": "Admin123!", "admin_code": "CRYPTOLEND_ADMIN_2025"},
    {"email": "gads21083@gmail.com", "password": "test123", "admin_code": "CRYPTOLEND_ADMIN_2025"}
]

class WithdrawalSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, details):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with error handling"""
        url = f"{API_BASE}{endpoint}"
        
        # Set up headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=req_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except Exception as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }

    def test_1_user_login(self):
        """TEST 1: Login as User"""
        print("=" * 60)
        print("TEST 1: USER WITHDRAWAL SUBMISSION FLOW")
        print("=" * 60)
        
        print("Step 1: Login as User")
        
        # Try different user credentials
        for i, test_user in enumerate(TEST_USER_OPTIONS):
            print(f"   Trying user {i+1}: {test_user['email']}")
            response = self.make_request("POST", "/auth/login", test_user)
            
            if response["success"] and "token" in response["data"]:
                self.user_token = response["data"]["token"]
                self.user_id = response["data"].get("user", {}).get("user_id")
                self.log_result("User Login", True, f"Logged in with {test_user['email']}, User ID: {self.user_id}")
                return True
            else:
                print(f"      Failed: {response['status_code']} - {response['data']}")
        
        self.log_result("User Login", False, "All user login attempts failed")
        return False

    def test_2_check_initial_balance(self):
        """TEST 2: Check Initial Balance"""
        print("Step 2: Check Initial Balance")
        if not self.user_id:
            self.log_result("Check Initial Balance", False, "No user_id available")
            return None
            
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", token=self.user_token)
        
        if response["success"]:
            balances = response["data"].get("balances", [])
            btc_balance = None
            for balance in balances:
                if balance.get("currency") == "BTC":
                    btc_balance = balance.get("balance", 0)
                    break
            
            self.log_result("Check Initial Balance", True, f"BTC Balance: {btc_balance}")
            return btc_balance
        else:
            self.log_result("Check Initial Balance", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return None

    def test_3_submit_withdrawal(self, initial_balance):
        """TEST 3: Submit Withdrawal Request"""
        print("Step 3: Submit Withdrawal Request")
        
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.001,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        response = self.make_request("POST", "/user/withdraw", withdrawal_data, token=self.user_token)
        
        if response["success"] and "transaction_id" in response["data"]:
            transaction_id = response["data"]["transaction_id"]
            status = response["data"].get("status", "unknown")
            self.log_result("Submit Withdrawal", True, f"Transaction ID: {transaction_id}, Status: {status}")
            return transaction_id
        else:
            self.log_result("Submit Withdrawal", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return None

    def test_4_verify_balance_deducted(self, initial_balance, withdrawal_amount=0.001):
        """TEST 4: Verify Balance Deducted"""
        print("Step 4: Verify Balance Deducted")
        
        if initial_balance is None:
            self.log_result("Verify Balance Deducted", False, "No initial balance to compare")
            return False
            
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", token=self.user_token)
        
        if response["success"]:
            balances = response["data"].get("balances", [])
            current_btc_balance = None
            for balance in balances:
                if balance.get("currency") == "BTC":
                    current_btc_balance = balance.get("balance", 0)
                    break
            
            if current_btc_balance is not None:
                # Calculate expected balance (amount + fee deducted)
                fee = withdrawal_amount * 0.005  # 0.5% fee
                expected_balance = initial_balance - withdrawal_amount - fee
                balance_difference = initial_balance - current_btc_balance
                
                success = abs(balance_difference - (withdrawal_amount + fee)) < 0.0001
                details = f"Initial: {initial_balance}, Current: {current_btc_balance}, Deducted: {balance_difference}, Expected: {withdrawal_amount + fee}"
                self.log_result("Verify Balance Deducted", success, details)
                return success
            else:
                self.log_result("Verify Balance Deducted", False, "BTC balance not found")
                return False
        else:
            self.log_result("Verify Balance Deducted", False, f"Status: {response['status_code']}")
            return False

    def test_5_verify_transaction_created(self, transaction_id):
        """TEST 5: Verify Transaction Created"""
        print("Step 5: Verify Transaction Created")
        
        if not transaction_id:
            self.log_result("Verify Transaction Created", False, "No transaction ID to verify")
            return False
            
        response = self.make_request("GET", f"/transactions/{self.user_id}", token=self.user_token)
        
        if response["success"]:
            transactions = response["data"].get("transactions", [])
            found_transaction = None
            
            for tx in transactions:
                if tx.get("transaction_id") == transaction_id:
                    found_transaction = tx
                    break
            
            if found_transaction:
                status = found_transaction.get("status", "unknown")
                tx_type = found_transaction.get("transaction_type", "unknown")
                success = status == "pending" and tx_type == "withdrawal"
                details = f"Found transaction with status: {status}, type: {tx_type}"
                self.log_result("Verify Transaction Created", success, details)
                return success
            else:
                self.log_result("Verify Transaction Created", False, f"Transaction {transaction_id} not found in user transactions")
                return False
        else:
            self.log_result("Verify Transaction Created", False, f"Status: {response['status_code']}")
            return False

    def test_6_admin_login(self):
        """TEST 6: Login as Admin"""
        print("=" * 60)
        print("TEST 2: ADMIN APPROVAL FLOW")
        print("=" * 60)
        
        print("Step 6: Login as Admin")
        
        # Try different admin credentials
        for i, admin_user in enumerate(ADMIN_USER_OPTIONS):
            print(f"   Trying admin {i+1}: {admin_user['email']}")
            response = self.make_request("POST", "/auth/login", admin_user)
            
            if response["success"] and "token" in response["data"]:
                self.admin_token = response["data"]["token"]
                user_data = response["data"].get("user", {})
                self.admin_id = user_data.get("user_id")
                is_admin = user_data.get("role") == "admin" or user_data.get("is_admin", False)
                
                details = f"Logged in with {admin_user['email']}, Admin ID: {self.admin_id}, Admin flag: {is_admin}"
                self.log_result("Admin Login", True, details)
                return True
            else:
                print(f"      Failed: {response['status_code']} - {response['data']}")
        
        self.log_result("Admin Login", False, "All admin login attempts failed")
        return False

    def test_7_check_pending_withdrawals(self, transaction_id):
        """TEST 7: Check Pending Withdrawals"""
        print("Step 7: Check Pending Withdrawals")
        
        response = self.make_request("GET", "/admin/withdrawals/pending", token=self.admin_token)
        
        if response["success"]:
            withdrawals = response["data"].get("withdrawals", [])
            found_withdrawal = None
            
            for withdrawal in withdrawals:
                if withdrawal.get("transaction_id") == transaction_id or withdrawal.get("withdrawal_id") == transaction_id:
                    found_withdrawal = withdrawal
                    break
            
            if found_withdrawal:
                details = f"Found withdrawal in pending list: {found_withdrawal.get('transaction_id', 'N/A')}"
                self.log_result("Check Pending Withdrawals", True, details)
                return True
            else:
                details = f"Withdrawal {transaction_id} not found in pending list. Found {len(withdrawals)} pending withdrawals"
                self.log_result("Check Pending Withdrawals", False, details)
                return False
        else:
            self.log_result("Check Pending Withdrawals", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return False

    def test_8_approve_withdrawal(self, transaction_id):
        """TEST 8: Approve Withdrawal"""
        print("Step 8: Approve Withdrawal")
        
        approval_data = {
            "withdrawal_id": transaction_id,
            "admin_id": self.admin_id,
            "action": "approve",
            "notes": "Test approval"
        }
        
        response = self.make_request("POST", "/admin/withdrawals/review", approval_data, token=self.admin_token)
        
        if response["success"]:
            status = response["data"].get("status", "unknown")
            success = status == "approved"
            details = f"Approval response status: {status}"
            self.log_result("Approve Withdrawal", success, details)
            return success
        else:
            self.log_result("Approve Withdrawal", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return False

    def test_9_verify_status_update(self, transaction_id):
        """TEST 9: Verify Status Update"""
        print("Step 9: Verify Status Update")
        
        response = self.make_request("GET", "/admin/withdrawals/pending", token=self.admin_token)
        
        if response["success"]:
            withdrawals = response["data"].get("withdrawals", [])
            found_in_pending = any(w.get("transaction_id") == transaction_id for w in withdrawals)
            
            # Check if it's now in approved status
            # This might require a different endpoint or checking transaction status
            success = not found_in_pending  # Should no longer be in pending
            details = f"Withdrawal no longer in pending list: {success}"
            self.log_result("Verify Status Update", success, details)
            return success
        else:
            self.log_result("Verify Status Update", False, f"Status: {response['status_code']}")
            return False

    def test_10_mark_completed(self, transaction_id):
        """TEST 10: Mark as Completed"""
        print("Step 10: Mark as Completed")
        
        completion_data = {
            "admin_id": self.admin_id
        }
        
        response = self.make_request("POST", f"/admin/withdrawals/complete/{transaction_id}", completion_data, token=self.admin_token)
        
        if response["success"]:
            status = response["data"].get("status", "unknown")
            success = status == "completed"
            details = f"Completion response status: {status}"
            self.log_result("Mark as Completed", success, details)
            return success
        else:
            self.log_result("Mark as Completed", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return False

    def test_11_submit_second_withdrawal(self):
        """TEST 11: Submit Another Withdrawal for Rejection Test"""
        print("=" * 60)
        print("TEST 3: REJECTION FLOW (BALANCE RESTORATION)")
        print("=" * 60)
        
        print("Step 11: Submit Another Withdrawal")
        
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.001,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        response = self.make_request("POST", "/user/withdraw", withdrawal_data, token=self.user_token)
        
        if response["success"] and "transaction_id" in response["data"]:
            transaction_id = response["data"]["transaction_id"]
            self.log_result("Submit Second Withdrawal", True, f"Transaction ID: {transaction_id}")
            return transaction_id
        else:
            self.log_result("Submit Second Withdrawal", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return None

    def test_12_reject_withdrawal(self, transaction_id):
        """TEST 12: Reject Withdrawal"""
        print("Step 12: Reject Withdrawal")
        
        rejection_data = {
            "withdrawal_id": transaction_id,
            "admin_id": self.admin_id,
            "action": "reject",
            "notes": "Test rejection - invalid address"
        }
        
        response = self.make_request("POST", "/admin/withdrawals/review", rejection_data, token=self.admin_token)
        
        if response["success"]:
            status = response["data"].get("status", "unknown")
            success = status == "rejected"
            details = f"Rejection response status: {status}"
            self.log_result("Reject Withdrawal", success, details)
            return success
        else:
            self.log_result("Reject Withdrawal", False, f"Status: {response['status_code']}, Data: {response['data']}")
            return False

    def test_13_verify_balance_restored(self, balance_before_rejection):
        """TEST 13: Verify Balance Restored"""
        print("Step 13: Verify Balance Restored")
        
        if balance_before_rejection is None:
            self.log_result("Verify Balance Restored", False, "No balance before rejection to compare")
            return False
            
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", token=self.user_token)
        
        if response["success"]:
            balances = response["data"].get("balances", [])
            current_btc_balance = None
            for balance in balances:
                if balance.get("currency") == "BTC":
                    current_btc_balance = balance.get("balance", 0)
                    break
            
            if current_btc_balance is not None:
                # Balance should be restored (amount + fee added back)
                withdrawal_amount = 0.001
                fee = withdrawal_amount * 0.005
                expected_balance = balance_before_rejection + withdrawal_amount + fee
                
                success = abs(current_btc_balance - expected_balance) < 0.0001
                details = f"Before rejection: {balance_before_rejection}, Current: {current_btc_balance}, Expected: {expected_balance}"
                self.log_result("Verify Balance Restored", success, details)
                return success
            else:
                self.log_result("Verify Balance Restored", False, "BTC balance not found")
                return False
        else:
            self.log_result("Verify Balance Restored", False, f"Status: {response['status_code']}")
            return False

    def test_14_frontend_user_routes(self):
        """TEST 14: Test User Routes"""
        print("=" * 60)
        print("TEST 4: FRONTEND STABILITY CHECK")
        print("=" * 60)
        
        print("Step 14: Test User Routes")
        
        routes_to_test = [
            ("/wallet", "Wallet Page"),
            ("/withdraw/btc", "BTC Withdrawal Page")
        ]
        
        all_success = True
        details = []
        
        for route, name in routes_to_test:
            try:
                response = requests.get(f"{BACKEND_URL}{route}")
                success = response.status_code == 200
                if not success:
                    all_success = False
                details.append(f"{name}: {response.status_code}")
            except Exception as e:
                all_success = False
                details.append(f"{name}: Error - {str(e)}")
        
        self.log_result("Test User Routes", all_success, "; ".join(details))
        return all_success

    def test_15_frontend_admin_routes(self):
        """TEST 15: Test Admin Routes"""
        print("Step 15: Test Admin Routes")
        
        routes_to_test = [
            ("/admin/login", "Admin Login Page"),
            ("/admin/withdrawals", "Admin Withdrawals Page")
        ]
        
        all_success = True
        details = []
        
        for route, name in routes_to_test:
            try:
                response = requests.get(f"{BACKEND_URL}{route}")
                success = response.status_code == 200
                if not success:
                    all_success = False
                details.append(f"{name}: {response.status_code}")
            except Exception as e:
                all_success = False
                details.append(f"{name}: Error - {str(e)}")
        
        self.log_result("Test Admin Routes", all_success, "; ".join(details))
        return all_success

    def test_backend_health(self):
        """Test backend health first"""
        print("Step 0: Backend Health Check")
        response = self.make_request("GET", "/health")
        
        if response["success"]:
            self.log_result("Backend Health", True, f"Backend is healthy: {response['data']}")
            return True
        else:
            self.log_result("Backend Health", False, f"Backend health check failed: {response['status_code']}")
            return False

    def create_test_users(self):
        """Create test users if they don't exist"""
        print("Step 0.5: Creating test users if needed")
        
        # Try to register withdrawal test user
        user_data = {
            "email": "withdrawal_test@demo.com",
            "password": "Test123!",
            "full_name": "Withdrawal Test User",
            "phone_number": "+1234567890"
        }
        
        response = self.make_request("POST", "/auth/register", user_data)
        if response["success"]:
            print("   Created withdrawal test user")
        else:
            print(f"   User creation failed or user exists: {response['status_code']}")
        
        # Try to register admin test user
        admin_data = {
            "email": "admin_test@demo.com",
            "password": "Admin123!",
            "full_name": "Admin Test User",
            "phone_number": "+1234567891",
            "role": "admin"
        }
        
        response = self.make_request("POST", "/auth/register", admin_data)
        if response["success"]:
            print("   Created admin test user")
        else:
            print(f"   Admin creation failed or user exists: {response['status_code']}")

    def fund_test_user(self):
        """Fund the test user with BTC for withdrawal testing"""
        print("Step 0.6: Funding test user with BTC")
        
        if not self.user_id:
            print("   No user_id available for funding")
            return False
        
        # Try admin manual deposit endpoint
        funding_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.01,  # Fund with 0.01 BTC
            "admin_notes": "Test funding for withdrawal testing"
        }
        
        # Try different funding endpoints
        endpoints_to_try = [
            "/admin/manual-deposit",
            "/admin/fund-user",
            "/admin/add-balance",
            "/user/deposit"
        ]
        
        for endpoint in endpoints_to_try:
            print(f"   Trying {endpoint}")
            response = self.make_request("POST", endpoint, funding_data, token=self.admin_token or self.user_token)
            
            if response["success"]:
                print(f"   Successfully funded user via {endpoint}")
                return True
            else:
                print(f"   Failed {endpoint}: {response['status_code']} - {response['data']}")
        
        # If admin endpoints fail, try creating balance record directly
        print("   Trying to create balance record directly")
        balance_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "balance": 0.01,
            "locked_balance": 0.0
        }
        
        response = self.make_request("POST", "/admin/create-balance", balance_data, token=self.admin_token)
        if response["success"]:
            print("   Successfully created balance record")
            return True
        else:
            print(f"   Failed to create balance: {response['status_code']} - {response['data']}")
        
        return False

    def run_comprehensive_test(self):
        """Run the complete withdrawal system test"""
        print("🎯 COMPREHENSIVE END-TO-END WITHDRAWAL SYSTEM VERIFICATION")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Check backend health first
        if not self.test_backend_health():
            return self.generate_report()
        
        # Try to create test users
        self.create_test_users()
        
        # TEST 1: USER WITHDRAWAL SUBMISSION FLOW
        if not self.test_1_user_login():
            return self.generate_report()
        
        # Fund the test user with BTC
        self.fund_test_user()
            
        initial_balance = self.test_2_check_initial_balance()
        transaction_id = self.test_3_submit_withdrawal(initial_balance)
        
        if transaction_id:
            self.test_4_verify_balance_deducted(initial_balance)
            self.test_5_verify_transaction_created(transaction_id)
        
        # TEST 2: ADMIN APPROVAL FLOW
        if not self.test_6_admin_login():
            return self.generate_report()
            
        if transaction_id:
            self.test_7_check_pending_withdrawals(transaction_id)
            if self.test_8_approve_withdrawal(transaction_id):
                self.test_9_verify_status_update(transaction_id)
                self.test_10_mark_completed(transaction_id)
        
        # TEST 3: REJECTION FLOW
        balance_before_second_withdrawal = self.test_2_check_initial_balance()
        second_transaction_id = self.test_11_submit_second_withdrawal()
        
        if second_transaction_id:
            balance_before_rejection = self.test_2_check_initial_balance()
            if self.test_12_reject_withdrawal(second_transaction_id):
                self.test_13_verify_balance_restored(balance_before_rejection)
        
        # TEST 4: FRONTEND STABILITY
        self.test_14_frontend_user_routes()
        self.test_15_frontend_admin_routes()
        
        return self.generate_report()

    def generate_report(self):
        """Generate final test report"""
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE WITHDRAWAL SYSTEM TEST REPORT")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Critical Verifications
        print("CRITICAL VERIFICATIONS:")
        critical_questions = [
            ("Can user submit withdrawal?", self._check_test_passed("Submit Withdrawal")),
            ("Does balance deduct correctly?", self._check_test_passed("Verify Balance Deducted")),
            ("Can admin see pending withdrawal?", self._check_test_passed("Check Pending Withdrawals")),
            ("Does admin approval work?", self._check_test_passed("Approve Withdrawal")),
            ("Does balance restoration work on reject?", self._check_test_passed("Verify Balance Restored")),
            ("Are frontend routes stable?", self._check_test_passed("Test User Routes") and self._check_test_passed("Test Admin Routes"))
        ]
        
        for question, answer in critical_questions:
            status = "YES" if answer else "NO"
            print(f"{question} {status}")
        
        print()
        
        # Failed Tests Details
        failed_results = [r for r in self.test_results if not r["success"]]
        if failed_results:
            print("BACKEND ERRORS FOUND:")
            for result in failed_results:
                print(f"❌ {result['test']}: {result['details']}")
            print()
        
        # Frontend Errors
        frontend_errors = []
        for result in self.test_results:
            if "Routes" in result["test"] and not result["success"]:
                frontend_errors.append(f"{result['test']}: {result['details']}")
        
        if frontend_errors:
            print("FRONTEND ERRORS FOUND:")
            for error in frontend_errors:
                print(f"❌ {error}")
        else:
            print("FRONTEND ERRORS FOUND: None")
        
        print("\n" + "=" * 80)
        return {
            "success_rate": success_rate,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "results": self.test_results
        }

    def _check_test_passed(self, test_name):
        """Check if a specific test passed"""
        for result in self.test_results:
            if test_name in result["test"]:
                return result["success"]
        return False

if __name__ == "__main__":
    tester = WithdrawalSystemTester()
    report = tester.run_comprehensive_test()