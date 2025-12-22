#!/usr/bin/env python3
"""
CRITICAL USER REGISTRATION AND LOGIN FLOW TEST
==============================================

This test verifies that customers can sign up and login immediately without email verification issues.

Test Scenario:
1. Register a new user with email/password
2. Immediately try to login with the same credentials
3. Verify login is successful without email verification issues

Success Criteria:
- Registration creates account with email_verified = True
- Login works immediately without verification errors
- Token is returned and valid
- No 403 "Please verify your email" errors
"""

import requests
import json
import time
import jwt
from datetime import datetime

# Configuration
BACKEND_URL = "https://balance-sync-repair.preview.emergentagent.com/api"

def test_user_registration_and_login():
    """Test complete user registration and immediate login flow"""
    
    print("🎯 STARTING CRITICAL USER REGISTRATION AND LOGIN FLOW TEST")
    print("=" * 70)
    
    # Generate unique test user credentials
    timestamp = int(time.time())
    test_email = f"test_customer_{timestamp}@example.com"
    test_password = "TestPass123!"
    test_name = "Test Customer"
    
    print(f"📧 Test Email: {test_email}")
    print(f"🔐 Test Password: {test_password}")
    print(f"👤 Test Name: {test_name}")
    print()
    
    success_count = 0
    total_tests = 6
    
    try:
        # ============================================================================
        # STEP 1: REGISTER NEW USER
        # ============================================================================
        print("🔥 STEP 1: REGISTERING NEW USER")
        print("-" * 40)
        
        registration_data = {
            "email": test_email,
            "password": test_password,
            "full_name": test_name
        }
        
        print(f"📤 POST {BACKEND_URL}/auth/register")
        print(f"📋 Data: {json.dumps(registration_data, indent=2)}")
        
        register_response = requests.post(
            f"{BACKEND_URL}/auth/register",
            json=registration_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📥 Status Code: {register_response.status_code}")
        
        if register_response.status_code == 200:
            register_data = register_response.json()
            print(f"✅ Registration Response: {json.dumps(register_data, indent=2)}")
            
            # Verify registration success
            if register_data.get("success"):
                print("✅ TEST 1 PASSED: Registration successful")
                success_count += 1
                
                # Verify email_verified is True
                user_data = register_data.get("user", {})
                if user_data.get("email_verified") == True:
                    print("✅ TEST 2 PASSED: email_verified = True (no verification required)")
                    success_count += 1
                else:
                    print(f"❌ TEST 2 FAILED: email_verified = {user_data.get('email_verified')} (should be True)")
            else:
                print(f"❌ TEST 1 FAILED: Registration not successful - {register_data}")
        else:
            print(f"❌ TEST 1 FAILED: Registration failed with status {register_response.status_code}")
            print(f"Response: {register_response.text}")
            return
        
        print()
        
        # ============================================================================
        # STEP 2: IMMEDIATE LOGIN WITH SAME CREDENTIALS
        # ============================================================================
        print("🔥 STEP 2: IMMEDIATE LOGIN WITH SAME CREDENTIALS")
        print("-" * 50)
        
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        print(f"📤 POST {BACKEND_URL}/auth/login")
        print(f"📋 Data: {json.dumps(login_data, indent=2)}")
        
        login_response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📥 Status Code: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_response_data = login_response.json()
            print(f"✅ Login Response: {json.dumps(login_response_data, indent=2)}")
            
            # Verify login success
            if login_response_data.get("success"):
                print("✅ TEST 3 PASSED: Login successful immediately after registration")
                success_count += 1
                
                # Verify token is returned
                token = login_response_data.get("token")
                if token:
                    print("✅ TEST 4 PASSED: JWT token returned")
                    success_count += 1
                    
                    # Verify token is valid
                    try:
                        decoded_token = jwt.decode(token, options={"verify_signature": False})
                        print(f"🔍 Token Contents: {json.dumps(decoded_token, indent=2)}")
                        
                        # Check token has required fields
                        if all(field in decoded_token for field in ["user_id", "email", "exp"]):
                            print("✅ TEST 5 PASSED: JWT token contains required fields (user_id, email, exp)")
                            success_count += 1
                            
                            # Check token is not expired
                            exp_timestamp = decoded_token["exp"]
                            current_timestamp = datetime.utcnow().timestamp()
                            if exp_timestamp > current_timestamp:
                                print("✅ TEST 6 PASSED: JWT token is not expired")
                                success_count += 1
                            else:
                                print(f"❌ TEST 6 FAILED: JWT token is expired (exp: {exp_timestamp}, now: {current_timestamp})")
                        else:
                            print(f"❌ TEST 5 FAILED: JWT token missing required fields. Has: {list(decoded_token.keys())}")
                    except Exception as e:
                        print(f"❌ TEST 5 FAILED: Could not decode JWT token: {str(e)}")
                else:
                    print("❌ TEST 4 FAILED: No JWT token returned")
            else:
                print(f"❌ TEST 3 FAILED: Login not successful - {login_response_data}")
                
        elif login_response.status_code == 403:
            print(f"❌ TEST 3 FAILED: Login blocked with 403 - Email verification required")
            print(f"Response: {login_response.text}")
        else:
            print(f"❌ TEST 3 FAILED: Login failed with status {login_response.status_code}")
            print(f"Response: {login_response.text}")
        
        print()
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # ============================================================================
    # FINAL RESULTS
    # ============================================================================
    print("🎯 FINAL TEST RESULTS")
    print("=" * 70)
    
    success_rate = (success_count / total_tests) * 100
    
    print(f"✅ Tests Passed: {success_count}/{total_tests}")
    print(f"📊 Success Rate: {success_rate:.1f}%")
    
    if success_count == total_tests:
        print("🎉 ALL TESTS PASSED - USER REGISTRATION AND LOGIN FLOW IS WORKING PERFECTLY!")
        print("✅ Customers can sign up and login immediately without email verification issues")
        print("✅ Registration creates account with email_verified = True")
        print("✅ Login works immediately without verification errors")
        print("✅ Token is returned and valid")
        print("✅ No 403 'Please verify your email' errors")
    else:
        print("⚠️  SOME TESTS FAILED - ISSUES DETECTED IN REGISTRATION/LOGIN FLOW")
        
        failed_tests = total_tests - success_count
        print(f"❌ {failed_tests} test(s) failed")
        
        if success_count >= 3:
            print("✅ Core functionality working but some validation issues")
        else:
            print("❌ Critical issues detected - registration/login flow broken")
    
    print()
    return success_count == total_tests

if __name__ == "__main__":
    test_user_registration_and_login()