"""
Security Module for Coin Hub X
Handles password hashing, rate limiting, and authentication
"""

import bcrypt
import jwt
import pyotp
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Rate limiting storage (in-memory, use Redis in production)
rate_limit_storage = defaultdict(list)

class PasswordHasher:
    """Secure password hashing using bcrypt"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def migrate_from_sha256(sha256_hash: str, plain_password: str) -> Optional[str]:
        """
        Migrate old SHA256 hash to bcrypt
        This should be called during login when old hash is detected
        """
        import hashlib
        # Verify old password first
        if hashlib.sha256(plain_password.encode()).hexdigest() == sha256_hash:
            # Password is correct, create new bcrypt hash
            return PasswordHasher.hash_password(plain_password)
        return None


class RateLimiter:
    """Rate limiting for API endpoints"""
    
    @staticmethod
    def check_rate_limit(
        identifier: str,  # IP address or user_id
        action: str,  # "login", "register", "withdrawal", etc.
        max_attempts: int = 5,
        window_seconds: int = 300  # 5 minutes
    ) -> tuple[bool, Optional[int]]:
        """
        Check if rate limit is exceeded
        Returns: (is_allowed, seconds_until_reset)
        """
        now = datetime.now(timezone.utc).timestamp()
        key = f"{action}:{identifier}"
        
        # Clean old attempts
        rate_limit_storage[key] = [
            timestamp for timestamp in rate_limit_storage[key]
            if now - timestamp < window_seconds
        ]
        
        # Check if limit exceeded
        if len(rate_limit_storage[key]) >= max_attempts:
            oldest_attempt = min(rate_limit_storage[key])
            seconds_until_reset = int(window_seconds - (now - oldest_attempt))
            return False, seconds_until_reset
        
        # Record this attempt
        rate_limit_storage[key].append(now)
        return True, None
    
    @staticmethod
    def clear_rate_limit(identifier: str, action: str):
        """Clear rate limit for successful action (e.g., successful login)"""
        key = f"{action}:{identifier}"
        if key in rate_limit_storage:
            del rate_limit_storage[key]


class TwoFactorAuth:
    """Two-Factor Authentication using TOTP"""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a new 2FA secret"""
        return pyotp.random_base32()
    
    @staticmethod
    def get_qr_code_url(secret: str, email: str, issuer: str = "Coin Hub X") -> str:
        """Get QR code URL for 2FA setup"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(email, issuer_name=issuer)
    
    @staticmethod
    def verify_code(secret: str, code: str) -> bool:
        """Verify a 2FA code"""
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(code, valid_window=1)  # Allow 1 step before/after for time drift
        except Exception as e:
            logger.error(f"2FA verification error: {e}")
            return False


class JWTHandler:
    """JWT token management"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.JWTError as e:
            logger.error(f"JWT verification error: {e}")
            return None


class WithdrawalSecurity:
    """Security measures for withdrawals"""
    
    @staticmethod
    def requires_email_confirmation(amount_gbp: float) -> bool:
        """Check if withdrawal requires email confirmation"""
        return amount_gbp > 1000
    
    @staticmethod
    def requires_hold_period(amount_gbp: float) -> bool:
        """Check if withdrawal requires 24-hour hold"""
        return amount_gbp > 5000
    
    @staticmethod
    def requires_admin_approval(amount_gbp: float) -> bool:
        """Check if withdrawal requires admin approval"""
        return amount_gbp > 10000
    
    @staticmethod
    def get_security_level(amount_gbp: float) -> str:
        """Get security level for withdrawal amount"""
        if amount_gbp > 10000:
            return "admin_approval_required"
        elif amount_gbp > 5000:
            return "24h_hold"
        elif amount_gbp > 1000:
            return "email_confirmation"
        else:
            return "instant"


# Export instances
password_hasher = PasswordHasher()
rate_limiter = RateLimiter()
two_factor_auth = TwoFactorAuth()
jwt_handler = JWTHandler()
withdrawal_security = WithdrawalSecurity()
