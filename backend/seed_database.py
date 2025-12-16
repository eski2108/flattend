#!/usr/bin/env python3
"""
CoinHubX Database Seeding Script
================================
Run this script after setting up your .env file to create required default records.

Usage:
    python seed_database.py

This will create:
- Admin settings (email configs, platform name)
- Platform settings (feature flags)
- Admin liquidity wallets (for instant buy/sell)
- Default savings products
- Database indexes for performance
- Optional: Test admin user
"""

import os
import sys
import uuid
import bcrypt
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING

# Load environment
from dotenv import load_dotenv
load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx_production')

if not MONGO_URL:
    print("❌ ERROR: MONGO_URL not set in environment")
    print("Please copy .env.example to .env and fill in your MongoDB URL")
    sys.exit(1)

print(f"🔗 Connecting to MongoDB...")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
print(f"✅ Connected to database: {DB_NAME}")


def seed_admin_settings():
    """Create default admin settings"""
    print("\n📋 Seeding admin_settings...")
    
    existing = db.admin_settings.find_one({"setting_type": "general"})
    if existing:
        print("  ⏭️ Admin settings already exist, skipping")
        return
    
    admin_settings = {
        "setting_type": "general",
        "platform_name": "CoinHubX",
        "support_email": os.environ.get('ADMIN_EMAIL', 'support@coinhubx.net'),
        "dispute_email": os.environ.get('ADMIN_EMAIL', 'disputes@coinhubx.net'),
        "admin_code": "CRYPTOLEND_ADMIN_2025",  # Code for admin login
        "maintenance_mode": False,
        "registration_enabled": True,
        "p2p_enabled": True,
        "instant_buy_enabled": True,
        "swap_enabled": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    db.admin_settings.insert_one(admin_settings)
    print("  ✅ Admin settings created")


def seed_platform_settings():
    """Create default platform settings/feature flags"""
    print("\n📋 Seeding platform_settings...")
    
    existing = db.platform_settings.find_one({"setting_type": "features"})
    if existing:
        print("  ⏭️ Platform settings already exist, skipping")
        return
    
    platform_settings = {
        "setting_type": "features",
        "features": {
            "p2p_trading": True,
            "instant_buy": True,
            "instant_sell": True,
            "crypto_swap": True,
            "savings_vault": True,
            "referral_program": True,
            "google_oauth": True,
            "phone_verification": True,
            "two_factor_auth": True,
            "kyc_verification": False,  # Not fully implemented
            "fiat_withdrawals": False   # Not fully implemented
        },
        "limits": {
            "min_trade_gbp": 10,
            "max_trade_gbp": 10000,
            "daily_withdraw_limit_gbp": 5000,
            "kyc_threshold_gbp": 1000
        },
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    db.platform_settings.insert_one(platform_settings)
    print("  ✅ Platform settings created")


def seed_fee_configuration():
    """Create fee configuration (optional - defaults exist in code)"""
    print("\n📋 Seeding fee_configuration...")
    
    existing = db.fee_configuration.find_one({"config_type": "fees"})
    if existing:
        print("  ⏭️ Fee configuration already exists, skipping")
        return
    
    fee_config = {
        "config_type": "fees",
        "fees": {
            # P2P Fees
            "p2p_maker_fee_percent": 1.0,
            "p2p_taker_fee_percent": 1.0,
            "p2p_express_fee_percent": 2.0,
            
            # Instant Buy/Sell
            "instant_buy_fee_percent": 3.0,
            "instant_sell_fee_percent": 2.0,
            "instant_buy_spread_percent": 2.0,  # Price markup
            "instant_sell_spread_percent": 2.0,
            
            # Swaps
            "swap_fee_percent": 1.5,
            
            # Withdrawals
            "withdrawal_fee_percent": 1.0,
            "network_fee_percent": 0.5,
            
            # Savings
            "savings_early_withdrawal_penalty_percent": 50.0,  # Of earned interest
            
            # Referrals
            "referral_standard_commission_percent": 20.0,
            "referral_vip_commission_percent": 20.0,
            "referral_golden_commission_percent": 50.0
        },
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    db.fee_configuration.insert_one(fee_config)
    print("  ✅ Fee configuration created")


def seed_admin_liquidity_wallets():
    """Create admin liquidity wallets for instant buy/sell"""
    print("\n📋 Seeding admin_liquidity_wallets...")
    
    currencies = [
        {"currency": "BTC", "name": "Bitcoin", "balance": 0.0},
        {"currency": "ETH", "name": "Ethereum", "balance": 0.0},
        {"currency": "USDT", "name": "Tether", "balance": 0.0},
        {"currency": "USDC", "name": "USD Coin", "balance": 0.0},
        {"currency": "SOL", "name": "Solana", "balance": 0.0},
        {"currency": "XRP", "name": "Ripple", "balance": 0.0},
        {"currency": "ADA", "name": "Cardano", "balance": 0.0},
        {"currency": "DOGE", "name": "Dogecoin", "balance": 0.0},
        {"currency": "GBP", "name": "British Pound", "balance": 0.0},
    ]
    
    created = 0
    for curr in currencies:
        existing = db.admin_liquidity_wallets.find_one({"currency": curr["currency"]})
        if not existing:
            wallet = {
                "wallet_id": str(uuid.uuid4()),
                "currency": curr["currency"],
                "name": curr["name"],
                "balance": curr["balance"],
                "available_balance": curr["balance"],
                "locked_balance": 0.0,
                "deposit_address": "",  # Admin sets this manually
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            db.admin_liquidity_wallets.insert_one(wallet)
            created += 1
    
    if created > 0:
        print(f"  ✅ Created {created} admin liquidity wallets")
    else:
        print("  ⏭️ Admin liquidity wallets already exist, skipping")
    
    print("  ℹ️ NOTE: Admin must add balance to wallets before instant buy works")


def seed_savings_products():
    """Create default savings products"""
    print("\n📋 Seeding savings_products...")
    
    existing_count = db.savings_products.count_documents({})
    if existing_count > 0:
        print(f"  ⏭️ {existing_count} savings products already exist, skipping")
        return
    
    # Create savings products for popular currencies
    currencies = ["BTC", "ETH", "USDT", "USDC", "SOL", "XRP", "ADA"]
    tiers = [
        {"days": 7, "apy": 3.0, "name": "Flex"},
        {"days": 30, "apy": 5.0, "name": "Short"},
        {"days": 90, "apy": 8.0, "name": "Medium"},
        {"days": 180, "apy": 12.0, "name": "Long"},
        {"days": 365, "apy": 15.0, "name": "Annual"}
    ]
    
    created = 0
    for currency in currencies:
        for tier in tiers:
            product = {
                "product_id": str(uuid.uuid4()),
                "currency": currency,
                "name": f"{currency} {tier['name']} Savings",
                "lock_period_days": tier["days"],
                "apy_percent": tier["apy"],
                "min_amount": 0.0001 if currency in ["BTC", "ETH"] else 1.0,
                "max_amount": 100.0 if currency in ["BTC"] else 10000.0,
                "early_withdrawal_allowed": True,
                "early_withdrawal_penalty_percent": 50.0,
                "status": "active",
                "created_at": datetime.now(timezone.utc)
            }
            db.savings_products.insert_one(product)
            created += 1
    
    print(f"  ✅ Created {created} savings products")


def seed_referral_tiers():
    """Create referral tier configuration"""
    print("\n📋 Seeding referral_tiers...")
    
    existing = db.referral_tiers.find_one({"tier_type": "config"})
    if existing:
        print("  ⏭️ Referral tiers already exist, skipping")
        return
    
    referral_config = {
        "tier_type": "config",
        "tiers": {
            "standard": {
                "name": "Standard",
                "commission_percent": 20.0,
                "min_referrals": 0,
                "benefits": ["20% commission on referral fees"]
            },
            "vip": {
                "name": "VIP",
                "commission_percent": 20.0,
                "min_referrals": 10,
                "benefits": ["20% commission", "Priority support"]
            },
            "golden": {
                "name": "Golden",
                "commission_percent": 50.0,
                "min_referrals": 50,
                "benefits": ["50% commission", "VIP support", "Early access"]
            }
        },
        "created_at": datetime.now(timezone.utc)
    }
    
    db.referral_tiers.insert_one(referral_config)
    print("  ✅ Referral tiers created")


def seed_monetization_settings():
    """Create monetization settings (fees, boosts, seller levels)"""
    print("\n📋 Seeding monetization_settings...")
    
    existing = db.monetization_settings.find_one({"setting_id": "default_monetization"})
    if existing:
        print("  ⏭️ Monetization settings already exist, skipping")
        return
    
    monetization = {
        "setting_id": "default_monetization",
        
        # Trading Fees
        "instant_buy_fee_percent": 1.5,
        "instant_sell_fee_percent": 1.0,
        "crypto_swap_fee_percent": 2.5,
        "p2p_express_fee_percent": 1.5,
        "p2p_trade_fee_percent": 1.0,
        "p2p_seller_fee_percent": 3.0,
        "buyer_express_fee_percent": 1.0,
        "admin_sell_spread_percent": 3.0,
        "crypto_withdrawal_fee_percent": 1.0,
        "crypto_deposit_fee_percent": 0.0,
        
        # Payment Method Fees
        "payment_method_fees": {
            "paypal": 2.0,
            "cashapp": 1.0,
            "revolut": 0.5,
            "bank_transfer": 0.0,
            "faster_payments": 0.0
        },
        
        # Boosted Listings
        "boost_1h_price": 10.0,
        "boost_6h_price": 20.0,
        "boost_24h_price": 50.0,
        
        # Seller Levels
        "seller_verification_price": 25.0,
        "seller_silver_upgrade_price": 20.0,
        "seller_gold_upgrade_price": 50.0,
        "silver_fee_reduction_percent": 0.5,
        "gold_fee_reduction_percent": 1.0,
        
        # Referral Upgrades
        "referral_tier_30_percent_price": 20.0,
        "referral_tier_40_percent_price": 40.0,
        "referral_commission_percent": 20.0,
        
        # Other
        "early_withdrawal_penalty_percent": 4.0,
        "staking_admin_fee_percent": 10.0,
        "admin_liquidity_spread_percent": 0.25,
        "dispute_penalty_gbp": 10.0,
        "p2p_dispute_fee_gbp": 1.50,
        
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    db.monetization_settings.insert_one(monetization)
    print("  ✅ Monetization settings created")


def seed_supported_coins():
    """Create supported coins for trading/swaps"""
    print("\n📋 Seeding supported_coins...")
    
    existing_count = db.supported_coins.count_documents({})
    if existing_count > 0:
        print(f"  ⏭️ {existing_count} supported coins already exist, skipping")
        return
    
    coins = [
        {"symbol": "BTC", "name": "Bitcoin", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.0001, "min_withdraw": 0.0001, "decimals": 8},
        {"symbol": "ETH", "name": "Ethereum", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.001, "min_withdraw": 0.001, "decimals": 8},
        {"symbol": "USDT", "name": "Tether", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 1.0, "min_withdraw": 1.0, "decimals": 6},
        {"symbol": "USDC", "name": "USD Coin", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 1.0, "min_withdraw": 1.0, "decimals": 6},
        {"symbol": "SOL", "name": "Solana", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.01, "min_withdraw": 0.01, "decimals": 8},
        {"symbol": "XRP", "name": "Ripple", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 1.0, "min_withdraw": 1.0, "decimals": 6},
        {"symbol": "ADA", "name": "Cardano", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 1.0, "min_withdraw": 1.0, "decimals": 6},
        {"symbol": "DOGE", "name": "Dogecoin", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 10.0, "min_withdraw": 10.0, "decimals": 8},
        {"symbol": "LTC", "name": "Litecoin", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.01, "min_withdraw": 0.01, "decimals": 8},
        {"symbol": "BNB", "name": "BNB", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.01, "min_withdraw": 0.01, "decimals": 8},
        {"symbol": "MATIC", "name": "Polygon", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 1.0, "min_withdraw": 1.0, "decimals": 8},
        {"symbol": "DOT", "name": "Polkadot", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.1, "min_withdraw": 0.1, "decimals": 8},
        {"symbol": "AVAX", "name": "Avalanche", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 0.1, "min_withdraw": 0.1, "decimals": 8},
        {"symbol": "TRX", "name": "TRON", "enabled": True, "swap_enabled": True, "trading_enabled": True, "deposit_enabled": True, "withdraw_enabled": True, "min_deposit": 10.0, "min_withdraw": 10.0, "decimals": 6},
    ]
    
    for coin in coins:
        coin["coin_id"] = str(uuid.uuid4())
        coin["created_at"] = datetime.now(timezone.utc)
    
    db.supported_coins.insert_many(coins)
    print(f"  ✅ Created {len(coins)} supported coins")


def seed_cms_settings():
    """Create CMS settings for marketplace display"""
    print("\n📋 Seeding cms_settings...")
    
    existing = db.cms_settings.find_one({"setting_type": "marketplace"})
    if existing:
        print("  ⏭️ CMS settings already exist, skipping")
        return
    
    cms_settings = {
        "setting_type": "marketplace",
        "display": {
            "show_seller_rating": True,
            "show_completion_rate": True,
            "show_trade_count": True,
            "show_response_time": True,
            "default_sort": "price_low"
        },
        "limits": {
            "min_trade_amount_gbp": 10,
            "max_trade_amount_gbp": 10000,
            "max_listings_per_seller": 10
        },
        "created_at": datetime.now(timezone.utc)
    }
    
    db.cms_settings.insert_one(cms_settings)
    print("  ✅ CMS settings created")


def create_database_indexes():
    """Create indexes for performance"""
    print("\n📋 Creating database indexes...")
    
    indexes = [
        # Users
        ("users", [("email", ASCENDING)], {"unique": True, "sparse": True}),
        ("users", [("user_id", ASCENDING)], {"unique": True}),
        
        # User accounts (alternative collection)
        ("user_accounts", [("email", ASCENDING)], {"unique": True, "sparse": True}),
        ("user_accounts", [("user_id", ASCENDING)], {"unique": True, "sparse": True}),
        ("user_accounts", [("referred_by", ASCENDING)], {}),
        
        # Trader balances
        ("trader_balances", [("trader_id", ASCENDING), ("currency", ASCENDING)], {"unique": True, "sparse": True}),
        
        # Wallets
        ("wallets", [("user_id", ASCENDING), ("currency", ASCENDING)], {}),
        
        # P2P
        ("p2p_listings", [("seller_uid", ASCENDING)], {}),
        ("p2p_listings", [("status", ASCENDING), ("crypto", ASCENDING)], {}),
        ("p2p_trades", [("trade_id", ASCENDING)], {"unique": True, "sparse": True}),
        ("p2p_trades", [("buyer_id", ASCENDING)], {}),
        ("p2p_trades", [("seller_id", ASCENDING)], {}),
        
        # Transactions
        ("transactions", [("user_id", ASCENDING), ("created_at", DESCENDING)], {}),
        ("transaction_history", [("user_id", ASCENDING), ("created_at", DESCENDING)], {}),
        
        # Revenue
        ("admin_revenue", [("created_at", DESCENDING)], {}),
        ("admin_revenue", [("source", ASCENDING), ("created_at", DESCENDING)], {}),
        
        # Referrals
        ("referral_commissions", [("referrer_user_id", ASCENDING)], {}),
        ("referral_commissions", [("referred_user_id", ASCENDING)], {}),
        
        # Savings
        ("savings_deposits", [("user_id", ASCENDING)], {}),
        ("savings_deposits", [("status", ASCENDING)], {}),
    ]
    
    created = 0
    for collection, keys, options in indexes:
        try:
            db[collection].create_index(keys, **options)
            created += 1
        except Exception as e:
            if "already exists" not in str(e).lower():
                print(f"  ⚠️ Index error on {collection}: {e}")
    
    print(f"  ✅ Created/verified {created} indexes")


def create_admin_user(email: str = None, password: str = None):
    """Create an admin user (optional)"""
    print("\n📋 Creating admin user...")
    
    email = email or os.environ.get('ADMIN_EMAIL', 'admin@coinhubx.net')
    password = password or 'Admin123!'  # Default password - CHANGE IN PRODUCTION
    
    existing = db.users.find_one({"email": email})
    if existing:
        print(f"  ⏭️ Admin user {email} already exists, skipping")
        return
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user_id = str(uuid.uuid4())
    
    admin_user = {
        "user_id": user_id,
        "email": email,
        "password_hash": password_hash,
        "name": "Admin",
        "full_name": "Platform Admin",
        "role": "admin",
        "is_admin": True,
        "email_verified": True,
        "phone_verified": False,
        "kyc_verified": True,
        "kyc_status": "approved",
        "is_seller": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    db.users.insert_one(admin_user)
    print(f"  ✅ Admin user created: {email}")
    print(f"  ℹ️ Default password: {password} (CHANGE THIS!)")


def main():
    print("="*60)
    print("🌱 CoinHubX Database Seeding Script")
    print("="*60)
    
    # Run all seeders
    seed_admin_settings()
    seed_platform_settings()
    seed_fee_configuration()
    seed_admin_liquidity_wallets()
    seed_savings_products()
    seed_referral_tiers()
    create_database_indexes()
    
    # Optional: Create admin user
    create_admin = input("\n❓ Create admin user? (y/n): ").lower().strip()
    if create_admin == 'y':
        create_admin_user()
    
    print("\n" + "="*60)
    print("✅ Database seeding complete!")
    print("="*60)
    print("\n📝 Next steps:")
    print("  1. Log into admin panel and add liquidity to wallets")
    print("  2. Configure payment methods for P2P")
    print("  3. Set up NOWPayments webhook URL")
    print("  4. Test user registration and login")
    print("\n🔐 Admin Panel: https://yourdomain.com/admin/login")
    print("   Admin Code: CRYPTOLEND_ADMIN_2025")


if __name__ == "__main__":
    main()
