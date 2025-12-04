"""
Isolated Wallet Service - Handles all balance operations independently
Prevents cross-feature contamination
"""

import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, List, Optional
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

class IsolatedWalletService:
    """
    Wallet service with its own database connection
    Immune to failures in other services
    """
    
    def __init__(self):
        self.db_manager = DatabaseManager.get_instance("wallet_service")
        self.db = self.db_manager.get_database()
        logger.info("✅ IsolatedWalletService initialized")
    
    async def get_balance(self, user_id: str, currency: str) -> Dict:
        """
        Get user balance - with error boundary
        """
        try:
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency},
                {"_id": 0}
            )
            
            if not wallet:
                wallet = await self._initialize_wallet(user_id, currency)
            
            return {
                "user_id": user_id,
                "currency": currency,
                "available_balance": float(wallet.get("available_balance", 0)),
                "locked_balance": float(wallet.get("locked_balance", 0)),
                "total_balance": float(wallet.get("total_balance", 0))
            }
        except Exception as e:
            logger.error(f"❌ Error getting balance: {str(e)}")
            # Return zero balance instead of crashing
            return {
                "user_id": user_id,
                "currency": currency,
                "available_balance": 0.0,
                "locked_balance": 0.0,
                "total_balance": 0.0
            }
    
    async def _initialize_wallet(self, user_id: str, currency: str) -> Dict:
        """Initialize new wallet"""
        try:
            wallet = {
                "user_id": user_id,
                "currency": currency,
                "available_balance": 0.0,
                "locked_balance": 0.0,
                "total_balance": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.wallets.insert_one(wallet)
            logger.info(f"✅ Initialized wallet for {user_id}/{currency}")
            return wallet
        except Exception as e:
            logger.error(f"❌ Failed to initialize wallet: {str(e)}")
            raise
    
    async def credit(self, user_id: str, currency: str, amount: float,
                    transaction_type: str, reference_id: str) -> bool:
        """
        Credit user wallet - atomic operation with error handling
        """
        try:
            amount = float(amount)
            if amount <= 0:
                logger.error(f"❌ Invalid credit amount: {amount}")
                return False
            
            # Ensure wallet exists
            await self.get_balance(user_id, currency)
            
            # Atomic update
            result = await self.db.wallets.update_one(
                {"user_id": user_id, "currency": currency},
                {
                    "$inc": {
                        "available_balance": amount,
                        "total_balance": amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                # Log transaction
                await self._log_transaction(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    transaction_type=transaction_type,
                    reference_id=reference_id,
                    direction="credit"
                )
                logger.info(f"✅ Credited {amount} {currency} to {user_id}")
                return True
            else:
                logger.error(f"❌ Failed to credit wallet for {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Credit error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    async def debit(self, user_id: str, currency: str, amount: float,
                   transaction_type: str, reference_id: str) -> bool:
        """
        Debit user wallet - with balance check
        """
        try:
            amount = float(amount)
            if amount <= 0:
                return False
            
            # Check balance
            balance = await self.get_balance(user_id, currency)
            if balance["available_balance"] < amount:
                logger.error(f"❌ Insufficient balance for {user_id}/{currency}")
                return False
            
            # Atomic update
            result = await self.db.wallets.update_one(
                {
                    "user_id": user_id,
                    "currency": currency,
                    "available_balance": {"$gte": amount}
                },
                {
                    "$inc": {
                        "available_balance": -amount,
                        "total_balance": -amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                await self._log_transaction(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    transaction_type=transaction_type,
                    reference_id=reference_id,
                    direction="debit"
                )
                logger.info(f"✅ Debited {amount} {currency} from {user_id}")
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"❌ Debit error: {str(e)}")
            return False
    
    async def lock_balance(self, user_id: str, currency: str, amount: float,
                          lock_type: str, reference_id: str) -> bool:
        """
        Lock balance for escrow/pending operations
        
        Args:
            user_id: User whose balance to lock
            currency: Currency to lock (BTC, ETH, etc.)
            amount: Amount to lock
            lock_type: Type of lock (p2p_escrow, withdrawal_pending, etc.)
            reference_id: Reference ID (trade_id, withdrawal_id, etc.)
        """
        try:
            amount = float(amount)
            balance = await self.get_balance(user_id, currency)
            
            if balance["available_balance"] < amount:
                return False
            
            result = await self.db.wallets.update_one(
                {
                    "user_id": user_id,
                    "currency": currency,
                    "available_balance": {"$gte": amount}
                },
                {
                    "$inc": {
                        "available_balance": -amount,
                        "locked_balance": amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ Lock balance error: {str(e)}")
            return False
    
    async def unlock_balance(self, user_id: str, currency: str, amount: float) -> bool:
        """
        Unlock previously locked balance
        """
        try:
            result = await self.db.wallets.update_one(
                {"user_id": user_id, "currency": currency},
                {
                    "$inc": {
                        "available_balance": amount,
                        "locked_balance": -amount
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Unlock error: {str(e)}")
            return False
    
    async def release_locked_balance(self, from_user: str, to_user: str,
                                    currency: str, amount: float,
                                    reference_id: str) -> bool:
        """
        Release locked balance from one user to another (escrow release)
        """
        try:
            # Remove from sender's locked balance
            result1 = await self.db.wallets.update_one(
                {"user_id": from_user, "currency": currency},
                {
                    "$inc": {
                        "locked_balance": -amount,
                        "total_balance": -amount
                    }
                }
            )
            
            # Add to receiver's available balance
            if result1.modified_count > 0:
                result2 = await self.db.wallets.update_one(
                    {"user_id": to_user, "currency": currency},
                    {
                        "$inc": {
                            "available_balance": amount,
                            "total_balance": amount
                        }
                    },
                    upsert=True
                )
                
                if result2.modified_count > 0 or result2.upserted_id:
                    logger.info(f"✅ Released {amount} {currency} from {from_user} to {to_user}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Release locked balance error: {str(e)}")
            return False
    
    async def _log_transaction(self, user_id: str, currency: str, amount: float,
                               transaction_type: str, reference_id: str,
                               direction: str):
        """
        Log transaction for audit trail
        """
        try:
            await self.db.wallet_transactions.insert_one({
                "user_id": user_id,
                "currency": currency,
                "amount": amount,
                "transaction_type": transaction_type,
                "reference_id": reference_id,
                "direction": direction,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"⚠️ Failed to log transaction: {str(e)}")


# Global instance
_isolated_wallet_service: Optional[IsolatedWalletService] = None

def get_isolated_wallet_service() -> IsolatedWalletService:
    """Get wallet service instance"""
    global _isolated_wallet_service
    if _isolated_wallet_service is None:
        _isolated_wallet_service = IsolatedWalletService()
    return _isolated_wallet_service
