# COINHUBX - COMPLETE BUTTON & FLOW DOCUMENTATION
## Every Button, Every Action, Every Page

**Document Version:** 1.0  
**Generated:** December 21, 2025  
**Purpose:** Detailed review of all platform functionality

---

# TABLE OF CONTENTS

1. [GLOBAL ELEMENTS (Present on All Pages)](#1-global-elements)
2. [LANDING PAGE](#2-landing-page)
3. [AUTHENTICATION PAGES](#3-authentication-pages)
4. [DASHBOARD](#4-dashboard)
5. [WALLET PAGE](#5-wallet-page)
6. [SAVINGS VAULT](#6-savings-vault)
7. [PORTFOLIO & ALLOCATIONS](#7-portfolio--allocations)
8. [TRADING PAGES](#8-trading-pages)
9. [P2P MARKETPLACE](#9-p2p-marketplace)
10. [INSTANT BUY/SELL](#10-instant-buysell)
11. [SETTINGS & SECURITY](#11-settings--security)
12. [REFERRALS](#12-referrals)
13. [ADMIN PANEL](#13-admin-panel)

---

# 1. GLOBAL ELEMENTS
*These appear on every page when logged in*

## 1.1 Top Navigation Bar

| Element | Type | Action | Destination | API Call |
|---------|------|--------|-------------|----------|
| COIN HUB X Logo | Clickable Logo | Navigates to home | `/dashboard` (if logged in) or `/` (if logged out) | None |
| Price Ticker Bar | Display | Shows live BTC/ETH/BNB prices | N/A (display only) | `GET /api/prices/live` |
| Notification Bell | Icon Button | Opens notification dropdown | Dropdown overlay | `GET /api/notifications/{user_id}` |
| Profile Avatar | Icon Button | Opens profile dropdown menu | Dropdown overlay | None |

### Profile Dropdown Menu Items:
| Menu Item | Action | Destination |
|-----------|--------|-------------|
| My Profile | Navigate | `/settings` |
| Security | Navigate | `/security` |
| Referrals | Navigate | `/referrals` |
| Help Center | Navigate | `/help` |
| Logout | Action + Navigate | Clears session → `/login` |

---

## 1.2 Left Sidebar Navigation

| Menu Item | Icon | Destination | Description |
|-----------|------|-------------|-------------|
| Portfolio | Chart icon | `/portfolio` | View all holdings |
| Wallet | Wallet icon | `/wallet` | Manage balances, deposit, withdraw |
| Savings Vault | Lock icon | `/savings` | Notice savings accounts |
| Allocations | Pie icon | `/allocations` | Portfolio breakdown |
| Instant Buy | Lightning icon | `/instant-buy` | Buy crypto with card |
| P2P Express | Arrow icon | `/p2p-express` | Quick P2P trades |
| P2P Marketplace | Store icon | `/p2p` | Full P2P marketplace |
| GET APP | Button group | External links | Android/iOS app download |
| Support / Chat | Chat icon | Opens chat widget | AI support assistant |

---

## 1.3 Bottom Mobile Navigation Bar
*Only visible on mobile devices (width < 768px)*

| Tab | Icon | Destination |
|-----|------|-------------|
| Wallet | Wallet icon | `/wallet` |
| Savings | Piggy bank icon | `/savings` |
| Settings | Gear icon | `/settings` |

---

## 1.4 Bug Report Button (Bottom Right)
*Red floating button labeled "Bug?"*

| Action | What Happens |
|--------|-------------|
| Click button | Opens bug report modal |

### Bug Report Modal Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Type | Dropdown | Yes | Bug / UI Issue / Feature Request / Other |
| Description | Textarea | Yes | What went wrong |
| Email | Text input | No | For follow-up |
| Capture Screenshot | Button | No | Uses html2canvas to capture current page |
| Send Report | Submit button | Yes | Submits to backend |

**On Submit:**
- API Call: `POST /api/bug-report`
- Data sent: page URL, user ID, device info, timestamp, description, screenshot (base64), console errors
- Notification: Slack + Email to admin
- User feedback: "Report Sent!" success message

---

## 1.5 Support Chat Widget (Bottom Left)
*Floating chat icon*

| Action | What Happens |
|--------|-------------|
| Click icon | Opens AI chat assistant panel |
| Type message | Sends to AI assistant |
| Close (X) | Minimizes chat widget |

---

# 2. LANDING PAGE
**Route:** `/`  
**Access:** Public (no login required)

## 2.1 Hero Section

| Element | Type | Action | Destination |
|---------|------|--------|-------------|
| "Get Started" Button | Primary CTA | Navigate | `/register` |
| "Login" Button | Secondary CTA | Navigate | `/login` |
| "Watch Demo" Button | Video trigger | Opens demo video modal | N/A |

## 2.2 Feature Cards Section

| Card | Click Action | Destination |
|------|--------------|-------------|
| "Instant Buy" card | Navigate | `/register` (then to `/instant-buy`) |
| "P2P Trading" card | Navigate | `/register` (then to `/p2p`) |
| "Secure Savings" card | Navigate | `/register` (then to `/savings`) |
| "Low Fees" card | Navigate | `/fees` (public fee page) |

## 2.3 Live Price Ticker

| Element | Action | Destination |
|---------|--------|-------------|
| Any coin row | Click | `/register` (prompts to sign up to trade) |

## 2.4 Footer

| Link | Destination |
|------|-------------|
| Terms of Service | `/terms` |
| Privacy Policy | `/privacy` |
| FAQ | `/faq` |
| Contact Us | `/contact` or email link |
| Twitter/X | External: twitter.com/coinhubx |
| Telegram | External: t.me/coinhubx |
| Discord | External: discord.gg/coinhubx |

---

# 3. AUTHENTICATION PAGES

## 3.1 Login Page
**Route:** `/login`

### Form Fields:
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Email | Text input | Valid email format | Yes |
| Password | Password input | Min 8 characters | Yes |
| Remember Me | Checkbox | None | No |

### Buttons:
| Button | Action | What Happens |
|--------|--------|-------------|
| "Login" | Submit form | API: `POST /api/auth/login` |
| "Forgot Password?" | Navigate | Goes to `/forgot-password` |
| "Create Account" | Navigate | Goes to `/register` |
| "Login with Google" | OAuth | Redirects to Google OAuth flow |

### Login Flow:
```
1. User enters email + password
2. Clicks "Login"
3. API validates credentials
4. IF wrong password:
   - Shows: "Invalid credentials. X attempts remaining."
   - After 5 fails: "Account locked for 15 minutes."
5. IF 2FA enabled:
   - Shows 2FA code input modal
   - User enters 6-digit code from authenticator app
   - API: POST /api/auth/verify-2fa
6. IF success:
   - Stores JWT token in localStorage
   - Redirects to /dashboard
7. IF account frozen:
   - Shows: "Account suspended. Contact support."
```

---

## 3.2 Register Page
**Route:** `/register`

### Form Fields:
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Full Name | Text | Min 2 characters | Yes |
| Email | Text | Valid email, not already registered | Yes |
| Password | Password | Min 8 chars, 1 uppercase, 1 number | Yes |
| Confirm Password | Password | Must match password | Yes |
| Referral Code | Text | Valid code or empty | No |
| Terms Checkbox | Checkbox | Must be checked | Yes |

### Buttons:
| Button | Action | What Happens |
|--------|--------|-------------|
| "Create Account" | Submit form | API: `POST /api/auth/register` |
| "Already have account? Login" | Navigate | Goes to `/login` |
| "Sign up with Google" | OAuth | Google OAuth registration |

### Registration Flow:
```
1. User fills all required fields
2. Password strength indicator shows (Weak/Medium/Strong)
3. User clicks "Create Account"
4. API creates user with:
   - user_id: UUID
   - email: provided email
   - password_hash: bcrypt hash
   - kyc_level: 0
   - referral_code: auto-generated
   - referred_by: referral code if provided
5. API sends verification email
6. User sees: "Check your email to verify your account"
7. User clicks email link → /verify-email?token=xxx
8. Account marked as verified
9. Redirect to /login or /dashboard
```

---

## 3.3 Forgot Password Page
**Route:** `/forgot-password`

### Form Fields:
| Field | Type | Required |
|-------|------|----------|
| Email | Text input | Yes |

### Buttons:
| Button | Action | What Happens |
|--------|--------|-------------|
| "Send Reset Link" | Submit | API: `POST /api/auth/forgot-password` |
| "Back to Login" | Navigate | Goes to `/login` |

### Flow:
```
1. User enters email
2. Clicks "Send Reset Link"
3. API generates reset token (expires in 1 hour)
4. Email sent with link: /reset-password?token=xxx
5. User sees: "If an account exists, you'll receive an email"
```

---

## 3.4 Reset Password Page
**Route:** `/reset-password?token=xxx`

### Form Fields:
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| New Password | Password | Min 8 chars, 1 uppercase, 1 number | Yes |
| Confirm Password | Password | Must match | Yes |

### Buttons:
| Button | Action | What Happens |
|--------|--------|-------------|
| "Reset Password" | Submit | API: `POST /api/auth/reset-password` |

### Flow:
```
1. Page loads with token from URL
2. User enters new password twice
3. Clicks "Reset Password"
4. API validates token, updates password hash
5. Success: Redirect to /login with message "Password updated"
6. Token expired: "Link expired. Request a new one."
```

---

# 4. DASHBOARD
**Route:** `/dashboard`  
**Access:** Requires login

## 4.1 Portfolio Overview Card

| Element | Type | Data Shown |
|---------|------|------------|
| Total Balance | Large number | Sum of all holdings in selected fiat |
| 24h Change | Percentage | Portfolio change in last 24 hours |
| Currency Toggle | Dropdown | GBP / USD / EUR |

### Currency Toggle:
| Action | What Happens |
|--------|-------------|
| Select GBP | All values shown in £ |
| Select USD | All values shown in $ |
| Select EUR | All values shown in € |

## 4.2 Quick Action Buttons

| Button | Icon | Action | Destination |
|--------|------|--------|-------------|
| Deposit | Down arrow | Navigate | `/deposit` or `/wallet` with deposit modal |
| Withdraw | Up arrow | Navigate | `/withdraw` or `/wallet` with withdraw modal |
| Buy | Plus | Navigate | `/instant-buy` |
| Sell | Minus | Navigate | `/instant-sell` |
| Send | Arrow right | Navigate | `/send` |
| Receive | Arrow left | Navigate | `/receive` |
| Swap | Exchange icon | Navigate | `/swap-crypto` |

## 4.3 Holdings List

| Column | Description |
|--------|-------------|
| Coin | Logo + Name + Symbol |
| Balance | Amount held |
| Value | Fiat value |
| 24h Change | Percentage change |
| Actions | Quick action buttons |

### Row Click:
| Action | Destination |
|--------|-------------|
| Click row | `/asset/{symbol}` - Asset detail page |

### Row Action Buttons:
| Button | Action |
|--------|--------|
| Buy | Opens quick buy modal for that coin |
| Sell | Opens quick sell modal for that coin |
| Send | Goes to `/send/{symbol}` |

## 4.4 Recent Transactions

| Column | Description |
|--------|-------------|
| Type | Deposit/Withdraw/Trade/Transfer |
| Amount | Crypto amount |
| Status | Pending/Completed/Failed |
| Date | Timestamp |

| Action | Destination |
|--------|-------------|
| "View All" link | `/transactions` |
| Click row | Transaction detail modal |

## 4.5 Market Overview Widget

| Element | Description |
|---------|-------------|
| Top Gainers | Top 3 coins by 24h % gain |
| Top Losers | Top 3 coins by 24h % loss |
| Trending | Most traded on platform |

| Action | Destination |
|--------|-------------|
| Click any coin | `/asset/{symbol}` |

---

# 5. WALLET PAGE
**Route:** `/wallet`  
**Access:** Requires login

## 5.1 Total Balance Header

| Element | Description |
|---------|-------------|
| Total Balance | Sum of all crypto in fiat |
| Currency Selector | GBP/USD/EUR dropdown |
| "Deposit" Button | Primary action |
| "Withdraw" Button | Secondary action |

## 5.2 Wallet Tabs

| Tab | Description |
|-----|-------------|
| Main Wallet | Primary holding wallet |
| Trading Wallet | Funds for spot trading |

## 5.3 Coin List

For each cryptocurrency:

| Element | Description |
|---------|-------------|
| Coin Icon | Logo of cryptocurrency |
| Coin Name | Full name (e.g., "Bitcoin") |
| Symbol | Short code (e.g., "BTC") |
| Balance | Amount held |
| Fiat Value | Value in selected currency |
| Deposit Button | Opens deposit flow |
| Withdraw Button | Opens withdraw flow |
| Trade Button | Goes to trading page |

### Deposit Button Click:
```
1. Opens deposit modal
2. Shows deposit address for selected coin
3. Shows QR code
4. Shows network selector (ERC-20, BEP-20, TRC-20, etc.)
5. Copy button copies address to clipboard
6. Warning: "Only send {COIN} to this address"
```

### Withdraw Button Click:
```
1. Opens withdraw modal
2. Step 1: Enter destination address
3. Step 2: Select network
4. Step 3: Enter amount (shows max available)
5. Step 4: Review (shows fee)
6. Step 5: Enter 2FA code (if enabled)
7. Submit: API POST /api/wallet/withdraw
8. IF address not whitelisted:
   - Shows warning: "New address - 24 hour security hold"
   - Email sent with cancellation link
9. IF address whitelisted:
   - Processes immediately
10. Confirmation shown with TX ID
```

## 5.4 Transaction History (Bottom Section)

| Column | Description |
|--------|-------------|
| Type | Deposit/Withdraw |
| Coin | Which cryptocurrency |
| Amount | How much |
| Status | Pending/Confirmed/Failed |
| Date | When |
| TX Hash | Blockchain transaction ID (clickable) |

| Button | Action |
|--------|--------|
| "View All" | Navigate to `/transactions` |
| TX Hash click | Opens blockchain explorer in new tab |

---

# 6. SAVINGS VAULT
**Route:** `/savings`  
**Access:** Requires login

## 6.1 Header Section

| Element | Description |
|---------|-------------|
| "Savings Vault" Title | Page title |
| Description | "Securely store your crypto in locked accounts..." |
| Wallet Selector | Dropdown: Main / Trading wallet |
| "Add to Savings" Button | Primary CTA - opens deposit modal |

## 6.2 Balance Cards

| Card | Shows | Description |
|------|-------|-------------|
| Total Balance | £X.XX | Total in savings vault |
| Locked Balance | £X.XX | Currently in notice period |
| Available to Withdraw | £X.XX | Can withdraw now |

### Currency Toggle (next to Total Balance):
| Option | Action |
|--------|--------|
| £ GBP | Shows all values in British Pounds |
| $ USD | Shows all values in US Dollars |
| € EUR | Shows all values in Euros |

## 6.3 Notice Period Cards

| Card | Lock Period | Early Withdrawal Fee |
|------|-------------|---------------------|
| Card 1 | 30 Days | 1.5% |
| Card 2 (Most Popular) | 60 Days | 1.0% |
| Card 3 (Lowest Fee) | 90 Days | 0.5% |

### Card Click:
| Action | What Happens |
|--------|-------------|
| Click card | Selects this lock period for deposit |
| "Select" button | Opens Add to Savings modal with this period pre-selected |

## 6.4 "Add to Savings" Button Flow

### Step 1: Select Wallet
| Element | Description |
|---------|-------------|
| Main Wallet Option | Click to select |
| Trading Wallet Option | Click to select |
| "Next" Button | Proceed to step 2 |
| "Cancel" Button | Close modal |

### Step 2: Select Cryptocurrency
| Element | Description |
|---------|-------------|
| Search Box | Filter coins by name/symbol |
| Coin Grid | 237 coins from NowPayments |
| Each Coin Card | Logo + Name + Symbol |
| "Next" Button | Proceed to step 3 (disabled until coin selected) |
| "Back" Button | Return to step 1 |

**Coin Selection:**
```
1. Click any coin card
2. Card highlights with cyan border
3. "Next" button becomes active
```

### Step 3: Enter Amount
| Element | Description |
|---------|-------------|
| Amount Input | Number input field |
| "MAX" Button | Sets amount to maximum available |
| Coin Symbol | Shows selected coin |
| Fiat Equivalent | Shows value in selected fiat |
| "Next" Button | Proceed to step 4 |
| "Back" Button | Return to step 2 |

### Step 4: Select Lock Period
| Element | Description |
|---------|-------------|
| 30 Days Option | Radio/card selection |
| 60 Days Option | Radio/card selection (recommended) |
| 90 Days Option | Radio/card selection |
| Fee Display | Shows early withdrawal fee % |
| "Next" Button | Proceed to step 5 |
| "Back" Button | Return to step 3 |

### Step 5: Review & Confirm
| Element | Description |
|---------|-------------|
| Summary Card | Shows all details |
| - Wallet | Main or Trading |
| - Coin | Selected cryptocurrency |
| - Amount | How much |
| - Lock Period | 30/60/90 days |
| - Early Withdrawal Fee | X% |
| - Unlock Date | Calculated date |
| "Proceed to Payment" Button | Initiates NowPayments |
| "Back" Button | Return to step 4 |

**On "Proceed to Payment" Click:**
```
1. API: POST /api/savings/initiate
2. Creates NowPayments invoice
3. Returns payment address + amount
4. Shows payment screen with:
   - QR code
   - Deposit address
   - Amount to send
   - Countdown timer (usually 20-30 min)
5. User sends crypto from external wallet
6. NowPayments webhook confirms payment
7. Balance added to savings vault
8. User sees confirmation screen
```

## 6.5 My Savings Section

| Column | Description |
|--------|-------------|
| Coin | Cryptocurrency |
| Amount | How much locked |
| Value | Fiat value |
| Lock Period | 30/60/90 days |
| Unlock Date | When available |
| Status | Locked / Notice Started / Available |
| Actions | Start Notice / Withdraw |

### "Start Notice" Button:
```
1. Click button
2. Confirmation modal: "Start X-day notice period?"
3. Click "Confirm"
4. API: POST /api/savings/start-notice
5. Status changes to "Notice Started"
6. Countdown begins
```

### "Withdraw" Button (only when status = Available):
```
1. Click button
2. Enter destination address
3. Confirm withdrawal
4. API: POST /api/savings/withdraw
5. Funds sent to address
6. Balance removed from savings
```

### Early Withdrawal (before notice complete):
```
1. Click "Withdraw" on locked funds
2. Warning: "Early withdrawal fee: X%"
3. Shows: You will receive: [Amount - Fee]
4. Confirm or Cancel
5. If confirmed: Fee deducted, remaining sent
```

---

# 7. PORTFOLIO & ALLOCATIONS

## 7.1 Portfolio Page
**Route:** `/portfolio`

### Header:
| Element | Description |
|---------|-------------|
| Total Value | Sum of all holdings |
| 24h Change | +/- percentage and amount |
| 7d Change | Week change |
| 30d Change | Month change |

### Time Period Tabs:
| Tab | Action |
|-----|--------|
| 24H | Show 24-hour chart |
| 7D | Show 7-day chart |
| 30D | Show 30-day chart |
| 1Y | Show 1-year chart |
| ALL | Show all-time chart |

### Holdings List:
| Column | Description |
|--------|-------------|
| Asset | Coin logo + name |
| Holdings | Amount owned |
| Price | Current price |
| Value | Fiat value |
| Allocation | % of portfolio |
| 24h | Change percentage |

| Row Action | Destination |
|------------|-------------|
| Click row | `/asset/{symbol}` |

---

## 7.2 Allocations Page
**Route:** `/allocations`

### Pie Chart:
| Element | Description |
|---------|-------------|
| Donut Chart | Visual allocation breakdown |
| Center Text | Total portfolio value |
| Segments | Each coin's share (colored) |
| Hover | Shows coin name + % |

### Allocation Table:
| Column | Description |
|--------|-------------|
| Rank | By value (1, 2, 3...) |
| Asset | Coin name |
| Allocation % | Share of portfolio |
| Value | Fiat value |
| Amount | Crypto amount |

### Actions:
| Button | Action |
|--------|--------|
| "Rebalance" | Opens rebalancing suggestions modal |
| Export | Downloads CSV of allocations |

---

# 8. TRADING PAGES

## 8.1 Markets Page
**Route:** `/markets`

### Filter Tabs:
| Tab | Shows |
|-----|-------|
| All | All trading pairs |
| GBP | Pairs with GBP |
| USDT | Pairs with USDT |
| BTC | Pairs with BTC |
| Favorites | Starred pairs |

### Search:
| Element | Action |
|---------|--------|
| Search input | Filters by coin name/symbol |

### Market Table:
| Column | Description |
|--------|-------------|
| Star | Click to favorite |
| Pair | e.g., BTC/GBP |
| Price | Current price |
| 24h Change | % change (green/red) |
| 24h High | Highest in 24h |
| 24h Low | Lowest in 24h |
| 24h Volume | Trading volume |
| Chart | Mini sparkline |

| Row Action | Destination |
|------------|-------------|
| Click row | `/spot-trading/{pair}` |
| Click "Trade" button | `/spot-trading/{pair}` |

---

## 8.2 Spot Trading Page
**Route:** `/spot-trading` or `/spot-trading/{pair}`

### Layout Sections:

#### Top Bar:
| Element | Description |
|---------|-------------|
| Pair Selector | Dropdown to change trading pair |
| Current Price | Large price display |
| 24h Change | Percentage |
| 24h High/Low | Price range |
| 24h Volume | Trading volume |

#### TradingView Chart (Center):
| Element | Action |
|---------|--------|
| Chart | Full TradingView chart |
| Time Intervals | 1m, 5m, 15m, 1h, 4h, 1D, 1W |
| Indicators | Add technical indicators |
| Drawing Tools | Lines, Fibonacci, etc. |
| Fullscreen | Expand chart |

#### Order Book (Right Side):
| Section | Description |
|---------|-------------|
| Sell Orders (Red) | Asks - people selling |
| Spread | Gap between best bid/ask |
| Buy Orders (Green) | Bids - people buying |

| Action | What Happens |
|--------|-------------|
| Click price in order book | Auto-fills that price in order form |

#### Order Form (Right Side):

**Buy/Sell Tabs:**
| Tab | Description |
|-----|-------------|
| Buy | Green form - buying base currency |
| Sell | Red form - selling base currency |

**Order Type Selector:**
| Type | Description |
|------|-------------|
| Market | Execute immediately at current price |
| Limit | Set your price, wait for match |
| Stop-Limit | Trigger limit order at stop price |

**Market Order Form:**
| Field | Description |
|-------|-------------|
| Amount | How much to buy/sell |
| % Buttons | 25%, 50%, 75%, 100% of balance |
| Total | Estimated cost/receive |
| "Buy/Sell" Button | Execute order |

**Limit Order Form:**
| Field | Description |
|-------|-------------|
| Price | Your desired price |
| Amount | How much |
| % Buttons | 25%, 50%, 75%, 100% |
| Total | Price × Amount |
| "Place Order" Button | Submit to order book |

#### Open Orders (Bottom):
| Column | Description |
|--------|-------------|
| Time | When placed |
| Pair | Trading pair |
| Type | Market/Limit |
| Side | Buy/Sell |
| Price | Order price |
| Amount | Order size |
| Filled | % filled |
| Total | Value |
| Cancel | X button to cancel |

**Cancel Order:**
```
1. Click X on order row
2. Confirm: "Cancel this order?"
3. API: DELETE /api/trading/order/{order_id}
4. Order removed, funds unlocked
```

#### Trade History (Bottom Tab):
| Column | Description |
|--------|-------------|
| Time | Execution time |
| Pair | What was traded |
| Side | Buy/Sell |
| Price | Execution price |
| Amount | How much |
| Fee | Trading fee paid |
| Total | Net amount |

---

## 8.3 Swap Crypto Page
**Route:** `/swap-crypto`

### Swap Form:

| Element | Description |
|---------|-------------|
| "From" Section | What you're sending |
| From Coin Selector | Dropdown to pick coin |
| From Amount Input | How much to swap |
| From Balance | Shows available balance |
| "MAX" Button | Sets to max balance |
| Swap Arrow Button | Reverses from/to |
| "To" Section | What you're receiving |
| To Coin Selector | Dropdown to pick coin |
| To Amount (calculated) | Estimated receive amount |
| Exchange Rate | Shows rate + source |
| Fee Display | Shows swap fee |
| "Swap" Button | Execute swap |

**Swap Flow:**
```
1. Select "From" coin (e.g., BTC)
2. Enter amount (e.g., 0.1)
3. Select "To" coin (e.g., ETH)
4. System calculates receive amount
5. Shows: "You will receive ~X.XX ETH"
6. Shows: "Fee: 0.5%"
7. Click "Swap"
8. Confirmation modal:
   - From: 0.1 BTC
   - To: ~X.XX ETH
   - Rate: 1 BTC = XX ETH
   - Fee: 0.0005 BTC
9. Click "Confirm Swap"
10. API: POST /api/trading/swap
11. Balances updated immediately
12. Success: "Swap complete!"
```

---

# 9. P2P MARKETPLACE

## 9.1 P2P Main Page
**Route:** `/p2p` or `/p2p-marketplace`

### Top Tabs:
| Tab | Description |
|-----|-------------|
| Buy | View sell offers (you buy crypto) |
| Sell | View buy offers (you sell crypto) |

### Filters:
| Filter | Options |
|--------|--------|
| Cryptocurrency | BTC, ETH, USDT, etc. |
| Fiat Currency | GBP, EUR, USD |
| Payment Method | Bank Transfer, PayPal, Revolut, etc. |
| Amount | Min-Max range |

### Offer List:
| Column | Description |
|--------|-------------|
| Seller/Buyer | Username + rating + trades count |
| Price | Price per coin |
| Available | How much available |
| Limits | Min-Max per trade |
| Payment Methods | Icons for accepted methods |
| "Buy/Sell" Button | Start trade |

### "Buy" Button Click (on Buy tab):
```
1. Click "Buy" on an offer
2. Opens trade initiation modal
3. Enter amount you want to buy
4. Shows:
   - You pay: £XXX
   - You receive: X.XX BTC
   - Payment method: Bank Transfer
   - Time limit: 15 minutes
5. Click "Start Trade"
6. API: POST /api/p2p/trade/create
7. Seller's crypto locked in escrow
8. Redirect to /trade/{trade_id}
```

---

## 9.2 Trade Page
**Route:** `/trade/{tradeId}`

### Trade Status Bar:
| Status | Description |
|--------|-------------|
| Waiting for Payment | Buyer needs to pay |
| Payment Marked | Buyer clicked "I've Paid" |
| Completed | Crypto released |
| Disputed | Under admin review |
| Cancelled | Trade cancelled |

### Countdown Timer:
| Element | Description |
|---------|-------------|
| Timer | Minutes:Seconds remaining |
| Warning | Turns red under 5 minutes |

### Trade Details Card:
| Field | Description |
|-------|-------------|
| Amount | Crypto amount |
| Price | Price per unit |
| Total | Fiat total |
| Payment Method | How to pay |
| Reference | Payment reference to include |

### Payment Instructions (Buyer View):
| Element | Description |
|---------|-------------|
| Seller's Bank Details | Account name, number, sort code |
| Amount to Send | Exact fiat amount |
| Reference | Must include this |
| Copy Buttons | Copy each detail |

### Action Buttons (Buyer):
| Button | When Visible | Action |
|--------|--------------|--------|
| "I've Paid" | Before marking paid | Marks payment as sent |
| "Cancel Trade" | Before marking paid | Cancels (crypto released back) |
| "Open Dispute" | After marking paid | Opens dispute if issues |

### Action Buttons (Seller):
| Button | When Visible | Action |
|--------|--------------|--------|
| "Release Crypto" | After buyer marks paid | Releases escrow to buyer |
| "Open Dispute" | If payment not received | Opens dispute |

### Chat Section:
| Element | Description |
|---------|-------------|
| Message List | Chat history |
| Input Field | Type message |
| Send Button | Send message |
| Attach | Attach image (payment proof) |

### "I've Paid" Button Flow:
```
1. Buyer sends bank transfer
2. Clicks "I've Paid"
3. Optionally: Connect bank for verification (Open Banking)
   - Click "Verify with Bank"
   - Redirects to bank login
   - Confirms payment automatically
4. OR: Manual confirmation
   - Upload payment screenshot
   - Add transaction reference
5. Seller notified
6. Status: "Payment Marked"
7. Seller checks bank
8. Seller clicks "Release Crypto"
```

### "Release Crypto" Button Flow:
```
1. Seller verifies payment received in bank
2. Clicks "Release Crypto"
3. Confirmation: "Release X.XX BTC to buyer?"
4. Click "Confirm"
5. API: POST /api/p2p/trade/release
6. Crypto transferred from escrow to buyer
7. Trade marked complete
8. Both parties can leave rating
```

### "Open Dispute" Button Flow:
```
1. Click "Open Dispute"
2. Select reason:
   - Payment not received
   - Wrong amount sent
   - Payment reversed
   - Other
3. Enter description
4. Upload evidence (screenshots)
5. Submit
6. API: POST /api/p2p/dispute/create
7. Trade frozen
8. Admin notified
9. Admin reviews and decides
```

---

## 9.3 Create Ad Page
**Route:** `/p2p/create-ad`

### Form Sections:

**Step 1: Ad Type**
| Option | Description |
|--------|-------------|
| "I want to Sell" | Create sell offer |
| "I want to Buy" | Create buy offer |

**Step 2: Asset & Price**
| Field | Description |
|-------|-------------|
| Cryptocurrency | Select coin to trade |
| Fiat Currency | GBP/EUR/USD |
| Price Type | Fixed / Floating |
| Fixed Price | Enter exact price |
| Floating % | % above/below market |

**Step 3: Amount & Limits**
| Field | Description |
|-------|-------------|
| Total Amount | How much you're offering |
| Min per Trade | Minimum order |
| Max per Trade | Maximum order |

**Step 4: Payment Methods**
| Element | Description |
|---------|-------------|
| Checkbox List | Select accepted methods |
| Bank Transfer | Toggle on/off |
| PayPal | Toggle on/off |
| Revolut | Toggle on/off |
| Wise | Toggle on/off |
| etc. | ... |

**Step 5: Terms & Settings**
| Field | Description |
|-------|-------------|
| Payment Window | Time limit (15/30/45 min) |
| Terms | Your terms (textarea) |
| Auto-reply | Message sent when trade starts |
| KYC Required | Require verified buyers |

**Submit:**
| Button | Action |
|--------|--------|
| "Create Ad" | Submit to API |

```
API: POST /api/p2p/offer/create
On success: Redirect to /p2p with new offer visible
If selling: Crypto locked from your balance
```

---

# 10. INSTANT BUY/SELL

## 10.1 Instant Buy Page
**Route:** `/instant-buy`

### Form:
| Element | Description |
|---------|-------------|
| "You Pay" Input | Enter fiat amount |
| Fiat Selector | GBP/EUR/USD |
| "You Receive" Display | Calculated crypto amount |
| Crypto Selector | Select coin to buy |
| Rate Display | Current exchange rate |
| Fee Display | Processing fee |
| Payment Method | Card / Bank / Apple Pay |

### Payment Methods:
| Method | Description |
|--------|-------------|
| Debit Card | Visa/Mastercard |
| Credit Card | Visa/Mastercard |
| Bank Transfer | Direct bank payment |
| Apple Pay | (if available) |
| Google Pay | (if available) |

### "Buy Now" Button Flow:
```
1. Enter amount (e.g., £100)
2. Select crypto (e.g., BTC)
3. See: "You receive: 0.00XX BTC"
4. Select payment method
5. Click "Buy Now"
6. IF Card:
   - Card details form appears
   - Enter card number, expiry, CVV
   - 3D Secure verification
7. IF Bank Transfer:
   - Shows bank details to send to
   - Reference code provided
8. IF MoonPay/Ramp configured:
   - Opens their widget
   - Complete payment in widget
9. Payment confirmed
10. Crypto added to wallet
11. Success screen with details
```

---

## 10.2 Instant Sell Page
**Route:** `/instant-sell`

### Form:
| Element | Description |
|---------|-------------|
| "You Sell" Input | Enter crypto amount |
| Crypto Selector | Select coin to sell |
| "MAX" Button | Sell entire balance |
| "You Receive" Display | Calculated fiat amount |
| Fiat Selector | GBP/EUR/USD |
| Rate Display | Current exchange rate |
| Fee Display | Processing fee |
| Bank Account | Select saved account |

### "Sell Now" Button Flow:
```
1. Enter crypto amount or click MAX
2. See fiat you'll receive
3. Select bank account (or add new)
4. Click "Sell Now"
5. Confirmation modal:
   - Selling: X.XX BTC
   - Receiving: £XXX.XX
   - To: Account ending ****1234
6. Click "Confirm Sell"
7. API: POST /api/instant/sell
8. Crypto deducted from balance
9. Fiat sent to bank (1-3 business days)
10. Success message + reference number
```

---

# 11. SETTINGS & SECURITY

## 11.1 Settings Page
**Route:** `/settings`

### Profile Section:
| Field | Type | Action |
|-------|------|--------|
| Profile Picture | Image upload | Click to change |
| Display Name | Text input | Edit inline |
| Email | Text (read-only) | Click "Change" to update |
| Phone | Text input | Edit inline |
| Country | Dropdown | Select country |
| "Save Changes" Button | Submit | Saves all changes |

### Preferences Section:
| Setting | Type | Options |
|---------|------|--------|
| Default Currency | Dropdown | GBP, USD, EUR |
| Language | Dropdown | English, etc. |
| Timezone | Dropdown | UTC+0, etc. |
| Dark Mode | Toggle | On/Off |

### Notification Preferences:
| Setting | Type | Description |
|---------|------|-------------|
| Email Notifications | Toggle | Receive emails |
| Push Notifications | Toggle | Browser push |
| Trade Alerts | Toggle | P2P trade updates |
| Price Alerts | Toggle | Price target notifications |
| Marketing | Toggle | Promotional emails |

### Withdrawal Whitelist Section:
| Element | Description |
|---------|-------------|
| "+ Add Address" Button | Opens add address modal |
| Address List | Shows all whitelisted addresses |
| Each Address Row | Currency, Address, Label, Status |
| Verify Badge | Green if verified, Yellow if pending |
| Remove Button | X to delete address |

**Add Address Flow:**
```
1. Click "+ Add Address"
2. Select currency (BTC, ETH, etc.)
3. Enter wallet address
4. Enter label (optional)
5. Click "Add Address"
6. API: POST /api/wallet/whitelist/add
7. Email sent with verification link
8. Click link in email
9. Address marked as verified
10. Now withdrawals to this address are instant
```

---

## 11.2 Security Page
**Route:** `/security`

### Two-Factor Authentication:
| Element | Description |
|---------|-------------|
| Status | Enabled / Disabled |
| "Enable 2FA" Button | Starts setup flow |
| "Disable 2FA" Button | Removes 2FA (requires current code) |

**Enable 2FA Flow:**
```
1. Click "Enable 2FA"
2. Modal shows QR code
3. Instruction: "Scan with Google Authenticator"
4. Manual code shown (for manual entry)
5. Enter 6-digit code from app
6. Click "Verify"
7. API: POST /api/auth/2fa/enable
8. Backup codes shown (10 codes)
9. "Save these codes securely"
10. Download codes option
11. Click "Done"
12. 2FA now active
```

### Password:
| Element | Action |
|---------|--------|
| "Change Password" Button | Opens change password modal |

**Change Password Flow:**
```
1. Click "Change Password"
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click "Update Password"
6. API: POST /api/auth/change-password
7. Success: "Password updated"
8. Email notification sent
```

### Login History:
| Column | Description |
|--------|-------------|
| Date/Time | When |
| IP Address | From where |
| Device | Browser/OS |
| Location | Country/City |
| Status | Success/Failed |

### Active Sessions:
| Column | Description |
|--------|-------------|
| Device | Browser + OS |
| Location | Where |
| Last Active | When |
| "Revoke" Button | End that session |

---

## 11.3 KYC Verification Page
**Route:** `/verification` or `/kyc-verification`

### Current Level Display:
| Level | Requirements | Limits |
|-------|--------------|--------|
| Level 0 | Email only | Minimal |
| Level 1 | Email verified | Low limits |
| Level 2 | ID verified | Medium limits |
| Level 3 | Address verified | Full limits |

### Upgrade to Level 2:
| Step | Action |
|------|--------|
| 1. Select ID Type | Passport / Driving Licence / National ID |
| 2. Upload Front | Photo of ID front |
| 3. Upload Back | Photo of ID back (if applicable) |
| 4. Selfie | Take selfie holding ID |
| 5. Submit | API: POST /api/kyc/submit |
| 6. Wait | "Under review" (usually < 24h) |
| 7. Result | Approved or Rejected with reason |

### Upgrade to Level 3:
| Step | Action |
|------|--------|
| 1. Upload Proof of Address | Utility bill / Bank statement |
| 2. Requirements | Dated within 3 months, shows name + address |
| 3. Submit | API: POST /api/kyc/submit-address |
| 4. Wait | Review period |
| 5. Result | Approved = Maximum limits unlocked |

---

# 12. REFERRALS

## 12.1 Referral Dashboard
**Route:** `/referrals`

### Your Referral Link:
| Element | Action |
|---------|--------|
| Referral Link | Your unique link |
| Copy Button | Copies to clipboard |
| Share Buttons | Twitter, Facebook, Telegram, WhatsApp |
| QR Code | Scannable QR with link |

### Stats Cards:
| Card | Shows |
|------|-------|
| Total Referrals | Number of signups |
| Active Referrals | Referrals who traded |
| Total Earnings | Lifetime commission |
| Pending Earnings | Not yet paid out |

### Earnings Table:
| Column | Description |
|--------|-------------|
| Date | When earned |
| Referred User | Username (partial) |
| Their Trade | What they traded |
| Your Commission | Amount earned |
| Status | Pending / Paid |

### Referral Tiers:
| Tier | Requirement | Commission |
|------|-------------|------------|
| Standard | 0-10 referrals | X% |
| Silver | 11-50 referrals | X% |
| Gold | 51-100 referrals | X% |
| Platinum | 100+ referrals | X% |

### "Withdraw Earnings" Button:
```
1. Click "Withdraw Earnings"
2. Shows available balance
3. Select currency to receive
4. Enter wallet address (or select from whitelist)
5. Click "Withdraw"
6. API: POST /api/referrals/withdraw
7. Earnings sent to wallet
```

---

# 13. ADMIN PANEL
*Only accessible to admin users*

## 13.1 Admin Login
**Route:** `/admin/login`

| Field | Description |
|-------|-------------|
| Email | Admin email |
| Password | Admin password |
| 2FA Code | Required for admin |

---

## 13.2 Admin Dashboard
**Route:** `/admin/dashboard`

### Stats Cards:
| Card | Shows |
|------|-------|
| Total Users | All registered users |
| Active Today | Users active in 24h |
| Pending KYC | Awaiting verification |
| Open Disputes | Unresolved disputes |
| 24h Volume | Trading volume |
| 24h Revenue | Fee revenue |

### Quick Actions:
| Button | Destination |
|--------|-------------|
| "View Users" | `/admin/users` |
| "Review KYC" | `/admin/kyc` |
| "Handle Disputes" | `/admin/disputes` |
| "Manage Fees" | `/admin/fees` |

---

## 13.3 Admin Users
**Route:** `/admin/users`

### Search:
| Field | Action |
|-------|--------|
| Search box | Search by email, name, user ID |
| Filter: KYC Level | 0, 1, 2, 3 |
| Filter: Status | Active, Frozen, Suspended |

### User Table:
| Column | Description |
|--------|-------------|
| User ID | Unique identifier |
| Email | User's email |
| Name | Display name |
| KYC Level | Verification level |
| Status | Active/Frozen |
| Joined | Registration date |
| Actions | View, Freeze, Delete |

### "View" Button:
- Opens user detail modal
- Shows all user info, balances, transactions
- Can adjust limits, reset password, etc.

### "Freeze" Button:
```
1. Click "Freeze"
2. Enter reason
3. Confirm
4. User cannot login or transact
5. Email sent to user
```

---

## 13.4 Admin Disputes
**Route:** `/admin/disputes`

### Dispute List:
| Column | Description |
|--------|-------------|
| ID | Dispute ID |
| Trade | Related trade |
| Complainant | Who filed |
| Respondent | Other party |
| Reason | Why disputed |
| Status | Open/Resolved |
| Actions | Review |

### "Review" Button:
```
1. Click "Review"
2. Opens dispute detail page
3. See:
   - Trade details
   - Chat history
   - Evidence from both parties
4. Decision buttons:
   - "Release to Buyer" - Buyer wins
   - "Release to Seller" - Seller wins
   - "Split" - Split the crypto
5. Add notes
6. Submit decision
7. Both parties notified
```

---

## 13.5 Admin Fees
**Route:** `/admin/fees`

### Fee Configuration:
| Fee Type | Current | Input |
|----------|---------|-------|
| Trading Fee | X% | Number input |
| Withdrawal Fee | X% | Number input |
| P2P Fee | X% | Number input |
| Instant Buy Fee | X% | Number input |
| Instant Sell Fee | X% | Number input |
| Savings Early Withdrawal | X% | Number input |

### "Save Changes" Button:
- API: POST /api/admin/fees/update
- Updates all fee configurations
- Takes effect immediately

---

## 13.6 Admin Withdrawals
**Route:** `/admin/withdrawals`

### Pending Withdrawals:
| Column | Description |
|--------|-------------|
| ID | Withdrawal ID |
| User | Who requested |
| Amount | How much |
| Currency | Which crypto |
| Address | Destination |
| Status | Pending/Processing |
| Actions | Approve/Reject |

### "Approve" Button:
```
1. Click "Approve"
2. Review details
3. Enter TX hash (after sending)
4. Click "Complete"
5. User notified
```

### "Reject" Button:
```
1. Click "Reject"
2. Enter reason
3. Confirm
4. Funds returned to user's balance
5. User notified with reason
```

---

# APPENDIX A: API ENDPOINT REFERENCE

## Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/forgot-password` | POST | Request reset |
| `/api/auth/reset-password` | POST | Set new password |
| `/api/auth/verify-email` | GET | Verify email |
| `/api/auth/2fa/enable` | POST | Enable 2FA |
| `/api/auth/2fa/disable` | POST | Disable 2FA |
| `/api/auth/2fa/verify` | POST | Verify 2FA code |

## Wallet
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallets/balances/{user_id}` | GET | Get balances |
| `/api/wallet/deposit-address` | GET | Get deposit address |
| `/api/wallet/withdraw` | POST | Request withdrawal |
| `/api/wallet/whitelist/{user_id}` | GET | Get whitelisted addresses |
| `/api/wallet/whitelist/add` | POST | Add to whitelist |
| `/api/wallet/whitelist/verify/{token}` | GET | Verify address |

## Trading
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trading/order` | POST | Place order |
| `/api/trading/order/{id}` | DELETE | Cancel order |
| `/api/trading/orders/{user_id}` | GET | Get open orders |
| `/api/trading/swap` | POST | Swap crypto |
| `/api/markets` | GET | Get all markets |
| `/api/orderbook/{pair}` | GET | Get order book |

## P2P
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/p2p/offers` | GET | List offers |
| `/api/p2p/offer/create` | POST | Create offer |
| `/api/p2p/trade/create` | POST | Start trade |
| `/api/p2p/trade/{id}` | GET | Get trade details |
| `/api/p2p/trade/mark-paid` | POST | Mark as paid |
| `/api/p2p/trade/release` | POST | Release crypto |
| `/api/p2p/dispute/create` | POST | Open dispute |

## Savings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/savings/products` | GET | Get lock options |
| `/api/savings/initiate` | POST | Start deposit |
| `/api/savings/balances/{user_id}` | GET | Get savings balances |
| `/api/savings/start-notice` | POST | Start notice period |
| `/api/savings/withdraw` | POST | Withdraw from savings |

---

# APPENDIX B: ERROR MESSAGES

| Code | Message | Meaning |
|------|---------|--------|
| 401 | Invalid credentials | Wrong email/password |
| 401 | Invalid credentials. X attempts remaining | Wrong password, counting |
| 429 | Account temporarily locked | Too many failed attempts |
| 403 | Account suspended | User is frozen |
| 400 | Insufficient balance | Not enough funds |
| 400 | Amount below minimum | Too small |
| 400 | Amount above maximum | Too large |
| 404 | User not found | Invalid user ID |
| 404 | Trade not found | Invalid trade ID |
| 409 | Duplicate request | Idempotency blocked |
| 503 | Service unavailable | Feature disabled |

---

**END OF DOCUMENT**

*This document covers every button, action, and flow on the CoinHubX platform.*
*For updates or corrections, contact the development team.*
