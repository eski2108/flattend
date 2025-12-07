#!/usr/bin/env python3
"""
FOCUSED CRITICAL SYSTEMS BACKEND TESTING
Addresses specific issues found in comprehensive testing:

1. P2P Trading System - Fix seller account requirement
2. Crypto Swap System - Fix amount validation and API structure
3. Express Buy System - Fix API structure and parameters
4. Admin Dashboard System - Check correct endpoints
5. Trader Balance System - Fix add-funds endpoint parameters

**Backend URL:** https://protrading.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://protrading.preview.emergentagent.com/api"

# Test Users
TEST_USERS = {
    "seller": {
        "email": "focused_seller@test.com",
        "password": "Test123456",
        "full_name": "Focused Test Seller"
    },
    "buyer": {
        "email": "focused_buyer@test.com", 
        "password": "Test123456",
        "full_name": "Focused Test Buyer"
    }
}

class FocusedCriticalSystemsTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_ids = {}
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
    
    def setup_users(self):
        """Setup test users with proper seller activation"""
        print("\n" + "="*80)
        print("SETTING UP TEST USERS")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        # Register and login users
        for user_key, user_data in TEST_USERS.items():
            total_tests += 1
            
            # Register user
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json=user_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        self.user_ids[user_key] = data["user"]["user_id"]
                    else:
                        # Try login if registration failed
                        login_response = self.session.post(
                            f"{BASE_URL}/auth/login",
                            json={
                                "email": user_data["email"],
                                "password": user_data["password"]
                            },
                            timeout=10
                        )
                        if login_response.status_code == 200:
                            login_data = login_response.json()
                            if login_data.get("success") and login_data.get("user", {}).get("user_id"):
                                self.user_ids[user_key] = login_data["user"]["user_id"]
                elif response.status_code == 400 and "already registered" in response.text:
                    # User exists, login
                    login_response = self.session.post(
                        f"{BASE_URL}/auth/login",
                        json={
                            "email": user_data["email"],
                            "password": user_data["password"]
                        },
                        timeout=10
                    )
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if login_data.get("success") and login_data.get("user", {}).get("user_id"):
                            self.user_ids[user_key] = login_data["user"]["user_id"]
                
                if user_key in self.user_ids:
                    self.log_test(
                        f"Setup {user_key.title()}", 
                        True, 
                        f"{user_key.title()} setup successful (ID: {self.user_ids[user_key]})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        f"Setup {user_key.title()}", 
                        False, 
                        f"Failed to setup {user_key}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Setup {user_key.title()}", 
                    False, 
                    f"Setup failed: {str(e)}"
                )
        
        # Activate seller account if we have a seller
        if "seller" in self.user_ids:
            total_tests += 1
            try:
                # First try mock KYC
                kyc_response = self.session.post(
                    f"{BASE_URL}/auth/mock-kyc",
                    json={"user_id": self.user_ids["seller"]},
                    timeout=10
                )
                
                # Then activate seller
                seller_response = self.session.post(
                    f"{BASE_URL}/p2p/activate-seller",
                    json={"user_id": self.user_ids["seller"]},
                    timeout=10
                )
                
                if seller_response.status_code == 200:
                    data = seller_response.json()
                    if data.get("success"):
                        self.log_test(
                            "Activate Seller Account", 
                            True, 
                            "Seller account activated successfully"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Activate Seller Account", 
                            False, 
                            "Seller activation response indicates failure",
                            data
                        )
                else:
                    self.log_test(
                        "Activate Seller Account", 
                        False, 
                        f"Seller activation failed with status {seller_response.status_code}",
                        seller_response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    "Activate Seller Account", 
                    False, 
                    f"Seller activation failed: {str(e)}"
                )
        
        print(f"\nUser Setup Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_p2p_trading_system_fixed(self):
        """Test P2P trading system with proper seller setup"""
        print("\n" + "="*80)
        print("TESTING P2P TRADING SYSTEM (FIXED)")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("seller"):
            print("❌ Cannot test P2P system - missing seller ID")
            return 0, 1
        
        seller_id = self.user_ids["seller"]
        
        # Test 1: Create P2P sell offer (should work now with activated seller)
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-ad",
                json={
                    "user_id": seller_id,
                    "ad_type": "sell",
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "price_type": "fixed",
                    "price_value": 48000.0,
                    "min_amount": 100.0,
                    "max_amount": 5000.0,
                    "available_amount": 2.5,
                    "payment_methods": ["Bank Transfer", "PayPal"],
                    "terms": "Fast and secure BTC trading"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("ad", {}).get("ad_id"):
                    ad_id = data["ad"]["ad_id"]
                    self.log_test(
                        "Create P2P Sell Offer (Fixed)", 
                        True, 
                        f"Sell offer created successfully (ID: {ad_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Create P2P Sell Offer (Fixed)", 
                        False, 
                        "Create offer response missing success or ad_id",
                        data
                    )
            else:
                self.log_test(
                    "Create P2P Sell Offer (Fixed)", 
                    False, 
                    f"Create offer failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create P2P Sell Offer (Fixed)", 
                False, 
                f"Create offer request failed: {str(e)}"
            )
        
        print(f"\nP2P Trading System (Fixed) Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_crypto_swap_system_fixed(self):
        """Test crypto swap system with correct parameters"""
        print("\n" + "="*80)
        print("TESTING CRYPTO SWAP SYSTEM (FIXED)")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("buyer"):
            print("❌ Cannot test swap system - missing buyer ID")
            return 0, 1
        
        user_id = self.user_ids["buyer"]
        
        # First add some funds to the user
        try:
            add_funds_response = self.session.post(
                f"{BASE_URL}/trader/balance/add-funds",
                params={
                    "trader_id": user_id,
                    "currency": "BTC",
                    "amount": 1.0
                },
                timeout=10
            )
        except:
            pass  # Ignore if this fails, we'll test with what we have
        
        # Test 1: Preview swap with valid amount
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/swap/preview",
                json={
                    "user_id": user_id,
                    "from_currency": "BTC",
                    "to_currency": "USDT",
                    "amount": 0.1  # Valid amount > 0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "estimated_output" in data:
                    estimated_output = data["estimated_output"]
                    fee = data.get("fee", 0)
                    self.log_test(
                        "Preview Swap (Fixed)", 
                        True, 
                        f"Swap preview successful - Output: {estimated_output} USDT, Fee: {fee}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Preview Swap (Fixed)", 
                        False, 
                        "Preview swap response missing required fields",
                        data
                    )
            else:
                self.log_test(
                    "Preview Swap (Fixed)", 
                    False, 
                    f"Preview swap failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Preview Swap (Fixed)", 
                False, 
                f"Preview swap request failed: {str(e)}"
            )
        
        # Test 2: Execute swap with valid amount
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/swap/execute",
                json={
                    "user_id": user_id,
                    "from_currency": "BTC",
                    "to_currency": "USDT",
                    "amount": 0.05  # Valid amount > 0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "swap_id" in data:
                    swap_id = data["swap_id"]
                    self.log_test(
                        "Execute Swap (Fixed)", 
                        True, 
                        f"Swap executed successfully (ID: {swap_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Execute Swap (Fixed)", 
                        False, 
                        "Execute swap response missing success or swap_id",
                        data
                    )
            else:
                self.log_test(
                    "Execute Swap (Fixed)", 
                    False, 
                    f"Execute swap failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Execute Swap (Fixed)", 
                False, 
                f"Execute swap request failed: {str(e)}"
            )
        
        # Test 3: Get swap history
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/swap/history/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "swaps" in data:
                    swaps = data["swaps"]
                    self.log_test(
                        "Get Swap History (Fixed)", 
                        True, 
                        f"Retrieved {len(swaps)} swap transactions"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get Swap History (Fixed)", 
                        False, 
                        "Get swap history response missing success or swaps",
                        data
                    )
            else:
                self.log_test(
                    "Get Swap History (Fixed)", 
                    False, 
                    f"Get swap history failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Swap History (Fixed)", 
                False, 
                f"Get swap history request failed: {str(e)}"
            )
        
        print(f"\nCrypto Swap System (Fixed) Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_express_buy_system_fixed(self):
        """Test express buy system with correct API structure"""
        print("\n" + "="*80)
        print("TESTING EXPRESS BUY SYSTEM (FIXED)")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("buyer"):
            print("❌ Cannot test express buy system - missing buyer ID")
            return 0, 1
        
        user_id = self.user_ids["buyer"]
        
        # Test 1: Express buy match (check correct response structure)
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/express-buy/match",
                json={
                    "user_id": user_id,
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "fiat_amount": 1000.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "matched_offer" in data:
                    matched_offer = data["matched_offer"]
                    price = matched_offer.get("price_per_unit", 0)
                    self.log_test(
                        "Express Buy Match (Fixed)", 
                        True, 
                        f"Express buy match successful - Price: £{price}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Express Buy Match (Fixed)", 
                        False, 
                        "Express buy match response missing success or matched_offer",
                        data
                    )
            else:
                self.log_test(
                    "Express Buy Match (Fixed)", 
                    False, 
                    f"Express buy match failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Express Buy Match (Fixed)", 
                False, 
                f"Express buy match request failed: {str(e)}"
            )
        
        # Test 2: Execute express buy with all required fields
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/express-buy/execute",
                json={
                    "user_id": user_id,
                    "crypto_currency": "BTC",
                    "fiat_currency": "GBP",
                    "fiat_amount": 500.0,
                    "buyer_wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz",
                    "payment_method": "Bank Transfer"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "trade_id" in data:
                    trade_id = data["trade_id"]
                    self.log_test(
                        "Execute Express Buy (Fixed)", 
                        True, 
                        f"Express buy executed successfully (Trade ID: {trade_id})"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Execute Express Buy (Fixed)", 
                        False, 
                        "Execute express buy response missing success or trade_id",
                        data
                    )
            else:
                self.log_test(
                    "Execute Express Buy (Fixed)", 
                    False, 
                    f"Execute express buy failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Execute Express Buy (Fixed)", 
                False, 
                f"Execute express buy request failed: {str(e)}"
            )
        
        print(f"\nExpress Buy System (Fixed) Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_admin_dashboard_system_fixed(self):
        """Test admin dashboard system with correct endpoints"""
        print("\n" + "="*80)
        print("TESTING ADMIN DASHBOARD SYSTEM (FIXED)")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        # Test alternative admin endpoints that might exist
        admin_endpoints = [
            ("Admin Wallet Balance", "GET", "/admin/wallet-balance", {}),
            ("Admin Fee Wallet", "GET", "/admin/fee-wallet-balance", {}),
            ("Admin Platform Earnings", "GET", "/admin/platform-earnings", {}),
            ("Admin Internal Balances", "GET", "/admin/internal-balances", {}),
            ("Admin Dashboard Stats", "GET", "/admin/dashboard-stats", {}),
        ]
        
        for test_name, method, endpoint, data in admin_endpoints:
            total_tests += 1
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}", timeout=10)
                else:
                    response = self.session.post(f"{BASE_URL}{endpoint}", json=data, timeout=10)
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get("success"):
                        self.log_test(
                            f"{test_name} (Fixed)", 
                            True, 
                            f"{test_name} endpoint working"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            f"{test_name} (Fixed)", 
                            False, 
                            f"{test_name} response indicates failure",
                            response_data
                        )
                else:
                    self.log_test(
                        f"{test_name} (Fixed)", 
                        False, 
                        f"{test_name} failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    f"{test_name} (Fixed)", 
                    False, 
                    f"{test_name} request failed: {str(e)}"
                )
        
        print(f"\nAdmin Dashboard System (Fixed) Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def test_trader_balance_system_fixed(self):
        """Test trader balance system with correct parameters"""
        print("\n" + "="*80)
        print("TESTING TRADER BALANCE SYSTEM (FIXED)")
        print("="*80)
        
        success_count = 0
        total_tests = 0
        
        if not self.user_ids.get("buyer"):
            print("❌ Cannot test trader balance system - missing buyer ID")
            return 0, 1
        
        user_id = self.user_ids["buyer"]
        
        # Test 1: Get trader balances
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/trader/my-balances/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    self.log_test(
                        "Get Trader Balances (Fixed)", 
                        True, 
                        f"Retrieved trader balances - {len(balances)} currencies"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Get Trader Balances (Fixed)", 
                        False, 
                        "Get trader balances response missing success or balances",
                        data
                    )
            else:
                self.log_test(
                    "Get Trader Balances (Fixed)", 
                    False, 
                    f"Get trader balances failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Trader Balances (Fixed)", 
                False, 
                f"Get trader balances request failed: {str(e)}"
            )
        
        # Test 2: Add funds with correct parameters (query params instead of JSON body)
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/trader/balance/add-funds",
                params={
                    "trader_id": user_id,
                    "currency": "BTC",
                    "amount": 0.5
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Add Funds to Trader Balance (Fixed)", 
                        True, 
                        "Funds added to trader balance successfully"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Add Funds to Trader Balance (Fixed)", 
                        False, 
                        "Add funds response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Add Funds to Trader Balance (Fixed)", 
                    False, 
                    f"Add funds failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Add Funds to Trader Balance (Fixed)", 
                False, 
                f"Add funds request failed: {str(e)}"
            )
        
        print(f"\nTrader Balance System (Fixed) Results: {success_count}/{total_tests} tests passed")
        return success_count, total_tests
    
    def run_focused_tests(self):
        """Run all focused tests to address critical issues"""
        print("🎯 STARTING FOCUSED CRITICAL SYSTEMS BACKEND TESTING")
        print("="*80)
        
        total_success = 0
        total_tests = 0
        
        # Setup users first
        setup_success, setup_tests = self.setup_users()
        total_success += setup_success
        total_tests += setup_tests
        
        # Run focused test suites
        test_suites = [
            ("P2P Trading System (Fixed)", self.test_p2p_trading_system_fixed),
            ("Crypto Swap System (Fixed)", self.test_crypto_swap_system_fixed),
            ("Express Buy System (Fixed)", self.test_express_buy_system_fixed),
            ("Admin Dashboard System (Fixed)", self.test_admin_dashboard_system_fixed),
            ("Trader Balance System (Fixed)", self.test_trader_balance_system_fixed)
        ]
        
        for suite_name, test_function in test_suites:
            try:
                success, tests = test_function()
                total_success += success
                total_tests += tests
            except Exception as e:
                print(f"❌ {suite_name} test suite failed: {str(e)}")
                total_tests += 1
        
        # Print final summary
        print("\n" + "="*80)
        print("FOCUSED CRITICAL SYSTEMS TESTING SUMMARY")
        print("="*80)
        
        success_rate = (total_success / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_success}")
        print(f"Failed: {total_tests - total_success}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Categorize results
        if success_rate >= 90:
            print("🎉 EXCELLENT: Critical issues resolved")
        elif success_rate >= 75:
            print("✅ GOOD: Most critical issues resolved")
        elif success_rate >= 50:
            print("⚠️  MODERATE: Some critical issues remain")
        else:
            print("❌ CRITICAL: Major issues still present")
        
        # Print failed tests summary
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n🔍 REMAINING ISSUES ({len(failed_tests)} issues):")
            for i, test in enumerate(failed_tests, 1):
                print(f"{i}. {test['test']}: {test['message']}")
        
        return success_rate, total_success, total_tests

def main():
    """Main function to run focused critical systems testing"""
    tester = FocusedCriticalSystemsTester()
    
    try:
        success_rate, passed, total = tester.run_focused_tests()
        
        # Exit with appropriate code
        if success_rate >= 75:
            sys.exit(0)  # Success
        else:
            sys.exit(1)  # Failure
            
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()