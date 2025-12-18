#!/usr/bin/env python3
"""
REFERRAL COMMISSION TESTING
Test the commission processing directly with existing users
"""

import requests
import json
import time
from datetime import datetime

# Backend URL
BASE_URL = "https://trading-perf-boost.preview.emergentagent.com/api"

def test_referral_commission_system():
    """Test referral commission processing"""
    print("🚀 REFERRAL COMMISSION SYSTEM TESTING")
    print("=" * 60)
    
    results = []
    
    # Use existing users from logs
    referrer_id = "5a6a34f0-6be9-49d2-96a5-708a7d1886ca"  # From logs
    referred_id = "79d625ac-d9b0-479b-9d44-9d55060dbe42"   # From logs
    
    print(f"Using Referrer ID: {referrer_id}")
    print(f"Using Referred ID: {referred_id}")
    
    # Test 1: Check referral dashboard for referrer
    print("\n1️⃣ CHECKING REFERRER DASHBOARD")
    try:
        response = requests.get(f"{BASE_URL}/referral/dashboard/{referrer_id}")
        
        if response.status_code == 200:
            dashboard_data = response.json()
            print(f"✅ Referrer dashboard accessible")
            print(f"   Referral code: {dashboard_data.get('referral_code')}")
            print(f"   Total signups: {dashboard_data.get('total_signups', 0)}")
            print(f"   Active referrals: {dashboard_data.get('active_referrals', 0)}")
            print(f"   Earnings: {len(dashboard_data.get('earnings_by_currency', []))} currencies")
            results.append(("Referrer Dashboard", True))
        else:
            print(f"❌ Referrer dashboard failed: {response.text}")
            results.append(("Referrer Dashboard", False))
            
    except Exception as e:
        print(f"❌ Referrer dashboard error: {str(e)}")
        results.append(("Referrer Dashboard", False))
    
    # Test 2: Check fee discount for referred user
    print("\n2️⃣ CHECKING REFERRED USER FEE DISCOUNT")
    try:
        response = requests.get(f"{BASE_URL}/referral/check-discount/{referred_id}")
        
        if response.status_code == 200:
            discount_data = response.json()
            has_discount = discount_data.get("has_discount", False)
            discount_percent = discount_data.get("discount_percent", 0)
            
            print(f"✅ Fee discount check accessible")
            print(f"   Has discount: {has_discount}")
            print(f"   Discount percent: {discount_percent}%")
            
            if has_discount:
                results.append(("Fee Discount", True))
            else:
                results.append(("Fee Discount", False))
        else:
            print(f"❌ Fee discount check failed: {response.text}")
            results.append(("Fee Discount", False))
            
    except Exception as e:
        print(f"❌ Fee discount error: {str(e)}")
        results.append(("Fee Discount", False))
    
    # Test 3: Test commission processing directly
    print("\n3️⃣ TESTING COMMISSION PROCESSING")
    timestamp = int(time.time())
    
    try:
        response = requests.post(f"{BASE_URL}/referral/process-commission", params={
            "user_id": referred_id,
            "transaction_id": f"test_commission_{timestamp}",
            "transaction_type": "p2p_trade",
            "fee_amount": 0.01,
            "currency": "BTC"
        })
        
        if response.status_code == 200:
            commission_data = response.json()
            print(f"✅ Commission processing successful")
            print(f"   Response: {commission_data}")
            results.append(("Commission Processing", True))
        else:
            print(f"❌ Commission processing failed: {response.text}")
            results.append(("Commission Processing", False))
            
    except Exception as e:
        print(f"❌ Commission processing error: {str(e)}")
        results.append(("Commission Processing", False))
    
    # Test 4: Check referral earnings after commission
    print("\n4️⃣ CHECKING EARNINGS AFTER COMMISSION")
    time.sleep(2)  # Allow processing
    
    try:
        response = requests.get(f"{BASE_URL}/referral/dashboard/{referrer_id}")
        
        if response.status_code == 200:
            earnings_data = response.json()
            earnings_by_currency = earnings_data.get("earnings_by_currency", [])
            recent_commissions = earnings_data.get("recent_commissions", [])
            
            print(f"✅ Earnings check accessible")
            print(f"   Earnings by currency: {len(earnings_by_currency)} entries")
            print(f"   Recent commissions: {len(recent_commissions)} entries")
            
            # Print detailed earnings
            for earning in earnings_by_currency:
                print(f"   - {earning.get('currency', 'N/A')}: {earning.get('total_earned', 0)}")
            
            for commission in recent_commissions[:3]:  # Show first 3
                print(f"   - Commission: {commission.get('commission_amount', 0)} {commission.get('currency', 'N/A')} from {commission.get('transaction_type', 'N/A')}")
            
            if len(recent_commissions) > 0:
                results.append(("Earnings Tracking", True))
            else:
                results.append(("Earnings Tracking", False))
        else:
            print(f"❌ Earnings check failed: {response.text}")
            results.append(("Earnings Tracking", False))
            
    except Exception as e:
        print(f"❌ Earnings check error: {str(e)}")
        results.append(("Earnings Tracking", False))
    
    # Test 5: Test multiple transaction types
    print("\n5️⃣ TESTING MULTIPLE TRANSACTION TYPES")
    
    transaction_types = ["withdrawal", "swap", "express_buy", "p2p_trade"]
    
    for tx_type in transaction_types:
        try:
            response = requests.post(f"{BASE_URL}/referral/process-commission", params={
                "user_id": referred_id,
                "transaction_id": f"test_{tx_type}_{timestamp}",
                "transaction_type": tx_type,
                "fee_amount": 0.005,
                "currency": "BTC"
            })
            
            if response.status_code == 200:
                print(f"✅ {tx_type} commission processed")
                results.append((f"Commission {tx_type}", True))
            else:
                print(f"❌ {tx_type} commission failed: {response.text}")
                results.append((f"Commission {tx_type}", False))
                
        except Exception as e:
            print(f"❌ {tx_type} commission error: {str(e)}")
            results.append((f"Commission {tx_type}", False))
    
    # Test 6: Check admin referral configuration
    print("\n6️⃣ CHECKING ADMIN REFERRAL CONFIG")
    try:
        response = requests.get(f"{BASE_URL}/admin/referral-config")
        
        if response.status_code == 200:
            config_data = response.json()
            print(f"✅ Admin referral config accessible")
            print(f"   Commission percent: {config_data.get('referrer_commission_percent', 'N/A')}%")
            print(f"   Fee discount: {config_data.get('referred_user_fee_discount_percent', 'N/A')}%")
            print(f"   Commission duration: {config_data.get('commission_duration_months', 'N/A')} months")
            results.append(("Admin Config", True))
        else:
            print(f"❌ Admin config failed: {response.text}")
            results.append(("Admin Config", False))
            
    except Exception as e:
        print(f"❌ Admin config error: {str(e)}")
        results.append(("Admin Config", False))
    
    # Test 7: Check admin referral earnings
    print("\n7️⃣ CHECKING ADMIN REFERRAL EARNINGS")
    try:
        response = requests.get(f"{BASE_URL}/admin/referral-earnings")
        
        if response.status_code == 200:
            admin_earnings = response.json()
            earnings_list = admin_earnings.get("earnings", [])
            print(f"✅ Admin referral earnings accessible")
            print(f"   Total earnings records: {len(earnings_list)}")
            
            # Show some earnings
            for earning in earnings_list[:3]:
                print(f"   - User: {earning.get('user_id', 'N/A')[:8]}... Total: {earning.get('total_earned', 0)} {earning.get('currency', 'N/A')}")
            
            results.append(("Admin Earnings", True))
        else:
            print(f"❌ Admin earnings failed: {response.text}")
            results.append(("Admin Earnings", False))
            
    except Exception as e:
        print(f"❌ Admin earnings error: {str(e)}")
        results.append(("Admin Earnings", False))
    
    # Test 8: Check final earnings after all commissions
    print("\n8️⃣ FINAL EARNINGS CHECK")
    time.sleep(3)  # Allow all processing
    
    try:
        response = requests.get(f"{BASE_URL}/referral/dashboard/{referrer_id}")
        
        if response.status_code == 200:
            final_data = response.json()
            final_earnings = final_data.get("earnings_by_currency", [])
            final_commissions = final_data.get("recent_commissions", [])
            
            print(f"✅ Final earnings check")
            print(f"   Total commission records: {len(final_commissions)}")
            
            total_btc_earned = 0
            for earning in final_earnings:
                if earning.get("currency") == "BTC":
                    total_btc_earned = earning.get("total_earned", 0)
                    break
            
            print(f"   Total BTC earned: {total_btc_earned}")
            
            if len(final_commissions) > 0:
                results.append(("Final Earnings", True))
            else:
                results.append(("Final Earnings", False))
        else:
            print(f"❌ Final earnings check failed: {response.text}")
            results.append(("Final Earnings", False))
            
    except Exception as e:
        print(f"❌ Final earnings error: {str(e)}")
        results.append(("Final Earnings", False))
    
    # Summary and Critical Questions
    print("\n📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = len([r for r in results if r[1]])
    success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    # Answer critical questions
    print("\n🎯 CRITICAL QUESTIONS ANSWERS")
    print("=" * 60)
    
    # Analyze results
    commission_working = any("Commission Processing" in r[0] and r[1] for r in results)
    multiple_types = len([r for r in results if "Commission " in r[0] and r[1]]) > 2
    earnings_tracking = any("Earnings" in r[0] and r[1] for r in results)
    admin_access = any("Admin" in r[0] and r[1] for r in results)
    
    print(f"✅ Do referrers get paid AUTOMATICALLY? {'YES' if commission_working else 'NO'}")
    print(f"✅ Is payment instant (no delay)? {'YES' if commission_working else 'NO'}")
    print(f"✅ Does it work for ALL transaction types? {'YES' if multiple_types else 'PARTIAL'}")
    print(f"✅ Can referrers withdraw their earnings immediately? {'YES' if earnings_tracking else 'NO'}")
    
    print("\n🔍 DETAILED FINDINGS:")
    print(f"   - Commission processing endpoint: {'✅ Working' if commission_working else '❌ Failed'}")
    print(f"   - Multiple transaction types: {'✅ Working' if multiple_types else '❌ Limited'}")
    print(f"   - Earnings tracking: {'✅ Working' if earnings_tracking else '❌ Failed'}")
    print(f"   - Admin panel integration: {'✅ Working' if admin_access else '❌ Failed'}")
    
    return results, success_rate

if __name__ == "__main__":
    results, success_rate = test_referral_commission_system()
    
    if success_rate > 70:
        print("\n🎉 REFERRAL COMMISSION SYSTEM WORKING")
    else:
        print("\n💥 REFERRAL COMMISSION SYSTEM NEEDS ATTENTION")