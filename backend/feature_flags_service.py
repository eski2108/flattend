"""
🚦 FEATURE FLAGS / KILL SWITCHES SERVICE (P1)

DB-driven feature flags with:
- Global, per-tenant, per-environment scopes
- Short TTL cache (30s) for performance
- Instant cache invalidation on update
- Full audit trail
- Admin bypass support

Usage:
    flags = FeatureFlagsService(db)
    
    # Check if feature is enabled
    if await flags.is_enabled('withdrawals_enabled'):
        # Process withdrawal
    else:
        raise HTTPException(503, "Withdrawals temporarily disabled")
    
    # In endpoint:
    await flags.enforce('withdrawals_enabled', 'Withdrawals')
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import uuid
from functools import lru_cache
import asyncio

logger = logging.getLogger(__name__)

# Cache TTL in seconds
FLAGS_CACHE_TTL = 30

# Default flag definitions
DEFAULT_FLAGS = {
    "maintenance_mode": {
        "default": False,
        "description": "Enable maintenance mode - blocks all user operations",
        "category": "system"
    },
    "signups_enabled": {
        "default": True,
        "description": "Allow new user registrations",
        "category": "auth"
    },
    "deposits_enabled": {
        "default": True,
        "description": "Allow cryptocurrency deposits",
        "category": "funds"
    },
    "withdrawals_enabled": {
        "default": True,
        "description": "Allow cryptocurrency withdrawals",
        "category": "funds"
    },
    "instant_buy_enabled": {
        "default": True,
        "description": "Allow instant buy from admin liquidity",
        "category": "trading"
    },
    "swaps_enabled": {
        "default": True,
        "description": "Allow cryptocurrency swaps",
        "category": "trading"
    },
    "p2p_enabled": {
        "default": True,
        "description": "Allow P2P trading",
        "category": "trading"
    },
    "trading_enabled": {
        "default": True,
        "description": "Allow spot trading",
        "category": "trading"
    },
    "kyc_required": {
        "default": False,
        "description": "Require KYC verification for trading",
        "category": "compliance"
    },
    "referrals_enabled": {
        "default": True,
        "description": "Enable referral system",
        "category": "marketing"
    }
}


class FeatureFlagsService:
    """
    Database-driven feature flags with caching.
    """
    
    def __init__(self, db):
        self.db = db
        self.collection = db.feature_flags
        self._cache: Dict[str, Any] = {}
        self._cache_timestamp: Optional[datetime] = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize default flags if they don't exist"""
        if self._initialized:
            return
        
        try:
            for flag_name, config in DEFAULT_FLAGS.items():
                existing = await self.collection.find_one({"flag_name": flag_name, "scope": "global"})
                if not existing:
                    await self.collection.insert_one({
                        "flag_id": str(uuid.uuid4()),
                        "flag_name": flag_name,
                        "enabled": config["default"],
                        "description": config["description"],
                        "category": config["category"],
                        "scope": "global",
                        "tenant_id": None,
                        "environment": None,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "updated_by": "system",
                        "update_reason": "Initial creation"
                    })
                    logger.info(f"🚦 Created default flag: {flag_name} = {config['default']}")
            
            # Create indexes
            await self.collection.create_index(
                [("flag_name", 1), ("scope", 1), ("tenant_id", 1), ("environment", 1)],
                unique=True,
                name="flag_lookup"
            )
            
            self._initialized = True
            logger.info("🚦 Feature flags service initialized")
            
        except Exception as e:
            logger.error(f"Error initializing feature flags: {e}")
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid"""
        if not self._cache_timestamp:
            return False
        age = (datetime.now(timezone.utc) - self._cache_timestamp).total_seconds()
        return age < FLAGS_CACHE_TTL
    
    def invalidate_cache(self):
        """Invalidate the cache immediately"""
        self._cache = {}
        self._cache_timestamp = None
        logger.info("🚦 Feature flags cache invalidated")
    
    async def _load_cache(self):
        """Load all flags into cache"""
        try:
            flags = await self.collection.find({}).to_list(1000)
            self._cache = {}
            for flag in flags:
                key = self._cache_key(flag["flag_name"], flag.get("scope"), flag.get("tenant_id"), flag.get("environment"))
                self._cache[key] = flag
            self._cache_timestamp = datetime.now(timezone.utc)
        except Exception as e:
            logger.error(f"Error loading feature flags cache: {e}")
    
    def _cache_key(self, flag_name: str, scope: str = "global", tenant_id: str = None, environment: str = None) -> str:
        """Generate cache key"""
        return f"{flag_name}:{scope}:{tenant_id or 'none'}:{environment or 'none'}"
    
    async def is_enabled(
        self,
        flag_name: str,
        tenant_id: str = None,
        environment: str = None,
        default: bool = True
    ) -> bool:
        """
        Check if a feature flag is enabled.
        
        Resolution order:
        1. Tenant-specific flag (if tenant_id provided)
        2. Environment-specific flag (if environment provided)
        3. Global flag
        4. Default value from DEFAULT_FLAGS
        5. Provided default parameter
        """
        await self.initialize()
        
        # Refresh cache if needed
        if not self._is_cache_valid():
            await self._load_cache()
        
        # Try tenant-specific first
        if tenant_id:
            key = self._cache_key(flag_name, "tenant", tenant_id, None)
            if key in self._cache:
                return self._cache[key].get("enabled", default)
        
        # Try environment-specific
        if environment:
            key = self._cache_key(flag_name, "environment", None, environment)
            if key in self._cache:
                return self._cache[key].get("enabled", default)
        
        # Try global
        key = self._cache_key(flag_name, "global", None, None)
        if key in self._cache:
            return self._cache[key].get("enabled", default)
        
        # Fall back to default
        if flag_name in DEFAULT_FLAGS:
            return DEFAULT_FLAGS[flag_name]["default"]
        
        return default
    
    async def enforce(
        self,
        flag_name: str,
        feature_display_name: str,
        tenant_id: str = None,
        environment: str = None,
        admin_id: str = None
    ):
        """
        Enforce a feature flag - raises HTTPException if disabled.
        
        Args:
            flag_name: The flag to check
            feature_display_name: Human-readable name for error message
            tenant_id: Optional tenant for multi-tenant support
            environment: Optional environment override
            admin_id: If provided, allows admin bypass (logged)
        """
        from fastapi import HTTPException
        
        # Check maintenance mode first (blocks everything except admin)
        if flag_name != "maintenance_mode":
            maintenance = await self.is_enabled("maintenance_mode", tenant_id, environment, default=False)
            if maintenance:
                if admin_id:
                    logger.warning(f"⚠️ Admin {admin_id} bypassing maintenance mode")
                else:
                    raise HTTPException(
                        status_code=503,
                        detail="System is under maintenance. Please try again later."
                    )
        
        enabled = await self.is_enabled(flag_name, tenant_id, environment)
        
        if not enabled:
            if admin_id:
                # Log admin bypass
                logger.warning(f"⚠️ Admin {admin_id} bypassing disabled feature: {flag_name}")
                await self.db.admin_audit_logs.insert_one({
                    "audit_id": str(uuid.uuid4()),
                    "action": "FEATURE_FLAG_BYPASS",
                    "admin_id": admin_id,
                    "flag_name": flag_name,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "immutable": True
                })
            else:
                raise HTTPException(
                    status_code=503,
                    detail=f"{feature_display_name} is temporarily disabled. Please try again later."
                )
    
    async def set_flag(
        self,
        flag_name: str,
        enabled: bool,
        admin_id: str,
        reason: str,
        scope: str = "global",
        tenant_id: str = None,
        environment: str = None
    ) -> dict:
        """
        Set a feature flag value.
        
        Args:
            flag_name: Name of the flag
            enabled: New value
            admin_id: Admin making the change
            reason: Mandatory reason for the change
            scope: "global", "tenant", or "environment"
            tenant_id: Required if scope is "tenant"
            environment: Required if scope is "environment"
        """
        await self.initialize()
        
        if not reason or len(reason.strip()) < 10:
            raise ValueError("Reason is required (minimum 10 characters)")
        
        if scope == "tenant" and not tenant_id:
            raise ValueError("tenant_id required for tenant scope")
        if scope == "environment" and not environment:
            raise ValueError("environment required for environment scope")
        
        timestamp = datetime.now(timezone.utc)
        correlation_id = str(uuid.uuid4())
        
        # Get current value
        query = {
            "flag_name": flag_name,
            "scope": scope,
            "tenant_id": tenant_id if scope == "tenant" else None,
            "environment": environment if scope == "environment" else None
        }
        
        existing = await self.collection.find_one(query)
        before_value = existing.get("enabled") if existing else None
        
        # Upsert flag
        update_data = {
            "enabled": enabled,
            "updated_at": timestamp.isoformat(),
            "updated_by": admin_id,
            "update_reason": reason.strip()
        }
        
        if not existing:
            # Create new flag
            flag_config = DEFAULT_FLAGS.get(flag_name, {})
            update_data.update({
                "flag_id": str(uuid.uuid4()),
                "flag_name": flag_name,
                "description": flag_config.get("description", f"Custom flag: {flag_name}"),
                "category": flag_config.get("category", "custom"),
                "scope": scope,
                "tenant_id": tenant_id if scope == "tenant" else None,
                "environment": environment if scope == "environment" else None,
                "created_at": timestamp.isoformat()
            })
            await self.collection.insert_one(update_data)
        else:
            await self.collection.update_one(query, {"$set": update_data})
        
        # Invalidate cache immediately
        self.invalidate_cache()
        
        # Audit log
        audit_entry = {
            "audit_id": str(uuid.uuid4()),
            "correlation_id": correlation_id,
            "action": "FEATURE_FLAG_UPDATE",
            "flag_name": flag_name,
            "scope": scope,
            "tenant_id": tenant_id,
            "environment": environment,
            "before_value": before_value,
            "after_value": enabled,
            "admin_id": admin_id,
            "reason": reason.strip(),
            "timestamp": timestamp.isoformat(),
            "immutable": True
        }
        await self.db.admin_audit_logs.insert_one(audit_entry)
        
        status = "ENABLED" if enabled else "DISABLED"
        logger.info(f"🚦 FLAG {status}: {flag_name} (scope={scope}) by {admin_id}. Reason: {reason}")
        
        return {
            "success": True,
            "flag_name": flag_name,
            "enabled": enabled,
            "scope": scope,
            "before_value": before_value,
            "after_value": enabled,
            "updated_by": admin_id,
            "reason": reason.strip(),
            "correlation_id": correlation_id,
            "timestamp": timestamp.isoformat()
        }
    
    async def get_all_flags(
        self,
        scope: str = None,
        tenant_id: str = None,
        environment: str = None,
        category: str = None
    ) -> List[dict]:
        """Get all flags with optional filters"""
        await self.initialize()
        
        query = {}
        if scope:
            query["scope"] = scope
        if tenant_id:
            query["tenant_id"] = tenant_id
        if environment:
            query["environment"] = environment
        if category:
            query["category"] = category
        
        flags = await self.collection.find(query).sort("flag_name", 1).to_list(1000)
        
        # Clean ObjectId
        for flag in flags:
            if "_id" in flag:
                del flag["_id"]
        
        return flags
    
    async def get_flag(self, flag_name: str, scope: str = "global", tenant_id: str = None, environment: str = None) -> Optional[dict]:
        """Get a specific flag"""
        query = {
            "flag_name": flag_name,
            "scope": scope,
            "tenant_id": tenant_id if scope == "tenant" else None,
            "environment": environment if scope == "environment" else None
        }
        
        flag = await self.collection.find_one(query)
        if flag and "_id" in flag:
            del flag["_id"]
        
        return flag
    
    async def get_flag_history(self, flag_name: str, limit: int = 50) -> List[dict]:
        """Get audit history for a flag"""
        history = await self.db.admin_audit_logs.find({
            "action": "FEATURE_FLAG_UPDATE",
            "flag_name": flag_name
        }).sort("timestamp", -1).limit(limit).to_list(limit)
        
        for entry in history:
            if "_id" in entry:
                del entry["_id"]
        
        return history


# Singleton instance
_feature_flags_service = None

def get_feature_flags_service(db) -> FeatureFlagsService:
    """Get or create feature flags service singleton"""
    global _feature_flags_service
    if _feature_flags_service is None:
        _feature_flags_service = FeatureFlagsService(db)
    return _feature_flags_service
