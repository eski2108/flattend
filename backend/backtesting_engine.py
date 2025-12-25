"""
🔬 COINHUBX BACKTESTING ENGINE - PHASE 5
═══════════════════════════════════════════════════════════════════════════════

BACKTESTING (LOCKED SCOPE):
- Replay historical candles through EXISTING bot execution logic
- Use EXISTING fee logic (fee-aware)
- Output ONLY: PnL, max_drawdown, win_rate, fees_paid, trades_count
- NO slippage modeling, NO Sharpe ratio, NO paper trading, NO fake data

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import logging
import copy

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]

# Collections
backtest_runs = db.backtest_runs
backtest_trades = db.backtest_trades
platform_settings = db.platform_settings


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS - Use existing platform fee
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_TRADING_FEE_PERCENT = 0.1  # Will be overridden by platform settings


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BacktestCandle:
    """Single OHLCV candle for backtesting"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float = 0


@dataclass
class BacktestTrade:
    """Single trade executed during backtest"""
    trade_id: str
    timestamp: int
    side: str  # "buy" or "sell"
    price: float
    quantity: float
    fee: float
    pnl: float = 0  # Realized PnL for sell trades
    
    def to_dict(self) -> Dict:
        return {
            "trade_id": self.trade_id,
            "timestamp": self.timestamp,
            "side": self.side,
            "price": self.price,
            "quantity": self.quantity,
            "fee": self.fee,
            "pnl": self.pnl
        }


@dataclass
class BacktestResult:
    """
    Backtest output - LOCKED TO 5 METRICS ONLY:
    - total_pnl
    - max_drawdown
    - win_rate
    - fees_paid
    - trades_count
    """
    backtest_id: str
    bot_type: str
    pair: str
    timeframe: str
    start_time: int
    end_time: int
    start_balance: float
    end_balance: float
    
    # THE 5 REQUIRED METRICS ONLY
    total_pnl: float
    max_drawdown: float
    win_rate: float
    fees_paid: float
    trades_count: int
    
    # For reconciliation proof
    winning_trades: int = 0
    losing_trades: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "backtest_id": self.backtest_id,
            "bot_type": self.bot_type,
            "pair": self.pair,
            "timeframe": self.timeframe,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "start_balance": self.start_balance,
            "end_balance": self.end_balance,
            # THE 5 REQUIRED METRICS
            "total_pnl": round(self.total_pnl, 8),
            "max_drawdown": round(self.max_drawdown, 4),
            "win_rate": round(self.win_rate, 4),
            "fees_paid": round(self.fees_paid, 8),
            "trades_count": self.trades_count,
            # Reconciliation
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "reconciliation": {
                "start_balance": round(self.start_balance, 8),
                "total_pnl": round(self.total_pnl, 8),
                "fees_paid": round(self.fees_paid, 8),
                "calculated_end": round(self.start_balance + self.total_pnl - self.fees_paid, 8),
                "actual_end": round(self.end_balance, 8),
                "matches": abs((self.start_balance + self.total_pnl - self.fees_paid) - self.end_balance) < 0.00000001
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# BACKTEST STATE - Tracks position, balance, equity during replay
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BacktestState:
    """Internal state during backtest replay"""
    balance: float
    position_qty: float = 0
    position_avg_price: float = 0
    position_side: str = "flat"  # "long", "short", "flat"
    
    # Tracking
    peak_equity: float = 0
    current_drawdown: float = 0
    max_drawdown: float = 0
    
    total_pnl: float = 0
    total_fees: float = 0
    trades: List[BacktestTrade] = field(default_factory=list)
    winning_trades: int = 0
    losing_trades: int = 0
    
    # For DCA/Grid
    dca_level: int = 0
    grid_orders: Dict[str, Any] = field(default_factory=dict)
    
    def update_drawdown(self):
        """Update drawdown tracking"""
        equity = self.balance + (self.position_qty * self.position_avg_price if self.position_qty > 0 else 0)
        if equity > self.peak_equity:
            self.peak_equity = equity
        
        if self.peak_equity > 0:
            self.current_drawdown = (self.peak_equity - equity) / self.peak_equity
            if self.current_drawdown > self.max_drawdown:
                self.max_drawdown = self.current_drawdown


# ═══════════════════════════════════════════════════════════════════════════════
# FEE CALCULATOR - Uses EXISTING platform fee config
# ═══════════════════════════════════════════════════════════════════════════════

class FeeCalculator:
    """Calculate trading fees using existing platform configuration"""
    
    _cached_fee_percent: Optional[float] = None
    _cache_time: Optional[datetime] = None
    
    @classmethod
    async def get_fee_percent(cls) -> float:
        """Get trading fee percent from platform settings"""
        # Cache for 60 seconds
        if cls._cached_fee_percent is not None and cls._cache_time:
            if (datetime.now(timezone.utc) - cls._cache_time).total_seconds() < 60:
                return cls._cached_fee_percent
        
        try:
            settings = await platform_settings.find_one({"type": "platform_config"})
            if settings:
                # Use trading_fee_percent from platform config
                cls._cached_fee_percent = settings.get("trading_fee_percent", DEFAULT_TRADING_FEE_PERCENT)
            else:
                cls._cached_fee_percent = DEFAULT_TRADING_FEE_PERCENT
            cls._cache_time = datetime.now(timezone.utc)
        except Exception as e:
            logger.error(f"Error getting fee config: {e}")
            cls._cached_fee_percent = DEFAULT_TRADING_FEE_PERCENT
        
        return cls._cached_fee_percent
    
    @classmethod
    async def calculate_fee(cls, trade_value: float) -> float:
        """Calculate fee for a trade"""
        fee_percent = await cls.get_fee_percent()
        return trade_value * (fee_percent / 100)


# ═══════════════════════════════════════════════════════════════════════════════
# SIGNAL BOT BACKTEST EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class SignalBotBacktester:
    """Execute Signal bot strategy on historical candles"""
    
    @staticmethod
    async def run(
        candles: List[BacktestCandle],
        config: Dict[str, Any],
        initial_balance: float
    ) -> Tuple[BacktestState, List[BacktestTrade]]:
        """
        Run signal bot backtest.
        Uses EXISTING signal engine logic.
        """
        from signal_engine import IndicatorConfig, LogicalOperator
        
        state = BacktestState(balance=initial_balance, peak_equity=initial_balance)
        
        # Parse strategy config
        strategy_config = config.get("strategy", {})
        indicators = strategy_config.get("indicators", [])
        entry_logic = strategy_config.get("entry_logic", "AND")
        exit_logic = strategy_config.get("exit_logic", "AND")
        position_size_pct = config.get("position_size_percent", 10)
        
        # Build indicator configs
        indicator_configs = []
        for ind in indicators:
            indicator_configs.append(IndicatorConfig(
                indicator_id=ind.get("indicator", "RSI"),
                params=ind.get("params", {}),
                comparator=ind.get("comparator", "<"),
                threshold=ind.get("threshold", 30),
                output=ind.get("output", "value")
            ))
        
        # Minimum candles needed for indicators
        lookback = max(50, config.get("lookback_candles", 50))
        
        # Process each candle
        for i in range(lookback, len(candles)):
            candle = candles[i]
            historical = candles[max(0, i-lookback):i+1]
            
            # Calculate indicators using existing engine
            try:
                # Build OHLCV list for indicator calculation
                ohlcv_data = [
                    {"open": c.open, "high": c.high, "low": c.low, "close": c.close, "volume": c.volume}
                    for c in historical
                ]
                closes = [c.close for c in historical]
                
                # Check entry conditions
                entry_signal = await SignalBotBacktester._check_conditions(
                    indicator_configs, ohlcv_data, closes, "entry", entry_logic
                )
                
                # Check exit conditions  
                exit_signal = await SignalBotBacktester._check_conditions(
                    indicator_configs, ohlcv_data, closes, "exit", exit_logic
                )
                
                current_price = candle.close
                
                # Execute trades based on signals
                if state.position_side == "flat" and entry_signal:
                    # Open long position
                    trade_value = state.balance * (position_size_pct / 100)
                    fee = await FeeCalculator.calculate_fee(trade_value)
                    quantity = (trade_value - fee) / current_price
                    
                    state.balance -= trade_value
                    state.position_qty = quantity
                    state.position_avg_price = current_price
                    state.position_side = "long"
                    state.total_fees += fee
                    
                    trade = BacktestTrade(
                        trade_id=str(uuid.uuid4()),
                        timestamp=candle.timestamp,
                        side="buy",
                        price=current_price,
                        quantity=quantity,
                        fee=fee
                    )
                    state.trades.append(trade)
                    
                elif state.position_side == "long" and exit_signal:
                    # Close long position
                    trade_value = state.position_qty * current_price
                    fee = await FeeCalculator.calculate_fee(trade_value)
                    
                    gross_pnl = (current_price - state.position_avg_price) * state.position_qty
                    net_pnl = gross_pnl - fee
                    
                    state.balance += trade_value - fee
                    state.total_pnl += gross_pnl
                    state.total_fees += fee
                    
                    if net_pnl > 0:
                        state.winning_trades += 1
                    else:
                        state.losing_trades += 1
                    
                    trade = BacktestTrade(
                        trade_id=str(uuid.uuid4()),
                        timestamp=candle.timestamp,
                        side="sell",
                        price=current_price,
                        quantity=state.position_qty,
                        fee=fee,
                        pnl=gross_pnl
                    )
                    state.trades.append(trade)
                    
                    state.position_qty = 0
                    state.position_avg_price = 0
                    state.position_side = "flat"
                
                state.update_drawdown()
                
            except Exception as e:
                logger.error(f"Error processing candle {i}: {e}")
                continue
        
        # Close any remaining position at last price
        if state.position_qty > 0 and len(candles) > 0:
            last_price = candles[-1].close
            trade_value = state.position_qty * last_price
            fee = await FeeCalculator.calculate_fee(trade_value)
            
            gross_pnl = (last_price - state.position_avg_price) * state.position_qty
            
            state.balance += trade_value - fee
            state.total_pnl += gross_pnl
            state.total_fees += fee
            
            if gross_pnl - fee > 0:
                state.winning_trades += 1
            else:
                state.losing_trades += 1
            
            trade = BacktestTrade(
                trade_id=str(uuid.uuid4()),
                timestamp=candles[-1].timestamp,
                side="sell",
                price=last_price,
                quantity=state.position_qty,
                fee=fee,
                pnl=gross_pnl
            )
            state.trades.append(trade)
            
            state.position_qty = 0
            state.position_side = "flat"
        
        return state, state.trades
    
    @staticmethod
    async def _check_conditions(
        indicators: List,
        ohlcv: List[Dict],
        closes: List[float],
        signal_type: str,
        logic: str
    ) -> bool:
        """Check if entry/exit conditions are met using existing indicator logic"""
        from signal_engine import IndicatorCalculator, OHLCV
        
        if not indicators:
            return False
        
        # Convert to OHLCV objects
        ohlcv_objs = [
            OHLCV(
                timestamp=i,
                open=c["open"],
                high=c["high"],
                low=c["low"],
                close=c["close"],
                volume=c.get("volume", 0)
            )
            for i, c in enumerate(ohlcv)
        ]
        
        results = []
        for ind in indicators:
            try:
                # Calculate indicator value
                indicator_type = ind.indicator_id.upper()
                params = ind.params or {}
                
                if indicator_type == "RSI":
                    period = params.get("period", 14)
                    values = IndicatorCalculator.rsi(closes, period)
                    value = values[-1] if values else 50
                elif indicator_type == "MACD":
                    fast = params.get("fast_period", 12)
                    slow = params.get("slow_period", 26)
                    signal = params.get("signal_period", 9)
                    macd_result = IndicatorCalculator.macd(closes, fast, slow, signal)
                    value = macd_result.get("histogram", [0])[-1]
                elif indicator_type == "EMA":
                    period = params.get("period", 20)
                    values = IndicatorCalculator.ema(closes, period)
                    value = values[-1] if values else closes[-1]
                elif indicator_type == "SMA":
                    period = params.get("period", 20)
                    values = IndicatorCalculator.sma(closes, period)
                    value = values[-1] if values else closes[-1]
                elif indicator_type == "BB":
                    period = params.get("period", 20)
                    std = params.get("std_dev", 2)
                    bb_result = IndicatorCalculator.bollinger_bands(closes, period, std)
                    output = ind.output or "lower"
                    value = bb_result.get(output, [closes[-1]])[-1]
                else:
                    # Default to close price
                    value = closes[-1]
                
                # Compare against threshold
                threshold = ind.threshold
                comparator = ind.comparator
                
                if comparator == "<":
                    condition_met = value < threshold
                elif comparator == ">":
                    condition_met = value > threshold
                elif comparator == "<=":
                    condition_met = value <= threshold
                elif comparator == ">=":
                    condition_met = value >= threshold
                elif comparator == "==":
                    condition_met = abs(value - threshold) < 0.0001
                elif comparator == "crosses_above":
                    # Would need previous value - simplified
                    condition_met = value > threshold
                elif comparator == "crosses_below":
                    condition_met = value < threshold
                else:
                    condition_met = False
                
                results.append(condition_met)
                
            except Exception as e:
                logger.error(f"Error calculating indicator {ind.indicator_id}: {e}")
                results.append(False)
        
        if not results:
            return False
        
        if logic == "AND":
            return all(results)
        elif logic == "OR":
            return any(results)
        else:
            return all(results)


# ═══════════════════════════════════════════════════════════════════════════════
# DCA BOT BACKTEST EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class DCABotBacktester:
    """Execute DCA bot strategy on historical candles"""
    
    @staticmethod
    async def run(
        candles: List[BacktestCandle],
        config: Dict[str, Any],
        initial_balance: float
    ) -> Tuple[BacktestState, List[BacktestTrade]]:
        """
        Run DCA bot backtest.
        Buys at regular intervals or on price drops.
        """
        state = BacktestState(balance=initial_balance, peak_equity=initial_balance)
        
        # DCA config
        dca_mode = config.get("dca_mode", "time_based")  # "time_based" or "price_drop"
        buy_interval = config.get("buy_interval_candles", 10)  # Buy every N candles
        price_drop_percent = config.get("price_drop_percent", 5)  # Buy on X% drop
        base_order_size = config.get("base_order_size_percent", 5)  # % of balance
        safety_order_size = config.get("safety_order_size_percent", 10)
        max_dca_levels = config.get("max_dca_levels", 5)
        take_profit_percent = config.get("take_profit_percent", 3)
        
        last_buy_index = -buy_interval
        last_buy_price = 0
        
        for i, candle in enumerate(candles):
            current_price = candle.close
            
            # Check take profit
            if state.position_qty > 0:
                profit_pct = ((current_price - state.position_avg_price) / state.position_avg_price) * 100
                
                if profit_pct >= take_profit_percent:
                    # Take profit - close position
                    trade_value = state.position_qty * current_price
                    fee = await FeeCalculator.calculate_fee(trade_value)
                    
                    gross_pnl = (current_price - state.position_avg_price) * state.position_qty
                    
                    state.balance += trade_value - fee
                    state.total_pnl += gross_pnl
                    state.total_fees += fee
                    state.winning_trades += 1
                    
                    trade = BacktestTrade(
                        trade_id=str(uuid.uuid4()),
                        timestamp=candle.timestamp,
                        side="sell",
                        price=current_price,
                        quantity=state.position_qty,
                        fee=fee,
                        pnl=gross_pnl
                    )
                    state.trades.append(trade)
                    
                    state.position_qty = 0
                    state.position_avg_price = 0
                    state.position_side = "flat"
                    state.dca_level = 0
                    last_buy_price = 0
                    continue
            
            # Check if should buy
            should_buy = False
            order_size_pct = base_order_size
            
            if dca_mode == "time_based":
                if i - last_buy_index >= buy_interval and state.dca_level < max_dca_levels:
                    should_buy = True
                    if state.dca_level > 0:
                        order_size_pct = safety_order_size
            
            elif dca_mode == "price_drop":
                if state.position_qty == 0:
                    # First buy
                    should_buy = True
                elif last_buy_price > 0 and state.dca_level < max_dca_levels:
                    drop_pct = ((last_buy_price - current_price) / last_buy_price) * 100
                    if drop_pct >= price_drop_percent:
                        should_buy = True
                        order_size_pct = safety_order_size
            
            if should_buy and state.balance > 0:
                trade_value = state.balance * (order_size_pct / 100)
                trade_value = min(trade_value, state.balance)  # Don't exceed balance
                
                if trade_value > 0:
                    fee = await FeeCalculator.calculate_fee(trade_value)
                    quantity = (trade_value - fee) / current_price
                    
                    # Update average price
                    if state.position_qty > 0:
                        total_cost = (state.position_avg_price * state.position_qty) + (current_price * quantity)
                        state.position_qty += quantity
                        state.position_avg_price = total_cost / state.position_qty
                    else:
                        state.position_qty = quantity
                        state.position_avg_price = current_price
                    
                    state.balance -= trade_value
                    state.total_fees += fee
                    state.position_side = "long"
                    state.dca_level += 1
                    last_buy_index = i
                    last_buy_price = current_price
                    
                    trade = BacktestTrade(
                        trade_id=str(uuid.uuid4()),
                        timestamp=candle.timestamp,
                        side="buy",
                        price=current_price,
                        quantity=quantity,
                        fee=fee
                    )
                    state.trades.append(trade)
            
            state.update_drawdown()
        
        # Close any remaining position
        if state.position_qty > 0 and len(candles) > 0:
            last_price = candles[-1].close
            trade_value = state.position_qty * last_price
            fee = await FeeCalculator.calculate_fee(trade_value)
            
            gross_pnl = (last_price - state.position_avg_price) * state.position_qty
            
            state.balance += trade_value - fee
            state.total_pnl += gross_pnl
            state.total_fees += fee
            
            if gross_pnl - fee > 0:
                state.winning_trades += 1
            else:
                state.losing_trades += 1
            
            trade = BacktestTrade(
                trade_id=str(uuid.uuid4()),
                timestamp=candles[-1].timestamp,
                side="sell",
                price=last_price,
                quantity=state.position_qty,
                fee=fee,
                pnl=gross_pnl
            )
            state.trades.append(trade)
            
            state.position_qty = 0
            state.position_side = "flat"
        
        return state, state.trades


# ═══════════════════════════════════════════════════════════════════════════════
# GRID BOT BACKTEST EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class GridBotBacktester:
    """Execute Grid bot strategy on historical candles"""
    
    @staticmethod
    async def run(
        candles: List[BacktestCandle],
        config: Dict[str, Any],
        initial_balance: float
    ) -> Tuple[BacktestState, List[BacktestTrade]]:
        """
        Run Grid bot backtest.
        Places buy/sell orders at grid levels.
        """
        state = BacktestState(balance=initial_balance, peak_equity=initial_balance)
        
        # Grid config
        upper_price = config.get("upper_price", 0)
        lower_price = config.get("lower_price", 0)
        grid_levels = config.get("grid_levels", 10)
        order_size_pct = config.get("order_size_percent", 10)
        
        if upper_price <= lower_price or grid_levels < 2:
            logger.error("Invalid grid config")
            return state, []
        
        # Calculate grid prices
        price_step = (upper_price - lower_price) / (grid_levels - 1)
        grid_prices = [lower_price + (i * price_step) for i in range(grid_levels)]
        
        # Track grid state: which levels have buy/sell orders
        # Start with all buy orders below mid-price
        mid_price = (upper_price + lower_price) / 2
        grid_state = {}  # price -> {"has_position": bool}
        
        for gp in grid_prices:
            grid_state[gp] = {"has_position": gp < mid_price, "filled": False}
        
        # Initial buys to establish grid positions
        for gp in grid_prices:
            if gp < mid_price and state.balance > 0:
                trade_value = initial_balance * (order_size_pct / 100) / (grid_levels // 2)
                trade_value = min(trade_value, state.balance)
                
                if trade_value > 0:
                    fee = await FeeCalculator.calculate_fee(trade_value)
                    quantity = (trade_value - fee) / gp
                    
                    state.balance -= trade_value
                    state.total_fees += fee
                    
                    if state.position_qty > 0:
                        total_cost = (state.position_avg_price * state.position_qty) + (gp * quantity)
                        state.position_qty += quantity
                        state.position_avg_price = total_cost / state.position_qty
                    else:
                        state.position_qty = quantity
                        state.position_avg_price = gp
                    
                    state.position_side = "long"
                    grid_state[gp]["filled"] = True
        
        # Process candles
        prev_price = candles[0].close if candles else mid_price
        
        for candle in candles:
            current_price = candle.close
            
            # Check each grid level
            for gp in grid_prices:
                # Price crossed down through grid level - BUY
                if prev_price > gp >= current_price and not grid_state[gp]["has_position"]:
                    if state.balance > 0:
                        trade_value = initial_balance * (order_size_pct / 100) / grid_levels
                        trade_value = min(trade_value, state.balance)
                        
                        if trade_value > 0:
                            fee = await FeeCalculator.calculate_fee(trade_value)
                            quantity = (trade_value - fee) / gp
                            
                            state.balance -= trade_value
                            state.total_fees += fee
                            
                            if state.position_qty > 0:
                                total_cost = (state.position_avg_price * state.position_qty) + (gp * quantity)
                                state.position_qty += quantity
                                state.position_avg_price = total_cost / state.position_qty
                            else:
                                state.position_qty = quantity
                                state.position_avg_price = gp
                            
                            state.position_side = "long"
                            grid_state[gp]["has_position"] = True
                            
                            trade = BacktestTrade(
                                trade_id=str(uuid.uuid4()),
                                timestamp=candle.timestamp,
                                side="buy",
                                price=gp,
                                quantity=quantity,
                                fee=fee
                            )
                            state.trades.append(trade)
                
                # Price crossed up through grid level - SELL
                elif prev_price < gp <= current_price and grid_state[gp]["has_position"]:
                    if state.position_qty > 0:
                        sell_qty = state.position_qty / sum(1 for g in grid_state.values() if g["has_position"])
                        sell_qty = min(sell_qty, state.position_qty)
                        
                        if sell_qty > 0:
                            trade_value = sell_qty * gp
                            fee = await FeeCalculator.calculate_fee(trade_value)
                            
                            gross_pnl = (gp - state.position_avg_price) * sell_qty
                            
                            state.balance += trade_value - fee
                            state.position_qty -= sell_qty
                            state.total_pnl += gross_pnl
                            state.total_fees += fee
                            
                            if gross_pnl > fee:
                                state.winning_trades += 1
                            else:
                                state.losing_trades += 1
                            
                            grid_state[gp]["has_position"] = False
                            
                            trade = BacktestTrade(
                                trade_id=str(uuid.uuid4()),
                                timestamp=candle.timestamp,
                                side="sell",
                                price=gp,
                                quantity=sell_qty,
                                fee=fee,
                                pnl=gross_pnl
                            )
                            state.trades.append(trade)
                            
                            if state.position_qty <= 0:
                                state.position_qty = 0
                                state.position_side = "flat"
            
            prev_price = current_price
            state.update_drawdown()
        
        # Close remaining position
        if state.position_qty > 0 and len(candles) > 0:
            last_price = candles[-1].close
            trade_value = state.position_qty * last_price
            fee = await FeeCalculator.calculate_fee(trade_value)
            
            gross_pnl = (last_price - state.position_avg_price) * state.position_qty
            
            state.balance += trade_value - fee
            state.total_pnl += gross_pnl
            state.total_fees += fee
            
            if gross_pnl - fee > 0:
                state.winning_trades += 1
            else:
                state.losing_trades += 1
            
            trade = BacktestTrade(
                trade_id=str(uuid.uuid4()),
                timestamp=candles[-1].timestamp,
                side="sell",
                price=last_price,
                quantity=state.position_qty,
                fee=fee,
                pnl=gross_pnl
            )
            state.trades.append(trade)
            
            state.position_qty = 0
            state.position_side = "flat"
        
        return state, state.trades


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN BACKTEST ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class BacktestEngine:
    """
    Main backtesting engine.
    Replays historical candles through existing bot execution logic.
    """
    
    @staticmethod
    async def fetch_candles(
        pair: str,
        timeframe: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[BacktestCandle]:
        """
        Fetch historical candles using EXISTING CandleManager.
        No new data sources.
        """
        from bot_execution_engine import CandleManager
        
        # Get candles from existing source
        raw_candles = await CandleManager.get_candles(pair, timeframe, limit=500)
        
        candles = []
        for c in raw_candles:
            ts = c.get("timestamp", 0)
            
            # Filter by time range if specified
            if start_time and ts < start_time:
                continue
            if end_time and ts > end_time:
                continue
            
            candles.append(BacktestCandle(
                timestamp=ts,
                open=c.get("open", 0),
                high=c.get("high", 0),
                low=c.get("low", 0),
                close=c.get("close", 0),
                volume=c.get("volume", 0)
            ))
        
        return candles
    
    @staticmethod
    async def run_backtest(
        bot_type: str,
        pair: str,
        timeframe: str,
        config: Dict[str, Any],
        initial_balance: float = 10000,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> BacktestResult:
        """
        Run a backtest.
        
        Args:
            bot_type: "signal", "dca", or "grid"
            pair: Trading pair (e.g., "BTCUSD")
            timeframe: Candle timeframe (e.g., "1h")
            config: Bot configuration
            initial_balance: Starting balance
            start_time: Start timestamp (optional)
            end_time: End timestamp (optional)
        
        Returns:
            BacktestResult with the 5 required metrics ONLY
        """
        backtest_id = str(uuid.uuid4())
        
        # Fetch candles using existing data source
        candles = await BacktestEngine.fetch_candles(pair, timeframe, start_time, end_time)
        
        if not candles:
            return BacktestResult(
                backtest_id=backtest_id,
                bot_type=bot_type,
                pair=pair,
                timeframe=timeframe,
                start_time=start_time or 0,
                end_time=end_time or 0,
                start_balance=initial_balance,
                end_balance=initial_balance,
                total_pnl=0,
                max_drawdown=0,
                win_rate=0,
                fees_paid=0,
                trades_count=0
            )
        
        # Run appropriate backtest executor
        bot_type_lower = bot_type.lower()
        
        if bot_type_lower == "signal":
            state, trades = await SignalBotBacktester.run(candles, config, initial_balance)
        elif bot_type_lower == "dca":
            state, trades = await DCABotBacktester.run(candles, config, initial_balance)
        elif bot_type_lower == "grid":
            state, trades = await GridBotBacktester.run(candles, config, initial_balance)
        else:
            raise ValueError(f"Unknown bot type: {bot_type}")
        
        # Calculate metrics
        trades_count = len([t for t in trades if t.side == "sell"])  # Count completed round-trips
        total_trades = state.winning_trades + state.losing_trades
        win_rate = (state.winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        # Build result with ONLY the 5 required metrics
        result = BacktestResult(
            backtest_id=backtest_id,
            bot_type=bot_type,
            pair=pair,
            timeframe=timeframe,
            start_time=candles[0].timestamp if candles else 0,
            end_time=candles[-1].timestamp if candles else 0,
            start_balance=initial_balance,
            end_balance=state.balance,
            # THE 5 REQUIRED METRICS
            total_pnl=state.total_pnl,
            max_drawdown=state.max_drawdown * 100,  # As percentage
            win_rate=win_rate,
            fees_paid=state.total_fees,
            trades_count=trades_count,
            # For reconciliation
            winning_trades=state.winning_trades,
            losing_trades=state.losing_trades
        )
        
        # Save backtest run to database
        await backtest_runs.insert_one({
            "backtest_id": backtest_id,
            "bot_type": bot_type,
            "pair": pair,
            "timeframe": timeframe,
            "config": config,
            "initial_balance": initial_balance,
            "result": result.to_dict(),
            "created_at": datetime.now(timezone.utc)
        })
        
        # Save trades
        if trades:
            trade_docs = [
                {
                    "backtest_id": backtest_id,
                    **t.to_dict()
                }
                for t in trades
            ]
            await backtest_trades.insert_many(trade_docs)
        
        return result
    
    @staticmethod
    async def get_backtest(backtest_id: str) -> Optional[Dict]:
        """Get a previous backtest result"""
        doc = await backtest_runs.find_one({"backtest_id": backtest_id})
        if doc:
            doc.pop("_id", None)
            return doc
        return None
    
    @staticmethod
    async def get_backtest_trades(backtest_id: str) -> List[Dict]:
        """Get trades from a backtest"""
        trades = []
        async for doc in backtest_trades.find({"backtest_id": backtest_id}):
            doc.pop("_id", None)
            trades.append(doc)
        return trades
