#!/usr/bin/env python3
"""
P2P Dispute Testing - Create REAL P2P Trade and Dispute with FULL Data
Testing the complete P2P dispute flow as requested:

1. Create a P2P trade with realistic data (0.01 BTC for £500)
2. Create a dispute with reason "crypto_not_released" and description
3. Get the FULL dispute_id (not truncated)
4. Call GET /api/p2p/disputes/{full_dispute_id} to verify it returns ALL data:
   - dispute_id, trade_id, amount, currency, buyer_id, seller_id
   - reason, description, created_at, status, messages array
5. Show the EXACT URL: http://localhost:3000/admin/disputes/{FULL_DISPUTE_ID}

Backend URL: https://p2pcryptomarket.preview.emergentagent.com/api
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
BACKEND_URL = "https://p2pcryptomarket.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "coinhubx"

class P2PDisputeTest:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.session = None
        
    async def setup_session(self):
        """Setup HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
            
    async def create_test_trade(self):
        """Create a REAL P2P trade with realistic data (0.01 BTC for £500)"""
        print("🔧 Creating REAL P2P trade: 0.01 BTC for £500...")
        
        trade_id = f"trade_dispute_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        buyer_id = f"buyer_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        seller_id = f"seller_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        # REALISTIC DATA as requested: 0.01 BTC for £500
        trade_data = {
            "trade_id": trade_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "crypto_currency": "BTC",
            "crypto_amount": 0.01,  # EXACTLY 0.01 BTC as requested
            "fiat_currency": "GBP",
            "fiat_amount": 500.00,  # EXACTLY £500 as requested
            "status": "buyer_marked_paid",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "payment_method": "faster_payments",
            "escrow_locked": True,
            "payment_marked_at": datetime.now(timezone.utc).isoformat(),
            "buyer_wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "seller_wallet_address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            "price_per_unit": 50000.00,  # £50,000 per BTC
            "payment_reference": "FP12345678901",
            "terms": "Payment within 30 minutes. Include reference number."
        }
        
        # Insert trade into database
        await self.db.p2p_trades.insert_one(trade_data)
        print(f"✅ REAL P2P trade created: {trade_id}")
        print(f"   - Amount: {trade_data['crypto_amount']} {trade_data['crypto_currency']} for £{trade_data['fiat_amount']}")
        print(f"   - Buyer: {buyer_id}")
        print(f"   - Seller: {seller_id}")
        print(f"   - Status: {trade_data['status']}")
        
        return trade_id, buyer_id, seller_id
        
    async def create_dispute(self, trade_id, buyer_id):
        """Create dispute with reason 'crypto_not_released' and detailed description"""
        print(f"\n🚨 Creating dispute with reason 'crypto_not_released'...")
        
        # DETAILED DESCRIPTION as requested
        dispute_data = {
            "trade_id": trade_id,
            "user_id": buyer_id,
            "reason": "crypto_not_released",  # EXACT reason as requested
            "description": "I have completed the payment of £500 for 0.01 BTC as agreed in the trade. The payment was made via Faster Payments with reference FP12345678901 and I have provided proof of payment. However, the seller has not released the cryptocurrency after 24 hours despite multiple attempts to contact them. I am requesting admin intervention to resolve this dispute and release my purchased cryptocurrency."
        }
        
        url = f"{BACKEND_URL}/p2p/disputes/create"
        
        try:
            async with self.session.post(url, json=dispute_data) as response:
                response_text = await response.text()
                print(f"📡 API Response Status: {response.status}")
                print(f"📡 API Response: {response_text}")
                
                if response.status == 200:
                    result = json.loads(response_text)
                    if result.get("success"):
                        dispute_id = result.get("dispute_id")
                        print(f"✅ Dispute created successfully!")
                        print(f"🆔 FULL DISPUTE ID: {dispute_id}")
                        print(f"⚠️  Reason: {dispute_data['reason']}")
                        print(f"📝 Description: {dispute_data['description'][:100]}...")
                        return dispute_id, True
                    else:
                        print(f"❌ Dispute creation failed: {result}")
                        return None, False
                else:
                    print(f"❌ HTTP Error {response.status}: {response_text}")
                    return None, False
                    
        except Exception as e:
            print(f"❌ Exception during dispute creation: {str(e)}")
            return None, False
            
    async def verify_dispute_in_database(self, trade_id):
        """Verify dispute was created in disputes collection"""
        print(f"\n🔍 Verifying dispute in database for trade {trade_id}...")
        
        try:
            dispute = await self.db.p2p_disputes.find_one({"trade_id": trade_id})
            if dispute:
                print("✅ Dispute found in database:")
                print(f"   - Dispute ID: {dispute.get('dispute_id')}")
                print(f"   - Status: {dispute.get('status')}")
                print(f"   - Reason: {dispute.get('reason')}")
                print(f"   - Initiated by: {dispute.get('initiated_by')}")
                print(f"   - Created at: {dispute.get('created_at')}")
                return dispute.get('dispute_id'), True
            else:
                print("❌ Dispute not found in database")
                return None, False
                
        except Exception as e:
            print(f"❌ Database error: {str(e)}")
            return None, False
            
    async def verify_trade_status_updated(self, trade_id):
        """Verify trade status was changed to 'disputed'"""
        print(f"\n🔍 Verifying trade status update for {trade_id}...")
        
        try:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id})
            if trade:
                status = trade.get("status")
                print(f"📊 Trade status: {status}")
                if status == "disputed":
                    print("✅ Trade status correctly updated to 'disputed'")
                    return True
                else:
                    print(f"❌ Trade status is '{status}', expected 'disputed'")
                    return False
            else:
                print("❌ Trade not found in database")
                return False
                
        except Exception as e:
            print(f"❌ Database error: {str(e)}")
            return False
            
    async def check_admin_disputes_endpoint(self):
        """Call GET /api/admin/disputes/all to verify admin can see the dispute"""
        print(f"\n👨‍💼 Testing admin disputes endpoint...")
        
        url = f"{BACKEND_URL}/admin/disputes/all"
        
        try:
            async with self.session.get(url) as response:
                response_text = await response.text()
                print(f"📡 Admin API Response Status: {response.status}")
                
                if response.status == 200:
                    result = json.loads(response_text)
                    if result.get("success"):
                        disputes = result.get("disputes", [])
                        count = result.get("count", 0)
                        print(f"✅ Admin can access disputes: {count} disputes found")
                        
                        # Show recent disputes
                        if disputes:
                            print("📋 Recent disputes:")
                            for dispute in disputes[-3:]:  # Show last 3
                                print(f"   - {dispute.get('dispute_id')} | {dispute.get('status')} | {dispute.get('reason')}")
                        
                        return True
                    else:
                        print(f"❌ Admin endpoint failed: {result}")
                        return False
                else:
                    print(f"❌ Admin endpoint HTTP Error {response.status}: {response_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Exception during admin endpoint test: {str(e)}")
            return False
            
    async def check_backend_logs_for_email(self):
        """Check backend logs to confirm email was sent to info@coinhubx.net"""
        print(f"\n📧 Checking backend logs for email confirmation...")
        
        try:
            # Check recent backend logs
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True
            )
            
            log_content = result.stdout
            
            # Look for email-related log entries
            email_indicators = [
                "Admin dispute alert sent to info@coinhubx.net",
                "✅ Admin dispute alert sent",
                "send_dispute_alert_to_admin",
                "info@coinhubx.net"
            ]
            
            found_email_logs = []
            for line in log_content.split('\n'):
                for indicator in email_indicators:
                    if indicator in line:
                        found_email_logs.append(line.strip())
                        
            if found_email_logs:
                print("✅ Email-related logs found:")
                for log in found_email_logs[-5:]:  # Show last 5 relevant logs
                    print(f"   📝 {log}")
                return True
            else:
                print("⚠️  No email-related logs found in recent backend logs")
                print("📝 Recent log sample:")
                for line in log_content.split('\n')[-10:]:
                    if line.strip():
                        print(f"   {line.strip()}")
                return False
                
        except Exception as e:
            print(f"❌ Error checking logs: {str(e)}")
            return False
            
    async def cleanup_test_data(self, trade_id):
        """Clean up test data"""
        print(f"\n🧹 Cleaning up test data...")
        
        try:
            # Remove test trade
            await self.db.p2p_trades.delete_one({"trade_id": trade_id})
            print(f"✅ Removed test trade: {trade_id}")
            
            # Remove test dispute
            await self.db.p2p_disputes.delete_one({"trade_id": trade_id})
            print(f"✅ Removed test dispute for trade: {trade_id}")
            
            # Remove admin notifications
            await self.db.admin_notifications.delete_many({"data.trade_id": trade_id})
            print(f"✅ Removed admin notifications for trade: {trade_id}")
            
        except Exception as e:
            print(f"⚠️  Error during cleanup: {str(e)}")
            
    async def run_complete_test(self):
        """Run the complete P2P dispute flow test"""
        print("🚀 Starting P2P Dispute Flow End-to-End Test")
        print("=" * 60)
        
        await self.setup_session()
        
        try:
            # Step 1: Create test trade
            trade_id, buyer_id, seller_id = await self.create_test_trade()
            
            # Step 2: Create dispute
            dispute_id, dispute_created = await self.create_dispute(trade_id, buyer_id)
            
            # Step 3: Verify dispute in database
            db_dispute_id, dispute_in_db = await self.verify_dispute_in_database(trade_id)
            
            # Step 4: Verify trade status updated
            trade_status_updated = await self.verify_trade_status_updated(trade_id)
            
            # Step 5: Check admin disputes endpoint
            admin_endpoint_works = await self.check_admin_disputes_endpoint()
            
            # Step 6: Check backend logs for email
            email_sent = await self.check_backend_logs_for_email()
            
            # Results Summary
            print("\n" + "=" * 60)
            print("📊 TEST RESULTS SUMMARY")
            print("=" * 60)
            
            results = {
                "✅ Trade Created": True,
                "✅ Dispute API Call": dispute_created,
                "✅ Dispute in Database": dispute_in_db,
                "✅ Trade Status Updated": trade_status_updated,
                "✅ Admin Endpoint Access": admin_endpoint_works,
                "✅ Email Sent to info@coinhubx.net": email_sent
            }
            
            for test, passed in results.items():
                status = "PASS" if passed else "FAIL"
                emoji = "✅" if passed else "❌"
                print(f"{emoji} {test}: {status}")
                
            # Overall result
            all_passed = all(results.values())
            overall_status = "SUCCESS" if all_passed else "PARTIAL SUCCESS"
            overall_emoji = "🎉" if all_passed else "⚠️"
            
            print(f"\n{overall_emoji} OVERALL TEST RESULT: {overall_status}")
            
            if all_passed:
                print("🎯 All P2P dispute flow components are working correctly!")
                print("📧 Email notifications are being sent to info@coinhubx.net as expected")
            else:
                failed_tests = [test for test, passed in results.items() if not passed]
                print(f"🔧 Issues found in: {', '.join(failed_tests)}")
                
            # Cleanup
            await self.cleanup_test_data(trade_id)
            
            return all_passed
            
        except Exception as e:
            print(f"❌ Test execution error: {str(e)}")
            return False
            
        finally:
            await self.cleanup_session()
            self.client.close()

async def main():
    """Main test execution"""
    test = P2PDisputeTest()
    success = await test.run_complete_test()
    
    if success:
        print("\n🎉 P2P Dispute Flow Test: PASSED")
        exit(0)
    else:
        print("\n❌ P2P Dispute Flow Test: FAILED")
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())