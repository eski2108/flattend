"""
🧠 COINHUBX SIGNAL ENGINE - PHASE 2
═══════════════════════════════════════════════════════════════════════════════

STRATEGY & SIGNAL ENGINE

This module implements:

1. Signal Builder (FULL, NOT BASIC)
   - Multiple indicators per strategy
   - Editable parameters (periods, thresholds, offsets)
   - Logical operators: AND/OR
   - Entry conditions
   - Exit conditions
   - Confirmation indicators
   - Multi-timeframe logic (e.g. 5m + 1h)

2. Decision Engine
   - Evaluate signals deterministically
   - Indicator snapshot at decision time
   - Decision confidence scoring
   - Cooldown logic between trades

Required Indicators:
   - RSI
   - MACD
   - EMA / SMA
   - Bollinger Bands
   - Volume
   - VWAP
   - ATR
   - Stochastic
   - Ichimoku
   - SuperTrend

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict
import logging
import json
import copy

from motor.motor_asyncio import AsyncIOMotorClient

# Import indicator calculator
from indicators import IndicatorCalculator, OHLCV, TIMEFRAMES, INDICATOR_REGISTRY
from bot_execution_engine import (
    CandleManager, DecisionLogger, StateManager, 
    OrderManager, OrderRequest, OrderType, OrderSide
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

class SignalType(Enum):
    ENTRY = "entry"
    EXIT = "exit"
    CONFIRMATION = "confirmation"

class Comparator(Enum):
    GREATER_THAN = ">"
    LESS_THAN = "<"
    GREATER_OR_EQUAL = ">="
    LESS_OR_EQUAL = "<="
    EQUALS = "=="
    NOT_EQUALS = "!="
    CROSSES_ABOVE = "crosses_above"
    CROSSES_BELOW = "crosses_below"
    RISING = "rising"
    FALLING = "falling"
    BETWEEN = "between"
    OUTSIDE = "outside"

class LogicalOperator(Enum):
    AND = "AND"
    OR = "OR"

# Available timeframes
SUPPORTED_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"]

# Indicator output types
INDICATOR_OUTPUTS = {
    "rsi": ["value"],
    "macd": ["macd", "signal", "histogram"],
    "ema": ["value"],
    "sma": ["value"],
    "wma": ["value"],
    "bollinger": ["upper", "middle", "lower"],
    "atr": ["value"],
    "vwap": ["value"],
    "stochastic": ["k", "d"],
    "stochastic_rsi": ["k", "d"],
    "cci": ["value"],
    "momentum": ["value"],
    "ichimoku": ["tenkan_sen", "kijun_sen", "senkou_span_a", "senkou_span_b", "chikou_span"],
    "supertrend": ["supertrend", "direction", "upper_band", "lower_band"],
    "keltner": ["upper", "middle", "lower"],
    "donchian": ["upper", "middle", "lower"],
    "obv": ["value"],
    "volume": ["value"],
    "volume_ma": ["value"],
    "price": ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4"]
}


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class IndicatorConfig:
    """
    Configuration for a single indicator.
    Supports editable parameters.
    """
    indicator_id: str               # e.g., "rsi", "macd", "ema"
    params: Dict[str, Any] = field(default_factory=dict)  # e.g., {"period": 14} or {"fast": 12, "slow": 26}
    timeframe: str = "1h"           # Timeframe for this indicator
    output: str = "value"           # Which output to use (for multi-output indicators)
    offset: int = 0                 # Look back N candles (0 = current)
    
    def get_cache_key(self) -> str:
        """Generate unique key for caching"""
        return f"{self.indicator_id}_{json.dumps(self.params, sort_keys=True)}_{self.timeframe}_{self.output}"
    
    def __hash__(self):
        """Make hashable for use in sets"""
        return hash(self.get_cache_key())
    
    def __eq__(self, other):
        if not isinstance(other, IndicatorConfig):
            return False
        return self.get_cache_key() == other.get_cache_key()


@dataclass
class Condition:
    """
    A single condition that compares an indicator to a value or another indicator.
    
    Examples:
    - RSI(14) < 30
    - EMA(9) crosses_above EMA(21)
    - Price > Bollinger.upper
    """
    left: IndicatorConfig                      # Left side of comparison
    comparator: str                            # ">", "<", "crosses_above", etc.
    right: Union[float, IndicatorConfig]       # Either a fixed value or another indicator
    right_value: Optional[float] = None        # For fixed value comparisons
    label: str = ""                            # Human-readable label
    weight: float = 1.0                        # Weight for confidence scoring


@dataclass
class ConditionGroup:
    """
    A group of conditions with AND/OR logic.
    Supports nested groups for complex logic.
    """
    operator: str = "AND"                      # "AND" or "OR"
    conditions: List[Union[Condition, 'ConditionGroup']] = field(default_factory=list)
    label: str = ""
    
    def add_condition(self, condition: Union[Condition, 'ConditionGroup']):
        self.conditions.append(condition)


@dataclass
class Strategy:
    """
    A complete trading strategy with entry, exit, and confirmation rules.
    Fully dynamic - no hardcoded logic.
    """
    strategy_id: str
    name: str
    description: str = ""
    version: str = "1.0"
    
    # Entry conditions (when to buy)
    entry_rules: ConditionGroup = field(default_factory=lambda: ConditionGroup(operator="AND"))
    
    # Exit conditions (when to sell)
    exit_rules: ConditionGroup = field(default_factory=lambda: ConditionGroup(operator="OR"))
    
    # Confirmation indicators (optional, adds confidence)
    confirmation_rules: Optional[ConditionGroup] = None
    
    # Multi-timeframe configuration
    primary_timeframe: str = "1h"
    confirmation_timeframes: List[str] = field(default_factory=list)  # e.g., ["15m", "4h"]
    
    # Timing
    min_holding_period_minutes: int = 0
    max_holding_period_minutes: Optional[int] = None
    cooldown_after_trade_minutes: int = 5
    
    # Order settings
    order_type: str = "market"  # "market" or "limit"
    order_size_type: str = "fixed"  # "fixed", "percent", "risk_based"
    order_size_value: float = 100  # Amount or percentage
    
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class Signal:
    """
    A generated trading signal with all context.
    """
    signal_id: str
    strategy_id: str
    bot_id: str
    signal_type: str  # "entry" or "exit"
    pair: str
    side: str  # "buy" or "sell"
    confidence: float  # 0.0 to 1.0
    price_at_signal: float
    timestamp: datetime
    
    # Context for audit trail
    indicator_snapshot: Dict[str, Any] = field(default_factory=dict)
    conditions_evaluated: List[Dict[str, Any]] = field(default_factory=list)
    trigger_reason: str = ""
    
    # Execution details
    executed: bool = False
    order_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# INDICATOR CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════════

class SignalIndicatorCalculator:
    """
    Calculate indicator values for signal evaluation.
    Supports multi-timeframe data.
    Uses CandleManager as SINGLE SOURCE OF TRUTH.
    """
    
    @staticmethod
    async def calculate_indicators(
        pair: str,
        indicators: List[IndicatorConfig],
        lookback_candles: int = 100,
        is_live_mode: bool = False,
        user_id: str = None,
        bot_id: str = None
    ) -> Tuple[Dict[str, Any], Optional[Dict], Optional[str]]:
        """
        Calculate all required indicators for a pair.
        
        Returns:
            (indicator_results, candle_source, error_message)
            
        If error_message is set, indicators will be empty and NO TRADE should occur.
        """
        results = {}
        candle_source = None
        
        # Group indicators by timeframe
        by_timeframe = defaultdict(list)
        for ind in indicators:
            by_timeframe[ind.timeframe].append(ind)
        
        # Fetch candles and calculate for each timeframe
        for timeframe, tf_indicators in by_timeframe.items():
            # Use CandleManager with full source tracking
            candles, source_info, error = await CandleManager.get_candles_with_source(
                pair=pair,
                timeframe=timeframe,
                limit=lookback_candles,
                is_live_mode=is_live_mode,
                user_id=user_id,
                bot_id=bot_id
            )
            
            # Store source for audit
            candle_source = source_info
            
            # Guardrail: If error occurred, return immediately with NO_TRADE
            if error:
                logger.error(f"[SignalIndicatorCalculator] Candle fetch error: {error}")
                return {}, candle_source, error
            
            if not candles:
                logger.warning(f"No candles for {pair} {timeframe}")
                continue
            
            # Convert to OHLCV objects
            ohlcv = [
                OHLCV(
                    timestamp=c["timestamp"],
                    open=c["open"],
                    high=c["high"],
                    low=c["low"],
                    close=c["close"],
                    volume=c.get("volume", 0)
                )
                for c in candles
            ]
            
            closes = [c.close for c in ohlcv]
            
            for ind in tf_indicators:
                try:
                    value = SignalIndicatorCalculator._calculate_single(
                        ind.indicator_id, ind.params, ind.output, ohlcv, closes
                    )
                    cache_key = ind.get_cache_key()
                    results[cache_key] = {
                        "current": value[-1] if isinstance(value, list) and value else value,
                        "previous": value[-2] if isinstance(value, list) and len(value) >= 2 else None,
                        "series": value[-10:] if isinstance(value, list) else [value]
                    }
                except Exception as e:
                    logger.error(f"Error calculating {ind.indicator_id}: {e}")
                    results[ind.get_cache_key()] = {"current": None, "previous": None, "series": []}
        
        return results, candle_source, None
    
    @staticmethod
    async def calculate_indicators_legacy(
        pair: str,
        indicators: List[IndicatorConfig],
        lookback_candles: int = 100
    ) -> Dict[str, Any]:
        """
        Legacy interface - returns just indicator results.
        For full audit info, use calculate_indicators() with source tracking.
        """
        results, _, error = await SignalIndicatorCalculator.calculate_indicators(
            pair=pair,
            indicators=indicators,
            lookback_candles=lookback_candles,
            is_live_mode=False
        )
        
        if error:
            logger.warning(f"[SignalIndicatorCalculator] Legacy call returned error: {error}")
        
        return results
    
    @staticmethod
    def _calculate_single(
        indicator_id: str,
        params: Dict,
        output: str,
        ohlcv: List[OHLCV],
        closes: List[float]
    ) -> Any:
        """Calculate a single indicator value"""
        
        if indicator_id == "rsi":
            period = params.get("period", 14)
            values = IndicatorCalculator.rsi(closes, period)
            return values
        
        elif indicator_id == "macd":
            fast = params.get("fast", 12)
            slow = params.get("slow", 26)
            signal = params.get("signal", 9)
            result = IndicatorCalculator.macd(closes, fast, slow, signal)
            if output == "macd":
                return result.get("macd", [])
            elif output == "signal":
                return result.get("signal", [])
            elif output == "histogram":
                return result.get("histogram", [])
            return result.get("macd", [])
        
        elif indicator_id == "ema":
            period = params.get("period", 20)
            return IndicatorCalculator.ema(closes, period)
        
        elif indicator_id == "sma":
            period = params.get("period", 20)
            return IndicatorCalculator.sma(closes, period)
        
        elif indicator_id == "wma":
            period = params.get("period", 20)
            return IndicatorCalculator.wma(closes, period)
        
        elif indicator_id == "bollinger":
            period = params.get("period", 20)
            std_dev = params.get("std_dev", 2.0)
            result = IndicatorCalculator.bollinger_bands(closes, period, std_dev)
            return result.get(output, [])
        
        elif indicator_id == "atr":
            period = params.get("period", 14)
            return IndicatorCalculator.atr(ohlcv, period)
        
        elif indicator_id == "vwap":
            return IndicatorCalculator.vwap(ohlcv)
        
        elif indicator_id == "stochastic":
            k_period = params.get("k_period", 14)
            d_period = params.get("d_period", 3)
            result = IndicatorCalculator.stochastic(ohlcv, k_period, d_period)
            return result.get(output, [])
        
        elif indicator_id == "stochastic_rsi":
            rsi_period = params.get("rsi_period", 14)
            stoch_period = params.get("stoch_period", 14)
            k_period = params.get("k_period", 3)
            d_period = params.get("d_period", 3)
            result = IndicatorCalculator.stochastic_rsi(closes, rsi_period, stoch_period, k_period, d_period)
            return result.get(output, [])
        
        elif indicator_id == "cci":
            period = params.get("period", 20)
            return IndicatorCalculator.cci(ohlcv, period)
        
        elif indicator_id == "momentum":
            period = params.get("period", 10)
            return IndicatorCalculator.momentum(closes, period)
        
        elif indicator_id == "ichimoku":
            tenkan = params.get("tenkan", 9)
            kijun = params.get("kijun", 26)
            senkou_b = params.get("senkou_b", 52)
            result = IndicatorCalculator.ichimoku(ohlcv, tenkan, kijun, senkou_b)
            return result.get(output, [])
        
        elif indicator_id == "supertrend":
            period = params.get("period", 10)
            multiplier = params.get("multiplier", 3.0)
            result = IndicatorCalculator.supertrend(ohlcv, period, multiplier)
            return result.get(output, [])
        
        elif indicator_id == "keltner":
            ema_period = params.get("ema_period", 20)
            atr_period = params.get("atr_period", 10)
            multiplier = params.get("multiplier", 2.0)
            result = IndicatorCalculator.keltner_channels(ohlcv, ema_period, atr_period, multiplier)
            return result.get(output, [])
        
        elif indicator_id == "donchian":
            period = params.get("period", 20)
            result = IndicatorCalculator.donchian_channels(ohlcv, period)
            return result.get(output, [])
        
        elif indicator_id == "obv":
            return IndicatorCalculator.obv(ohlcv)
        
        elif indicator_id == "volume":
            return [c.volume for c in ohlcv]
        
        elif indicator_id == "volume_ma":
            period = params.get("period", 20)
            return IndicatorCalculator.volume_ma(ohlcv, period)
        
        elif indicator_id == "price":
            source = output or params.get("source", "close")
            if source == "close":
                return closes
            elif source == "open":
                return [c.open for c in ohlcv]
            elif source == "high":
                return [c.high for c in ohlcv]
            elif source == "low":
                return [c.low for c in ohlcv]
            elif source == "hl2":
                return [(c.high + c.low) / 2 for c in ohlcv]
            elif source == "hlc3":
                return [(c.high + c.low + c.close) / 3 for c in ohlcv]
            elif source == "ohlc4":
                return [(c.open + c.high + c.low + c.close) / 4 for c in ohlcv]
            return closes
        
        # Fallback
        return [None] * len(closes)


# ═══════════════════════════════════════════════════════════════════════════════
# CONDITION EVALUATOR
# ═══════════════════════════════════════════════════════════════════════════════

class ConditionEvaluator:
    """
    Evaluate conditions against indicator values.
    Supports all comparison types and crossover detection.
    """
    
    @staticmethod
    def evaluate_condition(
        condition: Condition,
        indicator_values: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Evaluate a single condition.
        Returns (result, details).
        """
        left_key = condition.left.get_cache_key()
        left_data = indicator_values.get(left_key, {})
        left_current = left_data.get("current")
        left_previous = left_data.get("previous")
        
        # Get offset values if needed
        if condition.left.offset > 0:
            series = left_data.get("series", [])
            if len(series) > condition.left.offset:
                left_current = series[-(condition.left.offset + 1)]
        
        # Get right side value
        if isinstance(condition.right, IndicatorConfig):
            right_key = condition.right.get_cache_key()
            right_data = indicator_values.get(right_key, {})
            right_current = right_data.get("current")
            right_previous = right_data.get("previous")
            
            if condition.right.offset > 0:
                series = right_data.get("series", [])
                if len(series) > condition.right.offset:
                    right_current = series[-(condition.right.offset + 1)]
        else:
            right_current = condition.right if condition.right is not None else condition.right_value
            right_previous = right_current
        
        details = {
            "condition": condition.label or f"{condition.left.indicator_id} {condition.comparator} {right_current}",
            "left_value": left_current,
            "right_value": right_current,
            "comparator": condition.comparator,
            "weight": condition.weight
        }
        
        # Handle None values
        if left_current is None:
            return False, {**details, "error": "Left value is None"}
        if right_current is None and condition.comparator not in ["rising", "falling"]:
            return False, {**details, "error": "Right value is None"}
        
        # Evaluate based on comparator
        result = False
        
        if condition.comparator == ">":
            result = left_current > right_current
        elif condition.comparator == "<":
            result = left_current < right_current
        elif condition.comparator == ">=":
            result = left_current >= right_current
        elif condition.comparator == "<=":
            result = left_current <= right_current
        elif condition.comparator == "==":
            result = abs(left_current - right_current) < 0.0001
        elif condition.comparator == "!=":
            result = abs(left_current - right_current) >= 0.0001
        
        elif condition.comparator == "crosses_above":
            if left_previous is None or right_previous is None:
                result = False
            else:
                result = left_previous <= right_previous and left_current > right_current
        
        elif condition.comparator == "crosses_below":
            if left_previous is None or right_previous is None:
                result = False
            else:
                result = left_previous >= right_previous and left_current < right_current
        
        elif condition.comparator == "rising":
            if left_previous is None:
                result = False
            else:
                result = left_current > left_previous
        
        elif condition.comparator == "falling":
            if left_previous is None:
                result = False
            else:
                result = left_current < left_previous
        
        elif condition.comparator == "between":
            # Expects right to be a tuple (low, high)
            if isinstance(right_current, (list, tuple)) and len(right_current) == 2:
                result = right_current[0] <= left_current <= right_current[1]
        
        elif condition.comparator == "outside":
            # Expects right to be a tuple (low, high)
            if isinstance(right_current, (list, tuple)) and len(right_current) == 2:
                result = left_current < right_current[0] or left_current > right_current[1]
        
        details["result"] = result
        return result, details
    
    @staticmethod
    def evaluate_group(
        group: ConditionGroup,
        indicator_values: Dict[str, Any]
    ) -> Tuple[bool, float, List[Dict[str, Any]]]:
        """
        Evaluate a group of conditions with AND/OR logic.
        Returns (result, confidence, condition_details).
        """
        if not group.conditions:
            return False, 0.0, []
        
        results = []
        details = []
        total_weight = 0
        weighted_true = 0
        
        for item in group.conditions:
            if isinstance(item, ConditionGroup):
                # Nested group
                nested_result, nested_confidence, nested_details = ConditionEvaluator.evaluate_group(
                    item, indicator_values
                )
                results.append(nested_result)
                details.append({
                    "type": "group",
                    "operator": item.operator,
                    "result": nested_result,
                    "confidence": nested_confidence,
                    "details": nested_details
                })
                weight = 1.0
            else:
                # Single condition
                result, cond_details = ConditionEvaluator.evaluate_condition(item, indicator_values)
                results.append(result)
                details.append({"type": "condition", **cond_details})
                weight = item.weight
            
            total_weight += weight
            if results[-1]:
                weighted_true += weight
        
        # Calculate overall result based on operator
        if group.operator == "AND":
            final_result = all(results)
        else:  # OR
            final_result = any(results)
        
        # Calculate confidence (weighted percentage of true conditions)
        confidence = weighted_true / total_weight if total_weight > 0 else 0
        
        return final_result, confidence, details


# ═══════════════════════════════════════════════════════════════════════════════
# DECISION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class DecisionEngine:
    """
    Main decision engine for signal bots.
    Evaluates strategies deterministically and generates signals.
    """
    
    @staticmethod
    def extract_indicators_from_strategy(strategy: Strategy) -> List[IndicatorConfig]:
        """Extract all unique indicators needed for a strategy"""
        indicators = set()
        
        def extract_from_group(group: ConditionGroup):
            for item in group.conditions:
                if isinstance(item, ConditionGroup):
                    extract_from_group(item)
                elif isinstance(item, Condition):
                    indicators.add(item.left)
                    if isinstance(item.right, IndicatorConfig):
                        indicators.add(item.right)
        
        extract_from_group(strategy.entry_rules)
        extract_from_group(strategy.exit_rules)
        if strategy.confirmation_rules:
            extract_from_group(strategy.confirmation_rules)
        
        return list(indicators)
    
    @staticmethod
    async def evaluate_strategy(
        strategy: Strategy,
        pair: str,
        bot_id: str,
        current_position: Optional[str] = None,  # "long", "short", or None
        is_live_mode: bool = False,
        user_id: str = None
    ) -> Tuple[Optional[Signal], Dict[str, Any]]:
        """
        Evaluate a strategy and return a signal if conditions are met.
        
        Args:
            strategy: The strategy to evaluate
            pair: Trading pair (e.g., "BTCUSD")
            bot_id: Bot ID for tracking
            current_position: Current position state
            is_live_mode: True if LIVE mode, False for PAPER
            user_id: User ID for credential/balance lookup
        
        Returns:
            (Signal or None, evaluation_details)
        """
        evaluation_start = datetime.now(timezone.utc)
        
        # Extract all required indicators
        required_indicators = DecisionEngine.extract_indicators_from_strategy(strategy)
        
        # Calculate indicator values WITH SOURCE TRACKING
        indicator_values, candle_source, data_error = await SignalIndicatorCalculator.calculate_indicators(
            pair=pair,
            indicators=required_indicators,
            lookback_candles=100,
            is_live_mode=is_live_mode,
            user_id=user_id,
            bot_id=bot_id
        )
        
        # Guardrail: If candle source returned error, NO TRADE
        if data_error:
            logger.error(f"[DecisionEngine] Data error prevented evaluation: {data_error}")
            return None, {
                "error": f"DATA_SOURCE_ERROR: {data_error}",
                "candle_source": candle_source,
                "mode": "live" if is_live_mode else "paper",
                "bot_id": bot_id
            }
        
        # Get current price
        current_price = await CandleManager.get_latest_price(pair, is_live_mode=is_live_mode, user_id=user_id)
        if not current_price:
            return None, {"error": "Could not fetch current price"}
        
        # Prepare evaluation result
        eval_details = {
            "strategy_id": strategy.strategy_id,
            "strategy_name": strategy.name,
            "pair": pair,
            "current_price": current_price,
            "current_position": current_position,
            "timestamp": evaluation_start.isoformat(),
            "indicator_snapshot": {},
            "entry_evaluation": None,
            "exit_evaluation": None,
            "confirmation_evaluation": None,
            "signal": None,
            # Phase 8: Add candle source tracking for audit
            "candle_source": candle_source,
            "mode": "live" if is_live_mode else "paper",
            "is_live_exchange": candle_source.get("is_live_exchange", False) if candle_source else False
        }
        
        # Create indicator snapshot for logging
        for key, data in indicator_values.items():
            eval_details["indicator_snapshot"][key] = {
                "current": data.get("current"),
                "previous": data.get("previous")
            }
        
        signal = None
        
        # Check EXIT conditions first if in position
        if current_position in ["long", "short"]:
            exit_result, exit_confidence, exit_details = ConditionEvaluator.evaluate_group(
                strategy.exit_rules, indicator_values
            )
            
            eval_details["exit_evaluation"] = {
                "result": exit_result,
                "confidence": exit_confidence,
                "conditions": exit_details
            }
            
            if exit_result:
                signal = Signal(
                    signal_id=str(uuid.uuid4()),
                    strategy_id=strategy.strategy_id,
                    bot_id=bot_id,
                    signal_type="exit",
                    pair=pair,
                    side="sell" if current_position == "long" else "buy",
                    confidence=exit_confidence,
                    price_at_signal=current_price,
                    timestamp=evaluation_start,
                    indicator_snapshot=eval_details["indicator_snapshot"],
                    conditions_evaluated=exit_details,
                    trigger_reason=f"Exit conditions met ({exit_confidence:.0%} confidence)"
                )
        
        # Check ENTRY conditions if not in position and no exit signal
        if not signal and not current_position:
            entry_result, entry_confidence, entry_details = ConditionEvaluator.evaluate_group(
                strategy.entry_rules, indicator_values
            )
            
            eval_details["entry_evaluation"] = {
                "result": entry_result,
                "confidence": entry_confidence,
                "conditions": entry_details
            }
            
            if entry_result:
                # Check confirmation if configured
                confirmation_passed = True
                if strategy.confirmation_rules:
                    conf_result, conf_confidence, conf_details = ConditionEvaluator.evaluate_group(
                        strategy.confirmation_rules, indicator_values
                    )
                    eval_details["confirmation_evaluation"] = {
                        "result": conf_result,
                        "confidence": conf_confidence,
                        "conditions": conf_details
                    }
                    confirmation_passed = conf_result
                    # Adjust confidence based on confirmation
                    if conf_result:
                        entry_confidence = (entry_confidence + conf_confidence) / 2
                    else:
                        entry_confidence *= 0.5
                
                if confirmation_passed or entry_confidence >= 0.7:
                    signal = Signal(
                        signal_id=str(uuid.uuid4()),
                        strategy_id=strategy.strategy_id,
                        bot_id=bot_id,
                        signal_type="entry",
                        pair=pair,
                        side="buy",  # Signal bot is long-only for now
                        confidence=entry_confidence,
                        price_at_signal=current_price,
                        timestamp=evaluation_start,
                        indicator_snapshot=eval_details["indicator_snapshot"],
                        conditions_evaluated=entry_details,
                        trigger_reason=f"Entry conditions met ({entry_confidence:.0%} confidence)"
                    )
        
        if signal:
            eval_details["signal"] = asdict(signal)
        
        return signal, eval_details
    
    @staticmethod
    async def check_cooldown(bot_id: str, cooldown_minutes: int) -> bool:
        """
        Check if bot is in cooldown period after a trade.
        Returns True if cooldown is active (should not trade).
        """
        state = await StateManager.load_state(bot_id)
        if not state:
            return False
        
        if state.last_decision_at:
            cooldown_end = state.last_decision_at + timedelta(minutes=cooldown_minutes)
            if datetime.now(timezone.utc) < cooldown_end:
                return True
        
        return False
    
    @staticmethod
    async def execute_signal(
        signal: Signal,
        strategy: Strategy,
        user_id: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Execute a trading signal.
        Returns (success, message, order_id)
        """
        # Create order request
        order_request = OrderRequest(
            bot_id=signal.bot_id,
            user_id=user_id,
            pair=signal.pair,
            side=OrderSide.BUY if signal.side == "buy" else OrderSide.SELL,
            order_type=OrderType.MARKET if strategy.order_type == "market" else OrderType.LIMIT,
            quantity=strategy.order_size_value,  # TODO: Calculate based on size_type
            metadata={
                "signal_id": signal.signal_id,
                "strategy_id": strategy.strategy_id,
                "signal_type": signal.signal_type,
                "confidence": signal.confidence,
                "trigger_reason": signal.trigger_reason
            }
        )
        
        # Get current price
        current_price = await CandleManager.get_latest_price(signal.pair)
        if not current_price:
            return False, "Could not fetch price", None
        
        # Create order
        order, message = await OrderManager.create_order(order_request, current_price)
        
        if order:
            # Log the decision
            await DecisionLogger.log_decision(
                bot_id=signal.bot_id,
                decision_type=signal.signal_type,
                reason=signal.trigger_reason,
                indicator_values=signal.indicator_snapshot,
                strategy_config={"strategy_id": strategy.strategy_id, "name": strategy.name},
                order_id=order.order_id,
                metadata={
                    "signal_id": signal.signal_id,
                    "confidence": signal.confidence,
                    "price": current_price
                }
            )
            
            return True, "Order created", order.order_id
        
        return False, message, None


# ═══════════════════════════════════════════════════════════════════════════════
# STRATEGY BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

class StrategyBuilder:
    """
    Build strategies from JSON configuration.
    Converts user-friendly format to internal Strategy objects.
    """
    
    @staticmethod
    def from_dict(config: Dict[str, Any]) -> Strategy:
        """
        Build a Strategy from a dictionary configuration.
        
        Expected format:
        {
            "name": "My Strategy",
            "description": "Buy when RSI is low",
            "primary_timeframe": "1h",
            "entry_rules": {
                "operator": "AND",
                "conditions": [
                    {
                        "indicator": "rsi",
                        "params": {"period": 14},
                        "timeframe": "1h",
                        "comparator": "<",
                        "value": 30
                    },
                    {
                        "indicator": "ema",
                        "params": {"period": 9},
                        "timeframe": "1h",
                        "comparator": "crosses_above",
                        "compare_to": {
                            "indicator": "ema",
                            "params": {"period": 21}
                        }
                    }
                ]
            },
            "exit_rules": {
                "operator": "OR",
                "conditions": [
                    {
                        "indicator": "rsi",
                        "params": {"period": 14},
                        "comparator": ">",
                        "value": 70
                    }
                ]
            },
            "order_type": "market",
            "order_size_value": 100
        }
        """
        strategy = Strategy(
            strategy_id=config.get("strategy_id") or str(uuid.uuid4()),
            name=config.get("name", "Unnamed Strategy"),
            description=config.get("description", ""),
            version=config.get("version", "1.0"),
            primary_timeframe=config.get("primary_timeframe", "1h"),
            confirmation_timeframes=config.get("confirmation_timeframes", []),
            min_holding_period_minutes=config.get("min_holding_period_minutes", 0),
            max_holding_period_minutes=config.get("max_holding_period_minutes"),
            cooldown_after_trade_minutes=config.get("cooldown_after_trade_minutes", 5),
            order_type=config.get("order_type", "market"),
            order_size_type=config.get("order_size_type", "fixed"),
            order_size_value=config.get("order_size_value", 100)
        )
        
        # Parse entry rules
        if "entry_rules" in config:
            strategy.entry_rules = StrategyBuilder._parse_condition_group(config["entry_rules"])
        
        # Parse exit rules
        if "exit_rules" in config:
            strategy.exit_rules = StrategyBuilder._parse_condition_group(config["exit_rules"])
        
        # Parse confirmation rules (only if not None)
        if "confirmation_rules" in config and config["confirmation_rules"] is not None:
            strategy.confirmation_rules = StrategyBuilder._parse_condition_group(config["confirmation_rules"])
        
        return strategy
    
    @staticmethod
    def _parse_condition_group(group_config: Dict) -> ConditionGroup:
        """Parse a condition group from config"""
        group = ConditionGroup(
            operator=group_config.get("operator", "AND"),
            label=group_config.get("label", "")
        )
        
        for cond_config in group_config.get("conditions", []):
            if "conditions" in cond_config:
                # Nested group
                nested = StrategyBuilder._parse_condition_group(cond_config)
                group.add_condition(nested)
            else:
                # Single condition
                condition = StrategyBuilder._parse_condition(cond_config)
                group.add_condition(condition)
        
        return group
    
    @staticmethod
    def _parse_condition(cond_config: Dict) -> Condition:
        """Parse a single condition from config"""
        # Parse left indicator
        left = IndicatorConfig(
            indicator_id=cond_config.get("indicator", "price"),
            params=cond_config.get("params", {}),
            timeframe=cond_config.get("timeframe", "1h"),
            output=cond_config.get("output", "value"),
            offset=cond_config.get("offset", 0)
        )
        
        # Parse right side
        if "compare_to" in cond_config:
            compare_config = cond_config["compare_to"]
            right = IndicatorConfig(
                indicator_id=compare_config.get("indicator", "price"),
                params=compare_config.get("params", {}),
                timeframe=compare_config.get("timeframe", cond_config.get("timeframe", "1h")),
                output=compare_config.get("output", "value"),
                offset=compare_config.get("offset", 0)
            )
        else:
            right = cond_config.get("value")
        
        return Condition(
            left=left,
            comparator=cond_config.get("comparator", ">"),
            right=right,
            right_value=cond_config.get("value"),
            label=cond_config.get("label", ""),
            weight=cond_config.get("weight", 1.0)
        )
    
    @staticmethod
    def to_dict(strategy: Strategy) -> Dict[str, Any]:
        """Convert a Strategy to dictionary for storage/API"""
        return {
            "strategy_id": strategy.strategy_id,
            "name": strategy.name,
            "description": strategy.description,
            "version": strategy.version,
            "primary_timeframe": strategy.primary_timeframe,
            "confirmation_timeframes": strategy.confirmation_timeframes,
            "entry_rules": StrategyBuilder._group_to_dict(strategy.entry_rules),
            "exit_rules": StrategyBuilder._group_to_dict(strategy.exit_rules),
            "confirmation_rules": StrategyBuilder._group_to_dict(strategy.confirmation_rules) if strategy.confirmation_rules else None,
            "min_holding_period_minutes": strategy.min_holding_period_minutes,
            "max_holding_period_minutes": strategy.max_holding_period_minutes,
            "cooldown_after_trade_minutes": strategy.cooldown_after_trade_minutes,
            "order_type": strategy.order_type,
            "order_size_type": strategy.order_size_type,
            "order_size_value": strategy.order_size_value
        }
    
    @staticmethod
    def _group_to_dict(group: ConditionGroup) -> Dict:
        """Convert condition group to dict"""
        conditions = []
        for item in group.conditions:
            if isinstance(item, ConditionGroup):
                conditions.append(StrategyBuilder._group_to_dict(item))
            else:
                conditions.append(StrategyBuilder._condition_to_dict(item))
        
        return {
            "operator": group.operator,
            "conditions": conditions,
            "label": group.label
        }
    
    @staticmethod
    def _condition_to_dict(cond: Condition) -> Dict:
        """Convert condition to dict"""
        result = {
            "indicator": cond.left.indicator_id,
            "params": cond.left.params,
            "timeframe": cond.left.timeframe,
            "output": cond.left.output,
            "comparator": cond.comparator,
            "label": cond.label,
            "weight": cond.weight
        }
        
        if cond.left.offset > 0:
            result["offset"] = cond.left.offset
        
        if isinstance(cond.right, IndicatorConfig):
            result["compare_to"] = {
                "indicator": cond.right.indicator_id,
                "params": cond.right.params,
                "timeframe": cond.right.timeframe,
                "output": cond.right.output
            }
            if cond.right.offset > 0:
                result["compare_to"]["offset"] = cond.right.offset
        else:
            result["value"] = cond.right_value or cond.right
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Enums
    "SignalType",
    "Comparator",
    "LogicalOperator",
    
    # Data Classes
    "IndicatorConfig",
    "Condition",
    "ConditionGroup",
    "Strategy",
    "Signal",
    
    # Constants
    "SUPPORTED_TIMEFRAMES",
    "INDICATOR_OUTPUTS",
    
    # Core Components
    "SignalIndicatorCalculator",
    "ConditionEvaluator",
    "DecisionEngine",
    "StrategyBuilder",
]
