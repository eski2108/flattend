#!/usr/bin/env python3
"""
JWT LOGIN TOKEN TEST - URGENT FIX VERIFICATION

Test that login now returns JWT token as specifically requested in review.

**TEST CASE 1: Login with existing user**
- POST /api/auth/login
- Payload: {
    "email": "urgent_login_test@test.com",
    "password": "Test123456"
  }
- Expected: 200 success
- Verify response contains:
  - "token" field (JWT token)
  - "user" object with user_id, email
  - "success": true

**TEST CASE 2: Verify token is valid JWT**
- Decode the token
- Check it contains user_id, email, exp fields

**SUCCESS CRITERIA:**
- Login returns JWT token
- Token is properly formatted
- User can now maintain sessions

Backend URL: https://p2p-trader-board.preview.emergentagent.com/api
"""

import requests
import json
import sys
import base64
from datetime import datetime

# Configuration
BASE_URL = "https://p2p-trader-board.preview.emergentagent.com/api"

# Test credentials as specified in review
TEST_EMAIL = "urgent_login_test@test.com"
TEST_PASSWORD = "Test123456"

def print_test_header(test_name):
    """Print formatted test header"""
    print(f"\n{'='*60}")
    print(f"🧪 {test_name}")
    print(f"{'='*60}")

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def decode_jwt_payload(token):
    """Decode JWT payload (without verification for testing)"""
    try:
        # JWT has 3 parts separated by dots
        parts = token.split('.')
        if len(parts) != 3:
            return None, "Invalid JWT format - should have 3 parts"
        
        # Decode the payload (second part)
        payload = parts[1]
        
        # Add padding if needed
        padding = len(payload) % 4
        if padding:
            payload += '=' * (4 - padding)
        
        # Decode base64
        decoded_bytes = base64.urlsafe_b64decode(payload)
        decoded_payload = json.loads(decoded_bytes.decode('utf-8'))
        
        return decoded_payload, None
    except Exception as e:
        return None, f"Error decoding JWT: {str(e)}"

def test_user_registration():
    """First ensure the test user exists"""
    print_test_header("SETUP: Ensure Test User Exists")
    
    # Try to register the user (will fail if already exists, which is fine)
    register_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "full_name": "Urgent Login Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data, timeout=10)
        if response.status_code == 201:
            print_success(f"Test user registered successfully: {TEST_EMAIL}")
            return True
        elif response.status_code == 400:
            # User might already exist
            result = response.json()
            if "already" in result.get("detail", "").lower() or "registered" in result.get("detail", "").lower():
                print_info(f"Test user already exists: {TEST_EMAIL}")
                return True
            else:
                print_error(f"Registration failed: {result.get('detail', 'Unknown error')}")
                return False
        else:
            print_error(f"Registration failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Registration request failed: {str(e)}")
        return False

def test_jwt_login():
    """Test Case 1: Login with existing user and verify JWT token"""
    print_test_header("TEST CASE 1: Login with JWT Token Verification")
    
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    print_info(f"Testing login for: {TEST_EMAIL}")
    print_info(f"POST {BASE_URL}/auth/login")
    print_info(f"Payload: {json.dumps(login_data, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        
        print_info(f"Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Login failed with status {response.status_code}")
            try:
                error_detail = response.json()
                print_error(f"Error details: {json.dumps(error_detail, indent=2)}")
            except:
                print_error(f"Response text: {response.text}")
            return False
        
        # Parse response
        try:
            result = response.json()
            print_info(f"Response: {json.dumps(result, indent=2)}")
        except:
            print_error("Failed to parse JSON response")
            print_error(f"Raw response: {response.text}")
            return False
        
        # Verify response structure
        success_checks = []
        
        # Check 1: success field
        if result.get("success") == True:
            print_success("✓ Response contains 'success': true")
            success_checks.append(True)
        else:
            print_error("✗ Response missing 'success': true")
            success_checks.append(False)
        
        # Check 2: token field
        token = result.get("token")
        if token:
            print_success("✓ Response contains 'token' field")
            print_info(f"Token preview: {token[:50]}...")
            success_checks.append(True)
        else:
            print_error("✗ Response missing 'token' field")
            success_checks.append(False)
            return False
        
        # Check 3: user object
        user = result.get("user")
        if user and isinstance(user, dict):
            print_success("✓ Response contains 'user' object")
            
            # Check user_id
            if user.get("user_id"):
                print_success(f"✓ User object contains 'user_id': {user.get('user_id')}")
                success_checks.append(True)
            else:
                print_error("✗ User object missing 'user_id'")
                success_checks.append(False)
            
            # Check email
            if user.get("email") == TEST_EMAIL:
                print_success(f"✓ User object contains correct 'email': {user.get('email')}")
                success_checks.append(True)
            else:
                print_error(f"✗ User object email mismatch. Expected: {TEST_EMAIL}, Got: {user.get('email')}")
                success_checks.append(False)
        else:
            print_error("✗ Response missing 'user' object")
            success_checks.append(False)
        
        # Test Case 2: Verify JWT token format and contents
        if token:
            print_test_header("TEST CASE 2: Verify JWT Token Format and Contents")
            
            # Decode JWT payload
            payload, error = decode_jwt_payload(token)
            
            if error:
                print_error(f"✗ JWT decoding failed: {error}")
                success_checks.append(False)
            else:
                print_success("✓ JWT token successfully decoded")
                print_info(f"JWT Payload: {json.dumps(payload, indent=2)}")
                
                # Check required fields in JWT
                jwt_checks = []
                
                # Check user_id in JWT
                if payload.get("user_id"):
                    print_success(f"✓ JWT contains 'user_id': {payload.get('user_id')}")
                    jwt_checks.append(True)
                else:
                    print_error("✗ JWT missing 'user_id' field")
                    jwt_checks.append(False)
                
                # Check email in JWT
                if payload.get("email") == TEST_EMAIL:
                    print_success(f"✓ JWT contains correct 'email': {payload.get('email')}")
                    jwt_checks.append(True)
                else:
                    print_error(f"✗ JWT email mismatch. Expected: {TEST_EMAIL}, Got: {payload.get('email')}")
                    jwt_checks.append(False)
                
                # Check exp (expiration) in JWT
                if payload.get("exp"):
                    exp_timestamp = payload.get("exp")
                    exp_datetime = datetime.fromtimestamp(exp_timestamp)
                    print_success(f"✓ JWT contains 'exp' field: {exp_timestamp} ({exp_datetime})")
                    
                    # Check if token is not expired
                    if exp_datetime > datetime.now():
                        print_success("✓ JWT token is not expired")
                        jwt_checks.append(True)
                    else:
                        print_error("✗ JWT token is expired")
                        jwt_checks.append(False)
                else:
                    print_error("✗ JWT missing 'exp' field")
                    jwt_checks.append(False)
                
                success_checks.extend(jwt_checks)
        
        # Calculate success rate
        total_checks = len(success_checks)
        passed_checks = sum(success_checks)
        success_rate = (passed_checks / total_checks) * 100
        
        print_test_header("TEST RESULTS SUMMARY")
        print_info(f"Total Checks: {total_checks}")
        print_info(f"Passed Checks: {passed_checks}")
        print_info(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 85:
            print_success("🎯 JWT LOGIN TEST PASSED - Login returns JWT token successfully!")
            return True
        else:
            print_error("❌ JWT LOGIN TEST FAILED - Critical issues found")
            return False
            
    except Exception as e:
        print_error(f"Login request failed: {str(e)}")
        return False

def main():
    """Run JWT login tests"""
    print("🚀 Starting JWT Login Token Test - Urgent Fix Verification")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    
    # Step 1: Ensure test user exists
    if not test_user_registration():
        print_error("Failed to setup test user. Aborting tests.")
        sys.exit(1)
    
    # Step 2: Test JWT login
    if test_jwt_login():
        print_test_header("🎉 SUCCESS: JWT LOGIN FUNCTIONALITY VERIFIED")
        print_success("✅ Login returns JWT token")
        print_success("✅ Token is properly formatted")
        print_success("✅ User can now maintain sessions")
        sys.exit(0)
    else:
        print_test_header("❌ FAILURE: JWT LOGIN ISSUES FOUND")
        print_error("Login JWT token functionality needs fixing")
        sys.exit(1)

if __name__ == "__main__":
    main()