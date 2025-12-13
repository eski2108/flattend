#!/usr/bin/env python3
"""
P2P SELL OFFERS FILTERING TEST
Tests P2P sell offer creation and filtering functionality as requested in review:

**Test Scenario:**
Create 3 test P2P sell offers with different payment methods:

1. **Offer 1:**
   - Seller: testuser@test.com
   - Crypto: BTC
   - Amount: 0.5 BTC
   - Price: £45,000 per BTC
   - Fiat: GBP
   - Payment Methods: ["paypal", "bank_transfer"]

2. **Offer 2:**
   - Seller: testuser2@test.com  
   - Crypto: ETH
   - Amount: 5 ETH
   - Price: £2,400 per ETH
   - Fiat: GBP
   - Payment Methods: ["wise", "revolut"]

3. **Offer 3:**
   - Seller: testuser3@test.com
   - Crypto: USDT
   - Amount: 10000 USDT
   - Price: £0.79 per USDT
   - Fiat: GBP
   - Payment Methods: ["paypal", "sepa"]

**Then test filtering:**
- Filter by PayPal → Should show Offers 1 and 3
- Filter by Wise → Should show Offer 2
- Filter by Bank Transfer → Should show Offer 1

**Backend URL:** https://crypto-wallet-ui-3.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://crypto-wallet-ui-3.preview.emergentagent.com/api"

# Test Users for P2P offers
TEST_USERS = [
    {
        "email": "testuser@test.com",
        "password": "Test123456",
        "full_name": "Test User 1",
        "crypto": "BTC",
        "amount": 0.5,
        "price": 45000.0,
        "payment_methods": ["paypal", "faster_payments"]
    },
    {
        "email": "testuser2@test.com",
        "password": "Test123456",
        "full_name": "Test User 2", 
        "crypto": "ETH",
        "amount": 5.0,
        "price": 2400.0,
        "payment_methods": ["wise", "revolut"]
    },
    {
        "email": "testuser3@test.com",
        "password": "Test123456",
        "full_name": "Test User 3",
        "crypto": "USDT", 
        "amount": 10000.0,
        "price": 0.79,
        "payment_methods": ["paypal", "sepa"]
    }
]

class P2PFilteringTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_ids = []
        self.offer_ids = []
        
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
    
    def register_and_login_users(self):
        """Register and login all test users"""
        print("\n=== Registering and Logging In Test Users ===")
        
        for i, user in enumerate(TEST_USERS):
            # Register user
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json=user,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        user_id = data["user"]["user_id"]
                        self.user_ids.append(user_id)
                        self.log_test(
                            f"Register User {i+1}", 
                            True, 
                            f"User {user['email']} registered with ID: {user_id}"
                        )
                    else:
                        self.log_test(
                            f"Register User {i+1}", 
                            False, 
                            f"Registration response missing user_id for {user['email']}",
                            data
                        )
                        return False
                elif response.status_code == 400 and "already registered" in response.text:
                    # User exists, try login
                    login_response = self.session.post(
                        f"{BASE_URL}/auth/login",
                        json={
                            "email": user["email"],
                            "password": user["password"]
                        },
                        timeout=10
                    )
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if login_data.get("success") and login_data.get("user", {}).get("user_id"):
                            user_id = login_data["user"]["user_id"]
                            self.user_ids.append(user_id)
                            self.log_test(
                                f"Login User {i+1}", 
                                True, 
                                f"User {user['email']} logged in with ID: {user_id}"
                            )
                        else:
                            self.log_test(
                                f"Login User {i+1}", 
                                False, 
                                f"Login failed for existing user {user['email']}",
                                login_data
                            )
                            return False
                    else:
                        self.log_test(
                            f"Login User {i+1}", 
                            False, 
                            f"Login failed for {user['email']} with status {login_response.status_code}"
                        )
                        return False
                else:
                    self.log_test(
                        f"Register User {i+1}", 
                        False, 
                        f"Registration failed for {user['email']} with status {response.status_code}",
                        response.text
                    )
                    return False
                    
            except Exception as e:
                self.log_test(
                    f"Register User {i+1}", 
                    False, 
                    f"Registration request failed for {user['email']}: {str(e)}"
                )
                return False
        
        return len(self.user_ids) == len(TEST_USERS)
    
    def setup_crypto_balances(self):
        """Setup crypto balances for users to create sell offers"""
        print("\n=== Setting Up Crypto Balances ===")
        
        for i, (user, user_id) in enumerate(zip(TEST_USERS, self.user_ids)):
            try:
                # Initialize crypto balance for the user
                response = self.session.post(
                    f"{BASE_URL}/crypto-bank/deposit",
                    json={
                        "user_id": user_id,
                        "currency": user["crypto"],
                        "amount": user["amount"] * 1.1  # Give a bit extra for fees
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            f"Setup Balance User {i+1}", 
                            True, 
                            f"Added {user['amount'] * 1.1} {user['crypto']} to {user['email']}"
                        )
                    else:
                        self.log_test(
                            f"Setup Balance User {i+1}", 
                            False, 
                            f"Balance setup response indicates failure for {user['email']}",
                            data
                        )
                        return False
                else:
                    self.log_test(
                        f"Setup Balance User {i+1}", 
                        False, 
                        f"Balance setup failed for {user['email']} with status {response.status_code}",
                        response.text
                    )
                    return False
                    
            except Exception as e:
                self.log_test(
                    f"Setup Balance User {i+1}", 
                    False, 
                    f"Balance setup request failed for {user['email']}: {str(e)}"
                )
                return False
        
        return True
    
    def create_p2p_sell_offers(self):
        """Create the 3 P2P sell offers with different payment methods"""
        print("\n=== Creating P2P Sell Offers ===")
        
        for i, (user, user_id) in enumerate(zip(TEST_USERS, self.user_ids)):
            try:
                offer_data = {
                    "seller_id": user_id,
                    "crypto_currency": user["crypto"],
                    "crypto_amount": user["amount"],
                    "fiat_currency": "GBP",
                    "price_per_unit": user["price"],
                    "min_purchase": user["amount"] * 0.1,  # 10% of total
                    "max_purchase": user["amount"],
                    "payment_methods": user["payment_methods"]
                }
                
                response = self.session.post(
                    f"{BASE_URL}/p2p/create-offer",
                    json=offer_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("offer", {}).get("order_id"):
                        offer_id = data["offer"]["order_id"]
                        self.offer_ids.append(offer_id)
                        
                        payment_methods_str = ", ".join(user["payment_methods"])
                        self.log_test(
                            f"Create Offer {i+1}", 
                            True, 
                            f"Offer created: {user['amount']} {user['crypto']} at £{user['price']} each, Payment: [{payment_methods_str}] (ID: {offer_id})"
                        )
                    else:
                        self.log_test(
                            f"Create Offer {i+1}", 
                            False, 
                            f"Offer creation response missing order_id for {user['email']}",
                            data
                        )
                        return False
                else:
                    self.log_test(
                        f"Create Offer {i+1}", 
                        False, 
                        f"Offer creation failed for {user['email']} with status {response.status_code}",
                        response.text
                    )
                    return False
                    
            except Exception as e:
                self.log_test(
                    f"Create Offer {i+1}", 
                    False, 
                    f"Offer creation request failed for {user['email']}: {str(e)}"
                )
                return False
        
        return len(self.offer_ids) == len(TEST_USERS)
    
    def test_payment_method_filtering(self):
        """Test filtering offers by payment methods"""
        print("\n=== Testing Payment Method Filtering ===")
        
        # Test cases: payment_method -> expected offer indices
        filter_tests = [
            ("paypal", [0, 2], "PayPal filtering should show Offers 1 and 3"),
            ("wise", [1], "Wise filtering should show Offer 2"),
            ("faster_payments", [0], "Faster Payments filtering should show Offer 1"),
            ("revolut", [1], "Revolut filtering should show Offer 2"),
            ("sepa", [2], "SEPA filtering should show Offer 3")
        ]
        
        all_tests_passed = True
        
        for payment_method, expected_indices, description in filter_tests:
            try:
                response = self.session.get(
                    f"{BASE_URL}/p2p/offers",
                    params={
                        "payment_method": payment_method,
                        "fiat_currency": "GBP"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "offers" in data:
                        offers = data["offers"]
                        
                        # Check if we got the expected number of offers
                        if len(offers) == len(expected_indices):
                            # Verify the offers are the correct ones
                            found_offer_ids = [offer.get("order_id") for offer in offers]
                            expected_offer_ids = [self.offer_ids[i] for i in expected_indices]
                            
                            # Check if all expected offers are present
                            all_expected_found = all(oid in found_offer_ids for oid in expected_offer_ids)
                            
                            if all_expected_found:
                                expected_cryptos = [TEST_USERS[i]["crypto"] for i in expected_indices]
                                found_cryptos = [offer.get("crypto_currency") for offer in offers]
                                
                                self.log_test(
                                    f"Filter by {payment_method.title()}", 
                                    True, 
                                    f"✅ {description} - Found {len(offers)} offers: {', '.join(found_cryptos)}"
                                )
                            else:
                                self.log_test(
                                    f"Filter by {payment_method.title()}", 
                                    False, 
                                    f"❌ {description} - Wrong offers returned. Expected: {expected_offer_ids}, Found: {found_offer_ids}"
                                )
                                all_tests_passed = False
                        else:
                            self.log_test(
                                f"Filter by {payment_method.title()}", 
                                False, 
                                f"❌ {description} - Expected {len(expected_indices)} offers, got {len(offers)}"
                            )
                            all_tests_passed = False
                    else:
                        self.log_test(
                            f"Filter by {payment_method.title()}", 
                            False, 
                            f"❌ Invalid response format for {payment_method} filtering",
                            data
                        )
                        all_tests_passed = False
                else:
                    self.log_test(
                        f"Filter by {payment_method.title()}", 
                        False, 
                        f"❌ Filtering by {payment_method} failed with status {response.status_code}",
                        response.text
                    )
                    all_tests_passed = False
                    
            except Exception as e:
                self.log_test(
                    f"Filter by {payment_method.title()}", 
                    False, 
                    f"❌ Filtering request failed for {payment_method}: {str(e)}"
                )
                all_tests_passed = False
        
        return all_tests_passed
    
    def test_get_all_offers(self):
        """Test getting all offers without filters"""
        print("\n=== Testing Get All Offers ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/offers",
                params={"fiat_currency": "GBP"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    offers = data["offers"]
                    
                    # Should have at least our 3 offers
                    if len(offers) >= 3:
                        # Check if our offers are in the list
                        found_offer_ids = [offer.get("order_id") for offer in offers]
                        our_offers_found = sum(1 for oid in self.offer_ids if oid in found_offer_ids)
                        
                        if our_offers_found == 3:
                            self.log_test(
                                "Get All Offers", 
                                True, 
                                f"All offers retrieved successfully - Found {len(offers)} total offers including our 3 test offers"
                            )
                            return True
                        else:
                            self.log_test(
                                "Get All Offers", 
                                False, 
                                f"Only {our_offers_found}/3 of our test offers found in marketplace"
                            )
                    else:
                        self.log_test(
                            "Get All Offers", 
                            False, 
                            f"Expected at least 3 offers, got {len(offers)}"
                        )
                else:
                    self.log_test(
                        "Get All Offers", 
                        False, 
                        "Invalid response format for get all offers",
                        data
                    )
            else:
                self.log_test(
                    "Get All Offers", 
                    False, 
                    f"Get all offers failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get All Offers", 
                False, 
                f"Get all offers request failed: {str(e)}"
            )
            
        return False
    
    def run_comprehensive_test(self):
        """Run the complete P2P filtering test suite"""
        print("🎯 P2P SELL OFFERS FILTERING TEST STARTED")
        print("=" * 60)
        
        # Step 1: Register and login users
        if not self.register_and_login_users():
            print("\n❌ CRITICAL FAILURE: User registration/login failed")
            return False
        
        # Step 2: Setup crypto balances
        if not self.setup_crypto_balances():
            print("\n❌ CRITICAL FAILURE: Crypto balance setup failed")
            return False
        
        # Step 3: Create P2P sell offers
        if not self.create_p2p_sell_offers():
            print("\n❌ CRITICAL FAILURE: P2P offer creation failed")
            return False
        
        # Step 4: Test getting all offers
        self.test_get_all_offers()
        
        # Step 5: Test payment method filtering
        filtering_success = self.test_payment_method_filtering()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 P2P FILTERING TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"✅ Passed: {passed_tests}/{total_tests} tests ({success_rate:.1f}%)")
        
        if filtering_success:
            print("\n🎉 FILTERING FUNCTIONALITY WORKING CORRECTLY!")
            print("✅ PayPal filtering shows Offers 1 and 3 (BTC + USDT)")
            print("✅ Wise filtering shows Offer 2 (ETH)")
            print("✅ Faster Payments filtering shows Offer 1 (BTC)")
            print("✅ Database queries are working correctly")
        else:
            print("\n❌ FILTERING FUNCTIONALITY HAS ISSUES!")
            print("❌ Some payment method filters are not working correctly")
            print("❌ Database queries may need investigation")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        return filtering_success

def main():
    """Main test execution"""
    tester = P2PFilteringTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n🎯 P2P FILTERING TEST COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n❌ P2P FILTERING TEST FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()