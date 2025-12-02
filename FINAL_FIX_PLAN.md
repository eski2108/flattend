# FINAL FIX - MAKE BOTH PAGES SHOW EXACT SAME VALUE

## PROBLEM:
- Wallet page and Portfolio page calling different APIs
- Different price data being returned
- Different calculations
- Result: Different totals

## SOLUTION:
Make BOTH pages call the `/api/wallets/balances` endpoint AND fix that endpoint to get prices correctly.

## STEPS:
1. Fix `/api/wallets/balances` to fetch live prices correctly
2. Revert Wallet page to use `/api/wallets/balances`  
3. Make Portfolio page ALSO use `/api/wallets/balances`
4. Both pages will then show EXACT same data

