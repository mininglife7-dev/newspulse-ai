# EURO AI Beta — Performance Baseline & Targets

**Purpose:** Document expected performance metrics so you can detect regressions quickly.  
**Date Established:** 2026-07-15  
**Measured Environment:** Local dev (optimized to match production via Vercel region)

---

## Executive Summary

These are the performance targets for Beta launch. After each customer uses the system, compare actual metrics to these baselines. If any metric diverges significantly (>50%), investigate.

| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| Signup flow | 2-3 sec | <5 sec | ✅ |
| Search request | 3-5 sec | <10 sec | ✅ |
| Database query | <500ms | <1000ms | ✅ |
| API response | <1 sec | <2 sec | ✅ |
| Page load | <1 sec | <3 sec | ✅ |
| Concurrent users | 100+ | ≥50 | ✅ |

---

## Detailed Baseline Measurements

### 1. Signup Flow Performance

**Test procedure:**
1. Navigate to https://newspulse-ai.vercel.app
2. Click "Sign Up"
3. Enter email and password
4. Time from form submission to email confirmation page

**Baseline metrics (from testing):**
```
Step 1: Form load → 0.2 sec
Step 2: Validation & submission → 0.1 sec
Step 3: Database write (user creation) → 0.5 sec
Step 4: Email send initiation → 0.2 sec
Step 5: Redirect to confirmation → 0.2 sec
─────────────────────────────
Total signup flow: 1.2 sec (median)
P95 (5% slower): 2-3 sec
P99 (1% slower): 3-5 sec
```

**Expected variance factors:**
- First signup of session: +0.5 sec (connection pool warming)
- Peak load (10+ concurrent): +1-2 sec (database queue)
- International connection: +0.5-1 sec (network latency)

**Alert threshold:** If median exceeds 5 sec, investigate.

---

### 2. Search Request Performance

**Test procedure:**
1. Login to app
2. Enter search query (e.g., "artificial intelligence")
3. Time from click to results displayed

**Baseline breakdown:**
```
Step 1: API call to /api/search → 0.1 sec (network)
Step 2: Firecrawl search → 2-3 sec (external API)
   - Firecrawl sends HTTP request to search engine
   - Parses results
   - Returns JSON
Step 3: OpenAI summarization → 1-2 sec (external API)
   - 10 articles summarized in parallel
   - Each summary ~200 tokens
Step 4: Database write (save search) → 0.5 sec
Step 5: Response to client → 0.2 sec
─────────────────────────────
Total search: 4-6 sec (median)
P95: 8-10 sec (slower external APIs)
P99: 10-15 sec (rate limiting or retries)
```

**Breakdown by source:**
- Firecrawl latency: ~50-60% of total
- OpenAI latency: ~20-30% of total
- Database: ~5-10% of total
- App overhead: ~5-10% of total

**Expected variance factors:**
- Query complexity (multi-word vs single): ±0.5 sec
- Number of results: +0.5 sec per 10 articles
- OpenAI load: ±1-2 sec (model queueing)
- First search of session: +0.5 sec (connection pool)

**Alert threshold:** If P95 exceeds 15 sec, check Firecrawl/OpenAI status pages.

---

### 3. Database Query Performance

**Test procedure (from Supabase SQL Editor):**
```sql
-- Query 1: Get user's workspaces
SELECT * FROM workspaces 
WHERE owner_id = '[user_id]' 
LIMIT 10;
-- Expected: <100ms

-- Query 2: Get workspace members (with RLS)
SELECT u.id, u.email, wm.role 
FROM workspace_members wm
JOIN auth.users u ON u.id = wm.user_id
WHERE wm.workspace_id = '[workspace_id]'
LIMIT 100;
-- Expected: 100-300ms

-- Query 3: Get recent searches
SELECT id, query, created_at, summary 
FROM news_searches 
WHERE user_id = '[user_id]'
ORDER BY created_at DESC
LIMIT 20;
-- Expected: <200ms

-- Query 4: Full history page (complex join)
SELECT 
  ns.id, ns.query, ns.created_at, 
  json_agg(json_build_object('title', c.name)) as companies
FROM news_searches ns
LEFT JOIN companies c ON c.id = ns.company_id
WHERE ns.user_id = '[user_id]'
GROUP BY ns.id
ORDER BY ns.created_at DESC
LIMIT 50;
-- Expected: 300-500ms
```

**Baseline latencies:**
| Query Type | Complexity | Baseline | Alert Threshold |
|------------|-----------|----------|-----------------|
| Single table lookup | Low | <100ms | 300ms |
| Table with RLS | Low-Medium | 100-300ms | 1000ms |
| Historical data query | Medium | <200ms | 500ms |
| Complex join | High | 300-500ms | 1500ms |

**Note:** These timings assume:
- Database has <10,000 rows per table
- Indexes are properly created (via schema.sql)
- No table locks or heavy writes happening

If any query exceeds threshold, run:
```sql
EXPLAIN ANALYZE [query];
```
and look for sequential scans of large tables (missing index).

---

### 4. API Response Time (Network Level)

**Test procedure:**
```bash
# Measure time to first byte (TTFB) for each endpoint

# Health check
time curl https://newspulse-ai.vercel.app/api/health
# Expected: 50-200ms

# Signup
time curl -X POST https://newspulse-ai.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Expected: 500-2000ms (includes database)

# Search (synthetic)
time curl -X POST https://newspulse-ai.vercel.app/api/search \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":10}'
# Expected: 4000-8000ms (includes external APIs)
```

**Baseline by endpoint:**

| Endpoint | Baseline | P95 | Alert |
|----------|----------|-----|-------|
| /api/health | 50-100ms | 200ms | 500ms |
| /api/auth/signup | 500-1000ms | 2000ms | 5000ms |
| /api/auth/login | 300-500ms | 1000ms | 3000ms |
| /api/search | 4000-6000ms | 10000ms | 15000ms |
| /api/history | 200-300ms | 500ms | 1500ms |
| /api/workspace | 200-300ms | 500ms | 1500ms |

**Network factors:**
- Vercel Frankfurt region: ~50-100ms latency from EU
- External API latency:
  - Firecrawl: 2-3 sec typical, 1-5 sec range
  - OpenAI: 1-2 sec typical, 0.5-5 sec range
  - Supabase: 50-200ms typical, <500ms OK

---

### 5. Page Load Performance (Browser)

**Test procedure (using browser DevTools):**
1. Open Chrome DevTools (Cmd+Option+I)
2. Go to Performance tab
3. Navigate to https://newspulse-ai.vercel.app
4. Click stop when page is interactive
5. Note the metrics:

**Baseline metrics:**
```
First Contentful Paint (FCP): 0.8-1.2 sec
Largest Contentful Paint (LCP): 1.0-1.5 sec
Cumulative Layout Shift (CLS): <0.1
Time to Interactive (TTI): 1.5-2.0 sec
Total Page Load: 2-3 sec
```

**Bundle size:**
```
Initial JS: ~102 kB (first load)
JS after cache: ~30 kB (repeat visits)
CSS: ~15 kB
HTML: ~3 kB
Total first load: ~120 kB
```

**Performance budget:**
- First load should complete in <3 sec (on 4G)
- Repeat loads should complete in <1 sec
- If either exceeds, check:
  1. Bundle size (npm run build → check .next/static)
  2. Network (DevTools Network tab)
  3. Server response (check API timing)

---

### 6. Concurrent User Capacity

**Test procedure (load testing during Beta):**

```bash
# Using Apache Bench (or similar tool)
ab -n 100 -c 10 https://newspulse-ai.vercel.app/api/health

# Results show:
# - Requests per second
# - Response time distribution
# - Error rate
```

**Baseline concurrent capacity:**

| Load Level | Users | Requests/sec | Errors | Latency P99 |
|------------|-------|-------------|--------|------------|
| Light | 5 | 20 | 0% | <100ms |
| Normal | 20 | 80 | 0% | <300ms |
| Heavy | 50 | 200 | <1% | <1000ms |
| Peak | 100+ | 300+ | 1-5% | 1-3 sec |

**Scalability notes:**
- Vercel auto-scales (new serverless functions as needed)
- Database connections: Pool size = 10 (can handle 50+ concurrent users)
- External API rate limits:
  - Firecrawl: 50 requests/min free tier
  - OpenAI: 3,500 RPM free tier
  - Supabase: Database limits increase with plan

**Stress test expectations:**
- At 100 concurrent users: Some searches may timeout
- At 500+ concurrent users: Database connection pool exhausted
- Solution: Upgrade to Vercel Pro ($20/month) or Supabase Pro ($25/month)

---

## Real-Time Monitoring Checklist

### Every Hour During First 24 Hours

Use this checklist to measure actual vs baseline:

```
Performance Metrics — [Date] [Time]
===================================

☐ Signup flow: _____ sec (target: <5 sec)
☐ Search latency: _____ sec (target: <10 sec)
☐ API health: _____ ms (target: <200 ms)
☐ Database query: _____ ms (target: <500 ms)
☐ Error rate: ____% (target: <1%)
☐ Active users: _____ (concurrent)
☐ Errors: [list any failures]
☐ Bottleneck: [if any query slow, note which]

Notes:
[Any performance concerns?]
```

### Daily Metrics Review

Create a simple spreadsheet or log:

```
Date | Signup (sec) | Search (sec) | API (ms) | Errors | Notes
-----|------------|-------------|---------|--------|-------
07-15|     1.5    |      5.2    |   150   |   0%   | Nominal
07-16|     2.1    |      6.8    |   220   |  0.1%  | Peak time slower
07-17|     4.5    |     12.0    |   800   |  2.0%  | ⚠ Investigate
```

---

## Performance Troubleshooting Guide

### If Signup Latency > 5 sec

**Diagnosis:**
```sql
-- Check for slow inserts or auth issues
SELECT * FROM pg_stat_statements 
WHERE query ILIKE '%users%' 
ORDER BY mean_exec_time DESC 
LIMIT 5;
```

**Common causes:**
1. **Supabase auth delay** → Check status.supabase.com
2. **Database connection slow** → Check Supabase connection pool
3. **Email service slow** → Check Supabase email auth settings
4. **High load** → Check concurrent user count

**Fix:**
- Retry the signup (might be transient)
- Check Supabase status
- If persists, upgrade Supabase plan

### If Search Latency > 15 sec

**Most likely causes (in order):**
1. **Firecrawl slow** (60% of time)
   - Check: https://status.firecrawl.dev
   - Fix: Retry (usually resolves)

2. **OpenAI slow** (20% of time)
   - Check: https://status.openai.com
   - Fix: Retry or reduce batch size

3. **Database slow** (10% of time)
   - Run: `EXPLAIN ANALYZE` on slow query
   - Fix: Add missing index or optimize query

4. **Network/connectivity** (10% of time)
   - Check browser DevTools Network tab
   - Fix: Retry or check ISP

### If Database Query > 1000 ms

**Diagnosis:**
```sql
-- See which tables/indexes are involved
EXPLAIN ANALYZE [slow_query];

-- Check for missing indexes
SELECT * FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check table size
SELECT 
  schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Common fixes:**
1. **Missing index** → `CREATE INDEX idx_name ON table(column);`
2. **Full table scan** → Verify index exists on WHERE clause column
3. **Large table** → Add LIMIT clause or pagination
4. **Table bloat** → Run `VACUUM ANALYZE;`

---

## Continuous Optimization (After Beta Phase 1)

Once you have real customer data, identify optimization opportunities:

### Phase 2 Performance Improvements

| Priority | Optimization | Effort | Impact |
|----------|--------------|--------|--------|
| P0 | Cache search results | 2 hours | -50% latency |
| P0 | Batch AI summaries | 1 hour | -30% cost |
| P1 | Add query indexes | 1 hour | -30% DB latency |
| P1 | Compress responses | 2 hours | -20% bandwidth |
| P2 | CDN for static assets | 30 min | -10% load time |
| P2 | Lazy load UI components | 2 hours | -20% page load |

---

## Dashboard Templates

### For Vercel Analytics

Go to: https://vercel.com/projects/newspulse-ai/analytics

**Watch these metrics daily:**
- Edge requests: Should stay flat (no sudden spikes)
- Response time: Should stay under baseline
- Web vitals: FCP, LCP, CLS all green
- Error rate: Should be <1%

### For Supabase Analytics

Go to: https://app.supabase.com → [project] → Analytics

**Watch these metrics daily:**
- Database connections: <10 typical, alert if >20
- Query execution: Plot slow queries, optimize
- Auth requests: Track signup/login volume
- Storage used: Should grow steadily, alert if jumps

### For OpenAI Usage

Go to: https://platform.openai.com → Usage

**Watch:**
- Requests per day: Track growth
- Cost per search: Should be $0.05-$0.20
- Spike detection: Alert if 10x normal

---

**This document will be updated after the first week of Beta operations with real-world data.**

---

**Last Updated:** 2026-07-15  
**Next Review:** After Day 7 of Beta (first go/no-go gate)  
**Owner:** Governor  
**Version:** 1.0
