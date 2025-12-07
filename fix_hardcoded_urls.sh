#!/bin/bash
# Fix all hardcoded API URLs in frontend

cd /app/frontend/src/pages

# Fix files with simple 'const API =' pattern
for file in Savings.jsx PremiumAuth.js PortfolioPage.js ForgotPassword.js \
            ReferralLinkGenerator.js AdminSecurityLogs.js ReferralsPageNew.js \
            ReferralsPage.js Login.js ReferralDashboardComprehensive.js \
            Login2.js PaymentMethods.js Register2.js AllocationsPage.js \
            SpotTrading2.js ReferralDashboardNew.js; do
  if [ -f "$file" ]; then
    sed -i "s|const API = 'https://coinhubx.net/api';|const API = process.env.REACT_APP_BACKEND_URL;|g" "$file"
    echo "Fixed $file"
  fi
done

# Fix SpotTradingFresh.js which uses API_BASE
if [ -f "SpotTradingFresh.js" ]; then
  sed -i "s|const API_BASE = 'https://coinhubx.net/api';|const API_BASE = process.env.REACT_APP_BACKEND_URL;|g" "SpotTradingFresh.js"
  echo "Fixed SpotTradingFresh.js"
fi

# Fix RegisterPageRebuild.js
if [ -f "RegisterPageRebuild.js" ]; then
  sed -i "s|const API_BASE = 'https://coinhubx.net/api';|const API_BASE = process.env.REACT_APP_BACKEND_URL;|g" "RegisterPageRebuild.js"
  echo "Fixed RegisterPageRebuild.js"
fi

# Fix config/api.js
cd /app/frontend/src/config
if [ -f "api.js" ]; then
  sed -i "s|const BACKEND_URL = 'https://coinhubx.net';|const BACKEND_URL = process.env.REACT_APP_BACKEND_URL.replace('/api', '');|g" "api.js"
  sed -i "s|export const API_BASE_URL = 'https://coinhubx.net/api';|export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;|g" "api.js"
  echo "Fixed config/api.js"
fi

echo "All hardcoded URLs fixed!"
