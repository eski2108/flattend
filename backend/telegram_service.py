"""Telegram service for backend notification triggers"""

import os
import logging
import aiohttp
from datetime import datetime, timezone
from typing import Optional, Dict, List
from user_service import get_user_service

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


class TelegramService:
    """Handle all Telegram notifications from backend"""
    
    def __init__(self, db):
        self.db = db
        self.bot_token = BOT_TOKEN
        self.user_service = get_user_service(db)
        
    async def send_message(self, chat_id: str, text: str, parse_mode: str = 'Markdown'):
        """Send message to Telegram chat"""
        if not self.bot_token:
            logger.warning("Telegram bot token not configured")
            return False
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{TELEGRAM_API_URL}/sendMessage",
                    json={
                        'chat_id': chat_id,
                        'text': text,
                        'parse_mode': parse_mode
                    }
                ) as response:
                    if response.status == 200:
                        return True
                    else:
                        logger.error(f"Failed to send Telegram message: {await response.text()}")
                        return False
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
    
    async def notify_p2p_order_created(self, order_id: str):
        """Notify buyer and seller of new P2P order"""
        order = await self.db.p2p_orders.find_one({"order_id": order_id})
        if not order:
            return
        
        buyer = await self.user_service.get_user_by_id(order['buyer_id'])
        seller = await self.user_service.get_user_by_id(order['seller_id'])
        
        # Notify buyer
        if buyer and buyer.get('telegram_chat_id'):
            message = (
                f"🔔 **P2P Order Created**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"💰 Amount: {order['fiat_amount']} {order['fiat_currency']}\n"
                f"🪙 Crypto: {order['crypto_amount']} {order['crypto_currency']}\n\n"
                f"Please complete payment and mark as paid."
            )
            await self.send_message(buyer['telegram_chat_id'], message)
        
        # Notify seller
        if seller and seller.get('telegram_chat_id'):
            message = (
                f"🔔 **New P2P Order**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"💰 Amount: {order['fiat_amount']} {order['fiat_currency']}\n"
                f"🪙 Crypto: {order['crypto_amount']} {order['crypto_currency']}\n\n"
                f"Waiting for buyer payment..."
            )
            await self.send_message(seller['telegram_chat_id'], message)
        
        # Log action
        await self._log_action('p2p_order_created', order_id, [order['buyer_id'], order['seller_id']])
    
    async def notify_payment_marked(self, order_id: str):
        """Notify seller that payment was marked"""
        order = await self.db.p2p_orders.find_one({"order_id": order_id})
        if not order:
            return
        
        seller = await self.user_service.get_user_by_id(order['seller_id'])
        
        if seller and seller.get('telegram_chat_id'):
            message = (
                f"🔔 **Payment Marked as Paid**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"Buyer has marked payment as completed.\n\n"
                f"⚠️ Please verify and release crypto."
            )
            await self.send_message(seller['telegram_chat_id'], message)
        
        await self._log_action('payment_marked', order_id, [order['seller_id']])
    
    async def notify_crypto_released(self, order_id: str):
        """Notify buyer that crypto was released"""
        order = await self.db.p2p_orders.find_one({"order_id": order_id})
        if not order:
            return
        
        buyer = await self.user_service.get_user_by_id(order['buyer_id'])
        
        if buyer and buyer.get('telegram_chat_id'):
            message = (
                f"✅ **Crypto Released**\n\n"
                f"🏛 Order ID: `{order_id}`\n"
                f"🪙 {order['crypto_amount']} {order['crypto_currency']} has been released to your wallet.\n\n"
                f"Trade completed successfully! 🎉"
            )
            await self.send_message(buyer['telegram_chat_id'], message)
        
        await self._log_action('crypto_released', order_id, [order['buyer_id']])
    
    async def notify_dispute_opened(self, dispute_id: str, order_id: str):
        """Notify admins of dispute"""
        dispute = await self.db.p2p_disputes.find_one({"dispute_id": dispute_id})
        if not dispute:
            return
        
        # Get admin chat IDs
        admin_config = await self.db.telegram_config.find_one({"config_key": "admin_chat_ids"})
        admin_chat_ids = admin_config.get('chat_ids', []) if admin_config else []
        
        message = (
            f"🚨 **DISPUTE OPENED** 🚨\n\n"
            f"🆔 Dispute ID: `{dispute_id}`\n"
            f"🏛 Order ID: `{order_id}`\n"
            f"👤 Opened by: {dispute.get('opened_by')}\n"
            f"📝 Reason: {dispute.get('reason')}\n\n"
            f"Action required!"
        )
        
        for admin_chat_id in admin_chat_ids:
            await self.send_message(admin_chat_id, message)
        
        await self._log_action('dispute_opened', dispute_id, admin_chat_ids)
    
    async def notify_dispute_resolved(self, dispute_id: str):
        """Notify parties that dispute was resolved"""
        dispute = await self.db.p2p_disputes.find_one({"dispute_id": dispute_id})
        if not dispute:
            return
        
        order = await self.db.p2p_orders.find_one({"order_id": dispute['order_id']})
        if not order:
            return
        
        buyer = await self.user_service.get_user_by_id(order['buyer_id'])
        seller = await self.user_service.get_user_by_id( order['seller_id']})
        
        message = (
            f"✅ **Dispute Resolved**\n\n"
            f"🆔 Dispute ID: `{dispute_id}`\n"
            f"🏛 Order ID: `{dispute['order_id']}`\n"
            f"📋 Resolution: {dispute.get('resolution')}\n\n"
            f"Case closed."
        )
        
        if buyer and buyer.get('telegram_chat_id'):
            await self.send_message(buyer['telegram_chat_id'], message)
        if seller and seller.get('telegram_chat_id'):
            await self.send_message(seller['telegram_chat_id'], message)
        
        await self._log_action('dispute_resolved', dispute_id, [order['buyer_id'], order['seller_id']])
    
    async def notify_referral_signup(self, referrer_user_id: str, new_user_email: str):
        """Notify referrer of new signup"""
        referrer = await self.user_service.get_user_by_id( referrer_user_id})
        
        if referrer and referrer.get('telegram_chat_id'):
            message = (
                f"🎉 **New Referral Signup!**\n\n"
                f"👤 {new_user_email} just signed up using your link!\n\n"
                f"You'll earn commission on their trades. 💰"
            )
            await self.send_message(referrer['telegram_chat_id'], message)
        
        await self._log_action('referral_signup', referrer_user_id, [referrer_user_id])
    
    async def notify_referral_commission(self, referrer_user_id: str, commission_data: Dict):
        """Notify referrer of commission earned"""
        referrer = await self.user_service.get_user_by_id( referrer_user_id})
        
        if referrer and referrer.get('telegram_chat_id'):
            tier_emoji = "🥇" if commission_data.get('tier_used') == 'golden' else "⭐"
            tier_rate = "50%" if commission_data.get('tier_used') == 'golden' else "20%"
            
            message = (
                f"💰 **Referral Commission Earned** {tier_emoji}\n\n"
                f"🔗 Amount: {commission_data['commission_amount']:.8f} {commission_data['currency']}\n"
                f"🎯 Rate: {tier_rate}\n"
                f"📊 Source: {commission_data['fee_type']}\n\n"
                f"Keep sharing! 🚀"
            )
            await self.send_message(referrer['telegram_chat_id'], message)
        
        await self._log_action('referral_commission', referrer_user_id, [referrer_user_id])
    
    async def notify_withdrawal_requested(self, user_id: str, withdrawal_data: Dict):
        """Notify user and admins of withdrawal request"""
        user = await self.user_service.get_user_by_id( user_id})
        
        # Notify user
        if user and user.get('telegram_chat_id'):
            message = (
                f"🔔 **Withdrawal Requested**\n\n"
                f"💰 Amount: {withdrawal_data['amount']} {withdrawal_data['currency']}\n"
                f"🔄 Status: Pending approval\n\n"
                f"You'll be notified once approved."
            )
            await self.send_message(user['telegram_chat_id'], message)
        
        # Notify admins
        admin_config = await self.db.telegram_config.find_one({"config_key": "admin_chat_ids"})
        admin_chat_ids = admin_config.get('chat_ids', []) if admin_config else []
        
        admin_message = (
            f"⚠️ **Withdrawal Request**\n\n"
            f"👤 User: {user_id}\n"
            f"💰 Amount: {withdrawal_data['amount']} {withdrawal_data['currency']}\n"
            f"🏦 Address: `{withdrawal_data['address']}`\n\n"
            f"Review required."
        )
        
        for admin_chat_id in admin_chat_ids:
            await self.send_message(admin_chat_id, admin_message)
        
        await self._log_action('withdrawal_requested', user_id, [user_id] + admin_chat_ids)
    
    async def notify_withdrawal_approved(self, user_id: str, withdrawal_data: Dict):
        """Notify user of approved withdrawal"""
        user = await self.user_service.get_user_by_id( user_id})
        
        if user and user.get('telegram_chat_id'):
            message = (
                f"✅ **Withdrawal Approved**\n\n"
                f"💰 Amount: {withdrawal_data['amount']} {withdrawal_data['currency']}\n"
                f"🏦 Address: `{withdrawal_data['address']}`\n\n"
                f"Processing now..."
            )
            await self.send_message(user['telegram_chat_id'], message)
        
        await self._log_action('withdrawal_approved', user_id, [user_id])
    
    async def notify_deposit_confirmed(self, user_id: str, deposit_data: Dict):
        """Notify user of confirmed deposit"""
        user = await self.user_service.get_user_by_id( user_id})
        
        if user and user.get('telegram_chat_id'):
            message = (
                f"✅ **Deposit Confirmed**\n\n"
                f"💰 Amount: {deposit_data['amount']} {deposit_data['currency']}\n"
                f"🔄 Confirmations: {deposit_data.get('confirmations', 'N/A')}\n\n"
                f"Funds are now available! 🎉"
            )
            await self.send_message(user['telegram_chat_id'], message)
        
        await self._log_action('deposit_confirmed', user_id, [user_id])
    
    async def notify_deposit_failed(self, user_id: str, deposit_data: Dict):
        """Notify user of failed deposit"""
        user = await self.user_service.get_user_by_id( user_id})
        
        if user and user.get('telegram_chat_id'):
            message = (
                f"❌ **Deposit Failed**\n\n"
                f"💰 Amount: {deposit_data['amount']} {deposit_data['currency']}\n"
                f"📝 Reason: {deposit_data.get('reason', 'Unknown')}\n\n"
                f"Please contact support."
            )
            await self.send_message(user['telegram_chat_id'], message)
        
        await self._log_action('deposit_failed', user_id, [user_id])
    
    async def notify_suspicious_activity(self, user_id: str, activity_data: Dict):
        """Notify admins of suspicious activity"""
        admin_config = await self.db.telegram_config.find_one({"config_key": "admin_chat_ids"})
        admin_chat_ids = admin_config.get('chat_ids', []) if admin_config else []
        
        message = (
            f"🚨 **Suspicious Activity Detected**\n\n"
            f"👤 User: {user_id}\n"
            f"⚠️ Type: {activity_data.get('type')}\n"
            f"📝 Details: {activity_data.get('details')}\n\n"
            f"Review required."
        )
        
        for admin_chat_id in admin_chat_ids:
            await self.send_message(admin_chat_id, message)
        
        await self._log_action('suspicious_activity', user_id, admin_chat_ids)
    
    async def notify_golden_status_activated(self, user_id: str):
        """Notify user they are now Golden Referrer"""
        user = await self.user_service.get_user_by_id( user_id})
        
        if user and user.get('telegram_chat_id'):
            # Get golden link
            from referral_commission_calculator import ReferralCommissionCalculator
            calc = ReferralCommissionCalculator(self.db)
            links = await calc.get_referral_links(user_id)
            
            golden_link = links.get('golden', {}).get('link', 'N/A')
            
            message = (
                f"🎉 **Congratulations!** 🎉\n\n"
                f"🥇 You are now a **GOLDEN REFERRER**!\n\n"
                f"💰 Your commission rate: **50%**\n\n"
                f"🔗 Your Golden VIP Link:\n`{golden_link}`\n\n"
                f"Share this with VIP partners for 50% lifetime commission!\n\n"
                f"You've been added to the Golden VIP chat. 👑"
            )
            await self.send_message(user['telegram_chat_id'], message)
            
            # Add to Golden VIP group
            vip_group_id = os.getenv('GOLDEN_VIP_GROUP_ID')
            if vip_group_id:
                try:
                    async with aiohttp.ClientSession() as session:
                        # Unban first (in case they were removed before)
                        await session.post(
                            f"{TELEGRAM_API_URL}/unbanChatMember",
                            json={'chat_id': vip_group_id, 'user_id': int(user['telegram_chat_id'])}
                        )
                        # Create invite link
                        async with session.post(
                            f"{TELEGRAM_API_URL}/createChatInviteLink",
                            json={'chat_id': vip_group_id, 'member_limit': 1}
                        ) as response:
                            if response.status == 200:
                                data = await response.json()
                                invite_link = data['result']['invite_link']
                                await self.send_message(
                                    user['telegram_chat_id'],
                                    f"👑 Join Golden VIP Chat: {invite_link}"
                                )
                except Exception as e:
                    logger.error(f"Failed to add user to VIP group: {e}")
        
        await self._log_action('golden_activated', user_id, [user_id])
    
    async def notify_golden_status_deactivated(self, user_id: str):
        """Notify user Golden status was revoked"""
        user = await self.user_service.get_user_by_id( user_id})
        
        if user and user.get('telegram_chat_id'):
            message = (
                f"⚠️ **Golden Referrer Status Revoked**\n\n"
                f"Your Golden Referrer status has been deactivated.\n"
                f"You've been removed from the Golden VIP chat.\n\n"
                f"Your Standard referral link (20%) is still active."
            )
            await self.send_message(user['telegram_chat_id'], message)
            
            # Remove from Golden VIP group
            vip_group_id = os.getenv('GOLDEN_VIP_GROUP_ID')
            if vip_group_id:
                try:
                    async with aiohttp.ClientSession() as session:
                        await session.post(
                            f"{TELEGRAM_API_URL}/banChatMember",
                            json={'chat_id': vip_group_id, 'user_id': int(user['telegram_chat_id'])}
                        )
                except Exception as e:
                    logger.error(f"Failed to remove user from VIP group: {e}")
        
        await self._log_action('golden_deactivated', user_id, [user_id])
    
    async def _log_action(self, action_type: str, reference_id: str, chat_ids: List):
        """Log Telegram action to database"""
        try:
            await self.db.telegram_logs.insert_one({
                "action_type": action_type,
                "reference_id": reference_id,
                "chat_ids": chat_ids,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Failed to log Telegram action: {e}")
