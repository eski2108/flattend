# CoinHubX - Complete User Flow Documentation

This document covers every page and user flow on the CoinHubX platform.

---

## TABLE OF CONTENTS

1. [Public Pages (No Login Required)](#1-public-pages)
2. [Authentication Flow](#2-authentication-flow)
3. [Dashboard & Portfolio](#3-dashboard--portfolio)
4. [Wallet & Balances](#4-wallet--balances)
5. [Savings Vault](#5-savings-vault)
6. [Trading](#6-trading)
7. [P2P Marketplace](#7-p2p-marketplace)
8. [Instant Buy/Sell](#8-instant-buysell)
9. [Referral System](#9-referral-system)
10. [Settings & Security](#10-settings--security)
11. [Admin Panel](#11-admin-panel)
12. [Support & Help](#12-support--help)

---

## 1. PUBLIC PAGES

### Landing Page `/`
**Purpose:** Main marketing page for new visitors

**Flow:**
1. User lands on homepage
2. Sees hero section with platform benefits
3. Views features, statistics, testimonials
4. Can click "Get Started" → Register
5. Can click "Login" → Login page
6. Can download mobile app (Android/iOS links)

**Elements:**
- Hero banner with CTA
- Feature highlights
- Live price ticker
- Testimonials
- Footer with links

---

### Public Seller Profile `/seller/:sellerId`
**Purpose:** View a P2P seller's public profile and reputation

**Flow:**
1. Anyone can access via direct link
2. Shows seller rating, trade count, completion rate
3. Shows available offers
4. "Trade with this seller" button → requires login

---

### Terms of Service `/terms` or `/terms-of-service`
**Purpose:** Legal terms and conditions

---

### Privacy Policy `/privacy` or `/privacy-policy`
**Purpose:** Privacy and data handling policy

---

### FAQ / Help Center `/faq` or `/help`
**Purpose:** Frequently asked questions and help articles

---

## 2. AUTHENTICATION FLOW

### Register `/register`
**Purpose:** Create new account

**Flow:**
1. Enter email address
2. Create password (min 8 chars, 1 uppercase, 1 number)
3. Confirm password
4. Accept Terms of Service
5. Optional: Enter referral code
6. Click "Create Account"
7. Receive verification email
8. Click email link → Account verified
9. Redirect to Dashboard

**Validation:**
- Email format check
- Password strength meter
- Duplicate email check

---

### Login `/login`
**Purpose:** Access existing account

**Flow:**
1. Enter email
2. Enter password
3. Click "Login"
4. If 2FA enabled → Enter 2FA code
5. Success → Redirect to Dashboard
6. Failed → Show error, offer "Forgot Password"

**Options:**
- "Remember me" checkbox
- "Forgot Password" link
- "Create Account" link

---

### Forgot Password `/forgot-password`
**Purpose:** Reset forgotten password

**Flow:**
1. Enter registered email
2. Click "Send Reset Link"
3. Check email for reset link
4. Click link → Reset Password page

---

### Reset Password `/reset-password`
**Purpose:** Set new password after reset request

**Flow:**
1. Arrive via email link (contains token)
2. Enter new password
3. Confirm new password
4. Click "Reset Password"
5. Success → Redirect to Login

---

### Email Verification `/verify-email`
**Purpose:** Confirm email address is valid

**Flow:**
1. User clicks link from verification email
2. Token validated
3. Account marked as verified
4. Redirect to Login or Dashboard

---

### Premium Auth `/auth`
**Purpose:** Enhanced authentication with phone verification

**Flow:**
1. Enter phone number
2. Receive SMS code
3. Enter code to verify
4. Account security upgraded

---

## 3. DASHBOARD & PORTFOLIO

### Dashboard `/dashboard`
**Purpose:** Main user home after login - overview of everything

**Shows:**
- Total portfolio value (GBP/USD/EUR)
- Asset allocation pie chart
- Recent transactions
- Price alerts summary
- Quick action buttons
- Market overview

**Quick Actions:**
- Deposit
- Withdraw
- Buy Crypto
- Sell Crypto
- Send
- Receive

---

### Portfolio `/portfolio`
**Purpose:** Detailed view of all holdings

**Shows:**
- Total value with 24h change
- List of all crypto holdings
- Each asset shows: amount, value, 24h %, allocation %
- Performance chart (24h, 7d, 30d, 1y)

**Actions:**
- Click asset → Asset Detail page
- Sort by value, name, change
- Filter by asset type

---

### Asset Detail `/asset/:symbol`
**Purpose:** Detailed view of single cryptocurrency

**Shows:**
- Current price with change
- Price chart (TradingView)
- Your holdings
- Transaction history for this asset
- Market stats (market cap, volume, etc.)

**Actions:**
- Buy / Sell
- Send / Receive
- Set Price Alert
- View on blockchain explorer

---

### Allocations `/allocations`
**Purpose:** Visual breakdown of portfolio allocation

**Shows:**
- Pie/donut chart of holdings
- Percentage breakdown
- Rebalancing suggestions

---

## 4. WALLET & BALANCES

### Wallet Page `/wallet`
**Purpose:** Main wallet interface showing all balances

**Shows:**
- Total balance in selected fiat (GBP/USD/EUR)
- List of all crypto wallets
- Each wallet shows: coin, balance, fiat value
- "Main" and "Trading" wallet tabs

**Actions:**
- Deposit (click coin → deposit page)
- Withdraw (click coin → withdraw page)
- Send (transfer to external address)
- Receive (get deposit address)
- Swap (quick swap between coins)

---

### Deposit `/deposit/:coin` or `/wallet/deposit`
**Purpose:** Add crypto to wallet

**Flow:**
1. Select cryptocurrency (if not pre-selected)
2. Select network (e.g., ERC-20, BEP-20, TRC-20)
3. View deposit address + QR code
4. Copy address or scan QR
5. Send from external wallet
6. Wait for confirmations
7. Balance updates automatically

**Warning:** Shows network mismatch warning

---

### Withdraw `/withdraw/:coin` or `/wallet/withdraw`
**Purpose:** Send crypto to external wallet

**Flow:**
1. Select cryptocurrency
2. Select network
3. Enter destination address
4. Enter amount (or click "Max")
5. Review fee
6. Click "Withdraw"
7. Enter 2FA code (if enabled)
8. Confirm withdrawal
9. Receive confirmation email
10. Track status in Transactions

**Limits:** Shows daily/monthly limits based on KYC level

---

### Send `/send/:currency`
**Purpose:** Send crypto to another user or external address

**Flow:**
1. Select currency
2. Enter recipient (email, username, or wallet address)
3. Enter amount
4. Add note (optional)
5. Review details
6. Confirm send
7. If internal (CoinHubX user) → Instant
8. If external → Blockchain transaction

---

### Receive `/receive`
**Purpose:** Get deposit addresses for all coins

**Shows:**
- List of all supported coins
- Click coin → Shows address + QR
- Copy button for address

---

### Transactions `/transactions`
**Purpose:** Full transaction history

**Shows:**
- All deposits, withdrawals, trades, transfers
- Filter by: type, date range, coin
- Search by transaction ID
- Export to CSV

**Each transaction shows:**
- Type (deposit/withdraw/trade/etc.)
- Amount and coin
- Status (pending/completed/failed)
- Date/time
- Transaction ID
- Fee paid

---

### Trader Balance `/trader-balance`
**Purpose:** View trading-specific balances

**Shows:**
- Funds available for trading
- Funds locked in open orders
- P2P escrow funds

---

## 5. SAVINGS VAULT

### Savings `/savings`
**Purpose:** Notice savings account - lock crypto for secure storage

**Shows:**
- Total balance in savings
- Locked balance (in notice period)
- Available to withdraw
- Currency selector (GBP/USD/EUR)

**Lock Period Options:**
- 30 days notice
- 60 days notice  
- 90 days notice

**Important:** This is NOT staking/yield. It's secure storage with notice period for withdrawals. Early withdrawal incurs a fee.

---

### Add to Savings Flow
**Purpose:** Deposit crypto into savings vault

**Flow:**
1. Click "Add to Savings"
2. **Step 1:** Select wallet (Main/Trading)
3. **Step 2:** Select cryptocurrency (237 coins via NowPayments)
4. **Step 3:** Enter amount
5. **Step 4:** Select notice period (30/60/90 days)
6. **Step 5:** Review & confirm
7. Click "Proceed to Payment"
8. Complete payment via NowPayments
9. Funds appear in Savings Vault

---

### Savings History `/savings/history`
**Purpose:** View all savings transactions

**Shows:**
- Deposits into savings
- Withdrawals from savings
- Notice period starts/ends
- Fees paid for early withdrawal

---

## 6. TRADING

### Markets `/markets`
**Purpose:** View all available trading pairs

**Shows:**
- List of all trading pairs (BTC/GBP, ETH/GBP, etc.)
- Current price
- 24h change %
- 24h volume
- Mini sparkline chart

**Actions:**
- Click pair → Trading page
- Search/filter pairs
- Sort by volume, change, name

---

### Spot Trading `/spot-trading` or `/spot-trading-pro`
**Purpose:** Professional trading interface

**Shows:**
- TradingView chart (full featured)
- Order book (bids/asks)
- Recent trades
- Your open orders
- Order form (buy/sell)

**Order Types:**
- Market order (instant at current price)
- Limit order (set your price)
- Stop-loss order

**Flow (Market Buy):**
1. Select trading pair
2. Click "Buy" tab
3. Select "Market"
4. Enter amount
5. Review total cost
6. Click "Buy [COIN]"
7. Order executed instantly
8. Balance updated

**Flow (Limit Order):**
1. Select trading pair
2. Click "Buy" tab
3. Select "Limit"
4. Enter price you want
5. Enter amount
6. Click "Place Order"
7. Order added to order book
8. Executes when price reached
9. Can cancel anytime before execution

---

### Mobile Trading `/trading/:symbol`
**Purpose:** Mobile-optimized trading view

**Same as Spot Trading but:**
- Simplified layout for mobile
- Swipe between chart/orderbook/orders
- Larger buttons for touch

---

### Swap Crypto `/swap-crypto` or `/swap/:coin`
**Purpose:** Quick swap between cryptocurrencies

**Flow:**
1. Select "From" currency
2. Select "To" currency
3. Enter amount
4. See conversion rate + fee
5. Click "Swap"
6. Confirm transaction
7. Instant execution
8. Balances updated

**Note:** Higher fees than spot trading but simpler

---

### Price Alerts `/price-alerts`
**Purpose:** Set notifications for price movements

**Flow:**
1. Click "Create Alert"
2. Select cryptocurrency
3. Set condition (above/below price)
4. Enter target price
5. Choose notification method (push/email)
6. Save alert
7. Get notified when price hits target

**Shows:**
- Active alerts
- Triggered alerts history
- Edit/delete alerts

---

## 7. P2P MARKETPLACE

### P2P Marketplace `/p2p` or `/p2p-marketplace`
**Purpose:** Buy/sell crypto directly with other users

**Shows:**
- Buy offers (people selling crypto)
- Sell offers (people buying crypto)
- Filter by: coin, payment method, amount
- Each offer shows: price, limits, payment methods, seller rating

---

### P2P Express `/p2p-express`
**Purpose:** Quick P2P trades with verified sellers

**Flow:**
1. Select Buy or Sell
2. Enter amount in GBP
3. See best available offers
4. Select offer
5. Proceed to trade

---

### Buy Crypto (P2P) `/buy-crypto`
**Purpose:** Browse offers to buy crypto

**Flow:**
1. Browse available sell offers
2. Filter by payment method (Bank Transfer, PayPal, etc.)
3. Click offer to view details
4. Enter amount you want to buy
5. Click "Buy"
6. Trade created → Chat with seller
7. Make payment using seller's details
8. Mark as "Paid"
9. Seller releases crypto from escrow
10. Crypto added to your wallet

---

### Sell Crypto (P2P) `/sell-crypto`
**Purpose:** Browse offers to sell your crypto

**Flow:**
1. Browse available buy offers
2. Select offer
3. Enter amount to sell
4. Crypto locked in escrow
5. Share payment details with buyer
6. Wait for buyer's payment
7. Confirm payment received
8. Release crypto to buyer
9. Receive fiat payment

---

### Create Ad/Offer `/p2p/create-ad`
**Purpose:** Post your own buy/sell offer

**Flow:**
1. Select: Buy or Sell
2. Select cryptocurrency
3. Set your price (fixed or % above/below market)
4. Set min/max trade limits
5. Select accepted payment methods
6. Add terms and instructions
7. Set time limit for payment
8. Submit offer
9. Offer appears in marketplace

---

### Trade Page `/trade/:tradeId` or `/p2p/trade/:tradeId`
**Purpose:** Active trade interface

**Shows:**
- Trade details (amount, price, payment method)
- Trade status (waiting payment, paid, completed)
- Countdown timer
- Chat with counterparty
- Payment instructions
- Action buttons (Mark Paid, Release, Dispute)

**Buyer Flow:**
1. View seller's payment details
2. Make payment via agreed method
3. Click "I have paid"
4. Wait for seller to confirm
5. Receive crypto

**Seller Flow:**
1. Wait for buyer's payment
2. Check bank/PayPal for funds
3. Click "Release crypto"
4. Trade completed

---

### Dispute Centre `/disputes/:disputeId`
**Purpose:** Handle trade disputes

**When to use:**
- Buyer paid but seller won't release
- Seller claims no payment received
- Payment issues

**Flow:**
1. Click "Open Dispute" on trade page
2. Select reason
3. Provide evidence (screenshots, transaction proof)
4. Submit dispute
5. Admin reviews case
6. Admin makes decision
7. Crypto released to winner

---

### My Orders `/my-orders`
**Purpose:** View all your P2P trades

**Shows:**
- Active trades
- Completed trades
- Cancelled trades
- Disputed trades

**Filter by:** Status, date, coin

---

### Merchant Center `/p2p/merchant`
**Purpose:** Tools for high-volume P2P traders

**Shows:**
- Your seller statistics
- Active offers
- Trade history
- Earnings summary
- Verification status

---

### Add Payment Method `/p2p/add-payment-method`
**Purpose:** Add payment methods for P2P trading

**Supported Methods:**
- Bank Transfer (sort code, account number)
- PayPal
- Revolut
- Wise
- Cash App
- Venmo
- And more...

**Flow:**
1. Select payment method type
2. Enter details (account name, number, etc.)
3. Save
4. Use in your P2P offers

---

### P2P Boost `/p2p/boost`
**Purpose:** Promote your P2P offers for more visibility

**Flow:**
1. Select offer to boost
2. Choose boost duration
3. Pay boost fee
4. Offer appears higher in listings

---

### Merchant Profile `/merchant/:userId`
**Purpose:** Public profile of a P2P merchant

**Shows:**
- Rating and reviews
- Total trades completed
- Completion rate
- Average release time
- Active offers
- Feedback from traders

---

## 8. INSTANT BUY/SELL

### Instant Buy `/instant-buy`
**Purpose:** Buy crypto instantly with GBP (card/bank)

**Flow:**
1. Select cryptocurrency to buy
2. Enter GBP amount
3. See crypto amount you'll receive
4. See fees breakdown
5. Select payment method
6. Click "Buy Now"
7. Complete payment
8. Crypto added to wallet instantly

**Payment Methods:**
- Debit/Credit card
- Bank transfer
- Apple Pay
- Google Pay

---

### Instant Sell `/instant-sell`
**Purpose:** Sell crypto instantly for GBP

**Flow:**
1. Select cryptocurrency to sell
2. Enter amount
3. See GBP you'll receive
4. Select payout method (bank account)
5. Click "Sell Now"
6. Confirm transaction
7. GBP sent to your bank (1-3 business days)

---

## 9. REFERRAL SYSTEM

### Referral Dashboard `/referrals`
**Purpose:** Track referrals and earnings

**Shows:**
- Your referral link/code
- Total referrals
- Active referrals
- Total earnings
- Pending earnings
- Earnings history

**How it works:**
1. Share your referral link
2. Friend signs up using link
3. Friend completes first trade
4. You earn commission on their trades
5. Commission rate depends on your tier

**Tiers:**
- Standard: X% commission
- Silver: X% commission
- Gold: X% commission
- Platinum: X% commission

---

## 10. SETTINGS & SECURITY

### Settings `/settings` or `/profile`
**Purpose:** Manage account settings

**Sections:**

**Profile:**
- Display name
- Email (change with verification)
- Phone number
- Profile picture
- Country/region

**Preferences:**
- Default currency (GBP/USD/EUR)
- Language
- Timezone
- Notification preferences

**Payment Methods:**
- Linked bank accounts
- Saved cards
- P2P payment methods

---

### Security `/security`
**Purpose:** Security settings and 2FA

**Shows:**
- 2FA status (enabled/disabled)
- Login history
- Active sessions
- Password change
- API keys (if applicable)

---

### 2FA Setup `/2fa-setup`
**Purpose:** Enable two-factor authentication

**Flow:**
1. Click "Enable 2FA"
2. Download authenticator app (Google/Authy)
3. Scan QR code
4. Enter code from app
5. Save backup codes
6. 2FA now active

---

### KYC Verification `/kyc-verification` or `/verification`
**Purpose:** Identity verification for higher limits

**Levels:**

**Level 1 (Email only):**
- Basic account access
- Low limits

**Level 2 (ID Verification):**
1. Upload government ID (passport/driving licence)
2. Take selfie
3. Wait for review (usually < 24h)
4. Approved → Higher limits

**Level 3 (Address Verification):**
1. Upload proof of address (utility bill, bank statement)
2. Must be dated within 3 months
3. Approved → Maximum limits

---

### Blocked Users `/settings/blocked`
**Purpose:** Manage blocked P2P traders

**Flow:**
1. View list of blocked users
2. Unblock if needed
3. Blocked users can't trade with you

---

### Account Upgrade `/account/upgrade`
**Purpose:** Upgrade account tier/subscription

---

### Subscriptions `/subscriptions`
**Purpose:** Manage premium subscriptions

---

### Notifications `/notifications`
**Purpose:** View all notifications

**Types:**
- Trade updates
- Price alerts triggered
- Deposit/withdrawal confirmations
- Security alerts
- Promotional messages

---

## 11. ADMIN PANEL

*These pages are only accessible to admin users*

### Admin Login `/admin/login`
**Purpose:** Separate admin authentication

---

### Admin Dashboard `/admin/dashboard`
**Purpose:** Overview of platform statistics

**Shows:**
- Total users
- Daily active users
- Total trading volume
- Revenue today/week/month
- Pending KYC verifications
- Open disputes
- System health

---

### Admin Business Dashboard `/admin/business`
**Purpose:** Business metrics and analytics

---

### Admin Revenue Dashboard `/admin/revenue`
**Purpose:** Detailed revenue tracking

**Shows:**
- Fee revenue by type
- Daily/weekly/monthly charts
- Top revenue sources
- Projections

---

### Admin P2P Dashboard `/admin/p2p`
**Purpose:** Monitor P2P marketplace

**Shows:**
- Active trades
- Trade volume
- Top traders
- Suspicious activity

---

### Admin Disputes `/admin/disputes`
**Purpose:** Handle user disputes

**Flow:**
1. View open disputes
2. Review evidence from both parties
3. Make decision
4. Release funds to winner
5. Optionally ban bad actors

---

### Admin Users `/admin/users`
**Purpose:** User management

**Actions:**
- Search users
- View user details
- Verify/reject KYC
- Suspend/ban users
- Adjust limits
- View user activity

---

### Admin Fees `/admin/fees`
**Purpose:** Configure platform fees

**Configurable:**
- Trading fees
- Withdrawal fees
- P2P fees
- Instant buy/sell fees
- Savings early withdrawal fee

---

### Admin Liquidity `/admin/liquidity`
**Purpose:** Manage platform liquidity

---

### Admin Support `/admin/support`
**Purpose:** Handle support tickets

---

### Admin CMS `/admin/cms`
**Purpose:** Content management

---

### Admin Security Logs `/admin/security-logs`
**Purpose:** View security events

---

### Admin Referral Control `/admin/referral-control`
**Purpose:** Manage referral program

---

### Admin Settings `/admin/settings`
**Purpose:** Platform-wide settings

---

## 12. SUPPORT & HELP

### Help Center `/help`
**Purpose:** Self-service support

**Contains:**
- FAQ sections
- How-to guides
- Troubleshooting
- Contact support

---

### Bug Report Button (All Pages)
**Purpose:** Report issues directly from any page

**Flow:**
1. Click red "Bug?" button (bottom right)
2. Select issue type
3. Describe problem
4. Optionally capture screenshot
5. Submit
6. Report sent to team via Slack + Email

**Captures automatically:**
- Page URL
- User ID (if logged in)
- Device/browser info
- Console errors
- Timestamp

---

### Support Chat Widget (All Pages)
**Purpose:** Live chat support

**Flow:**
1. Click chat icon (bottom left)
2. Type question
3. AI assistant responds
4. If needed, escalate to human

---

## ADDITIONAL PAGES

### Mobile App `/mobile-app`
**Purpose:** Download links for mobile apps

---

### Transfer `/transfer`
**Purpose:** Internal transfers between users

---

### Bridge `/bridge`
**Purpose:** Cross-chain transfers

---

### NFTs `/nfts`
**Purpose:** NFT portfolio and marketplace

---

### DeFi `/defi`
**Purpose:** DeFi integrations

---

### Staking `/staking`
**Purpose:** Stake crypto for rewards

---

### OTC Desk `/otc-desk`
**Purpose:** Large volume trades

---

### Fees `/fees`
**Purpose:** View all platform fees

---

## ERROR PAGES

### 404 Not Found `/*`
**Purpose:** Handle invalid URLs

---

## FLOW DIAGRAMS

### New User Journey
```
Landing Page → Register → Verify Email → Dashboard → KYC → Deposit → Trade
```

### Buy Crypto Journey
```
Dashboard → Instant Buy → Select Coin → Enter Amount → Pay → Receive Crypto
```

### P2P Buy Journey
```
P2P Marketplace → Find Offer → Start Trade → Chat → Pay Seller → Receive Crypto
```

### P2P Sell Journey
```
P2P Marketplace → Create Offer → Wait for Buyer → Receive Payment → Release Crypto
```

### Savings Journey
```
Savings → Add to Savings → Select Coin → Enter Amount → Select Lock Period → Deposit
```

### Withdrawal Journey
```
Wallet → Select Coin → Withdraw → Enter Address → Enter Amount → 2FA → Confirm
```

---

## API ENDPOINTS SUMMARY

| Area | Base Path |
|------|----------|
| Auth | `/api/auth/*` |
| Users | `/api/users/*` |
| Wallets | `/api/wallets/*` |
| Trading | `/api/trading/*` |
| P2P | `/api/p2p/*` |
| Savings | `/api/savings/*` |
| Admin | `/api/admin/*` |
| Health | `/api/health` |

---

*Document generated for CoinHubX platform*
*Last updated: December 2025*
