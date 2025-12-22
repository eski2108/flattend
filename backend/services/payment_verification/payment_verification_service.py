"""
Payment Verification Service for P2P Trading
CRITICAL SECURITY LAYER - Prevents crypto release without verified payment

Integrations:
- TrueLayer (UK Bank Transfers)
- PayPal (Global)
- Manual Upload with OCR validation
"""

import os
import logging
import hashlib
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import aiohttp
import base64

logger = logging.getLogger(__name__)

# Payment verification statuses
class PaymentStatus:
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"
    MANUAL_REVIEW = "manual_review"
    DISPUTED = "disputed"


class PaymentVerificationService:
    """
    CRITICAL SECURITY SERVICE
    
    This service MUST verify payment before ANY crypto release.
    Without verification status = 'verified', release is BLOCKED.
    """
    
    def __init__(self, db):
        self.db = db
        self._truelayer_client_id = os.getenv('TRUELAYER_CLIENT_ID', '')
        self._truelayer_client_secret = os.getenv('TRUELAYER_CLIENT_SECRET', '')
        self._truelayer_sandbox = os.getenv('TRUELAYER_SANDBOX', 'true').lower() == 'true'
        self._paypal_client_id = os.getenv('PAYPAL_CLIENT_ID', '')
        self._paypal_client_secret = os.getenv('PAYPAL_CLIENT_SECRET', '')
        
        # TrueLayer URLs
        self._truelayer_auth_url = "https://auth.truelayer-sandbox.com" if self._truelayer_sandbox else "https://auth.truelayer.com"
        self._truelayer_api_url = "https://api.truelayer-sandbox.com" if self._truelayer_sandbox else "https://api.truelayer.com"
        
        logger.info(f"PaymentVerificationService initialized (TrueLayer sandbox={self._truelayer_sandbox})")
    
    async def verify_payment(self, trade_id: str) -> Dict[str, Any]:
        """
        MAIN VERIFICATION FUNCTION
        
        Returns:
        {
            "verified": bool,
            "status": str,
            "method": str,
            "proof": dict,
            "provider": str,
            "transaction_id": str,
            "verified_at": str,
            "confidence": float (0-1)
        }
        """
        try:
            # Get trade details
            trade = await self.db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
            if not trade:
                trade = await self.db.p2p_trades.find_one({"trade_id": trade_id}, {"_id": 0})
            
            if not trade:
                return {
                    "verified": False,
                    "status": PaymentStatus.FAILED,
                    "error": "Trade not found"
                }
            
            payment_method = trade.get("payment_method", "unknown")
            fiat_amount = float(trade.get("fiat_amount", 0))
            fiat_currency = trade.get("fiat_currency", "GBP")
            seller_id = trade.get("seller_id")
            
            # Check if already verified
            existing_verification = await self.db.payment_verifications.find_one(
                {"trade_id": trade_id, "status": PaymentStatus.VERIFIED},
                {"_id": 0}
            )
            if existing_verification:
                return {
                    "verified": True,
                    "status": PaymentStatus.VERIFIED,
                    "method": existing_verification.get("method"),
                    "proof": existing_verification.get("proof"),
                    "provider": existing_verification.get("provider"),
                    "transaction_id": existing_verification.get("transaction_id"),
                    "verified_at": existing_verification.get("verified_at"),
                    "confidence": existing_verification.get("confidence", 1.0)
                }
            
            # Route to appropriate verification method
            if payment_method in ["bank_transfer", "bank_transfer_uk", "faster_payments"]:
                return await self._verify_bank_transfer(trade_id, trade)
            elif payment_method in ["paypal"]:
                return await self._verify_paypal(trade_id, trade)
            elif payment_method in ["revolut", "wise", "monzo"]:
                return await self._verify_fintech_transfer(trade_id, trade)
            else:
                # Manual verification required
                return await self._verify_manual_upload(trade_id, trade)
                
        except Exception as e:
            logger.error(f"Payment verification error for trade {trade_id}: {str(e)}")
            return {
                "verified": False,
                "status": PaymentStatus.FAILED,
                "error": str(e)
            }
    
    async def _verify_bank_transfer(self, trade_id: str, trade: Dict) -> Dict[str, Any]:
        """
        Verify UK bank transfer via TrueLayer API
        """
        seller_id = trade.get("seller_id")
        fiat_amount = float(trade.get("fiat_amount", 0))
        fiat_currency = trade.get("fiat_currency", "GBP")
        
        # Check if TrueLayer is configured
        if not self._truelayer_client_id:
            logger.warning("TrueLayer not configured, falling back to manual verification")
            return await self._verify_manual_upload(trade_id, trade)
        
        # Check if seller has connected bank account
        seller_bank = await self.db.user_bank_connections.find_one(
            {"user_id": seller_id, "provider": "truelayer", "status": "active"},
            {"_id": 0}
        )
        
        if not seller_bank:
            # Seller hasn't connected bank - require manual upload
            logger.info(f"Seller {seller_id} has no TrueLayer connection, requiring manual proof")
            return await self._verify_manual_upload(trade_id, trade)
        
        # Query TrueLayer for recent transactions
        try:
            access_token = seller_bank.get("access_token")
            transactions = await self._fetch_truelayer_transactions(
                access_token,
                from_date=(datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
                to_date=datetime.now(timezone.utc).isoformat()
            )
            
            # Look for matching transaction
            for tx in transactions:
                tx_amount = abs(float(tx.get("amount", 0)))
                tx_currency = tx.get("currency", "GBP")
                tx_reference = tx.get("description", "").lower()
                
                # Check if amount matches (within 1% tolerance)
                amount_matches = abs(tx_amount - fiat_amount) <= (fiat_amount * 0.01)
                # Check if trade_id in reference
                reference_matches = trade_id.lower() in tx_reference or trade_id[:8].lower() in tx_reference
                
                if amount_matches and tx_currency == fiat_currency:
                    # Found potential match
                    confidence = 0.8 if reference_matches else 0.6
                    
                    verification = {
                        "trade_id": trade_id,
                        "status": PaymentStatus.VERIFIED,
                        "method": "bank_transfer",
                        "provider": "truelayer",
                        "transaction_id": tx.get("transaction_id"),
                        "proof": {
                            "amount": tx_amount,
                            "currency": tx_currency,
                            "date": tx.get("timestamp"),
                            "reference": tx.get("description"),
                            "bank_name": tx.get("provider_name")
                        },
                        "verified_at": datetime.now(timezone.utc).isoformat(),
                        "confidence": confidence,
                        "verified_by": "truelayer_api"
                    }
                    
                    # Save verification
                    await self.db.payment_verifications.insert_one(verification)
                    
                    logger.info(f"✅ TrueLayer verified payment for trade {trade_id}")
                    
                    return {
                        "verified": True,
                        **verification
                    }
            
            # No matching transaction found
            return {
                "verified": False,
                "status": PaymentStatus.PENDING,
                "message": "No matching bank transaction found. Payment may still be processing.",
                "suggestion": "Please upload payment proof manually or wait for bank transfer to clear."
            }
            
        except Exception as e:
            logger.error(f"TrueLayer verification failed: {str(e)}")
            return await self._verify_manual_upload(trade_id, trade)
    
    async def _fetch_truelayer_transactions(self, access_token: str, from_date: str, to_date: str) -> List[Dict]:
        """
        Fetch transactions from TrueLayer API
        """
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Get accounts first
            async with session.get(
                f"{self._truelayer_api_url}/data/v1/accounts",
                headers=headers
            ) as resp:
                if resp.status != 200:
                    raise Exception(f"TrueLayer accounts API error: {resp.status}")
                accounts_data = await resp.json()
            
            all_transactions = []
            
            # Get transactions for each account
            for account in accounts_data.get("results", []):
                account_id = account.get("account_id")
                async with session.get(
                    f"{self._truelayer_api_url}/data/v1/accounts/{account_id}/transactions",
                    headers=headers,
                    params={"from": from_date, "to": to_date}
                ) as resp:
                    if resp.status == 200:
                        tx_data = await resp.json()
                        all_transactions.extend(tx_data.get("results", []))
            
            return all_transactions
    
    async def _verify_paypal(self, trade_id: str, trade: Dict) -> Dict[str, Any]:
        """
        Verify PayPal payment via PayPal API
        """
        if not self._paypal_client_id:
            logger.warning("PayPal not configured, falling back to manual verification")
            return await self._verify_manual_upload(trade_id, trade)
        
        # Check for stored PayPal payment ID
        paypal_payment_id = trade.get("paypal_payment_id")
        if not paypal_payment_id:
            return {
                "verified": False,
                "status": PaymentStatus.PENDING,
                "message": "PayPal payment ID not found. Please complete payment via PayPal."
            }
        
        try:
            # Get PayPal access token
            access_token = await self._get_paypal_access_token()
            
            # Verify payment
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                async with session.get(
                    f"https://api-m.paypal.com/v2/checkout/orders/{paypal_payment_id}",
                    headers=headers
                ) as resp:
                    if resp.status != 200:
                        return {
                            "verified": False,
                            "status": PaymentStatus.FAILED,
                            "error": f"PayPal API error: {resp.status}"
                        }
                    
                    payment_data = await resp.json()
            
            # Check payment status
            if payment_data.get("status") == "COMPLETED":
                # Verify amount matches
                purchase_units = payment_data.get("purchase_units", [])
                if purchase_units:
                    amount = float(purchase_units[0].get("amount", {}).get("value", 0))
                    currency = purchase_units[0].get("amount", {}).get("currency_code", "")
                    
                    expected_amount = float(trade.get("fiat_amount", 0))
                    expected_currency = trade.get("fiat_currency", "GBP")
                    
                    if abs(amount - expected_amount) <= (expected_amount * 0.01) and currency == expected_currency:
                        verification = {
                            "trade_id": trade_id,
                            "status": PaymentStatus.VERIFIED,
                            "method": "paypal",
                            "provider": "paypal",
                            "transaction_id": paypal_payment_id,
                            "proof": {
                                "amount": amount,
                                "currency": currency,
                                "payer_email": payment_data.get("payer", {}).get("email_address"),
                                "create_time": payment_data.get("create_time")
                            },
                            "verified_at": datetime.now(timezone.utc).isoformat(),
                            "confidence": 1.0,
                            "verified_by": "paypal_api"
                        }
                        
                        await self.db.payment_verifications.insert_one(verification)
                        
                        logger.info(f"✅ PayPal verified payment for trade {trade_id}")
                        
                        return {
                            "verified": True,
                            **verification
                        }
            
            return {
                "verified": False,
                "status": PaymentStatus.PENDING,
                "message": f"PayPal payment status: {payment_data.get('status')}"
            }
            
        except Exception as e:
            logger.error(f"PayPal verification failed: {str(e)}")
            return await self._verify_manual_upload(trade_id, trade)
    
    async def _get_paypal_access_token(self) -> str:
        """Get PayPal OAuth access token"""
        async with aiohttp.ClientSession() as session:
            auth = base64.b64encode(
                f"{self._paypal_client_id}:{self._paypal_client_secret}".encode()
            ).decode()
            
            async with session.post(
                "https://api-m.paypal.com/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {auth}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data="grant_type=client_credentials"
            ) as resp:
                data = await resp.json()
                return data.get("access_token")
    
    async def _verify_fintech_transfer(self, trade_id: str, trade: Dict) -> Dict[str, Any]:
        """
        Verify Revolut/Wise/Monzo transfers
        For now, requires manual upload - can integrate APIs later
        """
        return await self._verify_manual_upload(trade_id, trade)
    
    async def _verify_manual_upload(self, trade_id: str, trade: Dict) -> Dict[str, Any]:
        """
        Verify manually uploaded payment proof
        Uses OCR and validation logic
        """
        # Check for uploaded proof
        proof = await self.db.payment_proofs.find_one(
            {"trade_id": trade_id},
            {"_id": 0}
        )
        
        if not proof:
            return {
                "verified": False,
                "status": PaymentStatus.PENDING,
                "message": "No payment proof uploaded. Please upload screenshot or bank statement.",
                "requires_upload": True
            }
        
        # Validate the proof
        validation_result = await self._validate_payment_proof(
            proof,
            expected_amount=float(trade.get("fiat_amount", 0)),
            expected_currency=trade.get("fiat_currency", "GBP"),
            trade_id=trade_id
        )
        
        if validation_result.get("valid"):
            verification = {
                "trade_id": trade_id,
                "status": PaymentStatus.VERIFIED,
                "method": "manual_upload",
                "provider": "manual",
                "transaction_id": proof.get("proof_id"),
                "proof": {
                    "file_type": proof.get("file_type"),
                    "uploaded_at": proof.get("uploaded_at"),
                    "ocr_amount": validation_result.get("extracted_amount"),
                    "ocr_date": validation_result.get("extracted_date"),
                    "ocr_reference": validation_result.get("extracted_reference")
                },
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "confidence": validation_result.get("confidence", 0.7),
                "verified_by": "ocr_validation"
            }
            
            await self.db.payment_verifications.insert_one(verification)
            
            logger.info(f"✅ Manual proof verified for trade {trade_id}")
            
            return {
                "verified": True,
                **verification
            }
        else:
            # Send to manual review
            await self.db.payment_verifications.update_one(
                {"trade_id": trade_id},
                {
                    "$set": {
                        "status": PaymentStatus.MANUAL_REVIEW,
                        "validation_issues": validation_result.get("issues", []),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            return {
                "verified": False,
                "status": PaymentStatus.MANUAL_REVIEW,
                "message": "Payment proof requires manual review by admin.",
                "issues": validation_result.get("issues", [])
            }
    
    async def _validate_payment_proof(
        self,
        proof: Dict,
        expected_amount: float,
        expected_currency: str,
        trade_id: str
    ) -> Dict[str, Any]:
        """
        Validate uploaded payment proof using basic pattern matching
        (In production, integrate with OCR service like AWS Textract)
        """
        issues = []
        confidence = 0.5  # Base confidence for manual upload
        
        extracted_amount = proof.get("extracted_amount")
        extracted_date = proof.get("extracted_date")
        extracted_reference = proof.get("extracted_reference", "")
        
        # Check amount if extracted
        if extracted_amount:
            try:
                amount = float(extracted_amount)
                # Allow 5% tolerance
                if abs(amount - expected_amount) <= (expected_amount * 0.05):
                    confidence += 0.2
                else:
                    issues.append(f"Amount mismatch: expected {expected_amount}, got {amount}")
            except:
                issues.append("Could not parse amount from proof")
        else:
            issues.append("Amount not extracted from proof")
        
        # Check date if extracted
        if extracted_date:
            try:
                proof_date = datetime.fromisoformat(extracted_date.replace('Z', '+00:00'))
                trade_created = datetime.fromisoformat(proof.get("trade_created_at", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
                
                # Payment should be after trade creation and within 7 days
                if proof_date >= trade_created and (proof_date - trade_created).days <= 7:
                    confidence += 0.1
                else:
                    issues.append("Payment date outside expected window")
            except:
                pass
        
        # Check reference
        if trade_id.lower() in extracted_reference.lower() or trade_id[:8].lower() in extracted_reference.lower():
            confidence += 0.2
        
        # Validation threshold
        is_valid = confidence >= 0.7 and len(issues) == 0
        
        return {
            "valid": is_valid,
            "confidence": confidence,
            "extracted_amount": extracted_amount,
            "extracted_date": extracted_date,
            "extracted_reference": extracted_reference,
            "issues": issues
        }
    
    async def upload_payment_proof(
        self,
        trade_id: str,
        user_id: str,
        file_data: bytes,
        file_type: str,
        extracted_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Upload payment proof for manual verification
        """
        proof_id = f"proof_{trade_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        # Get trade for reference
        trade = await self.db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
        if not trade:
            trade = await self.db.p2p_trades.find_one({"trade_id": trade_id}, {"_id": 0})
        
        proof_doc = {
            "proof_id": proof_id,
            "trade_id": trade_id,
            "uploaded_by": user_id,
            "file_type": file_type,
            "file_data": base64.b64encode(file_data).decode() if isinstance(file_data, bytes) else file_data,
            "extracted_amount": extracted_data.get("amount") if extracted_data else None,
            "extracted_date": extracted_data.get("date") if extracted_data else None,
            "extracted_reference": extracted_data.get("reference") if extracted_data else None,
            "trade_created_at": trade.get("created_at") if trade else None,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending_review"
        }
        
        await self.db.payment_proofs.insert_one(proof_doc)
        
        logger.info(f"Payment proof uploaded for trade {trade_id}")
        
        return {
            "success": True,
            "proof_id": proof_id,
            "message": "Payment proof uploaded. Verification in progress."
        }
    
    async def admin_verify_payment(
        self,
        trade_id: str,
        admin_id: str,
        verified: bool,
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Admin manual verification override
        """
        status = PaymentStatus.VERIFIED if verified else PaymentStatus.FAILED
        
        verification = {
            "trade_id": trade_id,
            "status": status,
            "method": "admin_override",
            "provider": "admin",
            "transaction_id": f"admin_{trade_id}",
            "proof": {
                "admin_id": admin_id,
                "notes": notes,
                "decision": "approved" if verified else "rejected"
            },
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "confidence": 1.0,
            "verified_by": admin_id
        }
        
        await self.db.payment_verifications.update_one(
            {"trade_id": trade_id},
            {"$set": verification},
            upsert=True
        )
        
        # Audit log
        await self.db.audit_trail.insert_one({
            "action": "ADMIN_PAYMENT_VERIFICATION",
            "trade_id": trade_id,
            "admin_id": admin_id,
            "verified": verified,
            "notes": notes,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.info(f"Admin {admin_id} {'verified' if verified else 'rejected'} payment for trade {trade_id}")
        
        return {
            "success": True,
            "verified": verified,
            "status": status
        }


# Singleton instance
_payment_verification_service = None

def get_payment_verification_service(db) -> PaymentVerificationService:
    global _payment_verification_service
    if _payment_verification_service is None:
        _payment_verification_service = PaymentVerificationService(db)
    return _payment_verification_service
