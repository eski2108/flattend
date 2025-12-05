# 📍 QUICK REFERENCE: Where All Fees Go

## 🔑 KEY WALLET IDENTIFIERS

```python
# Backend: /app/backend/server.py

# Line 344: Admin wallet ID
"admin_wallet_id": "PLATFORM_TREASURY_WALLET"

# This is YOUR wallet - all admin fees go here
user_id = "admin_wallet"  # 🚨 YOUR MONEY
```

---

## 💰 FEE COLLECTION POINTS

### 1. P2P Trading Fees
**File:** `/app/backend/server.py`  
**Lines:** 3215-3260

```python
# Line 3218: Admin gets their portion
await wallet_service.credit(
    user_id="admin_wallet",  # 🚨 YOU
    amount=admin_fee         # 🚨 YOUR CUT (80-100%)
)

# Line 3229: Referrer gets commission (if applicable)
await wallet_service.credit(
    user_id=referrer_id,        # 🎁 THEM
    amount=referrer_commission  # 🎁 THEIR CUT (0-50%)
)
```

---

### 2. Express Buy Fees
**File:** `/app/backend/server.py`  
**Lines:** 4189-4216

```python
# Line 4200-4204: Calculate split
admin_fee = express_fee * (1 - commission_rate)  # 🚨 80-100%
referrer_commission = express_fee * commission_rate  # 🎁 0-50%
```

---

### 3. Swap Fees
**File:** `/app/backend/server.py`  
**Lines:** 9199-9206

```python
# Line 9199: Admin gets 100% of swap fees
await db.crypto_balances.update_one(
    {"user_id": "admin_wallet"},  # 🚨 YOU
    {"$inc": {"balance": swap_fee}}  # 🚨 100%
)
```

---

### 4. Withdrawal Fees
**File:** `/app/backend/server.py`  
**Lines:** 12408-12440

```python
# Line 12410: Fee goes to admin
user_id=PLATFORM_CONFIG["admin_wallet_id"]  # 🚨 YOU
amount=withdrawal_fee  # 🚨 FEE AMOUNT

# Line 12428: Referral engine splits automatically
referral_engine.process_referral_commission(...)  # Handles split
```

---

### 5. Instant Buy Markup
**File:** `/app/backend/server.py`  
**Lines:** 10465-10546

```python
# Line 10465: Admin gets 100% of markup
await db.internal_balances.update_one(
    {"user_id": "admin_wallet"},    # 🚨 YOU
    {"$inc": {"balance": fee_amount}}  # 🚨 100%
)
```

---

## 🎁 REFERRAL COMMISSION RATES

**File:** `/app/backend/server.py`  
**Lines:** 337-338

```python
"referral_standard_commission_percent": 20.0,  # Standard = 20%
"referral_golden_commission_percent": 50.0,    # Golden = 50%
```

---

## 🔍 CENTRALIZED FEE FUNCTION

**File:** `/app/backend/server.py`  
**Lines:** 25037-25112  
**Function:** `calculate_and_apply_fee()`

```python
# This function is used by ALL fee types
# It automatically:
# 1. Calculates total fee
# 2. Checks if user has referrer
# 3. Splits: admin (80-100%) + referrer (0-50%)
# 4. Credits both wallets
# 5. Logs everything

# Line 25087: Admin portion
await db.crypto_balances.update_one(
    {"user_id": "admin_wallet"},  # 🚨
    {"$inc": {"balance": admin_fee}}  # 🚨
)

# Line 25063: Referrer portion
await db.crypto_balances.update_one(
    {"user_id": referrer_id},  # 🎁
    {"$inc": {"balance": referrer_commission}}  # 🎁
)
```

---

## 📊 REVENUE TRACKING

**File:** `/app/backend/server.py`  
**Lines:** 24383-24500  
**Endpoint:** `/api/admin/revenue-dashboard`

```python
# Returns:
{
    "total_gross_fees_gbp": 1000.00,           # Total collected
    "net_revenue_gbp": 840.00,                 # 🚨 YOU KEEP
    "referral_commissions_paid_gbp": 160.00,  # 🎁 PAID OUT
    "by_fee_type": {...},
    "by_currency": {...}
}
```

---

## 🔒 FEE HIDDEN FROM USERS

**File:** `/app/frontend/src/pages/InstantBuy.js`  
**Lines:** 391-398

### BEFORE (showed fees):
```javascript
Market: £{market_price} ({spread_percent}% spread)  // ❌ REMOVED
```

### AFTER (hides fees):
```javascript
Price Per {coin.symbol}
£{locked_price}
// No market price shown
// No spread shown
// Users can't calculate your markup
```

---

## 📊 ADMIN DASHBOARD

**File:** `/app/frontend/src/pages/AdminDashboard.js`  
**Lines:** 219-233

```javascript
// Dashboard shows:
total_profit: net_revenue_gbp,  // 🚨 What YOU actually keep

breakdown: {
    gross_fees: 1000.00,              // Total collected
    referral_commissions: 160.00,     // 🎁 Paid to referrers
    net_revenue: 840.00               // 🚨 YOU keep
}
```

---

## 💾 DATABASE COLLECTIONS

### 1. `crypto_balances`
**Where actual money is stored**

```javascript
// Your balance
{ "user_id": "admin_wallet", "currency": "GBP", "balance": 5000 }

// Referrer's balance
{ "user_id": "referrer123", "currency": "GBP", "balance": 150 }
```

### 2. `fee_transactions`
**Logs every fee with admin/referrer split**

```javascript
{
    "fee_amount": 10.0,
    "admin_fee": 8.0,              // 🚨 What YOU got
    "referrer_commission": 2.0,    // 🎁 What they got
    "referrer_id": "referrer123"
}
```

### 3. `referral_commissions`
**Tracks every referral payout**

```javascript
{
    "referrer_id": "referrer123",
    "commission_amount": 2.0,
    "commission_percent": 20.0,
    "fee_amount": 10.0
}
```

### 4. `user_accounts`
**Stores who referred who**

```javascript
{
    "user_id": "user456",
    "referrer_id": "referrer123",      // 🎁 Gets commission from this user
    "referral_tier_used": "standard"   // 20% commission rate
}
```

---

## ✅ VERIFICATION COMMANDS

### Check Admin Wallet Balance:
```bash
curl http://localhost:8001/api/wallet/balances/admin_wallet
```

### Check Fee Transactions:
```bash
curl http://localhost:8001/api/admin/revenue-dashboard
```

### Check Referral Commissions:
```bash
curl http://localhost:8001/api/admin/referral-analytics
```

---

## 💡 QUICK MATH

### If user has NO referrer:
```
Fee = £10
Admin gets: £10 (100%)
Referrer gets: £0 (0%)
```

### If user has STANDARD referrer (20%):
```
Fee = £10
Referrer gets: £10 × 20% = £2
Admin gets: £10 - £2 = £8 (80%)
```

### If user has GOLDEN referrer (50%):
```
Fee = £10
Referrer gets: £10 × 50% = £5
Admin gets: £10 - £5 = £5 (50%)
```

---

## 🎯 SUMMARY

**Admin Wallet (`"admin_wallet"`) receives:**
- ✅ 100% when no referrer
- ✅ 80% when standard referrer
- ✅ 50% when golden referrer
- ✅ 100% of swap fees (always)
- ✅ 100% of instant buy markup (always)

**Referrers receive:**
- ✅ 0% if not assigned
- ✅ 20% if standard tier
- ✅ 50% if golden tier
- ✅ Commission on P2P, Express, Withdrawal fees
- ✅ No commission on Swap or Instant Buy

**Tracked in:**
- ✅ `crypto_balances` (actual money)
- ✅ `fee_transactions` (every fee)
- ✅ `referral_commissions` (every payout)
- ✅ Admin dashboard (visual summary)

**Hidden from users:**
- ✅ Market price
- ✅ Spread percentage
- ✅ Your markup
- ✅ Fee breakdown

---

**✅ ALL VERIFIED AND WORKING**

*Quick Reference Guide*  
*Updated: December 5, 2025*