#!/bin/bash

# STABLE VERSION BACKUP SCRIPT
# Creates a permanent backup of the current stable version

BACKUP_DIR="/app/.backups/stable"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================"
echo "💾 CREATING STABLE BACKUP"
echo "========================================"

mkdir -p $BACKUP_DIR

# Backup critical directories
echo "\n✓ Backing up frontend..."
cp -r /app/frontend $BACKUP_DIR/frontend_$TIMESTAMP

echo "✓ Backing up backend..."
cp -r /app/backend $BACKUP_DIR/backend_$TIMESTAMP

# Create tarball for extra safety
echo "\n✓ Creating compressed archive..."
tar -czf $BACKUP_DIR/stable_$TIMESTAMP.tar.gz \
  /app/frontend/src \
  /app/backend/*.py \
  /app/frontend/package.json \
  /app/backend/requirements.txt

# Keep only last 5 backups
echo "\n✓ Cleaning old backups (keeping last 5)..."
ls -t $BACKUP_DIR/*.tar.gz | tail -n +6 | xargs -r rm

# Record backup info
echo "{
  \"timestamp\": \"$TIMESTAMP\",
  \"status\": \"stable\",
  \"version\": \"1.0.0\",
  \"files_backed_up\": [
    \"frontend\",
    \"backend\"
  ]
}" > $BACKUP_DIR/backup_$TIMESTAMP.json

echo "\n========================================"
echo "✅ BACKUP COMPLETED: $BACKUP_DIR/stable_$TIMESTAMP.tar.gz"
echo "========================================"
