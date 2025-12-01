import pyotp
import qrcode
import io
import base64
import secrets
import random
from datetime import datetime, timezone, timedelta
from typing import Optional, List

class TwoFactorAuthService:
    """Complete 2FA service with Google Authenticator and email fallback"""
    
    def __init__(self, db):
        self.db = db
        self.issuer_name = "CoinHubX"
    
    async def setup_2fa(self, user_id: str, email: str) -> dict:
        """Setup 2FA for user - generates secret and QR code"""
        try:
            # Generate secret key for TOTP
            secret = pyotp.random_base32()
            
            # Create TOTP URI for QR code
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=email,
                issuer_name=self.issuer_name
            )
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            # Generate backup codes (10 codes)
            backup_codes = [self._generate_backup_code() for _ in range(10)]
            
            # Store in database
            await self.db.two_factor_auth.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "secret": secret,
                        "enabled": False,  # Not enabled until verified
                        "backup_codes": backup_codes,
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            
            return {
                "success": True,
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_code_base64}",
                "backup_codes": backup_codes,
                "manual_entry_key": secret
            }
            
        except Exception as e:
            print(f"Error setting up 2FA: {e}")
            return {"success": False, "message": str(e)}
    
    async def verify_and_enable_2fa(self, user_id: str, code: str) -> dict:
        """Verify setup code and enable 2FA"""
        try:
            tfa_data = await self.db.two_factor_auth.find_one({"user_id": user_id}, {"_id": 0})
            if not tfa_data:
                return {"success": False, "message": "2FA not set up"}
            
            # Verify code
            totp = pyotp.TOTP(tfa_data["secret"])
            if totp.verify(code, valid_window=1):
                # Enable 2FA
                await self.db.two_factor_auth.update_one(
                    {"user_id": user_id},
                    {"$set": {"enabled": True, "updated_at": datetime.now(timezone.utc)}}
                )
                return {"success": True, "message": "2FA enabled successfully"}
            else:
                return {"success": False, "message": "Invalid code"}
                
        except Exception as e:
            print(f"Error verifying 2FA: {e}")
            return {"success": False, "message": str(e)}
    
    async def verify_2fa_code(self, user_id: str, code: str, allow_backup: bool = True) -> dict:
        """Verify 2FA code (TOTP or backup code)"""
        try:
            tfa_data = await self.db.two_factor_auth.find_one({"user_id": user_id})
            if not tfa_data or not tfa_data.get("enabled"):
                return {"success": True, "message": "2FA not enabled"}  # Allow if not enabled
            
            # Try TOTP first
            totp = pyotp.TOTP(tfa_data["secret"])
            if totp.verify(code, valid_window=1):
                return {"success": True, "method": "totp"}
            
            # Try backup codes if allowed
            if allow_backup and code in tfa_data.get("backup_codes", []):
                # Remove used backup code
                await self.db.two_factor_auth.update_one(
                    {"user_id": user_id},
                    {"$pull": {"backup_codes": code}}
                )
                return {"success": True, "method": "backup_code", "warning": "Backup code used"}
            
            return {"success": False, "message": "Invalid code"}
            
        except Exception as e:
            print(f"Error verifying 2FA code: {e}")
            return {"success": False, "message": str(e)}
    
    async def send_email_code(self, user_id: str, email: str, action: str = "login") -> dict:
        """Send 2FA code via email as fallback"""
        try:
            # Generate 6-digit code
            code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            # Store code with expiry (10 minutes)
            await self.db.email_2fa_codes.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "code": code,
                        "action": action,
                        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
                        "created_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            
            # TODO: Send email (integrate with email service)
            print(f"📧 Email 2FA code for {email}: {code} (action: {action})")
            
            return {
                "success": True,
                "message": "Code sent to your email",
                "code": code  # Remove in production
            }
            
        except Exception as e:
            print(f"Error sending email code: {e}")
            return {"success": False, "message": str(e)}
    
    async def verify_email_code(self, user_id: str, code: str) -> dict:
        """Verify email 2FA code"""
        try:
            code_data = await self.db.email_2fa_codes.find_one({"user_id": user_id})
            
            if not code_data:
                return {"success": False, "message": "No code found"}
            
            # Check expiry
            expires_at = code_data["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            elif expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) > expires_at:
                await self.db.email_2fa_codes.delete_one({"user_id": user_id})
                return {"success": False, "message": "Code expired"}
            
            # Verify code
            if code_data["code"] == code:
                # Delete used code
                await self.db.email_2fa_codes.delete_one({"user_id": user_id})
                return {"success": True, "method": "email"}
            else:
                return {"success": False, "message": "Invalid code"}
                
        except Exception as e:
            print(f"Error verifying email code: {e}")
            return {"success": False, "message": str(e)}
    
    async def is_2fa_enabled(self, user_id: str) -> bool:
        """Check if 2FA is enabled for user"""
        tfa_data = await self.db.two_factor_auth.find_one({"user_id": user_id})
        return tfa_data and tfa_data.get("enabled", False)
    
    async def disable_2fa(self, user_id: str) -> dict:
        """Disable 2FA for user"""
        try:
            result = await self.db.two_factor_auth.update_one(
                {"user_id": user_id},
                {"$set": {"enabled": False, "updated_at": datetime.now(timezone.utc)}}
            )
            
            if result.modified_count > 0:
                return {"success": True, "message": "2FA disabled"}
            else:
                return {"success": False, "message": "2FA not found"}
                
        except Exception as e:
            print(f"Error disabling 2FA: {e}")
            return {"success": False, "message": str(e)}
    
    async def regenerate_backup_codes(self, user_id: str) -> dict:
        """Generate new backup codes"""
        try:
            backup_codes = [self._generate_backup_code() for _ in range(10)]
            
            await self.db.two_factor_auth.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "backup_codes": backup_codes,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            return {"success": True, "backup_codes": backup_codes}
            
        except Exception as e:
            print(f"Error regenerating backup codes: {e}")
            return {"success": False, "message": str(e)}
    
    def _generate_backup_code(self) -> str:
        """Generate a single backup code (8 characters)"""
        return secrets.token_hex(4).upper()
    
    async def is_user_exempt_from_2fa(self, user_id: str, email: str) -> bool:
        """Check if user is exempt from 2FA (admin accounts)"""
        # Check if user is admin
        user = await self.db.users.find_one({"user_id": user_id})
        if user and user.get("role") == "admin":
            return True
        
        # Check specific admin emails
        admin_emails = [
            "admin@coinhubx.com",
            "support@coinhubx.com"
        ]
        if email.lower() in admin_emails:
            return True
        
        return False
