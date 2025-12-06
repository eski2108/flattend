#!/bin/bash

# Remove all hardcoded test URLs and replace with production-ready environment variable usage

echo "🔧 Removing hardcoded test URLs from frontend..."
echo "============================================="

# Replace all instances of the test URL fallback with proper error handling
find /app/frontend/src -name "*.js" -type f -exec sed -i "s|process.env.REACT_APP_BACKEND_URL || 'https://tradepanel-12.preview.emergentagent.com'|process.env.REACT_APP_BACKEND_URL|g" {} \;

echo "✅ Removed hardcoded fallback URLs from API calls"

# Replace hardcoded links in Layout and Footer
sed -i "s|window.open('https://tradepanel-12.preview.emergentagent.com', '_blank')|window.open(process.env.REACT_APP_FRONTEND_URL || window.location.origin, '_blank')|g" /app/frontend/src/components/Layout.js
sed -i "s|window.open('https://tradepanel-12.preview.emergentagent.com', '_blank')|window.open(process.env.REACT_APP_FRONTEND_URL || window.location.origin, '_blank')|g" /app/frontend/src/components/Footer.js
sed -i "s|window.open('https://tradepanel-12.preview.emergentagent.com', '_blank')|window.open(process.env.REACT_APP_FRONTEND_URL || window.location.origin, '_blank')|g" /app/frontend/src/pages/LandingPage_ORIGINAL.js 2>/dev/null

echo "✅ Fixed hardcoded window.open URLs"

# Fix whitelabel config to use environment variable only
sed -i "s|process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'|process.env.REACT_APP_BACKEND_URL|g" /app/frontend/src/config/whitelabel.js

echo "✅ Fixed whitelabel config"

echo ""
echo "============================================="
echo "✅ Cleanup complete!"
echo "============================================="
echo ""
echo "📋 Next steps:"
echo "   1. Update /app/frontend/.env with production URL"
echo "   2. Update /app/backend/.env with production URL"
echo "   3. Run: sudo supervisorctl restart all"
echo ""
