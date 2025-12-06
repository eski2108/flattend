#!/usr/bin/env python3
"""
FOCUSED SPOT TRADING ISSUE ANALYSIS

This test identifies the specific issues with the spot trading system:
1. User balance updates not implemented
2. Wrong final_amount calculation
3. No balance validation
4. GBP currency not supported in crypto-bank
"""

import requests
import json
import time

BASE_URL = "https://signupverify.preview.emergentagent.com/api"

def test_trading_issues():
    print("🔍 FOCUSED SPOT TRADING ISSUE ANALYSIS")
    print("="*60)
    
    # Test 1: Check supported currencies
    print("\n1. Testing supported currencies...")
    try:
        # Try to add GBP balance
        response = requests.post(
            f"{BASE_URL}/crypto-bank/deposit",
            json={
                "user_id": "test_user",
                "currency": "GBP",
                "amount": 1000
            },
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            print(f"❌ GBP not supported: {data.get('detail')}")
        else:
            print(f"✅ GBP supported: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing GBP: {str(e)}")
    
    # Test 2: Check trading execution response structure
    print("\n2. Testing trading execution response...")
    try:
        response = requests.post(
            f"{BASE_URL}/trading/execute",
            json={
                "user_id": "test_user_123",
                "pair": "BTC/GBP",
                "type": "buy",
                "amount": 0.01,
                "price": 47500
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            transaction = data.get("transaction", {})
            
            print(f"✅ Trading execution successful")
            print(f"   Amount: {transaction.get('amount')} BTC")
            print(f"   Price: £{transaction.get('price')}")
            print(f"   Total: £{transaction.get('total')}")
            print(f"   Fee: £{transaction.get('fee')}")
            print(f"   Final Amount: £{transaction.get('final_amount')}")
            
            # Check if final_amount is correct for BUY trade
            expected_crypto_amount = transaction.get('amount')
            actual_final_amount = transaction.get('final_amount')
            
            if actual_final_amount > 100:  # If > 100, it's likely fiat amount, not crypto
                print(f"❌ ISSUE: final_amount ({actual_final_amount}) appears to be fiat amount, should be crypto amount ({expected_crypto_amount})")
            else:
                print(f"✅ final_amount appears correct")
                
        else:
            print(f"❌ Trading execution failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing trading execution: {str(e)}")
    
    # Test 3: Check if user balances are updated
    print("\n3. Testing user balance updates...")
    
    # Create a test user
    timestamp = int(time.time())
    user_data = {
        "email": f"balance_test_{timestamp}@test.com",
        "password": "Test123456",
        "full_name": "Balance Test User"
    }
    
    try:
        # Register user
        reg_response = requests.post(f"{BASE_URL}/auth/register", json=user_data, timeout=10)
        
        if reg_response.status_code == 200:
            reg_data = reg_response.json()
            user_id = reg_data.get("user", {}).get("user_id")
            
            if user_id:
                print(f"✅ Test user created: {user_id}")
                
                # Add BTC balance
                deposit_response = requests.post(
                    f"{BASE_URL}/crypto-bank/deposit",
                    json={
                        "user_id": user_id,
                        "currency": "BTC",
                        "amount": 1.0
                    },
                    timeout=10
                )
                
                if deposit_response.status_code == 200:
                    print(f"✅ Added 1.0 BTC to user")
                    
                    # Check initial balance
                    balance_response = requests.get(f"{BASE_URL}/crypto-bank/balances/{user_id}", timeout=10)
                    
                    if balance_response.status_code == 200:
                        balance_data = balance_response.json()
                        balances = balance_data.get("balances", [])
                        
                        initial_btc = 0
                        initial_gbp = 0
                        
                        for balance in balances:
                            if balance.get("currency") == "BTC":
                                initial_btc = balance.get("balance", 0)
                            elif balance.get("currency") == "GBP":
                                initial_gbp = balance.get("balance", 0)
                        
                        print(f"   Initial BTC: {initial_btc}")
                        print(f"   Initial GBP: {initial_gbp}")
                        
                        # Execute SELL trade
                        trade_response = requests.post(
                            f"{BASE_URL}/trading/execute",
                            json={
                                "user_id": user_id,
                                "pair": "BTC/GBP",
                                "type": "sell",
                                "amount": 0.1,
                                "price": 47500
                            },
                            timeout=10
                        )
                        
                        if trade_response.status_code == 200:
                            print(f"✅ SELL trade executed")
                            
                            # Check balance after trade
                            final_balance_response = requests.get(f"{BASE_URL}/crypto-bank/balances/{user_id}", timeout=10)
                            
                            if final_balance_response.status_code == 200:
                                final_balance_data = final_balance_response.json()
                                final_balances = final_balance_data.get("balances", [])
                                
                                final_btc = 0
                                final_gbp = 0
                                
                                for balance in final_balances:
                                    if balance.get("currency") == "BTC":
                                        final_btc = balance.get("balance", 0)
                                    elif balance.get("currency") == "GBP":
                                        final_gbp = balance.get("balance", 0)
                                
                                print(f"   Final BTC: {final_btc}")
                                print(f"   Final GBP: {final_gbp}")
                                
                                btc_change = initial_btc - final_btc
                                gbp_change = final_gbp - initial_gbp
                                
                                if btc_change > 0:
                                    print(f"✅ BTC balance decreased by {btc_change}")
                                else:
                                    print(f"❌ ISSUE: BTC balance not decreased (change: {btc_change})")
                                
                                if gbp_change > 0:
                                    print(f"✅ GBP balance increased by {gbp_change}")
                                else:
                                    print(f"❌ ISSUE: GBP balance not increased (change: {gbp_change})")
                                    
                            else:
                                print(f"❌ Failed to get final balances: {final_balance_response.status_code}")
                        else:
                            print(f"❌ SELL trade failed: {trade_response.status_code}")
                    else:
                        print(f"❌ Failed to get initial balances: {balance_response.status_code}")
                else:
                    print(f"❌ Failed to add BTC: {deposit_response.status_code}")
            else:
                print(f"❌ No user_id in registration response")
        else:
            print(f"❌ User registration failed: {reg_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing balance updates: {str(e)}")
    
    # Test 4: Check insufficient funds handling
    print("\n4. Testing insufficient funds handling...")
    try:
        # Try to execute trade with user who has no balance
        response = requests.post(
            f"{BASE_URL}/trading/execute",
            json={
                "user_id": "nonexistent_user",
                "pair": "BTC/GBP",
                "type": "buy",
                "amount": 1.0,
                "price": 47500
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"❌ ISSUE: Trade succeeded with nonexistent user (should fail)")
            else:
                print(f"✅ Trade properly failed: {data.get('message')}")
        else:
            print(f"✅ Trade properly rejected: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing insufficient funds: {str(e)}")
    
    print("\n" + "="*60)
    print("🔍 ANALYSIS COMPLETE")

if __name__ == "__main__":
    test_trading_issues()