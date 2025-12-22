# Admin Deposit System - Complete Guide

## Overview

You can now top up admin liquidity in two ways:
1. **Crypto Deposits** - Send crypto to generated deposit addresses
2. **GBP Top-Up** - Instant manual top-up via input boxes

---

## 🔷 CRYPTO DEPOSITS

### How It Works:

1. **View Deposit Addresses:**
   - Go to Admin Liquidity Manager
   - Click "👁️ Show Addresses" button
   - Your unique deposit addresses will appear

2. **Send Crypto:**
   - Copy the address for the currency you want to deposit
   - Send crypto from your external wallet to that address
   - Wait for blockchain confirmation

3. **Automatic Credit:**
   - System monitors addresses for incoming transactions
   - Once confirmed, liquidity automatically updates
   - You'll see the new balance in the admin panel

### Supported Cryptocurrencies:

**Bitcoin Network:**
- BTC (Bitcoin)
- LTC (Litecoin)
- DOGE (Dogecoin)

**Ethereum Network (ERC-20):**
- ETH (Ethereum)
- USDT_ERC20 (Tether on Ethereum)
- USDC_ERC20 (USD Coin on Ethereum)
- DAI (Dai Stablecoin)

**Tron Network (TRC-20):**
- TRX (Tron)
- USDT_TRC20 (Tether on Tron)

**Binance Smart Chain (BEP-20):**
- BNB (Binance Coin)
- USDT_BEP20 (Tether on BSC)
- BUSD (Binance USD)

**Other Networks:**
- XRP (Ripple)
- ADA (Cardano)
- SOL (Solana)
- MATIC (Polygon)

### Important Notes:

⚠️ **DEMO MODE:**
The current addresses are **example addresses for testing**.

For production, you must:
1. Integrate with NOWPayments API for real deposit addresses
2. Or implement your own wallet infrastructure with:
   - HD wallet generation
   - Secure private key storage
   - Blockchain monitoring
   - Automatic deposit detection

---

## 💷 GBP INSTANT TOP-UP

### How It Works:

1. **Quick Add Method:**
   - Find "Quick GBP Top-Up" section
   - Enter amount (e.g., 10000)
   - Click **+** button
   - Amount instantly added to GBP liquidity

2. **Set Exact Balance Method:**
   - Scroll to GBP currency card
   - Enter exact new balance you want
   - Click "Update Balance"
   - Balance immediately updates

### Example:

**Current GBP Liquidity:** £50,000

**Method 1 (Quick Add):**
- Enter: 10000
- Click: +
- New Balance: £60,000 ✅

**Method 2 (Set Exact):**
- Enter: 75000
- Click: Update Balance
- New Balance: £75,000 ✅

---

## 🔄 REAL-TIME UPDATES

### How Balances Update:

**Crypto Deposits:**
1. You send crypto to deposit address
2. Transaction broadcasts to blockchain
3. System detects incoming transaction
4. After X confirmations:
   - BTC: 2 confirmations (~20 mins)
   - ETH: 12 confirmations (~3 mins)
   - USDT (TRC-20): 19 confirmations (~1 min)
5. Admin liquidity automatically increases
6. Deposit logged in `admin_deposits` collection

**GBP Top-Ups:**
1. You enter amount and click +
2. Instantly updates `admin_liquidity_wallets`
3. Balance reflects immediately
4. No waiting time

### Checking Status:

```javascript
// View recent deposits
db.admin_deposits.find().sort({processed_at: -1}).limit(10)

// Check current liquidity
db.admin_liquidity_wallets.find({currency: "BTC"})
```

---

## 📊 MONITORING DEPOSITS

### Database Collections:

**1. `admin_deposit_addresses`**
Stores your unique deposit addresses:
```javascript
{
  "admin_id": "admin_liquidity",
  "addresses": {
    "BTC": "1abc123...",
    "ETH": "0xabc123...",
    "USDT_ERC20": "0xabc123...",
    // ... more currencies
  },
  "created_at": "2025-12-03T00:00:00Z"
}
```

**2. `admin_deposits`**
Logs all deposits:
```javascript
{
  "currency": "BTC",
  "amount": 0.5,
  "tx_hash": "abc123def456...",
  "status": "completed",
  "type": "crypto_deposit",
  "processed_at": "2025-12-03T12:00:00Z"
}
```

**3. `admin_liquidity_wallets`**
Updated automatically:
```javascript
{
  "currency": "BTC",
  "balance": 5.5,  // Increased by 0.5
  "available": 5.5,
  "reserved": 0,
  "updated_at": "2025-12-03T12:00:00Z"
}
```

---

## 🔧 BACKEND IMPLEMENTATION

### Files Created:

**1. `/app/backend/admin_wallet_generator.py`**
- Generates unique deposit addresses
- Uses deterministic hashing for consistency
- Supports all major crypto networks

**2. `/app/backend/deposit_monitor.py`**
- Monitors blockchain for incoming transactions
- Processes deposits automatically
- Updates admin liquidity in real-time

### API Endpoints:

**GET `/api/admin/deposit-addresses`**
Returns deposit addresses for all currencies:
```json
{
  "success": true,
  "addresses": {
    "BTC": "1abc...",
    "ETH": "0xabc...",
    // ...
  }
}
```

**POST `/api/admin/manual-deposit`**
Manually record a crypto deposit:
```json
{
  "currency": "BTC",
  "amount": 0.5,
  "note": "Manual top-up from cold wallet"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added 0.5 BTC to liquidity"
}
```

---

## 🚀 PRODUCTION SETUP

### For Real Crypto Deposits:

**Option 1: NOWPayments Integration**
```python
# Use NOWPayments API to generate real addresses
import requests

api_key = "your_nowpayments_api_key"

# Create deposit address
response = requests.post(
    "https://api.nowpayments.io/v1/deposit",
    headers={"x-api-key": api_key},
    json={"currency": "btc"}
)

address = response.json()["address"]
```

**Option 2: Own Wallet Infrastructure**
```python
# Bitcoin
from bitcoinlib.wallets import Wallet
wallet = Wallet.create('admin_btc_wallet')
address = wallet.new_key().address

# Ethereum
from web3 import Web3
from eth_account import Account
account = Account.create()
address = account.address
```

### Monitoring Setup:

**1. Webhook Method (Recommended):**
- Set up webhook endpoints
- Register with blockchain explorer APIs
- Receive instant notifications on deposits

**2. Polling Method:**
- Periodically check address balances
- Compare with last known balance
- Process new deposits

**3. WebSocket Method:**
- Connect to blockchain nodes
- Subscribe to address events
- Real-time deposit detection

---

## 🛡️ SECURITY CONSIDERATIONS

### Private Key Management:

1. **Never store private keys in code**
2. Use environment variables or secure vaults
3. Implement key rotation policies
4. Use HD wallets for better security

### Address Verification:

1. Always verify addresses before sending large amounts
2. Use checksums (BTC addresses have built-in checksums)
3. Test with small amounts first

### Monitoring:

1. Log all deposit attempts
2. Alert on large deposits
3. Flag unusual patterns
4. Regular balance reconciliation

---

## 📋 TESTING THE SYSTEM

### Test Crypto Deposit (Manual):

```bash
# Using curl to simulate a deposit
curl -X POST https://crypto-trust-guard.preview.emergentagent.com/api/admin/manual-deposit \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "BTC",
    "amount": 0.01,
    "note": "Test deposit"
  }'
```

### Test GBP Top-Up:

1. Go to Admin Liquidity Manager
2. Enter 1000 in GBP quick add
3. Click + button
4. Verify GBP balance increased by 1000

### Verify in Database:

```javascript
// Check liquidity updated
db.admin_liquidity_wallets.findOne({currency: "BTC"})

// Check deposit logged
db.admin_deposits.find().sort({processed_at: -1}).limit(1)
```

---

## 🎯 BEST PRACTICES

1. **Regular Monitoring:**
   - Check liquidity levels daily
   - Set up low balance alerts
   - Monitor deposit addresses for suspicious activity

2. **Backup Procedures:**
   - Backup private keys securely (offline)
   - Document wallet seed phrases
   - Test recovery procedures

3. **Record Keeping:**
   - Keep logs of all deposits
   - Reconcile with blockchain explorers
   - Maintain audit trail

4. **Risk Management:**
   - Don't store all funds in hot wallets
   - Use cold storage for reserves
   - Implement multi-signature for large amounts

---

## ❓ TROUBLESHOOTING

### Deposit Not Showing Up:

1. Check blockchain confirmation status
2. Verify correct address was used
3. Check deposit monitor is running
4. Manually process using `/api/admin/manual-deposit`

### GBP Top-Up Not Working:

1. Check backend is running
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Restart backend if needed

### Addresses Not Generating:

1. Check `admin_wallet_generator.py` is imported correctly
2. Verify database connection
3. Check logs for errors
4. Manually trigger generation via API call

---

## 📞 SUPPORT

For issues:
1. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
2. Check deposit monitor logs
3. Verify database connectivity
4. Review transaction hashes on blockchain explorers

---

**System Status:** ✅ OPERATIONAL (DEMO MODE)
**Last Updated:** December 3, 2025
**Version:** 1.0
