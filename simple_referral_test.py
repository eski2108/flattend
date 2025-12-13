#!/usr/bin/env python3
"""
Simple test of the referral dashboard endpoint
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone

BACKEND_URL = "https://fund-release-1.preview.emergentagent.com"

async def test_referral_endpoint():
    """Test the referral dashboard endpoint"""
    
    # Test with existing user
    user_id = "80a4a694-a6a4-4f84-94a3-1e5cad51eaf3"
    endpoint = f"{BACKEND_URL}/api/referral/dashboard/comprehensive/{user_id}"
    
    print(f"🎯 Testing referral dashboard endpoint")
    print(f"📡 URL: {endpoint}")
    print(f"👤 User ID: {user_id}")
    print("=" * 80)
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(endpoint) as response:
                status = response.status
                print(f"📊 Status Code: {status}")
                
                if status == 200:
                    data = await response.json()
                    print(f"✅ Response received successfully")
                    
                    # Print the full response
                    print(f"\n📋 Full Response:")
                    print(json.dumps(data, indent=2, default=str))
                    
                    # Analyze key fields
                    print(f"\n🔍 Key Analysis:")
                    success = data.get("success", False)
                    print(f"   Success: {success}")
                    
                    if success:
                        print(f"   Referral Code: {data.get('referral_code')}")
                        print(f"   Referral Link: {data.get('referral_link')}")
                        print(f"   Tier: {data.get('tier')}")
                        
                        total_earnings = data.get('total_earnings', {})
                        print(f"   Total Earnings: £{total_earnings.get('total_gbp', 0)}")
                        
                        referral_stats = data.get('referral_stats', {})
                        print(f"   Active Referrals: {referral_stats.get('active_referrals', 0)}")
                        print(f"   Pending Signups: {referral_stats.get('pending_signups', 0)}")
                        print(f"   Total Referrals: {referral_stats.get('total_referrals', 0)}")
                        
                        # Check for real data
                        has_real_data = (
                            total_earnings.get('total_gbp', 0) > 0 or
                            referral_stats.get('total_referrals', 0) > 0
                        )
                        
                        print(f"\n🎯 Data Assessment:")
                        if has_real_data:
                            print(f"   ✅ REAL DATA DETECTED")
                        else:
                            print(f"   ⚠️ NO ACTIVITY DATA (user may have no referrals)")
                        
                        # Check structure completeness
                        required_fields = [
                            'referral_code', 'referral_link', 'tier', 'total_earnings',
                            'earnings_by_period', 'earnings_by_stream', 'referral_tree',
                            'activity_timeline', 'conversion_metrics', 'referral_stats',
                            'tier_progress'
                        ]
                        
                        missing_fields = [f for f in required_fields if f not in data]
                        if not missing_fields:
                            print(f"   ✅ ALL REQUIRED FIELDS PRESENT")
                        else:
                            print(f"   ❌ MISSING FIELDS: {missing_fields}")
                    
                    else:
                        error = data.get('error', 'Unknown error')
                        print(f"   ❌ API Error: {error}")
                
                else:
                    error_text = await response.text()
                    print(f"❌ HTTP Error {status}: {error_text}")
                    
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_referral_endpoint())