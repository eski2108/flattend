# COINHUBX COMPLETE PAYMENT FLOWS DOCUMENTATION
## Technical Reference - All Payment Types, Code & Business Dashboard Integration

**Generated:** 2025-12-22  
**Version:** 2.0 FINAL

---

# TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Balance Collections Architecture](#2-balance-collections-architecture)
3. [Core Sync Functions](#3-core-sync-functions)
4. [Payment Flow 1: SWAP](#4-payment-flow-1-swap)
5. [Payment Flow 2: P2P TRADE](#5-payment-flow-2-p2p-trade)
6. [Payment Flow 3: P2P EXPRESS BUY](#6-payment-flow-3-p2p-express-buy)
7. [Payment Flow 4: INSTANT BUY](#7-payment-flow-4-instant-buy)
8. [Payment Flow 5: INSTANT SELL](#8-payment-flow-5-instant-sell)
9. [Payment Flow 6: DEPOSIT](#9-payment-flow-6-deposit)
10. [Payment Flow 7: WITHDRAWAL](#10-payment-flow-7-withdrawal)
11. [Payment Flow 8: SPOT TRADING](#11-payment-flow-8-spot-trading)
12. [Payment Flow 9: SAVINGS](#12-payment-flow-9-savings)
13. [Payment Flow 10: REFERRAL COMMISSIONS](#13-payment-flow-10-referral-commissions)
14. [Payment Flow 11: DISPUTE FEES](#14-payment-flow-11-dispute-fees)
15. [Admin Liquidity System](#15-admin-liquidity-system)
16. [Business Dashboard Integration](#16-business-dashboard-integration)
17. [Admin Fee Withdrawal](#17-admin-fee-withdrawal)

---

# 1. SYSTEM OVERVIEW

## How Money Flows Through CoinHubX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER TRANSACTION                                   │
│  (Swap, P2P Trade, Instant Buy, Deposit, Withdrawal, etc.)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CALCULATE PLATFORM FEE                               │
│  (1-2.5% depending on transaction type)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│      USER BALANCE UPDATE       │   │     ADMIN WALLET UPDATE        │
│  (Debit/Credit user's wallet)  │   │  (Credit fee to admin_wallet)  │
└───────────────────────────────┘   └───────────────────────────────┘
                    │                               │
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│   SYNC TO ALL 4 COLLECTIONS    │   │   LOG TO admin_revenue         │
│  - wallets                     │   │   (For dashboard visibility)   │
│  - crypto_balances             │   │                                 │
│  - trader_balances             │   │   LOG TO fee_transactions      │
│  - internal_balances           │   │   (For audit trail)            │
└───────────────────────────────┘   └───────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │     BUSINESS DASHBOARD         │
                                    │   /admin/revenue shows fee     │
                                    │   with timestamp & type        │
                                    └───────────────────────────────┘
```

---

# 2. BALANCE COLLECTIONS ARCHITECTURE

## Why 4 Collections?

CoinHubX uses 4 separate collections for user balances. ALL MUST BE KEPT IN SYNC.

| Collection | Purpose | Key Field |
|------------|---------|----------|
| `wallets` | Main wallet display | `user_id` |
| `crypto_balances` | Crypto-specific operations | `user_id` |
| `trader_balances` | P2P trading operations | `trader_id` |
| `internal_balances` | Internal transfers | `user_id` |

## Database Schema

```javascript
// wallets collection
{
  "user_id": "d9a3a9d3-7b87-4744-86de-6501e9ae3e71",
  "currency": "BTC",
  "available_balance": 0.05,
  "locked_balance": 0.01,
  "total_balance": 0.06,
  "last_updated": ISODate("2025-12-22T11:02:27Z")
}

// admin_revenue collection (WHERE FEES ARE LOGGED)
{
  "revenue_id": "uuid",
  "source": "swap_fee",           // Fee type
  "amount": 0.00003,               // Fee amount
  "currency": "BTC",
  "user_id": "user_who_paid",
  "timestamp": ISODate("2025-12-22T11:02:27Z"),  // MUST BE DATETIME, NOT STRING
  "description": "Swap fee (1.5%) from BTC to ETH"
}

// admin_wallet (WHERE FEE MONEY ACTUALLY GOES)
{
  "user_id": "admin_wallet",
  "currency": "BTC",
  "available_balance": 0.00106500,  // All collected BTC fees
  "locked_balance": 0
}
```

---

# 3. CORE SYNC FUNCTIONS

## Location: `/app/backend/server.py` (Lines 265-450)

**THESE FUNCTIONS ARE FROZEN - DO NOT MODIFY WITHOUT AUTHORIZATION**

### sync_credit_balance
```python
# ⚠️ SYNC_CREDIT - INTEGRITY_CHECKSUM: f8a9e2c1d4b7 - DO NOT MODIFY ⚠️
async def sync_credit_balance(user_id: str, currency: str, amount: float, reason: str = "credit"):
    """
    FROZEN FUNCTION - Credit (add) to user's balance across ALL 4 collections.
    ATOMIC UPDATE TO: wallets, crypto_balances, trader_balances, internal_balances
    """
    try:
        timestamp = datetime.now(timezone.utc)
        
        # Get current balance from wallets (source of truth)
        wallet = await db.wallets.find_one({"user_id": user_id, "currency": currency})
        current_available = float(wallet.get("available_balance", 0)) if wallet else 0
        current_locked = float(wallet.get("locked_balance", 0)) if wallet else 0
        
        new_available = current_available + amount
        new_total = new_available + current_locked
        
        # UPDATE ALL 4 COLLECTIONS
        balance_data = {
            "available_balance": new_available,
            "locked_balance": current_locked,
            "total_balance": new_total,
            "balance": new_available,
            "last_updated": timestamp,
            "updated_at": timestamp
        }
        
        # 1. wallets
        await db.wallets.update_one(
            {"user_id": user_id, "currency": currency},
            {"$set": {**balance_data, "user_id": user_id, "currency": currency}},
            upsert=True
        )
        
        # 2. internal_balances
        await db.internal_balances.update_one(
            {"user_id": user_id, "currency": currency},
            {"$set": {**balance_data, "user_id": user_id, "currency": currency}},
            upsert=True
        )
        
        # 3. crypto_balances
        await db.crypto_balances.update_one(
            {"user_id": user_id, "currency": currency},
            {"$set": {**balance_data, "user_id": user_id, "currency": currency}},
            upsert=True
        )
        
        # 4. trader_balances
        await db.trader_balances.update_one(
            {"trader_id": user_id, "currency": currency},
            {"$set": {**balance_data, "trader_id": user_id, "currency": currency}},
            upsert=True
        )
        
        logger.info(f"✅ SYNC CREDIT: {user_id} +{amount} {currency} ({reason})")
        return True
        
    except Exception as e:
        logger.error(f"❌ SYNC CREDIT FAILED: {str(e)}")
        return False
```

### sync_debit_balance
```python
# ⚠️ SYNC_DEBIT - INTEGRITY_CHECKSUM: f8a9e2c1d4b7 - DO NOT MODIFY ⚠️
async def sync_debit_balance(user_id: str, currency: str, amount: float, reason: str = "debit"):
    """
    FROZEN FUNCTION - Debit (subtract) from user's balance across ALL 4 collections.
    """
    # Same structure as credit, but subtracts amount
    new_available = current_available - amount
    # ... updates all 4 collections
```

### sync_lock_balance
```python
# ⚠️ SYNC_LOCK - INTEGRITY_CHECKSUM: f8a9e2c1d4b7 - DO NOT MODIFY ⚠️
async def sync_lock_balance(user_id: str, currency: str, amount: float, reason: str = "lock"):
    """
    FROZEN FUNCTION - Move from available to locked (for escrow/trades).
    """
    new_available = current_available - amount
    new_locked = current_locked + amount
    # ... updates all 4 collections
```

---

# 4. PAYMENT FLOW 1: SWAP

## Overview
User exchanges one cryptocurrency for another (e.g., BTC → ETH)

## Fee Structure
- **Swap Fee:** 1.5% of the from_amount
- **Fee goes to:** `admin_wallet`

## Code Location
- **Endpoint:** `/api/swap/execute` (`server.py` line 13472)
- **Service:** `swap_wallet_service.py`

## Complete Flow

```python
# FILE: /app/backend/swap_wallet_service.py

async def execute_swap_with_wallet(user_id, from_currency, to_currency, from_amount):
    """
    SWAP EXECUTION FLOW
    """
    
    # STEP 1: Calculate swap fee (1.5%)
    swap_fee_percent = 0.015
    swap_fee_crypto = from_amount * swap_fee_percent  # e.g., 0.002 * 0.015 = 0.00003 BTC
    
    # STEP 2: Calculate amounts
    from_amount_after_fee = from_amount - swap_fee_crypto
    
    # STEP 3: Get exchange rate and calculate to_amount
    rate = await get_exchange_rate(from_currency, to_currency)
    to_amount = from_amount_after_fee * rate
    
    # STEP 4: DEBIT USER (remove BTC from user)
    await db.wallets.update_one(
        {"user_id": user_id, "currency": from_currency},
        {"$inc": {"available_balance": -from_amount}}
    )
    # ... same for other 3 collections
    
    # STEP 5: CREDIT USER (add ETH to user)
    await db.wallets.update_one(
        {"user_id": user_id, "currency": to_currency},
        {"$inc": {"available_balance": to_amount}}
    )
    # ... same for other 3 collections
    
    # STEP 6: CREDIT ADMIN WALLET WITH FEE ⭐ THIS IS WHERE MONEY GOES
    timestamp = datetime.now(timezone.utc)
    admin_wallet = await db.wallets.find_one({"user_id": "admin_wallet", "currency": from_currency})
    current_balance = float(admin_wallet.get("available_balance", 0)) if admin_wallet else 0
    new_balance = current_balance + swap_fee_crypto
    
    balance_update = {
        "available_balance": new_balance,
        "total_balance": new_balance,
        "last_updated": timestamp
    }
    
    # Update admin_wallet in ALL 4 collections
    await db.wallets.update_one(
        {"user_id": "admin_wallet", "currency": from_currency},
        {"$set": {**balance_update, "user_id": "admin_wallet", "currency": from_currency}},
        upsert=True
    )
    await db.internal_balances.update_one(...)
    await db.crypto_balances.update_one(...)
    await db.trader_balances.update_one(...)
    
    logger.info(f"💰 SWAP FEE {swap_fee_crypto} {from_currency} credited to admin_wallet")
    
    # STEP 7: LOG TO admin_revenue FOR DASHBOARD
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "swap_fee",
        "amount": swap_fee_crypto,
        "currency": from_currency,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc),  # DATETIME, NOT STRING!
        "description": f"Swap fee ({swap_fee_percent*100}%) from {from_currency} to {to_currency}"
    })
    
    return {
        "success": True,
        "from_amount": from_amount,
        "to_amount": to_amount,
        "fee_amount": swap_fee_crypto
    }
```

## Dashboard Visibility

The fee appears in:
- `/admin/revenue` page under "swap_fee"
- `admin_wallet` balance increases
- `admin_revenue` collection has the record with timestamp

---

# 5. PAYMENT FLOW 2: P2P TRADE

## Overview
Peer-to-peer trading between users (Seller sells BTC, Buyer pays GBP)

## Fee Structure
- **Maker Fee:** 1% (paid by offer creator)
- **Taker Fee:** 1% (paid by offer taker)
- **Total Platform Fee:** ~1-2% depending on trade side

## Code Location
- **Create Trade:** `/api/p2p/create-trade` (`server.py`)
- **Release Escrow:** `/api/p2p/release-escrow` (`server.py`)

## Complete Flow

```python
# FILE: /app/backend/server.py

# STEP 1: SELLER CREATES OFFER
@api_router.post("/p2p/create-offer")
async def create_p2p_offer(request):
    # Seller locks their crypto in escrow
    await sync_lock_balance(
        seller_id, 
        crypto_currency, 
        crypto_amount, 
        "p2p_escrow_lock"
    )
    
    # Create offer in database
    offer = {
        "offer_id": str(uuid.uuid4()),
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.01,
        "fiat_currency": "GBP",
        "fiat_amount": 690,
        "status": "active"
    }
    await db.p2p_offers.insert_one(offer)

# STEP 2: BUYER INITIATES TRADE
@api_router.post("/p2p/create-trade")
async def create_p2p_trade(request):
    # Calculate platform fee
    platform_fee_percent = 0.01  # 1%
    platform_fee = fiat_amount * platform_fee_percent  # £690 * 1% = £6.90
    
    trade = {
        "trade_id": str(uuid.uuid4()),
        "offer_id": offer_id,
        "seller_id": seller_id,
        "buyer_id": buyer_id,
        "crypto_amount": 0.01,
        "fiat_amount": 690,
        "platform_fee": platform_fee,
        "status": "pending_payment"
    }
    await db.p2p_trades.insert_one(trade)

# STEP 3: BUYER CONFIRMS PAYMENT (off-platform bank transfer)
# Status changes to "payment_confirmed"

# STEP 4: SELLER RELEASES ESCROW
@api_router.post("/p2p/release-escrow")
async def release_escrow(request):
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    
    # Calculate amounts
    crypto_amount = trade["crypto_amount"]
    platform_fee = trade["platform_fee"]
    
    # RELEASE CRYPTO TO BUYER
    await sync_release_locked_balance(
        trade["seller_id"],
        trade["crypto_currency"],
        crypto_amount,
        trade["buyer_id"],
        "p2p_trade_release"
    )
    
    # CREDIT PLATFORM FEE TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        "GBP",
        platform_fee,
        "p2p_trade_fee"
    )
    
    # LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "p2p_trade_fee",
        "amount": platform_fee,
        "currency": "GBP",
        "trade_id": trade_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # Update trade status
    await db.p2p_trades.update_one(
        {"trade_id": trade_id},
        {"$set": {"status": "completed"}}
    )
```

---

# 6. PAYMENT FLOW 3: P2P EXPRESS BUY

## Overview
Instant P2P purchase from exchange liquidity (no waiting for seller)

## Fee Structure
- **Express Fee:** 2% of purchase amount
- **Fee goes to:** `admin_wallet` and `PLATFORM_FEES`

## Code Location
- **Endpoint:** `/api/p2p-express/buy` (`server.py` line ~7450)

## Complete Flow

```python
@api_router.post("/p2p-express/buy")
async def p2p_express_buy(request):
    """
    User buys crypto instantly from exchange liquidity
    """
    user_id = request.user_id
    crypto_currency = request.crypto_currency  # "BTC"
    fiat_amount = request.fiat_amount  # £500
    
    # STEP 1: Calculate express fee (2%)
    express_fee_percent = 0.02
    express_fee = fiat_amount * express_fee_percent  # £500 * 2% = £10
    
    # STEP 2: Calculate crypto amount after fee
    net_fiat = fiat_amount - express_fee  # £490
    crypto_price = await get_crypto_price(crypto_currency, "GBP")
    crypto_amount = net_fiat / crypto_price  # £490 / £69000 = 0.0071 BTC
    
    # STEP 3: Debit from admin liquidity
    await db.admin_liquidity_wallets.update_one(
        {"currency": crypto_currency},
        {"$inc": {"available": -crypto_amount}}
    )
    
    # STEP 4: Credit user with crypto
    await sync_credit_balance(
        user_id,
        crypto_currency,
        crypto_amount,
        "p2p_express_buy"
    )
    
    # STEP 5: CREDIT PLATFORM FEE ⭐
    await sync_credit_balance(
        "PLATFORM_FEES",
        "GBP",
        express_fee,
        "p2p_express_fee"
    )
    
    # STEP 6: LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "p2p_express_fee",
        "amount": express_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "crypto_amount": crypto_amount,
        "fiat_amount": fiat_amount,
        "express_fee": express_fee
    }
```

---

# 7. PAYMENT FLOW 4: INSTANT BUY

## Overview
User buys crypto with fiat using card/bank (different from P2P Express)

## Fee Structure
- **Spread:** 2.5% built into price
- **Fee goes to:** `admin_wallet`

## Code Location
- **Endpoint:** `/api/instant-buy/execute` (`server.py`)

## Complete Flow

```python
@api_router.post("/instant-buy/execute")
async def instant_buy(request):
    user_id = request.user_id
    fiat_amount = request.fiat_amount  # £100
    crypto_currency = request.crypto_currency  # "ETH"
    
    # STEP 1: Calculate spread (2.5%)
    spread_percent = 0.025
    spread_fee = fiat_amount * spread_percent  # £100 * 2.5% = £2.50
    
    # STEP 2: Calculate crypto amount
    net_fiat = fiat_amount - spread_fee  # £97.50
    crypto_price = await get_crypto_price(crypto_currency, "GBP")
    crypto_amount = net_fiat / crypto_price
    
    # STEP 3: Credit user with crypto
    await sync_credit_balance(
        user_id,
        crypto_currency,
        crypto_amount,
        "instant_buy"
    )
    
    # STEP 4: CREDIT SPREAD TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        "GBP",
        spread_fee,
        "instant_buy_spread"
    )
    
    # STEP 5: LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "instant_buy_spread",
        "amount": spread_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

---

# 8. PAYMENT FLOW 5: INSTANT SELL

## Overview
User sells crypto for fiat instantly

## Fee Structure
- **Spread:** 2.5% 
- **Fee goes to:** `admin_wallet`

## Complete Flow

```python
@api_router.post("/instant-sell/execute")
async def instant_sell(request):
    user_id = request.user_id
    crypto_amount = request.crypto_amount  # 0.01 BTC
    crypto_currency = request.crypto_currency
    
    # STEP 1: Calculate fiat value
    crypto_price = await get_crypto_price(crypto_currency, "GBP")
    gross_fiat = crypto_amount * crypto_price  # 0.01 * £69000 = £690
    
    # STEP 2: Calculate spread
    spread_percent = 0.025
    spread_fee = gross_fiat * spread_percent  # £690 * 2.5% = £17.25
    net_fiat = gross_fiat - spread_fee  # £672.75
    
    # STEP 3: Debit user's crypto
    await sync_debit_balance(
        user_id,
        crypto_currency,
        crypto_amount,
        "instant_sell"
    )
    
    # STEP 4: Credit user's GBP
    await sync_credit_balance(
        user_id,
        "GBP",
        net_fiat,
        "instant_sell_proceeds"
    )
    
    # STEP 5: CREDIT SPREAD TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        "GBP",
        spread_fee,
        "instant_sell_spread"
    )
    
    # STEP 6: LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "instant_sell_spread",
        "amount": spread_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

---

# 9. PAYMENT FLOW 6: DEPOSIT

## Overview
User deposits fiat or crypto into their wallet

## Fee Structure
- **Deposit Fee:** 0.5% (configurable)
- **Fee goes to:** `admin_wallet`

## Code Location
- **Fiat Deposit:** `/api/deposits/fiat` (`server.py`)
- **Crypto Deposit:** `/api/webhooks/nowpayments` (`server.py` line 31637)

## Complete Flow - Fiat Deposit

```python
@api_router.post("/deposits/fiat")
async def fiat_deposit(request):
    user_id = request.user_id
    amount = request.amount  # £500
    
    # STEP 1: Calculate deposit fee
    deposit_fee_percent = 0.005  # 0.5%
    deposit_fee = amount * deposit_fee_percent  # £500 * 0.5% = £2.50
    net_deposit = amount - deposit_fee  # £497.50
    
    # STEP 2: Credit user
    await sync_credit_balance(
        user_id,
        "GBP",
        net_deposit,
        "fiat_deposit"
    )
    
    # STEP 3: CREDIT FEE TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        "GBP",
        deposit_fee,
        "deposit_fee"
    )
    
    # STEP 4: LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "deposit_fee",
        "amount": deposit_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

## Complete Flow - Crypto Deposit (NOWPayments)

```python
@api_router.post("/webhooks/nowpayments")
async def nowpayments_webhook(request):
    """
    Called by NOWPayments when user sends crypto
    """
    payment_status = request.payment_status
    
    if payment_status == "finished":
        user_id = request.order_id  # User ID stored in order_id
        crypto_currency = request.pay_currency.upper()
        crypto_amount = float(request.actually_paid)
        
        # Credit user's wallet
        await sync_credit_balance(
            user_id,
            crypto_currency,
            crypto_amount,
            "crypto_deposit"
        )
        
        # Log deposit
        await db.deposits.insert_one({
            "deposit_id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency": crypto_currency,
            "amount": crypto_amount,
            "status": "completed",
            "payment_id": request.payment_id,
            "created_at": datetime.now(timezone.utc)
        })
```

---

# 10. PAYMENT FLOW 7: WITHDRAWAL

## Overview
User withdraws fiat or crypto from their wallet

## Fee Structure
- **Withdrawal Fee:** Fixed £1.50 or 1% (configurable)
- **Fee goes to:** `admin_wallet`

## Complete Flow

```python
@api_router.post("/withdrawals/request")
async def request_withdrawal(request):
    user_id = request.user_id
    amount = request.amount  # £100
    currency = request.currency
    
    # STEP 1: Calculate withdrawal fee
    withdrawal_fee = 1.50  # Fixed fee
    net_withdrawal = amount - withdrawal_fee  # £98.50
    
    # STEP 2: Check user has sufficient balance
    wallet = await db.wallets.find_one({"user_id": user_id, "currency": currency})
    if wallet["available_balance"] < amount:
        raise HTTPException(400, "Insufficient balance")
    
    # STEP 3: Debit user's balance
    await sync_debit_balance(
        user_id,
        currency,
        amount,
        "withdrawal"
    )
    
    # STEP 4: CREDIT FEE TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        currency,
        withdrawal_fee,
        "withdrawal_fee"
    )
    
    # STEP 5: LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "withdrawal_fee",
        "amount": withdrawal_fee,
        "currency": currency,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # STEP 6: Create withdrawal record (for admin to process)
    await db.withdrawals.insert_one({
        "withdrawal_id": str(uuid.uuid4()),
        "user_id": user_id,
        "currency": currency,
        "amount": amount,
        "fee": withdrawal_fee,
        "net_amount": net_withdrawal,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    })
```

---

# 11. PAYMENT FLOW 8: SPOT TRADING

## Overview
User places buy/sell orders on the trading page

## Fee Structure
- **Trading Fee:** 0.1% (maker/taker)
- **Fee goes to:** `admin_wallet`

## Complete Flow

```python
@api_router.post("/trading/order")
async def place_order(request):
    user_id = request.user_id
    pair = request.pair  # "BTC-GBP"
    side = request.side  # "buy" or "sell"
    amount = request.amount
    price = request.price
    
    total = amount * price  # 0.01 BTC * £69000 = £690
    
    # Calculate trading fee
    trading_fee_percent = 0.001  # 0.1%
    trading_fee = total * trading_fee_percent  # £690 * 0.1% = £0.69
    
    # ... execute order matching ...
    
    # CREDIT FEE TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        "GBP",
        trading_fee,
        "spot_trading_fee"
    )
    
    # LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "spot_trading_fee",
        "amount": trading_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

---

# 12. PAYMENT FLOW 9: SAVINGS

## Overview
User deposits crypto into notice savings account

## Fee Structure
- **Early Withdrawal Penalty:** 5-10% if withdrawn before notice period
- **Penalty goes to:** `admin_wallet`

## Complete Flow

```python
@api_router.post("/savings/give-notice")
async def give_savings_notice(request):
    """
    User gives notice to withdraw from savings
    """
    position_id = request.position_id
    
    position = await db.savings_positions.find_one({"position_id": position_id})
    notice_days = position["notice_period"]  # 30, 60, or 90 days
    
    # Calculate available date
    available_date = datetime.now(timezone.utc) + timedelta(days=notice_days)
    
    await db.savings_positions.update_one(
        {"position_id": position_id},
        {"$set": {
            "notice_given_at": datetime.now(timezone.utc),
            "available_date": available_date,
            "status": "notice_given"
        }}
    )

@api_router.post("/savings/withdraw-early")
async def withdraw_savings_early(request):
    """
    User withdraws before notice period - PENALTY APPLIES
    """
    position_id = request.position_id
    
    position = await db.savings_positions.find_one({"position_id": position_id})
    amount = position["amount"]
    currency = position["currency"]
    
    # Calculate penalty (e.g., 5%)
    penalty_percent = 0.05
    penalty = amount * penalty_percent
    net_withdrawal = amount - penalty
    
    # Return funds to user (minus penalty)
    await sync_credit_balance(
        position["user_id"],
        currency,
        net_withdrawal,
        "savings_early_withdrawal"
    )
    
    # CREDIT PENALTY TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        currency,
        penalty,
        "savings_early_withdrawal_penalty"
    )
    
    # LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "savings_penalty",
        "amount": penalty,
        "currency": currency,
        "user_id": position["user_id"],
        "timestamp": datetime.now(timezone.utc)
    })
```

---

# 13. PAYMENT FLOW 10: REFERRAL COMMISSIONS

## Overview
Users earn commission when their referrals make trades

## Fee Structure
- **Referrer gets:** 10-20% of platform fee from referee's trades
- **Platform keeps:** 80-90% of fee

## Complete Flow

```python
async def process_referral_commission(user_id, fee_amount, fee_type):
    """
    Called after any fee-generating transaction
    """
    # Check if user has a referrer
    user = await db.users.find_one({"user_id": user_id})
    referrer_id = user.get("referred_by")
    
    if not referrer_id:
        return  # No referral, platform keeps 100%
    
    # Calculate referrer commission (e.g., 10%)
    referral_percent = 0.10
    referrer_commission = fee_amount * referral_percent
    platform_net = fee_amount - referrer_commission
    
    # CREDIT REFERRER
    await sync_credit_balance(
        referrer_id,
        "GBP",
        referrer_commission,
        "referral_commission"
    )
    
    # LOG COMMISSION PAID OUT
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "referral_commission",
        "amount": referrer_commission,
        "currency": "GBP",
        "referrer_id": referrer_id,
        "referee_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # LOG PLATFORM NET (after referral payout)
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": f"referral_net_share_{fee_type}",
        "amount": platform_net,
        "currency": "GBP",
        "timestamp": datetime.now(timezone.utc)
    })
```

---

# 14. PAYMENT FLOW 11: DISPUTE FEES

## Overview
Fees charged when P2P trade disputes are resolved

## Fee Structure
- **Dispute Fee:** £25-50 charged to losing party
- **Fee goes to:** `admin_wallet`

## Complete Flow

```python
@api_router.post("/admin/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id, winner_id):
    dispute = await db.disputes.find_one({"dispute_id": dispute_id})
    trade = await db.p2p_trades.find_one({"trade_id": dispute["trade_id"]})
    
    # Determine loser
    loser_id = trade["seller_id"] if winner_id == trade["buyer_id"] else trade["buyer_id"]
    
    # Charge dispute fee to loser
    dispute_fee = 25.00
    
    await sync_debit_balance(
        loser_id,
        "GBP",
        dispute_fee,
        "dispute_fee"
    )
    
    # CREDIT FEE TO ADMIN ⭐
    await sync_credit_balance(
        "admin_wallet",
        "GBP",
        dispute_fee,
        "dispute_fee"
    )
    
    # LOG TO admin_revenue
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "dispute_fee",
        "amount": dispute_fee,
        "currency": "GBP",
        "dispute_id": dispute_id,
        "charged_to": loser_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

---

# 15. ADMIN LIQUIDITY SYSTEM

## Overview
The exchange maintains liquidity pools for instant buy/sell and P2P Express

## Database Collection
```javascript
// admin_liquidity_wallets
{
  "currency": "BTC",
  "available": 10.005,      // Available for instant trades
  "reserved": 0,             // Locked in pending trades
  "deposit_address": "bc1q...",  // NOWPayments address
  "last_topped_up": ISODate()
}
```

## How Liquidity Works

```python
# LIQUIDITY TOP-UP (Admin deposits crypto)
@api_router.post("/admin/liquidity/top-up")
async def top_up_liquidity(request):
    currency = request.currency
    amount = request.amount
    
    await db.admin_liquidity_wallets.update_one(
        {"currency": currency},
        {"$inc": {"available": amount}}
    )

# LIQUIDITY USED (When user does P2P Express buy)
async def use_liquidity(currency, amount):
    # Check available liquidity
    liquidity = await db.admin_liquidity_wallets.find_one({"currency": currency})
    
    if liquidity["available"] < amount:
        raise HTTPException(400, "Insufficient liquidity")
    
    # Debit from liquidity pool
    await db.admin_liquidity_wallets.update_one(
        {"currency": currency},
        {"$inc": {"available": -amount}}
    )

# LIQUIDITY RETURNED (When user sells crypto)
async def return_liquidity(currency, amount):
    await db.admin_liquidity_wallets.update_one(
        {"currency": currency},
        {"$inc": {"available": amount}}
    )
```

## Current Liquidity Balances

| Currency | Available | Reserved |
|----------|-----------|----------|
| BTC | 10.005 | 0 |
| ETH | 99.904 | 0 |
| GBP | 500,121.58 | 0 |
| USDT | 99,709.39 | 0 |
| BNB | 1,000 | 0 |
| SOL | 5,000 | 0 |

---

# 16. BUSINESS DASHBOARD INTEGRATION

## How Fees Appear in Dashboard

### API Endpoint
```python
# FILE: /app/backend/server.py (Line 30358)

@api_router.get("/admin/revenue/dashboard")
async def get_revenue_dashboard(timeframe: str = "all"):
    """
    Returns all fee data for the admin dashboard
    """
    
    # Query admin_revenue collection (sorted newest first)
    revenue_records = await db.admin_revenue.find({}).sort("timestamp", -1).to_list(10000)
    
    # Calculate totals by fee type
    by_fee_type = {}
    total_revenue = 0
    
    for record in revenue_records:
        fee_type = record.get("source", record.get("fee_type", "unknown"))
        amount = record.get("amount", 0)
        currency = record.get("currency", "GBP")
        
        # Convert to GBP for totals
        if currency != "GBP":
            price_gbp = await get_crypto_price(currency, "GBP")
            amount_gbp = amount * price_gbp
        else:
            amount_gbp = amount
        
        total_revenue += amount_gbp
        
        if fee_type not in by_fee_type:
            by_fee_type[fee_type] = {"total": 0, "count": 0}
        by_fee_type[fee_type]["total"] += amount_gbp
        by_fee_type[fee_type]["count"] += 1
    
    # Build recent transactions list (newest first)
    recent_transactions = []
    for record in revenue_records[:20]:
        recent_transactions.append({
            "timestamp": record.get("timestamp").isoformat(),
            "fee_type": record.get("source"),
            "amount": record.get("amount"),
            "currency": record.get("currency")
        })
    
    return {
        "success": True,
        "summary": {
            "total_revenue_gbp": total_revenue,
            "total_transactions": len(revenue_records)
        },
        "by_fee_type": by_fee_type,
        "recent_transactions": recent_transactions,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
```

### Frontend Display
```javascript
// FILE: /app/frontend/src/pages/AdminRevenue.js

useEffect(() => {
    const fetchRevenue = async () => {
        const response = await axios.get('/api/admin/revenue/dashboard');
        setRevenueData(response.data);
    };
    fetchRevenue();
}, []);

// Displays:
// - Total Platform Revenue: £208.27
// - Net (After Referrals): £197.21
// - Revenue Breakdown pie chart
// - Recent Fee Transactions list with timestamps
```

---

# 17. ADMIN FEE WITHDRAWAL

## How to Withdraw Collected Fees

### Step 1: Go to Admin Fees Page
```
https://coinhubx.net/admin/fees
```

### Step 2: Click "Withdraw to External Wallet"

### Step 3: Select Currency, Enter Amount, Enter Wallet Address

### Step 4: API Processes Withdrawal
```python
# FILE: /app/backend/server.py

@api_router.post("/admin/withdraw")
async def admin_withdraw(request):
    currency = request.currency
    amount = request.amount
    external_address = request.wallet_address
    
    # Check admin_wallet balance
    admin_wallet = await db.wallets.find_one(
        {"user_id": "admin_wallet", "currency": currency}
    )
    
    if admin_wallet["available_balance"] < amount:
        raise HTTPException(400, "Insufficient admin balance")
    
    # Debit admin_wallet
    await db.wallets.update_one(
        {"user_id": "admin_wallet", "currency": currency},
        {"$inc": {"available_balance": -amount}}
    )
    
    # For crypto: Create NOWPayments payout
    if currency in ["BTC", "ETH", "USDT"]:
        payout = await nowpayments.create_payout(
            address=external_address,
            currency=currency,
            amount=amount
        )
    
    # For GBP: Create bank transfer record
    else:
        await db.admin_withdrawals.insert_one({
            "withdrawal_id": str(uuid.uuid4()),
            "currency": currency,
            "amount": amount,
            "destination": external_address,
            "status": "pending",
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"success": True, "amount": amount}
```

---

# SUMMARY: WHERE ALL FEES GO

| Transaction Type | Fee % | Fee Goes To | Dashboard Source |
|-----------------|-------|-------------|------------------|
| Swap | 1.5% | `admin_wallet` | `swap_fee` |
| P2P Trade | 1% | `admin_wallet` | `p2p_trade_fee` |
| P2P Express | 2% | `PLATFORM_FEES` | `p2p_express_fee` |
| Instant Buy | 2.5% | `admin_wallet` | `instant_buy_spread` |
| Instant Sell | 2.5% | `admin_wallet` | `instant_sell_spread` |
| Deposit | 0.5% | `admin_wallet` | `deposit_fee` |
| Withdrawal | £1.50 | `admin_wallet` | `withdrawal_fee` |
| Spot Trading | 0.1% | `admin_wallet` | `spot_trading_fee` |
| Savings Penalty | 5% | `admin_wallet` | `savings_penalty` |
| Dispute | £25+ | `admin_wallet` | `dispute_fee` |

---

# VERIFICATION ENDPOINT

```bash
# Check if all balances are synced
curl https://coinhubx.net/api/integrity/check

# Expected response:
{
  "status": "healthy",
  "details": "All balances in sync across all 4 collections"
}
```

---

**Document Version:** 2.0  
**Last Updated:** 2025-12-22  
**Checksum:** COINHUBX_PAYMENT_FLOWS_FINAL
