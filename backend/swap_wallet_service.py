# Swap & Express Buy with Wallet Service Integration

import logging
from datetime import datetime, timezone
from typing import Dict
from fastapi import HTTPException
import uuid

logger = logging.getLogger(__name__)

async def execute_express_buy_with_wallet(db, wallet_service, user_id: str, crypto_currency: str, crypto_amount: float, fiat_amount: float, fiat_currency: str = "GBP") -> Dict:
    """Execute express buy via wallet service - debit fiat, credit crypto
    
    LIQUIDITY ENFORCEMENT:
    - Check admin has enough crypto BEFORE allowing buy
    - Reserve liquidity atomically
    - Deduct liquidity after successful transaction
    - Release liquidity if transaction fails
    """
    try:
        from centralized_fee_system import get_fee_manager
        from liquidity_lock_service import get_liquidity_service
        
        order_id = str(uuid.uuid4())
        
        # Get fee from centralized fee system
        fee_manager = get_fee_manager(db)
        # Express buy uses instant_buy_fee_percent (2%)
        fee_percent = await fee_manager.get_fee("instant_buy_fee_percent")
        
        # Calculate total cost
        base_cost = fiat_amount
        fee_amount = base_cost * (fee_percent / 100)
        total_cost = base_cost + fee_amount
        
        # LIQUIDITY ENFORCEMENT STEP 1: Check and reserve admin liquidity
        liquidity_service = get_liquidity_service(db)
        liquidity_check = await liquidity_service.check_and_reserve_liquidity(
            currency=crypto_currency,
            required_amount=crypto_amount,
            transaction_type="instant_buy",
            transaction_id=order_id,
            user_id=user_id,
            metadata={"fiat_amount": fiat_amount, "fee_amount": fee_amount}
        )
        
        if not liquidity_check["success"]:
            logger.error(f"🚫 INSTANT BUY BLOCKED: {liquidity_check['message']}")
            raise HTTPException(
                status_code=400,
                detail=f"Transaction blocked due to insufficient admin liquidity. {liquidity_check['message']}"
            )
        
        logger.info(f"✅ Admin liquidity reserved: {crypto_amount} {crypto_currency} for instant buy")
        
        # Check user balance
        balance = await wallet_service.get_balance(user_id, fiat_currency)
        if balance['available_balance'] < total_cost:
            # Release reserved liquidity
            await liquidity_service.release_reserved_liquidity(
                currency=crypto_currency,
                amount=crypto_amount,
                transaction_type="instant_buy",
                transaction_id=order_id,
                reason="insufficient_user_balance"
            )
            raise HTTPException(status_code=400, detail=f"Insufficient {fiat_currency} balance. Required: {total_cost}, Available: {balance['available_balance']}")
        
        try:
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
            
            # LIQUIDITY ENFORCEMENT STEP 2: Deduct from admin liquidity (transaction successful)
            await liquidity_service.deduct_liquidity(
                currency=crypto_currency,
                amount=crypto_amount,
                transaction_type="instant_buy",
                transaction_id=order_id,
                user_id=user_id,
                metadata={"fiat_amount": fiat_amount, "fee_amount": fee_amount}
            )
            
            logger.info(f"✅ Admin liquidity deducted: {crypto_amount} {crypto_currency}")
            
        except Exception as wallet_error:
            # Release reserved liquidity if wallet operations fail
            logger.error(f"❌ Wallet operation failed, releasing liquidity: {str(wallet_error)}")
            await liquidity_service.release_reserved_liquidity(
                currency=crypto_currency,
                amount=crypto_amount,
                transaction_type="instant_buy",
                transaction_id=order_id,
                reason="wallet_operation_failed"
            )
            raise
        
        # Check for referrer and calculate commission
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        referrer_id = user.get("referrer_id") if user else None
        referrer_commission = 0.0
        admin_fee = fee_amount
        
        if referrer_id:
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = fee_amount * (commission_percent / 100.0)
            admin_fee = fee_amount - referrer_commission
        
        # Credit admin wallet with admin portion of fee
        await wallet_service.credit(
            user_id="admin_wallet",
            currency=fiat_currency,
            amount=admin_fee,
            transaction_type="express_buy_fee",
            reference_id=order_id,
            metadata={"user_id": user_id, "total_fee": fee_amount}
        )
        
        # Process referral using centralized engine
        try:
            from referral_engine import get_referral_engine
            referral_engine = get_referral_engine()
            await referral_engine.process_referral_commission(
                user_id=user_id,
                fee_amount=fee_amount,
                fee_type="INSTANT_BUY",
                currency=fiat_currency,
                related_transaction_id=order_id,
                metadata={"crypto_amount": crypto_amount, "crypto_currency": crypto_currency}
            )
        except Exception as ref_err:
            logger.warning(f"Referral failed: {ref_err}")
        
        # OLD CODE BELOW - REMOVE LATER
        if referrer_id and referrer_commission > 0:
            await wallet_service.credit(
                user_id=referrer_id,
                currency=fiat_currency,
                amount=referrer_commission,
                transaction_type="referral_commission",
                reference_id=order_id,
                metadata={"referred_user_id": user_id, "transaction_type": "express_buy"}
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": user_id,
                "transaction_type": "express_buy",
                "fee_amount": fee_amount,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": fiat_currency,
                "transaction_id": order_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Save express buy transaction with complete fee information for audit trail
        await db.express_buy_transactions.insert_one({
            "transaction_id": order_id,
            "user_id": user_id,
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "fiat_currency": fiat_currency,
            "fiat_amount": fiat_amount,
            "fee_amount": fee_amount,
            "fee_currency": fiat_currency,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "total_cost": total_cost,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Log to fee_transactions for business dashboard
        await db.fee_transactions.insert_one({
            "user_id": user_id,
            "transaction_type": "express_buy",
            "fee_type": "instant_buy_fee_percent",
            "amount": fiat_amount,
            "fee_amount": fee_amount,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": fiat_currency,
            "reference_id": order_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"✅ Express Buy: {user_id} bought {crypto_amount} {crypto_currency} for {total_cost} {fiat_currency} (Fee: {fee_amount}, Admin: {admin_fee}, Referrer: {referrer_commission})")
        
        return {
            "success": True,
            "order_id": order_id,
            "crypto_amount": crypto_amount,
            "total_cost": total_cost,
            "fee_amount": fee_amount,
            "base_cost": base_cost
        }
    except Exception as e:
        logger.error(f"❌ Express buy error: {str(e)}")
        raise

async def execute_swap_with_wallet(db, wallet_service, user_id: str, from_currency: str, to_currency: str, from_amount: float) -> Dict:
    try:
        from escrow_balance_system import get_trader_balance
        from unified_price_service import get_unified_price_service
        from centralized_fee_system import get_fee_manager
        
        # Get unified price service instance
        price_service = get_unified_price_service()
        fee_manager = get_fee_manager(db)
        
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
        
        # Get swap fee from centralized fee system (1.5%)
        swap_fee_percent = await fee_manager.get_fee("swap_fee_percent")
        
        from_value_gbp = from_amount * from_price
        swap_fee_gbp = from_value_gbp * (swap_fee_percent / 100)
        net_value_gbp = from_value_gbp - swap_fee_gbp
        to_amount = net_value_gbp / to_price
        swap_fee_crypto = swap_fee_gbp / from_price
        
        # 🔒 LIQUIDITY SAFETY CHECK - Ensure admin has destination currency
        from liquidity_checker import LiquidityChecker
        
        liquidity_checker = LiquidityChecker(db)
        liquidity_check = await liquidity_checker.check_and_log(
            currency=to_currency,
            amount=to_amount,
            operation_type="swap",
            user_id=user_id,
            metadata={
                "from_currency": from_currency,
                "from_amount": from_amount,
                "to_currency": to_currency,
                "to_amount": to_amount,
                "swap_fee": swap_fee_crypto
            }
        )
        
        if not liquidity_check["can_execute"]:
            logger.error(f"🚫 SWAP BLOCKED: {liquidity_check['message']}")
            raise HTTPException(
                status_code=400,
                detail=f"Swap unavailable: {liquidity_check['message']}"
            )
        
        logger.info(f"✅ LIQUIDITY CHECK PASSED for swap: {to_amount} {to_currency}")
        
        # Calculate referral commission using NEW Binance-style system
        from referral_commission_calculator import ReferralCommissionCalculator
        calculator = ReferralCommissionCalculator(db)
        
        # Check if user was referred
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0, "referred_by": 1})
        referrer_id = user.get("referred_by") if user else None
        referrer_commission = 0.0
        admin_fee = swap_fee_crypto
        commission_rate = 0.0
        tier_used = "none"
        
        if referrer_id:
            # Use NEW calculator - automatically determines tier based on signup
            commission_amount, commission_rate, tier_used = await calculator.calculate_commission(
                referred_user_id=user_id,
                referrer_user_id=referrer_id,
                fee_amount=swap_fee_crypto
            )
            referrer_commission = commission_amount
            admin_fee = swap_fee_crypto - referrer_commission
            logger.info(f"💰 Swap Referral Commission: {referrer_commission} {from_currency} ({tier_used} tier - {commission_rate*100}%)")
        
        import uuid
        swap_id = str(uuid.uuid4())
        
        # Execute swap
        await wallet_service.debit(user_id=user_id, currency=from_currency, amount=from_amount, transaction_type="swap_out", reference_id=swap_id, metadata={"to_currency": to_currency, "to_amount": to_amount})
        
        # 🔒 DEDUCT DESTINATION CURRENCY FROM ADMIN LIQUIDITY (NO MINTING)
        await db.admin_liquidity_wallets.update_one(
            {"currency": to_currency},
            {
                "$inc": {"available": -to_amount, "balance": -to_amount},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # 🔒 ADD SOURCE CURRENCY TO ADMIN LIQUIDITY (CLOSED SYSTEM)
        await db.admin_liquidity_wallets.update_one(
            {"currency": from_currency},
            {
                "$inc": {"available": from_amount, "balance": from_amount},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                "$setOnInsert": {
                    "reserved": 0,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        logger.info(f"💰 SWAP LIQUIDITY: Deducted {to_amount} {to_currency}, Added {from_amount} {from_currency}")
        
        await wallet_service.credit(user_id=user_id, currency=to_currency, amount=to_amount, transaction_type="swap_in", reference_id=swap_id, metadata={"from_currency": from_currency})
        
        # Credit admin wallet with admin portion of fee
        # UPDATE ALL 4 COLLECTIONS for proper sync (wallets, internal_balances, crypto_balances, trader_balances)
        timestamp = datetime.now(timezone.utc)
        
        # Get current admin_wallet balance
        admin_wallet = await db.wallets.find_one({"user_id": "admin_wallet", "currency": from_currency})
        current_balance = float(admin_wallet.get("available_balance", 0)) if admin_wallet else 0
        new_balance = current_balance + admin_fee
        
        balance_update = {
            "available_balance": new_balance,
            "total_balance": new_balance,
            "balance": new_balance,
            "last_updated": timestamp,
            "updated_at": timestamp
        }
        
        # Update wallets collection
        await db.wallets.update_one(
            {"user_id": "admin_wallet", "currency": from_currency},
            {"$set": {**balance_update, "user_id": "admin_wallet", "currency": from_currency}},
            upsert=True
        )
        
        # Update internal_balances collection
        await db.internal_balances.update_one(
            {"user_id": "admin_wallet", "currency": from_currency},
            {"$set": {**balance_update, "user_id": "admin_wallet", "currency": from_currency}},
            upsert=True
        )
        
        # Update crypto_balances collection
        await db.crypto_balances.update_one(
            {"user_id": "admin_wallet", "currency": from_currency},
            {"$set": {**balance_update, "user_id": "admin_wallet", "currency": from_currency}},
            upsert=True
        )
        
        # Update trader_balances collection
        await db.trader_balances.update_one(
            {"trader_id": "admin_wallet", "currency": from_currency},
            {"$set": {**balance_update, "trader_id": "admin_wallet", "currency": from_currency}},
            upsert=True
        )
        
        logger.info(f"💰 SWAP FEE {admin_fee} {from_currency} credited to admin_wallet (synced to all 4 collections)")
        
        # Save referral commission using NEW calculator
        if referrer_id and referrer_commission > 0:
            try:
                await calculator.save_commission(
                    referrer_user_id=referrer_id,
                    referred_user_id=user_id,
                    fee_amount=swap_fee_crypto,
                    commission_amount=referrer_commission,
                    commission_rate=commission_rate,
                    tier_used=tier_used,
                    fee_type="swap",
                    currency=from_currency,
                    transaction_id=swap_id
                )
                logger.info(f"✅ Swap referral commission saved: {referrer_commission} {from_currency} ({tier_used} tier)")
            except Exception as ref_err:
                logger.warning(f"⚠️ Referral commission save failed for swap: {ref_err}")
        
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
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "from_price": from_price,
            "to_price": to_price,
            "rate": to_amount / from_amount if from_amount > 0 else 0,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Log to fee_transactions for business dashboard
        await db.fee_transactions.insert_one({
            "user_id": user_id,
            "transaction_type": "swap",
            "fee_type": "swap_fee_percent",
            "amount": from_amount,
            "fee_amount": swap_fee_crypto,
            "fee_percent": swap_fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": from_currency,
            "reference_id": swap_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # ═══════════════════════════════════════════════════════════════
        # LOG SWAP FEE TO ADMIN REVENUE (DASHBOARD VISIBILITY)
        # ═══════════════════════════════════════════════════════════════
        await db.admin_revenue.insert_one({
            "revenue_id": str(uuid.uuid4()),
            "source": "swap_fee",
            "revenue_type": "SWAP_EXCHANGE",
            "currency": from_currency,
            "amount": swap_fee_crypto,
            "amount_gbp": swap_fee_gbp,
            "user_id": user_id,
            "related_transaction_id": swap_id,
            "fee_percentage": swap_fee_percent,
            "referral_commission_paid": referrer_commission,
            "net_profit": admin_fee,
            "timestamp": datetime.now(timezone.utc),  # STORE AS DATETIME, NOT STRING
            "description": f"Swap fee ({swap_fee_percent}%) from {from_currency} to {to_currency}"
        })
        logger.info(f"✅ SWAP FEE logged to admin_revenue: {admin_fee} {from_currency}")
        
        logger.info(f"✅ Swap completed: {user_id} swapped {from_amount} {from_currency} → {to_amount} {to_currency}, Fee: {swap_fee_crypto} {from_currency} (Admin: {admin_fee}, Referrer: {referrer_commission})")
        
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


async def execute_instant_sell_with_wallet(db, wallet_service, user_id: str, crypto_currency: str, crypto_amount: float, fiat_currency: str = "GBP") -> Dict:
    """Execute instant sell via wallet service - debit crypto, credit fiat
    
    LIQUIDITY ENFORCEMENT:
    - Add crypto to admin liquidity (user is selling to admin)
    - Log the liquidity increase
    - Atomic operation
    """
    try:
        from centralized_fee_system import get_fee_manager
        from live_pricing import get_live_price
        from liquidity_lock_service import get_liquidity_service
        
        sell_id = str(uuid.uuid4())
        
        # Get live price
        crypto_price = await get_live_price(crypto_currency, fiat_currency, db)
        if not crypto_price:
            raise HTTPException(status_code=400, detail=f"Unable to fetch price for {crypto_currency}")
        
        # Calculate fiat value
        fiat_value = crypto_amount * crypto_price
        
        # Get fee from centralized fee system
        fee_manager = get_fee_manager(db)
        fee_percent = await fee_manager.get_fee("instant_sell_fee_percent")
        
        # Calculate fee
        fee_amount = fiat_value * (fee_percent / 100)
        net_fiat_amount = fiat_value - fee_amount
        
        # Process referral using centralized engine
        from referral_engine import get_referral_engine
        referral_engine = get_referral_engine()
        commission_result = await referral_engine.process_referral_commission(
            user_id=user_id,
            fee_amount=fee_amount,
            fee_type="INSTANT_SELL",
            currency=fiat_currency,
            related_transaction_id=sell_id,
            metadata={"crypto_amount": crypto_amount, "crypto_currency": crypto_currency, "fiat_value": fiat_value}
        )
        
        # Extract referral details for logging
        if commission_result["success"]:
            referrer_commission = commission_result['commission_amount']
            admin_fee = fee_amount - referrer_commission
            referrer_id = commission_result.get('referrer_id')
            logger.info(f"✅ Instant Sell referral commission: {referrer_commission} {fiat_currency}")
        else:
            referrer_commission = 0.0
            admin_fee = fee_amount
            referrer_id = None
        
        # Debit crypto from user
        await wallet_service.debit(
            user_id=user_id,
            currency=crypto_currency,
            amount=crypto_amount,
            transaction_type="instant_sell_crypto",
            reference_id=sell_id,
            metadata={"fiat_currency": fiat_currency, "fiat_value": fiat_value, "fee": fee_amount}
        )
        
        # LIQUIDITY ENFORCEMENT: Add crypto to admin liquidity (user sold to admin)
        liquidity_service = get_liquidity_service(db)
        await liquidity_service.add_liquidity(
            currency=crypto_currency,
            amount=crypto_amount,
            transaction_type="instant_sell",
            transaction_id=sell_id,
            user_id=user_id,
            metadata={"fiat_value": fiat_value, "fee_amount": fee_amount}
        )
        
        logger.info(f"✅ Admin liquidity increased: {crypto_amount} {crypto_currency} (instant sell)")
        
        # Credit net fiat to user
        await wallet_service.credit(
            user_id=user_id,
            currency=fiat_currency,
            amount=net_fiat_amount,
            transaction_type="instant_sell_fiat",
            reference_id=sell_id,
            metadata={"crypto_currency": crypto_currency, "crypto_amount": crypto_amount}
        )
        
        # Credit admin wallet with full fee
        # (Note: referral_engine already handles commission split and crediting)
        await wallet_service.credit(
            user_id="admin_wallet",
            currency=fiat_currency,
            amount=fee_amount,
            transaction_type="instant_sell_fee",
            reference_id=sell_id,
            metadata={"user_id": user_id, "total_fee": fee_amount}
        )
        
        # Save instant sell transaction
        await db.instant_sell_transactions.insert_one({
            "transaction_id": sell_id,
            "user_id": user_id,
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "fiat_currency": fiat_currency,
            "fiat_value": fiat_value,
            "fee_amount": fee_amount,
            "fee_currency": fiat_currency,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "net_fiat_received": net_fiat_amount,
            "crypto_price": crypto_price,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Log to fee_transactions
        await db.fee_transactions.insert_one({
            "user_id": user_id,
            "transaction_type": "instant_sell",
            "fee_type": "instant_sell_fee_percent",
            "amount": fiat_value,
            "fee_amount": fee_amount,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": fiat_currency,
            "reference_id": sell_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"✅ Instant Sell: {user_id} sold {crypto_amount} {crypto_currency} for {net_fiat_amount} {fiat_currency} (Fee: {fee_amount}, Admin: {admin_fee}, Referrer: {referrer_commission})")
        
        return {
            "success": True,
            "sell_id": sell_id,
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "fiat_currency": fiat_currency,
            "fiat_value": fiat_value,
            "fee_amount": fee_amount,
            "net_fiat_received": net_fiat_amount
        }
    except Exception as e:
        logger.error(f"❌ Instant Sell error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
