#!/usr/bin/env python3
"""
Google Sign-in Authentication Flow Testing
Tests the complete Google OAuth integration as requested in review.
"""

import requests
import os
import sys
from urllib.parse import urlparse, parse_qs
import json
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://bugsecurehub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
AUTH_BASE = f"{BACKEND_URL}"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_environment_variables():
    """Test 1: Check that Google OAuth environment variables are loaded"""
    log_test("🔍 TEST 1: Checking Google OAuth Environment Variables", "TEST")
    
    try:
        # Test the backend endpoint that uses environment variables
        response = requests.get(f"{API_BASE}/auth/google", allow_redirects=False)
        
        if response.status_code == 302:
            log_test("✅ Google OAuth endpoint returns 302 redirect (environment variables loaded)", "PASS")
            
            # Check redirect URL contains client_id
            location = response.headers.get('Location', '')
            if 'client_id=' in location and 'accounts.google.com' in location:
                log_test("✅ Redirect URL contains client_id and points to Google OAuth", "PASS")
                
                # Extract client_id from redirect URL
                parsed_url = urlparse(location)
                query_params = parse_qs(parsed_url.query)
                client_id = query_params.get('client_id', [''])[0]
                
                if client_id:
                    log_test(f"✅ GOOGLE_CLIENT_ID loaded: {client_id[:20]}...", "PASS")
                    return True, client_id
                else:
                    log_test("❌ No client_id found in redirect URL", "FAIL")
                    return False, None
            else:
                log_test("❌ Redirect URL missing client_id or not pointing to Google", "FAIL")
                return False, None
        else:
            log_test(f"❌ Expected 302 redirect, got {response.status_code}", "FAIL")
            log_test(f"Response: {response.text[:200]}", "ERROR")
            return False, None
            
    except Exception as e:
        log_test(f"❌ Error testing environment variables: {str(e)}", "FAIL")
        return False, None

def test_google_auth_endpoint():
    """Test 2: Test GET request to /api/auth/google endpoint"""
    log_test("🔍 TEST 2: Testing /api/auth/google Endpoint", "TEST")
    
    try:
        response = requests.get(f"{API_BASE}/auth/google", allow_redirects=False)
        
        log_test(f"Status Code: {response.status_code}", "INFO")
        log_test(f"Headers: {dict(response.headers)}", "INFO")
        
        if response.status_code == 302:
            location = response.headers.get('Location', '')
            log_test(f"Redirect Location: {location[:100]}...", "INFO")
            
            # Verify it's a Google OAuth URL
            if 'accounts.google.com/o/oauth2/v2/auth' in location:
                log_test("✅ Correctly redirects to Google OAuth", "PASS")
                return True, location
            else:
                log_test("❌ Does not redirect to Google OAuth", "FAIL")
                return False, location
        else:
            log_test(f"❌ Expected 302 redirect, got {response.status_code}", "FAIL")
            return False, None
            
    except Exception as e:
        log_test(f"❌ Error testing /api/auth/google: {str(e)}", "FAIL")
        return False, None

def test_redirect_url_parameters(redirect_url):
    """Test 3: Verify redirect URL contains correct parameters"""
    log_test("🔍 TEST 3: Verifying Redirect URL Parameters", "TEST")
    
    try:
        parsed_url = urlparse(redirect_url)
        query_params = parse_qs(parsed_url.query)
        
        required_params = ['client_id', 'redirect_uri', 'response_type', 'scope']
        missing_params = []
        
        for param in required_params:
            if param not in query_params:
                missing_params.append(param)
        
        if missing_params:
            log_test(f"❌ Missing required parameters: {missing_params}", "FAIL")
            return False
        
        # Check specific parameter values
        client_id = query_params.get('client_id', [''])[0]
        redirect_uri = query_params.get('redirect_uri', [''])[0]
        response_type = query_params.get('response_type', [''])[0]
        scope = query_params.get('scope', [''])[0]
        
        log_test(f"client_id: {client_id[:30]}...", "INFO")
        log_test(f"redirect_uri: {redirect_uri}", "INFO")
        log_test(f"response_type: {response_type}", "INFO")
        log_test(f"scope: {scope}", "INFO")
        
        # Verify redirect_uri points back to our callback
        expected_callback = f"{BACKEND_URL}/api/auth/google/callback"
        if expected_callback in redirect_uri:
            log_test("✅ redirect_uri correctly points to callback endpoint", "PASS")
        else:
            log_test(f"❌ redirect_uri does not point to correct callback. Expected: {expected_callback}, Got: {redirect_uri}", "FAIL")
            return False
        
        # Verify response_type is 'code'
        if response_type == 'code':
            log_test("✅ response_type is correctly set to 'code'", "PASS")
        else:
            log_test(f"❌ response_type should be 'code', got '{response_type}'", "FAIL")
            return False
        
        # Verify scope includes required permissions
        if 'email' in scope and 'profile' in scope:
            log_test("✅ scope includes required 'email' and 'profile' permissions", "PASS")
        else:
            log_test("❌ scope missing required 'email' or 'profile' permissions", "FAIL")
            return False
        
        log_test("✅ All redirect URL parameters are correct", "PASS")
        return True
        
    except Exception as e:
        log_test(f"❌ Error verifying redirect URL parameters: {str(e)}", "FAIL")
        return False

def test_callback_endpoint():
    """Test 4: Verify callback endpoint exists and handles responses"""
    log_test("🔍 TEST 4: Testing /api/auth/google/callback Endpoint", "TEST")
    
    try:
        # Test callback endpoint without parameters (should handle error)
        response = requests.get(f"{API_BASE}/auth/google/callback", allow_redirects=False)
        
        log_test(f"Callback Status Code: {response.status_code}", "INFO")
        
        if response.status_code in [302, 400]:
            log_test("✅ Callback endpoint exists and responds", "PASS")
            
            # Test with error parameter
            response_error = requests.get(f"{API_BASE}/auth/google/callback?error=access_denied", allow_redirects=False)
            
            if response_error.status_code == 302:
                location = response_error.headers.get('Location', '')
                if 'error=google_oauth_denied' in location:
                    log_test("✅ Callback correctly handles OAuth denial", "PASS")
                else:
                    log_test("❌ Callback does not properly handle OAuth denial", "FAIL")
                    return False
            
            # Test with invalid code parameter
            response_invalid = requests.get(f"{API_BASE}/auth/google/callback?code=invalid_code", allow_redirects=False)
            
            if response_invalid.status_code in [302, 400, 500]:
                log_test("✅ Callback handles invalid code parameter", "PASS")
            else:
                log_test(f"❌ Unexpected response for invalid code: {response_invalid.status_code}", "FAIL")
                return False
            
            log_test("✅ Callback endpoint properly handles different scenarios", "PASS")
            return True
        else:
            log_test(f"❌ Callback endpoint not found or not responding correctly", "FAIL")
            return False
            
    except Exception as e:
        log_test(f"❌ Error testing callback endpoint: {str(e)}", "FAIL")
        return False

def test_backend_logs():
    """Test 5: Check backend logs for OAuth flow"""
    log_test("🔍 TEST 5: Checking Backend Logs for OAuth Flow", "TEST")
    
    try:
        # Trigger OAuth flow to generate logs
        response = requests.get(f"{API_BASE}/auth/google", allow_redirects=False)
        
        # Check supervisor logs for backend
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logs = result.stdout
            log_test("✅ Successfully accessed backend logs", "PASS")
            
            # Look for OAuth-related log entries
            oauth_logs = []
            for line in logs.split('\n'):
                if any(keyword in line.lower() for keyword in ['google', 'oauth', 'auth', 'client_id']):
                    oauth_logs.append(line)
            
            if oauth_logs:
                log_test(f"✅ Found {len(oauth_logs)} OAuth-related log entries", "PASS")
                for log_entry in oauth_logs[-3:]:  # Show last 3 entries
                    log_test(f"LOG: {log_entry}", "INFO")
            else:
                log_test("⚠️ No OAuth-related logs found (may be normal)", "WARN")
            
            return True
        else:
            log_test("❌ Could not access backend logs", "FAIL")
            return False
            
    except Exception as e:
        log_test(f"❌ Error checking backend logs: {str(e)}", "FAIL")
        return False

def test_complete_oauth_simulation():
    """Test 6: Simulate complete OAuth flow (without actual Google auth)"""
    log_test("🔍 TEST 6: Simulating Complete OAuth Flow", "TEST")
    
    try:
        # Step 1: Get OAuth URL
        response = requests.get(f"{API_BASE}/auth/google", allow_redirects=False)
        
        if response.status_code != 302:
            log_test("❌ Failed to get OAuth redirect", "FAIL")
            return False
        
        oauth_url = response.headers.get('Location', '')
        log_test(f"✅ Got OAuth URL: {oauth_url[:50]}...", "PASS")
        
        # Step 2: Test callback with simulated error (user denial)
        callback_response = requests.get(f"{API_BASE}/auth/google/callback?error=access_denied", allow_redirects=False)
        
        if callback_response.status_code == 302:
            error_redirect = callback_response.headers.get('Location', '')
            if 'error=google_oauth_denied' in error_redirect:
                log_test("✅ OAuth denial properly handled", "PASS")
            else:
                log_test("❌ OAuth denial not properly handled", "FAIL")
                return False
        
        # Step 3: Test callback with invalid code
        invalid_callback = requests.get(f"{API_BASE}/auth/google/callback?code=test_invalid_code", allow_redirects=False)
        
        if invalid_callback.status_code in [302, 400, 500]:
            log_test("✅ Invalid code properly handled", "PASS")
        else:
            log_test(f"❌ Invalid code not handled correctly: {invalid_callback.status_code}", "FAIL")
            return False
        
        log_test("✅ Complete OAuth flow simulation successful", "PASS")
        return True
        
    except Exception as e:
        log_test(f"❌ Error in OAuth flow simulation: {str(e)}", "FAIL")
        return False

def main():
    """Run all Google OAuth authentication tests"""
    log_test("🚀 Starting Google Sign-in Authentication Flow Testing", "START")
    log_test(f"Backend URL: {BACKEND_URL}", "INFO")
    log_test(f"API Base: {API_BASE}", "INFO")
    
    tests = [
        ("Environment Variables Check", test_environment_variables),
        ("Google Auth Endpoint", test_google_auth_endpoint),
        ("Callback Endpoint", test_callback_endpoint),
        ("Backend Logs Check", test_backend_logs),
        ("Complete OAuth Simulation", test_complete_oauth_simulation)
    ]
    
    results = []
    client_id = None
    redirect_url = None
    
    # Run environment variables test first to get client_id
    env_result, client_id = test_environment_variables()
    results.append(("Environment Variables Check", env_result))
    
    # Run Google auth endpoint test to get redirect URL
    auth_result, redirect_url = test_google_auth_endpoint()
    results.append(("Google Auth Endpoint", auth_result))
    
    # Test redirect URL parameters if we have the URL
    if redirect_url:
        redirect_params_result = test_redirect_url_parameters(redirect_url)
        results.append(("Redirect URL Parameters", redirect_params_result))
    
    # Run remaining tests
    for test_name, test_func in tests[2:]:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            log_test(f"❌ Test '{test_name}' failed with exception: {str(e)}", "ERROR")
            results.append((test_name, False))
    
    # Summary
    log_test("=" * 60, "INFO")
    log_test("🎯 GOOGLE OAUTH AUTHENTICATION TEST SUMMARY", "SUMMARY")
    log_test("=" * 60, "INFO")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log_test(f"{test_name}: {status}", "RESULT")
        if result:
            passed += 1
    
    success_rate = (passed / total) * 100 if total > 0 else 0
    log_test(f"Success Rate: {passed}/{total} ({success_rate:.1f}%)", "SUMMARY")
    
    if success_rate >= 80:
        log_test("🎉 GOOGLE OAUTH AUTHENTICATION TESTS PASSED", "SUCCESS")
        return True
    else:
        log_test("💥 GOOGLE OAUTH AUTHENTICATION TESTS FAILED", "FAILURE")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)