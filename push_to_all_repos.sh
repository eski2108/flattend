#!/bin/bash
echo "🚀 Pushing to all 10 GitHub repositories..."

REMOTES=("latest-work" "brand-new" "latest-coinhubx" "crypto-livr" "c-hub" "hub-x" "coinhubx" "flattend" "coinx1" "x1")

for remote in "${REMOTES[@]}"; do
    echo "📤 Pushing to $remote..."
    git push -f $remote main 2>&1 | head -5
    if [ $? -eq 0 ]; then
        echo "✅ $remote - SUCCESS"
    else
        echo "❌ $remote - FAILED (check credentials)"
    fi
    echo ""
done

echo "✅ Push attempt completed for all repos"
