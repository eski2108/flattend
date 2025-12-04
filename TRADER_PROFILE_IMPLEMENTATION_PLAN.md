# TRADER PROFILE & MERCHANT RANKING SYSTEM - IMPLEMENTATION PLAN

**Date Started:** December 4, 2025  
**Priority:** P1 - HIGH  
**Status:** IN PROGRESS  
**Est. Completion:** December 4, 2025

---

## Overview

Implementing a comprehensive Binance-style trader profile system with automatic statistics tracking, merchant ranking, verification badges, and security deposits.

---

## Features to Implement

### 1. Automatic Merchant Statistics Tracking
- **All-time stats:** Total trades, buy count, sell count, success rate
- **30-day stats:** Recent trades, completion rate
- **Performance metrics:** Avg pay time, avg release time
- **Network:** Total trading partners, counterparty list
- **History:** First trade date, account age

### 2. Merchant Ranking System
Tiers:
- **Bronze:** 10+ trades, 85%+ completion, £500+ deposit
- **Silver:** 20+ trades, 90%+ completion, £900s avg release, £1000+ deposit
- **Gold:** 50+ trades, 95%+ completion, £600s avg release, £5000+ deposit
- **Platinum:** 100+ trades, 98%+ completion, £300s avg release, £10000+ deposit

### 3. Verification Badges
- **Email Verification:** Basic tier (already exists)
- **SMS Verification:** Mid tier (to be implemented)
- **Address Verification:** Premium tier (UI exists, backend needed)

### 4. Security Deposit System
- **Purpose:** Staking USDT/USDC to increase credibility
- **Tiers:** £500, £1000, £5000, £10000
- **Benefits:** Higher ranking, trust badge, auto-matching priority
- **Withdrawal:** Can withdraw deposit after 90 days with penalty

### 5. Public Merchant Profile Page
- **URL:** `/merchant/profile/:userId`
- **Displays:**
  - Rank badge (Bronze, Silver, Gold, Platinum)
  - All stats
  - Verification badges
  - Active ads/offers
  - Trading history summary
  - Deposit amount (if any)

### 6. Auto-Matching System
- **For Buyers:** Match with sellers based on:
  - Best price
  - Highest completion rate
  - Fastest release time
  - Highest rank
- **For Sellers:** Match with buyers based on:
  - Payment history
  - Completion rate
  - Avg pay time

---

## Implementation Status

### ✅ Completed:

1. **Backend Service** (`/app/backend/merchant_service.py`)
   - `MerchantService` class
   - `initialize_merchant_stats()` - Initialize stats for new trader
   - `update_stats_on_trade_complete()` - Update stats when trade completes
   - `calculate_merchant_rank()` - Calculate Bronze/Silver/Gold/Platinum rank
   - `get_merchant_profile()` - Get complete profile data
   - `_calculate_thirty_day_stats()` - Calculate 30-day metrics
   - `_update_user_stats()` - Update individual user stats

2. **Frontend Pages**
   - `MerchantProfile.js` - Public profile page (UI complete)
   - `AddressVerification.js` - Address verification form (UI complete)

3. **Database Collections** (schemas defined in merchant_service.py)
   - `merchant_stats` - All user statistics
   - `merchant_ranks` - Rank data (Bronze, Silver, Gold, Platinum)
   - `merchant_deposits` - Security deposit records

### ⏳ TODO:

#### Backend Tasks:

**1. API Endpoints** (server.py)
- [ ] `GET /api/merchant/profile/:userId` - Get merchant profile
- [ ] `POST /api/merchant/deposit/create` - Create security deposit
- [ ] `POST /api/merchant/deposit/withdraw` - Withdraw deposit
- [ ] `GET /api/merchant/deposit/status/:userId` - Check deposit status
- [ ] `POST /api/merchant/verification/address` - Submit address verification
- [ ] `GET /api/merchant/verification/status/:userId` - Check verification status
- [ ] `GET /api/merchant/leaderboard` - Get top merchants
- [ ] `GET /api/merchant/auto-match/buyer` - Auto-match buyer with seller
- [ ] `GET /api/merchant/auto-match/seller` - Auto-match seller with buyer

**2. Integration with P2P Trade Flow**
- [ ] Hook `update_stats_on_trade_complete()` into trade completion endpoint
- [ ] Hook `update_stats_on_trade_complete()` into escrow release endpoint
- [ ] Update trade detail pages to show merchant badges
- [ ] Update P2P marketplace to filter by rank

**3. Deposit System**
- [ ] Create deposit wallet (separate from trading wallet)
- [ ] Lock/unlock logic for deposits
- [ ] Penalty calculation for early withdrawal
- [ ] Admin dashboard to view deposits

**4. Verification System**
- [ ] Address verification document upload
- [ ] Admin review interface
- [ ] Approval/rejection logic
- [ ] Email notifications

#### Frontend Tasks:

**1. Profile Integration**
- [ ] Add "View Profile" button on P2P trade pages
- [ ] Show merchant badges in P2P listings
- [ ] Show rank badges in trade history
- [ ] Link usernames to profile pages

**2. Deposit Management Page**
- [ ] Create "Merchant Deposit" page
- [ ] Show current deposit status
- [ ] "Stake Deposit" button
- [ ] "Withdraw Deposit" button with warning
- [ ] Deposit tier selector (500/1000/5000/10000)

**3. Auto-Match UI**
- [ ] "Quick Match" button on P2P Express page
- [ ] Show matched merchant profile in modal
- [ ] "Accept Match" / "Find Another" buttons
- [ ] Match score display (why this merchant was matched)

**4. Leaderboard Page**
- [ ] Public leaderboard showing top merchants
- [ ] Filter by rank (All, Platinum, Gold, Silver, Bronze)
- [ ] Show top 100 traders
- [ ] Clickable to view profiles

---

## Database Schemas

### `merchant_stats` Collection
```json
{
  "user_id": "uuid",
  "all_time_trades": 0,
  "all_time_buy_count": 0,
  "all_time_sell_count": 0,
  "thirty_day_trades": 0,
  "thirty_day_completion_rate": 100.0,
  "average_pay_time_seconds": 0,
  "average_release_time_seconds": 0,
  "first_trade_date": "ISO date",
  "total_counterparties": 0,
  "counterparties_list": [],
  "successful_trades": 0,
  "cancelled_trades": 0,
  "disputed_trades": 0,
  "created_at": "ISO date",
  "updated_at": "ISO date"
}
```

### `merchant_ranks` Collection
```json
{
  "user_id": "uuid",
  "rank": "bronze|silver|gold|platinum|none",
  "total_trades": 0,
  "completion_rate": 0,
  "avg_release_time": 0,
  "deposit_amount": 0,
  "updated_at": "ISO date"
}
```

### `merchant_deposits` Collection
```json
{
  "deposit_id": "uuid",
  "user_id": "uuid",
  "amount": 0,
  "currency": "USDT|USDC",
  "status": "active|withdrawn|pending",
  "deposited_at": "ISO date",
  "can_withdraw_after": "ISO date",
  "withdrawn_at": null,
  "penalty_paid": 0
}
```

### `user_verifications` Collection (extend existing)
```json
{
  "user_id": "uuid",
  "email_verified": true,
  "sms_verified": false,
  "address_verified": false,
  "address_data": {
    "full_name": "",
    "street_address": "",
    "postcode": "",
    "country": "",
    "document_url": "",
    "submitted_at": "ISO date",
    "reviewed_by": "admin_id",
    "reviewed_at": "ISO date",
    "status": "pending|approved|rejected"
  }
}
```

---

## API Endpoint Specifications

### 1. Get Merchant Profile
```
GET /api/merchant/profile/:userId

Response:
{
  "success": true,
  "profile": {
    "user_id": "...",
    "username": "...",
    "stats": { ... },
    "rank": "gold",
    "deposit": { "amount": 5000, "currency": "USDT" },
    "verifications": {
      "email": true,
      "sms": false,
      "address": true
    },
    "active_ads": [ ... ],
    "account_age_days": 45
  }
}
```

### 2. Create Security Deposit
```
POST /api/merchant/deposit/create

Body:
{
  "user_id": "...",
  "amount": 5000,
  "currency": "USDT"
}

Response:
{
  "success": true,
  "deposit_id": "...",
  "locked_until": "2025-03-04T00:00:00Z"
}
```

### 3. Auto-Match Buyer with Seller
```
GET /api/merchant/auto-match/buyer?crypto=BTC&fiat_amount=5000&payment_method=bank_transfer

Response:
{
  "success": true,
  "matches": [
    {
      "merchant_id": "...",
      "rank": "platinum",
      "completion_rate": 99.5,
      "avg_release_time_seconds": 180,
      "price": 69500,
      "match_score": 98.5,
      "available_amount": 0.5
    }
  ]
}
```

---

## Integration Points

### P2P Trade Completion Hook
**File:** `server.py`
**Function:** Complete P2P trade endpoint (wherever crypto is released)

**Add:**
```python
# After successful trade completion
from merchant_service import MerchantService

merchant_service = MerchantService(db)
await merchant_service.update_stats_on_trade_complete(
    trade_id=trade_id,
    buyer_id=buyer_id,
    seller_id=seller_id
)
```

### P2P Marketplace Listings
**File:** `P2PMarketplace.js`

**Add:**
- Rank badge next to merchant name
- Completion rate percentage
- "View Profile" button
- Filter by rank dropdown

### Trade Detail Page
**File:** `P2PTradeDetailDemo.js`

**Add:**
- Show buyer/seller rank badges
- Show buyer/seller stats summary
- Link to full profiles

---

## Testing Checklist

### Backend Tests:
- [ ] Create merchant stats for new user
- [ ] Complete a trade, verify stats update
- [ ] Complete 10 trades, verify Bronze rank
- [ ] Complete 50 trades with 95% rate, verify Gold rank
- [ ] Create deposit, verify locked
- [ ] Try to withdraw deposit before 90 days, verify penalty
- [ ] Submit address verification, verify stored
- [ ] Auto-match buyer, verify best seller returned

### Frontend Tests:
- [ ] View merchant profile page
- [ ] All stats display correctly
- [ ] Rank badge shows correct tier
- [ ] Active ads display
- [ ] Verification badges show correctly
- [ ] Address verification form submits
- [ ] Deposit page shows current status
- [ ] Stake deposit flow works
- [ ] Auto-match button triggers match
- [ ] Leaderboard displays top merchants

---

## Timeline

**Phase 1:** Backend API endpoints (2 hours)
- Implement all 9 merchant API endpoints
- Test with curl/Postman

**Phase 2:** Integration (1 hour)
- Hook stats update into trade completion
- Test with real trade flow

**Phase 3:** Frontend integration (2 hours)
- Connect profile page to API
- Add badges to P2P marketplace
- Create deposit management page
- Add auto-match UI

**Phase 4:** Testing (1 hour)
- End-to-end testing
- Bug fixes

**Total:** 6 hours

---

## Success Criteria

✅ Merchant stats auto-update on every trade completion  
✅ Ranks automatically upgrade based on criteria  
✅ Public profile page shows all stats and badges  
✅ Security deposits can be staked and withdrawn  
✅ Address verification can be submitted  
✅ Auto-match returns best merchant for trade  
✅ Leaderboard shows top 100 merchants  
✅ All features work end-to-end without bugs

---

## Next Steps

1. 🔒 Complete portfolio/wallet fix (DONE)
2. ⏳ Implement merchant API endpoints (IN PROGRESS)
3. Integrate with P2P trade flow
4. Build frontend UI components
5. End-to-end testing
6. Deploy to production
