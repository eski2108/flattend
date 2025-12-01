#!/bin/bash

# FILE UNLOCKING SYSTEM
# Temporarily unlocks files for editing

set -e

echo "========================================"
echo "🔓 UNLOCKING CRITICAL FILES"
echo "========================================"
echo ""

read -p "⚠️  Are you sure you want to unlock protected files? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Unlock cancelled"
  exit 0
fi

# Read protected files from JSON
PROTECTED_FILES=$(/usr/bin/jq -r '.protected_files[]' /app/.protection/PROTECTED_FILES.json)

UNLOCKED_COUNT=0

for file in $PROTECTED_FILES; do
  if [ -f "$file" ]; then
    # Make writable
    chmod 644 "$file"
    echo "🔓 Unlocked: $file"
    UNLOCKED_COUNT=$((UNLOCKED_COUNT + 1))
  fi
done

echo ""
echo "========================================"
echo "✅ UNLOCKED $UNLOCKED_COUNT FILES"
echo "========================================"
echo ""
echo "⚠️  Remember to lock files after editing:"
echo "   bash /app/.protection/lock-files.sh"

exit 0
