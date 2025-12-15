# CoinHubX - Quick Testing Guide

**For**: Manual testing of all new features  
**Time Required**: 30-45 minutes

---

## 📝 **Test Credentials**

### Admin:
```
Email: admin@coinhubx.com
Password: Admin@12345
```

### Test Users:
Create new users during testing or use existing test accounts.

---

## ✅ **Test Checklist**

### 1. P2P Notification System (15 mins)

**Test Flow**:
1. Open browser: `https://neon-finance-5.preview.emergentagent.com`
2. Register 2 new users: Seller & Buyer
3. Login as Seller
4. Navigate to P2P Marketplace
5. ✅ **CHECK**: Notification bell icon visible in header
6. Create a sell offer (0.1 BTC @ £50k)
7. ✅ **CHECK**: No notifications yet (offer just created)
8. Logout, login as Buyer
9. Navigate to P2P Marketplace
10. Click "Buy" on seller's offer
11. Enter amount: 0.01 BTC
12. Click "Create Trade"
13. ✅ **CHECK**: Bell icon shows unread count (red badge with "2")
14. Click bell icon
15. ✅ **CHECK**: See 2 notifications:
    - "Trade Created Successfully"
    - "Escrow Locked - Safe to Pay"
16. Click on a notification
17. ✅ **CHECK**: Notification marked as read (badge count decreases)
18. Navigate to trade detail page
19. ✅ **CHECK**: Bell icon visible on trade page
20. Send a chat message: "Payment sent"
21. Logout, login as Seller
22. Navigate to the same trade
23. ✅ **CHECK**: Bell shows unread count
24. Click bell
25. ✅ **CHECK**: See "New Message from Buyer" notification
26. Click "Mark all as read"
27. ✅ **CHECK**: All notifications marked as read

**Expected Result**: All 11 notification types work correctly with real-time updates

---

### 2. VIP Tier Upgrade (5 mins)

**Test Flow**:
1. Login with any user account
2. Navigate to `/referrals` or Referral Dashboard
3. ✅ **CHECK**: See "Upgrade to VIP Tier" section (only if current tier is Standard)
4. ✅ **CHECK**: See £150 price display
5. ✅ **CHECK**: See 4 benefit cards (Commission, Support, Badge, Analytics)
6. ✅ **CHECK**: See "Upgrade to VIP Now" button
7. (Optional) Fund user's GBP wallet with £200 for testing
8. Click "Upgrade to VIP Now"
9. ✅ **CHECK**: Success toast appears: "🎉 Upgraded to VIP!"
10. ✅ **CHECK**: VIP upgrade section disappears
11. ✅ **CHECK**: User's tier badge shows "VIP"
12. ✅ **CHECK**: GBP wallet balance decreased by £150

**Expected Result**: User upgrades to VIP tier, £150 deducted, tier badge updated

---

### 3. Golden Tier Admin Assignment (5 mins)

**Test Flow**:
1. Login as admin: `admin@coinhubx.com` / `Admin@12345`
2. Navigate to `/admin/users`
3. ✅ **CHECK**: See "Users Management" page
4. ✅ **CHECK**: See stats cards (Total Users, Standard, VIP, Golden)
5. ✅ **CHECK**: See search bar
6. ✅ **CHECK**: See tier filter dropdown
7. ✅ **CHECK**: See users table with columns: User, Email, Joined, Current Tier, Change Tier
8. Find any user in the table
9. Click tier dropdown for that user
10. ✅ **CHECK**: See 3 options: Standard (20%), VIP (20%), Golden (50%)
11. Select "Golden (50%)"
12. ✅ **CHECK**: Confirmation dialog appears
13. Click "OK" to confirm
14. ✅ **CHECK**: Success toast: "User tier updated to GOLDEN!"
15. ✅ **CHECK**: User's tier badge changes to golden color with "Golden (50%)"
16. ✅ **CHECK**: Stats card "Golden Tier" count increases by 1

**Expected Result**: Admin successfully assigns Golden tier, user's commission rate becomes 50%

---

### 4. Fee System Verification (10 mins)

**Test Flow**:
1. Complete a P2P trade from start to finish
2. Navigate to Admin Dashboard (`/admin/business`)
3. Click "Revenue Analytics" tab
4. ✅ **CHECK**: See P2P Taker Fee in fee breakdown
5. ✅ **CHECK**: See P2P Maker Fee in fee breakdown
6. ✅ **CHECK**: Total fees amount is correct
7. ✅ **CHECK**: Admin fee (80%) + Referrer commission (20%) = Total fee
8. Navigate to `/admin/fees`
9. ✅ **CHECK**: See all 18 fee types listed
10. ✅ **CHECK**: See "Vault Transfer Fee" = 0.5%
11. ✅ **CHECK**: See "Savings Interest Profit" = 2.0%
12. Try editing a fee (e.g., change P2P Maker Fee to 1.5%)
13. Save changes
14. ✅ **CHECK**: Success message appears
15. Create a new P2P trade
16. ✅ **CHECK**: New fee rate (1.5%) is applied
17. Change fee back to 1% for consistency

**Expected Result**: All 18 fees visible, editable, and correctly applied to transactions

---

### 5. Referral Commission Verification (10 mins)

**Test Flow**:

**Setup**:
1. Register User A (Referrer)
2. Register User B (Seller) using User A's referral code
3. Verify User B's `referrer_id` is set to User A's `user_id` in database

**Test**:
1. Login as User B (Seller)
2. Fund wallet with 1 BTC
3. Create P2P sell offer
4. Login as Buyer (different user)
5. Create trade, mark paid, complete trade
6. ✅ **CHECK**: Maker fee deducted from User B
7. Logout, login as User A (Referrer)
8. Navigate to Referral Dashboard
9. ✅ **CHECK**: See commission earnings increased
10. ✅ **CHECK**: See commission history entry for this trade
11. ✅ **CHECK**: Commission amount = 20% of maker fee (Standard tier)
12. Navigate to Wallet
13. ✅ **CHECK**: BTC balance increased by commission amount

**Test Golden Tier**:
14. Login as admin
15. Navigate to `/admin/users`
16. Assign User A to Golden tier
17. Complete another P2P trade with User B as seller
18. ✅ **CHECK**: User A receives 50% commission (not 20%)

**Expected Result**: Referrers receive correct commission based on their tier

---

## 📸 **Screenshot Checklist**

Take screenshots of:
1. ✅ Notification bell with unread badge
2. ✅ Notification dropdown with messages
3. ✅ VIP upgrade section
4. ✅ Admin users management page
5. ✅ Tier assignment in action
6. ✅ Admin revenue dashboard with all fees
7. ✅ Referral dashboard with commission breakdown
8. ✅ Completed P2P trade with all status changes
9. ✅ Fee transactions in admin dashboard
10. ✅ Referral commission in wallet

---

## 🐛 **Known Issues to Watch For**

### Potential Issues:
1. **Notification polling delay**: 10-second delay is normal
2. **Browser cache**: If notifications don't appear, hard refresh (Ctrl+Shift+R)
3. **Wallet balance**: Ensure users have sufficient balance before testing
4. **Payment timer**: P2P trades expire after 120 minutes by default
5. **OTP verification**: Seller needs OTP for releasing crypto

### If Something Doesn't Work:
1. Check browser console for errors (F12)
2. Check backend logs: `tail -100 /var/log/supervisor/backend.err.log`
3. Verify services running: `sudo supervisorctl status`
4. Clear browser cache and retry
5. Check MongoDB connection

---

## ✅ **Quick Smoke Test (5 mins)**

If short on time, test these critical flows:

1. ✅ P2P Marketplace loads
2. ✅ Notification bell visible
3. ✅ Create one P2P trade
4. ✅ Notifications appear (at least 2)
5. ✅ Admin users page loads
6. ✅ VIP upgrade section visible on referral dashboard
7. ✅ Admin dashboard shows fees

**If all 7 pass**: Platform is working correctly!

---

## 📊 **Success Criteria**

### Must Pass:
- ✅ All notification types trigger correctly
- ✅ VIP upgrade deducts £150 and updates tier
- ✅ Golden tier assignment works
- ✅ All 18 fees apply correctly
- ✅ Referral commissions pay instantly
- ✅ Admin dashboard shows revenue

### Nice to Have:
- ✅ No console errors
- ✅ Fast page load times (<2s)
- ✅ Smooth animations
- ✅ Responsive design works on mobile

---

## 🛠️ **Troubleshooting**

### Notifications Not Appearing:
```bash
# Check if notification service is initialized
grep "P2P Notification Service initialized" /var/log/supervisor/backend.err.log

# Check if notifications are being created
cd /app && python3 -c "from motor.motor_asyncio import AsyncIOMotorClient; import asyncio; async def check(): client = AsyncIOMotorClient('mongodb://localhost:27017'); db = client['coinhubx']; count = await db.p2p_notifications.count_documents({}); print(f'Notifications in DB: {count}'); asyncio.run(check())"
```

### VIP Upgrade Fails:
```bash
# Check if endpoint exists
curl https://neon-finance-5.preview.emergentagent.com/api/referrals/purchase-vip

# Check user's GBP balance
# Login to MongoDB and query: db.wallets.findOne({user_id: "USER_ID", currency: "GBP"})
```

### Admin Page 404:
```bash
# Verify route is added in App.js
grep "admin/users" /app/frontend/src/App.js

# Restart frontend
sudo supervisorctl restart frontend
```

---

## 📝 **Test Report Template**

After testing, fill out:

```
TEST REPORT
Date: [DATE]
Tester: [YOUR NAME]
Environment: Production Preview

Notification System: [ PASS / FAIL ]
VIP Upgrade: [ PASS / FAIL ]
Golden Tier Assignment: [ PASS / FAIL ]
Fee System: [ PASS / FAIL ]
Referral Commissions: [ PASS / FAIL ]

Issues Found:
1. [ISSUE 1]
2. [ISSUE 2]

Screenshots: [ ATTACHED / NOT ATTACHED ]

Overall Status: [ READY FOR PRODUCTION / NEEDS FIXES ]
```

---

**Testing Time**: 30-45 minutes  
**Critical Tests**: 5 tests  
**Optional Tests**: Screenshots + smoke test

**Good luck with testing!** 🚀
