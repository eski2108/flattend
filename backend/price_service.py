"""
Live Cryptocurrency Price and FX Rate Service
Uses Binance API for crypto prices and ExchangeRate-API for fiat conversions
"""

import aiohttp
import asyncio
from typing import Dict, Optional
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Supported cryptocurrencies
SUPPORTED_CRYPTOS = [
    'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 
    'ADA', 'DOGE', 'TRX', 'LTC', 'BCH', 'AVAX', 'DOT', 'MATIC'
]

# Supported fiat currencies
SUPPORTED_FIATS = ['GBP', 'USD', 'EUR', 'PHP', 'NGN', 'AUD', 'CAD', 'JPY', 'INR']

# Cache for prices (refresh every 10 seconds)
price_cache = {
    'crypto_prices': {},
    'fx_rates': {},
    'last_update': None
}

CACHE_DURATION = timedelta(seconds=10)


async def fetch_binance_prices() -> Dict[str, float]:
    """Fetch live cryptocurrency prices from Binance API"""
    try:
        async with aiohttp.ClientSession() as session:
            # Binance API endpoint for ticker prices
            url = "https://api.binance.com/api/v3/ticker/price"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Build price dictionary (prices in USDT)
                    prices = {}
                    price_map = {item['symbol']: float(item['price']) for item in data}
                    
                    # Get prices for supported cryptos
                    for crypto in SUPPORTED_CRYPTOS:
                        if crypto == 'USDT':
                            prices['USDT'] = 1.0
                        elif crypto == 'USDC':
                            prices['USDC'] = 1.0  # Assume USDC = USDT
                        else:
                            symbol = f"{crypto}USDT"
                            if symbol in price_map:
                                prices[crypto] = price_map[symbol]
                            else:
                                logger.warning(f"Price not found for {crypto}")
                                prices[crypto] = 0.0
                    
                    return prices
                else:
                    logger.error(f"Binance API error: {response.status}")
                    return {}
    except Exception as e:
        logger.error(f"Error fetching Binance prices: {str(e)}")
        return {}


async def fetch_fx_rates() -> Dict[str, float]:
    """Fetch live foreign exchange rates from ExchangeRate-API"""
    try:
        async with aiohttp.ClientSession() as session:
            # ExchangeRate-API endpoint (using USD as base)
            url = "https://api.exchangerate-api.com/v4/latest/USD"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    rates = data.get('rates', {})
                    
                    # Extract supported fiat rates
                    fx_rates = {}
                    for fiat in SUPPORTED_FIATS:
                        if fiat in rates:
                            fx_rates[fiat] = rates[fiat]
                        else:
                            logger.warning(f"FX rate not found for {fiat}")
                            fx_rates[fiat] = 1.0
                    
                    # Add USD as base
                    fx_rates['USD'] = 1.0
                    
                    return fx_rates
                else:
                    logger.error(f"ExchangeRate API error: {response.status}")
                    return {}
    except Exception as e:
        logger.error(f"Error fetching FX rates: {str(e)}")
        return {}


async def update_price_cache():
    """Update the price cache with latest data"""
    crypto_prices = await fetch_binance_prices()
    fx_rates = await fetch_fx_rates()
    
    if crypto_prices and fx_rates:
        price_cache['crypto_prices'] = crypto_prices
        price_cache['fx_rates'] = fx_rates
        price_cache['last_update'] = datetime.utcnow()
        logger.info("Price cache updated successfully")
    else:
        logger.warning("Failed to update price cache")


async def get_cached_prices() -> Dict:
    """Get cached prices, refresh if needed"""
    now = datetime.utcnow()
    
    # Check if cache needs refresh
    if (not price_cache['last_update'] or 
        now - price_cache['last_update'] > CACHE_DURATION):
        await update_price_cache()
    
    return {
        'crypto_prices': price_cache['crypto_prices'],
        'fx_rates': price_cache['fx_rates'],
        'last_update': price_cache['last_update'].isoformat() if price_cache['last_update'] else None
    }


def convert_crypto_to_fiat(crypto: str, crypto_amount: float, fiat: str) -> float:
    """Convert cryptocurrency amount to fiat currency"""
    if not price_cache['crypto_prices'] or not price_cache['fx_rates']:
        return 0.0
    
    # Get crypto price in USD
    crypto_price_usd = price_cache['crypto_prices'].get(crypto, 0.0)
    
    # Convert to USD
    value_usd = crypto_amount * crypto_price_usd
    
    # Convert USD to target fiat
    fx_rate = price_cache['fx_rates'].get(fiat, 1.0)
    value_fiat = value_usd * fx_rate
    
    return value_fiat


def convert_fiat_to_crypto(fiat: str, fiat_amount: float, crypto: str) -> float:
    """Convert fiat currency amount to cryptocurrency"""
    if not price_cache['crypto_prices'] or not price_cache['fx_rates']:
        return 0.0
    
    # Convert fiat to USD
    fx_rate = price_cache['fx_rates'].get(fiat, 1.0)
    value_usd = fiat_amount / fx_rate
    
    # Get crypto price in USD
    crypto_price_usd = price_cache['crypto_prices'].get(crypto, 0.0)
    
    if crypto_price_usd == 0:
        return 0.0
    
    # Convert USD to crypto
    crypto_amount = value_usd / crypto_price_usd
    
    return crypto_amount


def convert_crypto_to_crypto(from_crypto: str, from_amount: float, to_crypto: str) -> float:
    """Convert one cryptocurrency to another"""
    if not price_cache['crypto_prices']:
        return 0.0
    
    from_price_usd = price_cache['crypto_prices'].get(from_crypto, 0.0)
    to_price_usd = price_cache['crypto_prices'].get(to_crypto, 0.0)
    
    if to_price_usd == 0:
        return 0.0
    
    # Convert to USD then to target crypto
    value_usd = from_amount * from_price_usd
    to_amount = value_usd / to_price_usd
    
    return to_amount
