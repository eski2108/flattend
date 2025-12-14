#!/usr/bin/env python3
"""
Working test for Crypto Savings & Portfolio System with proper data setup
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BACKEND_URL = "https://payflow-crypto-3.preview.emergentagent.com/api"

def test_savings_with_proper_setup():
    """Test with proper user data setup"""
    print("🎯 WORKING CRYPTO SAVINGS & PORTFOLIO TEST")
    print("=" * 80)
    
    # Use a known test user
    test_user_id = "savings_test_final_123"
    
    try:
        # ============= STEP 1: ADD BALANCE TO INTERNAL_BALANCES =============
        print("\n💰 STEP 1: SETUP - Add balance to internal_balances (Spot Wallet)")
        print("-" * 60)
        
        # Use query parameters for add-funds endpoint
        params = {
            "trader_id": test_user_id,
            "currency": "BTC",
            "amount": 2.0,
            "reason": "test_setup"
        }
        
        response = requests.post(f"{BACKEND_URL}/trader/balance/add-funds", params=params)
        print(f"POST /api/trader/balance/add-funds?trader_id={test_user_id}&currency=BTC&amount=2.0")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            print("✅ Added BTC balance to spot wallet")
        else:
            print(f"⚠️ Could not add BTC balance: {response.status_code}")
            if response.text:
                print(f"Error: {response.text}")
        
        # Add ETH balance too
        params = {
            "trader_id": test_user_id,
            "currency": "ETH",
            "amount": 10.0,
            "reason": "test_setup"
        }
        
        response = requests.post(f"{BACKEND_URL}/trader/balance/add-funds", params=params)
        print(f"\nAdding ETH balance...")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Added ETH balance to spot wallet")
        else:
            print(f"⚠️ Could not add ETH balance: {response.status_code}")
        
        # ============= STEP 2: VERIFY SPOT BALANCES =============
        print("\n🔍 STEP 2: VERIFY SPOT BALANCES")
        print("-" * 60)
        
        response = requests.get(f"{BACKEND_URL}/trader/balance/{test_user_id}")
        print(f"GET /api/trader/balance/{test_user_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("success") == True:
                balances = data.get("balances", {})
                print("✅ Spot balances retrieved:")
                for currency, balance_info in balances.items():
                    available = balance_info.get("available_balance", 0)
                    locked = balance_info.get("locked_balance", 0)
                    print(f"   {currency}: Available={available}, Locked={locked}")
        
        # ============= STEP 3: TEST TRANSFER TO SAVINGS =============
        print("\n💸 STEP 3: TEST TRANSFER FROM SPOT TO SAVINGS")
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
            if response.text:
                print(f"Error: {response.text}")
        
        # ============= STEP 4: CHECK SAVINGS BALANCES =============
        print("\n📊 STEP 4: CHECK SAVINGS BALANCES AFTER TRANSFER")
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
                    avg_buy_price = balance.get("avg_buy_price", 0)
                    
                    print(f"   {currency}: {amount} @ ${current_price} (Avg Buy: ${avg_buy_price})")
                    print(f"      P/L: ${pl_usd:.2f} ({pl_percent:.2f}%)")
            else:
                print("⚠️ No savings balances found")
        
        # ============= STEP 5: TEST PORTFOLIO STATS =============
        print("\n📈 STEP 5: CHECK PORTFOLIO STATS")
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
        
        # ============= STEP 6: TEST TRANSFER BACK TO SPOT =============
        print("\n🔄 STEP 6: TEST TRANSFER FROM SAVINGS TO SPOT")
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
        
        # ============= STEP 7: FINAL VERIFICATION =============
        print("\n🔍 STEP 7: FINAL VERIFICATION")
        print("-" * 60)
        
        # Check final savings balances
        response = requests.get(f"{BACKEND_URL}/savings/balances/{test_user_id}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success") == True:
                print("Final Savings Balances:")
                for balance in data.get("balances", []):
                    currency = balance.get("currency")
                    amount = balance.get("amount")
                    print(f"   {currency}: {amount}")
        
        # Check final portfolio
        response = requests.get(f"{BACKEND_URL}/portfolio/stats/{test_user_id}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success") == True:
                print("Final Portfolio:")
                portfolio = data.get("portfolio", [])
                for coin in portfolio:
                    currency = coin.get("currency")
                    spot_amount = coin.get("spot_amount", 0)
                    savings_amount = coin.get("savings_amount", 0)
                    print(f"   {currency}: Spot={spot_amount}, Savings={savings_amount}")
        
        print("\n" + "=" * 80)
        print("🎉 WORKING SAVINGS & PORTFOLIO TEST COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_savings_with_proper_setup()