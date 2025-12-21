# CoinHubX Monitoring & Alerting Setup Guide

This document explains how to configure all monitoring tools for CoinHubX.

---

## 🔔 1. UptimeRobot (Downtime Alerts)

### What it does:
- Checks if your site is online every 5 minutes
- Sends instant alerts when site goes down
- Shows uptime statistics

### Setup Steps:

1. **Create Account**: Go to https://uptimerobot.com and sign up (free tier available)

2. **Add Monitor**:
   - Click "Add New Monitor"
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `CoinHubX Production`
   - URL: `https://coinhubx.net` (your live site URL)
   - Monitoring Interval: `5 minutes`

3. **Configure Alerts**:
   - Go to "Alert Contacts" in sidebar
   - Add your email (default)
   - **Add Slack**:
     - Click "Add Alert Contact" → "Slack"
     - Follow OAuth flow to connect your Slack workspace
     - Select channel: `#website-alerts`
   - **Add SMS** (optional, requires credits):
     - Click "Add Alert Contact" → "SMS"
     - Enter phone number

4. **Assign Contacts to Monitor**:
   - Edit your monitor
   - Check all alert contacts you want notified

### Result:
- Site down → Slack message + SMS + Email within 5 minutes

---

## 🐛 2. Marker.io (Visual Bug Reporting)

### What it does:
- Adds a floating button to your site
- Users/testers can screenshot bugs with annotations
- Automatically captures browser info, console logs, etc.
- Creates tickets in your dashboard

### Setup Steps:

1. **Create Account**: Go to https://marker.io and sign up

2. **Create Project**:
   - Click "New Project"
   - Name: `CoinHubX`
   - Add your site URL

3. **Get Your Project ID**:
   - In project settings, copy your Project ID
   - It looks like: `64f8a1b2c3d4e5f6a7b8c9d0`

4. **Update Code**:
   - Open `/app/frontend/public/index.html`
   - Find: `project: 'MARKER_PROJECT_ID'`
   - Replace with your actual project ID

5. **Configure Slack Integration**:
   - In Marker.io dashboard → Settings → Integrations
   - Click "Slack"
   - Connect to your workspace
   - Select channel: `#website-bugs`

### Result:
- User clicks bug button → Screenshots with annotation
- Bug posted to Marker.io dashboard + Slack notification

---

## 🧪 3. Automated Tests (GitHub Actions + Playwright)

### What it does:
- Runs automated tests every 6 hours
- Checks for forbidden text (APY, staking, etc.)
- Verifies critical pages load
- Sends Slack alerts on failure

### Already Configured! Just add secrets:

1. **Add TEST_URL Secret**:
   - Go to: `github.com/coinhubx1/Po1/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `TEST_URL`
   - Value: `https://your-deployed-site-url.com`

2. **Add SLACK_WEBHOOK_URL Secret**:
   - Create Slack webhook:
     - Go to https://api.slack.com/apps
     - Create new app → "Incoming Webhooks"
     - Activate webhooks
     - Add webhook to channel: `#website-alerts`
     - Copy webhook URL
   - Add to GitHub:
     - Name: `SLACK_WEBHOOK_URL`
     - Value: `https://hooks.slack.com/services/xxx/yyy/zzz`

3. **Manual Test Run**:
   - Go to Actions tab in GitHub
   - Select "Scheduled Site Monitoring & Tests"
   - Click "Run workflow"

### Result:
- Tests fail → Slack message with link to report
- Tests pass → Optional success notification

---

## 📊 Slack Channel Setup

Create these channels in your Slack workspace:

| Channel | Purpose | Connected Tools |
|---------|---------|----------------|
| `#website-alerts` | Critical alerts (downtime, test failures) | UptimeRobot, GitHub Actions |
| `#website-bugs` | Bug reports from users | Marker.io |

---

## 🔑 GitHub Secrets Required

| Secret Name | Where to Get It | Purpose |
|-------------|-----------------|----------|
| `TEST_URL` | Your deployed site URL | Where to run tests against |
| `SLACK_WEBHOOK_URL` | Slack App Settings | Send test result notifications |

---

## ✅ Verification Checklist

- [ ] UptimeRobot account created
- [ ] UptimeRobot monitor added for production URL
- [ ] UptimeRobot Slack alert contact configured
- [ ] Marker.io account created
- [ ] Marker.io project ID added to index.html
- [ ] Marker.io Slack integration configured
- [ ] GitHub secret TEST_URL added
- [ ] GitHub secret SLACK_WEBHOOK_URL added
- [ ] Manual workflow run successful

---

## 🆘 Troubleshooting

### Tests Failing?
1. Check if `TEST_URL` secret is set correctly
2. Verify the URL is accessible (not behind auth)
3. View the Playwright report artifact in GitHub Actions

### No Slack Notifications?
1. Verify `SLACK_WEBHOOK_URL` is correct
2. Check Slack channel permissions
3. Make sure webhook is not disabled

### Marker.io Widget Not Showing?
1. Verify project ID is correct in index.html
2. Check browser console for errors
3. Rebuild frontend: `cd frontend && yarn build`
