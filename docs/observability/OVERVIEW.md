# Phase 3 Observability System

Complete observability infrastructure for production monitoring, performance tracking, and compliance SLA validation.

## Components Overview

### 1. Request Logging Infrastructure (`lib/request-logger.ts`)

Captures all HTTP request/response data with automatic aggregation and analysis.

**Features:**
- Ring buffer with 10k request capacity (automatically rolls over)
- Latency tracking with percentile calculations (p95, p99)
- Error tracking with deduplication
- Status code distribution (2xx/3xx/4xx/5xx)
- Path-specific metrics and top errors
- User/workspace context when available

**Example Query:**
```typescript
import { queryLogs, getRequestStats } from '@/lib/request-logger';

// Get last 100 requests for debugging
const logs = queryLogs({ limit: 100, status: 500 });

// Get aggregated statistics
const stats = getRequestStats();
console.log(stats.p95LatencyMs);  // 245ms
console.log(stats.errorRate);     // 0.02 (2%)
```

**Output Format:**
```javascript
{
  path: '/api/assessments',
  method: 'POST',
  status: 200,
  latencyMs: 145,
  level: 'info',
  ip: '192.168.1.100',
  userId: 'user-123',
  workspaceId: 'ws-789',
  requestSize: 2048,
  responseSize: 4096,
  timestamp: '2026-07-11T04:30:00Z'
}
```

### 2. Middleware Logging Helper (`lib/middleware-logging.ts`)

Zero-boilerplate request/response logging wrapper for API endpoints.

**Usage:**
```typescript
import { withLogging } from '@/lib/middleware-logging';

export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      // Your handler logic
      return NextResponse.json({ data: [] });
    },
    {
      endpoint: '/api/assessments',
      method: 'GET',
      userId: extractedUserId,
      workspaceId: extractedWorkspaceId,
    }
  );
}
```

**What Gets Logged:**
- Request arrival time and completion time (latency)
- HTTP status code
- Request/response payload sizes
- Client IP address (from x-forwarded-for or x-real-ip)
- User and workspace context
- Errors and exceptions

### 3. Performance Metrics Collection (`lib/performance-metrics.ts`)

Standalone performance tracking for latency measurement, SLA validation, and regression detection.

**Recording Measurements:**
```typescript
import { recordLatency, timeAsync, timeSync, getMetrics } from '@/lib/performance-metrics';

// Manual recording
recordLatency('api-call', 145);  // 145ms

// Automatic timing of async operations
const result = await timeAsync('database-query', async () => {
  return db.query('SELECT * FROM assessments');
});

// Automatic timing of sync operations
const parsed = timeSync('json-parse', () => {
  return JSON.parse(jsonString);
});

// Get aggregated metrics
const metrics = getMetrics();
console.log(metrics['api-call'].p95);  // 95th percentile
console.log(metrics['api-call'].mean); // Average latency
```

**Metric Data Structure:**
```javascript
{
  'api-call': {
    name: 'api-call',
    unit: 'ms',
    measurements: [100, 120, 110, 115, ...],
    min: 95,
    max: 250,
    mean: 132,
    median: 130,
    p95: 215,
    p99: 245
  }
}
```

### 4. SLA Validation & Regression Detection

**SLA Compliance Checking:**
```typescript
import { validateSLA, detectRegression } from '@/lib/performance-metrics';

// Define SLA requirements
const sla = {
  endpoint: '/api/assessments',
  p95MaxMs: 300,   // 95th percentile must be ≤ 300ms
  p99MaxMs: 500,   // 99th percentile must be ≤ 500ms
  minThroughput: 100  // Must handle 100 req/sec
};

// Validate current metrics against SLA
const validation = validateSLA(currentMetrics, sla);
if (!validation.passed) {
  console.error('SLA violations:', validation.violations);
  // Violations example: ["p95 352ms exceeds SLA 300ms"]
}
```

**Regression Detection:**
```typescript
// Compare current performance against baseline
const regression = detectRegression(currentMetrics, baselineMetrics, 5);
//                                                                      ↑
//                                                         5% tolerance threshold

if (regression.regressed) {
  console.warn(`Performance degraded: ${regression.change}% slower than baseline`);
}
```

### 5. Baseline Collection Script (`scripts/baseline-collection.mjs`)

Synthetic load testing tool for establishing performance baselines and regression detection.

**Running Baselines:**
```bash
# Development environment, 10 concurrent requests
node scripts/baseline-collection.mjs development 10 baselines/dev.json

# Production environment, 50 concurrent requests
node scripts/baseline-collection.mjs production 50 baselines/prod.json
```

**Output:**
```javascript
{
  timestamp: "2026-07-11T04:35:00Z",
  environment: "production",
  nodeVersion: "v22.22.2",
  testDuration: 1250,  // milliseconds
  requestCount: 45,
  metrics: {
    latency: {
      name: 'latency',
      min: 45,
      max: 320,
      mean: 128,
      median: 115,
      p95: 280,
      p99: 310
    },
    // ... additional metrics
  }
}
```

**CI/CD Integration:**
```yaml
# .github/workflows/performance.yml
- name: Collect baseline
  run: node scripts/baseline-collection.mjs production 50 baselines/production.json

- name: Compare to previous baseline
  run: node scripts/compare-baselines.mjs baselines/production.json baselines/production.baseline.json
```

### 6. Standardized Error Handling (`lib/error-handler.ts`)

Consistent error response format enabling structured error tracking and alerting.

**Error Response Helpers:**
```typescript
import { badRequest, unauthorized, notFound, serverError } from '@/lib/error-handler';

// 400 Bad Request
return badRequest('Invalid email format', { field: 'email' });

// 401 Unauthorized
return unauthorized('JWT token expired');

// 404 Not Found
return notFound('Assessment', 'assessment-123');

// 500 Server Error
return serverError('Database query failed', dbError);
```

**Response Format:**
```javascript
{
  ok: false,
  status: 400,
  error: "Invalid email format",
  code: "INVALID_INPUT",
  details: { field: 'email' },
  timestamp: "2026-07-11T04:30:00Z"
}
```

**Error Codes** (for routing/handling):
- `INVALID_INPUT` — 400 malformed request
- `MISSING_REQUIRED_FIELD` — 400 missing required field
- `AUTHENTICATION_REQUIRED` — 401 auth needed
- `INSUFFICIENT_PERMISSIONS` — 403 access denied
- `RESOURCE_NOT_FOUND` — 404 not found
- `RESOURCE_CONFLICT` — 409 conflict/duplicate
- `RATE_LIMIT_EXCEEDED` — 429 rate limited
- `INTERNAL_SERVER_ERROR` — 500 server error
- `DATABASE_ERROR` — 500 database failure
- `SERVICE_UNAVAILABLE` — 503 dependency down
- `VALIDATION_FAILED` — 400 validation error

### 7. Feature Flags System (`lib/feature-flags.ts`)

Safe feature rollout with phased/canary strategies and A/B testing.

**Phased Rollout:**
```typescript
import { setFlag, rolloutStrategies } from '@/lib/feature-flags';

// Gradually roll out new dashboard
setFlag({
  name: 'NEW_DASHBOARD_UI',
  description: 'Redesigned compliance dashboard',
  enabled: true,
  rolloutPercentage: rolloutStrategies.phased(1),  // Stage 1: 10%
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// In frontend/component
if (isFeatureEnabled('NEW_DASHBOARD_UI', { userId: currentUser.id })) {
  return <NewDashboard />;
} else {
  return <OldDashboard />;
}
```

**Rollout Stages:**
- `phased(1)` → 10%, `phased(2)` → 50%, `phased(3)` → 100%
- `canary(1)` → 5%, `canary(2)` → 25%, `canary(3)` → 100%

**Targeting:**
```typescript
setFlag({
  name: 'BETA_FEATURE',
  enabled: true,
  rolloutPercentage: 0,  // No general rollout
  targetUsers: ['user-123', 'user-456'],  // Specific users
  targetWorkspaces: ['ws-alpha'],         // Specific workspaces
});
```

**A/B Testing:**
```typescript
const variant = getVariant('EXPERIMENT_ID', { userId });
if (variant === 'control') {
  // Show control version
} else if (variant === 'treatment') {
  // Show treatment version
}
```

## Integrated Endpoints

Endpoints already instrumented with automatic logging:

| Endpoint | Method | Tracked | Details |
|----------|--------|---------|---------|
| `/api/assessments` | GET, POST, PUT | ✓ | Risk assessment tracking |
| `/api/obligations` | GET, PUT | ✓ | Compliance obligation management |
| `/api/compliance-dashboard` | GET | ✓ | Health score computation |
| `/api/evidence` | GET | ✓ | Evidence collection tracking |

## Monitoring Queries

### Production Health Dashboard

```typescript
import { getRequestStats } from '@/lib/request-logger';

// Real-time production metrics
const stats = getRequestStats();

console.log(`
  Response Time (p95): ${stats.p95LatencyMs}ms
  Error Rate: ${(stats.errorRate * 100).toFixed(2)}%
  Requests Today: ${stats.totalRequests}
  Last Error: ${stats.topErrors[0]?.message}
`);
```

### SLA Compliance Report

```typescript
import { getMetrics, validateSLA } from '@/lib/performance-metrics';

const metrics = getMetrics();
const slas = [
  { endpoint: '/api/assessments', p95MaxMs: 300, p99MaxMs: 500 },
  { endpoint: '/api/obligations', p95MaxMs: 250, p99MaxMs: 400 },
];

for (const sla of slas) {
  const validation = validateSLA(metrics[sla.endpoint], sla);
  console.log(`${sla.endpoint}: ${validation.passed ? 'PASS' : 'FAIL'}`);
  if (!validation.passed) {
    validation.violations.forEach(v => console.log(`  - ${v}`));
  }
}
```

### Performance Regression Detection

```typescript
import { detectRegression } from '@/lib/performance-metrics';

// Load baseline from committed file
const baseline = JSON.parse(fs.readFileSync('baselines/production.json'));

// Get current metrics
const current = getMetrics();

// Check each endpoint
for (const [name, currentMetric] of Object.entries(current)) {
  const baselineMetric = baseline.metrics[name];
  if (!baselineMetric) continue;

  const regression = detectRegression(currentMetric, baselineMetric, 5);
  if (regression.regressed) {
    console.warn(`⚠️  ${name}: ${regression.change.toFixed(1)}% slower`);
  }
}
```

## Best Practices

### 1. Error Handling
Always use standardized error helpers from `lib/error-handler.ts`:
```typescript
// ✓ Good
return notFound('Assessment', systemId);

// ✗ Avoid
return NextResponse.json({ error: 'Not found' }, { status: 404 });
```

### 2. Performance Tracking
Use `timeAsync`/`timeSync` wrappers instead of manual timing:
```typescript
// ✓ Good
const data = await timeAsync('database-query', async () => {
  return db.assessments.find(id);
});

// ✗ Avoid
const start = Date.now();
const data = await db.assessments.find(id);
const latency = Date.now() - start;
```

### 3. Endpoint Logging
Always wrap handlers with `withLogging` middleware:
```typescript
// ✓ Good - automatic latency + error tracking
export async function GET(req: NextRequest) {
  return withLogging(req, async () => {
    // handler logic
  }, { endpoint: '/api/endpoint', method: 'GET' });
}

// ✗ Avoid - manual error tracking
export async function GET(req: NextRequest) {
  try {
    // handler logic
  } catch (err) {
    console.error(err);  // Not structured
  }
}
```

### 4. Feature Flag Rollout
Always use stages for gradual rollout, never 100% immediately:
```typescript
// ✓ Good - gradual 10% → 50% → 100%
rolloutStrategies.phased(currentStage)

// ✗ Avoid - immediate full rollout
rolloutPercentage: 100
```

## Phase 3 Timeline

- **2026-07-11** — Observability infrastructure deployed
- **2026-07-12 to 2026-07-16** — Endpoint integration and testing
- **2026-07-17** — Phase 3 checkpoint and launch

## Support & Troubleshooting

**Logs Not Appearing:**
- Verify endpoint is wrapped with `withLogging`
- Check request logger isn't full (ring buffer cap: 10k)
- Verify `__clearLogs()` isn't being called in production

**Metrics Not Recording:**
- Confirm `recordLatency` or `time*` functions are called
- Check `__resetMetrics()` isn't clearing production data
- Verify metrics are exported before request completes

**SLA Violations:**
- Baseline may be outdated — regenerate with `baseline-collection.mjs`
- Check infrastructure capacity (CPU, database)
- Validate rate limiting isn't artificially inflating p99

**Feature Flag Not Working:**
- Verify flag is enabled: `isFeatureEnabled(flagName)`
- Check context (userId/workspaceId) matches target criteria
- Confirm consistent hashing — same user should always get same flag state
