#!/bin/bash

echo "🔍 Verifying no hardcoded URLs remain..."
echo "============================================="

# Check for any remaining hardcoded test URLs
HARDCODED_COUNT=$(grep -r "codehealer-31.preview.emergentagent.com" /app/frontend/src --include="*.js" 2>/dev/null | wc -l)
LOCALHOST_COUNT=$(grep -r "localhost:8001" /app/frontend/src --include="*.js" --exclude-dir=node_modules 2>/dev/null | grep -v "process.env" | wc -l)

echo ""
if [ $HARDCODED_COUNT -eq 0 ]; then
    echo "✅ No test URLs found"
else
    echo "⚠️  Found $HARDCODED_COUNT hardcoded test URLs:"
    grep -rn "codehealer-31.preview.emergentagent.com" /app/frontend/src --include="*.js" 2>/dev/null | head -10
fi

echo ""
if [ $LOCALHOST_COUNT -eq 0 ]; then
    echo "✅ No hardcoded localhost URLs found"
else
    echo "⚠️  Found $LOCALHOST_COUNT hardcoded localhost URLs:"
    grep -rn "localhost:8001" /app/frontend/src --include="*.js" --exclude-dir=node_modules 2>/dev/null | grep -v "process.env" | head -10
fi

echo ""
echo "============================================="

# Check environment variable usage
echo ""
echo "📋 Environment variable usage:"
grep -r "process.env.REACT_APP_BACKEND_URL" /app/frontend/src --include="*.js" 2>/dev/null | wc -l | xargs echo "   Files using REACT_APP_BACKEND_URL:"

echo ""
echo "✅ Verification complete!"
echo ""
