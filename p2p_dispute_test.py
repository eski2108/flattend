#!/usr/bin/env python3
"""
P2P DISPUTE RESOLUTION FLOW TESTING

This test verifies the complete P2P dispute resolution flow:
1. Create test accounts (seller_test@coinhubx.com and buyer_test@coinhubx.com)
2. Verify login functionality
3. Create P2P sell offer
4. Start P2P trade
5. Raise dispute
6. Test admin dispute detail page access
7. Test dispute resolution (release crypto to buyer or return to seller)

Backend URL: https://nowpay-debug.preview.emergentagent.com
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://nowpay-debug.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class P2PDisputeTest:
    def __init__(self):
        self.session = None
        self.test_results = []
        self.seller_data = None
        self.buyer_data = None
        self.sell_offer_id = None
        self.trade_id = None
        self.dispute_id = None
        
    async def setup_session(self):
        """Setup HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
            
    async def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request to backend"""
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
            print(f"❌ Request failed: {method} {url} - {str(e)}")
            return {"error": str(e)}, 500
            
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
    async def test_1_create_test_accounts(self):
        """TEST 1: Create test accounts"""
        print("\n🧪 TEST 1: Creating Test Accounts")
        
        try:
            # Create seller account
            seller_data = {
                "email": "seller_test@coinhubx.com",
                "password": "TestPassword123!",
                "full_name": "Test Seller",
                "phone_number": "+447700900001"
            }
            
            response, status = await self.make_request('POST', '/auth/register', seller_data)
            
            if status == 201 and response.get('success'):
                self.seller_data = {
                    'user_id': response.get('user_id'),
                    'email': seller_data['email'],
                    'password': seller_data['password']
                }
                print(f"✅ Seller account created: {self.seller_data['user_id']}")
                self.log_result("Create Seller Account", True, f"Seller created with ID: {self.seller_data['user_id']}")
            elif response.get('user_id'):
                # Account might already exist
                self.seller_data = {
                    'user_id': response.get('user_id'),
                    'email': seller_data['email'],
                    'password': seller_data['password']
                }
                print(f"✅ Seller account exists: {self.seller_data['user_id']}")
                self.log_result("Create Seller Account", True, f"Seller account exists: {self.seller_data['user_id']}")
            elif 'already registered' in str(response.get('detail', '')):
                # Account already exists, try to login to get user_id
                login_response, login_status = await self.make_request('POST', '/auth/login', {
                    'email': seller_data['email'],
                    'password': seller_data['password']
                })
                if login_status == 200 and login_response.get('success'):
                    user_info = login_response.get('user', {})
                    self.seller_data = {
                        'user_id': user_info.get('user_id') or login_response.get('user_id'),
                        'email': seller_data['email'],
                        'password': seller_data['password']
                    }
                    print(f"✅ Seller account already exists: {self.seller_data['user_id']}")
                    self.log_result("Create Seller Account", True, f"Seller account exists: {self.seller_data['user_id']}")
                else:
                    print(f"❌ Seller account exists but login failed: {login_response}")
                    self.log_result("Create Seller Account", False, f"Account exists but login failed: {login_response}")
                    return False
            else:
                print(f"❌ Failed to create seller account: {response}")
                self.log_result("Create Seller Account", False, f"Registration failed: {response}")
                return False
                
            # Create buyer account
            buyer_data = {
                "email": "buyer_test@coinhubx.com",
                "password": "TestPassword123!",
                "full_name": "Test Buyer",
                "phone_number": "+447700900002"
            }
            
            response, status = await self.make_request('POST', '/auth/register', buyer_data)
            
            if status == 201 and response.get('success'):
                self.buyer_data = {
                    'user_id': response.get('user_id'),
                    'email': buyer_data['email'],
                    'password': buyer_data['password']
                }
                print(f"✅ Buyer account created: {self.buyer_data['user_id']}")
                self.log_result("Create Buyer Account", True, f"Buyer created with ID: {self.buyer_data['user_id']}")
            elif response.get('user_id'):
                # Account might already exist
                self.buyer_data = {
                    'user_id': response.get('user_id'),
                    'email': buyer_data['email'],
                    'password': buyer_data['password']
                }
                print(f"✅ Buyer account exists: {self.buyer_data['user_id']}")
                self.log_result("Create Buyer Account", True, f"Buyer account exists: {self.buyer_data['user_id']}")
            elif 'already registered' in str(response.get('detail', '')):
                # Account already exists, try to login to get user_id
                login_response, login_status = await self.make_request('POST', '/auth/login', {
                    'email': buyer_data['email'],
                    'password': buyer_data['password']
                })
                if login_status == 200 and login_response.get('success'):
                    user_info = login_response.get('user', {})
                    self.buyer_data = {
                        'user_id': user_info.get('user_id') or login_response.get('user_id'),
                        'email': buyer_data['email'],
                        'password': buyer_data['password']
                    }
                    print(f"✅ Buyer account already exists: {self.buyer_data['user_id']}")
                    self.log_result("Create Buyer Account", True, f"Buyer account exists: {self.buyer_data['user_id']}")
                else:
                    print(f"❌ Buyer account exists but login failed: {login_response}")
                    self.log_result("Create Buyer Account", False, f"Account exists but login failed: {login_response}")
                    return False
            else:
                print(f"❌ Failed to create buyer account: {response}")
                self.log_result("Create Buyer Account", False, f"Registration failed: {response}")
                return False
                
            return True
            
        except Exception as e:
            self.log_result("Create Test Accounts", False, f"Exception: {str(e)}")
            return False
            
    async def test_2_verify_login(self):
        """TEST 2: Verify login functionality"""
        print("\n🧪 TEST 2: Verifying Login Functionality")
        
        try:
            # Test seller login
            seller_login = {
                "email": self.seller_data['email'],
                "password": self.seller_data['password']
            }
            
            response, status = await self.make_request('POST', '/auth/login', seller_login)
            
            if status == 200 and response.get('success'):
                print(f"✅ Seller login successful")
                self.log_result("Seller Login", True, "Seller can login successfully")
            else:
                print(f"❌ Seller login failed: {response}")
                self.log_result("Seller Login", False, f"Login failed: {response}")
                return False
                
            # Test buyer login
            buyer_login = {
                "email": self.buyer_data['email'],
                "password": self.buyer_data['password']
            }
            
            response, status = await self.make_request('POST', '/auth/login', buyer_login)
            
            if status == 200 and response.get('success'):
                print(f"✅ Buyer login successful")
                self.log_result("Buyer Login", True, "Buyer can login successfully")
            else:
                print(f"❌ Buyer login failed: {response}")
                self.log_result("Buyer Login", False, f"Login failed: {response}")
                return False
                
            return True
            
        except Exception as e:
            self.log_result("Verify Login", False, f"Exception: {str(e)}")
            return False
            
    async def test_3_create_p2p_sell_offer(self):
        """TEST 3: Create P2P sell offer"""
        print("\n🧪 TEST 3: Creating P2P Sell Offer")
        
        try:
            # Create a sell offer
            sell_offer_data = {
                "seller_id": self.seller_data['user_id'],
                "crypto_currency": "BTC",
                "crypto_amount": 0.01,
                "fiat_currency": "GBP",
                "price_per_unit": 50000,
                "min_purchase": 100,
                "max_purchase": 500,
                "payment_methods": ["bank_transfer"],
                "terms": "Test sell offer for dispute testing"
            }
            
            response, status = await self.make_request('POST', '/p2p/create-offer', sell_offer_data)
            
            if status == 201 and response.get('success'):
                self.sell_offer_id = response.get('offer_id')
                print(f"✅ Sell offer created: {self.sell_offer_id}")
                self.log_result("Create Sell Offer", True, f"Sell offer created: {self.sell_offer_id}")
                return True
            else:
                print(f"❌ Failed to create sell offer: {response}")
                self.log_result("Create Sell Offer", False, f"Offer creation failed: {response}")
                return False
                
        except Exception as e:
            self.log_result("Create P2P Sell Offer", False, f"Exception: {str(e)}")
            return False
            
    async def test_4_start_p2p_trade(self):
        """TEST 4: Start P2P trade"""
        print("\n🧪 TEST 4: Starting P2P Trade")
        
        try:
            if not self.sell_offer_id:
                print("❌ No sell offer available to start trade")
                self.log_result("Start P2P Trade", False, "No sell offer available")
                return False
                
            # Start a trade
            trade_data = {
                "buyer_id": self.buyer_data['user_id'],
                "offer_id": self.sell_offer_id,
                "fiat_amount": 250  # £250 worth
            }
            
            response, status = await self.make_request('POST', '/p2p/create-trade', trade_data)
            
            if status == 201 and response.get('success'):
                self.trade_id = response.get('trade_id')
                print(f"✅ Trade started: {self.trade_id}")
                self.log_result("Start P2P Trade", True, f"Trade started: {self.trade_id}")
                return True
            else:
                print(f"❌ Failed to start trade: {response}")
                self.log_result("Start P2P Trade", False, f"Trade start failed: {response}")
                return False
                
        except Exception as e:
            self.log_result("Start P2P Trade", False, f"Exception: {str(e)}")
            return False
            
    async def test_5_raise_dispute(self):
        """TEST 5: Raise dispute on trade"""
        print("\n🧪 TEST 5: Raising Dispute")
        
        try:
            if not self.trade_id:
                print("❌ No trade available to dispute")
                self.log_result("Raise Dispute", False, "No trade available")
                return False
                
            # Raise a dispute
            dispute_data = {
                "trade_id": self.trade_id,
                "user_id": self.buyer_data['user_id'],
                "reason": "payment_not_received",
                "description": "Test dispute for testing admin resolution flow"
            }
            
            response, status = await self.make_request('POST', '/p2p/disputes/create', dispute_data)
            
            if status == 201 and response.get('success'):
                self.dispute_id = response.get('dispute_id')
                print(f"✅ Dispute raised: {self.dispute_id}")
                self.log_result("Raise Dispute", True, f"Dispute created: {self.dispute_id}")
                return True
            else:
                print(f"❌ Failed to raise dispute: {response}")
                self.log_result("Raise Dispute", False, f"Dispute creation failed: {response}")
                return False
                
        except Exception as e:
            self.log_result("Raise Dispute", False, f"Exception: {str(e)}")
            return False
            
    async def test_6_admin_dispute_detail_access(self):
        """TEST 6: Test admin dispute detail page access"""
        print("\n🧪 TEST 6: Testing Admin Dispute Detail Access")
        
        try:
            # If no dispute from previous tests, create a mock dispute directly
            if not self.dispute_id:
                print("⚠️ No dispute from P2P flow, creating mock dispute for testing...")
                
                # Create a mock dispute directly
                mock_dispute_data = {
                    "trade_id": "mock-trade-" + str(uuid.uuid4())[:8],
                    "user_id": self.buyer_data['user_id'] if self.buyer_data else "mock-buyer-id",
                    "reason": "payment_not_received",
                    "description": "Mock dispute created for testing admin dispute detail access"
                }
                
                response, status = await self.make_request('POST', '/p2p/disputes/create', mock_dispute_data)
                
                if status == 201 and response.get('success'):
                    self.dispute_id = response.get('dispute_id')
                    print(f"✅ Mock dispute created: {self.dispute_id}")
                else:
                    print(f"❌ Failed to create mock dispute: {response}")
                    self.log_result("Admin Dispute Detail Access", False, "Could not create test dispute")
                    return False
                
            # Test GET /api/p2p/disputes/{dispute_id}
            response, status = await self.make_request('GET', f'/p2p/disputes/{self.dispute_id}')
            
            if status == 200 and response.get('success'):
                dispute_data = response.get('dispute')
                print(f"✅ Dispute details retrieved successfully")
                print(f"   Dispute ID: {dispute_data.get('dispute_id')}")
                print(f"   Status: {dispute_data.get('status')}")
                print(f"   Buyer ID: {dispute_data.get('buyer_id')}")
                print(f"   Seller ID: {dispute_data.get('seller_id')}")
                print(f"   Reason: {dispute_data.get('reason')}")
                
                self.log_result("Admin Dispute Detail Access", True, f"Dispute details retrieved: {dispute_data.get('dispute_id')}")
                return True
            else:
                print(f"❌ Failed to retrieve dispute details: {response}")
                self.log_result("Admin Dispute Detail Access", False, f"Dispute retrieval failed: {response}")
                return False
                
        except Exception as e:
            self.log_result("Admin Dispute Detail Access", False, f"Exception: {str(e)}")
            return False
            
    async def test_7_dispute_resolution(self):
        """TEST 7: Test dispute resolution"""
        print("\n🧪 TEST 7: Testing Dispute Resolution")
        
        try:
            if not self.dispute_id:
                print("❌ No dispute available to resolve")
                self.log_result("Dispute Resolution", False, "No dispute available")
                return False
                
            # Test dispute resolution - release to buyer
            resolution_data = {
                "admin_id": "test_admin",
                "resolution": "release_to_buyer",
                "admin_note": "Test resolution - releasing crypto to buyer after investigation"
            }
            
            response, status = await self.make_request('POST', f'/admin/disputes/{self.dispute_id}/resolve', resolution_data)
            
            if status == 200 and response.get('success'):
                print(f"✅ Dispute resolved successfully")
                print(f"   Resolution: {resolution_data['resolution']}")
                print(f"   Admin Note: {resolution_data['admin_note']}")
                
                self.log_result("Dispute Resolution", True, f"Dispute resolved: {resolution_data['resolution']}")
                
                # Verify dispute status changed
                response, status = await self.make_request('GET', f'/p2p/disputes/{self.dispute_id}')
                if status == 200 and response.get('success'):
                    dispute_data = response.get('dispute')
                    if dispute_data.get('status') == 'resolved':
                        print(f"✅ Dispute status confirmed as resolved")
                        self.log_result("Dispute Status Verification", True, "Dispute status updated to resolved")
                    else:
                        print(f"⚠️ Dispute status: {dispute_data.get('status')} (expected: resolved)")
                        self.log_result("Dispute Status Verification", False, f"Status not updated: {dispute_data.get('status')}")
                
                return True
            else:
                print(f"❌ Failed to resolve dispute: {response}")
                self.log_result("Dispute Resolution", False, f"Resolution failed: {response}")
                return False
                
        except Exception as e:
            self.log_result("Dispute Resolution", False, f"Exception: {str(e)}")
            return False
            
    async def test_8_backend_endpoints_direct(self):
        """TEST 8: Test backend endpoints directly"""
        print("\n🧪 TEST 8: Testing Backend Endpoints Directly")
        
        try:
            # Test health endpoint
            response, status = await self.make_request('GET', '/health')
            if status == 200:
                print("✅ Backend health check passed")
                self.log_result("Backend Health", True, "Backend is healthy")
            else:
                self.log_result("Backend Health", False, f"Health check failed: {status}")
                
            # Test P2P offers endpoint
            response, status = await self.make_request('GET', '/p2p/offers')
            if status == 200:
                offers = response.get('offers', [])
                print(f"✅ P2P offers endpoint working - {len(offers)} offers")
                self.log_result("P2P Offers Endpoint", True, f"Retrieved {len(offers)} offers")
            else:
                self.log_result("P2P Offers Endpoint", False, f"P2P offers failed: {status}")
                
            # Test P2P trades endpoint (if we have a trade)
            if self.trade_id:
                response, status = await self.make_request('GET', f'/p2p/trades/{self.trade_id}')
                if status == 200:
                    trade_data = response.get('trade')
                    print(f"✅ P2P trade details retrieved: {trade_data.get('trade_id')}")
                    self.log_result("P2P Trade Details", True, f"Trade details retrieved: {trade_data.get('trade_id')}")
                else:
                    self.log_result("P2P Trade Details", False, f"Trade details failed: {status}")
                    
            return True
            
        except Exception as e:
            self.log_result("Backend Endpoints Direct", False, f"Exception: {str(e)}")
            return False
            
    async def run_all_tests(self):
        """Run all P2P dispute tests"""
        print("🚀 STARTING P2P DISPUTE RESOLUTION FLOW TESTING")
        print("=" * 80)
        
        await self.setup_session()
        
        try:
            # Test 1: Create test accounts
            if not await self.test_1_create_test_accounts():
                print("❌ Failed to create test accounts - aborting tests")
                return
                
            # Test 2: Verify login
            if not await self.test_2_verify_login():
                print("❌ Login verification failed - continuing with other tests")
                
            # Test 3: Create P2P sell offer
            if not await self.test_3_create_p2p_sell_offer():
                print("❌ Failed to create sell offer - continuing with backend tests")
                
            # Test 4: Start P2P trade
            if not await self.test_4_start_p2p_trade():
                print("❌ Failed to start trade - continuing with backend tests")
                
            # Test 5: Raise dispute
            if not await self.test_5_raise_dispute():
                print("❌ Failed to raise dispute - continuing with backend tests")
                
            # Test 6: Admin dispute detail access
            await self.test_6_admin_dispute_detail_access()
            
            # Test 7: Dispute resolution
            await self.test_7_dispute_resolution()
            
            # Test 8: Backend endpoints direct
            await self.test_8_backend_endpoints_direct()
            
        finally:
            await self.cleanup_session()
            
        # Print summary
        self.print_test_summary()
        
    def print_test_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 P2P DISPUTE RESOLUTION TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\nDETAILED RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} {result['test']}: {result['message']}")
            
        print("\n" + "=" * 80)
        
        # Specific analysis for P2P dispute flow
        critical_tests = [
            "Create Seller Account",
            "Create Buyer Account", 
            "Seller Login",
            "Buyer Login",
            "Admin Dispute Detail Access",
            "Dispute Resolution"
        ]
        
        critical_passed = sum(1 for result in self.test_results 
                            if result['test'] in critical_tests and result['success'])
        critical_total = len([r for r in self.test_results if r['test'] in critical_tests])
        
        if critical_total > 0:
            critical_rate = (critical_passed / critical_total * 100)
            print(f"CRITICAL FEATURES SUCCESS RATE: {critical_rate:.1f}% ({critical_passed}/{critical_total})")
            
        if success_rate >= 70:
            print("🎉 P2P DISPUTE RESOLUTION TESTING COMPLETED!")
            if critical_rate >= 80:
                print("✅ Critical dispute resolution features are working")
            else:
                print("⚠️ Some critical features need attention")
        else:
            print("⚠️ P2P DISPUTE RESOLUTION TESTING COMPLETED WITH ISSUES")
            print("❌ Major issues found in dispute resolution flow")
            
        print("=" * 80)

async def main():
    """Main test runner"""
    tester = P2PDisputeTest()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())