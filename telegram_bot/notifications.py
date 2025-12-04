"""Telegram notification handlers for P2P orders, disputes, and referrals"""

import logging
import os
from telegram import Bot
from telegram.error import TelegramError

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
P2P_ALERTS_GROUP_ID = os.getenv('P2P_ALERTS_GROUP_ID')
ADMIN_GROUP_ID = os.getenv('ADMIN_GROUP_ID')
GOLDEN_VIP_GROUP_ID = os.getenv('GOLDEN_VIP_GROUP_ID')


class TelegramNotifier:
    def __init__(self):
        if BOT_TOKEN:
            self.bot = Bot(token=BOT_TOKEN)
        else:
            self.bot = None
            logger.warning("Telegram bot not initialized - BOT_TOKEN missing")
    
    async def send_p2p_order_notification(self, order_data: dict):
        """
        Send P2P order notification to both buyer and seller
        """
        if not self.bot:
            return
        
        order_id = order_data.get('order_id')
        buyer_telegram_id = order_data.get('buyer_telegram_id')
        seller_telegram_id = order_data.get('seller_telegram_id')
        amount = order_data.get('amount')
        crypto_amount = order_data.get('crypto_amount')
        currency = order_data.get('currency')
        crypto = order_data.get('crypto')
        
        # Notification for buyer
        if buyer_telegram_id:
            buyer_message = (
                f"🔔 **P2P Order Created**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"💰 Amount: {amount} {currency}\n"
                f"🪙 Crypto: {crypto_amount} {crypto}\n\n"
                f"Please complete payment and mark as paid."
            )
            try:
                await self.bot.send_message(
                    chat_id=buyer_telegram_id,
                    text=buyer_message,
                    parse_mode='Markdown'
                )
            except TelegramError as e:
                logger.error(f"Failed to notify buyer: {e}")
        
        # Notification for seller
        if seller_telegram_id:
            seller_message = (
                f"🔔 **New P2P Order**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"💰 Amount: {amount} {currency}\n"
                f"🪙 Crypto: {crypto_amount} {crypto}\n\n"
                f"Waiting for buyer payment..."
            )
            try:
                await self.bot.send_message(
                    chat_id=seller_telegram_id,
                    text=seller_message,
                    parse_mode='Markdown'
                )
            except TelegramError as e:
                logger.error(f"Failed to notify seller: {e}")
        
        # Post to P2P alerts group
        if P2P_ALERTS_GROUP_ID:
            group_message = (
                f"🚨 **New P2P Order**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"💰 {amount} {currency} → {crypto_amount} {crypto}\n"
                f"Status: 🟡 Pending Payment"
            )
            try:
                await self.bot.send_message(
                    chat_id=P2P_ALERTS_GROUP_ID,
                    text=group_message,
                    parse_mode='Markdown'
                )
            except TelegramError as e:
                logger.error(f"Failed to notify P2P group: {e}")
    
    async def send_payment_marked_notification(self, order_data: dict):
        """Notify when payment is marked as paid"""
        if not self.bot:
            return
        
        order_id = order_data.get('order_id')
        seller_telegram_id = order_data.get('seller_telegram_id')
        
        if seller_telegram_id:
            message = (
                f"🔔 **Payment Marked as Paid**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"Buyer has marked payment as completed.\n\n"
                f"⚠️ Please verify and release crypto."
            )
            try:
                await self.bot.send_message(
                    chat_id=seller_telegram_id,
                    text=message,
                    parse_mode='Markdown'
                )
            except TelegramError as e:
                logger.error(f"Failed to notify seller: {e}")
    
    async def send_crypto_released_notification(self, order_data: dict):
        """Notify when crypto is released"""
        if not self.bot:
            return
        
        order_id = order_data.get('order_id')
        buyer_telegram_id = order_data.get('buyer_telegram_id')
        crypto_amount = order_data.get('crypto_amount')
        crypto = order_data.get('crypto')
        
        if buyer_telegram_id:
            message = (
                f"✅ **Crypto Released**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"🪙 {crypto_amount} {crypto} has been released to your wallet.\n\n"
                f"Trade completed successfully! 🎉"
            )
            try:
                await self.bot.send_message(
                    chat_id=buyer_telegram_id,
                    text=message,
                    parse_mode='Markdown'
                )
            except TelegramError as e:
                logger.error(f"Failed to notify buyer: {e}")
    
    async def send_dispute_opened_notification(self, dispute_data: dict):
        """Send instant notification to admin group when dispute is opened"""
        if not self.bot or not ADMIN_GROUP_ID:
            return
        
        dispute_id = dispute_data.get('dispute_id')
        order_id = dispute_data.get('order_id')
        opened_by = dispute_data.get('opened_by')
        reason = dispute_data.get('reason')
        
        message = (
            f"🚨 **DISPUTE OPENED** 🚨\n\n"
            f"🆔 Dispute ID: `{dispute_id}`\n"
            f"🏛 Order ID: `{order_id}`\n"
            f"👤 Opened by: {opened_by}\n"
            f"📝 Reason: {reason}\n\n"
            f"Use /resolve {dispute_id} to manage this dispute."
        )
        
        try:
            await self.bot.send_message(
                chat_id=ADMIN_GROUP_ID,
                text=message,
                parse_mode='Markdown'
            )
        except TelegramError as e:
            logger.error(f"Failed to notify admin group: {e}")
    
    async def send_referral_earnings_notification(self, user_telegram_id: str, earning_data: dict):
        """Notify user of referral earnings"""
        if not self.bot:
            return
        
        commission_amount = earning_data.get('commission_amount')
        currency = earning_data.get('currency')
        tier = earning_data.get('tier_used')
        referred_user = earning_data.get('referred_user')
        fee_type = earning_data.get('fee_type')
        
        tier_emoji = "🥇" if tier == 'golden' else "⭐"
        tier_rate = "50%" if tier == 'golden' else "20%"
        
        message = (
            f"💰 **Referral Earnings** {tier_emoji}\n\n"
            f"🔗 Commission: {commission_amount:.8f} {currency}\n"
            f"🎯 Rate: {tier_rate} ({tier.upper()})\n"
            f"👤 From: {referred_user}\n"
            f"📊 Source: {fee_type}\n\n"
            f"Keep sharing your link! 🚀"
        )
        
        try:
            await self.bot.send_message(
                chat_id=user_telegram_id,
                text=message,
                parse_mode='Markdown'
            )
        except TelegramError as e:
            logger.error(f"Failed to notify user of earnings: {e}")
    
    async def send_golden_referrer_welcome(self, user_telegram_id: str, golden_link: str):
        """Send welcome message when user becomes Golden Referrer"""
        if not self.bot:
            return
        
        message = (
            f"🎉 **Congratulations!** 🎉\n\n"
            f"🥇 You are now a **GOLDEN REFERRER**!\n\n"
            f"💰 Your commission rate: **50%**\n\n"
            f"🔗 Your Golden VIP Link:\n`{golden_link}`\n\n"
            f"Share this with VIP partners for 50% lifetime commission!\n\n"
            f"You've been added to the Golden VIP chat. 👑"
        )
        
        try:
            await self.bot.send_message(
                chat_id=user_telegram_id,
                text=message,
                parse_mode='Markdown'
            )
            
            # Add to Golden VIP group
            if GOLDEN_VIP_GROUP_ID:
                await self.bot.unban_chat_member(GOLDEN_VIP_GROUP_ID, user_telegram_id)
                # Send invite link
                invite_link = await self.bot.create_chat_invite_link(GOLDEN_VIP_GROUP_ID, member_limit=1)
                await self.bot.send_message(
                    chat_id=user_telegram_id,
                    text=f"👑 Join Golden VIP Chat: {invite_link.invite_link}"
                )
        except TelegramError as e:
            logger.error(f"Failed to send Golden welcome: {e}")
    
    async def remove_from_golden_vip(self, user_telegram_id: str):
        """Remove user from Golden VIP group"""
        if not self.bot or not GOLDEN_VIP_GROUP_ID:
            return
        
        try:
            await self.bot.ban_chat_member(GOLDEN_VIP_GROUP_ID, user_telegram_id)
            await self.bot.send_message(
                chat_id=user_telegram_id,
                text="⚠️ Your Golden Referrer status has been revoked. You've been removed from the Golden VIP chat."
            )
        except TelegramError as e:
            logger.error(f"Failed to remove from Golden VIP: {e}")


# Global notifier instance
notifier = TelegramNotifier()
