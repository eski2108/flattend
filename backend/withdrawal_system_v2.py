# Withdrawal System V2 - Using Central Wallet Service
# Handles crypto withdrawals with admin approval via unified wallet

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

class WithdrawalRequest(BaseModel):
    """User withdrawal request"""
    withdrawal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    currency: str
    amount: float
    wallet_address: str
    network: Optional[str] = None
    is_fiat: bool = False
    fee_percent: float = 1.5
    fee_amount: float
    network_fee_percent: float = 1.0
    network_fee_amount: float = 0.0
    fiat_fee_percent: float = 0.0
    fiat_fee_amount: float = 0.0
    total_fee: float
    net_amount: float
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    completed_at: Optional[str] = None

class WithdrawalApproval(BaseModel):
    """Admin approval/rejection of withdrawal"""
    withdrawal_id: str
    admin_id: str
    action: str
    rejection_reason: Optional[str] = None

async def create_withdrawal_request_v2(db, wallet_service, user_id: str, currency: str, 
                                      amount: float, wallet_address: str, network: str = None) -> dict:
    """
    Create withdrawal request using wallet service
    Locks balance immediately to prevent double-spend
    Uses centralized fee system
    """
    from wallet_validator import validate_wallet_address
    from centralized_fee_system import get_fee_manager
    
    try:
        # Validate wallet address
        validation = validate_wallet_address(wallet_address, currency, network)
        if not validation["valid"]:
            return {
                "success": False,
                "message": f"Invalid wallet address: {validation['message']}"
            }
        
        # Check user balance via crypto_balances collection (direct DB access)
        balance_doc = await db.crypto_balances.find_one({"user_id": user_id, "currency": currency})
        if not balance_doc:
            return {
                "success": False,
                "message": f"No {currency} balance found for user"
            }
        available = balance_doc.get('balance', 0)
        
        if amount > available:
            return {
                "success": False,
                "message": f"Insufficient balance. Available: {available} {currency}, Requested: {amount}"
            }
        
        # Get fees from centralized system
        fee_manager = get_fee_manager(db)
        withdrawal_fee_percent = await fee_manager.get_fee("withdrawal_fee_percent")
        network_fee_percent = await fee_manager.get_fee("network_withdrawal_fee_percent")
        
        # Check if this is a fiat currency withdrawal
        FIAT_CURRENCIES = ["GBP", "USD", "EUR", "CAD", "AUD"]
        is_fiat = currency.upper() in FIAT_CURRENCIES
        
        # Calculate fees
        withdrawal_fee = amount * (withdrawal_fee_percent / 100)
        network_fee = amount * (network_fee_percent / 100) if not is_fiat else 0.0  # No network fee for fiat
        fiat_withdrawal_fee = 0.0
        
        if is_fiat:
            fiat_fee_percent = await fee_manager.get_fee("fiat_withdrawal_fee_percent")
            fiat_withdrawal_fee = amount * (fiat_fee_percent / 100)
        
        total_fee = withdrawal_fee + network_fee + fiat_withdrawal_fee
        net_amount = amount - total_fee
        
        logger.info(f"Withdrawal fees for {currency}: Base {withdrawal_fee}, Network {network_fee}, Fiat {fiat_withdrawal_fee}, Total {total_fee}")
        
        # 🔒 LIQUIDITY SAFETY CHECK - Prevent withdrawals if admin doesn't have liquidity
        from liquidity_checker import LiquidityChecker
        
        liquidity_checker = LiquidityChecker(db)
        liquidity_check = await liquidity_checker.check_and_log(
            currency=currency,
            amount=net_amount,  # Amount user will receive
            operation_type=f"withdrawal_{currency}",
            user_id=user_id,
            metadata={
                "gross_amount": amount,
                "total_fee": total_fee,
                "net_amount": net_amount,
                "wallet_address": wallet_address,
                "network": network,
                "is_fiat": is_fiat
            }
        )
        
        if not liquidity_check["can_execute"]:
            logger.error(f"🚫 WITHDRAWAL BLOCKED: {liquidity_check['message']}")
            return {
                "success": False,
                "message": f"Withdrawal temporarily unavailable. {liquidity_check['message']}",
                "reason": "insufficient_platform_liquidity",
                "available_liquidity": liquidity_check.get("available_liquidity", 0),
                "required_liquidity": liquidity_check.get("required_liquidity", 0),
                "shortage": liquidity_check.get("shortage", 0)
            }
        
        logger.info(f"✅ LIQUIDITY CHECK PASSED for withdrawal: {net_amount} {currency}")
        
        # Create withdrawal request
        withdrawal = WithdrawalRequest(
            user_id=user_id,
            currency=currency,
            amount=amount,
            wallet_address=wallet_address,
            network=validation.get("network") or network if not is_fiat else None,
            is_fiat=is_fiat,
            fee_percent=withdrawal_fee_percent,
            fee_amount=withdrawal_fee,
            network_fee_percent=network_fee_percent if not is_fiat else 0.0,
            network_fee_amount=network_fee,
            fiat_fee_percent=fiat_fee_percent if is_fiat else 0.0,
            fiat_fee_amount=fiat_withdrawal_fee,
            total_fee=total_fee,
            net_amount=net_amount,
            status="pending"
        )
        
        withdrawal_id = withdrawal.withdrawal_id
        
        # IMPORTANT: Lock balance immediately to prevent user from trading/withdrawing again
        try:
            # Move balance from available to locked in crypto_balances
            current_locked = balance_doc.get('locked_balance', 0)
            new_balance = available - amount
            new_locked = current_locked + amount
            
            await db.crypto_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {
                    "$set": {
                        "balance": new_balance,
                        "locked_balance": new_locked,
                        "last_updated": datetime.now(timezone.utc)
                    }
                }
            )
            logger.info(f"✅ Locked {amount} {currency} for withdrawal {withdrawal_id} (balance: {available} -> {new_balance}, locked: {current_locked} -> {new_locked})")
        except Exception as lock_error:
            logger.error(f"❌ Failed to lock balance: {str(lock_error)}")
            return {
                "success": False,
                "message": f"Failed to lock balance: {str(lock_error)}"
            }
        
        # Save withdrawal request
        await db.withdrawal_requests.insert_one(withdrawal.model_dump())
        
        logger.info(f"✅ Withdrawal request created: {withdrawal_id} | {amount} {currency}")
        
        fee_breakdown = {
            "withdrawal_fee": withdrawal_fee,
        }
        if network_fee > 0:
            fee_breakdown["network_fee"] = network_fee
        if fiat_withdrawal_fee > 0:
            fee_breakdown["fiat_withdrawal_fee"] = fiat_withdrawal_fee
            
        return {
            "success": True,
            "message": "Withdrawal request submitted. Balance locked. Awaiting admin approval.",
            "withdrawal_id": withdrawal_id,
            "amount": amount,
            "fees": fee_breakdown,
            "total_fee": total_fee,
            "net_amount": net_amount,
            "currency": currency,
            "is_fiat": is_fiat,
            "status": "pending"
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating withdrawal request: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }

async def admin_review_withdrawal_v2(db, wallet_service, approval: WithdrawalApproval) -> dict:
    """
    Admin approves or rejects withdrawal using wallet service
    On approval: releases locked balance (deducts from total)
    On rejection: unlocks balance back to available
    """
    try:
        # Get withdrawal request
        withdrawal = await db.withdrawal_requests.find_one({"withdrawal_id": approval.withdrawal_id})
        
        if not withdrawal:
            return {"success": False, "message": "Withdrawal request not found"}
        
        if withdrawal["status"] != "pending":
            return {"success": False, "message": f"Withdrawal already {withdrawal['status']}"}
        
        user_id = withdrawal["user_id"]
        currency = withdrawal["currency"]
        amount = withdrawal["amount"]
        fee_amount = withdrawal.get("fee_amount", withdrawal.get("fee", 0.0))
        network_fee_amount = withdrawal.get("network_fee_amount", 0.0)
        fiat_fee_amount = withdrawal.get("fiat_fee_amount", 0.0)
        total_fee = withdrawal.get("total_fee", fee_amount)
        net_amount = withdrawal.get("net_amount", amount - total_fee)
        withdrawal_id = approval.withdrawal_id
        is_fiat = withdrawal.get("is_fiat", False)
        
        if approval.action == "approve":
            # Release locked balance (removes from locked - withdrawal approved)
            try:
                balance_doc = await db.crypto_balances.find_one({"user_id": user_id, "currency": currency})
                if not balance_doc:
                    return {"success": False, "message": f"No {currency} balance found for user"}
                
                current_locked = balance_doc.get('locked_balance', 0)
                new_locked = max(0, current_locked - amount)  # Ensure locked doesn't go negative
                
                await db.crypto_balances.update_one(
                    {"user_id": user_id, "currency": currency},
                    {
                        "$set": {
                            "locked_balance": new_locked,
                            "last_updated": datetime.now(timezone.utc)
                        }
                    }
                )
                logger.info(f"✅ Released {amount} {currency} for withdrawal {withdrawal_id} (locked: {current_locked} -> {new_locked})")
            except Exception as release_error:
                logger.error(f"❌ Failed to release balance: {str(release_error)}")
                return {
                    "success": False,
                    "message": f"Failed to release balance: {str(release_error)}"
                }
            
            # Calculate referral commission split
            from centralized_fee_system import get_fee_manager
            fee_manager = get_fee_manager(db)
            
            user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
            referrer_id = user.get("referrer_id") if user else None
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
            
            # Credit admin wallet with admin portion of fee
            admin_user_id = "admin_wallet"
            try:
                await wallet_service.credit(
                    user_id=admin_user_id,
                    currency=currency,
                    amount=admin_fee,
                    transaction_type="withdrawal_fee",
                    reference_id=withdrawal_id,
                    metadata={"user_id": user_id, "withdrawal_id": withdrawal_id, "total_fee": fee_amount}
                )
                logger.info(f"✅ Collected {admin_fee} {currency} admin withdrawal fee")
            except Exception as fee_error:
                logger.warning(f"⚠️ Failed to collect admin fee: {str(fee_error)}")
            
            # Credit referrer commission if applicable
            if referrer_id and referrer_commission > 0:
                try:
                    await wallet_service.credit(
                        user_id=referrer_id,
                        currency=currency,
                        amount=referrer_commission,
                        transaction_type="referral_commission",
                        reference_id=withdrawal_id,
                        metadata={"referred_user_id": user_id, "transaction_type": "withdrawal"}
                    )
                    logger.info(f"✅ Paid {referrer_commission} {currency} commission to referrer {referrer_id}")
                    
                    # Log referral commission
                    await db.referral_commissions.insert_one({
                        "referrer_id": referrer_id,
                        "referred_user_id": user_id,
                        "transaction_type": "withdrawal",
                        "fee_amount": fee_amount,
                        "commission_amount": referrer_commission,
                        "commission_percent": commission_percent,
                        "currency": currency,
                        "withdrawal_id": withdrawal_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                except Exception as comm_error:
                    logger.warning(f"⚠️ Failed to pay referrer commission: {str(comm_error)}")
            
            # Update withdrawal status
            await db.withdrawal_requests.update_one(
                {"withdrawal_id": withdrawal_id},
                {
                    "$set": {
                        "status": "approved",
                        "approved_by": approval.admin_id,
                        "approved_at": datetime.now(timezone.utc).isoformat(),
                        "admin_fee": admin_fee,
                        "referrer_commission": referrer_commission,
                        "referrer_id": referrer_id
                    }
                }
            )
            
            # Log withdrawal fee to fee_transactions
            await db.fee_transactions.insert_one({
                "transaction_id": f"{withdrawal_id}_wf",
                "user_id": user_id,
                "transaction_type": "withdrawal",
                "fee_type": "withdrawal_fee",
                "amount": amount,
                "total_fee": fee_amount,
                "fee_percent": withdrawal["fee_percent"],
                "admin_fee": fee_amount * (admin_fee / total_fee) if total_fee > 0 else fee_amount,
                "referrer_commission": fee_amount * (referrer_commission / total_fee) if total_fee > 0 else 0,
                "referrer_id": referrer_id,
                "currency": currency,
                "reference_id": withdrawal_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Log network fee separately if present
            if network_fee_amount > 0:
                await db.fee_transactions.insert_one({
                    "transaction_id": f"{withdrawal_id}_nf",
                    "user_id": user_id,
                    "transaction_type": "withdrawal",
                    "fee_type": "network_withdrawal_fee",
                    "amount": amount,
                    "total_fee": network_fee_amount,
                    "fee_percent": withdrawal.get("network_fee_percent", 0),
                    "admin_fee": network_fee_amount * (admin_fee / total_fee) if total_fee > 0 else network_fee_amount,
                    "referrer_commission": network_fee_amount * (referrer_commission / total_fee) if total_fee > 0 else 0,
                    "referrer_id": referrer_id,
                    "currency": currency,
                    "reference_id": withdrawal_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            # Log fiat withdrawal fee separately if present
            if fiat_fee_amount > 0:
                await db.fee_transactions.insert_one({
                    "transaction_id": f"{withdrawal_id}_ff",
                    "user_id": user_id,
                    "transaction_type": "fiat_withdrawal",
                    "fee_type": "fiat_withdrawal_fee",
                    "amount": amount,
                    "total_fee": fiat_fee_amount,
                    "fee_percent": withdrawal.get("fiat_fee_percent", 0),
                    "admin_fee": fiat_fee_amount * (admin_fee / total_fee) if total_fee > 0 else fiat_fee_amount,
                    "referrer_commission": fiat_fee_amount * (referrer_commission / total_fee) if total_fee > 0 else 0,
                    "referrer_id": referrer_id,
                    "currency": currency,
                    "reference_id": withdrawal_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"✅ Withdrawal {withdrawal_id} approved by {approval.admin_id}, Fee: {fee_amount} (Admin: {admin_fee}, Referrer: {referrer_commission})")
            
            return {
                "success": True,
                "message": f"Withdrawal approved. Send {net_amount} {currency} to {withdrawal['wallet_address']}",
                "withdrawal_id": withdrawal_id,
                "user_id": user_id,
                "amount": amount,
                "net_amount": net_amount,
                "fee_collected": fee_amount,
                "wallet_address": withdrawal["wallet_address"],
                "network": withdrawal.get("network"),
                "currency": currency
            }
        
        elif approval.action == "reject":
            # Unlock balance back to available (move from locked back to balance)
            try:
                balance_doc = await db.crypto_balances.find_one({"user_id": user_id, "currency": currency})
                if not balance_doc:
                    return {"success": False, "message": f"No {currency} balance found for user"}
                
                current_balance = balance_doc.get('balance', 0)
                current_locked = balance_doc.get('locked_balance', 0)
                new_balance = current_balance + amount
                new_locked = max(0, current_locked - amount)  # Ensure locked doesn't go negative
                
                await db.crypto_balances.update_one(
                    {"user_id": user_id, "currency": currency},
                    {
                        "$set": {
                            "balance": new_balance,
                            "locked_balance": new_locked,
                            "last_updated": datetime.now(timezone.utc)
                        }
                    }
                )
                logger.info(f"✅ Unlocked {amount} {currency} for rejected withdrawal {withdrawal_id} (balance: {current_balance} -> {new_balance}, locked: {current_locked} -> {new_locked})")
            except Exception as unlock_error:
                logger.error(f"❌ Failed to unlock balance: {str(unlock_error)}")
                return {
                    "success": False,
                    "message": f"Failed to unlock balance: {str(unlock_error)}"
                }
            
            # Update withdrawal status
            await db.withdrawal_requests.update_one(
                {"withdrawal_id": withdrawal_id},
                {
                    "$set": {
                        "status": "rejected",
                        "rejected_by": approval.admin_id,
                        "rejected_at": datetime.now(timezone.utc).isoformat(),
                        "rejection_reason": approval.rejection_reason or "Rejected by admin"
                    }
                }
            )
            
            logger.info(f"✅ Withdrawal {withdrawal_id} rejected by {approval.admin_id}")
            
            return {
                "success": True,
                "message": "Withdrawal rejected. Balance unlocked and returned to user.",
                "withdrawal_id": withdrawal_id,
                "user_id": user_id
            }
        
        else:
            return {"success": False, "message": "Invalid action. Use 'approve' or 'reject'"}
    
    except Exception as e:
        logger.error(f"❌ Error reviewing withdrawal: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }

async def mark_withdrawal_completed_v2(db, withdrawal_id: str, admin_id: str) -> dict:
    """
    Mark withdrawal as completed after admin has sent the crypto
    🔒 DEDUCTS FROM ADMIN LIQUIDITY (NO MINTING)
    """
    # Get withdrawal details
    withdrawal = await db.withdrawal_requests.find_one({"withdrawal_id": withdrawal_id, "status": "approved"})
    
    if not withdrawal:
        return {
            "success": False,
            "message": "Withdrawal not found or not in approved status"
        }
    
    currency = withdrawal.get("currency")
    net_amount = withdrawal.get("net_amount")
    
    # 🔒 DEDUCT FROM ADMIN LIQUIDITY (CRITICAL - NO MINTING)
    admin_wallet = await db.admin_liquidity_wallets.find_one({"currency": currency})
    if not admin_wallet or admin_wallet.get("available", 0) < net_amount:
        logger.error(f"❌ CRITICAL: Admin liquidity insufficient for withdrawal {withdrawal_id}")
        return {
            "success": False,
            "message": "CRITICAL: Admin liquidity check failed. Contact administrator.",
            "reason": "admin_liquidity_mismatch"
        }
    
    # Deduct from admin liquidity
    await db.admin_liquidity_wallets.update_one(
        {"currency": currency},
        {
            "$inc": {"available": -net_amount, "balance": -net_amount},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    logger.info(f"💰 Deducted {net_amount} {currency} from admin liquidity for withdrawal {withdrawal_id}")
    
    result = await db.withdrawal_requests.update_one(
        {"withdrawal_id": withdrawal_id, "status": "approved"},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "admin_liquidity_deducted": True,
                "admin_liquidity_deducted_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"✅ Withdrawal {withdrawal_id} marked as completed")
        return {
            "success": True,
            "message": "Withdrawal marked as completed and admin liquidity deducted"
        }
    else:
        return {
            "success": False,
            "message": "Failed to update withdrawal status"
        }
