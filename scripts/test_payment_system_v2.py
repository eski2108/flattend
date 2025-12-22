#!/usr/bin/env python3
"""
COINHUBX PAYMENT SYSTEM v2.0 - COMPLETE TEST SUITE
INTEGRITY_CHECKSUM: 8f3a7c2e1d5b9a4f

Tests all P0, P1, P2 implementations.
"""

import asyncio
import sys
import os
sys.path.insert(0, '/app/backend')
sys.path.insert(0, '/app/backend/services')
sys.path.insert(0, '/app/backend/core')

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# Test results
results = []

def log_result(test_name: str, passed: bool, details: str = ""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append({"test": test_name, "passed": passed, "details": details})
    print(f"{status}: {test_name}")
    if details and not passed:
        print(f"    Details: {details}")

async def run_tests():
    # Connect to database
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['coin_hub_x']
    
    print("="*60)
    print("COINHUBX PAYMENT SYSTEM v2.0 - TEST SUITE")
    print("="*60)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("")
    
    # ==========================================
    # P0.1 - ATOMIC BALANCE SERVICE
    # ==========================================
    print("\n--- P0.1: ATOMIC BALANCE SERVICE ---")
    
    try:
        from services.atomic_balance_service import AtomicBalanceService, get_atomic_balance_service
        atomic_service = get_atomic_balance_service(db)
        log_result("P0.1-1: AtomicBalanceService import", True)
    except Exception as e:
        log_result("P0.1-1: AtomicBalanceService import", False, str(e))
        return
    
    # Test atomic_credit
    test_user = f"test_user_{uuid.uuid4().hex[:8]}"
    test_currency = "BTC"
    test_amount = 0.001
    test_ref = f"test_{uuid.uuid4().hex[:8]}"
    
    try:
        result = await atomic_service.atomic_credit(
            user_id=test_user,
            currency=test_currency,
            amount=test_amount,
            tx_type="test_credit",
            ref_id=test_ref,
            metadata={"test": True}
        )
        log_result("P0.1-2: atomic_credit execution", result.get("success", False))
    except Exception as e:
        log_result("P0.1-2: atomic_credit execution", False, str(e))
    
    # Verify all 4 collections updated
    try:
        w = await db.wallets.find_one({"user_id": test_user, "currency": test_currency})
        cb = await db.crypto_balances.find_one({"user_id": test_user, "currency": test_currency})
        tb = await db.trader_balances.find_one({"trader_id": test_user, "currency": test_currency})
        ib = await db.internal_balances.find_one({"user_id": test_user, "currency": test_currency})
        
        all_synced = all([
            w and abs(w.get("available_balance", 0) - test_amount) < 0.0000001,
            cb and abs(cb.get("available_balance", 0) - test_amount) < 0.0000001,
            tb and abs(tb.get("available_balance", 0) - test_amount) < 0.0000001,
            ib and abs(ib.get("available_balance", 0) - test_amount) < 0.0000001
        ])
        log_result("P0.1-3: All 4 collections synchronized", all_synced)
    except Exception as e:
        log_result("P0.1-3: All 4 collections synchronized", False, str(e))
    
    # Test verify_integrity
    try:
        integrity = await atomic_service.verify_integrity(test_user, test_currency)
        log_result("P0.1-4: verify_integrity returns healthy", integrity.get("status") == "healthy")
    except Exception as e:
        log_result("P0.1-4: verify_integrity returns healthy", False, str(e))
    
    # Test atomic_debit
    try:
        result = await atomic_service.atomic_debit(
            user_id=test_user,
            currency=test_currency,
            amount=test_amount / 2,
            tx_type="test_debit",
            ref_id=f"debit_{test_ref}"
        )
        log_result("P0.1-5: atomic_debit execution", result.get("success", False))
    except Exception as e:
        log_result("P0.1-5: atomic_debit execution", False, str(e))
    
    # Test audit trail created
    try:
        audit = await db.audit_trail.find_one({"reference_id": test_ref})
        log_result("P0.1-6: Audit trail entry created", audit is not None)
    except Exception as e:
        log_result("P0.1-6: Audit trail entry created", False, str(e))
    
    # Cleanup test user
    await db.wallets.delete_many({"user_id": test_user})
    await db.crypto_balances.delete_many({"user_id": test_user})
    await db.trader_balances.delete_many({"trader_id": test_user})
    await db.internal_balances.delete_many({"user_id": test_user})
    await db.audit_trail.delete_many({"user_id": test_user})
    
    # ==========================================
    # P0.2 - PAYMENT CONFIG
    # ==========================================
    print("\n--- P0.2: PAYMENT CONFIG ---")
    
    try:
        from core.config import PaymentConfig, payment_config
        log_result("P0.2-1: PaymentConfig import", True)
    except Exception as e:
        log_result("P0.2-1: PaymentConfig import", False, str(e))
    
    try:
        admin_id = payment_config.ADMIN_WALLET_ID
        log_result("P0.2-2: ADMIN_WALLET_ID loaded", admin_id is not None and len(admin_id) > 0)
    except Exception as e:
        log_result("P0.2-2: ADMIN_WALLET_ID loaded", False, str(e))
    
    try:
        swap_fee = payment_config.get_fee('swap_fee_percent')
        log_result("P0.2-3: get_fee returns value", swap_fee > 0)
    except Exception as e:
        log_result("P0.2-3: get_fee returns value", False, str(e))
    
    try:
        ref_rate = payment_config.get_referral_rate('standard')
        log_result("P0.2-4: get_referral_rate returns value", ref_rate > 0)
    except Exception as e:
        log_result("P0.2-4: get_referral_rate returns value", False, str(e))
    
    # ==========================================
    # P0.3 - LIQUIDITY RESERVATION
    # ==========================================
    print("\n--- P0.3: LIQUIDITY RESERVATION ---")
    
    try:
        from services.liquidity_reservation import LiquidityReservationService, get_liquidity_reservation_service
        liquidity_service = get_liquidity_reservation_service(db)
        log_result("P0.3-1: LiquidityReservationService import", True)
    except Exception as e:
        log_result("P0.3-1: LiquidityReservationService import", False, str(e))
    
    try:
        status = await liquidity_service.get_liquidity_status("BTC")
        log_result("P0.3-2: get_liquidity_status works", "currency" in status)
    except Exception as e:
        log_result("P0.3-2: get_liquidity_status works", False, str(e))
    
    # ==========================================
    # P1.1 - BALANCE SCHEMA
    # ==========================================
    print("\n--- P1.1: BALANCE SCHEMA ---")
    
    try:
        from services.balance_schema import BALANCE_FIELD_MAP, get_field, normalize_balance_doc
        log_result("P1.1-1: balance_schema import", True)
    except Exception as e:
        log_result("P1.1-1: balance_schema import", False, str(e))
    
    try:
        field = get_field('wallets', 'available')
        log_result("P1.1-2: get_field returns correct field", field == 'available_balance')
    except Exception as e:
        log_result("P1.1-2: get_field returns correct field", False, str(e))
    
    try:
        normalized = normalize_balance_doc('wallets', {'available_balance': 100})
        log_result("P1.1-3: normalize_balance_doc works", normalized.get('available') == 100)
    except Exception as e:
        log_result("P1.1-3: normalize_balance_doc works", False, str(e))
    
    # ==========================================
    # P1.2 - REFERRAL CHAIN
    # ==========================================
    print("\n--- P1.2: REFERRAL CHAIN ---")
    
    try:
        from services.referral_chain import ReferralChainService, get_referral_chain_service
        referral_service = get_referral_chain_service(db)
        log_result("P1.2-1: ReferralChainService import", True)
    except Exception as e:
        log_result("P1.2-1: ReferralChainService import", False, str(e))
    
    try:
        tiers = referral_service.REFERRAL_COMMISSION_TIERS
        log_result("P1.2-2: Commission tiers defined", len(tiers) >= 3)
    except Exception as e:
        log_result("P1.2-2: Commission tiers defined", False, str(e))
    
    # ==========================================
    # P1.3 - IDEMPOTENCY
    # ==========================================
    print("\n--- P1.3: IDEMPOTENCY ---")
    
    try:
        from middleware.idempotency import IdempotencyMiddleware, is_payment_endpoint, validate_idempotency_key
        log_result("P1.3-1: Idempotency middleware import", True)
    except Exception as e:
        log_result("P1.3-1: Idempotency middleware import", False, str(e))
    
    try:
        is_payment = is_payment_endpoint("/api/swap/execute")
        log_result("P1.3-2: is_payment_endpoint identifies swap", is_payment)
    except Exception as e:
        log_result("P1.3-2: is_payment_endpoint identifies swap", False, str(e))
    
    # ==========================================
    # P2.1 - INTEGRITY ENDPOINT
    # ==========================================
    print("\n--- P2.1: INTEGRITY ENDPOINT ---")
    
    try:
        from api.integrity import router, set_database
        log_result("P2.1-1: Integrity router import", True)
    except Exception as e:
        log_result("P2.1-1: Integrity router import", False, str(e))
    
    try:
        routes = [r.path for r in router.routes]
        has_check = any('check' in r for r in routes)
        log_result("P2.1-2: /integrity/check route exists", has_check)
    except Exception as e:
        log_result("P2.1-2: /integrity/check route exists", False, str(e))
    
    # ==========================================
    # SUMMARY
    # ==========================================
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Pass Rate: {passed/len(results)*100:.1f}%")
    print("")
    
    if failed > 0:
        print("Failed Tests:")
        for r in results:
            if not r["passed"]:
                print(f"  - {r['test']}: {r['details']}")
    
    print("\n" + "="*60)
    if failed == 0:
        print("✅ ALL TESTS PASSED")
    else:
        print(f"❌ {failed} TEST(S) FAILED")
    print("="*60)
    
    return failed == 0

if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
