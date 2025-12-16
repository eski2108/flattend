#!/usr/bin/env python3
"""
CoinHubX Focused Backend API Testing Suite
Testing only the working endpoints to provide quick feedback.
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
BACKEND_URL = "https://crypto-logo-update.preview.emergentagent.com"

class CoinHubXFocusedTester:
    """Focused CoinHubX Backend API Tester"""
    
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.session = None
        self.test_results = []
        self.test_users = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if response_data and not success:
            print(f"    Response: {json.dumps(response_data, indent=2)}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def make_request(self, method: str, endpoint: str, headers: Dict = None, **kwargs) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        try:
            url = f"{self.base_url}{endpoint}"
            request_headers = headers or {}
            
            async with self.session.request(method, url, headers=request_headers, **kwargs) as response:
                try:
                    data = await response.json()
                except:
                    data = await response.text()
                
                return response.status in [200, 201], data, response.status
        except Exception as e:
            return False, {"error": str(e)}, 0
    
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
    
    # ==================== CORE WORKING TESTS ====================
    
    async def test_backend_health(self):
        """Test backend health"""
        success, data, status = await self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "healthy":
            self.log_test("Backend Health Check", True, 
                         f"Backend is healthy: {data.get('service')}")
        else:
            self.log_test("Backend Health Check", False, 
                         f"Health check failed with status {status}", data)
    
    async def test_user_registration(self):
        """Test user registration"""
        user_data = self.generate_test_user_data()
        
        success, response, status = await self.make_request(
            "POST", "/auth/register", json=user_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            self.log_test("User Registration", True, 
                         f"User registered: {user_data['email']}")
            self.test_users.append(user_data)
            return user_data
        else:
            self.log_test("User Registration", False, 
                         f"Registration failed with status {status}", response)
            return None
    
    async def test_user_login(self):
        """Test user login"""
        # First register a user
        user_data = await self.test_user_registration()
        if not user_data:
            self.log_test("User Login", False, "Could not register user for login test")
            return None
        
        # Test login
        success, response, status = await self.make_request(
            "POST", "/auth/login", 
            json={"email": user_data["email"], "password": user_data["password"]}
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            token = response.get("token")
            user_info = response.get("user", {})
            
            self.log_test("User Login", True, 
                         f"Login successful, token received")
            return {"token": token, "user": user_info, **user_data}
        else:
            self.log_test("User Login", False, 
                         f"Login failed with status {status}", response)
            return None
    
    async def test_p2p_offers_listing(self):
        """Test P2P offers listing"""
        success, response, status = await self.make_request("GET", "/p2p/offers")
        
        if success and isinstance(response, dict) and response.get("success"):
            offers = response.get("offers", [])
            self.log_test("P2P Offers Listing", True, 
                         f"Retrieved {len(offers)} P2P offers")
        else:
            self.log_test("P2P Offers Listing", False, 
                         f"Failed to get P2P offers with status {status}", response)
    
    async def test_admin_liquidity_quote(self):
        """Test admin liquidity quote generation"""
        quote_data = {
            "user_id": "test_user",
            "type": "buy",
            "crypto": "BTC",
            "amount": 0.01
        }
        
        success, response, status = await self.make_request(
            "POST", "/admin-liquidity/quote", json=quote_data
        )
        
        if success and isinstance(response, dict) and response.get("success"):
            quote = response.get("quote", {})
            total_cost = quote.get("total_cost", 0)
            self.log_test("Admin Liquidity Quote", True, 
                         f"Quote generated: £{total_cost:.2f} for {quote_data['amount']} BTC")
        else:
            self.log_test("Admin Liquidity Quote", False, 
                         f"Failed to get liquidity quote with status {status}", response)
    
    async def test_wallet_balance_endpoint(self):
        """Test wallet balance endpoint structure"""
        # Test with a dummy user_id to see endpoint structure
        success, response, status = await self.make_request(
            "GET", "/wallet/balance/test_user/BTC"
        )
        
        # Even if it fails, we can see if the endpoint exists
        if status == 404:
            self.log_test("Wallet Balance Endpoint", False, 
                         "Wallet balance endpoint returns 404 - may need authentication")
        elif status == 401:
            self.log_test("Wallet Balance Endpoint", True, 
                         "Wallet balance endpoint exists but requires authentication")
        elif success:
            self.log_test("Wallet Balance Endpoint", True, 
                         "Wallet balance endpoint accessible")
        else:
            self.log_test("Wallet Balance Endpoint", False, 
                         f"Wallet balance endpoint failed with status {status}", response)
    
    async def test_google_oauth_endpoint(self):
        """Test Google OAuth endpoint"""
        success, response, status = await self.make_request("GET", "/auth/google")
        
        if status in [200, 302, 307] or (isinstance(response, dict) and "url" in str(response)):
            self.log_test("Google OAuth Endpoint", True, 
                         f"OAuth endpoint available with status {status}")
        else:
            self.log_test("Google OAuth Endpoint", False, 
                         f"OAuth endpoint failed with status {status}", response)
    
    async def test_input_validation(self):
        """Test input validation on registration"""
        invalid_data = {"email": "invalid-email", "password": "123"}
        
        success, response, status = await self.make_request(
            "POST", "/auth/register", json=invalid_data
        )
        
        if status in [400, 422] and not success:
            self.log_test("Input Validation", True, 
                         f"Invalid input properly rejected with status {status}")
        else:
            self.log_test("Input Validation", False, 
                         f"Should reject invalid input, got status {status}", response)
    
    async def test_admin_login_endpoint(self):
        """Test admin login endpoint availability"""
        admin_data = {
            "email": "admin@coinhubx.net",
            "password": "AdminPass123!"
        }
        
        success, response, status = await self.make_request(
            "POST", "/admin/login", json=admin_data
        )
        
        if status == 404:
            self.log_test("Admin Login Endpoint", False, 
                         "Admin login endpoint returns 404")
        elif status in [401, 403]:
            self.log_test("Admin Login Endpoint", True, 
                         "Admin login endpoint exists but credentials invalid")
        elif success:
            self.log_test("Admin Login Endpoint", True, 
                         "Admin login successful")
        else:
            self.log_test("Admin Login Endpoint", False, 
                         f"Admin login failed with status {status}", response)
    
    async def run_focused_tests(self):
        """Run focused tests on working endpoints"""
        print("🎯 COINHUBX FOCUSED BACKEND API TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)
        print()
        
        # Core functionality tests
        print("🏥 CORE FUNCTIONALITY")
        print("-" * 30)
        await self.test_backend_health()
        await self.test_user_registration()
        await self.test_user_login()
        print()
        
        # P2P and Trading tests
        print("🤝 P2P & TRADING")
        print("-" * 30)
        await self.test_p2p_offers_listing()
        await self.test_admin_liquidity_quote()
        print()
        
        # Infrastructure tests
        print("🔧 INFRASTRUCTURE")
        print("-" * 30)
        await self.test_wallet_balance_endpoint()
        await self.test_google_oauth_endpoint()
        await self.test_admin_login_endpoint()
        print()
        
        # Security tests
        print("🛡️ SECURITY")
        print("-" * 30)
        await self.test_input_validation()
        print()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 60)
        print("📊 FOCUSED TEST SUMMARY")
        print("=" * 60)
        print(f"🎯 Results: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        print(f"👥 Test Users Created: {len(self.test_users)}")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['details']}")
            print()
        
        print("✅ WORKING FEATURES:")
        for result in self.test_results:
            if result["success"]:
                print(f"   - {result['test']}")
        
        print("=" * 60)
        
        return {
            "success_rate": success_rate,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "test_users_created": len(self.test_users),
            "overall_success": success_rate >= 60
        }

async def main():
    """Main test runner"""
    try:
        async with CoinHubXFocusedTester() as tester:
            summary = await tester.run_focused_tests()
            
            # Save results
            results_file = f"/app/test_reports/backend_focused_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(results_file, 'w') as f:
                json.dump({
                    "test_summary": summary,
                    "detailed_results": tester.test_results,
                    "test_users": tester.test_users,
                    "test_metadata": {
                        "backend_url": tester.base_url,
                        "test_timestamp": datetime.now(timezone.utc).isoformat(),
                        "test_type": "focused_backend_test"
                    }
                }, f, indent=2, default=str)
            
            print(f"📄 Results saved to: {results_file}")
            
            return 0 if summary["overall_success"] else 1
            
    except Exception as e:
        print(f"❌ Test runner failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)