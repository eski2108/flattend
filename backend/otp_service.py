"""
SMS OTP Service using Twilio
Handles OTP generation, sending, and verification for sensitive actions
"""

import os
import logging
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from twilio.rest import Client
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

class OTPService:
    def __init__(self, db):
        self.db = db
        
        # Twilio credentials
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.verify_service_sid = os.getenv('TWILIO_VERIFY_SERVICE_SID')
        
        if not all([self.account_sid, self.auth_token, self.verify_service_sid]):
            raise ValueError("Missing Twilio credentials in environment")
        
        self.client = Client(self.account_sid, self.auth_token)
        
        # OTP settings
        self.otp_length = 6
        self.otp_expiry_minutes = 5
        self.max_attempts = 3
        
        logger.info("✅ OTP Service initialized with Twilio Verify")
    
    def generate_otp(self) -> str:
        """Generate 6-digit OTP"""
        return ''.join(secrets.choice(string.digits) for _ in range(self.otp_length))
    
    async def send_otp(self, user_id: str, phone_number: str, action: str) -> Dict:
        """
        Send OTP to user's phone via Twilio Verify
        
        Args:
            user_id: User ID
            phone_number: User's phone number (E.164 format: +44...)
            action: Action requiring OTP (withdrawal, escrow_release, etc.)
        
        Returns:
            Dict with success status and verification SID
        """
        try:
            # Use Twilio Verify API
            verification = self.client.verify.v2.services(
                self.verify_service_sid
            ).verifications.create(
                to=phone_number,
                channel='sms'
            )
            
            # Store OTP request in database
            await self.db.otp_verifications.insert_one({
                "user_id": user_id,
                "phone_number": phone_number,
                "action": action,
                "verification_sid": verification.sid,
                "status": "pending",
                "attempts": 0,
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=self.otp_expiry_minutes)
            })
            
            logger.info(f"✅ OTP sent to {phone_number} for action: {action}")
            
            return {
                "success": True,
                "verification_sid": verification.sid,
                "message": f"OTP sent to {phone_number[-4:]}",
                "expires_in_seconds": self.otp_expiry_minutes * 60
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to send OTP: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to send OTP: {str(e)}"
            }
    
    async def verify_otp(self, user_id: str, phone_number: str, otp_code: str, action: str) -> Dict:
        """
        Verify OTP code using Twilio Verify
        
        Args:
            user_id: User ID
            phone_number: User's phone number
            otp_code: OTP code entered by user
            action: Action being verified
        
        Returns:
            Dict with verification status
        """
        try:
            # Get pending verification from database
            verification_record = await self.db.otp_verifications.find_one({
                "user_id": user_id,
                "phone_number": phone_number,
                "action": action,
                "status": "pending"
            }, sort=[("created_at", -1)])
            
            if not verification_record:
                return {
                    "success": False,
                    "message": "No pending OTP verification found"
                }
            
            # Check expiry
            if datetime.now(timezone.utc) > verification_record["expires_at"]:
                await self.db.otp_verifications.update_one(
                    {"_id": verification_record["_id"]},
                    {"$set": {"status": "expired"}}
                )
                return {
                    "success": False,
                    "message": "OTP expired. Please request a new one"
                }
            
            # Check max attempts
            if verification_record["attempts"] >= self.max_attempts:
                await self.db.otp_verifications.update_one(
                    {"_id": verification_record["_id"]},
                    {"$set": {"status": "failed"}}
                )
                return {
                    "success": False,
                    "message": "Maximum attempts exceeded. Please request a new OTP"
                }
            
            # Verify OTP with Twilio
            verification_check = self.client.verify.v2.services(
                self.verify_service_sid
            ).verification_checks.create(
                to=phone_number,
                code=otp_code
            )
            
            # Update attempts
            await self.db.otp_verifications.update_one(
                {"_id": verification_record["_id"]},
                {"$inc": {"attempts": 1}}
            )
            
            if verification_check.status == "approved":
                # Mark as verified
                await self.db.otp_verifications.update_one(
                    {"_id": verification_record["_id"]},
                    {
                        "$set": {
                            "status": "verified",
                            "verified_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                logger.info(f"✅ OTP verified for {user_id} - Action: {action}")
                
                return {
                    "success": True,
                    "message": "OTP verified successfully"
                }
            else:
                logger.warning(f"⚠️ Invalid OTP for {user_id} - Action: {action}")
                return {
                    "success": False,
                    "message": "Invalid OTP code",
                    "attempts_remaining": self.max_attempts - (verification_record["attempts"] + 1)
                }
        
        except Exception as e:
            logger.error(f"❌ OTP verification error: {str(e)}")
            return {
                "success": False,
                "message": f"Verification failed: {str(e)}"
            }
    
    async def resend_otp(self, user_id: str, phone_number: str, action: str) -> Dict:
        """
        Resend OTP (invalidate old one and send new)
        """
        try:
            # Invalidate all pending OTPs for this user/action
            await self.db.otp_verifications.update_many(
                {
                    "user_id": user_id,
                    "action": action,
                    "status": "pending"
                },
                {"$set": {"status": "cancelled"}}
            )
            
            # Send new OTP
            return await self.send_otp(user_id, phone_number, action)
            
        except Exception as e:
            logger.error(f"❌ Failed to resend OTP: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to resend OTP: {str(e)}"
            }

# Global instance
otp_service = None

def get_otp_service(db):
    """Get or create OTP service instance"""
    global otp_service
    if otp_service is None:
        otp_service = OTPService(db)
    return otp_service
