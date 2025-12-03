# TRADING ENGINE PROTECTION SYSTEM

## 🔒 LOCKED COMPONENTS

### Core File: `/app/backend/core/trading_engine.py`

**Version:** 1.0-LOCKED  
**Status:** Protected  
**Checksum Verification:** Enabled

### LOCKED FORMULAS

```python
BUY_SPREAD_PERCENT = 0.5   # User pays market + 0.5%
SELL_SPREAD_PERCENT = 0.5  # User receives market - 0.5%
```

**These constants CANNOT be modified without breaking tests.**

---

## 🛡️ PROTECTION MECHANISMS

### 1. Automated Testing

**File:** `/app/backend/tests/test_trading_engine.py`

**Tests verify:**
- ✅ BUY price = market + 0.5%
- ✅ SELL price = market - 0.5%
- ✅ Spread profit calculations
- ✅ Admin never loses money (even when price drops)
- ✅ Round-trip profit = 1%
- ✅ Locked constants unchanged

**Run tests:**
```bash
cd /app/backend
python3 tests/test_trading_engine.py
```

### 2. Pre-Merge Hook

**File:** `/app/.ci/pre-merge-trading.sh`

**Before any merge to main:**
```bash
bash /app/.ci/pre-merge-trading.sh
```

This script:
1. Checks trading_engine.py exists
2. Checks tests exist
3. Runs all tests
4. **BLOCKS merge if any test fails**

### 3. Version Tagging

**Git tags for rollback:**
```bash
git tag v1.0-trading-locked
git push origin v1.0-trading-locked
```

If something breaks, rollback:
```bash
git checkout v1.0-trading-locked
```

### 4. Backend Price Control

**CRITICAL RULE:**  
❌ Frontend CANNOT send prices  
✅ Backend MUST fetch live prices

**Implementation:**
```python
# OLD (INSECURE):
price = request.get("price")  # ❌ USER CAN MANIPULATE

# NEW (SECURE):
from live_pricing import get_live_price
mid_market_price = await get_live_price(currency)  # ✅ BACKEND ONLY
```

### 5. Checksum Verification

**On startup, trading engine calculates its own checksum:**
```python
checksum = calculate_file_checksum()
logger.info(f"🔒 Trading Engine Checksum: {checksum[:16]}...")
```

In production:
- Store expected checksum
- Compare on startup
- Refuse to run if mismatch

---

## 📊 PROFIT VERIFICATION

### Guaranteed Profits:

**Per BUY trade:**
- Spread: 0.5%
- Admin profit: £(buy_price - market_price) × amount

**Per SELL trade:**
- Spread: 0.5%
- Admin profit: £(market_price - sell_price) × amount

**Per Round Trip:**
- Total spread: 1%
- Admin profit: £(market_price × amount × 0.01)

**Example:**
- User buys 1 BTC at £70,000 market
- Buy price: £70,350 (market + 0.5%)
- User immediately sells
- Sell price: £69,650 (market - 0.5%)
- **Admin profit: £700 (1% of £70k)**
- User loss: £700

---

## 🚨 EMERGENCY PROCEDURES

### If Trading Engine Breaks:

1. **Immediately rollback:**
   ```bash
   git checkout v1.0-trading-locked
   sudo supervisorctl restart backend
   ```

2. **Check logs:**
   ```bash
   tail -n 100 /var/log/supervisor/backend.err.log
   ```

3. **Verify tests still pass:**
   ```bash
   cd /app/backend
   python3 tests/test_trading_engine.py
   ```

4. **Check database:**
   ```python
   # Verify no negative balances
   db.admin_liquidity_wallets.find({"balance": {"$lt": 0}})
   ```

### If Someone Modified Spreads:

1. **Check git history:**
   ```bash
   git log --follow backend/core/trading_engine.py
   ```

2. **Compare checksums:**
   ```bash
   sha256sum /app/backend/core/trading_engine.py
   ```

3. **Re-run tests:**
   ```bash
   python3 tests/test_trading_engine.py
   ```

4. **If tests fail → ROLLBACK IMMEDIATELY**

---

## ✅ DEPLOYMENT CHECKLIST

Before deploying ANY changes to trading:

- [ ] Run `python3 tests/test_trading_engine.py`
- [ ] All 7 tests pass
- [ ] Run `bash .ci/pre-merge-trading.sh`
- [ ] Create git tag: `git tag v1.X-trading-locked`
- [ ] Push tag: `git push origin v1.X-trading-locked`
- [ ] Verify backend logs show: "🔒 Trading Engine 1.0-LOCKED initialized"
- [ ] Test one BUY trade manually
- [ ] Test one SELL trade manually
- [ ] Verify admin liquidity updated correctly
- [ ] Verify spread profits recorded

---

## 📝 MODIFICATION RULES

### You CAN modify:
- Referral commission percentages
- Logging details
- Error messages
- UI/UX (frontend)

### You CANNOT modify:
- `BUY_SPREAD_PERCENT = 0.5`
- `SELL_SPREAD_PERCENT = 0.5`
- Price calculation formulas
- Spread profit formulas
- Liquidity check logic

### To change spreads (if absolutely necessary):

1. Create NEW version: `trading_engine_v2.py`
2. Update tests with new expected values
3. Run tests
4. Create new tag: `v2.0-trading-locked`
5. Keep v1.0 as backup

---

## 🔐 SUMMARY

**Protected file:** `/app/backend/core/trading_engine.py`  
**Test file:** `/app/backend/tests/test_trading_engine.py`  
**Pre-merge hook:** `/app/.ci/pre-merge-trading.sh`  
**Current version:** 1.0-LOCKED  
**Spreads:** 0.5% BUY, 0.5% SELL (locked)  
**Round-trip profit:** 1% guaranteed  

**Result:** Admin CANNOT lose money. Ever.
