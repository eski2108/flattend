# 🔌 CoinHubX API Endpoints Reference

**Last Updated:** November 2024  
**Purpose:** Complete API reference for all backend endpoints

---

## 📋 Table of Contents

1. [Base URLs & Configuration](#base-urls--configuration)
2. [Authentication](#authentication)
3. [Wallet Operations](#wallet-operations)
4. [NOWPayments Integration](#nowpayments-integration)
5. [P2P Trading](#p2p-trading)
6. [Swaps & Conversions](#swaps--conversions)
7. [Express Buy](#express-buy)
8. [Admin Endpoints](#admin-endpoints)
9. [Referral System](#referral-system)
10. [Error Responses](#error-responses)

---

## 🌐 Base URLs & Configuration

### Environment-Specific URLs

```bash
# Production
REACT_APP_BACKEND_URL=https://coinhubx.com

# Staging/Preview
REACT_APP_BACKEND_URL=https://p2pdispute.preview.emergentagent.com

# Local Development
REACT_APP_BACKEND_URL=http://localhost:8001
```

### API Prefix

All API endpoints are prefixed with `/api`:

```
Full URL = {BACKEND_URL}/api/{endpoint}

Example:
https://coinhubx.com/api/auth/login
```

### Common Headers

```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

---

## 🔐 Authentication

### Register

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "full_name": "John Doe",
  "phone_number": "+447700900000"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "user_id": "uuid-here",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "created_at": "2024-11-25T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful"
}
```

**Error Responses:**
```json
// 400 - Email already exists
{
  "detail": "Email already registered"
}

// 400 - Weak password
{
  "detail": "Password must be at least 8 characters"
}

// 429 - Rate limit
{
  "detail": "Too many registration attempts. Try again later."
}
```

---

### Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and get JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "uuid-here",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  }
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "detail": "Invalid email or password"
}

// 403 - Account locked
{
  "detail": "Account suspended. Contact support."
}
```

---

### Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Get authenticated user's profile

**Headers:**
```http
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "user_id": "uuid-here",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "user",
  "kyc_verified": false,
  "email_verified": true,
  "created_at": "2024-11-25T12:00:00Z"
}
```

---

## 💼 Wallet Operations

### Get User Balances

**Endpoint:** `GET /api/wallets/balances/{user_id}`

**Description:** Get all wallet balances for a user

**Path Parameters:**
- `user_id` (string): User's unique ID

**Response (200 OK):**
```json
{
  "success": true,
  "balances": [
    {
      "currency": "BTC",
      "available_balance": 0.05,
      "locked_balance": 0.01,
      "total_balance": 0.06
    },
    {
      "currency": "ETH",
      "available_balance": 1.5,
      "locked_balance": 0.0,
      "total_balance": 1.5
    },
    {
      "currency": "GBP",
      "available_balance": 1000.00,
      "locked_balance": 0.00,
      "total_balance": 1000.00
    }
  ]
}
```

**Notes:**
- Only returns currencies with `total_balance > 0`
- `locked_balance` = funds in escrow or pending withdrawals
- `available_balance` = funds available for trading/withdrawal

---

### Get Transaction History

**Endpoint:** `GET /api/wallets/transactions/{user_id}`

**Description:** Get user's transaction history

**Query Parameters:**
- `limit` (int, optional): Max results (default: 50)
- `currency` (string, optional): Filter by currency
- `transaction_type` (string, optional): Filter by type

**Response (200 OK):**
```json
{
  "success": true,
  "transactions": [
    {
      "transaction_id": "uuid",
      "user_id": "uuid",
      "currency": "BTC",
      "amount": 0.01,
      "transaction_type": "deposit",
      "direction": "credit",
      "reference_id": "payment_12345678",
      "balance_after": 0.01,
      "timestamp": "2024-11-25T12:00:00Z",
      "metadata": {
        "source": "nowpayments",
        "confirmations": 2
      }
    }
  ]
}
```

**Transaction Types:**
- `deposit` - Crypto deposit (NOWPayments)
- `withdrawal` - Crypto withdrawal
- `p2p_buy` / `p2p_sell` - P2P trade
- `swap` - Crypto swap/conversion
- `express_buy` - Instant buy from admin liquidity
- `referral_commission` - Referral earnings
- `fee` - Platform fee deduction

---

## 💳 NOWPayments Integration

### Create Deposit

**Endpoint:** `POST /api/nowpayments/create-deposit`

**Description:** Generate deposit address for crypto deposit

**Request Body:**
```json
{
  "user_id": "uuid-here",
  "currency": "btc",
  "amount": 50
}
```

**Parameters:**
- `user_id` (string): User's ID
- `currency` (string): Crypto currency code (btc, eth, usdt, etc.)
- `amount` (number): Amount in USD (for reference)

**Response (200 OK):**
```json
{
  "success": true,
  "deposit": {
    "deposit_id": "uuid",
    "payment_id": "12345678",
    "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "pay_currency": "btc",
    "pay_amount": 0.001,
    "price_amount": 50,
    "price_currency": "usd",
    "status": "waiting",
    "network_confirmations": 0,
    "created_at": "2024-11-25T12:00:00Z"
  },
  "qr_code_url": "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001"
}
```

**Status Values:**
- `waiting` - No transaction detected
- `confirming` - Transaction detected, confirmations pending
- `confirmed` - Minimum confirmations reached, wallet credited
- `finished` - Payment fully processed
- `failed` - Payment failed

**Error Responses:**
```json
// 400 - Unsupported currency
{
  "detail": "Currency btc not supported"
}

// 400 - Amount below minimum
{
  "detail": "Minimum deposit: 0.0001 BTC ($20)"
}

// 503 - NOWPayments API error
{
  "detail": "Payment processor unavailable. Try again later."
}
```

---

### Get Deposit Status

**Endpoint:** `GET /api/nowpayments/status/{payment_id}`

**Description:** Check status of a deposit

**Path Parameters:**
- `payment_id` (string): NOWPayments payment ID

**Response (200 OK):**
```json
{
  "success": true,
  "deposit": {
    "payment_id": "12345678",
    "status": "confirming",
    "network_confirmations": 1,
    "required_confirmations": 2,
    "pay_currency": "btc",
    "pay_amount": 0.001,
    "actually_paid": 0.001,
    "created_at": "2024-11-25T12:00:00Z",
    "updated_at": "2024-11-25T12:05:00Z"
  }
}
```

---

### IPN Webhook (Internal)

**Endpoint:** `POST /api/nowpayments/ipn`

**Description:** Receives payment notifications from NOWPayments

**This endpoint is called by NOWPayments, not by frontend!**

**Headers:**
```http
x-nowpayments-sig: hmac_sha512_signature
Content-Type: application/json
```

**Request Body:**
```json
{
  "payment_id": "12345678",
  "payment_status": "confirmed",
  "pay_address": "1A1zP...",
  "pay_currency": "btc",
  "pay_amount": 0.001,
  "actually_paid": 0.001,
  "network_confirmations": 2,
  "order_id": "user123_1700000000",
  "created_at": "2024-11-25T12:00:00Z",
  "updated_at": "2024-11-25T12:10:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**⚠️ CRITICAL:** This endpoint MUST verify the signature before processing.

---

## 🤝 P2P Trading

### Get P2P Ads

**Endpoint:** `GET /api/p2p/ads`

**Description:** Get list of active P2P trading ads

**Query Parameters:**
- `crypto_currency` (string, optional): Filter by crypto (BTC, ETH, etc.)
- `fiat_currency` (string, optional): Filter by fiat (GBP, USD, etc.)
- `payment_method` (string, optional): Filter by payment method
- `min_amount` (number, optional): Minimum order amount
- `max_amount` (number, optional): Maximum order amount

**Response (200 OK):**
```json
{
  "success": true,
  "ads": [
    {
      "ad_id": "uuid",
      "seller_id": "uuid",
      "seller_info": {
        "username": "TradeMaster",
        "rating": 4.8,
        "total_trades": 156,
        "completion_rate": 98.5,
        "is_verified": true
      },
      "crypto_currency": "BTC",
      "crypto_amount": 0.5,
      "fiat_currency": "GBP",
      "price_per_unit": 50000,
      "payment_methods": ["bank_transfer", "revolut"],
      "min_order": 100,
      "max_order": 5000,
      "status": "active",
      "created_at": "2024-11-25T12:00:00Z"
    }
  ]
}
```

---

### Create Trade

**Endpoint:** `POST /api/p2p/trade/create`

**Description:** Create a new P2P trade (buy from seller)

**Request Body:**
```json
{
  "ad_id": "uuid",
  "buyer_id": "uuid",
  "fiat_amount": 500
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "trade": {
    "trade_id": "uuid",
    "ad_id": "uuid",
    "seller_id": "uuid",
    "buyer_id": "uuid",
    "crypto_currency": "BTC",
    "crypto_amount": 0.01,
    "fiat_currency": "GBP",
    "fiat_amount": 500,
    "price_per_unit": 50000,
    "payment_method": "bank_transfer",
    "status": "pending",
    "payment_deadline": "2024-11-25T12:30:00Z",
    "escrow_locked": true,
    "created_at": "2024-11-25T12:00:00Z"
  },
  "seller_payment_details": {
    "bank_name": "Barclays",
    "account_holder": "John Doe",
    "account_number": "12345678",
    "sort_code": "12-34-56"
  }
}
```

---

### Mark Trade as Paid

**Endpoint:** `POST /api/p2p/trade/mark-paid`

**Description:** Buyer marks payment as completed

**Request Body:**
```json
{
  "trade_id": "uuid",
  "buyer_id": "uuid",
  "payment_reference": "REF123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment marked. Seller will be notified to release crypto."
}
```

---

### Release Crypto from Escrow

**Endpoint:** `POST /api/p2p/trade/release`

**Description:** Seller releases crypto after verifying payment

**Request Body:**
```json
{
  "trade_id": "uuid",
  "seller_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Crypto released from escrow successfully",
  "buyer_received": 0.0097,
  "fee_charged": 0.0003
}
```

**Money Flow:**
```
Seller locked balance:  -0.01 BTC
Buyer wallet:           +0.0097 BTC
Platform fee:           +0.0003 BTC (3%)
```

---

## 🔄 Swaps & Conversions

### Preview Swap

**Endpoint:** `POST /api/swap/preview`

**Description:** Get swap quote without executing

**Request Body:**
```json
{
  "from_currency": "ETH",
  "from_amount": 0.5,
  "to_currency": "BTC"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "from_currency": "ETH",
  "from_amount": 0.5,
  "to_currency": "BTC",
  "to_amount": 0.0148,
  "exchange_rate": 0.0296,
  "fee_amount": 0.015,
  "fee_percent": 3,
  "fee_currency": "ETH",
  "net_amount_after_fee": 0.485,
  "final_receive_amount": 0.0148,
  "market_rate": 0.0305,
  "platform_rate": 0.0296
}
```

---

### Execute Swap

**Endpoint:** `POST /api/swap/execute`

**Description:** Execute crypto-to-crypto swap

**Request Body:**
```json
{
  "user_id": "uuid",
  "from_currency": "ETH",
  "from_amount": 0.5,
  "to_currency": "BTC"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "swap": {
    "swap_id": "uuid",
    "user_id": "uuid",
    "from_currency": "ETH",
    "from_amount": 0.5,
    "to_currency": "BTC",
    "to_amount": 0.0148,
    "exchange_rate": 0.0296,
    "fee_amount": 0.015,
    "fee_currency": "ETH",
    "status": "completed",
    "created_at": "2024-11-25T12:00:00Z"
  },
  "balances": {
    "ETH": 1.5,
    "BTC": 0.0148
  }
}
```

**Error Responses:**
```json
// 400 - Insufficient balance
{
  "detail": "Insufficient ETH balance. Required: 0.5, Available: 0.3"
}

// 400 - Same currency
{
  "detail": "Cannot swap same currency"
}

// 503 - Pricing unavailable
{
  "detail": "Pricing service unavailable. Try again later."
}
```

---

## 🏪 Express Buy

### Get Express Buy Offers

**Endpoint:** `GET /api/express-buy/offers`

**Description:** Get instant buy offers from admin liquidity

**Query Parameters:**
- `crypto_currency` (string, optional): Filter by crypto
- `fiat_currency` (string, optional): Filter by fiat

**Response (200 OK):**
```json
{
  "success": true,
  "offers": [
    {
      "offer_id": "uuid",
      "crypto_currency": "BTC",
      "available_amount": 0.5,
      "fiat_currency": "GBP",
      "price_per_unit": 51500,
      "market_price": 50000,
      "markup_percent": 3,
      "min_purchase": 50,
      "max_purchase": 10000
    }
  ]
}
```

---

### Execute Express Buy

**Endpoint:** `POST /api/express-buy/execute`

**Description:** Buy crypto instantly from admin liquidity

**Request Body:**
```json
{
  "user_id": "uuid",
  "fiat_currency": "GBP",
  "fiat_amount": 100,
  "crypto_currency": "BTC"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "transaction": {
    "transaction_id": "uuid",
    "user_id": "uuid",
    "crypto_currency": "BTC",
    "crypto_amount": 0.00194174,
    "fiat_currency": "GBP",
    "fiat_amount": 100,
    "price_per_unit": 51500,
    "market_price": 50000,
    "admin_profit": 3,
    "status": "completed",
    "created_at": "2024-11-25T12:00:00Z"
  },
  "balances": {
    "GBP": 400,
    "BTC": 0.00194174
  }
}
```

**Error Responses:**
```json
// 400 - Insufficient GBP balance
{
  "detail": "Insufficient GBP balance. Required: 100, Available: 50"
}

// 400 - Insufficient admin liquidity
{
  "detail": "Insufficient BTC liquidity available"
}
```

---

## 👑 Admin Endpoints

### Get Revenue Summary

**Endpoint:** `GET /api/admin/revenue/summary`

**Description:** Get platform revenue breakdown

**Headers:**
```http
Authorization: Bearer {admin_jwt_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "total_revenue": {
    "BTC": 0.05,
    "ETH": 0.5,
    "USDT": 100,
    "GBP": 1000
  },
  "revenue_by_source": {
    "p2p_fees": {
      "BTC": 0.02,
      "ETH": 0.2,
      "GBP": 300
    },
    "swap_fees": {
      "BTC": 0.01,
      "ETH": 0.1,
      "USDT": 50
    },
    "express_buy_profit": {
      "GBP": 500,
      "BTC": 0.015
    },
    "withdrawal_fees": {
      "BTC": 0.005,
      "ETH": 0.2
    }
  },
  "referral_payouts": {
    "BTC": 0.01,
    "ETH": 0.1
  },
  "net_profit": {
    "BTC": 0.04,
    "ETH": 0.4,
    "GBP": 800
  }
}
```

---

### Get Admin Liquidity

**Endpoint:** `GET /api/admin/liquidity/balances`

**Description:** Get admin liquidity pool balances

**Response (200 OK):**
```json
{
  "success": true,
  "liquidity": [
    {
      "currency": "BTC",
      "balance": 10.0,
      "reserved_balance": 2.0,
      "available_balance": 8.0
    },
    {
      "currency": "ETH",
      "balance": 100.0,
      "reserved_balance": 20.0,
      "available_balance": 80.0
    }
  ]
}
```

---

## 🎁 Referral System

### Get Referral Link

**Endpoint:** `GET /api/referral/link/{user_id}`

**Description:** Get user's referral link

**Response (200 OK):**
```json
{
  "success": true,
  "referral_code": "ABC123DEF",
  "referral_link": "https://coinhubx.com/register?ref=ABC123DEF",
  "tier": "standard",
  "commission_rate": 0.20
}
```

---

### Get Referral Stats

**Endpoint:** `GET /api/referral/stats/{user_id}`

**Description:** Get user's referral earnings and stats

**Response (200 OK):**
```json
{
  "success": true,
  "total_referrals": 15,
  "active_referrals": 12,
  "total_earnings": {
    "BTC": 0.001,
    "ETH": 0.05,
    "GBP": 50
  },
  "earnings_this_month": {
    "BTC": 0.0002,
    "ETH": 0.01,
    "GBP": 10
  },
  "commission_rate": 0.20,
  "tier": "standard"
}
```

---

## ❌ Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes

**2xx - Success**
- `200 OK` - Request succeeded
- `201 Created` - Resource created

**4xx - Client Errors**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded

**5xx - Server Errors**
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - External service down

### Common Error Messages

```json
// Invalid JWT token
{
  "detail": "Invalid or expired token"
}

// Insufficient balance
{
  "detail": "Insufficient BTC balance. Required: 0.01, Available: 0.005"
}

// User not found
{
  "detail": "User not found"
}

// Service unavailable
{
  "detail": "Pricing service temporarily unavailable"
}

// Rate limit
{
  "detail": "Too many requests. Try again in 60 seconds."
}
```

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - System architecture
- **FLOWS.md** - Money flow diagrams
- **NOWPAYMENTS.md** - NOWPayments integration
- **KNOWN_ISSUES.md** - Known bugs

---

**END OF API_ENDPOINTS.MD**