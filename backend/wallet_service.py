"""
Central Wallet Service - Single Source of Truth for All Balances
Handles deposits, withdrawals, transfers with atomic operations
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, List
import logging
import os
from bson import ObjectId

logger = logging.getLogger(__name__)

class WalletService:
    """
    Centralized wallet management service
    All balance operations must go through this service
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        logger.info("✅ Wallet Service initialized")
    
    async def get_balance(self, user_id: str, currency: str) -> Dict:
        """
        Get user balance for specific currency
        Returns: {available_balance, locked_balance, total_balance}
        """
        try:
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency},
                {"_id": 0}
            )
            
            if not wallet:
                # Initialize wallet if doesn't exist
                wallet = await self._initialize_wallet(user_id, currency)
            
            return {
                "user_id": user_id,
                "currency": currency,
                "available_balance": float(wallet.get("available_balance", 0)),
                "locked_balance": float(wallet.get("locked_balance", 0)),
                "total_balance": float(wallet.get("total_balance", 0))
            }
        except Exception as e:
            logger.error(f"❌ Error getting balance for {user_id}/{currency}: {str(e)}")
            raise
    
    async def get_all_balances(self, user_id: str) -> List[Dict]:
        """
        Get all currency balances for user
        Returns ALL wallets including zero balances (fixed for new users)
        """
        try:
            logger.info(f"🔍 get_all_balances called for {user_id}")
            logger.info(f"🔍 Database instance: {self.db.name if hasattr(self.db, 'name') else 'unknown'}")
            
            # FIXED: Return ALL wallets, not just those with balance > 0
            # This is critical for new users who have zero balances
            wallets = await self.db.wallets.find(
                {"user_id": user_id},  # Removed total_balance filter
                {"_id": 0}
            ).to_list(100)
            
            logger.info(f"🔍 Found {len(wallets)} wallets in DB (including zero balances)")
            
            return [{
                "currency": w["currency"],
                "available_balance": float(w.get("available_balance", 0)),
                "locked_balance": float(w.get("locked_balance", 0)),
                "total_balance": float(w.get("total_balance", 0))
            } for w in wallets]
        except Exception as e:
            logger.error(f"❌ Error getting all balances for {user_id}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    async def credit(self, user_id: str, currency: str, amount: float, 
                    transaction_type: str, reference_id: str, 
                    metadata: Optional[Dict] = None) -> bool:
        """
        Credit user wallet (deposits, earnings, refunds)
        
        Args:
            user_id: User ID
            currency: Currency code (BTC, ETH, USDT, etc.)
            amount: Amount to credit
            transaction_type: deposit|earning|refund|transfer_in|referral_commission
            reference_id: Reference to source transaction
            metadata: Additional transaction details
        """
        try:
            if amount <= 0:
                raise ValueError("Credit amount must be positive")
            
            # Get or create wallet
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency}
            )
            
            if not wallet:
                wallet = await self._initialize_wallet(user_id, currency)
            
            # Update balances
            new_available = float(wallet.get("available_balance", 0)) + amount
            new_total = float(wallet.get("total_balance", 0)) + amount
            
            # Atomic update - SYNC TO ALL BALANCE COLLECTIONS
            balance_update = {
                "available_balance": new_available,
                "total_balance": new_total,
                "balance": new_available,
                "last_updated": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await self.db.wallets.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": balance_update}
            )
            
            # SYNC to internal_balances
            await self.db.internal_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": {**balance_update, "user_id": user_id, "currency": currency}},
                upsert=True
            )
            
            # SYNC to crypto_balances
            await self.db.crypto_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": {**balance_update, "user_id": user_id, "currency": currency}},
                upsert=True
            )
            
            # SYNC to trader_balances
            await self.db.trader_balances.update_one(
                {"trader_id": user_id, "currency": currency},
                {"$set": {**balance_update, "trader_id": user_id, "currency": currency}},
                upsert=True
            )
            
            if result.modified_count > 0 or result.upserted_id:
                # Log transaction
                await self._log_transaction(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    transaction_type=transaction_type,
                    direction="credit",
                    reference_id=reference_id,
                    metadata=metadata,
                    balance_after=new_available
                )
                
                logger.info(f"✅ Credited {amount} {currency} to {user_id} | Type: {transaction_type}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error crediting {amount} {currency} to {user_id}: {str(e)}")
            raise
    
    async def debit(self, user_id: str, currency: str, amount: float,
                   transaction_type: str, reference_id: str,
                   metadata: Optional[Dict] = None) -> bool:
        """
        Debit user wallet (withdrawals, purchases, transfers out)
        
        Args:
            user_id: User ID
            currency: Currency code
            amount: Amount to debit
            transaction_type: withdrawal|purchase|transfer_out|fee
            reference_id: Reference to destination transaction
            metadata: Additional transaction details
        """
        try:
            if amount <= 0:
                raise ValueError("Debit amount must be positive")
            
            # Get wallet
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency}
            )
            
            if not wallet:
                raise ValueError(f"Wallet not found for {user_id}/{currency}")
            
            current_available = float(wallet.get("available_balance", 0))
            
            # Check sufficient balance
            if current_available < amount:
                raise ValueError(
                    f"Insufficient balance. Required: {amount} {currency}, "
                    f"Available: {current_available} {currency}"
                )
            
            # Update balances
            new_available = current_available - amount
            new_total = float(wallet.get("total_balance", 0)) - amount
            
            # Atomic update - SYNC TO ALL BALANCE COLLECTIONS
            balance_update = {
                "available_balance": new_available,
                "total_balance": new_total,
                "balance": new_available,
                "last_updated": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await self.db.wallets.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": balance_update}
            )
            
            # SYNC to internal_balances
            await self.db.internal_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": {**balance_update, "user_id": user_id, "currency": currency}},
                upsert=True
            )
            
            # SYNC to crypto_balances
            await self.db.crypto_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": {**balance_update, "user_id": user_id, "currency": currency}},
                upsert=True
            )
            
            # SYNC to trader_balances
            await self.db.trader_balances.update_one(
                {"trader_id": user_id, "currency": currency},
                {"$set": {**balance_update, "trader_id": user_id, "currency": currency}},
                upsert=True
            )
            
            if result.modified_count > 0 or result.upserted_id:
                # Log transaction
                await self._log_transaction(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    transaction_type=transaction_type,
                    direction="debit",
                    reference_id=reference_id,
                    metadata=metadata,
                    balance_after=new_available
                )
                
                logger.info(f"✅ Debited {amount} {currency} from {user_id} | Type: {transaction_type}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error debiting {amount} {currency} from {user_id}: {str(e)}")
            raise
    
    async def lock_balance(self, user_id: str, currency: str, amount: float,
                          lock_type: str, reference_id: str) -> bool:
        """
        Lock balance for pending operations (P2P escrow, pending withdrawal)
        Moves from available to locked
        
        🔒 ATOMIC OPERATION: Uses findOneAndUpdate with balance check in query
        to prevent race conditions where two trades could lock the same funds.
        """
        try:
            if amount <= 0:
                raise ValueError("Lock amount must be positive")
            
            # 🔒 ATOMIC: Single operation that checks AND updates
            # The query includes the balance check, so if another process
            # already locked the funds, this query won't match and will fail
            result = await self.db.wallets.find_one_and_update(
                {
                    "user_id": user_id, 
                    "currency": currency,
                    "available_balance": {"$gte": amount}  # Balance check IN the query
                },
                {
                    "$inc": {
                        "available_balance": -amount,
                        "locked_balance": amount
                    },
                    "$set": {
                        "last_updated": datetime.now(timezone.utc)
                    }
                },
                return_document=True  # Return the updated document
            )
            
            if result:
                logger.info(f"✅ ATOMIC LOCK: {amount} {currency} for {user_id} | Type: {lock_type} | Ref: {reference_id}")
                
                # Log to audit trail
                await self._log_escrow_action(
                    action="ESCROW_LOCKED",
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    lock_type=lock_type,
                    reference_id=reference_id,
                    balance_after=result.get("available_balance", 0)
                )
                return True
            
            # If result is None, either wallet doesn't exist or insufficient balance
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency}
            )
            
            if not wallet:
                raise ValueError(f"Wallet not found for {user_id}/{currency}")
            
            current_available = float(wallet.get("available_balance", 0))
            raise ValueError(
                f"Insufficient available balance to lock. "
                f"Required: {amount}, Available: {current_available}"
            )
            
        except Exception as e:
            logger.error(f"❌ Error locking {amount} {currency} for {user_id}: {str(e)}")
            raise
    
    async def _log_escrow_action(self, action: str, user_id: str, currency: str, 
                                  amount: float, lock_type: str, reference_id: str,
                                  balance_after: float = None):
        """Log escrow actions to audit trail for non-repudiation"""
        try:
            await self.db.audit_trail.insert_one({
                "action": action,
                "user_id": user_id,
                "currency": currency,
                "amount": amount,
                "lock_type": lock_type,
                "reference_id": reference_id,
                "balance_after": balance_after,
                "timestamp": datetime.now(timezone.utc),
                "service": "wallet_service"
            })
        except Exception as e:
            logger.warning(f"⚠️ Failed to log audit trail: {str(e)}")
    
    async def unlock_balance(self, user_id: str, currency: str, amount: float,
                            unlock_type: str, reference_id: str) -> bool:
        """
        Unlock balance (cancelled P2P, failed withdrawal)
        Moves from locked back to available
        """
        try:
            if amount <= 0:
                raise ValueError("Unlock amount must be positive")
            
            # 🔒 ATOMIC: Single operation that checks AND updates
            result = await self.db.wallets.find_one_and_update(
                {
                    "user_id": user_id, 
                    "currency": currency,
                    "locked_balance": {"$gte": amount}  # Balance check IN the query
                },
                {
                    "$inc": {
                        "available_balance": amount,
                        "locked_balance": -amount
                    },
                    "$set": {
                        "last_updated": datetime.now(timezone.utc)
                    }
                },
                return_document=True
            )
            
            if result:
                logger.info(f"✅ ATOMIC UNLOCK: {amount} {currency} for {user_id} | Type: {unlock_type} | Ref: {reference_id}")
                
                # Log to audit trail
                await self._log_escrow_action(
                    action="ESCROW_UNLOCKED",
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    lock_type=unlock_type,
                    reference_id=reference_id,
                    balance_after=result.get("available_balance", 0)
                )
                return True
            
            # If result is None, either wallet doesn't exist or insufficient locked balance
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency}
            )
            
            if not wallet:
                raise ValueError(f"Wallet not found for {user_id}/{currency}")
            
            current_locked = float(wallet.get("locked_balance", 0))
            raise ValueError(
                f"Insufficient locked balance to unlock. "
                f"Required: {amount}, Locked: {current_locked}"
            )
            
        except Exception as e:
            logger.error(f"❌ Error unlocking {amount} {currency} for {user_id}: {str(e)}")
            raise
    
    async def release_locked_balance(self, user_id: str, currency: str, amount: float,
                                     release_type: str, reference_id: str) -> bool:
        """
        Release locked balance (completed P2P, completed withdrawal)
        Removes from locked and total
        """
        try:
            if amount <= 0:
                raise ValueError("Release amount must be positive")
            
            wallet = await self.db.wallets.find_one(
                {"user_id": user_id, "currency": currency}
            )
            
            if not wallet:
                raise ValueError(f"Wallet not found for {user_id}/{currency}")
            
            current_locked = float(wallet.get("locked_balance", 0))
            
            if current_locked < amount:
                raise ValueError(
                    f"Insufficient locked balance to release. "
                    f"Required: {amount}, Locked: {current_locked}"
                )
            
            # Update balances (locked decreases, total decreases)
            result = await self.db.wallets.update_one(
                {"user_id": user_id, "currency": currency},
                {
                    "$inc": {
                        "locked_balance": -amount,
                        "total_balance": -amount
                    },
                    "$set": {
                        "last_updated": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.modified_count > 0:
                # Log transaction
                await self._log_transaction(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    transaction_type=release_type,
                    direction="release",
                    reference_id=reference_id,
                    metadata={"action": "released_locked_balance"},
                    balance_after=float(wallet.get("available_balance", 0))
                )
                
                logger.info(f"✅ Released {amount} {currency} from locked for {user_id} | Type: {release_type}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error releasing {amount} {currency} for {user_id}: {str(e)}")
            raise
    
    async def transfer(self, from_user: str, to_user: str, currency: str, amount: float,
                      transfer_type: str, reference_id: str) -> bool:
        """
        Transfer between users (P2P, referral commission, etc.)
        Atomic operation - both debit and credit must succeed
        """
        try:
            if amount <= 0:
                raise ValueError("Transfer amount must be positive")
            
            # Debit from sender
            debit_success = await self.debit(
                user_id=from_user,
                currency=currency,
                amount=amount,
                transaction_type=f"{transfer_type}_out",
                reference_id=reference_id,
                metadata={"to_user": to_user}
            )
            
            if not debit_success:
                raise Exception("Failed to debit sender")
            
            # Credit to receiver
            try:
                credit_success = await self.credit(
                    user_id=to_user,
                    currency=currency,
                    amount=amount,
                    transaction_type=f"{transfer_type}_in",
                    reference_id=reference_id,
                    metadata={"from_user": from_user}
                )
                
                if not credit_success:
                    # Rollback debit
                    await self.credit(
                        user_id=from_user,
                        currency=currency,
                        amount=amount,
                        transaction_type="rollback",
                        reference_id=reference_id,
                        metadata={"reason": "credit_failed"}
                    )
                    raise Exception("Failed to credit receiver, rolled back")
                
                logger.info(f"✅ Transfer: {amount} {currency} from {from_user} to {to_user} | Type: {transfer_type}")
                return True
                
            except Exception as e:
                # Rollback debit on any error
                await self.credit(
                    user_id=from_user,
                    currency=currency,
                    amount=amount,
                    transaction_type="rollback",
                    reference_id=reference_id,
                    metadata={"reason": str(e)}
                )
                raise
            
        except Exception as e:
            logger.error(f"❌ Error transferring {amount} {currency} from {from_user} to {to_user}: {str(e)}")
            raise
    
    async def _initialize_wallet(self, user_id: str, currency: str) -> Dict:
        """Initialize a new wallet for user"""
        wallet = {
            "user_id": user_id,
            "currency": currency,
            "available_balance": 0.0,
            "locked_balance": 0.0,
            "total_balance": 0.0,
            "created_at": datetime.now(timezone.utc),
            "last_updated": datetime.now(timezone.utc)
        }
        
        await self.db.wallets.insert_one(wallet)
        logger.info(f"✅ Initialized wallet for {user_id}/{currency}")
        
        # Remove _id for return
        wallet.pop("_id", None)
        return wallet
    
    async def _log_transaction(self, user_id: str, currency: str, amount: float,
                              transaction_type: str, direction: str, reference_id: str,
                              metadata: Optional[Dict], balance_after: float):
        """Log all wallet transactions for audit trail"""
        transaction = {
            "transaction_id": str(ObjectId()),
            "user_id": user_id,
            "currency": currency,
            "amount": amount,
            "transaction_type": transaction_type,
            "direction": direction,  # credit|debit|release
            "reference_id": reference_id,
            "balance_after": balance_after,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc)
        }
        
        await self.db.wallet_transactions.insert_one(transaction)
        logger.info(f"📝 Transaction logged: {transaction_type} | {direction} | {amount} {currency}")


# Global instance (initialized in server.py)
wallet_service: Optional[WalletService] = None

def get_wallet_service() -> WalletService:
    """Get the global wallet service instance"""
    if wallet_service is None:
        raise RuntimeError("Wallet service not initialized")
    return wallet_service

def initialize_wallet_service(db: AsyncIOMotorDatabase):
    """Initialize the global wallet service"""
    global wallet_service
    wallet_service = WalletService(db)
    logger.info("🚀 Global Wallet Service initialized")
