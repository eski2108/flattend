# ⚠️ CoinHubX Known Issues & Technical Debt

**Last Updated:** November 2024  
**Purpose:** Complete list of all known bugs, issues, and technical debt

---

## 📋 Table of Contents

1. [Critical Money-Flow Bugs (P0)](#critical-money-flow-bugs-p0)
2. [High Priority Issues (P1)](#high-priority-issues-p1)
3. [Medium Priority (P2)](#medium-priority-p2)
4. [Technical Debt (P3)](#technical-debt-p3)
5. [Frontend Issues](#frontend-issues)
6. [Backend Issues](#backend-issues)
7. [Database Issues](#database-issues)
8. [Integration Issues](#integration-issues)

---

## 🔴 Critical Money-Flow Bugs (P0)

### 🚨 BUG 1: NOWPayments IPN Webhook Signature Validation Broken

**Status:** ❌ **CRITICAL - NOT WORKING**

**Impact:**
- 46+ deposits totaling significant value are stuck at "waiting" status
- User funds sent but never credited to wallets
- Users cannot access their deposited crypto
- Platform liability increasing with each failed deposit

**Description:**
The IPN (Instant Payment Notification) webhook signature verification always fails, causing all deposit confirmations to be rejected.

**Location:** `/app/backend/nowpayments_integration.py` → `verify_ipn_signature()`

**Root Cause:**
The HMAC SHA512 signature calculation doesn't match NOWPayments' expected format. The function always returns `False` when comparing signatures.

**Code:**
```python
# Current implementation (BROKEN)
def verify_ipn_signature(self, request_data: bytes, signature: str) -> bool:
    calculated_sig = hmac.new(
        self.ipn_secret.encode('utf-8'),
        request_data,
        hashlib.sha512
    ).hexdigest()
    
    return hmac.compare_digest(calculated_sig, signature)  # Always False
```

**Symptoms:**
- Backend logs show: `❌ IPN signature validation FAILED`
- Webhook endpoint returns 401 Unauthorized
- NOWPayments dashboard shows failed IPN attempts
- Database shows deposits stuck: `status: "waiting"`, `credited_at: null`

**Debugging Steps:**
1. Log raw request body, received signature, calculated signature
2. Contact NOWPayments support with debug logs
3. Test with NOWPayments sandbox environment
4. Review NOWPayments documentation for exact HMAC format

**Temporary Workaround (INSECURE):**
```python
# ONLY FOR TESTING - DO NOT USE IN PRODUCTION
if os.getenv('SKIP_IPN_SIGNATURE', 'false') == 'true':
    logger.warning("⚠️ SKIPPING SIGNATURE VERIFICATION")
    return True
```

**Fix Priority:** P0 - IMMEDIATE

**Blocked By:** Need to understand exact NOWPayments signature format

**Related Documentation:** `NOWPAYMENTS.md`, `FLOWS.md`

---

### 🚨 BUG 2: P2P Escrow Release Logic Broken

**Status:** ❌ **CRITICAL - NOT WORKING**

**Impact:**
- P2P trades cannot complete successfully
- Buyers pay fiat but never receive crypto
- Sellers' crypto stuck in escrow indefinitely
- Platform reputation at risk

**Description:**
When a seller attempts to release crypto from escrow after receiving payment, the release function fails to transfer funds to the buyer.

**Location:** `/app/backend/server.py` → `p2p_release_crypto_with_wallet()`

**Root Cause:**
Multiple issues:
1. Escrow unlock logic not properly implemented
2. Test data has invalid seller wallet references
3. Missing error handling for failed transfers

**Code Path:**
```python
# What SHOULD happen:
1. Release from seller's locked balance
   wallet_service.release_locked_balance(seller_id, crypto, amount)

2. Credit buyer (minus fee)
   wallet_service.credit(buyer_id, crypto, amount_after_fee)

3. Collect platform fee
   internal_balances.update({currency: crypto}, {$inc: {balance: fee}})

# What IS happening:
- Step 1 fails silently
- Buyer never gets credited
- Fee collected anyway
```

**Symptoms:**
- Seller clicks "Release Crypto"
- Backend returns success
- But buyer's balance never increases
- Seller's locked balance never decreases
- Database: `trade.status = "completed"` but funds unmoved

**Test Case That Fails:**
```python
# Create P2P trade
trade = create_trade(
    seller_id="p2p_demo_seller@demo.com",
    buyer_id="p2p_demo_buyer@demo.com",
    amount=0.01 BTC
)

# Seller releases
release_result = release_escrow(trade_id)
# Returns: {success: true}

# Check buyer wallet
buyer_wallet = get_balance(buyer_id, "BTC")
# Expected: 0.0097 BTC (after 3% fee)
# Actual: 0.0 BTC  <-- BUG
```

**Debugging Checklist:**
1. Check if seller wallet exists in database
2. Verify locked balance is actually locked
3. Test wallet_service.release_locked_balance() in isolation
4. Add detailed logging to each step
5. Check for exceptions being swallowed

**Fix Priority:** P0 - IMMEDIATE

**Blocked By:** Need to understand why release_locked_balance fails

**Related Documentation:** `FLOWS.md` (P2P Escrow Flow)

---

### 🚨 BUG 3: P2P Fees Not Saved Per Transaction

**Status:** ❌ **NOT IMPLEMENTED**

**Impact:**
- No audit trail for P2P transaction fees
- Cannot calculate per-trade profitability
- Revenue attribution unclear
- Compliance/accounting issues

**Description:**
When P2P trades complete, the 3% fee is deducted and added to `internal_balances`, but the `fee_amount` field in the trade document is never populated.

**Location:** `/app/backend/server.py` → P2P trade completion logic

**Current Code:**
```python
# Fee is calculated
fee_amount = crypto_amount * 0.03

# Fee is collected
await db.internal_balances.update_one(
    {"currency": crypto_currency},
    {"$inc": {"balance": fee_amount}}
)

# But trade document not updated ⚠️ BUG
await db.p2p_trades.update_one(
    {"trade_id": trade_id},
    {"$set": {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc),
        "fee_amount": 0,  # <-- Should be fee_amount
        "fee_currency": crypto_currency
    }}
)
```

**Impact:**
```javascript
// Query per-trade profitability - FAILS
db.p2p_trades.aggregate([
  {$match: {status: "completed"}},
  {$group: {_id: "$crypto_currency", total_fees: {$sum: "$fee_amount"}}}
])
// Result: total_fees = 0 for all  <-- WRONG
```

**Fix Required:**
```python
await db.p2p_trades.update_one(
    {"trade_id": trade_id},
    {"$set": {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc),
        "fee_amount": fee_amount,         # ✅ FIX
        "fee_currency": crypto_currency
    }}
)
```

**Fix Priority:** P0 - HIGH

**Related Issues:** BUG 4 (Swap fees), BUG 5 (Express Buy profit)

---

### 🚨 BUG 4: Swap Fees Not Saved Per Transaction

**Status:** ❌ **NOT IMPLEMENTED**

**Same issue as BUG 3, but for swap transactions.**

**Location:** `/app/backend/server.py` → `/api/swap/execute`

**Current Code:**
```python
# Fee calculated
fee_amount = from_amount * 0.03

# Fee collected
await db.internal_balances.update_one(...)

# But NOT saved on swap document
await db.swap_transactions.insert_one({
    "swap_id": swap_id,
    "fee_amount": 0,  # <-- BUG
    "fee_currency": from_currency,
    ...
})
```

**Fix Required:**
Change `"fee_amount": 0` to `"fee_amount": fee_amount`

**Fix Priority:** P0 - HIGH

---

### 🚨 BUG 5: Express Buy Admin Profit Not Saved Per Transaction

**Status:** ❌ **NOT IMPLEMENTED**

**Same issue, but for Express Buy transactions.**

**Location:** `/app/backend/server.py` → `/api/express-buy/execute`

**Current Code:**
```python
# Admin profit calculated
admin_profit = fiat_amount * 0.03

# Profit collected
await db.internal_balances.update_one(...)

# But NOT saved on transaction document
await db.express_buy_transactions.insert_one({
    "transaction_id": transaction_id,
    "admin_profit": 0,  # <-- BUG
    ...
})
```

**Fix Required:**
Change `"admin_profit": 0` to `"admin_profit": admin_profit`

**Fix Priority:** P0 - HIGH

---

## 🟠 High Priority Issues (P1)

### 🐛 BUG 6: Pricing System Unreliable

**Status:** 🟡 **UNSTABLE**

**Impact:**
- Swap/Convert feature frequently fails
- Users see "Pricing service unavailable" errors
- Incorrect conversion rates occasionally
- User experience degraded

**Description:**
The platform has TWO conflicting pricing systems that both hit external APIs without proper caching or fallback:

1. **`price_service.py`** - Uses Binance API + ExchangeRate-API
2. **`live_pricing.py`** - Uses different API (CoinGecko?)

**Problems:**
- API rate limits frequently exceeded
- No caching strategy
- No fallback when APIs fail
- Two systems give different prices
- No error recovery

**Location:** 
- `/app/backend/price_service.py`
- `/app/backend/live_pricing.py`

**Symptoms:**
```javascript
// User tries to swap
POST /api/swap/execute
{from: "ETH", amount: 0.5, to: "BTC"}

// Response:
{
  "detail": "Pricing service temporarily unavailable"
}
```

**Error Logs:**
```
❌ Rate limit exceeded for CoinGecko API
❌ Failed to fetch Binance prices: 429 Too Many Requests
```

**Fix Required:**
1. **Unify pricing systems** - Merge into single service
2. **Add caching** - Cache prices for 10-30 seconds
3. **Add fallback** - Use stale cache if API fails
4. **Add multiple API sources** - CoinGecko, Binance, CoinMarketCap
5. **Add circuit breaker** - Stop hitting failed APIs temporarily

**Proposed Architecture:**
```python
class UnifiedPriceService:
    def __init__(self):
        self.cache = {}  # {"BTC_USD": {price: 50000, timestamp: ...}}
        self.cache_ttl = 30  # seconds
        self.apis = [BinanceAPI(), CoinGeckoAPI(), CoinMarketCapAPI()]
    
    async def get_price(self, from_currency, to_currency):
        # 1. Check cache (fresh)
        cached = self._get_from_cache(from_currency, to_currency)
        if cached and not self._is_stale(cached):
            return cached['price']
        
        # 2. Try APIs (with fallback)
        for api in self.apis:
            try:
                price = await api.get_price(from_currency, to_currency)
                self._update_cache(from_currency, to_currency, price)
                return price
            except:
                continue
        
        # 3. Use stale cache (if available)
        if cached:
            logger.warning("Using stale price data")
            return cached['price']
        
        # 4. Fail
        raise Exception("All pricing sources failed")
```

**Fix Priority:** P1 - HIGH

**Effort:** 4-6 hours

---

### 🐛 BUG 7: Admin Liquidity Offers Empty

**Status:** 🟠 **DATA ISSUE**

**Impact:**
- Express Buy feature not working
- No instant buy offers available
- Users cannot buy crypto instantly

**Description:**
The `admin_liquidity_wallets` collection has balances, but no corresponding P2P ads are created for Express Buy.

**Location:** Admin liquidity ad creation logic

**Current State:**
```javascript
// Admin has liquidity
db.admin_liquidity_wallets.find()
// Result:
[
  {currency: "BTC", balance: 10.0, reserved: 0},
  {currency: "ETH", balance: 100.0, reserved: 0}
]

// But no Express Buy offers
db.p2p_ads.find({seller_id: "ADMIN_LIQUIDITY"})
// Result: []
```

**Fix Required:**
Create P2P ads from admin liquidity:

```python
# Admin script to recreate offers
async def recreate_admin_offers():
    liquidity = await db.admin_liquidity_wallets.find().to_list(100)
    
    for wallet in liquidity:
        if wallet["balance"] > 0:
            # Create ad for this currency
            await db.p2p_ads.insert_one({
                "ad_id": str(uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "is_admin_liquidity": True,
                "crypto_currency": wallet["currency"],
                "crypto_amount": wallet["balance"],
                "fiat_currency": "GBP",
                "price_per_unit": market_price * 1.03,  # 3% markup
                "payment_methods": ["wallet_balance"],
                "status": "active",
                "created_at": datetime.now(timezone.utc)
            })
```

**Fix Priority:** P1 - HIGH

**Effort:** 1 hour

---

## 🟡 Medium Priority (P2)

### 🐛 BUG 8: Inconsistent Database Architecture

**Status:** 🟡 **TECHNICAL DEBT**

**Impact:**
- Confusing for developers
- Duplicate data structures
- Maintenance burden
- Potential bugs from using wrong collection

**Description:**
There are multiple collections serving similar purposes:

1. **`wallets`** - User wallets + one `platform_admin` wallet
2. **`admin_liquidity_wallets`** - Separate admin liquidity (should be in `wallets`)
3. **`internal_balances`** - Platform fees (should be in `wallets`)

**Proposed Consolidation:**

Merge all into `wallets` collection with user ID tags:

```javascript
// User wallets
{user_id: "user123", currency: "BTC", available: 0.5, locked: 0.1}

// Admin liquidity
{user_id: "ADMIN_LIQUIDITY", currency: "BTC", available: 10.0, locked: 2.0}

// Platform fees
{user_id: "PLATFORM_FEES", currency: "BTC", available: 0.05, locked: 0}
```

**Benefits:**
- Single wallet service for all operations
- Simpler queries
- Easier auditing
- Less confusion

**Migration Steps:**
1. Create admin user IDs in `wallets`
2. Copy data from old collections
3. Update all code references
4. Test thoroughly
5. Delete old collections

**Fix Priority:** P2 - MEDIUM

**Effort:** 6-8 hours

---

### 🐛 BUG 9: Referral UI Missing

**Status:** 🟡 **NOT IMPLEMENTED**

**Impact:**
- Users cannot see their referral earnings
- Referral system exists but hidden
- Missing revenue opportunity

**Description:**
The referral system is fully implemented in the backend:
- Commissions are paid (20% standard, 50% golden)
- Data is stored in `referrals` collection
- But there's no frontend UI to display it

**Backend Working:**
```javascript
db.referrals.findOne({user_id: "user123"})
// Result:
{
  user_id: "user123",
  referral_code: "ABC123",
  total_referrals: 15,
  total_earnings: {BTC: 0.001, ETH: 0.05},
  tier: "standard"
}
```

**Frontend Missing:**
No page exists to show:
- Referral link
- Total referrals
- Earnings breakdown
- Commission rate

**Fix Required:**
Create `/app/frontend/src/pages/ReferralDashboard.js`:

```javascript
function ReferralDashboard() {
  return (
    <div>
      <h1>Your Referral Program</h1>
      
      {/* Referral Link */}
      <div>
        <input value={referralLink} readOnly />
        <button onClick={copyLink}>Copy</button>
      </div>
      
      {/* Stats */}
      <div>
        <StatCard title="Total Referrals" value={15} />
        <StatCard title="Active Referrals" value={12} />
        <StatCard title="Commission Rate" value="20%" />
      </div>
      
      {/* Earnings */}
      <div>
        <h2>Your Earnings</h2>
        {earnings.map(e => (
          <div key={e.currency}>
            {e.currency}: {e.amount}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Fix Priority:** P2 - MEDIUM

**Effort:** 2-3 hours

---

## 🟢 Technical Debt (P3)

### 📝 DEBT 1: Large Monolithic server.py

**Status:** 🟢 **REFACTOR NEEDED**

**Description:**
The main `server.py` file is 12,000+ lines with all business logic.

**Current Structure:**
```
/app/backend/
├── server.py (12,000 lines) ⚠️
├── wallet_service.py
├── nowpayments_integration.py
└── price_service.py
```

**Proposed Structure:**
```
/app/backend/
├── server.py (200 lines - FastAPI app only)
├── routes/
│   ├── auth.py
│   ├── wallets.py
│   ├── p2p.py
│   ├── swaps.py
│   ├── express_buy.py
│   └── admin.py
├── services/
│   ├── wallet_service.py
│   ├── nowpayments_service.py
│   ├── price_service.py
│   ├── p2p_service.py
│   └── swap_service.py
├── models/
│   ├── user.py
│   ├── wallet.py
│   ├── trade.py
│   └── transaction.py
└── tests/
    ├── test_wallets.py
    ├── test_p2p.py
    └── test_swaps.py
```

**Benefits:**
- Easier to navigate
- Better separation of concerns
- Easier testing
- Multiple developers can work simultaneously

**Fix Priority:** P3 - LOW (works fine, just messy)

**Effort:** 8-12 hours

---

### 📝 DEBT 2: No Admin CMS

**Status:** 🟢 **MISSING FEATURE**

**Description:**
Admin operations require direct database access or API calls. Need a proper CMS.

**Currently Missing:**
- Fee configuration UI
- User management UI
- Manual wallet adjustments UI
- Withdrawal approval UI (exists but basic)
- System health dashboard

**Fix Priority:** P3 - FUTURE

---

### 📝 DEBT 3: No Automated Tests

**Status:** 🟢 **NO TESTS**

**Impact:**
- High risk of regressions
- Changes require manual testing
- Bugs caught by users, not tests

**Fix Required:**
Create test suite:

```
/app/backend/tests/
├── test_wallet_service.py
├── test_p2p_flow.py
├── test_swap_flow.py
├── test_nowpayments.py
└── test_admin_revenue.py
```

**Fix Priority:** P3 - MEDIUM-LONG TERM

---

## 🎨 Frontend Issues

### Minor UI Bugs

1. **Toast Notification Library Inconsistency**
   - Some pages use `sonner`
   - Some use `react-hot-toast`
   - Should standardize on one

2. **Button Animation Consistency**
   - Some buttons have glow effect
   - Some don't
   - Should apply `premiumButtons.css` everywhere

3. **Responsive Design Issues**
   - Some pages not mobile-optimized
   - Tables overflow on small screens

---

## 🔧 Backend Issues

### Performance

1. **No Database Indexing**
   - Queries on `user_id`, `payment_id`, `trade_id` should be indexed
   - Current: Sequential scans on large collections

2. **No Query Caching**
   - Frequently accessed data (prices, user profiles) not cached
   - Redis cache would improve performance

---

## 💾 Database Issues

### Data Quality

1. **Test Data Mixed With Real Data**
   - `p2p_demo_seller@demo.com` in production database
   - Should be in separate test database

2. **No Data Validation**
   - Negative balances possible
   - Invalid email formats accepted
   - Should add Pydantic validation

3. **No Soft Deletes**
   - Users/trades deleted permanently
   - Should add `deleted_at` field

---

## 🔌 Integration Issues

### NOWPayments

1. **No Retry Logic**
   - Failed webhook not retried
   - Should implement exponential backoff

2. **No Refund Handling**
   - Overpayments not handled
   - Underpayments not handled

### Pricing APIs

1. **No Rate Limit Handling**
   - Requests fail when limit hit
   - Should implement backoff

2. **Single Point of Failure**
   - If Binance API down, all pricing fails
   - Need multiple fallback sources

---

## 📊 Priority Summary

### P0 - Fix This Week
- ❌ NOWPayments IPN webhook
- ❌ P2P escrow release
- ❌ Fee tracking (P2P, Swaps, Express Buy)

### P1 - Fix This Month
- 🟠 Pricing system unification
- 🟠 Admin liquidity offers

### P2 - Fix This Quarter
- 🟡 Database architecture consolidation
- 🟡 Referral UI

### P3 - Backlog
- 🟢 Code refactoring
- 🟢 Admin CMS
- 🟢 Automated tests

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - System overview
- **FLOWS.md** - Money flow diagrams
- **NOWPAYMENTS.md** - Integration guide
- **API_ENDPOINTS.md** - API reference

---

**END OF KNOWN_ISSUES.MD**