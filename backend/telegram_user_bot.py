"""
CoinHubX User Telegram Bot

Handles user notifications for:
- P2P Trade lifecycle (created, escrow, payment, completion)
- Trade timers and auto-cancel warnings
- Dispute alerts and updates
- Deep links to trades

Separate from admin bot for security isolation.
"""

import os
import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

logger = logging.getLogger('coin_hub_x')

# Configuration
TELEGRAM_USER_BOT_TOKEN = os.environ.get('TELEGRAM_USER_BOT_TOKEN')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://coinhubx.net')


class TelegramUserBot:
    """
    Telegram Bot for CoinHubX Users
    
    - Messages users privately
    - Sends P2P trade + escrow + dispute updates
    - No admin powers
    """
    
    def __init__(self, db=None):
        self.bot_token = TELEGRAM_USER_BOT_TOKEN
        self.frontend_url = FRONTEND_URL
        self.enabled = bool(self.bot_token)
        self.db = db
        
        if not self.enabled:
            logger.warning("⚠️ User Telegram Bot disabled - missing TELEGRAM_USER_BOT_TOKEN")
        else:
            logger.info("✅ User Telegram Bot initialized")
    
    def set_db(self, db):
        """Set database reference"""
        self.db = db
    
    async def _send_message(self, chat_id: str, text: str, parse_mode: str = "HTML", 
                           reply_markup: Dict = None) -> bool:
        """
        Send message to a user's Telegram
        """
        if not self.enabled or not chat_id:
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode,
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
                        logger.error(f"❌ User bot send error: {response.status} - {result}")
                        return False
                        
        except asyncio.TimeoutError:
            logger.warning("⚠️ User bot timeout")
            return False
        except Exception as e:
            logger.error(f"❌ User bot error: {str(e)}")
            return False
    
    async def get_user_telegram_id(self, user_id: str) -> Optional[str]:
        """
        Get user's linked Telegram chat ID from database
        """
        if not self.db:
            return None
        
        try:
            user = await self.db.users.find_one({"user_id": user_id}, {"telegram_chat_id": 1})
            if user:
                return user.get("telegram_chat_id")
        except Exception as e:
            logger.error(f"❌ Error getting telegram_chat_id for {user_id}: {str(e)}")
        
        return None
    
    def _deep_link(self, path: str) -> str:
        """Generate deep link URL"""
        return f"{self.frontend_url}{path}"
    
    def _inline_button(self, text: str, url: str) -> Dict:
        """Create inline keyboard button"""
        return {
            "inline_keyboard": [[{"text": text, "url": url}]]
        }
    
    def _multi_buttons(self, buttons: list) -> Dict:
        """Create multiple inline keyboard buttons"""
        return {
            "inline_keyboard": [[btn] for btn in buttons]
        }
    
    # ==================== P2P TRADE ALERTS ====================
    
    async def notify_trade_created(self, trade: Dict, role: str, user_id: str) -> bool:
        """
        Alert: P2P Trade created
        role: 'buyer' or 'seller'
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        time_limit = trade.get("time_limit_minutes", 30)
        
        if role == "buyer":
            emoji = "🛒"
            action = "You are BUYING"
            next_step = "Send payment to the seller and mark as paid."
        else:
            emoji = "💰"
            action = "You are SELLING"
            next_step = "Your crypto is now in escrow. Wait for buyer's payment."
        
        message = f"""
{emoji} <b>P2P Trade Created</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Role:</b> {action}
<b>Amount:</b> {crypto_amount} {crypto}
<b>Price:</b> £{fiat_amount:,.2f} {fiat}
<b>Time Limit:</b> {time_limit} minutes

📋 <i>{next_step}</i>
"""
        
        buttons = self._inline_button("📱 Open Trade", self._deep_link(f"/p2p/trade/{trade_id}"))
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_escrow_locked(self, trade: Dict, user_id: str) -> bool:
        """
        Alert: Seller's crypto locked in escrow
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        
        message = f"""
🔒 <b>Escrow Locked</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount Locked:</b> {crypto_amount} {crypto}

✅ Crypto is now secure in escrow.
Buyer can proceed with payment.
"""
        
        buttons = self._inline_button("📱 View Trade", self._deep_link(f"/p2p/trade/{trade_id}"))
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_payment_marked(self, trade: Dict, user_id: str, role: str) -> bool:
        """
        Alert: Buyer marked payment as sent
        role: who is receiving this notification (buyer/seller)
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        fiat_amount = trade.get("fiat_amount", 0)
        fiat = trade.get("fiat_currency", "GBP")
        
        if role == "buyer":
            message = f"""
✅ <b>Payment Marked as Sent</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> £{fiat_amount:,.2f} {fiat}

⏳ Waiting for seller to confirm receipt and release crypto.
"""
        else:  # seller
            message = f"""
💸 <b>Buyer Marked Payment Sent</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> £{fiat_amount:,.2f} {fiat}

⚠️ <b>Action Required:</b> Check your bank/payment method.
If payment received, release the crypto.
"""
        
        buttons = self._inline_button("📱 Open Trade", self._deep_link(f"/p2p/trade/{trade_id}"))
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_payment_confirmed(self, trade: Dict, user_id: str, role: str) -> bool:
        """
        Alert: Seller confirmed payment and released crypto
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
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
<b>You Received:</b> {crypto_amount} {crypto}
<b>You Paid:</b> £{fiat_amount:,.2f} {fiat}

✅ Crypto has been credited to your wallet!
"""
        else:  # seller
            message = f"""
🎉 <b>Trade Completed!</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>You Sold:</b> {crypto_amount} {crypto}
<b>You Received:</b> £{fiat_amount:,.2f} {fiat}

✅ Trade successful. Funds released from escrow.
"""
        
        buttons = self._inline_button("📊 View History", self._deep_link("/p2p/history"))
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_trade_cancelled(self, trade: Dict, user_id: str, reason: str = "Trade cancelled") -> bool:
        """
        Alert: Trade cancelled
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        
        message = f"""
❌ <b>Trade Cancelled</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> {crypto_amount} {crypto}
<b>Reason:</b> {reason}

Escrow has been released back to seller.
"""
        
        return await self._send_message(chat_id, message.strip())
    
    # ==================== TIMER WARNINGS ====================
    
    async def notify_timer_warning(self, trade: Dict, user_id: str, minutes_left: int) -> bool:
        """
        Alert: Trade timer warning (15m, 5m, 1m left)
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        
        if minutes_left <= 1:
            urgency = "🚨🚨🚨"
            time_text = "<b>LESS THAN 1 MINUTE</b>"
        elif minutes_left <= 5:
            urgency = "🚨🚨"
            time_text = f"<b>{minutes_left} MINUTES</b>"
        else:
            urgency = "⚠️"
            time_text = f"{minutes_left} minutes"
        
        message = f"""
{urgency} <b>Trade Timer Warning</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Time Remaining:</b> {time_text}

⏰ Complete the trade before time runs out or it will be auto-cancelled!
"""
        
        buttons = self._inline_button("📱 Open Trade NOW", self._deep_link(f"/p2p/trade/{trade_id}"))
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_trade_expired(self, trade: Dict, user_id: str) -> bool:
        """
        Alert: Trade auto-cancelled due to timeout
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        
        message = f"""
⏰ <b>Trade Expired</b>

<b>Trade ID:</b> <code>{trade_id}</code>

This trade has been automatically cancelled due to timeout.
No funds have been transferred.
"""
        
        return await self._send_message(chat_id, message.strip())
    
    # ==================== DISPUTE ALERTS ====================
    
    async def notify_dispute_opened(self, trade: Dict, dispute: Dict, user_id: str, role: str) -> bool:
        """
        Alert: Dispute opened on trade
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        reason = dispute.get("reason", "Unknown").replace("_", " ").title()
        initiated_by = dispute.get("initiated_by", "other party")
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        
        if initiated_by == role:
            who = "You opened"
        else:
            who = "The other party opened"
        
        message = f"""
🚨 <b>Dispute Opened</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Amount at Stake:</b> {crypto_amount} {crypto}
<b>Reason:</b> {reason}
<b>Opened by:</b> {who}

📎 <b>What you need to do:</b>
• Provide evidence (screenshots, receipts)
• Respond to admin questions
• Check updates regularly

Funds are frozen until resolved.
"""
        
        buttons = self._multi_buttons([
            {"text": "📱 View Dispute", "url": self._deep_link(f"/p2p/dispute/{dispute_id}")},
            {"text": "📎 Upload Evidence", "url": self._deep_link(f"/p2p/dispute/{dispute_id}/evidence")}
        ])
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_dispute_update(self, dispute: Dict, user_id: str, update_type: str, details: str = "") -> bool:
        """
        Alert: Dispute status update
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        dispute_id = dispute.get("dispute_id", "N/A")
        
        message = f"""
📋 <b>Dispute Update</b>

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Update:</b> {update_type}
{f'<b>Details:</b> {details}' if details else ''}
"""
        
        buttons = self._inline_button("📱 View Dispute", self._deep_link(f"/p2p/dispute/{dispute_id}"))
        return await self._send_message(chat_id, message.strip(), reply_markup=buttons)
    
    async def notify_dispute_resolved(self, trade: Dict, dispute: Dict, user_id: str, role: str) -> bool:
        """
        Alert: Dispute resolved - final outcome
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        trade_id = trade.get("trade_id", "N/A")
        dispute_id = dispute.get("dispute_id", "N/A")
        winner = dispute.get("winner", "unknown")
        resolution = dispute.get("resolution", "unknown").replace("_", " ").title()
        crypto_amount = trade.get("crypto_amount", 0)
        crypto = trade.get("crypto_currency", "BTC")
        fee = dispute.get("dispute_fee_charged", 5)
        
        if winner == role:
            emoji = "🎉"
            outcome = "You WON the dispute"
            funds_msg = f"✅ {crypto_amount} {crypto} has been credited to your wallet."
            fee_msg = ""
        else:
            emoji = "😔"
            outcome = "You LOST the dispute"
            funds_msg = f"The {crypto_amount} {crypto} has been released to the other party."
            fee_msg = f"\n💸 A £{fee} dispute fee has been charged."
        
        message = f"""
{emoji} <b>Dispute Resolved</b>

<b>Trade ID:</b> <code>{trade_id}</code>
<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Resolution:</b> {resolution}
<b>Outcome:</b> {outcome}

{funds_msg}{fee_msg}
"""
        
        return await self._send_message(chat_id, message.strip())
    
    async def notify_evidence_received(self, dispute: Dict, user_id: str) -> bool:
        """
        Alert: Evidence submission confirmed
        """
        chat_id = await self.get_user_telegram_id(user_id)
        if not chat_id:
            return False
        
        dispute_id = dispute.get("dispute_id", "N/A")
        
        message = f"""
✅ <b>Evidence Received</b>

<b>Dispute ID:</b> <code>{dispute_id}</code>

Your evidence has been submitted and will be reviewed by our team.
"""
        
        return await self._send_message(chat_id, message.strip())


# Singleton instance
_user_bot = None

def get_user_telegram_bot(db=None) -> TelegramUserBot:
    """Get or create User Telegram Bot singleton"""
    global _user_bot
    if _user_bot is None:
        _user_bot = TelegramUserBot(db)
    elif db and not _user_bot.db:
        _user_bot.set_db(db)
    return _user_bot
