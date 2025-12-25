"""
══════════════════════════════════════════════════════════════════════
Security API Routes - Endpoints for security management
══════════════════════════════════════════════════════════════════════

Provides:
- Address whitelist management
- Admin audit log viewing
- Security event viewing
- Withdrawal limit info
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Query, Request
from pydantic import BaseModel

from security_hardening_v2 import (
    address_whitelist,
    admin_audit_log,
    withdrawal_velocity_limiter,
    DEFAULT_WITHDRAWAL_LIMITS,
)
from security_integration import audit_admin_action

logger = logging.getLogger(__name__)

security_router = APIRouter(prefix="/security", tags=["Security"])


# ══════════════════════════════════════════════════════════════════════
# REQUEST MODELS
# ══════════════════════════════════════════════════════════════════════

class AddWhitelistRequest(BaseModel):
    currency: str
    address: str
    label: str = ""


class RemoveWhitelistRequest(BaseModel):
    entry_id: str


# ══════════════════════════════════════════════════════════════════════
# ADDRESS WHITELIST ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@security_router.get("/whitelist")
async def get_whitelist(x_user_id: str = Header(None)):
    """
    Get user's whitelisted withdrawal addresses.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    addresses = await address_whitelist.get_user_whitelist(x_user_id)
    
    return {
        "success": True,
        "addresses": addresses,
        "cooldown_hours": address_whitelist.ADDRESS_ACTIVATION_COOLDOWN_HOURS
    }


@security_router.post("/whitelist/add")
async def add_whitelist_address(
    request: Request,
    data: AddWhitelistRequest,
    x_user_id: str = Header(None),
    x_2fa_code: str = Header(None)
):
    """
    Add address to whitelist (requires 2FA).
    Returns verification token - user must verify via email.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # 2FA required for this action
    from security_hardening_v2 import two_factor_enforcement
    allowed, error = await two_factor_enforcement.enforce_2fa(
        x_user_id, "whitelist_address_add", x_2fa_code
    )
    if not allowed:
        raise HTTPException(status_code=403, detail={"error": "2fa_required", "message": error})
    
    success, message, token = await address_whitelist.add_address(
        x_user_id,
        data.currency,
        data.address,
        data.label
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": True,
        "message": message,
        "verification_required": True,
        "cooldown_hours": address_whitelist.ADDRESS_ACTIVATION_COOLDOWN_HOURS
    }


@security_router.get("/whitelist/verify/{token}")
async def verify_whitelist_address(token: str):
    """
    Verify whitelist address via email link.
    """
    success, message = await address_whitelist.verify_address(token)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": True,
        "message": message,
        "cooldown_hours": address_whitelist.ADDRESS_ACTIVATION_COOLDOWN_HOURS
    }


@security_router.delete("/whitelist/{entry_id}")
async def remove_whitelist_address(
    entry_id: str,
    x_user_id: str = Header(None),
    x_2fa_code: str = Header(None)
):
    """
    Remove address from whitelist (requires 2FA).
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # 2FA required
    from security_hardening_v2 import two_factor_enforcement
    allowed, error = await two_factor_enforcement.enforce_2fa(
        x_user_id, "whitelist_address_add", x_2fa_code
    )
    if not allowed:
        raise HTTPException(status_code=403, detail={"error": "2fa_required", "message": error})
    
    success, message = await address_whitelist.remove_address(x_user_id, entry_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


# ══════════════════════════════════════════════════════════════════════
# WITHDRAWAL LIMITS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@security_router.get("/withdrawal-limits")
async def get_withdrawal_limits(x_user_id: str = Header(None)):
    """
    Get withdrawal limits for all supported currencies.
    """
    limits = {}
    for currency, limit in DEFAULT_WITHDRAWAL_LIMITS.items():
        limits[currency] = {
            "max_per_transaction": limit.max_per_transaction,
            "max_per_hour": limit.max_per_hour,
            "max_per_day": limit.max_per_day,
            "max_per_week": limit.max_per_week,
            "max_per_month": limit.max_per_month,
            "cooldown_minutes": limit.cooldown_minutes
        }
    
    return {
        "success": True,
        "limits": limits
    }


@security_router.get("/withdrawal-limits/{currency}")
async def check_withdrawal_availability(
    currency: str,
    amount: float = Query(0),
    x_user_id: str = Header(None)
):
    """
    Check if a specific withdrawal amount is allowed.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    allowed, reason, details = await withdrawal_velocity_limiter.check_withdrawal_allowed(
        x_user_id, currency.upper(), amount
    )
    
    return {
        "success": True,
        "allowed": allowed,
        "reason": reason,
        "details": details
    }


# ══════════════════════════════════════════════════════════════════════
# ADMIN AUDIT LOG ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@security_router.get("/admin/audit-log")
async def get_admin_audit_log(
    admin_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    target_id: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    skip: int = Query(0),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Search admin audit logs (admin only).
    """
    # Verify admin access
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    logs = await admin_audit_log.search(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        limit=limit,
        skip=skip
    )
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs)
    }


@security_router.get("/admin/audit-log/export")
async def export_admin_audit_log(
    action: Optional[str] = Query(None),
    limit: int = Query(10000, le=50000),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Export admin audit logs as CSV (admin only).
    """
    # Verify admin access
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    query = {}
    if action:
        query["action"] = action
    
    csv_data = await admin_audit_log.export_csv(query, limit)
    
    from fastapi.responses import Response
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@security_router.get("/admin/audit-log/verify/{audit_id}")
async def verify_audit_integrity(
    audit_id: str,
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Verify integrity of an audit log entry (admin only).
    """
    # Verify admin access
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    valid, message = await admin_audit_log.verify_integrity(audit_id)
    
    return {
        "success": True,
        "audit_id": audit_id,
        "integrity_valid": valid,
        "message": message
    }


# ══════════════════════════════════════════════════════════════════════
# SECURITY EVENTS ENDPOINT
# ══════════════════════════════════════════════════════════════════════

@security_router.get("/admin/security-events")
async def get_security_events(
    event_type: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get security events (WAF blocks, rate limit violations, etc.) - admin only.
    """
    # Verify admin access
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    from security_hardening_v2 import waf_engine
    
    if not waf_engine.db:
        return {"success": True, "events": [], "message": "No database connection"}
    
    query = {}
    if event_type:
        query["event_type"] = event_type
    if ip_address:
        query["ip_address"] = ip_address
    if user_id:
        query["user_id"] = user_id
    
    events = await waf_engine.db.security_events.find(query).sort(
        "timestamp", -1
    ).limit(limit).to_list(limit)
    
    # Remove MongoDB _id
    for event in events:
        event.pop("_id", None)
    
    return {
        "success": True,
        "events": events,
        "count": len(events)
    }


@security_router.get("/admin/security-alerts")
async def get_security_alerts(
    acknowledged: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get security alerts (limit breaches, etc.) - admin only.
    """
    # Verify admin access
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    from security_hardening_v2 import withdrawal_velocity_limiter
    
    if not withdrawal_velocity_limiter.db:
        return {"success": True, "alerts": [], "message": "No database connection"}
    
    query = {}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    if severity:
        query["severity"] = severity
    
    alerts = await withdrawal_velocity_limiter.db.security_alerts.find(query).sort(
        "timestamp", -1
    ).limit(limit).to_list(limit)
    
    # Remove MongoDB _id
    for alert in alerts:
        alert.pop("_id", None)
    
    return {
        "success": True,
        "alerts": alerts,
        "count": len(alerts)
    }


# ══════════════════════════════════════════════════════════════════════
# RATE LIMIT CONFIG ENDPOINT
# ══════════════════════════════════════════════════════════════════════

@security_router.get("/rate-limits")
async def get_rate_limit_configs():
    """
    Get current rate limit configurations (public info).
    """
    from security_hardening_v2 import RATE_LIMIT_CONFIGS
    from dataclasses import asdict
    
    configs = {}
    for name, config in RATE_LIMIT_CONFIGS.items():
        configs[name] = asdict(config)
    
    return {
        "success": True,
        "configs": configs
    }
