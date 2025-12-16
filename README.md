# 🚀 CoinHubX Platform

**A full-stack cryptocurrency trading platform with P2P marketplace, instant buy, swaps, and crypto deposits.**

---

# ⚠️ ENVIRONMENT SETUP (ENV) – REQUIRED ⚠️

## 🚨 THIS PROJECT WILL NOT RUN WITHOUT ENV CONFIGURATION 🚨

**Before running this project, you MUST configure environment variables:**

### Backend Setup (REQUIRED)
```bash
cd backend
cp .env.example .env
nano .env  # Fill in all required values
```

### Frontend Setup (REQUIRED)
```bash
cd frontend
cp .env.example .env
nano .env  # Fill in backend URL
```

### Required Variables Summary

| Variable | Location | Where to Get |
|----------|----------|--------------|
| `MONGO_URL` | backend/.env | [MongoDB Atlas](https://cloud.mongodb.com) |
| `JWT_SECRET` | backend/.env | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SENDGRID_API_KEY` | backend/.env | [SendGrid](https://sendgrid.com) |
| `NOWPAYMENTS_API_KEY` | backend/.env | [NOWPayments](https://nowpayments.io) |
| `REACT_APP_BACKEND_URL` | frontend/.env | Your backend URL |

### Security Notice
- ✅ `.env.example` files are committed (templates only)
- ❌ `.env` files are **NOT** committed (contain secrets)
- ❌ **NO secrets are stored in GitHub**

### Full Documentation
- 📖 **Backend:** [`backend/ENV_SETUP.md`](./backend/ENV_SETUP.md)
- 📖 **Template:** [`backend/.env.example`](./backend/.env.example)

---

## 📋 Quick Links

- **🏗️ [System Architecture](docs/ARCHITECTURE.md)** - Complete system overview
- **🔄 [Money Flows](docs/FLOWS.md)** - Step-by-step flow diagrams
- **💳 [NOWPayments Integration](docs/NOWPAYMENTS.md)** - Crypto deposits guide
- **🔌 [API Endpoints](docs/API_ENDPOINTS.md)** - Complete API reference
- **⚠️ [Known Issues](docs/KNOWN_ISSUES.md)** - Bugs and technical debt

---

## 🎯 Features

### ✅ Fully Working

- **User Authentication** - Register, login, JWT tokens
- **Multi-Currency Wallets** - BTC, ETH, USDT, GBP support
- **Crypto Deposits** - Via NOWPayments (partially working)
- **P2P Marketplace** - Peer-to-peer crypto trading (partially working)
- **Crypto Swaps** - Convert between cryptocurrencies
- **Express Buy** - Instant crypto purchase from admin liquidity
- **Referral System** - 20% standard, 50% golden tier commissions
- **Admin Revenue Dashboard** - Track all platform earnings
- **Admin Liquidity Management** - Manage instant buy liquidity

### ⚠️ Partially Working

- **Crypto Deposits (NOWPayments)** - Address generation works, webhook broken
- **P2P Trading** - Trade creation works, escrow release broken
- **Pricing System** - Works but unstable (API rate limits)

### 🚧 Not Yet Implemented

- Card on-ramp integration (Guardarian)
- Crypto withdrawals (basic structure exists)
- KYC verification (backend exists, no UI)
- Admin CMS (basic functionality only)

---

## 🛠️ Tech Stack

### Backend
```
Framework: FastAPI (Python 3.10+)
Database: MongoDB (Motor async driver)
Authentication: JWT
Process Manager: Supervisor
Port: 8001 (internal)
```

### Frontend
```
Framework: React 18
Styling: TailwindCSS + shadcn/ui
HTTP Client: Axios
State Management: React Context
Port: 3000
```

### Infrastructure
```
Deployment: Kubernetes cluster
Ingress: /api/* → Backend, /* → Frontend
Hot Reload: Enabled (auto-restart on file changes)
```

---

## 💻 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB running
- NOWPayments account (for crypto deposits)

### Backend Setup

```bash
# Navigate to backend
cd /app/backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
nano .env

# Required variables:
# MONGO_URL=mongodb://localhost:27017/
# DB_NAME=coinhubx
# NOWPAYMENTS_API_KEY=your_key_here
# NOWPAYMENTS_IPN_SECRET=your_secret_here
# BACKEND_URL=https://your-domain.com

# Start backend (via supervisor)
sudo supervisorctl restart backend

# Or run directly for development
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# Navigate to frontend
cd /app/frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
nano .env

# Required variable:
# REACT_APP_BACKEND_URL=https://your-backend-url.com

# Start frontend (via supervisor)
sudo supervisorctl restart frontend

# Or run directly for development
yarn start
```

### Check Status

```bash
# Check all services
sudo supervisorctl status

# Should show:
# backend    RUNNING
# frontend   RUNNING
```

---

## 📊 Project Structure

```
/app/
├── backend/
│   ├── server.py                    # Main FastAPI app (12k lines)
│   ├── wallet_service.py            # Central wallet operations
│   ├── nowpayments_integration.py   # Crypto deposits
│   ├── price_service.py             # Live pricing
│   ├── p2p_enhanced.py              # P2P marketplace logic
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── InstantBuy.js        # Express buy UI
│   │   │   ├── WalletPage.js        # User wallets + deposits
│   │   │   ├── SwapCrypto.js        # Crypto swaps
│   │   │   ├── P2PMarketplace.js    # P2P trading
│   │   │   └── AdminEarnings.js     # Revenue dashboard
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn components
│   │   │   └── DepositModal.js      # NOWPayments UI
│   │   ├── styles/
│   │   │   └── premiumButtons.css   # Button animations
│   │   └── contexts/
│   │       └── AuthContext.js       # User auth state
│   ├── package.json
│   └── .env
├── docs/                         # 📚 COMPREHENSIVE DOCUMENTATION
│   ├── ARCHITECTURE.md
│   ├── FLOWS.md
│   ├── NOWPAYMENTS.md
│   ├── API_ENDPOINTS.md
│   └── KNOWN_ISSUES.md
└── README.md                     # This file
```

---

## 📡 API Overview

**Base URL:** `{BACKEND_URL}/api`

### Key Endpoints

```bash
# Authentication
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

# Wallets
GET    /api/wallets/balances/{user_id}
GET    /api/wallets/transactions/{user_id}

# Crypto Deposits (NOWPayments)
POST   /api/nowpayments/create-deposit
GET    /api/nowpayments/status/{payment_id}
POST   /api/nowpayments/ipn  # Webhook (called by NOWPayments)

# P2P Trading
GET    /api/p2p/ads
POST   /api/p2p/trade/create
POST   /api/p2p/trade/mark-paid
POST   /api/p2p/trade/release

# Swaps
POST   /api/swap/preview
POST   /api/swap/execute

# Express Buy
GET    /api/express-buy/offers
POST   /api/express-buy/execute

# Admin
GET    /api/admin/revenue/summary
GET    /api/admin/liquidity/balances
```

Full documentation: [API_ENDPOINTS.md](docs/API_ENDPOINTS.md)

---

## 💾 Database Schema

### Core Collections

```javascript
// User accounts
users: {
  user_id, email, password_hash, full_name, role, created_at
}

// User wallets (multi-currency)
wallets: {
  user_id, currency, available_balance, locked_balance, total_balance
}

// Admin liquidity pool
admin_liquidity_wallets: {
  currency, balance, reserved_balance
}

// Platform fee wallet
internal_balances: {
  currency, balance, revenue_breakdown
}

// Crypto deposits
nowpayment_deposits: {
  payment_id, user_id, pay_address, status, network_confirmations
}

// P2P trades
p2p_trades: {
  trade_id, seller_id, buyer_id, crypto_amount, fiat_amount, status
}

// Swap transactions
swap_transactions: {
  swap_id, user_id, from_currency, to_currency, exchange_rate
}

// Express Buy transactions
express_buy_transactions: {
  transaction_id, user_id, crypto_amount, fiat_amount, admin_profit
}
```

Full schema: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🚨 Critical Issues to Fix

### 🔴 P0 - MUST FIX IMMEDIATELY

1. **NOWPayments IPN Webhook Broken**
   - 46+ deposits stuck, users' funds not credited
   - Signature validation failing
   - Fix: Debug `verify_ipn_signature()` in `nowpayments_integration.py`

2. **P2P Escrow Release Broken**
   - Completed trades don't unlock funds
   - Buyers never receive crypto
   - Fix: Debug `p2p_release_crypto_with_wallet()` in `server.py`

3. **Missing Fee Tracking**
   - P2P, Swap, Express Buy fees not saved per transaction
   - No audit trail for profitability
   - Fix: Update insert statements to save `fee_amount`

### 🟠 P1 - HIGH PRIORITY

4. **Pricing System Unreliable**
   - API rate limits causing failures
   - Two conflicting systems
   - Fix: Unify + add caching + fallbacks

5. **Admin Liquidity Offers Empty**
   - Express Buy not working
   - Fix: Recreate P2P ads from liquidity balances

Full list: [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)

---

## 🧪 Testing

### Manual Testing

```bash
# Test backend health
curl https://your-backend-url.com/api/

# Test authentication
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check user balance
curl https://your-backend-url.com/api/wallets/balances/USER_ID
```

### Using Testing Agent

This platform has a dedicated testing agent for end-to-end testing:

```bash
# Read test results
cat /app/test_result.md

# Testing agent protocol is documented in test_result.md
```

### Test Credentials

```
Admin:  p2padmin@demo.com / Demo1234
Seller: p2p_demo_seller@demo.com / Demo1234
Buyer:  p2p_demo_buyer@demo.com / Demo1234
User:   gads21083@gmail.com / Demo1234
```

---

## 🔐 Security Notes

### Critical Security Practices

✅ **DO:**
- Always verify NOWPayments IPN signatures
- Use JWT tokens for authentication
- Validate all inputs (amounts, addresses, IDs)
- Use wallet_service for all balance operations
- Log all money-related transactions
- Check balance sufficiency before debiting

❌ **DO NOT:**
- Skip IPN signature verification
- Update wallets collection directly
- Hardcode API keys or URLs
- Trust frontend input without validation
- Delete wallet transactions (audit trail)
- Use `DELETE` operations on money-related data

### Environment Variables (Never Hardcode)

**Backend (.env):**
```bash
MONGO_URL=mongodb://...
DB_NAME=coinhubx
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
BACKEND_URL=https://...
```

**Frontend (.env):**
```bash
REACT_APP_BACKEND_URL=https://...
```

---

## 🛠️ Troubleshooting

### Service Not Starting

```bash
# Check supervisor logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log

# Restart service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Check for Python errors
cd /app/backend && python server.py

# Check for Node errors
cd /app/frontend && yarn start
```

### Deposits Not Working

```bash
# Check NOWPayments webhook logs
tail -f /var/log/supervisor/backend.out.log | grep IPN

# Check stuck deposits in database
mongo
use coinhubx
db.nowpayment_deposits.find({status: "waiting"})
```

### P2P Trades Failing

```bash
# Check trade status
db.p2p_trades.findOne({trade_id: "..."})

# Check seller wallet
db.wallets.findOne({user_id: seller_id, currency: "BTC"})

# Check escrow locks
db.wallets.find({locked_balance: {$gt: 0}})
```

Full troubleshooting: [NOWPAYMENTS.md](docs/NOWPAYMENTS.md#troubleshooting)

---

## 📚 Documentation Index

### For New Developers

1. **Start here:** [README.md](README.md) (you are here)
2. **Understand the system:** [ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. **Learn money flows:** [FLOWS.md](docs/FLOWS.md)
4. **Review API:** [API_ENDPOINTS.md](docs/API_ENDPOINTS.md)
5. **Check known issues:** [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)

### For Integrations

- **NOWPayments deposits:** [NOWPAYMENTS.md](docs/NOWPAYMENTS.md)
- **Pricing APIs:** See `ARCHITECTURE.md` → Backend Services
- **Referral system:** See `FLOWS.md` → Referral Commission Flow

### For Bug Fixes

1. Check [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for known bugs
2. Review [FLOWS.md](docs/FLOWS.md) for affected flow
3. Check [ARCHITECTURE.md](docs/ARCHITECTURE.md) for file locations
4. Use `grep` to find relevant code
5. Add tests before fixing

---

## ℹ️ Additional Resources

### External Documentation

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **React Docs:** https://react.dev
- **MongoDB Docs:** https://www.mongodb.com/docs
- **NOWPayments API:** https://documenter.getpostman.com/view/7907941/S1a32n38
- **shadcn/ui:** https://ui.shadcn.com

### Getting Help

If you're stuck:

1. Check the `/docs` folder first
2. Search codebase with `grep -r "error message"`
3. Check supervisor logs for errors
4. Review MongoDB data for inconsistencies
5. Use troubleshoot_agent for complex issues

---

## 🚀 Deployment

### Kubernetes Deployment

This app is designed to run in a Kubernetes cluster with supervisor managing processes.

**Do not modify:**
- Backend bind address (0.0.0.0:8001)
- Frontend port (3000)
- Ingress rules (/api prefix)

**Can modify:**
- Environment variables
- Dependencies (requirements.txt, package.json)
- Code (hot reload will restart)

### Restart After Changes

```bash
# .env changes require restart
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Dependency changes require restart
cd /app/backend && pip install -r requirements.txt
sudo supervisorctl restart backend

cd /app/frontend && yarn install
sudo supervisorctl restart frontend

# Code changes auto-restart (hot reload)
# No action needed
```

---

## 🎉 Contributing

When modifying this codebase:

1. **Read docs first** - Understand before changing
2. **Test thoroughly** - Use testing agent for money flows
3. **Update docs** - If you change architecture/flows
4. **Add to KNOWN_ISSUES.md** - Document any new bugs found
5. **Follow conventions** - Match existing code style

---

## 📝 License

Proprietary - CoinHubX Platform

---

**Built with ❤️ by Emergent Labs**

---

**Quick Command Reference:**

```bash
# Check status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart backend frontend

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log

# Check database
mongo
use coinhubx
show collections

# Test API
curl https://your-backend-url.com/api/
```

---

**END OF README**