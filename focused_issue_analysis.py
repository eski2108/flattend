#!/usr/bin/env python3
"""
FOCUSED ISSUE ANALYSIS FOR COIN HUB X PLATFORM
Analyzes specific issues found during comprehensive testing
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://fund-release-1.preview.emergentagent.com/api"

class FocusedIssueAnalyzer:
    def __init__(self):
        self.session = requests.Session()
        self.issues = []
        
    def log_issue(self, category, issue_type, description, severity="medium"):
        """Log identified issues"""
        self.issues.append({
            "category": category,
            "type": issue_type,
            "description": description,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        })
        print(f"🔍 {severity.upper()}: {category} - {description}")
    
    def analyze_admin_login_issue(self):
        """Analyze admin login 403 error"""
        print("\n=== ANALYZING ADMIN LOGIN ISSUE ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json={
                    "email": "admin@coinhubx.com",
                    "password": "admin123",
                    "admin_code": "CRYPTOLEND_ADMIN_2025"
                },
                timeout=10
            )
            
            if response.status_code == 403:
                self.log_issue(
                    "Admin Authentication",
                    "Access Denied",
                    "Admin login returns 403 Forbidden - admin credentials may be incorrect or admin system not properly configured",
                    "high"
                )
                
                # Try alternative admin credentials
                alt_response = self.session.post(
                    f"{BASE_URL}/admin/login",
                    json={
                        "email": "gads21083@gmail.com",
                        "password": "admin123",
                        "admin_code": "CRYPTOLEND_ADMIN_2025"
                    },
                    timeout=10
                )
                
                if alt_response.status_code == 403:
                    self.log_issue(
                        "Admin Authentication",
                        "System Configuration",
                        "Alternative admin email also fails - admin system may need proper setup",
                        "high"
                    )
                    
        except Exception as e:
            self.log_issue(
                "Admin Authentication",
                "Connection Error",
                f"Admin login request failed: {str(e)}",
                "high"
            )
    
    def analyze_p2p_seller_account_issue(self):
        """Analyze P2P seller account requirement"""
        print("\n=== ANALYZING P2P SELLER ACCOUNT ISSUE ===")
        
        # Register a test user first
        try:
            reg_response = self.session.post(
                f"{BASE_URL}/auth/register",
                json={
                    "email": "p2p_analysis@test.com",
                    "password": "Test123456",
                    "full_name": "P2P Analysis User"
                },
                timeout=10
            )
            
            if reg_response.status_code == 200:
                user_data = reg_response.json()
                user_id = user_data.get("user", {}).get("user_id")
                
                if user_id:
                    # Try to create P2P ad without seller activation
                    p2p_response = self.session.post(
                        f"{BASE_URL}/p2p/create-ad",
                        json={
                            "user_id": user_id,
                            "ad_type": "sell",
                            "crypto_currency": "BTC",
                            "fiat_currency": "GBP",
                            "price_type": "fixed",
                            "price_value": 48000.0,
                            "min_amount": 0.1,
                            "max_amount": 1.0,
                            "available_amount": 1.0,
                            "payment_methods": ["bank_transfer"],
                            "terms": "Test terms"
                        },
                        timeout=10
                    )
                    
                    if p2p_response.status_code == 403:
                        self.log_issue(
                            "P2P Trading",
                            "Seller Account Required",
                            "Users must activate seller account before creating P2P ads - missing seller activation flow",
                            "medium"
                        )
                        
                        # Check if seller activation endpoint exists
                        activation_response = self.session.post(
                            f"{BASE_URL}/p2p/activate-seller",
                            json={"user_id": user_id},
                            timeout=10
                        )
                        
                        if activation_response.status_code == 200:
                            self.log_issue(
                                "P2P Trading",
                                "Solution Available",
                                "Seller activation endpoint exists - users need to activate seller account first",
                                "low"
                            )
                        else:
                            self.log_issue(
                                "P2P Trading",
                                "Missing Endpoint",
                                "Seller activation endpoint may not be properly implemented",
                                "medium"
                            )
                            
        except Exception as e:
            self.log_issue(
                "P2P Trading",
                "Analysis Error",
                f"P2P seller analysis failed: {str(e)}",
                "medium"
            )
    
    def analyze_missing_endpoints(self):
        """Analyze missing endpoints that returned 404"""
        print("\n=== ANALYZING MISSING ENDPOINTS ===")
        
        missing_endpoints = [
            ("/api/express/liquidity", "Express Buy Liquidity Check"),
            ("/api/express/buy", "Express Buy Execute"),
            ("/api/admin/liquidity", "Admin Liquidity Management"),
            ("/api/referral/earnings/{user_id}", "Referral Earnings"),
            ("/api/referral/discount/{user_id}", "Referral Discount"),
            ("/api/admin/wallet-balance", "Admin Wallet Balance")
        ]
        
        for endpoint, description in missing_endpoints:
            try:
                test_endpoint = endpoint.replace("{user_id}", "test-user-id")
                response = self.session.get(f"{BASE_URL.replace('/api', '')}{endpoint.replace('{user_id}', 'test-user-id')}", timeout=5)
                
                if response.status_code == 404:
                    self.log_issue(
                        "Missing Features",
                        "Endpoint Not Found",
                        f"{description} endpoint not implemented: {endpoint}",
                        "medium"
                    )
                    
            except Exception:
                pass  # Skip connection errors for this analysis
    
    def analyze_swap_convert_issues(self):
        """Analyze swap/convert functionality issues"""
        print("\n=== ANALYZING SWAP/CONVERT ISSUES ===")
        
        try:
            # Test swap preview with valid data
            response = self.session.post(
                f"{BASE_URL}/swap/preview",
                json={
                    "user_id": "test-user-id",
                    "from_currency": "BTC",
                    "to_currency": "ETH",
                    "amount": 0.1
                },
                timeout=10
            )
            
            if response.status_code == 400:
                error_data = response.json()
                self.log_issue(
                    "Swap/Convert",
                    "Validation Error",
                    f"Swap preview validation issue: {error_data.get('detail', 'Unknown error')}",
                    "medium"
                )
                
        except Exception as e:
            self.log_issue(
                "Swap/Convert",
                "Analysis Error",
                f"Swap analysis failed: {str(e)}",
                "medium"
            )
    
    def analyze_email_verification_issue(self):
        """Analyze email verification 405 error"""
        print("\n=== ANALYZING EMAIL VERIFICATION ISSUE ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/verify-email",
                json={
                    "email": "test@example.com",
                    "verification_code": "123456"
                },
                timeout=10
            )
            
            if response.status_code == 405:
                self.log_issue(
                    "Email Verification",
                    "Method Not Allowed",
                    "Email verification endpoint exists but POST method not allowed - may need GET method or different implementation",
                    "medium"
                )
                
                # Try GET method
                get_response = self.session.get(
                    f"{BASE_URL}/auth/verify-email?email=test@example.com&code=123456",
                    timeout=10
                )
                
                if get_response.status_code != 405:
                    self.log_issue(
                        "Email Verification",
                        "Method Issue",
                        "Email verification may require GET method instead of POST",
                        "low"
                    )
                    
        except Exception as e:
            self.log_issue(
                "Email Verification",
                "Analysis Error",
                f"Email verification analysis failed: {str(e)}",
                "medium"
            )
    
    def check_working_features(self):
        """Check what features are actually working well"""
        print("\n=== CHECKING WORKING FEATURES ===")
        
        working_features = []
        
        # Test crypto prices API
        try:
            response = self.session.get(f"{BASE_URL}/crypto/prices", timeout=10)
            if response.status_code == 200:
                working_features.append("Live Crypto Prices API")
        except:
            pass
        
        # Test user registration
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json={
                    "email": f"working_test_{int(datetime.now().timestamp())}@test.com",
                    "password": "Test123456",
                    "full_name": "Working Test User"
                },
                timeout=10
            )
            if response.status_code == 200:
                working_features.append("User Registration")
        except:
            pass
        
        # Test password reset
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/forgot-password",
                json={"email": "test@example.com"},
                timeout=10
            )
            if response.status_code == 200:
                working_features.append("Password Reset")
        except:
            pass
        
        # Test P2P ads listing
        try:
            response = self.session.get(f"{BASE_URL}/p2p/ads", timeout=10)
            if response.status_code == 200:
                working_features.append("P2P Ads Listing")
        except:
            pass
        
        # Test platform earnings
        try:
            response = self.session.get(f"{BASE_URL}/admin/platform-earnings", timeout=10)
            if response.status_code == 200:
                working_features.append("Platform Earnings Tracking")
        except:
            pass
        
        print(f"✅ WORKING FEATURES ({len(working_features)}):")
        for feature in working_features:
            print(f"   • {feature}")
        
        return working_features
    
    def run_analysis(self):
        """Run complete focused analysis"""
        print("🔍 STARTING FOCUSED ISSUE ANALYSIS FOR COIN HUB X PLATFORM")
        print("=" * 70)
        
        # Run all analyses
        self.analyze_admin_login_issue()
        self.analyze_p2p_seller_account_issue()
        self.analyze_missing_endpoints()
        self.analyze_swap_convert_issues()
        self.analyze_email_verification_issue()
        
        # Check working features
        working_features = self.check_working_features()
        
        # Summarize findings
        print("\n" + "=" * 70)
        print("📋 ISSUE ANALYSIS SUMMARY")
        print("=" * 70)
        
        high_issues = [i for i in self.issues if i["severity"] == "high"]
        medium_issues = [i for i in self.issues if i["severity"] == "medium"]
        low_issues = [i for i in self.issues if i["severity"] == "low"]
        
        print(f"🔴 HIGH PRIORITY ISSUES ({len(high_issues)}):")
        for issue in high_issues:
            print(f"   • {issue['category']}: {issue['description']}")
        
        print(f"\n🟡 MEDIUM PRIORITY ISSUES ({len(medium_issues)}):")
        for issue in medium_issues:
            print(f"   • {issue['category']}: {issue['description']}")
        
        if low_issues:
            print(f"\n🟢 LOW PRIORITY ISSUES ({len(low_issues)}):")
            for issue in low_issues:
                print(f"   • {issue['category']}: {issue['description']}")
        
        print(f"\n✅ WORKING FEATURES: {len(working_features)} confirmed working")
        
        # Recommendations
        print("\n🎯 RECOMMENDATIONS:")
        print("1. Fix admin login credentials or admin system configuration")
        print("2. Implement missing endpoints for Express Buy and Referral features")
        print("3. Add seller account activation flow for P2P trading")
        print("4. Fix email verification endpoint method handling")
        print("5. Implement swap/convert validation and processing")
        
        return len(high_issues), len(medium_issues), len(working_features)

def main():
    analyzer = FocusedIssueAnalyzer()
    high_issues, medium_issues, working_features = analyzer.run_analysis()
    
    print(f"\n📊 ANALYSIS COMPLETE:")
    print(f"   High Priority Issues: {high_issues}")
    print(f"   Medium Priority Issues: {medium_issues}")
    print(f"   Working Features: {working_features}")
    
    if high_issues == 0 and medium_issues <= 3:
        print("✅ Platform is in good condition with minor issues")
        return 0
    elif high_issues <= 2 and medium_issues <= 8:
        print("⚠️  Platform has some issues but is mostly functional")
        return 1
    else:
        print("❌ Platform has significant issues requiring attention")
        return 2

if __name__ == "__main__":
    exit(main())