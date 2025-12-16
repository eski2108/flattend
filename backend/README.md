# CoinHubX Backend

FastAPI-based backend for the CoinHubX cryptocurrency exchange platform.

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Fill in your environment variables (see ENV_SETUP.md for details)
nano .env

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Documentation

- **[ENV_SETUP.md](./ENV_SETUP.md)** - Complete environment configuration guide
- **[.env.example](./.env.example)** - Environment variable template

## Environment Variables

See [ENV_SETUP.md](./ENV_SETUP.md) for complete documentation.

**Minimum required:**
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret
- `SENDGRID_API_KEY` - Email service
- `NOWPAYMENTS_API_KEY` - Crypto payments

## API Endpoints

All endpoints are prefixed with `/api`

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth

### Wallet
- `GET /api/wallet/{user_id}` - Get wallet balances
- `POST /api/wallet/deposit` - Create deposit address
- `POST /api/wallet/withdraw` - Request withdrawal

### Trading
- `POST /api/admin-liquidity/quote` - Get instant buy/sell quote
- `POST /api/admin-liquidity/execute` - Execute trade
- `POST /api/swap` - Crypto-to-crypto swap

### P2P
- `GET /api/p2p/offers` - List P2P offers
- `POST /api/p2p/trade` - Create P2P trade
- `POST /api/p2p/escrow/release` - Release escrow

## Tech Stack

- **Framework:** FastAPI
- **Database:** MongoDB
- **Email:** SendGrid
- **Payments:** NOWPayments
- **SMS/2FA:** Twilio
- **Auth:** JWT + Google OAuth

## Health Check

```bash
curl http://localhost:8001/api/health
```

## License

Proprietary - CoinHubX
