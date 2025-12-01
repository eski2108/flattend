"""
Unified Price Service with Caching and Fallback
Consolidates price_service.py and live_pricing.py
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
import aiohttp

logger = logging.getLogger(__name__)

class UnifiedPriceService:
    def __init__(self):
        self.cache = {}  # {pair: {price, timestamp}}
        self.cache_ttl = 30  # seconds
        self.fallback_ttl = 300  # 5 minutes for stale cache fallback
        
        # API endpoints (in priority order)
        self.apis = [
            {
                'name': 'Binance',
                'url': 'https://api.binance.com/api/v3/ticker/price',
                'parser': self._parse_binance
            },
            {
                'name': 'CoinGecko',
                'url': 'https://api.coingecko.com/api/v3/simple/price',
                'parser': self._parse_coingecko
            }
        ]
        
        # Hardcoded fallback prices (updated manually)
        self.hardcoded_prices = {
            'BTC': 50000,
            'ETH': 2500,
            'USDT': 1,
            'USDC': 1,
            'BNB': 300,
            'SOL': 100,
            'ADA': 0.5,
            'XRP': 0.6,
            'GBP': 1  # Base currency
        }
        
        # Exchange rates for fiat
        self.fiat_rates = {
            'GBP': 1,
            'USD': 1.27,
            'EUR': 1.17
        }
    
    def _is_cache_fresh(self, cached_data: Dict) -> bool:
        """Check if cached data is still fresh"""
        if not cached_data:
            return False
        age = (datetime.now(timezone.utc) - cached_data['timestamp']).total_seconds()
        return age < self.cache_ttl
    
    def _is_cache_usable_as_fallback(self, cached_data: Dict) -> bool:
        """Check if stale cache can be used as fallback"""
        if not cached_data:
            return False
        age = (datetime.now(timezone.utc) - cached_data['timestamp']).total_seconds()
        return age < self.fallback_ttl
    
    async def _parse_binance(self, response: Dict, from_currency: str, to_currency: str) -> Optional[float]:
        """Parse Binance API response"""
        try:
            symbol = f"{from_currency}{to_currency}"
            for item in response:
                if item.get('symbol') == symbol:
                    return float(item.get('price', 0))
            return None
        except Exception as e:
            logger.error(f"Binance parse error: {e}")
            return None
    
    async def _parse_coingecko(self, response: Dict, from_currency: str, to_currency: str) -> Optional[float]:
        """Parse CoinGecko API response"""
        try:
            from_key = from_currency.lower()
            to_key = to_currency.lower()
            
            if from_key in response and to_key in response[from_key]:
                return float(response[from_key][to_key])
            return None
        except Exception as e:
            logger.error(f"CoinGecko parse error: {e}")
            return None
    
    async def _fetch_from_api(self, api_config: Dict, from_currency: str, to_currency: str) -> Optional[float]:
        """Fetch price from a single API"""
        try:
            async with aiohttp.ClientSession() as session:
                if api_config['name'] == 'Binance':
                    url = api_config['url']
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        if response.status == 200:
                            data = await response.json()
                            return await api_config['parser'](data, from_currency, to_currency)
                
                elif api_config['name'] == 'CoinGecko':
                    # CoinGecko format: /simple/price?ids=bitcoin&vs_currencies=usd
                    coin_ids = {
                        'BTC': 'bitcoin',
                        'ETH': 'ethereum',
                        'USDT': 'tether',
                        'BNB': 'binancecoin',
                        'SOL': 'solana',
                        'ADA': 'cardano',
                        'XRP': 'ripple'
                    }
                    
                    from_id = coin_ids.get(from_currency.upper())
                    to_curr = to_currency.lower()
                    
                    if from_id:
                        url = f"{api_config['url']}?ids={from_id}&vs_currencies={to_curr}"
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                            if response.status == 200:
                                data = await response.json()
                                if from_id in data and to_curr in data[from_id]:
                                    return float(data[from_id][to_curr])
                
                return None
        
        except asyncio.TimeoutError:
            logger.warning(f"{api_config['name']} API timeout")
            return None
        except Exception as e:
            logger.error(f"{api_config['name']} API error: {e}")
            return None
    
    async def get_price(self, from_currency: str, to_currency: str = 'GBP') -> float:
        """
        Get price with caching and fallback
        
        Priority:
        1. Fresh cache (< 30 seconds)
        2. Live APIs (Binance, CoinGecko)
        3. Stale cache (< 5 minutes)
        4. Hardcoded fallback prices
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        # Same currency = 1
        if from_currency == to_currency:
            return 1.0
        
        cache_key = f"{from_currency}_{to_currency}"
        
        # 1. Check fresh cache
        cached = self.cache.get(cache_key)
        if self._is_cache_fresh(cached):
            logger.info(f"✅ Cache HIT (fresh): {cache_key} = {cached['price']}")
            return cached['price']
        
        # 2. Try live APIs
        for api_config in self.apis:
            try:
                price = await self._fetch_from_api(api_config, from_currency, to_currency)
                if price and price > 0:
                    # Cache the result
                    self.cache[cache_key] = {
                        'price': price,
                        'timestamp': datetime.now(timezone.utc),
                        'source': api_config['name']
                    }
                    logger.info(f"✅ {api_config['name']} API: {cache_key} = {price}")
                    return price
            except Exception as e:
                logger.warning(f"⚠️ {api_config['name']} failed: {e}")
                continue
        
        # 3. Try stale cache as fallback
        if cached and self._is_cache_usable_as_fallback(cached):
            logger.warning(f"⚠️ Using STALE cache: {cache_key} = {cached['price']} (age: {(datetime.now(timezone.utc) - cached['timestamp']).total_seconds():.0f}s)")
            return cached['price']
        
        # 4. Use hardcoded fallback
        if from_currency in self.hardcoded_prices:
            if to_currency == 'GBP':
                price = self.hardcoded_prices[from_currency]
            elif to_currency in self.hardcoded_prices:
                # Convert via GBP: from -> GBP -> to
                from_to_gbp = self.hardcoded_prices[from_currency]
                to_to_gbp = self.hardcoded_prices[to_currency]
                price = from_to_gbp / to_to_gbp
            elif to_currency in self.fiat_rates:
                # Fiat conversion
                from_to_gbp = self.hardcoded_prices[from_currency]
                price = from_to_gbp * self.fiat_rates[to_currency]
            else:
                raise ValueError(f"Cannot convert {from_currency} to {to_currency}")
            
            logger.warning(f"⚠️ Using HARDCODED fallback: {cache_key} = {price}")
            
            # Cache hardcoded price
            self.cache[cache_key] = {
                'price': price,
                'timestamp': datetime.now(timezone.utc),
                'source': 'hardcoded'
            }
            return price
        
        # All methods failed
        raise Exception(f"Failed to get price for {from_currency}/{to_currency} - all sources failed")
    
    async def convert(self, from_currency: str, amount: float, to_currency: str) -> float:
        """Convert amount from one currency to another"""
        price = await self.get_price(from_currency, to_currency)
        return amount * price
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        now = datetime.now(timezone.utc)
        fresh = 0
        stale = 0
        expired = 0
        
        for key, data in self.cache.items():
            age = (now - data['timestamp']).total_seconds()
            if age < self.cache_ttl:
                fresh += 1
            elif age < self.fallback_ttl:
                stale += 1
            else:
                expired += 1
        
        return {
            'total_cached': len(self.cache),
            'fresh': fresh,
            'stale': stale,
            'expired': expired,
            'cache_ttl': self.cache_ttl,
            'fallback_ttl': self.fallback_ttl
        }

# Singleton instance
_unified_price_service = None

def get_unified_price_service() -> UnifiedPriceService:
    """Get singleton instance"""
    global _unified_price_service
    if _unified_price_service is None:
        _unified_price_service = UnifiedPriceService()
    return _unified_price_service
