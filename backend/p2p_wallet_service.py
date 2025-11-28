"""
P2P Trading with Wallet Service Integration
Handles P2P trades using centralized wallet service for all balance operations
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict

logger = logging.getLogger(__name__)

async def p2p_create_trade_with_wallet(
    db,
    wallet_service,
    sell_order_id: str,
    buyer_id: str,
    crypto_amount: float,
    payment_method: str,
    buyer_wallet_address: str,
    buyer_wallet_network: str = None
) -> Dict:
    """
    Create P2P trade and lock seller funds via wallet service
    """
    from p2p_enhanced import Trade
    from wallet_validator import validate_wallet_address
    from fastapi import HTTPException
    
    try:
        # Get sell order
        sell_order = await db.enhanced_sell_orders.find_one({"order_id": sell_order_id}, {"_id": 0})
        if not sell_order or sell_order["status"] != "active":
            raise HTTPException(status_code=400, detail="Offer not available")
        
        # Validate buyer wallet
        wallet_validation = validate_wallet_address(
            buyer_wallet_address,
            sell_order["crypto_currency"],
            buyer_wallet_network
        )
        
        if not wallet_validation["valid"]:
            raise HTTPException(status_code=400, detail=f"Invalid wallet address: {wallet_validation['message']}")
        
        # Validate amount
        if crypto_amount < sell_order["min_purchase"] or crypto_amount > sell_order["max_purchase"]:
            raise HTTPException(status_code=400, detail="Amount outside allowed limits")
        
        if crypto_amount > sell_order["crypto_amount"]:
            raise HTTPException(status_code=400, detail="Not enough crypto available")
        
        # Validate payment method
        if payment_method not in sell_order["payment_methods"]:
            raise HTTPException(status_code=400, detail="Payment method not accepted by seller")
        
        # Check seller balance via wallet service
        seller_balance = await wallet_service.get_balance(
            sell_order["seller_id"],
            sell_order["crypto_currency"]
        )
        
        if seller_balance['available_balance'] < crypto_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Seller has insufficient available balance. Available: {seller_balance['available_balance']}"
            )
        
        # Calculate fiat amount
        fiat_amount = crypto_amount * sell_order["price_per_unit"]
        
        # Get payment timer
        platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
        timer_minutes = platform_settings.get("payment_timer_minutes", 120) if platform_settings else 120
        
        # Create trade record
        trade = Trade(
            sell_order_id=sell_order_id,
            buyer_id=buyer_id,
            seller_id=sell_order["seller_id"],
            crypto_currency=sell_order["crypto_currency"],
            crypto_amount=crypto_amount,
            fiat_currency=sell_order["fiat_currency"],
            fiat_amount=round(fiat_amount, 2),
            price_per_unit=sell_order["price_per_unit"],
            payment_method=payment_method,
            buyer_wallet_address=buyer_wallet_address,
            buyer_wallet_network=wallet_validation.get("network"),
            escrow_locked=True,
            timer_minutes=timer_minutes,
            payment_deadline=datetime.now(timezone.utc) + timedelta(minutes=timer_minutes)
        )
        
        trade_dict = trade.model_dump()
        trade_dict['created_at'] = trade_dict['created_at'].isoformat()
        trade_dict['payment_deadline'] = trade_dict['payment_deadline'].isoformat()
        
        trade_id = trade_dict['trade_id']
        
        # LOCK seller funds via wallet service
        try:
            await wallet_service.lock_balance(
                user_id=sell_order["seller_id"],
                currency=sell_order["crypto_currency"],
                amount=crypto_amount,
                lock_type="p2p_escrow",
                reference_id=trade_id
            )
            logger.info(f"✅ P2P: Locked {crypto_amount} {sell_order['crypto_currency']} for trade {trade_id}")
        except Exception as lock_error:
            logger.error(f"❌ P2P: Failed to lock funds: {str(lock_error)}")
            raise HTTPException(status_code=500, detail=f"Failed to lock funds: {str(lock_error)}")
        
        # Save trade
        await db.trades.insert_one(trade_dict)
        
        # Update sell order
        new_amount = sell_order["crypto_amount"] - crypto_amount
        if new_amount <= 0:
            await db.enhanced_sell_orders.update_one(
                {"order_id": sell_order_id},
                {"$set": {"status": "completed", "crypto_amount": 0}}
            )
        else:
            await db.enhanced_sell_orders.update_one(
                {"order_id": sell_order_id},
                {"$set": {"crypto_amount": new_amount}}
            )
        
        logger.info(f"✅ P2P trade created: {trade_id}")
        
        return {
            "success": True,
            "trade_id": trade_id,
            "escrow_locked": True,
            "payment_deadline": trade_dict['payment_deadline']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ P2P trade creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def p2p_release_crypto_with_wallet(
    db,
    wallet_service,
    trade_id: str,
    seller_id: str
) -> Dict:
    """
    Release crypto from escrow to buyer via wallet service
    Collects platform fee
    """
    try:
        # Get trade
        trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
        if not trade:
            return {"success": False, "message": "Trade not found"}
        
        if trade["seller_id"] != seller_id:
            return {"success": False, "message": "Only seller can release crypto"}
        
        if trade["status"] not in ["payment_confirmed", "buyer_marked_paid"]:
            return {"success": False, "message": f"Trade status must be 'payment_confirmed' or 'buyer_marked_paid', current: {trade['status']}"}
        
        if not trade.get("escrow_locked"):
            return {"success": False, "message": "Funds not in escrow"}
        
        crypto_amount = trade["crypto_amount"]
        currency = trade["crypto_currency"]
        buyer_id = trade["buyer_id"]
        
        # Calculate fees (2% platform fee)
        platform_fee = crypto_amount * 0.02
        amount_to_buyer = crypto_amount - platform_fee
        
        # Step 1: Release locked funds from seller (this removes from locked AND total)
        try:
            await wallet_service.release_locked_balance(
                user_id=seller_id,
                currency=currency,
                amount=crypto_amount,
                release_type="p2p_escrow_release",
                reference_id=trade_id
            )
            logger.info(f"✅ P2P: Released {crypto_amount} {currency} from seller's escrow")
        except Exception as release_error:
            logger.error(f"❌ P2P: Failed to release escrow: {str(release_error)}")
            return {"success": False, "message": f"Failed to release escrow: {str(release_error)}"}
        
        # Step 2: Credit buyer (minus fee)
        try:
            await wallet_service.credit(
                user_id=buyer_id,
                currency=currency,
                amount=amount_to_buyer,
                transaction_type="p2p_buy",
                reference_id=trade_id,
                metadata={"trade_id": trade_id, "seller_id": seller_id}
            )
            logger.info(f"✅ P2P: Credited {amount_to_buyer} {currency} to buyer {buyer_id}")
        except Exception as credit_error:
            logger.error(f"❌ P2P: Failed to credit buyer: {str(credit_error)}")
            # Try to rollback by re-locking seller's funds
            try:
                await wallet_service.credit(
                    user_id=seller_id,
                    currency=currency,
                    amount=crypto_amount,
                    transaction_type="p2p_rollback",
                    reference_id=trade_id,
                    metadata={"reason": "buyer_credit_failed"}
                )
                await wallet_service.lock_balance(
                    user_id=seller_id,
                    currency=currency,
                    amount=crypto_amount,
                    lock_type="p2p_escrow",
                    reference_id=trade_id
                )
            except:
                pass
            return {"success": False, "message": f"Failed to credit buyer: {str(credit_error)}"}
        
        # Step 3: Collect platform fee
        admin_wallet_id = "admin_fee_wallet"
        try:
            await wallet_service.credit(
                user_id=admin_wallet_id,
                currency=currency,
                amount=platform_fee,
                transaction_type="p2p_platform_fee",
                reference_id=trade_id,
                metadata={"trade_id": trade_id, "seller_id": seller_id, "buyer_id": buyer_id}
            )
            logger.info(f"✅ P2P: Collected {platform_fee} {currency} platform fee")
        except Exception as fee_error:
            logger.warning(f"⚠️ P2P: Fee collection failed: {str(fee_error)}")
        
        # Update trade status and save fee for audit trail
        await db.trades.update_one(
            {"trade_id": trade_id},
            {
                "$set": {
                    "status": "completed",
                    "escrow_locked": False,
                    "platform_fee_amount": platform_fee,
                    "platform_fee_currency": currency,
                    "platform_fee_percent": 2.0,
                    "amount_to_buyer": amount_to_buyer,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ P2P trade completed: {trade_id}")
        
        return {
            "success": True,
            "message": "Crypto released to buyer",
            "amount_transferred": amount_to_buyer,
            "platform_fee": platform_fee
        }
        
    except Exception as e:
        logger.error(f"❌ P2P release error: {str(e)}")
        return {"success": False, "message": str(e)}

async def p2p_cancel_trade_with_wallet(
    db,
    wallet_service,
    trade_id: str,
    user_id: str,
    reason: str
) -> Dict:
    """
    Cancel P2P trade and unlock seller funds via wallet service
    """
    try:
        # Get trade
        trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
        if not trade:
            return {"success": False, "message": "Trade not found"}
        
        # Only seller or buyer can cancel
        if user_id not in [trade["seller_id"], trade["buyer_id"]]:
            return {"success": False, "message": "Unauthorized"}
        
        if trade["status"] in ["completed", "cancelled"]:
            return {"success": False, "message": f"Trade already {trade['status']}"}
        
        crypto_amount = trade["crypto_amount"]
        currency = trade["crypto_currency"]
        seller_id = trade["seller_id"]
        
        # Unlock seller funds if still in escrow
        if trade.get("escrow_locked"):
            try:
                await wallet_service.unlock_balance(
                    user_id=seller_id,
                    currency=currency,
                    amount=crypto_amount,
                    unlock_type="p2p_cancelled",
                    reference_id=trade_id
                )
                logger.info(f"✅ P2P: Unlocked {crypto_amount} {currency} for cancelled trade {trade_id}")
            except Exception as unlock_error:
                logger.error(f"❌ P2P: Failed to unlock funds: {str(unlock_error)}")
                return {"success": False, "message": f"Failed to unlock funds: {str(unlock_error)}"}
        
        # Update trade status
        await db.trades.update_one(
            {"trade_id": trade_id},
            {
                "$set": {
                    "status": "cancelled",
                    "escrow_locked": False,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancellation_reason": reason
                }
            }
        )
        
        # Return crypto to sell order availability
        sell_order = await db.enhanced_sell_orders.find_one({"order_id": trade["sell_order_id"]})
        if sell_order:
            await db.enhanced_sell_orders.update_one(
                {"order_id": trade["sell_order_id"]},
                {"$inc": {"crypto_amount": crypto_amount}}
            )
        
        logger.info(f"✅ P2P trade cancelled: {trade_id}")
        
        return {
            "success": True,
            "message": "Trade cancelled and funds unlocked",
            "trade_id": trade_id
        }
        
    except Exception as e:
        logger.error(f"❌ P2P cancel error: {str(e)}")
        return {"success": False, "message": str(e)}
