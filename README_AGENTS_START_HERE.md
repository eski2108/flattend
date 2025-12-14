# 🚀 AGENTS: START HERE

**Before doing ANY work on this project, read these files:**

---

## 📋 CRITICAL FILES TO READ FIRST

### 1. **CRITICAL_GIT_SAVE_INSTRUCTIONS.md** 🚨
**Purpose:** Instructions for saving to ALL 10 GitHub repositories
**Why:** The user requires ALL changes pushed to 10 different repos. Failing to do this causes major frustration.

👉 **READ THIS:** `/app/CRITICAL_GIT_SAVE_INSTRUCTIONS.md`

---

### 2. **LOCKED_BUILD.md**
**Purpose:** Lists files that are locked and cannot be modified
**Why:** Modifying locked files breaks the trading system

👉 **Location:** `/app/LOCKED_BUILD.md`

---

### 3. **NOWPAYMENTS_DEPOSIT_FIX_COMPLETE.md**
**Purpose:** Documentation of the NowPayments deposit address integration
**Why:** Explains how deposit addresses work and what's been fixed

👉 **Location:** `/app/NOWPAYMENTS_DEPOSIT_FIX_COMPLETE.md`

---

## ⚡ QUICK REFERENCE

### When user says "Save to GitHub":
```bash
cd /app
git add -A
git commit --no-verify -m "Your message"
for remote in brand-new c-hub coinhubx coinx1 crypto-livr flattend hub-x latest-coinhubx latest-work x1; do 
  git push $remote main --force
done
```

### Check what's running:
```bash
sudo supervisorctl status
```

### Restart services:
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### View logs:
```bash
tail -50 /var/log/supervisor/backend.err.log
tail -50 /var/log/supervisor/frontend.out.log
```

---

## 🏗️ PROJECT STRUCTURE

```
/app/
├── backend/          # Python FastAPI backend
│   ├── server.py     # Main server (12K+ lines)
│   ├── platform_wallet.py
│   └── nowpayments_integration.py
├── frontend/         # React frontend
│   └── src/
│       └── pages/    # All React pages
└── backups/          # MongoDB backups
```

---

## 🔐 IMPORTANT CREDENTIALS

**MongoDB:** Configured in `/app/backend/.env` as `MONGO_URL`
**Backend URL:** Configured in `/app/frontend/.env` as `REACT_APP_BACKEND_URL`
**NowPayments:** API keys in `/app/backend/.env`

**⚠️ NEVER modify these .env URLs unless explicitly told to do so.**

---

## 🚨 COMMON MISTAKES TO AVOID

1. ❌ Only pushing to 1 GitHub repo instead of all 10
2. ❌ Modifying locked files in LOCKED_BUILD.md
3. ❌ Changing URLs in .env files
4. ❌ Using `npm` instead of `yarn` for frontend
5. ❌ Not restarting services after changes

---

## 📞 USER EXPECTATIONS

- **Be honest** about what works and what doesn't
- **Push to all 10 repos** when saving
- **Test before claiming something works**
- **Don't use placeholder data** if real APIs are available
- **Report failures accurately** - don't lie about success

---

**The user has low tolerance for:**
- Dishonesty about functionality
- Forgetting to push to all repos
- Breaking existing features
- Wasting time

**Be direct, efficient, and accurate.**

---

*Read CRITICAL_GIT_SAVE_INSTRUCTIONS.md NOW before proceeding.*