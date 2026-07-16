# NewsPulse AI — Production Monitoring Setup Guide

**Last Updated:** 2026-07-15  
**Status:** Ready for Implementation  
**Platform:** Vercel + Supabase + Node.js runtime

---

## Overview

This guide documents monitoring, alerting, and observability setup for production deployment. Covers metrics collection, alert thresholds, incident response, and health checks.

### Critical Paths to Monitor

1. **Workspace Creation** (POST /api/workspace)
2. **Assessment CRUD** (POST/GET/PATCH/DELETE /api/assessment)
3. **Team Management** (POST/PATCH /api/workspace/[id]/members)
4. **Authentication** (Supabase auth flow)
5. **Database** (Supabase RLS, RPC performance)

---

## Part 1: Vercel Analytics & Monitoring

### Core Metrics (Built-in)

Vercel provides native observability for all deployments:

**1. Web Vitals**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

**2. API Route Performance**
- Response time per endpoint
- Status code distribution
- Error rates by route
- Request volume

**3. Deployment Status**
- Build success/failure
- Build duration
- Preview URL availability
- Production domain status

### Setup Instructions

**In Vercel Dashboard:**

1. Go to **Project Settings** → **Analytics**
2. Enable **Web Analytics**
3. Enable **Edge Functions Analytics** (if used)
4. Configure **Alerts** (see alerts section below)

**In Next.js (automatic):**

Analytics are automatically collected via `@vercel/analytics` (included in create-next-app). No additional setup required.

**Dashboard Checks:**

- Visit https://vercel.com/dashboard/newspulse-ai
- Monitor **Deployments** tab for build status
- Check **Analytics** tab for Web Vitals and API performance

---

## Part 2: Custom Health Checks

### Health Check Endpoint

**Route:** `GET /api/health`

Returns system status for monitoring tools and load balancers.

```typescript
// Response: 200 OK
{
  "ok": true,
  "timestamp": "2026-07-15T18:35:00Z",
  "version": "1.0.0",
  "database": "healthy",
  "auth": "healthy",
  "uptime_seconds": 3600,
  "response_time_ms": 45
}
```

**Error Response:** 503 Service Unavailable

```typescript
{
  "ok": false,
  "timestamp": "2026-07-15T18:35:00Z",
  "database": "degraded",
  "auth": "healthy",
  "message": "Database connection pool exhausted"
}
```

### Monitoring Health Check

**Tool:** Uptime monitoring service (Pingdom, UptimeRobot, etc.)

**Configuration:**

```
URL:                    https://newspulse-ai.vercel.app/api/health
Method:                 GET
Interval:               5 minutes
Expected Status:        200 OK
Timeout:                10 seconds
Retry on Failure:       2 retries at 30s interval
Alert on Failure:       After 2 consecutive failures
```

**What to Alert On:**

- HTTP 503 (Service Unavailable)
- HTTP 500 (Server Error)
- Response time > 5s
- Connection timeout
- 5+ minute outage

---

## Part 3: API Endpoint Monitoring

### Critical Endpoint Metrics

**Workspace Creation (POST /api/workspace)**

| Metric | Target | Alert Threshold | Notes |
|--------|--------|-----------------|-------|
| Response Time (P95) | < 1s | > 2s | RPC timeout guard: 25s |
| Success Rate | > 99% | < 98% | Expected: 100% on non-network failures |
| Error Rate | < 0.5% | > 1% | Investigate: auth, RLS, DB connection |
| Requests/min (peak) | 10-50 | > 100 | Scale plan: add database connections |

**Assessment CRUD (POST/GET/PATCH/DELETE)**

| Metric | Target | Alert Threshold | Notes |
|--------|--------|-----------------|-------|
| GET /api/assessment (list) | < 500ms | > 1s | RLS filtering adds overhead |
| POST /api/assessment (create) | < 1s | > 2s | Atomic transaction via RPC |
| PATCH /api/assessment/:id (update) | < 800ms | > 2s | Partial updates via PATCH |
| DELETE /api/assessment/:id | < 500ms | > 1s | Hard delete (no soft delete) |

**Team Member Management**

| Metric | Target | Alert Threshold | Notes |
|--------|--------|-----------------|-------|
| Invitation (POST) | < 1s | > 2s | Triggers email via Resend |
| Accept Invitation (PATCH) | < 800ms | > 2s | Status transition only |
| Remove Member (PATCH) | < 500ms | > 1s | Hard delete from workspace_members |

### Implementation (Synthetic Monitoring)

Use Vercel's Cron Jobs or external service (e.g., Better Stack) to periodically test critical paths:

```typescript
// pages/api/cron/health-check.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function healthCheck() {
  const results = {
    workspace_create: false,
    assessment_list: false,
    team_members: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test 1: Workspace creation idempotency
    const workspaceRes = await fetch('https://newspulse-ai.vercel.app/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Health Check Inc.',
        country: 'US',
        industry: 'Software',
      }),
    });
    results.workspace_create = workspaceRes.ok;

    // Test 2: Assessment list
    const assessmentRes = await fetch('https://newspulse-ai.vercel.app/api/assessment');
    results.assessment_list = assessmentRes.ok;

    // Test 3: Team members endpoint
    const teamRes = await fetch('https://newspulse-ai.vercel.app/api/workspace/test/members');
    results.team_members = teamRes.ok || teamRes.status === 401; // 401 is expected for unauthenticated

  } catch (error) {
    console.error('Health check failed:', error);
  }

  return results;
}

export async function GET(req: Request) {
  const results = await healthCheck();
  const allHealthy = Object.values(results).slice(0, -1).every(v => v === true);

  return NextResponse.json(results, { status: allHealthy ? 200 : 503 });
}
```

---

## Part 4: Database Monitoring (Supabase)

### Key Metrics to Track

**Connection Pool:**
- Active connections (target: < 10)
- Connection pool utilization (target: < 80%)
- Connection timeouts (target: 0)

**Query Performance:**
- Query execution time (P95: < 500ms)
- Slow queries (> 1s)
- Query error rate (target: 0%)

**Row Level Security (RLS):**
- RLS policy violations (should be 0)
- Auth failures (track trends)
- Permission denials (expected, track volume)

**Replication Lag:**
- Read replica lag (target: < 100ms)
- WAL queue size (monitor if high)

### Supabase Dashboard Checks

**In Supabase Console:**

1. Go to **Project Settings** → **Database**
2. Check **Connection String** and pool settings
3. Go to **Database** → **Query Performance**
4. View slow query logs (> 1s)
5. Check **Monitoring** tab for metrics

**Connection Pool Configuration:**

```
Max Connections: 10 (adjust based on load)
Idle Timeout: 60s (Vercel is serverless, reuse connections)
Connect Timeout: 5s
```

### Supabase Alerts

Configure in Supabase console:

- **Alert on:** Database connection pool exhaustion
- **Alert on:** RLS policy errors > 10 in 5 minutes
- **Alert on:** Query failures > 1% error rate
- **Alert on:** Replication lag > 1 minute

---

## Part 5: Error Tracking

### Error Handling Strategy

**Errors to Capture:**

1. **Application Errors** (TypeScript errors, runtime exceptions)
2. **Database Errors** (connection failures, query timeouts, RLS violations)
3. **Authentication Errors** (Supabase auth failures, invalid tokens)
4. **API Errors** (invalid requests, validation failures, timeouts)

### Error Tracking Setup (Sentry)

**Step 1: Install Sentry**

```bash
npm install @sentry/nextjs
```

**Step 2: Initialize in `instrumentation.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }
}
```

**Step 3: Capture Errors in Routes**

```typescript
// app/api/assessment/route.ts
import * as Sentry from "@sentry/nextjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ... create assessment
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: 'POST /api/assessment' },
      extra: { body: JSON.stringify(body) },
    });
    return NextResponse.json({ ok: false, error: '...' }, { status: 500 });
  }
}
```

**Step 4: Configure Alerts in Sentry**

- Alert on: Error rate > 1% in 5 minutes
- Alert on: New error type (first occurrence)
- Alert on: Error spike > 3x normal rate

---

## Part 6: Logging Strategy

### Log Levels

Use structured logging to capture context:

```typescript
// lib/logger.ts
export function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
```

### Critical Events to Log

**Authentication:**
- User sign-up (info)
- User sign-in (info)
- Auth failures (warn)
- Token refresh (debug)

**Workspace Operations:**
- Workspace creation (info)
- Workspace deletion (warn)
- Idempotency reuse (info)

**Assessment Operations:**
- Assessment created (info)
- Assessment updated (info)
- Assessment deleted (warn)
- Assessment access denied (warn)

**Database:**
- RPC timeout (error)
- Connection pool exhaustion (error)
- RLS policy violation (warn)
- Query timeout > 5s (warn)

**Email (Resend):**
- Invitation email sent (info)
- Email delivery failed (error)

---

## Part 7: Alert Configuration

### Alert Severity Levels

**CRITICAL (Page On-Call):**
- Service unavailable (HTTP 503)
- Database connection pool exhausted
- Authentication service down
- > 50 errors in 5 minutes
- Response time P95 > 10s

**HIGH (Notify Via Slack):**
- Error rate > 5% in 5 minutes
- Response time P95 > 2s
- Database query timeout > 5s
- RLS policy violation spike

**MEDIUM (Log & Review):**
- Error rate > 1% in 5 minutes
- Response time P95 > 1s
- Individual slow queries (> 1s)
- Deployment failures

**LOW (Monitor):**
- Build duration increasing
- Web Vitals degrading
- New error types

### Alert Routing

**CRITICAL:**
- SMS to on-call engineer
- Slack #critical channel
- Page via PagerDuty

**HIGH:**
- Slack #alerts channel
- Email to team

**MEDIUM:**
- Slack #monitoring channel
- Email digest (daily)

**LOW:**
- Slack thread
- Dashboard only

---

## Part 8: Incident Response

### Response Playbook

**On Alert:**

1. **Triage** (2 min)
   - Confirm issue via Vercel/Supabase dashboards
   - Check if widespread or user-specific
   - Classify severity (CRITICAL/HIGH/MEDIUM)

2. **Communicate** (immediately)
   - Post status to #alerts Slack channel
   - If CRITICAL: Page on-call engineer

3. **Investigate** (10 min)
   - Check Vercel deployment logs
   - Check Supabase query performance
   - Check error tracking (Sentry)
   - Check structured logs

4. **Mitigate** (30 min)
   - Rollback last deployment if recent change
   - Scale database connections if pool exhausted
   - Restart Vercel deployment if hung
   - Disable problematic feature if isolated

5. **Resolve** (document)
   - Identify root cause
   - Implement permanent fix
   - Deploy fix and verify
   - Post-mortem (if CRITICAL)

### Rollback Procedure

**If recent deployment caused issue:**

1. Go to Vercel Dashboard → **Deployments**
2. Find last known good deployment
3. Click **Promote to Production**
4. Verify via health check endpoint

---

## Part 9: Production Readiness Checklist

Before Production Deployment:

- [ ] Vercel Analytics enabled
- [ ] Health check endpoint implemented and tested
- [ ] Error tracking (Sentry) configured
- [ ] Structured logging in place
- [ ] Database monitoring setup in Supabase
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom)
- [ ] Alert routing configured (Slack, SMS, PagerDuty)
- [ ] On-call rotation schedule published
- [ ] Incident response playbook documented
- [ ] Runbook for common issues created
- [ ] Team trained on monitoring dashboards
- [ ] Backup and disaster recovery plan documented

---

## Part 10: Key Dashboards

### Vercel Dashboard (Primary)

URL: https://vercel.com/dashboard/newspulse-ai

**Tabs to Monitor:**
- **Deployments:** Build status, deployment history
- **Analytics:** Web Vitals, API performance
- **Integrations:** GitHub integration status

### Supabase Console

URL: https://app.supabase.com/

**Pages to Monitor:**
- **Settings → Database:** Connection pool, query logs
- **Monitoring:** Metrics, alerts

### Sentry Dashboard

URL: https://sentry.io/organizations/newspulse-ai/

**Views to Monitor:**
- **Issues:** Error trends, new issues
- **Performance:** Slow transactions, bottlenecks
- **Releases:** Error rate per deployment

---

## Part 11: Metrics Definition

### SLOs (Service Level Objectives)

**Availability:** 99.9% (43 minutes downtime/month)
- Measured: `/api/health` returns 200
- Excluded: Planned maintenance

**Response Time (P95):** < 1 second
- Measured: API route response time, including network
- Excluded: Slow client connections

**Error Rate:** < 0.5%
- Measured: HTTP 5xx responses / total requests
- Excluded: User errors (4xx)

**RLS Enforcement:** 100%
- Measured: No unauthorized data access in logs
- Expected: 0 security incidents

---

## Part 12: Implementation Timeline

**Week 1 (Pre-Production):**
- [ ] Enable Vercel Analytics
- [ ] Deploy health check endpoint
- [ ] Configure Sentry
- [ ] Set up structured logging

**Week 2:**
- [ ] Configure Supabase monitoring
- [ ] Set up uptime monitoring
- [ ] Create alert routing
- [ ] Train team on dashboards

**Week 3:**
- [ ] Load test monitoring setup
- [ ] Run incident simulation
- [ ] Document runbooks
- [ ] Final checklist review

**Ongoing (Post-Production):**
- [ ] Daily metrics review (first week)
- [ ] Weekly metrics review (ongoing)
- [ ] Monthly incident review
- [ ] Quarterly SLO evaluation

---

## Quick Reference

**Dashboard URLs:**
- Vercel: https://vercel.com/dashboard
- Supabase: https://app.supabase.com
- Sentry: https://sentry.io

**Key Contacts:**
- On-Call: [TBD]
- Database: Supabase support
- Errors: Sentry alerts

**Escalation:**
- CRITICAL: Immediate page
- HIGH: Slack notification
- MEDIUM: Slack thread + email digest

---

**Version:** 1.0 | **Last Updated:** July 15, 2026 | **Status:** Ready for Implementation

Next: Deploy monitoring setup to production environment.
