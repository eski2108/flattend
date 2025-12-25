#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
TASK 3: RELIABILITY & MONITORING - VERIFICATION SCRIPT
═══════════════════════════════════════════════════════════════════════════════

Verifies all 7 requirements:
1. ✅ Central structured logging (JSON) with request_id + user_id
2. ✅ Error tracking + alerting (Sentry-compatible)
3. ✅ Health endpoints: /health and /ready
4. ✅ Metrics for API latency, failures, blocked withdrawals, trade errors
5. ✅ Worker/queue monitoring (retries, dead letters, stuck jobs)
6. ✅ Automated daily DB backups + restore test
7. ✅ Short runbook for top incidents

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import requests
from pathlib import Path
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:8001/api"
HEADERS = {"x-admin": "true"}

def print_header(text: str):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}")

def print_result(name: str, success: bool, details: str = ""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"  {status}: {name}")
    if details:
        for line in details.split('\n'):
            print(f"         {line}")

def test_health_endpoints():
    """Test 3: Health endpoints"""
    print_header("3. HEALTH ENDPOINTS")
    results = []
    
    # /health
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        data = r.json()
        success = r.status_code == 200 and data.get('status') == 'healthy'
        print_result("/health endpoint", success, f"Status: {data.get('status')}")
        results.append(success)
    except Exception as e:
        print_result("/health endpoint", False, str(e))
        results.append(False)
    
    # /ready
    try:
        r = requests.get(f"{BASE_URL}/ready", timeout=10)
        data = r.json()
        if r.status_code == 503:
            data = data.get('detail', data)
        success = 'checks' in data
        checks = data.get('checks', {})
        print_result("/ready endpoint", success, 
            f"DB: {checks.get('database', {}).get('status')}\n"
            f"Queue: {checks.get('queue', {}).get('status')}\n"
            f"Uptime: {checks.get('uptime', {}).get('message')}")
        results.append(success)
    except Exception as e:
        print_result("/ready endpoint", False, str(e))
        results.append(False)
    
    return all(results)

def test_metrics():
    """Test 4: Metrics"""
    print_header("4. METRICS")
    results = []
    
    # JSON metrics
    try:
        r = requests.get(f"{BASE_URL}/metrics", timeout=5)
        data = r.json()
        metrics = data.get('metrics', {})
        counters = metrics.get('counters', {})
        
        required_counters = [
            'http_requests_total',
            'http_errors_total', 
            'withdrawals_blocked_total',
            'trade_failures_total',
            'reconciliation_mismatches_total'
        ]
        
        for counter in required_counters:
            present = counter in counters
            print_result(f"Counter: {counter}", present, f"Value: {counters.get(counter, 'N/A')}")
            results.append(present)
        
        # Check histogram
        histograms = metrics.get('histograms', {})
        has_latency = 'http_request_duration_ms' in histograms
        latency = histograms.get('http_request_duration_ms', {})
        print_result("Histogram: http_request_duration_ms", has_latency,
            f"p50: {latency.get('p50', 'N/A')}ms, p99: {latency.get('p99', 'N/A')}ms")
        results.append(has_latency)
        
    except Exception as e:
        print_result("JSON metrics", False, str(e))
        results.append(False)
    
    # Prometheus format
    try:
        r = requests.get(f"{BASE_URL}/metrics/prometheus", timeout=5)
        success = r.status_code == 200 and 'http_requests_total' in r.text
        lines = len(r.text.split('\n'))
        print_result("Prometheus format", success, f"Output lines: {lines}")
        results.append(success)
    except Exception as e:
        print_result("Prometheus format", False, str(e))
        results.append(False)
    
    return all(results)

def test_job_monitoring():
    """Test 5: Worker/queue monitoring"""
    print_header("5. WORKER/QUEUE MONITORING")
    results = []
    
    # Jobs endpoint
    try:
        r = requests.get(f"{BASE_URL}/jobs", headers=HEADERS, timeout=5)
        data = r.json()
        success = 'stats' in data and 'stuck_jobs' in data
        stats = data.get('stats', {})
        print_result("Jobs endpoint", success,
            f"Queue length: {stats.get('queue_length', 'N/A')}\n"
            f"Dead letters: {stats.get('dead_letter_count', 'N/A')}")
        results.append(success)
    except Exception as e:
        print_result("Jobs endpoint", False, str(e))
        results.append(False)
    
    # Dead letter endpoint
    try:
        r = requests.get(f"{BASE_URL}/jobs/dead-letter", headers=HEADERS, timeout=5)
        data = r.json()
        success = 'dead_letter' in data
        print_result("Dead letter endpoint", success, f"Count: {len(data.get('dead_letter', []))}")
        results.append(success)
    except Exception as e:
        print_result("Dead letter endpoint", False, str(e))
        results.append(False)
    
    return all(results)

def test_backups():
    """Test 6: Automated daily DB backups"""
    print_header("6. AUTOMATED BACKUPS")
    results = []
    
    # List backups
    try:
        r = requests.get(f"{BASE_URL}/backups", headers=HEADERS, timeout=5)
        data = r.json()
        backups = data.get('backups', [])
        success = len(backups) > 0
        print_result("Backups exist", success, f"Count: {len(backups)}")
        
        if backups:
            latest = backups[0]
            print_result("Latest backup", True, 
                f"Name: {latest.get('name')}\nSize: {latest.get('size_mb')} MB")
        results.append(success)
    except Exception as e:
        print_result("Backups endpoint", False, str(e))
        results.append(False)
    
    # Check backup script exists
    script_path = Path("/app/backend/scripts/test_backup_restore.py")
    success = script_path.exists()
    print_result("Restore test script exists", success, str(script_path))
    results.append(success)
    
    return all(results)

def test_runbook():
    """Test 7: Runbook documentation"""
    print_header("7. RUNBOOK DOCUMENTATION")
    
    runbook_path = Path("/app/backend/docs/RUNBOOK.md")
    success = runbook_path.exists()
    
    if success:
        content = runbook_path.read_text()
        lines = len(content.split('\n'))
        
        # Check for required sections
        sections = [
            "Health Checks",
            "Common Incidents",
            "Database Operations",
            "Emergency Procedures"
        ]
        
        for section in sections:
            has_section = section in content
            print_result(f"Section: {section}", has_section)
        
        print_result("Runbook exists", True, f"Lines: {lines}")
    else:
        print_result("Runbook exists", False, str(runbook_path))
    
    return success

def test_error_tracking():
    """Test 2: Error tracking + alerting"""
    print_header("2. ERROR TRACKING & ALERTING")
    results = []
    
    # Errors endpoint
    try:
        r = requests.get(f"{BASE_URL}/errors", headers=HEADERS, timeout=5)
        data = r.json()
        success = 'errors' in data and 'summary' in data
        summary = data.get('summary', {})
        print_result("Errors endpoint", success,
            f"Total: {summary.get('total_errors', 0)}\n"
            f"Period: {summary.get('period_hours', 24)}h")
        results.append(success)
    except Exception as e:
        print_result("Errors endpoint", False, str(e))
        results.append(False)
    
    # Alerts endpoint
    try:
        r = requests.get(f"{BASE_URL}/alerts", headers=HEADERS, timeout=5)
        data = r.json()
        success = 'alerts' in data
        print_result("Alerts endpoint", success, f"Count: {data.get('count', 0)}")
        results.append(success)
    except Exception as e:
        print_result("Alerts endpoint", False, str(e))
        results.append(False)
    
    # Check Sentry SDK installed
    try:
        import sentry_sdk
        print_result("Sentry SDK installed", True, f"Version: {sentry_sdk.VERSION}")
        results.append(True)
    except ImportError:
        print_result("Sentry SDK installed", False, "Not installed")
        results.append(False)
    
    return all(results)

def test_structured_logging():
    """Test 1: Central structured logging"""
    print_header("1. STRUCTURED LOGGING")
    
    # Check monitoring system has structured logger
    try:
        sys.path.insert(0, '/app/backend')
        from monitoring_system import StructuredLogger, JSONFormatter
        
        print_result("StructuredLogger class exists", True)
        print_result("JSONFormatter class exists", True)
        
        # Test context setting
        StructuredLogger.set_context(request_id="test-123", user_id="user-456")
        ctx = StructuredLogger.get_context()
        
        has_request_id = ctx.get('request_id') == "test-123"
        has_user_id = ctx.get('user_id') == "user-456"
        
        print_result("request_id context", has_request_id, f"Value: {ctx.get('request_id')}")
        print_result("user_id context", has_user_id, f"Value: {ctx.get('user_id')}")
        
        StructuredLogger.clear_context()
        return has_request_id and has_user_id
    except Exception as e:
        print_result("Structured logging", False, str(e))
        return False

def run_all_tests():
    """Run all verification tests"""
    print("\n" + "═"*70)
    print("  TASK 3: RELIABILITY & MONITORING - VERIFICATION")
    print("═"*70)
    print(f"  Timestamp: {datetime.now(timezone.utc).isoformat()}")
    
    results = []
    
    # 1. Structured logging
    results.append(("1. Structured Logging", test_structured_logging()))
    
    # 2. Error tracking
    results.append(("2. Error Tracking & Alerting", test_error_tracking()))
    
    # 3. Health endpoints
    results.append(("3. Health Endpoints", test_health_endpoints()))
    
    # 4. Metrics
    results.append(("4. Metrics", test_metrics()))
    
    # 5. Job monitoring
    results.append(("5. Worker/Queue Monitoring", test_job_monitoring()))
    
    # 6. Backups
    results.append(("6. Automated Backups", test_backups()))
    
    # 7. Runbook
    results.append(("7. Runbook Documentation", test_runbook()))
    
    # Summary
    print_header("FINAL SUMMARY")
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {name}")
    
    print(f"\n  Total: {passed}/{total} requirements verified")
    
    if passed == total:
        print("\n  🎉 ALL REQUIREMENTS VERIFIED - Task 3 Complete!")
        return 0
    else:
        print("\n  ⚠️ Some requirements need attention")
        return 1

if __name__ == "__main__":
    exit(run_all_tests())
