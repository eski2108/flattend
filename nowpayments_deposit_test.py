#!/usr/bin/env python3
"""
NowPayments Deposit Address Generation Test
Tests the crypto-bank deposit address endpoint for BTC, ETH, and USDT
Verifies that REAL blockchain addresses are returned (not placeholders)
"""

import asyncio
import aiohttp
import json
import re
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://savingsflow.preview.emergentagent.com"

class NOWPaymentsDepositTest:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, details: str):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        print(f"   Details: {details}")
        print()
        
    def is_valid_bitcoin_address(self, address: str) -> bool:
        """Validate Bitcoin address format"""
        if not address or address == "ADDRESS_NOT_CONFIGURED":
            return False
        
        # Bitcoin address patterns
        # Legacy (P2PKH): starts with 1
        # Script (P2SH): starts with 3  
        # Bech32 (P2WPKH/P2WSH): starts with bc1
        bitcoin_patterns = [
            r'^1[A-HJ-NP-Z0-9]{25,34}$',  # Legacy
            r'^3[A-HJ-NP-Z0-9]{25,34}$',  # Script
            r'^bc1[a-z0-9]{39,59}$'       # Bech32
        ]
        
        return any(re.match(pattern, address) for pattern in bitcoin_patterns)
    
    def is_valid_ethereum_address(self, address: str) -> bool:
        """Validate Ethereum address format"""
        if not address or address == "ADDRESS_NOT_CONFIGURED":
            return False
        
        # Ethereum address: 0x followed by 40 hex characters
        eth_pattern = r'^0x[a-fA-F0-9]{40}$'
        return re.match(eth_pattern, address) is not None
    
    def is_valid_usdt_address(self, address: str) -> bool:
        """Validate USDT address format (can be ETH or TRX format)"""
        if not address or address == "ADDRESS_NOT_CONFIGURED":
            return False
        
        # USDT can be on multiple networks
        # ERC20 (Ethereum): 0x...
        # TRC20 (Tron): T...
        # BEP20 (BSC): 0x...
        usdt_patterns = [
            r'^0x[a-fA-F0-9]{40}$',  # ERC20/BEP20
            r'^T[A-Za-z1-9]{33}$'    # TRC20
        ]
        
        return any(re.match(pattern, address) for pattern in usdt_patterns)
    
    def validate_address_format(self, currency: str, address: str) -> bool:
        """Validate address format based on currency"""
        currency = currency.upper()
        
        if currency == "BTC":
            return self.is_valid_bitcoin_address(address)
        elif currency == "ETH":
            return self.is_valid_ethereum_address(address)
        elif currency == "USDT":
            return self.is_valid_usdt_address(address)
        else:
            # For other currencies, just check it's not a placeholder
            return address and address != "ADDRESS_NOT_CONFIGURED" and len(address) > 10
    
    async def test_deposit_address_endpoint(self, session: aiohttp.ClientSession, currency: str):
        """Test deposit address generation for a specific currency"""
        try:
            url = f"{self.backend_url}/api/crypto-bank/deposit-address/{currency.lower()}"
            
            async with session.get(url) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.log_result(
                        f"Deposit Address - {currency}",
                        False,
                        f"HTTP {response.status}: {error_text}"
                    )
                    return None
                
                data = await response.json()
                
                # Check response structure
                required_fields = ["success", "currency", "address"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        f"Deposit Address - {currency}",
                        False,
                        f"Missing required fields: {missing_fields}"
                    )
                    return None
                
                # Check if success is true
                if not data.get("success"):
                    self.log_result(
                        f"Deposit Address - {currency}",
                        False,
                        f"API returned success=false: {data}"
                    )
                    return None
                
                # Get address and validate
                address = data.get("address")
                returned_currency = data.get("currency")
                network = data.get("network", "Unknown")
                payment_id = data.get("payment_id")
                qr_data = data.get("qr_data")
                
                # Validate currency matches
                if returned_currency != currency.upper():
                    self.log_result(
                        f"Deposit Address - {currency}",
                        False,
                        f"Currency mismatch: requested {currency}, got {returned_currency}"
                    )
                    return None
                
                # Validate address format
                is_valid_format = self.validate_address_format(currency, address)
                
                # Check if it's a placeholder
                is_placeholder = (
                    address == "ADDRESS_NOT_CONFIGURED" or
                    "placeholder" in address.lower() or
                    "test" in address.lower() or
                    "demo" in address.lower()
                )
                
                # Determine if this is a REAL address
                is_real_address = is_valid_format and not is_placeholder
                
                details = f"""
Address: {address}
Currency: {returned_currency}
Network: {network}
Payment ID: {payment_id}
QR Data: {qr_data}
Valid Format: {is_valid_format}
Is Placeholder: {is_placeholder}
Is Real Address: {is_real_address}
                """.strip()
                
                self.log_result(
                    f"Deposit Address - {currency}",
                    is_real_address,
                    details
                )
                
                return {
                    "currency": currency,
                    "address": address,
                    "network": network,
                    "payment_id": payment_id,
                    "is_real": is_real_address,
                    "is_valid_format": is_valid_format,
                    "is_placeholder": is_placeholder
                }
                
        except Exception as e:
            self.log_result(
                f"Deposit Address - {currency}",
                False,
                f"Exception: {str(e)}"
            )
            return None
    
    async def test_backend_health(self, session: aiohttp.ClientSession):
        """Test backend health endpoint"""
        try:
            url = f"{self.backend_url}/api/health"
            
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_result(
                        "Backend Health Check",
                        True,
                        f"Backend is healthy: {data.get('status', 'unknown')}"
                    )
                    return True
                else:
                    error_text = await response.text()
                    self.log_result(
                        "Backend Health Check",
                        False,
                        f"HTTP {response.status}: {error_text}"
                    )
                    return False
                    
        except Exception as e:
            self.log_result(
                "Backend Health Check",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def run_comprehensive_test(self):
        """Run comprehensive NowPayments deposit address test"""
        print("🎯 NOWPAYMENTS DEPOSIT ADDRESS GENERATION TEST")
        print("=" * 60)
        print(f"Backend URL: {self.backend_url}")
        print(f"Test Time: {datetime.now().isoformat()}")
        print()
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Backend Health
            print("📋 TESTING BACKEND HEALTH...")
            backend_healthy = await self.test_backend_health(session)
            
            if not backend_healthy:
                print("❌ Backend is not healthy. Stopping tests.")
                return
            
            # Test 2: Test deposit addresses for BTC, ETH, USDT
            print("📋 TESTING DEPOSIT ADDRESS GENERATION...")
            currencies = ["BTC", "ETH", "USDT"]
            address_results = []
            
            for currency in currencies:
                result = await self.test_deposit_address_endpoint(session, currency)
                if result:
                    address_results.append(result)
            
            # Test 3: Verify uniqueness (if we got multiple addresses)
            print("📋 TESTING ADDRESS UNIQUENESS...")
            if len(address_results) > 1:
                addresses = [r["address"] for r in address_results if r["is_real"]]
                unique_addresses = set(addresses)
                
                if len(addresses) == len(unique_addresses):
                    self.log_result(
                        "Address Uniqueness",
                        True,
                        f"All {len(addresses)} addresses are unique"
                    )
                else:
                    duplicates = len(addresses) - len(unique_addresses)
                    self.log_result(
                        "Address Uniqueness",
                        False,
                        f"Found {duplicates} duplicate addresses"
                    )
            else:
                self.log_result(
                    "Address Uniqueness",
                    False,
                    "Not enough valid addresses to test uniqueness"
                )
        
        # Generate final summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Show failed tests
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['details']}")
            print()
        
        # Show address generation results
        deposit_tests = [r for r in self.test_results if "Deposit Address" in r["test"]]
        real_addresses = sum(1 for r in deposit_tests if r["success"])
        
        print("🏦 DEPOSIT ADDRESS RESULTS:")
        print(f"   • Total currencies tested: {len(deposit_tests)}")
        print(f"   • Real addresses generated: {real_addresses}")
        print(f"   • Placeholder addresses: {len(deposit_tests) - real_addresses}")
        
        if real_addresses == len(deposit_tests) and len(deposit_tests) >= 3:
            print("\n✅ SUCCESS: All tested currencies return REAL blockchain addresses!")
        elif real_addresses > 0:
            print(f"\n⚠️  PARTIAL SUCCESS: {real_addresses}/{len(deposit_tests)} currencies return real addresses")
        else:
            print("\n❌ FAILURE: No real blockchain addresses generated - all are placeholders")
        
        print("\n" + "=" * 60)

async def main():
    """Main test execution"""
    tester = NOWPaymentsDepositTest()
    await tester.run_comprehensive_test()

if __name__ == "__main__":
    asyncio.run(main())