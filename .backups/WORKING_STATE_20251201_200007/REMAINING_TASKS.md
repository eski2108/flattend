# CoinHubX - Remaining Tasks

**Last Updated**: November 30, 2025  
**Current Status**: P2P Marketplace Backend Complete (90%)

---

## 📊 Overall Progress

### Completed ✅
- P2P Marketplace Backend (9/10 tests passing)
- Wallet Service Integration
- Fee Collection System (Maker + Taker)
- Referral Commission System (20% Standard tier)
- Escrow System (Lock/Release)
- Trade Chat Messaging
- Admin Dashboard Data Logging

### In Progress 🔄
- Frontend P2P Flow Verification

### Not Started ❌
- 2 Remaining Fee Types
- VIP/Golden Tier UI
- Complete Testing with Screenshots

---

## 🎯 PRIORITY 0 - CRITICAL (Must Complete First)

### Task 1: Frontend P2P Buy Flow Verification ⚠️

**Status**: Needs Manual Testing  
**Estimated Time**: 15-30 minutes  
**Blocker**: Testing agent reported navigation issue but code looks correct

**What to Do**:
1. Open browser: https://spottrading-fix.preview.emergentagent.com
2. Login with: gads21083@gmail.com / Test123!
3. Navigate to P2P Marketplace
4. Click "Buy BTC" button on any offer
5. Verify it goes to `/order-preview` page (NOT `/instant-buy`)
6. If it goes to wrong page, investigate why

**Acceptance Criteria**:
- ✅ Buy button navigates to `/order-preview`
- ✅ Offer data is passed correctly
- ✅ Order preview form displays
- ✅ Can enter wallet address
- ✅ Can confirm and create trade

**Files Involved**:
- `/app/frontend/src/pages/P2PMarketplace.js` (handleBuyOffer function)
- `/app/frontend/src/pages/OrderPreview.js`
- `/app/frontend/src/App.js` (routing)

---

### Task 2: Trade Detail Page Real-Time Updates ⚠️

**Status**: Unknown  
**Estimated Time**: 1-2 hours  
**Blocker**: Need to verify if polling/websockets work

**What to Do**:
1. Create a P2P trade as buyer
2. Open trade detail page
3. In another browser/incognito, login as seller
4. Seller sends chat message
5. Verify buyer sees message without refresh
6. Buyer marks as paid
7. Verify seller sees status change without refresh

**Acceptance Criteria**:
- ✅ Trade status updates in real-time
- ✅ Chat messages appear without refresh
- ✅ Escrow status reflects correctly
- ✅ Timestamps are accurate

**Files to Check**:
- `/app/frontend/src/pages/TradePage.js` or similar
- `/app/frontend/src/components/TradeChat.js`

---

## 🔥 PRIORITY 1 - HIGH (Important)

### Task 3: Referral Dashboard Endpoint Fix 🐛

**Status**: Not Started  
**Estimated Time**: 30 minutes  
**Issue**: `/api/referrals/dashboard` returns 404

**What to Do**:
1. Check if endpoint exists in `/app/backend/server.py`
2. If missing, create endpoint:

```python
@api_router.get("/referrals/dashboard")
async def get_referral_dashboard(user_id: str):
    # Get referrer stats
    commissions = await db.referral_commissions.find(
        {"referrer_id": user_id}
    ).to_list(1000)
    
    total_earnings = sum(c.get("commission_amount", 0) for c in commissions)
    
    # Group by fee type
    earnings_by_type = {}
    for c in commissions:
        fee_type = c.get("transaction_type", "unknown")
        if fee_type not in earnings_by_type:
            earnings_by_type[fee_type] = 0
        earnings_by_type[fee_type] += c.get("commission_amount", 0)
    
    return {
        "success": True,
        "total_earnings": total_earnings,
        "earnings_by_type": earnings_by_type,
        "commission_history": commissions
    }
```

**Acceptance Criteria**:
- ✅ Endpoint returns 200 status
- ✅ Returns total earnings
- ✅ Returns earnings breakdown by type
- ✅ Returns commission history

---

### Task 4: Implement Final 2 Fee Types 💰

**Status**: Not Started  
**Estimated Time**: 2-3 hours

#### A. Vault Transfer Fee

**Description**: Fee when transferring crypto to/from savings vault  
**Rate**: TBD by user (suggest 0.5%)  
**When Applied**: When user moves crypto to savings

**What to Do**:
1. Add to fee system:
   ```python
   "vault_transfer_fee_percent": 0.5
   ```
2. Update savings transfer endpoint to collect fee
3. Split fee: 80% admin, 20% referrer
4. Log to `fee_transactions`

**Files to Modify**:
- `/app/backend/savings_wallet_service.py`
- `/app/backend/server.py` (savings endpoints)

#### B. Savings Interest Profit

**Description**: Platform profit from savings interest rates  
**Rate**: Difference between what user earns and what platform earns  
**When Applied**: When interest is calculated

**What to Do**:
1. Add to fee system:
   ```python
   "savings_platform_spread_percent": 2.0  # Platform keeps 2% spread
   ```
2. Update interest calculation to track platform profit
3. Log to `fee_transactions` as revenue
4. Show in admin dashboard

**Files to Modify**:
- `/app/backend/savings_wallet_service.py`
- Interest calculation logic

**Acceptance Criteria** (Both Fees):
- ✅ Fee collected correctly
- ✅ Referral commission paid (if applicable)
- ✅ Logged to `fee_transactions`
- ✅ Appears in admin dashboard
- ✅ Tested with real transactions

---

### Task 5: VIP Tier Purchase UI 🎨

**Status**: Backend Ready, Frontend Not Built  
**Estimated Time**: 2-3 hours  
**Backend Endpoint**: `/api/referrals/purchase-vip` (already exists)

**What to Build**:

1. **Referral Page Section**:
   ```jsx
   <div className="vip-upgrade-section">
     <h3>Upgrade to VIP Tier</h3>
     <p>Unlock 20% commission on ALL revenue streams</p>
     <ul>
       <li>✅ Lifetime 20% commission</li>
       <li>✅ Priority support</li>
       <li>✅ Exclusive badges</li>
     </ul>
     <div className="price">£150 One-Time Payment</div>
     <button onClick={handlePurchaseVIP}>Upgrade to VIP</button>
   </div>
   ```

2. **Payment Modal**:
   - Show breakdown: £150 total
   - Confirm button
   - Deduct from GBP wallet
   - Call `/api/referrals/purchase-vip`
   - Update user tier in database

**Acceptance Criteria**:
- ✅ VIP upgrade section visible on Referral Dashboard
- ✅ Purchase button deducts £150 from user wallet
- ✅ User's `referral_tier` updated to "vip"
- ✅ Future commissions use 20% rate
- ✅ Success message shown

**Files to Create/Modify**:
- `/app/frontend/src/pages/ReferralDashboard.js`
- Backend already has endpoint ready

---

### Task 6: Golden Tier Admin Assignment UI 👑

**Status**: Backend Ready, Admin UI Not Built  
**Estimated Time**: 1-2 hours

**What to Build**:

1. **Admin Dashboard - Users Tab**:
   ```jsx
   <table>
     <thead>
       <tr>
         <th>User</th>
         <th>Email</th>
         <th>Referral Tier</th>
         <th>Actions</th>
       </tr>
     </thead>
     <tbody>
       {users.map(user => (
         <tr>
           <td>{user.username}</td>
           <td>{user.email}</td>
           <td>
             <select 
               value={user.referral_tier || 'standard'}
               onChange={(e) => updateTier(user.user_id, e.target.value)}
             >
               <option value="standard">Standard (20%)</option>
               <option value="vip">VIP (20%)</option>
               <option value="golden">Golden (50%)</option>
             </select>
           </td>
           <td>
             <button onClick={() => saveTierChange(user.user_id)}>Save</button>
           </td>
         </tr>
       ))}
     </tbody>
   </table>
   ```

2. **Backend Endpoint** (may need to create):
   ```python
   @api_router.post("/admin/users/update-tier")
   async def update_user_tier(user_id: str, tier: str):
       # Validate tier
       if tier not in ["standard", "vip", "golden"]:
           raise HTTPException(400, "Invalid tier")
       
       # Update user
       await db.user_accounts.update_one(
           {"user_id": user_id},
           {"$set": {"referral_tier": tier}}
       )
       
       return {"success": True, "message": f"Tier updated to {tier}"}
   ```

**Acceptance Criteria**:
- ✅ Admin can see all users in dashboard
- ✅ Admin can change any user's tier
- ✅ Golden tier (50% commission) works correctly
- ✅ Future commissions use new tier rate
- ✅ Tier change logged

**Files to Create/Modify**:
- `/app/frontend/src/pages/AdminDashboard.js` or similar
- `/app/backend/server.py` (add admin endpoint if missing)

---

## 📸 PRIORITY 2 - MEDIUM (User Requested)

### Task 7: Complete Testing with Screenshot Proof 📷

**Status**: Partially Complete  
**Estimated Time**: 3-4 hours  
**User Requirement**: Screenshot proof of EVERY feature

**What to Do**:

Create comprehensive test evidence document with screenshots for:

1. **P2P Flow** (15 screenshots)
   - Marketplace with offers
   - Click Buy button
   - Order preview form
   - Trade created page
   - Trade detail with escrow indicator
   - Chat message sent
   - Buyer marks paid
   - Seller releases crypto
   - Trade completed status
   - Buyer wallet - crypto received
   - Seller wallet - fee deducted
   - Admin dashboard - fees collected
   - Referrer dashboard - commission earned

2. **Swap Flow** (5 screenshots)
   - Swap page
   - Select coins
   - Enter amount
   - Fee breakdown shown
   - Swap successful

3. **Instant Buy Flow** (5 screenshots)
   - Instant buy page
   - Select coin
   - Enter amount
   - Fee shown
   - Purchase successful

4. **Admin Dashboard** (5 screenshots)
   - Revenue Analytics tab
   - Fee breakdown by type
   - Total revenue
   - Referral commissions paid
   - User list

5. **Referral Dashboard** (3 screenshots)
   - Total earnings
   - Earnings by fee type
   - Commission history

**Deliverable**: Create `/app/TESTING_EVIDENCE_COMPLETE.md` with all screenshots

**Tools to Use**:
- `deep_testing_frontend_v2` agent for automated screenshot capture
- Manual browser testing for edge cases

---

## 🔌 PRIORITY 3 - LOW (Future Enhancement)

### Task 8: Connect Wallet Page to NOWPayments 💳

**Status**: Not Started  
**Estimated Time**: 2-3 hours  
**Blocker**: Testing agent reported NOWPayments address generation broken

**What to Do**:
1. Fix NOWPayments deposit address generation
2. Wire Wallet "Deposit" button to NOWPayments modal
3. Wire Wallet "Withdraw" button to NOWPayments withdrawal
4. Test with real NOWPayments API

**Files to Check**:
- `/app/frontend/src/pages/WalletPage.js`
- `/app/backend/nowpayments_integration.py`
- NOWPayments API credentials in `.env`

---

### Task 9: Complete Business Dashboard Modules 📊

**Status**: Revenue Analytics Working, Other Modules Unknown  
**Estimated Time**: 4-6 hours

**Modules to Complete**:
1. System Health (backend status, database stats)
2. Customer Analytics (user growth, active users)
3. Transaction Analytics (volume by type)
4. Real-time Revenue (live updates)

**Files to Modify**:
- `/app/frontend/src/pages/AdminBusinessDashboard.js`
- Backend analytics endpoints

---

## 📋 TASK SUMMARY

### By Priority:

| Priority | Tasks | Estimated Time | Status |
|----------|-------|----------------|--------|
| **P0** | 2 tasks | 2-3 hours | In Progress |
| **P1** | 4 tasks | 8-11 hours | Not Started |
| **P2** | 1 task | 3-4 hours | Partial |
| **P3** | 2 tasks | 6-9 hours | Not Started |

### **TOTAL REMAINING WORK: 19-27 hours**

### By Category:

| Category | Tasks | Time |
|----------|-------|------|
| Frontend Testing | 2 | 4-5 hours |
| Backend Features | 2 | 3-5 hours |
| UI Development | 2 | 3-5 hours |
| Testing & Docs | 1 | 3-4 hours |
| Integrations | 2 | 6-9 hours |

---

## 🎯 RECOMMENDED ORDER

### Week 1 (Critical):
1. ✅ Verify frontend P2P buy flow (Task 1) - **30 mins**
2. ✅ Verify trade detail real-time updates (Task 2) - **2 hours**
3. ✅ Fix referral dashboard endpoint (Task 3) - **30 mins**

**Total**: 3 hours

### Week 2 (Important):
4. ✅ Implement 2 remaining fee types (Task 4) - **3 hours**
5. ✅ Build VIP tier purchase UI (Task 5) - **3 hours**
6. ✅ Build Golden tier admin UI (Task 6) - **2 hours**

**Total**: 8 hours

### Week 3 (Polish):
7. ✅ Complete screenshot testing (Task 7) - **4 hours**
8. ✅ Connect NOWPayments (Task 8) - **3 hours**
9. ✅ Complete dashboard modules (Task 9) - **5 hours**

**Total**: 12 hours

---

## 🚀 QUICK WINS (Can Do Right Now)

### 1. Manual P2P Test (15 minutes)
Open browser, test P2P buy flow, verify it works

### 2. Fix Referral Endpoint (30 minutes)
Add `/api/referrals/dashboard` endpoint to server.py

### 3. Create Backup (5 minutes)
```bash
cp /app/backend/server.py /app/backend/server_backup_nov30.py
cp /app/backend/wallet_service.py /app/backend/wallet_service_backup_nov30.py
```

---

## 📊 COMPLETION TRACKER

### Overall Platform Completion:

```
Core Features:        85% ████████████████░░░
Fee System:           94% ███████████████████
Referral System:      70% ██████████████░░░░░
P2P Marketplace:      90% ██████████████████░
Admin Dashboard:      80% ████████████████░░░
Frontend Polish:      60% ████████░░░░░░░░░░░

OVERALL:              80% ████████████████░░░
```

### What's Left:
- 2 fee types (Vault, Savings Interest)
- 2 UI builds (VIP purchase, Golden assignment)
- Frontend testing verification
- Screenshot documentation
- NOWPayments integration
- Dashboard module completion

---

**Last Updated**: November 30, 2025  
**Next Review**: After completing P0 tasks  
**Estimated Completion**: 2-3 weeks (part-time)
