# P2P Marketplace State Machine Fix

**Date:** December 27, 2025
**Issue:** "Seller found + 0 offers" contradictory state bug

---

## Problem

The P2P marketplace UI could display contradictory states simultaneously:
- "Seller found · Ready to start trade" banner
- "Showing 0 offers matching £100"

This occurred because:
1. `bestOffer` and `bestQuote` were set from the `/api/p2p/match/best` endpoint
2. `filteredOffers` was calculated client-side from a separate offers list
3. These two data sources were NOT synchronized
4. Stale responses from async API calls could override newer empty states

---

## Solution: Unified Trade State Machine

### 1. Single Source of Truth

Created a unified `tradeState` object:

```javascript
const [tradeState, setTradeState] = useState({
  queryKey: '',              // Hash to prevent stale data
  offersCount: 0,            // From backend
  matched: false,            // From backend
  matchedOfferId: null,      // The actual offer_id
  matchedSellerName: null,   // Seller name for display
  status: 'idle'             // 'idle' | 'loading' | 'ready' | 'no_offers' | 'error'
});
```

### 2. Query Key System

Every API request generates a unique query key:
```javascript
const thisQueryKey = `${asset}_${fiat}_${amountFiat}_${side}_${paymentMethod || ''}`;
```

Responses are only applied if their query key matches the latest:
```javascript
if (latestQueryKeyRef.current !== thisQueryKey) {
  console.log('⚠️ Ignoring stale response');
  return;
}
```

### 3. Hard Reset on Input Changes

When ANY input changes (amount, currency, crypto asset, tab), the state is immediately reset:

```javascript
const resetTradeState = (reason) => {
  setTradeState({
    queryKey: '',
    offersCount: 0,
    matched: false,
    matchedOfferId: null,
    matchedSellerName: null,
    status: 'idle'
  });
  setBestOffer(null);
  setBestQuote(null);
  // ...
};
```

### 4. Backend Contract

Updated `/api/p2p/match/best` to return unified fields:

**Success Response:**
```json
{
  "success": true,
  "offers_count": 5,
  "matched": true,
  "offer_id": "live_offer_001",
  "offer": { ... },
  "quote": { ... }
}
```

**No Match Response:**
```json
{
  "success": false,
  "offers_count": 0,
  "matched": false,
  "offer_id": null,
  "reason": "No offer can fulfil amount/payment/limits",
  "code": "NO_MATCH"
}
```

### 5. UI Gating Rules

**Seller Found Banner:**
```jsx
{tradeState.status === 'ready' && tradeState.matched && tradeState.matchedOfferId && (
  <div>✓ Seller found · Ready to start trade</div>
)}
```

**Buy Button:**
```jsx
<button
  disabled={
    tradeState.status !== 'ready' ||
    !tradeState.matched ||
    !tradeState.matchedOfferId
  }
>
  {tradeState.status === 'loading' ? 'Finding seller...' 
    : tradeState.status === 'no_offers' ? 'No offers available'
    : `Buy ${selectedCrypto}`}
</button>
```

---

## Files Modified

### Backend
- `/app/backend/server.py` - Updated `/api/p2p/match/best` response format

### Frontend
- `/app/frontend/src/pages/P2PMarketplace.js`
  - Added `tradeState` unified state object
  - Added `resetTradeState()` function
  - Added `latestQueryKeyRef` for stale response prevention
  - Updated `fetchBestMatch()` to use unified state
  - Updated all input handlers to call `resetTradeState()`
  - Updated Seller Found banner conditional rendering
  - Updated Buy button conditional rendering

---

## Test Results

### Test 1: Valid Amount (£100)
- ✅ "Showing 3 offers matching £100"
- ✅ "Seller found · Ready to start trade" with offer ID
- ✅ Buy BTC button enabled (green gradient)

### Test 2: Invalid Amount (£1 - below min limit)
- ✅ "Showing 0 offers matching £1"
- ✅ NO Seller Found banner
- ✅ Button shows "No offers available" (disabled)
- ✅ Error message: "No offers for GBP 1. Try a different amount."

### Test 3: State Reset on Input Change
- ✅ Changing amount immediately hides Seller Found
- ✅ Changing currency immediately resets state
- ✅ Switching tabs immediately resets state

---

## Prevention of Future Issues

1. **Never derive UI state from multiple data sources** - Use a single state object
2. **Always use query keys** for async operations to prevent stale data
3. **Backend is authoritative** - UI only renders what backend confirms
4. **Immediate reset on input change** - Don't wait for API response to clear old state
