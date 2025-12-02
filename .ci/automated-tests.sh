#!/bin/bash

# CoinHubX Automated Test Suite
# Tests all critical flows before merging to main

# Don't exit on error - we want to run all tests
set +e

echo "===================================="
echo "🔍 COINHUBX AUTOMATED TEST SUITE"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test 1: Backend Health Check
echo "Test 1: Backend Health Check..."
BACKEND_URL="http://localhost:8001"
if curl -s -f "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Backend is responding${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Backend not responding${NC}"
    ((FAILED++))
fi
echo ""

# Test 2: Frontend Service Check
echo "Test 2: Frontend Service Check..."
FRONTEND_URL="http://localhost:3000"
if curl -s -f "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Frontend is serving${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Frontend not serving${NC}"
    ((FAILED++))
fi
echo ""

# Test 3: Database Connection
echo "Test 3: Database Connection..."
if supervisorctl status mongodb | grep -q "RUNNING"; then
    echo -e "${GREEN}✅ PASSED: MongoDB is running${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: MongoDB not running${NC}"
    ((FAILED++))
fi
echo ""

# Test 4: API Authentication Endpoint
echo "Test 4: API Authentication Endpoint..."
if curl -s "${BACKEND_URL}/api/auth/login" -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' | grep -q "error\|success\|message\|detail"; then
    echo -e "${GREEN}✅ PASSED: Auth endpoint responding${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Auth endpoint not responding${NC}"
    ((FAILED++))
fi
echo ""

# Test 5: Frontend-Backend Connection
echo "Test 5: Frontend-Backend Connection Config..."
if grep -q "REACT_APP_BACKEND_URL" /app/frontend/.env; then
    BACKEND_CONFIG=$(grep "REACT_APP_BACKEND_URL" /app/frontend/.env | cut -d '=' -f2)
    echo -e "${GREEN}✅ PASSED: Backend URL configured: ${BACKEND_CONFIG}${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Backend URL not configured in frontend${NC}"
    ((FAILED++))
fi
echo ""

# Test 6: Critical Pages Exist
echo "Test 6: Critical Frontend Pages..."
CRITICAL_PAGES=(
    "Login.js"
    "Dashboard.js"
    "WalletPage.js"
    "P2PExpress.js"
    "P2PMarketplace.js"
    "OrderPreview.js"
)

MISSING_PAGES=0
for page in "${CRITICAL_PAGES[@]}"; do
    if [ ! -f "/app/frontend/src/pages/${page}" ]; then
        echo -e "${RED}❌ Missing: ${page}${NC}"
        ((MISSING_PAGES++))
    fi
done

if [ $MISSING_PAGES -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: All critical pages exist${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: ${MISSING_PAGES} critical pages missing${NC}"
    ((FAILED++))
fi
echo ""

# Test 7: No Debug Elements in Production Code
echo "Test 7: No Debug Elements..."
DEBUG_OUTPUT=$(grep -r "TOP OF COMPONENT\|TESTING IF CHANGES\|🔴 TESTING\|ULTRA TEST" /app/frontend/src/pages/*.js 2>/dev/null | grep -v "node_modules" || true)
if [ -n "$DEBUG_OUTPUT" ]; then
    echo "$DEBUG_OUTPUT" | head -5
    echo -e "${RED}❌ FAILED: Test banners found in production files${NC}"
    ((FAILED++))
else
    echo -e "${GREEN}✅ PASSED: No test banners found${NC}"
    ((PASSED++))
fi
echo ""

# Test 8: Environment Variables Set
echo "Test 8: Required Environment Variables..."
REQUIRED_ENV_VARS=(
    "MONGO_URL"
)

MISSING_VARS=0
for var in "${REQUIRED_ENV_VARS[@]}"; do
    if ! grep -q "${var}" /app/backend/.env 2>/dev/null; then
        echo -e "${RED}❌ Missing: ${var}${NC}"
        ((MISSING_VARS++))
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: All required env vars set${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: ${MISSING_VARS} env vars missing${NC}"
    ((FAILED++))
fi
echo ""

# Summary
echo "===================================="
echo "📊 TEST SUMMARY"
echo "===================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - Safe to merge${NC}"
    exit 0
else
    echo -e "${RED}❌ TESTS FAILED - Do NOT merge until fixed${NC}"
    exit 1
fi
