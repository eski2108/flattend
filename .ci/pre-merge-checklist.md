# Pre-Merge Checklist

**Before merging ANY branch to main, you MUST verify:**

## 1. Automated Tests
- [ ] Run `bash /app/.ci/automated-tests.sh`
- [ ] All tests pass (0 failures)

## 2. Manual Critical Flow Tests

### Authentication
- [ ] Desktop login works (1920x800)
- [ ] Mobile login works (375x667)
- [ ] Dashboard redirect after login

### Payment Flows
- [ ] P2P Marketplace: Click Buy → Order Preview (no errors)
- [ ] P2P Express: Enter amount → "Buy Now" button appears
- [ ] Trading: BUY button clickable and functional
- [ ] Trading: SELL button clickable and functional
- [ ] Swap Crypto: Swap button works

### Data Display
- [ ] Dashboard shows correct portfolio values
- [ ] Wallet page shows all balances
- [ ] Portfolio and Wallet totals MATCH
- [ ] Transaction history loads

### Referral System
- [ ] Registration with referral code works
- [ ] Referral commission calculated correctly
- [ ] Referral dashboard at /referrals shows data

### Internationalization
- [ ] Language switcher visible
- [ ] All 4 languages work (EN, PT, HI, AR)
- [ ] Arabic displays correctly (RTL)
- [ ] User language preference saves

### UI/UX
- [ ] No debug elements visible (green boxes, test text)
- [ ] No console errors (except known external widgets)
- [ ] Navigation menu works
- [ ] Pages properly styled
- [ ] Mobile responsive

## 3. Code Quality
- [ ] No hardcoded URLs in code
- [ ] All API calls use environment variables
- [ ] No TODOs or FIXMEs left in critical code
- [ ] No commented-out large blocks of code

## 4. Documentation
- [ ] CHANGELOG updated with changes
- [ ] Files modified are documented
- [ ] Any breaking changes noted

---

**If ALL checkboxes are ticked, you may merge to main.**

**If ANY checkbox is NOT ticked, FIX IT before merging.**
