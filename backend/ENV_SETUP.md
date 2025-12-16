# CoinHubX Backend - Environment Setup Guide

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd backend

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env and fill in your values
nano .env  # or use any editor

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

---

## Environment Variables Reference

### Required for Basic Operation

| Variable | Service | How to Get |
|----------|---------|------------|
| `MONGO_URL` | MongoDB Atlas | [cloud.mongodb.com](https://cloud.mongodb.com) > Connect > Drivers |
| `DB_NAME` | MongoDB | Your database name |
| `JWT_SECRET` | Security | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SECRET_KEY` | Security | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SENDGRID_API_KEY` | Email | [sendgrid.com](https://app.sendgrid.com/settings/api_keys) |
| `SENDER_EMAIL` | Email | Your verified sender email |

### Required for Crypto Payments

| Variable | Service | How to Get |
|----------|---------|------------|
| `NOWPAYMENTS_API_KEY` | NOWPayments | [nowpayments.io](https://account.nowpayments.io) > API Keys |
| `NOWPAYMENTS_IPN_SECRET` | NOWPayments | Set in NOWPayments dashboard > IPN Settings |

### Required for Phone Verification / 2FA

| Variable | Service | How to Get |
|----------|---------|------------|
| `TWILIO_ACCOUNT_SID` | Twilio | [twilio.com/console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio | Twilio Console Dashboard |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio | Twilio > Verify > Services > Create |

### Required for Google OAuth

| Variable | Service | How to Get |
|----------|---------|------------|
| `GOOGLE_CLIENT_ID` | Google Cloud | [console.cloud.google.com](https://console.cloud.google.com) > Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | Same as above |

### Optional Services

| Variable | Service | Purpose |
|----------|---------|--------|
| `TELEGRAM_BOT_TOKEN` | Telegram | Admin notifications |
| `REDIS_URL` | Redis | Caching (graceful fallback) |

---

## Service Setup Instructions

### 1. MongoDB Atlas

1. Create account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new cluster (M0 free tier works for development)
3. Create database user with read/write permissions
4. Get connection string: Cluster > Connect > Connect your application
5. Replace `<password>` in the URL with your database user password

**Example:**
```
MONGO_URL=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
DB_NAME=coinhubx_production
```

### 2. SendGrid (Email)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to Settings > API Keys > Create API Key
3. Select "Full Access" or "Restricted Access" with Mail Send
4. Verify your sender email: Settings > Sender Authentication

**Used for:**
- Registration confirmation emails
- Password reset emails
- Withdrawal confirmation emails
- Escrow notifications
- Transaction alerts

### 3. NOWPayments (Crypto Payments)

1. Create account at [nowpayments.io](https://nowpayments.io)
2. Complete verification
3. Go to Store Settings > API Keys
4. Create new API key
5. Set up IPN (Instant Payment Notification):
   - Go to Store Settings > IPN
   - Set callback URL: `https://yourdomain.com/api/nowpayments/webhook`
   - Copy the IPN Secret

**Used for:**
- Generating crypto deposit addresses
- Processing crypto deposits (BTC, ETH, USDT, etc.)
- Processing crypto withdrawals
- Instant buy/sell operations

### 4. Twilio (SMS/2FA)

1. Create account at [twilio.com](https://twilio.com)
2. Get Account SID and Auth Token from Console Dashboard
3. Create Verify Service:
   - Go to Verify > Services
   - Create new service
   - Copy the Service SID (starts with `VA`)

**Used for:**
- Phone number verification
- SMS-based 2FA
- High-value transaction confirmations

### 5. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to APIs & Services > Credentials
5. Create OAuth 2.0 Client ID (Web application)
6. Add authorized origins:
   - `https://yourdomain.com`
   - `http://localhost:3000` (for development)
7. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/google/callback`
   - `http://localhost:8001/api/auth/google/callback` (for development)

---

## Security Checklist

- [ ] Generated unique `JWT_SECRET` (64 characters)
- [ ] Generated unique `SECRET_KEY` (64 characters)
- [ ] Generated unique `INTERNAL_API_KEY` (64 characters)
- [ ] `.env` file is in `.gitignore`
- [ ] Different secrets for staging vs production
- [ ] `PRODUCTION=true` only in production
- [ ] `DEBUG=false` in production
- [ ] `CORS_ORIGINS` only includes your domains

---

## Local Development

```bash
# Minimal .env for local development
MONGO_URL=mongodb://localhost:27017
DB_NAME=coinhubx_dev
JWT_SECRET=dev-secret-change-in-production-64-chars-minimum-here
SECRET_KEY=dev-secret-change-in-production-64-chars-minimum-here
SENDGRID_API_KEY=SG.your-key
SENDER_EMAIL=dev@yourdomain.com
BACKEND_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
PRODUCTION=false
DEBUG=true
```

---

## Verification Commands

```bash
# Test MongoDB connection
python -c "from pymongo import MongoClient; import os; c=MongoClient(os.environ['MONGO_URL']); print('Connected:', c.list_database_names())"

# Check all required vars are set
python -c "
import os
required = ['MONGO_URL', 'DB_NAME', 'JWT_SECRET', 'SENDGRID_API_KEY']
for var in required:
    print(f'{var}: {"SET" if os.environ.get(var) else "MISSING"}')
"

# Test server startup
uvicorn server:app --host 0.0.0.0 --port 8001
```

---

## Troubleshooting

### "MongoDB connection failed"
- Check `MONGO_URL` format
- Verify IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 for development)
- Check database user credentials

### "SendGrid API key invalid"
- Regenerate API key in SendGrid dashboard
- Ensure key has Mail Send permissions

### "NOWPayments API error"
- Verify API key is active
- Check if account verification is complete
- Ensure IPN secret matches dashboard

### "Google OAuth redirect mismatch"
- Verify redirect URI matches exactly (including http/https)
- Check authorized origins include your domain

---

## Support

For issues with specific services:
- MongoDB: [docs.mongodb.com](https://docs.mongodb.com)
- SendGrid: [docs.sendgrid.com](https://docs.sendgrid.com)
- NOWPayments: [nowpayments.io/help](https://nowpayments.io/help)
- Twilio: [twilio.com/docs](https://www.twilio.com/docs)
- Google OAuth: [developers.google.com/identity](https://developers.google.com/identity)
