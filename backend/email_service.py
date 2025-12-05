from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os
from typing import Optional
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# 🔒 LOCKED: Admin email configuration - DO NOT MODIFY
# Email is now loaded from database admin_settings collection
# Default fallback if database unavailable
ADMIN_EMAIL_FALLBACK = "info@coinhubx.net"
# 🔒 END LOCKED SECTION

class EmailService:
    def __init__(self, api_key: Optional[str] = None, sender_email: Optional[str] = None):
        self.api_key = api_key or os.getenv('SENDGRID_API_KEY')
        self.sender_email = sender_email or os.getenv('SENDER_EMAIL', 'noreply@cryptobank.com')
        self.enabled = bool(self.api_key)
        
        if not self.enabled:
            logger.warning("SendGrid API key not configured. Email notifications disabled.")
    
    async def send_email(self, to_email: str, subject: str, html_content: str):
        """Send an email via SendGrid"""
        if not self.enabled:
            logger.info(f"Email not sent (service disabled): {subject} to {to_email}")
            return False
        
        try:
            message = Mail(
                from_email=self.sender_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            logger.info(f"Email sent successfully: {subject} to {to_email}")
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    async def send_welcome_email(self, user_email: str, user_name: str):
        """Send welcome email after signup"""
        subject = "Welcome to CryptoBank!"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e40af;">Welcome to CryptoBank, {user_name}!</h2>
                    <p>Thank you for signing up with CryptoBank - Your Digital Crypto Bank.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Store your cryptocurrency securely</li>
                        <li>Make instant deposits and withdrawals</li>
                        <li>Track all your transactions in one place</li>
                    </ul>
                    <p>Get started by completing your wallet setup and making your first deposit.</p>
                    <p style="margin-top: 30px;">
                        <strong>Questions?</strong> Contact us anytime at support@cryptobank.com
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 40px;">
                        © 2025 CryptoBank. All rights reserved.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Send to user
        await self.send_email(user_email, subject, html_content)
        
        # Notify admin
        admin_subject = f"New User Signup: {user_name}"
        admin_html = f"""
        <html>
            <body>
                <h3>New User Registration</h3>
                <p><strong>Name:</strong> {user_name}</p>
                <p><strong>Email:</strong> {user_email}</p>
            </body>
        </html>
        """
        await self.send_email(ADMIN_EMAIL, admin_subject, admin_html)
    
    async def send_dispute_alert_to_admin(self, trade_id: str, dispute_id: str, buyer_id: str, seller_id: str, amount: float, currency: str, reason: str, description: str, initiated_by: str):
        """Send urgent dispute alert to admin"""
        # 🔒 LOCKED: Load admin email from database
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        try:
            client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
            settings = await client[os.getenv('DB_NAME', 'coinhubx')].admin_settings.find_one({"setting_type": "general"}, {"_id": 0})
            admin_email = settings.get("dispute_email") if settings else ADMIN_EMAIL_FALLBACK
            logger.info(f"Using dispute email: {admin_email}")
        except Exception as e:
            logger.warning(f"Failed to load dispute email from DB, using fallback: {str(e)}")
            admin_email = ADMIN_EMAIL_FALLBACK
        # 🔒 END LOCKED SECTION
        
        subject = f"🚨 URGENT: P2P Trade Dispute - {trade_id}"
        
        dispute_time = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 700px; margin: 0 auto; padding: 20px; border: 3px solid #EF4444;">
                    <div style="background: #EF4444; color: white; padding: 15px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
                        <h2 style="margin: 0; font-size: 24px;">🚨 P2P TRADE DISPUTE ALERT</h2>
                    </div>
                    
                    <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 20px;">
                        <p style="margin: 0; font-weight: bold; color: #EF4444; font-size: 16px;">
                            ⚠️ IMMEDIATE ACTION REQUIRED
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">
                            A P2P trade has been escalated to dispute. Review and resolve immediately.
                        </p>
                    </div>
                    
                    <h3 style="color: #1F2937; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
                        Dispute Details
                    </h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr style="background: #F9FAFB;">
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB; width: 40%;">Dispute ID:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB; font-family: monospace; color: #EF4444;">{dispute_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB;">Trade ID:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB; font-family: monospace;">{trade_id}</td>
                        </tr>
                        <tr style="background: #F9FAFB;">
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB;">Time of Dispute:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB;">{dispute_time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB;">Trade Amount:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB; font-size: 18px; font-weight: bold; color: #16A34A;">{amount} {currency}</td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #1F2937; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
                        Parties Involved
                    </h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr style="background: #F9FAFB;">
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB; width: 40%;">Buyer ID:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB; font-family: monospace;">{buyer_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB;">Seller ID:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB; font-family: monospace;">{seller_id}</td>
                        </tr>
                        <tr style="background: #FEF2F2;">
                            <td style="padding: 12px; font-weight: bold; border: 1px solid #E5E7EB;">Initiated By:</td>
                            <td style="padding: 12px; border: 1px solid #E5E7EB; font-family: monospace; color: #EF4444; font-weight: bold;">{initiated_by}</td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #1F2937; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
                        Dispute Reason
                    </h3>
                    
                    <div style="background: #FEF2F2; border: 1px solid #FCA5A5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> {reason}</p>
                        <p style="margin: 0;"><strong>Description:</strong></p>
                        <p style="margin: 5px 0 0 0; white-space: pre-wrap;">{description}</p>
                    </div>
                    
                    <div style="background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold;">🎯 Action Required:</p>
                        <ol style="margin: 10px 0 0 20px; padding: 0;">
                            <li>Review trade chat history and evidence</li>
                            <li>Contact both parties if needed</li>
                            <li>Determine resolution (release crypto or refund)</li>
                            <li>Execute decision in admin panel</li>
                        </ol>
                    </div>
                    
                    <!-- Red Action Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                            <td align="center">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" bgcolor="#EF4444" style="border-radius: 8px;">
                                            <a href="https://tradefix-preview.preview.emergentagent.com/admin/disputes/{dispute_id}" 
                                               target="_blank"
                                               style="font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none; padding: 15px 40px; display: inline-block; border-radius: 8px;">
                                                🚨 RESOLVE DISPUTE NOW →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Copyable Direct Link Box -->
                    <div style="background: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400E; font-weight: bold; text-align: center;">
                            📋 COPY & SHARE THIS LINK WITH YOUR TEAM:
                        </p>
                        <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #D97706;">
                            <p style="margin: 0; font-size: 13px; color: #1F2937; word-break: break-all; text-align: center; font-family: monospace;">
                                https://tradefix-preview.preview.emergentagent.com/admin/disputes/{dispute_id}
                            </p>
                        </div>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400E; text-align: center;">
                            Click anywhere on the link above to select and copy
                        </p>
                    </div>
                    
                    <!-- Alternative Text Link (if button doesn't work) -->
                    <p style="text-align: center; margin: 20px 0; font-size: 13px; color: #6B7280;">
                        Button not working? Click here: 
                        <a href="https://tradefix-preview.preview.emergentagent.com/admin/disputes/{dispute_id}" 
                           style="color: #EF4444; font-weight: bold; text-decoration: underline;">
                            Open Dispute #{dispute_id}
                        </a>
                    </p>
                    
                    <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0; font-size: 12px; color: #6B7280;">
                            <strong>Note:</strong> This is an automated alert. Funds are currently held in escrow and will remain frozen until you resolve this dispute. Fast resolution is critical to maintain platform trust.
                        </p>
                    </div>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
                        © 2025 Coin Hub X. All rights reserved.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Send to admin email
        success = await self.send_email(admin_email, subject, html_content)
        
        if success:
            logger.info(f"✅ Admin dispute alert sent to {admin_email} for {dispute_id}")
        else:
            logger.error(f"❌ Failed to send admin dispute alert to {admin_email} for {dispute_id}")
        
        return success
    
    async def send_deposit_notification(self, user_email: str, user_name: str, amount: float, currency: str, transaction_id: str):
        """Send notification for successful deposit"""
        from datetime import datetime, timezone
        
        subject = f"Deposit Confirmed: {amount} {currency}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #16a34a;">Deposit Successful!</h2>
                    <p>Hi {user_name},</p>
                    <p>Your deposit has been successfully processed.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Amount:</strong> {amount} {currency}</p>
                        <p style="margin: 5px 0;"><strong>Transaction ID:</strong> {transaction_id}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> Completed</p>
                    </div>
                    <p>Your new balance is now available in your wallet.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 40px;">
                        © 2025 CryptoBank. All rights reserved.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Send to user
        await self.send_email(user_email, subject, html_content)
        
        # Notify admin
        admin_subject = f"Deposit: {amount} {currency} by {user_name}"
        admin_html = f"""
        <html>
            <body>
                <h3>New Deposit</h3>
                <p><strong>User:</strong> {user_name} ({user_email})</p>
                <p><strong>Amount:</strong> {amount} {currency}</p>
                <p><strong>Transaction ID:</strong> {transaction_id}</p>
            </body>
        </html>
        """
        await self.send_email(ADMIN_EMAIL, admin_subject, admin_html)
    
    async def send_withdrawal_notification(self, user_email: str, user_name: str, amount: float, currency: str, transaction_id: str, wallet_address: str):
        """Send notification for successful withdrawal"""
        subject = f"Withdrawal Confirmed: {amount} {currency}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Withdrawal Processed</h2>
                    <p>Hi {user_name},</p>
                    <p>Your withdrawal request has been successfully processed.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Amount:</strong> {amount} {currency}</p>
                        <p style="margin: 5px 0;"><strong>Destination:</strong> {wallet_address[:10]}...{wallet_address[-10:]}</p>
                        <p style="margin: 5px 0;"><strong>Transaction ID:</strong> {transaction_id}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> Completed</p>
                    </div>
                    <p>Please allow a few minutes for the transaction to be confirmed on the blockchain.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 40px;">
                        © 2025 CryptoBank. All rights reserved.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Send to user
        await self.send_email(user_email, subject, html_content)
        
        # Notify admin
        admin_subject = f"Withdrawal: {amount} {currency} by {user_name}"
        admin_html = f"""
        <html>
            <body>
                <h3>New Withdrawal</h3>
                <p><strong>User:</strong> {user_name} ({user_email})</p>
                <p><strong>Amount:</strong> {amount} {currency}</p>
                <p><strong>Destination:</strong> {wallet_address}</p>
                <p><strong>Transaction ID:</strong> {transaction_id}</p>
            </body>
        </html>
        """
        await self.send_email(ADMIN_EMAIL, admin_subject, admin_html)
    
    async def send_failed_transaction_notification(self, user_email: str, user_name: str, transaction_type: str, reason: str):
        """Send notification for failed transaction"""
        subject = f"Transaction Failed: {transaction_type.capitalize()}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Transaction Failed</h2>
                    <p>Hi {user_name},</p>
                    <p>We're sorry, but your {transaction_type} request could not be processed.</p>
                    <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Reason:</strong> {reason}</p>
                    </div>
                    <p>Please try again or contact support if the problem persists.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 40px;">
                        © 2025 CryptoBank. All rights reserved.
                    </p>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_login_security_alert(
        self, 
        user_email: str, 
        user_name: str, 
        timestamp: str, 
        ip_address: str, 
        device_info: str,
        location: Optional[str] = None
    ):
        """Send security alert for new login"""
        subject = "New login to your CoinHub X account"
        
        location_html = f"<p style='margin: 5px 0;'><strong>Location:</strong> {location}</p>" if location else ""
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #1e293b; margin-top: 0;">New Login Detected</h2>
                        <p>Hi {user_name},</p>
                        <p>There was a new login to your CoinHub X account.</p>
                        
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00F0FF;">
                            <h3 style="margin-top: 0; color: #0369a1;">Login Details:</h3>
                            <p style="margin: 5px 0;"><strong>Date & Time:</strong> {timestamp}</p>
                            <p style="margin: 5px 0;"><strong>IP Address:</strong> {ip_address}</p>
                            <p style="margin: 5px 0;"><strong>Device / Browser:</strong> {device_info}</p>
                            {location_html}
                        </div>
                        
                        <p style="font-size: 14px; color: #64748b;">
                            <strong>If this was you,</strong> no action is needed. You can safely ignore this email.
                        </p>
                        
                        <p style="font-size: 14px; color: #dc2626; margin-top: 20px;">
                            <strong>If this wasn't you,</strong> please secure your account immediately.
                        </p>
                        
                        <div style="margin: 30px 0; text-align: center;">
                            <a href="https://coinhubx.com/settings" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #EF4444, #DC2626); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">
                                🔒 Secure My Account
                            </a>
                            <a href="https://coinhubx.com/forgot-password" style="display: inline-block; padding: 12px 30px; background: #64748b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                Change Password
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            If you didn't sign in, your password may be compromised. Please change it immediately and enable two-factor authentication.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            Need help? Contact us at <a href="mailto:support@coinhubx.net" style="color: #00F0FF;">support@coinhubx.net</a>
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Text version for email clients that don't support HTML
        text_content = f"""
        New Login to Your CoinHub X Account
        
        Hi {user_name},
        
        There was a new login to your CoinHub X account.
        
        Login Details:
        - Date & Time: {timestamp}
        - IP Address: {ip_address}
        - Device / Browser: {device_info}
        {f'- Location: {location}' if location else ''}
        
        If this was you, no action is needed.
        
        If this wasn't you, please secure your account immediately by visiting:
        https://coinhubx.com/settings
        
        Or change your password at:
        https://coinhubx.com/forgot-password
        
        Need help? Contact support@coinhubx.net
        
        © 2025 CoinHub X. All rights reserved.
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_deposit_confirmation(
        self,
        user_email: str,
        user_name: str,
        amount: float,
        coin: str,
        tx_hash: Optional[str],
        updated_balance: float
    ):
        """Send deposit confirmation email"""
        subject = f"✅ Deposit Confirmed: {amount} {coin}"
        
        coin_icons = {
            'BTC': '₿',
            'ETH': 'Ξ',
            'USDT': '₮',
            'BNB': 'B',
            'SOL': 'S',
            'LTC': 'Ł'
        }
        coin_icon = coin_icons.get(coin.upper(), '●')
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #22C55E, #16A34A); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 15px;">
                                ✓
                            </div>
                            <h2 style="color: #16A34A; margin: 0;">Deposit Confirmed!</h2>
                        </div>
                        
                        <p>Hi {user_name},</p>
                        <p>Your deposit has been successfully confirmed and credited to your account.</p>
                        
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #22C55E;">
                            <h3 style="margin-top: 0; color: #16A34A; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 24px;">{coin_icon}</span>
                                Deposit Details
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1e293b;">{amount} {coin}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Updated Balance:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">{updated_balance} {coin}</td>
                                </tr>
                                {f'<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction Hash:</td><td style="padding: 8px 0; text-align: right; font-size: 11px; word-break: break-all; color: #64748b;">{tx_hash}</td></tr>' if tx_hash else ''}
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/wallet" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Wallet →
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            Your funds are now available for trading, swapping, or withdrawal.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            Need help? Contact us at <a href="mailto:support@coinhubx.net" style="color: #00F0FF;">support@coinhubx.net</a>
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_withdrawal_confirmation(
        self,
        user_email: str,
        user_name: str,
        amount: float,
        coin: str,
        tx_hash: Optional[str],
        status: str,
        wallet_address: str
    ):
        """Send withdrawal confirmation email"""
        subject = f"💸 Withdrawal {status.title()}: {amount} {coin}"
        
        coin_icons = {
            'BTC': '₿',
            'ETH': 'Ξ',
            'USDT': '₮',
            'BNB': 'B',
            'SOL': 'S',
            'LTC': 'Ł'
        }
        coin_icon = coin_icons.get(coin.upper(), '●')
        
        status_colors = {
            'pending': '#F59E0B',
            'processing': '#3B82F6',
            'completed': '#22C55E',
            'approved': '#22C55E'
        }
        status_color = status_colors.get(status.lower(), '#64748B')
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, {status_color}, {status_color}88); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 15px;">
                                💸
                            </div>
                            <h2 style="color: {status_color}; margin: 0;">Withdrawal {status.title()}</h2>
                        </div>
                        
                        <p>Hi {user_name},</p>
                        <p>Your withdrawal request has been {status.lower()}.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid {status_color};">
                            <h3 style="margin-top: 0; color: {status_color}; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 24px;">{coin_icon}</span>
                                Withdrawal Details
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1e293b;">{amount} {coin}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: {status_color};">{status.title()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Destination:</td>
                                    <td style="padding: 8px 0; text-align: right; font-size: 11px; word-break: break-all; color: #64748b;">{wallet_address[:12]}...{wallet_address[-8:]}</td>
                                </tr>
                                {f'<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction Hash:</td><td style="padding: 8px 0; text-align: right; font-size: 11px; word-break: break-all; color: #64748b;">{tx_hash}</td></tr>' if tx_hash else ''}
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/my-orders" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Transaction History →
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            {f"Please allow a few minutes for the transaction to be confirmed on the blockchain." if status.lower() == 'completed' else "We'll notify you once your withdrawal is processed."}
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            Need help? Contact us at <a href="mailto:support@coinhubx.net" style="color: #00F0FF;">support@coinhubx.net</a>
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_p2p_order_created(
        self,
        user_email: str,
        user_name: str,
        order_id: str,
        role: str,  # 'buyer' or 'seller'
        amount: float,
        coin: str,
        fiat_amount: float,
        fiat_currency: str
    ):
        """Send P2P order created notification"""
        subject = f"🤝 New P2P Order Created - {amount} {coin}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #3B82F6; margin-top: 0;">New P2P Order Created</h2>
                        
                        <p>Hi {user_name},</p>
                        <p>A new P2P {'purchase' if role == 'buyer' else 'sale'} order has been created.</p>
                        
                        <div style="background: #eff6ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                            <h3 style="margin-top: 0; color: #3B82F6;">Order Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order ID:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1e293b;">{order_id[:12]}...</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1e293b;">{amount} {coin}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Total:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1e293b;">{fiat_amount} {fiat_currency}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Your Role:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #3B82F6;">{role.title()}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/my-orders" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Order Details →
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            {'Please complete payment within the specified time limit.' if role == 'buyer' else 'Please wait for the buyer to complete payment.'}
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_p2p_payment_marked(
        self,
        user_email: str,
        user_name: str,
        order_id: str,
        amount: float,
        coin: str
    ):
        """Send notification when buyer marks payment as complete"""
        subject = f"✓ Payment Marked Complete - Order {order_id[:8]}..."
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #F59E0B; margin-top: 0;">⏳ Payment Marked as Complete</h2>
                        
                        <p>Hi {user_name},</p>
                        <p>The buyer has marked the payment as complete for order <strong>{order_id[:12]}...</strong></p>
                        
                        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                            <h3 style="margin-top: 0; color: #F59E0B;">Action Required</h3>
                            <p style="margin: 0; color: #92400e;">Please verify the payment in your account and release the crypto to complete the trade.</p>
                            <p style="margin: 10px 0 0; font-weight: 700; color: #1e293b;">Amount: {amount} {coin}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/my-orders" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                Release Crypto →
                            </a>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_p2p_crypto_released(
        self,
        user_email: str,
        user_name: str,
        order_id: str,
        amount: float,
        coin: str
    ):
        """Send notification when seller releases crypto"""
        subject = f"✅ Crypto Released - Order {order_id[:8]}... Complete!"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #22C55E, #16A34A); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 15px;">
                                ✓
                            </div>
                            <h2 style="color: #22C55E; margin: 0;">Trade Complete!</h2>
                        </div>
                        
                        <p>Hi {user_name},</p>
                        <p>Great news! The seller has released <strong>{amount} {coin}</strong> to your wallet.</p>
                        
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #22C55E;">
                            <p style="margin: 0; color: #166534; font-weight: 600;">Order ID: {order_id[:12]}...</p>
                            <p style="margin: 10px 0 0; font-weight: 700; font-size: 18px; color: #22C55E;">{amount} {coin}</p>
                            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Added to your wallet</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/wallet" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Wallet →
                            </a>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_p2p_order_cancelled(
        self,
        user_email: str,
        user_name: str,
        order_id: str,
        reason: str
    ):
        """Send notification when P2P order is cancelled"""
        subject = f"❌ Order Cancelled - {order_id[:8]}..."
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #EF4444; margin-top: 0;">Order Cancelled</h2>
                        
                        <p>Hi {user_name},</p>
                        <p>Order <strong>{order_id[:12]}...</strong> has been cancelled.</p>
                        
                        <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #EF4444;">
                            <h3 style="margin-top: 0; color: #EF4444;">Cancellation Reason</h3>
                            <p style="margin: 0; color: #991b1b;">{reason}</p>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8;">Any locked funds have been returned to your wallet.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/p2p-marketplace" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                Browse Marketplace →
                            </a>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_swap_confirmation(
        self,
        user_email: str,
        user_name: str,
        from_coin: str,
        from_amount: float,
        to_coin: str,
        to_amount: float,
        rate: float
    ):
        """Send swap confirmation email"""
        subject = f"🔄 Swap Complete: {from_amount} {from_coin} → {to_amount} {to_coin}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #A855F7, #7C3AED); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 15px;">
                                🔄
                            </div>
                            <h2 style="color: #A855F7; margin: 0;">Swap Successful!</h2>
                        </div>
                        
                        <p>Hi {user_name},</p>
                        <p>Your crypto swap has been executed successfully.</p>
                        
                        <div style="background: #faf5ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #A855F7;">
                            <h3 style="margin-top: 0; color: #A855F7;">Swap Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-weight: 600;">From:</td>
                                    <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #EF4444; font-size: 18px;">{from_amount} {from_coin}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="text-align: center; padding: 8px 0;">
                                        <div style="font-size: 24px; color: #A855F7;">↓</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-weight: 600;">To:</td>
                                    <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #22C55E; font-size: 18px;">{to_amount} {to_coin}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 16px;">Exchange Rate:</td>
                                    <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">1 {from_coin} = {rate:.6f} {to_coin}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/wallet" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Wallet →
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            Your {to_coin} balance has been updated and is ready to use.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_staking_confirmation(
        self,
        user_email: str,
        user_name: str,
        action: str,  # 'staked', 'unstaked', 'claimed'
        amount: float,
        coin: str,
        apr: Optional[float] = None,
        updated_staking_balance: Optional[float] = None
    ):
        """Send staking action confirmation email"""
        action_titles = {
            'staked': '🔒 Staking Confirmed',
            'unstaked': '🔓 Unstaking Complete',
            'claimed': '💰 Rewards Claimed'
        }
        subject = f"{action_titles.get(action, 'Staking Update')}: {amount} {coin}"
        
        action_colors = {
            'staked': '#3B82F6',
            'unstaked': '#F59E0B',
            'claimed': '#22C55E'
        }
        color = action_colors.get(action, '#A855F7')
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h2 style="color: {color}; margin: 0;">{action_titles.get(action, 'Staking Update')}</h2>
                        </div>
                        
                        <p>Hi {user_name},</p>
                        <p>Your staking {action} has been processed successfully.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid {color};">
                            <h3 style="margin-top: 0; color: {color};">Transaction Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1e293b;">{amount} {coin}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Action:</td>
                                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: {color};">{action.title()}</td>
                                </tr>
                                {f'<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">APR:</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">{apr}%</td></tr>' if apr else ''}
                                {f'<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Staked Balance:</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: {color};">{updated_staking_balance} {coin}</td></tr>' if updated_staking_balance is not None else ''}
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/staking" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Staking Dashboard →
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            {'Start earning rewards on your staked crypto!' if action == 'staked' else 'Your funds are now available in your wallet.' if action == 'unstaked' else 'Your rewards have been added to your wallet.'}
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_dispute_notification(
        self,
        user_email: str,
        user_name: str,
        action: str,  # 'opened', 'message', 'resolved'
        order_id: str,
        message: Optional[str] = None,
        resolution: Optional[str] = None
    ):
        """Send dispute-related notification"""
        action_titles = {
            'opened': '⚠️ Dispute Opened',
            'message': '💬 New Dispute Message',
            'resolved': '✅ Dispute Resolved'
        }
        subject = f"{action_titles.get(action, 'Dispute Update')} - Order {order_id[:8]}..."
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #EF4444; margin-top: 0;">{action_titles.get(action, 'Dispute Update')}</h2>
                        
                        <p>Hi {user_name},</p>
                        <p>{'A dispute has been opened for' if action == 'opened' else 'There is a new message in the dispute for' if action == 'message' else 'The dispute has been resolved for'} order <strong>{order_id[:12]}...</strong></p>
                        
                        {f'<div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #EF4444;"><p style="margin: 0; color: #991b1b;">{message}</p></div>' if message else ''}
                        {f'<div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #22C55E;"><h3 style="margin-top: 0; color: #22C55E;">Resolution</h3><p style="margin: 0; color: #166534;">{resolution}</p></div>' if resolution else ''}
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://coinhubx.com/disputes" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                View Dispute →
                            </a>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            Our support team is here to help resolve this matter fairly.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)
    
    async def send_admin_broadcast(
        self,
        user_email: str,
        user_name: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None
    ):
        """Send admin broadcast announcement"""
        subject = f"📢 {title}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #00F0FF; margin: 0;">CoinHub X</h1>
                        <p style="color: #A855F7; font-size: 14px; font-weight: 600; margin: 5px 0;">Platform Announcement</p>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #A855F7; margin-top: 0;">{title}</h2>
                        
                        <p>Hi {user_name},</p>
                        
                        <div style="background: #faf5ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #A855F7;">
                            <p style="margin: 0; color: #1e293b; line-height: 1.8;">{message}</p>
                        </div>
                        
                        {f'<div style="text-align: center; margin: 30px 0;"><a href="{action_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">{action_text} →</a></div>' if action_url and action_text else ''}
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                            © 2025 CoinHub X. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        await self.send_email(user_email, subject, html_content)


# Create a global instance
email_service = EmailService()


# P2P Email Templates
def p2p_payment_marked_email(trade_id: str, crypto_amount: float, crypto: str, fiat_amount: float, buyer_username: str):
    """Email template for seller when buyer marks payment"""
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0A1929; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #051018 0%, #0A1929 100%); border: 1px solid #00C6FF; border-radius: 12px; padding: 30px;">
            <h2 style="color: #00C6FF;">💳 Payment Marked as Sent</h2>
            <p>Hello,</p>
            <p><strong>{buyer_username}</strong> has marked payment as sent for your P2P trade.</p>
            
            <div style="background: rgba(0, 198, 255, 0.1); border-left: 4px solid #00C6FF; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Trade ID:</strong> {trade_id}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> {crypto_amount} {crypto}</p>
                <p style="margin: 5px 0;"><strong>Fiat Value:</strong> £{fiat_amount:.2f}</p>
            </div>
            
            <p style="color: #FFA500;"><strong>⚠️ Action Required:</strong></p>
            <p>Please verify the payment in your bank account and release the crypto.</p>
            
            <a href="https://tradefix-preview.preview.emergentagent.com/p2p/order/{trade_id}" 
               style="display: inline-block; background: linear-gradient(135deg, #22C55E, #16A34A); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
                View Order
            </a>
            
            <p style="margin-top: 30px; font-size: 12px; color: #8F9BB3;">
                This is an automated email from CoinHubX P2P Marketplace.
            </p>
        </div>
    </body>
    </html>
    """


def p2p_crypto_released_email(trade_id: str, crypto_amount: float, crypto: str, seller_username: str):
    """Email template for buyer when seller releases crypto"""
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0A1929; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #051018 0%, #0A1929 100%); border: 1px solid #22C55E; border-radius: 12px; padding: 30px;">
            <h2 style="color: #22C55E;">✅ Trade Completed!</h2>
            <p>Congratulations!</p>
            <p><strong>{seller_username}</strong> has released the crypto for your P2P trade.</p>
            
            <div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22C55E; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Trade ID:</strong> {trade_id}</p>
                <p style="margin: 5px 0;"><strong>Received:</strong> {crypto_amount} {crypto}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> COMPLETED</p>
            </div>
            
            <p>The {crypto} has been added to your wallet. You can now use or withdraw it.</p>
            
            <a href="https://tradefix-preview.preview.emergentagent.com/p2p/order/{trade_id}" 
               style="display: inline-block; background: linear-gradient(135deg, #00C6FF, #0096CC); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
                View Receipt
            </a>
            
            <p style="margin-top: 30px; font-size: 12px; color: #8F9BB3;">
                This is an automated email from CoinHubX P2P Marketplace.
            </p>
        </div>
    </body>
    </html>
    """


def p2p_dispute_opened_email(trade_id: str, crypto_amount: float, crypto: str, role: str):
    """Email template when dispute is opened"""
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0A1929; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #051018 0%, #0A1929 100%); border: 1px solid #EF4444; border-radius: 12px; padding: 30px;">
            <h2 style="color: #EF4444;">⚠️ Dispute Opened</h2>
            <p>A dispute has been opened for your P2P trade.</p>
            
            <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Trade ID:</strong> {trade_id}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> {crypto_amount} {crypto}</p>
                <p style="margin: 5px 0;"><strong>Your Role:</strong> {role}</p>
            </div>
            
            <p>Our admin team is reviewing the case. Please:</p>
            <ul>
                <li>Do NOT take any further action on the trade</li>
                <li>Respond to admin requests for information</li>
                <li>Provide any evidence (screenshots, receipts) in the chat</li>
            </ul>
            
            <a href="https://tradefix-preview.preview.emergentagent.com/p2p/order/{trade_id}" 
               style="display: inline-block; background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
                View Dispute
            </a>
            
            <p style="margin-top: 30px; font-size: 12px; color: #8F9BB3;">
                This is an automated email from CoinHubX P2P Marketplace.
            </p>
        </div>
    </body>
    </html>
    """


def p2p_admin_dispute_alert(trade_id: str, crypto_amount: float, crypto: str, buyer_id: str, seller_id: str, reported_by: str):
    """Email template for admin when dispute is opened"""
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0A1929; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #051018 0%, #0A1929 100%); border: 1px solid #FFA500; border-radius: 12px; padding: 30px;">
            <h2 style="color: #FFA500;">🚨 New P2P Dispute - Action Required</h2>
            <p><strong>Admin Alert:</strong> A new P2P dispute has been opened and requires review.</p>
            
            <div style="background: rgba(255, 165, 0, 0.1); border-left: 4px solid #FFA500; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Trade ID:</strong> {trade_id}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> {crypto_amount} {crypto}</p>
                <p style="margin: 5px 0;"><strong>Buyer:</strong> {buyer_id}</p>
                <p style="margin: 5px 0;"><strong>Seller:</strong> {seller_id}</p>
                <p style="margin: 5px 0;"><strong>Reported By:</strong> {reported_by}</p>
            </div>
            
            <p><strong>Required Actions:</strong></p>
            <ul>
                <li>Review trade details and chat history</li>
                <li>Request evidence from both parties if needed</li>
                <li>Resolve dispute in admin panel</li>
            </ul>
            
            <a href="https://tradefix-preview.preview.emergentagent.com/admin/disputes" 
               style="display: inline-block; background: linear-gradient(135deg, #FFA500, #FF8C00); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
                Go to Admin Panel
            </a>
            
            <p style="margin-top: 30px; font-size: 12px; color: #8F9BB3;">
                This is an automated admin alert from CoinHubX.
            </p>
        </div>
    </body>
    </html>
    """
