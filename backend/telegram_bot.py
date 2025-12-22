# Telegram Bot Integration for Coin Hub X
# Handles notifications and user commands

import os
import asyncio
import logging
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from motor.motor_asyncio import AsyncIOMotorClient
import secrets
import string

# Setup logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Bot configuration
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_ADMIN_BOT_TOKEN")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
WEB_APP_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://balance-sync-repair.preview.emergentagent.com")

# Database connection
db_client = None
db = None

async def init_db():
    """Initialize database connection"""
    global db_client, db
    if db_client is None:
        db_client = AsyncIOMotorClient(MONGO_URL)
        db = db_client.coin_hub_x
        logger.info("✅ Telegram bot connected to database")

# ===========================================
# ACCOUNT LINKING
# ===========================================

def generate_link_code():
    """Generate a secure 8-character link code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command - initiate account linking"""
    telegram_user_id = str(update.effective_user.id)
    telegram_username = update.effective_user.username or "Unknown"
    
    await init_db()
    
    # Check if already linked
    user_link = await db.telegram_links.find_one({"telegram_user_id": telegram_user_id})
    
    if user_link and user_link.get("user_id"):
        await update.message.reply_text(
            f"✅ *Welcome back to Coin Hub X!*\n\n"
            f"Your Telegram is already linked to your account.\n\n"
            f"Available commands:\n"
            f"/balance - Check your crypto balances\n"
            f"/price [coin] - Get current prices\n"
            f"/alerts - View your price alerts\n"
            f"/referrals - View referral stats\n"
            f"/settings - Manage notifications\n"
            f"/support - Get support\n"
            f"/stop - Unlink account",
            parse_mode='Markdown'
        )
        return
    
    # Generate new link code
    link_code = generate_link_code()
    
    # Store link code in database
    await db.telegram_links.update_one(
        {"telegram_user_id": telegram_user_id},
        {
            "$set": {
                "telegram_user_id": telegram_user_id,
                "telegram_username": telegram_username,
                "link_code": link_code,
                "code_generated_at": datetime.now(timezone.utc).isoformat(),
                "linked": False
            }
        },
        upsert=True
    )
    
    await update.message.reply_text(
        f"🌟 *Welcome to Coin Hub X!*\n\n"
        f"To link your Telegram account:\n\n"
        f"1️⃣ Go to your Coin Hub X account settings\n"
        f"2️⃣ Navigate to 'Telegram Notifications'\n"
        f"3️⃣ Enter this code: `{link_code}`\n\n"
        f"🔗 Or click here: {WEB_APP_URL.replace('/api', '')}/settings?tab=telegram\n\n"
        f"⚠️ Code expires in 10 minutes",
        parse_mode='Markdown'
    )
    
    logger.info(f"📱 Link code generated for Telegram user {telegram_user_id}: {link_code}")

async def stop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /stop command - unlink account"""
    telegram_user_id = str(update.effective_user.id)
    
    await init_db()
    
    # Remove link
    result = await db.telegram_links.delete_one({"telegram_user_id": telegram_user_id})
    
    if result.deleted_count > 0:
        await update.message.reply_text(
            "🔓 *Account Unlinked*\n\n"
            "Your Telegram has been disconnected from Coin Hub X.\n"
            "You'll no longer receive notifications.\n\n"
            "Use /start to link again anytime.",
            parse_mode='Markdown'
        )
        logger.info(f"🔓 Unlinked Telegram user {telegram_user_id}")
    else:
        await update.message.reply_text(
            "❌ No linked account found.\n\n"
            "Use /start to link your account.",
            parse_mode='Markdown'
        )

# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_user_id_from_telegram(telegram_user_id: str):
    """Get platform user_id from telegram_user_id"""
    await init_db()
    link = await db.telegram_links.find_one({"telegram_user_id": telegram_user_id, "linked": True})
    return link.get("user_id") if link else None

async def require_linked_account(update: Update):
    """Check if user has linked account, return user_id or None"""
    telegram_user_id = str(update.effective_user.id)
    user_id = await get_user_id_from_telegram(telegram_user_id)
    
    if not user_id:
        await update.message.reply_text(
            "❌ *Account Not Linked*\n\n"
            "Please link your Coin Hub X account first using /start",
            parse_mode='Markdown'
        )
        return None
    
    return user_id

# ===========================================
# USER COMMANDS
# ===========================================

async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /balance command - show user's crypto balances"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    await init_db()
    
    try:
        # Get user balances from database
        user_account = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        
        if not user_account:
            await update.message.reply_text("❌ Account not found")
            return
        
        # Main coins to show
        main_coins = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'LTC']
        
        # Get balances
        balances_text = "💰 *Your Coin Hub X Balances*\n\n"
        
        has_balance = False
        for coin in main_coins:
            balance_key = f"{coin.lower()}_balance"
            balance = user_account.get(balance_key, 0)
            
            if balance > 0:
                has_balance = True
                # Get approximate USD value (simplified - you can enhance with live prices)
                balances_text += f"• *{coin}*: {balance:.8f}\n"
        
        if not has_balance:
            balances_text += "_No balances yet_\n\n"
        else:
            balances_text += "\n"
        
        balances_text += f"View full portfolio: {WEB_APP_URL.replace('/api', '')}/portfolio"
        
        await update.message.reply_text(balances_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Balance command error: {e}")
        await update.message.reply_text("❌ Failed to fetch balances. Please try again.")

async def price_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /price command - get current crypto prices"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    # Get coin from command args
    if not context.args or len(context.args) == 0:
        await update.message.reply_text(
            "📊 *Get Crypto Prices*\n\n"
            "Usage: /price BTC\n"
            "Example: /price ETH\n\n"
            "Supported: BTC, ETH, USDT, BNB, SOL, XRP, LTC, DOGE",
            parse_mode='Markdown'
        )
        return
    
    coin = context.args[0].upper()
    
    await init_db()
    
    try:
        # Get price from coins collection (your existing price system)
        coin_data = await db.coins.find_one({"symbol": coin}, {"_id": 0})
        
        if not coin_data:
            await update.message.reply_text(f"❌ Price data not available for {coin}")
            return
        
        price_usd = coin_data.get("price_usd", 0)
        price_gbp = coin_data.get("price_gbp", 0)
        change_24h = coin_data.get("change_24h", 0)
        
        # Format change indicator
        change_emoji = "🔼" if change_24h > 0 else "🔽" if change_24h < 0 else "➡️"
        change_color = "+" if change_24h > 0 else ""
        
        price_text = (
            f"💹 *{coin} Price*\n\n"
            f"• USD: ${price_usd:,.2f}\n"
            f"• GBP: £{price_gbp:,.2f}\n"
            f"• 24h: {change_emoji} {change_color}{change_24h:.2f}%\n\n"
            f"Trade now: {WEB_APP_URL.replace('/api', '')}/trade"
        )
        
        await update.message.reply_text(price_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Price command error: {e}")
        await update.message.reply_text("❌ Failed to fetch price. Please try again.")

async def alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /alerts command - show user's active price alerts"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    await init_db()
    
    try:
        # Get user's price alerts
        alerts = await db.price_alerts.find(
            {"user_id": user_id, "active": True},
            {"_id": 0}
        ).to_list(100)
        
        if not alerts or len(alerts) == 0:
            await update.message.reply_text(
                "🔔 *Price Alerts*\n\n"
                "You have no active price alerts.\n\n"
                f"Set alerts: {WEB_APP_URL.replace('/api', '')}/alerts",
                parse_mode='Markdown'
            )
            return
        
        alerts_text = "🔔 *Your Active Price Alerts*\n\n"
        
        for idx, alert in enumerate(alerts, 1):
            coin = alert.get("coin", "")
            threshold = alert.get("threshold", 0)
            direction = alert.get("direction", "up")
            
            arrow = ">" if direction == "up" else "<"
            alerts_text += f"#{idx} *{coin}* {arrow} ${threshold:,.2f} - ACTIVE\n"
        
        alerts_text += f"\n📱 Manage alerts: {WEB_APP_URL.replace('/api', '')}/alerts"
        
        await update.message.reply_text(alerts_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Alerts command error: {e}")
        await update.message.reply_text("❌ Failed to fetch alerts. Please try again.")

async def referrals_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /referrals command - show referral stats and link"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    await init_db()
    
    try:
        # Get user data for referral code
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        referral_code = user.get("referral_code", "N/A")
        
        # Get referral stats
        referral_count = await db.referral_relationships.count_documents({"referrer_user_id": user_id})
        
        # Get commission earnings
        commissions = await db.referral_commissions.find({"referrer_user_id": user_id}).to_list(1000)
        
        # Calculate totals by currency
        earnings_by_currency = {}
        for comm in commissions:
            currency = comm.get("currency", "GBP")
            amount = comm.get("commission_amount", 0)
            earnings_by_currency[currency] = earnings_by_currency.get(currency, 0) + amount
        
        # Check if golden referral
        is_golden = user.get("golden_referral", False)
        commission_rate = 50 if is_golden else 20
        
        # Build message
        referral_link = f"{WEB_APP_URL.replace('/api', '')}/register?ref={referral_code}"
        
        referral_text = (
            f"🎁 *Coin Hub X Referrals*\n\n"
            f"*Your Referral Link:*\n`{referral_link}`\n\n"
            f"📊 *Stats:*\n"
            f"• Referred Users: {referral_count}\n"
            f"• Commission Rate: {commission_rate}%*\n\n"
        )
        
        if earnings_by_currency:
            referral_text += "*Total Earned:*\n"
            for currency, amount in earnings_by_currency.items():
                referral_text += f"• {currency}: {amount:.2f}\n"
        else:
            referral_text += "_No earnings yet_\n"
        
        referral_text += (
            f"\n_*{commission_rate}% of our exchange's commission, not the trade amount_\n\n"
            f"💡 Share your link and earn from every trade!"
        )
        
        await update.message.reply_text(referral_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Referrals command error: {e}")
        await update.message.reply_text("❌ Failed to fetch referral data. Please try again.")

async def support_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /support command - show support contact info"""
    support_text = (
        f"💬 *Coin Hub X Support*\n\n"
        f"Need help? We're here for you!\n\n"
        f"📧 *Email:* info@coinhubx.net\n"
        f"🌐 *Support Page:* {WEB_APP_URL.replace('/api', '')}/support\n"
        f"💬 *Live Chat:* Available on website\n\n"
        f"Response time: Usually within 24 hours"
    )
    
    await update.message.reply_text(support_text, parse_mode='Markdown')

async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /settings command - manage notification preferences"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    await init_db()
    
    try:
        # Get current settings
        settings = await db.telegram_notification_settings.find_one({"user_id": user_id}, {"_id": 0})
        
        if not settings:
            # Set defaults
            settings = {
                "p2p_trades": True,
                "deposits": True,
                "withdrawals": True,
                "price_alerts": True,
                "referrals": True,
                "express_orders": True
            }
        
        # Build settings message
        def status_emoji(enabled):
            return "✅" if enabled else "❌"
        
        settings_text = (
            f"⚙️ *Notification Settings*\n\n"
            f"Current preferences:\n\n"
            f"{status_emoji(settings.get('p2p_trades', True))} P2P Trades\n"
            f"{status_emoji(settings.get('deposits', True))} Deposits\n"
            f"{status_emoji(settings.get('withdrawals', True))} Withdrawals\n"
            f"{status_emoji(settings.get('price_alerts', True))} Price Alerts\n"
            f"{status_emoji(settings.get('referrals', True))} Referrals\n"
            f"{status_emoji(settings.get('express_orders', True))} Express Orders\n\n"
            f"To toggle notifications, reply with:\n"
            f"`/toggle p2p` or `/toggle deposits` etc.\n\n"
            f"Or manage in: {WEB_APP_URL.replace('/api', '')}/settings"
        )
        
        await update.message.reply_text(settings_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Settings command error: {e}")
        await update.message.reply_text("❌ Failed to fetch settings. Please try again.")

async def toggle_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /toggle command - toggle specific notification type"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    if not context.args or len(context.args) == 0:
        await update.message.reply_text(
            "Usage: /toggle [type]\n\n"
            "Types: p2p, deposits, withdrawals, alerts, referrals, express",
            parse_mode='Markdown'
        )
        return
    
    notification_type = context.args[0].lower()
    
    # Map short names to full field names
    type_mapping = {
        "p2p": "p2p_trades",
        "deposits": "deposits",
        "withdrawals": "withdrawals",
        "alerts": "price_alerts",
        "referrals": "referrals",
        "express": "express_orders"
    }
    
    if notification_type not in type_mapping:
        await update.message.reply_text(
            "❌ Invalid type. Use: p2p, deposits, withdrawals, alerts, referrals, or express"
        )
        return
    
    field_name = type_mapping[notification_type]
    
    await init_db()
    
    try:
        # Get current setting
        settings = await db.telegram_notification_settings.find_one({"user_id": user_id}, {"_id": 0})
        current_value = settings.get(field_name, True) if settings else True
        
        # Toggle it
        new_value = not current_value
        
        # Update in database
        await db.telegram_notification_settings.update_one(
            {"user_id": user_id},
            {"$set": {field_name: new_value, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        status = "enabled ✅" if new_value else "disabled ❌"
        await update.message.reply_text(
            f"✓ *{notification_type.title()}* notifications {status}",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"Toggle command error: {e}")
        await update.message.reply_text("❌ Failed to update setting. Please try again.")

# ===========================================
# ADMIN COMMANDS
# ===========================================

async def is_admin(user_id: str) -> bool:
    """Check if user is admin"""
    await init_db()
    # Check if user is in admin list or has admin role
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0, "role": 1})
    return user and user.get("role") == "admin"

async def admin_stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /admin_stats command - show today's platform stats"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    if not await is_admin(user_id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    await init_db()
    
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Count new users today
        new_users = await db.user_accounts.count_documents({
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        # P2P trades today
        p2p_trades = await db.p2p_trades.find({
            "created_at": {"$gte": today_start.isoformat()}
        }).to_list(1000)
        
        p2p_count = len(p2p_trades)
        p2p_volume = sum(trade.get("fiat_amount", 0) for trade in p2p_trades)
        
        # Express orders today
        express_orders = await db.express_orders.find({
            "created_at": {"$gte": today_start.isoformat()}
        }).to_list(1000)
        
        express_count = len(express_orders)
        express_volume = sum(order.get("total_cost", 0) for order in express_orders)
        
        # Total fees earned (simplified)
        p2p_fees = sum(trade.get("platform_fee", 0) for trade in p2p_trades)
        express_fees = sum(order.get("fee", 0) for order in express_orders)
        total_fees = p2p_fees + express_fees
        
        stats_text = (
            f"📊 *Admin Stats - Today*\n\n"
            f"👥 *New Users:* {new_users}\n\n"
            f"🔄 *P2P Trading:*\n"
            f"• Trades: {p2p_count}\n"
            f"• Volume: £{p2p_volume:,.2f}\n"
            f"• Fees: £{p2p_fees:,.2f}\n\n"
            f"⚡ *Express Orders:*\n"
            f"• Orders: {express_count}\n"
            f"• Volume: £{express_volume:,.2f}\n"
            f"• Fees: £{express_fees:,.2f}\n\n"
            f"💰 *Total Fees Today:* £{total_fees:,.2f}"
        )
        
        await update.message.reply_text(stats_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Admin stats command error: {e}")
        await update.message.reply_text("❌ Failed to fetch stats. Please try again.")

async def admin_alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /admin_alerts command - toggle admin alert types"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    if not await is_admin(user_id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    await init_db()
    
    try:
        # Get admin alert settings
        settings = await db.admin_telegram_settings.find_one({"user_id": user_id}, {"_id": 0})
        
        if not settings:
            settings = {
                "disputes": True,
                "large_withdrawals": True,
                "low_liquidity": True
            }
        
        def status_emoji(enabled):
            return "✅" if enabled else "❌"
        
        alerts_text = (
            f"⚙️ *Admin Alert Settings*\n\n"
            f"Current preferences:\n\n"
            f"{status_emoji(settings.get('disputes', True))} New Disputes\n"
            f"{status_emoji(settings.get('large_withdrawals', True))} Large Withdrawals (>$2,000)\n"
            f"{status_emoji(settings.get('low_liquidity', True))} Low Liquidity Warnings\n\n"
            f"To toggle, reply with:\n"
            f"`/admin_toggle disputes`\n"
            f"`/admin_toggle withdrawals`\n"
            f"`/admin_toggle liquidity`"
        )
        
        await update.message.reply_text(alerts_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Admin alerts command error: {e}")
        await update.message.reply_text("❌ Failed to fetch settings. Please try again.")

async def admin_toggle_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /admin_toggle command - toggle admin alert types"""
    user_id = await require_linked_account(update)
    if not user_id:
        return
    
    if not await is_admin(user_id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    if not context.args or len(context.args) == 0:
        await update.message.reply_text(
            "Usage: /admin_toggle [type]\n\n"
            "Types: disputes, withdrawals, liquidity"
        )
        return
    
    alert_type = context.args[0].lower()
    
    type_mapping = {
        "disputes": "disputes",
        "withdrawals": "large_withdrawals",
        "liquidity": "low_liquidity"
    }
    
    if alert_type not in type_mapping:
        await update.message.reply_text("❌ Invalid type. Use: disputes, withdrawals, or liquidity")
        return
    
    field_name = type_mapping[alert_type]
    
    await init_db()
    
    try:
        settings = await db.admin_telegram_settings.find_one({"user_id": user_id}, {"_id": 0})
        current_value = settings.get(field_name, True) if settings else True
        
        new_value = not current_value
        
        await db.admin_telegram_settings.update_one(
            {"user_id": user_id},
            {"$set": {field_name: new_value, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        status = "enabled ✅" if new_value else "disabled ❌"
        await update.message.reply_text(
            f"✓ *{alert_type.title()}* alerts {status}",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"Admin toggle command error: {e}")
        await update.message.reply_text("❌ Failed to update setting. Please try again.")

# ===========================================
# NOTIFICATION FUNCTIONS
# ===========================================

async def send_telegram_notification(user_id: str, message: str, parse_mode='Markdown'):
    """
    Send a Telegram notification to a user
    
    Args:
        user_id: Platform user ID
        message: Message text
        parse_mode: 'Markdown' or 'HTML'
    """
    try:
        await init_db()
        
        # Get telegram link
        link = await db.telegram_links.find_one({"user_id": user_id, "linked": True})
        
        if not link:
            logger.debug(f"No Telegram link found for user {user_id}")
            return False
        
        telegram_user_id = link.get("telegram_user_id")
        if not telegram_user_id:
            return False
        
        # Send message via bot
        application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        await application.bot.send_message(
            chat_id=telegram_user_id,
            text=message,
            parse_mode=parse_mode
        )
        
        logger.info(f"✅ Sent Telegram notification to user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send Telegram notification: {str(e)}")
        return False

async def check_notification_enabled(user_id: str, notification_type: str) -> bool:
    """Check if user has this notification type enabled"""
    await init_db()
    
    settings = await db.telegram_notification_settings.find_one({"user_id": user_id})
    
    if not settings:
        # Default: all enabled
        return True
    
    return settings.get(notification_type, True)

# ===========================================
# BOT INITIALIZATION
# ===========================================

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    logger.error(f"Update {update} caused error {context.error}")

def start_bot():
    """Start the Telegram bot"""
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Add command handlers - User Commands
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("stop", stop_command))
    application.add_handler(CommandHandler("balance", balance_command))
    application.add_handler(CommandHandler("price", price_command))
    application.add_handler(CommandHandler("alerts", alerts_command))
    application.add_handler(CommandHandler("referrals", referrals_command))
    application.add_handler(CommandHandler("support", support_command))
    application.add_handler(CommandHandler("settings", settings_command))
    application.add_handler(CommandHandler("toggle", toggle_command))
    
    # Admin commands
    application.add_handler(CommandHandler("admin_stats", admin_stats_command))
    application.add_handler(CommandHandler("admin_alerts", admin_alerts_command))
    application.add_handler(CommandHandler("admin_toggle", admin_toggle_command))
    
    # Add error handler
    application.add_error_handler(error_handler)
    
    # Start polling
    logger.info("🤖 Coin Hub X Telegram Bot FULLY LOADED - All commands active!")
    logger.info("✅ User commands: /start, /balance, /price, /alerts, /referrals, /support, /settings")
    logger.info("✅ Admin commands: /admin_stats, /admin_alerts, /admin_toggle")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    start_bot()
