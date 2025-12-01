# 🧪 COMPREHENSIVE END-TO-END TESTING PLAN

**Project:** CoinHubX Platform  
**Date:** 2025-11-30  
**Status:** IN PROGRESS

---

## 📊 ALL 18 FEE TYPES - TESTING CHECKLIST

### ✅ Fee Type 1: Swap Fee (1.5%)
- [ ] Test BTC → ETH swap
- [ ] Verify 1.5% fee deducted
- [ ] Confirm admin receives fee minus referral commission
- [ ] Check referrer receives correct commission (20% standard, 20% VIP, 50% golden)
- [ ] Verify fee_transactions log entry
- [ ] Confirm Business Dashboard shows fee
- [ ] Screenshot proof

### ✅ Fee Type 2: Instant Buy Fee (3%)
- [ ] Test instant buy BTC with GBP
- [ ] Verify 3% fee applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 3: Instant Sell Fee (2%)
- [ ] Test instant sell ETH for GBP
- [ ] Verify 2% fee applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 4: P2P Maker Fee (1%)
- [ ] Create sell order
- [ ] Complete trade as seller
- [ ] Verify 1% fee on crypto released
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 5: P2P Taker Fee (1%)
- [ ] Buy from P2P marketplace
- [ ] Mark as paid
- [ ] Verify 1% fee on fiat amount
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 6: P2P Express Fee (2%)
- [ ] Use express mode for P2P
- [ ] Verify 2% express fee + 1% taker fee = 3% total
- [ ] Confirm both fees logged separately
- [ ] Check admin/referrer split for both
- [ ] Verify Business Dashboard shows both
- [ ] Screenshot proof

### ✅ Fee Type 7: Crypto Withdrawal Fee (1%)
- [ ] Request BTC withdrawal
- [ ] Admin approves
- [ ] Verify 1% withdrawal fee
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 8: Network Withdrawal Fee (1%)
- [ ] Same BTC withdrawal as #7
- [ ] Verify 1% network fee on top of withdrawal fee
- [ ] Total should be 2%
- [ ] Confirm both fees logged separately
- [ ] Check admin/referrer split
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 9: Fiat Withdrawal Fee (1%)
- [ ] Request GBP withdrawal (bank transfer)
- [ ] Admin approves
- [ ] Verify 1% fiat fee (no network fee for fiat)
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 10: Savings Stake Fee (0.5%)
- [ ] Stake BTC in savings
- [ ] Verify 0.5% fee on stake amount
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 11: Early Unstake Penalty (3%)
- [ ] Withdraw from savings before maturity
- [ ] Verify 3% penalty applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 12: Trading Fee (0.1%)
- [ ] Place futures/margin trade
- [ ] Verify 0.1% fee applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 13: Dispute Fee (£2 or 1%)
- [ ] Open P2P dispute
- [ ] Resolve dispute
- [ ] Verify £2 fixed or 1% fee applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 14: Cross-Wallet Transfer Fee (0.25%)
- [ ] Transfer between internal wallets
- [ ] Verify 0.25% fee applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 15: Deposit Fee (0%)
- [ ] Deposit BTC
- [ ] Verify 0% fee (free deposit)
- [ ] Confirm logging still happens
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard shows it as free
- [ ] Screenshot proof

### ✅ Fee Type 16: Vault Transfer Fee (0.5%)
- [ ] Transfer to vault/savings
- [ ] Verify 0.5% fee applied
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 17: Admin Liquidity Spread Profit (Variable)
- [ ] Buy from admin liquidity
- [ ] Calculate spread profit (sell price - market price)
- [ ] Verify spread profit logged
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

### ✅ Fee Type 18: Express Route Liquidity Profit (Variable)
- [ ] Use express buy with admin liquidity
- [ ] Verify liquidity profit calculated and logged
- [ ] Confirm admin/referrer split
- [ ] Check fee_transactions log
- [ ] Verify Business Dashboard
- [ ] Screenshot proof

---

## 🎁 REFERRAL SYSTEM - 3 TIERS TESTING

### Tier 1: Standard (20% Lifetime - Free)
- [ ] Register new user without referral code
- [ ] Verify default tier is "standard"
- [ ] User makes a trade
- [ ] Verify NO commission paid (no referrer)
- [ ] Screenshot proof

### Tier 2: VIP Package (20% Lifetime - £150 One-Time)
- [ ] User purchases VIP tier for £150
- [ ] Verify £150 deducted from GBP balance
- [ ] Verify tier upgraded to "vip"
- [ ] User refers someone
- [ ] Referred user makes trade
- [ ] Verify VIP user receives 20% commission
- [ ] Screenshot proof of:
  - VIP purchase transaction
  - Commission payout
  - Dashboard showing VIP tier

### Tier 3: Golden (50% Lifetime - Admin Assigned)
- [ ] Admin manually upgrades user to golden tier
- [ ] User refers someone
- [ ] Referred user makes trade
- [ ] Verify golden user receives 50% commission
- [ ] Confirm admin receives remaining 50%
- [ ] Screenshot proof of:
  - Admin assigning golden tier
  - 50% commission payout
  - Dashboard showing golden tier

---

## 💼 BUSINESS DASHBOARD VERIFICATION

### Real-Time Data Display
- [ ] All 18 fee types show in Fee Management tab
- [ ] All fees are editable
- [ ] Edit a fee and verify change takes effect immediately
- [ ] Revenue Analytics shows all fee income
- [ ] DAY/WEEK/MONTH/ALL filters work correctly
- [ ] Fee breakdown chart shows all 18 fee types
- [ ] Revenue totals match sum of all fee_transactions
- [ ] No placeholder data or hard-coded values
- [ ] Screenshot proof of:
  - Fee Management tab (all 18 fees)
  - Revenue Analytics (all periods)
  - Fee breakdown chart
  - Editing a fee and seeing instant update

### Customers Tab
- [ ] Total users count is accurate
- [ ] Active users calculation correct
- [ ] User list displays correctly
- [ ] Screenshot proof

### Referrals Tab
- [ ] Total referrers count accurate
- [ ] Total commissions paid accurate
- [ ] Top referrers list correct
- [ ] Tier distribution shown
- [ ] Screenshot proof

---

## 📋 END-TO-END USER FLOWS

### Flow 1: New User Registration → First Trade → Referrer Earns
1. [ ] User A generates referral link
2. [ ] User B signs up with User A's referral code
3. [ ] Verify User B has referrer_id set to User A
4. [ ] User B deposits £100
5. [ ] User B swaps £100 GBP for BTC
6. [ ] Verify 1.5% swap fee = £1.50
7. [ ] Verify User A receives 20% of £1.50 = £0.30 (standard tier)
8. [ ] Verify admin receives £1.20
9. [ ] Check User A's referral dashboard shows £0.30 earned
10. [ ] Check Business Dashboard shows £1.50 revenue
11. [ ] Screenshot proof of entire flow

### Flow 2: VIP Upgrade → Higher Referrals
1. [ ] User A purchases VIP for £150
2. [ ] Verify tier upgraded to "vip"
3. [ ] User C signs up with User A's code
4. [ ] User C makes £200 instant buy
5. [ ] Verify 3% fee = £6.00
6. [ ] Verify User A (VIP) receives 20% of £6.00 = £1.20
7. [ ] Verify admin receives £4.80
8. [ ] Screenshot proof

### Flow 3: Golden Tier Maximum Earnings
1. [ ] Admin upgrades User A to golden tier
2. [ ] User D signs up with User A's code
3. [ ] User D makes £500 P2P trade
4. [ ] Verify 1% taker fee = £5.00
5. [ ] Verify User A (golden) receives 50% of £5.00 = £2.50
6. [ ] Verify admin receives £2.50
7. [ ] Screenshot proof

### Flow 4: Multiple Fees in One Transaction
1. [ ] User withdraws £100 BTC (crypto)
2. [ ] Verify withdrawal fee 1% = £1.00
3. [ ] Verify network fee 1% = £1.00
4. [ ] Total fee = £2.00
5. [ ] If user has referrer:
   - Referrer gets commission on combined fee
   - Admin gets remainder
6. [ ] Verify both fees logged separately in fee_transactions
7. [ ] Verify Business Dashboard shows both fees
8. [ ] Screenshot proof

### Flow 5: Admin Liquidity Purchase
1. [ ] User buys BTC from admin liquidity
2. [ ] Verify market price vs sell price
3. [ ] Calculate spread profit
4. [ ] Verify spread profit logged as admin_liquidity_spread_profit
5. [ ] Verify instant buy fee also logged
6. [ ] If user has referrer, verify commission on both
7. [ ] Check Business Dashboard shows both revenues
8. [ ] Screenshot proof

---

## ⚙️ FEE EDITING TEST

### Test Instant Fee Update
1. [ ] Note current swap_fee_percent (e.g., 1.5%)
2. [ ] From Business Dashboard, edit swap fee to 2.0%
3. [ ] Immediately make a swap transaction
4. [ ] Verify 2.0% fee is applied (not 1.5%)
5. [ ] Verify fee_transactions log shows 2.0%
6. [ ] Change back to 1.5%
7. [ ] Make another swap
8. [ ] Verify 1.5% fee applied
9. [ ] Screenshot proof of:
   - Editing fee in dashboard
   - Transaction with new fee
   - Transaction with reverted fee

---

## 📊 DATABASE VERIFICATION

### Check fee_transactions Collection
```javascript
db.fee_transactions.find().sort({timestamp: -1}).limit(20)
```
- [ ] All 18 fee types appear in collection
- [ ] Each transaction has:
  - transaction_id
  - user_id
  - fee_type
  - total_fee
  - admin_fee
  - referrer_commission
  - referrer_id (if applicable)
  - timestamp
- [ ] Sum of admin_fee matches Business Dashboard revenue
- [ ] Screenshot of database query results

### Check user_accounts Collection
```javascript
db.user_accounts.find({referrer_id: {$exists: true}})
```
- [ ] Referred users have referrer_id set
- [ ] Referral tiers are correct (standard/vip/golden)
- [ ] VIP users have vip_purchased_at timestamp
- [ ] Screenshot proof

### Check referral_commissions Collection
```javascript
db.referral_commissions.find().sort({timestamp: -1})
```
- [ ] All commissions logged
- [ ] Commission amounts match expected percentages
- [ ] Screenshot proof

---

## ✅ FINAL VERIFICATION CHECKLIST

### All 18 Fees Operational
- [ ] Every fee type tested end-to-end
- [ ] Every fee correctly deducts from user
- [ ] Every fee splits between admin and referrer correctly
- [ ] Every fee logs to fee_transactions
- [ ] Every fee appears in Business Dashboard
- [ ] Screenshot proof for all 18 fees

### Referral System Complete
- [ ] 3 tiers working (standard, vip, golden)
- [ ] Commission percentages correct (20%, 20%, 50%)
- [ ] VIP purchase flow working (£150)
- [ ] Admin can manually assign golden tier
- [ ] All commissions paid instantly to wallet
- [ ] Referral dashboard shows accurate data
- [ ] Screenshot proof for all 3 tiers

### Business Dashboard Accurate
- [ ] Shows real-time data only
- [ ] No placeholder or hard-coded values
- [ ] All 18 fees editable
- [ ] Fee changes take effect immediately
- [ ] Revenue totals accurate
- [ ] All time periods work (DAY/WEEK/MONTH/ALL)
- [ ] Screenshot proof

### Documentation Updated
- [ ] Admin guide includes all 18 fees
- [ ] User guide explains 3 referral tiers
- [ ] Fee structure chart updated
- [ ] VIP purchase process documented
- [ ] Test credentials list updated

---

## 📸 SCREENSHOT REQUIREMENTS

For EACH of the 18 fee types, provide:
1. User performing action (before)
2. Transaction confirmation showing fee % and amounts
3. User balance after (showing deduction)
4. fee_transactions database entry
5. Business Dashboard showing the revenue
6. Referrer's wallet (if applicable) showing commission

Total screenshots needed: **~108 screenshots** (18 fees × 6 screenshots each)

---

**Status:** Testing in progress  
**Started:** 2025-11-30  
**Expected Completion:** TBD
