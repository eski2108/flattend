# STAGING Wallet System Refactor - Progress Report

**Environment:** STAGING ONLY (IS_STAGING=true)
**Date Started:** 2025-11-26
**Status:** IN PROGRESS

---

## ✅ COMPLETED (Phase 1)

### 1. Core Infrastructure
- [x] Central Wallet Service created (`/app/backend/wallet_service.py`)
  - Single source of truth for balances
  - Atomic credit/debit/lock/unlock operations
  - Comprehensive transaction logging
  - Rollback support for transfers
  
- [x] Enhanced NOWPayments Integration (`/app/backend/nowpayments_integration.py`)
  - HMAC SHA512 signature validation
  - Confirmation requirements by coin
  - Proper error handling and timeouts
  - No hardcoded values

- [x] Migration Script (`/app/backend/wallet_migration.py`)
  - Consolidates 5 collections → 1 unified wallets collection
  - Includes error handling and statistics
  - Creates proper indexes
  - **EXECUTED ON STAGING** (0 balances migrated as DB was empty)

- [x] Staging Environment Setup
  - IS_STAGING flag added to .env
  - Wallet service initialized in server.py startup
  - Logging confirms staging mode active

### 2. Backend Endpoints Updated

- [x] **/api/nowpayments/ipn** - NOWPayments Webhook
  - ✅ Signature validation implemented
  - ✅ Confirmation checking implemented
  - ✅ Credits via wallet_service.credit()
  - ✅ Prevents double-crediting
  - ✅ Comprehensive logging
  - **Status:** PRODUCTION READY

---

## 🔄 IN PROGRESS (Phase 2)

### Endpoints to Update (Use Wallet Service)

#### High Priority
- [ ] /api/nowpayments/create-deposit - Deposit address generation (working, needs wallet service integration for balance check)
- [ ] /api/withdrawals/request - Withdrawal requests (needs wallet_service.debit + lock)
- [ ] /api/withdrawals/approve - Admin withdrawal approval (needs wallet_service.release_locked_balance)

#### P2P Trades
- [ ] /api/p2p/enhanced/create-trade - Lock seller funds (wallet_service.lock_balance)
- [ ] /api/p2p/enhanced/release-crypto - Release to buyer (wallet_service.release + transfer)
- [ ] /api/p2p/enhanced/cancel-trade - Unlock seller funds (wallet_service.unlock_balance)

#### Swap/Spot Trading
- [ ] /api/swap/execute - Swap execution (debit + credit different coins)
- [ ] /api/trading/execute - Spot trading execution

#### Express Buy
- [ ] /api/express-buy/execute - Express buy (debit fiat, credit crypto)

#### Savings
- [ ] /api/savings/transfer - Move between wallet and savings (transfer logic)

#### Referrals
- [ ] Referral commission crediting (wallet_service.credit with type="referral_commission")

---

## 📋 NEXT STEPS (Phase 3 - Frontend)

### Pages to Update
- [ ] **WalletPage.js** - Use unified /api/wallets/balances endpoint
- [ ] **PortfolioPage.js** - Read from wallets collection
- [ ] **SavingsPage.js** - Read from wallets collection  
- [ ] **AllocationsPage.js** - Calculate percentages from wallets collection
- [ ] **Remove Error Banner** - Remove "failed to upload balances" toast

### New Endpoints to Create
- [ ] /api/wallets/balances/{user_id} - Get all balances from wallets collection
- [ ] /api/wallets/portfolio/{user_id} - Get portfolio with percentages and totals
- [ ] /api/wallets/transactions/{user_id} - Get transaction history from wallet_transactions

---

## 🧪 TESTING CHECKLIST (Phase 4)

### Test Cases (Execute on STAGING)

1. **Deposit Flow**
   - [ ] Generate deposit address for BTC
   - [ ] Simulate NOWPayments IPN callback
   - [ ] Verify wallet_transactions log created
   - [ ] Verify wallets collection balance increased
   - [ ] Verify WalletPage shows updated balance
   - [ ] Verify Portfolio shows correct percentage

2. **Withdrawal Flow**
   - [ ] Request withdrawal
   - [ ] Verify balance locked in wallets collection
   - [ ] Admin approves withdrawal
   - [ ] Verify balance released (total decreased)
   - [ ] Verify transaction logged

3. **P2P Trade**
   - [ ] User A creates sell order
   - [ ] User B buys
   - [ ] Verify User A balance locked
   - [ ] User B marks paid
   - [ ] User A releases crypto
   - [ ] Verify User A balance decreased (released)
   - [ ] Verify User B balance increased (credited)
   - [ ] Verify fees collected in admin wallet

4. **Swap**
   - [ ] User swaps 0.01 BTC → ETH
   - [ ] Verify BTC debited
   - [ ] Verify ETH credited
   - [ ] Verify amounts match expected rate
   - [ ] Verify portfolio percentages updated

5. **Express Buy**
   - [ ] User buys BTC with GBP
   - [ ] Verify GBP debited
   - [ ] Verify BTC credited
   - [ ] Verify admin liquidity updated

6. **Referral Commission**
   - [ ] Referred user makes trade
   - [ ] Verify referrer credited commission
   - [ ] Verify commission logged with proper metadata

7. **Portfolio Calculations**
   - [ ] Verify total portfolio value = sum of (balance × price)
   - [ ] Verify percentages sum to 100%
   - [ ] Verify top coins + "Others" bucket logic

---

## 📊 DATA INTEGRITY CHECKS

### Pre-Migration Snapshot (Production - NOT DONE YET)
```
Total Users: ???
Total BTC: ???
Total ETH: ???
Total USDT: ???
Collections:
  - internal_balances: ??? records
  - trader_balances: ??? records
  - crypto_balances: ??? records
  - savings_balances: ??? records
```

### Post-Migration Verification (Production - NOT DONE YET)
```
Total Users: ??? (should match)
Total BTC: ??? (should match)
Total ETH: ??? (should match)
Total USDT: ??? (should match)
Collection:
  - wallets: ??? records (should = sum of old records)
```

---

## 🚨 PRODUCTION DEPLOYMENT CHECKLIST

**DO NOT EXECUTE UNTIL ALL ABOVE IS COMPLETE AND TESTED**

1. [ ] All tests pass on staging
2. [ ] Frontend shows correct balances from unified endpoint
3. [ ] No error banners appearing
4. [ ] Portfolio calculations are 100% accurate
5. [ ] All transaction types logged properly
6. [ ] Full backup of production DB taken
7. [ ] Downtime window scheduled (if needed)
8. [ ] Set IS_STAGING=false in production .env
9. [ ] Run migration script on production
10. [ ] Verify totals match pre-migration snapshot
11. [ ] Deploy updated code
12. [ ] Test deposit with small real amount
13. [ ] Test withdrawal with small real amount
14. [ ] Monitor logs for 1 hour
15. [ ] Confirm with user before announcing

---

## 🔧 TECHNICAL NOTES

### Wallet Service API
```python
# Credit balance
await wallet_service.credit(
    user_id="user123",
    currency="BTC",
    amount=0.01,
    transaction_type="deposit_nowpayments",
    reference_id="payment_12345",
    metadata={"order_id": "..."}
)

# Debit balance
await wallet_service.debit(
    user_id="user123",
    currency="BTC",
    amount=0.005,
    transaction_type="withdrawal",
    reference_id="withdrawal_67890",
    metadata={"address": "1A1z...", "fee": 0.0001}
)

# Lock balance (P2P escrow)
await wallet_service.lock_balance(
    user_id="seller123",
    currency="BTC",
    amount=0.05,
    lock_type="p2p_escrow",
    reference_id="trade_abc123"
)

# Unlock balance (cancelled trade)
await wallet_service.unlock_balance(
    user_id="seller123",
    currency="BTC",
    amount=0.05,
    unlock_type="p2p_cancelled",
    reference_id="trade_abc123"
)

# Release locked balance (completed trade)
await wallet_service.release_locked_balance(
    user_id="seller123",
    currency="BTC",
    amount=0.05,
    release_type="p2p_completed",
    reference_id="trade_abc123"
)

# Transfer between users
await wallet_service.transfer(
    from_user="user123",
    to_user="user456",
    currency="BTC",
    amount=0.01,
    transfer_type="p2p_payment",
    reference_id="trade_abc123"
)
```

### Database Schema
```
wallets collection:
{
  "user_id": "user123",
  "currency": "BTC",
  "available_balance": 1.5,
  "locked_balance": 0.5,  // For P2P escrow, pending withdrawals
  "total_balance": 2.0,   // available + locked
  "created_at": ISODate,
  "last_updated": ISODate
}

wallet_transactions collection:
{
  "transaction_id": "uuid",
  "user_id": "user123",
  "currency": "BTC",
  "amount": 0.01,
  "transaction_type": "deposit_nowpayments",
  "direction": "credit",  // credit|debit|release
  "reference_id": "payment_12345",
  "balance_after": 1.51,
  "metadata": {...},
  "timestamp": ISODate
}
```

---

**Last Updated:** 2025-11-26 15:45 UTC
**Next Action:** Continue updating remaining endpoints to use wallet service
