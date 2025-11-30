# PHASE 2: Remaining Fee Types Implementation

## Current Status: 12/18 Fees Implemented

### ✅ COMPLETED FEES (12):
1. Swap Fee (1.5%) - `swap_wallet_service.py`
2. Instant Buy Fee (3%) - `swap_wallet_service.py`
3. Instant Sell Fee (2%) - `swap_wallet_service.py`
4. P2P Maker Fee (1%) - `p2p_wallet_service.py`
5. P2P Taker Fee (1%) - `p2p_wallet_service.py`
6. Crypto Withdrawal Fee (1%) - `withdrawal_system_v2.py`
7. Savings Stake Fee (0.5%) - `savings_wallet_service.py`
8. Early Unstake Penalty (3%) - `savings_wallet_service.py`
9. Trading Fee (0.1%) - `server.py` (futures trading endpoint)
10. Dispute Fee (£2 or 1%) - `server.py` (dispute resolution)
11. Cross-wallet Internal Transfer Fee (0.25%) - `server.py`
12. Deposit Fee (0%, logging only) - `server.py`

### ⏳ PENDING FEES (6):

#### 1. P2P Express Fee (2%)
**Location**: P2P Express matching/execution endpoint
**Implementation**: Add fee deduction when express mode P2P trades are created
**File**: `server.py` - `/p2p/express-match` or trade creation endpoint
**Logic**: Charge 2% on top of regular P2P fees when users use express matching

#### 2. Network Withdrawal Fee (1%)
**Location**: Withdrawal endpoint  
**Implementation**: Additional fee on top of withdrawal fee, meant to cover gas
**File**: `withdrawal_system_v2.py` or `server.py`
**Logic**: Add 1% to withdrawal amount as network fee, log separately

#### 3. Fiat Withdrawal Fee (1%)
**Location**: Fiat withdrawal endpoint (if exists)
**Implementation**: Fee for converting crypto to fiat and withdrawing to bank
**File**: `server.py` - fiat withdrawal endpoint
**Logic**: 1% on fiat withdrawal amount
**Note**: May need to create fiat withdrawal system first if it doesn't exist

#### 4. Vault Transfer Fee (0.5%)
**Location**: Vault/Savings transfer endpoint
**Implementation**: Fee for transferring between main wallet and vault/savings
**File**: `server.py` or `savings_wallet_service.py`
**Logic**: 0.5% on amount transferred to/from vault
**Note**: May need to create vault system first if separate from savings

#### 5. Admin Liquidity Spread Profit (Variable, auto-calculated)
**Location**: Express Buy/Instant Buy endpoints
**Implementation**: Track profit margin from admin-provided liquidity
**File**: `swap_wallet_service.py` or admin liquidity management
**Logic**: Calculate difference between market price and price offered to user
**Note**: This is profit tracking, not a direct user fee

#### 6. Express Route Liquidity Profit (Variable, auto-calculated)
**Location**: Express Buy execution endpoint
**Implementation**: Track profit from express route liquidity provision
**File**: `swap_wallet_service.py`
**Logic**: Similar to #5, track spread profit when users use express buy
**Note**: This is profit tracking, not a direct user fee

---

## Implementation Strategy:

### PHASE 2A: Implement User-Facing Fees (4 fees)
These are direct fees charged to users:
1. P2P Express Fee
2. Network Withdrawal Fee  
3. Fiat Withdrawal Fee
4. Vault Transfer Fee

### PHASE 2B: Implement Profit Tracking (2 fees)
These are internal profit calculations:
5. Admin Liquidity Spread Profit
6. Express Route Liquidity Profit

---

## Next Steps:
1. Locate all relevant endpoints
2. Add fee calculations using centralized_fee_system
3. Include referral commission splits (20% standard, 50% golden)
4. Log all transactions to fee_transactions collection
5. Test each implementation
6. Verify dashboard displays all 18 fee types correctly
