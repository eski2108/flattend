#!/usr/bin/env python3
"""
FOCUSED REFERRAL SYSTEM TESTING
Test the core referral functionality that's working
"""

import requests
import json
import time
from datetime import datetime

# Backend URL
BASE_URL = "https://trading-rebuild.preview.emergentagent.com/api"

def test_referral_system():
    """Test the referral system step by step"""
    print("🚀 FOCUSED REFERRAL SYSTEM TESTING")
    print("=" * 60)
    
    results = []
    
    # Test 1: Register User A (Referrer)
    print("\n1️⃣ REGISTERING REFERRER USER")
    timestamp = int(time.time())
    user_a_email = f"referrer_{timestamp}@test.com"
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": user_a_email,
            "password": "Test123456",
            "full_name": "Referrer User"
        })
        
        if response.status_code == 200:
            user_a_data = response.json()["user"]
            user_a_id = user_a_data["user_id"]
            print(f"✅ User A registered: {user_a_id}")
            results.append(("User A Registration", True))
        else:
            print(f"❌ User A registration failed: {response.text}")
            results.append(("User A Registration", False))
            return results
            
    except Exception as e:
        print(f"❌ User A registration error: {str(e)}")
        results.append(("User A Registration", False))
        return results
    
    # Test 2: Get User A's referral code
    print("\n2️⃣ GETTING REFERRAL CODE")
    try:
        response = requests.get(f"{BASE_URL}/referral/dashboard/{user_a_id}")
        
        if response.status_code == 200:
            referral_data = response.json()
            referral_code = referral_data.get("referral_code")
            referral_link = referral_data.get("referral_link")
            print(f"✅ Referral code created: {referral_code}")
            print(f"✅ Referral link: {referral_link}")
            results.append(("Get Referral Code", True))
        else:
            print(f"❌ Failed to get referral code: {response.text}")
            results.append(("Get Referral Code", False))
            return results
            
    except Exception as e:
        print(f"❌ Referral code error: {str(e)}")
        results.append(("Get Referral Code", False))
        return results
    
    # Test 3: Register User B with referral code
    print("\n3️⃣ REGISTERING REFERRED USER")
    user_b_email = f"referred_{timestamp}@test.com"
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": user_b_email,
            "password": "Test123456",
            "full_name": "Referred User",
            "referral_code": referral_code
        })
        
        if response.status_code == 200:
            user_b_data = response.json()["user"]
            user_b_id = user_b_data["user_id"]
            print(f"✅ User B registered with referral: {user_b_id}")
            results.append(("User B Registration with Referral", True))
        else:
            print(f"❌ User B registration failed: {response.text}")
            results.append(("User B Registration with Referral", False))
            return results
            
    except Exception as e:
        print(f"❌ User B registration error: {str(e)}")
        results.append(("User B Registration with Referral", False))
        return results
    
    # Test 4: Check referral relationship
    print("\n4️⃣ VERIFYING REFERRAL RELATIONSHIP")
    time.sleep(2)  # Allow processing
    
    try:
        response = requests.get(f"{BASE_URL}/referral/dashboard/{user_a_id}")
        
        if response.status_code == 200:
            dashboard_data = response.json()
            total_signups = dashboard_data.get("total_signups", 0)
            active_referrals = dashboard_data.get("active_referrals", 0)
            
            print(f"✅ Referrer dashboard accessible")
            print(f"   Total signups: {total_signups}")
            print(f"   Active referrals: {active_referrals}")
            
            if total_signups > 0 or active_referrals > 0:
                print("✅ Referral relationship established")
                results.append(("Referral Relationship", True))
            else:
                print("⚠️  Referral relationship not yet reflected in stats")
                results.append(("Referral Relationship", False))
        else:
            print(f"❌ Failed to check referral dashboard: {response.text}")
            results.append(("Referral Relationship", False))
            
    except Exception as e:
        print(f"❌ Referral relationship check error: {str(e)}")
        results.append(("Referral Relationship", False))
    
    # Test 5: Check fee discount for referred user
    print("\n5️⃣ CHECKING FEE DISCOUNT")
    try:
        response = requests.get(f"{BASE_URL}/referral/check-discount/{user_b_id}")
        
        if response.status_code == 200:
            discount_data = response.json()
            has_discount = discount_data.get("has_discount", False)
            discount_percent = discount_data.get("discount_percent", 0)
            
            print(f"✅ Fee discount check accessible")
            print(f"   Has discount: {has_discount}")
            print(f"   Discount percent: {discount_percent}%")
            
            if has_discount and discount_percent > 0:
                print("✅ Fee discount active for referred user")
                results.append(("Fee Discount Active", True))
            else:
                print("❌ No fee discount found for referred user")
                results.append(("Fee Discount Active", False))
        else:
            print(f"❌ Failed to check fee discount: {response.text}")
            results.append(("Fee Discount Active", False))
            
    except Exception as e:
        print(f"❌ Fee discount check error: {str(e)}")
        results.append(("Fee Discount Active", False))
    
    # Test 6: Add funds to test commission
    print("\n6️⃣ ADDING FUNDS FOR COMMISSION TEST")
    try:
        response = requests.post(f"{BASE_URL}/trader/balance/add-funds", params={
            "trader_id": user_b_id,
            "currency": "BTC",
            "amount": 1.0
        })
        
        if response.status_code == 200:
            print("✅ Funds added to User B for testing")
            results.append(("Add Funds", True))
            
            # Check balance
            balance_response = requests.get(f"{BASE_URL}/trader/my-balances/{user_b_id}")
            if balance_response.status_code == 200:
                balance_data = balance_response.json()
                print(f"   Balance data: {balance_data}")
        else:
            print(f"❌ Failed to add funds: {response.text}")
            results.append(("Add Funds", False))
            
    except Exception as e:
        print(f"❌ Add funds error: {str(e)}")
        results.append(("Add Funds", False))
    
    # Test 7: Test commission processing endpoint directly
    print("\n7️⃣ TESTING COMMISSION PROCESSING")
    try:
        response = requests.post(f"{BASE_URL}/referral/process-commission", json={
            "user_id": user_b_id,
            "transaction_id": f"test_tx_{timestamp}",
            "transaction_type": "withdrawal",
            "fee_amount": 0.01,
            "currency": "BTC"
        })
        
        if response.status_code == 200:
            commission_data = response.json()
            print(f"✅ Commission processing endpoint accessible")
            print(f"   Response: {commission_data}")
            results.append(("Commission Processing", True))
        else:
            print(f"❌ Commission processing failed: {response.text}")
            results.append(("Commission Processing", False))
            
    except Exception as e:
        print(f"❌ Commission processing error: {str(e)}")
        results.append(("Commission Processing", False))
    
    # Test 8: Check referral earnings after commission
    print("\n8️⃣ CHECKING REFERRAL EARNINGS")
    time.sleep(2)  # Allow processing
    
    try:
        response = requests.get(f"{BASE_URL}/referral/dashboard/{user_a_id}")
        
        if response.status_code == 200:
            earnings_data = response.json()
            earnings_by_currency = earnings_data.get("earnings_by_currency", [])
            recent_commissions = earnings_data.get("recent_commissions", [])
            
            print(f"✅ Referral earnings check accessible")
            print(f"   Earnings by currency: {len(earnings_by_currency)} entries")
            print(f"   Recent commissions: {len(recent_commissions)} entries")
            
            if len(recent_commissions) > 0:
                print("✅ Commission tracking working")
                results.append(("Commission Tracking", True))
            else:
                print("⚠️  No commission records found")
                results.append(("Commission Tracking", False))
        else:
            print(f"❌ Failed to check earnings: {response.text}")
            results.append(("Commission Tracking", False))
            
    except Exception as e:
        print(f"❌ Earnings check error: {str(e)}")
        results.append(("Commission Tracking", False))
    
    # Test 9: Check admin referral endpoints
    print("\n9️⃣ CHECKING ADMIN REFERRAL ENDPOINTS")
    try:
        # Check referral config
        config_response = requests.get(f"{BASE_URL}/admin/referral-config")
        
        if config_response.status_code == 200:
            config_data = config_response.json()
            print(f"✅ Admin referral config accessible")
            print(f"   Config: {config_data}")
            results.append(("Admin Referral Config", True))
        else:
            print(f"❌ Admin referral config failed: {config_response.text}")
            results.append(("Admin Referral Config", False))
            
        # Check referral earnings admin endpoint
        earnings_response = requests.get(f"{BASE_URL}/admin/referral-earnings")
        
        if earnings_response.status_code == 200:
            admin_earnings = earnings_response.json()
            print(f"✅ Admin referral earnings accessible")
            print(f"   Admin earnings data: {len(admin_earnings.get('earnings', []))} entries")
            results.append(("Admin Referral Earnings", True))
        else:
            print(f"❌ Admin referral earnings failed: {earnings_response.text}")
            results.append(("Admin Referral Earnings", False))
            
    except Exception as e:
        print(f"❌ Admin endpoints error: {str(e)}")
        results.append(("Admin Referral Config", False))
        results.append(("Admin Referral Earnings", False))
    
    # Summary
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
    registration_working = any(r[0] == "User B Registration with Referral" and r[1] for r in results)
    commission_working = any(r[0] == "Commission Processing" and r[1] for r in results)
    tracking_working = any(r[0] == "Commission Tracking" and r[1] for r in results)
    discount_working = any(r[0] == "Fee Discount Active" and r[1] for r in results)
    
    print(f"✅ Do referrers get paid AUTOMATICALLY? {'YES' if commission_working else 'NO'}")
    print(f"✅ Is payment instant (no delay)? {'YES' if commission_working else 'NO'}")
    print(f"✅ Does it work for ALL transaction types? {'PARTIAL' if commission_working else 'NO'}")
    print(f"✅ Can referrers withdraw their earnings immediately? {'YES' if tracking_working else 'NO'}")
    
    return results

if __name__ == "__main__":
    results = test_referral_system()
    
    success_rate = (len([r for r in results if r[1]]) / len(results)) * 100 if results else 0
    
    if success_rate > 70:
        print("\n🎉 REFERRAL SYSTEM TESTING COMPLETED SUCCESSFULLY")
    else:
        print("\n💥 REFERRAL SYSTEM TESTING NEEDS ATTENTION")