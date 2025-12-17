#!/usr/bin/env python3
"""
Create Fresh Dispute for Email Testing
This script creates a complete P2P trade flow and then creates a dispute to trigger the improved email template.
"""

import requests
import json
import uuid
import time
from datetime import datetime

BASE_URL = "https://cryptodash-22.preview.emergentagent.com/api"

def log_step(step, message, success=True):
    status = "✅" if success else "❌"
    print(f"{status} {step}: {message}")

def make_request(method, endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=30)
        
        return response
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return None

def main():
    print("🚀 Creating Fresh Dispute for Email Template Testing")
    print("=" * 60)
    
    # Step 1: Create test users
    print("\n📝 Step 1: Creating test users...")
    
    timestamp = int(time.time())
    buyer_data = {
        "email": f"dispute_buyer_{timestamp}@test.com",
        "password": "TestPass123!",
        "full_name": "Dispute Test Buyer",
        "phone_number": "+447700900001"
    }
    
    seller_data = {
        "email": f"dispute_seller_{timestamp}@test.com", 
        "password": "TestPass123!",
        "full_name": "Dispute Test Seller",
        "phone_number": "+447700900002"
    }
    
    # Register buyer
    response = make_request('POST', '/auth/register', buyer_data)
    if response and response.status_code == 200:
        buyer_result = response.json()
        buyer_user_id = buyer_result.get('user_id')
        log_step("Buyer Registration", f"ID: {buyer_user_id}")
    else:
        log_step("Buyer Registration", f"Failed: {response.text if response else 'No response'}", False)
        return
    
    # Register seller
    response = make_request('POST', '/auth/register', seller_data)
    if response and response.status_code == 200:
        seller_result = response.json()
        seller_user_id = seller_result.get('user_id')
        log_step("Seller Registration", f"ID: {seller_user_id}")
    else:
        log_step("Seller Registration", f"Failed: {response.text if response else 'No response'}", False)
        return
    
    # Step 2: Give seller some crypto to sell
    print("\n💰 Step 2: Setting up seller balance...")
    
    # Connect seller wallet
    wallet_data = {"wallet_address": f"seller_wallet_{timestamp}"}
    response = make_request('POST', '/auth/connect-wallet', wallet_data)
    if response and response.status_code == 200:
        log_step("Seller Wallet", "Connected successfully")
    else:
        log_step("Seller Wallet", f"Failed: {response.text if response else 'No response'}", False)
    
    # Give seller some crypto
    deposit_data = {
        "wallet_address": f"seller_wallet_{timestamp}",
        "amount": 1.0  # 1 BTC
    }
    response = make_request('POST', '/user/deposit', deposit_data)
    if response and response.status_code == 200:
        log_step("Seller Deposit", "1.0 BTC deposited")
    else:
        log_step("Seller Deposit", f"Failed: {response.text if response else 'No response'}", False)
    
    # Step 3: Create sell order
    print("\n📋 Step 3: Creating sell order...")
    
    sell_order_data = {
        "seller_address": f"seller_wallet_{timestamp}",
        "crypto_amount": 0.5,
        "price_per_unit": 50000.0,  # £50,000 per BTC
        "min_purchase": 0.01,
        "max_purchase": 0.5
    }
    
    response = make_request('POST', '/crypto-market/sell/create', sell_order_data)
    if response and response.status_code == 200:
        sell_result = response.json()
        sell_order_id = sell_result.get('order', {}).get('order_id')
        log_step("Sell Order", f"Created: {sell_order_id}")
    else:
        log_step("Sell Order", f"Failed: {response.text if response else 'No response'}", False)
        return
    
    # Step 4: Connect buyer wallet and add bank account
    print("\n🏦 Step 4: Setting up buyer...")
    
    buyer_wallet_data = {"wallet_address": f"buyer_wallet_{timestamp}"}
    response = make_request('POST', '/auth/connect-wallet', buyer_wallet_data)
    if response and response.status_code == 200:
        log_step("Buyer Wallet", "Connected successfully")
    else:
        log_step("Buyer Wallet", f"Failed: {response.text if response else 'No response'}", False)
    
    # Add bank account for buyer
    bank_data = {
        "wallet_address": f"buyer_wallet_{timestamp}",
        "bank_name": "Test Bank",
        "account_number": "12345678",
        "account_holder_name": "Dispute Test Buyer",
        "routing_number": "021000021"
    }
    response = make_request('POST', '/bank/add', bank_data)
    if response and response.status_code == 200:
        log_step("Buyer Bank Account", "Added successfully")
    else:
        log_step("Buyer Bank Account", f"Failed: {response.text if response else 'No response'}", False)
    
    # Add bank account for seller too
    seller_bank_data = {
        "wallet_address": f"seller_wallet_{timestamp}",
        "bank_name": "Seller Bank",
        "account_number": "87654321",
        "account_holder_name": "Dispute Test Seller",
        "routing_number": "021000021"
    }
    response = make_request('POST', '/bank/add', seller_bank_data)
    if response and response.status_code == 200:
        log_step("Seller Bank Account", "Added successfully")
    else:
        log_step("Seller Bank Account", f"Failed: {response.text if response else 'No response'}", False)
    
    # Step 5: Create buy order
    print("\n💱 Step 5: Creating buy order...")
    
    buy_order_data = {
        "buyer_address": f"buyer_wallet_{timestamp}",
        "sell_order_id": sell_order_id,
        "crypto_amount": 0.01  # Buy 0.01 BTC
    }
    
    response = make_request('POST', '/crypto-market/buy/create', buy_order_data)
    if response and response.status_code == 200:
        buy_result = response.json()
        buy_order_id = buy_result.get('order', {}).get('order_id')
        log_step("Buy Order", f"Created: {buy_order_id}")
    else:
        log_step("Buy Order", f"Failed: {response.text if response else 'No response'}", False)
        return
    
    # Step 6: Mark payment as made
    print("\n💳 Step 6: Marking payment as made...")
    
    mark_paid_data = {
        "buyer_address": f"buyer_wallet_{timestamp}",
        "order_id": buy_order_id,
        "payment_reference": f"BANK_REF_{timestamp}"
    }
    
    response = make_request('POST', '/crypto-market/payment/mark-paid', mark_paid_data)
    if response and response.status_code == 200:
        log_step("Mark Payment", "Payment marked as completed")
    else:
        log_step("Mark Payment", f"Failed: {response.text if response else 'No response'}", False)
    
    # Step 7: Create dispute (THIS TRIGGERS THE EMAIL!)
    print("\n⚖️ Step 7: Creating dispute (TRIGGERS EMAIL)...")
    
    dispute_data = {
        "user_address": f"buyer_wallet_{timestamp}",
        "order_id": buy_order_id,
        "reason": "Payment completed but crypto not released - TESTING IMPROVED EMAIL TEMPLATE"
    }
    
    response = make_request('POST', '/disputes/initiate', dispute_data)
    if response and response.status_code == 200:
        dispute_result = response.json()
        dispute_id = dispute_result.get('dispute', {}).get('dispute_id')
        
        print("\n🎉 SUCCESS! DISPUTE CREATED!")
        print("=" * 60)
        print(f"🆔 DISPUTE ID: {dispute_id}")
        print(f"📧 Email sent to: info@coinhubx.net")
        print(f"🔗 Admin URL: https://cryptodash-22.preview.emergentagent.com/admin/disputes/{dispute_id}")
        print("\n✅ Email should contain:")
        print("   - Improved red button (table-based HTML)")
        print("   - Highlighted yellow box with copyable link")
        print("   - Alternative text link if button doesn't work")
        print("=" * 60)
        
        log_step("Dispute Creation", f"SUCCESS! ID: {dispute_id}")
        
    else:
        log_step("Dispute Creation", f"Failed: {response.text if response else 'No response'}", False)
        return
    
    print(f"\n🎯 FINAL RESULT:")
    print(f"Dispute ID: {dispute_id}")
    print(f"Check email at: info@coinhubx.net")

if __name__ == "__main__":
    main()