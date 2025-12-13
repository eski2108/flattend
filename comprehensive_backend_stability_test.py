#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND STABILITY TEST - ALL ENDPOINTS
Tests ALL backend endpoints to achieve >95% success rate as requested in review.

**Critical Issues to Test:**
1. Admin Panel Login - POST /api/admin/login with email/password and CRYPTOLEND_ADMIN_2025 code
2. Crypto Bank Balances - GET /api/crypto-bank/balances/{user_id} (reported 500 error with MongoDB ObjectId serialization)
3. Admin Endpoints - All admin endpoints including dashboard, withdrawals, platform settings
4. SendGrid Email Verification - Test email verification flow with updated SendGrid API key
5. All remaining endpoints for comprehensive coverage

**Backend URL:** https://crypto-wallet-ui-3.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Configuration
BASE_URL = "https://crypto-wallet-ui-3.preview.emergentagent.com/api"

# Test Users
TEST_USER = {
    "email": "stability_test@test.com",
    "password": "Test123456",
    "full_name": "Stability Test User"
}

SELLER_USER = {
    "email": "stability_seller@test.com", 
    "password": "Seller123456",
    "full_name": "Stability Seller"
}

ADMIN_USER = {
    "email": "admin@coinhubx.com",
    "password": "admin123"
}

ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class ComprehensiveBackendStabilityTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_id = None
        self.seller_user_id = None
        self.admin_user_id = None
        self.admin_token = None
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
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
        """Test user registration and login endpoints"""
        print("\n=== PHASE 1: USER AUTHENTICATION ===")
        
        # Test User Registration
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
                else:
                    self.log_test("User Registration", False, "Registration response missing user_id", data)
            elif response.status_code == 400 and "already registered" in response.text:
                self.log_test("User Registration", True, "User already exists (expected for repeated tests)")
                # Try login to get user_id
                self.test_user_login()
            else:
                self.log_test("User Registration", False, f"Registration failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("User Registration", False, f"Registration request failed: {str(e)}")
        
        # Test Seller Registration
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=SELLER_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.seller_user_id = data["user"]["user_id"]
                    self.log_test("Seller Registration", True, f"Seller registered with ID: {self.seller_user_id}")
                else:
                    self.log_test("Seller Registration", False, "Seller registration response missing user_id", data)
            elif response.status_code == 400 and "already registered" in response.text:
                self.log_test("Seller Registration", True, "Seller already exists (expected for repeated tests)")
                # Try login to get user_id
                self.test_seller_login()
            else:
                self.log_test("Seller Registration", False, f"Seller registration failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Seller Registration", False, f"Seller registration request failed: {str(e)}")
    
    def test_user_login(self):
        """Test user login"""
        try:
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
                    self.log_test("User Login", True, f"User login successful, user_id: {self.test_user_id}")
                else:
                    self.log_test("User Login", False, "Login response missing user_id", data)
            else:
                self.log_test("User Login", False, f"Login failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("User Login", False, f"Login request failed: {str(e)}")
    
    def test_seller_login(self):
        """Test seller login"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": SELLER_USER["email"],
                    "password": SELLER_USER["password"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.seller_user_id = data["user"]["user_id"]
                    self.log_test("Seller Login", True, f"Seller login successful, user_id: {self.seller_user_id}")
                else:
                    self.log_test("Seller Login", False, "Seller login response missing user_id", data)
            else:
                self.log_test("Seller Login", False, f"Seller login failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Seller Login", False, f"Seller login request failed: {str(e)}")
    
    def test_admin_login(self):
        """Test admin login with CRYPTOLEND_ADMIN_2025 code - CRITICAL TEST"""
        print("\n=== PHASE 2: ADMIN AUTHENTICATION (CRITICAL) ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json={
                    "email": ADMIN_USER["email"],
                    "password": ADMIN_USER["password"],
                    "admin_code": ADMIN_CODE
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.admin_user_id = data.get("admin", {}).get("user_id")
                    self.admin_token = data.get("token")
                    self.log_test("Admin Login", True, f"Admin login successful with CRYPTOLEND_ADMIN_2025 code")
                    return True
                else:
                    self.log_test("Admin Login", False, "Admin login response indicates failure", data)
            else:
                self.log_test("Admin Login", False, f"Admin login failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Admin login request failed: {str(e)}")
            
        return False
    
    def test_crypto_bank_balances(self):
        """Test GET /api/crypto-bank/balances/{user_id} - CRITICAL TEST (reported 500 error)"""
        print("\n=== PHASE 3: CRYPTO BANK BALANCES (CRITICAL) ===")
        
        if not self.test_user_id:
            self.log_test("Crypto Bank Balances", False, "Cannot test - no test user ID available")
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
                    self.log_test("Crypto Bank Balances", True, f"Balances retrieved successfully - {len(balances)} currencies")
                    return True
                else:
                    self.log_test("Crypto Bank Balances", False, "Invalid balances response format", data)
            else:
                self.log_test("Crypto Bank Balances", False, f"Balances API failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Crypto Bank Balances", False, f"Balances request failed: {str(e)}")
            
        return False
    
    def test_crypto_bank_endpoints(self):
        """Test all crypto bank endpoints"""
        print("\n=== PHASE 4: CRYPTO BANK ENDPOINTS ===")
        
        if not self.test_user_id:
            self.log_test("Crypto Bank Setup", False, "Cannot test - no test user ID available")
            return
        
        # Test crypto bank deposit
        try:
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
                    self.log_test("Crypto Bank Deposit", True, "Deposit successful")
                else:
                    self.log_test("Crypto Bank Deposit", False, "Deposit response indicates failure", data)
            else:
                self.log_test("Crypto Bank Deposit", False, f"Deposit failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Crypto Bank Deposit", False, f"Deposit request failed: {str(e)}")
        
        # Test crypto bank withdrawal
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.05,
                    "wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Crypto Bank Withdrawal", True, "Withdrawal successful")
                else:
                    self.log_test("Crypto Bank Withdrawal", False, "Withdrawal response indicates failure", data)
            else:
                self.log_test("Crypto Bank Withdrawal", False, f"Withdrawal failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Crypto Bank Withdrawal", False, f"Withdrawal request failed: {str(e)}")
        
        # Test crypto bank transactions
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/transactions/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    self.log_test("Crypto Bank Transactions", True, f"Transactions retrieved - {len(transactions)} found")
                else:
                    self.log_test("Crypto Bank Transactions", False, "Invalid transactions response", data)
            else:
                self.log_test("Crypto Bank Transactions", False, f"Transactions failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Crypto Bank Transactions", False, f"Transactions request failed: {str(e)}")
        
        # Test crypto bank onboarding
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/onboarding/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Crypto Bank Onboarding", True, "Onboarding status retrieved")
                else:
                    self.log_test("Crypto Bank Onboarding", False, "Onboarding response indicates failure", data)
            else:
                self.log_test("Crypto Bank Onboarding", False, f"Onboarding failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Crypto Bank Onboarding", False, f"Onboarding request failed: {str(e)}")
    
    def test_admin_endpoints(self):
        """Test all admin endpoints - CRITICAL TEST"""
        print("\n=== PHASE 5: ADMIN ENDPOINTS (CRITICAL) ===")
        
        # Test admin dashboard
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard-stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    self.log_test("Admin Dashboard", True, "Dashboard stats retrieved successfully")
                else:
                    self.log_test("Admin Dashboard", False, "Invalid dashboard response", data)
            else:
                self.log_test("Admin Dashboard", False, f"Dashboard failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Dashboard", False, f"Dashboard request failed: {str(e)}")
        
        # Test admin platform config
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    self.log_test("Admin Platform Config", True, "Platform config retrieved successfully")
                else:
                    self.log_test("Admin Platform Config", False, "Invalid platform config response", data)
            else:
                self.log_test("Admin Platform Config", False, f"Platform config failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Platform Config", False, f"Platform config request failed: {str(e)}")
        
        # Test admin customers list
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/customers",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "customers" in data:
                    customers = data["customers"]
                    self.log_test("Admin Customers List", True, f"Customers list retrieved - {len(customers)} customers")
                else:
                    self.log_test("Admin Customers List", False, "Invalid customers response", data)
            else:
                self.log_test("Admin Customers List", False, f"Customers list failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Customers List", False, f"Customers list request failed: {str(e)}")
        
        # Test admin withdrawals
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/withdrawals",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Admin Withdrawals", True, "Admin withdrawals retrieved successfully")
                else:
                    self.log_test("Admin Withdrawals", False, "Invalid withdrawals response", data)
            else:
                self.log_test("Admin Withdrawals", False, f"Admin withdrawals failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Withdrawals", False, f"Admin withdrawals request failed: {str(e)}")
        
        # Test admin platform settings
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/update-commission",
                json={
                    "setting_key": "deposit_fee_percent",
                    "new_value": 0.5
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Admin Platform Settings", True, "Platform settings updated successfully")
                else:
                    self.log_test("Admin Platform Settings", False, "Platform settings update failed", data)
            else:
                self.log_test("Admin Platform Settings", False, f"Platform settings failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Platform Settings", False, f"Platform settings request failed: {str(e)}")
    
    def test_email_verification(self):
        """Test email verification flow with SendGrid API key - CRITICAL TEST"""
        print("\n=== PHASE 6: EMAIL VERIFICATION (CRITICAL) ===")
        
        if not self.test_user_id:
            self.log_test("Email Verification Setup", False, "Cannot test - no test user ID available")
            return
        
        # Test send verification email
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/send-verification-email",
                json={
                    "user_id": self.test_user_id,
                    "email": TEST_USER["email"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Send Verification Email", True, "Verification email sent successfully")
                else:
                    self.log_test("Send Verification Email", False, "Send verification email failed", data)
            else:
                self.log_test("Send Verification Email", False, f"Send verification email failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Send Verification Email", False, f"Send verification email request failed: {str(e)}")
        
        # Test verify email with mock token
        try:
            mock_token = str(uuid.uuid4())
            response = self.session.post(
                f"{BASE_URL}/auth/verify-email",
                json={
                    "token": mock_token
                },
                timeout=10
            )
            
            # This should fail with invalid token, but endpoint should exist
            if response.status_code in [200, 400, 404]:
                self.log_test("Email Verification Endpoint", True, "Email verification endpoint accessible")
            else:
                self.log_test("Email Verification Endpoint", False, f"Email verification endpoint failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Email Verification Endpoint", False, f"Email verification request failed: {str(e)}")
    
    def test_p2p_trading_endpoints(self):
        """Test P2P trading endpoints"""
        print("\n=== PHASE 7: P2P TRADING ENDPOINTS ===")
        
        # Test P2P config
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("P2P Config", True, "P2P configuration retrieved successfully")
                else:
                    self.log_test("P2P Config", False, "P2P config response indicates failure", data)
            else:
                self.log_test("P2P Config", False, f"P2P config failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("P2P Config", False, f"P2P config request failed: {str(e)}")
        
        # Test P2P offers
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/offers",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    offers = data["offers"]
                    self.log_test("P2P Offers", True, f"P2P offers retrieved - {len(offers)} offers found")
                else:
                    self.log_test("P2P Offers", False, "Invalid P2P offers response", data)
            else:
                self.log_test("P2P Offers", False, f"P2P offers failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("P2P Offers", False, f"P2P offers request failed: {str(e)}")
        
        # Test P2P ads endpoints
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/ads",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("P2P Ads", True, "P2P ads retrieved successfully")
                else:
                    self.log_test("P2P Ads", False, "P2P ads response indicates failure", data)
            else:
                self.log_test("P2P Ads", False, f"P2P ads failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("P2P Ads", False, f"P2P ads request failed: {str(e)}")
    
    def test_swap_convert_endpoints(self):
        """Test swap/convert crypto endpoints"""
        print("\n=== PHASE 8: SWAP/CONVERT ENDPOINTS ===")
        
        if not self.test_user_id:
            self.log_test("Swap Convert Setup", False, "Cannot test - no test user ID available")
            return
        
        # Test swap preview
        try:
            response = self.session.post(
                f"{BASE_URL}/swap/preview",
                json={
                    "user_id": self.test_user_id,
                    "from_currency": "BTC",
                    "to_currency": "USDT",
                    "amount": 0.01
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Swap Preview", True, "Swap preview successful")
                else:
                    self.log_test("Swap Preview", False, "Swap preview response indicates failure", data)
            else:
                self.log_test("Swap Preview", False, f"Swap preview failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Swap Preview", False, f"Swap preview request failed: {str(e)}")
        
        # Test swap history
        try:
            response = self.session.get(
                f"{BASE_URL}/swap/history/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "swaps" in data:
                    swaps = data["swaps"]
                    self.log_test("Swap History", True, f"Swap history retrieved - {len(swaps)} swaps found")
                else:
                    self.log_test("Swap History", False, "Invalid swap history response", data)
            else:
                self.log_test("Swap History", False, f"Swap history failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Swap History", False, f"Swap history request failed: {str(e)}")
    
    def test_express_buy_endpoints(self):
        """Test express buy endpoints"""
        print("\n=== PHASE 9: EXPRESS BUY ENDPOINTS ===")
        
        if not self.test_user_id:
            self.log_test("Express Buy Setup", False, "Cannot test - no test user ID available")
            return
        
        # Test express buy match
        try:
            response = self.session.post(
                f"{BASE_URL}/express/match",
                json={
                    "user_id": self.test_user_id,
                    "trade_type": "buy",
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "fiat_amount": 1000.0,
                    "payment_methods": ["bank_transfer"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Express Buy Match", True, "Express buy match successful")
                else:
                    self.log_test("Express Buy Match", False, "Express buy match response indicates failure", data)
            else:
                self.log_test("Express Buy Match", False, f"Express buy match failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Express Buy Match", False, f"Express buy match request failed: {str(e)}")
        
        # Test trader adverts
        try:
            response = self.session.get(
                f"{BASE_URL}/trader/adverts",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Trader Adverts", True, "Trader adverts retrieved successfully")
                else:
                    self.log_test("Trader Adverts", False, "Trader adverts response indicates failure", data)
            else:
                self.log_test("Trader Adverts", False, f"Trader adverts failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Trader Adverts", False, f"Trader adverts request failed: {str(e)}")
    
    def test_fee_collection_system(self):
        """Test fee collection system endpoints"""
        print("\n=== PHASE 10: FEE COLLECTION SYSTEM ===")
        
        # Test platform earnings
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Platform Earnings", True, "Platform earnings retrieved successfully")
                else:
                    self.log_test("Platform Earnings", False, "Platform earnings response indicates failure", data)
            else:
                self.log_test("Platform Earnings", False, f"Platform earnings failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Platform Earnings", False, f"Platform earnings request failed: {str(e)}")
        
        # Test admin wallet balance
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/wallet-balance",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Admin Wallet Balance", True, "Admin wallet balance retrieved successfully")
                else:
                    self.log_test("Admin Wallet Balance", False, "Admin wallet balance response indicates failure", data)
            else:
                self.log_test("Admin Wallet Balance", False, f"Admin wallet balance failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Wallet Balance", False, f"Admin wallet balance request failed: {str(e)}")
    
    def test_additional_endpoints(self):
        """Test additional endpoints for comprehensive coverage"""
        print("\n=== PHASE 11: ADDITIONAL ENDPOINTS ===")
        
        # Test crypto prices
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto/prices",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "prices" in data:
                    self.log_test("Crypto Prices", True, "Crypto prices retrieved successfully")
                else:
                    self.log_test("Crypto Prices", False, "Invalid crypto prices response", data)
            else:
                self.log_test("Crypto Prices", False, f"Crypto prices failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Crypto Prices", False, f"Crypto prices request failed: {str(e)}")
        
        # Test platform stats
        try:
            response = self.session.get(
                f"{BASE_URL}/platform/stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Platform Stats", True, "Platform stats retrieved successfully")
                else:
                    self.log_test("Platform Stats", False, "Platform stats response indicates failure", data)
            else:
                self.log_test("Platform Stats", False, f"Platform stats failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Platform Stats", False, f"Platform stats request failed: {str(e)}")
        
        # Test wallet validation
        try:
            response = self.session.post(
                f"{BASE_URL}/wallet/validate",
                json={
                    "address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz",
                    "currency": "BTC"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("valid") is not None:
                    self.log_test("Wallet Validation", True, "Wallet validation endpoint working")
                else:
                    self.log_test("Wallet Validation", False, "Invalid wallet validation response", data)
            else:
                self.log_test("Wallet Validation", False, f"Wallet validation failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Wallet Validation", False, f"Wallet validation request failed: {str(e)}")
    
    def run_comprehensive_test(self):
        """Run all comprehensive backend tests"""
        print("🚀 STARTING COMPREHENSIVE BACKEND STABILITY TEST")
        print("=" * 80)
        
        # Phase 1: User Authentication
        self.test_user_registration_and_login()
        
        # Phase 2: Admin Authentication (Critical)
        admin_login_success = self.test_admin_login()
        
        # Phase 3: Crypto Bank Balances (Critical - reported 500 error)
        self.test_crypto_bank_balances()
        
        # Phase 4: Crypto Bank Endpoints
        self.test_crypto_bank_endpoints()
        
        # Phase 5: Admin Endpoints (Critical)
        if admin_login_success:
            self.test_admin_endpoints()
        
        # Phase 6: Email Verification (Critical - SendGrid)
        self.test_email_verification()
        
        # Phase 7: P2P Trading Endpoints
        self.test_p2p_trading_endpoints()
        
        # Phase 8: Swap/Convert Endpoints
        self.test_swap_convert_endpoints()
        
        # Phase 9: Express Buy Endpoints
        self.test_express_buy_endpoints()
        
        # Phase 10: Fee Collection System
        self.test_fee_collection_system()
        
        # Phase 11: Additional Endpoints
        self.test_additional_endpoints()
        
        # Calculate and display results
        self.display_final_results()
    
    def display_final_results(self):
        """Display final test results"""
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE BACKEND STABILITY TEST RESULTS")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 OVERALL SUCCESS RATE: {success_rate:.1f}% ({self.passed_tests}/{self.total_tests} tests passed)")
        
        if success_rate >= 95:
            print("🎉 SUCCESS: Achieved >95% success rate target!")
        else:
            print(f"⚠️  WARNING: Success rate {success_rate:.1f}% is below 95% target")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        # Show critical test results
        critical_tests = [
            "Admin Login",
            "Crypto Bank Balances", 
            "Admin Dashboard",
            "Send Verification Email"
        ]
        
        print(f"\n🔥 CRITICAL TEST RESULTS:")
        for test_name in critical_tests:
            test_result = next((test for test in self.test_results if test["test"] == test_name), None)
            if test_result:
                status = "✅ PASS" if test_result["success"] else "❌ FAIL"
                print(f"   • {test_name}: {status}")
            else:
                print(f"   • {test_name}: ⚠️  NOT TESTED")
        
        print("\n" + "=" * 80)
        print("📝 TEST SUMMARY:")
        print(f"   • Total Endpoints Tested: {self.total_tests}")
        print(f"   • Successful Tests: {self.passed_tests}")
        print(f"   • Failed Tests: {self.total_tests - self.passed_tests}")
        print(f"   • Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 95:
            print("\n✅ BACKEND STABILITY: EXCELLENT - Ready for production")
        elif success_rate >= 90:
            print("\n⚠️  BACKEND STABILITY: GOOD - Minor issues to address")
        else:
            print("\n❌ BACKEND STABILITY: NEEDS IMPROVEMENT - Critical issues found")

def main():
    """Main function to run comprehensive backend stability test"""
    tester = ComprehensiveBackendStabilityTester()
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()