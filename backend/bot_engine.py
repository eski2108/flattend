"""
🟥🔴🔥 LOCKED: EXISTING TRADING MATCHING/ROUTING/PRICING/LIQUIDITY MUST NOT BE MODIFIED.
BOT FEATURE IS ADDITIVE ONLY. ANY CORE CHANGE REQUIRES WRITTEN APPROVAL. 🔥🔴🟥

Trading Bot Engine Service for CoinHubX
- Grid Bot
- DCA Bot
- Uses EXISTING trading endpoints only
- New collections only (bot_configs, bot_state, bot_actions_log, bot_pnl)
"""

import os
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.coinhubx

# Collections (NEW ONLY - no existing collections modified)
bot_configs = db.bot_configs
bot_state = db.bot_state
bot_actions_log = db.bot_actions_log
bot_pnl = db.bot_pnl

# Limits
MAX_BOTS_FREE = 1
MAX_BOTS_PRO = 10
MAX_ORDERS_PER_BOT = 50
BOT_ENGINE_ENABLED = True  # Admin kill switch


class BotEngine:
    """Trading Bot Engine - Grid and DCA bots"""
    
    @staticmethod
    async def create_bot(
        user_id: str,
        bot_type: str,  # 'grid' or 'dca'
        pair: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new trading bot configuration.
        Bot starts in PAUSED state.
        """
        if not BOT_ENGINE_ENABLED:
            return {"success": False, "error": "Bot engine is currently disabled"}
        
        # Check user's existing bots count
        existing_bots = await bot_configs.count_documents({"user_id": user_id, "status": {"$ne": "deleted"}})
        
        # TODO: Check subscription tier for limits
        if existing_bots >= MAX_BOTS_FREE:
            return {"success": False, "error": f"Maximum {MAX_BOTS_FREE} bots allowed. Upgrade to Pro for more."}
        
        # Validate bot type
        if bot_type not in ['grid', 'dca']:
            return {"success": False, "error": "Invalid bot type. Use 'grid' or 'dca'"}
        
        # Validate params based on bot type
        validation = await BotEngine._validate_params(bot_type, params)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}
        
        bot_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        bot_config = {
            "bot_id": bot_id,
            "user_id": user_id,
            "type": bot_type,
            "pair": pair,
            "params": params,
            "status": "paused",  # Starts paused
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "stopped_at": None
        }
        
        await bot_configs.insert_one(bot_config)
        
        # Initialize bot state
        await bot_state.insert_one({
            "bot_id": bot_id,
            "last_price": 0,
            "active_orders": [],
            "total_orders_placed": 0,
            "total_orders_filled": 0,
            "runtime_seconds": 0,
            "last_action_at": None
        })
        
        # Initialize PnL tracking
        await bot_pnl.insert_one({
            "bot_id": bot_id,
            "realized_pnl": 0,
            "unrealized_pnl": 0,
            "total_invested": params.get("investment_amount", 0),
            "fees_paid": 0,
            "trades_count": 0
        })
        
        # Log action
        await BotEngine._log_action(bot_id, "create", {"params": params})
        
        return {
            "success": True,
            "bot_id": bot_id,
            "message": "Bot created successfully. Click 'Start Bot' to begin trading."
        }
    
    @staticmethod
    async def _validate_params(bot_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate bot parameters"""
        if bot_type == 'grid':
            required = ['investment_amount', 'lower_price', 'upper_price', 'grid_count']
            for field in required:
                if field not in params:
                    return {"valid": False, "error": f"Missing required field: {field}"}
            
            if params['lower_price'] >= params['upper_price']:
                return {"valid": False, "error": "Lower price must be less than upper price"}
            
            if params['grid_count'] < 2 or params['grid_count'] > 100:
                return {"valid": False, "error": "Grid count must be between 2 and 100"}
            
            if params['investment_amount'] <= 0:
                return {"valid": False, "error": "Investment amount must be positive"}
        
        elif bot_type == 'dca':
            required = ['amount_per_interval', 'interval', 'total_budget']
            for field in required:
                if field not in params:
                    return {"valid": False, "error": f"Missing required field: {field}"}
            
            if params['interval'] not in ['hourly', 'daily', 'weekly']:
                return {"valid": False, "error": "Interval must be 'hourly', 'daily', or 'weekly'"}
            
            if params['amount_per_interval'] <= 0:
                return {"valid": False, "error": "Amount per interval must be positive"}
        
        return {"valid": True}
    
    @staticmethod
    async def start_bot(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Start a paused bot"""
        if not BOT_ENGINE_ENABLED:
            return {"success": False, "error": "Bot engine is currently disabled"}
        
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        if bot["status"] == "running":
            return {"success": False, "error": "Bot is already running"}
        
        if bot["status"] == "deleted":
            return {"success": False, "error": "Bot has been deleted"}
        
        # TODO: Verify user has sufficient balance for the bot
        # This would use existing wallet balance endpoint
        
        now = datetime.utcnow()
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "running", "started_at": now, "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "start", {})
        
        return {"success": True, "message": "Bot started successfully"}
    
    @staticmethod
    async def pause_bot(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Pause a running bot"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        if bot["status"] != "running":
            return {"success": False, "error": "Bot is not running"}
        
        now = datetime.utcnow()
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "paused", "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "pause", {})
        
        return {"success": True, "message": "Bot paused successfully"}
    
    @staticmethod
    async def stop_bot(bot_id: str, user_id: str, cancel_orders: bool = True) -> Dict[str, Any]:
        """Stop a bot and optionally cancel all open orders"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        now = datetime.utcnow()
        
        # Get bot state for active orders
        state = await bot_state.find_one({"bot_id": bot_id})
        cancelled_orders = []
        
        if cancel_orders and state and state.get("active_orders"):
            # TODO: Cancel orders via existing trading endpoint
            # For now, just clear the list
            cancelled_orders = state.get("active_orders", [])
            await bot_state.update_one(
                {"bot_id": bot_id},
                {"$set": {"active_orders": []}}
            )
        
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "stopped", "stopped_at": now, "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "stop", {"cancel_orders": cancel_orders, "cancelled": len(cancelled_orders)})
        
        return {
            "success": True,
            "message": "Bot stopped successfully",
            "cancelled_orders": len(cancelled_orders)
        }
    
    @staticmethod
    async def delete_bot(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Delete a bot (soft delete)"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        if bot["status"] == "running":
            # Stop first
            await BotEngine.stop_bot(bot_id, user_id, cancel_orders=True)
        
        now = datetime.utcnow()
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "deleted", "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "delete", {})
        
        return {"success": True, "message": "Bot deleted successfully"}
    
    @staticmethod
    async def get_user_bots(user_id: str, include_deleted: bool = False) -> List[Dict[str, Any]]:
        """Get all bots for a user"""
        query = {"user_id": user_id}
        if not include_deleted:
            query["status"] = {"$ne": "deleted"}
        
        bots = []
        async for bot in bot_configs.find(query).sort("created_at", -1):
            # Get state and PnL
            state = await bot_state.find_one({"bot_id": bot["bot_id"]})
            pnl = await bot_pnl.find_one({"bot_id": bot["bot_id"]})
            
            bot_data = {
                "bot_id": bot["bot_id"],
                "type": bot["type"],
                "pair": bot["pair"],
                "status": bot["status"],
                "params": bot["params"],
                "created_at": bot["created_at"].isoformat() if bot.get("created_at") else None,
                "started_at": bot["started_at"].isoformat() if bot.get("started_at") else None,
                "stopped_at": bot["stopped_at"].isoformat() if bot.get("stopped_at") else None,
                "state": {
                    "active_orders_count": len(state.get("active_orders", [])) if state else 0,
                    "total_orders_placed": state.get("total_orders_placed", 0) if state else 0,
                    "last_action_at": state.get("last_action_at").isoformat() if state and state.get("last_action_at") else None
                },
                "pnl": {
                    "realized_pnl": pnl.get("realized_pnl", 0) if pnl else 0,
                    "unrealized_pnl": pnl.get("unrealized_pnl", 0) if pnl else 0,
                    "total_invested": pnl.get("total_invested", 0) if pnl else 0,
                    "fees_paid": pnl.get("fees_paid", 0) if pnl else 0,
                    "trades_count": pnl.get("trades_count", 0) if pnl else 0
                }
            }
            bots.append(bot_data)
        
        return bots
    
    @staticmethod
    async def get_bot(bot_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific bot with full details"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return None
        
        state = await bot_state.find_one({"bot_id": bot_id})
        pnl = await bot_pnl.find_one({"bot_id": bot_id})
        
        # Get recent logs
        logs = []
        async for log in bot_actions_log.find({"bot_id": bot_id}).sort("timestamp", -1).limit(20):
            logs.append({
                "action": log["action"],
                "timestamp": log["timestamp"].isoformat() if log.get("timestamp") else None,
                "payload": log.get("payload", {}),
                "result": log.get("result")
            })
        
        return {
            "bot_id": bot["bot_id"],
            "type": bot["type"],
            "pair": bot["pair"],
            "status": bot["status"],
            "params": bot["params"],
            "created_at": bot["created_at"].isoformat() if bot.get("created_at") else None,
            "started_at": bot["started_at"].isoformat() if bot.get("started_at") else None,
            "stopped_at": bot["stopped_at"].isoformat() if bot.get("stopped_at") else None,
            "state": state if state else {},
            "pnl": pnl if pnl else {},
            "recent_logs": logs
        }
    
    @staticmethod
    async def get_bot_logs(bot_id: str, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get action logs for a bot"""
        # Verify ownership
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return []
        
        logs = []
        async for log in bot_actions_log.find({"bot_id": bot_id}).sort("timestamp", -1).limit(limit):
            logs.append({
                "action": log["action"],
                "timestamp": log["timestamp"].isoformat() if log.get("timestamp") else None,
                "payload": log.get("payload", {}),
                "result": log.get("result")
            })
        
        return logs
    
    @staticmethod
    async def _log_action(bot_id: str, action: str, payload: Dict[str, Any], result: str = "success"):
        """Log a bot action"""
        await bot_actions_log.insert_one({
            "bot_id": bot_id,
            "action": action,
            "timestamp": datetime.utcnow(),
            "payload": payload,
            "result": result
        })
    
    @staticmethod
    async def get_bot_preview(bot_type: str, pair: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a preview of what the bot will do (orders, investment, fees)"""
        if bot_type == 'grid':
            lower = params.get('lower_price', 0)
            upper = params.get('upper_price', 0)
            grid_count = params.get('grid_count', 5)
            investment = params.get('investment_amount', 0)
            
            if lower >= upper or grid_count < 2:
                return {"error": "Invalid parameters"}
            
            grid_step = (upper - lower) / (grid_count - 1)
            grid_prices = [lower + (i * grid_step) for i in range(grid_count)]
            amount_per_grid = investment / grid_count
            
            # Estimate fees (using 0.1% as example)
            fee_rate = 0.001
            estimated_fees = investment * fee_rate * 2  # Buy + sell
            
            return {
                "bot_type": "grid",
                "pair": pair,
                "grid_prices": grid_prices,
                "grid_count": grid_count,
                "amount_per_grid": round(amount_per_grid, 2),
                "total_investment": investment,
                "estimated_orders": grid_count,
                "price_range": f"${lower} - ${upper}",
                "estimated_fees": round(estimated_fees, 2)
            }
        
        elif bot_type == 'dca':
            amount = params.get('amount_per_interval', 0)
            interval = params.get('interval', 'daily')
            budget = params.get('total_budget', 0)
            
            intervals_map = {'hourly': 24, 'daily': 1, 'weekly': 1/7}
            intervals_per_day = intervals_map.get(interval, 1)
            
            total_orders = int(budget / amount) if amount > 0 else 0
            duration_days = total_orders / intervals_per_day if intervals_per_day > 0 else 0
            
            fee_rate = 0.001
            estimated_fees = budget * fee_rate
            
            return {
                "bot_type": "dca",
                "pair": pair,
                "amount_per_order": amount,
                "interval": interval,
                "total_budget": budget,
                "estimated_orders": total_orders,
                "estimated_duration_days": round(duration_days, 1),
                "estimated_fees": round(estimated_fees, 2)
            }
        
        return {"error": "Invalid bot type"}


# Admin functions
class BotAdmin:
    """Admin controls for bot engine"""
    
    @staticmethod
    async def toggle_engine(enabled: bool):
        """Enable/disable the bot engine globally"""
        global BOT_ENGINE_ENABLED
        BOT_ENGINE_ENABLED = enabled
        logger.info(f"Bot engine {'enabled' if enabled else 'disabled'}")
        return {"success": True, "enabled": enabled}
    
    @staticmethod
    async def get_all_running_bots() -> List[Dict[str, Any]]:
        """Get all currently running bots (admin view)"""
        bots = []
        async for bot in bot_configs.find({"status": "running"}):
            bots.append({
                "bot_id": bot["bot_id"],
                "user_id": bot["user_id"],
                "type": bot["type"],
                "pair": bot["pair"],
                "started_at": bot.get("started_at")
            })
        return bots
    
    @staticmethod
    async def force_stop_all():
        """Emergency stop all running bots"""
        result = await bot_configs.update_many(
            {"status": "running"},
            {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
        )
        logger.warning(f"Emergency stop: {result.modified_count} bots stopped")
        return {"success": True, "stopped_count": result.modified_count}
