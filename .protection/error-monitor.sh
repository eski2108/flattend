#!/bin/bash

# ERROR MONITORING SYSTEM
# Continuously monitors logs for critical errors

LOG_DIR="/app/.protection/logs"
ERROR_LOG="$LOG_DIR/errors_$(date +%Y%m%d).log"

mkdir -p $LOG_DIR

echo "========================================"
echo "🔍 ERROR MONITORING ACTIVE"
echo "========================================"
echo "Monitoring logs for critical errors..."
echo "Log file: $ERROR_LOG"
echo ""

# Monitor frontend errors
tail -n 0 -f /var/log/supervisor/frontend.err.log | while read line; do
  if echo "$line" | grep -iE "error|undefined|failed|exception|crash"; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] FRONTEND: $line" | tee -a $ERROR_LOG
    
    # Check for critical errors
    if echo "$line" | grep -i "is not defined"; then
      echo "🚨 CRITICAL: Undefined reference detected!" | tee -a $ERROR_LOG
    fi
  fi
done &

# Monitor backend errors
tail -n 0 -f /var/log/supervisor/backend.err.log | while read line; do
  if echo "$line" | grep -iE "error|exception|failed|crash"; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] BACKEND: $line" | tee -a $ERROR_LOG
    
    # Check for wallet errors
    if echo "$line" | grep -i "wallet\|balance\|debit\|credit"; then
      echo "🚨 CRITICAL: Wallet operation error!" | tee -a $ERROR_LOG
    fi
  fi
done &

echo "Monitoring started. Press Ctrl+C to stop."
wait
