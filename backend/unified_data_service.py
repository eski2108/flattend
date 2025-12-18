"""
UNIFIED DATA SERVICE - SINGLE SOURCE OF TRUTH (OPTIMIZED)
==========================================================
All financial calculations MUST go through this service.
DO NOT duplicate this logic anywhere else.

OPTIMIZATIONS:
- In-memory caching with TTL
- Aggregated queries instead of per-user loops
- Pagination enforced
- Background refresh for heavy calculations
"""

import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from functools import lru_cache
import time

logger = logging.getLogger("unified_data_service")

class UnifiedDataService:
    """
    LOCKED LOGIC - DO NOT MODIFY WITHOUT APPROVAL
    This is the single source of truth for all financial data.
    """
    
    def __init__(self, db):
        self.db = db
        self._cache = {}
        self._cache_ttl = {}
        self._default_cache_seconds = 30  # Cache for 30 seconds
        self._heavy_cache_seconds = 60    # Heavy queries cache for 60 seconds
        
        self._default_prices = {
            "BTC": 105000, "ETH": 3900, "USDT": 1, "USDC": 1,
            "SOL": 200, "XRP": 2.3, "ADA": 1.1, "DOGE": 0.4,
            "GBP": 1.27, "EUR": 1.05, "USD": 1
        }
    
    def _get_cache(self, key: str) -> Optional[Any]:
        """Get cached value if not expired"""
        if key in self._cache and key in self._cache_ttl:
            if time.time() < self._cache_ttl[key]:
                return self._cache[key]
        return None
    
    def _set_cache(self, key: str, value: Any, ttl_seconds: int = None):
        """Set cache with TTL"""
        ttl = ttl_seconds or self._default_cache_seconds
        self._cache[key] = value
        self._cache_ttl[key] = time.time() + ttl
    
    def _get_usd_value(self, amount: float, currency: str) -> float:
        """Convert any currency amount to USD equivalent"""
        if not amount:
            return 0.0
        price = self._default_prices.get(currency.upper(), 1)
        return float(amount) * price
    
    async def get_platform_summary_fast(self) -> Dict[str, Any]:
        """
        FAST platform summary - uses aggregation, not loops.
        Target: < 500ms response time
        """
        cache_key = "platform_summary_fast"
        cached = self._get_cache(cache_key)
        if cached:
            return cached
        
        try:
            start = time.time()
            
            # Get user counts - single queries
            total_users = await self.db.users.count_documents({})
            verified_users = await self.db.users.count_documents({"email_verified": True})
            kyc_users = await self.db.users.count_documents({"kyc_verified": True})
            
            # Get aggregated wallet totals using MongoDB aggregation
            wallet_pipeline = [
                {"$group": {
                    "_id": "$currency",
                    "total_available": {"$sum": {"$toDouble": {"$ifNull": ["$available_balance", 0]}}},
                    "total_locked": {"$sum": {"$toDouble": {"$ifNull": ["$locked_balance", 0]}}}
                }}
            ]
            wallet_totals = await self.db.wallets.aggregate(wallet_pipeline).to_list(100)
            
            # Calculate platform totals
            platform_balances = {}
            total_platform_usd = 0
            
            for w in wallet_totals:
                currency = w["_id"] or ""
                if not currency:
                    continue
                total = (w.get("total_available", 0) or 0) + (w.get("total_locked", 0) or 0)
                usd_val = self._get_usd_value(total, currency)
                platform_balances[currency] = {"total": round(total, 8), "usd_value": round(usd_val, 2)}
                total_platform_usd += usd_val
            
            # Get transaction aggregates
            tx_pipeline = [
                {"$group": {
                    "_id": "$transaction_type",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}},
                    "total_fees": {"$sum": {"$toDouble": {"$ifNull": ["$fee", 0]}}}
                }}
            ]
            tx_totals = await self.db.wallet_transactions.aggregate(tx_pipeline).to_list(50)
            
            volume = {
                "total_deposits_usd": 0, "total_withdrawals_usd": 0,
                "total_swaps_usd": 0, "total_p2p_volume_usd": 0,
                "total_instant_buys_usd": 0, "total_fees_collected_usd": 0
            }
            
            for tx in tx_totals:
                tx_type = (tx["_id"] or "").lower()
                amount = tx.get("total_amount", 0) or 0
                fees = tx.get("total_fees", 0) or 0
                
                if tx_type in ["deposit", "crypto_deposit"]:
                    volume["total_deposits_usd"] += amount
                elif tx_type in ["withdrawal", "crypto_withdrawal"]:
                    volume["total_withdrawals_usd"] += amount
                elif tx_type in ["swap", "convert"]:
                    volume["total_swaps_usd"] += amount
                elif tx_type in ["p2p_buy", "p2p_sell"]:
                    volume["total_p2p_volume_usd"] += amount
                elif tx_type in ["instant_buy", "express_buy", "buy"]:
                    volume["total_instant_buys_usd"] += amount
                
                volume["total_fees_collected_usd"] += fees
            
            # P2P stats - simple counts
            total_p2p = await self.db.p2p_trades.count_documents({})
            active_p2p = await self.db.p2p_trades.count_documents({"status": {"$in": ["pending", "paid", "in_progress"]}})
            completed_p2p = await self.db.p2p_trades.count_documents({"status": "completed"})
            
            # Disputes
            total_disputes = await self.db.disputes.count_documents({})
            active_disputes = await self.db.disputes.count_documents({"status": {"$in": ["open", "pending"]}})
            
            elapsed = time.time() - start
            
            result = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "response_time_ms": round(elapsed * 1000, 2),
                "users": {"total": total_users, "verified_email": verified_users, "kyc_verified": kyc_users},
                "total_platform_usd": round(total_platform_usd, 2),
                "platform_balances_top": dict(list(sorted(platform_balances.items(), key=lambda x: x[1]["usd_value"], reverse=True))[:10]),
                "volume": {k: round(v, 2) for k, v in volume.items()},
                "p2p": {"total_trades": total_p2p, "active_trades": active_p2p, "completed_trades": completed_p2p},
                "disputes": {"total": total_disputes, "active": active_disputes}
            }
            
            self._set_cache(cache_key, result, self._default_cache_seconds)
            return result
            
        except Exception as e:
            logger.error(f"Error in platform summary: {str(e)}")
            return {"error": str(e)}
    
    async def get_users_breakdown_fast(self, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        FAST users breakdown - paginated, no per-user loops.
        Target: < 500ms response time
        """
        # Enforce hard limit
        limit = min(limit, 50)
        
        cache_key = f"users_breakdown_{limit}_{offset}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached
        
        try:
            start = time.time()
            
            # Get users with pagination
            users = await self.db.users.find(
                {},
                {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "client_id": 1, 
                 "created_at": 1, "email_verified": 1, "kyc_verified": 1, "phone_number": 1}
            ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
            
            user_ids = [u.get("user_id") for u in users if u.get("user_id")]
            
            # Get wallet balances for these users in ONE query
            wallet_pipeline = [
                {"$match": {"user_id": {"$in": user_ids}}},
                {"$group": {
                    "_id": "$user_id",
                    "currencies": {"$push": {
                        "currency": "$currency",
                        "available": {"$toDouble": {"$ifNull": ["$available_balance", 0]}},
                        "locked": {"$toDouble": {"$ifNull": ["$locked_balance", 0]}}
                    }}
                }}
            ]
            wallet_data = await self.db.wallets.aggregate(wallet_pipeline).to_list(limit)
            wallet_map = {w["_id"]: w["currencies"] for w in wallet_data}
            
            # Get transaction counts per user in ONE query
            tx_pipeline = [
                {"$match": {"user_id": {"$in": user_ids}}},
                {"$group": {
                    "_id": "$user_id",
                    "tx_count": {"$sum": 1},
                    "total_deposited": {"$sum": {"$cond": [
                        {"$in": ["$transaction_type", ["deposit", "crypto_deposit"]]},
                        {"$toDouble": {"$ifNull": ["$amount", 0]}},
                        0
                    ]}},
                    "total_withdrawn": {"$sum": {"$cond": [
                        {"$in": ["$transaction_type", ["withdrawal", "crypto_withdrawal"]]},
                        {"$toDouble": {"$ifNull": ["$amount", 0]}},
                        0
                    ]}},
                    "total_fees": {"$sum": {"$toDouble": {"$ifNull": ["$fee", 0]}}}
                }}
            ]
            tx_data = await self.db.wallet_transactions.aggregate(tx_pipeline).to_list(limit)
            tx_map = {t["_id"]: t for t in tx_data}
            
            # Get P2P trade counts per user
            p2p_pipeline = [
                {"$match": {"$or": [{"buyer_id": {"$in": user_ids}}, {"seller_id": {"$in": user_ids}}]}},
                {"$group": {
                    "_id": None,
                    "trades": {"$push": {"buyer_id": "$buyer_id", "seller_id": "$seller_id"}}
                }}
            ]
            p2p_data = await self.db.p2p_trades.aggregate(p2p_pipeline).to_list(1)
            
            # Build P2P count map
            p2p_map = {uid: 0 for uid in user_ids}
            if p2p_data and p2p_data[0].get("trades"):
                for trade in p2p_data[0]["trades"]:
                    if trade.get("buyer_id") in p2p_map:
                        p2p_map[trade["buyer_id"]] += 1
                    if trade.get("seller_id") in p2p_map:
                        p2p_map[trade["seller_id"]] += 1
            
            # Build result
            results = []
            for user in users:
                user_id = user.get("user_id")
                if not user_id:
                    continue
                
                # Calculate balance
                total_usd = 0
                wallets = wallet_map.get(user_id, [])
                for w in wallets:
                    total = (w.get("available", 0) or 0) + (w.get("locked", 0) or 0)
                    total_usd += self._get_usd_value(total, w.get("currency", ""))
                
                tx_info = tx_map.get(user_id, {})
                
                results.append({
                    "client_id": user.get("client_id", f"CHX-{user_id[:6].upper()}"),
                    "user_id": user_id,
                    "email": user.get("email"),
                    "full_name": user.get("full_name"),
                    "phone_number": user.get("phone_number"),
                    "email_verified": user.get("email_verified", False),
                    "kyc_verified": user.get("kyc_verified", False),
                    "signup_date": user.get("created_at"),
                    "total_balance_usd": round(total_usd, 2),
                    "total_deposited": round(tx_info.get("total_deposited", 0), 2),
                    "total_withdrawn": round(tx_info.get("total_withdrawn", 0), 2),
                    "total_fees_paid": round(tx_info.get("total_fees", 0), 2),
                    "transaction_count": tx_info.get("tx_count", 0),
                    "p2p_trades": p2p_map.get(user_id, 0)
                })
            
            elapsed = time.time() - start
            
            result = {
                "data": results,
                "count": len(results),
                "limit": limit,
                "offset": offset,
                "response_time_ms": round(elapsed * 1000, 2)
            }
            
            self._set_cache(cache_key, result, self._default_cache_seconds)
            return result
            
        except Exception as e:
            logger.error(f"Error in users breakdown: {str(e)}")
            return {"error": str(e), "data": []}
    
    async def get_user_summary_fast(self, user_id: str) -> Dict[str, Any]:
        """
        FAST single user summary.
        Target: < 200ms response time
        """
        cache_key = f"user_summary_{user_id}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached
        
        try:
            start = time.time()
            
            # Get wallets
            wallets = await self.db.wallets.find(
                {"user_id": user_id},
                {"_id": 0, "currency": 1, "available_balance": 1, "locked_balance": 1}
            ).to_list(50)
            
            balances = {}
            total_usd = 0
            for w in wallets:
                currency = w.get("currency", "")
                available = float(w.get("available_balance", 0) or 0)
                locked = float(w.get("locked_balance", 0) or 0)
                total = available + locked
                usd_val = self._get_usd_value(total, currency)
                balances[currency] = {"available": available, "locked": locked, "total": total, "usd_value": round(usd_val, 2)}
                total_usd += usd_val
            
            # Get transaction summary using aggregation
            tx_pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$transaction_type",
                    "count": {"$sum": 1},
                    "total": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}},
                    "fees": {"$sum": {"$toDouble": {"$ifNull": ["$fee", 0]}}}
                }}
            ]
            tx_summary = await self.db.wallet_transactions.aggregate(tx_pipeline).to_list(20)
            
            activity = {}
            total_fees = 0
            for tx in tx_summary:
                tx_type = tx["_id"] or "other"
                activity[tx_type] = {
                    "count": tx.get("count", 0),
                    "total": round(tx.get("total", 0), 2)
                }
                total_fees += tx.get("fees", 0)
            
            # P2P counts
            p2p_buyer = await self.db.p2p_trades.count_documents({"buyer_id": user_id})
            p2p_seller = await self.db.p2p_trades.count_documents({"seller_id": user_id})
            
            elapsed = time.time() - start
            
            result = {
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "response_time_ms": round(elapsed * 1000, 2),
                "total_balance_usd": round(total_usd, 2),
                "balances": balances,
                "activity": activity,
                "total_fees_paid": round(total_fees, 2),
                "p2p_stats": {"as_buyer": p2p_buyer, "as_seller": p2p_seller, "total": p2p_buyer + p2p_seller}
            }
            
            self._set_cache(cache_key, result, self._default_cache_seconds)
            return result
            
        except Exception as e:
            logger.error(f"Error in user summary: {str(e)}")
            return {"error": str(e), "user_id": user_id}


# Singleton instance
_unified_service_instance = None

def get_unified_service(db):
    global _unified_service_instance
    if _unified_service_instance is None:
        _unified_service_instance = UnifiedDataService(db)
    return _unified_service_instance
