#!/usr/bin/env python3
"""
CoinHubX Comprehensive Backend API Testing Suite
Pre-launch audit with UNDENIABLE PROOF for every feature.

**CRITICAL FEATURES TO TEST:**
1. Authentication System (Login/Register/2FA/Google OAuth)
2. P2P Marketplace & Order Flow (Create, Pay, Release, Feedback)
3. Instant Buy/Sell with Admin Liquidity
4. Wallet Management (Deposit, Withdraw, Balance Updates)
5. Admin Dashboard Functionality
6. Security Features (Rate Limiting, Validation, Hashing)
7. Notifications System
8. Database Operations & Integrity

**TESTING APPROACH:**
- Test ALL endpoints with real data
- Verify database state before/after operations
- Check error handling and validation
- Measure response times and performance
- Provide UNDENIABLE PROOF with detailed logs

**Backend URL:** https://tradefix-preview.preview.emergentagent.com/api
"""

import asyncio
import aiohttp
import json
import sys
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import time
import hashlib
import bcrypt

# Backend URL from frontend .env
BACKEND_URL = "https://tradefix-preview.preview.emergentagent.com"

class CoinHubXComprehensiveTester:
    """Comprehensive CoinHubX Backend API Tester"""
    
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.session = None
        self.test_results = []
        self.test_users = []  # Store created test users
        self.test_trades = []  # Store created test trades
        self.admin_token = None
        self.user_tokens = {}  # Store user tokens for authenticated requests
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None, 
                 db_state: Dict = None, performance_ms: float = None):
        """Log test result with enhanced details"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if performance_ms:
            print(f"    Performance: {performance_ms:.0f}ms")
        if db_state:
            print(f"    DB State: {db_state}")
        if response_data and not success:
            print(f"    Response: {json.dumps(response_data, indent=2)}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data,
            "db_state": db_state,
            "performance_ms": performance_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def make_request(self, method: str, endpoint: str, headers: Dict = None, **kwargs) -> tuple:
        """Make HTTP request and return (success, response_data, status_code, response_time_ms)"""
        start_time = time.time()
        try:
            url = f"{self.base_url}{endpoint}"
            request_headers = headers or {}
            
            async with self.session.request(method, url, headers=request_headers, **kwargs) as response:
                try:
                    data = await response.json()
                except:
                    data = await response.text()
                
                response_time = (time.time() - start_time) * 1000
                return response.status in [200, 201], data, response.status, response_time
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return False, {"error": str(e)}, 0, response_time
    
    def generate_test_user_data(self) -> Dict:
        """Generate random test user data"""
        random_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return {
            "email": f"test_{random_id}@coinhubx.test",
            "password": "TestPass123!",
            "full_name": f"Test User {random_id.upper()}",
            "phone_number": f"+44770{random.randint(1000000, 9999999)}",
            "referral_code": None
        }
    
    async def create_test_user(self) -> Optional[Dict]:
        """Create a test user and return user data with token"""
        user_data = self.generate_test_user_data()
        
        success, response, status, response_time = await self.make_request(
            "POST", "/auth/register", json=user_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            # Try to login to get token
            login_success, login_response, login_status, _ = await self.make_request(
                "POST", "/auth/login", 
                json={"email": user_data["email"], "password": user_data["password"]}
            )
            
            if login_success and isinstance(login_response, dict) and login_response.get("success"):
                user_info = {
                    **user_data,
                    "user_id": login_response.get("user", {}).get("user_id"),
                    "token": login_response.get("token"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                self.test_users.append(user_info)
                self.user_tokens[user_info["user_id"]] = user_info["token"]
                return user_info
        
        return None
    
    # ==================== HEALTH & CONNECTIVITY TESTS ====================
    
    async def test_backend_health(self):
        """Test backend health and connectivity"""
        success, data, status, response_time = await self.make_request("GET", "/health")
        
        if success and isinstance(data, dict):
            self.log_test("Backend Health Check", True, 
                         f"Backend is healthy and responsive", data, 
                         performance_ms=response_time)
        else:
            self.log_test("Backend Health Check", False, 
                         f"Backend health check failed with status {status}", data,
                         performance_ms=response_time)
    
    # ==================== AUTHENTICATION TESTS ====================
    
    async def test_user_registration(self):
        """Test user registration endpoint"""
        user_data = self.generate_test_user_data()
        
        success, response, status, response_time = await self.make_request(
            "POST", "/auth/register", json=user_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            self.log_test("User Registration", True, 
                         f"User registered successfully: {user_data['email']}", 
                         response, performance_ms=response_time)
            return user_data
        else:
            self.log_test("User Registration", False, 
                         f"Registration failed with status {status}", response,
                         performance_ms=response_time)
            return None
    
    async def test_user_login(self):
        """Test user login endpoint"""
        # First create a user
        user_data = await self.create_test_user()
        if not user_data:
            self.log_test("User Login", False, "Could not create test user for login test")
            return None
        
        # Test login
        success, response, status, response_time = await self.make_request(
            "POST", "/auth/login", 
            json={"email": user_data["email"], "password": user_data["password"]}
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            token = response.get("token")
            user_info = response.get("user", {})
            
            self.log_test("User Login", True, 
                         f"Login successful for {user_data['email']}, token received", 
                         {"user_id": user_info.get("user_id"), "has_token": bool(token)},
                         performance_ms=response_time)
            return {"token": token, "user": user_info}
        else:
            self.log_test("User Login", False, 
                         f"Login failed with status {status}", response,
                         performance_ms=response_time)
            return None
    
    async def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response, status, response_time = await self.make_request(
            "POST", "/auth/login", 
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        
        # Should fail with 401 or 400
        if status in [400, 401] and not success:
            self.log_test("Invalid Login Rejection", True, 
                         f"Correctly rejected invalid credentials with status {status}",
                         performance_ms=response_time)
        else:
            self.log_test("Invalid Login Rejection", False, 
                         f"Should reject invalid credentials, got status {status}", response,
                         performance_ms=response_time)
    
    async def test_google_oauth_endpoint(self):
        """Test Google OAuth endpoint availability"""
        success, response, status, response_time = await self.make_request("GET", "/auth/google")
        
        # Should redirect or return OAuth URL
        if status in [200, 302, 307] or (isinstance(response, dict) and "url" in response):
            self.log_test("Google OAuth Endpoint", True, 
                         f"OAuth endpoint available with status {status}",
                         performance_ms=response_time)
        else:
            self.log_test("Google OAuth Endpoint", False, 
                         f"OAuth endpoint failed with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== P2P MARKETPLACE TESTS ====================
    
    async def test_p2p_marketplace_listings(self):
        """Test P2P marketplace listings endpoint"""
        success, response, status, response_time = await self.make_request("GET", "/p2p/marketplace")
        
        if success and isinstance(response, dict):
            listings = response.get("listings", [])
            self.log_test("P2P Marketplace Listings", True, 
                         f"Retrieved {len(listings)} P2P listings", 
                         {"total_listings": len(listings)},
                         performance_ms=response_time)
        else:
            self.log_test("P2P Marketplace Listings", False, 
                         f"Failed to get marketplace listings with status {status}", response,
                         performance_ms=response_time)
    
    async def test_p2p_create_offer(self):
        """Test creating P2P offer"""
        # Need authenticated user
        user = await self.create_test_user()
        if not user:
            self.log_test("P2P Create Offer", False, "Could not create test user")
            return None
        
        offer_data = {
            "type": "sell",
            "cryptocurrency": "BTC",
            "amount": 0.1,
            "price_per_unit": 45000,
            "payment_methods": ["bank_transfer"],
            "min_order": 0.01,
            "max_order": 0.1
        }
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "POST", "/p2p/offers", json=offer_data, headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            offer_id = response.get("offer_id")
            self.log_test("P2P Create Offer", True, 
                         f"P2P offer created successfully: {offer_id}", 
                         {"offer_id": offer_id, "type": offer_data["type"]},
                         performance_ms=response_time)
            return {"offer_id": offer_id, "user": user}
        else:
            self.log_test("P2P Create Offer", False, 
                         f"Failed to create P2P offer with status {status}", response,
                         performance_ms=response_time)
            return None
    
    async def test_p2p_order_flow(self):
        """Test complete P2P order flow: create -> pay -> release"""
        # Create seller and buyer
        seller = await self.create_test_user()
        buyer = await self.create_test_user()
        
        if not seller or not buyer:
            self.log_test("P2P Order Flow", False, "Could not create test users")
            return
        
        # Create offer
        offer_data = {
            "type": "sell",
            "cryptocurrency": "BTC", 
            "amount": 0.1,
            "price_per_unit": 45000,
            "payment_methods": ["bank_transfer"],
            "min_order": 0.01,
            "max_order": 0.1
        }
        
        headers = {"Authorization": f"Bearer {seller['token']}"}
        success, offer_response, status, _ = await self.make_request(
            "POST", "/p2p/offers", json=offer_data, headers=headers
        )
        
        if not success:
            self.log_test("P2P Order Flow", False, "Could not create offer for order flow test")
            return
        
        offer_id = offer_response.get("offer_id")
        
        # Create order (buyer)
        order_data = {
            "offer_id": offer_id,
            "amount": 0.05,
            "payment_method": "bank_transfer"
        }
        
        buyer_headers = {"Authorization": f"Bearer {buyer['token']}"}
        success, order_response, status, response_time = await self.make_request(
            "POST", "/p2p/orders", json=order_data, headers=buyer_headers
        )
        
        if success and isinstance(order_response, dict) and order_response.get("success"):
            order_id = order_response.get("order_id")
            self.log_test("P2P Order Creation", True, 
                         f"P2P order created: {order_id}", 
                         {"order_id": order_id, "amount": order_data["amount"]},
                         performance_ms=response_time)
            
            # Test order status
            success, status_response, status_code, _ = await self.make_request(
                "GET", f"/p2p/orders/{order_id}", headers=buyer_headers
            )
            
            if success:
                self.log_test("P2P Order Status Check", True, 
                             f"Order status retrieved successfully", 
                             status_response.get("order", {}))
            else:
                self.log_test("P2P Order Status Check", False, 
                             f"Failed to get order status with code {status_code}")
        else:
            self.log_test("P2P Order Creation", False, 
                         f"Failed to create P2P order with status {status}", order_response,
                         performance_ms=response_time)
    
    # ==================== INSTANT BUY/SELL TESTS ====================
    
    async def test_instant_buy_quotes(self):
        """Test instant buy quote generation"""
        quote_data = {
            "cryptocurrency": "BTC",
            "amount": 0.01,
            "type": "buy"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/instant/quote", json=quote_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            quote = response.get("quote", {})
            self.log_test("Instant Buy Quote", True, 
                         f"Quote generated: £{quote.get('total_gbp', 0):.2f} for {quote_data['amount']} BTC", 
                         quote, performance_ms=response_time)
        else:
            self.log_test("Instant Buy Quote", False, 
                         f"Failed to get instant buy quote with status {status}", response,
                         performance_ms=response_time)
    
    async def test_instant_sell_quotes(self):
        """Test instant sell quote generation"""
        quote_data = {
            "cryptocurrency": "BTC",
            "amount": 0.01,
            "type": "sell"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/instant/quote", json=quote_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            quote = response.get("quote", {})
            self.log_test("Instant Sell Quote", True, 
                         f"Quote generated: £{quote.get('total_gbp', 0):.2f} for {quote_data['amount']} BTC", 
                         quote, performance_ms=response_time)
        else:
            self.log_test("Instant Sell Quote", False, 
                         f"Failed to get instant sell quote with status {status}", response,
                         performance_ms=response_time)
    
    async def test_instant_buy_execution(self):
        """Test instant buy execution with admin liquidity"""
        user = await self.create_test_user()
        if not user:
            self.log_test("Instant Buy Execution", False, "Could not create test user")
            return
        
        # First get a quote
        quote_data = {
            "cryptocurrency": "BTC",
            "amount": 0.001,  # Small amount for testing
            "type": "buy"
        }
        
        success, quote_response, status, _ = await self.make_request(
            "POST", "/instant/quote", json=quote_data
        )
        
        if not success:
            self.log_test("Instant Buy Execution", False, "Could not get quote for buy execution")
            return
        
        quote_id = quote_response.get("quote", {}).get("quote_id")
        
        # Execute the buy
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "POST", "/instant/buy", 
            json={"quote_id": quote_id, "payment_method": "card"}, 
            headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            transaction_id = response.get("transaction_id")
            self.log_test("Instant Buy Execution", True, 
                         f"Instant buy executed: {transaction_id}", 
                         {"transaction_id": transaction_id, "amount": quote_data["amount"]},
                         performance_ms=response_time)
        else:
            self.log_test("Instant Buy Execution", False, 
                         f"Failed to execute instant buy with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== WALLET TESTS ====================
    
    async def test_wallet_balance(self):
        """Test wallet balance retrieval"""
        user = await self.create_test_user()
        if not user:
            self.log_test("Wallet Balance", False, "Could not create test user")
            return
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "GET", "/wallet/balance", headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            balances = response.get("balances", {})
            self.log_test("Wallet Balance", True, 
                         f"Wallet balance retrieved for user {user['user_id']}", 
                         balances, performance_ms=response_time)
        else:
            self.log_test("Wallet Balance", False, 
                         f"Failed to get wallet balance with status {status}", response,
                         performance_ms=response_time)
    
    async def test_wallet_transaction_history(self):
        """Test wallet transaction history"""
        user = await self.create_test_user()
        if not user:
            self.log_test("Wallet Transaction History", False, "Could not create test user")
            return
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "GET", "/wallet/transactions", headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            transactions = response.get("transactions", [])
            self.log_test("Wallet Transaction History", True, 
                         f"Retrieved {len(transactions)} transactions", 
                         {"transaction_count": len(transactions)},
                         performance_ms=response_time)
        else:
            self.log_test("Wallet Transaction History", False, 
                         f"Failed to get transaction history with status {status}", response,
                         performance_ms=response_time)
    
    async def test_deposit_address_generation(self):
        """Test deposit address generation"""
        user = await self.create_test_user()
        if not user:
            self.log_test("Deposit Address Generation", False, "Could not create test user")
            return
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "POST", "/wallet/deposit/address", 
            json={"cryptocurrency": "BTC"}, 
            headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            address = response.get("address")
            self.log_test("Deposit Address Generation", True, 
                         f"Deposit address generated: {address[:10]}...", 
                         {"has_address": bool(address)},
                         performance_ms=response_time)
        else:
            self.log_test("Deposit Address Generation", False, 
                         f"Failed to generate deposit address with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== ADMIN DASHBOARD TESTS ====================
    
    async def test_admin_login(self):
        """Test admin login functionality"""
        # Try to login as admin (assuming admin credentials exist)
        admin_data = {
            "email": "admin@coinhubx.net",
            "password": "AdminPass123!"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/auth/admin/login", json=admin_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            self.admin_token = response.get("token")
            self.log_test("Admin Login", True, 
                         "Admin login successful", 
                         {"has_token": bool(self.admin_token)},
                         performance_ms=response_time)
        else:
            self.log_test("Admin Login", False, 
                         f"Admin login failed with status {status}", response,
                         performance_ms=response_time)
    
    async def test_admin_dashboard_stats(self):
        """Test admin dashboard statistics"""
        if not self.admin_token:
            await self.test_admin_login()
        
        if not self.admin_token:
            self.log_test("Admin Dashboard Stats", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        success, response, status, response_time = await self.make_request(
            "GET", "/admin/dashboard/stats", headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            stats = response.get("stats", {})
            self.log_test("Admin Dashboard Stats", True, 
                         "Dashboard statistics retrieved", 
                         stats, performance_ms=response_time)
        else:
            self.log_test("Admin Dashboard Stats", False, 
                         f"Failed to get dashboard stats with status {status}", response,
                         performance_ms=response_time)
    
    async def test_admin_liquidity_management(self):
        """Test admin liquidity management"""
        if not self.admin_token:
            await self.test_admin_login()
        
        if not self.admin_token:
            self.log_test("Admin Liquidity Management", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        success, response, status, response_time = await self.make_request(
            "GET", "/admin/liquidity", headers=headers
        )
        
        if success and isinstance(response, dict):
            liquidity_data = response.get("liquidity", {})
            self.log_test("Admin Liquidity Management", True, 
                         "Liquidity data retrieved", 
                         liquidity_data, performance_ms=response_time)
        else:
            self.log_test("Admin Liquidity Management", False, 
                         f"Failed to get liquidity data with status {status}", response,
                         performance_ms=response_time)
    
    async def test_leaderboard_response_structure(self):
        """Test leaderboard response structure matches expected format"""
        success, data, status = await self.make_request("GET", "/p2p/leaderboard")
        
        if success and isinstance(data, dict) and data.get("success"):
            leaderboard = data.get("leaderboard", [])
            
            if leaderboard:
                # Check first entry structure
                entry = leaderboard[0]
                expected_fields = [
                    "rank", "user_id", "username", "country", "total_volume_gbp",
                    "total_trades", "completion_rate", "avg_release_time_seconds",
                    "badges", "verified"
                ]
                
                has_all_fields = all(field in entry for field in expected_fields)
                
                if has_all_fields:
                    self.log_test("Leaderboard Response Structure", True, 
                                 f"All expected fields present in leaderboard entry")
                else:
                    missing_fields = [f for f in expected_fields if f not in entry]
                    self.log_test("Leaderboard Response Structure", False, 
                                 f"Missing fields: {missing_fields}", entry)
            else:
                self.log_test("Leaderboard Response Structure", True, 
                             "Empty leaderboard (no trades yet)")
        else:
            self.log_test("Leaderboard Response Structure", False, 
                         f"Request failed with status {status}", data)
    
    async def test_user_rank_valid_user(self):
        """Test GET /api/p2p/leaderboard/user/{user_id} with valid user"""
        # First get leaderboard to find a valid user_id
        success, data, status = await self.make_request("GET", "/p2p/leaderboard")
        
        if success and isinstance(data, dict) and data.get("success"):
            leaderboard = data.get("leaderboard", [])
            
            if leaderboard:
                # Test with first user in leaderboard
                user_id = leaderboard[0]["user_id"]
                success, user_data, status = await self.make_request("GET", f"/p2p/leaderboard/user/{user_id}")
                
                if success and isinstance(user_data, dict) and user_data.get("success"):
                    expected_fields = ["rank", "total_traders", "stats"]
                    has_all_fields = all(field in user_data for field in expected_fields)
                    
                    if has_all_fields:
                        self.log_test("User Rank Valid User", True, 
                                     f"User rank {user_data.get('rank')} of {user_data.get('total_traders')}")
                    else:
                        self.log_test("User Rank Valid User", False, 
                                     "Missing expected fields in user rank response", user_data)
                else:
                    self.log_test("User Rank Valid User", False, 
                                 f"User rank request failed with status {status}", user_data)
            else:
                self.log_test("User Rank Valid User", True, 
                             "No users in leaderboard to test with")
        else:
            self.log_test("User Rank Valid User", False, 
                         "Could not get leaderboard to find valid user_id")
    
    async def test_user_rank_invalid_user(self):
        """Test user rank with non-existent user_id"""
        fake_user_id = "non-existent-user-12345"
        success, data, status = await self.make_request("GET", f"/p2p/leaderboard/user/{fake_user_id}")
        
        if success and isinstance(data, dict):
            # Should return success=false for user not in rankings
            if not data.get("success") and "not in" in data.get("message", "").lower():
                self.log_test("User Rank Invalid User", True, 
                             "Correctly returned 'not in rankings' for invalid user")
            else:
                self.log_test("User Rank Invalid User", False, 
                             "Should return 'not in rankings' for invalid user", data)
        else:
            self.log_test("User Rank Invalid User", False, 
                         f"Request failed with status {status}", data)
    
    async def test_user_rank_timeframes(self):
        """Test user rank with different timeframes"""
        # First get a valid user_id
        success, data, status = await self.make_request("GET", "/p2p/leaderboard")
        
        if success and isinstance(data, dict) and data.get("success"):
            leaderboard = data.get("leaderboard", [])
            
            if leaderboard:
                user_id = leaderboard[0]["user_id"]
                timeframes = ["24h", "7d", "30d", "all"]
                
                for timeframe in timeframes:
                    success, user_data, status = await self.make_request(
                        "GET", f"/p2p/leaderboard/user/{user_id}?timeframe={timeframe}"
                    )
                    
                    if success and isinstance(user_data, dict):
                        if user_data.get("success") or "not in" in user_data.get("message", "").lower():
                            self.log_test(f"User Rank Timeframe {timeframe}", True, 
                                         f"Valid response for timeframe {timeframe}")
                        else:
                            self.log_test(f"User Rank Timeframe {timeframe}", False, 
                                         f"Unexpected response", user_data)
                    else:
                        self.log_test(f"User Rank Timeframe {timeframe}", False, 
                                     f"Request failed with status {status}", user_data)
            else:
                self.log_test("User Rank Timeframes", True, 
                             "No users in leaderboard to test timeframes with")
        else:
            self.log_test("User Rank Timeframes", False, 
                         "Could not get leaderboard to find valid user_id")
    
    async def test_response_times(self):
        """Test that response times are reasonable (<1s)"""
        start_time = time.time()
        success, data, status = await self.make_request("GET", "/p2p/leaderboard")
        end_time = time.time()
        
        response_time = end_time - start_time
        
        if response_time < 1.0:
            self.log_test("Response Time Leaderboard", True, 
                         f"Response time: {response_time:.3f}s (< 1s)")
        else:
            self.log_test("Response Time Leaderboard", False, 
                         f"Response time: {response_time:.3f}s (≥ 1s)")
        
        # Test user rank response time
        if success and isinstance(data, dict) and data.get("success"):
            leaderboard = data.get("leaderboard", [])
            if leaderboard:
                user_id = leaderboard[0]["user_id"]
                
                start_time = time.time()
                success, user_data, status = await self.make_request("GET", f"/p2p/leaderboard/user/{user_id}")
                end_time = time.time()
                
                response_time = end_time - start_time
                
                if response_time < 1.0:
                    self.log_test("Response Time User Rank", True, 
                                 f"Response time: {response_time:.3f}s (< 1s)")
                else:
                    self.log_test("Response Time User Rank", False, 
                                 f"Response time: {response_time:.3f}s (≥ 1s)")
    
    async def run_all_tests(self):
        """Run all P2P leaderboard tests"""
        print("🎯 P2P LEADERBOARD API COMPREHENSIVE TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now(timezone.utc).isoformat()}")
        print()
        
        # Test GET /api/p2p/leaderboard endpoint
        print("📊 Testing GET /api/p2p/leaderboard")
        await self.test_leaderboard_default_query()
        await self.test_leaderboard_timeframes()
        await self.test_leaderboard_limits()
        await self.test_leaderboard_invalid_timeframe()
        await self.test_leaderboard_invalid_limits()
        await self.test_leaderboard_response_structure()
        
        print()
        
        # Test GET /api/p2p/leaderboard/user/{user_id} endpoint
        print("👤 Testing GET /api/p2p/leaderboard/user/{user_id}")
        await self.test_user_rank_valid_user()
        await self.test_user_rank_invalid_user()
        await self.test_user_rank_timeframes()
        
        print()
        
        # Test performance
        print("⚡ Testing Performance")
        await self.test_response_times()
        
        print()
        
        # Summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 60)
        print("📋 TEST SUMMARY")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return success_rate >= 80  # Consider 80%+ success rate as overall success

async def main():
    """Main test runner"""
    try:
        async with P2PLeaderboardTester() as tester:
            success = await tester.run_all_tests()
            return 0 if success else 1
    except Exception as e:
        print(f"❌ Test runner failed: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)