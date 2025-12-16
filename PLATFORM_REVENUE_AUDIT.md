# PLATFORM REVENUE AUDIT - CURRENT STATE

## ⚠️ AUDIT FINDINGS - 16 December 2024

---

## REVENUE SOURCES IDENTIFIED

### 1. **P2P Marketplace Fees**

#### Maker Fee (1%)
- **Line:** 3462-3502 in server.py
- **Where it goes:** 
  - `internal_balances` collection (p2p_fees field)
  - `crypto_transactions` collection
- **❌ NOT in `admin_revenue` collection**

#### Taker Fee (1%)
- **Line:** 3193-3270 in server.py  
- **Where it goes:**
  - `wallet_service` admin_wallet
  - After referral commission split
- **❌ NOT in `admin_revenue` collection**

#### Express P2P Fee (2%)
- **Line:** 3202-3210 in server.py
- **Where it goes:**
  - `wallet_service` admin_wallet
  - `admin_revenue` collection (Line 4235)
- **✅ IN `admin_revenue` collection**

---

### 2. **Swap/Exchange Fees (1.5%)**

- **Line:** 9741-9774 in server.py
- **Where it goes:**
  - `admin_liquidity_wallets` collection
  - `internal_balances` collection (admin_wallet)
  - `swap_transactions` collection
- **❌ NOT in `admin_revenue` collection**

---

### 3. **Savings Vault Penalties (OPTION A)**

- **Line:** 5007-5022 in server.py
- **Where it goes:**
  - `wallet_balances` (ADMIN_LIQUIDITY)
  - `admin_revenue` collection
  - `savings_transactions` collection
- **✅ IN `admin_revenue` collection**

---

### 4. **Express Buy Markup**

- **Status:** Uses admin liquidity offers
- **Seller:** ADMIN_LIQUIDITY
- **Profit:** Built into the offer price
- **Tracking:** Not clearly tracked in `admin_revenue`

---

### 5. **Dispute Fees (2%)**

- **Line:** ~23977 in server.py
- **Where it goes:**
  - `admin_revenue` collection
- **✅ IN `admin_revenue` collection**

---

## PROBLEM SUMMARY

### Collections Being Used (Fragmented)

1. **`admin_revenue`** - Only has:
   - Savings penalties
   - Express P2P fees
   - Dispute fees

2. **`internal_balances`** - Has:
   - P2P maker fees
   - Swap fees
   - Mixed with other data

3. **`admin_liquidity_wallets`** - Has:
   - Swap fees
   - Admin liquidity balances

4. **`wallet_balances` (ADMIN_LIQUIDITY)** - Has:
   - Savings penalties
   - Various crypto balances

5. **`crypto_transactions`** - Has:
   - P2P fee records
   - Mixed with user transactions

---

## WHAT'S MISSING

### ❌ P2P Maker Fees NOT in admin_revenue
- Currently only in `internal_balances` and `crypto_transactions`
- Not visible in unified dashboard

### ❌ P2P Taker Fees NOT in admin_revenue  
- Currently only in `wallet_service` admin_wallet
- Not visible in unified dashboard

### ❌ Swap Fees NOT in admin_revenue
- Currently only in `admin_liquidity_wallets` and `internal_balances`
- Not visible in unified dashboard

### ❌ Express Buy Profits NOT in admin_revenue
- Profit is hidden in the markup
- No clear tracking in `admin_revenue`

---

## RECOMMENDED FIX

### Create Unified Revenue Tracking

ALL platform profits should be logged to `admin_revenue` collection with this structure:

```javascript
{
  "revenue_id": "uuid",
  "source": "p2p_maker_fee" | "p2p_taker_fee" | "swap_fee" | "savings_penalty" | "express_buy_markup" | "dispute_fee",
  "revenue_type": "TRADING" | "SAVINGS" | "DISPUTE",
  "currency": "BTC" | "ETH" | "GBP" | etc,
  "amount": 0.001,
  "amount_usd": 100.0,
  "user_id": "user123",
  "related_transaction_id": "trade_id or swap_id",
  "fee_percentage": 1.0,
  "referral_commission_paid": 0.0,
  "net_profit": 0.001,
  "timestamp": "2024-12-16T00:00:00Z",
  "description": "P2P maker fee from trade XYZ"
}
```

---

## IMMEDIATE ACTIONS NEEDED

1. **Add `admin_revenue` logging to P2P Maker Fee** (Line ~3502)
2. **Add `admin_revenue` logging to P2P Taker Fee** (Line ~3270)
3. **Add `admin_revenue` logging to Swap Fee** (Line ~9774)
4. **Add `admin_revenue` logging to Express Buy Profits**
5. **Create unified admin dashboard query** that reads from `admin_revenue` only

---

## VERIFICATION QUERIES

### Check Current Revenue (Fragmented)
```javascript
// P2P Fees (incomplete)
db.internal_balances.find({ p2p_fees: { $exists: true } })

// Swap Fees (incomplete)
db.admin_liquidity_wallets.find({})

// Savings Penalties (complete)
db.admin_revenue.find({ revenue_type: "OPTION_A_PENALTY" })

// Express P2P (complete)
db.admin_revenue.find({ source: "p2p_express" })
```

### After Fix - Unified Query
```javascript
// ALL platform revenue in one place
db.admin_revenue.find({})

// Revenue by source
db.admin_revenue.aggregate([
  { $group: { 
      _id: "$source", 
      total: { $sum: "$net_profit" },
      count: { $sum: 1 }
  }}
])
```

---

## STATUS

**Current State:** ⚠️ FRAGMENTED - Revenue tracked in 5+ different collections

**User Request:** ALL profits must go to business/admin/liquidity dashboard

**Action Required:** YES - Need to consolidate all revenue sources into `admin_revenue` collection

**Priority:** HIGH - User explicitly requested confirmation that all profits are tracked

---

*Audit Date: 16 December 2024*
