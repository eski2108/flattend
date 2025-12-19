"""
Telegram Alert Service for CoinHubX P2P Disputes

Sends real-time alerts to private admin group for:
- New disputes created
- Auto-escalated disputes
- High-value disputes
"""

import os
import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

logger = logging.getLogger('coin_hub_x')

# Configuration
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
ADMIN_TELEGRAM_CHAT_ID = os.environ.get('ADMIN_TELEGRAM_CHAT_ID')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://coinhubx.net')

# High-value threshold (configurable)
HIGH_VALUE_THRESHOLD_GBP = float(os.environ.get('HIGH_VALUE_DISPUTE_THRESHOLD', 1000))


class TelegramAlertService:
    """
    Telegram Bot Alert Service for P2P Disputes
    
    Sends alerts to private admin group only.
    Fails silently to not block core flows.
    """
    
    def __init__(self):
        self.bot_token = TELEGRAM_BOT_TOKEN
        self.chat_id = ADMIN_TELEGRAM_CHAT_ID
        self.frontend_url = FRONTEND_URL
        self.enabled = bool(self.bot_token and self.chat_id)
        
        if not self.enabled:
            logger.warning("⚠️ Telegram alerts disabled - missing TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_CHAT_ID")
        else:
            logger.info(f"✅ Telegram Alert Service initialized - Chat ID: {self.chat_id}")
    
    async def _send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """
        Send message to admin Telegram group
        Fails silently to not block core flows
        """
        if not self.enabled:
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": False
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        logger.info(f"✅ Telegram alert sent successfully")
                        return True
                    else:
                        result = await response.text()
                        logger.error(f"❌ Telegram API error: {response.status} - {result}")
                        return False
                        
        except asyncio.TimeoutError:
            logger.warning("⚠️ Telegram alert timeout - continuing without blocking")
            return False
        except Exception as e:
            logger.error(f"❌ Telegram alert failed: {str(e)}")
            return False
    
    async def alert_dispute_created(
        self,
        dispute_id: str,
        trade_id: str,
        amount: float,
        currency: str,
        fiat_amount: float,
        fiat_currency: str,
        reason: str,
        initiated_by: str
    ) -> bool:
        """
        Alert: New P2P dispute created
        """
        # Check if high value
        is_high_value = fiat_amount >= HIGH_VALUE_THRESHOLD_GBP
        priority = "🔴 HIGH PRIORITY" if is_high_value else ""
        
        message = f"""
🚨 <b>New P2P Dispute Created</b> {priority}

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> {amount} {currency} (£{fiat_amount:,.2f} {fiat_currency})
<b>Reason:</b> {reason.replace('_', ' ').title()}
<b>Initiated by:</b> {initiated_by.title()}

👉 <a href="{self.frontend_url}/email/dispute/{dispute_id}">Open Dispute Panel</a>
"""
        
        return await self._send_message(message.strip())
    
    async def alert_dispute_escalated(
        self,
        dispute_id: str,
        trade_id: str,
        amount: float,
        currency: str,
        fiat_amount: float,
        fiat_currency: str,
        hours_open: int
    ) -> bool:
        """
        Alert: Dispute auto-escalated due to timeout/no action
        """
        message = f"""
⚠️ <b>Dispute Auto-Escalated</b>

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> {amount} {currency} (£{fiat_amount:,.2f} {fiat_currency})
<b>Open for:</b> {hours_open} hours (no resolution)

⏰ <i>This dispute has been waiting too long. Please resolve ASAP.</i>

👉 <a href="{self.frontend_url}/email/dispute/{dispute_id}">Resolve Now</a>
"""
        
        return await self._send_message(message.strip())
    
    async def alert_high_value_dispute(
        self,
        dispute_id: str,
        trade_id: str,
        amount: float,
        currency: str,
        fiat_amount: float,
        fiat_currency: str,
        reason: str
    ) -> bool:
        """
        Alert: High-value dispute (above threshold)
        """
        message = f"""
🔴 <b>HIGH VALUE DISPUTE ALERT</b> 🔴

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>Amount:</b> {amount} {currency}
<b>Value:</b> <b>£{fiat_amount:,.2f} {fiat_currency}</b>
<b>Reason:</b> {reason.replace('_', ' ').title()}

💰 <i>This dispute exceeds £{HIGH_VALUE_THRESHOLD_GBP:,.0f} threshold.</i>

👉 <a href="{self.frontend_url}/email/dispute/{dispute_id}">Handle Immediately</a>
"""
        
        return await self._send_message(message.strip())
    
    async def alert_dispute_resolved(
        self,
        dispute_id: str,
        trade_id: str,
        resolution: str,
        winner: str,
        amount: float,
        currency: str,
        admin_id: str
    ) -> bool:
        """
        Alert: Dispute resolved (confirmation)
        """
        emoji = "✅" if resolution == "release_to_buyer" else "↩️"
        
        message = f"""
{emoji} <b>Dispute Resolved</b>

<b>Dispute ID:</b> <code>{dispute_id}</code>
<b>Trade ID:</b> <code>{trade_id}</code>
<b>Resolution:</b> {resolution.replace('_', ' ').title()}
<b>Winner:</b> {winner.title()}
<b>Amount:</b> {amount} {currency}
<b>Resolved by:</b> {admin_id}
"""
        
        return await self._send_message(message.strip())


# Singleton instance
_telegram_service = None

def get_telegram_service() -> TelegramAlertService:
    """Get or create Telegram service singleton"""
    global _telegram_service
    if _telegram_service is None:
        _telegram_service = TelegramAlertService()
    return _telegram_service
