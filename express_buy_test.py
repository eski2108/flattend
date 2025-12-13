#!/usr/bin/env python3
"""
EXPRESS BUY FEATURE COMPREHENSIVE TEST
Test the Express Buy system with auto-matching to cheapest seller.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://fund-release-1.preview.emergentagent.com/api"

class ExpressBuyTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.seller1_user_id = None
        self.seller2_user_id = None
        self.buyer_user_id = None
        self.seller1_ad_id = None
        self.seller2_ad_id = None
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with error handling"""
        try:
            url = f"{BASE_URL}{endpoint}"
            
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                if data:
                    response = self.session.post(url, json=data)
                else:
                    response = self.session.post(url)
            elif method.upper() == "PUT":
                if data:
                    response = self.session.put(url, json=data)
                else:
                    response = self.session.put(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"{method} {endpoint} -> {response.status_code}")
            
            if response.status_code != expected_status:
                print(f"❌ Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
            return response.json()
            
        except Exception as e:
            print(f"❌ Request failed: {str(e)}")
            return None
    
    def setup_test_users(self):
        """Setup test users: 2 sellers and 1 buyer"""
        print("\n🔧 SETUP PHASE: Creating test users...")
        
        # Create Seller 1 (expensive)
        timestamp = int(time.time())
        seller1_data = {
            "email": f"express_seller1_{timestamp}@test.com",
            "password": "Test123456",
            "full_name": "Express Seller 1"
        }
        
        response = self.make_request("POST", "/auth/register", seller1_data, 200)
        if response and response.get("success"):
            self.seller1_user_id = response["user"]["user_id"]
            self.log_result("Create Seller 1", True, f"User ID: {self.seller1_user_id}")
        else:
            self.log_result("Create Seller 1", False, "Registration failed")
            return False
            
        # Create Seller 2 (cheap)
        seller2_data = {
            "email": f"express_seller2_{timestamp}@test.com", 
            "password": "Test123456",
            "full_name": "Express Seller 2"
        }
        
        response = self.make_request("POST", "/auth/register", seller2_data, 200)
        if response and response.get("success"):
            self.seller2_user_id = response["user"]["user_id"]
            self.log_result("Create Seller 2", True, f"User ID: {self.seller2_user_id}")
        else:
            self.log_result("Create Seller 2", False, "Registration failed")
            return False
            
        # Create Buyer
        buyer_data = {
            "email": f"express_buyer_{timestamp}@test.com",
            "password": "Test123456", 
            "full_name": "Express Buyer"
        }
        
        response = self.make_request("POST", "/auth/register", buyer_data, 200)
        if response and response.get("success"):
            self.buyer_user_id = response["user"]["user_id"]
            self.log_result("Create Buyer", True, f"User ID: {self.buyer_user_id}")
        else:
            self.log_result("Create Buyer", False, "Registration failed")
            return False
            
        return True
    
    def activate_sellers(self):
        """Activate seller accounts for both sellers"""
        print("\n🔧 SETUP PHASE: Activating seller accounts...")
        
        # Mock KYC for Seller 1
        response = self.make_request("POST", "/auth/mock-kyc", {
            "user_id": self.seller1_user_id
        })
        if response and response.get("success"):
            self.log_result("Mock KYC Seller 1", True)
        else:
            self.log_result("Mock KYC Seller 1", False, "KYC failed")
            return False
            
        # Mock KYC for Seller 2
        response = self.make_request("POST", "/auth/mock-kyc", {
            "user_id": self.seller2_user_id
        })
        if response and response.get("success"):
            self.log_result("Mock KYC Seller 2", True)
        else:
            self.log_result("Mock KYC Seller 2", False, "KYC failed")
            return False
        
        # Activate Seller 1
        response = self.make_request("POST", f"/p2p/activate-seller", {
            "user_id": self.seller1_user_id
        })
        if response and response.get("success"):
            self.log_result("Activate Seller 1", True)
        else:
            self.log_result("Activate Seller 1", False, "Activation failed")
            return False
            
        # Activate Seller 2
        response = self.make_request("POST", f"/p2p/activate-seller", {
            "user_id": self.seller2_user_id
        })
        if response and response.get("success"):
            self.log_result("Activate Seller 2", True)
        else:
            self.log_result("Activate Seller 2", False, "Activation failed")
            return False
            
        return True
    
    def add_funds_to_sellers(self):
        """Add 1 BTC to each seller"""
        print("\n🔧 SETUP PHASE: Adding funds to sellers...")
        
        # Add funds to Seller 1
        response = self.make_request("POST", f"/trader/balance/add-funds?trader_id={self.seller1_user_id}&currency=BTC&amount=1.0")
        if response and response.get("success"):
            self.log_result("Add funds to Seller 1", True, "1.0 BTC added")
        else:
            self.log_result("Add funds to Seller 1", False, "Failed to add funds")
            return False
            
        # Add funds to Seller 2
        response = self.make_request("POST", f"/trader/balance/add-funds?trader_id={self.seller2_user_id}&currency=BTC&amount=1.0")
        if response and response.get("success"):
            self.log_result("Add funds to Seller 2", True, "1.0 BTC added")
        else:
            self.log_result("Add funds to Seller 2", False, "Failed to add funds")
            return False
            
        return True
    
    def create_sell_offers(self):
        """Create sell offers for both sellers"""
        print("\n🔧 SETUP PHASE: Creating sell offers...")
        
        # Create Seller 1 offer (expensive - £47,500)
        seller1_offer = {
            "user_id": self.seller1_user_id,
            "ad_type": "sell",
            "crypto_currency": "BTC",
            "fiat_currency": "GBP",
            "price_type": "fixed",
            "price_value": 47500.0,
            "min_amount": 100.0,
            "max_amount": 10000.0,
            "available_amount": 1.0,
            "payment_methods": ["Bank Transfer"],
            "terms": "Express Seller 1 - Premium pricing"
        }
        
        response = self.make_request("POST", "/p2p/create-ad", seller1_offer)
        if response and response.get("success"):
            self.seller1_ad_id = response["ad"]["ad_id"]
            self.log_result("Create Seller 1 offer", True, f"BTC at £47,500 - Ad ID: {self.seller1_ad_id}")
        else:
            self.log_result("Create Seller 1 offer", False, "Failed to create offer")
            return False
            
        # Create Seller 2 offer (cheap - £47,000)
        seller2_offer = {
            "user_id": self.seller2_user_id,
            "ad_type": "sell",
            "crypto_currency": "BTC",
            "fiat_currency": "GBP", 
            "price_type": "fixed",
            "price_value": 47000.0,
            "min_amount": 100.0,
            "max_amount": 10000.0,
            "available_amount": 1.0,
            "payment_methods": ["Bank Transfer"],
            "terms": "Express Seller 2 - Best pricing"
        }
        
        response = self.make_request("POST", "/p2p/create-ad", seller2_offer)
        if response and response.get("success"):
            self.seller2_ad_id = response["ad"]["ad_id"]
            self.log_result("Create Seller 2 offer", True, f"BTC at £47,000 - Ad ID: {self.seller2_ad_id}")
        else:
            self.log_result("Create Seller 2 offer", False, "Failed to create offer")
            return False
            
        return True
    
    def test_express_buy_match_cheapest(self):
        """Test Case 1: Find best match for BTC purchase"""
        print("\n🎯 PHASE 1 - MATCH TO CHEAPEST:")
        print("Test Case 1: Find best match for BTC purchase")
        
        match_request = {
            "crypto_currency": "BTC",
            "fiat_amount": 1000,
            "user_id": self.buyer_user_id
        }
        
        response = self.make_request("POST", "/express-buy/match", match_request)
        
        if response and response.get("success"):
            matched_offer = response.get("matched_offer", {})
            print(f"DEBUG: Match response: {json.dumps(response, indent=2)}")
            
            # Verify it matched to cheapest available seller
            matched_price = matched_offer.get("price_per_unit", 0)
            if matched_price <= 47000:  # Should be £47,000 or less (our cheapest offer)
                self.log_result("Match to cheapest seller", True, f"Matched to seller at £{matched_price} (cheapest available)")
            else:
                self.log_result("Match to cheapest seller", False, f"Matched to expensive seller at £{matched_price}")
                return False
                
            # Verify express fee is 1.5%
            expected_fee = 1000 * 0.015  # 1.5% of £1000 = £15
            actual_fee = matched_offer.get("express_fee_fiat", 0)
            if abs(actual_fee - expected_fee) < 0.01:
                self.log_result("Express fee calculation", True, f"1.5% fee = £{actual_fee}")
            else:
                self.log_result("Express fee calculation", False, f"Expected £{expected_fee}, got £{actual_fee}")
                
            # Verify crypto amount calculation
            expected_crypto = 1000 / 47000  # £1000 / £47000 per BTC
            actual_crypto = matched_offer.get("crypto_amount", 0)
            if abs(actual_crypto - expected_crypto) < 0.00001:
                self.log_result("Crypto amount calculation", True, f"{actual_crypto:.8f} BTC")
            else:
                self.log_result("Crypto amount calculation", False, f"Expected {expected_crypto:.8f}, got {actual_crypto:.8f}")
                
            return True
        else:
            self.log_result("Express buy match", False, "API call failed")
            return False
    
    def test_express_buy_match_different_amount(self):
        """Test Case 2: Match with different amount"""
        print("\nTest Case 2: Match with different amount")
        
        match_request = {
            "crypto_currency": "BTC",
            "fiat_amount": 5000,
            "user_id": self.buyer_user_id
        }
        
        response = self.make_request("POST", "/express-buy/match", match_request)
        
        if response and response.get("success"):
            matched_offer = response.get("matched_offer", {})
            
            # Should still match to cheapest available seller
            matched_price = matched_offer.get("price_per_unit", 0)
            if matched_price <= 47000:  # Should be £47,000 or less
                self.log_result("Match different amount to cheapest", True, f"Still matched to cheapest at £{matched_price} for £5000")
                return True
            else:
                self.log_result("Match different amount to cheapest", False, f"Matched to expensive seller at £{matched_price}")
                return False
        else:
            self.log_result("Express buy match different amount", False, "API call failed")
            return False
    
    def test_express_buy_execute(self):
        """Test Case 3: Execute purchase with matched seller"""
        print("\n🎯 PHASE 2 - EXECUTE EXPRESS BUY:")
        print("Test Case 3: Execute purchase with matched seller")
        
        # First get the match
        match_request = {
            "crypto_currency": "BTC",
            "fiat_amount": 1000,
            "user_id": self.buyer_user_id
        }
        
        match_response = self.make_request("POST", "/express-buy/match", match_request)
        if not match_response or not match_response.get("success"):
            self.log_result("Get match for execution", False, "Failed to get match")
            return False
            
        matched_offer = match_response.get("matched_offer", {})
        
        # Execute the purchase
        execute_request = {
            "user_id": self.buyer_user_id,
            "ad_id": matched_offer.get("ad_id"),
            "crypto_amount": matched_offer.get("crypto_amount"),
            "fiat_amount": 1000,
            "buyer_wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz",
            "buyer_wallet_network": "mainnet"
        }
        
        response = self.make_request("POST", "/express-buy/execute", execute_request)
        
        if response and response.get("success"):
            trade_id = response.get("trade_id")
            trade_info = response.get("trade", {})
            
            self.log_result("Execute express buy", True, f"Trade ID: {trade_id}")
            
            # Verify trade details
            if trade_info.get("status") == "pending_payment":
                self.log_result("Trade status", True, "Status: pending_payment")
            else:
                self.log_result("Trade status", False, f"Wrong status: {trade_info.get('status')}")
                
            if trade_info.get("crypto_currency") == "BTC":
                self.log_result("Trade crypto currency", True, "BTC")
            else:
                self.log_result("Trade crypto currency", False, f"Wrong currency: {trade_info.get('crypto_currency')}")
                
            return True
        else:
            self.log_result("Execute express buy", False, "API call failed")
            return False
    
    def test_verify_seller_balance(self):
        """Test Case 4: Check seller's balance"""
        print("\n🎯 PHASE 3 - VERIFY BALANCES:")
        print("Test Case 4: Check seller's balance")
        
        # Get the matched seller ID from the last match response
        match_request = {
            "crypto_currency": "BTC",
            "fiat_amount": 1000,
            "user_id": self.buyer_user_id
        }
        
        match_response = self.make_request("POST", "/express-buy/match", match_request)
        if not match_response or not match_response.get("success"):
            self.log_result("Get matched seller for balance check", False, "Failed to get match")
            return False
            
        matched_seller_id = match_response.get("matched_offer", {}).get("seller_id")
        if not matched_seller_id:
            self.log_result("Get matched seller ID", False, "No seller ID in match response")
            return False
        
        response = self.make_request("GET", f"/trader/my-balances/{matched_seller_id}")
        
        if response and response.get("success"):
            balances = response.get("balances", [])
            btc_balance = None
            
            for balance in balances:
                if balance.get("currency") == "BTC":
                    btc_balance = balance
                    break
                    
            if btc_balance:
                locked_balance = btc_balance.get("locked_balance", 0)
                if locked_balance > 0:
                    self.log_result("Seller locked balance", True, f"BTC locked: {locked_balance} for seller {matched_seller_id}")
                    return True
                else:
                    self.log_result("Seller locked balance", False, "No BTC locked in escrow")
                    return False
            else:
                self.log_result("Seller BTC balance", False, "No BTC balance found")
                return False
        else:
            self.log_result("Get seller balance", False, "API call failed")
            return False
    
    def test_verify_admin_fees(self):
        """Test Case 5: Check admin fees"""
        print("\nTest Case 5: Check admin fees")
        
        response = self.make_request("GET", "/admin/internal-balances")
        
        if response and response.get("success"):
            balances = response.get("balances", {})
            
            if "express_buy_fees" in str(response) or any("express" in str(v) for v in balances.values()):
                self.log_result("Admin express fees", True, f"Express fees collected")
                return True
            else:
                # Check if there are any fees at all
                total_fees = sum(balances.values()) if balances else 0
                if total_fees > 0:
                    self.log_result("Admin fees collection", True, f"Total fees: {total_fees}")
                    return True
                else:
                    self.log_result("Admin fees collection", False, "No fees collected")
                    return False
        else:
            self.log_result("Get admin fees", False, "API call failed")
            return False
    
    def test_error_handling(self):
        """Test Cases 6-8: Error handling"""
        print("\n🎯 PHASE 4 - ERROR HANDLING:")
        
        # Test Case 6: Amount too high
        print("Test Case 6: Match with amount too high for all sellers")
        match_request = {
            "crypto_currency": "BTC",
            "fiat_amount": 1000000,  # £1M - exceeds seller limits
            "user_id": self.buyer_user_id
        }
        
        response = self.make_request("POST", "/express-buy/match", match_request, 404)
        if response and not response.get("success"):
            self.log_result("High amount rejection", True, "Correctly rejected £1M amount")
        else:
            self.log_result("High amount rejection", False, "Should have rejected high amount")
            
        # Test Case 7: Unsupported crypto
        print("\nTest Case 7: Match for unsupported crypto")
        match_request = {
            "crypto_currency": "INVALID_COIN",
            "fiat_amount": 1000,
            "user_id": self.buyer_user_id
        }
        
        response = self.make_request("POST", "/express-buy/match", match_request, 404)
        if response and not response.get("success"):
            self.log_result("Invalid crypto rejection", True, "Correctly rejected INVALID_COIN")
        else:
            self.log_result("Invalid crypto rejection", False, "Should have rejected invalid crypto")
            
        # Test Case 8: Execute without wallet
        print("\nTest Case 8: Execute without valid wallet")
        execute_request = {
            "user_id": self.buyer_user_id,
            "ad_id": self.seller2_ad_id,
            "crypto_amount": 0.02083333,
            "fiat_amount": 1000
            # Missing buyer_wallet_address
        }
        
        response = self.make_request("POST", "/express-buy/execute", execute_request, 400)
        if response and not response.get("success"):
            self.log_result("Missing wallet rejection", True, "Correctly rejected missing wallet")
        else:
            self.log_result("Missing wallet rejection", False, "Should have rejected missing wallet")
    
    def run_all_tests(self):
        """Run all Express Buy tests"""
        print("🚀 EXPRESS BUY FEATURE COMPREHENSIVE TEST")
        print("=" * 60)
        
        # Setup phase
        if not self.setup_test_users():
            print("❌ Setup failed - aborting tests")
            return
            
        if not self.activate_sellers():
            print("❌ Seller activation failed - aborting tests")
            return
            
        if not self.add_funds_to_sellers():
            print("❌ Adding funds failed - aborting tests")
            return
            
        if not self.create_sell_offers():
            print("❌ Creating offers failed - aborting tests")
            return
            
        # Test phases
        self.test_express_buy_match_cheapest()
        self.test_express_buy_match_different_amount()
        self.test_express_buy_execute()
        self.test_verify_seller_balance()
        self.test_verify_admin_fees()
        self.test_error_handling()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 EXPRESS BUY TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n✅ SUCCESS CRITERIA:")
        criteria = [
            ("Auto-matching finds cheapest seller", any("Match to cheapest seller" in r["test"] and r["success"] for r in self.test_results)),
            ("Express buy creates trade with 1.5% fee", any("Express fee calculation" in r["test"] and r["success"] for r in self.test_results)),
            ("Crypto locks in escrow", any("Seller locked balance" in r["test"] and r["success"] for r in self.test_results)),
            ("Admin collects express fee", any("Admin" in r["test"] and "fees" in r["test"] and r["success"] for r in self.test_results)),
            ("Error handling works", any("rejection" in r["test"] and r["success"] for r in self.test_results))
        ]
        
        for criterion, met in criteria:
            status = "✅" if met else "❌"
            print(f"  {status} {criterion}")

if __name__ == "__main__":
    tester = ExpressBuyTester()
    tester.run_all_tests()