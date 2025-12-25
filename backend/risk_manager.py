"""
🛡️ COINHUBX RISK MANAGEMENT ENGINE - PHASE 4
═══════════════════════════════════════════════════════════════════════════════

COMPREHENSIVE RISK MANAGEMENT:

4.1 Global Risk Settings (Admin + System)
    - Max concurrent positions
    - Max open orders
    - Max daily loss limit
    - Max drawdown limit
    - Allowed symbols whitelist/blacklist
    - Cooldown after stop-out
    - Slippage/spread protection
    - Kill switch (global/user/bot)

4.2 Per-Bot Risk Settings (Overrides)
    - Position sizing mode
    - Stop Loss / Take Profit
    - Trailing stop
    - Time stop
    - Max DCA/Grid levels

4.3 Risk Engine Enforcement
    - Single validation point for ALL orders
    - RISK_PASS / RISK_BLOCK with reason codes

4.4 Kill Switch + Emergency Exit
    - Global disable
    - Per-user disable
    - Per-bot disable
    - Close all positions

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import logging
import json

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
risk_global_config = db.risk_global_config
risk_user_config = db.risk_user_config
risk_bot_config = db.risk_bot_config
risk_violations = db.risk_violations
kill_switch_log = db.kill_switch_log
daily_pnl_tracker = db.daily_pnl_tracker


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

class RiskResult(Enum):
    PASS = "RISK_PASS"
    BLOCK = "RISK_BLOCK"

class RiskBlockReason(Enum):
    KILL_SWITCH_GLOBAL = "KILL_SWITCH_GLOBAL"
    KILL_SWITCH_USER = "KILL_SWITCH_USER"
    KILL_SWITCH_BOT = "KILL_SWITCH_BOT"
    SYMBOL_NOT_ALLOWED = "SYMBOL_NOT_ALLOWED"
    SYMBOL_BLACKLISTED = "SYMBOL_BLACKLISTED"
    TIMEFRAME_NOT_ALLOWED = "TIMEFRAME_NOT_ALLOWED"
    MAX_POSITIONS_EXCEEDED = "MAX_POSITIONS_EXCEEDED"
    MAX_ORDERS_EXCEEDED = "MAX_ORDERS_EXCEEDED"
    DAILY_LOSS_LIMIT = "DAILY_LOSS_LIMIT"
    DRAWDOWN_LIMIT = "DRAWDOWN_LIMIT"
    POSITION_SIZE_EXCEEDED = "POSITION_SIZE_EXCEEDED"
    SLIPPAGE_EXCEEDED = "SLIPPAGE_EXCEEDED"
    SPREAD_EXCEEDED = "SPREAD_EXCEEDED"
    PRICE_DEVIATION_EXCEEDED = "PRICE_DEVIATION_EXCEEDED"
    LOW_LIQUIDITY = "LOW_LIQUIDITY"
    COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE"
    NO_STOP_LOSS = "NO_STOP_LOSS"
    NO_TAKE_PROFIT = "NO_TAKE_PROFIT"
    MAX_DCA_LEVELS = "MAX_DCA_LEVELS"
    MAX_GRID_LEVELS = "MAX_GRID_LEVELS"
    RATE_LIMIT = "RATE_LIMIT"
    ONE_BOT_PER_SYMBOL = "ONE_BOT_PER_SYMBOL"

class PositionSizingMode(Enum):
    FIXED = "fixed"              # Fixed size in quote currency
    PERCENT_EQUITY = "percent"   # % of account equity
    RISK_BASED = "risk"          # Based on SL distance and max risk %


# ═══════════════════════════════════════════════════════════════════════════════
# 4.1 GLOBAL RISK CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GlobalRiskConfig:
    """
    Global risk settings that apply to ALL bots by default.
    Admin can modify these. Per-bot settings can override.
    """
    # Position limits
    max_concurrent_positions_global: int = 100       # Total platform limit
    max_concurrent_positions_per_user: int = 10      # Per user
    max_concurrent_positions_per_bot: int = 3        # Per bot
    max_open_orders_per_bot: int = 20                # Max pending orders per bot
    
    # Loss limits
    max_daily_loss_percent: float = 10.0             # Max daily loss as % of equity
    max_daily_loss_absolute: float = 10000           # Max daily loss in USD
    max_drawdown_percent: float = 25.0               # Max drawdown from peak
    max_drawdown_absolute: float = 25000             # Max drawdown in USD
    
    # Leverage (if applicable)
    max_leverage: float = 10.0                       # Max leverage allowed
    
    # Symbol restrictions
    allowed_symbols: List[str] = field(default_factory=lambda: [
        "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "ADAUSD",
        "DOGEUSD", "LINKUSD", "DOTUSD", "AVAXUSD", "MATICUSD"
    ])
    blacklisted_symbols: List[str] = field(default_factory=list)
    
    # Timeframe restrictions
    allowed_timeframes: List[str] = field(default_factory=lambda: [
        "1m", "5m", "15m", "30m", "1h", "4h", "1d"
    ])
    
    # Cooldowns
    cooldown_after_stopout_minutes: int = 30         # Cooldown after stop-out
    cooldown_after_loss_minutes: int = 5             # Cooldown after any loss
    
    # Protection thresholds
    max_slippage_percent: float = 1.0                # Max allowed slippage
    max_spread_percent: float = 0.5                  # Block if spread too wide
    max_price_deviation_percent: float = 5.0         # Block if price deviation too high
    min_volume_24h_usd: float = 100000               # Min 24h volume requirement
    
    # Rate limits
    max_orders_per_minute: int = 60
    max_orders_per_hour: int = 500
    
    # Kill switches (stored separately but linked)
    global_kill_switch: bool = False
    
    # Require SL/TP
    require_stop_loss: bool = True
    require_take_profit: bool = False
    
    # Misc
    one_bot_per_symbol_per_user: bool = False        # Only one active bot per symbol
    
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str = "system"


# ═══════════════════════════════════════════════════════════════════════════════
# 4.2 PER-BOT RISK CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BotRiskConfig:
    """
    Per-bot risk settings that can override global defaults.
    """
    bot_id: str
    
    # Position sizing
    position_sizing_mode: str = "fixed"              # "fixed", "percent", "risk"
    position_size_value: float = 100                 # Amount or percentage
    max_position_size: float = 1000                  # Maximum position value
    max_entries: int = 1                             # Max pyramiding entries
    
    # Stop Loss
    stop_loss_enabled: bool = True
    stop_loss_type: str = "percent"                  # "percent", "atr", "fixed"
    stop_loss_value: float = 5.0                     # % or ATR multiplier or price
    
    # Take Profit
    take_profit_enabled: bool = True
    take_profit_type: str = "percent"                # "percent", "r_multiple", "fixed"
    take_profit_value: float = 10.0                  # % or R multiple or price
    
    # Trailing Stop
    trailing_stop_enabled: bool = False
    trailing_stop_distance: float = 1.0              # Trailing distance %
    trailing_stop_activation: float = 2.0            # Activate after X% profit
    
    # Break-even
    break_even_enabled: bool = False
    break_even_trigger: float = 1.5                  # Move SL to BE at X% profit
    break_even_offset: float = 0.1                   # Offset from entry
    
    # Time stop
    time_stop_enabled: bool = False
    time_stop_minutes: int = 0                       # Close after X minutes
    time_stop_candles: int = 0                       # Close after X candles
    
    # DCA specific
    max_dca_levels: int = 5                          # Max safety orders
    dca_sizing_multiplier: float = 1.5               # Safety order scaling
    dca_max_exposure: float = 5000                   # Max total investment
    
    # Grid specific
    max_grid_levels: int = 20                        # Max grid levels
    grid_max_exposure: float = 5000                  # Max grid capital
    
    # Overrides
    override_max_positions: Optional[int] = None     # Override global max positions
    override_max_orders: Optional[int] = None        # Override global max orders
    override_max_daily_loss: Optional[float] = None  # Override daily loss limit
    
    # Kill switch
    kill_switch: bool = False
    
    # Cooldown
    cooldown_until: Optional[datetime] = None
    
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════════════════
# ORDER INTENT (What the bot wants to do)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class OrderIntent:
    """
    Order intent from strategy - validated by RiskManager before execution.
    """
    intent_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    bot_id: str = ""
    user_id: str = ""
    
    # Order details
    action: str = "BUY"                              # "BUY", "SELL", "EXIT"
    symbol: str = "BTCUSD"
    timeframe: str = "1h"
    quantity: float = 0
    price: Optional[float] = None                    # For limit orders
    order_type: str = "market"                       # "market", "limit"
    
    # Risk parameters
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None
    
    # Context
    current_price: float = 0
    current_positions: int = 0
    current_orders: int = 0
    daily_pnl: float = 0
    bot_type: str = "signal"                         # "signal", "dca", "grid"
    dca_level: int = 0                               # For DCA bots
    grid_level: int = 0                              # For Grid bots
    
    # Market data
    bid_price: Optional[float] = None
    ask_price: Optional[float] = None
    spread_percent: float = 0
    volume_24h: float = 0
    last_candle_close: Optional[float] = None
    
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RiskValidationResult:
    """
    Result of risk validation.
    """
    result: str = RiskResult.PASS.value              # RISK_PASS or RISK_BLOCK
    passed: bool = True
    reason: Optional[str] = None                     # Block reason code
    reason_detail: str = ""                          # Human readable detail
    checks_passed: List[str] = field(default_factory=list)
    checks_failed: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict:
        return {
            "result": self.result,
            "passed": self.passed,
            "reason": self.reason,
            "reason_detail": self.reason_detail,
            "checks_passed": self.checks_passed,
            "checks_failed": self.checks_failed,
            "timestamp": self.timestamp.isoformat()
        }


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL RISK CONFIG MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class GlobalRiskConfigManager:
    """
    Manage global risk configuration.
    """
    
    CONFIG_ID = "global_risk_config"
    _cache: Optional[GlobalRiskConfig] = None
    _cache_time: Optional[datetime] = None
    CACHE_TTL_SECONDS = 60
    
    @classmethod
    async def get_config(cls, force_refresh: bool = False) -> GlobalRiskConfig:
        """Get global risk config with caching"""
        now = datetime.now(timezone.utc)
        
        # Check cache
        if not force_refresh and cls._cache and cls._cache_time:
            age = (now - cls._cache_time).total_seconds()
            if age < cls.CACHE_TTL_SECONDS:
                return cls._cache
        
        # Load from DB
        doc = await risk_global_config.find_one({"config_id": cls.CONFIG_ID})
        
        if doc:
            config = GlobalRiskConfig(
                max_concurrent_positions_global=doc.get("max_concurrent_positions_global", 100),
                max_concurrent_positions_per_user=doc.get("max_concurrent_positions_per_user", 10),
                max_concurrent_positions_per_bot=doc.get("max_concurrent_positions_per_bot", 3),
                max_open_orders_per_bot=doc.get("max_open_orders_per_bot", 20),
                max_daily_loss_percent=doc.get("max_daily_loss_percent", 10.0),
                max_daily_loss_absolute=doc.get("max_daily_loss_absolute", 10000),
                max_drawdown_percent=doc.get("max_drawdown_percent", 25.0),
                max_drawdown_absolute=doc.get("max_drawdown_absolute", 25000),
                max_leverage=doc.get("max_leverage", 10.0),
                allowed_symbols=doc.get("allowed_symbols", []),
                blacklisted_symbols=doc.get("blacklisted_symbols", []),
                allowed_timeframes=doc.get("allowed_timeframes", []),
                cooldown_after_stopout_minutes=doc.get("cooldown_after_stopout_minutes", 30),
                cooldown_after_loss_minutes=doc.get("cooldown_after_loss_minutes", 5),
                max_slippage_percent=doc.get("max_slippage_percent", 1.0),
                max_spread_percent=doc.get("max_spread_percent", 0.5),
                max_price_deviation_percent=doc.get("max_price_deviation_percent", 5.0),
                min_volume_24h_usd=doc.get("min_volume_24h_usd", 100000),
                max_orders_per_minute=doc.get("max_orders_per_minute", 60),
                max_orders_per_hour=doc.get("max_orders_per_hour", 500),
                global_kill_switch=doc.get("global_kill_switch", False),
                require_stop_loss=doc.get("require_stop_loss", True),
                require_take_profit=doc.get("require_take_profit", False),
                one_bot_per_symbol_per_user=doc.get("one_bot_per_symbol_per_user", False),
                updated_at=doc.get("updated_at", now),
                updated_by=doc.get("updated_by", "system")
            )
        else:
            # Create default config
            config = GlobalRiskConfig()
            await cls.save_config(config)
        
        # Update cache
        cls._cache = config
        cls._cache_time = now
        
        return config
    
    @classmethod
    async def save_config(cls, config: GlobalRiskConfig, updated_by: str = "system"):
        """Save global risk config"""
        config.updated_at = datetime.now(timezone.utc)
        config.updated_by = updated_by
        
        config_dict = asdict(config)
        config_dict["config_id"] = cls.CONFIG_ID
        
        await risk_global_config.update_one(
            {"config_id": cls.CONFIG_ID},
            {"$set": config_dict},
            upsert=True
        )
        
        # Invalidate cache
        cls._cache = config
        cls._cache_time = datetime.now(timezone.utc)
        
        logger.info(f"Global risk config updated by {updated_by}")
    
    @classmethod
    async def get_defaults() -> Dict[str, Any]:
        """Get default configuration values"""
        return asdict(GlobalRiskConfig())


# ═══════════════════════════════════════════════════════════════════════════════
# PER-BOT RISK CONFIG MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class BotRiskConfigManager:
    """
    Manage per-bot risk configuration.
    """
    
    @staticmethod
    async def get_config(bot_id: str) -> Optional[BotRiskConfig]:
        """Get risk config for a specific bot"""
        doc = await risk_bot_config.find_one({"bot_id": bot_id})
        
        if not doc:
            return None
        
        return BotRiskConfig(
            bot_id=doc["bot_id"],
            position_sizing_mode=doc.get("position_sizing_mode", "fixed"),
            position_size_value=doc.get("position_size_value", 100),
            max_position_size=doc.get("max_position_size", 1000),
            max_entries=doc.get("max_entries", 1),
            stop_loss_enabled=doc.get("stop_loss_enabled", True),
            stop_loss_type=doc.get("stop_loss_type", "percent"),
            stop_loss_value=doc.get("stop_loss_value", 5.0),
            take_profit_enabled=doc.get("take_profit_enabled", True),
            take_profit_type=doc.get("take_profit_type", "percent"),
            take_profit_value=doc.get("take_profit_value", 10.0),
            trailing_stop_enabled=doc.get("trailing_stop_enabled", False),
            trailing_stop_distance=doc.get("trailing_stop_distance", 1.0),
            trailing_stop_activation=doc.get("trailing_stop_activation", 2.0),
            break_even_enabled=doc.get("break_even_enabled", False),
            break_even_trigger=doc.get("break_even_trigger", 1.5),
            break_even_offset=doc.get("break_even_offset", 0.1),
            time_stop_enabled=doc.get("time_stop_enabled", False),
            time_stop_minutes=doc.get("time_stop_minutes", 0),
            time_stop_candles=doc.get("time_stop_candles", 0),
            max_dca_levels=doc.get("max_dca_levels", 5),
            dca_sizing_multiplier=doc.get("dca_sizing_multiplier", 1.5),
            dca_max_exposure=doc.get("dca_max_exposure", 5000),
            max_grid_levels=doc.get("max_grid_levels", 20),
            grid_max_exposure=doc.get("grid_max_exposure", 5000),
            override_max_positions=doc.get("override_max_positions"),
            override_max_orders=doc.get("override_max_orders"),
            override_max_daily_loss=doc.get("override_max_daily_loss"),
            kill_switch=doc.get("kill_switch", False),
            cooldown_until=doc.get("cooldown_until"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc))
        )
    
    @staticmethod
    async def save_config(config: BotRiskConfig):
        """Save per-bot risk config"""
        config.updated_at = datetime.now(timezone.utc)
        config_dict = asdict(config)
        
        await risk_bot_config.update_one(
            {"bot_id": config.bot_id},
            {"$set": config_dict},
            upsert=True
        )
        
        logger.info(f"Bot risk config saved for {config.bot_id}")
    
    @staticmethod
    async def create_default(bot_id: str) -> BotRiskConfig:
        """Create default risk config for a bot"""
        config = BotRiskConfig(bot_id=bot_id)
        await BotRiskConfigManager.save_config(config)
        return config
    
    @staticmethod
    async def set_kill_switch(bot_id: str, enabled: bool, reason: str = ""):
        """Set kill switch for a bot"""
        await risk_bot_config.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "kill_switch": enabled,
                    "kill_switch_reason": reason,
                    "kill_switch_at": datetime.now(timezone.utc) if enabled else None,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        # Log the action
        await kill_switch_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "scope": "bot",
            "target_id": bot_id,
            "enabled": enabled,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc)
        })
    
    @staticmethod
    async def set_cooldown(bot_id: str, minutes: int):
        """Set cooldown for a bot"""
        cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        
        await risk_bot_config.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "cooldown_until": cooldown_until,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 4.4 KILL SWITCH MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class KillSwitchManager:
    """
    Manage kill switches at all levels: Global, User, Bot.
    """
    
    @staticmethod
    async def activate_global(reason: str = "admin_action", admin_id: str = ""):
        """Activate global kill switch - stops ALL bots"""
        await risk_global_config.update_one(
            {"config_id": GlobalRiskConfigManager.CONFIG_ID},
            {
                "$set": {
                    "global_kill_switch": True,
                    "global_kill_switch_at": datetime.now(timezone.utc),
                    "global_kill_switch_reason": reason,
                    "global_kill_switch_by": admin_id
                }
            },
            upsert=True
        )
        
        # Invalidate cache
        GlobalRiskConfigManager._cache = None
        
        # Stop all running bots
        result = await db.bot_configs.update_many(
            {"status": "running"},
            {
                "$set": {
                    "status": "killed",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": "global_kill_switch"
                }
            }
        )
        
        # Log
        await kill_switch_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "scope": "global",
            "enabled": True,
            "reason": reason,
            "admin_id": admin_id,
            "bots_affected": result.modified_count,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.warning(f"🚨 GLOBAL KILL SWITCH ACTIVATED by {admin_id}: {reason}. Stopped {result.modified_count} bots.")
        return result.modified_count
    
    @staticmethod
    async def deactivate_global(admin_id: str = ""):
        """Deactivate global kill switch"""
        await risk_global_config.update_one(
            {"config_id": GlobalRiskConfigManager.CONFIG_ID},
            {
                "$set": {
                    "global_kill_switch": False,
                    "global_kill_switch_deactivated_at": datetime.now(timezone.utc),
                    "global_kill_switch_deactivated_by": admin_id
                }
            }
        )
        
        # Invalidate cache
        GlobalRiskConfigManager._cache = None
        
        # Log
        await kill_switch_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "scope": "global",
            "enabled": False,
            "admin_id": admin_id,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.info(f"✅ Global kill switch deactivated by {admin_id}")
    
    @staticmethod
    async def activate_user(user_id: str, reason: str = "admin_action", admin_id: str = ""):
        """Activate kill switch for a specific user"""
        await risk_user_config.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "kill_switch": True,
                    "kill_switch_at": datetime.now(timezone.utc),
                    "kill_switch_reason": reason,
                    "kill_switch_by": admin_id
                }
            },
            upsert=True
        )
        
        # Stop all user's running bots
        result = await db.bot_configs.update_many(
            {"user_id": user_id, "status": "running"},
            {
                "$set": {
                    "status": "killed",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": "user_kill_switch"
                }
            }
        )
        
        # Log
        await kill_switch_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "scope": "user",
            "target_id": user_id,
            "enabled": True,
            "reason": reason,
            "admin_id": admin_id,
            "bots_affected": result.modified_count,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.warning(f"🚨 USER KILL SWITCH ACTIVATED for {user_id}: {reason}. Stopped {result.modified_count} bots.")
        return result.modified_count
    
    @staticmethod
    async def deactivate_user(user_id: str, admin_id: str = ""):
        """Deactivate kill switch for a user"""
        await risk_user_config.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "kill_switch": False,
                    "kill_switch_deactivated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        await kill_switch_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "scope": "user",
            "target_id": user_id,
            "enabled": False,
            "admin_id": admin_id,
            "timestamp": datetime.now(timezone.utc)
        })
    
    @staticmethod
    async def activate_bot(bot_id: str, reason: str = "admin_action"):
        """Activate kill switch for a specific bot"""
        await BotRiskConfigManager.set_kill_switch(bot_id, True, reason)
        
        # Stop the bot
        await db.bot_configs.update_one(
            {"bot_id": bot_id},
            {
                "$set": {
                    "status": "killed",
                    "stopped_at": datetime.now(timezone.utc),
                    "stop_reason": "bot_kill_switch"
                }
            }
        )
        
        logger.warning(f"🚨 BOT KILL SWITCH ACTIVATED for {bot_id}: {reason}")
    
    @staticmethod
    async def deactivate_bot(bot_id: str):
        """Deactivate kill switch for a bot"""
        await BotRiskConfigManager.set_kill_switch(bot_id, False)
    
    @staticmethod
    async def is_killed(bot_id: str, user_id: str) -> Tuple[bool, Optional[str]]:
        """
        Check if any kill switch is active.
        Returns (is_killed, reason)
        """
        # Check global
        global_config = await GlobalRiskConfigManager.get_config()
        if global_config.global_kill_switch:
            return True, RiskBlockReason.KILL_SWITCH_GLOBAL.value
        
        # Check user
        user_doc = await risk_user_config.find_one({"user_id": user_id})
        if user_doc and user_doc.get("kill_switch"):
            return True, RiskBlockReason.KILL_SWITCH_USER.value
        
        # Check bot
        bot_config = await BotRiskConfigManager.get_config(bot_id)
        if bot_config and bot_config.kill_switch:
            return True, RiskBlockReason.KILL_SWITCH_BOT.value
        
        return False, None
    
    @staticmethod
    async def close_all_positions(scope: str, target_id: str = "", admin_id: str = "") -> Dict:
        """
        Emergency close all positions.
        scope: "global", "user", "bot"
        """
        from bot_execution_engine import PositionManager
        
        query = {}
        if scope == "user":
            query["user_id"] = target_id
        elif scope == "bot":
            query["bot_id"] = target_id
        
        positions_closed = 0
        total_pnl = 0
        
        # Get all open positions
        async for position in db.bot_positions.find({"status": {"$ne": "closed"}, **query}):
            try:
                # Get current price
                from bot_execution_engine import CandleManager
                current_price = await CandleManager.get_latest_price(position["pair"])
                
                if current_price:
                    result = await PositionManager.close_position(
                        position["position_id"],
                        current_price,
                        f"emergency_close_{admin_id}"
                    )
                    if result:
                        _, pnl = result
                        positions_closed += 1
                        total_pnl += pnl
            except Exception as e:
                logger.error(f"Error closing position {position['position_id']}: {e}")
        
        # Log
        await kill_switch_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "action": "close_all_positions",
            "scope": scope,
            "target_id": target_id,
            "admin_id": admin_id,
            "positions_closed": positions_closed,
            "total_pnl": total_pnl,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.warning(f"🚨 EMERGENCY CLOSE: {positions_closed} positions closed, PnL: ${total_pnl:.2f}")
        
        return {
            "positions_closed": positions_closed,
            "total_pnl": total_pnl
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 4.3 RISK MANAGER (CENTRAL ENFORCEMENT)
# ═══════════════════════════════════════════════════════════════════════════════

class RiskManager:
    """
    Central Risk Manager - ALL order intents must pass through here.
    Single point of enforcement for all risk rules.
    """
    
    @staticmethod
    async def validate_order_intent(intent: OrderIntent) -> RiskValidationResult:
        """
        Validate an order intent against all risk rules.
        This is THE single entry point for all risk validation.
        
        Returns RiskValidationResult with RISK_PASS or RISK_BLOCK.
        """
        result = RiskValidationResult()
        
        # Load configs
        global_config = await GlobalRiskConfigManager.get_config()
        bot_config = await BotRiskConfigManager.get_config(intent.bot_id)
        
        # 1. CHECK KILL SWITCHES
        is_killed, kill_reason = await KillSwitchManager.is_killed(intent.bot_id, intent.user_id)
        if is_killed:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = kill_reason
            result.reason_detail = f"Kill switch active: {kill_reason}"
            result.checks_failed.append("kill_switch")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("kill_switch")
        
        # 2. CHECK COOLDOWN
        if bot_config and bot_config.cooldown_until:
            if bot_config.cooldown_until.tzinfo is None:
                cooldown = bot_config.cooldown_until.replace(tzinfo=timezone.utc)
            else:
                cooldown = bot_config.cooldown_until
            
            if datetime.now(timezone.utc) < cooldown:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.COOLDOWN_ACTIVE.value
                result.reason_detail = f"Bot in cooldown until {cooldown}"
                result.checks_failed.append("cooldown")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("cooldown")
        
        # 3. CHECK SYMBOL ALLOWED
        if global_config.allowed_symbols and intent.symbol not in global_config.allowed_symbols:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.SYMBOL_NOT_ALLOWED.value
            result.reason_detail = f"Symbol {intent.symbol} not in allowed list"
            result.checks_failed.append("symbol_allowed")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("symbol_allowed")
        
        # 4. CHECK SYMBOL BLACKLISTED
        if intent.symbol in global_config.blacklisted_symbols:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.SYMBOL_BLACKLISTED.value
            result.reason_detail = f"Symbol {intent.symbol} is blacklisted"
            result.checks_failed.append("symbol_blacklist")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("symbol_blacklist")
        
        # 5. CHECK TIMEFRAME ALLOWED
        if global_config.allowed_timeframes and intent.timeframe not in global_config.allowed_timeframes:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.TIMEFRAME_NOT_ALLOWED.value
            result.reason_detail = f"Timeframe {intent.timeframe} not allowed"
            result.checks_failed.append("timeframe")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("timeframe")
        
        # 6. CHECK MAX POSITIONS
        max_positions = bot_config.override_max_positions if (bot_config and bot_config.override_max_positions) else global_config.max_concurrent_positions_per_bot
        if intent.current_positions >= max_positions and intent.action == "BUY":
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.MAX_POSITIONS_EXCEEDED.value
            result.reason_detail = f"Max positions ({max_positions}) exceeded. Current: {intent.current_positions}"
            result.checks_failed.append("max_positions")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("max_positions")
        
        # 7. CHECK MAX ORDERS
        max_orders = bot_config.override_max_orders if (bot_config and bot_config.override_max_orders) else global_config.max_open_orders_per_bot
        if intent.current_orders >= max_orders:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.MAX_ORDERS_EXCEEDED.value
            result.reason_detail = f"Max orders ({max_orders}) exceeded. Current: {intent.current_orders}"
            result.checks_failed.append("max_orders")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("max_orders")
        
        # 8. CHECK DAILY LOSS LIMIT
        daily_loss_limit = bot_config.override_max_daily_loss if (bot_config and bot_config.override_max_daily_loss) else global_config.max_daily_loss_absolute
        if intent.daily_pnl < -daily_loss_limit:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.DAILY_LOSS_LIMIT.value
            result.reason_detail = f"Daily loss limit (${daily_loss_limit}) exceeded. Current PnL: ${intent.daily_pnl}"
            result.checks_failed.append("daily_loss")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("daily_loss")
        
        # 9. CHECK STOP LOSS REQUIRED
        if global_config.require_stop_loss and intent.action == "BUY":
            if not intent.stop_loss_price and (not bot_config or not bot_config.stop_loss_enabled):
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.NO_STOP_LOSS.value
                result.reason_detail = "Stop loss is required but not configured"
                result.checks_failed.append("stop_loss_required")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("stop_loss_required")
        
        # 10. CHECK POSITION SIZE
        if bot_config:
            notional_value = intent.quantity * intent.current_price
            if notional_value > bot_config.max_position_size:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.POSITION_SIZE_EXCEEDED.value
                result.reason_detail = f"Position size ${notional_value:.2f} exceeds max ${bot_config.max_position_size}"
                result.checks_failed.append("position_size")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("position_size")
        
        # 11. CHECK SLIPPAGE
        if intent.bid_price and intent.ask_price and intent.current_price:
            if intent.action == "BUY":
                expected_price = intent.ask_price
            else:
                expected_price = intent.bid_price
            
            slippage = abs(intent.current_price - expected_price) / expected_price * 100
            if slippage > global_config.max_slippage_percent:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.SLIPPAGE_EXCEEDED.value
                result.reason_detail = f"Slippage {slippage:.2f}% exceeds max {global_config.max_slippage_percent}%"
                result.checks_failed.append("slippage")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("slippage")
        
        # 12. CHECK SPREAD
        if intent.spread_percent > global_config.max_spread_percent:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.SPREAD_EXCEEDED.value
            result.reason_detail = f"Spread {intent.spread_percent:.2f}% exceeds max {global_config.max_spread_percent}%"
            result.checks_failed.append("spread")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("spread")
        
        # 13. CHECK PRICE DEVIATION
        if intent.last_candle_close and intent.current_price:
            deviation = abs(intent.current_price - intent.last_candle_close) / intent.last_candle_close * 100
            if deviation > global_config.max_price_deviation_percent:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.PRICE_DEVIATION_EXCEEDED.value
                result.reason_detail = f"Price deviation {deviation:.2f}% exceeds max {global_config.max_price_deviation_percent}%"
                result.checks_failed.append("price_deviation")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("price_deviation")
        
        # 14. CHECK VOLUME / LIQUIDITY
        if intent.volume_24h > 0 and intent.volume_24h < global_config.min_volume_24h_usd:
            result.result = RiskResult.BLOCK.value
            result.passed = False
            result.reason = RiskBlockReason.LOW_LIQUIDITY.value
            result.reason_detail = f"24h volume ${intent.volume_24h:,.0f} below min ${global_config.min_volume_24h_usd:,.0f}"
            result.checks_failed.append("liquidity")
            await RiskManager._log_violation(intent, result)
            return result
        result.checks_passed.append("liquidity")
        
        # 15. CHECK DCA LEVELS (for DCA bots)
        if intent.bot_type == "dca" and bot_config:
            if intent.dca_level >= bot_config.max_dca_levels:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.MAX_DCA_LEVELS.value
                result.reason_detail = f"Max DCA levels ({bot_config.max_dca_levels}) reached"
                result.checks_failed.append("dca_levels")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("dca_levels")
        
        # 16. CHECK GRID LEVELS (for Grid bots)
        if intent.bot_type == "grid" and bot_config:
            if intent.grid_level >= bot_config.max_grid_levels:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.MAX_GRID_LEVELS.value
                result.reason_detail = f"Max grid levels ({bot_config.max_grid_levels}) reached"
                result.checks_failed.append("grid_levels")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("grid_levels")
        
        # 17. CHECK ONE BOT PER SYMBOL (if enabled)
        if global_config.one_bot_per_symbol_per_user and intent.action == "BUY":
            existing = await db.bot_configs.find_one({
                "user_id": intent.user_id,
                "pair": intent.symbol,
                "status": "running",
                "bot_id": {"$ne": intent.bot_id}
            })
            if existing:
                result.result = RiskResult.BLOCK.value
                result.passed = False
                result.reason = RiskBlockReason.ONE_BOT_PER_SYMBOL.value
                result.reason_detail = f"Another bot already running on {intent.symbol}"
                result.checks_failed.append("one_bot_per_symbol")
                await RiskManager._log_violation(intent, result)
                return result
        result.checks_passed.append("one_bot_per_symbol")
        
        # ALL CHECKS PASSED
        result.result = RiskResult.PASS.value
        result.passed = True
        result.reason_detail = f"All {len(result.checks_passed)} risk checks passed"
        
        logger.info(f"RISK_PASS for {intent.bot_id}: {intent.action} {intent.symbol}")
        
        return result
    
    @staticmethod
    async def _log_violation(intent: OrderIntent, result: RiskValidationResult):
        """Log a risk violation"""
        await risk_violations.insert_one({
            "violation_id": str(uuid.uuid4()),
            "bot_id": intent.bot_id,
            "user_id": intent.user_id,
            "intent_id": intent.intent_id,
            "action": intent.action,
            "symbol": intent.symbol,
            "reason": result.reason,
            "reason_detail": result.reason_detail,
            "checks_passed": result.checks_passed,
            "checks_failed": result.checks_failed,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.warning(f"RISK_BLOCK for {intent.bot_id}: {result.reason} - {result.reason_detail}")
    
    @staticmethod
    async def get_violations(
        bot_id: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get risk violations log"""
        query = {}
        if bot_id:
            query["bot_id"] = bot_id
        if user_id:
            query["user_id"] = user_id
        
        violations = []
        async for doc in risk_violations.find(query).sort("timestamp", -1).limit(limit):
            doc.pop("_id", None)
            violations.append(doc)
        
        return violations


# ═══════════════════════════════════════════════════════════════════════════════
# DAILY PnL TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

class DailyPnLTracker:
    """
    Track daily PnL for risk limit enforcement.
    """
    
    @staticmethod
    async def get_daily_pnl(user_id: str, bot_id: Optional[str] = None) -> float:
        """Get today's PnL for a user or bot"""
        today = datetime.now(timezone.utc).date()
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        
        query = {
            "user_id": user_id,
            "date": today.isoformat()
        }
        if bot_id:
            query["bot_id"] = bot_id
        
        doc = await daily_pnl_tracker.find_one(query)
        return doc.get("pnl", 0) if doc else 0
    
    @staticmethod
    async def update_pnl(user_id: str, bot_id: str, pnl_change: float):
        """Update daily PnL"""
        today = datetime.now(timezone.utc).date().isoformat()
        
        await daily_pnl_tracker.update_one(
            {"user_id": user_id, "bot_id": bot_id, "date": today},
            {
                "$inc": {"pnl": pnl_change},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            },
            upsert=True
        )
    
    @staticmethod
    async def get_drawdown(user_id: str, bot_id: Optional[str] = None) -> Tuple[float, float]:
        """Get current drawdown (absolute and percent)"""
        # This would require tracking equity high water mark
        # Simplified implementation
        query = {"user_id": user_id}
        if bot_id:
            query["bot_id"] = bot_id
        
        total_pnl = 0
        async for doc in daily_pnl_tracker.find(query).sort("date", -1).limit(30):
            total_pnl += doc.get("pnl", 0)
        
        # Calculate drawdown from peak
        # Simplified: just return total loss if negative
        if total_pnl < 0:
            return abs(total_pnl), 0  # Would need equity to calculate %
        
        return 0, 0


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Enums
    "RiskResult",
    "RiskBlockReason",
    "PositionSizingMode",
    
    # Data Classes
    "GlobalRiskConfig",
    "BotRiskConfig",
    "OrderIntent",
    "RiskValidationResult",
    
    # Managers
    "GlobalRiskConfigManager",
    "BotRiskConfigManager",
    "KillSwitchManager",
    "RiskManager",
    "DailyPnLTracker",
]
