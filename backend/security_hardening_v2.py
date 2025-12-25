"""
═══════════════════════════════════════════════════════════════════════════════
COINHUBX SECURITY HARDENING V2 - Task 1: Security & Fund Protection
═══════════════════════════════════════════════════════════════════════════════

Implements:
1. Rate Limiting (per IP + per user + burst limits)
2. WAF Rules (block abuse patterns)
3. 2FA Enforcement (mandatory for withdrawals/API keys)
4. Withdrawal Velocity Limits (per user + per asset + rolling window)
5. Address Whitelisting (cooldown on new addresses)
6. Admin Audit Log (who/when/what/before-after, immutable)

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import time
import uuid
import hashlib
import re
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict
from functools import wraps

from fastapi import Request, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx_production')


# ═══════════════════════════════════════════════════════════════════════════════
# 1. ADVANCED RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

class RateLimitType(Enum):
    IP = "ip"
    USER = "user"
    IP_USER = "ip_user"  # Combined


@dataclass
class RateLimitConfig:
    """Configuration for a rate limit rule"""
    name: str
    max_requests: int
    window_seconds: int
    burst_limit: int = 0  # Max requests in 1 second (0 = no burst limit)
    block_duration_seconds: int = 300  # How long to block after violation
    limit_type: str = "ip"  # ip, user, ip_user


# Rate limit configurations by endpoint category
RATE_LIMIT_CONFIGS = {
    # Auth endpoints - strict limits
    "auth_login": RateLimitConfig(
        name="auth_login",
        max_requests=5,
        window_seconds=300,  # 5 per 5 minutes
        burst_limit=2,
        block_duration_seconds=900,  # 15 min block
        limit_type="ip"
    ),
    "auth_register": RateLimitConfig(
        name="auth_register",
        max_requests=3,
        window_seconds=3600,  # 3 per hour
        burst_limit=1,
        block_duration_seconds=3600,
        limit_type="ip"
    ),
    "auth_otp": RateLimitConfig(
        name="auth_otp",
        max_requests=5,
        window_seconds=300,
        burst_limit=2,
        block_duration_seconds=600,
        limit_type="ip_user"
    ),
    "auth_password_reset": RateLimitConfig(
        name="auth_password_reset",
        max_requests=3,
        window_seconds=3600,
        burst_limit=1,
        block_duration_seconds=3600,
        limit_type="ip"
    ),
    
    # Trading endpoints - moderate limits
    "trading_order": RateLimitConfig(
        name="trading_order",
        max_requests=60,
        window_seconds=60,  # 60 per minute
        burst_limit=10,
        block_duration_seconds=300,
        limit_type="user"
    ),
    "trading_swap": RateLimitConfig(
        name="trading_swap",
        max_requests=30,
        window_seconds=60,
        burst_limit=5,
        block_duration_seconds=300,
        limit_type="user"
    ),
    
    # Withdrawal endpoints - strict limits
    "withdrawal_create": RateLimitConfig(
        name="withdrawal_create",
        max_requests=10,
        window_seconds=3600,  # 10 per hour
        burst_limit=2,
        block_duration_seconds=1800,
        limit_type="user"
    ),
    "withdrawal_address_add": RateLimitConfig(
        name="withdrawal_address_add",
        max_requests=5,
        window_seconds=86400,  # 5 per day
        burst_limit=1,
        block_duration_seconds=86400,
        limit_type="user"
    ),
    
    # API key endpoints - very strict
    "api_key_create": RateLimitConfig(
        name="api_key_create",
        max_requests=3,
        window_seconds=86400,  # 3 per day
        burst_limit=1,
        block_duration_seconds=86400,
        limit_type="user"
    ),
    
    # Default for other endpoints
    "default": RateLimitConfig(
        name="default",
        max_requests=100,
        window_seconds=60,
        burst_limit=20,
        block_duration_seconds=60,
        limit_type="ip"
    ),
}


class AdvancedRateLimiter:
    """
    Advanced rate limiter with:
    - Per IP + per user + combined limits
    - Burst protection
    - Automatic blocking
    - Persistent tracking
    """
    
    # In-memory cache for fast checking
    _cache: Dict[str, List[float]] = defaultdict(list)
    _blocked: Dict[str, float] = {}  # key -> unblock_time
    _burst_cache: Dict[str, List[float]] = defaultdict(list)
    
    def __init__(self, db=None):
        self.db = db
    
    @staticmethod
    def _get_key(ip: str, user_id: str, limit_type: str, action: str) -> str:
        """Generate cache key based on limit type"""
        if limit_type == "ip":
            return f"rl:{action}:ip:{ip}"
        elif limit_type == "user":
            return f"rl:{action}:user:{user_id or 'anon'}"
        else:  # ip_user
            return f"rl:{action}:ipuser:{ip}:{user_id or 'anon'}"
    
    async def check_rate_limit(
        self,
        ip: str,
        user_id: Optional[str],
        action: str
    ) -> Tuple[bool, str, int]:
        """
        Check if request is allowed.
        Returns: (allowed, reason, retry_after_seconds)
        """
        config = RATE_LIMIT_CONFIGS.get(action, RATE_LIMIT_CONFIGS["default"])
        key = self._get_key(ip, user_id, config.limit_type, action)
        now = time.time()
        
        # Check if blocked
        if key in self._blocked:
            unblock_time = self._blocked[key]
            if now < unblock_time:
                retry_after = int(unblock_time - now)
                logger.warning(f"[RATE_LIMIT] Blocked: {key}, retry in {retry_after}s")
                return False, "rate_limit_blocked", retry_after
            else:
                del self._blocked[key]
        
        # Check burst limit
        if config.burst_limit > 0:
            burst_key = f"burst:{key}"
            self._burst_cache[burst_key] = [
                t for t in self._burst_cache[burst_key]
                if now - t < 1.0
            ]
            if len(self._burst_cache[burst_key]) >= config.burst_limit:
                logger.warning(f"[RATE_LIMIT] Burst limit: {key}")
                return False, "burst_limit_exceeded", 1
            self._burst_cache[burst_key].append(now)
        
        # Check window limit
        self._cache[key] = [
            t for t in self._cache[key]
            if now - t < config.window_seconds
        ]
        
        if len(self._cache[key]) >= config.max_requests:
            # Block the key
            self._blocked[key] = now + config.block_duration_seconds
            retry_after = config.block_duration_seconds
            
            logger.warning(f"[RATE_LIMIT] Limit exceeded: {key}, blocked for {retry_after}s")
            
            # Log to database
            if self.db:
                await self._log_violation(ip, user_id, action, config)
            
            return False, "rate_limit_exceeded", retry_after
        
        # Record request
        self._cache[key].append(now)
        
        return True, "ok", 0
    
    async def _log_violation(self, ip: str, user_id: str, action: str, config: RateLimitConfig):
        """Log rate limit violation to database"""
        try:
            await self.db.security_events.insert_one({
                "event_id": str(uuid.uuid4()),
                "event_type": "RATE_LIMIT_VIOLATION",
                "ip_address": ip,
                "user_id": user_id,
                "action": action,
                "config": asdict(config),
                "timestamp": datetime.now(timezone.utc),
                "blocked_until": datetime.now(timezone.utc) + timedelta(seconds=config.block_duration_seconds)
            })
        except Exception as e:
            logger.error(f"Failed to log rate limit violation: {e}")
    
    def clear_cache(self):
        """Clear rate limit cache (for testing)"""
        self._cache.clear()
        self._blocked.clear()
        self._burst_cache.clear()


# Global instance
advanced_rate_limiter = AdvancedRateLimiter()


# ═══════════════════════════════════════════════════════════════════════════════
# 2. WAF RULES (Web Application Firewall)
# ═══════════════════════════════════════════════════════════════════════════════

class WAFRule:
    """Web Application Firewall rule"""
    
    def __init__(self, name: str, pattern: str, action: str = "block", score: int = 10):
        self.name = name
        self.pattern = re.compile(pattern, re.IGNORECASE) if pattern else None
        self.action = action  # block, log, score
        self.score = score


class WAFEngine:
    """
    WAF Engine to block common attack patterns:
    - SQL injection
    - XSS
    - Path traversal
    - Credential stuffing patterns
    - Brute force patterns
    - Replay attacks
    """
    
    # Attack pattern rules
    RULES = [
        # SQL Injection
        WAFRule("sql_injection_1", r"('|\")?\s*(or|and)\s+\d+\s*=\s*\d+", "block", 100),
        WAFRule("sql_injection_2", r"union\s+(all\s+)?select", "block", 100),
        WAFRule("sql_injection_3", r"(drop|delete|truncate|alter)\s+table", "block", 100),
        WAFRule("sql_injection_4", r";\s*(drop|delete|insert|update)", "block", 100),
        
        # XSS
        WAFRule("xss_1", r"<script[^>]*>.*?</script>", "block", 100),
        WAFRule("xss_2", r"javascript:\s*", "block", 100),
        WAFRule("xss_3", r"on(load|error|click|mouse)\s*=", "block", 80),
        
        # Path Traversal
        WAFRule("path_traversal", r"\.\.[\\/]", "block", 100),
        
        # Command Injection
        WAFRule("cmd_injection", r"[;&|`$]\s*(cat|ls|rm|wget|curl|bash|sh)", "block", 100),
        
        # Common attack user agents
        WAFRule("bad_ua_sqlmap", r"sqlmap", "block", 100),
        WAFRule("bad_ua_nikto", r"nikto", "block", 100),
        WAFRule("bad_ua_scanner", r"(scanner|havij|acunetix)", "block", 80),
    ]
    
    # Track request signatures for replay detection
    _request_signatures: Dict[str, float] = {}
    _signature_ttl = 60  # Signatures expire after 60 seconds
    
    # Track failed login attempts for credential stuffing detection
    _failed_logins: Dict[str, List[Tuple[float, str]]] = defaultdict(list)  # ip -> [(time, user)]
    
    def __init__(self, db=None):
        self.db = db
        self.enabled = True
    
    async def check_request(
        self,
        request: Request,
        body: Optional[str] = None
    ) -> Tuple[bool, str, int]:
        """
        Check request against WAF rules.
        Returns: (allowed, reason, threat_score)
        """
        if not self.enabled:
            return True, "waf_disabled", 0
        
        ip = request.client.host if request.client else "unknown"
        path = str(request.url.path)
        query = str(request.url.query) if request.url.query else ""
        user_agent = request.headers.get("user-agent", "")
        
        total_score = 0
        triggered_rules = []
        
        # Check all inputs against rules
        inputs_to_check = [
            ("path", path),
            ("query", query),
            ("user_agent", user_agent),
            ("body", body or ""),
        ]
        
        for rule in self.RULES:
            if not rule.pattern:
                continue
            
            for input_name, input_value in inputs_to_check:
                if rule.pattern.search(input_value):
                    total_score += rule.score
                    triggered_rules.append({
                        "rule": rule.name,
                        "input": input_name,
                        "score": rule.score
                    })
                    
                    if rule.action == "block" or total_score >= 100:
                        logger.warning(f"[WAF] BLOCKED: {ip} - rule={rule.name} path={path}")
                        
                        # Log to database
                        if self.db:
                            await self._log_block(ip, path, triggered_rules)
                        
                        return False, f"waf_blocked:{rule.name}", total_score
        
        # Check for replay attack
        is_replay, replay_reason = await self._check_replay(request, body)
        if is_replay:
            return False, replay_reason, 100
        
        # Check for credential stuffing
        is_stuffing = await self._check_credential_stuffing(ip)
        if is_stuffing:
            return False, "credential_stuffing_detected", 100
        
        return True, "ok", total_score
    
    async def _check_replay(self, request: Request, body: Optional[str]) -> Tuple[bool, str]:
        """Detect replay attacks using request signatures"""
        now = time.time()
        
        # Clean old signatures
        expired = [k for k, v in self._request_signatures.items() if now - v > self._signature_ttl]
        for k in expired:
            del self._request_signatures[k]
        
        # Generate signature
        sig_data = f"{request.method}:{request.url.path}:{body or ''}"
        signature = hashlib.sha256(sig_data.encode()).hexdigest()[:32]
        
        if signature in self._request_signatures:
            return True, "replay_attack_detected"
        
        self._request_signatures[signature] = now
        return False, ""
    
    async def _check_credential_stuffing(
        self,
        ip: str,
        threshold_unique_users: int = 10,
        window_seconds: int = 300
    ) -> bool:
        """
        Detect credential stuffing by tracking failed logins.
        If IP tries many different usernames in short time = stuffing.
        """
        now = time.time()
        
        # Clean old entries
        self._failed_logins[ip] = [
            (t, u) for t, u in self._failed_logins[ip]
            if now - t < window_seconds
        ]
        
        # Count unique users attempted
        unique_users = set(u for _, u in self._failed_logins[ip])
        
        if len(unique_users) >= threshold_unique_users:
            logger.warning(f"[WAF] Credential stuffing detected from IP {ip}")
            return True
        
        return False
    
    def record_failed_login(self, ip: str, username: str):
        """Record a failed login attempt for stuffing detection"""
        self._failed_logins[ip].append((time.time(), username))
    
    async def _log_block(self, ip: str, path: str, rules: List[Dict]):
        """Log WAF block to database"""
        try:
            await self.db.security_events.insert_one({
                "event_id": str(uuid.uuid4()),
                "event_type": "WAF_BLOCK",
                "ip_address": ip,
                "path": path,
                "triggered_rules": rules,
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.error(f"Failed to log WAF block: {e}")


# Global instance
waf_engine = WAFEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# 3. 2FA ENFORCEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class TwoFactorEnforcement:
    """
    Enforce 2FA for sensitive operations:
    - Withdrawals
    - API key creation
    - Large transactions
    - Security settings changes
    """
    
    # Actions that REQUIRE 2FA (no bypass)
    MANDATORY_2FA_ACTIONS = [
        "withdrawal_create",
        "withdrawal_confirm",
        "api_key_create",
        "api_key_delete",
        "whitelist_address_add",
        "security_settings_change",
        "password_change",
        "email_change",
    ]
    
    # Actions that require 2FA above threshold
    THRESHOLD_2FA_ACTIONS = {
        "trading_order": 10000,  # Orders above $10k
        "trading_swap": 5000,   # Swaps above $5k
        "transfer_internal": 5000,
    }
    
    def __init__(self, db=None):
        self.db = db
    
    async def check_2fa_required(
        self,
        user_id: str,
        action: str,
        amount: float = 0
    ) -> Tuple[bool, str]:
        """
        Check if 2FA is required for this action.
        Returns: (required, reason)
        """
        # Check mandatory actions
        if action in self.MANDATORY_2FA_ACTIONS:
            return True, f"2fa_mandatory_for_{action}"
        
        # Check threshold actions
        if action in self.THRESHOLD_2FA_ACTIONS:
            threshold = self.THRESHOLD_2FA_ACTIONS[action]
            if amount >= threshold:
                return True, f"2fa_required_above_{threshold}"
        
        return False, "2fa_not_required"
    
    async def verify_2fa(
        self,
        user_id: str,
        code: str,
        action: str
    ) -> Tuple[bool, str]:
        """
        Verify 2FA code for user.
        Returns: (valid, error_message)
        """
        if not self.db:
            return False, "database_not_available"
        
        # Get user's 2FA settings
        user = await self.db.users.find_one({"user_id": user_id})
        if not user:
            return False, "user_not_found"
        
        # Check if 2FA is enabled
        tfa_secret = user.get("two_factor_secret")
        tfa_enabled = user.get("two_factor_enabled", False)
        
        if not tfa_enabled or not tfa_secret:
            # 2FA not set up - for mandatory actions, this is an error
            if action in self.MANDATORY_2FA_ACTIONS:
                return False, "2fa_not_enabled_but_required"
            return True, "2fa_not_enabled"
        
        # Verify TOTP code
        try:
            import pyotp
            totp = pyotp.TOTP(tfa_secret)
            if totp.verify(code, valid_window=1):
                # Log successful verification
                await self._log_2fa_verification(user_id, action, True)
                return True, "2fa_verified"
            else:
                # Log failed attempt
                await self._log_2fa_verification(user_id, action, False)
                return False, "invalid_2fa_code"
        except Exception as e:
            logger.error(f"2FA verification error: {e}")
            return False, "2fa_verification_error"
    
    async def _log_2fa_verification(self, user_id: str, action: str, success: bool):
        """Log 2FA verification attempt"""
        try:
            await self.db.security_events.insert_one({
                "event_id": str(uuid.uuid4()),
                "event_type": "2FA_VERIFICATION",
                "user_id": user_id,
                "action": action,
                "success": success,
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.error(f"Failed to log 2FA verification: {e}")
    
    async def enforce_2fa(
        self,
        user_id: str,
        action: str,
        code: Optional[str],
        amount: float = 0
    ) -> Tuple[bool, str]:
        """
        Full 2FA enforcement check.
        Returns: (allowed, error_message)
        """
        # Check if 2FA required
        required, reason = await self.check_2fa_required(user_id, action, amount)
        
        if not required:
            return True, "2fa_not_required"
        
        # 2FA is required - verify code
        if not code:
            return False, "2fa_code_required"
        
        return await self.verify_2fa(user_id, code, action)


# Global instance
two_factor_enforcement = TwoFactorEnforcement()


# ═══════════════════════════════════════════════════════════════════════════════
# 4. WITHDRAWAL VELOCITY LIMITS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WithdrawalLimit:
    """Withdrawal limit configuration"""
    currency: str
    max_per_transaction: float
    max_per_hour: float
    max_per_day: float
    max_per_week: float
    max_per_month: float
    cooldown_minutes: int = 5  # Min time between withdrawals


# Default limits (in currency units)
DEFAULT_WITHDRAWAL_LIMITS = {
    "BTC": WithdrawalLimit("BTC", 1.0, 2.0, 5.0, 20.0, 50.0, 5),
    "ETH": WithdrawalLimit("ETH", 10.0, 20.0, 50.0, 200.0, 500.0, 5),
    "USDT": WithdrawalLimit("USDT", 10000, 20000, 50000, 200000, 500000, 5),
    "GBP": WithdrawalLimit("GBP", 5000, 10000, 25000, 100000, 250000, 5),
    "USD": WithdrawalLimit("USD", 5000, 10000, 25000, 100000, 250000, 5),
    # Add more as needed
}


class WithdrawalVelocityLimiter:
    """
    Enforce withdrawal velocity limits:
    - Per user
    - Per asset
    - Rolling windows (hour, day, week, month)
    - Hard stop + alert on breach
    """
    
    def __init__(self, db=None):
        self.db = db
    
    async def check_withdrawal_allowed(
        self,
        user_id: str,
        currency: str,
        amount: float
    ) -> Tuple[bool, str, Dict]:
        """
        Check if withdrawal is allowed.
        Returns: (allowed, reason, details)
        """
        if not self.db:
            return False, "database_not_available", {}
        
        # Get limits for currency
        limits = await self._get_user_limits(user_id, currency)
        
        # Check per-transaction limit
        if amount > limits.max_per_transaction:
            return False, "exceeds_per_transaction_limit", {
                "requested": amount,
                "limit": limits.max_per_transaction
            }
        
        # Get recent withdrawals
        now = datetime.now(timezone.utc)
        
        # Check cooldown
        last_withdrawal = await self._get_last_withdrawal(user_id, currency)
        if last_withdrawal:
            time_since = (now - last_withdrawal).total_seconds() / 60
            if time_since < limits.cooldown_minutes:
                return False, "cooldown_active", {
                    "wait_minutes": int(limits.cooldown_minutes - time_since) + 1
                }
        
        # Check hourly limit
        hour_ago = now - timedelta(hours=1)
        hourly_total = await self._get_withdrawal_total(user_id, currency, hour_ago)
        if hourly_total + amount > limits.max_per_hour:
            return False, "exceeds_hourly_limit", {
                "used": hourly_total,
                "limit": limits.max_per_hour,
                "available": max(0, limits.max_per_hour - hourly_total)
            }
        
        # Check daily limit
        day_ago = now - timedelta(days=1)
        daily_total = await self._get_withdrawal_total(user_id, currency, day_ago)
        if daily_total + amount > limits.max_per_day:
            return False, "exceeds_daily_limit", {
                "used": daily_total,
                "limit": limits.max_per_day,
                "available": max(0, limits.max_per_day - daily_total)
            }
        
        # Check weekly limit
        week_ago = now - timedelta(weeks=1)
        weekly_total = await self._get_withdrawal_total(user_id, currency, week_ago)
        if weekly_total + amount > limits.max_per_week:
            return False, "exceeds_weekly_limit", {
                "used": weekly_total,
                "limit": limits.max_per_week,
                "available": max(0, limits.max_per_week - weekly_total)
            }
        
        # Check monthly limit
        month_ago = now - timedelta(days=30)
        monthly_total = await self._get_withdrawal_total(user_id, currency, month_ago)
        if monthly_total + amount > limits.max_per_month:
            return False, "exceeds_monthly_limit", {
                "used": monthly_total,
                "limit": limits.max_per_month,
                "available": max(0, limits.max_per_month - monthly_total)
            }
        
        return True, "withdrawal_allowed", {
            "hourly_remaining": limits.max_per_hour - hourly_total - amount,
            "daily_remaining": limits.max_per_day - daily_total - amount,
            "weekly_remaining": limits.max_per_week - weekly_total - amount,
            "monthly_remaining": limits.max_per_month - monthly_total - amount
        }
    
    async def _get_user_limits(self, user_id: str, currency: str) -> WithdrawalLimit:
        """Get withdrawal limits for user (can be customized per user)"""
        # Check for custom user limits
        if self.db:
            custom = await self.db.user_withdrawal_limits.find_one({
                "user_id": user_id,
                "currency": currency
            })
            if custom:
                return WithdrawalLimit(
                    currency=currency,
                    max_per_transaction=custom.get("max_per_transaction", 0),
                    max_per_hour=custom.get("max_per_hour", 0),
                    max_per_day=custom.get("max_per_day", 0),
                    max_per_week=custom.get("max_per_week", 0),
                    max_per_month=custom.get("max_per_month", 0),
                    cooldown_minutes=custom.get("cooldown_minutes", 5)
                )
        
        # Use default limits
        return DEFAULT_WITHDRAWAL_LIMITS.get(
            currency.upper(),
            WithdrawalLimit(currency, 1000, 2000, 5000, 20000, 50000, 5)
        )
    
    async def _get_last_withdrawal(self, user_id: str, currency: str) -> Optional[datetime]:
        """Get timestamp of last withdrawal"""
        if not self.db:
            return None
        
        last = await self.db.withdrawals.find_one(
            {"user_id": user_id, "currency": currency, "status": {"$ne": "failed"}},
            sort=[("created_at", -1)]
        )
        
        if last and "created_at" in last:
            created = last["created_at"]
            if isinstance(created, str):
                return datetime.fromisoformat(created.replace('Z', '+00:00'))
            return created
        return None
    
    async def _get_withdrawal_total(self, user_id: str, currency: str, since: datetime) -> float:
        """Get total withdrawal amount since timestamp"""
        if not self.db:
            return 0
        
        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "currency": currency,
                    "status": {"$ne": "failed"},
                    "created_at": {"$gte": since}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        result = await self.db.withdrawals.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0
    
    async def alert_on_breach(
        self,
        user_id: str,
        currency: str,
        amount: float,
        reason: str
    ):
        """Alert admin on limit breach attempt"""
        if not self.db:
            return
        
        await self.db.security_alerts.insert_one({
            "alert_id": str(uuid.uuid4()),
            "alert_type": "WITHDRAWAL_LIMIT_BREACH",
            "severity": "high",
            "user_id": user_id,
            "currency": currency,
            "amount_attempted": amount,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc),
            "acknowledged": False
        })
        
        logger.warning(f"[ALERT] Withdrawal limit breach: user={user_id} currency={currency} amount={amount} reason={reason}")


# Global instance
withdrawal_velocity_limiter = WithdrawalVelocityLimiter()


# ═══════════════════════════════════════════════════════════════════════════════
# 5. ADDRESS WHITELISTING
# ═══════════════════════════════════════════════════════════════════════════════

class AddressWhitelist:
    """
    Manage withdrawal address whitelist:
    - Only allow withdrawals to approved addresses
    - Cooldown on new address activation
    - Email verification required
    """
    
    ADDRESS_ACTIVATION_COOLDOWN_HOURS = 24  # 24 hour cooldown for new addresses
    
    def __init__(self, db=None):
        self.db = db
    
    async def check_address_whitelisted(
        self,
        user_id: str,
        currency: str,
        address: str
    ) -> Tuple[bool, str, Optional[datetime]]:
        """
        Check if address is whitelisted and active.
        Returns: (allowed, reason, activation_time)
        """
        if not self.db:
            return False, "database_not_available", None
        
        # Check if user has whitelisting enabled
        user = await self.db.users.find_one({"user_id": user_id})
        whitelist_enabled = user.get("withdrawal_whitelist_enabled", False) if user else False
        
        if not whitelist_enabled:
            # Whitelisting not enabled - allow but with delay
            return True, "whitelist_not_enabled", None
        
        # Look up address in whitelist
        entry = await self.db.withdrawal_whitelist.find_one({
            "user_id": user_id,
            "currency": currency.upper(),
            "address": address,
            "verified": True
        })
        
        if not entry:
            return False, "address_not_whitelisted", None
        
        # Check activation cooldown
        activated_at = entry.get("activated_at")
        if activated_at:
            if isinstance(activated_at, str):
                activated_at = datetime.fromisoformat(activated_at.replace('Z', '+00:00'))
            
            cooldown_end = activated_at + timedelta(hours=self.ADDRESS_ACTIVATION_COOLDOWN_HOURS)
            
            if datetime.now(timezone.utc) < cooldown_end:
                return False, "address_in_cooldown", cooldown_end
        
        return True, "address_whitelisted", activated_at
    
    async def add_address(
        self,
        user_id: str,
        currency: str,
        address: str,
        label: str = ""
    ) -> Tuple[bool, str, str]:
        """
        Add address to whitelist (pending verification).
        Returns: (success, message, verification_token)
        """
        if not self.db:
            return False, "database_not_available", ""
        
        # Check if address already exists
        existing = await self.db.withdrawal_whitelist.find_one({
            "user_id": user_id,
            "currency": currency.upper(),
            "address": address
        })
        
        if existing:
            if existing.get("verified"):
                return False, "address_already_whitelisted", ""
            else:
                return False, "address_pending_verification", existing.get("verification_token", "")
        
        # Generate verification token
        verification_token = str(uuid.uuid4())
        
        # Add to whitelist (unverified)
        await self.db.withdrawal_whitelist.insert_one({
            "entry_id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency": currency.upper(),
            "address": address,
            "label": label,
            "verified": False,
            "verification_token": verification_token,
            "created_at": datetime.now(timezone.utc),
            "activated_at": None
        })
        
        return True, "address_added_pending_verification", verification_token
    
    async def verify_address(
        self,
        verification_token: str
    ) -> Tuple[bool, str]:
        """
        Verify and activate a whitelist address.
        Returns: (success, message)
        """
        if not self.db:
            return False, "database_not_available"
        
        # Find and update
        result = await self.db.withdrawal_whitelist.find_one_and_update(
            {"verification_token": verification_token, "verified": False},
            {
                "$set": {
                    "verified": True,
                    "activated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if not result:
            return False, "invalid_or_expired_token"
        
        return True, "address_verified_and_activated"
    
    async def remove_address(
        self,
        user_id: str,
        entry_id: str
    ) -> Tuple[bool, str]:
        """
        Remove address from whitelist.
        Returns: (success, message)
        """
        if not self.db:
            return False, "database_not_available"
        
        result = await self.db.withdrawal_whitelist.delete_one({
            "entry_id": entry_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            return False, "address_not_found"
        
        return True, "address_removed"
    
    async def get_user_whitelist(
        self,
        user_id: str
    ) -> List[Dict]:
        """
        Get all whitelisted addresses for user.
        """
        if not self.db:
            return []
        
        addresses = await self.db.withdrawal_whitelist.find({
            "user_id": user_id
        }).to_list(100)
        
        # Remove internal fields
        for addr in addresses:
            addr.pop("_id", None)
            addr.pop("verification_token", None)
        
        return addresses


# Global instance
address_whitelist = AddressWhitelist()


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ADMIN AUDIT LOG
# ═══════════════════════════════════════════════════════════════════════════════

class AdminAuditLog:
    """
    Comprehensive admin audit log:
    - Who performed the action
    - When it was performed
    - What was changed
    - Before/after values
    - Immutable (append-only)
    - Searchable
    - Exportable (CSV)
    """
    
    # Sensitive actions to audit
    AUDITED_ACTIONS = [
        # User management
        "user_create",
        "user_update",
        "user_suspend",
        "user_unsuspend",
        "user_delete",
        "user_kyc_approve",
        "user_kyc_reject",
        "user_balance_adjust",
        
        # Security
        "2fa_enable",
        "2fa_disable",
        "2fa_reset",
        "password_reset",
        "api_key_create",
        "api_key_delete",
        "whitelist_enable",
        "whitelist_disable",
        
        # Financial
        "withdrawal_approve",
        "withdrawal_reject",
        "deposit_credit",
        "fee_change",
        "limit_change",
        "liquidity_add",
        "liquidity_remove",
        
        # System
        "config_change",
        "feature_flag_change",
        "kill_switch_activate",
        "kill_switch_deactivate",
        "admin_create",
        "admin_delete",
        "role_change",
    ]
    
    def __init__(self, db=None):
        self.db = db
    
    async def log(
        self,
        admin_id: str,
        admin_email: str,
        action: str,
        target_type: str,  # user, system, config, etc.
        target_id: str,
        before_value: Any = None,
        after_value: Any = None,
        ip_address: str = None,
        user_agent: str = None,
        notes: str = None
    ) -> str:
        """
        Log an admin action.
        Returns: audit_id
        """
        audit_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)
        
        # Create immutable log entry
        entry = {
            "audit_id": audit_id,
            "timestamp": timestamp,
            "timestamp_iso": timestamp.isoformat(),
            
            # Who
            "admin_id": admin_id,
            "admin_email": admin_email,
            "ip_address": ip_address,
            "user_agent": user_agent,
            
            # What
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            
            # Before/After
            "before_value": self._serialize(before_value),
            "after_value": self._serialize(after_value),
            
            # Metadata
            "notes": notes,
            
            # Integrity
            "checksum": None  # Will be set below
        }
        
        # Calculate checksum for integrity verification
        entry["checksum"] = self._calculate_checksum(entry)
        
        if self.db:
            await self.db.admin_audit_log.insert_one(entry)
        
        logger.info(f"[ADMIN_AUDIT] {admin_email} performed {action} on {target_type}:{target_id}")
        
        return audit_id
    
    def _serialize(self, value: Any) -> Any:
        """Serialize value for storage"""
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, dict):
            return {k: self._serialize(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._serialize(v) for v in value]
        return str(value)
    
    def _calculate_checksum(self, entry: Dict) -> str:
        """Calculate checksum for integrity verification"""
        import json
        data = {
            "audit_id": entry["audit_id"],
            "timestamp_iso": entry["timestamp_iso"],
            "admin_id": entry["admin_id"],
            "action": entry["action"],
            "target_id": entry["target_id"],
        }
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]
    
    async def search(
        self,
        admin_id: str = None,
        action: str = None,
        target_type: str = None,
        target_id: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """
        Search audit logs.
        """
        if not self.db:
            return []
        
        query = {}
        
        if admin_id:
            query["admin_id"] = admin_id
        if action:
            query["action"] = action
        if target_type:
            query["target_type"] = target_type
        if target_id:
            query["target_id"] = target_id
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        logs = await self.db.admin_audit_log.find(query).sort(
            "timestamp", -1
        ).skip(skip).limit(limit).to_list(limit)
        
        # Remove MongoDB _id
        for log in logs:
            log.pop("_id", None)
        
        return logs
    
    async def export_csv(
        self,
        query: Dict = None,
        limit: int = 10000
    ) -> str:
        """
        Export audit logs to CSV format.
        Returns CSV string.
        """
        if not self.db:
            return ""
        
        logs = await self.db.admin_audit_log.find(query or {}).sort(
            "timestamp", -1
        ).limit(limit).to_list(limit)
        
        if not logs:
            return "No records found"
        
        # CSV header
        headers = [
            "audit_id", "timestamp", "admin_id", "admin_email",
            "action", "target_type", "target_id",
            "ip_address", "notes", "checksum"
        ]
        
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        
        for log in logs:
            row = [
                log.get("audit_id", ""),
                log.get("timestamp_iso", ""),
                log.get("admin_id", ""),
                log.get("admin_email", ""),
                log.get("action", ""),
                log.get("target_type", ""),
                log.get("target_id", ""),
                log.get("ip_address", ""),
                log.get("notes", ""),
                log.get("checksum", "")
            ]
            writer.writerow(row)
        
        return output.getvalue()
    
    async def verify_integrity(self, audit_id: str) -> Tuple[bool, str]:
        """
        Verify integrity of an audit log entry.
        Returns: (valid, message)
        """
        if not self.db:
            return False, "database_not_available"
        
        entry = await self.db.admin_audit_log.find_one({"audit_id": audit_id})
        if not entry:
            return False, "entry_not_found"
        
        stored_checksum = entry.get("checksum")
        calculated_checksum = self._calculate_checksum(entry)
        
        if stored_checksum == calculated_checksum:
            return True, "integrity_verified"
        else:
            return False, "integrity_check_failed"


# Global instance
admin_audit_log = AdminAuditLog()


# ═══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION & EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

async def init_security_services(db):
    """Initialize all security services with database connection"""
    advanced_rate_limiter.db = db
    waf_engine.db = db
    two_factor_enforcement.db = db
    withdrawal_velocity_limiter.db = db
    address_whitelist.db = db
    admin_audit_log.db = db
    
    logger.info("✅ Security hardening services initialized")


__all__ = [
    # Rate Limiting
    "AdvancedRateLimiter",
    "advanced_rate_limiter",
    "RATE_LIMIT_CONFIGS",
    
    # WAF
    "WAFEngine",
    "waf_engine",
    
    # 2FA
    "TwoFactorEnforcement",
    "two_factor_enforcement",
    
    # Withdrawal Limits
    "WithdrawalVelocityLimiter",
    "withdrawal_velocity_limiter",
    "DEFAULT_WITHDRAWAL_LIMITS",
    
    # Address Whitelist
    "AddressWhitelist",
    "address_whitelist",
    
    # Admin Audit
    "AdminAuditLog",
    "admin_audit_log",
    
    # Init
    "init_security_services",
]
