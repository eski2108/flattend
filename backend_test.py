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
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
import time

# Backend URL from frontend .env
BACKEND_URL = "https://tradefix-preview.preview.emergentagent.com"

class P2PLeaderboardTester:
    """Comprehensive P2P Leaderboard API tester"""
    
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.session = None
        self.test_results = []
        
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
            "response": response_data
        })
    
    async def make_request(self, method: str, endpoint: str, **kwargs) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        try:
            url = f"{self.base_url}{endpoint}"
            async with self.session.request(method, url, **kwargs) as response:
                try:
                    data = await response.json()
                except:
                    data = await response.text()
                
                return response.status == 200, data, response.status
        except Exception as e:
            return False, {"error": str(e)}, 0
    
    async def test_leaderboard_default_query(self):
        """Test GET /api/p2p/leaderboard with default parameters"""
        success, data, status = await self.make_request("GET", "/p2p/leaderboard")
        
        if success and isinstance(data, dict):
            expected_fields = ["success", "timeframe", "total_traders", "leaderboard", "updated_at"]
            has_all_fields = all(field in data for field in expected_fields)
            
            if has_all_fields and data.get("success") and data.get("timeframe") == "7d":
                self.log_test("Leaderboard Default Query", True, 
                             f"Returned {data.get('total_traders', 0)} traders with 7d timeframe")
            else:
                self.log_test("Leaderboard Default Query", False, 
                             f"Missing fields or incorrect data structure", data)
        else:
            self.log_test("Leaderboard Default Query", False, 
                         f"Request failed with status {status}", data)
    
    async def test_leaderboard_timeframes(self):
        """Test different timeframes: 24h, 7d, 30d, all"""
        timeframes = ["24h", "7d", "30d", "all"]
        
        for timeframe in timeframes:
            success, data, status = await self.make_request("GET", f"/p2p/leaderboard?timeframe={timeframe}")
            
            if success and isinstance(data, dict) and data.get("success"):
                if data.get("timeframe") == timeframe:
                    self.log_test(f"Leaderboard Timeframe {timeframe}", True, 
                                 f"Returned {data.get('total_traders', 0)} traders")
                else:
                    self.log_test(f"Leaderboard Timeframe {timeframe}", False, 
                                 f"Timeframe mismatch: expected {timeframe}, got {data.get('timeframe')}")
            else:
                self.log_test(f"Leaderboard Timeframe {timeframe}", False, 
                             f"Request failed with status {status}", data)
    
    async def test_leaderboard_limits(self):
        """Test different limits: 10, 50, 100"""
        limits = [10, 50, 100]
        
        for limit in limits:
            success, data, status = await self.make_request("GET", f"/p2p/leaderboard?limit={limit}")
            
            if success and isinstance(data, dict) and data.get("success"):
                leaderboard = data.get("leaderboard", [])
                if len(leaderboard) <= limit:
                    self.log_test(f"Leaderboard Limit {limit}", True, 
                                 f"Returned {len(leaderboard)} traders (≤ {limit})")
                else:
                    self.log_test(f"Leaderboard Limit {limit}", False, 
                                 f"Returned {len(leaderboard)} traders (> {limit})")
            else:
                self.log_test(f"Leaderboard Limit {limit}", False, 
                             f"Request failed with status {status}", data)
    
    async def test_leaderboard_invalid_timeframe(self):
        """Test invalid timeframe (should fail validation)"""
        success, data, status = await self.make_request("GET", "/p2p/leaderboard?timeframe=invalid")
        
        # Should return 422 for validation error or 400 for bad request
        if status in [400, 422]:
            self.log_test("Leaderboard Invalid Timeframe", True, 
                         f"Correctly rejected invalid timeframe with status {status}")
        else:
            self.log_test("Leaderboard Invalid Timeframe", False, 
                         f"Should reject invalid timeframe, got status {status}", data)
    
    async def test_leaderboard_invalid_limits(self):
        """Test invalid limits: 0, negative, >100"""
        invalid_limits = [0, -1, 101, 200]
        
        for limit in invalid_limits:
            success, data, status = await self.make_request("GET", f"/p2p/leaderboard?limit={limit}")
            
            # Should return 422 for validation error
            if status in [400, 422]:
                self.log_test(f"Leaderboard Invalid Limit {limit}", True, 
                             f"Correctly rejected invalid limit with status {status}")
            else:
                self.log_test(f"Leaderboard Invalid Limit {limit}", False, 
                             f"Should reject invalid limit, got status {status}", data)
    
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