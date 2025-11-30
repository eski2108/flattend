"""
P2P Trade Notification Service
Handles all notifications for P2P marketplace trades
"""

from datetime import datetime, timezone
from typing import Dict, Optional, List
import uuid
import logging

logger = logging.getLogger(__name__)

class P2PNotificationService:
    def __init__(self, db):
        self.db = db
        self.collection = db.p2p_notifications
    
    async def create_notification(self,
                                 trade_id: str,
                                 recipient_id: str,
                                 notification_type: str,
                                 stage: str,
                                 title: str,
                                 message: str,
                                 action_required: Optional[str] = None,
                                 metadata: Optional[Dict] = None) -> Dict:
        """
        Create a new notification for a P2P trade
        
        Args:
            trade_id: Trade ID
            recipient_id: User who receives notification
            notification_type: Type of notification (trade_update, message, dispute, etc.)
            stage: Current trade stage
            title: Notification title
            message: Notification message
            action_required: What user needs to do next
            metadata: Additional data
        """
        try:
            notification = {
                "notification_id": str(uuid.uuid4()),
                "trade_id": trade_id,
                "recipient_id": recipient_id,
                "notification_type": notification_type,
                "stage": stage,
                "title": title,
                "message": message,
                "action_required": action_required,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "metadata": metadata or {}
            }
            
            await self.collection.insert_one(notification)
            logger.info(f"Created notification: {notification_type} for trade {trade_id}")
            
            return {"success": True, "notification": notification}
        except Exception as e:
            logger.error(f"Failed to create notification: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def notify_trade_opened(self, trade_id: str, buyer_id: str, seller_id: str, crypto_amount: float, crypto_currency: str, fiat_amount: float, fiat_currency: str):
        """Notify both parties when trade is opened"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="trade_opened",
            stage="pending_payment",
            title="Trade Created Successfully",
            message=f"Your trade for {crypto_amount} {crypto_currency} has been created. Total: {fiat_currency} {fiat_amount:.2f}",
            action_required="Wait for escrow confirmation, then make payment to seller using agreed payment method.",
            metadata={"crypto_amount": crypto_amount, "crypto_currency": crypto_currency, "fiat_amount": fiat_amount, "role": "buyer"}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="trade_opened",
            stage="pending_payment",
            title="New Trade Request",
            message=f"A buyer wants to purchase {crypto_amount} {crypto_currency} from you for {fiat_currency} {fiat_amount:.2f}",
            action_required="Your crypto is being locked in escrow. Wait for buyer's payment.",
            metadata={"crypto_amount": crypto_amount, "crypto_currency": crypto_currency, "fiat_amount": fiat_amount, "role": "seller"}
        )
    
    async def notify_escrow_locked(self, trade_id: str, buyer_id: str, seller_id: str, crypto_amount: float, crypto_currency: str):
        """Notify when escrow is successfully locked"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="escrow_locked",
            stage="escrow_locked",
            title="Escrow Locked - Safe to Pay",
            message=f"{crypto_amount} {crypto_currency} has been locked in escrow. You can now make payment safely.",
            action_required="Make payment to seller using agreed payment method, then click 'I Have Paid' button.",
            metadata={"crypto_amount": crypto_amount, "crypto_currency": crypto_currency}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="escrow_locked",
            stage="escrow_locked",
            title="Your Crypto is in Escrow",
            message=f"{crypto_amount} {crypto_currency} has been locked safely in escrow.",
            action_required="Wait for buyer to send payment. Check your payment account regularly.",
            metadata={"crypto_amount": crypto_amount, "crypto_currency": crypto_currency}
        )
    
    async def notify_message_sent(self, trade_id: str, sender_id: str, recipient_id: str, sender_role: str, message_preview: str):
        """Notify when a message is sent in trade chat"""
        
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=recipient_id,
            notification_type="message_received",
            stage="chat_message",
            title=f"New Message from {sender_role.capitalize()}",
            message=f"{message_preview[:100]}...",
            action_required="Check trade chat and respond if needed.",
            metadata={"sender_id": sender_id, "sender_role": sender_role}
        )
    
    async def notify_payment_marked(self, trade_id: str, buyer_id: str, seller_id: str, fiat_amount: float, fiat_currency: str, payment_reference: Optional[str] = None):
        """Notify when buyer marks payment as sent"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="payment_marked",
            stage="buyer_marked_paid",
            title="Payment Marked as Sent",
            message=f"You marked {fiat_currency} {fiat_amount:.2f} as paid. Reference: {payment_reference or 'N/A'}",
            action_required="Wait for seller to confirm receipt and release crypto.",
            metadata={"fiat_amount": fiat_amount, "payment_reference": payment_reference}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="payment_marked",
            stage="buyer_marked_paid",
            title="⚠️ Buyer Claims Payment Sent",
            message=f"Buyer marked {fiat_currency} {fiat_amount:.2f} as paid. Reference: {payment_reference or 'N/A'}",
            action_required="CHECK YOUR PAYMENT ACCOUNT. If payment received, click 'Release Crypto'. If not received, wait or open dispute.",
            metadata={"fiat_amount": fiat_amount, "payment_reference": payment_reference}
        )
    
    async def notify_proof_uploaded(self, trade_id: str, buyer_id: str, seller_id: str, proof_url: str):
        """Notify when buyer uploads payment proof"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="proof_uploaded",
            stage="proof_uploaded",
            title="Payment Proof Uploaded",
            message="Your payment proof has been uploaded successfully.",
            action_required="Wait for seller to verify and release crypto.",
            metadata={"proof_url": proof_url}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="proof_uploaded",
            stage="proof_uploaded",
            title="⚠️ Payment Proof Uploaded",
            message="Buyer uploaded payment proof. Please review.",
            action_required="Click to view proof. If valid and payment received, release crypto.",
            metadata={"proof_url": proof_url}
        )
    
    async def notify_seller_confirmed(self, trade_id: str, buyer_id: str, seller_id: str):
        """Notify when seller confirms payment received"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="seller_confirmed",
            stage="seller_confirmed",
            title="✅ Payment Confirmed",
            message="Seller confirmed receiving your payment.",
            action_required="Wait for seller to release crypto from escrow.",
            metadata={}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="seller_confirmed",
            stage="seller_confirmed",
            title="Payment Confirmed by You",
            message="You confirmed receiving payment from buyer.",
            action_required="Release crypto to buyer now by clicking 'Release Crypto' button.",
            metadata={}
        )
    
    async def notify_crypto_released(self, trade_id: str, buyer_id: str, seller_id: str, crypto_amount: float, crypto_currency: str, buyer_receives: float):
        """Notify when seller releases crypto from escrow"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="crypto_released",
            stage="completed",
            title="🎉 Trade Completed!",
            message=f"You received {buyer_receives} {crypto_currency} (after 1% fee). Trade completed successfully!",
            action_required="Check your wallet. Leave a review for the seller.",
            metadata={"crypto_amount": crypto_amount, "buyer_receives": buyer_receives, "crypto_currency": crypto_currency}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="crypto_released",
            stage="completed",
            title="✅ Crypto Released - Trade Complete",
            message=f"You released {buyer_receives} {crypto_currency} to buyer. 1% maker fee deducted.",
            action_required="Trade completed. Check your wallet balance and leave a review.",
            metadata={"crypto_amount": crypto_amount, "buyer_receives": buyer_receives, "crypto_currency": crypto_currency}
        )
    
    async def notify_dispute_opened(self, trade_id: str, opener_id: str, other_party_id: str, opener_role: str, reason: str):
        """Notify when dispute is opened"""
        
        # Notify Dispute Opener
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=opener_id,
            notification_type="dispute_opened",
            stage="disputed",
            title="⚠️ Dispute Opened",
            message=f"You opened a dispute. Reason: {reason}",
            action_required="Wait for admin review. Respond to admin messages promptly.",
            metadata={"reason": reason, "role": opener_role}
        )
        
        # Notify Other Party
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=other_party_id,
            notification_type="dispute_opened",
            stage="disputed",
            title="🚨 Dispute Opened Against This Trade",
            message=f"{opener_role.capitalize()} opened a dispute. Reason: {reason}",
            action_required="Provide evidence to admin. Respond to admin messages.",
            metadata={"reason": reason, "opener_role": opener_role}
        )
    
    async def notify_admin_message(self, trade_id: str, buyer_id: str, seller_id: str, admin_message: str):
        """Notify when admin sends message in dispute"""
        
        # Notify Both Parties
        for recipient_id in [buyer_id, seller_id]:
            await self.create_notification(
                trade_id=trade_id,
                recipient_id=recipient_id,
                notification_type="admin_message",
                stage="disputed",
                title="👮 Admin Message",
                message=f"Admin: {admin_message[:100]}...",
                action_required="Read admin message and respond if needed.",
                metadata={"admin_message": admin_message}
            )
    
    async def notify_dispute_resolved(self, trade_id: str, buyer_id: str, seller_id: str, resolution: str, winner: str):
        """Notify when dispute is resolved"""
        
        # Notify Buyer
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=buyer_id,
            notification_type="dispute_resolved",
            stage="dispute_resolved",
            title="Dispute Resolved",
            message=f"Admin resolved dispute in favor of: {winner}. Resolution: {resolution}",
            action_required="Trade is now closed. Check final outcome.",
            metadata={"resolution": resolution, "winner": winner}
        )
        
        # Notify Seller
        await self.create_notification(
            trade_id=trade_id,
            recipient_id=seller_id,
            notification_type="dispute_resolved",
            stage="dispute_resolved",
            title="Dispute Resolved",
            message=f"Admin resolved dispute in favor of: {winner}. Resolution: {resolution}",
            action_required="Trade is now closed. Check final outcome.",
            metadata={"resolution": resolution, "winner": winner}
        )
    
    async def notify_trade_cancelled(self, trade_id: str, buyer_id: str, seller_id: str, cancelled_by: str, reason: str):
        """Notify when trade is cancelled"""
        
        # Notify Both Parties
        for recipient_id, role in [(buyer_id, "buyer"), (seller_id, "seller")]:
            await self.create_notification(
                trade_id=trade_id,
                recipient_id=recipient_id,
                notification_type="trade_cancelled",
                stage="cancelled",
                title="❌ Trade Cancelled",
                message=f"Trade cancelled by {cancelled_by}. Reason: {reason}. Escrow funds returned.",
                action_required="Trade closed. No further action needed.",
                metadata={"cancelled_by": cancelled_by, "reason": reason, "role": role}
            )
    
    async def get_user_notifications(self, user_id: str, trade_id: Optional[str] = None, unread_only: bool = False, limit: int = 50) -> List[Dict]:
        """Get notifications for a user"""
        try:
            query = {"recipient_id": user_id}
            
            if trade_id:
                query["trade_id"] = trade_id
            
            if unread_only:
                query["read"] = False
            
            notifications = await self.collection.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            return notifications
        except Exception as e:
            logger.error(f"Failed to get notifications: {str(e)}")
            return []
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        try:
            result = await self.collection.update_one(
                {"notification_id": notification_id, "recipient_id": user_id},
                {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {str(e)}")
            return False
    
    async def mark_all_read(self, user_id: str, trade_id: Optional[str] = None) -> int:
        """Mark all notifications as read for a user"""
        try:
            query = {"recipient_id": user_id, "read": False}
            if trade_id:
                query["trade_id"] = trade_id
            
            result = await self.collection.update_many(
                query,
                {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Failed to mark all as read: {str(e)}")
            return 0
    
    async def get_unread_count(self, user_id: str, trade_id: Optional[str] = None) -> int:
        """Get count of unread notifications"""
        try:
            query = {"recipient_id": user_id, "read": False}
            if trade_id:
                query["trade_id"] = trade_id
            
            count = await self.collection.count_documents(query)
            return count
        except Exception as e:
            logger.error(f"Failed to get unread count: {str(e)}")
            return 0


# Global instance
_notification_service = None

def initialize_notification_service(db):
    """Initialize the notification service"""
    global _notification_service
    _notification_service = P2PNotificationService(db)
    logger.info("P2P Notification Service initialized")

def get_notification_service() -> P2PNotificationService:
    """Get the notification service instance"""
    if _notification_service is None:
        raise RuntimeError("Notification service not initialized. Call initialize_notification_service() first.")
    return _notification_service
