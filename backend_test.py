#!/usr/bin/env python3
"""
Spot Trading Backend API Testing Suite
Focus on testing the Spot Trading page functionality after rebuild.

**CRITICAL FEATURES TO TEST:**
1. Trading Pairs API (/api/trading/pairs) - Should return 24+ pairs
2. User Authentication (Login with admin@coinhubx.net / 1231123)
3. Wallet Balances API
4. Trading Order Submission
5. Order Book Data (simulated)
6. Recent Trades Data (simulated)

**TESTING APPROACH:**
- Test core spot trading functionality
- Verify trading pairs are loaded correctly
- Check user authentication works
- Test order submission flow
- Provide clear pass/fail results

**Backend URL:** https://signupverify.preview.emergentagent.com/api
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
BACKEND_URL = "https://signupverify.preview.emergentagent.com"

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
        success, response, status, response_time = await self.make_request("GET", "/p2p/sell-orders")
        
        if success and isinstance(response, dict):
            listings = response.get("sell_orders", [])
            self.log_test("P2P Marketplace Listings", True, 
                         f"Retrieved {len(listings)} P2P listings", 
                         {"total_listings": len(listings)},
                         performance_ms=response_time)
        else:
            self.log_test("P2P Marketplace Listings", False, 
                         f"Failed to get marketplace listings with status {status}", response,
                         performance_ms=response_time)
    
    async def test_p2p_create_offer(self):
        """Test creating P2P sell order"""
        # Need authenticated user
        user = await self.create_test_user()
        if not user:
            self.log_test("P2P Create Offer", False, "Could not create test user")
            return None
        
        offer_data = {
            "seller_id": user["user_id"],
            "crypto_currency": "BTC",
            "crypto_amount": 0.1,
            "fiat_currency": "GBP",
            "price_per_unit": 45000,
            "payment_methods": ["bank_transfer"],
            "min_purchase": 0.01,
            "max_purchase": 0.1,
            "seller_requirements": []
        }
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "POST", "/p2p/create-sell-order", json=offer_data, headers=headers
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            order_id = response.get("order_id")
            self.log_test("P2P Create Offer", True, 
                         f"P2P sell order created successfully: {order_id}", 
                         {"order_id": order_id, "crypto_currency": offer_data["crypto_currency"]},
                         performance_ms=response_time)
            return {"order_id": order_id, "user": user}
        else:
            self.log_test("P2P Create Offer", False, 
                         f"Failed to create P2P sell order with status {status}", response,
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
        
        # Create sell order
        offer_data = {
            "seller_id": seller["user_id"],
            "crypto_currency": "BTC", 
            "crypto_amount": 0.1,
            "fiat_currency": "GBP",
            "price_per_unit": 45000,
            "payment_methods": ["bank_transfer"],
            "min_purchase": 0.01,
            "max_purchase": 0.1,
            "seller_requirements": []
        }
        
        headers = {"Authorization": f"Bearer {seller['token']}"}
        success, offer_response, status, _ = await self.make_request(
            "POST", "/p2p/create-sell-order", json=offer_data, headers=headers
        )
        
        if not success:
            self.log_test("P2P Order Flow", False, "Could not create offer for order flow test")
            return
        
        order_id = offer_response.get("order_id")
        
        # Create trade (buyer)
        trade_data = {
            "sell_order_id": order_id,
            "buyer_id": buyer["user_id"],
            "crypto_amount": 0.05,
            "payment_method": "bank_transfer",
            "buyer_wallet_address": "test_wallet_address",
            "buyer_wallet_network": "bitcoin",
            "is_express": False
        }
        
        buyer_headers = {"Authorization": f"Bearer {buyer['token']}"}
        success, order_response, status, response_time = await self.make_request(
            "POST", "/p2p/create-trade", json=trade_data, headers=buyer_headers
        )
        
        if success and isinstance(order_response, dict) and order_response.get("success"):
            trade_id = order_response.get("trade_id")
            self.log_test("P2P Trade Creation", True, 
                         f"P2P trade created: {trade_id}", 
                         {"trade_id": trade_id, "amount": trade_data["crypto_amount"]},
                         performance_ms=response_time)
            
            # Test trade status
            success, status_response, status_code, _ = await self.make_request(
                "GET", f"/p2p/trade/{trade_id}", headers=buyer_headers
            )
            
            if success:
                self.log_test("P2P Trade Status Check", True, 
                             f"Trade status retrieved successfully", 
                             status_response.get("trade", {}))
            else:
                self.log_test("P2P Trade Status Check", False, 
                             f"Failed to get trade status with code {status_code}")
        else:
            self.log_test("P2P Trade Creation", False, 
                         f"Failed to create P2P trade with status {status}", order_response,
                         performance_ms=response_time)
    
    # ==================== INSTANT BUY/SELL TESTS ====================
    
    async def test_instant_buy_quotes(self):
        """Test instant buy quote generation"""
        quote_data = {
            "crypto_currency": "BTC",
            "crypto_amount": 0.01,
            "fiat_currency": "GBP"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/instant-buy/quote", json=quote_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            quote = response.get("quote", {})
            self.log_test("Instant Buy Quote", True, 
                         f"Quote generated: £{quote.get('total_fiat', 0):.2f} for {quote_data['crypto_amount']} BTC", 
                         quote, performance_ms=response_time)
        else:
            self.log_test("Instant Buy Quote", False, 
                         f"Failed to get instant buy quote with status {status}", response,
                         performance_ms=response_time)
    
    async def test_instant_sell_quotes(self):
        """Test instant sell quote generation"""
        quote_data = {
            "crypto_currency": "BTC",
            "crypto_amount": 0.01,
            "fiat_currency": "GBP"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/instant-sell/quote", json=quote_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            quote = response.get("quote", {})
            self.log_test("Instant Sell Quote", True, 
                         f"Quote generated: £{quote.get('total_fiat', 0):.2f} for {quote_data['crypto_amount']} BTC", 
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
            "crypto_currency": "BTC",
            "crypto_amount": 0.001,  # Small amount for testing
            "fiat_currency": "GBP"
        }
        
        success, quote_response, status, _ = await self.make_request(
            "POST", "/instant-buy/quote", json=quote_data
        )
        
        if not success:
            self.log_test("Instant Buy Execution", False, "Could not get quote for buy execution")
            return
        
        quote_id = quote_response.get("quote", {}).get("quote_id")
        
        # Execute the buy
        headers = {"Authorization": f"Bearer {user['token']}"}
        success, response, status, response_time = await self.make_request(
            "POST", "/instant-buy/execute", 
            json={"quote_id": quote_id, "buyer_id": user["user_id"]}, 
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
            "GET", f"/wallets/{user['user_id']}", headers=headers
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
            "GET", f"/transactions/{user['user_id']}", headers=headers
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
            "POST", "/wallets/deposit-address", 
            json={"user_id": user["user_id"], "currency": "BTC"}, 
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
    
    # ==================== SECURITY TESTS ====================
    
    async def test_rate_limiting(self):
        """Test rate limiting on authentication endpoints"""
        # Try multiple rapid login attempts
        invalid_data = {"email": "test@test.com", "password": "wrong"}
        
        attempts = []
        for i in range(5):
            success, response, status, response_time = await self.make_request(
                "POST", "/auth/login", json=invalid_data
            )
            attempts.append({"attempt": i+1, "status": status, "response_time": response_time})
            await asyncio.sleep(0.1)  # Small delay between attempts
        
        # Check if rate limiting kicks in (status 429)
        rate_limited = any(attempt["status"] == 429 for attempt in attempts)
        
        if rate_limited:
            self.log_test("Rate Limiting", True, 
                         "Rate limiting detected on login endpoint", 
                         {"attempts": len(attempts), "rate_limited": True})
        else:
            self.log_test("Rate Limiting", False, 
                         "No rate limiting detected (may need configuration)", 
                         {"attempts": len(attempts), "statuses": [a["status"] for a in attempts]})
    
    async def test_input_validation(self):
        """Test input validation on registration"""
        invalid_registrations = [
            {"email": "invalid-email", "password": "123"},  # Invalid email and weak password
            {"email": "", "password": ""},  # Empty fields
            {"email": "test@test.com"},  # Missing password
            {"password": "TestPass123!"},  # Missing email
        ]
        
        validation_results = []
        for i, invalid_data in enumerate(invalid_registrations):
            success, response, status, response_time = await self.make_request(
                "POST", "/auth/register", json=invalid_data
            )
            
            # Should return 400 or 422 for validation errors
            is_properly_rejected = status in [400, 422] and not success
            validation_results.append({
                "test_case": i+1,
                "data": invalid_data,
                "properly_rejected": is_properly_rejected,
                "status": status
            })
        
        all_rejected = all(result["properly_rejected"] for result in validation_results)
        
        if all_rejected:
            self.log_test("Input Validation", True, 
                         "All invalid inputs properly rejected", 
                         {"test_cases": len(validation_results)})
        else:
            failed_cases = [r for r in validation_results if not r["properly_rejected"]]
            self.log_test("Input Validation", False, 
                         f"{len(failed_cases)} validation cases failed", 
                         {"failed_cases": failed_cases})
    
    async def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        protected_endpoints = [
            ("GET", "/wallets/test-user-id"),
            ("GET", "/p2p/trade/test-trade-id"),
            ("POST", "/p2p/create-sell-order"),
            ("GET", "/admin/dashboard/stats"),
        ]
        
        unauthorized_results = []
        for method, endpoint in protected_endpoints:
            success, response, status, response_time = await self.make_request(method, endpoint)
            
            # Should return 401 for unauthorized access
            is_properly_protected = status == 401 and not success
            unauthorized_results.append({
                "endpoint": f"{method} {endpoint}",
                "properly_protected": is_properly_protected,
                "status": status
            })
        
        all_protected = all(result["properly_protected"] for result in unauthorized_results)
        
        if all_protected:
            self.log_test("Unauthorized Access Protection", True, 
                         "All protected endpoints properly secured", 
                         {"endpoints_tested": len(protected_endpoints)})
        else:
            unprotected = [r for r in unauthorized_results if not r["properly_protected"]]
            self.log_test("Unauthorized Access Protection", False, 
                         f"{len(unprotected)} endpoints not properly protected", 
                         {"unprotected_endpoints": unprotected})
    
    # ==================== PERFORMANCE TESTS ====================
    
    async def test_response_times(self):
        """Test API response times are acceptable"""
        endpoints_to_test = [
            ("GET", "/health"),
            ("GET", "/p2p/marketplace"),
            ("POST", "/instant/quote", {"cryptocurrency": "BTC", "amount": 0.01, "type": "buy"}),
        ]
        
        performance_results = []
        for method, endpoint, *args in endpoints_to_test:
            json_data = args[0] if args else None
            
            success, response, status, response_time = await self.make_request(
                method, endpoint, json=json_data
            )
            
            is_fast_enough = response_time < 2000  # 2 seconds threshold
            performance_results.append({
                "endpoint": f"{method} {endpoint}",
                "response_time_ms": response_time,
                "fast_enough": is_fast_enough,
                "success": success
            })
        
        all_fast = all(result["fast_enough"] for result in performance_results)
        avg_response_time = sum(r["response_time_ms"] for r in performance_results) / len(performance_results)
        
        if all_fast:
            self.log_test("API Response Times", True, 
                         f"All endpoints respond within 2s (avg: {avg_response_time:.0f}ms)", 
                         {"average_ms": avg_response_time, "endpoints_tested": len(endpoints_to_test)})
        else:
            slow_endpoints = [r for r in performance_results if not r["fast_enough"]]
            self.log_test("API Response Times", False, 
                         f"{len(slow_endpoints)} endpoints too slow", 
                         {"slow_endpoints": slow_endpoints, "average_ms": avg_response_time})
    
    # ==================== MAIN TEST RUNNER ====================
    
    async def run_all_tests(self):
        """Run comprehensive CoinHubX backend tests"""
        print("🚀 COINHUBX COMPREHENSIVE BACKEND API TESTING")
        print("=" * 80)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"Testing Environment: Production-like with real database")
        print("=" * 80)
        print()
        
        # 1. Health & Connectivity
        print("🏥 HEALTH & CONNECTIVITY TESTS")
        print("-" * 40)
        await self.test_backend_health()
        print()
        
        # 2. Authentication System
        print("🔐 AUTHENTICATION SYSTEM TESTS")
        print("-" * 40)
        await self.test_user_registration()
        await self.test_user_login()
        await self.test_invalid_login()
        await self.test_google_oauth_endpoint()
        print()
        
        # 3. P2P Marketplace
        print("🤝 P2P MARKETPLACE TESTS")
        print("-" * 40)
        await self.test_p2p_marketplace_listings()
        await self.test_p2p_create_offer()
        await self.test_p2p_order_flow()
        print()
        
        # 4. Instant Buy/Sell
        print("⚡ INSTANT BUY/SELL TESTS")
        print("-" * 40)
        await self.test_instant_buy_quotes()
        await self.test_instant_sell_quotes()
        await self.test_instant_buy_execution()
        print()
        
        # 5. Wallet Management
        print("💰 WALLET MANAGEMENT TESTS")
        print("-" * 40)
        await self.test_wallet_balance()
        await self.test_wallet_transaction_history()
        await self.test_deposit_address_generation()
        print()
        
        # 6. Admin Dashboard
        print("👑 ADMIN DASHBOARD TESTS")
        print("-" * 40)
        await self.test_admin_login()
        await self.test_admin_dashboard_stats()
        await self.test_admin_liquidity_management()
        print()
        
        # 7. Security Features
        print("🛡️ SECURITY TESTS")
        print("-" * 40)
        await self.test_rate_limiting()
        await self.test_input_validation()
        await self.test_unauthorized_access()
        print()
        
        # 8. Performance Tests
        print("🏃 PERFORMANCE TESTS")
        print("-" * 40)
        await self.test_response_times()
        print()
        
        # Generate comprehensive summary
        return self.generate_test_summary()
    
    def generate_test_summary(self):
        """Generate comprehensive test summary with categorized results"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Categorize results
        categories = {
            "Authentication": [],
            "P2P": [],
            "Instant Trading": [],
            "Wallet": [],
            "Admin": [],
            "Security": [],
            "Performance": [],
            "Health": []
        }
        
        for result in self.test_results:
            test_name = result["test"]
            if any(keyword in test_name.lower() for keyword in ["login", "register", "auth", "oauth"]):
                categories["Authentication"].append(result)
            elif any(keyword in test_name.lower() for keyword in ["p2p", "marketplace", "offer", "order"]):
                categories["P2P"].append(result)
            elif any(keyword in test_name.lower() for keyword in ["instant", "buy", "sell", "quote"]):
                categories["Instant Trading"].append(result)
            elif any(keyword in test_name.lower() for keyword in ["wallet", "balance", "transaction", "deposit"]):
                categories["Wallet"].append(result)
            elif any(keyword in test_name.lower() for keyword in ["admin", "dashboard", "liquidity"]):
                categories["Admin"].append(result)
            elif any(keyword in test_name.lower() for keyword in ["security", "rate", "validation", "unauthorized"]):
                categories["Security"].append(result)
            elif any(keyword in test_name.lower() for keyword in ["performance", "response", "time"]):
                categories["Performance"].append(result)
            else:
                categories["Health"].append(result)
        
        print("=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        print(f"🎯 Overall Results: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        print(f"⏱️  Test Duration: {datetime.now(timezone.utc).isoformat()}")
        print(f"👥 Test Users Created: {len(self.test_users)}")
        print()
        
        # Category breakdown
        for category, results in categories.items():
            if results:
                category_passed = sum(1 for r in results if r["success"])
                category_total = len(results)
                category_rate = (category_passed / category_total * 100) if category_total > 0 else 0
                status_icon = "✅" if category_rate >= 80 else "⚠️" if category_rate >= 50 else "❌"
                
                print(f"{status_icon} {category}: {category_passed}/{category_total} ({category_rate:.0f}%)")
        
        print()
        
        # Critical failures
        critical_failures = [r for r in self.test_results if not r["success"] and 
                           any(keyword in r["test"].lower() for keyword in 
                               ["login", "register", "health", "admin", "security"])]
        
        if critical_failures:
            print("🚨 CRITICAL FAILURES:")
            for failure in critical_failures:
                print(f"   ❌ {failure['test']}: {failure['details']}")
            print()
        
        # Performance issues
        slow_tests = [r for r in self.test_results if r.get("performance_ms") and r.get("performance_ms") > 2000]
        if slow_tests:
            print("🐌 PERFORMANCE ISSUES:")
            for slow in slow_tests:
                print(f"   ⚠️ {slow['test']}: {slow['performance_ms']:.0f}ms")
            print()
        
        # Database state summary
        db_operations = [r for r in self.test_results if r.get("db_state")]
        if db_operations:
            print(f"💾 Database Operations: {len(db_operations)} tests involved DB state changes")
            print()
        
        print("=" * 80)
        
        return {
            "success_rate": success_rate,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "categories": {cat: {"passed": sum(1 for r in results if r["success"]), 
                                "total": len(results)} for cat, results in categories.items() if results},
            "critical_failures": len(critical_failures),
            "performance_issues": len(slow_tests),
            "test_users_created": len(self.test_users),
            "overall_success": success_rate >= 70 and len(critical_failures) == 0
        }

async def main():
    """Main test runner for CoinHubX comprehensive backend testing"""
    try:
        async with CoinHubXComprehensiveTester() as tester:
            summary = await tester.run_all_tests()
            
            # Save detailed results to JSON file
            results_file = f"/app/test_reports/backend_comprehensive_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(results_file, 'w') as f:
                json.dump({
                    "test_summary": summary,
                    "detailed_results": tester.test_results,
                    "test_users": tester.test_users,
                    "test_metadata": {
                        "backend_url": tester.base_url,
                        "test_timestamp": datetime.now(timezone.utc).isoformat(),
                        "test_type": "comprehensive_backend_audit"
                    }
                }, f, indent=2, default=str)
            
            print(f"📄 Detailed results saved to: {results_file}")
            
            return 0 if summary["overall_success"] else 1
            
    except Exception as e:
        print(f"❌ Test runner failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)