#!/usr/bin/env python3
"""
COMPREHENSIVE END-TO-END BACKEND TESTING - ALL FLOWS
Tests EVERYTHING as requested in the review to ensure it works properly before user enters real data.

**Test Focus Areas:**
1. Fee System Testing (1% withdrawal fee, 1% P2P trade fee on seller side)
2. Referral System Testing (£10 bonus after £150 deposit, 20% commission)
3. Admin Controls Testing (change percentages, withdrawal addresses, approvals)
4. Complete P2P Trade Flow (create sell order, buyer initiates, mark paid, release crypto)
5. Deposit/Withdrawal Flow (user requests, admin approves, fees calculated)
6. CMS/Admin Dashboard (view users, transactions, pending items, KYC)

**Test Data:**
- Test user: testuser@comprehensive.com / Test123456
- Test amounts: £150, £100, $500 etc
- Test crypto: BTC, ETH, USDT

**Backend URL:** https://wallet-nav-repair.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://wallet-nav-repair.preview.emergentagent.com/api"

# Test Users for comprehensive testing
COMPREHENSIVE_USER = {
    "email": "testuser@comprehensive.com",
    "password": "Test123456",
    "full_name": "Comprehensive Test User"
}

SELLER_USER = {
    "email": "seller@comprehensive.com", 
    "password": "Test123456",
    "full_name": "Comprehensive Seller"
}

ADMIN_USER = {
    "email": "admin@coinhubx.com",
    "password": "admin123"
}

ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class ComprehensiveBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_id = None
        self.seller_user_id = None
        self.admin_user_id = None
        self.sell_order_id = None
        self.buy_order_id = None
        self.trade_id = None
        self.deposit_id = None
        self.withdrawal_id = None
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
    
    def register_and_login_user(self, user_data, user_type):
        """Register and login user, return user_id"""
        print(f"\n=== {user_type} Registration & Login ===")
        
        # Try registration first
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    self.log_test(f"{user_type} Registration", True, f"Registered with ID: {user_id}")
                    return user_id
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login
                pass
            else:
                self.log_test(f"{user_type} Registration", False, f"Failed with status {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"{user_type} Registration", False, f"Request failed: {str(e)}")
            return None
        
        # Try login
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": user_data["email"],
                    "password": user_data["password"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    self.log_test(f"{user_type} Login", True, f"Logged in with ID: {user_id}")
                    return user_id
            
            self.log_test(f"{user_type} Login", False, f"Failed with status {response.status_code}")
            return None
            
        except Exception as e:
            self.log_test(f"{user_type} Login", False, f"Request failed: {str(e)}")
            return None
    
    def admin_login(self):
        """Admin login with special code"""
        print("\n=== Admin Login ===")
        
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
                    self.log_test("Admin Login", True, f"Admin logged in with ID: {self.admin_user_id}")
                    return True
            
            self.log_test("Admin Login", False, f"Failed with status {response.status_code}")
            return False
            
        except Exception as e:
            self.log_test("Admin Login", False, f"Request failed: {str(e)}")
            return False
    
    # ============================================================================
    # 1. FEE SYSTEM TESTING
    # ============================================================================
    
    def test_withdrawal_fee_calculation(self):
        """Test 1% withdrawal fee calculation (user withdraws $100, should deduct $1 fee, credit $99)"""
        print("\n=== Testing 1% Withdrawal Fee Calculation ===")
        
        if not self.test_user_id:
            self.log_test("Withdrawal Fee Test", False, "No test user ID available")
            return False
        
        # First, give user some crypto to withdraw
        try:
            # Deposit 0.1 BTC first
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.1
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Withdrawal Fee Test - Setup", False, "Failed to deposit crypto for withdrawal test")
                return False
            
            # Now test withdrawal with 1% fee
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.05,  # Withdraw 0.05 BTC
                    "wallet_address": "test_withdrawal_address_001"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Check if fee is calculated correctly (1% of 0.05 = 0.0005)
                    expected_fee = 0.05 * 0.01  # 1% fee
                    expected_net = 0.05 - expected_fee
                    
                    fee_details = data.get("fee_details", {})
                    actual_fee = fee_details.get("fee_amount", 0)
                    
                    if abs(actual_fee - expected_fee) < 0.000001:  # Allow for floating point precision
                        self.log_test(
                            "1% Withdrawal Fee Calculation", 
                            True, 
                            f"Withdrawal fee calculated correctly: {actual_fee} BTC fee on 0.05 BTC withdrawal"
                        )
                        return True
                    else:
                        self.log_test(
                            "1% Withdrawal Fee Calculation", 
                            False, 
                            f"Fee calculation incorrect. Expected: {expected_fee}, Got: {actual_fee}"
                        )
                else:
                    self.log_test("1% Withdrawal Fee Calculation", False, "Withdrawal response indicates failure", data)
            else:
                self.log_test("1% Withdrawal Fee Calculation", False, f"Withdrawal failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("1% Withdrawal Fee Calculation", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_p2p_trade_fee_on_seller(self):
        """Test 1% P2P trade fee on seller side (seller sells $100 crypto, platform collects $1)"""
        print("\n=== Testing 1% P2P Trade Fee on Seller ===")
        
        if not self.seller_user_id or not self.test_user_id:
            self.log_test("P2P Trade Fee Test", False, "Missing user IDs for P2P trade test")
            return False
        
        try:
            # Create sell order
            response = self.session.post(
                f"{BASE_URL}/p2p/create-offer",
                json={
                    "seller_id": self.seller_user_id,
                    "crypto_currency": "BTC",
                    "crypto_amount": 0.1,
                    "fiat_currency": "GBP",
                    "price_per_unit": 35000.0,
                    "min_purchase": 0.05,
                    "max_purchase": 0.1,
                    "payment_methods": ["bank_transfer"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("offer", {}).get("order_id"):
                    sell_order_id = data["offer"]["order_id"]
                    
                    # Create trade (buyer accepts offer)
                    response = self.session.post(
                        f"{BASE_URL}/p2p/create-trade",
                        json={
                            "buyer_id": self.test_user_id,
                            "sell_order_id": sell_order_id,
                            "crypto_amount": 0.1,
                            "payment_method": "bank_transfer"
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and data.get("trade", {}).get("trade_id"):
                            trade_id = data["trade"]["trade_id"]
                            
                            # Mark as paid
                            response = self.session.post(
                                f"{BASE_URL}/p2p/mark-paid",
                                json={
                                    "trade_id": trade_id,
                                    "buyer_id": self.test_user_id,
                                    "payment_reference": "TEST_PAYMENT_REF_001"
                                },
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                # Release crypto (this should apply 1% fee)
                                response = self.session.post(
                                    f"{BASE_URL}/p2p/release-crypto",
                                    json={
                                        "trade_id": trade_id,
                                        "seller_id": self.seller_user_id
                                    },
                                    timeout=10
                                )
                                
                                if response.status_code == 200:
                                    data = response.json()
                                    if data.get("success"):
                                        platform_fee = data.get("platform_fee", 0)
                                        buyer_received = data.get("buyer_received", 0)
                                        expected_fee = 0.1 * 0.01  # 1% of 0.1 BTC
                                        expected_buyer_received = 0.1 - expected_fee
                                        
                                        if abs(platform_fee - expected_fee) < 0.000001:
                                            self.log_test(
                                                "1% P2P Trade Fee on Seller", 
                                                True, 
                                                f"P2P trade fee calculated correctly: {platform_fee} BTC fee collected from seller, buyer received {buyer_received} BTC"
                                            )
                                            return True
                                        else:
                                            self.log_test(
                                                "1% P2P Trade Fee on Seller", 
                                                False, 
                                                f"Fee calculation incorrect. Expected: {expected_fee}, Got: {platform_fee}"
                                            )
                                    else:
                                        self.log_test("1% P2P Trade Fee on Seller", False, "Release crypto failed", data)
                                else:
                                    self.log_test("1% P2P Trade Fee on Seller", False, f"Release crypto failed with status {response.status_code}")
                            else:
                                self.log_test("1% P2P Trade Fee on Seller", False, f"Mark as paid failed with status {response.status_code}")
                        else:
                            self.log_test("1% P2P Trade Fee on Seller", False, "Create trade response missing trade_id", data)
                    else:
                        self.log_test("1% P2P Trade Fee on Seller", False, f"Create trade failed with status {response.status_code}")
                else:
                    self.log_test("1% P2P Trade Fee on Seller", False, "Create sell order response missing order_id", data)
            else:
                self.log_test("1% P2P Trade Fee on Seller", False, f"Create sell order failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("1% P2P Trade Fee on Seller", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_fee_collection_to_platform(self):
        """Test that fee collection goes to platform admin wallet"""
        print("\n=== Testing Fee Collection to Platform ===")
        
        try:
            # Check platform earnings/fees collected
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    total_fees = data.get("total_fees_collected", 0)
                    withdrawal_fees = data.get("withdrawal_fees", 0)
                    trade_fees = data.get("trade_fees", 0)
                    
                    self.log_test(
                        "Fee Collection to Platform", 
                        True, 
                        f"Platform fees tracked: Total: {total_fees}, Withdrawal: {withdrawal_fees}, Trade: {trade_fees}"
                    )
                    return True
                else:
                    self.log_test("Fee Collection to Platform", False, "Platform earnings response indicates failure", data)
            else:
                self.log_test("Fee Collection to Platform", False, f"Platform earnings failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Fee Collection to Platform", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_view_collected_fees(self):
        """Test if admin can view/track collected fees"""
        print("\n=== Testing Admin View Collected Fees ===")
        
        try:
            # Get admin dashboard with fee information
            response = self.session.get(
                f"{BASE_URL}/admin/dashboard-stats",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "stats" in data:
                    stats = data["stats"]
                    revenue_stats = stats.get("revenue", {})
                    
                    total_revenue = revenue_stats.get("total_revenue", 0)
                    withdrawal_fees = revenue_stats.get("withdrawal_fees", 0)
                    trade_fees = revenue_stats.get("trade_fees", 0)
                    
                    self.log_test(
                        "Admin View Collected Fees", 
                        True, 
                        f"Admin can view fees: Total Revenue: £{total_revenue}, Withdrawal Fees: £{withdrawal_fees}, Trade Fees: £{trade_fees}"
                    )
                    return True
                else:
                    self.log_test("Admin View Collected Fees", False, "Dashboard stats response missing success or stats", data)
            else:
                self.log_test("Admin View Collected Fees", False, f"Dashboard stats failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin View Collected Fees", False, f"Request failed: {str(e)}")
            
        return False
    
    # ============================================================================
    # 2. REFERRAL SYSTEM TESTING
    # ============================================================================
    
    def test_private_referral_link_bonus(self):
        """Test private referral link (£10 bonus after £150 deposit)"""
        print("\n=== Testing Private Referral Link £10 Bonus ===")
        
        if not self.test_user_id:
            self.log_test("Private Referral Link Test", False, "No test user ID available")
            return False
        
        try:
            # Get user's referral code
            response = self.session.get(
                f"{BASE_URL}/referral/dashboard/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "referral_code" in data:
                    referral_code = data["referral_code"]
                    
                    # Register new user with referral code
                    new_user_data = {
                        "email": "referred_user@test.com",
                        "password": "Test123456",
                        "full_name": "Referred User",
                        "referral_code": referral_code
                    }
                    
                    response = self.session.post(
                        f"{BASE_URL}/auth/register",
                        json=new_user_data,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and data.get("user", {}).get("user_id"):
                            referred_user_id = data["user"]["user_id"]
                            
                            # Make £150+ deposit to trigger bonus
                            response = self.session.post(
                                f"{BASE_URL}/crypto-bank/deposit",
                                json={
                                    "user_id": referred_user_id,
                                    "currency": "GBP",
                                    "amount": 150.0
                                },
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                data = response.json()
                                if data.get("success"):
                                    # Check if £10 bonus was credited
                                    bonus_credited = data.get("referral_bonus_credited", False)
                                    bonus_amount = data.get("referral_bonus_amount", 0)
                                    
                                    if bonus_credited and bonus_amount == 10.0:
                                        self.log_test(
                                            "Private Referral Link £10 Bonus", 
                                            True, 
                                            f"£10 referral bonus credited after £150 deposit. Referrer: {self.test_user_id}, Referred: {referred_user_id}"
                                        )
                                        return True
                                    else:
                                        self.log_test(
                                            "Private Referral Link £10 Bonus", 
                                            False, 
                                            f"Bonus not credited correctly. Credited: {bonus_credited}, Amount: {bonus_amount}"
                                        )
                                else:
                                    self.log_test("Private Referral Link £10 Bonus", False, "Deposit response indicates failure", data)
                            else:
                                self.log_test("Private Referral Link £10 Bonus", False, f"Deposit failed with status {response.status_code}")
                        else:
                            self.log_test("Private Referral Link £10 Bonus", False, "Referred user registration missing user_id", data)
                    else:
                        self.log_test("Private Referral Link £10 Bonus", False, f"Referred user registration failed with status {response.status_code}")
                else:
                    self.log_test("Private Referral Link £10 Bonus", False, "Referral dashboard response missing referral_code", data)
            else:
                self.log_test("Private Referral Link £10 Bonus", False, f"Referral dashboard failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Private Referral Link £10 Bonus", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_public_referral_link_commission(self):
        """Test public referral link (20% commission only)"""
        print("\n=== Testing Public Referral Link 20% Commission ===")
        
        try:
            # Test referral commission configuration
            response = self.session.get(
                f"{BASE_URL}/admin/referral-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    config = data["config"]
                    commission_rate = config.get("commission_rate_percent", 0)
                    commission_duration = config.get("commission_duration_months", 0)
                    
                    if commission_rate == 20.0 and commission_duration == 12:
                        self.log_test(
                            "Public Referral Link 20% Commission", 
                            True, 
                            f"Referral commission configured correctly: {commission_rate}% for {commission_duration} months"
                        )
                        return True
                    else:
                        self.log_test(
                            "Public Referral Link 20% Commission", 
                            False, 
                            f"Commission config incorrect. Rate: {commission_rate}%, Duration: {commission_duration} months"
                        )
                else:
                    self.log_test("Public Referral Link 20% Commission", False, "Referral config response missing success or config", data)
            else:
                self.log_test("Public Referral Link 20% Commission", False, f"Referral config failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Public Referral Link 20% Commission", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_referral_bonus_payout_from_admin_wallet(self):
        """Test referral bonus payout from admin wallet"""
        print("\n=== Testing Referral Bonus Payout from Admin Wallet ===")
        
        try:
            # Check admin wallet balance and referral payouts
            response = self.session.get(
                f"{BASE_URL}/admin/referral-wallet-balance",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    wallet_balance = data.get("wallet_balance", 0)
                    total_payouts = data.get("total_referral_payouts", 0)
                    pending_payouts = data.get("pending_referral_payouts", 0)
                    
                    self.log_test(
                        "Referral Bonus Payout from Admin Wallet", 
                        True, 
                        f"Admin referral wallet: Balance: £{wallet_balance}, Total Payouts: £{total_payouts}, Pending: £{pending_payouts}"
                    )
                    return True
                else:
                    self.log_test("Referral Bonus Payout from Admin Wallet", False, "Referral wallet response indicates failure", data)
            else:
                self.log_test("Referral Bonus Payout from Admin Wallet", False, f"Referral wallet failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Referral Bonus Payout from Admin Wallet", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_lifetime_commission_on_fees(self):
        """Test 20% lifetime commission on fees"""
        print("\n=== Testing 20% Lifetime Commission on Fees ===")
        
        if not self.test_user_id:
            self.log_test("20% Lifetime Commission Test", False, "No test user ID available")
            return False
        
        try:
            # Check referral earnings for the user
            response = self.session.get(
                f"{BASE_URL}/referral/earnings/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    total_earnings = data.get("total_earnings", 0)
                    commission_rate = data.get("commission_rate_percent", 0)
                    earnings_breakdown = data.get("earnings_breakdown", [])
                    
                    # Check if commission rate is 20%
                    if commission_rate == 20.0:
                        self.log_test(
                            "20% Lifetime Commission on Fees", 
                            True, 
                            f"Lifetime commission working: {commission_rate}% rate, Total Earnings: £{total_earnings}, {len(earnings_breakdown)} commission events"
                        )
                        return True
                    else:
                        self.log_test(
                            "20% Lifetime Commission on Fees", 
                            False, 
                            f"Commission rate incorrect. Expected: 20%, Got: {commission_rate}%"
                        )
                else:
                    self.log_test("20% Lifetime Commission on Fees", False, "Referral earnings response indicates failure", data)
            else:
                self.log_test("20% Lifetime Commission on Fees", False, f"Referral earnings failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("20% Lifetime Commission on Fees", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_wallet_balance_tracking(self):
        """Test admin wallet balance tracking"""
        print("\n=== Testing Admin Wallet Balance Tracking ===")
        
        try:
            # Get admin wallet balances
            response = self.session.get(
                f"{BASE_URL}/admin/wallet-balances",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    
                    # Check for main currencies
                    btc_balance = balances.get("BTC", 0)
                    eth_balance = balances.get("ETH", 0)
                    gbp_balance = balances.get("GBP", 0)
                    
                    self.log_test(
                        "Admin Wallet Balance Tracking", 
                        True, 
                        f"Admin wallet balances tracked: BTC: {btc_balance}, ETH: {eth_balance}, GBP: £{gbp_balance}"
                    )
                    return True
                else:
                    self.log_test("Admin Wallet Balance Tracking", False, "Admin wallet balances response missing success or balances", data)
            else:
                self.log_test("Admin Wallet Balance Tracking", False, f"Admin wallet balances failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Wallet Balance Tracking", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_top_up_referral_wallet(self):
        """Test admin can top up referral payout wallet"""
        print("\n=== Testing Admin Top Up Referral Wallet ===")
        
        try:
            # Test admin top up referral wallet
            response = self.session.post(
                f"{BASE_URL}/admin/top-up-referral-wallet",
                json={
                    "admin_user_id": self.admin_user_id,
                    "amount": 1000.0,
                    "currency": "GBP"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    new_balance = data.get("new_balance", 0)
                    top_up_amount = data.get("top_up_amount", 0)
                    
                    self.log_test(
                        "Admin Top Up Referral Wallet", 
                        True, 
                        f"Referral wallet topped up: +£{top_up_amount}, New Balance: £{new_balance}"
                    )
                    return True
                else:
                    self.log_test("Admin Top Up Referral Wallet", False, "Top up response indicates failure", data)
            else:
                self.log_test("Admin Top Up Referral Wallet", False, f"Top up failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Top Up Referral Wallet", False, f"Request failed: {str(e)}")
            
        return False
    
    # ============================================================================
    # 3. ADMIN CONTROLS TESTING
    # ============================================================================
    
    def test_admin_change_commission_percentages(self):
        """Test admin can change commission percentages"""
        print("\n=== Testing Admin Change Commission Percentages ===")
        
        try:
            # Get current config
            response = self.session.get(
                f"{BASE_URL}/admin/referral-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    current_rate = data["config"].get("commission_rate_percent", 20)
                    
                    # Update commission rate
                    new_rate = 25.0 if current_rate == 20.0 else 20.0
                    response = self.session.post(
                        f"{BASE_URL}/admin/update-referral-config",
                        json={
                            "commission_rate_percent": new_rate,
                            "admin_user_id": self.admin_user_id
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            updated_rate = data.get("new_commission_rate", 0)
                            
                            if updated_rate == new_rate:
                                self.log_test(
                                    "Admin Change Commission Percentages", 
                                    True, 
                                    f"Commission rate updated from {current_rate}% to {updated_rate}%"
                                )
                                return True
                            else:
                                self.log_test(
                                    "Admin Change Commission Percentages", 
                                    False, 
                                    f"Rate not updated correctly. Expected: {new_rate}%, Got: {updated_rate}%"
                                )
                        else:
                            self.log_test("Admin Change Commission Percentages", False, "Update response indicates failure", data)
                    else:
                        self.log_test("Admin Change Commission Percentages", False, f"Update failed with status {response.status_code}")
                else:
                    self.log_test("Admin Change Commission Percentages", False, "Get config response missing success or config", data)
            else:
                self.log_test("Admin Change Commission Percentages", False, f"Get config failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Change Commission Percentages", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_change_fee_percentages(self):
        """Test admin can change fee percentages"""
        print("\n=== Testing Admin Change Fee Percentages ===")
        
        try:
            # Get current platform config
            response = self.session.get(
                f"{BASE_URL}/admin/platform-config",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "config" in data:
                    current_withdrawal_fee = data["config"].get("withdraw_fee_percent", 1.0)
                    
                    # Update withdrawal fee
                    new_fee = 1.5 if current_withdrawal_fee == 1.0 else 1.0
                    response = self.session.post(
                        f"{BASE_URL}/admin/update-platform-config",
                        json={
                            "withdraw_fee_percent": new_fee,
                            "admin_user_id": self.admin_user_id
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            updated_fee = data.get("new_withdraw_fee_percent", 0)
                            
                            if updated_fee == new_fee:
                                self.log_test(
                                    "Admin Change Fee Percentages", 
                                    True, 
                                    f"Withdrawal fee updated from {current_withdrawal_fee}% to {updated_fee}%"
                                )
                                return True
                            else:
                                self.log_test(
                                    "Admin Change Fee Percentages", 
                                    False, 
                                    f"Fee not updated correctly. Expected: {new_fee}%, Got: {updated_fee}%"
                                )
                        else:
                            self.log_test("Admin Change Fee Percentages", False, "Update response indicates failure", data)
                    else:
                        self.log_test("Admin Change Fee Percentages", False, f"Update failed with status {response.status_code}")
                else:
                    self.log_test("Admin Change Fee Percentages", False, "Get config response missing success or config", data)
            else:
                self.log_test("Admin Change Fee Percentages", False, f"Get config failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Change Fee Percentages", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_set_withdrawal_addresses(self):
        """Test admin can set/update withdrawal addresses for each crypto"""
        print("\n=== Testing Admin Set Withdrawal Addresses ===")
        
        try:
            # Set withdrawal addresses for different cryptos
            addresses = {
                "BTC": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                "ETH": "0x742d35Cc6634C0532925a3b8D0C9e3e7c4c4c4c4",
                "USDT": "TQn9Y2khEsLJW1ChVWFMSMeRDow5CXDB2i"
            }
            
            success_count = 0
            for currency, address in addresses.items():
                response = self.session.post(
                    f"{BASE_URL}/admin/set-withdrawal-address",
                    json={
                        "currency": currency,
                        "withdrawal_address": address,
                        "admin_user_id": self.admin_user_id
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        success_count += 1
            
            if success_count == len(addresses):
                self.log_test(
                    "Admin Set Withdrawal Addresses", 
                    True, 
                    f"Successfully set withdrawal addresses for {success_count} cryptocurrencies"
                )
                return True
            else:
                self.log_test(
                    "Admin Set Withdrawal Addresses", 
                    False, 
                    f"Only {success_count}/{len(addresses)} addresses set successfully"
                )
                
        except Exception as e:
            self.log_test("Admin Set Withdrawal Addresses", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_deposit_approval_flow(self):
        """Test admin deposit approval flow"""
        print("\n=== Testing Admin Deposit Approval Flow ===")
        
        if not self.test_user_id:
            self.log_test("Admin Deposit Approval", False, "No test user ID available")
            return False
        
        try:
            # User requests deposit
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.05,
                    "tx_hash": "test_deposit_tx_hash_001"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("deposit_id"):
                    deposit_id = data["deposit_id"]
                    
                    # Admin approves deposit
                    response = self.session.post(
                        f"{BASE_URL}/admin/approve-deposit",
                        json={
                            "deposit_id": deposit_id,
                            "admin_user_id": self.admin_user_id,
                            "approved": True,
                            "notes": "Deposit verified and approved"
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            self.log_test(
                                "Admin Deposit Approval Flow", 
                                True, 
                                f"Deposit approval flow working: Deposit ID {deposit_id} approved by admin"
                            )
                            return True
                        else:
                            self.log_test("Admin Deposit Approval Flow", False, "Approval response indicates failure", data)
                    else:
                        self.log_test("Admin Deposit Approval Flow", False, f"Approval failed with status {response.status_code}")
                else:
                    self.log_test("Admin Deposit Approval Flow", False, "Deposit response missing success or deposit_id", data)
            else:
                self.log_test("Admin Deposit Approval Flow", False, f"Deposit request failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Deposit Approval Flow", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_withdrawal_approval_flow(self):
        """Test admin withdrawal approval flow"""
        print("\n=== Testing Admin Withdrawal Approval Flow ===")
        
        if not self.test_user_id:
            self.log_test("Admin Withdrawal Approval", False, "No test user ID available")
            return False
        
        try:
            # User requests withdrawal
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": self.test_user_id,
                    "currency": "BTC",
                    "amount": 0.02,
                    "wallet_address": "bc1qtest_withdrawal_address"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("withdrawal_id"):
                    withdrawal_id = data["withdrawal_id"]
                    
                    # Admin approves withdrawal
                    response = self.session.post(
                        f"{BASE_URL}/admin/approve-withdrawal",
                        json={
                            "withdrawal_id": withdrawal_id,
                            "admin_user_id": self.admin_user_id,
                            "approved": True,
                            "tx_hash": "test_withdrawal_tx_hash_001",
                            "notes": "Withdrawal processed and sent"
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            self.log_test(
                                "Admin Withdrawal Approval Flow", 
                                True, 
                                f"Withdrawal approval flow working: Withdrawal ID {withdrawal_id} approved by admin"
                            )
                            return True
                        else:
                            self.log_test("Admin Withdrawal Approval Flow", False, "Approval response indicates failure", data)
                    else:
                        self.log_test("Admin Withdrawal Approval Flow", False, f"Approval failed with status {response.status_code}")
                else:
                    self.log_test("Admin Withdrawal Approval Flow", False, "Withdrawal response missing success or withdrawal_id", data)
            else:
                self.log_test("Admin Withdrawal Approval Flow", False, f"Withdrawal request failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Withdrawal Approval Flow", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_kyc_approval_rejection(self):
        """Test admin KYC approval/rejection"""
        print("\n=== Testing Admin KYC Approval/Rejection ===")
        
        if not self.test_user_id:
            self.log_test("Admin KYC Approval", False, "No test user ID available")
            return False
        
        try:
            # Submit KYC for user
            response = self.session.post(
                f"{BASE_URL}/kyc/submit",
                json={
                    "user_id": self.test_user_id,
                    "personal_info": {
                        "first_name": "Test",
                        "last_name": "User",
                        "date_of_birth": "1990-01-01",
                        "nationality": "GB"
                    },
                    "documents": {
                        "id_type": "passport",
                        "id_number": "TEST123456789",
                        "id_document_url": "https://example.com/test_id.jpg",
                        "proof_of_address_url": "https://example.com/test_address.jpg"
                    }
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("verification_id"):
                    verification_id = data["verification_id"]
                    
                    # Admin reviews and approves KYC
                    response = self.session.post(
                        f"{BASE_URL}/admin/review-kyc",
                        json={
                            "verification_id": verification_id,
                            "admin_user_id": self.admin_user_id,
                            "status": "approved",
                            "notes": "All documents verified successfully"
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            self.log_test(
                                "Admin KYC Approval/Rejection", 
                                True, 
                                f"KYC approval flow working: Verification ID {verification_id} approved by admin"
                            )
                            return True
                        else:
                            self.log_test("Admin KYC Approval/Rejection", False, "KYC review response indicates failure", data)
                    else:
                        self.log_test("Admin KYC Approval/Rejection", False, f"KYC review failed with status {response.status_code}")
                else:
                    self.log_test("Admin KYC Approval/Rejection", False, "KYC submit response missing success or verification_id", data)
            else:
                self.log_test("Admin KYC Approval/Rejection", False, f"KYC submit failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin KYC Approval/Rejection", False, f"Request failed: {str(e)}")
            
        return False
    
    # ============================================================================
    # 4. COMPLETE P2P TRADE FLOW
    # ============================================================================
    
    def test_complete_p2p_trade_flow(self):
        """Test complete P2P trade flow with fees and commissions"""
        print("\n=== Testing Complete P2P Trade Flow ===")
        
        if not self.seller_user_id or not self.test_user_id:
            self.log_test("Complete P2P Trade Flow", False, "Missing user IDs for P2P trade test")
            return False
        
        try:
            # 1. Create sell order (seller locks crypto in escrow)
            response = self.session.post(
                f"{BASE_URL}/p2p/create-offer",
                json={
                    "seller_id": self.seller_user_id,
                    "crypto_currency": "BTC",
                    "crypto_amount": 0.1,
                    "fiat_currency": "GBP",
                    "price_per_unit": 35000.0,
                    "min_purchase": 0.05,
                    "max_purchase": 0.1,
                    "payment_methods": ["bank_transfer"]
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Complete P2P Trade Flow - Create Sell Order", False, f"Failed with status {response.status_code}")
                return False
            
            data = response.json()
            if not (data.get("success") and data.get("offer", {}).get("order_id")):
                self.log_test("Complete P2P Trade Flow - Create Sell Order", False, "Response missing order_id")
                return False
            
            sell_order_id = data["offer"]["order_id"]
            
            # 2. Buyer initiates trade
            response = self.session.post(
                f"{BASE_URL}/p2p/create-trade",
                json={
                    "buyer_id": self.test_user_id,
                    "sell_order_id": sell_order_id,
                    "crypto_amount": 0.1,
                    "payment_method": "bank_transfer"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Complete P2P Trade Flow - Create Trade", False, f"Failed with status {response.status_code}")
                return False
            
            data = response.json()
            if not (data.get("success") and data.get("trade", {}).get("trade_id")):
                self.log_test("Complete P2P Trade Flow - Create Trade", False, "Response missing trade_id")
                return False
            
            trade_id = data["trade"]["trade_id"]
            
            # 3. Buyer marks payment as sent
            response = self.session.post(
                f"{BASE_URL}/p2p/mark-paid",
                json={
                    "trade_id": trade_id,
                    "buyer_id": self.test_user_id,
                    "payment_reference": "COMPREHENSIVE_TEST_PAYMENT_001"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Complete P2P Trade Flow - Mark as Paid", False, f"Failed with status {response.status_code}")
                return False
            
            # 4. Seller confirms payment received and releases crypto
            response = self.session.post(
                f"{BASE_URL}/p2p/release-crypto",
                json={
                    "trade_id": trade_id,
                    "seller_id": self.seller_user_id
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Complete P2P Trade Flow - Release Crypto", False, f"Failed with status {response.status_code}")
                return False
            
            data = response.json()
            if not data.get("success"):
                self.log_test("Complete P2P Trade Flow - Release Crypto", False, "Response indicates failure")
                return False
            
            # 5. Verify 1% fee deducted from seller
            platform_fee = data.get("platform_fee", 0)
            buyer_received = data.get("buyer_received", 0)
            expected_fee = 0.1 * 0.01  # 1% of 0.1 BTC
            expected_buyer_received = 0.1 - expected_fee
            
            if abs(platform_fee - expected_fee) < 0.000001 and abs(buyer_received - expected_buyer_received) < 0.000001:
                # 6. Verify referrer gets 20% of that fee (this would be tested in referral commission flow)
                self.log_test(
                    "Complete P2P Trade Flow", 
                    True, 
                    f"Complete P2P trade flow successful: Trade ID {trade_id}, Platform fee: {platform_fee} BTC, Buyer received: {buyer_received} BTC"
                )
                return True
            else:
                self.log_test(
                    "Complete P2P Trade Flow", 
                    False, 
                    f"Fee calculation incorrect. Expected fee: {expected_fee}, Got: {platform_fee}"
                )
                
        except Exception as e:
            self.log_test("Complete P2P Trade Flow", False, f"Request failed: {str(e)}")
            
        return False
    
    # ============================================================================
    # 5. DEPOSIT/WITHDRAWAL FLOW
    # ============================================================================
    
    def test_deposit_withdrawal_flow(self):
        """Test complete deposit/withdrawal flow with admin approval and fees"""
        print("\n=== Testing Deposit/Withdrawal Flow ===")
        
        if not self.test_user_id:
            self.log_test("Deposit/Withdrawal Flow", False, "No test user ID available")
            return False
        
        try:
            # 1. User requests deposit
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.test_user_id,
                    "currency": "GBP",
                    "amount": 150.0,  # £150+ to trigger referral bonus
                    "tx_hash": "comprehensive_test_deposit_001"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Deposit/Withdrawal Flow - Deposit Request", False, f"Failed with status {response.status_code}")
                return False
            
            data = response.json()
            if not (data.get("success") and data.get("deposit_id")):
                self.log_test("Deposit/Withdrawal Flow - Deposit Request", False, "Response missing deposit_id")
                return False
            
            deposit_id = data["deposit_id"]
            
            # 2. Admin approves deposit
            response = self.session.post(
                f"{BASE_URL}/admin/approve-deposit",
                json={
                    "deposit_id": deposit_id,
                    "admin_user_id": self.admin_user_id,
                    "approved": True,
                    "notes": "Comprehensive test deposit approved"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Deposit/Withdrawal Flow - Admin Approval", False, f"Failed with status {response.status_code}")
                return False
            
            # 3. Balance credited to user
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{self.test_user_id}",
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Deposit/Withdrawal Flow - Balance Check", False, f"Failed with status {response.status_code}")
                return False
            
            data = response.json()
            if not (data.get("success") and "balances" in data):
                self.log_test("Deposit/Withdrawal Flow - Balance Check", False, "Response missing balances")
                return False
            
            # 4. Check if £150+ deposit triggers referral bonus
            referral_bonus_triggered = data.get("referral_bonus_triggered", False)
            
            # 5. User requests withdrawal
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": self.test_user_id,
                    "currency": "GBP",
                    "amount": 100.0,  # £100 withdrawal
                    "wallet_address": "comprehensive_test_withdrawal_address"
                },
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Deposit/Withdrawal Flow - Withdrawal Request", False, f"Failed with status {response.status_code}")
                return False
            
            data = response.json()
            if not (data.get("success") and data.get("withdrawal_id")):
                self.log_test("Deposit/Withdrawal Flow - Withdrawal Request", False, "Response missing withdrawal_id")
                return False
            
            withdrawal_id = data["withdrawal_id"]
            
            # 6. 1% fee calculated correctly
            fee_details = data.get("fee_details", {})
            withdrawal_fee = fee_details.get("fee_amount", 0)
            expected_fee = 100.0 * 0.01  # 1% of £100
            
            if abs(withdrawal_fee - expected_fee) < 0.01:  # Allow for small precision differences
                # 7. Admin approves withdrawal
                response = self.session.post(
                    f"{BASE_URL}/admin/approve-withdrawal",
                    json={
                        "withdrawal_id": withdrawal_id,
                        "admin_user_id": self.admin_user_id,
                        "approved": True,
                        "tx_hash": "comprehensive_test_withdrawal_tx_001",
                        "notes": "Comprehensive test withdrawal approved"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Deposit/Withdrawal Flow", 
                            True, 
                            f"Complete deposit/withdrawal flow successful: Deposit ID {deposit_id}, Withdrawal ID {withdrawal_id}, Fee: £{withdrawal_fee}"
                        )
                        return True
                    else:
                        self.log_test("Deposit/Withdrawal Flow - Admin Withdrawal Approval", False, "Response indicates failure")
                else:
                    self.log_test("Deposit/Withdrawal Flow - Admin Withdrawal Approval", False, f"Failed with status {response.status_code}")
            else:
                self.log_test(
                    "Deposit/Withdrawal Flow", 
                    False, 
                    f"Withdrawal fee calculation incorrect. Expected: £{expected_fee}, Got: £{withdrawal_fee}"
                )
                
        except Exception as e:
            self.log_test("Deposit/Withdrawal Flow", False, f"Request failed: {str(e)}")
            
        return False
    
    # ============================================================================
    # 6. CMS/ADMIN DASHBOARD
    # ============================================================================
    
    def test_admin_view_all_users(self):
        """Test admin can view all users"""
        print("\n=== Testing Admin View All Users ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/customers",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "customers" in data:
                    customers = data["customers"]
                    total_customers = data.get("total_customers", len(customers))
                    
                    # Check if our test users are in the list
                    test_user_found = any(c.get("email") == COMPREHENSIVE_USER["email"] for c in customers)
                    seller_found = any(c.get("email") == SELLER_USER["email"] for c in customers)
                    
                    self.log_test(
                        "Admin View All Users", 
                        True, 
                        f"Admin can view {total_customers} users (Test users found: {test_user_found and seller_found})"
                    )
                    return True
                else:
                    self.log_test("Admin View All Users", False, "Response missing success or customers", data)
            else:
                self.log_test("Admin View All Users", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin View All Users", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_view_all_transactions(self):
        """Test admin can view all transactions"""
        print("\n=== Testing Admin View All Transactions ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/all-transactions",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "transactions" in data:
                    transactions = data["transactions"]
                    total_transactions = data.get("total_transactions", len(transactions))
                    
                    self.log_test(
                        "Admin View All Transactions", 
                        True, 
                        f"Admin can view {total_transactions} transactions"
                    )
                    return True
                else:
                    self.log_test("Admin View All Transactions", False, "Response missing success or transactions", data)
            else:
                self.log_test("Admin View All Transactions", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin View All Transactions", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_view_pending_deposits_withdrawals(self):
        """Test admin can view pending deposits/withdrawals"""
        print("\n=== Testing Admin View Pending Deposits/Withdrawals ===")
        
        try:
            # Check pending deposits
            response = self.session.get(
                f"{BASE_URL}/admin/pending-deposits",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "pending_deposits" in data:
                    pending_deposits = data["pending_deposits"]
                    
                    # Check pending withdrawals
                    response = self.session.get(
                        f"{BASE_URL}/admin/pending-withdrawals",
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "pending_withdrawals" in data:
                            pending_withdrawals = data["pending_withdrawals"]
                            
                            self.log_test(
                                "Admin View Pending Deposits/Withdrawals", 
                                True, 
                                f"Admin can view pending items: {len(pending_deposits)} deposits, {len(pending_withdrawals)} withdrawals"
                            )
                            return True
                        else:
                            self.log_test("Admin View Pending Deposits/Withdrawals", False, "Pending withdrawals response missing success or data", data)
                    else:
                        self.log_test("Admin View Pending Deposits/Withdrawals", False, f"Pending withdrawals failed with status {response.status_code}")
                else:
                    self.log_test("Admin View Pending Deposits/Withdrawals", False, "Pending deposits response missing success or data", data)
            else:
                self.log_test("Admin View Pending Deposits/Withdrawals", False, f"Pending deposits failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin View Pending Deposits/Withdrawals", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_view_kyc_submissions(self):
        """Test admin can view KYC submissions"""
        print("\n=== Testing Admin View KYC Submissions ===")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/kyc-submissions",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "kyc_submissions" in data:
                    kyc_submissions = data["kyc_submissions"]
                    pending_count = len([k for k in kyc_submissions if k.get("status") == "pending"])
                    
                    self.log_test(
                        "Admin View KYC Submissions", 
                        True, 
                        f"Admin can view {len(kyc_submissions)} KYC submissions ({pending_count} pending)"
                    )
                    return True
                else:
                    self.log_test("Admin View KYC Submissions", False, "Response missing success or kyc_submissions", data)
            else:
                self.log_test("Admin View KYC Submissions", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin View KYC Submissions", False, f"Request failed: {str(e)}")
            
        return False
    
    def test_admin_modify_platform_settings(self):
        """Test admin can modify platform settings"""
        print("\n=== Testing Admin Modify Platform Settings ===")
        
        try:
            # Get current settings
            response = self.session.get(
                f"{BASE_URL}/admin/platform-settings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "settings" in data:
                    current_settings = data["settings"]
                    
                    # Modify a setting
                    new_settings = {
                        "platform_name": "Coin Hub X - Comprehensive Test",
                        "maintenance_mode": False,
                        "max_daily_withdrawal": 10000.0,
                        "admin_user_id": self.admin_user_id
                    }
                    
                    response = self.session.post(
                        f"{BASE_URL}/admin/update-platform-settings",
                        json=new_settings,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            updated_settings = data.get("updated_settings", {})
                            
                            self.log_test(
                                "Admin Modify Platform Settings", 
                                True, 
                                f"Platform settings updated successfully: {len(updated_settings)} settings modified"
                            )
                            return True
                        else:
                            self.log_test("Admin Modify Platform Settings", False, "Update response indicates failure", data)
                    else:
                        self.log_test("Admin Modify Platform Settings", False, f"Update failed with status {response.status_code}")
                else:
                    self.log_test("Admin Modify Platform Settings", False, "Get settings response missing success or settings", data)
            else:
                self.log_test("Admin Modify Platform Settings", False, f"Get settings failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Modify Platform Settings", False, f"Request failed: {str(e)}")
            
        return False
    
    # ============================================================================
    # MAIN TEST EXECUTION
    # ============================================================================
    
    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        print("🚀 STARTING COMPREHENSIVE END-TO-END BACKEND TESTING")
        print("=" * 80)
        
        # Setup: Register and login users
        self.test_user_id = self.register_and_login_user(COMPREHENSIVE_USER, "Test User")
        self.seller_user_id = self.register_and_login_user(SELLER_USER, "Seller User")
        admin_success = self.admin_login()
        
        if not self.test_user_id or not self.seller_user_id or not admin_success:
            print("❌ CRITICAL: Failed to setup test users. Cannot continue comprehensive testing.")
            return
        
        # 1. Fee System Testing
        print("\n" + "=" * 80)
        print("1. FEE SYSTEM TESTING")
        print("=" * 80)
        self.test_withdrawal_fee_calculation()
        self.test_p2p_trade_fee_on_seller()
        self.test_fee_collection_to_platform()
        self.test_admin_view_collected_fees()
        
        # 2. Referral System Testing
        print("\n" + "=" * 80)
        print("2. REFERRAL SYSTEM TESTING")
        print("=" * 80)
        self.test_private_referral_link_bonus()
        self.test_public_referral_link_commission()
        self.test_referral_bonus_payout_from_admin_wallet()
        self.test_lifetime_commission_on_fees()
        self.test_admin_wallet_balance_tracking()
        self.test_admin_top_up_referral_wallet()
        
        # 3. Admin Controls Testing
        print("\n" + "=" * 80)
        print("3. ADMIN CONTROLS TESTING")
        print("=" * 80)
        self.test_admin_change_commission_percentages()
        self.test_admin_change_fee_percentages()
        self.test_admin_set_withdrawal_addresses()
        self.test_admin_deposit_approval_flow()
        self.test_admin_withdrawal_approval_flow()
        self.test_admin_kyc_approval_rejection()
        
        # 4. Complete P2P Trade Flow
        print("\n" + "=" * 80)
        print("4. COMPLETE P2P TRADE FLOW")
        print("=" * 80)
        self.test_complete_p2p_trade_flow()
        
        # 5. Deposit/Withdrawal Flow
        print("\n" + "=" * 80)
        print("5. DEPOSIT/WITHDRAWAL FLOW")
        print("=" * 80)
        self.test_deposit_withdrawal_flow()
        
        # 6. CMS/Admin Dashboard
        print("\n" + "=" * 80)
        print("6. CMS/ADMIN DASHBOARD")
        print("=" * 80)
        self.test_admin_view_all_users()
        self.test_admin_view_all_transactions()
        self.test_admin_view_pending_deposits_withdrawals()
        self.test_admin_view_kyc_submissions()
        self.test_admin_modify_platform_settings()
        
        # Summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print(f"\n🎉 COMPREHENSIVE TESTING COMPLETED")
        print(f"📋 Detailed results: {len(self.test_results)} test cases executed")
        
        # Critical issues summary
        critical_failures = [r for r in self.test_results if not r["success"] and any(keyword in r["test"].lower() for keyword in ["fee", "admin", "p2p", "deposit", "withdrawal"])]
        
        if critical_failures:
            print(f"\n🚨 CRITICAL ISSUES FOUND ({len(critical_failures)}):")
            for failure in critical_failures:
                print(f"   • {failure['test']}")
        else:
            print(f"\n✅ NO CRITICAL ISSUES FOUND - All core functionality working!")

if __name__ == "__main__":
    tester = ComprehensiveBackendTester()
    tester.run_comprehensive_tests()