# REMAINING TASKS - IMMEDIATE ACTION

## 1. Portfolio Pages - AUTO-REFRESH ADDED ✅
- Added 10-second polling to WalletPage.js
- Added 10-second polling to PortfolioPageEnhanced.js
- Both pages now auto-refresh balances

## 2. Express Pay / P2P Express
- Backend endpoint exists and looks correct
- Issue likely: User insufficient GBP balance
- Check: User needs GBP to buy crypto
- Frontend shows error if balance is low

## 3. REMAINING FEE INTEGRATIONS (5 types)

### Types to Verify/Integrate:
1. **VAULT_TRANSFER** - Config exists but no endpoint found
   - May not be implemented yet
   
2. **STAKING_SPREAD** - No staking system found
   - May not be implemented yet
   
3. **SPREAD_PROFIT** (Admin Liquidity 0.5%)
   - Trading spread exists (+0.5% buy, -0.5% sell)
   - Currently: Spread profit NOT tracked for commission
   - Action: Track spread and generate referral commission
   
4. **FIAT_WITHDRAWAL** - Uses same crypto withdrawal endpoint
   - May need separate fee tracking
   
5. **PAYMENT_GATEWAY_UPLIFT** - No gateway found
   - May not be implemented yet

### Confirmed Complete (12/17):
✅ TRADING
✅ P2P_MAKER
✅ P2P_TAKER
✅ P2P_EXPRESS
✅ P2P_DISPUTE
✅ INSTANT_BUY
✅ INSTANT_SELL
✅ SWAP
✅ NETWORK_WITHDRAWAL
✅ SAVINGS_DEPOSIT
✅ SAVINGS_EARLY_UNSTAKE
✅ CROSS_WALLET

## NEXT ACTIONS:

1. ✅ Add spread profit tracking to trading endpoint
2. Verify all 12 integrated fees are working correctly
3. Test end-to-end with referred user
4. Mark non-existent fees as "Not Implemented"
5. Update documentation

