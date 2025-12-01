#!/bin/bash

# Simple script to run the automated site checker

echo "🤖 Running Automated Site Checker..."
echo ""

cd /app
python3 automated_site_checker.py

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All checks passed!"
else
    echo ""
    echo "❌ Some checks failed. Review the report above."
fi

exit $EXIT_CODE
