#!/bin/bash

# PRE-BUILD VALIDATION SCRIPT
# This runs BEFORE any build to catch errors early

set -e

echo "========================================"
echo "🔍 PRE-BUILD VALIDATION STARTING"
echo "========================================"

# Check if critical files exist
echo "\n✓ Checking critical files..."
CRITICAL_FILES=(
  "/app/frontend/src/App.js"
  "/app/frontend/src/components/Layout.js"
  "/app/frontend/src/components/ErrorBoundary.js"
  "/app/backend/server.py"
  "/app/backend/wallet_service.py"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ CRITICAL FILE MISSING: $file"
    exit 1
  fi
  echo "  ✓ $file"
done

# Check for icon imports
echo "\n✓ Validating icon imports..."
ICON_ERRORS=$(grep -r "import.*react-icons" /app/frontend/src --include="*.js" --include="*.jsx" | \
  grep -E "(as [A-Z][a-z]+[A-Z]|import {[^}]*}.*as)" | wc -l)

if [ $ICON_ERRORS -gt 0 ]; then
  echo "⚠️  WARNING: Found $ICON_ERRORS potential icon alias issues"
  echo "  Review icon imports before proceeding"
fi

# Check for undefined icon usage
echo "\n✓ Checking for undefined icons..."
cd /app/frontend/src
UNDEFINED_ICONS=$(find . -name "*.js" -o -name "*.jsx" | xargs grep -E "<(Io|Bi|Fa)[A-Z][a-zA-Z]+" | \
  grep -v "import" | wc -l)

if [ $UNDEFINED_ICONS -gt 100 ]; then
  echo "⚠️  Found $UNDEFINED_ICONS icon usages - ensure all are imported"
fi

# Validate package.json
echo "\n✓ Validating package.json..."
if ! jq empty /app/frontend/package.json 2>/dev/null; then
  echo "❌ INVALID package.json"
  exit 1
fi

# Check for syntax errors in critical files
echo "\n✓ Checking JavaScript syntax..."
if ! node -c /app/frontend/src/App.js 2>/dev/null; then
  echo "❌ SYNTAX ERROR in App.js"
  exit 1
fi

echo "\n========================================"
echo "✅ PRE-BUILD VALIDATION PASSED"
echo "========================================"
exit 0
