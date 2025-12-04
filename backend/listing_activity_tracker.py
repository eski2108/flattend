"""P2P Listing Activity Tracker

Tracks when listings are viewed or interacted with to prevent premature expiry.
"""

from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class ListingActivityTracker:
    """Track P2P listing activity"""
    
    def __init__(self, db):
        self.db = db
    
    async def track_view(self, listing_id: str):
        """
        Update last_active_at when someone views a listing
        """
        try:
            await self.db.p2p_listings.update_one(
                {"listing_id": listing_id},
                {
                    "$set": {
                        "last_active_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {"view_count": 1}
                }
            )
            logger.debug(f"📊 Tracked view for listing {listing_id}")
        except Exception as e:
            logger.error(f"❌ Failed to track view: {str(e)}")
    
    async def track_order_creation(self, listing_id: str):
        """
        Update last_active_at when an order is created from this listing
        """
        try:
            await self.db.p2p_listings.update_one(
                {"listing_id": listing_id},
                {
                    "$set": {
                        "last_active_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {"order_count": 1}
                }
            )
            logger.debug(f"📊 Tracked order for listing {listing_id}")
        except Exception as e:
            logger.error(f"❌ Failed to track order: {str(e)}")
    
    async def track_seller_update(self, listing_id: str):
        """
        Update last_active_at when seller edits the listing
        """
        try:
            await self.db.p2p_listings.update_one(
                {"listing_id": listing_id},
                {
                    "$set": {
                        "last_active_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            logger.debug(f"📊 Tracked seller update for listing {listing_id}")
        except Exception as e:
            logger.error(f"❌ Failed to track update: {str(e)}")

# Singleton instance
_tracker_instance = None

def get_activity_tracker(db):
    """Get singleton activity tracker"""
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = ListingActivityTracker(db)
    return _tracker_instance
