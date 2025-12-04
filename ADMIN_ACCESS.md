# Coin Hub X - Admin Dashboard Access

## 🔐 Admin Login Credentials

**Admin Panel URL:**
```
https://p2p-market-1.preview.emergentagent.com/admin/login
```

**How to Create Your Admin Account:**

1. **First, Register a Regular Account:**
   - Go to: https://p2p-market-1.preview.emergentagent.com/register
   - Use YOUR email (e.g., admin@coinhubx.com)
   - Choose a strong password
   - Complete registration

2. **Then Login as Admin:**
   - Go to: https://p2p-market-1.preview.emergentagent.com/admin/login
   - Enter your email
   - Enter your password
   - **Admin Code:** `CRYPTOLEND_ADMIN_2025`
   - Click "Login as Admin"

## 📊 What You Can See in Admin Dashboard

### Customer Management
- **All Registered Users**
  - Email, name, registration date
  - Verification status (KYC verified or not)
  - Account status (active/blocked)
  
### P2P Trading Overview
- **All P2P Orders**
  - Buy/sell orders from all users
  - Order status (pending, completed, disputed)
  - Trade amounts and currencies
  - Payment methods used

### Dispute Management
- **Active Disputes**
  - View buyer-seller chat history
  - See evidence submitted
  - Manually resolve disputes
  - Release crypto to buyer or seller

### Platform Statistics
- Total users registered
- Total trading volume
- Active orders
- Completed trades
- Revenue from fees

## 🛠️ Admin Actions You Can Take

1. **View User Details**
   - See all user information
   - Check verification status
   - View trading history

2. **Manage Disputes**
   - Read chat between buyer/seller
   - Review evidence
   - Make decisions on who gets the crypto
   - Manually release escrow

3. **Monitor Trades**
   - See all active P2P orders
   - Track completed trades
   - View transaction history

4. **Platform Settings** (Coming in Phase 2)
   - Set trading fees
   - Configure payment methods
   - Set verification limits
   - Manage blocked users

## 📧 Recommended Admin Email

Create an admin account with:
- **Email:** admin@coinhubx.com (or your preferred email)
- **Password:** [Choose a strong password]
- **Admin Code:** CRYPTOLEND_ADMIN_2025

## 🔒 Security Note

**IMPORTANT:** Keep your admin code secure! This is what gives you admin access to the platform.

Current admin code: `CRYPTOLEND_ADMIN_2025`

To change it later, update it in:
- Backend file: `/app/backend/server.py` (line 1549)
- Look for: `ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"`

## 📱 Accessing Admin Panel

**Desktop:** https://p2p-market-1.preview.emergentagent.com/admin/login
**Mobile:** Same URL works on mobile devices

---

## Quick Start Guide

1. Register at: `/register`
2. Use your email + password + admin code at: `/admin/login`
3. Access dashboard at: `/admin/dashboard`
4. Start managing your platform!

**Need Help?** All admin features are accessible from the dashboard once logged in.
