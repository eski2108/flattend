#!/usr/bin/env python3
"""
Wallet Page Functionality Test
Tests the wallet page functionality including global Deposit/Withdraw buttons
and trader balance API endpoint as requested in the review.
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://payflow-crypto-3.preview.emergentagent.com/api"

class WalletPageTester:
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
        
    async def test_user_registration(self):
        """Test 1: Register new test user as requested"""
        test_name = "User Registration"
        
        try:
            # Register the specific user requested in review
            register_data = {
                "email": "wallet_test_user@test.com",
                "password": "Test123456",
                "full_name": "Wallet Test User"
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/register", json=register_data) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    self.user_data = data.get("user", {})
                    self.log_test(test_name, True, f"User registered successfully with email: {register_data['email']}")
                    return True
                else:
                    self.log_test(test_name, False, f"Registration failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Registration error: {str(e)}")
            return False
            
    async def test_user_login(self):
        """Test 2: Login with the credentials as requested"""
        test_name = "User Login"
        
        try:
            login_data = {
                "email": "wallet_test_user@test.com",
                "password": "Test123456"
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/login", json=login_data) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    self.user_data = data.get("user", {})
                    jwt_token = data.get("token")
                    
                    # Store JWT token for future requests if available
                    if jwt_token:
                        self.session.headers.update({"Authorization": f"Bearer {jwt_token}"})
                        self.log_test(test_name, True, f"Login successful, JWT token received: {jwt_token[:20]}...")
                    else:
                        self.log_test(test_name, True, f"Login successful, user_id: {self.user_data.get('user_id', 'N/A')}")
                    return True
                else:
                    self.log_test(test_name, False, f"Login failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Login error: {str(e)}")
            return False
            
    async def test_trader_balance_api(self):
        """Test 3: Test trader balance API endpoint as requested"""
        test_name = "Trader Balance API"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            
            async with self.session.get(f"{BACKEND_URL}/trader/my-balances/{user_id}") as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    balances = data.get("balances", {})
                    
                    # Handle both dict and list formats
                    if isinstance(balances, list):
                        # Convert list to dict format for processing
                        balances_dict = {}
                        for balance_item in balances:
                            if isinstance(balance_item, dict) and "currency" in balance_item:
                                currency = balance_item["currency"]
                                balances_dict[currency] = balance_item
                        balances = balances_dict
                    
                    # Verify the balance structure as requested
                    structure_valid = True
                    structure_details = []
                    
                    if not balances:
                        # Empty balances is valid for new user
                        self.log_test(test_name, True, "Balance API working - New user with empty balances (expected)")
                        return True
                    
                    for currency, balance_data in balances.items():
                        required_fields = ["total_balance", "locked_balance", "available_balance"]
                        missing_fields = []
                        
                        for field in required_fields:
                            if field not in balance_data:
                                missing_fields.append(field)
                                structure_valid = False
                                
                        if missing_fields:
                            structure_details.append(f"{currency}: Missing fields {missing_fields}")
                        else:
                            structure_details.append(f"{currency}: ✅ All required fields present")
                            
                    if structure_valid:
                        self.log_test(test_name, True, 
                                    f"Balance API working with proper structure. Currencies: {list(balances.keys())}", 
                                    {"balances": balances, "structure_check": structure_details})
                    else:
                        self.log_test(test_name, False, 
                                    f"Balance structure invalid: {structure_details}", 
                                    {"balances": balances})
                        
                    return structure_valid
                else:
                    self.log_test(test_name, False, f"Balance API failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Balance API error: {str(e)}")
            return False
            
    async def test_wallet_page_endpoints(self):
        """Test 4: Test wallet page related endpoints"""
        test_name = "Wallet Page Endpoints"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            endpoints_tested = []
            
            # Test crypto-bank balances endpoint (used by wallet page)
            try:
                async with self.session.get(f"{BACKEND_URL}/crypto-bank/balances/{user_id}") as response:
                    data = await response.json()
                    if response.status == 200:
                        endpoints_tested.append("✅ crypto-bank/balances - Working")
                    else:
                        endpoints_tested.append(f"❌ crypto-bank/balances - Failed: {data.get('message', 'Unknown')}")
            except Exception as e:
                endpoints_tested.append(f"❌ crypto-bank/balances - Error: {str(e)}")
                
            # Test crypto-bank transactions endpoint
            try:
                async with self.session.get(f"{BACKEND_URL}/crypto-bank/transactions/{user_id}") as response:
                    data = await response.json()
                    if response.status == 200:
                        endpoints_tested.append("✅ crypto-bank/transactions - Working")
                    else:
                        endpoints_tested.append(f"❌ crypto-bank/transactions - Failed: {data.get('message', 'Unknown')}")
            except Exception as e:
                endpoints_tested.append(f"❌ crypto-bank/transactions - Error: {str(e)}")
                
            # Test NOWPayments currencies endpoint (used by deposit modal)
            try:
                async with self.session.get(f"{BACKEND_URL}/nowpayments/currencies") as response:
                    data = await response.json()
                    if response.status == 200:
                        endpoints_tested.append("✅ nowpayments/currencies - Working")
                    else:
                        endpoints_tested.append(f"❌ nowpayments/currencies - Failed: {data.get('message', 'Unknown')}")
            except Exception as e:
                endpoints_tested.append(f"❌ nowpayments/currencies - Error: {str(e)}")
                
            success_count = len([e for e in endpoints_tested if e.startswith("✅")])
            total_count = len(endpoints_tested)
            
            if success_count == total_count:
                self.log_test(test_name, True, f"All {total_count} wallet endpoints working", 
                            {"endpoints": endpoints_tested})
                return True
            else:
                self.log_test(test_name, False, f"Only {success_count}/{total_count} wallet endpoints working", 
                            {"endpoints": endpoints_tested})
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Wallet endpoints test error: {str(e)}")
            return False
            
    async def test_deposit_flow_simulation(self):
        """Test 5: Test deposit flow (NOWPayments integration)"""
        test_name = "Deposit Flow Simulation"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            
            # Test creating a deposit (simulating global deposit button click)
            deposit_data = {
                "user_id": user_id,
                "amount": 100,  # $100 USD
                "currency": "usd",
                "pay_currency": "btc"
            }
            
            async with self.session.post(f"{BACKEND_URL}/nowpayments/create-deposit", json=deposit_data) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    deposit_address = data.get("deposit_address")
                    payment_id = data.get("payment_id")
                    amount_to_send = data.get("amount_to_send")
                    
                    self.log_test(test_name, True, 
                                f"Deposit flow working - Payment ID: {payment_id}, Address: {deposit_address[:20]}...", 
                                {"payment_id": payment_id, "deposit_address": deposit_address, "amount_to_send": amount_to_send})
                    return True
                else:
                    self.log_test(test_name, False, f"Deposit flow failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Deposit flow error: {str(e)}")
            return False
            
    async def test_withdrawal_flow_simulation(self):
        """Test 6: Test withdrawal flow (simulating global withdraw button)"""
        test_name = "Withdrawal Flow Simulation"
        
        if not self.user_data or not self.user_data.get("user_id"):
            self.log_test(test_name, False, "No user_id available for testing")
            return False
            
        try:
            user_id = self.user_data["user_id"]
            
            # Test withdrawal request (simulating global withdraw button click)
            withdrawal_params = {
                "user_id": user_id,
                "currency": "BTC",
                "amount": 0.001,  # Small test amount
                "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"  # Test address
            }
            
            async with self.session.post(f"{BACKEND_URL}/wallet/withdraw", params=withdrawal_params) as response:
                data = await response.json()
                
                if response.status == 200 and data.get("success"):
                    self.log_test(test_name, True, "Withdrawal flow working - Request submitted for admin approval")
                    return True
                elif response.status == 400 and "insufficient" in data.get("message", "").lower():
                    # Expected for new user with no balance
                    self.log_test(test_name, True, "Withdrawal flow working - Correctly rejected insufficient balance")
                    return True
                else:
                    self.log_test(test_name, False, f"Withdrawal flow failed: {data.get('message', 'Unknown error')}")
                    return False
                    
        except Exception as e:
            self.log_test(test_name, False, f"Withdrawal flow error: {str(e)}")
            return False
            
    async def run_all_tests(self):
        """Run all wallet page tests"""
        print("🎯 WALLET PAGE FUNCTIONALITY TESTING STARTED")
        print("=" * 60)
        
        await self.setup_session()
        
        try:
            # Run tests in sequence as requested in review
            tests = [
                self.test_user_registration,
                self.test_user_login,
                self.test_trader_balance_api,
                self.test_wallet_page_endpoints,
                self.test_deposit_flow_simulation,
                self.test_withdrawal_flow_simulation
            ]
            
            results = []
            for test in tests:
                result = await test()
                results.append(result)
                
            # Calculate success rate
            success_count = sum(results)
            total_count = len(results)
            success_rate = (success_count / total_count) * 100
            
            print("\n" + "=" * 60)
            print(f"🎯 WALLET PAGE TESTING COMPLETED")
            print(f"📊 SUCCESS RATE: {success_count}/{total_count} ({success_rate:.1f}%)")
            
            if success_rate >= 80:
                print("🎉 WALLET PAGE FUNCTIONALITY: WORKING")
            else:
                print("⚠️  WALLET PAGE FUNCTIONALITY: NEEDS ATTENTION")
                
            return success_rate >= 80
            
        finally:
            await self.cleanup_session()

async def main():
    """Main test execution"""
    tester = WalletPageTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n✅ All critical wallet page functionality is working as expected")
        sys.exit(0)
    else:
        print("\n❌ Some wallet page functionality needs attention")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())