#!/usr/bin/env python3
"""
URGENT: Fix ALL direct balance operations to use sync utilities
"""

import re
import os
from datetime import datetime

SERVER_FILE = "/app/backend/server.py"

# Skip these lines (they ARE the sync utilities)
SKIP_LINES = [270, 277, 284, 291]

def get_context(lines, line_num, context=10):
    """Get surrounding context for a line"""
    start = max(0, line_num - context)
    end = min(len(lines), line_num + context)
    return lines[start:end], start

def analyze_operation(lines, line_num):
    """Analyze what type of operation this is"""
    # Get context
    context_lines, start_idx = get_context(lines, line_num, 20)
    context_text = '\n'.join(context_lines)
    
    # Find the function name
    func_name = "unknown"
    for i in range(line_num - 1, max(0, line_num - 50), -1):
        if 'async def ' in lines[i] or 'def ' in lines[i]:
            match = re.search(r'def\s+(\w+)', lines[i])
            if match:
                func_name = match.group(1)
            break
    
    # Determine operation type
    line = lines[line_num]
    is_inc = '$inc' in context_text.lower()
    is_credit = 'balance' in line and ('+' in context_text or 'inc' in context_text.lower())
    
    return {
        'line_num': line_num + 1,  # 1-indexed
        'func_name': func_name,
        'line': line.strip(),
        'is_increment': is_inc,
        'collection': 'wallets' if 'wallets' in line else 
                     'internal_balances' if 'internal_balances' in line else
                     'crypto_balances' if 'crypto_balances' in line else
                     'trader_balances'
    }

def main():
    print("=" * 70)
    print("🔍 ANALYZING ALL 80 DIRECT BALANCE OPERATIONS")
    print("=" * 70)
    
    with open(SERVER_FILE, 'r') as f:
        lines = f.readlines()
    
    # Find all operations
    operations = []
    for i, line in enumerate(lines):
        if any(x in line for x in ['db.wallets.update_one', 'db.internal_balances.update_one', 
                                    'db.crypto_balances.update_one', 'db.trader_balances.update_one']):
            if (i + 1) not in SKIP_LINES:  # Skip sync utility lines
                op = analyze_operation(lines, i)
                operations.append(op)
    
    print(f"\n📊 Found {len(operations)} operations to fix (excluding sync utilities)\n")
    
    # Group by function
    by_function = {}
    for op in operations:
        func = op['func_name']
        if func not in by_function:
            by_function[func] = []
        by_function[func].append(op)
    
    print("📋 OPERATIONS BY FUNCTION:")
    print("-" * 70)
    for func, ops in sorted(by_function.items()):
        print(f"\n🔧 {func}() - {len(ops)} operations:")
        for op in ops:
            print(f"   Line {op['line_num']}: {op['collection']}")
    
    print("\n" + "=" * 70)
    print(f"📊 SUMMARY: {len(operations)} operations in {len(by_function)} functions")
    print("=" * 70)
    
    return operations, by_function

if __name__ == "__main__":
    ops, by_func = main()
