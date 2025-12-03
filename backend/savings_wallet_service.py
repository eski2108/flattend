# Savings Transfers with Wallet Service

import logging
from datetime import datetime, timezone
from typing import Dict
from fastapi import HTTPException

logger = logging.getLogger(__name__)

async def vault_transfer_with_fee(db, wallet_service, user_id: str, currency: str, amount: float, from_wallet: str, to_wallet: str) -> Dict:
    """Transfer between wallets with vault transfer fee"""
    try:
        from centralized_fee_system import get_fee_manager
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        balance = await wallet_service.get_balance(user_id, currency)
        if balance['available_balance'] < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {balance['available_balance']}")
        
        # Get vault transfer fee
        fee_manager = get_fee_manager(db)
        fee_percent = await fee_manager.get_fee("vault_transfer_fee_percent")
        vault_fee = amount * (fee_percent / 100.0)
        net_amount = amount - vault_fee
        
        # Check for referrer
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        referrer_id = user.get("referrer_id") if user else None
        referrer_commission = 0.0
        admin_fee = vault_fee
        commission_percent = 0.0
        
        if referrer_id:
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = vault_fee * (commission_percent / 100.0)
            admin_fee = vault_fee - referrer_commission
        
        transfer_id = f"vault_transfer_{user_id}_{currency}_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Debit from source wallet
        await wallet_service.debit(
            user_id=user_id,
            currency=currency,
            amount=amount,
            transaction_type="vault_transfer",
            reference_id=transfer_id,
            metadata={"from": from_wallet, "to": to_wallet, "fee": vault_fee, "net_amount": net_amount}
        )
        
        # Credit admin wallet with fee
        await wallet_service.credit(
            user_id="admin_wallet",
            currency=currency,
            amount=admin_fee,
            transaction_type="vault_transfer_fee",
            reference_id=transfer_id,
            metadata={"user_id": user_id, "total_fee": vault_fee}
        )
        
        # Credit referrer if applicable
        if referrer_id and referrer_commission > 0:
            await wallet_service.credit(
                user_id=referrer_id,
                currency=currency,
                amount=referrer_commission,
                transaction_type="referral_commission",
                reference_id=transfer_id,
                metadata={"referred_user_id": user_id, "transaction_type": "vault_transfer"}
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": user_id,
                "transaction_type": "vault_transfer",
                "fee_amount": vault_fee,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": currency,
                "transfer_id": transfer_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Log to fee_transactions
        await db.fee_transactions.insert_one({
            "transaction_id": transfer_id,
            "user_id": user_id,
            "transaction_type": "vault_transfer",
            "fee_type": "vault_transfer_fee",
            "amount": amount,
            "total_fee": vault_fee,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": currency,
            "reference_id": transfer_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Credit destination (net amount after fee)
        # This would go to the target wallet/vault
        # Implementation depends on your vault structure
        
        logger.info(f"✅ Vault transfer: {amount} {currency}, Fee: {vault_fee}, Net: {net_amount}")
        
        return {
            "success": True,
            "amount": amount,
            "fee": vault_fee,
            "net_amount": net_amount,
            "transfer_id": transfer_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vault transfer error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def calculate_savings_interest_with_profit(db, wallet_service, user_id: str, currency: str, savings_balance: float, apy_rate: float, days: int) -> Dict:
    """
    Calculate savings interest and track platform profit spread
    
    Platform earns on the spread between what they earn from lending/staking
    and what they pay to users in savings interest
    """
    try:
        from centralized_fee_system import get_fee_manager
        
        # User's interest rate (what we pay them)
        user_interest = savings_balance * (apy_rate / 100.0) * (days / 365.0)
        
        # Platform's actual earnings rate (higher than what we pay users)
        fee_manager = get_fee_manager(db)
        platform_spread_percent = await fee_manager.get_fee("savings_interest_profit_percent")
        platform_apy = apy_rate + platform_spread_percent
        
        # Platform's total earnings from this capital
        platform_total_earnings = savings_balance * (platform_apy / 100.0) * (days / 365.0)
        
        # Platform profit = difference
        platform_profit = platform_total_earnings - user_interest
        
        # 🔒 LIQUIDITY SAFETY CHECK - Ensure admin can pay interest
        from liquidity_checker import LiquidityChecker
        
        liquidity_checker = LiquidityChecker(db)
        liquidity_check = await liquidity_checker.check_and_log(
            currency=currency,
            amount=user_interest,
            operation_type="savings_interest_payout",
            user_id=user_id,
            metadata={
                "apy": apy_rate,
                "days": days,
                "principal": savings_balance,
                "interest_amount": user_interest,
                "platform_profit": platform_profit
            }
        )
        
        if not liquidity_check["can_execute"]:
            logger.error(f"🚫 SAVINGS INTEREST BLOCKED: {liquidity_check['message']}")
            return {
                "success": False,
                "can_execute": False,
                "message": f"Interest payout delayed: {liquidity_check['message']}",
                "reason": "insufficient_platform_liquidity"
            }
        
        logger.info(f"✅ LIQUIDITY CHECK PASSED for savings interest: {user_interest} {currency}")
        
        # Credit user with their interest
        interest_id = f"savings_interest_{user_id}_{currency}_{int(datetime.now(timezone.utc).timestamp())}"
        
        # 🔒 DEDUCT FROM ADMIN LIQUIDITY FIRST (NO MINTING)
        await db.admin_liquidity_wallets.update_one(
            {"currency": currency},
            {
                "$inc": {"available": -user_interest, "balance": -user_interest},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        logger.info(f"💰 Deducted {user_interest} {currency} from admin liquidity for interest payout")
        
        await wallet_service.credit(
            user_id=user_id,
            currency=currency,
            amount=user_interest,
            transaction_type="savings_interest",
            reference_id=interest_id,
            metadata={"apy": apy_rate, "days": days, "principal": savings_balance}
        )
        
        # Log platform profit
        await db.fee_transactions.insert_one({
            "transaction_id": interest_id,
            "user_id": user_id,
            "transaction_type": "savings_interest",
            "fee_type": "savings_interest_profit",
            "amount": savings_balance,
            "total_fee": platform_profit,
            "fee_percent": platform_spread_percent,
            "admin_fee": platform_profit,  # All profit goes to platform
            "referrer_commission": 0.0,  # No referral on interest spread
            "referrer_id": None,
            "currency": currency,
            "reference_id": interest_id,
            "metadata": {
                "user_apy": apy_rate,
                "platform_apy": platform_apy,
                "user_interest": user_interest,
                "platform_profit": platform_profit,
                "days": days
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Credit platform profit to admin wallet
        await wallet_service.credit(
            user_id="admin_wallet",
            currency=currency,
            amount=platform_profit,
            transaction_type="savings_interest_profit",
            reference_id=interest_id,
            metadata={
                "user_id": user_id,
                "user_apy": apy_rate,
                "platform_apy": platform_apy,
                "spread": platform_spread_percent
            }
        )
        
        logger.info(f"✅ Savings interest: User gets {user_interest} {currency}, Platform profit: {platform_profit} {currency}")
        
        return {
            "success": True,
            "user_interest": user_interest,
            "platform_profit": platform_profit,
            "platform_apy": platform_apy,
            "interest_id": interest_id
        }
        
    except Exception as e:
        logger.error(f"Savings interest calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def transfer_to_savings_with_wallet(db, wallet_service, user_id: str, currency: str, amount: float) -> Dict:
    """Transfer from wallet to savings via wallet service with stake fee"""
    try:
        from centralized_fee_system import get_fee_manager
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        balance = await wallet_service.get_balance(user_id, currency)
        if balance['available_balance'] < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {balance['available_balance']}")
        
        # Get stake fee from centralized system
        fee_manager = get_fee_manager(db)
        fee_percent = await fee_manager.get_fee("savings_stake_fee_percent")
        stake_fee = amount * (fee_percent / 100.0)
        net_amount = amount - stake_fee
        
        # Check for referrer
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        referrer_id = user.get("referrer_id") if user else None
        referrer_commission = 0.0
        admin_fee = stake_fee
        commission_percent = 0.0
        
        if referrer_id:
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = stake_fee * (commission_percent / 100.0)
            admin_fee = stake_fee - referrer_commission
        
        transfer_id = f"savings_in_{user_id}_{currency}_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Debit full amount from wallet
        await wallet_service.debit(
            user_id=user_id,
            currency=currency,
            amount=amount,
            transaction_type="transfer_to_savings",
            reference_id=transfer_id,
            metadata={"destination": "savings", "fee": stake_fee, "net_amount": net_amount}
        )
        
        # Credit admin wallet with fee
        await wallet_service.credit(
            user_id="admin_wallet",
            currency=currency,
            amount=admin_fee,
            transaction_type="savings_stake_fee",
            reference_id=transfer_id,
            metadata={"user_id": user_id, "total_fee": stake_fee}
        )
        
        # Credit referrer if applicable
        if referrer_id and referrer_commission > 0:
            await wallet_service.credit(
                user_id=referrer_id,
                currency=currency,
                amount=referrer_commission,
                transaction_type="referral_commission",
                reference_id=transfer_id,
                metadata={"referred_user_id": user_id, "transaction_type": "savings_stake"}
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": user_id,
                "transaction_type": "savings_stake",
                "fee_amount": stake_fee,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": currency,
                "transfer_id": transfer_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Track savings separately in savings_balances collection for interest calculations
        # Store net amount (after fee) in savings
        savings_balance = await db.savings_balances.find_one({"user_id": user_id, "currency": currency})
        if savings_balance:
            await db.savings_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$inc": {"balance": net_amount}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.savings_balances.insert_one({
                "user_id": user_id,
                "currency": currency,
                "balance": net_amount,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_updated": datetime.now(timezone.utc).isoformat()
            })
        
        # Process referral using centralized engine
        try:
            from referral_engine import get_referral_engine
            referral_engine = get_referral_engine()
            await referral_engine.process_referral_commission(
                user_id=user_id,
                fee_amount=stake_fee,
                fee_type="SAVINGS_DEPOSIT",
                currency=currency,
                related_transaction_id=transfer_id,
                metadata={"net_staked": net_amount}
            )
        except Exception as ref_err:
            logger.warning(f"Referral failed: {ref_err}")
        
        # Log to fee_transactions
        await db.fee_transactions.insert_one({
            "user_id": user_id,
            "transaction_type": "savings_stake",
            "fee_type": "savings_stake_fee_percent",
            "amount": amount,
            "fee_amount": stake_fee,
            "fee_percent": fee_percent,
            "currency": currency,
            "reference_id": transfer_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"✅ Savings: {user_id} staked {amount} {currency} to savings, Fee: {stake_fee}")
        return {"success": True, "amount": amount, "net_amount": net_amount, "fee": stake_fee, "currency": currency}
    except Exception as e:
        logger.error(f"❌ Savings transfer error: {str(e)}")
        raise

async def transfer_from_savings_with_wallet(db, wallet_service, user_id: str, currency: str, amount: float) -> Dict:
    """Transfer from savings back to wallet via wallet service - may incur early unstake penalty"""
    try:
        from centralized_fee_system import get_fee_manager
        from datetime import timedelta
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        savings_balance = await db.savings_balances.find_one({"user_id": user_id, "currency": currency})
        if not savings_balance or savings_balance.get("balance", 0) < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient savings balance")
        
        # Check if this is an early withdrawal (within 30 days of last deposit)
        fee_manager = get_fee_manager(db)
        last_updated = savings_balance.get("last_updated")
        is_early_withdrawal = False
        penalty_fee = 0.0
        net_amount = amount
        
        if last_updated:
            last_update_time = datetime.fromisoformat(last_updated)
            days_since_deposit = (datetime.now(timezone.utc) - last_update_time).days
            
            # Apply early unstake penalty if withdrawn within 30 days
            if days_since_deposit < 30:
                is_early_withdrawal = True
                penalty_percent = await fee_manager.get_fee("early_unstake_penalty_percent")
                penalty_fee = amount * (penalty_percent / 100.0)
                net_amount = amount - penalty_fee
        
        # Check for referrer if penalty applied
        referrer_id = None
        referrer_commission = 0.0
        admin_fee = penalty_fee
        commission_percent = 0.0
        
        if is_early_withdrawal and penalty_fee > 0:
            user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
            referrer_id = user.get("referrer_id") if user else None
            
            if referrer_id:
                referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
                referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
                
                if referrer_tier == "golden":
                    commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
                else:
                    commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
                
                referrer_commission = penalty_fee * (commission_percent / 100.0)
                admin_fee = penalty_fee - referrer_commission
        
        transfer_id = f"savings_out_{user_id}_{currency}_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Deduct from savings
        await db.savings_balances.update_one(
            {"user_id": user_id, "currency": currency},
            {"$inc": {"balance": -amount}, "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Credit user wallet with net amount
        await wallet_service.credit(
            user_id=user_id,
            currency=currency,
            amount=net_amount,
            transaction_type="transfer_from_savings",
            reference_id=transfer_id,
            metadata={"source": "savings", "penalty": penalty_fee, "is_early": is_early_withdrawal}
        )
        
        # Collect penalty fee if applicable
        if is_early_withdrawal and penalty_fee > 0:
            await wallet_service.credit(
                user_id="admin_wallet",
                currency=currency,
                amount=admin_fee,
                transaction_type="early_unstake_penalty",
                reference_id=transfer_id,
                metadata={"user_id": user_id, "total_penalty": penalty_fee}
            )
            
            # Credit referrer if applicable
            if referrer_id and referrer_commission > 0:
                await wallet_service.credit(
                    user_id=referrer_id,
                    currency=currency,
                    amount=referrer_commission,
                    transaction_type="referral_commission",
                    reference_id=transfer_id,
                    metadata={"referred_user_id": user_id, "transaction_type": "early_unstake"}
                )
                
                # Log referral commission
                await db.referral_commissions.insert_one({
                    "referrer_id": referrer_id,
                    "referred_user_id": user_id,
                    "transaction_type": "early_unstake",
                    "fee_amount": penalty_fee,
                    "commission_amount": referrer_commission,
                    "commission_percent": commission_percent,
                    "currency": currency,
                    "transfer_id": transfer_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            # Process referral using centralized engine
            try:
                from referral_engine import get_referral_engine
                referral_engine = get_referral_engine()
                await referral_engine.process_referral_commission(
                    user_id=user_id,
                    fee_amount=penalty_fee,
                    fee_type="SAVINGS_EARLY_UNSTAKE",
                    currency=currency,
                    related_transaction_id=transfer_id,
                    metadata={"withdrawn_amount": final_amount, "is_early": is_early_withdrawal}
                )
            except Exception as ref_err:
                logger.warning(f"Referral failed: {ref_err}")
            
            # Log to fee_transactions
            await db.fee_transactions.insert_one({
                "user_id": user_id,
                "transaction_type": "early_unstake",
                "fee_type": "early_unstake_penalty_percent",
                "amount": amount,
                "fee_amount": penalty_fee,
                "fee_percent": penalty_percent,
                "currency": currency,
                "reference_id": transfer_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        logger.info(f"✅ Savings: {user_id} withdrew {amount} {currency} from savings, Penalty: {penalty_fee} (Admin: {admin_fee}, Referrer: {referrer_commission})")
        return {"success": True, "amount": amount, "net_amount": net_amount, "penalty": penalty_fee, "is_early": is_early_withdrawal, "currency": currency}
    except Exception as e:
        logger.error(f"❌ Savings withdrawal error: {str(e)}")
        raise
