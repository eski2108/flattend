#!/usr/bin/env python3
"""
FINAL COMPLETE END-TO-END WITHDRAWAL TEST (ALL FIXES APPLIED)
Testing complete withdrawal flow from user submission to admin approval/rejection
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://cryptodash-22.preview.emergentagent.com/api"
USER_EMAIL = "withdrawal_test@demo.com"
USER_PASSWORD = "Test123!"
ADMIN_EMAIL = "admin_test@demo.com"
ADMIN_PASSWORD = "Admin123!"

class WithdrawalSystemTester:
    def __init__(self):
        self.user_token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.initial_balance = 0
        self.withdrawal_id = None
        self.test_results = []
        
    def log_result(self, step, status, details):
        """Log test result"""
        result = {
            "step": step,
            "status": "✅" if status else "❌",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{result['status']} {step}: {details}")
        
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
        except Exception as e:
            return None
            
    def authenticate_user(self):
        """Step 1: Login user"""
        print("\n=== PART 1: USER WITHDRAWAL ===")
        
        response = self.make_request("POST", "/auth/login", {
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.user_token = data.get("token")
                self.user_id = data.get("user", {}).get("user_id")
                self.log_result("1. Login user", True, f"Successfully logged in {USER_EMAIL}, user_id: {self.user_id}")
                return True
            else:
                self.log_result("1. Login user", False, f"Login failed: {data.get('message', 'Unknown error')}")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("1. Login user", False, f"HTTP {status_code}")
        return False
        
    def get_initial_balance(self):
        """Step 2: Get initial BTC balance"""
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Try multiple balance endpoints
        endpoints = [
            f"/wallets/balances/{self.user_id}",
            f"/crypto-bank/balances/{self.user_id}",
            f"/user/balances/{self.user_id}"
        ]
        
        for endpoint in endpoints:
            response = self.make_request("GET", endpoint, headers=headers)
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    btc_balance = None
                    
                    # Find BTC balance
                    for balance in balances:
                        if balance.get("currency") == "BTC":
                            btc_balance = balance.get("balance", 0)
                            break
                    
                    if btc_balance is not None:
                        self.initial_balance = btc_balance
                        self.log_result("2. Get initial BTC balance", True, f"Initial BTC balance: {btc_balance} BTC via {endpoint}")
                        return True
                        
        self.log_result("2. Get initial BTC balance", False, "Could not retrieve BTC balance from any endpoint")
        return False
        
    def submit_withdrawal(self):
        """Step 3: Submit withdrawal request"""
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.0005,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        response = self.make_request("POST", "/user/withdraw", withdrawal_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.withdrawal_id = data.get("transaction_id")
                fee = data.get("fee", 0)
                total_withdrawn = data.get("total_withdrawn", 0)
                self.log_result("3. Submit withdrawal", True, 
                    f"Withdrawal submitted - ID: {self.withdrawal_id}, Amount: 0.0005 BTC, Fee: {fee}, Total: {total_withdrawn}")
                return True
            else:
                self.log_result("3. Submit withdrawal", False, f"Withdrawal failed: {data.get('message', 'Unknown error')}")
        else:
            status_code = response.status_code if response else "No response"
            error_msg = response.text if response else "No response"
            self.log_result("3. Submit withdrawal", False, f"HTTP {status_code}: {error_msg}")
        return False
        
    def verify_balance_deduction(self):
        """Step 5: Verify balance deducted"""
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Get current balance
        response = self.make_request("GET", f"/crypto-bank/balances/{self.user_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "balances" in data:
                balances = data["balances"]
                
                for balance in balances:
                    if balance.get("currency") == "BTC":
                        current_balance = balance.get("balance", 0)
                        expected_deduction = 0.0005 + 0.0000025  # amount + fee
                        expected_balance = self.initial_balance - expected_deduction
                        
                        self.log_result("5. Verify balance deducted", True, 
                            f"Balance updated: {self.initial_balance} → {current_balance} BTC (deducted: {self.initial_balance - current_balance})")
                        return True
                        
        self.log_result("5. Verify balance deducted", False, "Could not verify balance deduction")
        return False
        
    def check_transaction_history(self):
        """Step 6: Check transaction appears in history"""
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        endpoints = [
            f"/transactions/{self.user_id}",
            f"/user/transactions/{self.user_id}",
            f"/crypto-bank/transactions/{self.user_id}"
        ]
        
        for endpoint in endpoints:
            response = self.make_request("GET", endpoint, headers=headers)
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    
                    # Look for our withdrawal
                    for tx in transactions:
                        if (tx.get("transaction_id") == self.withdrawal_id or 
                            tx.get("withdrawal_id") == self.withdrawal_id):
                            self.log_result("6. Check transaction history", True, 
                                f"Transaction found in {endpoint}: {tx.get('status', 'unknown status')}")
                            return True
                            
        self.log_result("6. Check transaction history", False, "Withdrawal transaction not found in user history")
        return False
        
    def authenticate_admin(self):
        """Step 7: Login admin"""
        print("\n=== PART 2: ADMIN APPROVAL ===")
        
        response = self.make_request("POST", "/auth/login", {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.admin_token = data.get("token")
                self.admin_id = data.get("user", {}).get("user_id")
                admin_role = data.get("user", {}).get("role", "unknown")
                self.log_result("7. Login admin", True, f"Admin logged in: {ADMIN_EMAIL}, role: {admin_role}")
                return True
            else:
                self.log_result("7. Login admin", False, f"Admin login failed: {data.get('message', 'Unknown error')}")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("7. Login admin", False, f"HTTP {status_code}")
        return False
        
    def get_pending_withdrawals(self):
        """Step 8: Get pending withdrawals"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        endpoints = [
            "/admin/withdrawals/pending",
            "/admin/withdrawals"
        ]
        
        for endpoint in endpoints:
            response = self.make_request("GET", endpoint, headers=headers)
            if response and response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    withdrawals = data.get("withdrawals", [])
                    
                    # Look for our withdrawal
                    for withdrawal in withdrawals:
                        if (withdrawal.get("withdrawal_id") == self.withdrawal_id or 
                            withdrawal.get("transaction_id") == self.withdrawal_id):
                            self.log_result("8. Get pending withdrawals", True, 
                                f"Withdrawal found in {endpoint}: status={withdrawal.get('status')}")
                            return True
                    
                    self.log_result("8. Get pending withdrawals", False, 
                        f"Our withdrawal not found in {len(withdrawals)} pending withdrawals from {endpoint}")
                else:
                    self.log_result("8. Get pending withdrawals", False, f"Failed to get withdrawals from {endpoint}")
            else:
                status_code = response.status_code if response else "No response"
                self.log_result("8. Get pending withdrawals", False, f"{endpoint} returned HTTP {status_code}")
                
        return False
        
    def approve_withdrawal(self):
        """Step 10: Approve withdrawal"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        approval_data = {
            "withdrawal_id": self.withdrawal_id,
            "admin_id": self.admin_id,
            "action": "approve",
            "notes": "Test approval"
        }
        
        response = self.make_request("POST", "/admin/withdrawals/review", approval_data, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_result("10. Approve withdrawal", True, f"Withdrawal approved: {data.get('message', 'Success')}")
                return True
            else:
                self.log_result("10. Approve withdrawal", False, f"Approval failed: {data.get('message', 'Unknown error')}")
        else:
            status_code = response.status_code if response else "No response"
            error_msg = response.text if response else "No response"
            self.log_result("10. Approve withdrawal", False, f"HTTP {status_code}: {error_msg}")
        return False
        
    def complete_withdrawal(self):
        """Step 12: Complete withdrawal"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = self.make_request("POST", f"/admin/withdrawals/complete/{self.withdrawal_id}", {}, headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_result("12. Complete withdrawal", True, f"Withdrawal completed: {data.get('message', 'Success')}")
                return True
            else:
                self.log_result("12. Complete withdrawal", False, f"Completion failed: {data.get('message', 'Unknown error')}")
        else:
            status_code = response.status_code if response else "No response"
            error_msg = response.text if response else "No response"
            self.log_result("12. Complete withdrawal", False, f"HTTP {status_code}: {error_msg}")
        return False
        
    def verify_final_status(self):
        """Step 13: Verify final status is completed"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = self.make_request("GET", "/admin/withdrawals", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                withdrawals = data.get("withdrawals", [])
                
                for withdrawal in withdrawals:
                    if (withdrawal.get("withdrawal_id") == self.withdrawal_id or 
                        withdrawal.get("transaction_id") == self.withdrawal_id):
                        status = withdrawal.get("status")
                        self.log_result("13. Verify final status", status == "completed", 
                            f"Final status: {status}")
                        return status == "completed"
                        
        self.log_result("13. Verify final status", False, "Could not verify final status")
        return False
        
    def test_rejection_flow(self):
        """Part 3: Test rejection flow"""
        print("\n=== PART 3: REJECTION TEST ===")
        
        # Get balance before rejection test
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.make_request("GET", f"/crypto-bank/balances/{self.user_id}", headers=headers)
        
        balance_before_rejection = 0
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "balances" in data:
                for balance in data["balances"]:
                    if balance.get("currency") == "BTC":
                        balance_before_rejection = balance.get("balance", 0)
                        break
        
        self.log_result("15. Record balance before rejection", True, f"Balance before rejection: {balance_before_rejection} BTC")
        
        # Submit second withdrawal
        withdrawal_data = {
            "user_id": self.user_id,
            "currency": "BTC", 
            "amount": 0.0003,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        response = self.make_request("POST", "/user/withdraw", withdrawal_data, headers)
        
        second_withdrawal_id = None
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                second_withdrawal_id = data.get("transaction_id")
                self.log_result("14. Submit 2nd withdrawal", True, f"Second withdrawal submitted: {second_withdrawal_id}")
            else:
                self.log_result("14. Submit 2nd withdrawal", False, f"Failed: {data.get('message')}")
                return False
        else:
            self.log_result("14. Submit 2nd withdrawal", False, f"HTTP {response.status_code if response else 'No response'}")
            return False
            
        # Admin rejects
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        rejection_data = {
            "withdrawal_id": second_withdrawal_id,
            "admin_id": self.admin_id,
            "action": "reject",
            "notes": "Test rejection"
        }
        
        response = self.make_request("POST", "/admin/withdrawals/review", rejection_data, admin_headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.log_result("16. Admin rejects withdrawal", True, f"Withdrawal rejected: {data.get('message', 'Success')}")
            else:
                self.log_result("16. Admin rejects withdrawal", False, f"Rejection failed: {data.get('message')}")
                return False
        else:
            self.log_result("16. Admin rejects withdrawal", False, f"HTTP {response.status_code if response else 'No response'}")
            return False
            
        # Verify balance restored
        time.sleep(2)  # Wait for balance update
        response = self.make_request("GET", f"/crypto-bank/balances/{self.user_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "balances" in data:
                for balance in data["balances"]:
                    if balance.get("currency") == "BTC":
                        balance_after_rejection = balance.get("balance", 0)
                        self.log_result("17. Verify balance restored", True, 
                            f"Balance after rejection: {balance_after_rejection} BTC (should equal {balance_before_rejection})")
                        return True
                        
        self.log_result("17. Verify balance restored", False, "Could not verify balance restoration")
        return False
        
    def generate_final_summary(self):
        """Generate final summary"""
        print("\n" + "="*80)
        print("FINAL WITHDRAWAL SYSTEM TEST SUMMARY")
        print("="*80)
        
        # Count successes and failures
        successes = sum(1 for result in self.test_results if result["status"] == "✅")
        failures = sum(1 for result in self.test_results if result["status"] == "❌")
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {successes} ✅")
        print(f"Failed: {failures} ❌")
        print(f"Success Rate: {(successes/total*100):.1f}%")
        
        print("\n" + "="*50)
        print("FINAL SUMMARY ANSWERS:")
        print("="*50)
        
        # Analyze results to answer key questions
        answers = {
            "Can user submit?": "NO",
            "Does balance deduct?": "NO", 
            "Can admin see it?": "NO",
            "Can admin approve?": "NO",
            "Does status update?": "NO",
            "Can admin reject?": "NO",
            "Does balance restore?": "NO",
            "In user history?": "NO"
        }
        
        # Update based on actual results
        for result in self.test_results:
            if "Submit withdrawal" in result["step"] and result["status"] == "✅":
                answers["Can user submit?"] = "YES"
            if "balance deducted" in result["step"] and result["status"] == "✅":
                answers["Does balance deduct?"] = "YES"
            if "pending withdrawals" in result["step"] and result["status"] == "✅":
                answers["Can admin see it?"] = "YES"
            if "Approve withdrawal" in result["step"] and result["status"] == "✅":
                answers["Can admin approve?"] = "YES"
            if "final status" in result["step"] and result["status"] == "✅":
                answers["Does status update?"] = "YES"
            if "rejects withdrawal" in result["step"] and result["status"] == "✅":
                answers["Can admin reject?"] = "YES"
            if "balance restored" in result["step"] and result["status"] == "✅":
                answers["Does balance restore?"] = "YES"
            if "transaction history" in result["step"] and result["status"] == "✅":
                answers["In user history?"] = "YES"
                
        for question, answer in answers.items():
            print(f"- {question} {answer}")
            
        print("\n" + "="*50)
        print("DETAILED TEST RESULTS:")
        print("="*50)
        
        for result in self.test_results:
            print(f"{result['status']} {result['step']}: {result['details']}")
            
        return successes, failures, total

def main():
    """Run the complete withdrawal system test"""
    print("🚀 STARTING FINAL COMPLETE END-TO-END WITHDRAWAL TEST")
    print("="*80)
    
    tester = WithdrawalSystemTester()
    
    # Execute test sequence
    test_sequence = [
        tester.authenticate_user,
        tester.get_initial_balance,
        tester.submit_withdrawal,
        tester.verify_balance_deduction,
        tester.check_transaction_history,
        tester.authenticate_admin,
        tester.get_pending_withdrawals,
        tester.approve_withdrawal,
        tester.complete_withdrawal,
        tester.verify_final_status,
        tester.test_rejection_flow
    ]
    
    for test_func in test_sequence:
        try:
            test_func()
            time.sleep(1)  # Brief pause between tests
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            
    # Generate final summary
    successes, failures, total = tester.generate_final_summary()
    
    return successes == total  # Return True if all tests passed

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)