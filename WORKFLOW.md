# CoinHubX Development Workflow

**CRITICAL: Follow this workflow for ALL future development to prevent breaking the platform.**

---

## 1. NEVER WORK DIRECTLY ON MAIN

The `main` branch is now protected. All work must be done on feature branches.

---

## 2. Workflow for Any New Task

### Step 1: Pull Latest Main
```bash
cd /app
git checkout main
git pull origin main
```

### Step 2: Create Feature Branch
```bash
# Name format: feature-<description> or bugfix-<description>
git checkout -b feature-your-feature-name

# Examples:
# git checkout -b feature-add-staking
# git checkout -b bugfix-wallet-sync
# git checkout -b feature-referral-ui-improvements
```

### Step 3: Make Your Changes
- Work ONLY on your feature branch
- Commit frequently with clear messages
- Test as you go

### Step 4: Run Automated Tests
```bash
bash /app/.ci/automated-tests.sh
```

**If tests fail, FIX THEM before proceeding.**

### Step 5: Manual Testing
Go through the **Pre-Merge Checklist** in `/app/.ci/pre-merge-checklist.md`

- [ ] Login works (desktop + mobile)
- [ ] All payment flows work
- [ ] Wallet/Portfolio data correct
- [ ] No console errors
- [ ] UI clean (no debug elements)

### Step 6: Document Your Changes
Update `/app/CHANGELOG.md` with:
- Date
- Branch name
- What you changed
- Which files were modified
- Test results

### Step 7: Merge to Main (ONLY IF ALL TESTS PASS)
```bash
# First, commit all your changes
git add -A
git commit -m "Your descriptive commit message"

# Switch to main and merge
git checkout main
git merge feature-your-feature-name

# Restart services
sudo supervisorctl restart all

# Final verification
bash /app/.ci/automated-tests.sh
```

---

## 3. Backend ↔ Frontend Connection Rules

### Configuration Files

**Backend:** `/app/backend/.env`
```
BACKEND_URL=<your-backend-url>
MONGO_URL=<your-mongodb-url>
```

**Frontend:** `/app/frontend/.env`
```
REACT_APP_BACKEND_URL=<same-as-backend-url>
```

### CRITICAL RULES:

1. **NEVER hardcode URLs in code files**
   - ❌ BAD: `axios.get('http://localhost:8001/api/users')`
   - ✅ GOOD: `axios.get(${process.env.REACT_APP_BACKEND_URL}/api/users)`

2. **If you change the backend URL/port:**
   - Update `/app/backend/.env`
   - Update `/app/frontend/.env`
   - Restart both services
   - Test with curl: `curl http://localhost:8001/api/health`
   - Test from browser

3. **All backend routes MUST start with `/api`**
   - This is required for Kubernetes ingress routing
   - ✅ `/api/users`
   - ✅ `/api/trading/execute`
   - ❌ `/users` (will not work)

---

## 4. Features That Must NEVER Break

These features are tested and working. DO NOT break them:

### Referral System
- Registration with referral code
- Commission calculation
- Referral dashboard

### Wallet & Portfolio
- Balance display
- Wallet and Portfolio totals must MATCH
- Auto-refresh

### Payment Flows
- P2P Express "Buy Now" button
- P2P Marketplace → Order Preview
- Trading Buy/Sell
- Swap Crypto

### Authentication
- Desktop login (1920x800)
- Mobile login (375x667)

### Internationalization
- Language switcher
- 4 languages (EN, PT, HI, AR)
- RTL for Arabic

### UI/UX
- Navigation menu
- Page layouts
- Responsive design

**If you need to modify any of these systems:**
1. Create a feature branch
2. Test EXTRA carefully
3. Document what changed and why
4. Get approval before merging

---

## 5. Rollback Procedure

If something breaks after a merge:

```bash
cd /app

# Option 1: Rollback to stable tag
git checkout v1.0-stable
sudo supervisorctl restart all

# Option 2: Undo last commit
git reset --hard HEAD~1
sudo supervisorctl restart all

# Option 3: Go to specific commit
git log --oneline  # find the commit hash
git checkout <commit-hash>
sudo supervisorctl restart all
```

---

## 6. Testing Strategy

### Before Every Merge:
1. **Automated tests** (run the script)
2. **Manual checklist** (use the markdown file)
3. **Visual inspection** (take screenshots if needed)

### Test on Both Viewports:
- Desktop: 1920x800
- Mobile: 375x667

### Test with Real User Flow:
1. Login
2. Check portfolio
3. Try a payment flow (P2P or Trading)
4. Check wallet balances
5. Test language switch

---

## 7. Communication Protocol

After completing any task, send a status update:

**Format:**
```
Date: [DATE]
Branch: [BRANCH_NAME]
Task: [WHAT_WAS_DONE]
Files Modified: [LIST_OF_FILES]
Tests Passed: [YES/NO]
Ready to Merge: [YES/NO]
Notes: [ANY_IMPORTANT_INFO]
```

**Example:**
```
Date: 2024-12-02
Branch: feature-add-staking
Task: Added staking functionality to savings vault
Files Modified:
  - /app/backend/server.py (added /api/staking endpoints)
  - /app/frontend/src/pages/Savings.js (added staking UI)
Tests Passed: YES (8/8 automated tests, all manual checks)
Ready to Merge: YES
Notes: Tested with 0.1 BTC stake, APY calculation correct
```

---

## 8. Emergency Procedures

### If Backend Won't Start:
```bash
tail -n 100 /var/log/supervisor/backend.err.log
# Check for missing imports or syntax errors
```

### If Frontend Won't Build:
```bash
tail -n 100 /var/log/supervisor/frontend.err.log
# Check for missing npm packages or import errors
```

### If Database Won't Connect:
```bash
sudo supervisorctl status mongodb
# Check MONGO_URL in /app/backend/.env
```

---

**Remember: Working on main directly is now FORBIDDEN. Always use feature branches and test before merging.**
