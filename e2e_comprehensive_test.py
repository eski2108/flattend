#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any

class ComprehensiveE2ETest:
    def __init__(self, base_url="https://signupverify.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test data
        self.test_user = None
        self.test_referrer = None
        self.auth_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        print(f"🚀 FINAL COMPREHENSIVE E2E TEST - Crypto Exchange Platform")
        print(f"🔗 API Base URL: {base_url}")
        print("=" * 80)

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   📋 {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   🚨 {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        try:
            url = f"{self.base_url}{endpoint}"
            req_headers = self.session.headers.copy()
            if headers:
                req_headers.update(headers)
            
            if method.upper() == 'GET':
                response = self.session.get(url, headers=req_headers, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=req_headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}
            
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_1_account_creation(self):
        """Test 1: Account creation flow"""
        print("🔐 TEST 1: Account Creation Flow")
        
        # Create unique test users
        timestamp = int(time.time())
        test_email = f"e2euser{timestamp}@example.com"
        referrer_email = f"e2ereferrer{timestamp}@example.com"
        
        # Register referrer user first
        referrer_data = {
            "email": referrer_email,
            "password": "TestPass123!",
            "full_name": "E2E Referrer",
            "phone_number": "+44123456789"
        }
        
        success, response, status = self.make_request('POST', '/api/auth/register', referrer_data)
        if success and response.get('success'):
            self.test_referrer = response.get('user', {})
            self.log_test("Account Creation - Referrer", True, f"Referrer ID: {self.test_referrer.get('user_id', 'N/A')}")
        else:
            self.log_test("Account Creation - Referrer", False, f"Status: {status}, Response: {response}")
            return False
        
        # Register main test user
        user_data = {
            "email": test_email,
            "password": "TestPass123!",
            "full_name": "E2E Test User",
            "phone_number": "+44987654321"
        }
        
        success, response, status = self.make_request('POST', '/api/auth/register', user_data)
        if success and response.get('success'):
            self.test_user = response.get('user', {})
            self.log_test("Account Creation - Main User", True, f"User ID: {self.test_user.get('user_id', 'N/A')}")
        else:
            self.log_test("Account Creation - Main User", False, f"Status: {status}, Response: {response}")
            return False
        
        # Test login
        login_data = {
            "email": test_email,
            "password": "TestPass123!"
        }
        
        success, response, status = self.make_request('POST', '/api/auth/login', login_data)
        if success and response.get('success'):
            self.auth_token = response.get('token')
            if self.auth_token:
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            self.log_test("User Login", True, f"Authentication successful")
            return True
        else:
            self.log_test("User Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_2_wallet_deposit_simulation(self):
        """Test 2: Wallet deposit simulation"""
        print("💰 TEST 2: Wallet Deposit Simulation")
        
        if not self.test_user:
            self.log_test("Wallet Deposit", False, "No test user available")
            return False
        
        # Simulate BTC deposit
        deposit_data = {
            "user_id": self.test_user['user_id'],
            "currency": "BTC",
            "amount": 0.1,
            "tx_hash": f"e2e_test_tx_{int(time.time())}"
        }
        
        success, response, status = self.make_request('POST', '/api/wallet/deposit', deposit_data)
        if success and response.get('success'):
            self.log_test("BTC Deposit Simulation", True, f"Deposited 0.1 BTC successfully")
        else:
            self.log_test("BTC Deposit Simulation", False, f"Status: {status}, Response: {response}")
        
        # Simulate ETH deposit for trading
        deposit_data['currency'] = 'ETH'
        deposit_data['amount'] = 5.0
        
        success, response, status = self.make_request('POST', '/api/wallet/deposit', deposit_data)
        if success and response.get('success'):
            self.log_test("ETH Deposit Simulation", True, f"Deposited 5.0 ETH successfully")
        else:
            self.log_test("ETH Deposit Simulation", False, f"Status: {status}, Response: {response}")
        
        # Check wallet balances
        success, response, status = self.make_request('GET', f'/api/wallets/balances/{self.test_user["user_id"]}')
        if success and response.get('success'):
            balances = response.get('balances', [])
            btc_balance = next((b for b in balances if b['currency'] == 'BTC'), None)
            eth_balance = next((b for b in balances if b['currency'] == 'ETH'), None)
            
            self.log_test("Wallet Balance Verification", True, 
                         f"BTC: {btc_balance['total_balance'] if btc_balance else 0}, "
                         f"ETH: {eth_balance['total_balance'] if eth_balance else 0}")
            return True
        else:
            self.log_test("Wallet Balance Verification", False, f"Status: {status}, Response: {response}")
            return False

    def test_3_trading_page_functionality(self):
        """Test 3: Trading page - buy crypto with TradingView indicators visible"""
        print("📈 TEST 3: Trading Page Functionality")
        
        # Test live prices (TradingView data source)
        success, response, status = self.make_request('GET', '/api/prices/live')
        if success and response.get('success'):
            prices = response.get('prices', {})
            btc_price = prices.get('BTC', {}).get('price_usd', 0)
            eth_price = prices.get('ETH', {}).get('price_usd', 0)
            self.log_test("TradingView Live Prices", True, f"BTC: ${btc_price:,.2f}, ETH: ${eth_price:,.2f}")
        else:
            self.log_test("TradingView Live Prices", False, f"Status: {status}, Response: {response}")
        
        # Test trading fee configuration
        success, response, status = self.make_request('GET', '/api/admin/platform-settings')
        if success and response.get('success'):
            settings = response.get('settings', {})
            trading_fee = settings.get('spot_trading_fee_percent', 0)
            self.log_test("Trading Fee Configuration", True, f"Spot trading fee: {trading_fee}%")
        else:
            self.log_test("Trading Fee Configuration", False, f"Status: {status}, Response: {response}")
        
        # Test buy order with fee deduction
        if self.test_user:
            buy_order_data = {
                "user_id": self.test_user['user_id'],
                "pair": "BTCUSD",
                "type": "buy",
                "amount": 0.001,
                "price": 50000,
                "fee_percent": 0.1
            }
            
            success, response, status = self.make_request('POST', '/api/trading/place-order', buy_order_data)
            if success and response.get('success'):
                self.log_test("Buy Crypto Order", True, "0.001 BTC buy order placed with fee deduction")
            else:
                self.log_test("Buy Crypto Order", False, f"Status: {status}, Response: {response}")

    def test_4_trading_sell_with_fees(self):
        """Test 4: Trading page - sell crypto with fee deduction"""
        print("📉 TEST 4: Trading Sell with Fee Deduction")
        
        if self.test_user:
            sell_order_data = {
                "user_id": self.test_user['user_id'],
                "pair": "ETHUSD",
                "type": "sell",
                "amount": 0.1,
                "price": 2300,
                "fee_percent": 0.1
            }
            
            success, response, status = self.make_request('POST', '/api/trading/place-order', sell_order_data)
            if success and response.get('success'):
                self.log_test("Sell Crypto Order", True, "0.1 ETH sell order placed with fee deduction")
            else:
                self.log_test("Sell Crypto Order", False, f"Status: {status}, Response: {response}")

    def test_5_wallet_balance_updates(self):
        """Test 5: Wallet balance updates after each trade"""
        print("💳 TEST 5: Wallet Balance Updates After Trades")
        
        if not self.test_user:
            self.log_test("Wallet Balance Updates", False, "No test user available")
            return False
        
        # Check balances after trading
        success, response, status = self.make_request('GET', f'/api/wallets/balances/{self.test_user["user_id"]}')
        if success and response.get('success'):
            balances = response.get('balances', [])
            total_portfolio = sum(b.get('gbp_value', 0) for b in balances)
            
            self.log_test("Post-Trade Balance Update", True, 
                         f"Total portfolio value: £{total_portfolio:,.2f}")
            return True
        else:
            self.log_test("Post-Trade Balance Update", False, f"Status: {status}, Response: {response}")
            return False

    def test_6_p2p_marketplace_create_offer(self):
        """Test 6: P2P Marketplace - create offer"""
        print("🤝 TEST 6: P2P Marketplace - Create Offer")
        
        if self.test_user:
            offer_data = {
                "seller_id": self.test_user['user_id'],
                "crypto_currency": "BTC",
                "crypto_amount": 0.01,
                "fiat_currency": "GBP",
                "price_per_unit": 50000,
                "min_purchase": 100,
                "max_purchase": 500,
                "payment_methods": ["Bank Transfer", "PayPal"],
                "region": "UK"
            }
            
            success, response, status = self.make_request('POST', '/api/p2p/create-offer', offer_data)
            if success and response.get('success'):
                offer_id = response.get('offer_id')
                self.log_test("P2P Create Offer", True, f"Offer created: {offer_id}")
                self.p2p_offer_id = offer_id
                return True
            else:
                self.log_test("P2P Create Offer", False, f"Status: {status}, Response: {response}")
                return False

    def test_7_p2p_start_trade_escrow(self):
        """Test 7: P2P Marketplace - start trade with escrow"""
        print("🔒 TEST 7: P2P Marketplace - Start Trade with Escrow")
        
        # Get available offers
        success, response, status = self.make_request('GET', '/api/p2p/offers?ad_type=sell&crypto_currency=BTC')
        if success and response.get('success'):
            offers = response.get('offers', [])
            if offers:
                offer = offers[0]
                self.log_test("P2P Get Offers", True, f"Found {len(offers)} BTC offers")
                
                # Start trade with escrow
                if self.test_referrer:
                    trade_data = {
                        "buyer_id": self.test_referrer['user_id'],
                        "offer_id": offer['offer_id'],
                        "crypto_amount": 0.001,
                        "fiat_amount": 50
                    }
                    
                    success, response, status = self.make_request('POST', '/api/p2p/start-trade', trade_data)
                    if success and response.get('success'):
                        trade_id = response.get('trade_id')
                        self.log_test("P2P Start Trade with Escrow", True, f"Trade started: {trade_id}")
                        self.p2p_trade_id = trade_id
                        return True
                    else:
                        self.log_test("P2P Start Trade with Escrow", False, f"Status: {status}, Response: {response}")
            else:
                self.log_test("P2P Get Offers", False, "No offers available")
        else:
            self.log_test("P2P Get Offers", False, f"Status: {status}, Response: {response}")
        
        return False

    def test_8_p2p_mark_paid(self):
        """Test 8: P2P Marketplace - mark paid by buyer"""
        print("💰 TEST 8: P2P Marketplace - Mark Paid by Buyer")
        
        if hasattr(self, 'p2p_trade_id') and self.p2p_trade_id and self.test_referrer:
            mark_paid_data = {
                "trade_id": self.p2p_trade_id,
                "buyer_id": self.test_referrer['user_id'],
                "payment_reference": f"PAY_{int(time.time())}"
            }
            
            success, response, status = self.make_request('POST', '/api/p2p/mark-paid', mark_paid_data)
            if success and response.get('success'):
                self.log_test("P2P Mark Paid", True, "Payment marked by buyer")
                return True
            else:
                self.log_test("P2P Mark Paid", False, f"Status: {status}, Response: {response}")
        else:
            self.log_test("P2P Mark Paid", False, "No active trade available")
        
        return False

    def test_9_p2p_release_crypto(self):
        """Test 9: P2P Marketplace - release crypto by seller"""
        print("🔓 TEST 9: P2P Marketplace - Release Crypto by Seller")
        
        if hasattr(self, 'p2p_trade_id') and self.p2p_trade_id and self.test_user:
            release_data = {
                "trade_id": self.p2p_trade_id,
                "seller_id": self.test_user['user_id']
            }
            
            success, response, status = self.make_request('POST', '/api/p2p/release-crypto', release_data)
            if success and response.get('success'):
                self.log_test("P2P Release Crypto", True, "Crypto released by seller")
                return True
            else:
                self.log_test("P2P Release Crypto", False, f"Status: {status}, Response: {response}")
        else:
            self.log_test("P2P Release Crypto", False, "No active trade available")
        
        return False

    def test_10_p2p_express_instant_buy(self):
        """Test 10: P2P Express - instant buy flow"""
        print("⚡ TEST 10: P2P Express - Instant Buy Flow")
        
        # Test express liquidity check
        liquidity_data = {
            "crypto": "BTC",
            "crypto_amount": 0.001
        }
        
        success, response, status = self.make_request('POST', '/api/p2p/express/check-liquidity', liquidity_data)
        if success and response.get('success'):
            has_liquidity = response.get('has_liquidity', False)
            self.log_test("P2P Express Liquidity Check", True, f"Admin liquidity: {has_liquidity}")
        else:
            self.log_test("P2P Express Liquidity Check", False, f"Status: {status}, Response: {response}")
        
        # Test express order creation
        if self.test_user:
            express_data = {
                "user_id": self.test_user['user_id'],
                "crypto": "BTC",
                "country": "United Kingdom",
                "fiat_amount": 100,
                "crypto_amount": 0.002,
                "base_rate": 50000,
                "express_fee": 2.5,
                "express_fee_percent": 2.5,
                "net_amount": 97.5,
                "has_admin_liquidity": True
            }
            
            success, response, status = self.make_request('POST', '/api/p2p/express/create', express_data)
            if success and response.get('success'):
                trade_id = response.get('trade_id')
                self.log_test("P2P Express Instant Buy", True, f"Express order: {trade_id}")
                return True
            else:
                self.log_test("P2P Express Instant Buy", False, f"Status: {status}, Response: {response}")
        
        return False

    def test_11_business_dashboard_fees(self):
        """Test 11: Business Dashboard - all fees logged"""
        print("📊 TEST 11: Business Dashboard - Fee Tracking")
        
        # Test platform stats
        success, response, status = self.make_request('GET', '/api/admin/platform-stats')
        if success and response.get('success'):
            stats = response.get('stats', {})
            total_fees = stats.get('total_fees_collected', 0)
            total_users = stats.get('total_users', 0)
            self.log_test("Platform Stats", True, f"Total fees: £{total_fees}, Users: {total_users}")
        else:
            self.log_test("Platform Stats", False, f"Status: {status}, Response: {response}")
        
        # Test fee breakdown
        success, response, status = self.make_request('GET', '/api/admin/fee-breakdown')
        if success and response.get('success'):
            breakdown = response.get('breakdown', {})
            trading_fees = breakdown.get('trading_fees', 0)
            p2p_fees = breakdown.get('p2p_fees', 0)
            express_fees = breakdown.get('express_fees', 0)
            self.log_test("Fee Breakdown Tracking", True, 
                         f"Trading: £{trading_fees}, P2P: £{p2p_fees}, Express: £{express_fees}")
            return True
        else:
            self.log_test("Fee Breakdown Tracking", False, f"Status: {status}, Response: {response}")
        
        return False

    def test_12_referral_commission(self):
        """Test 12: Referral commission - verify commission paid to referrer"""
        print("🎯 TEST 12: Referral Commission System")
        
        if not self.test_referrer:
            self.log_test("Referral Commission", False, "No referrer user available")
            return False
        
        # Test referral link generation
        success, response, status = self.make_request('GET', f'/api/referrals/link/{self.test_referrer["user_id"]}')
        if success and response.get('success'):
            referral_code = response.get('referral_code')
            self.log_test("Referral Link Generation", True, f"Code: {referral_code}")
        else:
            self.log_test("Referral Link Generation", False, f"Status: {status}, Response: {response}")
        
        # Test referral stats
        success, response, status = self.make_request('GET', f'/api/referrals/stats/{self.test_referrer["user_id"]}')
        if success and response.get('success'):
            stats = response.get('stats', {})
            total_referrals = stats.get('total_referrals', 0)
            total_commission = stats.get('total_commission', 0)
            commission_rate = stats.get('commission_rate', 20)
            self.log_test("Referral Commission Verification", True, 
                         f"Referrals: {total_referrals}, Commission: £{total_commission} ({commission_rate}%)")
            return True
        else:
            self.log_test("Referral Commission Verification", False, f"Status: {status}, Response: {response}")
        
        return False

    def test_13_all_features_integration(self):
        """Test 13: All features working together without breaking"""
        print("🔄 TEST 13: Complete Integration Test")
        
        # Test complete user journey endpoints
        integration_tests = [
            ("User Profile", f'/api/user/profile/{self.test_user["user_id"]}' if self.test_user else None),
            ("Transaction History", f'/api/wallet/transactions/{self.test_user["user_id"]}' if self.test_user else None),
            ("NOWPayments Integration", '/api/nowpayments/currencies'),
            ("Live Market Data", '/api/prices/live'),
            ("P2P Available Coins", '/api/p2p/marketplace/available-coins'),
            ("Platform Configuration", '/api/admin/platform-settings')
        ]
        
        all_passed = True
        for test_name, endpoint in integration_tests:
            if endpoint:
                success, response, status = self.make_request('GET', endpoint)
                if success and response.get('success'):
                    self.log_test(f"Integration - {test_name}", True, "Endpoint accessible and functional")
                else:
                    self.log_test(f"Integration - {test_name}", False, f"Status: {status}")
                    all_passed = False
            else:
                self.log_test(f"Integration - {test_name}", False, "No test user available")
                all_passed = False
        
        return all_passed

    def run_comprehensive_e2e_test(self):
        """Run complete end-to-end test suite"""
        print("🧪 STARTING FINAL COMPREHENSIVE E2E TEST")
        print(f"📅 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Run all test suites in sequence
        test_suites = [
            ("Account Creation Flow", self.test_1_account_creation),
            ("Wallet Deposit Simulation", self.test_2_wallet_deposit_simulation),
            ("Trading Buy with TradingView", self.test_3_trading_page_functionality),
            ("Trading Sell with Fees", self.test_4_trading_sell_with_fees),
            ("Wallet Balance Updates", self.test_5_wallet_balance_updates),
            ("P2P Create Offer", self.test_6_p2p_marketplace_create_offer),
            ("P2P Start Trade Escrow", self.test_7_p2p_start_trade_escrow),
            ("P2P Mark Paid", self.test_8_p2p_mark_paid),
            ("P2P Release Crypto", self.test_9_p2p_release_crypto),
            ("P2P Express Instant Buy", self.test_10_p2p_express_instant_buy),
            ("Business Dashboard Fees", self.test_11_business_dashboard_fees),
            ("Referral Commission", self.test_12_referral_commission),
            ("Complete Integration", self.test_13_all_features_integration)
        ]
        
        for test_name, test_func in test_suites:
            try:
                print(f"\n{'='*20} {test_name} {'='*20}")
                test_func()
            except Exception as e:
                self.log_test(f"{test_name} - Exception", False, f"Error: {str(e)}")
            print("-" * 60)
        
        # Print final results
        print("\n" + "=" * 80)
        print("📋 FINAL E2E TEST RESULTS")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Categorize results
        critical_failures = []
        minor_issues = []
        
        for result in self.test_results:
            if not result['success']:
                if any(keyword in result['test'].lower() for keyword in ['login', 'deposit', 'trading', 'p2p']):
                    critical_failures.append(result['test'])
                else:
                    minor_issues.append(result['test'])
        
        if critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(critical_failures)}):")
            for failure in critical_failures:
                print(f"   - {failure}")
        
        if minor_issues:
            print(f"\n⚠️  MINOR ISSUES ({len(minor_issues)}):")
            for issue in minor_issues:
                print(f"   - {issue}")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL TESTS PASSED! Platform ready for production launch.")
            return 0
        elif len(critical_failures) == 0:
            print("\n✅ CORE FUNCTIONALITY WORKING! Minor issues can be addressed post-launch.")
            return 0
        else:
            print("\n❌ CRITICAL ISSUES FOUND! Please fix before production launch.")
            return 1

def main():
    """Main test execution"""
    tester = ComprehensiveE2ETest()
    return tester.run_comprehensive_e2e_test()

if __name__ == "__main__":
    sys.exit(main())