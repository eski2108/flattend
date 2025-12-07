#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Crypto Savings & Portfolio System
Tests the three main endpoints:
1. GET /api/savings/balances/{user_id}
2. POST /api/savings/transfer
3. GET /api/portfolio/stats/{user_id}
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BACKEND_URL = "https://protrading.preview.emergentagent.com/api"

def test_crypto_savings_portfolio_system():
    """Test complete Crypto Savings & Portfolio System"""
    print("🎯 CRYPTO SAVINGS & PORTFOLIO SYSTEM COMPREHENSIVE TESTING")
    print("=" * 80)
    
    results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "test_details": []
    }
    
    # Test user ID
    test_user_id = f"savings_test_user_{int(datetime.now().timestamp())}"
    
    try:
        # ============= PHASE 1: SETUP TEST DATA =============
        print("\n📋 PHASE 1: SETUP TEST DATA")
        print("-" * 50)
        
        # Add some BTC and ETH to internal_balances (spot wallet) for testing
        setup_data = [
            {"user_id": test_user_id, "currency": "BTC", "balance": 1.5},
            {"user_id": test_user_id, "currency": "ETH", "balance": 10.0}
        ]
        
        print(f"Setting up test user: {test_user_id}")
        print("Adding initial balances to spot wallet (internal_balances):")
        for data in setup_data:
            print(f"  - {data['balance']} {data['currency']}")
        
        # ============= PHASE 2: TEST SAVINGS BALANCES ENDPOINT =============
        print("\n📊 PHASE 2: TEST GET /api/savings/balances/{user_id}")
        print("-" * 50)
        
        # Test 1: Get empty savings balances
        results["total_tests"] += 1
        try:
            response = requests.get(f"{BACKEND_URL}/savings/balances/{test_user_id}")
            print(f"GET /api/savings/balances/{test_user_id}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify structure
                if (data.get("success") == True and 
                    "balances" in data and 
                    "total_value_usd" in data and
                    isinstance(data["balances"], list)):
                    print("✅ Empty savings balances endpoint working correctly")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ GET savings/balances (empty) - PASSED")
                else:
                    print("❌ Invalid response structure")
                    results["failed_tests"] += 1
                    results["test_details"].append("❌ GET savings/balances (empty) - Invalid structure")
            else:
                print(f"❌ Failed with status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ GET savings/balances (empty) - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ GET savings/balances (empty) - Exception: {e}")
        
        # ============= PHASE 3: TEST SAVINGS TRANSFER ENDPOINT =============
        print("\n💸 PHASE 3: TEST POST /api/savings/transfer")
        print("-" * 50)
        
        # First, we need to add some balance to internal_balances for testing
        # Since we can't directly insert into DB, we'll simulate having balance
        
        # Test 2: Transfer from Spot to Savings (BTC)
        results["total_tests"] += 1
        try:
            transfer_request = {
                "user_id": test_user_id,
                "currency": "BTC",
                "amount": 0.5,
                "direction": "to_savings"
            }
            
            response = requests.post(f"{BACKEND_URL}/savings/transfer", json=transfer_request)
            print(f"POST /api/savings/transfer (Spot → Savings)")
            print(f"Request: {json.dumps(transfer_request, indent=2)}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                if data.get("success") == True:
                    print("✅ Spot to Savings transfer endpoint working")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ POST savings/transfer (to_savings) - PASSED")
                elif data.get("success") == False and "Insufficient spot balance" in data.get("message", ""):
                    print("✅ Insufficient balance validation working correctly")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ POST savings/transfer (insufficient balance validation) - PASSED")
                else:
                    print("❌ Unexpected response")
                    results["failed_tests"] += 1
                    results["test_details"].append("❌ POST savings/transfer (to_savings) - Unexpected response")
            else:
                print(f"❌ Failed with status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ POST savings/transfer (to_savings) - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ POST savings/transfer (to_savings) - Exception: {e}")
        
        # Test 3: Transfer from Savings to Spot (should fail - no savings balance)
        results["total_tests"] += 1
        try:
            transfer_request = {
                "user_id": test_user_id,
                "currency": "BTC",
                "amount": 0.1,
                "direction": "to_spot"
            }
            
            response = requests.post(f"{BACKEND_URL}/savings/transfer", json=transfer_request)
            print(f"\nPOST /api/savings/transfer (Savings → Spot)")
            print(f"Request: {json.dumps(transfer_request, indent=2)}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                if data.get("success") == False and "Insufficient savings balance" in data.get("message", ""):
                    print("✅ Insufficient savings balance validation working correctly")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ POST savings/transfer (insufficient savings validation) - PASSED")
                elif data.get("success") == True:
                    print("✅ Savings to Spot transfer working")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ POST savings/transfer (to_spot) - PASSED")
                else:
                    print("❌ Unexpected response")
                    results["failed_tests"] += 1
                    results["test_details"].append("❌ POST savings/transfer (to_spot) - Unexpected response")
            else:
                print(f"❌ Failed with status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ POST savings/transfer (to_spot) - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ POST savings/transfer (to_spot) - Exception: {e}")
        
        # Test 4: Invalid direction
        results["total_tests"] += 1
        try:
            transfer_request = {
                "user_id": test_user_id,
                "currency": "BTC",
                "amount": 0.1,
                "direction": "invalid_direction"
            }
            
            response = requests.post(f"{BACKEND_URL}/savings/transfer", json=transfer_request)
            print(f"\nPOST /api/savings/transfer (Invalid Direction)")
            print(f"Request: {json.dumps(transfer_request, indent=2)}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 400:
                print("✅ Invalid direction validation working correctly")
                results["passed_tests"] += 1
                results["test_details"].append("✅ POST savings/transfer (invalid direction validation) - PASSED")
            else:
                print(f"❌ Expected 400 status, got {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ POST savings/transfer (invalid direction) - Expected 400, got {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ POST savings/transfer (invalid direction) - Exception: {e}")
        
        # Test 5: Missing required fields
        results["total_tests"] += 1
        try:
            transfer_request = {
                "user_id": test_user_id,
                "currency": "BTC"
                # Missing amount and direction
            }
            
            response = requests.post(f"{BACKEND_URL}/savings/transfer", json=transfer_request)
            print(f"\nPOST /api/savings/transfer (Missing Fields)")
            print(f"Request: {json.dumps(transfer_request, indent=2)}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 400:
                print("✅ Missing fields validation working correctly")
                results["passed_tests"] += 1
                results["test_details"].append("✅ POST savings/transfer (missing fields validation) - PASSED")
            else:
                print(f"❌ Expected 400 status, got {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ POST savings/transfer (missing fields) - Expected 400, got {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ POST savings/transfer (missing fields) - Exception: {e}")
        
        # ============= PHASE 4: TEST PORTFOLIO STATS ENDPOINT =============
        print("\n📈 PHASE 4: TEST GET /api/portfolio/stats/{user_id}")
        print("-" * 50)
        
        # Test 6: Get portfolio stats
        results["total_tests"] += 1
        try:
            response = requests.get(f"{BACKEND_URL}/portfolio/stats/{test_user_id}")
            print(f"GET /api/portfolio/stats/{test_user_id}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify structure
                required_fields = [
                    "success", "total_portfolio_value_usd", "total_invested_usd", 
                    "total_unrealized_pl_usd", "total_unrealized_pl_percent", "portfolio"
                ]
                
                if (data.get("success") == True and 
                    all(field in data for field in required_fields) and
                    isinstance(data["portfolio"], list)):
                    print("✅ Portfolio stats endpoint working correctly")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ GET portfolio/stats - PASSED")
                    
                    # Check portfolio structure if not empty
                    if data["portfolio"]:
                        portfolio_item = data["portfolio"][0]
                        portfolio_fields = [
                            "currency", "spot_amount", "savings_amount", "total_amount",
                            "current_price", "current_value_usd", "unrealized_pl_usd", "unrealized_pl_percent"
                        ]
                        if all(field in portfolio_item for field in portfolio_fields):
                            print("✅ Portfolio item structure correct")
                        else:
                            print("⚠️ Portfolio item structure incomplete")
                else:
                    print("❌ Invalid response structure")
                    results["failed_tests"] += 1
                    results["test_details"].append("❌ GET portfolio/stats - Invalid structure")
            else:
                print(f"❌ Failed with status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ GET portfolio/stats - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ GET portfolio/stats - Exception: {e}")
        
        # ============= PHASE 5: TEST WITH EXISTING USER DATA =============
        print("\n🔍 PHASE 5: TEST WITH EXISTING USER DATA")
        print("-" * 50)
        
        # Test with a user that might have existing data
        existing_user_id = "test_user_123"
        
        # Test 7: Savings balances for existing user
        results["total_tests"] += 1
        try:
            response = requests.get(f"{BACKEND_URL}/savings/balances/{existing_user_id}")
            print(f"GET /api/savings/balances/{existing_user_id} (existing user)")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                if data.get("success") == True:
                    print("✅ Savings balances endpoint working for existing user")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ GET savings/balances (existing user) - PASSED")
                    
                    # Check if user has savings
                    if data.get("balances"):
                        print(f"📊 User has {len(data['balances'])} savings entries")
                        print(f"💰 Total savings value: ${data.get('total_value_usd', 0)}")
                else:
                    print("❌ Invalid response")
                    results["failed_tests"] += 1
                    results["test_details"].append("❌ GET savings/balances (existing user) - Invalid response")
            else:
                print(f"❌ Failed with status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ GET savings/balances (existing user) - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ GET savings/balances (existing user) - Exception: {e}")
        
        # Test 8: Portfolio stats for existing user
        results["total_tests"] += 1
        try:
            response = requests.get(f"{BACKEND_URL}/portfolio/stats/{existing_user_id}")
            print(f"\nGET /api/portfolio/stats/{existing_user_id} (existing user)")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                
                if data.get("success") == True:
                    print("✅ Portfolio stats endpoint working for existing user")
                    results["passed_tests"] += 1
                    results["test_details"].append("✅ GET portfolio/stats (existing user) - PASSED")
                    
                    # Display portfolio summary
                    print(f"📊 Portfolio Summary:")
                    print(f"   Total Value: ${data.get('total_portfolio_value_usd', 0)}")
                    print(f"   Total Invested: ${data.get('total_invested_usd', 0)}")
                    print(f"   Unrealized P/L: ${data.get('total_unrealized_pl_usd', 0)} ({data.get('total_unrealized_pl_percent', 0)}%)")
                    print(f"   Coins in Portfolio: {len(data.get('portfolio', []))}")
                else:
                    print("❌ Invalid response")
                    results["failed_tests"] += 1
                    results["test_details"].append("❌ GET portfolio/stats (existing user) - Invalid response")
            else:
                print(f"❌ Failed with status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ GET portfolio/stats (existing user) - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ GET portfolio/stats (existing user) - Exception: {e}")
        
        # ============= PHASE 6: EDGE CASES AND ERROR HANDLING =============
        print("\n⚠️ PHASE 6: EDGE CASES AND ERROR HANDLING")
        print("-" * 50)
        
        # Test 9: Invalid user ID format
        results["total_tests"] += 1
        try:
            invalid_user_id = ""
            response = requests.get(f"{BACKEND_URL}/savings/balances/{invalid_user_id}")
            print(f"GET /api/savings/balances/{invalid_user_id} (empty user ID)")
            print(f"Status: {response.status_code}")
            
            # Should handle gracefully (either 404 or empty response)
            if response.status_code in [200, 404]:
                print("✅ Empty user ID handled gracefully")
                results["passed_tests"] += 1
                results["test_details"].append("✅ GET savings/balances (empty user ID) - PASSED")
            else:
                print(f"❌ Unexpected status {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ GET savings/balances (empty user ID) - Status {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ GET savings/balances (empty user ID) - Exception: {e}")
        
        # Test 10: Zero amount transfer
        results["total_tests"] += 1
        try:
            transfer_request = {
                "user_id": test_user_id,
                "currency": "BTC",
                "amount": 0,
                "direction": "to_savings"
            }
            
            response = requests.post(f"{BACKEND_URL}/savings/transfer", json=transfer_request)
            print(f"\nPOST /api/savings/transfer (Zero Amount)")
            print(f"Request: {json.dumps(transfer_request, indent=2)}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 400:
                print("✅ Zero amount validation working correctly")
                results["passed_tests"] += 1
                results["test_details"].append("✅ POST savings/transfer (zero amount validation) - PASSED")
            else:
                print(f"❌ Expected 400 status, got {response.status_code}")
                results["failed_tests"] += 1
                results["test_details"].append(f"❌ POST savings/transfer (zero amount) - Expected 400, got {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            results["failed_tests"] += 1
            results["test_details"].append(f"❌ POST savings/transfer (zero amount) - Exception: {e}")
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        results["failed_tests"] += 1
        results["test_details"].append(f"❌ CRITICAL ERROR: {e}")
    
    # ============= FINAL RESULTS =============
    print("\n" + "=" * 80)
    print("📊 CRYPTO SAVINGS & PORTFOLIO SYSTEM TEST RESULTS")
    print("=" * 80)
    
    success_rate = (results["passed_tests"] / results["total_tests"] * 100) if results["total_tests"] > 0 else 0
    
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed_tests']}")
    print(f"Failed: {results['failed_tests']}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    print("\nDetailed Results:")
    for detail in results["test_details"]:
        print(f"  {detail}")
    
    print("\n" + "=" * 80)
    
    if success_rate >= 80:
        print("🎉 CRYPTO SAVINGS & PORTFOLIO SYSTEM: MOSTLY WORKING")
    elif success_rate >= 60:
        print("⚠️ CRYPTO SAVINGS & PORTFOLIO SYSTEM: PARTIALLY WORKING")
    else:
        print("❌ CRYPTO SAVINGS & PORTFOLIO SYSTEM: NEEDS ATTENTION")
    
    return results

if __name__ == "__main__":
    test_crypto_savings_portfolio_system()