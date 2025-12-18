#!/usr/bin/env python3
"""
Focused test for Crypto Savings & Portfolio System with actual data setup
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BACKEND_URL = "https://trading-perf-boost.preview.emergentagent.com/api"

def test_with_actual_data():
    """Test with actual user data setup"""
    print("🎯 FOCUSED CRYPTO SAVINGS & PORTFOLIO TEST WITH DATA SETUP")
    print("=" * 80)
    
    # Use a known test user
    test_user_id = "test_user_savings_123"
    
    try:
        # ============= STEP 1: ADD BALANCE TO INTERNAL_BALANCES =============
        print("\n💰 STEP 1: SETUP - Add balance to internal_balances (Spot Wallet)")
        print("-" * 60)
        
        # We'll use the trader balance system to add funds
        balance_request = {
            "user_id": test_user_id,
            "currency": "BTC",
            "amount": 2.0
        }
        
        response = requests.post(f"{BACKEND_URL}/trader/balance/add-funds", json=balance_request)
        print(f"POST /api/trader/balance/add-funds")
        print(f"Request: {json.dumps(balance_request, indent=2)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            print("✅ Added BTC balance to spot wallet")
        else:
            print(f"⚠️ Could not add balance via trader system: {response.status_code}")
        
        # Add ETH balance too
        balance_request = {
            "user_id": test_user_id,
            "currency": "ETH", 
            "amount": 10.0
        }
        
        response = requests.post(f"{BACKEND_URL}/trader/balance/add-funds", json=balance_request)
        print(f"\nAdding ETH balance...")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Added ETH balance to spot wallet")
        
        # ============= STEP 2: TEST TRANSFER TO SAVINGS =============
        print("\n💸 STEP 2: TEST TRANSFER FROM SPOT TO SAVINGS")
        print("-" * 60)
        
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
                print("✅ Successfully transferred BTC from Spot to Savings!")
            else:
                print(f"❌ Transfer failed: {data.get('message')}")
        else:
            print(f"❌ Transfer failed with status {response.status_code}")
        
        # ============= STEP 3: CHECK SAVINGS BALANCES =============
        print("\n📊 STEP 3: CHECK SAVINGS BALANCES AFTER TRANSFER")
        print("-" * 60)
        
        response = requests.get(f"{BACKEND_URL}/savings/balances/{test_user_id}")
        print(f"GET /api/savings/balances/{test_user_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("success") == True and data.get("balances"):
                print("✅ Savings balances retrieved successfully!")
                print(f"💰 Total savings value: ${data.get('total_value_usd', 0)}")
                
                for balance in data.get("balances", []):
                    currency = balance.get("currency")
                    amount = balance.get("amount")
                    current_price = balance.get("current_price")
                    pl_usd = balance.get("unrealized_pl_usd", 0)
                    pl_percent = balance.get("unrealized_pl_percent", 0)
                    
                    print(f"   {currency}: {amount} @ ${current_price} (P/L: ${pl_usd:.2f} / {pl_percent:.2f}%)")
            else:
                print("⚠️ No savings balances found")
        
        # ============= STEP 4: TEST PORTFOLIO STATS =============
        print("\n📈 STEP 4: CHECK PORTFOLIO STATS")
        print("-" * 60)
        
        response = requests.get(f"{BACKEND_URL}/portfolio/stats/{test_user_id}")
        print(f"GET /api/portfolio/stats/{test_user_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("success") == True:
                print("✅ Portfolio stats retrieved successfully!")
                print(f"📊 Portfolio Summary:")
                print(f"   Total Value: ${data.get('total_portfolio_value_usd', 0)}")
                print(f"   Total Invested: ${data.get('total_invested_usd', 0)}")
                print(f"   Unrealized P/L: ${data.get('total_unrealized_pl_usd', 0)} ({data.get('total_unrealized_pl_percent', 0)}%)")
                
                portfolio = data.get("portfolio", [])
                print(f"   Coins in Portfolio: {len(portfolio)}")
                
                for coin in portfolio:
                    currency = coin.get("currency")
                    spot_amount = coin.get("spot_amount", 0)
                    savings_amount = coin.get("savings_amount", 0)
                    total_amount = coin.get("total_amount", 0)
                    current_value = coin.get("current_value_usd", 0)
                    pl_usd = coin.get("unrealized_pl_usd", 0)
                    pl_percent = coin.get("unrealized_pl_percent", 0)
                    
                    print(f"   {currency}: Spot={spot_amount}, Savings={savings_amount}, Total={total_amount}")
                    print(f"      Value: ${current_value}, P/L: ${pl_usd} ({pl_percent}%)")
        
        # ============= STEP 5: TEST TRANSFER BACK TO SPOT =============
        print("\n🔄 STEP 5: TEST TRANSFER FROM SAVINGS TO SPOT")
        print("-" * 60)
        
        transfer_request = {
            "user_id": test_user_id,
            "currency": "BTC",
            "amount": 0.2,
            "direction": "to_spot"
        }
        
        response = requests.post(f"{BACKEND_URL}/savings/transfer", json=transfer_request)
        print(f"POST /api/savings/transfer (Savings → Spot)")
        print(f"Request: {json.dumps(transfer_request, indent=2)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("success") == True:
                print("✅ Successfully transferred BTC from Savings to Spot!")
            else:
                print(f"❌ Transfer failed: {data.get('message')}")
        else:
            print(f"❌ Transfer failed with status {response.status_code}")
        
        # ============= STEP 6: FINAL PORTFOLIO CHECK =============
        print("\n🔍 STEP 6: FINAL PORTFOLIO CHECK AFTER TRANSFERS")
        print("-" * 60)
        
        response = requests.get(f"{BACKEND_URL}/portfolio/stats/{test_user_id}")
        print(f"GET /api/portfolio/stats/{test_user_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("success") == True:
                print("✅ Final portfolio stats retrieved successfully!")
                
                portfolio = data.get("portfolio", [])
                for coin in portfolio:
                    currency = coin.get("currency")
                    spot_amount = coin.get("spot_amount", 0)
                    savings_amount = coin.get("savings_amount", 0)
                    total_amount = coin.get("total_amount", 0)
                    
                    print(f"   {currency}: Spot={spot_amount}, Savings={savings_amount}, Total={total_amount}")
        
        print("\n" + "=" * 80)
        print("🎉 FOCUSED SAVINGS & PORTFOLIO TEST COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")

if __name__ == "__main__":
    test_with_actual_data()