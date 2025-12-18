#!/usr/bin/env python3
"""
Check internal balances collection directly
"""

import requests
import json

BACKEND_URL = "https://trading-perf-boost.preview.emergentagent.com"

def check_collections():
    print("=== CHECKING INTERNAL BALANCE COLLECTIONS ===")
    
    # Check admin internal balances
    print("\n1. Admin Internal Balances:")
    response = requests.get(f"{BACKEND_URL}/api/admin/internal-balances")
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Balances: {data.get('balances', {})}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # Check platform settings
    print("\n2. Platform Settings:")
    response = requests.get(f"{BACKEND_URL}/api/admin/platform-settings")
    if response.status_code == 200:
        data = response.json()
        settings = data.get('settings', {})
        print(f"Swap Fee Percent: {settings.get('swap_fee_percent', 'Not found')}")
        print(f"P2P Trade Fee Percent: {settings.get('p2p_trade_fee_percent', 'Not found')}")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    check_collections()