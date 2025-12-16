# CoinHubX - Escrow System Documentation

## Overview

The escrow system handles secure crypto holding during P2P trades. When a seller initiates a trade, their crypto is locked in escrow until either:
- The seller releases it to the buyer (trade completion)
- The trade is cancelled (crypto returned to seller)
- Admin resolves a dispute

---

## Escrow Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      P2P TRADE FLOW                            │
└─────────────────────────────────────────────────────────────────┘

  SELLER                    ESCROW                     BUYER
    │                         │                          │
    │  1. Create Listing      │                          │
    ├────────────────────────►│                          │
    │                         │                          │
    │                         │    2. Accept Offer       │
    │                         │◄─────────────────────────┤
    │                         │                          │
    │  3. Lock Crypto ────────┤                          │
    │  (deduct from wallet)   │                          │
    │                         │                          │
    │                         │    4. Mark Paid          │
    │                         │◄─────────────────────────┤
    │                         │                          │
    │  5. Verify Payment      │                          │
    │  6. Release Crypto ─────┼─────────────────────────►│
    │                         │    (credit to wallet)    │
    │                         │                          │
    │  7. Trade Complete      │                          │
    └─────────────────────────┴──────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|--------|
| `/backend/server.py` | Main P2P trade endpoints |
| `/backend/escrow_balance_system.py` | Escrow balance tracking |
| `/backend/wallet_service.py` | Wallet operations |
| `/backend/email_service.py` | Email notifications |

---

## Escrow Endpoints

### 1. Lock Crypto in Escrow
```
POST /api/escrow/lock
```
**Location:** `server.py` line ~4468

**Request:**
```json
{
  "user_id": "seller-uuid",
  "currency": "BTC",
  "amount": 0.001,
  "trade_id": "trade_20251216..."
}
```

**Flow:**
1. Verify seller has sufficient balance
2. Deduct amount from `trader_balances.available_balance`
3. Add amount to `trader_balances.escrow_balance`
4. Update trade record with `escrow_locked: true`

### 2. Release Crypto from Escrow
```
POST /api/p2p/trade/release
```
**Location:** `server.py` line ~28147

**Request:**
```json
{
  "trade_id": "trade_20251216...",
  "user_id": "seller-uuid"
}
```

**Flow:**
1. Verify seller owns the trade
2. Verify buyer marked payment as paid
3. Deduct from seller's escrow balance
4. Credit buyer's available balance
5. Update trade status to `completed`
6. Log fee to `admin_revenue` collection
7. Send confirmation emails to both parties

### 3. Cancel Trade (Unlock Escrow)
```
POST /api/p2p/trade/cancel
```
**Location:** `server.py` line ~23588

**Flow:**
1. Verify trade can be cancelled
2. Return crypto from escrow to seller's available balance
3. Update trade status to `cancelled`
4. Send cancellation emails

---

## Database Collections

### `p2p_trades`
Stores trade records with escrow status.

```javascript
{
  "trade_id": "trade_20251216123456789",
  "seller_id": "seller-uuid",
  "buyer_id": "buyer-uuid",
  "crypto_currency": "BTC",
  "crypto_amount": 0.001,
  "fiat_amount": 50.00,
  "fiat_currency": "GBP",
  "status": "pending_payment",  // or: payment_marked, completed, cancelled, disputed
  "escrow_locked": true,
  "created_at": ISODate(),
  "expires_at": ISODate()
}
```

### `trader_balances`
Tracks user balances including escrow.

```javascript
{
  "trader_id": "user-uuid",
  "currency": "BTC",
  "total_balance": 0.1,
  "available_balance": 0.095,  // can trade/withdraw
  "escrow_balance": 0.005      // locked in active trades
}
```

---

## Email Notifications

### Escrow-Related Emails

| Event | Email Function | Recipients |
|-------|---------------|------------|
| Trade Created | `send_p2p_order_created()` | Buyer + Seller |
| Payment Marked | `send_p2p_payment_marked()` | Seller |
| Crypto Released | `send_p2p_crypto_released()` | Buyer |
| Trade Cancelled | `send_p2p_order_cancelled()` | Buyer + Seller |
| Dispute Opened | `send_dispute_alert_to_admin()` | Admin |
| Dispute Resolved | `send_dispute_notification()` | Buyer + Seller |

### Email Service Location
`/backend/email_service.py`

### How Emails Are Triggered

**Example: Crypto Release Email**

```python
# In server.py, after escrow release
await email_service.send_p2p_crypto_released(
    buyer_email=buyer.get("email"),
    buyer_name=buyer.get("name"),
    seller_name=seller.get("name"),
    amount=trade.get("crypto_amount"),
    currency=trade.get("crypto_currency"),
    trade_id=trade_id
)
```

### Admin Dispute Alert

When a dispute is opened, admin receives an urgent email:

**Function:** `email_service.send_dispute_alert_to_admin()`
**Location:** `email_service.py` line ~91

**Includes:**
- Trade ID and dispute ID
- Buyer and seller IDs
- Trade amount
- Dispute reason
- Direct link to admin panel

---

## Testing Escrow Flow

### Manual Test Steps

1. **Create Test Users**
   - Seller with crypto balance
   - Buyer without crypto

2. **Seller Creates Listing**
   ```bash
   POST /api/p2p/listings
   {
     "seller_uid": "seller-id",
     "crypto": "BTC",
     "amount_total": 0.01,
     "price_fixed": 50000
   }
   ```

3. **Buyer Accepts (Creates Trade)**
   ```bash
   POST /api/p2p/trades
   {
     "listing_id": "listing-id",
     "buyer_id": "buyer-id",
     "amount": 0.001
   }
   ```

4. **Verify Escrow Locked**
   - Check seller's `escrow_balance` increased
   - Check seller's `available_balance` decreased
   - Check trade has `escrow_locked: true`

5. **Buyer Marks Payment**
   ```bash
   POST /api/p2p/trade/mark-paid
   {
     "trade_id": "trade-id",
     "user_id": "buyer-id"
   }
   ```

6. **Seller Releases Crypto**
   ```bash
   POST /api/p2p/trade/release
   {
     "trade_id": "trade-id",
     "user_id": "seller-id"
   }
   ```

7. **Verify Completion**
   - Check buyer's balance increased
   - Check seller's escrow balance is zero
   - Check trade status is `completed`
   - Check emails were sent (check logs)

### Database Verification Queries

```javascript
// Check escrow balance
db.trader_balances.find({trader_id: "seller-id", currency: "BTC"})

// Check trade status
db.p2p_trades.find({trade_id: "trade-id"})

// Check email logs
db.email_logs.find({trade_id: "trade-id"})
```

---

## Dispute Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISPUTE FLOW                              │
└─────────────────────────────────────────────────────────────────┘

  BUYER/SELLER              ADMIN                      RESOLUTION
       │                      │                             │
       │  1. Open Dispute     │                             │
       ├─────────────────────►│                             │
       │                      │                             │
       │  (Email Alert)       │                             │
       │                      │                             │
       │                      │  2. Review Evidence         │
       │                      │                             │
       │                      │  3. Decide: Buyer/Seller    │
       │                      │                             │
       │                      │  4. Release Crypto ─────────┤
       │                      │     to winner               │
       │  5. Email Result     │                             │
       │◄─────────────────────┤                             │
       │                      │                             │
```

**Dispute Resolution Endpoint:**
```
POST /api/admin/dispute/resolve
```
**Location:** `server.py` line ~6570

---

## Security Considerations

1. **Only seller can release** - Verified by user_id check
2. **Trade expiry** - Auto-cancel after timeout returns crypto
3. **Double-release prevention** - Check `escrow_locked` flag
4. **Atomic transactions** - Use MongoDB transactions for balance updates
5. **Admin override** - Only admins can force-release disputed escrow

---

## Logging

All escrow operations are logged:

```python
logger.info(f"✅ Escrow locked: {amount} {currency} for trade {trade_id}")
logger.info(f"✅ Escrow released: {amount} {currency} to buyer {buyer_id}")
logger.error(f"❌ Escrow release failed: {error}")
```

View logs:
```bash
tail -f /var/log/supervisor/backend.err.log | grep -i escrow
```

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Insufficient balance" | Seller spent funds after listing | Cancel trade, notify seller |
| "Not the seller" | Wrong user trying to release | Verify user ID matches |
| "Escrow not locked" | Trade already completed/cancelled | Check trade status first |
| "Trade expired" | Timeout reached | Auto-cancel triggered |

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2025
