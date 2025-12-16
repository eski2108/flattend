# ⚠️ INSTANT BUY/SELL REVENUE - LOCKED & VERIFIED ⚠️

**Date:** December 16, 2025
**Status:** FULLY CONNECTED TO ADMIN DASHBOARD

---

## REVENUE FLOW

### User Makes Instant Buy:

1. **Spread Profit** (3% markup)
   - Logged to `admin_revenue` with `source: "instant_buy_spread"`
   - 100% goes to platform (no referral cut on spread)

2. **Express Fee** (1%)
   - If user has referrer: Split between referrer (20-50%) and platform
   - If no referrer: 100% to platform
   - Both logged to `admin_revenue`

### User Makes Instant Sell:

1. **Spread Profit** (2.5% discount)
   - Logged to `admin_revenue` with `source: "instant_sell_spread"`
   - 100% goes to platform

2. **Sell Fee** (1%)
   - Same referral split as above
   - Logged to `admin_revenue`

---

## DATABASE COLLECTIONS

| Collection | What's Stored |
|------------|---------------|
| `admin_revenue` | ALL revenue (spread + fees) |
| `admin_liquidity_transactions` | Transaction audit trail |
| `admin_liquidity_quotes` | Quote history |
| `referral_commissions` | Referrer payouts |
| `trader_balances` | User wallets (including referrer credits) |

---

## CODE PROOF

### admin_liquidity_quotes.py - _execute_buy():

```python
# CREDIT SPREAD PROFIT TO ADMIN REVENUE
await self.db.admin_revenue.insert_one({
    "revenue_id": str(uuid.uuid4()),
    "source": "instant_buy_spread",
    "revenue_type": "SPREAD_PROFIT",
    "amount": spread_profit_gbp,
    "net_profit": spread_profit_gbp,
    ...
})

# CREDIT FEE TO ADMIN REVENUE
await self.db.admin_revenue.insert_one({
    "source": "instant_buy_fee",
    "revenue_type": "FEE_REVENUE",
    "amount": fee_amount,
    ...
})

# PROCESS REFERRAL COMMISSION
await referral_engine.process_referral_commission(
    fee_amount=fee_amount,
    fee_type="INSTANT_BUY",
    ...
)
```

---

**THIS SYSTEM IS COMPLETE. DO NOT MODIFY WITHOUT FULL TESTING.**
