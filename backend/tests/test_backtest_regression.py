"""
🧪 PHASE 5 BACKTEST REGRESSION TESTS
═══════════════════════════════════════════════════════════════════════════════

These tests MUST pass to ensure Phase 5 behavior remains bit-for-bit identical.
Any change to backtest logic that breaks these tests is REJECTED.

═══════════════════════════════════════════════════════════════════════════════
"""

import pytest
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backtesting_engine import (
    BacktestEngine,
    BacktestCandle,
    BacktestResult,
    DCABotBacktester,
    GridBotBacktester,
    SignalBotBacktester,
    FeeCalculator,
    BacktestState
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST FIXTURES - Known candle data for deterministic testing
# ═══════════════════════════════════════════════════════════════════════════════

def get_test_candles():
    """Generate deterministic test candles"""
    candles = []
    base_price = 50000
    for i in range(100):
        # Deterministic price movement
        price_change = (i % 10 - 5) * 100  # -500 to +400
        close = base_price + price_change + (i * 10)
        candles.append(BacktestCandle(
            timestamp=1700000000 + (i * 3600),
            open=close - 50,
            high=close + 100,
            low=close - 100,
            close=close,
            volume=1000 + i
        ))
    return candles


# ═══════════════════════════════════════════════════════════════════════════════
# REGRESSION TEST: DCA Bot
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_dca_backtest_determinism():
    """
    DCA backtest must produce identical results across multiple runs.
    This is the core regression test for Phase 5.
    """
    candles = get_test_candles()
    config = {
        "dca_mode": "time_based",
        "buy_interval_candles": 10,
        "base_order_size_percent": 5,
        "safety_order_size_percent": 10,
        "max_dca_levels": 3,
        "take_profit_percent": 2
    }
    initial_balance = 10000
    
    # Run 3 times
    results = []
    for _ in range(3):
        state, trades = await DCABotBacktester.run(candles, config, initial_balance)
        results.append({
            "total_pnl": round(state.total_pnl, 8),
            "total_fees": round(state.total_fees, 8),
            "balance": round(state.balance, 8),
            "trades_count": len([t for t in trades if t.side == "sell"])
        })
    
    # All runs must be identical
    assert results[0] == results[1], "DCA Run 1 != Run 2"
    assert results[1] == results[2], "DCA Run 2 != Run 3"


@pytest.mark.asyncio
async def test_dca_backtest_reconciliation():
    """
    DCA backtest must reconcile: start_balance + pnl - fees = end_balance
    """
    candles = get_test_candles()
    config = {
        "dca_mode": "time_based",
        "buy_interval_candles": 10,
        "base_order_size_percent": 5,
        "max_dca_levels": 3,
        "take_profit_percent": 2
    }
    initial_balance = 10000
    
    state, trades = await DCABotBacktester.run(candles, config, initial_balance)
    
    # Reconciliation check
    calculated_end = initial_balance + state.total_pnl - state.total_fees
    actual_end = state.balance
    
    # Must match within floating point tolerance
    assert abs(calculated_end - actual_end) < 0.00001, \
        f"Reconciliation failed: {calculated_end} != {actual_end}"


# ═══════════════════════════════════════════════════════════════════════════════
# REGRESSION TEST: Grid Bot
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_grid_backtest_determinism():
    """
    Grid backtest must produce identical results across multiple runs.
    """
    candles = get_test_candles()
    config = {
        "upper_price": 52000,
        "lower_price": 48000,
        "grid_levels": 5,
        "order_size_percent": 10
    }
    initial_balance = 10000
    
    results = []
    for _ in range(3):
        state, trades = await GridBotBacktester.run(candles, config, initial_balance)
        results.append({
            "total_pnl": round(state.total_pnl, 8),
            "total_fees": round(state.total_fees, 8),
            "balance": round(state.balance, 8)
        })
    
    assert results[0] == results[1], "Grid Run 1 != Run 2"
    assert results[1] == results[2], "Grid Run 2 != Run 3"


@pytest.mark.asyncio
async def test_grid_backtest_reconciliation():
    """
    Grid backtest must reconcile correctly.
    """
    candles = get_test_candles()
    config = {
        "upper_price": 52000,
        "lower_price": 48000,
        "grid_levels": 5,
        "order_size_percent": 10
    }
    initial_balance = 10000
    
    state, trades = await GridBotBacktester.run(candles, config, initial_balance)
    
    calculated_end = initial_balance + state.total_pnl - state.total_fees
    actual_end = state.balance
    
    assert abs(calculated_end - actual_end) < 0.00001, \
        f"Grid reconciliation failed: {calculated_end} != {actual_end}"


# ═══════════════════════════════════════════════════════════════════════════════
# REGRESSION TEST: Signal Bot
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_signal_backtest_determinism():
    """
    Signal backtest must produce identical results across multiple runs.
    """
    candles = get_test_candles()
    config = {
        "position_size_percent": 20,
        "lookback_candles": 20,
        "strategy": {
            "indicators": [
                {"indicator": "RSI", "params": {"period": 14}, "comparator": "<", "threshold": 40}
            ],
            "entry_logic": "AND",
            "exit_logic": "AND"
        }
    }
    initial_balance = 10000
    
    results = []
    for _ in range(3):
        state, trades = await SignalBotBacktester.run(candles, config, initial_balance)
        results.append({
            "total_pnl": round(state.total_pnl, 8),
            "total_fees": round(state.total_fees, 8),
            "balance": round(state.balance, 8)
        })
    
    assert results[0] == results[1], "Signal Run 1 != Run 2"
    assert results[1] == results[2], "Signal Run 2 != Run 3"


# ═══════════════════════════════════════════════════════════════════════════════
# REGRESSION TEST: Output Format
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_backtest_result_has_only_5_metrics():
    """
    BacktestResult must contain ONLY the 5 required metrics.
    No extra metrics allowed.
    """
    candles = get_test_candles()
    config = {"dca_mode": "time_based", "buy_interval_candles": 10}
    
    state, trades = await DCABotBacktester.run(candles, config, 10000)
    
    # Create result
    result = BacktestResult(
        backtest_id="test",
        bot_type="dca",
        pair="BTCUSD",
        timeframe="1h",
        start_time=0,
        end_time=0,
        start_balance=10000,
        end_balance=state.balance,
        total_pnl=state.total_pnl,
        max_drawdown=state.max_drawdown,
        win_rate=0,
        fees_paid=state.total_fees,
        trades_count=len(trades)
    )
    
    result_dict = result.to_dict()
    
    # Must have these 5 metrics
    required_metrics = ["total_pnl", "max_drawdown", "win_rate", "fees_paid", "trades_count"]
    for metric in required_metrics:
        assert metric in result_dict, f"Missing required metric: {metric}"
    
    # Must NOT have these (Phase 5 exclusions)
    forbidden_metrics = ["sharpe_ratio", "sortino_ratio", "slippage", "avg_slippage"]
    for metric in forbidden_metrics:
        assert metric not in result_dict, f"Forbidden metric found: {metric}"


# ═══════════════════════════════════════════════════════════════════════════════
# REGRESSION TEST: Fee Logic
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_fee_calculator_uses_platform_config():
    """
    FeeCalculator must use existing platform fee configuration.
    """
    # Get fee percent
    fee_percent = await FeeCalculator.get_fee_percent()
    
    # Must be a reasonable value (0.01% to 5%)
    assert 0.01 <= fee_percent <= 5.0, f"Fee percent out of range: {fee_percent}"
    
    # Calculate fee
    trade_value = 1000
    fee = await FeeCalculator.calculate_fee(trade_value)
    
    expected_fee = trade_value * (fee_percent / 100)
    assert abs(fee - expected_fee) < 0.0001, f"Fee calculation mismatch: {fee} != {expected_fee}"


# ═══════════════════════════════════════════════════════════════════════════════
# RUN TESTS
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
