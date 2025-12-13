#!/bin/bash

cd /app

echo "🚀 SAVING TO ALL REPOSITORIES"
echo "═══════════════════════════════════════════════════════"

# List of all repos
REPOS=("origin" "brand-new" "latest-coinhubx" "crypto-livr" "c-hub" "hub-x" "coinhubx" "flattend" "coinx1" "x1")

# Check if there are changes
if [[ -n $(git status -s) ]]; then
    git add -A
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
    git commit -m "Multi-repo save: $TIMESTAMP" --no-verify
    HASH=$(git log -1 --pretty=format:"%H")
    echo "✅ Committed locally: $HASH"
    echo ""
else
    echo "ℹ️  No new changes to commit"
    HASH=$(git log -1 --pretty=format:"%H")
    echo "📌 Using existing commit: $HASH"
    echo ""
fi

# Push to all repos
SUCCESS_COUNT=0
FAIL_COUNT=0

for repo in "${REPOS[@]}"; do
    echo "📤 Pushing to $repo..."
    if git push -f $repo main 2>&1 | grep -q "main -> main"; then
        echo "   ✅ SUCCESS"
        ((SUCCESS_COUNT++))
    else
        echo "   ❌ FAILED"
        ((FAIL_COUNT++))
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Pushed to $SUCCESS_COUNT repositories"
if [ $FAIL_COUNT -gt 0 ]; then
    echo "❌ Failed: $FAIL_COUNT repositories"
fi
echo ""
echo "📍 Commit Hash: $HASH"
echo "⏰ Time: $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════════"
