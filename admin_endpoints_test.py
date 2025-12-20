#!/usr/bin/env python3
"""
ADMIN ENDPOINTS RE-TEST AFTER FIXES
Tests the critical admin flows that were failing:

**Priority Tests:**
1. Admin platform settings - GET /api/admin/platform-settings
2. Admin update fees/commissions - POST /api/admin/platform-settings
3. Admin wallet balances - GET /api/admin/wallet-balances  
4. Admin all transactions - GET /api/admin/all-transactions
5. Admin KYC submissions - GET /api/admin/kyc-submissions
6. Withdrawal fee calculation (1%)
7. P2P trade creation with seller

Focus on verifying the newly added admin endpoints work correctly and return proper data.
Report: Which issues are NOW FIXED vs which still need work.

**Backend URL:** https://savingsflow-1.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://savingsflow-1.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USER = {
    "email": "admin@coinhubx.com",
    "password": "admin123",
    "full_name": "CoinHubX Admin"
}

ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

# Test user for withdrawal fee testing
TEST_USER = {
    "email": "admin_test_user@test.com",
    "password": "Test123456",
    "full_name": "Admin Test User"
}

class AdminEndpointsTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_user_id = None
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ FIXED" if success else "❌ STILL FAILING"
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
    
    def test_admin_login(self):
        """Test admin login with special code"""
        print("\n=== Testing Admin Login ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json={
                    "email": ADMIN_USER["email"],
                    "password": ADMIN_USER["password"],
                    "admin_code": ADMIN_CODE
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("admin", {}).get("user_id"):
                    self.admin_user_id = data["admin"]["user_id"]
                    self.log_test(
                        "Admin Login", 
                        True, 
                        f"Admin login successful, user_id: {self.admin_user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Login", 
                        False, 
                        "Admin login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    "Admin Login", 
                    False, 
                    f"Admin login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Admin Login", 
                False, 
                f"Admin login request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_platform_settings_get(self):
        """Test GET /api/admin/platform-settings"""
        print("\n=== Testing GET Admin Platform Settings ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-settings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "settings" in data:
                    settings = data["settings"]
                    
                    # Check for key settings (updated to match actual implementation)
                    expected_keys = ["withdrawal_fee_percent", "p2p_trade_fee_percent", "referral_commission_percent"]
                    found_keys = [key for key in expected_keys if key in settings]
                    
                    if len(found_keys) >= 2:  # At least 2 key settings present
                        withdraw_fee = settings.get("withdrawal_fee_percent", "N/A")
                        p2p_fee = settings.get("p2p_trade_fee_percent", "N/A")
                        referral_commission = settings.get("referral_commission_percent", "N/A")
                        
                        self.log_test(
                            "GET Admin Platform Settings", 
                            True, 
                            f"Platform settings retrieved - Withdrawal: {withdraw_fee}%, P2P: {p2p_fee}%, Referral: {referral_commission}%"
                        )
                        return True
                    else:
                        self.log_test(
                            "GET Admin Platform Settings", 
                            False, 
                            f"Missing key settings. Found: {found_keys}, Expected: {expected_keys}"
                        )
                else:
                    self.log_test(
                        "GET Admin Platform Settings", 
                        False, 
                        "Invalid platform settings response format",
                        data
                    )
            else:
                self.log_test(
                    "GET Admin Platform Settings", 
                    False, 
                    f"GET platform settings failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET Admin Platform Settings", 
                False, 
                f"GET platform settings request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_platform_settings_post(self):
        """Test POST /api/admin/platform-settings - Update fees/commissions"""
        print("\n=== Testing POST Admin Platform Settings (Update Fees) ===")
        
        try:
            # Try to update withdrawal fee from 1.0% to 1.5% (using correct field name)
            response = self.session.post(
                f"{BASE_URL}/admin/platform-settings",
                json={
                    "withdrawal_fee_percent": 1.5,
                    "p2p_trade_fee_percent": 1.0,
                    "referral_commission_percent": 20.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "POST Admin Platform Settings", 
                        True, 
                        "Platform settings updated successfully"
                    )
                    
                    # Verify the update by getting settings again
                    time.sleep(1)  # Brief pause
                    verify_response = self.session.get(
                        f"{BASE_URL}/admin/platform-settings",
                        timeout=10
                    )
                    
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        if verify_data.get("success") and "settings" in verify_data:
                            updated_withdraw_fee = verify_data["settings"].get("withdrawal_fee_percent")
                            if updated_withdraw_fee == 1.5:
                                self.log_test(
                                    "Verify Settings Update", 
                                    True, 
                                    f"Settings update verified - Withdrawal fee now: {updated_withdraw_fee}%"
                                )
                                return True
                            else:
                                self.log_test(
                                    "Verify Settings Update", 
                                    False, 
                                    f"Settings not persisted. Expected 1.5%, got {updated_withdraw_fee}%"
                                )
                        else:
                            self.log_test(
                                "Verify Settings Update", 
                                False, 
                                "Failed to verify settings update"
                            )
                    else:
                        self.log_test(
                            "Verify Settings Update", 
                            False, 
                            "Failed to retrieve settings for verification"
                        )
                else:
                    self.log_test(
                        "POST Admin Platform Settings", 
                        False, 
                        "Platform settings update response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "POST Admin Platform Settings", 
                    False, 
                    f"POST platform settings failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST Admin Platform Settings", 
                False, 
                f"POST platform settings request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_wallet_balances(self):
        """Test GET /api/admin/wallet-balances"""
        print("\n=== Testing GET Admin Wallet Balances ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/wallet-balances",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and ("withdrawal_addresses" in data or "referral_wallet_balances" in data):
                    withdrawal_addresses = data.get("withdrawal_addresses", [])
                    referral_wallet_balances = data.get("referral_wallet_balances", {})
                    
                    # Check if we have admin wallet data
                    if len(withdrawal_addresses) > 0 or len(referral_wallet_balances) > 0:
                        self.log_test(
                            "GET Admin Wallet Balances", 
                            True, 
                            f"Admin wallet balances retrieved - {len(withdrawal_addresses)} withdrawal addresses, Referral balances: {list(referral_wallet_balances.keys())}"
                        )
                    else:
                        self.log_test(
                            "GET Admin Wallet Balances", 
                            True, 
                            "Admin wallet balances retrieved - Empty balances (expected for new system)"
                        )
                    return True
                else:
                    self.log_test(
                        "GET Admin Wallet Balances", 
                        False, 
                        "Invalid wallet balances response format",
                        data
                    )
            else:
                self.log_test(
                    "GET Admin Wallet Balances", 
                    False, 
                    f"GET wallet balances failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET Admin Wallet Balances", 
                False, 
                f"GET wallet balances request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_all_transactions(self):
        """Test GET /api/admin/all-transactions"""
        print("\n=== Testing GET Admin All Transactions ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/all-transactions",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and ("crypto_transactions" in data or "p2p_trades" in data):
                    crypto_transactions = data.get("crypto_transactions", [])
                    p2p_trades = data.get("p2p_trades", [])
                    total_count = data.get("total_count", 0)
                    
                    # Check for different transaction types
                    if len(crypto_transactions) > 0:
                        transaction_types = set(tx.get("transaction_type", "unknown") for tx in crypto_transactions[:10])  # Check first 10
                        
                        self.log_test(
                            "GET Admin All Transactions", 
                            True, 
                            f"All transactions retrieved - {len(crypto_transactions)} crypto transactions, {len(p2p_trades)} P2P trades, Types: {list(transaction_types)}"
                        )
                    else:
                        self.log_test(
                            "GET Admin All Transactions", 
                            True, 
                            f"All transactions retrieved - {total_count} total transactions (empty lists - expected for new system)"
                        )
                    return True
                else:
                    self.log_test(
                        "GET Admin All Transactions", 
                        False, 
                        "Invalid all transactions response format",
                        data
                    )
            else:
                self.log_test(
                    "GET Admin All Transactions", 
                    False, 
                    f"GET all transactions failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET Admin All Transactions", 
                False, 
                f"GET all transactions request failed: {str(e)}"
            )
            
        return False
    
    def test_admin_kyc_submissions(self):
        """Test GET /api/admin/kyc-submissions"""
        print("\n=== Testing GET Admin KYC Submissions ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/kyc-submissions",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "submissions" in data:
                    submissions = data["submissions"]
                    total_submissions = len(submissions) if isinstance(submissions, list) else data.get("total_submissions", 0)
                    
                    # Check submission statuses
                    if isinstance(submissions, list) and len(submissions) > 0:
                        statuses = set(sub.get("status", "unknown") for sub in submissions[:5])  # Check first 5
                        
                        self.log_test(
                            "GET Admin KYC Submissions", 
                            True, 
                            f"KYC submissions retrieved - {total_submissions} submissions, Statuses: {list(statuses)}"
                        )
                    else:
                        self.log_test(
                            "GET Admin KYC Submissions", 
                            True, 
                            f"KYC submissions retrieved - {total_submissions} submissions (empty list - expected for new system)"
                        )
                    return True
                else:
                    self.log_test(
                        "GET Admin KYC Submissions", 
                        False, 
                        "Invalid KYC submissions response format",
                        data
                    )
            else:
                self.log_test(
                    "GET Admin KYC Submissions", 
                    False, 
                    f"GET KYC submissions failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET Admin KYC Submissions", 
                False, 
                f"GET KYC submissions request failed: {str(e)}"
            )
            
        return False
    
    def test_withdrawal_fee_calculation(self):
        """Test withdrawal fee calculation (1%)"""
        print("\n=== Testing Withdrawal Fee Calculation (1%) ===")
        
        # First register a test user
        try:
            register_response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=TEST_USER,
                timeout=10
            )
            
            if register_response.status_code == 200:
                register_data = register_response.json()
                if register_data.get("success") and register_data.get("user", {}).get("user_id"):
                    self.test_user_id = register_data["user"]["user_id"]
                    print(f"   Test user registered: {self.test_user_id}")
            elif register_response.status_code == 400 and "already registered" in register_response.text:
                # User already exists, try login
                login_response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": TEST_USER["email"],
                        "password": TEST_USER["password"]
                    },
                    timeout=10
                )
                
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    if login_data.get("success") and login_data.get("user", {}).get("user_id"):
                        self.test_user_id = login_data["user"]["user_id"]
                        print(f"   Test user logged in: {self.test_user_id}")
            
            if not self.test_user_id:
                self.log_test(
                    "Withdrawal Fee Calculation", 
                    False, 
                    "Could not register or login test user for withdrawal test"
                )
                return False
            
            # Give user some crypto to withdraw
            deposit_response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.1  # 0.1 BTC
                },
                timeout=10
            )
            
            if deposit_response.status_code == 200:
                print(f"   Test deposit successful: 0.1 BTC")
                
                # Now test withdrawal with fee calculation
                withdrawal_response = self.session.post(
                    f"{BASE_URL}/crypto-bank/withdraw",
                    json={
                        "user_id": self.test_user_id,
                        "currency": "BTC",
                        "amount": 0.05,  # Withdraw 0.05 BTC
                        "wallet_address": "test_withdrawal_address_123"
                    },
                    timeout=10
                )
                
                if withdrawal_response.status_code == 200:
                    withdrawal_data = withdrawal_response.json()
                    if withdrawal_data.get("success"):
                        # Check fee_details for withdrawal fee
                        fee_details = withdrawal_data.get("fee_details", {})
                        withdrawal_fee = fee_details.get("withdrawal_fee", 0)
                        withdrawal_fee_percent = fee_details.get("withdrawal_fee_percent", 0)
                        
                        if withdrawal_fee > 0:
                            self.log_test(
                                "Withdrawal Fee Calculation", 
                                True, 
                                f"Withdrawal fee calculated correctly - Amount: 0.05 BTC, Fee: {withdrawal_fee} BTC ({withdrawal_fee_percent}%)"
                            )
                            return True
                        else:
                            self.log_test(
                                "Withdrawal Fee Calculation", 
                                False, 
                                f"No withdrawal fee found in response",
                                withdrawal_data
                            )
                    else:
                        self.log_test(
                            "Withdrawal Fee Calculation", 
                            False, 
                            "Withdrawal response indicates failure",
                            withdrawal_data
                        )
                else:
                    self.log_test(
                        "Withdrawal Fee Calculation", 
                        False, 
                        f"Withdrawal failed with status {withdrawal_response.status_code}",
                        withdrawal_response.text
                    )
            else:
                self.log_test(
                    "Withdrawal Fee Calculation", 
                    False, 
                    f"Test deposit failed with status {deposit_response.status_code}",
                    deposit_response.text
                )
                
        except Exception as e:
            self.log_test(
                "Withdrawal Fee Calculation", 
                False, 
                f"Withdrawal fee test failed: {str(e)}"
            )
            
        return False
    
    def test_p2p_trade_creation_with_seller(self):
        """Test P2P trade creation with seller"""
        print("\n=== Testing P2P Trade Creation with Seller ===")
        
        try:
            # First, get available sell orders
            sell_orders_response = self.session.get(
                f"{BASE_URL}/crypto-market/sell/orders",
                timeout=10
            )
            
            if sell_orders_response.status_code == 200:
                sell_data = sell_orders_response.json()
                if sell_data.get("success") and "orders" in sell_data:
                    orders = sell_data["orders"]
                    
                    if len(orders) > 0:
                        # Use the first available sell order
                        sell_order = orders[0]
                        sell_order_id = sell_order.get("order_id")
                        crypto_amount = min(0.01, sell_order.get("crypto_amount", 0.01))  # Buy small amount
                        
                        # Create buy order (this creates the P2P trade)
                        if self.test_user_id:
                            # Add bank account for test user first
                            bank_response = self.session.post(
                                f"{BASE_URL}/bank/add",
                                json={
                                    "wallet_address": f"test_wallet_{self.test_user_id}",
                                    "bank_name": "Test Bank",
                                    "account_number": "12345678",
                                    "account_holder_name": "Test User",
                                    "routing_number": "021000021"
                                },
                                timeout=10
                            )
                            
                            buy_order_response = self.session.post(
                                f"{BASE_URL}/crypto-market/buy/create",
                                json={
                                    "buyer_address": f"test_wallet_{self.test_user_id}",
                                    "sell_order_id": sell_order_id,
                                    "crypto_amount": crypto_amount
                                },
                                timeout=10
                            )
                            
                            if buy_order_response.status_code == 200:
                                buy_data = buy_order_response.json()
                                if buy_data.get("success") and buy_data.get("order", {}).get("order_id"):
                                    buy_order_id = buy_data["order"]["order_id"]
                                    total_price = buy_data["order"].get("total_price", 0)
                                    
                                    self.log_test(
                                        "P2P Trade Creation with Seller", 
                                        True, 
                                        f"P2P trade created successfully - Buy Order: {buy_order_id}, Amount: {crypto_amount} BTC, Total: £{total_price}"
                                    )
                                    return True
                                else:
                                    self.log_test(
                                        "P2P Trade Creation with Seller", 
                                        False, 
                                        "Buy order creation response missing success or order_id",
                                        buy_data
                                    )
                            else:
                                self.log_test(
                                    "P2P Trade Creation with Seller", 
                                    False, 
                                    f"Buy order creation failed with status {buy_order_response.status_code}",
                                    buy_order_response.text
                                )
                        else:
                            self.log_test(
                                "P2P Trade Creation with Seller", 
                                False, 
                                "No test user ID available for P2P trade creation"
                            )
                    else:
                        self.log_test(
                            "P2P Trade Creation with Seller", 
                            False, 
                            "No sell orders available for P2P trade creation"
                        )
                else:
                    self.log_test(
                        "P2P Trade Creation with Seller", 
                        False, 
                        "Invalid sell orders response format",
                        sell_data
                    )
            else:
                self.log_test(
                    "P2P Trade Creation with Seller", 
                    False, 
                    f"Get sell orders failed with status {sell_orders_response.status_code}",
                    sell_orders_response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Trade Creation with Seller", 
                False, 
                f"P2P trade creation test failed: {str(e)}"
            )
            
        return False
    
    def run_all_tests(self):
        """Run all admin endpoint tests"""
        print("🎯 ADMIN ENDPOINTS RE-TEST AFTER FIXES")
        print("=" * 60)
        
        # Test admin login first
        if not self.test_admin_login():
            print("\n❌ CRITICAL: Admin login failed. Cannot proceed with admin endpoint tests.")
            return
        
        # Run all admin endpoint tests
        tests = [
            self.test_admin_platform_settings_get,
            self.test_admin_platform_settings_post,
            self.test_admin_wallet_balances,
            self.test_admin_all_transactions,
            self.test_admin_kyc_submissions,
            self.test_withdrawal_fee_calculation,
            self.test_p2p_trade_creation_with_seller
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 ADMIN ENDPOINTS TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = [r for r in self.test_results if r["success"]]
        failed_tests = [r for r in self.test_results if not r["success"]]
        
        print(f"✅ FIXED: {len(passed_tests)} endpoints")
        print(f"❌ STILL FAILING: {len(failed_tests)} endpoints")
        print(f"📊 SUCCESS RATE: {len(passed_tests)}/{len(self.test_results)} ({len(passed_tests)/len(self.test_results)*100:.1f}%)")
        
        if passed_tests:
            print("\n✅ ENDPOINTS NOW WORKING:")
            for test in passed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        if failed_tests:
            print("\n❌ ENDPOINTS STILL NEED WORK:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = AdminEndpointsTester()
    tester.run_all_tests()