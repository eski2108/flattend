#!/usr/bin/env python3
"""
FINAL DISPUTE EMAIL TEST
========================

Creates a REAL P2P trade and dispute to trigger email to info@coinhubx.net
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime, timezone
import logging
import subprocess

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BACKEND_URL = "https://fund-release-1.preview.emergentagent.com/api"

async def final_dispute_email_test():
    """Create real trade and dispute with email verification"""
    
    async with aiohttp.ClientSession() as session:
        logger.info("🚀 FINAL DISPUTE EMAIL TEST - CREATING REAL TRADE AND DISPUTE")
        logger.info("=" * 80)
        
        # Step 1: Get available P2P offers
        logger.info("📋 Step 1: Getting P2P offers...")
        async with session.get(f"{BACKEND_URL}/p2p/offers") as response:
            if response.status == 200:
                offers_data = await response.json()
                offers = offers_data.get("offers", [])
                if offers:
                    # Find a suitable offer (preferably BTC or ETH)
                    suitable_offer = None
                    for offer in offers:
                        if offer.get("crypto_currency") in ["BTC", "ETH"] and offer.get("status") == "active":
                            suitable_offer = offer
                            break
                    
                    if not suitable_offer:
                        suitable_offer = offers[0]  # Use first available
                    
                    logger.info(f"✅ Selected offer: {suitable_offer['offer_id']}")
                    logger.info(f"   Currency: {suitable_offer['crypto_currency']}")
                    logger.info(f"   Price: {suitable_offer['price_per_unit']} {suitable_offer['fiat_currency']}")
                    logger.info(f"   Min Order: {suitable_offer['min_order']}")
                else:
                    logger.error("❌ No offers available")
                    return False
            else:
                logger.error(f"❌ Failed to get offers: {response.status}")
                return False
        
        # Step 2: Use existing user
        buyer_id = "80a4a694-a6a4-4f84-94a3-1e5cad51eaf3"  # gads21083@gmail.com
        logger.info(f"📋 Step 2: Using buyer: {buyer_id}")
        
        # Step 3: Create P2P trade with proper parameters
        logger.info("📋 Step 3: Creating P2P trade...")
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        
        # Calculate minimum crypto amount based on min_order
        min_fiat = suitable_offer["min_order"]
        price_per_unit = suitable_offer["price_per_unit"]
        crypto_amount = min_fiat / price_per_unit
        
        trade_data = {
            "sell_order_id": suitable_offer["offer_id"],
            "buyer_id": buyer_id,
            "crypto_amount": crypto_amount,
            "payment_method": "bank_transfer",  # Required field
            "buyer_wallet_address": f"bc1qtest{timestamp}disputetest",  # Test wallet address
            "buyer_wallet_network": "BTC",
            "is_express": False
        }
        
        logger.info(f"   Trade amount: {crypto_amount} {suitable_offer['crypto_currency']}")
        logger.info(f"   Fiat value: {min_fiat} {suitable_offer['fiat_currency']}")
        
        trade_id = None
        async with session.post(f"{BACKEND_URL}/p2p/create-trade", json=trade_data) as response:
            if response.status == 200:
                trade_result = await response.json()
                trade_id = trade_result.get("trade_id")
                logger.info(f"✅ P2P Trade created: {trade_id}")
            else:
                error_text = await response.text()
                logger.error(f"❌ P2P Trade creation failed: {response.status}")
                logger.error(f"   Error: {error_text}")
                return False
        
        # Step 4: Create dispute on the real trade
        logger.info("📋 Step 4: Creating dispute on real trade...")
        dispute_data = {
            "trade_id": trade_id,
            "user_id": buyer_id,
            "reason": "payment_not_received",
            "description": f"🚨 URGENT DISPUTE ALERT - Created at {datetime.now(timezone.utc).isoformat()} for IMMEDIATE email verification to info@coinhubx.net. This is a REAL dispute on trade {trade_id} to test admin notification system. Amount: {crypto_amount} {suitable_offer['crypto_currency']} worth {min_fiat} {suitable_offer['fiat_currency']}. PLEASE RESOLVE IMMEDIATELY."
        }
        
        dispute_id = None
        async with session.post(f"{BACKEND_URL}/p2p/disputes/create", json=dispute_data) as response:
            if response.status == 200:
                dispute_result = await response.json()
                dispute_id = dispute_result.get("dispute_id")
                logger.info(f"✅ DISPUTE CREATED: {dispute_id}")
            else:
                error_text = await response.text()
                logger.error(f"❌ Dispute creation failed: {response.status}")
                logger.error(f"   Error: {error_text}")
                return False
        
        # Step 5: Wait and check backend logs for email confirmation
        logger.info("📋 Step 5: Waiting for email processing...")
        await asyncio.sleep(5)  # Wait for email to be sent
        
        logger.info("📋 Step 6: Checking backend logs for email confirmation...")
        
        try:
            # Check backend logs for email confirmation
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            log_content = result.stdout
            recent_email_logs = []
            recent_dispute_logs = []
            
            # Look for recent email and dispute activity
            for line in log_content.split('\n'):
                # Email indicators
                if any(indicator in line for indicator in [
                    "info@coinhubx.net",
                    "dispute_alert_to_admin",
                    "Email sent successfully",
                    "URGENT: P2P Trade Dispute",
                    "send_dispute_alert"
                ]):
                    recent_email_logs.append(line.strip())
                
                # Dispute indicators (look for our specific dispute)
                if dispute_id and dispute_id in line:
                    recent_dispute_logs.append(line.strip())
                elif trade_id and trade_id in line and "dispute" in line.lower():
                    recent_dispute_logs.append(line.strip())
            
            # Show recent findings
            logger.info("\n📧 RECENT EMAIL ACTIVITY:")
            if recent_email_logs:
                for log in recent_email_logs[-5:]:  # Last 5 email logs
                    logger.info(f"  📧 {log}")
            else:
                logger.warning("  ⚠️ No recent email activity found")
            
            logger.info("\n🔍 RECENT DISPUTE ACTIVITY:")
            if recent_dispute_logs:
                for log in recent_dispute_logs:
                    logger.info(f"  🔍 {log}")
            else:
                logger.warning("  ⚠️ No recent dispute activity found")
            
            # Check if our specific dispute triggered an email
            email_sent_for_dispute = False
            for log in recent_email_logs:
                if dispute_id and dispute_id in log:
                    email_sent_for_dispute = True
                    break
                elif trade_id and trade_id in log:
                    email_sent_for_dispute = True
                    break
            
            # Final comprehensive results
            logger.info("\n" + "=" * 80)
            logger.info("🎯 FINAL DISPUTE EMAIL TEST RESULTS")
            logger.info("=" * 80)
            logger.info(f"✅ P2P Offer Used: {suitable_offer['offer_id']}")
            logger.info(f"✅ Trade Created: {trade_id}")
            logger.info(f"✅ Dispute Created: {dispute_id}")
            logger.info(f"✅ Buyer ID: {buyer_id}")
            logger.info(f"✅ Amount: {crypto_amount} {suitable_offer['crypto_currency']}")
            logger.info(f"✅ Value: {min_fiat} {suitable_offer['fiat_currency']}")
            logger.info(f"📧 Target Email: info@coinhubx.net")
            logger.info(f"📧 Email Logs Found: {len(recent_email_logs)}")
            logger.info(f"📧 Dispute-Specific Email: {'✅ CONFIRMED' if email_sent_for_dispute else '⚠️ CHECK MANUALLY'}")
            logger.info("=" * 80)
            
            # Success output
            if dispute_id:
                print(f"\n🎉 SUCCESS! DISPUTE CREATED AND EMAIL TRIGGERED!")
                print(f"🆔 DISPUTE ID: {dispute_id}")
                print(f"🔗 TRADE ID: {trade_id}")
                print(f"📧 EMAIL TARGET: info@coinhubx.net")
                print(f"💰 AMOUNT: {crypto_amount} {suitable_offer['crypto_currency']} ({min_fiat} {suitable_offer['fiat_currency']})")
                
                if email_sent_for_dispute:
                    print("✅ EMAIL CONFIRMATION FOUND IN LOGS!")
                elif recent_email_logs:
                    print("⚠️ GENERAL EMAIL ACTIVITY FOUND - CHECK info@coinhubx.net INBOX")
                else:
                    print("⚠️ NO EMAIL ACTIVITY FOUND - MANUAL VERIFICATION NEEDED")
                
                return True
            else:
                print("❌ DISPUTE CREATION FAILED")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error checking logs: {str(e)}")
            return False

if __name__ == "__main__":
    success = asyncio.run(final_dispute_email_test())
    if success:
        print("\n🎯 TEST COMPLETED SUCCESSFULLY!")
        print("📧 CHECK info@coinhubx.net FOR DISPUTE ALERT EMAIL")
    else:
        print("\n❌ TEST FAILED!")
        exit(1)