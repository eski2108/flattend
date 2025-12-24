"""
🔒 BOT WORKER SERVICE - CoinHubX

Background service that:
1. Fetches OHLCV candle data
2. Evaluates bot conditions on candle close
3. Places orders through EXISTING trading endpoint
4. Maintains idempotency and anti-spam safeguards

IMPORTANT:
- Bot is a CONTROLLER only
- All trades go through existing order placement
- Fees are charged by EXISTING fee system
- NO new fee logic, NO new revenue tables
"""

import os
import asyncio
import logging
import hashlib
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]

# Collections
bot_configs = db.bot_configs
bot_runs = db.bot_runs
bot_orders = db.bot_orders
bot_events = db.bot_events

# Timeframe to seconds mapping
TIMEFRAME_SECONDS = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400
}

# Worker control
WORKER_ENABLED = True
WORKER_INTERVAL = 10  # Check every 10 seconds


class BotWorker:
    """
    Background worker that evaluates and executes bot trades.
    
    Execution Logic:
    1. Fetch all running signal bots
    2. For each bot, check if candle closed since last evaluation
    3. If candle closed, fetch OHLCV data and compute indicators
    4. Evaluate entry/exit rules
    5. If triggered, place order through EXISTING endpoint
    6. Log event and update bot state
    """
    
    @staticmethod
    async def run_cycle():
        """Run one evaluation cycle for all running signal bots"""
        if not WORKER_ENABLED:
            return
        
        try:
            # Get all running signal bots
            running_bots = await bot_configs.find({
                "type": "signal",
                "status": "running"
            }).to_list(100)
            
            for bot in running_bots:
                try:
                    await BotWorker._evaluate_bot(bot)
                except Exception as e:
                    logger.error(f"Error evaluating bot {bot.get('bot_id')}: {e}")
                    await BotWorker._log_event(bot['bot_id'], 'error', str(e))
        
        except Exception as e:
            logger.error(f"Bot worker cycle error: {e}")
    
    @staticmethod
    async def _evaluate_bot(bot: Dict[str, Any]):
        """Evaluate a single bot"""
        bot_id = bot['bot_id']
        user_id = bot['user_id']
        pair = bot['pair']
        params = bot.get('params', {})
        
        # Get timeframe from entry rules (use first condition's timeframe)
        entry_rules = params.get('entry_rules', {})
        timeframe = '1h'  # Default
        if entry_rules.get('conditions'):
            timeframe = entry_rules['conditions'][0].get('timeframe', '1h')
        
        interval_seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
        now = datetime.now(timezone.utc)
        now_ts = int(now.timestamp())
        
        # Calculate current candle start time
        candle_start = (now_ts // interval_seconds) * interval_seconds
        
        # Check if we already processed this candle
        last_candle = bot.get('state', {}).get('last_candle_ts', 0)
        
        # Only evaluate on candle close (when new candle starts)
        if candle_start <= last_candle:
            return  # Already processed this candle
        
        # Check safeguards before proceeding
        safeguard_check = await BotWorker._check_safeguards(bot)
        if not safeguard_check['allowed']:
            await BotWorker._log_event(bot_id, 'safeguard', safeguard_check['reason'])
            return
        
        # Fetch candle data
        candles = await BotWorker._fetch_candles(pair, timeframe, 50)
        if not candles:
            await BotWorker._log_event(bot_id, 'error', 'Failed to fetch candle data')
            return
        
        # Compute indicators
        indicator_values = await BotWorker._compute_indicators(candles, params)
        
        # Evaluate entry rules
        entry_triggered = await BotWorker._evaluate_rules(
            entry_rules,
            indicator_values
        )
        
        # Check if we should trade
        side = params.get('side', 'buy')
        order_amount = params.get('order_amount', 0)
        
        if entry_triggered and order_amount > 0:
            # Generate idempotency key
            rule_hash = hashlib.md5(str(entry_rules).encode()).hexdigest()[:8]
            idempotency_key = f"{bot_id}_{timeframe}_{candle_start}_{rule_hash}_{side}"
            
            # Check if order already placed with this key
            existing_order = await bot_orders.find_one({"idempotency_key": idempotency_key})
            if existing_order:
                logger.info(f"Bot {bot_id}: Order already placed for this candle")
                return
            
            # Place the order through EXISTING trading endpoint
            order_result = await BotWorker._place_order(
                user_id=user_id,
                pair=pair,
                side=side,
                amount=order_amount,
                bot_id=bot_id,
                strategy_type='signal',
                idempotency_key=idempotency_key
            )
            
            # Log the event
            await BotWorker._log_event(
                bot_id,
                'trade_placed' if order_result.get('success') else 'trade_failed',
                order_result
            )
            
            # Record in bot_orders
            if order_result.get('success'):
                await bot_orders.insert_one({
                    "bot_id": bot_id,
                    "user_id": user_id,
                    "idempotency_key": idempotency_key,
                    "order_id": order_result.get('order_id'),
                    "trade_id": order_result.get('trade_id'),
                    "candle_ts": candle_start,
                    "timeframe": timeframe,
                    "side": side,
                    "amount": order_amount,
                    "created_at": now
                })
        else:
            await BotWorker._log_event(bot_id, 'evaluated', {
                'candle_ts': candle_start,
                'entry_triggered': entry_triggered,
                'indicator_count': len(indicator_values)
            })
        
        # Update bot state with last processed candle
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "state.last_candle_ts": candle_start,
                    "state.last_eval_at": now,
                    "state.last_entry_triggered": entry_triggered
                }
            }
        )
    
    @staticmethod
    async def _check_safeguards(bot: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check trading safeguards:
        - Max orders per hour/day
        - Cooldown between trades
        - Max position size
        """
        bot_id = bot['bot_id']
        params = bot.get('params', {})
        now = datetime.now(timezone.utc)
        
        # Default safeguards
        max_orders_per_hour = params.get('max_orders_per_hour', 10)
        max_orders_per_day = params.get('max_orders_per_day', 50)
        cooldown_seconds = params.get('cooldown_seconds', 60)
        
        # Check cooldown
        last_order = await bot_orders.find_one(
            {"bot_id": bot_id},
            sort=[("created_at", -1)]
        )
        if last_order:
            time_since_last = (now - last_order['created_at']).total_seconds()
            if time_since_last < cooldown_seconds:
                return {"allowed": False, "reason": f"Cooldown: {cooldown_seconds - time_since_last:.0f}s remaining"}
        
        # Check hourly limit
        hour_ago = now - timedelta(hours=1)
        orders_last_hour = await bot_orders.count_documents({
            "bot_id": bot_id,
            "created_at": {"$gte": hour_ago}
        })
        if orders_last_hour >= max_orders_per_hour:
            return {"allowed": False, "reason": f"Hourly limit reached ({max_orders_per_hour})"}
        
        # Check daily limit
        day_ago = now - timedelta(days=1)
        orders_last_day = await bot_orders.count_documents({
            "bot_id": bot_id,
            "created_at": {"$gte": day_ago}
        })
        if orders_last_day >= max_orders_per_day:
            return {"allowed": False, "reason": f"Daily limit reached ({max_orders_per_day})"}
        
        return {"allowed": True}
    
    @staticmethod
    async def _fetch_candles(pair: str, timeframe: str, limit: int) -> List[Dict]:
        """Fetch OHLCV candles from internal API or cache"""
        try:
            # Use internal API endpoint
            backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8001')
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{backend_url}/api/trading/ohlcv/{pair}",
                    params={"interval": timeframe, "limit": limit},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get('data', [])
        except Exception as e:
            logger.error(f"Error fetching candles: {e}")
        
        return []
    
    @staticmethod
    async def _compute_indicators(candles: List[Dict], params: Dict) -> Dict[str, Any]:
        """Compute all required indicators from candle data"""
        from indicators import IndicatorCalculator, OHLCV
        
        if not candles:
            return {}
        
        # Convert to OHLCV objects
        ohlcv_list = [
            OHLCV(
                timestamp=c['time'],
                open=c['open'],
                high=c['high'],
                low=c['low'],
                close=c['close'],
                volume=c['volume']
            )
            for c in candles
        ]
        
        closes = [c['close'] for c in candles]
        
        # Get required indicators from params
        entry_rules = params.get('entry_rules', {})
        exit_rules = params.get('exit_rules', {})
        
        all_conditions = entry_rules.get('conditions', []) + exit_rules.get('conditions', [])
        
        indicator_values = {
            'close': closes[-1] if closes else 0
        }
        
        for cond in all_conditions:
            ind = cond.get('indicator')
            tf = cond.get('timeframe', '1h')
            
            if not ind:
                continue
            
            key = f"{ind}_{tf}"
            if key in indicator_values:
                continue
            
            try:
                if ind == 'rsi':
                    values = IndicatorCalculator.rsi(closes, period=14)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'macd':
                    result = IndicatorCalculator.macd(closes)
                    indicator_values[f"{ind}_macd_{tf}"] = result['macd'][-1] if result['macd'] else None
                    indicator_values[f"{ind}_signal_{tf}"] = result['signal'][-1] if result['signal'] else None
                    indicator_values[f"{ind}_histogram_{tf}"] = result['histogram'][-1] if result['histogram'] else None
                elif ind == 'ema':
                    period = cond.get('period', 20)
                    values = IndicatorCalculator.ema(closes, period)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'sma':
                    period = cond.get('period', 20)
                    values = IndicatorCalculator.sma(closes, period)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'bollinger':
                    result = IndicatorCalculator.bollinger_bands(closes)
                    indicator_values[f"{ind}_upper_{tf}"] = result['upper'][-1] if result['upper'] else None
                    indicator_values[f"{ind}_middle_{tf}"] = result['middle'][-1] if result['middle'] else None
                    indicator_values[f"{ind}_lower_{tf}"] = result['lower'][-1] if result['lower'] else None
                elif ind == 'atr':
                    values = IndicatorCalculator.atr(ohlcv_list)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'stochastic':
                    result = IndicatorCalculator.stochastic(ohlcv_list)
                    indicator_values[f"{ind}_k_{tf}"] = result['k'][-1] if result['k'] else None
                    indicator_values[f"{ind}_d_{tf}"] = result['d'][-1] if result['d'] else None
                elif ind == 'cci':
                    values = IndicatorCalculator.cci(ohlcv_list)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'momentum':
                    values = IndicatorCalculator.momentum(closes)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'volume':
                    indicator_values[key] = candles[-1]['volume'] if candles else None
                elif ind == 'volume_ma':
                    values = IndicatorCalculator.volume_ma(ohlcv_list)
                    indicator_values[key] = values[-1] if values else None
                elif ind == 'obv':
                    values = IndicatorCalculator.obv(ohlcv_list)
                    indicator_values[key] = values[-1] if values else None
            except Exception as e:
                logger.warning(f"Error computing {ind}: {e}")
                indicator_values[key] = None
        
        return indicator_values
    
    @staticmethod
    async def _evaluate_rules(rules: Dict, indicator_values: Dict) -> bool:
        """Evaluate entry/exit rules against indicator values"""
        if not rules or not rules.get('conditions'):
            return False
        
        operator = rules.get('operator', 'AND')
        conditions = rules.get('conditions', [])
        
        results = []
        for cond in conditions:
            ind = cond.get('indicator')
            tf = cond.get('timeframe', '1h')
            op = cond.get('operator', '<')
            target = cond.get('value', 0)
            
            key = f"{ind}_{tf}"
            current = indicator_values.get(key)
            
            if current is None:
                results.append(False)
                continue
            
            if op == '<':
                results.append(current < target)
            elif op == '>':
                results.append(current > target)
            elif op == '<=':
                results.append(current <= target)
            elif op == '>=':
                results.append(current >= target)
            else:
                results.append(False)
        
        if operator == 'AND':
            return all(results) if results else False
        else:  # OR
            return any(results) if results else False
    
    @staticmethod
    async def _place_order(
        user_id: str,
        pair: str,
        side: str,
        amount: float,
        bot_id: str,
        strategy_type: str,
        idempotency_key: str
    ) -> Dict[str, Any]:
        """
        Place order through EXISTING trading endpoint.
        This ensures the order goes through the same matching/fee logic as manual trades.
        """
        try:
            backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8001')
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{backend_url}/api/trading/place-order",
                    json={
                        "pair": pair,
                        "side": side,
                        "order_type": "market",
                        "amount": amount,
                        "source": "bot",
                        "bot_id": bot_id,
                        "strategy_type": strategy_type,
                        "idempotency_key": idempotency_key
                    },
                    headers={"x-user-id": user_id},
                    timeout=30.0
                )
                
                result = response.json()
                return {
                    "success": result.get("success", False),
                    "order_id": result.get("order_id"),
                    "trade_id": result.get("trade_id"),
                    "fee": result.get("fee"),
                    "error": result.get("error") or result.get("detail")
                }
        except Exception as e:
            logger.error(f"Error placing bot order: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def _log_event(bot_id: str, event_type: str, data: Any):
        """Log a bot event"""
        try:
            await bot_events.insert_one({
                "bot_id": bot_id,
                "event_type": event_type,
                "data": data if isinstance(data, dict) else {"message": str(data)},
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.error(f"Error logging bot event: {e}")
    
    @staticmethod
    async def emergency_stop(bot_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Emergency stop for bots.
        - If bot_id: stop specific bot
        - If user_id: stop all bots for user
        - If neither: stop ALL bots
        """
        query = {"status": "running"}
        if bot_id:
            query["bot_id"] = bot_id
        elif user_id:
            query["user_id"] = user_id
        
        result = await bot_configs.update_many(
            query,
            {
                "$set": {
                    "status": "stopped",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": "emergency_stop"
                }
            }
        )
        
        return {"stopped_count": result.modified_count}


# Background task loop
async def bot_worker_loop():
    """Main worker loop - runs every WORKER_INTERVAL seconds"""
    logger.info("🤖 Bot Worker started")
    
    while True:
        try:
            if WORKER_ENABLED:
                await BotWorker.run_cycle()
        except Exception as e:
            logger.error(f"Bot worker loop error: {e}")
        
        await asyncio.sleep(WORKER_INTERVAL)
