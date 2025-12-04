#!/usr/bin/env python3
"""
CoinHubX Telegram Bot
Community Management, Security, Notifications, Admin Control
"""

import os
import logging
import asyncio
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes,
)
import aiohttp
import motor.motor_asyncio

# Setup logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8001/api')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'coinhubx'

# Group IDs (will be set via admin commands)
MAIN_GROUP_ID = os.getenv('MAIN_GROUP_ID')
ANNOUNCEMENTS_CHANNEL_ID = os.getenv('ANNOUNCEMENTS_CHANNEL_ID')
SUPPORT_GROUP_ID = os.getenv('SUPPORT_GROUP_ID')
P2P_ALERTS_GROUP_ID = os.getenv('P2P_ALERTS_GROUP_ID')
GOLDEN_VIP_GROUP_ID = os.getenv('GOLDEN_VIP_GROUP_ID')
ADMIN_GROUP_ID = os.getenv('ADMIN_GROUP_ID')

# Initialize MongoDB
db_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = db_client[DB_NAME]


class CoinHubXBot:
    def __init__(self):
        self.application = None
        
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command - Links Telegram to CoinHubX account"""
        user = update.effective_user
        chat_id = update.effective_chat.id
        
        # Check if user_id was passed as parameter (from Connect Telegram button)
        if context.args and len(context.args) > 0:
            user_id = context.args[0]
            
            # Link telegram_chat_id to user account via backend API
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{BACKEND_URL}/telegram/link",
                        json={
                            "user_id": user_id,
                            "telegram_chat_id": str(chat_id),
                            "telegram_username": user.username or user.first_name
                        }
                    ) as response:
                        if response.status == 200:
                            await update.message.reply_text(
                                f"✅ Success!\n\n"
                                f"Your Telegram account has been linked to CoinHubX.\n\n"
                                f"You'll now receive notifications for:\n"
                                f"• P2P order updates\n"
                                f"• Referral earnings\n"
                                f"• Deposits & withdrawals\n"
                                f"• Important alerts\n\n"
                                f"Use /help to see available commands."
                            )
                            logger.info(f"Linked user {user_id} to chat_id {chat_id}")
                        else:
                            await update.message.reply_text(
                                "❌ Failed to link account. Please try again from the website."
                            )
            except Exception as e:
                logger.error(f"Error linking account: {e}")
                await update.message.reply_text(
                    "❌ Error linking account. Please try again."
                )
        else:
            # No user_id parameter - show instructions
            await update.message.reply_text(
                f"🚀 Welcome to CoinHubX, {user.first_name}!\n\n"
                f"To connect your account:\n"
                f"1. Go to https://coinhubx.com/settings\n"
                f"2. Click 'Connect Telegram'\n"
                f"3. You'll be redirected here automatically\n\n"
                f"Use /help to see available commands."
            )
        
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = """
🤖 **CoinHubX Bot Commands**

**User Commands:**
/balance - Check your wallet balance
/referrals - View your referral stats
/mydeals - See your P2P orders
/verifyme - Verify your account

**Admin Commands:**
/ban [user_id] - Ban a user
/userinfo [user_id] - Get user details
/order [order_id] - View order details
/resolve [dispute_id] - Resolve a dispute
/openorders - List open P2P orders
/revenue - View platform revenue

**Support:**
For help, contact @CoinHubXSupport
        """
        await update.message.reply_text(help_text, parse_mode='Markdown')
        
    async def balance_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /balance command"""
        telegram_user_id = update.effective_user.id
        
        # Get user from database by telegram_id
        user = await db.user_accounts.find_one({"telegram_id": str(telegram_user_id)})
        
        if not user:
            await update.message.reply_text(
                "❌ Your Telegram account is not linked to CoinHubX.\n"
                "Please link your account in Settings on the website."
            )
            return
            
        # Fetch balance from backend
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}/wallets/balances/{user['user_id']}") as response:
                    if response.status == 200:
                        data = await response.json()
                        balances = data.get('balances', [])
                        
                        balance_text = "💰 **Your Wallet Balance:**\n\n"
                        for bal in balances:
                            currency = bal['currency']
                            available = bal['available']
                            locked = bal['locked']
                            balance_text += f"**{currency}:** {available:.8f} (Locked: {locked:.8f})\n"
                        
                        await update.message.reply_text(balance_text, parse_mode='Markdown')
                    else:
                        await update.message.reply_text("❌ Failed to fetch balance")
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            await update.message.reply_text("❌ Error fetching balance")
            
    async def referrals_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /referrals command"""
        telegram_user_id = update.effective_user.id
        user = await db.user_accounts.find_one({"telegram_id": str(telegram_user_id)})
        
        if not user:
            await update.message.reply_text("❌ Account not linked")
            return
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}/referral/dashboard/comprehensive/{user['user_id']}") as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        is_golden = user.get('is_golden_referrer', False)
                        tier_badge = "🥇 GOLDEN REFERRER" if is_golden else "⭐ STANDARD REFERRER"
                        
                        ref_text = f"{tier_badge}\n\n"
                        ref_text += f"💰 **Total Earnings:** £{data.get('total_earnings', {}).get('total_gbp', 0):.2f}\n"
                        ref_text += f"👥 **Active Referrals:** {data.get('active_referrals', 0)}\n"
                        ref_text += f"📊 **Total Referred:** {len(data.get('recent_referrals', []))}\n\n"
                        ref_text += f"🔗 Your referral link: https://coinhubx.com/register?ref={data.get('referral_code')}"
                        
                        await update.message.reply_text(ref_text, parse_mode='Markdown')
                    else:
                        await update.message.reply_text("❌ Failed to fetch referral data")
        except Exception as e:
            logger.error(f"Error fetching referrals: {e}")
            await update.message.reply_text("❌ Error fetching referral data")
            
    async def verify_new_member(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Verify new members joining the group"""
        for new_member in update.message.new_chat_members:
            # Check if user is verified
            user = await db.user_accounts.find_one({"telegram_id": str(new_member.id)})
            
            if not user:
                # Not verified, send verification message
                keyboard = [[InlineKeyboardButton("✅ Verify Account", url="https://coinhubx.com/settings")]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    f"Welcome {new_member.first_name}!\n\n"
                    f"Please link your Telegram account on CoinHubX to access the group.",
                    reply_markup=reply_markup
                )
                
                # Kick unverified user after 24 hours
                context.job_queue.run_once(
                    self.kick_unverified_user,
                    86400,  # 24 hours
                    data={'chat_id': update.effective_chat.id, 'user_id': new_member.id}
                )
                
    async def kick_unverified_user(self, context: ContextTypes.DEFAULT_TYPE):
        """Kick user who didn't verify within 24 hours"""
        data = context.job.data
        user = await db.user_accounts.find_one({"telegram_id": str(data['user_id'])})
        
        if not user:
            try:
                await context.bot.ban_chat_member(data['chat_id'], data['user_id'])
                await context.bot.unban_chat_member(data['chat_id'], data['user_id'])
            except Exception as e:
                logger.error(f"Error kicking user: {e}")
                
    async def anti_spam_filter(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Filter spam messages"""
        message = update.message
        
        # Check for spam patterns
        spam_keywords = ['crypto pump', 'guaranteed profit', 'click here', 't.me/', 'bit.ly']
        
        if message.text:
            text_lower = message.text.lower()
            for keyword in spam_keywords:
                if keyword in text_lower:
                    # Delete message
                    await message.delete()
                    
                    # Warn user
                    await context.bot.send_message(
                        chat_id=message.chat_id,
                        text=f"⚠️ {message.from_user.first_name}, spam is not allowed in this group."
                    )
                    
                    # Log to database
                    await db.bot_logs.insert_one({
                        "action": "spam_detected",
                        "user_id": message.from_user.id,
                        "message": message.text,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    break
                    
    def run(self):
        """Start the bot"""
        if not BOT_TOKEN:
            logger.error("TELEGRAM_BOT_TOKEN not set!")
            return
            
        # Create application
        self.application = Application.builder().token(BOT_TOKEN).build()
        
        # Add command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("balance", self.balance_command))
        self.application.add_handler(CommandHandler("referrals", self.referrals_command))
        
        # Add new member handler
        self.application.add_handler(MessageHandler(
            filters.StatusUpdate.NEW_CHAT_MEMBERS,
            self.verify_new_member
        ))
        
        # Add spam filter
        self.application.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            self.anti_spam_filter
        ))
        
        # Start bot
        logger.info("🤖 CoinHubX Bot starting...")
        self.application.run_polling()


if __name__ == '__main__':
    bot = CoinHubXBot()
    bot.run()
