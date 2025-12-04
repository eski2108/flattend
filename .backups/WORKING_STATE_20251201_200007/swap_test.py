#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Swap/Convert Crypto Feature
Testing Agent - Swap/Convert System Complete Flow Test
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://tradingplatform-14.preview.emergentagent.com/api"

class SwapTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def setup_test_user(self):
        """Setup: Register and login test user"""
        print("\n🔧 SETUP PHASE: Creating test user...")
        
        # Register user
        register_data = {
            "email": "swap_test@test.com",
            "password": "Test123456",
            "full_name": "Swap Test User"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                self.log_result("User Registration", True, "Test user registered successfully")
            else:
                # User might already exist, try login
                self.log_result("User Registration", True, "User already exists, proceeding to login")
        except Exception as e:
            self.log_result("User Registration", False, f"Registration failed: {str(e)}")
            return False
        
        # Login user
        login_data = {
            "email": "swap_test@test.com",
            "password": "Test123456"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.user_id = data.get("user", {}).get("user_id")
                if self.user_id:
                    self.log_result("User Login", True, f"Login successful, user_id: {self.user_id}")
                    return True
                else:
                    self.log_result("User Login", False, "Login successful but no user_id returned")
                    return False
            else:
                self.log_result("User Login", False, f"Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("User Login", False, f"Login error: {str(e)}")
            return False
    
    def add_test_funds(self):
        """Add 1.0 BTC to user's balance"""
        print("\n💰 FUNDING PHASE: Adding test funds...")
        
        try:
            # Add 1.0 BTC to user balance
            response = self.session.post(
                f"{BACKEND_URL}/trader/balance/add-funds",
                params={
                    "trader_id": self.user_id,
                    "currency": "BTC",
                    "amount": 1.0,
                    "reason": "swap_test_funding"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Add BTC Funds", True, "1.0 BTC added to user balance", data)
                return True
            else:
                self.log_result("Add BTC Funds", False, f"Failed to add funds: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Add BTC Funds", False, f"Add funds error: {str(e)}")
            return False
    
    def test_preview_swap_btc_to_usdt(self):
        """Test Case 1: Preview BTC to USDT swap"""
        print("\n🔍 PHASE 1: Testing swap preview...")
        
        preview_data = {
            "from_currency": "BTC",
            "to_currency": "USDT",
            "from_amount": 0.1
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/swap/preview", json=preview_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["success", "from_currency", "to_currency", "from_amount", 
                                 "to_amount", "swap_fee_percent", "swap_fee_gbp", "rate"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_result("BTC to USDT Preview", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify calculations
                if data["swap_fee_percent"] == 1.5:
                    self.log_result("BTC to USDT Preview", True, 
                                  f"Preview successful - Rate: {data['rate']:.6f}, Fee: {data['swap_fee_percent']}%", 
                                  data)
                    return True
                else:
                    self.log_result("BTC to USDT Preview", False, f"Incorrect fee percentage: {data['swap_fee_percent']}")
                    return False
            else:
                self.log_result("BTC to USDT Preview", False, f"Preview failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("BTC to USDT Preview", False, f"Preview error: {str(e)}")
            return False
    
    def test_preview_swap_eth_to_btc(self):
        """Test Case 2: Preview ETH to BTC swap"""
        preview_data = {
            "from_currency": "ETH",
            "to_currency": "BTC",
            "from_amount": 0.5
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/swap/preview", json=preview_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("ETH to BTC Preview", True, 
                              f"Preview successful - Rate: {data.get('rate', 0):.6f}", data)
                return True
            else:
                self.log_result("ETH to BTC Preview", False, f"Preview failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("ETH to BTC Preview", False, f"Preview error: {str(e)}")
            return False
    
    def test_execute_swap_btc_to_usdt(self):
        """Test Case 3: Execute BTC to USDT swap"""
        print("\n⚡ PHASE 2: Testing swap execution...")
        
        # First get current balance
        try:
            balance_response = self.session.get(f"{BACKEND_URL}/trader/my-balances/{self.user_id}")
            if balance_response.status_code == 200:
                balance_data = balance_response.json()
                btc_balance_before = 0
                for balance in balance_data.get("balances", []):
                    if balance.get("currency") == "BTC":
                        btc_balance_before = balance.get("available_balance", 0)
                        break
                print(f"BTC balance before swap: {btc_balance_before}")
            else:
                self.log_result("Get Balance Before Swap", False, "Failed to get balance before swap")
                return False
        except Exception as e:
            self.log_result("Get Balance Before Swap", False, f"Balance check error: {str(e)}")
            return False
        
        # Execute swap
        swap_data = {
            "user_id": self.user_id,
            "from_currency": "BTC",
            "to_currency": "USDT",
            "from_amount": 0.1
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/swap/execute", json=swap_data)
            
            if response.status_code == 200:
                data = response.json()
                swap_id = data.get("swap_id")
                
                if swap_id:
                    self.log_result("Execute BTC to USDT Swap", True, 
                                  f"Swap executed successfully - Swap ID: {swap_id}", data)
                    return swap_id
                else:
                    self.log_result("Execute BTC to USDT Swap", False, "Swap executed but no swap_id returned")
                    return False
            else:
                self.log_result("Execute BTC to USDT Swap", False, f"Swap execution failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Execute BTC to USDT Swap", False, f"Swap execution error: {str(e)}")
            return False
    
    def test_check_balances_after_swap(self):
        """Test Case 4: Check balances after swap"""
        print("\n💳 PHASE 3: Verifying balance changes...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/trader/my-balances/{self.user_id}")
            
            if response.status_code == 200:
                data = response.json()
                balances = data.get("balances", [])
                
                btc_balance = 0
                usdt_balance = 0
                
                for balance in balances:
                    if balance.get("currency") == "BTC":
                        btc_balance = balance.get("available_balance", 0)
                    elif balance.get("currency") == "USDT":
                        usdt_balance = balance.get("available_balance", 0)
                
                # Verify BTC decreased by 0.1
                if btc_balance == 0.9:
                    btc_check = True
                    btc_msg = f"BTC balance correct: {btc_balance}"
                else:
                    btc_check = False
                    btc_msg = f"BTC balance incorrect: expected 0.9, got {btc_balance}"
                
                # Verify USDT increased
                if usdt_balance > 0:
                    usdt_check = True
                    usdt_msg = f"USDT balance increased: {usdt_balance}"
                else:
                    usdt_check = False
                    usdt_msg = f"USDT balance not increased: {usdt_balance}"
                
                overall_success = btc_check and usdt_check
                self.log_result("Balance Verification", overall_success, 
                              f"{btc_msg}, {usdt_msg}", data)
                return overall_success
            else:
                self.log_result("Balance Verification", False, f"Failed to get balances: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Balance Verification", False, f"Balance check error: {str(e)}")
            return False
    
    def test_swap_history(self):
        """Test Case 5: Get swap history"""
        print("\n📊 PHASE 4: Testing swap history...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/swap/history/{self.user_id}")
            
            if response.status_code == 200:
                data = response.json()
                swaps = data.get("swaps", [])
                
                if len(swaps) >= 1:
                    latest_swap = swaps[0]
                    required_fields = ["swap_id", "from_currency", "to_currency", "from_amount", 
                                     "to_amount", "swap_fee_percent", "status"]
                    
                    missing_fields = [field for field in required_fields if field not in latest_swap]
                    if missing_fields:
                        self.log_result("Swap History", False, f"Missing fields in swap record: {missing_fields}")
                        return False
                    
                    if latest_swap["status"] == "completed":
                        self.log_result("Swap History", True, 
                                      f"Swap history retrieved - {len(swaps)} swaps found", data)
                        return True
                    else:
                        self.log_result("Swap History", False, f"Swap status not completed: {latest_swap['status']}")
                        return False
                else:
                    self.log_result("Swap History", False, "No swaps found in history")
                    return False
            else:
                self.log_result("Swap History", False, f"Failed to get swap history: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Swap History", False, f"Swap history error: {str(e)}")
            return False
    
    def test_insufficient_balance_error(self):
        """Test Case 6: Swap with insufficient balance"""
        print("\n🚫 PHASE 5: Testing error handling...")
        
        swap_data = {
            "user_id": self.user_id,
            "from_currency": "BTC",
            "to_currency": "USDT",
            "from_amount": 10.0  # User only has 0.9 BTC
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/swap/execute", json=swap_data)
            
            if response.status_code == 400:
                error_msg = response.json().get("detail", "")
                if "insufficient" in error_msg.lower():
                    self.log_result("Insufficient Balance Error", True, 
                                  f"Correctly rejected insufficient balance: {error_msg}")
                    return True
                else:
                    self.log_result("Insufficient Balance Error", False, f"Wrong error message: {error_msg}")
                    return False
            else:
                self.log_result("Insufficient Balance Error", False, f"Should have returned 400 error, got {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Insufficient Balance Error", False, f"Error handling test failed: {str(e)}")
            return False
    
    def test_invalid_currency_error(self):
        """Test Case 7: Swap with invalid currency"""
        swap_data = {
            "user_id": self.user_id,
            "from_currency": "BTC",
            "to_currency": "INVALID_COIN",
            "from_amount": 0.1
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/swap/execute", json=swap_data)
            
            if response.status_code == 400:
                error_msg = response.json().get("detail", "")
                if "unsupported" in error_msg.lower():
                    self.log_result("Invalid Currency Error", True, 
                                  f"Correctly rejected invalid currency: {error_msg}")
                    return True
                else:
                    self.log_result("Invalid Currency Error", False, f"Wrong error message: {error_msg}")
                    return False
            else:
                self.log_result("Invalid Currency Error", False, f"Should have returned 400 error, got {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Invalid Currency Error", False, f"Error handling test failed: {str(e)}")
            return False
    
    def test_zero_amount_error(self):
        """Test Case 8: Swap with zero amount"""
        swap_data = {
            "user_id": self.user_id,
            "from_currency": "BTC",
            "to_currency": "USDT",
            "from_amount": 0
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/swap/execute", json=swap_data)
            
            if response.status_code == 400:
                error_msg = response.json().get("detail", "")
                if "greater than 0" in error_msg.lower():
                    self.log_result("Zero Amount Error", True, 
                                  f"Correctly rejected zero amount: {error_msg}")
                    return True
                else:
                    self.log_result("Zero Amount Error", False, f"Wrong error message: {error_msg}")
                    return False
            else:
                self.log_result("Zero Amount Error", False, f"Should have returned 400 error, got {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Zero Amount Error", False, f"Error handling test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run complete swap/convert crypto test suite"""
        print("🚀 STARTING COMPREHENSIVE SWAP/CONVERT CRYPTO TESTING")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_user():
            print("❌ Setup failed, aborting tests")
            return False
        
        if not self.add_test_funds():
            print("❌ Funding failed, aborting tests")
            return False
        
        # Test phases
        test_methods = [
            self.test_preview_swap_btc_to_usdt,
            self.test_preview_swap_eth_to_btc,
            self.test_execute_swap_btc_to_usdt,
            self.test_check_balances_after_swap,
            self.test_swap_history,
            self.test_insufficient_balance_error,
            self.test_invalid_currency_error,
            self.test_zero_amount_error
        ]
        
        passed = 0
        total = len(test_methods)
        
        for test_method in test_methods:
            try:
                if test_method():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test_method.__name__} crashed: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 SWAP/CONVERT CRYPTO TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (passed / total) * 100
        print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("✅ SWAP/CONVERT SYSTEM: OPERATIONAL")
        else:
            print("❌ SWAP/CONVERT SYSTEM: NEEDS ATTENTION")
        
        # Detailed results
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = SwapTestRunner()
    tester.run_all_tests()