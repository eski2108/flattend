#!/usr/bin/env python3
"""
COMPREHENSIVE TRADING SYSTEM BACKEND TESTING
Tests the new Trading System backend endpoints with focus on liquidity protection and concurrency.

**CRITICAL ENDPOINTS TO TEST:**

1. **GET /api/trading/pairs**
   - Should return all 6 trading pairs (BTC/GBP, ETH/GBP, USDT/GBP, BNB/GBP, SOL/GBP, LTC/GBP)
   - Each pair should have: symbol, base, quote, available_liquidity, is_tradable, status
   - Verify pairs with zero liquidity show is_tradable=false, status='paused'

2. **GET /api/admin/trading-liquidity**
   - Should return liquidity data for all 6 currencies
   - Each entry: currency, balance, available, reserved, is_tradable, status
   - Initially all should have zero liquidity

3. **POST /api/admin/trading-liquidity/add**
   - Test adding 1.0 BTC liquidity
   - Verify response success
   - Test adding 5.0 ETH liquidity
   - Verify wallet created/updated in database

4. **POST /api/admin/trading-liquidity/remove**
   - Test removing 0.5 BTC liquidity
   - Verify success and balance updated
   - Test removing MORE than available - should return error
   - Test removing from non-existent currency - should return 404

5. **POST /api/trading/execute** (MOST IMPORTANT - Test Concurrency)
   - First add liquidity: 1.0 BTC via /api/admin/trading-liquidity/add
   - Test single BUY trade: user buys 0.1 BTC
   - Verify: success=true, adjusted_price includes markup, fee calculated
   - Verify admin liquidity decreased by 0.1 BTC
   - Test with insufficient liquidity: try to buy 2.0 BTC when only 0.9 available
   - Should return error: "Insufficient platform liquidity"
   - Test with zero liquidity: try to buy when liquidity is 0
   - Should return error: "Trading paused due to insufficient platform liquidity"
   
6. **Concurrent Trade Test** (CRITICAL):
   - Add 1.0 BTC liquidity
   - Simulate 2 users trying to buy 0.6 BTC each simultaneously
   - One should succeed, one should fail with "insufficient liquidity" error
   - Verify final admin liquidity is exactly 0.4 BTC (not negative)
   - This tests MongoDB transaction atomicity

7. **Markup/Markdown Verification**:
   - Execute a buy trade
   - Verify adjusted_price > market_price (markup applied)
   - Execute a sell trade  
   - Verify adjusted_price < market_price (markdown applied)

**Backend URL:** https://premium-wallet-hub.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time
import threading
import concurrent.futures

# Configuration
BASE_URL = "https://premium-wallet-hub.preview.emergentagent.com/api"

# Test Users for trading system testing
TRADER_USER_1 = {
    "email": "trader1_test@test.com",
    "password": "Test123456",
    "full_name": "Trading Test User 1"
}

TRADER_USER_2 = {
    "email": "trader2_test@test.com", 
    "password": "Test123456",
    "full_name": "Trading Test User 2"
}

class TradingSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.trader1_user_id = None
        self.trader2_user_id = None
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
    
    def setup_test_users(self):
        """Setup test users for trading"""
        print("\n=== Setting Up Test Users for Trading ===")
        
        success = True
        
        # Register/login trader 1
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=TRADER_USER_1,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.trader1_user_id = data["user"]["user_id"]
                    self.log_test("Trader 1 Registration", True, f"Trader 1 registered with ID: {self.trader1_user_id}")
                else:
                    self.log_test("Trader 1 Registration", False, "Registration response missing user_id", data)
                    success = False
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login
                login_response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={"email": TRADER_USER_1["email"], "password": TRADER_USER_1["password"]},
                    timeout=10
                )
                if login_response.status_code == 200:
                    data = login_response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        self.trader1_user_id = data["user"]["user_id"]
                        self.log_test("Trader 1 Login", True, f"Trader 1 logged in with ID: {self.trader1_user_id}")
                    else:
                        self.log_test("Trader 1 Login", False, "Login response missing user_id", data)
                        success = False
                else:
                    self.log_test("Trader 1 Login", False, f"Login failed with status {login_response.status_code}")
                    success = False
            else:
                self.log_test("Trader 1 Registration", False, f"Registration failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Trader 1 Setup", False, f"Request failed: {str(e)}")
            success = False
        
        # Register/login trader 2
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=TRADER_USER_2,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.trader2_user_id = data["user"]["user_id"]
                    self.log_test("Trader 2 Registration", True, f"Trader 2 registered with ID: {self.trader2_user_id}")
                else:
                    self.log_test("Trader 2 Registration", False, "Registration response missing user_id", data)
                    success = False
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login
                login_response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={"email": TRADER_USER_2["email"], "password": TRADER_USER_2["password"]},
                    timeout=10
                )
                if login_response.status_code == 200:
                    data = login_response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        self.trader2_user_id = data["user"]["user_id"]
                        self.log_test("Trader 2 Login", True, f"Trader 2 logged in with ID: {self.trader2_user_id}")
                    else:
                        self.log_test("Trader 2 Login", False, "Login response missing user_id", data)
                        success = False
                else:
                    self.log_test("Trader 2 Login", False, f"Login failed with status {login_response.status_code}")
                    success = False
            else:
                self.log_test("Trader 2 Registration", False, f"Registration failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Trader 2 Setup", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_get_trading_pairs(self):
        """Test GET /api/trading/pairs - Should return all 6 trading pairs"""
        print("\n=== Testing GET /api/trading/pairs ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/trading/pairs",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "pairs" in data:
                    pairs = data["pairs"]
                    expected_pairs = ["BTC/GBP", "ETH/GBP", "USDT/GBP", "BNB/GBP", "SOL/GBP", "LTC/GBP"]
                    
                    # Check if all expected pairs are present
                    found_pairs = [pair.get("symbol") for pair in pairs]
                    missing_pairs = [p for p in expected_pairs if p not in found_pairs]
                    
                    if not missing_pairs:
                        # Check required fields for each pair
                        all_valid = True
                        for pair in pairs:
                            required_fields = ["symbol", "base", "quote", "available_liquidity", "is_tradable", "status"]
                            missing_fields = [f for f in required_fields if f not in pair]
                            if missing_fields:
                                self.log_test("Trading Pairs Fields", False, f"Pair {pair.get('symbol')} missing fields: {missing_fields}")
                                all_valid = False
                        
                        if all_valid:
                            # Check pairs with zero liquidity
                            zero_liquidity_pairs = [p for p in pairs if p.get("available_liquidity", 0) == 0]
                            paused_pairs = [p for p in zero_liquidity_pairs if not p.get("is_tradable", True) and p.get("status") == "paused"]
                            
                            self.log_test(
                                "Get Trading Pairs", 
                                True, 
                                f"Found all {len(pairs)} trading pairs. Zero liquidity pairs: {len(zero_liquidity_pairs)}, Properly paused: {len(paused_pairs)}"
                            )
                            return True
                        else:
                            return False
                    else:
                        self.log_test("Get Trading Pairs", False, f"Missing trading pairs: {missing_pairs}")
                else:
                    self.log_test("Get Trading Pairs", False, "Invalid response format", data)
            else:
                self.log_test("Get Trading Pairs", False, f"Request failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Trading Pairs", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_get_admin_trading_liquidity(self):
        """Test GET /api/admin/trading-liquidity - Should return liquidity data for all 6 currencies"""
        print("\n=== Testing GET /api/admin/trading-liquidity ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/trading-liquidity",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "liquidity" in data:
                    liquidity_data = data["liquidity"]
                    expected_currencies = ["BTC", "ETH", "USDT", "BNB", "SOL", "LTC"]
                    
                    # Check if all expected currencies are present
                    found_currencies = [item.get("currency") for item in liquidity_data]
                    missing_currencies = [c for c in expected_currencies if c not in found_currencies]
                    
                    if not missing_currencies:
                        # Check required fields for each currency
                        all_valid = True
                        for item in liquidity_data:
                            required_fields = ["currency", "balance", "available", "reserved", "is_tradable", "status"]
                            missing_fields = [f for f in required_fields if f not in item]
                            if missing_fields:
                                self.log_test("Trading Liquidity Fields", False, f"Currency {item.get('currency')} missing fields: {missing_fields}")
                                all_valid = False
                        
                        if all_valid:
                            # Check initial state (should be zero liquidity)
                            zero_balance_count = sum(1 for item in liquidity_data if item.get("balance", 0) == 0)
                            
                            self.log_test(
                                "Get Admin Trading Liquidity", 
                                True, 
                                f"Found liquidity data for all {len(liquidity_data)} currencies. Zero balance currencies: {zero_balance_count}"
                            )
                            return True
                        else:
                            return False
                    else:
                        self.log_test("Get Admin Trading Liquidity", False, f"Missing currencies: {missing_currencies}")
                else:
                    self.log_test("Get Admin Trading Liquidity", False, "Invalid response format", data)
            else:
                self.log_test("Get Admin Trading Liquidity", False, f"Request failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Admin Trading Liquidity", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_add_trading_liquidity(self):
        """Test POST /api/admin/trading-liquidity/add - Add BTC and ETH liquidity"""
        print("\n=== Testing POST /api/admin/trading-liquidity/add ===")
        
        success = True
        
        # Test adding 1.0 BTC liquidity
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/add",
                json={
                    "currency": "BTC",
                    "amount": 1.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    new_balance = data.get("new_balance", 0)
                    self.log_test("Add BTC Liquidity", True, f"Added 1.0 BTC liquidity. New balance: {new_balance}")
                else:
                    self.log_test("Add BTC Liquidity", False, "Response indicates failure", data)
                    success = False
            else:
                self.log_test("Add BTC Liquidity", False, f"Request failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Add BTC Liquidity", False, f"Request failed: {str(e)}")
            success = False
        
        # Test adding 5.0 ETH liquidity
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/add",
                json={
                    "currency": "ETH",
                    "amount": 5.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    new_balance = data.get("new_balance", 0)
                    self.log_test("Add ETH Liquidity", True, f"Added 5.0 ETH liquidity. New balance: {new_balance}")
                else:
                    self.log_test("Add ETH Liquidity", False, "Response indicates failure", data)
                    success = False
            else:
                self.log_test("Add ETH Liquidity", False, f"Request failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Add ETH Liquidity", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_remove_trading_liquidity(self):
        """Test POST /api/admin/trading-liquidity/remove - Remove liquidity with validation"""
        print("\n=== Testing POST /api/admin/trading-liquidity/remove ===")
        
        success = True
        
        # Test removing 0.5 BTC liquidity (should succeed)
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/remove",
                json={
                    "currency": "BTC",
                    "amount": 0.5
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    new_balance = data.get("new_balance", 0)
                    self.log_test("Remove BTC Liquidity", True, f"Removed 0.5 BTC liquidity. New balance: {new_balance}")
                else:
                    self.log_test("Remove BTC Liquidity", False, "Response indicates failure", data)
                    success = False
            else:
                self.log_test("Remove BTC Liquidity", False, f"Request failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Remove BTC Liquidity", False, f"Request failed: {str(e)}")
            success = False
        
        # Test removing MORE than available (should fail)
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/remove",
                json={
                    "currency": "BTC",
                    "amount": 10.0  # More than available
                },
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_test("Remove Excessive BTC", True, "Correctly rejected removal of more than available liquidity")
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success"):
                    self.log_test("Remove Excessive BTC", True, "Correctly rejected excessive removal in response")
                else:
                    self.log_test("Remove Excessive BTC", False, "Should have rejected excessive removal", data)
                    success = False
            else:
                self.log_test("Remove Excessive BTC", False, f"Unexpected status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Remove Excessive BTC", False, f"Request failed: {str(e)}")
            success = False
        
        # Test removing from non-existent currency (should fail)
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/remove",
                json={
                    "currency": "NONEXISTENT",
                    "amount": 1.0
                },
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_test("Remove Non-existent Currency", True, "Correctly returned 404 for non-existent currency")
            elif response.status_code == 400:
                self.log_test("Remove Non-existent Currency", True, "Correctly rejected non-existent currency")
            else:
                self.log_test("Remove Non-existent Currency", False, f"Should have returned 404, got {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Remove Non-existent Currency", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_trading_execute_single(self):
        """Test POST /api/trading/execute - Single trade execution"""
        print("\n=== Testing POST /api/trading/execute - Single Trade ===")
        
        if not self.trader1_user_id:
            self.log_test("Trading Execute Single", False, "No trader user ID available")
            return False
        
        success = True
        
        # Test single BUY trade: user buys 0.1 BTC
        try:
            response = self.session.post(
                f"{BASE_URL}/trading/execute",
                json={
                    "user_id": self.trader1_user_id,
                    "pair": "BTC/GBP",
                    "type": "buy",
                    "amount": 0.1,
                    "price": 45000.0  # Market price
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adjusted_price = data.get("adjusted_price", 0)
                    market_price = data.get("market_price", 0)
                    fee = data.get("fee", 0)
                    
                    # Verify markup applied (adjusted_price > market_price for buy)
                    if adjusted_price > market_price:
                        self.log_test(
                            "Trading Execute Single BUY", 
                            True, 
                            f"BUY trade successful. Market: £{market_price}, Adjusted: £{adjusted_price} (markup applied), Fee: £{fee}"
                        )
                    else:
                        self.log_test("Trading Execute Single BUY", False, f"Markup not applied. Market: £{market_price}, Adjusted: £{adjusted_price}")
                        success = False
                else:
                    self.log_test("Trading Execute Single BUY", False, "Response indicates failure", data)
                    success = False
            else:
                self.log_test("Trading Execute Single BUY", False, f"Request failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Trading Execute Single BUY", False, f"Request failed: {str(e)}")
            success = False
        
        # Test single SELL trade: user sells 0.05 BTC
        try:
            response = self.session.post(
                f"{BASE_URL}/trading/execute",
                json={
                    "user_id": self.trader1_user_id,
                    "pair": "BTC/GBP",
                    "type": "sell",
                    "amount": 0.05,
                    "price": 45000.0  # Market price
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adjusted_price = data.get("adjusted_price", 0)
                    market_price = data.get("market_price", 0)
                    fee = data.get("fee", 0)
                    
                    # Verify markdown applied (adjusted_price < market_price for sell)
                    if adjusted_price < market_price:
                        self.log_test(
                            "Trading Execute Single SELL", 
                            True, 
                            f"SELL trade successful. Market: £{market_price}, Adjusted: £{adjusted_price} (markdown applied), Fee: £{fee}"
                        )
                    else:
                        self.log_test("Trading Execute Single SELL", False, f"Markdown not applied. Market: £{market_price}, Adjusted: £{adjusted_price}")
                        success = False
                else:
                    self.log_test("Trading Execute Single SELL", False, "Response indicates failure", data)
                    success = False
            else:
                self.log_test("Trading Execute Single SELL", False, f"Request failed with status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Trading Execute Single SELL", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_trading_execute_insufficient_liquidity(self):
        """Test trading with insufficient liquidity scenarios"""
        print("\n=== Testing Trading Execute - Insufficient Liquidity ===")
        
        if not self.trader1_user_id:
            self.log_test("Trading Execute Insufficient", False, "No trader user ID available")
            return False
        
        success = True
        
        # Test with insufficient liquidity: try to buy 2.0 BTC when only ~0.5 available
        try:
            response = self.session.post(
                f"{BASE_URL}/trading/execute",
                json={
                    "user_id": self.trader1_user_id,
                    "pair": "BTC/GBP",
                    "type": "buy",
                    "amount": 2.0,  # More than available
                    "price": 45000.0
                },
                timeout=10
            )
            
            if response.status_code == 400:
                data = response.json()
                error_message = data.get("detail", "").lower()
                if "insufficient" in error_message and "liquidity" in error_message:
                    self.log_test("Trading Execute Insufficient", True, "Correctly rejected trade with insufficient liquidity")
                else:
                    self.log_test("Trading Execute Insufficient", False, f"Wrong error message: {data.get('detail')}")
                    success = False
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success"):
                    error_message = data.get("message", "").lower()
                    if "insufficient" in error_message and "liquidity" in error_message:
                        self.log_test("Trading Execute Insufficient", True, "Correctly rejected trade with insufficient liquidity")
                    else:
                        self.log_test("Trading Execute Insufficient", False, f"Wrong error message: {data.get('message')}")
                        success = False
                else:
                    self.log_test("Trading Execute Insufficient", False, "Should have rejected insufficient liquidity trade", data)
                    success = False
            else:
                self.log_test("Trading Execute Insufficient", False, f"Unexpected status {response.status_code}", response.text)
                success = False
        except Exception as e:
            self.log_test("Trading Execute Insufficient", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_trading_execute_zero_liquidity(self):
        """Test trading with zero liquidity (should be paused)"""
        print("\n=== Testing Trading Execute - Zero Liquidity ===")
        
        if not self.trader1_user_id:
            self.log_test("Trading Execute Zero Liquidity", False, "No trader user ID available")
            return False
        
        # Test with zero liquidity currency (e.g., SOL which we haven't added liquidity to)
        try:
            response = self.session.post(
                f"{BASE_URL}/trading/execute",
                json={
                    "user_id": self.trader1_user_id,
                    "pair": "SOL/GBP",
                    "type": "buy",
                    "amount": 1.0,
                    "price": 100.0
                },
                timeout=10
            )
            
            if response.status_code == 400:
                data = response.json()
                error_message = data.get("detail", "").lower()
                if ("trading paused" in error_message or "insufficient platform liquidity" in error_message):
                    self.log_test("Trading Execute Zero Liquidity", True, "Correctly rejected trade on paused pair")
                    return True
                else:
                    self.log_test("Trading Execute Zero Liquidity", False, f"Wrong error message: {data.get('detail')}")
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success"):
                    error_message = data.get("message", "").lower()
                    if ("trading paused" in error_message or "insufficient platform liquidity" in error_message):
                        self.log_test("Trading Execute Zero Liquidity", True, "Correctly rejected trade on paused pair")
                        return True
                    else:
                        self.log_test("Trading Execute Zero Liquidity", False, f"Wrong error message: {data.get('message')}")
                else:
                    self.log_test("Trading Execute Zero Liquidity", False, "Should have rejected zero liquidity trade", data)
            else:
                self.log_test("Trading Execute Zero Liquidity", False, f"Unexpected status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Trading Execute Zero Liquidity", False, f"Request failed: {str(e)}")
            
        return False
    
    def execute_concurrent_trade(self, user_id, amount):
        """Helper function to execute a single trade (for concurrent testing)"""
        try:
            response = requests.post(
                f"{BASE_URL}/trading/execute",
                json={
                    "user_id": user_id,
                    "pair": "BTC/GBP",
                    "type": "buy",
                    "amount": amount,
                    "price": 45000.0
                },
                timeout=10
            )
            return response
        except Exception as e:
            return None
    
    def test_concurrent_trading(self):
        """Test concurrent trades to verify MongoDB transaction atomicity"""
        print("\n=== Testing Concurrent Trading - MongoDB Atomicity ===")
        
        if not self.trader1_user_id or not self.trader2_user_id:
            self.log_test("Concurrent Trading", False, "Need both trader user IDs")
            return False
        
        # First, ensure we have exactly 1.0 BTC liquidity for this test
        try:
            # Remove all BTC liquidity first
            self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/remove",
                json={"currency": "BTC", "amount": 10.0},  # Remove more than available to clear
                timeout=10
            )
            
            # Add exactly 1.0 BTC
            response = self.session.post(
                f"{BASE_URL}/admin/trading-liquidity/add",
                json={"currency": "BTC", "amount": 1.0},
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Concurrent Trading Setup", False, "Failed to add 1.0 BTC liquidity")
                return False
                
        except Exception as e:
            self.log_test("Concurrent Trading Setup", False, f"Setup failed: {str(e)}")
            return False
        
        # Now test concurrent trades: 2 users trying to buy 0.6 BTC each (total 1.2 BTC, but only 1.0 available)
        print("Executing concurrent trades: 2 users buying 0.6 BTC each...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # Submit both trades simultaneously
            future1 = executor.submit(self.execute_concurrent_trade, self.trader1_user_id, 0.6)
            future2 = executor.submit(self.execute_concurrent_trade, self.trader2_user_id, 0.6)
            
            # Get results
            response1 = future1.result()
            response2 = future2.result()
        
        # Analyze results
        success_count = 0
        failure_count = 0
        
        if response1 and response1.status_code == 200:
            data1 = response1.json()
            if data1.get("success"):
                success_count += 1
                self.log_test("Concurrent Trade 1", True, "Trader 1 trade succeeded")
            else:
                failure_count += 1
                self.log_test("Concurrent Trade 1", True, f"Trader 1 trade failed: {data1.get('message', 'Unknown error')}")
        elif response1 and response1.status_code == 400:
            failure_count += 1
            self.log_test("Concurrent Trade 1", True, "Trader 1 trade correctly rejected")
        else:
            self.log_test("Concurrent Trade 1", False, "Trader 1 trade had unexpected response")
        
        if response2 and response2.status_code == 200:
            data2 = response2.json()
            if data2.get("success"):
                success_count += 1
                self.log_test("Concurrent Trade 2", True, "Trader 2 trade succeeded")
            else:
                failure_count += 1
                self.log_test("Concurrent Trade 2", True, f"Trader 2 trade failed: {data2.get('message', 'Unknown error')}")
        elif response2 and response2.status_code == 400:
            failure_count += 1
            self.log_test("Concurrent Trade 2", True, "Trader 2 trade correctly rejected")
        else:
            self.log_test("Concurrent Trade 2", False, "Trader 2 trade had unexpected response")
        
        # Verify exactly one succeeded and one failed
        if success_count == 1 and failure_count == 1:
            # Check final liquidity to ensure it's exactly 0.4 BTC (1.0 - 0.6)
            try:
                response = self.session.get(f"{BASE_URL}/admin/trading-liquidity", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "liquidity" in data:
                        btc_liquidity = next((item for item in data["liquidity"] if item.get("currency") == "BTC"), None)
                        if btc_liquidity:
                            available = btc_liquidity.get("available", 0)
                            if abs(available - 0.4) < 0.001:  # Allow for small floating point differences
                                self.log_test(
                                    "Concurrent Trading Atomicity", 
                                    True, 
                                    f"Perfect atomicity: 1 success, 1 failure, final liquidity: {available} BTC"
                                )
                                return True
                            else:
                                self.log_test(
                                    "Concurrent Trading Atomicity", 
                                    False, 
                                    f"Liquidity inconsistent: expected ~0.4 BTC, got {available} BTC"
                                )
                        else:
                            self.log_test("Concurrent Trading Atomicity", False, "BTC liquidity data not found")
                    else:
                        self.log_test("Concurrent Trading Atomicity", False, "Invalid liquidity response")
                else:
                    self.log_test("Concurrent Trading Atomicity", False, "Failed to check final liquidity")
            except Exception as e:
                self.log_test("Concurrent Trading Atomicity", False, f"Failed to verify final state: {str(e)}")
        else:
            self.log_test(
                "Concurrent Trading Atomicity", 
                False, 
                f"Expected 1 success + 1 failure, got {success_count} successes + {failure_count} failures"
            )
        
        return False
    
    def run_all_tests(self):
        """Run all trading system tests"""
        print("🚀 STARTING COMPREHENSIVE TRADING SYSTEM BACKEND TESTING")
        print("=" * 80)
        
        # Setup
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Aborting tests.")
            return
        
        # Test Flow
        test_methods = [
            self.test_get_trading_pairs,
            self.test_get_admin_trading_liquidity,
            self.test_add_trading_liquidity,
            self.test_remove_trading_liquidity,
            self.test_trading_execute_single,
            self.test_trading_execute_insufficient_liquidity,
            self.test_trading_execute_zero_liquidity,
            self.test_concurrent_trading
        ]
        
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                print(f"❌ Test {test_method.__name__} crashed: {str(e)}")
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TRADING SYSTEM TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n🎯 CRITICAL FINDINGS:")
        critical_tests = [
            "Get Trading Pairs",
            "Get Admin Trading Liquidity", 
            "Add BTC Liquidity",
            "Trading Execute Single BUY",
            "Concurrent Trading Atomicity"
        ]
        
        for test_name in critical_tests:
            result = next((r for r in self.test_results if test_name in r["test"]), None)
            if result:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}: {result['message']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = TradingSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)