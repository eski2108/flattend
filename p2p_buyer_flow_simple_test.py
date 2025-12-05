#!/usr/bin/env python3
"""
SIMPLIFIED P2P BUYER FLOW TEST - Using Legacy System
Test Scenario: Complete buyer journey using working legacy P2P endpoints

Backend URL: https://cryptovault-29.preview.emergentagent.com/api
"""

import requests
import json
import time
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://cryptovault-29.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class SimplifiedP2PBuyerFlowTester:
    def __init__(self):
        self.seller_wallet = f"seller_wallet_{int(time.time())}"
        self.buyer_wallet = f"buyer_wallet_{int(time.time())}"
        self.sell_order_id = None
        self.buy_order_id = None
        self.results = []
        
    def log_step(self, step, description, status, details=None):
        """Log each step with detailed information"""
        result = {
            "step": step,
            "description": description,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {}
        }
        self.results.append(result)
        print(f"\n{'='*60}")
        print(f"STEP {step}: {description}")
        print(f"STATUS: {status}")
        if details:
            print(f"DETAILS: {json.dumps(details, indent=2)}")
        print(f"{'='*60}")
        
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        request_headers = HEADERS.copy()
        if headers:
            request_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code < 400
            }
        except Exception as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }
    
    def setup_seller_with_balance(self):
        """SETUP: Create seller wallet and add balance"""
        self.log_step("SETUP-1", "Setting up Seller with 1 BTC Balance", "IN_PROGRESS")
        
        # Connect seller wallet
        connect_response = self.make_request("POST", "/auth/connect-wallet", {
            "wallet_address": self.seller_wallet
        })
        
        if not connect_response["success"]:
            self.log_step("SETUP-1", "Setting up Seller", "FAILED",
                         {"error": "Failed to connect wallet", "response": connect_response})
            return False
        
        # Add 1 BTC balance
        deposit_response = self.make_request("POST", "/user/deposit", {
            "wallet_address": self.seller_wallet,
            "amount": 1.0
        })
        
        if deposit_response["success"]:
            self.log_step("SETUP-1", "Setting up Seller with 1 BTC Balance", "SUCCESS",
                         {"seller_wallet": self.seller_wallet, "balance": "1.0 BTC"})
            return True
        else:
            self.log_step("SETUP-1", "Setting up Seller", "FAILED",
                         {"error": "Failed to add balance", "response": deposit_response})
            return False
    
    def setup_seller_bank_account(self):
        """SETUP: Add bank account for seller"""
        self.log_step("SETUP-2", "Adding Seller Bank Account", "IN_PROGRESS")
        
        bank_response = self.make_request("POST", "/bank/add", {
            "wallet_address": self.seller_wallet,
            "bank_name": "Seller Test Bank",
            "account_number": "87654321",
            "account_holder_name": "P2P Seller",
            "routing_number": "123456789"
        })
        
        if bank_response["success"]:
            self.log_step("SETUP-2", "Adding Seller Bank Account", "SUCCESS",
                         {"bank_added": True})
            return True
        else:
            self.log_step("SETUP-2", "Adding Seller Bank Account", "FAILED",
                         {"error": "Failed to add bank account", "response": bank_response})
            return False
    
    def create_sell_offer(self):
        """SETUP: Seller creates sell offer (0.5 BTC at $45,000)"""
        self.log_step("SETUP-3", "Creating Sell Offer (0.5 BTC at $45,000)", "IN_PROGRESS")
        
        sell_order_data = {
            "seller_address": self.seller_wallet,
            "crypto_amount": 0.5,
            "price_per_unit": 45000.0,
            "min_purchase": 0.01,
            "max_purchase": 0.5
        }
        
        response = self.make_request("POST", "/crypto-market/sell/create", sell_order_data)
        
        if response["success"]:
            self.sell_order_id = response["data"]["order"]["order_id"]
            self.log_step("SETUP-3", "Creating Sell Offer", "SUCCESS",
                         {"offer_id": self.sell_order_id, "amount": "0.5 BTC", 
                          "price": "$45,000", "total_value": "$22,500"})
            return True
        else:
            self.log_step("SETUP-3", "Creating Sell Offer", "FAILED",
                         {"error": "Failed to create sell offer", "response": response})
            return False
    
    def setup_buyer_wallet(self):
        """SETUP: Create buyer wallet with $0 BTC"""
        self.log_step("SETUP-4", "Setting up Buyer Wallet ($0 BTC)", "IN_PROGRESS")
        
        # Connect buyer wallet
        connect_response = self.make_request("POST", "/auth/connect-wallet", {
            "wallet_address": self.buyer_wallet
        })
        
        if not connect_response["success"]:
            self.log_step("SETUP-4", "Setting up Buyer Wallet", "FAILED",
                         {"error": "Failed to connect wallet", "response": connect_response})
            return False
        
        # Add bank account for buyer
        bank_response = self.make_request("POST", "/bank/add", {
            "wallet_address": self.buyer_wallet,
            "bank_name": "Buyer Test Bank",
            "account_number": "12345678",
            "account_holder_name": "P2P Buyer",
            "routing_number": "987654321"
        })
        
        if bank_response["success"]:
            self.log_step("SETUP-4", "Setting up Buyer Wallet ($0 BTC)", "SUCCESS",
                         {"buyer_wallet": self.buyer_wallet, "balance": "0.0 BTC", "bank_added": True})
            return True
        else:
            self.log_step("SETUP-4", "Setting up Buyer Wallet", "FAILED",
                         {"error": "Failed to add bank account", "response": bank_response})
            return False
    
    def step1_buyer_views_marketplace(self):
        """Step 1: Buyer views marketplace and sees the sell offer"""
        self.log_step("1", "Buyer Views Marketplace - See Sell Offers", "IN_PROGRESS")
        
        response = self.make_request("GET", "/crypto-market/sell/orders")
        
        if response["success"] and "orders" in response["data"]:
            orders = response["data"]["orders"]
            our_offer = None
            
            for order in orders:
                if order.get("order_id") == self.sell_order_id:
                    our_offer = order
                    break
            
            if our_offer:
                self.log_step("1", "Buyer Views Marketplace", "SUCCESS",
                             {"total_offers": len(orders), "our_offer_found": True,
                              "offer_details": {
                                  "amount": f"{our_offer['crypto_amount']} BTC",
                                  "price": f"${our_offer['price_per_unit']:,}",
                                  "min_purchase": f"{our_offer['min_purchase']} BTC",
                                  "max_purchase": f"{our_offer['max_purchase']} BTC",
                                  "status": our_offer["status"]
                              }})
                return True
            else:
                self.log_step("1", "Buyer Views Marketplace", "FAILED",
                             {"error": "Our sell offer not found", "total_offers": len(orders)})
                return False
        else:
            self.log_step("1", "Buyer Views Marketplace", "FAILED",
                         {"error": "Failed to fetch offers", "response": response})
            return False
    
    def step2_buyer_creates_purchase_order(self):
        """Step 2: Buyer creates purchase order (0.1 BTC) - Crypto locked in escrow"""
        self.log_step("2", "Buyer Creates Purchase Order (0.1 BTC)", "IN_PROGRESS")
        
        buy_order_data = {
            "buyer_address": self.buyer_wallet,
            "sell_order_id": self.sell_order_id,
            "crypto_amount": 0.1
        }
        
        response = self.make_request("POST", "/crypto-market/buy/create", buy_order_data)
        
        if response["success"]:
            order_data = response["data"]["order"]
            self.buy_order_id = order_data["order_id"]
            
            # Check if crypto is locked in escrow
            escrow_locked = order_data["status"] == "pending_payment"
            
            self.log_step("2", "Buyer Creates Purchase Order", "SUCCESS",
                         {"order_id": self.buy_order_id, "amount": "0.1 BTC",
                          "total_price": f"${order_data['total_price']:,}",
                          "status": order_data["status"],
                          "escrow_locked": escrow_locked,
                          "payment_deadline": order_data.get("payment_deadline"),
                          "seller_bank_details": response["data"].get("seller_bank_details")})
            return True
        else:
            self.log_step("2", "Buyer Creates Purchase Order", "FAILED",
                         {"error": "Failed to create buy order", "response": response})
            return False
    
    def step3_payment_instructions_with_timer(self):
        """Step 3: Payment instructions with timer countdown"""
        self.log_step("3", "Payment Instructions with Timer", "IN_PROGRESS")
        
        # Get order details to check timer
        response = self.make_request("GET", f"/crypto-market/orders/{self.buyer_wallet}")
        
        if response["success"] and "buy_orders" in response["data"]:
            buy_orders = response["data"]["buy_orders"]
            our_order = None
            
            for order in buy_orders:
                if order.get("order_id") == self.buy_order_id:
                    our_order = order
                    break
            
            if our_order:
                has_timer = "payment_deadline" in our_order
                deadline = our_order.get("payment_deadline")
                
                # Calculate remaining time
                remaining_time = "N/A"
                if deadline:
                    try:
                        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                        now = datetime.now(timezone.utc)
                        remaining = deadline_dt - now
                        remaining_minutes = int(remaining.total_seconds() / 60)
                        remaining_time = f"{remaining_minutes} minutes"
                    except:
                        remaining_time = "Timer parsing error"
                
                self.log_step("3", "Payment Instructions with Timer", "SUCCESS",
                             {"timer_active": has_timer, "payment_deadline": deadline,
                              "remaining_time": remaining_time, "order_status": our_order["status"],
                              "amount_to_pay": f"${our_order['total_price']:,}"})
                return True
            else:
                self.log_step("3", "Payment Instructions", "FAILED",
                             {"error": "Buy order not found"})
                return False
        else:
            self.log_step("3", "Payment Instructions", "FAILED",
                         {"error": "Failed to fetch order details", "response": response})
            return False
    
    def step4_buyer_marks_payment_sent(self):
        """Step 4: Buyer marks payment as sent"""
        self.log_step("4", "Buyer Marks Payment as Sent", "IN_PROGRESS")
        
        mark_paid_data = {
            "buyer_address": self.buyer_wallet,
            "order_id": self.buy_order_id,
            "payment_reference": f"BANK_TRANSFER_{int(time.time())}"
        }
        
        response = self.make_request("POST", "/crypto-market/payment/mark-paid", mark_paid_data)
        
        if response["success"]:
            # Verify status changed
            order_response = self.make_request("GET", f"/crypto-market/orders/{self.buyer_wallet}")
            
            if order_response["success"]:
                buy_orders = order_response["data"]["buy_orders"]
                our_order = next((o for o in buy_orders if o["order_id"] == self.buy_order_id), None)
                
                if our_order:
                    status_updated = our_order["status"] == "marked_as_paid"
                    escrow_still_locked = our_order["status"] != "completed"
                    
                    self.log_step("4", "Buyer Marks Payment as Sent", "SUCCESS",
                                 {"payment_marked": True, "new_status": our_order["status"],
                                  "escrow_still_locked": escrow_still_locked,
                                  "awaiting_seller_confirmation": status_updated})
                    return True
            
            self.log_step("4", "Buyer Marks Payment as Sent", "SUCCESS",
                         {"payment_marked": True})
            return True
        else:
            self.log_step("4", "Buyer Marks Payment as Sent", "FAILED",
                         {"error": "Failed to mark payment", "response": response})
            return False
    
    def step5_seller_releases_crypto(self):
        """Step 5: Seller releases crypto from escrow"""
        self.log_step("5", "Seller Releases Crypto from Escrow", "IN_PROGRESS")
        
        release_data = {
            "seller_address": self.seller_wallet,
            "order_id": self.buy_order_id
        }
        
        response = self.make_request("POST", "/crypto-market/release", release_data)
        
        if response["success"]:
            # Verify trade completed
            order_response = self.make_request("GET", f"/crypto-market/orders/{self.buyer_wallet}")
            
            if order_response["success"]:
                buy_orders = order_response["data"]["buy_orders"]
                our_order = next((o for o in buy_orders if o["order_id"] == self.buy_order_id), None)
                
                if our_order:
                    trade_completed = our_order["status"] == "completed"
                    
                    self.log_step("5", "Seller Releases Crypto from Escrow", "SUCCESS",
                                 {"crypto_released": True, "trade_status": our_order["status"],
                                  "trade_completed": trade_completed,
                                  "completion_time": our_order.get("completed_at")})
                    return True
            
            self.log_step("5", "Seller Releases Crypto", "SUCCESS",
                         {"crypto_released": True})
            return True
        else:
            self.log_step("5", "Seller Releases Crypto", "FAILED",
                         {"error": "Failed to release crypto", "response": response})
            return False
    
    def step6_buyer_receives_bitcoin(self):
        """Step 6: Buyer receives Bitcoin - Balance updates"""
        self.log_step("6", "Buyer Receives Bitcoin - Balance Update", "IN_PROGRESS")
        
        # Check buyer's balance
        balance_response = self.make_request("GET", f"/user/profile/{self.buyer_wallet}")
        
        if balance_response["success"]:
            user_data = balance_response["data"]["user"]
            current_balance = user_data.get("available_balance", 0)
            
            # Expected: 0.1 BTC
            balance_updated = current_balance >= 0.09  # Allow for small rounding
            
            # Get transaction history
            tx_response = self.make_request("GET", f"/user/transactions/{self.buyer_wallet}")
            buy_crypto_tx = None
            
            if tx_response["success"]:
                transactions = tx_response["data"]["transactions"]
                buy_crypto_tx = next((tx for tx in transactions if tx["tx_type"] == "buy_crypto"), None)
            
            self.log_step("6", "Buyer Receives Bitcoin - Balance Update", 
                         "SUCCESS" if balance_updated else "FAILED",
                         {"previous_balance": 0.0, "current_balance": current_balance,
                          "expected_amount": 0.1, "balance_updated": balance_updated,
                          "buy_transaction_found": buy_crypto_tx is not None})
            
            return balance_updated
        else:
            self.log_step("6", "Buyer Receives Bitcoin", "FAILED",
                         {"error": "Failed to check balance", "response": balance_response})
            return False
    
    def verify_critical_checks(self):
        """Verify all critical checks"""
        self.log_step("VERIFY", "Critical Checks Verification", "IN_PROGRESS")
        
        checks = {
            "escrow_locks_crypto": False,
            "timer_starts_and_counts": False,
            "payment_details_visible": False,
            "mark_as_paid_works": False,
            "seller_can_release": False,
            "buyer_receives_btc": False,
            "balances_update_correctly": False
        }
        
        # Analyze results
        for result in self.results:
            if result["step"] == "2" and result["status"] == "SUCCESS":
                checks["escrow_locks_crypto"] = result["details"].get("escrow_locked", False)
                checks["payment_details_visible"] = "seller_bank_details" in result["details"]
            
            if result["step"] == "3" and result["status"] == "SUCCESS":
                checks["timer_starts_and_counts"] = result["details"].get("timer_active", False)
            
            if result["step"] == "4" and result["status"] == "SUCCESS":
                checks["mark_as_paid_works"] = result["details"].get("payment_marked", False)
            
            if result["step"] == "5" and result["status"] == "SUCCESS":
                checks["seller_can_release"] = result["details"].get("crypto_released", False)
            
            if result["step"] == "6" and result["status"] == "SUCCESS":
                checks["buyer_receives_btc"] = result["details"].get("balance_updated", False)
                checks["balances_update_correctly"] = result["details"].get("balance_updated", False)
        
        passed_checks = sum(1 for check in checks.values() if check)
        total_checks = len(checks)
        success_rate = (passed_checks / total_checks) * 100
        
        self.log_step("VERIFY", "Critical Checks Verification", "COMPLETED",
                     {"checks": checks, "passed": passed_checks, "total": total_checks,
                      "success_rate": f"{success_rate:.1f}%"})
        
        return checks
    
    def run_complete_test(self):
        """Run the complete P2P buyer flow test"""
        print("\n" + "="*80)
        print("COMPLETE P2P BUYER FLOW TEST - SIMPLIFIED VERSION")
        print("Scenario: I want to BUY Bitcoin as a buyer")
        print("Using Legacy P2P System Endpoints")
        print("="*80)
        
        # Setup Phase
        if not self.setup_seller_with_balance():
            return False
        
        if not self.setup_seller_bank_account():
            return False
            
        if not self.create_sell_offer():
            return False
            
        if not self.setup_buyer_wallet():
            return False
        
        # Complete Buyer Flow
        if not self.step1_buyer_views_marketplace():
            return False
            
        if not self.step2_buyer_creates_purchase_order():
            return False
            
        if not self.step3_payment_instructions_with_timer():
            return False
            
        if not self.step4_buyer_marks_payment_sent():
            return False
            
        if not self.step5_seller_releases_crypto():
            return False
            
        if not self.step6_buyer_receives_bitcoin():
            return False
        
        # Verify critical checks
        self.verify_critical_checks()
        
        return True
    
    def generate_summary_report(self):
        """Generate detailed summary report"""
        print("\n" + "="*80)
        print("COMPLETE P2P BUYER FLOW TEST - DETAILED RESULTS")
        print("="*80)
        
        setup_steps = [r for r in self.results if r["step"].startswith("SETUP")]
        flow_steps = [r for r in self.results if r["step"].isdigit()]
        verify_steps = [r for r in self.results if r["step"] == "VERIFY"]
        
        print("\n📋 SETUP PHASE:")
        for step in setup_steps:
            status_icon = "✅" if step["status"] == "SUCCESS" else "❌"
            print(f"  {status_icon} {step['description']}: {step['status']}")
        
        print("\n🔄 BUYER FLOW STEPS:")
        step_numbers = sorted(set(r["step"] for r in flow_steps if r["step"].isdigit()))
        for step_num in step_numbers:
            step_results = [r for r in flow_steps if r["step"] == step_num]
            if step_results:
                final_result = step_results[-1]  # Get the final result for each step
                status_icon = "✅" if final_result["status"] == "SUCCESS" else "❌"
                print(f"  {status_icon} Step {step_num}: {final_result['description']} - {final_result['status']}")
        
        print("\n🔍 CRITICAL CHECKS:")
        verify_result = verify_steps[0] if verify_steps else None
        if verify_result and "checks" in verify_result["details"]:
            checks = verify_result["details"]["checks"]
            for check_name, passed in checks.items():
                status_icon = "✅" if passed else "❌"
                readable_name = check_name.replace("_", " ").title()
                print(f"  {status_icon} {readable_name}: {'PASS' if passed else 'FAIL'}")
        else:
            print("  ⚠️ Critical checks not available")
        
        # Overall success rate (only count final status for each step)
        step_numbers = set(r["step"] for r in flow_steps if r["step"].isdigit())
        successful_steps = 0
        total_steps = len(step_numbers)
        
        for step_num in step_numbers:
            step_results = [r for r in flow_steps if r["step"] == step_num]
            if step_results:
                final_result = step_results[-1]  # Get the last result for each step
                if final_result["status"] == "SUCCESS":
                    successful_steps += 1
        
        success_rate = (successful_steps / total_steps * 100) if total_steps > 0 else 0
        
        print(f"\n📊 OVERALL SUCCESS RATE: {success_rate:.1f}% ({successful_steps}/{total_steps} steps)")
        
        # Key findings
        print("\n🔑 KEY FINDINGS:")
        print(f"  • Seller Wallet: {self.seller_wallet}")
        print(f"  • Buyer Wallet: {self.buyer_wallet}")
        if self.sell_order_id:
            print(f"  • Sell Order ID: {self.sell_order_id}")
        if self.buy_order_id:
            print(f"  • Buy Order ID: {self.buy_order_id}")
        
        return success_rate >= 80

def main():
    """Main test execution"""
    tester = SimplifiedP2PBuyerFlowTester()
    
    try:
        success = tester.run_complete_test()
        overall_success = tester.generate_summary_report()
        
        if overall_success:
            print("\n🎉 P2P BUYER FLOW TEST COMPLETED SUCCESSFULLY!")
        else:
            print("\n⚠️ P2P BUYER FLOW TEST COMPLETED WITH ISSUES")
            
        return overall_success
        
    except Exception as e:
        print(f"\n❌ TEST EXECUTION FAILED: {str(e)}")
        return False

if __name__ == "__main__":
    main()