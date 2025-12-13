"""Complete Financial Engine for CoinHubX

This is the master financial engine that orchestrates all money movements,
fee calculations, referral commissions, and admin liquidity management.

All transaction endpoints MUST use this engine to ensure:
- Correct fee collection to PLATFORM_FEES
- Automatic referral commission distribution
- Admin liquidity tracking
- Complete audit trail
- No money can be lost or created
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from decimal import Decimal
import uuid
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class FinancialEngine:
    """Master financial engine for all money operations"""
    
    def __init__(self, db):
        self.db = db
        
    async def initialize_platform_fees_wallet(self):
        """Initialize PLATFORM_FEES wallet for all currencies if not exists"""
        try:
            from nowpayments_integration import get_nowpayments_service
            
            np_service = get_nowpayments_service()
            currencies = np_service.get_available_currencies()
            
            # Add GBP and other fiat currencies
            all_currencies = list(set(currencies + ["GBP", "USD", "EUR"]))
            
            for currency in all_currencies:
                await self.db.internal_balances.update_one(
                    {"user_id": "PLATFORM_FEES", "currency": currency.upper()},
                    {
                        "$setOnInsert": {
                            "user_id": "PLATFORM_FEES",
                            "currency": currency.upper(),
                            "balance": 0.0,
                            "total_fees": 0.0,
                            "swap_fees": 0.0,
                            "instant_buy_fees": 0.0,
                            "instant_sell_fees": 0.0,
                            "spot_trading_fees": 0.0,
                            "p2p_buyer_fees": 0.0,
                            "p2p_seller_fees": 0.0,
                            "deposit_fees": 0.0,
                            "withdrawal_fees": 0.0,
                            "referral_commissions_paid": 0.0,
                            "net_platform_revenue": 0.0,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "last_updated": datetime.now(timezone.utc).isoformat()
                        }
                    },
                    upsert=True
                )
            
            logger.info(f"✅ PLATFORM_FEES wallet initialized for {len(all_currencies)} currencies")
            return {"success": True, "currencies_initialized": len(all_currencies)}
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize PLATFORM_FEES wallet: {e}")
            return {"success": False, "error": str(e)}
    
    async def process_transaction_fee(
        self,
        user_id: str,
        transaction_type: str,  # "swap", "instant_buy", "instant_sell", "spot_trading", "p2p_buyer", "p2p_seller", "deposit", "withdrawal"
        fee_amount: float,
        currency: str,
        transaction_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Process a transaction fee with automatic referral commission
        
        This is the master function that:
        1. Credits fee to PLATFORM_FEES
        2. Checks if user has referrer
        3. Calculates and pays referral commission
        4. Updates all tracking collections
        5. Returns breakdown of fee distribution
        """
        try:
            from referral_engine import get_referral_engine
            
            # 1. Get referral engine
            referral_engine = get_referral_engine()
            
            # 2. Process referral commission (this also credits referrer wallet)
            commission_result = await referral_engine.process_referral_commission(
                user_id=user_id,
                fee_amount=fee_amount,
                fee_type=transaction_type.upper(),
                currency=currency,
                related_transaction_id=transaction_id,
                metadata=metadata
            )
            
            if commission_result["success"]:
                referrer_commission = commission_result["commission_amount"]
                admin_fee = fee_amount - referrer_commission
                logger.info(f"💰 Fee split: Total={fee_amount}, Admin={admin_fee}, Referrer={referrer_commission}")
            else:
                # No referrer, admin gets 100%
                admin_fee = fee_amount
                referrer_commission = 0.0
                logger.info(f"💰 Fee: Total={fee_amount}, Admin={fee_amount} (no referrer)")
            
            # 3. Credit PLATFORM_FEES with admin portion
            fee_type_field = f"{transaction_type}_fees"
            
            await self.db.internal_balances.update_one(
                {"user_id": "PLATFORM_FEES", "currency": currency},
                {
                    "$inc": {
                        "balance": fee_amount,  # Total fee collected
                        "total_fees": fee_amount,
                        fee_type_field: fee_amount,
                        "net_platform_revenue": admin_fee  # After referral commission
                    },
                    "$set": {
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # 4. Log to fee_transactions for business analytics
            await self.db.fee_transactions.insert_one({
                "transaction_id": str(uuid.uuid4()),
                "user_id": user_id,
                "transaction_type": transaction_type,
                "fee_amount": fee_amount,
                "admin_fee": admin_fee,
                "referrer_commission": referrer_commission,
                "referrer_id": commission_result.get("referrer_id") if commission_result["success"] else None,
                "referrer_tier": commission_result.get("referrer_tier") if commission_result["success"] else None,
                "currency": currency,
                "related_transaction_id": transaction_id,
                "metadata": metadata,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"✅ Fee processed: {transaction_type} - {fee_amount} {currency} (User: {user_id})")
            
            return {
                "success": True,
                "total_fee": fee_amount,
                "admin_fee": admin_fee,
                "referrer_commission": referrer_commission,
                "currency": currency
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to process transaction fee: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    async def check_admin_liquidity(
        self,
        currency: str,
        required_amount: float,
        operation: str
    ) -> Dict:
        """Check if admin has sufficient liquidity for a transaction"""
        try:
            liquidity = await self.db.admin_liquidity_wallets.find_one({"currency": currency})
            
            if not liquidity:
                return {
                    "success": False,
                    "available": 0,
                    "required": required_amount,
                    "message": f"No admin liquidity for {currency}"
                }
            
            available = liquidity.get("available", 0)
            
            if available < required_amount:
                logger.warning(f"⚠️ LOW LIQUIDITY: {currency} - Available: {available}, Required: {required_amount}")
                return {
                    "success": False,
                    "available": available,
                    "required": required_amount,
                    "message": f"Insufficient admin liquidity. Available: {available} {currency}, Required: {required_amount} {currency}"
                }
            
            return {
                "success": True,
                "available": available,
                "required": required_amount,
                "remaining": available - required_amount
            }
            
        except Exception as e:
            logger.error(f"❌ Liquidity check failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_admin_liquidity(
        self,
        currency: str,
        amount: float,
        operation: str,  # "add" or "deduct"
        reference_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Update admin liquidity after a transaction"""
        try:
            increment = amount if operation == "add" else -amount
            
            await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$inc": {
                        "available": increment,
                        "balance": increment
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$setOnInsert": {
                        "currency": currency,
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Log liquidity change
            await self.db.admin_liquidity_history.insert_one({
                "history_id": str(uuid.uuid4()),
                "currency": currency,
                "amount": amount,
                "operation": operation,
                "reference_id": reference_id,
                "metadata": metadata,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"💰 Admin liquidity {operation}: {amount} {currency} (Ref: {reference_id})")
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"❌ Failed to update admin liquidity: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_platform_fees_summary(self, currency: Optional[str] = None) -> Dict:
        """Get summary of all platform fees collected"""
        try:
            if currency:
                # Get specific currency
                fee_data = await self.db.internal_balances.find_one(
                    {"user_id": "PLATFORM_FEES", "currency": currency}
                )
                return fee_data if fee_data else {"message": "No data for this currency"}
            else:
                # Get all currencies
                fee_data = await self.db.internal_balances.find(
                    {"user_id": "PLATFORM_FEES"}
                ).to_list(500)
                
                return {
                    "total_currencies": len(fee_data),
                    "fees_by_currency": fee_data
                }
        except Exception as e:
            logger.error(f"❌ Failed to get fees summary: {e}")
            return {"success": False, "error": str(e)}


# Global instance
_financial_engine = None

def get_financial_engine(db):
    """Get or create financial engine singleton"""
    global _financial_engine
    if _financial_engine is None:
        _financial_engine = FinancialEngine(db)
    return _financial_engine


def initialize_financial_engine(db):
    """Initialize financial engine on server startup"""
    global _financial_engine
    _financial_engine = FinancialEngine(db)
    logger.info("💰 Financial Engine initialized")
    return _financial_engine
