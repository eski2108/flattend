# 📘 DEVELOPER NOTES - CoinHubX Platform

**Last Updated:** 2025-12-14  
**For:** Future developers/agents working on this codebase

---

## 🏗️ ARCHITECTURE OVERVIEW

### Backend:
- **Framework:** FastAPI (Python)
- **Database:** MongoDB
- **Payment Provider:** NOWPayments
- **Main File:** `/app/backend/server.py` (30,000+ lines)

### Frontend:
- **Framework:** React
- **Routing:** React Router
- **Styling:** Inline styles (Tailwind-like)
- **API Calls:** Axios

---

## 💾 DATABASE COLLECTIONS

### User Balances:
- **`crypto_balances`** - User crypto holdings
  - Fields: `user_id`, `currency`, `available_balance`, `locked_balance`, `total_balance`
  - USE THIS for user wallets, deposits, withdrawals
  
- **`internal_balances`** - Admin/fee wallets ONLY
  - DO NOT use for user balances

### Transactions:
- **`deposits`** - Deposit records (NOWPayments)
- **`transactions`** - Withdrawal records
- **`p2p_trades`** - P2P trading
- **`fee_transactions`** - Fee tracking

---

## 🔌 NOWPAYMENTS INTEGRATION

### What's Connected:
✅ **Deposits (Receive)** - `create_payment()` generates addresses  
✅ **Withdrawals (Send)** - `create_payout()` sends crypto

### Endpoints:
```
GET  /api/crypto-bank/deposit-address/{currency}
POST /api/wallet/send/{currency}
POST /api/nowpayments/ipn (webhook)
```

### Files:
- `/app/backend/nowpayments_integration.py` - NowPayments service
- `/app/backend/platform_wallet.py` - Deposit address generation
- `/app/backend/server.py` - API endpoints

---

## 🐛 KNOWN ISSUES (as of 2025-12-14)

### ✅ FIXED:
- P2P escrow release (was using wrong database collection)

### ⚠️ NEEDS TESTING:
- Withdrawals (code complete, not tested with real money)
- Deposit webhook (exists but not verified with live deposits)

### ❌ NOT IMPLEMENTED:
- Swap is internal only (not NOWPayments)
- P2P is peer-to-peer (not NOWPayments)
- Buy/InstantBuy are marketplace/admin liquidity (not NOWPayments)

---

## 🚨 CRITICAL RULES

### 1. Never Modify URLs in .env
- Frontend: `REACT_APP_BACKEND_URL`
- Backend: `MONGO_URL`
- These are configured by platform

### 2. Always Use Correct Database Collection
- User wallets → `crypto_balances`
- Admin/fees → `internal_balances`
- NEVER mix them up

### 3. Balance Structure
```python
{
  "user_id": "...",
  "currency": "BTC",
  "available_balance": 0.5,    # Can withdraw/trade
  "locked_balance": 0.1,       # In escrow/pending
  "total_balance": 0.6         # available + locked
}
```

### 4. Git Operations
- DON'T use git directly
- User has "Save to Github" button
- Auto-save runs every 30 minutes
- Push to ALL 10 repositories

---

## 📁 KEY FILES

### Backend:
```
/app/backend/
├── server.py (main API, 30k+ lines)
├── nowpayments_integration.py (payment provider)
├── platform_wallet.py (deposit addresses)
└── wallet_service.py (balance management)
```

### Frontend:
```
/app/frontend/src/pages/
├── SendPage.js (withdrawals)
├── ReceivePage.js (deposits)
├── WalletPage.js (main wallet)
├── SwapCrypto.js (internal swaps)
└── BuyCrypto.js (P2P marketplace)
```

---

## 🧪 TESTING

### Backend Endpoints:
```bash
# Test deposit address
curl "$API/api/crypto-bank/deposit-address/btc"

# Test send metadata
curl "$API/api/wallet/send/BTC/metadata?user_id=test"

# Check user balance
curl "$API/api/wallets/balances/USER_ID"
```

### Frontend:
```
# Send page (coin-specific)
/send/btc
/send/eth

# Receive page
/receive?asset=BTC

# Wallet
/wallet
```

---

## 💡 TIPS FOR FUTURE DEVELOPERS

### When Debugging:
1. Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
2. Check MongoDB collections directly
3. Test API endpoints with curl
4. Never assume something works - test it

### When Adding Features:
1. Read this document first
2. Check if endpoint already exists (30k lines!)
3. Use correct database collections
4. Test with real data, not mocks
5. Document what you did

### When Fixing Bugs:
1. Find root cause first
2. Check database vs code mismatch
3. Verify API responses
4. Test the fix
5. Document in FIXES_APPLIED_*.md

---

## 📞 IMPORTANT CONTACTS

- User expects HONESTY - don't claim something works if untested
- Save to ALL 10 GitHub repos
- Read `/app/CRITICAL_GIT_SAVE_INSTRUCTIONS.md`

---

**Good luck! Read the code carefully - it's large but well-structured.**
