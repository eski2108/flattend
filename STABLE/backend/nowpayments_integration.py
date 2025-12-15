"""
NOWPayments Integration - Production-Ready
Handles deposit address generation, webhook notifications, and balance updates
with full validation, error handling, and logging
"""

import os
import hmac
import hashlib
import requests
from typing import Dict, Optional, List
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

# Confirmation requirements by coin (blocks needed before crediting)
CONFIRMATION_REQUIREMENTS = {
    "btc": 2,
    "eth": 12,
    "usdt": 12,  # ERC20
    "ltc": 6,
    "bch": 6,
    "xrp": 1,
    "ada": 15,
    "default": 6
}

# Minimum deposit amounts (in USD equivalent)
MINIMUM_DEPOSIT_USD = {
    "btc": 20,
    "eth": 20,
    "usdt": 20,
    "default": 20
}

class NOWPaymentsService:
    """
    Production-ready NOWPayments integration
    All API calls include proper error handling and logging
    """
    
    BASE_URL = "https://api.nowpayments.io/v1"
    PAYOUT_BASE_URL = "https://api.nowpayments.io/v1/payout"
    
    def __init__(self):
        # Load from environment - never hardcode
        self.api_key = os.getenv('NOWPAYMENTS_API_KEY')
        self.ipn_secret = os.getenv('NOWPAYMENTS_IPN_SECRET')
        
        if not self.api_key:
            raise ValueError("NOWPAYMENTS_API_KEY not found in environment")
        if not self.ipn_secret:
            raise ValueError("NOWPAYMENTS_IPN_SECRET not found in environment")
        
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        logger.info("✅ NOWPayments service initialized")
    
    def get_available_currencies(self) -> list:
        """Get list of available cryptocurrencies"""
        try:
            response = requests.get(
                f"{self.BASE_URL}/currencies",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json().get('currencies', [])
        except Exception as e:
            logger.error(f"Failed to get currencies: {str(e)}")
            return []
    
    def get_minimum_amount(self, currency_from: str, currency_to: str = "usd") -> Optional[float]:
        """Get minimum payment amount for a currency pair"""
        try:
            response = requests.get(
                f"{self.BASE_URL}/min-amount",
                params={
                    "currency_from": currency_from,
                    "currency_to": currency_to
                },
                headers=self.headers
            )
            response.raise_for_status()
            return float(response.json().get('min_amount', 0))
        except Exception as e:
            logger.error(f"Failed to get minimum amount: {str(e)}")
            return None
    
    def create_payment(
        self,
        price_amount: float,
        price_currency: str,
        pay_currency: str,
        order_id: str,
        order_description: str = "Crypto deposit"
    ) -> Optional[Dict]:
        """
        Create a payment (generates deposit address)
        
        Args:
            price_amount: Amount user wants to deposit
            price_currency: Currency of the amount (e.g., "usd")
            pay_currency: Cryptocurrency to pay with (e.g., "btc", "eth")
            order_id: Unique order ID (user_id + timestamp)
            order_description: Description of the payment
        
        Returns:
            Dict with payment details including deposit address
        """
        try:
            # Get backend URL from environment
            backend_url = os.getenv('BACKEND_URL', 'https://neon-finance-5.preview.emergentagent.com')
            
            payload = {
                "price_amount": price_amount,
                "price_currency": price_currency,
                "pay_currency": pay_currency,
                "order_id": order_id,
                "order_description": order_description,
                "ipn_callback_url": f"{backend_url}/api/nowpayments/ipn"
            }
            
            # Log the payload for debugging
            logger.info(f"Creating payment with payload: {payload}")
            
            response = requests.post(
                f"{self.BASE_URL}/payment",
                json=payload,
                headers=self.headers
            )
            
            # Log the response for debugging (201 = Created, not 200)
            if response.status_code not in [200, 201]:
                logger.error(f"NOWPayments API error: Status {response.status_code}, Response: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Payment created: {result.get('payment_id')}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create payment: {str(e)}")
            # Log additional details for debugging
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    logger.error(f"API error details: {error_details}")
                except:
                    logger.error(f"API response text: {e.response.text if hasattr(e.response, 'text') else 'No response text'}")
            return None
    
    def get_payment_status(self, payment_id: str) -> Optional[Dict]:
        """Get payment status by payment ID"""
        try:
            response = requests.get(
                f"{self.BASE_URL}/payment/{payment_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get payment status: {str(e)}")
            return None
    
    def get_available_currencies(self) -> List[str]:
        """
        Get list of available cryptocurrencies from NOWPayments
        Returns: List of currency codes (lowercase)
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/currencies",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            currencies = response.json().get('currencies', [])
            logger.info(f"✅ Retrieved {len(currencies)} currencies from NOWPayments")
            return currencies
        except Exception as e:
            logger.error(f"❌ Failed to get currencies: {str(e)}")
            # Return fallback list
            return ['btc', 'eth', 'usdt', 'ltc', 'bch']
    
    def get_minimum_amount(self, currency_from: str, currency_to: str = "usd") -> float:
        """
        Get minimum payment amount for a currency pair
        Returns minimum in source currency units
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/min-amount",
                params={
                    "currency_from": currency_from.lower(),
                    "currency_to": currency_to.lower()
                },
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            min_amount = float(response.json().get('min_amount', 0))
            logger.info(f"✅ Minimum {currency_from.upper()}: {min_amount}")
            return min_amount
        except Exception as e:
            logger.error(f"❌ Failed to get minimum amount: {str(e)}")
            # Return sensible default based on coin
            return MINIMUM_DEPOSIT_USD.get(currency_from.lower(), 20)
    
    def get_estimated_price(self, amount: float, currency_from: str, currency_to: str = "usd") -> Optional[Dict]:
        """
        Get estimated price for conversion
        Returns: {estimated_amount, currency_from, currency_to}
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/estimate",
                params={
                    "amount": amount,
                    "currency_from": currency_from.lower(),
                    "currency_to": currency_to.lower()
                },
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"❌ Failed to get price estimate: {str(e)}")
            return None
    
    def create_payment(
        self,
        price_amount: float,
        price_currency: str,
        pay_currency: str,
        order_id: str,
        order_description: str = "Crypto deposit"
    ) -> Optional[Dict]:
        """
        Create a payment (generates deposit address)
        
        Args:
            price_amount: Amount user wants to deposit
            price_currency: Currency of the amount (e.g., "usd", "gbp")
            pay_currency: Cryptocurrency to pay with (e.g., "btc", "eth")
            order_id: Unique order ID (user_id + timestamp)
            order_description: Description of the payment
        
        Returns:
            Dict with payment details including deposit address
            {
                "payment_id": str,
                "pay_address": str,
                "pay_amount": float,
                "pay_currency": str,
                "price_amount": float,
                "price_currency": str,
                "order_id": str
            }
        """
        try:
            # Get backend URL from environment
            backend_url = os.getenv('BACKEND_URL', 'https://neon-finance-5.preview.emergentagent.com')
            
            payload = {
                "price_amount": float(price_amount),
                "price_currency": price_currency.lower(),
                "pay_currency": pay_currency.lower(),
                "order_id": str(order_id),
                "order_description": order_description,
                "ipn_callback_url": f"{backend_url}/api/nowpayments/ipn"
            }
            
            logger.info(f"📤 Creating NOWPayments payment: {pay_currency.upper()} deposit for order {order_id}")
            
            response = requests.post(
                f"{self.BASE_URL}/payment",
                json=payload,
                headers=self.headers,
                timeout=15
            )
            
            # Check response
            if response.status_code not in [200, 201]:
                logger.error(f"❌ NOWPayments API error: Status {response.status_code}, Response: {response.text}")
                return None
            
            result = response.json()
            
            logger.info(f"✅ Payment created: ID={result.get('payment_id')}, Address={result.get('pay_address')}")
            return result
            
        except requests.exceptions.Timeout:
            logger.error(f"❌ NOWPayments API timeout for order {order_id}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ NOWPayments API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    logger.error(f"API error details: {error_details}")
                except:
                    logger.error(f"API response text: {e.response.text if hasattr(e.response, 'text') else 'No response'}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error creating payment: {str(e)}")
            return None
    
    def get_payment_status(self, payment_id: str) -> Optional[Dict]:
        """
        Get payment status by payment ID
        Returns payment details including status and confirmations
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/payment/{payment_id}",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            status = response.json()
            logger.info(f"✅ Payment status for {payment_id}: {status.get('payment_status')}")
            return status
        except Exception as e:
            logger.error(f"❌ Failed to get payment status for {payment_id}: {str(e)}")
            return None
    
    def verify_ipn_signature(self, request_data: bytes, signature: str) -> bool:
        """
        Verify IPN webhook signature for security
        CRITICAL: Always validate webhooks to prevent fake deposits
        
        NOWPayments IPN Signature Verification Process:
        1. Decode JSON body
        2. Sort JSON keys alphabetically
        3. Re-encode to JSON string (without escaped slashes)
        4. Calculate HMAC SHA512 with IPN secret
        5. Compare with received signature
        
        Args:
            request_data: Raw request body bytes
            signature: Signature from x-nowpayments-sig header
        
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            if not signature:
                logger.error("❌ IPN signature missing in request")
                return False
            
            # Debug logging for signature troubleshooting
            logger.info(f"🔍 IPN Secret (first 10 chars): {self.ipn_secret[:10]}...")
            logger.info(f"🔍 Request body length: {len(request_data)} bytes")
            logger.info(f"🔍 Request body: {request_data.decode('utf-8')}")
            logger.info(f"🔍 Received signature: {signature}")
            
            # Step 1: Decode JSON body
            import json
            json_data = json.loads(request_data.decode('utf-8'))
            
            # Step 2: Sort JSON keys alphabetically (CRITICAL for NOWPayments)
            sorted_json = json.dumps(json_data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
            logger.info(f"🔍 Sorted JSON: {sorted_json}")
            
            # Step 3: Calculate HMAC SHA512 signature with sorted JSON
            calculated_sig = hmac.new(
                self.ipn_secret.encode('utf-8'),
                sorted_json.encode('utf-8'),
                hashlib.sha512
            ).hexdigest()
            
            logger.info(f"🔍 Calculated signature: {calculated_sig}")
            logger.info(f"🔍 Signatures match: {calculated_sig == signature}")
            
            # Step 4: Constant-time comparison to prevent timing attacks
            is_valid = hmac.compare_digest(calculated_sig, signature)
            
            if is_valid:
                logger.info("✅ IPN signature validated successfully")
            else:
                logger.warning("⚠️ IPN signature validation FAILED - possible fake callback")
                logger.warning(f"⚠️ Expected: {calculated_sig}")
                logger.warning(f"⚠️ Received: {signature}")
                logger.warning(f"⚠️ JSON Data: {json_data}")
                logger.warning(f"⚠️ Sorted JSON: {sorted_json}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"❌ Signature verification error: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return False
    
    def get_confirmations_required(self, currency: str) -> int:
        """Get number of confirmations required before crediting balance"""
        return CONFIRMATION_REQUIREMENTS.get(currency.lower(), CONFIRMATION_REQUIREMENTS["default"])
    
    def is_payment_confirmed(self, payment_data: Dict) -> bool:
        """
        Check if payment has enough confirmations to be credited
        
        Args:
            payment_data: Payment webhook data from NOWPayments
        
        Returns:
            True if payment should be credited
        """
        try:
            payment_status = payment_data.get('payment_status', '').lower()
            pay_currency = payment_data.get('pay_currency', '').lower()
            confirmations = int(payment_data.get('network_confirmations', 0))
            
            required_confirmations = self.get_confirmations_required(pay_currency)
            
            # Payment must be in 'confirmed' or 'finished' status
            # AND have enough network confirmations
            is_confirmed = (
                payment_status in ['confirmed', 'finished'] and
                confirmations >= required_confirmations
            )
            
            if is_confirmed:
                logger.info(f"✅ Payment confirmed: {confirmations}/{required_confirmations} confirmations for {pay_currency.upper()}")
            else:
                logger.info(f"⏳ Payment pending: {confirmations}/{required_confirmations} confirmations for {pay_currency.upper()}, status={payment_status}")
            
            return is_confirmed
            
        except Exception as e:
            logger.error(f"❌ Error checking payment confirmation: {str(e)}")
            return False
    
    def get_account_balances(self) -> Dict:
        """
        Get all cryptocurrency balances from NOWPayments account
        This shows the REAL liquidity available for the platform
        
        Returns:
            {
                "success": True/False,
                "balances": [
                    {"currency": "BTC", "balance": 0.5, "pending": 0.1},
                    {"currency": "ETH", "balance": 10.0, "pending": 0.5},
                    ...
                ]
            }
        """
        try:
            logger.info("🔍 Fetching NOWPayments account balances...")
            
            # NOWPayments balance endpoint
            response = requests.get(
                f"{self.BASE_URL}/balance",
                headers=self.headers,
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            
            # Format the response
            balances = []
            if isinstance(data, dict) and 'balances' in data:
                for currency, balance_data in data['balances'].items():
                    balances.append({
                        "currency": currency.upper(),
                        "balance": float(balance_data.get('balance', 0)),
                        "pending": float(balance_data.get('pending', 0))
                    })
            elif isinstance(data, list):
                # Sometimes API returns array format
                for item in data:
                    balances.append({
                        "currency": item.get('currency', '').upper(),
                        "balance": float(item.get('balance', 0)),
                        "pending": float(item.get('pending', 0))
                    })
            
            logger.info(f"✅ Retrieved balances for {len(balances)} currencies")
            
            return {
                "success": True,
                "balances": balances
            }
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ NOWPayments API error: {e.response.status_code} - {e.response.text}")
            return {
                "success": False,
                "error": f"API error: {e.response.status_code}",
                "balances": []
            }
        except Exception as e:
            logger.error(f"❌ Failed to fetch NOWPayments balances: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "balances": []
            }


# Global instance
nowpayments_service = None

def get_nowpayments_service() -> NOWPaymentsService:
    """Get or create NOWPayments service instance"""
    global nowpayments_service
    if nowpayments_service is None:
        nowpayments_service = NOWPaymentsService()
    return nowpayments_service
