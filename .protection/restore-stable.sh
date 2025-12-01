#!/bin/bash

# RESTORE STABLE VERSION SCRIPT
# Restores the last known stable backup

set -e

BACKUP_DIR="/app/.backups/stable"

echo "========================================"
echo "🔄 RESTORING STABLE VERSION"
echo "========================================"

# Find latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ No backup found!"
  exit 1
fi

echo "\n📦 Found backup: $LATEST_BACKUP"
read -p "Restore this backup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

# Create emergency backup of current state
echo "\n✓ Creating emergency backup of current state..."
mkdir -p /app/.backups/emergency
cp -r /app/frontend /app/.backups/emergency/frontend_$(date +%Y%m%d_%H%M%S)
cp -r /app/backend /app/.backups/emergency/backend_$(date +%Y%m%d_%H%M%S)

# Extract stable backup
echo "\n✓ Extracting stable backup..."
tar -xzf $LATEST_BACKUP -C /

echo "\n✓ Restarting services..."
sudo supervisorctl restart all

echo "\n========================================"
echo "✅ STABLE VERSION RESTORED"
echo "========================================"
echo "\n⚠️  Emergency backup saved to: /app/.backups/emergency"
