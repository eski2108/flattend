#!/bin/bash
#
# ⚠️⚠️⚠️ MANDATORY PRE-DEPLOYMENT INTEGRITY CHECK ⚠️⚠️⚠️
# 
# This script MUST pass before ANY deployment to production.
# If this fails, DO NOT DEPLOY.
#
# CHECKSUM: COINHUBX_LOCKDOWN_2025_f8a9e2c1d4b7
#

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔐 PAYMENT SYNC INTEGRITY CHECK - MANDATORY PRE-DEPLOYMENT      ║"
echo "║  Checksum: COINHUBX_LOCKDOWN_2025_f8a9e2c1d4b7                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Test User ID for integrity check
TEST_USER_ID="80a4a694-a6a4-4f84-94a3-1e5cad51eaf3"

# Backend URL (local or use environment variable)
BACKEND_URL="${BACKEND_URL:-http://localhost:8001}"

echo "📍 Backend URL: $BACKEND_URL"
echo "📍 Test User ID: $TEST_USER_ID"
echo ""

echo "🔍 Running integrity check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_RESPONSE=$(curl -s "${BACKEND_URL}/api/integrity/check?test_user_id=${TEST_USER_ID}")

echo "Response:"
echo "$API_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$API_RESPONSE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if echo "$API_RESPONSE" | grep -q '"status":"healthy"' || echo "$API_RESPONSE" | grep -q '"status": "healthy"'; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║  ✅ INTEGRITY CHECK PASSED - DEPLOYMENT AUTHORIZED               ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    exit 0
else
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║  ❌ INTEGRITY CHECK FAILED - DEPLOYMENT BLOCKED                  ║"
    echo "║                                                                  ║"
    echo "║  ACTION REQUIRED:                                                ║"
    echo "║  1. Check mismatches in response above                           ║"
    echo "║  2. Call POST /api/integrity/sync-all to fix                     ║"
    echo "║  3. Re-run this check                                            ║"
    echo "║                                                                  ║"
    echo "║  DO NOT PROCEED WITH DEPLOYMENT UNTIL THIS PASSES                ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    exit 1
fi
