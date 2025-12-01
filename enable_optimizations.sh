#!/bin/bash

echo "🚀 CoinHub Performance Optimization - Quick Apply"
echo "==============================================="
echo ""

# Check Redis
echo "🔍 Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis is running"
else
    echo "  ⚠️  Redis not running, starting..."
    redis-server --daemonize yes --port 6379
    sleep 2
fi

# Create database indexes
echo ""
echo "📊 Creating database indexes..."
python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def create_indexes():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['crypto_bank']
    
    print("  Creating wallet indexes...")
    await db.wallets.create_index([("user_id", 1), ("currency", 1)], unique=True, background=True)
    await db.wallets.create_index([("user_id", 1), ("available_balance", -1)], background=True)
    
    print("  Creating transaction indexes...")
    await db.transactions.create_index([("user_id", 1), ("timestamp", -1)], background=True)
    await db.transactions.create_index([("status", 1), ("timestamp", -1)], background=True)
    
    print("  Creating P2P order indexes...")
    await db.p2p_orders.create_index([("status", 1), ("created_at", -1)], background=True)
    await db.p2p_orders.create_index([("user_id", 1), ("status", 1)], background=True)
    
    print("  Creating platform fee indexes...")
    await db.platform_fees.create_index([("created_at", -1)], background=True)
    await db.platform_fees.create_index([("fee_type", 1), ("created_at", -1)], background=True)
    
    print("  ✅ All indexes created")
    client.close()

asyncio.run(create_indexes())
EOF

echo ""
echo "==============================================="
echo "✅ Quick optimizations applied!"
echo ""
echo "Next steps:"
echo "1. Restart backend: sudo supervisorctl restart backend"
echo "2. Check Redis: redis-cli INFO stats | grep hits"
echo "3. Monitor performance improvements"
echo ""
echo "For full optimization guide: cat /app/PERFORMANCE_OPTIMIZATION_COMPLETE.md"
echo "==============================================="
