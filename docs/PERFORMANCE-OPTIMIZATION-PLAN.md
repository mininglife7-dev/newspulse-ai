# Performance Optimization Plan

**Date:** 2026-07-16  
**Current Status:** GOOD (production-ready)  
**Target:** EXCELLENT (sub-2s initial load, <100ms interactions)  
**Effort Level:** Medium (can be phased)

---

## Executive Summary

EURO AI demonstrates **solid performance** with:
- ✅ Lean dependency bundle (6 production packages)
- ✅ Optimized Next.js configuration
- ✅ First Load JS 87-101 kB (acceptable range)
- ✅ Static generation for most routes
- ✅ Middleware efficiently sized (83.7 kB)

**Opportunity:** 3-5 targeted optimizations can reduce initial load time by 15-25% and improve Core Web Vitals.

---

## Section 1: Current Performance Baseline

### 1.1 Build Output Analysis

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| First Load JS (landing) | 96.2 kB | <100 kB | ✅ Good |
| First Load JS (auth pages) | 165 kB | <150 kB | ⚠️ Slightly high |
| Shared JS | 87.3 kB | <80 kB | ⚠️ Slightly high |
| Middleware size | 83.7 kB | <80 kB | ⚠️ Slightly high |
| Page payload | 150-6,600 B | <5 kB | ✅ Excellent |
| Static pages | 20/20 | High % | ✅ Excellent |

**Overall Assessment:** ✅ GOOD. Auth pages slightly optimizable, but acceptable for launch.

### 1.2 Dependency Analysis

**Production Packages (6 total):**
```json
{
  "@supabase/ssr": "^0.12.0",           // Auth session mgmt (essential)
  "@supabase/supabase-js": "^2.110.2",  // Database client (essential)
  "clsx": "^2.1.1",                      // Utility (tiny)
  "lucide-react": "^0.453.0",            // Icons (well-optimized)
  "next": "^14.2.35",                    // Framework (optimized)
  "react": "^18.3.1",                    // Library (no bloat)
  "react-dom": "^18.3.1",                // Library (required)
  "tailwind-merge": "^2.5.4"             // CSS utility (tiny)
}
```

**Assessment:** ✅ **LEAN AND FOCUSED**
- No unnecessary packages
- All dependencies are essential
- No competing libraries (no jQuery, no redundant UI libs)
- Recommended: Keep this dependency profile

---

## Section 2: Performance Opportunities (Low Effort)

### Opportunity 1: Route Codesplitting Optimization

**Problem:** Auth pages (signin/signup) bundle includes full app code (165 kB First Load JS)

**Impact:** ~20 kB savings (~12% reduction)

**Solution:**
```typescript
// app/auth/signin/page.tsx
import dynamic from 'next/dynamic';

// Lazy-load heavy components
const SignInForm = dynamic(() => import('@/components/SignInForm'), {
  loading: () => <div className="skeleton" />
});
```

**Effort:** 30 minutes  
**Benefit:** Faster auth page load for new users  
**Risk:** Low (no functional change)

---

### Opportunity 2: Optimize Tailwind CSS Output

**Problem:** Tailwind CSS file might include unused styles

**Current:** Tailwind already configured with content paths  
**Check:** Run `npm run build` and inspect CSS size

**Solution (if needed):**
```javascript
// tailwind.config.ts
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // Purge unused styles
  purge: {
    mode: 'layers',
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
    ],
  },
};
```

**Effort:** 15 minutes  
**Benefit:** ~5-10 kB CSS savings  
**Risk:** Low (Tailwind handles this automatically in v3+)

---

### Opportunity 3: Enable Image Optimization

**Problem:** No image optimization currently implemented

**Solution:**
```typescript
// components/CompanyLogo.tsx
import Image from 'next/image';

export function CompanyLogo() {
  return (
    <Image
      src="/logo.png"
      alt="Company Logo"
      width={48}
      height={48}
      priority={false}  // Lazy load
    />
  );
}
```

**Effort:** 1-2 hours  
**Benefit:** Auto-optimizes images (AVIF format, responsive sizes)  
**Risk:** Low (Next.js feature)

---

### Opportunity 4: Implement Font Loading Strategy

**Problem:** System fonts used (no optimization needed)

**Assessment:** ✅ **GOOD**  
Tailwind uses system fonts by default, which is optimal for performance.

---

## Section 3: Middleware Optimization

### 3.1 Current Middleware Size: 83.7 kB

**Analysis:**
The middleware is handling locale routing (from i18n setup). Let's optimize:

**Opportunity:** Remove unused middleware code

```typescript
// middleware.ts - Currently handles locale routing
// Could be optimized to reduce bundle size

// Recommended optimization:
// - Use thin middleware (only locale detection)
// - Move heavy logic to route handlers
```

**Effort:** 1-2 hours  
**Benefit:** 5-10 kB savings  
**Risk:** Medium (core routing dependency)

---

## Section 4: Database Query Optimization

### 4.1 Current Status

**Evidence:** Database queries use Supabase client (optimized)

**Performance baseline:**
```typescript
// Good: Parameterized queries prevent N+1
const { data } = await supabase
  .from('companies')
  .select('id, name');

// Query optimization: Already indexed
// - companies.workspace_idx ✅
// - ai_systems.company_idx ✅
// - risk_assessments.ai_system_idx ✅
```

**Recommendations:**
1. ✅ **Already implemented:** Proper indexes on all join columns
2. ✅ **Already implemented:** Cascading deletes (no orphaned data)
3. ⚠️ **TODO:** Add query execution monitoring (Phase 2)

---

## Section 5: Core Web Vitals Optimization

### 5.1 LCP (Largest Contentful Paint) - Target <2.5s

**Current:** Likely 1.5-2s (good)  
**Optimization:**

```typescript
// Prioritize critical resources
import dynamic from 'next/dynamic';

// Lazy-load below-the-fold
const RiskAssessmentForm = dynamic(
  () => import('@/components/RiskAssessmentForm'),
  { ssr: false }  // Client-only
);
```

**Effort:** 1 hour  
**Benefit:** Faster initial paint

---

### 5.2 FID (First Input Delay) - Target <100ms

**Current:** Likely <50ms (excellent)  
**Optimization:** Already good with React event handling

---

### 5.3 CLS (Cumulative Layout Shift) - Target <0.1

**Current:** Likely <0.05 (excellent)  
**Recommendation:** Maintain current approach

---

## Section 6: Caching Strategy

### 6.1 Browser Caching

**Current:** Next.js handles this automatically  
**Implementation:**

```typescript
// next.config.js
module.exports = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600'  // 1 hour
        }
      ]
    },
    {
      source: '/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable'  // 1 year
        }
      ]
    }
  ]
};
```

**Effort:** 30 minutes  
**Benefit:** Faster repeat visits (30-40% improvement)  
**Risk:** Low

---

### 6.2 API Response Caching

**Opportunity:** Cache frequent database queries

```typescript
// lib/cache.ts
import { cache } from 'react';

// Dedupe identical requests within same render
export const getCompanies = cache(async (workspaceId) => {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', workspaceId);
  return data;
});
```

**Effort:** 1-2 hours  
**Benefit:** Eliminate redundant API calls (20-30% reduction)  
**Risk:** Low

---

## Section 7: Recommended Optimization Sequence

### Phase 1: Quick Wins (2-3 hours, before launch)

Priority: HIGH  
These have minimal risk and good return on investment.

**Task 1.1:** Enable image optimization via Next.js Image component
- Files: Any image rendering
- Effort: 1-2 hours
- Benefit: 10-20 kB savings + responsive images
- Risk: Low

**Task 1.2:** Add browser caching headers
- Files: next.config.js
- Effort: 30 minutes
- Benefit: 30-40% faster repeat visits
- Risk: Low

**Outcome:** 15-25% performance improvement, 30-40% faster returning users

---

### Phase 2: Medium Effort (4-6 hours, Week 1 after launch)

Priority: MEDIUM  
These are good optimizations but can be deferred until customer feedback arrives.

**Task 2.1:** Implement route codesplitting for auth pages
- Files: app/auth/signin/page.tsx, app/auth/signup/page.tsx
- Effort: 1-2 hours
- Benefit: 12-15% reduction in auth page load
- Risk: Low
- Trigger: If auth page load becomes bottleneck

**Task 2.2:** Implement API response caching with React cache()
- Files: lib/supabase.ts
- Effort: 2-3 hours
- Benefit: 20-30% API response time improvement
- Risk: Low

**Outcome:** 20-25% additional improvement

---

### Phase 3: Deep Optimization (8-12 hours, Phase 2)

Priority: LOW (nice-to-have)  
These are architectural changes with higher risk.

**Task 3.1:** Optimize middleware for i18n
- Effort: 2-3 hours
- Benefit: 5-10 kB middleware reduction
- Risk: Medium (core routing)

**Task 3.2:** Implement request waterfall analysis
- Effort: 3-4 hours
- Benefit: Identify slowest operations
- Risk: Low (observability only)

**Task 3.3:** Implement database connection pooling
- Effort: 3-5 hours
- Benefit: Faster database response times
- Risk: Medium (infrastructure)

---

## Section 8: Performance Testing

### 8.1 Automated Performance Checks

Add performance regression tests:

```typescript
// tests/performance.test.ts
import { test, expect } from 'vitest';

test('auth page loads in <2s', async () => {
  const start = performance.now();
  // Load page
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(2000);
});

test('API endpoint responds in <200ms', async () => {
  const start = performance.now();
  const response = await fetch('/api/health');
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(200);
});
```

**Effort:** 1-2 hours  
**Benefit:** Prevent performance regressions  
**Trigger:** Add to CI/CD pipeline (Phase 2)

---

### 8.2 Manual Performance Audit

**Before launching:**
```bash
# Check production build
npm run build

# Lighthouse audit (via Vercel/Chrome DevTools)
# Target: 85+ on Performance

# Measure with DevTools:
# - Network tab: Check waterfall, prioritization
# - Performance tab: Check long tasks
# - Coverage tab: Check unused code
```

---

## Section 9: Monitoring in Production

### 9.1 Metrics to Track

Once deployed, monitor:
- Core Web Vitals (LCP, FID, CLS)
- API response times
- Page load time by route
- User interaction latency

**Implementation:** Integrate with Vercel Analytics (free)

**Dashboard:** Create `/dashboard/performance` for team visibility

---

## Section 10: Recommendation Summary

### Immediate Action (Before Launch)

**Task:** Enable browser caching headers  
**Effort:** 30 minutes  
**Impact:** 30-40% faster for returning users  
**Priority:** HIGH

```javascript
// next.config.js - Add caching headers
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          }
        ]
      }
    ];
  }
};
```

### Post-Launch Actions (Week 1)

**Task:** Implement image optimization  
**Effort:** 1-2 hours  
**Impact:** 10-20 kB savings + responsive images  
**Priority:** MEDIUM

### Phase 2 (Weeks 3-4)

**Task:** Route codesplitting + API caching  
**Effort:** 4-6 hours  
**Impact:** 20-25% additional improvement  
**Priority:** MEDIUM (if auth page performance is concern)

---

## Performance Checklist

Pre-launch verification:

- [ ] Production build completes successfully
- [ ] First Load JS <165 kB for all pages
- [ ] Static pages generated for 90%+ of routes
- [ ] No console errors or warnings
- [ ] Lighthouse Performance score ≥85
- [ ] No unused dependencies
- [ ] CSS minification enabled (Tailwind)
- [ ] Middleware optimization complete (if modified)

---

## Success Metrics (Post-Launch)

After 1 month, target:
- ✅ Average page load time: <2 seconds
- ✅ API response time: <200ms (p95)
- ✅ Core Web Vitals: Green (all)
- ✅ Zero performance regressions from baseline
- ✅ Customers report snappy UI

---

## Conclusion

EURO AI has a **solid performance foundation**. Current build is suitable for production launch. Recommended optimizations are **nice-to-have, not critical**.

**Recommendation:** Ship as-is for customer pilot. Phase in optimizations based on actual performance data from real users.

---

**Performance Plan Complete**  
**Status:** Ready for launch  
**Next Review:** After first week of customer pilot
