"""LIQUIDITY CHECKER - CENTRALIZED LIQUIDITY VALIDATION

This service ensures NO MINTING occurs anywhere in the platform.
Every operation requiring admin liquidity MUST call this service.

Created: 2025-12-03
Version: 1.0
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class LiquidityChecker:
    """
    Centralized liquidity checking service.
    All modules MUST call this before executing any operation that requires admin liquidity.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def check_and_log(
        self,
        currency: str,
        amount: float,
        operation_type: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Check if admin has sufficient liquidity and log the result.
        
        Args:
            currency: Currency to check (e.g., 'BTC', 'GBP')
            amount: Amount needed
            operation_type: Type of operation (e.g., 'withdrawal', 'trade_sell', 'savings_payout')
            user_id: User requesting the operation
            metadata: Additional data for logging
        
        Returns:
            {
                "success": bool,
                "can_execute": bool,
                "available_liquidity": float,
                "required_liquidity": float,
                "shortage": float,
                "message": str,
                "event_id": str
            }
        """
        try:
            # Get admin liquidity for currency
            admin_wallet = await self.db.admin_liquidity_wallets.find_one(
                {"currency": currency}
            )
            
            available = admin_wallet.get("available", 0) if admin_wallet else 0
            
            # Check if sufficient
            can_execute = available >= amount
            shortage = max(0, amount - available)
            
            # Log the check
            event_id = str(uuid.uuid4())
            event_doc = {
                "event_id": event_id,
                "currency": currency,
                "amount_required": amount,
                "available_liquidity": available,
                "shortage": shortage,
                "can_execute": can_execute,
                "operation_type": operation_type,
                "user_id": user_id,
                "status": "passed" if can_execute else "blocked",
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.liquidity_events.insert_one(event_doc)
            
            if not can_execute:
                logger.warning(
                    f"🚫 LIQUIDITY CHECK FAILED: {operation_type} requires {amount} {currency}, "
                    f"but only {available} available. SHORTAGE: {shortage}. OPERATION BLOCKED."
                )
                
                return {
                    "success": False,
                    "can_execute": False,
                    "available_liquidity": available,
                    "required_liquidity": amount,
                    "shortage": shortage,
                    "message": f"Insufficient platform liquidity. Required: {amount} {currency}, Available: {available}",
                    "reason": "insufficient_platform_liquidity",
                    "event_id": event_id
                }
            
            logger.info(f"✅ LIQUIDITY CHECK PASSED: {amount} {currency} available for {operation_type}")
            
            return {
                "success": True,
                "can_execute": True,
                "available_liquidity": available,
                "required_liquidity": amount,
                "shortage": 0,
                "message": "Sufficient liquidity available",
                "event_id": event_id
            }
            
        except Exception as e:
            logger.error(f"Liquidity check error: {str(e)}")
            return {
                "success": False,
                "can_execute": False,
                "message": f"Liquidity check failed: {str(e)}",
                "reason": "check_error"
            }
    
    async def get_liquidity_status(self) -> Dict:
        """
        Get current liquidity status for all currencies.
        """
        try:
            wallets = await self.db.admin_liquidity_wallets.find({}, {"_id": 0}).sort("currency", 1).to_list(100)
            
            total_gbp_value = 0
            warnings = []
            
            # Check for low liquidity warnings
            for wallet in wallets:
                currency = wallet.get("currency")
                available = wallet.get("available", 0)
                
                if available < 1 and currency in ["BTC", "ETH"]:
                    warnings.append(f"⚠️ {currency} liquidity is LOW: {available}")
                elif available < 100 and currency == "GBP":
                    warnings.append(f"⚠️ GBP liquidity is LOW: £{available}")
            
            return {
                "success": True,
                "wallets": wallets,
                "warnings": warnings,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
    
    async def get_recent_blocks(self, limit: int = 50) -> Dict:
        """
        Get recent blocked operations (liquidity failures).
        """
        try:
            blocks = await self.db.liquidity_events.find(
                {"status": "blocked"}
            ).sort("timestamp", -1).limit(limit).to_list(limit)
            
            # Remove _id for JSON serialization
            for block in blocks:
                block.pop('_id', None)
            
            return {
                "success": True,
                "blocks": blocks,
                "count": len(blocks)
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
