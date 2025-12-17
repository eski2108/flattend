"""NOWPayments Real Sync Integration

Automatically generates real deposit addresses and credits admin liquidity.
Replaces manual address generation with live payment gateway.

Created: 2025-12-03
Version: 1.0
"""

import aiohttp
import logging
import os
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger(__name__)

class NOWPaymentsRealSync:
    """
    Real NOWPayments integration for automatic deposit crediting.
    Replaces manual address generation with real payment gateway.
    """
    
    def __init__(self, db, api_key: str):
        self.db = db
        self.api_key = api_key
        self.base_url = "https://api.nowpayments.io/v1"
    
    async def verify_api_key(self) -> Dict:
        """Verify NOWPayments API key is valid"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"x-api-key": self.api_key}
                
                async with session.get(
                    f"{self.base_url}/status",
                    headers=headers
                ) as response:
                    data = await response.json()
                    
                    if response.status == 200 and data.get("message") == "OK":
                        return {
                            "success": True,
                            "message": "API key verified"
                        }
                    else:
                        return {
                            "success": False,
                            "message": "Invalid API key"
                        }
        except Exception as e:
            logger.error(f"API key verification failed: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def generate_deposit_address(self, currency: str) -> Dict:
        """
        Generate real deposit address via NOWPayments.
        """
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
                
                backend_url = os.getenv("REACT_APP_BACKEND_URL", "https://trading-rebuild.preview.emergentagent.com")
                
                # Create invoice for this currency
                payload = {
                    "price_amount": 0.001,  # Minimum amount
                    "price_currency": "usd",
                    "pay_currency": currency.lower(),
                    "ipn_callback_url": f"{backend_url}/api/webhooks/nowpayments",
                    "order_id": f"admin_deposit_{currency}_{int(datetime.now(timezone.utc).timestamp())}",
                    "order_description": f"Admin liquidity deposit - {currency}"
                }
                
                async with session.post(
                    f"{self.base_url}/invoice",
                    json=payload,
                    headers=headers
                ) as response:
                    data = await response.json()
                    
                    if response.status == 200:
                        logger.info(f"✅ Generated NOWPayments address for {currency}: {data.get('pay_address')}")
                        return {
                            "success": True,
                            "address": data.get("pay_address"),
                            "currency": currency,
                            "invoice_id": data.get("id"),
                            "invoice_url": data.get("invoice_url")
                        }
                    else:
                        logger.error(f"NOWPayments error: {data}")
                        return {
                            "success": False,
                            "message": data.get("message", "Failed to generate address")
                        }
        except Exception as e:
            logger.error(f"NOWPayments address generation failed: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def generate_all_addresses(self) -> Dict:
        """
        Generate deposit addresses for all supported currencies.
        """
        supported_currencies = [
            "BTC", "ETH", "LTC", "DOGE", "XRP",
            "ADA", "SOL", "MATIC", "BNB", "TRX",
            "USDT", "USDC", "DAI", "BUSD"
        ]
        
        addresses = {}
        errors = []
        
        for currency in supported_currencies:
            result = await self.generate_deposit_address(currency)
            if result["success"]:
                addresses[currency] = result["address"]
            else:
                errors.append(f"{currency}: {result['message']}")
        
        return {
            "success": len(addresses) > 0,
            "addresses": addresses,
            "errors": errors,
            "count": len(addresses)
        }
    
    def verify_webhook_signature(self, request_body: bytes, signature: str, ipn_secret: str) -> bool:
        """
        Verify NOWPayments webhook signature for security.
        """
        try:
            expected_signature = hmac.new(
                ipn_secret.encode('utf-8'),
                request_body,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Signature verification failed: {str(e)}")
            return False
    
    async def process_webhook(self, webhook_data: Dict, verify_signature: bool = True) -> Dict:
        """
        Process NOWPayments webhook for completed deposits.
        Automatically credits admin_liquidity_wallets.
        """
        try:
            payment_status = webhook_data.get("payment_status")
            
            # Only process finished/confirmed payments
            if payment_status not in ["finished", "confirmed"]:
                logger.info(f"Payment status {payment_status} - not processing yet")
                return {"success": True, "message": f"Payment status: {payment_status}"}
            
            payment_id = webhook_data.get("payment_id")
            invoice_id = webhook_data.get("invoice_id")
            
            # Check if already processed
            existing = await self.db.admin_deposits.find_one({
                "payment_id": payment_id,
                "source": "nowpayments"
            })
            
            if existing:
                logger.info(f"Payment {payment_id} already processed")
                return {"success": True, "message": "Already processed"}
            
            currency = webhook_data.get("pay_currency", "").upper()
            amount = float(webhook_data.get("pay_amount", 0))
            
            if not currency or amount <= 0:
                return {
                    "success": False,
                    "message": "Invalid currency or amount"
                }
            
            # 🔒 Credit admin liquidity (NO MINTING - real deposit)
            await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$inc": {"balance": amount, "available": amount},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Log deposit
            await self.db.admin_deposits.insert_one({
                "deposit_id": str(payment_id),
                "currency": currency,
                "amount": amount,
                "source": "nowpayments",
                "payment_id": payment_id,
                "invoice_id": invoice_id,
                "status": "completed",
                "type": "crypto_deposit",
                "from_address": webhook_data.get("payin_extra_id"),
                "to_address": webhook_data.get("pay_address"),
                "tx_hash": webhook_data.get("outcome_transaction_hash"),
                "network": webhook_data.get("network"),
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "webhook_data": webhook_data
            })
            
            logger.info(f"✅ NOWPayments deposit credited: {amount} {currency} (Payment: {payment_id})")
            
            return {
                "success": True,
                "message": f"Credited {amount} {currency} to admin liquidity",
                "payment_id": payment_id,
                "amount": amount,
                "currency": currency
            }
            
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def get_payment_status(self, payment_id: str) -> Dict:
        """
        Get payment status from NOWPayments.
        """
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"x-api-key": self.api_key}
                
                async with session.get(
                    f"{self.base_url}/payment/{payment_id}",
                    headers=headers
                ) as response:
                    data = await response.json()
                    
                    if response.status == 200:
                        return {
                            "success": True,
                            "payment": data
                        }
                    else:
                        return {
                            "success": False,
                            "message": data.get("message", "Failed to get payment")
                        }
        except Exception as e:
            logger.error(f"Get payment status failed: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
