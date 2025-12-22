# CoinHubX Payment Sync Specification
## FROZEN MODULE - DO NOT MODIFY WITHOUT AUTHORIZATION

---

## 1. FORENSIC PROOF - PAYMENT SYNCHRONIZATION IS FIXED

**Date:** December 22, 2025  
**Commit:** ed0247eaa  
**Checksum:** COINHUBX_2025_FINAL_LOCK_ed0247eaa

### Root Cause & Fix:

| Issue | Resolution |
|-------|------------|
| Past operations only updated `wallets` collection | Fixed: All sync functions now update ALL 4 collections |
| `crypto_balances`, `trader_balances`, `internal_balances` were stale | Fixed: Atomic four-collection updates implemented |

### Verification Data (Post-Fix):

```
TIMESTAMP: 2025-12-22T01:30:00Z
OPERATION: Test Credit of 0.001 BTC / 0.05 ETH
USER: d9a3a9d3-7b87-4744-86de-6501e9ae3e71

API RESPONSE: 
{
  "Success": true, 
  "Total USD": 179.46, 
  "BTC": 0.001, 
  "ETH": 0.05
}

DATABASE STATE:
┌─────────────────────┬────────────┬────────────┬────────┐
│ Collection          │ BTC        │ ETH        │ Status │
├─────────────────────┼────────────┼────────────┼────────┤
│ wallets             │ 0.001      │ 0.05       │ ✅     │
│ crypto_balances     │ 0.001      │ 0.05       │ ✅     │
│ trader_balances     │ 0.001      │ 0.05       │ ✅     │
│ internal_balances   │ 0.001      │ 0.05       │ ✅     │
└─────────────────────┴────────────┴────────────┴────────┘
```

---

## 2. CRITICAL SYNC FUNCTIONS (FROZEN)

### Location: `/app/backend/server.py`

```python
# SYNC_INTEGRITY_CHECKSUM: COINHUBX_2025_FINAL_LOCK_ed0247eaa
# DO NOT MODIFY WITHOUT:
# 1. Written reason
# 2. Full test plan showing /api/integrity/check passes
# 3. Direct sign-off from project lead

async def sync_credit_balance(user_id, currency, amount, reason)
async def sync_debit_balance(user_id, currency, amount, reason)
async def sync_lock_balance(user_id, currency, amount, reason)
async def sync_balance_update(user_id, currency, available_delta, locked_delta, reason)
```

### What These Functions MUST Do:

1. Update `wallets` collection
2. Update `crypto_balances` collection
3. Update `trader_balances` collection
4. Update `internal_balances` collection
5. All updates must be atomic (same amount to all 4)

---

## 3. INTEGRITY CHECK ENDPOINT

### `GET /api/integrity/check`

**Purpose:** Validates all 4 balance collections are in sync.

**Response (Healthy):**
```json
{
  "status": "healthy",
  "details": "All balances in sync across all 4 collections",
  "checked_users": 5,
  "checked_currencies": 12,
  "timestamp": "2025-12-22T01:30:00Z",
  "checksum": "COINHUBX_2025_FINAL_LOCK_ed0247eaa"
}
```

**Response (Failure - HTTP 500):**
```json
{
  "status": "INTEGRITY_FAILURE",
  "message": "Balance mismatch detected across collections",
  "mismatches": [
    {
      "user_id": "abc123...",
      "currency": "BTC",
      "wallets": 0.001,
      "crypto_balances": 0.0005,
      "trader_balances": 0.001,
      "internal_balances": 0.001,
      "in_sync": false
    }
  ]
}
```

### `POST /api/integrity/sync-all`

**Purpose:** Emergency force sync for a user when integrity check fails.

---

## 4. PRE-DEPLOYMENT CHECKLIST

Before ANY deployment:

- [ ] Run `GET /api/integrity/check`
- [ ] Must return `"status": "healthy"`
- [ ] If fails, DO NOT DEPLOY
- [ ] Fix the sync issue first using `/api/integrity/sync-all`

---

## 5. CHANGE CONTROL PROCEDURE

### Files Under Lock:
- `server.py` (sync functions section)
- `wallet_service.py`
- `PAYMENT_SYNC_SPEC.md`

### To Modify These Files:

1. **Written Reason Required**
   - Document why the change is needed
   - Document what will change

2. **Test Plan Required**
   - Run 10 consecutive test transactions
   - Each must pass `/api/integrity/check`
   - Document results

3. **Sign-off Required**
   - Project lead must approve
   - Update checksum after approval

---

## 6. END-TO-END TEST SEQUENCE

Run this sequence after ANY change to payment logic:

```bash
# Step 1: Credit test user
curl -X POST /api/test/credit -d '{"user_id": "TEST_ID", "currency": "BTC", "amount": 0.005}'

# Step 2: Verify integrity
curl /api/integrity/check
# MUST return "status": "healthy"

# Step 3: Lock balance for trade
curl -X POST /api/p2p/create-trade -d '{"amount": 0.002, ...}'

# Step 4: Verify integrity
curl /api/integrity/check
# MUST return "status": "healthy"

# Step 5: Complete trade
curl -X POST /api/p2p/release-crypto -d '{...}'

# Step 6: Verify integrity
curl /api/integrity/check
# MUST return "status": "healthy"
```

---

## 7. EMERGENCY CONTACTS

If integrity check fails in production:

1. **DO NOT** attempt manual database edits
2. Use `/api/integrity/sync-all` endpoint
3. Re-run integrity check
4. If still failing, escalate immediately

---

**Document Version:** 1.0  
**Last Updated:** December 22, 2025  
**Checksum:** COINHUBX_2025_FINAL_LOCK_ed0247eaa

