#!/bin/bash

if [ -z "$1" ]; then
    echo "❌ Error: Please specify backup directory"
    echo "Usage: bash restore_from_backup.sh .backups/WORKING_STATE_XXXXXXXX_XXXXXX"
    echo ""
    echo "Available backups:"
    ls -1 .backups/
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "=========================================="
echo "🔄 RESTORING FROM BACKUP"
echo "=========================================="
echo "Source: $BACKUP_DIR"
echo ""

# Show manifest
if [ -f "$BACKUP_DIR/BACKUP_MANIFEST.txt" ]; then
    cat "$BACKUP_DIR/BACKUP_MANIFEST.txt"
    echo ""
fi

read -p "⚠️  This will overwrite current files. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo ""
echo "🔄 Restoring files..."

# Restore frontend
if [ -d "$BACKUP_DIR/frontend/src" ]; then
    echo "📦 Restoring frontend..."
    cp -r "$BACKUP_DIR/frontend/src/components" frontend/src/ 2>/dev/null
    cp -r "$BACKUP_DIR/frontend/src/pages" frontend/src/ 2>/dev/null
    cp -r "$BACKUP_DIR/frontend/src/utils" frontend/src/ 2>/dev/null
fi

# Restore backend
if [ -d "$BACKUP_DIR/backend" ]; then
    echo "📦 Restoring backend..."
    cp "$BACKUP_DIR/backend/server.py" backend/ 2>/dev/null
    cp "$BACKUP_DIR/backend/wallet_service.py" backend/ 2>/dev/null
    cp "$BACKUP_DIR/backend/swap_wallet_service.py" backend/ 2>/dev/null
fi

echo ""
echo "🔄 Restarting services..."
sudo supervisorctl restart all

sleep 5

echo ""
echo "=========================================="
echo "✅ RESTORE COMPLETE!"
echo "=========================================="
echo ""
echo "Status:"
sudo supervisorctl status
echo ""
echo "⚠️  Please hard refresh your browser (Ctrl+Shift+R)"
echo "=========================================="

