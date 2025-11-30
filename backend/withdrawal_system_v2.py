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
    fee_percent: float = 1.5
    fee_amount: float
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
        
        # Check user balance via wallet service
        balance_info = await wallet_service.get_balance(user_id, currency)
        available = balance_info['available_balance']
        
        if amount > available:
            return {
                "success": False,
                "message": f"Insufficient balance. Available: {available} {currency}, Requested: {amount}"
            }
        
        # Get fee from centralized system
        fee_manager = get_fee_manager(db)
        fee_percent = await fee_manager.get_fee("withdrawal_fee_percent")
        fee_amount = amount * (fee_percent / 100)
        net_amount = amount - fee_amount
        
        # Create withdrawal request
        withdrawal = WithdrawalRequest(
            user_id=user_id,
            currency=currency,
            amount=amount,
            wallet_address=wallet_address,
            network=validation.get("network") or network,
            fee_percent=fee_percent,
            fee_amount=fee_amount,
            net_amount=net_amount,
            status="pending"
        )
        
        withdrawal_id = withdrawal.withdrawal_id
        
        # IMPORTANT: Lock balance immediately to prevent user from trading/withdrawing again
        try:
            await wallet_service.lock_balance(
                user_id=user_id,
                currency=currency,
                amount=amount,
                lock_type="withdrawal_pending",
                reference_id=withdrawal_id
            )
            logger.info(f"✅ Locked {amount} {currency} for withdrawal {withdrawal_id}")
        except Exception as lock_error:
            logger.error(f"❌ Failed to lock balance: {str(lock_error)}")
            return {
                "success": False,
                "message": f"Failed to lock balance: {str(lock_error)}"
            }
        
        # Save withdrawal request
        await db.withdrawal_requests.insert_one(withdrawal.model_dump())
        
        logger.info(f"✅ Withdrawal request created: {withdrawal_id} | {amount} {currency}")
        
        return {
            "success": True,
            "message": "Withdrawal request submitted. Balance locked. Awaiting admin approval.",
            "withdrawal_id": withdrawal_id,
            "amount": amount,
            "fee": fee_amount,
            "net_amount": net_amount,
            "currency": currency,
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
        fee_amount = withdrawal["fee_amount"]
        net_amount = withdrawal["net_amount"]
        withdrawal_id = approval.withdrawal_id
        
        if approval.action == "approve":
            # Release locked balance (removes from total and locked)
            try:
                await wallet_service.release_locked_balance(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    release_type="withdrawal_approved",
                    reference_id=withdrawal_id
                )
                logger.info(f"✅ Released {amount} {currency} for withdrawal {withdrawal_id}")
            except Exception as release_error:
                logger.error(f"❌ Failed to release balance: {str(release_error)}")
                return {
                    "success": False,
                    "message": f"Failed to release balance: {str(release_error)}"
                }
            
            # Credit admin wallet with fee
            admin_user_id = "admin_fee_wallet"
            try:
                await wallet_service.credit(
                    user_id=admin_user_id,
                    currency=currency,
                    amount=fee_amount,
                    transaction_type="withdrawal_fee",
                    reference_id=withdrawal_id,
                    metadata={"user_id": user_id, "withdrawal_id": withdrawal_id}
                )
                logger.info(f"✅ Collected {fee_amount} {currency} withdrawal fee")
            except Exception as fee_error:
                logger.warning(f"⚠️ Failed to collect fee: {str(fee_error)}")
            
            # Update withdrawal status
            await db.withdrawal_requests.update_one(
                {"withdrawal_id": withdrawal_id},
                {
                    "$set": {
                        "status": "approved",
                        "approved_by": approval.admin_id,
                        "approved_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logger.info(f"✅ Withdrawal {withdrawal_id} approved by {approval.admin_id}")
            
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
            # Unlock balance back to available
            try:
                await wallet_service.unlock_balance(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    unlock_type="withdrawal_rejected",
                    reference_id=withdrawal_id
                )
                logger.info(f"✅ Unlocked {amount} {currency} for rejected withdrawal {withdrawal_id}")
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
    """
    result = await db.withdrawal_requests.update_one(
        {"withdrawal_id": withdrawal_id, "status": "approved"},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"✅ Withdrawal {withdrawal_id} marked as completed")
        return {
            "success": True,
            "message": "Withdrawal marked as completed"
        }
    else:
        return {
            "success": False,
            "message": "Withdrawal not found or not in approved status"
        }
