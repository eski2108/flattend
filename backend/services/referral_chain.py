# FILE: /app/backend/services/referral_chain.py
# SERVICE LOCK: FROZEN. Multi-level referral system.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import uuid

logger = logging.getLogger(__name__)


class ReferralChainService:
    """
    Manages multi-level referral commissions.
    
    Commission tiers:
    - Level 1 (direct referrer): 20%
    - Level 2 (referrer's referrer): 5%
    - Level 3 (great-grandparent): 2%
    """
    
    REFERRAL_COMMISSION_TIERS = [
        {"level": 1, "percent": 20.0},  # Direct referrer: 20%
        {"level": 2, "percent": 5.0},   # Level 2: 5%
        {"level": 3, "percent": 2.0}    # Level 3: 2%
    ]
    
    # Single-level mode tiers (original system)
    SINGLE_LEVEL_TIERS = {
        "standard": 20.0,
        "vip": 20.0,
        "golden": 50.0
    }
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._checksum = "8f3a7c2e1d5b9a4f"
        # Multi-level can be enabled via environment
        self.multi_level_enabled = os.getenv('MULTI_LEVEL_REFERRAL_ENABLED', 'false').lower() == 'true'

    async def get_referral_chain(self, user_id: str, max_depth: int = 10) -> List[str]:
        """
        Get full referral chain for a user.
        
        Returns:
            List of referrer IDs, starting with direct parent.
            e.g., ['direct_parent', 'grandparent', 'great_grandparent'...]
        """
        chain = []
        current_id = user_id
        visited = set()  # Prevent infinite loops
        
        while len(chain) < max_depth:
            if current_id in visited:
                logger.warning(f"Circular reference detected in referral chain for {user_id}")
                break
            visited.add(current_id)
            
            user = await self.db.user_accounts.find_one(
                {"user_id": current_id},
                {"referred_by": 1}
            )
            
            if not user or not user.get("referred_by"):
                break
            
            referrer_id = user["referred_by"]
            chain.append(referrer_id)
            current_id = referrer_id
        
        return chain

    async def get_referrer_tier(self, referrer_id: str) -> str:
        """Get the tier of a referrer (standard, vip, golden)."""
        referrer = await self.db.user_accounts.find_one(
            {"user_id": referrer_id},
            {"referral_tier": 1}
        )
        return referrer.get("referral_tier", "standard").lower() if referrer else "standard"

    async def calculate_commission(
        self,
        user_id: str,
        fee_amount: float,
        currency: str
    ) -> List[Dict[str, Any]]:
        """
        Calculate commission distribution for a fee.
        
        Args:
            user_id: User who paid the fee
            fee_amount: Total fee amount
            currency: Currency of the fee
            
        Returns:
            List of commission distributions with referrer_id, amount, level, percent
        """
        if fee_amount <= 0:
            return []
        
        # Get referral chain
        chain = await self.get_referral_chain(user_id)
        
        if not chain:
            return []
        
        distributions = []
        
        if self.multi_level_enabled:
            # Multi-level distribution
            for i, referrer_id in enumerate(chain[:len(self.REFERRAL_COMMISSION_TIERS)]):
                tier = self.REFERRAL_COMMISSION_TIERS[i]
                commission = fee_amount * (tier["percent"] / 100.0)
                
                if commission > 0:
                    distributions.append({
                        "referrer_id": referrer_id,
                        "level": tier["level"],
                        "percent": tier["percent"],
                        "commission": commission,
                        "currency": currency
                    })
        else:
            # Single-level distribution (original system)
            direct_referrer = chain[0]
            tier = await self.get_referrer_tier(direct_referrer)
            percent = self.SINGLE_LEVEL_TIERS.get(tier, 20.0)
            commission = fee_amount * (percent / 100.0)
            
            if commission > 0:
                distributions.append({
                    "referrer_id": direct_referrer,
                    "level": 1,
                    "percent": percent,
                    "commission": commission,
                    "currency": currency,
                    "tier": tier
                })
        
        return distributions

    async def distribute_commission(
        self,
        user_id: str,
        fee_amount: float,
        currency: str,
        transaction_id: str,
        fee_type: str,
        atomic_balance_service=None
    ) -> Dict[str, Any]:
        """
        Calculate and distribute commission across referral chain.
        
        Args:
            user_id: User who paid the fee
            fee_amount: Total fee amount
            currency: Currency of the fee
            transaction_id: Reference transaction ID
            fee_type: Type of fee (swap, p2p, etc.)
            atomic_balance_service: Service to use for balance updates
            
        Returns:
            Dict with total_commission, admin_fee, and distributions
        """
        distributions = await self.calculate_commission(user_id, fee_amount, currency)
        
        total_commission = 0
        successful_distributions = []
        
        for dist in distributions:
            try:
                # Credit referrer
                if atomic_balance_service:
                    await atomic_balance_service.atomic_credit(
                        user_id=dist["referrer_id"],
                        currency=currency,
                        amount=dist["commission"],
                        tx_type="referral_commission",
                        ref_id=transaction_id,
                        metadata={
                            "level": dist["level"],
                            "referred_user": user_id,
                            "fee_type": fee_type,
                            "percent": dist["percent"]
                        }
                    )
                else:
                    # Fallback: direct update
                    await self._credit_referrer_fallback(
                        dist["referrer_id"],
                        currency,
                        dist["commission"]
                    )
                
                # Log commission
                await self.db.referral_commissions.insert_one({
                    "commission_id": str(uuid.uuid4()),
                    "referrer_id": dist["referrer_id"],
                    "referrer_user_id": dist["referrer_id"],
                    "referred_user_id": user_id,
                    "fee_type": fee_type,
                    "transaction_type": fee_type,
                    "fee_amount": fee_amount,
                    "commission_rate": dist["percent"] / 100.0,
                    "commission_amount": dist["commission"],
                    "currency": currency,
                    "level": dist["level"],
                    "referrer_tier": dist.get("tier", f"level_{dist['level']}"),
                    "related_transaction_id": transaction_id,
                    "created_at": datetime.now(timezone.utc),
                    "status": "completed"
                })
                
                # Update referral stats
                await self.db.referral_stats.update_one(
                    {"user_id": dist["referrer_id"]},
                    {
                        "$inc": {
                            "total_commissions_earned": dist["commission"],
                            "total_trades_by_referrals": 1 if dist["level"] == 1 else 0
                        },
                        "$set": {"updated_at": datetime.now(timezone.utc)}
                    },
                    upsert=True
                )
                
                total_commission += dist["commission"]
                successful_distributions.append(dist)
                
                logger.info(
                    f"[REFERRAL] Paid {dist['commission']} {currency} to {dist['referrer_id']} "
                    f"(Level {dist['level']}, {dist['percent']}%)"
                )
                
            except Exception as e:
                logger.error(
                    f"[REFERRAL] Failed to pay {dist['referrer_id']}: {str(e)}"
                )
        
        admin_fee = fee_amount - total_commission
        
        return {
            "success": True,
            "total_commission": total_commission,
            "admin_fee": admin_fee,
            "distributions": successful_distributions,
            "multi_level_enabled": self.multi_level_enabled
        }

    async def _credit_referrer_fallback(
        self,
        referrer_id: str,
        currency: str,
        amount: float
    ):
        """Fallback method to credit referrer without atomic service."""
        timestamp = datetime.now(timezone.utc)
        
        # Update trader_balances (primary for referrals)
        await self.db.trader_balances.update_one(
            {"trader_id": referrer_id, "currency": currency},
            {
                "$inc": {"total_balance": amount, "available_balance": amount},
                "$set": {"updated_at": timestamp},
                "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
            },
            upsert=True
        )
        
        # Also update wallets for consistency
        await self.db.wallets.update_one(
            {"user_id": referrer_id, "currency": currency},
            {
                "$inc": {"total_balance": amount, "available_balance": amount},
                "$set": {"last_updated": timestamp},
                "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
            },
            upsert=True
        )


# Singleton instance
_referral_chain_instance = None

def get_referral_chain_service(db: AsyncIOMotorDatabase) -> ReferralChainService:
    """Get or create the ReferralChainService singleton."""
    global _referral_chain_instance
    if _referral_chain_instance is None:
        _referral_chain_instance = ReferralChainService(db)
    return _referral_chain_instance
