#!/bin/bash

# ICON SYSTEM PROTECTION
# Validates icon imports and prevents icon-related crashes

echo "========================================"
echo "🎨 ICON SYSTEM VALIDATION"
echo "========================================"

# Find all files with icon usage
ICON_FILES=$(grep -rl "react-icons" /app/frontend/src --include="*.js" --include="*.jsx")

ERROR_COUNT=0
WARN_COUNT=0

for file in $ICON_FILES; do
  echo "\n📄 Checking: $file"
  
  # Extract imports
  IMPORTS=$(grep "import.*react-icons" "$file" || true)
  
  # Extract icon usage in JSX
  USAGE=$(grep -oE "<(Io|Bi|Fa|Md)[A-Z][a-zA-Z]+" "$file" | sed 's/<//' | sort -u || true)
  
  if [ -n "$USAGE" ]; then
    while IFS= read -r icon; do
      if ! echo "$IMPORTS" | grep -q "$icon"; then
        echo "  ❌ ERROR: $icon used but not imported"
        ERROR_COUNT=$((ERROR_COUNT + 1))
      fi
    done <<< "$USAGE"
  fi
  
  # Check for alias confusion
  if echo "$IMPORTS" | grep -qE "as [A-Z][a-z]+[A-Z]"; then
    echo "  ⚠️  WARNING: Complex alias detected - verify usage"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
done

echo "\n========================================"
if [ $ERROR_COUNT -eq 0 ]; then
  echo "✅ ICON VALIDATION PASSED"
  echo "Warnings: $WARN_COUNT"
  exit 0
else
  echo "❌ ICON VALIDATION FAILED"
  echo "Errors: $ERROR_COUNT"
  echo "Warnings: $WARN_COUNT"
  exit 1
fi
