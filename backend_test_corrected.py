#!/usr/bin/env python3
"""
CoinHubX Corrected Backend API Testing Suite
Testing actual endpoints that exist in the backend
"""

import asyncio
import aiohttp
import json
import sys
import uuid
import random
import string
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import time

# Backend URL from frontend .env
BACKEND_URL = "https://binancelike-ui.preview.emergentagent.com"

class CoinHubXCorrectedTester:
    """CoinHubX Backend API Tester using actual endpoints"""
    
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.session = None
        self.test_results = []
        self.test_users = []
        self.user_tokens = {}
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None, performance_ms: float = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if performance_ms:
            print(f"    Performance: {performance_ms:.0f}ms")
        if response_data and not success:
            print(f"    Response: {json.dumps(response_data, indent=2)}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data,
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
        """Test user login endpoint with provided credentials"""
        # Test with provided credentials
        login_data = {
            "email": "gads21083@gmail.com",
            "password": "123456789"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/auth/login", json=login_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            token = response.get("token")
            user_info = response.get("user", {})
            
            self.log_test("User Login (Provided Credentials)", True, 
                         f"Login successful for {login_data['email']}, token received", 
                         {"user_id": user_info.get("user_id"), "has_token": bool(token)},
                         performance_ms=response_time)
            return {"token": token, "user": user_info}
        else:
            self.log_test("User Login (Provided Credentials)", False, 
                         f"Login failed with status {status}", response,
                         performance_ms=response_time)
            return None
    
    # ==================== P2P MARKETPLACE TESTS ====================
    
    async def test_p2p_marketplace_offers(self):
        """Test P2P marketplace offers endpoint"""
        success, response, status, response_time = await self.make_request("GET", "/p2p/marketplace/offers")
        
        if success and isinstance(response, dict):
            offers = response.get("offers", [])
            self.log_test("P2P Marketplace Offers", True, 
                         f"Retrieved {len(offers)} P2P offers", 
                         {"total_offers": len(offers)},
                         performance_ms=response_time)
        else:
            self.log_test("P2P Marketplace Offers", False, 
                         f"Failed to get marketplace offers with status {status}", response,
                         performance_ms=response_time)
    
    async def test_p2p_available_coins(self):
        """Test P2P available coins endpoint"""
        success, response, status, response_time = await self.make_request("GET", "/p2p/marketplace/available-coins")
        
        if success and isinstance(response, dict):
            coins = response.get("coins", [])
            self.log_test("P2P Available Coins", True, 
                         f"Retrieved {len(coins)} available coins", 
                         {"available_coins": len(coins)},
                         performance_ms=response_time)
        else:
            self.log_test("P2P Available Coins", False, 
                         f"Failed to get available coins with status {status}", response,
                         performance_ms=response_time)
    
    async def test_p2p_stats(self):
        """Test P2P statistics endpoint"""
        success, response, status, response_time = await self.make_request("GET", "/p2p/stats")
        
        if success and isinstance(response, dict):
            stats = response.get("stats", {})
            self.log_test("P2P Statistics", True, 
                         f"P2P stats retrieved successfully", 
                         stats,
                         performance_ms=response_time)
        else:
            self.log_test("P2P Statistics", False, 
                         f"Failed to get P2P stats with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== WALLET TESTS ====================
    
    async def test_wallet_balances(self):
        """Test wallet balances endpoint with authenticated user"""
        # First login to get user_id and token
        login_result = await self.test_user_login()
        if not login_result:
            self.log_test("Wallet Balances", False, "Could not login to test wallet balances")
            return
        
        user_id = login_result["user"]["user_id"]
        token = login_result["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        success, response, status, response_time = await self.make_request(
            "GET", f"/wallets/balances/{user_id}", headers=headers
        )
        
        if success and isinstance(response, dict):
            balances = response.get("balances", {})
            self.log_test("Wallet Balances", True, 
                         f"Wallet balances retrieved for user {user_id}", 
                         balances, performance_ms=response_time)
        else:
            self.log_test("Wallet Balances", False, 
                         f"Failed to get wallet balances with status {status}", response,
                         performance_ms=response_time)
    
    async def test_wallet_portfolio(self):
        """Test wallet portfolio endpoint"""
        # First login to get user_id and token
        login_result = await self.test_user_login()
        if not login_result:
            self.log_test("Wallet Portfolio", False, "Could not login to test wallet portfolio")
            return
        
        user_id = login_result["user"]["user_id"]
        token = login_result["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        success, response, status, response_time = await self.make_request(
            "GET", f"/wallets/portfolio/{user_id}", headers=headers
        )
        
        if success and isinstance(response, dict):
            portfolio = response.get("portfolio", {})
            self.log_test("Wallet Portfolio", True, 
                         f"Portfolio data retrieved for user {user_id}", 
                         portfolio, performance_ms=response_time)
        else:
            self.log_test("Wallet Portfolio", False, 
                         f"Failed to get portfolio with status {status}", response,
                         performance_ms=response_time)
    
    async def test_wallet_transactions(self):
        """Test wallet transactions endpoint"""
        # First login to get user_id and token
        login_result = await self.test_user_login()
        if not login_result:
            self.log_test("Wallet Transactions", False, "Could not login to test wallet transactions")
            return
        
        user_id = login_result["user"]["user_id"]
        token = login_result["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        success, response, status, response_time = await self.make_request(
            "GET", f"/wallets/transactions/{user_id}", headers=headers
        )
        
        if success and isinstance(response, dict):
            transactions = response.get("transactions", [])
            self.log_test("Wallet Transactions", True, 
                         f"Retrieved {len(transactions)} transactions", 
                         {"transaction_count": len(transactions)},
                         performance_ms=response_time)
        else:
            self.log_test("Wallet Transactions", False, 
                         f"Failed to get transactions with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== INSTANT BUY/SELL TESTS ====================
    
    async def test_admin_liquidity_quote(self):
        """Test admin liquidity quote endpoint"""
        quote_data = {
            "crypto_currency": "BTC",
            "crypto_amount": 0.01,
            "fiat_currency": "GBP",
            "operation": "buy"
        }
        
        success, response, status, response_time = await self.make_request(
            "POST", "/admin-liquidity/quote", json=quote_data
        )
        
        if success and isinstance(response, dict):
            quote = response.get("quote", {})
            self.log_test("Admin Liquidity Quote", True, 
                         f"Quote generated successfully", 
                         quote, performance_ms=response_time)
        else:
            self.log_test("Admin Liquidity Quote", False, 
                         f"Failed to get admin liquidity quote with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== CRYPTO MARKET TESTS ====================
    
    async def test_crypto_market_sell_orders(self):
        """Test crypto market sell orders endpoint"""
        success, response, status, response_time = await self.make_request("GET", "/crypto-market/sell/orders")
        
        if success and isinstance(response, dict):
            orders = response.get("orders", [])
            self.log_test("Crypto Market Sell Orders", True, 
                         f"Retrieved {len(orders)} sell orders", 
                         {"total_orders": len(orders)},
                         performance_ms=response_time)
        else:
            self.log_test("Crypto Market Sell Orders", False, 
                         f"Failed to get sell orders with status {status}", response,
                         performance_ms=response_time)
    
    # ==================== MAIN TEST RUNNER ====================
    
    async def run_all_tests(self):
        """Run comprehensive CoinHubX backend tests with actual endpoints"""
        print("🚀 COINHUBX CORRECTED BACKEND API TESTING")
        print("=" * 80)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"Testing with actual available endpoints")
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
        print()
        
        # 3. P2P Marketplace
        print("🤝 P2P MARKETPLACE TESTS")
        print("-" * 40)
        await self.test_p2p_marketplace_offers()
        await self.test_p2p_available_coins()
        await self.test_p2p_stats()
        print()
        
        # 4. Wallet Management
        print("💰 WALLET MANAGEMENT TESTS")
        print("-" * 40)
        await self.test_wallet_balances()
        await self.test_wallet_portfolio()
        await self.test_wallet_transactions()
        print()
        
        # 5. Instant Buy/Sell (Admin Liquidity)
        print("⚡ ADMIN LIQUIDITY TESTS")
        print("-" * 40)
        await self.test_admin_liquidity_quote()
        print()
        
        # 6. Crypto Market
        print("📈 CRYPTO MARKET TESTS")
        print("-" * 40)
        await self.test_crypto_market_sell_orders()
        print()
        
        # Generate summary
        return self.generate_test_summary()
    
    def generate_test_summary(self):
        """Generate test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 80)
        print("📊 CORRECTED TEST SUMMARY")
        print("=" * 80)
        print(f"🎯 Overall Results: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        print(f"⏱️  Test Duration: {datetime.now(timezone.utc).isoformat()}")
        print()
        
        # Show failed tests
        failed_tests_list = [r for r in self.test_results if not r["success"]]
        if failed_tests_list:
            print("❌ FAILED TESTS:")
            for failure in failed_tests_list:
                print(f"   ❌ {failure['test']}: {failure['details']}")
            print()
        
        print("=" * 80)
        
        return {
            "success_rate": success_rate,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "overall_success": success_rate >= 70
        }

async def main():
    """Main test runner"""
    try:
        async with CoinHubXCorrectedTester() as tester:
            summary = await tester.run_all_tests()
            
            # Save results
            results_file = f"/app/test_reports/backend_corrected_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(results_file, 'w') as f:
                json.dump({
                    "test_summary": summary,
                    "detailed_results": tester.test_results,
                    "test_metadata": {
                        "backend_url": tester.base_url,
                        "test_timestamp": datetime.now(timezone.utc).isoformat(),
                        "test_type": "corrected_backend_test"
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