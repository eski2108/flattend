"""
Security Middleware for CoinHubX
Handles authentication, rate limiting, and request validation
"""

import time
import jwt
import os
from fastapi import Request, HTTPException
from functools import wraps
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')

# ==================== RATE LIMITING ====================

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = {}
        self.limits = {
            'login': (5, 300),  # 5 requests per 5 minutes
            'register': (3, 600),  # 3 requests per 10 minutes
            'withdraw': (10, 3600),  # 10 requests per hour
            'deposit': (20, 3600),  # 20 requests per hour
            'swap': (30, 60),  # 30 requests per minute
            'default': (100, 60),  # 100 requests per minute
        }
    
    def check_rate_limit(self, key: str, action: str = 'default') -> Tuple[bool, int]:
        """Check if request is within rate limit"""
        now = time.time()
        limit_key = f"{key}:{action}"
        
        # Get limits for this action
        max_requests, window = self.limits.get(action, self.limits['default'])
        
        # Initialize if new
        if limit_key not in self.requests:
            self.requests[limit_key] = []
        
        # Remove old requests outside window
        self.requests[limit_key] = [
            req_time for req_time in self.requests[limit_key]
            if now - req_time < window
        ]
        
        # Check if over limit
        if len(self.requests[limit_key]) >= max_requests:
            wait_time = int(window - (now - self.requests[limit_key][0]))
            return False, wait_time
        
        # Add new request
        self.requests[limit_key].append(now)
        return True, 0
    
    def clear_rate_limit(self, key: str, action: str = 'default'):
        """Clear rate limit for key (e.g., after successful login)"""
        limit_key = f"{key}:{action}"
        if limit_key in self.requests:
            del self.requests[limit_key]

rate_limiter = RateLimiter()

# ==================== AUTHENTICATION ====================

async def verify_token(request: Request) -> dict:
    """
    Verify JWT token from Authorization header
    Returns user data if valid, raises HTTPException if not
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    if not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_admin(request: Request) -> dict:
    """
    Verify user is admin
    Returns admin data if valid, raises HTTPException if not
    """
    user = await verify_token(request)
    
    if not user.get('is_admin') and user.get('role') != 'admin':
        logger.warning(f"Unauthorized admin access attempt by user {user.get('user_id')}")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user

# ==================== INPUT SANITIZATION ====================

def sanitize_string(value: str, max_length: int = 255) -> str:
    """
    Sanitize string input to prevent injection attacks
    """
    if not isinstance(value, str):
        return str(value)[:max_length]
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Limit length
    value = value[:max_length]
    
    # Strip whitespace
    value = value.strip()
    
    return value

def sanitize_numeric(value, min_val=0, max_val=None) -> float:
    """
    Sanitize numeric input
    """
    try:
        num = float(value)
        if num < min_val:
            raise ValueError(f"Value must be at least {min_val}")
        if max_val is not None and num > max_val:
            raise ValueError(f"Value must not exceed {max_val}")
        return num
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid numeric value")

# ==================== REQUEST VALIDATION ====================

def validate_user_id(user_id: str) -> str:
    """
    Validate user_id format
    """
    if not user_id or len(user_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    return sanitize_string(user_id, 100)

def validate_currency(currency: str) -> str:
    """
    Validate cryptocurrency symbol
    """
    if not currency or not currency.isupper() or len(currency) > 10:
        raise HTTPException(status_code=400, detail="Invalid currency code")
    return currency

def validate_amount(amount, min_amount=0.00000001) -> float:
    """
    Validate transaction amount
    """
    try:
        amount_float = float(amount)
        if amount_float <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        if amount_float < min_amount:
            raise HTTPException(status_code=400, detail=f"Amount must be at least {min_amount}")
        if amount_float > 1000000:  # Max transaction limit
            raise HTTPException(status_code=400, detail="Amount exceeds maximum limit")
        return amount_float
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid amount format")

# ==================== DECORATORS ====================

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    async def wrapper(request: Request, *args, **kwargs):
        user = await verify_token(request)
        return await f(request, user=user, *args, **kwargs)
    return wrapper

def require_admin(f):
    """Decorator to require admin access"""
    @wraps(f)
    async def wrapper(request: Request, *args, **kwargs):
        admin = await verify_admin(request)
        return await f(request, admin=admin, *args, **kwargs)
    return wrapper

def rate_limit(action: str = 'default'):
    """Decorator to apply rate limiting"""
    def decorator(f):
        @wraps(f)
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = request.client.host
            allowed, wait_time = rate_limiter.check_rate_limit(client_ip, action)
            
            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Try again in {wait_time} seconds"
                )
            
            return await f(request, *args, **kwargs)
        return wrapper
    return decorator
