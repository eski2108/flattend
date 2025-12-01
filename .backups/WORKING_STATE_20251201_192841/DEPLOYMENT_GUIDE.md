# COIN HUB X - Deployment Guide

Complete guide for deploying Coin Hub X P2P Crypto Marketplace to production.

---

## 🚀 Quick Deployment Options

### Option 1: Vercel (Frontend) + Heroku (Backend) - RECOMMENDED
**Best for:** Quick deployment, automatic scaling
**Cost:** Free tier available, ~$20-30/month for production
**Time:** 30 minutes

### Option 2: AWS (Full Stack)
**Best for:** Full control, scalability
**Cost:** ~$50-100/month
**Time:** 2-3 hours

### Option 3: DigitalOcean Droplet (VPS)
**Best for:** Cost-effective, single server
**Cost:** $12-24/month
**Time:** 1-2 hours

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. External Services Setup

#### MongoDB Atlas (Database)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster (M0 free tier)
4. Create database user
5. Whitelist IP: `0.0.0.0/0` (all IPs)
6. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/
   ```

#### NOWPayments (Crypto Deposits)
1. Sign up: https://nowpayments.io/
2. Complete KYC verification
3. Go to Settings → API Keys
4. Generate API Key
5. Create IPN Secret
6. Set IPN callback URL: `https://yourdomain.com/api/nowpayments/ipn`

#### SendGrid (Email Service)
1. Sign up: https://sendgrid.com/
2. Verify sender email
3. Create API Key (Full Access)
4. Note: Free tier = 100 emails/day

#### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://yourdomain.com/login`
   - `https://yourdomain.com/register`
6. Copy Client ID

#### Tawk.to (Live Chat)
- Already configured: Property ID `691f23e9351c3d1963d273aa`
- No additional setup needed

### 2. Environment Variables Ready

Create production `.env` files with real values:

**Backend:**
```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=coinhubx_production
JWT_SECRET=[generate 32+ char random string]
NOWPAYMENTS_API_KEY=[your key]
NOWPAYMENTS_IPN_SECRET=[your secret]
NOWPAYMENTS_SANDBOX=false
SENDGRID_API_KEY=[your key]
ADMIN_FEE_PERCENTAGE=1.0
CORS_ORIGINS=https://yourdomain.com
```

**Frontend:**
```env
REACT_APP_BACKEND_URL=https://api.yourdomain.com/api
REACT_APP_GOOGLE_CLIENT_ID=[your client id]
REACT_APP_TAWK_PROPERTY_ID=691f23e9351c3d1963d273aa
```

---

## 🌐 DEPLOYMENT: OPTION 1 (Vercel + Heroku)

### Step 1: Deploy Backend to Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login to Heroku
heroku login

# Create app
cd backend
heroku create coinhubx-api

# Add Python buildpack
heroku buildpacks:set heroku/python

# Set environment variables
heroku config:set MONGO_URL="mongodb+srv://..."
heroku config:set DB_NAME="coinhubx_production"
heroku config:set JWT_SECRET="your_secret_here"
heroku config:set NOWPAYMENTS_API_KEY="your_key"
heroku config:set NOWPAYMENTS_IPN_SECRET="your_secret"
heroku config:set NOWPAYMENTS_SANDBOX="false"
heroku config:set SENDGRID_API_KEY="your_key"
heroku config:set ADMIN_FEE_PERCENTAGE="1.0"

# Create Procfile
echo "web: gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:\$PORT" > Procfile

# Add gunicorn to requirements.txt
echo "gunicorn" >> requirements.txt

# Deploy
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a coinhubx-api
git push heroku main

# Your backend URL: https://coinhubx-api.herokuapp.com
```

### Step 2: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd ../frontend

# Update .env with backend URL
echo "REACT_APP_BACKEND_URL=https://coinhubx-api.herokuapp.com/api" > .env.production

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? [your account]
# - Link to existing project? No
# - Project name: coinhubx
# - Directory: ./
# - Override settings? No

# Set environment variables in Vercel dashboard
vercel env add REACT_APP_BACKEND_URL production
vercel env add REACT_APP_GOOGLE_CLIENT_ID production
vercel env add REACT_APP_TAWK_PROPERTY_ID production

# Deploy to production
vercel --prod

# Your frontend URL: https://coinhubx.vercel.app
```

### Step 3: Update CORS in Backend

```bash
# Update Heroku config
heroku config:set CORS_ORIGINS="https://coinhubx.vercel.app" -a coinhubx-api
```

### Step 4: Test Deployment

1. Visit `https://coinhubx.vercel.app`
2. Register new account
3. Test login
4. Navigate to Marketplace
5. Check Tawk.to chat widget

---

## 🐳 DEPLOYMENT: OPTION 2 (Docker + DigitalOcean)

### Step 1: Create Dockerfile for Backend

```dockerfile
# /backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

COPY . .

CMD ["gunicorn", "server:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8001"]
```

### Step 2: Create Dockerfile for Frontend

```dockerfile
# /frontend/Dockerfile
FROM node:18 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Create nginx.conf for Frontend

```nginx
# /frontend/nginx.conf
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 4: Create docker-compose.yml

```yaml
# /docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=${MONGO_URL}
      - DB_NAME=${DB_NAME}
      - JWT_SECRET=${JWT_SECRET}
      - NOWPAYMENTS_API_KEY=${NOWPAYMENTS_API_KEY}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

### Step 5: Deploy to DigitalOcean

```bash
# Create droplet (Ubuntu 22.04, $12/month)
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose

# Clone your repository
git clone https://github.com/yourusername/coinhubx.git
cd coinhubx

# Create .env file
nano .env
# [Paste your environment variables]

# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 6: Setup Domain & SSL

```bash
# Install Nginx on host
apt install nginx certbot python3-certbot-nginx

# Configure Nginx reverse proxy
nano /etc/nginx/sites-available/coinhubx

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com;
    
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/coinhubx /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com
```

---

## 📊 POST-DEPLOYMENT TASKS

### 1. Database Indexes

```bash
# Connect to MongoDB Atlas
mongosh "mongodb+srv://..."

# Switch to production database
use coinhubx_production

# Create indexes (copy from DATABASE_SCHEMA.md)
db.users.createIndex({ "email": 1 }, { unique: true });
db.trader_profiles.createIndex({ "user_id": 1 }, { unique: true });
# ... [create all indexes]
```

### 2. Create Admin User

```bash
# Use API or MongoDB directly
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "secure_password",
    "full_name": "Admin User"
  }'

# Then update role in MongoDB
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
);
```

### 3. Configure NOWPayments Webhook

1. Login to NOWPayments dashboard
2. Go to Settings → IPN Settings
3. Set IPN Callback URL: `https://yourdomain.com/api/nowpayments/ipn`
4. Save

### 4. Test Payment Flow

1. Create test trader account
2. Go to deposit page
3. Create small deposit (0.001 BTC)
4. Complete payment
5. Verify balance updates

### 5. Setup Monitoring

**Backend Monitoring (Heroku):**
```bash
# Install New Relic addon
heroku addons:create newrelic:wayne -a coinhubx-api

# View logs
heroku logs --tail -a coinhubx-api
```

**Frontend Monitoring (Vercel):**
- Analytics automatically enabled
- View at: https://vercel.com/dashboard/analytics

**Database Monitoring (MongoDB Atlas):**
- View at: https://cloud.mongodb.com/
- Monitor: Connections, Operations, Storage

---

## 🔒 SECURITY HARDENING

### 1. Environment Variables

```bash
# Generate strong secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET
```

### 2. MongoDB Security

```javascript
// Create database user with limited permissions
use admin
db.createUser({
  user: "coinhubx_app",
  pwd: "strong_password",
  roles: [
    { role: "readWrite", db: "coinhubx_production" }
  ]
});
```

### 3. API Rate Limiting

Add to backend (`server.py`):
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request):
    # ... login logic
```

### 4. Firewall Rules (DigitalOcean)

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

---

## 📈 SCALING GUIDE

### When to Scale

**Signs you need to scale:**
- Response time > 2 seconds
- CPU usage > 80%
- Memory usage > 80%
- Database connections maxed out
- 500+ concurrent users

### Horizontal Scaling (Heroku)

```bash
# Scale backend to 2 dynos
heroku ps:scale web=2 -a coinhubx-api

# Upgrade to Standard dyno ($25/month)
heroku ps:type Standard-1x -a coinhubx-api
```

### Database Scaling (MongoDB Atlas)

1. Go to Atlas dashboard
2. Click "Modify Cluster"
3. Upgrade tier: M0 (free) → M10 ($57/month)
4. Add read replicas for better read performance

### CDN Setup (Vercel)

- Automatic on Vercel
- Global edge caching included
- No additional configuration needed

---

## 🔄 BACKUP & RECOVERY

### Daily Database Backups

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri="mongodb+srv://..." --out="/backups/$DATE"
tar -czf "/backups/backup-$DATE.tar.gz" "/backups/$DATE"
rm -rf "/backups/$DATE"

# Upload to S3 (optional)
aws s3 cp "/backups/backup-$DATE.tar.gz" "s3://coinhubx-backups/"
```

### Restore from Backup

```bash
# Extract backup
tar -xzf backup-20251120.tar.gz

# Restore to MongoDB
mongorestore --uri="mongodb+srv://..." --dir="./backup-20251120"
```

---

## 🐛 TROUBLESHOOTING PRODUCTION

### Backend Issues

**Issue:** 502 Bad Gateway
```bash
# Check backend status
heroku ps -a coinhubx-api

# View logs
heroku logs --tail -a coinhubx-api

# Restart dynos
heroku restart -a coinhubx-api
```

**Issue:** Database connection timeout
```bash
# Check MongoDB Atlas network access
# Add current IP to whitelist
# Or use 0.0.0.0/0 for all IPs
```

### Frontend Issues

**Issue:** API calls failing (CORS)
- Check backend `CORS_ORIGINS` includes frontend URL
- Verify `REACT_APP_BACKEND_URL` is correct
- Check browser console for errors

**Issue:** Environment variables not loading
```bash
# Rebuild frontend
vercel --prod

# Or for manual build:
npm run build
vercel deploy --prod
```

---

## 📞 SUPPORT

**Deployment Issues:**
- Heroku Status: https://status.heroku.com/
- Vercel Status: https://vercel-status.com/
- MongoDB Atlas Support: support@mongodb.com

**Application Issues:**
- Check logs first
- Review error messages
- Test locally before deploying fixes

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] MongoDB Atlas cluster created
- [ ] NOWPayments account setup & API keys obtained
- [ ] SendGrid account setup & sender verified
- [ ] Google OAuth credentials created
- [ ] All environment variables configured
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Database indexes created
- [ ] Admin user created
- [ ] NOWPayments IPN webhook configured
- [ ] SSL certificate installed
- [ ] Test payment flow completed
- [ ] Monitoring setup
- [ ] Backup system configured
- [ ] Domain DNS configured
- [ ] Google OAuth redirect URIs updated

---

**Deployment Complete! 🎉**

Your Coin Hub X P2P marketplace is now live and ready for users.
