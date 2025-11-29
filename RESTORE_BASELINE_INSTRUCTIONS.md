# COINHUBX BASELINE RESTORE INSTRUCTIONS

## Latest Baseline: baseline-login-v2
**Created:** $(date)
**Status:** Production-ready premium login page with micro-adjustments

---

## Quick Restore Commands:

### Method 1: Git Tag Restore (Recommended)
```bash
cd /app
git reset --hard baseline-login-v2
sudo supervisorctl restart all
```

### Method 2: File Backup Restore
```bash
# View available baselines
ls -lah /app/frontend_baselines/

# Restore specific file
cp /app/frontend_baselines/Login_YYYYMMDD_HHMMSS.js /app/frontend/src/pages/Login.js

# Or restore entire baseline
cp -r /app/frontend_baselines/baseline_YYYYMMDD_HHMMSS/* /app/frontend/src/

sudo supervisorctl restart frontend
```

### Method 3: View All Git Tags
```bash
cd /app
git tag -l
git show baseline-login-v2
```

---

## Baseline History:
- `baseline-login-v2` - Premium login with micro-adjustments (CURRENT)
- `stable-baseline-v1` - Original stable layout frozen version

---

## To Create New Baseline After Changes:
```bash
cd /app
git add -A
git commit -m "Description of changes"
git tag -a "baseline-name-v3" -m "Description"
mkdir -p /app/frontend_baselines
cp -r /app/frontend/src /app/frontend_baselines/baseline_$(date '+%Y%m%d_%H%M%S')/
```

---

**IMPORTANT:** Always test after restoring a baseline!
