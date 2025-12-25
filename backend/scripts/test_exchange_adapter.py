#!/usr/bin/env python3
"""
Exchange Adapter Test Script
============================
Tests the exchange adapter system for Phase 8.

Runs:
  python scripts/test_exchange_adapter.py
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from exchange_adapters import (
    SimulatedAdapter,
    CoinGeckoAdapter, 
    BinanceAdapter,
    ExchangeAdapterFactory,
    LiveModeDataEnforcer,
    ExchangeType,
    CandleSource
)
from indicators import IndicatorCalculator


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def print_section(title: str):
    print(f"\n--- {title} ---")


async def test_simulated_adapter():
    """Test SimulatedAdapter with LOCAL FIXTURE data (no CoinGecko)."""
    print_header("TEST 1: SimulatedAdapter (Local Fixture Data)")
    
    adapter = SimulatedAdapter()
    candles, source = await adapter.get_ohlcv("BTCUSDT", "1h", 50)
    
    print_section("Candle Source Info")
    print(f"  Exchange: {source.exchange}")
    print(f"  Symbol: {source.symbol}")
    print(f"  Timeframe: {source.timeframe}")
    print(f"  Is Live Exchange: {source.is_live_exchange}")
    print(f"  Candle Open Time: {source.candle_open_time}")
    print(f"  Candle Close Time: {source.candle_close_time}")
    print(f"  Fetched At: {source.fetched_at}")
    
    print_section("Candle Data")
    print(f"  Total candles: {len(candles)}")
    if candles:
        first = candles[0]
        last = candles[-1]
        print(f"  First candle: ts={first.timestamp}, open=${first.open:.2f}, close=${first.close:.2f}")
        print(f"  Last candle:  ts={last.timestamp}, open=${last.open:.2f}, close=${last.close:.2f}")
    
    # Calculate indicators
    print_section("Indicator Calculations (from fixture candles)")
    closes = [c.close for c in candles]
    
    rsi = IndicatorCalculator.rsi(closes, period=14)
    rsi_value = rsi[-1] if isinstance(rsi, list) and len(rsi) > 0 else rsi
    print(f"  RSI(14): {rsi_value:.2f}" if rsi_value else "  RSI(14): N/A")
    
    bb = IndicatorCalculator.bollinger_bands(closes, period=20, std_dev=2)
    if isinstance(bb, dict):
        bb_lower = bb['lower'][-1] if isinstance(bb['lower'], list) else bb['lower']
        bb_middle = bb['middle'][-1] if isinstance(bb['middle'], list) else bb['middle']
        bb_upper = bb['upper'][-1] if isinstance(bb['upper'], list) else bb['upper']
        print(f"  BB Lower: ${bb_lower:.2f}" if bb_lower else "  BB Lower: N/A")
        print(f"  BB Middle: ${bb_middle:.2f}" if bb_middle else "  BB Middle: N/A")
        print(f"  BB Upper: ${bb_upper:.2f}" if bb_upper else "  BB Upper: N/A")
    
    # LiveModeDataEnforcer validation
    print_section("LiveModeDataEnforcer Validation")
    
    is_valid_paper, msg_paper = LiveModeDataEnforcer.validate_candle_source(source, is_live_mode=False)
    print(f"  PAPER mode: valid={is_valid_paper}, msg='{msg_paper}'")
    
    is_valid_live, msg_live = LiveModeDataEnforcer.validate_candle_source(source, is_live_mode=True)
    print(f"  LIVE mode:  valid={is_valid_live}, msg='{msg_live}'")
    
    return source.exchange == "simulated_fixture" and not source.is_live_exchange


async def test_coingecko_adapter():
    """Test CoinGeckoAdapter separately."""
    print_header("TEST 2: CoinGeckoAdapter (External API - OPTIONAL FALLBACK)")
    
    adapter = CoinGeckoAdapter()
    candles, source = await adapter.get_ohlcv("BTCUSDT", "1h", 20)
    
    print_section("Candle Source Info")
    print(f"  Exchange: {source.exchange}")
    print(f"  Is Live Exchange: {source.is_live_exchange}")
    print(f"  Candles received: {len(candles)}")
    
    if candles:
        print(f"  Latest price: ${candles[-1].close:.2f}")
    
    # LiveModeDataEnforcer validation
    print_section("LiveModeDataEnforcer Validation")
    is_valid_live, msg = LiveModeDataEnforcer.validate_candle_source(source, is_live_mode=True)
    print(f"  LIVE mode: valid={is_valid_live}")
    print(f"  Message: {msg}")
    
    return not source.is_live_exchange  # CoinGecko should NOT be live


async def test_live_mode_blocking():
    """Test that LIVE mode is blocked without proper credentials/exchange."""
    print_header("TEST 3: LIVE Mode Blocking")
    
    # Test 1: Factory requires credentials for LIVE
    print_section("Factory: LIVE without credentials")
    try:
        adapter = await ExchangeAdapterFactory.create_adapter(
            exchange_type=ExchangeType.BINANCE_TESTNET,
            credentials=None,
            is_live_mode=True
        )
        print("  FAIL: Should have raised ValueError")
        return False
    except ValueError as e:
        print(f"  PASS: Blocked with error: {e}")
    
    # Test 2: Factory requires API key for LIVE
    print_section("Factory: LIVE with empty credentials")
    try:
        adapter = await ExchangeAdapterFactory.create_adapter(
            exchange_type=ExchangeType.BINANCE_TESTNET,
            credentials={"api_key": "", "api_secret": ""},
            is_live_mode=True
        )
        print("  FAIL: Should have raised ValueError")
        return False
    except ValueError as e:
        print(f"  PASS: Blocked with error: {e}")
    
    # Test 3: SimulatedAdapter candles blocked in LIVE mode
    print_section("SimulatedAdapter candles in LIVE mode")
    adapter = SimulatedAdapter()
    candles, source = await adapter.get_ohlcv("BTCUSDT", "1h", 10)
    
    is_valid, msg = LiveModeDataEnforcer.validate_candle_source(source, is_live_mode=True)
    if not is_valid:
        print(f"  PASS: Blocked - {msg}")
    else:
        print("  FAIL: Should have blocked simulated candles in LIVE mode")
        return False
    
    return True


async def test_binance_adapter_structure():
    """Test BinanceAdapter structure (won't work due to geo-blocking)."""
    print_header("TEST 4: BinanceAdapter Structure Check")
    
    print_section("Creating BinanceAdapter (testnet)")
    adapter = BinanceAdapter(
        api_key="test_key",
        api_secret="test_secret",
        testnet=True
    )
    
    print(f"  Exchange Type: {adapter.get_exchange_type()}")
    print(f"  Is Live Exchange: {adapter.is_live_exchange()}")
    print(f"  Base URL: {adapter.base_url}")
    
    # The adapter IS a live exchange even if API calls fail
    return adapter.is_live_exchange() == True


async def run_all_tests():
    """Run all tests and print summary."""
    print("\n" + "#" * 70)
    print("# EXCHANGE ADAPTER TEST SUITE")
    print(f"# Run at: {datetime.now(timezone.utc).isoformat()}")
    print("#" * 70)
    
    results = {}
    
    try:
        results["SimulatedAdapter (Fixture)"] = await test_simulated_adapter()
    except Exception as e:
        print(f"\nERROR in test_simulated_adapter: {e}")
        results["SimulatedAdapter (Fixture)"] = False
    
    try:
        results["CoinGeckoAdapter"] = await test_coingecko_adapter()
    except Exception as e:
        print(f"\nERROR in test_coingecko_adapter: {e}")
        results["CoinGeckoAdapter"] = False
    
    try:
        results["LIVE Mode Blocking"] = await test_live_mode_blocking()
    except Exception as e:
        print(f"\nERROR in test_live_mode_blocking: {e}")
        results["LIVE Mode Blocking"] = False
    
    try:
        results["BinanceAdapter Structure"] = await test_binance_adapter_structure()
    except Exception as e:
        print(f"\nERROR in test_binance_adapter_structure: {e}")
        results["BinanceAdapter Structure"] = False
    
    # Summary
    print_header("TEST SUMMARY")
    
    all_passed = True
    for name, passed in results.items():
        status = "\u2705 PASS" if passed else "\u274c FAIL"
        print(f"  {status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 70)
    if all_passed:
        print("ALL TESTS PASSED \u2705")
    else:
        print("SOME TESTS FAILED \u274c")
    print("=" * 70 + "\n")
    
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
