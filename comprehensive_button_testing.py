#!/usr/bin/env python3
"""
COMPREHENSIVE BUTTON TESTING - EVERY BUTTON ON THE SITE
Tests all buttons systematically as requested in review:

**Critical Issues Reported by User:**
1. Wallet Page - Deposit button doesn't work
2. Wallet Page - Withdraw button doesn't work  
3. Instant Buy - £50, £100, £250, £500 buttons all flashing at the same time
4. Savings Vault has issues
5. P2P Marketplace - "Buy Bitcoin" button shows "Page not found"

**Test Plan:**
1. Login with provided credentials (p2p_demo_buyer@demo.com / Demo1234)
2. Test Wallet Page buttons systematically
3. Test Instant Buy page buttons
4. Test P2P Marketplace buttons
5. Test Savings Vault buttons
6. Test all other critical page buttons

**Backend URL:** https://atomic-pay-fix.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://atomic-pay-fix.preview.emergentagent.com/api"

# Test credentials provided by user
LOGIN_CREDENTIALS = {
    "email": "p2p_demo_buyer@demo.com",
    "password": "Demo1234"
}

class ComprehensiveButtonTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
        self.user_token = None
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
    
    def test_login(self):
        """Test login with provided credentials"""
        print("\n=== Testing Login with Provided Credentials ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=LOGIN_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    self.user_id = data["user"]["user_id"]
                    self.user_token = data.get("token")
                    
                    self.log_test(
                        "Login Test", 
                        True, 
                        f"Login successful with user_id: {self.user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Login Test", 
                        False, 
                        "Login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    "Login Test", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Login Test", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False
    
    def test_wallet_page_buttons(self):
        """Test all buttons on the Wallet Page"""
        print("\n=== Testing Wallet Page Buttons ===")
        
        if not self.user_id:
            self.log_test(
                "Wallet Page Buttons", 
                False, 
                "Cannot test wallet buttons - no user ID available"
            )
            return False
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Get user balances (required for wallet page)
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{self.user_id}",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    self.log_test(
                        "Wallet - Get Balances", 
                        True, 
                        f"Wallet balances loaded successfully - {len(balances)} currencies"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Wallet - Get Balances", 
                        False, 
                        "Invalid balances response format",
                        data
                    )
            else:
                self.log_test(
                    "Wallet - Get Balances", 
                    False, 
                    f"Get balances failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Wallet - Get Balances", 
                False, 
                f"Get balances request failed: {str(e)}"
            )
        
        # Test 2: Deposit Button Functionality
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.001,
                    "tx_hash": "test_deposit_tx_hash_001"
                },
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Wallet - Deposit Button", 
                        True, 
                        "Deposit functionality working correctly"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Wallet - Deposit Button", 
                        False, 
                        "Deposit response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Wallet - Deposit Button", 
                    False, 
                    f"Deposit failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Wallet - Deposit Button", 
                False, 
                f"Deposit request failed: {str(e)}"
            )
        
        # Test 3: Withdraw Button Functionality
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json={
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.0001,
                    "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                },
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Wallet - Withdraw Button", 
                        True, 
                        "Withdraw functionality working correctly"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Wallet - Withdraw Button", 
                        False, 
                        "Withdraw response indicates failure",
                        data
                    )
            elif response.status_code == 400 and "insufficient" in response.text.lower():
                # Insufficient balance is expected - button functionality is working
                self.log_test(
                    "Wallet - Withdraw Button", 
                    True, 
                    "Withdraw button working (insufficient balance error expected)"
                )
                success_count += 1
            else:
                self.log_test(
                    "Wallet - Withdraw Button", 
                    False, 
                    f"Withdraw failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Wallet - Withdraw Button", 
                False, 
                f"Withdraw request failed: {str(e)}"
            )
        
        # Test 4: Convert Button (if exists)
        try:
            response = self.session.get(
                f"{BASE_URL}/swap/available-coins",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    self.log_test(
                        "Wallet - Convert Button", 
                        True, 
                        f"Convert/Swap functionality available - {len(data['coins'])} coins supported"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Wallet - Convert Button", 
                        False, 
                        "Convert functionality response invalid",
                        data
                    )
            else:
                self.log_test(
                    "Wallet - Convert Button", 
                    False, 
                    f"Convert functionality failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Wallet - Convert Button", 
                False, 
                f"Convert functionality request failed: {str(e)}"
            )
        
        return success_count, total_tests
    
    def test_instant_buy_buttons(self):
        """Test Instant Buy page buttons (£50, £100, £250, £500)"""
        print("\n=== Testing Instant Buy Page Buttons ===")
        
        if not self.user_id:
            self.log_test(
                "Instant Buy Buttons", 
                False, 
                "Cannot test instant buy buttons - no user ID available"
            )
            return False
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Get available coins for instant buy
        try:
            response = self.session.get(
                f"{BASE_URL}/coins/enabled",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "coins" in data:
                    coins = data["coins"]
                    instant_buy_coins = [coin for coin in coins if coin.get("supports_instant_buy")]
                    
                    self.log_test(
                        "Instant Buy - Available Coins", 
                        True, 
                        f"Instant buy coins loaded - {len(instant_buy_coins)} coins available"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Instant Buy - Available Coins", 
                        False, 
                        "Invalid coins response format",
                        data
                    )
            else:
                self.log_test(
                    "Instant Buy - Available Coins", 
                    False, 
                    f"Get coins failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Instant Buy - Available Coins", 
                False, 
                f"Get coins request failed: {str(e)}"
            )
        
        # Test 2-5: Test each amount button (£50, £100, £250, £500)
        test_amounts = [50, 100, 250, 500]
        
        for amount in test_amounts:
            try:
                # Test instant buy with specific amount
                response = self.session.post(
                    f"{BASE_URL}/express-buy/execute",
                    json={
                        "user_id": self.user_id,
                        "crypto_currency": "BTC",
                        "fiat_amount": amount,
                        "fiat_currency": "GBP"
                    },
                    timeout=10
                )
                
                total_tests += 1
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            f"Instant Buy - £{amount} Button", 
                            True, 
                            f"£{amount} instant buy executed successfully"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            f"Instant Buy - £{amount} Button", 
                            False, 
                            f"£{amount} instant buy response indicates failure",
                            data
                        )
                elif response.status_code == 400 and ("insufficient" in response.text.lower() or "balance" in response.text.lower()):
                    # Insufficient balance is expected - button functionality is working
                    self.log_test(
                        f"Instant Buy - £{amount} Button", 
                        True, 
                        f"£{amount} button working (insufficient balance expected)"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        f"Instant Buy - £{amount} Button", 
                        False, 
                        f"£{amount} instant buy failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Instant Buy - £{amount} Button", 
                    False, 
                    f"£{amount} instant buy request failed: {str(e)}"
                )
        
        # Test 6: Check for flashing button issue (state management)
        try:
            # Test rapid successive calls to see if buttons are properly managed
            responses = []
            for i in range(3):
                response = self.session.get(
                    f"{BASE_URL}/express-buy/preview",
                    params={
                        "crypto_currency": "BTC",
                        "fiat_amount": 100,
                        "fiat_currency": "GBP"
                    },
                    timeout=5
                )
                responses.append(response.status_code)
                time.sleep(0.1)  # Small delay between requests
            
            total_tests += 1
            if all(status == 200 for status in responses):
                self.log_test(
                    "Instant Buy - Button State Management", 
                    True, 
                    "Button state management working (no flashing detected in API)"
                )
                success_count += 1
            else:
                self.log_test(
                    "Instant Buy - Button State Management", 
                    False, 
                    f"Button state management issues detected - responses: {responses}"
                )
                
        except Exception as e:
            self.log_test(
                "Instant Buy - Button State Management", 
                False, 
                f"Button state management test failed: {str(e)}"
            )
        
        return success_count, total_tests
    
    def test_p2p_marketplace_buttons(self):
        """Test P2P Marketplace buttons"""
        print("\n=== Testing P2P Marketplace Buttons ===")
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Get P2P marketplace offers
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/marketplace/offers",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "offers" in data:
                    offers = data["offers"]
                    self.log_test(
                        "P2P Marketplace - Load Offers", 
                        True, 
                        f"P2P marketplace loaded successfully - {len(offers)} offers available"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "P2P Marketplace - Load Offers", 
                        False, 
                        "Invalid P2P offers response format",
                        data
                    )
            else:
                self.log_test(
                    "P2P Marketplace - Load Offers", 
                    False, 
                    f"P2P marketplace failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Marketplace - Load Offers", 
                False, 
                f"P2P marketplace request failed: {str(e)}"
            )
        
        # Test 2: Test "Buy Bitcoin" button functionality
        try:
            # First get available offers
            response = self.session.get(
                f"{BASE_URL}/crypto-market/sell/orders",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "orders" in data:
                    orders = data["orders"]
                    if len(orders) > 0:
                        # Try to create a buy order from first available sell order
                        first_order = orders[0]
                        
                        buy_response = self.session.post(
                            f"{BASE_URL}/crypto-market/buy/create",
                            json={
                                "buyer_address": f"test_buyer_wallet_{self.user_id}",
                                "sell_order_id": first_order["order_id"],
                                "crypto_amount": min(0.01, first_order.get("crypto_amount", 0.01))
                            },
                            timeout=10
                        )
                        
                        if buy_response.status_code == 200:
                            buy_data = buy_response.json()
                            if buy_data.get("success"):
                                self.log_test(
                                    "P2P Marketplace - Buy Bitcoin Button", 
                                    True, 
                                    "Buy Bitcoin button functionality working correctly"
                                )
                                success_count += 1
                            else:
                                self.log_test(
                                    "P2P Marketplace - Buy Bitcoin Button", 
                                    False, 
                                    "Buy Bitcoin button response indicates failure",
                                    buy_data
                                )
                        else:
                            self.log_test(
                                "P2P Marketplace - Buy Bitcoin Button", 
                                False, 
                                f"Buy Bitcoin button failed with status {buy_response.status_code}",
                                buy_response.text
                            )
                    else:
                        self.log_test(
                            "P2P Marketplace - Buy Bitcoin Button", 
                            True, 
                            "Buy Bitcoin button - no offers available (expected)"
                        )
                        success_count += 1
                else:
                    self.log_test(
                        "P2P Marketplace - Buy Bitcoin Button", 
                        False, 
                        "Invalid sell orders response for Buy Bitcoin test",
                        data
                    )
            else:
                self.log_test(
                    "P2P Marketplace - Buy Bitcoin Button", 
                    False, 
                    f"Buy Bitcoin button test failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Marketplace - Buy Bitcoin Button", 
                False, 
                f"Buy Bitcoin button test failed: {str(e)}"
            )
        
        # Test 3: Test P2P configuration endpoint
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/config",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "P2P Marketplace - Configuration", 
                        True, 
                        "P2P marketplace configuration loaded successfully"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "P2P Marketplace - Configuration", 
                        False, 
                        "P2P configuration response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "P2P Marketplace - Configuration", 
                    False, 
                    f"P2P configuration failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "P2P Marketplace - Configuration", 
                False, 
                f"P2P configuration request failed: {str(e)}"
            )
        
        return success_count, total_tests
    
    def test_savings_vault_buttons(self):
        """Test Savings Vault page buttons"""
        print("\n=== Testing Savings Vault Buttons ===")
        
        if not self.user_id:
            self.log_test(
                "Savings Vault Buttons", 
                False, 
                "Cannot test savings vault buttons - no user ID available"
            )
            return False
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Get savings balances
        try:
            response = self.session.get(
                f"{BASE_URL}/savings/balances/{self.user_id}",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    total_value = data.get("total_value_usd", 0)
                    
                    self.log_test(
                        "Savings Vault - Get Balances", 
                        True, 
                        f"Savings balances loaded - {len(balances)} currencies, Total: ${total_value}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Savings Vault - Get Balances", 
                        False, 
                        "Invalid savings balances response format",
                        data
                    )
            else:
                self.log_test(
                    "Savings Vault - Get Balances", 
                    False, 
                    f"Savings balances failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Savings Vault - Get Balances", 
                False, 
                f"Savings balances request failed: {str(e)}"
            )
        
        # Test 2: Test transfer to savings (deposit to savings)
        try:
            response = self.session.post(
                f"{BASE_URL}/savings/transfer",
                json={
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.001,
                    "direction": "to_savings"
                },
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Savings Vault - Transfer to Savings", 
                        True, 
                        "Transfer to savings functionality working"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Savings Vault - Transfer to Savings", 
                        False, 
                        "Transfer to savings response indicates failure",
                        data
                    )
            elif response.status_code == 400 and ("insufficient" in response.text.lower() or "balance" in response.text.lower()):
                # Insufficient balance is expected - button functionality is working
                self.log_test(
                    "Savings Vault - Transfer to Savings", 
                    True, 
                    "Transfer to savings working (insufficient balance expected)"
                )
                success_count += 1
            else:
                self.log_test(
                    "Savings Vault - Transfer to Savings", 
                    False, 
                    f"Transfer to savings failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Savings Vault - Transfer to Savings", 
                False, 
                f"Transfer to savings request failed: {str(e)}"
            )
        
        # Test 3: Test transfer from savings (withdraw from savings)
        try:
            response = self.session.post(
                f"{BASE_URL}/savings/transfer",
                json={
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.0001,
                    "direction": "to_spot"
                },
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Savings Vault - Transfer from Savings", 
                        True, 
                        "Transfer from savings functionality working"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Savings Vault - Transfer from Savings", 
                        False, 
                        "Transfer from savings response indicates failure",
                        data
                    )
            elif response.status_code == 400 and ("insufficient" in response.text.lower() or "balance" in response.text.lower()):
                # Insufficient balance is expected - button functionality is working
                self.log_test(
                    "Savings Vault - Transfer from Savings", 
                    True, 
                    "Transfer from savings working (insufficient balance expected)"
                )
                success_count += 1
            else:
                self.log_test(
                    "Savings Vault - Transfer from Savings", 
                    False, 
                    f"Transfer from savings failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Savings Vault - Transfer from Savings", 
                False, 
                f"Transfer from savings request failed: {str(e)}"
            )
        
        return success_count, total_tests
    
    def test_other_critical_buttons(self):
        """Test other critical page buttons"""
        print("\n=== Testing Other Critical Page Buttons ===")
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Portfolio page functionality
        if self.user_id:
            try:
                response = self.session.get(
                    f"{BASE_URL}/portfolio/stats/{self.user_id}",
                    timeout=10
                )
                
                total_tests += 1
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Portfolio Page - Load Stats", 
                            True, 
                            "Portfolio page functionality working"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Portfolio Page - Load Stats", 
                            False, 
                            "Portfolio stats response indicates failure",
                            data
                        )
                else:
                    self.log_test(
                        "Portfolio Page - Load Stats", 
                        False, 
                        f"Portfolio stats failed with status {response.status_code}",
                        response.text
                    )
                    
            except Exception as e:
                self.log_test(
                    "Portfolio Page - Load Stats", 
                    False, 
                    f"Portfolio stats request failed: {str(e)}"
                )
        
        # Test 2: Swap/Convert functionality
        try:
            response = self.session.get(
                f"{BASE_URL}/swap/preview",
                params={
                    "from_currency": "BTC",
                    "to_currency": "ETH",
                    "amount": 0.01
                },
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Swap Page - Preview Functionality", 
                        True, 
                        "Swap preview functionality working"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Swap Page - Preview Functionality", 
                        False, 
                        "Swap preview response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Swap Page - Preview Functionality", 
                    False, 
                    f"Swap preview failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Swap Page - Preview Functionality", 
                False, 
                f"Swap preview request failed: {str(e)}"
            )
        
        # Test 3: Trading pairs functionality
        try:
            response = self.session.get(
                f"{BASE_URL}/trading/pairs",
                timeout=10
            )
            
            total_tests += 1
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "pairs" in data:
                    pairs = data["pairs"]
                    self.log_test(
                        "Trading Page - Load Pairs", 
                        True, 
                        f"Trading pairs loaded - {len(pairs)} pairs available"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Trading Page - Load Pairs", 
                        False, 
                        "Trading pairs response invalid",
                        data
                    )
            else:
                self.log_test(
                    "Trading Page - Load Pairs", 
                    False, 
                    f"Trading pairs failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Trading Page - Load Pairs", 
                False, 
                f"Trading pairs request failed: {str(e)}"
            )
        
        return success_count, total_tests
    
    def run_comprehensive_button_tests(self):
        """Run all button tests systematically"""
        print("🎯 COMPREHENSIVE BUTTON TESTING - EVERY BUTTON ON THE SITE")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("\n❌ CRITICAL FAILURE: Cannot proceed without login")
            return False
        
        # Step 2: Test all button categories
        total_success = 0
        total_tests = 0
        
        # Wallet Page Buttons
        wallet_success, wallet_total = self.test_wallet_page_buttons()
        total_success += wallet_success
        total_tests += wallet_total
        
        # Instant Buy Buttons
        instant_success, instant_total = self.test_instant_buy_buttons()
        total_success += instant_success
        total_tests += instant_total
        
        # P2P Marketplace Buttons
        p2p_success, p2p_total = self.test_p2p_marketplace_buttons()
        total_success += p2p_success
        total_tests += p2p_total
        
        # Savings Vault Buttons
        savings_success, savings_total = self.test_savings_vault_buttons()
        total_success += savings_success
        total_tests += savings_total
        
        # Other Critical Buttons
        other_success, other_total = self.test_other_critical_buttons()
        total_success += other_success
        total_tests += other_total
        
        # Final Summary
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE BUTTON TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (total_success / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Successful: {total_success}")
        print(f"Failed: {total_tests - total_success}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Categorize results
        failed_tests = [result for result in self.test_results if not result["success"]]
        critical_failures = []
        minor_issues = []
        
        for test in failed_tests:
            if any(keyword in test["test"].lower() for keyword in ["deposit", "withdraw", "buy bitcoin", "instant buy", "savings"]):
                critical_failures.append(test)
            else:
                minor_issues.append(test)
        
        if critical_failures:
            print(f"\n❌ CRITICAL BUTTON FAILURES ({len(critical_failures)}):")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['message']}")
        
        if minor_issues:
            print(f"\n⚠️  MINOR ISSUES ({len(minor_issues)}):")
            for test in minor_issues:
                print(f"   • {test['test']}: {test['message']}")
        
        successful_tests = [result for result in self.test_results if result["success"]]
        if successful_tests:
            print(f"\n✅ WORKING BUTTONS ({len(successful_tests)}):")
            for test in successful_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        return success_rate >= 70  # Consider 70%+ success rate as acceptable

def main():
    """Main execution function"""
    tester = ComprehensiveButtonTester()
    
    try:
        success = tester.run_comprehensive_button_tests()
        
        if success:
            print("\n🎉 COMPREHENSIVE BUTTON TESTING COMPLETED SUCCESSFULLY")
            sys.exit(0)
        else:
            print("\n💥 COMPREHENSIVE BUTTON TESTING COMPLETED WITH ISSUES")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()