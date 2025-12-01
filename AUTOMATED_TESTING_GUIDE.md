# 🤖 Automated Site Checker Bot

## What It Does

The automated bot goes through your ENTIRE site and checks:

1. ✅ **Homepage** - Loads correctly
2. ✅ **Login** - Form works, authentication succeeds
3. ✅ **Dashboard** - Loads with correct content
4. ✅ **Wallet Page** - Shows balances
5. ✅ **P2P Express** - Dual currency input present
6. ✅ **Swap Page** - FROM/TO sections, swap button
7. ✅ **Trading Page** - Loads correctly
8. ✅ **JavaScript Errors** - Checks console for errors
9. ✅ **Navigation** - All links working
10. ✅ **Mobile View** - Responsive design works

---

## How to Run It

### Quick Run:
```bash
cd /app
bash run_site_check.sh
```

### Manual Run:
```bash
cd /app
python3 automated_site_checker.py
```

---

## When to Run It

### ✅ Run After:
- Making any code changes
- Before deployment
- After restoring from backup
- When customers report issues
- Once a day to ensure everything works

### 🔄 Automated Schedule (Optional):

You can set it to run automatically every day:

```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * cd /app && python3 automated_site_checker.py >> /app/test_reports/daily_check.log 2>&1

# Or run every 6 hours:
0 */6 * * * cd /app && python3 automated_site_checker.py >> /app/test_reports/hourly_check.log 2>&1
```

---

## Understanding Results

### ✅ All Green (PASS):
```
================================================================================
📊 TEST REPORT
================================================================================

Total Tests: 12
✅ Passed: 12
❌ Failed: 0
⚠️  Warnings: 0

🎉 ALL TESTS PASSED! Site is working correctly.
```
**Meaning**: Everything is working perfectly!

### ⚠️ Yellow (WARNINGS):
```
⚠️  WARNINGS:
  • Console Errors: 35 errors found
```
**Meaning**: Minor issues (like third-party script errors). Site still works but check if critical.

### ❌ Red (FAILED):
```
🔴 FAILED TESTS:
  • Login: Login failed: Timeout
```
**Meaning**: Something is broken! Fix immediately.

---

## Test Reports

Every run creates a detailed report:

**Location**: `/app/test_reports/site_check_YYYYMMDD_HHMMSS.json`

**Example**:
```json
{
  "timestamp": "2025-12-01T19:33:32",
  "summary": {
    "total": 12,
    "passed": 12,
    "failed": 0,
    "warnings": 1
  },
  "results": [
    {
      "status": "PASS",
      "test": "Homepage Load",
      "message": "Homepage loaded successfully",
      "timestamp": "2025-12-01T19:33:15"
    },
    ...
  ]
}
```

### View Latest Report:
```bash
cat /app/test_reports/site_check_*.json | tail -100
```

### View All Reports:
```bash
ls -lh /app/test_reports/
```

---

## What Gets Checked

### 1. Page Loading
- ✅ All pages load without 404 or 500 errors
- ✅ Pages load within 30 seconds
- ✅ No critical JavaScript errors

### 2. User Flows
- ✅ Login works
- ✅ Dashboard accessible after login
- ✅ Wallet shows balances
- ✅ All transaction pages load

### 3. Features
- ✅ Dual currency input present on P2P Express
- ✅ Swap page has FROM/TO sections
- ✅ Swap button exists and is clickable
- ✅ All forms have required inputs

### 4. Technical
- ✅ No critical JavaScript errors
- ✅ Mobile viewport works
- ✅ Navigation links present

---

## Current Test Status

### ✅ Last Run: December 1, 2025

**Results**:
- Total Tests: 12
- Passed: 12 ✅
- Failed: 0 ❌
- Warnings: 1 ⚠️

**Summary**: 
🎉 **ALL TESTS PASSED!** Site is working correctly.

**Warnings**:
- Console Errors: 35 (mostly from third-party scripts like Tawk.to chat widget)

---

## Adding New Tests

You can easily add more tests to check specific things:

### Example: Check if a specific feature works

```python
async def test_custom_feature(self, page):
    """Test: My Custom Feature"""
    print("\n📋 Test: My Custom Feature")
    try:
        await page.goto(f"{SITE_URL}/my-page", wait_until="networkidle")
        
        # Check if element exists
        element = await page.query_selector('#my-element')
        if element:
            self.log("PASS", "Custom Feature", "Feature element found")
        else:
            self.log("FAIL", "Custom Feature", "Feature element missing")
    except Exception as e:
        self.log("FAIL", "Custom Feature", f"Failed: {str(e)}")
```

Then add it to `run_all_tests()`:
```python
await self.test_custom_feature(page)
```

---

## Integration with CI/CD

You can add this to your deployment pipeline:

```bash
# Before deploying:
./run_site_check.sh
if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Aborting deployment."
    exit 1
fi

# Deploy only if tests pass
echo "✅ Tests passed! Proceeding with deployment..."
```

---

## Monitoring & Alerts

### Option 1: Email Alerts (Simple)
```bash
#!/bin/bash
# run_check_and_alert.sh

cd /app
python3 automated_site_checker.py

if [ $? -ne 0 ]; then
    # Tests failed - send alert
    echo "Site check failed!" | mail -s "CoinHubX Alert" your@email.com
fi
```

### Option 2: Slack/Discord Webhook
```bash
# Send results to Slack
curl -X POST https://hooks.slack.com/YOUR_WEBHOOK \
  -d '{"text":"Site check completed: 12/12 tests passed"}'
```

### Option 3: Log to Dashboard
- Parse the JSON report
- Send to your admin dashboard
- Display status in real-time

---

## Troubleshooting

### Test Fails: "Login: Timeout"
**Cause**: Site too slow or login credentials wrong
**Fix**: Check if site is up, verify TEST_USER and TEST_PASS in script

### Test Fails: "Page not found"
**Cause**: Route doesn't exist or changed
**Fix**: Update SITE_URL in script or fix routing

### Warning: "Console Errors"
**Cause**: JavaScript errors in browser console
**Fix**: Check if errors are critical (your code) or safe (third-party)

### Test Takes Too Long
**Cause**: Network slow or pages loading slowly
**Fix**: Increase timeout in script or optimize page loading

---

## Comparison: Before vs After

### Before (Manual Testing):
- ❌ Takes 30+ minutes to manually test everything
- ❌ Easy to forget to test something
- ❌ No record of what was tested
- ❌ Only test when you remember
- ❌ Can't test overnight

### After (Automated Testing):
- ✅ Takes 2 minutes to test everything
- ✅ Never forgets a test
- ✅ Detailed report every time
- ✅ Can run anytime (even overnight)
- ✅ Can run before every deployment
- ✅ Catches bugs before customers do

---

## Benefits

### For You:
- 😴 Sleep better knowing site is monitored
- 🚀 Deploy with confidence
- 🐛 Find bugs before customers
- ⏰ Saves hours of manual testing
- 📊 Track site health over time

### For Your Customers:
- ✅ More reliable site
- ✅ Fewer bugs
- ✅ Better experience
- ✅ Faster fixes

---

## Quick Commands Reference

```bash
# Run checker
bash /app/run_site_check.sh

# View latest report
cat /app/test_reports/site_check_*.json | tail -100

# View all reports
ls -lh /app/test_reports/

# Clean old reports (keep last 10)
ls -t /app/test_reports/*.json | tail -n +11 | xargs rm

# Run in background
nohup python3 /app/automated_site_checker.py &
```

---

## Next Steps

### Now:
1. ✅ Bot is installed and working
2. ✅ First successful test run completed
3. ✅ Report generated

### Tomorrow:
1. Run it once manually to verify
2. Set up daily cron job (optional)
3. Check reports regularly

### Future:
1. Add more specific tests for your features
2. Set up alerts (email/Slack)
3. Integrate with deployment pipeline
4. Monitor trends over time

---

**Status**: ✅ ACTIVE & WORKING
**Last Test**: 12/12 PASSED
**Confidence**: High

---

*The bot is now watching your site 24/7 (when you run it)!* 🤖👀
