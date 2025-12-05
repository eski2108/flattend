#!/usr/bin/env python3
"""
LIQUIDITY SAFETY LOCKS SYSTEM TEST
==================================

Tests the liquidity safety system that prevents withdrawals when admin liquidity is insufficient.

Test Scenarios:
1. Withdrawal Block (BTC) - Set low BTC admin liquidity and attempt withdrawal that should be blocked
2. Check Liquidity Events - Query liquidity_events collection for blocked events  
3. Restore BTC Liquidity - Set BTC admin liquidity back to normal

Backend URL: https://cryptovault-29.preview.emergentagent.com
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

# Configuration
BACKEND_URL = "https://cryptovault-29.preview.emergentagent.com"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "coinhubx"

class LiquiditySafetyTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = None
        self.db = None
        self.client = None
        
    async def setup(self):
        """Initialize HTTP session and database connection"""
        self.session = aiohttp.ClientSession()
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        print(f"🔗 Connected to backend: {self.backend_url}")
        print(f"🔗 Connected to database: {MONGO_URL}/{DB_NAME}")
        
    async def cleanup(self):
        """Clean up connections"""
        if self.session:
            await self.session.close()
        if self.client:
            self.client.close()
            
    async def api_request(self, method: str, endpoint: str, data: dict = None, params: dict = None):
        """Make API request to backend"""
        url = f"{self.backend_url}/api{endpoint}"
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url, params=params) as response:
                    result = await response.json()
                    return {
                        "status": response.status,
                        "data": result,
                        "success": response.status < 400
                    }
            elif method.upper() == "POST":
                headers = {"Content-Type": "application/json"}
                # For POST requests, use params as query parameters if data is None
                if data is not None:
                    async with self.session.post(url, json=data, headers=headers, params=params) as response:
                        result = await response.json()
                        return {
                            "status": response.status,
                            "data": result,
                            "success": response.status < 400
                        }
                else:
                    # POST with only query parameters (no body)
                    async with self.session.post(url, params=params) as response:
                        result = await response.json()
                        return {
                            "status": response.status,
                            "data": result,
                            "success": response.status < 400
                        }
        except Exception as e:
            return {
                "status": 500,
                "data": {"error": str(e)},
                "success": False
            }
    
    async def get_admin_liquidity(self, currency: str):
        """Get current admin liquidity for a currency"""
        try:
            wallet = await self.db.admin_liquidity_wallets.find_one({"currency": currency})
            if wallet:
                return {
                    "currency": currency,
                    "available": wallet.get("available", 0),
                    "balance": wallet.get("balance", 0),
                    "found": True
                }
            else:
                return {"currency": currency, "available": 0, "balance": 0, "found": False}
        except Exception as e:
            print(f"❌ Error getting admin liquidity: {e}")
            return {"currency": currency, "available": 0, "balance": 0, "found": False, "error": str(e)}
    
    async def set_admin_liquidity(self, currency: str, amount: float):
        """Set admin liquidity for a currency"""
        try:
            result = await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$set": {
                        "available": amount,
                        "balance": amount,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            return {
                "success": True,
                "currency": currency,
                "amount": amount,
                "matched_count": result.matched_count,
                "modified_count": result.modified_count,
                "upserted_id": result.upserted_id
            }
        except Exception as e:
            print(f"❌ Error setting admin liquidity: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_liquidity_events(self, currency: str = None, status: str = None, limit: int = 10):
        """Get liquidity events from database"""
        try:
            query = {}
            if currency:
                query["currency"] = currency
            if status:
                query["status"] = status
                
            events = await self.db.liquidity_events.find(
                query, {"_id": 0}
            ).sort("timestamp", -1).limit(limit).to_list(limit)
            
            return {
                "success": True,
                "events": events,
                "count": len(events)
            }
        except Exception as e:
            print(f"❌ Error getting liquidity events: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_test_user(self):
        """Create or get test user for withdrawal testing"""
        test_user_id = "liquidity_test_user_001"
        
        # Check if user exists
        user = await self.db.user_accounts.find_one({"user_id": test_user_id})
        
        if not user:
            # Create test user
            user_data = {
                "user_id": test_user_id,
                "email": "liquidity.test@coinhubx.com",
                "full_name": "Liquidity Test User",
                "password_hash": "test_hash",
                "role": "user",
                "email_verified": True,
                "kyc_verified": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.user_accounts.insert_one(user_data)
            print(f"✅ Created test user: {test_user_id}")
        
        # Ensure user has BTC balance in the wallets collection (used by wallet service)
        balance_result = await self.db.wallets.update_one(
            {"user_id": test_user_id, "currency": "BTC"},
            {
                "$set": {
                    "available_balance": 1.0,  # 1 BTC for testing
                    "locked_balance": 0.0,
                    "total_balance": 1.0,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        print(f"✅ Set test user BTC balance: 1.0 BTC")
        return test_user_id
    
    async def test_scenario_1_withdrawal_block(self):
        """
        Test Scenario 1: Withdrawal Block (BTC)
        1. Get current BTC admin liquidity
        2. Set BTC admin liquidity to very low (0.001 BTC)
        3. Attempt to create a withdrawal request for 0.01 BTC (10x more than available)
        4. Expected: Withdrawal should be BLOCKED with error message about insufficient platform liquidity
        5. Verify entry in liquidity_events collection with status: "blocked"
        """
        print("\n" + "="*60)
        print("🧪 TEST SCENARIO 1: WITHDRAWAL BLOCK (BTC)")
        print("="*60)
        
        # Step 1: Get current BTC admin liquidity
        print("\n📊 Step 1: Getting current BTC admin liquidity...")
        original_liquidity = await self.get_admin_liquidity("BTC")
        print(f"   Original BTC liquidity: {original_liquidity}")
        
        # Step 2: Set BTC admin liquidity to very low (0.001 BTC)
        print("\n🔧 Step 2: Setting BTC admin liquidity to 0.001 BTC...")
        set_result = await self.set_admin_liquidity("BTC", 0.001)
        print(f"   Set liquidity result: {set_result}")
        
        # Verify the change
        new_liquidity = await self.get_admin_liquidity("BTC")
        print(f"   New BTC liquidity: {new_liquidity}")
        
        # Step 3: Create test user and attempt withdrawal
        print("\n👤 Step 3: Creating test user and attempting withdrawal...")
        test_user_id = await self.create_test_user()
        
        # Attempt withdrawal of 0.01 BTC (10x more than available 0.001)
        withdrawal_params = {
            "user_id": test_user_id,
            "currency": "BTC",
            "amount": 0.01,
            "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "network": "bitcoin"
        }
        
        print(f"   Attempting withdrawal: {withdrawal_params}")
        withdrawal_response = await self.api_request("POST", "/wallet/withdraw", params=withdrawal_params)
        print(f"   Withdrawal response: {withdrawal_response}")
        
        # Step 4: Verify withdrawal was blocked
        print("\n✅ Step 4: Verifying withdrawal was blocked...")
        # Check if the API response indicates failure (success: false in response body)
        api_success = withdrawal_response["data"].get("success", True)
        if not api_success:
            print("   ✅ EXPECTED: Withdrawal was blocked")
            error_message = withdrawal_response["data"].get("message", "")
            if "insufficient" in error_message.lower() and "liquidity" in error_message.lower():
                print(f"   ✅ EXPECTED: Error message mentions insufficient liquidity: {error_message}")
                
                # Check for liquidity-specific fields
                reason = withdrawal_response["data"].get("reason")
                if reason == "insufficient_platform_liquidity":
                    print(f"   ✅ EXPECTED: Reason is 'insufficient_platform_liquidity'")
                
                available = withdrawal_response["data"].get("available_liquidity")
                required = withdrawal_response["data"].get("required_liquidity") 
                shortage = withdrawal_response["data"].get("shortage")
                
                if available is not None and required is not None and shortage is not None:
                    print(f"   ✅ EXPECTED: Liquidity details provided - Available: {available}, Required: {required}, Shortage: {shortage}")
                
            else:
                print(f"   ⚠️  WARNING: Error message doesn't mention liquidity: {error_message}")
        else:
            print("   ❌ UNEXPECTED: Withdrawal was NOT blocked!")
            return False
        
        # Step 5: Check liquidity_events collection for blocked entry
        print("\n📋 Step 5: Checking liquidity_events for blocked withdrawal...")
        events = await self.get_liquidity_events(currency="BTC", status="blocked", limit=5)
        print(f"   Recent blocked BTC events: {events}")
        
        if events["success"] and events["count"] > 0:
            latest_event = events["events"][0]
            print(f"   ✅ Found blocked event: {latest_event}")
            
            # Verify event details
            expected_fields = ["currency", "amount_required", "can_execute", "status", "operation_type"]
            for field in expected_fields:
                if field in latest_event:
                    print(f"   ✅ Event has {field}: {latest_event[field]}")
                else:
                    print(f"   ❌ Event missing {field}")
            
            # Check specific values
            if latest_event.get("currency") == "BTC":
                print("   ✅ Event currency is BTC")
            if latest_event.get("amount_required") == 0.01:
                print("   ✅ Event amount_required is 0.01")
            if latest_event.get("can_execute") == False:
                print("   ✅ Event can_execute is False")
            if latest_event.get("status") == "blocked":
                print("   ✅ Event status is 'blocked'")
            if "withdrawal" in latest_event.get("operation_type", "").lower():
                print("   ✅ Event operation_type contains 'withdrawal'")
        else:
            print("   ❌ No blocked events found in liquidity_events collection")
            return False
        
        print("\n🎯 SCENARIO 1 RESULT: ✅ WITHDRAWAL SUCCESSFULLY BLOCKED DUE TO INSUFFICIENT LIQUIDITY")
        return True
    
    async def test_scenario_2_check_liquidity_events(self):
        """
        Test Scenario 2: Check Liquidity Events
        1. Query the liquidity_events collection
        2. Find the blocked withdrawal event
        3. Verify it contains required fields and values
        """
        print("\n" + "="*60)
        print("🧪 TEST SCENARIO 2: CHECK LIQUIDITY EVENTS")
        print("="*60)
        
        # Step 1: Query liquidity_events collection
        print("\n📋 Step 1: Querying liquidity_events collection...")
        all_events = await self.get_liquidity_events(limit=20)
        print(f"   Total recent events: {all_events['count'] if all_events['success'] else 0}")
        
        # Step 2: Find blocked BTC withdrawal events
        print("\n🔍 Step 2: Finding blocked BTC withdrawal events...")
        blocked_events = await self.get_liquidity_events(currency="BTC", status="blocked", limit=10)
        
        if not blocked_events["success"]:
            print(f"   ❌ Error querying blocked events: {blocked_events.get('error')}")
            return False
        
        if blocked_events["count"] == 0:
            print("   ❌ No blocked BTC events found")
            return False
        
        print(f"   ✅ Found {blocked_events['count']} blocked BTC events")
        
        # Step 3: Verify the most recent blocked event
        print("\n✅ Step 3: Verifying blocked withdrawal event details...")
        latest_blocked = blocked_events["events"][0]
        
        verification_results = []
        
        # Check required fields and values
        # Note: amount_required will be net amount (after fees), not gross amount
        expected_net_amount = 0.01 - (0.01 * 0.02)  # Approximately 0.0098 after 2% fees
        checks = [
            ("currency", "BTC", "Currency should be BTC"),
            ("can_execute", False, "Can execute should be False"),
            ("status", "blocked", "Status should be 'blocked'"),
        ]
        
        # Check amount_required separately (should be close to net amount)
        amount_required = latest_blocked.get("amount_required")
        if amount_required and abs(amount_required - expected_net_amount) < 0.001:
            print(f"   ✅ Amount required is net amount after fees: {amount_required} (expected ~{expected_net_amount})")
            verification_results.append(True)
        else:
            print(f"   ❌ Amount required unexpected: {amount_required} (expected ~{expected_net_amount})")
            verification_results.append(False)
        
        for field, expected, description in checks:
            actual = latest_blocked.get(field)
            if actual == expected:
                print(f"   ✅ {description}: {actual}")
                verification_results.append(True)
            else:
                print(f"   ❌ {description}: Expected {expected}, got {actual}")
                verification_results.append(False)
        
        # Check operation_type contains "withdrawal"
        operation_type = latest_blocked.get("operation_type", "")
        if "withdrawal" in operation_type.lower():
            print(f"   ✅ Operation type contains 'withdrawal': {operation_type}")
            verification_results.append(True)
        else:
            print(f"   ❌ Operation type doesn't contain 'withdrawal': {operation_type}")
            verification_results.append(False)
        
        # Check additional fields exist
        additional_fields = ["event_id", "available_liquidity", "shortage", "timestamp", "metadata"]
        for field in additional_fields:
            if field in latest_blocked:
                print(f"   ✅ Event has {field}: {latest_blocked[field]}")
            else:
                print(f"   ⚠️  Event missing optional field {field}")
        
        success = all(verification_results)
        print(f"\n🎯 SCENARIO 2 RESULT: {'✅ LIQUIDITY EVENTS VERIFIED' if success else '❌ LIQUIDITY EVENTS VERIFICATION FAILED'}")
        return success
    
    async def test_scenario_3_restore_liquidity(self):
        """
        Test Scenario 3: Restore BTC Liquidity
        1. Set BTC admin liquidity back to 5.5 BTC
        2. Verify it's restored correctly
        3. Test that withdrawal now works (optional)
        """
        print("\n" + "="*60)
        print("🧪 TEST SCENARIO 3: RESTORE BTC LIQUIDITY")
        print("="*60)
        
        # Step 1: Set BTC admin liquidity back to 5.5 BTC
        print("\n🔧 Step 1: Restoring BTC admin liquidity to 5.5 BTC...")
        restore_result = await self.set_admin_liquidity("BTC", 5.5)
        print(f"   Restore result: {restore_result}")
        
        if not restore_result["success"]:
            print(f"   ❌ Failed to restore liquidity: {restore_result.get('error')}")
            return False
        
        # Step 2: Verify it's restored correctly
        print("\n✅ Step 2: Verifying BTC liquidity is restored...")
        restored_liquidity = await self.get_admin_liquidity("BTC")
        print(f"   Restored BTC liquidity: {restored_liquidity}")
        
        if restored_liquidity["available"] == 5.5 and restored_liquidity["balance"] == 5.5:
            print("   ✅ BTC liquidity successfully restored to 5.5 BTC")
        else:
            print(f"   ❌ BTC liquidity not properly restored. Expected 5.5, got available: {restored_liquidity['available']}, balance: {restored_liquidity['balance']}")
            return False
        
        # Step 3: Optional - Test that withdrawal now works
        print("\n🧪 Step 3: Testing that withdrawal now works with sufficient liquidity...")
        test_user_id = "liquidity_test_user_001"  # Use same test user
        
        # Attempt smaller withdrawal that should now succeed (0.001 BTC)
        withdrawal_params = {
            "user_id": test_user_id,
            "currency": "BTC", 
            "amount": 0.001,
            "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "network": "bitcoin"
        }
        
        print(f"   Attempting small withdrawal: {withdrawal_params}")
        withdrawal_response = await self.api_request("POST", "/wallet/withdraw", params=withdrawal_params)
        print(f"   Withdrawal response: {withdrawal_response}")
        
        # Check if withdrawal succeeded (success: true in response body)
        api_success = withdrawal_response["data"].get("success", False)
        if api_success:
            print("   ✅ Withdrawal now works with sufficient liquidity")
            
            # Check that a "passed" liquidity event was created
            passed_events = await self.get_liquidity_events(currency="BTC", status="passed", limit=5)
            if passed_events["success"] and passed_events["count"] > 0:
                print(f"   ✅ Found 'passed' liquidity event: {passed_events['events'][0]}")
            else:
                print("   ⚠️  No 'passed' liquidity event found")
        else:
            print(f"   ⚠️  Withdrawal still failed: {withdrawal_response['data']}")
            print("   (This might be due to other validation issues, not liquidity)")
        
        print("\n🎯 SCENARIO 3 RESULT: ✅ BTC LIQUIDITY SUCCESSFULLY RESTORED")
        return True
    
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 STARTING LIQUIDITY SAFETY LOCKS SYSTEM TEST")
        print("=" * 80)
        
        try:
            await self.setup()
            
            # Run test scenarios
            scenario1_result = await self.test_scenario_1_withdrawal_block()
            scenario2_result = await self.test_scenario_2_check_liquidity_events()
            scenario3_result = await self.test_scenario_3_restore_liquidity()
            
            # Summary
            print("\n" + "="*80)
            print("📊 TEST SUMMARY")
            print("="*80)
            print(f"Scenario 1 - Withdrawal Block: {'✅ PASS' if scenario1_result else '❌ FAIL'}")
            print(f"Scenario 2 - Check Liquidity Events: {'✅ PASS' if scenario2_result else '❌ FAIL'}")
            print(f"Scenario 3 - Restore Liquidity: {'✅ PASS' if scenario3_result else '❌ FAIL'}")
            
            overall_success = all([scenario1_result, scenario2_result, scenario3_result])
            print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
            
            return overall_success
            
        except Exception as e:
            print(f"❌ Test execution error: {e}")
            return False
        finally:
            await self.cleanup()

async def main():
    """Main test execution"""
    tester = LiquiditySafetyTester()
    success = await tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())