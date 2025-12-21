# CoinHubX Monitoring Setup - FINAL

## ✅ What's Configured

### 1. Health Endpoint (for UptimeRobot)
```
GET /api/health
Returns: {"status": "healthy", "service": "coinhubx-backend", "timestamp": "..."}
```

**URL to monitor:** `https://YOUR_DOMAIN/api/health`

### 2. GitHub Actions (CI Only)
- Runs on push to `main` branch
- Runs Playwright tests
- Sends Slack notification on test failure
- **Does NOT do uptime monitoring**

### 3. Bug Report Button (In-App)
Captures:
- ✅ Page URL
- ✅ User ID (if logged in)
- ✅ Device/Browser info (platform, viewport, userAgent)
- ✅ Timestamp
- ✅ Screenshot (optional - user clicks "Capture Screenshot")
- ✅ Console errors (last 10 automatically captured)

Sends to:
- ✅ MongoDB (`bug_reports` collection)
- ✅ Slack (detailed block message)
- ✅ Email (backup via SendGrid)

### 4. Backend Critical Error Alerts
- Function `send_slack_critical_error()` available
- Sends formatted error messages to Slack

---

## 🔧 You Need To Set Up

### Step 1: UptimeRobot (FREE - handles uptime monitoring)

1. Go to https://uptimerobot.com and sign up
2. Click **"Add New Monitor"**
3. Configure:
   - **Type:** HTTP(s)
   - **Friendly Name:** CoinHubX API Health
   - **URL:** `https://YOUR_PRODUCTION_DOMAIN/api/health`
   - **Monitoring Interval:** 5 minutes
4. Add Alert Contacts:
   - Your email (automatic)
   - Slack webhook (see below)

### Step 2: Slack Webhook

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: `CoinHubX Alerts`
4. Click **"Incoming Webhooks"** → Toggle ON
5. Click **"Add New Webhook to Workspace"**
6. Select channel: `#website-alerts`
7. Copy the webhook URL

### Step 3: Add Environment Variables

Add to your backend `.env` file:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

Add to GitHub Secrets (for CI notifications):
- `SLACK_WEBHOOK_URL` = same webhook URL
- `TEST_URL` = your production site URL

---

## 📊 What Gets Sent Where

| Event | Slack | Email | Database |
|-------|-------|-------|----------|
| Site Down (UptimeRobot) | ✅ | ✅ | - |
| CI Test Failure | ✅ | - | - |
| Bug Report | ✅ | ✅ | ✅ |
| Backend Critical Error | ✅ | - | - |

---

## ⚠️ IMPORTANT: URL Confirmation

**I am NOT monitoring any preview links.**

UptimeRobot should monitor your **real production URL**:
- Example: `https://coinhubx.net/api/health`
- Or: `https://app.coinhubx.net/api/health`

**You need to tell me your stable production URL** so I can confirm the setup.

---

## 🧪 Test the Setup

### Test Health Endpoint:
```bash
curl https://YOUR_DOMAIN/api/health
```
Expected: `{"status":"healthy",...}`

### Test Bug Report:
1. Open your site
2. Click red "Bug?" button (bottom right)
3. Fill form and submit
4. Check Slack channel for notification

### Test CI:
1. Push code to `main` branch
2. Check GitHub Actions tab
3. If tests fail, check Slack for alert

---

## 📁 Files Modified

- `/.github/workflows/ci-tests.yml` - CI only (no uptime monitoring)
- `/backend/server.py` - Bug report endpoint + Slack alerts
- `/frontend/src/components/BugReportButton.jsx` - Full capture
- `/frontend/src/components/BugReportButton.css` - Styling

**No UI/layout changes were made.**
