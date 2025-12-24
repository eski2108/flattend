"""
🚨🚨🚨 BACKEND + TRADING + P2P + SAVINGS ARE LOCKED.
DO NOT CHANGE ANY EXISTING FLOW/UI/LOGIC OUTSIDE THIS BOT FEATURE.
NO "IMPROVEMENTS". NO REFACTOR. ONLY BOT ADDITION + REQUIRED HOOKS.
ANY OTHER CHANGE REQUIRES WRITTEN APPROVAL. 🚨🚨🚨

NATIVE TRADING BOT ENGINE - CoinHubX
- Grid Bot (Spot)
- DCA Bot (Recurring Buy/Sell)
- Uses USER FUNDS ONLY (wallet balances)
- Charges trading fees on every fill (same as manual trading)
- Subscription tiers for monetization
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

# NEW Collections (bot feature only)
bot_configs = db.bot_configs
bot_runs = db.bot_runs
bot_orders = db.bot_orders
bot_trades = db.bot_trades
platform_revenue = db.platform_revenue

# Subscription Tiers
SUBSCRIPTION_TIERS = {
    'free': {'max_bots': 1, 'price_gbp': 0},
    'pro': {'max_bots': 5, 'price_gbp': 19.99},
    'elite': {'max_bots': 20, 'price_gbp': 49.99}
}

# Fee Rates (same as manual trading)
MAKER_FEE = 0.001  # 0.10%
TAKER_FEE = 0.002  # 0.20%

# Engine Control
BOT_ENGINE_ENABLED = True


class BotEngine:
    """Native Trading Bot Engine"""
    
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
        if bot_type not in ['grid', 'dca']:
            return {"success": False, "error": "Invalid bot type. Use 'grid' or 'dca'"}
        
        # Validate params
        validation = await BotEngine._validate_params(bot_type, params)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}
        
        bot_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Calculate estimated fees
        investment = params.get('investment_amount', 0) or params.get('total_budget', 0)
        estimated_fees = investment * TAKER_FEE * 2  # Buy + Sell
        
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
            "total_invested": 0,
            "realized_pnl": 0,
            "unrealized_pnl": 0,
            "total_fees_paid": 0,
            "trades_count": 0,
            "orders_count": 0
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
        # Check subscriptions collection
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
            
            # Check mode
            if params.get('mode') and params['mode'] not in ['arithmetic', 'geometric']:
                return {"valid": False, "error": "Mode must be 'arithmetic' or 'geometric'"}
        
        elif bot_type == 'dca':
            required = ['order_size', 'interval', 'side']
            for field in required:
                if field not in params or params[field] is None:
                    return {"valid": False, "error": f"Missing required field: {field}"}
            
            if params['side'] not in ['buy', 'sell']:
                return {"valid": False, "error": "Side must be 'buy' or 'sell'"}
            
            valid_intervals = ['15m', '30m', '1h', '4h', '1d', '1w']
            if params['interval'] not in valid_intervals:
                return {"valid": False, "error": f"Interval must be one of: {', '.join(valid_intervals)}"}
            
            if params['order_size'] <= 0:
                return {"valid": False, "error": "Order size must be positive"}
        
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
        
        now = datetime.utcnow()
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
            required = bot["params"].get("order_size", 0)
        
        # Get quote currency from pair (e.g., BTCUSD -> USD)
        pair = bot["pair"]
        quote = "USD" if pair.endswith("USD") else "USDT"
        
        # Check wallet balance
        wallet = await db.wallets.find_one({"user_id": user_id})
        if not wallet:
            return {"sufficient": False, "error": "Wallet not found"}
        
        # Check fiat or crypto balance
        if quote in ["USD", "GBP", "EUR"]:
            available = wallet.get("fiat_balance", {}).get(quote, 0)
        else:
            available = wallet.get("crypto_balances", {}).get(quote, {}).get("available", 0)
        
        if available < required:
            return {
                "sufficient": False, 
                "error": f"Insufficient {quote} balance. Required: {required}, Available: {available}"
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
        
        now = datetime.utcnow()
        
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
        
        now = datetime.utcnow()
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
        
        now = datetime.utcnow()
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"status": "deleted", "updated_at": now}}
        )
        
        await BotEngine._log_action(bot_id, "delete", {})
        
        return {"success": True, "message": "Bot deleted"}
    
    @staticmethod
    async def get_user_bots(user_id: str) -> List[Dict[str, Any]]:
        """Get all bots for a user"""
        bots = []
        async for bot in bot_configs.find({
            "user_id": user_id, 
            "status": {"$ne": "deleted"}
        }).sort("created_at", -1):
            bots.append({
                "bot_id": bot["bot_id"],
                "type": bot["type"],
                "pair": bot["pair"],
                "status": bot["status"],
                "params": bot["params"],
                "created_at": bot["created_at"].isoformat() if bot.get("created_at") else None,
                "started_at": bot["started_at"].isoformat() if bot.get("started_at") else None,
                "realized_pnl": bot.get("realized_pnl", 0),
                "unrealized_pnl": bot.get("unrealized_pnl", 0),
                "total_fees_paid": bot.get("total_fees_paid", 0),
                "trades_count": bot.get("trades_count", 0),
                "orders_count": bot.get("orders_count", 0)
            })
        return bots
    
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
        
        # Get recent trades
        recent_trades = []
        async for trade in bot_trades.find({"bot_id": bot_id}).sort("timestamp", -1).limit(10):
            recent_trades.append({
                "trade_id": trade["trade_id"],
                "side": trade.get("side"),
                "price": trade["fill_price"],
                "qty": trade["fill_qty"],
                "fee": trade["fee_amount"],
                "timestamp": trade["timestamp"].isoformat() if trade.get("timestamp") else None
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
            "stats": {
                "realized_pnl": bot.get("realized_pnl", 0),
                "unrealized_pnl": bot.get("unrealized_pnl", 0),
                "total_invested": bot.get("total_invested", 0),
                "total_fees_paid": bot.get("total_fees_paid", 0),
                "trades_count": bot.get("trades_count", 0),
                "orders_count": bot.get("orders_count", 0),
                "active_orders": active_orders
            },
            "recent_trades": recent_trades
        }
    
    @staticmethod
    async def get_bot_trades(bot_id: str, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get trade history for a bot"""
        # Verify ownership
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return []
        
        trades = []
        async for trade in bot_trades.find({"bot_id": bot_id}).sort("timestamp", -1).limit(limit):
            trades.append({
                "trade_id": trade["trade_id"],
                "order_id": trade["order_id"],
                "side": trade.get("side"),
                "price": trade["fill_price"],
                "qty": trade["fill_qty"],
                "value": trade["fill_price"] * trade["fill_qty"],
                "fee": trade["fee_amount"],
                "fee_currency": trade["fee_currency"],
                "timestamp": trade["timestamp"].isoformat() if trade.get("timestamp") else None
            })
        return trades
    
    @staticmethod
    async def get_bot_pnl(bot_id: str, user_id: str) -> Dict[str, Any]:
        """Get PnL summary for a bot"""
        bot = await bot_configs.find_one({"bot_id": bot_id, "user_id": user_id})
        if not bot:
            return {"error": "Bot not found"}
        
        # Calculate from trades
        pipeline = [
            {"$match": {"bot_id": bot_id}},
            {"$group": {
                "_id": None,
                "total_buy_value": {
                    "$sum": {"$cond": [{"$eq": ["$side", "buy"]}, {"$multiply": ["$fill_price", "$fill_qty"]}, 0]}
                },
                "total_sell_value": {
                    "$sum": {"$cond": [{"$eq": ["$side", "sell"]}, {"$multiply": ["$fill_price", "$fill_qty"]}, 0]}
                },
                "total_fees": {"$sum": "$fee_amount"},
                "trade_count": {"$sum": 1}
            }}
        ]
        
        result = await bot_trades.aggregate(pipeline).to_list(1)
        
        if result:
            data = result[0]
            realized_pnl = data["total_sell_value"] - data["total_buy_value"] - data["total_fees"]
            return {
                "realized_pnl": round(realized_pnl, 2),
                "unrealized_pnl": bot.get("unrealized_pnl", 0),
                "total_buy_value": round(data["total_buy_value"], 2),
                "total_sell_value": round(data["total_sell_value"], 2),
                "total_fees": round(data["total_fees"], 2),
                "trade_count": data["trade_count"]
            }
        
        return {
            "realized_pnl": 0,
            "unrealized_pnl": 0,
            "total_buy_value": 0,
            "total_sell_value": 0,
            "total_fees": 0,
            "trade_count": 0
        }
    
    @staticmethod
    async def get_preview(bot_type: str, pair: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get preview of bot configuration"""
        if bot_type == 'grid':
            lower = params.get('lower_price', 0)
            upper = params.get('upper_price', 0)
            grid_count = params.get('grid_count', 5)
            investment = params.get('investment_amount', 0)
            mode = params.get('mode', 'arithmetic')
            
            if lower >= upper or grid_count < 2:
                return {"error": "Invalid parameters"}
            
            # Calculate grid levels
            if mode == 'geometric':
                ratio = (upper / lower) ** (1 / (grid_count - 1))
                grid_prices = [lower * (ratio ** i) for i in range(grid_count)]
            else:  # arithmetic
                step = (upper - lower) / (grid_count - 1)
                grid_prices = [lower + (i * step) for i in range(grid_count)]
            
            amount_per_grid = investment / grid_count
            estimated_fees = investment * TAKER_FEE * 2
            
            return {
                "bot_type": "Grid Bot",
                "pair": pair,
                "mode": mode.capitalize(),
                "grid_levels": grid_count,
                "price_range": f"${lower:,.2f} - ${upper:,.2f}",
                "amount_per_grid": round(amount_per_grid, 2),
                "total_investment": investment,
                "estimated_orders": grid_count * 2,
                "estimated_fees": round(estimated_fees, 2),
                "maker_fee": f"{MAKER_FEE * 100:.2f}%",
                "taker_fee": f"{TAKER_FEE * 100:.2f}%"
            }
        
        elif bot_type == 'dca':
            order_size = params.get('order_size', 0)
            interval = params.get('interval', '1d')
            side = params.get('side', 'buy')
            total_budget = params.get('total_budget', order_size * 10)
            
            interval_hours = {
                '15m': 0.25, '30m': 0.5, '1h': 1, '4h': 4, '1d': 24, '1w': 168
            }
            hours = interval_hours.get(interval, 24)
            
            total_orders = int(total_budget / order_size) if order_size > 0 else 0
            duration_days = (total_orders * hours) / 24
            estimated_fees = total_budget * TAKER_FEE
            
            return {
                "bot_type": "DCA Bot",
                "pair": pair,
                "side": side.upper(),
                "order_size": order_size,
                "interval": interval,
                "total_budget": total_budget,
                "estimated_orders": total_orders,
                "estimated_duration": f"{duration_days:.1f} days",
                "estimated_fees": round(estimated_fees, 2),
                "maker_fee": f"{MAKER_FEE * 100:.2f}%",
                "taker_fee": f"{TAKER_FEE * 100:.2f}%"
            }
        
        return {"error": "Invalid bot type"}
    
    @staticmethod
    async def _log_action(bot_id: str, action: str, payload: Dict[str, Any]):
        """Log bot action"""
        await db.bot_actions_log.insert_one({
            "bot_id": bot_id,
            "action": action,
            "timestamp": datetime.utcnow(),
            "payload": payload
        })
    
    @staticmethod
    async def record_trade(
        bot_id: str,
        order_id: str,
        side: str,
        fill_price: float,
        fill_qty: float,
        fee_amount: float,
        fee_currency: str
    ) -> Dict[str, Any]:
        """
        Record a bot trade fill.
        FEES ARE CHARGED AND RECORDED AS PLATFORM REVENUE.
        """
        trade_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Record the trade
        trade_record = {
            "bot_id": bot_id,
            "trade_id": trade_id,
            "order_id": order_id,
            "side": side,
            "fill_price": fill_price,
            "fill_qty": fill_qty,
            "fee_amount": fee_amount,
            "fee_currency": fee_currency,
            "timestamp": now
        }
        await bot_trades.insert_one(trade_record)
        
        # Get bot config for user_id
        bot = await bot_configs.find_one({"bot_id": bot_id})
        if bot:
            # Record fee as platform revenue
            await platform_revenue.insert_one({
                "revenue_id": str(uuid.uuid4()),
                "source": "bot_trade",
                "amount": fee_amount,
                "currency": fee_currency,
                "user_id": bot["user_id"],
                "bot_id": bot_id,
                "trade_id": trade_id,
                "timestamp": now
            })
            
            # Update bot stats
            await bot_configs.update_one(
                {"bot_id": bot_id},
                {
                    "$inc": {
                        "trades_count": 1,
                        "total_fees_paid": fee_amount
                    },
                    "$set": {"updated_at": now}
                }
            )
        
        return {"success": True, "trade_id": trade_id}


class BotAdmin:
    """Admin functions for bot management"""
    
    @staticmethod
    async def get_stats() -> Dict[str, Any]:
        """Get bot statistics for admin dashboard"""
        now = datetime.utcnow()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
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
        
        # 24h bot trading fees
        fee_pipeline = [
            {"$match": {"source": "bot_trade", "timestamp": {"$gte": day_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        fee_result = await platform_revenue.aggregate(fee_pipeline).to_list(1)
        fees_24h = fee_result[0]["total"] if fee_result else 0
        
        # Subscription revenue (MTD)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        sub_pipeline = [
            {"$match": {"source": "bot_subscription", "timestamp": {"$gte": month_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        sub_result = await platform_revenue.aggregate(sub_pipeline).to_list(1)
        subscription_mtd = sub_result[0]["total"] if sub_result else 0
        
        return {
            "active_bots": active_bots,
            "total_bots": total_bots,
            "total_bot_users": total_bot_users,
            "fees_24h": round(fees_24h, 2),
            "subscription_revenue_mtd": round(subscription_mtd, 2)
        }
    
    @staticmethod
    async def toggle_engine(enabled: bool) -> Dict[str, Any]:
        """Enable/disable bot engine globally"""
        global BOT_ENGINE_ENABLED
        BOT_ENGINE_ENABLED = enabled
        logger.info(f"Bot engine {'enabled' if enabled else 'disabled'}")
        return {"success": True, "enabled": enabled}
    
    @staticmethod
    async def emergency_stop_all() -> Dict[str, Any]:
        """Emergency stop all running bots"""
        now = datetime.utcnow()
        result = await bot_configs.update_many(
            {"status": "running"},
            {"$set": {"status": "stopped", "stopped_at": now, "updated_at": now}}
        )
        logger.warning(f"Emergency stop: {result.modified_count} bots stopped")
        return {"success": True, "stopped_count": result.modified_count}
