# FILE: /app/backend/middleware/idempotency.py
# SERVICE LOCK: FROZEN. Idempotency middleware for payment endpoints.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# In-memory cache for development (replace with Redis in production)
_idempotency_cache: Dict[str, Dict[str, Any]] = {}

# Payment endpoints that require idempotency
PAYMENT_ENDPOINTS = [
    "/api/swap",
    "/api/buy",
    "/api/sell",
    "/api/withdraw",
    "/api/p2p",
    "/api/express",
    "/api/instant",
    "/api/deposit",
    "/api/transfer"
]


def is_payment_endpoint(path: str) -> bool:
    """Check if the path is a payment endpoint requiring idempotency."""
    path_lower = path.lower()
    return any(endpoint in path_lower for endpoint in PAYMENT_ENDPOINTS)


def generate_idempotency_hash(key: str, path: str, method: str) -> str:
    """Generate a unique hash for the idempotency key."""
    data = f"{key}:{path}:{method}"
    return hashlib.sha256(data.encode()).hexdigest()


async def check_idempotency(
    idempotency_key: str,
    path: str,
    method: str
) -> Optional[Dict[str, Any]]:
    """
    Check if we've already processed this request.
    
    Returns cached response if exists, None otherwise.
    """
    cache_key = generate_idempotency_hash(idempotency_key, path, method)
    
    cached = _idempotency_cache.get(cache_key)
    if cached:
        # Check if not expired (24 hours)
        cached_time = cached.get("timestamp")
        if cached_time:
            age = (datetime.now(timezone.utc) - cached_time).total_seconds()
            if age < 86400:  # 24 hours
                logger.info(f"[IDEMPOTENCY] Returning cached response for key {idempotency_key}")
                return cached.get("response")
            else:
                # Expired, remove from cache
                del _idempotency_cache[cache_key]
    
    return None


async def store_idempotency_response(
    idempotency_key: str,
    path: str,
    method: str,
    response: Dict[str, Any]
):
    """Store response for future idempotent requests."""
    cache_key = generate_idempotency_hash(idempotency_key, path, method)
    
    _idempotency_cache[cache_key] = {
        "response": response,
        "timestamp": datetime.now(timezone.utc),
        "key": idempotency_key
    }
    
    # Cleanup old entries (keep cache size manageable)
    if len(_idempotency_cache) > 10000:
        # Remove oldest 1000 entries
        sorted_keys = sorted(
            _idempotency_cache.keys(),
            key=lambda k: _idempotency_cache[k].get("timestamp", datetime.min)
        )
        for key in sorted_keys[:1000]:
            del _idempotency_cache[key]


def validate_idempotency_key(key: Optional[str]) -> str:
    """
    Validate idempotency key format.
    Should be UUID v4 format.
    """
    if not key:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "IDEMPOTENCY_KEY_REQUIRED",
                "message": "Idempotency-Key header is required for payment endpoints. Use a UUID v4."
            }
        )
    
    # Basic validation (UUID-like format)
    key = key.strip()
    if len(key) < 16 or len(key) > 64:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_IDEMPOTENCY_KEY",
                "message": "Idempotency-Key must be 16-64 characters. Recommended: UUID v4."
            }
        )
    
    return key


class IdempotencyMiddleware:
    """
    FastAPI middleware for idempotency on payment endpoints.
    
    Usage:
        from middleware.idempotency import IdempotencyMiddleware
        app.add_middleware(IdempotencyMiddleware)
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        path = request.url.path
        method = request.method
        
        # Only check POST/PUT on payment endpoints
        if method in ["POST", "PUT"] and is_payment_endpoint(path):
            idempotency_key = request.headers.get("Idempotency-Key")
            
            try:
                # Validate key
                idempotency_key = validate_idempotency_key(idempotency_key)
                
                # Check for cached response
                cached_response = await check_idempotency(idempotency_key, path, method)
                
                if cached_response:
                    # Return cached response
                    response = JSONResponse(
                        content=cached_response,
                        headers={"X-Idempotent-Replay": "true"}
                    )
                    await response(scope, receive, send)
                    return
                
            except HTTPException as e:
                response = JSONResponse(
                    status_code=e.status_code,
                    content=e.detail
                )
                await response(scope, receive, send)
                return
        
        # Process request normally
        await self.app(scope, receive, send)


# Decorator for route-level idempotency
def require_idempotency(func):
    """
    Decorator to require idempotency key on a specific route.
    
    Usage:
        @app.post("/api/payment")
        @require_idempotency
        async def process_payment(request: Request, ...):
            ...
    """
    async def wrapper(*args, **kwargs):
        request = kwargs.get("request") or (args[0] if args else None)
        
        if not request or not isinstance(request, Request):
            return await func(*args, **kwargs)
        
        idempotency_key = request.headers.get("Idempotency-Key")
        
        try:
            idempotency_key = validate_idempotency_key(idempotency_key)
        except HTTPException:
            raise
        
        # Check cache
        cached = await check_idempotency(
            idempotency_key,
            str(request.url.path),
            request.method
        )
        
        if cached:
            return JSONResponse(
                content=cached,
                headers={"X-Idempotent-Replay": "true"}
            )
        
        # Execute function
        result = await func(*args, **kwargs)
        
        # Store response for future
        if hasattr(result, "body"):
            try:
                response_data = json.loads(result.body)
                await store_idempotency_response(
                    idempotency_key,
                    str(request.url.path),
                    request.method,
                    response_data
                )
            except:
                pass
        
        return result
    
    return wrapper
