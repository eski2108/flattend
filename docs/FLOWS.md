# 🔄 CoinHubX Money Flow Documentation

**Last Updated:** November 2024  
**Purpose:** Step-by-step documentation of all financial flows in the platform

---

## 📋 Table of Contents

1. [NOWPayments Deposit Flow](#nowpayments-deposit-flow)
2. [Express Buy Flow](#express-buy-flow)
3. [P2P Escrow Flow](#p2p-escrow-flow)
4. [Swap/Convert Flow](#swapconvert-flow)
5. [Withdrawal Flow](#withdrawal-flow)
6. [Referral Commission Flow](#referral-commission-flow)
7. [Admin Revenue Tracking](#admin-revenue-tracking)

---

## 💳 NOWPayments Deposit Flow

### Overview
Users deposit crypto (BTC, ETH, USDT) via NOWPayments API. The platform generates a unique deposit address for each transaction.

### Step-by-Step Flow

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│   Backend    │────▶│NOWPayments│
│          │     │          │     │              │     │   API     │
└──────────┘     └──────────┘     └──────────────┘     └──────────┘
     │                │                  │                   │
     │                │                  │                   │
     ▼                ▼                  ▼                   ▼
```

#### **STEP 1: User Initiates Deposit**

**Frontend:** `WalletPage.js` → `DepositModal.js`

```javascript
// User selects:
- Currency (BTC, ETH, USDT)
- Network (Bitcoin, Ethereum, etc.)
- Amount (optional, can send any amount)

// Frontend calls:
POST /api/nowpayments/create-deposit
{
  user_id: "uuid",
  currency: "btc",
  amount: 100  // USD equivalent
}
```

---

#### **STEP 2: Backend Creates Payment**

**Backend:** `server.py` → `/api/nowpayments/create-deposit`

```python
# 1. Validate user exists
user = await db.user_accounts.find_one({"user_id": request.user_id})

# 2. Generate unique order ID
order_id = f"{user_id}_{int(time.time())}"

# 3. Call NOWPayments API
payment = nowpayments_service.create_payment(
    price_amount=amount,
    price_currency="usd",
    pay_currency=currency,
    order_id=order_id,
    order_description="Crypto deposit"
)

# Returns:
{
  "payment_id": "12345678",
  "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "pay_amount": 0.001,
  "pay_currency": "btc",
  "order_id": "user123_1700000000"
}
```

**Backend Action:**
```python
# 4. Save to database
await db.nowpayment_deposits.insert_one({
    "deposit_id": str(uuid4()),
    "user_id": user_id,
    "payment_id": payment["payment_id"],
    "pay_address": payment["pay_address"],
    "pay_currency": currency,
    "pay_amount": payment["pay_amount"],
    "price_amount": amount,
    "price_currency": "usd",
    "status": "waiting",  # Initial status
    "network_confirmations": 0,
    "created_at": datetime.now(timezone.utc)
})
```

---

#### **STEP 3: User Sends Crypto**

**Frontend:** Displays QR code and address

```
┌─────────────────────────────────────────┐
│   Deposit BTC                           │
│                                         │
│   Send BTC to this address:             │
│   1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa    │
│                                         │
│   [QR CODE]                             │
│                                         │
│   Amount: 0.001 BTC (≈ $50 USD)        │
│   Network: Bitcoin                      │
│   Status: ⏳ Waiting for payment...     │
└─────────────────────────────────────────┘
```

**User Action:**
- Copies address or scans QR code
- Sends crypto from their external wallet
- Transaction appears on blockchain

---

#### **STEP 4: NOWPayments Detects Payment**

**NOWPayments Side:**
```
1. Monitors blockchain for incoming transactions
2. Detects payment to generated address
3. Counts network confirmations (0 → 1 → 2...)
4. When status changes, sends webhook callback
```

**Webhook Trigger Events:**
- `waiting` → Transaction detected (0 confirmations)
- `confirming` → Confirmations increasing (1, 2, 3...)
- `confirmed` → Minimum confirmations reached
- `finished` → Payment fully processed

---

#### **STEP 5: IPN Webhook Callback** ⚠️ **CRITICAL - CURRENTLY BROKEN**

**NOWPayments sends POST request to:**
```
POST https://quickstart-27.preview.emergentagent.com/api/nowpayments/ipn

Headers:
  x-nowpayments-sig: "hmac_sha512_signature"
  Content-Type: application/json

Body:
{
  "payment_id": "12345678",
  "payment_status": "confirmed",
  "pay_address": "1A1zP...",
  "pay_currency": "btc",
  "pay_amount": 0.001,
  "actually_paid": 0.001,
  "price_amount": 50,
  "price_currency": "usd",
  "order_id": "user123_1700000000",
  "network_confirmations": 2,
  "created_at": "2024-11-25T12:00:00Z",
  "updated_at": "2024-11-25T12:10:00Z"
}
```

---

#### **STEP 6: Backend Processes Webhook** ⚠️ **CURRENTLY BROKEN**

**Backend:** `server.py` → `/api/nowpayments/ipn`

**Current Implementation (BROKEN):**

```python
@api_router.post("/nowpayments/ipn")
async def nowpayments_ipn_handler(request: Request):
    # 1. Get raw request body
    raw_body = await request.body()
    
    # 2. Get signature from header
    signature = request.headers.get('x-nowpayments-sig')
    
    # 3. Verify signature (⚠️ THIS STEP IS FAILING)
    is_valid = nowpayments_service.verify_ipn_signature(
        request_data=raw_body,
        signature=signature
    )
    
    if not is_valid:
        logger.error("❌ IPN signature validation FAILED")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # 4. Parse JSON
    payment_data = await request.json()
    
    # 5. Check if payment is confirmed
    if nowpayments_service.is_payment_confirmed(payment_data):
        # 6. Credit user wallet
        await wallet_service.credit(
            user_id=deposit["user_id"],
            currency=payment_data["pay_currency"].upper(),
            amount=payment_data["actually_paid"],
            transaction_type="deposit",
            reference_id=payment_data["payment_id"],
            metadata=payment_data
        )
        
        # 7. Update deposit status
        await db.nowpayment_deposits.update_one(
            {"payment_id": payment_data["payment_id"]},
            {
                "$set": {
                    "status": "confirmed",
                    "network_confirmations": payment_data["network_confirmations"],
                    "credited_at": datetime.now(timezone.utc)
                }
            }
        )
```

**Why It's Broken:**

The signature verification in `nowpayments_integration.py` is failing:

```python
def verify_ipn_signature(self, request_data: bytes, signature: str) -> bool:
    # ISSUE: Signature calculation doesn't match NOWPayments' format
    calculated_sig = hmac.new(
        self.ipn_secret.encode('utf-8'),
        request_data,
        hashlib.sha512
    ).hexdigest()
    
    # This comparison always returns False
    return hmac.compare_digest(calculated_sig, signature)
```

**Result:** All 46+ deposits are stuck at "waiting" status because the webhook is rejected.

---

#### **STEP 7: User Sees Updated Balance** (When Fixed)

**Frontend:** `WalletPage.js` auto-refreshes

```
┌─────────────────────────────────────────┐
│   Your Wallets                          │
│                                         │
│   BTC  0.001  ✅ Deposit confirmed!     │
│   ETH  0.000                            │
│   USDT 0.000                            │
│   GBP  0.00                             │
└─────────────────────────────────────────┘
```

---

### Current Status

- ✅ **Address generation:** Working
- ✅ **User sends crypto:** Working
- ✅ **NOWPayments detects:** Working
- ❌ **Webhook validation:** **BROKEN**
- ❌ **Balance credit:** **NOT HAPPENING**

**Impact:** 46+ deposits totaling significant value are stuck.

**Fix Required:** Debug and fix signature verification in `nowpayments_integration.py`.

---

## 🏪 Express Buy Flow

### Overview
Users buy crypto instantly from admin liquidity pool at a 3% markup.

### Step-by-Step Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  User    │────▶│  Frontend    │────▶│   Backend        │────▶│  Database   │
│          │     │InstantBuy.js │     │express_buy_execute│     │  (wallets)  │
└──────────┘     └──────────────┘     └──────────────────┘     └─────────────┘
```

#### **STEP 1: User Initiates Purchase**

**Frontend:** `InstantBuy.js`

```javascript
// User inputs:
- Buy Amount: 100 GBP
- Currency: BTC

// Calculate:
- Market Price: 50,000 GBP/BTC
- Platform Markup: 3%
- Express Buy Price: 51,500 GBP/BTC
- You Get: 0.00194174 BTC

// Call:
POST /api/express-buy/execute
{
  user_id: "uuid",
  fiat_currency: "GBP",
  fiat_amount: 100,
  crypto_currency: "BTC"
}
```

---

#### **STEP 2: Backend Validates & Executes**

**Backend:** `server.py` → `/api/express-buy/execute`

```python
# 1. Check user GBP balance
user_wallet = await wallet_service.get_balance(user_id, "GBP")
if user_wallet["available_balance"] < fiat_amount:
    raise HTTPException(400, "Insufficient GBP balance")

# 2. Check admin has enough crypto liquidity
admin_liquidity = await db.admin_liquidity_wallets.find_one({
    "currency": crypto_currency
})

if admin_liquidity["balance"] < crypto_amount:
    raise HTTPException(400, "Insufficient admin liquidity")

# 3. Calculate amounts
market_price = price_service.get_price(crypto_currency, fiat_currency)
marked_up_price = market_price * 1.03  # 3% markup
crypto_amount = fiat_amount / marked_up_price
admin_profit = fiat_amount * 0.03

# 4. Execute atomic transaction
# 4a. Debit user GBP
await wallet_service.debit(
    user_id=user_id,
    currency="GBP",
    amount=fiat_amount,
    transaction_type="express_buy",
    reference_id=transaction_id
)

# 4b. Credit user crypto
await wallet_service.credit(
    user_id=user_id,
    currency=crypto_currency,
    amount=crypto_amount,
    transaction_type="express_buy",
    reference_id=transaction_id
)

# 4c. Deduct from admin liquidity
await db.admin_liquidity_wallets.update_one(
    {"currency": crypto_currency},
    {"$inc": {"balance": -crypto_amount}}
)

# 4d. Credit platform fees (admin profit)
await db.internal_balances.update_one(
    {"currency": "GBP"},
    {"$inc": {
        "balance": admin_profit,
        "revenue_breakdown.express_buy_profit": admin_profit
    }}
)

# 5. Save transaction ⚠️ BUG: admin_profit field not saved
await db.express_buy_transactions.insert_one({
    "transaction_id": transaction_id,
    "user_id": user_id,
    "crypto_currency": crypto_currency,
    "crypto_amount": crypto_amount,
    "fiat_currency": fiat_currency,
    "fiat_amount": fiat_amount,
    "price_per_unit": marked_up_price,
    "admin_profit": 0,  # ⚠️ BUG: Should be admin_profit
    "status": "completed",
    "created_at": datetime.now(timezone.utc)
})
```

---

#### **STEP 3: User Sees Updated Balance**

**Frontend:** Toast notification + balance refresh

```
✅ Purchase successful!
   Bought 0.00194174 BTC for 100 GBP

Your Balances:
   BTC: 0.00194174 (+0.00194174)
   GBP: 400 (-100)
```

---

### Money Flow Summary

```
User GBP Wallet:      -100 GBP
   ↓
User BTC Wallet:      +0.00194174 BTC
   ↓
Admin Liquidity:      -0.00194174 BTC
   ↓
Platform Fee Wallet:  +3 GBP (3% profit)
```

### Current Issues

⚠️ **BUG:** `admin_profit` field in `express_buy_transactions` is always 0. Should store the actual profit for audit trail.

**Impact:** Cannot track per-transaction profitability.

**Fix Required:** Update the insert statement to save `admin_profit: admin_profit` instead of hardcoded 0.

---

## 🤝 P2P Escrow Flow

### Overview
Peer-to-peer trading with crypto held in escrow until buyer confirms fiat payment.

### Step-by-Step Flow

```
┌────────┐    ┌────────┐    ┌─────────┐    ┌──────────┐
│ Seller │───▶│ Escrow │◀───│  Buyer  │───▶│  Seller  │
│ (locks)│    │(locked)│    │ (pays)  │    │(receives)│
└────────┘    └────────┘    └─────────┘    └──────────┘
```

#### **STEP 1: Seller Creates Ad**

**Frontend:** `P2PMarketplace.js`

```javascript
POST /api/p2p/ad/create
{
  seller_id: "uuid",
  crypto_currency: "BTC",
  crypto_amount: 0.1,
  fiat_currency: "GBP",
  price_per_unit: 50000,
  payment_methods: ["bank_transfer"],
  min_order: 100,
  max_order: 5000
}
```

**Backend Action:**
```python
# Lock crypto in seller's wallet
await wallet_service.lock_balance(
    user_id=seller_id,
    currency="BTC",
    amount=0.1,
    lock_type="p2p_ad",
    reference_id=ad_id
)

# Create ad
await db.p2p_ads.insert_one({...})
```

---

#### **STEP 2: Buyer Creates Trade**

**Frontend:** Buyer clicks "Buy" on seller's ad

```javascript
POST /api/p2p/trade/create
{
  ad_id: "uuid",
  buyer_id: "uuid",
  fiat_amount: 500  // Buy £500 worth
}
```

**Backend:**
```python
# Calculate amounts
price_per_unit = ad["price_per_unit"]
crypto_amount = fiat_amount / price_per_unit  # 0.01 BTC

# Move from seller's locked to escrow
await wallet_service.unlock_balance(seller_id, "BTC", crypto_amount, ...)
await wallet_service.lock_balance(seller_id, "BTC", crypto_amount, "p2p_escrow", trade_id)

# Create trade
await db.p2p_trades.insert_one({
    "trade_id": trade_id,
    "ad_id": ad_id,
    "seller_id": seller_id,
    "buyer_id": buyer_id,
    "crypto_currency": "BTC",
    "crypto_amount": 0.01,
    "fiat_currency": "GBP",
    "fiat_amount": 500,
    "payment_method": "bank_transfer",
    "status": "pending",  # Buyer must pay
    "escrow_locked": True,
    "created_at": datetime.now(timezone.utc)
})
```

**Frontend:** Displays seller's bank details

```
┌─────────────────────────────────────────┐
│   Trade #ABC123                         │
│                                         │
│   Send £500 to:                         │
│   Bank: Barclays                        │
│   Account: John Doe                     │
│   Sort Code: 12-34-56                   │
│   Account Number: 12345678              │
│                                         │
│   Payment Method: Bank Transfer         │
│   Time Remaining: 29:45                 │
│                                         │
│   [I Have Paid] [Cancel Trade]          │
└─────────────────────────────────────────┘
```

---

#### **STEP 3: Buyer Marks As Paid**

**Frontend:** Buyer clicks "I Have Paid"

```javascript
POST /api/p2p/trade/mark-paid
{
  trade_id: "uuid",
  buyer_id: "uuid",
  payment_reference: "REF123456"
}
```

**Backend:**
```python
# Update trade status
await db.p2p_trades.update_one(
    {"trade_id": trade_id},
    {
        "$set": {
            "status": "paid",
            "marked_paid_at": datetime.now(timezone.utc),
            "payment_reference": payment_reference
        }
    }
)

# Notify seller (email + in-app notification)
await notifications.create(
    user_id=seller_id,
    type="p2p_payment_marked",
    message=f"Buyer marked trade {trade_id} as paid. Please verify and release crypto."
)
```

**Frontend:** Seller sees notification

```
┌─────────────────────────────────────────┐
│   Trade #ABC123                         │
│                                         │
│   ✅ Buyer marked payment as complete   │
│                                         │
│   Payment Ref: REF123456                │
│   Amount: £500                          │
│                                         │
│   Check your bank and release crypto:   │
│                                         │
│   [Release Crypto] [Dispute]            │
└─────────────────────────────────────────┘
```

---

#### **STEP 4: Seller Releases Crypto** ⚠️ **CURRENTLY BROKEN**

**Frontend:** Seller clicks "Release Crypto"

```javascript
POST /api/p2p/trade/release
{
  trade_id: "uuid",
  seller_id: "uuid"
}
```

**Backend (BROKEN):**
```python
# Current implementation has bugs in escrow release logic

# What SHOULD happen:
# 1. Release from seller's locked balance
await wallet_service.release_locked_balance(
    user_id=seller_id,
    currency="BTC",
    amount=crypto_amount,
    release_type="p2p_trade",
    reference_id=trade_id
)

# 2. Credit buyer
await wallet_service.credit(
    user_id=buyer_id,
    currency="BTC",
    amount=crypto_amount_after_fee,
    transaction_type="p2p_buy",
    reference_id=trade_id
)

# 3. Deduct and track P2P fee (3%)
fee_amount = crypto_amount * 0.03
await db.internal_balances.update_one(
    {"currency": "BTC"},
    {"$inc": {
        "balance": fee_amount,
        "revenue_breakdown.p2p_fees": fee_amount
    }}
)

# 4. Save fee on trade document ⚠️ BUG: Not saved
await db.p2p_trades.update_one(
    {"trade_id": trade_id},
    {
        "$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc),
            "fee_amount": 0,  # ⚠️ BUG: Should be fee_amount
            "fee_currency": "BTC"
        }
    }
)

# 5. Pay referral commission (if applicable)
if buyer_referrer:
    commission = fee_amount * 0.20  # 20% of fee
    await wallet_service.credit(
        user_id=buyer_referrer,
        currency="BTC",
        amount=commission,
        transaction_type="referral_commission",
        reference_id=trade_id
    )
```

**Issues:**
1. Escrow release logic is broken (funds not transferring)
2. Fee not saved on trade document
3. Test data has invalid seller wallets

---

#### **STEP 5: Trade Complete**

**Frontend:** Both parties see success

```
✅ Trade completed!

Buyer received: 0.0097 BTC (after 3% fee)
Seller received: £500 GBP

Rating: Please rate your trading partner
[⭐⭐⭐⭐⭐]
```

---

### Money Flow Summary

```
Seller Wallet (Locked):   -0.01 BTC (escrow)
   ↓
Buyer Wallet:             +0.0097 BTC (after fee)
   ↓
Platform Fee Wallet:      +0.0003 BTC (3%)
   ↓
Referrer Wallet:          +0.00006 BTC (20% of fee)
```

### Current Issues

❌ **CRITICAL:** Escrow unlock function `p2p_release_crypto_with_wallet` is broken  
❌ **BUG:** Fee amount not saved on trade documents  
❌ **BUG:** Test data has invalid seller wallet references  

**Impact:** P2P trades cannot complete successfully.

**Fix Required:**
1. Debug escrow release logic
2. Add fee tracking to trade documents
3. Fix test data

---

## 🔄 Swap/Convert Flow

### Overview
Users swap between cryptocurrencies (BTC ↔ ETH ↔ USDT) with 3% fee.

### Step-by-Step Flow

#### **STEP 1: User Previews Swap**

**Frontend:** `SwapCrypto.js`

```javascript
POST /api/swap/preview
{
  from_currency: "ETH",
  from_amount: 0.5,
  to_currency: "BTC"
}

// Response:
{
  from_currency: "ETH",
  from_amount: 0.5,
  to_currency: "BTC",
  to_amount: 0.0148,
  exchange_rate: 0.0296,
  fee_amount: 0.015 ETH,
  fee_percent: 3,
  final_amount: 0.0148 BTC
}
```

---

#### **STEP 2: User Executes Swap**

**Frontend:** User confirms

```javascript
POST /api/swap/execute
{
  user_id: "uuid",
  from_currency: "ETH",
  from_amount: 0.5,
  to_currency: "BTC"
}
```

**Backend:** `server.py` → `/api/swap/execute`

```python
# 1. Check user has enough balance
from_wallet = await wallet_service.get_balance(user_id, from_currency)
if from_wallet["available_balance"] < from_amount:
    raise HTTPException(400, "Insufficient balance")

# 2. Calculate amounts
fee_amount = from_amount * 0.03
net_amount = from_amount - fee_amount
exchange_rate = price_service.convert_crypto_to_crypto(from_currency, 1, to_currency)
to_amount = net_amount * exchange_rate

# 3. Execute atomic swap
# 3a. Debit source currency
await wallet_service.debit(
    user_id=user_id,
    currency=from_currency,
    amount=from_amount,
    transaction_type="swap",
    reference_id=swap_id
)

# 3b. Credit destination currency
await wallet_service.credit(
    user_id=user_id,
    currency=to_currency,
    amount=to_amount,
    transaction_type="swap",
    reference_id=swap_id
)

# 3c. Credit platform fee
await db.internal_balances.update_one(
    {"currency": from_currency},
    {"$inc": {
        "balance": fee_amount,
        "revenue_breakdown.swap_fees": fee_amount
    }}
)

# 4. Save transaction ⚠️ BUG: fee_amount not saved
await db.swap_transactions.insert_one({
    "swap_id": swap_id,
    "user_id": user_id,
    "from_currency": from_currency,
    "from_amount": from_amount,
    "to_currency": to_currency,
    "to_amount": to_amount,
    "exchange_rate": exchange_rate,
    "fee_amount": 0,  # ⚠️ BUG: Should be fee_amount
    "fee_currency": from_currency,
    "status": "completed",
    "created_at": datetime.now(timezone.utc)
})
```

---

#### **STEP 3: User Sees Updated Balances**

```
✅ Swap successful!

Swapped 0.5 ETH → 0.0148 BTC
Fee: 0.015 ETH (3%)

Your Balances:
   ETH: 1.5 (-0.5)
   BTC: 0.0148 (+0.0148)
```

---

### Current Issues

⚠️ **BUG:** Pricing system unreliable (API rate limits)  
⚠️ **BUG:** Fee amount not saved on swap documents  
⚠️ **CONFLICT:** Two pricing systems (`price_service.py` vs `live_pricing.py`)  

**Impact:** Swaps may fail or show incorrect conversion rates.

**Fix Required:**
1. Unify pricing systems
2. Add caching and fallback
3. Save fee data per swap

---

## 💸 Withdrawal Flow

### Overview
Users withdraw crypto to external wallets with 3% fee.

### Step-by-Step Flow

#### **STEP 1: User Requests Withdrawal**

```javascript
POST /api/withdrawals/create
{
  user_id: "uuid",
  currency: "BTC",
  amount: 0.01,
  withdrawal_address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
}
```

**Backend:**
```python
# 1. Validate address format
if not validate_wallet_address(currency, withdrawal_address):
    raise HTTPException(400, "Invalid wallet address")

# 2. Calculate fee
fee = amount * 0.03
total_deducted = amount + fee

# 3. Check balance
wallet = await wallet_service.get_balance(user_id, currency)
if wallet["available_balance"] < total_deducted:
    raise HTTPException(400, "Insufficient balance")

# 4. Lock balance (pending admin approval)
await wallet_service.lock_balance(
    user_id=user_id,
    currency=currency,
    amount=total_deducted,
    lock_type="withdrawal",
    reference_id=withdrawal_id
)

# 5. Create withdrawal request
await db.withdrawal_requests.insert_one({
    "withdrawal_id": withdrawal_id,
    "user_id": user_id,
    "currency": currency,
    "amount": amount,
    "fee": fee,
    "withdrawal_address": withdrawal_address,
    "status": "pending",  # Awaiting admin approval
    "created_at": datetime.now(timezone.utc)
})
```

---

#### **STEP 2: Admin Reviews & Approves**

**Admin Dashboard:**
```
┌─────────────────────────────────────────┐
│   Pending Withdrawals                   │
│                                         │
│   User: john@example.com                │
│   Amount: 0.01 BTC                      │
│   Fee: 0.0003 BTC                       │
│   Address: 1A1zP...DivfNa               │
│                                         │
│   [Approve] [Reject]                    │
└─────────────────────────────────────────┘
```

**Admin approves:**
```javascript
POST /api/admin/withdrawals/approve
{
  withdrawal_id: "uuid",
  admin_id: "uuid",
  tx_hash: "0xabc123..."  // Transaction hash after sending
}
```

**Backend:**
```python
# 1. Release locked balance
await wallet_service.release_locked_balance(
    user_id=user_id,
    currency=currency,
    amount=amount + fee,
    release_type="withdrawal",
    reference_id=withdrawal_id
)

# 2. Credit platform fee
await db.internal_balances.update_one(
    {"currency": currency},
    {"$inc": {
        "balance": fee,
        "revenue_breakdown.withdrawal_fees": fee
    }}
)

# 3. Update withdrawal status
await db.withdrawal_requests.update_one(
    {"withdrawal_id": withdrawal_id},
    {
        "$set": {
            "status": "completed",
            "tx_hash": tx_hash,
            "completed_at": datetime.now(timezone.utc)
        }
    }
)
```

---

## 🎁 Referral Commission Flow

### Overview
Users earn 20% (or 50% for golden tier) of fees from referred users.

### Flow

```
User A (Referrer)
   ↓ refers
User B (Referred)
   ↓ trades
Platform Fee: 0.001 BTC
   ↓ 20% commission
User A earns: 0.0002 BTC
```

**Implementation:**

When any fee is charged (P2P, Swap, Express Buy), check if user has a referrer:

```python
# After fee collection
user = await db.users.find_one({"user_id": user_id})

if user.get("referred_by"):
    referrer_id = user["referred_by"]
    referrer = await db.users.find_one({"user_id": referrer_id})
    
    # Determine commission rate
    if referrer.get("referral_tier") == "golden":
        commission_rate = 0.50  # 50%
    else:
        commission_rate = 0.20  # 20%
    
    # Calculate commission
    commission = fee_amount * commission_rate
    
    # Credit referrer
    await wallet_service.credit(
        user_id=referrer_id,
        currency=currency,
        amount=commission,
        transaction_type="referral_commission",
        reference_id=transaction_id
    )
    
    # Deduct from platform fees
    await db.internal_balances.update_one(
        {"currency": currency},
        {"$inc": {"balance": -commission}}
    )
```

---

## 📊 Admin Revenue Tracking

### Overview
All platform fees are aggregated in `internal_balances` with breakdown by source.

### Revenue Sources

```
internal_balances:
{
  currency: "BTC",
  balance: 0.05,
  revenue_breakdown: {
    p2p_fees: 0.02,           // 3% of P2P trades
    swap_fees: 0.01,          // 3% of swaps
    express_buy_profit: 0.015, // 3% markup
    withdrawal_fees: 0.005    // 3% of withdrawals
  },
  last_updated: ISODate
}
```

### Admin Dashboard

**Endpoint:** `GET /api/admin/revenue/summary`

**Frontend:** `AdminEarnings.js`

```javascript
// Response:
{
  total_revenue: {
    BTC: 0.05,
    ETH: 0.5,
    USDT: 100,
    GBP: 1000
  },
  revenue_by_source: {
    p2p_fees: {...},
    swap_fees: {...},
    express_buy_profit: {...},
    withdrawal_fees: {...}
  },
  referral_payouts: {
    BTC: 0.01,  // Total paid to referrers
    ETH: 0.1,
    ...
  },
  net_profit: {
    BTC: 0.04,  // After referral payouts
    ETH: 0.4,
    ...
  }
}
```

**Display:**
```
┌─────────────────────────────────────────┐
│   Platform Revenue                      │
│                                         │
│   Total Earnings:                       │
│   • BTC: 0.05 ($2,500)                  │
│   • ETH: 0.5 ($1,250)                   │
│   • USDT: 100                           │
│   • GBP: £1,000                         │
│                                         │
│   Revenue Breakdown:                    │
│   • P2P Fees: $1,500                    │
│   • Swap Fees: $800                     │
│   • Express Buy: $1,200                 │
│   • Withdrawal Fees: $250               │
│                                         │
│   Referral Payouts: -$750               │
│   Net Profit: $3,000                    │
└─────────────────────────────────────────┘
```

---

## 🚨 Critical Issues Summary

### 🔴 P0 - MUST FIX IMMEDIATELY

1. **NOWPayments IPN Webhook Broken**
   - 46+ deposits stuck at "waiting"
   - Signature validation failing
   - Users' funds not credited

2. **P2P Escrow Release Broken**
   - Completed trades don't unlock funds
   - Buyers never receive crypto
   - Money stuck in limbo

### 🟠 P1 - HIGH PRIORITY

3. **Missing Fee Tracking**
   - P2P trades: fee_amount not saved
   - Swaps: fee_amount not saved
   - Express Buy: admin_profit not saved
   - Impact: No audit trail for profitability

4. **Pricing System Unstable**
   - API rate limits causing failures
   - Two conflicting pricing systems
   - Swap conversions unreliable

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - System architecture overview
- **NOWPAYMENTS.md** - Detailed NOWPayments integration guide
- **KNOWN_ISSUES.md** - Complete list of bugs and technical debt
- **API_ENDPOINTS.md** - Full API reference

---

**END OF FLOWS.MD**