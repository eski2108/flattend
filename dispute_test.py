#!/usr/bin/env python3
"""
Dispute Flow Testing Script
Tests dispute functionality on a fresh order that hasn't been completed.
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://spottrading-fix.preview.emergentagent.com/api"

# Test Users for dispute
DISPUTE_BUYER = {
    "email": "dispute_buyer@test.com",
    "password": "dispute123",
    "full_name": "Dispute Test Buyer",
    "wallet_address": "dispute_buyer_wallet_001"
}

DISPUTE_SELLER = {
    "email": "dispute_seller@test.com", 
    "password": "dispute123",
    "full_name": "Dispute Test Seller",
    "wallet_address": "dispute_seller_wallet_001"
}

ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"

class DisputeTester:
    def __init__(self):
        self.session = requests.Session()
        self.buyer_user_id = None
        self.seller_user_id = None
        self.sell_order_id = None
        self.buy_order_id = None
        self.dispute_id = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        if details and not success:
            print(f"   Details: {details}")
    
    def setup_dispute_test_users(self):
        """Setup users for dispute testing"""
        print("\n=== Setting Up Dispute Test Users ===")
        
        # Register/login buyer
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=DISPUTE_BUYER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.buyer_user_id = data["user_id"]
                self.log_test("Dispute Buyer Setup", True, f"Buyer registered: {self.buyer_user_id}")
            elif response.status_code == 400 and "already registered" in response.text:
                # Login existing user
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={"email": DISPUTE_BUYER["email"], "password": DISPUTE_BUYER["password"]},
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    self.buyer_user_id = data["user"]["user_id"]
                    self.log_test("Dispute Buyer Setup", True, f"Buyer logged in: {self.buyer_user_id}")
        except Exception as e:
            self.log_test("Dispute Buyer Setup", False, f"Failed: {str(e)}")
            return False
        
        # Register/login seller
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=DISPUTE_SELLER,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.seller_user_id = data["user_id"]
                self.log_test("Dispute Seller Setup", True, f"Seller registered: {self.seller_user_id}")
            elif response.status_code == 400 and "already registered" in response.text:
                # Login existing user
                response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={"email": DISPUTE_SELLER["email"], "password": DISPUTE_SELLER["password"]},
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    self.seller_user_id = data["user"]["user_id"]
                    self.log_test("Dispute Seller Setup", True, f"Seller logged in: {self.seller_user_id}")
        except Exception as e:
            self.log_test("Dispute Seller Setup", False, f"Failed: {str(e)}")
            return False
        
        # Setup wallets and bank accounts
        wallets = [
            (DISPUTE_BUYER["wallet_address"], "Dispute Buyer Wallet"),
            (DISPUTE_SELLER["wallet_address"], "Dispute Seller Wallet")
        ]
        
        for wallet_address, test_name in wallets:
            try:
                response = self.session.post(
                    f"{BASE_URL}/auth/connect-wallet",
                    json={"wallet_address": wallet_address},
                    timeout=10
                )
                if response.status_code == 200:
                    self.log_test(test_name, True, "Wallet connected")
            except Exception as e:
                self.log_test(test_name, False, f"Failed: {str(e)}")
        
        # Add bank accounts
        bank_accounts = [
            (DISPUTE_BUYER["wallet_address"], "Dispute Buyer Bank", "Test Bank", "111111111", "Dispute Buyer"),
            (DISPUTE_SELLER["wallet_address"], "Dispute Seller Bank", "Test Bank", "222222222", "Dispute Seller")
        ]
        
        for wallet_address, test_name, bank_name, account_number, account_holder in bank_accounts:
            try:
                response = self.session.post(
                    f"{BASE_URL}/bank/add",
                    json={
                        "wallet_address": wallet_address,
                        "bank_name": bank_name,
                        "account_number": account_number,
                        "account_holder_name": account_holder,
                        "routing_number": "021000021"
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    self.log_test(test_name, True, "Bank account added")
            except Exception as e:
                self.log_test(test_name, False, f"Failed: {str(e)}")
        
        # Give seller crypto to sell
        try:
            response = self.session.post(
                f"{BASE_URL}/user/deposit",
                json={
                    "wallet_address": DISPUTE_SELLER["wallet_address"],
                    "amount": 1.0
                },
                timeout=10
            )
            if response.status_code == 200:
                self.log_test("Seller Initial Deposit", True, "Seller received 1.0 BTC")
        except Exception as e:
            self.log_test("Seller Initial Deposit", False, f"Failed: {str(e)}")
        
        return True
    
    def create_order_for_dispute(self):
        """Create sell and buy orders for dispute testing"""
        print("\n=== Creating Orders for Dispute Testing ===")
        
        # Create sell order
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/sell/create",
                json={
                    "seller_address": DISPUTE_SELLER["wallet_address"],
                    "crypto_amount": 0.3,
                    "price_per_unit": 40000.0,
                    "min_purchase": 0.1,
                    "max_purchase": 0.3
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.sell_order_id = data["order"]["order_id"]
                self.log_test("Create Dispute Sell Order", True, f"Sell order created: {self.sell_order_id}")
            else:
                self.log_test("Create Dispute Sell Order", False, f"Failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Create Dispute Sell Order", False, f"Failed: {str(e)}")
            return False
        
        # Create buy order
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/buy/create",
                json={
                    "buyer_address": DISPUTE_BUYER["wallet_address"],
                    "sell_order_id": self.sell_order_id,
                    "crypto_amount": 0.3
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.buy_order_id = data["order"]["order_id"]
                self.log_test("Create Dispute Buy Order", True, f"Buy order created: {self.buy_order_id}")
                return True
            else:
                self.log_test("Create Dispute Buy Order", False, f"Failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Create Dispute Buy Order", False, f"Failed: {str(e)}")
            return False
    
    def test_dispute_flow(self):
        """Test complete dispute flow"""
        print("\n=== Testing Complete Dispute Flow ===")
        
        if not self.buy_order_id:
            self.log_test("Dispute Flow", False, "No buy order available for dispute")
            return False
        
        # Mark as paid first (this puts order in marked_as_paid status)
        try:
            response = self.session.post(
                f"{BASE_URL}/crypto-market/payment/mark-paid",
                json={
                    "buyer_address": DISPUTE_BUYER["wallet_address"],
                    "order_id": self.buy_order_id,
                    "payment_reference": "DISPUTE_TEST_REF_12345"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Mark as Paid for Dispute", True, "Payment marked - order ready for dispute")
            else:
                self.log_test("Mark as Paid for Dispute", False, f"Failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Mark as Paid for Dispute", False, f"Failed: {str(e)}")
            return False
        
        # Now create dispute
        try:
            response = self.session.post(
                f"{BASE_URL}/disputes/initiate",
                json={
                    "user_address": DISPUTE_BUYER["wallet_address"],
                    "order_id": self.buy_order_id,
                    "reason": "Payment made but seller is not responding to release crypto"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("dispute", {}).get("dispute_id"):
                    self.dispute_id = data["dispute"]["dispute_id"]
                    self.log_test("Create Dispute", True, f"Dispute created: {self.dispute_id}")
                else:
                    self.log_test("Create Dispute", False, "Invalid dispute response", data)
                    return False
            else:
                self.log_test("Create Dispute", False, f"Failed with status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Create Dispute", False, f"Failed: {str(e)}")
            return False
        
        # Add dispute message
        try:
            response = self.session.post(
                f"{BASE_URL}/disputes/message",
                json={
                    "dispute_id": self.dispute_id,
                    "sender_address": DISPUTE_BUYER["wallet_address"],
                    "sender_role": "buyer",
                    "message": "I have made the payment as requested. Reference: DISPUTE_TEST_REF_12345. Please release the crypto."
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_test("Add Dispute Message", True, "Dispute message added successfully")
            else:
                self.log_test("Add Dispute Message", False, f"Failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Add Dispute Message", False, f"Failed: {str(e)}")
            return False
        
        # Admin resolve dispute
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/resolve-dispute",
                json={
                    "admin_address": "admin_wallet_001",
                    "dispute_id": self.dispute_id,
                    "order_id": self.buy_order_id,
                    "resolution": "release_to_buyer",
                    "admin_notes": "Payment confirmed. Releasing crypto to buyer."
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Admin Resolve Dispute", True, "Dispute resolved by admin successfully")
                    return True
                else:
                    self.log_test("Admin Resolve Dispute", False, "Admin resolve failed", data)
            else:
                self.log_test("Admin Resolve Dispute", False, f"Failed with status {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Admin Resolve Dispute", False, f"Failed: {str(e)}")
        
        return False
    
    def run_dispute_tests(self):
        """Run all dispute tests"""
        print("🚀 Starting Dispute Flow Testing")
        print(f"🔗 Testing against: {BASE_URL}")
        
        success = True
        
        if not self.setup_dispute_test_users():
            success = False
        
        if not self.create_order_for_dispute():
            success = False
        
        if not self.test_dispute_flow():
            success = False
        
        return success

if __name__ == "__main__":
    tester = DisputeTester()
    success = tester.run_dispute_tests()
    
    if success:
        print(f"\n🎉 All dispute tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  Some dispute tests failed.")
        sys.exit(1)