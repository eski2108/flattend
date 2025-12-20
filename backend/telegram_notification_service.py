"""
CoinHubX Telegram Notification Service

Comprehensive notification service handling:
- User notifications (personal trade/dispute alerts)
- Admin notifications (platform-wide dispute alerts)
- Audit logging for compliance
- Fallback to email on failure
- Notification preferences per user

Production-ready with full error handling.
"""

import os
import asyncio
import aiohttp
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

logger = logging.getLogger('coin_hub_x')

# Configuration
TELEGRAM_ADMIN_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_USER_BOT_TOKEN = os.environ.get('TELEGRAM_USER_BOT_TOKEN')
ADMIN_TELEGRAM_CHAT_ID = os.environ.get('ADMIN_TELEGRAM_CHAT_ID')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://coinhubx.net')
HIGH_VALUE_THRESHOLD_GBP = float(os.environ.get('HIGH_VALUE_DISPUTE_THRESHOLD', 1000))


class TelegramNotificationService:
    """
    Unified Telegram Notification Service
    
    Handles both admin alerts and user notifications
    with audit logging and email fallback.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.admin_bot_token = TELEGRAM_ADMIN_BOT_TOKEN
        self.user_bot_token = TELEGRAM_USER_BOT_TOKEN
        self.admin_chat_id = ADMIN_TELEGRAM_CHAT_ID
        self.frontend_url = FRONTEND_URL
        
        self.admin_enabled = bool(self.admin_bot_token and self.admin_chat_id)
        self.user_enabled = bool(self.user_bot_token)
        
        if not self.admin_enabled:
            logger.warning("⚠️ Admin Telegram alerts disabled")
        if not self.user_enabled:
            logger.warning("⚠️ User Telegram alerts disabled")
        
        logger.info(f"✅ Telegram Notification Service initialized (Admin: {self.admin_enabled}, User: {self.user_enabled})")
    
    def set_db(self, db):
        """Set database reference"""
        self.db = db
    
    # ==================== CORE SEND METHODS ====================
    
    async def _send_admin_message(self, text: str, reply_markup: Dict = None) -> bool:
        """Send message to admin group"""
        if not self.admin_enabled:
            return False
        return await self._send_telegram_message(
            self.admin_bot_token, 
            self.admin_chat_id, 
            text, 
            reply_markup
        )
    
    async def _send_user_message(self, chat_id: str, text: str, reply_markup: Dict = None) -> bool:
        """Send message to a user"""
        if not self.user_enabled or not chat_id:
            return False
        return await self._send_telegram_message(
            self.user_bot_token, 
            chat_id, 
            text, 
            reply_markup
        )
    
    async def _send_telegram_message(self, bot_token: str, chat_id: str, text: str, 
                                      reply_markup: Dict = None) -> bool:
        """Core Telegram send method"""
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }
            
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        return True
                    else:
                        result = await response.text()
                        logger.error(f"❌ Telegram send error: {response.status} - {result}")
                        return False
                        
        except asyncio.TimeoutError:
            logger.warning("⚠️ Telegram timeout")
            return False
        except Exception as e:
            logger.error(f"❌ Telegram error: {str(e)}")
            return False
    
    # ==================== USER PREFERENCES ====================
    
    async def get_user_telegram_settings(self, user_id: str) -> Dict:
        """Get user's Telegram notification settings"""
        if self.db is None:
            return {"telegram_enabled": True, "telegram_disputes_enabled": True}
        
        try:
            user = await self.db.users.find_one(
                {"user_id": user_id},
                {"telegram_chat_id": 1, "telegram_enabled": 1, "telegram_disputes_enabled": 1}
            )
            
            if not user:
                return {"telegram_enabled": False, "telegram_disputes_enabled": False, "chat_id": None}
            
            return {
                "chat_id": user.get("telegram_chat_id"),
                "telegram_enabled": user.get("telegram_enabled", True),  # Default to True
                "telegram_disputes_enabled": user.get("telegram_disputes_enabled", True)  # Default to True
            }
        except Exception as e:
            logger.error(f"Error getting telegram settings: {str(e)}")
            return {"telegram_enabled": True, "telegram_disputes_enabled": True, "chat_id": None}
    
    async def can_send_to_user(self, user_id: str, notification_type: str = "general") -> tuple:
        """
        Check if we can send Telegram to this user
        Returns (can_send: bool, chat_id: str or None)
        """
        settings = await self.get_user_telegram_settings(user_id)
        chat_id = settings.get("chat_id")
        
        if not chat_id:
            return False, None
        
        if not settings.get("telegram_enabled", True):
            return False, None
        
        if notification_type == "dispute" and not settings.get("telegram_disputes_enabled", True):
            return False, None
        
        return True, chat_id
    
    # ==================== AUDIT LOGGING ====================
    
    async def log_notification(self, event_type: str, user_id: str = None, 
                                trade_id: str = None, dispute_id: str = None,
                                telegram_chat_id: str = None, success: bool = True,
                                failure_reason: str = None, fallback_used: str = None) -> None:
        """Log all Telegram notifications for compliance"""
        if self.db is None:
            return
        
        try:
            log_entry = {
                "log_id": str(uuid.uuid4()),
                "event_type": event_type,
                "user_id": user_id,
                "trade_id": trade_id,
                "dispute_id": dispute_id,
                "telegram_chat_id": telegram_chat_id,
                "success": success,
                "failure_reason": failure_reason,
                "fallback_used": fallback_used,
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.telegram_notification_logs.insert_one(log_entry)
            
        except Exception as e:
            logger.error(f"Failed to log telegram notification: {str(e)}")
    
    # ==================== EMAIL FALLBACK ====================
    
    async def send_email_fallback(self, user_id: str, subject: str, content: str) -> bool:
        """Send email as fallback when Telegram fails"""
        try:
            # Import email service
            from email_service import send_email_notification
            
            # Get user email
            if self.db is None:
                return False
            
            user = await self.db.users.find_one({"user_id": user_id}, {"email": 1})
            if not user or not user.get("email"):
                return False
            
            # Send email
            await send_email_notification(
                to_email=user["email"],
                subject=subject,
                html_content=content
            )
            
            logger.info(f"✅ Email fallback sent to {user['email']}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Email fallback failed: {str(e)}")
            return False
    
    # ==================== INLINE BUTTONS ====================
    
    def _create_buttons(self, buttons: List[Dict]) -> Dict:
        """
        Create inline keyboard buttons
        Each button: {"text": "...", "url": "..."}
        """
        return {
            "inline_keyboard": [[btn] for btn in buttons]
        }
    
    def _dispute_buttons(self, dispute_id: str, trade_id: str = None) -> Dict:
        """Standard buttons for dispute notifications"""
        buttons = [
            {"text": "🔍 Open Dispute", "url": f"{self.frontend_url}/email/dispute/{dispute_id}"},
        ]
        if trade_id:
            buttons.append({"text": "📱 View Trade", "url": f"{self.frontend_url}/p2p/trade/{trade_id}"})
        buttons.append({"text": "🌐 Open in Browser", "url": f"{self.frontend_url}/telegram-redirect?to=/email/dispute/{dispute_id}"})
        return self._create_buttons(buttons)
    
    def _admin_dispute_buttons(self, dispute_id: str) -> Dict:
        """Admin buttons for dispute resolution"""
        return self._create_buttons([
            {"text": "⚡ Resolve Dispute", "url": f"{self.frontend_url}/email/dispute/{dispute_id}"},
            {"text": "🌐 Open in Chrome/Safari", "url": f"{self.frontend_url}/telegram-redirect?to=/email/dispute/{dispute_id}"}
        ])
    
    # ==================== DISPUTE ALERTS - USER ====================
    
    async def notify_user_dispute_raised(self, trade: Dict, dispute: Dict, 
                                          user_id: str, role: str) -> bool:
        """
        Notify user that a dispute was raised on their trade
        role: 'buyer' or 'seller'
        """
        can_send, chat_id = await self.can_send_to_user(user_id, "dispute")
        
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        reason = dispute.get("reason", "unknown").replace("_", " ").title()
        initiated_by = dispute.get("initiated_by", "other party")
        
        # Get counterparty info
        buyer_username = trade.get("buyer_username", "Buyer")
        seller_username = trade.get("seller_username", "Seller")
        
        if initiated_by == role:
            who = "You opened this dispute"
            emoji = "📋"
        else:
            who = f"Opened by {'buyer' if initiated_by == 'buyer' else 'seller'}"
            emoji = "🚨"
        
        message = f"""
{emoji} <b>DISPUTE RAISED</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Amount:</b> {crypto_amount} {crypto} (£{fiat_amount:,.2f} {fiat})
<b>Buyer:</b> @{buyer_username}
<b>Seller:</b> @{seller_username}
<b>Reason:</b> {reason}
<b>Status:</b> {who}

⚠️ <i>Funds are frozen until resolved. Provide evidence if needed.</i>
"""
        
        buttons = self._dispute_buttons(dispute_id, trade_id)
        
        if can_send:
            success = await self._send_user_message(chat_id, message.strip(), buttons)
            
            # Log the notification
            await self.log_notification(
                event_type="dispute_raised",
                user_id=user_id,
                trade_id=trade_id,
                dispute_id=dispute_id,
                telegram_chat_id=chat_id,
                success=success
            )
            
            # Fallback to email if failed
            if not success:
                email_sent = await self.send_email_fallback(
                    user_id,
                    f"🚨 Dispute Raised - Trade {trade_id}",
                    f"<p>A dispute has been raised on your trade.</p><p>Dispute ID: {dispute_id}</p><p><a href='{self.frontend_url}/email/dispute/{dispute_id}'>View Dispute</a></p>"
                )
                await self.log_notification(
                    event_type="dispute_raised",
                    user_id=user_id,
                    trade_id=trade_id,
                    dispute_id=dispute_id,
                    telegram_chat_id=chat_id,
                    success=False,
                    failure_reason="Telegram delivery failed",
                    fallback_used="email" if email_sent else None
                )
            
            return success
        else:
            # No Telegram - send email
            await self.send_email_fallback(
                user_id,
                f"🚨 Dispute Raised - Trade {trade_id}",
                f"<p>A dispute has been raised on your trade.</p><p>Dispute ID: {dispute_id}</p><p><a href='{self.frontend_url}/email/dispute/{dispute_id}'>View Dispute</a></p>"
            )
            await self.log_notification(
                event_type="dispute_raised",
                user_id=user_id,
                trade_id=trade_id,
                dispute_id=dispute_id,
                success=False,
                failure_reason="No Telegram linked",
                fallback_used="email"
            )
            return False
    
    async def notify_user_dispute_status_changed(self, trade: Dict, dispute: Dict,
                                                   user_id: str, new_status: str,
                                                   details: str = "") -> bool:
        """
        Notify user that dispute status changed
        """
        can_send, chat_id = await self.can_send_to_user(user_id, "dispute")
        
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        
        status_emoji = {
            "under_review": "🔍",
            "awaiting_evidence": "📎",
            "escalated": "⚠️",
            "pending_resolution": "⏳"
        }.get(new_status, "📋")
        
        message = f"""
{status_emoji} <b>Dispute Status Update</b>

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>New Status:</b> {new_status.replace('_', ' ').title()}
{f'<b>Details:</b> {details}' if details else ''}

<i>Check the dispute panel for more information.</i>
"""
        
        buttons = self._dispute_buttons(dispute_id, trade_id)
        
        if can_send:
            success = await self._send_user_message(chat_id, message.strip(), buttons)
            await self.log_notification(
                event_type="dispute_status_changed",
                user_id=user_id,
                trade_id=trade_id,
                dispute_id=dispute_id,
                telegram_chat_id=chat_id,
                success=success
            )
            return success
        return False
    
    async def notify_user_dispute_resolved(self, trade: Dict, dispute: Dict,
                                            user_id: str, role: str) -> bool:
        """
        Notify user that dispute was resolved
        """
        can_send, chat_id = await self.can_send_to_user(user_id, "dispute")
        
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        
        winner = dispute.get("winner", "unknown")
        resolution = dispute.get("resolution", "unknown").replace("_", " ").title()
        
        if winner == role:
            emoji = "🎉"
            outcome = "<b>You WON</b> the dispute!"
            funds_msg = f"✅ {crypto_amount} {crypto} has been credited to your wallet."
        else:
            emoji = "😔"
            outcome = "You <b>lost</b> the dispute."
            funds_msg = f"The {crypto_amount} {crypto} has been released to the other party."
        
        message = f"""
{emoji} <b>DISPUTE RESOLVED</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Amount:</b> {crypto_amount} {crypto} (£{fiat_amount:,.2f} {fiat})
<b>Resolution:</b> {resolution}
<b>Outcome:</b> {outcome}

{funds_msg}
"""
        
        if can_send:
            success = await self._send_user_message(chat_id, message.strip())
            
            await self.log_notification(
                event_type="dispute_resolved",
                user_id=user_id,
                trade_id=trade_id,
                dispute_id=dispute_id,
                telegram_chat_id=chat_id,
                success=success
            )
            
            if not success:
                await self.send_email_fallback(
                    user_id,
                    f"Dispute Resolved - {outcome}",
                    f"<p>Your dispute has been resolved.</p><p>{funds_msg}</p>"
                )
            
            return success
        else:
            await self.send_email_fallback(
                user_id,
                f"Dispute Resolved - Trade {trade_id}",
                f"<p>Your dispute has been resolved.</p><p>Resolution: {resolution}</p>"
            )
            return False
    
    # ==================== DISPUTE ALERTS - ADMIN ====================
    
    async def alert_admin_dispute_created(self, trade: Dict, dispute: Dict) -> bool:
        """
        Alert admin group about new dispute
        """
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        reason = dispute.get("reason", "unknown").replace("_", " ").title()
        initiated_by = dispute.get("initiated_by", "unknown").title()
        
        buyer_username = trade.get("buyer_username", "Unknown")
        seller_username = trade.get("seller_username", "Unknown")
        
        # High value check
        is_high_value = fiat_amount >= HIGH_VALUE_THRESHOLD_GBP
        priority = "🔴 HIGH VALUE" if is_high_value else ""
        
        message = f"""
🚨🚨🚨 <b>DISPUTE OPENED</b> {priority}

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> {crypto_amount} {crypto}
<b>Value:</b> <b>£{fiat_amount:,.2f} {fiat}</b>
<b>Buyer:</b> @{buyer_username}
<b>Seller:</b> @{seller_username}
<b>Reason:</b> {reason}
<b>Initiated by:</b> {initiated_by}

⚡ <i>Action required - resolve this dispute.</i>
"""
        
        buttons = self._admin_dispute_buttons(dispute_id)
        success = await self._send_admin_message(message.strip(), buttons)
        
        await self.log_notification(
            event_type="admin_dispute_created",
            dispute_id=dispute_id,
            trade_id=trade_id,
            telegram_chat_id=self.admin_chat_id,
            success=success
        )
        
        return success
    
    async def alert_admin_dispute_resolved(self, trade: Dict, dispute: Dict, 
                                            admin_id: str) -> bool:
        """
        Confirm to admin group that dispute was resolved
        """
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        winner = dispute.get("winner", "unknown").title()
        resolution = dispute.get("resolution", "unknown").replace("_", " ").title()
        
        emoji = "✅" if "buyer" in resolution.lower() else "↩️"
        
        message = f"""
{emoji} <b>DISPUTE RESOLVED</b>

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> {crypto_amount} {crypto}
<b>Resolution:</b> {resolution}
<b>Winner:</b> {winner}
<b>Resolved by:</b> {admin_id}
"""
        
        success = await self._send_admin_message(message.strip())
        
        await self.log_notification(
            event_type="admin_dispute_resolved",
            dispute_id=dispute_id,
            trade_id=trade_id,
            telegram_chat_id=self.admin_chat_id,
            success=success
        )
        
        return success
    
    # ==================== TRADE ALERTS - USER ====================
    
    async def notify_user_trade_created(self, trade: Dict, user_id: str, role: str) -> bool:
        """Notify user about new trade"""
        can_send, chat_id = await self.can_send_to_user(user_id)
        if not can_send:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        
        if role == "buyer":
            emoji = "🛒"
            action = "BUYING"
            next_step = "Send payment and mark as paid."
        else:
            emoji = "💰"
            action = "SELLING"
            next_step = "Your crypto is in escrow. Wait for payment."
        
        message = f"""
{emoji} <b>P2P Trade Created</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>You are:</b> {action}
<b>Amount:</b> {crypto_amount} {crypto}
<b>Price:</b> £{fiat_amount:,.2f} {fiat}

📋 <i>{next_step}</i>
"""
        
        buttons = self._create_buttons([
            {"text": "📱 Open Trade", "url": f"{self.frontend_url}/p2p/trade/{trade_id}"}
        ])
        
        success = await self._send_user_message(chat_id, message.strip(), buttons)
        
        await self.log_notification(
            event_type="trade_created",
            user_id=user_id,
            trade_id=trade_id,
            telegram_chat_id=chat_id,
            success=success
        )
        
        return success
    
    async def notify_user_payment_marked(self, trade: Dict, user_id: str, role: str) -> bool:
        """Notify that payment was marked as sent"""
        can_send, chat_id = await self.can_send_to_user(user_id)
        if not can_send:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        
        if role == "buyer":
            message = f"""
✅ <b>Payment Marked as Sent</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> £{fiat_amount:,.2f} {fiat}

⏳ Waiting for seller to confirm and release crypto.
"""
        else:
            message = f"""
💸 <b>Buyer Marked Payment Sent!</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> £{fiat_amount:,.2f} {fiat}

⚠️ <b>Check your bank!</b> If payment received, release the crypto.
"""
        
        buttons = self._create_buttons([
            {"text": "📱 Open Trade", "url": f"{self.frontend_url}/p2p/trade/{trade_id}"}
        ])
        
        return await self._send_user_message(chat_id, message.strip(), buttons)
    
    async def notify_user_trade_completed(self, trade: Dict, user_id: str, role: str) -> bool:
        """Notify that trade completed successfully"""
        can_send, chat_id = await self.can_send_to_user(user_id)
        if not can_send:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        
        if role == "buyer":
            message = f"""
🎉 <b>Trade Completed!</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>You received:</b> {crypto_amount} {crypto}
<b>You paid:</b> £{fiat_amount:,.2f} {fiat}

✅ Crypto credited to your wallet!
"""
        else:
            message = f"""
🎉 <b>Trade Completed!</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>You sold:</b> {crypto_amount} {crypto}
<b>You received:</b> £{fiat_amount:,.2f} {fiat}

✅ Funds released from escrow.
"""
        
        return await self._send_user_message(chat_id, message.strip())


# Singleton
_notification_service = None

def get_telegram_notification_service(db=None) -> TelegramNotificationService:
    """Get or create notification service singleton"""
    global _notification_service
    if _notification_service is None:
        _notification_service = TelegramNotificationService(db)
    elif db is not None and _notification_service.db is None:
        _notification_service.set_db(db)
    return _notification_service
