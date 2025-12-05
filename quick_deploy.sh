#!/bin/bash

echo "\n========================================"
echo "🚀 QUICK PRODUCTION DEPLOYMENT"
echo "========================================\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "⚠️  Please run as root or with sudo"
   exit 1
fi

# Function to prompt for input
prompt_value() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        value=${value:-$default}
    else
        read -p "$prompt: " value
    fi
    
    echo "$value"
}

echo "📋 Collecting deployment information...\n"

# Get production domain
PROD_DOMAIN=$(prompt_value "Enter your production domain (e.g., coinhubx.com)" "")
API_DOMAIN=$(prompt_value "Enter your API subdomain" "api.$PROD_DOMAIN")

echo "\n✅ Domain configuration:"
echo "   Main: https://$PROD_DOMAIN"
echo "   API:  https://$API_DOMAIN"
echo ""

# Confirm
read -p "Is this correct? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "❌ Cancelled"
    exit 0
fi

# Generate secrets
echo "\n🔑 Generating security secrets..."
JWT_SECRET=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 32)
echo "✅ Secrets generated"

# Update backend .env
echo "\n🔧 Updating backend configuration..."
cat > /app/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
BACKEND_URL=https://$API_DOMAIN
JWT_SECRET=$JWT_SECRET
SECRET_KEY=$SECRET_KEY
SENDGRID_API_KEY=${SENDGRID_KEY:-YOUR_SENDGRID_KEY}
SENDER_EMAIL=noreply@$PROD_DOMAIN
NOWPAYMENTS_API_KEY=${NOWPAYMENTS_KEY:-YOUR_NOWPAYMENTS_KEY}
NOWPAYMENTS_IPN_SECRET=${IPN_SECRET:-YOUR_IPN_SECRET}
ADMIN_EMAIL=admin@$PROD_DOMAIN
REDIS_URL=redis://localhost:6379
PRODUCTION=true
DEBUG=false
EOF
echo "✅ Backend .env updated"

# Update frontend .env
echo "\n🔧 Updating frontend configuration..."
cat > /app/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$API_DOMAIN
REACT_APP_FRONTEND_URL=https://$PROD_DOMAIN
REACT_APP_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
EOF
echo "✅ Frontend .env updated"

# Restart services
echo "\n🔄 Restarting services..."
sudo supervisorctl restart all
sleep 3

# Check status
echo "\n📋 Service status:"
sudo supervisorctl status

echo "\n========================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================\n"

echo "📋 Next steps:"
echo "   1. Test: curl http://localhost:8001/api/health"
echo "   2. Login: https://$PROD_DOMAIN/login"
echo "   3. Credentials:"
echo "      Email: admin@coinhubx.net"
echo "      Password: Admin@2025!Change"
echo "   4. ⚠️  CHANGE ADMIN PASSWORD IMMEDIATELY"
echo "   5. Add liquidity to admin wallet"
echo "   6. Update external services:"
echo "      - Google OAuth redirect URI"
echo "      - SendGrid sender domain"
echo "      - NOWPayments webhook URL"
echo "\n"

echo "📝 Important files:"
echo "   - /app/DEPLOYMENT_READY_SUMMARY.md"
echo "   - /app/PRODUCTION_DEPLOYMENT_CHECKLIST.md"
echo "\n"
