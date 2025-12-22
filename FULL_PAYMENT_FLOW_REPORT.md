# COINHUBX FULL PAYMENT FLOW REPORT
## Every Page, Every Transaction, Every Fee - Complete Documentation

**Date:** 2025-12-22
**Time:** 11:20 UTC

---

# PAGE 1: HOME PAGE (`/`)

## What Happens:
- No payments on this page
- User sees welcome screen, can navigate to login/register

## Payment Flow: NONE

---

# PAGE 2: REGISTER PAGE (`/register`)

## What Happens:
- User creates account with email/phone
- No payment involved
- Referral code can be entered (affects future payments)

## Payment Flow: NONE

## Referral Code Effect:
```
IF user enters referral code:
  -> Save referred_by = referrer_user_id in users collection
  -> When this user makes trades later, referrer gets commission
```

---

# PAGE 3: LOGIN PAGE (`/login`)

## What Happens:
- User logs in
- No payment involved

## Payment Flow: NONE

---

# PAGE 4: DASHBOARD PAGE (`/dashboard`)

## What Happens:
- Shows user's portfolio value
- Shows balances from `wallets` collection
- No direct payments

## Payment Flow: NONE (display only)

## Data Source:
```
GET /api/wallets/balances/{user_id}
-> Returns balances from wallets collection
-> Shows total portfolio value in GBP
```

---

# PAGE 5: WALLET PAGE (`/wallet`)

## What Happens:
- User sees all their crypto balances
- Can click Deposit, Withdraw, Send, Receive

## Sub-Flow 5A: DEPOSIT CRYPTO

### Step-by-Step:
1. User clicks "Deposit" on a coin (e.g., BTC)
2. Frontend calls `GET /api/deposit/address/{user_id}/{currency}`
3. Backend generates NOWPayments deposit address
4. User sees QR code and address
5. User sends crypto from external wallet
6. NOWPayments detects payment, calls webhook
7. Backend credits user's balance

### Code Flow:
```python
# STEP 1: Generate deposit address
@api_router.get("/deposit/address/{user_id}/{currency}")
async def get_deposit_address(user_id, currency):
    # Call NOWPayments API
    address = await nowpayments.create_payment(
        price_amount=0,
        pay_currency=currency,
        order_id=user_id
    )
    return {"address": address["pay_address"]}

# STEP 2: When user sends crypto, NOWPayments calls webhook
@api_router.post("/webhooks/nowpayments")
async def nowpayments_webhook(request):
    if request.payment_status == "finished":
        user_id = request.order_id
        currency = request.pay_currency.upper()
        amount = float(request.actually_paid)
        
        # CREDIT USER BALANCE (all 4 collections)
        await sync_credit_balance(user_id, currency, amount, "crypto_deposit")
        
        # LOG DEPOSIT
        await db.deposits.insert_one({
            "user_id": user_id,
            "currency": currency,
            "amount": amount,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc)
        })
```

### Fee: NONE for crypto deposits (network fee paid by user externally)

### Business Dashboard: Deposit logged in `deposits` collection, visible in admin

---

## Sub-Flow 5B: DEPOSIT FIAT (GBP)

### Step-by-Step:
1. User clicks "Deposit GBP"
2. User sees bank details for transfer
3. User sends bank transfer
4. Admin manually confirms receipt
5. Backend credits user's GBP balance

### Code Flow:
```python
@api_router.post("/admin/deposits/confirm")
async def confirm_fiat_deposit(request):
    user_id = request.user_id
    amount = request.amount  # e.g., £500
    
    # Calculate deposit fee (0.5%)
    deposit_fee = amount * 0.005  # £2.50
    net_amount = amount - deposit_fee  # £497.50
    
    # CREDIT USER
    await sync_credit_balance(user_id, "GBP", net_amount, "fiat_deposit")
    
    # CREDIT FEE TO ADMIN WALLET
    await sync_credit_balance("admin_wallet", "GBP", deposit_fee, "deposit_fee")
    
    # LOG TO ADMIN REVENUE (for dashboard)
    await db.admin_revenue.insert_one({
        "source": "deposit_fee",
        "amount": deposit_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

### Fee: 0.5% of deposit amount
### Fee Goes To: `admin_wallet` (GBP)
### Business Dashboard: Shows as `deposit_fee` in revenue breakdown

---

## Sub-Flow 5C: WITHDRAW CRYPTO

### Step-by-Step:
1. User clicks "Withdraw" on a coin
2. User enters external wallet address and amount
3. Frontend calls `POST /api/withdrawals/crypto`
4. Backend deducts balance + fee
5. Backend creates NOWPayments payout
6. Crypto sent to user's external wallet

### Code Flow:
```python
@api_router.post("/withdrawals/crypto")
async def withdraw_crypto(request):
    user_id = request.user_id
    currency = request.currency  # "BTC"
    amount = request.amount  # 0.01 BTC
    address = request.wallet_address
    
    # Calculate withdrawal fee (0.1% or minimum)
    withdrawal_fee = max(amount * 0.001, 0.0001)  # e.g., 0.00001 BTC
    net_withdrawal = amount - withdrawal_fee
    
    # CHECK BALANCE
    wallet = await db.wallets.find_one({"user_id": user_id, "currency": currency})
    if wallet["available_balance"] < amount:
        raise HTTPException(400, "Insufficient balance")
    
    # DEBIT USER (all 4 collections)
    await sync_debit_balance(user_id, currency, amount, "crypto_withdrawal")
    
    # CREDIT FEE TO ADMIN
    await sync_credit_balance("admin_wallet", currency, withdrawal_fee, "withdrawal_fee")
    
    # LOG TO ADMIN REVENUE
    await db.admin_revenue.insert_one({
        "source": "withdrawal_fee",
        "amount": withdrawal_fee,
        "currency": currency,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # CREATE PAYOUT VIA NOWPAYMENTS
    payout = await nowpayments.create_payout(
        address=address,
        currency=currency.lower(),
        amount=net_withdrawal
    )
    
    # LOG WITHDRAWAL
    await db.withdrawals.insert_one({
        "user_id": user_id,
        "currency": currency,
        "amount": amount,
        "fee": withdrawal_fee,
        "net_amount": net_withdrawal,
        "address": address,
        "status": "processing",
        "payout_id": payout["id"],
        "timestamp": datetime.now(timezone.utc)
    })
```

### Fee: 0.1% (minimum 0.0001 BTC)
### Fee Goes To: `admin_wallet` (BTC)
### Business Dashboard: Shows as `withdrawal_fee` in revenue breakdown

---

## Sub-Flow 5D: WITHDRAW FIAT (GBP)

### Step-by-Step:
1. User clicks "Withdraw GBP"
2. User enters bank details and amount
3. Frontend calls `POST /api/withdrawals/fiat`
4. Backend deducts balance + fee
5. Admin manually processes bank transfer

### Code Flow:
```python
@api_router.post("/withdrawals/fiat")
async def withdraw_fiat(request):
    user_id = request.user_id
    amount = request.amount  # £100
    bank_details = request.bank_details
    
    # Fixed withdrawal fee
    withdrawal_fee = 1.50  # £1.50
    net_withdrawal = amount - withdrawal_fee  # £98.50
    
    # CHECK BALANCE
    wallet = await db.wallets.find_one({"user_id": user_id, "currency": "GBP"})
    if wallet["available_balance"] < amount:
        raise HTTPException(400, "Insufficient balance")
    
    # DEBIT USER
    await sync_debit_balance(user_id, "GBP", amount, "fiat_withdrawal")
    
    # CREDIT FEE TO ADMIN
    await sync_credit_balance("admin_wallet", "GBP", withdrawal_fee, "withdrawal_fee")
    
    # LOG TO ADMIN REVENUE
    await db.admin_revenue.insert_one({
        "source": "withdrawal_fee",
        "amount": withdrawal_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # CREATE WITHDRAWAL REQUEST (admin processes manually)
    await db.withdrawals.insert_one({
        "user_id": user_id,
        "currency": "GBP",
        "amount": amount,
        "fee": withdrawal_fee,
        "net_amount": net_withdrawal,
        "bank_details": bank_details,
        "status": "pending",
        "timestamp": datetime.now(timezone.utc)
    })
```

### Fee: £1.50 fixed
### Fee Goes To: `admin_wallet` (GBP)
### Business Dashboard: Shows as `withdrawal_fee` in revenue breakdown

---

# PAGE 6: SWAP PAGE (`/swap-crypto`)

## What Happens:
- User exchanges one crypto for another (e.g., BTC → ETH)
- Platform takes 1.5% fee

## Step-by-Step:
1. User selects "From" currency (BTC) and "To" currency (ETH)
2. User enters amount (e.g., 0.01 BTC)
3. Frontend calls `POST /api/swap/preview` to show rate
4. User confirms swap
5. Frontend calls `POST /api/swap/execute`
6. Backend executes swap, takes fee

## Code Flow:
```python
# FILE: /app/backend/swap_wallet_service.py

async def execute_swap_with_wallet(user_id, from_currency, to_currency, from_amount):
    """
    Example: User swaps 0.01 BTC for ETH
    """
    
    # STEP 1: Get current prices
    from_price_gbp = await get_crypto_price(from_currency, "GBP")  # £69,000
    to_price_gbp = await get_crypto_price(to_currency, "GBP")  # £2,300
    
    from_value_gbp = from_amount * from_price_gbp  # 0.01 * £69,000 = £690
    
    # STEP 2: Calculate swap fee (1.5%)
    swap_fee_percent = 0.015
    swap_fee_crypto = from_amount * swap_fee_percent  # 0.01 * 1.5% = 0.00015 BTC
    swap_fee_gbp = from_value_gbp * swap_fee_percent  # £690 * 1.5% = £10.35
    
    # STEP 3: Calculate amounts after fee
    from_amount_after_fee = from_amount - swap_fee_crypto  # 0.00985 BTC
    from_value_after_fee_gbp = from_value_gbp - swap_fee_gbp  # £679.65
    
    # STEP 4: Calculate to_amount
    to_amount = from_value_after_fee_gbp / to_price_gbp  # £679.65 / £2,300 = 0.2955 ETH
    
    # STEP 5: CHECK USER HAS ENOUGH BALANCE
    wallet = await db.wallets.find_one({"user_id": user_id, "currency": from_currency})
    if wallet["available_balance"] < from_amount:
        raise HTTPException(400, "Insufficient balance")
    
    # STEP 6: DEBIT USER'S FROM_CURRENCY (all 4 collections)
    # Debit 0.01 BTC from user
    current_btc = wallet["available_balance"]
    new_btc = current_btc - from_amount
    
    await db.wallets.update_one(
        {"user_id": user_id, "currency": from_currency},
        {"$set": {"available_balance": new_btc, "total_balance": new_btc}}
    )
    await db.crypto_balances.update_one(
        {"user_id": user_id, "currency": from_currency},
        {"$set": {"available_balance": new_btc}}
    )
    await db.trader_balances.update_one(
        {"trader_id": user_id, "currency": from_currency},
        {"$set": {"available_balance": new_btc}}
    )
    await db.internal_balances.update_one(
        {"user_id": user_id, "currency": from_currency},
        {"$set": {"available_balance": new_btc}}
    )
    
    # STEP 7: CREDIT USER'S TO_CURRENCY (all 4 collections)
    # Credit 0.2955 ETH to user
    eth_wallet = await db.wallets.find_one({"user_id": user_id, "currency": to_currency})
    current_eth = eth_wallet["available_balance"] if eth_wallet else 0
    new_eth = current_eth + to_amount
    
    await db.wallets.update_one(
        {"user_id": user_id, "currency": to_currency},
        {"$set": {"available_balance": new_eth, "total_balance": new_eth}},
        upsert=True
    )
    await db.crypto_balances.update_one(
        {"user_id": user_id, "currency": to_currency},
        {"$set": {"available_balance": new_eth}},
        upsert=True
    )
    await db.trader_balances.update_one(
        {"trader_id": user_id, "currency": to_currency},
        {"$set": {"available_balance": new_eth}},
        upsert=True
    )
    await db.internal_balances.update_one(
        {"user_id": user_id, "currency": to_currency},
        {"$set": {"available_balance": new_eth}},
        upsert=True
    )
    
    # STEP 8: CREDIT SWAP FEE TO ADMIN WALLET (all 4 collections)
    # Credit 0.00015 BTC to admin_wallet
    admin_wallet = await db.wallets.find_one({"user_id": "admin_wallet", "currency": from_currency})
    current_admin = admin_wallet["available_balance"] if admin_wallet else 0
    new_admin = current_admin + swap_fee_crypto
    
    await db.wallets.update_one(
        {"user_id": "admin_wallet", "currency": from_currency},
        {"$set": {"available_balance": new_admin, "total_balance": new_admin}},
        upsert=True
    )
    await db.crypto_balances.update_one(
        {"user_id": "admin_wallet", "currency": from_currency},
        {"$set": {"available_balance": new_admin}},
        upsert=True
    )
    await db.trader_balances.update_one(
        {"trader_id": "admin_wallet", "currency": from_currency},
        {"$set": {"available_balance": new_admin}},
        upsert=True
    )
    await db.internal_balances.update_one(
        {"user_id": "admin_wallet", "currency": from_currency},
        {"$set": {"available_balance": new_admin}},
        upsert=True
    )
    
    # STEP 9: LOG TO ADMIN REVENUE (for business dashboard)
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "swap_fee",
        "amount": swap_fee_crypto,  # 0.00015 BTC
        "amount_gbp": swap_fee_gbp,  # £10.35
        "currency": from_currency,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc),  # MUST BE DATETIME
        "description": f"Swap fee (1.5%) from {from_currency} to {to_currency}"
    })
    
    # STEP 10: LOG SWAP TRANSACTION
    await db.swap_history.insert_one({
        "swap_id": str(uuid.uuid4()),
        "user_id": user_id,
        "from_currency": from_currency,
        "from_amount": from_amount,
        "to_currency": to_currency,
        "to_amount": to_amount,
        "fee_amount": swap_fee_crypto,
        "fee_currency": from_currency,
        "rate": to_price_gbp / from_price_gbp,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "from_amount": from_amount,
        "to_amount": to_amount,
        "fee_amount": swap_fee_crypto
    }
```

## Fee: 1.5% of from_amount
## Fee Goes To: `admin_wallet` (in from_currency, e.g., BTC)
## Business Dashboard: Shows as `swap_fee` with timestamp in revenue breakdown

---

# PAGE 7: P2P TRADING PAGE (`/p2p`)

## What Happens:
- Users trade crypto with each other
- Seller locks crypto in escrow
- Buyer pays seller off-platform (bank transfer)
- Seller releases crypto to buyer
- Platform takes fee from both parties

## Sub-Flow 7A: SELLER CREATES OFFER

### Step-by-Step:
1. Seller clicks "Create Offer"
2. Seller enters amount, price, payment methods
3. Frontend calls `POST /api/p2p/create-offer`
4. Backend locks seller's crypto in escrow

### Code Flow:
```python
@api_router.post("/p2p/create-offer")
async def create_p2p_offer(request):
    seller_id = request.user_id
    crypto_currency = request.crypto_currency  # "BTC"
    crypto_amount = request.crypto_amount  # 0.1 BTC
    fiat_currency = "GBP"
    price_per_coin = request.price  # £70,000
    
    fiat_amount = crypto_amount * price_per_coin  # 0.1 * £70,000 = £7,000
    
    # CHECK SELLER HAS BALANCE
    wallet = await db.wallets.find_one({"user_id": seller_id, "currency": crypto_currency})
    if wallet["available_balance"] < crypto_amount:
        raise HTTPException(400, "Insufficient balance")
    
    # LOCK SELLER'S CRYPTO IN ESCROW (move from available to locked)
    new_available = wallet["available_balance"] - crypto_amount
    new_locked = wallet.get("locked_balance", 0) + crypto_amount
    
    await db.wallets.update_one(
        {"user_id": seller_id, "currency": crypto_currency},
        {"$set": {"available_balance": new_available, "locked_balance": new_locked}}
    )
    # Same for other 3 collections...
    
    # CREATE OFFER
    offer = {
        "offer_id": str(uuid.uuid4()),
        "seller_id": seller_id,
        "crypto_currency": crypto_currency,
        "crypto_amount": crypto_amount,
        "fiat_currency": fiat_currency,
        "fiat_amount": fiat_amount,
        "price_per_coin": price_per_coin,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    await db.p2p_offers.insert_one(offer)
```

### Fee: NONE at this stage

---

## Sub-Flow 7B: BUYER INITIATES TRADE

### Step-by-Step:
1. Buyer clicks "Buy" on an offer
2. Frontend calls `POST /api/p2p/create-trade`
3. Backend creates trade record, starts timer

### Code Flow:
```python
@api_router.post("/p2p/create-trade")
async def create_p2p_trade(request):
    buyer_id = request.user_id
    offer_id = request.offer_id
    
    offer = await db.p2p_offers.find_one({"offer_id": offer_id})
    
    # Calculate platform fee (1% of fiat amount)
    platform_fee_percent = 0.01
    platform_fee = offer["fiat_amount"] * platform_fee_percent  # £7,000 * 1% = £70
    
    # CREATE TRADE
    trade = {
        "trade_id": str(uuid.uuid4()),
        "offer_id": offer_id,
        "seller_id": offer["seller_id"],
        "buyer_id": buyer_id,
        "crypto_currency": offer["crypto_currency"],
        "crypto_amount": offer["crypto_amount"],
        "fiat_currency": offer["fiat_currency"],
        "fiat_amount": offer["fiat_amount"],
        "platform_fee": platform_fee,
        "status": "pending_payment",
        "timer_expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
        "created_at": datetime.now(timezone.utc)
    }
    await db.p2p_trades.insert_one(trade)
    
    # UPDATE OFFER STATUS
    await db.p2p_offers.update_one(
        {"offer_id": offer_id},
        {"$set": {"status": "in_trade"}}
    )
```

### Fee: Calculated but NOT collected yet

---

## Sub-Flow 7C: BUYER CONFIRMS PAYMENT

### Step-by-Step:
1. Buyer sends bank transfer to seller (off-platform)
2. Buyer clicks "I've Paid"
3. Frontend calls `POST /api/p2p/confirm-payment`

### Code Flow:
```python
@api_router.post("/p2p/confirm-payment")
async def confirm_payment(request):
    trade_id = request.trade_id
    
    await db.p2p_trades.update_one(
        {"trade_id": trade_id},
        {"$set": {"status": "payment_confirmed", "payment_confirmed_at": datetime.now(timezone.utc)}}
    )
```

### Fee: Still not collected

---

## Sub-Flow 7D: SELLER RELEASES CRYPTO (FEE COLLECTED HERE)

### Step-by-Step:
1. Seller confirms they received bank payment
2. Seller clicks "Release Crypto"
3. Frontend calls `POST /api/p2p/release-escrow`
4. Backend releases crypto to buyer, collects fee

### Code Flow:
```python
@api_router.post("/p2p/release-escrow")
async def release_escrow(request):
    trade_id = request.trade_id
    
    trade = await db.p2p_trades.find_one({"trade_id": trade_id})
    
    seller_id = trade["seller_id"]
    buyer_id = trade["buyer_id"]
    crypto_currency = trade["crypto_currency"]
    crypto_amount = trade["crypto_amount"]
    platform_fee = trade["platform_fee"]  # £70
    
    # STEP 1: UNLOCK SELLER'S CRYPTO (remove from locked)
    seller_wallet = await db.wallets.find_one({"user_id": seller_id, "currency": crypto_currency})
    new_locked = seller_wallet["locked_balance"] - crypto_amount
    
    await db.wallets.update_one(
        {"user_id": seller_id, "currency": crypto_currency},
        {"$set": {"locked_balance": new_locked}}
    )
    # Same for other 3 collections...
    
    # STEP 2: CREDIT BUYER WITH CRYPTO (all 4 collections)
    buyer_wallet = await db.wallets.find_one({"user_id": buyer_id, "currency": crypto_currency})
    buyer_balance = buyer_wallet["available_balance"] if buyer_wallet else 0
    new_buyer_balance = buyer_balance + crypto_amount
    
    await db.wallets.update_one(
        {"user_id": buyer_id, "currency": crypto_currency},
        {"$set": {"available_balance": new_buyer_balance, "total_balance": new_buyer_balance}},
        upsert=True
    )
    # Same for other 3 collections...
    
    # STEP 3: CREDIT PLATFORM FEE TO ADMIN WALLET
    admin_wallet = await db.wallets.find_one({"user_id": "admin_wallet", "currency": "GBP"})
    admin_balance = admin_wallet["available_balance"] if admin_wallet else 0
    new_admin_balance = admin_balance + platform_fee
    
    await db.wallets.update_one(
        {"user_id": "admin_wallet", "currency": "GBP"},
        {"$set": {"available_balance": new_admin_balance, "total_balance": new_admin_balance}},
        upsert=True
    )
    # Same for other 3 collections...
    
    # STEP 4: LOG TO ADMIN REVENUE (for business dashboard)
    await db.admin_revenue.insert_one({
        "revenue_id": str(uuid.uuid4()),
        "source": "p2p_trade_fee",
        "amount": platform_fee,  # £70
        "currency": "GBP",
        "trade_id": trade_id,
        "seller_id": seller_id,
        "buyer_id": buyer_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # STEP 5: UPDATE TRADE STATUS
    await db.p2p_trades.update_one(
        {"trade_id": trade_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
    )
    
    # STEP 6: CHECK FOR REFERRAL COMMISSION
    # If buyer was referred, pay commission to referrer
    buyer = await db.users.find_one({"user_id": buyer_id})
    if buyer.get("referred_by"):
        referrer_id = buyer["referred_by"]
        referral_commission = platform_fee * 0.10  # 10% of fee = £7
        
        # Credit referrer
        await sync_credit_balance(referrer_id, "GBP", referral_commission, "referral_commission")
        
        # Log referral payout
        await db.admin_revenue.insert_one({
            "source": "referral_commission",
            "amount": referral_commission,
            "currency": "GBP",
            "referrer_id": referrer_id,
            "timestamp": datetime.now(timezone.utc)
        })
```

### Fee: 1% of fiat amount (e.g., £70 on £7,000 trade)
### Fee Goes To: `admin_wallet` (GBP)
### Business Dashboard: Shows as `p2p_trade_fee` with timestamp

---

# PAGE 8: P2P EXPRESS BUY (`/p2p-express`)

## What Happens:
- User buys crypto instantly from exchange liquidity
- No waiting for a seller
- Higher fee (2%)

## Step-by-Step:
1. User enters amount to spend (e.g., £500)
2. User selects crypto (BTC)
3. Frontend calls `POST /api/p2p-express/buy`
4. Backend debits from liquidity, credits user, takes fee

## Code Flow:
```python
@api_router.post("/p2p-express/buy")
async def p2p_express_buy(request):
    user_id = request.user_id
    fiat_amount = request.fiat_amount  # £500
    crypto_currency = request.crypto_currency  # "BTC"
    
    # STEP 1: Calculate express fee (2%)
    express_fee_percent = 0.02
    express_fee = fiat_amount * express_fee_percent  # £500 * 2% = £10
    
    # STEP 2: Calculate crypto amount
    net_fiat = fiat_amount - express_fee  # £490
    crypto_price = await get_crypto_price(crypto_currency, "GBP")  # £69,000
    crypto_amount = net_fiat / crypto_price  # £490 / £69,000 = 0.0071 BTC
    
    # STEP 3: CHECK LIQUIDITY
    liquidity = await db.admin_liquidity_wallets.find_one({"currency": crypto_currency})
    if liquidity["available"] < crypto_amount:
        raise HTTPException(400, "Insufficient liquidity")
    
    # STEP 4: DEBIT LIQUIDITY POOL
    await db.admin_liquidity_wallets.update_one(
        {"currency": crypto_currency},
        {"$inc": {"available": -crypto_amount}}
    )
    
    # STEP 5: DEBIT USER'S GBP (they're paying fiat)
    await sync_debit_balance(user_id, "GBP", fiat_amount, "p2p_express_buy")
    
    # STEP 6: CREDIT USER WITH CRYPTO (all 4 collections)
    await sync_credit_balance(user_id, crypto_currency, crypto_amount, "p2p_express_buy")
    
    # STEP 7: CREDIT FEE TO PLATFORM
    await sync_credit_balance("PLATFORM_FEES", "GBP", express_fee, "p2p_express_fee")
    
    # STEP 8: LOG TO ADMIN REVENUE
    await db.admin_revenue.insert_one({
        "source": "p2p_express_fee",
        "amount": express_fee,  # £10
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

### Fee: 2% of fiat amount
### Fee Goes To: `PLATFORM_FEES` (GBP)
### Business Dashboard: Shows as `p2p_express_fee`

---

# PAGE 9: INSTANT BUY PAGE (`/instant-buy`)

## What Happens:
- User buys crypto with card/bank transfer
- Platform adds spread to price

## Code Flow:
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
    
    # STEP 3: CREDIT USER WITH CRYPTO
    await sync_credit_balance(user_id, crypto_currency, crypto_amount, "instant_buy")
    
    # STEP 4: CREDIT SPREAD TO ADMIN
    await sync_credit_balance("admin_wallet", "GBP", spread_fee, "instant_buy_spread")
    
    # STEP 5: LOG TO ADMIN REVENUE
    await db.admin_revenue.insert_one({
        "source": "instant_buy_spread",
        "amount": spread_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

### Fee: 2.5% spread
### Fee Goes To: `admin_wallet` (GBP)
### Business Dashboard: Shows as `instant_buy_spread`

---

# PAGE 10: TRADING PAGE (`/trading`)

## What Happens:
- User places buy/sell orders
- Order book matching
- Trading fees on execution

## Code Flow:
```python
@api_router.post("/trading/order")
async def place_order(request):
    user_id = request.user_id
    pair = request.pair  # "BTC-GBP"
    side = request.side  # "buy"
    order_type = request.type  # "market" or "limit"
    amount = request.amount  # 0.01 BTC
    price = request.price  # £69,000 (for limit orders)
    
    total_value = amount * price  # 0.01 * £69,000 = £690
    
    # Calculate trading fee (0.1%)
    trading_fee_percent = 0.001
    trading_fee = total_value * trading_fee_percent  # £690 * 0.1% = £0.69
    
    # ... execute order matching ...
    
    # On fill:
    # CREDIT FEE TO ADMIN
    await sync_credit_balance("admin_wallet", "GBP", trading_fee, "spot_trading_fee")
    
    # LOG TO ADMIN REVENUE
    await db.admin_revenue.insert_one({
        "source": "spot_trading_fee",
        "amount": trading_fee,
        "currency": "GBP",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
```

### Fee: 0.1% of trade value
### Fee Goes To: `admin_wallet` (GBP)
### Business Dashboard: Shows as `spot_trading_fee`

---

# PAGE 11: SAVINGS PAGE (`/savings`)

## What Happens:
- User deposits crypto into notice savings account
- Must give 30/60/90 day notice before withdrawal
- Early withdrawal incurs penalty

## Sub-Flow 11A: DEPOSIT INTO SAVINGS

```python
@api_router.post("/savings/deposit")
async def deposit_savings(request):
    user_id = request.user_id
    currency = request.currency  # "BTC"
    amount = request.amount  # 0.1 BTC
    notice_period = request.notice_period  # 30 days
    
    # DEBIT FROM USER'S AVAILABLE BALANCE
    await sync_debit_balance(user_id, currency, amount, "savings_deposit")
    
    # CREATE SAVINGS POSITION
    await db.savings_positions.insert_one({
        "position_id": str(uuid.uuid4()),
        "user_id": user_id,
        "currency": currency,
        "amount": amount,
        "notice_period": notice_period,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    })
```

### Fee: NONE for deposit

## Sub-Flow 11B: GIVE NOTICE

```python
@api_router.post("/savings/give-notice")
async def give_notice(request):
    position_id = request.position_id
    
    position = await db.savings_positions.find_one({"position_id": position_id})
    
    available_date = datetime.now(timezone.utc) + timedelta(days=position["notice_period"])
    
    await db.savings_positions.update_one(
        {"position_id": position_id},
        {"$set": {
            "notice_given_at": datetime.now(timezone.utc),
            "available_date": available_date,
            "status": "notice_given"
        }}
    )
```

### Fee: NONE

## Sub-Flow 11C: EARLY WITHDRAWAL (FEE HERE)

```python
@api_router.post("/savings/withdraw-early")
async def withdraw_early(request):
    position_id = request.position_id
    
    position = await db.savings_positions.find_one({"position_id": position_id})
    
    amount = position["amount"]  # 0.1 BTC
    currency = position["currency"]
    user_id = position["user_id"]
    
    # CALCULATE PENALTY (5%)
    penalty_percent = 0.05
    penalty = amount * penalty_percent  # 0.1 * 5% = 0.005 BTC
    net_withdrawal = amount - penalty  # 0.095 BTC
    
    # CREDIT USER (minus penalty)
    await sync_credit_balance(user_id, currency, net_withdrawal, "savings_withdrawal")
    
    # CREDIT PENALTY TO ADMIN
    await sync_credit_balance("admin_wallet", currency, penalty, "savings_penalty")
    
    # LOG TO ADMIN REVENUE
    await db.admin_revenue.insert_one({
        "source": "savings_penalty",
        "amount": penalty,
        "currency": currency,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # CLOSE POSITION
    await db.savings_positions.update_one(
        {"position_id": position_id},
        {"$set": {"status": "withdrawn_early"}}
    )
```

### Fee: 5% early withdrawal penalty
### Fee Goes To: `admin_wallet` (in crypto)
### Business Dashboard: Shows as `savings_penalty`

---

# PAGE 12: ADMIN DASHBOARD (`/admin/dashboard`)

## What Happens:
- Shows total users, transactions, revenue
- Data comes from `admin_revenue` collection

## API:
```python
@api_router.get("/admin/dashboard-stats")
async def get_dashboard_stats():
    # Count users
    total_users = await db.users.count_documents({})
    
    # Count transactions
    total_transactions = await db.transactions.count_documents({})
    
    # Sum revenue from admin_revenue
    pipeline = [
        {"$match": {"amount": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue = await db.admin_revenue.aggregate(pipeline).to_list(1)
    total_revenue = revenue[0]["total"] if revenue else 0
    
    return {
        "users": total_users,
        "transactions": total_transactions,
        "revenue": total_revenue
    }
```

---

# PAGE 13: ADMIN REVENUE (`/admin/revenue`)

## What Happens:
- Shows breakdown of all fees by type
- Shows recent transactions with timestamps

## API:
```python
@api_router.get("/admin/revenue/dashboard")
async def get_revenue_dashboard():
    # Get all revenue records, sorted newest first
    records = await db.admin_revenue.find({}).sort("timestamp", -1).to_list(10000)
    
    # Group by fee type
    by_type = {}
    for r in records:
        fee_type = r.get("source", "unknown")
        amount = r.get("amount", 0)
        
        if fee_type not in by_type:
            by_type[fee_type] = {"total": 0, "count": 0}
        by_type[fee_type]["total"] += amount
        by_type[fee_type]["count"] += 1
    
    # Recent transactions (for display)
    recent = []
    for r in records[:20]:
        recent.append({
            "timestamp": r["timestamp"].isoformat(),
            "fee_type": r.get("source"),
            "amount": r.get("amount"),
            "currency": r.get("currency")
        })
    
    return {
        "by_fee_type": by_type,
        "recent_transactions": recent,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
```

---

# PAGE 14: ADMIN FEES (`/admin/fees`)

## What Happens:
- Shows admin wallet balances
- Allows withdrawal to external wallet

## API - Get Balances:
```python
@api_router.get("/admin/fees/balances")
async def get_admin_balances():
    wallets = await db.wallets.find({"user_id": "admin_wallet"}).to_list(100)
    
    return {
        "balances": [
            {"currency": w["currency"], "available": w["available_balance"]}
            for w in wallets
        ]
    }
```

## API - Withdraw:
```python
@api_router.post("/admin/withdraw")
async def admin_withdraw(request):
    currency = request.currency
    amount = request.amount
    address = request.wallet_address
    
    # Debit from admin_wallet
    await db.wallets.update_one(
        {"user_id": "admin_wallet", "currency": currency},
        {"$inc": {"available_balance": -amount}}
    )
    
    # Create payout (NOWPayments for crypto, manual for fiat)
    if currency in ["BTC", "ETH", "USDT"]:
        await nowpayments.create_payout(address, currency, amount)
    else:
        await db.admin_withdrawals.insert_one({
            "currency": currency,
            "amount": amount,
            "destination": address,
            "status": "pending"
        })
```

---

# LIQUIDITY SYSTEM

## Collection: `admin_liquidity_wallets`

```javascript
{
  "currency": "BTC",
  "available": 10.005,  // Available for P2P Express
  "reserved": 0,
  "deposit_address": "bc1q..."
}
```

## How Admin Tops Up Liquidity:

1. Admin goes to `/admin/liquidity`
2. Clicks "Top Up BTC"
3. Gets NOWPayments deposit address
4. Sends BTC from external wallet
5. Webhook credits `admin_liquidity_wallets`

```python
# NOWPayments webhook for liquidity
@api_router.post("/webhooks/nowpayments-liquidity")
async def liquidity_webhook(request):
    if request.payment_status == "finished":
        currency = request.pay_currency.upper()
        amount = float(request.actually_paid)
        
        await db.admin_liquidity_wallets.update_one(
            {"currency": currency},
            {"$inc": {"available": amount}}
        )
```

## When Liquidity is Used:

- P2P Express Buy: Debits liquidity, credits user
- Instant Buy: Debits liquidity, credits user
- Instant Sell: Credits liquidity (user sells back)

---

# FEE SUMMARY TABLE

| Page | Action | Fee | Fee Type | Goes To |
|------|--------|-----|----------|--------|
| Wallet | Deposit Fiat | 0.5% | `deposit_fee` | `admin_wallet` |
| Wallet | Deposit Crypto | 0% | - | - |
| Wallet | Withdraw Fiat | £1.50 | `withdrawal_fee` | `admin_wallet` |
| Wallet | Withdraw Crypto | 0.1% | `withdrawal_fee` | `admin_wallet` |
| Swap | Swap | 1.5% | `swap_fee` | `admin_wallet` |
| P2P | Trade Complete | 1% | `p2p_trade_fee` | `admin_wallet` |
| P2P Express | Buy | 2% | `p2p_express_fee` | `PLATFORM_FEES` |
| Instant Buy | Buy | 2.5% | `instant_buy_spread` | `admin_wallet` |
| Instant Sell | Sell | 2.5% | `instant_sell_spread` | `admin_wallet` |
| Trading | Order Fill | 0.1% | `spot_trading_fee` | `admin_wallet` |
| Savings | Early Withdraw | 5% | `savings_penalty` | `admin_wallet` |
| Disputes | Lose Dispute | £25+ | `dispute_fee` | `admin_wallet` |

---

# HOW FEES APPEAR IN BUSINESS DASHBOARD

1. Every fee is logged to `admin_revenue` collection with:
   - `source`: Fee type (e.g., "swap_fee")
   - `amount`: Fee amount
   - `currency`: GBP/BTC/ETH
   - `timestamp`: DATETIME (not string)
   - `user_id`: Who paid the fee

2. Admin dashboard queries `admin_revenue`:
   - Groups by `source` for pie chart
   - Sorts by `timestamp` descending for recent list
   - Sums `amount` for totals

3. Actual money is in `admin_wallet`:
   - Collection: `wallets` with `user_id: "admin_wallet"`
   - Can be withdrawn via `/admin/fees` page

---

**END OF REPORT**
