#!/bin/bash

# PRE-MERGE HOOK FOR TRADING ENGINE
# This script MUST pass before merging to main

set -e

echo "======================================================================"
echo "🔒 TRADING ENGINE PRE-MERGE VERIFICATION"
echo "======================================================================"
echo ""

# Check if trading_engine.py exists
if [ ! -f "/app/backend/core/trading_engine.py" ]; then
    echo "❌ CRITICAL: trading_engine.py not found!"
    exit 1
fi

echo "✅ Trading engine file exists"

# Check if tests exist
if [ ! -f "/app/backend/tests/test_trading_engine.py" ]; then
    echo "❌ CRITICAL: Trading engine tests not found!"
    exit 1
fi

echo "✅ Test file exists"

# Run automated tests
echo ""
echo "Running trading engine tests..."
cd /app/backend
python3 tests/test_trading_engine.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ TRADING ENGINE TESTS FAILED"
    echo "❌ MERGE BLOCKED - Fix tests before merging"
    exit 1
fi

echo ""
echo "======================================================================"
echo "✅ PRE-MERGE CHECKS PASSED"
echo "✅ Safe to merge to main"
echo "======================================================================"

exit 0
