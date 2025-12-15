#!/usr/bin/env python3
"""
Test script to verify P2P Express fee tracking
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://savings-app-12.preview.emergentagent.com/api"

def test_fee_tracking():
    print("\n" + "="*60)
    print("P2P EXPRESS FEE TRACKING TEST")
    print("="*60)
    
    # Test user credentials
    user_id = "9757bd8c-16f8-4efb-b075-0af4a432990a"
    
    print("\n🔍 Step 1: Check admin dashboard BEFORE transaction")
    print("-" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/dashboard-stats")
        if response.status_code == 200:
            data = response.json()
            revenue = data.get("stats", {}).get("revenue", {})
            print(f"✅ Admin Dashboard Stats:")
            print(f"   Total Platform Fees: £{revenue.get('platform_fees', 0):.2f}")
            print(f"   P2P Express Fees: £{revenue.get('p2p_express_fees', 0):.2f}")
            print(f"   Transaction Fees: £{revenue.get('transaction_fees', 0):.2f}")
            print(f"   Fee Wallet Balance: £{revenue.get('fee_wallet_balance', 0):.2f}")
            
            before_p2p_fees = revenue.get('p2p_express_fees', 0)
            before_total_fees = revenue.get('platform_fees', 0)
        else:
            print(f"❌ Failed to get dashboard stats: {response.status_code}")
            before_p2p_fees = 0
            before_total_fees = 0
    except Exception as e:
        print(f"❌ Error: {e}")
        before_p2p_fees = 0
        before_total_fees = 0
    
    print("\n💰 Step 2: Simulate P2P Express Purchase")
    print("-" * 60)
    print("Test Order Details:")
    print("   Amount: £100.00")
    print("   Crypto: BTC")
    print("   Fee (2.5%): £2.50")
    print("   Net Amount: £97.50")
    
    order_data = {
        "user_id": user_id,
        "crypto": "BTC",
        "country": "United Kingdom",
        "fiat_amount": 100.00,
        "crypto_amount": 0.00145,  # Approximate
        "base_rate": 69000,
        "express_fee": 2.50,
        "express_fee_percent": 2.5,
        "net_amount": 97.50,
        "has_admin_liquidity": True
    }
    
    print("\n🚀 Creating P2P Express order...")
    try:
        response = requests.post(f"{BASE_URL}/p2p/express/create", json=order_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Order created successfully!")
            print(f"   Trade ID: {result.get('trade_id', 'N/A')}")
        else:
            print(f"❌ Order failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error creating order: {e}")
        return
    
    print("\n🔍 Step 3: Check admin dashboard AFTER transaction")
    print("-" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/dashboard-stats")
        if response.status_code == 200:
            data = response.json()
            revenue = data.get("stats", {}).get("revenue", {})
            print(f"✅ Admin Dashboard Stats:")
            print(f"   Total Platform Fees: £{revenue.get('platform_fees', 0):.2f}")
            print(f"   P2P Express Fees: £{revenue.get('p2p_express_fees', 0):.2f}")
            print(f"   Transaction Fees: £{revenue.get('transaction_fees', 0):.2f}")
            print(f"   Fee Wallet Balance: £{revenue.get('fee_wallet_balance', 0):.2f}")
            
            after_p2p_fees = revenue.get('p2p_express_fees', 0)
            after_total_fees = revenue.get('platform_fees', 0)
            
            print("\n📊 VERIFICATION:")
            print("-" * 60)
            p2p_fee_increase = after_p2p_fees - before_p2p_fees
            total_fee_increase = after_total_fees - before_total_fees
            
            print(f"P2P Express Fees Increase: £{p2p_fee_increase:.2f}")
            print(f"Total Platform Fees Increase: £{total_fee_increase:.2f}")
            
            if p2p_fee_increase == 2.50:
                print("✅ 🎉 FEE TRACKING WORKING CORRECTLY!")
                print("   Expected: £2.50")
                print(f"   Actual: £{p2p_fee_increase:.2f}")
            else:
                print("❌ FEE TRACKING ISSUE DETECTED")
                print(f"   Expected: £2.50")
                print(f"   Actual: £{p2p_fee_increase:.2f}")
        else:
            print(f"❌ Failed to get dashboard stats: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_fee_tracking()
