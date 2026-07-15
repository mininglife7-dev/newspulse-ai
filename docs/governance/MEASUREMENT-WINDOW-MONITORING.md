# Measurement Window Monitoring Guide
**Period:** 2026-07-10 to 2026-07-17  
**Purpose:** Verify production health during compliance system measurement window  
**Owner:** Governor

---

## Critical Monitoring Principle

The measurement window measurement is only valid if production is healthy. If errors, RLS rejections, or performance degradation prevent teams from using the compliance system, we're measuring the wrong thing (technical blockers, not product adoption).

**This guide helps ensure the measurement data is clean.**

---

## What to Monitor

### 1. **Obligations API Endpoints**

These routes power the compliance system. If they fail silently or intermittently, adoption metrics will be unreliable.

**Key endpoints:**
- `GET /api/obligations` — Fetch obligations (used on /obligations page)
- `POST /api/obligations` — Create obligation manually
- `PUT /api/obligations/:id` — Update obligation (status, priority, due date)
- `POST /api/obligations/import-templates` — Import templates by risk level
- `GET /api/compliance-dashboard` — Fetch compliance metrics

**What to watch for:**
- ❌ **Error responses** (5xx status codes) — Indicates server issues
- ❌ **Authorization failures** (401/403) — Indicates RLS policy problems
- ❌ **Validation failures** (400) — Indicates bad request handling
- ❌ **Timeouts** (>5s response time) — Indicates performance issues

**How to check (Vercel dashboard):**
1. Go to your Vercel project → **Deployments** → **Production**
2. Click **Functions** tab
3. Look for `/api/obligations*` routes
4. Check **Status**: should be green (no errors)
5. Check **Duration**: should be <1s p95
6. Check **Error Rate**: should be 0% or <1%

### 2. **Supabase RLS Policy Enforcement**

RLS policies protect data in multi-tenant environment. If they're broken or misconfigured, users might see data from other workspaces (critical security issue that would invalidate measurement).

**What to watch for:**
- ❌ **RLS policy failures** in Supabase logs (shows as 403 Forbidden)
- ❌ **Data access anomalies** (user seeing obligations from another workspace)
- ⚠️ **Slow policy evaluation** (queries taking >1s due to policy checks)

**How to check (Supabase dashboard):**
1. Go to Supabase dashboard → **Logs** (or check SQL Editor)
2. Run:
```sql
-- Check for policy-related errors (last 24h)
SELECT COUNT(*) as policy_errors FROM pg_stat_statements
WHERE query LIKE '%policy%' AND query LIKE '%403%';
```

3. If count > 0: Policy failures are happening. Investigate which table/policy is failing.

**Quick diagnosis query:**
```sql
-- Find which RLS policies are being evaluated (most called first)
SELECT policyname, COUNT(*) as evaluations
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY policyname
ORDER BY evaluations DESC
LIMIT 10;
```

### 3. **Database Performance**

Obligations feature involves multiple queries: fetching workspace members, checking obligations, filtering. Slow queries would make the system feel broken even if it works.

**What to watch for:**
- ❌ **Query timeouts** (>5 seconds)
- ❌ **High CPU usage** in Supabase (>80%)
- ⚠️ **Storage growth spike** (indicates massive data insert or error loop)

**How to check (Supabase dashboard):**
1. Go to **Monitoring** tab
2. Check **Postgres CPU**: should stay <50%
3. Check **Query Performance**: look for slow queries
4. Check **Connection Count**: should stay stable (<20 connections)

**Quick query to find slow queries:**
```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 4. **Application Error Tracking**

The compliance system logs errors to console and to Sentry (if configured). Errors that aren't caught immediately show up here.

**Critical error patterns to watch for:**
- ❌ `[api/obligations] query failed:` — Database query errors
- ❌ `RLS policy denied access` — Data access control failures
- ❌ `workspace_id not found` — Context resolution failures
- ❌ Sudden error rate spike — Indicates a breaking change or data corruption

**How to check:**
1. **Vercel Logs:** Go to Vercel dashboard → **Deployments** → **Production** → **Logs**
   - Filter for errors: Search `error`, `failed`, `403`, `500`
   
2. **Sentry (if configured):** Go to https://sentry.io → Your Project → **Issues**
   - Look for new issues or spike in error volume

3. **Browser Console:** While using /obligations page, open DevTools → Console
   - Look for any red error messages
   - Check Network tab for failed requests (red X on endpoints)

---

## Healthy State (Baseline)

Before the measurement window officially starts, establish a baseline of what "healthy" looks like:

```
✅ HEALTHY STATE
- /api/obligations: Response time <500ms p95, error rate 0%
- /api/compliance-dashboard: Response time <1s p95, error rate 0%
- /api/obligations/import-templates: Response time <2s p95, error rate 0%
- Supabase CPU: <30%
- RLS policy evaluations: Stable, no 403 errors
- Error logs: No errors or only expected validation errors
- Test suite: 1051/1051 tests passing
- Build: Succeeds on every push
```

---

## Daily Monitoring Checklist (2026-07-10 to 2026-07-17)

**Each morning (UTC), check:**

```
[ ] Vercel Functions dashboard: All obligations endpoints green
[ ] Vercel error logs: No new critical errors
[ ] Supabase CPU: <50%
[ ] Supabase connection count: Stable (not growing)
[ ] Browser console on /obligations page: No errors
[ ] Network tab: All API requests returning 200/201
[ ] Teams using feature?: Check Supabase obligations table for new rows
    - SELECT COUNT(*) FROM obligations WHERE created_at >= now() - interval '1 day';
```

---

## Red Flags (Take Action Immediately)

**If any of these occur, investigate immediately. They could invalidate measurement data:**

### 🔴 Error Spike
**Signal:** Error rate jumps from 0% to >5% in /api/obligations routes

**Action:**
1. Check Vercel logs for error messages
2. Check Supabase for RLS policy failures
3. Restart deployment if needed: Vercel → Deployments → Redeploy
4. Roll back if error persists

### 🔴 RLS Policy Failures
**Signal:** Users report "permission denied" or "cannot access obligations"

**Action:**
1. Verify RLS policies exist: 
```sql
SELECT * FROM pg_policies WHERE tablename = 'obligations';
```
2. If missing, re-run schema.sql
3. Test manually: Can a workspace member query obligations?

### 🔴 Database Connectivity Loss
**Signal:** All /api/obligations requests return 500 "database connection failed"

**Action:**
1. Check Supabase status page: https://status.supabase.com
2. Verify Supabase connection string in Vercel env vars is correct
3. Restart Vercel deployment

### 🔴 Performance Degradation
**Signal:** /api/obligations responses take >5 seconds; page feels slow

**Action:**
1. Check Supabase CPU (should be <50%)
2. Check for slow queries:
```sql
SELECT query, mean_time FROM pg_stat_statements
WHERE mean_time > 1000 -- queries slower than 1s
ORDER BY mean_time DESC;
```
3. If slow: Restart Supabase or add indexes
4. If Supabase is fine: Check Vercel function duration (may need optimization)

### 🟠 Unusual Data Patterns
**Signal:** Obligations table grows 10x in one day; thousands of obligations created in seconds

**Action:**
1. Check if template import endpoint was called repeatedly (could be user clicking import button repeatedly)
2. Check if there's a data loop creating duplicate obligations
3. If accidental: Delete duplicates (use workspace_id filter to be safe)

---

## Weekly Checkpoint (2026-07-17)

On checkpoint day, before running the audit:

1. **Full System Health Check**
```bash
# In Supabase SQL Editor, run:
SELECT 
  COUNT(*) as total_obligations,
  COUNT(DISTINCT workspace_id) as workspaces,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
  MIN(created_at) as first_obligation,
  MAX(updated_at) as last_update
FROM obligations
WHERE created_at >= '2026-07-10';
```

2. **Error Summary**
```
Check error logs for patterns:
- Any RLS policy rejections? (Count)
- Any database connection failures? (Count)
- Any timeout errors? (Count)
- Peak error rate? (percentage)
```

3. **Performance Baseline**
```
Record these metrics:
- /api/obligations p95 response time: ___ ms
- /api/compliance-dashboard p95 response time: ___ ms
- Supabase average CPU: ___ %
```

4. **Verify Data Integrity**
```sql
-- Orphaned obligations (shouldn't exist)
SELECT COUNT(*) FROM obligations 
WHERE workspace_id NOT IN (SELECT id FROM workspaces);

-- Orphaned assessments (shouldn't exist)
SELECT COUNT(*) FROM assessments
WHERE workspace_id NOT IN (SELECT id FROM workspaces);
```

---

## If Measurement Window Data Is Compromised

If critical errors occurred during the window that would invalidate adoption metrics, you have options:

**Option 1: Extend the window**
- If errors are fixed mid-week, extend checkpoint to 2026-07-24
- Collects another full week of clean data

**Option 2: Measure from error-free period**
- If errors occurred only 2026-07-10 to 2026-07-12, start measurement from 2026-07-13
- Reduces window to 4–5 days but ensures clean data

**Option 3: Investigate the error**
- If error reveals actual product issue (e.g., bulk actions broken), fix it
- Measure adoption before and after fix to see impact

---

## Monitoring Tools & Resources

**Vercel Monitoring:**
- Deployments dashboard: https://vercel.com/projects
- Functions tab: Shows API route performance + error rates
- Logs tab: Real-time logs for debugging

**Supabase Monitoring:**
- Supabase dashboard: https://app.supabase.com
- Logs viewer: SQL Editor → Logs tab
- Monitoring: Shows CPU, connections, query performance

**Sentry (if configured):**
- https://sentry.io → Your project
- Issues: New errors, error spikes, trends
- Alerts: Configure to notify on error spike

**Local Testing:**
```bash
# Test obligations endpoint locally before deploying
npm run dev
curl http://localhost:3000/api/obligations?companyId=true
# Should return 200 with { ok: true, obligations: [] } or data
```

---

## Post-Checkpoint Monitoring

After 2026-07-17 checkpoint, monitoring continues based on Phase 3 decision:

- **If executing Phase 3:** Monitor new feature endpoints for errors during rollout
- **If extending measurement:** Continue daily monitoring checklist
- **If pivoting direction:** Monitor changes to ensure no regressions

---

## Emergency Contacts

If critical production issue during measurement window:

1. **Restart Vercel deployment:** Vercel dashboard → Redeploy
2. **Check Supabase status:** https://status.supabase.com
3. **Verify environment variables:** Vercel → Environment Variables
4. **Roll back if needed:** Vercel → Deployments → Revert to previous

For escalation: Contact Founder (Lalit) with error details + checkpoint impact assessment.
