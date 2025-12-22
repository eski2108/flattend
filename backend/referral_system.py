# Referral System for Coin Hub X
# Database-driven configuration via Admin Panel

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import random
import string

# Default Referral Configuration (used if database config not found)
DEFAULT_REFERRAL_CONFIG = {
    "referrer_commission_percent": 20.0,  # Referrer gets 20% of platform fees
    "commission_duration_months": 12,  # Commission lasts 12 months
    "referred_user_fee_discount_percent": 100.0,  # 0% fees (100% discount)
    "fee_discount_duration_days": 30,  # Fee discount lasts 30 days
}

# This will be loaded from database at runtime
REFERRAL_CONFIG = DEFAULT_REFERRAL_CONFIG.copy()

async def load_referral_config_from_db(db):
    """Load referral configuration from database"""
    global REFERRAL_CONFIG
    try:
        config_doc = await db.referral_config.find_one({"config_id": "main"})
        if config_doc:
            REFERRAL_CONFIG = {
                "referrer_commission_percent": config_doc.get("referrer_commission_percent", 20.0),
                "commission_duration_months": config_doc.get("commission_duration_months", 12),
                "referred_user_fee_discount_percent": config_doc.get("referred_user_fee_discount_percent", 100.0),
                "fee_discount_duration_days": config_doc.get("fee_discount_duration_days", 30),
            }
        else:
            # Initialize database with defaults
            await db.referral_config.insert_one({
                "config_id": "main",
                **DEFAULT_REFERRAL_CONFIG,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
    except Exception as e:
        print(f"Error loading referral config: {e}")
        REFERRAL_CONFIG = DEFAULT_REFERRAL_CONFIG.copy()
    
    return REFERRAL_CONFIG

async def update_referral_config_in_db(db, updates: dict):
    """Update referral configuration in database"""
    global REFERRAL_CONFIG
    
    await db.referral_config.update_one(
        {"config_id": "main"},
        {
            "$set": {
                **updates,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Reload config
    return await load_referral_config_from_db(db)

# Models
class ReferralCode(BaseModel):
    """User's referral code"""
    model_config = ConfigDict(extra="ignore")
    
    code_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the code
    referral_code: str  # Unique code (e.g., "ALICE2024")
    referral_link: str  # Full link with code
    referral_type: str = "public"  # "private" (£10 bonus) or "public" (no bonus)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class ReferralRelationship(BaseModel):
    """Track who referred whom"""
    model_config = ConfigDict(extra="ignore")
    
    relationship_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_user_id: str  # User who made the referral
    referred_user_id: str  # User who was referred
    referral_code_used: str  # Code that was used
    referral_type: str  # "private" or "public"
    signup_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    commission_end_date: datetime  # When commission expires (12 months)
    fee_discount_end_date: datetime  # When referred user's 0% fee expires (30 days)
    is_commission_active: bool = True
    is_fee_discount_active: bool = True
    
    # £10 Bonus tracking (only for private referrals)
    total_deposits_gbp: float = 0.0  # Track total deposits in GBP
    has_reached_150_deposit: bool = False  # £150 milestone
    bonus_paid: bool = False  # £10 bonus paid
    bonus_paid_at: Optional[datetime] = None

class ReferralStats(BaseModel):
    """User's referral statistics"""
    model_config = ConfigDict(extra="ignore")
    
    stats_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Private referral stats
    total_private_signups: int = 0
    private_users_deposited_150: int = 0
    total_bonus_earned_gbp: float = 0.0  # Total £10 bonuses
    
    # Public referral stats  
    total_public_signups: int = 0
    
    # Shared stats
    total_signups: int = 0  # Private + Public
    total_trades: int = 0  # Total trades by all referrals
    total_commission_earned_gbp: float = 0.0  # Total 20% commission (separate from bonus)
    active_referrals: int = 0  # Referrals still within 12-month period
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReferralCommission(BaseModel):
    """Individual commission transaction"""
    model_config = ConfigDict(extra="ignore")
    
    commission_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_user_id: str
    referred_user_id: str
    transaction_id: str  # Original transaction that generated the fee
    transaction_type: str  # withdrawal, p2p_trade, etc.
    original_fee_amount: float  # Total fee from transaction
    commission_amount: float  # 20% of original fee
    currency: str  # BTC, ETH, USDT, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None
    status: str = "pending"  # pending, paid, failed

class ReferralEarnings(BaseModel):
    """User's total referral earnings by currency"""
    model_config = ConfigDict(extra="ignore")
    
    earnings_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    currency: str  # BTC, ETH, USDT
    total_earned: float = 0.0
    pending_earnings: float = 0.0
    paid_earnings: float = 0.0
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminReferralWallet(BaseModel):
    """Admin wallet balance for referral payouts"""
    model_config = ConfigDict(extra="ignore")
    
    wallet_id: str = "admin_referral_wallet"
    balance_usdt: float = 0.0  # USDT balance for payouts
    total_paid_out: float = 0.0
    last_topped_up: Optional[datetime] = None
    last_updated: datetime = Field(default_factory=lambda: str(uuid.uuid4()))

class ReferralBonusPayout(BaseModel):
    """Track £10 bonus payouts separately from commission"""
    model_config = ConfigDict(extra="ignore")
    
    payout_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_user_id: str
    referred_user_id: str
    bonus_amount_gbp: float = 10.0  # £10 bonus
    bonus_amount_usdt: float  # Converted to USDT
    paid_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"  # completed, failed

# Utility Functions
def generate_referral_code(username: str) -> str:
    """Generate unique referral code"""
    # Format: USERNAME + 4 random chars (e.g., ALICE2X9K)
    clean_username = ''.join(filter(str.isalnum, username.upper()))[:8]
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{clean_username}{random_suffix}"

def generate_referral_link(referral_code: str, base_url: str = "https://coinhubx.net") -> str:
    """Generate referral link"""
    return f"{base_url}/register?ref={referral_code}"

def calculate_commission(original_fee: float, commission_percent: float = 20.0) -> float:
    """Calculate commission amount"""
    return (original_fee * commission_percent) / 100.0

def is_within_commission_period(signup_date: datetime, months: int = 12) -> bool:
    """Check if referral is still within commission period"""
    # Ensure signup_date is timezone-aware
    if signup_date.tzinfo is None:
        signup_date = signup_date.replace(tzinfo=timezone.utc)
    
    expiry_date = signup_date + timedelta(days=months * 30)
    return datetime.now(timezone.utc) < expiry_date

def is_within_fee_discount_period(signup_date: datetime, days: int = 30) -> bool:
    """Check if referred user is still within 0% fee period"""
    # Ensure signup_date is timezone-aware
    if signup_date.tzinfo is None:
        signup_date = signup_date.replace(tzinfo=timezone.utc)
    
    expiry_date = signup_date + timedelta(days=days)
    return datetime.now(timezone.utc) < expiry_date

def calculate_discounted_fee(original_fee: float, discount_percent: float = 100.0) -> float:
    """Calculate fee after discount (100% = 0 fee)"""
    discount = (original_fee * discount_percent) / 100.0
    return max(0.0, original_fee - discount)

# Request/Response Models
class CreateReferralCodeRequest(BaseModel):
    user_id: str
    username: str

class ReferralCodeResponse(BaseModel):
    referral_code: str
    referral_link: str
    message: str

class ApplyReferralCodeRequest(BaseModel):
    referred_user_id: str
    referral_code: str

from typing import Any

class ReferralDashboardResponse(BaseModel):
    referral_code: str
    referral_link: str
    total_invited: int
    total_signups: int
    total_trades: int
    active_referrals: int
    earnings_by_currency: List[Dict[str, Any]]
    recent_commissions: List[Dict[str, Any]]

class ShareReferralRequest(BaseModel):
    referral_code: str
    platform: str  # whatsapp, telegram, twitter, etc.
