#!/usr/bin/env python3
"""
USER REGISTRATION AND LOGIN EDGE CASES TEST
===========================================

This test verifies edge cases and error handling for the registration/login flow.
"""

import requests
import json
import time

# Configuration
BACKEND_URL = "https://express-buy-flow.preview.emergentagent.com/api"

def test_edge_cases():
    """Test edge cases for registration and login"""
    
    print("🎯 TESTING REGISTRATION AND LOGIN EDGE CASES")
    print("=" * 60)
    
    success_count = 0
    total_tests = 4
    
    # Generate unique test user for duplicate test
    timestamp = int(time.time())
    test_email = f"edge_test_{timestamp}@example.com"
    test_password = "EdgeTest123!"
    test_name = "Edge Test User"
    
    try:
        # ============================================================================
        # TEST 1: DUPLICATE EMAIL REGISTRATION
        # ============================================================================
        print("🔥 TEST 1: DUPLICATE EMAIL REGISTRATION")
        print("-" * 40)
        
        # First registration
        registration_data = {
            "email": test_email,
            "password": test_password,
            "full_name": test_name
        }
        
        first_response = requests.post(
            f"{BACKEND_URL}/auth/register",
            json=registration_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📤 First registration: {first_response.status_code}")
        
        if first_response.status_code == 200:
            # Try duplicate registration
            second_response = requests.post(
                f"{BACKEND_URL}/auth/register",
                json=registration_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"📤 Duplicate registration: {second_response.status_code}")
            
            if second_response.status_code == 400:
                error_data = second_response.json()
                if "already registered" in error_data.get("detail", "").lower():
                    print("✅ TEST 1 PASSED: Duplicate email properly rejected")
                    success_count += 1
                else:
                    print(f"❌ TEST 1 FAILED: Wrong error message: {error_data}")
            else:
                print(f"❌ TEST 1 FAILED: Duplicate registration should return 400, got {second_response.status_code}")
        else:
            print(f"❌ TEST 1 FAILED: First registration failed: {first_response.status_code}")
        
        print()
        
        # ============================================================================
        # TEST 2: INVALID LOGIN CREDENTIALS
        # ============================================================================
        print("🔥 TEST 2: INVALID LOGIN CREDENTIALS")
        print("-" * 40)
        
        invalid_login_data = {
            "email": test_email,
            "password": "WrongPassword123!"
        }
        
        invalid_response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json=invalid_login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📤 Invalid login: {invalid_response.status_code}")
        
        if invalid_response.status_code == 401:
            error_data = invalid_response.json()
            if "invalid credentials" in error_data.get("detail", "").lower():
                print("✅ TEST 2 PASSED: Invalid credentials properly rejected")
                success_count += 1
            else:
                print(f"❌ TEST 2 FAILED: Wrong error message: {error_data}")
        else:
            print(f"❌ TEST 2 FAILED: Invalid login should return 401, got {invalid_response.status_code}")
        
        print()
        
        # ============================================================================
        # TEST 3: NON-EXISTENT USER LOGIN
        # ============================================================================
        print("🔥 TEST 3: NON-EXISTENT USER LOGIN")
        print("-" * 40)
        
        nonexistent_login_data = {
            "email": f"nonexistent_{timestamp}@example.com",
            "password": "SomePassword123!"
        }
        
        nonexistent_response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json=nonexistent_login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📤 Non-existent user login: {nonexistent_response.status_code}")
        
        if nonexistent_response.status_code == 401:
            error_data = nonexistent_response.json()
            if "invalid credentials" in error_data.get("detail", "").lower():
                print("✅ TEST 3 PASSED: Non-existent user properly rejected")
                success_count += 1
            else:
                print(f"❌ TEST 3 FAILED: Wrong error message: {error_data}")
        else:
            print(f"❌ TEST 3 FAILED: Non-existent user login should return 401, got {nonexistent_response.status_code}")
        
        print()
        
        # ============================================================================
        # TEST 4: VALID LOGIN AFTER REGISTRATION
        # ============================================================================
        print("🔥 TEST 4: VALID LOGIN AFTER REGISTRATION")
        print("-" * 40)
        
        valid_login_data = {
            "email": test_email,
            "password": test_password
        }
        
        valid_response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json=valid_login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📤 Valid login: {valid_response.status_code}")
        
        if valid_response.status_code == 200:
            login_data = valid_response.json()
            if login_data.get("success") and login_data.get("token"):
                print("✅ TEST 4 PASSED: Valid login successful with token")
                success_count += 1
            else:
                print(f"❌ TEST 4 FAILED: Login response missing success/token: {login_data}")
        else:
            print(f"❌ TEST 4 FAILED: Valid login should return 200, got {valid_response.status_code}")
            print(f"Response: {valid_response.text}")
        
        print()
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # ============================================================================
    # FINAL RESULTS
    # ============================================================================
    print("🎯 EDGE CASES TEST RESULTS")
    print("=" * 60)
    
    success_rate = (success_count / total_tests) * 100
    
    print(f"✅ Tests Passed: {success_count}/{total_tests}")
    print(f"📊 Success Rate: {success_rate:.1f}%")
    
    if success_count == total_tests:
        print("🎉 ALL EDGE CASE TESTS PASSED - ERROR HANDLING IS ROBUST!")
    else:
        print("⚠️  SOME EDGE CASE TESTS FAILED - ERROR HANDLING ISSUES DETECTED")
    
    print()
    return success_count == total_tests

if __name__ == "__main__":
    test_edge_cases()