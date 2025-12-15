#!/usr/bin/env python3
"""
P2P TRADE CHAT SYSTEM COMPREHENSIVE TESTING - FIXED VERSION
Tests the complete P2P trade chat system with buyer-seller flow as requested:

**Test Flow:**
1. Create test buyer and seller users
2. Create a P2P trade between them
3. Verify chat system creates "Trade opened" system message
4. Send messages from buyer: "Hi, I'm making the payment now"
5. Send messages from seller: "Okay, I will release once I confirm"
6. Buyer marks trade as paid - verify system messages appear
7. Seller sends message: "Payment received, releasing now"
8. Get all chat messages and verify:
   - System messages appear (Trade opened, Buyer marked paid, etc.)
   - Buyer and seller messages are correct
   - Timestamps are present
   - Message types are correct

**Endpoints to test:**
- POST /api/trade/chat/send
- GET /api/trade/chat/{trade_id}?user_id={user_id}
- GET /api/trade/chat/unread-count/{trade_id}
- POST /api/p2p/create-trade (should auto-create system message)
- POST /api/p2p/mark-paid (should auto-create system messages)

**Backend URL:** https://neon-finance-5.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://neon-finance-5.preview.emergentagent.com/api"

# Test Users for P2P Chat Testing
BUYER_USER = {
    "email": "p2p_buyer_chat_fixed@test.com",
    "password": "Buyer123456",
    "full_name": "P2P Chat Buyer Fixed",
    "wallet_address": "p2p_buyer_chat_wallet_fixed_001"
}

SELLER_USER = {
    "email": "p2p_seller_chat_fixed@test.com", 
    "password": "Seller123456",
    "full_name": "P2P Chat Seller Fixed",
    "wallet_address": "p2p_seller_chat_wallet_fixed_001"
}

class P2PChatTesterFixed:
    def __init__(self):
        self.session = requests.Session()
        self.buyer_user_id = None
        self.seller_user_id = None
        self.sell_order_id = None
        self.trade_id = None
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
    
    def test_user_registration_and_login(self, user_data, user_type):
        """Test user registration and login"""
        print(f"\n=== Testing {user_type} Registration & Login ===")
        
        # Try registration first
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    if user_type == "Buyer":
                        self.buyer_user_id = user_id
                    elif user_type == "Seller":
                        self.seller_user_id = user_id
                        
                    self.log_test(
                        f"{user_type} Registration", 
                        True, 
                        f"{user_type} registered successfully with ID: {user_id}"
                    )
                    return True
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try login
                pass
        except Exception as e:
            pass
        
        # Try login
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": user_data["email"],
                    "password": user_data["password"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    if user_type == "Buyer":
                        self.buyer_user_id = user_id
                    elif user_type == "Seller":
                        self.seller_user_id = user_id
                        
                    self.log_test(
                        f"{user_type} Login", 
                        True, 
                        f"{user_type} login successful, user_id: {user_id}"
                    )
                    return True
                else:
                    self.log_test(
                        f"{user_type} Login", 
                        False, 
                        "Login response missing success or user_id",
                        data
                    )
            else:
                self.log_test(
                    f"{user_type} Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                f"{user_type} Login", 
                False, 
                f"Login request failed: {str(e)}"
            )
            
        return False
    
    def setup_crypto_balances(self):
        """Setup crypto balances for both users"""
        print("\n=== Setting Up Crypto Balances ===")
        
        success = True
        
        # Give seller some BTC to sell
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-bank/deposit",
                json={
                    "user_id": self.seller_user_id,
                    "currency": "BTC",
                    "amount": 1.0
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Seller BTC Deposit", True, "Seller received 1.0 BTC for selling")
            else:
                self.log_test("Seller BTC Deposit", False, f"Failed with status {response.status_code}")
                success = False
        except Exception as e:
            self.log_test("Seller BTC Deposit", False, f"Request failed: {str(e)}")
            success = False
        
        return success
    
    def test_create_enhanced_sell_offer(self):
        """Create enhanced P2P sell offer"""
        print("\n=== Testing Create Enhanced P2P Sell Offer ===")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-offer",
                json={
                    "seller_id": self.seller_user_id,
                    "crypto_currency": "BTC",
                    "crypto_amount": 0.5,
                    "fiat_currency": "GBP",
                    "price_per_unit": 45000.0,  # £45,000 per BTC
                    "min_purchase": 0.1,
                    "max_purchase": 0.5,
                    "payment_methods": ["faster_payments", "paypal"],
                    "seller_requirements": []
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("offer", {}).get("order_id"):
                    self.sell_order_id = data["offer"]["order_id"]
                    self.log_test(
                        "Create Enhanced Sell Offer", 
                        True, 
                        f"Enhanced sell offer created: 0.5 BTC at £45,000 each (Order ID: {self.sell_order_id})"
                    )
                    return True
                else:
                    self.log_test(
                        "Create Enhanced Sell Offer", 
                        False, 
                        "Sell offer response missing success or order_id",
                        data
                    )
            else:
                self.log_test(
                    "Create Enhanced Sell Offer", 
                    False, 
                    f"Sell offer creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Enhanced Sell Offer", 
                False, 
                f"Sell offer request failed: {str(e)}"
            )
            
        return False
    
    def test_create_p2p_trade(self):
        """Create P2P trade (should auto-create system message)"""
        print("\n=== Testing Create P2P Trade ===")
        
        if not self.sell_order_id:
            self.log_test(
                "Create P2P Trade", 
                False, 
                "Cannot create trade - no sell order ID available"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-trade",
                json={
                    "buyer_id": self.buyer_user_id,
                    "sell_order_id": self.sell_order_id,
                    "crypto_amount": 0.2,  # Buy 0.2 BTC
                    "payment_method": "faster_payments"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("trade", {}).get("trade_id"):
                    self.trade_id = data["trade"]["trade_id"]
                    trade_status = data["trade"].get("status", "unknown")
                    fiat_amount = data["trade"].get("fiat_amount", 0)
                    
                    self.log_test(
                        "Create P2P Trade", 
                        True, 
                        f"P2P trade created successfully - Trade ID: {self.trade_id}, Status: {trade_status}, Amount: £{fiat_amount}"
                    )
                    return True
                else:
                    self.log_test(
                        "Create P2P Trade", 
                        False, 
                        "Trade response missing success or trade_id",
                        data
                    )
            else:
                self.log_test(
                    "Create P2P Trade", 
                    False, 
                    f"Trade creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create P2P Trade", 
                False, 
                f"Trade creation request failed: {str(e)}"
            )
            
        return False
    
    def test_get_initial_chat_messages(self):
        """Test getting initial chat messages (should include 'Trade opened' system message)"""
        print("\n=== Testing Get Initial Chat Messages ===")
        
        if not self.trade_id:
            self.log_test(
                "Get Initial Chat Messages", 
                False, 
                "Cannot get chat messages - no trade ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/trade/chat/{self.trade_id}",
                params={"user_id": self.buyer_user_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "messages" in data:
                    messages = data["messages"]
                    
                    # Look for system message about trade opened
                    system_messages = [msg for msg in messages if msg.get("sender_type") == "system"]
                    trade_opened_msg = next((msg for msg in system_messages if "trade opened" in msg.get("content", "").lower()), None)
                    
                    if trade_opened_msg:
                        self.log_test(
                            "Get Initial Chat Messages", 
                            True, 
                            f"Found {len(messages)} initial messages including 'Trade opened' system message"
                        )
                        return True
                    else:
                        self.log_test(
                            "Get Initial Chat Messages", 
                            False, 
                            f"Found {len(messages)} messages but no 'Trade opened' system message",
                            messages
                        )
                else:
                    self.log_test(
                        "Get Initial Chat Messages", 
                        False, 
                        "Chat messages response missing success or messages",
                        data
                    )
            else:
                self.log_test(
                    "Get Initial Chat Messages", 
                    False, 
                    f"Get chat messages failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Initial Chat Messages", 
                False, 
                f"Get chat messages request failed: {str(e)}"
            )
            
        return False
    
    def test_send_buyer_message(self):
        """Test buyer sending message: 'Hi, I'm making the payment now'"""
        print("\n=== Testing Send Buyer Message ===")
        
        if not self.trade_id or not self.buyer_user_id:
            self.log_test(
                "Send Buyer Message", 
                False, 
                "Cannot send buyer message - missing trade ID or buyer user ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trade/chat/send",
                json={
                    "trade_id": self.trade_id,
                    "user_id": self.buyer_user_id,
                    "message": "Hi, I'm making the payment now"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("message_id"):
                    message_id = data["message_id"]
                    self.log_test(
                        "Send Buyer Message", 
                        True, 
                        f"Buyer message sent successfully - Message ID: {message_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Send Buyer Message", 
                        False, 
                        "Send message response missing success or message_id",
                        data
                    )
            else:
                self.log_test(
                    "Send Buyer Message", 
                    False, 
                    f"Send buyer message failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Send Buyer Message", 
                False, 
                f"Send buyer message request failed: {str(e)}"
            )
            
        return False
    
    def test_send_seller_message(self):
        """Test seller sending message: 'Okay, I will release once I confirm'"""
        print("\n=== Testing Send Seller Message ===")
        
        if not self.trade_id or not self.seller_user_id:
            self.log_test(
                "Send Seller Message", 
                False, 
                "Cannot send seller message - missing trade ID or seller user ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trade/chat/send",
                json={
                    "trade_id": self.trade_id,
                    "user_id": self.seller_user_id,
                    "message": "Okay, I will release once I confirm"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("message_id"):
                    message_id = data["message_id"]
                    self.log_test(
                        "Send Seller Message", 
                        True, 
                        f"Seller message sent successfully - Message ID: {message_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Send Seller Message", 
                        False, 
                        "Send message response missing success or message_id",
                        data
                    )
            else:
                self.log_test(
                    "Send Seller Message", 
                    False, 
                    f"Send seller message failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Send Seller Message", 
                False, 
                f"Send seller message request failed: {str(e)}"
            )
            
        return False
    
    def test_mark_trade_as_paid(self):
        """Test buyer marking trade as paid (should create system messages)"""
        print("\n=== Testing Mark Trade as Paid ===")
        
        if not self.trade_id or not self.buyer_user_id:
            self.log_test(
                "Mark Trade as Paid", 
                False, 
                "Cannot mark as paid - missing trade ID or buyer user ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/mark-paid",
                json={
                    "trade_id": self.trade_id,
                    "buyer_id": self.buyer_user_id,
                    "payment_reference": "BANK_TRANSFER_P2P_CHAT_TEST_FIXED_12345"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Mark Trade as Paid", 
                        True, 
                        "Trade marked as paid successfully (should create system messages)"
                    )
                    return True
                else:
                    self.log_test(
                        "Mark Trade as Paid", 
                        False, 
                        "Mark as paid response indicates failure",
                        data
                    )
            else:
                self.log_test(
                    "Mark Trade as Paid", 
                    False, 
                    f"Mark as paid failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Mark Trade as Paid", 
                False, 
                f"Mark as paid request failed: {str(e)}"
            )
            
        return False
    
    def test_send_seller_payment_received_message(self):
        """Test seller sending message: 'Payment received, releasing now'"""
        print("\n=== Testing Send Seller Payment Received Message ===")
        
        if not self.trade_id or not self.seller_user_id:
            self.log_test(
                "Send Seller Payment Received Message", 
                False, 
                "Cannot send seller message - missing trade ID or seller user ID"
            )
            return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/trade/chat/send",
                json={
                    "trade_id": self.trade_id,
                    "user_id": self.seller_user_id,
                    "message": "Payment received, releasing now"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("message_id"):
                    message_id = data["message_id"]
                    self.log_test(
                        "Send Seller Payment Received Message", 
                        True, 
                        f"Seller payment received message sent successfully - Message ID: {message_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "Send Seller Payment Received Message", 
                        False, 
                        "Send message response missing success or message_id",
                        data
                    )
            else:
                self.log_test(
                    "Send Seller Payment Received Message", 
                    False, 
                    f"Send seller message failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Send Seller Payment Received Message", 
                False, 
                f"Send seller message request failed: {str(e)}"
            )
            
        return False
    
    def test_get_complete_chat_history(self):
        """Test getting complete chat history and verify all messages"""
        print("\n=== Testing Get Complete Chat History ===")
        
        if not self.trade_id:
            self.log_test(
                "Get Complete Chat History", 
                False, 
                "Cannot get chat history - no trade ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/trade/chat/{self.trade_id}",
                params={"user_id": self.buyer_user_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "messages" in data:
                    messages = data["messages"]
                    
                    # Analyze messages
                    system_messages = [msg for msg in messages if msg.get("sender_type") == "system"]
                    buyer_messages = [msg for msg in messages if msg.get("sender_type") == "buyer"]
                    seller_messages = [msg for msg in messages if msg.get("sender_type") == "seller"]
                    
                    # Check for expected messages
                    expected_checks = {
                        "Trade opened system message": any("trade opened" in msg.get("content", "").lower() for msg in system_messages),
                        "Buyer marked paid system message": any("marked" in msg.get("content", "").lower() and "paid" in msg.get("content", "").lower() for msg in system_messages),
                        "Buyer payment message": any("making the payment now" in msg.get("content", "") for msg in buyer_messages),
                        "Seller confirmation message": any("will release once I confirm" in msg.get("content", "") for msg in seller_messages),
                        "Seller payment received message": any("Payment received, releasing now" in msg.get("content", "") for msg in seller_messages),
                        "All messages have timestamps": all(msg.get("timestamp") for msg in messages),
                        "All messages have message types": all(msg.get("message_type") for msg in messages)
                    }
                    
                    passed_checks = sum(1 for check in expected_checks.values() if check)
                    total_checks = len(expected_checks)
                    
                    # Print detailed chat history
                    print("\n📋 COMPLETE CHAT HISTORY:")
                    print("=" * 60)
                    for i, msg in enumerate(messages, 1):
                        sender_type = msg.get("sender_type", "unknown")
                        content = msg.get("content", "")
                        timestamp = msg.get("timestamp", "")
                        message_type = msg.get("message_type", "")
                        
                        print(f"{i}. [{sender_type.upper()}] {content}")
                        print(f"   Type: {message_type}, Time: {timestamp}")
                        print()
                    print("=" * 60)
                    
                    # Print check results
                    print("\n🔍 MESSAGE VERIFICATION:")
                    for check_name, passed in expected_checks.items():
                        status = "✅" if passed else "❌"
                        print(f"{status} {check_name}")
                    
                    if passed_checks == total_checks:
                        self.log_test(
                            "Get Complete Chat History", 
                            True, 
                            f"Complete chat history verified - {len(messages)} messages ({len(system_messages)} system, {len(buyer_messages)} buyer, {len(seller_messages)} seller). All {total_checks} checks passed."
                        )
                        return True
                    else:
                        self.log_test(
                            "Get Complete Chat History", 
                            False, 
                            f"Chat history incomplete - {passed_checks}/{total_checks} checks passed",
                            expected_checks
                        )
                else:
                    self.log_test(
                        "Get Complete Chat History", 
                        False, 
                        "Chat history response missing success or messages",
                        data
                    )
            else:
                self.log_test(
                    "Get Complete Chat History", 
                    False, 
                    f"Get chat history failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Get Complete Chat History", 
                False, 
                f"Get chat history request failed: {str(e)}"
            )
            
        return False
    
    def test_unread_count(self):
        """Test getting unread message count"""
        print("\n=== Testing Unread Message Count ===")
        
        if not self.trade_id:
            self.log_test(
                "Unread Message Count", 
                False, 
                "Cannot get unread count - no trade ID available"
            )
            return False
        
        try:
            response = self.session.get(
                f"{BASE_URL}/trade/chat/unread-count/{self.trade_id}",
                params={"user_id": self.buyer_user_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "unread_count" in data:
                    unread_count = data["unread_count"]
                    self.log_test(
                        "Unread Message Count", 
                        True, 
                        f"Unread count retrieved successfully - {unread_count} unread messages"
                    )
                    return True
                else:
                    self.log_test(
                        "Unread Message Count", 
                        False, 
                        "Unread count response missing success or unread_count",
                        data
                    )
            else:
                self.log_test(
                    "Unread Message Count", 
                    False, 
                    f"Get unread count failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Unread Message Count", 
                False, 
                f"Get unread count request failed: {str(e)}"
            )
            
        return False
    
    def run_comprehensive_chat_test(self):
        """Run the complete P2P trade chat system test"""
        print("🚀 STARTING P2P TRADE CHAT SYSTEM COMPREHENSIVE TEST - FIXED VERSION")
        print("=" * 80)
        
        # Step 1: Setup users
        if not self.test_user_registration_and_login(BUYER_USER, "Buyer"):
            print("❌ CRITICAL: Buyer setup failed. Cannot continue.")
            return False
            
        if not self.test_user_registration_and_login(SELLER_USER, "Seller"):
            print("❌ CRITICAL: Seller setup failed. Cannot continue.")
            return False
        
        # Step 2: Setup crypto balances
        if not self.setup_crypto_balances():
            print("❌ CRITICAL: Crypto balance setup failed. Cannot continue.")
            return False
        
        # Step 3: Create sell offer
        if not self.test_create_enhanced_sell_offer():
            print("❌ CRITICAL: Sell offer creation failed. Cannot continue.")
            return False
        
        # Step 4: Create P2P trade (should auto-create system message)
        if not self.test_create_p2p_trade():
            print("❌ CRITICAL: P2P trade creation failed. Cannot continue.")
            return False
        
        # Step 5: Verify initial chat messages (Trade opened)
        self.test_get_initial_chat_messages()
        
        # Step 6: Send buyer message
        self.test_send_buyer_message()
        
        # Step 7: Send seller message
        self.test_send_seller_message()
        
        # Step 8: Mark trade as paid (should create system messages)
        self.test_mark_trade_as_paid()
        
        # Step 9: Send seller payment received message
        self.test_send_seller_payment_received_message()
        
        # Step 10: Get complete chat history and verify
        self.test_get_complete_chat_history()
        
        # Step 11: Test unread count
        self.test_unread_count()
        
        # Summary
        self.print_test_summary()
        
        return True
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("🎯 P2P TRADE CHAT SYSTEM TEST SUMMARY - FIXED VERSION")
        print("=" * 80)
        
        passed_tests = [result for result in self.test_results if result["success"]]
        failed_tests = [result for result in self.test_results if not result["success"]]
        
        total_tests = len(self.test_results)
        success_rate = (len(passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {len(passed_tests)}")
        print(f"   Failed: {len(failed_tests)}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        if passed_tests:
            print(f"\n✅ PASSED TESTS:")
            for test in passed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print("\n" + "=" * 80)
        
        if success_rate >= 80:
            print("🎉 P2P TRADE CHAT SYSTEM IS WORKING WELL!")
        elif success_rate >= 60:
            print("⚠️  P2P TRADE CHAT SYSTEM HAS SOME ISSUES")
        else:
            print("🚨 P2P TRADE CHAT SYSTEM NEEDS SIGNIFICANT WORK")
        
        print("=" * 80)

def main():
    """Main function to run P2P chat tests"""
    tester = P2PChatTesterFixed()
    
    try:
        tester.run_comprehensive_chat_test()
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()