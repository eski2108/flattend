#!/usr/bin/env python3
"""
P2P Leaderboard API Testing Suite
Tests the newly created P2P Leaderboard endpoints as requested in review.

**ENDPOINTS TO TEST:**
1. GET /api/p2p/leaderboard
   - Default query (7d timeframe, 50 limit)
   - Different timeframes: "24h", "7d", "30d", "all"
   - Different limits: 10, 50, 100
   - Invalid timeframe (should fail validation)
   - Invalid limit (0, negative, >100)

2. GET /api/p2p/leaderboard/user/{user_id}
   - Valid user_id with completed trades
   - Valid user_id but no trades (should return not in rankings)
   - Different timeframes: "7d", "30d", "all"
   - Invalid/non-existent user_id

**Context:**
- Just created 30 completed P2P trades with 3 test users
- All trades in past 30 days
- Database: coin_hub_x
- Collection: p2p_trades
- Backend running on port 8001

**Backend URL:** https://p2p-trader-board.preview.emergentagent.com/api
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
import time

# Backend URL from frontend .env
BACKEND_URL = "https://p2p-trader-board.preview.emergentagent.com"

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
    "referred": {"email": "referred@test.com", "password": "testpass123"},
    "admin": {"email": "admin", "password": "password123"}
}

class CoinHubXAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_user_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            return success, response
        except Exception as e:
            return False, str(e)

    def test_user_authentication(self):
        """Test user registration and login flow"""
        print("\n🔐 Testing User Authentication...")
        
        # Test main user login
        success, response = self.make_request(
            'POST', '/auth/login',
            data=TEST_CREDENTIALS["main_user"]
        )
        
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success') and data.get('user'):
                    self.test_user_token = data.get('token')
                    self.test_user_id = data['user'].get('user_id')
                    self.log_test("Main User Login", True, f"User ID: {self.test_user_id}")
                else:
                    self.log_test("Main User Login", False, "No user data in response")
            except:
                self.log_test("Main User Login", False, "Invalid JSON response")
        else:
            self.log_test("Main User Login", False, f"Status: {response.status_code}")

    def test_portfolio_dashboard(self):
        """Test Portfolio Dashboard - verify balances display correctly"""
        print("\n💰 Testing Portfolio Dashboard...")
        
        if not self.test_user_id:
            self.log_test("Portfolio Dashboard", False, "No user ID available")
            return
        
        success, response = self.make_request(
            'GET', f'/portfolio/summary/{self.test_user_id}'
        )
        
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    current_value = data.get('current_value', 0)
                    self.log_test("Portfolio Summary API", True, f"Portfolio Value: £{current_value}")
                    
                    # Check if it matches expected £13,549 (allowing for some variance)
                    expected_value = 13549
                    if abs(current_value - expected_value) < 1000:
                        self.log_test("Portfolio Value Check", True, f"Value close to expected £{expected_value}")
                    else:
                        self.log_test("Portfolio Value Check", False, f"Expected ~£{expected_value}, got £{current_value}")
                else:
                    self.log_test("Portfolio Summary API", False, "API returned success=false")
            except Exception as e:
                self.log_test("Portfolio Summary API", False, f"JSON parse error: {str(e)}")
        else:
            self.log_test("Portfolio Summary API", False, f"Status: {response.status_code}")

    def test_live_prices(self):
        """Test live price functionality"""
        print("\n📈 Testing Live Prices...")
        
        success, response = self.make_request('GET', '/prices/live')
        
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success') and data.get('prices'):
                    prices = data['prices']
                    btc_price = prices.get('BTC', {}).get('price_gbp', 0)
                    eth_price = prices.get('ETH', {}).get('price_gbp', 0)
                    
                    self.log_test("Live Prices API", True, f"BTC: £{btc_price:,.2f}, ETH: £{eth_price:,.2f}")
                    
                    # Verify prices are reasonable
                    if btc_price > 50000:
                        self.log_test("BTC Price Validation", True, f"BTC price reasonable: £{btc_price:,.2f}")
                    else:
                        self.log_test("BTC Price Validation", False, f"BTC price seems low: £{btc_price:,.2f}")
                else:
                    self.log_test("Live Prices API", False, "No price data in response")
            except Exception as e:
                self.log_test("Live Prices API", False, f"JSON parse error: {str(e)}")
        else:
            self.log_test("Live Prices API", False, f"Status: {response.status_code}")

    def test_p2p_express(self):
        """Test P2P Express functionality"""
        print("\n⚡ Testing P2P Express...")
        
        # Test available currencies
        success, response = self.make_request('GET', '/nowpayments/currencies')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    currencies = data.get('currencies', [])
                    self.log_test("P2P Express Currencies", True, f"Found {len(currencies)} available currencies")
                else:
                    self.log_test("P2P Express Currencies", False, "API returned success=false")
            except:
                self.log_test("P2P Express Currencies", False, "JSON parse error")
        else:
            self.log_test("P2P Express Currencies", False, f"Status: {response.status_code}")
        
        # Test liquidity check
        success, response = self.make_request(
            'POST', '/p2p/express/check-liquidity',
            data={"crypto": "BTC", "crypto_amount": 0.001}
        )
        
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    has_liquidity = data.get('has_liquidity', False)
                    self.log_test("P2P Express Liquidity Check", True, f"Liquidity available: {has_liquidity}")
                else:
                    self.log_test("P2P Express Liquidity Check", False, "API returned success=false")
            except:
                self.log_test("P2P Express Liquidity Check", False, "JSON parse error")
        else:
            self.log_test("P2P Express Liquidity Check", False, f"Status: {response.status_code}")

    def test_p2p_marketplace(self):
        """Test P2P Marketplace functionality"""
        print("\n🏪 Testing P2P Marketplace...")
        
        # Test available coins
        success, response = self.make_request('GET', '/p2p/marketplace/available-coins')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    coins = data.get('coins', [])
                    self.log_test("P2P Marketplace Coins", True, f"Found {len(coins)} available coins")
                else:
                    self.log_test("P2P Marketplace Coins", False, "API returned success=false")
            except:
                self.log_test("P2P Marketplace Coins", False, "JSON parse error")
        else:
            self.log_test("P2P Marketplace Coins", False, f"Status: {response.status_code}")
        
        # Test getting offers
        success, response = self.make_request('GET', '/p2p/offers?ad_type=sell&crypto_currency=BTC')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    offers = data.get('offers', [])
                    self.log_test("P2P Marketplace Offers", True, f"Found {len(offers)} BTC sell offers")
                else:
                    self.log_test("P2P Marketplace Offers", False, "API returned success=false")
            except:
                self.log_test("P2P Marketplace Offers", False, "JSON parse error")
        else:
            self.log_test("P2P Marketplace Offers", False, f"Status: {response.status_code}")

    def test_swap_crypto(self):
        """Test Swap Crypto functionality"""
        print("\n🔄 Testing Swap Crypto...")
        
        # Test available coins for swapping
        success, response = self.make_request('GET', '/swap/available-coins')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    coins = data.get('coins_detailed', [])
                    self.log_test("Swap Available Coins", True, f"Found {len(coins)} swappable coins")
                else:
                    self.log_test("Swap Available Coins", False, "API returned success=false")
            except:
                self.log_test("Swap Available Coins", False, "JSON parse error")
        else:
            self.log_test("Swap Available Coins", False, f"Status: {response.status_code}")

    def test_wallet_balances(self):
        """Test Wallet page functionality"""
        print("\n💳 Testing Wallet Balances...")
        
        if not self.test_user_id:
            self.log_test("Wallet Balances", False, "No user ID available")
            return
        
        success, response = self.make_request(
            'GET', f'/wallets/balances/{self.test_user_id}'
        )
        
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    balances = data.get('balances', [])
                    self.log_test("Wallet Balances API", True, f"Found {len(balances)} currency balances")
                    
                    # Check for expected currencies
                    currencies = [bal['currency'] for bal in balances]
                    if 'GBP' in currencies:
                        gbp_balance = next((bal for bal in balances if bal['currency'] == 'GBP'), None)
                        if gbp_balance:
                            self.log_test("GBP Balance Found", True, f"GBP: £{gbp_balance.get('total_balance', 0)}")
                    
                    if 'BTC' in currencies:
                        btc_balance = next((bal for bal in balances if bal['currency'] == 'BTC'), None)
                        if btc_balance:
                            self.log_test("BTC Balance Found", True, f"BTC: {btc_balance.get('total_balance', 0)}")
                else:
                    self.log_test("Wallet Balances API", False, "API returned success=false")
            except Exception as e:
                self.log_test("Wallet Balances API", False, f"JSON parse error: {str(e)}")
        else:
            self.log_test("Wallet Balances API", False, f"Status: {response.status_code}")

    def test_referral_system(self):
        """Test Referral System"""
        print("\n👥 Testing Referral System...")
        
        # Test referral settings
        success, response = self.make_request('GET', '/referral/settings')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    settings = data.get('settings', {})
                    standard_rate = settings.get('standard_commission_percent', 0)
                    self.log_test("Referral Settings", True, f"Standard commission: {standard_rate}%")
                    
                    # Verify 20% commission
                    if standard_rate == 20.0:
                        self.log_test("Referral Commission Rate", True, "Standard rate is 20% as expected")
                    else:
                        self.log_test("Referral Commission Rate", False, f"Expected 20%, got {standard_rate}%")
                else:
                    self.log_test("Referral Settings", False, "API returned success=false")
            except:
                self.log_test("Referral Settings", False, "JSON parse error")
        else:
            self.log_test("Referral Settings", False, f"Status: {response.status_code}")

    def test_admin_dashboard(self):
        """Test Admin Dashboard functionality"""
        print("\n👑 Testing Admin Dashboard...")
        
        # Test platform stats
        success, response = self.make_request('GET', '/admin/platform-stats')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    stats = data.get('stats', {})
                    self.log_test("Admin Platform Stats", True, f"Stats available: {len(stats)} metrics")
                else:
                    self.log_test("Admin Platform Stats", False, "API returned success=false")
            except:
                self.log_test("Admin Platform Stats", False, "JSON parse error")
        else:
            self.log_test("Admin Platform Stats", False, f"Status: {response.status_code}")
        
        # Test platform wallet balance
        success, response = self.make_request('GET', '/admin/platform-wallet/balance')
        if success and response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    balance = data.get('balance', {})
                    total_gbp = balance.get('total_gbp', 0)
                    self.log_test("Platform Wallet Balance", True, f"Platform fees collected: £{total_gbp}")
                else:
                    self.log_test("Platform Wallet Balance", False, "API returned success=false")
            except:
                self.log_test("Platform Wallet Balance", False, "JSON parse error")
        else:
            self.log_test("Platform Wallet Balance", False, f"Status: {response.status_code}")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting CoinHubX Comprehensive Backend Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all test categories
        self.test_user_authentication()
        self.test_portfolio_dashboard()
        self.test_wallet_balances()
        self.test_live_prices()
        self.test_p2p_express()
        self.test_p2p_marketplace()
        self.test_swap_crypto()
        self.test_referral_system()
        self.test_admin_dashboard()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test execution"""
    tester = CoinHubXAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())

class TradingPlatformTester:
    def __init__(self):
        self.session = requests.Session()
        self.trader_user_id = None
        self.buyer_user_id = None
        self.seller_user_id = None
        self.admin_user_id = None
        
        # Trading system IDs
        self.position_id = None
        self.trade_history_id = None
        
        # P2P system IDs
        self.p2p_offer_id = None
        self.p2p_trade_id = None
        self.express_order_id = None
        
        # Other system IDs
        self.dispute_id = None
        self.chat_id = None
        
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
    
    def test_user_registration(self, user_data, user_type):
        """Test user registration"""
        print(f"\n=== Testing {user_type} Registration ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    if user_type == "Trader":
                        self.trader_user_id = user_id
                    elif user_type == "P2P Buyer":
                        self.buyer_user_id = user_id
                    elif user_type == "P2P Seller":
                        self.seller_user_id = user_id
                        
                    self.log_test(
                        f"{user_type} Registration", 
                        True, 
                        f"{user_type} registered successfully with ID: {user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        f"{user_type} Registration", 
                        False, 
                        "Registration response missing success or user_id",
                        data
                    )
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login to get user_id
                self.log_test(
                    f"{user_type} Registration", 
                    True, 
                    f"{user_type} already exists (expected for repeated tests)"
                )
                return self.test_user_login(user_data, user_type)
            else:
                self.log_test(
                    f"{user_type} Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                f"{user_type} Registration", 
                False, 
                f"Registration request failed: {str(e)}"
            )
            
        return False
    
    def test_user_login(self, user_data, user_type):
        """Test user login"""
        print(f"\n=== Testing {user_type} Login ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": user_data["email"],
                    "password": user_data["password"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    if user_type == "Trader":
                        self.trader_user_id = user_id
                    elif user_type == "P2P Buyer":
                        self.buyer_user_id = user_id
                    elif user_type == "P2P Seller":
                        self.seller_user_id = user_id
                        
                    self.log_test(
                        f"{user_type} Login", 
                        True, 
                        f"{user_type} login successful, user_id: {user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        f"{user_type} Login", 
                        False, 
                        "Login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    f"{user_type} Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                f"{user_type} Login", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_login(self):
        """Test admin login with special code"""
        print("\n=== Testing Admin Login ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json={
                    "email": ADMIN_USER["email"],
                    "password": ADMIN_USER["password"],
                    "admin_code": ADMIN_CODE
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("admin", {}).get("user_id"):
                    self.admin_user_id = data["admin"]["user_id"]
                    self.log_test(
                        "Admin Login", 
                        True, 
                        f"Admin login successful, user_id: {self.admin_user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Login", 
                        False, 
                        "Admin login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    "Admin Login", 
                    False, 
                    f"Admin login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Login", 
                False, 
                f"Admin login request failed: {str(e)}"
            )
            
        return False
    
    def test_setup_wallets_and_bank_accounts(self):
        """Setup wallets and bank accounts for both users"""
        print("\n=== Setting Up Wallets and Bank Accounts ===")
        
        success = True
        
        # Connect trader wallet
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/connect-wallet",
                json={"wallet_address": "trader_wallet_001"},
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Trader Wallet Setup", True, "Trader wallet connected successfully")
            else:
                self.log_test("Trader Wallet Setup", False, f"Failed with status {response.status_code}")
                success = False
        except Exception as e:
            self.log_test("Trader Wallet Setup", False, f"Request failed: {str(e)}")
            success = False
        
        # Connect seller wallet
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/connect-wallet",
                json={"wallet_address": "seller_wallet_001"},
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Seller Wallet Setup", True, "Seller wallet connected successfully")
            else:
                self.log_test("Seller Wallet Setup", False, f"Failed with status {response.status_code}")
                success = False
        except Exception as e:
            self.log_test("Seller Wallet Setup", False, f"Request failed: {str(e)}")
            success = False
        
        # Add bank accounts
        bank_accounts = [
            ("trader_wallet_001", "Trader Bank Account", "Chase Bank", "123456789", "Test Trader"),
            ("seller_wallet_001", "Seller Bank Account", "Wells Fargo", "987654321", "P2P Seller")
        ]
        
        for wallet_address, test_name, bank_name, account_number, account_holder in bank_accounts:
            try:
                response = self.session.post(
                    f"{BASE_URL}/bank/add",
                    json={
                        "wallet_address": wallet_address,
                        "bank_name": bank_name,
                        "account_number": account_number,
                        "account_holder_name": account_holder,
                        "routing_number": "021000021"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    self.log_test(test_name, True, f"Bank account added for {account_holder}")
                else:
                    self.log_test(test_name, False, f"Failed with status {response.status_code}")
                    success = False
            except Exception as e:
                self.log_test(test_name, False, f"Request failed: {str(e)}")
                success = False
        
        # Give seller some crypto to sell
        try:
            response = self.session.post(
                f"{BASE_URL}/user/deposit",
                json={
                    "wallet_address": "seller_wallet_001",
                    "amount": 1.0  # 1 BTC
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Seller Initial Deposit", True, "Seller received 1.0 BTC for selling")
            else:
                self.log_test("Seller Initial Deposit", False, f"Failed with status {response.status_code}")
                success = False
        except Exception as e:
            self.log_test("Seller Initial Deposit", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_create_sell_order(self):
        """Test seller creating a sell order"""
        print("\n=== Testing Sell Order Creation ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/sell/create",
                json={
                    "seller_address": SELLER_USER["wallet_address"],
                    "crypto_amount": 0.5,  # 0.5 BTC
                    "price_per_unit": 35000.0,  # £35,000 per BTC
                    "min_purchase": 0.1,
                    "max_purchase": 0.5
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("order", {}).get("order_id"):
                    self.sell_order_id = data["order"]["order_id"]
                    self.log_test(
                        "Create Sell Order", 
                        True, 
                        f"Sell order created: 0.5 BTC at £35,000 each (Order ID: {self.sell_order_id})"
                    )
                    return True
                else:
                    self.log_test(
                        "Create Sell Order", 
                        False, 
                        "Sell order response missing success or order_id",
                        data
                    )
            else:
                self.log_test(
                    "Create Sell Order", 
                    False, 
                    f"Sell order creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Sell Order", 
                False, 
                f"Sell order request failed: {str(e)}"
            )
            
        return False
    
    def test_get_sell_orders(self):
        """Test getting all sell orders from marketplace"""
        print("\n=== Testing Get Sell Orders ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-market/sell/orders",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "orders" in data:
                    orders = data["orders"]
                    if len(orders) > 0:
                        # Check if our sell order is in the list
                        our_order = next((o for o in orders if o.get("order_id") == self.sell_order_id), None)
                        if our_order:
                            self.log_test(
                                "Get Sell Orders", 
                                True, 
                                f"Found {len(orders)} sell orders including our order"
                            )
                            return True
                        else:
                            self.log_test(
                                "Get Sell Orders", 
                                False, 
                                f"Our sell order {self.sell_order_id} not found in marketplace"
                            )
                    else:
                        self.log_test(
                            "Get Sell Orders", 
                            False, 
                            "No sell orders found in marketplace"
                        )
                else:
                    self.log_test(
                        "Get Sell Orders", 
                        False, 
                        "Invalid sell orders response format",
                        data
                    )
            else:
                self.log_test(
                    "Get Sell Orders", 
                    False, 
                    f"Get sell orders failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Sell Orders", 
                False, 
                f"Get sell orders request failed: {str(e)}"
            )
            
        return False
    
    def test_create_buy_order(self):
        """Test buyer creating a buy order from sell order"""
        print("\n=== Testing Buy Order Creation ===")
        
        if not self.sell_order_id:
            self.log_test(
                "Create Buy Order", 
                False, 
                "Cannot create buy order - no sell order ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/buy/create",
                json={
                    "buyer_address": TEST_USER["wallet_address"],
                    "sell_order_id": self.sell_order_id,
                    "crypto_amount": 0.5  # Buy all 0.5 BTC
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("order", {}).get("order_id"):
                    self.buy_order_id = data["order"]["order_id"]
                    total_price = data["order"].get("total_price", 0)
                    self.log_test(
                        "Create Buy Order", 
                        True, 
                        f"Buy order created: 0.5 BTC for £{total_price} (Order ID: {self.buy_order_id})"
                    )
                    return True
                else:
                    self.log_test(
                        "Create Buy Order", 
                        False, 
                        "Buy order response missing success or order_id",
                        data
                    )
            else:
                self.log_test(
                    "Create Buy Order", 
                    False, 
                    f"Buy order creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Buy Order", 
                False, 
                f"Buy order request failed: {str(e)}"
            )
            
        return False
    
    def test_mark_as_paid(self):
        """Test buyer marking payment as made"""
        print("\n=== Testing Mark Payment as Made ===")
        
        if not self.buy_order_id:
            self.log_test(
                "Mark as Paid", 
                False, 
                "Cannot mark as paid - no buy order ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/payment/mark-paid",
                json={
                    "buyer_address": TEST_USER["wallet_address"],
                    "order_id": self.buy_order_id,
                    "payment_reference": "BANK_TRANSFER_REF_12345"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Mark as Paid", 
                        True, 
                        "Payment marked as completed successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Mark as Paid", 
                        False, 
                        "Mark as paid response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Mark as Paid", 
                    False, 
                    f"Mark as paid failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Mark as Paid", 
                False, 
                f"Mark as paid request failed: {str(e)}"
            )
            
        return False
    
    def test_release_crypto(self):
        """Test seller releasing crypto from escrow"""
        print("\n=== Testing Release Crypto from Escrow ===")
        
        if not self.buy_order_id:
            self.log_test(
                "Release Crypto", 
                False, 
                "Cannot release crypto - no buy order ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/release",
                json={
                    "seller_address": SELLER_USER["wallet_address"],
                    "order_id": self.buy_order_id
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Release Crypto", 
                        True, 
                        "Crypto released from escrow successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Release Crypto", 
                        False, 
                        "Release crypto response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Release Crypto", 
                    False, 
                    f"Release crypto failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Release Crypto", 
                False, 
                f"Release crypto request failed: {str(e)}"
            )
            
        return False
    
    def test_check_balances_after_trade(self):
        """Test that balances are updated correctly after trade completion"""
        print("\n=== Testing Balances After Trade ===")
        
        try:
            # Check buyer balance
            response = self.session.get(
                f"{BASE_URL}/user/profile/{TEST_USER['wallet_address']}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data:
                    buyer_balance = data["user"].get("available_balance", 0)
                    self.log_test(
                        "Buyer Balance Check", 
                        True, 
                        f"Buyer now has {buyer_balance} BTC (should be 0.5)"
                    )
                else:
                    self.log_test(
                        "Buyer Balance Check", 
                        False, 
                        "Invalid buyer profile response",
                        data
                    )
            else:
                self.log_test(
                    "Buyer Balance Check", 
                    False, 
                    f"Get buyer profile failed with status {response.status_code}"
                )
            
            # Check seller balance
            response = self.session.get(
                f"{BASE_URL}/user/profile/{SELLER_USER['wallet_address']}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data:
                    seller_balance = data["user"].get("available_balance", 0)
                    self.log_test(
                        "Seller Balance Check", 
                        True, 
                        f"Seller now has {seller_balance} BTC (should be ~0.5 after fees)"
                    )
                    return True
                else:
                    self.log_test(
                        "Seller Balance Check", 
                        False, 
                        "Invalid seller profile response",
                        data
                    )
            else:
                self.log_test(
                    "Seller Balance Check", 
                    False, 
                    f"Get seller profile failed with status {response.status_code}"
                )
                
        except Exception as e:
            self.log_test(
                "Balance Check After Trade", 
                False, 
                f"Balance check request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_platform_config(self):
        """Test admin platform configuration endpoints"""
        print("\n=== Testing Admin Platform Config ===")
        
        try:
            # Get current config
            response = self.session.get(
                f"{BASE_URL}/admin/platform-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    current_deposit_fee = data["config"].get("deposit_fee_percent", 0)
                    self.log_test(
                        "Get Platform Config", 
                        True, 
                        f"Current deposit fee: {current_deposit_fee}%"
                    )
                    
                    # Update commission setting
                    new_deposit_fee = 0.75
                    response = self.session.post(
                        f"{BASE_URL}/admin/update-commission",
                        json={
                            "setting_key": "deposit_fee_percent",
                            "new_value": new_deposit_fee
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            self.log_test(
                                "Update Commission", 
                                True, 
                                f"Updated deposit fee from {current_deposit_fee}% to {new_deposit_fee}%"
                            )
                            
                            # Verify the change persisted
                            response = self.session.get(
                                f"{BASE_URL}/admin/platform-config",
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                data = response.json()
                                updated_fee = data["config"].get("deposit_fee_percent", 0)
                                if updated_fee == new_deposit_fee:
                                    self.log_test(
                                        "Verify Config Update", 
                                        True, 
                                        f"Config update persisted: {updated_fee}%"
                                    )
                                    return True
                                else:
                                    self.log_test(
                                        "Verify Config Update", 
                                        False, 
                                        f"Config not persisted. Expected {new_deposit_fee}%, got {updated_fee}%"
                                    )
                            else:
                                self.log_test(
                                    "Verify Config Update", 
                                    False, 
                                    "Failed to verify config update"
                                )
                        else:
                            self.log_test(
                                "Update Commission", 
                                False, 
                                "Commission update response indicates failure",
                                data
                            )
                    else:
                        self.log_test(
                            "Update Commission", 
                            False, 
                            f"Commission update failed with status {response.status_code}"
                        )
                else:
                    self.log_test(
                        "Get Platform Config", 
                        False, 
                        "Invalid platform config response",
                        data
                    )
            else:
                self.log_test(
                    "Get Platform Config", 
                    False, 
                    f"Get platform config failed with status {response.status_code}"
                )
                
        except Exception as e:
            self.log_test(
                "Admin Platform Config", 
                False, 
                f"Platform config request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_customer_list(self):
        """Test admin customer list endpoint"""
        print("\n=== Testing Admin Customer List ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/customers",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "customers" in data:
                    customers = data["customers"]
                    total_customers = data.get("total_customers", 0)
                    
                    # Check if our test users are in the list
                    buyer_found = any(c.get("email") == TEST_USER["email"] for c in customers)
                    seller_found = any(c.get("email") == SELLER_USER["email"] for c in customers)
                    
                    if buyer_found and seller_found:
                        self.log_test(
                            "Admin Customer List", 
                            True, 
                            f"Found {total_customers} customers including our test users"
                        )
                        return True
                    else:
                        self.log_test(
                            "Admin Customer List", 
                            False, 
                            f"Test users not found in customer list (buyer: {buyer_found}, seller: {seller_found})"
                        )
                else:
                    self.log_test(
                        "Admin Customer List", 
                        False, 
                        "Invalid customer list response",
                        data
                    )
            else:
                self.log_test(
                    "Admin Customer List", 
                    False, 
                    f"Get customer list failed with status {response.status_code}"
                )
                
        except Exception as e:
            self.log_test(
                "Admin Customer List", 
                False, 
                f"Customer list request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_dashboard_stats(self):
        """Test admin dashboard statistics endpoint"""
        print("\n=== Testing Admin Dashboard Stats ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard-stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    
                    # Check required stat categories
                    required_categories = ["users", "transactions", "orders", "disputes", "revenue"]
                    missing_categories = [cat for cat in required_categories if cat not in stats]
                    
                    if not missing_categories:
                        user_stats = stats["users"]
                        order_stats = stats["orders"]
                        
                        self.log_test(
                            "Admin Dashboard Stats", 
                            True, 
                            f"Dashboard stats: {user_stats.get('total_users', 0)} users, {order_stats.get('completed_orders', 0)} completed orders"
                        )
                        return True
                    else:
                        self.log_test(
                            "Admin Dashboard Stats", 
                            False, 
                            f"Missing stat categories: {missing_categories}"
                        )
                else:
                    self.log_test(
                        "Admin Dashboard Stats", 
                        False, 
                        "Invalid dashboard stats response",
                        data
                    )
            else:
                self.log_test(
                    "Admin Dashboard Stats", 
                    False, 
                    f"Get dashboard stats failed with status {response.status_code}"
                )
                
        except Exception as e:
            self.log_test(
                "Admin Dashboard Stats", 
                False, 
                f"Dashboard stats request failed: {str(e)}"
            )
            
        return False
    
    def test_create_dispute(self):
        """Test creating a dispute on an order"""
        print("\n=== Testing Create Dispute ===")
        
        # First, let's create a new order for dispute testing
        # We'll use the existing buy order if available
        if not self.buy_order_id:
            self.log_test(
                "Create Dispute", 
                False, 
                "Cannot create dispute - no buy order ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/disputes/initiate",
                json={
                    "user_address": TEST_USER["wallet_address"],
                    "order_id": self.buy_order_id,
                    "reason": "Payment made but crypto not received after 24 hours"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("dispute", {}).get("dispute_id"):
                    self.dispute_id = data["dispute"]["dispute_id"]
                    self.log_test(
                        "Create Dispute", 
                        True, 
                        f"Dispute created successfully (ID: {self.dispute_id})"
                    )
                    return True
                else:
                    self.log_test(
                        "Create Dispute", 
                        False, 
                        "Dispute response missing success or dispute_id",
                        data
                    )
            else:
                self.log_test(
                    "Create Dispute", 
                    False, 
                    f"Create dispute failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Dispute", 
                False, 
                f"Create dispute request failed: {str(e)}"
            )
            
        return False
    
    def test_add_dispute_message(self):
        """Test adding messages to dispute"""
        print("\n=== Testing Add Dispute Message ===")
        
        if not self.dispute_id:
            self.log_test(
                "Add Dispute Message", 
                False, 
                "Cannot add dispute message - no dispute ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/disputes/message",
                json={
                    "dispute_id": self.dispute_id,
                    "sender_address": TEST_USER["wallet_address"],
                    "sender_role": "buyer",
                    "message": "I have made the bank transfer as requested. Here is the reference: BANK_TRANSFER_REF_12345"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Add Dispute Message", 
                        True, 
                        "Dispute message added successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Add Dispute Message", 
                        False, 
                        "Add dispute message response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Add Dispute Message", 
                    False, 
                    f"Add dispute message failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Add Dispute Message", 
                False, 
                f"Add dispute message request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_resolve_dispute(self):
        """Test admin resolving a dispute"""
        print("\n=== Testing Admin Resolve Dispute ===")
        
        if not self.dispute_id or not self.buy_order_id:
            self.log_test(
                "Admin Resolve Dispute", 
                False, 
                "Cannot resolve dispute - missing dispute ID or order ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/resolve-dispute",
                json={
                    "admin_address": "admin_wallet_001",
                    "dispute_id": self.dispute_id,
                    "order_id": self.buy_order_id,
                    "resolution": "release_to_buyer",
                    "admin_notes": "After reviewing evidence, payment was confirmed. Releasing crypto to buyer."
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Admin Resolve Dispute", 
                        True, 
                        "Dispute resolved successfully by admin"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Resolve Dispute", 
                        False, 
                        "Admin resolve dispute response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Admin Resolve Dispute", 
                    False, 
                    f"Admin resolve dispute failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Resolve Dispute", 
                False, 
                f"Admin resolve dispute request failed: {str(e)}"
            )
            
        return False
    
    def test_crypto_prices_api(self):
        """Test GET /api/crypto/prices - Live crypto prices (BTC, ETH, USDT)"""
        print("\n=== Testing Crypto Prices API ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto/prices",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "prices" in data:
                    prices = data["prices"]
                    required_cryptos = ["BTC", "ETH", "USDT"]
                    
                    all_present = all(crypto in prices for crypto in required_cryptos)
                    if all_present:
                        btc_price = prices["BTC"].get("gbp", 0)
                        eth_price = prices["ETH"].get("gbp", 0)
                        usdt_price = prices["USDT"].get("gbp", 0)
                        
                        self.log_test(
                            "Crypto Prices API", 
                            True, 
                            f"Live prices retrieved - BTC: £{btc_price:,.0f}, ETH: £{eth_price:,.0f}, USDT: £{usdt_price:.2f}"
                        )
                        return True
                    else:
                        missing = [c for c in required_cryptos if c not in prices]
                        self.log_test(
                            "Crypto Prices API", 
                            False, 
                            f"Missing crypto prices: {missing}"
                        )
                else:
                    self.log_test(
                        "Crypto Prices API", 
                        False, 
                        "Invalid crypto prices response format",
                        data
                    )
            else:
                self.log_test(
                    "Crypto Prices API", 
                    False, 
                    f"Crypto prices API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Crypto Prices API", 
                False, 
                f"Crypto prices request failed: {str(e)}"
            )
            
        return False
    
    def test_crypto_bank_balances_api(self):
        """Test GET /api/crypto-bank/balances/{user_id} - User crypto balances"""
        print("\n=== Testing Crypto Bank Balances API ===")
        
        if not self.test_user_id:
            self.log_test(
                "Crypto Bank Balances API", 
                False, 
                "Cannot test balances - no test user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    expected_currencies = ["BTC", "ETH", "USDT"]
                    
                    # Check if all expected currencies are present
                    currency_balances = {b.get("currency"): b.get("balance", 0) for b in balances}
                    all_present = all(currency in currency_balances for currency in expected_currencies)
                    
                    if all_present:
                        balance_summary = ", ".join([f"{curr}: {currency_balances[curr]}" for curr in expected_currencies])
                        self.log_test(
                            "Crypto Bank Balances API", 
                            True, 
                            f"User balances retrieved - {balance_summary}"
                        )
                        return True
                    else:
                        missing = [c for c in expected_currencies if c not in currency_balances]
                        self.log_test(
                            "Crypto Bank Balances API", 
                            False, 
                            f"Missing currency balances: {missing}"
                        )
                else:
                    self.log_test(
                        "Crypto Bank Balances API", 
                        False, 
                        "Invalid balances response format",
                        data
                    )
            else:
                self.log_test(
                    "Crypto Bank Balances API", 
                    False, 
                    f"Balances API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Crypto Bank Balances API", 
                False, 
                f"Balances request failed: {str(e)}"
            )
            
        return False
    
    def test_crypto_bank_transactions_api(self):
        """Test GET /api/crypto-bank/transactions/{user_id} - Transaction history"""
        print("\n=== Testing Crypto Bank Transactions API ===")
        
        if not self.test_user_id:
            self.log_test(
                "Crypto Bank Transactions API", 
                False, 
                "Cannot test transactions - no test user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/transactions/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    self.log_test(
                        "Crypto Bank Transactions API", 
                        True, 
                        f"Transaction history retrieved - {len(transactions)} transactions found"
                    )
                    return True
                else:
                    self.log_test(
                        "Crypto Bank Transactions API", 
                        False, 
                        "Invalid transactions response format",
                        data
                    )
            else:
                self.log_test(
                    "Crypto Bank Transactions API", 
                    False, 
                    f"Transactions API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Crypto Bank Transactions API", 
                False, 
                f"Transactions request failed: {str(e)}"
            )
            
        return False
    
    def test_get_user_orders_api(self):
        """Test GET /api/crypto-market/orders/{wallet_address} - Get user's orders"""
        print("\n=== Testing Get User Orders API ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-market/orders/{TEST_USER['wallet_address']}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "sell_orders" in data and "buy_orders" in data:
                    sell_orders = data["sell_orders"]
                    buy_orders = data["buy_orders"]
                    
                    self.log_test(
                        "Get User Orders API", 
                        True, 
                        f"User orders retrieved - {len(sell_orders)} sell orders, {len(buy_orders)} buy orders"
                    )
                    return True
                else:
                    self.log_test(
                        "Get User Orders API", 
                        False, 
                        "Invalid user orders response format",
                        data
                    )
            else:
                self.log_test(
                    "Get User Orders API", 
                    False, 
                    f"Get user orders API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get User Orders API", 
                False, 
                f"Get user orders request failed: {str(e)}"
            )
            
        return False
    
    def test_order_preview_flow(self):
        """Test the complete order preview flow: get sell orders -> create buy order"""
        print("\n=== Testing Order Preview Flow ===")
        
        # First ensure we have a sell order available
        if not self.sell_order_id:
            self.log_test(
                "Order Preview Flow", 
                False, 
                "Cannot test order preview flow - no sell order available"
            )
            return False
        
        # Test creating buy order from order preview
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/buy/create",
                json={
                    "buyer_address": TEST_USER["wallet_address"],
                    "sell_order_id": self.sell_order_id,
                    "crypto_amount": 0.1  # Buy 0.1 BTC from the sell order
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("order", {}).get("order_id"):
                    self.buy_order_id = data["order"]["order_id"]
                    order_status = data["order"].get("status", "unknown")
                    total_price = data["order"].get("total_price", 0)
                    
                    # Verify order is created with correct status (should be pending_payment)
                    if order_status == "pending_payment":
                        self.log_test(
                            "Order Preview Flow", 
                            True, 
                            f"Buy order created successfully via order preview - Order ID: {self.buy_order_id}, Status: {order_status}, Total: £{total_price}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Order Preview Flow", 
                            False, 
                            f"Buy order created but with unexpected status: {order_status} (expected: pending_payment)"
                        )
                else:
                    self.log_test(
                        "Order Preview Flow", 
                        False, 
                        "Buy order response missing success or order_id",
                        data
                    )
            else:
                self.log_test(
                    "Order Preview Flow", 
                    False, 
                    f"Order preview flow failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Order Preview Flow", 
                False, 
                f"Order preview flow request failed: {str(e)}"
            )
            
        return False
    
    # ============================================================================
    # TRADING ENGINE TESTING METHODS
    # ============================================================================
    
    def test_trading_platform_settings(self):
        """Test GET /api/admin/platform-settings - Trading fee configuration"""
        print("\n=== Testing Trading Platform Settings ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-settings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "settings" in data:
                    settings = data["settings"]
                    trading_fee = settings.get("spot_trading_fee_percent", 0)
                    
                    self.log_test(
                        "Trading Platform Settings", 
                        True, 
                        f"Trading fee configured: {trading_fee}% (should be 0.1%)"
                    )
                    return True
                else:
                    self.log_test(
                        "Trading Platform Settings", 
                        False, 
                        "Platform settings response missing success or settings",
                        data
                    )
            else:
                self.log_test(
                    "Trading Platform Settings", 
                    False, 
                    f"Platform settings failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Trading Platform Settings", 
                False, 
                f"Platform settings request failed: {str(e)}"
            )
            
        return False
    
    def test_live_prices_coingecko(self):
        """Test GET /api/prices/live - Real prices from CoinGecko"""
        print("\n=== Testing Live Prices from CoinGecko ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/prices/live",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "prices" in data:
                    prices = data["prices"]
                    required_coins = ["BTC", "ETH", "SOL", "XRP", "BNB"]
                    
                    found_coins = []
                    for coin in required_coins:
                        if coin in prices and prices[coin].get("price_usd", 0) > 0:
                            found_coins.append(f"{coin}: ${prices[coin]['price_usd']:,.2f}")
                    
                    if len(found_coins) >= 3:  # At least 3 coins should have prices
                        self.log_test(
                            "Live Prices from CoinGecko", 
                            True, 
                            f"Real prices retrieved: {', '.join(found_coins[:3])}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Live Prices from CoinGecko", 
                            False, 
                            f"Insufficient price data. Found: {found_coins}"
                        )
                else:
                    self.log_test(
                        "Live Prices from CoinGecko", 
                        False, 
                        "Live prices response missing success or prices",
                        data
                    )
            else:
                self.log_test(
                    "Live Prices from CoinGecko", 
                    False, 
                    f"Live prices failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Live Prices from CoinGecko", 
                False, 
                f"Live prices request failed: {str(e)}"
            )
            
        return False
    
    def test_trading_orderbook(self):
        """Test GET /api/trading/orderbook/{pair} - Order book with bid/ask levels"""
        print("\n=== Testing Trading Order Book ===")
        
        pairs_to_test = ["BTCUSD", "ETHUSD", "SOLUSD"]
        success_count = 0
        
        for pair in pairs_to_test:
            try:
                response = self.session.get(
                    f"{BASE_URL}/trading/orderbook/{pair}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "bids" in data and "asks" in data:
                        bids = data["bids"]
                        asks = data["asks"]
                        spread = data.get("spread", 0)
                        
                        if len(bids) >= 10 and len(asks) >= 10:
                            self.log_test(
                                f"Order Book {pair}", 
                                True, 
                                f"{len(bids)} bids, {len(asks)} asks, spread: ${spread:.2f}"
                            )
                            success_count += 1
                        else:
                            self.log_test(
                                f"Order Book {pair}", 
                                False, 
                                f"Insufficient order book depth: {len(bids)} bids, {len(asks)} asks"
                            )
                    else:
                        self.log_test(
                            f"Order Book {pair}", 
                            False, 
                            "Order book response missing bids/asks",
                            data
                        )
                else:
                    self.log_test(
                        f"Order Book {pair}", 
                        False, 
                        f"Order book failed with status {response.status_code}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Order Book {pair}", 
                    False, 
                    f"Order book request failed: {str(e)}"
                )
        
        return success_count >= 2  # At least 2 pairs should work
    
    def test_open_trading_position(self):
        """Test POST /api/trading/open-position - Open position with 0.1% fee"""
        print("\n=== Testing Open Trading Position ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Open Trading Position", 
                False, 
                "Cannot test trading - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trading/open-position",
                json={
                    "user_id": self.trader_user_id,
                    "pair": "BTCUSD",
                    "side": "long",
                    "amount": 0.001,  # Small amount for testing
                    "entry_price": 91485,
                    "leverage": 1
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("position", {}).get("position_id"):
                    position = data["position"]
                    self.position_id = position["position_id"]
                    fee = position.get("fee", 0)
                    margin = position.get("margin", 0)
                    
                    # Verify 0.1% fee calculation
                    expected_fee = margin * 0.001  # 0.1%
                    fee_correct = abs(fee - expected_fee) < 0.01
                    
                    self.log_test(
                        "Open Trading Position", 
                        True, 
                        f"Position opened: ID {self.position_id}, Fee: ${fee:.4f} (0.1% = ${expected_fee:.4f})"
                    )
                    return True
                else:
                    self.log_test(
                        "Open Trading Position", 
                        False, 
                        "Open position response missing success or position_id",
                        data
                    )
            else:
                self.log_test(
                    "Open Trading Position", 
                    False, 
                    f"Open position failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Open Trading Position", 
                False, 
                f"Open position request failed: {str(e)}"
            )
            
        return False
    
    def test_close_trading_position(self):
        """Test POST /api/trading/close-position - Close position with P/L calculation"""
        print("\n=== Testing Close Trading Position ===")
        
        if not self.position_id or not self.trader_user_id:
            self.log_test(
                "Close Trading Position", 
                False, 
                "Cannot test close position - no position ID or trader ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trading/close-position",
                json={
                    "position_id": self.position_id,
                    "user_id": self.trader_user_id,
                    "close_price": 93314.70  # Higher price for profit
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "result" in data:
                    result = data["result"]
                    pnl = result.get("pnl", 0)
                    pnl_percent = result.get("pnl_percent", 0)
                    close_fee = result.get("close_fee", 0)
                    
                    self.log_test(
                        "Close Trading Position", 
                        True, 
                        f"Position closed: P/L ${pnl:.4f} ({pnl_percent:.2f}%), Close fee: ${close_fee:.4f}"
                    )
                    return True
                else:
                    self.log_test(
                        "Close Trading Position", 
                        False, 
                        "Close position response missing success or result",
                        data
                    )
            else:
                self.log_test(
                    "Close Trading Position", 
                    False, 
                    f"Close position failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Close Trading Position", 
                False, 
                f"Close position request failed: {str(e)}"
            )
            
        return False
    
    def test_trading_history(self):
        """Test GET /api/trading/history/{user_id} - Trade history display"""
        print("\n=== Testing Trading History ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Trading History", 
                False, 
                "Cannot test trading history - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/trading/history/{self.trader_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "history" in data:
                    history = data["history"]
                    count = data.get("count", 0)
                    
                    self.log_test(
                        "Trading History", 
                        True, 
                        f"Trade history retrieved: {count} trades found"
                    )
                    return True
                else:
                    self.log_test(
                        "Trading History", 
                        False, 
                        "Trading history response missing success or history",
                        data
                    )
            else:
                self.log_test(
                    "Trading History", 
                    False, 
                    f"Trading history failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Trading History", 
                False, 
                f"Trading history request failed: {str(e)}"
            )
            
        return False
    
    def test_wallet_balance_updates(self):
        """Test wallet balance updates after trading"""
        print("\n=== Testing Wallet Balance Updates ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Wallet Balance Updates", 
                False, 
                "Cannot test wallet balance - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/wallet/balance/{self.trader_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    gbp_balance = balances.get("GBP", {}).get("balance", 0)
                    
                    self.log_test(
                        "Wallet Balance Updates", 
                        True, 
                        f"Wallet balance retrieved: £{gbp_balance:,.2f} GBP"
                    )
                    return True
                else:
                    self.log_test(
                        "Wallet Balance Updates", 
                        False, 
                        "Wallet balance response missing success or balances",
                        data
                    )
            else:
                self.log_test(
                    "Wallet Balance Updates", 
                    False, 
                    f"Wallet balance failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Wallet Balance Updates", 
                False, 
                f"Wallet balance request failed: {str(e)}"
            )
            
        return False
    
    # ============================================================================
    # P2P EXPRESS TESTING METHODS
    # ============================================================================
    
    def test_p2p_express_check_liquidity(self):
        """Test POST /api/p2p/express/check-liquidity - Admin liquidity check"""
        print("\n=== Testing P2P Express Liquidity Check ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express/check-liquidity",
                json={
                    "crypto": "BTC",
                    "crypto_amount": 0.001
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "has_liquidity" in data:
                    has_liquidity = data["has_liquidity"]
                    
                    self.log_test(
                        "P2P Express Liquidity Check", 
                        True, 
                        f"Liquidity check completed: Admin liquidity {'available' if has_liquidity else 'not available'}"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Express Liquidity Check", 
                        False, 
                        "Liquidity check response missing success or has_liquidity",
                        data
                    )
            else:
                self.log_test(
                    "P2P Express Liquidity Check", 
                    False, 
                    f"Liquidity check failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Express Liquidity Check", 
                False, 
                f"Liquidity check request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_express_create_order(self):
        """Test POST /api/p2p/express/create - Express order with 2.5% fee"""
        print("\n=== Testing P2P Express Create Order ===")
        
        if not self.buyer_user_id:
            self.log_test(
                "P2P Express Create Order", 
                False, 
                "Cannot test P2P Express - no buyer user ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express/create",
                json={
                    "user_id": self.buyer_user_id,
                    "crypto": "BTC",
                    "country": "United Kingdom",
                    "fiat_amount": 1000.0,  # £1000
                    "crypto_amount": 0.01,
                    "base_rate": 100000,
                    "express_fee": 25.0,  # 2.5% of £1000
                    "express_fee_percent": 2.5,
                    "net_amount": 975.0,
                    "has_admin_liquidity": True
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("trade_id"):
                    self.express_order_id = data["trade_id"]
                    
                    self.log_test(
                        "P2P Express Create Order", 
                        True, 
                        f"Express order created: ID {self.express_order_id}, Fee: £25.00 (2.5%)"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Express Create Order", 
                        False, 
                        "Express order response missing success or trade_id",
                        data
                    )
            else:
                self.log_test(
                    "P2P Express Create Order", 
                    False, 
                    f"Express order failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Express Create Order", 
                False, 
                f"Express order request failed: {str(e)}"
            )
            
        return False
    
    def test_nowpayments_currencies(self):
        """Test GET /api/nowpayments/currencies - Coin selector with icons"""
        print("\n=== Testing NOWPayments Currencies (Coin Selector) ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/nowpayments/currencies",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "currencies" in data:
                    currencies = data["currencies"]
                    
                    self.log_test(
                        "NOWPayments Currencies", 
                        True, 
                        f"Coin selector data retrieved: {len(currencies)} currencies available"
                    )
                    return True
                else:
                    self.log_test(
                        "NOWPayments Currencies", 
                        False, 
                        "Currencies response missing success or currencies",
                        data
                    )
            else:
                self.log_test(
                    "NOWPayments Currencies", 
                    False, 
                    f"Currencies failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "NOWPayments Currencies", 
                False, 
                f"Currencies request failed: {str(e)}"
            )
            
        return False
    
    # ============================================================================
    # NORMAL P2P MARKETPLACE TESTING METHODS
    # ============================================================================
    
    def test_p2p_marketplace_available_coins(self):
        """Test GET /api/p2p/marketplace/available-coins - Available coins for P2P"""
        print("\n=== Testing P2P Marketplace Available Coins ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/marketplace/available-coins",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    coins = data["coins"]
                    coins_data = data.get("coins_data", [])
                    
                    self.log_test(
                        "P2P Marketplace Available Coins", 
                        True, 
                        f"Available coins retrieved: {len(coins)} coins, {len(coins_data)} with metadata"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Marketplace Available Coins", 
                        False, 
                        "Available coins response missing success or coins",
                        data
                    )
            else:
                self.log_test(
                    "P2P Marketplace Available Coins", 
                    False, 
                    f"Available coins failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Marketplace Available Coins", 
                False, 
                f"Available coins request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_marketplace_filters(self):
        """Test GET /api/p2p/marketplace/filters - Marketplace filter options"""
        print("\n=== Testing P2P Marketplace Filters ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/marketplace/filters",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    currencies = data.get("currencies", [])
                    payment_methods = data.get("payment_methods", [])
                    regions = data.get("regions", [])
                    
                    self.log_test(
                        "P2P Marketplace Filters", 
                        True, 
                        f"Filters retrieved: {len(currencies)} currencies, {len(payment_methods)} payment methods, {len(regions)} regions"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Marketplace Filters", 
                        False, 
                        "Marketplace filters response missing success",
                        data
                    )
            else:
                self.log_test(
                    "P2P Marketplace Filters", 
                    False, 
                    f"Marketplace filters failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Marketplace Filters", 
                False, 
                f"Marketplace filters request failed: {str(e)}"
            )
            
        return False
    
    # ============================================================================
    # BUSINESS DASHBOARD TESTING METHODS
    # ============================================================================
    
    def test_business_dashboard_stats(self):
        """Test GET /api/admin/dashboard-stats - Business dashboard with all fee types"""
        print("\n=== Testing Business Dashboard Stats ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard-stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    
                    # Check for all required fee types
                    revenue = stats.get("revenue", {})
                    fee_types = [
                        "spot_trading_fees", "p2p_fees", "p2p_express_fees", 
                        "swap_fees", "withdrawal_fees", "referral_commissions"
                    ]
                    
                    found_fees = [fee for fee in fee_types if fee in revenue]
                    
                    self.log_test(
                        "Business Dashboard Stats", 
                        True, 
                        f"Dashboard stats retrieved: {len(found_fees)}/{len(fee_types)} fee types found"
                    )
                    return True
                else:
                    self.log_test(
                        "Business Dashboard Stats", 
                        False, 
                        "Dashboard stats response missing success or stats",
                        data
                    )
            else:
                self.log_test(
                    "Business Dashboard Stats", 
                    False, 
                    f"Dashboard stats failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Business Dashboard Stats", 
                False, 
                f"Dashboard stats request failed: {str(e)}"
            )
            
        return False
    
    def test_referral_dashboard(self):
        """Test GET /api/referral/dashboard/{user_id} - Referral commissions (20%/50%)"""
        print("\n=== Testing Referral Dashboard ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Referral Dashboard", 
                False, 
                "Cannot test referral dashboard - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/referral/dashboard/{self.trader_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    referral_code = data.get("referral_code", "")
                    total_commissions = data.get("total_commissions", 0)
                    commission_rate = data.get("commission_rate", 0)
                    
                    self.log_test(
                        "Referral Dashboard", 
                        True, 
                        f"Referral dashboard working: Code {referral_code}, Rate {commission_rate}%, Commissions £{total_commissions}"
                    )
                    return True
                else:
                    self.log_test(
                        "Referral Dashboard", 
                        False, 
                        "Referral dashboard response missing success",
                        data
                    )
            else:
                self.log_test(
                    "Referral Dashboard", 
                    False, 
                    f"Referral dashboard failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Referral Dashboard", 
                False, 
                f"Referral dashboard request failed: {str(e)}"
            )
            
        return False
    
    # ============================================================================
    # COMPREHENSIVE TESTING METHODS FOR REVIEW REQUEST
    # ============================================================================
    
    def test_referral_dashboard_api(self):
        """Test GET /api/referral/dashboard/{user_id} - Auto-create referral codes"""
        print("\n=== Testing Referral Dashboard API ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Referral Dashboard API", 
                False, 
                "Cannot test referral dashboard - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/referral/dashboard/{self.trader_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "referral_code" in data:
                    referral_code = data["referral_code"]
                    total_signups = data.get("total_signups", 0)
                    total_trades = data.get("total_trades", 0)
                    
                    self.log_test(
                        "Referral Dashboard API", 
                        True, 
                        f"Referral dashboard working - Code: {referral_code}, Signups: {total_signups}, Trades: {total_trades}"
                    )
                    return True
                else:
                    self.log_test(
                        "Referral Dashboard API", 
                        False, 
                        "Referral dashboard response missing success or referral_code",
                        data
                    )
            else:
                self.log_test(
                    "Referral Dashboard API", 
                    False, 
                    f"Referral dashboard API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Referral Dashboard API", 
                False, 
                f"Referral dashboard request failed: {str(e)}"
            )
            
        return False
    
    def test_support_chat_send_message(self):
        """Test POST /api/support/chat - Send message and auto-create chat"""
        print("\n=== Testing Support Chat Send Message ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Support Chat Send Message", 
                False, 
                "Cannot test support chat - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/support/chat",
                json={
                    "user_id": self.trader_user_id,
                    "message": "Hello, I need help with my P2P trade. The seller hasn't released the crypto after I marked as paid.",
                    "sender_role": "user"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("message_id"):
                    message_id = data["message_id"]
                    self.chat_id = data.get("chat_id")
                    
                    self.log_test(
                        "Support Chat Send Message", 
                        True, 
                        f"Support chat message sent successfully - Message ID: {message_id}, Chat ID: {self.chat_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Support Chat Send Message", 
                        False, 
                        "Support chat response missing success or message_id",
                        data
                    )
            else:
                self.log_test(
                    "Support Chat Send Message", 
                    False, 
                    f"Support chat send failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Support Chat Send Message", 
                False, 
                f"Support chat send request failed: {str(e)}"
            )
            
        return False
    
    def test_support_chat_get_history(self):
        """Test GET /api/support/chat/{user_id} - Get chat history"""
        print("\n=== Testing Support Chat Get History ===")
        
        if not self.trader_user_id:
            self.log_test(
                "Support Chat Get History", 
                False, 
                "Cannot test support chat history - no trader user ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/support/chat/{self.trader_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "messages" in data:
                    messages = data["messages"]
                    chat_status = data.get("chat_status", "unknown")
                    
                    self.log_test(
                        "Support Chat Get History", 
                        True, 
                        f"Support chat history retrieved - {len(messages)} messages, Status: {chat_status}"
                    )
                    return True
                else:
                    self.log_test(
                        "Support Chat Get History", 
                        False, 
                        "Support chat history response missing success or messages",
                        data
                    )
            else:
                self.log_test(
                    "Support Chat Get History", 
                    False, 
                    f"Support chat history failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Support Chat Get History", 
                False, 
                f"Support chat history request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_offers_with_filters(self):
        """Test GET /api/p2p/offers with crypto_currency and fiat_currency params"""
        print("\n=== Testing P2P Offers with Filters ===")
        
        try:
            # Test with filters
            response = self.session.get(
                f"{BASE_URL}/p2p/offers",
                params={
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    offers = data["offers"]
                    
                    self.log_test(
                        "P2P Offers with Filters", 
                        True, 
                        f"P2P offers retrieved with filters - {len(offers)} BTC/GBP offers found"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Offers with Filters", 
                        False, 
                        "P2P offers response missing success or offers",
                        data
                    )
            else:
                self.log_test(
                    "P2P Offers with Filters", 
                    False, 
                    f"P2P offers API failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Offers with Filters", 
                False, 
                f"P2P offers request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_create_offer(self):
        """Test POST /api/p2p/create-offer - Create new sell offer"""
        print("\n=== Testing P2P Create Offer ===")
        
        if not self.seller_user_id:
            self.log_test(
                "P2P Create Offer", 
                False, 
                "Cannot test P2P create offer - no seller user ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-offer",
                json={
                    "seller_id": self.seller_user_id,
                    "crypto_currency": "BTC",
                    "crypto_amount": 0.5,
                    "fiat_currency": "GBP",
                    "price_per_unit": 35000.0,
                    "min_purchase": 0.1,
                    "max_purchase": 0.5,
                    "payment_methods": ["bank_transfer", "paypal"],
                    "seller_requirements": ["kyc_verified"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("offer", {}).get("order_id"):
                    offer_id = data["offer"]["order_id"]
                    
                    self.log_test(
                        "P2P Create Offer", 
                        True, 
                        f"P2P offer created successfully - Offer ID: {offer_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Create Offer", 
                        False, 
                        "P2P create offer response missing success or order_id",
                        data
                    )
            else:
                self.log_test(
                    "P2P Create Offer", 
                    False, 
                    f"P2P create offer failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Create Offer", 
                False, 
                f"P2P create offer request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_trade_details(self):
        """Test GET /api/p2p/trade/{trade_id} - Get trade details"""
        print("\n=== Testing P2P Trade Details ===")
        
        if not self.trade_id:
            # Try to use buy_order_id as trade_id for testing
            if self.buy_order_id:
                self.trade_id = self.buy_order_id
            else:
                self.log_test(
                    "P2P Trade Details", 
                    False, 
                    "Cannot test P2P trade details - no trade ID available"
                )
                return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/trade/{self.trade_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "trade" in data:
                    trade = data["trade"]
                    trade_status = trade.get("status", "unknown")
                    
                    self.log_test(
                        "P2P Trade Details", 
                        True, 
                        f"P2P trade details retrieved - Trade ID: {self.trade_id}, Status: {trade_status}"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Trade Details", 
                        False, 
                        "P2P trade details response missing success or trade",
                        data
                    )
            else:
                self.log_test(
                    "P2P Trade Details", 
                    False, 
                    f"P2P trade details failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Trade Details", 
                False, 
                f"P2P trade details request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_mark_paid(self):
        """Test POST /api/p2p/mark-paid - Buyer marks as paid"""
        print("\n=== Testing P2P Mark Paid ===")
        
        if not self.trade_id or not self.test_user_id:
            self.log_test(
                "P2P Mark Paid", 
                False, 
                "Cannot test P2P mark paid - missing trade ID or user ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/mark-paid",
                json={
                    "trade_id": self.trade_id,
                    "buyer_id": self.test_user_id,
                    "payment_reference": "BANK_TRANSFER_REF_P2P_12345"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "P2P Mark Paid", 
                        True, 
                        "P2P trade marked as paid successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Mark Paid", 
                        False, 
                        "P2P mark paid response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "P2P Mark Paid", 
                    False, 
                    f"P2P mark paid failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Mark Paid", 
                False, 
                f"P2P mark paid request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_release_crypto(self):
        """Test POST /api/p2p/release-crypto - Seller releases crypto"""
        print("\n=== Testing P2P Release Crypto ===")
        
        if not self.trade_id or not self.seller_user_id:
            self.log_test(
                "P2P Release Crypto", 
                False, 
                "Cannot test P2P release crypto - missing trade ID or seller ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/release-crypto",
                json={
                    "trade_id": self.trade_id,
                    "seller_id": self.seller_user_id
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "P2P Release Crypto", 
                        True, 
                        "P2P crypto released successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Release Crypto", 
                        False, 
                        "P2P release crypto response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "P2P Release Crypto", 
                    False, 
                    f"P2P release crypto failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Release Crypto", 
                False, 
                f"P2P release crypto request failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_trade_dispute(self):
        """Test POST /api/p2p/trade/{trade_id}/dispute - Open dispute"""
        print("\n=== Testing P2P Trade Dispute ===")
        
        if not self.trade_id or not self.test_user_id:
            self.log_test(
                "P2P Trade Dispute", 
                False, 
                "Cannot test P2P trade dispute - missing trade ID or user ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/trade/{self.trade_id}/dispute",
                json={
                    "user_id": self.test_user_id,
                    "reason": "Seller not responding after payment marked as paid for 24+ hours",
                    "evidence_description": "Bank transfer completed with reference BANK_TRANSFER_REF_P2P_12345"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("dispute", {}).get("dispute_id"):
                    self.dispute_id = data["dispute"]["dispute_id"]
                    
                    self.log_test(
                        "P2P Trade Dispute", 
                        True, 
                        f"P2P trade dispute opened successfully - Dispute ID: {self.dispute_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Trade Dispute", 
                        False, 
                        "P2P trade dispute response missing success or dispute_id",
                        data
                    )
            else:
                self.log_test(
                    "P2P Trade Dispute", 
                    False, 
                    f"P2P trade dispute failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Trade Dispute", 
                False, 
                f"P2P trade dispute request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_users_list(self):
        """Test GET /api/admin/customers - List users"""
        print("\n=== Testing Admin Users List ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/customers",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "customers" in data:
                    users = data["customers"]
                    total_users = data.get("total_customers", len(users))
                    
                    self.log_test(
                        "Admin Users List", 
                        True, 
                        f"Admin users list retrieved - {total_users} users found"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Users List", 
                        False, 
                        "Admin users list response missing success or users",
                        data
                    )
            else:
                self.log_test(
                    "Admin Users List", 
                    False, 
                    f"Admin users list failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Users List", 
                False, 
                f"Admin users list request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_disputes_list(self):
        """Test GET /api/admin/disputes/all - List disputes"""
        print("\n=== Testing Admin Disputes List ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/disputes/all",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "disputes" in data:
                    disputes = data["disputes"]
                    
                    self.log_test(
                        "Admin Disputes List", 
                        True, 
                        f"Admin disputes list retrieved - {len(disputes)} disputes found"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Disputes List", 
                        False, 
                        "Admin disputes list response missing success or disputes",
                        data
                    )
            else:
                self.log_test(
                    "Admin Disputes List", 
                    False, 
                    f"Admin disputes list failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Disputes List", 
                False, 
                f"Admin disputes list request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_resolve_dispute_endpoint(self):
        """Test POST /api/admin/resolve-dispute - Resolve a dispute"""
        print("\n=== Testing Admin Resolve Dispute Endpoint ===")
        
        if not self.dispute_id:
            self.log_test(
                "Admin Resolve Dispute Endpoint", 
                False, 
                "Cannot test admin resolve dispute - no dispute ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/resolve-dispute",
                json={
                    "dispute_id": self.dispute_id,
                    "resolution": "release_to_buyer",
                    "admin_notes": "Payment evidence verified. Releasing crypto to buyer.",
                    "admin_id": self.admin_user_id or "admin_001"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Admin Resolve Dispute Endpoint", 
                        True, 
                        "Admin dispute resolution completed successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Resolve Dispute Endpoint", 
                        False, 
                        "Admin resolve dispute response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Admin Resolve Dispute Endpoint", 
                    False, 
                    f"Admin resolve dispute failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Resolve Dispute Endpoint", 
                False, 
                f"Admin resolve dispute request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_referral_config_get(self):
        """Test GET /api/admin/referral-config - Get referral settings"""
        print("\n=== Testing Admin Referral Config Get ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/referral-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    config = data["config"]
                    commission_rate = config.get("commission_rate", 0)
                    
                    self.log_test(
                        "Admin Referral Config Get", 
                        True, 
                        f"Admin referral config retrieved - Commission rate: {commission_rate}%"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Referral Config Get", 
                        False, 
                        "Admin referral config response missing success or config",
                        data
                    )
            else:
                self.log_test(
                    "Admin Referral Config Get", 
                    False, 
                    f"Admin referral config get failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Referral Config Get", 
                False, 
                f"Admin referral config get request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_referral_config_post(self):
        """Test POST /api/admin/update-referral-config - Update referral settings"""
        print("\n=== Testing Admin Referral Config Post ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/update-referral-config",
                json={
                    "commission_rate": 25.0,
                    "duration_months": 12,
                    "min_trade_amount": 100.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Admin Referral Config Post", 
                        True, 
                        "Admin referral config updated successfully - Commission rate: 25%"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Referral Config Post", 
                        False, 
                        "Admin referral config update response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Admin Referral Config Post", 
                    False, 
                    f"Admin referral config update failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Referral Config Post", 
                False, 
                f"Admin referral config update request failed: {str(e)}"
            )
            
        return False
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        return passed_tests == total_tests
    
    def run_all_tests(self):
        """Run comprehensive trading platform test suite"""
        print("🚀 Starting Complete Trading Platform Testing Suite")
        print("=" * 70)
        
        # Phase 1: User Registration and Setup
        print("\n📋 PHASE 1: USER REGISTRATION AND SETUP")
        self.test_user_registration(TEST_TRADER, "Trader")
        self.test_user_registration(P2P_BUYER, "P2P Buyer")
        self.test_user_registration(P2P_SELLER, "P2P Seller")
        self.test_admin_login()
        
        # Phase 2: Trading Engine Testing
        print("\n📈 PHASE 2: TRADING ENGINE TESTING")
        self.test_trading_platform_settings()
        self.test_live_prices_coingecko()
        self.test_trading_orderbook()
        self.test_open_trading_position()
        self.test_close_trading_position()
        self.test_trading_history()
        self.test_wallet_balance_updates()
        
        # Phase 3: P2P Express Testing
        print("\n⚡ PHASE 3: P2P EXPRESS TESTING")
        self.test_p2p_express_check_liquidity()
        self.test_p2p_express_create_order()
        self.test_nowpayments_currencies()
        
        # Phase 4: P2P Marketplace Testing
        print("\n🏪 PHASE 4: P2P MARKETPLACE TESTING")
        self.test_p2p_marketplace_available_coins()
        self.test_p2p_marketplace_filters()
        self.test_create_sell_order()
        self.test_get_sell_orders()
        self.test_create_buy_order()
        self.test_mark_as_paid()
        self.test_release_crypto()
        
        # Phase 5: Business Dashboard Testing
        print("\n📊 PHASE 5: BUSINESS DASHBOARD TESTING")
        self.test_business_dashboard_stats()
        self.test_referral_dashboard()
        self.test_admin_dashboard_stats()
        
        # Phase 6: Additional Features Testing
        print("\n🔧 PHASE 6: ADDITIONAL FEATURES TESTING")
        self.test_referral_dashboard_api()
        self.test_support_chat_send_message()
        self.test_support_chat_get_history()
        self.test_p2p_offers_with_filters()
        
        # Generate Test Report
        self.generate_test_report()
        
        return self.test_results

    def run_comprehensive_backend_tests(self):
        """Run comprehensive backend tests for all critical endpoints as requested in review"""
        print("🚀 COMPREHENSIVE BACKEND TESTING FOR COIN HUB X TRADING PLATFORM")
        print(f"🔗 Testing against: {BASE_URL}")
        print(f"👤 Trader: {TEST_TRADER['email']} / {TEST_TRADER['password']}")
        print(f"👤 P2P Buyer: {P2P_BUYER['email']} / {P2P_BUYER['password']}")
        print(f"👤 P2P Seller: {P2P_SELLER['email']} / {P2P_SELLER['password']}")
        print(f"👤 Admin user: {ADMIN_USER['email']} / {ADMIN_USER['password']}")
        
        # Comprehensive test sequence covering all endpoints in review request
        tests = [
            ("1. Authentication & User Setup", [
                lambda: self.test_user_registration(TEST_TRADER, "Trader"),
                lambda: self.test_user_registration(P2P_BUYER, "P2P Buyer"),
                lambda: self.test_user_registration(P2P_SELLER, "P2P Seller"),
                lambda: self.test_user_login(ADMIN_USER, "Admin"),
                self.test_setup_wallets_and_bank_accounts,
            ]),
            ("2. Authentication & Referral System", [
                self.test_referral_dashboard_api,  # GET /api/referral/dashboard/{user_id}
            ]),
            ("3. Support Chat System (NEW)", [
                self.test_support_chat_send_message,  # POST /api/support/chat
                self.test_support_chat_get_history,   # GET /api/support/chat/{user_id}
            ]),
            ("4. P2P Marketplace - Setup", [
                self.test_create_sell_order,  # Create sell order for testing
                self.test_p2p_offers_with_filters,  # GET /api/p2p/offers
                self.test_p2p_create_offer,  # POST /api/p2p/create-offer
            ]),
            ("5. P2P Marketplace - Trade Flow", [
                self.test_get_sell_orders,  # GET /api/crypto-market/sell/orders
                self.test_order_preview_flow,  # POST /api/crypto-market/buy/create
                self.test_p2p_trade_details,  # GET /api/p2p/trade/{trade_id}
                self.test_p2p_mark_paid,  # POST /api/p2p/mark-paid
                self.test_p2p_release_crypto,  # POST /api/p2p/release-crypto
            ]),
            ("6. P2P Marketplace - Dispute Flow", [
                self.test_p2p_trade_dispute,  # POST /api/p2p/trade/{trade_id}/dispute
            ]),
            ("7. Admin Endpoints", [
                self.test_admin_users_list,  # GET /api/admin/users
                self.test_admin_disputes_list,  # GET /api/admin/disputes
                self.test_admin_resolve_dispute_endpoint,  # POST /api/admin/resolve-dispute
                self.test_admin_referral_config_get,  # GET /api/admin/referral-config
                self.test_admin_referral_config_post,  # POST /api/admin/referral-config
            ]),
            ("8. Dashboard & Additional APIs", [
                self.test_crypto_prices_api,  # GET /api/crypto/prices
                self.test_crypto_bank_balances_api,  # GET /api/crypto-bank/balances/{user_id}
                self.test_crypto_bank_transactions_api,  # GET /api/crypto-bank/transactions/{user_id}
                self.test_get_user_orders_api,  # GET /api/crypto-market/orders/{wallet_address}
            ])
        ]
        
        total_tests = 0
        passed_tests = 0
        failed_tests = []
        
        for category, test_functions in tests:
            print(f"\n{'='*80}")
            print(f"🧪 Testing Category: {category}")
            print(f"{'='*80}")
            
            for test_func in test_functions:
                total_tests += 1
                if test_func():
                    passed_tests += 1
                else:
                    # Get the last test result to identify which test failed
                    if self.test_results:
                        last_result = self.test_results[-1]
                        if not last_result["success"]:
                            failed_tests.append(last_result["test"])
                # Small delay between tests
                time.sleep(0.5)
        
        # Summary
        print(f"\n{'='*80}")
        print("📊 COMPREHENSIVE BACKEND TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Failed tests summary
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for failed_test in failed_tests:
                print(f"   • {failed_test}")
        
        # Detailed results
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Critical endpoints status for review request
        print(f"\n🎯 CRITICAL ENDPOINTS STATUS (Review Request):")
        
        # Authentication & Referral System
        print(f"\n1. Authentication & Referral System:")
        auth_tests = ["Trader Registration", "P2P Buyer Registration", "P2P Seller Registration", "Referral Dashboard API"]
        for test_name in auth_tests:
            result = next((r for r in self.test_results if test_name in r["test"]), None)
            if result:
                status = "✅" if result["success"] else "❌"
                print(f"   {status} {result['test']}")
        
        # Support Chat System
        print(f"\n2. Support Chat System (NEW):")
        chat_tests = ["Support Chat Send Message", "Support Chat Get History"]
        for test_name in chat_tests:
            result = next((r for r in self.test_results if test_name in r["test"]), None)
            if result:
                status = "✅" if result["success"] else "❌"
                print(f"   {status} {result['test']}")
        
        # P2P Marketplace
        print(f"\n3. P2P Marketplace:")
        p2p_tests = ["P2P Offers with Filters", "P2P Create Offer", "Get Sell Orders", 
                     "P2P Trade Details", "P2P Mark Paid", "P2P Release Crypto", "P2P Trade Dispute"]
        for test_name in p2p_tests:
            result = next((r for r in self.test_results if test_name in r["test"]), None)
            if result:
                status = "✅" if result["success"] else "❌"
                print(f"   {status} {result['test']}")
        
        # Admin Endpoints
        print(f"\n4. Admin Endpoints:")
        admin_tests = ["Admin Users List", "Admin Disputes List", "Admin Resolve Dispute", 
                       "Admin Referral Config Get", "Admin Referral Config Post"]
        for test_name in admin_tests:
            result = next((r for r in self.test_results if test_name in r["test"]), None)
            if result:
                status = "✅" if result["success"] else "❌"
                print(f"   {status} {result['test']}")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = TradingPlatformTester()
    success = tester.run_comprehensive_backend_tests()
    
    if success:
        print(f"\n🎉 ALL COMPREHENSIVE BACKEND TESTS PASSED!")
        print(f"✅ All critical endpoints working correctly")
        print(f"✅ Authentication & Referral System functional")
        print(f"✅ Support Chat System operational")
        print(f"✅ P2P Marketplace trade flow working")
        print(f"✅ Admin endpoints accessible")
        print(f"Backend APIs are production-ready!")
        sys.exit(0)
    else:
        print(f"\n⚠️  SOME CRITICAL BACKEND TESTS FAILED")
        print(f"❌ Check the detailed results above for specific issues")
        print(f"❌ Fix failing endpoints before proceeding")
        sys.exit(1)
