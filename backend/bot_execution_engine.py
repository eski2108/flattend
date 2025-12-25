"""
🤖 COINHUBX BOT EXECUTION ENGINE - PHASE 1
═══════════════════════════════════════════════════════════════════════════════

CORE BOT ENGINE (FOUNDATION) - Exchange-Grade Implementation

This module implements:
1. Bot Execution Engine
   - Deterministic execution loop
   - Candle ingestion (multi-timeframe)
   - Order lifecycle handling (created → filled → partial → cancelled)
   - Fee-aware execution
   - Slippage handling
   - Precision handling (tick size, lot size)

2. State Management
   - Bot state persistence (restart-safe)
   - Open positions tracking
   - Active orders tracking
   - Capital allocation tracking
   - Bot resume after crash/restart

3. Safety & Integrity
   - Duplicate order prevention
   - Race-condition protection
   - Idempotent execution
   - Exchange rate-limit protection
   - Kill-switch support (global + per-bot)

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import asyncio
import hashlib
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict
import logging
import json

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE CONNECTION
# ═══════════════════════════════════════════════════════════════════════════════

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db_name = os.environ.get('DB_NAME', 'coin_hub_x')
db = client[db_name]

# Collections
bot_configs = db.bot_configs
bot_states = db.bot_states           # Persistent state for restart-safety
bot_orders = db.bot_orders           # All orders placed by bots
bot_positions = db.bot_positions     # Open positions
bot_decision_logs = db.bot_decision_logs  # Decision audit trail
bot_idempotency = db.bot_idempotency      # Idempotency keys
bot_rate_limits = db.bot_rate_limits      # Rate limit tracking

# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

class OrderStatus(Enum):
    PENDING = "pending"          # Order created, not yet sent
    SUBMITTED = "submitted"      # Sent to exchange
    OPEN = "open"               # On orderbook
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"           # Fully executed
    CANCELLED = "cancelled"     # Cancelled by user/bot
    REJECTED = "rejected"       # Rejected by exchange
    EXPIRED = "expired"         # TTL expired
    FAILED = "failed"           # Execution failed

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LIMIT = "stop_limit"
    STOP_MARKET = "stop_market"
    TRAILING_STOP = "trailing_stop"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class BotStatus(Enum):
    DRAFT = "draft"           # Created but never started
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"           # In error state
    KILLED = "killed"         # Emergency stopped

class PositionSide(Enum):
    LONG = "long"
    SHORT = "short"
    FLAT = "flat"

# ═══════════════════════════════════════════════════════════════════════════════
# EXECUTION MODE - HARD SEPARATION (Phase 8)
# ═══════════════════════════════════════════════════════════════════════════════

class ExecutionMode(Enum):
    """
    HARD-LOCKED execution modes. No shared code paths between PAPER and LIVE.
    """
    PAPER = "paper"   # Simulated trades, internal ledger, no real money
    LIVE = "live"     # Real exchange orders, real money at risk

# Mode validation requirements
LIVE_MODE_REQUIREMENTS = {
    "explicit_confirmation": True,      # User must explicitly confirm
    "balance_check_required": True,     # Must have sufficient balance
    "exchange_credentials_required": True,  # Must have valid API keys
    "risk_acknowledgment": True,        # Must acknowledge risk
}

def validate_execution_mode(mode: str) -> ExecutionMode:
    """Strictly validate execution mode string to enum."""
    mode_lower = mode.lower().strip()
    if mode_lower == "paper":
        return ExecutionMode.PAPER
    elif mode_lower == "live":
        return ExecutionMode.LIVE
    else:
        raise ValueError(f"Invalid execution mode: {mode}. Must be 'paper' or 'live'.")

def get_mode_badge(mode: ExecutionMode) -> dict:
    """Get visual badge info for mode display."""
    if mode == ExecutionMode.PAPER:
        return {
            "text": "PAPER",
            "color": "#FFC107",  # Yellow/amber
            "bg": "rgba(255,193,7,0.15)",
            "icon": "📝"
        }
    else:  # LIVE
        return {
            "text": "LIVE",
            "color": "#EF4444",  # Red
            "bg": "rgba(239,68,68,0.15)",
            "icon": "🔴"
        }

# Trading pair precision (can be extended/loaded from exchange)
PAIR_PRECISION = {
    "BTCUSD": {"tick_size": 0.01, "lot_size": 0.00001, "min_notional": 10},
    "ETHUSD": {"tick_size": 0.01, "lot_size": 0.0001, "min_notional": 10},
    "SOLUSD": {"tick_size": 0.001, "lot_size": 0.01, "min_notional": 1},
    "XRPUSD": {"tick_size": 0.0001, "lot_size": 0.1, "min_notional": 1},
    "ADAUSD": {"tick_size": 0.0001, "lot_size": 1, "min_notional": 1},
    "DOGEUSD": {"tick_size": 0.00001, "lot_size": 1, "min_notional": 1},
    "LINKUSD": {"tick_size": 0.001, "lot_size": 0.01, "min_notional": 1},
    "DEFAULT": {"tick_size": 0.0001, "lot_size": 0.0001, "min_notional": 1}
}

# Rate limits
RATE_LIMIT_ORDERS_PER_SECOND = 10
RATE_LIMIT_ORDERS_PER_MINUTE = 300
RATE_LIMIT_ORDERS_PER_HOUR = 5000

# Kill-switch flags
GLOBAL_KILL_SWITCH = False
BOT_KILL_SWITCHES: Dict[str, bool] = {}
USER_KILL_SWITCHES: Dict[str, bool] = {}  # Phase 8: User-level kill switch

# Slippage defaults
DEFAULT_SLIPPAGE_PERCENT = 0.5  # 0.5% max slippage
MAX_SLIPPAGE_PERCENT = 5.0      # Never allow more than 5%


# ═══════════════════════════════════════════════════════════════════════════════
# LIVE MODE VALIDATOR (Phase 8)
# ═══════════════════════════════════════════════════════════════════════════════

class LiveModeValidator:
    """
    Validates all requirements before allowing LIVE mode execution.
    This is the ONLY gateway to LIVE trading - no bypasses allowed.
    """
    
    @staticmethod
    async def validate_live_mode(
        user_id: str,
        bot_id: str,
        pair: str,
        required_balance: float,
        explicit_confirmation: bool = False
    ) -> Tuple[bool, str]:
        """
        Validate all LIVE mode requirements.
        Returns (is_valid, error_message).
        """
        errors = []
        
        # 1. Check explicit confirmation
        if not explicit_confirmation:
            errors.append("LIVE mode requires explicit user confirmation (live_confirmed=True)")
        
        # 2. Check global kill switch
        if GLOBAL_KILL_SWITCH:
            errors.append("Global kill switch is active - LIVE trading disabled")
        
        # 3. Check user kill switch
        if USER_KILL_SWITCHES.get(user_id, False):
            errors.append(f"User kill switch is active for {user_id}")
        
        # 4. Check bot kill switch
        if BOT_KILL_SWITCHES.get(bot_id, False):
            errors.append(f"Bot kill switch is active for {bot_id}")
        
        # 5. Check user has valid exchange credentials
        creds = await db.exchange_credentials.find_one({
            "user_id": user_id,
            "is_active": True
        })
        if not creds:
            errors.append("No valid exchange credentials found - required for LIVE mode")
        
        # 6. Check user balance
        wallet = await db.wallets.find_one({"user_id": user_id})
        if not wallet:
            errors.append("User wallet not found")
        else:
            # Determine quote currency from pair (e.g., BTCUSD -> USD)
            quote_currency = "USD"
            if pair.endswith("USDT"):
                quote_currency = "USDT"
            elif pair.endswith("USD"):
                quote_currency = "USD"
            elif pair.endswith("GBP"):
                quote_currency = "GBP"
            
            balances = wallet.get("balances", {})
            available = balances.get(quote_currency, {}).get("available", 0)
            
            if available < required_balance:
                errors.append(f"Insufficient balance: {available} {quote_currency} < {required_balance} required")
        
        # 7. Check live mode acknowledgment in user profile
        user = await db.users.find_one({"user_id": user_id})
        if user and not user.get("live_trading_acknowledged", False):
            errors.append("User has not acknowledged LIVE trading risks")
        
        if errors:
            return False, "; ".join(errors)
        
        return True, "LIVE mode validation passed"
    
    @staticmethod
    async def record_live_confirmation(user_id: str, bot_id: str, ip_address: str = None):
        """Record that user explicitly confirmed LIVE mode for audit trail."""
        await db.live_confirmations.insert_one({
            "confirmation_id": str(uuid.uuid4()),
            "user_id": user_id,
            "bot_id": bot_id,
            "confirmed_at": datetime.now(timezone.utc),
            "ip_address": ip_address,
            "confirmation_type": "bot_live_start"
        })


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class OrderRequest:
    """Order request before submission"""
    bot_id: str
    user_id: str
    pair: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None           # For limit orders
    stop_price: Optional[float] = None      # For stop orders
    time_in_force: str = "GTC"              # GTC, IOC, FOK
    reduce_only: bool = False
    client_order_id: Optional[str] = None   # Idempotency key
    max_slippage_percent: float = DEFAULT_SLIPPAGE_PERCENT
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Order:
    """Executed/tracked order"""
    order_id: str
    bot_id: str
    user_id: str
    pair: str
    side: str
    order_type: str
    quantity: float
    filled_quantity: float = 0
    price: Optional[float] = None
    average_fill_price: Optional[float] = None
    stop_price: Optional[float] = None
    status: str = OrderStatus.PENDING.value
    fee: float = 0
    fee_currency: str = "USD"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    filled_at: Optional[datetime] = None
    client_order_id: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Position:
    """Open position tracking"""
    position_id: str
    bot_id: str
    user_id: str
    pair: str
    side: str  # long/short
    quantity: float
    entry_price: float
    current_price: float = 0
    unrealized_pnl: float = 0
    realized_pnl: float = 0
    total_fees: float = 0
    opened_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    order_ids: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BotState:
    """Persistent bot state for restart-safety"""
    bot_id: str
    user_id: str
    status: str
    last_tick_at: Optional[datetime] = None
    last_decision_at: Optional[datetime] = None
    capital_allocated: float = 0
    capital_available: float = 0
    total_invested: float = 0
    realized_pnl: float = 0
    unrealized_pnl: float = 0
    total_fees_paid: float = 0
    total_orders_placed: int = 0
    total_orders_filled: int = 0
    total_orders_cancelled: int = 0
    active_order_ids: List[str] = field(default_factory=list)
    open_position_ids: List[str] = field(default_factory=list)
    last_error: Optional[str] = None
    error_count: int = 0
    consecutive_errors: int = 0
    cooldown_until: Optional[datetime] = None
    checksum: Optional[str] = None  # For integrity verification
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════════════════
# PRECISION & SLIPPAGE HANDLING
# ═══════════════════════════════════════════════════════════════════════════════

class PrecisionHandler:
    """Handle tick size and lot size for different trading pairs"""
    
    @staticmethod
    def get_precision(pair: str) -> Dict[str, float]:
        """Get precision config for a trading pair"""
        return PAIR_PRECISION.get(pair.upper(), PAIR_PRECISION["DEFAULT"])
    
    @staticmethod
    def round_price(price: float, pair: str) -> float:
        """Round price to valid tick size"""
        precision = PrecisionHandler.get_precision(pair)
        tick_size = precision["tick_size"]
        return round(price / tick_size) * tick_size
    
    @staticmethod
    def round_quantity(quantity: float, pair: str) -> float:
        """Round quantity to valid lot size"""
        precision = PrecisionHandler.get_precision(pair)
        lot_size = precision["lot_size"]
        return round(quantity / lot_size) * lot_size
    
    @staticmethod
    def validate_min_notional(quantity: float, price: float, pair: str) -> bool:
        """Check if order meets minimum notional value"""
        precision = PrecisionHandler.get_precision(pair)
        notional = quantity * price
        return notional >= precision["min_notional"]
    
    @staticmethod
    def calculate_slippage_price(price: float, side: OrderSide, slippage_percent: float) -> float:
        """
        Calculate worst acceptable price with slippage.
        For BUY: price * (1 + slippage)
        For SELL: price * (1 - slippage)
        """
        slippage = min(slippage_percent, MAX_SLIPPAGE_PERCENT) / 100
        if side == OrderSide.BUY:
            return price * (1 + slippage)
        else:
            return price * (1 - slippage)


# ═══════════════════════════════════════════════════════════════════════════════
# IDEMPOTENCY & DUPLICATE PREVENTION
# ═══════════════════════════════════════════════════════════════════════════════

class IdempotencyManager:
    """Prevent duplicate order execution with idempotency keys"""
    
    IDEMPOTENCY_TTL_HOURS = 24  # Keys expire after 24 hours
    
    @staticmethod
    def generate_key(bot_id: str, action: str, params: Dict) -> str:
        """
        Generate unique idempotency key based on bot, action, and parameters.
        This ensures the same decision doesn't result in duplicate orders.
        """
        key_data = {
            "bot_id": bot_id,
            "action": action,
            "params": json.dumps(params, sort_keys=True)
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_str.encode()).hexdigest()[:32]
    
    @staticmethod
    async def check_and_set(key: str, metadata: Dict = None) -> Tuple[bool, Optional[Dict]]:
        """
        Check if idempotency key exists.
        Returns (is_new, existing_result)
        - is_new=True: Key is new, action can proceed
        - is_new=False: Key exists, return cached result
        """
        existing = await bot_idempotency.find_one({"key": key})
        
        if existing:
            # Check if expired
            created_at = existing.get("created_at")
            if created_at:
                age = datetime.now(timezone.utc) - created_at
                if age.total_seconds() > IdempotencyManager.IDEMPOTENCY_TTL_HOURS * 3600:
                    # Expired, delete and allow new
                    await bot_idempotency.delete_one({"key": key})
                    return True, None
            
            return False, existing.get("result")
        
        # Key doesn't exist, create it
        await bot_idempotency.insert_one({
            "key": key,
            "created_at": datetime.now(timezone.utc),
            "metadata": metadata or {},
            "result": None  # Will be updated when action completes
        })
        
        return True, None
    
    @staticmethod
    async def set_result(key: str, result: Dict):
        """Store the result for an idempotency key"""
        await bot_idempotency.update_one(
            {"key": key},
            {"$set": {"result": result, "completed_at": datetime.now(timezone.utc)}}
        )
    
    @staticmethod
    async def cleanup_expired():
        """Remove expired idempotency keys"""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=IdempotencyManager.IDEMPOTENCY_TTL_HOURS)
        result = await bot_idempotency.delete_many({"created_at": {"$lt": cutoff}})
        return result.deleted_count


# ═══════════════════════════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Rate limiting for order placement to prevent exchange rate limit issues"""
    
    # In-memory cache for fast checking
    _cache: Dict[str, List[float]] = defaultdict(list)
    
    @staticmethod
    async def check_rate_limit(bot_id: str, user_id: str) -> Tuple[bool, str]:
        """
        Check if bot can place an order within rate limits.
        Returns (allowed, reason)
        """
        now = time.time()
        key = f"{user_id}:{bot_id}"
        
        # Get timestamps from cache
        timestamps = RateLimiter._cache[key]
        
        # Clean old entries
        timestamps = [t for t in timestamps if now - t < 3600]  # Keep last hour
        RateLimiter._cache[key] = timestamps
        
        # Check limits
        last_second = [t for t in timestamps if now - t < 1]
        last_minute = [t for t in timestamps if now - t < 60]
        last_hour = timestamps
        
        if len(last_second) >= RATE_LIMIT_ORDERS_PER_SECOND:
            return False, f"Rate limit: max {RATE_LIMIT_ORDERS_PER_SECOND} orders/second"
        
        if len(last_minute) >= RATE_LIMIT_ORDERS_PER_MINUTE:
            return False, f"Rate limit: max {RATE_LIMIT_ORDERS_PER_MINUTE} orders/minute"
        
        if len(last_hour) >= RATE_LIMIT_ORDERS_PER_HOUR:
            return False, f"Rate limit: max {RATE_LIMIT_ORDERS_PER_HOUR} orders/hour"
        
        return True, "OK"
    
    @staticmethod
    async def record_order(bot_id: str, user_id: str):
        """Record an order placement for rate limiting"""
        key = f"{user_id}:{bot_id}"
        RateLimiter._cache[key].append(time.time())
        
        # Also persist to DB for cross-restart tracking
        await bot_rate_limits.update_one(
            {"key": key},
            {
                "$push": {
                    "timestamps": {
                        "$each": [datetime.now(timezone.utc)],
                        "$slice": -1000  # Keep last 1000
                    }
                },
                "$set": {"updated_at": datetime.now(timezone.utc)}
            },
            upsert=True
        )


# ═══════════════════════════════════════════════════════════════════════════════
# KILL SWITCH
# ═══════════════════════════════════════════════════════════════════════════════

class KillSwitch:
    """Global, per-user, and per-bot kill switch for emergency stops"""
    
    @staticmethod
    async def is_killed(bot_id: Optional[str] = None, user_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Check if global, user, or bot-specific kill switch is active.
        Returns (is_killed, reason)
        """
        # Check global kill switch
        global_config = await db.platform_config.find_one({"config_id": "bot_engine"})
        if global_config and global_config.get("global_kill_switch"):
            return True, "Global kill switch is active"
        
        # Check user kill switch (Phase 8)
        if user_id:
            if USER_KILL_SWITCHES.get(user_id):
                return True, f"User {user_id} kill switch is active"
            
            user_kill = await db.user_kill_switches.find_one({"user_id": user_id, "active": True})
            if user_kill:
                return True, f"User {user_id} kill switch is active in DB"
        
        # Check bot-specific kill switch
        if bot_id:
            if BOT_KILL_SWITCHES.get(bot_id):
                return True, f"Bot {bot_id} kill switch is active"
            
            bot_config = await bot_configs.find_one({"bot_id": bot_id})
            if bot_config and bot_config.get("kill_switch"):
                return True, f"Bot {bot_id} kill switch is active in DB"
        
        return False, "OK"
    
    @staticmethod
    async def activate_global(admin_id: str = None, reason: str = "admin_triggered"):
        """Activate global kill switch - stops ALL bots"""
        global GLOBAL_KILL_SWITCH
        GLOBAL_KILL_SWITCH = True
        
        await db.platform_config.update_one(
            {"config_id": "bot_engine"},
            {
                "$set": {
                    "global_kill_switch": True,
                    "kill_switch_activated_at": datetime.now(timezone.utc),
                    "kill_switch_activated_by": admin_id,
                    "kill_switch_reason": reason
                }
            },
            upsert=True
        )
        
        # Stop all running bots
        await bot_configs.update_many(
            {"status": "running"},
            {
                "$set": {
                    "status": "killed",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": "global_kill_switch"
                }
            }
        )
        
        logger.warning("🚨 GLOBAL KILL SWITCH ACTIVATED - All bots stopped")
    
    @staticmethod
    async def activate_user(user_id: str, admin_id: str = None, reason: str = "admin_triggered"):
        """Activate kill switch for all bots of a specific user"""
        USER_KILL_SWITCHES[user_id] = True
        
        await db.user_kill_switches.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "active": True,
                    "activated_at": datetime.now(timezone.utc),
                    "activated_by": admin_id,
                    "reason": reason
                }
            },
            upsert=True
        )
        
        # Stop all running bots for this user
        await bot_configs.update_many(
            {"user_id": user_id, "status": "running"},
            {
                "$set": {
                    "status": "killed",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": f"user_kill_switch: {reason}"
                }
            }
        )
        
        logger.warning(f"🚨 USER KILL SWITCH ACTIVATED for {user_id}: {reason}")
    
    @staticmethod
    async def activate_bot(bot_id: str, reason: str = "kill_switch"):
        """Activate kill switch for a specific bot"""
        BOT_KILL_SWITCHES[bot_id] = True
        
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "kill_switch": True,
                    "status": "killed",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": reason
                }
            }
        )
        
        logger.warning(f"🚨 KILL SWITCH ACTIVATED for bot {bot_id}: {reason}")
    
    @staticmethod
    async def deactivate_global(admin_id: str = None):
        """Deactivate global kill switch"""
        global GLOBAL_KILL_SWITCH
        GLOBAL_KILL_SWITCH = False
        
        await db.platform_config.update_one(
            {"config_id": "bot_engine"},
            {
                "$set": {
                    "global_kill_switch": False,
                    "kill_switch_deactivated_at": datetime.now(timezone.utc),
                    "kill_switch_deactivated_by": admin_id
                }
            }
        )
        
        logger.info("✅ Global kill switch deactivated")
    
    @staticmethod
    async def deactivate_user(user_id: str, admin_id: str = None):
        """Deactivate kill switch for a user"""
        USER_KILL_SWITCHES.pop(user_id, None)
        
        await db.user_kill_switches.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "active": False,
                    "deactivated_at": datetime.now(timezone.utc),
                    "deactivated_by": admin_id
                }
            }
        )
        
        logger.info(f"✅ User kill switch deactivated for {user_id}")
    
    @staticmethod
    async def deactivate_bot(bot_id: str):
        """Deactivate kill switch for a specific bot"""
        BOT_KILL_SWITCHES.pop(bot_id, None)
        
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {"$set": {"kill_switch": False}}
        )
        
        logger.info(f"✅ Kill switch deactivated for bot {bot_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# RISK LIMITS ENFORCER (Phase 8) - Backend-Only Enforcement
# ═══════════════════════════════════════════════════════════════════════════════

class RiskLimitsEnforcer:
    """
    Enforces risk limits at the backend level - UI cannot bypass these.
    Checks are performed BEFORE every trade execution.
    """
    
    # Default limits (can be overridden per-bot)
    DEFAULT_MAX_DAILY_LOSS_PERCENT = 10.0   # 10% of allocated capital
    DEFAULT_MAX_TRADES_PER_DAY = 50
    DEFAULT_COOLDOWN_AFTER_LOSS_MINUTES = 15
    DEFAULT_COOLDOWN_AFTER_TRADE_MINUTES = 1
    
    @staticmethod
    async def check_all_limits(
        bot_id: str,
        user_id: str,
        trade_amount: float
    ) -> Tuple[bool, str]:
        """
        Check ALL risk limits before allowing a trade.
        Returns (is_allowed, error_message).
        This is called from the execution engine - NO UI BYPASS POSSIBLE.
        """
        errors = []
        
        # Load bot config and state
        bot_config = await bot_configs.find_one({"bot_id": bot_id})
        if not bot_config:
            return False, "Bot config not found"
        
        state = await StateManager.load_state(bot_id)
        risk_settings = bot_config.get("risk_settings", {})
        
        # 1. Check max daily loss
        max_daily_loss_percent = risk_settings.get(
            "max_daily_loss_percent", 
            RiskLimitsEnforcer.DEFAULT_MAX_DAILY_LOSS_PERCENT
        )
        capital_allocated = state.capital_allocated if state else bot_config.get("capital_allocated", 0)
        
        if capital_allocated > 0:
            daily_pnl = await RiskLimitsEnforcer._get_daily_pnl(bot_id)
            max_loss = capital_allocated * (max_daily_loss_percent / 100)
            
            if daily_pnl < -max_loss:
                errors.append(f"Max daily loss exceeded: {daily_pnl:.2f} < -{max_loss:.2f}")
        
        # 2. Check max trades per day
        max_trades = risk_settings.get(
            "max_trades_per_day",
            RiskLimitsEnforcer.DEFAULT_MAX_TRADES_PER_DAY
        )
        daily_trades = await RiskLimitsEnforcer._get_daily_trade_count(bot_id)
        
        if daily_trades >= max_trades:
            errors.append(f"Max daily trades reached: {daily_trades} >= {max_trades}")
        
        # 3. Check cooldown after loss
        if state and state.realized_pnl < 0:
            cooldown_minutes = risk_settings.get(
                "cooldown_after_loss_minutes",
                RiskLimitsEnforcer.DEFAULT_COOLDOWN_AFTER_LOSS_MINUTES
            )
            last_loss_trade = await RiskLimitsEnforcer._get_last_losing_trade(bot_id)
            
            if last_loss_trade:
                cooldown_end = last_loss_trade + timedelta(minutes=cooldown_minutes)
                if datetime.now(timezone.utc) < cooldown_end:
                    remaining = (cooldown_end - datetime.now(timezone.utc)).seconds // 60
                    errors.append(f"In loss cooldown: {remaining} minutes remaining")
        
        # 4. Check general trade cooldown
        cooldown_minutes = risk_settings.get(
            "cooldown_after_trade_minutes",
            RiskLimitsEnforcer.DEFAULT_COOLDOWN_AFTER_TRADE_MINUTES
        )
        last_trade = await RiskLimitsEnforcer._get_last_trade_time(bot_id)
        
        if last_trade:
            cooldown_end = last_trade + timedelta(minutes=cooldown_minutes)
            if datetime.now(timezone.utc) < cooldown_end:
                remaining = (cooldown_end - datetime.now(timezone.utc)).seconds
                errors.append(f"Trade cooldown active: {remaining} seconds remaining")
        
        # 5. Check stop-loss requirement
        if risk_settings.get("require_stop_loss", False):
            has_stop_loss = bot_config.get("params", {}).get("stop_loss_percent")
            if not has_stop_loss:
                errors.append("Stop-loss is required but not configured")
        
        if errors:
            # Log the risk violation
            await db.risk_violations.insert_one({
                "violation_id": str(uuid.uuid4()),
                "bot_id": bot_id,
                "user_id": user_id,
                "violations": errors,
                "trade_amount": trade_amount,
                "timestamp": datetime.now(timezone.utc)
            })
            return False, "; ".join(errors)
        
        return True, "All risk checks passed"
    
    @staticmethod
    async def _get_daily_pnl(bot_id: str) -> float:
        """Get today's realized PnL for a bot"""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        pipeline = [
            {"$match": {
                "bot_id": bot_id,
                "timestamp": {"$gte": today_start}
            }},
            {"$group": {
                "_id": None,
                "total_pnl": {"$sum": "$pnl"}
            }}
        ]
        
        result = await db.bot_trades.aggregate(pipeline).to_list(1)
        return result[0]["total_pnl"] if result else 0
    
    @staticmethod
    async def _get_daily_trade_count(bot_id: str) -> int:
        """Get today's trade count for a bot"""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        return await db.bot_trades.count_documents({
            "bot_id": bot_id,
            "timestamp": {"$gte": today_start}
        })
    
    @staticmethod
    async def _get_last_trade_time(bot_id: str) -> Optional[datetime]:
        """Get timestamp of last trade"""
        trade = await db.bot_trades.find_one(
            {"bot_id": bot_id},
            sort=[("timestamp", -1)]
        )
        return trade.get("timestamp") if trade else None
    
    @staticmethod
    async def _get_last_losing_trade(bot_id: str) -> Optional[datetime]:
        """Get timestamp of last losing trade"""
        trade = await db.bot_trades.find_one(
            {"bot_id": bot_id, "pnl": {"$lt": 0}},
            sort=[("timestamp", -1)]
        )
        return trade.get("timestamp") if trade else None


# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class StateManager:
    """
    Manage persistent bot state for restart-safety.
    State is checkpointed after every significant action.
    """
    
    @staticmethod
    def _calculate_checksum(state: Dict) -> str:
        """Calculate checksum for state integrity verification"""
        state_copy = {k: v for k, v in state.items() if k != "checksum"}
        state_str = json.dumps(state_copy, sort_keys=True, default=str)
        return hashlib.sha256(state_str.encode()).hexdigest()[:16]
    
    @staticmethod
    async def load_state(bot_id: str) -> Optional[BotState]:
        """Load bot state from database"""
        doc = await bot_states.find_one({"bot_id": bot_id})
        if not doc:
            return None
        
        # Verify checksum
        stored_checksum = doc.get("checksum")
        calculated_checksum = StateManager._calculate_checksum(doc)
        
        if stored_checksum and stored_checksum != calculated_checksum:
            logger.warning(f"State checksum mismatch for bot {bot_id}. State may be corrupted.")
        
        return BotState(
            bot_id=doc["bot_id"],
            user_id=doc["user_id"],
            status=doc["status"],
            last_tick_at=doc.get("last_tick_at"),
            last_decision_at=doc.get("last_decision_at"),
            capital_allocated=doc.get("capital_allocated", 0),
            capital_available=doc.get("capital_available", 0),
            total_invested=doc.get("total_invested", 0),
            realized_pnl=doc.get("realized_pnl", 0),
            unrealized_pnl=doc.get("unrealized_pnl", 0),
            total_fees_paid=doc.get("total_fees_paid", 0),
            total_orders_placed=doc.get("total_orders_placed", 0),
            total_orders_filled=doc.get("total_orders_filled", 0),
            total_orders_cancelled=doc.get("total_orders_cancelled", 0),
            active_order_ids=doc.get("active_order_ids", []),
            open_position_ids=doc.get("open_position_ids", []),
            last_error=doc.get("last_error"),
            error_count=doc.get("error_count", 0),
            consecutive_errors=doc.get("consecutive_errors", 0),
            cooldown_until=doc.get("cooldown_until"),
            checksum=doc.get("checksum"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc))
        )
    
    @staticmethod
    async def save_state(state: BotState):
        """Save bot state to database with checksum"""
        state_dict = asdict(state)
        state_dict["updated_at"] = datetime.now(timezone.utc)
        state_dict["checksum"] = StateManager._calculate_checksum(state_dict)
        
        await bot_states.update_one(
            {"bot_id": state.bot_id},
            {"$set": state_dict},
            upsert=True
        )
    
    @staticmethod
    async def create_state(bot_id: str, user_id: str, initial_capital: float) -> BotState:
        """Create new bot state"""
        state = BotState(
            bot_id=bot_id,
            user_id=user_id,
            status=BotStatus.DRAFT.value,
            capital_allocated=initial_capital,
            capital_available=initial_capital
        )
        await StateManager.save_state(state)
        return state
    
    @staticmethod
    async def update_after_order(state: BotState, order: Order) -> BotState:
        """Update state after an order is placed/filled"""
        state.total_orders_placed += 1
        state.total_fees_paid += order.fee
        state.updated_at = datetime.now(timezone.utc)
        
        if order.status == OrderStatus.FILLED.value:
            state.total_orders_filled += 1
            if order.order_id not in state.active_order_ids:
                pass  # Order was never in active list (filled immediately)
            else:
                state.active_order_ids.remove(order.order_id)
        elif order.status == OrderStatus.CANCELLED.value:
            state.total_orders_cancelled += 1
            if order.order_id in state.active_order_ids:
                state.active_order_ids.remove(order.order_id)
        elif order.status in [OrderStatus.OPEN.value, OrderStatus.PARTIALLY_FILLED.value]:
            if order.order_id not in state.active_order_ids:
                state.active_order_ids.append(order.order_id)
        
        await StateManager.save_state(state)
        return state
    
    @staticmethod
    async def record_error(state: BotState, error: str) -> BotState:
        """Record an error in bot state"""
        state.last_error = error
        state.error_count += 1
        state.consecutive_errors += 1
        state.updated_at = datetime.now(timezone.utc)
        
        # Cooldown after consecutive errors
        if state.consecutive_errors >= 5:
            state.cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=5)
            logger.warning(f"Bot {state.bot_id} in cooldown due to {state.consecutive_errors} consecutive errors")
        
        await StateManager.save_state(state)
        return state
    
    @staticmethod
    async def clear_errors(state: BotState) -> BotState:
        """Clear consecutive error count after successful action"""
        state.consecutive_errors = 0
        state.cooldown_until = None
        state.updated_at = datetime.now(timezone.utc)
        await StateManager.save_state(state)
        return state
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # RESTART RESILIENCE (Phase 8)
    # ═══════════════════════════════════════════════════════════════════════════════
    
    @staticmethod
    async def reload_active_bots() -> List[Dict]:
        """
        Reload all bots that were running before restart.
        Called on backend startup to resume bot operations.
        Returns list of bots that were reloaded.
        """
        reloaded = []
        
        # Find all bots that were running before shutdown
        running_bots = await bot_configs.find({
            "status": {"$in": ["running", "paused"]}
        }).to_list(None)
        
        for bot in running_bots:
            bot_id = bot["bot_id"]
            
            try:
                # Load persisted state
                state = await StateManager.load_state(bot_id)
                
                if state:
                    # Verify no duplicate trade in progress
                    pending_orders = await StateManager._check_pending_orders(bot_id)
                    
                    if pending_orders:
                        # Mark bot for manual review - potential duplicate risk
                        await bot_configs.update_one(
                            {"bot_id": bot_id},
                            {
                                "$set": {
                                    "status": "paused",
                                    "pause_reason": f"restart_pending_orders:{len(pending_orders)}",
                                    "requires_review": True
                                }
                            }
                        )
                        logger.warning(f"Bot {bot_id} paused on restart - has {len(pending_orders)} pending orders")
                    else:
                        reloaded.append({
                            "bot_id": bot_id,
                            "user_id": bot["user_id"],
                            "status": bot["status"],
                            "last_tick": state.last_tick_at,
                            "open_positions": len(state.open_position_ids)
                        })
                        logger.info(f"Bot {bot_id} reloaded successfully")
                else:
                    # No state found - create fresh state
                    state = await StateManager.create_state(
                        bot_id=bot_id,
                        user_id=bot["user_id"],
                        initial_capital=bot.get("params", {}).get("capital", 0)
                    )
                    reloaded.append({
                        "bot_id": bot_id,
                        "user_id": bot["user_id"],
                        "status": "fresh_state",
                        "last_tick": None,
                        "open_positions": 0
                    })
                    
            except Exception as e:
                logger.error(f"Failed to reload bot {bot_id}: {e}")
                await bot_configs.update_one(
                    {"bot_id": bot_id},
                    {"$set": {"status": "error", "last_error": str(e)}}
                )
        
        logger.info(f"Restart complete: {len(reloaded)} bots reloaded")
        return reloaded
    
    @staticmethod
    async def _check_pending_orders(bot_id: str) -> List[str]:
        """Check for any orders that were pending before restart"""
        pending = await db.bot_orders.find({
            "bot_id": bot_id,
            "status": {"$in": ["pending", "open", "partially_filled"]}
        }).to_list(None)
        
        return [o["order_id"] for o in pending]
    
    @staticmethod
    async def create_restart_checkpoint():
        """Create a checkpoint before graceful shutdown"""
        await db.system_checkpoints.insert_one({
            "checkpoint_id": str(uuid.uuid4()),
            "checkpoint_type": "pre_shutdown",
            "timestamp": datetime.now(timezone.utc),
            "running_bots": await bot_configs.count_documents({"status": "running"}),
            "paused_bots": await bot_configs.count_documents({"status": "paused"})
        })
        logger.info("Pre-shutdown checkpoint created")
    
    @staticmethod
    async def verify_no_duplicate_trades(bot_id: str, trade_id: str) -> bool:
        """
        Verify a trade hasn't already been executed (idempotency check).
        Returns True if trade is safe to execute, False if duplicate.
        """
        existing = await db.bot_trades.find_one({
            "bot_id": bot_id,
            "idempotency_key": trade_id
        })
        
        if existing:
            logger.warning(f"Duplicate trade detected: {trade_id} for bot {bot_id}")
            return False
        
        return True


# ═══════════════════════════════════════════════════════════════════════════════
# POSITION TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

class PositionManager:
    """Track open positions for bots"""
    
    @staticmethod
    async def open_position(
        bot_id: str,
        user_id: str,
        pair: str,
        side: str,
        quantity: float,
        entry_price: float,
        order_id: str,
        fee: float = 0
    ) -> Position:
        """Open a new position"""
        position_id = str(uuid.uuid4())
        
        position = Position(
            position_id=position_id,
            bot_id=bot_id,
            user_id=user_id,
            pair=pair,
            side=side,
            quantity=quantity,
            entry_price=entry_price,
            current_price=entry_price,
            total_fees=fee,
            order_ids=[order_id]
        )
        
        await bot_positions.insert_one(asdict(position))
        
        # Update bot state
        state = await StateManager.load_state(bot_id)
        if state:
            if position_id not in state.open_position_ids:
                state.open_position_ids.append(position_id)
            state.total_invested += quantity * entry_price
            await StateManager.save_state(state)
        
        logger.info(f"Opened position {position_id} for bot {bot_id}: {side} {quantity} {pair} @ {entry_price}")
        return position
    
    @staticmethod
    async def update_position(position_id: str, current_price: float) -> Optional[Position]:
        """Update position with current price and calculate unrealized PnL"""
        doc = await bot_positions.find_one({"position_id": position_id})
        if not doc:
            return None
        
        quantity = doc["quantity"]
        entry_price = doc["entry_price"]
        side = doc["side"]
        
        if side == "long":
            unrealized_pnl = (current_price - entry_price) * quantity
        else:  # short
            unrealized_pnl = (entry_price - current_price) * quantity
        
        await bot_positions.update_one(
            {"position_id": position_id},
            {
                "$set": {
                    "current_price": current_price,
                    "unrealized_pnl": unrealized_pnl,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        doc["current_price"] = current_price
        doc["unrealized_pnl"] = unrealized_pnl
        return Position(**{k: v for k, v in doc.items() if k != "_id"})
    
    @staticmethod
    async def close_position(
        position_id: str,
        exit_price: float,
        order_id: str,
        fee: float = 0
    ) -> Optional[Tuple[Position, float]]:
        """Close a position and calculate realized PnL"""
        doc = await bot_positions.find_one({"position_id": position_id})
        if not doc:
            return None
        
        quantity = doc["quantity"]
        entry_price = doc["entry_price"]
        side = doc["side"]
        total_fees = doc.get("total_fees", 0) + fee
        
        if side == "long":
            gross_pnl = (exit_price - entry_price) * quantity
        else:  # short
            gross_pnl = (entry_price - exit_price) * quantity
        
        realized_pnl = gross_pnl - total_fees
        
        # Update position as closed
        await bot_positions.update_one(
            {"position_id": position_id},
            {
                "$set": {
                    "current_price": exit_price,
                    "unrealized_pnl": 0,
                    "realized_pnl": realized_pnl,
                    "total_fees": total_fees,
                    "closed_at": datetime.now(timezone.utc),
                    "exit_price": exit_price,
                    "status": "closed"
                },
                "$push": {"order_ids": order_id}
            }
        )
        
        # Update bot state
        bot_id = doc["bot_id"]
        state = await StateManager.load_state(bot_id)
        if state:
            if position_id in state.open_position_ids:
                state.open_position_ids.remove(position_id)
            state.realized_pnl += realized_pnl
            await StateManager.save_state(state)
        
        logger.info(f"Closed position {position_id}: realized PnL = {realized_pnl:.4f}")
        
        doc["realized_pnl"] = realized_pnl
        return Position(**{k: v for k, v in doc.items() if k != "_id"}), realized_pnl
    
    @staticmethod
    async def add_to_position(
        position_id: str,
        quantity: float,
        price: float,
        order_id: str,
        fee: float = 0
    ) -> Optional[Position]:
        """Add to an existing position (averaging)"""
        doc = await bot_positions.find_one({"position_id": position_id})
        if not doc:
            return None
        
        old_quantity = doc["quantity"]
        old_entry_price = doc["entry_price"]
        
        # Calculate new average entry price
        new_quantity = old_quantity + quantity
        new_entry_price = ((old_quantity * old_entry_price) + (quantity * price)) / new_quantity
        
        await bot_positions.update_one(
            {"position_id": position_id},
            {
                "$set": {
                    "quantity": new_quantity,
                    "entry_price": new_entry_price,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$inc": {"total_fees": fee},
                "$push": {"order_ids": order_id}
            }
        )
        
        doc["quantity"] = new_quantity
        doc["entry_price"] = new_entry_price
        return Position(**{k: v for k, v in doc.items() if k != "_id"})
    
    @staticmethod
    async def get_open_positions(bot_id: str) -> List[Position]:
        """Get all open positions for a bot"""
        cursor = bot_positions.find({
            "bot_id": bot_id,
            "status": {"$ne": "closed"}
        })
        positions = []
        async for doc in cursor:
            positions.append(Position(**{k: v for k, v in doc.items() if k != "_id"}))
        return positions


# ═══════════════════════════════════════════════════════════════════════════════
# ORDER MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class OrderManager:
    """
    Handle order lifecycle:
    - Creation with validation
    - Submission with idempotency
    - Status updates
    - Fill handling
    """
    
    @staticmethod
    async def validate_order(request: OrderRequest, current_price: float) -> Tuple[bool, str]:
        """Validate order request before submission"""
        # Check kill switch
        killed, reason = await KillSwitch.is_killed(request.bot_id)
        if killed:
            return False, reason
        
        # Check rate limits
        allowed, limit_reason = await RateLimiter.check_rate_limit(request.bot_id, request.user_id)
        if not allowed:
            return False, limit_reason
        
        # Validate precision
        request.quantity = PrecisionHandler.round_quantity(request.quantity, request.pair)
        if request.price:
            request.price = PrecisionHandler.round_price(request.price, request.pair)
        
        # Validate minimum notional
        price_for_check = request.price or current_price
        if not PrecisionHandler.validate_min_notional(request.quantity, price_for_check, request.pair):
            precision = PrecisionHandler.get_precision(request.pair)
            return False, f"Order below minimum notional value ({precision['min_notional']})"
        
        # Validate slippage
        if request.order_type == OrderType.MARKET:
            worst_price = PrecisionHandler.calculate_slippage_price(
                current_price, request.side, request.max_slippage_percent
            )
            if request.side == OrderSide.BUY and request.price and request.price > worst_price:
                return False, f"Price exceeds max slippage ({request.max_slippage_percent}%)"
            elif request.side == OrderSide.SELL and request.price and request.price < worst_price:
                return False, f"Price exceeds max slippage ({request.max_slippage_percent}%)"
        
        return True, "OK"
    
    @staticmethod
    async def create_order(
        request: OrderRequest,
        current_price: float
    ) -> Tuple[Optional[Order], str]:
        """
        Create and validate an order.
        Returns (Order, status_message)
        """
        # Generate idempotency key
        idem_key = request.client_order_id or IdempotencyManager.generate_key(
            request.bot_id,
            "order",
            {
                "pair": request.pair,
                "side": request.side.value,
                "quantity": request.quantity,
                "price": request.price,
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
            }
        )
        
        # Check idempotency
        is_new, existing_result = await IdempotencyManager.check_and_set(idem_key)
        if not is_new and existing_result:
            logger.info(f"Duplicate order detected for key {idem_key}")
            return None, "Duplicate order prevented by idempotency"
        
        # Validate
        valid, validation_msg = await OrderManager.validate_order(request, current_price)
        if not valid:
            return None, validation_msg
        
        # Create order
        order_id = str(uuid.uuid4())
        order = Order(
            order_id=order_id,
            bot_id=request.bot_id,
            user_id=request.user_id,
            pair=request.pair,
            side=request.side.value,
            order_type=request.order_type.value,
            quantity=request.quantity,
            price=request.price,
            stop_price=request.stop_price,
            status=OrderStatus.PENDING.value,
            client_order_id=idem_key,
            metadata=request.metadata
        )
        
        # Save to database
        await bot_orders.insert_one(asdict(order))
        
        # Record rate limit
        await RateLimiter.record_order(request.bot_id, request.user_id)
        
        logger.info(f"Order created: {order_id} - {request.side.value} {request.quantity} {request.pair}")
        
        return order, "Order created"
    
    @staticmethod
    async def update_order_status(
        order_id: str,
        status: OrderStatus,
        filled_quantity: float = None,
        average_fill_price: float = None,
        fee: float = None,
        error_message: str = None
    ) -> Optional[Order]:
        """Update order status and fields"""
        update_fields = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if filled_quantity is not None:
            update_fields["filled_quantity"] = filled_quantity
        if average_fill_price is not None:
            update_fields["average_fill_price"] = average_fill_price
        if fee is not None:
            update_fields["fee"] = fee
        if error_message:
            update_fields["error_message"] = error_message
        
        if status == OrderStatus.FILLED:
            update_fields["filled_at"] = datetime.now(timezone.utc)
        
        result = await bot_orders.find_one_and_update(
            {"order_id": order_id},
            {"$set": update_fields},
            return_document=True
        )
        
        if result:
            # Update idempotency result
            if result.get("client_order_id"):
                await IdempotencyManager.set_result(
                    result["client_order_id"],
                    {"order_id": order_id, "status": status.value}
                )
            
            return Order(**{k: v for k, v in result.items() if k != "_id"})
        
        return None
    
    @staticmethod
    async def get_active_orders(bot_id: str) -> List[Order]:
        """Get all active (open/partially filled) orders for a bot"""
        cursor = bot_orders.find({
            "bot_id": bot_id,
            "status": {"$in": [
                OrderStatus.PENDING.value,
                OrderStatus.SUBMITTED.value,
                OrderStatus.OPEN.value,
                OrderStatus.PARTIALLY_FILLED.value
            ]}
        })
        orders = []
        async for doc in cursor:
            orders.append(Order(**{k: v for k, v in doc.items() if k != "_id"}))
        return orders
    
    @staticmethod
    async def cancel_order(order_id: str, reason: str = "user_cancelled") -> bool:
        """Cancel an order"""
        result = await bot_orders.update_one(
            {
                "order_id": order_id,
                "status": {"$in": [
                    OrderStatus.PENDING.value,
                    OrderStatus.SUBMITTED.value,
                    OrderStatus.OPEN.value,
                    OrderStatus.PARTIALLY_FILLED.value
                ]}
            },
            {
                "$set": {
                    "status": OrderStatus.CANCELLED.value,
                    "updated_at": datetime.now(timezone.utc),
                    "error_message": reason
                }
            }
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def cancel_all_bot_orders(bot_id: str, reason: str = "bot_stopped") -> int:
        """Cancel all active orders for a bot"""
        result = await bot_orders.update_many(
            {
                "bot_id": bot_id,
                "status": {"$in": [
                    OrderStatus.PENDING.value,
                    OrderStatus.SUBMITTED.value,
                    OrderStatus.OPEN.value,
                    OrderStatus.PARTIALLY_FILLED.value
                ]}
            },
            {
                "$set": {
                    "status": OrderStatus.CANCELLED.value,
                    "updated_at": datetime.now(timezone.utc),
                    "error_message": reason
                }
            }
        )
        
        return result.modified_count


# ═══════════════════════════════════════════════════════════════════════════════
# DECISION LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

class DecisionLogger:
    """
    Log every bot decision with full context for audit trail.
    This is required for Phase 6 transparency requirements.
    """
    
    @staticmethod
    async def log_decision(
        bot_id: str,
        decision_type: str,  # "entry", "exit", "skip", "error"
        reason: str,
        indicator_values: Dict[str, Any],
        strategy_config: Dict[str, Any],
        order_id: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ):
        """Log a bot decision with full context"""
        log_entry = {
            "log_id": str(uuid.uuid4()),
            "bot_id": bot_id,
            "decision_type": decision_type,
            "reason": reason,
            "indicator_values": indicator_values,
            "strategy_config": strategy_config,
            "order_id": order_id,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc)
        }
        
        await bot_decision_logs.insert_one(log_entry)
        
        logger.info(f"Bot {bot_id} decision: {decision_type} - {reason}")
    
    @staticmethod
    async def get_decision_logs(
        bot_id: str,
        limit: int = 100,
        decision_type: Optional[str] = None
    ) -> List[Dict]:
        """Get decision logs for a bot"""
        query = {"bot_id": bot_id}
        if decision_type:
            query["decision_type"] = decision_type
        
        cursor = bot_decision_logs.find(query).sort("timestamp", -1).limit(limit)
        logs = []
        async for doc in cursor:
            doc.pop("_id", None)
            logs.append(doc)
        return logs


# ═══════════════════════════════════════════════════════════════════════════════
# CANDLE INGESTION
# ═══════════════════════════════════════════════════════════════════════════════

class CandleManager:
    """
    Handle multi-timeframe candle data for bots.
    Provides normalized OHLCV data for indicator calculations.
    """
    
    TIMEFRAME_SECONDS = {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "30m": 1800,
        "1h": 3600,
        "4h": 14400,
        "1d": 86400
    }
    
    @staticmethod
    async def get_candles(
        pair: str,
        timeframe: str,
        limit: int = 200
    ) -> List[Dict]:
        """
        Get OHLCV candles for a pair and timeframe.
        Returns list of {timestamp, open, high, low, close, volume}
        """
        # Try to get from cache/database first
        cache_key = f"candles:{pair}:{timeframe}"
        
        cached = await db.candle_cache.find_one({"cache_key": cache_key})
        if cached:
            updated_at = cached.get("updated_at")
            if updated_at:
                # Ensure timezone-aware comparison
                if updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=timezone.utc)
                age = datetime.now(timezone.utc) - updated_at
                if age.total_seconds() < CandleManager.TIMEFRAME_SECONDS.get(timeframe, 3600) / 2:
                    return cached.get("candles", [])[:limit]
        
        # Fetch from external source (CoinGecko or similar)
        candles = await CandleManager._fetch_candles(pair, timeframe, limit)
        
        # Cache the result
        if candles:
            await db.candle_cache.update_one(
                {"cache_key": cache_key},
                {
                    "$set": {
                        "candles": candles,
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
        
        return candles
    
    @staticmethod
    async def _fetch_candles(pair: str, timeframe: str, limit: int) -> List[Dict]:
        """Fetch candles from external source"""
        import httpx
        
        # Map trading pair to CoinGecko coin ID
        COIN_ID_MAP = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "SOL": "solana",
            "XRP": "ripple",
            "ADA": "cardano",
            "DOGE": "dogecoin",
            "LINK": "chainlink",
            "DOT": "polkadot",
            "AVAX": "avalanche-2",
            "MATIC": "matic-network",
            "LTC": "litecoin",
            "UNI": "uniswap",
            "ATOM": "cosmos",
            "BCH": "bitcoin-cash"
        }
        
        # Extract base currency from pair (e.g., BTC from BTCUSD)
        base = pair[:3].upper() if len(pair) >= 6 else pair.upper()
        coin_id = COIN_ID_MAP.get(base, base.lower())
        
        # Map timeframe to CoinGecko days
        days_map = {
            "1m": 1,
            "5m": 1,
            "15m": 1,
            "30m": 2,
            "1h": 7,
            "4h": 30,
            "1d": 90
        }
        days = days_map.get(timeframe, 7)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc",
                    params={"vs_currency": "usd", "days": days},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    candles = [
                        {
                            "timestamp": int(c[0] / 1000),
                            "open": c[1],
                            "high": c[2],
                            "low": c[3],
                            "close": c[4],
                            "volume": 0  # CoinGecko OHLC doesn't include volume
                        }
                        for c in data[-limit:]
                    ]
                    return candles
                else:
                    logger.warning(f"CoinGecko API returned {response.status_code} for {coin_id}")
        except Exception as e:
            logger.error(f"Error fetching candles for {pair}: {e}")
        
        return []
    
    @staticmethod
    async def get_latest_price(pair: str) -> Optional[float]:
        """Get latest price for a pair"""
        candles = await CandleManager.get_candles(pair, "1h", limit=1)
        if candles:
            return candles[-1]["close"]
        
        # Map trading pair to CoinGecko coin ID
        COIN_ID_MAP = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "SOL": "solana",
            "XRP": "ripple",
            "ADA": "cardano",
            "DOGE": "dogecoin",
            "LINK": "chainlink",
            "DOT": "polkadot",
            "AVAX": "avalanche-2",
            "MATIC": "matic-network",
            "LTC": "litecoin",
            "UNI": "uniswap",
            "ATOM": "cosmos",
            "BCH": "bitcoin-cash"
        }
        
        # Fallback to price service
        try:
            import httpx
            base = pair[:3].upper() if len(pair) >= 6 else pair.upper()
            coin_id = COIN_ID_MAP.get(base, base.lower())
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.coingecko.com/api/v3/simple/price",
                    params={"ids": coin_id, "vs_currencies": "usd"},
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get(coin_id, {}).get("usd")
        except Exception as e:
            logger.error(f"Error fetching price for {pair}: {e}")
        
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# BOT EXECUTION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class BotExecutionEngine:
    """
    Main bot execution engine.
    Handles the deterministic execution loop for all bot types.
    """
    
    @staticmethod
    async def initialize_bot(bot_id: str) -> Tuple[bool, str]:
        """
        Initialize or resume a bot.
        Checks state integrity and prepares for execution.
        """
        # Load bot config
        config = await bot_configs.find_one({"bot_id": bot_id})
        if not config:
            return False, "Bot not found"
        
        user_id = config["user_id"]
        
        # Check kill switch
        killed, reason = await KillSwitch.is_killed(bot_id)
        if killed:
            return False, reason
        
        # Load or create state
        state = await StateManager.load_state(bot_id)
        if not state:
            # Create new state
            investment = config.get("params", {}).get("investment_amount", 0)
            state = await StateManager.create_state(bot_id, user_id, investment)
        else:
            # Resume existing state - verify integrity
            logger.info(f"Resuming bot {bot_id} with {len(state.active_order_ids)} active orders")
            
            # Sync active orders status
            for order_id in state.active_order_ids:
                order_doc = await bot_orders.find_one({"order_id": order_id})
                if order_doc:
                    # Check if order is still active
                    if order_doc["status"] not in [
                        OrderStatus.PENDING.value,
                        OrderStatus.SUBMITTED.value,
                        OrderStatus.OPEN.value,
                        OrderStatus.PARTIALLY_FILLED.value
                    ]:
                        state.active_order_ids.remove(order_id)
            
            await StateManager.save_state(state)
        
        # Update bot status
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "status": "running",
                    "started_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Update state
        state.status = BotStatus.RUNNING.value
        await StateManager.save_state(state)
        
        logger.info(f"Bot {bot_id} initialized successfully")
        return True, "Bot initialized"
    
    @staticmethod
    async def execute_tick(bot_id: str) -> Dict[str, Any]:
        """
        Execute a single tick for a bot.
        This is the deterministic execution loop.
        Returns tick result with any actions taken.
        """
        tick_start = datetime.now(timezone.utc)
        result = {
            "bot_id": bot_id,
            "tick_time": tick_start,
            "actions": [],
            "errors": [],
            "status": "ok"
        }
        
        # Load state
        state = await StateManager.load_state(bot_id)
        if not state:
            result["status"] = "error"
            result["errors"].append("Bot state not found")
            return result
        
        # Check cooldown
        if state.cooldown_until and state.cooldown_until > tick_start:
            result["status"] = "cooldown"
            result["actions"].append(f"In cooldown until {state.cooldown_until}")
            return result
        
        # Check kill switch
        killed, reason = await KillSwitch.is_killed(bot_id)
        if killed:
            result["status"] = "killed"
            result["errors"].append(reason)
            return result
        
        # Load config
        config = await bot_configs.find_one({"bot_id": bot_id})
        if not config:
            result["status"] = "error"
            result["errors"].append("Bot config not found")
            return result
        
        bot_type = config.get("type")
        pair = config.get("pair")
        params = config.get("params", {})
        
        # Get current price
        current_price = await CandleManager.get_latest_price(pair)
        if not current_price:
            result["status"] = "error"
            result["errors"].append("Could not fetch current price")
            state = await StateManager.record_error(state, "Price fetch failed")
            return result
        
        # Update open positions with current price
        for position_id in state.open_position_ids:
            await PositionManager.update_position(position_id, current_price)
        
        # Execute based on bot type - using new Phase 3 Bot Types
        try:
            from bot_types import BotTypeFactory
            
            # Get bot-specific state (separate from main state)
            bot_state_doc = await db.bot_type_states.find_one({"bot_id": bot_id})
            bot_type_state = bot_state_doc.get("state", {}) if bot_state_doc else {}
            
            # Execute using factory
            exec_result = await BotTypeFactory.execute_bot(
                bot_type=bot_type,
                bot_id=bot_id,
                config=config,
                state=bot_type_state,
                current_price=current_price
            )
            
            actions = exec_result.get("actions", [])
            new_state = exec_result.get("state", {})
            
            # Save bot-specific state
            await db.bot_type_states.update_one(
                {"bot_id": bot_id},
                {"$set": {"state": new_state, "updated_at": datetime.now(timezone.utc)}},
                upsert=True
            )
            
            result["actions"] = actions
            
            # Clear errors on success
            await StateManager.clear_errors(state)
            
        except Exception as e:
            logger.exception(f"Error executing bot {bot_id}: {e}")
            result["status"] = "error"
            result["errors"].append(str(e))
            state = await StateManager.record_error(state, str(e))
        
        # Update last tick time
        state.last_tick_at = tick_start
        await StateManager.save_state(state)
        
        return result
    
    @staticmethod
    async def _execute_signal_bot(
        config: Dict,
        state: BotState,
        current_price: float
    ) -> List[str]:
        """Execute signal bot logic using the Signal Engine"""
        actions = []
        bot_id = config.get("bot_id")
        pair = config.get("pair")
        params = config.get("params", {})
        user_id = config.get("user_id")
        
        try:
            from signal_engine import StrategyBuilder, DecisionEngine, ConditionEvaluator
            from bot_execution_engine import PositionManager
            
            # Build strategy from bot params
            strategy_config = params.get("strategy", {})
            if not strategy_config:
                actions.append("No strategy configured")
                return actions
            
            strategy = StrategyBuilder.from_dict(strategy_config)
            
            # Check cooldown
            if await DecisionEngine.check_cooldown(bot_id, strategy.cooldown_after_trade_minutes):
                actions.append(f"In cooldown period ({strategy.cooldown_after_trade_minutes} min)")
                return actions
            
            # Determine current position
            open_positions = await PositionManager.get_open_positions(bot_id)
            current_position = None
            if open_positions:
                current_position = open_positions[0].side
            
            # Evaluate strategy
            signal, eval_details = await DecisionEngine.evaluate_strategy(
                strategy=strategy,
                pair=pair,
                bot_id=bot_id,
                current_position=current_position
            )
            
            if signal:
                actions.append(f"Signal generated: {signal.signal_type} ({signal.confidence:.0%} confidence)")
                
                # Log the decision
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type=signal.signal_type,
                    reason=signal.trigger_reason,
                    indicator_values=signal.indicator_snapshot,
                    strategy_config={"strategy_id": strategy.strategy_id, "name": strategy.name},
                    metadata={
                        "signal_id": signal.signal_id,
                        "confidence": signal.confidence,
                        "price": current_price,
                        "conditions_evaluated": signal.conditions_evaluated
                    }
                )
                
                # Execute the signal if not in paper mode
                if not config.get("paper_mode", False):
                    success, message, order_id = await DecisionEngine.execute_signal(
                        signal, strategy, user_id
                    )
                    if success:
                        actions.append(f"Order placed: {order_id}")
                    else:
                        actions.append(f"Order failed: {message}")
                else:
                    actions.append("Paper mode - no real order placed")
            else:
                actions.append(f"No signal at price {current_price}")
                
                # Log the skip decision
                await DecisionLogger.log_decision(
                    bot_id=bot_id,
                    decision_type="skip",
                    reason="No entry/exit conditions met",
                    indicator_values=eval_details.get("indicator_snapshot", {}),
                    strategy_config={"strategy_id": strategy.strategy_id},
                    metadata={
                        "price": current_price,
                        "entry_result": eval_details.get("entry_evaluation", {}).get("result"),
                        "exit_result": eval_details.get("exit_evaluation", {}).get("result")
                    }
                )
        
        except Exception as e:
            logger.error(f"Signal bot execution error: {e}")
            actions.append(f"Error: {str(e)}")
        
        return actions
    
    @staticmethod
    async def _execute_dca_bot(
        config: Dict,
        state: BotState,
        current_price: float
    ) -> List[str]:
        """Execute DCA bot logic"""
        actions = []
        # DCA bot implementation will be completed in Phase 3
        # This is the foundation hook
        actions.append(f"DCA bot tick at price {current_price}")
        return actions
    
    @staticmethod
    async def _execute_grid_bot(
        config: Dict,
        state: BotState,
        current_price: float
    ) -> List[str]:
        """Execute grid bot logic"""
        actions = []
        # Grid bot implementation will be completed in Phase 3
        # This is the foundation hook
        actions.append(f"Grid bot tick at price {current_price}")
        return actions
    
    @staticmethod
    async def stop_bot(bot_id: str, cancel_orders: bool = True) -> Tuple[bool, str]:
        """Stop a bot gracefully"""
        # Update config
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "status": "stopped",
                    "stopped_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Update state
        state = await StateManager.load_state(bot_id)
        if state:
            state.status = BotStatus.STOPPED.value
            await StateManager.save_state(state)
        
        # Cancel orders if requested
        cancelled_count = 0
        if cancel_orders:
            cancelled_count = await OrderManager.cancel_all_bot_orders(bot_id, "bot_stopped")
        
        logger.info(f"Bot {bot_id} stopped. Cancelled {cancelled_count} orders.")
        return True, f"Bot stopped. Cancelled {cancelled_count} orders."
    
    @staticmethod
    async def pause_bot(bot_id: str) -> Tuple[bool, str]:
        """Pause a bot (keeps orders active)"""
        await bot_configs.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "status": "paused",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        state = await StateManager.load_state(bot_id)
        if state:
            state.status = BotStatus.PAUSED.value
            await StateManager.save_state(state)
        
        return True, "Bot paused"


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Enums
    "OrderStatus",
    "OrderType",
    "OrderSide",
    "BotStatus",
    "PositionSide",
    "ExecutionMode",  # Phase 8
    
    # Data Classes
    "OrderRequest",
    "Order",
    "Position",
    "BotState",
    
    # Core Components
    "PrecisionHandler",
    "IdempotencyManager",
    "RateLimiter",
    "KillSwitch",
    "StateManager",
    "PositionManager",
    "OrderManager",
    "DecisionLogger",
    "CandleManager",
    "BotExecutionEngine",
    
    # Phase 8 Additions
    "LiveModeValidator",
    "RiskLimitsEnforcer",
    "validate_execution_mode",
    "get_mode_badge",
    "LIVE_MODE_REQUIREMENTS",
]
