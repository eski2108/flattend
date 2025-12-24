# AGENT NOTES - CoinHubX Development Status

**Last Updated:** December 24, 2025

---

## 🔒 PRODUCTION-LOCKED PAGES (DO NOT MODIFY)

### 1. Desktop Markets Page (`/trading`)
**Status:** FINAL - LOCKED ✅

**Current State:**
- "Markets" title with subtitle
- Search bar
- Tabs: All / Favorites / Top Gainers
- Quote toggle: USD / USDT
- Coin list table with columns: PAIR | PRICE | 24H % | VOLUME | HIGH | LOW | TREND
- Sparkline trend indicators
- Hover quick actions (Star, Chart, Trade)
- Right-side coin info panel with "Open Trading View" CTA
- Ends at global footer (Terms | Privacy | Support)

**DO NOT:**
- Add new sections
- Add extra strips/cards/footers
- Move elements
- Rename headings
- Change wording
- Change spacing or alignment
- Add stats, widgets, or visuals
- "Experiment" or "iterate"

---

### 2. Desktop Trading Page (`/spot-trading`)
**Status:** FINAL - LOCKED ✅

**Current State:**
- Pair name header (e.g., "BTC/USD") - NO dropdown, NO tabs
- Price and stats bar (24h Change, High, Low, Volume)
- Full TradingView chart
- Buy/Sell panel with Market/Limit tabs
- Footer at bottom

**DO NOT:**
- Add coin list or coin switcher
- Add dropdown for pair selection
- Change layout or styling

---

### 3. Mobile Trading Pages
**Status:** FINAL - LOCKED ✅

**Page 1: `/trading` (Mobile Coin List)**
- Search bar
- Tabs: All / Favorites / Top Gainers
- Scrollable coin list with price and % change
- Click coin → navigates to trading page

**Page 2: `/trading/:symbol` (Mobile Trading Page)**
- Back arrow to return to list
- Coin header with logo, price, % change
- TradingView chart
- 24h High/Low stats

**DO NOT modify mobile pages.**

---

## ✅ COMPLETED WORK

### Desktop Trading Structure
- [x] Two-page flow implemented (Markets → Trading)
- [x] Markets page (`/trading`) - scrollable coin list for discovery
- [x] Trading page (`/spot-trading`) - chart + buy/sell only, no coin list
- [x] Removed multi-coin tabs from trading page
- [x] Removed dropdown from trading page
- [x] URL parameter support (`/spot-trading?pair=ETHUSD`)

### Desktop Markets Page Features
- [x] Search bar with live filtering
- [x] Tabs: All / Favorites / Top Gainers
- [x] Quote toggle: USD / USDT
- [x] Sortable table columns (click header to sort)
- [x] Columns: PAIR | PRICE | 24H % | VOLUME | HIGH | LOW | TREND
- [x] Sparkline trend indicators (green/red)
- [x] Row hover effects (green accent + glow)
- [x] Hover quick actions (Favorite, Chart, Trade)
- [x] Right-side coin info panel
- [x] "Open Trading View" CTA button
- [x] Global footer at bottom

### Mobile Trading Structure
- [x] Two-page flow (List → Trading)
- [x] `/trading` - coin list
- [x] `/trading/:symbol` - trading page with back arrow
- [x] Mobile pages unchanged and working

### Bug Fixes Completed
- [x] Removed duplicate footers
- [x] Fixed footer placement
- [x] Removed extra containers below footer
- [x] Removed unwanted top stats strips

---

## ⚠️ CRITICAL RULES

1. **LOCKED PAGES** - Do not modify any page marked as LOCKED without explicit written approval
2. **TWO-PAGE TRADING FLOW** - Markets page for discovery, Trading page for trading. Do not merge.
3. **NO COIN LIST ON TRADING PAGE** - The scrollable coin list belongs ONLY on `/trading`
4. **MOBILE UNCHANGED** - Do not modify mobile behavior or styling
5. **REAL DATA ONLY** - No mock data, no placeholders, no hardcoded values
6. **APPROVAL REQUIRED** - Any UI/layout/route changes require explicit written approval BEFORE coding

---

## 📁 KEY FILES

- `/app/frontend/src/pages/MobileMarketSelection.js` - Desktop & Mobile Markets page
- `/app/frontend/src/pages/SpotTradingPro.js` - Desktop Trading page
- `/app/frontend/src/pages/MobileTradingPage.js` - Mobile Trading page
- `/app/frontend/src/components/Layout.js` - Global layout with footer

---

## 🔐 GIT REMOTES (12 repos)

- brand-new
- c-hub
- coinhublatest
- coinhubx
- coinx1
- crypto-livr
- dev-x
- hub-x
- latest-coinhubx
- latest-work
- latest-work2
- x1

---

**IF UNSURE → STOP AND ASK. DO NOT GUESS.**

**Document Version:** 1.0
