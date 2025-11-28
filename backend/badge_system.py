# Trader Badge System
# Automatically awards performance-based badges to traders

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
import uuid

class Badge(BaseModel):
    """Individual badge model"""
    badge_id: str
    name: str
    icon: str  # Emoji or icon identifier
    description: str
    color: str  # Hex color for styling
    earned_date: str
    
class TraderBadges(BaseModel):
    """Complete badge collection for a trader"""
    trader_id: str
    badges: List[Badge] = []
    last_calculated: str
    total_badges: int = 0

# Badge Definitions
BADGE_DEFINITIONS = {
    "elite_trader": {
        "name": "Elite Trader",
        "icon": "🏆",
        "description": "95%+ completion rate with 100+ completed trades",
        "color": "#FFD700",
        "criteria": {
            "completion_rate": 95,
            "total_trades": 100
        }
    },
    "pro_trader": {
        "name": "Pro Trader",
        "icon": "⭐",
        "description": "85%+ completion rate with 50+ completed trades",
        "color": "#00F0FF",
        "criteria": {
            "completion_rate": 85,
            "total_trades": 50
        }
    },
    "verified": {
        "name": "Verified",
        "icon": "✅",
        "description": "Identity verified through KYC",
        "color": "#00FF88",
        "criteria": {
            "kyc_verified": True
        }
    },
    "fast_responder": {
        "name": "Fast Responder",
        "icon": "🎯",
        "description": "Average response time under 5 minutes",
        "color": "#FF00FF",
        "criteria": {
            "avg_response_time": 300  # 5 minutes in seconds
        }
    },
    "high_volume": {
        "name": "High Volume",
        "icon": "💎",
        "description": "Total trading volume exceeds $100,000",
        "color": "#9D4EDD",
        "criteria": {
            "total_volume_usd": 100000
        }
    },
    "active_today": {
        "name": "Active Today",
        "icon": "🔥",
        "description": "Completed a trade in the last 24 hours",
        "color": "#FF6B35",
        "criteria": {
            "last_trade_hours": 24
        }
    },
    "trusted": {
        "name": "Trusted",
        "icon": "🛡️",
        "description": "4.5+ star rating with 20+ reviews",
        "color": "#06FFA5",
        "criteria": {
            "rating": 4.5,
            "review_count": 20
        }
    }
}


async def calculate_trader_badges(db, trader_id: str) -> Dict:
    """
    Calculate and award badges to a trader based on their performance stats.
    
    Returns: {"success": bool, "badges": List[Badge], "stats": dict}
    """
    
    # Get trader profile/stats
    trader = await db.trader_profiles.find_one({"user_id": trader_id})
    
    if not trader:
        # Try to get basic user info
        user = await db.users.find_one({"user_id": trader_id})
        if not user:
            return {
                "success": False,
                "message": "Trader not found",
                "badges": []
            }
        
        # Initialize trader stats if not exists
        trader = {
            "user_id": trader_id,
            "completion_rate": 0,
            "total_trades": 0,
            "total_volume_usd": 0,
            "rating": 0,
            "review_count": 0,
            "avg_response_time": 999999,  # Very high default
            "last_trade_date": None,
            "kyc_verified": user.get("kyc_verified", False)
        }
    
    # Extract stats
    stats = {
        "completion_rate": trader.get("completion_rate", 0),
        "total_trades": trader.get("total_trades", 0),
        "total_volume_usd": trader.get("total_volume_usd", 0),
        "rating": trader.get("rating", 0),
        "review_count": trader.get("review_count", 0),
        "avg_response_time": trader.get("avg_response_time", 999999),
        "last_trade_date": trader.get("last_trade_date"),
        "kyc_verified": trader.get("kyc_verified", False)
    }
    
    # Calculate hours since last trade
    last_trade_hours = 999999
    if stats["last_trade_date"]:
        try:
            last_trade = datetime.fromisoformat(stats["last_trade_date"].replace('Z', '+00:00'))
            hours_ago = (datetime.now(timezone.utc) - last_trade).total_seconds() / 3600
            last_trade_hours = hours_ago
        except:
            pass
    
    stats["last_trade_hours"] = last_trade_hours
    
    # Check each badge criteria
    earned_badges = []
    
    # Elite Trader
    if (stats["completion_rate"] >= BADGE_DEFINITIONS["elite_trader"]["criteria"]["completion_rate"] and
        stats["total_trades"] >= BADGE_DEFINITIONS["elite_trader"]["criteria"]["total_trades"]):
        earned_badges.append(Badge(
            badge_id="elite_trader",
            name=BADGE_DEFINITIONS["elite_trader"]["name"],
            icon=BADGE_DEFINITIONS["elite_trader"]["icon"],
            description=BADGE_DEFINITIONS["elite_trader"]["description"],
            color=BADGE_DEFINITIONS["elite_trader"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # Pro Trader (only if not Elite)
    elif (stats["completion_rate"] >= BADGE_DEFINITIONS["pro_trader"]["criteria"]["completion_rate"] and
          stats["total_trades"] >= BADGE_DEFINITIONS["pro_trader"]["criteria"]["total_trades"]):
        earned_badges.append(Badge(
            badge_id="pro_trader",
            name=BADGE_DEFINITIONS["pro_trader"]["name"],
            icon=BADGE_DEFINITIONS["pro_trader"]["icon"],
            description=BADGE_DEFINITIONS["pro_trader"]["description"],
            color=BADGE_DEFINITIONS["pro_trader"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # Verified
    if stats["kyc_verified"]:
        earned_badges.append(Badge(
            badge_id="verified",
            name=BADGE_DEFINITIONS["verified"]["name"],
            icon=BADGE_DEFINITIONS["verified"]["icon"],
            description=BADGE_DEFINITIONS["verified"]["description"],
            color=BADGE_DEFINITIONS["verified"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # Fast Responder
    if stats["avg_response_time"] <= BADGE_DEFINITIONS["fast_responder"]["criteria"]["avg_response_time"]:
        earned_badges.append(Badge(
            badge_id="fast_responder",
            name=BADGE_DEFINITIONS["fast_responder"]["name"],
            icon=BADGE_DEFINITIONS["fast_responder"]["icon"],
            description=BADGE_DEFINITIONS["fast_responder"]["description"],
            color=BADGE_DEFINITIONS["fast_responder"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # High Volume
    if stats["total_volume_usd"] >= BADGE_DEFINITIONS["high_volume"]["criteria"]["total_volume_usd"]:
        earned_badges.append(Badge(
            badge_id="high_volume",
            name=BADGE_DEFINITIONS["high_volume"]["name"],
            icon=BADGE_DEFINITIONS["high_volume"]["icon"],
            description=BADGE_DEFINITIONS["high_volume"]["description"],
            color=BADGE_DEFINITIONS["high_volume"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # Active Today
    if last_trade_hours <= BADGE_DEFINITIONS["active_today"]["criteria"]["last_trade_hours"]:
        earned_badges.append(Badge(
            badge_id="active_today",
            name=BADGE_DEFINITIONS["active_today"]["name"],
            icon=BADGE_DEFINITIONS["active_today"]["icon"],
            description=BADGE_DEFINITIONS["active_today"]["description"],
            color=BADGE_DEFINITIONS["active_today"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # Trusted
    if (stats["rating"] >= BADGE_DEFINITIONS["trusted"]["criteria"]["rating"] and
        stats["review_count"] >= BADGE_DEFINITIONS["trusted"]["criteria"]["review_count"]):
        earned_badges.append(Badge(
            badge_id="trusted",
            name=BADGE_DEFINITIONS["trusted"]["name"],
            icon=BADGE_DEFINITIONS["trusted"]["icon"],
            description=BADGE_DEFINITIONS["trusted"]["description"],
            color=BADGE_DEFINITIONS["trusted"]["color"],
            earned_date=datetime.now(timezone.utc).isoformat()
        ))
    
    # Store badges in database
    trader_badges = TraderBadges(
        trader_id=trader_id,
        badges=earned_badges,
        last_calculated=datetime.now(timezone.utc).isoformat(),
        total_badges=len(earned_badges)
    )
    
    await db.trader_badges.update_one(
        {"trader_id": trader_id},
        {"$set": trader_badges.model_dump()},
        upsert=True
    )
    
    return {
        "success": True,
        "badges": [badge.model_dump() for badge in earned_badges],
        "stats": stats,
        "total_badges": len(earned_badges)
    }


async def get_trader_badges(db, trader_id: str) -> Dict:
    """Get cached badges for a trader"""
    badges = await db.trader_badges.find_one({"trader_id": trader_id}, {"_id": 0})
    
    if not badges:
        # Calculate badges if not cached
        return await calculate_trader_badges(db, trader_id)
    
    return {
        "success": True,
        "badges": badges.get("badges", []),
        "last_calculated": badges.get("last_calculated"),
        "total_badges": badges.get("total_badges", 0)
    }


async def update_trader_stats_for_badges(db, trader_id: str, trade_data: Dict):
    """
    Update trader stats when a trade completes to keep badge calculations current.
    Called after trade completion.
    """
    # Get current trader profile
    trader = await db.trader_profiles.find_one({"user_id": trader_id})
    
    if not trader:
        # Initialize trader profile
        trader = {
            "user_id": trader_id,
            "completion_rate": 0,
            "total_trades": 0,
            "completed_trades": 0,
            "cancelled_trades": 0,
            "total_volume_usd": 0,
            "rating": 0,
            "review_count": 0,
            "avg_response_time": 0,
            "last_trade_date": datetime.now(timezone.utc).isoformat()
        }
    
    # Update stats based on trade
    if trade_data.get("status") == "completed":
        trader["completed_trades"] = trader.get("completed_trades", 0) + 1
        trader["total_volume_usd"] = trader.get("total_volume_usd", 0) + trade_data.get("amount_usd", 0)
    elif trade_data.get("status") == "cancelled":
        trader["cancelled_trades"] = trader.get("cancelled_trades", 0) + 1
    
    trader["total_trades"] = trader.get("completed_trades", 0) + trader.get("cancelled_trades", 0)
    
    # Calculate completion rate
    if trader["total_trades"] > 0:
        trader["completion_rate"] = (trader.get("completed_trades", 0) / trader["total_trades"]) * 100
    
    trader["last_trade_date"] = datetime.now(timezone.utc).isoformat()
    
    # Update database
    await db.trader_profiles.update_one(
        {"user_id": trader_id},
        {"$set": trader},
        upsert=True
    )
    
    # Recalculate badges
    await calculate_trader_badges(db, trader_id)
    
    return {"success": True, "stats_updated": True}
