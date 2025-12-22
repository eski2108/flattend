# P2P COMPLETE FLOW - DETAILED CODE WALKTHROUGH
**Generated:** 2025-08-26
**Status:** VERIFIED & DOCUMENTED

---

## PHASE 1: BUYER INITIATES TRADE

### Step 1.1: API Endpoint Hit
**File:** `server.py` line 3914
**Endpoint:** `POST /api/p2p/trades/create`

```python
@api_router.post("/p2p/trades/create")
async def create_trade(request: CreateTradeRequest):
    """
    Create P2P trade and lock crypto in escrow via wallet service
    """
    # 🚦 FEATURE FLAG CHECK - Can be disabled instantly via admin
    flags = get_feature_flags_service(db)
    await flags.enforce("p2p_enabled", "P2P Trading")
    
    # 🔒 FREEZE CHECK - Block P2P trades for frozen users
    await enforce_not_frozen(request.buyer_id, "P2P trade")
    
    # Delegate to wallet service
    from p2p_wallet_service import p2p_create_trade_with_wallet
    wallet_service = get_wallet_service()
    result = await p2p_create_trade_with_wallet(...)
```

### Step 1.2: Validations (p2p_wallet_service.py lines 36-100)

```python
# 1. IDEMPOTENCY CHECK - Prevent duplicate trades
if idempotency_key:
    existing_trade = await db.trades.find_one({"idempotency_key": idempotency_key})
    if existing_trade:
        return {"success": True, "trade_id": existing_trade["trade_id"], "is_duplicate": True}

# 2. Get sell order
sell_order = await db.enhanced_sell_orders.find_one({"order_id": sell_order_id})
if not sell_order or sell_order["status"] != "active":
    raise HTTPException(status_code=400, detail="Offer not available")

# 3. BLOCKING VALIDATION - Check if users blocked each other
if seller_id in buyer_blocked_users:
    raise HTTPException(status_code=403, detail="You have blocked this seller")
if buyer_id in seller_blocked_users:
    raise HTTPException(status_code=403, detail="This seller has blocked you")

# 4. Validate amount limits
if crypto_amount < sell_order["min_purchase"] or crypto_amount > sell_order["max_purchase"]:
    raise HTTPException(status_code=400, detail="Amount outside allowed limits")

# 5. Check seller has sufficient balance
seller_balance = await wallet_service.get_balance(seller_id, crypto_currency)
if seller_balance['available_balance'] < crypto_amount:
    raise HTTPException(status_code=400, detail="Seller has insufficient balance")
```

### Step 1.3: Fee Calculation (p2p_wallet_service.py lines 105-130)

```python
# Calculate fiat amount
fiat_amount = crypto_amount * sell_order["price_per_unit"]

# Calculate P2P Taker Fee (buyer pays)
fee_manager = get_fee_manager(db)
taker_fee_percent = await fee_manager.get_fee("p2p_taker_fee_percent")  # Default: 1%
taker_fee = fiat_amount * (taker_fee_percent / 100.0)

# Express fee if applicable
if is_express:
    express_fee_percent = await fee_manager.get_fee("p2p_express_fee_percent")  # Default: 2%
    express_fee = fiat_amount * (express_fee_percent / 100.0)
    total_fee = taker_fee + express_fee
```

### Step 1.4: ESCROW LOCK (p2p_wallet_service.py lines 191-199)

```python
# LOCK seller funds via wallet service (ATOMIC)
try:
    await wallet_service.lock_balance(
        user_id=sell_order["seller_id"],
        currency=sell_order["crypto_currency"],
        amount=crypto_amount,
        lock_type="p2p_escrow",
        reference_id=trade_id
    )
    logger.info(f"✅ P2P: ATOMIC LOCK {crypto_amount} {crypto_currency} for trade {trade_id}")
except Exception as lock_error:
    raise HTTPException(status_code=500, detail=f"Failed to lock funds: {str(lock_error)}")
```

**Database Change:**
```
seller.available_balance: 1.0 BTC → 0.5 BTC
seller.locked_balance: 0.0 BTC → 0.5 BTC
```

### Step 1.5: Trade Record Created (p2p_wallet_service.py lines 150-190)

```python
trade = Trade(
    sell_order_id=sell_order_id,
    buyer_id=buyer_id,
    seller_id=sell_order["seller_id"],
    crypto_currency=sell_order["crypto_currency"],
    crypto_amount=crypto_amount,
    fiat_currency=sell_order["fiat_currency"],
    fiat_amount=round(fiat_amount, 2),
    payment_method=payment_method,
    escrow_locked=True,
    timer_minutes=120,  # 2 hour payment window
    payment_deadline=datetime.now(timezone.utc) + timedelta(minutes=120)
)

# Save to database
await db.trades.insert_one(trade_dict)
```

### Step 1.6: Cryptographic Proof Created (p2p_wallet_service.py lines 205-220)

```python
from services.p2p_proof_protocol import get_p2p_proof_protocol
proof_protocol = get_p2p_proof_protocol(db)

initiation_proof = await proof_protocol.initiate_trade_proof(
    trade_id=trade_id,
    buyer_id=buyer_id,
    seller_id=seller_id,
    trade_data={
        "crypto_amount": crypto_amount,
        "crypto_currency": crypto_currency,
        "fiat_amount": fiat_amount,
        "escrow_locked": True
    }
)
```

### Step 1.7: Audit Trail Entry (p2p_wallet_service.py lines 224-235)

```python
await db.audit_trail.insert_one({
    "action": "TRADE_INITIATED",
    "trade_id": trade_id,
    "buyer_id": buyer_id,
    "seller_id": seller_id,
    "crypto_amount": crypto_amount,
    "crypto_currency": crypto_currency,
    "fiat_amount": fiat_amount,
    "escrow_locked": True,
    "timestamp": datetime.now(timezone.utc)
})
```

### Step 1.8: Notifications Sent (p2p_wallet_service.py lines 250-350)

#### In-App Notifications:
```python
notification_service = get_notification_service()
await notification_service.notify_trade_opened(...)
await notification_service.notify_escrow_locked(...)
```

#### Telegram Notifications:
```python
tg_bot = get_user_telegram_bot(db)
await tg_bot.notify_trade_created(trade_data, "buyer", buyer_id)
await tg_bot.notify_trade_created(trade_data, "seller", seller_id)
await tg_bot.notify_escrow_locked(trade_data, seller_id)
```

#### Email Notifications:
```python
from email_service import email_service

# Email to BUYER - trade created
await email_service.send_p2p_order_created(
    user_email=buyer.get("email"),
    user_name=buyer.get("full_name", "Buyer"),
    order_id=trade_id,
    role="buyer",
    amount=crypto_amount,
    coin=crypto_currency,
    fiat_amount=fiat_amount,
    fiat_currency=fiat_currency
)

# Email to SELLER - trade created, crypto locked
await email_service.send_p2p_order_created(
    user_email=seller.get("email"),
    user_name=seller.get("full_name", "Seller"),
    order_id=trade_id,
    role="seller",
    ...
)
```

---

## PHASE 2: BUYER MARKS PAYMENT COMPLETE

### Step 2.1: API Endpoint
**File:** `server.py` line 4195
**Endpoint:** `POST /api/p2p/mark-payment`

### Step 2.2: Fee Collection (server.py lines 4037-4090)

```python
# Collect P2P Taker Fee from buyer
taker_fee_percent = await fee_manager.get_fee("p2p_taker_fee_percent")
taker_fee = fiat_amount * (taker_fee_percent / 100.0)

# Deduct from buyer
await wallet_service.debit(
    user_id=request.buyer_id,
    currency=fiat_currency,
    amount=total_fee,
    transaction_type="p2p_fees",
    reference_id=request.trade_id
)

# Credit admin wallet
await wallet_service.credit(
    user_id="admin_wallet",
    currency=fiat_currency,
    amount=admin_fee,
    transaction_type="p2p_fees",
    reference_id=request.trade_id
)
```

### Step 2.3: Log to Admin Revenue (server.py lines 4139-4151)

```python
await db.admin_revenue.insert_one({
    "revenue_id": str(uuid.uuid4()),
    "source": "p2p_taker_fee",
    "revenue_type": "P2P_TRADING",
    "currency": fiat_currency,
    "amount": taker_fee,
    "user_id": request.buyer_id,
    "related_transaction_id": request.trade_id,
    "fee_percentage": taker_fee_percent,
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "description": f"P2P Taker fee ({taker_fee_percent}%) from trade {request.trade_id}"
})
```

### Step 2.4: Update Trade Status (server.py lines 4203-4215)

```python
await db.trades.update_one(
    {"trade_id": request.trade_id},
    {
        "$set": {
            "status": "buyer_marked_paid",
            "buyer_marked_paid_at": datetime.now(timezone.utc).isoformat(),
            "payment_reference": request.payment_reference,
            "taker_fee": taker_fee,
            "taker_fee_percent": taker_fee_percent
        }
    }
)
```

### Step 2.5: Notify Seller (server.py lines 4217-4230)

```python
notification_service = get_notification_service()
await notification_service.notify_payment_marked(
    trade_id=request.trade_id,
    buyer_id=request.buyer_id,
    seller_id=trade.get("seller_id"),
    fiat_amount=trade.get("fiat_amount", 0),
    payment_reference=request.payment_reference
)
```

#### Email to Seller:
```python
await email_service.send_p2p_payment_marked(
    user_email=seller.get("email"),
    user_name=seller.get("full_name"),
    order_id=trade_id,
    amount=crypto_amount,
    coin=crypto_currency
)
```

**Email Content:**
```
Subject: ✓ Payment Marked Complete - Order {order_id}

Hi {seller_name},

The buyer has marked the payment as complete for order {order_id}.

⏳ Action Required:
Please verify the payment in your account and release the crypto.

Amount: {crypto_amount} {coin}

[Release Crypto →] button
```

---

## PHASE 3: SELLER RELEASES CRYPTO

### Step 3.1: API Endpoint
**File:** `server.py` line 4245
**Endpoint:** `POST /api/p2p/release-crypto`

```python
@api_router.post("/p2p/release-crypto")
async def release_crypto_from_escrow(request: ReleaseCryptoRequest):
    from p2p_wallet_service import p2p_release_crypto_with_wallet
    
    wallet_service = get_wallet_service()
    result = await p2p_release_crypto_with_wallet(
        db=db,
        wallet_service=wallet_service,
        trade_id=request.trade_id,
        seller_id=request.seller_id
    )
    return result
```

### Step 3.2: Payment Verification Check (p2p_wallet_service.py lines 385-410)

```python
# 🔒 CRITICAL SECURITY CHECK: VERIFY PAYMENT BEFORE RELEASE
if not force_release:
    payment_service = get_payment_verification_service(db)
    verification = await payment_service.verify_payment(trade_id)
    
    if not verification.get("verified"):
        logger.warning(f"⚠️ P2P RELEASE BLOCKED: Payment not verified for trade {trade_id}")
        return {
            "success": False,
            "message": "Cannot release crypto: Payment not verified",
            "verification_status": verification.get("status"),
            "requires_verification": True,
            "suggestion": "Please upload payment proof or wait for bank transfer to clear."
        }
```

### Step 3.3: Calculate Maker Fee (p2p_wallet_service.py lines 420-440)

```python
crypto_amount = trade["crypto_amount"]
currency = trade["crypto_currency"]

# Get fee from centralized system
fee_manager = get_fee_manager(db)
fee_percent = await fee_manager.get_fee("p2p_maker_fee_percent")  # Default: 1%

# Calculate platform fee
platform_fee = crypto_amount * (fee_percent / 100.0)  # e.g., 0.5 BTC * 1% = 0.005 BTC
amount_to_buyer = crypto_amount - platform_fee  # e.g., 0.5 - 0.005 = 0.495 BTC
```

### Step 3.4: Release Escrow (p2p_wallet_service.py lines 452-467)

```python
# Step 1: Release locked funds from seller
await wallet_service.release_locked_balance(
    user_id=seller_id,
    currency=currency,
    amount=crypto_amount,
    release_type="p2p_escrow_release",
    reference_id=trade_id
)
logger.info(f"✅ P2P: Released {crypto_amount} {currency} from seller's escrow")
```

**Database Change:**
```
seller.locked_balance: 0.5 BTC → 0.0 BTC
seller.total_balance: 0.5 BTC → 0.0 BTC
```

### Step 3.5: Credit Buyer (p2p_wallet_service.py lines 469-485)

```python
# Step 2: Credit buyer (minus fee)
await wallet_service.credit(
    user_id=buyer_id,
    currency=currency,
    amount=amount_to_buyer,  # 0.495 BTC
    transaction_type="p2p_buy",
    reference_id=trade_id,
    metadata={"trade_id": trade_id, "seller_id": seller_id}
)
logger.info(f"✅ P2P: Credited {amount_to_buyer} {currency} to buyer {buyer_id}")
```

**Database Change:**
```
buyer.available_balance: 0.0 BTC → 0.495 BTC
```

### Step 3.6: Collect Platform Fee (p2p_wallet_service.py lines 500-515)

```python
# Step 3: Collect admin portion of platform fee
admin_wallet_id = "admin_wallet"
await wallet_service.credit(
    user_id=admin_wallet_id,
    currency=currency,
    amount=admin_fee,  # 0.005 BTC (or less if referral commission)
    transaction_type="p2p_platform_fee",
    reference_id=trade_id,
    metadata={"trade_id": trade_id, "seller_id": seller_id, "buyer_id": buyer_id}
)
logger.info(f"✅ P2P: Collected {admin_fee} {currency} admin fee")
```

**Database Change:**
```
admin_wallet.available_balance: 0.1 BTC → 0.105 BTC
```

### Step 3.7: Pay Referrer Commission (if applicable) (p2p_wallet_service.py lines 520-540)

```python
if referrer_id and referrer_commission > 0:
    await wallet_service.credit(
        user_id=referrer_id,
        currency=currency,
        amount=referrer_commission,
        transaction_type="referral_commission",
        reference_id=trade_id,
        metadata={"referred_user_id": seller_id, "tier_used": tier_used}
    )
    logger.info(f"✅ P2P: Paid {referrer_commission} {currency} commission to referrer")
```

### Step 3.8: Update Trade Status (p2p_wallet_service.py lines 560-580)

```python
await db.trades.update_one(
    {"trade_id": trade_id},
    {"$set": {
        "status": "completed",
        "escrow_locked": False,
        "platform_fee_amount": platform_fee,
        "platform_fee_percent": fee_percent,
        "admin_fee": admin_fee,
        "referrer_commission": referrer_commission,
        "amount_to_buyer": amount_to_buyer,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }}
)
```

### Step 3.9: Log to Admin Revenue (server.py lines 4339-4358)

```python
await db.admin_revenue.insert_one({
    "revenue_id": str(uuid.uuid4()),
    "source": "p2p_maker_fee",
    "revenue_type": "P2P_TRADING",
    "currency": trade["crypto_currency"],
    "amount": platform_fee,
    "user_id": trade["seller_id"],
    "related_transaction_id": request.trade_id,
    "fee_percentage": trade_fee_percent,
    "net_profit": platform_fee,
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "description": f"P2P Maker fee ({trade_fee_percent}%) from trade {request.trade_id}"
})
```

### Step 3.10: Notifications

#### Email to Buyer:
```python
await email_service.send_p2p_crypto_released(
    user_email=buyer.get("email"),
    user_name=buyer.get("full_name"),
    order_id=trade_id,
    amount=amount_to_buyer,
    coin=currency
)
```

**Email Content:**
```
Subject: ✅ Crypto Released - Order {order_id} Complete!

Hi {buyer_name},

Great news! The seller has released {amount} {coin} to your wallet.

✓ Trade Complete!
Order ID: {order_id}
Amount: {amount} {coin} added to your wallet

[View Wallet →] button
```

---

## PHASE 4: DISPUTE FLOW

### Step 4.1: Initiate Dispute
**File:** `server.py` line 9768
**Endpoint:** `POST /api/disputes/initiate`

```python
@api_router.post("/disputes/initiate")
async def initiate_dispute(request: InitiateDisputeRequest):
    # Verify user is part of the order
    if request.user_address not in [buy_order["buyer_address"], buy_order["seller_address"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check order status
    if buy_order["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot dispute completed/cancelled orders")
    
    # Check no existing dispute
    existing_dispute = await db.disputes.find_one({
        "order_id": request.order_id, 
        "status": {"$in": ["open", "under_review"]}
    })
    if existing_dispute:
        raise HTTPException(status_code=400, detail="Dispute already exists")
```

### Step 4.2: Create Dispute Record (server.py lines 9786-9800)

```python
dispute = Dispute(
    order_id=request.order_id,
    initiated_by=request.user_address,
    reason=request.reason
)
dispute_dict = dispute.model_dump()
dispute_dict['created_at'] = dispute_dict['created_at'].isoformat()
await db.disputes.insert_one(dispute_dict)

# Update order status
await db.crypto_buy_orders.update_one(
    {"order_id": request.order_id},
    {"$set": {
        "status": "disputed",
        "disputed_at": datetime.now(timezone.utc).isoformat()
    }}
)
```

### Step 4.3: Notify Other Party (server.py lines 9810-9825)

```python
other_party = buy_order["seller_address"] if request.user_address == buy_order["buyer_address"] else buy_order["buyer_address"]

notification = Notification(
    user_address=other_party,
    order_id=request.order_id,
    notification_type="dispute_started",
    message=f"A dispute has been opened for order {request.order_id[:8]}. Please provide evidence."
)
await db.notifications.insert_one(notif_dict)
```

### Step 4.4: Admin Alert Email (email_service.py lines 98-250)

```python
await email_service.send_dispute_alert_to_admin(
    trade_id=trade_id,
    dispute_id=dispute_id,
    buyer_id=buyer_id,
    seller_id=seller_id,
    amount=crypto_amount,
    currency=crypto_currency,
    reason=reason,
    description=description,
    initiated_by=initiated_by
)
```

**Admin Email Content:**
```
Subject: 🚨 URGENT: P2P Trade Dispute - {trade_id}

🚨 P2P TRADE DISPUTE ALERT
⚠️ IMMEDIATE ACTION REQUIRED

Dispute Details:
| Dispute ID | {dispute_id} |
| Trade ID | {trade_id} |
| Time | {timestamp} |
| Trade Amount | {amount} {currency} |

Parties Involved:
| Buyer ID | {buyer_id} |
| Seller ID | {seller_id} |
| Initiated By | {initiated_by} |

Dispute Reason:
{reason}
{description}

🎯 Action Required:
1. Review trade chat history and evidence
2. Contact both parties if needed
3. Determine resolution (release crypto or refund)
4. Execute decision in admin panel

[🚨 RESOLVE DISPUTE NOW] button

Note: Funds are currently held in escrow and will remain frozen until resolved.
```

### Step 4.5: Evidence Upload
**Endpoint:** `POST /api/disputes/evidence`

```python
evidence = DisputeEvidence(
    dispute_id=request.dispute_id,
    uploaded_by=request.uploaded_by,
    evidence_type=request.evidence_type,  # 'screenshot', 'bank_statement', 'chat_log'
    file_url=request.file_url,
    description=request.description
)
await db.dispute_evidence.insert_one(evidence_dict)
```

### Step 4.6: Admin Resolution (server.py lines 9901-10000)
**Endpoint:** `POST /api/admin/disputes/resolve`

```python
@api_router.post("/admin/disputes/resolve")
async def admin_resolve_dispute(request: AdminResolveDisputeRequest):
    
    if request.resolution == "release_to_buyer":
        # Transfer crypto to buyer
        await db.users.update_one(
            {"wallet_address": buy_order["buyer_address"]},
            {"$inc": {"available_balance": buy_order["crypto_amount"]}}
        )
        
        # Update order status
        await db.crypto_buy_orders.update_one(
            {"order_id": request.order_id},
            {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Notify buyer
        notification = Notification(
            user_address=buy_order["buyer_address"],
            notification_type="crypto_released",
            message=f"Dispute resolved in your favor. {crypto_amount} ETH released to your account."
        )
        
    elif request.resolution == "release_to_seller":
        # Return crypto to seller
        await db.users.update_one(
            {"wallet_address": buy_order["seller_address"]},
            {"$inc": {"available_balance": buy_order["crypto_amount"]}}
        )
        
        # Notify seller
        notification = Notification(
            user_address=buy_order["seller_address"],
            notification_type="crypto_released",
            message=f"Dispute resolved in your favor. {crypto_amount} ETH returned to your account."
        )
    
    # Update dispute status
    await db.disputes.update_one(
        {"dispute_id": request.dispute_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": request.admin_address,
            "resolution": request.admin_notes
        }}
    )
    
    # AUDIT LOG
    await log_admin_action(
        action="DISPUTE_RESOLVE",
        admin_id=request.admin_address,
        target_type="dispute",
        target_id=request.dispute_id,
        reason=request.admin_notes,
        before_state=before_state,
        after_state={"resolution": request.resolution}
    )
```

---

## COMPLETE EMAIL LIST

| Event | Recipients | Email Subject |
|-------|------------|---------------|
| Trade Created | Buyer | 🤝 New P2P Order Created - {amount} {coin} |
| Trade Created | Seller | 🤝 New P2P Order Created - {amount} {coin} |
| Payment Marked | Seller | ✓ Payment Marked Complete - Order {id} |
| Crypto Released | Buyer | ✅ Crypto Released - Order {id} Complete! |
| Trade Cancelled | Both | ❌ Order Cancelled - {id} |
| Dispute Opened | Other Party | Dispute notification |
| Dispute Opened | Admin | 🚨 URGENT: P2P Trade Dispute - {trade_id} |
| Dispute Resolved | Winner | Crypto released/returned notification |

---

## DATABASE COLLECTIONS AFFECTED

| Collection | Phase | Operation |
|------------|-------|-----------|
| `trades` | 1,2,3,4 | Insert, Update |
| `enhanced_sell_orders` | 1 | Update (decrement amount) |
| `audit_trail` | 1 | Insert |
| `admin_revenue` | 2,3 | Insert |
| `fee_transactions` | 2,3 | Insert |
| `wallets` | All | Update (balances) |
| `internal_balances` | All | Update (balances) |
| `disputes` | 4 | Insert, Update |
| `dispute_evidence` | 4 | Insert |
| `notifications` | All | Insert |

---

## TRADE STATUS STATE MACHINE

```
                    ┌──────────────┐
                    │   CREATED    │
                    │ (escrow lock)│
                    └──────┬───────┘
                           │
                           ▼
               ┌───────────────────────┐
               │  PENDING_PAYMENT      │
               │  (120 min countdown)  │
               └───────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌─────────────┐ ┌────────────┐ ┌──────────┐
    │  CANCELLED  │ │BUYER_MARKED│ │ DISPUTED │
    │(timeout/user)│ │   _PAID    │ │          │
    └─────────────┘ └─────┬──────┘ └────┬─────┘
                          │             │
                          ▼             │
                   ┌────────────┐       │
                   │ COMPLETED  │◄──────┘
                   │(seller     │  (admin resolves)
                   │ released)  │
                   └────────────┘
```

---

**✅ THIS IS THE COMPLETE P2P FLOW WITH ALL CODE REFERENCES**
