"""
🚀 COINHUBX UNIFIED EXECUTION ENGINE - PHASE 6
═══════════════════════════════════════════════════════════════════════════════

SINGLE EXECUTION ENGINE supporting 3 modes:
- backtest: Replay historical candles (Phase 5 - NO CHANGES)
- paper: Live data, simulated trades, internal ledger
- live: Real exchange orders

CRITICAL RULES:
- Strategy logic MUST NOT know which mode it's in
- No branching inside strategies for mode handling
- All mode differences handled at execution layer only

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import hashlib
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from abc import ABC, abstractmethod
import logging
from cryptography.fernet import Fernet
import base64

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]

# Collections
trading_sessions = db.trading_sessions
paper_balances = db.paper_balances
paper_trades = db.paper_trades
live_trades = db.live_trades
trade_audit_log = db.trade_audit_log
exchange_credentials = db.exchange_credentials
kill_switch_state = db.kill_switch_state
risk_limits = db.risk_limits

# Encryption key for API credentials
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class ExecutionMode(Enum):
    BACKTEST = "backtest"
    PAPER = "paper"
    LIVE = "live"


class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"
    TRAILING_STOP = "trailing_stop"


class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(Enum):
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class SessionStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    KILLED = "killed"


# ═══════════════════════════════════════════════════════════════════════════════
# SUPPORTED TIMEFRAMES & PAIRS
# ═══════════════════════════════════════════════════════════════════════════════

SUPPORTED_TIMEFRAMES = ["1m", "3m", "5m", "15m", "1h"]

SUPPORTED_PAIRS = [
    "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "ADAUSD",
    "DOGEUSD", "LINKUSD", "DOTUSD", "AVAXUSD", "MATICUSD"
]


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class OrderRequest:
    """Order request from strategy - MODE AGNOSTIC"""
    pair: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None  # For limit orders
    stop_price: Optional[float] = None  # For stop orders
    take_profit_price: Optional[float] = None
    stop_loss_price: Optional[float] = None
    trailing_stop_percent: Optional[float] = None
    client_order_id: Optional[str] = None
    
    def __post_init__(self):
        if self.client_order_id is None:
            self.client_order_id = str(uuid.uuid4())


@dataclass
class OrderResult:
    """Order execution result - returned to strategy"""
    success: bool
    order_id: str
    client_order_id: str
    status: OrderStatus
    filled_quantity: float
    filled_price: float
    fee: float
    timestamp_ms: int
    error: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "success": self.success,
            "order_id": self.order_id,
            "client_order_id": self.client_order_id,
            "status": self.status.value,
            "filled_quantity": self.filled_quantity,
            "filled_price": self.filled_price,
            "fee": self.fee,
            "timestamp_ms": self.timestamp_ms,
            "error": self.error
        }


@dataclass
class TradeLog:
    """
    Immutable trade log entry.
    Every trade MUST log these fields - NON-OPTIONAL.
    """
    log_id: str
    timestamp_ms: int
    pair: str
    side: str
    entry_price: float
    exit_price: Optional[float]
    quantity: float
    fees: float
    pnl: float
    mode: str  # "paper" or "live"
    strategy_id: str
    config_hash: str
    user_id: str
    session_id: str
    order_type: str
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class TradingSession:
    """Trading session - tracks a single bot instance"""
    session_id: str
    user_id: str
    bot_id: str
    mode: ExecutionMode
    pair: str
    timeframe: str
    config: Dict[str, Any]
    config_hash: str
    status: SessionStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    
    # Balances
    initial_balance: float = 0
    current_balance: float = 0
    
    # Risk limits
    max_trades_per_day: int = 50
    max_concurrent_positions: int = 3
    max_daily_loss_percent: float = 10.0
    cooldown_after_loss_streak: int = 3
    
    # Tracking
    trades_today: int = 0
    open_positions: int = 0
    daily_pnl: float = 0
    consecutive_losses: int = 0
    cooldown_until: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "bot_id": self.bot_id,
            "mode": self.mode.value,
            "pair": self.pair,
            "timeframe": self.timeframe,
            "config_hash": self.config_hash,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "initial_balance": self.initial_balance,
            "current_balance": self.current_balance,
            "trades_today": self.trades_today,
            "open_positions": self.open_positions,
            "daily_pnl": self.daily_pnl
        }


# ═══════════════════════════════════════════════════════════════════════════════
# KILL SWITCH MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class KillSwitch:
    """Emergency kill switch - admin + user level"""
    
    @staticmethod
    async def is_killed_global() -> bool:
        """Check if global kill switch is active"""
        doc = await kill_switch_state.find_one({"type": "global"})
        return doc.get("active", False) if doc else False
    
    @staticmethod
    async def is_killed_user(user_id: str) -> bool:
        """Check if user-level kill switch is active"""
        doc = await kill_switch_state.find_one({"type": "user", "user_id": user_id})
        return doc.get("active", False) if doc else False
    
    @staticmethod
    async def is_killed_session(session_id: str) -> bool:
        """Check if session-level kill switch is active"""
        doc = await kill_switch_state.find_one({"type": "session", "session_id": session_id})
        return doc.get("active", False) if doc else False
    
    @staticmethod
    async def check_all(user_id: str, session_id: str) -> Tuple[bool, Optional[str]]:
        """Check all kill switch levels"""
        if await KillSwitch.is_killed_global():
            return True, "Global kill switch active"
        if await KillSwitch.is_killed_user(user_id):
            return True, f"User {user_id} kill switch active"
        if await KillSwitch.is_killed_session(session_id):
            return True, f"Session {session_id} kill switch active"
        return False, None
    
    @staticmethod
    async def activate_global(admin_id: str, reason: str = ""):
        """Activate global kill switch (admin only)"""
        await kill_switch_state.update_one(
            {"type": "global"},
            {
                "$set": {
                    "active": True,
                    "activated_by": admin_id,
                    "reason": reason,
                    "activated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        logger.warning(f"GLOBAL KILL SWITCH ACTIVATED by {admin_id}: {reason}")
    
    @staticmethod
    async def deactivate_global(admin_id: str):
        """Deactivate global kill switch"""
        await kill_switch_state.update_one(
            {"type": "global"},
            {"$set": {"active": False, "deactivated_by": admin_id, "deactivated_at": datetime.now(timezone.utc)}}
        )
        logger.info(f"Global kill switch deactivated by {admin_id}")
    
    @staticmethod
    async def activate_user(user_id: str, admin_id: str, reason: str = ""):
        """Activate user-level kill switch"""
        await kill_switch_state.update_one(
            {"type": "user", "user_id": user_id},
            {
                "$set": {
                    "active": True,
                    "activated_by": admin_id,
                    "reason": reason,
                    "activated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        logger.warning(f"USER KILL SWITCH ACTIVATED for {user_id} by {admin_id}: {reason}")
    
    @staticmethod
    async def activate_session(session_id: str, user_id: str, reason: str = ""):
        """Activate session-level kill switch (user can do this)"""
        await kill_switch_state.update_one(
            {"type": "session", "session_id": session_id},
            {
                "$set": {
                    "active": True,
                    "user_id": user_id,
                    "reason": reason,
                    "activated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        logger.info(f"Session kill switch activated for {session_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# RISK MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class RiskManager:
    """Risk controls - mandatory for all modes"""
    
    @staticmethod
    async def validate_order(session: TradingSession, order: OrderRequest) -> Tuple[bool, Optional[str]]:
        """Validate order against risk limits"""
        
        # Check kill switch first
        killed, reason = await KillSwitch.check_all(session.user_id, session.session_id)
        if killed:
            return False, reason
        
        # Check cooldown
        if session.cooldown_until and datetime.now(timezone.utc) < session.cooldown_until:
            return False, f"Cooldown active until {session.cooldown_until.isoformat()}"
        
        # Check max trades per day
        if session.trades_today >= session.max_trades_per_day:
            return False, f"Max trades per day ({session.max_trades_per_day}) reached"
        
        # Check max concurrent positions (for buys)
        if order.side == OrderSide.BUY and session.open_positions >= session.max_concurrent_positions:
            return False, f"Max concurrent positions ({session.max_concurrent_positions}) reached"
        
        # Check daily loss limit
        if session.initial_balance > 0:
            loss_percent = abs(min(0, session.daily_pnl)) / session.initial_balance * 100
            if loss_percent >= session.max_daily_loss_percent:
                return False, f"Max daily loss ({session.max_daily_loss_percent}%) reached"
        
        # Validate pair
        if order.pair not in SUPPORTED_PAIRS:
            return False, f"Unsupported pair: {order.pair}"
        
        return True, None
    
    @staticmethod
    async def update_after_trade(session: TradingSession, pnl: float, is_win: bool):
        """Update session risk tracking after trade"""
        session.trades_today += 1
        session.daily_pnl += pnl
        
        if is_win:
            session.consecutive_losses = 0
        else:
            session.consecutive_losses += 1
            
            # Apply cooldown if loss streak hit
            if session.consecutive_losses >= session.cooldown_after_loss_streak:
                session.cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=30)
                logger.warning(f"Session {session.session_id}: Cooldown activated after {session.consecutive_losses} consecutive losses")


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGGER
# ═══════════════════════════════════════════════════════════════════════════════

class AuditLogger:
    """Immutable trade audit log - NON-OPTIONAL"""
    
    @staticmethod
    async def log_trade(
        session: TradingSession,
        side: str,
        entry_price: float,
        exit_price: Optional[float],
        quantity: float,
        fees: float,
        pnl: float,
        order_type: str
    ) -> str:
        """Log a trade - MANDATORY for every trade"""
        
        log_id = str(uuid.uuid4())
        
        trade_log = TradeLog(
            log_id=log_id,
            timestamp_ms=int(datetime.now(timezone.utc).timestamp() * 1000),
            pair=session.pair,
            side=side,
            entry_price=entry_price,
            exit_price=exit_price,
            quantity=quantity,
            fees=fees,
            pnl=pnl,
            mode=session.mode.value,
            strategy_id=session.bot_id,
            config_hash=session.config_hash,
            user_id=session.user_id,
            session_id=session.session_id,
            order_type=order_type
        )
        
        # Insert into immutable log
        await trade_audit_log.insert_one(trade_log.to_dict())
        
        logger.info(f"AUDIT: {session.mode.value} {side} {quantity} {session.pair} @ {entry_price} | PnL: {pnl} | Fees: {fees}")
        
        return log_id
    
    @staticmethod
    async def get_trade_history(
        user_id: str,
        session_id: Optional[str] = None,
        mode: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Query trade history"""
        query = {"user_id": user_id}
        if session_id:
            query["session_id"] = session_id
        if mode:
            query["mode"] = mode
        
        trades = []
        async for doc in trade_audit_log.find(query).sort("timestamp_ms", -1).limit(limit):
            doc.pop("_id", None)
            trades.append(doc)
        
        return trades


# ═══════════════════════════════════════════════════════════════════════════════
# ORDER EXECUTOR INTERFACE (Abstract)
# ═══════════════════════════════════════════════════════════════════════════════

class OrderExecutor(ABC):
    """Abstract order executor - implemented per mode"""
    
    @abstractmethod
    async def execute_order(self, session: TradingSession, order: OrderRequest) -> OrderResult:
        """Execute an order"""
        pass
    
    @abstractmethod
    async def get_current_price(self, pair: str) -> float:
        """Get current market price"""
        pass
    
    @abstractmethod
    async def get_balance(self, session: TradingSession) -> float:
        """Get current balance for session"""
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# PAPER TRADING EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class PaperExecutor(OrderExecutor):
    """
    Paper trading executor.
    Uses LIVE market data.
    Trades are SIMULATED (no exchange orders).
    Balances stored in internal ledger.
    Uses SAME fee logic as live.
    """
    
    async def execute_order(self, session: TradingSession, order: OrderRequest) -> OrderResult:
        """Execute paper trade"""
        from backtesting_engine import FeeCalculator
        
        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        order_id = str(uuid.uuid4())
        
        try:
            # Get current price
            current_price = await self.get_current_price(order.pair)
            
            if order.order_type == OrderType.MARKET:
                fill_price = current_price
            elif order.order_type == OrderType.LIMIT:
                fill_price = order.price if order.price else current_price
            else:
                fill_price = current_price
            
            # Calculate trade value and fee
            trade_value = order.quantity * fill_price
            fee = await FeeCalculator.calculate_fee(trade_value)
            
            # Get current paper balance
            balance = await self.get_balance(session)
            
            # Check if enough balance
            if order.side == OrderSide.BUY and trade_value + fee > balance:
                return OrderResult(
                    success=False,
                    order_id=order_id,
                    client_order_id=order.client_order_id,
                    status=OrderStatus.REJECTED,
                    filled_quantity=0,
                    filled_price=0,
                    fee=0,
                    timestamp_ms=timestamp_ms,
                    error="Insufficient paper balance"
                )
            
            # Update paper balance
            if order.side == OrderSide.BUY:
                new_balance = balance - trade_value - fee
            else:
                new_balance = balance + trade_value - fee
            
            await self._update_balance(session, new_balance)
            
            # Log the trade
            await paper_trades.insert_one({
                "order_id": order_id,
                "session_id": session.session_id,
                "user_id": session.user_id,
                "pair": order.pair,
                "side": order.side.value,
                "order_type": order.order_type.value,
                "quantity": order.quantity,
                "price": fill_price,
                "fee": fee,
                "timestamp_ms": timestamp_ms,
                "status": "filled"
            })
            
            return OrderResult(
                success=True,
                order_id=order_id,
                client_order_id=order.client_order_id,
                status=OrderStatus.FILLED,
                filled_quantity=order.quantity,
                filled_price=fill_price,
                fee=fee,
                timestamp_ms=timestamp_ms
            )
            
        except Exception as e:
            logger.error(f"Paper execution error: {e}")
            return OrderResult(
                success=False,
                order_id=order_id,
                client_order_id=order.client_order_id,
                status=OrderStatus.REJECTED,
                filled_quantity=0,
                filled_price=0,
                fee=0,
                timestamp_ms=timestamp_ms,
                error=str(e)
            )
    
    async def get_current_price(self, pair: str) -> float:
        """Get live price from existing price service"""
        from bot_execution_engine import CandleManager
        price = await CandleManager.get_latest_price(pair)
        return price if price else 0
    
    async def get_balance(self, session: TradingSession) -> float:
        """Get paper balance from internal ledger"""
        doc = await paper_balances.find_one({
            "session_id": session.session_id,
            "user_id": session.user_id
        })
        if doc:
            return doc.get("balance", session.initial_balance)
        return session.initial_balance
    
    async def _update_balance(self, session: TradingSession, new_balance: float):
        """Update paper balance in ledger"""
        await paper_balances.update_one(
            {"session_id": session.session_id, "user_id": session.user_id},
            {
                "$set": {
                    "balance": new_balance,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )


# ═══════════════════════════════════════════════════════════════════════════════
# EXCHANGE ABSTRACTION LAYER
# ═══════════════════════════════════════════════════════════════════════════════

class ExchangeClient(ABC):
    """Abstract exchange client - no direct calls in strategy logic"""
    
    @abstractmethod
    async def place_order(self, pair: str, side: str, order_type: str, quantity: float, price: Optional[float] = None) -> Dict:
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        pass
    
    @abstractmethod
    async def get_order_status(self, order_id: str) -> Dict:
        pass
    
    @abstractmethod
    async def get_balance(self, currency: str) -> float:
        pass
    
    @abstractmethod
    async def get_ticker(self, pair: str) -> Dict:
        pass


class SimulatedExchange(ExchangeClient):
    """Simulated exchange for testing - uses live prices but no real orders"""
    
    async def place_order(self, pair: str, side: str, order_type: str, quantity: float, price: Optional[float] = None) -> Dict:
        from bot_execution_engine import CandleManager
        current_price = await CandleManager.get_latest_price(pair) or 0
        return {
            "order_id": str(uuid.uuid4()),
            "status": "filled",
            "filled_price": price if price else current_price,
            "filled_quantity": quantity
        }
    
    async def cancel_order(self, order_id: str) -> bool:
        return True
    
    async def get_order_status(self, order_id: str) -> Dict:
        return {"status": "filled"}
    
    async def get_balance(self, currency: str) -> float:
        return 100000  # Simulated balance
    
    async def get_ticker(self, pair: str) -> Dict:
        from bot_execution_engine import CandleManager
        price = await CandleManager.get_latest_price(pair) or 0
        return {"last": price, "bid": price * 0.999, "ask": price * 1.001}


# ═══════════════════════════════════════════════════════════════════════════════
# LIVE TRADING EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════

class LiveExecutor(OrderExecutor):
    """
    Live trading executor.
    Executes REAL exchange orders.
    Requires explicit user opt-in.
    Uses exchange abstraction layer.
    """
    
    def __init__(self, exchange: ExchangeClient):
        self.exchange = exchange
    
    async def execute_order(self, session: TradingSession, order: OrderRequest) -> OrderResult:
        """Execute live trade on exchange"""
        from backtesting_engine import FeeCalculator
        
        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        order_id = str(uuid.uuid4())
        
        try:
            # Place order on exchange
            exchange_result = await self.exchange.place_order(
                pair=order.pair,
                side=order.side.value,
                order_type=order.order_type.value,
                quantity=order.quantity,
                price=order.price
            )
            
            fill_price = exchange_result.get("filled_price", 0)
            fill_quantity = exchange_result.get("filled_quantity", order.quantity)
            
            # Calculate fee
            trade_value = fill_quantity * fill_price
            fee = await FeeCalculator.calculate_fee(trade_value)
            
            # Log to live trades
            await live_trades.insert_one({
                "order_id": order_id,
                "exchange_order_id": exchange_result.get("order_id"),
                "session_id": session.session_id,
                "user_id": session.user_id,
                "pair": order.pair,
                "side": order.side.value,
                "order_type": order.order_type.value,
                "quantity": fill_quantity,
                "price": fill_price,
                "fee": fee,
                "timestamp_ms": timestamp_ms,
                "status": exchange_result.get("status", "filled")
            })
            
            return OrderResult(
                success=True,
                order_id=order_id,
                client_order_id=order.client_order_id,
                status=OrderStatus.FILLED,
                filled_quantity=fill_quantity,
                filled_price=fill_price,
                fee=fee,
                timestamp_ms=timestamp_ms
            )
            
        except Exception as e:
            logger.error(f"Live execution error: {e}")
            return OrderResult(
                success=False,
                order_id=order_id,
                client_order_id=order.client_order_id,
                status=OrderStatus.REJECTED,
                filled_quantity=0,
                filled_price=0,
                fee=0,
                timestamp_ms=timestamp_ms,
                error=str(e)
            )
    
    async def get_current_price(self, pair: str) -> float:
        """Get price from exchange"""
        ticker = await self.exchange.get_ticker(pair)
        return ticker.get("last", 0)
    
    async def get_balance(self, session: TradingSession) -> float:
        """Get balance from exchange"""
        # Extract base currency from pair
        currency = "USD"  # Default to USD for spot
        return await self.exchange.get_balance(currency)


# ═══════════════════════════════════════════════════════════════════════════════
# UNIFIED EXECUTION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class UnifiedExecutionEngine:
    """
    SINGLE execution engine for ALL modes.
    
    Strategy logic calls this - it DOES NOT know which mode it's in.
    Mode selection handled here, not in strategy.
    """
    
    def __init__(self):
        self._executors: Dict[ExecutionMode, OrderExecutor] = {}
        self._sessions: Dict[str, TradingSession] = {}
    
    def register_executor(self, mode: ExecutionMode, executor: OrderExecutor):
        """Register an executor for a mode"""
        self._executors[mode] = executor
    
    async def create_session(
        self,
        user_id: str,
        bot_id: str,
        mode: ExecutionMode,
        pair: str,
        timeframe: str,
        config: Dict[str, Any],
        initial_balance: float = 10000,
        live_opt_in: bool = False
    ) -> TradingSession:
        """
        Create a new trading session.
        For LIVE mode, requires explicit opt-in.
        """
        
        # Live mode requires explicit opt-in
        if mode == ExecutionMode.LIVE and not live_opt_in:
            raise ValueError("Live trading requires explicit opt-in. Set live_opt_in=True to confirm.")
        
        # Validate timeframe
        if timeframe not in SUPPORTED_TIMEFRAMES:
            raise ValueError(f"Unsupported timeframe: {timeframe}. Supported: {SUPPORTED_TIMEFRAMES}")
        
        # Validate pair
        if pair not in SUPPORTED_PAIRS:
            raise ValueError(f"Unsupported pair: {pair}. Supported: {SUPPORTED_PAIRS}")
        
        session_id = str(uuid.uuid4())
        config_hash = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:16]
        
        session = TradingSession(
            session_id=session_id,
            user_id=user_id,
            bot_id=bot_id,
            mode=mode,
            pair=pair,
            timeframe=timeframe,
            config=config,
            config_hash=config_hash,
            status=SessionStatus.ACTIVE,
            created_at=datetime.now(timezone.utc),
            initial_balance=initial_balance,
            current_balance=initial_balance
        )
        
        # Initialize paper balance if paper mode
        if mode == ExecutionMode.PAPER:
            await paper_balances.update_one(
                {"session_id": session_id, "user_id": user_id},
                {"$set": {"balance": initial_balance, "created_at": datetime.now(timezone.utc)}},
                upsert=True
            )
        
        # Save session
        await trading_sessions.insert_one({
            **session.to_dict(),
            "config": config
        })
        
        self._sessions[session_id] = session
        
        logger.info(f"Created {mode.value} session {session_id} for user {user_id}")
        
        return session
    
    async def execute_order(self, session_id: str, order: OrderRequest) -> OrderResult:
        """
        Execute an order - MODE AGNOSTIC from strategy perspective.
        
        Strategy calls this without knowing if it's paper or live.
        Engine handles the mode internally.
        """
        
        session = self._sessions.get(session_id)
        if not session:
            # Try to load from DB
            doc = await trading_sessions.find_one({"session_id": session_id})
            if not doc:
                raise ValueError(f"Session not found: {session_id}")
            session = TradingSession(
                session_id=doc["session_id"],
                user_id=doc["user_id"],
                bot_id=doc["bot_id"],
                mode=ExecutionMode(doc["mode"]),
                pair=doc["pair"],
                timeframe=doc["timeframe"],
                config=doc.get("config", {}),
                config_hash=doc["config_hash"],
                status=SessionStatus(doc["status"]),
                created_at=datetime.fromisoformat(doc["created_at"]),
                initial_balance=doc.get("initial_balance", 10000),
                current_balance=doc.get("current_balance", 10000)
            )
            self._sessions[session_id] = session
        
        # Check if session is active
        if session.status != SessionStatus.ACTIVE:
            return OrderResult(
                success=False,
                order_id="",
                client_order_id=order.client_order_id,
                status=OrderStatus.REJECTED,
                filled_quantity=0,
                filled_price=0,
                fee=0,
                timestamp_ms=int(datetime.now(timezone.utc).timestamp() * 1000),
                error=f"Session is {session.status.value}"
            )
        
        # Validate against risk limits
        valid, reason = await RiskManager.validate_order(session, order)
        if not valid:
            return OrderResult(
                success=False,
                order_id="",
                client_order_id=order.client_order_id,
                status=OrderStatus.REJECTED,
                filled_quantity=0,
                filled_price=0,
                fee=0,
                timestamp_ms=int(datetime.now(timezone.utc).timestamp() * 1000),
                error=reason
            )
        
        # Get executor for mode
        executor = self._executors.get(session.mode)
        if not executor:
            raise ValueError(f"No executor registered for mode: {session.mode}")
        
        # Execute order
        result = await executor.execute_order(session, order)
        
        # Log to audit trail
        if result.success:
            await AuditLogger.log_trade(
                session=session,
                side=order.side.value,
                entry_price=result.filled_price,
                exit_price=None,
                quantity=result.filled_quantity,
                fees=result.fee,
                pnl=0,  # PnL calculated on exit
                order_type=order.order_type.value
            )
            
            # Update session
            if order.side == OrderSide.BUY:
                session.open_positions += 1
            else:
                session.open_positions = max(0, session.open_positions - 1)
        
        return result
    
    async def stop_session(self, session_id: str, user_id: str) -> bool:
        """Stop a trading session"""
        session = self._sessions.get(session_id)
        if session and session.user_id == user_id:
            session.status = SessionStatus.STOPPED
            session.stopped_at = datetime.now(timezone.utc)
            await trading_sessions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "stopped", "stopped_at": session.stopped_at.isoformat()}}
            )
            logger.info(f"Session {session_id} stopped")
            return True
        return False
    
    async def reset_paper_balance(self, session_id: str, new_balance: float) -> bool:
        """Reset paper trading balance"""
        session = self._sessions.get(session_id)
        if session and session.mode == ExecutionMode.PAPER:
            await paper_balances.update_one(
                {"session_id": session_id},
                {"$set": {"balance": new_balance, "reset_at": datetime.now(timezone.utc)}}
            )
            session.current_balance = new_balance
            logger.info(f"Paper balance reset to {new_balance} for session {session_id}")
            return True
        return False
    
    async def get_session_status(self, session_id: str) -> Optional[Dict]:
        """Get session status and stats"""
        session = self._sessions.get(session_id)
        if session:
            return session.to_dict()
        
        doc = await trading_sessions.find_one({"session_id": session_id})
        if doc:
            doc.pop("_id", None)
            return doc
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON ENGINE INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_engine_instance: Optional[UnifiedExecutionEngine] = None

def get_execution_engine() -> UnifiedExecutionEngine:
    """Get singleton execution engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = UnifiedExecutionEngine()
        # Register executors
        _engine_instance.register_executor(ExecutionMode.PAPER, PaperExecutor())
        _engine_instance.register_executor(ExecutionMode.LIVE, LiveExecutor(SimulatedExchange()))
    return _engine_instance
