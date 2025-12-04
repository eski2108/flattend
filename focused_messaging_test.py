#!/usr/bin/env python3
"""
FOCUSED MESSAGING TEST - Testing buyer-seller communication
Using existing sell orders to focus on messaging functionality
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://tradingplatform-14.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FocusedMessagingTest:
    def __init__(self):
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} - {test_name}: {details}")
        print(f"{status} - {test_name}: {details}")
    
    def create_buy_order_from_existing(self, sell_order_id):
        """Create a buy order from existing sell order"""
        try:
            # Create unique buyer wallet
            buyer_wallet = f"test_buyer_{int(time.time())}"
            
            # First, connect the wallet to create user in legacy system
            connect_data = {"wallet_address": buyer_wallet}
            connect_response = requests.post(f"{BASE_URL}/auth/connect-wallet", 
                                           json=connect_data, headers=HEADERS)
            
            # Add bank account for buyer
            bank_account_data = {
                "wallet_address": buyer_wallet,
                "bank_name": "Test Buyer Bank",
                "account_number": "12345678",
                "account_holder_name": "Test Buyer",
                "routing_number": "123456789"
            }
            
            bank_response = requests.post(f"{BASE_URL}/bank/add", json=bank_account_data, headers=HEADERS)
            if bank_response.status_code != 200:
                print(f"Bank account creation failed: {bank_response.status_code} - {bank_response.text}")
            
            # Create buy order
            buy_order_data = {
                "buyer_address": buyer_wallet,
                "sell_order_id": sell_order_id,
                "crypto_amount": 0.1
            }
            
            response = requests.post(f"{BASE_URL}/crypto-market/buy/create", 
                                   json=buy_order_data, headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return {
                        "order_id": result["order"]["order_id"],
                        "buyer_wallet": buyer_wallet,
                        "seller_wallet": result["order"]["seller_address"]
                    }
            else:
                print(f"Buy order creation failed: {response.status_code} - {response.text}")
            
            return None
            
        except Exception as e:
            print(f"Error creating buy order: {e}")
            return None
    
    def send_trade_message(self, trade_id, sender_id, sender_role, message):
        """Send a message in trade chat"""
        try:
            message_data = {
                "trade_id": trade_id,
                "sender_id": sender_id,
                "sender_role": sender_role,
                "message": message
            }
            
            response = requests.post(f"{BASE_URL}/p2p/trade/message", 
                                   json=message_data, headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("success", False)
            else:
                print(f"Message send failed: {response.status_code} - {response.text}")
            
            return False
            
        except Exception as e:
            print(f"Error sending trade message: {e}")
            return False
    
    def get_trade_messages(self, trade_id):
        """Get all messages for a trade"""
        try:
            response = requests.get(f"{BASE_URL}/p2p/trade/{trade_id}/messages", 
                                  headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return result.get("messages", [])
            else:
                print(f"Get messages failed: {response.status_code} - {response.text}")
            
            return []
            
        except Exception as e:
            print(f"Error getting trade messages: {e}")
            return []
    
    def mark_payment_as_sent(self, buyer_wallet, order_id):
        """Buyer marks payment as sent"""
        try:
            mark_paid_data = {
                "buyer_address": buyer_wallet,
                "order_id": order_id,
                "payment_reference": f"PAY_REF_{int(time.time())}"
            }
            
            response = requests.post(f"{BASE_URL}/crypto-market/payment/mark-paid", 
                                   json=mark_paid_data, headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("success", False)
            else:
                print(f"Mark payment failed: {response.status_code} - {response.text}")
            
            return False
            
        except Exception as e:
            print(f"Error marking payment: {e}")
            return False
    
    def release_crypto(self, seller_wallet, order_id):
        """Seller releases crypto from escrow"""
        try:
            release_data = {
                "seller_address": seller_wallet,
                "order_id": order_id
            }
            
            response = requests.post(f"{BASE_URL}/crypto-market/release", 
                                   json=release_data, headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("success", False)
            else:
                print(f"Release crypto failed: {response.status_code} - {response.text}")
            
            return False
            
        except Exception as e:
            print(f"Error releasing crypto: {e}")
            return False
    
    def get_notifications(self, wallet_address):
        """Get user notifications"""
        try:
            response = requests.get(f"{BASE_URL}/notifications/{wallet_address}", 
                                  headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return result.get("notifications", [])
            
            return []
            
        except Exception as e:
            print(f"Error getting notifications: {e}")
            return []
    
    def run_focused_test(self):
        """Run focused messaging test using existing sell orders"""
        print("🎯 FOCUSED MESSAGING TEST - BUYER-SELLER COMMUNICATION")
        print("=" * 70)
        
        # Step 1: Get existing sell orders
        print("\n📋 STEP 1: GET EXISTING SELL ORDERS")
        
        try:
            response = requests.get(f"{BASE_URL}/crypto-market/sell/orders", headers=HEADERS)
            if response.status_code == 200:
                result = response.json()
                orders = result.get("orders", [])
                if orders:
                    sell_order = orders[0]  # Use first available order
                    self.log_result("Found Existing Sell Orders", True, 
                                   f"Using order {sell_order['order_id'][:8]}...")
                else:
                    self.log_result("Found Existing Sell Orders", False, "No orders available")
                    return False
            else:
                self.log_result("Found Existing Sell Orders", False, f"API error: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Found Existing Sell Orders", False, f"Error: {e}")
            return False
        
        # Step 2: Create Buy Order
        print("\n🛒 STEP 2: CREATE BUY ORDER FROM EXISTING SELL ORDER")
        
        buy_order = self.create_buy_order_from_existing(sell_order["order_id"])
        if buy_order:
            self.log_result("Buy Order Creation", True, f"Order ID: {buy_order['order_id'][:8]}...")
            trade_id = buy_order["order_id"]  # Using order_id as trade_id
            buyer_wallet = buy_order["buyer_wallet"]
            seller_wallet = buy_order["seller_wallet"]
        else:
            self.log_result("Buy Order Creation", False, "Failed to create buy order")
            return False
        
        # Step 3: TEST MESSAGING FUNCTIONALITY
        print("\n💬 STEP 3: TEST BUYER-SELLER MESSAGING")
        
        # Test: Can Buyer send message to Seller?
        buyer_message = "Hi! I've created the buy order. I'll make the payment via bank transfer shortly."
        buyer_msg_sent = self.send_trade_message(trade_id, buyer_wallet, "buyer", buyer_message)
        self.log_result("Buyer Send Message", buyer_msg_sent, "Buyer message to seller")
        
        # Test: Can Seller send message to Buyer?
        seller_message = "Great! Please make the payment and send me the reference number when done."
        seller_msg_sent = self.send_trade_message(trade_id, seller_wallet, "seller", seller_message)
        self.log_result("Seller Send Message", seller_msg_sent, "Seller message to buyer")
        
        # Test: Do messages appear in chat history?
        messages = self.get_trade_messages(trade_id)
        messages_found = len(messages) >= 2
        self.log_result("Messages in Chat History", messages_found, 
                       f"Found {len(messages)} messages")
        
        if messages_found:
            print("\n📝 MESSAGE HISTORY:")
            for i, msg in enumerate(messages, 1):
                sender_role = msg.get("sender_role", "unknown")
                message_text = msg.get("message", "")
                timestamp = msg.get("created_at", "")
                print(f"  {i}. [{sender_role.upper()}] {message_text}")
            
            # Verify message content
            buyer_msg_found = any(msg.get("message") == buyer_message for msg in messages)
            seller_msg_found = any(msg.get("message") == seller_message for msg in messages)
            self.log_result("Buyer Message Content", buyer_msg_found, "Message content verified")
            self.log_result("Seller Message Content", seller_msg_found, "Message content verified")
        
        # Step 4: TEST PAYMENT FLOW WITH MESSAGING
        print("\n💳 STEP 4: TEST PAYMENT FLOW WITH MESSAGING")
        
        # Buyer marks payment as sent
        payment_marked = self.mark_payment_as_sent(buyer_wallet, buy_order["order_id"])
        self.log_result("Buyer Marks Payment Sent", payment_marked, "Payment marked as sent")
        
        # Buyer sends payment confirmation message
        payment_msg = "Payment sent! Bank reference: TXN123456789. Please check and release the crypto."
        buyer_payment_msg = self.send_trade_message(trade_id, buyer_wallet, "buyer", payment_msg)
        self.log_result("Buyer Payment Message", buyer_payment_msg, "Payment confirmation message")
        
        # Test: Does Seller get NOTIFICATION?
        time.sleep(2)  # Wait for notification
        seller_notifications = self.get_notifications(seller_wallet)
        payment_notification = any(
            notif.get("notification_type") == "marked_paid" 
            for notif in seller_notifications
        )
        self.log_result("Seller Payment Notification", payment_notification, 
                       f"Found {len(seller_notifications)} notifications")
        
        # Seller releases crypto
        crypto_released = self.release_crypto(seller_wallet, buy_order["order_id"])
        self.log_result("Seller Releases Crypto", crypto_released, "Crypto released from escrow")
        
        # Seller sends release confirmation message
        release_msg = "Payment verified and received! Crypto has been released. Thank you for trading!"
        seller_release_msg = self.send_trade_message(trade_id, seller_wallet, "seller", release_msg)
        self.log_result("Seller Release Message", seller_release_msg, "Release confirmation message")
        
        # Test: Does Buyer get NOTIFICATION?
        time.sleep(2)  # Wait for notification
        buyer_notifications = self.get_notifications(buyer_wallet)
        release_notification = any(
            notif.get("notification_type") == "crypto_released" 
            for notif in buyer_notifications
        )
        self.log_result("Buyer Release Notification", release_notification, 
                       f"Found {len(buyer_notifications)} notifications")
        
        # Step 5: FINAL MESSAGE VERIFICATION
        print("\n🔍 STEP 5: FINAL MESSAGE VERIFICATION")
        
        final_messages = self.get_trade_messages(trade_id)
        all_messages_visible = len(final_messages) >= 4  # At least 4 messages expected
        self.log_result("All Messages Visible", all_messages_visible, 
                       f"Total messages: {len(final_messages)}")
        
        if final_messages:
            print("\n📝 COMPLETE MESSAGE HISTORY:")
            for i, msg in enumerate(final_messages, 1):
                sender_role = msg.get("sender_role", "unknown")
                message_text = msg.get("message", "")
                timestamp = msg.get("created_at", "")
                print(f"  {i}. [{sender_role.upper()}] {message_text}")
        
        # FINAL SUMMARY
        print("\n" + "=" * 70)
        print("🎯 FOCUSED MESSAGING TEST RESULTS")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if "✅ PASS" in result)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\nDETAILED RESULTS:")
        for result in self.test_results:
            print(f"  {result}")
        
        # Answer the critical questions
        print("\n🔥 CRITICAL ANSWERS:")
        
        # Can buyers and sellers MESSAGE each other during trade?
        messaging_works = buyer_msg_sent and seller_msg_sent and messages_found
        print(f"✅ or ❌ - Can buyers and sellers MESSAGE each other during trade? {'✅' if messaging_works else '❌'}")
        
        # Do they get NOTIFICATIONS when payment is marked/crypto released?
        notifications_work = payment_notification and release_notification
        print(f"✅ or ❌ - Do they get NOTIFICATIONS when payment is marked/crypto released? {'✅' if notifications_work else '❌'}")
        
        # Does the complete flow work?
        complete_flow = payment_marked and crypto_released
        print(f"✅ or ❌ - Does the complete payment and release flow work? {'✅' if complete_flow else '❌'}")
        
        print(f"\n🎉 MESSAGING SYSTEM STATUS: {'✅ WORKING' if success_rate >= 75 else '❌ BROKEN'}")
        
        return success_rate >= 75

if __name__ == "__main__":
    test = FocusedMessagingTest()
    test.run_focused_test()