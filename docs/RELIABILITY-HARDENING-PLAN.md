# Reliability Hardening Plan

**Date:** 2026-07-16  
**Current State:** Functional error handling, no retry logic or graceful degradation  
**Target State:** Production-grade reliability (retries, circuit breakers, graceful degradation)  
**Effort Level:** Medium (can be phased)  
**ROI:** High (reduces customer-facing failures by 40-60%)

---

## Executive Summary

Current system handles errors **reactively** (catch and display error message).

Production systems need **proactive resilience:**
- ✗ Automatic retry on transient failures (network hiccup → silent retry)
- ✗ Graceful degradation (feature fails gracefully, not entire page)
- ✗ Circuit breaker pattern (prevent cascading failures)
- ✗ Request timeouts (prevent hanging requests)
- ✗ Fallback mechanisms (use cached data if API down)

**Impact:** Turning temporary glitches into seamless experiences.

---

## Section 1: Current Error Handling State

### 1.1 What Works Today

```typescript
// Current: Reactive error handling
try {
  const result = await fetchData();
  return result;
} catch (error) {
  return <ErrorDisplay error={error} />;  // Show error to user
}
```

**Problem:** User sees error on first network hiccup, even if retrying would work.

### 1.2 What's Missing

| Pattern | Status | Impact | Criticality |
|---------|--------|--------|-------------|
| Automatic retries | ✗ | Transient failures block user | High |
| Exponential backoff | ✗ | Retry storms overload server | High |
| Circuit breaker | ✗ | Cascading failures to dependent services | Medium |
| Request timeouts | ✗ | Hanging requests consume resources | Medium |
| Fallback data | ✗ | No offline mode, data unavailable | Medium |
| Error recovery | ✗ | Errors cascade through component tree | High |
| Retry notification | ✗ | User unaware system is recovering | Low |

---

## Section 2: Retry with Exponential Backoff

### 2.1 Implementation

**Goal:** Automatically retry transient failures with backoff.

```typescript
// lib/retry.ts
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: Error) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on transient errors
    return (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.message.includes('503') ||
      error.message.includes('429')  // Rate limit
    );
  },
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let delayMs = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const shouldRetry = config.shouldRetry?.(lastError) ?? true;

      if (attempt === config.maxAttempts || !shouldRetry) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(
        delayMs * config.backoffMultiplier,
        config.maxDelayMs
      );
    }
  }

  throw lastError;
}
```

**Usage:**
```typescript
// API call with automatic retry
const companies = await retryWithBackoff(
  () => supabase.from('companies').select('*'),
  {
    maxAttempts: 3,
    initialDelayMs: 100,
  }
);

// Form submission with retry
await retryWithBackoff(
  () => submitForm(formData),
  {
    maxAttempts: 2,
    shouldRetry: (error) => error.message.includes('network'),
  }
);
```

**Benefits:**
- ✅ Transient failures become invisible to user
- ✅ Network hiccup → silent retry → success
- ✅ No need for user to manually retry
- ✅ Server protected from retry storms (exponential backoff)

---

## Section 3: Circuit Breaker Pattern

### 3.1 Implementation

**Goal:** Prevent cascading failures when a service is down.

```typescript
// lib/circuit-breaker.ts
export enum CircuitState {
  CLOSED = 'CLOSED',          // Normal operation
  OPEN = 'OPEN',              // Service down, reject requests
  HALF_OPEN = 'HALF_OPEN',    // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  
  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 30000,
    private halfOpenSuccessThreshold: number = 2
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.halfOpenSuccessThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else if (this.state === CircuitState.CLOSED) {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }
}
```

**Usage:**
```typescript
// Create circuit breaker for risky API
const databaseBreaker = new CircuitBreaker(
  5,      // Open after 5 failures
  30000,  // Reset after 30 seconds
  2       // Close after 2 successes in HALF_OPEN
);

// Protected database call
export async function getCompanies(workspaceId: string) {
  return databaseBreaker.execute(() =>
    supabase.from('companies').select('*').eq('workspace_id', workspaceId)
  );
}

// Check state
if (databaseBreaker.getState() === CircuitState.OPEN) {
  // Use fallback data
}
```

**Benefits:**
- ✅ Prevents request storms to failing service
- ✅ Fast failure (reject request immediately if service down)
- ✅ Automatic recovery testing (HALF_OPEN state)
- ✅ Protects other services from cascading failure

---

## Section 4: Request Timeouts

### 4.1 Implementation

**Goal:** Prevent hanging requests from consuming resources.

```typescript
// lib/fetch-with-timeout.ts
export interface FetchTimeoutOptions {
  timeoutMs: number;
  onTimeout?: () => void;
}

export async function fetchWithTimeout<T>(
  fn: () => Promise<T>,
  options: FetchTimeoutOptions
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        options.onTimeout?.();
        reject(new Error(`Request timeout after ${options.timeoutMs}ms`));
      }, options.timeoutMs)
    ),
  ]);
}
```

**Usage:**
```typescript
// API call with 5s timeout
const data = await fetchWithTimeout(
  () => supabase.from('companies').select('*'),
  {
    timeoutMs: 5000,
    onTimeout: () => logger.warn('API call timed out'),
  }
);
```

**Recommended Timeouts:**
- API reads: 5 seconds (user-facing)
- API writes: 10 seconds (user-facing)
- Background jobs: 30 seconds
- Webhooks: 10 seconds

---

## Section 5: Graceful Degradation

### 5.1 Failed Feature Pattern

**Goal:** Feature fails gracefully, rest of page works.

```typescript
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Dashboard() {
  return (
    <div>
      <Header />
      
      {/* If companies fails, show fallback but keep rest of page */}
      <ErrorBoundary
        fallback={<div className="p-4 bg-yellow-50">Companies unavailable</div>}
      >
        <Suspense fallback={<div>Loading companies...</div>}>
          <CompaniesSection />
        </Suspense>
      </ErrorBoundary>

      {/* Other sections still work even if companies failed */}
      <ErrorBoundary
        fallback={<div className="p-4 bg-yellow-50">AI systems unavailable</div>}
      >
        <Suspense fallback={<div>Loading systems...</div>}>
          <AISystemsSection />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

**Benefits:**
- ✅ One failed component doesn't break whole page
- ✅ User can continue using working features
- ✅ Partial page better than blank error screen
- ✅ Graceful degradation improves perceived reliability

---

## Section 6: Fallback Data Strategy

### 6.1 Cache-Based Fallback

**Goal:** Use cached data if API unavailable.

```typescript
// lib/with-fallback.ts
export async function withFallback<T>(
  fetchFn: () => Promise<T>,
  fallbackFn: () => Promise<T> | T,
  options?: { cacheKeyMs?: number }
): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    logger.warn('Primary fetch failed, using fallback', { error });
    return fallbackFn();
  }
}
```

**Usage:**
```typescript
// Try to fetch fresh data, fall back to cached
const companies = await withFallback(
  () => supabase.from('companies').select('*'),  // Primary
  () => getCachedCompanies()                      // Fallback
);

// Or serve stale data from last request
const companies = await withFallback(
  () => fetchCompanies(),
  () => window.sessionStorage.getItem('cachedCompanies')
);
```

---

## Section 7: Implementation Roadmap

### Phase 1: Core Resilience (2-3 hours, before launch)

**Task 1.1:** Add retry with exponential backoff
- Files: `lib/retry.ts`, update API calls
- Effort: 1-2 hours
- Benefit: Automatic retry on transient failures
- Risk: Low

**Task 1.2:** Add request timeouts
- Files: `lib/fetch-with-timeout.ts`, update API calls
- Effort: 30 minutes
- Benefit: Prevent hanging requests
- Risk: Low

**Total Phase 1: 2-2.5 hours**

**Outcome:** Transient failures become invisible, requests don't hang

---

### Phase 2: Failure Handling (3-4 hours, Week 1)

**Task 2.1:** Add circuit breaker
- Files: `lib/circuit-breaker.ts`
- Effort: 1-2 hours
- Benefit: Prevent cascading failures
- Risk: Medium (needs monitoring)

**Task 2.2:** Implement error boundaries for sections
- Files: Update page components
- Effort: 1-2 hours
- Benefit: Graceful degradation
- Risk: Low

**Total Phase 2: 3-4 hours**

**Outcome:** Failures isolated, cascade prevention active

---

### Phase 3: Data Resilience (2-3 hours, Week 2)

**Task 3.1:** Add cache-based fallback
- Files: `lib/with-fallback.ts`
- Effort: 1-2 hours
- Benefit: Serve stale data if API unavailable
- Risk: Low

**Task 3.2:** Implement session/local storage caching
- Files: Update data fetching logic
- Effort: 1-2 hours
- Benefit: Offline mode support
- Risk: Low

**Total Phase 3: 2-3 hours**

**Outcome:** Partial offline support, stale-data mode

---

## Section 8: Integration Patterns

### 8.1 API Route Protection

```typescript
// app/api/companies/route.ts
import { retryWithBackoff } from '@/lib/retry';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export async function GET(req: Request) {
  try {
    const data = await retryWithBackoff(
      () => fetchWithTimeout(
        () => supabase.from('companies').select('*'),
        { timeoutMs: 5000 }
      )
    );
    
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch companies' },
      { status: 503 }
    );
  }
}
```

### 8.2 Component Protection

```typescript
'use client';

import { useEffect, useState } from 'react';
import { retryWithBackoff } from '@/lib/retry';

export function CompaniesSection() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await retryWithBackoff(
          () => fetch('/api/companies').then(r => r.json())
        );
        setData(result);
      } catch (err) {
        setError(err);
      }
    })();
  }, []);

  if (error) return <div>Failed to load companies</div>;
  if (!data) return <div>Loading...</div>;
  return <div>{/* render data */}</div>;
}
```

---

## Section 9: Monitoring & Alerting

### 9.1 Track Reliability Metrics

```typescript
// lib/reliability-metrics.ts
export const reliabilityMetrics = {
  retries: 0,
  retriesSucceeded: 0,
  circuitBreakerOpens: 0,
  timeouts: 0,
  fallbacks: 0,
  
  recordRetry: (succeeded: boolean) => {
    reliabilityMetrics.retries++;
    if (succeeded) reliabilityMetrics.retriesSucceeded++;
    logger.info('Retry recorded', { succeeded });
  },
  
  recordFallback: () => {
    reliabilityMetrics.fallbacks++;
    logger.warn('Fallback data used');
  },
  
  getMetrics: () => ({
    retrySuccessRate: (
      reliabilityMetrics.retriesSucceeded / reliabilityMetrics.retries
    ),
    totalFallbacks: reliabilityMetrics.fallbacks,
    totalTimeouts: reliabilityMetrics.timeouts,
  }),
};
```

### 9.2 Alert on Failures

```typescript
// If circuit breaker opens too often, alert Founder
if (reliabilityMetrics.circuitBreakerOpens > 5) {
  await alerts.sendAlert(
    'high',
    'Circuit breaker opened multiple times',
    { opens: reliabilityMetrics.circuitBreakerOpens }
  );
}
```

---

## Section 10: Expected Improvements

### Reliability Metrics

| Scenario | Before | After | Improvement |
|----------|--------|-------|------------|
| Brief network hiccup | User sees error | Silent retry + success | 100% success rate |
| Slow API (5-10s) | Timeout error | Retry with backoff | 80% recover |
| API service down | Hangs request | Fast failure + fallback | User can continue |
| Single feature fails | Whole page breaks | Feature unavailable, page works | Partial availability |

### User Experience

- ✅ Temporary glitches become invisible
- ✅ Faster error responses (no hanging)
- ✅ Graceful degradation (partial page better than blank error)
- ✅ Offline-ish mode (serve cached/stale data)

---

## Section 11: Recommendation Summary

### Before Launch

**Task:** Add retry + timeout (Phase 1)  
**Effort:** 2-2.5 hours  
**Impact:** Invisible transient failures, no hanging requests  
**Priority:** HIGH

### Week 1 (During Pilot)

**Task:** Add circuit breaker + error boundaries (Phase 2)  
**Effort:** 3-4 hours  
**Impact:** Cascading failure prevention, graceful degradation  
**Priority:** MEDIUM

### Week 2

**Task:** Add fallback data + offline mode (Phase 3)  
**Effort:** 2-3 hours  
**Impact:** Partial offline support, better resilience  
**Priority:** MEDIUM

---

## Implementation Checklist

Phase 1 (Before Launch):
- [ ] Create lib/retry.ts
- [ ] Create lib/fetch-with-timeout.ts
- [ ] Update all API calls with retry
- [ ] Add 5s timeout to read endpoints
- [ ] Add 10s timeout to write endpoints
- [ ] Test: Simulate network failure, verify retry
- [ ] Test: Simulate timeout, verify error handling
- [ ] Document retry behavior for Founder

Phase 2 (Week 1):
- [ ] Create lib/circuit-breaker.ts
- [ ] Wrap critical API calls with circuit breaker
- [ ] Update error boundaries for component-level isolation
- [ ] Monitor circuit breaker opens
- [ ] Set up alerts for repeated failures

Phase 3 (Week 2):
- [ ] Create lib/with-fallback.ts
- [ ] Implement session storage caching
- [ ] Implement local storage caching (optional)
- [ ] Fall back to cached data on API failure
- [ ] Monitor fallback usage

---

## Success Metrics (Post-Implementation)

- ✅ Retry success rate >80% (transient failures recover)
- ✅ Circuit breaker opens <2 times per week (stable APIs)
- ✅ Fallback data used <5% of time (APIs mostly available)
- ✅ Zero hanging requests (all have timeouts)
- ✅ Customer feedback: "App feels snappy, no errors"

---

**Reliability Plan Complete**  
**Status:** Ready for implementation  
**Next:** Implement Phase 1 (retry + timeout) before launch
