# 🔒 LOCKED: Merchant Profile & Statistics Service - DO NOT MODIFY
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class MerchantService:
    def __init__(self, db):
        self.db = db
    
    async def initialize_merchant_stats(self, user_id: str):
        """Initialize merchant stats for new trader"""
        try:
            existing = await self.db.merchant_stats.find_one({"user_id": user_id})
            if existing:
                return existing
            
            stats = {
                "user_id": user_id,
                "all_time_trades": 0,
                "all_time_buy_count": 0,
                "all_time_sell_count": 0,
                "thirty_day_trades": 0,
                "thirty_day_completion_rate": 100.0,
                "average_pay_time_seconds": 0,
                "average_release_time_seconds": 0,
                "first_trade_date": None,
                "total_counterparties": 0,
                "counterparties_list": [],
                "successful_trades": 0,
                "cancelled_trades": 0,
                "disputed_trades": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.merchant_stats.insert_one(stats)
            logger.info(f"✅ Initialized merchant stats for {user_id}")
            return stats
        except Exception as e:
            logger.error(f"Error initializing merchant stats: {str(e)}")
            return None
    
    async def update_stats_on_trade_complete(self, trade_id: str, buyer_id: str, seller_id: str):
        """Update stats when trade completes"""
        try:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id}, {"_id": 0})
            if not trade:
                return
            
            # Calculate times
            created_at = datetime.fromisoformat(trade.get("created_at").replace('Z', '+00:00')) if isinstance(trade.get("created_at"), str) else trade.get("created_at")
            marked_paid_at = datetime.fromisoformat(trade.get("buyer_marked_paid_at").replace('Z', '+00:00')) if isinstance(trade.get("buyer_marked_paid_at"), str) else trade.get("buyer_marked_paid_at")
            released_at = datetime.fromisoformat(trade.get("released_at").replace('Z', '+00:00')) if isinstance(trade.get("released_at"), str) else trade.get("released_at")
            
            pay_time = (marked_paid_at - created_at).total_seconds() if marked_paid_at and created_at else 0
            release_time = (released_at - marked_paid_at).total_seconds() if released_at and marked_paid_at else 0
            
            # Update buyer stats
            await self._update_user_stats(buyer_id, {
                "role": "buyer",
                "pay_time": pay_time,
                "counterparty": seller_id,
                "trade_date": created_at
            })
            
            # Update seller stats
            await self._update_user_stats(seller_id, {
                "role": "seller",
                "release_time": release_time,
                "counterparty": buyer_id,
                "trade_date": created_at
            })
            
            logger.info(f"✅ Updated stats for trade {trade_id}")
        except Exception as e:
            logger.error(f"Error updating stats on trade complete: {str(e)}")
    
    async def _update_user_stats(self, user_id: str, trade_data: dict):
        """Update individual user stats"""
        try:
            stats = await self.db.merchant_stats.find_one({"user_id": user_id})
            if not stats:
                stats = await self.initialize_merchant_stats(user_id)
            
            role = trade_data.get("role")
            counterparty = trade_data.get("counterparty")
            trade_date = trade_data.get("trade_date")
            
            # Update counts
            updates = {
                "$inc": {
                    "all_time_trades": 1,
                    "successful_trades": 1
                },
                "$set": {
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$addToSet": {
                    "counterparties_list": counterparty
                }
            }
            
            if role == "buyer":
                updates["$inc"]["all_time_buy_count"] = 1
                if trade_data.get("pay_time"):
                    # Recalculate average pay time
                    current_avg = stats.get("average_pay_time_seconds", 0)
                    current_count = stats.get("all_time_buy_count", 0)
                    new_avg = ((current_avg * current_count) + trade_data["pay_time"]) / (current_count + 1)
                    updates["$set"]["average_pay_time_seconds"] = new_avg
            elif role == "seller":
                updates["$inc"]["all_time_sell_count"] = 1
                if trade_data.get("release_time"):
                    # Recalculate average release time
                    current_avg = stats.get("average_release_time_seconds", 0)
                    current_count = stats.get("all_time_sell_count", 0)
                    new_avg = ((current_avg * current_count) + trade_data["release_time"]) / (current_count + 1)
                    updates["$set"]["average_release_time_seconds"] = new_avg
            
            # Set first trade date
            if not stats.get("first_trade_date"):
                updates["$set"]["first_trade_date"] = trade_date.isoformat() if trade_date else datetime.now(timezone.utc).isoformat()
            
            await self.db.merchant_stats.update_one(
                {"user_id": user_id},
                updates
            )
            
            # Update counterparties count
            updated_stats = await self.db.merchant_stats.find_one({"user_id": user_id})
            if updated_stats:
                counterparties_count = len(updated_stats.get("counterparties_list", []))
                await self.db.merchant_stats.update_one(
                    {"user_id": user_id},
                    {"$set": {"total_counterparties": counterparties_count}}
                )
            
            # Calculate 30-day stats
            await self._calculate_thirty_day_stats(user_id)
            
            # Update merchant rank
            await self.calculate_merchant_rank(user_id)
            
        except Exception as e:
            logger.error(f"Error updating user stats: {str(e)}")
    
    async def _calculate_thirty_day_stats(self, user_id: str):
        """Calculate 30-day statistics"""
        try:
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            # Count completed trades in last 30 days
            pipeline = [
                {
                    "$match": {
                        "$or": [{"buyer_id": user_id}, {"seller_id": user_id}],
                        "status": "completed",
                        "created_at": {"$gte": thirty_days_ago.isoformat()}
                    }
                },
                {"$count": "total"}
            ]
            
            result = await self.db.p2p_trades.aggregate(pipeline).to_list(1)
            thirty_day_trades = result[0]["total"] if result else 0
            
            # Count cancelled trades in last 30 days
            cancelled_pipeline = [
                {
                    "$match": {
                        "$or": [{"buyer_id": user_id}, {"seller_id": user_id}],
                        "status": "cancelled",
                        "created_at": {"$gte": thirty_days_ago.isoformat()}
                    }
                },
                {"$count": "total"}
            ]
            
            cancelled_result = await self.db.p2p_trades.aggregate(cancelled_pipeline).to_list(1)
            cancelled_trades = cancelled_result[0]["total"] if cancelled_result else 0
            
            # Calculate completion rate
            total_trades_30d = thirty_day_trades + cancelled_trades
            completion_rate = (thirty_day_trades / total_trades_30d * 100) if total_trades_30d > 0 else 100.0
            
            await self.db.merchant_stats.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "thirty_day_trades": thirty_day_trades,
                        "thirty_day_completion_rate": round(completion_rate, 2)
                    }
                }
            )
        except Exception as e:
            logger.error(f"Error calculating 30-day stats: {str(e)}")
    
    async def calculate_merchant_rank(self, user_id: str):
        """Calculate merchant rank based on criteria"""
        try:
            stats = await self.db.merchant_stats.find_one({"user_id": user_id}, {"_id": 0})
            deposit = await self.db.merchant_deposits.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
            
            if not stats:
                return
            
            total_trades = stats.get("all_time_trades", 0)
            completion_rate = stats.get("thirty_day_completion_rate", 0)
            avg_release_time = stats.get("average_release_time_seconds", 0)
            deposit_amount = deposit.get("amount", 0) if deposit else 0
            
            # Rank logic
            rank = "none"
            
            if total_trades >= 100 and completion_rate >= 98 and avg_release_time <= 300 and deposit_amount >= 10000:
                rank = "platinum"
            elif total_trades >= 50 and completion_rate >= 95 and avg_release_time <= 600 and deposit_amount >= 5000:
                rank = "gold"
            elif total_trades >= 20 and completion_rate >= 90 and avg_release_time <= 900 and deposit_amount >= 1000:
                rank = "silver"
            elif total_trades >= 10 and completion_rate >= 85 and deposit_amount >= 500:
                rank = "bronze"
            
            await self.db.merchant_ranks.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "rank": rank,
                        "total_trades": total_trades,
                        "completion_rate": completion_rate,
                        "avg_release_time": avg_release_time,
                        "deposit_amount": deposit_amount,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            logger.info(f"✅ Updated merchant rank for {user_id}: {rank}")
        except Exception as e:
            logger.error(f"Error calculating merchant rank: {str(e)}")
    
    async def get_merchant_profile(self, user_id: str) -> Optional[Dict]:
        """Get complete merchant profile"""
        try:
            stats = await self.db.merchant_stats.find_one({"user_id": user_id}, {"_id": 0})
            rank = await self.db.merchant_ranks.find_one({"user_id": user_id}, {"_id": 0})
            deposit = await self.db.merchant_deposits.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
            user = await self.db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
            verifications = await self.db.user_verifications.find_one({"user_id": user_id}, {"_id": 0})
            
            # Get account age
            account_age_days = 0
            if user and user.get("created_at"):
                try:
                    created = datetime.fromisoformat(user["created_at"].replace('Z', '+00:00')) if isinstance(user["created_at"], str) else user["created_at"]
                    # Ensure both datetimes are timezone-aware
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                    account_age_days = (datetime.now(timezone.utc) - created).days
                except:
                    account_age_days = 0
            
            # Get active ads
            active_ads = await self.db.p2p_listings.find(
                {"seller_uid": user_id, "status": "active"},
                {"_id": 0}
            ).to_list(100)
            
            profile = {
                "user_id": user_id,
                "email": user.get("email") if user else None,
                "username": user.get("username") if user else user_id[:8],
                "stats": stats or {},
                "rank": rank.get("rank") if rank else "none",
                "deposit": deposit,
                "account_age_days": account_age_days,
                "verifications": {
                    "email": verifications.get("email_verified") if verifications else False,
                    "sms": verifications.get("sms_verified") if verifications else False,
                    "address": verifications.get("address_verified") if verifications else False
                },
                "active_ads": active_ads
            }
            
            return profile
        except Exception as e:
            logger.error(f"Error getting merchant profile: {str(e)}")
            return None
# 🔒 END LOCKED SECTION
