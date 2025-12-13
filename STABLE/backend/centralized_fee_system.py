"""Centralized Fee Management System

This module provides a single source of truth for all platform fees.
Changing a fee here automatically updates all backend calculations,
frontend displays, PnL widgets, and analytics.
"""

from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Global fee configuration cache
_fee_cache = None
_last_update = None

DEFAULT_FEES = {
    # OFFICIAL 18 REVENUE STREAMS - LOCKED PRODUCTION VALUES
    # 1-3: P2P FEES
    "p2p_maker_fee_percent": 0.5,  # SELLER FEE
    "p2p_taker_fee_percent": 0.5,  # BUYER FEE
    "p2p_express_fee_percent": 2.5,
    
    # 4-6: INSTANT BUY/SELL & SWAP
    "instant_buy_fee_percent": 2.0,  # LOCKED: 2% instant buy fee
    "instant_sell_fee_percent": 2.0,  # LOCKED: 2% instant sell fee
    "swap_fee_percent": 1.5,  # LOCKED: 1.5% swap fee
    
    # 7-10: WITHDRAWAL & DEPOSIT
    "withdrawal_fee_percent": 1.0,  # LOCKED: 1% withdrawal fee
    "network_withdrawal_fee_percent": 1.0,  # Added to gas
    "fiat_withdrawal_fee_percent": 1.0,
    "deposit_fee_percent": 1.0,  # LOCKED: 1% deposit fee
    
    # 11-12: SAVINGS/STAKING
    "savings_stake_fee_percent": 0.5,
    "early_unstake_penalty_percent": 3.0,
    
    # 13: SPOT TRADING
    "spot_trading_fee_percent": 0.1,
    "trading_fee_percent": 0.1,  # Alias
    
    # 14: DISPUTE
    "dispute_fee_fixed_gbp": 2.0,
    "dispute_fee_percent": 1.0,  # Whichever is higher
    
    # 15-16: INTERNAL TRANSFERS
    "vault_transfer_fee_percent": 0.5,
    "cross_wallet_transfer_fee_percent": 0.25,
    
    # 17-18: LIQUIDITY PROFITS (variable, calculated)
    "admin_liquidity_spread_percent": 0.0,  # Variable
    "express_liquidity_profit_percent": 0.0,  # Variable
    "savings_interest_profit_percent": 2.0,  # Platform keeps 2% spread on interest
    
    # REFERRAL COMMISSIONS (NOT fees - payouts to referrer)
    "referral_standard_commission_percent": 20.0,
    "referral_golden_commission_percent": 50.0
}

class CentralizedFeeManager:
    def __init__(self, db):
        self.db = db
        self.cache = DEFAULT_FEES.copy()
    
    async def get_all_fees(self):
        """Get all current fees from database or cache"""
        try:
            fees_doc = await self.db.platform_fees.find_one({"config_id": "main"})
            if fees_doc:
                # Remove MongoDB _id
                fees_doc.pop("_id", None)
                fees_doc.pop("config_id", None)
                fees_doc.pop("updated_at", None)
                self.cache = fees_doc
                return fees_doc
            else:
                # Initialize with defaults
                await self.initialize_fees()
                return self.cache
        except Exception as e:
            logger.error(f"Error getting fees: {e}")
            return self.cache
    
    async def get_fee(self, fee_type: str) -> float:
        """Get a specific fee percentage"""
        fees = await self.get_all_fees()
        return fees.get(fee_type, 0.0)
    
    async def update_fee(self, fee_type: str, new_value: float):
        """Update a specific fee - automatically propagates everywhere"""
        try:
            # Validate fee type
            if fee_type not in DEFAULT_FEES:
                raise ValueError(f"Invalid fee type: {fee_type}")
            
            # Update in database
            await self.db.platform_fees.update_one(
                {"config_id": "main"},
                {
                    "$set": {
                        fee_type: float(new_value),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Update cache
            self.cache[fee_type] = float(new_value)
            
            # Log fee change
            await self.db.fee_change_log.insert_one({
                "fee_type": fee_type,
                "old_value": self.cache.get(fee_type, 0.0),
                "new_value": float(new_value),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Fee updated: {fee_type} = {new_value}%")
            return True
        except Exception as e:
            logger.error(f"Error updating fee: {e}")
            raise
    
    async def initialize_fees(self):
        """Initialize fees in database with defaults"""
        try:
            await self.db.platform_fees.update_one(
                {"config_id": "main"},
                {"$set": {
                    **DEFAULT_FEES,
                    "config_id": "main",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            self.cache = DEFAULT_FEES.copy()
            logger.info("Fees initialized with defaults")
        except Exception as e:
            logger.error(f"Error initializing fees: {e}")
    
    async def calculate_fee(self, fee_type: str, amount: float) -> float:
        """Calculate fee amount for a transaction"""
        fee_percent = await self.get_fee(fee_type)
        return amount * (fee_percent / 100.0)
    
    async def calculate_referral_commission(self, fee_amount: float, referral_tier: str = "standard") -> float:
        """Calculate referral commission payout from platform profit"""
        if referral_tier == "golden":
            commission_percent = await self.get_fee("referral_golden_commission_percent")
        else:
            commission_percent = await self.get_fee("referral_standard_commission_percent")
        
        # Commission is paid FROM platform profit, not added to customer fee
        return fee_amount * (commission_percent / 100.0)

# Global instance
fee_manager = None

def get_fee_manager(db):
    """Get or create fee manager singleton"""
    global fee_manager
    if fee_manager is None:
        fee_manager = CentralizedFeeManager(db)
    return fee_manager
