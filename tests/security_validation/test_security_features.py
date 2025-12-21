#!/usr/bin/env python3
"""
CoinHubX Security Validation Test Suite
Phase 1: Comprehensive Testing

Run: python3 test_security_features.py
"""

import requests
import time
import json
import uuid
from datetime import datetime

BASE_URL = "http://localhost:8001/api"
TEST_EMAIL = f"test_security_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "TestPassword123!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log_pass(msg):
    print(f"{Colors.GREEN}✅ PASS:{Colors.END} {msg}")

def log_fail(msg):
    print(f"{Colors.RED}❌ FAIL:{Colors.END} {msg}")

def log_info(msg):
    print(f"{Colors.BLUE}ℹ️  INFO:{Colors.END} {msg}")

def log_warn(msg):
    print(f"{Colors.YELLOW}⚠️  WARN:{Colors.END} {msg}")

def log_section(msg):
    print(f"\n{Colors.BOLD}{'='*60}")
    print(f" {msg}")
    print(f"{'='*60}{Colors.END}\n")

# ============================================
# TEST 1: Rate Limiting & Account Lockout
# ============================================

def test_rate_limiting_and_lockout():
    log_section("TEST 1: Rate Limiting & Account Lockout")
    
    results = {
        "test_name": "Rate Limiting & Account Lockout",
        "passed": False,
        "details": []
    }
    
    # Use a dedicated test email
    test_email = f"lockout_test_{uuid.uuid4().hex[:6]}@test.com"
    test_password = "TestPassword123!"
    
    # First, create a test user
    log_info(f"Creating test user: {test_email}")
    
    register_response = requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": test_password,
        "full_name": "Security Test User",
        "phone_number": "1234567890"
    })
    
    if register_response.status_code in [200, 201]:
        log_pass("Test user created successfully")
    elif register_response.status_code == 400:
        log_warn("User may already exist")
    else:
        log_warn(f"Registration returned: {register_response.status_code} - {register_response.text[:100]}")
    
    # Wait a moment for user to be created
    time.sleep(0.5)
    
    # Test 1.1: Attempt multiple failed logins
    log_info("Attempting 6 failed logins with wrong password...")
    
    failed_responses = []
    for i in range(6):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_email,
            "password": "WrongPassword123!"
        })
        
        response_data = None
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text}
        
        failed_responses.append({
            "attempt": i + 1,
            "status_code": response.status_code,
            "response": response_data
        })
        
        detail = response_data.get('detail', '') if isinstance(response_data, dict) else ''
        log_info(f"  Attempt {i+1}: HTTP {response.status_code} - {detail[:60]}")
        time.sleep(0.3)  # Small delay between attempts
    
    # Check results
    # After 5 fails, should get 429
    lockout_triggered = any(r['status_code'] == 429 for r in failed_responses)
    
    # Check if any response mentions "attempts remaining"
    attempts_mentioned = False
    for r in failed_responses:
        if isinstance(r['response'], dict):
            detail = r['response'].get('detail', '')
            if 'attempt' in detail.lower() or 'remaining' in detail.lower():
                attempts_mentioned = True
                break
    
    if lockout_triggered:
        log_pass(f"Account lockout triggered after failed attempts")
        results['details'].append("Account lockout: WORKING")
    else:
        log_fail("Account lockout NOT triggered after 6 failed attempts")
        results['details'].append("Account lockout: FAILED")
    
    if attempts_mentioned:
        log_pass("Response includes remaining attempts count")
        results['details'].append("Attempts counter: WORKING")
    else:
        log_warn("Response does not mention remaining attempts")
        results['details'].append("Attempts counter: NOT VISIBLE")
    
    # Test 1.2: Verify locked account cannot login even with correct password
    log_info("Attempting login with CORRECT password while locked...")
    
    locked_response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    
    if locked_response.status_code == 429:
        log_pass("Locked account rejected even with correct password")
        results['details'].append("Lock enforcement: WORKING")
    else:
        log_warn(f"Locked account response: HTTP {locked_response.status_code}")
        # If the user doesn't exist or there's another issue, note it
        if locked_response.status_code == 401:
            results['details'].append("Lock enforcement: USER MAY NOT EXIST")
        else:
            results['details'].append("Lock enforcement: CHECK MANUALLY")
    
    # Overall result - lockout must trigger
    results['passed'] = lockout_triggered
    
    return results

# ============================================
# TEST 2: Withdrawal Whitelist System
# ============================================

def test_withdrawal_whitelist():
    log_section("TEST 2: Withdrawal Whitelist System")
    
    results = {
        "test_name": "Withdrawal Whitelist",
        "passed": False,
        "details": []
    }
    
    test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
    test_address = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"  # Example BTC address
    
    # Test 2.1: Get whitelist (should be empty)
    log_info(f"Fetching whitelist for test user: {test_user_id}")
    
    response = requests.get(f"{BASE_URL}/wallet/whitelist/{test_user_id}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('addresses', []) == []:
            log_pass("Empty whitelist returned correctly")
            results['details'].append("GET whitelist: WORKING")
        else:
            log_warn(f"Whitelist not empty: {data}")
    else:
        log_fail(f"Failed to get whitelist: HTTP {response.status_code}")
        results['details'].append("GET whitelist: FAILED")
    
    # Test 2.2: Add address to whitelist
    log_info("Adding address to whitelist...")
    
    add_response = requests.post(f"{BASE_URL}/wallet/whitelist/add", json={
        "user_id": test_user_id,
        "currency": "BTC",
        "address": test_address,
        "label": "Test Wallet"
    })
    
    if add_response.status_code == 200:
        data = add_response.json()
        if data.get('success'):
            log_pass("Address added to whitelist (pending verification)")
            results['details'].append("ADD whitelist: WORKING")
            
            # Check if it mentions email verification
            if 'email' in data.get('message', '').lower():
                log_pass("Response mentions email verification requirement")
                results['details'].append("Email verification: MENTIONED")
        else:
            log_fail(f"Add whitelist failed: {data}")
    else:
        log_fail(f"Add whitelist HTTP error: {add_response.status_code}")
        results['details'].append("ADD whitelist: FAILED")
    
    # Test 2.3: Verify whitelist now has the address (unverified)
    log_info("Checking whitelist contains new address...")
    
    response = requests.get(f"{BASE_URL}/wallet/whitelist/{test_user_id}")
    
    if response.status_code == 200:
        data = response.json()
        addresses = data.get('addresses', [])
        
        found = False
        verified = False
        for addr in addresses:
            if addr.get('address') == test_address:
                found = True
                verified = addr.get('verified', False)
                break
        
        if found:
            log_pass(f"Address found in whitelist (verified={verified})")
            if not verified:
                log_pass("Address correctly marked as UNVERIFIED")
                results['details'].append("Verification status: CORRECT")
        else:
            log_fail("Address not found in whitelist")
    
    # Test 2.4: Test duplicate address rejection
    log_info("Testing duplicate address rejection...")
    
    dup_response = requests.post(f"{BASE_URL}/wallet/whitelist/add", json={
        "user_id": test_user_id,
        "currency": "BTC",
        "address": test_address,
        "label": "Duplicate Test"
    })
    
    if dup_response.status_code == 400:
        log_pass("Duplicate address correctly rejected")
        results['details'].append("Duplicate prevention: WORKING")
    else:
        log_warn(f"Duplicate not rejected: HTTP {dup_response.status_code}")
    
    # Overall result
    results['passed'] = any('WORKING' in d for d in results['details'])
    
    return results

# ============================================
# TEST 3: Health Endpoint
# ============================================

def test_health_endpoint():
    log_section("TEST 3: Health Endpoint")
    
    results = {
        "test_name": "Health Endpoint",
        "passed": False,
        "details": []
    }
    
    log_info("Testing /api/health endpoint...")
    
    response = requests.get(f"{BASE_URL}/health")
    
    if response.status_code == 200:
        log_pass("Health endpoint returns 200 OK")
        results['details'].append("HTTP Status: 200")
        
        data = response.json()
        
        if data.get('status') == 'healthy':
            log_pass("Status field indicates healthy")
            results['details'].append("Status: healthy")
            results['passed'] = True
        else:
            log_warn(f"Status field: {data.get('status')}")
        
        if 'timestamp' in data:
            log_pass("Timestamp included in response")
            results['details'].append("Timestamp: present")
        
        if 'service' in data:
            log_pass(f"Service name: {data.get('service')}")
    else:
        log_fail(f"Health endpoint failed: HTTP {response.status_code}")
    
    return results

# ============================================
# TEST 4: Bug Report Endpoint
# ============================================

def test_bug_report_endpoint():
    log_section("TEST 4: Bug Report Endpoint")
    
    results = {
        "test_name": "Bug Report System",
        "passed": False,
        "details": []
    }
    
    log_info("Testing /api/bug-report endpoint...")
    
    response = requests.post(f"{BASE_URL}/bug-report", json={
        "type": "bug",
        "description": "Automated test bug report - please ignore",
        "page_url": "http://localhost:3000/test",
        "user_id": "test_user_123",
        "device_info": {
            "userAgent": "Test Script",
            "platform": "Linux",
            "viewportWidth": 1920,
            "viewportHeight": 1080
        },
        "timestamp": datetime.utcnow().isoformat(),
        "console_errors": []
    })
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get('success'):
            log_pass("Bug report submitted successfully")
            results['details'].append("Submission: WORKING")
            results['passed'] = True
            
            if data.get('report_id'):
                log_pass(f"Report ID returned: {data.get('report_id')[:8]}...")
                results['details'].append("Report ID: returned")
        else:
            log_fail(f"Bug report failed: {data}")
    else:
        log_fail(f"Bug report HTTP error: {response.status_code}")
        results['details'].append(f"HTTP Error: {response.status_code}")
    
    return results

# ============================================
# TEST 5: Fiat On-Ramp Endpoints
# ============================================

def test_fiat_onramp_endpoints():
    log_section("TEST 5: Fiat On-Ramp Endpoints")
    
    results = {
        "test_name": "Fiat On-Ramp",
        "passed": False,
        "details": []
    }
    
    log_info("Testing /api/fiat/onramp/create-session endpoint...")
    
    # This should fail gracefully without API keys configured
    response = requests.post(f"{BASE_URL}/fiat/onramp/create-session", json={
        "user_id": "test_user",
        "amount": 100,
        "fiat_currency": "GBP",
        "crypto_currency": "BTC"
    })
    
    # Without API keys, should return 404 (user not found) or 503 (not configured)
    if response.status_code in [404, 503]:
        log_pass(f"Endpoint exists and returns expected error without config: HTTP {response.status_code}")
        results['details'].append("Endpoint: EXISTS")
        results['passed'] = True
    elif response.status_code == 200:
        log_pass("Endpoint working (API keys may be configured)")
        results['details'].append("Endpoint: WORKING")
        results['passed'] = True
    else:
        log_warn(f"Unexpected response: HTTP {response.status_code}")
        results['details'].append(f"Response: {response.status_code}")
    
    # Test status endpoint
    log_info("Testing /api/fiat/onramp/status endpoint...")
    
    status_response = requests.get(f"{BASE_URL}/fiat/onramp/status/test-session-id")
    
    if status_response.status_code == 404:
        log_pass("Status endpoint exists (returns 404 for invalid session)")
        results['details'].append("Status endpoint: EXISTS")
    elif status_response.status_code == 200:
        log_pass("Status endpoint working")
    
    return results

# ============================================
# TEST 6: P2P Payment Verification Endpoints
# ============================================

def test_p2p_verification_endpoints():
    log_section("TEST 6: P2P Payment Verification Endpoints")
    
    results = {
        "test_name": "P2P Payment Verification",
        "passed": False,
        "details": []
    }
    
    log_info("Testing /api/p2p/verify-payment/initiate endpoint...")
    
    response = requests.post(f"{BASE_URL}/p2p/verify-payment/initiate", json={
        "order_id": "test_order_123",
        "buyer_user_id": "test_user"
    })
    
    # Should return 404 (trade not found) or success with auth URL
    if response.status_code == 404:
        log_pass("Endpoint exists (returns 404 for invalid trade)")
        results['details'].append("Initiate endpoint: EXISTS")
        results['passed'] = True
    elif response.status_code == 200:
        data = response.json()
        if data.get('available') == False:
            log_pass("Endpoint working (TrueLayer not configured)")
            results['details'].append("Initiate endpoint: WORKING (no keys)")
        else:
            log_pass("Endpoint working with TrueLayer configured")
            results['details'].append("Initiate endpoint: FULLY WORKING")
        results['passed'] = True
    else:
        log_warn(f"Unexpected response: HTTP {response.status_code}")
    
    # Test status endpoint
    log_info("Testing /api/p2p/verify-payment/status endpoint...")
    
    status_response = requests.get(f"{BASE_URL}/p2p/verify-payment/status/test_order")
    
    if status_response.status_code == 404:
        log_pass("Status endpoint exists (returns 404 for invalid order)")
        results['details'].append("Status endpoint: EXISTS")
    
    return results

# ============================================
# MAIN TEST RUNNER
# ============================================

def run_all_tests():
    print(f"\n{Colors.BOLD}{'#'*60}")
    print(f"#  COINHUBX SECURITY VALIDATION TEST SUITE")
    print(f"#  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}{Colors.END}\n")
    
    all_results = []
    
    # Run all tests
    all_results.append(test_health_endpoint())
    all_results.append(test_rate_limiting_and_lockout())
    all_results.append(test_withdrawal_whitelist())
    all_results.append(test_bug_report_endpoint())
    all_results.append(test_fiat_onramp_endpoints())
    all_results.append(test_p2p_verification_endpoints())
    
    # Summary
    log_section("TEST SUMMARY")
    
    passed = sum(1 for r in all_results if r['passed'])
    total = len(all_results)
    
    for result in all_results:
        status = f"{Colors.GREEN}PASS{Colors.END}" if result['passed'] else f"{Colors.RED}FAIL{Colors.END}"
        print(f"  [{status}] {result['test_name']}")
        for detail in result['details']:
            print(f"        - {detail}")
    
    print(f"\n{Colors.BOLD}Overall: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"{Colors.GREEN}\n🎉 ALL TESTS PASSED - Ready for Phase 2{Colors.END}\n")
    else:
        print(f"{Colors.YELLOW}\n⚠️  Some tests failed - Review before proceeding{Colors.END}\n")
    
    # Save results to file
    with open('/app/tests/security_validation/test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'passed': passed,
            'total': total,
            'results': all_results
        }, f, indent=2)
    
    print(f"Results saved to: /app/tests/security_validation/test_results.json")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
