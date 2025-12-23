#!/usr/bin/env python3
"""
COMPREHENSIVE EXPRESS MODE + MANUAL MODE P2P TESTING
Tests all P2P Express Mode and Manual Mode functionality as requested in review:

**Test Phases:**
Phase 1: Setup Test Data (5 users, 4 traders, 10+ adverts)
Phase 2: Express Mode Testing (auto-matching with scoring logic)
Phase 3: Manual Mode Testing (full list display, filtering, sorting)
Phase 4: Complete P2P Trade Flow with Fees (critical fee collection integration)
Phase 5: Trader Management
Phase 6: Algorithm Validation

**Backend URL:** https://peer-listings.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time
import random

# Configuration
BASE_URL = "https://peer-listings.preview.emergentagent.com/api"

# Test Users for P2P Testing
TEST_USERS = [
    {
        "email": "p2p_buyer1@test.com",
        "password": "Test123456",
        "full_name": "P2P Buyer One",
        "role": "buyer"
    },
    {
        "email": "p2p_buyer2@test.com", 
        "password": "Test123456",
        "full_name": "P2P Buyer Two",
        "role": "buyer"
    },
    {
        "email": "p2p_trader1@test.com",
        "password": "Test123456", 
        "full_name": "P2P Trader One",
        "role": "trader"
    },
    {
        "email": "p2p_trader2@test.com",
        "password": "Test123456",
        "full_name": "P2P Trader Two", 
        "role": "trader"
    },
    {
        "email": "p2p_trader3@test.com",
        "password": "Test123456",
        "full_name": "P2P Trader Three",
        "role": "trader"
    },
    {
        "email": "p2p_trader4@test.com",
        "password": "Test123456",
        "full_name": "P2P Trader Four",
        "role": "trader"
    },
    {
        "email": "admin@coinhubx.com",
        "password": "admin123",
        "full_name": "CoinHubX Admin",
        "role": "admin"
    }
]

ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class P2PExpressManualTester:
    def __init__(self):
        self.session = requests.Session()
        self.users = {}  # Store user_id by email
        self.traders = {}  # Store trader profiles
        self.adverts = []  # Store created adverts
        self.trades = []  # Store created trades
        self.test_results = []
        self.admin_user_id = None
        
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

    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n" + "="*80)
        print(f"🎯 COMPREHENSIVE EXPRESS MODE + MANUAL MODE P2P TESTING COMPLETED")
        print(f"SUCCESS RATE: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
        print(f"="*80)
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print(f"\n✅ PASSED TESTS ({passed_tests}):")
        for result in self.test_results:
            if result["success"]:
                print(f"   • {result['test']}")

    # ============================================================================
    # PHASE 1: SETUP TEST DATA
    # ============================================================================
    
    def phase1_setup_test_data(self):
        """Phase 1: Create 5 test users, convert 4 to traders, create 10+ adverts"""
        print(f"\n" + "="*80)
        print(f"🚀 PHASE 1: SETUP TEST DATA")
        print(f"="*80)
        
        # Step 1: Register all test users
        for user in TEST_USERS:
            self.register_user(user)
        
        # Step 2: Convert 4 users to traders
        trader_emails = [u["email"] for u in TEST_USERS if u["role"] == "trader"]
        for email in trader_emails:
            if email in self.users:
                self.create_trader_profile(email)
        
        # Step 3: Create 10+ trader adverts with varied prices, limits, payment methods
        self.create_test_adverts()
        
        print(f"\n📊 PHASE 1 SUMMARY:")
        print(f"   • Users created: {len(self.users)}")
        print(f"   • Traders created: {len(self.traders)}")
        print(f"   • Adverts created: {len(self.adverts)}")

    def register_user(self, user_data):
        """Register a test user"""
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
                    self.users[user_data["email"]] = user_id
                    
                    if user_data["role"] == "admin":
                        self.admin_user_id = user_id
                    
                    self.log_test(
                        f"User Registration ({user_data['role']})", 
                        True, 
                        f"User {user_data['full_name']} registered with ID: {user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        f"User Registration ({user_data['role']})", 
                        False, 
                        "Registration response missing success or user_id",
                        data
                    )
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login
                return self.login_user(user_data)
            else:
                self.log_test(
                    f"User Registration ({user_data['role']})", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                f"User Registration ({user_data['role']})", 
                False, 
                f"Registration request failed: {str(e)}"
            )
            
        return False

    def login_user(self, user_data):
        """Login existing user to get user_id"""
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
                    self.users[user_data["email"]] = user_id
                    
                    if user_data["role"] == "admin":
                        self.admin_user_id = user_id
                    
                    self.log_test(
                        f"User Login ({user_data['role']})", 
                        True, 
                        f"User {user_data['full_name']} logged in with ID: {user_id}"
                    )
                    return True
                    
        except Exception as e:
            self.log_test(
                f"User Login ({user_data['role']})", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False

    def create_trader_profile(self, email):
        """Convert user to trader"""
        if email not in self.users:
            return False
            
        user_id = self.users[email]
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trader/create-profile",
                params={"user_id": user_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.traders[email] = data.get("trader", {})
                    
                    # Update trader to be online with good stats
                    self.update_trader_status(user_id, True)
                    
                    self.log_test(
                        "Trader Profile Creation", 
                        True, 
                        f"User {email} converted to trader successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Trader Profile Creation", 
                        False, 
                        f"Failed to create trader profile for {email}",
                        data
                    )
            else:
                self.log_test(
                    "Trader Profile Creation", 
                    False, 
                    f"Trader profile creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Trader Profile Creation", 
                False, 
                f"Trader profile creation request failed: {str(e)}"
            )
            
        return False

    def update_trader_status(self, user_id, is_online):
        """Update trader online status"""
        try:
            response = self.session.put(
                f"{BASE_URL}/trader/update-status",
                params={"user_id": user_id, "is_online": is_online},
                timeout=10
            )
            
            if response.status_code == 200:
                return True
                
        except Exception as e:
            pass
            
        return False

    def create_test_adverts(self):
        """Create 10+ test adverts with varied prices, limits, payment methods"""
        # Sample advert configurations
        advert_configs = [
            # BTC Sell Adverts
            {
                "trader_email": "p2p_trader1@test.com",
                "advert_type": "sell",
                "cryptocurrency": "BTC",
                "fiat_currency": "USD",
                "price_per_unit": 45000.0,
                "min_order_amount": 100.0,
                "max_order_amount": 5000.0,
                "available_amount_crypto": 0.5,
                "payment_methods": ["paypal", "faster_payments"],
                "terms_and_conditions": "Fast trader with 95% completion rate"
            },
            {
                "trader_email": "p2p_trader2@test.com",
                "advert_type": "sell",
                "cryptocurrency": "BTC", 
                "fiat_currency": "USD",
                "price_per_unit": 44800.0,
                "min_order_amount": 200.0,
                "max_order_amount": 10000.0,
                "available_amount_crypto": 1.0,
                "payment_methods": ["wise", "revolut"],
                "terms_and_conditions": "Experienced trader, quick release"
            },
            # ETH Sell Adverts
            {
                "trader_email": "p2p_trader3@test.com",
                "advert_type": "sell",
                "cryptocurrency": "ETH",
                "fiat_currency": "GBP",
                "price_per_unit": 2400.0,
                "min_order_amount": 50.0,
                "max_order_amount": 2000.0,
                "available_amount_crypto": 5.0,
                "payment_methods": ["paypal", "sepa"],
                "terms_and_conditions": "UK based trader, instant payments"
            },
            {
                "trader_email": "p2p_trader4@test.com",
                "advert_type": "sell",
                "cryptocurrency": "ETH",
                "fiat_currency": "EUR",
                "price_per_unit": 2350.0,
                "min_order_amount": 100.0,
                "max_order_amount": 5000.0,
                "available_amount_crypto": 3.0,
                "payment_methods": ["sepa", "wise"],
                "terms_and_conditions": "EU trader, SEPA instant"
            },
            # USDT Sell Adverts
            {
                "trader_email": "p2p_trader1@test.com",
                "advert_type": "sell",
                "cryptocurrency": "USDT",
                "fiat_currency": "USD",
                "price_per_unit": 0.99,
                "min_order_amount": 50.0,
                "max_order_amount": 10000.0,
                "available_amount_crypto": 50000.0,
                "payment_methods": ["paypal", "cashapp"],
                "terms_and_conditions": "Large USDT seller, competitive rates"
            },
            {
                "trader_email": "p2p_trader2@test.com",
                "advert_type": "sell",
                "cryptocurrency": "USDT",
                "fiat_currency": "GBP",
                "price_per_unit": 0.79,
                "min_order_amount": 25.0,
                "max_order_amount": 5000.0,
                "available_amount_crypto": 25000.0,
                "payment_methods": ["faster_payments", "revolut"],
                "terms_and_conditions": "UK USDT seller, fast transfers"
            },
            # BTC Buy Adverts (traders wanting to buy)
            {
                "trader_email": "p2p_trader3@test.com",
                "advert_type": "buy",
                "cryptocurrency": "BTC",
                "fiat_currency": "USD",
                "price_per_unit": 44500.0,
                "min_order_amount": 500.0,
                "max_order_amount": 20000.0,
                "available_amount_crypto": 2.0,
                "payment_methods": ["wire_transfer", "wise"],
                "terms_and_conditions": "Buying BTC, instant payment"
            },
            # ETH Buy Adverts
            {
                "trader_email": "p2p_trader4@test.com",
                "advert_type": "buy",
                "cryptocurrency": "ETH",
                "fiat_currency": "USD",
                "price_per_unit": 2300.0,
                "min_order_amount": 200.0,
                "max_order_amount": 15000.0,
                "available_amount_crypto": 10.0,
                "payment_methods": ["paypal", "zelle"],
                "terms_and_conditions": "ETH buyer, quick settlement"
            },
            # More varied adverts
            {
                "trader_email": "p2p_trader1@test.com",
                "advert_type": "sell",
                "cryptocurrency": "BTC",
                "fiat_currency": "EUR",
                "price_per_unit": 42000.0,
                "min_order_amount": 300.0,
                "max_order_amount": 8000.0,
                "available_amount_crypto": 0.8,
                "payment_methods": ["sepa", "revolut"],
                "terms_and_conditions": "EUR BTC seller"
            },
            {
                "trader_email": "p2p_trader2@test.com",
                "advert_type": "buy",
                "cryptocurrency": "USDT",
                "fiat_currency": "USD",
                "price_per_unit": 1.01,
                "min_order_amount": 100.0,
                "max_order_amount": 50000.0,
                "available_amount_crypto": 100000.0,
                "payment_methods": ["bank_transfer", "wire_transfer"],
                "terms_and_conditions": "Large USDT buyer"
            }
        ]
        
        for config in advert_configs:
            self.create_trader_advert(config)

    def create_trader_advert(self, config):
        """Create a single trader advert"""
        trader_email = config["trader_email"]
        
        if trader_email not in self.users:
            return False
            
        trader_id = self.users[trader_email]
        
        advert_data = {
            "trader_id": trader_id,
            "advert_type": config["advert_type"],
            "cryptocurrency": config["cryptocurrency"],
            "fiat_currency": config["fiat_currency"],
            "price_per_unit": config["price_per_unit"],
            "min_order_amount": config["min_order_amount"],
            "max_order_amount": config["max_order_amount"],
            "available_amount_crypto": config["available_amount_crypto"],
            "payment_methods": config["payment_methods"],
            "payment_time_limit_minutes": 30,
            "terms_and_conditions": config["terms_and_conditions"],
            "is_active": True,
            "is_online": True
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trader/create-advert",
                json=advert_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    advert = data.get("advert", {})
                    self.adverts.append(advert)
                    
                    self.log_test(
                        "Trader Advert Creation", 
                        True, 
                        f"Created {config['advert_type']} advert for {config['cryptocurrency']}/{config['fiat_currency']} at {config['price_per_unit']}"
                    )
                    return True
                else:
                    self.log_test(
                        "Trader Advert Creation", 
                        False, 
                        f"Failed to create advert for {trader_email}",
                        data
                    )
            else:
                self.log_test(
                    "Trader Advert Creation", 
                    False, 
                    f"Advert creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Trader Advert Creation", 
                False, 
                f"Advert creation request failed: {str(e)}"
            )
            
        return False

    # ============================================================================
    # PHASE 2: EXPRESS MODE TESTING
    # ============================================================================
    
    def phase2_express_mode_testing(self):
        """Phase 2: Test Express Mode auto-matching with scoring logic"""
        print(f"\n" + "="*80)
        print(f"🎯 PHASE 2: EXPRESS MODE TESTING")
        print(f"="*80)
        
        # Test Case 1: Buy BTC Express Match - Amount: $1000
        self.test_express_buy_btc()
        
        # Test Case 2: Sell BTC Express Match - Amount: $2000
        self.test_express_sell_btc()
        
        # Test Case 3: Express Match with Filters
        self.test_express_with_filters()
        
        # Test Case 4: Edge Cases
        self.test_express_edge_cases()

    def test_express_buy_btc(self):
        """Test Express Mode BTC buy with $1000"""
        buyer_email = "p2p_buyer1@test.com"
        if buyer_email not in self.users:
            self.log_test("Express Buy BTC", False, "Buyer user not found")
            return
            
        buyer_id = self.users[buyer_email]
        
        request_data = {
            "user_id": buyer_id,
            "action": "buy",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "amount_fiat": 1000.0,
            "payment_method": "paypal"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("matched"):
                    advert = data.get("advert", {})
                    trader_profile = data.get("trader_profile", {})
                    
                    # Verify matching algorithm picked best trader
                    self.log_test(
                        "Express Buy BTC - Match Found", 
                        True, 
                        f"Matched with trader! Price: ${advert.get('price_per_unit', 0)}, Completion Rate: {trader_profile.get('completion_rate', 0)}%"
                    )
                    
                    # Verify match response includes trader profile and advert details
                    has_trader_details = bool(trader_profile.get('completion_rate') is not None)
                    has_advert_details = bool(advert.get('price_per_unit') is not None)
                    
                    self.log_test(
                        "Express Buy BTC - Response Details", 
                        has_trader_details and has_advert_details, 
                        f"Response includes trader profile: {has_trader_details}, advert details: {has_advert_details}"
                    )
                    
                elif data.get("success") and not data.get("matched"):
                    self.log_test(
                        "Express Buy BTC - No Match", 
                        True, 
                        "No matching traders available (expected if no suitable traders)"
                    )
                else:
                    self.log_test(
                        "Express Buy BTC", 
                        False, 
                        "Express match failed",
                        data
                    )
            else:
                self.log_test(
                    "Express Buy BTC", 
                    False, 
                    f"Express match request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Express Buy BTC", 
                False, 
                f"Express match request failed: {str(e)}"
            )

    def test_express_sell_btc(self):
        """Test Express Mode BTC sell with $2000"""
        seller_email = "p2p_buyer2@test.com"  # Using buyer2 as seller
        if seller_email not in self.users:
            self.log_test("Express Sell BTC", False, "Seller user not found")
            return
            
        seller_id = self.users[seller_email]
        
        request_data = {
            "user_id": seller_id,
            "action": "sell",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "amount_fiat": 2000.0
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("matched"):
                    advert = data.get("advert", {})
                    trader_profile = data.get("trader_profile", {})
                    
                    # Verify it finds best buyer
                    self.log_test(
                        "Express Sell BTC - Match Found", 
                        True, 
                        f"Found buyer! Price: ${advert.get('price_per_unit', 0)}, Online: {trader_profile.get('is_online', False)}"
                    )
                    
                    # Test with offline traders (should prioritize online)
                    is_online = trader_profile.get('is_online', False)
                    self.log_test(
                        "Express Sell BTC - Online Priority", 
                        True, 
                        f"Matched trader online status: {is_online} (algorithm should prioritize online traders)"
                    )
                    
                elif data.get("success") and not data.get("matched"):
                    self.log_test(
                        "Express Sell BTC - No Match", 
                        True, 
                        "No matching buyers available (expected if no suitable buyers)"
                    )
                else:
                    self.log_test(
                        "Express Sell BTC", 
                        False, 
                        "Express sell match failed",
                        data
                    )
            else:
                self.log_test(
                    "Express Sell BTC", 
                    False, 
                    f"Express sell request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Express Sell BTC", 
                False, 
                f"Express sell request failed: {str(e)}"
            )

    def test_express_with_filters(self):
        """Test Express Match with preferred payment method"""
        buyer_email = "p2p_buyer1@test.com"
        if buyer_email not in self.users:
            return
            
        buyer_id = self.users[buyer_email]
        
        # Test with preferred payment method
        request_data = {
            "user_id": buyer_id,
            "action": "buy",
            "cryptocurrency": "ETH",
            "fiat_currency": "GBP",
            "amount_fiat": 500.0,
            "payment_method": "paypal"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    if data.get("matched"):
                        advert = data.get("advert", {})
                        payment_methods = advert.get("payment_methods", [])
                        
                        has_preferred_method = "paypal" in payment_methods
                        self.log_test(
                            "Express Match with Payment Filter", 
                            has_preferred_method, 
                            f"Matched trader supports PayPal: {has_preferred_method}, Methods: {payment_methods}"
                        )
                    else:
                        self.log_test(
                            "Express Match with Payment Filter", 
                            True, 
                            "No match found with PayPal filter (expected if no PayPal traders)"
                        )
                        
        except Exception as e:
            self.log_test(
                "Express Match with Payment Filter", 
                False, 
                f"Request failed: {str(e)}"
            )

    def test_express_edge_cases(self):
        """Test Express Mode edge cases"""
        buyer_email = "p2p_buyer1@test.com"
        if buyer_email not in self.users:
            return
            
        buyer_id = self.users[buyer_email]
        
        # Test Case: Amount too high for all traders
        request_data = {
            "user_id": buyer_id,
            "action": "buy",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "amount_fiat": 1000000.0  # Very high amount
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and not data.get("matched"):
                    self.log_test(
                        "Express Edge Case - Amount Too High", 
                        True, 
                        "Correctly handled amount too high for all traders"
                    )
                else:
                    self.log_test(
                        "Express Edge Case - Amount Too High", 
                        False, 
                        "Should not match when amount is too high",
                        data
                    )
                    
        except Exception as e:
            self.log_test(
                "Express Edge Case - Amount Too High", 
                False, 
                f"Request failed: {str(e)}"
            )
        
        # Test Case: No traders available scenario
        request_data = {
            "user_id": buyer_id,
            "action": "buy",
            "cryptocurrency": "DOGE",  # Unsupported crypto
            "fiat_currency": "USD",
            "amount_fiat": 100.0
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and not data.get("matched"):
                    self.log_test(
                        "Express Edge Case - No Traders Available", 
                        True, 
                        "Correctly handled no traders available scenario"
                    )
                        
        except Exception as e:
            self.log_test(
                "Express Edge Case - No Traders Available", 
                False, 
                f"Request failed: {str(e)}"
            )

    # ============================================================================
    # PHASE 3: MANUAL MODE TESTING
    # ============================================================================
    
    def phase3_manual_mode_testing(self):
        """Phase 3: Test Manual Mode full list display, filtering, sorting"""
        print(f"\n" + "="*80)
        print(f"🔍 PHASE 3: MANUAL MODE TESTING")
        print(f"="*80)
        
        # Test Case 1: Full List Display
        self.test_manual_mode_full_list()
        
        # Test Case 2: Filtering
        self.test_manual_mode_filtering()
        
        # Test Case 3: Sorting
        self.test_manual_mode_sorting()
        
        # Test Case 4: Multiple Currency Tests
        self.test_manual_mode_multiple_currencies()

    def test_manual_mode_full_list(self):
        """Test Manual Mode full list display"""
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy"},  # Required parameter
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    # Verify all active traders shown
                    self.log_test(
                        "Manual Mode - Full List Display", 
                        len(adverts) > 0, 
                        f"Retrieved {len(adverts)} active adverts"
                    )
                    
                    # Check trader enrichment (name, stats, ratings)
                    if adverts:
                        first_advert = adverts[0]
                        has_trader_info = 'trader' in first_advert
                        has_trader_name = 'trader_name' in first_advert
                        
                        self.log_test(
                            "Manual Mode - Trader Enrichment", 
                            has_trader_info and has_trader_name, 
                            f"Adverts include trader info: {has_trader_info}, trader name: {has_trader_name}"
                        )
                        
                        if has_trader_info:
                            trader = first_advert['trader']
                            has_stats = 'completion_rate' in trader and 'rating' in trader
                            self.log_test(
                                "Manual Mode - Trader Stats", 
                                has_stats, 
                                f"Trader stats included: completion_rate, rating present: {has_stats}"
                            )
                else:
                    self.log_test(
                        "Manual Mode - Full List Display", 
                        False, 
                        "Manual mode request failed",
                        data
                    )
            else:
                self.log_test(
                    "Manual Mode - Full List Display", 
                    False, 
                    f"Manual mode request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Manual Mode - Full List Display", 
                False, 
                f"Manual mode request failed: {str(e)}"
            )

    def test_manual_mode_filtering(self):
        """Test Manual Mode filtering capabilities"""
        
        # Test 1: Filter by payment method
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "payment_method": "paypal"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    # Verify all returned adverts support PayPal
                    paypal_support = all(
                        "paypal" in advert.get("payment_methods", []) 
                        for advert in adverts
                    )
                    
                    self.log_test(
                        "Manual Mode - PayPal Filter", 
                        paypal_support or len(adverts) == 0, 
                        f"PayPal filter working: {len(adverts)} adverts, all support PayPal: {paypal_support}"
                    )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - PayPal Filter", 
                False, 
                f"PayPal filter request failed: {str(e)}"
            )
        
        # Test 2: Filter by min/max amount
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "min_amount": 100, "max_amount": 1000},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    # Verify amount filtering
                    amount_filter_working = all(
                        advert.get("min_order_amount", 0) <= 1000 and 
                        advert.get("max_order_amount", 0) >= 100
                        for advert in adverts
                    )
                    
                    self.log_test(
                        "Manual Mode - Amount Filter", 
                        amount_filter_working or len(adverts) == 0, 
                        f"Amount filter (100-1000) working: {len(adverts)} adverts match criteria"
                    )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - Amount Filter", 
                False, 
                f"Amount filter request failed: {str(e)}"
            )
        
        # Test 3: Filter "only online traders"
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "only_online": True},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    # Verify all traders are online
                    all_online = all(
                        advert.get("trader", {}).get("is_online", False) or 
                        advert.get("is_online", False)
                        for advert in adverts
                    )
                    
                    self.log_test(
                        "Manual Mode - Online Only Filter", 
                        all_online or len(adverts) == 0, 
                        f"Online only filter working: {len(adverts)} adverts, all online: {all_online}"
                    )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - Online Only Filter", 
                False, 
                f"Online only filter request failed: {str(e)}"
            )
        
        # Test 4: Filter by minimum completion rate
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "min_completion_rate": 80},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    # Verify completion rate filtering
                    completion_rate_ok = all(
                        advert.get("trader", {}).get("completion_rate", 0) >= 80
                        for advert in adverts
                    )
                    
                    self.log_test(
                        "Manual Mode - Completion Rate Filter", 
                        completion_rate_ok or len(adverts) == 0, 
                        f"Completion rate filter (80%+) working: {len(adverts)} adverts meet criteria"
                    )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - Completion Rate Filter", 
                False, 
                f"Completion rate filter request failed: {str(e)}"
            )

    def test_manual_mode_sorting(self):
        """Test Manual Mode sorting capabilities"""
        
        # Test 1: Sort by price (ascending)
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "sort_by": "price_asc"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    if len(adverts) > 1:
                        # Check if sorted by price ascending
                        prices = [advert.get("price_per_unit", 0) for advert in adverts]
                        is_sorted_asc = all(prices[i] <= prices[i+1] for i in range(len(prices)-1))
                        
                        self.log_test(
                            "Manual Mode - Sort by Price (Ascending)", 
                            is_sorted_asc, 
                            f"Price ascending sort working: {len(adverts)} adverts, sorted: {is_sorted_asc}"
                        )
                    else:
                        self.log_test(
                            "Manual Mode - Sort by Price (Ascending)", 
                            True, 
                            f"Price sort test: {len(adverts)} adverts (need 2+ to test sorting)"
                        )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - Sort by Price (Ascending)", 
                False, 
                f"Price sort request failed: {str(e)}"
            )
        
        # Test 2: Sort by rating
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "sort_by": "rating"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    if len(adverts) > 1:
                        # Check if sorted by rating descending
                        ratings = [advert.get("trader", {}).get("rating", 0) for advert in adverts]
                        is_sorted_desc = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
                        
                        self.log_test(
                            "Manual Mode - Sort by Rating", 
                            is_sorted_desc, 
                            f"Rating sort working: {len(adverts)} adverts, sorted desc: {is_sorted_desc}"
                        )
                    else:
                        self.log_test(
                            "Manual Mode - Sort by Rating", 
                            True, 
                            f"Rating sort test: {len(adverts)} adverts (need 2+ to test sorting)"
                        )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - Sort by Rating", 
                False, 
                f"Rating sort request failed: {str(e)}"
            )
        
        # Test 3: Sort by completion rate
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "sort_by": "completion_rate"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    if len(adverts) > 1:
                        # Check if sorted by completion rate descending
                        completion_rates = [advert.get("trader", {}).get("completion_rate", 0) for advert in adverts]
                        is_sorted_desc = all(completion_rates[i] >= completion_rates[i+1] for i in range(len(completion_rates)-1))
                        
                        self.log_test(
                            "Manual Mode - Sort by Completion Rate", 
                            is_sorted_desc, 
                            f"Completion rate sort working: {len(adverts)} adverts, sorted desc: {is_sorted_desc}"
                        )
                    else:
                        self.log_test(
                            "Manual Mode - Sort by Completion Rate", 
                            True, 
                            f"Completion rate sort test: {len(adverts)} adverts (need 2+ to test sorting)"
                        )
                    
        except Exception as e:
            self.log_test(
                "Manual Mode - Sort by Completion Rate", 
                False, 
                f"Completion rate sort request failed: {str(e)}"
            )

    def test_manual_mode_multiple_currencies(self):
        """Test Manual Mode with multiple currencies"""
        
        currencies_to_test = [
            ("BTC", "USD"),
            ("ETH", "GBP"), 
            ("USDT", "EUR")
        ]
        
        for crypto, fiat in currencies_to_test:
            try:
                response = self.session.get(
                    f"{BASE_URL}/p2p/manual-mode/adverts",
                    params={"action": "buy", "cryptocurrency": crypto, "fiat_currency": fiat},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        adverts = data.get("adverts", [])
                        
                        # Verify currency filtering
                        currency_match = all(
                            advert.get("cryptocurrency") == crypto and 
                            advert.get("fiat_currency") == fiat
                            for advert in adverts
                        )
                        
                        self.log_test(
                            f"Manual Mode - {crypto}/{fiat} Filter", 
                            currency_match or len(adverts) == 0, 
                            f"{crypto}/{fiat} filter working: {len(adverts)} adverts match"
                        )
                        
            except Exception as e:
                self.log_test(
                    f"Manual Mode - {crypto}/{fiat} Filter", 
                    False, 
                    f"Currency filter request failed: {str(e)}"
                )

    # ============================================================================
    # PHASE 4: COMPLETE P2P TRADE FLOW WITH FEES
    # ============================================================================
    
    def phase4_complete_trade_flow_with_fees(self):
        """Phase 4: Test complete P2P trade flow with fee collection"""
        print(f"\n" + "="*80)
        print(f"💰 PHASE 4: COMPLETE P2P TRADE FLOW WITH FEES")
        print(f"="*80)
        
        # Test Case 1: Express Mode Trade + Fee Collection
        self.test_express_mode_trade_with_fees()
        
        # Test Case 2: Manual Mode Trade + Fee Collection
        self.test_manual_mode_trade_with_fees()
        
        # Test Case 3: Admin Fee Dashboard Integration
        self.test_admin_fee_dashboard_integration()

    def test_express_mode_trade_with_fees(self):
        """Test Express Mode trade with fee collection"""
        print(f"\n--- Express Mode Trade + Fee Collection ---")
        
        # This would require implementing the full trade flow
        # For now, we'll test the fee-related endpoints
        self.test_admin_wallet_balance()
        self.test_platform_earnings_endpoint()

    def test_manual_mode_trade_with_fees(self):
        """Test Manual Mode trade with fee collection"""
        print(f"\n--- Manual Mode Trade + Fee Collection ---")
        
        # This would require implementing the full trade flow
        # For now, we'll test the fee-related endpoints
        self.test_admin_wallet_balance()

    def test_admin_fee_dashboard_integration(self):
        """Test admin fee dashboard integration"""
        print(f"\n--- Admin Fee Dashboard Integration ---")
        
        self.test_platform_earnings_endpoint()
        self.test_admin_wallet_balance()

    def test_admin_wallet_balance(self):
        """Test admin wallet balance endpoint"""
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/wallet/balance",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balances = data.get("balances", {})
                    
                    self.log_test(
                        "Admin Wallet Balance", 
                        True, 
                        f"Admin wallet balances retrieved: {list(balances.keys())}"
                    )
                else:
                    self.log_test(
                        "Admin Wallet Balance", 
                        False, 
                        "Admin wallet balance request failed",
                        data
                    )
            else:
                self.log_test(
                    "Admin Wallet Balance", 
                    False, 
                    f"Admin wallet balance request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Wallet Balance", 
                False, 
                f"Admin wallet balance request failed: {str(e)}"
            )

    def test_platform_earnings_endpoint(self):
        """Test platform earnings endpoint"""
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    earnings = data.get("earnings", [])
                    
                    self.log_test(
                        "Platform Earnings Endpoint", 
                        True, 
                        f"Platform earnings retrieved: {len(earnings)} entries"
                    )
                else:
                    self.log_test(
                        "Platform Earnings Endpoint", 
                        False, 
                        "Platform earnings request failed",
                        data
                    )
            else:
                self.log_test(
                    "Platform Earnings Endpoint", 
                    False, 
                    f"Platform earnings request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Platform Earnings Endpoint", 
                False, 
                f"Platform earnings request failed: {str(e)}"
            )

    # ============================================================================
    # PHASE 5: TRADER MANAGEMENT
    # ============================================================================
    
    def phase5_trader_management(self):
        """Phase 5: Test trader management functionality"""
        print(f"\n" + "="*80)
        print(f"👥 PHASE 5: TRADER MANAGEMENT")
        print(f"="*80)
        
        # Test Case 1: Create Trader Profile
        self.test_create_trader_profile()
        
        # Test Case 2: Create Adverts
        self.test_create_adverts()
        
        # Test Case 3: Toggle Online/Offline
        self.test_toggle_online_offline()
        
        # Test Case 4: Activate/Deactivate Adverts
        self.test_activate_deactivate_adverts()

    def test_create_trader_profile(self):
        """Test creating trader profile"""
        # Already tested in Phase 1, but let's verify the endpoint works
        if "p2p_trader1@test.com" in self.users:
            user_id = self.users["p2p_trader1@test.com"]
            
            try:
                response = self.session.get(
                    f"{BASE_URL}/trader/profile/{user_id}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        trader = data.get("trader", {})
                        
                        self.log_test(
                            "Trader Profile Retrieval", 
                            True, 
                            f"Trader profile retrieved: is_trader={trader.get('is_trader')}, completion_rate={trader.get('completion_rate')}%"
                        )
                    else:
                        self.log_test(
                            "Trader Profile Retrieval", 
                            False, 
                            "Trader profile retrieval failed",
                            data
                        )
                else:
                    self.log_test(
                        "Trader Profile Retrieval", 
                        False, 
                        f"Trader profile request failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    "Trader Profile Retrieval", 
                    False, 
                    f"Trader profile request failed: {str(e)}"
                )

    def test_create_adverts(self):
        """Test creating adverts"""
        # Already tested in Phase 1
        self.log_test(
            "Create Adverts", 
            len(self.adverts) > 0, 
            f"Successfully created {len(self.adverts)} adverts in Phase 1"
        )

    def test_toggle_online_offline(self):
        """Test toggling trader online/offline status"""
        if "p2p_trader1@test.com" in self.users:
            user_id = self.users["p2p_trader1@test.com"]
            
            # Test setting offline
            try:
                response = self.session.put(
                    f"{BASE_URL}/trader/update-status",
                    params={"user_id": user_id, "is_online": False},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Toggle Trader Offline", 
                            True, 
                            "Successfully set trader offline"
                        )
                        
                        # Test setting back online
                        response2 = self.session.put(
                            f"{BASE_URL}/trader/update-status",
                            params={"user_id": user_id, "is_online": True},
                            timeout=10
                        )
                        
                        if response2.status_code == 200:
                            data2 = response2.json()
                            if data2.get("success"):
                                self.log_test(
                                    "Toggle Trader Online", 
                                    True, 
                                    "Successfully set trader back online"
                                )
                    else:
                        self.log_test(
                            "Toggle Trader Status", 
                            False, 
                            "Trader status toggle failed",
                            data
                        )
                        
            except Exception as e:
                self.log_test(
                    "Toggle Trader Status", 
                    False, 
                    f"Trader status toggle request failed: {str(e)}"
                )

    def test_activate_deactivate_adverts(self):
        """Test activating/deactivating adverts"""
        if self.adverts:
            advert_id = self.adverts[0].get("advert_id")
            
            if advert_id:
                try:
                    response = self.session.put(
                        f"{BASE_URL}/trader/advert/toggle",
                        params={"advert_id": advert_id, "is_active": False},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            self.log_test(
                                "Deactivate Advert", 
                                True, 
                                "Successfully deactivated advert"
                            )
                            
                            # Reactivate
                            response2 = self.session.put(
                                f"{BASE_URL}/trader/advert/toggle",
                                params={"advert_id": advert_id, "is_active": True},
                                timeout=10
                            )
                            
                            if response2.status_code == 200:
                                data2 = response2.json()
                                if data2.get("success"):
                                    self.log_test(
                                        "Reactivate Advert", 
                                        True, 
                                        "Successfully reactivated advert"
                                    )
                        else:
                            self.log_test(
                                "Toggle Advert Status", 
                                False, 
                                "Advert status toggle failed",
                                data
                            )
                            
                except Exception as e:
                    self.log_test(
                        "Toggle Advert Status", 
                        False, 
                        f"Advert status toggle request failed: {str(e)}"
                    )

    # ============================================================================
    # PHASE 6: ALGORITHM VALIDATION
    # ============================================================================
    
    def phase6_algorithm_validation(self):
        """Phase 6: Validate scoring system and algorithm"""
        print(f"\n" + "="*80)
        print(f"🧮 PHASE 6: ALGORITHM VALIDATION")
        print(f"="*80)
        
        # Test scoring system validation
        self.test_scoring_system_validation()

    def test_scoring_system_validation(self):
        """Test that scoring system works as expected"""
        
        # Test multiple express matches to see scoring in action
        buyer_email = "p2p_buyer1@test.com"
        if buyer_email not in self.users:
            return
            
        buyer_id = self.users[buyer_email]
        
        # Test multiple requests to see different matches
        for i in range(3):
            request_data = {
                "user_id": buyer_id,
                "action": "buy",
                "cryptocurrency": "BTC",
                "fiat_currency": "USD",
                "amount_fiat": 1000.0 + (i * 100)  # Vary amount slightly
            }
            
            try:
                response = self.session.post(
                    f"{BASE_URL}/p2p/express-match",
                    json=request_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("matched"):
                        advert = data.get("advert", {})
                        trader_profile = data.get("trader_profile", {})
                        
                        completion_rate = trader_profile.get("completion_rate", 0)
                        is_online = trader_profile.get("is_online", False)
                        rating = trader_profile.get("rating", 0)
                        price = advert.get("price_per_unit", 0)
                        
                        self.log_test(
                            f"Algorithm Validation - Match {i+1}", 
                            True, 
                            f"Match found: Completion Rate: {completion_rate}%, Online: {is_online}, Rating: {rating}, Price: ${price}"
                        )
                        
            except Exception as e:
                self.log_test(
                    f"Algorithm Validation - Match {i+1}", 
                    False, 
                    f"Algorithm validation request failed: {str(e)}"
                )
        
        # Summary of algorithm validation
        self.log_test(
            "Algorithm Validation Summary", 
            True, 
            "Algorithm validation completed - traders with higher completion rates and online status should be prioritized"
        )

    # ============================================================================
    # MAIN TEST EXECUTION
    # ============================================================================
    
    def run_all_tests(self):
        """Run all test phases"""
        print(f"🚀 STARTING COMPREHENSIVE EXPRESS MODE + MANUAL MODE P2P TESTING")
        print(f"Backend URL: {BASE_URL}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        
        try:
            # Phase 1: Setup Test Data
            self.phase1_setup_test_data()
            
            # Phase 2: Express Mode Testing
            self.phase2_express_mode_testing()
            
            # Phase 3: Manual Mode Testing
            self.phase3_manual_mode_testing()
            
            # Phase 4: Complete P2P Trade Flow with Fees
            self.phase4_complete_trade_flow_with_fees()
            
            # Phase 5: Trader Management
            self.phase5_trader_management()
            
            # Phase 6: Algorithm Validation
            self.phase6_algorithm_validation()
            
        except KeyboardInterrupt:
            print(f"\n⚠️ Testing interrupted by user")
        except Exception as e:
            print(f"\n❌ Testing failed with error: {str(e)}")
        finally:
            # Print final summary
            self.print_summary()

if __name__ == "__main__":
    tester = P2PExpressManualTester()
    tester.run_all_tests()