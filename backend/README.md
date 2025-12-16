# CoinHubX Backend

FastAPI-based backend for the CoinHubX cryptocurrency exchange platform.

---

# ⚠️ ENVIRONMENT SETUP (ENV) – REQUIRED ⚠️

## 🚨 THIS PROJECT WILL NOT RUN WITHOUT ENV CONFIGURATION 🚨

**Before running this project, you MUST:**

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in ALL required variables** (see table below)

3. **Read the full setup guide:** [`ENV_SETUP.md`](./ENV_SETUP.md)

---

### Required Environment Variables

| Variable | Service | Where to Get |
|----------|---------|-------------|
| `MONGO_URL` | MongoDB Atlas | [cloud.mongodb.com](https://cloud.mongodb.com) |
| `DB_NAME` | MongoDB | Your database name |
| `JWT_SECRET` | Security | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SENDGRID_API_KEY` | Email | [sendgrid.com](https://app.sendgrid.com/settings/api_keys) |
| `NOWPAYMENTS_API_KEY` | Crypto Payments | [nowpayments.io](https://account.nowpayments.io) |

### Security Notice

- ✅ `.env.example` is committed (template only, no secrets)
- ❌ `.env` is **NOT** committed (contains your secrets)
- ❌ **NO secrets are stored in GitHub**
- 📖 Full documentation: [`ENV_SETUP.md`](./ENV_SETUP.md)

---

## Quick Start

```bash
# 1. Copy environment template (REQUIRED)
cp .env.example .env

# 2. Fill in your environment variables
nano .env  # Edit with your values from ENV_SETUP.md

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

---

## Documentation

| File | Description |
|------|-------------|
| [`.env.example`](./.env.example) | Environment variable template (copy to `.env`) |
| [`ENV_SETUP.md`](./ENV_SETUP.md) | Complete environment configuration guide |
| [`ESCROW_FLOW.md`](./ESCROW_FLOW.md) | P2P escrow system documentation |
| [`FEE_SYSTEM.md`](./FEE_SYSTEM.md) | Fee structure and revenue tracking |

---

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

---

## Tech Stack

- **Framework:** FastAPI
- **Database:** MongoDB Atlas
- **Email:** SendGrid
- **Payments:** NOWPayments
- **SMS/2FA:** Twilio
- **Auth:** JWT + Google OAuth

---

## Health Check

```bash
curl http://localhost:8001/api/health
```

---

## License

Proprietary - CoinHubX
