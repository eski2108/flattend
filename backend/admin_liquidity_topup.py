"""Admin Liquidity Top-Up System

ENFORCES:
- All top-ups must have a source (NOWPayments or manual)
- All top-ups must have transaction ID
- All top-ups are logged with before/after balances
- Manual edits are BLOCKED - only additions allowed
"""

import logging
from datetime import datetime, timezone
import uuid
from typing import Dict

logger = logging.getLogger(__name__)

class AdminLiquidityManager:
    def __init__(self, db):
        self.db = db
    
    async def add_liquidity(
        self,
        admin_id: str,
        currency: str,
        amount: float,
        source: str,  # "NOWPayments" or "manual"
        transaction_id: str,
        ip_address: str = None,
        metadata: dict = None
    ) -> Dict:
        """
        Add liquidity to admin wallet.
        ONLY ADDITIONS ALLOWED - NO DIRECT EDITS.
        
        Args:
            admin_id: Admin user ID
            currency: Currency to add
            amount: Amount to add (must be positive)
            source: "NOWPayments" or "manual"
            transaction_id: Unique transaction ID
            ip_address: IP of admin making the change
            metadata: Additional data
        """
        try:
            # Validate amount is positive
            if amount <= 0:
                return {
                    "success": False,
                    "message": "Amount must be positive"
                }
            
            # Validate source
            if source not in ["NOWPayments", "manual"]:
                return {
                    "success": False,
                    "message": "Source must be 'NOWPayments' or 'manual'"
                }
            
            # Validate transaction ID is unique
            existing = await self.db.admin_liquidity_topups.find_one({
                "transaction_id": transaction_id
            })
            if existing:
                return {
                    "success": False,
                    "message": "Transaction ID already used"
                }
            
            # Get current balance (BEFORE)
            current_wallet = await self.db.admin_liquidity_wallets.find_one(
                {"currency": currency}
            )
            
            balance_before = {
                "available": current_wallet.get("available", 0) if current_wallet else 0,
                "balance": current_wallet.get("balance", 0) if current_wallet else 0
            }
            
            # Add liquidity
            await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$inc": {
                        "available": amount,
                        "balance": amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {
                        "currency": currency,
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Get new balance (AFTER)
            updated_wallet = await self.db.admin_liquidity_wallets.find_one(
                {"currency": currency}
            )
            
            balance_after = {
                "available": updated_wallet.get("available", 0),
                "balance": updated_wallet.get("balance", 0)
            }
            
            # Log the top-up (MANDATORY)
            topup_id = str(uuid.uuid4())
            await self.db.admin_liquidity_topups.insert_one({
                "topup_id": topup_id,
                "transaction_id": transaction_id,
                "admin_id": admin_id,
                "currency": currency,
                "amount": amount,
                "source": source,
                "balance_before": balance_before,
                "balance_after": balance_after,
                "ip_address": ip_address,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "completed"
            })
            
            # Also log in main audit system
            from audit_system import AuditLogger
            audit = AuditLogger(self.db)
            await audit.log_admin_topup(
                admin_id=admin_id,
                currency=currency,
                amount=amount,
                source=source,
                transaction_id=transaction_id,
                admin_balance_before=balance_before,
                admin_balance_after=balance_after,
                ip_address=ip_address
            )
            
            logger.info(f"✅ Admin liquidity added: {amount} {currency} from {source}")
            
            return {
                "success": True,
                "topup_id": topup_id,
                "balance_before": balance_before,
                "balance_after": balance_after
            }
            
        except Exception as e:
            logger.error(f"❌ Admin liquidity top-up failed: {str(e)}")
            return {
                "success": False,
                "message": f"Top-up failed: {str(e)}"
            }
    
    async def get_topup_history(
        self,
        currency: str = None,
        source: str = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = 100
    ) -> list:
        """
        Get admin liquidity top-up history with filters
        """
        query = {}
        if currency:
            query["currency"] = currency
        if source:
            query["source"] = source
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        topups = await self.db.admin_liquidity_topups.find(query).sort(
            "timestamp", -1
        ).limit(limit).to_list(limit)
        
        return topups
    
    async def block_direct_edit(self) -> Dict:
        """
        This function exists to explicitly BLOCK any direct balance edits.
        All liquidity changes MUST go through add_liquidity().
        """
        return {
            "success": False,
            "message": "BLOCKED: Direct balance edits are not allowed. Use add_liquidity() with proper source and transaction ID."
        }
