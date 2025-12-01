# Production Deployment Plan - Wallet System Refactor

**Date:** 2025-11-26  
**Environment:** Moving from STAGING to PRODUCTION

---

## Pre-Deployment Checklist

### ✅ Completed on STAGING
- [x] Central wallet service implemented and tested
- [x] All backend endpoints wired to wallet service:
  - Deposits (NOWPayments with signature validation)
  - Withdrawals (lock/release/unlock)
  - P2P Trades (escrow with transfers)
  - Swaps (debit/credit with fees)
  - Express Buy (fiat to crypto)
  - Savings Transfers (wallet ↔ savings)
  - Referral Commissions (automatic crediting)
- [x] Unified API endpoints created:
  - `/api/wallets/balances/{user_id}`
  - `/api/wallets/portfolio/{user_id}`
  - `/api/wallets/transactions/{user_id}`
- [x] Frontend pages updated:
  - WalletPage.js
  - PortfolioPage.js
  - AllocationsPage.js
  - SavingsPage.js
- [x] Backend starts without errors
- [x] No legacy balance logic in active code paths

---

## Migration Process

### Step 1: Backup Production Database
```bash
# Create timestamped backup
mongodump --uri="PRODUCTION_MONGO_URL" --out=/backups/pre_wallet_migration_$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh /backups/pre_wallet_migration_*
```

**Expected Duration:** 2-5 minutes  
**Rollback:** Keep backup for 30 days minimum

### Step 2: Run Migration Script on Production

**Command:**
```bash
cd /app/backend
export MONGO_URL="<production_mongo_url>"
export DB_NAME="<production_db_name>"
python3 wallet_migration.py > migration_$(date +%Y%m%d_%H%M%S).log 2>&1
```

**What It Does:**
1. Reads from 4 legacy collections:
   - `internal_balances` (main wallet)
   - `trader_balances` (P2P escrow)
   - `crypto_balances` (legacy deposits)
   - `savings_balances` (savings vault)

2. Consolidates into single `wallets` collection:
   ```javascript
   {
     user_id: "user123",
     currency: "BTC",
     available_balance: 1.5,
     locked_balance: 0.5,
     total_balance: 2.0,
     created_at: ISODate,
     last_updated: ISODate
   }
   ```

3. Creates database indexes:
   - `{user_id: 1, currency: 1}` (unique)
   - `{user_id: 1}`
   - `{currency: 1}`
   - `{total_balance: 1}`

4. Outputs statistics:
   - Per-collection migration counts
   - Total balances before/after
   - Any errors encountered

**Expected Duration:** 5-15 minutes depending on data size  
**Critical:** Verify totals match before/after

### Step 3: Verification Checklist

After migration, verify:

```bash
# Check total users
echo 'db.wallets.distinct("user_id").length' | mongosh production_db

# Check total balances per currency
echo 'db.wallets.aggregate([
  {$group: {_id: "$currency", total: {$sum: "$total_balance"}}}
])' | mongosh production_db

# Compare with pre-migration totals
# (Numbers should match exactly)
```

**Critical Verification:**
- [ ] User count matches
- [ ] BTC total matches
- [ ] ETH total matches  
- [ ] USDT total matches
- [ ] No negative balances
- [ ] No duplicate user/currency pairs

### Step 4: Deploy Updated Code

```bash
# Set production flag
echo "IS_STAGING=false" >> /app/backend/.env

# Restart services
sudo supervisorctl restart backend frontend

# Verify startup
tail -f /var/log/supervisor/backend.err.log
```

**Verify:**
- [ ] Backend starts without errors
- [ ] "Central Wallet Service initialized" in logs
- [ ] "RUNNING IN PRODUCTION MODE" in logs

### Step 5: Smoke Tests on Production

**Test 1: Unified Balances Endpoint**
```bash
curl https://production-url/api/wallets/balances/REAL_USER_ID
# Should return balances with USD values
```

**Test 2: Small Deposit Test**
- Simulate small NOWPayments callback
- Verify balance increases
- Check wallet_transactions log created

**Test 3: Small Withdrawal Test**
- Request small withdrawal
- Verify balance locks
- Admin approves
- Verify balance releases

**Test 4: P2P Trade Test**
- Create small test trade
- Verify seller funds lock
- Complete trade
- Verify buyer receives funds
- Verify seller balance decreases

**Test 5: Frontend Verification**
- Open Wallet page → balances display correctly
- Open Portfolio page → totals match wallet
- Open Allocations page → percentages sum to 100%
- Check transaction history → logs visible

---

## Rollback Plan

### If Migration Fails or Issues Found:

**Step 1: Stop Services**
```bash
sudo supervisorctl stop backend frontend
```

**Step 2: Restore Database**
```bash
mongorestore --uri="PRODUCTION_MONGO_URL" --drop /backups/pre_wallet_migration_TIMESTAMP
```

**Step 3: Revert Code**
```bash
git reset --hard PREVIOUS_COMMIT_HASH
sudo supervisorctl start backend frontend
```

**Step 4: Verify Rollback**
- Check old endpoints still work
- Verify balances match pre-migration
- Notify team of rollback

---

## Post-Deployment Monitoring

### First Hour
- Monitor backend logs for errors
- Check wallet_transactions collection grows
- Verify no stuck locks
- Watch for user reports

### First Day
- Run balance reconciliation report
- Check for any negative balances
- Verify all transaction types working
- Monitor admin wallet fees

### First Week
- Generate comprehensive audit report
- Compare transaction volumes
- Check for any edge cases
- Optimize queries if needed

---

## Success Criteria

✅ **System is production-ready when:**
1. All users can see correct balances
2. Deposits credit correctly via NOWPayments
3. Withdrawals lock/release without issues
4. P2P trades transfer funds correctly
5. Swaps execute without errors
6. Savings transfers work both directions
7. Referral commissions credit automatically
8. Portfolio calculations are accurate
9. No negative balances
10. No double-credits
11. Frontend pages load correctly
12. Transaction history is complete

---

## Emergency Contacts

**Database Issues:**
- Backup location: `/backups/`
- Restore command: `mongorestore --uri=... --drop /backups/BACKUP_NAME`

**Service Issues:**
- Logs: `/var/log/supervisor/backend.err.log`
- Restart: `sudo supervisorctl restart backend`

**Rollback Decision:**
- If >5% of users report balance issues: ROLLBACK
- If any negative balances found: ROLLBACK IMMEDIATELY
- If deposits not crediting: ROLLBACK IMMEDIATELY

---

## Timeline Summary

| Step | Duration | Critical |
|------|----------|----------|
| Backup | 2-5 min | YES |
| Migration | 5-15 min | YES |
| Verification | 10 min | YES |
| Deploy Code | 5 min | YES |
| Smoke Tests | 15 min | YES |
| **TOTAL** | **37-50 min** | |

**Recommended Window:** Low-traffic period (e.g., 2-4 AM local time)

---

**Last Updated:** 2025-11-26 17:10 UTC
