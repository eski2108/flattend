"""NOWPayments Payout Service

This service handles admin crypto withdrawals from the PLATFORM_FEES wallet
to external wallets using the NOWPayments Payout API.

Features:
- Request crypto payouts to external addresses
- Track payout status
- Webhook handling for payout confirmations
- Security validation
- Complete audit trail
"""

import os
import logging
import requests
import hmac
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional
from decimal import Decimal

logger = logging.getLogger(__name__)

class NOWPaymentsPayoutService:
    """Handle admin crypto withdrawals via NOWPayments Payout API"""
    
    BASE_URL = "https://api.nowpayments.io/v1"
    PAYOUT_BASE_URL = "https://api.nowpayments.io/v1/payout"
    
    def __init__(self):
        self.api_key = os.getenv('NOWPAYMENTS_API_KEY')
        self.payout_api_key = os.getenv('NOWPAYMENTS_PAYOUT_API_KEY', self.api_key)  # Some accounts use separate key
        self.ipn_secret = os.getenv('NOWPAYMENTS_IPN_SECRET')
        
        if not self.api_key:
            raise ValueError("NOWPAYMENTS_API_KEY not found in environment")
        
        self.headers = {
            "x-api-key": self.payout_api_key,
            "Content-Type": "application/json"
        }
        
        logger.info("✅ NOWPayments Payout Service initialized")
    
    def get_available_currencies(self) -> list:
        """Get list of currencies available for payouts"""
        try:
            response = requests.get(
                f"{self.PAYOUT_BASE_URL}/currencies",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            currencies = response.json().get('currencies', [])
            logger.info(f"✅ Retrieved {len(currencies)} payout currencies")
            return currencies
        except Exception as e:
            logger.error(f"❌ Failed to get payout currencies: {str(e)}")
            # Return common currencies as fallback
            return ['btc', 'eth', 'usdt', 'ltc', 'bch', 'xrp']
    
    def get_minimum_payout_amount(self, currency: str) -> float:
        """Get minimum payout amount for a currency"""
        try:
            response = requests.get(
                f"{self.PAYOUT_BASE_URL}/min-amount",
                params={"currency": currency.lower()},
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            min_amount = float(response.json().get('min_amount', 0))
            logger.info(f"✅ Minimum payout for {currency.upper()}: {min_amount}")
            return min_amount
        except Exception as e:
            logger.error(f"❌ Failed to get minimum payout: {str(e)}")
            # Return sensible defaults
            defaults = {
                'btc': 0.0001,
                'eth': 0.001,
                'usdt': 10,
                'ltc': 0.01,
                'bch': 0.01
            }
            return defaults.get(currency.lower(), 1.0)
    
    def create_payout(
        self,
        currency: str,
        amount: float,
        address: str,
        payout_id: str,
        extra_id: Optional[str] = None  # For currencies like XRP, XLM that need destination tag
    ) -> Optional[Dict]:
        """Create a payout (withdrawal) to external wallet
        
        Args:
            currency: Cryptocurrency code (e.g., 'btc', 'eth', 'usdt')
            amount: Amount to withdraw
            address: Destination wallet address
            payout_id: Unique payout ID from our system
            extra_id: Destination tag/memo (for XRP, XLM, etc.)
        
        Returns:
            Dict with payout details or None if failed
        """
        try:
            # Get backend URL from environment
            backend_url = os.getenv('BACKEND_URL', 'https://walletfix.preview.emergentagent.com')
            
            payload = {
                "withdrawals": [
                    {
                        "address": address,
                        "currency": currency.lower(),
                        "amount": float(amount),
                        "ipn_callback_url": f"{backend_url}/api/nowpayments/payout-webhook",
                        "unique_external_id": payout_id
                    }
                ]
            }
            
            # Add extra_id if provided (for XRP, XLM, etc.)
            if extra_id:
                payload["withdrawals"][0]["extra_id"] = extra_id
            
            logger.info(f"📤 Creating payout: {amount} {currency.upper()} to {address[:10]}...")
            
            response = requests.post(
                f"{self.PAYOUT_BASE_URL}",
                json=payload,
                headers=self.headers,
                timeout=30
            )
            
            # Check response
            if response.status_code not in [200, 201]:
                logger.error(f"❌ NOWPayments Payout API error: Status {response.status_code}, Response: {response.text}")
                return None
            
            result = response.json()
            
            # NOWPayments returns array of withdrawal results
            if isinstance(result, dict) and 'withdrawals' in result:
                withdrawal_result = result['withdrawals'][0] if result['withdrawals'] else None
                if withdrawal_result:
                    logger.info(f"✅ Payout created: ID={withdrawal_result.get('id')}, Status={withdrawal_result.get('status')}")
                    return withdrawal_result
            
            return result
            
        except requests.exceptions.Timeout:
            logger.error("❌ NOWPayments Payout API timeout")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ NOWPayments Payout API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    logger.error(f"API error details: {error_details}")
                except Exception:
                    logger.error(f"API response text: {e.response.text if hasattr(e.response, 'text') else 'No response'}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error creating payout: {str(e)}")
            return None
    
    def get_payout_status(self, payout_id: str) -> Optional[Dict]:
        """Get status of a payout by our internal payout_id
        
        Args:
            payout_id: Our internal payout ID (unique_external_id)
        
        Returns:
            Dict with payout status or None
        """
        try:
            response = requests.get(
                f"{self.PAYOUT_BASE_URL}/{payout_id}",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            status = response.json()
            logger.info(f"✅ Payout status for {payout_id}: {status.get('status')}")
            return status
        except Exception as e:
            logger.error(f"❌ Failed to get payout status for {payout_id}: {str(e)}")
            return None
    
    def verify_payout_webhook_signature(self, request_data: bytes, signature: str) -> bool:
        """Verify payout webhook signature
        
        Same verification logic as regular IPN webhooks
        """
        try:
            if not signature or not self.ipn_secret:
                logger.error("❌ Payout webhook signature or IPN secret missing")
                return False
            
            import json
            json_data = json.loads(request_data.decode('utf-8'))
            
            # Sort JSON keys alphabetically (CRITICAL for NOWPayments)
            sorted_json = json.dumps(json_data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
            
            # Calculate HMAC SHA512 signature
            calculated_sig = hmac.new(
                self.ipn_secret.encode('utf-8'),
                sorted_json.encode('utf-8'),
                hashlib.sha512
            ).hexdigest()
            
            is_valid = hmac.compare_digest(calculated_sig, signature)
            
            if is_valid:
                logger.info("✅ Payout webhook signature validated successfully")
            else:
                logger.warning("⚠️ Payout webhook signature validation FAILED")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"❌ Payout webhook signature verification error: {str(e)}")
            return False


# Global instance
_payout_service = None

def get_payout_service() -> NOWPaymentsPayoutService:
    """Get or create payout service instance"""
    global _payout_service
    if _payout_service is None:
        _payout_service = NOWPaymentsPayoutService()
    return _payout_service
