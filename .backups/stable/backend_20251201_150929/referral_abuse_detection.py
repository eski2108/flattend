"""
Referral System Anti-Abuse Detection
Prevents IP/device farming of £20 bonuses and lifetime commissions
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Default configuration (can be overridden from admin settings)
DEFAULT_CONFIG = {
    "max_referrals_per_ip_per_referrer": 3,
    "referral_ip_cooldown_hours": 24,
    "block_bonus_on_suspicious_referrals": True,
    "user_agent_similarity_threshold": 0.85  # 85% similar = same device
}


async def get_abuse_detection_config(db) -> Dict[str, Any]:
    """Get current anti-abuse configuration from admin settings"""
    config = await db.referral_abuse_config.find_one({"config_id": "main"})
    
    if not config:
        # Create default config
        default_config = {
            "config_id": "main",
            **DEFAULT_CONFIG,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.referral_abuse_config.insert_one(default_config)
        return DEFAULT_CONFIG
    
    return {
        "max_referrals_per_ip_per_referrer": config.get("max_referrals_per_ip_per_referrer", 3),
        "referral_ip_cooldown_hours": config.get("referral_ip_cooldown_hours", 24),
        "block_bonus_on_suspicious_referrals": config.get("block_bonus_on_suspicious_referrals", True),
        "user_agent_similarity_threshold": config.get("user_agent_similarity_threshold", 0.85)
    }


def calculate_user_agent_similarity(ua1: str, ua2: str) -> float:
    """
    Simple similarity check between two user agent strings.
    Returns a score between 0 and 1 (1 = identical).
    """
    if not ua1 or not ua2:
        return 0.0
    
    # Convert to lowercase for comparison
    ua1_lower = ua1.lower()
    ua2_lower = ua2.lower()
    
    # Exact match
    if ua1_lower == ua2_lower:
        return 1.0
    
    # Check key components (browser, OS, device)
    ua1_parts = set(ua1_lower.split())
    ua2_parts = set(ua2_lower.split())
    
    # Calculate Jaccard similarity
    intersection = len(ua1_parts.intersection(ua2_parts))
    union = len(ua1_parts.union(ua2_parts))
    
    if union == 0:
        return 0.0
    
    return intersection / union


async def check_referral_abuse(
    db,
    ip_address: str,
    user_agent: str,
    referrer_user_id: str,
    referral_code: str
) -> Dict[str, Any]:
    """
    Check if a new referral signup shows signs of abuse.
    
    Returns:
    {
        "is_suspicious": bool,
        "reasons": list of reasons,
        "block_bonus": bool,
        "allow_signup": bool
    }
    """
    config = await get_abuse_detection_config(db)
    
    reasons = []
    is_suspicious = False
    
    # Get all existing referrals for this referrer
    existing_referrals = await db.referral_relationships.find({
        "referrer_user_id": referrer_user_id
    }).to_list(1000)
    
    # Check 1: IP cooldown check (same IP, same referrer, within X hours)
    cooldown_threshold = datetime.now(timezone.utc) - timedelta(
        hours=config["referral_ip_cooldown_hours"]
    )
    
    recent_same_ip = []
    for ref in existing_referrals:
        signup_date_str = ref.get("signup_date", ref.get("created_at"))
        if signup_date_str:
            try:
                signup_date = datetime.fromisoformat(signup_date_str.replace('Z', '+00:00'))
                if signup_date > cooldown_threshold and ref.get("ip_address") == ip_address:
                    recent_same_ip.append(ref)
            except:
                pass
    
    if recent_same_ip:
        is_suspicious = True
        reasons.append(f"IP_COOLDOWN_VIOLATION: {len(recent_same_ip)} signup(s) from same IP in last {config['referral_ip_cooldown_hours']}h")
        logger.warning(f"⚠️ Referral abuse detected: IP {ip_address} has {len(recent_same_ip)} recent signups for referrer {referrer_user_id}")
    
    # Check 2: Total referrals from same IP for this referrer
    same_ip_count = sum(1 for ref in existing_referrals if ref.get("ip_address") == ip_address)
    
    if same_ip_count >= config["max_referrals_per_ip_per_referrer"]:
        is_suspicious = True
        reasons.append(f"IP_LIMIT_EXCEEDED: {same_ip_count} total referrals from IP {ip_address} (max: {config['max_referrals_per_ip_per_referrer']})")
        logger.warning(f"⚠️ Referral abuse detected: IP {ip_address} has {same_ip_count} total signups for referrer {referrer_user_id}")
    
    # Check 3: Device fingerprint check (IP + similar user agent)
    similar_device_referrals = []
    for ref in existing_referrals:
        if ref.get("ip_address") == ip_address:
            ref_user_agent = ref.get("user_agent", "")
            similarity = calculate_user_agent_similarity(user_agent, ref_user_agent)
            
            if similarity >= config["user_agent_similarity_threshold"]:
                similar_device_referrals.append(ref)
    
    if len(similar_device_referrals) > 0:
        is_suspicious = True
        reasons.append(f"DEVICE_FINGERPRINT_MATCH: {len(similar_device_referrals)} signup(s) from same device (IP + User-Agent match)")
        logger.warning(f"⚠️ Referral abuse detected: Device fingerprint match for referrer {referrer_user_id}")
    
    # Decide whether to block bonus
    block_bonus = is_suspicious and config["block_bonus_on_suspicious_referrals"]
    
    return {
        "is_suspicious": is_suspicious,
        "reasons": reasons,
        "block_bonus": block_bonus,
        "allow_signup": True,  # Always allow signup, just block rewards
        "same_ip_count": same_ip_count,
        "recent_ip_count": len(recent_same_ip),
        "device_matches": len(similar_device_referrals)
    }


async def log_suspicious_referral(
    db,
    referrer_user_id: str,
    referred_user_id: str,
    ip_address: str,
    user_agent: str,
    reasons: List[str],
    blocked: bool
) -> str:
    """
    Log a suspicious referral for admin review
    """
    log_id = f"ABUSE_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{referred_user_id[:8]}"
    
    log_entry = {
        "log_id": log_id,
        "referrer_user_id": referrer_user_id,
        "referred_user_id": referred_user_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "reasons": reasons,
        "bonus_blocked": blocked,
        "status": "pending_review",  # pending_review, approved, denied
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewed_by": None
    }
    
    await db.suspicious_referrals.insert_one(log_entry)
    
    logger.info(f"✅ Suspicious referral logged: {log_id}")
    
    return log_id


async def get_suspicious_referrals(
    db,
    status: Optional[str] = None,
    referrer_user_id: Optional[str] = None,
    limit: int = 100
) -> List[Dict]:
    """
    Get list of suspicious referrals for admin review
    """
    query = {}
    
    if status:
        query["status"] = status
    
    if referrer_user_id:
        query["referrer_user_id"] = referrer_user_id
    
    suspicious = await db.suspicious_referrals.find(query).sort(
        "created_at", -1
    ).limit(limit).to_list(limit)
    
    # Enrich with user details
    for item in suspicious:
        # Get referrer info
        referrer = await db.user_accounts.find_one(
            {"user_id": item["referrer_user_id"]},
            {"_id": 0, "full_name": 1, "email": 1}
        )
        item["referrer_name"] = referrer.get("full_name") if referrer else "Unknown"
        item["referrer_email"] = referrer.get("email") if referrer else "Unknown"
        
        # Get referred user info
        referred = await db.user_accounts.find_one(
            {"user_id": item["referred_user_id"]},
            {"_id": 0, "full_name": 1, "email": 1}
        )
        item["referred_name"] = referred.get("full_name") if referred else "Unknown"
        item["referred_email"] = referred.get("email") if referred else "Unknown"
    
    return suspicious


async def review_suspicious_referral(
    db,
    log_id: str,
    action: str,  # "approve" or "deny"
    admin_user_id: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Admin reviews and approves/denies a suspicious referral
    """
    log_entry = await db.suspicious_referrals.find_one({"log_id": log_id})
    
    if not log_entry:
        return {"success": False, "error": "Log entry not found"}
    
    # Update log entry
    await db.suspicious_referrals.update_one(
        {"log_id": log_id},
        {
            "$set": {
                "status": "approved" if action == "approve" else "denied",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": admin_user_id,
                "review_notes": notes
            }
        }
    )
    
    # If approved, update the referral relationship to allow bonuses
    if action == "approve":
        await db.referral_relationships.update_one(
            {"referred_user_id": log_entry["referred_user_id"]},
            {
                "$set": {
                    "suspicious": False,
                    "manually_approved": True,
                    "approved_by": admin_user_id,
                    "approved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        logger.info(f"✅ Referral approved by admin: {log_id}")
    else:
        # If denied, ensure bonuses remain blocked
        await db.referral_relationships.update_one(
            {"referred_user_id": log_entry["referred_user_id"]},
            {
                "$set": {
                    "suspicious": True,
                    "manually_denied": True,
                    "denied_by": admin_user_id,
                    "denied_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        logger.info(f"❌ Referral denied by admin: {log_id}")
    
    return {
        "success": True,
        "action": action,
        "log_id": log_id
    }


async def get_ip_referral_stats(db, ip_address: str) -> Dict[str, Any]:
    """
    Get statistics for a specific IP address across all referrers
    """
    # Find all referrals from this IP
    referrals_from_ip = await db.referral_relationships.find({
        "ip_address": ip_address
    }).to_list(1000)
    
    # Group by referrer
    by_referrer = {}
    for ref in referrals_from_ip:
        referrer_id = ref.get("referrer_user_id")
        if referrer_id not in by_referrer:
            by_referrer[referrer_id] = []
        by_referrer[referrer_id].append(ref)
    
    return {
        "ip_address": ip_address,
        "total_referrals": len(referrals_from_ip),
        "unique_referrers": len(by_referrer),
        "referrals_by_referrer": {
            referrer_id: len(refs) 
            for referrer_id, refs in by_referrer.items()
        },
        "suspicious_count": sum(1 for ref in referrals_from_ip if ref.get("suspicious", False))
    }
