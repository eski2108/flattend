# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

## ✅ PRE-DEPLOYMENT

### 1. Database Cleanup
- [ ] Run cleanup script: `python3 /app/backend/cleanup_for_production.py`
- [ ] Verify all test data removed
- [ ] Confirm admin account created
- [ ] Check admin wallet initialized at 0 balance

### 2. Environment Variables Setup

#### Backend (.env)
```bash
# Database
MONGO_URL=mongodb://localhost:27017

# Backend URL (will be your production domain)
BACKEND_URL=https://api.yourdomain.com

# JWT Secret (generate new for production)
JWT_SECRET=<generate-strong-secret-here>
SECRET_KEY=<generate-strong-secret-here>

# Email (SendGrid)
SENDGRID_API_KEY=<your-sendgrid-key>
SENDER_EMAIL=noreply@yourdomain.com

# Payment Gateway (NOWPayments)
NOWPAYMENTS_API_KEY=<your-nowpayments-key>
NOWPAYMENTS_IPN_SECRET=<your-ipn-secret>

# Admin Settings
ADMIN_EMAIL=admin@yourdomain.com

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Mode
PRODUCTION=true
DEBUG=false
```

#### Frontend (.env)
```bash
# Backend API URL (your production domain)
REACT_APP_BACKEND_URL=https://api.yourdomain.com

# Frontend URL (your main domain)
REACT_APP_FRONTEND_URL=https://yourdomain.com

# Google OAuth (if using)
REACT_APP_GOOGLE_CLIENT_ID=<your-google-client-id>
```

### 3. Security Review
- [ ] Change default admin password
- [ ] Generate new JWT_SECRET and SECRET_KEY
- [ ] Verify all API keys are production keys (not test)
- [ ] Check CORS settings allow only your domain
- [ ] Review rate limiting configuration
- [ ] Ensure HTTPS is enforced

### 4. Code Review
- [ ] No hardcoded URLs in code
- [ ] All environment variables properly used
- [ ] No console.log or debug statements in production code
- [ ] Error messages don't expose sensitive info
- [ ] All API endpoints require authentication where needed

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Clean Database
```bash
cd /app/backend
python3 cleanup_for_production.py
```

### Step 2: Update Environment Variables
```bash
# Backend
cd /app/backend
nano .env  # Update all URLs to production domain

# Frontend
cd /app/frontend
nano .env  # Update REACT_APP_BACKEND_URL
```

### Step 3: Build Frontend for Production
```bash
cd /app/frontend
yarn build
```

### Step 4: Restart All Services
```bash
sudo supervisorctl restart all
```

### Step 5: Verify Services
```bash
sudo supervisorctl status

# Should show:
# backend    RUNNING
# frontend   RUNNING
# mongodb    RUNNING
```

---

## ✅ POST-DEPLOYMENT

### 1. Admin Setup
- [ ] Login as admin (admin@coinhubx.net / Admin@2025!Change)
- [ ] **IMMEDIATELY change admin password**
- [ ] Set up 2FA if available
- [ ] Configure fee settings
- [ ] Set referral commission rates

### 2. Add Initial Liquidity
- [ ] Add GBP to admin wallet for instant buy
- [ ] Add crypto (BTC, ETH, etc.) for instant buy
- [ ] Set markup percentages
- [ ] Test instant buy flow

### 3. Testing Critical Flows
- [ ] User registration
- [ ] User login
- [ ] Email verification
- [ ] P2P order creation
- [ ] P2P trade execution
- [ ] Instant buy
- [ ] Swap transaction
- [ ] Withdrawal request
- [ ] Deposit processing
- [ ] Referral link generation
- [ ] Admin dashboard access

### 4. Monitoring Setup
- [ ] Check backend logs: `tail -f /var/log/supervisor/backend.*.log`
- [ ] Check frontend logs: `tail -f /var/log/supervisor/frontend.*.log`
- [ ] Set up uptime monitoring
- [ ] Configure error alerts
- [ ] Set up transaction monitoring

### 5. External Services
- [ ] Update Google OAuth redirect URI
- [ ] Configure SendGrid sender domain
- [ ] Verify NOWPayments webhook URL
- [ ] Test payment notifications

---

## 🔍 VERIFICATION COMMANDS

### Check Database is Clean
```bash
mongosh coinhubx --eval "db.user_accounts.countDocuments()"
mongosh coinhubx --eval "db.transactions.countDocuments()"
mongosh coinhubx --eval "db.crypto_balances.countDocuments()"

# Should show:
# 1 (admin user only)
# 0 (no transactions)
# 8 (admin wallet in 8 currencies, all at 0)
```

### Check Backend API
```bash
curl http://localhost:8001/api/health
# Should return: {"status":"healthy",...}
```

### Check Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

### Check Environment Variables
```bash
# Backend
cd /app/backend
grep -E "BACKEND_URL|REACT_APP" .env

# Frontend
cd /app/frontend
grep -E "REACT_APP" .env
```

---

## 🚨 CRITICAL SECURITY ITEMS

### Must Do Before Going Live:

1. **Change Admin Password**
   - Default: `Admin@2025!Change`
   - Change to strong unique password
   - Store securely

2. **Generate New Secrets**
   ```bash
   # Generate JWT_SECRET
   openssl rand -hex 32
   
   # Generate SECRET_KEY
   openssl rand -hex 32
   
   # Update in /app/backend/.env
   ```

3. **Update Email Settings**
   - Add production SendGrid API key
   - Verify sender email domain
   - Test email delivery

4. **Update Payment Gateway**
   - Switch to production NOWPayments keys
   - Update webhook URL to production domain
   - Test payment flow

5. **SSL/HTTPS**
   - Ensure SSL certificate is installed
   - Force HTTPS redirect
   - Check certificate expiry date

---

## 📊 MONITORING CHECKLIST

### Logs to Monitor:
- [ ] Backend API logs
- [ ] Frontend errors
- [ ] Database connection issues
- [ ] Payment gateway responses
- [ ] Email delivery failures
- [ ] Withdrawal requests
- [ ] Large transactions
- [ ] Admin wallet balance changes

### Metrics to Track:
- [ ] User signups per day
- [ ] Active users
- [ ] Total trading volume
- [ ] Fee revenue
- [ ] Referral commissions paid
- [ ] Withdrawal success rate
- [ ] API response times
- [ ] Error rates

---

## 🔄 ROLLBACK PLAN

If something goes wrong:

1. **Immediate Actions:**
   ```bash
   # Stop services
   sudo supervisorctl stop all
   
   # Restore database backup (if you have one)
   mongorestore --db coinhubx /path/to/backup
   
   # Revert environment variables
   # Switch back to test URLs
   
   # Restart services
   sudo supervisorctl start all
   ```

2. **Investigation:**
   - Check logs for errors
   - Verify environment variables
   - Test API endpoints manually
   - Check database connectivity

3. **Communication:**
   - Notify users if needed
   - Post status update
   - Set maintenance mode if available

---

## ✅ FINAL CHECKLIST

Before announcing launch:

- [ ] Database cleaned (no test data)
- [ ] Admin password changed
- [ ] All environment variables updated
- [ ] All services running
- [ ] Critical flows tested
- [ ] Initial liquidity added
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Support contact ready
- [ ] Terms of service updated
- [ ] Privacy policy in place
- [ ] Legal compliance verified

---

## 📞 SUPPORT CONTACTS

**Emergency Issues:**
- Check logs: `/var/log/supervisor/`
- Database: `mongosh coinhubx`
- Restart: `sudo supervisorctl restart all`

**Common Issues:**

1. **Backend not starting:**
   - Check: `tail -n 100 /var/log/supervisor/backend.err.log`
   - Fix: Verify MongoDB running, check .env file

2. **Frontend not loading:**
   - Check: `tail -n 100 /var/log/supervisor/frontend.err.log`
   - Fix: Verify backend URL in .env

3. **Payments not working:**
   - Check: NOWPayments API key
   - Fix: Verify webhook URL updated

4. **Emails not sending:**
   - Check: SendGrid API key
   - Fix: Verify sender domain configured

---

**🎉 You're ready to launch!**

*Generated: December 5, 2025*
*Status: Production Ready*
