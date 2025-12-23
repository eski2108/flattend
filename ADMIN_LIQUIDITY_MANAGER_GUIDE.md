# Admin Liquidity Manager - User Guide

## Access the Page

**URL:** `https://binancelike-ui.preview.emergentagent.com/admin/liquidity-manager`

---

## Features

### 1. **Quick Top-Up Section**
At the top of the page, you'll find quick input fields for the main currencies:
- GBP
- BTC  
- ETH
- USDT

Simply enter an amount and click the **+** button to instantly add that amount to the existing balance.

### 2. **Trading Liquidity Section**
Shows all major trading pairs:
- **BTC** - Bitcoin
- **ETH** - Ethereum  
- **GBP** - British Pound
- **USDC** - USD Coin
- **USDT** - Tether

Each currency displays:
- Current Balance
- Available Balance (green badge)
- Input field to set new balance
- Update Balance button

### 3. **Major Crypto Assets**
- BNB - Binance Coin
- XRP - Ripple
- SOL - Solana
- ADA - Cardano
- DOGE - Dogecoin

### 4. **Stablecoins & Others**
- DAI
- BUSD
- LTC - Litecoin
- TRX - Tron
- MATIC - Polygon

---

## How to Use

### Method 1: Quick Add (Recommended)

1. Find the "Quick Top-Up" section at the top
2. Enter the amount you want to ADD (e.g., 1000 for GBP)
3. Click the **+** button
4. The amount will be added to the existing balance
5. Success message will appear

**Example:**
- Current GBP: £100,000
- You enter: 5000
- New balance: £105,000

### Method 2: Set Exact Balance

1. Scroll to the currency you want to manage
2. Look at the "Current Balance" displayed
3. In the "Set New Balance" input field, enter the EXACT new balance you want
4. Click **💾 Update Balance** button
5. Success message will appear
6. Page will refresh to show new balances

**Example:**
- Current BTC: 5.00
- You want: 10.00
- Enter 10 in the input field
- Click Update Balance
- New balance: 10.00 BTC

---

## Important Notes

### ✅ What This Does:
- Updates the `admin_liquidity_wallets` collection in the database
- Changes both `balance` and `available` fields
- Records timestamp of the update
- Creates wallet if it doesn't exist (upsert)

### ⚠️ Security:
- This is an admin-only page
- Should only be accessible to authorized users
- All changes are logged in the backend
- No frontend price manipulation possible

### 💡 Best Practices:

1. **For Regular Top-Ups:** Use the Quick Top-Up section
   - Faster
   - Less prone to errors
   - Adds to existing balance

2. **For Setting Specific Amounts:** Use the individual currency cards
   - More control
   - Can set exact balances
   - Good for corrections

3. **Before Trading Goes Live:** Ensure sufficient liquidity
   - GBP: £50,000+ recommended
   - BTC: 2+ recommended
   - ETH: 20+ recommended
   - USDT: £100,000+ recommended

4. **Monitor Regularly:**
   - Click "🔄 Refresh All Liquidity" button at bottom
   - Check balances after large trades
   - Watch for low liquidity warnings

---

## API Endpoints Used

### GET `/api/admin/liquidity-all`
Returns all admin liquidity wallets with:
- currency
- balance
- available
- reserved
- updated_at

### POST `/api/admin/liquidity/update`
Updates a specific currency's balance:

**Request:**
```json
{
  "currency": "BTC",
  "new_balance": 10.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "BTC balance updated to 10.5"
}
```

---

## Troubleshooting

### "Failed to load liquidity data"
- Check backend is running: `sudo supervisorctl status backend`
- Check API endpoint: `curl https://binancelike-ui.preview.emergentagent.com/api/admin/liquidity-all`
- Restart backend if needed: `sudo supervisorctl restart backend`

### Update button is disabled
- Make sure you've changed the value in the input field
- If value matches current balance, button stays disabled
- Try refreshing the page

### Changes not saving
- Check browser console for errors (F12)
- Verify API endpoint is accessible
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

---

## Files Created

**Frontend:**
- `/app/frontend/src/pages/AdminLiquidityManager.js` - Main admin page

**Backend:**
- Endpoints added to `/app/backend/server.py`:
  - `@api_router.get("/admin/liquidity-all")`
  - `@api_router.post("/admin/liquidity/update")`

**Routes:**
- Added to `/app/frontend/src/App.js`:
  - `/admin/liquidity-manager`

---

## Example Scenarios

### Scenario 1: Platform Launch
**Goal:** Set up initial liquidity

1. Go to Admin Liquidity Manager
2. Use Quick Top-Up:
   - GBP: Add 100,000
   - BTC: Add 10
   - ETH: Add 100
   - USDT: Add 200,000
3. Click refresh to verify
4. Platform ready for trading!

### Scenario 2: Low GBP Alert
**Goal:** Top up GBP quickly

1. Notice GBP is low (e.g., £5,000 remaining)
2. Go to Quick Top-Up section
3. Enter 50000 in GBP field
4. Click + button
5. GBP now at £55,000

### Scenario 3: Correct Wrong Balance
**Goal:** Fix incorrect BTC balance

1. Notice BTC shows 5.123 but should be 5.0
2. Scroll to BTC card in Trading Liquidity section
3. Enter exactly 5.0 in "Set New Balance" field
4. Click "💾 Update Balance"
5. BTC now correctly shows 5.00

---

## Summary

✅ **Easy to use** - No database knowledge required  
✅ **Safe** - Can't accidentally break anything  
✅ **Fast** - Instant updates  
✅ **Visual** - See all balances at a glance  
✅ **Flexible** - Quick add or set exact amounts  
✅ **Comprehensive** - Manages all liquidity in one place  

**You can now manage all platform liquidity without ever touching the database!**
