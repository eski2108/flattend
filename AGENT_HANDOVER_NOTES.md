# CoinHubX Agent Handover Notes

> **Last Updated:** December 25, 2025
> **Session:** Task 3 Reliability & Monitoring + 2FA LIVE Enforcement

---

## 🔒 LOCKED - DO NOT MODIFY

The following are **COMPLETE and LOCKED**. Do not refactor, "improve", or touch:

1. **Bot Engine & Exchange Adapters** - Phase 8 complete
2. **Security Hardening (Task 1)** - Rate limiting, WAF, velocity limits
3. **Ledger & Reconciliation (Task 2)** - Canonical ledger system
4. **Monitoring System (Task 3)** - Health checks, metrics, alerts
5. **2FA System** - Full TOTP implementation + LIVE mode enforcement

---

## ✅ COMPLETED THIS SESSION

### Task 3: Reliability & Monitoring

| Component | Status | Files |
|-----------|--------|-------|
| Structured Logging | ✅ | `monitoring_system.py` |
| Health Endpoints | ✅ | `/api/health`, `/api/ready` |
| Metrics | ✅ | `/api/metrics`, `/api/metrics/prometheus` |
| Error Tracking | ✅ | Sentry SDK integrated |
| Job Monitoring | ✅ | `/api/jobs`, `/api/jobs/dead-letter` |
| Backup System | ✅ | Daily automated + restore tested |
| Runbook | ✅ | `/app/backend/docs/RUNBOOK.md` |

### 2FA LIVE Mode Enforcement

| Enforcement Point | File | Line |
|-------------------|------|------|
| `validate_live_mode()` | `bot_execution_engine.py` | 205 |
| `check_2fa_for_live_trading()` | `bot_execution_engine.py` | 287 |
| `POST /bots/create` | `server.py` | 37907 |
| `POST /bots/start` | `server.py` | 37939 |
| `POST /bots/{id}/confirm-live-mode` | `server.py` | 39289 |

**Error Response:**
```json
{
    "detail": "LIVE_MODE_BLOCKED: 2FA_REQUIRED: Two-factor authentication must be enabled for LIVE trading."
}
```

### UI Polish (Trading Bots Page)

- 3D coin icons (same as wallet/footer)
- Institutional look (dimmed secondary text, flat filters)
- Thin progress line in wizard with step labels
- Tabular numerals for prices
- Pair format: "BTC / USD"

### Trading Page Fixes

- Added percentage buttons (25%, 50%, 75%, 100%) to SpotTradingPro.js
- Fixed WAF blocking `/api/prices/live` endpoint

---

## 📁 KEY FILES REFERENCE

### Backend

```
/app/backend/
├── server.py                    # Main FastAPI app (40K+ lines)
├── bot_execution_engine.py      # Bot engine + LIVE validator
├── monitoring_system.py         # Health, metrics, logging
├── monitoring_routes.py         # Monitoring API endpoints
├── security_hardening_v2.py     # Security features (Task 1)
├── security_integration.py      # Security middleware
├── ledger_system.py             # Canonical ledger (Task 2)
├── two_factor_auth.py           # 2FA TOTP implementation
├── backup_system.py             # Automated backups
└── docs/
    └── RUNBOOK.md               # Operations runbook
```

### Frontend

```
/app/frontend/src/
├── pages/
│   ├── TradingBots.js           # Bot management (polished)
│   ├── SpotTradingPro.js        # Spot trading (% buttons added)
│   └── MobileTradingPage.js     # Mobile trading
├── components/
│   ├── Coin3DIcon.js            # 3D coin icons
│   ├── settings/
│   │   └── TwoFactorSettings.js # 2FA UI
│   └── PriceTickerEnhanced.js   # Price ticker
```

---

## 🔑 IMPORTANT TECHNICAL NOTES

### 2FA Implementation

- **Method:** TOTP (RFC 6238) - Google Authenticator compatible
- **DB Fields:** `two_factor_enabled`, `twofa_secret`, `twofa_backup_codes`
- **Collections:** `users` (flag), `two_factor_auth` (secrets)
- **Mandatory for:** Withdrawals, password changes, API keys, LIVE trading

### LIVE Mode Validation

LIVE mode requires ALL of:
1. ✅ 2FA enabled
2. ✅ Explicit user confirmation
3. ✅ Valid exchange credentials
4. ✅ Sufficient balance
5. ✅ Risk acknowledgment
6. ✅ No kill switches active

### Monitoring Endpoints

| Endpoint | Purpose |
|----------|----------|
| `GET /api/health` | Liveness probe (always returns 200 if running) |
| `GET /api/ready` | Readiness probe (checks DB, Redis, queue) |
| `GET /api/metrics` | JSON metrics |
| `GET /api/metrics/prometheus` | Prometheus format |
| `GET /api/dashboard` | Admin monitoring dashboard |
| `GET /api/jobs` | Background job stats |
| `GET /api/alerts` | Active alerts |
| `GET /api/errors` | Error summary |

### Security Skip Paths

These endpoints bypass WAF/rate limiting (defined in `security_integration.py`):
- `/api/health`, `/api/ready`, `/api/metrics`
- `/api/prices`, `/api/exchange-rates`, `/api/coins`
- `/api/p2p/offers`, `/api/p2p/marketplace`
- `/api/savings/products`

---

## 🚀 NEXT TASKS (User's Roadmap)

### P1: LIVE Trading Rollout (Gated)
- Keep PAPER as default
- Enable LIVE for whitelisted users only
- Clear UI for credentials and controls

### P2: Monetisation & Growth
- Bot tiers (free vs. paid)
- VIP/fee tiers
- Referral anti-abuse checks

---

## ⚠️ KNOWN ISSUES

1. **Bot creation from UI** - May have issues with "GBP wallet not found" (not fixed this session)
2. **MongoDB not replica set** - Atomic transactions disabled (infrastructure limitation)
3. **Redis not running** - Health check shows "degraded" (Redis optional, using in-memory cache)

---

## 🧪 TEST SCRIPTS

```bash
# Monitoring verification
python3 /app/backend/scripts/test_monitoring_complete.py

# Backup/restore test
python3 /app/backend/scripts/test_backup_restore.py

# LIVE mode 2FA enforcement test
python3 /app/backend/scripts/test_live_mode_2fa.py
```

---

## 📋 SERVICES

```bash
# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart all

# Check logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

---

**DO NOT:**
- Modify locked systems
- Add new animations or colors to UI
- Touch fees, liquidity, or core trading logic
- Downgrade package versions

**DO:**
- Read this document before making changes
- Test after any backend changes
- Keep changes minimal and focused
- Document what you change
