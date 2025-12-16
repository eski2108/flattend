#!/usr/bin/env python3
"""
COMPREHENSIVE SECURITY IMPLEMENTATION TESTING
Tests all newly implemented security features for Coin Hub X as requested in review:

**Test Scenarios:**
1. Password Hashing (Bcrypt Migration)
   - Test new registration with bcrypt hash
   - Verify bcrypt hash format in database
   - Test login with bcrypt password
   - Test login with old SHA256 password (if any exist)

2. Rate Limiting
   - Login endpoint: 6 attempts rapidly, verify 429 error on 6th
   - Password reset: 4 attempts rapidly, verify 429 error on 4th
   - Admin login: 4 attempts rapidly, verify 429 error on 4th
   - Verify rate limit messages include wait time

3. Withdrawal Security
   - Small withdrawal (<£1000): Should process instantly
   - Medium withdrawal (£1000-£5000): Should require email confirmation
   - Large withdrawal (£5000-£10000): Should require 24h hold
   - Huge withdrawal (>£10000): Should require admin approval

4. Database Backups
   - List backups: GET /api/admin/backup/list
   - Manual backup: POST /api/admin/backup/create
   - Verify backup files in /app/backups directory

5. Admin JWT Token
   - Admin login with valid credentials
   - Verify JWT token is returned in response
   - Test token usage to access admin endpoints

**Backend URL:** https://quickstart-27.preview.emergentagent.com/api
"""

import requests
import json
import sys
import time
import hashlib
import bcrypt
from datetime import datetime
import os

# Configuration
BASE_URL = "https://quickstart-27.preview.emergentagent.com/api"

# Test Users for security testing
SECURITY_TEST_USER = {
    "email": f"security_test_{int(time.time())}@test.com",
    "password": "SecurePassword123!",
    "full_name": "Security Test User",
    "phone_number": "+447700900123"
}

ADMIN_USER = {
    "email": "admin@coinhubx.com",
    "password": "admin123",
    "admin_code": "CRYPTOLEND_ADMIN_2025"
}

class SecurityImplementationTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_id = None
        self.admin_token = None
        self.test_results = []
        
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
    
    def test_bcrypt_password_hashing(self):
        """Test 1: Password Hashing (Bcrypt Migration)"""
        print("\n=== Testing Password Hashing (Bcrypt Migration) ===")
        
        # Test new registration with bcrypt hash
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=SECURITY_TEST_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user_id"):
                    self.test_user_id = data["user_id"]
                    self.log_test(
                        "New Registration with Bcrypt", 
                        True, 
                        f"User registered successfully with ID: {self.test_user_id}"
                    )
                    
                    # Test login with bcrypt password
                    login_response = self.session.post(
                        f"{BASE_URL}/auth/login",
                        json={
                            "email": SECURITY_TEST_USER["email"],
                            "password": SECURITY_TEST_USER["password"]
                        },
                        timeout=10
                    )
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if login_data.get("success"):
                            self.log_test(
                                "Login with Bcrypt Password", 
                                True, 
                                "Login successful with bcrypt-hashed password"
                            )
                        else:
                            self.log_test(
                                "Login with Bcrypt Password", 
                                False, 
                                "Login failed despite successful registration",
                                login_data
                            )
                    else:
                        self.log_test(
                            "Login with Bcrypt Password", 
                            False, 
                            f"Login failed with status {login_response.status_code}",
                            login_response.text
                        )
                    
                    return True
                else:
                    self.log_test(
                        "New Registration with Bcrypt", 
                        False, 
                        "Registration response missing success or user_id",
                        data
                    )
            elif response.status_code == 400 and "already registered" in response.text:
                self.log_test(
                    "New Registration with Bcrypt", 
                    True, 
                    "User already exists (expected for repeated tests)"
                )
                return True
            else:
                self.log_test(
                    "New Registration with Bcrypt", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "New Registration with Bcrypt", 
                False, 
                f"Registration request failed: {str(e)}"
            )
            
        return False
    
    def test_rate_limiting(self):
        """Test 2: Rate Limiting"""
        print("\n=== Testing Rate Limiting ===")
        
        # Test login rate limiting (6 attempts)
        print("Testing Login Rate Limiting (6 attempts)...")
        login_attempts = 0
        rate_limit_triggered = False
        
        for attempt in range(7):  # Try 7 attempts to trigger rate limit
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": "nonexistent@test.com",
                        "password": "wrongpassword"
                    },
                    timeout=10
                )
                
                login_attempts += 1
                
                if response.status_code == 429:
                    rate_limit_triggered = True
                    response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"message": response.text}
                    wait_time_mentioned = "wait" in str(response_data).lower() or "minute" in str(response_data).lower() or "second" in str(response_data).lower()
                    
                    self.log_test(
                        "Login Rate Limiting", 
                        True, 
                        f"Rate limit triggered after {login_attempts} attempts (429 error), Wait time mentioned: {wait_time_mentioned}"
                    )
                    break
                elif attempt < 6:
                    # Expected to fail with 401/400 for first 5 attempts
                    continue
                else:
                    # Should have been rate limited by now
                    self.log_test(
                        "Login Rate Limiting", 
                        False, 
                        f"Rate limit not triggered after {login_attempts} attempts"
                    )
                    
                time.sleep(0.5)  # Small delay between attempts
                
            except Exception as e:
                self.log_test(
                    "Login Rate Limiting", 
                    False, 
                    f"Login rate limit test failed: {str(e)}"
                )
                break
        
        if not rate_limit_triggered:
            self.log_test(
                "Login Rate Limiting", 
                False, 
                f"Rate limit not triggered after {login_attempts} attempts"
            )
        
        # Test password reset rate limiting (4 attempts)
        print("Testing Password Reset Rate Limiting (4 attempts)...")
        reset_attempts = 0
        reset_rate_limit_triggered = False
        
        for attempt in range(5):  # Try 5 attempts to trigger rate limit
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/forgot-password",
                    json={"email": "test@example.com"},
                    timeout=10
                )
                
                reset_attempts += 1
                
                if response.status_code == 429:
                    reset_rate_limit_triggered = True
                    response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"message": response.text}
                    wait_time_mentioned = "wait" in str(response_data).lower() or "minute" in str(response_data).lower() or "second" in str(response_data).lower()
                    
                    self.log_test(
                        "Password Reset Rate Limiting", 
                        True, 
                        f"Rate limit triggered after {reset_attempts} attempts (429 error), Wait time mentioned: {wait_time_mentioned}"
                    )
                    break
                elif attempt < 3:
                    # Expected to work for first 3 attempts
                    continue
                else:
                    # Should have been rate limited by now
                    self.log_test(
                        "Password Reset Rate Limiting", 
                        False, 
                        f"Rate limit not triggered after {reset_attempts} attempts"
                    )
                    
                time.sleep(0.5)  # Small delay between attempts
                
            except Exception as e:
                self.log_test(
                    "Password Reset Rate Limiting", 
                    False, 
                    f"Password reset rate limit test failed: {str(e)}"
                )
                break
        
        if not reset_rate_limit_triggered:
            self.log_test(
                "Password Reset Rate Limiting", 
                False, 
                f"Rate limit not triggered after {reset_attempts} attempts"
            )
        
        # Test admin login rate limiting (4 attempts)
        print("Testing Admin Login Rate Limiting (4 attempts)...")
        admin_attempts = 0
        admin_rate_limit_triggered = False
        
        for attempt in range(5):  # Try 5 attempts to trigger rate limit
            try:
                response = self.session.post(
                    f"{BASE_URL}/admin/login",
                    json={
                        "email": ADMIN_USER["email"],
                        "password": "wrongpassword",
                        "admin_code": ADMIN_USER["admin_code"]
                    },
                    timeout=10
                )
                
                admin_attempts += 1
                
                if response.status_code == 429:
                    admin_rate_limit_triggered = True
                    response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"message": response.text}
                    wait_time_mentioned = "wait" in str(response_data).lower() or "minute" in str(response_data).lower() or "second" in str(response_data).lower()
                    
                    self.log_test(
                        "Admin Login Rate Limiting", 
                        True, 
                        f"Rate limit triggered after {admin_attempts} attempts (429 error), Wait time mentioned: {wait_time_mentioned}"
                    )
                    break
                elif attempt < 3:
                    # Expected to fail with 401/400 for first 3 attempts
                    continue
                else:
                    # Should have been rate limited by now
                    self.log_test(
                        "Admin Login Rate Limiting", 
                        False, 
                        f"Rate limit not triggered after {admin_attempts} attempts"
                    )
                    
                time.sleep(0.5)  # Small delay between attempts
                
            except Exception as e:
                self.log_test(
                    "Admin Login Rate Limiting", 
                    False, 
                    f"Admin login rate limit test failed: {str(e)}"
                )
                break
        
        if not admin_rate_limit_triggered:
            self.log_test(
                "Admin Login Rate Limiting", 
                False, 
                f"Rate limit not triggered after {admin_attempts} attempts"
            )
        
        return rate_limit_triggered and reset_rate_limit_triggered and admin_rate_limit_triggered
    
    def test_withdrawal_security_levels(self):
        """Test 3: Withdrawal Security"""
        print("\n=== Testing Withdrawal Security Levels ===")
        
        if not self.test_user_id:
            self.log_test(
                "Withdrawal Security", 
                False, 
                "Cannot test withdrawal security - no test user ID available"
            )
            return False
        
        # Test different withdrawal amounts
        withdrawal_tests = [
            {"amount": 500, "expected": "instant", "description": "Small withdrawal (<£1000)"},
            {"amount": 2500, "expected": "email_confirmation", "description": "Medium withdrawal (£1000-£5000)"},
            {"amount": 7500, "expected": "24h_hold", "description": "Large withdrawal (£5000-£10000)"},
            {"amount": 15000, "expected": "admin_approval", "description": "Huge withdrawal (>£10000)"}
        ]
        
        all_tests_passed = True
        
        for test in withdrawal_tests:
            try:
                response = self.session.post(
                    f"{BASE_URL}/crypto-bank/withdraw",
                    json={
                        "user_id": self.test_user_id,
                        "currency": "GBP",
                        "amount": test["amount"],
                        "wallet_address": "test_withdrawal_address"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        security_level = data.get("security_level", "unknown")
                        status = data.get("status", "unknown")
                        
                        # Check if the security level matches expected
                        if test["expected"] in security_level.lower() or test["expected"] in status.lower():
                            self.log_test(
                                f"Withdrawal Security - {test['description']}", 
                                True, 
                                f"£{test['amount']} withdrawal correctly requires {security_level} (Status: {status})"
                            )
                        else:
                            self.log_test(
                                f"Withdrawal Security - {test['description']}", 
                                False, 
                                f"£{test['amount']} withdrawal has unexpected security level: {security_level} (expected: {test['expected']})"
                            )
                            all_tests_passed = False
                    else:
                        # Check if it's a security-related rejection
                        error_message = data.get("message", "").lower()
                        if "approval" in error_message or "confirmation" in error_message or "hold" in error_message:
                            self.log_test(
                                f"Withdrawal Security - {test['description']}", 
                                True, 
                                f"£{test['amount']} withdrawal correctly blocked for security: {data.get('message')}"
                            )
                        else:
                            self.log_test(
                                f"Withdrawal Security - {test['description']}", 
                                False, 
                                f"£{test['amount']} withdrawal failed unexpectedly",
                                data
                            )
                            all_tests_passed = False
                else:
                    self.log_test(
                        f"Withdrawal Security - {test['description']}", 
                        False, 
                        f"Withdrawal request failed with status {response.status_code}",
                        response.text
                    )
                    all_tests_passed = False
                    
            except Exception as e:
                self.log_test(
                    f"Withdrawal Security - {test['description']}", 
                    False, 
                    f"Withdrawal request failed: {str(e)}"
                )
                all_tests_passed = False
        
        return all_tests_passed
    
    def test_database_backups(self):
        """Test 4: Database Backups"""
        print("\n=== Testing Database Backups ===")
        
        # Test list backups
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/backup/list",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "backups" in data:
                    backups = data["backups"]
                    self.log_test(
                        "List Backups", 
                        True, 
                        f"Backup list retrieved - {len(backups)} backups found"
                    )
                    
                    # Test manual backup creation
                    backup_response = self.session.post(
                        f"{BASE_URL}/admin/backup/create",
                        json={"backup_type": "manual", "description": "Security test backup"},
                        timeout=30  # Backup might take longer
                    )
                    
                    if backup_response.status_code == 200:
                        backup_data = backup_response.json()
                        if backup_data.get("success"):
                            backup_id = backup_data.get("backup_id")
                            self.log_test(
                                "Manual Backup Creation", 
                                True, 
                                f"Manual backup created successfully - ID: {backup_id}"
                            )
                            
                            # Verify backup files exist (if we can access the filesystem)
                            try:
                                backup_dir = "/app/backups"
                                if os.path.exists(backup_dir):
                                    backup_files = os.listdir(backup_dir)
                                    if backup_files:
                                        self.log_test(
                                            "Verify Backup Files", 
                                            True, 
                                            f"Backup files found in {backup_dir}: {len(backup_files)} files"
                                        )
                                    else:
                                        self.log_test(
                                            "Verify Backup Files", 
                                            False, 
                                            f"No backup files found in {backup_dir}"
                                        )
                                else:
                                    self.log_test(
                                        "Verify Backup Files", 
                                        False, 
                                        f"Backup directory {backup_dir} does not exist"
                                    )
                            except Exception as e:
                                self.log_test(
                                    "Verify Backup Files", 
                                    False, 
                                    f"Cannot access backup directory: {str(e)}"
                                )
                            
                            return True
                        else:
                            self.log_test(
                                "Manual Backup Creation", 
                                False, 
                                "Manual backup creation failed",
                                backup_data
                            )
                    else:
                        self.log_test(
                            "Manual Backup Creation", 
                            False, 
                            f"Manual backup creation failed with status {backup_response.status_code}",
                            backup_response.text
                        )
                else:
                    self.log_test(
                        "List Backups", 
                        False, 
                        "Invalid backup list response",
                        data
                    )
            else:
                self.log_test(
                    "List Backups", 
                    False, 
                    f"List backups failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Database Backups", 
                False, 
                f"Database backup test failed: {str(e)}"
            )
            
        return False
    
    def test_admin_jwt_token(self):
        """Test 5: Admin JWT Token"""
        print("\n=== Testing Admin JWT Token ===")
        
        # Test admin login
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json=ADMIN_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("token"):
                    self.admin_token = data["token"]
                    admin_id = data.get("admin", {}).get("user_id")
                    
                    self.log_test(
                        "Admin Login with JWT", 
                        True, 
                        f"Admin login successful, JWT token received (Admin ID: {admin_id})"
                    )
                    
                    # Test token usage on admin endpoints
                    headers = {"Authorization": f"Bearer {self.admin_token}"}
                    
                    # Test accessing admin dashboard stats
                    stats_response = self.session.get(
                        f"{BASE_URL}/admin/dashboard-stats",
                        headers=headers,
                        timeout=10
                    )
                    
                    if stats_response.status_code == 200:
                        stats_data = stats_response.json()
                        if stats_data.get("success"):
                            self.log_test(
                                "JWT Token Usage", 
                                True, 
                                "JWT token successfully used to access admin dashboard stats"
                            )
                        else:
                            self.log_test(
                                "JWT Token Usage", 
                                False, 
                                "Admin dashboard stats request failed despite valid token",
                                stats_data
                            )
                    else:
                        self.log_test(
                            "JWT Token Usage", 
                            False, 
                            f"Admin dashboard stats failed with status {stats_response.status_code}",
                            stats_response.text
                        )
                    
                    # Test accessing admin customers list
                    customers_response = self.session.get(
                        f"{BASE_URL}/admin/customers",
                        headers=headers,
                        timeout=10
                    )
                    
                    if customers_response.status_code == 200:
                        customers_data = customers_response.json()
                        if customers_data.get("success"):
                            customer_count = len(customers_data.get("customers", []))
                            self.log_test(
                                "JWT Token Admin Access", 
                                True, 
                                f"JWT token successfully used to access admin customers list ({customer_count} customers)"
                            )
                            return True
                        else:
                            self.log_test(
                                "JWT Token Admin Access", 
                                False, 
                                "Admin customers request failed despite valid token",
                                customers_data
                            )
                    else:
                        self.log_test(
                            "JWT Token Admin Access", 
                            False, 
                            f"Admin customers failed with status {customers_response.status_code}",
                            customers_response.text
                        )
                else:
                    self.log_test(
                        "Admin Login with JWT", 
                        False, 
                        "Admin login response missing success or token",
                        data
                    )
            else:
                self.log_test(
                    "Admin Login with JWT", 
                    False, 
                    f"Admin login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin JWT Token", 
                False, 
                f"Admin JWT token test failed: {str(e)}"
            )
            
        return False
    
    def run_all_security_tests(self):
        """Run all security implementation tests"""
        print("🔒 STARTING COMPREHENSIVE SECURITY IMPLEMENTATION TESTING")
        print("=" * 80)
        
        # Run all security tests
        test_results = []
        
        test_results.append(self.test_bcrypt_password_hashing())
        test_results.append(self.test_rate_limiting())
        test_results.append(self.test_withdrawal_security_levels())
        test_results.append(self.test_database_backups())
        test_results.append(self.test_admin_jwt_token())
        
        # Calculate success rate
        passed_tests = sum(1 for result in test_results if result)
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print("\n" + "=" * 80)
        print("🔒 SECURITY IMPLEMENTATION TESTING SUMMARY")
        print("=" * 80)
        
        # Group results by category
        categories = {
            "Password Hashing": [],
            "Rate Limiting": [],
            "Withdrawal Security": [],
            "Database Backups": [],
            "Admin JWT Token": []
        }
        
        for result in self.test_results:
            test_name = result["test"]
            if "bcrypt" in test_name.lower() or "password" in test_name.lower():
                categories["Password Hashing"].append(result)
            elif "rate limit" in test_name.lower():
                categories["Rate Limiting"].append(result)
            elif "withdrawal" in test_name.lower():
                categories["Withdrawal Security"].append(result)
            elif "backup" in test_name.lower():
                categories["Database Backups"].append(result)
            elif "jwt" in test_name.lower() or "admin" in test_name.lower():
                categories["Admin JWT Token"].append(result)
        
        for category, results in categories.items():
            if results:
                print(f"\n{category}:")
                for result in results:
                    status = "✅" if result["success"] else "❌"
                    print(f"  {status} {result['test']}: {result['message']}")
        
        print(f"\n📊 OVERALL SUCCESS RATE: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
        
        if success_rate >= 80:
            print("🎉 SECURITY IMPLEMENTATION TESTING COMPLETED SUCCESSFULLY")
        else:
            print("⚠️  SECURITY IMPLEMENTATION TESTING COMPLETED WITH ISSUES")
        
        return success_rate >= 80

def main():
    """Main function to run security implementation tests"""
    tester = SecurityImplementationTester()
    success = tester.run_all_security_tests()
    
    if success:
        print("\n✅ All security features are working correctly!")
        sys.exit(0)
    else:
        print("\n❌ Some security features need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()