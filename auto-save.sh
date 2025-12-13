#!/bin/bash

cd /app

# Check if there are changes
if [[ -n $(git status -s) ]]; then
    echo "📝 Changes detected. Committing and pushing..."
    
    # Add all changes
    git add -A
    
    # Commit with timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
    git commit -m "Auto-save: $TIMESTAMP" --no-verify
    
    # Push to GitHub
    git push origin main 2>&1
    
    if [ $? -eq 0 ]; then
        HASH=$(git log -1 --pretty=format:"%H")
        echo "✅ PUSHED TO GITHUB"
        echo "Repository: https://github.com/eski2108/Coinhubx-latest-work"
        echo "Branch: main"
        echo "Commit Hash: $HASH"
        echo "Time: $TIMESTAMP"
    else
        echo "❌ PUSH FAILED - Check logs"
        exit 1
    fi
else
    echo "✅ No changes to save"
fi
