# Google OAuth Direct Implementation - Instructions

## Overview
This document explains how to implement direct Google OAuth (Option B) for Coin Hub X.

## What You Need to Provide

### 1. Google OAuth Credentials
- **Client ID**: (e.g., `123456789-abc123xyz.apps.googleusercontent.com`)
- **Client Secret**: (e.g., `GOCSPX-abc123xyz`)

### 2. Configure Redirect URIs in Google Console

Go to: https://console.cloud.google.com
→ APIs & Services
→ Credentials
→ Your OAuth 2.0 Client ID
→ Authorized redirect URIs

Add these exact URLs:
```
http://localhost:3000/auth/google/callback
https://crypto-trust-guard.preview.emergentagent.com/auth/google/callback
```

(Add your custom domain if you have one)

### 3. Enable Required APIs
In Google Cloud Console, enable:
- Google+ API
- People API

## Implementation Details

### Frontend Changes Required:

**File: `/app/frontend/.env`**
```
REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
REACT_APP_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**File: `/app/frontend/src/pages/Register.js`**
- Replace Emergent OAuth with direct Google OAuth
- Use popup-based flow for mobile compatibility
- Handle callback and token exchange

**File: `/app/frontend/src/pages/GoogleCallback.js`** (NEW)
- Create new page to handle OAuth redirect
- Exchange authorization code for tokens
- Create/login user in backend
- Redirect to dashboard

### Backend Changes Required:

**File: `/app/backend/.env`**
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

**File: `/app/backend/server.py`**
- Add new endpoint: `POST /api/auth/google`
- Verify Google ID token
- Create user if new, login if existing
- Return JWT session token

### Mobile-Safe OAuth Flow

1. User clicks "Sign up with Google"
2. Opens Google consent in popup (not new tab)
3. User approves
4. Popup closes automatically
5. User is logged in on main page

**No "Open in new tab" warnings!**

## Installation Steps

### Step 1: Install Google Auth Library
```bash
cd /app/backend
pip install google-auth google-auth-oauthlib google-auth-httplib2
pip freeze > requirements.txt
```

### Step 2: Frontend Library
```bash
cd /app/frontend
yarn add @react-oauth/google
```

### Step 3: Add Credentials to .env
- Add your Google Client ID and Secret to both frontend and backend .env files

### Step 4: Restart Services
```bash
sudo supervisorctl restart all
```

## Testing

1. Register page → Click "Sign up with Google"
2. Popup opens with Google consent
3. Approve access
4. Popup closes, user logged in
5. Referral code created automatically
6. Dashboard loads with user data

## Security Notes

- Never expose Client Secret in frontend
- Always verify ID tokens on backend
- Use HTTPS in production
- Set appropriate token expiration

## Ready to Implement

Once you provide:
1. Google Client ID
2. Google Client Secret
3. Confirm redirect URIs configured

I will implement the complete OAuth flow in ~30 minutes.
