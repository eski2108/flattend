# ⚠️ BACKEND MASTER LOCK - DO NOT MODIFY ⚠️

**Date:** December 16, 2025
**Status:** FULLY AUDITED AND LOCKED

---

## 🔒 PROTECTED FILES

These files contain critical business logic. DO NOT modify without full testing:

1. `/app/backend/server.py` - Main API server
2. `/app/backend/admin_liquidity_quotes.py` - Instant Buy/Sell with price lock
3. `/app/backend/referral_engine.py` - Referral commission system

---

## 💰 COMPLETE REVENUE AUDIT

### ALL Revenue Sources → `admin_revenue` Collection:

| Source | File | Line | Revenue Type | Fee % |
|--------|------|------|--------------|-------|
| P2P Taker Fee | server.py | 3279 | P2P_TRADING | 1.0% |
| P2P Maker Fee | server.py | 3525 | P2P_TRADING | 1.0% |
| Savings Penalty | server.py | 5049 | OPTION_A_PENALTY | Variable |
| Swap Fee | server.py | 9815 | SWAP_EXCHANGE | 1.5% |
| Express Buy Spread | server.py | 12526 | SPREAD_PROFIT | 3.0% |
| Express Buy Fee | server.py | 12543 | FEE_REVENUE | 1.0% |
| P2P Dispute Fee | server.py | 24081 | DISPUTE_FEE | 2.0% |
| Instant Buy Spread | admin_liquidity_quotes.py | 401 | SPREAD_PROFIT | 3.0% |
| Instant Buy Fee | admin_liquidity_quotes.py | 424 | FEE_REVENUE | 1.0% |
| Instant Sell Spread | admin_liquidity_quotes.py | 565 | SPREAD_PROFIT | 2.5% |
| Instant Sell Fee | admin_liquidity_quotes.py | 588 | FEE_REVENUE | 1.0% |
| Referral Net Share | referral_engine.py | 188 | PLATFORM_NET_REVENUE | After commission |

---

## 📊 FEE CONFIGURATION (PLATFORM_CONFIG)

```python
PLATFORM_CONFIG = {
    # P2P Trading
    "p2p_maker_fee_percent": 1.0,
    "p2p_taker_fee_percent": 1.0,
    "p2p_express_fee_percent": 2.0,
    "dispute_fee_percent": 2.0,
    
    # Instant Buy/Sell
    "instant_buy_fee_percent": 3.0,
    "instant_sell_fee_percent": 2.0,
    
    # Swaps
    "swap_fee_percent": 1.5,
    
    # Withdrawals
    "withdrawal_fee_percent": 1.0,
    "fiat_withdrawal_fee_percent": 1.0,
    
    # Savings
    "savings_stake_fee_percent": 0.5,
    
    # Trading
    "trading_fee_percent": 0.1,
    "spot_trading_fee_percent": 3.0,
}
```

---

## 🔐 SPREAD PROTECTION (PROFIT GUARANTEE)

### Instant Buy (User buys, Admin sells):
- **Default Spread:** 3.0% ABOVE market
- **Minimum Spread:** 0.5%
- **Validation:** If spread ≤ 0, CRITICAL ERROR thrown
- **Result:** Admin ALWAYS profits on sales

### Instant Sell (User sells, Admin buys):
- **Default Spread:** -2.5% (buys BELOW market)
- **Minimum Spread:** -0.5%
- **Validation:** If spread ≥ 0, CRITICAL ERROR thrown
- **Result:** Admin ALWAYS profits on purchases

---

## 💼 LIQUIDITY SYSTEM

### Collection: `admin_liquidity_wallets`

**Endpoints:**
- `POST /api/admin/liquidity/add` - Add liquidity
- `GET /api/admin/liquidity/balances` - View all balances
- `GET /api/admin/liquidity/balance/{currency}` - View specific currency
- `GET /api/admin/liquidity/history` - View history

**Used By:**
- Instant Buy - Checks admin has crypto to sell
- Instant Sell - Checks admin has GBP to pay
- Express Buy - Fallback to P2P if insufficient

---

## 👥 REFERRAL SYSTEM

### Commission Tiers:
| Tier | Commission Rate |
|------|----------------|
| Standard | 20% of fee |
| VIP | 20% of fee |
| Golden | 50% of fee |

### Flow:
1. User pays fee → Referral engine triggered
2. Commission calculated based on tier
3. Referrer's `trader_balances` credited
4. Logged to `referral_commissions`
5. Stats updated in `referral_stats`
6. Platform's net share → `admin_revenue`

### Collections Updated:
- `trader_balances` - Referrer wallet
- `referral_commissions` - Individual records
- `referral_stats` - Lifetime totals
- `referral_earnings` - By currency
- `admin_revenue` - Platform's share

---

## ✅ VERIFICATION CHECKLIST

- [x] P2P fees → admin_revenue
- [x] Swap fees → admin_revenue
- [x] Instant Buy spread → admin_revenue
- [x] Instant Buy fee → admin_revenue
- [x] Instant Sell spread → admin_revenue
- [x] Instant Sell fee → admin_revenue
- [x] Express Buy spread → admin_revenue
- [x] Express Buy fee → admin_revenue
- [x] Savings penalties → admin_revenue
- [x] Dispute fees → admin_revenue
- [x] Referral commissions → referrer wallets
- [x] Referral net share → admin_revenue
- [x] Liquidity system → admin_liquidity_wallets
- [x] Spread protection → Validation in place

---

## ⛔ DO NOT MODIFY

These values are critical for business profitability:

1. `admin_sell_spread_percent` (default: 3.0%)
2. `admin_buy_spread_percent` (default: -2.5%)
3. `MIN_SELL_SPREAD` (0.5%)
4. `MIN_BUY_SPREAD` (-0.5%)
5. All PLATFORM_CONFIG fee percentages

---

**THIS BACKEND IS COMPLETE AND LOCKED.**
