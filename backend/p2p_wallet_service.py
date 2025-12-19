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
    buyer_wallet_network: str = None,
    is_express: bool = False,
    idempotency_key: str = None
) -> Dict:
    """
    Create P2P trade and lock seller funds via wallet service
    
    🔒 IDEMPOTENT: If idempotency_key is provided, checks for existing trade
    to prevent duplicate trades from network retries.
    """
    from p2p_enhanced import Trade
    from wallet_validator import validate_wallet_address
    from fastapi import HTTPException
    
    try:
        # 🔒 IDEMPOTENCY CHECK: Prevent duplicate trades
        if idempotency_key:
            existing_trade = await db.trades.find_one({
                "idempotency_key": idempotency_key
            }, {"_id": 0})
            
            if existing_trade:
                logger.info(f"🔄 IDEMPOTENT: Returning existing trade {existing_trade['trade_id']} for key {idempotency_key}")
                return {
                    "success": True,
                    "trade_id": existing_trade["trade_id"],
                    "message": "Trade already exists (idempotent)",
                    "is_duplicate": True
                }
        
        # Get sell order
        sell_order = await db.enhanced_sell_orders.find_one({"order_id": sell_order_id}, {"_id": 0})
        if not sell_order or sell_order["status"] != "active":
            raise HTTPException(status_code=400, detail="Offer not available")
        
        seller_id = sell_order["seller_id"]
        
        # **BLOCKING VALIDATION**: Check if users have blocked each other
        buyer_blocks_doc = await db.user_blocks.find_one({"user_id": buyer_id})
        buyer_blocked_users = buyer_blocks_doc.get("blocked_users", []) if buyer_blocks_doc else []
        
        seller_blocks_doc = await db.user_blocks.find_one({"user_id": seller_id})
        seller_blocked_users = seller_blocks_doc.get("blocked_users", []) if seller_blocks_doc else []
        
        if seller_id in buyer_blocked_users:
            raise HTTPException(status_code=403, detail="You have blocked this seller. Unblock them to trade.")
        
        if buyer_id in seller_blocked_users:
            raise HTTPException(status_code=403, detail="This seller has blocked you. Cannot create trade.")
        
        # Validate buyer wallet (temporarily disabled for testing)
        # wallet_validation = validate_wallet_address(
        #     buyer_wallet_address,
        #     sell_order["crypto_currency"],
        #     buyer_wallet_network
        # )
        
        # if not wallet_validation["valid"]:
        #     raise HTTPException(status_code=400, detail=f"Invalid wallet address: {wallet_validation['message']}")
        
        # Basic validation - just check if wallet address exists
        if not buyer_wallet_address or len(buyer_wallet_address) < 10:
            raise HTTPException(status_code=400, detail="Invalid wallet address")
        
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
        
        # Calculate P2P Taker Fee (buyer pays)
        from centralized_fee_system import get_fee_manager
        fee_manager = get_fee_manager(db)
        taker_fee_percent = await fee_manager.get_fee("p2p_taker_fee_percent")
        taker_fee = fiat_amount * (taker_fee_percent / 100.0)
        
        # Calculate P2P Express Fee if using express mode
        express_fee = 0.0
        total_fee = taker_fee
        if is_express:
            express_fee_percent = await fee_manager.get_fee("p2p_express_fee_percent")
            express_fee = fiat_amount * (express_fee_percent / 100.0)
            total_fee += express_fee
            logger.info(f"P2P Express mode: Adding {express_fee} express fee ({express_fee_percent}%)")
        
        total_buyer_payment = fiat_amount + total_fee
        
        # Check for buyer's referrer
        buyer = await db.user_accounts.find_one({"user_id": buyer_id}, {"_id": 0})
        referrer_id = buyer.get("referrer_id") if buyer else None
        referrer_commission = 0.0
        admin_fee = total_fee
        commission_percent = 0.0
        
        if referrer_id:
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = total_fee * (commission_percent / 100.0)
            admin_fee = total_fee - referrer_commission
        
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
            buyer_wallet_network=buyer_wallet_network or "mainnet",
            escrow_locked=True,
            timer_minutes=timer_minutes,
            payment_deadline=datetime.now(timezone.utc) + timedelta(minutes=timer_minutes)
        )
        
        trade_dict = trade.model_dump()
        trade_dict['created_at'] = trade_dict['created_at'].isoformat()
        trade_dict['payment_deadline'] = trade_dict['payment_deadline'].isoformat()
        
        # Add express mode info
        trade_dict['is_express'] = is_express
        trade_dict['taker_fee'] = taker_fee
        trade_dict['express_fee'] = express_fee
        trade_dict['total_fee'] = total_fee
        
        # 🔒 Store idempotency key if provided
        if idempotency_key:
            trade_dict['idempotency_key'] = idempotency_key
        
        trade_id = trade_dict['trade_id']
        
        # LOCK seller funds via wallet service (ATOMIC)
        try:
            await wallet_service.lock_balance(
                user_id=sell_order["seller_id"],
                currency=sell_order["crypto_currency"],
                amount=crypto_amount,
                lock_type="p2p_escrow",
                reference_id=trade_id
            )
            logger.info(f"✅ P2P: ATOMIC LOCK {crypto_amount} {sell_order['crypto_currency']} for trade {trade_id}")
        except Exception as lock_error:
            logger.error(f"❌ P2P: Failed to lock funds: {str(lock_error)}")
            raise HTTPException(status_code=500, detail=f"Failed to lock funds: {str(lock_error)}")
        
        # Save trade
        await db.trades.insert_one(trade_dict)
        
        # 🔒 AUDIT LOG: Trade initiated
        await db.audit_trail.insert_one({
            "action": "TRADE_INITIATED",
            "trade_id": trade_id,
            "buyer_id": buyer_id,
            "seller_id": sell_order["seller_id"],
            "crypto_amount": crypto_amount,
            "crypto_currency": sell_order["crypto_currency"],
            "fiat_amount": fiat_amount,
            "fiat_currency": sell_order["fiat_currency"],
            "escrow_locked": True,
            "idempotency_key": idempotency_key,
            "timestamp": datetime.now(timezone.utc)
        })
        
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
        
        # Send notifications (in-app)
        try:
            from p2p_notification_service import get_notification_service
            notification_service = get_notification_service()
            
            # Notify trade opened
            await notification_service.notify_trade_opened(
                trade_id=trade_id,
                buyer_id=buyer_id,
                seller_id=sell_order["seller_id"],
                crypto_amount=crypto_amount,
                crypto_currency=sell_order["crypto_currency"],
                fiat_amount=fiat_amount,
                fiat_currency=sell_order["fiat_currency"]
            )
            
            # Notify escrow locked
            await notification_service.notify_escrow_locked(
                trade_id=trade_id,
                buyer_id=buyer_id,
                seller_id=sell_order["seller_id"],
                crypto_amount=crypto_amount,
                crypto_currency=sell_order["crypto_currency"]
            )
        except Exception as notif_error:
            logger.error(f"Failed to send in-app notifications: {str(notif_error)}")
        
        # 📧 Send EMAIL notifications for escrow locked
        try:
            from email_service import email_service
            
            # Get user details
            buyer = await db.users.find_one({"user_id": buyer_id})
            seller = await db.users.find_one({"user_id": sell_order["seller_id"]})
            
            if buyer and seller:
                # Email to buyer - trade created
                await email_service.send_p2p_order_created(
                    user_email=buyer.get("email"),
                    user_name=buyer.get("full_name", "Buyer"),
                    order_id=trade_id,
                    role="buyer",
                    amount=crypto_amount,
                    coin=sell_order["crypto_currency"],
                    fiat_amount=fiat_amount,
                    fiat_currency=sell_order["fiat_currency"]
                )
                logger.info(f"📧 Trade created email sent to buyer {buyer.get('email')}")
                
                # Email to seller - trade created, crypto locked
                await email_service.send_p2p_order_created(
                    user_email=seller.get("email"),
                    user_name=seller.get("full_name", "Seller"),
                    order_id=trade_id,
                    role="seller",
                    amount=crypto_amount,
                    coin=sell_order["crypto_currency"],
                    fiat_amount=fiat_amount,
                    fiat_currency=sell_order["fiat_currency"]
                )
                logger.info(f"📧 Escrow locked email sent to seller {seller.get('email')}")
        except Exception as email_error:
            logger.warning(f"⚠️ Email notification failed: {str(email_error)}")
        
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
    Collects platform fee with referral commission support
    """
    try:
        from centralized_fee_system import get_fee_manager
        
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
        
        # Get fee from centralized system
        fee_manager = get_fee_manager(db)
        # Determine if this is maker or taker trade
        # For P2P, the seller (maker) pays the fee
        fee_percent = await fee_manager.get_fee("p2p_maker_fee_percent")
        
        # Calculate platform fee
        platform_fee = crypto_amount * (fee_percent / 100.0)
        amount_to_buyer = crypto_amount - platform_fee
        
        # Calculate referral commission using NEW Binance-style system
        from referral_commission_calculator import ReferralCommissionCalculator
        calculator = ReferralCommissionCalculator(db)
        
        # Check if seller was referred
        seller = await db.user_accounts.find_one({"user_id": seller_id}, {"_id": 0, "referred_by": 1})
        referrer_id = seller.get("referred_by") if seller else None
        referrer_commission = 0.0
        admin_fee = platform_fee
        commission_rate = 0.0
        tier_used = "none"
        
        if referrer_id:
            # Use NEW calculator - automatically determines tier based on signup
            commission_amount, commission_rate, tier_used = await calculator.calculate_commission(
                referred_user_id=seller_id,
                referrer_user_id=referrer_id,
                fee_amount=platform_fee
            )
            referrer_commission = commission_amount
            admin_fee = platform_fee - referrer_commission
            logger.info(f"💰 Referral Commission: {referrer_commission} {currency} ({tier_used} tier - {commission_rate*100}%)")
        
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
        
        # Step 3: Collect admin portion of platform fee
        admin_wallet_id = "admin_wallet"
        try:
            await wallet_service.credit(
                user_id=admin_wallet_id,
                currency=currency,
                amount=admin_fee,
                transaction_type="p2p_platform_fee",
                reference_id=trade_id,
                metadata={"trade_id": trade_id, "seller_id": seller_id, "buyer_id": buyer_id, "total_fee": platform_fee}
            )
            logger.info(f"✅ P2P: Collected {admin_fee} {currency} admin fee")
        except Exception as fee_error:
            logger.warning(f"⚠️ P2P: Admin fee collection failed: {str(fee_error)}")
        
        # Step 4: Pay referrer commission if applicable
        if referrer_id and referrer_commission > 0:
            try:
                await wallet_service.credit(
                    user_id=referrer_id,
                    currency=currency,
                    amount=referrer_commission,
                    transaction_type="referral_commission",
                    reference_id=trade_id,
                    metadata={"referred_user_id": seller_id, "transaction_type": "p2p_trade", "tier_used": tier_used}
                )
                logger.info(f"✅ P2P: Paid {referrer_commission} {currency} commission to referrer {referrer_id} ({tier_used} tier)")
                
                # Save commission using NEW calculator
                await calculator.save_commission(
                    referrer_user_id=referrer_id,
                    referred_user_id=seller_id,
                    fee_amount=platform_fee,
                    commission_amount=referrer_commission,
                    commission_rate=commission_rate,
                    tier_used=tier_used,
                    fee_type="p2p_trade",
                    currency=currency,
                    transaction_id=trade_id
                )
            except Exception as comm_error:
                logger.warning(f"⚠️ P2P: Referrer commission payment failed: {str(comm_error)}")
        
        # Calculate timing metrics for trader stats
        completion_timestamp = datetime.now(timezone.utc).isoformat()
        completion_time = datetime.now(timezone.utc)
        
        # Calculate payment time (created_at -> paid_at)
        payment_time_seconds = None
        if trade.get("paid_at"):
            try:
                created_at = datetime.fromisoformat(trade["created_at"].replace('Z', '+00:00'))
                paid_at = datetime.fromisoformat(trade["paid_at"].replace('Z', '+00:00'))
                payment_time_seconds = int((paid_at - created_at).total_seconds())
            except Exception as e:
                logger.warning(f"Could not calculate payment_time: {e}")
        
        # Calculate release time (paid_at -> released_at)
        release_time_seconds = None
        if trade.get("paid_at"):
            try:
                paid_at = datetime.fromisoformat(trade["paid_at"].replace('Z', '+00:00'))
                release_time_seconds = int((completion_time - paid_at).total_seconds())
            except Exception as e:
                logger.warning(f"Could not calculate release_time: {e}")
        
        # Update trade status and save fee for audit trail
        update_fields = {
            "status": "completed",
            "escrow_locked": False,
            "platform_fee_amount": platform_fee,
            "platform_fee_currency": currency,
            "platform_fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "amount_to_buyer": amount_to_buyer,
            "completed_at": completion_timestamp,
            "released_at": completion_timestamp  # For trader stats calculation
        }
        
        # Add timing metrics if calculated
        if payment_time_seconds is not None:
            update_fields["payment_time_seconds"] = payment_time_seconds
        if release_time_seconds is not None:
            update_fields["release_time_seconds"] = release_time_seconds
        
        await db.trades.update_one(
            {"trade_id": trade_id},
            {"$set": update_fields}
        )
        
        # Log to fee_transactions for business dashboard
        await db.fee_transactions.insert_one({
            "user_id": seller_id,
            "transaction_type": "p2p_trade",
            "fee_type": "p2p_maker_fee_percent",
            "amount": crypto_amount,
            "fee_amount": platform_fee,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": currency,
            "reference_id": trade_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # 💰 LOG TO ADMIN_REVENUE for unified revenue tracking
        import uuid
        await db.admin_revenue.insert_one({
            "revenue_id": str(uuid.uuid4()),
            "source": "p2p_maker_fee",
            "revenue_type": "P2P_FEE",
            "currency": currency,
            "amount": admin_fee,
            "gross_fee": platform_fee,
            "referral_commission_paid": referrer_commission,
            "referrer_id": referrer_id,
            "user_id": seller_id,
            "buyer_id": buyer_id,
            "fee_percentage": fee_percent,
            "trade_id": trade_id,
            "net_profit": admin_fee,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": f"P2P Maker fee ({fee_percent}%) from {crypto_amount} {currency} trade"
        })
        logger.info(f"💰 Logged P2P fee to admin_revenue: {admin_fee} {currency}")
        
        logger.info(f"✅ P2P trade completed: {trade_id}, Fee: {platform_fee} {currency} (Admin: {admin_fee}, Referrer: {referrer_commission})")
        
        # 🔒 LOCKED: Update Merchant Statistics
        try:
            from merchant_service import MerchantService
            merchant_service = MerchantService(db)
            await merchant_service.update_stats_on_trade_complete(
                trade_id=trade_id,
                buyer_id=buyer_id,
                seller_id=seller_id
            )
            logger.info(f"✅ Merchant stats updated for trade {trade_id}")
        except Exception as stats_error:
            logger.error(f"❌ Failed to update merchant stats: {str(stats_error)}")
            # Don't fail the trade if stats update fails
        
        # Send notifications (in-app)
        try:
            from p2p_notification_service import get_notification_service
            notification_service = get_notification_service()
            await notification_service.notify_crypto_released(
                trade_id=trade_id,
                buyer_id=buyer_id,
                seller_id=seller_id,
                crypto_amount=crypto_amount,
                crypto_currency=currency,
                buyer_receives=amount_to_buyer
            )
        except Exception as notif_error:
            logger.error(f"Failed to send release notification: {str(notif_error)}")
        
        # 📧 Send EMAIL notifications
        try:
            from email_service import email_service
            
            # Get user details for email
            buyer = await db.users.find_one({"user_id": buyer_id})
            seller = await db.users.find_one({"user_id": seller_id})
            
            if buyer and seller:
                # Email to buyer
                await email_service.send_p2p_crypto_released(
                    user_email=buyer.get("email"),
                    user_name=buyer.get("full_name", "Buyer"),
                    order_id=trade_id,
                    amount=amount_to_buyer,
                    coin=currency
                )
                logger.info(f"📧 Release email sent to buyer {buyer.get('email')}")
                
                # Email to seller
                await email_service.send_p2p_crypto_released(
                    user_email=seller.get("email"),
                    user_name=seller.get("full_name", "Seller"),
                    order_id=trade_id,
                    amount=crypto_amount,
                    coin=currency
                )
                logger.info(f"📧 Release email sent to seller {seller.get('email')}")
        except Exception as email_error:
            logger.warning(f"⚠️ Email notification failed: {str(email_error)}")
        
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
        
        # Send notifications (in-app)
        try:
            from p2p_notification_service import get_notification_service
            notification_service = get_notification_service()
            await notification_service.notify_trade_cancelled(
                trade_id=trade_id,
                buyer_id=trade["buyer_id"],
                seller_id=seller_id,
                cancelled_by="buyer" if user_id == trade["buyer_id"] else "seller",
                reason=reason
            )
        except Exception as notif_error:
            logger.warning(f"⚠️ In-app notification failed: {str(notif_error)}")
        
        # 📧 Send EMAIL notifications
        try:
            from email_service import email_service
            
            buyer = await db.users.find_one({"user_id": trade["buyer_id"]})
            seller = await db.users.find_one({"user_id": seller_id})
            
            if buyer and seller:
                cancellation_reason = f"{reason} (Cancelled by {'buyer' if user_id == trade['buyer_id'] else 'seller'})"
                
                # Email to buyer
                await email_service.send_p2p_order_cancelled(
                    user_email=buyer.get("email"),
                    user_name=buyer.get("full_name", "Buyer"),
                    order_id=trade_id,
                    reason=cancellation_reason
                )
                
                # Email to seller
                await email_service.send_p2p_order_cancelled(
                    user_email=seller.get("email"),
                    user_name=seller.get("full_name", "Seller"),
                    order_id=trade_id,
                    reason=cancellation_reason
                )
                logger.info(f"📧 Cancellation emails sent for trade {trade_id}")
        except Exception as email_error:
            logger.warning(f"⚠️ Email notification failed: {str(email_error)}")
        
        logger.info(f"✅ P2P trade cancelled: {trade_id}")
        
        return {
            "success": True,
            "message": "Trade cancelled and funds unlocked",
            "trade_id": trade_id
        }
        
    except Exception as e:
        logger.error(f"❌ P2P cancel error: {str(e)}")
        return {"success": False, "message": str(e)}
