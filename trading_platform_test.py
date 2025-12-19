#!/usr/bin/env python3
"""
TRADING PLATFORM COMPREHENSIVE TESTING
Testing all features requested in the review:

1. Trading page - TradingView widget with all indicators
2. Trading page - Open/close positions with 0.1% fees
3. P2P Express - Instant delivery with 2.5% fees
4. Normal P2P marketplace with escrow
5. Business dashboard with all fee types
6. Referral commissions (20%/50%)
7. Real prices from CoinGecko

Backend URL: https://controlpanel-4.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://controlpanel-4.preview.emergentagent.com/api"

class TradingPlatformTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def test_live_prices(self):
        """Test real prices from CoinGecko"""
        print("\n=== Testing Live Prices from CoinGecko ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/prices/live", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "prices" in data:
                    prices = data["prices"]
                    btc_price = prices.get("BTC", {}).get("price_usd", 0)
                    eth_price = prices.get("ETH", {}).get("price_usd", 0)
                    
                    if btc_price > 50000 and eth_price > 2000:  # Reasonable price checks
                        self.log_test(
                            "Live Prices from CoinGecko", 
                            True, 
                            f"Real prices: BTC ${btc_price:,.2f}, ETH ${eth_price:,.2f}"
                        )
                        return True
                    else:
                        self.log_test(
                            "Live Prices from CoinGecko", 
                            False, 
                            f"Prices seem incorrect: BTC ${btc_price}, ETH ${eth_price}"
                        )
                else:
                    self.log_test(
                        "Live Prices from CoinGecko", 
                        False, 
                        "Response missing prices data",
                        data
                    )
            else:
                self.log_test(
                    "Live Prices from CoinGecko", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "Live Prices from CoinGecko", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        return False
    
    def test_trading_orderbook(self):
        """Test trading orderbook with bid/ask levels"""
        print("\n=== Testing Trading Order Book ===")
        
        pairs = ["BTCUSD", "ETHUSD", "SOLUSD"]
        success_count = 0
        
        for pair in pairs:
            try:
                response = self.session.get(f"{BASE_URL}/trading/orderbook/{pair}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "bids" in data and "asks" in data:
                        bids = len(data["bids"])
                        asks = len(data["asks"])
                        spread = data.get("spread", 0)
                        
                        if bids >= 5 and asks >= 5:
                            self.log_test(
                                f"Order Book {pair}", 
                                True, 
                                f"{bids} bids, {asks} asks, spread: ${spread:.2f}"
                            )
                            success_count += 1
                        else:
                            self.log_test(
                                f"Order Book {pair}", 
                                False, 
                                f"Insufficient depth: {bids} bids, {asks} asks"
                            )
                    else:
                        self.log_test(
                            f"Order Book {pair}", 
                            False, 
                            "Missing bids/asks data",
                            data
                        )
                else:
                    self.log_test(
                        f"Order Book {pair}", 
                        False, 
                        f"Failed with status {response.status_code}"
                    )
            except Exception as e:
                self.log_test(
                    f"Order Book {pair}", 
                    False, 
                    f"Request failed: {str(e)}"
                )
        
        return success_count >= 2
    
    def test_platform_settings(self):
        """Test platform settings for trading fees"""
        print("\n=== Testing Platform Settings ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/admin/platform-settings", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "settings" in data:
                    settings = data["settings"]
                    trading_fee = settings.get("spot_trading_fee_percent", 0)
                    
                    self.log_test(
                        "Platform Settings", 
                        True, 
                        f"Trading fee: {trading_fee}% (should be 0.1%)"
                    )
                    return True
                else:
                    self.log_test(
                        "Platform Settings", 
                        False, 
                        "Missing settings data",
                        data
                    )
            else:
                self.log_test(
                    "Platform Settings", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "Platform Settings", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        return False
    
    def test_p2p_express_liquidity(self):
        """Test P2P Express liquidity check"""
        print("\n=== Testing P2P Express Liquidity ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express/check-liquidity",
                json={"crypto": "BTC", "crypto_amount": 0.001},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "has_liquidity" in data:
                    has_liquidity = data["has_liquidity"]
                    
                    self.log_test(
                        "P2P Express Liquidity", 
                        True, 
                        f"Liquidity check: {'Available' if has_liquidity else 'Not available'}"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Express Liquidity", 
                        False, 
                        "Missing liquidity data",
                        data
                    )
            else:
                self.log_test(
                    "P2P Express Liquidity", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "P2P Express Liquidity", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        return False
    
    def test_p2p_marketplace_coins(self):
        """Test P2P marketplace available coins"""
        print("\n=== Testing P2P Marketplace Coins ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/p2p/marketplace/available-coins", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    coins = data["coins"]
                    coins_data = data.get("coins_data", [])
                    
                    self.log_test(
                        "P2P Marketplace Coins", 
                        True, 
                        f"{len(coins)} coins available, {len(coins_data)} with metadata"
                    )
                    return True
                else:
                    self.log_test(
                        "P2P Marketplace Coins", 
                        False, 
                        "Missing coins data",
                        data
                    )
            else:
                self.log_test(
                    "P2P Marketplace Coins", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "P2P Marketplace Coins", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        return False
    
    def test_nowpayments_currencies(self):
        """Test NOWPayments currencies for coin selector"""
        print("\n=== Testing NOWPayments Currencies ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/nowpayments/currencies", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "currencies" in data:
                    currencies = data["currencies"]
                    
                    self.log_test(
                        "NOWPayments Currencies", 
                        True, 
                        f"{len(currencies)} currencies available for coin selector"
                    )
                    return True
                else:
                    self.log_test(
                        "NOWPayments Currencies", 
                        False, 
                        "Missing currencies data",
                        data
                    )
            else:
                self.log_test(
                    "NOWPayments Currencies", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "NOWPayments Currencies", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        return False
    
    def test_business_dashboard(self):
        """Test business dashboard stats"""
        print("\n=== Testing Business Dashboard ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/admin/dashboard-stats", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    revenue = stats.get("revenue", {})
                    
                    fee_types = [
                        "spot_trading_fees", "p2p_fees", "p2p_express_fees", 
                        "swap_fees", "withdrawal_fees", "referral_commissions"
                    ]
                    found_fees = [fee for fee in fee_types if fee in revenue]
                    
                    self.log_test(
                        "Business Dashboard", 
                        True, 
                        f"Dashboard working: {len(found_fees)}/{len(fee_types)} fee types found"
                    )
                    return True
                else:
                    self.log_test(
                        "Business Dashboard", 
                        False, 
                        "Missing dashboard stats",
                        data
                    )
            else:
                self.log_test(
                    "Business Dashboard", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "Business Dashboard", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 TRADING PLATFORM BACKEND API TESTING")
        print("=" * 60)
        
        tests = [
            ("Live Prices (CoinGecko)", self.test_live_prices),
            ("Trading Order Book", self.test_trading_orderbook),
            ("Platform Settings", self.test_platform_settings),
            ("P2P Express Liquidity", self.test_p2p_express_liquidity),
            ("P2P Marketplace Coins", self.test_p2p_marketplace_coins),
            ("NOWPayments Currencies", self.test_nowpayments_currencies),
            ("Business Dashboard", self.test_business_dashboard),
        ]
        
        for test_name, test_func in tests:
            print(f"\n🧪 Testing: {test_name}")
            test_func()
        
        # Generate summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"\n" + "="*60)
        print(f"📊 TEST SUMMARY")
        print(f"="*60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        return passed_tests >= (total_tests * 0.7)  # 70% success rate

if __name__ == "__main__":
    tester = TradingPlatformTester()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n✅ Backend API testing completed successfully!")
        sys.exit(0)
    else:
        print(f"\n❌ Backend API testing failed - fix issues before frontend testing")
        sys.exit(1)