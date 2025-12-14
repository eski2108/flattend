# ✅ WORKING LOGIN CREDENTIALS

## USE THESE TO LOGIN:

**Email:** `demo@coinhubx.com`
**Password:** `Test123!`

## TESTED AND VERIFIED:

✅ Backend login endpoint returns success
✅ Token generated correctly  
✅ User data returned

## HOW TO LOGIN:

1. Go to: https://payflow-crypto-3.preview.emergentagent.com/#/login
2. Enter email: demo@coinhubx.com
3. Enter password: Test123!
4. Click Login
5. You should be redirected to dashboard

## IF YOU GET BLACK SCREENS:

The issue is that some pages check for `currentUser` in localStorage and if it's not found or malformed, they show infinite loading.

The Settings page specifically has this issue on line 151-157.

## BACKEND TEST RESULTS:

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@coinhubx.com","password":"Test123!"}'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "user_id": "2f514ea7-05ae-451d-a13f-44f66c824bc0",
    "email": "demo@coinhubx.com",
    "full_name": "Demo User",
    "role": "user"
  },
  "message": "Login successful"
}
```

✅ **LOGIN WORKS ON BACKEND**

## THE PROBLEM:

The frontend pages (Settings, Wallet, etc.) are checking `localStorage.getItem('cryptobank_user')` and if it's not found or invalid, they show infinite loading screens.

## THE FIX NEEDED:

Either:
1. Make sure login properly sets `cryptobank_user` in localStorage
2. OR fix the pages to handle missing user data gracefully instead of infinite loading
