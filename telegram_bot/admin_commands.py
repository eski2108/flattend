"""Admin commands for Telegram bot"""

import logging
from telegram import Update
from telegram.ext import ContextTypes
import aiohttp
import motor.motor_asyncio
import os

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8001/api')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'coinhubx'

db_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = db_client[DB_NAME]

# Admin user IDs (set these)
ADMIN_IDS = [int(x) for x in os.getenv('ADMIN_TELEGRAM_IDS', '').split(',') if x]


def is_admin(user_id: int) -> bool:
    """Check if user is admin"""
    return user_id in ADMIN_IDS


async def ban_user_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ban a user - /ban [user_id] [reason]"""
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("Usage: /ban [user_id] [reason]")
        return
    
    user_id_to_ban = context.args[0]
    reason = ' '.join(context.args[1:]) if len(context.args) > 1 else "No reason provided"
    
    # Ban user in database
    result = await db.user_accounts.update_one(
        {"user_id": user_id_to_ban},
        {"$set": {
            "banned": True,
            "ban_reason": reason,
            "banned_by": update.effective_user.id,
            "banned_at": "now"
        }}
    )
    
    if result.modified_count > 0:
        # Log the action
        await db.bot_logs.insert_one({
            "action": "ban_user",
            "admin_id": update.effective_user.id,
            "target_user_id": user_id_to_ban,
            "reason": reason,
            "timestamp": "now"
        })
        
        await update.message.reply_text(
            f"✅ User `{user_id_to_ban}` has been banned.\nReason: {reason}",
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text("❌ User not found")


async def userinfo_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Get user info - /userinfo [user_id]"""
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("Usage: /userinfo [user_id]")
        return
    
    user_id = context.args[0]
    
    # Fetch user from database
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    if not user:
        await update.message.reply_text("❌ User not found")
        return
    
    # Format user info
    info_text = f"""
👤 **User Information**

**User ID:** `{user.get('user_id')}`
**Email:** {user.get('email')}
**Name:** {user.get('full_name', 'N/A')}
**Phone:** {user.get('phone_number', 'N/A')}
**KYC Status:** {user.get('kyc_status', 'Not verified')}
**Account Status:** {'Banned' if user.get('banned') else 'Active'}
**Golden Referrer:** {'Yes 🥇' if user.get('is_golden_referrer') else 'No'}
**Joined:** {user.get('created_at', 'N/A')}
    """
    
    await update.message.reply_text(info_text, parse_mode='Markdown')


async def order_details_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Get order details - /order [order_id]"""
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("Usage: /order [order_id]")
        return
    
    order_id = context.args[0]
    
    # Fetch order from database
    order = await db.p2p_orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        await update.message.reply_text("❌ Order not found")
        return
    
    # Format order info
    order_text = f"""
🏛 **P2P Order Details**

**Order ID:** `{order.get('order_id')}`
**Status:** {order.get('status')}
**Amount:** {order.get('fiat_amount')} {order.get('fiat_currency')}
**Crypto:** {order.get('crypto_amount')} {order.get('crypto_currency')}
**Buyer:** {order.get('buyer_id')}
**Seller:** {order.get('seller_id')}
**Created:** {order.get('created_at')}
**Payment Method:** {order.get('payment_method', 'N/A')}
    """
    
    await update.message.reply_text(order_text, parse_mode='Markdown')


async def resolve_dispute_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Resolve a dispute - /resolve [dispute_id] [resolution]"""
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    if len(context.args) < 2:
        await update.message.reply_text(
            "Usage: /resolve [dispute_id] [resolution]\n"
            "Resolutions: release_to_buyer, release_to_seller, cancel_order"
        )
        return
    
    dispute_id = context.args[0]
    resolution = context.args[1]
    
    # Call backend API to resolve
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{BACKEND_URL}/admin/p2p/resolve-dispute",
                json={
                    "dispute_id": dispute_id,
                    "resolution": resolution,
                    "admin_id": str(update.effective_user.id)
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    await update.message.reply_text(
                        f"✅ Dispute `{dispute_id}` resolved: {resolution}",
                        parse_mode='Markdown'
                    )
                else:
                    await update.message.reply_text("❌ Failed to resolve dispute")
    except Exception as e:
        logger.error(f"Error resolving dispute: {e}")
        await update.message.reply_text("❌ Error resolving dispute")


async def open_orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """List open P2P orders - /openorders"""
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    # Fetch open orders
    orders = await db.p2p_orders.find(
        {"status": {"$in": ["pending", "payment_marked"]}}
    ).limit(10).to_list(10)
    
    if not orders:
        await update.message.reply_text("💭 No open orders")
        return
    
    orders_text = "🏛 **Open P2P Orders:**\n\n"
    
    for order in orders:
        orders_text += (
            f"`{order['order_id'][:8]}...` - "
            f"{order['fiat_amount']} {order['fiat_currency']} - "
            f"{order['status']}\n"
        )
    
    await update.message.reply_text(orders_text, parse_mode='Markdown')


async def revenue_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """View platform revenue - /revenue [timeframe]"""
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Admin access required")
        return
    
    timeframe = context.args[0] if context.args else 'all'
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}/admin/revenue/dashboard?timeframe={timeframe}") as response:
                if response.status == 200:
                    data = await response.json()
                    summary = data['summary']
                    
                    revenue_text = f"""
📊 **Platform Revenue ({timeframe.upper()})**

💰 **Total Revenue:** £{summary['total_revenue_gbp']:.2f}
👥 **Referral Paid:** £{summary['referral_commissions_paid_gbp']:.2f}
💵 **Net Profit:** £{summary['net_revenue_gbp']:.2f}
📝 **Transactions:** {summary['total_transactions']}
                    """
                    
                    await update.message.reply_text(revenue_text, parse_mode='Markdown')
                else:
                    await update.message.reply_text("❌ Failed to fetch revenue data")
    except Exception as e:
        logger.error(f"Error fetching revenue: {e}")
        await update.message.reply_text("❌ Error fetching revenue data")
