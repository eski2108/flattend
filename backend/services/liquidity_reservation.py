# FILE: /app/backend/services/liquidity_reservation.py
# SERVICE LOCK: FROZEN. Manages atomic reservation of liquidity.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

class LiquidityReservationService:
    """
    Manages atomic reservation of liquidity to prevent overselling.
    
    Two-phase commit:
    1. reserve_liquidity() - Reserve before charging user
    2. confirm_reservation() - Confirm after successful payment
    
    Expired reservations are automatically released.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        # Use the same client that created the database to avoid session issues
        self.client = db.client
        self._checksum = "8f3a7c2e1d5b9a4f"
        self.default_expiry_seconds = int(os.getenv('LIQUIDITY_RESERVATION_EXPIRY', '120'))

    async def reserve_liquidity(
        self,
        currency: str,
        amount: float,
        user_id: str,
        order_id: str,
        expires_sec: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Phase 1: Reserve liquidity before charging user.
        
        This atomically:
        1. Checks if enough liquidity is available
        2. Moves liquidity from 'available' to 'reserved'
        3. Creates a reservation record with expiry
        
        Args:
            currency: Currency to reserve (BTC, ETH, etc.)
            amount: Amount to reserve
            user_id: User making the request
            order_id: Unique order/transaction ID
            expires_sec: Seconds until reservation expires (default 120)
            
        Returns:
            Dict with success status and reservation details
        """
        if amount <= 0:
            raise ValueError(f"Reservation amount must be positive, got {amount}")
        
        expiry = expires_sec or self.default_expiry_seconds
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expiry)
        
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Check AND decrement available liquidity atomically
                    liquidity = await self.db.admin_liquidity_wallets.find_one_and_update(
                        {"currency": currency, "available": {"$gte": amount}},
                        {
                            "$inc": {"available": -amount, "reserved": amount},
                            "$set": {"updated_at": datetime.now(timezone.utc)}
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not liquidity:
                        # Get current liquidity for error message
                        current = await self.db.admin_liquidity_wallets.find_one(
                            {"currency": currency},
                            session=session
                        )
                        available = current.get("available", 0) if current else 0
                        raise ValueError(
                            f"Insufficient {currency} liquidity. "
                            f"Available: {available}, Required: {amount}"
                        )
                    
                    # 2. Create reservation record
                    reservation = {
                        "reservation_id": order_id,
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "status": "reserved",
                        "expires_at": expires_at,
                        "created_at": datetime.now(timezone.utc)
                    }
                    await self.db.liquidity_reservations.insert_one(reservation, session=session)
                    
                    # 3. Audit trail
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": "liquidity_reserved",
                        "user_id": user_id,
                        "currency": currency,
                        "amount": amount,
                        "reference_id": order_id,
                        "expires_at": expires_at,
                        "liquidity_after": liquidity.get("available", 0),
                        "timestamp": datetime.now(timezone.utc),
                        "service_checksum": self._checksum
                    }, session=session)
                    
                    logger.info(f"[LIQUIDITY] Reserved {amount} {currency} for order {order_id}, expires {expires_at}")
                    
                    return {
                        "success": True,
                        "reservation_id": order_id,
                        "amount": amount,
                        "currency": currency,
                        "expires_at": expires_at.isoformat(),
                        "available_after": liquidity.get("available", 0)
                    }
                    
                except ValueError:
                    raise
                except Exception as e:
                    logger.error(f"[LIQUIDITY] Reservation FAILED: {currency}/{amount} - {str(e)}")
                    raise

    async def confirm_reservation(self, reservation_id: str) -> Dict[str, Any]:
        """
        Phase 2: Confirm reservation after successful user payment.
        
        This:
        1. Marks reservation as confirmed
        2. Moves amount from 'reserved' to permanent deduction
        """
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Find and update reservation
                    reservation = await self.db.liquidity_reservations.find_one_and_update(
                        {
                            "reservation_id": reservation_id,
                            "status": "reserved",
                            "expires_at": {"$gt": datetime.now(timezone.utc)}
                        },
                        {
                            "$set": {
                                "status": "confirmed",
                                "confirmed_at": datetime.now(timezone.utc)
                            }
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not reservation:
                        # Check if expired
                        expired = await self.db.liquidity_reservations.find_one(
                            {"reservation_id": reservation_id},
                            session=session
                        )
                        if expired and expired.get("status") == "expired":
                            raise ValueError(f"Reservation {reservation_id} has expired")
                        elif expired and expired.get("status") == "confirmed":
                            # Already confirmed - idempotent
                            return {"success": True, "message": "Already confirmed", "idempotent": True}
                        else:
                            raise ValueError(f"Reservation {reservation_id} not found or invalid")
                    
                    # 2. Update liquidity - move from reserved to permanently deducted
                    await self.db.admin_liquidity_wallets.update_one(
                        {"currency": reservation["currency"]},
                        {
                            "$inc": {
                                "reserved": -reservation["amount"],
                                "balance": -reservation["amount"]
                            },
                            "$set": {"updated_at": datetime.now(timezone.utc)}
                        },
                        session=session
                    )
                    
                    # 3. Audit trail
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": "liquidity_confirmed",
                        "user_id": reservation["user_id"],
                        "currency": reservation["currency"],
                        "amount": reservation["amount"],
                        "reference_id": reservation_id,
                        "timestamp": datetime.now(timezone.utc),
                        "service_checksum": self._checksum
                    }, session=session)
                    
                    logger.info(f"[LIQUIDITY] Confirmed reservation {reservation_id}")
                    
                    return {
                        "success": True,
                        "reservation_id": reservation_id,
                        "amount": reservation["amount"],
                        "currency": reservation["currency"]
                    }
                    
                except ValueError:
                    raise
                except Exception as e:
                    logger.error(f"[LIQUIDITY] Confirm FAILED: {reservation_id} - {str(e)}")
                    raise

    async def release_reservation(
        self,
        reservation_id: str,
        reason: str = "cancelled"
    ) -> Dict[str, Any]:
        """
        Release a reservation (cancelled or expired).
        Returns liquidity from 'reserved' back to 'available'.
        """
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Find and update reservation
                    reservation = await self.db.liquidity_reservations.find_one_and_update(
                        {
                            "reservation_id": reservation_id,
                            "status": "reserved"
                        },
                        {
                            "$set": {
                                "status": "released",
                                "release_reason": reason,
                                "released_at": datetime.now(timezone.utc)
                            }
                        },
                        session=session,
                        return_document=True
                    )
                    
                    if not reservation:
                        return {"success": False, "message": "Reservation not found or already processed"}
                    
                    # 2. Return liquidity to available
                    await self.db.admin_liquidity_wallets.update_one(
                        {"currency": reservation["currency"]},
                        {
                            "$inc": {
                                "reserved": -reservation["amount"],
                                "available": reservation["amount"]
                            },
                            "$set": {"updated_at": datetime.now(timezone.utc)}
                        },
                        session=session
                    )
                    
                    # 3. Audit trail
                    await self.db.audit_trail.insert_one({
                        "event_id": os.urandom(16).hex(),
                        "event_type": "liquidity_released",
                        "user_id": reservation["user_id"],
                        "currency": reservation["currency"],
                        "amount": reservation["amount"],
                        "reference_id": reservation_id,
                        "reason": reason,
                        "timestamp": datetime.now(timezone.utc),
                        "service_checksum": self._checksum
                    }, session=session)
                    
                    logger.info(f"[LIQUIDITY] Released reservation {reservation_id} ({reason})")
                    
                    return {
                        "success": True,
                        "reservation_id": reservation_id,
                        "amount": reservation["amount"],
                        "currency": reservation["currency"],
                        "reason": reason
                    }
                    
                except Exception as e:
                    logger.error(f"[LIQUIDITY] Release FAILED: {reservation_id} - {str(e)}")
                    raise

    async def cleanup_expired_reservations(self) -> Dict[str, Any]:
        """
        Background task: Release all expired reservations.
        Should be run periodically (e.g., every minute).
        """
        now = datetime.now(timezone.utc)
        
        # Find expired reservations
        expired = await self.db.liquidity_reservations.find(
            {
                "status": "reserved",
                "expires_at": {"$lt": now}
            }
        ).to_list(100)
        
        released_count = 0
        errors = []
        
        for reservation in expired:
            try:
                await self.release_reservation(
                    reservation["reservation_id"],
                    reason="expired"
                )
                released_count += 1
            except Exception as e:
                errors.append({
                    "reservation_id": reservation["reservation_id"],
                    "error": str(e)
                })
        
        if released_count > 0:
            logger.info(f"[LIQUIDITY] Cleaned up {released_count} expired reservations")
        
        return {
            "released_count": released_count,
            "errors": errors
        }

    async def get_liquidity_status(self, currency: str) -> Dict[str, Any]:
        """Get current liquidity status for a currency."""
        liquidity = await self.db.admin_liquidity_wallets.find_one({"currency": currency})
        
        if not liquidity:
            return {
                "currency": currency,
                "available": 0,
                "reserved": 0,
                "balance": 0,
                "exists": False
            }
        
        return {
            "currency": currency,
            "available": liquidity.get("available", 0),
            "reserved": liquidity.get("reserved", 0),
            "balance": liquidity.get("balance", 0),
            "exists": True,
            "updated_at": liquidity.get("updated_at")
        }


# Singleton instance
_liquidity_service_instance = None

def get_liquidity_reservation_service(db: AsyncIOMotorDatabase) -> LiquidityReservationService:
    """Get or create the LiquidityReservationService singleton."""
    global _liquidity_service_instance
    if _liquidity_service_instance is None:
        _liquidity_service_instance = LiquidityReservationService(db)
    return _liquidity_service_instance
