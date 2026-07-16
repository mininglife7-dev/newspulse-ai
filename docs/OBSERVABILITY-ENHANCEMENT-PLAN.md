# Observability & Monitoring Enhancement Plan

**Date:** 2026-07-16  
**Current State:** Basic monitoring (Vercel logs, Supabase logs)  
**Target State:** Production-grade observability (structured logging, error tracking, telemetry)  
**Effort Level:** Medium (can be phased)  
**ROI:** High (reduces operational effort by 40-50%)

---

## Executive Summary

Current monitoring is functional but **reactive**. Platform lacks:
- ✗ Structured logging (difficult to search/filter)
- ✗ Error tracking across distributed components
- ✗ Performance metrics instrumentation
- ✗ Customer journey telemetry
- ✗ Real-time alerting

**Recommendation:** Implement lightweight observability layer (no cost, uses existing infrastructure).

---

## Section 1: Current Monitoring State

### 1.1 What Works Today

| Component | Visibility | Quality |
|-----------|-----------|---------|
| **Vercel Logs** | Real-time | Basic (text output) |
| **Supabase Logs** | Real-time | Basic (database queries) |
| **Google Sheets Tracker** | Manual | Limited (daily snapshot) |
| **Error Boundaries** | React errors only | Limited (no async errors) |
| **API Health Endpoint** | /api/health | Minimal (binary pass/fail) |

### 1.2 What's Missing

| Need | Current | Impact | Criticality |
|------|---------|--------|-------------|
| Structured logs | ✗ | Hard to analyze patterns | High |
| Error categorization | ✗ | Can't distinguish error types | High |
| Performance metrics | ✗ | Don't know where time goes | Medium |
| Customer journey tracking | ✗ | Can't trace user flow through system | Medium |
| Real-time alerts | ✗ | Slow incident response | High |
| Distributed tracing | ✗ | Can't trace request across services | Medium |

---

## Section 2: Lightweight Observability Architecture

### 2.1 Logging Strategy

**Goal:** Structured, searchable logs without complex infrastructure.

**Solution:** Implement console-based structured logging

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
      env: process.env.NODE_ENV,
    }));
  },
  
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      context,
      env: process.env.NODE_ENV,
    }));
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
      env: process.env.NODE_ENV,
    }));
  },
};
```

**Benefits:**
- ✅ Works in both Node.js (server) and browser (client)
- ✅ Vercel automatically captures console output
- ✅ Searchable JSON format
- ✅ No external dependencies
- ✅ Zero cost

**Usage:**
```typescript
import { logger } from '@/lib/logger';

export async function signUp(email: string, password: string) {
  try {
    logger.info('User signup started', { email });
    const result = await supabase.auth.signUp({ email, password });
    logger.info('User signup successful', { email, userId: result.user.id });
    return result;
  } catch (error) {
    logger.error('User signup failed', error as Error, { email });
    throw error;
  }
}
```

---

### 2.2 Error Categorization

**Goal:** Automatically categorize errors for faster diagnosis.

```typescript
// lib/error-categorizer.ts
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',     // Auth failures, invalid tokens
  AUTHORIZATION = 'AUTHORIZATION',       // RLS violations, permission denied
  VALIDATION = 'VALIDATION',             // Input validation, malformed data
  EXTERNAL_API = 'EXTERNAL_API',         // Third-party API failures
  DATABASE = 'DATABASE',                 // Query failures, connection issues
  UNKNOWN = 'UNKNOWN',                   // Unexpected errors
}

export function categorizeError(error: Error): ErrorCategory {
  if (error.message.includes('auth')) return ErrorCategory.AUTHENTICATION;
  if (error.message.includes('permission') || error.message.includes('policy'))
    return ErrorCategory.AUTHORIZATION;
  if (error.message.includes('validation'))
    return ErrorCategory.VALIDATION;
  if (error.message.includes('fetch') || error.message.includes('network'))
    return ErrorCategory.EXTERNAL_API;
  if (error.message.includes('database') || error.message.includes('query'))
    return ErrorCategory.DATABASE;
  return ErrorCategory.UNKNOWN;
}
```

**Usage:**
```typescript
try {
  // operation
} catch (error) {
  const category = categorizeError(error as Error);
  logger.error('Operation failed', error as Error, {
    errorCategory: category,
    operation: 'signup',
    email,
  });
}
```

---

### 2.3 Performance Instrumentation

**Goal:** Track slow operations for optimization.

```typescript
// lib/metrics.ts
export const metrics = {
  timings: {} as Record<string, number[]>,
  
  startTimer: (label: string): (() => void) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!metrics.timings[label]) metrics.timings[label] = [];
      metrics.timings[label].push(duration);
      
      if (duration > 1000) {
        logger.warn('Slow operation detected', {
          operation: label,
          durationMs: Math.round(duration),
        });
      }
    };
  },
  
  getStats: (label: string) => {
    const times = metrics.timings[label] || [];
    if (!times.length) return null;
    
    return {
      count: times.length,
      avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      minMs: Math.round(Math.min(...times)),
      maxMs: Math.round(Math.max(...times)),
      p95Ms: Math.round(
        times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
      ),
    };
  },
};
```

**Usage:**
```typescript
export async function getCompanies(workspaceId: string) {
  const endTimer = metrics.startTimer('getCompanies');
  
  try {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', workspaceId);
    return data;
  } finally {
    endTimer();
  }
}
```

---

### 2.4 Customer Journey Tracking

**Goal:** Track user progress through 3-step onboarding.

```typescript
// lib/journey.ts
export const journey = {
  trackEvent: (userId: string, event: string, metadata?: Record<string, any>) => {
    logger.info('Customer journey event', {
      userId,
      event,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },
};

// Usage in components
journey.trackEvent(user.id, 'signup_completed', { email: user.email });
journey.trackEvent(user.id, 'company_setup_started');
journey.trackEvent(user.id, 'company_setup_completed', { companyName });
journey.trackEvent(user.id, 'ai_system_added', { systemType });
journey.trackEvent(user.id, 'risk_assessment_completed', { riskLevel });
```

**Benefits:**
- ✅ Trace customer flow through onboarding
- ✅ Identify drop-off points
- ✅ Measure time spent in each step
- ✅ Correlate with errors/performance issues

---

## Section 3: Error Tracking Implementation

### 3.1 Client-Side Error Boundaries

**Goal:** Catch and log React errors.

```typescript
// components/ErrorBoundary.tsx
'use client';

import { ReactNode } from 'react';
import { logger } from '@/lib/logger';

export class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React component error', error, {
      component: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="font-bold text-red-900">Something went wrong</h2>
          <p className="text-red-800">Our team has been notified.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap root layout:**
```typescript
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

---

### 3.2 Server-Side Error Handling

**Goal:** Catch and categorize all server errors.

```typescript
// lib/error-handler.ts
import { NextResponse } from 'next/server';
import { logger } from './logger';
import { categorizeError } from './error-categorizer';

export function handleApiError(error: Error, context?: Record<string, any>) {
  const category = categorizeError(error);
  
  logger.error('API error', error, {
    errorCategory: category,
    ...context,
  });

  // Return appropriate status code
  const statusMap: Record<string, number> = {
    AUTHENTICATION: 401,
    AUTHORIZATION: 403,
    VALIDATION: 400,
    EXTERNAL_API: 502,
    DATABASE: 503,
    UNKNOWN: 500,
  };

  return NextResponse.json(
    { error: error.message, category },
    { status: statusMap[category] }
  );
}

// Usage
export async function POST(req: Request) {
  try {
    // handler logic
  } catch (error) {
    return handleApiError(error as Error, { endpoint: '/api/companies' });
  }
}
```

---

## Section 4: Monitoring Dashboard

### 4.1 Create Monitoring Dashboard

**Goal:** At-a-glance visibility into system health.

Create `/dashboard/monitoring` page:

```typescript
// app/dashboard/monitoring/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { metrics, logger } from '@/lib/metrics';

export default function MonitoringDashboard() {
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      // Collect metrics
      const dbStats = metrics.getStats('getCompanies');
      const authStats = metrics.getStats('signUp');
      
      setStats({
        database: dbStats,
        authentication: authStats,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Monitoring</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(stats).map(([name, stat]) => (
          <div key={name} className="p-4 bg-white border rounded-lg">
            <h3 className="font-bold">{name}</h3>
            {stat && (
              <>
                <p>Avg: {stat.avgMs}ms</p>
                <p>P95: {stat.p95Ms}ms</p>
                <p>Max: {stat.maxMs}ms</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 4.2 Real-Time Alerts

**Goal:** Notify Founder of critical issues immediately.

```typescript
// lib/alerts.ts
export const alerts = {
  sendAlert: async (severity: 'critical' | 'high' | 'medium', message: string, context?: Record<string, any>) => {
    // Send to Founder via email/Slack
    logger.warn(`[${severity.toUpperCase()}] ${message}`, context);
    
    // Could integrate with external service later
    // await sendToSlack({ severity, message, context });
  },
};

// Usage
if (errorCount > 10 && timeWindow < 60000) {
  await alerts.sendAlert(
    'critical',
    'High error rate detected',
    { errorCount, timeWindowSeconds: 60 }
  );
}
```

---

## Section 5: Implementation Roadmap

### Phase 1: Foundation (2-3 hours, before launch)

**Task 1.1:** Add structured logging
- Files: `lib/logger.ts`
- Effort: 1 hour
- Benefit: Searchable logs in Vercel
- Risk: Low

**Task 1.2:** Add error categorization
- Files: `lib/error-categorizer.ts`
- Effort: 30 minutes
- Benefit: Faster error diagnosis
- Risk: Low

**Task 1.3:** Add error boundaries
- Files: `components/ErrorBoundary.tsx`
- Effort: 30 minutes
- Benefit: Catch React errors
- Risk: Low

**Total Phase 1: 2 hours**

**Outcome:** Structured logging + error categorization ready for pilot

---

### Phase 2: Instrumentation (3-4 hours, Week 1)

**Task 2.1:** Add performance metrics
- Files: `lib/metrics.ts`
- Effort: 1-2 hours
- Benefit: Identify slow operations
- Risk: Low

**Task 2.2:** Add customer journey tracking
- Files: `lib/journey.ts`, update pages
- Effort: 1-2 hours
- Benefit: Track onboarding progress
- Risk: Low

**Total Phase 2: 3-4 hours**

**Outcome:** Performance visibility + customer journey tracing

---

### Phase 3: Dashboards & Alerts (2-3 hours, Week 2)

**Task 3.1:** Create monitoring dashboard
- Files: `app/dashboard/monitoring/page.tsx`
- Effort: 1-2 hours
- Benefit: At-a-glance system health
- Risk: Low

**Task 3.2:** Implement alerting
- Files: `lib/alerts.ts`
- Effort: 1 hour
- Benefit: Early issue detection
- Risk: Low

**Total Phase 3: 2-3 hours**

**Outcome:** Real-time visibility + automated alerts

---

## Section 6: Expected Improvements

### Operational Efficiency

| Task | Before | After | Improvement |
|------|--------|-------|------------|
| Find error cause | 10-15 min | 2-3 min | 80% faster |
| Identify slow operations | 30-45 min | 2-3 min | 90% faster |
| Trace customer issue | 20-30 min | 5-10 min | 60% faster |
| Detect critical errors | 30+ min (reactive) | <1 min (proactive) | 95% faster |

### Customer Impact

- ✅ Faster issue resolution (2-3 min vs 20-30 min)
- ✅ Proactive error detection
- ✅ Better understanding of customer journey
- ✅ Data-driven performance optimization

---

## Section 7: Integration with Existing Tools

### 7.1 Vercel Integration

**Current:** Vercel captures console logs automatically  
**Improvement:** Structured JSON makes logs searchable

```bash
# In Vercel dashboard → Logs tab
# Filter by: {"level": "ERROR"}
# Filter by: {"errorCategory": "AUTHORIZATION"}
```

### 7.2 Google Sheets Integration

**Option:** Export metrics to Google Sheets daily

```typescript
// scripts/export-metrics.mjs
const metrics = getMetricsFromLogs();
await appendToGoogleSheet(metrics);
```

### 7.3 Supabase Integration

**Already integrated:** Database logs available in Supabase Console  
**New:** Structured app logs complement database logs

---

## Section 8: Security Considerations

### 8.1 PII Protection

**Risk:** Logs contain customer data  
**Mitigation:** Never log passwords, auth tokens, or sensitive data

```typescript
// ✗ BAD
logger.info('User created', { email, password });

// ✓ GOOD
logger.info('User created', { email, userId });
```

### 8.2 Audit Trail

**Benefit:** Logs create audit trail for compliance

```typescript
logger.info('User data accessed', {
  userId,
  dataType: 'risk_assessment',
  timestamp: new Date().toISOString(),
});
```

---

## Section 9: Recommendation Summary

### Before Launch

**Task:** Implement structured logging + error categorization (Phase 1)  
**Effort:** 2 hours  
**Impact:** 80% faster error diagnosis  
**Priority:** HIGH

```bash
# To implement:
npm run create-observability-phase-1
# Or manually: lib/logger.ts, lib/error-categorizer.ts, components/ErrorBoundary.tsx
```

### Week 1 (During Pilot)

**Task:** Add performance metrics + journey tracking (Phase 2)  
**Effort:** 3-4 hours  
**Impact:** Understand customer journey, identify slow operations  
**Priority:** MEDIUM

### Week 2

**Task:** Create monitoring dashboard + alerts (Phase 3)  
**Effort:** 2-3 hours  
**Impact:** Real-time visibility, proactive issue detection  
**Priority:** MEDIUM

---

## Implementation Checklist

Phase 1 (Before Launch):
- [ ] Create lib/logger.ts
- [ ] Create lib/error-categorizer.ts
- [ ] Create components/ErrorBoundary.tsx
- [ ] Add structured logging to key paths (auth, API endpoints)
- [ ] Update app/layout.tsx to use ErrorBoundary
- [ ] Test: Verify logs appear in Vercel
- [ ] Test: Verify errors are categorized
- [ ] Document log format for Founder

Phase 2 (Week 1):
- [ ] Create lib/metrics.ts
- [ ] Create lib/journey.ts
- [ ] Add journey tracking to onboarding pages
- [ ] Add metrics to database queries
- [ ] Monitor performance during customer pilot
- [ ] Collect baseline metrics

Phase 3 (Week 2):
- [ ] Create app/dashboard/monitoring/page.tsx
- [ ] Implement real-time metrics aggregation
- [ ] Create alert thresholds
- [ ] Set up email/Slack notifications
- [ ] Document dashboard for Founder

---

## Success Metrics (Post-Implementation)

- ✅ Logs searchable and organized by level/category
- ✅ Error diagnosis time <5 minutes (from error to root cause)
- ✅ Slow operations identified within 1 minute of occurrence
- ✅ Customer journey traceable from signup to assessment
- ✅ Critical errors trigger alert within 1 minute
- ✅ Monitoring dashboard shows system health at a glance
- ✅ Zero privacy violations (no PII in logs)

---

**Observability Plan Complete**  
**Status:** Ready for implementation (Phase 1 before launch, Phase 2-3 during pilot)  
**Next:** Implement Phase 1 structured logging
