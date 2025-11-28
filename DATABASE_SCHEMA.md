# COIN HUB X - MongoDB Database Schema

**Database Name:** `test_database` (change for production)

---

## Collection: `users` (or `user_accounts`)

Stores all registered users and their authentication data.

```javascript
{
  "_id": "uuid-string",
  "user_id": "uuid-string",
  "email": "user@example.com",
  "password": "hashed_password_bcrypt",
  "full_name": "John Doe",
  "wallet_address": "wallet_abc123",
  "role": "user",  // or "admin", "trader"
  "email_verified": false,
  "kyc_verified": false,
  "picture": "https://profile-pic-url.com/image.jpg",  // From Google OAuth
  "created_at": "2025-11-20T10:00:00+00:00",
  "last_login": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `email` (unique)
- `user_id` (unique)

---

## Collection: `trader_profiles`

Stores trader-specific stats and performance metrics for badge calculations.

```javascript
{
  "user_id": "uuid-string",
  "email": "trader@example.com",
  "completion_rate": 95.5,  // Percentage (0-100)
  "total_trades": 150,
  "completed_trades": 143,
  "cancelled_trades": 7,
  "total_volume_usd": 250000.00,
  "rating": 4.8,  // Average rating (0-5)
  "review_count": 45,
  "avg_response_time": 180,  // In seconds
  "kyc_verified": true,
  "last_trade_date": "2025-11-20T12:00:00+00:00",
  "is_online": true
}
```

**Indexes:**
- `user_id` (unique)
- `completion_rate`
- `total_volume_usd`

---

## Collection: `trader_badges`

Stores earned badges for each trader (Phase 2 feature).

```javascript
{
  "trader_id": "uuid-string",
  "badges": [
    {
      "badge_id": "elite_trader",
      "name": "Elite Trader",
      "icon": "🏆",
      "description": "95%+ completion rate with 100+ completed trades",
      "color": "#FFD700",
      "earned_date": "2025-11-20T10:00:00+00:00"
    },
    {
      "badge_id": "verified",
      "name": "Verified",
      "icon": "✅",
      "description": "Identity verified through KYC",
      "color": "#00FF88",
      "earned_date": "2025-11-20T10:00:00+00:00"
    }
  ],
  "last_calculated": "2025-11-20T10:00:00+00:00",
  "total_badges": 2
}
```

**Badge Types Available:**
1. Elite Trader (🏆) - 95%+ completion, 100+ trades
2. Pro Trader (⭐) - 85%+ completion, 50+ trades
3. Verified (✅) - KYC verified
4. Fast Responder (🎯) - < 5 min response time
5. High Volume (💎) - > $100k volume
6. Active Today (🔥) - Trade in last 24 hours
7. Trusted (🛡️) - 4.5+ rating, 20+ reviews

**Indexes:**
- `trader_id` (unique)

---

## Collection: `trader_adverts`

Stores P2P trading adverts (buy/sell offers).

```javascript
{
  "advert_id": "uuid-string",
  "trader_id": "uuid-string",
  "advert_type": "sell",  // "buy" or "sell"
  "cryptocurrency": "BTC",
  "fiat_currency": "USD",
  "price_per_unit": 95500.00,
  "min_order_amount": 100.00,
  "max_order_amount": 50000.00,
  "payment_methods": ["Bank Transfer", "Wise", "PayPal"],
  "is_active": true,
  "is_online": true,
  "created_at": "2025-11-20T10:00:00+00:00",
  "updated_at": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `advert_id` (unique)
- `trader_id`
- `cryptocurrency`
- `is_active`

---

## Collection: `trader_balances`

Stores trader escrow balances (Phase 1 - critical for P2P trading).

```javascript
{
  "user_id": "uuid-string",
  "currency": "BTC",
  "total_balance": 1.5,
  "locked_balance": 0.5,  // In active trades
  "available_balance": 1.0,  // Available to trade
  "last_updated": "2025-11-20T12:00:00+00:00"
}
```

**Important:** `available_balance = total_balance - locked_balance`

**Indexes:**
- Compound: `(user_id, currency)` (unique)

---

## Collection: `p2p_trades`

Stores P2P trade orders and their status.

```javascript
{
  "trade_id": "uuid-string",
  "buyer_id": "uuid-string",
  "seller_id": "uuid-string",
  "advert_id": "uuid-string",
  "cryptocurrency": "BTC",
  "fiat_currency": "USD",
  "crypto_amount": 0.5,
  "fiat_amount": 47750.00,
  "price_per_unit": 95500.00,
  "payment_method": "Bank Transfer",
  "status": "pending",  // pending, payment_made, completed, cancelled, disputed
  "escrow_locked": true,
  "platform_fee_percent": 1.0,
  "platform_fee_amount": 0.005,
  "created_at": "2025-11-20T10:00:00+00:00",
  "completed_at": null,
  "cancelled_at": null
}
```

**Trade Status Flow:**
1. `pending` - Trade created, waiting for buyer payment
2. `payment_made` - Buyer marked payment as sent
3. `completed` - Seller released crypto
4. `cancelled` - Trade cancelled by either party
5. `disputed` - Issue raised, admin intervention needed

**Indexes:**
- `trade_id` (unique)
- `buyer_id`
- `seller_id`
- `status`

---

## Collection: `admin_internal_balances`

Stores platform fees collected from trades.

```javascript
{
  "currency": "BTC",
  "total_collected": 0.0053,  // Total fees in BTC
  "total_paid_out": 0.0,
  "available_balance": 0.0053,
  "last_updated": "2025-11-20T12:00:00+00:00"
}
```

**Indexes:**
- `currency` (unique)

---

## Collection: `crypto_balances`

Stores user wallet balances (separate from trader escrow balances).

```javascript
{
  "user_id": "uuid-string",
  "currency": "BTC",
  "balance": 0.5,
  "pending_deposits": 0.0,
  "pending_withdrawals": 0.0,
  "last_updated": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- Compound: `(user_id, currency)` (unique)

---

## Collection: `nowpayments_deposits`

Tracks crypto deposits via NOWPayments integration.

```javascript
{
  "payment_id": "nowpayments_payment_id",
  "user_id": "uuid-string",
  "currency": "BTC",
  "amount": 0.5,
  "payment_status": "finished",  // waiting, confirming, finished, failed
  "pay_address": "blockchain_address",
  "pay_amount": 0.5,
  "price_amount": 47500.00,
  "price_currency": "USD",
  "created_at": "2025-11-20T10:00:00+00:00",
  "updated_at": "2025-11-20T10:30:00+00:00"
}
```

**Indexes:**
- `payment_id` (unique)
- `user_id`

---

## Collection: `user_sessions`

Stores active user sessions (JWT and OAuth).

```javascript
{
  "session_token": "jwt_token_or_oauth_session",
  "user_id": "uuid-string",
  "expires_at": "2025-11-27T10:00:00+00:00",
  "created_at": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `session_token` (unique)
- `user_id`

---

## Collection: `referral_codes`

Stores user referral codes and links.

```javascript
{
  "user_id": "uuid-string",
  "referral_code": "JOHN2025ABC",
  "referral_link": "https://coinhubx.com/register?ref=JOHN2025ABC",
  "created_at": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `user_id` (unique)
- `referral_code` (unique)

---

## Collection: `referral_stats`

Tracks referral performance.

```javascript
{
  "user_id": "uuid-string",
  "total_referrals": 10,
  "active_referrals": 8,
  "total_earnings": 150.00,
  "pending_earnings": 25.00,
  "last_updated": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `user_id` (unique)

---

## Collection: `crypto_buy_orders`

Stores direct crypto purchase orders.

```javascript
{
  "order_id": "uuid-string",
  "user_id": "uuid-string",
  "cryptocurrency": "BTC",
  "amount": 0.5,
  "fiat_currency": "USD",
  "fiat_amount": 47500.00,
  "payment_method": "Bank Transfer",
  "status": "pending",  // pending, processing, completed, failed
  "created_at": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `order_id` (unique)
- `user_id`

---

## Collection: `crypto_sell_orders`

Stores crypto sell orders.

```javascript
{
  "order_id": "uuid-string",
  "user_id": "uuid-string",
  "cryptocurrency": "BTC",
  "amount": 0.5,
  "fiat_currency": "USD",
  "fiat_amount": 47500.00,
  "withdrawal_method": "Bank Transfer",
  "bank_details": {
    "account_name": "John Doe",
    "account_number": "1234567890",
    "bank_name": "Example Bank"
  },
  "status": "pending",
  "created_at": "2025-11-20T10:00:00+00:00"
}
```

**Indexes:**
- `order_id` (unique)
- `user_id`

---

## MongoDB Export Commands

### Export All Collections
```bash
mongodump --db test_database --out ./backup

# Or for specific collection:
mongoexport --db test_database --collection users --out users.json
```

### Import Collections
```bash
mongorestore --db test_database ./backup/test_database

# Or for specific collection:
mongoimport --db test_database --collection users --file users.json
```

---

## Database Initialization

When setting up a new instance, create these indexes for optimal performance:

```javascript
// In MongoDB shell
use test_database;

// Users
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "user_id": 1 }, { unique: true });

// Trader Profiles
db.trader_profiles.createIndex({ "user_id": 1 }, { unique: true });
db.trader_profiles.createIndex({ "completion_rate": -1 });
db.trader_profiles.createIndex({ "total_volume_usd": -1 });

// Trader Badges
db.trader_badges.createIndex({ "trader_id": 1 }, { unique: true });

// Trader Adverts
db.trader_adverts.createIndex({ "advert_id": 1 }, { unique: true });
db.trader_adverts.createIndex({ "trader_id": 1 });
db.trader_adverts.createIndex({ "cryptocurrency": 1, "is_active": 1 });

// Trader Balances
db.trader_balances.createIndex({ "user_id": 1, "currency": 1 }, { unique: true });

// P2P Trades
db.p2p_trades.createIndex({ "trade_id": 1 }, { unique: true });
db.p2p_trades.createIndex({ "buyer_id": 1 });
db.p2p_trades.createIndex({ "seller_id": 1 });
db.p2p_trades.createIndex({ "status": 1 });
```

---

## Total Collections: 15

1. users (or user_accounts)
2. trader_profiles
3. trader_badges
4. trader_adverts
5. trader_balances
6. p2p_trades
7. admin_internal_balances
8. crypto_balances
9. nowpayments_deposits
10. user_sessions
11. referral_codes
12. referral_stats
13. crypto_buy_orders
14. crypto_sell_orders
15. platform_config (optional)
