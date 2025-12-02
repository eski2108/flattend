#!/bin/bash
# Quick script to verify trading fees are working

echo "==========================================="
echo "TRADING FEE VERIFICATION"
echo "==========================================="
echo ""

# Get PLATFORM_FEES balance
echo "[1] Checking PLATFORM_FEES account..."
mongosh $MONGO_URL --quiet --eval "
db = db.getSiblingDB('coinhubx');
const fees = db.internal_balances.findOne({user_id: 'PLATFORM_FEES', currency: 'GBP'});
if (fees) {
  print('\n✅ PLATFORM_FEES Account Found');
  print('   Total Fees: £' + fees.total_fees.toFixed(2));
  print('   Trading Fees: £' + fees.trading_fees.toFixed(2));
  print('   P2P Express Fees: £' + fees.p2p_express_fees.toFixed(2));
  print('   Last Updated: ' + fees.last_updated);
} else {
  print('❌ PLATFORM_FEES account not found!');
}
"

echo ""
echo "[2] Checking last 5 trades..."
mongosh $MONGO_URL --quiet --eval "
db = db.getSiblingDB('coinhubx');
print('\nLast 5 trades:');
db.spot_trades.find().sort({created_at: -1}).limit(5).forEach(function(trade) {
  print('   - ' + trade.type.toUpperCase() + ' ' + trade.amount.toFixed(6) + ' ' + trade.pair.substring(0,3) + ' | Fee: £' + trade.fee_amount.toFixed(4) + ' | ' + trade.created_at);
});
"

echo ""
echo "[3] Checking fee transactions..."
mongosh $MONGO_URL --quiet --eval "
db = db.getSiblingDB('coinhubx');
const feeCount = db.fee_transactions.countDocuments({fee_type: 'spot_trading'});
print('\nTotal trading fee transactions: ' + feeCount);
const lastFees = db.fee_transactions.find({fee_type: 'spot_trading'}).sort({timestamp: -1}).limit(3).toArray();
print('\nLast 3 fee transactions:');
lastFees.forEach(function(fee) {
  print('   - £' + fee.amount.toFixed(4) + ' | ' + fee.timestamp);
});
"

echo ""
echo "==========================================="
echo "✅ Verification complete!"
echo "==========================================="
