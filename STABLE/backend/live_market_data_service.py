"""
Live Market Data Service
Provides real-time price updates, market depth, and trading activity
"""

import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List
import aiohttp
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class LiveMarketDataService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.price_cache = {}
        self.last_update = {}
        self.update_interval = 10  # seconds
        
    async def get_live_prices(self, symbols: List[str]) -> Dict:
        """
        Get live prices for multiple symbols with fallback providers
        
        Args:
            symbols: List of crypto symbols (e.g., ['BTC', 'ETH', 'USDT'])
            
        Returns:
            Dict with symbol prices and 24h changes
        """
        try:
            # Try CoinGecko first
            prices = await self._fetch_coingecko_prices(symbols)
            if prices:
                return prices
            
            # Fallback to CoinCap
            prices = await self._fetch_coincap_prices(symbols)
            if prices:
                return prices
            
            # Fallback to cached prices
            logger.warning("Using cached prices - API providers unavailable")
            return self._get_cached_prices(symbols)
            
        except Exception as e:
            logger.error(f"Error fetching live prices: {str(e)}")
            return self._get_cached_prices(symbols)
    
    async def _fetch_coingecko_prices(self, symbols: List[str]) -> Dict:
        """Fetch prices from CoinGecko API"""
        try:
            # Map symbols to CoinGecko IDs
            coin_map = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'USDT': 'tether',
                'BNB': 'binancecoin',
                'SOL': 'solana',
                'XRP': 'ripple',
                'ADA': 'cardano',
                'DOGE': 'dogecoin',
                'TRX': 'tron',
                'MATIC': 'matic-network',
                'LTC': 'litecoin',
                'BCH': 'bitcoin-cash',
                'LINK': 'chainlink',
                'UNI': 'uniswap',
                'AVAX': 'avalanche-2',
                'ATOM': 'cosmos',
                'XLM': 'stellar',
                'ALGO': 'algorand',
                'VET': 'vechain',
                'FIL': 'filecoin'
            }
            
            coin_ids = ','.join([coin_map.get(s, s.lower()) for s in symbols if s in coin_map])
            
            async with aiohttp.ClientSession() as session:
                url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids}&vs_currencies=gbp,usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true"
                
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        prices = {}
                        for symbol, coin_id in coin_map.items():
                            if symbol in symbols and coin_id in data:
                                coin_data = data[coin_id]
                                prices[symbol] = {
                                    'price_gbp': coin_data.get('gbp', 0),
                                    'price_usd': coin_data.get('usd', 0),
                                    'change_24h': coin_data.get('gbp_24h_change', 0),
                                    'volume_24h': coin_data.get('gbp_24h_vol', 0),
                                    'last_updated': coin_data.get('last_updated_at', int(datetime.now(timezone.utc).timestamp())),
                                    'source': 'coingecko'
                                }
                                
                                # Update cache
                                self.price_cache[symbol] = prices[symbol]
                                self.last_update[symbol] = datetime.now(timezone.utc)
                        
                        logger.info(f"✅ Fetched prices for {len(prices)} coins from CoinGecko")
                        return prices
                    else:
                        logger.warning(f"CoinGecko API returned status {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"CoinGecko API error: {str(e)}")
            return None
    
    async def _fetch_coincap_prices(self, symbols: List[str]) -> Dict:
        """Fetch prices from CoinCap API as fallback"""
        try:
            async with aiohttp.ClientSession() as session:
                prices = {}
                
                for symbol in symbols:
                    url = f"https://api.coincap.io/v2/assets/{symbol.lower()}"
                    
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        if response.status == 200:
                            data = await response.json()
                            asset = data.get('data', {})
                            
                            price_usd = float(asset.get('priceUsd', 0))
                            # Rough conversion to GBP (USD * 0.75)
                            price_gbp = price_usd * 0.75
                            
                            prices[symbol] = {
                                'price_gbp': price_gbp,
                                'price_usd': price_usd,
                                'change_24h': float(asset.get('changePercent24Hr', 0)),
                                'volume_24h': float(asset.get('volumeUsd24Hr', 0)) * 0.75,
                                'last_updated': int(datetime.now(timezone.utc).timestamp()),
                                'source': 'coincap'
                            }
                            
                            # Update cache
                            self.price_cache[symbol] = prices[symbol]
                            self.last_update[symbol] = datetime.now(timezone.utc)
                
                if prices:
                    logger.info(f"✅ Fetched prices for {len(prices)} coins from CoinCap")
                    return prices
                else:
                    return None
                    
        except Exception as e:
            logger.error(f"CoinCap API error: {str(e)}")
            return None
    
    def _get_cached_prices(self, symbols: List[str]) -> Dict:
        """Get cached prices when APIs are unavailable"""
        cached = {}
        for symbol in symbols:
            if symbol in self.price_cache:
                cached[symbol] = self.price_cache[symbol]
        return cached
    
    async def get_market_depth(self, symbol: str) -> Dict:
        """
        Get market depth (order book) for a symbol
        
        Returns:
            Dict with bids and asks
        """
        try:
            # Get P2P orders from database to simulate order book
            buy_orders = await self.db.enhanced_sell_orders.find({
                'crypto_currency': symbol,
                'status': 'active'
            }).sort('price_per_unit', 1).limit(10).to_list(10)
            
            # Format as market depth
            depth = {
                'symbol': symbol,
                'asks': [],
                'bids': [],
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            for order in buy_orders:
                depth['asks'].append({
                    'price': order['price_per_unit'],
                    'amount': order['crypto_amount'],
                    'total': order['price_per_unit'] * order['crypto_amount']
                })
            
            return depth
            
        except Exception as e:
            logger.error(f"Error fetching market depth: {str(e)}")
            return {'symbol': symbol, 'asks': [], 'bids': [], 'timestamp': datetime.now(timezone.utc).isoformat()}
    
    async def get_recent_trades(self, symbol: str, limit: int = 20) -> List[Dict]:
        """
        Get recent completed trades for a symbol
        
        Args:
            symbol: Crypto symbol
            limit: Number of trades to return
            
        Returns:
            List of recent trades
        """
        try:
            trades = await self.db.p2p_trades.find({
                'crypto_currency': symbol,
                'status': 'completed'
            }).sort('completed_at', -1).limit(limit).to_list(limit)
            
            formatted_trades = []
            for trade in trades:
                formatted_trades.append({
                    'trade_id': trade['trade_id'],
                    'price': trade['price_per_unit'],
                    'amount': trade['crypto_amount'],
                    'total': trade['fiat_amount'],
                    'timestamp': trade.get('completed_at', trade['created_at']),
                    'type': 'sell'  # From seller's perspective
                })
            
            return formatted_trades
            
        except Exception as e:
            logger.error(f"Error fetching recent trades: {str(e)}")
            return []
    
    async def get_24h_stats(self, symbol: str) -> Dict:
        """
        Get 24-hour statistics for a symbol
        
        Returns:
            Dict with volume, high, low, change
        """
        try:
            from datetime import timedelta
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            
            # Aggregate trades from last 24h
            pipeline = [
                {
                    '$match': {
                        'crypto_currency': symbol,
                        'status': 'completed',
                        'completed_at': {'$gte': yesterday.isoformat()}
                    }
                },
                {
                    '$group': {
                        '_id': None,
                        'volume': {'$sum': '$crypto_amount'},
                        'high': {'$max': '$price_per_unit'},
                        'low': {'$min': '$price_per_unit'},
                        'trades_count': {'$sum': 1}
                    }
                }
            ]
            
            result = await self.db.p2p_trades.aggregate(pipeline).to_list(1)
            
            if result:
                stats = result[0]
                return {
                    'symbol': symbol,
                    'volume_24h': stats['volume'],
                    'high_24h': stats['high'],
                    'low_24h': stats['low'],
                    'trades_count': stats['trades_count'],
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            else:
                return {
                    'symbol': symbol,
                    'volume_24h': 0,
                    'high_24h': 0,
                    'low_24h': 0,
                    'trades_count': 0,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error fetching 24h stats: {str(e)}")
            return {
                'symbol': symbol,
                'volume_24h': 0,
                'high_24h': 0,
                'low_24h': 0,
                'trades_count': 0,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    async def start_price_updater(self):
        """
        Background task to continuously update prices
        """
        logger.info("🚀 Live market data updater started")
        
        while True:
            try:
                # Get all active coins
                active_coins = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'MATIC',
                               'LTC', 'BCH', 'LINK', 'UNI', 'AVAX', 'ATOM', 'XLM', 'ALGO', 'VET', 'FIL']
                
                # Fetch prices
                prices = await self.get_live_prices(active_coins)
                
                if prices:
                    # Store in database for historical tracking
                    for symbol, data in prices.items():
                        await self.db.price_history.insert_one({
                            'symbol': symbol,
                            'price_gbp': data['price_gbp'],
                            'price_usd': data['price_usd'],
                            'change_24h': data['change_24h'],
                            'volume_24h': data['volume_24h'],
                            'timestamp': datetime.now(timezone.utc),
                            'source': data['source']
                        })
                    
                    logger.info(f"✅ Updated prices for {len(prices)} coins")
                
                # Wait before next update
                await asyncio.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"Error in price updater: {str(e)}")
                await asyncio.sleep(30)  # Wait longer on error

# Global instance
live_market_service = None

def get_live_market_service(db: AsyncIOMotorDatabase):
    """Get or create live market data service instance"""
    global live_market_service
    if live_market_service is None:
        live_market_service = LiveMarketDataService(db)
    return live_market_service
