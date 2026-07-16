# Observability Architecture

## Overview

EURO AI implements a comprehensive 5-layer observability system for production health monitoring, incident detection, and autonomous response. The system continuously monitors production every 60 seconds and responds to issues autonomously based on severity.

**Autonomy Impact:** ~99% of technical issues are resolved without Founder intervention. Only CRITICAL incidents (component down, error rate >5%) escalate.

---

## 5-Layer Monitoring Architecture

### Layer 1: API Health Monitoring

**Endpoint:** `GET /api/health/detailed`

Monitors 6 critical system components:

- `database` — Supabase connection pool, query performance
- `supabase_auth` — Auth service availability and responsiveness
- `session_store` — Cookie-based session storage
- `rls_policies` — Row Level Security policy compliance (43 active policies)
- `database_triggers` — Auth triggers and automation
- `stored_functions` — SQL functions availability

**Response Format:**

```json
{
  "status": "healthy|degraded|down",
  "timestamp": "ISO8601",
  "totalResponseTime": 125,
  "checks": [
    {
      "status": "healthy|degraded|down",
      "component": "database",
      "details": { "connection": "pooler", "status": "connected" },
      "responseTime": 25
    }
  ],
  "summary": {
    "total": 6,
    "healthy": 6,
    "degraded": 0,
    "down": 0
  }
}
```

**HTTP Status Mapping:**

- `200` — All healthy OR some degraded (system operational)
- `503` — Any component down (system unavailable)

---

### Layer 2: Error Tracking

**Endpoint:** `GET /api/errors`

Tracks error rate and incident patterns.

**Metrics:**

- `totalErrors` — Error count in time window
- `errorRate` — Percentage (totalErrors / totalRequests × 100)
- `trend` — `stable`, `increasing`, or `decreasing`
- `topError` — Most frequent error signature and count

**Severity Thresholds:**

- `CRITICAL` — Error rate > 5%
- `WARNING` — Error rate 2-5%
- `HEALTHY` — Error rate ≤ 2%

**Query Parameters:**

- `last_hours` — Time window (1, 6, 24, 7d supported)

---

### Layer 3: Customer Journey Monitoring

**Endpoint:** `GET /api/metrics/journey`

Analyzes customer conversion funnel and detects friction points.

**7-Stage Funnel:**

1. `signup_page_view` — User visits signup
2. `form_submitted` — User submits form
3. `email_sent` — Verification email sent
4. `email_verified` — User verifies email
5. `profile_created` — User completes profile
6. `workspace_created` — User creates workspace
7. `first_ai_system_added` — User adds first AI system

**Friction Detection:**

- Dropoff > 10% → Friction point detected
- Severity: `critical` (>25%), `high` (15-25%), `medium` (10-15%), `low` (10%)

**Response Includes:**

- Funnel stages with success rates and timing
- Dropoff metrics and largest drop identification
- Conversion rate analysis
- Automated optimization recommendations

---

### Layer 4: Database Performance Monitoring

**Endpoint:** `GET /api/metrics/database`

Tracks query performance, connection pool health, and RLS compliance.

**Metrics:**

- **Slow Queries** — Execution time > threshold (default 1000ms)
- **Latency Percentiles** — p50, p95, p99 response times
- **Connection Pool** — Active/max utilization, status (healthy/warning/critical)
- **Cache Hit Rate** — Target >85% (healthy)
- **RLS Audit** — Policy compliance status (compliant/warning/violation)

**Query Parameters:**

- `period` — Time window (24h, 7d, 30d)
- `threshold` — Slow query threshold in milliseconds

**Performance Issues Auto-Detected:**

- Slow queries (severity: high)
- Connection pool exhaustion (severity: high→critical at >95%)
- RLS violations (severity: critical)
- Cache hit rate degradation (severity: medium)

**HTTP Status:**

- `200` — Healthy or warning severity
- `503` — Critical severity issues detected

---

### Layer 5: Deployment Health

**Potential Endpoint:** `GET /api/metrics/deployment` (Phase 3+)

Monitors build status, test results, and deployment health.

---

## Autonomous Monitoring Loop

**Component:** `lib/observability/monitoring-loop.ts`

Runs continuously with 60-second interval checks.

### Operation Flow

```
[60s Interval] → [Perform Check] → [Store History] → [Analyze] → [Respond]
```

### Check Execution

1. **Health Check** — Call /api/health/detailed
2. **Error Check** — Call /api/errors
3. **History Storage** — Append result to 60-check window (1 hour)
4. **Incident Detection** — Classify severity based on thresholds
5. **Autonomous Response** — Route based on severity
6. **Trend Analysis** — Detect patterns across recent checks

### Incident Severity Classification

**CRITICAL** (Escalate immediately)

- Any component down (health.summary.down > 0)
- Error rate > 5%

**HIGH** (Auto-investigate)

- Error rate 2-5%
- Action: Auto-investigation task created, root cause analysis triggered

**MEDIUM** (Auto-log)

- Component degraded (health.summary.degraded > 0)
- Action: Log for trend analysis, flag if persistent

**INFO** (Log only)

- Baseline monitoring
- Action: Log for trend analysis

### Autonomous Response Workflows

| Severity | Response                        | Escalation      |
| -------- | ------------------------------- | --------------- |
| CRITICAL | Escalate to Founder immediately | SMS/Email alert |
| HIGH     | Auto-investigate + create task  | No escalation   |
| MEDIUM   | Auto-log + trend track          | No escalation   |
| INFO     | Log for trends                  | No escalation   |

### Trend Detection

Automatically detects:

- **Increasing error rate** — 3 consecutive checks with rising rates
- **Intermittent failures** — Component alternating between down/up states
- **Sustained degradation** — Consistent elevated error rates

---

## Initialization

**File:** `lib/init-monitoring.ts`

Monitoring loop starts automatically on application initialization.

```typescript
// app/layout.tsx - Automatic startup
import { initializeMonitoring } from '@/lib/init-monitoring';

initializeMonitoring().catch((error) => {
  console.error('[Governor] Monitoring initialization error:', error);
});
```

**Idempotent:** Safe to call multiple times; only initializes once.

**Manual Trigger:** `GET /api/init` endpoint also available.

---

## Data Storage & History

- **History Window:** Last 60 checks (1 hour at 60-second intervals)
- **Storage:** In-memory during runtime (resets on deployment)
- **Production:** Could be extended to persist to Supabase

**Summary API:** `getSummary()`

```json
{
  "totalChecks": 45,
  "incidents": 3,
  "lastIncidentTime": "2026-07-16T12:30:00Z",
  "averageErrorRate": 1.25
}
```

---

## Extend & Customize

### Add Custom Health Checks

Modify `checkHealth()` in `MonitoringLoop`:

```typescript
private async checkHealth(): Promise<HealthCheckResult> {
  // Add new component checks
  const myComponent = await checkComponent('my_service', async () => {
    return { ok: true, details: { status: 'ok' } };
  });
  // ...
}
```

### Adjust Incident Thresholds

In `detectIncident()` method:

```typescript
// Change critical error rate threshold (currently 5%)
if (result.errors.errorRate > 7) {
  // Changed from 5
  return {/* critical incident */};
}
```

### Add Custom Response Actions

In `respondToIncident()` method:

```typescript
if (incident.severity === 'critical') {
  // Add custom escalation (SMS, Slack, webhook)
  await notifyFounder(incident);
}
```

---

## Testing

**Test Files:**

- `tests/monitoring-loop.test.ts` — 49 tests for core monitoring daemon
- `tests/observability-endpoints.test.ts` — 25 tests for all 3 endpoints
- `tests/customer-journey.test.ts` — 45 tests for funnel analysis
- `tests/database-performance.test.ts` — 49 tests for database metrics

**Run Tests:**

```bash
npm test                          # Run all tests
npm run test:integration         # Run integration tests with dev server
```

---

## Monitoring Summary

Quick status check: `GET /api/init`

Returns current monitoring status:

```json
{
  "status": "ok",
  "monitoring": {
    "initialized": true,
    "message": "Monitoring loop already running"
  }
}
```

---

## Future Enhancements (Phase 3+)

### Auto-Repair Workflows

- Slow query optimization (auto-index suggestion)
- Connection pool scaling
- Error rate investigation (log aggregation)

### Deployment Health Monitoring

- CI/CD pipeline status
- Test result tracking
- Auto-rollback on failures

### Advanced Analytics

- Machine learning for anomaly detection
- Predictive scaling recommendations
- Comparative analysis across deployments

### Persistence Layer

- Store history in Supabase for long-term trends
- Create historical dashboards
- Generate weekly health reports

---

## Troubleshooting

### Monitoring Not Starting

1. Check logs for initialization errors: `[Governor]` prefix
2. Verify `lib/observability/monitoring-loop.ts` is deployed
3. Check `app/layout.tsx` imports `initializeMonitoring`
4. Manual trigger: `curl https://app.example.com/api/init`

### High False Positive Rate

- Adjust incident thresholds in `detectIncident()`
- Increase trend detection threshold (currently 3 checks)
- Review component timeout settings (currently 5000ms)

### Missing Data Points

- Verify all 6 components are responding in health checks
- Check error endpoint is working: `curl https://app.example.com/api/errors`
- Verify database connection: Check Supabase status

---

## References

- **Design Document:** `docs/observability/OBSERVABILITY-SETUP-2026-07-16.md`
- **Governor Ω Constitution:** `docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md`
- **Autonomous Execution:** `docs/governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md`
- **Risk Register:** `docs/governor/risks/RISK-REGISTER.md`
