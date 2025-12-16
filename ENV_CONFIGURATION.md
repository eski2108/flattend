# CoinHubX - Complete Environment Configuration Guide

**Generated:** December 16, 2025
**Purpose:** Complete documentation of ALL environment variables required for CoinHubX platform

---

## 📁 ENVIRONMENT FILES LOCATION

```
/app/
├── backend/.env          # Backend configuration (ALL secrets)
├── frontend/.env         # Frontend configuration (public URLs only)
└── mobile/.env           # Mobile app configuration (optional)
```

---

## 🔐 BACKEND ENVIRONMENT VARIABLES (/app/backend/.env)

### 1. DATABASE (MongoDB)
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `MONGO_URL` | MongoDB Atlas | ✅ YES | Connection string to MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | MongoDB | ✅ YES | Database name | `coinhubx_production` |

**Setup Instructions:**
1. Create account at https://cloud.mongodb.com/
2. Create a cluster (M0 free tier is fine for testing)
3. Get connection string from "Connect" > "Connect your application"
4. Replace `<password>` in URL with your actual password

---

### 2. AUTHENTICATION & SECURITY
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `JWT_SECRET` | Internal | ✅ YES | Secret for JWT token signing (64 chars) | `a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2...` |
| `SECRET_KEY` | Internal | ✅ YES | App secret key (64 chars) | `b8e9f0a1c2d3e4f5a6b7c8d9e0f1a2b3...` |
| `INTERNAL_API_KEY` | Internal | ✅ YES | Internal service communication | `9873dbae32af841081b7bd8f3cfea55c...` |

**Generate Secrets:**
```bash
# Generate JWT_SECRET
python -c "import secrets; print(secrets.token_hex(32))"

# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate INTERNAL_API_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### 3. GOOGLE OAUTH
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `GOOGLE_CLIENT_ID` | Google Cloud | ⚠️ For OAuth | OAuth 2.0 Client ID | `823558232364-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | ⚠️ For OAuth | OAuth 2.0 Client Secret | `GOCSPX-xxx` |

**Setup Instructions:**
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable "Google+ API" and "Google Identity API"
4. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add authorized origins: `https://yourdomain.com`
7. Add redirect URIs: `https://yourdomain.com/api/auth/google/callback`
8. Copy Client ID and Client Secret

---

### 4. EMAIL SERVICE (SendGrid)
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `SENDGRID_API_KEY` | SendGrid | ✅ YES | API key for sending emails | `SG.r0eO4gTrSq-xxx` |
| `SENDER_EMAIL` | SendGrid | ✅ YES | Verified sender email | `info@coinhubx.net` |

**Setup Instructions:**
1. Create account at https://sendgrid.com/
2. Go to Settings > API Keys > Create API Key
3. Select "Full Access" or "Restricted Access" with Mail Send permissions
4. Verify your sender email/domain in "Sender Authentication"

**Used For:**
- Registration confirmation
- Password reset emails
- Withdrawal confirmation
- Transaction notifications

---

### 5. SMS VERIFICATION (Twilio)
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `TWILIO_ACCOUNT_SID` | Twilio | ⚠️ For SMS | Account SID | `ACb6973de80cd7a54c9180a8827719013b` |
| `TWILIO_AUTH_TOKEN` | Twilio | ⚠️ For SMS | Auth Token | `2dcb13855f78e3765739bc34dd0fe510` |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio | ⚠️ For SMS | Verify Service SID | `VAe93836470e0aad7088e70a1c12c63b8f` |

**Setup Instructions:**
1. Create account at https://www.twilio.com/
2. Go to Console Dashboard - copy Account SID and Auth Token
3. Go to "Verify" > "Services" > Create new service
4. Copy the Service SID (starts with VA)

**Used For:**
- Phone number verification
- 2FA via SMS
- High-value transaction confirmation

---

### 6. PAYMENTS (NOWPayments)
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `NOWPAYMENTS_API_KEY` | NOWPayments | ✅ YES | API key for crypto payments | `RN27NA0-D32MD5G-M6N2G6T-KWQMEAP` |
| `NOWPAYMENTS_IPN_SECRET` | NOWPayments | ✅ YES | IPN webhook secret | `NiW6+bCEl2Dw/0gBuxEuL0+fbGo2oWij` |
| `NOWPAYMENTS_PAYOUT_ADDRESS` | NOWPayments | ⚠️ For payouts | Default payout address | `1Ca6mH2WLhX4FRrAFe1RSRDsBaJ8XQzh95` |
| `NOWPAYMENTS_PAYOUT_API_KEY` | NOWPayments | ⚠️ For payouts | Separate payout key (if used) | Same as API key |

**Setup Instructions:**
1. Create account at https://nowpayments.io/
2. Go to "Store Settings" > "API Keys"
3. Create new API key and copy it
4. Set up IPN Secret in "Store Settings" > "IPN"
5. For payouts, enable payout feature and set up verification

**Used For:**
- Crypto deposits (BTC, ETH, USDT, etc.)
- Crypto withdrawals/payouts
- Payment processing for Instant Buy

---

### 7. TELEGRAM BOT (Optional)
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `TELEGRAM_BOT_TOKEN` | Telegram | ❌ Optional | Bot token for notifications | `8231349239:AAGdvHUnjfgJKjr64um2bWT43HdYHssRx5E` |
| `ADMIN_PHONE_NUMBER` | Internal | ❌ Optional | Admin phone for alerts | `+447808184311` |

**Setup Instructions:**
1. Message @BotFather on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token provided

---

### 8. URLS & DEPLOYMENT
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `BACKEND_URL` | Internal | ✅ YES | Public backend URL | `https://coinhubx.net` |
| `FRONTEND_URL` | Internal | ✅ YES | Public frontend URL | `https://coinhubx.net` |
| `CORS_ORIGINS` | Internal | ✅ YES | Allowed CORS origins | `https://coinhubx.net,https://app.coinhubx.net` |

---

### 9. FEATURE FLAGS
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `PRODUCTION` | Internal | ✅ YES | Production mode flag | `true` |
| `DEBUG` | Internal | ❌ Optional | Debug logging | `false` |
| `IS_STAGING` | Internal | ❌ Optional | Staging environment | `false` |
| `TEST_MODE` | Internal | ❌ Optional | Test mode flag | `false` |
| `ENVIRONMENT` | Internal | ❌ Optional | Environment name | `production` |

---

### 10. CACHING (Redis - Optional)
| Variable | Service | Required | Description | Example |
|----------|---------|----------|-------------|--------|
| `REDIS_URL` | Redis | ❌ Optional | Redis connection URL | `redis://localhost:6379` |
| `REDIS_HOST` | Redis | ❌ Optional | Redis host | `localhost` |
| `REDIS_PORT` | Redis | ❌ Optional | Redis port | `6379` |

---

## 🌐 FRONTEND ENVIRONMENT VARIABLES (/app/frontend/.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|--------|
| `REACT_APP_BACKEND_URL` | ✅ YES | Backend API URL (no trailing slash) | `https://coinhubx.net` |
| `REACT_APP_FRONTEND_URL` | ❌ Optional | Frontend URL for sharing | `https://coinhubx.net` |
| `REACT_APP_GOOGLE_CLIENT_ID` | ⚠️ For OAuth | Google Client ID (same as backend) | `823558232364-xxx` |

---

## 📋 COMPLETE SAMPLE .env FILE FOR BACKEND

```bash
# ============================================
# COINHUBX BACKEND ENVIRONMENT CONFIGURATION
# ============================================

# === DATABASE ===
MONGO_URL=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0&retryWrites=true&w=majority
DB_NAME=coinhubx_production

# === SECURITY ===
JWT_SECRET=GENERATE_64_CHAR_HEX_STRING_HERE
SECRET_KEY=GENERATE_64_CHAR_HEX_STRING_HERE
INTERNAL_API_KEY=GENERATE_64_CHAR_HEX_STRING_HERE

# === GOOGLE OAUTH ===
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_SECRET

# === EMAIL (SendGrid) ===
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY
SENDER_EMAIL=info@yourdomain.com

# === SMS (Twilio) ===
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID=VAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# === PAYMENTS (NOWPayments) ===
NOWPAYMENTS_API_KEY=YOUR_NOWPAYMENTS_API_KEY
NOWPAYMENTS_IPN_SECRET=YOUR_IPN_SECRET
NOWPAYMENTS_PAYOUT_ADDRESS=YOUR_BTC_ADDRESS

# === TELEGRAM (Optional) ===
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
ADMIN_PHONE_NUMBER=+YOUR_PHONE

# === URLS ===
BACKEND_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# === FLAGS ===
PRODUCTION=true
DEBUG=false

# === CACHING (Optional) ===
REDIS_URL=redis://localhost:6379
```

---

## 📋 COMPLETE SAMPLE .env FILE FOR FRONTEND

```bash
# ============================================
# COINHUBX FRONTEND ENVIRONMENT CONFIGURATION
# ============================================

REACT_APP_BACKEND_URL=https://yourdomain.com
REACT_APP_FRONTEND_URL=https://yourdomain.com
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

---

## ⚠️ CRITICAL NOTES

### DO NOT HARDCODE:
- ❌ Never hardcode API keys in source code
- ❌ Never commit .env files to Git
- ❌ Never expose secrets in frontend code

### SECURITY CHECKLIST:
- ✅ All .env files in .gitignore
- ✅ Different secrets for production vs staging
- ✅ Rotate secrets periodically
- ✅ Use environment-specific configs

### DEPLOYMENT CHECKLIST:
1. Copy `.env.sample` to `.env`
2. Fill in all REQUIRED variables
3. Verify database connection
4. Test email sending
5. Test payment integration
6. Verify OAuth redirect URIs match deployment URL

---

## 🔍 VERIFICATION COMMANDS

```bash
# Check if backend .env exists
cat /app/backend/.env | grep -c "="

# Test MongoDB connection
cd /app/backend && python3 -c "from pymongo import MongoClient; import os; c=MongoClient(os.environ['MONGO_URL']); print('DB:', c.list_database_names())"

# Test SendGrid
cd /app/backend && python3 -c "import os; print('SendGrid:', 'SG.' in os.environ.get('SENDGRID_API_KEY', ''))"

# Check backend health
curl -s https://YOUR_DOMAIN/api/health | jq .
```

---

## 📞 SERVICE CONTACTS

| Service | Dashboard | Support |
|---------|-----------|--------|
| MongoDB Atlas | https://cloud.mongodb.com/ | support@mongodb.com |
| SendGrid | https://app.sendgrid.com/ | support@sendgrid.com |
| Twilio | https://console.twilio.com/ | help@twilio.com |
| NOWPayments | https://account.nowpayments.io/ | support@nowpayments.io |
| Google Cloud | https://console.cloud.google.com/ | https://cloud.google.com/support |

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2025  
**Author:** CoinHubX Engineering
