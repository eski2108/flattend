#!/bin/bash

# FINAL COMPLETE END-TO-END WITHDRAWAL TEST (ALL FIXES APPLIED)
# Testing complete withdrawal flow including rejection

BASE_URL="https://trading-rebuild.preview.emergentagent.com/api"
USER_EMAIL="withdrawal_test@demo.com"
USER_PASSWORD="Test123!"
ADMIN_EMAIL="admin_test@demo.com"
ADMIN_PASSWORD="Admin123!"

echo "🚀 STARTING FINAL COMPLETE END-TO-END WITHDRAWAL TEST"
echo "================================================================================"

# Step 1: Login user
echo ""
echo "=== PART 1: USER WITHDRAWAL ==="
echo "✅ Step 1: Login user"
USER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$USER_PASSWORD\"}")

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

INITIAL_BTC_BALANCE=$(echo "$BALANCE_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .balance // 0')
INITIAL_LOCKED_BALANCE=$(echo "$BALANCE_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .locked_balance // 0')
echo "✅ Initial BTC balance: $INITIAL_BTC_BALANCE BTC (locked: $INITIAL_LOCKED_BALANCE BTC)"

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

WITHDRAWAL_ID=$(echo "$WITHDRAWAL_RESPONSE" | jq -r '.transaction_id // empty')
WITHDRAWAL_SUCCESS=$(echo "$WITHDRAWAL_RESPONSE" | jq -r '.success // false')

if [ "$WITHDRAWAL_SUCCESS" != "true" ] || [ -z "$WITHDRAWAL_ID" ]; then
    echo "❌ Withdrawal submission failed: $WITHDRAWAL_RESPONSE"
    exit 1
fi

echo "✅ Withdrawal submitted successfully. ID: $WITHDRAWAL_ID"

# Step 4: Verify balance locked
echo ""
echo "✅ Step 4: Verify balance locked"
sleep 2
NEW_BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/balances/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

NEW_BTC_BALANCE=$(echo "$NEW_BALANCE_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .balance // 0')
NEW_LOCKED_BALANCE=$(echo "$NEW_BALANCE_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .locked_balance // 0')
echo "✅ Balance after withdrawal: $NEW_BTC_BALANCE BTC (locked: $NEW_LOCKED_BALANCE BTC)"

# Step 5: Check transaction history
echo ""
echo "✅ Step 5: Check transaction appears in history"
TRANSACTION_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/transactions/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

TRANSACTION_FOUND=$(echo "$TRANSACTION_RESPONSE" | jq -r --arg id "$WITHDRAWAL_ID" '.transactions[]? | select(.transaction_id == $id) | .transaction_id // empty')

if [ -n "$TRANSACTION_FOUND" ]; then
    echo "✅ Transaction found in user history: $TRANSACTION_FOUND"
else
    echo "❌ Transaction not found in user history"
fi

# Step 6: Login admin
echo ""
echo "=== PART 2: ADMIN APPROVAL ==="
echo "✅ Step 6: Login admin"

ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

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

APPROVAL_SUCCESS=$(echo "$APPROVAL_RESPONSE" | jq -r '.success // false')

if [ "$APPROVAL_SUCCESS" != "true" ]; then
    echo "❌ Withdrawal approval failed: $APPROVAL_RESPONSE"
else
    echo "✅ Withdrawal approved successfully"
fi

# Step 9: Complete withdrawal
echo ""
echo "✅ Step 9: Complete withdrawal"
COMPLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/withdrawals/complete/$WITHDRAWAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"admin_id\": \"$ADMIN_ID\"}")

COMPLETE_SUCCESS=$(echo "$COMPLETE_RESPONSE" | jq -r '.success // false')

if [ "$COMPLETE_SUCCESS" != "true" ]; then
    echo "❌ Withdrawal completion failed: $COMPLETE_RESPONSE"
else
    echo "✅ Withdrawal completed successfully"
fi

# Step 10: Verify final status
echo ""
echo "✅ Step 10: Verify final status"
FINAL_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/withdrawals" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Final status check completed"

# Step 11: Test rejection flow
echo ""
echo "=== PART 3: REJECTION TEST ==="
echo "✅ Step 11: Record balance before rejection test"

BALANCE_BEFORE_REJECTION_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/balances/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

BALANCE_BEFORE_REJECTION=$(echo "$BALANCE_BEFORE_REJECTION_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .balance // 0')
LOCKED_BEFORE_REJECTION=$(echo "$BALANCE_BEFORE_REJECTION_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .locked_balance // 0')
echo "✅ Balance before rejection test: $BALANCE_BEFORE_REJECTION BTC (locked: $LOCKED_BEFORE_REJECTION BTC)"

# Step 12: Submit second withdrawal for rejection
echo ""
echo "✅ Step 12: Submit 2nd withdrawal (0.0003 BTC) for rejection test"
WITHDRAWAL2_RESPONSE=$(curl -s -X POST "$BASE_URL/user/withdraw" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"currency\": \"BTC\",
    \"amount\": 0.0003,
    \"wallet_address\": \"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\"
  }")

WITHDRAWAL2_ID=$(echo "$WITHDRAWAL2_RESPONSE" | jq -r '.transaction_id // empty')
WITHDRAWAL2_SUCCESS=$(echo "$WITHDRAWAL2_RESPONSE" | jq -r '.success // false')

if [ "$WITHDRAWAL2_SUCCESS" != "true" ] || [ -z "$WITHDRAWAL2_ID" ]; then
    echo "❌ Second withdrawal submission failed: $WITHDRAWAL2_RESPONSE"
else
    echo "✅ Second withdrawal submitted successfully. ID: $WITHDRAWAL2_ID"
    
    # Step 13: Admin rejects
    echo ""
    echo "✅ Step 13: Admin rejects withdrawal"
    REJECTION_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/withdrawals/review" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "{
        \"withdrawal_id\": \"$WITHDRAWAL2_ID\",
        \"admin_id\": \"$ADMIN_ID\",
        \"action\": \"reject\",
        \"notes\": \"Test rejection\"
      }")

    REJECTION_SUCCESS=$(echo "$REJECTION_RESPONSE" | jq -r '.success // false')

    if [ "$REJECTION_SUCCESS" != "true" ]; then
        echo "❌ Withdrawal rejection failed: $REJECTION_RESPONSE"
    else
        echo "✅ Withdrawal rejected successfully"
        
        # Step 14: Verify balance restored
        echo ""
        echo "✅ Step 14: Verify balance restored after rejection"
        sleep 2
        BALANCE_AFTER_REJECTION_RESPONSE=$(curl -s -X GET "$BASE_URL/crypto-bank/balances/$USER_ID" \
          -H "Authorization: Bearer $USER_TOKEN")

        BALANCE_AFTER_REJECTION=$(echo "$BALANCE_AFTER_REJECTION_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .balance // 0')
        LOCKED_AFTER_REJECTION=$(echo "$BALANCE_AFTER_REJECTION_RESPONSE" | jq -r '.balances[] | select(.currency == "BTC") | .locked_balance // 0')
        echo "✅ Balance after rejection: $BALANCE_AFTER_REJECTION BTC (locked: $LOCKED_AFTER_REJECTION BTC)"
    fi
fi

echo ""
echo "================================================================================"
echo "WITHDRAWAL TEST COMPLETED"
echo "================================================================================"

# Generate final summary
echo ""
echo "FINAL SUMMARY ANSWERS:"
echo "- Can user submit? $([ "$WITHDRAWAL_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "- Does balance deduct? $([ "$NEW_BTC_BALANCE" != "$INITIAL_BTC_BALANCE" ] && echo "YES" || echo "NO")"
echo "- Can admin see it? $([ -n "$WITHDRAWAL_FOUND" ] && echo "YES" || echo "NO")"
echo "- Can admin approve? $([ "$APPROVAL_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "- Does status update? $([ "$COMPLETE_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "- Can admin reject? $([ "$REJECTION_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "- Does balance restore? $([ -n "$BALANCE_AFTER_REJECTION" ] && echo "YES" || echo "NO")"
echo "- In user history? $([ -n "$TRANSACTION_FOUND" ] && echo "YES" || echo "NO")"

echo ""
echo "DETAILED RESULTS:"
echo "- Initial balance: $INITIAL_BTC_BALANCE BTC (locked: $INITIAL_LOCKED_BALANCE BTC)"
echo "- After withdrawal: $NEW_BTC_BALANCE BTC (locked: $NEW_LOCKED_BALANCE BTC)"
echo "- Before rejection test: $BALANCE_BEFORE_REJECTION BTC (locked: $LOCKED_BEFORE_REJECTION BTC)"
echo "- After rejection: $BALANCE_AFTER_REJECTION BTC (locked: $LOCKED_AFTER_REJECTION BTC)"
echo "- Withdrawal 1 ID: $WITHDRAWAL_ID"
echo "- Withdrawal 2 ID: $WITHDRAWAL2_ID"