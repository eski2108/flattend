#!/bin/bash
# Creates a manifest of all stable files

echo "📋 Creating STABLE file manifest..."

cat > /app/STABLE/STABLE_MANIFEST.json << 'MANIFEST'
{
  "created": "2025-12-11",
  "description": "Protected files - DO NOT MODIFY",
  "backend_files": [
    "server.py",
    "wallet_service.py",
    "email_service.py",
    "nowpayments_integration.py",
    "All existing .py files"
  ],
  "frontend_files": [
    "src/App.js",
    "src/pages/P2PMarketplace.js",
    "src/pages/MerchantCenter.js",
    "src/pages/CreateAd.js",
    "src/pages/AdminDisputeDetail.js",
    "src/pages/AdminDisputes.js",
    "All existing components and pages"
  ],
  "protected_routes": [
    "/p2p",
    "/p2p-marketplace",
    "/p2p/merchant",
    "/p2p/create-ad",
    "/admin/disputes",
    "/admin/disputes/:disputeId"
  ],
  "rules": {
    "no_delete": true,
    "no_rename": true,
    "no_modify_without_approval": true,
    "add_only": true
  }
}
MANIFEST

echo "✅ Manifest created at /app/STABLE/STABLE_MANIFEST.json"
