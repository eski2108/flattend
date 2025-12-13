#!/bin/bash

cd /app

# List of all repositories
REPOS=(
    "https://github.com/eski2108/Crypto-livr.git"
    "https://github.com/eski2108/C-hub.git"
    "https://github.com/eski2108/Hub-x.git"
    "https://github.com/eski2108/Coinhubx.git"
    "https://github.com/eski2108/flattend.git"
    "https://github.com/eski2108/Play.git"
    "https://github.com/eski2108/Coinx1.git"
    "https://github.com/eski2108/X1.git"
    "https://github.com/eski2108/Latest-coinhubx.git"
    "https://github.com/eski2108/F1.git"
    "https://github.com/eski2108/Final1.git"
    "https://github.com/eski2108/X-final-nu.git"
    "https://github.com/eski2108/C-fish.git"
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
    
    for REPO in "${REPOS[@]}"; do
        REPO_NAME=$(echo $REPO | sed 's|https://github.com/eski2108/||' | sed 's|.git||')
        echo "Pushing to $REPO_NAME..."
        
        git push $REPO main --force 2>&1
        
        if [ $? -eq 0 ]; then
            echo "  ✅ SUCCESS: $REPO_NAME"
            ((SUCCESS_COUNT++))
        else
            echo "  ❌ FAILED: $REPO_NAME"
            ((FAIL_COUNT++))
        fi
    done
    
    echo ""
    echo "════════════════════════════════════════════"
    echo "✅ PUSH COMPLETE"
    echo "════════════════════════════════════════════"
    echo "Commit Hash: $HASH"
    echo "Time: $TIMESTAMP"
    echo "Success: $SUCCESS_COUNT repositories"
    echo "Failed: $FAIL_COUNT repositories"
    echo "════════════════════════════════════════════"
    
else
    echo "✅ No changes to save"
fi
