# P2P EXPRESS - COMPLETE FLOW DOCUMENTATION

## OVERVIEW

P2P Express is an **instant buy/sell** feature that allows users to purchase crypto directly from admin liquidity at a locked price. This is **COMPLETELY SEPARATE** from P2P marketplace trading.

---

## FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER OPENS P2P EXPRESS                       │
│                         /p2p-express page                            │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: LIQUIDITY CHECK                                            │
│  POST /api/p2p/express/check-liquidity                              │
│  { crypto: "BTC", crypto_amount: 0.001 }                            │
│                                                                      │
│  Backend checks: db.admin_liquidity.findOne({                       │
│    currency: "BTC",                                                 │
│    amount_available: { $gte: 0.001 },                               │
│    status: "active"                                                 │
│  })                                                                  │
│                                                                      │
│  Returns:                                                            │
│  ├─ has_liquidity: true  → "Instant Delivery" label                │
│  └─ has_liquidity: false → "Express Seller (2-5 min)" label        │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: USER ENTERS AMOUNT                                         │
│  Frontend calculates preview:                                        │
│                                                                      │
│  expressFeePct = 2.5%                                               │
│  baseRate = livePrice.price_gbp (e.g., £69,000)                     │
│  cryptoFee = cryptoAmount * (2.5 / 100)                             │
│  fiatValue = cryptoAmount * baseRate                                │
│  fiatFee = fiatValue * (2.5 / 100)                                  │
│  netFiat = fiatValue - fiatFee                                      │
│                                                                      │
│  Shows: "You get X BTC for £Y (after 2.5% fee)"                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: USER CLICKS "BUY NOW"                                      │
│  POST /api/admin-liquidity/quote                                    │
│  {                                                                   │
│    user_id: "aby-925330f1",                                         │
│    type: "buy",                                                      │
│    crypto: "BTC",                                                    │
│    amount: 0.001                                                     │
│  }                                                                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: AdminLiquidityQuoteService.generate_quote()               │
│                                                                      │
│  1. Get LIVE market price from pricing cache                        │
│     market_price_gbp = await _get_live_market_price("BTC")          │
│     Example: £69,000                                                 │
│                                                                      │
│  2. Get spread settings from db.monetization_settings               │
│     admin_sell_spread_percent = 3.0%  (admin sells ABOVE market)    │
│                                                                      │
│  3. VALIDATE SPREAD (safety check)                                  │
│     if spread_percent <= 0:                                         │
│         REJECT - "Admin MUST sell ABOVE market"                     │
│     if spread_percent < 0.5%:                                       │
│         REJECT - "Spread too small"                                 │
│                                                                      │
│  4. Calculate LOCKED PRICE                                          │
│     locked_price = market_price * (1 + spread_percent / 100)        │
│     locked_price = £69,000 * 1.03 = £71,070                         │
│                                                                      │
│  5. Calculate total cost                                            │
│     base_cost = crypto_amount * locked_price                        │
│     fee_amount = base_cost * (fee_percent / 100)                    │
│     total_cost = base_cost + fee_amount                             │
│                                                                      │
│  6. Store quote in db.admin_liquidity_quotes                        │
│     {                                                                │
│       quote_id: "uuid",                                             │
│       user_id: "aby-925330f1",                                      │
│       trade_type: "buy",                                            │
│       crypto_currency: "BTC",                                       │
│       crypto_amount: 0.001,                                         │
│       market_price_at_quote: 69000,                                 │
│       locked_price: 71070,        ← THIS IS LOCKED                  │
│       spread_percent: 3.0,                                          │
│       total_cost: 73.20,                                            │
│       status: "pending",                                            │
│       expires_at: "now + 5 minutes"                                 │
│     }                                                                │
│                                                                      │
│  Returns: { success: true, quote: {...}, expires_at: "..." }        │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: SHOWS LOCKED PRICE QUOTE MODAL                           │
│                                                                      │
│  ┌──────────────────────────────────────┐                           │
│  │      🔒 LOCKED PRICE QUOTE           │                           │
│  │                                       │                           │
│  │  You're Buying: 0.001 BTC            │                           │
│  │  Locked Price: £71,070               │                           │
│  │  Market Price: £69,000 (3% spread)   │                           │
│  │  Total Cost: £73.20                  │                           │
│  │                                       │                           │
│  │  Quote expires in: 4:58              │                           │
│  │                                       │                           │
│  │  [Cancel]  [Confirm Purchase]        │                           │
│  └──────────────────────────────────────┘                           │
│                                                                      │
│  5-minute countdown timer running                                    │
│  If expires → modal closes, "Quote expired" toast                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: USER CLICKS "CONFIRM PURCHASE"                             │
│  POST /api/admin-liquidity/execute                                  │
│  {                                                                   │
│    user_id: "aby-925330f1",                                         │
│    quote_id: "uuid-from-step-3"                                     │
│  }                                                                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: AdminLiquidityQuoteService.execute_quote()                │
│                                                                      │
│  1. Fetch quote from db.admin_liquidity_quotes                      │
│                                                                      │
│  2. VALIDATE:                                                        │
│     ├─ Quote exists?                                                │
│     ├─ User owns quote?                                             │
│     ├─ Not expired? (check expires_at)                              │
│     └─ Status == "pending"?                                         │
│                                                                      │
│  3. Get LOCKED values (NOT live price!)                             │
│     locked_price = quote["locked_price"]  ← £71,070                 │
│     crypto_amount = quote["crypto_amount"]                          │
│     total_cost = quote["total_cost"]                                │
│                                                                      │
│  4. Execute BUY (_execute_buy):                                      │
│     a. Check user GBP balance >= total_cost                         │
│     b. Check admin_liquidity_wallets has enough crypto              │
│     c. DEDUCT GBP from user: internal_balances.GBP -= total_cost    │
│     d. CREDIT crypto to user: internal_balances.BTC += crypto_amount│
│     e. DEDUCT crypto from admin: admin_liquidity_wallets.BTC -= amt │
│     f. CREDIT GBP to admin revenue                                  │
│                                                                      │
│  5. Mark quote as executed                                          │
│     status: "executed", executed_at: now()                          │
│                                                                      │
│  6. Process referral commission (if applicable)                     │
│                                                                      │
│  Returns: { success: true, message: "Trade executed at locked price"}│
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: SUCCESS STATE                                            │
│                                                                      │
│  ✅ Bought 0.001 BTC!                                               │
│  Toast: "Trade executed at locked price"                            │
│  User's wallet updated with new crypto                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## WHAT HAPPENS IF NO ADMIN LIQUIDITY?

```
┌─────────────────────────────────────────────────────────────────────┐
│  SCENARIO: Admin liquidity wallet has 0 BTC                         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Liquidity check returns:                                   │
│  { has_liquidity: false, delivery_type: "express_seller" }          │
│                                                                      │
│  Frontend shows: "Express Seller (2-5 min)" instead of "Instant"    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Quote generation STILL WORKS                               │
│                                                                      │
│  The quote is generated regardless of liquidity check.              │
│  Quote system doesn't re-check liquidity.                           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Execute FAILS                                              │
│                                                                      │
│  _execute_buy() checks:                                              │
│  admin_wallet = await db.admin_liquidity_wallets.findOne(...)       │
│  if admin_wallet.available < crypto_amount:                         │
│      raise HTTPException(                                            │
│          status_code=400,                                            │
│          detail="Insufficient admin liquidity for BTC"              │
│      )                                                               │
│                                                                      │
│  User sees: "Insufficient admin liquidity for BTC"                  │
└─────────────────────────────────────────────────────────────────────┘
```

### DOES IT GO TO MARKETPLACE?

**NO.** P2P Express does NOT fall back to the P2P marketplace.

They are completely separate systems:

| Feature | P2P Express | P2P Marketplace |
|---------|-------------|------------------|
| Source | Admin liquidity | User-created ads |
| Price | Locked for 5 min | Set by ad creator |
| Delivery | Instant (if liquidity) | Escrow-based |
| Endpoint | `/api/admin-liquidity/*` | `/api/p2p/offers` |
| Collection | `admin_liquidity_quotes` | `p2p_ads` |

---

## PROFIT MECHANISM

### When User BUYS Crypto (Admin Sells)

```python
market_price = £69,000
spread_percent = 3.0%  # Admin sells ABOVE market

locked_price = market_price * (1 + spread_percent / 100)
locked_price = £69,000 * 1.03 = £71,070

# For 0.001 BTC:
user_pays = 0.001 * £71,070 = £71.07
market_value = 0.001 * £69,000 = £69.00
platform_profit = £71.07 - £69.00 = £2.07 (3%)
```

### When User SELLS Crypto (Admin Buys)

```python
market_price = £69,000
spread_percent = -2.5%  # Admin buys BELOW market

locked_price = market_price * (1 + spread_percent / 100)
locked_price = £69,000 * 0.975 = £67,275

# For 0.001 BTC:
user_receives = 0.001 * £67,275 = £67.28
market_value = 0.001 * £69,000 = £69.00
platform_profit = £69.00 - £67.28 = £1.72 (2.5%)
```

---

## DATABASE COLLECTIONS

### admin_liquidity_quotes
```javascript
{
  quote_id: "uuid",
  user_id: "aby-925330f1",
  trade_type: "buy",
  crypto_currency: "BTC",
  crypto_amount: 0.001,
  market_price_at_quote: 69000,
  locked_price: 71070,           // THIS IS NEVER CHANGED
  spread_percent: 3.0,
  total_cost: 73.20,
  fee_amount: 2.13,
  fee_percent: 3.0,
  status: "pending" | "executed" | "expired",
  created_at: "2025-12-23T16:00:00Z",
  expires_at: "2025-12-23T16:05:00Z",
  executed_at: "2025-12-23T16:02:30Z"  // if executed
}
```

### admin_liquidity_wallets
```javascript
{
  currency: "BTC",
  available: 10.5,           // Available for instant delivery
  locked: 0.5,               // Locked in pending orders
  total: 11.0
}
```

### monetization_settings
```javascript
{
  setting_id: "default_monetization",
  admin_sell_spread_percent: 3.0,    // When admin SELLS to user (user buys)
  admin_buy_spread_percent: -2.5,    // When admin BUYS from user (user sells)
  buyer_express_fee_percent: 1.0,
  instant_sell_fee_percent: 1.0
}
```

---

## API ENDPOINTS

### 1. Check Liquidity
```
POST /api/p2p/express/check-liquidity

Request:
{ "crypto": "BTC", "crypto_amount": 0.001 }

Response:
{
  "success": true,
  "has_liquidity": true,
  "delivery_type": "instant"  // or "express_seller"
}
```

### 2. Generate Quote
```
POST /api/admin-liquidity/quote

Request:
{
  "user_id": "aby-925330f1",
  "type": "buy",
  "crypto": "BTC",
  "amount": 0.001
}

Response:
{
  "success": true,
  "quote": {
    "quote_id": "uuid",
    "locked_price": 71070,
    "market_price_at_quote": 69000,
    "spread_percent": 3.0,
    "total_cost": 73.20,
    "expires_at": "2025-12-23T16:05:00Z"
  },
  "valid_for_seconds": 300
}
```

### 3. Execute Quote
```
POST /api/admin-liquidity/execute

Request:
{
  "user_id": "aby-925330f1",
  "quote_id": "uuid"
}

Response:
{
  "success": true,
  "message": "Trade executed at locked price",
  "locked_price": 71070,
  "crypto_amount": 0.001,
  "crypto_currency": "BTC"
}
```

---

## SAFETY VALIDATIONS

1. **Spread validation** - Rejects if spread would cause loss:
   - Admin sell spread MUST be positive (sells above market)
   - Admin buy spread MUST be negative (buys below market)
   - Minimum spread: 0.5%

2. **Quote expiry** - 5-minute lock prevents price manipulation

3. **Balance checks** - Verifies user GBP and admin crypto before execution

4. **Ownership check** - User can only execute their own quotes

5. **Status check** - Quote must be "pending" to execute

---

## SUMMARY

| Step | Action | Endpoint |
|------|--------|----------|
| 1 | Check if admin has liquidity | `POST /api/p2p/express/check-liquidity` |
| 2 | User enters amount | Frontend calculation |
| 3 | Generate locked quote | `POST /api/admin-liquidity/quote` |
| 4 | Execute at locked price | `POST /api/admin-liquidity/execute` |

**Key Point:** P2P Express NEVER falls back to the marketplace. If admin liquidity is insufficient, the execute step fails with an error.
