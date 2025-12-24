"""
🔒 TRADING BOT INDICATORS LIBRARY - CoinHubX

Full indicator support matching Binance/OKX/Bybit bots.
Pluggable architecture - new indicators can be added without refactor.

Supported Indicators:
- TREND: EMA, SMA, WMA, VWAP, Ichimoku, SuperTrend
- MOMENTUM: RSI, MACD, Stochastic, Stochastic RSI, CCI, Momentum
- VOLATILITY: Bollinger Bands, ATR, Keltner Channels, Donchian Channels
- VOLUME: Volume, Volume MA, OBV, Accumulation/Distribution

Timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 1d
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Supported Timeframes
TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']

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


class IndicatorType(Enum):
    # Trend
    EMA = 'ema'
    SMA = 'sma'
    WMA = 'wma'
    VWAP = 'vwap'
    ICHIMOKU = 'ichimoku'
    SUPERTREND = 'supertrend'
    # Momentum
    RSI = 'rsi'
    MACD = 'macd'
    STOCHASTIC = 'stochastic'
    STOCHASTIC_RSI = 'stochastic_rsi'
    CCI = 'cci'
    MOMENTUM = 'momentum'
    # Volatility
    BOLLINGER = 'bollinger'
    ATR = 'atr'
    KELTNER = 'keltner'
    DONCHIAN = 'donchian'
    # Volume
    VOLUME = 'volume'
    VOLUME_MA = 'volume_ma'
    OBV = 'obv'
    AD = 'ad'  # Accumulation/Distribution


@dataclass
class OHLCV:
    """OHLCV candle data structure"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class IndicatorCalculator:
    """
    Server-side indicator calculation engine.
    All calculations based on OHLCV candle data.
    """
    
    # ========== TREND INDICATORS ==========
    
    @staticmethod
    def ema(closes: List[float], period: int) -> List[float]:
        """Exponential Moving Average"""
        if len(closes) < period:
            return [None] * len(closes)
        
        multiplier = 2 / (period + 1)
        ema_values = [None] * (period - 1)
        
        # First EMA is SMA
        ema_values.append(sum(closes[:period]) / period)
        
        for i in range(period, len(closes)):
            ema_val = (closes[i] * multiplier) + (ema_values[-1] * (1 - multiplier))
            ema_values.append(ema_val)
        
        return ema_values
    
    @staticmethod
    def sma(closes: List[float], period: int) -> List[float]:
        """Simple Moving Average"""
        if len(closes) < period:
            return [None] * len(closes)
        
        sma_values = [None] * (period - 1)
        for i in range(period - 1, len(closes)):
            sma_values.append(sum(closes[i - period + 1:i + 1]) / period)
        
        return sma_values
    
    @staticmethod
    def wma(closes: List[float], period: int) -> List[float]:
        """Weighted Moving Average"""
        if len(closes) < period:
            return [None] * len(closes)
        
        weights = list(range(1, period + 1))
        weight_sum = sum(weights)
        wma_values = [None] * (period - 1)
        
        for i in range(period - 1, len(closes)):
            weighted_sum = sum(closes[i - period + 1 + j] * weights[j] for j in range(period))
            wma_values.append(weighted_sum / weight_sum)
        
        return wma_values
    
    @staticmethod
    def vwap(candles: List[OHLCV]) -> List[float]:
        """Volume Weighted Average Price"""
        vwap_values = []
        cumulative_tp_vol = 0
        cumulative_vol = 0
        
        for candle in candles:
            typical_price = (candle.high + candle.low + candle.close) / 3
            cumulative_tp_vol += typical_price * candle.volume
            cumulative_vol += candle.volume
            
            if cumulative_vol > 0:
                vwap_values.append(cumulative_tp_vol / cumulative_vol)
            else:
                vwap_values.append(None)
        
        return vwap_values
    
    @staticmethod
    def ichimoku(candles: List[OHLCV], tenkan: int = 9, kijun: int = 26, senkou_b: int = 52) -> Dict[str, List[float]]:
        """Ichimoku Cloud (all components)"""
        highs = [c.high for c in candles]
        lows = [c.low for c in candles]
        closes = [c.close for c in candles]
        n = len(candles)
        
        def period_midpoint(h: List[float], l: List[float], period: int, idx: int) -> Optional[float]:
            if idx < period - 1:
                return None
            period_high = max(h[idx - period + 1:idx + 1])
            period_low = min(l[idx - period + 1:idx + 1])
            return (period_high + period_low) / 2
        
        tenkan_sen = [period_midpoint(highs, lows, tenkan, i) for i in range(n)]
        kijun_sen = [period_midpoint(highs, lows, kijun, i) for i in range(n)]
        
        # Senkou Span A (displaced forward by kijun periods)
        senkou_span_a = []
        for i in range(n):
            if tenkan_sen[i] is not None and kijun_sen[i] is not None:
                senkou_span_a.append((tenkan_sen[i] + kijun_sen[i]) / 2)
            else:
                senkou_span_a.append(None)
        
        # Senkou Span B
        senkou_span_b = [period_midpoint(highs, lows, senkou_b, i) for i in range(n)]
        
        # Chikou Span (close displaced back by kijun periods)
        chikou_span = closes.copy()
        
        return {
            'tenkan_sen': tenkan_sen,
            'kijun_sen': kijun_sen,
            'senkou_span_a': senkou_span_a,
            'senkou_span_b': senkou_span_b,
            'chikou_span': chikou_span
        }
    
    @staticmethod
    def supertrend(candles: List[OHLCV], period: int = 10, multiplier: float = 3.0) -> Dict[str, List[float]]:
        """SuperTrend indicator"""
        atr_values = IndicatorCalculator.atr(candles, period)
        closes = [c.close for c in candles]
        highs = [c.high for c in candles]
        lows = [c.low for c in candles]
        
        upper_band = []
        lower_band = []
        supertrend = []
        direction = []  # 1 = up, -1 = down
        
        for i in range(len(candles)):
            if atr_values[i] is None:
                upper_band.append(None)
                lower_band.append(None)
                supertrend.append(None)
                direction.append(0)
                continue
            
            hl2 = (highs[i] + lows[i]) / 2
            basic_upper = hl2 + (multiplier * atr_values[i])
            basic_lower = hl2 - (multiplier * atr_values[i])
            
            if i == 0 or upper_band[-1] is None:
                upper_band.append(basic_upper)
                lower_band.append(basic_lower)
                supertrend.append(basic_upper)
                direction.append(-1)
            else:
                # Upper band
                if basic_upper < upper_band[-1] or closes[i-1] > upper_band[-1]:
                    upper_band.append(basic_upper)
                else:
                    upper_band.append(upper_band[-1])
                
                # Lower band
                if basic_lower > lower_band[-1] or closes[i-1] < lower_band[-1]:
                    lower_band.append(basic_lower)
                else:
                    lower_band.append(lower_band[-1])
                
                # Direction and SuperTrend value
                if direction[-1] == 1:
                    if closes[i] < lower_band[-1]:
                        direction.append(-1)
                        supertrend.append(upper_band[-1])
                    else:
                        direction.append(1)
                        supertrend.append(lower_band[-1])
                else:
                    if closes[i] > upper_band[-1]:
                        direction.append(1)
                        supertrend.append(lower_band[-1])
                    else:
                        direction.append(-1)
                        supertrend.append(upper_band[-1])
        
        return {
            'supertrend': supertrend,
            'direction': direction,
            'upper_band': upper_band,
            'lower_band': lower_band
        }
    
    # ========== MOMENTUM INDICATORS ==========
    
    @staticmethod
    def rsi(closes: List[float], period: int = 14) -> List[float]:
        """Relative Strength Index"""
        if len(closes) < period + 1:
            return [None] * len(closes)
        
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        rsi_values = [None] * period
        
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        for i in range(period, len(deltas)):
            if avg_loss == 0:
                rsi_values.append(100)
            else:
                rs = avg_gain / avg_loss
                rsi_values.append(100 - (100 / (1 + rs)))
            
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        # Final value
        if avg_loss == 0:
            rsi_values.append(100)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100 - (100 / (1 + rs)))
        
        return rsi_values
    
    @staticmethod
    def macd(closes: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, List[float]]:
        """MACD (Moving Average Convergence Divergence)"""
        ema_fast = IndicatorCalculator.ema(closes, fast)
        ema_slow = IndicatorCalculator.ema(closes, slow)
        
        macd_line = []
        for i in range(len(closes)):
            if ema_fast[i] is None or ema_slow[i] is None:
                macd_line.append(None)
            else:
                macd_line.append(ema_fast[i] - ema_slow[i])
        
        # Filter out None values for signal calculation
        valid_macd = [v for v in macd_line if v is not None]
        signal_line_valid = IndicatorCalculator.ema(valid_macd, signal) if len(valid_macd) >= signal else []
        
        # Rebuild signal line with proper alignment
        signal_line = [None] * (len(macd_line) - len(signal_line_valid)) + signal_line_valid
        
        histogram = []
        for i in range(len(closes)):
            if macd_line[i] is None or signal_line[i] is None:
                histogram.append(None)
            else:
                histogram.append(macd_line[i] - signal_line[i])
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    @staticmethod
    def stochastic(candles: List[OHLCV], k_period: int = 14, d_period: int = 3) -> Dict[str, List[float]]:
        """Stochastic Oscillator"""
        highs = [c.high for c in candles]
        lows = [c.low for c in candles]
        closes = [c.close for c in candles]
        
        k_values = [None] * (k_period - 1)
        
        for i in range(k_period - 1, len(candles)):
            highest_high = max(highs[i - k_period + 1:i + 1])
            lowest_low = min(lows[i - k_period + 1:i + 1])
            
            if highest_high == lowest_low:
                k_values.append(50)
            else:
                k_values.append(100 * (closes[i] - lowest_low) / (highest_high - lowest_low))
        
        # %D is SMA of %K
        d_values = IndicatorCalculator.sma([v if v is not None else 0 for v in k_values], d_period)
        
        return {
            'k': k_values,
            'd': d_values
        }
    
    @staticmethod
    def stochastic_rsi(closes: List[float], rsi_period: int = 14, stoch_period: int = 14, k_period: int = 3, d_period: int = 3) -> Dict[str, List[float]]:
        """Stochastic RSI"""
        rsi_values = IndicatorCalculator.rsi(closes, rsi_period)
        valid_rsi = [v for v in rsi_values if v is not None]
        
        if len(valid_rsi) < stoch_period:
            return {'k': [None] * len(closes), 'd': [None] * len(closes)}
        
        stoch_k = [None] * (len(rsi_values) - len(valid_rsi) + stoch_period - 1)
        
        for i in range(stoch_period - 1, len(valid_rsi)):
            highest = max(valid_rsi[i - stoch_period + 1:i + 1])
            lowest = min(valid_rsi[i - stoch_period + 1:i + 1])
            
            if highest == lowest:
                stoch_k.append(50)
            else:
                stoch_k.append(100 * (valid_rsi[i] - lowest) / (highest - lowest))
        
        # Smooth with SMA
        stoch_k_smooth = IndicatorCalculator.sma([v if v is not None else 0 for v in stoch_k], k_period)
        stoch_d = IndicatorCalculator.sma([v if v is not None else 0 for v in stoch_k_smooth], d_period)
        
        return {
            'k': stoch_k_smooth,
            'd': stoch_d
        }
    
    @staticmethod
    def cci(candles: List[OHLCV], period: int = 20) -> List[float]:
        """Commodity Channel Index"""
        typical_prices = [(c.high + c.low + c.close) / 3 for c in candles]
        sma_tp = IndicatorCalculator.sma(typical_prices, period)
        
        cci_values = [None] * (period - 1)
        
        for i in range(period - 1, len(candles)):
            if sma_tp[i] is None:
                cci_values.append(None)
                continue
            
            # Mean deviation
            mean_dev = sum(abs(typical_prices[j] - sma_tp[i]) for j in range(i - period + 1, i + 1)) / period
            
            if mean_dev == 0:
                cci_values.append(0)
            else:
                cci_values.append((typical_prices[i] - sma_tp[i]) / (0.015 * mean_dev))
        
        return cci_values
    
    @staticmethod
    def momentum(closes: List[float], period: int = 10) -> List[float]:
        """Momentum indicator"""
        if len(closes) < period + 1:
            return [None] * len(closes)
        
        mom_values = [None] * period
        for i in range(period, len(closes)):
            mom_values.append(closes[i] - closes[i - period])
        
        return mom_values
    
    # ========== VOLATILITY INDICATORS ==========
    
    @staticmethod
    def bollinger_bands(closes: List[float], period: int = 20, std_dev: float = 2.0) -> Dict[str, List[float]]:
        """Bollinger Bands"""
        sma_values = IndicatorCalculator.sma(closes, period)
        
        upper = []
        lower = []
        
        for i in range(len(closes)):
            if sma_values[i] is None:
                upper.append(None)
                lower.append(None)
            else:
                std = np.std(closes[i - period + 1:i + 1])
                upper.append(sma_values[i] + (std_dev * std))
                lower.append(sma_values[i] - (std_dev * std))
        
        return {
            'upper': upper,
            'middle': sma_values,
            'lower': lower
        }
    
    @staticmethod
    def atr(candles: List[OHLCV], period: int = 14) -> List[float]:
        """Average True Range"""
        if len(candles) < 2:
            return [None] * len(candles)
        
        true_ranges = [candles[0].high - candles[0].low]
        
        for i in range(1, len(candles)):
            high_low = candles[i].high - candles[i].low
            high_close = abs(candles[i].high - candles[i-1].close)
            low_close = abs(candles[i].low - candles[i-1].close)
            true_ranges.append(max(high_low, high_close, low_close))
        
        # ATR is EMA of TR
        return IndicatorCalculator.ema(true_ranges, period)
    
    @staticmethod
    def keltner_channels(candles: List[OHLCV], ema_period: int = 20, atr_period: int = 10, multiplier: float = 2.0) -> Dict[str, List[float]]:
        """Keltner Channels"""
        closes = [c.close for c in candles]
        ema_values = IndicatorCalculator.ema(closes, ema_period)
        atr_values = IndicatorCalculator.atr(candles, atr_period)
        
        upper = []
        lower = []
        
        for i in range(len(candles)):
            if ema_values[i] is None or atr_values[i] is None:
                upper.append(None)
                lower.append(None)
            else:
                upper.append(ema_values[i] + (multiplier * atr_values[i]))
                lower.append(ema_values[i] - (multiplier * atr_values[i]))
        
        return {
            'upper': upper,
            'middle': ema_values,
            'lower': lower
        }
    
    @staticmethod
    def donchian_channels(candles: List[OHLCV], period: int = 20) -> Dict[str, List[float]]:
        """Donchian Channels"""
        highs = [c.high for c in candles]
        lows = [c.low for c in candles]
        
        upper = [None] * (period - 1)
        lower = [None] * (period - 1)
        middle = [None] * (period - 1)
        
        for i in range(period - 1, len(candles)):
            period_high = max(highs[i - period + 1:i + 1])
            period_low = min(lows[i - period + 1:i + 1])
            upper.append(period_high)
            lower.append(period_low)
            middle.append((period_high + period_low) / 2)
        
        return {
            'upper': upper,
            'middle': middle,
            'lower': lower
        }
    
    # ========== VOLUME INDICATORS ==========
    
    @staticmethod
    def volume(candles: List[OHLCV]) -> List[float]:
        """Raw volume"""
        return [c.volume for c in candles]
    
    @staticmethod
    def volume_ma(candles: List[OHLCV], period: int = 20) -> List[float]:
        """Volume Moving Average"""
        volumes = [c.volume for c in candles]
        return IndicatorCalculator.sma(volumes, period)
    
    @staticmethod
    def obv(candles: List[OHLCV]) -> List[float]:
        """On-Balance Volume"""
        if len(candles) == 0:
            return []
        
        obv_values = [candles[0].volume]
        
        for i in range(1, len(candles)):
            if candles[i].close > candles[i-1].close:
                obv_values.append(obv_values[-1] + candles[i].volume)
            elif candles[i].close < candles[i-1].close:
                obv_values.append(obv_values[-1] - candles[i].volume)
            else:
                obv_values.append(obv_values[-1])
        
        return obv_values
    
    @staticmethod
    def accumulation_distribution(candles: List[OHLCV]) -> List[float]:
        """Accumulation/Distribution Line"""
        ad_values = []
        cumulative = 0
        
        for c in candles:
            if c.high == c.low:
                mfm = 0
            else:
                mfm = ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low)
            
            mfv = mfm * c.volume
            cumulative += mfv
            ad_values.append(cumulative)
        
        return ad_values


class RuleEngine:
    """
    Rule evaluation engine for trading bot conditions.
    Supports AND/OR logic, crossovers, thresholds, nested conditions.
    """
    
    @staticmethod
    def evaluate_condition(condition: Dict[str, Any], indicator_values: Dict[str, Any]) -> bool:
        """
        Evaluate a single condition.
        
        Condition format:
        {
            "indicator": "rsi",
            "timeframe": "15m",
            "operator": "<",
            "value": 30
        }
        
        Or for crossovers:
        {
            "type": "crossover",
            "indicator1": {"name": "ema", "params": {"period": 9}},
            "indicator2": {"name": "ema", "params": {"period": 21}},
            "direction": "above"  # or "below"
        }
        """
        try:
            cond_type = condition.get('type', 'threshold')
            
            if cond_type == 'threshold':
                return RuleEngine._evaluate_threshold(condition, indicator_values)
            elif cond_type == 'crossover':
                return RuleEngine._evaluate_crossover(condition, indicator_values)
            elif cond_type == 'touch':
                return RuleEngine._evaluate_touch(condition, indicator_values)
            else:
                logger.warning(f"Unknown condition type: {cond_type}")
                return False
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False
    
    @staticmethod
    def _evaluate_threshold(condition: Dict, values: Dict) -> bool:
        """Evaluate threshold condition (e.g., RSI < 30)"""
        indicator = condition.get('indicator')
        operator = condition.get('operator')
        target = condition.get('value')
        timeframe = condition.get('timeframe', '1h')
        
        key = f"{indicator}_{timeframe}"
        current_value = values.get(key)
        
        if current_value is None:
            return False
        
        # Handle dict values (e.g., MACD has multiple outputs)
        if isinstance(current_value, dict):
            component = condition.get('component', 'value')
            current_value = current_value.get(component)
            if current_value is None:
                return False
        
        # Get latest value if it's a list
        if isinstance(current_value, list):
            current_value = current_value[-1] if current_value else None
            if current_value is None:
                return False
        
        if operator == '<':
            return current_value < target
        elif operator == '>':
            return current_value > target
        elif operator == '<=':
            return current_value <= target
        elif operator == '>=':
            return current_value >= target
        elif operator == '==':
            return abs(current_value - target) < 0.001
        else:
            return False
    
    @staticmethod
    def _evaluate_crossover(condition: Dict, values: Dict) -> bool:
        """Evaluate crossover condition (e.g., EMA9 crosses above EMA21)"""
        ind1 = condition.get('indicator1', {})
        ind2 = condition.get('indicator2', {})
        direction = condition.get('direction', 'above')
        timeframe = condition.get('timeframe', '1h')
        
        key1 = f"{ind1.get('name')}_{ind1.get('params', {}).get('period', '')}_{timeframe}"
        key2 = f"{ind2.get('name')}_{ind2.get('params', {}).get('period', '')}_{timeframe}"
        
        vals1 = values.get(key1, [])
        vals2 = values.get(key2, [])
        
        if not vals1 or not vals2 or len(vals1) < 2 or len(vals2) < 2:
            return False
        
        # Get last two values
        prev1, curr1 = vals1[-2], vals1[-1]
        prev2, curr2 = vals2[-2], vals2[-1]
        
        if None in [prev1, curr1, prev2, curr2]:
            return False
        
        if direction == 'above':
            # Was below or equal, now above
            return prev1 <= prev2 and curr1 > curr2
        else:  # below
            # Was above or equal, now below
            return prev1 >= prev2 and curr1 < curr2
    
    @staticmethod
    def _evaluate_touch(condition: Dict, values: Dict) -> bool:
        """Evaluate touch condition (e.g., price touches BB lower)"""
        indicator = condition.get('indicator')
        band = condition.get('band', 'lower')
        timeframe = condition.get('timeframe', '1h')
        tolerance = condition.get('tolerance', 0.001)  # 0.1% default
        
        price_key = f"close_{timeframe}"
        band_key = f"{indicator}_{band}_{timeframe}"
        
        price = values.get(price_key)
        band_value = values.get(band_key)
        
        if price is None or band_value is None:
            return False
        
        if isinstance(price, list):
            price = price[-1]
        if isinstance(band_value, list):
            band_value = band_value[-1]
        
        if price is None or band_value is None:
            return False
        
        return abs(price - band_value) / band_value <= tolerance
    
    @staticmethod
    def evaluate_rule(rule: Dict[str, Any], indicator_values: Dict[str, Any]) -> bool:
        """
        Evaluate a complete rule with AND/OR logic.
        
        Rule format:
        {
            "operator": "AND",  # or "OR"
            "conditions": [
                {"indicator": "rsi", "operator": "<", "value": 30, "timeframe": "15m"},
                {
                    "operator": "OR",
                    "conditions": [
                        {"type": "crossover", ...},
                        {"indicator": "macd", "component": "histogram", "operator": ">", "value": 0}
                    ]
                }
            ]
        }
        """
        logic_op = rule.get('operator', 'AND')
        conditions = rule.get('conditions', [])
        
        if not conditions:
            return False
        
        results = []
        for cond in conditions:
            if 'conditions' in cond:
                # Nested rule
                results.append(RuleEngine.evaluate_rule(cond, indicator_values))
            else:
                # Single condition
                results.append(RuleEngine.evaluate_condition(cond, indicator_values))
        
        if logic_op == 'AND':
            return all(results)
        else:  # OR
            return any(results)


# Registry of all available indicators
INDICATOR_REGISTRY = {
    # Trend
    'ema': {'fn': IndicatorCalculator.ema, 'params': ['closes', 'period'], 'default_params': {'period': 20}},
    'sma': {'fn': IndicatorCalculator.sma, 'params': ['closes', 'period'], 'default_params': {'period': 20}},
    'wma': {'fn': IndicatorCalculator.wma, 'params': ['closes', 'period'], 'default_params': {'period': 20}},
    'vwap': {'fn': IndicatorCalculator.vwap, 'params': ['candles'], 'default_params': {}},
    'ichimoku': {'fn': IndicatorCalculator.ichimoku, 'params': ['candles', 'tenkan', 'kijun', 'senkou_b'], 'default_params': {'tenkan': 9, 'kijun': 26, 'senkou_b': 52}},
    'supertrend': {'fn': IndicatorCalculator.supertrend, 'params': ['candles', 'period', 'multiplier'], 'default_params': {'period': 10, 'multiplier': 3.0}},
    # Momentum
    'rsi': {'fn': IndicatorCalculator.rsi, 'params': ['closes', 'period'], 'default_params': {'period': 14}},
    'macd': {'fn': IndicatorCalculator.macd, 'params': ['closes', 'fast', 'slow', 'signal'], 'default_params': {'fast': 12, 'slow': 26, 'signal': 9}},
    'stochastic': {'fn': IndicatorCalculator.stochastic, 'params': ['candles', 'k_period', 'd_period'], 'default_params': {'k_period': 14, 'd_period': 3}},
    'stochastic_rsi': {'fn': IndicatorCalculator.stochastic_rsi, 'params': ['closes', 'rsi_period', 'stoch_period', 'k_period', 'd_period'], 'default_params': {'rsi_period': 14, 'stoch_period': 14, 'k_period': 3, 'd_period': 3}},
    'cci': {'fn': IndicatorCalculator.cci, 'params': ['candles', 'period'], 'default_params': {'period': 20}},
    'momentum': {'fn': IndicatorCalculator.momentum, 'params': ['closes', 'period'], 'default_params': {'period': 10}},
    # Volatility
    'bollinger': {'fn': IndicatorCalculator.bollinger_bands, 'params': ['closes', 'period', 'std_dev'], 'default_params': {'period': 20, 'std_dev': 2.0}},
    'atr': {'fn': IndicatorCalculator.atr, 'params': ['candles', 'period'], 'default_params': {'period': 14}},
    'keltner': {'fn': IndicatorCalculator.keltner_channels, 'params': ['candles', 'ema_period', 'atr_period', 'multiplier'], 'default_params': {'ema_period': 20, 'atr_period': 10, 'multiplier': 2.0}},
    'donchian': {'fn': IndicatorCalculator.donchian_channels, 'params': ['candles', 'period'], 'default_params': {'period': 20}},
    # Volume
    'volume': {'fn': IndicatorCalculator.volume, 'params': ['candles'], 'default_params': {}},
    'volume_ma': {'fn': IndicatorCalculator.volume_ma, 'params': ['candles', 'period'], 'default_params': {'period': 20}},
    'obv': {'fn': IndicatorCalculator.obv, 'params': ['candles'], 'default_params': {}},
    'ad': {'fn': IndicatorCalculator.accumulation_distribution, 'params': ['candles'], 'default_params': {}}
}


def get_available_indicators() -> List[Dict[str, Any]]:
    """Return list of all available indicators with their parameters"""
    return [
        {'name': name, 'default_params': info['default_params']}
        for name, info in INDICATOR_REGISTRY.items()
    ]
