#!/usr/bin/env python3
"""
Spot Trading Focused Backend API Test
Tests specifically the trading pairs API and related functionality
"""

import requests
import sys
import json
from datetime import datetime

class SpotTradingTester:
    def __init__(self):
        self.base_url = "https://spottrading-fix.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.results.append(result)
        print(f"{status} - {test_name}: {details}")
        return success

    def test_health_check(self):
        """Test basic health check"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return self.log_result(
                    "Health Check", 
                    True, 
                    f"Status: {data.get('status', 'unknown')}", 
                    data
                )
            else:
                return self.log_result(
                    "Health Check", 
                    False, 
                    f"Status code: {response.status_code}"
                )
        except Exception as e:
            return self.log_result("Health Check", False, f"Error: {str(e)}")

    def test_trading_pairs_api(self):
        """Test the main trading pairs API that the frontend uses"""
        try:
            response = requests.get(f"{self.api_url}/trading/pairs", timeout=10)
            
            print(f"🔍 Testing: GET {self.api_url}/trading/pairs")
            print(f"📡 Response Status: {response.status_code}")
            print(f"📄 Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"📊 Response Data: {json.dumps(data, indent=2)[:500]}...")
                    
                    if data.get('success') and data.get('pairs'):
                        pairs = data['pairs']
                        pair_count = len(pairs)
                        
                        # Check if we have the expected 24+ pairs
                        if pair_count >= 24:
                            return self.log_result(
                                "Trading Pairs API", 
                                True, 
                                f"Found {pair_count} trading pairs", 
                                {"pair_count": pair_count, "sample_pairs": pairs[:3]}
                            )
                        else:
                            return self.log_result(
                                "Trading Pairs API", 
                                False, 
                                f"Only {pair_count} pairs found, expected 24+", 
                                data
                            )
                    else:
                        return self.log_result(
                            "Trading Pairs API", 
                            False, 
                            f"Invalid response format: {data}", 
                            data
                        )
                except json.JSONDecodeError:
                    print(f"📄 Raw Response: {response.text[:500]}...")
                    return self.log_result(
                        "Trading Pairs API", 
                        False, 
                        f"Invalid JSON response", 
                        {"raw_response": response.text[:200]}
                    )
            else:
                print(f"📄 Raw Response: {response.text[:500]}...")
                return self.log_result(
                    "Trading Pairs API", 
                    False, 
                    f"Status code: {response.status_code}", 
                    {"raw_response": response.text[:200]}
                )
        except Exception as e:
            return self.log_result("Trading Pairs API", False, f"Error: {str(e)}")

    def test_user_login(self):
        """Test user login with provided credentials"""
        try:
            login_data = {
                "email": "admin@coinhubx.net",
                "password": "1231123"
            }
            
            print(f"🔍 Testing: POST {self.api_url}/auth/login")
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            print(f"📡 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"📊 Login Response: {json.dumps(data, indent=2)[:300]}...")
                    
                    if data.get('success') and data.get('token'):
                        self.token = data['token']
                        self.user_data = data.get('user', {})
                        return self.log_result(
                            "User Login", 
                            True, 
                            f"Login successful for {login_data['email']}", 
                            {"user_id": self.user_data.get('user_id', 'unknown')}
                        )
                    else:
                        return self.log_result(
                            "User Login", 
                            False, 
                            f"Login failed: {data.get('message', 'Unknown error')}", 
                            data
                        )
                except json.JSONDecodeError:
                    print(f"📄 Raw Response: {response.text[:500]}...")
                    return self.log_result(
                        "User Login", 
                        False, 
                        f"Invalid JSON response", 
                        {"raw_response": response.text[:200]}
                    )
            else:
                print(f"📄 Raw Response: {response.text[:500]}...")
                return self.log_result(
                    "User Login", 
                    False, 
                    f"Status code: {response.status_code}", 
                    {"raw_response": response.text[:200]}
                )
        except Exception as e:
            return self.log_result("User Login", False, f"Error: {str(e)}")

    def test_wallet_balances(self):
        """Test wallet balances API"""
        if not self.user_data or not self.user_data.get('user_id'):
            return self.log_result("Wallet Balances", False, "No user logged in")
        
        try:
            user_id = self.user_data['user_id']
            url = f"{self.api_url}/wallet/balances?user_id={user_id}"
            
            print(f"🔍 Testing: GET {url}")
            response = requests.get(url, timeout=10)
            print(f"📡 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"📊 Balances Response: {json.dumps(data, indent=2)[:300]}...")
                    
                    if data.get('success'):
                        balances = data.get('balances', {})
                        return self.log_result(
                            "Wallet Balances", 
                            True, 
                            f"Retrieved balances for {len(balances)} currencies", 
                            {"balance_count": len(balances)}
                        )
                    else:
                        return self.log_result(
                            "Wallet Balances", 
                            False, 
                            f"API returned error: {data.get('message', 'Unknown error')}", 
                            data
                        )
                except json.JSONDecodeError:
                    print(f"📄 Raw Response: {response.text[:500]}...")
                    return self.log_result(
                        "Wallet Balances", 
                        False, 
                        f"Invalid JSON response", 
                        {"raw_response": response.text[:200]}
                    )
            else:
                print(f"📄 Raw Response: {response.text[:500]}...")
                return self.log_result(
                    "Wallet Balances", 
                    False, 
                    f"Status code: {response.status_code}", 
                    {"raw_response": response.text[:200]}
                )
        except Exception as e:
            return self.log_result("Wallet Balances", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Spot Trading Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        self.test_health_check()
        self.test_trading_pairs_api()
        self.test_user_login()
        
        # Authenticated tests
        if self.token:
            self.test_wallet_balances()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ Backend API is working well!")
        elif success_rate >= 60:
            print("⚠️  Backend API has some issues but core functionality works")
        else:
            print("❌ Backend API has significant issues")
        
        return success_rate >= 60

def main():
    tester = SpotTradingTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/app/test_reports/spot_trading_backend_{timestamp}.json"
    
    with open(report_file, 'w') as f:
        json.dump({
            "timestamp": timestamp,
            "base_url": tester.base_url,
            "tests_run": tester.tests_run,
            "tests_passed": tester.tests_passed,
            "success_rate": f"{(tester.tests_passed / tester.tests_run * 100):.1f}%",
            "results": tester.results
        }, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: {report_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())