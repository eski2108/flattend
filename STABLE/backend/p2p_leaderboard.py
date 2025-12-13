"""P2P Volume Leaderboard

Tracks and displays top P2P traders by volume and performance.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from user_service import get_user_service

logger = logging.getLogger(__name__)

class P2PLeaderboard:
    """P2P trading leaderboard system"""
    
    def __init__(self, db):
        self.db = db
        self.user_service = get_user_service(db)
    
    async def get_leaderboard(
        self,
        timeframe: str = "7d",
        limit: int = 50
    ) -> List[Dict]:
        """
        Get P2P leaderboard
        
        Args:
            timeframe: "24h", "7d", "30d", "all"
            limit: Maximum number of results
        
        Returns:
            List of top traders with stats
        """
        try:
            # Calculate date range
            start_date = self._get_start_date(timeframe)
            
            # Aggregate trades by seller
            pipeline = [
                {
                    "$match": {
                        "status": "completed",
                        "completed_at": {"$gte": start_date.isoformat()}
                    }
                },
                {
                    "$group": {
                        "_id": "$seller_id",
                        "total_volume_gbp": {"$sum": "$fiat_amount"},
                        "total_trades": {"$sum": 1},
                        "avg_release_time": {"$avg": "$release_time_seconds"},
                        "total_crypto_sold": {"$sum": "$crypto_amount"}
                    }
                },
                {"$sort": {"total_volume_gbp": -1}},
                {"$limit": limit}
            ]
            
            results = await self.db.p2p_trades.aggregate(pipeline).to_list(limit)
            
            # Enrich with user data
            leaderboard = []
            for idx, result in enumerate(results):
                user_id = result["_id"]
                user = await self.user_service.get_user_by_id(user_id)
                
                if not user:
                    continue
                
                # Calculate completion rate for this timeframe
                total_orders = await self.db.p2p_trades.count_documents({
                    "seller_id": user_id,
                    "created_at": {"$gte": start_date.isoformat()}
                })
                
                completion_rate = (
                    (result["total_trades"] / total_orders * 100)
                    if total_orders > 0 else 0
                )
                
                leaderboard.append({
                    "rank": idx + 1,
                    "user_id": user_id,
                    "username": user.get("username") or user.get("full_name", "User"),
                    "country": user.get("country", "Unknown"),
                    "total_volume_gbp": round(result["total_volume_gbp"], 2),
                    "total_trades": result["total_trades"],
                    "completion_rate": round(completion_rate, 2),
                    "avg_release_time_seconds": int(result.get("avg_release_time") or 0),
                    "badges": user.get("badges", []),
                    "verified": user.get("kyc_verified", False)
                })
            
            logger.info(f"✅ Generated leaderboard with {len(leaderboard)} traders ({timeframe})")
            return leaderboard
            
        except Exception as e:
            logger.error(f"Error generating leaderboard: {str(e)}")
            return []
    
    def _get_start_date(self, timeframe: str) -> datetime:
        """
        Calculate start date for timeframe
        """
        now = datetime.now(timezone.utc)
        
        if timeframe == "24h":
            return now - timedelta(hours=24)
        elif timeframe == "7d":
            return now - timedelta(days=7)
        elif timeframe == "30d":
            return now - timedelta(days=30)
        else:  # "all"
            return datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    async def get_user_rank(self, user_id: str, timeframe: str = "7d") -> Dict:
        """
        Get a specific user's rank and stats
        """
        try:
            leaderboard = await self.get_leaderboard(timeframe, limit=1000)
            
            for entry in leaderboard:
                if entry["user_id"] == user_id:
                    return {
                        "success": True,
                        "rank": entry["rank"],
                        "total_traders": len(leaderboard),
                        "stats": entry
                    }
            
            return {
                "success": False,
                "message": "User not in top rankings"
            }
            
        except Exception as e:
            logger.error(f"Error getting user rank: {str(e)}")
            return {"success": False, "error": str(e)}

# Singleton instance
_leaderboard_instance = None

def get_p2p_leaderboard(db):
    """Get singleton leaderboard instance"""
    global _leaderboard_instance
    if _leaderboard_instance is None:
        _leaderboard_instance = P2PLeaderboard(db)
    return _leaderboard_instance
