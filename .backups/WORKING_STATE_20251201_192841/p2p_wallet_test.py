#!/usr/bin/env python3
"""
P2P Marketplace Wallet Service Integration Test
Focused test for the wallet service balance issue reported by the main agent.

Issue: Seller was funded with 1.0 BTC but wallet service reported 0.0 available balance
when creating P2P trade.
"""

import requests
import json
import sys
import uuid
from datetime import datetime

class P2PWalletServiceTest:
    def __init__(self, base_url="https://tradepanel-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Use the seller ID from agent's note
        self.seller_id = "ed798114-869e-45c3-b77c-a95bbec6867e"
        self.buyer_id = str(uuid.uuid4())
        
        # Test data
        self.crypto_currency = "BTC"
        self.crypto_amount = 0.1
        self.fiat_currency = "USD"
        self.price_per_unit = 50000.0
        self.payment_method = "bank_transfer"
        
        # Store created IDs
        self.sell_order_id = None
        self.trade_id = None

    def log_test(self, test_name: str, success: bool, details: str = "", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED - {details}")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
        
        if response_data:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })

    def make_request(self, method: str, endpoint: str, data=None):
        """Make HTTP request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text, "status_code": response.status_code}
            
            return response.status_code < 400, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_1_check_wallet_service_balance(self):
        """Test 1: Check wallet service balance for seller"""
        print("\n🔍 Test 1: Checking wallet service balance...")
        
        success, response = self.make_request('GET', f'wallet/balance/{self.seller_id}/{self.crypto_currency}')
        
        if success and response.get('success'):
            balance_data = response.get('balance', {})
            available = balance_data.get('available_balance', 0)
            total = balance_data.get('total_balance', 0)
            locked = balance_data.get('locked_balance', 0)
            
            self.log_test(
                "Wallet Service Balance Check", 
                True,
                f"Available: {available}, Total: {total}, Locked: {locked}",
                balance_data
            )
            return available, total, locked
        else:
            self.log_test("Wallet Service Balance Check", False, "Failed to get balance", response)
            return 0, 0, 0

    def test_2_check_crypto_balances_collection(self):
        """Test 2: Check crypto_balances collection directly"""
        print("\n🔍 Test 2: Checking crypto_balances collection...")
        
        # Try to get balance from crypto-bank endpoint
        success, response = self.make_request('GET', f'crypto-bank/balances/{self.seller_id}')
        
        if success and response.get('success'):
            balances = response.get('balances', [])
            btc_balance = None
            
            for balance in balances:
                if balance.get('currency') == self.crypto_currency:
                    btc_balance = balance.get('balance', 0)
                    break
            
            self.log_test(
                "Crypto Balances Collection Check", 
                True,
                f"BTC balance in crypto_balances: {btc_balance}",
                {"btc_balance": btc_balance, "all_balances": balances}
            )
            return btc_balance
        else:
            self.log_test("Crypto Balances Collection Check", False, "Failed to get crypto balances", response)
            return 0

    def test_3_fund_seller_via_wallet_service(self):
        """Test 3: Fund seller via wallet service"""
        print("\n💰 Test 3: Funding seller via wallet service...")
        
        fund_data = {
            "user_id": self.seller_id,
            "currency": self.crypto_currency,
            "amount": 1.0,
            "transaction_type": "test_funding",
            "reference_id": f"test_{uuid.uuid4()}"
        }
        
        success, response = self.make_request('POST', 'wallet/credit', fund_data)
        
        if success and response.get('success'):
            self.log_test("Fund Seller via Wallet Service", True, "Seller funded successfully", response)
            return True
        else:
            self.log_test("Fund Seller via Wallet Service", False, "Failed to fund seller", response)
            return False

    def test_4_verify_balance_after_funding(self):
        """Test 4: Verify balance after funding"""
        print("\n🔍 Test 4: Verifying balance after funding...")
        
        available, total, locked = self.test_1_check_wallet_service_balance()
        
        if available >= 1.0 and total >= 1.0:
            self.log_test(
                "Balance After Funding", 
                True,
                f"Balance updated correctly: Available={available}, Total={total}"
            )
            return True
        else:
            self.log_test(
                "Balance After Funding", 
                False,
                f"Balance not updated: Available={available}, Total={total}"
            )
            return False

    def test_5_create_p2p_offer(self):
        """Test 5: Create P2P offer"""
        print("\n📝 Test 5: Creating P2P offer...")
        
        offer_data = {
            "seller_id": self.seller_id,
            "crypto_currency": self.crypto_currency,
            "crypto_amount": self.crypto_amount,
            "fiat_currency": self.fiat_currency,
            "price_per_unit": self.price_per_unit,
            "min_purchase": 0.01,
            "max_purchase": self.crypto_amount,
            "payment_methods": [self.payment_method],
            "seller_requirements": []
        }
        
        success, response = self.make_request('POST', 'p2p/create-offer', offer_data)
        
        if success and response.get('success'):
            self.sell_order_id = response.get('order_id')
            self.log_test("Create P2P Offer", True, f"Offer created: {self.sell_order_id}", response)
            return True
        else:
            self.log_test("Create P2P Offer", False, "Failed to create offer", response)
            return False

    def test_6_create_p2p_trade(self):
        """Test 6: Create P2P trade (this is where the wallet service issue occurs)"""
        print("\n🤝 Test 6: Creating P2P trade (testing wallet service integration)...")
        
        if not self.sell_order_id:
            self.log_test("Create P2P Trade", False, "No sell order ID available")
            return False
        
        trade_data = {
            "sell_order_id": self.sell_order_id,
            "buyer_id": self.buyer_id,
            "crypto_amount": self.crypto_amount,
            "payment_method": self.payment_method,
            "buyer_wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "buyer_wallet_network": "mainnet"
        }
        
        success, response = self.make_request('POST', 'p2p/create-trade', trade_data)
        
        if success and response.get('success'):
            self.trade_id = response.get('trade_id')
            self.log_test("Create P2P Trade", True, f"Trade created: {self.trade_id}", response)
            return True
        else:
            # This is where we expect to see the wallet service balance issue
            error_msg = response.get('detail', 'Unknown error')
            if "insufficient available balance" in error_msg.lower():
                self.log_test(
                    "Create P2P Trade", 
                    False, 
                    f"WALLET SERVICE BALANCE ISSUE CONFIRMED: {error_msg}",
                    response
                )
            else:
                self.log_test("Create P2P Trade", False, f"Trade creation failed: {error_msg}", response)
            return False

    def test_7_debug_wallet_collections(self):
        """Test 7: Debug wallet collections to understand the issue"""
        print("\n🔧 Test 7: Debugging wallet collections...")
        
        # Check if there are multiple wallet collections
        print("   Checking different wallet endpoints...")
        
        # Check wallets collection
        success1, response1 = self.make_request('GET', f'wallet/balance/{self.seller_id}/{self.crypto_currency}')
        
        # Check crypto_balances collection  
        success2, response2 = self.make_request('GET', f'crypto-bank/balances/{self.seller_id}')
        
        # Check user profile
        success3, response3 = self.make_request('GET', f'user/profile/{self.seller_id}')
        
        debug_info = {
            "wallet_service_balance": response1 if success1 else "Failed",
            "crypto_balances_collection": response2 if success2 else "Failed", 
            "user_profile": response3 if success3 else "Failed"
        }
        
        self.log_test(
            "Debug Wallet Collections", 
            True,
            "Collected debug information from different endpoints",
            debug_info
        )
        
        return debug_info

    def test_8_test_wallet_transactions(self):
        """Test 8: Check wallet transactions"""
        print("\n📊 Test 8: Checking wallet transactions...")
        
        success, response = self.make_request('GET', f'wallet/transactions/{self.seller_id}?limit=10')
        
        if success and response.get('success'):
            transactions = response.get('transactions', [])
            self.log_test(
                "Wallet Transactions", 
                True,
                f"Found {len(transactions)} transactions",
                {"transaction_count": len(transactions), "recent_transactions": transactions[:3]}
            )
            return transactions
        else:
            self.log_test("Wallet Transactions", False, "Failed to get transactions", response)
            return []

    def test_9_manual_balance_sync(self):
        """Test 9: Try to manually sync balances"""
        print("\n🔄 Test 9: Attempting manual balance sync...")
        
        # Try to sync balances between collections
        sync_data = {
            "user_id": self.seller_id,
            "action": "sync_balances"
        }
        
        success, response = self.make_request('POST', 'admin/sync-balances', sync_data)
        
        if success:
            self.log_test("Manual Balance Sync", True, "Balance sync attempted", response)
            return True
        else:
            self.log_test("Manual Balance Sync", False, "Balance sync failed", response)
            return False

    def test_10_final_balance_check(self):
        """Test 10: Final balance check after all operations"""
        print("\n🔍 Test 10: Final balance check...")
        
        available, total, locked = self.test_1_check_wallet_service_balance()
        crypto_balance = self.test_2_check_crypto_balances_collection()
        
        self.log_test(
            "Final Balance Check", 
            True,
            f"Wallet Service: Available={available}, Total={total}, Locked={locked} | Crypto Balances: {crypto_balance}",
            {
                "wallet_service": {"available": available, "total": total, "locked": locked},
                "crypto_balances": crypto_balance
            }
        )
        
        return available, total, locked, crypto_balance

    def run_all_tests(self):
        """Run all P2P wallet service tests"""
        print("🚀 Starting P2P Wallet Service Integration Tests...")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Seller ID: {self.seller_id}")
        print(f"👤 Buyer ID: {self.buyer_id}")
        print(f"💰 Test Amount: {self.crypto_amount} {self.crypto_currency}")
        print("🎯 Focus: Investigating wallet service balance issue")
        
        # Run tests in sequence
        tests = [
            self.test_1_check_wallet_service_balance,
            self.test_2_check_crypto_balances_collection,
            self.test_3_fund_seller_via_wallet_service,
            self.test_4_verify_balance_after_funding,
            self.test_5_create_p2p_offer,
            self.test_6_create_p2p_trade,  # This should reveal the issue
            self.test_7_debug_wallet_collections,
            self.test_8_test_wallet_transactions,
            self.test_9_manual_balance_sync,
            self.test_10_final_balance_check
        ]
        
        for test_func in tests:
            try:
                print(f"\n" + "="*60)
                result = test_func()
            except Exception as e:
                print(f"\n❌ Test error in {test_func.__name__}: {str(e)}")
                self.log_test(test_func.__name__, False, f"Exception: {str(e)}")
        
        # Print summary
        print(f"\n" + "="*60)
        print(f"📊 P2P Wallet Service Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        # Print key findings
        print(f"\n🔍 Key Findings:")
        for result in self.test_results:
            if "wallet service balance issue" in result['details'].lower():
                print(f"   🚨 ISSUE CONFIRMED: {result['details']}")
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    """Main test execution"""
    tester = P2PWalletServiceTest()
    
    try:
        passed, total, results = tester.run_all_tests()
        
        # Save results
        with open('/app/test_reports/p2p_wallet_service_test.json', 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "test_focus": "P2P Wallet Service Integration Issue",
                "seller_id": tester.seller_id,
                "summary": {
                    "tests_run": total,
                    "tests_passed": passed,
                    "success_rate": (passed/total*100) if total > 0 else 0
                },
                "results": results
            }, f, indent=2)
        
        print(f"\n📄 Results saved to: /app/test_reports/p2p_wallet_service_test.json")
        
        return 0 if passed == total else 1
        
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())