# Swap & Express Buy with Wallet Service Integration

import logging
from datetime import datetime, timezone
from typing import Dict
from fastapi import HTTPException
import uuid

logger = logging.getLogger(__name__)

async def execute_express_buy_with_wallet(db, wallet_service, user_id: str, crypto_currency: str, crypto_amount: float, fiat_amount: float, fiat_currency: str = "GBP") -> Dict:
    """Execute express buy via wallet service - debit fiat, credit crypto"""
    try:
        order_id = str(uuid.uuid4())
        
        # Get express buy fee from settings
        platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
        fee_percent = platform_settings.get("express_buy_fee_percent", 2.0) if platform_settings else 2.0
        
        # Calculate total cost
        base_cost = fiat_amount
        fee_amount = base_cost * (fee_percent / 100)
        total_cost = base_cost + fee_amount
        
        # Check user balance
        balance = await wallet_service.get_balance(user_id, fiat_currency)
        if balance['available_balance'] < total_cost:
            raise HTTPException(status_code=400, detail=f"Insufficient {fiat_currency} balance. Required: {total_cost}, Available: {balance['available_balance']}")
        
        # Debit fiat
        await wallet_service.debit(
            user_id=user_id,
            currency=fiat_currency,
            amount=total_cost,
            transaction_type="express_buy_payment",
            reference_id=order_id,
            metadata={"crypto_currency": crypto_currency, "crypto_amount": crypto_amount}
        )
        
        # Credit crypto
        await wallet_service.credit(
            user_id=user_id,
            currency=crypto_currency,
            amount=crypto_amount,
            transaction_type="express_buy_crypto",
            reference_id=order_id,
            metadata={"fiat_currency": fiat_currency, "total_cost": total_cost}
        )
        
        # Credit fee to admin
        await wallet_service.credit(
            user_id="admin_fee_wallet",
            currency=fiat_currency,
            amount=fee_amount,
            transaction_type="express_buy_fee",
            reference_id=order_id,
            metadata={"user_id": user_id}
        )
        
        logger.info(f"✅ Express Buy: {user_id} bought {crypto_amount} {crypto_currency} for {total_cost} {fiat_currency}")
        
        return {"success": True, "order_id": order_id, "crypto_amount": crypto_amount, "total_cost": total_cost}
    except Exception as e:
        logger.error(f"❌ Express buy error: {str(e)}")
        raise

async def execute_swap_with_wallet(db, wallet_service, user_id: str, from_currency: str, to_currency: str, from_amount: float) -> Dict:
    try:
        from escrow_balance_system import get_trader_balance
        from unified_price_service import get_unified_price_service
        
        # Get unified price service instance
        price_service = get_unified_price_service()
        
        from_coin = await db.supported_coins.find_one({"symbol": from_currency, "enabled": True}, {"_id": 0})
        to_coin = await db.supported_coins.find_one({"symbol": to_currency, "enabled": True}, {"_id": 0})
        
        if not from_coin or not to_coin:
            raise HTTPException(status_code=400, detail="Currency not supported")
        
        balance = await wallet_service.get_balance(user_id, from_currency)
        if balance['available_balance'] < from_amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Use unified pricing service with fallback
        from_price = await price_service.get_price(from_currency, "GBP")
        to_price = await price_service.get_price(to_currency, "GBP")
        
        platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
        swap_fee_percent = platform_settings.get("swap_fee_percent", 3.0) if platform_settings else 3.0
        
        from_value_gbp = from_amount * from_price
        swap_fee_gbp = from_value_gbp * (swap_fee_percent / 100)
        net_value_gbp = from_value_gbp - swap_fee_gbp
        to_amount = net_value_gbp / to_price
        swap_fee_crypto = swap_fee_gbp / from_price
        
        import uuid
        swap_id = str(uuid.uuid4())
        
        await wallet_service.debit(user_id=user_id, currency=from_currency, amount=from_amount, transaction_type="swap_out", reference_id=swap_id, metadata={"to_currency": to_currency, "to_amount": to_amount})
        await wallet_service.credit(user_id=user_id, currency=to_currency, amount=to_amount, transaction_type="swap_in", reference_id=swap_id, metadata={"from_currency": from_currency})
        await wallet_service.credit(user_id="admin_fee_wallet", currency=from_currency, amount=swap_fee_crypto, transaction_type="swap_fee", reference_id=swap_id, metadata={"user_id": user_id})
        
        # Save swap with complete fee information for audit trail
        await db.swap_history.insert_one({
            "swap_id": swap_id,
            "user_id": user_id,
            "from_currency": from_currency,
            "from_amount": from_amount,
            "to_currency": to_currency,
            "to_amount": to_amount,
            "from_value_gbp": from_value_gbp,
            "to_value_gbp": net_value_gbp,
            "swap_fee_percent": swap_fee_percent,
            "swap_fee_gbp": swap_fee_gbp,
            "swap_fee_crypto": swap_fee_crypto,
            "swap_fee_currency": from_currency,
            "from_price": from_price,
            "to_price": to_price,
            "rate": to_amount / from_amount if from_amount > 0 else 0,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"✅ Swap completed: {user_id} swapped {from_amount} {from_currency} → {to_amount} {to_currency}, Fee: {swap_fee_crypto} {from_currency}")
        
        return {
            "success": True,
            "swap_id": swap_id,
            "from_currency": from_currency,
            "from_amount": from_amount,
            "to_currency": to_currency,
            "to_amount": to_amount,
            "fee_amount": swap_fee_crypto,
            "fee_currency": from_currency
        }
    except Exception as e:
        logger.error(f"Swap error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
