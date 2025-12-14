"""
Platform Balance & Liquidity Wallet System
Central treasury management for referrals, bonuses, staking, liquidity
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
import logging

logger = logging.getLogger(__name__)

# Platform wallet configuration
PLATFORM_WALLET_ID = "PLATFORM_TREASURY_WALLET"
LOW_BALANCE_WARNING_THRESHOLD = 500  # £500 GBP
CRITICAL_BALANCE_THRESHOLD = 250  # £250 GBP

# Supported currencies for platform wallet
PLATFORM_CURRENCIES = ["GBP", "BTC", "ETH", "USDT", "BNB", "SOL"]


async def get_platform_balance(db) -> Dict[str, Any]:
    """
    Get current platform wallet balances across all currencies
    """
    balances = {}
    total_gbp_equivalent = 0
    
    for currency in PLATFORM_CURRENCIES:
        balance_doc = await db.crypto_balances.find_one({
            "user_id": PLATFORM_WALLET_ID,
            "currency": currency
        })
        
        if balance_doc:
            amount = balance_doc.get("balance", 0)
            balances[currency] = amount
            
            # Convert to GBP for total (simplified - use real rates in production)
            if currency == "GBP":
                total_gbp_equivalent += amount
            elif currency == "USDT":
                total_gbp_equivalent += amount * 0.79  # Simplified conversion
            elif currency == "BTC":
                total_gbp_equivalent += amount * 35000  # Simplified
            elif currency == "ETH":
                total_gbp_equivalent += amount * 2000  # Simplified
            elif currency == "BNB":
                total_gbp_equivalent += amount * 250  # Simplified
            elif currency == "SOL":
                total_gbp_equivalent += amount * 100  # Simplified
        else:
            balances[currency] = 0
    
    return {
        "balances": balances,
        "total_gbp_equivalent": total_gbp_equivalent
    }


async def get_platform_stats(db) -> Dict[str, Any]:
    """
    Get platform wallet statistics
    """
    # Get total referral payouts
    referral_payouts = await db.referral_commissions.aggregate([
        {"$match": {"status": "paid"}},
        {"$group": {
            "_id": "$currency",
            "total": {"$sum": "$commission_amount"}
        }}
    ]).to_list(100)
    
    # Get total bonus payouts
    bonus_payouts = await db.referral_bonuses.aggregate([
        {"$group": {
            "_id": "$currency",
            "total": {"$sum": "$bonus_amount"}
        }}
    ]).to_list(100)
    
    # Get liquidity stats (from existing liquidity system)
    liquidity_stats = await db.trading_liquidity.find({}).to_list(100)
    
    total_liquidity = {}
    for liq in liquidity_stats:
        currency = liq.get("currency", "UNKNOWN")
        amount = liq.get("total_liquidity", 0)
        total_liquidity[currency] = total_liquidity.get(currency, 0) + amount
    
    return {
        "total_referral_payouts": referral_payouts,
        "total_bonus_payouts": bonus_payouts,
        "total_liquidity": total_liquidity
    }


async def add_platform_funds(
    db,
    amount: float,
    currency: str,
    method: str,  # "manual" or "blockchain_deposit"
    admin_user_id: str,
    notes: Optional[str] = None,
    tx_hash: Optional[str] = None
) -> Dict[str, Any]:
    """
    Add funds to platform wallet (manual top-up or blockchain deposit)
    """
    transaction_id = str(uuid.uuid4())
    
    # Update platform balance
    await db.crypto_balances.update_one(
        {"user_id": PLATFORM_WALLET_ID, "currency": currency},
        {
            "$inc": {"balance": amount, "available_balance": amount},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Create transaction record
    transaction = {
        "transaction_id": transaction_id,
        "wallet_id": PLATFORM_WALLET_ID,
        "type": "top_up",
        "method": method,
        "amount": amount,
        "currency": currency,
        "admin_user_id": admin_user_id,
        "notes": notes,
        "tx_hash": tx_hash,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.platform_wallet_transactions.insert_one(transaction)
    
    logger.info(f"✅ Platform wallet topped up: {amount} {currency} via {method}")
    
    return {
        "success": True,
        "transaction_id": transaction_id,
        "new_balance": await get_platform_balance(db)
    }


async def deduct_platform_funds(
    db,
    amount: float,
    currency: str,
    reason: str,  # "referral_payout", "bonus_payout", "liquidity_added", etc.
    reference_id: str,
    recipient_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Deduct funds from platform wallet for payouts/liquidity
    """
    # Check if sufficient balance
    balance_doc = await db.crypto_balances.find_one({
        "user_id": PLATFORM_WALLET_ID,
        "currency": currency
    })
    
    current_balance = balance_doc.get("balance", 0) if balance_doc else 0
    
    if current_balance < amount:
        logger.error(f"❌ Insufficient platform balance: {current_balance} < {amount} {currency}")
        return {
            "success": False,
            "error": "Insufficient platform balance",
            "current_balance": current_balance,
            "required": amount
        }
    
    # Deduct from platform balance
    await db.crypto_balances.update_one(
        {"user_id": PLATFORM_WALLET_ID, "currency": currency},
        {
            "$inc": {"balance": -amount, "available_balance": -amount},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    transaction = {
        "transaction_id": transaction_id,
        "wallet_id": PLATFORM_WALLET_ID,
        "type": "deduction",
        "reason": reason,
        "amount": amount,
        "currency": currency,
        "recipient_id": recipient_id,
        "reference_id": reference_id,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.platform_wallet_transactions.insert_one(transaction)
    
    # Check if balance is low and create warning
    await check_low_balance_warning(db, currency, current_balance - amount)
    
    logger.info(f"✅ Platform wallet deducted: {amount} {currency} for {reason}")
    
    return {
        "success": True,
        "transaction_id": transaction_id,
        "new_balance": current_balance - amount
    }


async def check_low_balance_warning(db, currency: str, balance: float):
    """
    Check if platform balance is low and create warning
    """
    # Convert to GBP equivalent for warning check
    gbp_equivalent = balance
    if currency != "GBP":
        # Simplified conversion - use real rates in production
        conversion_rates = {
            "USDT": 0.79,
            "BTC": 35000,
            "ETH": 2000,
            "BNB": 250,
            "SOL": 100
        }
        gbp_equivalent = balance * conversion_rates.get(currency, 1)
    
    warning_level = None
    if gbp_equivalent < CRITICAL_BALANCE_THRESHOLD:
        warning_level = "critical"
    elif gbp_equivalent < LOW_BALANCE_WARNING_THRESHOLD:
        warning_level = "warning"
    
    if warning_level:
        # Create warning record
        warning_doc = {
            "warning_id": str(uuid.uuid4()),
            "level": warning_level,
            "currency": currency,
            "balance": balance,
            "gbp_equivalent": gbp_equivalent,
            "threshold": CRITICAL_BALANCE_THRESHOLD if warning_level == "critical" else LOW_BALANCE_WARNING_THRESHOLD,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "acknowledged": False
        }
        
        await db.platform_balance_warnings.insert_one(warning_doc)
        
        logger.warning(f"⚠️ LOW BALANCE WARNING: {currency} balance {balance} (£{gbp_equivalent:.2f})")
        
        return warning_doc
    
    return None


async def get_transaction_history(
    db,
    transaction_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> list:
    """
    Get platform wallet transaction history with optional filtering
    """
    query = {}
    
    if transaction_type:
        if transaction_type in ["referral_payout", "bonus_payout", "liquidity_added", "liquidity_removed"]:
            query["reason"] = transaction_type
        elif transaction_type in ["manual", "blockchain_deposit"]:
            query["method"] = transaction_type
    
    transactions = await db.platform_wallet_transactions.find(query).sort(
        "created_at", -1
    ).skip(offset).limit(limit).to_list(limit)
    
    return transactions


async def generate_deposit_address(db, currency: str = "USDT", user_id: str = None) -> Dict[str, Any]:
    """
    Generate REAL blockchain deposit address using NOWPayments API
    This function creates a unique payment request and returns a real deposit address
    """
    try:
        from nowpayments_integration import get_nowpayments_service
        
        # Check if we already have an active address for this currency + user combination
        existing_address = await db.platform_deposit_addresses.find_one({
            "currency": currency.upper(),
            "user_id": user_id,
            "status": "active",
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        
        if existing_address and existing_address.get("address") and existing_address.get("address") != "ADDRESS_NOT_CONFIGURED":
            logger.info(f"✅ Returning existing deposit address for {currency}: {existing_address['address']}")
            return {
                "currency": currency.upper(),
                "address": existing_address["address"],
                "network": existing_address.get("network", "Native"),
                "payment_id": existing_address.get("payment_id")
            }
        
        # Generate new deposit address via NOWPayments
        nowpayments = get_nowpayments_service()
        
        # Create a unique order ID
        order_id = f"deposit_{user_id or 'platform'}_{currency.lower()}_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Create payment with NOWPayments
        # We use a nominal amount (min deposit) to generate the address
        payment_result = nowpayments.create_payment(
            price_amount=20,  # Minimum deposit amount in USD/GBP
            price_currency="usd",
            pay_currency=currency.lower(),
            order_id=order_id,
            order_description=f"{currency.upper()} deposit for user"
        )
        
        if not payment_result:
            logger.error(f"❌ Failed to generate deposit address from NOWPayments for {currency}")
            raise Exception("Failed to generate deposit address from payment provider")
        
        deposit_address = payment_result.get("pay_address")
        payment_id = payment_result.get("payment_id")
        
        if not deposit_address:
            logger.error(f"❌ NOWPayments returned no address: {payment_result}")
            raise Exception("Payment provider returned invalid response")
        
        logger.info(f"✅ Generated NEW deposit address for {currency}: {deposit_address}")
        
        # Store address in database with 7-day expiry
        from datetime import timedelta
        expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        await db.platform_deposit_addresses.update_one(
            {
                "currency": currency.upper(),
                "user_id": user_id
            },
            {
                "$set": {
                    "address": deposit_address,
                    "currency": currency.upper(),
                    "user_id": user_id,
                    "wallet_id": PLATFORM_WALLET_ID,
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "network": payment_result.get("network", "Native"),
                    "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": expires_at
                }
            },
            upsert=True
        )
        
        return {
            "currency": currency.upper(),
            "address": deposit_address,
            "network": payment_result.get("network", "Native"),
            "payment_id": payment_id
        }
        
    except Exception as e:
        logger.error(f"❌ Error generating deposit address for {currency}: {str(e)}")
        raise Exception(f"Failed to generate deposit address: {str(e)}")
