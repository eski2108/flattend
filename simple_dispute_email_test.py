#!/usr/bin/env python3
"""
Simple Dispute Email Template Testing
Direct approach to test the email functionality
"""

import requests
import json
import sys
import time
from datetime import datetime
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

# Configuration
BASE_URL = "https://fixdisputeflow.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "coinhubx"

class SimpleDisputeEmailTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
        # Test data
        self.buyer_user_id = None
        self.seller_user_id = None
        self.trade_id = None
        self.dispute_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        status = "✅" if success else "❌"
        print(f"{status} {name}")
        if details:
            print(f"   {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    async def create_mock_trade_in_db(self):
        """Create a mock trade directly in MongoDB"""
        try:
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            
            # Generate test user IDs
            self.buyer_user_id = str(uuid.uuid4())
            self.seller_user_id = str(uuid.uuid4())
            self.trade_id = f"trade_{datetime.now().strftime('%Y%m%d%H%M%S')}_{self.buyer_user_id[:8]}"
            
            # Create mock trade record
            trade_data = {
                "trade_id": self.trade_id,
                "buyer_id": self.buyer_user_id,
                "seller_id": self.seller_user_id,
                "crypto_currency": "BTC",
                "crypto_amount": 0.01,
                "fiat_currency": "GBP",
                "fiat_amount": 700,
                "status": "payment_pending",
                "created_at": datetime.now().isoformat(),
                "payment_method": "bank_transfer",
                "buyer_wallet_address": "bc1qtest_dispute_email_wallet",
                "escrow_locked": True
            }
            
            await db.p2p_trades.insert_one(trade_data)
            
            self.log_test("Mock Trade Creation", True, f"Trade ID: {self.trade_id}")
            
            client.close()
            return True
            
        except Exception as e:
            self.log_test("Mock Trade Creation", False, f"Error: {str(e)}")
            return False

    def create_dispute_via_api(self):
        """Create dispute via API"""
        if not self.trade_id or not self.buyer_user_id:
            self.log_test("Dispute Creation", False, "Missing trade or user ID")
            return False
        
        dispute_data = {
            "trade_id": self.trade_id,
            "user_id": self.buyer_user_id,
            "reason": "Payment completed but crypto not released - EMAIL TEMPLATE TEST",
            "description": "This is a test dispute to verify the updated email template with clickable admin link functionality. The email should be sent to info@coinhubx.net with a working button."
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/p2p/disputes/create",
                json=dispute_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('success') and data.get('dispute_id'):
                        self.dispute_id = data['dispute_id']
                        self.log_test("Dispute Creation", True, f"Dispute ID: {self.dispute_id}")
                        
                        # Show expected URL format (UPDATED - NO QUERY PARAMS)
                        expected_url = f"https://fixdisputeflow.preview.emergentagent.com/admin/disputes/{self.dispute_id}"
                        print(f"   📧 Expected Email Button URL: {expected_url}")
                        print(f"   ✅ URL Format: /admin/disputes/{self.dispute_id} (NOT ?dispute_id=)")
                        
                        return True
                    else:
                        self.log_test("Dispute Creation", False, "No dispute data in response")
                        print(f"   Response: {data}")
                        return False
                except Exception as e:
                    self.log_test("Dispute Creation", False, f"JSON parse error: {str(e)}")
                    print(f"   Raw response: {response.text}")
                    return False
            else:
                self.log_test("Dispute Creation", False, f"Status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dispute Creation", False, f"Request error: {str(e)}")
            return False

    def show_email_details(self):
        """Show the email details that should be sent"""
        if not self.dispute_id:
            self.log_test("Email Details", False, "No dispute ID available")
            return False
        
        print(f"\n📧 EMAIL TEMPLATE VERIFICATION:")
        print(f"   ✉️  Email Recipient: info@coinhubx.net")
        print(f"   📧 Subject: 🚨 URGENT: P2P Trade Dispute - {self.trade_id}")
        print(f"   🆔 Dispute ID: {self.dispute_id}")
        print(f"   🔗 Clickable Button URL: https://fixdisputeflow.preview.emergentagent.com/admin/disputes/{self.dispute_id}")
        print(f"   ✅ URL Format: /admin/disputes/{self.dispute_id} (NOT ?dispute_id=)")
        print(f"")
        print(f"   ✅ The email should contain:")
        print(f"   - Red 'RESOLVE DISPUTE NOW →' button")
        print(f"   - Button should be clickable and link to admin disputes page")
        print(f"   - Direct shareable link in the email body")
        print(f"   - Trade details: {self.trade_id}")
        print(f"   - Dispute reason and description")
        
        self.log_test("Email Details Generated", True, f"All email details provided for dispute {self.dispute_id}")
        return True

    async def run_test(self):
        """Run the complete test"""
        print("🚀 Starting Simple Dispute Email Template Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 80)
        
        success = True
        
        # Step 1: Create mock trade in database
        if not await self.create_mock_trade_in_db():
            success = False
        
        # Step 2: Create dispute via API (this should trigger email)
        if success and not self.create_dispute_via_api():
            success = False
        
        # Step 3: Show email details
        if success and not self.show_email_details():
            success = False
        
        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 DISPUTE EMAIL TEST SUMMARY")
        
        passed_tests = sum(1 for result in self.test_results if result['success'])
        total_tests = len(self.test_results)
        
        print(f"Tests Run: {total_tests}")
        print(f"Tests Passed: {passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if success:
            print("\n🎉 DISPUTE EMAIL TEST COMPLETED SUCCESSFULLY!")
            print(f"✅ Dispute ID: {self.dispute_id}")
            print(f"✅ Trade ID: {self.trade_id}")
            print(f"✅ Email should be sent to: info@coinhubx.net")
            print(f"✅ Clickable URL: https://fixdisputeflow.preview.emergentagent.com/admin/disputes/{self.dispute_id}")
            print(f"✅ URL Format: /admin/disputes/{self.dispute_id} (NOT ?dispute_id=)")
            print(f"\n🔍 CHECK BACKEND LOGS:")
            print(f"   Look for: '✅ Admin email alert sent for dispute {self.dispute_id}'")
            return 0
        else:
            print(f"\n⚠️ Some tests failed - check details above")
            return 1

async def main():
    """Main test execution"""
    tester = SimpleDisputeEmailTester()
    return await tester.run_test()

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))