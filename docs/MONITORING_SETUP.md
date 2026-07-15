# Monitoring & Observability Setup Guide

**Version:** 1.0  
**Last Updated:** 2026-07-15  
**Audience:** Operations, DevOps, Support Team

This guide covers monitoring infrastructure, health check endpoints, and performance tracking for EURO AI.

---

## 1. Health Check Endpoints

### Overall System Health

**Endpoint:** `GET /api/health`

Returns basic system configuration status.

```bash
curl https://yourapp.com/api/health
```

**Response (200 OK — healthy):**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2026-07-15T18:30:00Z",
  "uptime_s": 3600,
  "checks": {
    "supabase_url": true,
    "supabase_anon": true,
    "supabase_service": true
  }
}
```

**Response (503 — degraded):**
```json
{
  "ok": false,
  "status": "degraded",
  "timestamp": "2026-07-15T18:30:00Z",
  "uptime_s": 3600,
  "checks": {
    "supabase_url": false,
    "supabase_anon": true,
    "supabase_service": true
  }
}
```

**Alert Threshold:** Returns 503 when any required environment variable is missing.

---

### Blocking Conditions (Security & Rate Limits)

**Endpoint:** `GET /api/blocking-conditions`

Checks for active security issues, rate limiting, and blocking conditions.

```bash
curl https://yourapp.com/api/blocking-conditions
```

**Response (200 — no blockers):**
```json
{
  "ok": true,
  "severity": "green",
  "blockers": [],
  "timestamp": "2026-07-15T18:30:00Z"
}
```

**Response (200 — blockers present):**
```json
{
  "ok": true,
  "severity": "high",
  "blockers": [
    {
      "type": "HIGH",
      "title": "Unusual Authentication Attempts",
      "description": "15 failed login attempts in last 15 minutes",
      "metric": 15,
      "threshold": 5,
      "recommendation": "Check audit logs for malicious activity",
      "estimatedImpact": "Users may be rate-limited if legitimate"
    }
  ],
  "timestamp": "2026-07-15T18:30:00Z"
}
```

**Monitored Conditions:**
- Failed authentication attempts (threshold: 5+ per 15 minutes)
- API rate limit violations (threshold: 60+ per minute)
- Upload rate limit violations (threshold: 10+ per hour)
- Recent workflow failures (GitHub Actions)

**Alert Threshold:** Severity = "high" or "critical" indicates action required.

---

### Production Health (Latency & Error Rates)

**Endpoint:** `GET /api/production-health`

Tracks API latency, error rates, and database connectivity.

```bash
curl https://yourapp.com/api/production-health
```

**Response:**
```json
{
  "ok": true,
  "latency": {
    "avg_ms": 145,
    "p95_ms": 523,
    "p99_ms": 1204,
    "sample_size": 8420
  },
  "error_rate": 0.12,
  "database": {
    "status": "connected",
    "latency_ms": 18,
    "row_count": 247518
  },
  "timestamp": "2026-07-15T18:30:00Z"
}
```

**Alert Thresholds:**
| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Avg Latency | <200ms | 200-500ms | >500ms |
| P95 Latency | <500ms | 500-1000ms | >1000ms |
| Error Rate | <0.5% | 0.5-2% | >2% |
| DB Latency | <30ms | 30-100ms | >100ms |

---

### Request Performance Logs

**Endpoint:** `GET /api/request-logs`

Tracks individual request performance for debugging and capacity planning.

**List recent requests:**
```bash
curl "https://yourapp.com/api/request-logs?type=logs&limit=50"
```

**Get performance statistics:**
```bash
curl "https://yourapp.com/api/request-logs?type=stats"
```

**Response:**
```json
{
  "ok": true,
  "stats": {
    "totalRequests": 12547,
    "avgLatencyMs": 142,
    "p95LatencyMs": 521,
    "errorRate": 0.08,
    "requestsByPath": {
      "/api/search": 4521,
      "/api/history": 3844,
      "/api/audit-logs": 2156,
      "/api/evidence": 1026
    },
    "requestsByStatus": {
      "200": 12451,
      "400": 12,
      "401": 56,
      "500": 28
    }
  }
}
```

**Find slow requests:**
```bash
curl "https://yourapp.com/api/request-logs?type=slow&minLatencyMs=1000"
```

---

## 2. Audit Logs & Security Events

### View Audit Logs

**Endpoint:** `GET /api/audit-logs`

Access complete audit trail for compliance and security investigation.

**List recent audit logs:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=logs&limit=100"
```

**Filter by action:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=logs&action=auth.login&limit=50"
```

**Filter by severity:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=logs&severity=critical"
```

**Get audit summary (last 30 days):**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=summary&days=30"
```

**Response:**
```json
{
  "ok": true,
  "summary": {
    "total_events": 8542,
    "success_count": 8501,
    "failure_count": 41,
    "critical_count": 3,
    "last_event_at": "2026-07-15T18:30:00Z"
  }
}
```

**View critical events only:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=critical&limit=50"
```

**Audit Actions Tracked:**
- `auth.signup`, `auth.login`, `auth.logout`, `auth.password_reset`
- `workspace.create`, `workspace.delete`
- `member.invite`, `member.remove`
- `company.create`, `company.update`
- `ai_system.create`, `ai_system.delete`
- `assessment.create`, `assessment.update`, `assessment.finalize`
- `obligation.create`, `obligation.update`, `obligation.assign`, `obligation.complete`
- `evidence.upload`, `evidence.delete`
- `report.generate`

---

## 3. Monitoring Strategy

### Real-Time Monitoring (Every 5 Minutes)

Monitor these endpoints in production:

```bash
#!/bin/bash
# Production monitoring script

APP_URL="https://yourapp.com"
TOKEN="your-bearer-token"

# 1. Check overall health
HEALTH=$(curl -s $APP_URL/api/health)
if ! echo $HEALTH | jq -e '.ok == true' > /dev/null; then
  echo "ALERT: System health check failed"
  echo $HEALTH | jq '.'
fi

# 2. Check for blocking conditions
BLOCKERS=$(curl -s $APP_URL/api/blocking-conditions)
if ! echo $BLOCKERS | jq -e '.blockers | length == 0' > /dev/null; then
  echo "ALERT: Blocking conditions detected"
  echo $BLOCKERS | jq '.blockers[] | {type: .type, title: .title}'
fi

# 3. Check production health
PROD_HEALTH=$(curl -s $APP_URL/api/production-health)
P95=$(echo $PROD_HEALTH | jq '.latency.p95_ms')
if [ "$P95" -gt 1000 ]; then
  echo "ALERT: P95 latency exceeds threshold: ${P95}ms"
fi

# 4. Check for critical events
CRITICAL=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$APP_URL/api/audit-logs?type=critical&limit=1")
if echo $CRITICAL | jq -e '.events | length > 0' > /dev/null; then
  echo "ALERT: Critical security events detected"
  echo $CRITICAL | jq '.events[0]'
fi
```

### Deployment Verification

**Endpoint:** `GET /api/verify-deployment`

Confirms all services are correctly deployed and configured.

```bash
curl https://yourapp.com/api/verify-deployment
```

Expected response: All checks pass after deployment.

---

## 4. Performance Tracking

### Latency Baselines

Expected latency ranges (p95):
- **GET /api/health**: <50ms
- **GET /api/audit-logs**: 100-300ms (depends on filter)
- **POST /api/search**: 2000-5000ms (external Firecrawl API)
- **GET /api/history**: 200-500ms

### Common Performance Issues

**Issue: P95 latency > 1 second**
1. Check `/api/production-health` for database latency
2. Query Supabase slow query logs
3. Look for missing indexes (see OPERATIONAL_RUNBOOKS.md section 2)
4. Check request volume — may need optimization or scaling

**Issue: Error rate > 1%**
1. Check `/api/blocking-conditions` for rate limiting
2. Review audit logs for `status: 'failure'`
3. Check Vercel deployment logs
4. Investigate application errors in console logs

**Issue: Slow request logs appearing frequently**
```bash
# Find requests slower than 2 seconds
curl "https://yourapp.com/api/request-logs?type=slow&minLatencyMs=2000"
```

---

## 5. Integration with Monitoring Tools

### Prometheus Integration

Request metrics can be exported to Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'euro-ai'
    static_configs:
      - targets: ['yourapp.com']
    metrics_path: '/api/request-logs?type=stats'
```

### Grafana Dashboard

Create dashboards from:
- `/api/production-health` — latency percentiles, error rates
- `/api/request-logs?type=stats` — request volume by endpoint, error breakdown
- `/api/audit-logs?type=summary` — event counts, failure rates

### Slack Alerts

Script to post health checks to Slack:

```bash
#!/bin/bash
# monitor-and-alert.sh

APP_URL="https://yourapp.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/..."

HEALTH=$(curl -s $APP_URL/api/health)
P_HEALTH=$(curl -s $APP_URL/api/production-health)
P95=$(echo $P_HEALTH | jq '.latency.p95_ms')

MESSAGE="{\"text\": \"System Health: $(echo $HEALTH | jq -r '.status') | P95 Latency: ${P95}ms\"}"

curl -X POST -H 'Content-type: application/json' \
  --data "$MESSAGE" \
  $SLACK_WEBHOOK
```

---

## 6. Daily Operations Checklist

**Start of Day:**
- [ ] Run health check: `curl /api/health`
- [ ] Verify no blocking conditions: `curl /api/blocking-conditions`
- [ ] Check overnight error logs
- [ ] Review any critical audit events

**During Day (Every 2 Hours):**
- [ ] Monitor latency via `/api/production-health`
- [ ] Check error rate (should be <0.5%)
- [ ] Review slow request logs if P95 > 500ms
- [ ] Watch for repeated error patterns

**End of Day:**
- [ ] Run deployment verification: `curl /api/verify-deployment`
- [ ] Confirm backup completion (check Supabase console)
- [ ] Review audit summary for the day
- [ ] Document any incidents (see OPERATIONAL_RUNBOOKS.md)

---

## 7. Alerting Rules

### Critical Alerts (Page On-Call)

- Health check returns status != "healthy"
- Blocking conditions severity = "critical"
- P95 latency > 5000ms (sustained >5 minutes)
- Error rate > 5% (sustained >5 minutes)
- Database unreachable or latency > 500ms
- Critical audit events detected

### Warning Alerts (Email/Slack)

- P95 latency 1000-5000ms
- Error rate 1-5%
- Blocking conditions severity = "high"
- Multiple failed auth attempts
- API rate limit violations

### Info Alerts (Logging Only)

- P95 latency 500-1000ms
- Slow individual requests (>2 seconds)
- Normal rate limit activity
- Routine audit events

---

## 8. Monitoring Best Practices

### High Availability Monitoring

1. **Geographic redundancy**: Monitor from multiple regions
2. **Synthetic monitoring**: Run periodic health checks from external service
3. **Dependency monitoring**: Track Supabase, Vercel, and external APIs
4. **Correlation**: Link latency spikes to deployment events, data loads

### Privacy & Security

- Don't log sensitive data (passwords, tokens, personal info)
- Access audit logs only with proper authorization
- Retain logs per DATA_RETENTION_POLICY.md
- Archive old logs after 2 years per compliance requirements

### Capacity Planning

Use request-logs metrics for:
- Identify peak usage times
- Forecast when scaling needed
- Optimize hot paths
- Load test before major events

---

## Quick Reference

| Endpoint | Purpose | Frequency | Alert On |
|----------|---------|-----------|----------|
| `/api/health` | Basic config check | Every 5 min | status != healthy |
| `/api/blocking-conditions` | Security & rate limits | Every 5 min | severity > green |
| `/api/production-health` | Latency & error rates | Every 5 min | P95 > 1000ms or error > 1% |
| `/api/request-logs?type=stats` | Performance aggregates | Every 30 min | Trends, capacity |
| `/api/audit-logs?type=summary` | Event summary | Daily | Failure spikes, security events |
| `/api/verify-deployment` | Post-deployment check | After each deploy | Any check fails |

---

**Last Review:** 2026-07-15  
**Next Review Due:** 2026-08-15  
**Owner:** Operations & DevOps
