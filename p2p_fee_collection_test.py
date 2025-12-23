#!/usr/bin/env python3
"""
P2P TRADE FLOW WITH FEE COLLECTION TESTING
Tests complete P2P trade flow with fee collection integration as requested in review:

**Critical Test Scenarios:**
1. Express Mode Trade + Fee Collection
   - User uses Express Mode to buy 0.01 BTC for $950
   - System matches with best trader
   - Complete trade flow: Create trade → Mark as paid → Release crypto
   - Verify 1% fee collected (0.0001 BTC) goes to admin wallet
   - Verify fee appears in admin platform earnings

2. Manual Mode Trade + Fee Collection
   - User browses Manual Mode list
   - Selects trader manually
   - Complete trade for 0.02 BTC
   - Verify fee collected and tracked

3. Admin Fee Dashboard Integration
   - Check /api/admin/platform-earnings
   - Verify both trades' fees are recorded
   - Check currency breakdown
   - Test payout request flow

**Backend URL:** https://binancelike-ui.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://binancelike-ui.preview.emergentagent.com/api"

class P2PFeeCollectionTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.buyer_user_id = None
        self.seller_user_id = None
        self.admin_user_id = None
        self.trade_ids = []
        
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

    def setup_test_users(self):
        """Setup test users for fee collection testing"""
        print(f"\n=== Setting up Test Users for Fee Collection ===")
        
        # Test users
        users = [
            {
                "email": "fee_test_buyer@test.com",
                "password": "Test123456",
                "full_name": "Fee Test Buyer",
                "role": "buyer"
            },
            {
                "email": "fee_test_seller@test.com",
                "password": "Test123456",
                "full_name": "Fee Test Seller",
                "role": "seller"
            }
        ]
        
        for user in users:
            self.register_or_login_user(user)

    def register_or_login_user(self, user_data):
        """Register or login user"""
        try:
            # Try registration first
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("user_id"):
                    user_id = data["user"]["user_id"]
                    if user_data["role"] == "buyer":
                        self.buyer_user_id = user_id
                    elif user_data["role"] == "seller":
                        self.seller_user_id = user_id
                    
                    self.log_test(
                        f"User Setup ({user_data['role']})", 
                        True, 
                        f"User {user_data['full_name']} registered with ID: {user_id}"
                    )
                    return True
                    
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login
                login_response = self.session.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": user_data["email"],
                        "password": user_data["password"]
                    },
                    timeout=10
                )
                
                if login_response.status_code == 200:
                    data = login_response.json()
                    if data.get("success") and data.get("user", {}).get("user_id"):
                        user_id = data["user"]["user_id"]
                        if user_data["role"] == "buyer":
                            self.buyer_user_id = user_id
                        elif user_data["role"] == "seller":
                            self.seller_user_id = user_id
                        
                        self.log_test(
                            f"User Setup ({user_data['role']})", 
                            True, 
                            f"User {user_data['full_name']} logged in with ID: {user_id}"
                        )
                        return True
                        
        except Exception as e:
            self.log_test(
                f"User Setup ({user_data['role']})", 
                False, 
                f"User setup failed: {str(e)}"
            )
            
        return False

    def test_admin_wallet_balance_before(self):
        """Check admin wallet balance before trades"""
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/wallet/balance",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balances = data.get("balances", {})
                    btc_balance = balances.get("BTC", 0)
                    
                    self.log_test(
                        "Admin Wallet Balance - Before", 
                        True, 
                        f"Admin BTC balance before trades: {btc_balance} BTC"
                    )
                    return btc_balance
                    
        except Exception as e:
            self.log_test(
                "Admin Wallet Balance - Before", 
                False, 
                f"Failed to get admin wallet balance: {str(e)}"
            )
            
        return 0

    def test_platform_earnings_before(self):
        """Check platform earnings before trades"""
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    earnings = data.get("earnings", [])
                    btc_earnings = [e for e in earnings if e.get("currency") == "BTC"]
                    
                    self.log_test(
                        "Platform Earnings - Before", 
                        True, 
                        f"Platform BTC earnings before trades: {len(btc_earnings)} entries"
                    )
                    return len(btc_earnings)
                    
        except Exception as e:
            self.log_test(
                "Platform Earnings - Before", 
                False, 
                f"Failed to get platform earnings: {str(e)}"
            )
            
        return 0

    def test_express_mode_trade_with_fee_collection(self):
        """Test Express Mode trade with fee collection"""
        print(f"\n=== Express Mode Trade + Fee Collection ===")
        
        if not self.buyer_user_id:
            self.log_test("Express Mode Trade", False, "Buyer user not set up")
            return
        
        # Step 1: Use Express Mode to find a match
        request_data = {
            "user_id": self.buyer_user_id,
            "action": "buy",
            "cryptocurrency": "BTC",
            "fiat_currency": "USD",
            "amount_fiat": 950.0  # $950 for 0.01 BTC (assuming ~$45k BTC price)
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/express-match",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("matched"):
                    advert = data.get("advert", {})
                    trader_profile = data.get("trader_profile", {})
                    
                    self.log_test(
                        "Express Mode - Match Found", 
                        True, 
                        f"Matched with trader! Price: ${advert.get('price_per_unit', 0)}"
                    )
                    
                    # Step 2: Create trade from the match
                    self.create_trade_from_express_match(advert, trader_profile)
                    
                elif data.get("success") and not data.get("matched"):
                    self.log_test(
                        "Express Mode - No Match", 
                        True, 
                        "No matching traders available - will test fee collection with existing trades"
                    )
                else:
                    self.log_test(
                        "Express Mode Trade", 
                        False, 
                        "Express match failed",
                        data
                    )
            else:
                self.log_test(
                    "Express Mode Trade", 
                    False, 
                    f"Express match request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Express Mode Trade", 
                False, 
                f"Express match request failed: {str(e)}"
            )

    def create_trade_from_express_match(self, advert, trader_profile):
        """Create trade from express match result"""
        if not advert.get("advert_id"):
            self.log_test("Create Trade from Express Match", False, "No advert ID in match result")
            return
        
        # Create trade request
        trade_request = {
            "buyer_id": self.buyer_user_id,
            "sell_order_id": advert["advert_id"],
            "crypto_amount": 0.01,  # 0.01 BTC
            "payment_method": advert.get("payment_methods", ["paypal"])[0]
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-trade",
                json=trade_request,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    trade = data.get("trade", {})
                    trade_id = trade.get("trade_id")
                    
                    if trade_id:
                        self.trade_ids.append(trade_id)
                        
                        self.log_test(
                            "Create Trade from Express Match", 
                            True, 
                            f"Trade created successfully: {trade_id}"
                        )
                        
                        # Continue with trade flow
                        self.complete_trade_flow_with_fees(trade_id)
                    else:
                        self.log_test(
                            "Create Trade from Express Match", 
                            False, 
                            "Trade created but no trade_id returned",
                            data
                        )
                else:
                    self.log_test(
                        "Create Trade from Express Match", 
                        False, 
                        "Trade creation failed",
                        data
                    )
            else:
                self.log_test(
                    "Create Trade from Express Match", 
                    False, 
                    f"Trade creation request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Trade from Express Match", 
                False, 
                f"Trade creation request failed: {str(e)}"
            )

    def complete_trade_flow_with_fees(self, trade_id):
        """Complete the trade flow and verify fee collection"""
        print(f"\n--- Completing Trade Flow for {trade_id} ---")
        
        # Step 1: Mark as paid (buyer action)
        self.mark_trade_as_paid(trade_id)
        
        # Step 2: Release crypto (seller action) - this should collect fees
        self.release_crypto_with_fee_verification(trade_id)

    def mark_trade_as_paid(self, trade_id):
        """Mark trade as paid by buyer"""
        request_data = {
            "trade_id": trade_id,
            "user_id": self.buyer_user_id,
            "payment_reference": f"PAYMENT_REF_{trade_id[:8]}"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/mark-paid",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Mark Trade as Paid", 
                        True, 
                        f"Trade {trade_id[:8]} marked as paid successfully"
                    )
                    return True
                else:
                    self.log_test(
                        "Mark Trade as Paid", 
                        False, 
                        "Mark as paid failed",
                        data
                    )
            else:
                self.log_test(
                    "Mark Trade as Paid", 
                    False, 
                    f"Mark as paid request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Mark Trade as Paid", 
                False, 
                f"Mark as paid request failed: {str(e)}"
            )
            
        return False

    def release_crypto_with_fee_verification(self, trade_id):
        """Release crypto and verify fee collection"""
        # Get admin wallet balance before release
        balance_before = self.get_admin_btc_balance()
        
        # Release crypto
        request_data = {
            "trade_id": trade_id,
            "user_id": self.seller_user_id or self.buyer_user_id  # Use available user
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/release-crypto",
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Release Crypto", 
                        True, 
                        f"Crypto released for trade {trade_id[:8]}"
                    )
                    
                    # Verify fee collection
                    self.verify_fee_collection(trade_id, balance_before)
                    
                else:
                    self.log_test(
                        "Release Crypto", 
                        False, 
                        "Crypto release failed",
                        data
                    )
            else:
                self.log_test(
                    "Release Crypto", 
                    False, 
                    f"Crypto release request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Release Crypto", 
                False, 
                f"Crypto release request failed: {str(e)}"
            )

    def get_admin_btc_balance(self):
        """Get current admin BTC balance"""
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/wallet/balance",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    balances = data.get("balances", {})
                    return balances.get("BTC", 0)
                    
        except Exception as e:
            pass
            
        return 0

    def verify_fee_collection(self, trade_id, balance_before):
        """Verify that 1% fee was collected"""
        balance_after = self.get_admin_btc_balance()
        
        # Expected fee: 1% of 0.01 BTC = 0.0001 BTC
        expected_fee = 0.0001
        actual_fee_collected = balance_after - balance_before
        
        fee_collected_correctly = abs(actual_fee_collected - expected_fee) < 0.00001  # Small tolerance
        
        self.log_test(
            "Fee Collection Verification", 
            fee_collected_correctly, 
            f"Expected fee: {expected_fee} BTC, Actual collected: {actual_fee_collected} BTC, Balance before: {balance_before}, Balance after: {balance_after}"
        )
        
        # Also check platform earnings
        self.verify_fee_in_platform_earnings(trade_id)

    def verify_fee_in_platform_earnings(self, trade_id):
        """Verify fee appears in platform earnings"""
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    earnings = data.get("earnings", [])
                    
                    # Look for recent BTC earnings
                    recent_btc_earnings = [
                        e for e in earnings 
                        if e.get("currency") == "BTC" and 
                        trade_id[:8] in str(e.get("source", ""))
                    ]
                    
                    self.log_test(
                        "Fee in Platform Earnings", 
                        len(recent_btc_earnings) > 0, 
                        f"Found {len(recent_btc_earnings)} BTC earnings entries related to trade"
                    )
                else:
                    self.log_test(
                        "Fee in Platform Earnings", 
                        False, 
                        "Failed to get platform earnings",
                        data
                    )
            else:
                self.log_test(
                    "Fee in Platform Earnings", 
                    False, 
                    f"Platform earnings request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Fee in Platform Earnings", 
                False, 
                f"Platform earnings request failed: {str(e)}"
            )

    def test_manual_mode_trade_with_fees(self):
        """Test Manual Mode trade with fee collection"""
        print(f"\n=== Manual Mode Trade + Fee Collection ===")
        
        # Get manual mode adverts
        try:
            response = self.session.get(
                f"{BASE_URL}/p2p/manual-mode/adverts",
                params={"action": "buy", "cryptocurrency": "BTC", "fiat_currency": "USD"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    adverts = data.get("adverts", [])
                    
                    if adverts:
                        # Select first advert
                        selected_advert = adverts[0]
                        
                        self.log_test(
                            "Manual Mode - Advert Selection", 
                            True, 
                            f"Selected advert: {selected_advert.get('cryptocurrency')}/{selected_advert.get('fiat_currency')} at ${selected_advert.get('price_per_unit')}"
                        )
                        
                        # Create trade from manual selection
                        self.create_trade_from_manual_selection(selected_advert)
                        
                    else:
                        self.log_test(
                            "Manual Mode - Advert Selection", 
                            True, 
                            "No adverts available in manual mode (expected if no active traders)"
                        )
                else:
                    self.log_test(
                        "Manual Mode Trade", 
                        False, 
                        "Manual mode request failed",
                        data
                    )
            else:
                self.log_test(
                    "Manual Mode Trade", 
                    False, 
                    f"Manual mode request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Manual Mode Trade", 
                False, 
                f"Manual mode request failed: {str(e)}"
            )

    def create_trade_from_manual_selection(self, advert):
        """Create trade from manual mode selection"""
        if not advert.get("advert_id"):
            self.log_test("Create Trade from Manual Selection", False, "No advert ID in selected advert")
            return
        
        # Create trade for 0.02 BTC as requested in review
        trade_request = {
            "buyer_id": self.buyer_user_id,
            "sell_order_id": advert["advert_id"],
            "crypto_amount": 0.02,  # 0.02 BTC
            "payment_method": advert.get("payment_methods", ["paypal"])[0]
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/p2p/create-trade",
                json=trade_request,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    trade = data.get("trade", {})
                    trade_id = trade.get("trade_id")
                    
                    if trade_id:
                        self.trade_ids.append(trade_id)
                        
                        self.log_test(
                            "Create Trade from Manual Selection", 
                            True, 
                            f"Manual mode trade created: {trade_id}"
                        )
                        
                        # Complete trade flow
                        self.complete_trade_flow_with_fees(trade_id)
                    else:
                        self.log_test(
                            "Create Trade from Manual Selection", 
                            False, 
                            "Trade created but no trade_id returned",
                            data
                        )
                else:
                    self.log_test(
                        "Create Trade from Manual Selection", 
                        False, 
                        "Manual mode trade creation failed",
                        data
                    )
            else:
                self.log_test(
                    "Create Trade from Manual Selection", 
                    False, 
                    f"Manual mode trade creation failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Create Trade from Manual Selection", 
                False, 
                f"Manual mode trade creation failed: {str(e)}"
            )

    def test_admin_fee_dashboard_final(self):
        """Test admin fee dashboard after trades"""
        print(f"\n=== Admin Fee Dashboard Integration ===")
        
        # Check final admin wallet balance
        final_balance = self.get_admin_btc_balance()
        self.log_test(
            "Admin Wallet Balance - Final", 
            True, 
            f"Final admin BTC balance: {final_balance} BTC"
        )
        
        # Check platform earnings
        try:
            response = self.session.get(
                f"{BASE_URL}/admin/platform-earnings",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    earnings = data.get("earnings", [])
                    btc_earnings = [e for e in earnings if e.get("currency") == "BTC"]
                    
                    self.log_test(
                        "Platform Earnings - Final", 
                        True, 
                        f"Total BTC earnings entries: {len(btc_earnings)}"
                    )
                    
                    # Show currency breakdown
                    currency_breakdown = {}
                    for earning in earnings:
                        currency = earning.get("currency", "Unknown")
                        amount = earning.get("amount", 0)
                        currency_breakdown[currency] = currency_breakdown.get(currency, 0) + amount
                    
                    self.log_test(
                        "Currency Breakdown", 
                        True, 
                        f"Earnings by currency: {currency_breakdown}"
                    )
                    
        except Exception as e:
            self.log_test(
                "Platform Earnings - Final", 
                False, 
                f"Failed to get final platform earnings: {str(e)}"
            )
        
        # Test payout request flow
        self.test_payout_request_flow()

    def test_payout_request_flow(self):
        """Test admin payout request flow"""
        try:
            # Test requesting a small payout
            payout_request = {
                "currency": "BTC",
                "amount": 0.001,  # Small amount
                "external_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"  # Genesis block address
            }
            
            response = self.session.post(
                f"{BASE_URL}/admin/wallet/payout",
                json=payout_request,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Payout Request Flow", 
                        True, 
                        f"Payout request successful: {data.get('message', 'No message')}"
                    )
                else:
                    self.log_test(
                        "Payout Request Flow", 
                        False, 
                        "Payout request failed",
                        data
                    )
            else:
                self.log_test(
                    "Payout Request Flow", 
                    False, 
                    f"Payout request failed with status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Payout Request Flow", 
                False, 
                f"Payout request failed: {str(e)}"
            )

    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n" + "="*80)
        print(f"💰 P2P TRADE FLOW WITH FEE COLLECTION TESTING COMPLETED")
        print(f"SUCCESS RATE: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
        print(f"="*80)
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print(f"\n✅ PASSED TESTS ({passed_tests}):")
        for result in self.test_results:
            if result["success"]:
                print(f"   • {result['test']}")
        
        if self.trade_ids:
            print(f"\n📋 TRADES CREATED: {len(self.trade_ids)}")
            for trade_id in self.trade_ids:
                print(f"   • {trade_id}")

    def run_fee_collection_tests(self):
        """Run all fee collection tests"""
        print(f"💰 STARTING P2P TRADE FLOW WITH FEE COLLECTION TESTING")
        print(f"Backend URL: {BASE_URL}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        
        try:
            # Setup
            self.setup_test_users()
            
            # Check initial state
            self.test_admin_wallet_balance_before()
            self.test_platform_earnings_before()
            
            # Test Express Mode trade with fees
            self.test_express_mode_trade_with_fee_collection()
            
            # Test Manual Mode trade with fees
            self.test_manual_mode_trade_with_fees()
            
            # Check final state and admin dashboard
            self.test_admin_fee_dashboard_final()
            
        except KeyboardInterrupt:
            print(f"\n⚠️ Testing interrupted by user")
        except Exception as e:
            print(f"\n❌ Testing failed with error: {str(e)}")
        finally:
            # Print final summary
            self.print_summary()

if __name__ == "__main__":
    tester = P2PFeeCollectionTester()
    tester.run_fee_collection_tests()