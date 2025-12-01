# 📘 CoinHubX Admin Guide - Complete Reference

**Version:** 1.0  
**Last Updated:** 2025-11-30  
**Platform:** CoinHubX Cryptocurrency Exchange

---

## 📑 Table of Contents

1. [Admin Access & Login](#admin-access--login)
2. [Business Dashboard Overview](#business-dashboard-overview)
3. [Fee Management](#fee-management)
4. [Revenue Analytics](#revenue-analytics)
5. [User Management](#user-management)
6. [Withdrawal Approvals](#withdrawal-approvals)
7. [Referral System Management](#referral-system-management)
8. [Platform Settings](#platform-settings)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## 🔐 Admin Access & Login

### Admin Credentials

```
Email:      admin@coinhubx.com
Password:   Admin@12345
Admin Code: CRYPTOLEND_ADMIN_2025
```

### Login Process

1. Navigate to: `https://your-domain.com/admin/login`
2. Enter admin email
3. Enter admin password
4. Enter admin access code
5. Click "Access Dashboard"

### Security Best Practices

- ✅ Change default admin password immediately
- ✅ Store admin code securely (password manager)
- ✅ Enable 2FA (when implemented)
- ✅ Use strong, unique password
- ✅ Never share admin credentials
- ✅ Log out after each session

---

## 💼 Business Dashboard Overview

### Accessing the Dashboard

**URL:** `/admin/business`

### Dashboard Tabs

1. **Fee Management** - Configure all 18 platform fees
2. **Revenue Analytics** - View income by time period
3. **Customers** - User analytics and management
4. **Referrals** - Referral program tracking
5. **Liquidity** - Liquidity management (future)
6. **System Health** - Platform monitoring (future)

---

## 💰 Fee Management

### Overview

The Fee Management tab allows you to edit all 18 platform fees in real-time. Changes take effect immediately.

### Available Fees

#### P2P Trading Fees

| Fee Type | Default | Description |
|----------|---------|-------------|
| **P2P Maker Fee** | 1.0% | Charged to seller when crypto is released |
| **P2P Taker Fee** | 1.0% | Charged to buyer when marking as paid |
| **P2P Express Fee** | 2.0% | Additional fee for express auto-matching |

#### Swap & Instant Trading

| Fee Type | Default | Description |
|----------|---------|-------------|
| **Swap Fee** | 1.5% | Currency exchange transactions |
| **Instant Buy Fee** | 3.0% | Instant crypto purchase |
| **Instant Sell Fee** | 2.0% | Instant crypto sale |

#### Withdrawal Fees

| Fee Type | Default | Description |
|----------|---------|-------------|
| **Crypto Withdrawal Fee** | 1.0% | Base withdrawal fee |
| **Network Withdrawal Fee** | 1.0% | Covers blockchain gas costs |
| **Fiat Withdrawal Fee** | 1.0% | Bank transfer withdrawals |

#### Savings/Staking

| Fee Type | Default | Description |
|----------|---------|-------------|
| **Savings Stake Fee** | 0.5% | Depositing to savings |
| **Early Unstake Penalty** | 3.0% | Withdrawing before maturity |

#### Other Fees

| Fee Type | Default | Description |
|----------|---------|-------------|
| **Trading Fee** | 0.1% | Futures/margin trading |
| **Dispute Fee** | £2 or 1% | P2P dispute resolution |
| **Cross-Wallet Transfer** | 0.25% | Between user wallets |
| **Deposit Fee** | 0.0% | Free deposits (logging only) |
| **Vault Transfer Fee** | 0.5% | Main ↔ Vault transfers |

### How to Edit Fees

1. Navigate to **Business Dashboard** → **Fee Management**
2. Locate the fee you want to modify
3. Click the **pencil icon** next to the fee
4. Enter new percentage (e.g., `1.5` for 1.5%)
5. Click **Save** or press Enter
6. Fee is updated immediately

### Fee Recommendations

**Competitive Ranges:**
- P2P Fees: 0.5% - 2.0%
- Swap Fee: 0.5% - 2.0%
- Withdrawal: 0.5% - 2.0%
- Instant Buy: 2.0% - 5.0%

**Important Notes:**
- Lower fees = more users, less revenue
- Higher fees = fewer users, more revenue per transaction
- Monitor competitor pricing
- Test changes gradually

---

## 📊 Revenue Analytics

### Overview

The Revenue Analytics tab shows platform income from all fee types.

### Time Periods

- **DAY** - Last 24 hours
- **WEEK** - Last 7 days
- **MONTH** - Last 30 days
- **ALL** - All-time total

### Revenue Breakdown

View revenue by specific fee type:
- Swap fees
- P2P fees
- Withdrawal fees
- Trading fees
- etc.

### Charts & Graphs

**Line Graph:**
- Shows revenue trends over time
- Hover for specific day amounts
- Identify peak trading periods

**Fee Type Breakdown:**
- Pie chart showing revenue by fee type
- Identify most profitable features
- Optimize platform focus

### Export Data (Future)

- CSV export for accounting
- PDF reports for investors
- Integration with accounting software

---

## 👥 User Management

### Accessing User Data

**URL:** `/admin/business` → **Customers** tab

### User Statistics

- Total registered users
- Active users (last 30 days)
- New registrations (today/week/month)
- KYC verification status
- Trading volume per user

### User Actions

**View User Details:**
```
- User ID
- Email
- Registration date
- Wallet balances
- Transaction history
- Referral tier (Standard/Golden)
- Total fees paid
- Referred by
```

**User Management Actions:**
- View full transaction history
- Check wallet balances
- Review P2P trades
- Suspend/Ban user
- Upgrade referral tier (Standard → Golden)
- Reset password (if requested)

---

## ✅ Withdrawal Approvals

### Overview

All crypto and fiat withdrawals require admin approval for security.

### Accessing Withdrawal Requests

**URL:** `/admin/withdrawals`

### Withdrawal Details

 Each request shows:
```
- User ID & Email
- Currency
- Amount requested
- Withdrawal fee
- Network fee (if crypto)
- Fiat fee (if fiat)
- Total deducted from user
- Net amount to send
- Wallet address/Bank details
- Request timestamp
- Status (Pending/Approved/Rejected)
```

### Approval Process

**For Crypto Withdrawals:**
1. Verify wallet address is valid
2. Check network matches currency (e.g., BTC on Bitcoin network)
3. Confirm user has sufficient balance (already locked)
4. Check for suspicious activity
5. Click **Approve**
6. Manually process transaction via exchange/wallet
7. Enter transaction hash
8. Mark as **Completed**

**For Fiat Withdrawals:**
1. Verify bank account details
2. Confirm KYC/AML compliance
3. Check user balance (already locked)
4. Click **Approve**
5. Process bank transfer manually
6. Mark as **Completed**

### Rejection Process

1. Select withdrawal request
2. Click **Reject**
3. Enter rejection reason
4. Confirm rejection
5. Locked balance is automatically released to user

### Security Flags

⚠️ **Reject if:**
- Suspicious wallet address
- User account recently created
- Large amount (manual review)
- Multiple failed attempts
- Mismatched network/currency

---

## 🎁 Referral System Management

### Overview

The referral system has 2 tiers:
- **Standard:** 20% commission
- **Golden:** 50% commission

### Viewing Referral Data

**URL:** `/admin/business` → **Referrals** tab

### Referral Statistics

- Total active referrers
- Total referred users
- Total commission paid
- Top referrers (by earnings)
- Conversion rate (sign-ups → active traders)

### Upgrading Users to Golden Tier

**Criteria for Golden Tier:**
- Referred 50+ users
- Referred users have high trading volume
- Exceptional promotional efforts
- Partnership agreements

**How to Upgrade:**
1. Navigate to user details
2. Find "Referral Tier" field
3. Change from "Standard" to "Golden"
4. Save changes
5. User immediately earns 50% on all future referral fees

### Commission Payouts

**Automatic:**
- Commissions are paid instantly to referrer's wallet
- No manual processing needed
- Fully automated

**Tracking:**
- All commissions logged in `referral_commissions` collection
- View in user transaction history
- Included in revenue analytics

---

## ⚙️ Platform Settings

### Global Settings

**Maintenance Mode:**
- Enable during updates
- Displays "Under Maintenance" message
- Only admins can access

**Trading Limits:**
- Minimum deposit amount
- Minimum withdrawal amount
- Maximum daily withdrawal
- P2P trade limits

**Verification Requirements:**
- Email verification (required/optional)
- KYC levels (tier 1, 2, 3)
- Withdrawal limits per KYC level

### NOWPayments Integration

**API Keys:**
- Production API key
- Sandbox API key (testing)
- IPN Secret (webhook signature)

**Currencies:**
- Enable/disable specific coins
- Set minimum deposit amounts
- Configure network fees

---

## 🔧 Troubleshooting

### Common Issues

**Revenue Dashboard Shows £0.00**

✅ **Solution:**
- Check database name in `.env`
- Should be: `DB_NAME="coinhubx"`
- Restart backend: `sudo supervisorctl restart backend`

**Fee Changes Not Taking Effect**

✅ **Solution:**
- Clear browser cache
- Hard refresh (Ctrl + Shift + R)
- Check browser console for errors

**Withdrawal Not Processing**

✅ **Solution:**
- Check if balance is locked
- Verify user has sufficient balance
- Check withdrawal_requests collection in DB
- Review backend logs: `tail -n 100 /var/log/supervisor/backend.err.log`

**User Cannot Login**

✅ **Solution:**
- Verify email is correct
- Check if account is suspended
- Reset password if needed
- Check backend authentication logs

### Backend Logs

**View Logs:**
```bash
# Error logs
tail -n 100 /var/log/supervisor/backend.err.log

# Output logs
tail -n 100 /var/log/supervisor/backend.out.log

# Follow live logs
tail -f /var/log/supervisor/backend.err.log
```

### Database Access

**Connect to MongoDB:**
```bash
mongosh
use coinhubx

# View collections
show collections

# Query users
db.user_accounts.find({}).limit(5)

# Query fee transactions
db.fee_transactions.find({}).sort({timestamp: -1}).limit(10)
```

---

## 🔌 API Reference

### Admin Endpoints

#### Get All Fees
```
GET /api/admin/fees/all

Response:
{
  "success": true,
  "fees": {
    "swap_fee_percent": 1.5,
    "instant_buy_fee_percent": 3.0,
    ...
  }
}
```

#### Update Fee
```
POST /api/admin/fees/update

Body:
{
  "fee_key": "swap_fee_percent",
  "new_value": 2.0
}

Response:
{
  "success": true,
  "message": "Fee updated"
}
```

#### Revenue Analytics
```
GET /api/admin/revenue/complete?period=all

Periods: day, week, month, all

Response:
{
  "success": true,
  "revenue": {
    "today": 52.00,
    "week": 68.50,
    "month": 138.50,
    "allTime": 293.50,
    "breakdown": {
      "swap_fee": 24.50,
      "instant_buy_fee": 30.00,
      ...
    }
  }
}
```

#### Approve Withdrawal
```
POST /api/admin/withdrawals/approve

Body:
{
  "withdrawal_id": "abc-123",
  "approved_by": "admin-123",
  "transaction_hash": "0x..."
}
```

#### Reject Withdrawal
```
POST /api/admin/withdrawals/reject

Body:
{
  "withdrawal_id": "abc-123",
  "rejected_by": "admin-123",
  "rejection_reason": "Invalid wallet address"
}
```

---

## 📈 Best Practices

### Daily Tasks

- ✅ Check pending withdrawal requests
- ✅ Review revenue dashboard
- ✅ Monitor for suspicious activity
- ✅ Check system health
- ✅ Respond to support tickets

### Weekly Tasks

- ✅ Review fee performance
- ✅ Analyze user growth
- ✅ Check referral program effectiveness
- ✅ Export financial reports
- ✅ Update platform content

### Monthly Tasks

- ✅ Comprehensive revenue analysis
- ✅ Adjust fees if needed
- ✅ Review top users/traders
- ✅ Plan marketing campaigns
- ✅ System maintenance
- ✅ Backup database

### Security Checklist

- ✅ Regular password changes
- ✅ Monitor for unauthorized access
- ✅ Review large transactions
- ✅ Check for unusual patterns
- ✅ Keep software updated
- ✅ Regular security audits

---

## 🆘 Support & Contact

### Technical Support

**Backend Issues:**
- Check `/var/log/supervisor/backend.err.log`
- Restart backend: `sudo supervisorctl restart backend`

**Frontend Issues:**
- Clear cache and hard refresh
- Check browser console (F12)
- Restart frontend: `sudo supervisorctl restart frontend`

**Database Issues:**
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check connection string in `.env`

### Documentation Files

- `/app/FINAL_COMPREHENSIVE_STATUS.md` - Complete platform status
- `/app/PHASE_2_COMPLETE_FEE_IMPLEMENTATION.md` - Fee system details
- `/app/ADMIN_ACCESS.md` - Admin credentials

---

## 📝 Version History

**v1.0** (2025-11-30)
- Initial admin guide
- 16/18 fees implemented
- Revenue analytics operational
- Referral system complete
- Business dashboard functional

---

**End of Admin Guide**

For additional support, refer to the technical documentation or contact the development team.
