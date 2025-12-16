# CoinHubX - Fee System & Revenue Tracking

## Overview

All platform fees flow into the `admin_revenue` collection for the business dashboard.
Referral commissions are deducted from platform fees before logging.

---

## Fee Configuration

**Location:** `/backend/server.py` - `PLATFORM_CONFIG` dict (line ~296)

```python
PLATFORM_CONFIG = {
    # P2P Fees
    "p2p_maker_fee_percent": 1.0,      # Seller fee
    "p2p_taker_fee_percent": 1.0,      # Buyer fee
    "p2p_express_fee_percent": 2.0,    # Express buy fee
    
    # Instant Buy/Sell
    "instant_buy_fee_percent": 3.0,    # Buy crypto fee
    "instant_sell_fee_percent": 2.0,   # Sell crypto fee
    
    # Trading
    "swap_fee_percent": 1.5,           # Crypto swap fee
    "spot_trading_fee_percent": 3.0,   # Spot trading
    "trading_fee_percent": 0.1,        # General trading
    
    # Withdrawals
    "withdrawal_fee_percent": 1.0,
    "network_withdrawal_fee_percent": 1.0,
    "fiat_withdrawal_fee_percent": 1.0,
    
    # Savings
    "savings_stake_fee_percent": 0.5,
    
    # Transfers
    "vault_transfer_fee_percent": 0.5,
    "cross_wallet_transfer_fee_percent": 0.25,
    
    # Referrals
    "referral_standard_commission_percent": 20.0,
    "referral_golden_commission_percent": 50.0,
}
```

---

## Fee Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FEE FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

  USER TRANSACTION          FEE CHARGED           REVENUE
        │                       │                     │
        │                       │                     │
        ├─────────────────────►│                     │
        │                       │                     │
        │   1. Calculate Fee    │                     │
        │                       │                     │
        │                       ├─────────────────────┤
        │                       │                     │
        │   2. Check Referral   │                     │
        │                       │                     │
        │   3. Pay Commission   │───► referrer_balance │
        │      (if referrer)    │   (20% or 50%)     │
        │                       │                     │
        │   4. Log to           │                     │
        │      admin_revenue    │────────────────────►│
        │                       │                     │
        └───────────────────────┴─────────────────────┘
```

---

## Fee Types & Where They're Logged

### 1. Instant Buy Fees
**Fee:** 3% + spread markup
**Location:** `/backend/admin_liquidity_quotes.py` (lines 401, 424)

```python
# Spread profit (price markup)
await self.db.admin_revenue.insert_one({
    "source": "INSTANT_BUY",
    "revenue_type": "SPREAD_PROFIT",
    "amount": spread_profit,
    "currency": "GBP"
})

# Fixed fee (3%)
await self.db.admin_revenue.insert_one({
    "source": "INSTANT_BUY",
    "revenue_type": "FEE_REVENUE",
    "amount": fee_amount,
    "currency": "GBP"
})
```

### 2. Instant Sell Fees
**Fee:** 2% + spread
**Location:** `/backend/admin_liquidity_quotes.py` (lines 565, 588)

```python
await self.db.admin_revenue.insert_one({
    "source": "INSTANT_SELL",
    "revenue_type": "SPREAD_PROFIT",
    "amount": spread_profit
})
```

### 3. Swap Fees
**Fee:** 1.5%
**Location:** `/backend/server.py` (line 9830)

```python
await db.admin_revenue.insert_one({
    "revenue_id": str(uuid.uuid4()),
    "source": "SWAP",
    "revenue_type": "SWAP_EXCHANGE",
    "fee_amount": fee_amount,
    "fee_currency": "GBP"
})
```

### 4. P2P Trading Fees
**Fee:** 1% maker + 1% taker
**Location:** `/backend/server.py` (lines 3279, 3525)

```python
await db.admin_revenue.insert_one({
    "revenue_id": str(uuid.uuid4()),
    "source": "P2P_TRADE",
    "revenue_type": "P2P_TRADING",
    "amount": fee_amount,
    "trade_id": trade_id
})
```

### 5. Savings Penalties
**Fee:** Varies by early withdrawal
**Location:** `/backend/server.py` (line 5049)

```python
await db.admin_revenue.insert_one({
    "source": "SAVINGS",
    "revenue_type": "OPTION_A_PENALTY",
    "amount": penalty_amount
})
```

---

## Referral Commission System

### Location
`/backend/referral_engine.py`

### Commission Tiers
| Tier | Commission Rate |
|------|----------------|
| Standard | 20% of fee |
| VIP | 20% of fee |
| Golden | 50% of fee |

### How It Works

1. **User pays fee** (e.g., £10 instant buy fee)
2. **Check if user has referrer** (from `user_accounts.referred_by`)
3. **Calculate commission** (£10 × 20% = £2)
4. **Credit referrer's wallet** (`trader_balances.available_balance += £2`)
5. **Log commission** (to `referral_commissions` collection)
6. **Log remaining to admin_revenue** (£8 platform profit)

### Database Collections

**`referral_commissions`** - Individual commission records
```javascript
{
  "commission_id": "uuid",
  "referrer_id": "referrer-uuid",
  "referrer_user_id": "referrer-uuid",  // For dashboard queries
  "referred_user_id": "user-uuid",
  "fee_type": "INSTANT_BUY",
  "fee_amount": 10.00,
  "commission_rate": 0.20,
  "commission_amount": 2.00,
  "currency": "GBP",
  "referrer_tier": "standard",
  "created_at": ISODate()
}
```

**`referral_stats`** - Aggregated totals per referrer
```javascript
{
  "user_id": "referrer-uuid",
  "lifetime_commission_earned": 150.00,
  "total_fees_generated_by_network": 750.00,
  "last_commission_at": "2025-12-16T12:00:00Z"
}
```

---

## Admin Revenue Collection Schema

**Collection:** `admin_revenue`

```javascript
{
  "revenue_id": "uuid",
  "source": "INSTANT_BUY",           // Source transaction type
  "revenue_type": "SPREAD_PROFIT",   // Specific revenue category
  "amount": 15.50,                    // Amount in currency
  "currency": "GBP",
  "user_id": "user-uuid",             // Who paid
  "trade_id": "trade-uuid",           // Related trade (if applicable)
  "referral_commission_paid": 3.10,   // Commission paid to referrer
  "net_platform_revenue": 12.40,      // After referral deduction
  "created_at": ISODate(),
  "metadata": {}                       // Additional context
}
```

### Revenue Types
| Type | Description |
|------|-------------|
| `SPREAD_PROFIT` | Price markup on instant buy/sell |
| `FEE_REVENUE` | Fixed percentage fees |
| `P2P_TRADING` | P2P maker/taker fees |
| `SWAP_EXCHANGE` | Crypto swap fees |
| `OPTION_A_PENALTY` | Savings early withdrawal penalty |
| `NETWORK_FEE` | Network/withdrawal fees |

---

## Dashboard Endpoints

### Get Revenue Statistics
```
GET /api/admin/fees/revenue-stats
```
**Location:** `server.py` line 15176

### Get Revenue Transactions
```
GET /api/admin/revenue/transactions?limit=100&offset=0
```
**Location:** `server.py` line 16567

### Get Monetization Breakdown
```
GET /api/admin/revenue/monetization-breakdown
```
**Location:** `server.py` line 16665

Returns detailed breakdown of all 13 revenue sources:
- Express Buy
- Instant Sell
- Spread Markup
- P2P Fees
- Swap Fees
- Savings Penalties
- etc.

---

## Database Verification Queries

### Check Total Revenue
```javascript
db.admin_revenue.aggregate([
  { $group: {
    _id: "$revenue_type",
    total: { $sum: "$amount" },
    count: { $sum: 1 }
  }},
  { $sort: { total: -1 } }
])
```

### Check Referral Commissions
```javascript
db.referral_commissions.aggregate([
  { $group: {
    _id: "$referrer_id",
    total_commission: { $sum: "$commission_amount" },
    count: { $sum: 1 }
  }}
])
```

### Check Revenue by Date
```javascript
db.admin_revenue.aggregate([
  { $match: {
    created_at: {
      $gte: ISODate("2025-12-01"),
      $lt: ISODate("2025-12-31")
    }
  }},
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
    daily_revenue: { $sum: "$amount" }
  }},
  { $sort: { _id: 1 } }
])
```

---

## Files Reference

| File | Fee Logic |
|------|----------|
| `/backend/server.py` | P2P fees, swap fees, withdrawal fees |
| `/backend/admin_liquidity_quotes.py` | Instant buy/sell fees, spreads |
| `/backend/referral_engine.py` | Referral commission calculation |
| `/backend/centralized_fee_system.py` | Fee configuration manager |

---

## Testing Fee Flow

### 1. Test Instant Buy Fee
```bash
# Create quote
POST /api/admin-liquidity/quote
{
  "user_id": "test-user",
  "action": "buy",
  "crypto_currency": "BTC",
  "fiat_amount": 100
}

# Execute
POST /api/admin-liquidity/execute
{
  "quote_id": "quote-id",
  "user_id": "test-user"
}
```

### 2. Verify Revenue Logged
```bash
# Check database
db.admin_revenue.find({source: "INSTANT_BUY"}).sort({created_at: -1}).limit(1)
```

### 3. Verify Referral Commission
```bash
db.referral_commissions.find({referred_user_id: "test-user"}).sort({created_at: -1}).limit(1)
db.trader_balances.find({trader_id: "referrer-id", currency: "GBP"})
```

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Revenue not showing | Missing `admin_revenue.insert_one()` | Add logging in transaction handler |
| Referral not credited | User has no `referred_by` | Check user_accounts collection |
| Wrong commission rate | Tier lookup failed | Verify referrer_tier field |
| Dashboard shows £0 | Wrong field name in query | Check revenue_type matches |

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2025
