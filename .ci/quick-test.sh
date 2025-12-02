#!/bin/bash

# Quick smoke test for rapid development
# Use this for quick checks during development

echo "🔥 QUICK SMOKE TEST"
echo ""

# Test 1: Services running
echo "1. Services Status:"
sudo supervisorctl status | grep -E "backend|frontend|mongodb"
echo ""

# Test 2: Backend responding
echo "2. Backend Health:"
curl -s http://localhost:8001/api/health || echo "❌ Backend not responding"
echo ""

# Test 3: Frontend serving
echo "3. Frontend Status:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/
echo ""

echo "✅ Quick test complete"
