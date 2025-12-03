"""Comprehensive Audit Trail System

Logs every financial transaction with full details including:
- User ID
- Currency
- Amount
- Fee
- Admin profit
- Timestamp
- Before/after balances
- IP address
- Transaction ID
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional
import uuid

logger = logging.getLogger(__name__)

class AuditLogger:
    def __init__(self, db):
        self.db = db
    
    async def log_trade(self, 
                       user_id: str,
                       trade_type: str,
                       pair: str,
                       amount: float,
                       price: float,
                       total: float,
                       fee: float,
                       admin_profit: float,
                       user_balance_before: Dict,
                       user_balance_after: Dict,
                       admin_balance_before: Dict,
                       admin_balance_after: Dict,
                       ip_address: str = None,
                       transaction_id: str = None):
        """
        Log a spot trading transaction
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id or audit_id,
            "action_type": "SPOT_TRADE",
            "user_id": user_id,
            "trade_type": trade_type,
            "pair": pair,
            "amount": amount,
            "price": price,
            "total": total,
            "fee": fee,
            "admin_profit": admin_profit,
            "user_balance_before": user_balance_before,
            "user_balance_after": user_balance_after,
            "admin_balance_before": admin_balance_before,
            "admin_balance_after": admin_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Trade logged - {trade_type} {pair} by {user_id}")
        return audit_id
    
    async def log_swap(self,
                      user_id: str,
                      from_currency: str,
                      to_currency: str,
                      from_amount: float,
                      to_amount: float,
                      fee: float,
                      admin_profit: float,
                      user_balance_before: Dict,
                      user_balance_after: Dict,
                      admin_balance_before: Dict,
                      admin_balance_after: Dict,
                      ip_address: str = None,
                      transaction_id: str = None):
        """
        Log a swap transaction
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id or audit_id,
            "action_type": "SWAP",
            "user_id": user_id,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "from_amount": from_amount,
            "to_amount": to_amount,
            "fee": fee,
            "admin_profit": admin_profit,
            "user_balance_before": user_balance_before,
            "user_balance_after": user_balance_after,
            "admin_balance_before": admin_balance_before,
            "admin_balance_after": admin_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Swap logged - {from_currency} -> {to_currency} by {user_id}")
        return audit_id
    
    async def log_p2p(self,
                     buyer_id: str,
                     seller_id: str,
                     currency: str,
                     amount: float,
                     fee: float,
                     admin_profit: float,
                     buyer_balance_before: Dict,
                     buyer_balance_after: Dict,
                     seller_balance_before: Dict,
                     seller_balance_after: Dict,
                     admin_balance_before: Dict,
                     admin_balance_after: Dict,
                     ip_address: str = None,
                     transaction_id: str = None):
        """
        Log a P2P transaction
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id or audit_id,
            "action_type": "P2P_TRADE",
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "currency": currency,
            "amount": amount,
            "fee": fee,
            "admin_profit": admin_profit,
            "buyer_balance_before": buyer_balance_before,
            "buyer_balance_after": buyer_balance_after,
            "seller_balance_before": seller_balance_before,
            "seller_balance_after": seller_balance_after,
            "admin_balance_before": admin_balance_before,
            "admin_balance_after": admin_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: P2P logged - {buyer_id} -> {seller_id}, {amount} {currency}")
        return audit_id
    
    async def log_deposit(self,
                         user_id: str,
                         currency: str,
                         amount: float,
                         source: str,
                         transaction_id: str,
                         user_balance_before: Dict,
                         user_balance_after: Dict,
                         ip_address: str = None):
        """
        Log a deposit
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id,
            "action_type": "DEPOSIT",
            "user_id": user_id,
            "currency": currency,
            "amount": amount,
            "source": source,
            "user_balance_before": user_balance_before,
            "user_balance_after": user_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Deposit logged - {user_id}, {amount} {currency} from {source}")
        return audit_id
    
    async def log_withdrawal(self,
                            user_id: str,
                            currency: str,
                            amount: float,
                            fee: float,
                            destination: str,
                            user_balance_before: Dict,
                            user_balance_after: Dict,
                            admin_balance_before: Dict,
                            admin_balance_after: Dict,
                            ip_address: str = None,
                            transaction_id: str = None):
        """
        Log a withdrawal
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id or audit_id,
            "action_type": "WITHDRAWAL",
            "user_id": user_id,
            "currency": currency,
            "amount": amount,
            "fee": fee,
            "destination": destination,
            "user_balance_before": user_balance_before,
            "user_balance_after": user_balance_after,
            "admin_balance_before": admin_balance_before,
            "admin_balance_after": admin_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Withdrawal logged - {user_id}, {amount} {currency}")
        return audit_id
    
    async def log_admin_topup(self,
                             admin_id: str,
                             currency: str,
                             amount: float,
                             source: str,
                             transaction_id: str,
                             admin_balance_before: Dict,
                             admin_balance_after: Dict,
                             ip_address: str = None):
        """
        Log admin liquidity top-up
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id,
            "action_type": "ADMIN_TOPUP",
            "admin_id": admin_id,
            "currency": currency,
            "amount": amount,
            "source": source,
            "admin_balance_before": admin_balance_before,
            "admin_balance_after": admin_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Admin top-up logged - {amount} {currency} from {source}")
        return audit_id
    
    async def log_referral_payout(self,
                                 referrer_id: str,
                                 referred_user_id: str,
                                 currency: str,
                                 commission_amount: float,
                                 fee_type: str,
                                 tier: str,
                                 referrer_balance_before: Dict,
                                 referrer_balance_after: Dict,
                                 ip_address: str = None,
                                 transaction_id: str = None):
        """
        Log referral commission payout
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "transaction_id": transaction_id or audit_id,
            "action_type": "REFERRAL_PAYOUT",
            "referrer_id": referrer_id,
            "referred_user_id": referred_user_id,
            "currency": currency,
            "commission_amount": commission_amount,
            "fee_type": fee_type,
            "tier": tier,
            "referrer_balance_before": referrer_balance_before,
            "referrer_balance_after": referrer_balance_after,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Referral payout logged - {referrer_id}, {commission_amount} {currency}")
        return audit_id
    
    async def log_tier_upgrade(self,
                              user_id: str,
                              from_tier: str,
                              to_tier: str,
                              ip_address: str = None):
        """
        Log tier upgrade
        """
        audit_id = str(uuid.uuid4())
        
        await self.db.audit_logs.insert_one({
            "audit_id": audit_id,
            "action_type": "TIER_UPGRADE",
            "user_id": user_id,
            "from_tier": from_tier,
            "to_tier": to_tier,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        logger.info(f"📝 AUDIT: Tier upgrade logged - {user_id}, {from_tier} -> {to_tier}")
        return audit_id
    
    async def get_audit_logs(self,
                            user_id: str = None,
                            action_type: str = None,
                            start_date: str = None,
                            end_date: str = None,
                            limit: int = 100):
        """
        Query audit logs with filters
        """
        query = {}
        if user_id:
            query["$or"] = [{"user_id": user_id}, {"buyer_id": user_id}, {"seller_id": user_id}, {"referrer_id": user_id}]
        if action_type:
            query["action_type"] = action_type
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        logs = await self.db.audit_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs
