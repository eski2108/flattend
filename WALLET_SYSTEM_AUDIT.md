# Wallet System Comprehensive Audit & Refactor Plan

## Current State Analysis (Before Refactor)

### Balance Collections Identified
1. **crypto_balances** - Legacy crypto bank system (BTC, ETH, USDT only)
2. **internal_balances** - Main wallet balances (all transactions, swaps, spot trading)
3. **trader_balances** - P2P escrow system (locked/available balances)
4. **savings_balances** - Savings vault balances
5. **admin_internal_balances** - Platform fee collection wallet

### Current Issues
- ❌ Multiple sources of truth for balances (5 different collections)
- ❌ Inconsistent balance updates across different transaction types
- ❌ No centralized wallet service
- ❌ NowPayments integration incomplete (callbacks not fully validated)
- ❌ Error banner showing "failed to upload balances"
- ❌ Hardcoded coin lists in multiple places
- ❌ No proper logging for wallet operations
- ❌ Withdrawal flow not fully integrated with NowPayments
- ❌ Portfolio/allocations reading from wrong balance sources

## Refactor Plan

### Phase 1: Create Central Wallet Service (Priority 1)
**File:** `/app/backend/wallet_service.py`

**Responsibilities:**
- Single source of truth for user balances
- All balance reads/writes go through this service
- Handles deposits, withdrawals, internal transfers
- Integrates with NowPayments
- Proper error handling and logging
- Transaction atomicity

**Balance Structure:**
```python
{
    "user_id": str,
    "currency": str,
    "available_balance": float,
    "locked_balance": float,  # For P2P/pending withdrawals
    "total_balance": float,   # available + locked
    "last_updated": datetime,
    "transactions": []  # Reference to transaction history
}
```

### Phase 2: NowPayments Integration Cleanup (Priority 1)
**File:** `/app/backend/nowpayments_integration.py`

**Tasks:**
- ✅ Review existing integration
- ⚠️ Add webhook signature validation
- ⚠️ Implement confirmation logic (X blocks before credit)
- ⚠️ Add withdrawal support through NowPayments
- ⚠️ Dynamic coin support (no hardcoded lists)
- ⚠️ Proper fee calculation and minimum amounts
- ⚠️ Comprehensive logging

### Phase 3: Consolidate Balance Collections (Priority 2)
**Migration Strategy:**
- Migrate all balances to single `wallets` collection
- Keep `trader_balances` for P2P escrow locking mechanism
- Deprecate `crypto_balances`, `internal_balances`, `savings_balances`
- Create migration script

### Phase 4: Update All Endpoints (Priority 2)
**Files to Update:**
- `/app/backend/server.py` - All wallet/balance endpoints
- Portfolio endpoints
- Savings endpoints
- P2P trade endpoints
- Swap endpoints
- Express buy endpoints

### Phase 5: Frontend Updates (Priority 3)
**Files to Update:**
- `/app/frontend/src/pages/WalletPage.js`
- `/app/frontend/src/pages/PortfolioPage.js`
- `/app/frontend/src/pages/SavingsPage.js`
- `/app/frontend/src/pages/AllocationsPage.js`
- Remove "failed to upload balances" banner

### Phase 6: Dynamic Coin Support (Priority 3)
**Implementation:**
- Create `supported_coins` configuration API
- Frontend reads from API (no hardcoded lists)
- NowPayments auto-syncs available coins
- Portfolio auto-includes new coins

### Phase 7: Testing & Validation (Priority 1 - Continuous)
**Test Cases:**
1. Deposit BTC → verify balance updates everywhere
2. Withdraw ETH → verify balance deducts, pending status, completion
3. Internal transfer (wallet ↔ savings) → verify atomic updates
4. P2P trade → verify escrow lock/release
5. Swap → verify balance exchange
6. Express buy → verify instant credit
7. Portfolio calculations → verify accuracy
8. Referral commissions → verify auto-credit

## Implementation Order
1. ✅ Fix immediate deposit issue (DONE)
2. 🔄 Create central wallet service
3. 🔄 Clean up NowPayments integration
4. 🔄 Migrate balances to single collection
5. 🔄 Update all endpoints to use wallet service
6. 🔄 Remove error banners
7. 🔄 Add comprehensive logging
8. 🔄 Test everything with testing agent
9. ✅ Deploy to production

## Success Criteria
- ✅ All deposits work for all supported coins
- ✅ All withdrawals work with proper status updates
- ✅ Portfolio shows correct balances from single source
- ✅ No "failed to upload balances" errors
- ✅ Adding new coin requires minimal code changes
- ✅ No regressions when making changes
- ✅ Comprehensive logs for debugging
- ✅ 100% test coverage for wallet operations

---
**Status:** Audit Complete - Starting Implementation
**Last Updated:** 2025-11-26
