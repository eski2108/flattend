#!/usr/bin/env python3
"""
Backfill wallet data for all existing users
Run this once to ensure all users have complete wallet structures
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import requests

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://coinhubx:mummy1231123@cluster0.ctczzad.mongodb.net/?appName=Cluster0&retryWrites=true&w=majority')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx_production')

async def get_nowpayments_currencies():
    """Fetch all supported currencies from NowPayments"""
    try:
        response = requests.get('https://savingsflow-1.preview.emergentagent.com/api/nowpayments/currencies', timeout=10)
        data = response.json()
        return [c.upper() for c in data.get('currencies', [])]
    except:
        return []

async def backfill_user_wallets(user_id: str, db):
    """Create wallet structure for a single user"""
    # Get NowPayments currencies
    nowpayments_currencies = await get_nowpayments_currencies()
    
    # Fiat
    fiat_currencies = ['GBP', 'USD', 'EUR']
    
    # Major crypto
    major_crypto = ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'LTC', 'TRX', 'DOGE', 'SOL', 'ADA',
                   'MATIC', 'DOT', 'AVAX', 'UNI', 'LINK', 'BCH', 'ATOM', 'SHIB', 'USDC']
    
    # Combine (remove duplicates)
    all_currencies = list(set(fiat_currencies + major_crypto + nowpayments_currencies))
    
    # Create wallet entries
    wallet_entries = []
    for currency in all_currencies:
        wallet_entries.append({
            "user_id": user_id,
            "currency": currency,
            "available_balance": 0.0,
            "locked_balance": 0.0,
            "total_balance": 0.0,
            "deposit_address": None,
            "deposit_network": None,
            "deposit_qr_code": None,
            "created_at": datetime.now(timezone.utc),
            "last_updated": datetime.now(timezone.utc)
        })
    
    # Insert in batches
    if wallet_entries:
        batch_size = 100
        for i in range(0, len(wallet_entries), batch_size):
            batch = wallet_entries[i:i + batch_size]
            await db.wallets.insert_many(batch)
    
    # Create user_balances
    balance_structure = {}
    for currency in all_currencies:
        balance_structure[currency] = {
            "available": 0.0,
            "locked": 0.0,
            "total": 0.0,
            "deposit_address": None,
            "deposit_network": None
        }
    
    await db.user_balances.insert_one({
        "user_id": user_id,
        "balances": balance_structure,
        "created_at": datetime.now(timezone.utc),
        "last_updated": datetime.now(timezone.utc)
    })
    
    return len(all_currencies)

async def main():
    print("="*80)
    print("WALLET BACKFILL SCRIPT")
    print("="*80)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get all users
    users = await db.user_accounts.find({}).to_list(1000)
    print(f"\nFound {len(users)} users in database")
    
    backfilled_count = 0
    skipped_count = 0
    
    for user in users:
        user_id = user['user_id']
        email = user.get('email', 'unknown')
        
        # Check if user already has wallets
        existing_balance = await db.user_balances.find_one({"user_id": user_id})
        
        if existing_balance:
            # Check if they have enough currencies
            currency_count = len(existing_balance.get('balances', {}))
            if currency_count < 50:  # If they have less than 50 currencies, backfill
                print(f"\n🔄 Updating {email} (currently has {currency_count} currencies)")
                # Delete old data
                await db.wallets.delete_many({"user_id": user_id})
                await db.user_balances.delete_one({"user_id": user_id})
                # Create new
                currency_count = await backfill_user_wallets(user_id, db)
                print(f"   ✅ Updated with {currency_count} currencies")
                backfilled_count += 1
            else:
                print(f"⏭️  Skipping {email} (already has {currency_count} currencies)")
                skipped_count += 1
        else:
            print(f"\n🆕 Creating wallets for {email}")
            currency_count = await backfill_user_wallets(user_id, db)
            print(f"   ✅ Created {currency_count} currencies")
            backfilled_count += 1
    
    print("\n" + "="*80)
    print(f"✅ BACKFILL COMPLETE")
    print(f"   Backfilled: {backfilled_count} users")
    print(f"   Skipped: {skipped_count} users (already had complete wallets)")
    print("="*80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
