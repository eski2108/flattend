# ⚠️ REFERRAL SYSTEM - LOCKED & VERIFIED ⚠️

**Date:** December 16, 2025
**Status:** FULLY IMPLEMENTED AND CONNECTED

---

## DO NOT MODIFY WITHOUT UNDERSTANDING THE COMPLETE FLOW

---

## VERIFIED CODE PATHS

### 1. Referral Commission Processing (`referral_engine.py`)

**Function:** `process_referral_commission()`

**What it does:**
1. Finds user's referrer from `user_accounts.referred_by`
2. Gets referrer tier (standard=20%, VIP=20%, golden=50%)
3. Calculates commission: `fee_amount × commission_rate`
4. **CREDITS referrer's `trader_balances`** (main wallet)
5. **LOGS to `referral_commissions`** (dashboard queries this)
6. **UPDATES `referral_stats`** (lifetime totals)
7. **UPDATES `referral_earnings`** (by currency)
8. **LOGS platform net share to `admin_revenue`**

### 2. Collections Updated

| Collection | Purpose | Dashboard Uses |
|------------|---------|----------------|
| `trader_balances` | Referrer's actual wallet balance | Wallet page |
| `referral_commissions` | Individual commission records | Referral dashboard |
| `referral_stats` | Lifetime totals per user | Referral dashboard |
| `referral_earnings` | Earnings by currency | Referral dashboard |
| `admin_revenue` | Platform's net share after referral | Admin dashboard |

### 3. Dashboard Endpoint

**GET /api/referral/dashboard/{user_id}**

Returns:
- `referral_code` - User's unique code
- `referral_link` - Shareable link
- `total_referrals` - Number of signups
- `lifetime_commission_earned` - Total £ earned
- `total_fees_generated_by_network` - Fees from referred users
- `recent_commissions` - Last 10 commission records
- `earnings_by_currency` - Breakdown by currency
- `referred_users` - List of referred users

### 4. Fee Types That Trigger Referral Commission

- `INSTANT_BUY` - Instant Buy fee (1%)
- `INSTANT_SELL` - Instant Sell fee (1%)
- `P2P_MAKER` - P2P Maker fee
- `P2P_TAKER` - P2P Taker fee
- `SWAP` - Swap fee
- `TRADING` - Trading fee

### 5. Commission Tiers

| Tier | Commission Rate |
|------|----------------|
| Standard | 20% of fee |
| VIP | 20% of fee |
| Golden | 50% of fee |

---

## PROOF OF CONNECTION

### referral_engine.py Lines 94-142:
```python
# 4. Credit commission to referrer's TRADER BALANCE
await self.db.trader_balances.update_one(
    {"trader_id": referrer_id, "currency": currency},
    {"$inc": {"total_balance": commission_amount, "available_balance": commission_amount}}
)

# 5. Log commission (dashboard queries this)
await self.db.referral_commissions.insert_one({
    "referrer_user_id": referrer_id,  # Dashboard field
    "commission_amount": commission_amount,
    ...
})

# 6. Update referral_stats (dashboard totals)
await self.db.referral_stats.update_one(
    {"user_id": referrer_id},
    {"$inc": {"lifetime_commission_earned": commission_amount}}
)

# 7. Update referral_earnings (by currency)
await self.db.referral_earnings.update_one(
    {"user_id": referrer_id, "currency": currency},
    {"$inc": {"total_earned": commission_amount}}
)
```

### admin_liquidity_quotes.py Lines 444-461:
```python
# PROCESS REFERRAL COMMISSION ON INSTANT BUY FEE
if get_referral_engine:
    referral_engine = get_referral_engine()
    await referral_engine.process_referral_commission(
        user_id=user_id,
        fee_amount=fee_amount,
        fee_type="INSTANT_BUY",
        currency="GBP",
        ...
    )
```

---

## ADMIN REVENUE CONNECTION

All fees flow to `admin_revenue` collection:

1. **Spread profits** → `source: "instant_buy_spread"` or `"instant_sell_spread"`
2. **Fee revenue (after referral)** → `source: "instant_buy_fee"` or `"instant_sell_fee"`
3. **Platform net share** → `source: "referral_net_share_{fee_type}"`

---

## FILES INVOLVED

1. `/app/backend/referral_engine.py` - Core commission processing
2. `/app/backend/admin_liquidity_quotes.py` - Instant Buy/Sell integration
3. `/app/backend/server.py` - Dashboard endpoints & Express Buy

---

**THIS SYSTEM IS COMPLETE. DO NOT MODIFY WITHOUT FULL TESTING.**
