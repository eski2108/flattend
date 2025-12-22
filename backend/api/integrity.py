# FILE: /app/backend/api/integrity.py
# SERVICE LOCK: FROZEN. Integrity validation endpoint.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()

# Will be set by main app
db = None

def set_database(database):
    """Set the database instance for this module."""
    global db
    db = database


@router.get("/integrity/check/{user_id}")
async def integrity_check(
    user_id: str,
    currency: Optional[str] = Query(default="BTC", description="Currency to check"),
    tolerance: float = Query(default=0.00000001, description="Tolerance for balance comparison")
):
    """
    HARD VALIDATION ENDPOINT - FROZEN IMPLEMENTATION.
    
    Returns 200 ONLY if all 4 balance collections match within tolerance.
    Returns 500 with EXPLICIT MISMATCH DETAILS if not.
    
    This endpoint is critical for maintaining data integrity.
    Any deployment that fails this check MUST BE REJECTED.
    """
    global db
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    collections = [
        ("wallets", "user_id", "available_balance"),
        ("crypto_balances", "user_id", "available_balance"),
        ("trader_balances", "trader_id", "available_balance"),
        ("internal_balances", "user_id", "available_balance")
    ]
    
    balances = {}
    raw_docs = {}
    
    for collection_name, id_field, balance_field in collections:
        doc = await db[collection_name].find_one(
            {id_field: user_id, "currency": currency},
            {"_id": 0}
        )
        
        raw_docs[collection_name] = doc
        
        if doc:
            # Handle different field names
            available = (
                doc.get("available_balance") or
                doc.get("balance") or
                doc.get("total_balance") or
                0
            )
            balances[collection_name] = float(available)
        else:
            balances[collection_name] = 0.0
    
    # Check all balances match within tolerance
    baseline = balances.get("wallets", 0.0)
    discrepancies = []
    
    for coll_name, balance in balances.items():
        if abs(balance - baseline) > tolerance:
            discrepancies.append({
                "collection": coll_name,
                "balance": balance,
                "expected": baseline,
                "difference": balance - baseline
            })
    
    if discrepancies:
        # LOG CRITICAL ERROR
        await db.audit_trail.insert_one({
            "event_id": os.urandom(16).hex(),
            "event_type": "INTEGRITY_CHECK_FAILURE",
            "user_id": user_id,
            "currency": currency,
            "discrepancies": discrepancies,
            "balances": balances,
            "timestamp": datetime.now(timezone.utc),
            "severity": "CRITICAL"
        })
        
        logger.error(f"[INTEGRITY] FAILURE for {user_id}/{currency}: {discrepancies}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "status": "unhealthy",
                "message": "Balance synchronization failure detected",
                "user_id": user_id,
                "currency": currency,
                "discrepancies": discrepancies,
                "balances": balances,
                "action_required": "MANUAL_RECONCILIATION_NEEDED",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Success - log audit
    await db.audit_trail.insert_one({
        "event_id": os.urandom(16).hex(),
        "event_type": "INTEGRITY_CHECK_PASSED",
        "user_id": user_id,
        "currency": currency,
        "balance": baseline,
        "timestamp": datetime.now(timezone.utc),
        "severity": "INFO"
    })
    
    return {
        "status": "healthy",
        "message": "All balance collections synchronized",
        "user_id": user_id,
        "currency": currency,
        "balance": baseline,
        "collections_checked": list(balances.keys()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checksum": "8f3a7c2e1d5b9a4f"
    }


@router.get("/integrity/check-all/{user_id}")
async def integrity_check_all_currencies(
    user_id: str,
    tolerance: float = Query(default=0.00000001, description="Tolerance for balance comparison")
):
    """
    Check integrity across ALL currencies for a user.
    """
    global db
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Get all currencies from wallets collection
    currencies = await db.wallets.distinct("currency", {"user_id": user_id})
    
    if not currencies:
        return {
            "status": "healthy",
            "message": "No balances found for user",
            "user_id": user_id,
            "currencies_checked": 0
        }
    
    results = []
    failures = []
    
    for currency in currencies:
        try:
            result = await integrity_check(user_id, currency, tolerance)
            results.append({
                "currency": currency,
                "status": "healthy",
                "balance": result["balance"]
            })
        except HTTPException as e:
            failures.append({
                "currency": currency,
                "status": "unhealthy",
                "detail": e.detail
            })
    
    if failures:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "unhealthy",
                "message": f"{len(failures)} currency(ies) have synchronization issues",
                "user_id": user_id,
                "failures": failures,
                "successes": results,
                "action_required": "MANUAL_RECONCILIATION_NEEDED"
            }
        )
    
    return {
        "status": "healthy",
        "message": "All currencies synchronized",
        "user_id": user_id,
        "currencies_checked": len(currencies),
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/integrity/admin-wallet")
async def check_admin_wallet_integrity(
    tolerance: float = Query(default=0.00000001)
):
    """
    Check integrity of the admin_wallet across all currencies.
    Critical for revenue tracking.
    """
    return await integrity_check_all_currencies("admin_wallet", tolerance)


@router.post("/integrity/reconcile/{user_id}")
async def reconcile_balances(
    user_id: str,
    currency: str,
    admin_key: str = Query(..., description="Admin authorization key")
):
    """
    ADMIN ONLY: Force reconciliation of balances.
    Takes the wallets collection as source of truth and syncs others.
    
    This is a DANGEROUS operation. Use only when integrity check fails.
    """
    global db
    
    # Validate admin key
    expected_key = os.getenv('ADMIN_RECONCILE_KEY', 'disabled')
    if expected_key == 'disabled' or admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Get source of truth from wallets
    wallet = await db.wallets.find_one(
        {"user_id": user_id, "currency": currency},
        {"_id": 0}
    )
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    available = wallet.get("available_balance", 0)
    locked = wallet.get("locked_balance", 0)
    total = wallet.get("total_balance", available + locked)
    timestamp = datetime.now(timezone.utc)
    
    # Log before state
    before_state = {
        "wallets": wallet,
        "crypto_balances": await db.crypto_balances.find_one({"user_id": user_id, "currency": currency}, {"_id": 0}),
        "trader_balances": await db.trader_balances.find_one({"trader_id": user_id, "currency": currency}, {"_id": 0}),
        "internal_balances": await db.internal_balances.find_one({"user_id": user_id, "currency": currency}, {"_id": 0})
    }
    
    # Sync crypto_balances
    await db.crypto_balances.update_one(
        {"user_id": user_id, "currency": currency},
        {
            "$set": {
                "balance": total,
                "available_balance": available,
                "locked_balance": locked,
                "last_updated": timestamp
            }
        },
        upsert=True
    )
    
    # Sync trader_balances
    await db.trader_balances.update_one(
        {"trader_id": user_id, "currency": currency},
        {
            "$set": {
                "total_balance": total,
                "available_balance": available,
                "locked_balance": locked,
                "updated_at": timestamp
            }
        },
        upsert=True
    )
    
    # Sync internal_balances
    await db.internal_balances.update_one(
        {"user_id": user_id, "currency": currency},
        {
            "$set": {
                "balance": total,
                "available_balance": available,
                "locked_balance": locked,
                "updated_at": timestamp
            }
        },
        upsert=True
    )
    
    # Audit trail
    await db.audit_trail.insert_one({
        "event_id": os.urandom(16).hex(),
        "event_type": "MANUAL_RECONCILIATION",
        "user_id": user_id,
        "currency": currency,
        "before_state": before_state,
        "after_state": {
            "available": available,
            "locked": locked,
            "total": total
        },
        "timestamp": timestamp,
        "severity": "WARNING"
    })
    
    logger.warning(f"[RECONCILE] Manual reconciliation performed for {user_id}/{currency}")
    
    return {
        "status": "reconciled",
        "user_id": user_id,
        "currency": currency,
        "balance": {
            "available": available,
            "locked": locked,
            "total": total
        },
        "timestamp": timestamp.isoformat()
    }
