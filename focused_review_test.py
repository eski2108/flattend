#!/usr/bin/env python3
"""
FOCUSED BACKEND TESTING FOR REVIEW REQUEST - VERIFY 100% STATUS

This test suite covers the exact critical areas mentioned in the review request:

1. Authentication System
   - User registration with new unique email
   - Login with valid credentials (testuser1764010295@test.com / Test123456)
   - JWT token validation
   - Invalid credentials rejection

2. P2P Trading System
   - Fetch P2P offers (should show at least 1 offer now)
   - P2P marketplace filters
   - Available coins endpoint
   - Public seller profile

3. Crypto Bank APIs
   - Balance retrieval
   - Deposit operation
   - Withdrawal operation
   - Transaction history

4. Platform Features
   - Platform stats endpoint
   - Price alerts creation
   - Price alerts retrieval
   - AI chat session creation

5. Admin Features
   - Platform wallet balance
   - Revenue endpoints
   - CMS coins management

Expected Outcome: 100% pass rate on all critical backend functionality
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://crypto-alert-hub-2.preview.emergentagent.com/api"

# Test credentials from review request
EXISTING_USER = {
    "email": "testuser1764010295@test.com",
    "password": "Test123456"
}

class FocusedReviewTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.passed_tests = 0
        self.total_tests = 0
        self.user_id = None
        self.jwt_token = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        if details and not success:
            print(f"   Details: {str(details)[:200]}...")
    
    def test_authentication_system(self):
        """Test complete authentication system"""
        print("\n=== 1. AUTHENTICATION SYSTEM ===")
        
        # Test 1: User registration with new unique email
        new_email = f"newuser_{int(time.time())}@test.com"
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json={
                    "email": new_email,
                    "password": "Test123456",
                    "full_name": "New Test User"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("User Registration (New Email)", True, f"Registration successful: {new_email}")
                else:
                    self.log_test("User Registration (New Email)", False, "Registration failed", data)
            else:
                self.log_test("User Registration (New Email)", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("User Registration (New Email)", False, f"Exception: {str(e)}")
        
        # Test 2: Login with existing credentials
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=EXISTING_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    self.jwt_token = data.get("token")
                    self.log_test("Login (Existing User)", True, f"Login successful, user_id: {self.user_id}")
                else:
                    self.log_test("Login (Existing User)", False, "Login failed", data)
            else:
                self.log_test("Login (Existing User)", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Login (Existing User)", False, f"Exception: {str(e)}")
        
        # Test 3: JWT token validation
        if self.jwt_token:
            token_parts = self.jwt_token.split('.')
            if len(token_parts) == 3:
                self.log_test("JWT Token Validation", True, "JWT token has valid structure")
            else:
                self.log_test("JWT Token Validation", False, f"Invalid JWT structure: {len(token_parts)} parts")
        else:
            self.log_test("JWT Token Validation", False, "No JWT token received")
        
        # Test 4: Invalid credentials rejection
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"email": "invalid@test.com", "password": "wrongpassword"},
                timeout=10
            )
            
            if response.status_code in [400, 401]:
                self.log_test("Invalid Credentials Rejection", True, f"Invalid credentials rejected (status {response.status_code})")
            else:
                self.log_test("Invalid Credentials Rejection", False, f"Invalid credentials not rejected (status {response.status_code})")
        except Exception as e:
            self.log_test("Invalid Credentials Rejection", False, f"Exception: {str(e)}")
    
    def test_p2p_trading_system(self):
        """Test P2P trading system"""
        print("\n=== 2. P2P TRADING SYSTEM ===")
        
        # Test 1: Fetch P2P offers
        try:
            response = self.session.get(f"{BASE_URL}/p2p/offers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    offers = data["offers"]
                    if len(offers) >= 1:
                        self.log_test("P2P Offers Fetch", True, f"{len(offers)} offers found")
                    else:
                        self.log_test("P2P Offers Fetch", False, "No offers found (expected at least 1)")
                else:
                    self.log_test("P2P Offers Fetch", False, "Invalid response format", data)
            else:
                self.log_test("P2P Offers Fetch", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("P2P Offers Fetch", False, f"Exception: {str(e)}")
        
        # Test 2: P2P marketplace filters
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/offers",
                params={"crypto_currency": "BTC", "fiat_currency": "GBP"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    self.log_test("P2P Marketplace Filters", True, f"Filters working - {len(data['offers'])} BTC/GBP offers")
                else:
                    self.log_test("P2P Marketplace Filters", False, "Invalid response format", data)
            else:
                self.log_test("P2P Marketplace Filters", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("P2P Marketplace Filters", False, f"Exception: {str(e)}")
        
        # Test 3: Available coins endpoint
        try:
            response = self.session.get(f"{BASE_URL}/p2p/marketplace/available-coins", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    self.log_test("P2P Available Coins", True, f"{len(data['coins'])} coins available")
                else:
                    self.log_test("P2P Available Coins", False, "Invalid response format", data)
            else:
                self.log_test("P2P Available Coins", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("P2P Available Coins", False, f"Exception: {str(e)}")
        
        # Test 4: Public seller profile (test with a sample seller ID)
        try:
            response = self.session.get(f"{BASE_URL}/p2p/seller/test_seller", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Public Seller Profile", True, "Seller profile endpoint working")
                else:
                    self.log_test("Public Seller Profile", False, "Invalid response", data)
            elif response.status_code == 404:
                # 404 is acceptable for non-existent seller
                self.log_test("Public Seller Profile", True, "Seller profile endpoint working (404 for non-existent seller)")
            else:
                self.log_test("Public Seller Profile", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Public Seller Profile", False, f"Exception: {str(e)}")
    
    def test_crypto_bank_apis(self):
        """Test crypto bank APIs"""
        print("\n=== 3. CRYPTO BANK APIS ===")
        
        if not self.user_id:
            self.log_test("Crypto Bank APIs", False, "No user ID available for testing")
            return
        
        # Test 1: Balance retrieval
        try:
            response = self.session.get(f"{BASE_URL}/crypto-bank/balances/{self.user_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    self.log_test("Balance Retrieval", True, f"{len(data['balances'])} currency balances retrieved")
                else:
                    self.log_test("Balance Retrieval", False, "Invalid response format", data)
            else:
                self.log_test("Balance Retrieval", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Balance Retrieval", False, f"Exception: {str(e)}")
        
        # Test 2: Deposit operation
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={"user_id": self.user_id, "currency": "BTC", "amount": 0.001},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Deposit Operation", True, "Deposit successful")
                else:
                    self.log_test("Deposit Operation", False, "Deposit failed", data)
            else:
                self.log_test("Deposit Operation", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Deposit Operation", False, f"Exception: {str(e)}")
        
        # Test 3: Withdrawal operation
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.0001,
                    "wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Withdrawal Operation", True, "Withdrawal successful")
                else:
                    self.log_test("Withdrawal Operation", False, "Withdrawal failed", data)
            else:
                self.log_test("Withdrawal Operation", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Withdrawal Operation", False, f"Exception: {str(e)}")
        
        # Test 4: Transaction history
        try:
            response = self.session.get(f"{BASE_URL}/crypto-bank/transactions/{self.user_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    self.log_test("Transaction History", True, f"{len(data['transactions'])} transactions retrieved")
                else:
                    self.log_test("Transaction History", False, "Invalid response format", data)
            else:
                self.log_test("Transaction History", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Transaction History", False, f"Exception: {str(e)}")
    
    def test_platform_features(self):
        """Test platform features"""
        print("\n=== 4. PLATFORM FEATURES ===")
        
        # Test 1: Platform stats endpoint
        try:
            response = self.session.get(f"{BASE_URL}/platform/stats", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Platform Stats", True, "Platform stats retrieved")
                else:
                    self.log_test("Platform Stats", False, "Invalid response", data)
            else:
                self.log_test("Platform Stats", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Platform Stats", False, f"Exception: {str(e)}")
        
        # Test 2: Price alerts creation
        if self.user_id:
            try:
                response = self.session.post(
                    f"{BASE_URL}/price-alerts/create",
                    json={
                        "user_id": self.user_id,
                        "coin": "BTC",
                        "target_price": 50000.0,
                        "condition": "above",
                        "enabled": True
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test("Price Alerts Creation", True, "Price alert created")
                    else:
                        self.log_test("Price Alerts Creation", False, "Price alert creation failed", data)
                else:
                    self.log_test("Price Alerts Creation", False, f"Status {response.status_code}", response.text[:200])
            except Exception as e:
                self.log_test("Price Alerts Creation", False, f"Exception: {str(e)}")
        else:
            self.log_test("Price Alerts Creation", False, "No user ID available")
        
        # Test 3: Price alerts retrieval
        if self.user_id:
            try:
                response = self.session.get(f"{BASE_URL}/price-alerts/user/{self.user_id}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "alerts" in data:
                        self.log_test("Price Alerts Retrieval", True, f"{len(data['alerts'])} alerts retrieved")
                    else:
                        self.log_test("Price Alerts Retrieval", False, "Invalid response format", data)
                else:
                    self.log_test("Price Alerts Retrieval", False, f"Status {response.status_code}", response.text[:200])
            except Exception as e:
                self.log_test("Price Alerts Retrieval", False, f"Exception: {str(e)}")
        else:
            self.log_test("Price Alerts Retrieval", False, "No user ID available")
        
        # Test 4: AI chat session creation
        if self.user_id:
            try:
                response = self.session.post(
                    f"{BASE_URL}/ai-chat/create-session",
                    json={
                        "user_id": self.user_id,
                        "initial_message": "Hello, I need help with P2P trading"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test("AI Chat Session Creation", True, "AI chat session created")
                    else:
                        self.log_test("AI Chat Session Creation", False, "AI chat session creation failed", data)
                else:
                    self.log_test("AI Chat Session Creation", False, f"Status {response.status_code}", response.text[:200])
            except Exception as e:
                self.log_test("AI Chat Session Creation", False, f"Exception: {str(e)}")
        else:
            self.log_test("AI Chat Session Creation", False, "No user ID available")
    
    def test_admin_features(self):
        """Test admin features"""
        print("\n=== 5. ADMIN FEATURES ===")
        
        # Test 1: Platform wallet balance
        try:
            response = self.session.get(f"{BASE_URL}/admin/platform-wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    self.log_test("Platform Wallet Balance", True, f"Platform wallet balance retrieved")
                else:
                    self.log_test("Platform Wallet Balance", False, "Invalid response format", data)
            else:
                self.log_test("Platform Wallet Balance", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Platform Wallet Balance", False, f"Exception: {str(e)}")
        
        # Test 2: Revenue endpoints
        try:
            response = self.session.get(f"{BASE_URL}/admin/revenue/summary", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Revenue Endpoints", True, "Revenue summary retrieved")
                else:
                    self.log_test("Revenue Endpoints", False, "Invalid response", data)
            else:
                self.log_test("Revenue Endpoints", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("Revenue Endpoints", False, f"Exception: {str(e)}")
        
        # Test 3: CMS coins management
        try:
            response = self.session.get(f"{BASE_URL}/admin/cms/coins", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    self.log_test("CMS Coins Management", True, f"{len(data['coins'])} coins managed")
                else:
                    self.log_test("CMS Coins Management", False, "Invalid response format", data)
            else:
                self.log_test("CMS Coins Management", False, f"Status {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("CMS Coins Management", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all focused backend tests"""
        print("🚀 STARTING FOCUSED BACKEND TESTING FOR 100% STATUS VERIFICATION")
        print("=" * 80)
        
        self.test_authentication_system()
        self.test_p2p_trading_system()
        self.test_crypto_bank_apis()
        self.test_platform_features()
        self.test_admin_features()
        
        # Calculate and display results
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print("\n" + "=" * 80)
        print("🎯 FOCUSED BACKEND TESTING RESULTS")
        print("=" * 80)
        print(f"✅ PASSED: {self.passed_tests}")
        print(f"❌ FAILED: {self.total_tests - self.passed_tests}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        print(f"🎯 TARGET: 100% (All critical backend functionality)")
        
        if success_rate == 100.0:
            print("\n🎉 PERFECT SCORE! All backend systems are 100% operational!")
        elif success_rate >= 95.0:
            print(f"\n✅ EXCELLENT! Backend is {success_rate:.1f}% operational - nearly perfect!")
        elif success_rate >= 90.0:
            print(f"\n👍 GOOD! Backend is {success_rate:.1f}% operational - minor issues detected")
        else:
            print(f"\n⚠️  ATTENTION NEEDED! Backend is only {success_rate:.1f}% operational")
        
        print("=" * 80)
        
        return success_rate

def main():
    """Main function to run focused backend testing"""
    tester = FocusedReviewTester()
    success_rate = tester.run_all_tests()
    
    return success_rate

if __name__ == "__main__":
    main()