# CoinHubX Complete Financial Engine Implementation

## AUDIT RESULTS

### ✅ ALREADY WORKING (NO CHANGES NEEDED)

#### 1. Swap Fees
- **Location**: `/app/backend/swap_wallet_service.py` line 169-372
- **Fee**: 1.5% (from centralized_fee_system.py)
- **Status**: ✅ FULLY IMPLEMENTED
- **Fee Destination**: PLATFORM_FEES (internal_balances collection)
- **Referral Commission**: ✅ IMPLEMENTED (using referral_commission_calculator)
- **Admin Liquidity**: ✅ IMPLEMENTED (deducts from admin liquidity, returns to admin liquidity)
- **Proof**: Lines 287-298 credit to PLATFORM_FEES, lines 259-281 handle liquidity

#### 2. Instant Buy Fees (Express Buy)
- **Location**: `/app/backend/swap_wallet_service.py` line 11-167
- **Fee**: 3.0% (instant_buy_fee_percent from centralized_fee_system.py)
- **Status**: ✅ FULLY IMPLEMENTED
- **Fee Destination**: PLATFORM_FEES via admin_wallet (line 72-79)
- **Referral Commission**: ✅ IMPLEMENTED (line 82-95 using referral_engine)
- **Proof**: Lines 72-79 credit admin_wallet with admin portion, lines 82-95 process referral

#### 3. P2P Maker Fees (Seller)
- **Location**: `/app/backend/p2p_wallet_service.py` line 234-464
- **Fee**: 1.0% (p2p_maker_fee_percent from centralized_fee_system.py)
- **Status**: ✅ FULLY IMPLEMENTED
- **Fee Destination**: admin_wallet (line 346-356)
- **Referral Commission**: ✅ IMPLEMENTED (line 276-296 using referral_commission_calculator)
- **Proof**: Lines 348-356 credit admin_wallet, lines 362-388 process referral commission

#### 4. P2P Taker Fees (Buyer)
- **Location**: `/app/backend/p2p_wallet_service.py` line 92-125
- **Fee**: 1.0% (p2p_taker_fee_percent from centralized_fee_system.py)
- **Status**: ✅ CALCULATED (collected during trade creation)
- **Referral Commission**: ✅ PLANNED (code at line 109-125)

---

### ⚠️ NEEDS REFERRAL COMMISSION INTEGRATION

#### 5. Instant Sell Fees
- **Location**: `/app/backend/swap_wallet_service.py` line 375-496
- **Fee**: 2.0% (instant_sell_fee_percent from centralized_fee_system.py)
- **Status**: ⚠️ FEE COLLECTED, REFERRAL PARTIALLY IMPLEMENTED
- **Issue**: Lines 456-458 reference undefined variables (admin_fee, referrer_commission, referrer_id)
- **Fix Required**: Extract values from commission_result (COMPLETED)
- **Fee Destination**: admin_wallet (line 436-443)
- **Referral Commission**: ✅ IMPLEMENTED (line 400-419 using referral_engine)

#### 6. Spot Trading Fees
- **Location**: `/app/backend/server.py` lines 11151-11339
- **Fee**: 0.5% hardcoded (should use spot_trading_fee_percent from centralized_fee_system.py which is 0.1%)
- **Status**: ⚠️ FEE COLLECTED TO PLATFORM_FEES, NO REFERRAL COMMISSION
- **Issue**: Not using centralized fee system, not processing referral commissions
- **Fix Required**: 
  1. Use centralized_fee_system for fee percentage
  2. Add referral commission processing
- **Fee Destination**: ✅ PLATFORM_FEES (lines 11221-11232 for buy, 11311-11322 for sell)

---

### ❌ NOT IMPLEMENTED

#### 7. Deposit Fees
- **Location**: `/app/backend/server.py` line 19083-19210 (NOWPayments IPN webhook)
- **Current Fee**: 0% (lines 19183-19186)
- **Target Fee**: 0% (deposit_fee_percent from centralized_fee_system.py)
- **Status**: ❌ NO FEE CHARGED (by design - deposits are FREE)
- **Referral Commission**: N/A (no fee, no commission)
- **Note**: Deposits are intentionally free to encourage user deposits

#### 8. Withdrawal Fees
- **Location**: Need to find withdrawal endpoint
- **Target Fee**: 1.0% (withdrawal_fee_percent from centralized_fee_system.py)
- **Status**: ❌ NOT IMPLEMENTED
- **Fix Required**:
  1. Find withdrawal endpoint
  2. Calculate fee from centralized_fee_system
  3. Deduct fee from withdrawal amount
  4. Credit PLATFORM_FEES
  5. Process referral commission

#### 9. Admin Liquidity System
- **Current Status**: 
  - ✅ Swap correctly manages liquidity (deducts destination, adds source)
  - ❌ Instant Buy/Sell may not be using admin liquidity
  - ❌ No admin interface to view/manage liquidity
  - ❌ No low liquidity warnings
- **Fix Required**:
  1. Ensure Instant Buy deducts from admin liquidity
  2. Ensure Instant Sell returns to admin liquidity
  3. Create admin endpoint to view liquidity
  4. Create admin endpoint to top up liquidity
  5. Add liquidity checks before transactions

#### 10. NOWPayments Payout (Admin Withdrawals)
- **Status**: ❌ NOT IMPLEMENTED
- **Fix Required**:
  1. Create admin endpoint to request crypto payout
  2. Integrate NOWPayments Payout API
  3. Deduct from PLATFORM_FEES balance
  4. Create payout record
  5. Add webhook handler for payout status updates
  6. Show payout history in admin dashboard

---

## IMPLEMENTATION PRIORITIES

### Phase 1: Fix Existing Issues (30 mins)
1. ✅ Fix instant_sell undefined variables
2. ⚠️ Add referral commission to Spot Trading
3. ⚠️ Update Spot Trading to use centralized_fee_system

### Phase 2: Implement Withdrawal Fees (45 mins)
1. Find withdrawal endpoint
2. Add fee calculation from centralized_fee_system
3. Process referral commission
4. Update PLATFORM_FEES

### Phase 3: Admin Liquidity System (1 hour)
1. Audit Instant Buy/Sell liquidity usage
2. Create admin liquidity dashboard endpoint
3. Create admin liquidity top-up endpoint
4. Add liquidity checks to financial_engine.py

### Phase 4: NOWPayments Payout (1.5 hours)
1. ✅ Created nowpayments_payout_service.py
2. Create admin payout request endpoint
3. Add payout webhook handler
4. Add payout history endpoint
5. Test with NOWPayments sandbox

### Phase 5: Testing & Documentation (2 hours)
1. Create test users (normal referral, golden referral)
2. Test each transaction type
3. Verify PLATFORM_FEES collection
4. Verify referral commissions
5. Take screenshots
6. Write comprehensive documentation

---

## DATABASE COLLECTIONS

### Fee Revenue Tracking
- **internal_balances** (user_id: "PLATFORM_FEES")
  - balance: Total fees collected
  - total_fees: Sum of all fees
  - swap_fees: Swap transaction fees
  - instant_buy_fees: Instant buy fees
  - instant_sell_fees: Instant sell fees
  - spot_trading_fees: Spot trading fees (also called trading_fees)
  - p2p_buyer_fees: P2P buyer (taker) fees
  - p2p_seller_fees: P2P seller (maker) fees
  - deposit_fees: Deposit fees (currently 0)
  - withdrawal_fees: Withdrawal fees
  - referral_commissions_paid: Total paid to referrers
  - net_platform_revenue: Admin revenue after referral commissions

### Referral Commission Tracking
- **referral_commissions**
  - commission_id
  - referrer_id
  - referred_user_id
  - fee_type
  - fee_amount
  - commission_rate
  - commission_amount
  - currency
  - referrer_tier (standard, vip, golden)
  - related_transaction_id
  - created_at
  - status: "completed"

### Fee Transaction Log
- **fee_transactions**
  - transaction_id
  - user_id (user who paid the fee)
  - transaction_type (swap, instant_buy, instant_sell, p2p_trade, spot_trading, deposit, withdrawal)
  - fee_type (swap_fee_percent, instant_buy_fee_percent, etc.)
  - amount (transaction amount)
  - fee_amount (total fee charged)
  - fee_percent (percentage used)
  - admin_fee (amount to admin after referral)
  - referrer_commission (amount to referrer)
  - referrer_id
  - currency
  - reference_id (swap_id, trade_id, etc.)
  - timestamp

### Admin Liquidity Tracking
- **admin_liquidity_wallets**
  - currency
  - balance: Total liquidity
  - available: Available for trades
  - reserved: Locked in pending transactions
  - created_at
  - updated_at

- **admin_liquidity_history**
  - history_id
  - currency
  - amount
  - operation: "add" or "deduct"
  - reference_id
  - metadata
  - timestamp

---

## REFERRAL COMMISSION RATES

### Standard Tier (Default)
- Commission: 20% of platform fee
- Eligibility: All users by default

### VIP Tier
- Commission: 20% of platform fee
- Eligibility: Pay £150 upgrade fee

### Golden Tier
- Commission: 50% of platform fee
- Eligibility: Admin-assigned only

### Example Calculations

#### Swap: 1 BTC @ £30,000
- Transaction Value: £30,000
- Fee (1.5%): £450
- Standard Referrer Commission (20%): £90
- Admin Revenue: £360
- Golden Referrer Commission (50%): £225
- Admin Revenue: £225

#### Instant Buy: £1,000
- Base Cost: £1,000
- Fee (3.0%): £30
- Total Cost: £1,030
- Standard Referrer Commission (20%): £6
- Admin Revenue: £24
- Golden Referrer Commission (50%): £15
- Admin Revenue: £15

---

## SECURITY & VALIDATION

### IPN Webhook Signature Verification
- ✅ IMPLEMENTED in nowpayments_integration.py line 333-399
- Uses HMAC SHA512 with sorted JSON keys
- Prevents fake deposit attempts
- Critical for production security

### Atomic Transactions
- Use MongoDB transactions for critical operations
- Rollback on failure
- Never leave fees in limbo

### Balance Validation
- Check sufficient balance before all debit operations
- Check admin liquidity before instant buy/sell/swap
- Lock balances during P2P escrow

---

## FILES CREATED

1. ✅ `/app/backend/financial_engine.py` - Master financial engine
2. ✅ `/app/backend/nowpayments_payout_service.py` - Admin crypto withdrawals
3. ✅ `/app/backend/FINANCIAL_ENGINE_IMPLEMENTATION_PLAN.md` - This document

## FILES TO MODIFY

1. ⚠️ `/app/backend/server.py` - Add referral commission to spot trading
2. ⚠️ `/app/backend/swap_wallet_service.py` - Fix instant_sell undefined variables (COMPLETED)
3. ❌ `/app/backend/server.py` - Implement withdrawal fees
4. ❌ `/app/backend/server.py` - Add admin payout endpoints
5. ❌ `/app/backend/server.py` - Add admin liquidity management endpoints

---

## NEXT STEPS

1. Complete Phase 1 fixes
2. Find and implement withdrawal fee system
3. Build admin liquidity management
4. Implement NOWPayments payout integration
5. Comprehensive testing with proof screenshots
6. Final documentation and system locking
