"""
P2P Badge System
Calculates and manages trader badge levels based on performance
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Badge level definitions
BADGE_LEVELS = {
    "new": {
        "name": "New",
        "color": "#6B7280",
        "icon": "👤",
        "min_trades": 0,
        "min_completion_rate": 0,
        "max_avg_release_time": None
    },
    "verified": {
        "name": "Verified",
        "color": "#3B82F6",
        "icon": "✓",
        "min_trades": 20,
        "min_completion_rate": 90,
        "max_avg_release_time": None
    },
    "pro": {
        "name": "Pro",
        "color": "#8B5CF6",
        "icon": "⭐",
        "min_trades": 100,
        "min_completion_rate": 95,
        "max_avg_release_time": 15  # minutes
    },
    "elite": {
        "name": "Elite",
        "color": "#F59E0B",
        "icon": "👑",
        "min_trades": 500,
        "min_completion_rate": 98,
        "max_avg_release_time": 10  # minutes
    }
}

class BadgeSystem:
    def __init__(self, db):
        self.db = db
    
    async def calculate_user_badge(self, user_id: str) -> Dict:
        """
        Calculate badge level for a user based on their trading performance
        """
        try:
            # Get user's completed trades as seller
            completed_trades = await self.db.p2p_trades.find({
                "seller_id": user_id,
                "status": "completed"
            }).to_list(10000)
            
            total_trades = len(completed_trades)
            
            if total_trades == 0:
                return {
                    "level": "new",
                    "badge_data": BADGE_LEVELS["new"],
                    "stats": {
                        "total_trades": 0,
                        "completion_rate": 0,
                        "avg_release_time_minutes": 0
                    }
                }
            
            # Calculate completion rate
            all_seller_trades = await self.db.p2p_trades.find({
                "seller_id": user_id,
                "status": {"$in": ["completed", "cancelled", "dispute_resolved"]}
            }).to_list(10000)
            
            total_trades_attempted = len(all_seller_trades)
            completion_rate = (total_trades / total_trades_attempted * 100) if total_trades_attempted > 0 else 0
            
            # Calculate average release time
            release_times = []
            for trade in completed_trades:
                if trade.get("paid_at") and trade.get("completed_at"):
                    try:
                        paid_time = datetime.fromisoformat(trade["paid_at"].replace('Z', '+00:00'))
                        completed_time = datetime.fromisoformat(trade["completed_at"].replace('Z', '+00:00'))
                        diff_seconds = (completed_time - paid_time).total_seconds()
                        release_times.append(diff_seconds / 60)  # Convert to minutes
                    except:
                        pass
            
            avg_release_time = sum(release_times) / len(release_times) if release_times else 0
            
            # Determine badge level
            badge_level = "new"
            
            if (total_trades >= BADGE_LEVELS["elite"]["min_trades"] and 
                completion_rate >= BADGE_LEVELS["elite"]["min_completion_rate"] and
                avg_release_time <= BADGE_LEVELS["elite"]["max_avg_release_time"]):
                badge_level = "elite"
            elif (total_trades >= BADGE_LEVELS["pro"]["min_trades"] and 
                  completion_rate >= BADGE_LEVELS["pro"]["min_completion_rate"] and
                  avg_release_time <= BADGE_LEVELS["pro"]["max_avg_release_time"]):
                badge_level = "pro"
            elif (total_trades >= BADGE_LEVELS["verified"]["min_trades"] and 
                  completion_rate >= BADGE_LEVELS["verified"]["min_completion_rate"]):
                badge_level = "verified"
            
            stats = {
                "total_trades": total_trades,
                "completion_rate": round(completion_rate, 2),
                "avg_release_time_minutes": round(avg_release_time, 2)
            }
            
            # Update user's badge in database
            await self.db.user_accounts.update_one(
                {"user_id": user_id},
                {"$set": {
                    "p2p_badge_level": badge_level,
                    "p2p_stats": stats,
                    "badge_updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Updated badge for {user_id}: {badge_level} - {stats}")
            
            return {
                "level": badge_level,
                "badge_data": BADGE_LEVELS[badge_level],
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error calculating badge for {user_id}: {str(e)}")
            return {
                "level": "new",
                "badge_data": BADGE_LEVELS["new"],
                "stats": {
                    "total_trades": 0,
                    "completion_rate": 0,
                    "avg_release_time_minutes": 0
                }
            }
    
    async def get_user_badge(self, user_id: str) -> Dict:
        """
        Get user's current badge (from cache or recalculate)
        """
        try:
            user = await self.db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
            
            if user and user.get("p2p_badge_level"):
                badge_level = user.get("p2p_badge_level", "new")
                stats = user.get("p2p_stats", {})
                
                return {
                    "level": badge_level,
                    "badge_data": BADGE_LEVELS[badge_level],
                    "stats": stats
                }
            else:
                # Recalculate if not exists
                return await self.calculate_user_badge(user_id)
                
        except Exception as e:
            logger.error(f"Error getting badge for {user_id}: {str(e)}")
            return {
                "level": "new",
                "badge_data": BADGE_LEVELS["new"],
                "stats": {}
            }
    
    def get_badge_levels(self) -> Dict:
        """
        Return all badge level definitions
        """
        return BADGE_LEVELS
