"""
══════════════════════════════════════════════════════════════════════
Monitoring API Routes
══════════════════════════════════════════════════════════════════════

API endpoints for monitoring, metrics, health checks.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Query, Response
from fastapi.responses import PlainTextResponse

from monitoring_system import (
    health_checker,
    error_tracker,
    metrics,
    job_monitor,
    structured_logger,
)
from backup_system import backup_system

logger = logging.getLogger(__name__)

monitoring_router = APIRouter(tags=["Monitoring"])


# ══════════════════════════════════════════════════════════════════════
# HEALTH CHECKS
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/health")
async def basic_health_check():
    """
    Basic health check - fast, always returns quickly.
    Used by load balancers and uptime monitors.
    """
    return await health_checker.basic_health()


@monitoring_router.get("/ready")
async def readiness_check():
    """
    Readiness check - verifies all dependencies.
    Returns detailed status of DB, Redis, queue.
    """
    result = await health_checker.ready_check()
    
    # Return 503 if unhealthy
    if result["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=result)
    
    return result


@monitoring_router.get("/health/detailed")
async def detailed_health_check(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Detailed health check with all component status (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    ready = await health_checker.ready_check()
    
    # Add error summary
    ready["errors"] = error_tracker.get_error_summary(hours=24)
    
    # Add job stats
    ready["jobs"] = job_monitor.get_queue_stats()
    
    return ready


# ══════════════════════════════════════════════════════════════════════
# METRICS
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/metrics")
async def get_metrics():
    """
    Get all metrics in JSON format.
    """
    return {
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics.get_all_metrics()
    }


@monitoring_router.get("/metrics/prometheus")
async def get_prometheus_metrics():
    """
    Get metrics in Prometheus format.
    """
    prometheus_output = metrics.export_prometheus()
    return PlainTextResponse(content=prometheus_output, media_type="text/plain")


# ══════════════════════════════════════════════════════════════════════
# ERRORS
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/errors")
async def get_recent_errors(
    limit: int = Query(100, le=500),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get recent errors (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    return {
        "success": True,
        "errors": error_tracker.get_recent_errors(limit),
        "summary": error_tracker.get_error_summary(hours=24)
    }


# ══════════════════════════════════════════════════════════════════════
# JOBS
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/jobs")
async def get_job_stats(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get job/worker statistics (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    stats = job_monitor.get_queue_stats()
    stuck = job_monitor.check_stuck_jobs()
    
    return {
        "success": True,
        "stats": stats,
        "stuck_jobs": [{
            "job_id": j.job_id,
            "job_type": j.job_type,
            "started_at": j.started_at.isoformat() if j.started_at else None
        } for j in stuck]
    }


@monitoring_router.get("/jobs/dead-letter")
async def get_dead_letter_jobs(
    limit: int = Query(100, le=500),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get dead letter jobs (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    return {
        "success": True,
        "dead_letter": job_monitor.get_dead_letter(limit)
    }


# ══════════════════════════════════════════════════════════════════════
# BACKUPS
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/backups")
async def list_backups(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    List available backups (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    return {
        "success": True,
        "backups": backup_system.list_backups()
    }


@monitoring_router.post("/backups/create")
async def create_backup(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Create a new backup (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    result = backup_system.create_backup()
    
    return {
        "success": result.get("status") == "success",
        "backup": result
    }


# ══════════════════════════════════════════════════════════════════════
# ALERTS
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/alerts")
async def get_alerts(
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get monitoring alerts (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if error_tracker.db is None:
        return {"success": True, "alerts": []}
    
    query = {}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    
    alerts = await error_tracker.db.monitoring_alerts.find(query).sort(
        "timestamp", -1
    ).limit(limit).to_list(limit)
    
    for a in alerts:
        a.pop("_id", None)
    
    return {
        "success": True,
        "alerts": alerts,
        "count": len(alerts)
    }


@monitoring_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Acknowledge a monitoring alert (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    if error_tracker.db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    result = await error_tracker.db.monitoring_alerts.update_one(
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
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════

@monitoring_router.get("/dashboard")
async def get_monitoring_dashboard(
    x_user_id: str = Header(None),
    x_admin: str = Header(None)
):
    """
    Get complete monitoring dashboard data (admin only).
    """
    if not x_admin and not x_user_id:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    # Health
    health = await health_checker.ready_check()
    
    # Metrics
    all_metrics = metrics.get_all_metrics()
    
    # Errors
    error_summary = error_tracker.get_error_summary(hours=24)
    
    # Jobs
    job_stats = job_monitor.get_queue_stats()
    stuck_jobs = job_monitor.check_stuck_jobs()
    
    # Backups
    backups = backup_system.list_backups()
    
    # Alerts (unacknowledged)
    unacked_alerts = 0
    if error_tracker.db is not None:
        unacked_alerts = await error_tracker.db.monitoring_alerts.count_documents(
            {"acknowledged": False}
        )
    
    return {
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "health": health,
        "metrics": {
            "http_requests_total": all_metrics["counters"].get("http_requests_total", 0),
            "http_errors_total": all_metrics["counters"].get("http_errors_total", 0),
            "failed_logins_total": all_metrics["counters"].get("failed_logins_total", 0),
            "withdrawals_blocked_total": all_metrics["counters"].get("withdrawals_blocked_total", 0),
            "trade_failures_total": all_metrics["counters"].get("trade_failures_total", 0),
            "api_latency": all_metrics["histograms"].get("http_request_duration_ms", {})
        },
        "errors": error_summary,
        "jobs": {
            **job_stats,
            "stuck_count": len(stuck_jobs)
        },
        "backups": {
            "count": len(backups),
            "latest": backups[0] if backups else None
        },
        "alerts": {
            "unacknowledged_count": unacked_alerts
        }
    }
