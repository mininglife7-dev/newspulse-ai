# Performance Optimization Plan

**Baseline**: 1000ms average page load, 80 Lighthouse score  
**Target**: 500ms average page load, 90+ Lighthouse score  
**Gap**: 2x speed improvement, 10+ Lighthouse points

---

## Executive Summary

EURO AI's performance baselines established: current state at 1000ms page load (target: <500ms), 80 Lighthouse (target: 90+). This plan outlines a systematic optimization strategy to close the performance gap through bundle size reduction, route-level code splitting, and caching improvements.

---

## Phase 1: Bundle Analysis & Quick Wins (2-4 hours)

### 1.1 Identify Large Dependencies

```bash
# Analyze Next.js build output
npm run build -- --debug

# Check major dependencies
npm ls | grep -E "^├─|^└─" | head -20
```

**Expected Findings**:

- Sentry integration (~200KB)
- React + Next.js overhead
- Tailwind CSS (likely fully included)
- Supabase client library

### 1.2 Quick Win: CSS Optimization

- [ ] Verify Tailwind purging is working (should only include used classes)
- [ ] Remove unused CSS rules
- [ ] Minify CSS output

**Expected Gain**: 50-100ms page load improvement (5-10 Lighthouse points)

### 1.3 Quick Win: Remove Unused Dependencies

Conduct dependency audit:

```bash
npm audit --production
npm ls --depth=0 | grep -v "private\|dependencies"
```

**Potential Candidates for Removal**:

- [ ] Unused monitoring/logging packages
- [ ] Obsolete CLI tools
- [ ] Duplicate dependencies

**Expected Gain**: 50-100ms page load improvement

### 1.4 Dynamic Imports for Heavy Modules

Identify routes that load heavy modules and defer them:

**Routes to Check**:

- `/governance` - May load admin-heavy modules
- `/assessment` - PDF library integration
- `/evidence` - Large file handling

**Implementation**:

```typescript
// Before
import { HeavyComponent } from '@/components/heavy';

// After
const HeavyComponent = dynamic(() => import('@/components/heavy'), {
  loading: () => <Skeleton />,
});
```

**Expected Gain**: 100-200ms improvement for non-admin routes

---

## Phase 2: Route-Level Optimization (4-6 hours)

### 2.1 Implement Route Caching Headers

Add Cache-Control headers to static pages:

- `/` - 1 hour cache
- `/auth/*` - No cache (security)
- `/terms`, `/privacy` - 24 hour cache
- `/compliance` - 4 hour cache (semi-dynamic)

**Implementation Location**: `next.config.js` or route handlers

**Expected Gain**: 100-300ms for repeat visitors

### 2.2 Edge Caching (ISR Implementation)

Mark appropriate routes for Incremental Static Regeneration:

- `/` - Revalidate every 1 hour
- `/compliance` - Revalidate every 4 hours
- `/team` - Revalidate when user data updates

**Expected Gain**: 200-400ms for stale content, instant for cached

### 2.3 Database Query Optimization

Review slow queries from Sentry (once DSN activated):

- Profile `/workspace`, `/inventory` routes
- Check N+1 query patterns
- Implement database indexing

**Expected Gain**: 50-150ms depending on query bottlenecks

---

## Phase 3: Image & Asset Optimization (2-3 hours)

### 3.1 Image Optimization

- [ ] Convert PNG/JPEG to WebP with fallbacks
- [ ] Implement responsive images (srcset)
- [ ] Use next/image for automatic optimization
- [ ] Set width/height on all images

**Expected Gain**: 100-200ms (reduces layout shift, enables lazy loading)

### 3.2 Font Optimization

- [ ] Use `next/font` for system fonts (remove Google Fonts if possible)
- [ ] Or implement font subsetting
- [ ] Set font-display: swap for better CLS

**Expected Gain**: 50-100ms (reduces FOIT/FOUT)

### 3.3 JavaScript Code Splitting

Verify Next.js is splitting routes:

- [ ] Check `.next/static/chunks/` folder structure
- [ ] Ensure each route has its own chunk
- [ ] Consider granular splitting for large pages

**Expected Gain**: 100-200ms (faster initial download)

---

## Phase 4: Advanced Optimizations (4-6 hours)

### 4.1 Prefetching Strategy

Implement smart prefetching:

```typescript
<Link href="/inventory" prefetch={true}>
  Inventory
</Link>
```

For authenticated routes, prefetch on hover rather than on page load.

### 4.2 Component-Level Performance

- [ ] Memoize expensive components (React.memo)
- [ ] Move state down to avoid re-renders
- [ ] Lazy load below-the-fold components

### 4.3 Sentry Performance Tuning

Once DSN is activated:

- [ ] Reduce sampling rate from 10% to 1% for production
- [ ] Configure transaction name mapping to reduce cardinality
- [ ] Set up replay sampling rules

**Expected Gain**: Reduce Sentry overhead by 50-100ms

---

## Implementation Roadmap

### Week 1: Quick Wins + Bundle Analysis

- [ ] Run bundle analyzer
- [ ] Implement CSS optimization
- [ ] Add dynamic imports to heavy routes
- [ ] Measure improvement: Target 800-900ms

### Week 2: Route Caching + Images

- [ ] Implement cache headers
- [ ] Optimize images with next/image
- [ ] Font optimization
- [ ] Measure improvement: Target 600-700ms

### Week 3: Advanced Optimizations

- [ ] Code splitting verification
- [ ] Component memoization
- [ ] Query optimization
- [ ] Measure improvement: Target 500-600ms

### Week 4: Fine-tuning & Verification

- [ ] Run Lighthouse audits
- [ ] Address remaining warnings
- [ ] Document optimizations
- [ ] Target: 90+ Lighthouse, 500ms p95

---

## Measurement Strategy

### During Implementation

```bash
# Run baseline before changes
npm run perf:measure:save

# After each phase
npm run build && npm run perf:measure:save

# Compare results
diff docs/operations/PERFORMANCE_BASELINES_CURRENT.md <latest>
```

### Success Criteria

- [ ] Average page load < 600ms (Week 2)
- [ ] Average page load < 500ms (Week 3)
- [ ] Lighthouse score > 85 (Week 2)
- [ ] Lighthouse score > 90 (Week 3)
- [ ] All critical routes < p95 500ms threshold

---

## Tools & References

### Bundle Analysis

```bash
npm install --save-dev @next/bundle-analyzer
# Then analyze with: ANALYZE=true npm run build
```

### Performance Profiling

- Sentry Performance Dashboard (post-DSN activation)
- Chrome DevTools Lighthouse
- Vercel Insights (if enabled)
- `npm run perf:measure` (custom baseline)

### Helpful Resources

- [Next.js Performance Optimization](https://nextjs.org/learn/seo/performance)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Scoring](https://developers.google.com/web/tools/lighthouse/v3/scoring)
- [Sentry Performance Optimization](https://docs.sentry.io/platforms/javascript/performance/)

---

## Risk Mitigation

| Risk                                             | Likelihood | Mitigation                                      |
| ------------------------------------------------ | ---------- | ----------------------------------------------- |
| Over-aggressive caching causes stale content     | Medium     | Short TTLs, use ISR, monitor user reports       |
| Image optimization breaks on slow networks       | Low        | Provide WebP + PNG fallbacks, lazy load         |
| Code splitting increases latency for some routes | Low        | Profile before/after, adjust split boundaries   |
| Database optimization causes conflicts           | Low        | Test on staging, coordinate with infra team     |
| Lighthouse improvements plateau at ~85           | Medium     | Accept reasonable limits, focus on real metrics |

---

## Success Metrics

### Primary Metrics

- Page load time: 1000ms → 500ms (50% improvement)
- Lighthouse score: 80 → 90+ (10+ points)
- Time to Interactive (TTI): Reduce by 40%

### Secondary Metrics

- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1

### Business Metrics

- User engagement increase (lower bounce rate)
- Conversion improvement (faster checkout flows)
- SEO ranking improvement (Google prefers fast sites)

---

**Owner**: Governor Ω  
**Status**: Planning Phase  
**Created**: 2026-07-17  
**Target Completion**: 2026-08-14 (4 weeks)
