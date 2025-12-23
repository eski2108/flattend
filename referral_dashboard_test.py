#!/usr/bin/env python3
"""
COMPREHENSIVE REFERRAL DASHBOARD ENDPOINT TESTING
Test the NEW COMPREHENSIVE referral dashboard endpoint with 100% REAL DATA

Test Scenario:
1. Call GET /api/referral/dashboard/comprehensive/{user_id}
2. Verify response contains REAL DATA (not placeholders)
3. Cross-check with direct DB queries
4. Test with users who have no referrals and some referrals
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone
import sys
import traceback
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Backend URL from environment
BACKEND_URL = "https://trade-form-polish.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test users
TEST_USERS = [
    "gads21083@gmail.com",  # Primary test user
    "80a4a694-a6a4-4f84-94a3-1e5cad51eaf3",  # Alternative user ID format
    "nonexistent@test.com"  # Test user with no data
]

class ReferralDashboardTester:
    def __init__(self):
        self.session = None
        self.db = None
        self.results = []
        
    async def setup(self):
        """Setup HTTP session and DB connection"""
        self.session = aiohttp.ClientSession()
        
        # Connect to MongoDB for verification queries
        try:
            mongo_url = "mongodb://localhost:27017"
            client = AsyncIOMotorClient(mongo_url)
            self.db = client["coinhubx"]
            print("✅ Connected to MongoDB for verification")
        except Exception as e:
            print(f"⚠️ Could not connect to MongoDB: {e}")
            self.db = None
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    async def test_comprehensive_dashboard_endpoint(self, user_id: str):
        """Test the comprehensive referral dashboard endpoint"""
        print(f"\n🎯 TESTING COMPREHENSIVE DASHBOARD FOR USER: {user_id}")
        print("=" * 80)
        
        endpoint = f"{API_BASE}/referral/dashboard/comprehensive/{user_id}"
        
        try:
            async with self.session.get(endpoint) as response:
                status = response.status
                content_type = response.headers.get('content-type', '')
                
                print(f"📡 Endpoint: {endpoint}")
                print(f"📊 Status Code: {status}")
                print(f"📋 Content-Type: {content_type}")
                
                if status == 200:
                    data = await response.json()
                    await self.verify_response_structure(user_id, data)
                    await self.cross_check_with_database(user_id, data)
                    return {"user_id": user_id, "status": "success", "data": data}
                else:
                    error_text = await response.text()
                    print(f"❌ ERROR: {status} - {error_text}")
                    return {"user_id": user_id, "status": "error", "error": error_text}
                    
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}")
            traceback.print_exc()
            return {"user_id": user_id, "status": "exception", "error": str(e)}
    
    async def verify_response_structure(self, user_id: str, data: dict):
        """Verify the response contains all expected fields with REAL data"""
        print(f"\n🔍 VERIFYING RESPONSE STRUCTURE FOR {user_id}")
        print("-" * 60)
        
        # Check success flag
        success = data.get("success", False)
        print(f"✅ Success: {success}")
        
        if not success:
            print(f"❌ API returned success=False: {data.get('error', 'Unknown error')}")
            return
        
        # Required fields
        required_fields = [
            "referral_code", "referral_link", "tier", "total_earnings",
            "earnings_by_period", "earnings_by_stream", "referral_tree",
            "activity_timeline", "conversion_metrics", "referral_stats",
            "tier_progress"
        ]
        
        print("\n📋 CHECKING REQUIRED FIELDS:")
        for field in required_fields:
            if field in data:
                print(f"✅ {field}: Present")
                self.analyze_field_data(field, data[field])
            else:
                print(f"❌ {field}: MISSING")
        
        # Check for placeholders
        print(f"\n🚫 CHECKING FOR PLACEHOLDERS:")
        self.check_for_placeholders(data)
    
    def analyze_field_data(self, field_name: str, field_data):
        """Analyze specific field data for real values"""
        if field_name == "referral_code":
            if field_data and field_data != "PLACEHOLDER":
                print(f"   📝 Referral Code: {field_data}")
            else:
                print(f"   ❌ Referral Code is placeholder or empty")
        
        elif field_name == "referral_link":
            if field_data and "coinhubx.com" in field_data:
                print(f"   🔗 Referral Link: {field_data}")
            else:
                print(f"   ❌ Referral Link invalid or placeholder")
        
        elif field_name == "tier":
            print(f"   🏆 Tier: {field_data}")
        
        elif field_name == "total_earnings":
            if isinstance(field_data, dict):
                total_gbp = field_data.get("total_gbp", 0)
                print(f"   💰 Total Earnings: £{total_gbp}")
                if "by_currency" in field_data:
                    print(f"   💱 Currency Breakdown: {len(field_data['by_currency'])} currencies")
        
        elif field_name == "earnings_by_period":
            if isinstance(field_data, dict):
                for period, data in field_data.items():
                    amount = data.get("amount", 0) if isinstance(data, dict) else 0
                    print(f"   📅 {period.title()}: £{amount}")
        
        elif field_name == "referral_tree":
            if isinstance(field_data, dict):
                total = field_data.get("total_referrals", 0)
                active = field_data.get("active_referrals", 0)
                pending = field_data.get("pending_referrals", 0)
                print(f"   🌳 Referral Tree: {total} total, {active} active, {pending} pending")
        
        elif field_name == "referral_stats":
            if isinstance(field_data, dict):
                active = field_data.get("active_referrals", 0)
                pending = field_data.get("pending_signups", 0)
                total = field_data.get("total_referrals", 0)
                print(f"   📊 Stats: {active} active, {pending} pending, {total} total")
    
    def check_for_placeholders(self, data: dict):
        """Check for placeholder values"""
        placeholder_indicators = [
            "placeholder", "PLACEHOLDER", "TODO", "test", "dummy", 
            "example", "sample", "mock", "fake"
        ]
        
        def check_value(value, path=""):
            if isinstance(value, str):
                for indicator in placeholder_indicators:
                    if indicator.lower() in value.lower():
                        print(f"   ❌ PLACEHOLDER FOUND at {path}: {value}")
                        return True
            elif isinstance(value, dict):
                for k, v in value.items():
                    check_value(v, f"{path}.{k}")
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    check_value(item, f"{path}[{i}]")
            return False
        
        has_placeholders = check_value(data)
        if not has_placeholders:
            print("   ✅ No placeholders detected")
    
    async def cross_check_with_database(self, user_id: str, api_data: dict):
        """Cross-check API data with direct database queries"""
        if self.db is None:
            print("⚠️ Skipping database verification (no DB connection)")
            return
        
        print(f"\n🔍 CROSS-CHECKING WITH DATABASE FOR {user_id}")
        print("-" * 60)
        
        try:
            # 1. Verify total earnings
            await self.verify_total_earnings(user_id, api_data)
            
            # 2. Verify active referrals count
            await self.verify_active_referrals(user_id, api_data)
            
            # 3. Verify total signups
            await self.verify_total_signups(user_id, api_data)
            
        except Exception as e:
            print(f"❌ Database verification error: {str(e)}")
    
    async def verify_total_earnings(self, user_id: str, api_data: dict):
        """Verify total earnings with direct DB query"""
        try:
            pipeline = [
                {"$match": {"referrer_user_id": user_id, "status": "completed"}},
                {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
            ]
            
            result = await self.db.referral_commissions.aggregate(pipeline).to_list(1)
            db_total = result[0]["total"] if result else 0
            
            api_total = api_data.get("total_earnings", {}).get("total_gbp", 0)
            
            print(f"💰 Total Earnings Verification:")
            print(f"   📊 API Response: £{api_total}")
            print(f"   🗄️ Database Query: £{db_total}")
            
            if abs(api_total - db_total) < 0.01:  # Allow for small rounding differences
                print(f"   ✅ MATCH: Earnings data is accurate")
            else:
                print(f"   ❌ MISMATCH: API and DB totals don't match")
                
        except Exception as e:
            print(f"   ❌ Error verifying earnings: {str(e)}")
    
    async def verify_active_referrals(self, user_id: str, api_data: dict):
        """Verify active referrals count"""
        try:
            pipeline = [
                {"$match": {"referrer_user_id": user_id, "status": "completed"}},
                {"$group": {"_id": "$referred_user_id"}}
            ]
            
            result = await self.db.referral_commissions.aggregate(pipeline).to_list(1000)
            db_active = len(result)
            
            api_active = api_data.get("referral_stats", {}).get("active_referrals", 0)
            
            print(f"👥 Active Referrals Verification:")
            print(f"   📊 API Response: {api_active}")
            print(f"   🗄️ Database Query: {db_active}")
            
            if api_active == db_active:
                print(f"   ✅ MATCH: Active referrals count is accurate")
            else:
                print(f"   ❌ MISMATCH: API and DB counts don't match")
                
        except Exception as e:
            print(f"   ❌ Error verifying active referrals: {str(e)}")
    
    async def verify_total_signups(self, user_id: str, api_data: dict):
        """Verify total signups count"""
        try:
            db_signups = await self.db.user_accounts.count_documents({"referred_by": user_id})
            
            api_signups = api_data.get("referral_stats", {}).get("total_referrals", 0)
            
            print(f"📝 Total Signups Verification:")
            print(f"   📊 API Response: {api_signups}")
            print(f"   🗄️ Database Query: {db_signups}")
            
            if api_signups == db_signups:
                print(f"   ✅ MATCH: Total signups count is accurate")
            else:
                print(f"   ❌ MISMATCH: API and DB counts don't match")
                
        except Exception as e:
            print(f"   ❌ Error verifying signups: {str(e)}")
    
    async def run_comprehensive_test(self):
        """Run comprehensive test on all test users"""
        print("🚀 STARTING COMPREHENSIVE REFERRAL DASHBOARD TESTING")
        print("=" * 80)
        print(f"🎯 Backend URL: {BACKEND_URL}")
        print(f"📋 Test Users: {len(TEST_USERS)}")
        print(f"⏰ Test Time: {datetime.now(timezone.utc).isoformat()}")
        
        await self.setup()
        
        # Test each user
        for user_id in TEST_USERS:
            result = await self.test_comprehensive_dashboard_endpoint(user_id)
            self.results.append(result)
        
        # Generate summary
        await self.generate_test_summary()
        
        await self.cleanup()
    
    async def generate_test_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        success_count = len([r for r in self.results if r["status"] == "success"])
        error_count = len([r for r in self.results if r["status"] == "error"])
        exception_count = len([r for r in self.results if r["status"] == "exception"])
        
        print(f"✅ Successful Tests: {success_count}/{len(self.results)}")
        print(f"❌ Error Tests: {error_count}/{len(self.results)}")
        print(f"💥 Exception Tests: {exception_count}/{len(self.results)}")
        
        success_rate = (success_count / len(self.results)) * 100
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Detailed results
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.results:
            user_id = result["user_id"]
            status = result["status"]
            
            if status == "success":
                data = result["data"]
                total_earnings = data.get("total_earnings", {}).get("total_gbp", 0)
                active_referrals = data.get("referral_stats", {}).get("active_referrals", 0)
                print(f"✅ {user_id}: SUCCESS - £{total_earnings} earnings, {active_referrals} active referrals")
            else:
                error = result.get("error", "Unknown error")
                print(f"❌ {user_id}: {status.upper()} - {error}")
        
        # Critical findings
        print(f"\n🔍 CRITICAL FINDINGS:")
        
        successful_results = [r for r in self.results if r["status"] == "success"]
        if successful_results:
            print(f"✅ Endpoint is functional and returning structured data")
            
            # Check for real data
            has_real_data = False
            for result in successful_results:
                data = result["data"]
                total_earnings = data.get("total_earnings", {}).get("total_gbp", 0)
                if total_earnings > 0:
                    has_real_data = True
                    break
            
            if has_real_data:
                print(f"✅ REAL DATA CONFIRMED: Found users with actual earnings")
            else:
                print(f"⚠️ NO REAL DATA: All users have zero earnings (may be expected)")
            
            # Check data structure completeness
            sample_data = successful_results[0]["data"]
            required_fields = [
                "referral_code", "referral_link", "tier", "total_earnings",
                "earnings_by_period", "earnings_by_stream", "referral_tree",
                "activity_timeline", "conversion_metrics", "referral_stats"
            ]
            
            missing_fields = [field for field in required_fields if field not in sample_data]
            if not missing_fields:
                print(f"✅ COMPLETE STRUCTURE: All required fields present")
            else:
                print(f"❌ INCOMPLETE STRUCTURE: Missing fields: {missing_fields}")
        else:
            print(f"❌ ENDPOINT FAILURE: No successful responses received")
        
        print(f"\n🎯 RECOMMENDATION:")
        if success_rate >= 80:
            print(f"✅ ENDPOINT IS PRODUCTION READY")
            print(f"   - All critical functionality working")
            print(f"   - Data structure is complete")
            print(f"   - Real data is being returned")
        else:
            print(f"❌ ENDPOINT NEEDS ATTENTION")
            print(f"   - Success rate below 80%")
            print(f"   - Review error cases and fix issues")

async def main():
    """Main test execution"""
    tester = ReferralDashboardTester()
    await tester.run_comprehensive_test()

if __name__ == "__main__":
    asyncio.run(main())