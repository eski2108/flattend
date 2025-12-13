# WALLET PAGE CORRECTIONS - PRODUCTION STANDARD

## ⚠️ CRITICAL ISSUE IDENTIFIED

The current wallet redesign used **INCORRECT COLORS** that were invented, not from the existing CoinHubX brand.

This document provides the **EXACT CORRECTIONS** needed.

---

## 1️⃣ BRAND COLORS - EXISTING vs WHAT WAS USED

### **EXISTING BRAND COLORS** (from `/app/frontend/src/styles/global-design-system.css`):
```css
--primary-bg: #0B0E11        ✅ CORRECT
--secondary-bg: #111418      ✅ USE THIS
--accent-neon: #00AEEF       ✅ PRIMARY BLUE (also #00F0FF in footer)
--success-green: #00C98D     ✅ USE THIS
--warning-yellow: #F5C542    ✅ USE THIS
--danger-red: #E35355        ✅ USE THIS
--grey-text: #9FA6B2         ✅ USE THIS
--white-text: #FFFFFF        ✅ USE THIS
```

### **WHAT WAS INCORRECTLY USED:**
```css
❌ #12161C (invented - should be #111418)
❌ #1E2329 (invented - no such color in brand)
❌ #F0B90B (gold - NOT in brand palette)
❌ #00E5FF (different blue - inconsistent)
❌ #0ECB81 (different green)
❌ #F6465D (different red)
❌ #B7BDC6 (different grey)
❌ #EAECEF (different white)
```

---

## 2️⃣ ICON SYSTEM - MUST MATCH EXISTING

### **Icons from Footer.js (CORRECT):**
```javascript
import { IoFlash, IoLogoTwitter as Twitter, IoMail } from 'react-icons/io5';

// Usage:
<IoFlash size={28} color="#00F0FF" />
```

### **Wallet Icons (MUST USE):**
```javascript
import {
  IoWallet,
  IoArrowDown,    // Deposit
  IoArrowUp,      // Withdraw  
  IoSwapHorizontal, // Swap
  IoRefresh,
  IoTrendingUp,
  IoTrendingDown
} from 'react-icons/io5';
```

**NO EMOJIS. NO CUSTOM ICONS.**

---

## 3️⃣ BACKEND ENDPOINTS - VERIFIED

### **Balances Endpoint:**
```
GET /api/wallets/balances/{user_id}
```
**Response:**
```json
{
  "success": true,
  "balances": [
    {
      "currency": "BTC",
      "available_balance": 0.5,
      "locked_balance": 0.0,
      "total_balance": 0.5,
      "price_gbp": 45000,
      "gbp_value": 22500
    }
  ],
  "total_gbp": 22500
}
```
**Line in server.py:** 19221

### **Transactions Endpoint:**
```
GET /api/user/transactions/{wallet_address}
```
**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "tx_hash": "0x...",
      "type": "deposit",
      "amount": 0.5,
      "currency": "BTC",
      "timestamp": "2024-12-13T...",
      "status": "completed"
    }
  ]
}
```
**Line in server.py:** 1478

### **Withdrawal Endpoint:**
```
POST /api/withdrawals/request
```
**Payload:**
```json
{
  "user_id": "...",
  "currency": "BTC",
  "amount_crypto": 0.1,
  "destination_address": "...",
  "network": "Bitcoin",
  "amount_fiat_gbp": 4500,
  "rate_used": 45000
}
```
**Line in server.py:** 14941

### **Wallet Balance Endpoint:**
```
GET /api/wallet/balance/{user_id}/{currency}
```
**Line in server.py:** 5631

---

## 4️⃣ LAYOUT STRUCTURE (BINANCE STANDARD)

```
╭──────────────────────────────────────────────────╮
│  HEADER: Wallet + Refresh Button                  │
╰──────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────╮
│  PORTFOLIO SUMMARY                                │
│  - Total Portfolio Value: £XX,XXX               │
│  - Quick Actions: Deposit | Withdraw | Buy       │
╰──────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────╮
│  ASSET LIST                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │ [Logo] BTC | Balance | Value | Actions    │  │
│  └──────────────────────────────────────────────┘  │
╰──────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────╮
│  TRANSACTION HISTORY (OPTIONAL/TABBED)            │
│  - Recent deposits, withdrawals, swaps           │
╰──────────────────────────────────────────────────╯
```

---

## 5️⃣ ACTION BUTTONS (PER ASSET)

### **Deposit Button:**
```javascript
<button style={{
  padding: '8px 16px',
  background: 'transparent',
  border: `1px solid ${COLORS.ACCENT_NEON}`,  // #00AEEF
  borderRadius: '8px',
  color: COLORS.ACCENT_NEON,
  fontSize: '13px',
  fontWeight: '600'
}}>
  <IoArrowDown size={14} /> Deposit
</button>
```

### **Withdraw Button:**
```javascript
<button style={{
  border: `1px solid ${COLORS.DANGER_RED}`,  // #E35355
  color: COLORS.DANGER_RED
}}>
  <IoArrowUp size={14} /> Withdraw
</button>
```

### **Swap Button:**
```javascript
<button style={{
  border: `1px solid ${COLORS.WARNING_YELLOW}`,  // #F5C542
  color: COLORS.WARNING_YELLOW
}}>
  <IoSwapHorizontal size={14} /> Swap
</button>
```

---

## 6️⃣ MODALS (REQUIREMENTS)

### **Deposit Modal:**
- QR code for address
- Copy button
- Network selection
- Minimum deposit warning
- **NO EMOJI, USE IoQrCode ICON**

### **Withdraw Modal:**
- Amount input (with MAX button)
- Destination address input
- Fee breakdown:
  - Amount: X.XXXX BTC
  - Fee (0.5%): X.XXXX BTC
  - You receive: X.XXXX BTC
- Validation:
  - Check sufficient balance
  - Validate address format
- **Connect to:** `POST /api/withdrawals/request`

### **Swap Modal:**
- From/To currency selectors
- Amount input
- Exchange rate display
- **Connect to:** `POST /api/swap` (if exists)

---

## 7️⃣ FILES TO MODIFY

### **Primary File:**
```
/app/frontend/src/pages/WalletPage.js
```

### **Component Files:**
```
/app/frontend/src/components/PortfolioSummary.jsx
/app/frontend/src/components/AssetRow.jsx
/app/frontend/src/components/WalletFilters.jsx
/app/frontend/src/components/modals/DepositModal.jsx
/app/frontend/src/components/modals/WithdrawModal.jsx
/app/frontend/src/components/modals/SwapModal.jsx
```

### **Utility File (MUST USE):**
```
/app/frontend/src/utils/coinLogos.js
```

---

## 8️⃣ COIN LOGO SYSTEM

**MUST USE EXISTING UTILITY:**
```javascript
import { getCoinLogo } from '@/utils/coinLogos';

// Usage:
<img 
  src={getCoinLogo('BTC')} 
  alt="BTC"
  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
/>
```

**DO NOT:**
- Use letters as placeholders
- Create custom coin logos
- Use emoji

**XRP ICON:**
Must match official XRP branding (correct brightness/contrast from `/app/frontend/public/crypto-logos/XRP.png`)

---

## 9️⃣ RESPONSIVE BREAKPOINTS

```css
/* Desktop: 1400px+ */
max-width: 1400px;
margin: 0 auto;

/* Tablet: 768px - 1399px */
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

/* Mobile: <768px */
grid-template-columns: 1fr;
padding: 16px;
```

---

## 🔒 LOCKING AFTER CORRECTIONS

**Once corrected, these files MUST BE LOCKED:**
1. `/app/frontend/src/pages/WalletPage.js`
2. `/app/frontend/src/components/PortfolioSummary.jsx`
3. `/app/frontend/src/components/AssetRow.jsx`
4. `/app/frontend/src/utils/coinLogos.js`

**Lock command:**
```bash
chattr +i /app/frontend/src/pages/WalletPage.js
```

---

## ✅ VERIFICATION CHECKLIST

Before marking as complete:

- [ ] All colors match global-design-system.css
- [ ] Icons from react-icons/io5 only
- [ ] getCoinLogo() used for all coin images
- [ ] All data from backend APIs (no mock data)
- [ ] Deposit/Withdraw/Swap modals functional
- [ ] Transaction history displays
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Responsive layout tested
- [ ] Screenshot on preview URL provided
- [ ] Git commit with hash provided
- [ ] Files locked

---

**STATUS:** ⚠️ CORRECTIONS NEEDED
**NEXT STEP:** Apply corrections to WalletPage.js using EXACT brand colors
