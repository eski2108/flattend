#!/bin/bash
# Test trading engine end-to-end

echo "==========================================="
echo "TRADING ENGINE TEST"
echo "==========================================="
echo ""

echo "This will test the trading engine by:"
echo "1. Checking if backend is running"
echo "2. Checking if frontend is running"
echo "3. Verifying database connection"
echo "4. Testing price feed"
echo "5. Checking recent trades"
echo ""

read -p "Press ENTER to continue..."

echo ""
echo "[1] Checking services..."
sudo supervisorctl status | grep -E "backend|frontend"

echo ""
echo "[2] Testing price feed endpoint..."
curl -s "https://wallet-nav-repair.preview.emergentagent.com/api/prices/live" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Price feed working') if data.get('success') else print('❌ Price feed failed')"

echo ""
echo "[3] Testing market-price endpoint..."
curl -s "https://wallet-nav-repair.preview.emergentagent.com/api/market-price?pair=BTCUSD" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Market price: $' + str(data['price'])) if data.get('success') else print('❌ Market price failed')"

echo ""
echo "[4] Checking database connection..."
mongosh $MONGO_URL --quiet --eval "db.adminCommand('ping')" | grep -q '"ok" : 1' && echo "✅ Database connected" || echo "❌ Database connection failed"

echo ""
echo "[5] Checking recent trades..."
mongosh $MONGO_URL --quiet --eval "
db = db.getSiblingDB('coinhubx');
const count = db.spot_trades.countDocuments();
print('Total trades: ' + count);
if (count > 0) {
  const last = db.spot_trades.findOne({}, {sort: {created_at: -1}});
  print('Last trade: ' + last.type.toUpperCase() + ' ' + last.amount + ' ' + last.pair);
  print('✅ Trading engine is active');
} else {
  print('⚠️  No trades found');
}
"

echo ""
echo "==========================================="
echo "✅ Test complete!"
echo "==========================================="
echo ""
echo "If all checks passed, trading engine is working."
echo "If any failed, check logs:"
echo "  Backend: tail -n 50 /var/log/supervisor/backend.err.log"
echo "  Frontend: tail -n 50 /var/log/supervisor/frontend.err.log"
echo ""
