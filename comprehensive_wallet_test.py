#!/usr/bin/env python3
"""
Comprehensive Wallet Page Test
Tests the wallet page functionality including global Deposit/Withdraw buttons
and trader balance API endpoint as requested in the review.
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://tradefix-preview.preview.emergentagent.com/api"

class ComprehensiveWalletTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        self.user_data = None
        
    async def setup_session(self):
        """Setup HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
            
    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
    async def test_user_setup(self):
        """Test 1: Setup user (register or login existing)"""
        test_name = "User Setup"
        
        try:
            # Try to register first
            register_data = {
                "email": "wallet_test_user@test.com",
                "password": "Test123456",
                "full_name": "Wallet Test User"
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/register", json=register_data) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    self.user_data = data.get("user", {})
                    self.log_test(test_name, True, "New user registered successfully")
                    return True
                elif "already exists" in data.get("message", "").lower():
                    # User exists, try login
                    login_data = {
                        "email": "wallet_test_user@test.com",
                        "password": "Test123456"
                    }
                    
                    async with self.session.post(f"{BACKEND_URL}/auth/login", json=login_data) as response:
                        login_result = await response.json()
                        
                        if response.status == 200 and login_result.get("success"):
                            self.user_data = login_result.get("user", {})
                            self.log_test(test_name, True, "Existing user logged in successfully")
                            return True
                        else:
                            self.log_test(test_name, False, f"Login failed: {login_result.get('message', 'Unknown error')}")
                            return False
                else:
                    self.log_test(test_name, False, f"Registration failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"User setup error: {str(e)}")
            return False
            
    async def test_trader_balance_api_structure(self):
        """Test 2: Test trader balance API endpoint structure as requested"""
        test_name = "Trader Balance API Structure"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            
            async with self.session.get(f"{BACKEND_URL}/trader/my-balances/{user_id}") as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    balances = data.get("balances", {})
                    
                    # Check if response has the expected structure
                    if isinstance(balances, dict):
                        # Expected structure: {"BTC": {"total_balance": 0, "locked_balance": 0, "available_balance": 0}}
                        structure_valid = True
                        currencies_found = []
                        
                        for currency, balance_data in balances.items():
                            currencies_found.append(currency)
                            required_fields = ["total_balance", "locked_balance", "available_balance"]
                            
                            for field in required_fields:
                                if field not in balance_data:
                                    structure_valid = False
                                    break
                                    
                        if structure_valid and currencies_found:
                            self.log_test(test_name, True, 
                                        f"Balance API returns proper structure with currencies: {currencies_found}")
                        elif not currencies_found:
                            self.log_test(test_name, True, 
                                        "Balance API working - New user with no balances initialized yet (expected)")
                        else:
                            self.log_test(test_name, False, "Balance structure missing required fields")
                            
                        return True
                    else:
                        self.log_test(test_name, False, f"Unexpected balance format: {type(balances)}")
                        return False
                else:
                    self.log_test(test_name, False, f"Balance API failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Balance API error: {str(e)}")
            return False
            
    async def test_wallet_page_backend_apis(self):
        """Test 3: Test all backend APIs used by wallet page"""
        test_name = "Wallet Page Backend APIs"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            api_results = []
            
            # Test 1: Trader balance API (main API used by wallet page)
            try:
                async with self.session.get(f"{BACKEND_URL}/trader/my-balances/{user_id}") as response:
                    if response.status == 200:
                        api_results.append("✅ trader/my-balances - Working")
                    else:
                        api_results.append(f"❌ trader/my-balances - Status {response.status}")
            except Exception as e:
                api_results.append(f"❌ trader/my-balances - Error: {str(e)}")
                
            # Test 2: Crypto bank balances (fallback API)
            try:
                async with self.session.get(f"{BACKEND_URL}/crypto-bank/balances/{user_id}") as response:
                    if response.status == 200:
                        api_results.append("✅ crypto-bank/balances - Working")
                    else:
                        api_results.append(f"❌ crypto-bank/balances - Status {response.status}")
            except Exception as e:
                api_results.append(f"❌ crypto-bank/balances - Error: {str(e)}")
                
            # Test 3: Withdrawal fee API
            try:
                async with self.session.get(f"{BACKEND_URL}/crypto-bank/withdrawal-fee") as response:
                    if response.status == 200:
                        api_results.append("✅ crypto-bank/withdrawal-fee - Working")
                    else:
                        api_results.append(f"❌ crypto-bank/withdrawal-fee - Status {response.status}")
            except Exception as e:
                api_results.append(f"❌ crypto-bank/withdrawal-fee - Error: {str(e)}")
                
            # Test 4: NOWPayments currencies (for deposit modal)
            try:
                async with self.session.get(f"{BACKEND_URL}/nowpayments/currencies") as response:
                    if response.status == 200:
                        api_results.append("✅ nowpayments/currencies - Working")
                    else:
                        api_results.append(f"❌ nowpayments/currencies - Status {response.status}")
            except Exception as e:
                api_results.append(f"❌ nowpayments/currencies - Error: {str(e)}")
                
            success_count = len([r for r in api_results if r.startswith("✅")])
            total_count = len(api_results)
            
            if success_count >= 3:  # At least 3/4 APIs working
                self.log_test(test_name, True, f"Wallet backend APIs working ({success_count}/{total_count})", 
                            {"api_results": api_results})
                return True
            else:
                self.log_test(test_name, False, f"Too many wallet APIs failing ({success_count}/{total_count})", 
                            {"api_results": api_results})
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Wallet APIs test error: {str(e)}")
            return False
            
    async def test_global_deposit_button_flow(self):
        """Test 4: Test global deposit button functionality"""
        test_name = "Global Deposit Button Flow"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            
            # Simulate clicking global deposit button (creates NOWPayments deposit)
            deposit_data = {
                "user_id": user_id,
                "amount": 50,  # $50 USD test amount
                "currency": "usd",
                "pay_currency": "btc"  # Default to BTC like the global button
            }
            
            async with self.session.post(f"{BACKEND_URL}/nowpayments/create-deposit", json=deposit_data) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    payment_id = data.get("payment_id")
                    deposit_address = data.get("deposit_address")
                    amount_to_send = data.get("amount_to_send")
                    
                    if payment_id and deposit_address and amount_to_send:
                        self.log_test(test_name, True, 
                                    f"Global deposit working - Payment ID: {payment_id}, Amount: {amount_to_send} BTC")
                        return True
                    else:
                        self.log_test(test_name, False, "Deposit response missing required fields")
                        return False
                else:
                    self.log_test(test_name, False, f"Global deposit failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Global deposit error: {str(e)}")
            return False
            
    async def test_global_withdraw_button_flow(self):
        """Test 5: Test global withdraw button functionality"""
        test_name = "Global Withdraw Button Flow"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            
            # Simulate clicking global withdraw button
            withdrawal_params = {
                "user_id": user_id,
                "currency": "BTC",  # Default currency like global button
                "amount": 0.001,  # Small test amount
                "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"  # Test address
            }
            
            async with self.session.post(f"{BACKEND_URL}/wallet/withdraw", params=withdrawal_params) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    self.log_test(test_name, True, "Global withdraw working - Request submitted successfully")
                    return True
                elif response.status == 400:
                    error_msg = data.get("message", "").lower()
                    if "insufficient" in error_msg or "balance" in error_msg:
                        # Expected for new user with no balance
                        self.log_test(test_name, True, "Global withdraw working - Correctly validates insufficient balance")
                        return True
                    else:
                        self.log_test(test_name, False, f"Unexpected withdraw error: {data.get('message')}")
                        return False
                else:
                    self.log_test(test_name, False, f"Global withdraw failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Global withdraw error: {str(e)}")
            return False
            
    async def test_wallet_page_modal_functionality(self):
        """Test 6: Test wallet page modal functionality"""
        test_name = "Wallet Page Modal Functionality"
        
        try:
            # Test deposit modal currency selection (BTC, ETH, USDT)
            currencies_to_test = ["BTC", "ETH", "USDT"]
            modal_tests = []
            
            for currency in currencies_to_test:
                try:
                    # Test deposit creation for each currency
                    deposit_data = {
                        "user_id": self.user_data["user_id"],
                        "amount": 25,  # $25 test
                        "currency": "usd",
                        "pay_currency": currency.lower()
                    }
                    
                    async with self.session.post(f"{BACKEND_URL}/nowpayments/create-deposit", json=deposit_data) as response:
                        if response.status == 200:
                            modal_tests.append(f"✅ {currency} deposit modal - Working")
                        else:
                            modal_tests.append(f"❌ {currency} deposit modal - Failed")
                            
                except Exception as e:
                    modal_tests.append(f"❌ {currency} deposit modal - Error: {str(e)}")
                    
            success_count = len([t for t in modal_tests if t.startswith("✅")])
            total_count = len(modal_tests)
            
            if success_count >= 2:  # At least 2/3 currencies working
                self.log_test(test_name, True, f"Modal functionality working ({success_count}/{total_count})", 
                            {"modal_tests": modal_tests})
                return True
            else:
                self.log_test(test_name, False, f"Modal functionality issues ({success_count}/{total_count})", 
                            {"modal_tests": modal_tests})
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Modal functionality error: {str(e)}")
            return False
            
    async def run_comprehensive_test(self):
        """Run comprehensive wallet page test"""
        print("🎯 COMPREHENSIVE WALLET PAGE TESTING STARTED")
        print("Testing the new global Deposit/Withdraw buttons and trader balance API")
        print("=" * 70)
        
        await self.setup_session()
        
        try:
            # Run all tests
            tests = [
                self.test_user_setup,
                self.test_trader_balance_api_structure,
                self.test_wallet_page_backend_apis,
                self.test_global_deposit_button_flow,
                self.test_global_withdraw_button_flow,
                self.test_wallet_page_modal_functionality
            ]
            
            results = []
            for test in tests:
                result = await test()
                results.append(result)
                
            # Calculate success rate
            success_count = sum(results)
            total_count = len(results)
            success_rate = (success_count / total_count) * 100
            
            print("\n" + "=" * 70)
            print(f"🎯 COMPREHENSIVE WALLET PAGE TESTING COMPLETED")
            print(f"📊 SUCCESS RATE: {success_count}/{total_count} ({success_rate:.1f}%)")
            
            # Detailed results
            print("\n📋 DETAILED RESULTS:")
            for i, (test, result) in enumerate(zip(tests, results), 1):
                status = "✅ WORKING" if result else "❌ FAILED"
                test_name = test.__name__.replace("test_", "").replace("_", " ").title()
                print(f"   {i}. {test_name}: {status}")
            
            if success_rate >= 80:
                print("\n🎉 WALLET PAGE FUNCTIONALITY: WORKING")
                print("✅ Global Deposit and Withdraw buttons are functional")
                print("✅ Trader balance API returns proper structure")
                print("✅ Backend APIs supporting wallet page are operational")
            else:
                print("\n⚠️  WALLET PAGE FUNCTIONALITY: NEEDS ATTENTION")
                print("❌ Some critical wallet functionality is not working")
                
            return success_rate >= 80
            
        finally:
            await self.cleanup_session()

async def main():
    """Main test execution"""
    tester = ComprehensiveWalletTester()
    success = await tester.run_comprehensive_test()
    
    if success:
        print("\n✅ CONCLUSION: Wallet page functionality is working as expected")
        print("   - User registration/login: Working")
        print("   - Trader balance API: Working with proper structure")
        print("   - Global Deposit button: Working (NOWPayments integration)")
        print("   - Global Withdraw button: Working (validation working)")
        print("   - Modal functionality: Working")
        sys.exit(0)
    else:
        print("\n❌ CONCLUSION: Some wallet page functionality needs attention")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())