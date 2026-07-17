# EURO AI Performance Baselines & SLOs

**Established**: 2026-07-17  
**Status**: Framework established; initial measurements in progress  
**Authority**: Governor Ω (STAGE 4 Knowledge System)

---

## Executive Summary

EURO AI defines performance targets (SLOs) across three dimensions:

1. **Page Load Performance** (Lighthouse scores): 90+ across all categories
2. **API Response Times**: p50 <100ms, p95 <300ms, p99 <500ms
3. **Error Rate**: <0.1% (1 error per 1000 requests)

These targets establish a production-ready system at parity with world-class SaaS platforms.

---

## Performance Targets

### Lighthouse Scores (Browser Page Load)

Target: **90+** across Performance, Accessibility, Best Practices, SEO

| Category           | Target | Rationale                                          |
| ------------------ | ------ | -------------------------------------------------- |
| **Performance**    | 90+    | Fast page loads (<2s FCP, <3s LCP, <0.1 CLS)       |
| **Accessibility**  | 90+    | WCAG 2.1 AA compliance; keyboard navigation        |
| **Best Practices** | 90+    | Security headers, HTTPS, no deprecated APIs        |
| **SEO**            | 90+    | Proper meta tags, mobile-friendly, structured data |
| **PWA**            | 80+    | Installable, offline-capable, fast                 |

### API Response Time SLOs

| Percentile | Target | Use Case                                       |
| ---------- | ------ | ---------------------------------------------- |
| **p50**    | <100ms | Half of requests complete instantly            |
| **p95**    | <300ms | Acceptable user experience for 95% of requests |
| **p99**    | <500ms | Tail latencies acceptable; error budget        |

### Error Rate SLO

| Metric                           | Target                      |
| -------------------------------- | --------------------------- |
| **Error Rate**                   | <0.1% (1 per 1000 requests) |
| **Availability**                 | 99.9% (3-nines)             |
| **Mean Time to Recovery (MTTR)** | <15 minutes                 |

---

## Critical Pages & Endpoints

### Critical User Flows (from E2E tests)

1. **Auth Flow**: `/auth/signup` → `/auth/verify-email` → `/auth/signin`
2. **Workspace Setup**: `/workspace/setup` → `/workspace`
3. **Inventory**: `/inventory` (list) → `/inventory/{id}` (detail)
4. **Assessments**: `/assessment` (list) → `/assessment/{id}` (run) → `/compliance` (results)
5. **Navigation**: `/obligations`, `/evidence`, `/team` (cross-section navigation)

### Critical API Endpoints

| Endpoint                   | Method | SLO        | Purpose                               |
| -------------------------- | ------ | ---------- | ------------------------------------- |
| `POST /api/auth/signup`    | POST   | p95 <500ms | User registration                     |
| `POST /api/auth/signin`    | POST   | p95 <300ms | Authentication                        |
| `GET /api/workspace`       | GET    | p95 <100ms | Workspace data retrieval              |
| `GET /api/inventory`       | GET    | p95 <200ms | System list (paginated)               |
| `POST /api/assessment`     | POST   | p95 <800ms | Assessment submission (compute-heavy) |
| `GET /api/assessment/{id}` | GET    | p95 <300ms | Assessment results                    |
| `GET /api/compliance`      | GET    | p95 <300ms | Compliance summary                    |

---

## Sentry Performance Monitoring

### Configuration

**Location**: `sentry.config.ts`

```typescript
// Performance tracing
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

// Session replay
replaysSessionSampleRate: 0.1,
replaysOnErrorSampleRate: 1.0,
```

### Monitored Signals

#### 1. Page Load Performance (Web Vitals)

Automatically tracked by Sentry:

- **LCP** (Largest Contentful Paint): Time to render largest visual element
  - Target: <2.5s
  - Threshold: 2.5s good, 4s poor

- **FCP** (First Contentful Paint): Time to render first content
  - Target: <1.8s
  - Threshold: 1.8s good, 3s poor

- **CLS** (Cumulative Layout Shift): Visual stability score
  - Target: <0.1
  - Threshold: 0.1 good, 0.25 poor

#### 2. API Request Performance

Sentry auto-instruments all fetch/XHR requests:

```typescript
// Automatically captured
- Request URL & method
- Response status code
- Duration (milliseconds)
- Error status (if failed)
- Browser context (user agent, viewport)
```

#### 3. Database Query Performance

Via @supabase/supabase-js integration:

```typescript
// Tracked through Sentry spans
- Query type (SELECT, INSERT, UPDATE, DELETE)
- Duration (query execution time)
- Row count (for pagination analysis)
- Error state (if query failed)
```

#### 4. Error Context

Errors tagged with performance impact:

```typescript
// Example
Sentry.captureException(error, {
  tags: {
    component: 'assessment-form',
    error_type: 'validation_failed',
  },
  contexts: {
    performance: {
      page_load_time: 1200, // ms
      api_latency: 450, // ms
    },
  },
});
```

---

## Performance Monitoring Setup

### Client-Side: SentryInitialize.tsx

```typescript
// Initialized on page load
if (sentryConfig.dsn) {
  Sentry.init(sentryConfig);
  Sentry.captureMessage('Page loaded', 'info');
}
```

This captures:

- All React errors (Error Boundary)
- Unhandled promise rejections
- Console errors
- Web Vitals (via Sentry plugin)

### Server-Side: instrumentation.ts

```typescript
// Initialized on app startup
export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await import('./sentry.config.ts');
  }
}
```

This captures:

- Server-side errors
- API response times
- Database query performance
- Request logging

---

## Current Baselines (To Be Measured)

### Lighthouse Scores by Page

| Page           | Performance | Accessibility | Best Practices | SEO | Status              |
| -------------- | ----------- | ------------- | -------------- | --- | ------------------- |
| `/`            | —           | —             | —              | —   | Pending measurement |
| `/auth/signup` | —           | —             | —              | —   | Pending measurement |
| `/auth/signin` | —           | —             | —              | —   | Pending measurement |
| `/workspace`   | —           | —             | —              | —   | Pending measurement |
| `/inventory`   | —           | —             | —              | —   | Pending measurement |
| `/assessment`  | —           | —             | —              | —   | Pending measurement |
| `/compliance`  | —           | —             | —              | —   | Pending measurement |
| `/team`        | —           | —             | —              | —   | Pending measurement |

**Measurement Command**: `npm run performance:baseline`

### API Response Times (p95)

| Endpoint                | Current | Target | Status              |
| ----------------------- | ------- | ------ | ------------------- |
| `POST /api/auth/signup` | —       | <500ms | Pending measurement |
| `POST /api/auth/signin` | —       | <300ms | Pending measurement |
| `GET /api/workspace`    | —       | <100ms | Pending measurement |
| `GET /api/inventory`    | —       | <200ms | Pending measurement |
| `POST /api/assessment`  | —       | <800ms | Pending measurement |
| `GET /api/compliance`   | —       | <300ms | Pending measurement |

---

## Performance Optimization Roadmap

### Phase 1: Foundation (This Sprint - CURRENT)

- [x] Define performance targets and SLOs
- [x] Configure Sentry performance monitoring
- [x] Set up baseline measurement script
- [ ] Run initial Lighthouse audit across critical pages
- [ ] Document Web Vitals with Sentry integration

### Phase 2: Optimization (Next Sprint - 6 hours)

- [ ] **Route Optimization**: Identify p95 latency outliers via Sentry
- [ ] **Database Indexing**: Profile slow queries in Supabase logs
- [ ] **Component Analysis**: React DevTools Profiler on slow pages
- [ ] **Bundle Analysis**: Analyze vendor code splitting opportunities

### Phase 3: Continuous Monitoring (Week 3)

- [ ] **Weekly Baseline Runs**: Automate Lighthouse measurements
- [ ] **Sentry Alerts**: Configure error rate and latency thresholds
- [ ] **Real User Monitoring (RUM)**: Enable Sentry performance in production
- [ ] **Trending Dashboard**: Historical performance tracking

### Phase 4: Scaling (Week 4+)

- [ ] **Load Testing**: Simulate 1000+ concurrent users
- [ ] **CDN Optimization**: Vercel edge caching, ISR tuning
- [ ] **Database Connection Pool**: Monitor Supabase connection limits
- [ ] **Core Web Vitals**: Google Analytics integration for real-world metrics

---

## Optimization Strategies

### Quick Wins (<1 hour each)

1. **Image Optimization**: Ensure all images use Next.js Image component

   ```tsx
   import Image from 'next/image';
   <Image src="/hero.png" alt="Hero" width={1200} height={600} priority />;
   ```

2. **Font Optimization**: Use font subsetting and preload

   ```tsx
   const inter = Inter({ subsets: ['latin'], preload: true });
   ```

3. **Code Splitting**: Lazy-load non-critical routes

   ```tsx
   const AssessmentForm = dynamic(() => import('./AssessmentForm'));
   ```

4. **Caching Headers**: Configure Next.js caching strategies
   ```typescript
   // next.config.js
   headers: {
     'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
   }
   ```

### Medium Effort (2-4 hours each)

1. **Database Query Optimization**: Add indexes to slow queries

   ```sql
   CREATE INDEX idx_workspace_user ON workspaces(user_id);
   CREATE INDEX idx_assessment_system ON assessments(ai_system_id);
   ```

2. **API Response Pagination**: Limit data transfer

   ```typescript
   GET /api/inventory?limit=20&offset=0
   ```

3. **Component Rendering**: Reduce render cycles with React.memo

   ```tsx
   export const InventoryCard = React.memo(({ system }) => { ... });
   ```

4. **Bundle Size Reduction**: Analyze and trim dependencies
   ```bash
   npm run build && npx webpack-bundle-analyzer
   ```

### Long-term (8+ hours each)

1. **Server-Side Rendering (SSR)**: Pre-render critical pages

   ```typescript
   export const revalidate = 3600; // ISR: 1 hour
   ```

2. **Edge Caching**: Vercel Edge Middleware for static assets

   ```typescript
   // middleware.ts
   export function middleware(request) {
     const response = NextResponse.next();
     response.headers.set(
       'Cache-Control',
       'public, max-age=31536000, immutable'
     );
     return response;
   }
   ```

3. **Database Connection Pooling**: Optimize Supabase pool size

   ```typescript
   // Configure in Vercel environment
   SUPABASE_POOL_SIZE = 30;
   ```

4. **Load Testing & Capacity Planning**: Simulate production traffic
   ```bash
   npx autocannon http://localhost:3000 -c 100 -d 60
   ```

---

## Monitoring & Alerting

### Sentry Performance Dashboard

Once Sentry DSN is configured in Vercel:

1. **Go to**: Sentry Project → Performance tab
2. **Key Metrics**:
   - Slowest transactions (p95 latency)
   - Error rate by endpoint
   - Web Vitals distribution
   - Session replay on errors

### Automated Alerts (to configure)

```
Alert 1: Error Rate Spike
  Condition: >10 errors/min
  Action: Slack notification to #alerts

Alert 2: Latency Regression
  Condition: p95 latency increase >20%
  Action: Slack notification + page view

Alert 3: Apdex Score Drop
  Condition: Apdex < 0.95 for 5 min
  Action: Slack notification + severity=warning
```

### Weekly Review

Every Friday at 3 PM UTC:

1. Review Sentry Performance dashboard
2. Check error rate and latency trends
3. Update `docs/operations/PERFORMANCE_BASELINES.md` with weekly snapshot
4. Document any optimization actions taken

---

## Assessment

**Status**: Framework established ✅

- [x] Sentry configured for performance monitoring (10% prod sampling)
- [x] SLO targets defined (Lighthouse 90+, API p95 <300ms)
- [x] Baseline measurement script created
- [ ] Initial measurements executed (pending)
- [ ] Sentry alerts configured (pending Founder DSN)

**Next Steps**:

1. Run `npm run performance:baseline` to measure current state
2. Configure Sentry DSN in Vercel (Founder action)
3. Set up automated Sentry alerts for regressions
4. Schedule weekly baseline reviews

**Impact on Production Readiness**:

- Adds performance visibility and SLO framework
- Enables proactive optimization before issues reach users
- Creates data-driven approach to performance decisions
- Estimated score improvement: +6 points (88/100 → 94/100 once measured and optimized)

---

## References

- Sentry Configuration: `sentry.config.ts`
- Performance Script: `scripts/performance-baseline.mjs`
- E2E Tests (critical flows): `e2e/critical-user-flow.spec.ts`
- Web Vitals: https://web.dev/vitals/
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- Sentry Performance Docs: https://docs.sentry.io/product/performance/

---

**Generated**: 2026-07-17 12:00 UTC  
**Authority**: Governor Ω  
**Next Review**: After initial measurements and Sentry DSN activation
