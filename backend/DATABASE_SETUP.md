# CoinHubX - Database Setup Guide

## Overview

The CoinHubX backend requires MongoDB with certain default records seeded.

---

## Quick Setup

```bash
# 1. Ensure MongoDB URL is in .env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=coinhubx_production

# 2. Run the seeding script
python seed_database.py
```

---

## Required Collections & Default Data

### 1. `admin_settings` - Platform Configuration

**Purpose:** Stores platform-wide settings

**Required Document:**
```javascript
{
  "setting_type": "general",
  "platform_name": "CoinHubX",
  "support_email": "support@coinhubx.net",
  "dispute_email": "disputes@coinhubx.net",
  "admin_code": "CRYPTOLEND_ADMIN_2025",  // For admin login
  "maintenance_mode": false,
  "registration_enabled": true,
  "p2p_enabled": true,
  "instant_buy_enabled": true,
  "swap_enabled": true
}
```

---

### 2. `platform_settings` - Feature Flags

**Purpose:** Enable/disable features

**Required Document:**
```javascript
{
  "setting_type": "features",
  "features": {
    "p2p_trading": true,
    "instant_buy": true,
    "instant_sell": true,
    "crypto_swap": true,
    "savings_vault": true,
    "referral_program": true,
    "google_oauth": true,
    "phone_verification": true,
    "two_factor_auth": true,
    "kyc_verification": false,
    "fiat_withdrawals": false
  },
  "limits": {
    "min_trade_gbp": 10,
    "max_trade_gbp": 10000,
    "daily_withdraw_limit_gbp": 5000,
    "kyc_threshold_gbp": 1000
  }
}
```

---

### 3. `fee_configuration` - Fee Settings

**Purpose:** All platform fees (can also be hardcoded in PLATFORM_CONFIG)

**Required Document:**
```javascript
{
  "config_type": "fees",
  "fees": {
    "p2p_maker_fee_percent": 1.0,
    "p2p_taker_fee_percent": 1.0,
    "p2p_express_fee_percent": 2.0,
    "instant_buy_fee_percent": 3.0,
    "instant_sell_fee_percent": 2.0,
    "instant_buy_spread_percent": 2.0,
    "instant_sell_spread_percent": 2.0,
    "swap_fee_percent": 1.5,
    "withdrawal_fee_percent": 1.0,
    "network_fee_percent": 0.5,
    "savings_early_withdrawal_penalty_percent": 50.0,
    "referral_standard_commission_percent": 20.0,
    "referral_vip_commission_percent": 20.0,
    "referral_golden_commission_percent": 50.0
  }
}
```

---

### 4. `admin_liquidity_wallets` - Instant Buy/Sell Liquidity

**Purpose:** Platform wallets for instant buy/sell operations

**Required Documents (one per currency):**
```javascript
{
  "wallet_id": "uuid",
  "currency": "BTC",
  "name": "Bitcoin",
  "balance": 0.0,           // Admin adds liquidity here
  "available_balance": 0.0,
  "locked_balance": 0.0,
  "deposit_address": ""     // Admin sets this
}

// Repeat for: ETH, USDT, USDC, SOL, XRP, ADA, DOGE, GBP
```

**Important:** Admin must add balance to these wallets for instant buy to work.

---

### 5. `savings_products` - Staking Products

**Purpose:** Available savings/staking options

**Example Document:**
```javascript
{
  "product_id": "uuid",
  "currency": "BTC",
  "name": "BTC Flex Savings",
  "lock_period_days": 7,
  "apy_percent": 3.0,
  "min_amount": 0.0001,
  "max_amount": 100.0,
  "early_withdrawal_allowed": true,
  "early_withdrawal_penalty_percent": 50.0,
  "status": "active"
}
```

The seeding script creates products for: BTC, ETH, USDT, USDC, SOL, XRP, ADA
With lock periods: 7, 30, 90, 180, 365 days

---

### 6. `referral_tiers` - Referral Commission Rates

**Purpose:** Define referral program tiers

**Required Document:**
```javascript
{
  "tier_type": "config",
  "tiers": {
    "standard": {
      "name": "Standard",
      "commission_percent": 20.0,
      "min_referrals": 0
    },
    "vip": {
      "name": "VIP",
      "commission_percent": 20.0,
      "min_referrals": 10
    },
    "golden": {
      "name": "Golden",
      "commission_percent": 50.0,
      "min_referrals": 50
    }
  }
}
```

---

## Database Indexes

The seeding script creates these indexes for performance:

| Collection | Index | Purpose |
|------------|-------|--------|
| `users` | `email` (unique) | Fast login lookup |
| `users` | `user_id` (unique) | User lookup |
| `trader_balances` | `trader_id + currency` | Balance queries |
| `p2p_trades` | `trade_id` | Trade lookup |
| `transactions` | `user_id + created_at` | Transaction history |
| `admin_revenue` | `created_at` | Revenue reports |
| `referral_commissions` | `referrer_user_id` | Commission lookup |

---

## Manual Seeding (if script fails)

If `seed_database.py` doesn't work, insert documents manually:

```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/coinhubx_production"

# Insert admin settings
db.admin_settings.insertOne({
  setting_type: "general",
  platform_name: "CoinHubX",
  admin_code: "CRYPTOLEND_ADMIN_2025",
  maintenance_mode: false
})

# Insert platform settings
db.platform_settings.insertOne({
  setting_type: "features",
  features: {
    p2p_trading: true,
    instant_buy: true,
    crypto_swap: true
  }
})

# Insert admin liquidity wallet (repeat for each currency)
db.admin_liquidity_wallets.insertOne({
  wallet_id: UUID().toString(),
  currency: "BTC",
  name: "Bitcoin",
  balance: 0.0
})
```

---

## After Seeding

1. **Admin Panel Access:**
   - URL: `https://yourdomain.com/admin/login`
   - Admin Code: `CRYPTOLEND_ADMIN_2025`

2. **Add Liquidity:**
   - Go to Admin > Liquidity Management
   - Add BTC/ETH/USDT balance for instant buy

3. **Configure NOWPayments:**
   - Set webhook URL in NOWPayments dashboard
   - URL: `https://yourdomain.com/api/nowpayments/webhook`

4. **Test:**
   - Create a test user
   - Try instant buy (will fail if no liquidity)
   - Try P2P listing creation

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Collection not found" | Run `seed_database.py` |
| "Instant buy unavailable" | Add liquidity to admin wallets |
| "Admin login failed" | Check `admin_code` in `admin_settings` |
| "Savings not showing" | Verify `savings_products` has records |

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2025
