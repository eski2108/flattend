#!/usr/bin/env python3
"""
CRITICAL TEST - COMPLETE BUYER-SELLER FLOW WITH MESSAGING
Testing the complete real-world scenario as requested in the review.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://controlpanel-4.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class BuyerSellerMessagingTest:
    def __init__(self):
        self.seller_data = {}
        self.buyer_data = {}
        self.trade_data = {}
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} - {test_name}: {details}")
        print(f"{status} - {test_name}: {details}")
        
    def register_and_login_user(self, email, password, full_name):
        """Register and login a user"""
        try:
            # Register
            register_data = {
                "email": email,
                "password": password,
                "full_name": full_name
            }
            
            register_response = requests.post(f"{BASE_URL}/auth/register", 
                                            json=register_data, headers=HEADERS)
            
            user_id = None
            if register_response.status_code in [200, 201]:
                register_result = register_response.json()
                if register_result.get("success"):
                    user_id = register_result["user"]["user_id"]
                    
                    # Mock email verification using test token
                    try:
                        verify_response = requests.get(f"{BASE_URL}/auth/verify-email?token=test_token", headers=HEADERS)
                    except:
                        pass
                    
                    # Mock KYC verification
                    try:
                        mock_kyc_data = {"user_id": user_id}
                        requests.post(f"{BASE_URL}/auth/mock-kyc", json=mock_kyc_data, headers=HEADERS)
                    except:
                        pass
                        
            elif register_response.status_code == 429:
                print(f"Rate limited for {email}, waiting...")
                time.sleep(5)
                return None
            else:
                print(f"Registration failed for {email}: {register_response.status_code} - {register_response.text}")
                return None
            
            # Try login multiple times with different approaches
            login_data = {"email": email, "password": password}
            
            # First attempt - direct login
            login_response = requests.post(f"{BASE_URL}/auth/login", 
                                         json=login_data, headers=HEADERS)
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                if login_result.get("success"):
                    return {
                        "user_id": login_result["user"]["user_id"],
                        "email": email,
                        "token": login_result.get("token"),
                        "full_name": full_name
                    }
            else:
                print(f"Login failed for {email}: {login_response.status_code} - {login_response.text}")
            
            # If login failed due to email verification, try to use existing user data
            if user_id:
                return {
                    "user_id": user_id,
                    "email": email,
                    "token": "mock_token",
                    "full_name": full_name
                }
            
            return None
            
        except Exception as e:
            print(f"Error in register_and_login_user: {e}")
            return None
    
    def add_btc_balance(self, user_id, amount):
        """Add BTC balance to user using both systems"""
        try:
            # First, add funds to trader balance system
            params = {
                "trader_id": user_id,
                "currency": "BTC",
                "amount": amount,
                "reason": "test_deposit"
            }
            
            trader_response = requests.post(f"{BASE_URL}/trader/balance/add-funds", 
                                          params=params, headers=HEADERS)
            
            # Also create a user in the legacy system and add balance
            wallet_address = f"seller_wallet_{user_id[:8]}"
            
            # Connect wallet (creates user in legacy system)
            connect_data = {"wallet_address": wallet_address}
            connect_response = requests.post(f"{BASE_URL}/auth/connect-wallet", 
                                           json=connect_data, headers=HEADERS)
            
            # Add balance to legacy system
            deposit_data = {"wallet_address": wallet_address, "amount": amount}
            deposit_response = requests.post(f"{BASE_URL}/user/deposit", 
                                           json=deposit_data, headers=HEADERS)
            
            # Check if at least one system worked
            trader_success = trader_response.status_code == 200 and trader_response.json().get("success", False)
            legacy_success = deposit_response.status_code == 200 and deposit_response.json().get("success", False)
            
            return trader_success or legacy_success
            
        except Exception as e:
            print(f"Error adding BTC balance: {e}")
            return False
    
    def create_sell_offer(self, seller_id):
        """Create a sell offer using legacy crypto-market system"""
        try:
            # First, create a wallet address for the seller
            wallet_address = f"seller_wallet_{seller_id[:8]}"
            
            # Add bank account for seller first
            bank_account_data = {
                "wallet_address": wallet_address,
                "bank_name": "Test Bank",
                "account_number": "12345678",
                "account_holder_name": "Test Seller",
                "routing_number": "123456789"
            }
            
            bank_response = requests.post(f"{BASE_URL}/bank/add", 
                                        json=bank_account_data, headers=HEADERS)
            
            # Create sell order using legacy system
            sell_order_data = {
                "seller_address": wallet_address,
                "crypto_amount": 0.5,
                "price_per_unit": 45000,
                "min_purchase": 0.1,
                "max_purchase": 0.5,
                "payment_methods": ["bank_transfer"]
            }
            
            response = requests.post(f"{BASE_URL}/crypto-market/sell/create", 
                                   json=sell_order_data, headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return {
                        "order_id": result["order"]["order_id"],
                        "wallet_address": wallet_address
                    }
            else:
                print(f"Sell order creation failed: {response.status_code} - {response.text}")
            
            return None
            
        except Exception as e:
            print(f"Error creating sell offer: {e}")
            return None
    
    def create_buy_order(self, buyer_id, sell_order_id):
        """Create a buy order"""
        try:
            # Create wallet address for buyer
            buyer_wallet = f"buyer_wallet_{buyer_id[:8]}"
            
            # Add bank account for buyer first
            bank_account_data = {
                "wallet_address": buyer_wallet,
                "bank_name": "Buyer Bank",
                "account_number": "87654321",
                "account_holder_name": "Test Buyer",
                "routing_number": "987654321"
            }
            
            bank_response = requests.post(f"{BASE_URL}/bank/add", 
                                        json=bank_account_data, headers=HEADERS)
            
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
                        "total_price": result["order"]["total_price"]
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
                "payment_reference": f"PAYMENT_REF_{int(time.time())}"
            }
            
            response = requests.post(f"{BASE_URL}/crypto-market/payment/mark-paid", 
                                   json=mark_paid_data, headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("success", False)
            
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
            
            return False
            
        except Exception as e:
            print(f"Error releasing crypto: {e}")
            return False
    
    def get_user_balance(self, user_id):
        """Get user's trader balance"""
        try:
            response = requests.get(f"{BASE_URL}/trader/my-balances/{user_id}", 
                                  headers=HEADERS)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    balances = result.get("balances", [])
                    for balance in balances:
                        if balance.get("currency") == "BTC":
                            return {
                                "total_balance": balance.get("total_balance", 0),
                                "available_balance": balance.get("available_balance", 0),
                                "locked_balance": balance.get("locked_balance", 0)
                            }
            
            return {"total_balance": 0, "available_balance": 0, "locked_balance": 0}
            
        except Exception as e:
            print(f"Error getting user balance: {e}")
            return {"total_balance": 0, "available_balance": 0, "locked_balance": 0}
    
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
    
    def run_complete_test(self):
        """Run the complete buyer-seller flow with messaging test"""
        print("🎯 STARTING CRITICAL TEST - COMPLETE BUYER-SELLER FLOW WITH MESSAGING")
        print("=" * 80)
        
        # Step 1: Setup - Create Seller and Buyer accounts
        print("\n📋 STEP 1: SETUP - Creating Seller and Buyer accounts")
        
        # Create Seller (use a more unique timestamp to avoid conflicts)
        timestamp = int(time.time() * 1000)  # Use milliseconds for uniqueness
        seller_email = f"seller_msg_{timestamp}@test.com"
        self.seller_data = self.register_and_login_user(seller_email, "Test123456", "Test Seller")
        
        if self.seller_data:
            self.log_result("Seller Account Creation", True, f"Seller ID: {self.seller_data['user_id']}")
        else:
            self.log_result("Seller Account Creation", False, "Failed to create seller account")
            return
        
        # Create Buyer (wait a bit to avoid rate limiting)
        time.sleep(3)
        timestamp2 = int(time.time() * 1000) + 1000  # Different timestamp
        buyer_email = f"buyer_msg_{timestamp2}@test.com"
        self.buyer_data = self.register_and_login_user(buyer_email, "Test123456", "Test Buyer")
        
        if self.buyer_data:
            self.log_result("Buyer Account Creation", True, f"Buyer ID: {self.buyer_data['user_id']}")
        else:
            self.log_result("Buyer Account Creation", False, "Failed to create buyer account")
            return
        
        # Give Seller 1 BTC balance
        btc_added = self.add_btc_balance(self.seller_data["user_id"], 1.0)
        self.log_result("Seller BTC Balance Added", btc_added, "1.0 BTC added to seller")
        
        # Verify seller balance
        seller_balance = self.get_user_balance(self.seller_data["user_id"])
        self.log_result("Seller Balance Verification", 
                       seller_balance["available_balance"] >= 1.0, 
                       f"Available: {seller_balance['available_balance']} BTC")
        
        # Step 2: Seller Creates Offer
        print("\n💰 STEP 2: SELLER CREATES OFFER - 0.5 BTC at $45,000")
        
        sell_offer = self.create_sell_offer(self.seller_data["user_id"])
        if sell_offer:
            self.log_result("Sell Offer Creation", True, f"Order ID: {sell_offer['order_id']}")
            self.seller_data["wallet_address"] = sell_offer["wallet_address"]
        else:
            self.log_result("Sell Offer Creation", False, "Failed to create sell offer")
            return
        
        # Verify offer appears in marketplace
        try:
            response = requests.get(f"{BASE_URL}/crypto-market/sell/orders", headers=HEADERS)
            if response.status_code == 200:
                result = response.json()
                orders = result.get("orders", [])
                offer_found = any(order["order_id"] == sell_offer["order_id"] for order in orders)
                self.log_result("Offer in Marketplace", offer_found, f"Found {len(orders)} total offers")
            else:
                self.log_result("Offer in Marketplace", False, "Failed to fetch marketplace offers")
        except Exception as e:
            self.log_result("Offer in Marketplace", False, f"Error: {e}")
        
        # Step 3: Buyer Purchases
        print("\n🛒 STEP 3: BUYER PURCHASES - Creates trade/buy order")
        
        buy_order = self.create_buy_order(self.buyer_data["user_id"], sell_offer["order_id"])
        if buy_order:
            self.log_result("Buy Order Creation", True, f"Order ID: {buy_order['order_id']}")
            self.buyer_data["wallet_address"] = buy_order["buyer_wallet"]
            self.trade_data = {
                "trade_id": buy_order["order_id"],  # Using order_id as trade_id for messaging
                "buy_order_id": buy_order["order_id"],
                "sell_order_id": sell_offer["order_id"]
            }
        else:
            self.log_result("Buy Order Creation", False, "Failed to create buy order")
            return
        
        # Verify crypto gets locked in escrow (check seller's locked balance)
        seller_balance_after = self.get_user_balance(self.seller_data["user_id"])
        crypto_locked = seller_balance_after["locked_balance"] > 0
        self.log_result("Crypto Locked in Escrow", crypto_locked, 
                       f"Locked: {seller_balance_after['locked_balance']} BTC")
        
        # Step 4: BUYER-SELLER COMMUNICATION (CRITICAL)
        print("\n💬 STEP 4: BUYER-SELLER COMMUNICATION (CRITICAL)")
        
        # Test: Can Buyer send message to Seller?
        buyer_message = "Hi! I've created the buy order. I'll make the payment shortly."
        buyer_msg_sent = self.send_trade_message(
            self.trade_data["trade_id"], 
            self.buyer_data["user_id"], 
            "buyer", 
            buyer_message
        )
        self.log_result("Buyer Send Message", buyer_msg_sent, "Buyer message sent to seller")
        
        # Test: Can Seller send message to Buyer?
        seller_message = "Great! Please make the payment and let me know when it's done."
        seller_msg_sent = self.send_trade_message(
            self.trade_data["trade_id"], 
            self.seller_data["user_id"], 
            "seller", 
            seller_message
        )
        self.log_result("Seller Send Message", seller_msg_sent, "Seller message sent to buyer")
        
        # Test: Do messages appear in chat history?
        messages = self.get_trade_messages(self.trade_data["trade_id"])
        messages_found = len(messages) >= 2
        self.log_result("Messages in Chat History", messages_found, 
                       f"Found {len(messages)} messages in chat")
        
        if messages_found:
            # Verify message content
            buyer_msg_found = any(msg.get("message") == buyer_message for msg in messages)
            seller_msg_found = any(msg.get("message") == seller_message for msg in messages)
            self.log_result("Buyer Message Content", buyer_msg_found, "Buyer message content verified")
            self.log_result("Seller Message Content", seller_msg_found, "Seller message content verified")
        
        # Step 5: Payment & Release
        print("\n💳 STEP 5: PAYMENT & RELEASE")
        
        # Buyer marks payment as sent
        payment_marked = self.mark_payment_as_sent(
            self.buyer_data["wallet_address"], 
            self.trade_data["buy_order_id"]
        )
        self.log_result("Buyer Marks Payment Sent", payment_marked, "Payment marked as sent")
        
        # Test: Does Seller get NOTIFICATION?
        time.sleep(2)  # Wait for notification to be created
        seller_notifications = self.get_notifications(self.seller_data["wallet_address"])
        payment_notification = any(
            notif.get("notification_type") == "marked_paid" 
            for notif in seller_notifications
        )
        self.log_result("Seller Payment Notification", payment_notification, 
                       f"Found {len(seller_notifications)} notifications")
        
        # Buyer sends payment confirmation message
        payment_msg = "I've made the payment via bank transfer. Reference: PAY123456"
        buyer_payment_msg = self.send_trade_message(
            self.trade_data["trade_id"], 
            self.buyer_data["user_id"], 
            "buyer", 
            payment_msg
        )
        self.log_result("Buyer Payment Message", buyer_payment_msg, "Payment confirmation message sent")
        
        # Seller releases crypto
        crypto_released = self.release_crypto(
            self.seller_data["wallet_address"], 
            self.trade_data["buy_order_id"]
        )
        self.log_result("Seller Releases Crypto", crypto_released, "Crypto released from escrow")
        
        # Test: Does Buyer get NOTIFICATION?
        time.sleep(2)  # Wait for notification to be created
        buyer_notifications = self.get_notifications(self.buyer_data["wallet_address"])
        release_notification = any(
            notif.get("notification_type") == "crypto_released" 
            for notif in buyer_notifications
        )
        self.log_result("Buyer Release Notification", release_notification, 
                       f"Found {len(buyer_notifications)} notifications")
        
        # Seller sends release confirmation message
        release_msg = "Payment received and verified! Crypto has been released. Thank you!"
        seller_release_msg = self.send_trade_message(
            self.trade_data["trade_id"], 
            self.seller_data["user_id"], 
            "seller", 
            release_msg
        )
        self.log_result("Seller Release Message", seller_release_msg, "Release confirmation message sent")
        
        # Step 6: Verify Final State
        print("\n🔍 STEP 6: VERIFY FINAL STATE")
        
        # Check: Did Buyer receive the BTC?
        buyer_final_balance = self.get_user_balance(self.buyer_data["user_id"])
        buyer_received_btc = buyer_final_balance["available_balance"] > 0
        self.log_result("Buyer Received BTC", buyer_received_btc, 
                       f"Buyer balance: {buyer_final_balance['available_balance']} BTC")
        
        # Check: Did Seller's BTC balance decrease?
        seller_final_balance = self.get_user_balance(self.seller_data["user_id"])
        seller_balance_decreased = seller_final_balance["available_balance"] < 1.0
        self.log_result("Seller Balance Decreased", seller_balance_decreased, 
                       f"Seller balance: {seller_final_balance['available_balance']} BTC")
        
        # Check: Are all messages visible?
        final_messages = self.get_trade_messages(self.trade_data["trade_id"])
        all_messages_visible = len(final_messages) >= 4  # At least 4 messages expected
        self.log_result("All Messages Visible", all_messages_visible, 
                       f"Total messages: {len(final_messages)}")
        
        # Display final message history
        if final_messages:
            print("\n📝 FINAL MESSAGE HISTORY:")
            for i, msg in enumerate(final_messages, 1):
                sender_role = msg.get("sender_role", "unknown")
                message_text = msg.get("message", "")
                timestamp = msg.get("created_at", "")
                print(f"  {i}. [{sender_role.upper()}] {message_text} ({timestamp})")
        
        # Final Summary
        print("\n" + "=" * 80)
        print("🎯 CRITICAL TEST RESULTS SUMMARY")
        print("=" * 80)
        
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
        
        # Does the crypto ACTUALLY transfer from seller to buyer?
        crypto_transfers = buyer_received_btc and seller_balance_decreased
        print(f"✅ or ❌ - Does the crypto ACTUALLY transfer from seller to buyer? {'✅' if crypto_transfers else '❌'}")
        
        print(f"\n🎉 OVERALL SYSTEM STATUS: {'✅ WORKING' if success_rate >= 80 else '❌ BROKEN'}")
        
        return success_rate >= 80

if __name__ == "__main__":
    test = BuyerSellerMessagingTest()
    test.run_complete_test()