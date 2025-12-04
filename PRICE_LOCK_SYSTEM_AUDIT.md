# 🔍 Price Lock & Profit Protection System - AUDIT REPORT

**Date:** December 4, 2025  
**Status:** ⚠️ **PARTIALLY IMPLEMENTED**  
**Critical Finding:** Price lock protection is **INCONSISTENT** across different trading flows

---

## ⚠️ Executive Summary

**CRITICAL ISSUE FOUND:**

The platform does **NOT** have a unified price-lock and profit protection system. Different trading flows have different implementations:

- ✅ **OTC Trading**: Has full price locking with 15-minute expiry
- ❌ **Instant Sell**: NO price lock - uses LIVE price at execution
- ❌ **Express Buy**: NO price lock - recalculates at execution
- ❌ **P2P Auto-Match**: NO price lock - uses seller's current price
- ⚠️ **Trading Engine**: Has spread logic but NO quote locking

**RISK:** Admin can take losses if prices move between quote display and execution.

---

## 🔍 System-by-System Analysis

### 1️⃣ OTC Trading System ✅

**File:** `/app/backend/server.py`  
**Endpoints:** 
- `POST /api/otc/create-quote` (Lines 23234-23312)
- `POST /api/otc/execute` (Lines 23314-23450)

#### ✅ Price Lock Implementation:

**Quote Generation (Line 23278-23300):**
```python
# Create quote with LOCKED price
quote_id = str(uuid.uuid4())
quote_expires = datetime.now(timezone.utc) + timedelta(minutes=15)  # ✅ 15-minute expiry

quote = {
    "quote_id": quote_id,
    "user_id": request.user_id,
    "trade_type": request.trade_type,
    "crypto_currency": request.crypto_currency,
    "crypto_amount": crypto_amount,
    "crypto_price_gbp": crypto_price_gbp,  # ✅ LOCKED PRICE
    "fee_amount_gbp": fee_amount_gbp,
    "total_cost_gbp": total_cost_gbp,
    "status": "pending",
    "expires_at": quote_expires.isoformat(),  # ✅ EXPIRY TIME
    "created_at": datetime.now(timezone.utc).isoformat()
}

await db.otc_quotes.insert_one(quote)  # ✅ STORED IN DATABASE
```

**Settlement at Locked Price (Line 23333-23344):**
```python
# Check if quote expired
expires_at = datetime.fromisoformat(quote["expires_at"])
if datetime.now(timezone.utc) > expires_at:
    await db.otc_quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {"status": "expired"}}
    )
    raise HTTPException(status_code=400, detail="Quote has expired")  # ✅ EXPIRY ENFORCED

# Execute using LOCKED price from quote
total_cost = quote["total_cost_gbp"]  # ✅ Uses locked price, NOT live price
```

#### ✅ Verification:
- ✅ **Locked Quote Price**: Stored in `crypto_price_gbp` field
- ✅ **Settlement Uses Locked Price**: Line 23354 uses `quote["total_cost_gbp"]`
- ✅ **Spread Applied**: Calculated at quote generation
- ✅ **Quote Expiry**: 15 minutes (Line 23280)
- ✅ **Expiry Enforced**: Lines 23334-23340
- ✅ **Storage**: MongoDB `otc_quotes` collection

#### ⚠️ Issues:
- ⚠️ **No Negative Spread Check**: No code preventing negative spreads
- ⚠️ **No Loss Prevention**: If spread settings are misconfigured, admin can take loss

---

### 2️⃣ Instant Sell to Admin ❌

**File:** `/app/backend/server.py`  
**Endpoint:** `POST /api/instant-sell` (Lines 22995-23110)

#### ❌ NO Price Lock:

```python
async def instant_sell_to_admin(request: Dict):
    """Instant Sell to Admin - Auto-deduct 1% fee and apply -2.5% spread"""
    
    # Get live price AT EXECUTION TIME - NO LOCK
    live_prices = await get_cached_prices()  # ❌ LIVE PRICE
    crypto_price_usd = live_prices['crypto_prices'].get(crypto_currency, 0)
    
    # Convert to GBP
    fx_rates = live_prices['fx_rates']
    gbp_rate = fx_rates.get('GBP', 0.79)
    market_price_gbp = crypto_price_usd * gbp_rate  # ❌ CURRENT MARKET PRICE
    
    # Apply admin buy spread (markdown) - Admin buys LOWER than market
    spread_adjusted_price = market_price_gbp * (1 + admin_buy_spread_percent / 100)
    
    # Calculate gross GBP amount
    gross_gbp = crypto_amount * spread_adjusted_price  # ❌ Uses LIVE price
    
    # Deduct crypto from user
    await db.internal_balances.update_one(
        {"user_id": user_id, "currency": crypto_currency},
        {"$inc": {"balance": -crypto_amount}}
    )
    
    # Add net GBP to user
    await db.internal_balances.update_one(
        {"user_id": user_id, "currency": "GBP"},
        {"$inc": {"balance": net_gbp}},  # ❌ Payment based on LIVE price
        upsert=True
    )
```

#### ❌ Problems:
1. **No Quote Generation**: Price fetched at execution time
2. **No Price Lock**: Uses `get_cached_prices()` which is live
3. **No Expiry**: Executes immediately without time validation
4. **Race Condition Risk**: If price moves between frontend display and backend execution, user sees different price
5. **Admin Loss Risk**: If `admin_buy_spread_percent` is positive (misconfigured), admin buys HIGH

#### ⚠️ Spread Settings (Line 23011):
```python
admin_buy_spread_percent = settings.get("admin_buy_spread_percent", -2.5)
```

**Current Setting:** `-2.5%` (admin buys 2.5% below market)

**RISK:** If this is changed to positive value, admin LOSES money!

#### ❌ No Negative Spread Prevention:
```python
# NO CHECK LIKE THIS:
if admin_buy_spread_percent >= 0:
    raise ValueError("Admin buy spread must be negative!")
```

---

### 3️⃣ Express Buy (Admin Liquidity) ❌

**File:** `/app/backend/server.py`  
**Endpoint:** `POST /api/express-buy/execute` (Lines 11242-11550)

#### ❌ NO Price Lock:

```python
# Get LIVE price at execution
currency_doc = await db.currencies.find_one({"symbol": crypto_currency}, {"_id": 0})
crypto_price_gbp = currency_doc.get("gbp_price") or currency_doc.get("current_price", 0)

# If no price in currencies, try live prices as fallback
if crypto_price_gbp == 0:
    live_prices = await get_cached_prices()  # ❌ LIVE PRICE
    crypto_price_usd = live_prices['crypto_prices'].get(crypto_currency, 0)
    gbp_rate = fx_rates.get('GBP', 0.79)
    crypto_price_gbp = crypto_price_usd * gbp_rate  # ❌ CURRENT MARKET

# ⚠️ RECALCULATES crypto amount at LIVE price
crypto_amount = fiat_amount / crypto_price_gbp  # ❌ Price slippage possible
```

**Line 11286-11288:**
```python
# Recalculate crypto amount based on fiat amount and LIVE price
# This protects admin from price movements between quote and execution
crypto_amount = fiat_amount / crypto_price_gbp if crypto_price_gbp > 0 else 0
```

**Comment says it "protects admin"** but this is WRONG!

#### ❌ Why This is Wrong:

**Scenario:**
1. User sees quote: "1 BTC = £47,500 GBP"
2. User clicks "Buy for £50,000"
3. Expected: 1.0526 BTC
4. Price drops to £47,000 between display and execution
5. System recalculates: `50000 / 47000 = 1.0638 BTC`
6. **Admin sells MORE BTC than quoted**
7. **Admin loses money if they don't have enough margin**

#### ✅ Spread Applied (Line 11364-11370):
```python
express_fee_percent = 1.0
admin_sell_spread_percent = 3.0  # ✅ Admin sells 3% ABOVE market

# Apply spread
spread_adjusted_price_gbp = crypto_price_gbp * (1 + admin_sell_spread_percent / 100)

# Then apply express fee
price_with_fee = spread_adjusted_price_gbp * (1 + express_fee_percent / 100)
```

**3% spread SHOULD protect admin**, but only if:
- Price doesn't move more than 3% downward
- Spread is always positive (no validation)

#### ❌ No Loss Prevention:
```python
# NO CHECK LIKE THIS:
if admin_sell_spread_percent <= 0:
    raise ValueError("Admin must sell ABOVE market!")

if crypto_amount > expected_amount * 1.01:  # More than 1% slippage
    raise ValueError("Price moved too much, refresh quote!")
```

---

### 4️⃣ P2P Auto-Match ❌

**File:** `/app/backend/server.py`  
**Endpoint:** `POST /api/p2p/auto-match` (Lines 25557-25685)

#### ❌ NO Price Lock:

```python
# Finds best seller at CURRENT time
results = await db.p2p_listings.aggregate(pipeline).to_list(1)

if not results:
    raise HTTPException(status_code=404, detail="No sellers available")

best_match = results[0]

# Creates trade using seller's CURRENT price
trade = {
    "trade_id": trade_id,
    "crypto_amount": float(amount),
    "fiat_amount": float(amount) * best_match.get("price_fixed", 0),  # ❌ Current price
    "status": "pending_payment",
    "escrow_locked": True
}

await db.p2p_trades.insert_one(trade)
```

#### ❌ Problems:
1. **No Quote Step**: Directly creates trade
2. **Uses Seller's Current Price**: If seller changes price between match and payment, inconsistency
3. **No Admin Involvement**: This is P2P, so admin doesn't take loss, but seller might
4. **No Price Validation**: No check if price is reasonable

**NOTE:** This is P2P trading, so admin profit protection may not apply. However, user protection is still needed.

---

### 5️⃣ Trading Engine ⚠️

**File:** `/app/backend/core/trading_engine.py`  
**Class:** `TradingEngine` (Lines 25-83)

#### ✅ Spread Formulas Exist:

```python
BUY_SPREAD_PERCENT = 0.5   # Admin sells at market + 0.5%
SELL_SPREAD_PERCENT = 0.5  # Admin buys at market - 0.5%

def calculate_buy_price(self, mid_market_price: float) -> float:
    """User pays MORE than market (admin profit)"""
    buy_price = mid_market_price * (1 + BUY_SPREAD_PERCENT / 100)  # ✅ 0.5% markup
    return buy_price

def calculate_sell_price(self, mid_market_price: float) -> float:
    """User receives LESS than market (admin profit)"""
    sell_price = mid_market_price * (1 - SELL_SPREAD_PERCENT / 100)  # ✅ 0.5% markdown
    return sell_price
```

#### ❌ BUT NO Quote Locking:

- These functions calculate prices, but don't store them
- No quote generation endpoint in trading engine
- No expiry mechanism
- Spread percentages are hardcoded (not configurable)

---

## 📊 Summary Table

| System | Quote Lock | Locked Price Storage | Settlement Uses Lock | Spread Applied | Negative Spread Prevention | Quote Expiry | Status |
|--------|------------|---------------------|---------------------|----------------|---------------------------|--------------|--------|
| **OTC Trading** | ✅ Yes | ✅ `otc_quotes` collection | ✅ Yes | ✅ Yes | ❌ No | ✅ 15 min | ✅ GOOD |
| **Instant Sell** | ❌ No | ❌ None | ❌ Uses live price | ✅ Yes (-2.5%) | ❌ No | ❌ N/A | ❌ BAD |
| **Express Buy** | ❌ No | ❌ None | ❌ Recalculates | ✅ Yes (+3%) | ❌ No | ❌ N/A | ❌ BAD |
| **P2P Auto-Match** | ❌ No | ❌ None | ❌ Uses current | ⚠️ P2P price | ⚠️ N/A | ❌ N/A | ⚠️ RISKY |
| **Trading Engine** | ❌ No | ❌ None | ❌ N/A | ✅ Yes (0.5%) | ❌ No | ❌ N/A | ⚠️ INCOMPLETE |

---

## ❌ What's NOT Implemented

### 1. Unified Price Lock System

**Missing:**
- No centralized quote generation service
- No `quotes` collection for non-OTC trades
- No quote lock mechanism for instant sell/buy
- No expiry enforcement for most flows

**Required:**
```python
# MISSING: Centralized quote service
class QuoteService:
    async def generate_quote(
        self, 
        user_id: str, 
        trade_type: str,
        crypto: str, 
        amount: float
    ) -> Dict:
        """Generate locked quote with expiry"""
        market_price = await self.get_live_price(crypto)
        
        if trade_type == "buy":
            spread = ADMIN_SELL_SPREAD  # Admin sells HIGH
        else:
            spread = ADMIN_BUY_SPREAD  # Admin buys LOW
        
        # Ensure spread is correct direction
        if trade_type == "buy" and spread <= 0:
            raise ValueError("Admin sell spread must be positive!")
        if trade_type == "sell" and spread >= 0:
            raise ValueError("Admin buy spread must be negative!")
        
        locked_price = market_price * (1 + spread / 100)
        
        quote = {
            "quote_id": str(uuid.uuid4()),
            "user_id": user_id,
            "trade_type": trade_type,
            "crypto": crypto,
            "amount": amount,
            "market_price": market_price,
            "locked_price": locked_price,
            "spread_percent": spread,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "status": "pending"
        }
        
        await self.db.quotes.insert_one(quote)
        return quote
    
    async def execute_quote(self, quote_id: str) -> Dict:
        """Execute using LOCKED price"""
        quote = await self.db.quotes.find_one({"quote_id": quote_id})
        
        # Check expiry
        if datetime.now(timezone.utc) > datetime.fromisoformat(quote["expires_at"]):
            raise ValueError("Quote expired!")
        
        # Execute at LOCKED price
        locked_price = quote["locked_price"]  # NOT live price!
        # ... execute trade ...
```

### 2. Negative Spread Prevention

**Missing:**
- No validation that admin buy spread is negative
- No validation that admin sell spread is positive
- No validation at settings update time
- No validation at execution time

**Required:**
```python
# MISSING: Spread validation
def validate_spread_settings(settings: Dict):
    admin_buy_spread = settings.get("admin_buy_spread_percent")
    admin_sell_spread = settings.get("admin_sell_spread_percent")
    
    # Admin MUST buy below market (negative spread)
    if admin_buy_spread >= 0:
        raise ValueError(
            f"Admin buy spread MUST be negative (buying below market). "
            f"Got: {admin_buy_spread}%. Did you mean {-abs(admin_buy_spread)}%?"
        )
    
    # Admin MUST sell above market (positive spread)
    if admin_sell_spread <= 0:
        raise ValueError(
            f"Admin sell spread MUST be positive (selling above market). "
            f"Got: {admin_sell_spread}%. Did you mean {abs(admin_sell_spread)}%?"
        )
    
    # Minimum spread to cover fees and price volatility
    MIN_SAFE_SPREAD = 0.5  # 0.5%
    
    if abs(admin_buy_spread) < MIN_SAFE_SPREAD:
        raise ValueError(f"Admin buy spread too small. Minimum: {MIN_SAFE_SPREAD}%")
    
    if admin_sell_spread < MIN_SAFE_SPREAD:
        raise ValueError(f"Admin sell spread too small. Minimum: {MIN_SAFE_SPREAD}%")
```

### 3. Loss Prevention at Execution

**Missing:**
- No check if current price moved too much from quote
- No slippage tolerance limits
- No automatic quote rejection if unsafe

**Required:**
```python
# MISSING: Slippage protection
def validate_execution_safety(quote: Dict, current_market_price: float):
    locked_price = quote["locked_price"]
    trade_type = quote["trade_type"]
    
    # Calculate price movement
    price_change_percent = ((current_market_price - locked_price) / locked_price) * 100
    
    # For admin SELL (user buy): Price increase is bad for admin
    if trade_type == "buy" and price_change_percent > 2.0:
        raise ValueError(
            f"Market price increased {price_change_percent:.2f}% since quote. "
            f"Quote expired for safety. Please request new quote."
        )
    
    # For admin BUY (user sell): Price decrease is bad for admin
    if trade_type == "sell" and price_change_percent < -2.0:
        raise ValueError(
            f"Market price decreased {abs(price_change_percent):.2f}% since quote. "
            f"Quote expired for safety. Please request new quote."
        )
```

### 4. Same Logic for All Flows

**Missing:**
- Instant sell uses different logic than OTC
- Express buy uses different logic than instant sell
- P2P auto-match has no quote system
- No shared quote service

**Required:**
```python
# MISSING: Unified interface
class UnifiedTradingService:
    def __init__(self, db):
        self.quote_service = QuoteService(db)
    
    async def instant_sell(self, user_id: str, crypto: str, amount: float):
        # Step 1: Generate quote
        quote = await self.quote_service.generate_quote(
            user_id=user_id,
            trade_type="sell",
            crypto=crypto,
            amount=amount
        )
        
        # Step 2: Execute at locked price
        result = await self.quote_service.execute_quote(quote["quote_id"])
        return result
    
    async def express_buy(self, user_id: str, crypto: str, amount: float):
        # Step 1: Generate quote
        quote = await self.quote_service.generate_quote(
            user_id=user_id,
            trade_type="buy",
            crypto=crypto,
            amount=amount
        )
        
        # Step 2: Execute at locked price
        result = await self.quote_service.execute_quote(quote["quote_id"])
        return result
```

---

## ⚠️ Risk Assessment

### 🔴 HIGH RISK: Instant Sell

**Current Behavior:**
- Uses live price at execution
- No quote lock
- Admin loss possible if:
  - Spread settings misconfigured (positive instead of negative)
  - Price spikes between display and execution
  - High volatility periods

**Estimated Loss Exposure:** 1-5% per trade in volatile markets

### 🔴 HIGH RISK: Express Buy

**Current Behavior:**
- Recalculates crypto amount at execution
- Can give user MORE crypto than quoted
- Admin loss possible if:
  - Price drops between quote and execution
  - Spread < price movement
  - User intentionally delays execution

**Estimated Loss Exposure:** 1-3% per trade

### 🟡 LOW RISK: OTC Trading

**Current Behavior:**
- Full price lock
- 15-minute expiry
- Settlement at locked price

**Remaining Risk:**
- No negative spread validation
- Manual configuration errors possible

---

## ✅ Recommendations

### Priority 1 (URGENT):
1. **Add spread validation** to all settings endpoints
2. **Implement quote locking** for instant sell
3. **Implement quote locking** for express buy
4. **Remove recalculation** in express buy (use locked quote)

### Priority 2 (HIGH):
1. **Create unified quote service**
2. **Add slippage protection** at execution
3. **Implement quote expiry** for all flows (5 minutes)
4. **Add loss prevention checks** before settlement

### Priority 3 (MEDIUM):
1. **Consolidate spread settings** into one place
2. **Add monitoring** for actual spread profits
3. **Add alerts** if spread < threshold
4. **Add admin dashboard** showing quote accuracy

---

## 📝 Conclusion

**FINDING:** Price lock and profit protection is **INCONSISTENT**

**IMPLEMENTED:**
- ✅ OTC trading has full price lock
- ✅ Spread formulas exist
- ✅ Balance escrow works

**NOT IMPLEMENTED:**
- ❌ Unified quote system
- ❌ Price lock for instant sell
- ❌ Price lock for express buy
- ❌ Negative spread prevention
- ❌ Loss prevention at execution
- ❌ Same logic across all flows

**RECOMMENDATION:** Implement Priority 1 items IMMEDIATELY to prevent losses.

---

**Audit Date:** December 4, 2025  
**Auditor:** CoinHubX Master Engineer  
**Status:** ⚠️ REQUIRES IMMEDIATE ACTION  
