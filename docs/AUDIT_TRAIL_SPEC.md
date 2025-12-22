# AUDIT TRAIL SPECIFICATION - MANDATORY
# SERVICE LOCK: FROZEN
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

## Purpose

Every financial transaction MUST create an immutable audit trail entry.
This specification defines the required structure and validation rules.

---

## Required Fields Per Event

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | String (UUID) | YES | Unique identifier for this event |
| `event_type` | String | YES | Type of event (see below) |
| `user_id` | String | YES | User affected by this event |
| `currency` | String | YES | Currency involved |
| `amount` | Float | YES | Amount involved (negative for debits) |
| `reference_id` | String | YES | Transaction/swap/trade ID |
| `before_state` | Object | RECOMMENDED | Balances before operation |
| `after_state` | Object | RECOMMENDED | Balances after operation |
| `metadata` | Object | NO | Additional context |
| `timestamp` | DateTime | YES | UTC timestamp |
| `checksum` | String | RECOMMENDED | SHA256 of event data |
| `ip_address` | String | NO | Client IP if available |
| `service_checksum` | String | YES | Checksum of service that created event |
| `severity` | String | YES | INFO, WARNING, ERROR, CRITICAL |

---

## Event Types

### Balance Operations
- `atomic_credit_swap` - Credit from swap
- `atomic_credit_p2p` - Credit from P2P trade
- `atomic_credit_deposit` - Credit from deposit
- `atomic_credit_referral_commission` - Credit from referral
- `atomic_debit_swap` - Debit for swap
- `atomic_debit_withdrawal` - Debit for withdrawal
- `atomic_debit_p2p` - Debit for P2P trade
- `atomic_lock_escrow` - Lock for escrow
- `atomic_unlock_escrow` - Unlock from escrow
- `atomic_release_p2p` - Release from seller to buyer

### Liquidity Operations
- `liquidity_reserved` - Liquidity reserved for transaction
- `liquidity_confirmed` - Reservation confirmed
- `liquidity_released` - Reservation released/cancelled
- `liquidity_expired` - Reservation expired

### Integrity Events
- `INTEGRITY_CHECK_PASSED` - Balance check passed
- `INTEGRITY_CHECK_FAILURE` - Balance discrepancy detected (CRITICAL)
- `MANUAL_RECONCILIATION` - Admin forced reconciliation (WARNING)

### Fee Events
- `fee_collected_swap` - Swap fee collected
- `fee_collected_p2p` - P2P fee collected
- `fee_collected_withdrawal` - Withdrawal fee collected
- `referral_commission_paid` - Commission paid to referrer

---

## Critical Events That MUST Be Audited

1. **Balance credits/debits** - Every balance change
2. **Liquidity reservations** - Every reservation/release
3. **Fee calculations** - Every fee collection
4. **Commission distributions** - Every referral payout
5. **Withdrawal attempts** - Every withdrawal request
6. **Integrity check failures** - Every discrepancy
7. **Admin actions** - Every manual intervention

---

## Example Audit Trail Entry

```json
{
  "event_id": "a1b2c3d4e5f6789012345678",
  "event_type": "atomic_credit_swap",
  "user_id": "user_123",
  "currency": "BTC",
  "amount": 0.01,
  "reference_id": "swap_abc123",
  "before_state": {
    "wallets": 0.05,
    "crypto_balances": 0.05,
    "trader_balances": 0.05,
    "internal_balances": 0.05
  },
  "after_state": {
    "wallets": 0.06,
    "crypto_balances": 0.06,
    "trader_balances": 0.06,
    "internal_balances": 0.06
  },
  "metadata": {
    "from_currency": "ETH",
    "swap_rate": 0.05,
    "fee_amount": 0.0001
  },
  "timestamp": "2025-12-22T12:00:00.000Z",
  "checksum": "8f3a7c2e1d5b9a4f",
  "service_checksum": "8f3a7c2e1d5b9a4f",
  "severity": "INFO"
}
```

---

## Validation Rules

1. **Audit trail entries are IMMUTABLE** - Never update or delete
2. **Missing audit trails trigger CRITICAL alerts**
3. **Checksum mismatch indicates tampering**
4. **All CRITICAL events require immediate notification**
5. **Audit trail is verified by integrity check endpoint**

---

## Retention Policy

- Minimum retention: 7 years (financial regulation compliance)
- Archive to cold storage after 1 year
- Never delete without legal approval

---

## Monitoring Requirements

1. **Real-time alerts** for CRITICAL events
2. **Daily summary** of all WARNING events
3. **Weekly integrity report** comparing audit trail vs balances
4. **Monthly reconciliation** for compliance

---

## Database Indexes (Required)

```javascript
// audit_trail collection indexes
db.audit_trail.createIndex({ "event_id": 1 }, { unique: true })
db.audit_trail.createIndex({ "user_id": 1, "timestamp": -1 })
db.audit_trail.createIndex({ "event_type": 1, "timestamp": -1 })
db.audit_trail.createIndex({ "reference_id": 1 })
db.audit_trail.createIndex({ "severity": 1, "timestamp": -1 })
db.audit_trail.createIndex({ "timestamp": -1 })
```

---

## Compliance Notes

This audit trail specification is designed to meet:
- FCA financial record requirements
- GDPR data retention guidelines
- Anti-money laundering (AML) audit requirements
- Internal audit and reconciliation needs

---

**Document Version:** AUDIT-SPEC-v1.0
**Checksum:** 8f3a7c2e1d5b9a4f
**Effective Date:** 22 December 2025
**Review Date:** 22 March 2026
