# CRITICAL ISSUE: Double Layout Wrapping

## Problem
All 8 pages that are stuck on "Loading..." have `import Layout from '@/components/Layout'` and wrap their content in `<Layout>` tags.

But we created MainLayout.jsx which ALSO wraps everything in Layout via:
```jsx
<Layout>
  <Outlet />
</Layout>
```

This creates **DOUBLE WRAPPING** causing pages to break.

## Affected Pages (8):
1. /app/frontend/src/pages/Savings.jsx - Line 7: `import Layout`
2. /app/frontend/src/pages/InstantBuy.jsx or InstantBuy.js
3. /app/frontend/src/pages/P2PExpress.jsx or P2PExpress.js  
4. /app/frontend/src/pages/P2PMarketplace.jsx
5. /app/frontend/src/pages/SwapCrypto.jsx
6. /app/frontend/src/pages/ReferralDashboardComprehensive.jsx
7. /app/frontend/src/pages/Settings.js
8. /app/frontend/src/pages/MyOrders.jsx or MyOrders.js

## Solution
For EACH of the 8 pages above:
1. Remove `import Layout from '@/components/Layout'`
2. Remove `<Layout>` wrapper tags
3. Return just the content div

## Example Fix:

**BEFORE:**
```jsx
import Layout from '@/components/Layout';

export default function Savings() {
  return (
    <Layout>
      <div>...content...</div>
    </Layout>
  );
}
```

**AFTER:**
```jsx
// Remove Layout import

export default function Savings() {
  return (
    <div>...content...</div>
  );
}
```

## Why This Fixes It
MainLayout.jsx already provides the Layout wrapper for ALL authenticated pages:
```jsx
<Route element={<MainLayout />}>  {/* MainLayout wraps in Layout */}
  <Route path="/savings" element={<Savings />} />  {/* Savings shouldn't wrap again */}
</Route>
```

## Working Pages (Already Fixed):
✅ SpotTradingPro.js - Already removed Layout wrapper  
✅ Dashboard.js - No Layout wrapper
✅ WalletPage.js - No Layout wrapper
✅ Allocations - No Layout wrapper
