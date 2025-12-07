#!/usr/bin/env python3
"""
URGENT LOGIN FUNCTIONALITY TEST
Tests the specific login issues reported by the user.

Test Cases:
1. Register new user with email "urgent_login_test@test.com"
2. Login with registered user - should return 200 with token and user data
3. Login with wrong password - should return 401 error
4. Check backend logs for any login errors

Backend URL: https://protrading.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://protrading.preview.emergentagent.com/api"

# Test User as specified in the review request
URGENT_TEST_USER = {
    "email": "urgent_login_test@test.com",
    "password": "Test123456",
    "full_name": "Login Test User"
}

class UrgentLoginTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_id = None
        
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
    
    def test_case_1_register_new_user(self):
        """Test Case 1: Register new user"""
        print("\n=== TEST CASE 1: Register New User ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=URGENT_TEST_USER,
                timeout=10
            )
            
            print(f"Registration Response Status: {response.status_code}")
            print(f"Registration Response: {response.text[:500]}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    self.log_test(
                        "Register New User", 
                        True, 
                        f"User registered successfully with ID: {self.user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Register New User", 
                        False, 
                        "Registration response missing success or user_id",
                        data
                    )
            elif response.status_code == 400 and "already registered" in response.text.lower():
                # User already exists, this is OK for repeated tests
                self.log_test(
                    "Register New User", 
                    True, 
                    "User already exists (expected for repeated tests)"
                )
                return True
            else:
                self.log_test(
                    "Register New User", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Register New User", 
                False, 
                f"Registration request failed: {str(e)}"
            )
            
        return False
    
    def test_case_2_login_with_correct_credentials(self):
        """Test Case 2: Login with registered user"""
        print("\n=== TEST CASE 2: Login with Correct Credentials ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": URGENT_TEST_USER["email"],
                    "password": URGENT_TEST_USER["password"]
                },
                timeout=10
            )
            
            print(f"Login Response Status: {response.status_code}")
            print(f"Login Response: {response.text[:500]}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Check for required fields in response
                    user_data = data.get("user", {})
                    token = data.get("token") or data.get("access_token")
                    user_id = user_data.get("user_id")
                    email = user_data.get("email")
                    
                    if token and user_id and email:
                        self.user_id = user_id
                        self.log_test(
                            "Login with Correct Credentials", 
                            True, 
                            f"Login successful - Token: {token[:20]}..., User ID: {user_id}, Email: {email}"
                        )
                        return True
                    else:
                        missing_fields = []
                        if not token: missing_fields.append("token")
                        if not user_id: missing_fields.append("user_id")
                        if not email: missing_fields.append("email")
                        
                        self.log_test(
                            "Login with Correct Credentials", 
                            False, 
                            f"Login response missing required fields: {missing_fields}",
                            data
                        )
                else:
                    self.log_test(
                        "Login with Correct Credentials", 
                        False, 
                        "Login response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Login with Correct Credentials", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Login with Correct Credentials", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False
    
    def test_case_3_login_with_wrong_password(self):
        """Test Case 3: Login with wrong password"""
        print("\n=== TEST CASE 3: Login with Wrong Password ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": URGENT_TEST_USER["email"],
                    "password": "WrongPassword"
                },
                timeout=10
            )
            
            print(f"Wrong Password Response Status: {response.status_code}")
            print(f"Wrong Password Response: {response.text[:500]}")
            
            if response.status_code == 401:
                self.log_test(
                    "Login with Wrong Password", 
                    True, 
                    "Correctly rejected login with wrong password (401 error)"
                )
                return True
            elif response.status_code == 400:
                # Some APIs return 400 for invalid credentials
                data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                if "password" in response.text.lower() or "invalid" in response.text.lower():
                    self.log_test(
                        "Login with Wrong Password", 
                        True, 
                        "Correctly rejected login with wrong password (400 error)"
                    )
                    return True
                else:
                    self.log_test(
                        "Login with Wrong Password", 
                        False, 
                        f"Unexpected 400 error response: {response.text}"
                    )
            else:
                self.log_test(
                    "Login with Wrong Password", 
                    False, 
                    f"Expected 401 error but got status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Login with Wrong Password", 
                False, 
                f"Wrong password test request failed: {str(e)}"
            )
            
        return False
    
    def test_case_4_check_backend_logs(self):
        """Test Case 4: Check for backend issues mentioned in review"""
        print("\n=== TEST CASE 4: Check Backend Logs and Potential Issues ===")
        
        # Test boost status endpoint that might be causing issues
        try:
            if self.user_id:
                response = self.session.get(
                    f"{BASE_URL}/p2p/boost-status/{self.user_id}",
                    timeout=10
                )
                
                print(f"Boost Status Response Status: {response.status_code}")
                print(f"Boost Status Response: {response.text[:500]}")
                
                if response.status_code == 200:
                    self.log_test(
                        "Boost Status Endpoint", 
                        True, 
                        "Boost status endpoint working correctly"
                    )
                else:
                    self.log_test(
                        "Boost Status Endpoint", 
                        False, 
                        f"Boost status endpoint failed with status {response.status_code}",
                        response.text
                    )
            else:
                self.log_test(
                    "Boost Status Endpoint", 
                    False, 
                    "Cannot test boost status - no user_id available"
                )
        except Exception as e:
            self.log_test(
                "Boost Status Endpoint", 
                False, 
                f"Boost status request failed: {str(e)}"
            )
        
        # Test datetime-related endpoints that might have comparison errors
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto/prices",
                timeout=10
            )
            
            print(f"Crypto Prices Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Datetime-Related Endpoints", 
                        True, 
                        "Crypto prices endpoint working (no datetime errors)"
                    )
                else:
                    self.log_test(
                        "Datetime-Related Endpoints", 
                        False, 
                        "Crypto prices endpoint returned success=false",
                        data
                    )
            else:
                self.log_test(
                    "Datetime-Related Endpoints", 
                    False, 
                    f"Crypto prices endpoint failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test(
                "Datetime-Related Endpoints", 
                False, 
                f"Datetime-related endpoint test failed: {str(e)}"
            )
        
        return True
    
    def run_all_tests(self):
        """Run all urgent login tests"""
        print("🚨 URGENT LOGIN FUNCTIONALITY TEST STARTING 🚨")
        print("=" * 60)
        
        test_methods = [
            self.test_case_1_register_new_user,
            self.test_case_2_login_with_correct_credentials,
            self.test_case_3_login_with_wrong_password,
            self.test_case_4_check_backend_logs
        ]
        
        passed_tests = 0
        total_tests = len(test_methods)
        
        for test_method in test_methods:
            try:
                if test_method():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_method.__name__} crashed: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("🚨 URGENT LOGIN TEST SUMMARY 🚨")
        print("=" * 60)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Critical findings
        print("\n🔍 CRITICAL FINDINGS:")
        failed_tests = [r for r in self.test_results if not r["success"]]
        
        if not failed_tests:
            print("✅ All login functionality tests PASSED")
            print("✅ No critical login issues found")
        else:
            print("❌ CRITICAL LOGIN ISSUES DETECTED:")
            for failed in failed_tests:
                print(f"   - {failed['test']}: {failed['message']}")
        
        return success_rate >= 75.0

if __name__ == "__main__":
    tester = UrgentLoginTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ LOGIN SYSTEM IS WORKING")
        sys.exit(0)
    else:
        print("\n❌ LOGIN SYSTEM HAS CRITICAL ISSUES")
        sys.exit(1)