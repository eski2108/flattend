# 🔄 QUICK RESTORE GUIDE

## To Restore "Google Auth Working" Baseline:

### Option 1: Git Tag (Fastest)
```bash
cd /app
git checkout baseline-google-auth-working
sudo supervisorctl restart all
```

### Option 2: View What Changed Since Baseline
```bash
cd /app
git diff baseline-google-auth-working
```

### Option 3: List All Available Baselines
```bash
cd /app
git tag -l | grep baseline
```

## Available Baselines:
- `baseline-google-auth-working` ← **LATEST** (Google OAuth fully working)
- `baseline-password-reset-working` (Password reset working)
- `baseline-login-v2` (Premium login design)
- `stable-baseline-v1` (Initial stable state)

## To See What's in a Baseline:
```bash
git show baseline-google-auth-working:BASELINE_GOOGLE_AUTH_WORKING.md
```
