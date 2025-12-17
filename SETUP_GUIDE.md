# CoinHubX Setup Guide

## Quick Start

### 1. Environment Variables

Create a `.env` file in the `/backend` folder with:

```env
# Database
MONGO_URL=mongodb+srv://coinhubx:mummy1231123@cluster0.ctczzad.mongodb.net/?appName=Cluster0&retryWrites=true&w=majority
DB_NAME=coinhubx_production

# Security
JWT_SECRET=a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8
SECRET_KEY=b8e9f0a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9

# NOWPayments (Crypto Payments)
NOWPAYMENTS_API_KEY=RN27NA0-D32MD5G-M6N2G6T-KWQMEAP
NOWPAYMENTS_IPN_SECRET=NiW6+bCEl2Dw/0gBuxEuL0+fbGo2oWij

# Email (SendGrid)
SENDGRID_API_KEY=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
SENDER_EMAIL=info@coinhubx.net
```

Create a `.env` file in the `/frontend` folder with:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

### 2. Test User Credentials

**Working Test Account (VERIFIED):**
- Email: `testuser@coinhubx.com`
- Password: `TestPass123!`

**Alternative - Create a new account:**
1. Go to `/register`
2. Fill in: name, email, phone, password
3. Login at `/login`

---

### 3. API Endpoints

**Base URL:** `http://localhost:8001/api`

**Health Check:**
```bash
curl http://localhost:8001/api/health
```

**Register User:**
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User","phone_number":"+447123456789"}'
```

**Login:**
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Get Prices:**
```bash
curl http://localhost:8001/api/prices/live
```

---

### 4. Running Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd frontend
yarn install
yarn start
```

---

### 5. Common Issues

**API not working:**
1. Check MongoDB connection string is correct
2. Ensure port 8001 is not in use
3. Check backend logs for errors

**Login not working:**
1. Create a new user via register endpoint first
2. Use exact email/password from registration
3. Check if user exists in database

**CORS errors:**
- Backend allows all origins by default
- If issues persist, check REACT_APP_BACKEND_URL matches your backend URL

---

### 6. Database Collections

- `users` - User accounts
- `wallets` - User wallets
- `transactions` - All transactions
- `savings_positions` - Locked savings
- `p2p_trades` - P2P marketplace trades

---

**Last Updated:** December 2024
