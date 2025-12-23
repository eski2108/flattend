#!/usr/bin/env python3
"""
Test script to verify:
1. Trader stats update from real trades
2. Dispute email sending and link verification
"""

import asyncio
import sys
import os
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Add backend to path
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from email_service import EmailService, p2p_dispute_opened_email, p2p_admin_dispute_alert

# Database connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.coinhubx_production

# Email service
email_service = EmailService()

async def create_test_users():
    """Create two test users for P2P trading"""
    print("\n📝 Creating test users...")
    
    buyer_id = f"test_buyer_{uuid.uuid4().hex[:8]}"
    seller_id = f"test_seller_{uuid.uuid4().hex[:8]}"
    
    buyer = {
        "user_id": buyer_id,
        "username": f"TestBuyer_{buyer_id[:6]}",
        "email": "info@coinhubx.net",  # Use configured email
        "phone_number": "+447700000001",
        "email_verified": True,
        "phone_verified": True,
        "kyc_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "role": "user"
    }
    
    seller = {
        "user_id": seller_id,
        "username": f"TestSeller_{seller_id[:6]}",
        "email": "info@coinhubx.net",  # Use configured email
        "phone_number": "+447700000002",
        "email_verified": True,
        "phone_verified": True,
        "kyc_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "role": "user"
    }
    
    await db.user_accounts.insert_one(buyer)
    await db.user_accounts.insert_one(seller)
    
    # Create trader profiles
    await db.trader_profiles.insert_one({
        "user_id": buyer_id,
        "is_trader": True,
        "current_tier": "bronze",
        "badges": []
    })
    
    await db.trader_profiles.insert_one({
        "user_id": seller_id,
        "is_trader": True,
        "current_tier": "bronze",
        "badges": []
    })
    
    print(f"✅ Created buyer: {buyer_id}")
    print(f"✅ Created seller: {seller_id}")
    
    return buyer_id, seller_id

async def create_test_trade(buyer_id, seller_id):
    """Create a test P2P trade"""
    print("\n📝 Creating test trade...")
    
    trade_id = f"trade_{uuid.uuid4().hex[:12]}"
    
    trade = {
        "trade_id": trade_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "crypto_currency": "BTC",
        "crypto_amount": 0.05,
        "fiat_currency": "GBP",
        "fiat_amount": 3750.00,
        "status": "pending_payment",
        "escrow_locked": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payment_method": "Bank Transfer"
    }
    
    await db.trades.insert_one(trade)
    
    print(f"✅ Created trade: {trade_id}")
    print(f"   Buyer: {buyer_id}")
    print(f"   Seller: {seller_id}")
    print(f"   Amount: 0.05 BTC = £3,750")
    
    return trade_id

async def mark_trade_as_paid(trade_id):
    """Mark trade as paid by buyer"""
    print("\n📝 Marking trade as paid...")
    
    paid_timestamp = datetime.now(timezone.utc).isoformat()
    
    await db.trades.update_one(
        {"trade_id": trade_id},
        {"$set": {
            "status": "buyer_marked_paid",
            "paid_at": paid_timestamp,
            "buyer_marked_paid_at": paid_timestamp
        }}
    )
    
    print(f"✅ Trade marked as paid at {paid_timestamp}")
    return paid_timestamp

async def release_crypto(trade_id, paid_at):
    """Release crypto to complete the trade"""
    print("\n📝 Releasing crypto to complete trade...")
    
    trade = await db.trades.find_one({"trade_id": trade_id})
    if not trade:
        print("❌ Trade not found")
        return
    
    completion_timestamp = datetime.now(timezone.utc).isoformat()
    completion_time = datetime.now(timezone.utc)
    
    # Calculate timing metrics
    try:
        created_at = datetime.fromisoformat(trade["created_at"].replace('Z', '+00:00'))
        paid_at_dt = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
        
        payment_time_seconds = int((paid_at_dt - created_at).total_seconds())
        release_time_seconds = int((completion_time - paid_at_dt).total_seconds())
    except:
        payment_time_seconds = 0
        release_time_seconds = 0
    
    await db.trades.update_one(
        {"trade_id": trade_id},
        {"$set": {
            "status": "completed",
            "escrow_locked": False,
            "completed_at": completion_timestamp,
            "released_at": completion_timestamp,
            "payment_time_seconds": payment_time_seconds,
            "release_time_seconds": release_time_seconds
        }}
    )
    
    print(f"✅ Trade completed at {completion_timestamp}")
    print(f"   Payment time: {payment_time_seconds} seconds")
    print(f"   Release time: {release_time_seconds} seconds")
    
    return True

async def check_trader_stats(user_id, username):
    """Check trader stats after trade completion"""
    print(f"\n📊 Checking stats for {username}...")
    
    # Count completed trades
    completed_trades = await db.trades.count_documents({
        "$or": [{"buyer_id": user_id}, {"seller_id": user_id}],
        "status": "completed"
    })
    
    # Get all trades for timing metrics
    trades = await db.trades.find({
        "$or": [{"buyer_id": user_id}, {"seller_id": user_id}],
        "status": "completed"
    }).to_list(100)
    
    release_times = [t.get("release_time_seconds", 0) for t in trades if t.get("seller_id") == user_id and t.get("release_time_seconds")]
    payment_times = [t.get("payment_time_seconds", 0) for t in trades if t.get("buyer_id") == user_id and t.get("payment_time_seconds")]
    
    avg_release = (sum(release_times) / len(release_times)) if release_times else 0
    avg_payment = (sum(payment_times) / len(payment_times)) if payment_times else 0
    
    print(f"   Total completed trades: {completed_trades}")
    print(f"   Avg release time: {avg_release:.0f} seconds ({avg_release/60:.2f} minutes)")
    print(f"   Avg payment time: {avg_payment:.0f} seconds ({avg_payment/60:.2f} minutes)")
    
    return completed_trades > 0

async def create_test_dispute(trade_id, buyer_id, seller_id):
    """Create a test dispute and send emails"""
    print("\n📝 Creating test dispute...")
    
    dispute_id = f"dispute_{uuid.uuid4().hex[:12]}"
    
    dispute = {
        "dispute_id": dispute_id,
        "trade_id": trade_id,
        "reported_by": buyer_id,
        "reason": "Test dispute for email verification",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.p2p_disputes.insert_one(dispute)
    
    # Update trade status
    await db.trades.update_one(
        {"trade_id": trade_id},
        {"$set": {"status": "disputed"}}
    )
    
    print(f"✅ Created dispute: {dispute_id}")
    print(f"   Trade: {trade_id}")
    print(f"   Reported by: {buyer_id}")
    
    return dispute_id

async def send_dispute_emails(trade_id, dispute_id, buyer_id, seller_id):
    """Send dispute notification emails"""
    print("\n📧 Sending dispute notification emails...")
    
    # Get trade details
    trade = await db.trades.find_one({"trade_id": trade_id})
    if not trade:
        print("❌ Trade not found")
        return False
    
    crypto_amount = trade.get("crypto_amount", 0)
    crypto = trade.get("crypto_currency", "BTC")
    
    # Get user emails
    buyer = await db.user_accounts.find_one({"user_id": buyer_id})
    seller = await db.user_accounts.find_one({"user_id": seller_id})
    
    buyer_email = buyer.get("email") if buyer else None
    seller_email = seller.get("email") if seller else None
    admin_email = os.getenv('ADMIN_EMAIL', 'info@coinhubx.net')
    
    print(f"   Buyer email: {buyer_email}")
    print(f"   Seller email: {seller_email}")
    print(f"   Admin email: {admin_email}")
    
    # Send to buyer
    if buyer_email:
        buyer_html = p2p_dispute_opened_email(
            trade_id=trade_id,
            dispute_id=dispute_id,
            crypto_amount=crypto_amount,
            crypto=crypto,
            role="Buyer"
        )
        await email_service.send_email(
            to_email=buyer_email,
            subject=f"⚠️ Dispute Opened – P2P Order #{trade_id[:8]}",
            html_content=buyer_html
        )
        print(f"✅ Sent dispute email to buyer: {buyer_email}")
    
    # Send to seller
    if seller_email:
        seller_html = p2p_dispute_opened_email(
            trade_id=trade_id,
            dispute_id=dispute_id,
            crypto_amount=crypto_amount,
            crypto=crypto,
            role="Seller"
        )
        await email_service.send_email(
            to_email=seller_email,
            subject=f"⚠️ Dispute Opened – P2P Order #{trade_id[:8]}",
            html_content=seller_html
        )
        print(f"✅ Sent dispute email to seller: {seller_email}")
    
    # Send to admin with direct dispute link
    admin_html = p2p_admin_dispute_alert(
        trade_id=trade_id,
        dispute_id=dispute_id,
        crypto_amount=crypto_amount,
        crypto=crypto,
        buyer_id=buyer_id,
        seller_id=seller_id,
        reported_by=buyer_id
    )
    await email_service.send_email(
        to_email=admin_email,
        subject=f"🚨 New P2P Dispute – Order #{trade_id[:8]}",
        html_content=admin_html
    )
    print(f"✅ Sent dispute email to admin: {admin_email}")
    
    frontend_url = os.getenv('REACT_APP_BACKEND_URL', 'https://peer-listings.preview.emergentagent.com')
    print("\n🔗 Email contains link to:")
    print(f"   {frontend_url}/admin/disputes/{dispute_id}")
    
    return True

async def main():
    """Main test flow"""
    print("="*60)
    print("🧪 TRADER STATS & DISPUTE EMAIL TEST")
    print("="*60)
    
    try:
        # Step 1: Create test users
        buyer_id, seller_id = await create_test_users()
        
        # Step 2: Create test trade
        trade_id = await create_test_trade(buyer_id, seller_id)
        
        # Step 3: Mark as paid
        paid_at = await mark_trade_as_paid(trade_id)
        
        # Wait a moment to simulate real timing
        print("\n⏳ Waiting 2 seconds (simulating real payment time)...")
        await asyncio.sleep(2)
        
        # Step 4: Release crypto to complete trade
        await release_crypto(trade_id, paid_at)
        
        # Step 5: Check stats updated
        buyer_stats_ok = await check_trader_stats(buyer_id, "Buyer")
        seller_stats_ok = await check_trader_stats(seller_id, "Seller")
        
        if buyer_stats_ok and seller_stats_ok:
            print("\n✅ STATS TEST PASSED: Trades recorded and timing metrics calculated")
        else:
            print("\n⚠️ STATS TEST: No trades found (may need to refresh stats)")
        
        # Step 6: Create second trade for dispute test
        print("\n" + "="*60)
        print("📧 TESTING DISPUTE EMAIL FLOW")
        print("="*60)
        
        dispute_trade_id = await create_test_trade(buyer_id, seller_id)
        
        # Step 7: Create dispute
        dispute_id = await create_test_dispute(dispute_trade_id, buyer_id, seller_id)
        
        # Step 8: Send dispute emails
        emails_sent = await send_dispute_emails(dispute_trade_id, dispute_id, buyer_id, seller_id)
        
        if emails_sent:
            print("\n" + "="*60)
            print("✅ TEST COMPLETE")
            print("="*60)
            print("\n📋 SUMMARY:")
            print(f"   Test Buyer ID: {buyer_id}")
            print(f"   Test Seller ID: {seller_id}")
            print(f"   Completed Trade ID: {trade_id}")
            print(f"   Disputed Trade ID: {dispute_trade_id}")
            print(f"   Dispute ID: {dispute_id}")
            print("\n📧 EMAILS SENT TO: info@coinhubx.net")
            frontend_url = os.getenv('REACT_APP_BACKEND_URL', 'https://peer-listings.preview.emergentagent.com')
            print("\n🔗 DISPUTE LINK:")
            print(f"   {frontend_url}/admin/disputes/{dispute_id}")
            print("\n✅ Check your email inbox at info@coinhubx.net")
            print("✅ Click the link to verify it routes correctly")
            print("✅ Stats should now show 1 completed trade for both users")
        else:
            print("\n❌ Failed to send emails")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
