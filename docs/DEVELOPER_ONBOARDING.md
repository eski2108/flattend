# 👋 Welcome to CoinHubX - Developer Onboarding Guide

**Last Updated:** November 2024  
**Purpose:** Quick onboarding guide for new developers/agents joining the project

---

## 🎯 Your First 30 Minutes

### Step 1: Read This File (5 min)
You're already here! This file will guide you through everything.

### Step 2: Understand What You're Building (10 min)
**Read:** [README.md](../README.md)

**Key Takeaways:**
- This is a cryptocurrency trading platform
- Users can: deposit crypto, trade P2P, swap coins, buy instantly
- Tech stack: React + FastAPI + MongoDB
- Currently has 5 critical bugs that need fixing

### Step 3: Learn the System Architecture (10 min)
**Read:** [ARCHITECTURE.md](ARCHITECTURE.md)

**Key Takeaways:**
- Backend: 12k line `server.py` + service files
- Frontend: React pages + shadcn UI components
- Database: MongoDB with 10+ collections
- 3rd party: NOWPayments for crypto deposits

### Step 4: Review Critical Issues (5 min)
**Read:** [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - Sections P0 and P1 only

**Critical Bugs:**
1. NOWPayments webhook broken (46+ deposits stuck)
2. P2P escrow release broken (trades can't complete)
3. Fee tracking missing (no audit trail)
4. Pricing system unstable (API rate limits)
5. Admin liquidity offers missing (instant buy broken)

---

## 🗺️ Documentation Map

```
📚 Documentation Structure

/docs/
├── DEVELOPER_ONBOARDING.md  ← You are here (start here)
├── README.md                ← Project overview & quick start
├── ARCHITECTURE.md          ← System design & file locations
├── FLOWS.md                 ← Money flow diagrams (critical!)
├── NOWPAYMENTS.md          ← Crypto deposits integration
├── API_ENDPOINTS.md         ← Complete API reference
└── KNOWN_ISSUES.md          ← All bugs & technical debt
```

### When to Read Each Document

**Before Starting Work:**
1. ✅ DEVELOPER_ONBOARDING.md (this file)
2. ✅ README.md
3. ✅ ARCHITECTURE.md

**When Fixing Specific Issues:**
- Crypto deposits → NOWPAYMENTS.md
- Money flows → FLOWS.md
- API calls → API_ENDPOINTS.md
- Known bugs → KNOWN_ISSUES.md

**When Building New Features:**
- All of the above
- Plus: Review existing similar features in codebase

---

## 🎯 Your First Task: Choose Your Path

### Path A: Fix Critical Bugs (Recommended)

**Start with:** The 5 P0 bugs in [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

**Priority order:**
1. NOWPayments webhook (highest impact)
2. P2P escrow release (user-facing)
3. Fee tracking (data integrity)
4. Pricing system (reliability)
5. Admin liquidity (feature completion)

**Process:**
```
1. Read KNOWN_ISSUES.md → Find your bug
2. Read FLOWS.md → Understand the flow
3. Read ARCHITECTURE.md → Find the files
4. Fix the bug
5. Test using testing agent
6. Update KNOWN_ISSUES.md (mark as fixed)
```

### Path B: Add New Feature

**Process:**
```
1. Understand requirements fully
2. Read ARCHITECTURE.md + FLOWS.md
3. Design the feature (database, API, UI)
4. Check for similar existing code
5. Implement incrementally
6. Test each piece
7. Update documentation
```

---

## 🔑 Critical Things to Know

### Money = Serious Business

**ALWAYS:**
- ✅ Test money flows end-to-end
- ✅ Use `wallet_service.py` for all balance operations
- ✅ Verify signatures on webhooks (security!)
- ✅ Log all transactions (audit trail)
- ✅ Check balance before debiting

**NEVER:**
- ❌ Update `wallets` collection directly
- ❌ Skip signature verification
- ❌ Hardcode amounts or fees
- ❌ Delete transaction records
- ❌ Deploy without testing

### The Golden Rules

1. **Read Before You Code**
   - Understand the existing system
   - Check if similar code exists
   - Don't reinvent the wheel

2. **Test Everything**
   - Use testing agent for money flows
   - Manual test with curl for simple endpoints
   - Screenshot tool for UI changes

3. **Document Your Changes**
   - Update relevant .md files
   - Add code comments for complex logic
   - Update API_ENDPOINTS.md if you add endpoints

4. **Ask Before Breaking**
   - If unsure, use `ask_human` tool
   - If stuck, use `troubleshoot_agent`
   - Don't assume, clarify

---

## 📁 File Location Quick Reference

### Backend Key Files

```
/app/backend/
├── server.py                     # Main app (12k lines)
│   ├── Lines 1-400:   Imports & models
│   ├── Lines 400-850: Auth endpoints
│   ├── Lines 850-1600: Legacy P2P
│   ├── Lines 1600-3000: Enhanced P2P
│   ├── Lines 3000-5000: Wallets
│   ├── Lines 5000-7000: NOWPayments
│   ├── Lines 7000-8000: Swaps
│   ├── Lines 8000-9000: Express Buy
│   └── Lines 9000-12000: Admin & fees
│
├── wallet_service.py             # All wallet operations
├── nowpayments_integration.py    # Crypto deposits
├── price_service.py              # Live pricing
└── .env                          # Environment variables
```

### Frontend Key Files

```
/app/frontend/src/
├── pages/
│   ├── InstantBuy.js             # Express buy UI
│   ├── WalletPage.js             # User wallets + deposits
│   ├── SwapCrypto.js             # Crypto swaps
│   ├── P2PMarketplace.js         # P2P trading
│   └── AdminEarnings.js          # Revenue dashboard
├── components/
│   ├── ui/                       # shadcn components
│   └── DepositModal.js           # NOWPayments UI
└── .env                          # Environment variables
```

### Database Collections

```
MongoDB collections:
├── users                  # User accounts
├── wallets                # User balances
├── admin_liquidity_wallets # Admin liquidity pool
├── internal_balances      # Platform fees
├── nowpayment_deposits    # Crypto deposits
├── p2p_trades             # P2P trades
├── swap_transactions      # Swaps
└── express_buy_transactions # Instant buys
```

---

## 🛠️ Development Workflow

### Making Code Changes

```bash
# 1. Understand the issue/feature
Read relevant documentation

# 2. Find the code
grep -r "function_name" /app/backend/
grep -r "ComponentName" /app/frontend/

# 3. Make changes
nano /app/backend/server.py

# 4. Test
# For money flows: Use testing agent
# For simple APIs: Use curl
# For UI: Use screenshot tool

# 5. Check logs (if needed)
tail -f /var/log/supervisor/backend.out.log

# 6. Restart (only if .env or dependencies changed)
sudo supervisorctl restart backend
```

### Testing Protocol

**Small Changes (single endpoint/component):**
```bash
# Backend: Test with curl
curl -X POST https://your-app.com/api/endpoint

# Frontend: Use screenshot tool
Take screenshot → Verify UI looks correct
```

**Money Flow Changes (deposits, trades, swaps):**
```bash
# ALWAYS use testing agent
1. Read /app/test_result.md
2. Call deep_testing_backend_v2 or auto_frontend_testing_agent
3. Review results
4. Fix issues
5. Re-test
```

---

## 🚨 Common Pitfalls

### Mistake 1: Skipping Documentation
❌ **Bad:** Jump straight to code  
✅ **Good:** Read FLOWS.md first, understand the full flow

### Mistake 2: Direct Database Updates
❌ **Bad:** `db.wallets.update_one({...})`  
✅ **Good:** `wallet_service.credit(user_id, currency, amount)`

### Mistake 3: Not Testing Money Flows
❌ **Bad:** "It works in my head"  
✅ **Good:** Use testing agent, verify in database

### Mistake 4: Hardcoding Values
❌ **Bad:** `BACKEND_URL = "https://example.com"`  
✅ **Good:** `BACKEND_URL = os.getenv('BACKEND_URL')`

### Mistake 5: Assuming Old Code is Correct
❌ **Bad:** Copy-paste existing code  
✅ **Good:** Understand existing code, check if it's buggy

---

## 📞 Getting Help

### When Stuck on a Bug
```
1. Check KNOWN_ISSUES.md → Is it a known issue?
2. Check FLOWS.md → Understand the expected flow
3. Check logs → What's the actual error?
4. Use troubleshoot_agent → Get expert help
5. Ask human → If truly unclear
```

### When Unsure About Requirements
```
1. Check README.md → What's the feature supposed to do?
2. Check FLOWS.md → How should it work?
3. Ask human → Clarify unclear requirements
```

---

## ✅ Success Checklist

Before declaring a task complete:

- [ ] Code changes made and tested
- [ ] Testing agent used (for money flows)
- [ ] No errors in backend/frontend logs
- [ ] Database updated correctly (checked manually)
- [ ] Documentation updated (if needed)
- [ ] Known issues list updated (if applicable)
- [ ] User can verify the change (provide test steps)

---

## 🎓 Learning Resources

### Internal Documentation
- **System design:** ARCHITECTURE.md
- **Money flows:** FLOWS.md
- **API specs:** API_ENDPOINTS.md
- **Integration guides:** NOWPAYMENTS.md
- **Bug tracking:** KNOWN_ISSUES.md

### External Resources
- **FastAPI:** https://fastapi.tiangolo.com
- **React:** https://react.dev
- **MongoDB:** https://www.mongodb.com/docs
- **NOWPayments API:** https://documenter.getpostman.com/view/7907941/S1a32n38

---

## 🚀 Ready to Start?

### Recommended First Tasks

**If you're new to the codebase:**
1. Fix BUG 3, 4, 5 (fee tracking) - Simple, low risk, teaches you the flow
2. Then move to BUG 1 (NOWPayments) - More complex, high impact
3. Finally BUG 2 (P2P escrow) - Most complex, requires deep understanding

**If you're experienced:**
1. Start with BUG 1 (NOWPayments) - Highest impact
2. Then BUG 2 (P2P escrow) - User-facing
3. Then BUG 6 (pricing system) - Requires architecture changes

---

## 📝 Quick Command Reference

```bash
# Service management
sudo supervisorctl status
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.out.log

# Database access
mongo
use coinhubx
show collections
db.users.find().limit(5)

# Find code
grep -rn "function_name" /app/backend/
grep -rn "ComponentName" /app/frontend/

# Test API
curl https://your-backend-url.com/api/
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@demo.com","password":"Demo1234"}'
```

---

## 🎯 Your Goal

**Make this platform "money-safe" and production-ready.**

That means:
1. ✅ All deposits credit correctly
2. ✅ All trades complete successfully
3. ✅ All fees are tracked and auditable
4. ✅ All pricing is reliable
5. ✅ All features work end-to-end

**You can do this! The documentation is here to help. Good luck! 🚀**

---

**Questions? Check the docs first, then ask!**

---

**END OF DEVELOPER_ONBOARDING.MD**
