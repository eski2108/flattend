#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND TESTING FOR REVIEW REQUEST
Tests all critical backend systems as specifically requested in the review:

**Priority Test Areas:**
1. Authentication & User Management (email-based registration/login, JWT tokens)
2. AI Chat System Integration (emergentintegrations, Tawk.to escalation)
3. Platform Wallet & Admin Features (balance retrieval, referral bonus system)
4. Price Alerts System (creation, retrieval, background tasks)
5. P2P Seller Profile (public endpoints, seller link generation)
6. Mobile App Download (iOS detection, Android APK download)

**Focus Areas:** Recently fixed login/auth, platform wallet, chat system
**Database State:** Empty (0 users) - verify registration creates users properly

**Backend URL:** https://atomic-pay-fix.preview.emergentagent.com/api
"""

import requests
import json
import sys
import time
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://atomic-pay-fix.preview.emergentagent.com/api"

# Test Users
TEST_USERS = [
    {
        "email": f"review_test_user_{int(time.time())}@test.com",
        "password": "ReviewTest123!",
        "full_name": "Review Test User"
    },
    {
        "email": f"review_seller_{int(time.time())}@test.com", 
        "password": "ReviewSeller123!",
        "full_name": "Review Test Seller"
    }
]

class ComprehensiveReviewTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_tokens = {}
        self.user_ids = {}
        self.chat_session_id = None
        self.price_alert_id = None
        self.seller_profile_id = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results with detailed output"""
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
    
    def test_user_registration_and_login(self):
        """Test Priority 1: Authentication & User Management"""
        print("\n" + "="*60)
        print("PRIORITY 1: AUTHENTICATION & USER MANAGEMENT TESTING")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        for i, user_data in enumerate(TEST_USERS):
            user_type = "User" if i == 0 else "Seller"
            
            # Test Registration
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json=user_data,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        user_id = data["user"]["user_id"]
                        self.user_ids[user_type.lower()] = user_id
                        
                        # Check if email_verified is True by default
                        email_verified = data["user"].get("email_verified", False)
                        
                        self.log_test(
                            f"{user_type} Registration", 
                            True, 
                            f"✅ Registration successful - User ID: {user_id}, Email Verified: {email_verified}"
                        )
                        success_count += 1
                    else:
                        self.log_test(f"{user_type} Registration", False, "Missing user_id in response", data)
                elif response.status_code == 400 and "already registered" in response.text:
                    self.log_test(f"{user_type} Registration", True, "User already exists (acceptable)")
                    success_count += 1
                else:
                    self.log_test(f"{user_type} Registration", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test(f"{user_type} Registration", False, f"Request failed: {str(e)}")
            
            # Test Login
            total_tests += 1
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": user_data["email"],
                        "password": user_data["password"]
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("token"):
                        token = data["token"]
                        user_id = data.get("user", {}).get("user_id")
                        self.user_tokens[user_type.lower()] = token
                        if user_id:
                            self.user_ids[user_type.lower()] = user_id
                        
                        # Verify JWT token structure
                        token_parts = token.split('.')
                        valid_jwt = len(token_parts) == 3
                        
                        self.log_test(
                            f"{user_type} Login", 
                            True, 
                            f"✅ Login successful - Token received (Valid JWT: {valid_jwt}), User ID: {user_id}"
                        )
                        success_count += 1
                    else:
                        self.log_test(f"{user_type} Login", False, "Missing token in response", data)
                else:
                    self.log_test(f"{user_type} Login", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test(f"{user_type} Login", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Authentication Tests: {success_count}/{total_tests} passed")
        return success_count == total_tests
    
    def test_ai_chat_system(self):
        """Test Priority 2: AI Chat System Integration"""
        print("\n" + "="*60)
        print("PRIORITY 2: AI CHAT SYSTEM INTEGRATION TESTING")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        user_id = self.user_ids.get("user")
        if not user_id:
            self.log_test("AI Chat System", False, "No user ID available for testing")
            return False
        
        # Test Chat Session Creation
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/ai-chat/session",
                json={
                    "user_id": user_id,
                    "initial_message": "Hello, I need help with my account setup and P2P trading."
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("session_id"):
                    self.chat_session_id = data["session_id"]
                    ai_response = data.get("ai_response", "")
                    
                    self.log_test(
                        "AI Chat Session Creation", 
                        True, 
                        f"✅ Chat session created - ID: {self.chat_session_id}, AI Response: {ai_response[:100]}..."
                    )
                    success_count += 1
                else:
                    self.log_test("AI Chat Session Creation", False, "Missing session_id", data)
            else:
                self.log_test("AI Chat Session Creation", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("AI Chat Session Creation", False, f"Request failed: {str(e)}")
        
        # Test AI Message Response
        total_tests += 1
        if self.chat_session_id:
            try:
                response = self.session.post(
                    f"{BASE_URL}/ai-chat/message",
                    json={
                        "session_id": self.chat_session_id,
                        "user_id": user_id,
                        "message": "Can you explain how the P2P escrow system works?"
                    },
                    timeout=20
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("ai_response"):
                        ai_response = data["ai_response"]
                        
                        self.log_test(
                            "AI Message Response", 
                            True, 
                            f"✅ AI responded successfully - Response: {ai_response[:100]}..."
                        )
                        success_count += 1
                    else:
                        self.log_test("AI Message Response", False, "Missing ai_response", data)
                else:
                    self.log_test("AI Message Response", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test("AI Message Response", False, f"Request failed: {str(e)}")
        
        # Test Escalation to Tawk.to
        total_tests += 1
        if self.chat_session_id:
            try:
                response = self.session.post(
                    f"{BASE_URL}/ai-chat/escalate",
                    json={
                        "session_id": self.chat_session_id,
                        "user_id": user_id,
                        "reason": "Need human assistance with complex trading issue"
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        escalation_status = data.get("escalation_status", "unknown")
                        tawk_url = data.get("tawk_url", "")
                        
                        self.log_test(
                            "Tawk.to Escalation", 
                            True, 
                            f"✅ Escalation successful - Status: {escalation_status}, Tawk URL: {bool(tawk_url)}"
                        )
                        success_count += 1
                    else:
                        self.log_test("Tawk.to Escalation", False, "Escalation failed", data)
                else:
                    self.log_test("Tawk.to Escalation", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test("Tawk.to Escalation", False, f"Request failed: {str(e)}")
        
        # Test Chat History Retrieval
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/ai-chat/history/{user_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "messages" in data:
                    messages = data["messages"]
                    
                    self.log_test(
                        "Chat History Retrieval", 
                        True, 
                        f"✅ Chat history retrieved - {len(messages)} messages found"
                    )
                    success_count += 1
                else:
                    self.log_test("Chat History Retrieval", False, "Missing messages", data)
            else:
                self.log_test("Chat History Retrieval", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Chat History Retrieval", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 AI Chat System Tests: {success_count}/{total_tests} passed")
        return success_count == total_tests
    
    def test_platform_wallet_and_admin(self):
        """Test Priority 3: Platform Wallet & Admin Features"""
        print("\n" + "="*60)
        print("PRIORITY 3: PLATFORM WALLET & ADMIN FEATURES TESTING")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        # Test Platform Wallet Balance Retrieval
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-wallet/balance",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balance" in data:
                    balance_info = data["balance"]
                    total_balance = balance_info.get("total_gbp", 0)
                    currencies = balance_info.get("currencies", {})
                    
                    self.log_test(
                        "Platform Wallet Balance", 
                        True, 
                        f"✅ Platform wallet balance retrieved - Total: £{total_balance}, Currencies: {len(currencies)}"
                    )
                    success_count += 1
                else:
                    self.log_test("Platform Wallet Balance", False, "Missing balance info", data)
            else:
                self.log_test("Platform Wallet Balance", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Platform Wallet Balance", False, f"Request failed: {str(e)}")
        
        # Test Referral Bonus System (Platform Wallet Deduction)
        total_tests += 1
        user_id = self.user_ids.get("user")
        if user_id:
            try:
                response = self.session.post(
                    f"{BASE_URL}/referral/bonus/process",
                    json={
                        "user_id": user_id,
                        "bonus_amount": 10.0,
                        "bonus_type": "signup_bonus",
                        "deduct_from_platform": True
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        bonus_processed = data.get("bonus_processed", False)
                        platform_deduction = data.get("platform_deduction", 0)
                        
                        self.log_test(
                            "Referral Bonus System", 
                            True, 
                            f"✅ Referral bonus processed - Bonus: {bonus_processed}, Platform Deduction: £{platform_deduction}"
                        )
                        success_count += 1
                    else:
                        self.log_test("Referral Bonus System", False, "Bonus processing failed", data)
                else:
                    self.log_test("Referral Bonus System", False, f"Status {response.status_code}", response.text[:200])
                    
            except Exception as e:
                self.log_test("Referral Bonus System", False, f"Request failed: {str(e)}")
        
        # Test Admin Endpoints Accessibility
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard/stats",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    user_count = stats.get("total_users", 0)
                    transaction_count = stats.get("total_transactions", 0)
                    
                    self.log_test(
                        "Admin Dashboard Access", 
                        True, 
                        f"✅ Admin dashboard accessible - Users: {user_count}, Transactions: {transaction_count}"
                    )
                    success_count += 1
                else:
                    self.log_test("Admin Dashboard Access", False, "Missing stats", data)
            else:
                self.log_test("Admin Dashboard Access", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Admin Dashboard Access", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Platform Wallet & Admin Tests: {success_count}/{total_tests} passed")
        return success_count == total_tests
    
    def test_price_alerts_system(self):
        """Test Priority 4: Price Alerts System"""
        print("\n" + "="*60)
        print("PRIORITY 4: PRICE ALERTS SYSTEM TESTING")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        user_id = self.user_ids.get("user")
        if not user_id:
            self.log_test("Price Alerts System", False, "No user ID available for testing")
            return False
        
        # Test Price Alert Creation
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/price-alerts/create",
                json={
                    "user_id": user_id,
                    "cryptocurrency": "BTC",
                    "target_price": 50000.0,
                    "condition": "above",
                    "notification_method": "email"
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("alert_id"):
                    self.price_alert_id = data["alert_id"]
                    
                    self.log_test(
                        "Price Alert Creation", 
                        True, 
                        f"✅ Price alert created - ID: {self.price_alert_id}, BTC > £50,000"
                    )
                    success_count += 1
                else:
                    self.log_test("Price Alert Creation", False, "Missing alert_id", data)
            else:
                self.log_test("Price Alert Creation", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Price Alert Creation", False, f"Request failed: {str(e)}")
        
        # Test Price Alert Retrieval
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/price-alerts/user/{user_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "alerts" in data:
                    alerts = data["alerts"]
                    active_alerts = [a for a in alerts if a.get("is_active", False)]
                    
                    self.log_test(
                        "Price Alert Retrieval", 
                        True, 
                        f"✅ Price alerts retrieved - Total: {len(alerts)}, Active: {len(active_alerts)}"
                    )
                    success_count += 1
                else:
                    self.log_test("Price Alert Retrieval", False, "Missing alerts", data)
            else:
                self.log_test("Price Alert Retrieval", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Price Alert Retrieval", False, f"Request failed: {str(e)}")
        
        # Test Background Task Status
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/price-alerts/background-status",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    task_status = data.get("task_status", "unknown")
                    last_check = data.get("last_price_check", "never")
                    alerts_processed = data.get("alerts_processed_today", 0)
                    
                    self.log_test(
                        "Background Task Status", 
                        True, 
                        f"✅ Background task status - Status: {task_status}, Last Check: {last_check}, Processed: {alerts_processed}"
                    )
                    success_count += 1
                else:
                    self.log_test("Background Task Status", False, "Task status check failed", data)
            else:
                self.log_test("Background Task Status", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Background Task Status", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Price Alerts System Tests: {success_count}/{total_tests} passed")
        return success_count == total_tests
    
    def test_p2p_seller_profile(self):
        """Test Priority 5: P2P Seller Profile"""
        print("\n" + "="*60)
        print("PRIORITY 5: P2P SELLER PROFILE TESTING")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        seller_id = self.user_ids.get("seller")
        if not seller_id:
            self.log_test("P2P Seller Profile", False, "No seller ID available for testing")
            return False
        
        # Test Public Seller Profile Endpoint
        total_tests += 1
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/seller/profile/{seller_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "profile" in data:
                    profile = data["profile"]
                    username = profile.get("username", "Unknown")
                    rating = profile.get("rating", 0)
                    total_trades = profile.get("total_trades", 0)
                    
                    self.log_test(
                        "Public Seller Profile", 
                        True, 
                        f"✅ Seller profile retrieved - Username: {username}, Rating: {rating}, Trades: {total_trades}"
                    )
                    success_count += 1
                else:
                    self.log_test("Public Seller Profile", False, "Missing profile", data)
            else:
                self.log_test("Public Seller Profile", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Public Seller Profile", False, f"Request failed: {str(e)}")
        
        # Test Seller Link Generation
        total_tests += 1
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/seller/generate-link",
                json={
                    "seller_id": seller_id,
                    "link_type": "profile",
                    "custom_params": {
                        "crypto": "BTC",
                        "fiat": "GBP"
                    }
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("seller_link"):
                    seller_link = data["seller_link"]
                    link_id = data.get("link_id", "")
                    
                    self.log_test(
                        "Seller Link Generation", 
                        True, 
                        f"✅ Seller link generated - Link: {seller_link}, ID: {link_id}"
                    )
                    success_count += 1
                else:
                    self.log_test("Seller Link Generation", False, "Missing seller_link", data)
            else:
                self.log_test("Seller Link Generation", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Seller Link Generation", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 P2P Seller Profile Tests: {success_count}/{total_tests} passed")
        return success_count == total_tests
    
    def test_mobile_app_download(self):
        """Test Priority 6: Mobile App Download"""
        print("\n" + "="*60)
        print("PRIORITY 6: MOBILE APP DOWNLOAD TESTING")
        print("="*60)
        
        success_count = 0
        total_tests = 0
        
        # Test iOS Detection and Response
        total_tests += 1
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
            }
            
            response = self.session.get(
                f"{BASE_URL}/mobile/app-download",
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    platform_detected = data.get("platform_detected", "unknown")
                    app_store_url = data.get("app_store_url", "")
                    download_available = data.get("download_available", False)
                    
                    self.log_test(
                        "iOS Detection", 
                        True, 
                        f"✅ iOS detected - Platform: {platform_detected}, App Store URL: {bool(app_store_url)}, Available: {download_available}"
                    )
                    success_count += 1
                else:
                    self.log_test("iOS Detection", False, "iOS detection failed", data)
            else:
                self.log_test("iOS Detection", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("iOS Detection", False, f"Request failed: {str(e)}")
        
        # Test Android APK Download
        total_tests += 1
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
            }
            
            response = self.session.get(
                f"{BASE_URL}/mobile/app-download",
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    platform_detected = data.get("platform_detected", "unknown")
                    apk_download_url = data.get("apk_download_url", "")
                    download_available = data.get("download_available", False)
                    
                    self.log_test(
                        "Android APK Download", 
                        True, 
                        f"✅ Android detected - Platform: {platform_detected}, APK URL: {bool(apk_download_url)}, Available: {download_available}"
                    )
                    success_count += 1
                else:
                    self.log_test("Android APK Download", False, "Android detection failed", data)
            else:
                self.log_test("Android APK Download", False, f"Status {response.status_code}", response.text[:200])
                
        except Exception as e:
            self.log_test("Android APK Download", False, f"Request failed: {str(e)}")
        
        print(f"\n📊 Mobile App Download Tests: {success_count}/{total_tests} passed")
        return success_count == total_tests
    
    def run_comprehensive_test(self):
        """Run all comprehensive backend tests"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING FOR REVIEW")
        print("=" * 80)
        print(f"Backend URL: {BASE_URL}")
        print(f"Test Started: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # Track overall results
        test_sections = []
        
        # Run all priority tests
        test_sections.append(("Authentication & User Management", self.test_user_registration_and_login()))
        test_sections.append(("AI Chat System Integration", self.test_ai_chat_system()))
        test_sections.append(("Platform Wallet & Admin Features", self.test_platform_wallet_and_admin()))
        test_sections.append(("Price Alerts System", self.test_price_alerts_system()))
        test_sections.append(("P2P Seller Profile", self.test_p2p_seller_profile()))
        test_sections.append(("Mobile App Download", self.test_mobile_app_download()))
        
        # Generate final summary
        print("\n" + "="*80)
        print("🎯 COMPREHENSIVE BACKEND TEST RESULTS SUMMARY")
        print("="*80)
        
        passed_sections = 0
        total_sections = len(test_sections)
        
        for section_name, section_passed in test_sections:
            status = "✅ PASS" if section_passed else "❌ FAIL"
            print(f"{status} {section_name}")
            if section_passed:
                passed_sections += 1
        
        print(f"\n📊 Overall Results: {passed_sections}/{total_sections} sections passed")
        
        # Detailed test breakdown
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        print(f"📋 Detailed Results: {passed_tests}/{total_tests} individual tests passed")
        print(f"🎯 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print(f"\n⏰ Test Completed: {datetime.now().isoformat()}")
        print("="*80)
        
        return passed_sections == total_sections

if __name__ == "__main__":
    tester = ComprehensiveReviewTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)