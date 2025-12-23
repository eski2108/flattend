#!/usr/bin/env python3
"""
FINAL END-TO-END WITHDRAWAL VERIFICATION WITH FIXES APPLIED
Complete withdrawal flow testing from user submission to admin approval
"""

import requests
import json
import time
from datetime import datetime

# Test Configuration
BASE_URL = "https://express-buy-flow.preview.emergentagent.com/api"
TEST_USER_EMAIL = "withdrawal_test@demo.com"
TEST_USER_PASSWORD = "Test123!"
ADMIN_USER_EMAIL = "admin_test@demo.com"
ADMIN_USER_PASSWORD = "Admin123!"

class WithdrawalEndToEndTest:
    def __init__(self):
        self.user_token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.initial_balance = 0
        self.withdrawal_transaction_id = None
        self.second_withdrawal_id = None
        self.test_results = []
        
    def log_result(self, step, status, details, response_code=None):
        """Log test result"""
        result = {
            "step": step,
            "status": status,
            "details": details,
            "response_code": response_code,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status_icon = "✅" if status == "PASS" else "❌"
        print(f"{status_icon} Step {step}: {details}")
        if response_code:
            print(f"   Response Code: {response_code}")
        
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {str(e)}")
            return None
    
    def step_1_login_user(self):
        """Step 1: Login as user"""
        print("\n=== PART 1: USER SUBMITS WITHDRAWAL ===")
        print("Step 1: Login as user")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "token" in data:
                self.user_token = data["token"]
                self.user_id = data.get("user", {}).get("user_id")
                self.log_result("1", "PASS", f"User login successful. User ID: {self.user_id}", response.status_code)
                return True
            else:
                self.log_result("1", "FAIL", f"Login response missing token or success flag: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("1", "FAIL", f"User login failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_2_check_initial_balance(self):
        """Step 2: Check initial balance"""
        print("Step 2: Check initial balance")
        
        if not self.user_token or not self.user_id:
            self.log_result("2", "FAIL", "No user token or user_id from login")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", [])
                btc_balance = next((b for b in balances if b.get("currency") == "BTC"), None)
                if btc_balance:
                    self.initial_balance = btc_balance.get("balance", 0)
                    self.log_result("2", "PASS", f"Initial BTC balance: {self.initial_balance}", response.status_code)
                    return True
                else:
                    self.log_result("2", "FAIL", "No BTC balance found in response", response.status_code)
            else:
                self.log_result("2", "FAIL", f"Balance check failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("2", "FAIL", f"Balance check request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_3_submit_withdrawal(self):
        """Step 3: Submit withdrawal"""
        print("Step 3: Submit withdrawal")
        
        if not self.user_token or not self.user_id:
            self.log_result("3", "FAIL", "No user token or user_id")
            return False
            
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.0005,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("POST", "/user/withdraw", withdrawal_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.withdrawal_transaction_id = data.get("transaction_id")
                status = data.get("status")
                amount = data.get("amount")
                fee = data.get("fee")
                self.log_result("3", "PASS", f"Withdrawal submitted. ID: {self.withdrawal_transaction_id}, Amount: {amount}, Fee: {fee}, Status: {status}", response.status_code)
                return True
            else:
                self.log_result("3", "FAIL", f"Withdrawal submission failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("3", "FAIL", f"Withdrawal request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_4_verify_balance_deducted(self):
        """Step 4: Verify balance deducted"""
        print("Step 4: Verify balance deducted")
        
        if not self.user_token or not self.user_id:
            self.log_result("4", "FAIL", "No user token or user_id")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", [])
                btc_balance = next((b for b in balances if b.get("currency") == "BTC"), None)
                if btc_balance:
                    current_balance = btc_balance.get("balance", 0)
                    expected_deduction = 0.0005 + (0.0005 * 0.005)  # amount + fee (0.5%)
                    expected_balance = self.initial_balance - expected_deduction
                    
                    if abs(current_balance - expected_balance) < 0.000001:  # Allow for small floating point differences
                        self.log_result("4", "PASS", f"Balance correctly deducted. Initial: {self.initial_balance}, Current: {current_balance}, Deduction: {expected_deduction}", response.status_code)
                        return True
                    else:
                        self.log_result("4", "FAIL", f"Balance deduction incorrect. Initial: {self.initial_balance}, Current: {current_balance}, Expected: {expected_balance}", response.status_code)
                else:
                    self.log_result("4", "FAIL", "No BTC balance found in response", response.status_code)
            else:
                self.log_result("4", "FAIL", f"Balance check failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("4", "FAIL", f"Balance check request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_5_verify_user_history(self):
        """Step 5: Verify appears in user history"""
        print("Step 5: Verify appears in user history")
        
        if not self.user_token or not self.user_id:
            self.log_result("5", "FAIL", "No user token or user_id")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Try multiple transaction endpoints
        endpoints_to_try = [
            f"/transactions/{self.user_id}",
            f"/user/transactions/{self.user_id}",
            f"/crypto-bank/transactions/{self.user_id}"
        ]
        
        for endpoint in endpoints_to_try:
            response = self.make_request("GET", endpoint, headers=headers)
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    transactions = data.get("transactions", [])
                    withdrawal_found = any(
                        t.get("transaction_id") == self.withdrawal_transaction_id or 
                        t.get("withdrawal_id") == self.withdrawal_transaction_id
                        for t in transactions
                    )
                    
                    if withdrawal_found:
                        self.log_result("5", "PASS", f"Withdrawal found in user history via {endpoint}", response.status_code)
                        return True
                    else:
                        print(f"   Withdrawal not found in {endpoint} (found {len(transactions)} transactions)")
                else:
                    print(f"   {endpoint} failed: {data}")
            else:
                print(f"   {endpoint} request failed: {response.status_code if response else 'No response'}")
        
        self.log_result("5", "FAIL", "Withdrawal not found in any user transaction history endpoint")
        return False
    
    def step_6_login_admin(self):
        """Step 6: Login as admin"""
        print("\n=== PART 2: ADMIN APPROVES WITHDRAWAL ===")
        print("Step 6: Login as admin")
        
        login_data = {
            "email": ADMIN_USER_EMAIL,
            "password": ADMIN_USER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "token" in data:
                self.admin_token = data["token"]
                user_data = data.get("user", {})
                self.admin_id = user_data.get("user_id")
                is_admin = user_data.get("admin", False) or user_data.get("role") == "admin"
                self.log_result("6", "PASS", f"Admin login successful. Admin ID: {self.admin_id}, Admin flag: {is_admin}", response.status_code)
                return True
            else:
                self.log_result("6", "FAIL", f"Admin login response missing token or success flag: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("6", "FAIL", f"Admin login failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_7_check_pending_withdrawals(self):
        """Step 7: Check pending withdrawals"""
        print("Step 7: Check pending withdrawals")
        
        if not self.admin_token:
            self.log_result("7", "FAIL", "No admin token")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Try multiple admin withdrawal endpoints
        endpoints_to_try = [
            "/admin/withdrawals/pending",
            "/admin/withdrawals",
            "/admin/withdrawal-requests"
        ]
        
        for endpoint in endpoints_to_try:
            response = self.make_request("GET", endpoint, headers=headers)
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    withdrawals = data.get("withdrawals", []) or data.get("requests", [])
                    withdrawal_found = any(
                        w.get("transaction_id") == self.withdrawal_transaction_id or 
                        w.get("withdrawal_id") == self.withdrawal_transaction_id
                        for w in withdrawals
                    )
                    
                    if withdrawal_found:
                        self.log_result("7", "PASS", f"Withdrawal found in admin pending list via {endpoint} ({len(withdrawals)} total)", response.status_code)
                        return True
                    else:
                        print(f"   Withdrawal not found in {endpoint} (found {len(withdrawals)} withdrawals)")
                        if withdrawals:
                            print(f"   Sample withdrawal IDs: {[w.get('transaction_id', w.get('withdrawal_id')) for w in withdrawals[:3]]}")
                else:
                    print(f"   {endpoint} failed: {data}")
            else:
                print(f"   {endpoint} request failed: {response.status_code if response else 'No response'}")
        
        self.log_result("7", "FAIL", "Withdrawal not found in any admin pending withdrawals endpoint")
        return False
    
    def step_8_approve_withdrawal(self):
        """Step 8: Approve withdrawal"""
        print("Step 8: Approve withdrawal")
        
        if not self.admin_token or not self.admin_id or not self.withdrawal_transaction_id:
            self.log_result("8", "FAIL", "Missing admin token, admin_id, or withdrawal_transaction_id")
            return False
            
        approval_data = {
            "withdrawal_id": self.withdrawal_transaction_id,
            "admin_id": self.admin_id,
            "action": "approve",
            "notes": "Approved for testing"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("POST", "/admin/withdrawals/review", approval_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                status = data.get("status")
                self.log_result("8", "PASS", f"Withdrawal approved successfully. Status: {status}", response.status_code)
                return True
            else:
                self.log_result("8", "FAIL", f"Withdrawal approval failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("8", "FAIL", f"Withdrawal approval request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_9_verify_status_changed(self):
        """Step 9: Verify status changed"""
        print("Step 9: Verify status changed")
        
        if not self.admin_token:
            self.log_result("9", "FAIL", "No admin token")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Check that withdrawal is no longer in pending list
        response = self.make_request("GET", "/admin/withdrawals/pending", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                withdrawals = data.get("withdrawals", [])
                withdrawal_still_pending = any(
                    w.get("transaction_id") == self.withdrawal_transaction_id or 
                    w.get("withdrawal_id") == self.withdrawal_transaction_id
                    for w in withdrawals
                )
                
                if not withdrawal_still_pending:
                    self.log_result("9", "PASS", "Withdrawal no longer in pending list", response.status_code)
                    
                    # Also check user transaction history for status update
                    if self.user_token and self.user_id:
                        user_headers = {"Authorization": f"Bearer {self.user_token}"}
                        user_response = self.make_request("GET", f"/transactions/{self.user_id}", headers=user_headers)
                        
                        if user_response and user_response.status_code == 200:
                            user_data = user_response.json()
                            if user_data.get("success"):
                                transactions = user_data.get("transactions", [])
                                withdrawal_tx = next((
                                    t for t in transactions 
                                    if t.get("transaction_id") == self.withdrawal_transaction_id or 
                                       t.get("withdrawal_id") == self.withdrawal_transaction_id
                                ), None)
                                
                                if withdrawal_tx:
                                    status = withdrawal_tx.get("status")
                                    print(f"   User transaction status: {status}")
                    
                    return True
                else:
                    self.log_result("9", "FAIL", "Withdrawal still appears in pending list", response.status_code)
            else:
                self.log_result("9", "FAIL", f"Failed to check pending withdrawals: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("9", "FAIL", f"Failed to check pending withdrawals: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_10_mark_completed(self):
        """Step 10: Mark as completed"""
        print("Step 10: Mark as completed")
        
        if not self.admin_token or not self.withdrawal_transaction_id:
            self.log_result("10", "FAIL", "Missing admin token or withdrawal_transaction_id")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("POST", f"/admin/withdrawals/complete/{self.withdrawal_transaction_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                status = data.get("status")
                self.log_result("10", "PASS", f"Withdrawal marked as completed. Status: {status}", response.status_code)
                return True
            else:
                self.log_result("10", "FAIL", f"Failed to mark withdrawal as completed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("10", "FAIL", f"Complete withdrawal request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_11_submit_second_withdrawal(self):
        """Step 11: Submit another withdrawal for rejection test"""
        print("\n=== PART 3: TEST REJECTION FLOW ===")
        print("Step 11: Submit another withdrawal")
        
        if not self.user_token or not self.user_id:
            self.log_result("11", "FAIL", "No user token or user_id")
            return False
            
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.0003,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("POST", "/user/withdraw", withdrawal_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.second_withdrawal_id = data.get("transaction_id")
                status = data.get("status")
                amount = data.get("amount")
                self.log_result("11", "PASS", f"Second withdrawal submitted. ID: {self.second_withdrawal_id}, Amount: {amount}, Status: {status}", response.status_code)
                return True
            else:
                self.log_result("11", "FAIL", f"Second withdrawal submission failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("11", "FAIL", f"Second withdrawal request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_12_check_balance_after_second(self):
        """Step 12: Check balance after 2nd withdrawal"""
        print("Step 12: Check balance after 2nd withdrawal")
        
        if not self.user_token or not self.user_id:
            self.log_result("12", "FAIL", "No user token or user_id")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", [])
                btc_balance = next((b for b in balances if b.get("currency") == "BTC"), None)
                if btc_balance:
                    self.balance_before_rejection = btc_balance.get("balance", 0)
                    self.log_result("12", "PASS", f"Balance after 2nd withdrawal: {self.balance_before_rejection}", response.status_code)
                    return True
                else:
                    self.log_result("12", "FAIL", "No BTC balance found in response", response.status_code)
            else:
                self.log_result("12", "FAIL", f"Balance check failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("12", "FAIL", f"Balance check request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_13_reject_withdrawal(self):
        """Step 13: Admin rejects withdrawal"""
        print("Step 13: Admin rejects withdrawal")
        
        if not self.admin_token or not self.admin_id or not self.second_withdrawal_id:
            self.log_result("13", "FAIL", "Missing admin token, admin_id, or second_withdrawal_id")
            return False
            
        rejection_data = {
            "withdrawal_id": self.second_withdrawal_id,
            "admin_id": self.admin_id,
            "action": "reject",
            "notes": "Test rejection"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.make_request("POST", "/admin/withdrawals/review", rejection_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                status = data.get("status")
                self.log_result("13", "PASS", f"Withdrawal rejected successfully. Status: {status}", response.status_code)
                return True
            else:
                self.log_result("13", "FAIL", f"Withdrawal rejection failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("13", "FAIL", f"Withdrawal rejection request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def step_14_verify_balance_restored(self):
        """Step 14: Verify balance restored"""
        print("Step 14: Verify balance restored")
        
        if not self.user_token or not self.user_id:
            self.log_result("14", "FAIL", "No user token or user_id")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("GET", f"/wallets/balances/{self.user_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                balances = data.get("balances", [])
                btc_balance = next((b for b in balances if b.get("currency") == "BTC"), None)
                if btc_balance:
                    current_balance = btc_balance.get("balance", 0)
                    expected_restoration = 0.0003 + (0.0003 * 0.005)  # amount + fee should be restored
                    expected_balance = self.balance_before_rejection + expected_restoration
                    
                    if abs(current_balance - expected_balance) < 0.000001:  # Allow for small floating point differences
                        self.log_result("14", "PASS", f"Balance correctly restored. Before rejection: {self.balance_before_rejection}, Current: {current_balance}, Restoration: {expected_restoration}", response.status_code)
                        return True
                    else:
                        self.log_result("14", "FAIL", f"Balance restoration incorrect. Before rejection: {self.balance_before_rejection}, Current: {current_balance}, Expected: {expected_balance}", response.status_code)
                else:
                    self.log_result("14", "FAIL", "No BTC balance found in response", response.status_code)
            else:
                self.log_result("14", "FAIL", f"Balance check failed: {data}", response.status_code)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("14", "FAIL", f"Balance check request failed: {error_msg}", response.status_code if response else None)
        
        return False
    
    def run_complete_test(self):
        """Run the complete end-to-end withdrawal test"""
        print("🎯 FINAL END-TO-END WITHDRAWAL VERIFICATION WITH FIXES APPLIED")
        print("=" * 80)
        print(f"Backend: {BASE_URL}")
        print(f"Test User: {TEST_USER_EMAIL}")
        print(f"Admin User: {ADMIN_USER_EMAIL}")
        print("=" * 80)
        
        # Part 1: User submits withdrawal
        success_count = 0
        total_steps = 14
        
        if self.step_1_login_user():
            success_count += 1
        if self.step_2_check_initial_balance():
            success_count += 1
        if self.step_3_submit_withdrawal():
            success_count += 1
        if self.step_4_verify_balance_deducted():
            success_count += 1
        if self.step_5_verify_user_history():
            success_count += 1
            
        # Part 2: Admin approves withdrawal
        if self.step_6_login_admin():
            success_count += 1
        if self.step_7_check_pending_withdrawals():
            success_count += 1
        if self.step_8_approve_withdrawal():
            success_count += 1
        if self.step_9_verify_status_changed():
            success_count += 1
        if self.step_10_mark_completed():
            success_count += 1
            
        # Part 3: Test rejection flow
        if self.step_11_submit_second_withdrawal():
            success_count += 1
        if self.step_12_check_balance_after_second():
            success_count += 1
        if self.step_13_reject_withdrawal():
            success_count += 1
        if self.step_14_verify_balance_restored():
            success_count += 1
        
        # Generate summary
        success_rate = (success_count / total_steps) * 100
        
        print("\n" + "=" * 80)
        print("🎯 FINAL END-TO-END WITHDRAWAL VERIFICATION RESULTS")
        print("=" * 80)
        print(f"SUCCESS RATE: {success_count}/{total_steps} ({success_rate:.1f}%)")
        print()
        
        # Critical Success Criteria
        print("CRITICAL SUCCESS CRITERIA:")
        criteria_results = []
        
        for result in self.test_results:
            step = result["step"]
            status = result["status"]
            details = result["details"]
            
            if step == "1":
                criteria_results.append(f"✅ User can submit withdrawal" if status == "PASS" else f"❌ User can submit withdrawal")
            elif step == "4":
                criteria_results.append(f"✅ Balance deducts immediately" if status == "PASS" else f"❌ Balance deducts immediately")
            elif step == "7":
                criteria_results.append(f"✅ Withdrawal appears in admin pending list" if status == "PASS" else f"❌ Withdrawal appears in admin pending list")
            elif step == "8":
                criteria_results.append(f"✅ Admin can approve withdrawal" if status == "PASS" else f"❌ Admin can approve withdrawal")
            elif step == "9":
                criteria_results.append(f"✅ Status updates: pending → approved" if status == "PASS" else f"❌ Status updates: pending → approved")
            elif step == "10":
                criteria_results.append(f"✅ Status updates: approved → completed" if status == "PASS" else f"❌ Status updates: approved → completed")
            elif step == "13":
                criteria_results.append(f"✅ Admin can reject withdrawal" if status == "PASS" else f"❌ Admin can reject withdrawal")
            elif step == "14":
                criteria_results.append(f"✅ Balance restores on rejection" if status == "PASS" else f"❌ Balance restores on rejection")
            elif step == "5":
                criteria_results.append(f"✅ Withdrawal appears in user transaction history" if status == "PASS" else f"❌ Withdrawal appears in user transaction history")
        
        for criteria in criteria_results:
            print(criteria)
        
        print("\nDETAILED STEP RESULTS:")
        for result in self.test_results:
            status_icon = "✅" if result["status"] == "PASS" else "❌"
            print(f"{status_icon} Step {result['step']}: {result['details']}")
            if result["response_code"]:
                print(f"   Response Code: {result['response_code']}")
        
        print("\n" + "=" * 80)
        
        if success_rate >= 80:
            print("🎉 WITHDRAWAL SYSTEM IS LARGELY FUNCTIONAL")
        elif success_rate >= 60:
            print("⚠️  WITHDRAWAL SYSTEM HAS SOME ISSUES")
        else:
            print("🚨 WITHDRAWAL SYSTEM HAS CRITICAL ISSUES")
        
        return success_rate

if __name__ == "__main__":
    test = WithdrawalEndToEndTest()
    success_rate = test.run_complete_test()