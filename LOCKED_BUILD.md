# 🔒 LOCKED BUILD - SPOT TRADING SYSTEM

**⚠️ CRITICAL: DO NOT MODIFY THESE FILES WITHOUT EXPLICIT OWNER APPROVAL ⚠️**

**Lock Date:** December 7, 2024, 21:00 UTC
**Version:** v1.0-LOCKED-PERMANENT
**Status:** 🔴 PROTECTED - MODIFICATIONS BLOCKED

---

## 🚨 PROTECTED FILES - DO NOT TOUCH

### Frontend - Spot Trading Components:

#### 1. `/app/frontend/src/pages/SpotTradingPro.js` 🔒
**Purpose:** Main spot trading page with TradingView chart, buy/sell panel, trading pairs list
**Protected Elements:**
- TradingView widget initialization (lines 96-185)
- Trading pairs fetching (lines 64-82)
- Market stats calculation (lines 84-94)
- handlePlaceOrder function (lines 196-237)
- Desktop 3-column layout (lines 331-550)
- Mobile responsive layout (CSS media queries)
- Buy/Sell panel logic (lines 451-550)
- Timeframe selector (lines 391-420)
- Trading pair buttons (lines 286-313)

**Dependencies:**
- axios (API calls)
- react-toastify (notifications)
- TradingView widget script
- Backend API: /api/trading/pairs, /api/trading/order/buy, /api/trading/order/sell

**NEVER MODIFY:**
- Layout structure (grid/flex)
- TradingView configuration
- API endpoint URLs
- Order placement logic
- Balance update triggers

---

#### 2. `/app/frontend/src/pages/SpotTradingPro.css` 🔒
**Purpose:** Styles for spot trading page
**Protected Elements:**
- Desktop layout styles (.spot-trading-grid)
- Mobile media queries (@media max-width: 1024px)
- Trading pair button styles
- Chart panel styles
- Buy/sell panel styles

**NEVER MODIFY:**
- Grid template columns
- Mobile breakpoints
- Display properties for responsive layout

---

#### 3. `/app/frontend/src/components/Layout.js` 🔒
**Purpose:** Main layout wrapper with sidebar
**Protected Elements:**
- Line 104-110: Sidebar with mobile hide logic
- Inline style: `style={typeof window !== 'undefined' && window.innerWidth <= 1024 && !isMobileMenuOpen ? { display: 'none' } : {}}`
- Line 350: PriceTickerEnhanced conditional rendering

**Dependencies:**
- PriceTickerEnhanced component
- useLocation hook
- isMobileMenuOpen state

**NEVER MODIFY:**
- Sidebar hide logic on mobile
- Window width check
- Mobile menu toggle behavior

---

#### 4. `/app/frontend/src/App.css` 🔒
**Purpose:** Global styles including sidebar mobile breakpoints
**Protected Elements:**
- Lines 1053-1058: Sidebar mobile hide CSS
- Lines 3991-4030: Mobile responsive rules
- Line 8340-8355: Final mobile breakpoint rules

**NEVER MODIFY:**
- .sidebar { display: none !important; } at @media (max-width: 1024px)
- .sidebar.mobile-open restore rules
- Any sidebar-related media queries

---

### Backend - Trading Endpoints:

#### 5. `/app/backend/server.py` 🔒
**Protected Sections:**

**Lines 11009-11020: SpotTradeOrder Model**
```python
class SpotTradeOrder(BaseModel):
    user_id: str
    pair: str
    base: str
    quote: str
    side: str
    order_type: str
    amount: float
    price: float
    total: float
```

**Lines 11022-11114: POST /api/trading/order/buy**
- Balance checking
- Fee calculation (0.5%)
- Balance deduction/addition
- Trade recording
- Admin fee credit

**Lines 11117-11210: POST /api/trading/order/sell**
- Balance checking
- Fee calculation (0.5%)
- Balance deduction/addition
- Trade recording
- Admin fee credit

**Lines 10884-11006: GET /api/trading/pairs**
- Live price fetching
- Pair generation for all cryptos
- Liquidity status

**Lines 27218-27300: GET /api/trading/ohlcv/{pair}**
- OHLCV data for TradingView
- Candlestick generation

**Lines 26289-26323: POST /api/nowpayments/webhook**
- Signature verification
- Payment processing
- Admin liquidity crediting

**NEVER MODIFY:**
- Fee percentage (0.5% = 0.005)
- Balance update logic
- Admin wallet credit mechanism
- Trade recording structure
- Error handling flow

---

#### 6. `/app/backend/nowpayments_real_sync.py` 🔒
**Protected Elements:**
- Lines 152-234: process_webhook function
- Admin liquidity crediting logic
- Deposit logging
- Signature verification

**NEVER MODIFY:**
- Webhook verification flow
- Database collection names (admin_liquidity_wallets, admin_deposits)
- Amount crediting logic

---

### Environment Configuration:

#### 7. `/app/frontend/.env` 🔒
**Protected Variables:**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

**NEVER MODIFY:**
- Backend URL value (must match backend port)

---

#### 8. `/app/backend/.env` 🔒
**Protected Variables:**
```
NOWPAYMENTS_API_KEY=RN27NA0-D32MD5G-M6N2G6T-KWQMEAP
NOWPAYMENTS_IPN_SECRET=NiW6+bCEl2Dw/0gBuxEuL0+fbGo2oWij
NOWPAYMENTS_PAYOUT_ADDRESS=1Ca6mH2WLhX4FRrAFe1RSRDsBaJ8XQzh95
MONGO_URL=mongodb://localhost:27017/cryptobank
```

**NEVER MODIFY:**
- NowPayments credentials
- MongoDB connection string

---

## 🗄️ PROTECTED DATABASE COLLECTIONS

### 1. `user_balances` 🔒
**Structure:**
```json
{
  "user_id": "string",
  "balances": {
    "BTC": {"available": 0, "locked": 0},
    "GBP": {"available": 0, "locked": 0}
  },
  "created_at": "ISO date",
  "updated_at": "ISO date"
}
```
**Used By:** Trading buy/sell endpoints
**NEVER MODIFY:** Structure or field names

---

### 2. `spot_trades` 🔒
**Structure:**
```json
{
  "trade_id": "uuid",
  "user_id": "string",
  "pair": "BTC/GBP",
  "side": "buy|sell",
  "type": "market|limit",
  "amount": 0.01,
  "price": 69000,
  "total": 690,
  "fee": 3.45,
  "status": "completed",
  "created_at": "ISO date"
}
```
**Used By:** Trading endpoints for audit trail
**NEVER MODIFY:** Structure or field names

---

### 3. `internal_balances` 🔒
**Admin Wallet Entry:**
```json
{
  "user_id": "admin_wallet",
  "currency": "GBP",
  "available": 0,
  "balance": 0
}
```
**Used By:** Trading endpoints for fee collection
**NEVER MODIFY:** user_id value or structure

---

### 4. `admin_liquidity_wallets` 🔒
**Structure:**
```json
{
  "currency": "BTC",
  "balance": 10,
  "available": 8,
  "reserved": 2,
  "created_at": "ISO date",
  "updated_at": "ISO date"
}
```
**Used By:** NowPayments webhook, trading liquidity checks
**NEVER MODIFY:** Structure or field names

---

### 5. `admin_deposits` 🔒
**Structure:**
```json
{
  "deposit_id": "payment_id",
  "currency": "BTC",
  "amount": 0.5,
  "source": "nowpayments",
  "payment_id": "string",
  "status": "completed",
  "processed_at": "ISO date",
  "webhook_data": {}
}
```
**Used By:** NowPayments webhook
**NEVER MODIFY:** Structure or field names

---

## 📦 EXTERNAL DEPENDENCIES - LOCKED VERSIONS

### TradingView Widget:
- **Script URL:** `https://s3.tradingview.com/tv.js`
- **Symbol Map:** BINANCE:BTCUSDT, BINANCE:ETHUSDT, etc.
- **Configuration:** autosize: true, theme: dark, studies: RSI, MACD, MASimple
- **Container:** `#tv_chart_container`

**NEVER MODIFY:**
- Script source URL
- Widget initialization parameters
- Symbol mappings
- Study/indicator names

---

### NowPayments API:
- **Base URL:** `https://api.nowpayments.io/v1`
- **Webhook Path:** `/api/nowpayments/webhook`
- **Signature Header:** `x-nowpayments-sig`
- **Verification:** HMAC-SHA512

**NEVER MODIFY:**
- API endpoints
- Signature verification algorithm
- Webhook URL path

---

### React Dependencies (package.json):
```json
{
  "axios": "^1.x",
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "react-toastify": "^9.x"
}
```

**NEVER DOWNGRADE OR REMOVE:**
- axios (API calls)
- react-toastify (notifications)
- react-router-dom (navigation)

---

## 🛡️ PROTECTION MECHANISMS

### 1. File-Level Protection:
- ✅ Warning comments added to all protected files
- ✅ "DO NOT MODIFY" headers in critical sections
- ✅ Technical explanations for each protected element

### 2. Git Protection:
- ✅ Pre-commit hook blocks changes to protected files
- ✅ Tagged release: `v1.0-LOCKED-PERMANENT`
- ✅ Rollback instructions in PRODUCTION_DEPLOYMENT.md

### 3. Documentation:
- ✅ LOCKED_BUILD.md (this file)
- ✅ PRODUCTION_DEPLOYMENT.md (deployment guide)
- ✅ WIRING_COMPLETE.md (system wiring documentation)

### 4. Testing Lock:
- ✅ Desktop layout verified
- ✅ Mobile layout verified
- ✅ TradingView chart loading confirmed
- ✅ Buy/sell endpoints tested
- ✅ Fee calculation verified

---

## 🚫 WHAT WILL BREAK THE SYSTEM

The following actions WILL break the trading system:

1. ❌ Modifying TradingView widget configuration
2. ❌ Changing sidebar hide logic on mobile
3. ❌ Altering fee calculation (0.5%)
4. ❌ Removing admin_wallet fee crediting
5. ❌ Changing database collection names
6. ❌ Modifying NowPayments webhook signature verification
7. ❌ Changing balance update logic
8. ❌ Removing error handling in trading endpoints
9. ❌ Modifying grid layout CSS
10. ❌ Changing API endpoint URLs

---

## 🔓 HOW TO MAKE APPROVED CHANGES

If you need to modify protected files:

1. **Document the reason** in writing
2. **Get explicit owner approval** before any changes
3. **Create a backup** of current working version
4. **Test on a separate branch** first
5. **Run full testing checklist** before deploying
6. **Update this LOCKED_BUILD.md** with changes
7. **Create new tagged release** after verification

**NEVER:**
- Make changes directly in production
- Skip testing
- Modify multiple files at once
- Deploy without owner approval

---

## 📋 ROLLBACK PROCEDURE

If system breaks:

```bash
# 1. Stop services
sudo supervisorctl stop all

# 2. Revert to locked version
cd /app
git checkout v1.0-LOCKED-PERMANENT

# 3. Verify environment files
cat /app/frontend/.env | grep REACT_APP_BACKEND_URL
cat /app/backend/.env | grep NOWPAYMENTS

# 4. Restart services
sudo supervisorctl start all

# 5. Verify spot trading page loads
curl http://localhost:3000/#/spot-trading

# 6. Check logs
tail -n 50 /var/log/supervisor/backend.err.log
tail -n 50 /var/log/supervisor/frontend.err.log
```

---

## ✅ VERIFICATION CHECKLIST

Before considering system locked:

- [x] All protected files identified and documented
- [x] Warning comments added to files
- [x] Git hooks configured
- [x] Tagged release created
- [x] Documentation complete
- [x] Desktop layout tested
- [x] Mobile layout tested
- [x] TradingView loading verified
- [x] Buy/sell endpoints functional
- [x] Fee calculation correct
- [x] Admin wallet crediting works
- [x] Balance updates correctly
- [x] Trade recording works
- [x] NowPayments webhook configured

---

## 🔐 FINAL CONFIRMATION

**System Status:** 🟢 LOCKED AND PROTECTED

**Protected Files:** 8 files
**Protected Database Collections:** 5 collections
**Protected API Endpoints:** 4 endpoints
**Protected UI Components:** 15+ components

**This build is permanently locked as of December 7, 2024.**
**Any modifications require explicit owner approval.**
**All changes must be documented in this file.**

**Last Verified:** December 7, 2024, 21:00 UTC
**Verified By:** CoinHubX Master Engineer
**Lock Level:** 🔴 MAXIMUM - DO NOT TOUCH

---

**END OF LOCKED BUILD DOCUMENTATION**