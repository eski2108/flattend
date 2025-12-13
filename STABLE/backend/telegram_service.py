import os
import aiohttp
import logging
from typing import Optional

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_ADMIN_CHAT_ID', '')

class TelegramService:
    def __init__(self):
        self.bot_token = TELEGRAM_BOT_TOKEN
        self.chat_id = TELEGRAM_CHAT_ID
        self.enabled = bool(self.bot_token and self.chat_id)
        
        if not self.enabled:
            logger.warning("⚠️ Telegram notifications disabled - missing BOT_TOKEN or CHAT_ID")
    
    async def send_message(self, message: str, parse_mode: str = 'HTML') -> bool:
        """Send message to Telegram admin group"""
        if not self.enabled:
            logger.debug(f"Telegram disabled, would send: {message}")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json={
                    'chat_id': self.chat_id,
                    'text': message,
                    'parse_mode': parse_mode
                }) as response:
                    if response.status == 200:
                        logger.info("✅ Telegram notification sent")
                        return True
                    else:
                        logger.error(f"❌ Telegram API error: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"❌ Telegram send error: {str(e)}")
            return False
    
    async def notify_new_p2p_trade(self, trade_data: dict):
        """Notify about new P2P trade"""
        message = f"""
🆕 <b>New P2P Trade</b>

💰 Amount: {trade_data.get('crypto_amount')} {trade_data.get('crypto_currency')}
💵 Value: £{trade_data.get('fiat_amount')}
👤 Buyer: {trade_data.get('buyer_id')}
👤 Seller: {trade_data.get('seller_id')}
🆔 Trade ID: {trade_data.get('trade_id')}
⏰ Status: {trade_data.get('status')}
"""
        await self.send_message(message)
    
    async def notify_dispute_opened(self, dispute_data: dict):
        """Notify about new dispute"""
        message = f"""
🚨 <b>NEW DISPUTE OPENED</b>

⚠️ Reason: {dispute_data.get('reason')}
🆔 Trade ID: {dispute_data.get('trade_id')}
👤 Initiated by: {dispute_data.get('initiated_by')}
📝 Description: {dispute_data.get('description', 'N/A')}

⚡ <b>ACTION REQUIRED</b>
"""
        await self.send_message(message)
    
    async def notify_dispute_resolved(self, dispute_data: dict):
        """Notify about resolved dispute"""
        message = f"""
✅ <b>Dispute Resolved</b>

🆔 Dispute ID: {dispute_data.get('dispute_id')}
🏆 Winner: {dispute_data.get('winner')}
📝 Resolution: {dispute_data.get('resolution')}
👨‍💼 Resolved by: {dispute_data.get('resolved_by')}
"""
        await self.send_message(message)
    
    async def notify_high_value_trade(self, trade_data: dict):
        """Notify about high-value trades (>£5000)"""
        message = f"""
💎 <b>HIGH VALUE TRADE</b>

💰 Amount: {trade_data.get('crypto_amount')} {trade_data.get('crypto_currency')}
💵 Value: £{trade_data.get('fiat_amount')}
🆔 Trade ID: {trade_data.get('trade_id')}
⚠️ Monitor closely
"""
        await self.send_message(message)
    
    async def notify_payment_timeout(self, trade_data: dict):
        """Notify about payment timeout"""
        message = f"""
⏰ <b>Payment Timeout</b>

🆔 Trade ID: {trade_data.get('trade_id')}
⚠️ Status: Auto-cancelled due to timeout
💰 Amount: {trade_data.get('crypto_amount')} {trade_data.get('crypto_currency')}
"""
        await self.send_message(message)
    
    async def notify_suspicious_activity(self, activity_data: dict):
        """Notify about suspicious activity"""
        message = f"""
🔴 <b>SUSPICIOUS ACTIVITY DETECTED</b>

⚠️ Type: {activity_data.get('type')}
👤 User: {activity_data.get('user_id')}
📝 Details: {activity_data.get('details')}
🕐 Time: {activity_data.get('timestamp')}

⚡ <b>REVIEW IMMEDIATELY</b>
"""
        await self.send_message(message)

# Global instance
telegram_service = TelegramService()
