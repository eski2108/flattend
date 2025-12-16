# CoinHubX Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `/app/.env.sample` to `/app/backend/.env`
- [ ] Copy `/app/frontend/.env.sample` to `/app/frontend/.env`
- [ ] Fill in ALL required environment variables
- [ ] Verify `.env` files are in `.gitignore`

### 2. Database
- [ ] MongoDB Atlas cluster created
- [ ] Connection string tested
- [ ] Database indexes created
- [ ] Backup strategy configured

### 3. External Services
- [ ] SendGrid account verified
- [ ] SendGrid sender email/domain authenticated
- [ ] Twilio account set up (if using SMS)
- [ ] Twilio Verify service created
- [ ] NOWPayments API key obtained
- [ ] NOWPayments IPN webhook configured
- [ ] Google OAuth credentials created
- [ ] Google OAuth redirect URIs match production URL

### 4. Security
- [ ] JWT_SECRET is unique 64-char hex string
- [ ] SECRET_KEY is unique 64-char hex string
- [ ] All passwords are strong
- [ ] CORS_ORIGINS only includes production domains
- [ ] PRODUCTION=true is set

## Deployment

### 5. Server Setup
```bash
# Install dependencies
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install

# Start services
sudo supervisorctl restart all

# Check status
sudo supervisorctl status
```

### 6. Post-Deployment Verification
- [ ] Health check: `curl https://yourdomain.com/api/health`
- [ ] Login works with email/password
- [ ] Google OAuth redirects correctly
- [ ] Email sending works (test registration)
- [ ] NOWPayments deposits generate addresses
- [ ] Admin panel accessible

### 7. Monitoring
- [ ] Backend logs: `tail -f /var/log/supervisor/backend.err.log`
- [ ] Frontend logs: `tail -f /var/log/supervisor/frontend.err.log`

## Rollback Plan

```bash
# If deployment fails
git checkout main
sudo supervisorctl restart all
```

## Contacts

| Issue | Contact |
|-------|--------|
| Database | MongoDB Atlas Support |
| Email | SendGrid Support |
| Payments | NOWPayments Support |
| Auth | Google Cloud Support |
