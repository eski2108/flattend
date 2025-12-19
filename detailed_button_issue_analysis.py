#!/usr/bin/env python3
"""
DETAILED BUTTON ISSUE ANALYSIS
Investigates the specific button issues reported by user:

1. Wallet Page - Deposit/Withdraw buttons
2. Instant Buy - £50, £100, £250, £500 buttons flashing
3. P2P Marketplace - "Buy Bitcoin" button shows "Page not found"
4. Savings Vault issues

This script will provide detailed analysis of each issue.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://p2pdispute.preview.emergentagent.com/api"

# Test credentials
LOGIN_CREDENTIALS = {
    "email": "p2p_demo_buyer@demo.com",
    "password": "Demo1234"
}

class DetailedButtonAnalyzer:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
        self.user_token = None
        
    def login(self):
        """Login and get user details"""
        print("🔐 Logging in with provided credentials...")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=LOGIN_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.user_id = data.get("user", {}).get("user_id")
                self.user_token = data.get("token")
                print(f"✅ Login successful - User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Login failed - Status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def analyze_wallet_buttons(self):
        """Analyze wallet page button issues"""
        print("\n🔍 ANALYZING WALLET PAGE BUTTON ISSUES")
        print("=" * 60)
        
        # Check user balances first
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-bank/balances/{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                balances = data.get("balances", [])
                print(f"✅ User has {len(balances)} currency balances")
                
                # Show some balance details
                for balance in balances[:5]:  # Show first 5
                    currency = balance.get("currency", "Unknown")
                    amount = balance.get("balance", 0)
                    print(f"   • {currency}: {amount}")
                    
            else:
                print(f"❌ Failed to get balances - Status: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Balance check error: {str(e)}")
        
        # Test withdraw button issue
        print("\n🔍 Testing Withdraw Button Issue:")
        
        # Try different withdraw API formats
        withdraw_tests = [
            {
                "name": "Crypto Bank Withdraw",
                "endpoint": "/crypto-bank/withdraw",
                "payload": {
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.0001,
                    "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                }
            },
            {
                "name": "User Withdraw",
                "endpoint": "/user/withdraw",
                "payload": {
                    "wallet_address": f"wallet_{self.user_id}",
                    "amount": 0.0001
                }
            },
            {
                "name": "Withdrawal Request",
                "endpoint": "/withdrawal/request",
                "payload": {
                    "user_id": self.user_id,
                    "currency": "BTC",
                    "amount": 0.0001,
                    "withdrawal_address": "1A1zP1eP5QGefi2DMPTfTLxwkDjidkpzFz"
                }
            }
        ]
        
        for test in withdraw_tests:
            try:
                response = self.session.post(
                    f"{BASE_URL}{test['endpoint']}",
                    json=test["payload"],
                    timeout=10
                )
                
                print(f"   • {test['name']}: Status {response.status_code}")
                if response.status_code != 200:
                    print(f"     Error: {response.text[:200]}")
                else:
                    print(f"     Success: {response.json()}")
                    
            except Exception as e:
                print(f"   • {test['name']}: Exception - {str(e)}")
    
    def analyze_instant_buy_buttons(self):
        """Analyze instant buy button issues"""
        print("\n🔍 ANALYZING INSTANT BUY BUTTON ISSUES")
        print("=" * 60)
        
        # Check available endpoints for instant buy
        instant_buy_endpoints = [
            "/express-buy/execute",
            "/instant-buy/execute", 
            "/express-buy/preview",
            "/instant-buy/preview",
            "/marketplace/express/execute"
        ]
        
        print("🔍 Testing different instant buy endpoints:")
        
        for endpoint in instant_buy_endpoints:
            try:
                # Test with £100 amount
                response = self.session.post(
                    f"{BASE_URL}{endpoint}",
                    json={
                        "user_id": self.user_id,
                        "crypto_currency": "BTC",
                        "fiat_amount": 100,
                        "fiat_currency": "GBP"
                    },
                    timeout=10
                )
                
                print(f"   • {endpoint}: Status {response.status_code}")
                if response.status_code == 404:
                    print(f"     ❌ Endpoint not found")
                elif response.status_code != 200:
                    print(f"     ⚠️  Error: {response.text[:200]}")
                else:
                    print(f"     ✅ Success: {response.json()}")
                    
            except Exception as e:
                print(f"   • {endpoint}: Exception - {str(e)}")
        
        # Check for marketplace express endpoints
        print("\n🔍 Testing marketplace express endpoints:")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/marketplace/express",
                timeout=10
            )
            
            print(f"   • GET /marketplace/express: Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"     Available cryptos: {len(data.get('cryptos', []))}")
            else:
                print(f"     Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"   • GET /marketplace/express: Exception - {str(e)}")
    
    def analyze_p2p_marketplace_buttons(self):
        """Analyze P2P marketplace button issues"""
        print("\n🔍 ANALYZING P2P MARKETPLACE BUTTON ISSUES")
        print("=" * 60)
        
        # Test different P2P endpoints
        p2p_endpoints = [
            "/p2p/marketplace/offers",
            "/p2p/offers", 
            "/crypto-market/sell/orders",
            "/p2p/marketplace",
            "/marketplace/p2p"
        ]
        
        print("🔍 Testing P2P marketplace endpoints:")
        
        for endpoint in p2p_endpoints:
            try:
                response = self.session.get(
                    f"{BASE_URL}{endpoint}",
                    timeout=10
                )
                
                print(f"   • {endpoint}: Status {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    if "offers" in data:
                        print(f"     ✅ Found {len(data['offers'])} offers")
                    elif "orders" in data:
                        print(f"     ✅ Found {len(data['orders'])} orders")
                    else:
                        print(f"     ✅ Response: {str(data)[:100]}")
                elif response.status_code == 404:
                    print(f"     ❌ Endpoint not found")
                else:
                    print(f"     ⚠️  Error: {response.text[:200]}")
                    
            except Exception as e:
                print(f"   • {endpoint}: Exception - {str(e)}")
        
        # Test "Buy Bitcoin" button functionality
        print("\n🔍 Testing 'Buy Bitcoin' button functionality:")
        
        # First get available sell orders
        try:
            response = self.session.get(
                f"{BASE_URL}/crypto-market/sell/orders",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get("orders", [])
                print(f"   • Available sell orders: {len(orders)}")
                
                if len(orders) > 0:
                    # Try to create buy order
                    first_order = orders[0]
                    print(f"   • Testing buy from order: {first_order.get('order_id', 'Unknown')}")
                    
                    buy_response = self.session.post(
                        f"{BASE_URL}/crypto-market/buy/create",
                        json={
                            "buyer_address": f"buyer_wallet_{self.user_id}",
                            "sell_order_id": first_order["order_id"],
                            "crypto_amount": 0.01  # Small amount
                        },
                        timeout=10
                    )
                    
                    print(f"   • Buy order creation: Status {buy_response.status_code}")
                    if buy_response.status_code != 200:
                        print(f"     Error: {buy_response.text[:200]}")
                    else:
                        print(f"     ✅ Buy order created successfully")
                else:
                    print("   • No sell orders available for testing")
            else:
                print(f"   • Failed to get sell orders: Status {response.status_code}")
                
        except Exception as e:
            print(f"   • Buy Bitcoin test error: {str(e)}")
    
    def analyze_savings_vault_buttons(self):
        """Analyze savings vault button issues"""
        print("\n🔍 ANALYZING SAVINGS VAULT BUTTON ISSUES")
        print("=" * 60)
        
        # Test savings endpoints
        try:
            response = self.session.get(
                f"{BASE_URL}/savings/balances/{self.user_id}",
                timeout=10
            )
            
            print(f"   • Savings balances: Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                balances = data.get("balances", [])
                total_value = data.get("total_value_usd", 0)
                print(f"     ✅ Savings loaded - {len(balances)} currencies, ${total_value}")
            else:
                print(f"     Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"   • Savings balances error: {str(e)}")
        
        # Test transfer functionality
        print("\n🔍 Testing savings transfer buttons:")
        
        transfer_tests = [
            {
                "name": "Transfer to Savings",
                "direction": "to_savings",
                "amount": 0.001
            },
            {
                "name": "Transfer from Savings", 
                "direction": "to_spot",
                "amount": 0.0001
            }
        ]
        
        for test in transfer_tests:
            try:
                response = self.session.post(
                    f"{BASE_URL}/savings/transfer",
                    json={
                        "user_id": self.user_id,
                        "currency": "BTC",
                        "amount": test["amount"],
                        "direction": test["direction"]
                    },
                    timeout=10
                )
                
                print(f"   • {test['name']}: Status {response.status_code}")
                if response.status_code == 200:
                    print(f"     ✅ Transfer successful")
                elif response.status_code == 400 and "insufficient" in response.text.lower():
                    print(f"     ✅ Transfer working (insufficient balance expected)")
                else:
                    print(f"     ⚠️  Error: {response.text[:200]}")
                    
            except Exception as e:
                print(f"   • {test['name']} error: {str(e)}")
    
    def check_backend_logs(self):
        """Check backend logs for errors"""
        print("\n🔍 CHECKING BACKEND SERVICE STATUS")
        print("=" * 60)
        
        try:
            # Check if backend is running
            response = self.session.get(f"{BASE_URL}/", timeout=5)
            print(f"   • Backend API: Status {response.status_code}")
            
            if response.status_code == 200:
                print("     ✅ Backend API is responding")
            else:
                print("     ❌ Backend API issues detected")
                
        except Exception as e:
            print(f"   • Backend check error: {str(e)}")
    
    def run_analysis(self):
        """Run complete button issue analysis"""
        print("🎯 DETAILED BUTTON ISSUE ANALYSIS")
        print("=" * 80)
        
        if not self.login():
            print("❌ Cannot proceed without login")
            return False
        
        # Analyze each button category
        self.analyze_wallet_buttons()
        self.analyze_instant_buy_buttons()
        self.analyze_p2p_marketplace_buttons()
        self.analyze_savings_vault_buttons()
        self.check_backend_logs()
        
        print("\n" + "=" * 80)
        print("🎯 ANALYSIS COMPLETE")
        print("=" * 80)
        
        return True

def main():
    """Main execution function"""
    analyzer = DetailedButtonAnalyzer()
    
    try:
        analyzer.run_analysis()
        
    except KeyboardInterrupt:
        print("\n⚠️  Analysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()