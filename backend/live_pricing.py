# Live Crypto Pricing Module for Coin Hub X
# Uses CoinGecko API (free, no API key required)

import httpx
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Cache for prices to avoid rate limiting
_price_cache = {}
_cache_timestamp = None
CACHE_DURATION = 120  # seconds - Increased for better performance

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
    Fetch live crypto prices from CoinGecko API
    Returns prices in USD
    """
    global _price_cache, _cache_timestamp
    
    # Return cached prices if still fresh
    if _cache_timestamp and _price_cache:
        age = (datetime.now(timezone.utc) - _cache_timestamp).total_seconds()
        if age < CACHE_DURATION:
            logger.debug(f"Using cached prices (age: {age:.1f}s)")
            return _price_cache
    
    try:
        # Build CoinGecko API request
        coin_ids = ",".join(COINGECKO_IDS.values())
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids}&vs_currencies=usd,gbp"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Convert CoinGecko response to our format
                prices = {}
                for symbol, coin_id in COINGECKO_IDS.items():
                    if coin_id in data:
                        prices[symbol] = {
                            "usd": data[coin_id].get("usd", 0),
                            "gbp": data[coin_id].get("gbp", 0)
                        }
                
                # Update cache
                _price_cache = prices
                _cache_timestamp = datetime.now(timezone.utc)
                
                logger.info(f"✅ Fetched live prices for {len(prices)} coins from CoinGecko")
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
            await asyncio.sleep(60)  # Update every minute
        except Exception as e:
            logger.error(f"Price updater error: {e}")
            await asyncio.sleep(60)

def start_price_updater():
    """Start the background price updater"""
    asyncio.create_task(price_updater_task())
    logger.info("✅ Live price updater started")
