# CoinHubX Referral System - Complete Flow

## ✅ REFERRAL SYSTEM STATUS: FULLY CONNECTED

---

## 💰 HOW COMMISSIONS ARE PAID

### Commission Flow:
```
User A (Referrer) invites User B
         ↓
User B signs up with User A's referral code
         ↓
User B makes a trade (P2P, Swap, Buy, Sell)
         ↓
Platform charges fee to User B
         ↓
Referral Engine calculates commission (20% or 50%)
         ↓
Commission credited to User A's TRADER BALANCE
         ↓
Recorded in referral_commissions collection
         ↓
Shows in User A's Referral Dashboard
         ↓
Shows in Admin Dashboard
```

---

## 🎯 COMMISSION TIERS

| Tier | Commission Rate | How to Get |
|------|-----------------|------------|
| **Standard** | 20% of fees | Default (Free) |
| **VIP** | 20% of fees | Purchase £150 package |
| **Golden** | 50% of fees | Admin assigns only |

---

## 💵 WHAT FEES GENERATE COMMISSIONS

The `referral_engine.py` processes commissions for ALL fee types:

1. **P2P Maker Fee** - When seller completes P2P trade
2. **P2P Taker Fee** - When buyer completes P2P trade
3. **P2P Express Fee** - Express/instant P2P trades
4. **Instant Buy Fee** - Buying crypto with fiat
5. **Instant Sell Fee** - Selling crypto for fiat
6. **Swap Fee** - Crypto-to-crypto swaps
7. **Trading Fee** - Spot trading fees
8. **Savings Deposit Fee** - Savings/staking deposits
9. **Network Withdrawal Fee** - Crypto withdrawals
10. **Spread Profit** - Admin liquidity spread

---

## 📊 WHERE COMMISSIONS SHOW

### 1. REFERRER'S DASHBOARD
**Page:** `/referral-dashboard`
**API:** `GET /api/user/referral-dashboard/{user_id}`

Shows:
- Total referrals count
- Active referrals (who made trades)
- Total earnings
- Commission rate (20% or 50%)
- List of referred users
- Recent commission transactions
- Referral link & code

### 2. ADMIN DASHBOARD
**Page:** `/admin/dashboard`
**APIs:**
- `GET /api/admin/referral-earnings` - All referral earnings
- `GET /api/admin/referral-config` - Commission settings
- `POST /api/admin/mark-referral-paid` - Mark as paid
- `POST /api/admin/golden-referral/activate` - Activate 50% tier
- `POST /api/admin/golden-referral/deactivate` - Deactivate

Admin sees:
- All referrers and their earnings
- Paid vs unpaid amounts
- Ability to mark commissions as paid
- Ability to assign Golden tier (50%)
- Total referral commissions paid

---

## 🗄️ DATABASE COLLECTIONS

### referral_commissions
Stores every commission transaction:
```json
{
  "commission_id": "uuid",
  "referrer_id": "user who gets paid",
  "referred_user_id": "user who made the trade",
  "fee_type": "P2P_MAKER / SWAP / etc",
  "fee_amount": 10.00,
  "commission_rate": 0.20,
  "commission_amount": 2.00,
  "currency": "GBP",
  "status": "credited",
  "created_at": "timestamp"
}
```

### trader_balances
Where commission is credited:
```json
{
  "trader_id": "referrer's user_id",
  "currency": "GBP",
  "total_balance": 100.00,
  "available_balance": 100.00,
  "locked_balance": 0
}
```

### referral_payouts
Tracks admin manual payouts:
```json
{
  "user_id": "referrer's user_id",
  "paid_amount": 50.00,
  "last_paid_at": "timestamp"
}
```

### users
Stores referral relationships:
```json
{
  "user_id": "new user",
  "referrer_id": "who referred them",
  "referral_code": "USER123",
  "referral_tier": "standard/vip/golden"
}
```

---

## 🔄 COMMISSION CALCULATION

When a trade happens:

```python
# From referral_engine.py

# 1. Get fee amount from trade
fee_amount = 10.00  # Example: £10 fee

# 2. Get referrer's tier
referrer_tier = "standard"  # or "vip" or "golden"

# 3. Calculate commission
TIER_COMMISSIONS = {
    "standard": 0.20,  # 20%
    "vip": 0.20,       # 20%
    "golden": 0.50     # 50%
}

commission_rate = TIER_COMMISSIONS[referrer_tier]
commission_amount = fee_amount * commission_rate
# £10 × 20% = £2 commission

# 4. Credit to referrer's trader_balance
await db.trader_balances.update_one(
    {"trader_id": referrer_id},
    {"$inc": {"available_balance": commission_amount}}
)

# 5. Record in referral_commissions
await db.referral_commissions.insert_one({...})
```

---

## ✅ VERIFICATION CHECKLIST

| Item | Status |
|------|--------|
| Commission credited to referrer's balance | ✅ YES - trader_balances |
| Shows in referrer's dashboard | ✅ YES - /api/user/referral-dashboard |
| Shows in admin dashboard | ✅ YES - /api/admin/referral-earnings |
| Admin can mark as paid | ✅ YES - /api/admin/mark-referral-paid |
| Admin can assign Golden (50%) | ✅ YES - /api/admin/golden-referral/activate |
| All fee types generate commission | ✅ YES - referral_engine.py handles all |
| Standard tier (20%) works | ✅ YES |
| Golden tier (50%) works | ✅ YES |

---

## 📱 FRONTEND PAGES

| Page | URL | Purpose |
|------|-----|--------|
| Referral Dashboard | `/referral-dashboard` | User sees their referrals & earnings |
| Admin Dashboard | `/admin/dashboard` | Admin sees all referral data |
| Admin Referral Control | `/admin/referrals` | Manage golden tier users |

---

## 🔗 API ENDPOINTS SUMMARY

### User Endpoints:
- `GET /api/user/referral-dashboard/{user_id}` - Full dashboard data
- `GET /api/referral/dashboard/{user_id}` - Alternative endpoint
- `GET /api/referral/commissions/{user_id}` - Commission history
- `POST /api/referrals/purchase-vip` - Buy VIP package

### Admin Endpoints:
- `GET /api/admin/referral-earnings` - All earnings
- `GET /api/admin/referral-config` - Settings
- `POST /api/admin/update-referral-config` - Update settings
- `POST /api/admin/mark-referral-paid` - Mark paid
- `POST /api/admin/golden-referral/activate` - Give 50%
- `POST /api/admin/golden-referral/deactivate` - Remove 50%
- `GET /api/admin/golden-referral/users` - List golden users

---

*Document Generated: December 21, 2025*
