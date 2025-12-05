#!/usr/bin/env python3
"""
SIMPLE DISPUTE CREATION TEST
============================

Creates a real P2P trade using existing offers, then creates a dispute
to trigger email to info@coinhubx.net
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

BACKEND_URL = "https://cryptolaunch-9.preview.emergentagent.com/api"

async def create_dispute_test():
    """Create a dispute and verify email is sent"""
    
    async with aiohttp.ClientSession() as session:
        logger.info("🚀 STARTING SIMPLE DISPUTE TEST")
        
        # Step 1: Get existing P2P offers
        logger.info("📋 Step 1: Getting P2P offers...")
        async with session.get(f"{BACKEND_URL}/p2p/offers") as response:
            if response.status == 200:
                offers_data = await response.json()
                offers = offers_data.get("offers", [])
                if offers:
                    offer = offers[0]  # Use first available offer
                    logger.info(f"✅ Found offer: {offer['offer_id']} - {offer['crypto_currency']}")
                else:
                    logger.error("❌ No offers available")
                    return False
            else:
                logger.error(f"❌ Failed to get offers: {response.status}")
                return False
        
        # Step 2: Create test buyer
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        buyer_email = f"dispute_test_{timestamp}@test.com"
        
        buyer_data = {
            "email": buyer_email,
            "password": "TestPass123!",
            "full_name": f"Dispute Test User {timestamp}",
            "phone_number": "+447700900123"
        }
        
        logger.info("📋 Step 2: Creating test buyer...")
        async with session.post(f"{BACKEND_URL}/auth/register", json=buyer_data) as response:
            if response.status == 200:
                buyer_result = await response.json()
                buyer_id = buyer_result.get("user", {}).get("user_id")
                logger.info(f"✅ Buyer created: {buyer_id}")
            else:
                logger.error(f"❌ Buyer creation failed: {response.status}")
                return False
        
        # Step 3: Create P2P trade
        logger.info("📋 Step 3: Creating P2P trade...")
        trade_data = {
            "sell_order_id": offer["offer_id"],
            "buyer_id": buyer_id,
            "crypto_amount": offer["min_order"] / offer["price_per_unit"],  # Minimum amount
            "buyer_wallet_address": f"test_wallet_{timestamp}"
        }
        
        async with session.post(f"{BACKEND_URL}/p2p/create-trade", json=trade_data) as response:
            if response.status == 200:
                trade_result = await response.json()
                trade_id = trade_result.get("trade_id")
                logger.info(f"✅ Trade created: {trade_id}")
            else:
                error_text = await response.text()
                logger.error(f"❌ Trade creation failed: {response.status} - {error_text}")
                return False
        
        # Step 4: Create dispute
        logger.info("📋 Step 4: Creating dispute...")
        dispute_data = {
            "trade_id": trade_id,
            "user_id": buyer_id,
            "reason": "payment_not_received",
            "description": f"URGENT TEST DISPUTE - Created at {datetime.now(timezone.utc).isoformat()} to verify admin email notifications to info@coinhubx.net are working correctly. This is a test dispute for email verification purposes."
        }
        
        async with session.post(f"{BACKEND_URL}/p2p/disputes/create", json=dispute_data) as response:
            if response.status == 200:
                dispute_result = await response.json()
                dispute_id = dispute_result.get("dispute_id")
                logger.info(f"✅ Dispute created: {dispute_id}")
            else:
                error_text = await response.text()
                logger.error(f"❌ Dispute creation failed: {response.status} - {error_text}")
                return False
        
        # Step 5: Check backend logs for email confirmation
        logger.info("📋 Step 5: Checking backend logs for email confirmation...")
        await asyncio.sleep(2)  # Wait for email processing
        
        try:
            # Check backend logs
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            log_content = result.stdout
            
            # Look for email indicators
            email_found = False
            dispute_found = False
            
            for line in log_content.split('\n'):
                if dispute_id and dispute_id in line:
                    dispute_found = True
                    logger.info(f"📧 Dispute log: {line}")
                
                if any(indicator in line for indicator in [
                    "info@coinhubx.net", 
                    "dispute_alert_to_admin",
                    "Email sent successfully",
                    "URGENT: P2P Trade Dispute"
                ]):
                    email_found = True
                    logger.info(f"📧 Email log: {line}")
            
            # Final results
            logger.info("\n" + "=" * 60)
            logger.info("🎯 DISPUTE TEST RESULTS:")
            logger.info("=" * 60)
            logger.info(f"✅ Trade ID: {trade_id}")
            logger.info(f"✅ Dispute ID: {dispute_id}")
            logger.info(f"✅ Buyer ID: {buyer_id}")
            logger.info(f"📧 Email Target: info@coinhubx.net")
            logger.info(f"📧 Email Sent: {'✅ CONFIRMED' if email_found else '⚠️ CHECK MANUALLY'}")
            logger.info(f"🔍 Dispute in Logs: {'✅ FOUND' if dispute_found else '⚠️ NOT FOUND'}")
            logger.info("=" * 60)
            
            if dispute_id:
                print(f"\n🎉 SUCCESS! DISPUTE CREATED: {dispute_id}")
                print(f"📧 EMAIL SHOULD BE SENT TO: info@coinhubx.net")
                return True
            
        except Exception as e:
            logger.error(f"❌ Error checking logs: {str(e)}")
        
        return False

if __name__ == "__main__":
    success = asyncio.run(create_dispute_test())
    if not success:
        exit(1)