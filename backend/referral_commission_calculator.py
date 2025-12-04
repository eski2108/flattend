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
            # Get the referral relationship record (check user_accounts first, then users)
            referred_user = await self.db.user_accounts.find_one(
                {"user_id": referred_user_id},
                {"referred_by": 1, "referral_tier": 1, "referred_via_link": 1, "_id": 0}
            )
            
            if not referred_user:
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
        Get referral links for user.
        Returns both Standard and Golden links if user is Golden referrer.
        Regular users only get Standard link.
        """
        try:
            # Check if user is Golden referrer (check user_accounts first, then fallback to users)
            user = await self.db.user_accounts.find_one(
                {"user_id": user_id},
                {"is_golden_referrer": 1, "username": 1, "email": 1, "full_name": 1, "_id": 0}
            )
            
            if not user:
                user = await self.db.users.find_one(
                    {"user_id": user_id},
                    {"is_golden_referrer": 1, "username": 1, "email": 1, "_id": 0}
                )
            
            is_golden = user.get("is_golden_referrer", False) if user else False
            
            # Get or generate standard referral code
            referral_codes = await self.db.referral_codes.find_one(
                {"user_id": user_id},
                {"standard_code": 1, "golden_code": 1, "_id": 0}
            )
            
            if not referral_codes:
                # Generate codes
                name = user.get("username", user.get("email", "USER")) if user else "USER"
                standard_code = self._generate_code(name)
                golden_code = self._generate_code(name + "GOLD") if is_golden else None
                
                referral_codes = {
                    "user_id": user_id,
                    "standard_code": standard_code,
                    "golden_code": golden_code,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await self.db.referral_codes.insert_one(referral_codes)
            else:
                standard_code = referral_codes.get("standard_code")
                golden_code = referral_codes.get("golden_code")
                
                # Generate golden code if user just became golden
                if is_golden and not golden_code:
                    name = user.get("username", user.get("email", "USER"))
                    golden_code = self._generate_code(name + "GOLD")
                    await self.db.referral_codes.update_one(
                        {"user_id": user_id},
                        {"$set": {"golden_code": golden_code}}
                    )
            
            base_url = "https://coinhubx.com/register"
            
            result = {
                "is_golden_referrer": is_golden,
                "standard": {
                    "code": standard_code,
                    "link": f"{base_url}?ref={standard_code}&tier=standard",
                    "rate": "20%",
                    "description": "Standard Referral - 20% lifetime commission"
                }
            }
            
            # Only include golden link if user is golden referrer
            if is_golden and golden_code:
                result["golden"] = {
                    "code": golden_code,
                    "link": f"{base_url}?ref={golden_code}&tier=golden",
                    "rate": "50%",
                    "description": "Golden Referral - 50% lifetime commission (VIP Partners Only)"
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting referral links: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "is_golden_referrer": False,
                "standard": {
                    "code": "",
                    "link": "",
                    "rate": "20%",
                    "description": "Standard Referral - 20% lifetime commission"
                }
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
