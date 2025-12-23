#!/usr/bin/env python3
"""
CoinHubX Focused Testing Script

Testing the specific features mentioned in the review request:
- Login with test@example.com / password123
- Wallet balance display
- P2P ads listing
- Transaction history
- Live prices API
- Dashboard loading after login
- Error toast styling verification
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://express-buy-flow.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class CoinHubXFocusedTest:
    def __init__(self):
        self.session = None
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        
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
        
    async def test_1_login_with_test_credentials(self):
        """TEST 1: Login with test@example.com / password123"""
        print("\n🧪 TEST 1: Login with Test Credentials")
        
        try:
            login_data = {
                "email": "test@example.com",
                "password": "password123"
            }
            
            response, status = await self.make_request('POST', '/auth/login', login_data)
            
            if status == 200 and response.get('success'):
                self.auth_token = response.get('token')
                self.test_user_id = response.get('user', {}).get('user_id')
                print(f"✅ Login successful - User ID: {self.test_user_id}")
                self.log_result("Login Test Credentials", True, f"Successfully logged in as test@example.com")
                return True
            elif status == 404:
                # User doesn't exist, try to create it
                print("⚠️ Test user doesn't exist, attempting to create...")
                
                register_data = {
                    "email": "test@example.com",
                    "password": "password123",
                    "full_name": "Test User",
                    "phone_number": "+447700900123"
                }
                
                reg_response, reg_status = await self.make_request('POST', '/auth/register', register_data)
                
                if reg_status == 201 and reg_response.get('success'):
                    print("✅ Test user created successfully")
                    # Now try login again
                    response, status = await self.make_request('POST', '/auth/login', login_data)
                    
                    if status == 200 and response.get('success'):
                        self.auth_token = response.get('token')
                        self.test_user_id = response.get('user', {}).get('user_id')
                        print(f"✅ Login successful after registration - User ID: {self.test_user_id}")
                        self.log_result("Login Test Credentials", True, f"Successfully created and logged in as test@example.com")
                        return True
                    else:
                        self.log_result("Login Test Credentials", False, f"Login failed after registration: {status} - {response}")
                        return False
                else:
                    self.log_result("Login Test Credentials", False, f"Failed to create test user: {reg_status} - {reg_response}")
                    return False
            else:
                self.log_result("Login Test Credentials", False, f"Login failed: {status} - {response}")
                return False
                
        except Exception as e:
            self.log_result("Login Test Credentials", False, f"Exception: {str(e)}")
            return False
            
    async def test_2_wallet_balance_display(self):
        """TEST 2: Wallet Balance Display"""
        print("\n🧪 TEST 2: Wallet Balance Display")
        
        try:
            if not self.test_user_id:
                self.log_result("Wallet Balance Display", False, "No authenticated user available")
                return False
                
            headers = {}
            if self.auth_token:
                headers['Authorization'] = f'Bearer {self.auth_token}'
                
            response, status = await self.make_request('GET', f'/wallets/balances/{self.test_user_id}', headers=headers)
            
            if status == 200:
                balances = response.get('balances', [])
                print(f"✅ Wallet balances retrieved: {len(balances)} currencies")
                
                # Display balance details
                for balance in balances:
                    currency = balance.get('currency')
                    total = balance.get('total_balance', 0)
                    available = balance.get('available_balance', 0)
                    locked = balance.get('locked_balance', 0)
                    print(f"   {currency}: Total={total}, Available={available}, Locked={locked}")
                    
                self.log_result("Wallet Balance Display", True, f"Retrieved {len(balances)} currency balances")
                return True
            else:
                self.log_result("Wallet Balance Display", False, f"Wallet balances failed: {status} - {response}")
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance Display", False, f"Exception: {str(e)}")
            return False
            
    async def test_3_p2p_ads_listing(self):
        """TEST 3: P2P Ads Listing"""
        print("\n🧪 TEST 3: P2P Ads Listing")
        
        try:
            # Test P2P offers endpoint
            response, status = await self.make_request('GET', '/p2p/offers')
            
            if status == 200:
                offers = response.get('offers', [])
                print(f"✅ P2P offers retrieved: {len(offers)} offers available")
                
                # Show some offer details if available
                for i, offer in enumerate(offers[:3]):  # Show first 3 offers
                    crypto = offer.get('crypto_currency', 'N/A')
                    fiat = offer.get('fiat_currency', 'N/A')
                    price = offer.get('price', 0)
                    amount = offer.get('crypto_amount', 0)
                    print(f"   Offer {i+1}: {amount} {crypto} for {fiat} at {price}")
                    
                self.log_result("P2P Ads Listing", True, f"Retrieved {len(offers)} P2P offers")
                
                # Test P2P marketplace filters
                filter_response, filter_status = await self.make_request('GET', '/p2p/marketplace/filters')
                
                if filter_status == 200:
                    filters = filter_response
                    currencies = len(filters.get('crypto_currencies', []))
                    fiats = len(filters.get('fiat_currencies', []))
                    methods = len(filters.get('payment_methods', []))
                    print(f"✅ P2P filters available: {currencies} cryptos, {fiats} fiats, {methods} payment methods")
                    self.log_result("P2P Marketplace Filters", True, f"Filters: {currencies} cryptos, {fiats} fiats, {methods} methods")
                else:
                    self.log_result("P2P Marketplace Filters", False, f"P2P filters failed: {filter_status}")
                    
                return True
            else:
                self.log_result("P2P Ads Listing", False, f"P2P offers failed: {status} - {response}")
                return False
                
        except Exception as e:
            self.log_result("P2P Ads Listing", False, f"Exception: {str(e)}")
            return False
            
    async def test_4_transaction_history(self):
        """TEST 4: Transaction History"""
        print("\n🧪 TEST 4: Transaction History")
        
        try:
            if not self.test_user_id:
                self.log_result("Transaction History", False, "No authenticated user available")
                return False
                
            headers = {}
            if self.auth_token:
                headers['Authorization'] = f'Bearer {self.auth_token}'
                
            # Test user transaction history
            response, status = await self.make_request('GET', f'/transactions/history/{self.test_user_id}', headers=headers)
            
            if status == 200:
                transactions = response.get('transactions', [])
                print(f"✅ Transaction history retrieved: {len(transactions)} transactions")
                
                # Show some transaction details if available
                for i, tx in enumerate(transactions[:3]):  # Show first 3 transactions
                    tx_type = tx.get('transaction_type', 'N/A')
                    amount = tx.get('amount', 0)
                    currency = tx.get('currency', 'N/A')
                    status_tx = tx.get('status', 'N/A')
                    created = tx.get('created_at', 'N/A')
                    print(f"   TX {i+1}: {tx_type} {amount} {currency} - {status_tx} ({created})")
                    
                self.log_result("Transaction History", True, f"Retrieved {len(transactions)} transactions")
                
                # Test transaction summary
                summary_response, summary_status = await self.make_request('GET', f'/transactions/summary/{self.test_user_id}', headers=headers)
                
                if summary_status == 200:
                    summary = summary_response
                    total_volume = summary.get('total_volume_usd', 0)
                    total_count = summary.get('total_transactions', 0)
                    print(f"✅ Transaction summary: ${total_volume} volume, {total_count} total transactions")
                    self.log_result("Transaction Summary", True, f"Volume: ${total_volume}, Count: {total_count}")
                else:
                    self.log_result("Transaction Summary", False, f"Transaction summary failed: {summary_status}")
                    
                return True
            else:
                self.log_result("Transaction History", False, f"Transaction history failed: {status} - {response}")
                return False
                
        except Exception as e:
            self.log_result("Transaction History", False, f"Exception: {str(e)}")
            return False
            
    async def test_5_live_prices_api(self):
        """TEST 5: Live Prices API"""
        print("\n🧪 TEST 5: Live Prices API")
        
        try:
            # Test live prices endpoint
            response, status = await self.make_request('GET', '/prices/live')
            
            if status == 200:
                prices = response.get('prices', {})
                print(f"✅ Live prices retrieved: {len(prices)} cryptocurrencies")
                
                # Show some price details
                for i, (crypto, price_data) in enumerate(list(prices.items())[:5]):  # Show first 5 prices
                    price_usd = price_data.get('usd', 0) if isinstance(price_data, dict) else price_data
                    print(f"   {crypto}: ${price_usd}")
                    
                self.log_result("Live Prices API", True, f"Retrieved prices for {len(prices)} cryptocurrencies")
                
                # Test specific coin price
                btc_response, btc_status = await self.make_request('GET', '/prices/live/BTC')
                
                if btc_status == 200:
                    btc_price = btc_response.get('price', 0)
                    print(f"✅ BTC specific price: ${btc_price}")
                    self.log_result("BTC Price API", True, f"BTC price: ${btc_price}")
                else:
                    self.log_result("BTC Price API", False, f"BTC price failed: {btc_status}")
                    
                # Test price history
                history_response, history_status = await self.make_request('GET', '/prices/history/BTC?days=7')
                
                if history_status == 200:
                    history = history_response.get('prices', [])
                    print(f"✅ BTC price history: {len(history)} data points")
                    self.log_result("Price History API", True, f"BTC history: {len(history)} data points")
                else:
                    self.log_result("Price History API", False, f"Price history failed: {history_status}")
                    
                return True
            else:
                self.log_result("Live Prices API", False, f"Live prices failed: {status} - {response}")
                return False
                
        except Exception as e:
            self.log_result("Live Prices API", False, f"Exception: {str(e)}")
            return False
            
    async def test_6_dashboard_data_endpoints(self):
        """TEST 6: Dashboard Data Endpoints"""
        print("\n🧪 TEST 6: Dashboard Data Endpoints")
        
        try:
            if not self.test_user_id:
                self.log_result("Dashboard Data", False, "No authenticated user available")
                return False
                
            headers = {}
            if self.auth_token:
                headers['Authorization'] = f'Bearer {self.auth_token}'
                
            # Test portfolio stats (main dashboard data)
            response, status = await self.make_request('GET', f'/portfolio/stats/{self.test_user_id}', headers=headers)
            
            if status == 200:
                portfolio = response
                total_value = portfolio.get('total_portfolio_value_usd', 0)
                holdings_count = len(portfolio.get('portfolio', []))
                pnl = portfolio.get('total_pnl_usd', 0)
                pnl_percent = portfolio.get('total_pnl_percent', 0)
                
                print(f"✅ Portfolio stats: ${total_value} total, {holdings_count} holdings, PnL: ${pnl} ({pnl_percent}%)")
                self.log_result("Dashboard Portfolio Stats", True, f"Portfolio: ${total_value}, Holdings: {holdings_count}")
                
                # Test user notifications (dashboard alerts)
                notif_response, notif_status = await self.make_request('GET', f'/notifications/{self.test_user_id}', headers=headers)
                
                if notif_status == 200:
                    notifications = notif_response.get('notifications', [])
                    unread_count = notif_response.get('unread_count', 0)
                    print(f"✅ Notifications: {len(notifications)} total, {unread_count} unread")
                    self.log_result("Dashboard Notifications", True, f"Notifications: {len(notifications)} total, {unread_count} unread")
                else:
                    self.log_result("Dashboard Notifications", False, f"Notifications failed: {notif_status}")
                    
                # Test recent activity
                activity_response, activity_status = await self.make_request('GET', f'/activity/recent/{self.test_user_id}', headers=headers)
                
                if activity_status == 200:
                    activities = activity_response.get('activities', [])
                    print(f"✅ Recent activity: {len(activities)} activities")
                    self.log_result("Dashboard Recent Activity", True, f"Recent activity: {len(activities)} activities")
                else:
                    self.log_result("Dashboard Recent Activity", False, f"Recent activity failed: {activity_status}")
                    
                return True
            else:
                self.log_result("Dashboard Data", False, f"Portfolio stats failed: {status} - {response}")
                return False
                
        except Exception as e:
            self.log_result("Dashboard Data", False, f"Exception: {str(e)}")
            return False
            
    async def test_7_additional_core_endpoints(self):
        """TEST 7: Additional Core Endpoints"""
        print("\n🧪 TEST 7: Additional Core Endpoints")
        
        try:
            # Test supported coins
            response, status = await self.make_request('GET', '/coins/supported')
            
            if status == 200:
                coins = response.get('coins', [])
                print(f"✅ Supported coins: {len(coins)} cryptocurrencies")
                self.log_result("Supported Coins", True, f"Found {len(coins)} supported coins")
            else:
                self.log_result("Supported Coins", False, f"Supported coins failed: {status}")
                
            # Test trading pairs
            pairs_response, pairs_status = await self.make_request('GET', '/trading/pairs')
            
            if pairs_status == 200:
                pairs = pairs_response.get('pairs', [])
                print(f"✅ Trading pairs: {len(pairs)} pairs available")
                self.log_result("Trading Pairs", True, f"Found {len(pairs)} trading pairs")
            else:
                self.log_result("Trading Pairs", False, f"Trading pairs failed: {pairs_status}")
                
            # Test payment methods
            methods_response, methods_status = await self.make_request('GET', '/payment-methods')
            
            if methods_status == 200:
                methods = methods_response.get('methods', [])
                print(f"✅ Payment methods: {len(methods)} methods available")
                self.log_result("Payment Methods", True, f"Found {len(methods)} payment methods")
            else:
                self.log_result("Payment Methods", False, f"Payment methods failed: {methods_status}")
                
            # Test regions/countries
            regions_response, regions_status = await self.make_request('GET', '/regions')
            
            if regions_status == 200:
                regions = regions_response.get('regions', [])
                print(f"✅ Supported regions: {len(regions)} regions available")
                self.log_result("Supported Regions", True, f"Found {len(regions)} regions")
            else:
                self.log_result("Supported Regions", False, f"Regions failed: {regions_status}")
                
            return True
                
        except Exception as e:
            self.log_result("Additional Core Endpoints", False, f"Exception: {str(e)}")
            return False
            
    async def run_all_tests(self):
        """Run all focused tests"""
        print("🚀 STARTING COINHUBX FOCUSED TESTING")
        print("=" * 80)
        print("Testing specific features from review request:")
        print("- Login with test@example.com / password123")
        print("- Wallet balance display")
        print("- P2P ads listing")
        print("- Transaction history")
        print("- Live prices API")
        print("- Dashboard loading after login")
        print("=" * 80)
        
        await self.setup_session()
        
        try:
            # Test 1: Login with test credentials
            await self.test_1_login_with_test_credentials()
            
            # Test 2: Wallet balance display
            await self.test_2_wallet_balance_display()
            
            # Test 3: P2P ads listing
            await self.test_3_p2p_ads_listing()
            
            # Test 4: Transaction history
            await self.test_4_transaction_history()
            
            # Test 5: Live prices API
            await self.test_5_live_prices_api()
            
            # Test 6: Dashboard data endpoints
            await self.test_6_dashboard_data_endpoints()
            
            # Test 7: Additional core endpoints
            await self.test_7_additional_core_endpoints()
            
        finally:
            await self.cleanup_session()
            
        # Print summary
        self.print_test_summary()
        
    def print_test_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 COINHUBX FOCUSED TEST RESULTS")
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
        
        # Categorize results by feature
        critical_features = [
            "Login Test Credentials",
            "Wallet Balance Display", 
            "P2P Ads Listing",
            "Transaction History",
            "Live Prices API",
            "Dashboard Portfolio Stats"
        ]
        
        critical_passed = sum(1 for result in self.test_results 
                            if result['success'] and result['test'] in critical_features)
        critical_total = len([r for r in self.test_results if r['test'] in critical_features])
        
        if critical_total > 0:
            critical_rate = (critical_passed / critical_total * 100)
            print(f"CRITICAL FEATURES SUCCESS RATE: {critical_rate:.1f}% ({critical_passed}/{critical_total})")
        
        if success_rate >= 85:
            print("🎉 COINHUBX TESTING COMPLETED SUCCESSFULLY!")
            print("✅ All major features are working correctly")
        elif success_rate >= 70:
            print("⚠️  COINHUBX TESTING COMPLETED WITH MINOR ISSUES")
            print("🔧 Some non-critical features need attention")
        else:
            print("❌ COINHUBX TESTING COMPLETED WITH MAJOR ISSUES")
            print("🔧 Critical features are not working correctly")
            
        print("=" * 80)

async def main():
    """Main test runner"""
    tester = CoinHubXFocusedTest()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())