#!/bin/bash
# 🔧 EMERGENCY RESTORE SCRIPT
# Restores the last known stable version

echo "🚨 EMERGENCY RESTORE INITIATED"
echo "================================"
echo ""
echo "⚠️  WARNING: This will restore the stable backup"
echo "⚠️  Current work in /app/backend and /app/frontend will be replaced"
echo ""
read -p "Are you sure? Type 'RESTORE' to confirm: " confirm

if [ "$confirm" != "RESTORE" ]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo ""
echo "📦 Creating emergency backup of current state..."
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p /app/EMERGENCY_BACKUPS
cp -r /app/backend /app/EMERGENCY_BACKUPS/backend_$timestamp
cp -r /app/frontend /app/EMERGENCY_BACKUPS/frontend_$timestamp
echo "✅ Current state backed up to EMERGENCY_BACKUPS/"

echo ""
echo "🔄 Restoring stable version..."
rm -rf /app/backend
rm -rf /app/frontend
cp -r /app/STABLE/backend /app/backend
cp -r /app/STABLE/frontend /app/frontend

echo ""
echo "🔨 Rebuilding frontend..."
cd /app/frontend && yarn build

echo ""
echo "♻️  Restarting services..."
sudo supervisorctl restart all

echo ""
echo "✅ STABLE VERSION RESTORED SUCCESSFULLY"
echo "================================"
echo ""
echo "📁 Previous version saved in: /app/EMERGENCY_BACKUPS/"
echo "📅 Timestamp: $timestamp"
