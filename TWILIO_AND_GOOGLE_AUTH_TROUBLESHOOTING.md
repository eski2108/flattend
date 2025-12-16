# Twilio & Google OAuth Troubleshooting Guide

## Current Status

### Twilio SMS Verification
**Issue:** SMS messages not being received

**Root Cause:** Twilio **TRIAL ACCOUNT LIMITATIONS**
- Trial accounts can ONLY send SMS to **verified phone numbers** in your Twilio account
- You verified: `+44 7808 184311` in your Twilio console
- **The SMS IS being sent by our backend** (backend returns success)
- But Twilio trial won't deliver unless the number is pre-verified

**Solutions:**
1. **Immediate Fix**: Test ONLY with your verified number `+44 7808 184311`
2. **Production Fix**: Upgrade Twilio account to paid ($20/month) to send to ANY number
3. **Alternative**: Use email verification instead for now

**How to Test:**
1. Go to: https://quickstart-27.preview.emergentagent.com/auth
2. Click "Continue with Phone Number"
3. Enter: +44 7808184311 (your verified number)
4. You SHOULD receive SMS now

### Google OAuth
**Issue:** "Continue with Google" button not working

**Possible Causes:**
1. **Missing Redirect URI in Google Console** - Most likely issue
2. Browser blocking popup/redirect
3. Console errors (check browser DevTools)

**Required Configuration in Google Cloud Console:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", ADD:
   ```
   https://quickstart-27.preview.emergentagent.com/api/auth/google/callback
   ```
4. Save changes
5. Wait 5 minutes for Google to propagate changes

**Current Configuration:**
- Client ID: `823558232364-e4b48l01o9frh6vbltic2633fn3pgs0o.apps.googleusercontent.com`
- Redirect URI: `https://quickstart-27.preview.emergentagent.com/api/auth/google/callback`

**How to Test:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Go to: https://quickstart-27.preview.emergentagent.com/auth
4. Click "Continue with Google"
5. Check console for errors
6. The page should redirect to Google sign-in

## Quick Test Commands

### Test Twilio SMS (Backend)
```bash
curl -X POST "https://quickstart-27.preview.emergentagent.com/api/auth/phone/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+447808184311"}'
```

Expected: `{"success":true,"message":"OTP sent successfully","status":"pending"}`

### Test Google OAuth URL Generation
```bash
curl "https://quickstart-27.preview.emergentagent.com/api/auth/google"
```

Expected: Should return `auth_url` starting with `https://accounts.google.com/o/oauth2/v2/auth?...`

## Updated Frontend Code
I've added detailed console logging to help diagnose issues:
- Google Sign-In now logs each step
- Phone OTP now shows Twilio status
- Better error messages with actual error details

## Next Steps
1. **Check Google Console** - Add redirect URI if missing
2. **Test with your verified Twilio number** - Use +44 7808 184311
3. **Check browser console** - Open DevTools (F12) and look for errors
4. **Consider alternatives**:
   - Use email/password registration (already working)
   - Upgrade Twilio to paid account for production use
