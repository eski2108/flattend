# KYC (Know Your Customer) Verification System
# Required for becoming a trader/seller and accessing higher limits

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class KYCSubmission(BaseModel):
    """KYC submission data from user"""
    user_id: str
    full_name: str
    date_of_birth: str  # YYYY-MM-DD format
    nationality: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: str
    postal_code: str
    country: str
    
    # Document details
    document_type: str  # "passport", "national_id", "drivers_license"
    document_number: str
    document_expiry: Optional[str] = None
    
    # File paths (stored after upload)
    document_front_url: str
    document_back_url: Optional[str] = None  # For ID cards
    selfie_url: str
    
    # Metadata
    kyc_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class KYCStatus(BaseModel):
    """User KYC status"""
    user_id: str
    kyc_status: str  # "unverified", "pending", "verified", "rejected"
    kyc_id: Optional[str] = None
    submitted_at: Optional[str] = None
    verified_at: Optional[str] = None
    can_trade: bool = True  # Basic buying allowed
    can_sell: bool = False  # Selling requires verification
    can_create_adverts: bool = False  # Creating adverts requires verification
    max_buy_limit_usd: float = 1000.0  # Unverified users have low limits
    max_sell_limit_usd: float = 0.0  # Cannot sell without verification

class KYCReview(BaseModel):
    """Admin KYC review action"""
    kyc_id: str
    admin_id: str
    action: str  # "approve" or "reject"
    rejection_reason: Optional[str] = None

async def submit_kyc(db, kyc_data: KYCSubmission) -> dict:
    """
    Submit KYC for review.
    Updates user status to 'pending'.
    """
    # Check if user already has pending/approved KYC
    existing_kyc = await db.kyc_submissions.find_one({
        "user_id": kyc_data.user_id,
        "status": {"$in": ["pending", "verified"]}
    })
    
    if existing_kyc:
        if existing_kyc["status"] == "verified":
            return {
                "success": False,
                "message": "You are already verified"
            }
        elif existing_kyc["status"] == "pending":
            return {
                "success": False,
                "message": "Your KYC is already pending review"
            }
    
    # Insert KYC submission
    await db.kyc_submissions.insert_one(kyc_data.model_dump())
    
    # Update user KYC status
    await db.users.update_one(
        {"user_id": kyc_data.user_id},
        {
            "$set": {
                "kyc_status": "pending",
                "kyc_submitted_at": kyc_data.submitted_at,
                "kyc_id": kyc_data.kyc_id
            }
        }
    )
    
    return {
        "success": True,
        "message": "KYC submitted successfully. We'll review your documents within 24-48 hours.",
        "kyc_id": kyc_data.kyc_id
    }

async def get_kyc_status(db, user_id: str) -> dict:
    """Get user's current KYC status and permissions"""
    user = await db.users.find_one({"user_id": user_id})
    
    if not user:
        return {"success": False, "message": "User not found"}
    
    kyc_status = user.get("kyc_status", "unverified")
    
    # Default permissions based on status
    permissions = {
        "unverified": {
            "can_trade": True,
            "can_sell": False,
            "can_create_adverts": False,
            "max_buy_limit_usd": 1000.0,
            "max_sell_limit_usd": 0.0,
            "verified_badge": False
        },
        "pending": {
            "can_trade": True,
            "can_sell": False,
            "can_create_adverts": False,
            "max_buy_limit_usd": 1000.0,
            "max_sell_limit_usd": 0.0,
            "verified_badge": False
        },
        "verified": {
            "can_trade": True,
            "can_sell": True,
            "can_create_adverts": True,
            "max_buy_limit_usd": 50000.0,
            "max_sell_limit_usd": 50000.0,
            "verified_badge": True
        },
        "rejected": {
            "can_trade": True,
            "can_sell": False,
            "can_create_adverts": False,
            "max_buy_limit_usd": 1000.0,
            "max_sell_limit_usd": 0.0,
            "verified_badge": False
        }
    }
    
    return {
        "success": True,
        "user_id": user_id,
        "kyc_status": kyc_status,
        "kyc_id": user.get("kyc_id"),
        "submitted_at": user.get("kyc_submitted_at"),
        "verified_at": user.get("kyc_verified_at"),
        "permissions": permissions[kyc_status]
    }

async def review_kyc(db, review: KYCReview) -> dict:
    """
    Admin reviews and approves/rejects KYC.
    Automatically updates user permissions.
    """
    # Get KYC submission
    kyc = await db.kyc_submissions.find_one({"kyc_id": review.kyc_id})
    
    if not kyc:
        return {"success": False, "message": "KYC submission not found"}
    
    if kyc["status"] != "pending":
        return {"success": False, "message": f"KYC already {kyc['status']}"}
    
    # Update KYC submission
    update_data = {
        "status": "verified" if review.action == "approve" else "rejected",
        "reviewed_by": review.admin_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    if review.action == "reject" and review.rejection_reason:
        update_data["rejection_reason"] = review.rejection_reason
    
    await db.kyc_submissions.update_one(
        {"kyc_id": review.kyc_id},
        {"$set": update_data}
    )
    
    # Update user status
    user_update = {
        "kyc_status": "verified" if review.action == "approve" else "rejected"
    }
    
    if review.action == "approve":
        user_update["kyc_verified_at"] = datetime.now(timezone.utc).isoformat()
        user_update["kyc_verified"] = True
        
        # Update trader profile if exists
        await db.trader_profiles.update_one(
            {"user_id": kyc["user_id"]},
            {"$set": {"kyc_verified": True}},
            upsert=True
        )
        
        # Recalculate badges to add "Verified" badge
        from badge_system import calculate_trader_badges
        await calculate_trader_badges(db, kyc["user_id"])
    
    await db.users.update_one(
        {"user_id": kyc["user_id"]},
        {"$set": user_update}
    )
    
    action_text = "approved" if review.action == "approve" else "rejected"
    
    return {
        "success": True,
        "message": f"KYC {action_text} successfully",
        "kyc_id": review.kyc_id,
        "user_id": kyc["user_id"],
        "new_status": "verified" if review.action == "approve" else "rejected"
    }

async def get_pending_kyc_submissions(db) -> list:
    """Get all pending KYC submissions for admin review"""
    pending = await db.kyc_submissions.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("submitted_at", 1).to_list(100)
    
    # Enrich with user info
    for kyc in pending:
        user = await db.users.find_one(
            {"user_id": kyc["user_id"]},
            {"email": 1, "full_name": 1}
        )
        if user:
            kyc["user_email"] = user.get("email")
            kyc["user_full_name"] = user.get("full_name")
    
    return pending

async def get_all_kyc_submissions(db, status: str = None) -> list:
    """Get all KYC submissions (optionally filtered by status)"""
    query = {"status": status} if status else {}
    
    submissions = await db.kyc_submissions.find(
        query,
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(500)
    
    # Enrich with user info
    for kyc in submissions:
        user = await db.users.find_one(
            {"user_id": kyc["user_id"]},
            {"email": 1, "full_name": 1}
        )
        if user:
            kyc["user_email"] = user.get("email")
            kyc["user_full_name"] = user.get("full_name")
    
    return submissions
