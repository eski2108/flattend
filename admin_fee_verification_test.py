#!/usr/bin/env python3
"""
Admin Fee Verification Test
Check if admin fees were collected from P2P trades
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://payflow-crypto-3.preview.emergentagent.com/api"

def log_test(message, success=None):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = ""
    if success is True:
        status = "✅"
    elif success is False:
        status = "❌"
    print(f"[{timestamp}] {status} {message}")

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        log_test(f"Request failed: {e}", False)
        return None

def check_admin_balances():
    """Check admin internal balances for fee collection"""
    log_test("💰 Checking admin internal balances for fee collection")
    
    response = make_request("GET", "/admin/internal-balances")
    
    if not response:
        log_test("Failed to get admin balances", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            log_test("Admin balances retrieved successfully", True)
            balances = data.get("balances", {})
            for currency, balance in balances.items():
                log_test(f"Admin {currency}: {balance}")
            return balances
        else:
            log_test(f"Admin balances request failed: {data}", False)
            return None
    else:
        log_test(f"Admin balances failed: {response.status_code} - {response.text}", False)
        return None

def check_platform_earnings():
    """Check platform earnings endpoint"""
    log_test("📊 Checking platform earnings")
    
    response = make_request("GET", "/admin/platform-earnings")
    
    if not response:
        log_test("Failed to get platform earnings", False)
        return None
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            log_test("Platform earnings retrieved successfully", True)
            earnings = data.get("earnings", {})
            for currency, amount in earnings.items():
                log_test(f"Platform earnings {currency}: {amount}")
            return earnings
        else:
            log_test(f"Platform earnings request failed: {data}", False)
            return None
    else:
        log_test(f"Platform earnings failed: {response.status_code} - {response.text}", False)
        return None

def main():
    """Main test execution"""
    print("=" * 60)
    print("🎯 ADMIN FEE VERIFICATION TEST")
    print("=" * 60)
    
    # Check admin balances
    admin_balances = check_admin_balances()
    
    # Check platform earnings
    platform_earnings = check_platform_earnings()
    
    print("\n" + "=" * 60)
    print("📊 ADMIN FEE VERIFICATION RESULTS")
    print("=" * 60)
    
    if admin_balances or platform_earnings:
        log_test("Admin fee system accessible", True)
    else:
        log_test("Admin fee system not accessible", False)

if __name__ == "__main__":
    main()