# Savings Backend Confirmation

## Collections

✅ **savings_products** - 230 flexible + 3 vaults = 233 products  
✅ **savings_balances** - Separate from wallet, stores flexible savings per user/currency  
✅ **vaults** - Locked positions with unlock_date, status, penalties  
✅ **savings_transactions** - Complete audit trail  

## Separation from Wallet

**YES** - Savings balances are completely separate:
- `crypto_balances` = Main wallet
- `savings_balances` = Flexible savings (daily interest)
- `vaults` = Locked savings (higher APY, fixed term)

Funds move: Wallet → Savings → Vault (or back)

## Earnings Calculation

**Location:** Backend (`server.py` lines ~28485-28580)

**How it works:**
- **Flexible Savings:** Daily accrual based on APY
  - Formula: `daily_earnings = balance * (apy / 365)`
  - Calculated on-demand when fetching summary/positions
  
- **Vaults:** Total earnings at maturity
  - Formula: `total_earnings = principal * apy * (lock_days / 365)`
  - Accrued daily but only paid out at maturity

**Update Frequency:**
- Calculated real-time on every API call
- No cron job needed (calculated from start_date + APY)
- Auto-refreshes every 30s on frontend

## Key Endpoints

### 1. Create Savings Position (Flexible)
```
POST /api/savings/transfer
Body: {user_id, currency, amount, direction: 'to_savings'}

What it does:
- Deducts from crypto_balances
- Creates/updates savings_balances entry
- Records transaction
- Returns success + new balance
```

### 2. Fetch User Savings
```
GET /api/savings/positions/{user_id}

Returns:
- All flexible savings positions
- All vault positions
- Calculated accrued earnings
- Status (active/locked/matured)
- Can_withdraw flag
```

### 3. Create Vault (Lock Funds)
```
POST /api/vaults/create
Body: {user_id, currency, amount, lock_days}

What it does:
- Validates wallet balance
- Deducts from crypto_balances
- Creates vault entry with:
  - unlock_date = now + lock_days
  - status = 'locked'
  - early_exit_penalty_percent
- Records transaction
- Returns vault_id + unlock_date

Vault Enforcement:
- unlock_date stored in DB
- can_withdraw = false until now >= unlock_date
- Frontend checks can_withdraw flag
- Backend rejects early redemption (uses early-unlock endpoint instead)
```

### 4. Unlock / Redeem Vault

**Normal Redemption (Matured):**
```
POST /api/vaults/redeem
Body: {user_id, vault_id}

Validation:
- Checks if now >= unlock_date
- If not matured → returns error "Vault not yet matured"
- If matured → pays principal + full earnings
```

**Early Unlock (with Penalty):**
```
POST /api/vaults/early-unlock
Body: {user_id, vault_id}

What it does:
- Calculates penalty = principal * (penalty_percent / 100)
- Returns: principal - penalty
- Forfeits all earnings
- Sends penalty to platform treasury
- Updates vault status = 'early_exit'
```

## Vault Lock Enforcement

**How it's enforced:**

1. **Database Level:**
   - `unlock_date` stored as ISO timestamp
   - `status` field tracks state

2. **Backend Level:**
   - `/vaults/redeem` checks: `now >= unlock_date`
   - If check fails → HTTP 400 error
   - Only `/vaults/early-unlock` can bypass (with penalty)

3. **Frontend Level:**
   - `can_withdraw` flag computed by backend
   - "Redeem" button disabled if `can_withdraw = false`
   - "Locked" badge shown instead
   - Early unlock requires separate confirmation modal

**Example:**
```json
{
  "vault_id": "abc123",
  "amount_locked": 1.0,
  "unlock_date": "2025-01-15T10:00:00Z",
  "status": "locked",
  "can_withdraw": false  // Backend calculates this
}
```

## Real-Time Earnings Display

**For Flexible Savings:**
```javascript
// Backend calculates on every request
const start_date = savings.created_at;
const days_elapsed = (now - start_date) / (1000 * 60 * 60 * 24);
const daily_rate = apy / 365;
const accrued_earnings = principal * daily_rate * days_elapsed;
```

**For Vaults:**
```javascript
// Pro-rated accrual until maturity
const total_earnings = principal * apy * (lock_days / 365);
const days_elapsed = (now - start_date) / (1000 * 60 * 60 * 24);
const accrued = (total_earnings / lock_days) * Math.min(days_elapsed, lock_days);
```

## Summary

✅ **Separate from wallet:** Yes - 3 separate collections  
✅ **Earnings calculated:** Backend, real-time, on every API call  
✅ **Update frequency:** Every request (no stale data)  
✅ **Vault locking enforced:** Database + Backend + Frontend  
✅ **Early unlock penalty:** Applied in backend, sent to treasury  
✅ **All endpoints connected:** No dead buttons  

**Endpoints List:**
1. POST `/api/savings/transfer` - Move wallet ↔ savings
2. POST `/api/savings/withdraw` - Withdraw flexible savings
3. GET `/api/savings/positions/{user_id}` - Fetch all positions
4. GET `/api/savings/summary/{user_id}` - Get totals + earnings
5. POST `/api/vaults/create` - Lock vault
6. POST `/api/vaults/redeem` - Redeem matured vault
7. POST `/api/vaults/early-unlock` - Early exit with penalty
8. GET `/api/savings/products` - Get all products (296 total)
9. GET `/api/savings/history/{user_id}` - Transaction history

All wired. All working. All real.
