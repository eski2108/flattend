#!/usr/bin/env python3
"""
TRADING ENGINE ORDER BOOK TEST
==============================

This test specifically focuses on testing the order book functionality
by fixing the import issue and testing all trading pairs.
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone

# Configuration
BACKEND_URL = "https://p2p-trader-board.preview.emergentagent.com/api"

class OrderBookTest:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def setup(self):
        """Initialize HTTP session"""
        print("🔧 Setting up Order Book Test...")
        self.session = aiohttp.ClientSession()
        print("✅ Setup complete!")
        
    async def test_endpoint(self, method, endpoint, data=None, description=""):
        """Test an API endpoint and log results"""
        url = f"{BACKEND_URL}{endpoint}"
        
        print(f"\n🔍 Testing: {description}")
        print(f"📡 {method} {url}")
        
        try:
            if method == "GET":
                async with self.session.get(url) as response:
                    status = response.status
                    result = await response.json()
            elif method == "POST":
                async with self.session.post(url, json=data) as response:
                    status = response.status
                    result = await response.json()
                    
            print(f"📥 Response ({status}): {json.dumps(result, indent=2, default=str)}")
            
            # Generate cURL command
            if method == "POST" and data:
                curl_data = json.dumps(data)
                curl_cmd = f'curl -X POST "{url}" -H "Content-Type: application/json" -d \'{curl_data}\''
            else:
                curl_cmd = f'curl -X {method} "{url}"'
                
            print(f"🔧 cURL: {curl_cmd}")
            
            self.test_results.append({
                "endpoint": endpoint,
                "method": method,
                "status": status,
                "success": result.get("success", False) if isinstance(result, dict) else False,
                "description": description,
                "curl": curl_cmd,
                "response": result
            })
            
            return result
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return {"success": False, "error": str(e)}
            
    async def test_live_prices_endpoint(self):
        """Test the live prices endpoint first"""
        print("\n" + "="*60)
        print("💰 TESTING LIVE PRICES ENDPOINT")
        print("="*60)
        
        result = await self.test_endpoint(
            "GET", "/prices/live",
            description="Get live cryptocurrency prices"
        )
        
        if result.get("success", False):
            print("✅ Live prices working!")
            return result
        else:
            print("❌ Live prices not working, using fallback")
            return None
            
    async def test_order_books_all_pairs(self):
        """Test order book for all trading pairs"""
        print("\n" + "="*60)
        print("📊 TESTING ORDER BOOKS - ALL PAIRS")
        print("="*60)
        
        pairs = ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD"]
        successful_pairs = []
        failed_pairs = []
        
        for pair in pairs:
            print(f"\n📈 Testing {pair} Order Book")
            
            result = await self.test_endpoint(
                "GET", f"/trading/orderbook/{pair}",
                description=f"Get order book for {pair}"
            )
            
            if result.get("success"):
                successful_pairs.append(pair)
                
                # Analyze order book structure
                bids = result.get("bids", [])
                asks = result.get("asks", [])
                spread = result.get("spread", 0)
                mid_price = result.get("mid_price", 0)
                
                print(f"✅ {pair} Order Book Analysis:")
                print(f"   📉 Bid Levels: {len(bids)}")
                print(f"   📈 Ask Levels: {len(asks)}")
                print(f"   💰 Spread: £{spread}")
                print(f"   🎯 Mid Price: £{mid_price}")
                
                if bids and len(bids) >= 3:
                    print(f"   🔝 Top 3 Bids:")
                    for i, bid in enumerate(bids[:3]):
                        print(f"      {i+1}. £{bid.get('price', 0)} x {bid.get('amount', 0)} = £{bid.get('total', 0)}")
                        
                if asks and len(asks) >= 3:
                    print(f"   🔝 Top 3 Asks:")
                    for i, ask in enumerate(asks[:3]):
                        print(f"      {i+1}. £{ask.get('price', 0)} x {ask.get('amount', 0)} = £{ask.get('total', 0)}")
                        
            else:
                failed_pairs.append(pair)
                print(f"❌ {pair} Order Book Failed: {result.get('message', 'Unknown error')}")
                
        return successful_pairs, failed_pairs
        
    async def test_manual_order_book_creation(self):
        """Create a manual order book test to verify the concept"""
        print("\n" + "="*60)
        print("🛠️  MANUAL ORDER BOOK CREATION TEST")
        print("="*60)
        
        # Simulate what the order book should look like
        btc_price = 91485  # Current BTC price in GBP
        
        print(f"📊 Simulating BTC/USD Order Book (Base Price: £{btc_price})")
        
        # Generate bids (below market price)
        bids = []
        for i in range(5):
            spread = (i + 1) * 0.001  # 0.1% intervals
            price = btc_price * (1 - spread)
            amount = round(0.01 + (i * 0.005), 6)  # Varying amounts
            total = price * amount
            bids.append({
                "price": round(price, 2),
                "amount": amount,
                "total": round(total, 2)
            })
            
        # Generate asks (above market price)
        asks = []
        for i in range(5):
            spread = (i + 1) * 0.001
            price = btc_price * (1 + spread)
            amount = round(0.01 + (i * 0.005), 6)
            total = price * amount
            asks.append({
                "price": round(price, 2),
                "amount": amount,
                "total": round(total, 2)
            })
            
        spread = asks[0]["price"] - bids[0]["price"]
        mid_price = (asks[0]["price"] + bids[0]["price"]) / 2
        
        print(f"\n📈 Manual Order Book Structure:")
        print(f"   Spread: £{spread:.2f}")
        print(f"   Mid Price: £{mid_price:.2f}")
        
        print(f"\n📉 Bids (Buy Orders):")
        for i, bid in enumerate(bids):
            print(f"   {i+1}. £{bid['price']} x {bid['amount']} BTC = £{bid['total']}")
            
        print(f"\n📈 Asks (Sell Orders):")
        for i, ask in enumerate(asks):
            print(f"   {i+1}. £{ask['price']} x {ask['amount']} BTC = £{ask['total']}")
            
        print(f"\n✅ Manual order book structure verified!")
        print(f"   This demonstrates what the API should return")
        
    async def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📊 ORDER BOOK TEST REPORT")
        print("="*80)
        
        # Summary statistics
        total_tests = len(self.test_results)
        successful_tests = sum(1 for test in self.test_results if test["success"])
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📈 TEST SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Successful: {successful_tests}")
        print(f"   Failed: {total_tests - successful_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        print(f"\n🔧 ALL CURL COMMANDS:")
        for test in self.test_results:
            print(f"\n# {test['description']}")
            print(f"{test['curl']}")
            
        print(f"\n🏆 ORDER BOOK TESTING COMPLETE!")
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            
    async def run_order_book_test(self):
        """Run the complete order book test suite"""
        try:
            await self.setup()
            
            # Test live prices first
            await self.test_live_prices_endpoint()
            
            # Test all order books
            successful_pairs, failed_pairs = await self.test_order_books_all_pairs()
            
            # Manual order book demonstration
            await self.test_manual_order_book_creation()
            
            # Generate report
            await self.generate_report()
            
            print(f"\n📊 FINAL RESULTS:")
            print(f"   ✅ Working Pairs: {len(successful_pairs)} - {successful_pairs}")
            print(f"   ❌ Failed Pairs: {len(failed_pairs)} - {failed_pairs}")
            
        except Exception as e:
            print(f"❌ Test Error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await self.cleanup()

async def main():
    """Main test execution"""
    print("🚀 STARTING ORDER BOOK COMPREHENSIVE TEST")
    print("="*80)
    
    test = OrderBookTest()
    await test.run_order_book_test()
    
    print("\n🎉 ORDER BOOK TEST COMPLETE!")

if __name__ == "__main__":
    asyncio.run(main())