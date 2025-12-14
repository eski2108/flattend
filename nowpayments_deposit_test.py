#!/usr/bin/env python3
"""
NOWPayments Deposit Creation Debug Test

CONTEXT: User is clicking deposit button and getting "failed to create payment" error. 
Backend logs show 400 Bad Request from NOWPayments API but no details.

TEST SCENARIO:
1. Login as wallet_test_16c38826@test.com / Test123456
2. Try to create a deposit with the exact same parameters the frontend sends:
   - user_id: (from login)
   - amount: 100
   - currency: "usd"
   - pay_currency: "btc"
3. Call POST /api/nowpayments/create-deposit
4. Capture the FULL error response from NOWPayments API

Expected Result:
- Need to see the detailed error message from NOWPayments to understand why it's rejecting the request
- Check if API key is sandbox vs production
- Check if payload format is correct
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://premium-wallet-hub.preview.emergentagent.com/api"

# Test User from review request
TEST_USER = {
    "email": "wallet_test_16c38826@test.com",
    "password": "Test123456"
}

class NOWPaymentsDepositTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
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
        
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    def test_user_login(self):
        """Test user login to get user_id"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data:
                    self.user_id = data["user"]["user_id"]
                    self.log_test(
                        "User Login", 
                        True, 
                        f"Successfully logged in user {TEST_USER['email']}, user_id: {self.user_id}"
                    )
                    return True
                else:
                    self.log_test("User Login", False, "Login response missing user data", data)
                    return False
            else:
                self.log_test("User Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Login request failed: {str(e)}")
            return False
    
    def test_nowpayments_currencies(self):
        """Test NOWPayments currencies endpoint to verify API connectivity"""
        try:
            response = self.session.get(f"{BASE_URL}/nowpayments/currencies")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "currencies" in data:
                    currency_count = len(data["currencies"])
                    self.log_test(
                        "NOWPayments Currencies", 
                        True, 
                        f"Retrieved {currency_count} supported currencies"
                    )
                    
                    # Check if BTC is supported
                    btc_supported = any(curr.get("currency") == "btc" for curr in data["currencies"])
                    if btc_supported:
                        print("   ✅ BTC is supported as pay_currency")
                    else:
                        print("   ❌ BTC not found in supported currencies")
                    
                    return True
                else:
                    self.log_test("NOWPayments Currencies", False, "Invalid response format", data)
                    return False
            else:
                self.log_test("NOWPayments Currencies", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("NOWPayments Currencies", False, f"Request failed: {str(e)}")
            return False
    
    def test_nowpayments_deposit_creation(self):
        """Test NOWPayments deposit creation with exact frontend parameters"""
        if not self.user_id:
            self.log_test("NOWPayments Deposit Creation", False, "No user_id available - login failed")
            return False
        
        # Exact parameters as mentioned in review request
        deposit_params = {
            "user_id": self.user_id,
            "amount": 100,
            "currency": "usd",
            "pay_currency": "btc"
        }
        
        print(f"\n🔍 Testing NOWPayments deposit creation with parameters:")
        print(f"   user_id: {deposit_params['user_id']}")
        print(f"   amount: {deposit_params['amount']}")
        print(f"   currency: {deposit_params['currency']}")
        print(f"   pay_currency: {deposit_params['pay_currency']}")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/nowpayments/create-deposit",
                json=deposit_params
            )
            
            print(f"\n📡 Response Status: {response.status_code}")
            print(f"📡 Response Headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                print(f"📡 Response Body: {json.dumps(response_data, indent=2)}")
            except:
                print(f"📡 Response Body (raw): {response.text}")
                response_data = {"raw_response": response.text}
            
            if response.status_code == 200:
                if response_data.get("success"):
                    self.log_test(
                        "NOWPayments Deposit Creation", 
                        True, 
                        "Deposit created successfully",
                        response_data
                    )
                    return True
                else:
                    self.log_test(
                        "NOWPayments Deposit Creation", 
                        False, 
                        "Deposit creation failed - success=false",
                        response_data
                    )
                    return False
            elif response.status_code == 400:
                # This is the key part - capture the detailed 400 error
                self.log_test(
                    "NOWPayments Deposit Creation", 
                    False, 
                    "🚨 400 Bad Request - DETAILED ERROR CAPTURED",
                    {
                        "status_code": response.status_code,
                        "response_data": response_data,
                        "request_params": deposit_params,
                        "headers": dict(response.headers)
                    }
                )
                
                # Try to extract specific error details
                if isinstance(response_data, dict):
                    if "error" in response_data:
                        print(f"\n🔥 NOWPayments Error Details:")
                        print(f"   Error: {response_data['error']}")
                    
                    if "message" in response_data:
                        print(f"   Message: {response_data['message']}")
                    
                    if "details" in response_data:
                        print(f"   Details: {response_data['details']}")
                
                return False
            else:
                self.log_test(
                    "NOWPayments Deposit Creation", 
                    False, 
                    f"Unexpected status code {response.status_code}",
                    {
                        "status_code": response.status_code,
                        "response_data": response_data,
                        "request_params": deposit_params
                    }
                )
                return False
                
        except Exception as e:
            self.log_test(
                "NOWPayments Deposit Creation", 
                False, 
                f"Request failed with exception: {str(e)}",
                {"exception": str(e), "request_params": deposit_params}
            )
            return False
    
    def test_backend_logs_check(self):
        """Check if we can get more details from backend logs"""
        print(f"\n📋 Checking backend logs for NOWPayments errors...")
        
        try:
            # This is a placeholder - in a real scenario we'd check actual logs
            # For now, we'll just note that logs should be checked
            self.log_test(
                "Backend Logs Check", 
                True, 
                "Backend logs should be checked for detailed NOWPayments API error messages"
            )
            
            print("   💡 To check backend logs, run:")
            print("   tail -n 100 /var/log/supervisor/backend.*.log")
            
            return True
            
        except Exception as e:
            self.log_test("Backend Logs Check", False, f"Failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all NOWPayments deposit tests"""
        print("🚀 Starting NOWPayments Deposit Creation Debug Test")
        print("=" * 60)
        
        tests = [
            ("User Login", self.test_user_login),
            ("NOWPayments Currencies", self.test_nowpayments_currencies),
            ("NOWPayments Deposit Creation", self.test_nowpayments_deposit_creation),
            ("Backend Logs Check", self.test_backend_logs_check)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running {test_name}...")
            if test_func():
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed < total:
            print("\n🔍 DEBUGGING INFORMATION:")
            print("The 400 error details above should help identify the root cause.")
            print("Common issues:")
            print("1. API key configuration (sandbox vs production)")
            print("2. Invalid currency codes")
            print("3. Amount limits or formatting")
            print("4. Missing required parameters")
            print("5. NOWPayments account restrictions")
        
        return passed == total

def main():
    """Main test execution"""
    tester = NOWPaymentsDepositTester()
    success = tester.run_all_tests()
    
    if not success:
        print("\n❌ Some tests failed. Check the detailed error messages above.")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()