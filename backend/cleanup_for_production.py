#!/usr/bin/env python3
"""
Production Database Cleanup Script
Removes ALL test data and prepares clean state for deployment
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Get MongoDB connection from environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db = AsyncIOMotorClient(MONGO_URL).coinhubx

async def cleanup_database():
    """
    Remove ALL test data and reset database to clean production state
    """
    
    print("\n" + "="*60)
    print("🧹 PRODUCTION DATABASE CLEANUP")
    print("="*60)
    print(f"\nConnected to: {MONGO_URL}")
    print(f"Database: coinhubx")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("\n⚠️  WARNING: This will DELETE ALL data!\n")
    
    # Collections to completely clear
    collections_to_clear = [
        # User data
        "user_accounts",
        "phone_verifications",
        "email_verifications",
        
        # Wallets and balances
        "crypto_balances",
        "internal_balances",
        "wallets",
        "wallet_transactions",
        
        # P2P Trading
        "p2p_offers",
        "p2p_trades",
        "enhanced_sell_orders",
        "trade_chat_messages",
        "p2p_disputes",
        
        # Transactions
        "transactions",
        "crypto_transactions",
        "swap_transactions",
        "instant_buy_orders",
        "express_buy_transactions",
        
        # Deposits and Withdrawals
        "deposits",
        "pending_deposits",
        "withdrawals",
        
        # Fees
        "fee_transactions",
        "platform_fees",
        
        # Referrals
        "referral_codes",
        "referral_commissions",
        "referral_earnings",
        "referral_payouts",
        "referrals",
        "suspicious_referrals",
        
        # Admin liquidity
        "admin_liquidity_wallets",
        "admin_liquidity_transactions",
        
        # KYC
        "kyc_verifications",
        
        # Notifications
        "notifications",
        
        # Support
        "support_tickets",
        "support_chat_sessions",
        "support_chat_messages",
        
        # VIP
        "vip_purchases",
        
        # Savings
        "savings_balances",
        
        # Price alerts
        "price_alerts",
        
        # Escrow
        "escrow_balances",
        "trader_balances",
        
        # Sessions
        "sessions",
        "login_attempts",
        
        # Blockchain simulator data
        "blockchain_transactions",
        
        # Test data
        "test_users",
        "test_transactions",
    ]
    
    total_deleted = 0
    
    print("\n📋 Clearing collections...\n")
    
    for collection_name in collections_to_clear:
        try:
            collection = db[collection_name]
            count = await collection.count_documents({})
            
            if count > 0:
                result = await collection.delete_many({})
                total_deleted += result.deleted_count
                print(f"✅ {collection_name}: Deleted {result.deleted_count} documents")
            else:
                print(f"⚪ {collection_name}: Already empty")
                
        except Exception as e:
            print(f"❌ {collection_name}: Error - {str(e)}")
    
    print(f"\n" + "="*60)
    print(f"🧹 Total documents deleted: {total_deleted}")
    print("="*60)
    
    # Create essential admin user (if needed)
    print("\n🔧 Creating essential admin account...\n")
    
    try:
        admin_exists = await db.user_accounts.find_one({"email": "admin@coinhubx.net"})
        
        if not admin_exists:
            import uuid
            import bcrypt
            
            # Hash password
            password = "Admin@2025!Change"  # CHANGE THIS IMMEDIATELY
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            admin_user = {
                "user_id": "admin_user_001",
                "email": "admin@coinhubx.net",
                "password_hash": hashed.decode('utf-8'),
                "full_name": "Platform Admin",
                "is_admin": True,
                "is_active": True,
                "email_verified": True,
                "phone_verified": False,
                "kyc_verified": False,
                "kyc_status": "not_submitted",
                "kyc_tier": 0,
                "referrer_id": None,
                "referral_tier": "standard",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.user_accounts.insert_one(admin_user)
            print("✅ Admin account created")
            print("   Email: admin@coinhubx.net")
            print("   Password: Admin@2025!Change")
            print("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!")
        else:
            print("✅ Admin account already exists")
            
    except Exception as e:
        print(f"❌ Error creating admin account: {str(e)}")
    
    # Initialize admin wallet with 0 balance
    print("\n💰 Initializing admin wallet...\n")
    
    try:
        currencies = ["GBP", "BTC", "ETH", "USDT", "BNB", "SOL", "XRP", "LTC"]
        
        for currency in currencies:
            await db.crypto_balances.update_one(
                {"user_id": "admin_wallet", "currency": currency},
                {
                    "$set": {
                        "balance": 0.0,
                        "reserved": 0.0,
                        "available": 0.0,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            print(f"✅ Admin wallet initialized: {currency} = 0.00")
            
    except Exception as e:
        print(f"❌ Error initializing admin wallet: {str(e)}")
    
    print("\n" + "="*60)
    print("✅ DATABASE CLEANUP COMPLETE")
    print("="*60)
    print("\n📌 Next Steps:")
    print("   1. Update environment variables for production domain")
    print("   2. Change admin password immediately")
    print("   3. Add initial liquidity to admin wallet")
    print("   4. Test all critical flows before going live")
    print("   5. Enable monitoring and logging")
    print("\n")

if __name__ == "__main__":
    asyncio.run(cleanup_database())
