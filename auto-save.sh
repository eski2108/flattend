#!/bin/bash

cd /app

# List of all git remote names
REMOTES=(
    "crypto-livr"
    "c-hub"
    "hub-x"
    "coinhubx"
    "flattend"
    "coinx1"
    "x1"
    "latest-coinhubx"
    "brand-new"
)

# Check if there are changes
if [[ -n $(git status -s) ]]; then
    echo "📝 Changes detected. Committing and pushing to all repositories..."
    
    # Add all changes
    git add -A
    
    # Commit with timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
    git commit -m "Auto-save: $TIMESTAMP" --no-verify
    
    HASH=$(git log -1 --pretty=format:"%H")
    
    # Push to all repositories
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    
    for REMOTE in "${REMOTES[@]}"; do
        echo "Pushing to $REMOTE..."
        
        git push $REMOTE main --force 2>&1 | tail -2
        
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo "  ✅ SUCCESS: $REMOTE"
            ((SUCCESS_COUNT++))
        else
            echo "  ❌ FAILED: $REMOTE"
            ((FAIL_COUNT++))
        fi
    done
    
    echo ""
    echo "════════════════════════════════════════════"
    echo "✅ PUSH COMPLETE TO ALL REPOSITORIES"
    echo "════════════════════════════════════════════"
    echo "Commit Hash: $HASH"
    echo "Time: $TIMESTAMP"
    echo "Success: $SUCCESS_COUNT repositories"
    echo "Failed: $FAIL_COUNT repositories"
    echo "════════════════════════════════════════════"
    
else
    echo "✅ No changes to save"
fi
