# 🔒 CRITICAL FIXES - LOCKED IN STABLE BACKUP

**Date:** December 11, 2025  
**Status:** LOCKED & PROTECTED

---

## ⚠️ CRITICAL FIX - DO NOT REVERT

### BACKEND FIX - Line 1939 in server.py

**BEFORE (BROKEN):**
```python
offers = await db.enhanced_sell_orders.find(query, {"_id": 0}).to_list(1000)
```

**AFTER (FIXED):**
```python
offers = await db.p2p_ads.find(query, {"_id": 0}).to_list(1000)
```

**Why:** The endpoint was querying the WRONG collection. Changed from `enhanced_sell_orders` to `p2p_ads`.

**Impact:** Without this fix, the marketplace shows 0 offers even when sellers exist.

---

## OTHER FIXES INCLUDED

1. **International Payment Form** - 15+ payment methods (PayPal, Wise, Bank Transfer, etc.)
2. **Merchant Center** - Payment method form appears inline
3. **Seller Activation** - Redirects to Create Ad page after activation
4. **Missing Icon Import** - Added `IoShieldCheckmark as ShieldCheck` to MerchantCenter.js

---

## DATABASE SCHEMA

**Collection:** `p2p_ads` (in `coinhubx_production` database)

**Required Fields:**
- `ad_id` - Unique ID
- `seller_id` - User ID
- `seller_name` - Display name
- `crypto_currency` - e.g., "BTC"
- `fiat_currency` - e.g., "GBP"
- `price_per_unit` - Price (NOT "price")
- `min_order_limit` - Minimum (NOT "min_amount")
- `max_order_limit` - Maximum (NOT "max_amount")
- `payment_methods` - Array of strings
- `status` - Must be "active"

---

## TEST PROOF

**Dog Seller Account:**
- User ID: `dog-seller-8a4dc7ca`
- Email: `dog@coinhubx.net`
- Password: `dog123`
- Ad ID: `ad_46d9a3f4c883`
- Appears on marketplace: ✅ CONFIRMED

**API Test:**
```bash
curl "https://trade-form-polish.preview.emergentagent.com/api/p2p/offers?crypto_currency=BTC"
```

Returns Dog's offer with all details.

---

## 🚨 IF YOU FORK/CLONE THIS PROJECT

**THESE FILES ARE CRITICAL:**

1. `/app/backend/server.py` (Line 1939 - MUST query `p2p_ads`)
2. `/app/frontend/src/pages/MerchantCenter.js` (Has payment form & ShieldCheck import)
3. `/app/backend/.env` (DB_NAME=coinhubx_production)

**STABLE BACKUP:**
- Location: `/app/STABLE/`
- Size: 738 MB
- Contains ALL fixes
- Restore with: `bash /app/RESTORE_STABLE.sh`

---

## VERIFICATION CHECKLIST

After forking/cloning, verify:

- [ ] Backend queries `p2p_ads` collection (NOT `enhanced_sell_orders`)
- [ ] Marketplace shows sellers when they exist
- [ ] "Become a Seller" button works
- [ ] Payment form has 15+ methods
- [ ] Seller activation redirects to Create Ad

---

**LOCKED:** All changes backed up to `/app/STABLE/`  
**PROTECTED:** Cannot be lost on fork/clone  
**TESTED:** Dog seller confirmed working on live marketplace

---

*Critical fixes permanently saved - December 11, 2025*
