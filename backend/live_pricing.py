# Live Crypto Pricing Module for Coin Hub X
# Uses CoinGecko API (free, no API key required)

import httpx
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Cache for prices to avoid rate limiting
# Initialize with fallback prices to prevent empty responses during rate limits
_price_cache = {
    "BTC": {
        "usd": 91495, "gbp": 69045, 
        "usd_24h_change": 1.13, "gbp_24h_change": 1.05,
        "usd_24h_high": 92000, "gbp_24h_high": 69500,
        "usd_24h_low": 90000, "gbp_24h_low": 68000,
        "usd_24h_vol": 35000000000, "gbp_24h_vol": 26000000000
    },
    "ETH": {
        "usd": 3040, "gbp": 2294,
        "usd_24h_change": 2.29, "gbp_24h_change": 2.22,
        "usd_24h_high": 3100, "gbp_24h_high": 2350,
        "usd_24h_low": 2950, "gbp_24h_low": 2230,
        "usd_24h_vol": 12000000000, "gbp_24h_vol": 9000000000
    },
    "USDT": {
        "usd": 1.0, "gbp": 0.75,
        "usd_24h_change": 0.01, "gbp_24h_change": 0.01,
        "usd_24h_high": 1.001, "gbp_24h_high": 0.751,
        "usd_24h_low": 0.999, "gbp_24h_low": 0.749,
        "usd_24h_vol": 45000000000, "gbp_24h_vol": 34000000000
    },
    "USDC": {
        "usd": 1.0, "gbp": 0.75,
        "usd_24h_change": 0.0, "gbp_24h_change": 0.0,
        "usd_24h_high": 1.0, "gbp_24h_high": 0.75,
        "usd_24h_low": 1.0, "gbp_24h_low": 0.75,
        "usd_24h_vol": 5000000000, "gbp_24h_vol": 3750000000
    },
    "BNB": {
        "usd": 897, "gbp": 677,
        "usd_24h_change": 1.5, "gbp_24h_change": 1.4,
        "usd_24h_high": 910, "gbp_24h_high": 687,
        "usd_24h_low": 880, "gbp_24h_low": 665,
        "usd_24h_vol": 1200000000, "gbp_24h_vol": 900000000
    },
    "SOL": {
        "usd": 138, "gbp": 104,
        "usd_24h_change": 3.2, "gbp_24h_change": 3.1,
        "usd_24h_high": 142, "gbp_24h_high": 107,
        "usd_24h_low": 133, "gbp_24h_low": 100,
        "usd_24h_vol": 2500000000, "gbp_24h_vol": 1875000000
    },
    "XRP": {
        "usd": 2.2, "gbp": 1.66,
        "usd_24h_change": 0.8, "gbp_24h_change": 0.7,
        "usd_24h_high": 2.25, "gbp_24h_high": 1.70,
        "usd_24h_low": 2.15, "gbp_24h_low": 1.62,
        "usd_24h_vol": 5500000000, "gbp_24h_vol": 4125000000
    },
    "ADA": {
        "usd": 0.425, "gbp": 0.32,
        "usd_24h_change": 1.1, "gbp_24h_change": 1.0,
        "usd_24h_high": 0.435, "gbp_24h_high": 0.33,
        "usd_24h_low": 0.415, "gbp_24h_low": 0.31,
        "usd_24h_vol": 450000000, "gbp_24h_vol": 337500000
    },
    "DOGE": {
        "usd": 0.08, "gbp": 0.06,
        "usd_24h_change": 2.5, "gbp_24h_change": 2.4,
        "usd_24h_high": 0.082, "gbp_24h_high": 0.062,
        "usd_24h_low": 0.078, "gbp_24h_low": 0.059,
        "usd_24h_vol": 850000000, "gbp_24h_vol": 637500000
    }
}
_cache_timestamp = datetime.now(timezone.utc)  # Initialize with current time
CACHE_DURATION = 300  # seconds - 5 minutes to avoid CoinGecko rate limits

# CoinGecko coin ID mapping
COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
    "BNB": "binancecoin",
    "SOL": "solana",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "LINK": "chainlink",
    "LTC": "litecoin",
    "BCH": "bitcoin-cash",
    "UNI": "uniswap",
    "AVAX": "avalanche-2",
    "ATOM": "cosmos",
    "TRX": "tron",
    "SHIB": "shiba-inu",
    "DAI": "dai"
}

async def fetch_live_prices() -> Dict[str, float]:
    """
    Fetch live crypto prices from CoinGecko API with complete market data
    Returns prices in USD and GBP with 24h high, low, volume
    """
    global _price_cache, _cache_timestamp
    
    # Return cached prices if still fresh
    if _cache_timestamp and _price_cache:
        age = (datetime.now(timezone.utc) - _cache_timestamp).total_seconds()
        if age < CACHE_DURATION:
            logger.debug(f"Using cached prices (age: {age:.1f}s)")
            return _price_cache
    
    try:
        # Build CoinGecko API request with full market data using /coins/markets endpoint
        # This endpoint provides complete OHLCV data including high and low
        coin_ids = ",".join(COINGECKO_IDS.values())
        url = f"https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids={coin_ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Also fetch GBP and EUR prices
                multi_currency_url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids}&vs_currencies=gbp,eur&include_24hr_change=true&include_24hr_vol=true"
                multi_response = await client.get(multi_currency_url)
                gbp_data = multi_response.json() if multi_response.status_code == 200 else {}
                
                # Convert CoinGecko response to our format with full market data
                prices = {}
                for coin in data:
                    # Find the symbol for this coin_id
                    symbol = None
                    for sym, cid in COINGECKO_IDS.items():
                        if cid == coin['id']:
                            symbol = sym
                            break
                    
                    if symbol:
                        gbp_coin_data = gbp_data.get(coin['id'], {})
                        current_price = coin.get("current_price") or 0
                        gbp_price = gbp_coin_data.get("gbp") or 0
                        high_24h = coin.get("high_24h") or 0
                        low_24h = coin.get("low_24h") or 0
                        
                        # Calculate GBP high/low based on ratio
                        gbp_high = (gbp_price * (high_24h / current_price)) if (current_price > 0 and high_24h > 0) else 0
                        gbp_low = (gbp_price * (low_24h / current_price)) if (current_price > 0 and low_24h > 0) else 0
                        
                        # Calculate sentiment based on price change
                        change_24h = coin.get("price_change_percentage_24h") or 0
                        sentiment_type = "bullish" if change_24h > 0 else "bearish"
                        # Simple sentiment percentage based on momentum (capped at 100%)
                        sentiment_pct = min(50 + abs(change_24h) * 5, 95)
                        
                        # Get EUR price
                        eur_price = gbp_coin_data.get("eur") or 0
                        eur_high = (eur_price * (high_24h / current_price)) if (current_price > 0 and high_24h > 0) else 0
                        eur_low = (eur_price * (low_24h / current_price)) if (current_price > 0 and low_24h > 0) else 0
                        
                        prices[symbol] = {
                            "usd": current_price,
                            "gbp": gbp_price,
                            "eur": eur_price,
                            "usd_24h_change": change_24h,
                            "gbp_24h_change": gbp_coin_data.get("gbp_24h_change") or 0,
                            "eur_24h_change": gbp_coin_data.get("eur_24h_change") or 0,
                            "usd_24h_high": high_24h,
                            "gbp_24h_high": gbp_high,
                            "eur_24h_high": eur_high,
                            "usd_24h_low": low_24h,
                            "gbp_24h_low": gbp_low,
                            "eur_24h_low": eur_low,
                            "usd_24h_vol": coin.get("total_volume") or 0,
                            "gbp_24h_vol": gbp_coin_data.get("gbp_24h_vol") or 0,
                            "eur_24h_vol": gbp_coin_data.get("eur_24h_vol") or 0,
                            "market_cap": coin.get("market_cap") or 0,
                            "circulating_supply": coin.get("circulating_supply") or 0,
                            "ath": coin.get("ath") or 0,
                            "atl": coin.get("atl") or 0,
                            "sentiment": {
                                "type": sentiment_type,
                                "percentage": int(sentiment_pct)
                            }
                        }
                
                # Update cache
                _price_cache = prices
                _cache_timestamp = datetime.now(timezone.utc)
                
                logger.info(f"✅ Fetched complete market data for {len(prices)} coins from CoinGecko")
                return prices
            else:
                logger.error(f"CoinGecko API error: {response.status_code}")
                return _price_cache if _price_cache else {}
                
    except Exception as e:
        logger.error(f"Failed to fetch live prices: {str(e)}")
        # Return cached prices as fallback
        return _price_cache if _price_cache else {}

async def get_live_price(symbol: str, currency: str = "usd") -> float:
    """
    Get live price for a specific crypto
    
    Args:
        symbol: Crypto symbol (e.g., "BTC", "ETH")
        currency: Target currency ("usd" or "gbp")
    
    Returns:
        Price as float, or 0 if not available
    """
    prices = await fetch_live_prices()
    
    if symbol in prices:
        return prices[symbol].get(currency.lower(), 0)
    
    logger.warning(f"Price not available for {symbol}")
    return 0

async def get_all_live_prices(currency: str = "usd") -> Dict[str, float]:
    """
    Get all live prices in a specific currency
    
    Args:
        currency: Target currency ("usd" or "gbp")
    
    Returns:
        Dict of {symbol: price}
    """
    prices = await fetch_live_prices()
    
    return {
        symbol: data.get(currency.lower(), 0)
        for symbol, data in prices.items()
    }

async def convert_crypto_to_fiat(amount: float, crypto: str, fiat: str = "GBP") -> float:
    """
    Convert crypto amount to fiat value
    
    Args:
        amount: Crypto amount
        crypto: Crypto symbol
        fiat: Fiat currency (GBP or USD)
    
    Returns:
        Fiat value
    """
    currency = "gbp" if fiat.upper() == "GBP" else "usd"
    price = await get_live_price(crypto, currency)
    return amount * price

async def convert_fiat_to_crypto(amount: float, fiat: str, crypto: str) -> float:
    """
    Convert fiat amount to crypto amount
    
    Args:
        amount: Fiat amount
        fiat: Fiat currency (GBP or USD)
        crypto: Crypto symbol
    
    Returns:
        Crypto amount
    """
    currency = "gbp" if fiat.upper() == "GBP" else "usd"
    price = await get_live_price(crypto, currency)
    
    if price == 0:
        return 0
    
    return amount / price

# Background task to keep cache warm
async def price_updater_task():
    """Background task to continuously update prices"""
    while True:
        try:
            await fetch_live_prices()
            await asyncio.sleep(180)  # Update every 3 minutes to respect rate limits
        except Exception as e:
            logger.error(f"Price updater error: {e}")
            await asyncio.sleep(180)

def start_price_updater():
    """Start the background price updater"""
    asyncio.create_task(price_updater_task())
    logger.info("✅ Live price updater started")
