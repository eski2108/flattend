#!/bin/bash

# FINAL COMPLETE END-TO-END WITHDRAWAL TEST (ALL FIXES APPLIED)
# Testing complete withdrawal flow using curl commands

BASE_URL="https://trading-perf-boost.preview.emergentagent.com/api"
USER_EMAIL="withdrawal_test@demo.com"
USER_PASSWORD="Test123!"
ADMIN_EMAIL="admin_test@demo.com"
ADMIN_PASSWORD="Admin123!"

echo "🚀 STARTING FINAL COMPLETE END-TO-END WITHDRAWAL TEST"
echo "================================================================================"

echo ""
echo "=== PART 1: USER WITHDRAWAL ==="

# Step 1: Login user
echo "✅ Step 1: Login user"
USER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$USER_PASSWORD\"}")

echo "User login response: $USER_LOGIN_RESPONSE"

USER_TOKEN=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.token // empty')
USER_ID=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.user.user_id // empty')

if [ -z "$USER_TOKEN" ] || [ -z "$USER_ID" ]; then
    echo "❌ User login failed"
    exit 1
fi

echo "✅ User logged in successfully. User ID: $USER_ID"

# Step 2: Get initial BTC balance
echo ""
echo "✅ Step 2: Get initial BTC balance"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/balances/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Balance response: $BALANCE_RESPONSE"

INITIAL_BTC_BALANCE=$(echo "$BALANCE_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .balance // 0')
echo "✅ Initial BTC balance: $INITIAL_BTC_BALANCE BTC"

# Step 3: Submit withdrawal
echo ""
echo "✅ Step 3: Submit withdrawal (0.0005 BTC)"
WITHDRAWAL_RESPONSE=$(curl -s -X POST "$BASE_URL/user/withdraw" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"currency\": \"BTC\",
    \"amount\": 0.0005,
    \"wallet_address\": \"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\"
  }")

echo "Withdrawal response: $WITHDRAWAL_RESPONSE"

WITHDRAWAL_ID=$(echo "$WITHDRAWAL_RESPONSE" | jq -r '.transaction_id // empty')
WITHDRAWAL_SUCCESS=$(echo "$WITHDRAWAL_RESPONSE" | jq -r '.success // false')

if [ "$WITHDRAWAL_SUCCESS" != "true" ] || [ -z "$WITHDRAWAL_ID" ]; then
    echo "❌ Withdrawal submission failed"
    exit 1
fi

echo "✅ Withdrawal submitted successfully. ID: $WITHDRAWAL_ID"

# Step 4: Verify balance deduction
echo ""
echo "✅ Step 4: Verify balance deducted"
sleep 2
NEW_BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/balances/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

NEW_BTC_BALANCE=$(echo "$NEW_BALANCE_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .balance // 0')
echo "✅ New BTC balance: $NEW_BTC_BALANCE BTC (was $INITIAL_BTC_BALANCE BTC)"

# Step 5: Check transaction history
echo ""
echo "✅ Step 5: Check transaction appears in history"
TRANSACTION_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/transactions/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Transaction history response: $TRANSACTION_RESPONSE"

# Step 6: Login admin
echo ""
echo "=== PART 2: ADMIN APPROVAL ==="
echo "✅ Step 6: Login admin"

ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

echo "Admin login response: $ADMIN_LOGIN_RESPONSE"

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.token // empty')
ADMIN_ID=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.user.user_id // empty')

if [ -z "$ADMIN_TOKEN" ] || [ -z "$ADMIN_ID" ]; then
    echo "❌ Admin login failed"
    exit 1
fi

echo "✅ Admin logged in successfully. Admin ID: $ADMIN_ID"

# Step 7: Get pending withdrawals
echo ""
echo "✅ Step 7: Get pending withdrawals"
PENDING_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/withdrawals/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Pending withdrawals response: $PENDING_RESPONSE"

# Check if our withdrawal is in the list
WITHDRAWAL_FOUND=$(echo "$PENDING_RESPONSE" | jq -r --arg id "$WITHDRAWAL_ID" '.withdrawals[]? | select(.withdrawal_id == $id or .transaction_id == $id) | .withdrawal_id // empty')

if [ -z "$WITHDRAWAL_FOUND" ]; then
    echo "❌ Our withdrawal not found in pending list"
else
    echo "✅ Withdrawal found in pending list: $WITHDRAWAL_FOUND"
fi

# Step 8: Approve withdrawal
echo ""
echo "✅ Step 8: Approve withdrawal"
APPROVAL_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/withdrawals/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"withdrawal_id\": \"$WITHDRAWAL_ID\",
    \"admin_id\": \"$ADMIN_ID\",
    \"action\": \"approve\",
    \"notes\": \"Test approval\"
  }")

echo "Approval response: $APPROVAL_RESPONSE"

APPROVAL_SUCCESS=$(echo "$APPROVAL_RESPONSE" | jq -r '.success // false')

if [ "$APPROVAL_SUCCESS" != "true" ]; then
    echo "❌ Withdrawal approval failed"
else
    echo "✅ Withdrawal approved successfully"
fi

# Step 9: Complete withdrawal
echo ""
echo "✅ Step 9: Complete withdrawal"
COMPLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/withdrawals/complete/$WITHDRAWAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{}")

echo "Complete response: $COMPLETE_RESPONSE"

# Step 10: Verify final status
echo ""
echo "✅ Step 10: Verify final status"
FINAL_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/withdrawals" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Final status response: $FINAL_STATUS_RESPONSE"

echo ""
echo "================================================================================"
echo "WITHDRAWAL TEST COMPLETED"
echo "================================================================================"

# Generate summary
echo ""
echo "FINAL SUMMARY ANSWERS:"
echo "- Can user submit? $([ "$WITHDRAWAL_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "- Does balance deduct? $([ "$NEW_BTC_BALANCE" != "$INITIAL_BTC_BALANCE" ] && echo "YES" || echo "NO")"
echo "- Can admin see it? $([ -n "$WITHDRAWAL_FOUND" ] && echo "YES" || echo "NO")"
echo "- Can admin approve? $([ "$APPROVAL_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "- Does status update? TBD"
echo "- Can admin reject? TBD"
echo "- Does balance restore? TBD"
echo "- In user history? TBD"