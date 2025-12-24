"""
🤖 COINHUBX TRADING BOT ENGINE V2 - FULLY STACKED

This module implements a comprehensive trading bot system with:
- Signal Bot (technical indicators, multi-condition rules)
- DCA Bot (safety orders, scaling, trailing TP)
- Grid Bot (price ranges, arithmetic/geometric spacing)
- Arbitrage Bot (placeholder)
- Full Risk Management (SL, TP, trailing, drawdown kill-switch)
- Backtest Engine
- Paper Trading Mode
"""

import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict
import json
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

BOT_TYPES = ['signal', 'dca', 'grid', 'arbitrage']

INDICATOR_LIST = [
    # Trend Indicators
    {'id': 'ema', 'name': 'EMA', 'category': 'trend', 'params': ['period'], 'default_period': 20},
    {'id': 'sma', 'name': 'SMA', 'category': 'trend', 'params': ['period'], 'default_period': 20},
    {'id': 'wma', 'name': 'WMA', 'category': 'trend', 'params': ['period'], 'default_period': 20},
    {'id': 'vwap', 'name': 'VWAP', 'category': 'trend', 'params': []},
    {'id': 'supertrend', 'name': 'SuperTrend', 'category': 'trend', 'params': ['period', 'multiplier'], 'default_period': 10, 'default_multiplier': 3.0},
    
    # Momentum Indicators
    {'id': 'rsi', 'name': 'RSI', 'category': 'momentum', 'params': ['period'], 'default_period': 14, 'overbought': 70, 'oversold': 30},
    {'id': 'macd', 'name': 'MACD', 'category': 'momentum', 'params': ['fast', 'slow', 'signal'], 'default_fast': 12, 'default_slow': 26, 'default_signal': 9},
    {'id': 'stochastic', 'name': 'Stochastic', 'category': 'momentum', 'params': ['k_period', 'd_period'], 'default_k': 14, 'default_d': 3},
    {'id': 'cci', 'name': 'CCI', 'category': 'momentum', 'params': ['period'], 'default_period': 20},
    {'id': 'williams_r', 'name': 'Williams %R', 'category': 'momentum', 'params': ['period'], 'default_period': 14},
    {'id': 'roc', 'name': 'ROC', 'category': 'momentum', 'params': ['period'], 'default_period': 12},
    {'id': 'mfi', 'name': 'MFI', 'category': 'momentum', 'params': ['period'], 'default_period': 14},
    
    # Volatility Indicators
    {'id': 'bollinger', 'name': 'Bollinger Bands', 'category': 'volatility', 'params': ['period', 'std_dev'], 'default_period': 20, 'default_std': 2},
    {'id': 'atr', 'name': 'ATR', 'category': 'volatility', 'params': ['period'], 'default_period': 14},
    {'id': 'keltner', 'name': 'Keltner Channels', 'category': 'volatility', 'params': ['period', 'multiplier'], 'default_period': 20, 'default_multiplier': 2},
    
    # Volume Indicators
    {'id': 'obv', 'name': 'OBV', 'category': 'volume', 'params': []},
    {'id': 'volume_sma', 'name': 'Volume SMA', 'category': 'volume', 'params': ['period'], 'default_period': 20},
    {'id': 'ad', 'name': 'A/D Line', 'category': 'volume', 'params': []},
    
    # Price Comparisons
    {'id': 'price', 'name': 'Price', 'category': 'price', 'params': ['source'], 'sources': ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4']},
]

TIMEFRAMES = [
    {'id': '1m', 'name': '1 Minute', 'seconds': 60},
    {'id': '5m', 'name': '5 Minutes', 'seconds': 300},
    {'id': '15m', 'name': '15 Minutes', 'seconds': 900},
    {'id': '30m', 'name': '30 Minutes', 'seconds': 1800},
    {'id': '1h', 'name': '1 Hour', 'seconds': 3600},
    {'id': '4h', 'name': '4 Hours', 'seconds': 14400},
    {'id': '1d', 'name': '1 Day', 'seconds': 86400},
]

COMPARATORS = [
    {'id': 'crosses_above', 'name': 'Crosses Above', 'description': 'Value crosses above threshold'},
    {'id': 'crosses_below', 'name': 'Crosses Below', 'description': 'Value crosses below threshold'},
    {'id': 'greater_than', 'name': '>', 'description': 'Greater than'},
    {'id': 'less_than', 'name': '<', 'description': 'Less than'},
    {'id': 'equals', 'name': '=', 'description': 'Equals (within tolerance)'},
    {'id': 'rising', 'name': 'Rising', 'description': 'Value increasing'},
    {'id': 'falling', 'name': 'Falling', 'description': 'Value decreasing'},
]

PRESET_STRATEGIES = [
    {
        'id': 'rsi_reversal',
        'name': 'RSI Reversal',
        'description': 'Buy when RSI oversold, sell when overbought',
        'bot_type': 'signal',
        'entry_rules': {
            'operator': 'AND',
            'conditions': [
                {'indicator': 'rsi', 'params': {'period': 14}, 'comparator': 'less_than', 'value': 30}
            ]
        },
        'exit_rules': {
            'operator': 'OR',
            'conditions': [
                {'indicator': 'rsi', 'params': {'period': 14}, 'comparator': 'greater_than', 'value': 70}
            ]
        },
        'risk': {'take_profit_percent': 5, 'stop_loss_percent': 3}
    },
    {
        'id': 'ema_crossover',
        'name': 'EMA Crossover',
        'description': 'Buy when fast EMA crosses above slow EMA',
        'bot_type': 'signal',
        'entry_rules': {
            'operator': 'AND',
            'conditions': [
                {'indicator': 'ema', 'params': {'period': 9}, 'comparator': 'crosses_above', 'compare_to': {'indicator': 'ema', 'params': {'period': 21}}}
            ]
        },
        'exit_rules': {
            'operator': 'OR',
            'conditions': [
                {'indicator': 'ema', 'params': {'period': 9}, 'comparator': 'crosses_below', 'compare_to': {'indicator': 'ema', 'params': {'period': 21}}}
            ]
        },
        'risk': {'take_profit_percent': 4, 'stop_loss_percent': 2}
    },
    {
        'id': 'bb_mean_reversion',
        'name': 'Bollinger Band Mean Reversion',
        'description': 'Buy at lower band, sell at upper band',
        'bot_type': 'signal',
        'entry_rules': {
            'operator': 'AND',
            'conditions': [
                {'indicator': 'price', 'params': {'source': 'close'}, 'comparator': 'less_than', 'compare_to': {'indicator': 'bollinger', 'params': {'period': 20, 'std_dev': 2}, 'output': 'lower'}}
            ]
        },
        'exit_rules': {
            'operator': 'OR',
            'conditions': [
                {'indicator': 'price', 'params': {'source': 'close'}, 'comparator': 'greater_than', 'compare_to': {'indicator': 'bollinger', 'params': {'period': 20, 'std_dev': 2}, 'output': 'upper'}}
            ]
        },
        'risk': {'take_profit_percent': 3, 'stop_loss_percent': 2}
    },
    {
        'id': 'macd_momentum',
        'name': 'MACD Momentum',
        'description': 'Trade MACD signal line crossovers',
        'bot_type': 'signal',
        'entry_rules': {
            'operator': 'AND',
            'conditions': [
                {'indicator': 'macd', 'params': {'fast': 12, 'slow': 26, 'signal': 9}, 'output': 'macd_line', 'comparator': 'crosses_above', 'compare_to': {'indicator': 'macd', 'params': {'fast': 12, 'slow': 26, 'signal': 9}, 'output': 'signal_line'}}
            ]
        },
        'exit_rules': {
            'operator': 'OR',
            'conditions': [
                {'indicator': 'macd', 'params': {'fast': 12, 'slow': 26, 'signal': 9}, 'output': 'macd_line', 'comparator': 'crosses_below', 'compare_to': {'indicator': 'macd', 'params': {'fast': 12, 'slow': 26, 'signal': 9}, 'output': 'signal_line'}}
            ]
        },
        'risk': {'take_profit_percent': 5, 'stop_loss_percent': 3}
    },
    {
        'id': 'dca_conservative',
        'name': 'DCA Conservative',
        'description': 'Daily purchases with 3 safety orders',
        'bot_type': 'dca',
        'params': {
            'base_order_size': 100,
            'safety_order_size': 50,
            'safety_order_step_percent': 2,
            'safety_order_volume_scale': 1.5,
            'max_safety_orders': 3,
            'take_profit_percent': 3,
            'interval': 'daily'
        }
    },
    {
        'id': 'dca_aggressive',
        'name': 'DCA Aggressive',
        'description': 'Hourly purchases with 5 safety orders',
        'bot_type': 'dca',
        'params': {
            'base_order_size': 50,
            'safety_order_size': 100,
            'safety_order_step_percent': 1.5,
            'safety_order_volume_scale': 2.0,
            'max_safety_orders': 5,
            'take_profit_percent': 2,
            'trailing_take_profit': True,
            'trailing_deviation': 0.5,
            'interval': 'hourly'
        }
    },
    {
        'id': 'grid_tight',
        'name': 'Grid Tight Range',
        'description': 'Tight grid for stable coins or low volatility',
        'bot_type': 'grid',
        'params': {
            'grid_count': 20,
            'mode': 'arithmetic',
            'take_profit_percent': 1,
            'stop_loss_percent': 5
        }
    },
    {
        'id': 'grid_wide',
        'name': 'Grid Wide Range',
        'description': 'Wide grid for volatile assets',
        'bot_type': 'grid',
        'params': {
            'grid_count': 10,
            'mode': 'geometric',
            'take_profit_percent': 5,
            'stop_loss_percent': 15
        }
    }
]

# ═══════════════════════════════════════════════════════════════════════════════
# RISK MANAGEMENT CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_RISK_CONFIG = {
    'stop_loss_percent': None,
    'take_profit_percent': None,
    'trailing_stop_percent': None,
    'trailing_take_profit': False,
    'trailing_deviation': 0.5,
    'max_daily_loss_amount': None,
    'max_daily_loss_percent': None,
    'max_drawdown_percent': None,
    'max_trades_per_day': 100,
    'max_exposure_per_coin': None,
    'max_open_positions': 10,
    'cooldown_between_trades_seconds': 60,
    'circuit_breaker_enabled': True,
    'circuit_breaker_pause_on_api_errors': 3,
    'circuit_breaker_pause_on_price_spike_percent': 10,
    'circuit_breaker_pause_on_spread_percent': 5
}

# ═══════════════════════════════════════════════════════════════════════════════
# DCA BOT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

DCA_DEFAULT_CONFIG = {
    'base_order_size': 100,          # Initial order size in quote currency
    'safety_order_size': 50,         # Safety order size
    'safety_order_step_percent': 2,  # Price drop % to trigger safety order
    'safety_order_step_scale': 1.0,  # Scaling for step between orders (1.0 = constant)
    'safety_order_volume_scale': 1.5,# Volume multiplier for each safety order
    'max_safety_orders': 5,          # Maximum number of safety orders
    'take_profit_percent': 3,        # TP from average entry price
    'take_profit_type': 'average',   # 'average' or 'base'
    'trailing_take_profit': False,
    'trailing_deviation': 0.5,       # Trailing deviation %
    'stop_loss_percent': None,       # Hard stop loss
    'max_duration_hours': None,      # Time-based stop
    'reentry_wait_minutes': 60       # Wait time after exit before re-entry
}

# ═══════════════════════════════════════════════════════════════════════════════
# GRID BOT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

GRID_DEFAULT_CONFIG = {
    'lower_price': None,             # Required: Lower bound
    'upper_price': None,             # Required: Upper bound
    'grid_count': 10,                # Number of grid levels
    'mode': 'arithmetic',            # 'arithmetic' or 'geometric'
    'investment_amount': 1000,       # Total investment
    'amount_per_grid': None,         # Or specify per-grid amount
    'rebalance_enabled': False,      # Auto-rebalance when price exits range
    'take_profit_percent': None,     # TP for whole grid
    'stop_loss_percent': None,       # SL for whole grid
    'auto_adjust_range': False       # Experimental: auto-adjust range based on volatility
}

# ═══════════════════════════════════════════════════════════════════════════════
# BACKTEST ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class BacktestEngine:
    """
    Backtest engine for Signal and DCA strategies.
    Simulates trades on historical data and calculates performance metrics.
    """
    
    def __init__(self, candles: List[Dict], initial_balance: float, fee_rate: float = 0.001):
        self.candles = candles
        self.initial_balance = initial_balance
        self.fee_rate = fee_rate
        self.balance = initial_balance
        self.position = 0
        self.entry_price = 0
        self.trades = []
        self.equity_curve = [initial_balance]
        self.max_equity = initial_balance
        self.max_drawdown = 0
    
    def run_signal_backtest(self, entry_rules: Dict, exit_rules: Dict, order_amount: float, risk_config: Dict) -> Dict:
        """
        Run backtest for signal bot strategy.
        Returns performance metrics.
        """
        from indicators import IndicatorCalculator, OHLCV
        
        # Convert candles to OHLCV format
        ohlcv_data = [
            OHLCV(
                timestamp=c.get('timestamp', 0),
                open=c['open'],
                high=c['high'],
                low=c['low'],
                close=c['close'],
                volume=c.get('volume', 0)
            )
            for c in self.candles
        ]
        
        # Pre-calculate indicators
        indicator_values = {}
        for condition in entry_rules.get('conditions', []) + exit_rules.get('conditions', []):
            ind_id = condition.get('indicator')
            params = condition.get('params', {})
            key = f"{ind_id}_{json.dumps(params, sort_keys=True)}"
            if key not in indicator_values:
                indicator_values[key] = self._calculate_indicator(ind_id, params, ohlcv_data)
        
        # Simulate trading
        for i in range(50, len(self.candles)):  # Start after warmup period
            current_price = self.candles[i]['close']
            
            # Check exit first if in position
            if self.position > 0:
                # Check stop loss
                if risk_config.get('stop_loss_percent'):
                    sl_price = self.entry_price * (1 - risk_config['stop_loss_percent'] / 100)
                    if current_price <= sl_price:
                        self._close_position(current_price, i, 'stop_loss')
                        continue
                
                # Check take profit
                if risk_config.get('take_profit_percent'):
                    tp_price = self.entry_price * (1 + risk_config['take_profit_percent'] / 100)
                    if current_price >= tp_price:
                        self._close_position(current_price, i, 'take_profit')
                        continue
                
                # Check exit rules
                if self._evaluate_rules(exit_rules, indicator_values, i):
                    self._close_position(current_price, i, 'exit_signal')
                    continue
            
            # Check entry if no position
            if self.position == 0 and self.balance >= order_amount:
                if self._evaluate_rules(entry_rules, indicator_values, i):
                    self._open_position(current_price, order_amount, i)
            
            # Update equity curve
            current_equity = self.balance + (self.position * current_price)
            self.equity_curve.append(current_equity)
            self.max_equity = max(self.max_equity, current_equity)
            drawdown = (self.max_equity - current_equity) / self.max_equity * 100
            self.max_drawdown = max(self.max_drawdown, drawdown)
        
        # Close any remaining position
        if self.position > 0:
            self._close_position(self.candles[-1]['close'], len(self.candles) - 1, 'end_of_backtest')
        
        return self._calculate_metrics()
    
    def run_dca_backtest(self, dca_config: Dict, risk_config: Dict) -> Dict:
        """
        Run backtest for DCA bot strategy.
        """
        base_order = dca_config.get('base_order_size', 100)
        safety_order = dca_config.get('safety_order_size', 50)
        safety_step = dca_config.get('safety_order_step_percent', 2)
        safety_scale = dca_config.get('safety_order_volume_scale', 1.5)
        max_safety = dca_config.get('max_safety_orders', 5)
        tp_percent = dca_config.get('take_profit_percent', 3)
        
        safety_orders_placed = 0
        avg_entry = 0
        total_invested = 0
        
        for i in range(len(self.candles)):
            current_price = self.candles[i]['close']
            
            # Check if in position
            if self.position > 0:
                # Calculate TP price from average entry
                tp_price = avg_entry * (1 + tp_percent / 100)
                
                if current_price >= tp_price:
                    # Take profit hit
                    self._close_position(current_price, i, 'take_profit')
                    safety_orders_placed = 0
                    avg_entry = 0
                    total_invested = 0
                    continue
                
                # Check for safety order trigger
                if safety_orders_placed < max_safety:
                    safety_trigger = avg_entry * (1 - safety_step * (safety_orders_placed + 1) / 100)
                    if current_price <= safety_trigger:
                        order_size = safety_order * (safety_scale ** safety_orders_placed)
                        if self.balance >= order_size:
                            # Place safety order
                            qty = order_size / current_price
                            fee = order_size * self.fee_rate
                            self.balance -= (order_size + fee)
                            self.position += qty
                            total_invested += order_size
                            avg_entry = total_invested / self.position
                            safety_orders_placed += 1
                            self.trades.append({
                                'index': i,
                                'type': 'safety_buy',
                                'price': current_price,
                                'amount': qty,
                                'fee': fee
                            })
            else:
                # Place base order
                if self.balance >= base_order:
                    qty = base_order / current_price
                    fee = base_order * self.fee_rate
                    self.balance -= (base_order + fee)
                    self.position = qty
                    self.entry_price = current_price
                    avg_entry = current_price
                    total_invested = base_order
                    self.trades.append({
                        'index': i,
                        'type': 'base_buy',
                        'price': current_price,
                        'amount': qty,
                        'fee': fee
                    })
            
            # Update equity
            current_equity = self.balance + (self.position * current_price)
            self.equity_curve.append(current_equity)
            self.max_equity = max(self.max_equity, current_equity)
            drawdown = (self.max_equity - current_equity) / self.max_equity * 100
            self.max_drawdown = max(self.max_drawdown, drawdown)
        
        # Close any remaining position
        if self.position > 0:
            self._close_position(self.candles[-1]['close'], len(self.candles) - 1, 'end_of_backtest')
        
        return self._calculate_metrics()
    
    def _calculate_indicator(self, ind_id: str, params: Dict, ohlcv_data: List) -> List:
        """Calculate indicator values for all candles."""
        from indicators import IndicatorCalculator
        
        closes = [c.close for c in ohlcv_data]
        
        if ind_id == 'rsi':
            return IndicatorCalculator.rsi(closes, params.get('period', 14))
        elif ind_id == 'ema':
            return IndicatorCalculator.ema(closes, params.get('period', 20))
        elif ind_id == 'sma':
            return IndicatorCalculator.sma(closes, params.get('period', 20))
        elif ind_id == 'macd':
            result = IndicatorCalculator.macd(closes, params.get('fast', 12), params.get('slow', 26), params.get('signal', 9))
            return result  # Returns dict with macd_line, signal_line, histogram
        elif ind_id == 'bollinger':
            return IndicatorCalculator.bollinger_bands(closes, params.get('period', 20), params.get('std_dev', 2))
        elif ind_id == 'atr':
            return IndicatorCalculator.atr(ohlcv_data, params.get('period', 14))
        elif ind_id == 'stochastic':
            return IndicatorCalculator.stochastic(ohlcv_data, params.get('k_period', 14), params.get('d_period', 3))
        elif ind_id == 'price':
            source = params.get('source', 'close')
            if source == 'close':
                return closes
            elif source == 'open':
                return [c.open for c in ohlcv_data]
            elif source == 'high':
                return [c.high for c in ohlcv_data]
            elif source == 'low':
                return [c.low for c in ohlcv_data]
        
        return [None] * len(ohlcv_data)
    
    def _evaluate_rules(self, rules: Dict, indicator_values: Dict, index: int) -> bool:
        """Evaluate entry/exit rules at given index."""
        conditions = rules.get('conditions', [])
        operator = rules.get('operator', 'AND')
        
        results = []
        for cond in conditions:
            result = self._evaluate_condition(cond, indicator_values, index)
            results.append(result)
        
        if operator == 'AND':
            return all(results) if results else False
        else:  # OR
            return any(results) if results else False
    
    def _evaluate_condition(self, cond: Dict, indicator_values: Dict, index: int) -> bool:
        """Evaluate a single condition."""
        ind_id = cond.get('indicator')
        params = cond.get('params', {})
        comparator = cond.get('comparator')
        value = cond.get('value')
        
        key = f"{ind_id}_{json.dumps(params, sort_keys=True)}"
        ind_values = indicator_values.get(key, [])
        
        if index >= len(ind_values) or ind_values[index] is None:
            return False
        
        current_val = ind_values[index]
        prev_val = ind_values[index - 1] if index > 0 else None
        
        # Handle dictionary outputs (like MACD)
        if isinstance(current_val, dict):
            output_key = cond.get('output', 'macd_line')
            current_val = current_val.get(output_key)
            if prev_val and isinstance(prev_val, dict):
                prev_val = prev_val.get(output_key)
        
        # Compare against another indicator
        if 'compare_to' in cond:
            compare_ind = cond['compare_to']
            compare_key = f"{compare_ind['indicator']}_{json.dumps(compare_ind.get('params', {}), sort_keys=True)}"
            compare_values = indicator_values.get(compare_key, [])
            if index >= len(compare_values):
                return False
            compare_val = compare_values[index]
            compare_prev = compare_values[index - 1] if index > 0 else None
            
            if isinstance(compare_val, dict):
                compare_val = compare_val.get(compare_ind.get('output', 'value'))
                if compare_prev and isinstance(compare_prev, dict):
                    compare_prev = compare_prev.get(compare_ind.get('output', 'value'))
            
            value = compare_val
            prev_compare = compare_prev
        else:
            prev_compare = None
        
        if value is None or current_val is None:
            return False
        
        if comparator == 'greater_than':
            return current_val > value
        elif comparator == 'less_than':
            return current_val < value
        elif comparator == 'equals':
            return abs(current_val - value) < 0.001
        elif comparator == 'crosses_above':
            if prev_val is None:
                return False
            if prev_compare is not None:
                return prev_val <= prev_compare and current_val > value
            return prev_val <= value and current_val > value
        elif comparator == 'crosses_below':
            if prev_val is None:
                return False
            if prev_compare is not None:
                return prev_val >= prev_compare and current_val < value
            return prev_val >= value and current_val < value
        elif comparator == 'rising':
            return prev_val is not None and current_val > prev_val
        elif comparator == 'falling':
            return prev_val is not None and current_val < prev_val
        
        return False
    
    def _open_position(self, price: float, amount: float, index: int):
        """Open a position."""
        qty = amount / price
        fee = amount * self.fee_rate
        self.balance -= (amount + fee)
        self.position = qty
        self.entry_price = price
        self.trades.append({
            'index': index,
            'type': 'buy',
            'price': price,
            'amount': qty,
            'fee': fee
        })
    
    def _close_position(self, price: float, index: int, reason: str):
        """Close position."""
        if self.position <= 0:
            return
        
        value = self.position * price
        fee = value * self.fee_rate
        self.balance += (value - fee)
        pnl = (price - self.entry_price) * self.position - fee
        
        self.trades.append({
            'index': index,
            'type': 'sell',
            'price': price,
            'amount': self.position,
            'fee': fee,
            'pnl': pnl,
            'reason': reason
        })
        
        self.position = 0
        self.entry_price = 0
    
    def _calculate_metrics(self) -> Dict:
        """Calculate backtest performance metrics."""
        wins = [t for t in self.trades if t.get('type') == 'sell' and t.get('pnl', 0) > 0]
        losses = [t for t in self.trades if t.get('type') == 'sell' and t.get('pnl', 0) <= 0]
        
        total_pnl = sum(t.get('pnl', 0) for t in self.trades if t.get('type') == 'sell')
        total_fees = sum(t.get('fee', 0) for t in self.trades)
        
        trade_count = len([t for t in self.trades if t.get('type') == 'sell'])
        win_rate = len(wins) / trade_count * 100 if trade_count > 0 else 0
        
        return {
            'initial_balance': self.initial_balance,
            'final_balance': self.balance,
            'total_return': (self.balance - self.initial_balance) / self.initial_balance * 100,
            'total_pnl': total_pnl,
            'total_fees': total_fees,
            'max_drawdown': self.max_drawdown,
            'trade_count': trade_count,
            'win_count': len(wins),
            'loss_count': len(losses),
            'win_rate': win_rate,
            'avg_win': sum(t.get('pnl', 0) for t in wins) / len(wins) if wins else 0,
            'avg_loss': sum(t.get('pnl', 0) for t in losses) / len(losses) if losses else 0,
            'profit_factor': abs(sum(t.get('pnl', 0) for t in wins)) / abs(sum(t.get('pnl', 0) for t in losses)) if losses and sum(t.get('pnl', 0) for t in losses) != 0 else 0,
            'equity_curve': self.equity_curve[::max(1, len(self.equity_curve) // 100)],  # Sample 100 points
            'trades': self.trades[-50:]  # Last 50 trades
        }


# ═══════════════════════════════════════════════════════════════════════════════
# API HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_indicators_list() -> Dict:
    """Return list of available indicators with their parameters."""
    categories = defaultdict(list)
    for ind in INDICATOR_LIST:
        categories[ind['category']].append(ind)
    
    return {
        'indicators': INDICATOR_LIST,
        'timeframes': TIMEFRAMES,
        'comparators': COMPARATORS,
        'categories': dict(categories)
    }


def get_preset_strategies() -> List[Dict]:
    """Return list of preset strategies."""
    return PRESET_STRATEGIES


def get_default_risk_config() -> Dict:
    """Return default risk management configuration."""
    return DEFAULT_RISK_CONFIG.copy()


def get_dca_default_config() -> Dict:
    """Return default DCA bot configuration."""
    return DCA_DEFAULT_CONFIG.copy()


def get_grid_default_config() -> Dict:
    """Return default Grid bot configuration."""
    return GRID_DEFAULT_CONFIG.copy()
