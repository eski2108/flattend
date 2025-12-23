#!/usr/bin/env python3
"""
DEBUG CREATE OFFER BACKEND ISSUE

The frontend testing agent reports that Create Offer form works perfectly but offers are not persisting to database. 
Debug POST /api/p2p/create-ad endpoint.

**QUICK DEBUG TEST:**

1. Register test user: debug_create@test.com / Test123456
2. Login and get user_id
3. Call POST /api/p2p/create-ad with minimal payload
4. Check response - does it return success and ad_id?
5. Immediately call GET /api/p2p/ads?ad_type=sell&crypto=BTC&fiat=GBP
6. Verify the offer appears in the list
7. Call GET /api/p2p/my-ads/{user_id}
8. Verify the offer appears in user's offers

**If offer NOT appearing:**
- Check MongoDB p2p_ads collection directly
- Print full error response from create-ad endpoint
- Check if there are any validation errors
- Verify user_id format is correct

Report exact issue found.
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://express-buy-flow.preview.emergentagent.com/api"

# Test User for debugging
DEBUG_USER = {
    "email": "debug_create@test.com",
    "password": "Test123456",
    "full_name": "Debug Create User"
}

class CreateOfferDebugger:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
        self.ad_id = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        if details and not success:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    def register_debug_user(self):
        """Register debug user"""
        print("\n=== STEP 1: Register Debug User ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=DEBUG_USER,
                timeout=10
            )
            
            print(f"Registration Response Status: {response.status_code}")
            print(f"Registration Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    self.log_test(
                        "Register Debug User", 
                        True, 
                        f"User registered successfully with ID: {self.user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Register Debug User", 
                        False, 
                        "Registration response missing success or user_id",
                        data
                    )
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login
                self.log_test(
                    "Register Debug User", 
                    True, 
                    "User already exists (expected for repeated tests)"
                )
                return self.login_debug_user()
            else:
                self.log_test(
                    "Register Debug User", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Register Debug User", 
                False, 
                f"Registration request failed: {str(e)}"
            )
            
        return False
    
    def login_debug_user(self):
        """Login debug user"""
        print("\n=== STEP 2: Login Debug User ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": DEBUG_USER["email"],
                    "password": DEBUG_USER["password"]
                },
                timeout=10
            )
            
            print(f"Login Response Status: {response.status_code}")
            print(f"Login Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    self.log_test(
                        "Login Debug User", 
                        True, 
                        f"User login successful, user_id: {self.user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Login Debug User", 
                        False, 
                        "Login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    "Login Debug User", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Login Debug User", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False
    
    def setup_seller_account(self):
        """Setup seller account - KYC verification and payment methods"""
        print("\n=== STEP 3A: Setup Seller Account (KYC + Payment Methods) ===")
        
        if not self.user_id:
            self.log_test(
                "Setup Seller Account", 
                False, 
                "Cannot setup seller account - no user_id available"
            )
            return False
        
        # Step 1: Mock KYC verification
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/mock-kyc",
                json={"user_id": self.user_id},
                timeout=10
            )
            
            print(f"Mock KYC Response Status: {response.status_code}")
            print(f"Mock KYC Response: {response.text}")
            
            if response.status_code != 200:
                self.log_test(
                    "Mock KYC", 
                    False, 
                    f"Mock KYC failed with status {response.status_code}"
                )
                return False
            
        except Exception as e:
            self.log_test(
                "Mock KYC", 
                False, 
                f"Mock KYC request failed: {str(e)}"
            )
            return False
        
        # Step 2: Activate seller account
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/activate-seller",
                json={"user_id": self.user_id},
                timeout=10
            )
            
            print(f"Activate Seller Response Status: {response.status_code}")
            print(f"Activate Seller Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Activate Seller", 
                        True, 
                        "Seller account activated successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Activate Seller", 
                        False, 
                        "Activate seller response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Activate Seller", 
                    False, 
                    f"Activate seller failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Activate Seller", 
                False, 
                f"Activate seller request failed: {str(e)}"
            )
            
        return False
    
    def test_create_ad_endpoint(self):
        """Test POST /api/p2p/create-ad with minimal payload"""
        print("\n=== STEP 3B: Test POST /api/p2p/create-ad ===")
        
        if not self.user_id:
            self.log_test(
                "Create Ad Test", 
                False, 
                "Cannot test create-ad - no user_id available"
            )
            return False
        
        # Minimal payload as specified in review request
        payload = {
            "user_id": self.user_id,
            "ad_type": "sell",
            "crypto_currency": "BTC",
            "fiat_currency": "GBP",
            "price_type": "fixed",
            "price_value": 48000,
            "min_amount": 100,
            "max_amount": 5000,
            "available_amount": 1.0,
            "payment_methods": ["Bank Transfer"],
            "terms": "Test offer"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-ad",
                json=payload,
                timeout=10
            )
            
            print(f"Create Ad Response Status: {response.status_code}")
            print(f"Create Ad Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("ad", {}).get("ad_id"):
                    self.ad_id = data["ad"]["ad_id"]
                    self.log_test(
                        "Create Ad Test", 
                        True, 
                        f"Ad created successfully with ID: {self.ad_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Create Ad Test", 
                        False, 
                        "Create ad response missing success or ad_id",
                        data
                    )
            else:
                self.log_test(
                    "Create Ad Test", 
                    False, 
                    f"Create ad failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Ad Test", 
                False, 
                f"Create ad request failed: {str(e)}"
            )
            
        return False
    
    def test_get_ads_list(self):
        """Test GET /api/p2p/ads?ad_type=sell&crypto=BTC&fiat=GBP"""
        print("\n=== STEP 4: Test GET /api/p2p/ads (List) ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/ads",
                params={
                    "ad_type": "sell",
                    "crypto": "BTC",
                    "fiat": "GBP"
                },
                timeout=10
            )
            
            print(f"Get Ads Response Status: {response.status_code}")
            print(f"Get Ads Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "ads" in data:
                    ads = data["ads"]
                    
                    # Check if our ad is in the list
                    our_ad = None
                    if self.ad_id:
                        our_ad = next((ad for ad in ads if ad.get("ad_id") == self.ad_id), None)
                    
                    if our_ad:
                        self.log_test(
                            "Get Ads List", 
                            True, 
                            f"Found {len(ads)} ads including our created ad"
                        )
                        return True
                    else:
                        self.log_test(
                            "Get Ads List", 
                            False, 
                            f"Our ad {self.ad_id} NOT found in ads list. Found {len(ads)} ads total"
                        )
                        # Print all ads for debugging
                        print("All ads found:")
                        for i, ad in enumerate(ads):
                            print(f"  {i+1}. Ad ID: {ad.get('ad_id')}, User: {ad.get('user_id')}, Type: {ad.get('ad_type')}")
                else:
                    self.log_test(
                        "Get Ads List", 
                        False, 
                        "Get ads response missing success or ads",
                        data
                    )
            else:
                self.log_test(
                    "Get Ads List", 
                    False, 
                    f"Get ads failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Ads List", 
                False, 
                f"Get ads request failed: {str(e)}"
            )
            
        return False
    
    def test_get_my_ads(self):
        """Test GET /api/p2p/my-ads/{user_id}"""
        print("\n=== STEP 5: Test GET /api/p2p/my-ads/{user_id} ===")
        
        if not self.user_id:
            self.log_test(
                "Get My Ads", 
                False, 
                "Cannot test my-ads - no user_id available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/my-ads/{self.user_id}",
                timeout=10
            )
            
            print(f"Get My Ads Response Status: {response.status_code}")
            print(f"Get My Ads Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "ads" in data:
                    ads = data["ads"]
                    
                    # Check if our ad is in the user's ads
                    our_ad = None
                    if self.ad_id:
                        our_ad = next((ad for ad in ads if ad.get("ad_id") == self.ad_id), None)
                    
                    if our_ad:
                        self.log_test(
                            "Get My Ads", 
                            True, 
                            f"Found {len(ads)} user ads including our created ad"
                        )
                        return True
                    else:
                        self.log_test(
                            "Get My Ads", 
                            False, 
                            f"Our ad {self.ad_id} NOT found in user's ads. Found {len(ads)} ads total"
                        )
                        # Print all user ads for debugging
                        print("All user ads found:")
                        for i, ad in enumerate(ads):
                            print(f"  {i+1}. Ad ID: {ad.get('ad_id')}, Type: {ad.get('ad_type')}, Status: {ad.get('status')}")
                else:
                    self.log_test(
                        "Get My Ads", 
                        False, 
                        "Get my ads response missing success or ads",
                        data
                    )
            else:
                self.log_test(
                    "Get My Ads", 
                    False, 
                    f"Get my ads failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get My Ads", 
                False, 
                f"Get my ads request failed: {str(e)}"
            )
            
        return False
    
    def check_mongodb_directly(self):
        """Check if we can get any info about MongoDB collections"""
        print("\n=== STEP 6: MongoDB Collection Check ===")
        
        # Try to get some collection info through available endpoints
        try:
            # Check if there are any admin endpoints that might show collection info
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard-stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Admin Dashboard Stats: {json.dumps(data, indent=2)}")
            else:
                print(f"Admin dashboard not accessible: {response.status_code}")
                
        except Exception as e:
            print(f"Cannot check admin stats: {str(e)}")
        
        # Try to check if there are any debug endpoints
        try:
            response = self.session.get(
                f"{BASE_URL}/debug/collections",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Debug Collections Info: {json.dumps(data, indent=2)}")
            else:
                print(f"Debug collections endpoint not available: {response.status_code}")
                
        except Exception as e:
            print(f"Cannot check debug collections: {str(e)}")
    
    def run_debug_test(self):
        """Run the complete debug test"""
        print("🔍 DEBUG CREATE OFFER BACKEND ISSUE")
        print("=" * 50)
        
        # Step 1: Register user
        if not self.register_debug_user():
            print("\n❌ CRITICAL: Cannot proceed without user registration")
            return False
        
        # Step 2: Login user (if not already done in registration)
        if not self.user_id:
            if not self.login_debug_user():
                print("\n❌ CRITICAL: Cannot proceed without user login")
                return False
        
        # Step 3A: Setup seller account
        if not self.setup_seller_account():
            print("\n❌ CRITICAL: Cannot proceed without seller account setup")
            return False
        
        # Step 3B: Test create-ad endpoint
        create_success = self.test_create_ad_endpoint()
        
        # Step 4: Test get ads list
        list_success = self.test_get_ads_list()
        
        # Step 5: Test get my ads
        my_ads_success = self.test_get_my_ads()
        
        # Step 6: Check MongoDB info if possible
        self.check_mongodb_directly()
        
        # Summary
        print("\n" + "=" * 50)
        print("🔍 DEBUG SUMMARY")
        print("=" * 50)
        
        if create_success and list_success and my_ads_success:
            print("✅ CREATE OFFER WORKING: All tests passed - offers are being created and persisted correctly")
        elif create_success and not (list_success or my_ads_success):
            print("❌ PERSISTENCE ISSUE: Offer created but not appearing in lists - possible database issue")
        elif not create_success:
            print("❌ CREATE ENDPOINT ISSUE: POST /api/p2p/create-ad endpoint is failing")
        else:
            print("❌ MIXED RESULTS: Some tests passed, some failed - needs investigation")
        
        print(f"\nUser ID: {self.user_id}")
        print(f"Ad ID: {self.ad_id}")
        
        return create_success and list_success and my_ads_success

if __name__ == "__main__":
    debugger = CreateOfferDebugger()
    success = debugger.run_debug_test()
    
    if success:
        print("\n✅ All tests passed - Create Offer backend is working correctly")
        sys.exit(0)
    else:
        print("\n❌ Issues found - Create Offer backend needs investigation")
        sys.exit(1)