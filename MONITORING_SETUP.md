# Site Monitoring & Bug Tracking Setup Guide

## Option 1: UptimeRobot (Basic Uptime Monitoring)

### Setup Steps:
1. Go to [UptimeRobot.com](https://uptimerobot.com) and create a free account
2. Click "Add New Monitor"
3. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: CoinHubX - Homepage
   - **URL**: `https://nowpay-debug.preview.emergentagent.com`
   - **Monitoring Interval**: 5 minutes
4. Add more monitors for:
   - `/login` - Login page
   - `/savings` - Savings page
   - `/api/health` - API health check
5. Add alert contacts (email/SMS)

**Result**: Get alerts within 5 minutes if site goes down.

---

## Option 2: BugHerd / Marker.io (Visual Bug Tracking)

### BugHerd Setup:
1. Sign up at [bugherd.com](https://bugherd.com)
2. Create a new project for CoinHubX
3. Copy the JavaScript snippet provided
4. Add to your site before `</body>` tag:

```html
<script type='text/javascript' src='https://www.bugherd.com/sidebarv2.js?apikey=YOUR_API_KEY' async='true'></script>
```

### Marker.io Setup:
1. Sign up at [marker.io](https://marker.io)
2. Create a new project
3. Install the widget:

```html
<script>
  window.markerConfig = {
    project: 'YOUR_PROJECT_ID',
    source: 'snippet'
  };
</script>
<script>
  !function(e,r,a){if(!e.__Marker){e.__Marker={};var t=[],n={__cs:t};["show","hide","isVisible","capture","cancelCapture","unload","reload","isExtensionInstalled","setReporter","setCustomData","on","off"].forEach(function(e){n[e]=function(){var r=Array.prototype.slice.call(arguments);r.unshift(e),t.push(r)}}),e.Marker=n;var s=r.createElement("script");s.async=1,s.src="https://edge.marker.io/latest/shim.js";var i=r.getElementsByTagName("script")[0];i.parentNode.insertBefore(s,i)}}(window,document);
</script>
```

**Result**: Visual bug reporting sidebar on your live site.

---

## Option 3: Automated Testing (Already Implemented)

### Tests Location: `/app/tests/`

### Run Tests Manually:
```bash
cd /app/tests
npm install
npm test
```

### Test Coverage:
- ✅ No APY/staking terminology on notice page
- ✅ Correct terminology (Notice, Lock, Fee)
- ✅ Currency selector (GBP/USD/EUR)
- ✅ Add to Savings 5-step flow
- ✅ NowPayments integration (237+ coins)
- ✅ Lock period cards (30/60/90 days)
- ✅ Site health checks (homepage, savings, login, API)

### GitHub Actions:
- **File**: `.github/workflows/scheduled-tests.yml`
- **Schedule**: Every 30 minutes
- **Also runs**: On push to main branch
- **Reports**: Uploaded as artifacts

---

## Quick Integration Code for Frontend

Add this to your `index.html` or main template before `</body>`:

```html
<!-- BugHerd (uncomment and add your API key) -->
<!-- <script type='text/javascript' src='https://www.bugherd.com/sidebarv2.js?apikey=YOUR_KEY' async='true'></script> -->

<!-- Marker.io (uncomment and add your project ID) -->
<!--
<script>
  window.markerConfig = { project: 'YOUR_PROJECT_ID', source: 'snippet' };
</script>
<script async src="https://edge.marker.io/latest/shim.js"></script>
-->
```

---

## Summary of Implementation Status

| Option | Tool | Status |
|--------|------|--------|
| 1 | UptimeRobot | 📋 Manual setup required (free account) |
| 2 | BugHerd/Marker.io | 📋 Code ready, needs API key |
| 3 | Playwright Tests | ✅ Fully implemented |
| 3 | GitHub Actions | ✅ Workflow created (runs every 30 min) |
