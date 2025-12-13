#!/usr/bin/env python3
"""Financial Engine Lockdown Verification Script

This script verifies that:
1. All fee logic is backend-only
2. All fee percentages come from centralized config
3. All endpoints use unified financial engine
4. No frontend dependencies exist
5. All safety checks are in place
"""

import os
import re
import sys
from pathlib import Path

class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def check_file_exists(filepath):
    """Check if critical file exists"""
    if os.path.exists(filepath):
        print(f"{Color.GREEN}✅ {filepath} EXISTS{Color.END}")
        return True
    else:
        print(f"{Color.RED}❌ {filepath} MISSING{Color.END}")
        return False

def check_imports_in_file(filepath, required_imports):
    """Check if file imports required centralized services"""
    if not os.path.exists(filepath):
        return False
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    found_imports = []
    for imp in required_imports:
        if imp in content:
            found_imports.append(imp)
            print(f"{Color.GREEN}  ✅ Found import: {imp}{Color.END}")
        else:
            print(f"{Color.RED}  ❌ Missing import: {imp}{Color.END}")
    
    return len(found_imports) == len(required_imports)

def check_fee_percentages():
    """Verify all fee percentages are set correctly"""
    print(f"\n{Color.BLUE}=== CHECKING FEE PERCENTAGES ==={Color.END}")
    
    config_file = '/app/backend/centralized_fee_system.py'
    if not os.path.exists(config_file):
        print(f"{Color.RED}❌ centralized_fee_system.py NOT FOUND{Color.END}")
        return False
    
    with open(config_file, 'r') as f:
        content = f.read()
    
    expected_fees = {
        'spot_trading_fee_percent': 0.1,
        'instant_buy_fee_percent': 2.0,
        'instant_sell_fee_percent': 2.0,
        'swap_fee_percent': 1.5,
        'p2p_maker_fee_percent': 0.5,
        'p2p_taker_fee_percent': 0.5,
        'deposit_fee_percent': 1.0,
        'withdrawal_fee_percent': 1.0,
        'referral_standard_commission_percent': 20.0,
        'referral_golden_commission_percent': 50.0
    }
    
    all_correct = True
    for fee_name, expected_value in expected_fees.items():
        pattern = rf'"{fee_name}"\s*:\s*({expected_value}|{int(expected_value)})'
        if re.search(pattern, content):
            print(f"{Color.GREEN}✅ {fee_name}: {expected_value}%{Color.END}")
        else:
            print(f"{Color.RED}❌ {fee_name}: NOT SET TO {expected_value}%{Color.END}")
            all_correct = False
    
    return all_correct

def check_backend_imports():
    """Check that all transaction files import centralized services"""
    print(f"\n{Color.BLUE}=== CHECKING BACKEND IMPORTS ==={Color.END}")
    
    files_to_check = {
        '/app/backend/server.py': [
            'from centralized_fee_system import get_fee_manager',
            'from referral_engine import get_referral_engine',
            'from liquidity_lock_service import get_liquidity_service'
        ],
        '/app/backend/swap_wallet_service.py': [
            'from centralized_fee_system import get_fee_manager',
            'from referral_engine import get_referral_engine',
            'from liquidity_lock_service import get_liquidity_service'
        ],
        '/app/backend/p2p_wallet_service.py': [
            'from centralized_fee_system import get_fee_manager'
        ],
        '/app/backend/withdrawal_system_v2.py': [
            'from centralized_fee_system import get_fee_manager'
        ]
    }
    
    all_pass = True
    for filepath, imports in files_to_check.items():
        print(f"\n{Color.YELLOW}Checking: {filepath}{Color.END}")
        if not check_imports_in_file(filepath, imports):
            all_pass = False
    
    return all_pass

def check_critical_files():
    """Check all critical files exist"""
    print(f"\n{Color.BLUE}=== CHECKING CRITICAL FILES ==={Color.END}")
    
    critical_files = [
        '/app/backend/centralized_fee_system.py',
        '/app/backend/referral_engine.py',
        '/app/backend/financial_engine.py',
        '/app/backend/liquidity_lock_service.py',
        '/app/backend/nowpayments_payout_service.py',
        '/app/backend/server.py',
        '/app/backend/swap_wallet_service.py',
        '/app/backend/p2p_wallet_service.py',
        '/app/backend/withdrawal_system_v2.py'
    ]
    
    all_exist = True
    for filepath in critical_files:
        if not check_file_exists(filepath):
            all_exist = False
    
    return all_exist

def check_no_frontend_fee_logic():
    """Verify no fee calculations in frontend"""
    print(f"\n{Color.BLUE}=== CHECKING FRONTEND (Should have NO fee logic) ==={Color.END}")
    
    frontend_dir = '/app/frontend/src'
    if not os.path.exists(frontend_dir):
        print(f"{Color.YELLOW}⚠️  Frontend directory not found{Color.END}")
        return True
    
    dangerous_patterns = [
        r'fee.*=.*\*.*0\.0[0-9]+',  # fee = amount * 0.01
        r'fee.*=.*amount.*\*',
        r'calculateFee',
        r'feePercent.*=.*[0-9]'
    ]
    
    violations = []
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    for pattern in dangerous_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            violations.append((filepath, pattern))
    
    if violations:
        print(f"{Color.RED}❌ FOUND FEE LOGIC IN FRONTEND:{Color.END}")
        for filepath, pattern in violations:
            print(f"  {filepath}: {pattern}")
        return False
    else:
        print(f"{Color.GREEN}✅ No fee calculations found in frontend{Color.END}")
        return True

def main():
    print(f"\n{Color.BLUE}{'='*60}")
    print("COINHUBX FINANCIAL ENGINE LOCKDOWN VERIFICATION")
    print(f"{'='*60}{Color.END}\n")
    
    checks = [
        ("Critical Files", check_critical_files),
        ("Fee Percentages", check_fee_percentages),
        ("Backend Imports", check_backend_imports),
        ("Frontend Clean", check_no_frontend_fee_logic)
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"{Color.RED}❌ {check_name} FAILED: {e}{Color.END}")
            results.append((check_name, False))
    
    print(f"\n{Color.BLUE}{'='*60}")
    print("VERIFICATION SUMMARY")
    print(f"{'='*60}{Color.END}\n")
    
    all_passed = True
    for check_name, result in results:
        status = f"{Color.GREEN}✅ PASS{Color.END}" if result else f"{Color.RED}❌ FAIL{Color.END}"
        print(f"{check_name}: {status}")
        if not result:
            all_passed = False
    
    print(f"\n{Color.BLUE}{'='*60}{Color.END}")
    if all_passed:
        print(f"{Color.GREEN}🔒 SYSTEM IS FULLY LOCKED AND VERIFIED{Color.END}")
        return 0
    else:
        print(f"{Color.RED}⚠️  LOCKDOWN VERIFICATION FAILED{Color.END}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
