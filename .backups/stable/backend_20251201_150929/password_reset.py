# Password Reset System
# Handles forgot password flow with email verification

import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from pydantic import BaseModel, EmailStr

class PasswordResetRequest(BaseModel):
    """Request to reset password"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token"""
    token: str
    new_password: str

def generate_reset_token() -> str:
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()

async def create_reset_token(db, email: str) -> Dict:
    """
    Create a password reset token for the given email.
    Token expires in 1 hour.
    """
    # Check if user exists
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Don't reveal if email exists or not (security)
        return {
            "success": True,
            "message": "If this email is registered, you will receive a password reset link.",
            "email_sent": False
        }
    
    # Generate token
    token = generate_reset_token()
    token_hash = hash_token(token)
    
    # Store reset token in database
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_reset_tokens.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "user_id": user["user_id"],
                "email": email,
                "token_hash": token_hash,
                "expires_at": expires_at,
                "used": False,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Password reset link sent to your email",
        "email_sent": True,
        "token": token,  # Return unhashed token for email
        "user_id": user["user_id"],
        "email": email
    }

async def verify_reset_token(db, token: str) -> Optional[Dict]:
    """
    Verify if reset token is valid and not expired.
    Returns user data if valid, None if invalid.
    """
    token_hash = hash_token(token)
    
    reset_record = await db.password_reset_tokens.find_one({
        "token_hash": token_hash,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_record:
        return None
    
    # Get user
    user = await db.users.find_one({"user_id": reset_record["user_id"]})
    
    return {
        "user_id": user["user_id"],
        "email": user["email"]
    }

async def reset_password_with_token(db, token: str, new_password: str) -> Dict:
    """
    Reset password using valid token.
    Marks token as used after successful reset.
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Verify token
    user_data = await verify_reset_token(db, token)
    
    if not user_data:
        return {
            "success": False,
            "message": "Invalid or expired reset token"
        }
    
    # Hash new password
    hashed_password = pwd_context.hash(new_password)
    
    # Update user password
    await db.users.update_one(
        {"user_id": user_data["user_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    # Mark token as used
    token_hash = hash_token(token)
    await db.password_reset_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "success": True,
        "message": "Password reset successfully. You can now log in with your new password."
    }

def generate_reset_email_html(token: str, base_url: str) -> str:
    """Generate branded HTML email for password reset"""
    reset_link = f"{base_url}/reset-password?token={token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #0a0e27;
                color: #ffffff;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
            }}
            .header {{
                text-align: center;
                padding: 30px 0;
                background: linear-gradient(135deg, #00F0FF, #A855F7);
                border-radius: 16px 16px 0 0;
            }}
            .logo {{
                font-size: 32px;
                font-weight: 900;
                color: #ffffff;
            }}
            .content {{
                background-color: #1a1f3a;
                padding: 40px 30px;
                border-radius: 0 0 16px 16px;
            }}
            .title {{
                font-size: 24px;
                font-weight: 700;
                color: #00F0FF;
                margin-bottom: 20px;
            }}
            .text {{
                font-size: 16px;
                line-height: 1.6;
                color: #cccccc;
                margin-bottom: 30px;
            }}
            .button {{
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #00F0FF, #A855F7);
                color: #ffffff;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 700;
                font-size: 16px;
                text-align: center;
            }}
            .link {{
                color: #00F0FF;
                word-break: break-all;
                font-size: 14px;
            }}
            .footer {{
                text-align: center;
                padding: 30px 0;
                color: #888888;
                font-size: 14px;
            }}
            .warning {{
                background-color: rgba(239, 68, 68, 0.1);
                border-left: 4px solid #EF4444;
                padding: 15px;
                margin: 20px 0;
                border-radius: 8px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐 COIN HUB X</div>
            </div>
            <div class="content">
                <div class="title">Reset Your Password</div>
                <div class="text">
                    We received a request to reset your password for your Coin Hub X account. 
                    Click the button below to create a new password:
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </div>
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong><br>
                    • This link will expire in 1 hour<br>
                    • If you didn't request this reset, please ignore this email<br>
                    • Never share this link with anyone
                </div>
                <div class="text" style="margin-top: 30px;">
                    Or copy and paste this link into your browser:
                </div>
                <div class="link">
                    {reset_link}
                </div>
            </div>
            <div class="footer">
                © 2025 Coin Hub X. All rights reserved.<br>
                If you have any questions, contact us at support@coinhubx.com
            </div>
        </div>
    </body>
    </html>
    """
    
    return html
