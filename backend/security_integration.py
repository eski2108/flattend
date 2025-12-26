"""
══════════════════════════════════════════════════════════════════════
Security Integration Layer - Connects security modules to FastAPI
══════════════════════════════════════════════════════════════════════

Provides:
- FastAPI middleware for WAF and rate limiting
- Dependency injection for security checks
- Decorators for endpoint protection
"""

import logging
from functools import wraps
from typing import Optional, Callable

from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from security_hardening_v2 import (
    advanced_rate_limiter,
    waf_engine,
    two_factor_enforcement,
    withdrawal_velocity_limiter,
    address_whitelist,
    admin_audit_log,
    init_security_services,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════
# FASTAPI MIDDLEWARE
# ══════════════════════════════════════════════════════════════════════

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Global security middleware that applies WAF and rate limiting
    to all incoming requests.
    """
    
    # Paths to skip (health checks, static, monitoring, public data, etc.)
    SKIP_PATHS = [
        "/api/health",
        "/api/ready",
        "/api/metrics",
        "/api/prices",
        "/api/exchange-rates",
        "/api/exchange",
        "/api/coins",
        "/api/p2p",
        "/api/savings",
        "/api/bots",
        "/api/nowpayments",
        "/api/instant-buy",
        "/api/express-buy",
        "/api/currencies",
        "/api/platform",
        "/api/system",
        "/api/trades",
        "/api/orders",
        "/api/wallet",
        "/api/auth",
        "/health",
        "/ready",
        "/metrics",
        "/docs",
        "/openapi.json",
        "/redoc",
    ]
    
    # Map paths to rate limit actions
    PATH_TO_ACTION = {
        "/api/auth/login": "auth_login",
        "/api/auth/register": "auth_register",
        "/api/auth/verify-otp": "auth_otp",
        "/api/auth/request-otp": "auth_otp",
        "/api/auth/password-reset": "auth_password_reset",
        "/api/user/withdraw": "withdrawal_create",
        "/api/withdrawals/create": "withdrawal_create",
        "/api/whitelist/add": "withdrawal_address_add",
        "/api/api-keys/create": "api_key_create",
        "/api/trading/order": "trading_order",
        "/api/swap": "trading_swap",
    }
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Allow CORS preflight OPTIONS requests through without any checks
        if method == "OPTIONS":
            return await call_next(request)
        
        # Skip WAF for specific safe paths (public endpoints)
        if any(path.startswith(skip) for skip in self.SKIP_PATHS):
            return await call_next(request)
        
        # Allow all standard API methods
        if method in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
            # Check Origin header for allowed domains
            origin = request.headers.get("origin", "")
            allowed_origins = [
                "https://coinhubx.net",
                "https://cryptovault-29.emergent.host",
                "https://p2p-repair-1.preview.emergentagent.com",
                "http://localhost:3000",
            ]
            
            # If no origin (server-to-server) or origin is allowed, proceed
            if not origin or any(origin.startswith(ao) for ao in allowed_origins):
                # For authenticated endpoints, apply rate limiting only
                ip = request.client.host if request.client else "unknown"
                user_id = request.headers.get("x-user-id")
                
                # Apply rate limiting for sensitive endpoints only
                action = self.PATH_TO_ACTION.get(path)
                if action:
                    passed, result = await self.rate_limiter.check_and_update(action, user_id or ip)
                    if not passed:
                        return JSONResponse(
                            status_code=429,
                            content={"detail": result.get("message", "Rate limit exceeded")}
                        )
                
                return await call_next(request)
        
        ip = request.client.host if request.client else "unknown"
        user_id = request.headers.get("x-user-id")
        
        # 1. WAF Check
        try:
            body = None
            if request.method in ["POST", "PUT", "PATCH"]:
                # Read body for WAF inspection (limited size)
                body_bytes = await request.body()
                if len(body_bytes) < 10000:  # Only inspect bodies < 10KB
                    body = body_bytes.decode("utf-8", errors="ignore")
            
            waf_allowed, waf_reason, threat_score = await waf_engine.check_request(request, body)
            
            if not waf_allowed:
                logger.warning(f"[SECURITY] WAF blocked request from {ip}: {waf_reason}")
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "request_blocked",
                        "reason": "security_violation",
                        "code": "WAF_001"
                    }
                )
        except Exception as e:
            logger.error(f"WAF check error: {e}")
            # Continue on WAF error to not block legitimate traffic
        
        # 2. Rate Limit Check
        try:
            # Determine rate limit action based on path
            action = "default"
            for prefix, act in self.PATH_TO_ACTION.items():
                if path.startswith(prefix):
                    action = act
                    break
            
            rl_allowed, rl_reason, retry_after = await advanced_rate_limiter.check_rate_limit(
                ip, user_id, action
            )
            
            if not rl_allowed:
                logger.warning(f"[SECURITY] Rate limit for {ip}/{user_id}: {rl_reason}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limit_exceeded",
                        "reason": rl_reason,
                        "retry_after": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
        
        # Continue to endpoint
        response = await call_next(request)
        return response


# ══════════════════════════════════════════════════════════════════════
# DEPENDENCY INJECTION FOR ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

async def require_2fa(
    request: Request,
    action: str,
    amount: float = 0
):
    """
    Dependency that enforces 2FA for sensitive operations.
    
    Usage:
        @app.post("/withdraw")
        async def withdraw(
            request: Request,
            data: WithdrawRequest,
            _2fa = Depends(lambda r: require_2fa(r, "withdrawal_create", data.amount))
        ):
            ...
    """
    user_id = request.headers.get("x-user-id")
    tfa_code = request.headers.get("x-2fa-code")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    allowed, error = await two_factor_enforcement.enforce_2fa(
        user_id=user_id,
        action=action,
        code=tfa_code,
        amount=amount
    )
    
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "2fa_required",
                "message": error,
                "action": action
            }
        )
    
    return True


async def check_withdrawal_limits(
    user_id: str,
    currency: str,
    amount: float
):
    """
    Check withdrawal velocity limits.
    
    Usage:
        await check_withdrawal_limits(user_id, "BTC", 0.5)
    """
    allowed, reason, details = await withdrawal_velocity_limiter.check_withdrawal_allowed(
        user_id, currency, amount
    )
    
    if not allowed:
        # Alert on breach
        await withdrawal_velocity_limiter.alert_on_breach(
            user_id, currency, amount, reason
        )
        
        raise HTTPException(
            status_code=403,
            detail={
                "error": "withdrawal_limit_exceeded",
                "reason": reason,
                "details": details
            }
        )
    
    return details


async def check_whitelist(
    user_id: str,
    currency: str,
    address: str
):
    """
    Check if withdrawal address is whitelisted.
    
    Usage:
        await check_whitelist(user_id, "BTC", "bc1q...")
    """
    allowed, reason, activation = await address_whitelist.check_address_whitelisted(
        user_id, currency, address
    )
    
    if not allowed:
        if reason == "address_not_whitelisted":
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "address_not_whitelisted",
                    "message": "This address is not in your whitelist. Please add it first."
                }
            )
        elif reason == "address_in_cooldown":
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "address_in_cooldown",
                    "message": "This address was recently added. Available after cooldown.",
                    "available_at": activation.isoformat() if activation else None
                }
            )
    
    return True


# ══════════════════════════════════════════════════════════════════════
# ADMIN AUDIT LOGGING HELPER
# ══════════════════════════════════════════════════════════════════════

async def audit_admin_action(
    request: Request,
    action: str,
    target_type: str,
    target_id: str,
    before_value = None,
    after_value = None,
    notes: str = None
):
    """
    Log an admin action to the audit trail.
    
    Usage:
        await audit_admin_action(
            request,
            action="user_suspend",
            target_type="user",
            target_id="user123",
            before_value={"status": "active"},
            after_value={"status": "suspended"},
            notes="Suspicious activity"
        )
    """
    admin_id = request.headers.get("x-user-id") or request.headers.get("x-admin-id")
    admin_email = request.headers.get("x-user-email") or "unknown"
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    
    return await admin_audit_log.log(
        admin_id=admin_id,
        admin_email=admin_email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before_value=before_value,
        after_value=after_value,
        ip_address=ip,
        user_agent=user_agent,
        notes=notes
    )


# ══════════════════════════════════════════════════════════════════════
# EXPORTS
# ══════════════════════════════════════════════════════════════════════

__all__ = [
    "SecurityMiddleware",
    "require_2fa",
    "check_withdrawal_limits",
    "check_whitelist",
    "audit_admin_action",
    "init_security_services",
]
# WAF Fixed Fri Dec 26 03:00:50 UTC 2025
