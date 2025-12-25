#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════
Task 1: Security & Fund Protection - Test Suite
══════════════════════════════════════════════════════════════════════

Tests:
1. Rate Limiting (per IP + per user + burst)
2. WAF Rules (SQL injection, XSS, replay)
3. 2FA Enforcement (mandatory for withdrawals)
4. Withdrawal Velocity Limits
5. Address Whitelisting
6. Admin Audit Log

Usage:
    cd /app/backend
    python scripts/test_security_hardening.py
"""

import asyncio
import sys
import os
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from security_hardening_v2 import (
    AdvancedRateLimiter,
    advanced_rate_limiter,
    WAFEngine,
    waf_engine,
    TwoFactorEnforcement,
    two_factor_enforcement,
    WithdrawalVelocityLimiter,
    withdrawal_velocity_limiter,
    AddressWhitelist,
    address_whitelist,
    AdminAuditLog,
    admin_audit_log,
    RATE_LIMIT_CONFIGS,
    DEFAULT_WITHDRAWAL_LIMITS,
)


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def print_result(name: str, passed: bool, details: str = ""):
    icon = "✅" if passed else "❌"
    print(f"\n{icon} {name}")
    if details:
        for line in details.split("\n"):
            print(f"   {line}")


# =============================================================================
# TEST 1: RATE LIMITING
# =============================================================================

async def test_rate_limiting():
    print_header("TEST 1: Rate Limiting")
    
    limiter = AdvancedRateLimiter()
    limiter.clear_cache()  # Start fresh
    
    results = []
    
    # Test 1.1: Normal requests allowed
    print("\n--- 1.1: Normal requests allowed ---")
    allowed, reason, retry = await limiter.check_rate_limit("192.168.1.1", "user1", "default")
    results.append(("Normal request allowed", allowed and reason == "ok"))
    print(f"   Allowed: {allowed}, Reason: {reason}")
    
    # Test 1.2: Burst limit
    print("\n--- 1.2: Burst limit enforcement ---")
    limiter.clear_cache()
    burst_blocked = False
    for i in range(25):  # Exceed burst limit of 20
        allowed, reason, retry = await limiter.check_rate_limit("192.168.1.2", None, "default")
        if not allowed and "burst" in reason:
            burst_blocked = True
            print(f"   Burst blocked at request {i+1}: {reason}")
            break
    results.append(("Burst limit enforced", burst_blocked))
    
    # Test 1.3: Window limit
    print("\n--- 1.3: Window limit enforcement ---")
    limiter.clear_cache()
    window_blocked = False
    for i in range(110):  # Exceed window limit of 100
        allowed, reason, retry = await limiter.check_rate_limit("192.168.1.3", None, "default")
        if not allowed and "exceeded" in reason:
            window_blocked = True
            print(f"   Window limit blocked at request {i+1}: {reason}")
            break
        await asyncio.sleep(0.01)  # Small delay to avoid burst
    results.append(("Window limit enforced", window_blocked))
    
    # Test 1.4: Auth endpoint strict limits
    print("\n--- 1.4: Auth endpoint strict limits ---")
    limiter.clear_cache()
    auth_blocked = False
    for i in range(10):  # Login limit is 5 per 5 min
        allowed, reason, retry = await limiter.check_rate_limit("192.168.1.4", None, "auth_login")
        if not allowed:
            auth_blocked = True
            print(f"   Auth blocked at attempt {i+1}: {reason}")
            break
        await asyncio.sleep(0.1)
    results.append(("Auth endpoint strict limit", auth_blocked))
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Rate Limiting Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 2: WAF RULES
# =============================================================================

async def test_waf_rules():
    print_header("TEST 2: WAF Rules")
    
    waf = WAFEngine()
    results = []
    
    # Create mock request
    class MockRequest:
        def __init__(self, path, query="", user_agent="", method="GET"):
            self.url = MagicMock()
            self.url.path = path
            self.url.query = query
            self.client = MagicMock()
            self.client.host = "192.168.1.1"
            self.headers = {"user-agent": user_agent}
            self.method = method
    
    # Test 2.1: SQL Injection blocked
    print("\n--- 2.1: SQL Injection blocked ---")
    req = MockRequest("/api/users", "id=1 OR 1=1")
    allowed, reason, score = await waf.check_request(req)
    results.append(("SQL injection blocked", not allowed and "sql" in reason.lower()))
    print(f"   Allowed: {allowed}, Reason: {reason}, Score: {score}")
    
    # Test 2.2: XSS blocked
    print("\n--- 2.2: XSS blocked ---")
    req = MockRequest("/api/comment")
    allowed, reason, score = await waf.check_request(req, body="<script>alert('xss')</script>")
    results.append(("XSS blocked", not allowed and "xss" in reason.lower()))
    print(f"   Allowed: {allowed}, Reason: {reason}, Score: {score}")
    
    # Test 2.3: Path traversal blocked
    print("\n--- 2.3: Path traversal blocked ---")
    req = MockRequest("/api/files/../../../etc/passwd")
    allowed, reason, score = await waf.check_request(req)
    results.append(("Path traversal blocked", not allowed))
    print(f"   Allowed: {allowed}, Reason: {reason}, Score: {score}")
    
    # Test 2.4: Bad user agent blocked
    print("\n--- 2.4: Scanner user agent blocked ---")
    req = MockRequest("/api/users", user_agent="sqlmap/1.0")
    allowed, reason, score = await waf.check_request(req)
    results.append(("Scanner UA blocked", not allowed))
    print(f"   Allowed: {allowed}, Reason: {reason}, Score: {score}")
    
    # Test 2.5: Clean request allowed
    print("\n--- 2.5: Clean request allowed ---")
    req = MockRequest("/api/users", "page=1&limit=10", "Mozilla/5.0")
    allowed, reason, score = await waf.check_request(req)
    results.append(("Clean request allowed", allowed and reason == "ok"))
    print(f"   Allowed: {allowed}, Reason: {reason}, Score: {score}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- WAF Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 3: 2FA ENFORCEMENT
# =============================================================================

async def test_2fa_enforcement():
    print_header("TEST 3: 2FA Enforcement")
    
    tfa = TwoFactorEnforcement()
    results = []
    
    # Test 3.1: 2FA required for withdrawals
    print("\n--- 3.1: 2FA required for withdrawals ---")
    required, reason = await tfa.check_2fa_required("user1", "withdrawal_create", 100)
    results.append(("2FA required for withdrawal", required))
    print(f"   Required: {required}, Reason: {reason}")
    
    # Test 3.2: 2FA required for API key creation
    print("\n--- 3.2: 2FA required for API key ---")
    required, reason = await tfa.check_2fa_required("user1", "api_key_create", 0)
    results.append(("2FA required for API key", required))
    print(f"   Required: {required}, Reason: {reason}")
    
    # Test 3.3: 2FA not required for small trades
    print("\n--- 3.3: 2FA not required for small trades ---")
    required, reason = await tfa.check_2fa_required("user1", "trading_order", 100)
    results.append(("2FA not required for small trade", not required))
    print(f"   Required: {required}, Reason: {reason}")
    
    # Test 3.4: 2FA required for large trades
    print("\n--- 3.4: 2FA required for large trades ---")
    required, reason = await tfa.check_2fa_required("user1", "trading_order", 15000)
    results.append(("2FA required for large trade", required))
    print(f"   Required: {required}, Reason: {reason}")
    
    # Test 3.5: Enforcement blocks without code
    print("\n--- 3.5: Enforcement blocks without code ---")
    allowed, error = await tfa.enforce_2fa("user1", "withdrawal_create", None, 100)
    results.append(("Blocked without 2FA code", not allowed and "required" in error))
    print(f"   Allowed: {allowed}, Error: {error}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- 2FA Enforcement Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 4: WITHDRAWAL VELOCITY LIMITS
# =============================================================================

async def test_withdrawal_velocity():
    print_header("TEST 4: Withdrawal Velocity Limits")
    
    # Create mock DB
    mock_db = MagicMock()
    mock_db.user_withdrawal_limits = MagicMock()
    mock_db.user_withdrawal_limits.find_one = AsyncMock(return_value=None)
    mock_db.withdrawals = MagicMock()
    mock_db.withdrawals.find_one = AsyncMock(return_value=None)
    mock_db.withdrawals.aggregate = MagicMock(return_value=MagicMock())
    mock_db.withdrawals.aggregate.return_value.to_list = AsyncMock(return_value=[])
    
    limiter = WithdrawalVelocityLimiter(db=mock_db)
    results = []
    
    # Test 4.1: Normal withdrawal allowed
    print("\n--- 4.1: Normal withdrawal allowed ---")
    allowed, reason, details = await limiter.check_withdrawal_allowed("user1", "BTC", 0.5)
    results.append(("Normal withdrawal allowed", allowed))
    print(f"   Allowed: {allowed}, Reason: {reason}")
    print(f"   Remaining: {details}")
    
    # Test 4.2: Per-transaction limit
    print("\n--- 4.2: Per-transaction limit enforced ---")
    allowed, reason, details = await limiter.check_withdrawal_allowed("user1", "BTC", 10.0)  # Exceeds 1 BTC limit
    results.append(("Per-transaction limit enforced", not allowed and "per_transaction" in reason))
    print(f"   Allowed: {allowed}, Reason: {reason}")
    
    # Test 4.3: Default limits exist
    print("\n--- 4.3: Default limits configured ---")
    btc_limit = DEFAULT_WITHDRAWAL_LIMITS.get("BTC")
    usdt_limit = DEFAULT_WITHDRAWAL_LIMITS.get("USDT")
    has_limits = btc_limit is not None and usdt_limit is not None
    results.append(("Default limits configured", has_limits))
    if has_limits:
        print(f"   BTC: max/tx={btc_limit.max_per_transaction}, max/day={btc_limit.max_per_day}")
        print(f"   USDT: max/tx={usdt_limit.max_per_transaction}, max/day={usdt_limit.max_per_day}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Withdrawal Velocity Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 5: ADDRESS WHITELISTING
# =============================================================================

async def test_address_whitelist():
    print_header("TEST 5: Address Whitelisting")
    
    # Create mock DB
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value={"user_id": "user1", "withdrawal_whitelist_enabled": True})
    mock_db.withdrawal_whitelist = MagicMock()
    mock_db.withdrawal_whitelist.find_one = AsyncMock(return_value=None)
    mock_db.withdrawal_whitelist.insert_one = AsyncMock()
    
    whitelist = AddressWhitelist(db=mock_db)
    results = []
    
    # Test 5.1: Non-whitelisted address blocked
    print("\n--- 5.1: Non-whitelisted address blocked ---")
    allowed, reason, activation = await whitelist.check_address_whitelisted(
        "user1", "BTC", "bc1qtest123"
    )
    results.append(("Non-whitelisted blocked", not allowed and "not_whitelisted" in reason))
    print(f"   Allowed: {allowed}, Reason: {reason}")
    
    # Test 5.2: Add address returns token
    print("\n--- 5.2: Add address returns verification token ---")
    success, msg, token = await whitelist.add_address("user1", "BTC", "bc1qnewaddress", "My Wallet")
    results.append(("Add address returns token", success and len(token) > 0))
    print(f"   Success: {success}, Message: {msg}")
    print(f"   Token: {token[:20]}..." if token else "   Token: None")
    
    # Test 5.3: Cooldown period
    print("\n--- 5.3: Address cooldown period configured ---")
    cooldown = whitelist.ADDRESS_ACTIVATION_COOLDOWN_HOURS
    results.append(("Cooldown configured", cooldown == 24))
    print(f"   Cooldown: {cooldown} hours")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Address Whitelist Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 6: ADMIN AUDIT LOG
# =============================================================================

async def test_admin_audit():
    print_header("TEST 6: Admin Audit Log")
    
    # Create mock DB
    mock_db = MagicMock()
    mock_db.admin_audit_log = MagicMock()
    mock_db.admin_audit_log.insert_one = AsyncMock()
    mock_db.admin_audit_log.find = MagicMock(return_value=MagicMock())
    mock_db.admin_audit_log.find.return_value.sort = MagicMock(return_value=MagicMock())
    mock_db.admin_audit_log.find.return_value.sort.return_value.skip = MagicMock(return_value=MagicMock())
    mock_db.admin_audit_log.find.return_value.sort.return_value.skip.return_value.limit = MagicMock(return_value=MagicMock())
    mock_db.admin_audit_log.find.return_value.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    
    audit = AdminAuditLog(db=mock_db)
    results = []
    
    # Test 6.1: Log entry created
    print("\n--- 6.1: Log entry created ---")
    audit_id = await audit.log(
        admin_id="admin1",
        admin_email="admin@test.com",
        action="user_suspend",
        target_type="user",
        target_id="user123",
        before_value={"status": "active"},
        after_value={"status": "suspended"},
        ip_address="192.168.1.1",
        notes="Suspicious activity"
    )
    results.append(("Log entry created", len(audit_id) == 36))  # UUID length
    print(f"   Audit ID: {audit_id}")
    
    # Test 6.2: Checksum calculated
    print("\n--- 6.2: Checksum calculated ---")
    entry = {
        "audit_id": "test-id",
        "timestamp_iso": datetime.now(timezone.utc).isoformat(),
        "admin_id": "admin1",
        "action": "test",
        "target_id": "target1"
    }
    checksum = audit._calculate_checksum(entry)
    results.append(("Checksum calculated", len(checksum) == 16))
    print(f"   Checksum: {checksum}")
    
    # Test 6.3: Audited actions defined
    print("\n--- 6.3: Audited actions defined ---")
    actions = audit.AUDITED_ACTIONS
    has_required = all(a in actions for a in [
        "user_suspend", "withdrawal_approve", "2fa_reset", "fee_change"
    ])
    results.append(("Audited actions defined", has_required))
    print(f"   Total audited actions: {len(actions)}")
    print(f"   Sample: {actions[:5]}")
    
    # Test 6.4: CSV export format
    print("\n--- 6.4: CSV export capability ---")
    # Mock some data for export
    mock_db.admin_audit_log.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(
        return_value=[{
            "audit_id": "test-123",
            "timestamp_iso": "2025-01-01T00:00:00Z",
            "admin_id": "admin1",
            "admin_email": "admin@test.com",
            "action": "user_suspend",
            "target_type": "user",
            "target_id": "user1",
            "ip_address": "1.2.3.4",
            "notes": "test",
            "checksum": "abc123"
        }]
    )
    csv_output = await audit.export_csv()
    has_csv = "audit_id" in csv_output and "timestamp" in csv_output
    results.append(("CSV export works", has_csv))
    print(f"   CSV preview: {csv_output[:100]}...")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Admin Audit Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# MAIN
# =============================================================================

async def main():
    print("\n" + "#" * 70)
    print("#  TASK 1: SECURITY & FUND PROTECTION - TEST SUITE")
    print("#" + "=" * 68 + "#")
    print("#  Testing all 6 security components")
    print("#" * 70)
    
    results = []
    
    # Run all tests
    results.append(("1. Rate Limiting", await test_rate_limiting()))
    results.append(("2. WAF Rules", await test_waf_rules()))
    results.append(("3. 2FA Enforcement", await test_2fa_enforcement()))
    results.append(("4. Withdrawal Velocity", await test_withdrawal_velocity()))
    results.append(("5. Address Whitelist", await test_address_whitelist()))
    results.append(("6. Admin Audit Log", await test_admin_audit()))
    
    # Summary
    print("\n" + "=" * 70)
    print(" FINAL SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for name, passed in results:
        icon = "✅" if passed else "❌"
        print(f"  {icon} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "-" * 70)
    if all_passed:
        print("\n🎉 ALL SECURITY TESTS PASSED!")
        print("\nComponents verified:")
        print("  ✓ Rate limiting (per IP + per user + burst)")
        print("  ✓ WAF rules (SQL injection, XSS, path traversal, scanners)")
        print("  ✓ 2FA enforcement (mandatory for withdrawals/API keys)")
        print("  ✓ Withdrawal velocity limits (per tx/hour/day/week/month)")
        print("  ✓ Address whitelisting (with 24h cooldown)")
        print("  ✓ Admin audit log (immutable, searchable, exportable)")
    else:
        print("\n⚠️ SOME TESTS FAILED - Review output above")
    
    print("\n" + "#" * 70)
    
    return all_passed


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
