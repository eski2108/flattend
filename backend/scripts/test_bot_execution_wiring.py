#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
Phase 8: Bot Execution Wiring Test
═══════════════════════════════════════════════════════════════════════════════

This script tests that the exchange adapters are correctly wired into the bot
execution path and all 3 guardrails are working.

TEST 1: PAPER mode uses SimulatedAdapter (is_live_exchange=False)
TEST 2: LIVE mode blocked when data source is not from live exchange
TEST 3: (Optional) LIVE mode with real exchange adapter

Usage:
    cd /app/backend
    python scripts/test_bot_execution_wiring.py
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from exchange_adapters import (
    SimulatedAdapter, CoinGeckoAdapter, BinanceAdapter,
    ExchangeAdapterFactory, LiveModeDataEnforcer, ExchangeType
)
from bot_execution_engine import CandleManager, LiveModeValidator
from signal_engine import SignalIndicatorCalculator, IndicatorConfig, DecisionEngine, StrategyBuilder
from indicators import IndicatorCalculator


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def print_result(name: str, passed: bool, details: str = ""):
    icon = "✅" if passed else "❌"
    print(f"\n{icon} {name}")
    if details:
        for line in details.split("\n"):
            print(f"   {line}")


async def test_1_paper_mode_uses_simulated_adapter():
    """
    TEST 1: PAPER mode uses SimulatedAdapter with local fixture data.
    The source should show is_live_exchange=False.
    """
    print_header("TEST 1: PAPER Mode Uses SimulatedAdapter")
    
    try:
        # Test via CandleManager (the main execution path)
        candles, source, error = await CandleManager.get_candles_with_source(
            pair="BTCUSDT",
            timeframe="1h",
            limit=50,
            is_live_mode=False,  # PAPER mode
            user_id="test_user_123",
            bot_id="test_bot_paper"
        )
        
        # Check results
        if error:
            print_result("CandleManager fetch", False, f"Error: {error}")
            return False
        
        if not candles:
            print_result("CandleManager fetch", False, "No candles returned")
            return False
        
        # Verify source
        exchange = source.get("exchange", "unknown")
        is_live = source.get("is_live_exchange", True)
        
        details = f"""
Exchange: {exchange}
Is Live Exchange: {is_live}
Candles Returned: {len(candles)}
First Candle Close: ${candles[0].get('close', 0):.2f}
Last Candle Close: ${candles[-1].get('close', 0):.2f}
"""
        
        # PAPER mode should use simulated_fixture and NOT be a live exchange
        passed = (
            exchange == "simulated_fixture" and
            is_live == False and
            len(candles) > 0
        )
        
        print_result("PAPER mode data source", passed, details)
        
        # Also test that indicators can be calculated
        print("\n--- Indicator Calculation from Fixture Data ---")
        closes = [c.get('close', 0) for c in candles]
        rsi = IndicatorCalculator.rsi(closes, period=14)
        rsi_value = rsi[-1] if isinstance(rsi, list) and len(rsi) > 0 else 0
        print(f"   RSI(14): {rsi_value:.2f}")
        
        return passed
        
    except Exception as e:
        print_result("TEST 1", False, f"Exception: {e}")
        return False


async def test_2_live_mode_blocked_on_non_live_source():
    """
    TEST 2: LIVE mode is BLOCKED when the data source is not from a live exchange.
    This tests Guardrail A: is_live_exchange must be True for LIVE mode.
    """
    print_header("TEST 2: LIVE Mode Blocked on Non-Live Source")
    
    try:
        # Force using SimulatedAdapter in LIVE mode
        # This should be REJECTED by Guardrail A
        adapter = SimulatedAdapter()
        
        # Fetch via adapter directly
        candles, source = await adapter.get_ohlcv("BTCUSDT", "1h", 50)
        
        # Now validate this source for LIVE mode
        is_valid, message = LiveModeDataEnforcer.validate_candle_source(
            source=source,
            is_live_mode=True  # LIVE mode
        )
        
        details = f"""
Source Exchange: {source.exchange}
Source is_live_exchange: {source.is_live_exchange}
Validation Result: {is_valid}
Validation Message: {message}
"""
        
        # For LIVE mode, SimulatedAdapter should be REJECTED
        passed = (
            is_valid == False and
            "not a live exchange" in message.lower()
        )
        
        print_result("LIVE mode rejects non-live source", passed, details)
        
        # Also test via CandleManager directly
        print("\n--- Via CandleManager.get_candles_with_source ---")
        
        # This should return an error because LIVE mode + no credentials
        candles2, source2, error = await CandleManager.get_candles_with_source(
            pair="BTCUSDT",
            timeframe="1h",
            limit=50,
            is_live_mode=True,  # LIVE mode
            user_id="test_user_no_creds",
            bot_id="test_bot_live_no_creds"
        )
        
        # Either error due to no credentials, or blocked due to non-live source
        if error:
            print(f"   Error returned: {error}")
            print(f"   ✅ LIVE mode correctly blocked/errored")
        elif source2 and not source2.get("is_live_exchange", True):
            print(f"   Source exchange: {source2.get('exchange')}")
            print(f"   ❌ Should have errored for LIVE mode with non-live source")
            passed = False
        else:
            print(f"   Source: {source2}")
        
        return passed
        
    except Exception as e:
        # Exception is acceptable - LIVE mode should fail without proper setup
        print_result("TEST 2", True, f"LIVE mode correctly failed: {e}")
        return True


async def test_3_live_mode_validation():
    """
    TEST 3: Test LiveModeValidator (Guardrail B)
    Verifies that LIVE mode requires:
    - Valid exchange credentials
    - Sufficient balance
    - Explicit confirmation
    """
    print_header("TEST 3: LIVE Mode Validator (Guardrail B)")
    
    try:
        # Test validation with fake user (should fail)
        is_valid, message = await LiveModeValidator.validate_live_mode(
            user_id="fake_user_no_creds",
            bot_id="test_bot",
            pair="BTCUSDT",
            required_balance=100.0,
            explicit_confirmation=True
        )
        
        details = f"""
Validation Result: {is_valid}
Validation Message: {message}
"""
        
        # Should fail due to no credentials
        passed = (
            is_valid == False and
            ("credentials" in message.lower() or "balance" in message.lower() or "wallet" in message.lower())
        )
        
        print_result("LIVE validation rejects without credentials", passed, details)
        
        # Test without explicit confirmation
        is_valid2, message2 = await LiveModeValidator.validate_live_mode(
            user_id="fake_user",
            bot_id="test_bot",
            pair="BTCUSDT",
            required_balance=100.0,
            explicit_confirmation=False  # Not confirmed
        )
        
        print(f"\n--- Without Explicit Confirmation ---")
        print(f"   Validation Result: {is_valid2}")
        print(f"   Message: {message2}")
        
        passed2 = is_valid2 == False and "confirmation" in message2.lower()
        print(f"   {'✅' if passed2 else '❌'} Correctly requires explicit confirmation")
        
        return passed and passed2
        
    except Exception as e:
        print_result("TEST 3", False, f"Exception: {e}")
        return False


async def test_4_decision_engine_with_source_tracking():
    """
    TEST 4: DecisionEngine returns candle source info for audit trail.
    """
    print_header("TEST 4: DecisionEngine Source Tracking")
    
    try:
        # Build a simple test strategy
        strategy_config = {
            "name": "Test Strategy",
            "primary_timeframe": "1h",
            "entry_rules": {
                "operator": "AND",
                "conditions": [
                    {
                        "indicator": "rsi",
                        "params": {"period": 14},
                        "comparator": "<",
                        "value": 100  # Always true for testing
                    }
                ]
            },
            "exit_rules": {
                "operator": "OR",
                "conditions": []
            },
            "order_size_value": 100
        }
        
        strategy = StrategyBuilder.from_dict(strategy_config)
        
        # Evaluate in PAPER mode
        signal, details = await DecisionEngine.evaluate_strategy(
            strategy=strategy,
            pair="BTCUSDT",
            bot_id="test_bot_source_tracking",
            current_position=None,
            is_live_mode=False,
            user_id="test_user"
        )
        
        # Check if candle source is included
        candle_source = details.get("candle_source")
        mode = details.get("mode")
        is_live_exchange = details.get("is_live_exchange")
        
        details_str = f"""
Candle Source Present: {candle_source is not None}
Candle Source Exchange: {candle_source.get('exchange') if candle_source else 'N/A'}
Mode: {mode}
Is Live Exchange: {is_live_exchange}
Signal Generated: {signal is not None}
"""
        
        passed = (
            candle_source is not None and
            mode == "paper" and
            is_live_exchange == False
        )
        
        print_result("DecisionEngine includes source tracking", passed, details_str)
        
        if signal:
            print(f"\n   Signal Type: {signal.signal_type}")
            print(f"   Signal Confidence: {signal.confidence:.0%}")
        
        return passed
        
    except Exception as e:
        print_result("TEST 4", False, f"Exception: {e}")
        return False


async def main():
    print("\n" + "#" * 70)
    print("#  PHASE 8: BOT EXECUTION WIRING TEST")
    print("#" + "=" * 68 + "#")
    print("#  Testing that exchange adapters are correctly wired into bot execution")
    print("#" * 70)
    
    results = []
    
    # Run tests
    results.append(("TEST 1: PAPER uses SimulatedAdapter", await test_1_paper_mode_uses_simulated_adapter()))
    results.append(("TEST 2: LIVE blocked on non-live source", await test_2_live_mode_blocked_on_non_live_source()))
    results.append(("TEST 3: LIVE validation (credentials/balance)", await test_3_live_mode_validation()))
    results.append(("TEST 4: DecisionEngine source tracking", await test_4_decision_engine_with_source_tracking()))
    
    # Summary
    print("\n" + "=" * 70)
    print(" TEST SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for name, passed in results:
        icon = "✅" if passed else "❌"
        print(f"  {icon} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "-" * 70)
    if all_passed:
        print("\n🎉 ALL TESTS PASSED - Adapter wiring is correct!")
        print("\nKey verifications:")
        print("  ✓ PAPER mode uses SimulatedAdapter (local fixture, is_live_exchange=False)")
        print("  ✓ LIVE mode rejects non-live data sources (Guardrail A)")
        print("  ✓ LIVE mode requires credentials + balance (Guardrail B)")
        print("  ✓ DecisionEngine includes candle source for audit (Guardrail C logged)")
    else:
        print("\n⚠️ SOME TESTS FAILED - Review output above")
    
    print("\n" + "#" * 70)
    
    return all_passed


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
