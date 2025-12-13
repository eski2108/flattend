#!/bin/bash

cd /app

echo "🔵 MANUAL SAVE INITIATED"

# Check if there are changes
if [[ -n $(git status -s) ]]; then
    # Add all changes
    git add -A
    
    # Commit with manual save message
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
    git commit -m "Manual save by user: $TIMESTAMP" --no-verify
    
    # Push to GitHub
    git push origin main 2>&1
    
    if [ $? -eq 0 ]; then
        HASH=$(git log -1 --pretty=format:"%H")
        echo ""
        echo "✅ MANUAL SAVE SUCCESSFUL"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Repository: https://github.com/eski2108/Coinhubx-latest-work"
        echo "Branch: main"
        echo "Commit Hash: $HASH"
        echo "Time: $TIMESTAMP"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo "❌ MANUAL SAVE FAILED - STOPPING"
        exit 1
    fi
else
    echo "✅ No changes to save"
fi
