"""
═══════════════════════════════════════════════════════════════════════════════
COINHUBX CANONICAL LEDGER SYSTEM - Task 2: Ledger & Revenue Reconciliation
═══════════════════════════════════════════════════════════════════════════════

Single source of truth for ALL money movements:
- Every £1 can be traced from source to destination
- User wallets = sum of ledger entries
- Admin revenue = sum of ledger entries
- All fees, deposits, withdrawals, swaps, trades traceable

Reconciliation:
- Daily / Weekly / Monthly aggregation
- Per-user, per-revenue-source reconciliation
- Automatic mismatch detection with alerts

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhubx_production')


# ═══════════════════════════════════════════════════════════════════════════════
# LEDGER ENTRY TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class LedgerEntryType(str, Enum):
    """All possible money movement types"""
    # Deposits & Withdrawals
    DEPOSIT = "DEPOSIT"                     # External money in
    WITHDRAWAL = "WITHDRAWAL"               # External money out
    WITHDRAWAL_FEE = "WITHDRAWAL_FEE"       # Fee on withdrawal
    
    # Trading
    SPOT_TRADE_BUY = "SPOT_TRADE_BUY"       # User buys crypto
    SPOT_TRADE_SELL = "SPOT_TRADE_SELL"     # User sells crypto
    TRADING_FEE = "TRADING_FEE"             # Fee on trade
    
    # Swaps
    SWAP_DEBIT = "SWAP_DEBIT"               # Currency out in swap
    SWAP_CREDIT = "SWAP_CREDIT"             # Currency in from swap
    SWAP_FEE = "SWAP_FEE"                   # Fee on swap
    
    # P2P
    P2P_ESCROW_LOCK = "P2P_ESCROW_LOCK"     # Funds locked in escrow
    P2P_ESCROW_RELEASE = "P2P_ESCROW_RELEASE"  # Funds released from escrow
    P2P_TRANSFER = "P2P_TRANSFER"           # P2P trade completion
    P2P_FEE = "P2P_FEE"                     # Fee on P2P trade
    
    # Instant Buy/Sell
    INSTANT_BUY = "INSTANT_BUY"             # Buy from admin liquidity
    INSTANT_SELL = "INSTANT_SELL"           # Sell to admin liquidity
    INSTANT_FEE = "INSTANT_FEE"             # Fee on instant trade
    INSTANT_SPREAD = "INSTANT_SPREAD"       # Spread profit on instant trade
    
    # Bots
    BOT_TRADE = "BOT_TRADE"                 # Automated trade by bot
    BOT_FEE = "BOT_FEE"                     # Fee on bot trade
    
    # Referrals
    REFERRAL_COMMISSION = "REFERRAL_COMMISSION"  # Commission paid to referrer
    
    # Admin/Platform
    ADMIN_LIQUIDITY_ADD = "ADMIN_LIQUIDITY_ADD"      # Admin adds liquidity
    ADMIN_LIQUIDITY_REMOVE = "ADMIN_LIQUIDITY_REMOVE"  # Admin removes liquidity
    ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT"    # Manual balance adjustment
    
    # Interest/Savings
    SAVINGS_DEPOSIT = "SAVINGS_DEPOSIT"     # Deposit to savings
    SAVINGS_WITHDRAW = "SAVINGS_WITHDRAW"   # Withdraw from savings
    INTEREST_EARNED = "INTEREST_EARNED"     # Interest payment


class AccountType(str, Enum):
    """Account types in the system"""
    USER = "USER"               # User wallet
    ADMIN = "ADMIN"             # Admin/platform wallet
    ESCROW = "ESCROW"           # Escrow holding
    FEE_POOL = "FEE_POOL"       # Fee collection
    LIQUIDITY = "LIQUIDITY"     # Liquidity pool
    EXTERNAL = "EXTERNAL"       # External (blockchain/bank)


# ═══════════════════════════════════════════════════════════════════════════════
# CANONICAL LEDGER
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LedgerEntry:
    """Single ledger entry - immutable record of money movement"""
    entry_id: str
    transaction_id: str           # Groups related entries
    timestamp: datetime
    
    # Entry type
    entry_type: str               # LedgerEntryType value
    
    # Account info (double-entry style)
    from_account_type: str        # AccountType value
    from_account_id: str          # User ID, "ADMIN", "ESCROW", etc.
    to_account_type: str
    to_account_id: str
    
    # Money movement
    currency: str                 # BTC, ETH, GBP, USDT, etc.
    amount: float                 # Always positive
    
    # Balance tracking
    from_balance_before: float
    from_balance_after: float
    to_balance_before: float
    to_balance_after: float
    
    # Revenue tracking
    is_revenue: bool = False      # True if this is platform revenue
    revenue_source: str = None    # "swap_fee", "p2p_fee", "bot_fee", etc.
    
    # Metadata
    description: str = ""
    metadata: Dict = None         # Additional context
    
    # Audit
    created_at: datetime = None
    checksum: str = None          # For integrity verification


class CanonicalLedger:
    """
    The single source of truth for all money movements.
    Every balance change MUST have a corresponding ledger entry.
    """
    
    def __init__(self, db=None):
        self.db = db
        self._collection_name = "canonical_ledger"
    
    async def record_entry(
        self,
        transaction_id: str,
        entry_type: LedgerEntryType,
        from_account_type: AccountType,
        from_account_id: str,
        to_account_type: AccountType,
        to_account_id: str,
        currency: str,
        amount: float,
        from_balance_before: float,
        from_balance_after: float,
        to_balance_before: float,
        to_balance_after: float,
        is_revenue: bool = False,
        revenue_source: str = None,
        description: str = "",
        metadata: Dict = None
    ) -> str:
        """
        Record a single ledger entry.
        Returns entry_id.
        """
        entry_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)
        
        entry = {
            "entry_id": entry_id,
            "transaction_id": transaction_id,
            "timestamp": timestamp,
            
            "entry_type": entry_type.value if isinstance(entry_type, LedgerEntryType) else entry_type,
            
            "from_account_type": from_account_type.value if isinstance(from_account_type, AccountType) else from_account_type,
            "from_account_id": from_account_id,
            "to_account_type": to_account_type.value if isinstance(to_account_type, AccountType) else to_account_type,
            "to_account_id": to_account_id,
            
            "currency": currency.upper(),
            "amount": float(amount),
            
            "from_balance_before": float(from_balance_before),
            "from_balance_after": float(from_balance_after),
            "to_balance_before": float(to_balance_before),
            "to_balance_after": float(to_balance_after),
            
            "is_revenue": is_revenue,
            "revenue_source": revenue_source,
            
            "description": description,
            "metadata": metadata or {},
            
            "created_at": timestamp,
        }
        
        # Calculate checksum for integrity
        import hashlib
        import json
        checksum_data = f"{entry_id}:{transaction_id}:{entry_type}:{amount}:{currency}:{from_account_id}:{to_account_id}"
        entry["checksum"] = hashlib.sha256(checksum_data.encode()).hexdigest()[:16]
        
        if self.db is not None:
            await self.db[self._collection_name].insert_one(entry)
        
        logger.info(f"[LEDGER] {entry_type}: {amount} {currency} from {from_account_id} to {to_account_id}")
        
        return entry_id
    
    async def record_deposit(
        self,
        user_id: str,
        currency: str,
        amount: float,
        source: str,
        balance_before: float,
        balance_after: float,
        transaction_id: str = None,
        metadata: Dict = None
    ) -> str:
        """Record a deposit from external source"""
        tx_id = transaction_id or str(uuid.uuid4())
        
        return await self.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.DEPOSIT,
            from_account_type=AccountType.EXTERNAL,
            from_account_id=f"EXTERNAL:{source}",
            to_account_type=AccountType.USER,
            to_account_id=user_id,
            currency=currency,
            amount=amount,
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=balance_before,
            to_balance_after=balance_after,
            description=f"Deposit from {source}",
            metadata=metadata
        )
    
    async def record_withdrawal(
        self,
        user_id: str,
        currency: str,
        amount: float,
        fee: float,
        destination: str,
        balance_before: float,
        balance_after: float,
        transaction_id: str = None,
        metadata: Dict = None
    ) -> Tuple[str, str]:
        """Record a withdrawal with fee"""
        tx_id = transaction_id or str(uuid.uuid4())
        
        # Main withdrawal
        entry1 = await self.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.WITHDRAWAL,
            from_account_type=AccountType.USER,
            from_account_id=user_id,
            to_account_type=AccountType.EXTERNAL,
            to_account_id=f"EXTERNAL:{destination}",
            currency=currency,
            amount=amount,
            from_balance_before=balance_before,
            from_balance_after=balance_after + fee,  # Before fee deduction
            to_balance_before=0,
            to_balance_after=0,
            description=f"Withdrawal to {destination}",
            metadata=metadata
        )
        
        # Fee entry (if any)
        entry2 = None
        if fee > 0:
            entry2 = await self.record_entry(
                transaction_id=tx_id,
                entry_type=LedgerEntryType.WITHDRAWAL_FEE,
                from_account_type=AccountType.USER,
                from_account_id=user_id,
                to_account_type=AccountType.FEE_POOL,
                to_account_id="ADMIN",
                currency=currency,
                amount=fee,
                from_balance_before=balance_after + fee,
                from_balance_after=balance_after,
                to_balance_before=0,  # Would be updated by actual balance
                to_balance_after=fee,
                is_revenue=True,
                revenue_source="withdrawal_fee",
                description="Withdrawal fee",
                metadata=metadata
            )
        
        return entry1, entry2
    
    async def record_swap(
        self,
        user_id: str,
        from_currency: str,
        to_currency: str,
        from_amount: float,
        to_amount: float,
        fee_amount: float,
        fee_currency: str,
        from_balance_before: float,
        from_balance_after: float,
        to_balance_before: float,
        to_balance_after: float,
        transaction_id: str = None,
        metadata: Dict = None
    ) -> Tuple[str, str, str]:
        """Record a swap transaction with fee"""
        tx_id = transaction_id or str(uuid.uuid4())
        
        # Debit (currency out)
        entry1 = await self.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.SWAP_DEBIT,
            from_account_type=AccountType.USER,
            from_account_id=user_id,
            to_account_type=AccountType.LIQUIDITY,
            to_account_id="ADMIN",
            currency=from_currency,
            amount=from_amount,
            from_balance_before=from_balance_before,
            from_balance_after=from_balance_after,
            to_balance_before=0,
            to_balance_after=0,
            description=f"Swap {from_currency} to {to_currency}",
            metadata=metadata
        )
        
        # Credit (currency in)
        entry2 = await self.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.SWAP_CREDIT,
            from_account_type=AccountType.LIQUIDITY,
            from_account_id="ADMIN",
            to_account_type=AccountType.USER,
            to_account_id=user_id,
            currency=to_currency,
            amount=to_amount,
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=to_balance_before,
            to_balance_after=to_balance_after,
            description=f"Swap {from_currency} to {to_currency}",
            metadata=metadata
        )
        
        # Fee entry
        entry3 = None
        if fee_amount > 0:
            entry3 = await self.record_entry(
                transaction_id=tx_id,
                entry_type=LedgerEntryType.SWAP_FEE,
                from_account_type=AccountType.USER,
                from_account_id=user_id,
                to_account_type=AccountType.FEE_POOL,
                to_account_id="ADMIN",
                currency=fee_currency,
                amount=fee_amount,
                from_balance_before=0,
                from_balance_after=0,
                to_balance_before=0,
                to_balance_after=0,
                is_revenue=True,
                revenue_source="swap_fee",
                description="Swap fee",
                metadata=metadata
            )
        
        return entry1, entry2, entry3
    
    async def record_trade_fee(
        self,
        user_id: str,
        currency: str,
        fee_amount: float,
        fee_type: str,  # "spot", "p2p", "bot", "instant"
        transaction_id: str = None,
        metadata: Dict = None
    ) -> str:
        """Record a trading fee"""
        tx_id = transaction_id or str(uuid.uuid4())
        
        entry_type_map = {
            "spot": LedgerEntryType.TRADING_FEE,
            "p2p": LedgerEntryType.P2P_FEE,
            "bot": LedgerEntryType.BOT_FEE,
            "instant": LedgerEntryType.INSTANT_FEE,
        }
        
        return await self.record_entry(
            transaction_id=tx_id,
            entry_type=entry_type_map.get(fee_type, LedgerEntryType.TRADING_FEE),
            from_account_type=AccountType.USER,
            from_account_id=user_id,
            to_account_type=AccountType.FEE_POOL,
            to_account_id="ADMIN",
            currency=currency,
            amount=fee_amount,
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=0,
            to_balance_after=0,
            is_revenue=True,
            revenue_source=f"{fee_type}_fee",
            description=f"{fee_type.capitalize()} trading fee",
            metadata=metadata
        )
    
    async def record_referral_commission(
        self,
        referrer_id: str,
        referred_user_id: str,
        currency: str,
        amount: float,
        fee_source: str,
        balance_before: float,
        balance_after: float,
        transaction_id: str = None,
        metadata: Dict = None
    ) -> str:
        """Record referral commission payment"""
        tx_id = transaction_id or str(uuid.uuid4())
        
        return await self.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.REFERRAL_COMMISSION,
            from_account_type=AccountType.FEE_POOL,
            from_account_id="ADMIN",
            to_account_type=AccountType.USER,
            to_account_id=referrer_id,
            currency=currency,
            amount=amount,
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=balance_before,
            to_balance_after=balance_after,
            description=f"Referral commission from {referred_user_id}",
            metadata={**(metadata or {}), "referred_user_id": referred_user_id, "fee_source": fee_source}
        )
    
    async def get_user_ledger(
        self,
        user_id: str,
        currency: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get all ledger entries for a user"""
        if not self.db:
            return []
        
        query = {
            "$or": [
                {"from_account_id": user_id},
                {"to_account_id": user_id}
            ]
        }
        
        if currency:
            query["currency"] = currency.upper()
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        entries = await self.db[self._collection_name].find(query).sort(
            "timestamp", -1
        ).limit(limit).to_list(limit)
        
        for e in entries:
            e.pop("_id", None)
        
        return entries
    
    async def get_revenue_ledger(
        self,
        revenue_source: str = None,
        currency: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Get all revenue entries"""
        if not self.db:
            return []
        
        query = {"is_revenue": True}
        
        if revenue_source:
            query["revenue_source"] = revenue_source
        if currency:
            query["currency"] = currency.upper()
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        entries = await self.db[self._collection_name].find(query).sort(
            "timestamp", -1
        ).limit(limit).to_list(limit)
        
        for e in entries:
            e.pop("_id", None)
        
        return entries


# Global instance
canonical_ledger = CanonicalLedger()


# ═══════════════════════════════════════════════════════════════════════════════
# RECONCILIATION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ReconciliationResult:
    """Result of a reconciliation check"""
    reconciled: bool
    period: str                   # "daily", "weekly", "monthly"
    start_date: datetime
    end_date: datetime
    
    # Totals
    total_inflows: Dict[str, float]   # currency -> amount
    total_outflows: Dict[str, float]
    total_fees: Dict[str, float]
    total_revenue: Dict[str, float]
    
    # By source
    revenue_by_source: Dict[str, Dict[str, float]]  # source -> currency -> amount
    
    # Mismatches
    mismatches: List[Dict]
    
    # Metadata
    generated_at: datetime = None
    report_id: str = None


class ReconciliationEngine:
    """
    Reconciliation engine that answers:
    "Where did every £1 come from and where did it go?"
    """
    
    # Revenue sources to track
    REVENUE_SOURCES = [
        "swap_fee",
        "trading_fee",
        "spot_fee",
        "p2p_fee",
        "bot_fee",
        "instant_fee",
        "withdrawal_fee",
        "instant_spread",
    ]
    
    def __init__(self, db=None):
        self.db = db
    
    async def run_daily_reconciliation(
        self,
        date: datetime = None
    ) -> ReconciliationResult:
        """
        Run daily reconciliation for a specific date.
        """
        if date is None:
            date = datetime.now(timezone.utc) - timedelta(days=1)
        
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        return await self._run_reconciliation(start, end, "daily")
    
    async def run_weekly_reconciliation(
        self,
        week_start: datetime = None
    ) -> ReconciliationResult:
        """
        Run weekly reconciliation.
        """
        if week_start is None:
            # Start of last week
            today = datetime.now(timezone.utc)
            week_start = today - timedelta(days=today.weekday() + 7)
        
        start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(weeks=1)
        
        return await self._run_reconciliation(start, end, "weekly")
    
    async def run_monthly_reconciliation(
        self,
        year: int = None,
        month: int = None
    ) -> ReconciliationResult:
        """
        Run monthly reconciliation.
        """
        if year is None or month is None:
            # Last month
            today = datetime.now(timezone.utc)
            first_of_month = today.replace(day=1)
            last_month = first_of_month - timedelta(days=1)
            year = last_month.year
            month = last_month.month
        
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        return await self._run_reconciliation(start, end, "monthly")
    
    async def _run_reconciliation(
        self,
        start: datetime,
        end: datetime,
        period: str
    ) -> ReconciliationResult:
        """
        Core reconciliation logic.
        """
        if not self.db:
            return ReconciliationResult(
                reconciled=False,
                period=period,
                start_date=start,
                end_date=end,
                total_inflows={},
                total_outflows={},
                total_fees={},
                total_revenue={},
                revenue_by_source={},
                mismatches=[{"error": "No database connection"}],
                generated_at=datetime.now(timezone.utc),
                report_id=str(uuid.uuid4())
            )
        
        mismatches = []
        
        # 1. Calculate totals from canonical ledger
        ledger_totals = await self._calculate_ledger_totals(start, end)
        
        # 2. Calculate totals from existing collections (for cross-check)
        existing_totals = await self._calculate_existing_totals(start, end)
        
        # 3. Calculate revenue by source
        revenue_by_source = await self._calculate_revenue_by_source(start, end)
        
        # 4. Compare and find mismatches
        for currency in set(list(ledger_totals["revenue"].keys()) + list(existing_totals["revenue"].keys())):
            ledger_rev = ledger_totals["revenue"].get(currency, 0)
            existing_rev = existing_totals["revenue"].get(currency, 0)
            
            if abs(ledger_rev - existing_rev) > 0.01:  # Tolerance of 0.01
                mismatches.append({
                    "type": "REVENUE_MISMATCH",
                    "currency": currency,
                    "ledger_amount": ledger_rev,
                    "existing_amount": existing_rev,
                    "difference": ledger_rev - existing_rev,
                    "severity": "high" if abs(ledger_rev - existing_rev) > 100 else "low"
                })
        
        # 5. Check inflows vs outflows balance
        for currency in set(list(ledger_totals["inflows"].keys()) + list(ledger_totals["outflows"].keys())):
            inflows = ledger_totals["inflows"].get(currency, 0)
            outflows = ledger_totals["outflows"].get(currency, 0)
            fees = ledger_totals["fees"].get(currency, 0)  # Fees stay in system
            
            # Net should be: inflows - outflows (fees are internal transfers)
            net = inflows - outflows
            if abs(net) > 1:  # More than 1 unit difference
                mismatches.append({
                    "type": "FLOW_IMBALANCE",
                    "currency": currency,
                    "inflows": inflows,
                    "outflows": outflows,
                    "fees": fees,
                    "net": net,
                    "severity": "medium"
                })
        
        # Generate report
        report_id = str(uuid.uuid4())
        result = ReconciliationResult(
            reconciled=len(mismatches) == 0,
            period=period,
            start_date=start,
            end_date=end,
            total_inflows=ledger_totals["inflows"],
            total_outflows=ledger_totals["outflows"],
            total_fees=ledger_totals["fees"],
            total_revenue=ledger_totals["revenue"],
            revenue_by_source=revenue_by_source,
            mismatches=mismatches,
            generated_at=datetime.now(timezone.utc),
            report_id=report_id
        )
        
        # Save report
        await self._save_report(result)
        
        # Alert on mismatches
        if mismatches:
            await self._alert_mismatches(result)
        
        return result
    
    async def _calculate_ledger_totals(
        self,
        start: datetime,
        end: datetime
    ) -> Dict:
        """
        Calculate totals from canonical ledger.
        """
        inflows = {}   # Deposits, external in
        outflows = {}  # Withdrawals, external out
        fees = {}      # All fees collected
        revenue = {}   # All revenue
        
        # Check if canonical ledger has data
        ledger_count = await self.db.canonical_ledger.count_documents({
            "timestamp": {"$gte": start, "$lt": end}
        })
        
        if ledger_count > 0:
            # Aggregate from canonical ledger
            pipeline = [
                {"$match": {"timestamp": {"$gte": start, "$lt": end}}},
                {"$group": {
                    "_id": {"entry_type": "$entry_type", "currency": "$currency"},
                    "total": {"$sum": "$amount"}
                }}
            ]
            
            results = await self.db.canonical_ledger.aggregate(pipeline).to_list(100)
            
            for r in results:
                entry_type = r["_id"]["entry_type"]
                currency = r["_id"]["currency"]
                amount = r["total"]
                
                if entry_type == "DEPOSIT":
                    inflows[currency] = inflows.get(currency, 0) + amount
                elif entry_type == "WITHDRAWAL":
                    outflows[currency] = outflows.get(currency, 0) + amount
                elif "FEE" in entry_type:
                    fees[currency] = fees.get(currency, 0) + amount
            
            # Get revenue totals
            rev_pipeline = [
                {"$match": {"timestamp": {"$gte": start, "$lt": end}, "is_revenue": True}},
                {"$group": {
                    "_id": "$currency",
                    "total": {"$sum": "$amount"}
                }}
            ]
            
            rev_results = await self.db.canonical_ledger.aggregate(rev_pipeline).to_list(20)
            for r in rev_results:
                revenue[r["_id"]] = r["total"]
        
        return {
            "inflows": inflows,
            "outflows": outflows,
            "fees": fees,
            "revenue": revenue
        }
    
    async def _calculate_existing_totals(
        self,
        start: datetime,
        end: datetime
    ) -> Dict:
        """
        Calculate totals from existing collections (admin_revenue, etc.).
        For cross-checking with canonical ledger.
        """
        revenue = {}
        
        # Get from admin_revenue collection
        try:
            pipeline = [
                {"$match": {"created_at": {"$gte": start, "$lt": end}}},
                {"$group": {
                    "_id": "$currency",
                    "total": {"$sum": "$amount"}
                }}
            ]
            
            results = await self.db.admin_revenue.aggregate(pipeline).to_list(20)
            for r in results:
                currency = r["_id"] or "GBP"  # Default to GBP
                revenue[currency] = r["total"]
        except Exception as e:
            logger.warning(f"Error getting admin_revenue: {e}")
        
        # Also check fee_transactions
        try:
            pipeline = [
                {"$match": {"timestamp": {"$gte": start, "$lt": end}}},
                {"$group": {
                    "_id": "$currency",
                    "total": {"$sum": "$amount"}
                }}
            ]
            
            results = await self.db.fee_transactions.aggregate(pipeline).to_list(20)
            for r in results:
                currency = r["_id"] or "GBP"
                revenue[currency] = revenue.get(currency, 0) + r["total"]
        except Exception as e:
            logger.warning(f"Error getting fee_transactions: {e}")
        
        return {
            "revenue": revenue,
            "inflows": {},
            "outflows": {},
            "fees": {}
        }
    
    async def _calculate_revenue_by_source(
        self,
        start: datetime,
        end: datetime
    ) -> Dict[str, Dict[str, float]]:
        """
        Break down revenue by source.
        """
        revenue_by_source = {}
        
        # From canonical ledger
        try:
            pipeline = [
                {"$match": {
                    "timestamp": {"$gte": start, "$lt": end},
                    "is_revenue": True
                }},
                {"$group": {
                    "_id": {"source": "$revenue_source", "currency": "$currency"},
                    "total": {"$sum": "$amount"}
                }}
            ]
            
            results = await self.db.canonical_ledger.aggregate(pipeline).to_list(100)
            
            for r in results:
                source = r["_id"]["source"] or "unknown"
                currency = r["_id"]["currency"]
                amount = r["total"]
                
                if source not in revenue_by_source:
                    revenue_by_source[source] = {}
                revenue_by_source[source][currency] = amount
        except Exception as e:
            logger.warning(f"Error calculating revenue by source: {e}")
        
        # Also get from admin_revenue for comparison
        try:
            pipeline = [
                {"$match": {"created_at": {"$gte": start, "$lt": end}}},
                {"$group": {
                    "_id": {"source": "$source", "currency": "$currency"},
                    "total": {"$sum": "$amount"}
                }}
            ]
            
            results = await self.db.admin_revenue.aggregate(pipeline).to_list(100)
            
            for r in results:
                source = r["_id"].get("source") or "existing_revenue"
                currency = r["_id"].get("currency") or "GBP"
                amount = r["total"]
                
                # Add to tracking if not in ledger
                source_key = f"existing:{source}"
                if source_key not in revenue_by_source:
                    revenue_by_source[source_key] = {}
                revenue_by_source[source_key][currency] = amount
        except Exception as e:
            logger.warning(f"Error getting existing revenue by source: {e}")
        
        return revenue_by_source
    
    async def _save_report(
        self,
        result: ReconciliationResult
    ):
        """Save reconciliation report to database."""
        try:
            await self.db.reconciliation_reports.insert_one({
                "report_id": result.report_id,
                "period": result.period,
                "start_date": result.start_date,
                "end_date": result.end_date,
                "reconciled": result.reconciled,
                "total_inflows": result.total_inflows,
                "total_outflows": result.total_outflows,
                "total_fees": result.total_fees,
                "total_revenue": result.total_revenue,
                "revenue_by_source": result.revenue_by_source,
                "mismatches": result.mismatches,
                "mismatch_count": len(result.mismatches),
                "generated_at": result.generated_at
            })
            logger.info(f"[RECONCILIATION] Report saved: {result.report_id}")
        except Exception as e:
            logger.error(f"Error saving reconciliation report: {e}")
    
    async def _alert_mismatches(
        self,
        result: ReconciliationResult
    ):
        """Alert on reconciliation mismatches."""
        for mismatch in result.mismatches:
            severity = mismatch.get("severity", "medium")
            
            await self.db.reconciliation_alerts.insert_one({
                "alert_id": str(uuid.uuid4()),
                "report_id": result.report_id,
                "period": result.period,
                "mismatch_type": mismatch.get("type"),
                "currency": mismatch.get("currency"),
                "details": mismatch,
                "severity": severity,
                "acknowledged": False,
                "created_at": datetime.now(timezone.utc)
            })
            
            logger.warning(f"[RECONCILIATION ALERT] {mismatch.get('type')}: {mismatch}")
    
    async def reconcile_user(
        self,
        user_id: str
    ) -> Dict:
        """
        Reconcile a single user's balance against ledger.
        """
        if not self.db:
            return {"error": "No database connection"}
        
        # Get user's current wallet balances
        wallets = await self.db.wallets.find({"user_id": user_id}).to_list(100)
        
        # Get user's ledger entries
        ledger_entries = await self.db.canonical_ledger.find({
            "$or": [
                {"from_account_id": user_id},
                {"to_account_id": user_id}
            ]
        }).to_list(10000)
        
        # Calculate expected balances from ledger
        expected_balances = {}
        for entry in ledger_entries:
            currency = entry["currency"]
            amount = entry["amount"]
            
            if currency not in expected_balances:
                expected_balances[currency] = 0
            
            if entry["to_account_id"] == user_id:
                expected_balances[currency] += amount
            if entry["from_account_id"] == user_id:
                expected_balances[currency] -= amount
        
        # Compare with actual balances
        mismatches = []
        for wallet in wallets:
            currency = wallet.get("currency")
            actual = wallet.get("balance", 0)
            expected = expected_balances.get(currency, 0)
            
            if abs(actual - expected) > 0.000001:
                mismatches.append({
                    "currency": currency,
                    "actual_balance": actual,
                    "expected_from_ledger": expected,
                    "difference": actual - expected
                })
        
        return {
            "user_id": user_id,
            "reconciled": len(mismatches) == 0,
            "wallet_count": len(wallets),
            "ledger_entry_count": len(ledger_entries),
            "expected_balances": expected_balances,
            "mismatches": mismatches
        }
    
    async def get_reports(
        self,
        period: str = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get reconciliation reports."""
        if not self.db:
            return []
        
        query = {}
        if period:
            query["period"] = period
        
        reports = await self.db.reconciliation_reports.find(query).sort(
            "generated_at", -1
        ).limit(limit).to_list(limit)
        
        for r in reports:
            r.pop("_id", None)
        
        return reports
    
    async def get_alerts(
        self,
        acknowledged: bool = None,
        severity: str = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get reconciliation alerts."""
        if not self.db:
            return []
        
        query = {}
        if acknowledged is not None:
            query["acknowledged"] = acknowledged
        if severity:
            query["severity"] = severity
        
        alerts = await self.db.reconciliation_alerts.find(query).sort(
            "created_at", -1
        ).limit(limit).to_list(limit)
        
        for a in alerts:
            a.pop("_id", None)
        
        return alerts


# Global instance
reconciliation_engine = ReconciliationEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY DATA IMPORTER
# ═══════════════════════════════════════════════════════════════════════════════

class LegacyDataImporter:
    """
    Import existing transaction data into canonical ledger.
    Run once to backfill historical data.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.ledger = CanonicalLedger(db)
    
    async def import_all(self) -> Dict:
        """Import all legacy data into canonical ledger."""
        if not self.db:
            return {"error": "No database connection"}
        
        results = {
            "admin_revenue": 0,
            "fee_transactions": 0,
            "swap_history": 0,
            "wallet_transactions": 0,
            "errors": []
        }
        
        # Import admin_revenue
        try:
            revenues = await self.db.admin_revenue.find({}).to_list(10000)
            for rev in revenues:
                await self._import_admin_revenue(rev)
                results["admin_revenue"] += 1
        except Exception as e:
            results["errors"].append(f"admin_revenue: {e}")
        
        # Import fee_transactions
        try:
            fees = await self.db.fee_transactions.find({}).to_list(10000)
            for fee in fees:
                await self._import_fee_transaction(fee)
                results["fee_transactions"] += 1
        except Exception as e:
            results["errors"].append(f"fee_transactions: {e}")
        
        # Import swap_history
        try:
            swaps = await self.db.swap_history.find({}).to_list(10000)
            for swap in swaps:
                await self._import_swap(swap)
                results["swap_history"] += 1
        except Exception as e:
            results["errors"].append(f"swap_history: {e}")
        
        # Import wallet_transactions
        try:
            txs = await self.db.wallet_transactions.find({}).to_list(10000)
            for tx in txs:
                await self._import_wallet_transaction(tx)
                results["wallet_transactions"] += 1
        except Exception as e:
            results["errors"].append(f"wallet_transactions: {e}")
        
        logger.info(f"[LEDGER] Legacy import complete: {results}")
        return results
    
    async def _import_admin_revenue(self, rev: Dict):
        """Import an admin_revenue entry."""
        await self.ledger.record_entry(
            transaction_id=rev.get("transaction_id") or rev.get("revenue_id") or str(uuid.uuid4()),
            entry_type=self._map_revenue_type(rev.get("revenue_type") or rev.get("source")),
            from_account_type=AccountType.USER,
            from_account_id=rev.get("user_id", "UNKNOWN"),
            to_account_type=AccountType.FEE_POOL,
            to_account_id="ADMIN",
            currency=rev.get("currency", "GBP"),
            amount=rev.get("amount", 0),
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=0,
            to_balance_after=0,
            is_revenue=True,
            revenue_source=rev.get("source") or rev.get("revenue_type", "unknown"),
            description=f"Legacy import: {rev.get('description', '')}",
            metadata={"legacy_id": str(rev.get("_id", "")), "original": rev}
        )
    
    async def _import_fee_transaction(self, fee: Dict):
        """Import a fee_transaction entry."""
        await self.ledger.record_entry(
            transaction_id=fee.get("transaction_id") or str(uuid.uuid4()),
            entry_type=LedgerEntryType.TRADING_FEE,
            from_account_type=AccountType.USER,
            from_account_id=fee.get("user_id", "UNKNOWN"),
            to_account_type=AccountType.FEE_POOL,
            to_account_id="ADMIN",
            currency=fee.get("currency", "GBP"),
            amount=fee.get("amount", 0),
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=0,
            to_balance_after=0,
            is_revenue=True,
            revenue_source=fee.get("fee_type", "trading_fee"),
            description=f"Legacy fee: {fee.get('type', '')}",
            metadata={"legacy_id": str(fee.get("_id", ""))}
        )
    
    async def _import_swap(self, swap: Dict):
        """Import a swap_history entry."""
        tx_id = swap.get("swap_id") or str(uuid.uuid4())
        user_id = swap.get("user_id", "UNKNOWN")
        
        # Import the swap itself
        await self.ledger.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.SWAP_DEBIT,
            from_account_type=AccountType.USER,
            from_account_id=user_id,
            to_account_type=AccountType.LIQUIDITY,
            to_account_id="ADMIN",
            currency=swap.get("from_currency", "BTC"),
            amount=swap.get("from_amount", 0),
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=0,
            to_balance_after=0,
            description=f"Legacy swap: {swap.get('from_currency')} -> {swap.get('to_currency')}",
            metadata={"legacy_id": str(swap.get("_id", ""))}
        )
        
        await self.ledger.record_entry(
            transaction_id=tx_id,
            entry_type=LedgerEntryType.SWAP_CREDIT,
            from_account_type=AccountType.LIQUIDITY,
            from_account_id="ADMIN",
            to_account_type=AccountType.USER,
            to_account_id=user_id,
            currency=swap.get("to_currency", "ETH"),
            amount=swap.get("to_amount", 0),
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=0,
            to_balance_after=0,
            description=f"Legacy swap: {swap.get('from_currency')} -> {swap.get('to_currency')}",
            metadata={"legacy_id": str(swap.get("_id", ""))}
        )
    
    async def _import_wallet_transaction(self, tx: Dict):
        """Import a wallet_transaction entry."""
        tx_type = tx.get("type", "").upper()
        
        if tx_type == "DEPOSIT":
            entry_type = LedgerEntryType.DEPOSIT
            from_type = AccountType.EXTERNAL
            from_id = "EXTERNAL"
            to_type = AccountType.USER
            to_id = tx.get("user_id", "UNKNOWN")
        elif tx_type == "WITHDRAWAL":
            entry_type = LedgerEntryType.WITHDRAWAL
            from_type = AccountType.USER
            from_id = tx.get("user_id", "UNKNOWN")
            to_type = AccountType.EXTERNAL
            to_id = "EXTERNAL"
        else:
            return  # Skip unknown types
        
        await self.ledger.record_entry(
            transaction_id=tx.get("transaction_id") or str(uuid.uuid4()),
            entry_type=entry_type,
            from_account_type=from_type,
            from_account_id=from_id,
            to_account_type=to_type,
            to_account_id=to_id,
            currency=tx.get("currency", "GBP"),
            amount=tx.get("amount", 0),
            from_balance_before=0,
            from_balance_after=0,
            to_balance_before=0,
            to_balance_after=0,
            description=f"Legacy {tx_type}",
            metadata={"legacy_id": str(tx.get("_id", ""))}
        )
    
    def _map_revenue_type(self, rev_type: str) -> LedgerEntryType:
        """Map legacy revenue type to ledger entry type."""
        mapping = {
            "SPREAD_PROFIT": LedgerEntryType.INSTANT_SPREAD,
            "FEE_REVENUE": LedgerEntryType.TRADING_FEE,
            "SWAP_FEE": LedgerEntryType.SWAP_FEE,
            "P2P_FEE": LedgerEntryType.P2P_FEE,
            "BOT_FEE": LedgerEntryType.BOT_FEE,
            "WITHDRAWAL_FEE": LedgerEntryType.WITHDRAWAL_FEE,
        }
        return mapping.get(rev_type, LedgerEntryType.TRADING_FEE)


# Global instance
legacy_importer = LegacyDataImporter()


# ═══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION & EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

async def init_ledger_services(db):
    """Initialize ledger and reconciliation services with database."""
    canonical_ledger.db = db
    reconciliation_engine.db = db
    legacy_importer.db = db
    legacy_importer.ledger.db = db
    
    # Ensure indexes
    await db.canonical_ledger.create_index([("timestamp", -1)])
    await db.canonical_ledger.create_index([("transaction_id", 1)])
    await db.canonical_ledger.create_index([("from_account_id", 1)])
    await db.canonical_ledger.create_index([("to_account_id", 1)])
    await db.canonical_ledger.create_index([("entry_type", 1)])
    await db.canonical_ledger.create_index([("is_revenue", 1), ("timestamp", -1)])
    await db.canonical_ledger.create_index([("currency", 1), ("timestamp", -1)])
    
    await db.reconciliation_reports.create_index([("generated_at", -1)])
    await db.reconciliation_reports.create_index([("period", 1), ("generated_at", -1)])
    await db.reconciliation_alerts.create_index([("created_at", -1)])
    await db.reconciliation_alerts.create_index([("acknowledged", 1), ("severity", 1)])
    
    logger.info("✅ Ledger & Reconciliation services initialized")


__all__ = [
    # Types
    "LedgerEntryType",
    "AccountType",
    "LedgerEntry",
    "ReconciliationResult",
    
    # Ledger
    "CanonicalLedger",
    "canonical_ledger",
    
    # Reconciliation
    "ReconciliationEngine",
    "reconciliation_engine",
    
    # Import
    "LegacyDataImporter",
    "legacy_importer",
    
    # Init
    "init_ledger_services",
]
