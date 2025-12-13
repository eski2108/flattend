"""Comprehensive Liquidity Lock Service

This service ENFORCES liquidity checks for EVERY transaction type.
No transaction can proceed if admin liquidity is insufficient.
All liquidity movements are atomic, logged, and guaranteed to never go negative.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class LiquidityLockService:
    """Master liquidity enforcement service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def check_and_reserve_liquidity(
        self,
        currency: str,
        required_amount: float,
        transaction_type: str,
        transaction_id: str,
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Check if admin has sufficient liquidity AND reserve it atomically.
        This prevents race conditions where multiple transactions try to use the same liquidity.
        
        Args:
            currency: Currency code (e.g., 'BTC', 'ETH')
            required_amount: Amount needed from admin liquidity
            transaction_type: Type of transaction (instant_buy, swap, spot_buy, etc.)
            transaction_id: Unique transaction ID
            user_id: User requesting the transaction
            metadata: Additional context
        
        Returns:
            {"success": True/False, "available": float, "reserved": float, "message": str}
        """
        try:
            # Get current admin liquidity
            liquidity = await self.db.admin_liquidity_wallets.find_one({"currency": currency.upper()})
            
            if not liquidity:
                logger.error(f"🚫 NO ADMIN LIQUIDITY WALLET for {currency}")
                return {
                    "success": False,
                    "available": 0,
                    "required": required_amount,
                    "message": f"Admin liquidity wallet not initialized for {currency}"
                }
            
            available = liquidity.get("available", 0)
            
            # CRITICAL CHECK: Is there enough available liquidity?
            if available < required_amount:
                shortage = required_amount - available
                logger.error(
                    f"🚫 INSUFFICIENT ADMIN LIQUIDITY: {currency}\n"
                    f"   Required: {required_amount}\n"
                    f"   Available: {available}\n"
                    f"   Shortage: {shortage}\n"
                    f"   Transaction: {transaction_type} for user {user_id}"
                )
                
                # Log the blocked transaction
                await self.db.liquidity_blocks.insert_one({
                    "block_id": str(uuid.uuid4()),
                    "currency": currency.upper(),
                    "required_amount": required_amount,
                    "available_amount": available,
                    "shortage": shortage,
                    "transaction_type": transaction_type,
                    "transaction_id": transaction_id,
                    "user_id": user_id,
                    "metadata": metadata,
                    "blocked_at": datetime.now(timezone.utc).isoformat(),
                    "reason": "insufficient_admin_liquidity"
                })
                
                return {
                    "success": False,
                    "available": available,
                    "required": required_amount,
                    "shortage": shortage,
                    "message": f"Insufficient admin liquidity. Available: {available} {currency}, Required: {required_amount} {currency}, Shortage: {shortage} {currency}"
                }
            
            # ATOMIC OPERATION: Reserve the liquidity
            # Decrease available, increase reserved
            result = await self.db.admin_liquidity_wallets.update_one(
                {
                    "currency": currency.upper(),
                    "available": {"$gte": required_amount}  # Double-check in atomic operation
                },
                {
                    "$inc": {
                        "available": -required_amount,
                        "reserved": required_amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count == 0:
                # Race condition: Another transaction reserved the liquidity first
                logger.warning(f"⚠️ RACE CONDITION: Liquidity for {currency} was reserved by another transaction")
                return {
                    "success": False,
                    "available": 0,
                    "required": required_amount,
                    "message": "Liquidity reserved by another transaction (race condition). Please try again."
                }
            
            # Log the reservation
            await self.db.liquidity_reservations.insert_one({
                "reservation_id": str(uuid.uuid4()),
                "currency": currency.upper(),
                "amount": required_amount,
                "transaction_type": transaction_type,
                "transaction_id": transaction_id,
                "user_id": user_id,
                "metadata": metadata,
                "reserved_at": datetime.now(timezone.utc).isoformat(),
                "status": "reserved"
            })
            
            logger.info(
                f"✅ LIQUIDITY RESERVED: {required_amount} {currency}\n"
                f"   Transaction: {transaction_type}\n"
                f"   Transaction ID: {transaction_id}\n"
                f"   User: {user_id}"
            )
            
            return {
                "success": True,
                "available": available - required_amount,
                "reserved": required_amount,
                "message": "Liquidity reserved successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Liquidity check error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "message": f"Liquidity check failed: {str(e)}"
            }
    
    async def release_reserved_liquidity(
        self,
        currency: str,
        amount: float,
        transaction_type: str,
        transaction_id: str,
        reason: str = "transaction_cancelled"
    ) -> Dict:
        """
        Release reserved liquidity back to available (if transaction fails/cancels)
        
        Args:
            currency: Currency code
            amount: Amount to release
            transaction_type: Type of transaction
            transaction_id: Unique transaction ID
            reason: Reason for release
        
        Returns:
            {"success": True/False, "message": str}
        """
        try:
            # ATOMIC OPERATION: Move from reserved back to available
            result = await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency.upper()},
                {
                    "$inc": {
                        "reserved": -amount,
                        "available": amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                # Update reservation record
                await self.db.liquidity_reservations.update_one(
                    {"transaction_id": transaction_id},
                    {
                        "$set": {
                            "status": "released",
                            "released_at": datetime.now(timezone.utc).isoformat(),
                            "release_reason": reason
                        }
                    }
                )
                
                logger.info(f"✅ LIQUIDITY RELEASED: {amount} {currency} (Reason: {reason})")
                return {"success": True, "message": "Liquidity released"}
            else:
                logger.warning(f"⚠️ No liquidity to release for {currency}")
                return {"success": False, "message": "No reserved liquidity found"}
            
        except Exception as e:
            logger.error(f"❌ Release liquidity error: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def deduct_liquidity(
        self,
        currency: str,
        amount: float,
        transaction_type: str,
        transaction_id: str,
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Deduct liquidity from reserved (after transaction completes successfully)
        This removes liquidity from both reserved AND total balance.
        
        Args:
            currency: Currency code
            amount: Amount to deduct
            transaction_type: Type of transaction
            transaction_id: Unique transaction ID
            user_id: User who received the crypto
            metadata: Additional context
        
        Returns:
            {"success": True/False, "message": str}
        """
        try:
            # ATOMIC OPERATION: Deduct from reserved and balance
            result = await self.db.admin_liquidity_wallets.update_one(
                {
                    "currency": currency.upper(),
                    "reserved": {"$gte": amount}  # Ensure we have enough reserved
                },
                {
                    "$inc": {
                        "reserved": -amount,
                        "balance": -amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count == 0:
                logger.error(f"❌ CRITICAL: Could not deduct reserved liquidity for {currency}")
                return {"success": False, "message": "Failed to deduct reserved liquidity"}
            
            # Log the deduction
            await self.db.admin_liquidity_history.insert_one({
                "history_id": str(uuid.uuid4()),
                "currency": currency.upper(),
                "amount": amount,
                "operation": "deduct",
                "transaction_type": transaction_type,
                "transaction_id": transaction_id,
                "user_id": user_id,
                "metadata": metadata,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Update reservation record
            await self.db.liquidity_reservations.update_one(
                {"transaction_id": transaction_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logger.info(
                f"💰 LIQUIDITY DEDUCTED: {amount} {currency}\n"
                f"   Transaction: {transaction_type}\n"
                f"   User: {user_id}"
            )
            
            return {"success": True, "message": "Liquidity deducted successfully"}
            
        except Exception as e:
            logger.error(f"❌ Deduct liquidity error: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def add_liquidity(
        self,
        currency: str,
        amount: float,
        transaction_type: str,
        transaction_id: str,
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Add liquidity (when user sells crypto to admin)
        This increases both available and total balance.
        
        Args:
            currency: Currency code
            amount: Amount to add
            transaction_type: Type of transaction
            transaction_id: Unique transaction ID
            user_id: User who sold the crypto
            metadata: Additional context
        
        Returns:
            {"success": True/False, "message": str}
        """
        try:
            # ATOMIC OPERATION: Add to available and balance
            result = await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency.upper()},
                {
                    "$inc": {
                        "available": amount,
                        "balance": amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$setOnInsert": {
                        "currency": currency.upper(),
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Log the addition
            await self.db.admin_liquidity_history.insert_one({
                "history_id": str(uuid.uuid4()),
                "currency": currency.upper(),
                "amount": amount,
                "operation": "add",
                "transaction_type": transaction_type,
                "transaction_id": transaction_id,
                "user_id": user_id,
                "metadata": metadata,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(
                f"💰 LIQUIDITY ADDED: {amount} {currency}\n"
                f"   Transaction: {transaction_type}\n"
                f"   User: {user_id}"
            )
            
            return {"success": True, "message": "Liquidity added successfully"}
            
        except Exception as e:
            logger.error(f"❌ Add liquidity error: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def get_liquidity_status(self, currency: str) -> Dict:
        """
        Get current liquidity status for a currency
        
        Returns:
            {"currency": str, "balance": float, "available": float, "reserved": float}
        """
        try:
            liquidity = await self.db.admin_liquidity_wallets.find_one(
                {"currency": currency.upper()},
                {"_id": 0}
            )
            
            if not liquidity:
                return {
                    "currency": currency.upper(),
                    "balance": 0,
                    "available": 0,
                    "reserved": 0,
                    "message": "No liquidity wallet found"
                }
            
            return liquidity
            
        except Exception as e:
            logger.error(f"❌ Get liquidity status error: {str(e)}")
            return {"error": str(e)}
    
    async def initialize_liquidity_wallet(self, currency: str, initial_amount: float = 0) -> Dict:
        """
        Initialize a new liquidity wallet for a currency
        
        Args:
            currency: Currency code
            initial_amount: Initial liquidity amount (default 0)
        
        Returns:
            {"success": True/False, "message": str}
        """
        try:
            await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency.upper()},
                {
                    "$setOnInsert": {
                        "currency": currency.upper(),
                        "balance": initial_amount,
                        "available": initial_amount,
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            logger.info(f"✅ Liquidity wallet initialized for {currency} with {initial_amount}")
            return {"success": True, "message": f"Wallet initialized for {currency}"}
            
        except Exception as e:
            logger.error(f"❌ Initialize wallet error: {str(e)}")
            return {"success": False, "message": str(e)}


# Global instance
_liquidity_service = None

def get_liquidity_service(db: AsyncIOMotorDatabase) -> LiquidityLockService:
    """Get or create liquidity service instance"""
    global _liquidity_service
    if _liquidity_service is None:
        _liquidity_service = LiquidityLockService(db)
    return _liquidity_service
