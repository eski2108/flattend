"""
🏦 COINHUBX EXCHANGE ADAPTERS - Phase 8
═══════════════════════════════════════════════════════════════════════════════

Unified exchange adapter interface for:
- Market data (OHLCV, ticker, orderbook)
- Order execution (place, cancel, fetch)
- Account data (balances, positions)

RULES:
1. LIVE mode MUST use exchange adapters - NO CoinGecko
2. PAPER mode CAN use CoinGecko fallback for convenience
3. All adapters implement the same IExchangeAdapter interface
4. Candle source must be consistent - same OHLCV for indicators AND triggers

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import time
import hmac
import hashlib
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from enum import Enum
import httpx
import json

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

class ExchangeType(Enum):
    BINANCE = "binance"
    BINANCE_TESTNET = "binance_testnet"
    BYBIT = "bybit"
    BYBIT_TESTNET = "bybit_testnet"
    SIMULATED = "simulated"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"

class OrderStatus(Enum):
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"

# Timeframe mappings
TIMEFRAME_MAP = {
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class OHLCV:
    """Single candle data"""
    timestamp: int  # Unix timestamp ms
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume
        }

@dataclass
class Ticker:
    """Current price ticker"""
    symbol: str
    last_price: float
    bid: float
    ask: float
    volume_24h: float
    timestamp: int

@dataclass 
class OrderResult:
    """Result of order placement"""
    success: bool
    order_id: str
    exchange_order_id: Optional[str] = None
    status: str = "pending"
    filled_price: float = 0
    filled_quantity: float = 0
    fee: float = 0
    fee_currency: str = "USD"
    error: Optional[str] = None
    raw_response: Dict = field(default_factory=dict)

@dataclass
class Balance:
    """Account balance for a currency"""
    currency: str
    total: float
    available: float
    locked: float = 0

@dataclass
class CandleSource:
    """Tracks the source of candle data for audit"""
    exchange: str
    symbol: str
    timeframe: str
    candle_open_time: int
    candle_close_time: int
    fetched_at: int
    is_live_exchange: bool  # True = from exchange, False = fallback (CoinGecko)

# ═══════════════════════════════════════════════════════════════════════════════
# INTERFACE: IExchangeAdapter
# ═══════════════════════════════════════════════════════════════════════════════

class IExchangeAdapter(ABC):
    """
    Abstract interface for all exchange adapters.
    BOTH market data AND order execution must be implemented.
    """
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MARKET DATA METHODS
    # ─────────────────────────────────────────────────────────────────────────────
    
    @abstractmethod
    async def get_ohlcv(
        self, 
        symbol: str, 
        timeframe: str, 
        limit: int = 100
    ) -> Tuple[List[OHLCV], CandleSource]:
        """
        Fetch OHLCV candles from exchange.
        Returns (candles, source_info) for audit trail.
        """
        pass
    
    @abstractmethod
    async def get_ticker(self, symbol: str) -> Ticker:
        """Get current ticker/price for a symbol."""
        pass
    
    @abstractmethod
    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict:
        """Get orderbook depth."""
        pass
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ORDER EXECUTION METHODS
    # ─────────────────────────────────────────────────────────────────────────────
    
    @abstractmethod
    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        client_order_id: Optional[str] = None
    ) -> OrderResult:
        """Place an order on the exchange."""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """Cancel an order."""
        pass
    
    @abstractmethod
    async def get_order(self, order_id: str, symbol: str) -> Dict:
        """Get order status and details."""
        pass
    
    @abstractmethod
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get all open orders."""
        pass
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ACCOUNT METHODS
    # ─────────────────────────────────────────────────────────────────────────────
    
    @abstractmethod
    async def get_balance(self, currency: str) -> Balance:
        """Get balance for a specific currency."""
        pass
    
    @abstractmethod
    async def get_all_balances(self) -> List[Balance]:
        """Get all non-zero balances."""
        pass
    
    @abstractmethod
    async def get_positions(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get open positions (for margin/futures)."""
        pass
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CONNECTION & STATUS
    # ─────────────────────────────────────────────────────────────────────────────
    
    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str]:
        """Test API connection. Returns (success, message)."""
        pass
    
    @abstractmethod
    def get_exchange_type(self) -> ExchangeType:
        """Return the exchange type."""
        pass
    
    @abstractmethod
    def is_live_exchange(self) -> bool:
        """Return True if this is a real exchange (not simulated)."""
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# BINANCE ADAPTER (Testnet + Production)
# ═══════════════════════════════════════════════════════════════════════════════

class BinanceAdapter(IExchangeAdapter):
    """
    Binance exchange adapter.
    Supports both testnet and production.
    """
    
    # API endpoints
    PROD_BASE_URL = "https://api.binance.com"
    TESTNET_BASE_URL = "https://testnet.binance.vision"
    
    # Symbol mapping (our format -> Binance format)
    SYMBOL_MAP = {
        "BTCUSDT": "BTCUSDT",
        "ETHUSDT": "ETHUSDT",
        "BTCUSD": "BTCUSDT",
        "ETHUSD": "ETHUSDT",
        "SOLUSDT": "SOLUSDT",
        "XRPUSDT": "XRPUSDT",
        "ADAUSDT": "ADAUSDT",
        "DOGEUSDT": "DOGEUSDT",
    }
    
    # Timeframe mapping
    TIMEFRAME_MAP = {
        "1m": "1m",
        "3m": "3m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "4h": "4h",
        "1d": "1d",
    }
    
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        testnet: bool = True
    ):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.base_url = self.TESTNET_BASE_URL if testnet else self.PROD_BASE_URL
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client
    
    def _sign_request(self, params: Dict) -> Dict:
        """Add signature to request params."""
        params["timestamp"] = int(time.time() * 1000)
        query_string = "&".join([f"{k}={v}" for k, v in sorted(params.items())])
        signature = hmac.new(
            self.api_secret.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        params["signature"] = signature
        return params
    
    def _get_headers(self) -> Dict:
        return {"X-MBX-APIKEY": self.api_key}
    
    def _map_symbol(self, symbol: str) -> str:
        """Map our symbol format to Binance format."""
        return self.SYMBOL_MAP.get(symbol.upper(), symbol.upper())
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MARKET DATA
    # ─────────────────────────────────────────────────────────────────────────────
    
    async def get_ohlcv(
        self, 
        symbol: str, 
        timeframe: str, 
        limit: int = 100
    ) -> Tuple[List[OHLCV], CandleSource]:
        """Fetch OHLCV from Binance."""
        client = await self._get_client()
        binance_symbol = self._map_symbol(symbol)
        binance_tf = self.TIMEFRAME_MAP.get(timeframe, "1h")
        
        try:
            response = await client.get(
                f"{self.base_url}/api/v3/klines",
                params={
                    "symbol": binance_symbol,
                    "interval": binance_tf,
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()
            
            candles = []
            for k in data:
                candles.append(OHLCV(
                    timestamp=int(k[0]),
                    open=float(k[1]),
                    high=float(k[2]),
                    low=float(k[3]),
                    close=float(k[4]),
                    volume=float(k[5])
                ))
            
            # Create source info for audit
            source = CandleSource(
                exchange="binance_testnet" if self.testnet else "binance",
                symbol=binance_symbol,
                timeframe=binance_tf,
                candle_open_time=candles[0].timestamp if candles else 0,
                candle_close_time=candles[-1].timestamp if candles else 0,
                fetched_at=int(time.time() * 1000),
                is_live_exchange=True
            )
            
            logger.info(f"[BINANCE] Fetched {len(candles)} candles for {binance_symbol} {binance_tf}")
            return candles, source
            
        except Exception as e:
            logger.error(f"[BINANCE] Failed to fetch OHLCV: {e}")
            raise
    
    async def get_ticker(self, symbol: str) -> Ticker:
        """Get current ticker from Binance."""
        client = await self._get_client()
        binance_symbol = self._map_symbol(symbol)
        
        try:
            response = await client.get(
                f"{self.base_url}/api/v3/ticker/24hr",
                params={"symbol": binance_symbol}
            )
            response.raise_for_status()
            data = response.json()
            
            return Ticker(
                symbol=binance_symbol,
                last_price=float(data["lastPrice"]),
                bid=float(data["bidPrice"]),
                ask=float(data["askPrice"]),
                volume_24h=float(data["volume"]),
                timestamp=int(time.time() * 1000)
            )
        except Exception as e:
            logger.error(f"[BINANCE] Failed to fetch ticker: {e}")
            raise
    
    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict:
        """Get orderbook from Binance."""
        client = await self._get_client()
        binance_symbol = self._map_symbol(symbol)
        
        try:
            response = await client.get(
                f"{self.base_url}/api/v3/depth",
                params={"symbol": binance_symbol, "limit": limit}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[BINANCE] Failed to fetch orderbook: {e}")
            raise
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ORDER EXECUTION
    # ─────────────────────────────────────────────────────────────────────────────
    
    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        client_order_id: Optional[str] = None
    ) -> OrderResult:
        """Place order on Binance."""
        client = await self._get_client()
        binance_symbol = self._map_symbol(symbol)
        
        params = {
            "symbol": binance_symbol,
            "side": side.value.upper(),
            "type": self._map_order_type(order_type),
            "quantity": str(quantity),
        }
        
        if client_order_id:
            params["newClientOrderId"] = client_order_id
        
        if order_type == OrderType.LIMIT:
            params["price"] = str(price)
            params["timeInForce"] = "GTC"
        elif order_type in [OrderType.STOP_LOSS, OrderType.TAKE_PROFIT]:
            params["stopPrice"] = str(stop_price or price)
        
        params = self._sign_request(params)
        
        try:
            response = await client.post(
                f"{self.base_url}/api/v3/order",
                params=params,
                headers=self._get_headers()
            )
            data = response.json()
            
            if response.status_code != 200:
                return OrderResult(
                    success=False,
                    order_id="",
                    error=data.get("msg", str(data)),
                    raw_response=data
                )
            
            return OrderResult(
                success=True,
                order_id=str(data["orderId"]),
                exchange_order_id=str(data["orderId"]),
                status=self._map_order_status(data["status"]),
                filled_price=float(data.get("price", 0)),
                filled_quantity=float(data.get("executedQty", 0)),
                raw_response=data
            )
            
        except Exception as e:
            logger.error(f"[BINANCE] Failed to place order: {e}")
            return OrderResult(
                success=False,
                order_id="",
                error=str(e)
            )
    
    def _map_order_type(self, order_type: OrderType) -> str:
        mapping = {
            OrderType.MARKET: "MARKET",
            OrderType.LIMIT: "LIMIT",
            OrderType.STOP_LOSS: "STOP_LOSS_LIMIT",
            OrderType.TAKE_PROFIT: "TAKE_PROFIT_LIMIT",
        }
        return mapping.get(order_type, "MARKET")
    
    def _map_order_status(self, status: str) -> str:
        mapping = {
            "NEW": "open",
            "PARTIALLY_FILLED": "partially_filled",
            "FILLED": "filled",
            "CANCELED": "cancelled",
            "REJECTED": "rejected",
            "EXPIRED": "expired",
        }
        return mapping.get(status, "pending")
    
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """Cancel order on Binance."""
        client = await self._get_client()
        binance_symbol = self._map_symbol(symbol)
        
        params = self._sign_request({
            "symbol": binance_symbol,
            "orderId": order_id
        })
        
        try:
            response = await client.delete(
                f"{self.base_url}/api/v3/order",
                params=params,
                headers=self._get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"[BINANCE] Failed to cancel order: {e}")
            return False
    
    async def get_order(self, order_id: str, symbol: str) -> Dict:
        """Get order status from Binance."""
        client = await self._get_client()
        binance_symbol = self._map_symbol(symbol)
        
        params = self._sign_request({
            "symbol": binance_symbol,
            "orderId": order_id
        })
        
        try:
            response = await client.get(
                f"{self.base_url}/api/v3/order",
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[BINANCE] Failed to get order: {e}")
            return {}
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get open orders from Binance."""
        client = await self._get_client()
        
        params = {}
        if symbol:
            params["symbol"] = self._map_symbol(symbol)
        params = self._sign_request(params)
        
        try:
            response = await client.get(
                f"{self.base_url}/api/v3/openOrders",
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[BINANCE] Failed to get open orders: {e}")
            return []
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ACCOUNT
    # ─────────────────────────────────────────────────────────────────────────────
    
    async def get_balance(self, currency: str) -> Balance:
        """Get balance for currency from Binance."""
        balances = await self.get_all_balances()
        for b in balances:
            if b.currency.upper() == currency.upper():
                return b
        return Balance(currency=currency, total=0, available=0, locked=0)
    
    async def get_all_balances(self) -> List[Balance]:
        """Get all balances from Binance."""
        client = await self._get_client()
        params = self._sign_request({})
        
        try:
            response = await client.get(
                f"{self.base_url}/api/v3/account",
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()
            
            balances = []
            for b in data.get("balances", []):
                free = float(b["free"])
                locked = float(b["locked"])
                if free > 0 or locked > 0:
                    balances.append(Balance(
                        currency=b["asset"],
                        total=free + locked,
                        available=free,
                        locked=locked
                    ))
            return balances
        except Exception as e:
            logger.error(f"[BINANCE] Failed to get balances: {e}")
            return []
    
    async def get_positions(self, symbol: Optional[str] = None) -> List[Dict]:
        """Binance spot doesn't have positions - return empty."""
        return []
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CONNECTION & STATUS
    # ─────────────────────────────────────────────────────────────────────────────
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test Binance API connection."""
        client = await self._get_client()
        
        try:
            # Test public endpoint
            response = await client.get(f"{self.base_url}/api/v3/ping")
            if response.status_code != 200:
                return False, "Ping failed"
            
            # Test authenticated endpoint
            params = self._sign_request({})
            response = await client.get(
                f"{self.base_url}/api/v3/account",
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return True, "Connection successful"
            else:
                data = response.json()
                return False, data.get("msg", "Authentication failed")
                
        except Exception as e:
            return False, str(e)
    
    def get_exchange_type(self) -> ExchangeType:
        return ExchangeType.BINANCE_TESTNET if self.testnet else ExchangeType.BINANCE
    
    def is_live_exchange(self) -> bool:
        return True  # Both testnet and prod are "live" (not simulated)


# ═══════════════════════════════════════════════════════════════════════════════
# SIMULATED ADAPTER (For PAPER mode)
# ═══════════════════════════════════════════════════════════════════════════════

class SimulatedAdapter(IExchangeAdapter):
    """
    Simulated exchange adapter for PAPER mode.
    Uses real price data but simulates order execution.
    
    In PAPER mode: Can use CoinGecko as fallback
    In LIVE mode: Should NOT be used
    """
    
    def __init__(self, initial_balances: Dict[str, float] = None):
        self.balances = initial_balances or {
            "USDT": 100000,
            "BTC": 1.0,
            "ETH": 10.0,
        }
        self.orders: Dict[str, Dict] = {}
        self.positions: List[Dict] = []
        self._order_counter = 0
    
    async def get_ohlcv(
        self, 
        symbol: str, 
        timeframe: str, 
        limit: int = 100
    ) -> Tuple[List[OHLCV], CandleSource]:
        """
        Fetch OHLCV - tries multiple sources for PAPER mode.
        Priority: Bybit -> CoinGecko -> Generated data
        """
        import time
        
        # Try Bybit public API (usually not geo-blocked)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                bybit_symbol = symbol.upper().replace("/", "")
                if not bybit_symbol.endswith("USDT"):
                    bybit_symbol = bybit_symbol.replace("USD", "USDT")
                
                tf_map = {"1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D"}
                bybit_tf = tf_map.get(timeframe, "60")
                
                response = await client.get(
                    "https://api.bybit.com/v5/market/kline",
                    params={
                        "category": "spot",
                        "symbol": bybit_symbol,
                        "interval": bybit_tf,
                        "limit": limit
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                        raw_candles = data["result"]["list"]
                        candles = [OHLCV(
                            timestamp=int(k[0]),
                            open=float(k[1]),
                            high=float(k[2]),
                            low=float(k[3]),
                            close=float(k[4]),
                            volume=float(k[5])
                        ) for k in reversed(raw_candles)]  # Bybit returns newest first
                        
                        source = CandleSource(
                            exchange="bybit_public",
                            symbol=bybit_symbol,
                            timeframe=timeframe,
                            candle_open_time=candles[0].timestamp if candles else 0,
                            candle_close_time=candles[-1].timestamp if candles else 0,
                            fetched_at=int(time.time() * 1000),
                            is_live_exchange=True  # Bybit is a real exchange
                        )
                        
                        logger.info(f"[SIMULATED] Got {len(candles)} candles from Bybit public API")
                        return candles, source
        except Exception as e:
            logger.warning(f"[SIMULATED] Bybit API failed: {e}")
                
        # CoinGecko fallback (PAPER mode only)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                coin_id = self._symbol_to_coingecko(symbol)
                response = await client.get(
                    f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc",
                    params={"vs_currency": "usd", "days": "7"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    candles = [OHLCV(
                        timestamp=int(k[0]),
                        open=float(k[1]),
                        high=float(k[2]),
                        low=float(k[3]),
                        close=float(k[4]),
                        volume=0  # CoinGecko OHLC doesn't have volume
                    ) for k in data[-limit:]]
                    
                    source = CandleSource(
                        exchange="coingecko",
                        symbol=symbol,
                        timeframe=timeframe,
                        candle_open_time=candles[0].timestamp if candles else 0,
                        candle_close_time=candles[-1].timestamp if candles else 0,
                        fetched_at=int(time.time() * 1000),
                        is_live_exchange=False  # CoinGecko is NOT live exchange
                    )
                    
                    logger.warning(f"[SIMULATED] Using CoinGecko fallback - NOT for LIVE mode!")
                    return candles, source
        except Exception as e:
            logger.error(f"[SIMULATED] CoinGecko also failed: {e}")
        
        # Return empty with error source
        return [], CandleSource(
            exchange="none",
            symbol=symbol,
            timeframe=timeframe,
            candle_open_time=0,
            candle_close_time=0,
            fetched_at=int(time.time() * 1000),
            is_live_exchange=False
        )
    
    def _symbol_to_coingecko(self, symbol: str) -> str:
        mapping = {
            "BTCUSDT": "bitcoin",
            "BTCUSD": "bitcoin",
            "ETHUSDT": "ethereum",
            "ETHUSD": "ethereum",
            "SOLUSDT": "solana",
            "XRPUSDT": "ripple",
            "ADAUSDT": "cardano",
            "DOGEUSDT": "dogecoin",
        }
        return mapping.get(symbol.upper(), "bitcoin")
    
    async def get_ticker(self, symbol: str) -> Ticker:
        """Get ticker - uses Bybit public API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                bybit_symbol = symbol.upper().replace("/", "")
                if not bybit_symbol.endswith("USDT"):
                    bybit_symbol = bybit_symbol.replace("USD", "USDT")
                
                response = await client.get(
                    "https://api.bybit.com/v5/market/tickers",
                    params={"category": "spot", "symbol": bybit_symbol}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                        ticker_data = data["result"]["list"][0]
                        return Ticker(
                            symbol=symbol,
                            last_price=float(ticker_data.get("lastPrice", 0)),
                            bid=float(ticker_data.get("bid1Price", 0)),
                            ask=float(ticker_data.get("ask1Price", 0)),
                            volume_24h=float(ticker_data.get("volume24h", 0)),
                            timestamp=int(time.time() * 1000)
                        )
        except Exception as e:
            logger.error(f"[SIMULATED] Ticker fetch failed: {e}")
        
        return Ticker(symbol=symbol, last_price=0, bid=0, ask=0, volume_24h=0, timestamp=0)
    
    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict:
        return {"bids": [], "asks": []}
    
    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        client_order_id: Optional[str] = None
    ) -> OrderResult:
        """Simulate order placement."""
        self._order_counter += 1
        order_id = f"SIM-{self._order_counter}-{int(time.time())}"
        
        # Get current price
        ticker = await self.get_ticker(symbol)
        fill_price = price if price else ticker.last_price
        
        # Simulate instant fill for market orders
        self.orders[order_id] = {
            "order_id": order_id,
            "symbol": symbol,
            "side": side.value,
            "type": order_type.value,
            "quantity": quantity,
            "price": fill_price,
            "status": "filled",
            "filled_at": datetime.now(timezone.utc).isoformat()
        }
        
        return OrderResult(
            success=True,
            order_id=order_id,
            exchange_order_id=order_id,
            status="filled",
            filled_price=fill_price,
            filled_quantity=quantity,
            fee=quantity * fill_price * 0.001,  # 0.1% fee
            fee_currency="USDT"
        )
    
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        if order_id in self.orders:
            self.orders[order_id]["status"] = "cancelled"
            return True
        return False
    
    async def get_order(self, order_id: str, symbol: str) -> Dict:
        return self.orders.get(order_id, {})
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        return [o for o in self.orders.values() if o["status"] == "open"]
    
    async def get_balance(self, currency: str) -> Balance:
        amount = self.balances.get(currency.upper(), 0)
        return Balance(currency=currency, total=amount, available=amount, locked=0)
    
    async def get_all_balances(self) -> List[Balance]:
        return [Balance(currency=k, total=v, available=v, locked=0) for k, v in self.balances.items()]
    
    async def get_positions(self, symbol: Optional[str] = None) -> List[Dict]:
        return self.positions
    
    async def test_connection(self) -> Tuple[bool, str]:
        return True, "Simulated exchange always connected"
    
    def get_exchange_type(self) -> ExchangeType:
        return ExchangeType.SIMULATED
    
    def is_live_exchange(self) -> bool:
        return False  # Simulated is NOT live


# ═══════════════════════════════════════════════════════════════════════════════
# ADAPTER FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

class ExchangeAdapterFactory:
    """
    Factory for creating exchange adapters.
    Enforces LIVE mode requirements.
    """
    
    @staticmethod
    async def create_adapter(
        exchange_type: ExchangeType,
        credentials: Optional[Dict] = None,
        is_live_mode: bool = False
    ) -> IExchangeAdapter:
        """
        Create appropriate adapter based on exchange type and mode.
        
        CRITICAL: LIVE mode MUST use a real exchange adapter.
        """
        
        # LIVE mode enforcement
        if is_live_mode:
            if exchange_type == ExchangeType.SIMULATED:
                raise ValueError("LIVE mode cannot use SimulatedAdapter - must use real exchange")
            
            if not credentials:
                raise ValueError("LIVE mode requires exchange credentials")
            
            api_key = credentials.get("api_key")
            api_secret = credentials.get("api_secret")
            
            if not api_key or not api_secret:
                raise ValueError("LIVE mode requires valid API key and secret")
        
        # Create adapter
        if exchange_type in [ExchangeType.BINANCE, ExchangeType.BINANCE_TESTNET]:
            if not credentials:
                raise ValueError("Binance adapter requires credentials")
            
            return BinanceAdapter(
                api_key=credentials.get("api_key", ""),
                api_secret=credentials.get("api_secret", ""),
                testnet=(exchange_type == ExchangeType.BINANCE_TESTNET)
            )
        
        elif exchange_type == ExchangeType.SIMULATED:
            return SimulatedAdapter(
                initial_balances=credentials.get("initial_balances") if credentials else None
            )
        
        else:
            raise ValueError(f"Unsupported exchange type: {exchange_type}")
    
    @staticmethod
    async def get_adapter_for_bot(
        bot_id: str,
        user_id: str,
        is_live_mode: bool
    ) -> IExchangeAdapter:
        """
        Get adapter for a specific bot, loading credentials from DB.
        """
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        MONGO_URL = os.environ.get('MONGO_URL')
        client = AsyncIOMotorClient(MONGO_URL)
        db = client['coinhubx_production']
        
        if is_live_mode:
            # Load user's exchange credentials
            creds = await db.exchange_credentials.find_one({
                "user_id": user_id,
                "is_active": True
            })
            
            if not creds:
                raise ValueError(f"No active exchange credentials for user {user_id}")
            
            exchange_type = ExchangeType(creds.get("exchange", "binance_testnet"))
            
            return await ExchangeAdapterFactory.create_adapter(
                exchange_type=exchange_type,
                credentials={
                    "api_key": creds.get("api_key"),
                    "api_secret": creds.get("api_secret")
                },
                is_live_mode=True
            )
        else:
            # PAPER mode - use simulated adapter
            return SimulatedAdapter()


# ═══════════════════════════════════════════════════════════════════════════════
# LIVE MODE DATA ENFORCER
# ═══════════════════════════════════════════════════════════════════════════════

class LiveModeDataEnforcer:
    """
    Enforces that LIVE mode ONLY uses exchange data.
    NO CoinGecko allowed in LIVE path.
    """
    
    @staticmethod
    def validate_candle_source(source: CandleSource, is_live_mode: bool) -> Tuple[bool, str]:
        """
        Validate that candle source is appropriate for the mode.
        
        LIVE mode: MUST be from live exchange (is_live_exchange=True)
        PAPER mode: Can use any source
        """
        if is_live_mode:
            if not source.is_live_exchange:
                return False, f"LIVE mode rejected: Data source '{source.exchange}' is not a live exchange. CoinGecko/fallback data not allowed in LIVE mode."
            
            if source.exchange.lower() == "coingecko":
                return False, "LIVE mode rejected: CoinGecko data source is not allowed. Use exchange API."
            
            if source.exchange.lower() == "none":
                return False, "LIVE mode rejected: No data source available. Cannot trade without market data."
        
        return True, "OK"
    
    @staticmethod
    async def get_validated_candles(
        adapter: IExchangeAdapter,
        symbol: str,
        timeframe: str,
        limit: int,
        is_live_mode: bool
    ) -> Tuple[List[OHLCV], CandleSource]:
        """
        Get candles with validation for LIVE mode.
        Raises exception if LIVE mode and data source is invalid.
        """
        candles, source = await adapter.get_ohlcv(symbol, timeframe, limit)
        
        is_valid, message = LiveModeDataEnforcer.validate_candle_source(source, is_live_mode)
        
        if not is_valid:
            logger.error(f"[LIVE MODE BLOCKED] {message}")
            raise ValueError(message)
        
        return candles, source


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Enums
    "ExchangeType",
    "OrderSide",
    "OrderType",
    "OrderStatus",
    
    # Data Classes
    "OHLCV",
    "Ticker",
    "OrderResult",
    "Balance",
    "CandleSource",
    
    # Interface
    "IExchangeAdapter",
    
    # Adapters
    "BinanceAdapter",
    "SimulatedAdapter",
    
    # Factory & Enforcer
    "ExchangeAdapterFactory",
    "LiveModeDataEnforcer",
]
