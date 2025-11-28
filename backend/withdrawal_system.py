# Withdrawal System with Admin Approval
# Handles crypto withdrawals with manual admin approval for security

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class WithdrawalRequest(BaseModel):
    """User withdrawal request"""
    withdrawal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    currency: str
    amount: float  # Amount in crypto
    amount_crypto: Optional[float] = None  # Alias for amount
    amount_fiat_gbp: Optional[float] = None  # Amount in GBP at time of request
    rate_used: Optional[float] = None  # Exchange rate used (crypto/GBP)
    wallet_address: str
    destination_address: Optional[str] = None  # Alias for wallet_address
    network: Optional[str] = None  # For USDT: ERC20, TRC20, BEP20
    fee_percent: float = 1.5  # Default 1.5% withdrawal fee
    fee_amount: float
    net_amount: float  # Amount user receives after fee
    status: str = "pending"  # pending, approved, rejected, completed
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
    action: str  # "approve" or "reject"
    rejection_reason: Optional[str] = None

async def create_withdrawal_request(db, user_id: str, currency: str, amount: float, 
                                   wallet_address: str, network: str = None,
                                   amount_fiat_gbp: float = None, rate_used: float = None) -> dict:
    """
    Create a withdrawal request with GBP amount tracking.
    Does NOT deduct balance immediately - waits for admin approval.
    """
    from wallet_validator import validate_wallet_address
    from escrow_balance_system import get_trader_balance
    
    # Validate wallet address
    validation = validate_wallet_address(wallet_address, currency, network)
    if not validation["valid"]:
        return {
            "success": False,
            "message": f"Invalid wallet address: {validation['message']}"
        }
    
    # Check user has sufficient balance
    balance = await get_trader_balance(db, user_id, currency)
    if not balance:
        return {
            "success": False,
            "message": f"No {currency} balance found"
        }
    
    available = balance.get("available_balance", 0)
    if amount > available:
        return {
            "success": False,
            "message": f"Insufficient balance. Available: {available} {currency}"
        }
    
    # Calculate fees
    fee_percent = 1.5  # 1.5% withdrawal fee
    fee_amount = amount * (fee_percent / 100)
    net_amount = amount - fee_amount
    
    # Create withdrawal request with GBP tracking
    withdrawal = WithdrawalRequest(
        user_id=user_id,
        currency=currency,
        amount=amount,
        amount_crypto=amount,
        amount_fiat_gbp=amount_fiat_gbp,
        rate_used=rate_used,
        wallet_address=wallet_address,
        destination_address=wallet_address,
        network=validation.get("network") or network,
        fee_percent=fee_percent,
        fee_amount=fee_amount,
        net_amount=net_amount,
        status="pending"
    )
    
    # Save to database
    await db.withdrawal_requests.insert_one(withdrawal.model_dump())
    
    return {
        "success": True,
        "message": "Withdrawal request submitted. Awaiting admin approval.",
        "withdrawal_id": withdrawal.withdrawal_id,
        "amount": amount,
        "fee": fee_amount,
        "net_amount": net_amount,
        "currency": currency,
        "status": "pending"
    }

async def admin_review_withdrawal(db, approval: WithdrawalApproval) -> dict:
    """
    Admin approves or rejects withdrawal request.
    On approval: deducts balance, collects fee, marks as approved.
    """
    from escrow_balance_system import get_trader_balance
    
    # Get withdrawal request
    withdrawal = await db.withdrawal_requests.find_one({"withdrawal_id": approval.withdrawal_id})
    
    if not withdrawal:
        return {"success": False, "message": "Withdrawal request not found"}
    
    if withdrawal["status"] != "pending":
        return {"success": False, "message": f"Withdrawal already {withdrawal['status']}"}
    
    if approval.action == "approve":
        # Check balance again (user might have traded since request)
        balance = await get_trader_balance(db, withdrawal["user_id"], withdrawal["currency"])
        available = balance.get("available_balance", 0)
        
        if withdrawal["amount"] > available:
            return {
                "success": False,
                "message": f"Insufficient balance. User only has {available} {withdrawal['currency']} available"
            }
        
        # Deduct balance (total = amount user requested)
        new_total = balance.get("total_balance", 0) - withdrawal["amount"]
        new_available = balance.get("available_balance", 0) - withdrawal["amount"]
        
        await db.trader_balances.update_one(
            {"user_id": withdrawal["user_id"], "currency": withdrawal["currency"]},
            {
                "$set": {
                    "total_balance": max(0, new_total),
                    "available_balance": max(0, new_available),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Add withdrawal fee to admin internal balance
        await db.admin_internal_balances.update_one(
            {"currency": withdrawal["currency"]},
            {
                "$inc": {"total_collected": withdrawal["fee_amount"]},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Update withdrawal status
        await db.withdrawal_requests.update_one(
            {"withdrawal_id": approval.withdrawal_id},
            {
                "$set": {
                    "status": "approved",
                    "approved_by": approval.admin_id,
                    "approved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Withdrawal approved. Send {withdrawal['net_amount']} {withdrawal['currency']} to {withdrawal['wallet_address']}",
            "withdrawal_id": approval.withdrawal_id,
            "user_id": withdrawal["user_id"],
            "amount": withdrawal["amount"],
            "net_amount": withdrawal["net_amount"],
            "fee_collected": withdrawal["fee_amount"],
            "wallet_address": withdrawal["wallet_address"],
            "network": withdrawal.get("network"),
            "currency": withdrawal["currency"]
        }
    
    elif approval.action == "reject":
        # Just update status - no balance changes
        await db.withdrawal_requests.update_one(
            {"withdrawal_id": approval.withdrawal_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejected_by": approval.admin_id,
                    "rejected_at": datetime.now(timezone.utc).isoformat(),
                    "rejection_reason": approval.rejection_reason or "Rejected by admin"
                }
            }
        )
        
        return {
            "success": True,
            "message": "Withdrawal rejected",
            "withdrawal_id": approval.withdrawal_id,
            "user_id": withdrawal["user_id"]
        }
    
    else:
        return {"success": False, "message": "Invalid action. Use 'approve' or 'reject'"}

async def get_pending_withdrawals(db) -> list:
    """Get all pending withdrawal requests for admin"""
    pending = await db.withdrawal_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Enrich with user info
    for withdrawal in pending:
        user = await db.users.find_one(
            {"user_id": withdrawal["user_id"]},
            {"email": 1, "full_name": 1}
        )
        if user:
            withdrawal["user_email"] = user.get("email")
            withdrawal["user_name"] = user.get("full_name")
    
    return pending

async def get_user_withdrawals(db, user_id: str) -> list:
    """Get withdrawal history for a user"""
    withdrawals = await db.withdrawal_requests.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return withdrawals

async def mark_withdrawal_completed(db, withdrawal_id: str, admin_id: str) -> dict:
    """
    Mark withdrawal as completed after admin has sent the crypto.
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
        return {
            "success": True,
            "message": "Withdrawal marked as completed"
        }
    else:
        return {
            "success": False,
            "message": "Withdrawal not found or not in approved status"
        }
