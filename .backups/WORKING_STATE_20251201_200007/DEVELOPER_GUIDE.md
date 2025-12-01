# CoinHubX Developer Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [Authentication](#authentication)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB 6.0+
- Yarn package manager

### Environment Setup

#### Backend (.env)
```bash
DB_NAME=test_database
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=your_jwt_secret
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password
```

#### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

### Installation

```bash
# Backend
cd /app/backend
pip install -r requirements.txt

# Frontend
cd /app/frontend
yarn install
```

### Running Locally

```bash
# Backend
python server.py

# Frontend
yarn start
```

---

## Project Structure

```
/app
├── backend/
│   ├── server.py                 # Main FastAPI application
│   ├── p2p_wallet_service.py     # P2P escrow logic
│   ├── nowpayments_integration.py # Payment gateway
│   ├── email_service.py          # Email notifications
│   ├── wallet_service.py         # Wallet management
│   └── requirements.txt          # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # React pages
│   │   ├── components/          # Reusable components
│   │   ├── styles/              # CSS files
│   │   ├── utils/               # Utility functions
│   │   └── App.js               # Main app component
│   └── package.json             # Node dependencies
│
└── COMPLETION_SUMMARY.md       # Implementation summary
```

---

## Architecture

### Tech Stack

**Frontend:**
- React 18
- React Router v6
- Axios for API calls
- Sonner for notifications
- Lucide React for icons

**Backend:**
- FastAPI (Python)
- MongoDB (Database)
- Motor (Async MongoDB driver)
- NOWPayments (Payment gateway)
- JWT (Authentication)

**Infrastructure:**
- Supervisor (Process management)
- Nginx (Reverse proxy)

### Key Features

1. **P2P Trading System**
   - Escrow-based trades
   - Multi-currency support
   - Real-time chat
   - Dispute resolution

2. **Wallet Management**
   - Multi-crypto support
   - Deposit via NOWPayments
   - Withdrawal with OTP
   - Balance tracking

3. **Admin Dashboard**
   - Liquidity management
   - Revenue analytics
   - User management
   - Fee configuration

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone_number": "+447700900000",
  "referral_code": "ABC123" // optional
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "message": "User registered successfully"
}
```

#### POST /api/auth/login
Login user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "email": "user@example.com",
  "token": "jwt_token"
}
```

### P2P Trading Endpoints

#### GET /api/p2p/offers
Get available P2P offers.

**Query Parameters:**
- `crypto_currency`: BTC, ETH, etc.
- `ad_type`: buy or sell
- `fiat_currency`: GBP, USD, EUR
- `payment_method`: Bank Transfer, PayPal, etc.

**Response:**
```json
{
  "success": true,
  "offers": [
    {
      "order_id": "order_123",
      "seller_id": "uuid",
      "crypto_currency": "BTC",
      "crypto_amount": 1.5,
      "fiat_currency": "GBP",
      "price_per_unit": 30000,
      "min_purchase": 100,
      "max_purchase": 5000,
      "payment_methods": ["Bank Transfer"]
    }
  ]
}
```

#### POST /api/p2p/create-trade
Create a new P2P trade.

**Request:**
```json
{
  "sell_order_id": "order_123",
  "buyer_id": "uuid",
  "crypto_amount": 0.01,
  "payment_method": "Bank Transfer",
  "buyer_wallet_address": "bc1q...",
  "buyer_wallet_network": "mainnet"
}
```

**Response:**
```json
{
  "success": true,
  "trade_id": "uuid",
  "escrow_locked": true,
  "payment_deadline": "2025-11-28T12:00:00Z"
}
```

### Wallet Endpoints

#### GET /api/wallet/balances/:userId
Get user's wallet balances.

**Response:**
```json
{
  "success": true,
  "balances": [
    {
      "currency": "BTC",
      "balance": 1.5,
      "available": 1.2,
      "locked": 0.3
    }
  ]
}
```

#### POST /api/wallet/withdraw
Request withdrawal.

**Request:**
```json
{
  "user_id": "uuid",
  "currency": "BTC",
  "amount": 0.1,
  "withdrawal_address": "bc1q...",
  "otp_code": "123456"
}
```

### NOWPayments Endpoints

#### POST /api/nowpayments/create-deposit
Generate deposit address.

**Request:**
```json
{
  "user_id": "uuid",
  "amount": 100,
  "currency": "gbp",
  "pay_currency": "btc"
}
```

**Response:**
```json
{
  "success": true,
  "deposit_address": "bc1q...",
  "payment_id": "payment_123",
  "pay_amount": 0.0033
}
```

---

## Database Schema

### Collections

#### user_accounts
```javascript
{
  user_id: String (UUID),
  email: String (unique),
  password_hash: String,
  full_name: String,
  phone_number: String,
  created_at: Date,
  kyc_verified: Boolean,
  referral_code: String,
  referred_by: String
}
```

#### crypto_bank_balances
```javascript
{
  user_id: String (UUID),
  currency: String (BTC, ETH, etc.),
  balance: Number,
  available: Number,
  locked: Number
}
```

#### p2p_trades
```javascript
{
  trade_id: String (UUID),
  sell_order_id: String,
  buyer_id: String,
  seller_id: String,
  crypto_currency: String,
  crypto_amount: Number,
  fiat_currency: String,
  fiat_amount: Number,
  payment_method: String,
  buyer_wallet_address: String,
  escrow_locked: Boolean,
  status: String,
  payment_deadline: Date,
  created_at: Date
}
```

#### enhanced_sell_orders
```javascript
{
  order_id: String,
  seller_id: String,
  crypto_currency: String,
  crypto_amount: Number,
  fiat_currency: String,
  price_per_unit: Number,
  min_purchase: Number,
  max_purchase: Number,
  payment_methods: Array,
  status: String (active/inactive)
}
```

---

## Authentication

### JWT Token Flow

1. User logs in with email/password
2. Backend validates credentials
3. Backend generates JWT token
4. Frontend stores token in localStorage
5. Frontend includes token in Authorization header for API calls

### OTP Flow

1. User initiates sensitive action (withdraw, release escrow)
2. Backend sends OTP to user's email
3. User enters OTP
4. Backend verifies OTP
5. Action is executed

---

## Testing

### Running Tests

```bash
# Backend tests
pytest tests/

# Frontend tests
yarn test
```

### Test Credentials

**User:**
- Email: gads21083@gmail.com
- Password: Test123!

**Admin:**
- Email: info@coinhubx.net
- Password: Demo1234
- Admin Code: CRYPTOLEND_ADMIN_2025

---

## Deployment

### Production Checklist

- [ ] Set production environment variables
- [ ] Enable SSL/TLS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Test all critical flows
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up CDN for static assets

### Supervisor Configuration

```ini
[program:backend]
command=python /app/backend/server.py
autorestart=true

[program:frontend]
command=yarn start
autorestart=true
workdir=/app/frontend
```

---

## Troubleshooting

### Common Issues

#### Frontend not loading
```bash
# Check if frontend is running
sudo supervisorctl status frontend

# Restart frontend
sudo supervisorctl restart frontend

# Check logs
tail -f /var/log/supervisor/frontend.err.log
```

#### Backend API errors
```bash
# Check backend logs
tail -f /var/log/supervisor/backend.err.log

# Restart backend
sudo supervisorctl restart backend
```

#### Database connection issues
```bash
# Check MongoDB status
sudo systemctl status mongodb

# Check connection string in .env
echo $MONGO_URL
```

#### P2P trades not creating
1. Check seller has sufficient balance
2. Verify escrow lock is working
3. Check payment method matches offer
4. Verify wallet address format

### Debug Mode

Enable debug logging:

```python
# In server.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Support

For issues and questions:
- Check documentation first
- Review logs for errors
- Test with test credentials
- Verify environment variables

---

*Last Updated: November 28, 2025*
