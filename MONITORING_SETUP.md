# CoinHubX Monitoring - 100% FREE Setup

All tools are FREE. No credit card required.

---

## ✅ Already Done (By Me)

| Feature | Status | What It Does |
|---------|--------|-------------|
| **Bug Report Button** | ✅ LIVE | Red "Bug?" button on every page - users report issues |
| **GitHub Actions Tests** | ✅ CONFIGURED | Auto-tests every 6 hours |
| **Uptime Check Workflow** | ✅ CONFIGURED | Checks site every 30 mins |
| **Email Notifications** | ✅ CONFIGURED | Bug reports sent to your email |

---

## 🔧 You Need To Do (5 Minutes)

### Step 1: Add GitHub Secrets

1. Go to: `github.com/coinhubx1/Po1/settings/secrets/actions`
2. Click **"New repository secret"** for each:

| Secret Name | Value | Where to Get It |
|-------------|-------|----------------|
| `TEST_URL` | Your live site URL | e.g., `https://your-site.com` |
| `SLACK_WEBHOOK_URL` | Slack webhook URL | See Step 2 below |

### Step 2: Create Slack Webhook (FREE)

1. Go to: https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: `CoinHubX Alerts`, Workspace: Your workspace
4. Click **"Incoming Webhooks"** in sidebar
5. Toggle **"Activate Incoming Webhooks"** ON
6. Click **"Add New Webhook to Workspace"**
7. Select channel: `#website-alerts` (create it first)
8. Copy the webhook URL (starts with `https://hooks.slack.com/...`)
9. Add to GitHub as `SLACK_WEBHOOK_URL` secret

### Step 3: UptimeRobot (FREE - 50 monitors)

1. Sign up: https://uptimerobot.com (free)
2. Click **"Add New Monitor"**
3. Settings:
   - Type: `HTTP(s)`
   - Name: `CoinHubX`
   - URL: Your live site URL
   - Interval: `5 minutes`
4. Add Alert Contacts:
   - Your email (automatic)
   - Slack (use same webhook URL)

---

## 📊 What You'll Get

### Bug Reports
- Users click red "Bug?" button → Fill form → You get email
- Stored in database for review
- Optional: Also posts to Slack if webhook configured

### Site Down Alerts
- UptimeRobot checks every 5 mins → Email + Slack if down
- GitHub Actions backup check every 30 mins

### Automated Test Alerts
- Tests run every 6 hours
- Checks: Pages load, no APY text, button works
- Slack notification on failure with report link

---

## 🆘 Troubleshooting

**Tests failing?**
- Check `TEST_URL` secret is correct and site is live

**No Slack messages?**
- Verify `SLACK_WEBHOOK_URL` secret is correct
- Test webhook: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' YOUR_WEBHOOK_URL`

**Bug reports not arriving?**
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Verify SendGrid API key is set

---

## 💰 Cost Summary

| Tool | Cost |
|------|------|
| Bug Report Button | £0 (built-in) |
| GitHub Actions | £0 (2000 mins/month free) |
| Slack | £0 (free tier) |
| UptimeRobot | £0 (50 monitors free) |
| **TOTAL** | **£0/month** |
