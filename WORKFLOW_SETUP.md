# GitHub Actions Workflow Setup Guide

## Important: Manual Upload Required

The workflow file at `.github/workflows/scheduled-tests.yml` needs to be manually uploaded to GitHub because the current token doesn't have `workflow` scope.

## Steps to Upload:

### Option 1: Via GitHub Web Interface
1. Go to your repository on GitHub.com
2. Click "Add file" > "Create new file"
3. Type `.github/workflows/scheduled-tests.yml` as the filename
4. Copy the contents from `/app/.github/workflows/scheduled-tests.yml`
5. Commit the file

### Option 2: Via GitHub CLI (if you have it)
```bash
gh auth login  # Login with workflow scope
cd /app
git add .github/workflows/scheduled-tests.yml
git commit -m "Add automated test workflow"
git push origin main
```

---

## Configure Secrets in GitHub

Go to: Repository > Settings > Secrets and variables > Actions

### Required Secrets:

1. **TEST_URL** (Optional)
   - Value: `https://your-production-site.com`
   - Used to test against your live site

2. **SLACK_WEBHOOK_URL** (For Slack notifications)
   - Create at: https://api.slack.com/messaging/webhooks
   - Steps:
     1. Go to Slack > Apps > Incoming Webhooks
     2. Create new webhook for your channel (e.g., #website-tests)
     3. Copy the webhook URL
     4. Add as secret in GitHub

---

## Email Notifications Setup

1. Go to GitHub.com > Settings (your profile) > Notifications
2. Under "Actions", enable:
   - ✅ "Failed workflows only" OR
   - ✅ "All workflows"
3. Ensure your email is verified

---

## What You'll Get:

### Every 30 Minutes:
- Automated tests run against your site
- Tests check:
  - ❌ No APY/staking terminology
  - ✅ Correct notice savings wording
  - ✅ Currency selector works
  - ✅ 5-step deposit flow works
  - ✅ NowPayments 237 coins connected
  - ✅ Site health (200 OK responses)

### Notifications:
- **Slack**: Instant message with pass/fail status
- **Email**: GitHub sends notification on failures
- **HTML Report**: Download from Actions > Artifacts

---

## Viewing Reports:

1. Go to: Repository > Actions tab
2. Click on the latest workflow run
3. Scroll to "Artifacts" section
4. Download `playwright-report`
5. Unzip and open `index.html` in browser

The report includes:
- Screenshot of failures
- Step-by-step logs
- Timing information
- Error messages
