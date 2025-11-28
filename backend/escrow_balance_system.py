# P2P Escrow Balance System
# Manages trader balances with locking mechanism for active trades

from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Optional
from datetime import datetime, timezone
import uuid

class TraderBalance(BaseModel):
    """
    Balance for a specific trader and currency.
    
    Formula: available_balance = total_balance - locked_balance
    
    - total_balance: Total amount trader has in the system
    - locked_balance: Amount locked in active trades (escrow)
    - available_balance: Amount free to create new trades
    """
    trader_id: str
    currency: str  # BTC, ETH, USDT, etc.
    total_balance: float = 0.0
    locked_balance: float = 0.0
    available_balance: float = 0.0
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    model_config = ConfigDict(extra='forbid')


class BalanceLockRequest(BaseModel):
    """Request to lock crypto amount for a trade"""
    trader_id: str
    currency: str
    amount: float
    trade_id: str
    reason: str = "trade_escrow"
    
    model_config = ConfigDict(extra='forbid')


class BalanceUnlockRequest(BaseModel):
    """Request to unlock crypto amount from cancelled trade"""
    trader_id: str
    currency: str
    amount: float
    trade_id: str
    reason: str = "trade_cancelled"
    
    model_config = ConfigDict(extra='forbid')


class BalanceReleaseRequest(BaseModel):
    """Request to release crypto from completed trade"""
    trader_id: str
    buyer_id: str
    currency: str
    gross_amount: float
    fee_percent: float
    trade_id: str
    
    model_config = ConfigDict(extra='forbid')


async def get_trader_balance(db, trader_id: str, currency: str) -> Optional[Dict]:
    """Get trader's balance for a specific currency"""
    balance = await db.trader_balances.find_one(
        {"trader_id": trader_id, "currency": currency},
        {"_id": 0}
    )
    return balance


async def initialize_trader_balance(db, trader_id: str, currency: str, initial_amount: float = 0.0):
    """Initialize balance for a trader in a specific currency"""
    existing = await get_trader_balance(db, trader_id, currency)
    
    if existing:
        return existing
    
    balance = TraderBalance(
        trader_id=trader_id,
        currency=currency,
        total_balance=initial_amount,
        locked_balance=0.0,
        available_balance=initial_amount
    )
    
    await db.trader_balances.insert_one(balance.model_dump())
    return balance.model_dump()


async def check_available_balance(db, trader_id: str, currency: str, required_amount: float) -> bool:
    """Check if trader has enough available balance for a trade"""
    balance = await get_trader_balance(db, trader_id, currency)
    
    if not balance:
        return False
    
    available = balance.get('available_balance', 0.0)
    return available >= required_amount


async def lock_balance_for_trade(db, request: BalanceLockRequest) -> Dict:
    """
    Lock crypto amount from trader's available balance into escrow.
    Called when a trade is created.
    
    Returns: {"success": bool, "message": str, "balance": dict}
    """
    # Get current balance
    balance = await get_trader_balance(db, request.trader_id, request.currency)
    
    if not balance:
        return {
            "success": False,
            "message": f"No balance found for trader {request.trader_id} in {request.currency}",
            "balance": None
        }
    
    # Check if enough available balance
    available = balance.get('available_balance', 0.0)
    if available < request.amount:
        return {
            "success": False,
            "message": f"Insufficient available balance. Available: {available}, Required: {request.amount}",
            "balance": balance
        }
    
    # Lock the amount
    new_locked = balance['locked_balance'] + request.amount
    new_available = balance['total_balance'] - new_locked
    
    # Update database
    result = await db.trader_balances.update_one(
        {"trader_id": request.trader_id, "currency": request.currency},
        {
            "$set": {
                "locked_balance": new_locked,
                "available_balance": new_available,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        return {
            "success": False,
            "message": "Failed to lock balance",
            "balance": balance
        }
    
    # Log the lock
    await db.balance_locks.insert_one({
        "lock_id": str(uuid.uuid4()),
        "trader_id": request.trader_id,
        "currency": request.currency,
        "amount": request.amount,
        "trade_id": request.trade_id,
        "reason": request.reason,
        "status": "locked",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get updated balance
    updated_balance = await get_trader_balance(db, request.trader_id, request.currency)
    
    return {
        "success": True,
        "message": f"Locked {request.amount} {request.currency} for trade {request.trade_id}",
        "balance": updated_balance
    }


async def unlock_balance_from_cancelled_trade(db, request: BalanceUnlockRequest) -> Dict:
    """
    Unlock crypto amount back to trader's available balance.
    Called when a trade is cancelled.
    
    Returns: {"success": bool, "message": str, "balance": dict}
    """
    # Get current balance
    balance = await get_trader_balance(db, request.trader_id, request.currency)
    
    if not balance:
        return {
            "success": False,
            "message": f"No balance found for trader {request.trader_id}",
            "balance": None
        }
    
    # Check if locked balance is sufficient
    locked = balance.get('locked_balance', 0.0)
    if locked < request.amount:
        return {
            "success": False,
            "message": f"Insufficient locked balance. Locked: {locked}, Required: {request.amount}",
            "balance": balance
        }
    
    # Unlock the amount
    new_locked = balance['locked_balance'] - request.amount
    new_available = balance['total_balance'] - new_locked
    
    # Update database
    result = await db.trader_balances.update_one(
        {"trader_id": request.trader_id, "currency": request.currency},
        {
            "$set": {
                "locked_balance": new_locked,
                "available_balance": new_available,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        return {
            "success": False,
            "message": "Failed to unlock balance",
            "balance": balance
        }
    
    # Update lock record
    await db.balance_locks.update_one(
        {"trade_id": request.trade_id, "trader_id": request.trader_id},
        {
            "$set": {
                "status": "unlocked",
                "reason": request.reason,
                "unlocked_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Get updated balance
    updated_balance = await get_trader_balance(db, request.trader_id, request.currency)
    
    return {
        "success": True,
        "message": f"Unlocked {request.amount} {request.currency} from trade {request.trade_id}",
        "balance": updated_balance
    }


async def release_balance_from_completed_trade(db, request: BalanceReleaseRequest, admin_wallet_id: str) -> Dict:
    """
    Release crypto from completed trade with fee deduction.
    
    Flow:
    1. Calculate fee amount from gross_amount
    2. Calculate net amount for buyer
    3. Reduce trader's locked_balance
    4. Reduce trader's total_balance by gross_amount (crypto left their possession)
    5. Credit buyer's balance with net amount
    6. Add fee to admin internal balance
    
    Returns: {"success": bool, "message": str, "details": dict}
    """
    # Get trader balance
    trader_balance = await get_trader_balance(db, request.trader_id, request.currency)
    
    if not trader_balance:
        return {
            "success": False,
            "message": f"No balance found for trader {request.trader_id}",
            "details": None
        }
    
    # Calculate amounts
    fee_amount = request.gross_amount * (request.fee_percent / 100)
    net_amount = request.gross_amount - fee_amount
    
    # Check if locked balance is sufficient
    locked = trader_balance.get('locked_balance', 0.0)
    if locked < request.gross_amount:
        return {
            "success": False,
            "message": f"Insufficient locked balance. Locked: {locked}, Required: {request.gross_amount}",
            "details": None
        }
    
    # 1. Update trader balance (reduce locked and total)
    new_trader_locked = trader_balance['locked_balance'] - request.gross_amount
    new_trader_total = trader_balance['total_balance'] - request.gross_amount
    new_trader_available = new_trader_total - new_trader_locked
    
    await db.trader_balances.update_one(
        {"trader_id": request.trader_id, "currency": request.currency},
        {
            "$set": {
                "total_balance": new_trader_total,
                "locked_balance": new_trader_locked,
                "available_balance": new_trader_available,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # 2. Credit buyer with net amount
    buyer_balance = await get_trader_balance(db, request.buyer_id, request.currency)
    
    if not buyer_balance:
        # Initialize buyer balance if doesn't exist
        await initialize_trader_balance(db, request.buyer_id, request.currency, net_amount)
    else:
        new_buyer_total = buyer_balance['total_balance'] + net_amount
        new_buyer_available = new_buyer_total - buyer_balance['locked_balance']
        
        await db.trader_balances.update_one(
            {"trader_id": request.buyer_id, "currency": request.currency},
            {
                "$set": {
                    "total_balance": new_buyer_total,
                    "available_balance": new_buyer_available,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    # 3. Add fee to admin internal balance
    await db.admin_internal_balances.update_one(
        {"currency": request.currency},
        {
            "$inc": {"amount": fee_amount},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # 4. Record transaction in transactions table (for admin dashboard)
    await db.transactions.insert_one({
        "transaction_id": str(uuid.uuid4()),
        "trade_id": request.trade_id,
        "from_user_id": request.trader_id,
        "to_user_id": request.buyer_id,
        "currency": request.currency,
        "gross_amount": request.gross_amount,
        "fee_amount": fee_amount,
        "net_amount": net_amount,
        "fee_percent": request.fee_percent,
        "transaction_type": "trade_completion",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # 5. Update lock record
    await db.balance_locks.update_one(
        {"trade_id": request.trade_id, "trader_id": request.trader_id},
        {
            "$set": {
                "status": "released",
                "fee_amount": fee_amount,
                "net_amount": net_amount,
                "released_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Released {request.gross_amount} {request.currency} from trade {request.trade_id}",
        "details": {
            "gross_amount": float(request.gross_amount),
            "fee_amount": round(float(fee_amount), 8),
            "fee_percent": float(request.fee_percent),
            "net_amount": round(float(net_amount), 8),
            "buyer_credited": round(float(net_amount), 8),
            "admin_fee_collected": round(float(fee_amount), 8),
            "trader_new_balance": {
                "total": round(float(new_trader_total), 8),
                "locked": round(float(new_trader_locked), 8),
                "available": round(float(new_trader_available), 8)
            }
        }
    }


async def add_funds_to_trader(db, trader_id: str, currency: str, amount: float, reason: str = "deposit") -> Dict:
    """
    Add funds to trader's balance (for testing or deposits).
    Increases both total_balance and available_balance.
    """
    balance = await get_trader_balance(db, trader_id, currency)
    
    if not balance:
        # Initialize if doesn't exist
        await initialize_trader_balance(db, trader_id, currency, amount)
        return {
            "success": True,
            "message": f"Initialized balance with {amount} {currency}",
            "balance": await get_trader_balance(db, trader_id, currency)
        }
    
    # Add to total and available
    new_total = balance['total_balance'] + amount
    new_available = balance['available_balance'] + amount
    
    await db.trader_balances.update_one(
        {"trader_id": trader_id, "currency": currency},
        {
            "$set": {
                "total_balance": new_total,
                "available_balance": new_available,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log the deposit
    await db.balance_transactions.insert_one({
        "transaction_id": str(uuid.uuid4()),
        "trader_id": trader_id,
        "currency": currency,
        "amount": amount,
        "type": "credit",
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Added {amount} {currency} to trader balance",
        "balance": await get_trader_balance(db, trader_id, currency)
    }
