# HOW FEES WORK - FROM COLLECTION TO REAL MONEY

## THE CURRENT SYSTEM

### Where Fees Are Collected:

| Fee Type | % | Collected In | Goes To |
|----------|---|--------------|---------|
| P2P Maker Fee | 1% | Crypto (BTC/ETH) | `admin_wallet` |
| P2P Taker Fee | 1% | Fiat (GBP) | `admin_wallet` |
| P2P Express Fee | 2% | Fiat (GBP) | `PLATFORM_FEES` |
| Swap Fee | 0.5% | Crypto | `PLATFORM_TREASURY_WALLET` |
| Instant Buy Spread | ~2% | Fiat | `admin_revenue` |
| Withdrawal Fee | £3 flat | Fiat | `admin_revenue` |
| Deposit Fee | £2.50 | Fiat | `admin_revenue` |

### Current Balances (from DB):
```
admin_wallet:
  BTC: 0.00106 (~£50 @ £50k/BTC)
  GBP: £95.00

Total admin_revenue logged: £126.68 GBP + 0.00116 BTC
```

---

## HOW TO CONVERT FEES TO REAL MONEY

### Option 1: Manual Withdrawal (Current)

1. **Login to Admin Dashboard**
2. **View collected fees** at `/admin/fees/revenue-stats`
3. **Manual transfer** from platform wallet to your personal wallet
4. **Sell crypto** on exchange (Binance/Coinbase) for fiat
5. **Withdraw to bank**

### Option 2: Automated Payout System (Recommended)

Build an admin endpoint that:
1. Aggregates fees from all sources
2. Converts crypto fees to USDT/GBP via exchange API
3. Triggers payout to designated bank account via payment provider

---

## THE MONEY FLOW (Real World)

```
USER DEPOSITS £1000
    ↓
    (via Bank Transfer / Card)
    ↓
YOUR PAYMENT PROVIDER (Stripe/PayPal/TrueLayer)
    ↓
    Funds land in YOUR BUSINESS BANK ACCOUNT
    ↓
PLATFORM CREDITS user's GBP balance (internal ledger)


USER BUYS 0.02 BTC via P2P
    ↓
    Buyer pays £1000 to Seller (external - bank to bank)
    ↓
    Platform takes 1% fee = £10 (from buyer's platform balance)
    ↓
    £10 goes to admin_wallet (internal)
    ↓
    Seller releases 0.02 BTC from escrow
    ↓
    Platform takes 1% maker fee = 0.0002 BTC
    ↓
    0.0002 BTC goes to admin_wallet


USER WITHDRAWS £500
    ↓
    Platform deducts £500 + £3 fee from user balance
    ↓
    £3 fee goes to admin_revenue
    ↓
    YOUR PAYMENT PROVIDER sends £500 to user's bank
    ↓
    (Money comes from your business bank account)
```

---

## KEY POINT: PLATFORM IS A LEDGER

**CoinHubX does NOT hold real crypto in a blockchain wallet during P2P trades.**

- All balances are DATABASE ENTRIES (ledger)
- Crypto only moves on-chain when user DEPOSITS or WITHDRAWS
- P2P trades = internal ledger transfers
- Fees = entries credited to admin wallets

### To access the money:

1. **Fiat fees (GBP)**: Already in your payment provider → transfer to bank
2. **Crypto fees (BTC/ETH)**: 
   - Option A: Withdraw to your exchange wallet → sell → withdraw fiat
   - Option B: Keep as crypto reserve for user withdrawals

---

## WHAT YOU NEED TO GO LIVE

1. **Payment Provider Integration**
   - TrueLayer (UK bank transfers)
   - Stripe (cards)
   - PayPal
   
2. **Crypto Liquidity**
   - NOWPayments for deposits/withdrawals
   - OR your own hot wallet with exchange connection

3. **Business Bank Account**
   - Receives fiat deposits
   - Pays out fiat withdrawals
   - Your fees accumulate here

4. **Admin Withdrawal Function**
   - Button to transfer fees to your personal account
   - Audit trail for accounting

---

## DASHBOARD SHOWS FEES?

**YES** - The admin dashboard reads from:
- `admin_revenue` collection (all fee transactions)
- `admin_wallet` balances
- `PLATFORM_FEES` balances

**Endpoint:** `GET /api/admin/fees/revenue-stats`

```json
{
  "p2p_fees_total": 12.45,
  "swap_fees_total": 0.0016,
  "express_buy_fees_total": 4.00,
  "total_fees": 126.68
}
```

---

## SUMMARY

| Question | Answer |
|----------|--------|
| Do fees go to dashboard? | ✅ YES - all logged to `admin_revenue` |
| Where is the money? | In your PAYMENT PROVIDER (fiat) or PLATFORM WALLET (crypto) |
| How to get real money? | Withdraw from payment provider to bank |
| Is it automatic? | NO - requires admin action (or build automation) |
