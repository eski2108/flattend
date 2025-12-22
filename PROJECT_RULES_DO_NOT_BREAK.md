# 🚨🚨🚨 PROJECT RULES - DO NOT BREAK 🚨🚨🚨

## ⛔ THIS FILE IS LAW. READ IT BEFORE TOUCHING ANY CODE. ⛔

---

# 🚫 ABSOLUTE RULES (NO EXCEPTIONS)

## 1. DO NOT REBUILD, REFACTOR, REORGANISE, RENAME, OR "IMPROVE" ANY EXISTING CODE

- If something already exists and works, you are **NOT ALLOWED TO TOUCH IT**
- **NO** restructuring
- **NO** optimisation
- **NO** "clean up"
- **NO** "better approach"

## 2. DO NOT REINTERPRET OR REDESIGN FLOWS

- P2P flow is **FINAL**
- Escrow model is **FINAL**
- Button logic is **FINAL**
- Status transitions are **FINAL**

## 3. DO NOT FIX ONE THING BY TOUCHING UNRELATED FILES

- If the issue is email → you touch **ONLY** email code
- If the issue is UI → you touch **ONLY** UI code
- Touching auth, wallet, escrow, or P2P logic for unrelated fixes is **FORBIDDEN**

## 4. DO NOT RELY ON SCREENSHOTS AS PROOF

- Screenshots ≠ working
- UI loading ≠ functional
- "Page renders" ≠ correct

---

# ✅ WHAT IS ALLOWED (VERY SPECIFIC)

You may **ONLY** do the following:

## 1. Targeted Bug Fixes

Only when a bug is identified with:
- File name
- Line number
- Exact expected vs actual behaviour

## 2. Verification Work

Confirming:
- Buttons exist
- API endpoints are called
- Status changes occur
- Wallet balances change correctly
- Escrow locks/releases correctly

## 3. Documentation

- Describing what **ALREADY** exists
- **NOT** inventing new behaviour

---

# 🔒 CRITICAL SYSTEMS ARE LOCKED (READ-ONLY)

The following systems are **READ-ONLY** unless explicitly authorised in writing:

| System | Status |
|--------|--------|
| Wallet balances | 🔒 LOCKED |
| Escrow logic | 🔒 LOCKED |
| P2P status transitions | 🔒 LOCKED |
| Fee calculations | 🔒 LOCKED |
| Admin revenue logic | 🔒 LOCKED |
| Withdrawals | 🔒 LOCKED |
| Authentication core | 🔒 LOCKED |

**Touching these without approval = STOP WORK IMMEDIATELY.**

---

# 🧠 SINGLE SOURCE OF TRUTH (FINAL - DO NOT RE-IMPLEMENT)

## P2P Buttons (ALL EXIST - DO NOT RECREATE):

| Button | Endpoint | File |
|--------|----------|------|
| Mark as Paid | `POST /api/p2p/trade/mark-paid` | `P2POrderPage.js` line 145 |
| Release Crypto | `POST /api/p2p/trade/release` | `P2POrderPage.js` line 164 |
| Upload Payment Proof | `POST /api/p2p/trade/message` | `P2POrderPage.js` line 127 |
| Dispute | `POST /api/p2p/trade/dispute` | `P2POrderPage.js` line 183 |
| Cancel Order | `POST /api/p2p/trade/cancel` | `P2POrderPage.js` line 209 |

## P2P Statuses (FINAL):

```
pending_payment → payment_made → completed
                ↘ disputed
                ↘ cancelled
```

## Escrow Model (FINAL):

- **Database-level locking** (NOT blockchain)
- `seller.available → seller.locked → buyer.available`
- No on-chain transactions during P2P trades
- Blockchain ONLY for deposits/withdrawals

---

# 🛑 HOW WORK IS ACCEPTED

Work is **ONLY** considered done when **ALL** of the following are shown:

1. ✅ Button click
2. ✅ API endpoint hit (with HTTP status)
3. ✅ Database state change
4. ✅ Wallet/escrow balance update
5. ✅ Correct status transition
6. ✅ Relevant email/log triggered

**If any step is missing → work is NOT complete.**

---

# ⚠️ FINAL WARNING

Repeated cycles of:
- "Fixed" → later broken
- Rebuilding existing logic
- Touching unrelated systems

**WILL RESULT IN IMMEDIATE TERMINATION OF WORK.**

This project cannot continue in circles.

---

# 📋 WHAT HAS BEEN COMPLETED (DO NOT REPEAT)

See: `/app/MASTER_IMPLEMENTATION_LOG.md`

**Key items already done:**
- ✅ P2P buttons (all 5 exist and work)
- ✅ P2P status transitions (verified with live API test)
- ✅ Escrow lock/release (verified with balance changes)
- ✅ Cryptographic security (HSM, quantum-resistant)
- ✅ Payment verification layer
- ✅ Dispute resolution system
- ✅ Fee collection to admin dashboard
- ✅ 29 validation tests passing
- ✅ **i18n / TRANSLATION SYSTEM (COMPLETED 2025-12-22)**

**DO NOT REBUILD ANY OF THE ABOVE.**

---

# 🌐 TRANSLATION SYSTEM IS COMPLETE - DO NOT TOUCH

**Added 2025-12-22:**

The internationalization (i18n) system is **FULLY WORKING**:

| What | Status |
|------|--------|
| react-i18next setup | ✅ DONE |
| LanguageSwitcher component | ✅ DONE |
| Dashboard translations | ✅ DONE |
| Wallet translations | ✅ DONE |
| Sidebar navigation translations | ✅ DONE |
| 6 languages fully translated (EN, ES, FR, DE, PT, IT) | ✅ DONE |
| 30 languages available in dropdown | ✅ DONE |
| Language persistence (localStorage) | ✅ DONE |

**PROOF:** Screenshots taken showing German, Portuguese, Italian - ALL text translates.

**DO NOT:**
- Recreate the i18n setup
- Add new useTranslation hooks to files that already have them
- Modify the LanguageSwitcher
- Change translation JSON structure
- "Improve" or refactor any translation code

---

# 🔴 BEFORE YOU DO ANYTHING:

1. Read `/app/MASTER_IMPLEMENTATION_LOG.md`
2. Read this file completely
3. Check if the work is already done
4. If unsure, **ASK** - do not assume and rebuild

---

**Created:** 2025-08-26
**Updated:** 2025-12-22 (Added i18n completion note)
**Status:** ACTIVE AND ENFORCED
