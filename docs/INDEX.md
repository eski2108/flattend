# 📚 CoinHubX Documentation Index

**Complete documentation for the CoinHubX cryptocurrency trading platform**

---

## 🚀 Start Here

**New to the project?**
1. **[DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md)** ⭐ START HERE
2. **[README.md](../README.md)** - Project overview

---

## 📖 Core Documentation

### 1. **[ARCHITECTURE.md](ARCHITECTURE.md)**
**Purpose:** Complete system architecture overview

**Contains:**
- Tech stack details
- Database schema
- Backend services
- Frontend structure
- Money flow architecture

**When to read:** Before making any code changes

---

### 2. **[FLOWS.md](FLOWS.md)**
**Purpose:** Step-by-step flow diagrams for all features

**Contains:**
- NOWPayments deposit flow
- Express Buy flow
- P2P escrow flow
- Swap/Convert flow
- Withdrawal flow
- Referral commission flow
- Admin revenue tracking

**When to read:** Before fixing money-related bugs or building financial features

---

### 3. **[NOWPAYMENTS.md](NOWPAYMENTS.md)**
**Purpose:** Complete NOWPayments integration guide

**Contains:**
- What is NOWPayments
- Environment variables setup
- API endpoints
- Webhook (IPN) setup
- Testing guide
- Troubleshooting

**When to read:** When working on crypto deposits or webhook issues

---

### 4. **[API_ENDPOINTS.md](API_ENDPOINTS.md)**
**Purpose:** Complete API reference

**Contains:**
- All endpoints with examples
- Request/response formats
- Error responses
- Authentication

**When to read:** When building frontend or testing APIs

---

### 5. **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)**
**Purpose:** Complete list of bugs and technical debt

**Contains:**
- P0 critical bugs (must fix)
- P1 high priority issues
- P2 medium priority
- P3 technical debt
- Frontend, backend, database issues

**When to read:** Before starting work, to know what needs fixing

---

## 🎯 Quick Navigation

### By Role

**👨‍💻 Developer (New to project)**
1. [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md)
2. [README.md](../README.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

**🐛 Bug Fixer**
1. [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - Find the bug
2. [FLOWS.md](FLOWS.md) - Understand the flow
3. [ARCHITECTURE.md](ARCHITECTURE.md) - Find the code

**🏗️ Feature Builder**
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Understand system
2. [FLOWS.md](FLOWS.md) - Learn existing flows
3. [API_ENDPOINTS.md](API_ENDPOINTS.md) - API patterns

**🔌 Integration Specialist**
1. [NOWPAYMENTS.md](NOWPAYMENTS.md) - For crypto deposits
2. [ARCHITECTURE.md](ARCHITECTURE.md) - For pricing APIs
3. [FLOWS.md](FLOWS.md) - For referral system

---

## 📋 By Feature

**💰 Crypto Deposits**
- [NOWPAYMENTS.md](NOWPAYMENTS.md) - Integration guide
- [FLOWS.md](FLOWS.md#nowpayments-deposit-flow) - Complete flow
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-1) - Known bugs

**🤝 P2P Trading**
- [FLOWS.md](FLOWS.md#p2p-escrow-flow) - Complete flow
- [ARCHITECTURE.md](ARCHITECTURE.md#database-collections) - Schema
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-2) - Escrow bug

**🔄 Crypto Swaps**
- [FLOWS.md](FLOWS.md#swapconvert-flow) - Complete flow
- [API_ENDPOINTS.md](API_ENDPOINTS.md#swaps--conversions) - API
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-6) - Pricing issues

**🏪 Express Buy**
- [FLOWS.md](FLOWS.md#express-buy-flow) - Complete flow
- [ARCHITECTURE.md](ARCHITECTURE.md#admin-liquidity-wallets) - Liquidity
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-7) - Missing offers

**👑 Admin Features**
- [FLOWS.md](FLOWS.md#admin-revenue-tracking) - Revenue tracking
- [API_ENDPOINTS.md](API_ENDPOINTS.md#admin-endpoints) - Admin API
- [ARCHITECTURE.md](ARCHITECTURE.md#money-flow-architecture) - Revenue sources

---

## 🔍 By Task

**"I need to fix NOWPayments deposits"**
→ [NOWPAYMENTS.md](NOWPAYMENTS.md) + [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-1)

**"I need to fix P2P escrow"**
→ [FLOWS.md](FLOWS.md#p2p-escrow-flow) + [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-2)

**"I need to add fee tracking"**
→ [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-3) + [FLOWS.md](FLOWS.md)

**"I need to stabilize pricing"**
→ [KNOWN_ISSUES.md](KNOWN_ISSUES.md#bug-6) + [ARCHITECTURE.md](ARCHITECTURE.md#price_servicepy)

**"I need to understand the database"**
→ [ARCHITECTURE.md](ARCHITECTURE.md#database-collections)

**"I need API documentation"**
→ [API_ENDPOINTS.md](API_ENDPOINTS.md)

**"I need to test my changes"**
→ [README.md](../README.md#testing) + `/app/test_result.md`

---

## 📊 Document Stats

```
ARCHITECTURE.md          597 lines    System design
FLOWS.md               1,153 lines    Money flow diagrams
NOWPAYMENTS.md           871 lines    Integration guide
API_ENDPOINTS.md         952 lines    API reference
KNOWN_ISSUES.md          782 lines    Bug tracking
DEVELOPER_ONBOARDING.md  334 lines    New dev guide
README.md                570 lines    Project overview
────────────────────────────────────────────────────
TOTAL                  5,259 lines    Complete documentation
```

---

## 🔄 Keeping Documentation Updated

**When to update:**
- ✅ You fix a bug → Update KNOWN_ISSUES.md
- ✅ You add an API endpoint → Update API_ENDPOINTS.md
- ✅ You change a money flow → Update FLOWS.md
- ✅ You add a database collection → Update ARCHITECTURE.md
- ✅ You change integration → Update NOWPAYMENTS.md

**How to update:**
1. Edit the relevant .md file
2. Keep formatting consistent
3. Add to appropriate section
4. Test that links still work

---

## ❓ FAQ

**Q: Which doc should I read first?**
A: [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md)

**Q: How do I find where code lives?**
A: [ARCHITECTURE.md](ARCHITECTURE.md) → File Location Quick Reference

**Q: How do I understand a money flow?**
A: [FLOWS.md](FLOWS.md) → Find your flow → Read step-by-step

**Q: What bugs need fixing?**
A: [KNOWN_ISSUES.md](KNOWN_ISSUES.md) → P0 section

**Q: How do I test my changes?**
A: [README.md](../README.md#testing) → Testing section

**Q: Where are environment variables?**
A: [ARCHITECTURE.md](ARCHITECTURE.md#environment-variables) + [NOWPAYMENTS.md](NOWPAYMENTS.md#environment-variables)

---

## 🎯 Critical Reading

**Before touching ANY money-related code, read:**
1. [FLOWS.md](FLOWS.md) - Understand how money moves
2. [ARCHITECTURE.md](ARCHITECTURE.md#wallet_servicepy) - Learn wallet service
3. [KNOWN_ISSUES.md](KNOWN_ISSUES.md#critical-money-flow-bugs-p0) - Know the bugs

**This is CRITICAL to avoid breaking the money system!**

---

## 📞 Need Help?

1. **Check this index** → Find relevant doc
2. **Read the doc** → Most questions answered
3. **Search codebase** → `grep -r "your_term"`
4. **Check logs** → `/var/log/supervisor/`
5. **Use troubleshoot_agent** → For complex issues
6. **Ask human** → If truly unclear

---

**Built with ❤️ for future developers**

**END OF DOCUMENTATION INDEX**
