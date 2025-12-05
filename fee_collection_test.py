#!/usr/bin/env python3
"""
FEE COLLECTION VERIFICATION TEST
Tests that the 1% withdrawal fee is properly collected as requested in review.

Backend URL: https://cryptovault-29.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://cryptovault-29.preview.emergentagent.com/api"

# Test User for fee testing
FEE_TEST_USER = {
    "email": "fee_test@test.com",
    "password": "FeeTest123456",
    "full_name": "Fee Test User",
    "wallet_address": "fee_test_wallet_001"
}

class FeeCollectionTester:
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
    
    def register_and_login_user(self):
        """Register and login test user"""
        print(f"\n=== Setting Up Fee Test User ===")
        
        try:
            # Try to register
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=FEE_TEST_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    self.log_test("User Registration", True, f"User registered with ID: {self.user_id}")
                    return True
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": FEE_TEST_USER["email"],
                        "password": FEE_TEST_USER["password"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        self.user_id = data["user"]["user_id"]
                        self.log_test("User Login", True, f"User logged in with ID: {self.user_id}")
                        return True
                        
        except Exception as e:
            self.log_test("User Setup", False, f"Failed to setup user: {str(e)}")
            
        return False
    
    def setup_crypto_balances(self):
        """Setup crypto balances for testing"""
        print(f"\n=== Setting Up Crypto Balances ===")
        
        if not self.user_id:
            self.log_test("Setup Crypto Balances", False, "No user ID available")
            return False
        
        # Connect wallet first
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/connect-wallet",
                json={"wallet_address": FEE_TEST_USER["wallet_address"]},
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Wallet Connection", True, "Wallet connected successfully")
            else:
                self.log_test("Wallet Connection", False, f"Wallet connection failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Wallet Connection", False, f"Wallet connection request failed: {str(e)}")
        
        # Deposit some BTC using the old wallet-based system
        try:
            response = self.session.post(
                f"{BASE_URL}/user/deposit",
                json={
                    "wallet_address": FEE_TEST_USER["wallet_address"],
                    "amount": 0.1  # 0.1 BTC
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("BTC Deposit", True, "Deposited 0.1 BTC for withdrawal testing")
                    return True
                else:
                    self.log_test("BTC Deposit", False, "Deposit response indicates failure", data)
            else:
                self.log_test("BTC Deposit", False, f"Deposit failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("BTC Deposit", False, f"Deposit request failed: {str(e)}")
            
        return False
    
    def get_user_balance(self, currency="BTC"):
        """Get user balance using wallet address"""
        try:
            response = self.session.get(
                f"{BASE_URL}/user/profile/{FEE_TEST_USER['wallet_address']}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data:
                    return data["user"].get("available_balance", 0)
                            
        except Exception as e:
            print(f"Error getting balance: {str(e)}")
            
        return 0.0
    
    def test_withdrawal_fee_calculation(self):
        """Test that 1% withdrawal fee is correctly calculated and deducted"""
        print(f"\n=== Testing Withdrawal Fee Calculation ===")
        
        if not self.user_id:
            self.log_test("Withdrawal Fee Test", False, "No user ID available")
            return False
        
        # Get initial balance
        initial_balance = self.get_user_balance("BTC")
        print(f"Initial BTC balance: {initial_balance}")
        
        if initial_balance < 0.05:
            self.log_test("Withdrawal Fee Test", False, f"Insufficient balance for testing: {initial_balance} BTC")
            return False
        
        # Test withdrawal with fee
        withdrawal_amount = 0.05  # 0.05 BTC
        expected_fee = withdrawal_amount * 0.01  # 1% fee = 0.0005 BTC
        expected_net_amount = withdrawal_amount - expected_fee  # 0.0495 BTC
        
        try:
            response = self.session.post(
                f"{BASE_URL}/user/withdraw",
                json={
                    "wallet_address": FEE_TEST_USER["wallet_address"],
                    "amount": withdrawal_amount
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Check fee details in response
                    withdrawal_fee = data.get("fee", 0)
                    net_amount = withdrawal_amount - withdrawal_fee
                    
                    # Verify fee calculation
                    fee_correct = abs(withdrawal_fee - expected_fee) < 0.000001
                    net_amount_correct = abs(net_amount - expected_net_amount) < 0.000001
                    
                    if fee_correct and net_amount_correct:
                        self.log_test(
                            "Withdrawal Fee Calculation", 
                            True, 
                            f"✅ 1% fee correctly calculated: {withdrawal_fee} BTC fee on {withdrawal_amount} BTC withdrawal (Net: {net_amount} BTC)"
                        )
                        
                        # Verify balance was deducted correctly (full withdrawal amount including fee)
                        final_balance = self.get_user_balance("BTC")
                        expected_final_balance = initial_balance - withdrawal_amount - withdrawal_fee
                        balance_correct = abs(final_balance - expected_final_balance) < 0.000001
                        
                        if balance_correct:
                            self.log_test(
                                "Balance Deduction Verification", 
                                True, 
                                f"✅ Balance correctly deducted: {initial_balance} → {final_balance} BTC (Full withdrawal amount including fee)"
                            )
                            return True
                        else:
                            self.log_test(
                                "Balance Deduction Verification", 
                                False, 
                                f"❌ Balance deduction incorrect: Expected {expected_final_balance}, got {final_balance}"
                            )
                    else:
                        self.log_test(
                            "Withdrawal Fee Calculation", 
                            False, 
                            f"❌ Fee calculation incorrect: Fee: {withdrawal_fee} (expected: {expected_fee}), Net: {net_amount} (expected: {expected_net_amount})"
                        )
                else:
                    self.log_test("Withdrawal Fee Test", False, "Withdrawal response indicates failure", data)
            else:
                self.log_test("Withdrawal Fee Test", False, f"Withdrawal failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Withdrawal Fee Test", False, f"Withdrawal request failed: {str(e)}")
            
        return False
    
    def test_fee_collection_config(self):
        """Test fee configuration endpoints"""
        print(f"\n=== Testing Fee Configuration ===")
        
        try:
            # Test withdrawal fee config endpoint
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/withdrawal-fee",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    fee_percent = data.get("withdrawal_fee_percent", 0)
                    if fee_percent == 1.0:
                        self.log_test(
                            "Withdrawal Fee Config", 
                            True, 
                            f"✅ Withdrawal fee configured correctly: {fee_percent}%"
                        )
                        return True
                    else:
                        self.log_test(
                            "Withdrawal Fee Config", 
                            False, 
                            f"❌ Withdrawal fee misconfigured: {fee_percent}% (expected: 1.0%)"
                        )
                else:
                    self.log_test("Withdrawal Fee Config", False, "Fee config response indicates failure", data)
            else:
                self.log_test("Withdrawal Fee Config", False, f"Fee config failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Withdrawal Fee Config", False, f"Fee config request failed: {str(e)}")
            
        return False
    
    def test_admin_fee_collection(self):
        """Test that admin can view collected fees"""
        print(f"\n=== Testing Admin Fee Collection View ===")
        
        try:
            # Test admin platform settings to see fee configuration
            response = self.session.get(
                f"{BASE_URL}/admin/platform-settings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "settings" in data:
                    settings = data["settings"]
                    
                    # Look for withdrawal fee setting
                    withdrawal_fee_setting = None
                    for setting in settings:
                        if setting.get("key") == "withdraw_fee_percent":
                            withdrawal_fee_setting = setting
                            break
                    
                    if withdrawal_fee_setting:
                        fee_value = withdrawal_fee_setting.get("value", 0)
                        if fee_value == 1.0:
                            self.log_test(
                                "Admin Fee Collection View", 
                                True, 
                                f"✅ Admin can view withdrawal fee setting: {fee_value}%"
                            )
                            return True
                        else:
                            self.log_test(
                                "Admin Fee Collection View", 
                                False, 
                                f"❌ Admin fee setting incorrect: {fee_value}% (expected: 1.0%)"
                            )
                    else:
                        self.log_test(
                            "Admin Fee Collection View", 
                            False, 
                            "❌ Withdrawal fee setting not found in admin settings"
                        )
                else:
                    self.log_test("Admin Fee Collection View", False, "Admin settings response invalid", data)
            else:
                self.log_test("Admin Fee Collection View", False, f"Admin settings failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Fee Collection View", False, f"Admin settings request failed: {str(e)}")
            
        return False
    
    def run_fee_collection_tests(self):
        """Run all fee collection tests"""
        print("🎯 FEE COLLECTION VERIFICATION TEST")
        print("=" * 50)
        print("Testing 1% withdrawal fee collection system")
        print("=" * 50)
        
        # Setup user
        if not self.register_and_login_user():
            print("❌ CRITICAL FAILURE: Could not setup test user")
            return False
        
        # Setup balances
        if not self.setup_crypto_balances():
            print("❌ CRITICAL FAILURE: Could not setup crypto balances")
            return False
        
        # Test fee configuration
        self.test_fee_collection_config()
        
        # Test withdrawal fee calculation
        if not self.test_withdrawal_fee_calculation():
            print("❌ CRITICAL FAILURE: Withdrawal fee calculation failed")
            return False
        
        # Test admin fee collection view
        self.test_admin_fee_collection()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("🎯 FEE COLLECTION TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\n📊 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Check critical fee collection functionality
        critical_tests = [
            "Withdrawal Fee Calculation",
            "Balance Deduction Verification"
        ]
        
        critical_passed = sum(1 for result in self.test_results 
                            if result["test"] in critical_tests and result["success"])
        
        print(f"\n🔥 CRITICAL FEE COLLECTION: {critical_passed}/{len(critical_tests)} tests passed")
        
        if critical_passed == len(critical_tests):
            print("✅ FEE COLLECTION WORKING - 1% withdrawal fee properly implemented!")
        else:
            print("❌ FEE COLLECTION ISSUES - Fee system not working correctly!")
        
        print("=" * 50)

def main():
    """Main test execution"""
    tester = FeeCollectionTester()
    
    try:
        success = tester.run_fee_collection_tests()
        tester.print_summary()
        
        if success:
            print("\n🎉 FEE COLLECTION TEST COMPLETED")
            sys.exit(0)
        else:
            print("\n💥 FEE COLLECTION TEST FAILED")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        tester.print_summary()
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")
        tester.print_summary()
        sys.exit(1)

if __name__ == "__main__":
    main()