# CoinHubX Production Deployment - LOCKED VERSION

## Production URL
**Primary:** https://protrading.preview.emergentagent.com
**Custom Domain (to be configured):** https://coinhubx.net

## Current Status: STABLE AND LOCKED
Date Locked: December 7, 2024
Version: v1.0-stable

## What is LOCKED and FROZEN:

### 1. Spot Trading Page Layout
- **Desktop Layout:**
  - Left: Trading Pairs list panel (280px width)
  - Center: TradingView chart with RSI + MACD indicators
  - Right: Buy/Sell panel (360px width)
  - Top: Market info cards (LAST PRICE, 24H HIGH, 24H LOW, 24H VOLUME)
  - Trading pair selector buttons (horizontal grid)
  - Timeframe buttons: 1m, 5m, 15m, 1h, 4h, 1D

- **Mobile Layout:**
  - Sidebar HIDDEN (display: none)
  - Vertical stack: Header → Chart → Buy/Sell panel
  - Trading pairs selector HIDDEN on mobile
  - Chart responsive and full-width

### 2. Key Files (DO NOT MODIFY WITHOUT APPROVAL):
- `/app/frontend/src/pages/SpotTradingPro.js` - Main trading page
- `/app/frontend/src/components/Layout.js` - Sidebar with mobile hide logic
- `/app/frontend/src/App.css` - Global styles including mobile breakpoints
- `/app/frontend/.env` - Environment variables

### 3. Backend Configuration:
- Backend URL: Set via `REACT_APP_BACKEND_URL` in frontend/.env
- Database: MongoDB (configured via MONGO_URL in backend/.env)
- Payment Provider: NowPayments (API keys in backend/.env)

## NowPayments Configuration:
```
NOWPAYMENTS_API_KEY=RN27NA0-D32MD5G-M6N2G6T-KWQMEAP
NOWPAYMENTS_IPN_SECRET=NiW6+bCEl2Dw/0gBuxEuL0+fbGo2oWij
NOWPAYMENTS_PAYOUT_ADDRESS=1Ca6mH2WLhX4FRrAFe1RSRDsBaJ8XQzh95
```

## API Endpoints (Production):

### Trading:
- GET /api/trading/pairs - Get all trading pairs with live prices
- POST /api/trading/order/buy - Place buy order
- POST /api/trading/order/sell - Place sell order
- GET /api/trading/orders/{user_id} - Get user's trading orders

### Wallet:
- GET /api/wallet/balance/{user_id} - Get user wallet balances
- POST /api/wallet/deposit - Deposit via NowPayments
- POST /api/wallet/withdraw - Withdraw crypto

### NowPayments:
- POST /api/nowpayments/create-payment - Create payment
- POST /api/nowpayments/webhook - IPN callback
- GET /api/nowpayments/payment-status/{payment_id} - Check status

## Deployment Process:

### Frontend:
1. Build: `cd /app/frontend && yarn build`
2. Restart: `sudo supervisorctl restart frontend`
3. Verify: Check http://localhost:3000/#/spot-trading

### Backend:
1. Restart: `sudo supervisorctl restart backend`
2. Verify: Check http://localhost:8001/docs

## Testing Checklist:

### Desktop (1920x1080):
- [ ] Sidebar visible with all navigation items
- [ ] Trading pairs list shows all pairs with prices
- [ ] TradingView chart loads with candlesticks
- [ ] RSI indicator visible (purple line)
- [ ] MACD indicator visible at bottom
- [ ] Volume bars visible
- [ ] Market info cards show correct prices
- [ ] Trading pair buttons work and update chart
- [ ] Timeframe buttons work (1m, 5m, 15m, 1h, 4h, 1D)
- [ ] Buy/Sell panel shows correct selected pair
- [ ] Market/Limit toggle works
- [ ] Amount input accepts numbers
- [ ] Total calculates correctly
- [ ] Buy button triggers order placement
- [ ] Sell button triggers order placement

### Mobile (390x844):
- [ ] Sidebar HIDDEN (no duplicate labels on right)
- [ ] Chart loads and displays correctly
- [ ] Chart is full-width and responsive
- [ ] Buy/Sell tabs work
- [ ] Amount input works
- [ ] Buy/Sell buttons work
- [ ] Can scroll page smoothly

### Integration:
- [ ] NowPayments deposit updates wallet balance
- [ ] Wallet balance shows in Portfolio
- [ ] Wallet balance shows in Wallet page
- [ ] Wallet balance shows in Spot Trading
- [ ] Buy order deducts GBP, adds BTC
- [ ] Sell order deducts BTC, adds GBP
- [ ] All balances sync across pages

## CRITICAL RULES:

1. **DO NOT** change the Spot Trading page layout without explicit approval
2. **DO NOT** modify the sidebar hide logic on mobile
3. **DO NOT** change TradingView widget configuration
4. **DO NOT** hardcode API keys anywhere in frontend code
5. **DO NOT** deploy untested changes to production
6. **DO NOT** fork or branch without documenting the stable version

## Rollback Procedure:

If something breaks:
1. Check this file for the locked configuration
2. Restore files from the stable commit
3. Verify environment variables are correct
4. Rebuild and restart services
5. Test with the checklist above

## Support Contact:
For production issues or approved changes, contact the site owner before making any modifications to this locked version.
