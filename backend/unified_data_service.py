"""
UNIFIED DATA SERVICE - SINGLE SOURCE OF TRUTH
=============================================
All financial calculations MUST go through this service.
DO NOT duplicate this logic anywhere else.

This service provides:
- User financial summaries
- Admin financial breakdowns
- Transaction tracking across all features
- Fee calculations per feature
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger("unified_data_service")

class UnifiedDataService:
    """
    LOCKED LOGIC - DO NOT MODIFY WITHOUT APPROVAL
    This is the single source of truth for all financial data.
    """
    
    def __init__(self, db):
        self.db = db
        self._price_cache = {}
        self._default_prices = {
            "BTC": 105000,
            "ETH": 3900,
            "USDT": 1,
            "USDC": 1,
            "SOL": 200,
            "XRP": 2.3,
            "ADA": 1.1,
            "DOGE": 0.4,
            "GBP": 1.27,
            "EUR": 1.05,
            "USD": 1
        }
    
    def _get_usd_value(self, amount: float, currency: str) -> float:
        """Convert any currency amount to USD equivalent"""
        price = self._default_prices.get(currency.upper(), 1)
        return float(amount or 0) * price
    
    async def get_user_financial_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Get complete financial summary for a user.
        Used by: User Dashboard, Admin Dashboard, Reports
        """
        try:
            # Get wallet balances
            wallets = await self.db.wallets.find(
                {"user_id": user_id},
                {"_id": 0}
            ).to_list(100)
            
            balances = {}
            total_balance_usd = 0
            
            for wallet in wallets:
                currency = wallet.get("currency", "")
                available = float(wallet.get("available_balance", 0) or 0)
                locked = float(wallet.get("locked_balance", 0) or 0)
                total = available + locked
                
                balances[currency] = {
                    "available": available,
                    "locked": locked,
                    "total": total,
                    "usd_value": self._get_usd_value(total, currency)
                }
                total_balance_usd += self._get_usd_value(total, currency)
            
            # Get all transactions
            transactions = await self.db.wallet_transactions.find(
                {"user_id": user_id},
                {"_id": 0}
            ).to_list(10000)
            
            # Categorize by type
            deposits = {"count": 0, "total": 0, "total_usd": 0}
            withdrawals = {"count": 0, "total": 0, "total_usd": 0}
            swaps = {"count": 0, "total": 0, "total_usd": 0}
            p2p_buys = {"count": 0, "total": 0, "total_usd": 0}
            p2p_sells = {"count": 0, "total": 0, "total_usd": 0}
            instant_buys = {"count": 0, "total": 0, "total_usd": 0}
            staking = {"count": 0, "total": 0, "total_usd": 0}
            vault = {"count": 0, "total": 0, "total_usd": 0}
            fees_paid = {"count": 0, "total": 0, "total_usd": 0}
            
            for tx in transactions:
                tx_type = tx.get("transaction_type", "").lower()
                amount = float(tx.get("amount", 0) or 0)
                currency = tx.get("currency", "USD")
                usd_value = self._get_usd_value(amount, currency)
                fee = float(tx.get("fee", 0) or 0)
                fee_usd = self._get_usd_value(fee, currency)
                
                if tx_type in ["deposit", "crypto_deposit"]:
                    deposits["count"] += 1
                    deposits["total"] += amount
                    deposits["total_usd"] += usd_value
                elif tx_type in ["withdrawal", "crypto_withdrawal"]:
                    withdrawals["count"] += 1
                    withdrawals["total"] += amount
                    withdrawals["total_usd"] += usd_value
                elif tx_type in ["swap", "convert"]:
                    swaps["count"] += 1
                    swaps["total"] += amount
                    swaps["total_usd"] += usd_value
                elif tx_type in ["p2p_buy", "p2p_purchase"]:
                    p2p_buys["count"] += 1
                    p2p_buys["total"] += amount
                    p2p_buys["total_usd"] += usd_value
                elif tx_type in ["p2p_sell", "p2p_sale"]:
                    p2p_sells["count"] += 1
                    p2p_sells["total"] += amount
                    p2p_sells["total_usd"] += usd_value
                elif tx_type in ["instant_buy", "express_buy", "buy"]:
                    instant_buys["count"] += 1
                    instant_buys["total"] += amount
                    instant_buys["total_usd"] += usd_value
                elif tx_type in ["stake", "staking"]:
                    staking["count"] += 1
                    staking["total"] += amount
                    staking["total_usd"] += usd_value
                elif tx_type in ["vault", "vault_lock"]:
                    vault["count"] += 1
                    vault["total"] += amount
                    vault["total_usd"] += usd_value
                
                if fee > 0:
                    fees_paid["count"] += 1
                    fees_paid["total"] += fee
                    fees_paid["total_usd"] += fee_usd
            
            # Get P2P trade counts
            p2p_trades_as_buyer = await self.db.p2p_trades.count_documents({"buyer_id": user_id})
            p2p_trades_as_seller = await self.db.p2p_trades.count_documents({"seller_id": user_id})
            
            return {
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "balances": balances,
                "total_balance_usd": round(total_balance_usd, 2),
                "activity": {
                    "deposits": deposits,
                    "withdrawals": withdrawals,
                    "swaps": swaps,
                    "p2p_buys": p2p_buys,
                    "p2p_sells": p2p_sells,
                    "instant_buys": instant_buys,
                    "staking": staking,
                    "vault": vault,
                    "fees_paid": fees_paid
                },
                "p2p_stats": {
                    "trades_as_buyer": p2p_trades_as_buyer,
                    "trades_as_seller": p2p_trades_as_seller,
                    "total_trades": p2p_trades_as_buyer + p2p_trades_as_seller
                },
                "total_transactions": len(transactions)
            }
        except Exception as e:
            logger.error(f"Error getting user financial summary: {str(e)}")
            return {"error": str(e), "user_id": user_id}
    
    async def get_admin_platform_summary(self) -> Dict[str, Any]:
        """
        Get complete platform financial summary for admin.
        Used by: Admin Dashboard, Reports, Analytics
        """
        try:
            # Get all users
            total_users = await self.db.users.count_documents({})
            verified_users = await self.db.users.count_documents({"email_verified": True})
            kyc_users = await self.db.users.count_documents({"kyc_verified": True})
            
            # Get all wallets for platform totals
            all_wallets = await self.db.wallets.find({}, {"_id": 0}).to_list(100000)
            
            platform_balances = {}
            total_platform_usd = 0
            
            for wallet in all_wallets:
                currency = wallet.get("currency", "")
                available = float(wallet.get("available_balance", 0) or 0)
                locked = float(wallet.get("locked_balance", 0) or 0)
                total = available + locked
                
                if currency not in platform_balances:
                    platform_balances[currency] = {"total": 0, "usd_value": 0}
                
                platform_balances[currency]["total"] += total
                usd_val = self._get_usd_value(total, currency)
                platform_balances[currency]["usd_value"] += usd_val
                total_platform_usd += usd_val
            
            # Get transaction totals
            all_transactions = await self.db.wallet_transactions.find({}, {"_id": 0}).to_list(100000)
            
            total_deposits = 0
            total_withdrawals = 0
            total_fees_collected = 0
            total_swaps = 0
            total_p2p_volume = 0
            total_instant_buys = 0
            
            for tx in all_transactions:
                tx_type = tx.get("transaction_type", "").lower()
                amount = float(tx.get("amount", 0) or 0)
                currency = tx.get("currency", "USD")
                usd_value = self._get_usd_value(amount, currency)
                fee = float(tx.get("fee", 0) or 0)
                fee_usd = self._get_usd_value(fee, currency)
                
                if tx_type in ["deposit", "crypto_deposit"]:
                    total_deposits += usd_value
                elif tx_type in ["withdrawal", "crypto_withdrawal"]:
                    total_withdrawals += usd_value
                elif tx_type in ["swap", "convert"]:
                    total_swaps += usd_value
                elif tx_type in ["p2p_buy", "p2p_sell", "p2p_purchase", "p2p_sale"]:
                    total_p2p_volume += usd_value
                elif tx_type in ["instant_buy", "express_buy", "buy"]:
                    total_instant_buys += usd_value
                
                total_fees_collected += fee_usd
            
            # Get P2P stats
            total_p2p_trades = await self.db.p2p_trades.count_documents({})
            active_p2p_trades = await self.db.p2p_trades.count_documents({"status": {"$in": ["pending", "paid", "in_progress"]}})
            completed_p2p_trades = await self.db.p2p_trades.count_documents({"status": "completed"})
            
            # Get dispute stats
            total_disputes = await self.db.disputes.count_documents({})
            active_disputes = await self.db.disputes.count_documents({"status": {"$in": ["open", "pending", "in_review"]}})
            
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "users": {
                    "total": total_users,
                    "verified_email": verified_users,
                    "kyc_verified": kyc_users
                },
                "platform_balances": platform_balances,
                "total_platform_usd": round(total_platform_usd, 2),
                "volume": {
                    "total_deposits_usd": round(total_deposits, 2),
                    "total_withdrawals_usd": round(total_withdrawals, 2),
                    "total_swaps_usd": round(total_swaps, 2),
                    "total_p2p_volume_usd": round(total_p2p_volume, 2),
                    "total_instant_buys_usd": round(total_instant_buys, 2),
                    "total_fees_collected_usd": round(total_fees_collected, 2)
                },
                "p2p": {
                    "total_trades": total_p2p_trades,
                    "active_trades": active_p2p_trades,
                    "completed_trades": completed_p2p_trades
                },
                "disputes": {
                    "total": total_disputes,
                    "active": active_disputes
                },
                "total_transactions": len(all_transactions)
            }
        except Exception as e:
            logger.error(f"Error getting platform summary: {str(e)}")
            return {"error": str(e)}
    
    async def get_all_users_financial_breakdown(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get financial breakdown for all users (admin view).
        Used by: Admin Dashboard, Customer Management, Reports
        """
        try:
            users = await self.db.users.find(
                {},
                {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "client_id": 1, "created_at": 1, "email_verified": 1, "kyc_verified": 1}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            results = []
            
            for user in users:
                user_id = user.get("user_id")
                if not user_id:
                    continue
                
                summary = await self.get_user_financial_summary(user_id)
                
                results.append({
                    "client_id": user.get("client_id", f"CHX-{user_id[:6].upper()}" if user_id else "N/A"),
                    "user_id": user_id,
                    "email": user.get("email"),
                    "full_name": user.get("full_name"),
                    "email_verified": user.get("email_verified", False),
                    "kyc_verified": user.get("kyc_verified", False),
                    "signup_date": user.get("created_at"),
                    "total_balance_usd": summary.get("total_balance_usd", 0),
                    "activity": summary.get("activity", {}),
                    "p2p_stats": summary.get("p2p_stats", {}),
                    "total_transactions": summary.get("total_transactions", 0)
                })
            
            return results
        except Exception as e:
            logger.error(f"Error getting all users breakdown: {str(e)}")
            return []


# Singleton instance - DO NOT CREATE MULTIPLE INSTANCES
_unified_service_instance = None

def get_unified_service(db):
    """Get or create the singleton unified data service instance"""
    global _unified_service_instance
    if _unified_service_instance is None:
        _unified_service_instance = UnifiedDataService(db)
    return _unified_service_instance
