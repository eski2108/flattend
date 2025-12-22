# FILE: /app/backend/services/atomic_balance_service.py
# SERVICE LOCK: FROZEN. DO NOT MODIFY WITHOUT UPDATING INTEGRITY_CHECKSUM.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f (Run full test suite after any change)

import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging
import hashlib

logger = logging.getLogger(__name__)

class AtomicBalanceService:
    """
    SERVICE LOCK: FROZEN. DO NOT MODIFY WITHOUT UPDATING INTEGRITY_CHECKSUM.
    
    This service handles ALL balance operations atomically using MongoDB transactions.
    All four balance collections (wallets, crypto_balances, trader_balances, internal_balances)
    are updated within a single transaction to prevent data corruption.
    
    INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        # Use the same client that created the database to avoid session issues
        self.client = db.client
        self._checksum = "8f3a7c2e1d5b9a4f"
        # Check if replica set is available for transactions
        self._transactions_supported = os.getenv('MONGO_TRANSACTIONS_ENABLED', 'false').lower() == 'true'
        logger.info(f"AtomicBalanceService initialized (transactions_supported={self._transactions_supported})")

    def _generate_event_checksum(self, event_data: Dict) -> str:
        """Generate SHA256 checksum for audit trail event."""
        data_str = str(sorted(event_data.items()))
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]

    async def _update_all_collections(
        self,
        user_id: str,
        currency: str,
        available_delta: float = 0,
        locked_delta: float = 0,
        total_delta: float = 0,
        session=None
    ):
        """Update all 4 balance collections with the given deltas."""
        timestamp = datetime.now(timezone.utc)
        
        # 1. Update wallets collection
        await self.db.wallets.update_one(
            {"user_id": user_id, "currency": currency},
            {
                "$inc": {"available_balance": available_delta, "locked_balance": locked_delta, "total_balance": total_delta},
                "$set": {"last_updated": timestamp},
                "$setOnInsert": {"created_at": timestamp}
            },
            session=session,
            upsert=True
        )

        # 2. Update crypto_balances collection
        await self.db.crypto_balances.update_one(
            {"user_id": user_id, "currency": currency},
            {
                "$inc": {"balance": total_delta, "available_balance": available_delta, "locked_balance": locked_delta},
                "$set": {"last_updated": timestamp},
                "$setOnInsert": {"created_at": timestamp}
            },
            session=session,
            upsert=True
        )

        # 3. Update trader_balances collection
        await self.db.trader_balances.update_one(
            {"trader_id": user_id, "currency": currency},
            {
                "$inc": {"total_balance": total_delta, "available_balance": available_delta, "locked_balance": locked_delta},
                "$set": {"updated_at": timestamp},
                "$setOnInsert": {"created_at": timestamp}
            },
            session=session,
            upsert=True
        )

        # 4. Update internal_balances collection
        await self.db.internal_balances.update_one(
            {"user_id": user_id, "currency": currency},
            {
                "$inc": {"balance": total_delta, "available_balance": available_delta, "locked_balance": locked_delta},
                "$set": {"updated_at": timestamp},
                "$setOnInsert": {"created_at": timestamp}
            },
            session=session,
            upsert=True
        )

    async def atomic_credit(
        self,
        user_id: str,
        currency: str,
        amount: float,
        tx_type: str,
        ref_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Atomically credit a user's balance across ALL 4 collections.
        
        Args:
            user_id: The user ID to credit
            currency: Currency code (BTC, ETH, GBP, etc.)
            amount: Amount to credit (must be positive)
            tx_type: Transaction type for audit trail
            ref_id: Reference ID (transaction ID, swap ID, etc.)
            metadata: Optional additional data for audit trail
            
        Returns:
            Dict with success status and new balance
            
        Raises:
            ValueError: If amount is negative
            Exception: If transaction fails
        """
        if amount < 0:
            raise ValueError(f"Credit amount must be positive, got {amount}")
        
        if amount == 0:
            logger.warning(f"Zero credit attempted for {user_id}/{currency}")
            return {"success": True, "new_balance": 0, "message": "Zero amount, no change"}

        timestamp = datetime.now(timezone.utc)
        
        # Get before state for audit
        before_state = await self._get_all_balances(user_id, currency)
        
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Update wallets collection
                    wallet_result = await self.db.wallets.find_one_and_update(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"available_balance": amount, "total_balance": amount},
                            "$set": {"last_updated": timestamp},
                            "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
                        },
                        session=session,
                        return_document=True,
                        upsert=True
                    )
                    logger.info(f"[ATOMIC] wallets updated: {user_id}/{currency} +{amount}")

                    # 2. Update crypto_balances collection
                    await self.db.crypto_balances.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"balance": amount, "available_balance": amount},
                            "$set": {"last_updated": timestamp},
                            "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
                        },
                        session=session,
                        upsert=True
                    )
                    logger.info(f"[ATOMIC] crypto_balances updated: {user_id}/{currency} +{amount}")

                    # 3. Update trader_balances collection
                    await self.db.trader_balances.update_one(
                        {"trader_id": user_id, "currency": currency},
                        {
                            "$inc": {"total_balance": amount, "available_balance": amount},
                            "$set": {"updated_at": timestamp},
                            "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
                        },
                        session=session,
                        upsert=True
                    )
                    logger.info(f"[ATOMIC] trader_balances updated: {user_id}/{currency} +{amount}")

                    # 4. Update internal_balances collection
                    await self.db.internal_balances.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"balance": amount, "available_balance": amount},
                            "$set": {"updated_at": timestamp},
                            "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
                        },
                        session=session,
                        upsert=True
                    )
                    logger.info(f"[ATOMIC] internal_balances updated: {user_id}/{currency} +{amount}")

                    # Get after state for audit
                    after_state = {
                        "wallets": wallet_result.get("available_balance", 0) if wallet_result else amount,
                        "crypto_balances": before_state.get("crypto_balances", 0) + amount,
                        "trader_balances": before_state.get("trader_balances", 0) + amount,
                        "internal_balances": before_state.get("internal_balances", 0) + amount
                    }

                    # 5. Log to audit trail (also within transaction)
                    event_data = {
                        "event_type": f"atomic_credit_{tx_type}",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": ref_id,
                        "timestamp": timestamp.isoformat()
                    }
                    
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": f"atomic_credit_{tx_type}",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": ref_id,
                        "before_state": before_state,
                        "after_state": after_state,
                        "metadata": metadata or {},
                        "timestamp": timestamp,
                        "checksum": self._generate_event_checksum(event_data),
                        "service_checksum": self._checksum
                    }, session=session)

                    logger.info(f"[ATOMIC] Credit completed: {user_id}, {currency}, +{amount}, ref={ref_id}")
                    
                    new_balance = wallet_result.get("available_balance", amount) if wallet_result else amount
                    return {
                        "success": True,
                        "new_balance": new_balance,
                        "amount_credited": amount,
                        "transaction_type": tx_type,
                        "reference_id": ref_id
                    }
                    
                except Exception as e:
                    logger.error(f"[ATOMIC] Credit FAILED: {user_id}/{currency}/{amount} - {str(e)}")
                    raise

    async def atomic_debit(
        self,
        user_id: str,
        currency: str,
        amount: float,
        tx_type: str,
        ref_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Atomically debit a user's balance across ALL 4 collections.
        
        Args:
            user_id: The user ID to debit
            currency: Currency code (BTC, ETH, GBP, etc.)
            amount: Amount to debit (must be positive)
            tx_type: Transaction type for audit trail
            ref_id: Reference ID
            metadata: Optional additional data
            
        Returns:
            Dict with success status and new balance
            
        Raises:
            ValueError: If amount is negative or insufficient balance
        """
        if amount < 0:
            raise ValueError(f"Debit amount must be positive, got {amount}")
        
        if amount == 0:
            logger.warning(f"Zero debit attempted for {user_id}/{currency}")
            return {"success": True, "new_balance": 0, "message": "Zero amount, no change"}

        timestamp = datetime.now(timezone.utc)
        
        # Get before state and check balance
        before_state = await self._get_all_balances(user_id, currency)
        current_available = before_state.get("wallets", 0)
        
        if current_available < amount:
            raise ValueError(f"Insufficient balance. Available: {current_available}, Required: {amount}")

        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Update wallets collection
                    wallet_result = await self.db.wallets.find_one_and_update(
                        {"user_id": user_id, "currency": currency, "available_balance": {"$gte": amount}},
                        {
                            "$inc": {"available_balance": -amount, "total_balance": -amount},
                            "$set": {"last_updated": timestamp}
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not wallet_result:
                        raise ValueError(f"Insufficient balance in wallets collection")
                    
                    logger.info(f"[ATOMIC] wallets debited: {user_id}/{currency} -{amount}")

                    # 2. Update crypto_balances collection
                    await self.db.crypto_balances.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"balance": -amount, "available_balance": -amount},
                            "$set": {"last_updated": timestamp}
                        },
                        session=session
                    )
                    logger.info(f"[ATOMIC] crypto_balances debited: {user_id}/{currency} -{amount}")

                    # 3. Update trader_balances collection
                    await self.db.trader_balances.update_one(
                        {"trader_id": user_id, "currency": currency},
                        {
                            "$inc": {"total_balance": -amount, "available_balance": -amount},
                            "$set": {"updated_at": timestamp}
                        },
                        session=session
                    )
                    logger.info(f"[ATOMIC] trader_balances debited: {user_id}/{currency} -{amount}")

                    # 4. Update internal_balances collection
                    await self.db.internal_balances.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"balance": -amount, "available_balance": -amount},
                            "$set": {"updated_at": timestamp}
                        },
                        session=session
                    )
                    logger.info(f"[ATOMIC] internal_balances debited: {user_id}/{currency} -{amount}")

                    # Get after state
                    after_state = {
                        "wallets": wallet_result.get("available_balance", 0),
                        "crypto_balances": before_state.get("crypto_balances", 0) - amount,
                        "trader_balances": before_state.get("trader_balances", 0) - amount,
                        "internal_balances": before_state.get("internal_balances", 0) - amount
                    }

                    # 5. Audit trail
                    event_data = {
                        "event_type": f"atomic_debit_{tx_type}",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": ref_id,
                        "timestamp": timestamp.isoformat()
                    }
                    
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": f"atomic_debit_{tx_type}",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": -amount,
                        "reference_id": ref_id,
                        "before_state": before_state,
                        "after_state": after_state,
                        "metadata": metadata or {},
                        "timestamp": timestamp,
                        "checksum": self._generate_event_checksum(event_data),
                        "service_checksum": self._checksum
                    }, session=session)

                    logger.info(f"[ATOMIC] Debit completed: {user_id}, {currency}, -{amount}, ref={ref_id}")
                    
                    return {
                        "success": True,
                        "new_balance": wallet_result.get("available_balance", 0),
                        "amount_debited": amount,
                        "transaction_type": tx_type,
                        "reference_id": ref_id
                    }
                    
                except Exception as e:
                    logger.error(f"[ATOMIC] Debit FAILED: {user_id}/{currency}/{amount} - {str(e)}")
                    raise

    async def atomic_lock(
        self,
        user_id: str,
        currency: str,
        amount: float,
        lock_type: str,
        ref_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Atomically lock a user's balance (move from available to locked).
        Used for escrow in P2P trades.
        """
        if amount < 0:
            raise ValueError(f"Lock amount must be positive, got {amount}")
        
        if amount == 0:
            return {"success": True, "message": "Zero amount, no change"}

        timestamp = datetime.now(timezone.utc)
        before_state = await self._get_all_balances(user_id, currency)
        current_available = before_state.get("wallets", 0)
        
        if current_available < amount:
            raise ValueError(f"Insufficient available balance for lock. Available: {current_available}, Required: {amount}")

        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Update wallets - move from available to locked
                    wallet_result = await self.db.wallets.find_one_and_update(
                        {"user_id": user_id, "currency": currency, "available_balance": {"$gte": amount}},
                        {
                            "$inc": {"available_balance": -amount, "locked_balance": amount},
                            "$set": {"last_updated": timestamp}
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not wallet_result:
                        raise ValueError("Insufficient balance for lock")

                    # 2. Update crypto_balances
                    await self.db.crypto_balances.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"available_balance": -amount, "locked_balance": amount},
                            "$set": {"last_updated": timestamp}
                        },
                        session=session
                    )

                    # 3. Update trader_balances
                    await self.db.trader_balances.update_one(
                        {"trader_id": user_id, "currency": currency},
                        {
                            "$inc": {"available_balance": -amount, "locked_balance": amount},
                            "$set": {"updated_at": timestamp}
                        },
                        session=session
                    )

                    # 4. Update internal_balances
                    await self.db.internal_balances.update_one(
                        {"user_id": user_id, "currency": currency},
                        {
                            "$inc": {"available_balance": -amount, "locked_balance": amount},
                            "$set": {"updated_at": timestamp}
                        },
                        session=session
                    )

                    # 5. Audit trail
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": f"atomic_lock_{lock_type}",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": ref_id,
                        "before_state": before_state,
                        "metadata": metadata or {},
                        "timestamp": timestamp,
                        "service_checksum": self._checksum
                    }, session=session)

                    logger.info(f"[ATOMIC] Lock completed: {user_id}, {currency}, {amount}, ref={ref_id}")
                    
                    return {
                        "success": True,
                        "available_balance": wallet_result.get("available_balance", 0),
                        "locked_balance": wallet_result.get("locked_balance", 0),
                        "amount_locked": amount
                    }
                    
                except Exception as e:
                    logger.error(f"[ATOMIC] Lock FAILED: {user_id}/{currency}/{amount} - {str(e)}")
                    raise

    async def atomic_unlock(
        self,
        user_id: str,
        currency: str,
        amount: float,
        unlock_type: str,
        ref_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Atomically unlock a user's balance (move from locked back to available).
        Used when P2P trade is cancelled.
        """
        if amount < 0:
            raise ValueError(f"Unlock amount must be positive, got {amount}")

        timestamp = datetime.now(timezone.utc)

        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Update wallets
                    wallet_result = await self.db.wallets.find_one_and_update(
                        {"user_id": user_id, "currency": currency, "locked_balance": {"$gte": amount}},
                        {
                            "$inc": {"available_balance": amount, "locked_balance": -amount},
                            "$set": {"last_updated": timestamp}
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not wallet_result:
                        raise ValueError("Insufficient locked balance for unlock")

                    # 2-4. Update other collections
                    for coll, id_field in [("crypto_balances", "user_id"), ("trader_balances", "trader_id"), ("internal_balances", "user_id")]:
                        await self.db[coll].update_one(
                            {id_field: user_id, "currency": currency},
                            {
                                "$inc": {"available_balance": amount, "locked_balance": -amount},
                                "$set": {"updated_at" if coll != "crypto_balances" else "last_updated": timestamp}
                            },
                            session=session
                        )

                    # 5. Audit trail
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": f"atomic_unlock_{unlock_type}",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": ref_id,
                        "metadata": metadata or {},
                        "timestamp": timestamp,
                        "service_checksum": self._checksum
                    }, session=session)

                    logger.info(f"[ATOMIC] Unlock completed: {user_id}, {currency}, {amount}, ref={ref_id}")
                    
                    return {
                        "success": True,
                        "available_balance": wallet_result.get("available_balance", 0),
                        "locked_balance": wallet_result.get("locked_balance", 0),
                        "amount_unlocked": amount
                    }
                    
                except Exception as e:
                    logger.error(f"[ATOMIC] Unlock FAILED: {user_id}/{currency}/{amount} - {str(e)}")
                    raise

    async def atomic_release(
        self,
        from_user_id: str,
        to_user_id: str,
        currency: str,
        amount: float,
        release_type: str,
        ref_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Atomically release locked funds from one user to another.
        Used when seller releases escrow to buyer in P2P.
        """
        timestamp = datetime.now(timezone.utc)

        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Deduct from sender's locked balance
                    sender_result = await self.db.wallets.find_one_and_update(
                        {"user_id": from_user_id, "currency": currency, "locked_balance": {"$gte": amount}},
                        {
                            "$inc": {"locked_balance": -amount, "total_balance": -amount},
                            "$set": {"last_updated": timestamp}
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not sender_result:
                        raise ValueError("Insufficient locked balance for release")

                    # Update sender's other collections
                    for coll, id_field in [("crypto_balances", "user_id"), ("trader_balances", "trader_id"), ("internal_balances", "user_id")]:
                        await self.db[coll].update_one(
                            {id_field: from_user_id, "currency": currency},
                            {
                                "$inc": {"locked_balance": -amount, "balance" if coll in ["crypto_balances", "internal_balances"] else "total_balance": -amount},
                                "$set": {"updated_at" if coll != "crypto_balances" else "last_updated": timestamp}
                            },
                            session=session
                        )

                    # 2. Credit to receiver's available balance
                    receiver_result = await self.db.wallets.find_one_and_update(
                        {"user_id": to_user_id, "currency": currency},
                        {
                            "$inc": {"available_balance": amount, "total_balance": amount},
                            "$set": {"last_updated": timestamp},
                            "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
                        },
                        session=session,
                        return_document=True,
                        upsert=True
                    )

                    # Update receiver's other collections
                    for coll, id_field in [("crypto_balances", "user_id"), ("trader_balances", "trader_id"), ("internal_balances", "user_id")]:
                        await self.db[coll].update_one(
                            {id_field: to_user_id, "currency": currency},
                            {
                                "$inc": {"available_balance": amount, "balance" if coll in ["crypto_balances", "internal_balances"] else "total_balance": amount},
                                "$set": {"updated_at" if coll != "crypto_balances" else "last_updated": timestamp},
                                "$setOnInsert": {"locked_balance": 0, "created_at": timestamp}
                            },
                            session=session,
                            upsert=True
                        )

                    # 3. Audit trail
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": f"atomic_release_{release_type}",
                        "from_user_id": from_user_id,
                        "to_user_id": to_user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": ref_id,
                        "metadata": metadata or {},
                        "timestamp": timestamp,
                        "service_checksum": self._checksum
                    }, session=session)

                    logger.info(f"[ATOMIC] Release completed: {from_user_id} -> {to_user_id}, {currency}, {amount}, ref={ref_id}")
                    
                    return {
                        "success": True,
                        "sender_balance": sender_result.get("total_balance", 0),
                        "receiver_balance": receiver_result.get("available_balance", 0),
                        "amount_released": amount
                    }
                    
                except Exception as e:
                    logger.error(f"[ATOMIC] Release FAILED: {from_user_id}->{to_user_id}/{currency}/{amount} - {str(e)}")
                    raise

    async def _get_all_balances(self, user_id: str, currency: str) -> Dict[str, float]:
        """Get balances from all 4 collections for a user."""
        balances = {}
        
        # wallets
        wallet = await self.db.wallets.find_one({"user_id": user_id, "currency": currency})
        balances["wallets"] = float(wallet.get("available_balance", 0)) if wallet else 0.0
        
        # crypto_balances
        crypto = await self.db.crypto_balances.find_one({"user_id": user_id, "currency": currency})
        balances["crypto_balances"] = float(crypto.get("available_balance", crypto.get("balance", 0))) if crypto else 0.0
        
        # trader_balances
        trader = await self.db.trader_balances.find_one({"trader_id": user_id, "currency": currency})
        balances["trader_balances"] = float(trader.get("available_balance", 0)) if trader else 0.0
        
        # internal_balances
        internal = await self.db.internal_balances.find_one({"user_id": user_id, "currency": currency})
        balances["internal_balances"] = float(internal.get("available_balance", internal.get("balance", 0))) if internal else 0.0
        
        return balances

    async def verify_integrity(self, user_id: str, currency: str, tolerance: float = 0.00000001) -> Dict[str, Any]:
        """Verify all 4 collections have matching balances."""
        balances = await self._get_all_balances(user_id, currency)
        
        baseline = balances.get("wallets", 0)
        discrepancies = []
        
        for coll_name, balance in balances.items():
            if abs(balance - baseline) > tolerance:
                discrepancies.append({
                    "collection": coll_name,
                    "balance": balance,
                    "difference": balance - baseline
                })
        
        if discrepancies:
            return {
                "status": "unhealthy",
                "discrepancies": discrepancies,
                "balances": balances
            }
        
        return {
            "status": "healthy",
            "balance": baseline,
            "balances": balances
        }


# Singleton instance
_atomic_service_instance = None

def get_atomic_balance_service(db: AsyncIOMotorDatabase) -> AtomicBalanceService:
    """Get or create the AtomicBalanceService singleton."""
    global _atomic_service_instance
    if _atomic_service_instance is None:
        _atomic_service_instance = AtomicBalanceService(db)
    return _atomic_service_instance
