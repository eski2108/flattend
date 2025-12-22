# 💳 NOWPayments Integration Guide

**Last Updated:** November 2024  
**Purpose:** Complete guide to NOWPayments integration for crypto deposits

---

## 📋 Table of Contents

1. [What is NOWPayments?](#what-is-nowpayments)
2. [Integration Overview](#integration-overview)
3. [Environment Variables](#environment-variables)
4. [API Endpoints](#api-endpoints)
5. [Webhook (IPN) Setup](#webhook-ipn-setup)
6. [Testing Deposits](#testing-deposits)
7. [Troubleshooting](#troubleshooting)
8. [Known Issues](#known-issues)

---

## 🤔 What is NOWPayments?

**NOWPayments** is a third-party cryptocurrency payment processor that:
- Generates unique deposit addresses for 100+ cryptocurrencies
- Monitors blockchain transactions automatically
- Sends webhook notifications when payments are confirmed
- Handles all the blockchain complexity

**Why use it?**  
Instead of running our own Bitcoin/Ethereum nodes and monitoring blockchains, NOWPayments does it all via API.

**Website:** https://nowpayments.io  
**Documentation:** https://documenter.getpostman.com/view/7907941/S1a32n38

---

## 🏗️ Integration Overview

### How It Works

```
┌─────────────────────────────────────────────────────┐
│                     OUR PLATFORM                          │
│                                                           │
│   1. User clicks "Deposit BTC"                            │
│   2. Backend calls NOWPayments API                        │
│   3. Receive unique BTC address                           │
│   4. Show address to user                                 │
│   5. User sends BTC from external wallet                  │
│   6. NOWPayments detects transaction                      │
│   7. NOWPayments sends webhook to our backend             │
│   8. Backend credits user's wallet                        │
│   9. User sees updated balance                            │
└─────────────────────────────────────────────────────┘
                               ↑
                               │
                     ┌───────────────────────┐
                     │   NOWPayments API     │
                     │   (External Service)  │
                     └───────────────────────┘
```

### Our Implementation

**Backend File:** `/app/backend/nowpayments_integration.py`  
**Service Class:** `NOWPaymentsService`  
**Endpoints in server.py:**
- `POST /api/nowpayments/create-deposit` - Create new deposit
- `POST /api/nowpayments/ipn` - Webhook handler (⚠️ BROKEN)
- `GET /api/nowpayments/status/{payment_id}` - Check payment status

---

## 🔑 Environment Variables

### Required Variables

Add these to `/app/backend/.env`:

```bash
# NOWPayments API Credentials
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here

# Your backend URL (for webhook callbacks)
BACKEND_URL=https://balance-sync-repair.preview.emergentagent.com
```

### How to Get These Values

#### 1. Get API Key

1. Sign up at https://nowpayments.io
2. Go to **Settings** → **API Keys**
3. Click **Generate API Key**
4. Copy the key and paste into `.env` as `NOWPAYMENTS_API_KEY`

#### 2. Get IPN Secret

1. In NOWPayments dashboard, go to **Settings** → **IPN (Callbacks)**
2. Enable IPN callbacks
3. Set IPN callback URL to: `https://balance-sync-repair.preview.emergentagent.com/api/nowpayments/ipn`
4. Copy the **IPN Secret Key** shown
5. Paste into `.env` as `NOWPAYMENTS_IPN_SECRET`

#### 3. Set Backend URL

This must be your **publicly accessible** backend URL:

```bash
# Production
BACKEND_URL=https://coinhubx.com

# Staging/Preview
BACKEND_URL=https://balance-sync-repair.preview.emergentagent.com

# Local testing (use ngrok)
BACKEND_URL=https://abc123.ngrok.io
```

⚠️ **CRITICAL:** This URL must be reachable from the internet for webhooks to work!

---

## 📡 API Endpoints

### 1. Get Available Currencies

**NOWPayments API:**
```bash
GET https://api.nowpayments.io/v1/currencies
Headers:
  x-api-key: YOUR_API_KEY
```

**Response:**
```json
{
  "currencies": [
    "btc", "eth", "usdt", "ltc", "bch", "xrp", "ada", ...
  ]
}
```

**Our Implementation:**
```python
def get_available_currencies(self) -> List[str]:
    response = requests.get(
        f"{self.BASE_URL}/currencies",
        headers=self.headers
    )
    return response.json().get('currencies', [])
```

---

### 2. Get Minimum Deposit Amount

**NOWPayments API:**
```bash
GET https://api.nowpayments.io/v1/min-amount?currency_from=btc&currency_to=usd
Headers:
  x-api-key: YOUR_API_KEY
```

**Response:**
```json
{
  "currency_from": "btc",
  "currency_to": "usd",
  "min_amount": 0.0001
}
```

**Our Implementation:**
```python
def get_minimum_amount(self, currency_from: str, currency_to: str = "usd") -> float:
    response = requests.get(
        f"{self.BASE_URL}/min-amount",
        params={
            "currency_from": currency_from.lower(),
            "currency_to": currency_to.lower()
        },
        headers=self.headers
    )
    return float(response.json().get('min_amount', 0))
```

---

### 3. Create Payment (Generate Deposit Address)

**NOWPayments API:**
```bash
POST https://api.nowpayments.io/v1/payment
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "price_amount": 50,
  "price_currency": "usd",
  "pay_currency": "btc",
  "order_id": "user123_1700000000",
  "order_description": "Crypto deposit",
  "ipn_callback_url": "https://your-app.com/api/nowpayments/ipn"
}
```

**Response:**
```json
{
  "payment_id": "12345678",
  "payment_status": "waiting",
  "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "pay_amount": 0.001,
  "pay_currency": "btc",
  "price_amount": 50,
  "price_currency": "usd",
  "order_id": "user123_1700000000",
  "order_description": "Crypto deposit",
  "created_at": "2024-11-25T12:00:00Z",
  "ipn_callback_url": "https://your-app.com/api/nowpayments/ipn"
}
```

**Our Implementation:**
```python
def create_payment(
    self,
    price_amount: float,
    price_currency: str,
    pay_currency: str,
    order_id: str,
    order_description: str = "Crypto deposit"
) -> Optional[Dict]:
    backend_url = os.getenv('BACKEND_URL')
    
    payload = {
        "price_amount": float(price_amount),
        "price_currency": price_currency.lower(),
        "pay_currency": pay_currency.lower(),
        "order_id": str(order_id),
        "order_description": order_description,
        "ipn_callback_url": f"{backend_url}/api/nowpayments/ipn"
    }
    
    response = requests.post(
        f"{self.BASE_URL}/payment",
        json=payload,
        headers=self.headers,
        timeout=15
    )
    
    if response.status_code not in [200, 201]:
        logger.error(f"NOWPayments error: {response.text}")
        return None
    
    return response.json()
```

---

### 4. Get Payment Status

**NOWPayments API:**
```bash
GET https://api.nowpayments.io/v1/payment/12345678
Headers:
  x-api-key: YOUR_API_KEY
```

**Response:**
```json
{
  "payment_id": "12345678",
  "payment_status": "confirmed",
  "pay_address": "1A1zP...",
  "pay_currency": "btc",
  "pay_amount": 0.001,
  "actually_paid": 0.001,
  "network_confirmations": 2,
  "created_at": "2024-11-25T12:00:00Z",
  "updated_at": "2024-11-25T12:10:00Z"
}
```

**Payment Status Values:**
- `waiting` - No transaction detected yet
- `confirming` - Transaction detected, confirmations increasing
- `confirmed` - Minimum confirmations reached
- `finished` - Payment fully processed
- `failed` - Payment failed (wrong amount, expired, etc.)
- `expired` - Payment window expired (usually 2 hours)

---

## 🔔 Webhook (IPN) Setup

### What is IPN?

**IPN** = Instant Payment Notification

When a user sends crypto, NOWPayments sends a POST request to our backend with payment details.

### Webhook URL

Must be set in NOWPayments dashboard and `.env`:

```
https://your-app.com/api/nowpayments/ipn
```

### Webhook Request Format

**NOWPayments sends:**

```bash
POST https://your-app.com/api/nowpayments/ipn
Headers:
  x-nowpayments-sig: "hmac_sha512_signature_here"
  Content-Type: application/json

Body:
{
  "payment_id": "12345678",
  "payment_status": "confirmed",
  "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
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

**Key Header:** `x-nowpayments-sig`

This is an HMAC SHA512 signature of the request body, used to verify the webhook is genuine.

---

### Signature Verification

⚠️ **CRITICAL FOR SECURITY:** Always verify the signature to prevent fake deposit attacks!

**How Signature Works:**

1. NOWPayments takes the raw JSON body
2. Calculates HMAC SHA512 using your IPN secret
3. Sends the signature in `x-nowpayments-sig` header
4. You recalculate the signature and compare

**Our Implementation:**

```python
def verify_ipn_signature(self, request_data: bytes, signature: str) -> bool:
    """
    Verify IPN webhook signature
    
    Args:
        request_data: Raw request body (bytes)
        signature: Value from x-nowpayments-sig header
    
    Returns:
        True if signature is valid
    """
    if not signature:
        logger.error("❌ IPN signature missing")
        return False
    
    # Calculate HMAC SHA512
    calculated_sig = hmac.new(
        self.ipn_secret.encode('utf-8'),
        request_data,
        hashlib.sha512
    ).hexdigest()
    
    # Constant-time comparison (prevents timing attacks)
    is_valid = hmac.compare_digest(calculated_sig, signature)
    
    if is_valid:
        logger.info("✅ IPN signature validated")
    else:
        logger.warning("⚠️ IPN signature FAILED - possible fake callback")
    
    return is_valid
```

⚠️ **CURRENT BUG:** This verification is failing for all callbacks. See [Known Issues](#known-issues).

---

### Webhook Handler

**Our endpoint:** `POST /api/nowpayments/ipn`

```python
@api_router.post("/nowpayments/ipn")
async def nowpayments_ipn_handler(request: Request):
    """
    Handle NOWPayments webhook notifications
    
    CRITICAL: This must verify signature before processing
    """
    try:
        # 1. Get raw body and signature
        raw_body = await request.body()
        signature = request.headers.get('x-nowpayments-sig')
        
        logger.info(f"🔔 IPN webhook received: {len(raw_body)} bytes")
        
        # 2. Verify signature
        if not nowpayments_service.verify_ipn_signature(raw_body, signature):
            logger.error("❌ IPN signature verification FAILED")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # 3. Parse JSON
        payment_data = await request.json()
        payment_id = payment_data.get('payment_id')
        
        logger.info(f"✅ IPN signature verified for payment {payment_id}")
        
        # 4. Find deposit record
        deposit = await db.nowpayment_deposits.find_one(
            {"payment_id": payment_id},
            {"_id": 0}
        )
        
        if not deposit:
            logger.error(f"❌ Deposit not found for payment_id {payment_id}")
            return {"success": False, "error": "Deposit not found"}
        
        # 5. Update deposit status
        await db.nowpayment_deposits.update_one(
            {"payment_id": payment_id},
            {
                "$set": {
                    "status": payment_data.get('payment_status'),
                    "network_confirmations": payment_data.get('network_confirmations', 0),
                    "actually_paid": payment_data.get('actually_paid'),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # 6. Check if payment is confirmed
        if nowpayments_service.is_payment_confirmed(payment_data):
            logger.info(f"✅ Payment {payment_id} is CONFIRMED - crediting user wallet")
            
            # 7. Credit user wallet
            await wallet_service.credit(
                user_id=deposit["user_id"],
                currency=payment_data["pay_currency"].upper(),
                amount=float(payment_data["actually_paid"]),
                transaction_type="deposit",
                reference_id=payment_id,
                metadata={
                    "source": "nowpayments",
                    "payment_id": payment_id,
                    "confirmations": payment_data.get('network_confirmations')
                }
            )
            
            # 8. Mark as credited
            await db.nowpayment_deposits.update_one(
                {"payment_id": payment_id},
                {
                    "$set": {
                        "credited_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            logger.info(f"✅ User {deposit['user_id']} credited with {payment_data['actually_paid']} {payment_data['pay_currency'].upper()}")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"❌ IPN handler error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Confirmation Requirements

**Different cryptocurrencies require different numbers of confirmations:**

```python
CONFIRMATION_REQUIREMENTS = {
    "btc": 2,        # Bitcoin: 2 blocks (≈20 minutes)
    "eth": 12,       # Ethereum: 12 blocks (≈3 minutes)
    "usdt": 12,      # USDT (ERC20): 12 blocks
    "ltc": 6,        # Litecoin: 6 blocks
    "bch": 6,        # Bitcoin Cash: 6 blocks
    "xrp": 1,        # Ripple: 1 confirmation
    "ada": 15,       # Cardano: 15 blocks
    "default": 6
}
```

**Check if payment is confirmed:**

```python
def is_payment_confirmed(self, payment_data: Dict) -> bool:
    payment_status = payment_data.get('payment_status', '').lower()
    pay_currency = payment_data.get('pay_currency', '').lower()
    confirmations = int(payment_data.get('network_confirmations', 0))
    
    required = self.get_confirmations_required(pay_currency)
    
    return (
        payment_status in ['confirmed', 'finished'] and
        confirmations >= required
    )
```

---

## 🧪 Testing Deposits

### Testing on Sandbox

NOWPayments offers a **sandbox environment** for testing:

1. Sign up for sandbox account: https://sandbox.nowpayments.io
2. Get sandbox API key
3. Use sandbox URL: `https://api-sandbox.nowpayments.io/v1`
4. Test with fake crypto (no real money)

### Testing on Production (Mainnet)

**WARNING:** This uses real cryptocurrency!

#### Step-by-Step Test

1. **Create a deposit**
   ```bash
   curl -X POST https://your-app.com/api/nowpayments/create-deposit \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test_user_123",
       "currency": "btc",
       "amount": 50
     }'
   ```

2. **Get deposit address from response**
   ```json
   {
     "payment_id": "12345678",
     "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
     "pay_amount": 0.001,
     "status": "waiting"
   }
   ```

3. **Send crypto to the address**
   - Use your Bitcoin wallet (Coinbase, Trust Wallet, etc.)
   - Send EXACTLY the `pay_amount` shown
   - Wait for blockchain confirmations

4. **Monitor webhook logs**
   ```bash
   # Check supervisor logs
   tail -f /var/log/supervisor/backend.out.log | grep IPN
   ```

5. **Check deposit status**
   ```bash
   # In MongoDB
   db.nowpayment_deposits.findOne({payment_id: "12345678"})
   ```

6. **Verify wallet credited**
   ```bash
   # Check user wallet
   db.wallets.findOne({user_id: "test_user_123", currency: "BTC"})
   ```

---

### Testing with ngrok (Local Development)

Webhooks won't work on `localhost`. Use ngrok:

1. **Install ngrok:** https://ngrok.com/download

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 8001
   ```

3. **Copy the HTTPS URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> localhost:8001
   ```

4. **Update .env:**
   ```bash
   BACKEND_URL=https://abc123.ngrok.io
   ```

5. **Restart backend:**
   ```bash
   sudo supervisorctl restart backend
   ```

6. **Update NOWPayments dashboard:**
   - Go to Settings → IPN
   - Set callback URL: `https://abc123.ngrok.io/api/nowpayments/ipn`

7. **Test deposits** as normal

---

## 🔧 Troubleshooting

### Issue 1: "Signature validation failed"

**Symptoms:**
- Deposits stuck at "waiting"
- Log shows: `❌ IPN signature verification FAILED`

**Causes:**
1. Wrong IPN secret in `.env`
2. Request body modified before verification
3. Incorrect HMAC calculation

**Debug Steps:**

```python
# Add logging to verify_ipn_signature
logger.info(f"IPN Secret (first 10 chars): {self.ipn_secret[:10]}...")
logger.info(f"Request body length: {len(request_data)}")
logger.info(f"Received signature: {signature}")
logger.info(f"Calculated signature: {calculated_sig}")
```

**Fix:**
1. Get fresh IPN secret from NOWPayments dashboard
2. Update `.env` file
3. Restart backend: `sudo supervisorctl restart backend`

---

### Issue 2: "Payment not found"

**Symptoms:**
- Webhook received but deposit not in database

**Causes:**
1. Deposit not created properly
2. Wrong `payment_id` in webhook

**Check:**
```bash
# Search all deposits
db.nowpayment_deposits.find().pretty()

# Search by user
db.nowpayment_deposits.find({user_id: "test_user_123"})
```

---

### Issue 3: "No webhook received"

**Symptoms:**
- User sent crypto but status still "waiting"
- No IPN logs in backend

**Causes:**
1. Webhook URL not reachable (localhost, firewall)
2. Wrong URL in `.env`
3. NOWPayments hasn't detected transaction yet

**Check:**

1. **Test webhook URL is reachable:**
   ```bash
   curl https://your-app.com/api/nowpayments/ipn
   # Should return 405 Method Not Allowed (expects POST)
   ```

2. **Check NOWPayments dashboard:**
   - Go to Payments → Find your payment
   - Check status and confirmations
   - View "IPN Logs" to see if callbacks were sent

3. **Manual trigger:**
   ```bash
   # Check payment status via API
   curl https://api.nowpayments.io/v1/payment/12345678 \
     -H "x-api-key: YOUR_API_KEY"
   ```

---

### Issue 4: "Insufficient confirmations"

**Symptoms:**
- Webhook received
- Status updated to "confirming"
- But wallet not credited

**This is NORMAL:**

Crypto deposits require multiple blockchain confirmations:
- Bitcoin: 2 confirmations ≈ 20 minutes
- Ethereum: 12 confirmations ≈ 3 minutes

**Check:**
```javascript
db.nowpayment_deposits.findOne({payment_id: "12345678"})
// Look at:
// - network_confirmations: current count
// - status: should be "confirming"
```

**Wait for more confirmations.** NOWPayments will send another webhook when confirmed.

---

### Issue 5: "Wrong amount sent"

**Symptoms:**
- User sent different amount than requested
- Payment status: `failed` or `partially_paid`

**NOWPayments requires EXACT amount:**

If user sends:
- **Less than requested:** Payment fails, refund required
- **More than requested:** Payment fails, refund required
- **Exactly requested:** Payment succeeds

**Handle this:**
```python
if payment_data.get('actually_paid') != payment_data.get('pay_amount'):
    logger.error(
        f"Amount mismatch: Expected {payment_data['pay_amount']}, "
        f"Got {payment_data['actually_paid']}"
    )
    # Contact NOWPayments support for refund
```

---

## ⚠️ Known Issues

### 🔴 CRITICAL: IPN Signature Verification Broken

**Status:** ❌ **NOT WORKING**

**Impact:**
- 46+ deposits stuck at "waiting" status
- User funds sent but not credited
- Significant money at risk

**Problem:**
Signature verification in `verify_ipn_signature()` always returns False.

**Why:**
The HMAC SHA512 calculation doesn't match NOWPayments' format.

**Current code:**
```python
calculated_sig = hmac.new(
    self.ipn_secret.encode('utf-8'),
    request_data,  # Raw bytes
    hashlib.sha512
).hexdigest()
```

**Possible issues:**
1. Request body might be modified before reaching verification
2. IPN secret might be incorrect
3. Encoding issue (UTF-8 vs ASCII)
4. NOWPayments might use different HMAC format

**Debug needed:**
```python
# Log everything
logger.info(f"Raw body (first 100 chars): {request_data[:100]}")
logger.info(f"IPN secret: {self.ipn_secret[:10]}...")
logger.info(f"Calculated: {calculated_sig}")
logger.info(f"Received: {signature}")
logger.info(f"Match: {calculated_sig == signature}")
```

**Workaround (INSECURE - ONLY FOR TESTING):**
```python
# TEMPORARILY bypass verification to credit stuck deposits
# DO NOT USE IN PRODUCTION!
if os.getenv('NOWPAYMENTS_SKIP_SIGNATURE', 'false').lower() == 'true':
    logger.warning("⚠️ SKIPPING SIGNATURE VERIFICATION - INSECURE!")
    return True
```

**To fix:**
1. Contact NOWPayments support with debug logs
2. Review their documentation for exact signature format
3. Test with their sandbox environment
4. Implement fix
5. Test thoroughly before production

---

### Stuck Deposits

**Current situation:**
```javascript
db.nowpayment_deposits.countDocuments({status: "waiting"})
// Result: 46+ deposits

db.nowpayment_deposits.aggregate([
  {$match: {status: "waiting"}},
  {$group: {_id: "$pay_currency", total: {$sum: "$pay_amount"}}}
])
// Shows total value stuck
```

**Manual fix (after webhook is fixed):**
```javascript
// For each stuck deposit:
deposit = db.nowpayment_deposits.findOne({payment_id: "12345678"})

// Check status on NOWPayments
curl https://api.nowpayments.io/v1/payment/12345678 \
  -H "x-api-key: YOUR_API_KEY"

// If confirmed, manually credit:
db.wallets.updateOne(
  {user_id: deposit.user_id, currency: deposit.pay_currency.toUpperCase()},
  {$inc: {available_balance: deposit.pay_amount, total_balance: deposit.pay_amount}}
)

// Mark as credited:
db.nowpayment_deposits.updateOne(
  {payment_id: "12345678"},
  {$set: {status: "confirmed", credited_at: new Date()}}
)
```

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - System architecture
- **FLOWS.md** - Complete deposit flow diagram
- **API_ENDPOINTS.md** - All API endpoints
- **KNOWN_ISSUES.md** - All bugs and issues

---

**External Resources:**
- NOWPayments API Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
- NOWPayments Dashboard: https://account.nowpayments.io
- NOWPayments Support: support@nowpayments.io

---

**END OF NOWPAYMENTS.MD**