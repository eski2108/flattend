"""
Telegram Account Linking for CoinHubX

Secure one-time link system to connect user's Telegram to their CoinHubX account.
No passwords/emails typed in Telegram - uses signed tokens.
"""

import os
import hashlib
import hmac
import time
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict

logger = logging.getLogger('coin_hub_x')

# Secret for signing tokens (should be in env)
TELEGRAM_LINK_SECRET = os.environ.get('TELEGRAM_LINK_SECRET', 'coinhubx_tg_link_secret_change_me')


def generate_link_token(user_id: str, expires_minutes: int = 15) -> str:
    """
    Generate a secure one-time token for Telegram linking.
    Token expires after specified minutes.
    """
    timestamp = int(time.time())
    expiry = timestamp + (expires_minutes * 60)
    nonce = secrets.token_hex(8)
    
    # Create payload
    payload = f"{user_id}:{expiry}:{nonce}"
    
    # Sign it
    signature = hmac.new(
        TELEGRAM_LINK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()[:16]
    
    # Final token: base64-safe format
    token = f"{user_id}.{expiry}.{nonce}.{signature}"
    return token


def verify_link_token(token: str) -> Optional[str]:
    """
    Verify a Telegram link token.
    Returns user_id if valid, None if invalid/expired.
    """
    try:
        parts = token.split('.')
        if len(parts) != 4:
            return None
        
        user_id, expiry_str, nonce, signature = parts
        expiry = int(expiry_str)
        
        # Check expiry
        if time.time() > expiry:
            logger.warning(f"Telegram link token expired for user {user_id}")
            return None
        
        # Verify signature
        payload = f"{user_id}:{expiry}:{nonce}"
        expected_sig = hmac.new(
            TELEGRAM_LINK_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        
        if not hmac.compare_digest(signature, expected_sig):
            logger.warning(f"Invalid telegram link signature for user {user_id}")
            return None
        
        return user_id
        
    except Exception as e:
        logger.error(f"Error verifying telegram link token: {str(e)}")
        return None


def get_telegram_link_url(user_id: str, bot_username: str = "CoinHubX_UserBot") -> str:
    """
    Generate the full Telegram deep link URL for account linking.
    User clicks this in the CoinHubX app to open Telegram and link.
    """
    token = generate_link_token(user_id)
    # Telegram bot deep link with start parameter
    return f"https://t.me/{bot_username}?start={token}"


async def process_telegram_start(db, telegram_user_id: str, telegram_username: str, 
                                  start_param: str) -> Dict:
    """
    Process /start command from Telegram with link token.
    Called when user clicks the link and opens the bot.
    
    Returns dict with success status and message.
    """
    try:
        # Verify token
        user_id = verify_link_token(start_param)
        
        if not user_id:
            return {
                "success": False,
                "message": "Invalid or expired link. Please generate a new link from your CoinHubX account."
            }
        
        # Check if user exists
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            return {
                "success": False,
                "message": "User not found. Please log into CoinHubX first."
            }
        
        # Check if Telegram already linked to another account
        existing = await db.users.find_one({
            "telegram_chat_id": str(telegram_user_id),
            "user_id": {"$ne": user_id}
        })
        
        if existing:
            return {
                "success": False,
                "message": "This Telegram account is already linked to another CoinHubX account."
            }
        
        # Link the account
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "telegram_chat_id": str(telegram_user_id),
                    "telegram_username": telegram_username,
                    "telegram_linked_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"✅ Telegram linked: user {user_id} -> @{telegram_username} ({telegram_user_id})")
        
        return {
            "success": True,
            "message": f"✅ Success! Your Telegram is now linked to your CoinHubX account.\n\nYou'll receive P2P trade alerts, deposit notifications, and more right here.",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing telegram start: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred. Please try again."
        }


async def unlink_telegram(db, user_id: str) -> bool:
    """
    Unlink Telegram from user account
    """
    try:
        result = await db.users.update_one(
            {"user_id": user_id},
            {
                "$unset": {
                    "telegram_chat_id": "",
                    "telegram_username": "",
                    "telegram_linked_at": ""
                }
            }
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"❌ Error unlinking telegram for {user_id}: {str(e)}")
        return False
