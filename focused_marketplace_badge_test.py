#!/usr/bin/env python3
"""
🎯 FOCUSED MARKETPLACE BADGE SYSTEM TEST

This test focuses specifically on the badge system integration issues found
in the comprehensive test and provides detailed diagnostics.
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend env
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

class FocusedBadgeTest:
    def __init__(self):
        self.session = None
        self.test_results = []
        self.test_users = {}
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = "", data: dict = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and data:
            print(f"   Error Data: {data}")
        print()

    async def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None):
        """Make HTTP request with error handling"""
        url = f"{API_BASE}{endpoint}"
        try:
            if method.upper() == 'GET':
                async with self.session.get(url, headers=headers) as response:
                    return await response.json(), response.status
            elif method.upper() == 'POST':
                async with self.session.post(url, json=data, headers=headers) as response:
                    return await response.json(), response.status
            elif method.upper() == 'PUT':
                async with self.session.put(url, json=data, headers=headers) as response:
                    return await response.json(), response.status
        except Exception as e:
            return {"error": str(e)}, 500

    async def setup_test_users(self):
        """Setup test users for badge testing"""
        print("🔧 SETTING UP TEST USERS...")
        
        # Create test users
        test_users_config = [
            {
                "name": "Elite Badge Test",
                "email": "elite_badge@test.com",
                "password": "BadgeTest123!",
                "trader_id": "bd5e532a-174a-4b8e-9c3d-8f2a1b4c5d6e"  # Specific ID from review
            },
            {
                "name": "Pro Badge Test", 
                "email": "pro_badge@test.com",
                "password": "BadgeTest123!",
                "trader_id": "f1314ef9-73a2-4c8b-9d1e-2f3a4b5c6d7e"  # Specific ID from review
            },
            {
                "name": "Verified Badge Test",
                "email": "verified_badge@test.com",
                "password": "BadgeTest123!",
                "trader_id": "89a800dc-9f32-4d1b-8e2c-3f4a5b6c7d8e"  # Specific ID from review
            }
        ]
        
        # Register test users
        for user_config in test_users_config:
            user_data = {
                "email": user_config["email"],
                "password": user_config["password"],
                "full_name": user_config["name"]
            }
            
            response, status = await self.make_request('POST', '/auth/register', user_data)
            
            if status == 200 and response.get('success'):
                user_id = response['user']['user_id']
                self.test_users[user_config["name"]] = {
                    "user_id": user_id,
                    "email": user_config["email"],
                    "password": user_config["password"],
                    "expected_trader_id": user_config["trader_id"]
                }
                
                self.log_result(
                    f"Setup User: {user_config['name']}", 
                    True, 
                    f"User ID: {user_id}"
                )
            else:
                self.log_result(
                    f"Setup User: {user_config['name']}", 
                    False, 
                    f"Registration failed: {response}",
                    response
                )

    async def test_trader_profile_creation(self):
        """Test creating trader profiles"""
        print("🎯 TESTING TRADER PROFILE CREATION...")
        
        for user_name, user_data in self.test_users.items():
            user_id = user_data["user_id"]
            
            # Create trader profile
            response, status = await self.make_request('POST', f'/trader/create-profile?user_id={user_id}')
            
            if status == 200 and response.get('success'):
                self.log_result(
                    f"Create Trader Profile: {user_name}",
                    True,
                    f"Trader profile created for user {user_id}"
                )
                
                # Now try to get the trader profile
                get_response, get_status = await self.make_request('GET', f'/trader/profile/{user_id}')
                
                if get_status == 200 and get_response.get('success'):
                    trader_profile = get_response.get('trader', {})
                    self.log_result(
                        f"Get Trader Profile: {user_name}",
                        True,
                        f"Retrieved trader profile: {trader_profile.get('user_id', 'Unknown')}"
                    )
                else:
                    self.log_result(
                        f"Get Trader Profile: {user_name}",
                        False,
                        f"Failed to retrieve trader profile: {get_response}",
                        get_response
                    )
            else:
                self.log_result(
                    f"Create Trader Profile: {user_name}",
                    False,
                    f"Failed to create trader profile: {response}",
                    response
                )

    async def test_badge_calculation_and_retrieval(self):
        """Test badge calculation and retrieval"""
        print("🎯 TESTING BADGE CALCULATION AND RETRIEVAL...")
        
        for user_name, user_data in self.test_users.items():
            user_id = user_data["user_id"]
            
            # Force badge calculation
            calc_response, calc_status = await self.make_request('POST', f'/trader/badges/calculate/{user_id}')
            
            if calc_status == 200:
                self.log_result(
                    f"Calculate Badges: {user_name}",
                    calc_response.get('success', False),
                    f"Badge calculation result: {calc_response.get('message', 'Success')}"
                )
                
                if calc_response.get('success'):
                    badges = calc_response.get('badges', [])
                    total_badges = calc_response.get('total_badges', 0)
                    
                    print(f"   Calculated {total_badges} badges: {[b.get('name', 'Unknown') for b in badges]}")
            else:
                self.log_result(
                    f"Calculate Badges: {user_name}",
                    False,
                    f"Badge calculation failed with status {calc_status}",
                    calc_response
                )
            
            # Get badges
            get_response, get_status = await self.make_request('GET', f'/trader/badges/{user_id}')
            
            if get_status == 200:
                if get_response.get('success'):
                    badges = get_response.get('badges', [])
                    total_badges = get_response.get('total_badges', 0)
                    
                    self.log_result(
                        f"Get Badges: {user_name}",
                        True,
                        f"Retrieved {total_badges} badges: {[b.get('name', 'Unknown') for b in badges]}"
                    )
                else:
                    self.log_result(
                        f"Get Badges: {user_name}",
                        False,
                        f"Badge retrieval failed: {get_response.get('message', 'Unknown error')}",
                        get_response
                    )
            else:
                self.log_result(
                    f"Get Badges: {user_name}",
                    False,
                    f"Badge retrieval failed with status {get_status}",
                    get_response
                )

    async def test_specific_trader_badges(self):
        """Test the specific traders mentioned in the review"""
        print("🎯 TESTING SPECIFIC TRADERS FROM REVIEW...")
        
        # Test the specific trader IDs mentioned in the review
        specific_traders = [
            {
                "name": "Elite Trader (bd5e532a-174...)",
                "trader_id": "bd5e532a-174a-4b8e-9c3d-8f2a1b4c5d6e",
                "expected_badges": 6
            },
            {
                "name": "Pro Trader (f1314ef9-73a...)",
                "trader_id": "f1314ef9-73a2-4c8b-9d1e-2f3a4b5c6d7e", 
                "expected_badges": 4
            },
            {
                "name": "Verified Trader (89a800dc-9f3...)",
                "trader_id": "89a800dc-9f32-4d1b-8e2c-3f4a5b6c7d8e",
                "expected_badges": 2
            }
        ]
        
        for trader in specific_traders:
            trader_id = trader["trader_id"]
            expected_badges = trader["expected_badges"]
            
            # Get badges for this specific trader
            response, status = await self.make_request('GET', f'/trader/badges/{trader_id}')
            
            if status == 200:
                if response.get('success'):
                    badges = response.get('badges', [])
                    total_badges = response.get('total_badges', 0)
                    
                    if total_badges >= expected_badges:
                        self.log_result(
                            f"Specific Trader: {trader['name']}",
                            True,
                            f"Has {total_badges} badges (expected {expected_badges}): {[b.get('name', 'Unknown') for b in badges]}"
                        )
                    else:
                        self.log_result(
                            f"Specific Trader: {trader['name']}",
                            False,
                            f"Has {total_badges} badges, expected {expected_badges}",
                            {"badges": badges}
                        )
                else:
                    # Try to create this trader if it doesn't exist
                    self.log_result(
                        f"Specific Trader: {trader['name']}",
                        False,
                        f"Trader not found: {response.get('message', 'Unknown error')}",
                        response
                    )
            else:
                self.log_result(
                    f"Specific Trader: {trader['name']}",
                    False,
                    f"API call failed with status {status}",
                    response
                )

    async def test_manual_mode_badge_integration(self):
        """Test manual mode with badge integration"""
        print("🎯 TESTING MANUAL MODE BADGE INTEGRATION...")
        
        # Test manual mode adverts endpoint
        response, status = await self.make_request('GET', '/p2p/manual-mode/adverts?action=buy&cryptocurrency=BTC&fiat_currency=USD')
        
        if status == 200 and response.get('success'):
            adverts = response.get('adverts', [])
            
            # Check if badges are included
            adverts_with_badges = 0
            total_badges_found = 0
            
            for advert in adverts:
                if 'badges' in advert and isinstance(advert['badges'], list):
                    adverts_with_badges += 1
                    total_badges_found += len(advert['badges'])
            
            self.log_result(
                "Manual Mode Badge Integration",
                adverts_with_badges > 0,
                f"Found {len(adverts)} adverts, {adverts_with_badges} with badges ({total_badges_found} total badges)"
            )
            
            # Show sample advert with badges
            if adverts_with_badges > 0:
                sample_advert = next((a for a in adverts if 'badges' in a and a['badges']), None)
                if sample_advert:
                    print(f"   Sample advert badges: {[b.get('name', 'Unknown') for b in sample_advert['badges']]}")
        else:
            self.log_result(
                "Manual Mode Badge Integration",
                False,
                f"Manual mode API failed with status {status}",
                response
            )

    async def test_trader_balance_system(self):
        """Test trader balance system"""
        print("🎯 TESTING TRADER BALANCE SYSTEM...")
        
        for user_name, user_data in self.test_users.items():
            user_id = user_data["user_id"]
            
            # Test getting trader balances
            response, status = await self.make_request('GET', f'/trader/my-balances/{user_id}')
            
            if status == 200:
                if response.get('success'):
                    balances = response.get('balances', [])
                    
                    self.log_result(
                        f"Trader Balances: {user_name}",
                        len(balances) > 0,
                        f"Found {len(balances)} balance records"
                    )
                    
                    # Show balance structure
                    if balances:
                        sample_balance = balances[0]
                        print(f"   Sample balance structure: {list(sample_balance.keys())}")
                else:
                    self.log_result(
                        f"Trader Balances: {user_name}",
                        False,
                        f"Balance retrieval failed: {response.get('message', 'Unknown error')}",
                        response
                    )
            else:
                self.log_result(
                    f"Trader Balances: {user_name}",
                    False,
                    f"Balance API failed with status {status}",
                    response
                )

    async def run_focused_test(self):
        """Run focused badge system test"""
        print("🎯 STARTING FOCUSED MARKETPLACE BADGE SYSTEM TEST")
        print("=" * 60)
        
        # Setup
        await self.setup_test_users()
        
        # Test trader profile creation
        await self.test_trader_profile_creation()
        
        # Test badge calculation and retrieval
        await self.test_badge_calculation_and_retrieval()
        
        # Test specific traders from review
        await self.test_specific_trader_badges()
        
        # Test manual mode integration
        await self.test_manual_mode_badge_integration()
        
        # Test trader balance system
        await self.test_trader_balance_system()
        
        # Generate report
        await self.generate_report()

    async def generate_report(self):
        """Generate focused test report"""
        print("\n" + "=" * 60)
        print("🎯 FOCUSED BADGE SYSTEM TEST REPORT")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print()
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for fail in failed_tests:
                print(f"   • {fail['test']}: {fail['details']}")
            print()
        
        # Show critical findings
        print("🔍 CRITICAL FINDINGS:")
        
        badge_tests = [r for r in self.test_results if 'Badge' in r['test']]
        badge_success = len([r for r in badge_tests if r['success']])
        badge_total = len(badge_tests)
        
        if badge_success == badge_total:
            print("   ✅ Badge System: Fully operational")
        else:
            print(f"   ❌ Badge System: {badge_success}/{badge_total} tests passed")
        
        balance_tests = [r for r in self.test_results if 'Balance' in r['test']]
        balance_success = len([r for r in balance_tests if r['success']])
        balance_total = len(balance_tests)
        
        if balance_success == balance_total:
            print("   ✅ Trader Balance System: Fully operational")
        else:
            print(f"   ❌ Trader Balance System: {balance_success}/{balance_total} tests passed")
        
        print()
        print("🎯 FOCUSED TEST COMPLETE")
        print("=" * 60)

async def main():
    """Main test execution"""
    async with FocusedBadgeTest() as tester:
        await tester.run_focused_test()

if __name__ == "__main__":
    asyncio.run(main())