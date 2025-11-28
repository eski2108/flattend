# 🏗️ CoinHubX System Architecture

**Last Updated:** November 2024  
**Purpose:** Complete system architecture documentation for all future developers

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [System Overview](#system-overview)
3. [Database Collections](#database-collections)
4. [Backend Services](#backend-services)
5. [Key Backend Files](#key-backend-files)
6. [Frontend Structure](#frontend-structure)
7. [API Architecture](#api-architecture)
8. [Money Flow Architecture](#money-flow-architecture)

---

## 🔧 Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Authentication:** JWT tokens
- **APIs:** RESTful with `/api` prefix
- **Port:** 8001 (internal), mapped via Kubernetes ingress

### Frontend
- **Framework:** React 18
- **Styling:** TailwindCSS + shadcn/ui components
- **State Management:** React Context + useState/useEffect
- **HTTP Client:** Axios
- **Port:** 3000

### Infrastructure
- **Container:** Kubernetes cluster
- **Process Manager:** Supervisor (auto-restart on crashes)
- **Hot Reload:** Enabled for both frontend and backend
- **Ingress Rules:** `/api/*` → Backend (8001), `/*` → Frontend (3000)

---

## 🌐 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   React Frontend (Port 3000) │
        │   - InstantBuy.js            │
        │   - WalletPage.js            │
        │   - SwapCrypto.js            │
        │   - P2PMarketplace.js        │
        │   - AdminEarnings.js         │
        └──────────────┬──────────────┘
                       │ REACT_APP_BACKEND_URL
                       ▼
        ┌─────────────────────────────┐
        │  FastAPI Backend (Port 8001) │
        │  - server.py (main)          │
        │  - wallet_service.py         │
        │  - nowpayments_integration.py│
        │  - price_service.py          │
        └──────────────┬──────────────┘
                       │ MONGO_URL
                       ▼
        ┌─────────────────────────────┐
        │     MongoDB Database         │
        │  - users                     │
        │  - wallets                   │
        │  - admin_liquidity_wallets   │
        │  - internal_balances (fees)  │
        │  - nowpayment_deposits       │
        │  - p2p_trades                │
        │  - swap_transactions         │
        │  - express_buy_transactions  │
        └─────────────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │   NOWPayments API (External) │
        │   - Deposit address creation │
        │   - IPN webhook callbacks    │
        └─────────────────────────────┘
```

---

## 🗄️ Database Collections

### **Core Collections**

#### `users` (user_accounts)
```javascript
{
  user_id: "uuid",
  email: "user@example.com",
  password_hash: "bcrypt_hash",
  full_name: "John Doe",
  role: "user",  // or "admin"
  email_verified: false,
  kyc_verified: false,
  created_at: ISODate,
  referred_by: "referrer_user_id" // optional
}
```

#### `wallets` (Main user wallet balances)
```javascript
{
  user_id: "uuid",
  currency: "BTC" | "ETH" | "USDT" | "GBP",
  available_balance: 0.5,       // Available for use
  locked_balance: 0.1,          // Locked in escrow/pending
  total_balance: 0.6,           // available + locked
  created_at: ISODate,
  last_updated: ISODate
}
```

**CRITICAL:** All balance updates MUST go through `wallet_service.py` to ensure atomicity.

#### `admin_liquidity_wallets` (Admin-owned liquidity)
```javascript
{
  wallet_id: "uuid",
  currency: "BTC" | "ETH" | "USDT" | "GBP",
  balance: 10.0,              // Admin's liquidity pool
  reserved_balance: 2.0,      // Currently in active offers
  created_at: ISODate,
  last_updated: ISODate
}
```

**NOTE:** This collection should eventually be merged into `wallets` under a single admin user ID (see `KNOWN_ISSUES.md`).

#### `internal_balances` (Platform fee wallet)
```javascript
{
  currency: "BTC" | "ETH" | "USDT" | "GBP",
  balance: 0.05,              // Accumulated fees
  last_updated: ISODate,
  
  // Revenue breakdown by source
  revenue_breakdown: {
    p2p_fees: 0.02,
    swap_fees: 0.01,
    express_buy_profit: 0.015,
    withdrawal_fees: 0.005
  }
}
```

**Purpose:** Central treasury for all platform profits.

---

### **Transaction Collections**

#### `nowpayment_deposits`
```javascript
{
  deposit_id: "uuid",
  user_id: "uuid",
  payment_id: "nowpayments_id",     // From NOWPayments API
  pay_address: "0x123...",           // Deposit address
  pay_currency: "btc",
  pay_amount: 0.001,
  expected_amount: 0.001,
  price_currency: "usd",
  price_amount: 50,
  status: "waiting" | "confirming" | "confirmed" | "finished" | "failed",
  network_confirmations: 0,
  created_at: ISODate,
  updated_at: ISODate,
  credited_at: ISODate  // When balance was credited
}
```

**CRITICAL BUG:** 46+ deposits stuck at "waiting" due to broken IPN webhook signature validation.

#### `p2p_trades`
```javascript
{
  trade_id: "uuid",
  ad_id: "uuid",                    // Reference to seller's ad
  seller_id: "uuid",
  buyer_id: "uuid",
  crypto_currency: "BTC",
  crypto_amount: 0.01,
  fiat_currency: "GBP",
  fiat_amount: 500,
  price_per_unit: 50000,
  payment_method: "bank_transfer",
  status: "pending" | "paid" | "completed" | "cancelled" | "disputed",
  escrow_locked: true,
  fee_amount: 0.0003,               // ⚠️ BUG: Not saved per trade
  fee_currency: "BTC",
  created_at: ISODate,
  marked_paid_at: ISODate,
  completed_at: ISODate
}
```

**MISSING:** `fee_amount` and `fee_currency` fields are not populated (see `KNOWN_ISSUES.md`).

#### `swap_transactions`
```javascript
{
  swap_id: "uuid",
  user_id: "uuid",
  from_currency: "ETH",
  from_amount: 0.5,
  to_currency: "BTC",
  to_amount: 0.015,
  exchange_rate: 0.03,
  fee_amount: 0.015,                // ⚠️ BUG: Not saved per swap
  fee_currency: "ETH",
  status: "completed",
  created_at: ISODate
}
```

**MISSING:** Fee tracking per swap.

#### `express_buy_transactions`
```javascript
{
  transaction_id: "uuid",
  user_id: "uuid",
  crypto_currency: "BTC",
  crypto_amount: 0.01,
  fiat_currency: "GBP",
  fiat_amount: 500,
  price_per_unit: 50000,
  admin_profit: 0,                  // ⚠️ BUG: Always 0, not calculated
  status: "completed",
  created_at: ISODate
}
```

**MISSING:** Admin profit calculation and storage.

---

### **Other Collections**

- `wallet_transactions` - Audit trail for all wallet operations
- `referrals` - Referral relationships and commission tracking
- `kyc_submissions` - KYC verification documents
- `withdrawal_requests` - Pending crypto withdrawals
- `p2p_ads` - Active P2P sell/buy advertisements
- `chat_messages` - P2P trade chat history

---

## 🔧 Backend Services

### **wallet_service.py** (CRITICAL - All Money Operations)

**Purpose:** Single source of truth for all balance operations.

**Key Functions:**
```python
# Get balance
get_balance(user_id, currency) -> {available, locked, total}

# Credit wallet (deposits, earnings)
credit(user_id, currency, amount, tx_type, reference_id)

# Debit wallet (withdrawals, purchases)
debit(user_id, currency, amount, tx_type, reference_id)

# Lock for escrow
lock_balance(user_id, currency, amount, lock_type, reference_id)

# Unlock cancelled transactions
unlock_balance(user_id, currency, amount, unlock_type, reference_id)

# Release completed escrow
release_locked_balance(user_id, currency, amount, release_type, reference_id)

# Transfer between users (atomic)
transfer(from_user, to_user, currency, amount, transfer_type, reference_id)
```

**RULES:**
- ✅ All wallet operations MUST use this service
- ✅ Never update `wallets` collection directly
- ✅ All operations are atomic and logged in `wallet_transactions`

---

### **nowpayments_integration.py** (Crypto Deposits)

**Purpose:** Handle all interactions with NOWPayments API for crypto deposits.

**Key Functions:**
```python
# Get supported currencies
get_available_currencies() -> List[str]

# Create deposit address
create_payment(price_amount, price_currency, pay_currency, order_id) -> {
  payment_id,
  pay_address,
  pay_amount,
  ipn_callback_url
}

# Check payment status
get_payment_status(payment_id) -> {status, confirmations, ...}

# Verify webhook signature (CRITICAL SECURITY)
verify_ipn_signature(request_data, signature) -> bool

# Check if payment is confirmed
is_payment_confirmed(payment_data) -> bool
```

**Environment Variables Required:**
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `BACKEND_URL` (for IPN callback)

**Confirmation Requirements:**
- BTC: 2 blocks
- ETH/USDT: 12 blocks
- LTC/BCH: 6 blocks
- XRP: 1 block

**CRITICAL BUG:** IPN webhook signature validation is broken. See `FLOWS.md` for details.

---

### **price_service.py** (Live Pricing)

**Purpose:** Fetch and cache live crypto and fiat exchange rates.

**APIs Used:**
- **Binance API:** Crypto prices (BTC, ETH, USDT, etc.)
- **ExchangeRate-API:** Fiat conversion rates (GBP, USD, EUR, etc.)

**Key Functions:**
```python
# Fetch live prices (cached for 10 seconds)
get_cached_prices() -> {crypto_prices, fx_rates}

# Convert crypto to fiat
convert_crypto_to_fiat(crypto, amount, fiat) -> float

# Convert fiat to crypto
convert_fiat_to_crypto(fiat, amount, crypto) -> float

# Convert crypto to crypto
convert_crypto_to_crypto(from_crypto, amount, to_crypto) -> float
```

**KNOWN ISSUE:** Rate limit errors from CoinGecko API cause conversion failures. See `KNOWN_ISSUES.md`.

---

### **live_pricing.py** (Alternative Pricing System)

**NOTE:** This is a DUPLICATE pricing system that conflicts with `price_service.py`. Should be consolidated.

---

## 📁 Key Backend Files

### **server.py** (Main Application)

**Size:** ~12,000 lines  
**Purpose:** Main FastAPI application with all API endpoints

**Key Sections:**
- Lines 1-400: Imports, models, configuration
- Lines 400-850: User authentication endpoints
- Lines 850-1600: Legacy P2P marketplace (old system)
- Lines 1600-3000: Enhanced P2P system
- Lines 3000-5000: Wallet management
- Lines 5000-7000: NOWPayments integration endpoints
- Lines 7000-8000: Swap/Convert endpoints
- Lines 8000-9000: Express Buy endpoints
- Lines 9000-11000: Admin endpoints
- Lines 11000-12000: Fee configuration, revenue tracking

**Important Constants:**
```python
PLATFORM_CONFIG = {
  "withdraw_fee_percent": 3.0,
  "p2p_trade_fee_percent": 3.0,
  "swap_fee_percent": 3.0,
  "express_buy_fee_percent": 3.0,
  "admin_wallet_id": "PLATFORM_TREASURY_WALLET"
}
```

---

### Other Service Files

- `p2p_enhanced.py` - P2P marketplace models and logic
- `p2p_wallet_service.py` - P2P-specific wallet operations
- `swap_wallet_service.py` - Swap-specific wallet operations
- `email_service.py` - Email notifications
- `referral_system.py` - Referral commissions (20% standard, 50% golden)
- `kyc_system.py` - KYC verification workflow
- `withdrawal_system.py` - Crypto withdrawal management

---

## 🎨 Frontend Structure

```
/app/frontend/src/
├── pages/
│   ├── InstantBuy.js          # Express buy + card on-ramp
│   ├── WalletPage.js          # User wallet with deposit modal
│   ├── SwapCrypto.js          # Crypto-to-crypto swaps
│   ├── P2PMarketplace.js      # P2P trading interface
│   ├── P2PTrading.js          # Active P2P trades
│   ├── AdminEarnings.js       # Admin revenue dashboard
│   └── AdminLiquidity.js      # Admin liquidity management
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── Navbar.js
│   ├── DepositModal.js        # NOWPayments deposit interface
│   └── ...
├── styles/
│   ├── premiumButtons.css     # Button animations and effects
│   └── globals.css
├── contexts/
│   └── AuthContext.js         # User authentication state
└── utils/
    └── api.js                 # Axios instance with REACT_APP_BACKEND_URL
```

**Key UI Components:**
- Button effects: Glow + scale on hover (see `premiumButtons.css`)
- Toast notifications: Using `sonner` library
- Modal components: shadcn Dialog

---

## 🔌 API Architecture

### Base URL
```bash
Frontend: process.env.REACT_APP_BACKEND_URL
Backend bind: 0.0.0.0:8001
Ingress: /api/* → Backend, /* → Frontend
```

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me (requires JWT token)
```

### Wallet Operations
```bash
GET /api/wallets/balances/{user_id}
POST /api/wallets/deposit/create
POST /api/wallets/withdraw
```

### NOWPayments
```bash
POST /api/nowpayments/create-deposit
POST /api/nowpayments/ipn              # Webhook endpoint
GET /api/nowpayments/status/{payment_id}
```

### P2P Trading
```bash
GET /api/p2p/ads
POST /api/p2p/trade/create
POST /api/p2p/trade/mark-paid
POST /api/p2p/trade/release            # Release from escrow
```

### Swaps
```bash
POST /api/swap/preview
POST /api/swap/execute
GET /api/swap/history/{user_id}
```

### Express Buy
```bash
POST /api/express-buy/match
POST /api/express-buy/execute
```

### Admin Revenue
```bash
GET /api/admin/revenue/summary
GET /api/admin/revenue/breakdown
GET /api/admin/liquidity/balances
```

---

## 💰 Money Flow Architecture

### Revenue Sources

```
┌─────────────────────────────────────────┐
│      PLATFORM REVENUE SOURCES           │
├─────────────────────────────────────────┤
│ 1. P2P Trading Fees (3%)                │
│    - Charged to seller on completion    │
│    - Stored in: internal_balances       │
│                                         │
│ 2. Swap Fees (3%)                       │
│    - Deducted from input amount         │
│    - Stored in: internal_balances       │
│                                         │
│ 3. Express Buy Profit (3%)              │
│    - Markup on admin liquidity price    │
│    - Stored in: internal_balances       │
│                                         │
│ 4. Withdrawal Fees (3%)                 │
│    - Deducted from withdrawal amount    │
│    - Stored in: internal_balances       │
│                                         │
│ 5. Referral Commissions (20%/50%)       │
│    - Paid from platform fees            │
│    - Deducted from internal_balances    │
└─────────────────────────────────────────┘
```

### Balance Flow

```
┌──────────────┐
│  User Wallet │  (wallets collection)
└──────┬───────┘
       │
       ├─ available_balance  (usable funds)
       ├─ locked_balance     (in escrow/pending)
       └─ total_balance      (available + locked)

┌──────────────────┐
│  Admin Liquidity │  (admin_liquidity_wallets)
└──────┬───────────┘
       │
       ├─ balance            (total liquidity)
       └─ reserved_balance   (in active Express Buy offers)

┌──────────────────┐
│  Platform Fees   │  (internal_balances)
└──────┬───────────┘
       │
       └─ balance            (accumulated platform profit)
```

---

## 🚨 Critical Warnings

### DO NOT:

❌ **DO NOT** update `wallets` collection directly - always use `wallet_service.py`  
❌ **DO NOT** hardcode URLs, ports, or API keys - use environment variables  
❌ **DO NOT** skip IPN signature verification - this prevents fake deposits  
❌ **DO NOT** restart supervisor for code changes - hot reload handles it  
❌ **DO NOT** delete `admin_liquidity_wallets` - it contains real balances  

### DO:

✅ **DO** test all money flows end-to-end before deploying  
✅ **DO** log all balance changes for audit trail  
✅ **DO** use atomic transactions for multi-step operations  
✅ **DO** validate all inputs before processing payments  
✅ **DO** check balance sufficiency before debiting  

---

## 📚 Related Documentation

- **FLOWS.md** - Step-by-step flow diagrams for all features
- **NOWPAYMENTS.md** - Complete NOWPayments integration guide
- **KNOWN_ISSUES.md** - All known bugs and technical debt
- **API_ENDPOINTS.md** - Complete API reference
- **README.md** - Quick start guide

---

**END OF ARCHITECTURE.MD**