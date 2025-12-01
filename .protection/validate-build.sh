#!/bin/bash

# BUILD VALIDATION SCRIPT
# Validates frontend build BEFORE deployment

set -e

BUILD_DIR="/app/frontend/build"

echo "========================================"
echo "🔍 VALIDATING BUILD"
echo "========================================"

# Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Build directory not found: $BUILD_DIR"
  exit 1
fi

# Check if index.html exists
if [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "❌ index.html not found in build"
  exit 1
fi

# Check build size (should be > 100KB)
BUILD_SIZE=$(du -sb $BUILD_DIR | cut -f1)
if [ $BUILD_SIZE -lt 100000 ]; then
  echo "❌ Build size too small: $BUILD_SIZE bytes"
  echo "   Build may be incomplete"
  exit 1
fi

# Check for JavaScript bundles
JS_FILES=$(find $BUILD_DIR -name "*.js" | wc -l)
if [ $JS_FILES -lt 1 ]; then
  echo "❌ No JavaScript bundles found"
  exit 1
fi

# Check for critical components in bundle
echo "\n✓ Checking for critical components..."
CRITICAL_COMPONENTS=("Layout" "ErrorBoundary" "WalletPage" "P2PExpress")
for component in "${CRITICAL_COMPONENTS[@]}"; do
  if grep -r "$component" $BUILD_DIR/static/js/*.js > /dev/null; then
    echo "  ✓ Found: $component"
  else
    echo "  ⚠️  Warning: $component not found in bundle"
  fi
done

echo "\n========================================"
echo "✅ BUILD VALIDATION PASSED"
echo "Build size: $(du -sh $BUILD_DIR | cut -f1)"
echo "JS files: $JS_FILES"
echo "========================================"
exit 0
