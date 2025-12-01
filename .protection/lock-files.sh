#!/bin/bash

# FILE LOCKING SYSTEM
# Makes critical files immutable (cannot be changed without unlocking)

set -e

echo "========================================"
echo "🔒 LOCKING CRITICAL FILES"
echo "========================================"
echo ""

# Read protected files from JSON
PROTECTED_FILES=$(/usr/bin/jq -r '.protected_files[]' /app/.protection/PROTECTED_FILES.json)

LOCKED_COUNT=0

for file in $PROTECTED_FILES; do
  if [ -f "$file" ]; then
    # Make read-only
    chmod 444 "$file"
    echo "🔒 Locked: $file"
    LOCKED_COUNT=$((LOCKED_COUNT + 1))
  else
    echo "⚠️  Not found: $file"
  fi
done

echo ""
echo "========================================"
echo "✅ LOCKED $LOCKED_COUNT FILES"
echo "========================================"
echo ""
echo "⚠️  To unlock files for editing:"
echo "   bash /app/.protection/unlock-files.sh"

exit 0
