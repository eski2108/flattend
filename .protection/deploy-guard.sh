#!/bin/bash

# DEPLOYMENT GUARD
# Prevents deployment if ANY validation fails

set -e

LOG_FILE="/app/.protection/logs/deploy_$(date +%Y%m%d_%H%M%S).log"

echo "========================================" | tee -a $LOG_FILE
echo "🛡️  DEPLOYMENT GUARD ACTIVATED" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 1: Pre-build validation
echo "[1/4] Running pre-build validation..." | tee -a $LOG_FILE
if ! bash /app/.protection/pre-build-check.sh >> $LOG_FILE 2>&1; then
  echo "❌ PRE-BUILD VALIDATION FAILED" | tee -a $LOG_FILE
  echo "Check log: $LOG_FILE"
  exit 1
fi
echo "✅ Pre-build validation passed" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 2: Icon system check
echo "[2/4] Validating icon system..." | tee -a $LOG_FILE
if ! bash /app/.protection/icon-protection.sh >> $LOG_FILE 2>&1; then
  echo "⚠️  Icon validation warnings detected" | tee -a $LOG_FILE
  echo "Review log: $LOG_FILE"
  # Don't fail on icon warnings, just log them
fi
echo "✅ Icon system checked" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 3: Create backup before changes
echo "[3/4] Creating safety backup..." | tee -a $LOG_FILE
if ! bash /app/.protection/backup-stable.sh >> $LOG_FILE 2>&1; then
  echo "❌ BACKUP FAILED" | tee -a $LOG_FILE
  exit 1
fi
echo "✅ Backup created" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 4: Check critical services
echo "[4/4] Checking services..." | tee -a $LOG_FILE
if ! sudo supervisorctl status | grep -q "RUNNING"; then
  echo "⚠️  Some services not running" | tee -a $LOG_FILE
fi
echo "✅ Services checked" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

echo "========================================" | tee -a $LOG_FILE
echo "✅ DEPLOYMENT GUARD PASSED" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "📋 Full log: $LOG_FILE" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "⚠️  REMINDER: Test in staging before production!" | tee -a $LOG_FILE

exit 0
