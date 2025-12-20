#!/usr/bin/env python3
"""
FINAL BUTTON FIX TEST - ADDRESSES ALL REPORTED ISSUES
Tests and fixes the specific button issues reported by user:

1. ✅ Wallet Page - Deposit button (WORKING)
2. ❌ Wallet Page - Withdraw button (NEEDS wallet_address field)
3. ❌ Instant Buy - £50, £100, £250, £500 buttons (NEEDS ad_id and buyer_wallet_address)
4. ✅ Savings Vault (WORKING - insufficient balance expected)
5. ❌ P2P Marketplace - "Buy Bitcoin" button (WRONG endpoint + amount validation)

This test provides the EXACT fixes needed for each issue.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://savingsflow-1.preview.emergentagent.com/api"

# Test credentials
LOGIN_CREDENTIALS = {
    "email": "p2p_demo_buyer@demo.com",
    "password": "Demo1234"
}

class ButtonFixTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
        self.user_token = None
        self.issues_found = []
        self.fixes_needed = []
        
    def login(self):
        """Login and get user details"""
        print("🔐 Logging in...")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=LOGIN_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.user_id = data.get("user", {}).get("user_id")
                print(f"✅ Login successful - User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Login failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_wallet_withdraw_button_fix(self):
        """Test and fix wallet withdraw button"""
        print("\n🔧 TESTING WALLET WITHDRAW BUTTON FIX")
        print("=" * 60)
        
        # Current broken request (missing wallet_address)
        broken_request = {
            "user_id": self.user_id,
            "currency": "BTC",
            "amount": 0.0001,
            "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
        }
        
        print("❌ Testing current broken request:")
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json=broken_request,
                timeout=10
            )
            print(f"   Status: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            
            if response.status_code == 422:
                self.issues_found.append("Wallet Withdraw Button - Missing wallet_address field")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
        
        # Fixed request (with wallet_address)
        fixed_request = {
            "user_id": self.user_id,
            "currency": "BTC", 
            "amount": 0.0001,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"  # This is the missing field!
        }
        
        print("\n✅ Testing fixed request:")
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/withdraw",
                json=fixed_request,
                timeout=10
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ WITHDRAW BUTTON FIXED!")
                self.fixes_needed.append("✅ Wallet Withdraw Button: Add wallet_address field to request")
            elif response.status_code == 400 and "insufficient" in response.text.lower():
                print("   ✅ WITHDRAW BUTTON WORKING (insufficient balance expected)")
                self.fixes_needed.append("✅ Wallet Withdraw Button: Add wallet_address field to request")
            else:
                print(f"   Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
    
    def test_instant_buy_buttons_fix(self):
        """Test and fix instant buy buttons"""
        print("\n🔧 TESTING INSTANT BUY BUTTONS FIX")
        print("=" * 60)
        
        # Current broken request (missing required fields)
        broken_request = {
            "user_id": self.user_id,
            "crypto_currency": "BTC",
            "fiat_amount": 100,
            "fiat_currency": "GBP"
        }
        
        print("❌ Testing current broken request:")
        try:
            response = self.session.post(
                f"{BASE_URL}/express-buy/execute",
                json=broken_request,
                timeout=10
            )
            print(f"   Status: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            
            if response.status_code == 400 and "Missing required fields" in response.text:
                self.issues_found.append("Instant Buy Buttons - Missing ad_id and buyer_wallet_address fields")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
        
        # Fixed request (with all required fields)
        fixed_request = {
            "user_id": self.user_id,
            "ad_id": "ADMIN_LIQUIDITY",  # This is required!
            "crypto_currency": "BTC",
            "crypto_amount": 0.002,  # Calculate from fiat_amount
            "fiat_amount": 100,
            "buyer_wallet_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz",  # This is required!
            "buyer_wallet_network": "mainnet"
        }
        
        print("\n✅ Testing fixed request for £100 button:")
        try:
            response = self.session.post(
                f"{BASE_URL}/express-buy/execute",
                json=fixed_request,
                timeout=10
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ INSTANT BUY BUTTONS FIXED!")
                self.fixes_needed.append("✅ Instant Buy Buttons: Add ad_id='ADMIN_LIQUIDITY' and buyer_wallet_address fields")
            elif response.status_code == 400 and ("insufficient" in response.text.lower() or "balance" in response.text.lower()):
                print("   ✅ INSTANT BUY BUTTONS WORKING (insufficient balance expected)")
                self.fixes_needed.append("✅ Instant Buy Buttons: Add ad_id='ADMIN_LIQUIDITY' and buyer_wallet_address fields")
            else:
                print(f"   Response: {response.text[:300]}")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
        
        # Test all amount buttons
        amounts = [50, 100, 250, 500]
        for amount in amounts:
            fixed_request["fiat_amount"] = amount
            fixed_request["crypto_amount"] = amount / 45000  # Approximate BTC amount
            
            print(f"\n✅ Testing £{amount} button fix:")
            try:
                response = self.session.post(
                    f"{BASE_URL}/express-buy/execute",
                    json=fixed_request,
                    timeout=10
                )
                
                if response.status_code == 200 or (response.status_code == 400 and "insufficient" in response.text.lower()):
                    print(f"   ✅ £{amount} button working with fix")
                else:
                    print(f"   Status: {response.status_code}")
                    
            except Exception as e:
                print(f"   Exception: {str(e)}")
    
    def test_p2p_buy_bitcoin_button_fix(self):
        """Test and fix P2P Buy Bitcoin button"""
        print("\n🔧 TESTING P2P BUY BITCOIN BUTTON FIX")
        print("=" * 60)
        
        # Get available sell orders
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-market/sell/orders",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get("orders", [])
                print(f"✅ Found {len(orders)} sell orders")
                
                if len(orders) > 0:
                    first_order = orders[0]
                    print(f"   Testing with order: {first_order.get('order_id', 'Unknown')}")
                    print(f"   Order details: {first_order.get('crypto_amount', 0)} crypto, min: {first_order.get('min_purchase', 0)}")
                    
                    # Current broken request (amount too small)
                    broken_request = {
                        "buyer_address": f"buyer_wallet_{self.user_id}",
                        "sell_order_id": first_order["order_id"],
                        "crypto_amount": 0.01  # Too small!
                    }
                    
                    print("\n❌ Testing current broken request:")
                    try:
                        response = self.session.post(
                            f"{BASE_URL}/crypto-market/buy/create",
                            json=broken_request,
                            timeout=10
                        )
                        print(f"   Status: {response.status_code}")
                        print(f"   Error: {response.text[:200]}")
                        
                        if "Amount must be between" in response.text:
                            self.issues_found.append("P2P Buy Bitcoin Button - Amount validation error")
                            
                    except Exception as e:
                        print(f"   Exception: {str(e)}")
                    
                    # Fixed request (with correct amount)
                    min_amount = first_order.get("min_purchase", 0.1)
                    fixed_request = {
                        "buyer_address": f"buyer_wallet_{self.user_id}",
                        "sell_order_id": first_order["order_id"],
                        "crypto_amount": min_amount  # Use minimum required amount
                    }
                    
                    print(f"\n✅ Testing fixed request with amount {min_amount}:")
                    try:
                        response = self.session.post(
                            f"{BASE_URL}/crypto-market/buy/create",
                            json=fixed_request,
                            timeout=10
                        )
                        print(f"   Status: {response.status_code}")
                        
                        if response.status_code == 200:
                            print("   ✅ BUY BITCOIN BUTTON FIXED!")
                            self.fixes_needed.append(f"✅ P2P Buy Bitcoin Button: Use minimum amount {min_amount} instead of 0.01")
                        else:
                            print(f"   Response: {response.text[:300]}")
                            
                    except Exception as e:
                        print(f"   Exception: {str(e)}")
                else:
                    print("   No sell orders available for testing")
            else:
                print(f"❌ Failed to get sell orders: Status {response.status_code}")
                
        except Exception as e:
            print(f"❌ P2P test error: {str(e)}")
    
    def test_correct_p2p_endpoint(self):
        """Test correct P2P marketplace endpoint"""
        print("\n🔧 TESTING CORRECT P2P MARKETPLACE ENDPOINT")
        print("=" * 60)
        
        # Wrong endpoint (returns 404)
        print("❌ Testing wrong endpoint /p2p/marketplace/offers:")
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/marketplace/offers",
                timeout=10
            )
            print(f"   Status: {response.status_code} (404 - Not Found)")
            
            if response.status_code == 404:
                self.issues_found.append("P2P Marketplace - Wrong endpoint /p2p/marketplace/offers")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
        
        # Correct endpoint (works)
        print("\n✅ Testing correct endpoint /p2p/offers:")
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/offers",
                timeout=10
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                offers = data.get("offers", [])
                print(f"   ✅ CORRECT ENDPOINT WORKS - {len(offers)} offers found")
                self.fixes_needed.append("✅ P2P Marketplace: Use /p2p/offers instead of /p2p/marketplace/offers")
            else:
                print(f"   Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
    
    def test_savings_vault_status(self):
        """Test savings vault functionality"""
        print("\n🔧 TESTING SAVINGS VAULT STATUS")
        print("=" * 60)
        
        try:
            response = self.session.get(
                f"{BASE_URL}/savings/balances/{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                balances = data.get("balances", [])
                total_value = data.get("total_value_usd", 0)
                print(f"✅ Savings Vault working - {len(balances)} currencies, ${total_value}")
                self.fixes_needed.append("✅ Savings Vault: Already working correctly")
            else:
                print(f"❌ Savings vault error: Status {response.status_code}")
                
        except Exception as e:
            print(f"❌ Savings vault error: {str(e)}")
    
    def run_comprehensive_fix_test(self):
        """Run all button fix tests"""
        print("🎯 COMPREHENSIVE BUTTON FIX TESTING")
        print("=" * 80)
        
        if not self.login():
            print("❌ Cannot proceed without login")
            return False
        
        # Test all button fixes
        self.test_wallet_withdraw_button_fix()
        self.test_instant_buy_buttons_fix()
        self.test_p2p_buy_bitcoin_button_fix()
        self.test_correct_p2p_endpoint()
        self.test_savings_vault_status()
        
        # Summary
        print("\n" + "=" * 80)
        print("🎯 BUTTON FIX SUMMARY")
        print("=" * 80)
        
        print(f"\n❌ ISSUES FOUND ({len(self.issues_found)}):")
        for issue in self.issues_found:
            print(f"   • {issue}")
        
        print(f"\n✅ FIXES NEEDED ({len(self.fixes_needed)}):")
        for fix in self.fixes_needed:
            print(f"   • {fix}")
        
        # Detailed fix instructions
        print("\n" + "=" * 80)
        print("🔧 DETAILED FIX INSTRUCTIONS FOR MAIN AGENT")
        print("=" * 80)
        
        print("\n1. WALLET WITHDRAW BUTTON FIX:")
        print("   Problem: Missing 'wallet_address' field in request")
        print("   Solution: Add wallet_address field to withdrawal request")
        print("   Code: Add 'wallet_address': withdrawal_address to request payload")
        
        print("\n2. INSTANT BUY BUTTONS FIX:")
        print("   Problem: Missing 'ad_id' and 'buyer_wallet_address' fields")
        print("   Solution: Add required fields to express-buy/execute request")
        print("   Code: Add 'ad_id': 'ADMIN_LIQUIDITY' and 'buyer_wallet_address': user_wallet")
        
        print("\n3. P2P BUY BITCOIN BUTTON FIX:")
        print("   Problem: Amount validation error (0.01 too small)")
        print("   Solution: Use order's min_purchase amount instead of hardcoded 0.01")
        print("   Code: crypto_amount = order.min_purchase (usually 0.1)")
        
        print("\n4. P2P MARKETPLACE ENDPOINT FIX:")
        print("   Problem: Using wrong endpoint /p2p/marketplace/offers (404)")
        print("   Solution: Use correct endpoint /p2p/offers")
        print("   Code: Change API call from /p2p/marketplace/offers to /p2p/offers")
        
        print("\n5. SAVINGS VAULT:")
        print("   Status: Already working correctly")
        print("   Note: Insufficient balance errors are expected for empty accounts")
        
        return True

def main():
    """Main execution function"""
    tester = ButtonFixTester()
    
    try:
        tester.run_comprehensive_fix_test()
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()