# CoinHubX P2P Trading - Complete Flow Documentation

## Overview

The P2P (Peer-to-Peer) trading system allows users to buy and sell cryptocurrency directly with each other using fiat payment methods. The platform acts as an escrow service to ensure secure transactions.

---

## 🏪 P2P MARKETPLACE PAGE

**URL:** `/p2p/marketplace`

### What Users See:
- List of available buy/sell offers from other users
- Filters for crypto type (BTC, ETH, USDT, etc.)
- Filters for fiat currency (GBP, USD, EUR, etc.)
- Filters for payment methods (Bank Transfer, PayPal, Revolut, etc.)
- Seller ratings, completion rates, and badges
- Price per coin and available amounts

### Actions Available:
1. **Browse Offers** - View all available offers
2. **Filter Offers** - By crypto, fiat, payment method, rating
3. **Sort Offers** - By price, rating, speed, trades completed
4. **View Seller Profile** - See seller's history and stats
5. **Start Trade** - Click "Buy" or "Sell" on an offer

---

## 👤 USER ROLES

### SELLER (Creates Offers)
- Creates sell offers specifying:
  - Crypto type and amount available
  - Price per coin (in fiat)
  - Accepted payment methods
  - Min/max trade limits
  - Trading hours availability

### BUYER (Takes Offers)
- Browses available offers
- Selects an offer to buy from
- Sends fiat payment to seller
- Receives crypto once seller confirms

---

## 🔄 COMPLETE P2P TRADE FLOW

### STEP 1: SELLER CREATES OFFER
**Endpoint:** `POST /api/p2p/create-offer`

```
Seller Actions:
1. Go to P2P Marketplace
2. Click "Create Offer" or "Sell"
3. Select crypto to sell (e.g., BTC)
4. Enter amount available (e.g., 0.5 BTC)
5. Set price per coin (e.g., £42,000/BTC)
6. Select accepted payment methods
7. Set min/max trade limits
8. Submit offer

System Actions:
- Validates seller has sufficient balance
- Creates offer in database
- Offer appears in marketplace
```

---

### STEP 2: BUYER BROWSES & SELECTS OFFER
**Endpoint:** `GET /api/p2p/marketplace/offers`

```
Buyer Actions:
1. Go to P2P Marketplace
2. Select "Buy" tab
3. Filter by desired crypto (BTC)
4. Filter by fiat currency (GBP)
5. Review seller ratings and prices
6. Click "Buy" on chosen offer

System Shows:
- Seller's profile and stats
- Price breakdown
- Available payment methods
- Trade limits
```

---

### STEP 3: BUYER INITIATES TRADE
**Endpoint:** `POST /api/p2p/create-trade`

```
Buyer Actions:
1. Enter amount to buy (e.g., 0.1 BTC)
2. Select payment method (e.g., Bank Transfer)
3. Enter their wallet address for receiving crypto
4. Confirm trade

System Actions:
- Creates trade record with status "pending_payment"
- LOCKS seller's crypto in ESCROW
- Generates payment deadline (usually 30 mins)
- Notifies seller of new trade
- Opens trade chat between buyer/seller
```

**ESCROW LOCK:**
```
┌─────────────────────────────────────┐
│  SELLER'S WALLET                    │
│  ────────────────                   │
│  Available: 0.4 BTC                 │
│  Locked (Escrow): 0.1 BTC ◄─────────│── Locked for this trade
│  Total: 0.5 BTC                     │
└─────────────────────────────────────┘
```

---

### STEP 4: BUYER MAKES FIAT PAYMENT
**Endpoint:** `POST /api/p2p/mark-paid`

```
Buyer Actions:
1. View seller's payment details in trade chat
2. Send fiat payment via selected method (Bank Transfer, PayPal, etc.)
3. Upload payment proof (screenshot/reference)
4. Click "I Have Paid" button

System Actions:
- Updates trade status to "buyer_marked_paid"
- Notifies seller that payment was made
- Payment proof attached to trade
- Timer continues for seller to verify
```

**TRADE PAGE SHOWS:**
```
┌─────────────────────────────────────────────────┐
│  TRADE #TRD-ABC123                              │
│  ───────────────────────────────────────────── │
│  Status: PAYMENT SENT ⏳                        │
│  Amount: 0.1 BTC (£4,200)                      │
│  Payment Method: Bank Transfer                  │
│                                                 │
│  Seller's Bank Details:                         │
│  Bank: Barclays                                 │
│  Account: 12345678                              │
│  Sort Code: 20-00-00                            │
│  Reference: TRD-ABC123                          │
│                                                 │
│  [Upload Payment Proof]  [I Have Paid]          │
│                                                 │
│  Time Remaining: 24:32                          │
└─────────────────────────────────────────────────┘
```

---

### STEP 5: SELLER VERIFIES PAYMENT

```
Seller Actions:
1. Receives notification of payment
2. Checks their bank/payment account
3. Verifies payment received and correct amount
4. Reviews payment proof uploaded by buyer
```

---

### STEP 6: SELLER RELEASES CRYPTO
**Endpoint:** `POST /api/p2p/release-crypto`

```
Seller Actions:
1. Confirms payment received in their account
2. Clicks "Release Crypto" button
3. Confirms release in popup

System Actions:
- Verifies seller authorization
- Calculates platform fee (default 3%)
- UNLOCKS crypto from escrow
- DEDUCTS crypto from seller's balance
- CREDITS crypto to buyer's balance (minus fee)
- CREDITS platform fee to admin wallet
- Updates trade status to "completed"
- Updates both users' trade statistics
- Notifies buyer of completion
```

**FEE STRUCTURE:**
```
Trade Amount: 0.1 BTC
Platform Fee (3%): 0.003 BTC
Buyer Receives: 0.097 BTC

┌─────────────────────────────────────┐
│  DISTRIBUTION                       │
│  ────────────────                   │
│  Buyer Wallet: +0.097 BTC           │
│  Platform Fee Wallet: +0.003 BTC    │
│  Seller Wallet: -0.1 BTC            │
└─────────────────────────────────────┘
```

---

### STEP 7: TRADE COMPLETE

```
Both Users:
- Trade marked as "completed"
- Can rate each other (1-5 stars)
- Can leave feedback
- Trade history updated
- Statistics updated (trades completed, volume, etc.)

Buyer:
- Crypto now in their CoinHubX wallet
- Can withdraw to external wallet or trade

Seller:
- Fiat payment received (external to platform)
- Trade count increased
- Rating updated based on buyer's feedback
```

---

## ⚠️ DISPUTE FLOW

If there's a problem with the trade:

**Endpoint:** `POST /api/p2p/dispute`

```
Dispute Triggers:
- Buyer claims payment made but seller won't release
- Seller claims payment not received
- Payment amount incorrect
- Payment method different than agreed

Dispute Process:
1. Either party clicks "Open Dispute"
2. Trade status changes to "disputed"
3. Crypto remains locked in escrow
4. Admin notified of dispute
5. Both parties submit evidence
6. Admin reviews and decides
7. Admin releases crypto to correct party OR cancels trade
```

---

## ❌ TRADE CANCELLATION

**Endpoint:** `POST /api/p2p/cancel-trade`

```
Cancellation Scenarios:

1. BUYER CANCELS (before payment):
   - Trade cancelled
   - Crypto unlocked from escrow
   - Returns to seller's available balance
   - No penalty (if within time)

2. TRADE EXPIRES (payment deadline):
   - Auto-cancelled after timeout
   - Crypto returned to seller
   - Buyer may receive strike

3. MUTUAL CANCELLATION:
   - Both parties agree to cancel
   - Crypto returned to seller
   - No penalties
```

---

## 📱 TRADE CHAT

**Endpoint:** `POST /api/p2p/trade/message`

Features:
- Real-time messaging between buyer and seller
- File/image upload for payment proofs
- Predefined quick messages
- Trade action buttons integrated
- Message history preserved

---

## 🚀 P2P EXPRESS (INSTANT MATCHING)

**URL:** `/p2p/express`
**Endpoint:** `POST /api/p2p/express/create`

For quick trades without browsing:

```
Express Buy Flow:
1. User enters amount they want to buy
2. System auto-matches best available offer
3. Trade created instantly
4. User proceeds to payment

Express Sell Flow:
1. User enters amount they want to sell
2. System checks for available buyers
3. If match found, trade created
4. Seller's crypto locked in escrow
```

---

## 📊 SELLER LEVELS & BADGES

```
LEVELS:
- Bronze: New seller (0-10 trades)
- Silver: Established (11-50 trades) - 0.5% fee reduction
- Gold: Trusted (51+ trades) - 1.0% fee reduction

BADGES:
- ✓ Verified: Identity verified
- ⚡ Fast Trader: Avg release < 5 mins
- 🏆 Top Seller: 100+ completed trades
- 🛡️ Trusted: 99%+ completion rate
- ⭐ Highly Rated: 4.8+ star rating
```

---

## 🔒 SECURITY FEATURES

1. **Escrow Protection** - Crypto locked until fiat confirmed
2. **Time Limits** - Auto-cancel if payment not made
3. **Dispute System** - Admin arbitration available
4. **User Blocking** - Block problematic traders
5. **Rating System** - Community trust scores
6. **Identity Verification** - Optional KYC for higher limits
7. **Trade Limits** - Min/max per trade and daily limits
8. **Anti-Fraud** - Pattern detection for suspicious activity

---

## 📈 API ENDPOINTS SUMMARY

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/p2p/marketplace/offers` | GET | List all offers |
| `/api/p2p/create-offer` | POST | Create sell offer |
| `/api/p2p/create-trade` | POST | Initiate trade (locks escrow) |
| `/api/p2p/trade/{trade_id}` | GET | Get trade details |
| `/api/p2p/mark-paid` | POST | Buyer marks as paid |
| `/api/p2p/release-crypto` | POST | Seller releases crypto |
| `/api/p2p/cancel-trade` | POST | Cancel trade |
| `/api/p2p/trade/message` | POST | Send chat message |
| `/api/p2p/trade/{id}/messages` | GET | Get chat history |
| `/api/p2p/trades/user/{user_id}` | GET | User's trade history |
| `/api/p2p/seller/profile/{id}` | GET | Seller profile |
| `/api/p2p/express/create` | POST | Express instant trade |

---

## 💰 FEE STRUCTURE

| Fee Type | Rate | Paid By |
|----------|------|--------|
| P2P Trade Fee | 3% (default) | Seller |
| Silver Seller | 2.5% | Seller |
| Gold Seller | 2% | Seller |
| Express Trade | 3.5% | Buyer |
| Dispute Fee | 1% | Losing party |

---

## 🔄 STATUS FLOW DIAGRAM

```
                    ┌──────────────┐
                    │  OFFER LIVE  │
                    └──────┬───────┘
                           │ Buyer selects offer
                           ▼
                    ┌──────────────┐
            ┌───────│   PENDING    │───────┐
            │       │   PAYMENT    │       │
            │       └──────┬───────┘       │
            │              │               │
     Timeout/Cancel   Buyer pays    Buyer cancels
            │              │               │
            ▼              ▼               ▼
     ┌──────────┐   ┌──────────────┐  ┌──────────┐
     │ CANCELLED │   │ BUYER MARKED │  │ CANCELLED │
     └──────────┘   │    PAID      │  └──────────┘
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       Seller releases  Dispute    Seller cancels
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ COMPLETED │  │ DISPUTED │  │ CANCELLED │
       └──────────┘  └────┬─────┘  └──────────┘
                          │
                    Admin resolves
                          │
              ┌───────────┼───────────┐
              ▼                       ▼
       ┌──────────┐            ┌──────────┐
       │ COMPLETED │            │ CANCELLED │
       │(Buyer wins)│            │(Seller wins)│
       └──────────┘            └──────────┘
```

---

## 📱 FRONTEND PAGES

| Page | URL | Purpose |
|------|-----|--------|
| P2P Marketplace | `/p2p/marketplace` | Browse/filter offers |
| P2P Express | `/p2p/express` | Quick instant trades |
| Trade Page | `/p2p/trade/{id}` | Active trade details |
| My Trades | `/my-orders` | Trade history |
| Create Offer | `/p2p/create-offer` | Seller creates offer |
| Seller Profile | `/p2p/seller/{id}` | Public seller page |

---

*Document Generated: December 21, 2025*
*CoinHubX P2P Trading System v2.0*
