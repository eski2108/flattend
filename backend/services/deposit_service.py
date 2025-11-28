"""
Deposit Service - Isolated Deposit Address Generation
Handles NOWPayments integration independently with proper error boundaries
"""

import os
import logging
import time
from typing import Dict, Optional
from datetime import datetime, timezone
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

class DepositService:
    """
    Isolated deposit service - independent of other features
    Uses its own database connection and error handling
    """
    
    def __init__(self):
        # Get isolated database connection
        self.db_manager = DatabaseManager.get_instance("deposit_service")
        self.db = self.db_manager.get_database()
        self.nowpayments = None
        logger.info("✅ DepositService initialized with isolated connection")
    
    def _get_nowpayments_service(self):
        """Lazy load NOWPayments service to avoid circular imports"""
        if self.nowpayments is None:
            from nowpayments_integration import get_nowpayments_service
            self.nowpayments = get_nowpayments_service()
        return self.nowpayments
    
    async def create_deposit_address(
        self,
        user_id: str,
        amount: float,
        currency: str = "usd",
        pay_currency: str = "btc"
    ) -> Dict:
        """
        Create deposit address - ISOLATED from other services
        
        This function is wrapped in error boundaries and will never crash other services
        """
        try:
            # Validate inputs
            if not user_id or not amount:
                return {
                    "success": False,
                    "message": "Missing required fields: user_id or amount"
                }
            
            # Validate minimum deposit
            if float(amount) < 50:
                return {
                    "success": False,
                    "message": "Minimum deposit amount is £50"
                }
            
            # Get NOWPayments service
            nowpayments = self._get_nowpayments_service()
            
            # Generate unique order ID
            order_id = f"{user_id}_{int(time.time())}"
            
            logger.info(f"🔵 Creating deposit for user {user_id}, amount: {amount} {currency}, pay with: {pay_currency}")
            
            # Create payment via NOWPayments
            payment = nowpayments.create_payment(
                price_amount=amount,
                price_currency=currency,
                pay_currency=pay_currency,
                order_id=order_id,
                order_description=f"Deposit for user {user_id}"
            )
            
            if not payment:
                logger.error(f"❌ NOWPayments failed to create payment for user {user_id}")
                return {
                    "success": False,
                    "message": "Failed to create payment with NOWPayments"
                }
            
            # Store deposit in database (isolated transaction)
            deposit_doc = {
                "payment_id": payment.get('payment_id'),
                "order_id": order_id,
                "user_id": user_id,
                "amount": float(amount),
                "currency": currency,
                "pay_currency": pay_currency,
                "pay_address": payment.get('pay_address'),
                "pay_amount": float(payment.get('pay_amount', 0)),
                "status": "waiting",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            try:
                await self.db.deposits.insert_one(deposit_doc)
                logger.info(f"✅ Deposit record saved for payment_id: {payment.get('payment_id')}")
            except Exception as db_error:
                logger.error(f"⚠️ Failed to save deposit to DB but address was created: {str(db_error)}")
                # Don't fail the whole operation if DB save fails - address was already created
            
            # Return success response
            return {
                "success": True,
                "payment_id": str(payment.get('payment_id', '')),
                "deposit_address": str(payment.get('pay_address', '')),
                "amount_to_send": float(payment.get('pay_amount', 0)),
                "currency": str(pay_currency).upper()
            }
            
        except Exception as e:
            logger.error(f"❌ Deposit service error for user {user_id}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Return error but don't crash
            return {
                "success": False,
                "message": f"Internal error: {str(e)}"
            }
    
    async def get_deposit_status(self, payment_id: str) -> Optional[Dict]:
        """Get deposit status from database"""
        try:
            deposit = await self.db.deposits.find_one(
                {"payment_id": payment_id},
                {"_id": 0}
            )
            return deposit
        except Exception as e:
            logger.error(f"❌ Error getting deposit status: {str(e)}")
            return None
    
    async def update_deposit_status(
        self,
        payment_id: str,
        status: str,
        additional_data: Optional[Dict] = None
    ) -> bool:
        """Update deposit status"""
        try:
            update_doc = {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if additional_data:
                update_doc.update(additional_data)
            
            result = await self.db.deposits.update_one(
                {"payment_id": payment_id},
                {"$set": update_doc}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Error updating deposit status: {str(e)}")
            return False


# Global instance (but properly initialized through dependency injection)
_deposit_service_instance: Optional[DepositService] = None

def get_deposit_service() -> DepositService:
    """Get or create deposit service instance"""
    global _deposit_service_instance
    if _deposit_service_instance is None:
        _deposit_service_instance = DepositService()
    return _deposit_service_instance
