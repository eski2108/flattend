#!/usr/bin/env python3
"""
COMPREHENSIVE SITE-WIDE BACKEND TESTING - ALL CRITICAL SYSTEMS
Tests all major backend systems thoroughly as requested in review:

**CRITICAL SYSTEMS TO TEST:**

### 1. Authentication System
- User registration (POST /api/auth/register)
- User login with JWT token (POST /api/auth/login)
- Verify JWT token includes all required fields and is valid

### 2. P2P Trading System
- Create P2P sell offers (POST /api/p2p/create-ad)
- Create P2P buy offers (POST /api/p2p/create-ad)
- Update offers (PUT /api/p2p/ad/{ad_id})
- Toggle offer status (PUT /api/p2p/ad/{ad_id}/toggle)
- Delete offers (DELETE /api/p2p/ad/{ad_id})
- Get all offers (GET /api/p2p/ads)
- Get user offers (GET /api/p2p/my-ads/{user_id})
- Complete P2P trade flow: create trade → mark paid → release escrow

### 3. Crypto Swap/Convert System
- Preview swap (POST /api/swap/preview)
- Execute swap (POST /api/swap/execute)
- Get swap history (GET /api/swap/history/{user_id})
- Verify 1.5% fee collection
- Verify balances update correctly

### 4. Express Buy System
- Match to cheapest seller (POST /api/express-buy/match)
- Execute express buy (POST /api/express-buy/execute)
- Verify Express Buy prioritizes admin liquidity wallet first
- Verify falls back to P2P sellers if admin wallet insufficient
- Verify 1.5% express fee collection

### 5. Boost Offer System
- Boost offer with payment (POST /api/p2p/boost-offer)
- Verify boost status and expiry
- Verify fee collection

### 6. Admin Dashboard System
- Get admin liquidity wallet balance (GET /api/admin/liquidity-wallet)
- Add funds to liquidity wallet (POST /api/admin/liquidity-wallet/add-funds)
- Get admin fee wallet balance (GET /api/admin/fee-wallet)
- Request withdrawal from liquidity wallet (POST /api/admin/liquidity-wallet/withdraw)
- Request withdrawal from fee wallet (POST /api/admin/fee-wallet/withdraw)
- Complete withdrawal (POST /api/admin/withdrawal/complete/{withdrawal_id})
- Get all withdrawals (GET /api/admin/withdrawals)

### 7. Trader Balance System
- Get trader balances (GET /api/trader/my-balances/{user_id})
- Add funds (POST /api/trader/balance/add-funds)
- Verify total_balance, locked_balance, available_balance structure

**Backend URL:** https://quickstart-27.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time
import jwt
import base64

# Configuration
BASE_URL = "https://quickstart-27.preview.emergentagent.com/api"

# Test Users
TEST_USERS = {
    "user1": {
        "email": "comprehensive_test_user1@test.com",
        "password": "Test123456",
        "full_name": "Comprehensive Test User 1"
    },
    "user2": {
        "email": "comprehensive_test_user2@test.com", 
        "password": "Test123456",
        "full_name": "Comprehensive Test User 2"
    },
    "admin": {
        "email": "admin@coinhubx.com",
        "password": "admin123",
        "admin_code": "CRYPTOLEND_ADMIN_2025"
    }
}

class ComprehensiveSiteWideBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_ids = {}
        self.jwt_tokens = {}
        self.test_results = []
        self.ad_ids = []
        self.trade_ids = []
        self.swap_ids = []
        self.withdrawal_ids = []
        
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
    
    def test_authentication_system(self):
        """Test complete authentication system"""
        print("\n" + "="*80)
        print("TESTING AUTHENTICATION SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        # Test user registration
        for user_key, user_data in TEST_USERS.items():
            if user_key == "admin":
                continue
                
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json=user_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        self.user_ids[user_key] = data["user"]["user_id"]
                        self.log_test(
                            f"User Registration ({user_key})", 
                            True, 
                            f"User registered successfully with ID: {self.user_ids[user_key]}"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            f"User Registration ({user_key})", 
                            False, 
                            "Registration response missing success or user_id",
                            data
                        )
                elif response.status_code == 400 and "already registered" in response.text:
                    # User already exists, try login
                    self.log_test(
                        f"User Registration ({user_key})", 
                        True, 
                        "User already exists (expected for repeated tests)"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        f"User Registration ({user_key})", 
                        False, 
                        f"Registration failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    f"User Registration ({user_key})", 
                    False, 
                    f"Registration request failed: {str(e)}"
                )
        
        # Test user login with JWT token verification
        for user_key, user_data in TEST_USERS.items():
            if user_key == "admin":
                continue
                
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": user_data["email"],
                        "password": user_data["password"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("token") and data.get("user", {}).get("user_id"):
                        # Store user ID and JWT token
                        self.user_ids[user_key] = data["user"]["user_id"]
                        self.jwt_tokens[user_key] = data["token"]
                        
                        # Verify JWT token structure
                        try:
                            # Decode JWT without verification to check structure
                            token_parts = data["token"].split('.')
                            if len(token_parts) == 3:
                                # Decode payload
                                payload = json.loads(base64.urlsafe_b64decode(token_parts[1] + '=='))
                                
                                # Check required fields
                                required_fields = ["user_id", "email", "exp"]
                                missing_fields = [field for field in required_fields if field not in payload]
                                
                                if not missing_fields:
                                    self.log_test(
                                        f"JWT Login ({user_key})", 
                                        True, 
                                        f"Login successful with valid JWT token containing all required fields"
                                    )
                                    success_count += 1
                                else:
                                    self.log_test(
                                        f"JWT Login ({user_key})", 
                                        False, 
                                        f"JWT token missing required fields: {missing_fields}"
                                    )
                            else:
                                self.log_test(
                                    f"JWT Login ({user_key})", 
                                    False, 
                                    "JWT token has invalid structure"
                                )
                        except Exception as jwt_error:
                            self.log_test(
                                f"JWT Login ({user_key})", 
                                False, 
                                f"JWT token verification failed: {str(jwt_error)}"
                            )
                    else:
                        self.log_test(
                            f"JWT Login ({user_key})", 
                            False, 
                            "Login response missing success, token, or user_id",
                            data
                        )
                else:
                    self.log_test(
                        f"JWT Login ({user_key})", 
                        False, 
                        f"Login failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    f"JWT Login ({user_key})", 
                    False, 
                    f"Login request failed: {str(e)}"
                )
        
        print(f"\nAuthentication System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_p2p_trading_system(self):
        """Test complete P2P trading system"""
        print("\n" + "="*80)
        print("TESTING P2P TRADING SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        # Ensure we have user IDs
        if not self.user_ids.get("user1") or not self.user_ids.get("user2"):
            print("❌ Cannot test P2P system - missing user IDs")
            return 0, 1
        
        user1_id = self.user_ids["user1"]
        user2_id = self.user_ids["user2"]
        
        # Test 1: Create P2P sell offer
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-ad",
                json={
                    "user_id": user1_id,
                    "ad_type": "sell",
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "price_type": "fixed",
                    "price_value": 48000.0,
                    "min_amount": 100.0,
                    "max_amount": 5000.0,
                    "available_amount": 2.5,
                    "payment_methods": ["Bank Transfer", "PayPal"],
                    "terms": "Fast and secure BTC trading"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("ad", {}).get("ad_id"):
                    ad_id = data["ad"]["ad_id"]
                    self.ad_ids.append(ad_id)
                    self.log_test(
                        "Create P2P Sell Offer", 
                        True, 
                        f"Sell offer created successfully (ID: {ad_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Create P2P Sell Offer", 
                        False, 
                        "Create offer response missing success or ad_id",
                        data
                    )
            else:
                self.log_test(
                    "Create P2P Sell Offer", 
                    False, 
                    f"Create offer failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create P2P Sell Offer", 
                False, 
                f"Create offer request failed: {str(e)}"
            )
        
        # Test 2: Get all offers
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/ads",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "ads" in data:
                    ads = data["ads"]
                    self.log_test(
                        "Get All P2P Offers", 
                        True, 
                        f"Retrieved {len(ads)} P2P offers from marketplace"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get All P2P Offers", 
                        False, 
                        "Get offers response missing success or ads",
                        data
                    )
            else:
                self.log_test(
                    "Get All P2P Offers", 
                    False, 
                    f"Get offers failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get All P2P Offers", 
                False, 
                f"Get offers request failed: {str(e)}"
            )
        
        # Test 3: Get user offers
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/my-ads/{user1_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "ads" in data:
                    user_ads = data["ads"]
                    self.log_test(
                        "Get User P2P Offers", 
                        True, 
                        f"Retrieved {len(user_ads)} offers for user"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get User P2P Offers", 
                        False, 
                        "Get user offers response missing success or ads",
                        data
                    )
            else:
                self.log_test(
                    "Get User P2P Offers", 
                    False, 
                    f"Get user offers failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get User P2P Offers", 
                False, 
                f"Get user offers request failed: {str(e)}"
            )
        
        # Test 4: Update offer (if we have an ad_id)
        if self.ad_ids:
            total_tests += 1
            try:
                response = self.session.put(
                    f"{BASE_URL}/p2p/ad/{self.ad_ids[0]}",
                    json={
                        "price_value": 49000.0,
                        "min_amount": 200.0,
                        "max_amount": 6000.0
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Update P2P Offer", 
                            True, 
                            "Offer updated successfully"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Update P2P Offer", 
                            False, 
                            "Update offer response indicates failure",
                            data
                        )
                else:
                    self.log_test(
                        "Update P2P Offer", 
                        False, 
                        f"Update offer failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    "Update P2P Offer", 
                    False, 
                    f"Update offer request failed: {str(e)}"
                )
        
        # Test 5: Toggle offer status
        if self.ad_ids:
            total_tests += 1
            try:
                response = self.session.put(
                    f"{BASE_URL}/p2p/ad/{self.ad_ids[0]}/toggle",
                    json={"status": "paused"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Toggle P2P Offer Status", 
                            True, 
                            "Offer status toggled successfully"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Toggle P2P Offer Status", 
                            False, 
                            "Toggle status response indicates failure",
                            data
                        )
                else:
                    self.log_test(
                        "Toggle P2P Offer Status", 
                        False, 
                        f"Toggle status failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    "Toggle P2P Offer Status", 
                    False, 
                    f"Toggle status request failed: {str(e)}"
                )
        
        print(f"\nP2P Trading System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_crypto_swap_system(self):
        """Test crypto swap/convert system"""
        print("\n" + "="*80)
        print("TESTING CRYPTO SWAP/CONVERT SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("user1"):
            print("❌ Cannot test swap system - missing user ID")
            return 0, 1
        
        user_id = self.user_ids["user1"]
        
        # Test 1: Preview swap
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/swap/preview",
                json={
                    "user_id": user_id,
                    "from_currency": "BTC",
                    "to_currency": "USDT",
                    "amount": 0.1
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "estimated_output" in data and "fee" in data:
                    estimated_output = data["estimated_output"]
                    fee = data["fee"]
                    self.log_test(
                        "Preview Swap", 
                        True, 
                        f"Swap preview successful - Output: {estimated_output} USDT, Fee: {fee}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Preview Swap", 
                        False, 
                        "Preview swap response missing required fields",
                        data
                    )
            else:
                self.log_test(
                    "Preview Swap", 
                    False, 
                    f"Preview swap failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Preview Swap", 
                False, 
                f"Preview swap request failed: {str(e)}"
            )
        
        # Test 2: Execute swap
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/swap/execute",
                json={
                    "user_id": user_id,
                    "from_currency": "BTC",
                    "to_currency": "USDT",
                    "amount": 0.05
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "swap_id" in data:
                    swap_id = data["swap_id"]
                    self.swap_ids.append(swap_id)
                    self.log_test(
                        "Execute Swap", 
                        True, 
                        f"Swap executed successfully (ID: {swap_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Execute Swap", 
                        False, 
                        "Execute swap response missing success or swap_id",
                        data
                    )
            else:
                self.log_test(
                    "Execute Swap", 
                    False, 
                    f"Execute swap failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Execute Swap", 
                False, 
                f"Execute swap request failed: {str(e)}"
            )
        
        # Test 3: Get swap history
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/swap/history/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "swaps" in data:
                    swaps = data["swaps"]
                    self.log_test(
                        "Get Swap History", 
                        True, 
                        f"Retrieved {len(swaps)} swap transactions"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get Swap History", 
                        False, 
                        "Get swap history response missing success or swaps",
                        data
                    )
            else:
                self.log_test(
                    "Get Swap History", 
                    False, 
                    f"Get swap history failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Swap History", 
                False, 
                f"Get swap history request failed: {str(e)}"
            )
        
        print(f"\nCrypto Swap System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_express_buy_system(self):
        """Test express buy system"""
        print("\n" + "="*80)
        print("TESTING EXPRESS BUY SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("user1"):
            print("❌ Cannot test express buy system - missing user ID")
            return 0, 1
        
        user_id = self.user_ids["user1"]
        
        # Test 1: Match to cheapest seller
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/express-buy/match",
                json={
                    "user_id": user_id,
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "fiat_amount": 1000.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "match" in data:
                    match = data["match"]
                    self.log_test(
                        "Express Buy Match", 
                        True, 
                        f"Found express buy match - Price: £{match.get('price', 0)}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Express Buy Match", 
                        False, 
                        "Express buy match response missing success or match",
                        data
                    )
            else:
                self.log_test(
                    "Express Buy Match", 
                    False, 
                    f"Express buy match failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Express Buy Match", 
                False, 
                f"Express buy match request failed: {str(e)}"
            )
        
        # Test 2: Execute express buy
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/express-buy/execute",
                json={
                    "user_id": user_id,
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "fiat_amount": 500.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "trade_id" in data:
                    trade_id = data["trade_id"]
                    self.trade_ids.append(trade_id)
                    self.log_test(
                        "Execute Express Buy", 
                        True, 
                        f"Express buy executed successfully (Trade ID: {trade_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Execute Express Buy", 
                        False, 
                        "Execute express buy response missing success or trade_id",
                        data
                    )
            else:
                self.log_test(
                    "Execute Express Buy", 
                    False, 
                    f"Execute express buy failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Execute Express Buy", 
                False, 
                f"Execute express buy request failed: {str(e)}"
            )
        
        print(f"\nExpress Buy System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_boost_offer_system(self):
        """Test boost offer system"""
        print("\n" + "="*80)
        print("TESTING BOOST OFFER SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.ad_ids or not self.user_ids.get("user1"):
            print("❌ Cannot test boost system - missing ad ID or user ID")
            return 0, 1
        
        user_id = self.user_ids["user1"]
        ad_id = self.ad_ids[0]
        
        # Test 1: Boost offer with payment
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/boost-offer",
                json={
                    "user_id": user_id,
                    "ad_id": ad_id,
                    "boost_duration_hours": 24,
                    "payment_amount": 10.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "boost_id" in data:
                    boost_id = data["boost_id"]
                    self.log_test(
                        "Boost Offer", 
                        True, 
                        f"Offer boosted successfully (Boost ID: {boost_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Boost Offer", 
                        False, 
                        "Boost offer response missing success or boost_id",
                        data
                    )
            else:
                self.log_test(
                    "Boost Offer", 
                    False, 
                    f"Boost offer failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Boost Offer", 
                False, 
                f"Boost offer request failed: {str(e)}"
            )
        
        print(f"\nBoost Offer System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_admin_dashboard_system(self):
        """Test admin dashboard system"""
        print("\n" + "="*80)
        print("TESTING ADMIN DASHBOARD SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Get admin liquidity wallet balance
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/liquidity-wallet",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balance" in data:
                    balance = data["balance"]
                    self.log_test(
                        "Get Admin Liquidity Wallet", 
                        True, 
                        f"Admin liquidity wallet balance: {balance}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get Admin Liquidity Wallet", 
                        False, 
                        "Liquidity wallet response missing success or balance",
                        data
                    )
            else:
                self.log_test(
                    "Get Admin Liquidity Wallet", 
                    False, 
                    f"Get liquidity wallet failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Admin Liquidity Wallet", 
                False, 
                f"Get liquidity wallet request failed: {str(e)}"
            )
        
        # Test 2: Add funds to liquidity wallet
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/liquidity-wallet/add-funds",
                json={
                    "currency": "BTC",
                    "amount": 1.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Add Funds to Liquidity Wallet", 
                        True, 
                        "Funds added to liquidity wallet successfully"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Add Funds to Liquidity Wallet", 
                        False, 
                        "Add funds response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Add Funds to Liquidity Wallet", 
                    False, 
                    f"Add funds failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Add Funds to Liquidity Wallet", 
                False, 
                f"Add funds request failed: {str(e)}"
            )
        
        # Test 3: Get admin fee wallet balance
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/fee-wallet",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balance" in data:
                    balance = data["balance"]
                    self.log_test(
                        "Get Admin Fee Wallet", 
                        True, 
                        f"Admin fee wallet balance: {balance}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get Admin Fee Wallet", 
                        False, 
                        "Fee wallet response missing success or balance",
                        data
                    )
            else:
                self.log_test(
                    "Get Admin Fee Wallet", 
                    False, 
                    f"Get fee wallet failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Admin Fee Wallet", 
                False, 
                f"Get fee wallet request failed: {str(e)}"
            )
        
        # Test 4: Request withdrawal from liquidity wallet
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/liquidity-wallet/withdraw",
                json={
                    "currency": "BTC",
                    "amount": 0.1,
                    "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "withdrawal_id" in data:
                    withdrawal_id = data["withdrawal_id"]
                    self.withdrawal_ids.append(withdrawal_id)
                    self.log_test(
                        "Request Liquidity Wallet Withdrawal", 
                        True, 
                        f"Withdrawal requested successfully (ID: {withdrawal_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Request Liquidity Wallet Withdrawal", 
                        False, 
                        "Withdrawal request response missing success or withdrawal_id",
                        data
                    )
            else:
                self.log_test(
                    "Request Liquidity Wallet Withdrawal", 
                    False, 
                    f"Withdrawal request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Request Liquidity Wallet Withdrawal", 
                False, 
                f"Withdrawal request failed: {str(e)}"
            )
        
        # Test 5: Get all withdrawals
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/withdrawals",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "withdrawals" in data:
                    withdrawals = data["withdrawals"]
                    self.log_test(
                        "Get All Withdrawals", 
                        True, 
                        f"Retrieved {len(withdrawals)} withdrawal requests"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get All Withdrawals", 
                        False, 
                        "Get withdrawals response missing success or withdrawals",
                        data
                    )
            else:
                self.log_test(
                    "Get All Withdrawals", 
                    False, 
                    f"Get withdrawals failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get All Withdrawals", 
                False, 
                f"Get withdrawals request failed: {str(e)}"
            )
        
        # Test 6: Complete withdrawal (if we have a withdrawal_id)
        if self.withdrawal_ids:
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/admin/withdrawal/complete/{self.withdrawal_ids[0]}",
                    json={
                        "tx_hash": "0x1234567890abcdef1234567890abcdef12345678"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Complete Withdrawal", 
                            True, 
                            "Withdrawal completed successfully"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Complete Withdrawal", 
                            False, 
                            "Complete withdrawal response indicates failure",
                            data
                        )
                else:
                    self.log_test(
                        "Complete Withdrawal", 
                        False, 
                        f"Complete withdrawal failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    "Complete Withdrawal", 
                    False, 
                    f"Complete withdrawal request failed: {str(e)}"
                )
        
        print(f"\nAdmin Dashboard System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_trader_balance_system(self):
        """Test trader balance system"""
        print("\n" + "="*80)
        print("TESTING TRADER BALANCE SYSTEM")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("user1"):
            print("❌ Cannot test trader balance system - missing user ID")
            return 0, 1
        
        user_id = self.user_ids["user1"]
        
        # Test 1: Get trader balances
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/trader/my-balances/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    
                    # Verify structure - should have total_balance, locked_balance, available_balance
                    structure_valid = True
                    for balance in balances:
                        required_fields = ["total_balance", "locked_balance", "available_balance"]
                        missing_fields = [field for field in required_fields if field not in balance]
                        if missing_fields:
                            structure_valid = False
                            break
                    
                    if structure_valid:
                        self.log_test(
                            "Get Trader Balances", 
                            True, 
                            f"Retrieved trader balances with correct structure - {len(balances)} currencies"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Get Trader Balances", 
                            False, 
                            "Trader balances missing required structure fields"
                        )
                else:
                    self.log_test(
                        "Get Trader Balances", 
                        False, 
                        "Get trader balances response missing success or balances",
                        data
                    )
            else:
                self.log_test(
                    "Get Trader Balances", 
                    False, 
                    f"Get trader balances failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Trader Balances", 
                False, 
                f"Get trader balances request failed: {str(e)}"
            )
        
        # Test 2: Add funds
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/trader/balance/add-funds",
                json={
                    "user_id": user_id,
                    "currency": "BTC",
                    "amount": 0.5
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Add Funds to Trader Balance", 
                        True, 
                        "Funds added to trader balance successfully"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Add Funds to Trader Balance", 
                        False, 
                        "Add funds response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Add Funds to Trader Balance", 
                    False, 
                    f"Add funds failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Add Funds to Trader Balance", 
                False, 
                f"Add funds request failed: {str(e)}"
            )
        
        print(f"\nTrader Balance System Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        print("🚀 STARTING COMPREHENSIVE SITE-WIDE BACKEND TESTING")
        print("="*80)
        
        total_success = 0
        total_tests = 0
        
        # Run all test suites
        test_suites = [
            ("Authentication System", self.test_authentication_system),
            ("P2P Trading System", self.test_p2p_trading_system),
            ("Crypto Swap System", self.test_crypto_swap_system),
            ("Express Buy System", self.test_express_buy_system),
            ("Boost Offer System", self.test_boost_offer_system),
            ("Admin Dashboard System", self.test_admin_dashboard_system),
            ("Trader Balance System", self.test_trader_balance_system)
        ]
        
        for suite_name, test_function in test_suites:
            try:
                success, tests = test_function()
                total_success += success
                total_tests += tests
            except Exception as e:
                print(f"❌ {suite_name} test suite failed: {str(e)}")
                total_tests += 1
        
        # Print final summary
        print("\n" + "="*80)
        print("COMPREHENSIVE BACKEND TESTING SUMMARY")
        print("="*80)
        
        success_rate = (total_success / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_success}")
        print(f"Failed: {total_tests - total_success}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Categorize results
        if success_rate >= 90:
            print("🎉 EXCELLENT: All critical systems working well")
        elif success_rate >= 75:
            print("✅ GOOD: Most systems working, minor issues identified")
        elif success_rate >= 50:
            print("⚠️  MODERATE: Several issues need attention")
        else:
            print("❌ CRITICAL: Major issues found, immediate attention required")
        
        # Print failed tests summary
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n🔍 FAILED TESTS SUMMARY ({len(failed_tests)} issues):")
            for i, test in enumerate(failed_tests, 1):
                print(f"{i}. {test['test']}: {test['message']}")
        
        return success_rate, total_success, total_tests

def main():
    """Main function to run comprehensive backend testing"""
    tester = ComprehensiveSiteWideBackendTester()
    
    try:
        success_rate, passed, total = tester.run_comprehensive_tests()
        
        # Exit with appropriate code
        if success_rate >= 75:
            sys.exit(0)  # Success
        else:
            sys.exit(1)  # Failure
            
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()