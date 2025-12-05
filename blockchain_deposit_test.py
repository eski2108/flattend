#!/usr/bin/env python3
"""
Blockchain Deposit Simulation System Test

Tests the blockchain deposit simulation system as requested:
1. GET /api/admin/liquidity-all to get current BTC balance
2. POST /api/admin/simulate-deposit with BTC 0.5
3. Verify response structure
4. Wait 35 seconds for confirmations
5. Check balance increase
6. Test with ETH 1.0
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://cryptolaunch-9.preview.emergentagent.com"

class BlockchainDepositTester:
    def __init__(self):
        self.session = None
        self.results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            for key, value in details.items():
                print(f"    {key}: {value}")
        print()
    
    async def get_liquidity_balance(self, currency):
        """Get current liquidity balance for a currency"""
        try:
            url = f"{BACKEND_URL}/api/admin/liquidity-all"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success"):
                        liquidity = data.get("liquidity", [])
                        for item in liquidity:
                            if item.get("currency") == currency:
                                return item.get("balance", 0)
                        return 0  # Currency not found, assume 0 balance
                    else:
                        self.log_result(
                            f"Get {currency} Balance",
                            False,
                            f"API returned success=false: {data.get('error', 'Unknown error')}"
                        )
                        return None
                else:
                    self.log_result(
                        f"Get {currency} Balance",
                        False,
                        f"HTTP {response.status}: {await response.text()}"
                    )
                    return None
        except Exception as e:
            self.log_result(
                f"Get {currency} Balance",
                False,
                f"Request failed: {str(e)}"
            )
            return None
    
    async def simulate_deposit(self, currency, amount):
        """Simulate a blockchain deposit"""
        try:
            url = f"{BACKEND_URL}/api/admin/simulate-deposit"
            payload = {
                "currency": currency,
                "amount": amount
            }
            
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "message": f"HTTP {response.status}: {error_text}"
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Request failed: {str(e)}"
            }
    
    async def test_btc_deposit_flow(self):
        """Test BTC deposit simulation flow"""
        print("🔸 Starting BTC Deposit Flow Test...")
        
        # Step 1: Get initial BTC balance
        print("Step 1: Getting initial BTC balance...")
        initial_balance = await self.get_liquidity_balance("BTC")
        if initial_balance is None:
            return False
        
        self.log_result(
            "Get Initial BTC Balance",
            True,
            f"Current BTC balance: {initial_balance}",
            {"initial_balance": initial_balance}
        )
        
        # Step 2: Simulate BTC deposit
        print("Step 2: Simulating BTC deposit of 0.5...")
        deposit_amount = 0.5
        deposit_result = await self.simulate_deposit("BTC", deposit_amount)
        
        if not deposit_result.get("success"):
            self.log_result(
                "Simulate BTC Deposit",
                False,
                f"Deposit simulation failed: {deposit_result.get('message')}"
            )
            return False
        
        # Step 3: Verify response structure
        required_fields = ["success", "tx_hash", "message", "confirmations"]
        missing_fields = [field for field in required_fields if field not in deposit_result]
        
        if missing_fields:
            self.log_result(
                "Verify BTC Deposit Response",
                False,
                f"Missing required fields: {missing_fields}",
                {"response": deposit_result}
            )
            return False
        
        # Verify specific response values
        if deposit_result.get("confirmations") != 0:
            self.log_result(
                "Verify BTC Deposit Response",
                False,
                f"Expected confirmations=0, got {deposit_result.get('confirmations')}",
                {"response": deposit_result}
            )
            return False
        
        tx_hash = deposit_result.get("tx_hash")
        if not tx_hash or len(tx_hash) < 16:
            self.log_result(
                "Verify BTC Deposit Response",
                False,
                f"Invalid tx_hash: {tx_hash}",
                {"response": deposit_result}
            )
            return False
        
        self.log_result(
            "Simulate BTC Deposit",
            True,
            f"Deposit initiated successfully",
            {
                "tx_hash": tx_hash,
                "confirmations": deposit_result.get("confirmations"),
                "message": deposit_result.get("message")
            }
        )
        
        # Step 4: Wait for confirmations (35 seconds as requested)
        print("Step 4: Waiting 35 seconds for blockchain confirmations...")
        await asyncio.sleep(35)
        
        # Step 5: Check balance increase
        print("Step 5: Checking balance after confirmations...")
        final_balance = await self.get_liquidity_balance("BTC")
        if final_balance is None:
            return False
        
        expected_balance = initial_balance + deposit_amount
        balance_increased = final_balance >= expected_balance
        
        self.log_result(
            "Verify BTC Balance Increase",
            balance_increased,
            f"Balance change: {initial_balance} → {final_balance} (expected: {expected_balance})",
            {
                "initial_balance": initial_balance,
                "final_balance": final_balance,
                "expected_balance": expected_balance,
                "deposit_amount": deposit_amount,
                "actual_increase": final_balance - initial_balance
            }
        )
        
        return balance_increased
    
    async def test_eth_deposit_flow(self):
        """Test ETH deposit simulation flow"""
        print("🔸 Starting ETH Deposit Flow Test...")
        
        # Step 1: Get initial ETH balance
        print("Step 1: Getting initial ETH balance...")
        initial_balance = await self.get_liquidity_balance("ETH")
        if initial_balance is None:
            return False
        
        self.log_result(
            "Get Initial ETH Balance",
            True,
            f"Current ETH balance: {initial_balance}",
            {"initial_balance": initial_balance}
        )
        
        # Step 2: Simulate ETH deposit
        print("Step 2: Simulating ETH deposit of 1.0...")
        deposit_amount = 1.0
        deposit_result = await self.simulate_deposit("ETH", deposit_amount)
        
        if not deposit_result.get("success"):
            self.log_result(
                "Simulate ETH Deposit",
                False,
                f"Deposit simulation failed: {deposit_result.get('message')}"
            )
            return False
        
        # Step 3: Verify response structure
        required_fields = ["success", "tx_hash", "message", "confirmations"]
        missing_fields = [field for field in required_fields if field not in deposit_result]
        
        if missing_fields:
            self.log_result(
                "Verify ETH Deposit Response",
                False,
                f"Missing required fields: {missing_fields}",
                {"response": deposit_result}
            )
            return False
        
        # Verify specific response values
        if deposit_result.get("confirmations") != 0:
            self.log_result(
                "Verify ETH Deposit Response",
                False,
                f"Expected confirmations=0, got {deposit_result.get('confirmations')}",
                {"response": deposit_result}
            )
            return False
        
        tx_hash = deposit_result.get("tx_hash")
        if not tx_hash or len(tx_hash) < 16:
            self.log_result(
                "Verify ETH Deposit Response",
                False,
                f"Invalid tx_hash: {tx_hash}",
                {"response": deposit_result}
            )
            return False
        
        self.log_result(
            "Simulate ETH Deposit",
            True,
            f"Deposit initiated successfully",
            {
                "tx_hash": tx_hash,
                "confirmations": deposit_result.get("confirmations"),
                "message": deposit_result.get("message")
            }
        )
        
        # Step 4: Wait for confirmations (35 seconds as requested)
        print("Step 4: Waiting 35 seconds for blockchain confirmations...")
        await asyncio.sleep(35)
        
        # Step 5: Check balance increase
        print("Step 5: Checking balance after confirmations...")
        final_balance = await self.get_liquidity_balance("ETH")
        if final_balance is None:
            return False
        
        expected_balance = initial_balance + deposit_amount
        balance_increased = final_balance >= expected_balance
        
        self.log_result(
            "Verify ETH Balance Increase",
            balance_increased,
            f"Balance change: {initial_balance} → {final_balance} (expected: {expected_balance})",
            {
                "initial_balance": initial_balance,
                "final_balance": final_balance,
                "expected_balance": expected_balance,
                "deposit_amount": deposit_amount,
                "actual_increase": final_balance - initial_balance
            }
        )
        
        return balance_increased
    
    async def test_liquidity_api_structure(self):
        """Test the liquidity API structure"""
        print("🔸 Testing Liquidity API Structure...")
        
        try:
            url = f"{BACKEND_URL}/api/admin/liquidity-all"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check basic structure
                    if not isinstance(data, dict):
                        self.log_result(
                            "Liquidity API Structure",
                            False,
                            "Response is not a JSON object"
                        )
                        return False
                    
                    if not data.get("success"):
                        self.log_result(
                            "Liquidity API Structure",
                            False,
                            f"API returned success=false: {data.get('error', 'Unknown error')}"
                        )
                        return False
                    
                    liquidity = data.get("liquidity")
                    if not isinstance(liquidity, list):
                        self.log_result(
                            "Liquidity API Structure",
                            False,
                            "Liquidity field is not an array"
                        )
                        return False
                    
                    # Check liquidity items structure
                    currencies_found = []
                    for item in liquidity:
                        if not isinstance(item, dict):
                            self.log_result(
                                "Liquidity API Structure",
                                False,
                                "Liquidity item is not an object"
                            )
                            return False
                        
                        required_fields = ["currency", "balance"]
                        missing_fields = [field for field in required_fields if field not in item]
                        if missing_fields:
                            self.log_result(
                                "Liquidity API Structure",
                                False,
                                f"Liquidity item missing fields: {missing_fields}",
                                {"item": item}
                            )
                            return False
                        
                        currencies_found.append(item["currency"])
                    
                    self.log_result(
                        "Liquidity API Structure",
                        True,
                        f"API structure valid, found {len(liquidity)} currencies",
                        {
                            "currencies": currencies_found,
                            "total_items": len(liquidity)
                        }
                    )
                    return True
                    
                else:
                    self.log_result(
                        "Liquidity API Structure",
                        False,
                        f"HTTP {response.status}: {await response.text()}"
                    )
                    return False
                    
        except Exception as e:
            self.log_result(
                "Liquidity API Structure",
                False,
                f"Request failed: {str(e)}"
            )
            return False
    
    async def run_all_tests(self):
        """Run all blockchain deposit tests"""
        print("🚀 Starting Blockchain Deposit Simulation System Tests")
        print("=" * 60)
        
        start_time = time.time()
        
        # Test 1: API Structure
        api_test = await self.test_liquidity_api_structure()
        
        # Test 2: BTC Deposit Flow
        btc_test = await self.test_btc_deposit_flow()
        
        # Test 3: ETH Deposit Flow  
        eth_test = await self.test_eth_deposit_flow()
        
        # Summary
        end_time = time.time()
        duration = end_time - start_time
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print("=" * 60)
        print("🎯 BLOCKCHAIN DEPOSIT SIMULATION TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⏱️  Duration: {duration:.1f} seconds")
        print(f"📊 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n🔍 DETAILED RESULTS:")
        for result in self.results:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} {result['test']}")
            if result["details"]:
                for key, value in result["details"].items():
                    print(f"      {key}: {value}")
        
        # Overall assessment
        critical_tests = ["Simulate BTC Deposit", "Verify BTC Balance Increase", 
                         "Simulate ETH Deposit", "Verify ETH Balance Increase"]
        critical_passed = sum(1 for r in self.results 
                            if r["test"] in critical_tests and r["success"])
        
        print(f"\n🎯 CRITICAL FUNCTIONALITY: {critical_passed}/{len(critical_tests)} tests passed")
        
        if critical_passed == len(critical_tests):
            print("✅ BLOCKCHAIN DEPOSIT SIMULATION SYSTEM IS FULLY FUNCTIONAL")
        elif critical_passed >= len(critical_tests) * 0.75:
            print("⚠️  BLOCKCHAIN DEPOSIT SIMULATION SYSTEM HAS MINOR ISSUES")
        else:
            print("❌ BLOCKCHAIN DEPOSIT SIMULATION SYSTEM HAS MAJOR ISSUES")
        
        return passed_tests == total_tests

async def main():
    """Main test execution"""
    async with BlockchainDepositTester() as tester:
        success = await tester.run_all_tests()
        return success

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        exit(1)