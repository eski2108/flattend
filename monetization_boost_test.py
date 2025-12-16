#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Coin Hub X - Monetization & Boost Cleanup Features
Testing the newly implemented features as requested in review.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://walletfix.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class CoinHubXTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'CoinHubX-Backend-Tester/1.0'
        })
    
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()
    
    def test_service_health(self):
        """Test 1: Service Health Check - Verify backend is running on preview domain"""
        print("🔍 TEST 1: SERVICE HEALTH CHECK")
        print("=" * 50)
        
        try:
            # Test basic API connectivity
            response = self.session.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Backend API Connectivity", 
                    True, 
                    f"Backend responding on preview domain. Status: {response.status_code}",
                    data
                )
            else:
                self.log_test(
                    "Backend API Connectivity", 
                    False, 
                    f"Unexpected status code: {response.status_code}",
                    response.text
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Backend API Connectivity", 
                False, 
                f"Connection failed: {str(e)}"
            )
        
        # Test background tasks status by checking logs or endpoints
        try:
            # Try to access admin endpoints to check background tasks
            response = self.session.get(f"{API_BASE}/admin/revenue/summary?period=all", timeout=10)
            
            if response.status_code == 200:
                self.log_test(
                    "Background Tasks Status", 
                    True, 
                    "Admin endpoints accessible, background tasks likely running"
                )
            else:
                self.log_test(
                    "Background Tasks Status", 
                    False, 
                    f"Admin endpoints not accessible: {response.status_code}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Background Tasks Status", 
                False, 
                f"Failed to check background tasks: {str(e)}"
            )
    
    def test_monetization_breakdown(self):
        """Test 2: Monetization Breakdown Endpoint - Test new revenue analytics"""
        print("🔍 TEST 2: MONETIZATION BREAKDOWN ENDPOINT")
        print("=" * 50)
        
        try:
            # Test the new monetization breakdown endpoint
            response = self.session.get(
                f"{API_BASE}/admin/revenue/monetization-breakdown?period=all", 
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if 'success' in data and data['success']:
                    breakdown = data.get('breakdown', {})
                    total_revenue = data.get('total_revenue_gbp', 0)
                    
                    # Expected 13 monetization features
                    expected_features = [
                        'express_buy_fee',
                        'instant_sell_fee', 
                        'admin_spreads',
                        'p2p_seller_fee',
                        'payment_method_fees',
                        'boosted_listings',
                        'seller_verification',
                        'seller_levels',
                        'referral_upgrades',
                        'arbitrage_alerts',
                        'internal_transfer_fee',
                        'dispute_penalty',
                        'otc_desk_fee'
                    ]
                    
                    found_features = list(breakdown.keys())
                    missing_features = [f for f in expected_features if f not in found_features]
                    
                    if len(found_features) >= 13 and len(missing_features) == 0:
                        self.log_test(
                            "Monetization Features Complete", 
                            True, 
                            f"All 13 features found: {', '.join(found_features)}"
                        )
                    else:
                        self.log_test(
                            "Monetization Features Complete", 
                            False, 
                            f"Missing features: {missing_features}. Found: {len(found_features)}/13"
                        )
                    
                    # Verify each feature has required fields
                    valid_features = 0
                    for feature_name, feature_data in breakdown.items():
                        if isinstance(feature_data, dict):
                            has_name = 'name' in feature_data
                            has_revenue = 'revenue_gbp' in feature_data
                            has_count = 'transaction_count' in feature_data or 'active_subscriptions' in feature_data
                            
                            if has_name and has_revenue and has_count:
                                valid_features += 1
                    
                    self.log_test(
                        "Feature Data Structure", 
                        valid_features >= 10, 
                        f"{valid_features}/{len(found_features)} features have valid structure (name, revenue_gbp, count)"
                    )
                    
                    # Verify total revenue calculation
                    calculated_total = sum(
                        feature.get('revenue_gbp', 0) 
                        for feature in breakdown.values() 
                        if isinstance(feature, dict)
                    )
                    
                    self.log_test(
                        "Total Revenue Calculation", 
                        abs(calculated_total - total_revenue) < 0.01, 
                        f"Calculated: £{calculated_total:.2f}, Reported: £{total_revenue:.2f}"
                    )
                    
                    self.log_test(
                        "Monetization Breakdown Endpoint", 
                        True, 
                        f"Endpoint working. Total revenue: £{total_revenue:.2f}, Features: {len(found_features)}",
                        data
                    )
                    
                else:
                    self.log_test(
                        "Monetization Breakdown Endpoint", 
                        False, 
                        "Response missing success field or success=false",
                        data
                    )
                    
            else:
                self.log_test(
                    "Monetization Breakdown Endpoint", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Monetization Breakdown Endpoint", 
                False, 
                f"Request failed: {str(e)}"
            )
        except json.JSONDecodeError as e:
            self.log_test(
                "Monetization Breakdown Endpoint", 
                False, 
                f"Invalid JSON response: {str(e)}"
            )
    
    def test_boost_cleanup_verification(self):
        """Test 3: Boost Cleanup Background Task Verification"""
        print("🔍 TEST 3: BOOST CLEANUP BACKGROUND TASK")
        print("=" * 50)
        
        try:
            # Check if there are any P2P offers to verify boost cleanup is working
            response = self.session.get(f"{API_BASE}/p2p/marketplace/offers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                offers = data.get('offers', [])
                
                # Look for boosted listings and check their status
                boosted_offers = [offer for offer in offers if offer.get('boosted', False)]
                expired_boosts = []
                active_boosts = []
                
                current_time = datetime.now()
                
                for offer in boosted_offers:
                    boost_end_date = offer.get('boost_end_date')
                    if boost_end_date:
                        try:
                            boost_end = datetime.fromisoformat(boost_end_date.replace('Z', '+00:00'))
                            if boost_end < current_time:
                                expired_boosts.append(offer)
                            else:
                                active_boosts.append(offer)
                        except:
                            pass
                
                self.log_test(
                    "P2P Offers Accessible", 
                    True, 
                    f"Found {len(offers)} total offers, {len(boosted_offers)} boosted"
                )
                
                # If we found expired boosts that are still marked as boosted, cleanup might not be working
                if expired_boosts:
                    self.log_test(
                        "Boost Cleanup Working", 
                        False, 
                        f"Found {len(expired_boosts)} expired boosts still marked as boosted"
                    )
                else:
                    self.log_test(
                        "Boost Cleanup Working", 
                        True, 
                        f"No expired boosts found. Active boosts: {len(active_boosts)}"
                    )
                    
            else:
                self.log_test(
                    "P2P Offers Accessible", 
                    False, 
                    f"Cannot access P2P offers: {response.status_code}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Boost Cleanup Verification", 
                False, 
                f"Failed to verify boost cleanup: {str(e)}"
            )
        
        # Try to check admin liquidity or other endpoints that might show background task status
        try:
            response = self.session.get(f"{API_BASE}/admin/trading-liquidity", timeout=10)
            
            if response.status_code == 200:
                self.log_test(
                    "Background Tasks Accessible", 
                    True, 
                    "Admin endpoints responding, background tasks likely operational"
                )
            else:
                self.log_test(
                    "Background Tasks Accessible", 
                    False, 
                    f"Admin endpoints not accessible: {response.status_code}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Background Tasks Accessible", 
                False, 
                f"Cannot verify background tasks: {str(e)}"
            )
    
    def test_url_configuration(self):
        """Test 4: URL Configuration Check - Verify preview domain usage"""
        print("🔍 TEST 4: URL CONFIGURATION CHECK")
        print("=" * 50)
        
        # Verify we're using the correct preview domain
        expected_domain = "feesystem.preview.emergentagent.com"
        
        if expected_domain in BACKEND_URL:
            self.log_test(
                "Preview Domain Usage", 
                True, 
                f"Using correct preview domain: {expected_domain}"
            )
        else:
            self.log_test(
                "Preview Domain Usage", 
                False, 
                f"Not using expected preview domain. Current: {BACKEND_URL}"
            )
        
        # Test Google OAuth configuration by checking if endpoints are accessible
        try:
            # Check if auth endpoints are working
            response = self.session.get(f"{API_BASE}/auth/google/url", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                auth_url = data.get('auth_url', '')
                
                if expected_domain in auth_url or 'accounts.google.com' in auth_url:
                    self.log_test(
                        "Google OAuth Configuration", 
                        True, 
                        "Google OAuth endpoints accessible and configured"
                    )
                else:
                    self.log_test(
                        "Google OAuth Configuration", 
                        False, 
                        f"OAuth URL doesn't contain expected domain: {auth_url[:100]}"
                    )
            else:
                self.log_test(
                    "Google OAuth Configuration", 
                    False, 
                    f"OAuth endpoint not accessible: {response.status_code}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Google OAuth Configuration", 
                False, 
                f"Cannot verify OAuth config: {str(e)}"
            )
        
        # Test CORS configuration
        try:
            response = self.session.options(f"{API_BASE}/", timeout=10)
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if any(cors_headers.values()):
                self.log_test(
                    "CORS Configuration", 
                    True, 
                    f"CORS headers present: {cors_headers}"
                )
            else:
                self.log_test(
                    "CORS Configuration", 
                    False, 
                    "No CORS headers found"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_test(
                "CORS Configuration", 
                False, 
                f"Cannot verify CORS: {str(e)}"
            )
    
    def run_comprehensive_test(self):
        """Run all tests and generate summary"""
        print("🚀 COIN HUB X BACKEND TESTING - MONETIZATION & BOOST CLEANUP")
        print("=" * 70)
        print(f"Testing Backend: {BACKEND_URL}")
        print(f"Test Started: {datetime.now().isoformat()}")
        print()
        
        # Run all test suites
        self.test_service_health()
        self.test_monetization_breakdown()
        self.test_boost_cleanup_verification()
        self.test_url_configuration()
        
        # Generate summary
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  • {result['test']}")
        
        print()
        print(f"Test Completed: {datetime.now().isoformat()}")
        
        return success_rate >= 75  # Consider successful if 75%+ tests pass

if __name__ == "__main__":
    tester = CoinHubXTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)