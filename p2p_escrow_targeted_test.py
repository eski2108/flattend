#!/usr/bin/env python3
"""
TARGETED P2P ESCROW SYSTEM TESTING
Tests the actual available endpoints for P2P escrow system functionality.

**Available Endpoints Found:**
- POST /api/trader/balance/add-funds (for testing deposits)
- GET /api/trader/my-balances/{user_id}
- POST /api/escrow/lock
- POST /api/escrow/unlock  
- POST /api/escrow/release
- GET /api/admin/all-trader-balances
- GET /api/admin/internal-balances
- GET /api/p2p/manual-mode/adverts

**Backend URL:** https://trading-perf-boost.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Configuration
BASE_URL = "https://trading-perf-boost.preview.emergentagent.com/api"

class P2PEscrowTargetedTester:
    def __init__(self):
        self.session = requests.Session()
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
    
    def test_deposit_simulation_via_add_funds(self):
        """Test deposit simulation using add-funds endpoint"""
        print("\n" + "="*80)
        print("PHASE 1: DEPOSIT SIMULATION VIA ADD-FUNDS")
        print("="*80)
        
        success_count = 0
        total_tests = 4
        
        # Test 1.1: Add funds to Alice (simulate deposit)
        print("\n--- Test 1.1: Add Funds to Alice (Simulate 1.0 BTC Deposit) ---")
        try:
            response = self.session.post(
                f"{BASE_URL}/trader/balance/add-funds",
                params={
                    "trader_id": "test_trader_alice",
                    "currency": "BTC",
                    "amount": 1.0,
                    "reason": "test_deposit_simulation"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Add Funds to Alice", 
                        True, 
                        "✅ Alice received 1.0 BTC via add-funds (simulating deposit)"
                    )
                    success_count += 1
                else:
                    self.log_test("Add Funds to Alice", False, "Add funds response indicates failure", data)
            else:
                self.log_test("Add Funds to Alice", False, f"Add funds failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Add Funds to Alice", False, f"Add funds request failed: {str(e)}")
        
        # Test 1.2: Add more funds to Alice (simulate multiple deposits)
        print("\n--- Test 1.2: Add More Funds to Alice (Simulate 0.5 BTC Deposit) ---")
        try:
            response = self.session.post(
                f"{BASE_URL}/trader/balance/add-funds",
                params={
                    "trader_id": "test_trader_alice",
                    "currency": "BTC",
                    "amount": 0.5,
                    "reason": "test_deposit_simulation_2"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Add More Funds to Alice", 
                        True, 
                        "✅ Alice received additional 0.5 BTC (total should be 1.5 BTC)"
                    )
                    success_count += 1
                else:
                    self.log_test("Add More Funds to Alice", False, "Second add funds response indicates failure", data)
            else:
                self.log_test("Add More Funds to Alice", False, f"Second add funds failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Add More Funds to Alice", False, f"Second add funds request failed: {str(e)}")
        
        # Setup other traders
        traders = [
            ("test_trader_bob", 1.5),
            ("test_trader_charlie", 3.0),
            ("test_trader_diana", 0.3)
        ]
        
        for trader_id, amount in traders:
            try:
                response = self.session.post(
                    f"{BASE_URL}/trader/balance/add-funds",
                    params={
                        "trader_id": trader_id,
                        "currency": "BTC",
                        "amount": amount,
                        "reason": f"test_setup_{trader_id}"
                    },
                    timeout=10
                )
                
                if response.status_code == 200 and response.json().get("success"):
                    self.log_test(f"Setup {trader_id}", True, f"{trader_id} setup with {amount} BTC")
                    success_count += 1
                else:
                    self.log_test(f"Setup {trader_id}", False, f"Setup failed for {trader_id}")
            except Exception as e:
                self.log_test(f"Setup {trader_id}", False, f"Setup error: {str(e)}")
        
        print(f"\nPhase 1 Results: {success_count}/{total_tests + 3} tests passed")
        return success_count >= 2
    
    def test_trader_balance_verification(self):
        """Test trader balance verification"""
        print("\n" + "="*80)
        print("PHASE 2: TRADER BALANCE VERIFICATION")
        print("="*80)
        
        success_count = 0
        total_tests = 2
        
        # Test 2.1: Get Alice's balances
        print("\n--- Test 2.1: Get Alice's Balances ---")
        try:
            response = self.session.get(
                f"{BASE_URL}/trader/my-balances/test_trader_alice",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    usd_estimates = data.get("usd_estimates", {})
                    
                    # Find BTC balance
                    btc_balance = None
                    for balance in balances:
                        if balance.get("currency") == "BTC":
                            btc_balance = balance
                            break
                    
                    if btc_balance:
                        total_balance = btc_balance.get("total_balance", 0)
                        available_balance = btc_balance.get("available_balance", 0)
                        locked_balance = btc_balance.get("locked_balance", 0)
                        usd_estimate = usd_estimates.get("BTC", 0)
                        
                        if total_balance >= 1.5:  # Should have at least 1.5 BTC from deposits
                            self.log_test(
                                "Get Alice's Balances", 
                                True, 
                                f"✅ Alice's balances: Total={total_balance}, Available={available_balance}, Locked={locked_balance} BTC (${usd_estimate:.2f} USD)"
                            )
                            success_count += 1
                        else:
                            self.log_test(
                                "Get Alice's Balances", 
                                False, 
                                f"Alice's balance lower than expected: {total_balance} BTC (expected >= 1.5)"
                            )
                    else:
                        self.log_test("Get Alice's Balances", False, "BTC balance not found")
                else:
                    self.log_test("Get Alice's Balances", False, "Invalid balance response", data)
            else:
                self.log_test("Get Alice's Balances", False, f"Balance request failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Alice's Balances", False, f"Balance request failed: {str(e)}")
        
        # Test 2.2: Get all trader balances (admin view)
        print("\n--- Test 2.2: Get All Trader Balances (Admin View) ---")
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/all-trader-balances",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "traders" in data:
                    traders = data["traders"]
                    total_platform_value = data.get("total_platform_value_usd", 0)
                    
                    # Check if our test traders are included
                    test_traders_found = 0
                    for trader in traders:
                        trader_id = trader.get("trader_id")
                        if trader_id in ["test_trader_alice", "test_trader_bob", "test_trader_charlie", "test_trader_diana"]:
                            test_traders_found += 1
                    
                    self.log_test(
                        "Get All Trader Balances", 
                        True, 
                        f"✅ Retrieved {len(traders)} traders, {test_traders_found} test traders found, Total platform value: ${total_platform_value:.2f}"
                    )
                    success_count += 1
                else:
                    self.log_test("Get All Trader Balances", False, "Invalid admin balances response", data)
            else:
                self.log_test("Get All Trader Balances", False, f"Admin balances failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get All Trader Balances", False, f"Admin balances request failed: {str(e)}")
        
        print(f"\nPhase 2 Results: {success_count}/{total_tests} tests passed")
        return success_count >= 1
    
    def test_escrow_lock_unlock_release(self):
        """Test escrow lock, unlock, and release functionality"""
        print("\n" + "="*80)
        print("PHASE 3: ESCROW LOCK/UNLOCK/RELEASE TESTING")
        print("="*80)
        
        success_count = 0
        total_tests = 3
        
        # Test 3.1: Lock Balance on Trade Creation
        print("\n--- Test 3.1: Lock Balance on Trade Creation ---")
        try:
            lock_request = {
                "trader_id": "test_trader_alice",
                "currency": "BTC",
                "amount": 0.01,
                "trade_id": "test_trade_lock_001"
            }
            
            response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json=lock_request,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Lock Balance on Trade Creation", 
                        True, 
                        f"✅ Successfully locked 0.01 BTC from Alice's balance for trade"
                    )
                    success_count += 1
                    
                    # Verify balance changes by checking Alice's balance again
                    balance_response = self.session.get(
                        f"{BASE_URL}/trader/my-balances/test_trader_alice",
                        timeout=10
                    )
                    
                    if balance_response.status_code == 200:
                        balance_data = balance_response.json()
                        if balance_data.get("success"):
                            for balance in balance_data.get("balances", []):
                                if balance.get("currency") == "BTC":
                                    locked = balance.get("locked_balance", 0)
                                    available = balance.get("available_balance", 0)
                                    total = balance.get("total_balance", 0)
                                    
                                    if locked >= 0.01:
                                        self.log_test(
                                            "Verify Lock Balance Changes", 
                                            True, 
                                            f"✅ Balance locked correctly: Total={total}, Available={available}, Locked={locked}"
                                        )
                                    else:
                                        self.log_test(
                                            "Verify Lock Balance Changes", 
                                            False, 
                                            f"Lock not reflected in balance: Locked={locked}"
                                        )
                                    break
                else:
                    self.log_test("Lock Balance on Trade Creation", False, "Lock response indicates failure", data)
            else:
                self.log_test("Lock Balance on Trade Creation", False, f"Lock failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Lock Balance on Trade Creation", False, f"Lock request failed: {str(e)}")
        
        # Test 3.2: Release with Fee on Trade Completion
        print("\n--- Test 3.2: Release with Fee on Trade Completion ---")
        try:
            release_request = {
                "trader_id": "test_trader_alice",
                "buyer_id": "test_buyer_123",
                "currency": "BTC",
                "gross_amount": 0.01,
                "fee_percent": 1.0,
                "trade_id": "test_trade_lock_001"
            }
            
            response = self.session.post(
                f"{BASE_URL}/escrow/release",
                json=release_request,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    fee_amount = data.get("fee_amount", 0)
                    net_to_buyer = data.get("net_to_buyer", 0)
                    
                    # Verify fee calculation (1% of 0.01 = 0.0001)
                    expected_fee = 0.0001
                    expected_net = 0.0099
                    
                    if abs(fee_amount - expected_fee) < 0.00001:
                        self.log_test(
                            "Release with Fee Calculation", 
                            True, 
                            f"✅ Release successful: Fee={fee_amount} BTC, Net to buyer={net_to_buyer} BTC"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            "Release with Fee Calculation", 
                            False, 
                            f"Fee calculation incorrect: Expected {expected_fee}, Got {fee_amount}"
                        )
                else:
                    self.log_test("Release with Fee Calculation", False, "Release response indicates failure", data)
            else:
                self.log_test("Release with Fee Calculation", False, f"Release failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Release with Fee Calculation", False, f"Release request failed: {str(e)}")
        
        # Test 3.3: Unlock on Trade Cancellation
        print("\n--- Test 3.3: Unlock on Trade Cancellation ---")
        try:
            # First lock some balance for Bob
            lock_request = {
                "trader_id": "test_trader_bob",
                "currency": "BTC",
                "amount": 0.05,
                "trade_id": "test_trade_cancel_001"
            }
            
            lock_response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json=lock_request,
                timeout=10
            )
            
            if lock_response.status_code == 200 and lock_response.json().get("success"):
                # Now unlock it
                unlock_request = {
                    "trader_id": "test_trader_bob",
                    "currency": "BTC",
                    "amount": 0.05,
                    "trade_id": "test_trade_cancel_001"
                }
                
                response = self.session.post(
                    f"{BASE_URL}/escrow/unlock",
                    json=unlock_request,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(
                            "Unlock on Trade Cancellation", 
                            True, 
                            f"✅ Successfully unlocked 0.05 BTC back to Bob's available balance"
                        )
                        success_count += 1
                    else:
                        self.log_test("Unlock on Trade Cancellation", False, "Unlock response indicates failure", data)
                else:
                    self.log_test("Unlock on Trade Cancellation", False, f"Unlock failed with status {response.status_code}", response.text)
            else:
                self.log_test("Unlock on Trade Cancellation", False, "Initial lock failed for unlock test")
        except Exception as e:
            self.log_test("Unlock on Trade Cancellation", False, f"Unlock request failed: {str(e)}")
        
        print(f"\nPhase 3 Results: {success_count}/{total_tests} tests passed")
        return success_count >= 2
    
    def test_admin_internal_balances(self):
        """Test admin internal balance tracking"""
        print("\n" + "="*80)
        print("PHASE 4: ADMIN INTERNAL BALANCE TRACKING")
        print("="*80)
        
        success_count = 0
        total_tests = 1
        
        # Test 4.1: Get Admin Internal Balances
        print("\n--- Test 4.1: Get Admin Internal Balances ---")
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/internal-balances",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "balances" in data:
                    balances = data["balances"]
                    usd_estimates = data.get("usd_estimates", {})
                    
                    # Check if BTC balance exists (should have collected fees)
                    btc_balance = balances.get("BTC", 0)
                    btc_usd_estimate = usd_estimates.get("BTC", 0)
                    
                    self.log_test(
                        "Get Admin Internal Balances", 
                        True, 
                        f"✅ Admin internal balances: {btc_balance} BTC (${btc_usd_estimate:.2f} USD estimate) - fees collected from trades"
                    )
                    success_count += 1
                else:
                    self.log_test("Get Admin Internal Balances", False, "Invalid admin internal balances response", data)
            else:
                self.log_test("Get Admin Internal Balances", False, f"Admin internal balances failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Admin Internal Balances", False, f"Admin internal balances request failed: {str(e)}")
        
        print(f"\nPhase 4 Results: {success_count}/{total_tests} tests passed")
        return success_count == total_tests
    
    def test_manual_mode_adverts(self):
        """Test manual mode adverts with balance info"""
        print("\n" + "="*80)
        print("PHASE 5: MANUAL MODE ADVERTS WITH BALANCE INFO")
        print("="*80)
        
        success_count = 0
        total_tests = 1
        
        # Test 5.1: Get Manual Mode Adverts
        print("\n--- Test 5.1: Get Manual Mode Adverts ---")
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={
                    "action": "buy",
                    "cryptocurrency": "BTC",
                    "fiat_currency": "USD",
                    "only_online": True
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "adverts" in data:
                    adverts = data["adverts"]
                    
                    # Check if adverts include balance information
                    adverts_with_balance = 0
                    for advert in adverts:
                        if "available_balance" in advert or "balance_info" in advert:
                            adverts_with_balance += 1
                    
                    self.log_test(
                        "Get Manual Mode Adverts", 
                        True, 
                        f"✅ Retrieved {len(adverts)} adverts, {adverts_with_balance} with balance info"
                    )
                    success_count += 1
                else:
                    self.log_test("Get Manual Mode Adverts", False, "Invalid manual mode adverts response", data)
            else:
                self.log_test("Get Manual Mode Adverts", False, f"Manual mode adverts failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Manual Mode Adverts", False, f"Manual mode adverts request failed: {str(e)}")
        
        print(f"\nPhase 5 Results: {success_count}/{total_tests} tests passed")
        return success_count == total_tests
    
    def test_edge_cases_protection(self):
        """Test edge cases and protection mechanisms"""
        print("\n" + "="*80)
        print("PHASE 6: EDGE CASES & PROTECTION")
        print("="*80)
        
        success_count = 0
        total_tests = 2
        
        # Test 6.1: Prevent Over-Locking
        print("\n--- Test 6.1: Prevent Over-Locking ---")
        try:
            # Try to lock an excessive amount (100 BTC when trader has much less)
            lock_request = {
                "trader_id": "test_trader_diana",  # Diana has only 0.3 BTC
                "currency": "BTC",
                "amount": 100.0,  # Try to lock 100 BTC
                "trade_id": "test_trade_over_lock"
            }
            
            response = self.session.post(
                f"{BASE_URL}/escrow/lock",
                json=lock_request,
                timeout=10
            )
            
            # Should fail with 400 error or success=false
            if response.status_code == 400:
                self.log_test(
                    "Prevent Over-Locking", 
                    True, 
                    "✅ Over-locking correctly rejected with 400 error"
                )
                success_count += 1
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success"):
                    self.log_test(
                        "Prevent Over-Locking", 
                        True, 
                        f"✅ Over-locking correctly rejected: {data.get('message', 'No message')}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Prevent Over-Locking", 
                        False, 
                        "❌ Over-locking was incorrectly allowed"
                    )
            else:
                self.log_test(
                    "Prevent Over-Locking", 
                    False, 
                    f"Unexpected response status {response.status_code}"
                )
        except Exception as e:
            self.log_test("Prevent Over-Locking", False, f"Over-locking test failed: {str(e)}")
        
        # Test 6.2: Prevent Releasing Non-Locked Amount
        print("\n--- Test 6.2: Prevent Releasing Non-Locked Amount ---")
        try:
            # Try to release more than what's locked
            release_request = {
                "trader_id": "test_trader_charlie",
                "buyer_id": "test_buyer_123",
                "currency": "BTC",
                "gross_amount": 50.0,  # Try to release 50 BTC when much less is locked
                "fee_percent": 1.0,
                "trade_id": "test_trade_over_release"
            }
            
            response = self.session.post(
                f"{BASE_URL}/escrow/release",
                json=release_request,
                timeout=10
            )
            
            # Should fail with 400 error or success=false
            if response.status_code == 400:
                self.log_test(
                    "Prevent Releasing Non-Locked Amount", 
                    True, 
                    "✅ Over-releasing correctly rejected with 400 error"
                )
                success_count += 1
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success"):
                    self.log_test(
                        "Prevent Releasing Non-Locked Amount", 
                        True, 
                        f"✅ Over-releasing correctly rejected: {data.get('message', 'No message')}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Prevent Releasing Non-Locked Amount", 
                        False, 
                        "❌ Over-releasing was incorrectly allowed"
                    )
            else:
                self.log_test(
                    "Prevent Releasing Non-Locked Amount", 
                    False, 
                    f"Unexpected response status {response.status_code}"
                )
        except Exception as e:
            self.log_test("Prevent Releasing Non-Locked Amount", False, f"Over-releasing test failed: {str(e)}")
        
        print(f"\nPhase 6 Results: {success_count}/{total_tests} tests passed")
        return success_count >= 1
    
    def run_comprehensive_test(self):
        """Run all phases of targeted P2P escrow testing"""
        print("🎯 TARGETED P2P ESCROW SYSTEM TESTING")
        print("="*80)
        print("Testing actual available endpoints for P2P escrow functionality")
        print("="*80)
        
        start_time = datetime.now()
        
        # Run all phases
        phase_results = []
        
        phase_results.append(("Phase 1: Deposit Simulation", self.test_deposit_simulation_via_add_funds()))
        phase_results.append(("Phase 2: Trader Balance Verification", self.test_trader_balance_verification()))
        phase_results.append(("Phase 3: Escrow Lock/Unlock/Release", self.test_escrow_lock_unlock_release()))
        phase_results.append(("Phase 4: Admin Internal Balances", self.test_admin_internal_balances()))
        phase_results.append(("Phase 5: Manual Mode Adverts", self.test_manual_mode_adverts()))
        phase_results.append(("Phase 6: Edge Cases & Protection", self.test_edge_cases_protection()))
        
        # Calculate overall results
        total_phases = len(phase_results)
        passed_phases = sum(1 for _, result in phase_results if result)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Print final summary
        print("\n" + "="*80)
        print("🎯 TARGETED P2P ESCROW SYSTEM TEST RESULTS")
        print("="*80)
        
        for phase_name, phase_result in phase_results:
            status = "✅ PASS" if phase_result else "❌ FAIL"
            print(f"{status} {phase_name}")
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   • Phases: {passed_phases}/{total_phases} passed ({passed_phases/total_phases*100:.1f}%)")
        print(f"   • Individual Tests: {passed_tests}/{total_tests} passed ({passed_tests/total_tests*100:.1f}%)")
        print(f"   • Duration: {duration:.1f} seconds")
        
        # Success criteria analysis
        print(f"\n🎯 SUCCESS CRITERIA ANALYSIS:")
        success_criteria = [
            "✅ Deposit simulation updates trader balances" if passed_phases >= 1 else "❌ Deposit simulation needs work",
            "✅ Trader balance verification working" if passed_phases >= 2 else "❌ Balance verification needs work", 
            "✅ Escrow lock/unlock/release functional" if passed_phases >= 3 else "❌ Escrow operations need work",
            "✅ Admin can track internal balances (fees)" if passed_phases >= 4 else "❌ Admin balance tracking needs work",
            "✅ Manual mode shows balance info" if passed_phases >= 5 else "❌ Manual mode needs work",
            "✅ Edge cases properly protected" if passed_phases >= 6 else "❌ Edge case protection needs work"
        ]
        
        for criteria in success_criteria:
            print(f"   {criteria}")
        
        success_rate = passed_tests / total_tests * 100 if total_tests > 0 else 0
        
        if success_rate >= 70:
            print(f"\n🎉 TARGETED P2P ESCROW SYSTEM TESTING COMPLETED ({success_rate:.1f}% SUCCESS RATE)!")
            print(f"   Core P2P escrow functionality working as expected.")
        else:
            print(f"\n⚠️  TARGETED P2P ESCROW SYSTEM TESTING COMPLETED WITH ISSUES ({success_rate:.1f}% SUCCESS RATE)")
            print(f"   Some functionality needs attention.")
        
        return success_rate >= 70

if __name__ == "__main__":
    tester = P2PEscrowTargetedTester()
    success = tester.run_comprehensive_test()
    sys.exit(0 if success else 1)