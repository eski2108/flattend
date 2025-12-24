"""
🚨🚨🚨 BACKEND + TRADING + P2P + SAVINGS ARE LOCKED.
DO NOT CHANGE ANY EXISTING FLOW/UI/LOGIC OUTSIDE THIS BOT FEATURE.
NO "IMPROVEMENTS". NO REFACTOR. ONLY BOT ADDITION + REQUIRED HOOKS.
ANY OTHER CHANGE REQUIRES WRITTEN APPROVAL. 🚨🚨🚨

NATIVE TRADING BOT ENGINE - CoinHubX
- Grid Bot (Spot)
- DCA Bot (Recurring Buy/Sell)
- Uses USER FUNDS ONLY (wallet balances)
- Bot is a CONTROLLER - calls EXISTING trading endpoint
- Fees are charged by EXISTING fee system (same as manual trades)
- NO new fee logic, NO new revenue collection
"""

import os
import uuid
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]

# NEW Collections (bot feature only - ALLOWED)
bot_configs = db.bot_configs
bot_runs = db.bot_runs
bot_orders = db.bot_orders  # References to real trades in spot_trades

# Subscription Tiers
SUBSCRIPTION_TIERS = {
    'free': {'max_bots': 1, 'price_gbp': 0},
    'pro': {'max_bots': 5, 'price_gbp': 19.99},
    'elite': {'max_bots': 20, 'price_gbp': 49.99}
}

# Engine Control
BOT_ENGINE_ENABLED = True


class BotEngine:
    """
    Native Trading Bot Engine
    
    IMPORTANT: This bot is a CONTROLLER only.
    - It decides WHEN to place trades
    - All trades go through the EXISTING /api/trading/place-order endpoint
    - EXISTING matching, fees, settlement logic apply
    - Fees land in EXISTING admin_revenue and fee_transactions tables
    """
    
    @staticmethod
    async def create_bot(
        user_id: str,
        bot_type: str,
        pair: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new trading bot.
        Checks subscription limits before creation.
        Bot starts in PAUSED state.
        """
        if not BOT_ENGINE_ENABLED:
            return {"success": False, "error": "Bot engine is currently disabled"}
        
        # Check subscription tier and bot limit
        user_tier = await BotEngine._get_user_tier(user_id)
        tier_config = SUBSCRIPTION_TIERS.get(user_tier, SUBSCRIPTION_TIERS['free'])
        
        active_bots = await bot_configs.count_documents({
            "user_id": user_id, 
            "status": {"$in": ["running", "paused"]}
        })
        
        if active_bots >= tier_config['max_bots']:
            return {
                "success": False, 
                "error": f"Bot limit reached ({tier_config['max_bots']}). Upgrade to create more bots.",
                "upgrade_required": True,
                "current_tier": user_tier
            }
        
        # Validate bot type
        if bot_type not in ['grid', 'dca', 'signal']:
            return {"success": False, "error": "Invalid bot type. Use 'grid', 'dca', or 'signal'"}
        
        # Validate params
        validation = await BotEngine._validate_params(bot_type, params)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}
        
        bot_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Get trading fee from platform settings (same as manual trading)
        trading_fee_percent = 0.1  # Default
        try:
            fee_config = await db.platform_fees.find_one({"config_id": "main"})
            if fee_config:
                trading_fee_percent = fee_config.get("spot_trading_fee_percent", 0.1)
        except:
            pass
        
        # Calculate estimated fees using platform fee rate
        investment = params.get('investment_amount', 0) or params.get('total_budget', 0)
        estimated_fees = investment * (trading_fee_percent / 100) * 2  # Buy + Sell
        
        bot_config = {
            "bot_id": bot_id,
            "user_id": user_id,
            "type": bot_type,
            "pair": pair,
            "params": params,
            "status": "paused",
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "stopped_at": None,
            # Stats - calculated from spot_trades where source='bot' and bot_id=this
            "state": {
                "total_invested": 0,
                "realized_pnl": 0,
                "unrealized_pnl": 0,
                "total_fees_paid": 0,
                "trades_count": 0,
                "total_orders_placed": 0,
                "active_orders_count": 0,
                "last_tick_at": None
            }
        }
        
        await bot_configs.insert_one(bot_config)
        
        # Log creation
        await BotEngine._log_action(bot_id, "create", {"params": params})
        
        return {
            "success": True,
            "bot_id": bot_id,
            "estimated_fees": round(estimated_fees, 2),
            "message": "Bot created. Click 'Start Bot' to begin."
        }
    
    @staticmethod
    async def _get_user_tier(user_id: str) -> str:
        """Get user's subscription tier"""
        sub = await db.subscriptions.find_one({
            "user_id": user_id,
            "status": "active",
            "features": {"$in": ["trading_bots", "pro_bots", "elite_bots"]}
        })
        
        if sub:
            if "elite_bots" in sub.get("features", []):
                return "elite"
            elif "pro_bots" in sub.get("features", []):
                return "pro"
        
        return "free"
    
    @staticmethod
    async def _validate_params(bot_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate bot parameters"""
        if bot_type == 'grid':
            required = ['investment_amount', 'lower_price', 'upper_price', 'grid_count']
            for field in required:
                if field not in params or params[field] is None:
                    return {"valid": False, "error": f"Missing required field: {field}"}
            
            if params['lower_price'] >= params['upper_price']:
                return {"valid": False, "error": "Lower price must be less than upper price"}
            
            if params['grid_count'] < 2 or params['grid_count'] > 100:
                return {"valid": False, "error": "Grid count must be between 2 and 100"}
            
            if params['investment_amount'] <= 0:
                return {"valid": False, "error": "Investment amount must be positive"}
        
        elif bot_type == 'dca':
            required = ['amount_per_interval', 'interval']
            for field in required:
                if field not in params or params[field] is None:
                    return {"valid": False, "error": f"Missing required field: {field}"}
            
            params['side'] = params.get('side', 'buy')
            if params['side'] not in ['buy', 'sell']:
                return {"valid": False, "error": "Side must be 'buy' or 'sell'"}
            
            valid_intervals = ['hourly', 'daily', 'weekly']
            if params['interval'] not in valid_intervals:
                return {"valid": False, "error": f"Interval must be one of: {', '.join(valid_intervals)}"}
            
            if params['amount_per_interval'] <= 0:
                return {"valid": False, "error": "Amount per interval must be positive"}
        
        elif bot_type == 'signal':
            # Signal bot requires entry rules at minimum
            entry_rules = params.get('entry_rules')
            if not entry_rules:
                return {"valid": False, "error": "Signal bot requires entry_rules"}
            
            if not isinstance(entry_rules, dict) or 'conditions' not in entry_rules:
                return {"valid": False, "error": "entry_rules must have 'conditions' array"}
            
            if not entry_rules['conditions']:
                return {"valid": False, "error": "At least one entry condition is required"}
            
            # Validate order_amount
            if params.get('order_amount', 0) <= 0:
                return {"valid": False, "error": "order_amount must be positive"}
            
            # Validate side
            params['side'] = params.get('side', 'buy')
            if params['side'] not in ['buy', 'sell', 'both']:
                return {"valid": False, "error": "Side must be 'buy', 'sell', or 'both'"}
        
        return {"valid": True}
    
    @staticmethod
    async def start_bot(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Start a paused/stopped bot"""
        if not BOT_ENGINE_ENABLED:
            return {"success": False, "error": "Bot engine is currently disabled"}
        
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        if bot["status"] == "running":
            return {"success": False, "error": "Bot is already running"}
        
        if bot["status"] == "deleted":
            return {"success": False, "error": "Bot has been deleted"}
        
        # Verify user has sufficient balance
        balance_check = await BotEngine._check_user_balance(user_id, bot)
        if not balance_check["sufficient"]:
            return {"success": False, "error": balance_check["error"]}
        
        now = datetime.now(timezone.utc)
        run_id = str(uuid.uuid4())
        
        # Create new run record
        await bot_runs.insert_one({
            "bot_id": bot_id,
            "run_id": run_id,
            "started_at": now,
            "stopped_at": None,
            "status": "running",
            "last_tick_at": now
        })
        
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {
                "status": "running", 
                "started_at": now, 
                "updated_at": now,
                "current_run_id": run_id
            }}
        )
        
        await BotEngine._log_action(bot_id, "start", {"run_id": run_id})
        
        return {"success": True, "message": "Bot started", "run_id": run_id}
    
    @staticmethod
    async def _check_user_balance(user_id: str, bot: Dict) -> Dict[str, Any]:
        """Check if user has sufficient balance for the bot"""
        # Get required amount based on bot type
        if bot["type"] == "grid":
            required = bot["params"].get("investment_amount", 0)
        else:  # dca
            required = bot["params"].get("amount_per_interval", 0)
        
        # Check GBP wallet balance (using new wallet schema)
        wallet = await db.wallets.find_one({"user_id": user_id, "currency": "GBP"})
        if not wallet:
            return {"sufficient": False, "error": "GBP wallet not found"}
        
        available = wallet.get("total_balance", 0) - wallet.get("locked_balance", 0)
        
        if available < required:
            return {
                "sufficient": False, 
                "error": f"Insufficient GBP balance. Required: £{required:.2f}, Available: £{available:.2f}"
            }
        
        return {"sufficient": True}
    
    @staticmethod
    async def pause_bot(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Pause a running bot"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        if bot["status"] != "running":
            return {"success": False, "error": "Bot is not running"}
        
        now = datetime.now(timezone.utc)
        
        # Update run record
        if bot.get("current_run_id"):
            await bot_runs.update_one(
                {"run_id": bot["current_run_id"]},
                {"$set": {"status": "paused", "stopped_at": now}}
            )
        
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "paused", "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "pause", {})
        
        return {"success": True, "message": "Bot paused"}
    
    @staticmethod
    async def stop_bot(bot_id: str, user_id: str, cancel_orders: bool = True) -> Dict[str, Any]:
        """Stop a bot and optionally cancel pending orders"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        now = datetime.now(timezone.utc)
        cancelled_count = 0
        
        if cancel_orders:
            # Cancel all pending orders for this bot
            result = await bot_orders.update_many(
                {"bot_id": bot_id, "status": "pending"},
                {"$set": {"status": "cancelled", "updated_at": now}}
            )
            cancelled_count = result.modified_count
        
        # Update run record
        if bot.get("current_run_id"):
            await bot_runs.update_one(
                {"run_id": bot["current_run_id"]},
                {"$set": {"status": "stopped", "stopped_at": now}}
            )
        
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {
                "status": "stopped", 
                "stopped_at": now, 
                "updated_at": now,
                "current_run_id": None
            }}
        )
        
        await BotEngine._log_action(bot_id, "stop", {"cancelled_orders": cancelled_count})
        
        return {
            "success": True, 
            "message": "Bot stopped",
            "cancelled_orders": cancelled_count
        }
    
    @staticmethod
    async def delete_bot(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Soft delete a bot"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"success": False, "error": "Bot not found"}
        
        # Stop first if running
        if bot["status"] == "running":
            await BotEngine.stop_bot(bot_id, user_id, cancel_orders=True)
        
        now = datetime.now(timezone.utc)
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "deleted", "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "delete", {})
        
        return {"success": True, "message": "Bot deleted"}
    
    @staticmethod
    async def get_user_bots(user_id: str) -> List[Dict[str, Any]]:
        """Get all bots for a user with real stats from spot_trades"""
        bots = []
        async for bot in bot_configs.find({
            "user_id": user_id, 
            "status": {"$ne": "deleted"}
        }).sort("created_at", -1):
            
            # Get real stats from spot_trades (EXISTING table)
            bot_id = bot["bot_id"]
            pnl_data = await BotEngine._calculate_pnl_from_trades(bot_id)
            
            bots.append({
                "bot_id": bot_id,
                "type": bot["type"],
                "pair": bot["pair"],
                "status": bot["status"],
                "params": bot["params"],
                "created_at": bot["created_at"].isoformat() if bot.get("created_at") else None,
                "started_at": bot["started_at"].isoformat() if bot.get("started_at") else None,
                "pnl": pnl_data,
                "state": bot.get("state", {})
            })
        return bots
    
    @staticmethod
    async def _calculate_pnl_from_trades(bot_id: str) -> Dict[str, Any]:
        """
        Calculate PnL from EXISTING spot_trades table
        Filters by source='bot' and bot_id
        """
        pipeline = [
            {"$match": {"source": "bot", "bot_id": bot_id}},
            {"$group": {
                "_id": None,
                "total_buy_value": {
                    "$sum": {"$cond": [{"$eq": ["$type", "buy"]}, "$total", 0]}
                },
                "total_sell_value": {
                    "$sum": {"$cond": [{"$eq": ["$type", "sell"]}, "$total", 0]}
                },
                "total_fees": {"$sum": "$fee_amount"},
                "trade_count": {"$sum": 1}
            }}
        ]
        
        result = await db.spot_trades.aggregate(pipeline).to_list(1)
        
        if result:
            data = result[0]
            realized_pnl = data["total_sell_value"] - data["total_buy_value"] - data["total_fees"]
            return {
                "realized_pnl": round(realized_pnl, 2),
                "unrealized_pnl": 0,  # Would need current position value
                "total_invested": round(data["total_buy_value"], 2),
                "total_fees_paid": round(data["total_fees"], 2),
                "trades_count": data["trade_count"]
            }
        
        return {
            "realized_pnl": 0,
            "unrealized_pnl": 0,
            "total_invested": 0,
            "total_fees_paid": 0,
            "trades_count": 0
        }
    
    @staticmethod
    async def get_bot_status(bot_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed status of a bot"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return None
        
        # Get active orders count
        active_orders = await bot_orders.count_documents({
            "bot_id": bot_id, "status": "pending"
        })
        
        # Get recent trades from EXISTING spot_trades
        recent_trades = []
        async for trade in db.spot_trades.find({
            "source": "bot", 
            "bot_id": bot_id
        }).sort("created_at", -1).limit(10):
            recent_trades.append({
                "trade_id": trade["trade_id"],
                "type": trade.get("type"),
                "price": trade["price"],
                "amount": trade["amount"],
                "fee": trade["fee_amount"],
                "timestamp": trade["created_at"].isoformat() if trade.get("created_at") else None
            })
        
        pnl_data = await BotEngine._calculate_pnl_from_trades(bot_id)
        
        return {
            "bot_id": bot["bot_id"],
            "type": bot["type"],
            "pair": bot["pair"],
            "status": bot["status"],
            "params": bot["params"],
            "created_at": bot["created_at"].isoformat() if bot.get("created_at") else None,
            "started_at": bot["started_at"].isoformat() if bot.get("started_at") else None,
            "stopped_at": bot["stopped_at"].isoformat() if bot.get("stopped_at") else None,
            "stats": {
                **pnl_data,
                "active_orders": active_orders
            },
            "recent_trades": recent_trades
        }
    
    @staticmethod
    async def get_bot_trades(bot_id: str, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get trade history for a bot from EXISTING spot_trades"""
        # Verify ownership
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return []
        
        trades = []
        async for trade in db.spot_trades.find({
            "source": "bot",
            "bot_id": bot_id
        }).sort("created_at", -1).limit(limit):
            trades.append({
                "trade_id": trade["trade_id"],
                "type": trade.get("type"),
                "pair": trade.get("pair"),
                "price": trade["price"],
                "amount": trade["amount"],
                "total": trade["total"],
                "fee": trade["fee_amount"],
                "timestamp": trade["created_at"].isoformat() if trade.get("created_at") else None
            })
        return trades
    
    @staticmethod
    async def get_bot_pnl(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Get PnL summary for a bot"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"error": "Bot not found"}
        
        return await BotEngine._calculate_pnl_from_trades(bot_id)
    
    @staticmethod
    async def get_preview(bot_type: str, pair: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get preview of bot configuration"""
        # Get trading fee from platform settings (SAME as manual trading)
        trading_fee_percent = 0.1
        try:
            fee_config = await db.platform_fees.find_one({"config_id": "main"})
            if fee_config:
                trading_fee_percent = fee_config.get("spot_trading_fee_percent", 0.1)
        except:
            pass
        
        fee_rate = trading_fee_percent / 100
        
        if bot_type == 'grid':
            lower = params.get('lower_price', 0)
            upper = params.get('upper_price', 0)
            grid_count = params.get('grid_count', 5)
            investment = params.get('investment_amount', 0)
            mode = params.get('mode', 'arithmetic')
            
            if lower >= upper or grid_count < 2:
                return {"error": "Invalid parameters"}
            
            amount_per_grid = investment / grid_count
            estimated_fees = investment * fee_rate * 2  # Buy + Sell
            
            return {
                "bot_type": "grid",
                "pair": pair,
                "mode": mode.capitalize() if mode else "Arithmetic",
                "grid_count": grid_count,
                "price_range": f"${lower:,.2f} - ${upper:,.2f}",
                "amount_per_grid": round(amount_per_grid, 2),
                "total_investment": investment,
                "estimated_orders": grid_count * 2,
                "estimated_fees": round(estimated_fees, 2),
                "fee_rate": f"{trading_fee_percent}%"
            }
        
        elif bot_type == 'dca':
            order_size = params.get('amount_per_interval', 0)
            interval = params.get('interval', 'daily')
            side = params.get('side', 'buy')
            total_budget = params.get('total_budget', order_size * 10)
            
            interval_days = {'hourly': 1/24, 'daily': 1, 'weekly': 7}
            days = interval_days.get(interval, 1)
            
            total_orders = int(total_budget / order_size) if order_size > 0 else 0
            duration_days = total_orders * days
            estimated_fees = total_budget * fee_rate
            
            return {
                "bot_type": "dca",
                "pair": pair,
                "side": side.upper() if side else "BUY",
                "order_size": order_size,
                "interval": interval,
                "total_budget": total_budget,
                "estimated_orders": total_orders,
                "estimated_duration_days": round(duration_days, 1),
                "estimated_fees": round(estimated_fees, 2),
                "fee_rate": f"{trading_fee_percent}%"
            }
        
        return {"error": "Invalid bot type"}
    
    @staticmethod
    async def place_bot_order(
        bot_id: str,
        user_id: str,
        pair: str,
        order_type: str,
        amount: float,
        price: float,
        strategy_type: str
    ) -> Dict[str, Any]:
        """
        Place a trade order through the EXISTING trading system.
        
        THIS IS THE KEY FUNCTION:
        - Bot calls this to place orders
        - It calls the EXISTING /api/trading/place-order logic
        - EXISTING fees apply
        - EXISTING settlement applies
        - Just adds bot metadata for filtering
        """
        # Get trading fee from platform settings
        fee_percent = 0.1
        try:
            fee_config = await db.platform_fees.find_one({"config_id": "main"})
            if fee_config:
                fee_percent = fee_config.get("spot_trading_fee_percent", 0.1)
        except:
            pass
        
        # Import the trading logic (circular import handled at runtime)
        try:
            from server import place_trading_order, Request
            
            # Create a mock request object
            request_data = {
                "user_id": user_id,
                "pair": pair,
                "type": order_type,
                "amount": amount,
                "price": price,
                "fee_percent": fee_percent,
                # BOT METADATA - will be added to spot_trades and fee_transactions
                "source": "bot",
                "bot_id": bot_id,
                "strategy_type": strategy_type
            }
            
            # Call existing trading endpoint logic directly
            result = await place_trading_order(None, request_data)
            
            if result.get("success"):
                trade_id = result["trade"]["trade_id"]
                
                # Record order reference in bot_orders
                await bot_orders.insert_one({
                    "order_id": str(uuid.uuid4()),
                    "bot_id": bot_id,
                    "trade_id": trade_id,
                    "pair": pair,
                    "type": order_type,
                    "price": price,
                    "amount": amount,
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc)
                })
                
                # Update bot stats
                await bot_configs.update_one(
                    {"bot_id": bot_id},
                    {
                        "$inc": {"state.total_orders_placed": 1},
                        "$set": {"state.last_tick_at": datetime.now(timezone.utc)}
                    }
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Bot order placement failed: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def _log_action(bot_id: str, action: str, payload: Dict[str, Any]):
        """Log bot action"""
        await db.bot_actions_log.insert_one({
            "bot_id": bot_id,
            "action": action,
            "timestamp": datetime.now(timezone.utc),
            "payload": payload
        })


class BotAdmin:
    """Admin functions for bot management"""
    
    @staticmethod
    async def get_stats() -> Dict[str, Any]:
        """
        Get bot statistics for admin dashboard
        Reads from EXISTING tables with source='bot' filter
        """
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Active bots
        active_bots = await bot_configs.count_documents({"status": "running"})
        total_bots = await bot_configs.count_documents({"status": {"$ne": "deleted"}})
        
        # Bot users
        pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "total"}
        ]
        user_result = await bot_configs.aggregate(pipeline).to_list(1)
        total_bot_users = user_result[0]["total"] if user_result else 0
        
        # 24h bot trading fees from EXISTING fee_transactions (filtered by source='bot')
        fee_pipeline = [
            {"$match": {"source": "bot", "timestamp": {"$gte": day_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        fee_result = await db.fee_transactions.aggregate(fee_pipeline).to_list(1)
        fees_24h = fee_result[0]["total"] if fee_result else 0
        
        # Bot trading volume from EXISTING spot_trades
        volume_pipeline = [
            {"$match": {"source": "bot", "created_at": {"$gte": day_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        volume_result = await db.spot_trades.aggregate(volume_pipeline).to_list(1)
        volume_24h = volume_result[0]["total"] if volume_result else 0
        
        # MTD subscription revenue (if subscriptions exist)
        sub_pipeline = [
            {"$match": {
                "features": {"$in": ["trading_bots", "pro_bots", "elite_bots"]},
                "created_at": {"$gte": month_start}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$price_gbp"}}}
        ]
        sub_result = await db.subscriptions.aggregate(sub_pipeline).to_list(1)
        subscription_mtd = sub_result[0]["total"] if sub_result else 0
        
        return {
            "active_bots": active_bots,
            "total_bots": total_bots,
            "total_bot_users": total_bot_users,
            "fees_24h": round(fees_24h, 2),
            "volume_24h": round(volume_24h, 2),
            "subscription_revenue_mtd": round(subscription_mtd, 2)
        }
    
    @staticmethod
    async def toggle_engine(enabled: bool) -> Dict[str, Any]:
        """Enable/disable bot engine globally (admin kill-switch)"""
        global BOT_ENGINE_ENABLED
        BOT_ENGINE_ENABLED = enabled
        logger.info(f"Bot engine {'enabled' if enabled else 'disabled'}")
        return {"success": True, "enabled": enabled}
    
    @staticmethod
    async def emergency_stop_all() -> Dict[str, Any]:
        """Emergency stop all running bots"""
        now = datetime.now(timezone.utc)
        result = await bot_configs.update_many(
            {"status": "running"},
            {"$set": {"status": "stopped", "stopped_at": now, "updated_at": now}}
        )
        logger.warning(f"Emergency stop: {result.modified_count} bots stopped")
        return {"success": True, "stopped_count": result.modified_count}
    
    @staticmethod
    async def get_bot_revenue_breakdown() -> Dict[str, Any]:
        """Get bot revenue breakdown from EXISTING admin_revenue"""
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Revenue by strategy type
        strategy_pipeline = [
            {"$match": {"source": "bot"}},
            {"$group": {
                "_id": "$strategy_type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]
        strategy_result = await db.admin_revenue.aggregate(strategy_pipeline).to_list(10)
        
        # Revenue by time period
        periods = {
            "24h": day_ago,
            "7d": week_ago,
            "30d": month_ago
        }
        
        revenue_by_period = {}
        for period_name, start_time in periods.items():
            pipeline = [
                {"$match": {"source": "bot", "timestamp": {"$gte": start_time}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            result = await db.admin_revenue.aggregate(pipeline).to_list(1)
            revenue_by_period[period_name] = round(result[0]["total"], 2) if result else 0
        
        return {
            "by_strategy": {item["_id"]: round(item["total"], 2) for item in strategy_result if item["_id"]},
            "by_period": revenue_by_period
        }
