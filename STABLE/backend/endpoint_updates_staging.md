# Endpoint Updates Progress - STAGING ONLY

## Status: IN PROGRESS

### ✅ Completed Endpoints

1. **NOWPayments IPN Webhook** (`/api/nowpayments/ipn`)
   - Uses wallet_service.credit()
   - Validates signatures
   - Checks confirmations
   - Prevents double-crediting

2. **Unified Balance Endpoints** (NEW)
   - `/api/wallets/balances/{user_id}` - Get all balances with USD values
   - `/api/wallets/portfolio/{user_id}` - Get portfolio with allocations
   - `/api/wallets/transactions/{user_id}` - Get transaction history

3. **Withdrawal System** (NEW FILE: withdrawal_system_v2.py)
   - Uses wallet_service for all operations
   - Locks balance on request
   - Releases on approval
   - Unlocks on rejection

### 🔄 In Progress

4. **Withdrawal Endpoints** - Integrating v2 system
   - `/api/wallet/withdraw` - Request withdrawal
   - `/api/admin/withdrawals/review` - Approve/reject
   - `/api/admin/withdrawals/complete` - Mark completed

### ⏸️ Pending (High Priority)

5. **P2P Trade Endpoints**
   - `/api/p2p/enhanced/create-trade` - Lock seller funds
   - `/api/p2p/enhanced/release-crypto` - Release to buyer
   - `/api/p2p/enhanced/cancel-trade` - Unlock on cancel

6. **Swap Endpoints**
   - `/api/swap/execute` - Debit one coin, credit another

7. **Express Buy Endpoints**
   - `/api/express-buy/execute` - Debit fiat, credit crypto

8. **Savings Endpoints**
   - `/api/savings/transfer` - Move between wallet and savings

9. **Referral Commission**
   - Automatic credit when referred user trades

### 📝 Implementation Notes

**Pattern for All Updates:**
```python
from wallet_service import get_wallet_service

wallet_service = get_wallet_service()

# For credits (deposits, earnings, refunds)
await wallet_service.credit(
    user_id=user_id,
    currency=currency,
    amount=amount,
    transaction_type=\"deposit|earning|refund|etc\",
    reference_id=tx_id,
    metadata={...}
)\n\n# For debits (withdrawals, purchases)\nawait wallet_service.debit(\n    user_id=user_id,\n    currency=currency,\n    amount=amount,\n    transaction_type=\"withdrawal|purchase|etc\",\n    reference_id=tx_id,\n    metadata={...}\n)\n\n# For locking (P2P escrow, pending withdrawals)\nawait wallet_service.lock_balance(\n    user_id=user_id,\n    currency=currency,\n    amount=amount,\n    lock_type=\"p2p_escrow|withdrawal_pending\",\n    reference_id=trade_id\n)\n\n# For unlocking (cancelled)\nawait wallet_service.unlock_balance(\n    user_id=user_id,\n    currency=currency,\n    amount=amount,\n    unlock_type=\"p2p_cancelled|withdrawal_rejected\",\n    reference_id=trade_id\n)\n\n# For releasing locked (completed)\nawait wallet_service.release_locked_balance(\n    user_id=user_id,\n    currency=currency,\n    amount=amount,\n    release_type=\"p2p_completed|withdrawal_approved\",\n    reference_id=trade_id\n)\n\n# For transfers between users\nawait wallet_service.transfer(\n    from_user=seller_id,\n    to_user=buyer_id,\n    currency=currency,\n    amount=amount,\n    transfer_type=\"p2p_payment\",\n    reference_id=trade_id\n)\n```\n\n### Testing Checklist Per Endpoint\n\n- [ ] Endpoint updated to use wallet service\n- [ ] Old direct DB updates removed\n- [ ] Error handling in place\n- [ ] Transaction logging automatic (wallet service handles it)\n- [ ] Manual test with curl\n- [ ] Verify wallet_transactions collection updated\n- [ ] Verify wallets collection balance correct\n- [ ] No regressions on other pages\n\n---\n\n**Last Updated:** 2025-11-26 16:05 UTC\n