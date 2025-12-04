"""User Trading Badge System

Performance-based badges to reward and highlight good traders.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from user_service import get_user_service

logger = logging.getLogger(__name__)

class BadgeSystem:
    """Calculate and manage user trading badges"""
    
    # Badge definitions and requirements
    BADGE_RULES = {
        "fast_seller": {
            "name": "Fast Seller ⚡",
            "description": "Average release time under 5 minutes",
            "icon": "⚡",
            "color": "#3B82F6",
            "requirements": {
                "min_trades": 20,
                "max_avg_release_seconds": 300
            }
        },
        "trusted_seller": {
            "name": "Trusted Seller ✓",
            "description": "98%+ completion rate with 50+ trades",
            "icon": "✓",
            "color": "#10B981",
            "requirements": {
                "min_trades": 50,
                "min_completion_rate": 98.0
            }
        },
        "high_volume": {
            "name": "High Volume 💎",
            "description": "Traded over £10,000",
            "icon": "💎",
            "color": "#8B5CF6",
            "requirements": {
                "min_volume_gbp": 10000
            }
        },
        "whale": {
            "name": "Whale 🐋",
            "description": "Traded over £100,000",
            "icon": "🐋",
            "color": "#EC4899",
            "requirements": {
                "min_volume_gbp": 100000
            }
        },
        "veteran": {
            "name": "Veteran 🏖️",
            "description": "Completed 500+ trades",
            "icon": "🏖️",
            "color": "#F59E0B",
            "requirements": {
                "min_trades": 500
            }
        },
        "pro_trader": {
            "name": "Pro Trader 🎯",
            "description": "100+ trades with 95%+ completion rate",
            "icon": "🎯",
            "color": "#06B6D4",
            "requirements": {
                "min_trades": 100,
                "min_completion_rate": 95.0
            }
        }
    }
    
    def __init__(self, db):
        self.db = db
        self.user_service = get_user_service(db)
    
    async def calculate_user_badges(self, user_id: str) -> List[str]:
        """
        Calculate which badges a user has earned
        
        Returns:
            List of badge IDs earned by the user
        """
        try:
            # Get user trading stats
            stats = await self.get_user_stats(user_id)
            
            if stats["total_trades"] == 0:
                return []
            
            earned_badges = []
            
            # Check each badge
            for badge_id, badge_config in self.BADGE_RULES.items():
                requirements = badge_config["requirements"]
                if self.check_badge_requirements(stats, requirements):
                    earned_badges.append(badge_id)
            
            logger.debug(f"User {user_id} earned badges: {earned_badges}")
            return earned_badges
            
        except Exception as e:
            logger.error(f"Error calculating badges for {user_id}: {str(e)}")
            return []
    
    async def get_user_stats(self, user_id: str) -> Dict:
        """
        Get aggregated user trading statistics
        """
        # Aggregate P2P trades as seller
        pipeline = [
            {"$match": {"seller_id": user_id}},
            {
                "$group": {
                    "_id": None,
                    "total_trades": {"$sum": 1},
                    "completed_trades": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                    },
                    "cancelled_trades": {
                        "$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}
                    },
                    "total_volume": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, "$fiat_amount", 0]}
                    },
                    "avg_release_time": {"$avg": "$release_time_seconds"}
                }
            }
        ]
        
        result = await self.db.p2p_trades.aggregate(pipeline).to_list(1)
        
        if not result:
            return {
                "total_trades": 0,
                "completed_trades": 0,
                "cancelled_trades": 0,
                "total_volume": 0,
                "avg_release_time": 0,
                "completion_rate": 0,
                "cancellation_rate": 0
            }
        
        stats = result[0]
        stats.pop("_id", None)
        
        # Calculate rates
        if stats["total_trades"] > 0:
            stats["completion_rate"] = (stats["completed_trades"] / stats["total_trades"]) * 100
            stats["cancellation_rate"] = (stats["cancelled_trades"] / stats["total_trades"]) * 100
        else:
            stats["completion_rate"] = 0
            stats["cancellation_rate"] = 0
        
        # Handle None values
        stats["avg_release_time"] = stats.get("avg_release_time") or 0
        
        return stats
    
    def check_badge_requirements(self, stats: Dict, requirements: Dict) -> bool:
        """
        Check if user stats meet badge requirements
        """
        # Check minimum trades
        if "min_trades" in requirements:
            if stats["completed_trades"] < requirements["min_trades"]:
                return False
        
        # Check maximum average release time
        if "max_avg_release_seconds" in requirements:
            if stats["avg_release_time"] > requirements["max_avg_release_seconds"]:
                return False
        
        # Check minimum completion rate
        if "min_completion_rate" in requirements:
            if stats["completion_rate"] < requirements["min_completion_rate"]:
                return False
        
        # Check minimum volume
        if "min_volume_gbp" in requirements:
            if stats["total_volume"] < requirements["min_volume_gbp"]:
                return False
        
        return True
    
    async def recalculate_all_badges(self):
        """
        Recalculate badges for all users with P2P trades
        Should be run as a scheduled job (daily)
        """
        try:
            logger.info("🔄 Starting badge recalculation for all users...")
            
            # Get all users who have P2P trades
            sellers = await self.db.p2p_trades.distinct("seller_id")
            
            updated = 0
            for user_id in sellers:
                try:
                    badges = await self.calculate_user_badges(user_id)
                    await self.user_service.update_user(user_id, {"badges": badges})
                    updated += 1
                except Exception as e:
                    logger.error(f"Failed to update badges for {user_id}: {str(e)}")
            
            logger.info(f"✅ Recalculated badges for {updated} users")
            return {"success": True, "updated_count": updated}
            
        except Exception as e:
            logger.error(f"Error in badge recalculation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_badge_info(self, badge_id: str) -> Dict:
        """
        Get badge information
        """
        return self.BADGE_RULES.get(badge_id, {})
    
    async def get_all_badges_info(self) -> Dict:
        """
        Get information about all available badges
        """
        return self.BADGE_RULES

# Singleton instance
_badge_system_instance = None

def get_badge_system(db):
    """Get singleton badge system instance"""
    global _badge_system_instance
    if _badge_system_instance is None:
        _badge_system_instance = BadgeSystem(db)
    return _badge_system_instance
