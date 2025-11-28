# Savings Transfers with Wallet Service

import logging
from datetime import datetime, timezone
from typing import Dict
from fastapi import HTTPException

logger = logging.getLogger(__name__)

async def transfer_to_savings_with_wallet(db, wallet_service, user_id: str, currency: str, amount: float) -> Dict:
    """Transfer from wallet to savings via wallet service"""
    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        balance = await wallet_service.get_balance(user_id, currency)
        if balance['available_balance'] < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {balance['available_balance']}")
        
        transfer_id = f"savings_in_{user_id}_{currency}_{int(datetime.now(timezone.utc).timestamp())}"
        
        await wallet_service.debit(
            user_id=user_id,
            currency=currency,
            amount=amount,
            transaction_type="transfer_to_savings",
            reference_id=transfer_id,
            metadata={"destination": "savings"}
        )
        
        # Track savings separately in savings_balances collection for interest calculations
        savings_balance = await db.savings_balances.find_one({"user_id": user_id, "currency": currency})
        if savings_balance:
            await db.savings_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$inc": {"balance": amount}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.savings_balances.insert_one({
                "user_id": user_id,
                "currency": currency,
                "balance": amount,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_updated": datetime.now(timezone.utc).isoformat()
            })
        
        logger.info(f"✅ Savings: {user_id} transferred {amount} {currency} to savings")
        return {"success": True, "amount": amount, "currency": currency}
    except Exception as e:
        logger.error(f"❌ Savings transfer error: {str(e)}")
        raise

async def transfer_from_savings_with_wallet(db, wallet_service, user_id: str, currency: str, amount: float) -> Dict:
    """Transfer from savings back to wallet via wallet service"""
    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        savings_balance = await db.savings_balances.find_one({"user_id": user_id, "currency": currency})
        if not savings_balance or savings_balance.get("balance", 0) < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient savings balance")
        
        transfer_id = f"savings_out_{user_id}_{currency}_{int(datetime.now(timezone.utc).timestamp())}"
        
        await db.savings_balances.update_one(
            {"user_id": user_id, "currency": currency},
            {"$inc": {"balance": -amount}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}}
        )
        
        await wallet_service.credit(
            user_id=user_id,
            currency=currency,
            amount=amount,
            transaction_type="transfer_from_savings",
            reference_id=transfer_id,
            metadata={"source": "savings"}
        )
        
        logger.info(f"✅ Savings: {user_id} withdrew {amount} {currency} from savings")
        return {"success": True, "amount": amount, "currency": currency}
    except Exception as e:
        logger.error(f"❌ Savings withdrawal error: {str(e)}")
        raise
