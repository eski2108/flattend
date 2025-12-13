#!/bin/bash
# Verifies that stable files are not modified

echo "🔍 VERIFYING PROJECT PROTECTION"
echo "================================"
echo ""

# Check if STABLE backup exists
if [ ! -d "/app/STABLE" ]; then
    echo "❌ ERROR: STABLE backup not found!"
    echo "Run setup again to create protection."
    exit 1
fi

echo "✅ STABLE backup exists"
echo ""

# Compare critical files
echo "📊 Checking critical files..."
critical_files=(
    "backend/server.py"
    "backend/wallet_service.py"
    "backend/email_service.py"
    "frontend/src/App.js"
    "frontend/src/pages/P2PMarketplace.js"
    "frontend/src/pages/MerchantCenter.js"
)

all_safe=true

for file in "${critical_files[@]}"; do
    if [ -f "/app/$file" ]; then
        if [ -f "/app/STABLE/$file" ]; then
            # Check if files are different
            if ! cmp -s "/app/$file" "/app/STABLE/$file"; then
                echo "⚠️  MODIFIED: $file"
                all_safe=false
            else
                echo "✅ PROTECTED: $file"
            fi
        else
            echo "⚠️  No backup for: $file"
        fi
    else
        echo "❌ MISSING: $file"
        all_safe=false
    fi
done

echo ""
if [ "$all_safe" = true ]; then
    echo "✅ ALL CRITICAL FILES PROTECTED"
else
    echo "⚠️  SOME FILES HAVE BEEN MODIFIED"
    echo "   Review changes or restore with: bash /app/RESTORE_STABLE.sh"
fi

echo ""
echo "📁 Backup size: $(du -sh /app/STABLE | cut -f1)"
echo "📅 Created: 2025-12-11"
