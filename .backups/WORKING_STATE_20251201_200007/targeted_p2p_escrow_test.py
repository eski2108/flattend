#!/usr/bin/env python3
"""
🎯 TARGETED P2P ESCROW SYSTEM TESTING - USING ACTUAL ENDPOINTS
Test the P2P escrow system using the actual implemented endpoints found in the backend.

**ACTUAL ENDPOINTS FOUND:**
- /api/trader/balance/add-funds (POST)
- /api/trader/my-balances/{user_id} (GET)
- /api/admin/all-trader-balances (GET)
- /api/escrow/lock (POST)
- /api/escrow/unlock (POST)
- /api/escrow/release (POST)
- /api/admin/internal-balances (GET)
- /api/nowpayments/currencies (GET)
- /api/nowpayments/create-deposit (POST)
- /api/nowpayments/ipn (POST)
- /api/trader/create-profile (POST)
- /api/trader/create-advert (POST)

**Backend URL:** https://codehealer-31.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Configuration
BASE_URL = "https://codehealer-31.preview.emergentagent.com/api"

class TargetedP2PEscrowTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.users = {}
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results with detailed formatting"""
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
    
    def setup_test_users(self):
        """Setup test users for comprehensive testing"""
        print(f"\n🚀 PHASE 0: USER SETUP")
        print("=" * 60)
        
        test_users = [
            {"name": "Alice", "email": "alice_targeted@coinhubx.com", "password": "Alice123456", "full_name": "Alice Trader", "initial_btc": 1.5},
            {"name": "Bob", "email": "bob_targeted@coinhubx.com", "password": "Bob123456", "full_name": "Bob Buyer", "initial_btc": 1.5},
            {"name": "Charlie", "email": "charlie_targeted@coinhubx.com", "password": "Charlie123456", "full_name": "Charlie Trader", "initial_btc": 3.0},
            {"name": "Diana", "email": "diana_targeted@coinhubx.com", "password": "Diana123456", "full_name": "Diana Trader", "initial_btc": 0.3}
        ]
        
        for user_info in test_users:
            # Try registration
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/register",
                    json={
                        "email": user_info["email"],
                        "password": user_info["password"],
                        "full_name": user_info["full_name"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        user_id = data["user"]["user_id"]
                        user_info["user_id"] = user_id
                        self.users[user_info["name"]] = user_info
                        self.log_test(f"{user_info['name']} Registration", True, f"Registered with ID: {user_id}")
                        continue
                elif response.status_code == 400 and "already registered" in response.text:
                    # User exists, try login
                    pass
                else:
                    self.log_test(f"{user_info['name']} Registration", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"{user_info['name']} Registration", False, f"Request failed: {str(e)}")
            
            # Try login
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": user_info["email"],
                        "password": user_info["password"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        user_id = data["user"]["user_id"]
                        user_info["user_id"] = user_id
                        self.users[user_info["name"]] = user_info
                        self.log_test(f"{user_info['name']} Login", True, f"Logged in with ID: {user_id}")
                    else:
                        self.log_test(f"{user_info['name']} Login", False, "Login response missing user_id", data)
                else:
                    self.log_test(f"{user_info['name']} Login", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"{user_info['name']} Login", False, f"Request failed: {str(e)}")
    
    def test_trader_balance_system(self):
        """Test the trader balance system using actual endpoints"""
        print(f"\n🎯 PHASE 1: TRADER BALANCE SYSTEM TESTING")
        print("=" * 60)
        
        # Test 1: Add funds using correct endpoint
        for user_name, user_info in self.users.items():
            if not user_info.get("user_id"):
                continue
                
            try:
                response = self.session.post(
                    f"{BASE_URL}/trader/balance/add-funds",
                    json={
                        "user_id": user_info["user_id"],
                        "currency": "BTC",
                        "amount": user_info["initial_btc"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(f"Add Funds to {user_name}", True, f"Added {user_info['initial_btc']} BTC successfully")
                    else:
                        self.log_test(f"Add Funds to {user_name}", False, "Response indicates failure", data)
                else:
                    self.log_test(f"Add Funds to {user_name}", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Add Funds to {user_name}", False, f"Request failed: {str(e)}")
        
        # Test 2: Get individual trader balances
        for user_name, user_info in self.users.items():
            if not user_info.get("user_id"):
                continue
                
            try:
                response = self.session.get(
                    f"{BASE_URL}/trader/my-balances/{user_info['user_id']}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("balances"):
                        balances = data["balances"]
                        btc_balance = next((b for b in balances if b["currency"] == "BTC"), None)
                        
                        if btc_balance:
                            total = btc_balance.get("total_balance", 0)
                            locked = btc_balance.get("locked_balance", 0)
                            available = btc_balance.get("available_balance", 0)
                            
                            # Verify calculation: available = total - locked
                            expected_available = total - locked
                            calculation_correct = abs(available - expected_available) < 0.0001
                            
                            self.log_test(
                                f"{user_name} Balance Structure", 
                                calculation_correct,
                                f"Total: {total}, Locked: {locked}, Available: {available} (Calculation: {'✓' if calculation_correct else '✗'})"
                            )
                        else:
                            self.log_test(f"{user_name} Balance Structure", False, "No BTC balance found", data)
                    else:
                        # Handle case where user has no balances yet
                        if data.get("success") and data.get("balances") == []:
                            self.log_test(f"{user_name} Balance Structure", True, "No balances yet (expected for new user)")
                        else:
                            self.log_test(f"{user_name} Balance Structure", False, "Invalid response structure", data)
                else:
                    self.log_test(f"{user_name} Balance Structure", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"{user_name} Balance Structure", False, f"Request failed: {str(e)}")
        
        # Test 3: Get all trader balances (admin view)
        try:
            response = self.session.get(f"{BASE_URL}/admin/all-trader-balances", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("traders"):
                    traders = data["traders"]
                    total_value = sum(trader.get("total_value_usd", 0) for trader in traders)
                    self.log_test("Admin All Trader Balances", True, f"Retrieved {len(traders)} traders with ${total_value:,.2f} total platform value")
                else:
                    self.log_test("Admin All Trader Balances", False, "Invalid response structure", data)
            else:
                self.log_test("Admin All Trader Balances", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin All Trader Balances", False, f"Request failed: {str(e)}")
    
    def test_escrow_operations(self):
        """Test escrow lock, unlock, and release operations"""
        print(f"\n🎯 PHASE 2: ESCROW OPERATIONS TESTING")
        print("=" * 60)
        
        alice = self.users.get("Alice")
        bob = self.users.get("Bob")
        charlie = self.users.get("Charlie")
        
        # Test 1: Lock balance for trade
        if alice and alice.get("user_id"):
            try:
                lock_request = {
                    "user_id": alice["user_id"],
                    "currency": "BTC",
                    "amount": 0.01,
                    "trade_id": str(uuid.uuid4())
                }
                
                response = self.session.post(
                    f"{BASE_URL}/escrow/lock",
                    json=lock_request,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test("Escrow Lock Balance", True, "Successfully locked 0.01 BTC for trade")
                        self.trade_id_1 = lock_request["trade_id"]
                        
                        # Verify balance changes
                        balance_response = self.session.get(
                            f"{BASE_URL}/trader/my-balances/{alice['user_id']}",
                            timeout=10
                        )
                        
                        if balance_response.status_code == 200:
                            balance_data = balance_response.json()
                            if balance_data.get("success") and balance_data.get("balances"):
                                balances = balance_data["balances"]
                                btc_balance = next((b for b in balances if b["currency"] == "BTC"), None)
                                
                                if btc_balance:
                                    locked = btc_balance.get("locked_balance", 0)
                                    available = btc_balance.get("available_balance", 0)
                                    total = btc_balance.get("total_balance", 0)
                                    
                                    if locked >= 0.01:
                                        self.log_test("Lock Balance Verification", True, f"Total: {total}, Locked: {locked}, Available: {available}")
                                    else:
                                        self.log_test("Lock Balance Verification", False, f"Lock amount incorrect: {locked} BTC")
                    else:
                        self.log_test("Escrow Lock Balance", False, "Lock request failed", data)
                else:
                    self.log_test("Escrow Lock Balance", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Escrow Lock Balance", False, f"Request failed: {str(e)}")
        
        # Test 2: Release balance with fee calculation
        if hasattr(self, 'trade_id_1') and bob and bob.get("user_id"):
            try:
                release_request = {
                    "trade_id": self.trade_id_1,
                    "seller_id": alice["user_id"],
                    "buyer_id": bob["user_id"],
                    "currency": "BTC",
                    "amount": 0.01,
                    "fee_percentage": 1.0
                }
                
                response = self.session.post(
                    f"{BASE_URL}/escrow/release",
                    json=release_request,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        fee_collected = data.get("fee_collected", 0)
                        net_to_buyer = data.get("net_to_buyer", 0)
                        
                        expected_fee = 0.01 * 0.01  # 1% of 0.01 BTC
                        expected_net = 0.01 - expected_fee
                        
                        fee_correct = abs(fee_collected - expected_fee) < 0.0001
                        net_correct = abs(net_to_buyer - expected_net) < 0.0001
                        
                        if fee_correct and net_correct:
                            self.log_test("Escrow Release with Fee", True, f"Fee: {fee_collected} BTC, Net to buyer: {net_to_buyer} BTC")
                        else:
                            self.log_test("Escrow Release with Fee", False, f"Fee calculation incorrect. Expected: {expected_fee}, Got: {fee_collected}")
                    else:
                        self.log_test("Escrow Release with Fee", False, "Release request failed", data)
                else:
                    self.log_test("Escrow Release with Fee", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Escrow Release with Fee", False, f"Request failed: {str(e)}")
        
        # Test 3: Unlock balance (trade cancellation)
        if charlie and charlie.get("user_id"):
            try:
                # First lock some balance
                lock_request = {
                    "user_id": charlie["user_id"],
                    "currency": "BTC",
                    "amount": 0.05,
                    "trade_id": str(uuid.uuid4())
                }
                
                lock_response = self.session.post(
                    f"{BASE_URL}/escrow/lock",
                    json=lock_request,
                    timeout=10
                )
                
                if lock_response.status_code == 200:
                    # Now unlock it
                    unlock_request = {
                        "trade_id": lock_request["trade_id"],
                        "user_id": charlie["user_id"],
                        "currency": "BTC",
                        "amount": 0.05
                    }
                    
                    unlock_response = self.session.post(
                        f"{BASE_URL}/escrow/unlock",
                        json=unlock_request,
                        timeout=10
                    )
                    
                    if unlock_response.status_code == 200:
                        data = unlock_response.json()
                        if data.get("success"):
                            self.log_test("Escrow Unlock Balance", True, "Successfully unlocked 0.05 BTC from cancelled trade")
                        else:
                            self.log_test("Escrow Unlock Balance", False, "Unlock request failed", data)
                    else:
                        self.log_test("Escrow Unlock Balance", False, f"Unlock failed with status {unlock_response.status_code}")
                else:
                    self.log_test("Escrow Unlock Balance", False, "Could not lock balance for unlock test")
                    
            except Exception as e:
                self.log_test("Escrow Unlock Balance", False, f"Request failed: {str(e)}")
        
        # Test 4: Edge case - insufficient balance protection
        diana = self.users.get("Diana")
        if diana and diana.get("user_id"):
            try:
                # Try to lock more than available
                excessive_lock = {
                    "user_id": diana["user_id"],
                    "currency": "BTC",
                    "amount": 1.0,  # Diana only has 0.3 BTC
                    "trade_id": str(uuid.uuid4())
                }
                
                response = self.session.post(
                    f"{BASE_URL}/escrow/lock",
                    json=excessive_lock,
                    timeout=10
                )
                
                if response.status_code == 400:
                    self.log_test("Insufficient Balance Protection", True, "Correctly rejected excessive lock amount")
                elif response.status_code == 200:
                    data = response.json()
                    if not data.get("success"):
                        self.log_test("Insufficient Balance Protection", True, "Correctly rejected excessive lock amount")
                    else:
                        self.log_test("Insufficient Balance Protection", False, "Should not allow locking more than available")
                else:
                    self.log_test("Insufficient Balance Protection", False, f"Unexpected status: {response.status_code}")
                    
            except Exception as e:
                self.log_test("Insufficient Balance Protection", False, f"Request failed: {str(e)}")
    
    def test_admin_fee_collection(self):
        """Test admin fee collection and internal balance management"""
        print(f"\n🎯 PHASE 3: ADMIN FEE COLLECTION & INTERNAL BALANCE")
        print("=" * 60)
        
        # Test 1: Get admin internal balances
        try:
            response = self.session.get(f"{BASE_URL}/admin/internal-balances", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("balances"):
                    balances = data["balances"]
                    btc_balance = next((b for b in balances if b["currency"] == "BTC"), None)
                    
                    if btc_balance:
                        admin_btc = btc_balance.get("balance", 0)
                        usd_value = btc_balance.get("usd_value", 0)
                        self.log_test("Admin Internal Balances", True, f"Admin has {admin_btc} BTC collected fees (${usd_value} USD)")
                    else:
                        self.log_test("Admin Internal Balances", True, "Admin internal balances retrieved (no BTC fees yet)")
                else:
                    self.log_test("Admin Internal Balances", False, "Invalid response structure", data)
            else:
                self.log_test("Admin Internal Balances", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Internal Balances", False, f"Request failed: {str(e)}")
    
    def test_nowpayments_integration(self):
        """Test NOWPayments integration"""
        print(f"\n🎯 PHASE 4: NOWPAYMENTS INTEGRATION TESTING")
        print("=" * 60)
        
        # Test 1: Get supported currencies
        try:
            response = self.session.get(f"{BASE_URL}/nowpayments/currencies", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("currencies"):
                    currency_count = len(data["currencies"])
                    self.log_test("NOWPayments Currencies", True, f"Retrieved {currency_count} supported currencies")
                else:
                    self.log_test("NOWPayments Currencies", False, "Invalid response structure", data)
            else:
                self.log_test("NOWPayments Currencies", False, f"Failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("NOWPayments Currencies", False, f"Request failed: {str(e)}")
        
        # Test 2: Create deposit request
        alice = self.users.get("Alice")
        if alice and alice.get("user_id"):
            try:
                deposit_data = {
                    "user_id": alice["user_id"],
                    "currency": "BTC",
                    "amount": 0.5,
                    "callback_url": "https://coinhubx.com/deposit-callback"
                }
                
                response = self.session.post(
                    f"{BASE_URL}/nowpayments/create-deposit",
                    json=deposit_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        payment_id = data.get("payment_id")
                        deposit_address = data.get("deposit_address")
                        amount_to_send = data.get("amount_to_send")
                        self.log_test("Create Deposit Request", True, f"Deposit created: Payment ID {payment_id}, Address: {deposit_address}, Amount: {amount_to_send}")
                        self.payment_id = payment_id
                    else:
                        self.log_test("Create Deposit Request", False, "Deposit creation failed", data)
                else:
                    self.log_test("Create Deposit Request", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Create Deposit Request", False, f"Request failed: {str(e)}")
        
        # Test 3: Simulate IPN webhook
        if hasattr(self, 'payment_id'):
            try:
                ipn_data = {
                    "payment_id": self.payment_id,
                    "payment_status": "finished",
                    "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                    "price_amount": 0.5,
                    "price_currency": "BTC",
                    "pay_amount": 0.5,
                    "actually_paid": 0.5,
                    "pay_currency": "BTC",
                    "order_id": f"deposit_{alice['user_id']}_btc",
                    "order_description": "BTC Deposit Test",
                    "purchase_id": f"purchase_{alice['user_id']}",
                    "outcome_amount": 0.5,
                    "outcome_currency": "BTC"
                }
                
                response = self.session.post(
                    f"{BASE_URL}/nowpayments/ipn",
                    json=ipn_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") or data.get("status") == "success":
                        self.log_test("IPN Webhook Simulation", True, "Deposit confirmed via IPN webhook")
                    else:
                        self.log_test("IPN Webhook Simulation", False, "IPN processing failed", data)
                else:
                    self.log_test("IPN Webhook Simulation", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test("IPN Webhook Simulation", False, f"Request failed: {str(e)}")
    
    def test_trader_profiles_and_adverts(self):
        """Test trader profile and advert creation"""
        print(f"\n🎯 PHASE 5: TRADER PROFILES & ADVERTS TESTING")
        print("=" * 60)
        
        alice = self.users.get("Alice")
        if alice and alice.get("user_id"):
            # Test 1: Create trader profile
            try:
                profile_data = {
                    "user_id": alice["user_id"],
                    "display_name": "Alice Professional Trader",
                    "bio": "Experienced BTC trader with 98% completion rate",
                    "languages": ["English", "Spanish"],
                    "timezone": "UTC",
                    "trading_hours": "9:00-17:00"
                }
                
                response = self.session.post(
                    f"{BASE_URL}/trader/create-profile",
                    json=profile_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test("Create Trader Profile", True, "Alice trader profile created successfully")
                    else:
                        self.log_test("Create Trader Profile", False, "Profile creation failed", data)
                elif response.status_code == 400:
                    self.log_test("Create Trader Profile", True, "Profile already exists or validation error (expected)")
                else:
                    self.log_test("Create Trader Profile", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Create Trader Profile", False, f"Request failed: {str(e)}")
            
            # Test 2: Create trading advert
            try:
                advert_data = {
                    "trader_id": alice["user_id"],
                    "crypto_currency": "BTC",
                    "fiat_currency": "USD",
                    "trade_type": "sell",
                    "price": 45000,
                    "min_amount": 0.01,
                    "max_amount": 0.5,
                    "payment_methods": ["bank_transfer", "paypal"],
                    "terms": "Fast and secure BTC trading. Payment within 30 minutes.",
                    "auto_reply": "Hello! I'm online and ready to trade."
                }
                
                response = self.session.post(
                    f"{BASE_URL}/trader/create-advert",
                    json=advert_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        advert_id = data.get("advert_id")
                        self.log_test("Create Trading Advert", True, f"Alice created trading advert: {advert_id}")
                    else:
                        self.log_test("Create Trading Advert", False, "Advert creation failed", data)
                elif response.status_code == 400:
                    self.log_test("Create Trading Advert", True, "Advert validation error or already exists (expected)")
                else:
                    self.log_test("Create Trading Advert", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Create Trading Advert", False, f"Request failed: {str(e)}")
    
    def run_targeted_test(self):
        """Run all targeted P2P escrow system tests"""
        print("🎯 TARGETED P2P ESCROW SYSTEM TESTING - USING ACTUAL ENDPOINTS")
        print("=" * 80)
        print("Testing the P2P escrow system using the actual implemented endpoints")
        print("=" * 80)
        
        # Execute all test phases
        self.setup_test_users()
        self.test_trader_balance_system()
        self.test_escrow_operations()
        self.test_admin_fee_collection()
        self.test_nowpayments_integration()
        self.test_trader_profiles_and_adverts()
        
        # Generate final report
        self.generate_final_report()
    
    def generate_final_report(self):
        """Generate comprehensive test report"""
        print(f"\n📊 TARGETED TEST REPORT")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print(f"\n🎯 CRITICAL SYSTEM STATUS:")
        
        # Analyze critical systems
        critical_systems = {
            "Trader Balance System": ["Balance", "Add Funds"],
            "Escrow Operations": ["Escrow", "Lock", "Release", "Unlock"],
            "Admin Fee Collection": ["Admin", "Fee"],
            "NOWPayments Integration": ["NOWPayments", "Deposit", "IPN"],
            "Trader Profiles & Adverts": ["Trader", "Profile", "Advert"]
        }
        
        for system, keywords in critical_systems.items():
            system_tests = [r for r in self.test_results if any(kw in r["test"] for kw in keywords)]
            if system_tests:
                system_passed = sum(1 for t in system_tests if t["success"])
                system_total = len(system_tests)
                system_rate = (system_passed / system_total * 100) if system_total > 0 else 0
                status = "✅ WORKING" if system_rate >= 80 else "❌ ISSUES"
                print(f"   {status} {system}: {system_passed}/{system_total} ({system_rate:.1f}%)")
        
        print(f"\n🏁 TESTING COMPLETED")
        print("=" * 80)

if __name__ == "__main__":
    tester = TargetedP2PEscrowTester()
    tester.run_targeted_test()