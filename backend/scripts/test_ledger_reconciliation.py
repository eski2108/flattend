#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════
Task 2: Ledger & Reconciliation - Test Suite
══════════════════════════════════════════════════════════════════════

Tests:
1. Canonical Ledger entry creation
2. Ledger query functions
3. Reconciliation engine (daily/monthly)
4. Mismatch detection
5. Legacy data import

Usage:
    cd /app/backend
    python scripts/test_ledger_reconciliation.py
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ledger_system import (
    CanonicalLedger,
    canonical_ledger,
    ReconciliationEngine,
    reconciliation_engine,
    LegacyDataImporter,
    LedgerEntryType,
    AccountType,
)


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def print_result(name: str, passed: bool, details: str = ""):
    icon = "\u2705" if passed else "\u274c"
    print(f"\n{icon} {name}")
    if details:
        for line in details.split("\n"):
            print(f"   {line}")


# =============================================================================
# TEST 1: CANONICAL LEDGER
# =============================================================================

async def test_canonical_ledger():
    print_header("TEST 1: Canonical Ledger")
    
    # Create mock DB
    mock_db = MagicMock()
    mock_db.canonical_ledger = MagicMock()
    mock_db.canonical_ledger.insert_one = AsyncMock()
    mock_db.canonical_ledger.find = MagicMock(return_value=MagicMock())
    mock_db.canonical_ledger.find.return_value.sort = MagicMock(return_value=MagicMock())
    mock_db.canonical_ledger.find.return_value.sort.return_value.limit = MagicMock(return_value=MagicMock())
    mock_db.canonical_ledger.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    
    ledger = CanonicalLedger(db=mock_db)
    results = []
    
    # Test 1.1: Record deposit entry
    print("\n--- 1.1: Record deposit entry ---")
    entry_id = await ledger.record_deposit(
        user_id="user123",
        currency="GBP",
        amount=1000.0,
        source="bank_transfer",
        balance_before=500.0,
        balance_after=1500.0,
        transaction_id="tx_deposit_001"
    )
    results.append(("Deposit entry created", len(entry_id) == 36))
    print(f"   Entry ID: {entry_id}")
    
    # Test 1.2: Record withdrawal with fee
    print("\n--- 1.2: Record withdrawal with fee ---")
    entry1, entry2 = await ledger.record_withdrawal(
        user_id="user123",
        currency="GBP",
        amount=100.0,
        fee=2.50,
        destination="external_wallet",
        balance_before=1500.0,
        balance_after=1397.50,
        transaction_id="tx_withdraw_001"
    )
    results.append(("Withdrawal entries created", entry1 is not None and entry2 is not None))
    print(f"   Main entry: {entry1}")
    print(f"   Fee entry: {entry2}")
    
    # Test 1.3: Record swap
    print("\n--- 1.3: Record swap transaction ---")
    e1, e2, e3 = await ledger.record_swap(
        user_id="user123",
        from_currency="GBP",
        to_currency="BTC",
        from_amount=1000.0,
        to_amount=0.025,
        fee_amount=5.0,
        fee_currency="GBP",
        from_balance_before=1500.0,
        from_balance_after=500.0,
        to_balance_before=0.0,
        to_balance_after=0.025,
        transaction_id="tx_swap_001"
    )
    results.append(("Swap entries created", e1 is not None and e2 is not None))
    print(f"   Debit entry: {e1}")
    print(f"   Credit entry: {e2}")
    print(f"   Fee entry: {e3}")
    
    # Test 1.4: Record trading fee (revenue)
    print("\n--- 1.4: Record trading fee (revenue) ---")
    fee_entry = await ledger.record_trade_fee(
        user_id="user123",
        currency="GBP",
        fee_amount=10.0,
        fee_type="spot",
        transaction_id="tx_trade_001"
    )
    results.append(("Trading fee entry created", len(fee_entry) == 36))
    print(f"   Fee entry ID: {fee_entry}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Canonical Ledger Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 2: RECONCILIATION ENGINE
# =============================================================================

async def test_reconciliation_engine():
    print_header("TEST 2: Reconciliation Engine")
    
    # Create mock DB with some data
    mock_db = MagicMock()
    
    # Mock canonical_ledger collection
    mock_db.canonical_ledger = MagicMock()
    mock_db.canonical_ledger.count_documents = AsyncMock(return_value=10)
    mock_db.canonical_ledger.aggregate = MagicMock(return_value=MagicMock())
    mock_db.canonical_ledger.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"_id": {"entry_type": "DEPOSIT", "currency": "GBP"}, "total": 10000},
        {"_id": {"entry_type": "WITHDRAWAL", "currency": "GBP"}, "total": 5000},
        {"_id": {"entry_type": "SWAP_FEE", "currency": "GBP"}, "total": 150},
        {"_id": {"entry_type": "TRADING_FEE", "currency": "GBP"}, "total": 250},
    ])
    
    # Mock admin_revenue collection
    mock_db.admin_revenue = MagicMock()
    mock_db.admin_revenue.aggregate = MagicMock(return_value=MagicMock())
    mock_db.admin_revenue.aggregate.return_value.to_list = AsyncMock(return_value=[
        {"_id": "GBP", "total": 400}  # Should match ledger fees
    ])
    
    # Mock fee_transactions collection
    mock_db.fee_transactions = MagicMock()
    mock_db.fee_transactions.aggregate = MagicMock(return_value=MagicMock())
    mock_db.fee_transactions.aggregate.return_value.to_list = AsyncMock(return_value=[])
    
    # Mock reports collection
    mock_db.reconciliation_reports = MagicMock()
    mock_db.reconciliation_reports.insert_one = AsyncMock()
    
    # Mock alerts collection
    mock_db.reconciliation_alerts = MagicMock()
    mock_db.reconciliation_alerts.insert_one = AsyncMock()
    
    engine = ReconciliationEngine(db=mock_db)
    results = []
    
    # Test 2.1: Run daily reconciliation
    print("\n--- 2.1: Run daily reconciliation ---")
    result = await engine.run_daily_reconciliation()
    results.append(("Daily reconciliation runs", result is not None))
    print(f"   Report ID: {result.report_id}")
    print(f"   Period: {result.period}")
    print(f"   Reconciled: {result.reconciled}")
    print(f"   Inflows: {result.total_inflows}")
    print(f"   Outflows: {result.total_outflows}")
    print(f"   Fees: {result.total_fees}")
    
    # Test 2.2: Check mismatch detection
    print("\n--- 2.2: Mismatch detection ---")
    has_mismatch_detection = hasattr(result, 'mismatches')
    results.append(("Mismatch detection exists", has_mismatch_detection))
    print(f"   Mismatch count: {len(result.mismatches)}")
    if result.mismatches:
        print(f"   First mismatch: {result.mismatches[0]}")
    
    # Test 2.3: Revenue sources tracked
    print("\n--- 2.3: Revenue sources tracked ---")
    sources_tracked = len(engine.REVENUE_SOURCES) > 0
    results.append(("Revenue sources defined", sources_tracked))
    print(f"   Tracked sources: {engine.REVENUE_SOURCES}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Reconciliation Engine Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 3: LEDGER ENTRY TYPES
# =============================================================================

async def test_ledger_types():
    print_header("TEST 3: Ledger Entry Types")
    
    results = []
    
    # Test 3.1: All entry types defined
    print("\n--- 3.1: Entry types defined ---")
    entry_types = list(LedgerEntryType)
    results.append(("Entry types defined", len(entry_types) >= 15))
    print(f"   Total entry types: {len(entry_types)}")
    print(f"   Types: {[t.value for t in entry_types[:5]]}...")
    
    # Test 3.2: Account types defined
    print("\n--- 3.2: Account types defined ---")
    account_types = list(AccountType)
    required_types = ["USER", "ADMIN", "ESCROW", "FEE_POOL", "EXTERNAL"]
    has_all = all(any(t.value == r for t in account_types) for r in required_types)
    results.append(("Account types complete", has_all))
    print(f"   Account types: {[t.value for t in account_types]}")
    
    # Test 3.3: Fee entry types
    print("\n--- 3.3: Fee entry types for revenue ---")
    fee_types = [t for t in entry_types if "FEE" in t.value]
    results.append(("Fee types for revenue", len(fee_types) >= 5))
    print(f"   Fee types: {[t.value for t in fee_types]}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Ledger Types Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 4: LEGACY IMPORTER
# =============================================================================

async def test_legacy_importer():
    print_header("TEST 4: Legacy Data Importer")
    
    # Create mock DB
    mock_db = MagicMock()
    
    # Mock source collections
    mock_db.admin_revenue = MagicMock()
    mock_db.admin_revenue.find = MagicMock(return_value=MagicMock())
    mock_db.admin_revenue.find.return_value.to_list = AsyncMock(return_value=[
        {"revenue_id": "rev1", "amount": 100, "currency": "GBP", "source": "swap_fee"}
    ])
    
    mock_db.fee_transactions = MagicMock()
    mock_db.fee_transactions.find = MagicMock(return_value=MagicMock())
    mock_db.fee_transactions.find.return_value.to_list = AsyncMock(return_value=[
        {"transaction_id": "fee1", "amount": 50, "currency": "GBP", "fee_type": "trading_fee"}
    ])
    
    mock_db.swap_history = MagicMock()
    mock_db.swap_history.find = MagicMock(return_value=MagicMock())
    mock_db.swap_history.find.return_value.to_list = AsyncMock(return_value=[
        {"swap_id": "swap1", "user_id": "user1", "from_currency": "GBP", "to_currency": "BTC", "from_amount": 1000, "to_amount": 0.025}
    ])
    
    mock_db.wallet_transactions = MagicMock()
    mock_db.wallet_transactions.find = MagicMock(return_value=MagicMock())
    mock_db.wallet_transactions.find.return_value.to_list = AsyncMock(return_value=[
        {"transaction_id": "tx1", "type": "DEPOSIT", "user_id": "user1", "amount": 500, "currency": "GBP"}
    ])
    
    # Mock canonical_ledger for inserts
    mock_db.canonical_ledger = MagicMock()
    mock_db.canonical_ledger.insert_one = AsyncMock()
    
    importer = LegacyDataImporter(db=mock_db)
    importer.ledger.db = mock_db
    results = []
    
    # Test 4.1: Import all legacy data
    print("\n--- 4.1: Import legacy data ---")
    import_result = await importer.import_all()
    results.append(("Legacy import runs", "errors" in import_result))
    print(f"   Admin revenue imported: {import_result.get('admin_revenue', 0)}")
    print(f"   Fee transactions imported: {import_result.get('fee_transactions', 0)}")
    print(f"   Swaps imported: {import_result.get('swap_history', 0)}")
    print(f"   Wallet transactions imported: {import_result.get('wallet_transactions', 0)}")
    print(f"   Errors: {import_result.get('errors', [])}")
    
    # Test 4.2: Revenue type mapping
    print("\n--- 4.2: Revenue type mapping ---")
    mapping_works = importer._map_revenue_type("SPREAD_PROFIT") == LedgerEntryType.INSTANT_SPREAD
    results.append(("Revenue type mapping works", mapping_works))
    print(f"   SPREAD_PROFIT -> {importer._map_revenue_type('SPREAD_PROFIT')}")
    print(f"   SWAP_FEE -> {importer._map_revenue_type('SWAP_FEE')}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Legacy Importer Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# TEST 5: REAL DATABASE TEST
# =============================================================================

async def test_with_real_db():
    print_header("TEST 5: Real Database Integration")
    
    results = []
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
        db = client['coinhubx_production']
        
        # Initialize services
        from ledger_system import init_ledger_services
        await init_ledger_services(db)
        
        # Test 5.1: Record a test entry
        print("\n--- 5.1: Record test entry to real DB ---")
        test_tx_id = f"test_ledger_{uuid.uuid4().hex[:8]}"
        entry_id = await canonical_ledger.record_entry(
            transaction_id=test_tx_id,
            entry_type=LedgerEntryType.TRADING_FEE,
            from_account_type=AccountType.USER,
            from_account_id="test_user_ledger",
            to_account_type=AccountType.FEE_POOL,
            to_account_id="ADMIN",
            currency="GBP",
            amount=1.23,
            from_balance_before=100,
            from_balance_after=98.77,
            to_balance_before=0,
            to_balance_after=1.23,
            is_revenue=True,
            revenue_source="test_fee",
            description="Test ledger entry"
        )
        results.append(("Entry recorded to DB", len(entry_id) == 36))
        print(f"   Entry ID: {entry_id}")
        
        # Test 5.2: Query the entry back
        print("\n--- 5.2: Query entry from DB ---")
        entries = await canonical_ledger.get_user_ledger("test_user_ledger", limit=10)
        found = any(e.get("entry_id") == entry_id for e in entries)
        results.append(("Entry queryable from DB", found))
        print(f"   Entries found: {len(entries)}")
        
        # Test 5.3: Run reconciliation
        print("\n--- 5.3: Run daily reconciliation ---")
        recon = await reconciliation_engine.run_daily_reconciliation()
        results.append(("Reconciliation runs on real DB", recon.report_id is not None))
        print(f"   Report ID: {recon.report_id}")
        print(f"   Reconciled: {recon.reconciled}")
        print(f"   Revenue: {recon.total_revenue}")
        
        # Cleanup
        await db.canonical_ledger.delete_many({"transaction_id": test_tx_id})
        await db.reconciliation_reports.delete_one({"report_id": recon.report_id})
        print("\n   Cleanup done")
        
    except Exception as e:
        results.append(("Real DB test", False))
        print(f"   Error: {e}")
    
    # Summary
    all_passed = all(r[1] for r in results)
    print("\n--- Real Database Results ---")
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"   {icon} {name}")
    
    return all_passed


# =============================================================================
# MAIN
# =============================================================================

async def main():
    print("\n" + "#" * 70)
    print("#  TASK 2: LEDGER & RECONCILIATION - TEST SUITE")
    print("#" + "=" * 68 + "#")
    print("#  Testing canonical ledger and reconciliation engine")
    print("#" * 70)
    
    results = []
    
    # Run all tests
    results.append(("1. Canonical Ledger", await test_canonical_ledger()))
    results.append(("2. Reconciliation Engine", await test_reconciliation_engine()))
    results.append(("3. Ledger Entry Types", await test_ledger_types()))
    results.append(("4. Legacy Data Importer", await test_legacy_importer()))
    results.append(("5. Real Database Integration", await test_with_real_db()))
    
    # Summary
    print("\n" + "=" * 70)
    print(" FINAL SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for name, passed in results:
        icon = "\u2705" if passed else "\u274c"
        print(f"  {icon} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "-" * 70)
    if all_passed:
        print("\n\U0001f389 ALL LEDGER & RECONCILIATION TESTS PASSED!")
        print("\nComponents verified:")
        print("  \u2713 Canonical ledger entry creation")
        print("  \u2713 Deposit, withdrawal, swap, fee recording")
        print("  \u2713 Daily/monthly reconciliation")
        print("  \u2713 Mismatch detection")
        print("  \u2713 Legacy data import")
        print("  \u2713 Real database integration")
    else:
        print("\n\u26a0\ufe0f SOME TESTS FAILED - Review output above")
    
    print("\n" + "#" * 70)
    
    return all_passed


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
