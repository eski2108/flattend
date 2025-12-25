"""
🤖 COINHUBX BOT TYPES - PHASE 3
═══════════════════════════════════════════════════════════════════════════════

BOT TYPES: Signal Bot, DCA Bot, Grid Bot

Each bot type has:
- Separate configuration schema
- Separate execution logic
- Full risk management support

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
import json
import math

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]


# ═══════════════════════════════════════════════════════════════════════════════
# BOT TYPE CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SignalBotConfig:
    """
    Signal Bot Configuration
    
    Signal-based entry/exit using Phase 2 Strategy Engine.
    """
    # Strategy (from Phase 2)
    strategy: Dict[str, Any] = field(default_factory=dict)
    
    # Risk Management
    stop_loss_percent: float = 5.0           # Hard stop loss %
    stop_loss_type: str = "trailing"         # "fixed" or "trailing"
    trailing_stop_callback: float = 1.0      # Trailing callback %
    take_profit_percent: float = 10.0        # Take profit %
    take_profit_type: str = "trailing"       # "fixed" or "trailing"
    trailing_tp_callback: float = 0.5        # Trailing TP callback %
    
    # Position sizing
    position_size_type: str = "fixed"        # "fixed", "percent", "risk_based"
    position_size_value: float = 100         # Amount or percentage
    max_position_size: float = 1000          # Maximum position value
    
    # Time management
    max_holding_minutes: Optional[int] = None  # Auto-exit after N minutes
    trade_start_hour: int = 0                   # Trading hours start (0-23)
    trade_end_hour: int = 24                    # Trading hours end
    
    # Cooldowns
    cooldown_after_win_minutes: int = 5
    cooldown_after_loss_minutes: int = 15
    
    def validate(self) -> Tuple[bool, str]:
        """Validate configuration"""
        if not self.strategy:
            return False, "Strategy is required"
        if self.stop_loss_percent <= 0:
            return False, "Stop loss must be positive"
        if self.take_profit_percent <= 0:
            return False, "Take profit must be positive"
        if self.position_size_value <= 0:
            return False, "Position size must be positive"
        return True, "OK"


@dataclass
class DCABotConfig:
    """
    DCA (Dollar Cost Averaging) Bot Configuration
    
    Full-featured DCA with safety orders and scaling.
    """
    # Base configuration
    pair: str = "BTCUSD"
    side: str = "long"                        # "long" or "short"
    
    # Order sizing
    initial_order_size: float = 100           # Base order size in quote currency
    safety_order_size: float = 50             # Safety order size
    safety_order_multiplier: float = 1.5      # Scale factor for each safety order
    max_safety_orders: int = 5                # Maximum number of safety orders
    
    # Deviation settings
    price_deviation_percent: float = 2.0      # % price drop to trigger safety order
    deviation_multiplier: float = 1.5         # Scale factor for deviation
    
    # Take profit
    take_profit_percent: float = 2.0          # TP from average entry
    take_profit_type: str = "total"           # "total" or "per_trade"
    trailing_take_profit: bool = False
    trailing_tp_deviation: float = 0.5        # % callback for trailing TP
    
    # Stop loss
    stop_loss_percent: float = 10.0           # SL from average entry (0 = disabled)
    
    # Capital limits
    max_capital: float = 0                    # Max capital to use (0 = no limit)
    
    # Timing
    start_condition: str = "immediate"        # "immediate", "signal", "scheduled"
    
    def validate(self) -> Tuple[bool, str]:
        """Validate configuration"""
        if self.initial_order_size <= 0:
            return False, "Initial order size must be positive"
        if self.safety_order_size <= 0:
            return False, "Safety order size must be positive"
        if self.max_safety_orders < 0:
            return False, "Max safety orders cannot be negative"
        if self.price_deviation_percent <= 0:
            return False, "Price deviation must be positive"
        if self.take_profit_percent <= 0:
            return False, "Take profit must be positive"
        return True, "OK"
    
    def calculate_safety_order_price(self, entry_price: float, order_num: int) -> float:
        """Calculate price level for safety order N"""
        total_deviation = 0
        for i in range(order_num):
            total_deviation += self.price_deviation_percent * (self.deviation_multiplier ** i)
        
        if self.side == "long":
            return entry_price * (1 - total_deviation / 100)
        else:
            return entry_price * (1 + total_deviation / 100)
    
    def calculate_safety_order_size(self, order_num: int) -> float:
        """Calculate size for safety order N"""
        return self.safety_order_size * (self.safety_order_multiplier ** order_num)
    
    def calculate_total_capital_required(self) -> float:
        """Calculate total capital needed for all orders"""
        total = self.initial_order_size
        for i in range(self.max_safety_orders):
            total += self.calculate_safety_order_size(i)
        return total


@dataclass
class GridBotConfig:
    """
    Grid Bot Configuration
    
    Full-featured grid trading with dynamic spacing options.
    """
    # Grid boundaries
    pair: str = "BTCUSD"
    upper_price: float = 0                    # Upper grid boundary
    lower_price: float = 0                    # Lower grid boundary
    
    # Grid structure
    grid_count: int = 10                      # Number of grid levels
    spacing_type: str = "arithmetic"          # "arithmetic" or "geometric"
    
    # Capital
    total_capital: float = 1000               # Total capital to use
    capital_per_grid: float = 0               # Per-grid capital (calculated if 0)
    
    # Profit settings
    profit_per_grid_percent: float = 0.5      # Profit per grid completion
    trailing_grid: bool = False               # Adjust grid based on price
    
    # Auto-stop conditions
    stop_loss_percent: float = 0              # SL from lower boundary (0 = disabled)
    take_profit_percent: float = 0            # TP from upper boundary (0 = disabled)
    auto_stop_on_breakout: bool = True        # Stop if price leaves grid
    
    # Mode
    mode: str = "neutral"                     # "long", "short", "neutral"
    
    def validate(self) -> Tuple[bool, str]:
        """Validate configuration"""
        if self.upper_price <= 0:
            return False, "Upper price must be positive"
        if self.lower_price <= 0:
            return False, "Lower price must be positive"
        if self.upper_price <= self.lower_price:
            return False, "Upper price must be greater than lower price"
        if self.grid_count < 2:
            return False, "Grid count must be at least 2"
        if self.total_capital <= 0:
            return False, "Total capital must be positive"
        return True, "OK"
    
    def calculate_grid_levels(self) -> List[float]:
        """Calculate all grid price levels"""
        if self.spacing_type == "geometric":
            # Geometric spacing (equal % between levels)
            ratio = (self.upper_price / self.lower_price) ** (1 / self.grid_count)
            return [self.lower_price * (ratio ** i) for i in range(self.grid_count + 1)]
        else:
            # Arithmetic spacing (equal $ between levels)
            step = (self.upper_price - self.lower_price) / self.grid_count
            return [self.lower_price + (step * i) for i in range(self.grid_count + 1)]
    
    def calculate_capital_per_grid(self) -> float:
        """Calculate capital allocation per grid level"""
        if self.capital_per_grid > 0:
            return self.capital_per_grid
        return self.total_capital / self.grid_count


# ═══════════════════════════════════════════════════════════════════════════════
# SIGNAL BOT EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class SignalBotExecutor:
    """
    Executes Signal Bot logic with full risk management.
    """
    
    @staticmethod
    async def execute(
        bot_id: str,
        config: Dict[str, Any],
        state: Dict[str, Any],
        current_price: float
    ) -> Dict[str, Any]:
        """
        Execute a single tick for Signal Bot.
        Returns actions taken and updated state.
        """
        from signal_engine import StrategyBuilder, DecisionEngine
        from bot_execution_engine import (
            PositionManager, OrderManager, OrderRequest,
            OrderType, OrderSide, DecisionLogger
        )
        
        actions = []
        params = config.get("params", {})
        user_id = config.get("user_id")
        pair = config.get("pair", "BTCUSD")
        paper_mode = config.get("paper_mode", False)
        
        # Get Signal Bot config
        signal_config = SignalBotConfig(
            strategy=params.get("strategy", {}),
            stop_loss_percent=params.get("stop_loss_percent", 5.0),
            stop_loss_type=params.get("stop_loss_type", "trailing"),
            trailing_stop_callback=params.get("trailing_stop_callback", 1.0),
            take_profit_percent=params.get("take_profit_percent", 10.0),
            take_profit_type=params.get("take_profit_type", "trailing"),
            trailing_tp_callback=params.get("trailing_tp_callback", 0.5),
            position_size_type=params.get("position_size_type", "fixed"),
            position_size_value=params.get("position_size_value", 100),
            max_position_size=params.get("max_position_size", 1000),
            max_holding_minutes=params.get("max_holding_minutes"),
            cooldown_after_win_minutes=params.get("cooldown_after_win_minutes", 5),
            cooldown_after_loss_minutes=params.get("cooldown_after_loss_minutes", 15)
        )
        
        # Validate config
        valid, msg = signal_config.validate()
        if not valid:
            return {"actions": [f"Invalid config: {msg}"], "state": state}
        
        # Get open positions
        open_positions = await PositionManager.get_open_positions(bot_id)
        current_position = None
        if open_positions:
            current_position = open_positions[0]
        
        # Check risk management if in position
        if current_position:
            # Check stop loss
            entry_price = current_position.entry_price
            side = current_position.side
            
            # Update trailing stop if enabled
            if signal_config.stop_loss_type == "trailing":
                high_water_mark = state.get("high_water_mark", entry_price)
                if side == "long":
                    high_water_mark = max(high_water_mark, current_price)
                    trailing_stop = high_water_mark * (1 - signal_config.trailing_stop_callback / 100)
                else:
                    high_water_mark = min(high_water_mark, current_price)
                    trailing_stop = high_water_mark * (1 + signal_config.trailing_stop_callback / 100)
                
                state["high_water_mark"] = high_water_mark
                state["trailing_stop"] = trailing_stop
            else:
                if side == "long":
                    trailing_stop = entry_price * (1 - signal_config.stop_loss_percent / 100)
                else:
                    trailing_stop = entry_price * (1 + signal_config.stop_loss_percent / 100)
            
            # Check stop loss hit
            stop_hit = False
            if side == "long" and current_price <= trailing_stop:
                stop_hit = True
            elif side == "short" and current_price >= trailing_stop:
                stop_hit = True
            
            if stop_hit:
                actions.append(f"STOP LOSS HIT at ${current_price:.2f}")
                # Close position
                result = await PositionManager.close_position(
                    current_position.position_id,
                    current_price,
                    f"stop_loss_{bot_id}"
                )
                if result:
                    position, pnl = result
                    actions.append(f"Position closed. PnL: ${pnl:.2f}")
                    
                    await DecisionLogger.log_decision(
                        bot_id=bot_id,
                        decision_type="exit",
                        reason=f"Stop loss hit at ${current_price:.2f}",
                        indicator_values={},
                        strategy_config={"stop_loss": trailing_stop},
                        metadata={"pnl": pnl, "exit_price": current_price}
                    )
                
                return {"actions": actions, "state": state}
            
            # Check take profit
            if signal_config.take_profit_type == "trailing":
                tp_trigger = entry_price * (1 + signal_config.take_profit_percent / 100) if side == "long" else entry_price * (1 - signal_config.take_profit_percent / 100)
                
                if (side == "long" and current_price >= tp_trigger) or (side == "short" and current_price <= tp_trigger):
                    # Enable trailing TP
                    trailing_tp_high = state.get("trailing_tp_high", current_price)
                    if side == "long":
                        trailing_tp_high = max(trailing_tp_high, current_price)
                        trailing_tp_exit = trailing_tp_high * (1 - signal_config.trailing_tp_callback / 100)
                        
                        if current_price <= trailing_tp_exit:
                            actions.append(f"TRAILING TP EXIT at ${current_price:.2f}")
                            result = await PositionManager.close_position(
                                current_position.position_id, current_price, f"trailing_tp_{bot_id}"
                            )
                            if result:
                                position, pnl = result
                                actions.append(f"Position closed. PnL: ${pnl:.2f}")
                            return {"actions": actions, "state": state}
                    
                    state["trailing_tp_high"] = trailing_tp_high
            else:
                # Fixed take profit
                if side == "long":
                    tp_price = entry_price * (1 + signal_config.take_profit_percent / 100)
                    if current_price >= tp_price:
                        actions.append(f"TAKE PROFIT HIT at ${current_price:.2f}")
                        result = await PositionManager.close_position(
                            current_position.position_id, current_price, f"take_profit_{bot_id}"
                        )
                        if result:
                            position, pnl = result
                            actions.append(f"Position closed. PnL: ${pnl:.2f}")
                        return {"actions": actions, "state": state}
                else:
                    tp_price = entry_price * (1 - signal_config.take_profit_percent / 100)
                    if current_price <= tp_price:
                        actions.append(f"TAKE PROFIT HIT at ${current_price:.2f}")
                        result = await PositionManager.close_position(
                            current_position.position_id, current_price, f"take_profit_{bot_id}"
                        )
                        if result:
                            position, pnl = result
                            actions.append(f"Position closed. PnL: ${pnl:.2f}")
                        return {"actions": actions, "state": state}
            
            # Check max holding time
            if signal_config.max_holding_minutes:
                position_age = (datetime.now(timezone.utc) - current_position.opened_at).total_seconds() / 60
                if position_age >= signal_config.max_holding_minutes:
                    actions.append(f"MAX HOLD TIME reached ({position_age:.0f} min)")
                    result = await PositionManager.close_position(
                        current_position.position_id, current_price, f"max_hold_{bot_id}"
                    )
                    if result:
                        position, pnl = result
                        actions.append(f"Position closed. PnL: ${pnl:.2f}")
                    return {"actions": actions, "state": state}
        
        # If no position, evaluate strategy for entry
        if not current_position and signal_config.strategy:
            strategy = StrategyBuilder.from_dict(signal_config.strategy)
            signal, details = await DecisionEngine.evaluate_strategy(
                strategy=strategy,
                pair=pair,
                bot_id=bot_id,
                current_position=None
            )
            
            if signal:
                actions.append(f"ENTRY SIGNAL: {signal.side} ({signal.confidence:.0%} confidence)")
                
                if not paper_mode:
                    # Open position
                    position = await PositionManager.open_position(
                        bot_id=bot_id,
                        user_id=user_id,
                        pair=pair,
                        side="long" if signal.side == "buy" else "short",
                        quantity=signal_config.position_size_value / current_price,
                        entry_price=current_price,
                        order_id=f"signal_entry_{bot_id}_{uuid.uuid4().hex[:8]}"
                    )
                    actions.append(f"Position opened at ${current_price:.2f}")
                    
                    # Reset state
                    state["high_water_mark"] = current_price
                    state["trailing_tp_high"] = current_price
                else:
                    actions.append("[PAPER] Would open position")
                
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type="entry",
                    reason=signal.trigger_reason,
                    indicator_values=signal.indicator_snapshot,
                    strategy_config={"strategy_id": strategy.strategy_id},
                    metadata={"price": current_price, "confidence": signal.confidence}
                )
            else:
                actions.append(f"No entry signal at ${current_price:.2f}")
        
        return {"actions": actions, "state": state}


# ═══════════════════════════════════════════════════════════════════════════════
# DCA BOT EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class DCABotExecutor:
    """
    Executes DCA Bot logic with safety orders and scaling.
    """
    
    @staticmethod
    async def execute(
        bot_id: str,
        config: Dict[str, Any],
        state: Dict[str, Any],
        current_price: float
    ) -> Dict[str, Any]:
        """
        Execute a single tick for DCA Bot.
        """
        from bot_execution_engine import (
            PositionManager, OrderManager, OrderRequest,
            OrderType, OrderSide, DecisionLogger
        )
        
        actions = []
        params = config.get("params", {})
        user_id = config.get("user_id")
        pair = config.get("pair", "BTCUSD")
        paper_mode = config.get("paper_mode", False)
        
        # Build DCA config
        dca_config = DCABotConfig(
            pair=pair,
            side=params.get("side", "long"),
            initial_order_size=params.get("initial_order_size", 100),
            safety_order_size=params.get("safety_order_size", 50),
            safety_order_multiplier=params.get("safety_order_multiplier", 1.5),
            max_safety_orders=params.get("max_safety_orders", 5),
            price_deviation_percent=params.get("price_deviation_percent", 2.0),
            deviation_multiplier=params.get("deviation_multiplier", 1.5),
            take_profit_percent=params.get("take_profit_percent", 2.0),
            take_profit_type=params.get("take_profit_type", "total"),
            trailing_take_profit=params.get("trailing_take_profit", False),
            trailing_tp_deviation=params.get("trailing_tp_deviation", 0.5),
            stop_loss_percent=params.get("stop_loss_percent", 10.0),
            max_capital=params.get("max_capital", 0)
        )
        
        # Validate
        valid, msg = dca_config.validate()
        if not valid:
            return {"actions": [f"Invalid config: {msg}"], "state": state}
        
        # Initialize state if needed
        if "dca_initialized" not in state:
            state["dca_initialized"] = True
            state["safety_orders_placed"] = 0
            state["total_invested"] = 0
            state["total_quantity"] = 0
            state["average_entry"] = 0
            state["entry_price"] = 0
            state["position_open"] = False
            state["trailing_tp_active"] = False
            state["trailing_tp_high"] = 0
        
        # If no position, place initial order
        if not state.get("position_open"):
            quantity = dca_config.initial_order_size / current_price
            
            if not paper_mode:
                position = await PositionManager.open_position(
                    bot_id=bot_id,
                    user_id=user_id,
                    pair=pair,
                    side=dca_config.side,
                    quantity=quantity,
                    entry_price=current_price,
                    order_id=f"dca_initial_{bot_id}"
                )
            
            state["position_open"] = True
            state["entry_price"] = current_price
            state["average_entry"] = current_price
            state["total_invested"] = dca_config.initial_order_size
            state["total_quantity"] = quantity
            state["safety_orders_placed"] = 0
            
            actions.append(f"INITIAL ORDER: {quantity:.6f} @ ${current_price:.2f}")
            
            await DecisionLogger.log_decision(
                bot_id=bot_id,
                decision_type="entry",
                reason="DCA Initial Order",
                indicator_values={},
                strategy_config={"dca_config": asdict(dca_config)},
                metadata={"price": current_price, "quantity": quantity}
            )
            
            return {"actions": actions, "state": state}
        
        # Position is open - check for safety orders and exits
        average_entry = state.get("average_entry", current_price)
        safety_orders_placed = state.get("safety_orders_placed", 0)
        total_invested = state.get("total_invested", 0)
        total_quantity = state.get("total_quantity", 0)
        
        # Check stop loss
        if dca_config.stop_loss_percent > 0:
            if dca_config.side == "long":
                sl_price = average_entry * (1 - dca_config.stop_loss_percent / 100)
                if current_price <= sl_price:
                    actions.append(f"STOP LOSS HIT at ${current_price:.2f}")
                    # Close all
                    pnl = (current_price - average_entry) * total_quantity
                    state["position_open"] = False
                    state["safety_orders_placed"] = 0
                    
                    await DecisionLogger.log_decision(
                        bot_id=bot_id,
                        decision_type="exit",
                        reason="DCA Stop Loss",
                        indicator_values={},
                        strategy_config={},
                        metadata={"pnl": pnl, "exit_price": current_price}
                    )
                    
                    return {"actions": actions, "state": state}
        
        # Check take profit
        tp_triggered = False
        if dca_config.side == "long":
            tp_price = average_entry * (1 + dca_config.take_profit_percent / 100)
            tp_triggered = current_price >= tp_price
        else:
            tp_price = average_entry * (1 - dca_config.take_profit_percent / 100)
            tp_triggered = current_price <= tp_price
        
        if tp_triggered:
            if dca_config.trailing_take_profit:
                # Trailing TP
                if not state.get("trailing_tp_active"):
                    state["trailing_tp_active"] = True
                    state["trailing_tp_high"] = current_price
                    actions.append(f"TRAILING TP ACTIVATED at ${current_price:.2f}")
                else:
                    state["trailing_tp_high"] = max(state["trailing_tp_high"], current_price) if dca_config.side == "long" else min(state["trailing_tp_high"], current_price)
                    
                    if dca_config.side == "long":
                        trailing_exit = state["trailing_tp_high"] * (1 - dca_config.trailing_tp_deviation / 100)
                        if current_price <= trailing_exit:
                            pnl = (current_price - average_entry) * total_quantity
                            actions.append(f"TRAILING TP EXIT at ${current_price:.2f}. PnL: ${pnl:.2f}")
                            state["position_open"] = False
                            state["trailing_tp_active"] = False
                            
                            await DecisionLogger.log_decision(
                                bot_id=bot_id,
                                decision_type="exit",
                                reason="DCA Trailing Take Profit",
                                indicator_values={},
                                strategy_config={},
                                metadata={"pnl": pnl, "exit_price": current_price}
                            )
                            return {"actions": actions, "state": state}
            else:
                # Fixed TP
                pnl = (current_price - average_entry) * total_quantity if dca_config.side == "long" else (average_entry - current_price) * total_quantity
                actions.append(f"TAKE PROFIT HIT at ${current_price:.2f}. PnL: ${pnl:.2f}")
                state["position_open"] = False
                
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type="exit",
                    reason="DCA Take Profit",
                    indicator_values={},
                    strategy_config={},
                    metadata={"pnl": pnl, "exit_price": current_price}
                )
                return {"actions": actions, "state": state}
        
        # Check for safety order trigger
        if safety_orders_placed < dca_config.max_safety_orders:
            # Check capital limit
            if dca_config.max_capital > 0 and total_invested >= dca_config.max_capital:
                actions.append(f"Max capital reached: ${total_invested:.2f}")
            else:
                # Calculate safety order trigger price
                next_safety_price = dca_config.calculate_safety_order_price(
                    state["entry_price"], safety_orders_placed + 1
                )
                
                should_place = False
                if dca_config.side == "long" and current_price <= next_safety_price:
                    should_place = True
                elif dca_config.side == "short" and current_price >= next_safety_price:
                    should_place = True
                
                if should_place:
                    # Place safety order
                    safety_size = dca_config.calculate_safety_order_size(safety_orders_placed)
                    safety_quantity = safety_size / current_price
                    
                    if not paper_mode:
                        await PositionManager.add_to_position(
                            position_id=f"{bot_id}_position",
                            quantity=safety_quantity,
                            price=current_price,
                            order_id=f"dca_safety_{safety_orders_placed}_{bot_id}"
                        )
                    
                    # Update state
                    new_total_invested = total_invested + safety_size
                    new_total_quantity = total_quantity + safety_quantity
                    new_average = new_total_invested / new_total_quantity
                    
                    state["safety_orders_placed"] = safety_orders_placed + 1
                    state["total_invested"] = new_total_invested
                    state["total_quantity"] = new_total_quantity
                    state["average_entry"] = new_average
                    
                    actions.append(
                        f"SAFETY ORDER #{safety_orders_placed + 1}: {safety_quantity:.6f} @ ${current_price:.2f}\n"
                        f"  New avg entry: ${new_average:.2f}, Total invested: ${new_total_invested:.2f}"
                    )
                    
                    await DecisionLogger.log_decision(
                        bot_id=bot_id,
                        decision_type="entry",
                        reason=f"DCA Safety Order #{safety_orders_placed + 1}",
                        indicator_values={},
                        strategy_config={},
                        metadata={
                            "price": current_price,
                            "quantity": safety_quantity,
                            "new_average": new_average
                        }
                    )
        
        if not actions:
            actions.append(f"Monitoring at ${current_price:.2f} (avg entry: ${average_entry:.2f})")
        
        return {"actions": actions, "state": state}


# ═══════════════════════════════════════════════════════════════════════════════
# GRID BOT EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class GridBotExecutor:
    """
    Executes Grid Bot logic with multiple grid levels.
    """
    
    @staticmethod
    async def execute(
        bot_id: str,
        config: Dict[str, Any],
        state: Dict[str, Any],
        current_price: float
    ) -> Dict[str, Any]:
        """
        Execute a single tick for Grid Bot.
        """
        from bot_execution_engine import DecisionLogger
        
        actions = []
        params = config.get("params", {})
        user_id = config.get("user_id")
        pair = config.get("pair", "BTCUSD")
        paper_mode = config.get("paper_mode", False)
        
        # Build Grid config
        grid_config = GridBotConfig(
            pair=pair,
            upper_price=params.get("upper_price", 100000),
            lower_price=params.get("lower_price", 80000),
            grid_count=params.get("grid_count", 10),
            spacing_type=params.get("spacing_type", "arithmetic"),
            total_capital=params.get("total_capital", 1000),
            profit_per_grid_percent=params.get("profit_per_grid_percent", 0.5),
            trailing_grid=params.get("trailing_grid", False),
            stop_loss_percent=params.get("stop_loss_percent", 0),
            take_profit_percent=params.get("take_profit_percent", 0),
            auto_stop_on_breakout=params.get("auto_stop_on_breakout", True),
            mode=params.get("mode", "neutral")
        )
        
        # Validate
        valid, msg = grid_config.validate()
        if not valid:
            return {"actions": [f"Invalid config: {msg}"], "state": state}
        
        # Initialize state if needed
        if "grid_initialized" not in state:
            state["grid_initialized"] = True
            state["grid_levels"] = grid_config.calculate_grid_levels()
            state["grid_orders"] = {}  # {level: {"bought": bool, "quantity": float}}
            state["total_profit"] = 0
            state["completed_trades"] = 0
            state["last_level"] = None
            
            # Initialize grid orders based on current price
            capital_per_grid = grid_config.calculate_capital_per_grid()
            for i, level in enumerate(state["grid_levels"]):
                if level <= current_price:
                    # Below current price - place buy orders
                    state["grid_orders"][i] = {
                        "level": level,
                        "bought": False,
                        "capital": capital_per_grid
                    }
                else:
                    # Above current price - place sell orders (for bought grids)
                    state["grid_orders"][i] = {
                        "level": level,
                        "bought": True if i > 0 else False,
                        "capital": capital_per_grid
                    }
            
            actions.append(f"Grid initialized: {len(state['grid_levels'])} levels from ${grid_config.lower_price:.2f} to ${grid_config.upper_price:.2f}")
            
            await DecisionLogger.log_decision(
                bot_id=bot_id,
                decision_type="entry",
                reason="Grid Bot Initialized",
                indicator_values={},
                strategy_config={"grid_config": asdict(grid_config)},
                metadata={"levels": len(state['grid_levels']), "price": current_price}
            )
        
        # Check for breakout
        if grid_config.auto_stop_on_breakout:
            if current_price > grid_config.upper_price * 1.01:  # 1% buffer
                actions.append(f"BREAKOUT ABOVE grid at ${current_price:.2f}")
                state["grid_stopped"] = True
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type="exit",
                    reason="Grid breakout above upper boundary",
                    indicator_values={},
                    strategy_config={},
                    metadata={"price": current_price, "upper": grid_config.upper_price}
                )
                return {"actions": actions, "state": state}
            
            if current_price < grid_config.lower_price * 0.99:  # 1% buffer
                actions.append(f"BREAKOUT BELOW grid at ${current_price:.2f}")
                state["grid_stopped"] = True
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type="exit",
                    reason="Grid breakout below lower boundary",
                    indicator_values={},
                    strategy_config={},
                    metadata={"price": current_price, "lower": grid_config.lower_price}
                )
                return {"actions": actions, "state": state}
        
        if state.get("grid_stopped"):
            return {"actions": ["Grid stopped"], "state": state}
        
        # Find current grid level
        grid_levels = state.get("grid_levels", [])
        grid_orders = state.get("grid_orders", {})
        
        current_level = None
        for i, level in enumerate(grid_levels[:-1]):
            if grid_levels[i] <= current_price <= grid_levels[i + 1]:
                current_level = i
                break
        
        if current_level is None:
            actions.append(f"Price ${current_price:.2f} outside grid range")
            return {"actions": actions, "state": state}
        
        last_level = state.get("last_level")
        
        # Check for grid level change
        if last_level is not None and current_level != last_level:
            capital_per_grid = grid_config.calculate_capital_per_grid()
            
            if current_level < last_level:
                # Price dropped - BUY signal (crossed below a level)
                level_crossed = last_level
                buy_price = grid_levels[level_crossed]
                quantity = capital_per_grid / buy_price
                
                grid_orders[str(level_crossed)] = {
                    "level": buy_price,
                    "bought": True,
                    "quantity": quantity,
                    "buy_price": buy_price
                }
                
                actions.append(f"GRID BUY at level {level_crossed}: ${buy_price:.2f}")
                
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type="entry",
                    reason=f"Grid level {level_crossed} buy",
                    indicator_values={},
                    strategy_config={},
                    metadata={"level": level_crossed, "price": buy_price, "quantity": quantity}
                )
            
            elif current_level > last_level:
                # Price rose - SELL signal (crossed above a level)
                level_crossed = current_level
                sell_price = grid_levels[level_crossed]
                
                # Check if we have something to sell at this level
                level_order = grid_orders.get(str(level_crossed - 1), {})
                if level_order.get("bought"):
                    buy_price = level_order.get("buy_price", sell_price)
                    quantity = level_order.get("quantity", capital_per_grid / buy_price)
                    profit = (sell_price - buy_price) * quantity
                    
                    # Update state
                    grid_orders[str(level_crossed - 1)]["bought"] = False
                    state["total_profit"] = state.get("total_profit", 0) + profit
                    state["completed_trades"] = state.get("completed_trades", 0) + 1
                    
                    actions.append(
                        f"GRID SELL at level {level_crossed}: ${sell_price:.2f}\n"
                        f"  Profit: ${profit:.2f}, Total: ${state['total_profit']:.2f}"
                    )
                    
                    await DecisionLogger.log_decision(
                        bot_id=bot_id,
                        decision_type="exit",
                        reason=f"Grid level {level_crossed} sell",
                        indicator_values={},
                        strategy_config={},
                        metadata={
                            "level": level_crossed,
                            "price": sell_price,
                            "profit": profit,
                            "total_profit": state["total_profit"]
                        }
                    )
        
        state["last_level"] = current_level
        state["grid_orders"] = grid_orders
        
        if not actions:
            actions.append(
                f"Grid level {current_level} | Price: ${current_price:.2f} | "
                f"Trades: {state.get('completed_trades', 0)} | "
                f"Profit: ${state.get('total_profit', 0):.2f}"
            )
        
        return {"actions": actions, "state": state}


# ═══════════════════════════════════════════════════════════════════════════════
# BOT TYPE FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

class BotTypeFactory:
    """
    Factory for creating and executing bots by type.
    """
    
    EXECUTORS = {
        "signal": SignalBotExecutor,
        "dca": DCABotExecutor,
        "grid": GridBotExecutor
    }
    
    @staticmethod
    def get_executor(bot_type: str):
        """Get executor for bot type"""
        return BotTypeFactory.EXECUTORS.get(bot_type.lower())
    
    @staticmethod
    async def execute_bot(
        bot_type: str,
        bot_id: str,
        config: Dict[str, Any],
        state: Dict[str, Any],
        current_price: float
    ) -> Dict[str, Any]:
        """Execute any bot type"""
        executor = BotTypeFactory.get_executor(bot_type)
        if not executor:
            return {
                "actions": [f"Unknown bot type: {bot_type}"],
                "state": state
            }
        
        return await executor.execute(bot_id, config, state, current_price)
    
    @staticmethod
    def get_default_config(bot_type: str) -> Dict[str, Any]:
        """Get default configuration for bot type"""
        if bot_type == "signal":
            return asdict(SignalBotConfig())
        elif bot_type == "dca":
            return asdict(DCABotConfig())
        elif bot_type == "grid":
            return asdict(GridBotConfig())
        return {}
    
    @staticmethod
    def validate_config(bot_type: str, config: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate configuration for bot type"""
        if bot_type == "signal":
            cfg = SignalBotConfig(**config)
            return cfg.validate()
        elif bot_type == "dca":
            cfg = DCABotConfig(**config)
            return cfg.validate()
        elif bot_type == "grid":
            cfg = GridBotConfig(**config)
            return cfg.validate()
        return False, f"Unknown bot type: {bot_type}"


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Configurations
    "SignalBotConfig",
    "DCABotConfig",
    "GridBotConfig",
    
    # Executors
    "SignalBotExecutor",
    "DCABotExecutor",
    "GridBotExecutor",
    
    # Factory
    "BotTypeFactory",
]
