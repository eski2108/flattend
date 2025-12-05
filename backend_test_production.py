#!/usr/bin/env python3
"""
CoinHubX Production Readiness Backend Testing Suite
Testing all major features for production deployment at coinhubx.net
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

# Production Backend URL - using internal URL since external domain redirects to lander
BACKEND_URL = "http://localhost:8001"

class CoinHubXProductionTester:
    """CoinHubX Production Backend API Tester"""
    
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.session = None
        self.test_results = []
        self.test_users = []
        self.user_tokens = {}
        self.admin_token = None
        
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
            "test_name": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "performance_ms": performance_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, timeout: int = 30) -> tuple:
        """Make HTTP request and return (success, response_data, status_code, performance_ms)"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        start_time = time.time()
        
        try:
            request_headers = {"Content-Type": "application/json"}
            if headers:
                request_headers.update(headers)
            
            async with self.session.request(
                method=method,
                url=url,
                json=data if data else None,
                headers=request_headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                performance_ms = (time.time() - start_time) * 1000
                
                try:
                    response_data = await response.json()
                except:
                    response_data = {"text": await response.text()}
                
                return response.status < 400, response_data, response.status, performance_ms
                
        except Exception as e:
            performance_ms = (time.time() - start_time) * 1000
            return False, {"error": str(e)}, 0, performance_ms
    
    def generate_test_user(self) -> Dict:
        """Generate test user data"""
        random_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return {
            "full_name": f"Test User {random_id}",
            "email": f"test_{random_id}@coinhubx.net",
            "phone_number": f"+44770090{random.randint(1000, 9999)}",
            "password": "TestPass123!",
            "country_code": "+44"
        }
    
    async def test_health_check(self):
        """Test basic health check"""
        success, data, status, perf = await self.make_request("GET", "/health")
        self.log_test(
            "Health Check",
            success and status == 200,
            f"Status: {status}, Service: {data.get('service', 'unknown')}",
            data if not success else None,
            perf
        )
        return success
    
    async def test_user_registration(self):
        """Test user registration flow"""
        user_data = self.generate_test_user()
        self.test_users.append(user_data)
        
        success, data, status, perf = await self.make_request("POST", "/auth/register", user_data)
        
        registration_success = success and data.get("success", False)
        self.log_test(
            "User Registration",
            registration_success,
            f"Status: {status}, User: {user_data['email']}",
            data if not registration_success else None,
            perf
        )
        
        return registration_success, user_data
    
    async def test_user_login(self, user_data: Dict):
        """Test user login flow"""
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        success, data, status, perf = await self.make_request("POST", "/auth/login", login_data)
        
        login_success = success and data.get("success", False)
        if login_success and "token" in data:
            self.user_tokens[user_data["email"]] = data["token"]
        
        self.log_test(
            "User Login",
            login_success,
            f"Status: {status}, Token received: {'token' in data}",
            data if not login_success else None,
            perf
        )
        
        return login_success, data.get("token")
    
    async def test_admin_login(self):
        """Test admin login with provided credentials"""
        admin_data = {
            "email": "admin@coinhubx.net",
            "password": "Admin@2025!Change"
        }
        
        success, data, status, perf = await self.make_request("POST", "/auth/login", admin_data)
        
        admin_success = success and data.get("success", False)
        if admin_success and "token" in data:
            self.admin_token = data["token"]
        
        self.log_test(
            "Admin Login",
            admin_success,
            f"Status: {status}, Admin access: {admin_success}",
            data if not admin_success else None,
            perf
        )
        
        return admin_success
    
    async def test_wallet_balances(self, token: str, user_id: str):
        """Test wallet balance retrieval"""
        headers = {"Authorization": f"Bearer {token}"}
        success, data, status, perf = await self.make_request("GET", f"/wallets/balances/{user_id}", headers=headers)
        
        balances_success = success and data.get("success", False)
        self.log_test(
            "Wallet Balances",
            balances_success,
            f"Status: {status}, Success: {data.get('success', False)}",
            data if not balances_success else None,
            perf
        )
        
        return balances_success
    
    async def test_live_prices(self):
        """Test live price data"""
        success, data, status, perf = await self.make_request("GET", "/prices/live")
        
        prices_success = success and isinstance(data.get("prices"), dict)
        self.log_test(
            "Live Prices",
            prices_success,
            f"Status: {status}, Price count: {len(data.get('prices', {}))}",
            data if not prices_success else None,
            perf
        )
        
        return prices_success
    
    async def test_p2p_marketplace(self):
        """Test P2P marketplace endpoints"""
        # Test P2P offers
        success, data, status, perf = await self.make_request("GET", "/p2p/offers")
        
        p2p_success = success and isinstance(data.get("offers"), list)
        self.log_test(
            "P2P Marketplace Offers",
            p2p_success,
            f"Status: {status}, Offers count: {len(data.get('offers', []))}",
            data if not p2p_success else None,
            perf
        )
        
        # Test P2P statistics
        success2, data2, status2, perf2 = await self.make_request("GET", "/p2p/statistics")
        
        stats_success = success2 and "statistics" in data2
        self.log_test(
            "P2P Statistics",
            stats_success,
            f"Status: {status2}, Stats available: {stats_success}",
            data2 if not stats_success else None,
            perf2
        )
        
        return p2p_success and stats_success
    
    async def test_instant_buy_flow(self, token: str, user_id: str):
        """Test instant buy functionality"""
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test instant buy quote using admin liquidity
        quote_data = {
            "user_id": user_id,
            "crypto": "BTC",
            "amount": 0.001,
            "type": "buy"
        }
        
        success, data, status, perf = await self.make_request("POST", "/admin-liquidity/quote", quote_data, headers=headers)
        
        quote_success = success and data.get("success", False)
        self.log_test(
            "Instant Buy Quote",
            quote_success,
            f"Status: {status}, Quote success: {data.get('success', False)}",
            data if not quote_success else None,
            perf
        )
        
        return quote_success
    
    async def test_admin_liquidity_panel(self):
        """Test admin liquidity management panel"""
        if not self.admin_token:
            self.log_test("Admin Liquidity Panel", False, "No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test liquidity status
        success, data, status, perf = await self.make_request("GET", "/admin/liquidity/status", headers=headers)
        
        liquidity_success = success and "liquidity" in data
        self.log_test(
            "Admin Liquidity Status",
            liquidity_success,
            f"Status: {status}, Liquidity data available: {liquidity_success}",
            data if not liquidity_success else None,
            perf
        )
        
        return liquidity_success
    
    async def test_referral_system(self, token: str):
        """Test referral system functionality"""
        headers = {"Authorization": f"Bearer {token}"}
        
        success, data, status, perf = await self.make_request("GET", "/referral/stats", headers=headers)
        
        referral_success = success and "referral_stats" in data
        self.log_test(
            "Referral System",
            referral_success,
            f"Status: {status}, Referral stats available: {referral_success}",
            data if not referral_success else None,
            perf
        )
        
        return referral_success
    
    async def test_domain_consistency(self):
        """Test that all endpoints use coinhubx.net domain"""
        domain_test = BACKEND_URL == "https://coinhubx.net"
        self.log_test(
            "Domain Consistency",
            domain_test,
            f"Backend URL: {BACKEND_URL}, Expected: https://coinhubx.net"
        )
        
        return domain_test
    
    async def run_comprehensive_tests(self):
        """Run all production readiness tests"""
        print("🚀 Starting CoinHubX Production Readiness Testing")
        print(f"🌐 Testing Backend: {BACKEND_URL}")
        print("=" * 60)
        
        # Test domain consistency first
        await self.test_domain_consistency()
        
        # Basic health check
        health_ok = await self.test_health_check()
        if not health_ok:
            print("❌ Health check failed - aborting tests")
            return
        
        # Test user registration and login flow
        reg_success, user_data = await self.test_user_registration()
        if reg_success:
            login_success, token = await self.test_user_login(user_data)
            
            if login_success and token:
                # Test authenticated endpoints
                await self.test_wallet_balances(token)
                await self.test_instant_buy_flow(token)
                await self.test_referral_system(token)
        
        # Test admin functionality
        admin_success = await self.test_admin_login()
        if admin_success:
            await self.test_admin_liquidity_panel()
        
        # Test public endpoints
        await self.test_live_prices()
        await self.test_p2p_marketplace()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 PRODUCTION READINESS TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if passed_tests < total_tests:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test_name']}: {result['details']}")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/app/test_reports/production_backend_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "success_rate": f"{success_rate:.1f}%",
                    "backend_url": BACKEND_URL,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                },
                "test_results": self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed report saved: {report_file}")
        
        return success_rate >= 80  # 80% threshold for production readiness

async def main():
    """Main test runner"""
    async with CoinHubXProductionTester() as tester:
        production_ready = await tester.run_comprehensive_tests()
        
        if production_ready:
            print("\n🎉 PRODUCTION READY!")
            return 0
        else:
            print("\n⚠️  PRODUCTION ISSUES DETECTED")
            return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))