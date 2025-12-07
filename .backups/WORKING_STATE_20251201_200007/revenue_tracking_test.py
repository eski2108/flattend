#!/usr/bin/env python3
"""
Revenue Tracking Endpoints Testing
Tests the new Revenue Tracking endpoints as requested in the review.
"""

import requests
import json
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://marketview-36.preview.emergentagent.com"

def test_revenue_summary_endpoint():
    """Test GET /api/admin/revenue/summary with different periods"""
    print("🎯 TESTING REVENUE SUMMARY ENDPOINT")
    print("=" * 60)
    
    periods = ["day", "week", "month", "all"]
    results = {}
    
    for period in periods:
        print(f"\n📊 Testing period: {period}")
        print("-" * 40)
        
        try:
            url = f"{BACKEND_URL}/api/admin/revenue/summary?period={period}"
            response = requests.get(url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS - Response received")
                
                # Verify required fields
                required_fields = ["success", "summary"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    results[period] = False
                    continue
                
                # Check success flag
                if not data.get("success"):
                    print(f"❌ Success flag is False")
                    results[period] = False
                    continue
                
                # Verify summary structure
                summary = data.get("summary", {})
                required_summary_fields = [
                    "total_profit",
                    "total_fee_wallet_gbp", 
                    "revenue_breakdown",
                    "fee_wallet_breakdown"
                ]
                
                missing_summary_fields = [field for field in required_summary_fields if field not in summary]
                if missing_summary_fields:
                    print(f"❌ Missing summary fields: {missing_summary_fields}")
                    results[period] = False
                    continue
                
                # Verify revenue_breakdown structure
                revenue_breakdown = summary.get("revenue_breakdown", {})
                required_breakdown_fields = [
                    "trading_fees",
                    "markup_markdown_profit", 
                    "express_buy_fees",
                    "p2p_fees",
                    "moonpay_revenue"
                ]
                
                missing_breakdown_fields = [field for field in required_breakdown_fields if field not in revenue_breakdown]
                if missing_breakdown_fields:
                    print(f"❌ Missing revenue breakdown fields: {missing_breakdown_fields}")
                    results[period] = False
                    continue
                
                # Display actual response data
                print(f"📈 REVENUE SUMMARY DATA ({period.upper()}):")
                print(f"   Total Profit: £{summary.get('total_profit', 0)}")
                print(f"   Total Fee Wallet (GBP): £{summary.get('total_fee_wallet_gbp', 0)}")
                print(f"   Revenue Breakdown:")
                print(f"     - Trading Fees: £{revenue_breakdown.get('trading_fees', 0)}")
                print(f"     - Markup/Markdown Profit: £{revenue_breakdown.get('markup_markdown_profit', 0)}")
                print(f"     - Express Buy Fees: £{revenue_breakdown.get('express_buy_fees', 0)}")
                print(f"     - P2P Fees: £{revenue_breakdown.get('p2p_fees', 0)}")
                print(f"     - MoonPay Revenue: £{revenue_breakdown.get('moonpay_revenue', 0)}")
                
                # Display fee wallet breakdown by currency
                fee_wallet_breakdown = summary.get("fee_wallet_breakdown", {})
                if fee_wallet_breakdown:
                    print(f"   Fee Wallet Breakdown by Currency:")
                    for currency, details in fee_wallet_breakdown.items():
                        print(f"     - {currency}: {details.get('total_fees', 0)} (£{details.get('gbp_value', 0)})")
                
                results[period] = True
                print(f"✅ Period {period} test PASSED")
                
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text}")
                results[period] = False
                
        except Exception as e:
            print(f"❌ Exception occurred: {str(e)}")
            results[period] = False
    
    return results

def test_revenue_transactions_endpoint():
    """Test GET /api/admin/revenue/transactions with different filters"""
    print("\n\n🎯 TESTING REVENUE TRANSACTIONS ENDPOINT")
    print("=" * 60)
    
    # Test different combinations
    test_cases = [
        {"period": "day", "transaction_type": "all"},
        {"period": "week", "transaction_type": "all"},
        {"period": "month", "transaction_type": "all"},
        {"period": "all", "transaction_type": "all"},
        {"period": "day", "transaction_type": "trading"},
        {"period": "day", "transaction_type": "p2p"},
        {"period": "day", "transaction_type": "express_buy"}
    ]
    
    results = {}
    
    for test_case in test_cases:
        period = test_case["period"]
        transaction_type = test_case["transaction_type"]
        test_key = f"{period}_{transaction_type}"
        
        print(f"\n📊 Testing period: {period}, type: {transaction_type}")
        print("-" * 50)
        
        try:
            url = f"{BACKEND_URL}/api/admin/revenue/transactions?period={period}&transaction_type={transaction_type}"
            response = requests.get(url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS - Response received")
                
                # Verify required fields
                required_fields = ["success", "transactions"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    results[test_key] = False
                    continue
                
                # Check success flag
                if not data.get("success"):
                    print(f"❌ Success flag is False")
                    results[test_key] = False
                    continue
                
                # Verify transactions structure
                transactions = data.get("transactions", [])
                print(f"📈 TRANSACTIONS DATA ({period.upper()}, {transaction_type.upper()}):")
                print(f"   Total Transactions: {len(transactions)}")
                
                if transactions:
                    print(f"   Sample Transaction Structure:")
                    sample_txn = transactions[0]
                    required_txn_fields = [
                        "transaction_id",
                        "timestamp", 
                        "type",
                        "amount",
                        "currency"
                    ]
                    
                    missing_txn_fields = [field for field in required_txn_fields if field not in sample_txn]
                    if missing_txn_fields:
                        print(f"❌ Missing transaction fields: {missing_txn_fields}")
                        results[test_key] = False
                        continue
                    
                    # Display sample transactions
                    for i, txn in enumerate(transactions[:3]):  # Show first 3 transactions
                        print(f"     Transaction {i+1}:")
                        print(f"       - ID: {txn.get('transaction_id', 'N/A')}")
                        print(f"       - Timestamp: {txn.get('timestamp', 'N/A')}")
                        print(f"       - Type: {txn.get('type', 'N/A')}")
                        print(f"       - Amount: {txn.get('amount', 0)} {txn.get('currency', 'N/A')}")
                        if 'subtype' in txn:
                            print(f"       - Subtype: {txn.get('subtype', 'N/A')}")
                        if 'user_id' in txn:
                            print(f"       - User ID: {txn.get('user_id', 'N/A')}")
                else:
                    print(f"   No transactions found for this period/type")
                
                results[test_key] = True
                print(f"✅ Test case {test_key} PASSED")
                
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text}")
                results[test_key] = False
                
        except Exception as e:
            print(f"❌ Exception occurred: {str(e)}")
            results[test_key] = False
    
    return results

def main():
    """Main test execution"""
    print("🚀 REVENUE TRACKING ENDPOINTS COMPREHENSIVE TESTING")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Test revenue summary endpoint
    summary_results = test_revenue_summary_endpoint()
    
    # Test revenue transactions endpoint  
    transactions_results = test_revenue_transactions_endpoint()
    
    # Final results summary
    print("\n\n🎯 FINAL TEST RESULTS SUMMARY")
    print("=" * 60)
    
    print("\n📊 Revenue Summary Endpoint Results:")
    summary_passed = 0
    summary_total = len(summary_results)
    for period, passed in summary_results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"   {period}: {status}")
        if passed:
            summary_passed += 1
    
    print(f"\n📊 Revenue Transactions Endpoint Results:")
    transactions_passed = 0
    transactions_total = len(transactions_results)
    for test_case, passed in transactions_results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"   {test_case}: {status}")
        if passed:
            transactions_passed += 1
    
    # Overall success rate
    total_passed = summary_passed + transactions_passed
    total_tests = summary_total + transactions_total
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n🎯 OVERALL RESULTS:")
    print(f"   Revenue Summary Tests: {summary_passed}/{summary_total} passed")
    print(f"   Revenue Transactions Tests: {transactions_passed}/{transactions_total} passed")
    print(f"   Total Success Rate: {success_rate:.1f}% ({total_passed}/{total_tests})")
    
    if success_rate >= 90:
        print(f"🎉 EXCELLENT: Revenue tracking endpoints are working perfectly!")
    elif success_rate >= 70:
        print(f"✅ GOOD: Revenue tracking endpoints are mostly functional")
    else:
        print(f"⚠️  NEEDS ATTENTION: Revenue tracking endpoints have issues")
    
    return success_rate >= 70

if __name__ == "__main__":
    main()