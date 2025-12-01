# 🔄 QUICK RESTORE GUIDE - ALL BASELINES

## 📍 Available Restore Points:

### 1. **UI_BASELINE_PREMIUM_v1** (⭐ LATEST)
**What's in it:**
- TradingView Lightweight Charts (GPU-accelerated)
- Premium emoji icons for all cryptos
- Perfect 64px row alignment
- Hover glow + press animations
- 8s ticker speed (premium feel)
- 24px consistent spacing
- No footer ticker

**Restore:**
```bash
cd /app
git checkout UI_BASELINE_PREMIUM_v1
sudo supervisorctl restart frontend
```

---

### 2. **UI_BASELINE_STABLE**
**What's in it:**
- Original stable Dashboard layout
- Header/Footer locked
- Ticker working
- Basic asset table

**Restore:**
```bash
cd /app
git checkout UI_BASELINE_STABLE
sudo supervisorctl restart frontend
```

---

### 3. **baseline-google-auth-working**
**What's in it:**
- Google OAuth fully functional
- Phone verification working
- Email/Password login
- Password reset flow
- Registration complete

**Restore:**
```bash
cd /app
git checkout baseline-google-auth-working
sudo supervisorctl restart all
```

---

### 4. **baseline-password-reset-working**
**What's in it:**
- Forgot Password working
- Reset Password working
- Email notifications

**Restore:**
```bash
cd /app
git checkout baseline-password-reset-working
sudo supervisorctl restart all
```

---

### 5. **baseline-login-v2**
**What's in it:**
- Premium login page design
- Pulsing logo animation
- Glassmorphism styling

**Restore:**
```bash
cd /app
git checkout baseline-login-v2
sudo supervisorctl restart frontend
```

---

## 🔍 View All Available Baselines:

```bash
cd /app
git tag -l | grep baseline
```

---

## 📝 View Baseline Documentation:

```bash
# Premium UI docs
cat /app/UI_PREMIUM_BASELINE_COMPLETE.md

# Google Auth docs
cat /app/BASELINE_GOOGLE_AUTH_WORKING.md

# Password Reset docs
cat /app/PASSWORD_RESET_BASELINE.md
```

---

## ⚠️ If Something Breaks:

1. **First, try restarting services:**
   ```bash
   sudo supervisorctl restart all
   ```

2. **If still broken, restore to last known good:**
   ```bash
   cd /app
   git checkout UI_BASELINE_PREMIUM_v1
   sudo supervisorctl restart all
   ```

3. **Check logs:**
   ```bash
   # Frontend
   tail -n 100 /var/log/supervisor/frontend.err.log
   
   # Backend
   tail -n 100 /var/log/supervisor/backend.err.log
   ```

4. **Hard reset (nuclear option):**
   ```bash
   cd /app
   git reset --hard UI_BASELINE_STABLE
   sudo supervisorctl restart all
   ```

---

## 🛡️ Protected Files (DO NOT MODIFY):

- `/app/frontend/src/components/Layout.js`
- `/app/frontend/src/components/PriceTickerEnhanced.js`
- Homepage hero section

These are locked in `UI_BASELINE_STABLE` and should only be modified with extreme care.

---

*Last updated: 2025-11-30 01:22 UTC*