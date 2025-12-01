# 💼 Wallet Integration Plan - CoinHubX

## 🎯 Current Situation

**What's Working:**
- ✅ Email/password authentication
- ✅ Internal balance tracking (users can see balances)
- ✅ P2P trades with escrow
- ✅ Withdrawal fee calculation (1%)

**What's Missing:**
- ❌ Users can't ADD their external wallet addresses
- ❌ No deposit address system
- ❌ No withdrawal address management
- ❌ No way to actually send/receive real crypto

---

## 🔧 What Needs To Be Built

### 1. Multi-Currency Wallet Address Management

**Users need to be able to:**
- Add their BTC wallet address (where they want to receive BTC)
- Add their ETH wallet address  
- Add addresses for all 12+ supported cryptocurrencies
- View/edit their saved addresses
- Set primary withdrawal addresses

**Backend Needed:**
```python
# New model
class UserWalletAddresses(BaseModel):
    user_id: str
    addresses: Dict[str, str]  # {"BTC": "1A1zP1...", "ETH": "0x742d..."}
    created_at: datetime
    updated_at: datetime

# New endpoints
POST /api/wallet/add-address
GET /api/wallet/addresses/{user_id}
PUT /api/wallet/update-address
DELETE /api/wallet/remove-address
```

**Frontend Needed:**
- Wallet Settings screen
- Add/Edit address forms
- Address validation (check format)

---

### 2. Deposit System

**Two Options:**

#### Option A: Manual Deposits (Simplest for MVP)
- Admin provides deposit addresses
- Users send crypto to those addresses
- Users submit deposit proof (tx hash)
- Admin manually credits accounts

#### Option B: Automated Deposits (Better UX)
- Integrate with crypto payment processor (e.g., NOWPayments, CoinPayments)
- Generate unique deposit address per user per currency
- Auto-credit on blockchain confirmation

**For MVP, I recommend Option A:**
```python
# Endpoint
POST /api/wallet/request-deposit
{
    "user_id": "...",
    "currency": "BTC",
    "amount": 0.1
}

# Returns
{
    "deposit_address": "1AdminWallet...",
    "deposit_id": "DEP123",
    "instructions": "Send exactly 0.1 BTC to this address"
}

# Then user submits proof
POST /api/wallet/submit-deposit-proof
{
    "deposit_id": "DEP123",
    "tx_hash": "abc123..."
}
```

---

### 3. Withdrawal System

**Flow:**
1. User selects cryptocurrency to withdraw
2. User enters amount
3. User selects/enters withdrawal address
4. System calculates 1% fee
5. System sends crypto to user's address
6. Record transaction

**Backend Needed:**
```python
POST /api/wallet/withdraw
{
    "user_id": "...",
    "currency": "BTC",
    "amount": 0.5,
    "withdrawal_address": "1UserWallet..."
}

# Returns
{
    "success": true,
    "amount": 0.5,
    "fee": 0.005,
    "net_amount": 0.495,
    "tx_hash": "xyz789..."  # After sending
}
```

**Frontend Needed:**
- Withdrawal form
- Address selector (from saved addresses)
- Fee display
- Confirmation dialog

---

## 💡 Recommended Approach

### Phase 1: Wallet Address Management (Do This First)
**Time: 1-2 hours**

1. Add wallet address management endpoints
2. Create Wallet Settings screen (web + mobile)
3. Let users add/save addresses for each crypto
4. Validate address formats

### Phase 2: Manual Deposit System (MVP)
**Time: 1 hour**

1. Create admin deposit addresses table
2. Show deposit instructions to users
3. Manual verification by admin
4. Admin credits user accounts

### Phase 3: Withdrawal System
**Time: 2 hours**

**For MVP: Manual Withdrawals**
- Users request withdrawal
- Goes to admin dashboard
- Admin manually sends crypto
- Admin marks as completed

**For Production: Automated**
- Integrate with wallet provider API
- Auto-send on withdrawal request
- Return tx hash to user

---

## 🚀 Quick Start (What to Build Now)

### Minimal Viable Implementation:

**1. User Addresses Screen**
```
╔════════════════════════════════════╗
║  My Wallet Addresses               ║
║                                    ║
║  Bitcoin (BTC)                     ║
║  [1A1zP1eP5QGefi2DMPTfTL5...]      ║
║  [Edit] [Remove]                   ║
║                                    ║
║  Ethereum (ETH)                    ║
║  [Not added] [+ Add Address]       ║
║                                    ║
║  ... (all 12 cryptos)              ║
╚════════════════════════════════════╝
```

**2. Deposit Instructions**
```
╔════════════════════════════════════╗
║  Deposit BTC                       ║
║                                    ║
║  Send your BTC to:                 ║
║  ┌────────────────────────────┐   ║
║  │ 1AdminBTCAddress...        │   ║
║  │ [Copy]  [QR Code]          │   ║
║  └────────────────────────────┘   ║
║                                    ║
║  ⚠️ Important:                     ║
║  • Minimum deposit: 0.001 BTC      ║
║  • Include your user ID in memo    ║
║  • Deposits credited after 3       ║
║    confirmations                   ║
║                                    ║
║  After sending, submit proof:      ║
║  Transaction Hash:                 ║
║  [________________________]        ║
║  [Submit for Verification]         ║
╚════════════════════════════════════╝
```

**3. Withdrawal Form**
```
╔════════════════════════════════════╗
║  Withdraw BTC                      ║
║                                    ║
║  Amount:                           ║
║  [___________] BTC                 ║
║  Available: 0.5 BTC                ║
║                                    ║
║  To Address:                       ║
║  [My saved address ▼]              ║
║  OR                                ║
║  [Enter new address________]       ║
║                                    ║
║  Summary:                          ║
║  Amount: 0.5 BTC                   ║
║  Fee (1%): 0.005 BTC               ║
║  You'll receive: 0.495 BTC         ║
║                                    ║
║  [Withdraw]                        ║
╚════════════════════════════════════╝
```

---

## ⚠️ Important Security Notes

1. **Address Validation:** Always validate crypto addresses before saving
2. **Withdrawal Limits:** Set daily/transaction limits for security
3. **2FA:** Consider adding 2FA for withdrawals
4. **Whitelisting:** Let users whitelist addresses (24hr cooldown for new addresses)
5. **Admin Approval:** For large withdrawals, require admin approval

---

## 🎯 Your Options Right Now

### Option 1: Build Full Wallet Management (Recommended)
I can build the complete wallet address management system + deposit/withdrawal screens

**Pros:**
- Complete solution
- Users can actually use the platform
- Professional UX

**Time:** ~3-4 hours

### Option 2: Integrate Third-Party Wallet Service
Use a service like:
- NOWPayments
- CoinPayments
- BitPay

**Pros:**
- Handles all crypto logic
- Auto deposits/withdrawals
- Less code to maintain

**Cons:**
- Monthly fees
- Takes commission

### Option 3: Web3 Wallet Connection
Connect MetaMask/WalletConnect for users

**Pros:**
- Users keep custody
- No need to handle crypto

**Cons:**
- Only works with Web3-compatible chains
- More complex integration

---

## ❓ What Would You Like Me To Build?

Please choose:

**A) Full Manual System** (I build everything - addresses, deposits, withdrawals)
- Best for MVP
- You manually process deposits/withdrawals in admin panel

**B) Third-Party Integration** (I integrate NOWPayments or similar)
- Automated
- Need your API keys

**C) Web3 Wallet Connection** (MetaMask integration)
- Decentralized approach
- Users sign transactions with their own wallets

**Which approach do you prefer?**
