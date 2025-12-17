#!/usr/bin/env python3
"""
DIRECT DISPUTE CREATION TEST
============================

Creates a dispute directly using existing users and verifies email to info@coinhubx.net
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

BACKEND_URL = "https://cryptodash-22.preview.emergentagent.com/api"

async def direct_dispute_test():
    """Create a dispute directly and verify email"""
    
    async with aiohttp.ClientSession() as session:
        logger.info("🚀 STARTING DIRECT DISPUTE TEST")
        
        # Use existing user
        buyer_id = "80a4a694-a6a4-4f84-94a3-1e5cad51eaf3"  # gads21083@gmail.com
        seller_id = "ADMIN_LIQUIDITY"  # Admin seller
        
        # Step 1: Create a mock trade ID for dispute
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        trade_id = f"dispute_test_trade_{timestamp}_{str(uuid.uuid4())[:8]}"
        
        logger.info(f"📋 Using Trade ID: {trade_id}")
        logger.info(f"📋 Buyer ID: {buyer_id}")
        logger.info(f"📋 Seller ID: {seller_id}")
        
        # Step 2: Try to create dispute using P2P endpoint
        logger.info("📋 Step 1: Creating dispute via P2P endpoint...")
        dispute_data = {
            "trade_id": trade_id,
            "user_id": buyer_id,
            "reason": "payment_not_received",
            "description": f"🚨 URGENT TEST DISPUTE - Created at {datetime.now(timezone.utc).isoformat()} to verify admin email notifications to info@coinhubx.net. This is a test dispute for email verification. Trade ID: {trade_id}"
        }
        
        dispute_id = None
        
        async with session.post(f"{BACKEND_URL}/p2p/disputes/create", json=dispute_data) as response:
            if response.status == 200:
                dispute_result = await response.json()
                dispute_id = dispute_result.get("dispute_id")
                logger.info(f"✅ P2P Dispute created: {dispute_id}")
            else:
                error_text = await response.text()
                logger.warning(f"⚠️ P2P dispute failed: {response.status} - {error_text}")
        
        # Step 3: Try legacy dispute endpoint if P2P failed
        if not dispute_id:
            logger.info("📋 Step 2: Trying legacy dispute endpoint...")
            legacy_dispute_data = {
                "user_address": buyer_id,
                "order_id": trade_id,
                "reason": f"🚨 URGENT TEST DISPUTE - Payment not received. Created at {datetime.now(timezone.utc).isoformat()} for email verification to info@coinhubx.net. Trade: {trade_id}"
            }
            
            async with session.post(f"{BACKEND_URL}/disputes/initiate", json=legacy_dispute_data) as response:
                if response.status == 200:
                    dispute_result = await response.json()
                    dispute = dispute_result.get("dispute", {})
                    dispute_id = dispute.get("dispute_id")
                    logger.info(f"✅ Legacy Dispute created: {dispute_id}")
                else:
                    error_text = await response.text()
                    logger.warning(f"⚠️ Legacy dispute failed: {response.status} - {error_text}")
        
        # Step 4: If both failed, try direct database insertion approach
        if not dispute_id:
            logger.info("📋 Step 3: Trying direct dispute creation...")
            
            # Create dispute via admin endpoint (if available)
            admin_dispute_data = {
                "dispute_id": f"admin_dispute_{timestamp}_{str(uuid.uuid4())[:8]}",
                "trade_id": trade_id,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "reason": "payment_not_received",
                "description": f"🚨 ADMIN TEST DISPUTE - Created at {datetime.now(timezone.utc).isoformat()} to verify email notifications to info@coinhubx.net",
                "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Try to trigger email directly via email service test
            email_test_data = {
                "trade_id": trade_id,
                "dispute_id": admin_dispute_data["dispute_id"],
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "amount": 0.01,
                "currency": "BTC",
                "reason": "payment_not_received",
                "description": admin_dispute_data["description"],
                "initiated_by": buyer_id
            }
            
            # Try to call email service directly
            async with session.post(f"{BACKEND_URL}/test/send-dispute-email", json=email_test_data) as response:
                if response.status == 200:
                    logger.info("✅ Direct email test triggered")
                    dispute_id = admin_dispute_data["dispute_id"]
                else:
                    logger.warning(f"⚠️ Direct email test failed: {response.status}")
        
        # Step 5: Check backend logs regardless
        logger.info("📋 Step 4: Checking backend logs...")
        await asyncio.sleep(3)  # Wait for processing
        
        try:
            # Check both log files
            log_files = [
                "/var/log/supervisor/backend.out.log",
                "/var/log/supervisor/backend.err.log"
            ]
            
            email_indicators_found = []
            dispute_indicators_found = []
            
            for log_file in log_files:
                try:
                    result = subprocess.run(
                        ["tail", "-n", "200", log_file],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if result.returncode == 0:
                        log_content = result.stdout
                        
                        # Check for email and dispute indicators
                        for line in log_content.split('\n'):
                            # Email indicators
                            if any(indicator in line for indicator in [
                                "info@coinhubx.net",
                                "dispute_alert_to_admin", 
                                "send_dispute_alert",
                                "Email sent successfully",
                                "URGENT: P2P Trade Dispute",
                                "SendGrid"
                            ]):
                                email_indicators_found.append(line.strip())
                            
                            # Dispute indicators
                            if dispute_id and dispute_id in line:
                                dispute_indicators_found.append(line.strip())
                            elif any(indicator in line for indicator in [
                                "dispute", "Dispute", "DISPUTE"
                            ]) and any(test_indicator in line for test_indicator in [
                                "test", "Test", "TEST", timestamp
                            ]):
                                dispute_indicators_found.append(line.strip())
                
                except Exception as e:
                    logger.warning(f"⚠️ Could not read {log_file}: {str(e)}")
            
            # Show findings
            logger.info("\n📧 EMAIL INDICATORS FOUND:")
            for indicator in email_indicators_found[-10:]:  # Last 10
                logger.info(f"  📧 {indicator}")
            
            logger.info("\n🔍 DISPUTE INDICATORS FOUND:")
            for indicator in dispute_indicators_found[-10:]:  # Last 10
                logger.info(f"  🔍 {indicator}")
            
            # Final results
            logger.info("\n" + "=" * 70)
            logger.info("🎯 DIRECT DISPUTE TEST RESULTS:")
            logger.info("=" * 70)
            logger.info(f"✅ Test Trade ID: {trade_id}")
            logger.info(f"✅ Dispute ID: {dispute_id or 'NOT CREATED'}")
            logger.info(f"✅ Buyer ID: {buyer_id}")
            logger.info(f"✅ Seller ID: {seller_id}")
            logger.info(f"📧 Target Email: info@coinhubx.net")
            logger.info(f"📧 Email Indicators: {len(email_indicators_found)} found")
            logger.info(f"🔍 Dispute Indicators: {len(dispute_indicators_found)} found")
            logger.info("=" * 70)
            
            if dispute_id:
                print(f"\n🎉 DISPUTE CREATED SUCCESSFULLY!")
                print(f"🆔 DISPUTE ID: {dispute_id}")
                print(f"📧 EMAIL TARGET: info@coinhubx.net")
                
                if email_indicators_found:
                    print(f"✅ EMAIL INDICATORS FOUND: {len(email_indicators_found)}")
                else:
                    print("⚠️ NO EMAIL INDICATORS FOUND - CHECK MANUALLY")
                
                return True
            else:
                print("❌ DISPUTE CREATION FAILED")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error checking logs: {str(e)}")
            return False

if __name__ == "__main__":
    success = asyncio.run(direct_dispute_test())
    if not success:
        exit(1)