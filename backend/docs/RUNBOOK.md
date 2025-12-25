# CoinHubX Operations Runbook

> **Last Updated**: August 2025  
> **Version**: 1.0  
> **Owner**: Platform Team

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Health Checks](#health-checks)
3. [Common Incidents](#common-incidents)
4. [Monitoring Alerts](#monitoring-alerts)
5. [Database Operations](#database-operations)
6. [Emergency Procedures](#emergency-procedures)

---

## Quick Reference

### Key Endpoints

| Endpoint | Purpose |
|----------|----------|
| `/api/health` | Basic liveness probe |
| `/api/ready` | Readiness check (DB, Redis, Queue) |
| `/api/metrics` | JSON metrics |
| `/api/metrics/prometheus` | Prometheus format |
| `/api/dashboard` | Admin monitoring dashboard |

### Service Commands

```bash
# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart all

# View logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/backend.out.log

# Check service status
sudo supervisorctl status
```

### Key Metrics to Watch

| Metric | Warning | Critical |
|--------|---------|----------|
| `http_errors_total` | > 10/5min | > 50/5min |
| `http_request_duration_ms_p99` | > 2000ms | > 5000ms |
| `withdrawals_blocked_total` | > 5/hour | > 20/hour |
| `jobs_dead_letter_total` | > 1 | > 5 |
| `jobs_queue_length` | > 50 | > 100 |

---

## Health Checks

### Liveness Check (`/api/health`)

**Purpose**: Confirms the application is running.  
**Response Time**: < 100ms  
**Failure Action**: Restart pod/container

```bash
curl -s https://your-domain.com/api/health | jq
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "coinhubx-backend",
  "timestamp": "2025-08-01T12:00:00Z",
  "version": "1.0.0"
}
```

### Readiness Check (`/api/ready`)

**Purpose**: Confirms all dependencies are available.  
**Response Time**: < 1000ms  
**Failure Action**: Remove from load balancer

```bash
curl -s https://your-domain.com/api/ready | jq
```

**Checked Dependencies**:
- MongoDB connection
- Redis connection (if configured)
- Background job queue
- Service uptime

---

## Common Incidents

### Incident 1: High API Latency

**Symptoms**:
- `http_request_duration_ms_p99` > 2000ms
- Slow page loads
- User complaints

**Diagnosis**:
```bash
# Check database latency
curl -s https://your-domain.com/api/ready | jq '.checks.database.latency_ms'

# Check slow queries in logs
grep "Slow request" /var/log/supervisor/backend.err.log
```

**Resolution**:
1. Check MongoDB connection pool (`/api/ready`)
2. Review recent deployments
3. Check for missing indexes
4. Scale horizontally if needed

---

### Incident 2: Database Connection Failure

**Symptoms**:
- `/api/ready` returns 503
- `database.status: "unhealthy"`
- No new transactions processing

**Diagnosis**:
```bash
# Check MongoDB status
mongosh $MONGO_URL --eval "db.adminCommand('ping')"

# Check connection count
mongosh $MONGO_URL --eval "db.serverStatus().connections"
```

**Resolution**:
1. Verify MONGO_URL in environment
2. Check MongoDB Atlas status (if cloud)
3. Restart backend service
4. Check network/firewall rules

---

### Incident 3: Blocked Withdrawals Spike

**Symptoms**:
- `withdrawals_blocked_total` increasing
- User complaints about failed withdrawals
- Alert: "Withdrawal velocity limit exceeded"

**Diagnosis**:
```bash
# Check velocity limits
curl -s https://your-domain.com/api/errors | jq '.errors[] | select(.tags.type == "WITHDRAWAL")'
```

**Resolution**:
1. Check if legitimate traffic or attack
2. Review velocity limit thresholds
3. If attack: Block suspicious IPs via WAF
4. If legitimate: Temporarily increase limits for verified users

---

### Incident 4: Dead Letter Jobs

**Symptoms**:
- `jobs_dead_letter_total` > 0
- Failed background operations
- Alert: "DEAD_LETTER_JOB"

**Diagnosis**:
```bash
# List dead letter jobs
curl -s https://your-domain.com/api/jobs/dead-letter | jq
```

**Resolution**:
1. Review job errors in dead letter queue
2. Fix underlying issue (API key expired, external service down)
3. Manually retry failed jobs if safe
4. Add to known issues if recurring

---

### Incident 5: Ledger Reconciliation Mismatch

**Symptoms**:
- `reconciliation_mismatches_total` > 0
- Reconciliation report shows discrepancies

**Diagnosis**:
```bash
# Run reconciliation
curl -s https://your-domain.com/api/reconciliation/run -X POST | jq

# View last report
curl -s https://your-domain.com/api/reconciliation/reports?limit=1 | jq
```

**Resolution**:
1. Identify affected users/transactions
2. Check for failed transactions not rolled back
3. Run legacy import if old data missing
4. Manual adjustment with admin audit log
5. Escalate to finance team if significant

---

### Incident 6: High Error Rate

**Symptoms**:
- `http_errors_total` spiking
- Multiple 500 errors in logs
- Sentry alerts firing

**Diagnosis**:
```bash
# Recent errors
curl -s https://your-domain.com/api/errors?limit=50 | jq

# Error summary
curl -s https://your-domain.com/api/errors | jq '.summary'
```

**Resolution**:
1. Check Sentry for stack traces
2. Review recent deployments
3. Check external dependencies (APIs, DB)
4. Rollback if deployment-related

---

## Monitoring Alerts

### Alert: ERROR_THRESHOLD

**Trigger**: 10+ errors in 5 minutes  
**Severity**: High  
**Action**: Investigate error logs, check Sentry

### Alert: DEAD_LETTER_JOB

**Trigger**: Job exhausted all retries  
**Severity**: Medium  
**Action**: Review job, fix issue, manually retry if needed

### Alert: WITHDRAWAL_BLOCKED

**Trigger**: Withdrawal velocity limit exceeded  
**Severity**: Medium  
**Action**: Verify if legitimate, adjust limits if needed

### Alert: RECONCILIATION_MISMATCH

**Trigger**: Ledger doesn't match wallet balances  
**Severity**: Critical  
**Action**: Stop trading, investigate immediately

---

## Database Operations

### Manual Backup

```bash
# Via API
curl -X POST https://your-domain.com/api/backups/create \
  -H "x-admin: true" | jq

# Via script
cd /app/backend && python3 scripts/test_backup_restore.py
```

### List Backups

```bash
curl -s https://your-domain.com/api/backups -H "x-admin: true" | jq
```

### Restore (DANGER)

⚠️ **WARNING**: This will overwrite current data!

```bash
# Only in emergency, with approval
mongorestore --uri $MONGO_URL --db $DB_NAME --drop /app/backups/backup_YYYYMMDD_HHMMSS/$DB_NAME
```

---

## Emergency Procedures

### Kill Switch: Disable Trading

```bash
# Disable all trading via feature flags
curl -X POST https://your-domain.com/api/feature-flags/trading/disable \
  -H "x-admin: true"
```

### Kill Switch: Disable Withdrawals

```bash
# Disable withdrawals
curl -X POST https://your-domain.com/api/feature-flags/withdrawals/disable \
  -H "x-admin: true"
```

### Full Platform Lockdown

1. Set maintenance mode in feature flags
2. Notify users via Telegram/Email
3. Stop background workers
4. Investigate issue
5. Restore when safe

---

## Contact

| Role | Contact |
|------|----------|
| On-Call Engineer | [internal slack/pager] |
| Database Admin | [internal] |
| Security Team | [internal] |

---

*This runbook is a living document. Update after each incident.*
