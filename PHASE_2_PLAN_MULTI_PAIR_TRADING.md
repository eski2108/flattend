# 📋 PHASE 2 PLAN: Multi-Pair Trading Support

**Status:** READY TO IMPLEMENT  
**Priority:** P0  
**Estimated Time:** 2-3 hours

---

## 🎯 Objective

Implement multi-pair trading support with:
- BTC/USDT, ETH/USDT, BTC/GBP, ETH/GBP, and other pairs
- Pair selector in the UI
- TradingView chart updates based on selected pair
- Integration with the locked trading_engine.py
- USDT as primary quote currency for liquidity operations

---

## 📊 Current State Analysis

### Existing Implementation
- **File:** `/app/frontend/src/pages/SpotTrading.js`
- **Current pairs:** BTCUSD, ETHUSD, SOLUSD, XRPUSD, BNBUSD (hardcoded)
- **Current API:** `/api/trading/place-order` (OLD, not using locked engine)
- **Issue:** Not connected to the new locked `trading_engine.py`

### Trading Engine v2 Requirements
- **Endpoint:** `/api/trading/execute-v2`
- **Pair format:** "BTC/GBP" or "BTC/USDT" (slash-separated)
- **BUY payload:**
  ```json
  {
    "user_id": "...",
    "pair": "BTC/USDT",
    "type": "buy",
    "gbp_amount": 100  // User spends GBP, gets crypto
  }
  ```
- **SELL payload:**
  ```json
  {
    "user_id": "...",
    "pair": "BTC/USDT",
    "type": "sell",
    "crypto_amount": 0.001  // User sells crypto, gets GBP
  }
  ```

---

## 🛠️ Implementation Steps

### Step 1: Update Trading Pairs Configuration

**File:** `/app/frontend/src/pages/SpotTrading.js`

**Change:**
```javascript
// OLD:
const tradingPairs = [
  { symbol: 'BTCUSD', name: 'BTC/USD', base: 'BTC', quote: 'USD' },
  ...
];

// NEW:
const tradingPairs = [
  // GBP pairs (primary for UK users)
  { symbol: 'BTCGBP', name: 'BTC/GBP', base: 'BTC', quote: 'GBP' },
  { symbol: 'ETHGBP', name: 'ETH/GBP', base: 'ETH', quote: 'GBP' },
  
  // USDT pairs (primary for liquidity)
  { symbol: 'BTCUSDT', name: 'BTC/USDT', base: 'BTC', quote: 'USDT' },
  { symbol: 'ETHUSDT', name: 'ETH/USDT', base: 'ETH', quote: 'USDT' },
  { symbol: 'SOLUSDT', name: 'SOL/USDT', base: 'SOL', quote: 'USDT' },
  { symbol: 'BNBUSDT', name: 'BNB/USDT', base: 'BNB', quote: 'USDT' },
  { symbol: 'XRPUSDT', name: 'XRP/USDT', base: 'XRP', quote: 'USDT' },
  { symbol: 'ADAUSDT', name: 'ADA/USDT', base: 'ADA', quote: 'USDT' },
  { symbol: 'DOGEUSDT', name: 'DOGE/USDT', base: 'DOGE', quote: 'USDT' },
  { symbol: 'LTCUSDT', name: 'LTC/USDT', base: 'LTC', quote: 'USDT' },
];
```

**Default Pair:** Set to `'BTCGBP'` (most common for UK platform)

---

### Step 2: Update TradingView Chart Symbol

**Current:**
```javascript
loadTradingViewChart() {
  // ... 
  "symbol": "${selectedPair}",  // e.g., "BTCUSD"
```

**Update to:**
```javascript
loadTradingViewChart() {
  const pairInfo = tradingPairs.find(p => p.symbol === selectedPair);
  const tvSymbol = `${pairInfo.base}${pairInfo.quote}`; // BTCGBP, BTCUSDT
  
  // ...
  "symbol": tvSymbol,
```

---

### Step 3: Update API Integration

**Current:**
```javascript
const response = await axios.post(`${API}/api/trading/place-order`, orderData);
```

**Change to:**
```javascript
const pairInfo = tradingPairs.find(p => p.symbol === selectedPair);
const pair = `${pairInfo.base}/${pairInfo.quote}`;  // "BTC/GBP"

const payload = {
  user_id: user.user_id,
  pair: pair,
  type: orderType  // "buy" or "sell"
};

if (orderType === "buy") {
  // User is buying crypto with GBP
  payload.gbp_amount = fiatAmount;  // Amount in GBP
} else {
  // User is selling crypto for GBP
  payload.crypto_amount = cryptoAmount;  // Amount in crypto
}

const response = await axios.post(`${API}/api/trading/execute-v2`, payload);
```

---

### Step 4: Add Pair Selector UI

**Location:** Top of the trading interface, next to BUY/SELL tabs

**Design:**
```jsx
<div style={{ marginBottom: '20px' }}>
  <label style={{ color: '#8E9BAE', fontSize: '14px', marginBottom: '10px', display: 'block' }}>
    📊 Trading Pair
  </label>
  <select
    value={selectedPair}
    onChange={(e) => setSelectedPair(e.target.value)}
    style={{
      width: '100%',
      padding: '12px',
      background: 'rgba(13, 23, 38, 0.6)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '16px',
      cursor: 'pointer'
    }}
  >
    <optgroup label="GBP Pairs">
      <option value="BTCGBP">BTC/GBP</option>
      <option value="ETHGBP">ETH/GBP</option>
    </optgroup>
    <optgroup label="USDT Pairs">
      <option value="BTCUSDT">BTC/USDT</option>
      <option value="ETHUSDT">ETH/USDT</option>
      <option value="SOLUSDT">SOL/USDT</option>
      <option value="BNBUSDT">BNB/USDT</option>
      <option value="XRPUSDT">XRP/USDT</option>
      <option value="ADAUSDT">ADA/USDT</option>
      <option value="DOGEUSDT">DOGE/USDT</option>
      <option value="LTCUSDT">LTC/USDT</option>
    </optgroup>
  </select>
</div>
```

---

### Step 5: Update Price Display Logic

**Current:** Hardcoded USD to GBP conversion (×1.27)

**Update to:**
```javascript
const calculateAmount = () => {
  if (!amount || !marketStats.lastPrice) return { crypto: 0, fiat: 0 };
  
  const pairInfo = tradingPairs.find(p => p.symbol === selectedPair);
  const spread = orderType === 'buy' ? 1.005 : 0.995;
  
  let priceInGBP;
  
  if (pairInfo.quote === 'GBP') {
    // Direct GBP pair
    priceInGBP = marketStats.lastPrice * spread;
  } else if (pairInfo.quote === 'USDT' || pairInfo.quote === 'USD') {
    // Convert USD/USDT to GBP
    priceInGBP = (marketStats.lastPrice * 0.79) * spread;  // 0.79 = USD to GBP rate
  }
  
  // ... rest of calculation
};
```

---

### Step 6: Backend - Ensure Trading Engine Supports USDT Pairs

**File:** `/app/backend/core/trading_engine.py`

**Check:**
- Does it support quote currencies other than GBP?
- Does it properly handle USDT liquidity?

**Expected Behavior:**
- For `BTC/USDT` buy: Deduct GBP from user, deduct BTC from admin, add BTC to user, add GBP equivalent to admin USDT pool
- For `BTC/USDT` sell: Deduct BTC from user, deduct USDT from admin, add USDT to user, add BTC to admin pool

**If not supported:** Extend the trading engine to handle USDT as a quote currency.

---

### Step 7: Update Admin Liquidity Manager (Optional)

Ensure admin can view and top up USDT liquidity for USDT-based trading pairs.

**Already Done:** The admin liquidity manager already shows USDT balance (200,000 USDT confirmed in screenshots)

---

## 🧪 Testing Plan

### Frontend Testing
1. Navigate to `/spot-trading`
2. Verify pair selector shows all pairs grouped by quote currency
3. Select different pairs and verify:
   - TradingView chart updates correctly
   - Price display updates
   - Input fields work correctly
4. Place test BUY order for:
   - BTC/GBP (£50)
   - BTC/USDT (£50)
   - ETH/USDT (£30)
5. Place test SELL order for:
   - BTC/GBP (0.001 BTC)
   - ETH/USDT (0.01 ETH)
6. Verify success messages
7. Check wallet balance updates
8. Take screenshots of:
   - Pair selector UI
   - Successful BTC/GBP trade
   - Successful BTC/USDT trade
   - Updated wallet balances

### Backend Testing
1. Call `/api/trading/execute-v2` with:
   - BTC/GBP buy
   - BTC/USDT buy
   - ETH/USDT sell
2. Verify admin liquidity decreases correctly
3. Verify user balances update correctly
4. Check `trades` collection for proper records

---

## ⚠️ Potential Issues

### Issue 1: Trading Engine May Not Support USDT Quote
**Solution:** Extend `trading_engine.py` to handle USDT as quote currency, similar to GBP logic.

### Issue 2: Price Conversion for USDT Pairs
**Solution:** Fetch USD/GBP rate dynamically or use a fixed rate (0.79).

### Issue 3: TradingView Symbol Format
**Solution:** TradingView might not support all pairs (e.g., BTCUSDT vs BTC/USDT). Test and adjust.

### Issue 4: User Balance in USDT
**Solution:** If users can hold USDT, ensure `internal_balances` collection supports USDT currency.

---

## 📸 Visual Proof Required

1. Screenshot of pair selector with dropdown open
2. Screenshot of successful BTC/GBP trade with confirmation
3. Screenshot of successful BTC/USDT trade with confirmation
4. Screenshot of updated wallet showing both BTC and USDT balances
5. Screenshot of admin liquidity manager showing USDT balance decrease

---

## 🏁 Success Criteria

- [✅] User can select from 10+ trading pairs
- [✅] TradingView chart updates when pair changes
- [✅] BUY/SELL orders execute correctly for GBP pairs
- [✅] BUY/SELL orders execute correctly for USDT pairs
- [✅] User balances update correctly
- [✅] Admin liquidity updates correctly
- [✅] Spread (0.5%) applied correctly on all pairs
- [✅] All trades use locked trading_engine.py
- [✅] Frontend testing with visual proof
- [✅] Backend testing with balance verification

---

## 🔄 Next Steps After Completion

1. Phase 3: Production deposit service integration (NOWPayments)
2. Phase 4: User balance refactor to wallet_service.py
3. Phase 5: Complete i18n implementation

---

**Ready to implement? User confirmation required before proceeding.**
