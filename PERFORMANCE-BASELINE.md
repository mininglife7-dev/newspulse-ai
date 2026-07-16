# Performance Baseline — Metrics for Phase 2 & 3

**Purpose:** Establish baseline performance metrics for Phase 2 (1 organization) and success criteria for Phase 3 scalability testing (1 → 100 organizations).

**Established:** 2026-07-16  
**Updated:** During Phase 2 execution  
**Used By:** Phase 3 scalability testing and Phase 5 readiness assessment

---

## Phase 2 Baseline Metrics (Single Organization)

During Phase 2 with 1 test organization (50 employees, 4 AI systems), measure:

### API Response Times

**Success Criteria:** p95 latency <500ms for all endpoints

| Endpoint Category  | Example Endpoint              | Target p95 (ms) | Phase 3 Success (100 orgs) |
| ------------------ | ----------------------------- | --------------- | -------------------------- |
| **Authentication** | POST /auth/signup             | 200             | 300                        |
| **Workspace**      | GET /workspace                | 150             | 250                        |
| **AI Systems**     | GET /ai-systems               | 100             | 200                        |
| **Assessment**     | POST /assessment              | 400             | 500                        |
| **Obligations**    | GET /obligations              | 150             | 300                        |
| **Evidence**       | GET /evidence                 | 200             | 350                        |
| **Team**           | GET /workspace/:id/members    | 100             | 200                        |
| **Reporting**      | GET /reports/dashboard        | 500             | 1000 (stretched)           |
| **PDF Export**     | GET /workspace/:id/export/pdf | 2000            | 5000 (stretched)           |

### Database Query Performance

**Measurement:** PostgreSQL query execution time (from Supabase logs)

| Query Type        | Target p95 (ms) | Notes                          |
| ----------------- | --------------- | ------------------------------ |
| Simple SELECT     | <50             | Single row lookup              |
| JOIN (2-3 tables) | <100            | Workspace + members queries    |
| JOIN (4+ tables)  | <200            | Assessment with obligations    |
| Aggregation       | <500            | Dashboard metrics, reports     |
| Full-text search  | <300            | Evidence search, documentation |

**RLS Policy Overhead:** <10ms per query (verify during Phase 2)

### Throughput

**Measurement:** Requests per second during Phase 2 scenarios

| Scenario        | Concurrent Users | Target RPS | Expected p95 Latency |
| --------------- | ---------------- | ---------- | -------------------- |
| Onboarding      | 1                | 5-10       | <300ms               |
| Assessment      | 1                | 5-10       | <500ms               |
| Bulk Operations | 1                | 2-5        | <2000ms              |

### Database Performance

**Measurement:** Database metrics from Supabase dashboard

| Metric                      | Target | Notes                          |
| --------------------------- | ------ | ------------------------------ |
| Connection Pool Utilization | <50%   | 25 connections in pool         |
| Query Queue Time            | <10ms  | Queries waiting for connection |
| Replication Lag             | <1s    | Read replicas if enabled       |
| Disk Usage                  | <10GB  | For 50 organizations           |

### Application Server Performance

**Measurement:** From Next.js/Vercel deployment metrics

| Metric          | Target | Notes                             |
| --------------- | ------ | --------------------------------- |
| CPU Usage       | <30%   | Single Vercel serverless function |
| Memory Usage    | <300MB | Per serverless function           |
| Cold Start Time | <500ms | Function initialization           |
| Build Time      | <5 min | CI/CD pipeline                    |

### Error Rates

**Measurement:** From error tracking / application logs

| Category              | Target | Notes                           |
| --------------------- | ------ | ------------------------------- |
| API Errors (4xx/5xx)  | <1%    | User errors + server errors     |
| Authentication Errors | <0.5%  | Failed logins, token issues     |
| Database Errors       | <0.1%  | Connection failures, RLS issues |
| Timeout Errors        | <0.1%  | Request timeouts                |
| Unhandled Exceptions  | <0.05% | Critical bugs                   |

### Data Consistency

**Measurement:** During Phase 2 scenario execution

| Metric                    | Target | Notes                       |
| ------------------------- | ------ | --------------------------- |
| Audit Trail Completeness  | 100%   | All state changes logged    |
| Data Isolation Violations | 0      | No cross-tenant data access |
| Eventual Consistency Lag  | <1s    | For non-critical data       |
| Transaction Rollback Rate | <0.1%  | Failed transactions         |

---

## Phase 3 Scalability Success Criteria

### Load Levels (Phase 3)

Test at 5 progressive load levels:

| Load Level  | Organizations | Users | AI Systems | Test Duration | Success Criteria                   |
| ----------- | ------------- | ----- | ---------- | ------------- | ---------------------------------- |
| **Level 1** | 1             | 59    | 4          | 30 min        | Establish baseline                 |
| **Level 2** | 5             | 295   | 20         | 30 min        | p95 <500ms                         |
| **Level 3** | 10            | 590   | 40         | 30 min        | p95 <500ms                         |
| **Level 4** | 50            | 2,950 | 200        | 1 hour        | p95 <500ms or document degradation |
| **Level 5** | 100           | 5,900 | 400        | 1 hour        | Assess max capacity                |

**Success:** All load levels achieve <500ms p95 latency

### Scalability Metrics

**Goal:** Verify linear (or better) scaling as organization count increases

| Metric                   | Level 1      | Level 5      | Target Behavior             |
| ------------------------ | ------------ | ------------ | --------------------------- |
| **p95 API Latency**      | <300ms       | <500ms       | Linear or sub-linear growth |
| **Database CPU**         | <20%         | <60%         | Reasonable utilization      |
| **Query Execution Time** | <100ms (avg) | <300ms (avg) | Sub-linear if indexed       |
| **RPS Capacity**         | 100+         | 50+          | Graceful degradation        |
| **Error Rate**           | <1%          | <5%          | Degradation acceptable      |

### Stress Test

**After Phase 3 passes:** Optional stress test to identify breaking point

- Increase to 150+ organizations with concurrent load
- Measure: Where does system start failing?
- Document: Max capacity and graceful degradation behavior

---

## Measurement Tools

### Supabase Monitoring

**Metrics Available:**

- Query execution times (SQL Editor → Query Performance)
- Database CPU, memory, connections
- Real-time replication lag (if enabled)
- Backup/restore status

**Commands:**

```sql
-- Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Vercel Deployment Monitoring

**Metrics Available:**

- Function duration (via Analytics)
- Edge function performance
- Deployment status and history
- Build logs and test results

**How to Access:**

1. Go to Vercel project dashboard
2. Analytics tab → Function duration histogram
3. Deployments tab → Build logs

### Application Level Monitoring

**Metrics to Implement:**

- API route timing (middleware)
- Database query timing (Supabase client logging)
- Error tracking (Sentry integration — optional)
- Custom metrics (OpenTelemetry — optional)

**Current Implementation:**

```typescript
// Example: API route timing middleware
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const start = Date.now();
  // ... handle request ...
  const duration = Date.now() - start;
  console.log(`[${request.method}] ${request.pathname} - ${duration}ms`);
}
```

### E2E Test Measurements (Already Implemented)

In `tests/phase-2-e2e.spec.ts`:

```typescript
// Timing measurements already included
const startTime = Date.now();
// ... perform action ...
const duration = Date.now() - startTime;
console.log(`Scenario completed in ${duration}ms`);
```

---

## Phase 2 Measurement Checklist

During Phase 2 Phase 2 scenario execution, collect:

- [ ] API response times for each endpoint (via middleware logs)
- [ ] Database query execution times (via Supabase SQL logs)
- [ ] Error rates and types (via application logs)
- [ ] E2E test completion times (via Playwright test results)
- [ ] Database query counts (identify N+1 issues)
- [ ] Concurrent user capacity (from single-org load test)
- [ ] Cold start times (from first deployment and redeploy)
- [ ] Build times (from CI/CD pipeline)

### Data Collection Points

**Per Scenario:**

1. **Scenario Start:** Record timestamp, organization count, user count
2. **Each API Call:** Log endpoint, method, duration, status code
3. **Each Database Query:** Log query type, duration, rows affected
4. **Scenario End:** Record total duration, errors, success rate

**Results Location:** `test-results/phase-2-metrics.json`

**Example Structure:**

```json
{
  "scenario": "Scenario 1: First-Time Onboarding",
  "startTime": "2026-07-17T10:00:00Z",
  "endTime": "2026-07-17T10:15:00Z",
  "duration_ms": 900000,
  "api_calls": [
    {
      "endpoint": "POST /api/auth/signup",
      "method": "POST",
      "duration_ms": 250,
      "status": 200
    }
  ],
  "database_queries": [
    {
      "query": "INSERT INTO profiles ...",
      "duration_ms": 45,
      "rows_affected": 1
    }
  ],
  "errors": [],
  "success": true
}
```

---

## Phase 3 Measurement Plan

### Load Test Procedure

1. **Setup (T+0):** Initialize load level
   - Load N organizations into database
   - Verify data loaded correctly

2. **Warmup (T+5 min):** Low traffic to warm caches
   - Make 10 requests to each endpoint
   - Verify no errors

3. **Steady-State (T+5-30 min):** Continuous load
   - Measure API response times
   - Measure database performance
   - Measure error rates

4. **Analysis (T+30-35 min):** Compute metrics
   - Calculate p50, p95, p99 latencies
   - Identify slow queries
   - Identify hot spots

5. **Cleanup (T+35+):** Reset state for next load level

### Load Test Tools

**Recommended Tools:**

- **k6** or **Locust**: Open-source load testing
- **Artillery**: Node.js-based load testing
- **Apache JMeter**: Enterprise load testing

**Example k6 Script Structure:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 50 }, // Warmup
    { duration: '25m', target: 100 }, // Steady state
    { duration: '5m', target: 0 }, // Cooldown
  ],
};

export default function () {
  // Test each endpoint
  let res = http.get('https://app.example.com/api/workspace');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## Risk Assessment

### Performance Risks Identified

| Risk                           | Probability | Impact   | Mitigation                                           |
| ------------------------------ | ----------- | -------- | ---------------------------------------------------- |
| **RLS Policy Overhead**        | Medium      | Medium   | Measure during Phase 2, optimize if needed           |
| **N+1 Query Patterns**         | Medium      | High     | Use Supabase query logs to identify, rewrite queries |
| **Missing Database Indexes**   | Low         | High     | Add indexes for Phase 2 joins before load testing    |
| **Slow Aggregation Queries**   | Medium      | Medium   | Use materialized views or cache dashboard data       |
| **Cold Start Latency**         | Low         | Medium   | Vercel serverless warmed up by baseline traffic      |
| **Connection Pool Exhaustion** | Low         | Critical | Monitor connection count, increase if needed         |

### Optimization Opportunities (Deferred to Phase 5)

If Phase 2 or 3 reveals performance issues:

1. **Database:**
   - Add composite indexes
   - Consider materialized views
   - Partition large tables

2. **API:**
   - Implement caching (Redis)
   - Implement pagination
   - Add field filtering (GraphQL-like)

3. **Application:**
   - Batch API calls
   - Pre-fetch related data
   - Implement background jobs (Temporal)

4. **Infrastructure:**
   - Scale database (read replicas)
   - Scale application servers
   - Use CDN for static assets

---

## Success Definition (Phase 5)

**Phase 2-3 Performance Readiness ✅ when:**

- ✅ All Phase 2 scenarios complete with <5% error rate
- ✅ p95 API latency <500ms for all endpoints (1 org)
- ✅ Phase 3 Level 1-3 pass (<500ms p95)
- ✅ Phase 3 Level 4-5 degrade gracefully (>500ms acceptable if documented)
- ✅ No RLS policy breaches (0 data isolation violations)
- ✅ Audit trail 100% complete and accurate
- ✅ Database query performance acceptable (no queries >1s)
- ✅ Error rates <1% across all operations

**Launch Ready ✅ when:**

- ✅ Performance metrics documented in PHASE-5-READINESS-SCORECARD.md
- ✅ Capacity planning completed (max concurrent users, max organizations)
- ✅ Graceful degradation strategy documented (what happens under load)
- ✅ Monitoring and alerting configured for production (Vercel + Supabase)
- ✅ Runbooks prepared for performance issues (slow queries, connection pool exhaustion)

---

## Founder Notes

This baseline establishes:

1. **Phase 2 expectations:** Measure performance with 1 organization
2. **Phase 3 success criteria:** Verify scalability to 100 organizations
3. **Production readiness:** Ensure performance acceptable for first customer

**Key Metrics to Watch:**

- **p95 API Latency:** <500ms indicates healthy performance
- **Error Rate:** <1% indicates stability
- **Database CPU:** <60% at Level 5 load indicates good headroom
- **Audit Trail Completeness:** 100% is non-negotiable for compliance

**If Phase 3 Fails:**

If Phase 3 load tests reveal significant performance degradation:

- Document specific bottlenecks
- Prioritize optimizations (RLS vs. queries vs. cold starts)
- Decide: launch with reduced load capacity, or defer launch 1-2 weeks for optimization

---

**Status:** Ready for Phase 2 measurement

Baseline established; collection procedures defined; success criteria clear.
