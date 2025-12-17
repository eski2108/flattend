#!/usr/bin/env python3
"""
FOCUSED BACKEND TESTING - FIX VERIFICATION

Test the specific issues that were found in the previous comprehensive test:

## FIXES TO VERIFY:

### 1. Swap History Endpoint (JUST FIXED)
- GET /api/swap/history/{user_id}
- Should now return proper JSON with {success: true, swaps: [...], count: N}
- Test with a user who has swap transactions

### 2. Admin Liquidity Wallet Endpoints (CLARIFY CORRECT PATHS)
Test these correct paths:
- GET /api/admin/liquidity/balances - Get all liquidity wallet balances
- GET /api/admin/liquidity/balance/{currency} - Get specific currency balance
- POST /api/admin/liquidity/add - Add funds to liquidity wallet

### 3. Express Buy System (VALIDATE WORKING FLOW)
- POST /api/express-buy/match - Match buyer to cheapest seller OR admin liquidity
- POST /api/express-buy/execute - Execute the express buy
  Required fields: user_id, ad_id, crypto_amount, fiat_amount, buyer_wallet_address, crypto_currency (if ad_id is "ADMIN_LIQUIDITY")

### 4. Swap System (VERIFY RESPONSE STRUCTURE)
- POST /api/swap/preview - Should return "to_amount" field
- POST /api/swap/execute - Should work with proper user balance

## TEST APPROACH:
1. Create test user and add funds
2. Test swap preview/execute/history flow
3. Test admin liquidity wallet endpoints
4. Test express buy with admin liquidity
5. Verify all responses have correct structure

## BACKEND URL:
https://cryptodash-22.preview.emergentagent.com/api

**GOAL: Verify all previously failing tests now pass with 100% success rate**
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://cryptodash-22.preview.emergentagent.com/api"

# Test Users
TEST_USER = {
    "email": "fix_verification_test@test.com",
    "password": "Test123456",
    "full_name": "Fix Verification User"
}

ADMIN_USER = {
    "email": "admin@coinhubx.com",
    "password": "admin123",
    "admin_code": "CRYPTOLEND_ADMIN_2025"
}

class FixVerificationTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.user_id = None
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def setup_test_user(self):
        """Setup test user with funds"""
        print("\n🔧 SETTING UP TEST USER...")
        
        # Register user
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=TEST_USER)
            if response.status_code == 200:
                self.log_test("User Registration", True, "Test user registered successfully")
            else:
                # User might already exist, try login
                login_response = self.session.post(f"{BASE_URL}/auth/login", json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"]
                })
                if login_response.status_code == 200:
                    self.log_test("User Login (Existing)", True, "Logged in with existing user")
                else:
                    self.log_test("User Setup", False, f"Failed to register/login: {login_response.text}")
                    return False
        except Exception as e:
            self.log_test("User Setup", False, f"Exception: {str(e)}")
            return False
        
        # Login to get token
        try:
            login_response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                if login_data.get("success") and "token" in login_data:
                    self.user_token = login_data["token"]
                    self.user_id = login_data["user"]["user_id"]
                    self.log_test("User Token Retrieval", True, f"User ID: {self.user_id}")
                else:
                    self.log_test("User Token Retrieval", False, "No token in response")
                    return False
            else:
                self.log_test("User Token Retrieval", False, f"Login failed: {login_response.text}")
                return False
        except Exception as e:
            self.log_test("User Token Retrieval", False, f"Exception: {str(e)}")
            return False
        
        # Add funds to user for testing (using query parameters)
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            add_funds_response = self.session.post(f"{BASE_URL}/trader/balance/add-funds", 
                params={
                    "trader_id": self.user_id,
                    "currency": "BTC",
                    "amount": 2.0,
                    "reason": "test_deposit"
                }, headers=headers)
            
            if add_funds_response.status_code == 200:
                self.log_test("Add BTC Funds", True, "Added 2.0 BTC to user balance")
            else:
                self.log_test("Add BTC Funds", False, f"Failed: {add_funds_response.text}")
        except Exception as e:
            self.log_test("Add BTC Funds", False, f"Exception: {str(e)}")
        
        # Add ETH funds too
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            add_funds_response = self.session.post(f"{BASE_URL}/trader/balance/add-funds", 
                params={
                    "trader_id": self.user_id,
                    "currency": "ETH",
                    "amount": 10.0,
                    "reason": "test_deposit"
                }, headers=headers)
            
            if add_funds_response.status_code == 200:
                self.log_test("Add ETH Funds", True, "Added 10.0 ETH to user balance")
            else:
                self.log_test("Add ETH Funds", False, f"Failed: {add_funds_response.text}")
        except Exception as e:
            self.log_test("Add ETH Funds", False, f"Exception: {str(e)}")
        
        return True
    
    def setup_admin_user(self):
        """Setup admin user"""
        print("\n🔧 SETTING UP ADMIN USER...")
        
        try:
            admin_login_response = self.session.post(f"{BASE_URL}/admin/login", json=ADMIN_USER)
            
            if admin_login_response.status_code == 200:
                admin_data = admin_login_response.json()
                if admin_data.get("success") and "token" in admin_data:
                    self.admin_token = admin_data["token"]
                    self.log_test("Admin Login", True, "Admin token retrieved")
                    return True
                else:
                    self.log_test("Admin Login", False, "No token in admin response")
                    return False
            else:
                self.log_test("Admin Login", False, f"Admin login failed: {admin_login_response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_swap_system(self):
        """Test swap preview/execute/history flow"""
        print("\n🔄 TESTING SWAP SYSTEM...")
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Swap Preview
        try:
            preview_response = self.session.post(f"{BASE_URL}/swap/preview", 
                json={
                    "user_id": self.user_id,
                    "from_currency": "BTC",
                    "to_currency": "ETH",
                    "from_amount": 0.1
                }, headers=headers)
            
            if preview_response.status_code == 200:
                preview_data = preview_response.json()
                if preview_data.get("success") and "to_amount" in preview_data:
                    self.log_test("Swap Preview", True, f"Preview successful, to_amount: {preview_data.get('to_amount')}")
                else:
                    self.log_test("Swap Preview", False, f"Missing to_amount field: {preview_data}")
            else:
                self.log_test("Swap Preview", False, f"Preview failed: {preview_response.text}")
        except Exception as e:
            self.log_test("Swap Preview", False, f"Exception: {str(e)}")
        
        # Test 2: Execute Swap
        try:
            execute_response = self.session.post(f"{BASE_URL}/swap/execute", 
                json={
                    "user_id": self.user_id,
                    "from_currency": "BTC",
                    "to_currency": "ETH",
                    "from_amount": 0.1
                }, headers=headers)
            
            if execute_response.status_code == 200:
                execute_data = execute_response.json()
                if execute_data.get("success"):
                    self.log_test("Swap Execute", True, f"Swap executed successfully")
                else:
                    self.log_test("Swap Execute", False, f"Swap execution failed: {execute_data}")
            else:
                self.log_test("Swap Execute", False, f"Execute failed: {execute_response.text}")
        except Exception as e:
            self.log_test("Swap Execute", False, f"Exception: {str(e)}")
        
        # Test 3: Swap History (THE FIXED ENDPOINT)
        try:
            history_response = self.session.get(f"{BASE_URL}/swap/history/{self.user_id}", headers=headers)
            
            if history_response.status_code == 200:
                history_data = history_response.json()
                if history_data.get("success") and "swaps" in history_data and "count" in history_data:
                    self.log_test("Swap History (FIXED)", True, f"History retrieved: {history_data.get('count')} swaps")
                else:
                    self.log_test("Swap History (FIXED)", False, f"Missing required fields: {history_data}")
            else:
                self.log_test("Swap History (FIXED)", False, f"History failed: {history_response.text}")
        except Exception as e:
            self.log_test("Swap History (FIXED)", False, f"Exception: {str(e)}")
    
    def test_admin_liquidity_endpoints(self):
        """Test admin liquidity wallet endpoints"""
        print("\n💰 TESTING ADMIN LIQUIDITY ENDPOINTS...")
        
        # Admin endpoints might not require authentication for testing
        headers = {}
        
        # Test 1: Get all liquidity balances
        try:
            balances_response = self.session.get(f"{BASE_URL}/admin/liquidity/balances", headers=headers)
            
            if balances_response.status_code == 200:
                balances_data = balances_response.json()
                if balances_data.get("success"):
                    self.log_test("Admin Liquidity Balances", True, f"Retrieved balances successfully")
                else:
                    self.log_test("Admin Liquidity Balances", False, f"Response not successful: {balances_data}")
            else:
                self.log_test("Admin Liquidity Balances", False, f"Failed: {balances_response.text}")
        except Exception as e:
            self.log_test("Admin Liquidity Balances", False, f"Exception: {str(e)}")
        
        # Test 2: Get specific currency balance
        try:
            btc_balance_response = self.session.get(f"{BASE_URL}/admin/liquidity/balance/BTC", headers=headers)
            
            if btc_balance_response.status_code == 200:
                btc_data = btc_balance_response.json()
                if btc_data.get("success"):
                    self.log_test("Admin BTC Liquidity Balance", True, f"BTC balance retrieved")
                else:
                    self.log_test("Admin BTC Liquidity Balance", False, f"Response not successful: {btc_data}")
            else:
                self.log_test("Admin BTC Liquidity Balance", False, f"Failed: {btc_balance_response.text}")
        except Exception as e:
            self.log_test("Admin BTC Liquidity Balance", False, f"Exception: {str(e)}")
        
        # Test 3: Add funds to liquidity wallet
        try:
            add_liquidity_response = self.session.post(f"{BASE_URL}/admin/liquidity/add", 
                json={
                    "currency": "BTC",
                    "amount": 1.0,
                    "admin_id": "admin_user_001"
                }, headers=headers)
            
            if add_liquidity_response.status_code == 200:
                add_data = add_liquidity_response.json()
                if add_data.get("success"):
                    self.log_test("Admin Add Liquidity", True, f"Added 1.0 BTC to liquidity")
                else:
                    self.log_test("Admin Add Liquidity", False, f"Response not successful: {add_data}")
            else:
                self.log_test("Admin Add Liquidity", False, f"Failed: {add_liquidity_response.text}")
        except Exception as e:
            self.log_test("Admin Add Liquidity", False, f"Exception: {str(e)}")
    
    def test_express_buy_system(self):
        """Test express buy system"""
        print("\n⚡ TESTING EXPRESS BUY SYSTEM...")
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Express Buy Match
        try:
            match_response = self.session.post(f"{BASE_URL}/express-buy/match", 
                json={
                    "user_id": self.user_id,
                    "crypto_currency": "BTC",
                    "fiat_amount": 1000.0,
                    "fiat_currency": "USD"
                }, headers=headers)
            
            if match_response.status_code == 200:
                match_data = match_response.json()
                if match_data.get("success"):
                    ad_id = match_data.get("ad_id", "ADMIN_LIQUIDITY")
                    self.log_test("Express Buy Match", True, f"Match found: {ad_id}")
                    
                    # Test 2: Execute Express Buy
                    try:
                        execute_data = {
                            "user_id": self.user_id,
                            "ad_id": ad_id,
                            "crypto_amount": match_data.get("crypto_amount", 0.02),
                            "fiat_amount": 1000.0,
                            "buyer_wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                        }
                        
                        # Add crypto_currency if using admin liquidity
                        if ad_id == "ADMIN_LIQUIDITY":
                            execute_data["crypto_currency"] = "BTC"
                        
                        execute_response = self.session.post(f"{BASE_URL}/express-buy/execute", 
                            json=execute_data, headers=headers)
                        
                        if execute_response.status_code == 200:
                            execute_result = execute_response.json()
                            if execute_result.get("success"):
                                self.log_test("Express Buy Execute", True, f"Express buy executed successfully")
                            else:
                                self.log_test("Express Buy Execute", False, f"Execution failed: {execute_result}")
                        else:
                            self.log_test("Express Buy Execute", False, f"Execute failed: {execute_response.text}")
                    except Exception as e:
                        self.log_test("Express Buy Execute", False, f"Exception: {str(e)}")
                        
                else:
                    self.log_test("Express Buy Match", False, f"Match failed: {match_data}")
            else:
                self.log_test("Express Buy Match", False, f"Match failed: {match_response.text}")
        except Exception as e:
            self.log_test("Express Buy Match", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all fix verification tests"""
        print("🎯 FOCUSED BACKEND TESTING - FIX VERIFICATION")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return
        
        self.setup_admin_user()  # Optional, continue even if fails
        
        # Run specific fix verification tests
        self.test_swap_system()
        self.test_admin_liquidity_endpoints()
        self.test_express_buy_system()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 FIX VERIFICATION TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print("\n🎉 ALL FIXES VERIFIED SUCCESSFULLY!")
        elif success_rate >= 80:
            print(f"\n✅ MOST FIXES WORKING ({success_rate:.1f}% success rate)")
        else:
            print(f"\n❌ SIGNIFICANT ISSUES REMAIN ({success_rate:.1f}% success rate)")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return success_rate

if __name__ == "__main__":
    tester = FixVerificationTester()
    success_rate = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success_rate == 100 else 1)