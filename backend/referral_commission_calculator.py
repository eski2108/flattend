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
        Calculate commission based on referral tier.
        NO TIME LIMITS - Golden is lifetime if admin-activated.
        
        Returns:
            (commission_amount, commission_rate, tier_used)
        """
        try:
            # Get the referral relationship record
            referred_user = await self.db.users.find_one(
                {"user_id": referred_user_id},
                {"referred_by": 1, "referral_tier": 1, "referred_via_link": 1, "_id": 0}
            )
            
            if not referred_user or referred_user.get("referred_by") != referrer_user_id:
                logger.warning(f"User {referred_user_id} not referred by {referrer_user_id}")
                return 0.0, 0.0, "none"
            
            # Determine which tier was used for signup
            # Priority: Check which link they signed up with
            referral_tier = referred_user.get("referral_tier", "standard")
            referred_via = referred_user.get("referred_via_link", "standard")
            
            # Use the tier they signed up with (locked at signup)
            if referral_tier == "golden" or referred_via == "golden":
                commission_rate = self.GOLDEN_RATE
                tier_used = "golden"
                logger.info(f"Golden tier (50%) for {referred_user_id} - LIFETIME")
            else:
                commission_rate = self.STANDARD_RATE
                tier_used = "standard"
                logger.info(f"Standard tier (20%) for {referred_user_id} - LIFETIME")
            
            commission_amount = fee_amount * commission_rate
            
            logger.info(
                f"Commission: £{commission_amount:.2f} "
                f"({commission_rate*100}% of £{fee_amount:.2f}) - Tier: {tier_used}"
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
