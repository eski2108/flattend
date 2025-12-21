#!/bin/bash
# CoinHubX Security Test Runner
# Run all security validation tests

echo "======================================"
echo "CoinHubX Security Validation Suite"
echo "======================================"
echo ""

cd /app/tests/security_validation

# Ensure dependencies
pip3 install requests -q

# Run the test suite
python3 test_security_features.py

echo ""
echo "Test complete. Check test_results.json for details."
