"""Centralized Referral Commission Engine
Handles all referral commissions across all fee types"""

import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

logger = logging.getLogger(__name__)

# Fee type constants
FEE_TYPES = {
    "P2P_MAKER": "P2P Maker Fee",
    "P2P_TAKER": "P2P Taker Fee",
    "P2P_EXPRESS": "P2P Express Fee",
    "INSTANT_BUY": "Instant Buy",
    "INSTANT_SELL": "Instant Sell",
    "SWAP": "Swap Fee",
    "TRADING": "Trading Fee",
    "SAVINGS_DEPOSIT": "Savings Deposit Fee",
    "SAVINGS_EARLY_UNSTAKE": "Savings Early Unstake Fee",
    "NETWORK_WITHDRAWAL": "Network Withdrawal Fee",
    "FIAT_WITHDRAWAL": "Fiat Withdrawal Fee",
    "VAULT_TRANSFER": "Vault Transfer Fee",
    "CROSS_WALLET": "Cross-Wallet Fee",
    "SPREAD_PROFIT": "Spread Profit (Admin Liquidity)",
    "EXPRESS_ROUTE_SPREAD": "Express Route Spread",
    "STAKING_SPREAD": "Staking Spread",
    "PAYMENT_GATEWAY_UPLIFT": "Payment Gateway Fee Uplift"
}

# Tier commission rates
TIER_COMMISSIONS = {
    "standard": 0.20,  # 20%
    "vip": 0.20,       # 20%
    "golden": 0.50     # 50%
}

class ReferralEngine:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def process_referral_commission(
        self,
        user_id: str,
        fee_amount: float,
        fee_type: str,
        currency: str = "GBP",
        related_transaction_id: str = None,
        metadata: dict = None
    ) -> dict:
        """
        Process referral commission for any fee
        
        Args:
            user_id: The user who paid the fee
            fee_amount: Amount of fee charged
            fee_type: Type of fee (use FEE_TYPES constants)
            currency: Currency of fee (default GBP)
            related_transaction_id: ID of the transaction that generated this fee
            metadata: Additional data to store
        
        Returns:
            dict with success status and commission details
        """
        try:
            # 1. Check if user has a referrer
            user = await self.db.user_accounts.find_one({"user_id": user_id})
            if not user:
                logger.warning(f"User {user_id} not found for referral commission")
                return {"success": False, "message": "User not found"}
            
            referrer_id = user.get("referred_by")
            if not referrer_id:
                logger.info(f"User {user_id} has no referrer")
                return {"success": False, "message": "No referrer"}
            
            # 2. Get referrer details and tier
            referrer = await self.db.user_accounts.find_one({"user_id": referrer_id})
            if not referrer:
                logger.warning(f"Referrer {referrer_id} not found")
                return {"success": False, "message": "Referrer not found"}
            
            referrer_tier = referrer.get("referral_tier", "standard").lower()
            
            # 3. Calculate commission based on tier
            commission_rate = TIER_COMMISSIONS.get(referrer_tier, 0.20)
            commission_amount = fee_amount * commission_rate
            
            logger.info(f"Processing referral: User {user_id} -> Referrer {referrer_id} | "
                       f"Fee: £{fee_amount} | Tier: {referrer_tier} | "
                       f"Commission: £{commission_amount} ({commission_rate*100}%)")
            
            # 4. Credit commission to referrer's TRADER BALANCE (main wallet system)
            referrer_balance = await self.db.trader_balances.find_one({
                "trader_id": referrer_id,
                "currency": currency
            })
            
            if referrer_balance:
                await self.db.trader_balances.update_one(
                    {"trader_id": referrer_id, "currency": currency},
                    {
                        "$inc": {
                            "total_balance": commission_amount,
                            "available_balance": commission_amount
                        },
                        "$set": {
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
            else:
                # Create trader balance if doesn't exist
                await self.db.trader_balances.insert_one({
                    "trader_id": referrer_id,
                    "currency": currency,
                    "total_balance": commission_amount,
                    "available_balance": commission_amount,
                    "locked_balance": 0,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                })
            
            # 5. Log commission (with BOTH field names for dashboard compatibility)
            commission_record = {
                "commission_id": str(uuid.uuid4()),
                "referrer_id": referrer_id,
                "referrer_user_id": referrer_id,  # Dashboard queries this field
                "referred_user_id": user_id,
                "fee_type": fee_type,
                "transaction_type": fee_type,  # Dashboard also queries this
                "fee_amount": fee_amount,
                "commission_rate": commission_rate,
                "commission_amount": commission_amount,
                "currency": currency,
                "referrer_tier": referrer_tier,
                "related_transaction_id": related_transaction_id,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc),
                "status": "completed"
            }
            
            await self.db.referral_commissions.insert_one(commission_record)
            
            # 6. Update referral_stats for the referrer (dashboard totals)
            await self.db.referral_stats.update_one(
                {"user_id": referrer_id},
                {
                    "$inc": {
                        "lifetime_commission_earned": commission_amount,
                        "total_fees_generated_by_network": fee_amount
                    },
                    "$set": {"last_commission_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
            
            # 7. Update referral_earnings by currency
            await self.db.referral_earnings.update_one(
                {"user_id": referrer_id, "currency": currency},
                {
                    "$inc": {"total_earned": commission_amount},
                    "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
            
            # 6. Update platform revenue tracking
            platform_share = fee_amount - commission_amount
            await self.db.internal_balances.update_one(
                {"user_id": "PLATFORM_FEES", "currency": currency},
                {
                    "$inc": {
                        "referral_commissions_paid": commission_amount,
                        "net_platform_revenue": platform_share
                    },
                    "$set": {
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # ═══════════════════════════════════════════════════════════════
            # LOG PLATFORM'S NET SHARE TO ADMIN REVENUE (AFTER REFERRAL CUT)
            # ═══════════════════════════════════════════════════════════════
            await self.db.admin_revenue.insert_one({
                "revenue_id": str(uuid.uuid4()),
                "source": f"referral_net_share_{fee_type.lower()}",
                "revenue_type": "PLATFORM_NET_REVENUE",
                "currency": currency,
                "amount": platform_share,
                "original_fee": fee_amount,
                "referral_commission_paid": commission_amount,
                "user_id": user_id,
                "referrer_id": referrer_id,
                "referrer_tier": referrer_tier,
                "related_transaction_id": related_transaction_id,
                "fee_percentage": commission_rate * 100,
                "net_profit": platform_share,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": f"Platform net revenue from {fee_type} after {commission_rate*100}% referral commission"
            })
            
            logger.info(f"✅ Referral commission processed: £{commission_amount} to {referrer_id} | Platform net: £{platform_share}")
            
            return {
                "success": True,
                "commission_amount": commission_amount,
                "commission_rate": commission_rate,
                "referrer_tier": referrer_tier,
                "referrer_id": referrer_id
            }
            
        except Exception as e:
            logger.error(f"Error processing referral commission: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": str(e)}
    
    async def upgrade_to_vip(self, user_id: str, payment_amount: float = 150.0) -> dict:
        """
        Upgrade user to VIP tier for £150
        """
        try:
            # 1. Check payment
            if payment_amount < 150.0:
                return {"success": False, "message": "Insufficient payment"}
            
            # 2. Check user balance
            wallet = await self.db.wallets.find_one({
                "user_id": user_id,
                "currency": "GBP"
            })
            
            if not wallet or wallet.get("total_balance", 0) < payment_amount:
                return {"success": False, "message": "Insufficient balance"}
            
            # 3. Deduct payment from user
            new_balance = wallet.get("total_balance", 0) - payment_amount
            await self.db.wallets.update_one(
                {"user_id": user_id, "currency": "GBP"},
                {"$set": {"total_balance": new_balance, "available_balance": new_balance}}
            )
            
            # 4. Credit to owner account
            await self.db.internal_balances.update_one(
                {"user_id": "PLATFORM_FEES", "currency": "GBP"},
                {
                    "$inc": {
                        "balance": payment_amount,
                        "vip_upgrade_revenue": payment_amount,
                        "total_fees": payment_amount
                    },
                    "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
            
            # 5. Upgrade user tier
            await self.db.user_accounts.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "referral_tier": "vip",
                        "vip_upgraded_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # 6. Log upgrade transaction
            await self.db.vip_upgrades.insert_one({
                "upgrade_id": str(uuid.uuid4()),
                "user_id": user_id,
                "amount_paid": payment_amount,
                "currency": "GBP",
                "upgraded_at": datetime.now(timezone.utc),
                "status": "completed"
            })
            
            logger.info(f"✅ User {user_id} upgraded to VIP")
            
            return {
                "success": True,
                "message": "Upgraded to VIP tier successfully",
                "new_tier": "vip"
            }
            
        except Exception as e:
            logger.error(f"Error upgrading to VIP: {e}")
            return {"success": False, "message": str(e)}
    
    async def assign_golden_tier(self, user_id: str, admin_id: str) -> dict:
        """
        Admin assigns golden tier to a user
        """
        try:
            # Verify admin
            admin = await self.db.user_accounts.find_one({"user_id": admin_id})
            if not admin or admin.get("role") != "admin":
                return {"success": False, "message": "Unauthorized"}
            
            # Update user tier
            await self.db.user_accounts.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "referral_tier": "golden",
                        "golden_assigned_by": admin_id,
                        "golden_assigned_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            logger.info(f"✅ Admin {admin_id} assigned golden tier to {user_id}")
            
            return {
                "success": True,
                "message": "Golden tier assigned",
                "new_tier": "golden"
            }
            
        except Exception as e:
            logger.error(f"Error assigning golden tier: {e}")
            return {"success": False, "message": str(e)}

# Global instance
_referral_engine = None

def get_referral_engine() -> ReferralEngine:
    global _referral_engine
    if _referral_engine is None:
        raise RuntimeError("Referral engine not initialized")
    return _referral_engine

def initialize_referral_engine(db: AsyncIOMotorDatabase):
    global _referral_engine
    _referral_engine = ReferralEngine(db)
    logger.info("🎁 Referral Engine initialized")
