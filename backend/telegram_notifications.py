# Telegram Notification Functions for Coin Hub X
# Called from various backend endpoints to send notifications

import os
import logging
from telegram import Bot
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8231349239:AAGdvHUnjfgJKjr64um2bWT43HdYHssRx5E")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

# Initialize bot
bot = Bot(token=TELEGRAM_BOT_TOKEN)

# Database connection
db_client = None
db = None

async def init_db():
    """Initialize database connection"""
    global db_client, db
    if db_client is None:
        db_client = AsyncIOMotorClient(MONGO_URL)
        db = db_client.coin_hub_x

async def check_notification_enabled(user_id: str, notification_type: str) -> bool:
    """Check if user has this notification type enabled"""
    try:
        await init_db()
        
        # Check if Telegram is linked
        link = await db.telegram_links.find_one({"user_id": user_id, "linked": True})
        if not link:
            return False
        
        # Check notification settings
        settings = await db.telegram_notification_settings.find_one({"user_id": user_id})
        
        if not settings:
            return True  # Default: enabled
        
        return settings.get(notification_type, True)
    except Exception as e:
        logger.error(f"Error checking notification settings: {e}")
        return False

async def send_telegram_message(user_id: str, message: str, parse_mode='Markdown'):
    """Send Telegram message to user"""
    try:
        await init_db()
        
        # Get telegram chat_id
        link = await db.telegram_links.find_one({"user_id": user_id, "linked": True})
        
        if not link:
            return False
        
        telegram_user_id = link.get("telegram_user_id")
        if not telegram_user_id:
            return False
        
        # Send message
        await bot.send_message(
            chat_id=telegram_user_id,
            text=message,
            parse_mode=parse_mode
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return False

# ===========================================
# P2P TRADE NOTIFICATIONS
# ===========================================

async def notify_p2p_trade_started(buyer_id: str, seller_id: str, trade_data: dict):
    """Notify both parties when P2P trade starts"""
    coin = trade_data.get("crypto_currency", "")
    amount = trade_data.get("crypto_amount", 0)
    fiat_amount = trade_data.get("fiat_amount", 0)
    fiat_currency = trade_data.get("fiat_currency", "GBP")
    trade_id = trade_data.get("trade_id", "")[:8]
    
    # Notify buyer
    if await check_notification_enabled(buyer_id, "p2p_trades"):
        buyer_message = (
            f"🔵 *Coin Hub X - New P2P Trade*\n\n"
            f"Trade Started!\n"
            f"• Amount: {amount} {coin}\n"
            f"• Price: {fiat_currency} {fiat_amount}\n"
            f"• Trade ID: {trade_id}\n\n"
            f"Please send payment to the seller."
        )
        await send_telegram_message(buyer_id, buyer_message)
    
    # Notify seller
    if await check_notification_enabled(seller_id, "p2p_trades"):
        seller_message = (
            f"🟢 *Coin Hub X - New P2P Trade*\n\n"
            f"New Buy Order!\n"
            f"• Amount: {amount} {coin}\n"
            f"• Price: {fiat_currency} {fiat_amount}\n"
            f"• Trade ID: {trade_id}\n\n"
            f"Waiting for buyer payment."
        )
        await send_telegram_message(seller_id, seller_message)

async def notify_p2p_payment_sent(seller_id: str, trade_data: dict):
    """Notify seller when buyer marks payment as sent"""
    coin = trade_data.get("crypto_currency", "")
    amount = trade_data.get("crypto_amount", 0)
    trade_id = trade_data.get("trade_id", "")[:8]
    
    if await check_notification_enabled(seller_id, "p2p_trades"):
        message = (
            f"💳 *Coin Hub X - Payment Sent*\n\n"
            f"Buyer marked payment as sent!\n"
            f"• Amount: {amount} {coin}\n"
            f"• Trade ID: {trade_id}\n\n"
            f"⚠️ Please verify payment before releasing crypto."
        )
        await send_telegram_message(seller_id, message)

async def notify_p2p_crypto_released(buyer_id: str, trade_data: dict):
    """Notify buyer when crypto is released"""
    coin = trade_data.get("crypto_currency", "")
    amount = trade_data.get("crypto_amount", 0)
    trade_id = trade_data.get("trade_id", "")[:8]
    
    if await check_notification_enabled(buyer_id, "p2p_trades"):
        message = (
            f"✅ *Coin Hub X - Crypto Released*\n\n"
            f"Trade completed successfully!\n"
            f"• Received: {amount} {coin}\n"
            f"• Trade ID: {trade_id}\n\n"
            f"Thank you for trading on Coin Hub X!"
        )
        await send_telegram_message(buyer_id, message)

async def notify_p2p_trade_cancelled(user_id: str, trade_data: dict):
    """Notify user when trade is cancelled"""
    coin = trade_data.get("crypto_currency", "")
    amount = trade_data.get("crypto_amount", 0)
    trade_id = trade_data.get("trade_id", "")[:8]
    reason = trade_data.get("cancel_reason", "No reason provided")
    
    if await check_notification_enabled(user_id, "p2p_trades"):
        message = (
            f"❌ *Coin Hub X - Trade Cancelled*\n\n"
            f"Trade has been cancelled.\n"
            f"• Amount: {amount} {coin}\n"
            f"• Trade ID: {trade_id}\n"
            f"• Reason: {reason}"
        )
        await send_telegram_message(user_id, message)

async def notify_p2p_dispute_opened(buyer_id: str, seller_id: str, trade_data: dict):
    """Notify both parties when dispute is opened"""
    trade_id = trade_data.get("trade_id", "")[:8]
    
    message = (
        f"⚠️ *Coin Hub X - Dispute Opened*\n\n"
        f"A dispute has been opened for trade {trade_id}.\n\n"
        f"Our support team will review and resolve this within 24-48 hours."
    )
    
    if await check_notification_enabled(buyer_id, "p2p_trades"):
        await send_telegram_message(buyer_id, message)
    
    if await check_notification_enabled(seller_id, "p2p_trades"):
        await send_telegram_message(seller_id, message)

async def notify_p2p_dispute_resolved(user_id: str, trade_data: dict, resolution: str):
    """Notify user when dispute is resolved"""
    trade_id = trade_data.get("trade_id", "")[:8]
    
    if await check_notification_enabled(user_id, "p2p_trades"):
        message = (
            f"✅ *Coin Hub X - Dispute Resolved*\n\n"
            f"Dispute for trade {trade_id} has been resolved.\n\n"
            f"Resolution: {resolution}"
        )
        await send_telegram_message(user_id, message)

# ===========================================
# DEPOSIT & WITHDRAWAL NOTIFICATIONS
# ===========================================

async def notify_deposit_confirmed(user_id: str, coin: str, amount: float, network: str, tx_hash: str):
    """Notify user when crypto deposit is confirmed"""
    if await check_notification_enabled(user_id, "deposits"):
        message = (
            f"✅ *Coin Hub X - Deposit Confirmed*\n\n"
            f"Your deposit has been credited!\n"
            f"• Coin: {coin}\n"
            f"• Amount: {amount}\n"
            f"• Network: {network}\n"
            f"• TX: `{tx_hash[:16]}...`"
        )
        await send_telegram_message(user_id, message)

async def notify_withdrawal_requested(user_id: str, coin: str, amount: float, address: str):
    """Notify user when withdrawal is requested"""
    if await check_notification_enabled(user_id, "withdrawals"):
        message = (
            f"🔔 *Coin Hub X - Withdrawal Requested*\n\n"
            f"Withdrawal request received:\n"
            f"• Coin: {coin}\n"
            f"• Amount: {amount}\n"
            f"• To: `{address[:10]}...`\n\n"
            f"⚠️ If you didn't request this, contact support immediately!"
        )
        await send_telegram_message(user_id, message)

async def notify_withdrawal_approved(user_id: str, coin: str, amount: float, tx_hash: str):
    """Notify user when withdrawal is approved and sent"""
    if await check_notification_enabled(user_id, "withdrawals"):
        message = (
            f"✅ *Coin Hub X - Withdrawal Sent*\n\n"
            f"Your withdrawal has been processed!\n"
            f"• Coin: {coin}\n"
            f"• Amount: {amount}\n"
            f"• TX: `{tx_hash[:16]}...`\n\n"
            f"Check your wallet in a few minutes."
        )
        await send_telegram_message(user_id, message)

async def notify_withdrawal_failed(user_id: str, coin: str, amount: float, reason: str):
    """Notify user when withdrawal fails"""
    if await check_notification_enabled(user_id, "withdrawals"):
        message = (
            f"❌ *Coin Hub X - Withdrawal Failed*\n\n"
            f"Your withdrawal could not be processed:\n"
            f"• Coin: {coin}\n"
            f"• Amount: {amount}\n"
            f"• Reason: {reason}\n\n"
            f"Funds have been returned to your account."
        )
        await send_telegram_message(user_id, message)

# ===========================================
# EXPRESS / INSTANT BUY & SWAP NOTIFICATIONS
# ===========================================

async def notify_express_order_created(user_id: str, order_data: dict):
    """Notify user when express/instant order is created"""
    if await check_notification_enabled(user_id, "express_orders"):
        coin = order_data.get("coin", "")
        amount = order_data.get("amount", 0)
        order_type = order_data.get("type", "buy")
        order_id = order_data.get("order_id", "")[:8]
        
        message = (
            f"🔵 *Coin Hub X - Order Created*\n\n"
            f"{order_type.title()} order placed:\n"
            f"• {coin}: {amount}\n"
            f"• Order ID: {order_id}\n\n"
            f"Processing..."
        )
        await send_telegram_message(user_id, message)

async def notify_express_order_success(user_id: str, order_data: dict):
    """Notify user when express order is successful"""
    if await check_notification_enabled(user_id, "express_orders"):
        coin = order_data.get("coin", "")
        amount = order_data.get("amount", 0)
        total_cost = order_data.get("total_cost", 0)
        fee = order_data.get("fee", 0)
        order_id = order_data.get("order_id", "")[:8]
        
        message = (
            f"✅ *Coin Hub X - Order Successful*\n\n"
            f"Your order is complete!\n"
            f"• {coin}: {amount}\n"
            f"• Cost: £{total_cost}\n"
            f"• Fee: £{fee}\n"
            f"• Order ID: {order_id}"
        )
        await send_telegram_message(user_id, message)

async def notify_express_order_failed(user_id: str, order_data: dict, reason: str):
    """Notify user when express order fails"""
    if await check_notification_enabled(user_id, "express_orders"):
        coin = order_data.get("coin", "")
        amount = order_data.get("amount", 0)
        order_id = order_data.get("order_id", "")[:8]
        
        message = (
            f"❌ *Coin Hub X - Order Failed*\n\n"
            f"Order could not be completed:\n"
            f"• {coin}: {amount}\n"
            f"• Order ID: {order_id}\n"
            f"• Reason: {reason}"
        )
        await send_telegram_message(user_id, message)

# ===========================================
# PRICE ALERT NOTIFICATIONS
# ===========================================

async def notify_price_alert_triggered(user_id: str, alert_data: dict):
    """Notify user when price alert is triggered"""
    if await check_notification_enabled(user_id, "price_alerts"):
        coin = alert_data.get("coin", "")
        target_price = alert_data.get("target_price", 0)
        current_price = alert_data.get("current_price", 0)
        direction = alert_data.get("direction", "up")
        
        emoji = "🔼" if direction == "up" else "🔽"
        
        message = (
            f"{emoji} *Coin Hub X - Price Alert*\n\n"
            f"{coin} price alert triggered!\n"
            f"• Target: ${target_price:,.2f}\n"
            f"• Current: ${current_price:,.2f}\n"
            f"• Direction: {'Above' if direction == 'up' else 'Below'} target"
        )
        await send_telegram_message(user_id, message)

# ===========================================
# REFERRAL NOTIFICATIONS
# ===========================================

async def notify_referral_commission(user_id: str, commission_data: dict):
    """Notify user when they earn referral commission"""
    if await check_notification_enabled(user_id, "referrals"):
        coin = commission_data.get("currency", "GBP")
        amount = commission_data.get("commission_amount", 0)
        percent = commission_data.get("commission_percent", 20)
        
        message = (
            f"💰 *Coin Hub X - Referral Earned*\n\n"
            f"You earned {coin} {amount} ({percent}%) from your referral's trade!\n\n"
            f"Keep sharing to earn more!"
        )
        await send_telegram_message(user_id, message)

# ===========================================
# ADMIN NOTIFICATIONS
# ===========================================

async def notify_admin_dispute_opened(admin_id: str, dispute_data: dict):
    """Notify admin when new dispute is opened"""
    trade_id = dispute_data.get("trade_id", "")[:8]
    amount = dispute_data.get("amount", 0)
    coin = dispute_data.get("coin", "")
    
    message = (
        f"⚠️ *ADMIN ALERT - New Dispute*\n\n"
        f"A new dispute requires attention:\n"
        f"• Trade ID: {trade_id}\n"
        f"• Amount: {amount} {coin}\n"
        f"• Status: Open\n\n"
        f"Please review in admin panel."
    )
    await send_telegram_message(admin_id, message)

async def notify_admin_large_withdrawal(admin_id: str, withdrawal_data: dict):
    """Notify admin of large withdrawal requests"""
    user_email = withdrawal_data.get("user_email", "Unknown")
    coin = withdrawal_data.get("coin", "")
    amount = withdrawal_data.get("amount", 0)
    usd_value = withdrawal_data.get("usd_value", 0)
    
    message = (
        f"🚨 *ADMIN ALERT - Large Withdrawal*\n\n"
        f"Large withdrawal requested:\n"
        f"• User: {user_email}\n"
        f"• Amount: {amount} {coin}\n"
        f"• Value: ~${usd_value:,.2f}\n\n"
        f"Please review and approve."
    )
    await send_telegram_message(admin_id, message)

async def notify_admin_low_liquidity(admin_id: str, coin: str, current_balance: float, threshold: float):
    """Notify admin when liquidity is low"""
    message = (
        f"⚠️ *ADMIN ALERT - Low Liquidity*\n\n"
        f"{coin} liquidity is below threshold:\n"
        f"• Current: {current_balance}\n"
        f"• Threshold: {threshold}\n\n"
        f"Please top up to avoid service disruption."
    )
    await send_telegram_message(admin_id, message)
