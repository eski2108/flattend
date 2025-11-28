"""
Background task for monthly subscription renewals
Runs periodically to charge users for active subscriptions
"""

import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['coinhubx_db']

async def process_subscription_renewals():
    """Process monthly subscription renewals for arbitrage alerts"""
    try:
        # Find all active subscriptions where next_billing_date has passed
        current_time = datetime.now(timezone.utc)
        
        subscriptions = await db.alert_subscriptions.find({
            "is_active": True,
            "next_billing_date": {"$lte": current_time.isoformat()}
        }).to_list(1000)
        
        logger.info(f"Processing {len(subscriptions)} subscription renewals")
        
        for subscription in subscriptions:
            user_id = subscription["user_id"]
            monthly_price = subscription.get("monthly_price", 10.0)
            
            # Check user balance
            user_balance = await db.internal_balances.find_one({
                "user_id": user_id,
                "currency": "GBP"
            })
            
            if user_balance and user_balance.get("balance", 0) >= monthly_price:
                # Deduct from user
                await db.internal_balances.update_one(
                    {"user_id": user_id, "currency": "GBP"},
                    {"$inc": {"balance": -monthly_price}}
                )
                
                # Add to admin revenue
                await db.internal_balances.update_one(
                    {"user_id": "ADMIN", "currency": "GBP"},
                    {"$inc": {"subscription_fees": monthly_price}},
                    upsert=True
                )
                
                # Update subscription - next billing in 30 days
                next_billing = current_time + timedelta(days=30)
                
                await db.alert_subscriptions.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            "last_payment_date": current_time.isoformat(),
                            "next_billing_date": next_billing.isoformat()
                        }
                    }
                )
                
                # Log transaction
                await db.transactions_log.insert_one({
                    "transaction_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "type": "subscription_renewal",
                    "amount_gbp": monthly_price,
                    "timestamp": current_time.isoformat(),
                    "status": "completed"
                })
                
                logger.info(f"Renewed subscription for user {user_id}")
                
            else:
                # Insufficient balance - pause subscription
                await db.alert_subscriptions.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            "is_active": False,
                            "paused_reason": "insufficient_balance",
                            "paused_at": current_time.isoformat()
                        }
                    }
                )
                
                logger.warning(f"Paused subscription for user {user_id} - insufficient balance")
                
    except Exception as e:
        logger.error(f"Error processing subscription renewals: {str(e)}")

async def subscription_renewal_worker():
    """Background worker that runs every hour"""
    while True:
        try:
            await process_subscription_renewals()
            # Run every hour
            await asyncio.sleep(3600)
        except Exception as e:
            logger.error(f"Subscription renewal worker error: {str(e)}")
            await asyncio.sleep(3600)

# This will be started by the main server
def start_subscription_worker():
    """Start the background worker"""
    import uuid
    asyncio.create_task(subscription_renewal_worker())
    logger.info("Subscription renewal worker started")
