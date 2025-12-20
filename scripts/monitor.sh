#!/bin/bash
# Automated Site Monitor - Runs every 30 minutes
# No manual setup required

LOG_DIR="/app/test-reports"
LOG_FILE="$LOG_DIR/monitor-$(date +%Y%m%d).log"
RESULT_FILE="$LOG_DIR/latest-result.txt"

mkdir -p $LOG_DIR

echo "========================================" >> $LOG_FILE
echo "Test Run: $(date)" >> $LOG_FILE
echo "========================================" >> $LOG_FILE

cd /app/tests

# Run tests
npx playwright test --config=playwright.config.js --reporter=list 2>&1 | tee -a $LOG_FILE
TEST_EXIT_CODE=${PIPESTATUS[0]}

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "PASSED" > $RESULT_FILE
    echo "✅ ALL TESTS PASSED at $(date)" >> $LOG_FILE
else
    echo "FAILED" > $RESULT_FILE
    echo "❌ TESTS FAILED at $(date)" >> $LOG_FILE
    echo "Check $LOG_FILE for details"
fi

echo "" >> $LOG_FILE
