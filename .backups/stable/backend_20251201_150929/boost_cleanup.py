"""
P2P Boost Cleanup Background Task
Automatically expires boosted P2P listings when their boost period ends
"""

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB setup
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

async def cleanup_expired_boosts():
    """Clean up expired P2P boosted listings"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Find all boosted offers
        boosted_offers = await db.p2p_ads.find(
            {"boosted": True, "boost_end_date": {"$exists": True}},
            {"_id": 0, "ad_id": 1, "boost_end_date": 1, "seller_user_id": 1}
        ).to_list(1000)
        
        expired_count = 0
        now = datetime.now(timezone.utc)
        
        for offer in boosted_offers:
            boost_end_date = offer.get("boost_end_date")
            
            if not boost_end_date:
                continue
            
            # Handle both datetime objects and string dates
            if isinstance(boost_end_date, str):
                try:
                    boost_end_date = datetime.fromisoformat(boost_end_date.replace('Z', '+00:00'))
                except:
                    continue
            
            # Ensure timezone awareness
            if boost_end_date.tzinfo is None:
                boost_end_date = boost_end_date.replace(tzinfo=timezone.utc)
            
            # Check if expired
            if now > boost_end_date:
                # Update offer to remove boost
                await db.p2p_ads.update_one(
                    {"ad_id": offer["ad_id"]},
                    {
                        "$set": {
                            "boosted": False,
                            "updated_at": now
                        },
                        "$unset": {
                            "boost_end_date": ""
                        }
                    }
                )
                expired_count += 1
                print(f"✅ Expired boost for ad {offer['ad_id']}")
        
        if expired_count > 0:
            print(f"🧹 Cleanup complete: Expired {expired_count} boosted listings")
        else:
            print("✓ No expired boosts found")
            
    except Exception as e:
        print(f"❌ Boost cleanup error: {e}")
    finally:
        client.close()

async def run_boost_cleanup_loop():
    """Run cleanup task every hour"""
    print("🚀 Starting P2P Boost Cleanup Service...")
    
    while True:
        try:
            await cleanup_expired_boosts()
        except Exception as e:
            print(f"❌ Boost cleanup loop error: {e}")
        
        # Run every hour
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(run_boost_cleanup_loop())
