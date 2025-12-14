# Savings Page - Bank-Grade Vault System Rebuild

**Status:** FRONTEND COMPLETE - BACKEND IN PROGRESS
**Date:** 2024-12-14

## IMPLEMENTATION STATUS

### ✅ COMPLETED

1. **Frontend Rebuild** (`/app/frontend/src/pages/SavingsPage.js`)
   - Exact color system implemented (non-negotiable)
   - Page structure matches specification exactly
   - All 4 modals built
   - No APY/yield/DeFi UI elements
   - Glow rules enforced (primary actions only)
   - Navigation fully functional

### ⚠️ BACKEND REQUIRED

The following endpoints must be implemented in `/app/backend/server.py`:

#### 1. Get Vaults
```python
@api_router.get("/vaults/{user_id}")
async def get_user_vaults(user_id: str):
    # Get all vaults for user from vaults collection
    # Return: { success: true, vaults: [...] }
    pass
```

#### 2. Create Vault
```python
@api_router.post("/vaults/create")
async def create_vault(data: dict):
    # Required fields: user_id, currency, amount, lock_period (30/60/90)
    # Process:
    # 1. Validate user has sufficient savings balance
    # 2. Reduce savings balance
    # 3. Create vault record with:
    #    - vault_id (UUID)
    #    - user_id
    #    - currency
    #    - amount
    #    - lock_period (days)
    #    - created_at (timestamp)
    #    - unlock_date (created_at + lock_period days)
    #    - status ('locked')
    # 4. Insert into vaults collection
    # 5. Return: { success: true, vault: {...} }
    pass
```

#### 3. Early Unlock
```python
@api_router.post("/vaults/early-unlock")
async def early_unlock_vault(data: dict):
    # Required fields: user_id, vault_id
    # Process:
    # 1. Get vault from vaults collection
    # 2. Verify vault belongs to user
    # 3. Calculate penalty (10% of amount)
    # 4. Calculate final amount (amount - penalty)
    # 5. Add final amount to savings balance
    # 6. Delete vault record (or mark status = 'early_unlocked')
    # 7. Log penalty transaction
    # 8. Return: { success: true, penalty_applied: X, final_amount: Y }
    pass
```

#### 4. Withdraw Completed Vault
```python
@api_router.post("/vaults/withdraw")
async def withdraw_vault(data: dict):
    # Required fields: user_id, vault_id
    # Process:
    # 1. Get vault from vaults collection
    # 2. Verify unlock_date has passed
    # 3. Add full amount to savings balance
    # 4. Delete vault record (or mark status = 'withdrawn')
    # 5. Return: { success: true }
    pass
```

#### 5. Transfer from Wallet to Savings
```python
@api_router.post("/savings/deposit")
async def deposit_to_savings(data: dict):
    # Required fields: user_id, currency, amount
    # Process:
    # 1. Validate user has sufficient wallet balance
    # 2. Reduce crypto_balances (wallet)
    # 3. Increase savings_balances
    # 4. Log transaction
    # 5. Return: { success: true }
    pass
```

#### 6. Withdraw from Savings to Wallet
```python
@api_router.post("/savings/withdraw")
async def withdraw_from_savings(data: dict):
    # Already exists - verify it works correctly
    pass
```

### DATABASE SCHEMA

#### vaults collection
```json
{
  "vault_id": "uuid",
  "user_id": "string",
  "currency": "string (BTC/ETH/etc)",
  "amount": "float",
  "lock_period": "int (30/60/90 days)",
  "created_at": "timestamp",
  "unlock_date": "timestamp",
  "status": "string (locked/early_unlocked/withdrawn)",
  "gbp_value": "float (calculated)"
}
```

#### savings_balances collection (existing)
```json
{
  "user_id": "string",
  "currency": "string",
  "savings_balance": "float",
  "gbp_value": "float"
}
```

### VALIDATION RULES

1. **Balance Reconciliation**
   - Wallet + Savings + Vaults must always equal total
   - No negative balances allowed
   - All transfers must be atomic

2. **Vault Creation**
   - Can only create vault from savings balance (not wallet)
   - Must have sufficient savings balance
   - Lock period must be 30, 60, or 90 days exactly

3. **Early Unlock**
   - 10% penalty applied server-side
   - Penalty amount logged in transactions
   - Cannot unlock same vault twice

4. **Completed Vault Withdraw**
   - Can only withdraw if unlock_date has passed
   - Returns to savings (not wallet)
   - No penalty

### FRONTEND FEATURES IMPLEMENTED

✅ Page header with "Transfer from Wallet" button
✅ 3-column savings summary panel
✅ Flexible savings section (table rows, only non-zero balances)
✅ Withdraw to Wallet buttons
✅ Locked vaults section
✅ Create Vault button with glow
✅ Vault cards showing all required info
✅ Status badges (locked/unlocking/completed)
✅ Transfer Modal structure
✅ Create Vault Modal (4-step flow)
✅ Early Unlock Modal with penalty calculation
✅ Exact color system (no deviations)
✅ Glow only on primary actions
✅ No APY/yield/DeFi elements
✅ No dead-end buttons

### TESTING CHECKLIST

Once backend is complete, test:

- [ ] Load savings balances (only non-zero)
- [ ] Load vaults list
- [ ] Create new vault (deducts from savings)
- [ ] Vault countdown shows correct days
- [ ] Early unlock applies 10% penalty
- [ ] Completed vault allows withdrawal
- [ ] Transfer wallet → savings works
- [ ] Withdraw savings → wallet works
- [ ] Balance reconciliation (wallet + savings + vaults = total)
- [ ] Error handling (insufficient balance, etc)
- [ ] All buttons route correctly

### COLOR SYSTEM (NON-NEGOTIABLE)

```javascript
const COLORS = {
  BG_PRIMARY: '#0B0F1A',    // Deep navy background
  BG_CARD: '#12182A',        // Section cards
  BG_PANEL: '#161D33',       // Inner panels
  TEXT_PRIMARY: '#FFFFFF',   // Primary text
  TEXT_SECONDARY: '#AAB0C0', // Secondary text
  TEXT_MUTED: '#7A8095',     // Muted labels
  ACTION_PRIMARY: '#4DA3FF', // Primary action
  ACTION_HOVER: '#6AB6FF',   // Hover state
  ACTION_DISABLED: '#2A3B55' // Disabled state
};

const GLOW_PRIMARY = '0 0 18px rgba(77,163,255,0.35)';
```

### LOCKED STATUS

Once backend is implemented and tested:

1. Commit all changes
2. Push to all GitHub repos
3. Mark `/app/frontend/src/pages/SavingsPage.js` as LOCKED
4. Add to `LAYOUT_LOCK.md`
5. No further edits without explicit approval

### NEXT STEPS

1. Implement 6 backend endpoints listed above
2. Test each endpoint with curl
3. Test frontend integration
4. Verify balance reconciliation
5. Lock file once approved

---

**DO NOT MODIFY FRONTEND WITHOUT APPROVAL**
**All visual changes must follow exact specification**
