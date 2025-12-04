"""Centralized Referral Commission Calculator

Binance-Style Dual Tier System:
- Standard: 20% lifetime (default for all users)
- Golden: 50% lifetime (admin-activated only, no time limits)
"""

from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class ReferralCommissionCalculator:
    """Calculate referral commissions based on tier - NO TIME LIMITS"""
    
    STANDARD_RATE = 0.20  # 20% lifetime
    GOLDEN_RATE = 0.50    # 50% lifetime (admin-activated only)
    
    def __init__(self, db):
        self.db = db
    
    async def calculate_commission(
        self,
        referred_user_id: str,
        referrer_user_id: str,
        fee_amount: float
    ) -> Tuple[float, float, str]:
        """
        Calculate commission amount and rate based on referral tier.
        
        Returns:
            (commission_amount, commission_rate, tier_used)
        """
        try:
            # Get referred user's referral record
            referred_user = await self.db.users.find_one(
                {"user_id": referred_user_id},
                {"referred_by": 1, "referral_tier": 1, "created_at": 1, "_id": 0}
            )
            
            if not referred_user or referred_user.get("referred_by") != referrer_user_id:
                logger.warning(f"User {referred_user_id} not referred by {referrer_user_id}")
                return 0.0, 0.0, "none"
            
            # Get referral tier
            referral_tier = referred_user.get("referral_tier", "standard")
            
            # Check if Golden tier is still valid (within 100 days)
            if referral_tier == "golden":
                created_at = referred_user.get("created_at")
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                elif not isinstance(created_at, datetime):
                    created_at = datetime.now(timezone.utc)
                
                # Ensure timezone aware
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                
                days_since_joined = (datetime.now(timezone.utc) - created_at).days
                
                if days_since_joined <= self.GOLDEN_DAYS_LIMIT:
                    # Golden tier still active
                    commission_rate = self.GOLDEN_RATE
                    tier_used = "golden"
                    logger.info(f"Golden tier active for {referred_user_id}: Day {days_since_joined}/{self.GOLDEN_DAYS_LIMIT}")
                else:
                    # Golden expired, use standard
                    commission_rate = self.STANDARD_RATE
                    tier_used = "standard_expired_golden"
                    logger.info(f"Golden tier EXPIRED for {referred_user_id}: Day {days_since_joined}/{self.GOLDEN_DAYS_LIMIT}")
            else:
                # Standard tier - lifetime 20%
                commission_rate = self.STANDARD_RATE
                tier_used = "standard"
            
            commission_amount = fee_amount * commission_rate
            
            logger.info(
                f"Commission calculated: {commission_amount:.2f} "
                f"({commission_rate*100}% of {fee_amount:.2f}) - Tier: {tier_used}"
            )
            
            return commission_amount, commission_rate, tier_used
            
        except Exception as e:
            logger.error(f"Error calculating commission: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return 0.0, 0.0, "error"
    
    async def save_commission(
        self,
        referrer_user_id: str,
        referred_user_id: str,
        fee_amount: float,
        commission_amount: float,
        commission_rate: float,
        tier_used: str,
        fee_type: str,
        currency: str,
        transaction_id: str
    ) -> bool:
        """
        Save commission record to database.
        """
        try:
            commission_record = {
                "commission_id": f"COM_{transaction_id}_{datetime.now(timezone.utc).timestamp()}",
                "referrer_user_id": referrer_user_id,
                "referred_user_id": referred_user_id,
                "fee_type": fee_type,
                "fee_amount": fee_amount,
                "commission_amount": commission_amount,
                "commission_rate": commission_rate * 100,  # Store as percentage
                "tier_used": tier_used,
                "currency": currency,
                "related_transaction_id": transaction_id,
                "status": "completed",
                "created_at": datetime.now(timezone.utc),
                "created_at_iso": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.referral_commissions.insert_one(commission_record)
            logger.info(f"✅ Saved commission: {commission_amount:.2f} {currency} to {referrer_user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving commission: {str(e)}")
            return False
    
    async def get_referral_links(self, user_id: str) -> Dict:
        """
        Get both standard and golden referral links for a user.
        """
        try:
            # Get user's referral code
            referral_code = await self.db.referral_codes.find_one(
                {"user_id": user_id},
                {"referral_code": 1, "_id": 0}
            )
            
            if not referral_code:
                # Generate if doesn't exist
                user = await self.db.users.find_one(
                    {"user_id": user_id},
                    {"username": 1, "email": 1, "_id": 0}
                )
                
                name = user.get("username", user.get("email", "USER"))
                code = self._generate_code(name)
                
                await self.db.referral_codes.insert_one({
                    "user_id": user_id,
                    "referral_code": code,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                referral_code = {"referral_code": code}
            
            code = referral_code["referral_code"]
            base_url = "https://coinhubx.com/register"
            
            return {
                "standard_link": f"{base_url}?ref={code}&tier=standard",
                "golden_link": f"{base_url}?ref={code}&tier=golden",
                "referral_code": code
            }
            
        except Exception as e:
            logger.error(f"Error getting referral links: {str(e)}")
            return {
                "standard_link": "",
                "golden_link": "",
                "referral_code": ""
            }
    
    def _generate_code(self, name: str) -> str:
        """Generate referral code from name"""
        import re
        import random
        import string
        
        clean = re.sub(r'[^a-zA-Z]', '', name.upper())[:4]
        if len(clean) < 2:
            clean = "USER"
        
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"{clean}{random_part}"
