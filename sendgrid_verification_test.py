#!/usr/bin/env python3
"""
SendGrid Email Verification Test - COMPREHENSIVE
Test the new SendGrid API key for email verification functionality
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://crypto-wallet-ui-3.preview.emergentagent.com/api"

def test_sendgrid_comprehensive():
    """Comprehensive SendGrid email verification test"""
    print("🎯 SENDGRID EMAIL VERIFICATION - COMPREHENSIVE TEST")
    print("=" * 60)
    
    # Generate timestamp for unique email
    timestamp = int(time.time())
    test_email = f"sendgrid_test_{timestamp}@test.com"
    test_password = "Test123456"
    test_name = "SendGrid Test User"
    
    print(f"📧 Test Email: {test_email}")
    print(f"🔑 New SendGrid API Key: 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")
    print(f"📤 Sender Email: info@coinhubx.net")
    print()
    
    results = {
        "registration": False,
        "verification_email_sent": False,
        "sendgrid_status_202": False,
        "password_reset_working": False,
        "overall_success": False
    }
    
    try:
        # Step 1: Register new user (should trigger verification email)
        print("STEP 1: Registering new user to trigger verification email...")
        register_data = {
            "email": test_email,
            "password": test_password,
            "full_name": test_name
        }
        
        register_response = requests.post(
            f"{BACKEND_URL}/auth/register",
            json=register_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Registration Status: {register_response.status_code}")
        
        if register_response.status_code == 200:
            print("✅ User registration successful")
            results["registration"] = True
            register_result = register_response.json()
            user_id = register_result.get("user", {}).get("user_id")
            print(f"User ID: {user_id}")
            
            # Check if verification email was mentioned in response
            if "verify" in register_result.get("message", "").lower():
                print("✅ Registration response mentions email verification")
                results["verification_email_sent"] = True
        else:
            print("❌ User registration failed")
            print(f"Response: {register_response.text}")
        
        print()
        
        # Step 2: Check backend logs for SendGrid status 202
        print("STEP 2: Checking backend logs for SendGrid status...")
        
        # Wait a moment for logs to be written
        time.sleep(2)
        
        # Check recent logs for our test email
        import subprocess
        try:
            log_result = subprocess.run(
                ["tail", "-n", "20", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True
            )
            
            log_content = log_result.stdout
            print("Recent backend logs:")
            print("-" * 40)
            
            # Look for our test email in logs
            for line in log_content.split('\n'):
                if test_email in line or "status: 202" in line:
                    print(f"📧 {line}")
                    if "status: 202" in line:
                        print("✅ SendGrid returned status 202 (SUCCESS)")
                        results["sendgrid_status_202"] = True
                        results["verification_email_sent"] = True
            
            print("-" * 40)
            
        except Exception as e:
            print(f"Could not check logs: {e}")
        
        print()
        
        # Step 3: Test password reset email (another SendGrid test)
        print("STEP 3: Testing password reset email (additional SendGrid test)...")
        
        reset_data = {
            "email": test_email
        }
        
        reset_response = requests.post(
            f"{BACKEND_URL}/auth/forgot-password",
            json=reset_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Password Reset Status: {reset_response.status_code}")
        
        if reset_response.status_code == 200:
            reset_result = reset_response.json()
            if reset_result.get("success"):
                print("✅ Password reset email endpoint working")
                results["password_reset_working"] = True
            else:
                print("❌ Password reset failed")
                print(f"Response: {reset_response.text}")
        else:
            print("❌ Password reset endpoint failed")
            print(f"Response: {reset_response.text}")
        
        print()
        
        # Step 4: Final verification
        print("STEP 4: Final SendGrid verification...")
        
        # Check logs again for any new entries
        time.sleep(1)
        try:
            log_result = subprocess.run(
                ["tail", "-n", "10", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True
            )
            
            recent_logs = log_result.stdout
            
            # Count successful vs failed emails
            success_count = recent_logs.count("status: 202")
            forbidden_count = recent_logs.count("403: Forbidden")
            
            print(f"Recent SendGrid results:")
            print(f"  ✅ Successful emails (status 202): {success_count}")
            print(f"  ❌ Failed emails (403 Forbidden): {forbidden_count}")
            
            if success_count > 0:
                print("✅ SendGrid API key is working!")
                results["sendgrid_status_202"] = True
            
        except Exception as e:
            print(f"Could not analyze recent logs: {e}")
        
        # Determine overall success
        if results["registration"] and results["sendgrid_status_202"]:
            results["overall_success"] = True
        
        return results
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return results

def main():
    """Main test execution"""
    print("🚀 Starting Comprehensive SendGrid Email Verification Test")
    print(f"⏰ Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    results = test_sendgrid_comprehensive()
    
    print()
    print("=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    print(f"✅ User Registration: {'PASS' if results['registration'] else 'FAIL'}")
    print(f"✅ Verification Email Sent: {'PASS' if results['verification_email_sent'] else 'FAIL'}")
    print(f"✅ SendGrid Status 202: {'PASS' if results['sendgrid_status_202'] else 'FAIL'}")
    print(f"✅ Password Reset Working: {'PASS' if results['password_reset_working'] else 'FAIL'}")
    
    print()
    print("🎯 FINAL VERDICT:")
    if results["overall_success"]:
        print("✅ EMAILS ARE WORKING - SendGrid API key is functional!")
        print("✅ New SendGrid configuration is working correctly")
        print("✅ Status 202 confirmed from SendGrid API")
    else:
        print("❌ STILL BROKEN - SendGrid emails not working properly")
        print("❌ Check API key configuration or SendGrid account status")
    
    print("=" * 60)

if __name__ == "__main__":
    main()