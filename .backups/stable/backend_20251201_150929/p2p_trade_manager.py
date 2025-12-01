"""
P2P Trade Manager - Complete State Machine for P2P Trades
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from badge_system import BadgeSystem

logger = logging.getLogger(__name__)

class P2PTradeManager:
    """Manages P2P trade lifecycle with proper escrow and state transitions"""
    
    def __init__(self, db, wallet_service):
        self.db = db
        self.wallet_service = wallet_service
        self.badge_system = BadgeSystem(db)
    
    async def create_trade(self, offer_id: str, buyer_id: str, crypto_amount: float, payment_method: str) -> Dict:
        """
        Create new P2P trade and lock funds in escrow
        State: OPEN -> WAITING_PAYMENT
        """
        try:
            # Get offer
            offer = await self.db.enhanced_sell_orders.find_one({"order_id": offer_id})
            if not offer:
                return {"success": False, "message": "Offer not found"}
            
            if offer["status"] != "active":
                return {"success": False, "message": "Offer is no longer active"}
            
            # Validate amount
            if crypto_amount < offer["min_purchase"] or crypto_amount > offer["max_purchase"]:
                return {"success": False, "message": "Amount outside offer limits"}
            
            if crypto_amount > offer["crypto_amount"]:
                return {"success": False, "message": "Insufficient crypto in offer"}
            
            seller_id = offer["seller_id"]
            fiat_amount = crypto_amount * offer["price_per_unit"]
            
            # Lock funds in escrow from seller's available balance
            lock_result = await self.wallet_service.lock_to_escrow(
                user_id=seller_id,
                currency=offer["crypto_currency"],
                amount=crypto_amount,
                reference_type="p2p_trade",
                reference_id=None  # Will be updated with trade_id
            )
            
            if not lock_result["success"]:
                return {"success": False, "message": "Failed to lock funds in escrow"}
            
            # Create trade
            trade_id = str(uuid.uuid4())
            payment_deadline = datetime.now(timezone.utc) + timedelta(minutes=30)  # 30 min payment window
            
            trade = {
                "trade_id": trade_id,
                "offer_id": offer_id,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "crypto_currency": offer["crypto_currency"],
                "crypto_amount": crypto_amount,
                "fiat_currency": offer["fiat_currency"],
                "fiat_amount": fiat_amount,
                "price_per_unit": offer["price_per_unit"],
                "payment_method": payment_method,
                "status": "waiting_payment",
                "escrow_locked": True,
                "payment_deadline": payment_deadline.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.p2p_trades.insert_one(trade)
            
            # Update offer amount
            new_amount = offer["crypto_amount"] - crypto_amount
            if new_amount < offer["min_purchase"]:
                await self.db.enhanced_sell_orders.update_one(
                    {"order_id": offer_id},
                    {"$set": {"status": "completed", "crypto_amount": 0}}
                )
            else:
                await self.db.enhanced_sell_orders.update_one(
                    {"order_id": offer_id},
                    {"$set": {"crypto_amount": new_amount}}
                )
            
            logger.info(f"Trade {trade_id} created: {crypto_amount} {offer['crypto_currency']} locked in escrow")
            
            return {
                "success": True,
                "trade_id": trade_id,
                "trade": trade,
                "message": "Trade created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating trade: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def mark_as_paid(self, trade_id: str, buyer_id: str) -> Dict:
        """
        Buyer marks payment as completed
        State: WAITING_PAYMENT -> PAID
        """
        try:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id})
            if not trade:
                return {"success": False, "message": "Trade not found"}
            
            if trade["buyer_id"] != buyer_id:
                return {"success": False, "message": "Not authorized"}
            
            if trade["status"] != "waiting_payment":
                return {"success": False, "message": f"Invalid state: {trade['status']}"}
            
            # Update to paid
            await self.db.p2p_trades.update_one(
                {"trade_id": trade_id},
                {"$set": {
                    "status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Trade {trade_id} marked as paid by buyer")
            
            return {"success": True, "message": "Payment confirmed"}
            
        except Exception as e:
            logger.error(f"Error marking trade as paid: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def release_crypto(self, trade_id: str, seller_id: str, otp_code: str) -> Dict:
        """
        Seller releases crypto from escrow to buyer
        State: PAID -> COMPLETED
        """
        try:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id})
            if not trade:
                return {"success": False, "message": "Trade not found"}
            
            if trade["seller_id"] != seller_id:
                return {"success": False, "message": "Not authorized"}
            
            if trade["status"] != "paid":
                return {"success": False, "message": f"Invalid state: {trade['status']}"}
            
            # Verify OTP (implement OTP verification here)
            # For now, we'll skip OTP check in this module and handle it in the endpoint
            
            # Release from escrow to buyer
            release_result = await self.wallet_service.release_from_escrow(
                seller_id=seller_id,
                buyer_id=trade["buyer_id"],
                currency=trade["crypto_currency"],
                amount=trade["crypto_amount"],
                reference_type="p2p_trade",
                reference_id=trade_id
            )
            
            if not release_result["success"]:
                return {"success": False, "message": "Failed to release funds from escrow"}
            
            # Update trade to completed
            await self.db.p2p_trades.update_one(
                {"trade_id": trade_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Recalculate seller's badge
            await self.badge_system.calculate_user_badge(seller_id)
            
            logger.info(f"Trade {trade_id} completed: crypto released to buyer")
            
            return {
                "success": True,
                "message": "Crypto released successfully"
            }
            
        except Exception as e:
            logger.error(f"Error releasing crypto: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def cancel_trade(self, trade_id: str, user_id: str, reason: str) -> Dict:
        """
        Cancel trade and return funds to seller
        State: * -> CANCELLED
        """
        try:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id})
            if not trade:
                return {"success": False, "message": "Trade not found"}
            
            # Only allow cancellation before completion
            if trade["status"] == "completed":
                return {"success": False, "message": "Cannot cancel completed trade"}
            
            # Check authorization
            if user_id not in [trade["buyer_id"], trade["seller_id"]]:
                return {"success": False, "message": "Not authorized"}
            
            # Return funds from escrow to seller if locked
            if trade.get("escrow_locked"):
                return_result = await self.wallet_service.return_from_escrow(
                    user_id=trade["seller_id"],
                    currency=trade["crypto_currency"],
                    amount=trade["crypto_amount"],
                    reference_type="p2p_trade",
                    reference_id=trade_id
                )
                
                if not return_result["success"]:
                    return {"success": False, "message": "Failed to return funds from escrow"}
            
            # Update trade to cancelled
            await self.db.p2p_trades.update_one(
                {"trade_id": trade_id},
                {"$set": {
                    "status": "cancelled",
                    "cancellation_reason": reason,
                    "cancelled_by": user_id,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Return crypto to offer if possible
            offer = await self.db.enhanced_sell_orders.find_one({"order_id": trade["offer_id"]})
            if offer and offer["status"] in ["active", "completed"]:
                new_amount = offer["crypto_amount"] + trade["crypto_amount"]
                await self.db.enhanced_sell_orders.update_one(
                    {"order_id": trade["offer_id"]},
                    {"$set": {"crypto_amount": new_amount, "status": "active"}}
                )
            
            logger.info(f"Trade {trade_id} cancelled: funds returned to seller")
            
            return {
                "success": True,
                "message": "Trade cancelled and funds returned"
            }
            
        except Exception as e:
            logger.error(f"Error cancelling trade: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def open_dispute(self, trade_id: str, user_id: str, reason: str) -> Dict:
        """
        Open dispute for trade
        State: * -> DISPUTE
        """
        try:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id})
            if not trade:
                return {"success": False, "message": "Trade not found"}
            
            if user_id not in [trade["buyer_id"], trade["seller_id"]]:
                return {"success": False, "message": "Not authorized"}
            
            if trade["status"] in ["completed", "cancelled"]:
                return {"success": False, "message": "Cannot dispute finalized trade"}
            
            # Create dispute
            dispute_id = str(uuid.uuid4())
            dispute = {
                "dispute_id": dispute_id,
                "trade_id": trade_id,
                "opened_by": user_id,
                "reason": reason,
                "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.p2p_disputes.insert_one(dispute)
            
            # Update trade status
            await self.db.p2p_trades.update_one(
                {"trade_id": trade_id},
                {"$set": {
                    "status": "dispute",
                    "dispute_id": dispute_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Dispute {dispute_id} opened for trade {trade_id}")
            
            return {
                "success": True,
                "dispute_id": dispute_id,
                "message": "Dispute opened successfully"
            }
            
        except Exception as e:
            logger.error(f"Error opening dispute: {str(e)}")
            return {"success": False, "message": str(e)}
