"""
══════════════════════════════════════════════════════════════════════
Reconciliation API Routes
══════════════════════════════════════════════════════════════════════

Read-only API endpoints for reconciliation reports.
No balance modifications, only viewing and exports.
"""

import logging
import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Query, Response
from pydantic import BaseModel

from ledger_system import (
    canonical_ledger,
    reconciliation_engine,
    legacy_importer,
    LedgerEntryType,
)

logger = logging.getLogger(__name__)

reconciliation_router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])


# ══════════════════════════════════════════════════════════════════════
# RECONCILIATION REPORTS
# ══════════════════════════════════════════════════════════════════════

@reconciliation_router.get("/reports")
async def get_reconciliation_reports(
    period: Optional[str] = Query(None, description="daily, weekly, monthly"),
    limit: int = Query(50, le=500),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get list of reconciliation reports (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    reports = await reconciliation_engine.get_reports(period=period, limit=limit)
    
    return {
        "success": True,
        "reports": reports,
        "count": len(reports)
    }


@reconciliation_router.get("/reports/{report_id}")
async def get_reconciliation_report(
    report_id: str,
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get a specific reconciliation report (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if not reconciliation_engine.db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    report = await reconciliation_engine.db.reconciliation_reports.find_one(
        {"report_id": report_id}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.pop("_id", None)
    
    return {
        "success": True,
        "report": report
    }


@reconciliation_router.post("/run/daily")
async def run_daily_reconciliation(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to yesterday"),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Run daily reconciliation (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    target_date = None
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    result = await reconciliation_engine.run_daily_reconciliation(target_date)
    
    return {
        "success": True,
        "reconciled": result.reconciled,
        "report_id": result.report_id,
        "period": result.period,
        "start_date": result.start_date.isoformat(),
        "end_date": result.end_date.isoformat(),
        "total_inflows": result.total_inflows,
        "total_outflows": result.total_outflows,
        "total_fees": result.total_fees,
        "total_revenue": result.total_revenue,
        "revenue_by_source": result.revenue_by_source,
        "mismatch_count": len(result.mismatches),
        "mismatches": result.mismatches
    }


@reconciliation_router.post("/run/monthly")
async def run_monthly_reconciliation(
    year: int = Query(None),
    month: int = Query(None, ge=1, le=12),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Run monthly reconciliation (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    result = await reconciliation_engine.run_monthly_reconciliation(year, month)
    
    return {
        "success": True,
        "reconciled": result.reconciled,
        "report_id": result.report_id,
        "period": result.period,
        "start_date": result.start_date.isoformat(),
        "end_date": result.end_date.isoformat(),
        "total_inflows": result.total_inflows,
        "total_outflows": result.total_outflows,
        "total_fees": result.total_fees,
        "total_revenue": result.total_revenue,
        "revenue_by_source": result.revenue_by_source,
        "mismatch_count": len(result.mismatches),
        "mismatches": result.mismatches
    }


@reconciliation_router.get("/user/{user_id}")
async def reconcile_user(
    user_id: str,
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Reconcile a single user's balances against ledger (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    result = await reconciliation_engine.reconcile_user(user_id)
    
    return {
        "success": True,
        **result
    }


# ══════════════════════════════════════════════════════════════════════
# ALERTS
# ══════════════════════════════════════════════════════════════════════

@reconciliation_router.get("/alerts")
async def get_reconciliation_alerts(
    acknowledged: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None, description="low, medium, high"),
    limit: int = Query(100, le=500),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get reconciliation alerts (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    alerts = await reconciliation_engine.get_alerts(
        acknowledged=acknowledged,
        severity=severity,
        limit=limit
    )
    
    return {
        "success": True,
        "alerts": alerts,
        "count": len(alerts)
    }


@reconciliation_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Acknowledge a reconciliation alert (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if not reconciliation_engine.db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    result = await reconciliation_engine.db.reconciliation_alerts.update_one(
        {"alert_id": alert_id},
        {
            "$set": {
                "acknowledged": True,
                "acknowledged_at": datetime.now(timezone.utc),
                "acknowledged_by": x_user_id or x_admin
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"success": True, "message": "Alert acknowledged"}


# ══════════════════════════════════════════════════════════════════════
# LEDGER ENTRIES
# ══════════════════════════════════════════════════════════════════════

@reconciliation_router.get("/ledger/user/{user_id}")
async def get_user_ledger(
    user_id: str,
    currency: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get ledger entries for a user (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    entries = await canonical_ledger.get_user_ledger(
        user_id=user_id,
        currency=currency,
        limit=limit
    )
    
    return {
        "success": True,
        "entries": entries,
        "count": len(entries)
    }


@reconciliation_router.get("/ledger/revenue")
async def get_revenue_ledger(
    revenue_source: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    limit: int = Query(1000, le=5000),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get all revenue entries from ledger (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    entries = await canonical_ledger.get_revenue_ledger(
        revenue_source=revenue_source,
        currency=currency,
        limit=limit
    )
    
    return {
        "success": True,
        "entries": entries,
        "count": len(entries)
    }


# ══════════════════════════════════════════════════════════════════════
# CSV EXPORT
# ══════════════════════════════════════════════════════════════════════

@reconciliation_router.get("/export/report/{report_id}")
async def export_report_csv(
    report_id: str,
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Export reconciliation report as CSV (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if not reconciliation_engine.db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    report = await reconciliation_engine.db.reconciliation_reports.find_one(
        {"report_id": report_id}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["CoinHubX Reconciliation Report"])
    writer.writerow(["Report ID", report_id])
    writer.writerow(["Period", report.get("period")])
    writer.writerow(["Start Date", report.get("start_date")])
    writer.writerow(["End Date", report.get("end_date")])
    writer.writerow(["Generated At", report.get("generated_at")])
    writer.writerow(["Reconciled", "✓ YES" if report.get("reconciled") else "✗ NO"])
    writer.writerow([])
    
    # Inflows
    writer.writerow(["INFLOWS"])
    writer.writerow(["Currency", "Amount"])
    for currency, amount in (report.get("total_inflows") or {}).items():
        writer.writerow([currency, f"{amount:.8f}"])
    writer.writerow([])
    
    # Outflows
    writer.writerow(["OUTFLOWS"])
    writer.writerow(["Currency", "Amount"])
    for currency, amount in (report.get("total_outflows") or {}).items():
        writer.writerow([currency, f"{amount:.8f}"])
    writer.writerow([])
    
    # Revenue
    writer.writerow(["TOTAL REVENUE"])
    writer.writerow(["Currency", "Amount"])
    for currency, amount in (report.get("total_revenue") or {}).items():
        writer.writerow([currency, f"{amount:.8f}"])
    writer.writerow([])
    
    # Revenue by Source
    writer.writerow(["REVENUE BY SOURCE"])
    writer.writerow(["Source", "Currency", "Amount"])
    for source, currencies in (report.get("revenue_by_source") or {}).items():
        for currency, amount in currencies.items():
            writer.writerow([source, currency, f"{amount:.8f}"])
    writer.writerow([])
    
    # Mismatches
    if report.get("mismatches"):
        writer.writerow(["MISMATCHES"])
        writer.writerow(["Type", "Currency", "Details", "Severity"])
        for m in report.get("mismatches", []):
            writer.writerow([
                m.get("type"),
                m.get("currency"),
                str(m),
                m.get("severity")
            ])
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=reconciliation_{report_id}.csv"
        }
    )


@reconciliation_router.get("/export/ledger")
async def export_ledger_csv(
    user_id: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    limit: int = Query(10000, le=50000),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Export ledger entries as CSV (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if not canonical_ledger.db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Build query
    query = {}
    if user_id:
        query["$or"] = [
            {"from_account_id": user_id},
            {"to_account_id": user_id}
        ]
    if currency:
        query["currency"] = currency.upper()
    
    entries = await canonical_ledger.db.canonical_ledger.find(query).sort(
        "timestamp", -1
    ).limit(limit).to_list(limit)
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Entry ID", "Transaction ID", "Timestamp",
        "Type", "From Account", "To Account",
        "Currency", "Amount",
        "Is Revenue", "Revenue Source",
        "Description"
    ])
    
    for e in entries:
        writer.writerow([
            e.get("entry_id"),
            e.get("transaction_id"),
            e.get("timestamp"),
            e.get("entry_type"),
            f"{e.get('from_account_type')}:{e.get('from_account_id')}",
            f"{e.get('to_account_type')}:{e.get('to_account_id')}",
            e.get("currency"),
            e.get("amount"),
            e.get("is_revenue"),
            e.get("revenue_source"),
            e.get("description")
        ])
    
    csv_content = output.getvalue()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=ledger_export_{timestamp}.csv"
        }
    )


# ══════════════════════════════════════════════════════════════════════
# SUMMARY STATS
# ══════════════════════════════════════════════════════════════════════

@reconciliation_router.get("/summary")
async def get_reconciliation_summary(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get summary of reconciliation status (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if not reconciliation_engine.db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get latest reports
    latest_daily = await reconciliation_engine.db.reconciliation_reports.find_one(
        {"period": "daily"},
        sort=[("generated_at", -1)]
    )
    
    latest_monthly = await reconciliation_engine.db.reconciliation_reports.find_one(
        {"period": "monthly"},
        sort=[("generated_at", -1)]
    )
    
    # Get unacknowledged alerts
    alert_count = await reconciliation_engine.db.reconciliation_alerts.count_documents(
        {"acknowledged": False}
    )
    
    # Get ledger stats
    ledger_count = await reconciliation_engine.db.canonical_ledger.count_documents({})
    
    # Get revenue totals from ledger
    revenue_pipeline = [
        {"$match": {"is_revenue": True}},
        {"$group": {
            "_id": "$currency",
            "total": {"$sum": "$amount"}
        }}
    ]
    revenue_results = await reconciliation_engine.db.canonical_ledger.aggregate(
        revenue_pipeline
    ).to_list(20)
    
    total_revenue = {r["_id"]: r["total"] for r in revenue_results}
    
    return {
        "success": True,
        "ledger_entry_count": ledger_count,
        "unacknowledged_alerts": alert_count,
        "total_revenue_from_ledger": total_revenue,
        "latest_daily_report": {
            "report_id": latest_daily.get("report_id") if latest_daily else None,
            "reconciled": latest_daily.get("reconciled") if latest_daily else None,
            "generated_at": latest_daily.get("generated_at") if latest_daily else None,
            "mismatch_count": latest_daily.get("mismatch_count") if latest_daily else None
        } if latest_daily else None,
        "latest_monthly_report": {
            "report_id": latest_monthly.get("report_id") if latest_monthly else None,
            "reconciled": latest_monthly.get("reconciled") if latest_monthly else None,
            "generated_at": latest_monthly.get("generated_at") if latest_monthly else None,
            "mismatch_count": latest_monthly.get("mismatch_count") if latest_monthly else None
        } if latest_monthly else None
    }


# ══════════════════════════════════════════════════════════════════════
# LEGACY IMPORT (ONE-TIME)
# ══════════════════════════════════════════════════════════════════════

@reconciliation_router.post("/import-legacy")
async def import_legacy_data(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Import legacy transaction data into canonical ledger (admin only, one-time).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    result = await legacy_importer.import_all()
    
    return {
        "success": True,
        "imported": result,
        "message": "Legacy data imported to canonical ledger"
    }
