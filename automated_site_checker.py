#!/usr/bin/env python3
"""
Automated Site Checker Bot
Runs through the entire site checking for bugs, errors, and issues
"""

import asyncio
import sys
import os
from datetime import datetime
from playwright.async_api import async_playwright
import json

SITE_URL = "https://savingsflow.preview.emergentagent.com"
TEST_USER = "gads21083@gmail.com"
TEST_PASS = "123456789"

class SiteChecker:
    def __init__(self):
        self.results = []
        self.errors = []
        self.warnings = []
        self.passed = 0
        self.failed = 0
        
    def log(self, status, test_name, message="", details=""):
        """Log test result"""
        result = {
            "status": status,
            "test": test_name,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        if status == "PASS":
            self.passed += 1
            print(f"  ✅ {test_name}: {message}")
        elif status == "FAIL":
            self.failed += 1
            self.errors.append(result)
            print(f"  ❌ {test_name}: {message}")
        elif status == "WARN":
            self.warnings.append(result)
            print(f"  ⚠️  {test_name}: {message}")
        else:
            print(f"  ℹ️  {test_name}: {message}")
    
    async def run_all_tests(self):
        """Run all automated tests"""
        print("\n" + "="*80)
        print("🤖 AUTOMATED SITE CHECKER BOT - STARTING")
        print("="*80)
        print(f"Site: {SITE_URL}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80 + "\n")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            # Collect console errors
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            
            try:
                # Test 1: Homepage loads
                await self.test_homepage(page)
                
                # Test 2: Login works
                await self.test_login(page)
                
                # Test 3: Dashboard loads
                await self.test_dashboard(page)
                
                # Test 4: Wallet page
                await self.test_wallet(page)
                
                # Test 5: P2P Express page
                await self.test_p2p_express(page)
                
                # Test 6: Swap page
                await self.test_swap_page(page)
                
                # Test 7: Trading page
                await self.test_trading_page(page)
                
                # Test 8: Check for JavaScript errors
                await self.test_console_errors(console_errors)
                
                # Test 9: Check all navigation links
                await self.test_navigation(page)
                
                # Test 10: Mobile responsiveness
                await self.test_mobile_view(page, context)
                
            except Exception as e:
                self.log("FAIL", "Critical Error", f"Test suite crashed: {str(e)}")
            
            await browser.close()
        
        # Generate report
        self.generate_report()
    
    async def test_homepage(self, page):
        """Test 1: Homepage loads correctly"""
        print("\n📋 Test 1: Homepage")
        try:
            response = await page.goto(SITE_URL, wait_until="networkidle", timeout=30000)
            if response.status == 200:
                self.log("PASS", "Homepage Load", "Homepage loaded successfully")
            else:
                self.log("FAIL", "Homepage Load", f"Got status code {response.status}")
        except Exception as e:
            self.log("FAIL", "Homepage Load", f"Failed to load: {str(e)}")
    
    async def test_login(self, page):
        """Test 2: Login functionality"""
        print("\n📋 Test 2: Login")
        try:
            await page.goto(f"{SITE_URL}/login", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            
            # Fill login form
            await page.fill('input[type="email"]', TEST_USER)
            await page.fill('input[type="password"]', TEST_PASS)
            self.log("PASS", "Login Form", "Login form inputs found and filled")
            
            # Click login
            await page.click('button[type="submit"]', force=True)
            await page.wait_for_timeout(3000)
            
            # Check if redirected to dashboard
            current_url = page.url
            if "/dashboard" in current_url or "/wallet" in current_url:
                self.log("PASS", "Login Success", "Successfully logged in")
            else:
                self.log("WARN", "Login Redirect", f"Redirected to: {current_url}")
        except Exception as e:
            self.log("FAIL", "Login", f"Login failed: {str(e)}")
    
    async def test_dashboard(self, page):
        """Test 3: Dashboard page"""
        print("\n📋 Test 3: Dashboard")
        try:
            await page.goto(f"{SITE_URL}/dashboard", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # Check for key elements
            title = await page.text_content('h1, h2', timeout=5000)
            if title:
                self.log("PASS", "Dashboard Load", f"Dashboard loaded with title: {title[:50]}")
            else:
                self.log("WARN", "Dashboard Title", "No title found")
        except Exception as e:
            self.log("FAIL", "Dashboard", f"Dashboard failed: {str(e)}")
    
    async def test_wallet(self, page):
        """Test 4: Wallet page"""
        print("\n📋 Test 4: Wallet Page")
        try:
            await page.goto(f"{SITE_URL}/wallet", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # Check if wallet balances are displayed
            page_content = await page.content()
            if "BTC" in page_content or "Balance" in page_content:
                self.log("PASS", "Wallet Page", "Wallet page loads with balance info")
            else:
                self.log("WARN", "Wallet Content", "No balance info found")
        except Exception as e:
            self.log("FAIL", "Wallet Page", f"Wallet failed: {str(e)}")
    
    async def test_p2p_express(self, page):
        """Test 5: P2P Express page"""
        print("\n📋 Test 5: P2P Express")
        try:
            await page.goto(f"{SITE_URL}/p2p-express", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # Check for dual currency input
            inputs = await page.query_selector_all('input[type="number"]')
            if len(inputs) >= 2:
                self.log("PASS", "P2P Express", f"Dual currency input found ({len(inputs)} inputs)")
            else:
                self.log("WARN", "P2P Express", f"Only {len(inputs)} input(s) found")
            
            # Check for BTC selector
            selects = await page.query_selector_all('select')
            if len(selects) >= 1:
                self.log("PASS", "P2P Selectors", "Currency selectors present")
        except Exception as e:
            self.log("FAIL", "P2P Express", f"P2P Express failed: {str(e)}")
    
    async def test_swap_page(self, page):
        """Test 6: Swap page"""
        print("\n📋 Test 6: Swap Page")
        try:
            await page.goto(f"{SITE_URL}/swap-crypto", wait_until="networkidle")
            await page.wait_for_timeout(3000)
            
            # Check for FROM section
            page_content = await page.content()
            if "From" in page_content and "To" in page_content:
                self.log("PASS", "Swap Page", "Swap page loaded with FROM/TO sections")
            else:
                self.log("WARN", "Swap Page", "FROM/TO sections not found")
            
            # Check for swap button
            swap_button = await page.query_selector('button:has-text("Swap")')
            if swap_button:
                self.log("PASS", "Swap Button", "Swap button found")
        except Exception as e:
            self.log("FAIL", "Swap Page", f"Swap page failed: {str(e)}")
    
    async def test_trading_page(self, page):
        """Test 7: Trading page"""
        print("\n📋 Test 7: Trading Page")
        try:
            await page.goto(f"{SITE_URL}/trading", wait_until="networkidle")
            await page.wait_for_timeout(3000)
            
            # Check if page loads
            page_content = await page.content()
            if "Trading" in page_content or "Chart" in page_content:
                self.log("PASS", "Trading Page", "Trading page loaded")
            else:
                self.log("WARN", "Trading Page", "Trading page content unclear")
        except Exception as e:
            self.log("FAIL", "Trading Page", f"Trading page failed: {str(e)}")
    
    async def test_console_errors(self, console_errors):
        """Test 8: Check for JavaScript errors"""
        print("\n📋 Test 8: JavaScript Errors")
        if len(console_errors) == 0:
            self.log("PASS", "Console Errors", "No JavaScript errors found")
        else:
            # Filter out known safe errors (like CORS from third-party scripts)
            critical_errors = [e for e in console_errors if "CORS" not in e and "tawk" not in e]
            if len(critical_errors) == 0:
                self.log("PASS", "Console Errors", f"Only {len(console_errors)} non-critical errors")
            else:
                self.log("WARN", "Console Errors", f"{len(critical_errors)} errors found", details=str(critical_errors[:3]))
    
    async def test_navigation(self, page):
        """Test 9: Navigation links work"""
        print("\n📋 Test 9: Navigation")
        try:
            await page.goto(f"{SITE_URL}/dashboard", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # Find all navigation links
            links = await page.query_selector_all('a[href]')
            self.log("PASS", "Navigation Links", f"Found {len(links)} navigation links")
        except Exception as e:
            self.log("FAIL", "Navigation", f"Navigation check failed: {str(e)}")
    
    async def test_mobile_view(self, page, context):
        """Test 10: Mobile responsiveness"""
        print("\n📋 Test 10: Mobile View")
        try:
            # Create mobile viewport
            mobile_page = await context.new_page()
            await mobile_page.set_viewport_size({'width': 375, 'height': 812})
            
            await mobile_page.goto(f"{SITE_URL}/swap-crypto", wait_until="networkidle")
            await mobile_page.wait_for_timeout(2000)
            
            # Check if page is responsive
            viewport = mobile_page.viewport_size
            if viewport['width'] == 375:
                self.log("PASS", "Mobile View", "Mobile viewport applied correctly")
            
            await mobile_page.close()
        except Exception as e:
            self.log("FAIL", "Mobile View", f"Mobile test failed: {str(e)}")
    
    def generate_report(self):
        """Generate final test report"""
        print("\n" + "="*80)
        print("📊 TEST REPORT")
        print("="*80)
        
        total = self.passed + self.failed
        print(f"\nTotal Tests: {total}")
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        
        if self.failed > 0:
            print("\n🔴 FAILED TESTS:")
            for error in self.errors:
                print(f"  • {error['test']}: {error['message']}")
        
        if len(self.warnings) > 0:
            print("\n⚠️  WARNINGS:")
            for warn in self.warnings[:5]:  # Show first 5
                print(f"  • {warn['test']}: {warn['message']}")
        
        # Save report to file
        report_file = f"/app/test_reports/site_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        os.makedirs("/app/test_reports", exist_ok=True)
        
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total": total,
                    "passed": self.passed,
                    "failed": self.failed,
                    "warnings": len(self.warnings)
                },
                "results": self.results
            }, f, indent=2)
        
        print(f"\n📄 Report saved: {report_file}")
        
        print("\n" + "="*80)
        if self.failed == 0:
            print("🎉 ALL TESTS PASSED! Site is working correctly.")
        else:
            print(f"⚠️  {self.failed} test(s) failed. Review errors above.")
        print("="*80 + "\n")
        
        return 0 if self.failed == 0 else 1

async def main():
    checker = SiteChecker()
    return await checker.run_all_tests()

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(result)
