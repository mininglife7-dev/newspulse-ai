# Pre-Checkpoint Verification Checklist
**Date:** 2026-07-16 (day before audit)  
**Purpose:** Verify system health before 2026-07-17 checkpoint audit  
**Owner:** Governor (Lalit to execute or delegate)

---

## Quick Health Check (5 minutes)

Run these checks the morning of 2026-07-16 to confirm the system is ready for measurement audit on 2026-07-17.

### ✅ Check 1: Vercel Deployment Status

1. Go to https://vercel.com/projects (or your dashboard)
2. Select NewsPulse AI project
3. Click **Production** deployment
4. Verify:
   - ✅ Status is **green** (no errors)
   - ✅ Last deployment was recent (within last 24h)
   - ✅ Build status: **Success**

**If status is not green:** Run redeploy or check logs for errors. Fix before proceeding.

---

### ✅ Check 2: Vercel Functions Performance

1. In Vercel project, click **Functions** tab
2. Look for these critical routes:
   - `/api/obligations` — should be <500ms p95, 0% error rate
   - `/api/obligations/import-templates` — should be <2s p95, 0% error rate
   - `/api/compliance-dashboard` — should be <1s p95, 0% error rate
3. Verify **Status** is green for all three

**If any show red or high error rate:** Investigate in Logs tab, then redeploy or contact Lalit.

---

### ✅ Check 3: Supabase Health

1. Go to https://app.supabase.com → Your project
2. Click **Monitoring** tab
3. Verify:
   - ✅ Postgres CPU: **<50%** (should be low during light usage)
   - ✅ Connection count: **<20** (should be stable, not growing)
   - ✅ Database size: **no unusual spike**

**If CPU is high or connections are stuck:** Might indicate a slow query. Check Logs tab for errors.

---

### ✅ Check 4: Database Measurement Data Exists

In Supabase SQL Editor, run:

```sql
-- Check if measurement window data exists
SELECT 
  COUNT(*) as total_obligations,
  COUNT(DISTINCT workspace_id) as workspace_count,
  MAX(created_at) as latest_obligation
FROM obligations
WHERE created_at >= '2026-07-10';
```

**Expected result:**
- `total_obligations`: >0 (at least some obligations have been created/imported)
- `workspace_count`: >0 (at least one workspace has used the system)
- `latest_obligation`: Should be recent (within last 24h, ideally within last few hours)

**If all zeros:** No measurement data collected yet. This is expected if no teams have signed up. Checkpoint will measure from baseline.

---

### ✅ Check 5: No Error Spikes in Logs

1. Go to Vercel project → **Logs** tab
2. Filter for last 24 hours
3. Search for: `error`, `500`, `403`, `timeout`
4. Verify: **0 critical errors** (validation errors are expected)

**If you see error patterns:**
- `RLS policy denied access` — RLS policy issue (check Supabase)
- `database connection failed` — Supabase connectivity (check status page)
- `timeout` (multiple entries) — Performance issue (check Monitoring tab)

---

### ✅ Check 6: Test Suite Passing

```bash
npm run test
npm run lint
npm run build
```

Expected output:
```
✅ Test Files: 58 passed
✅ Tests: 1102 passed
✅ Lint: 0 errors
✅ Build: Completed successfully
```

If any fail: Run locally, diagnose, fix, and re-push.

---

## Go / No-Go Decision

### ✅ GO — System is Ready

If all 6 checks pass:
- ✅ Deployment is healthy
- ✅ APIs are responsive
- ✅ Database is healthy
- ✅ Code is stable
- **→ Ready for 2026-07-17 checkpoint audit**

### 🔴 NO-GO — System Has Issues

If ANY check fails:
1. **Red flags to watch:**
   - Vercel deployment is red or building
   - API error rates >5%
   - Supabase CPU >70% or connections stuck
   - Code tests failing
   
2. **Action if no-go:**
   - Fix the issue (redeploy, check logs, restart Supabase if needed)
   - Re-run all 6 checks
   - Only proceed to checkpoint once all pass

---

## Measurement Window Summary (for reference)

**Period:** 2026-07-10 to 2026-07-17 (today is day 6)

**What we're measuring:**
- How many teams signed up and activated the compliance system
- Which risk assessment questions teams answer
- How many obligation templates they import
- Engagement patterns (updates to obligations, status changes)
- System stability (errors, performance, uptime)

**Why we're measuring:**
- Validate product-market fit before investing in speculative Phase 3 features
- Ensure deployed system works as designed
- Collect baseline metrics to guide next phase decisions

---

## Next Steps (After This Check)

1. ✅ **2026-07-16 morning (today):** Run all 6 checks above
   - If green: Proceed to checkpoint audit
   - If red: Fix issues, re-check, then proceed

2. 📊 **2026-07-17 morning:** Run checkpoint audit
   - Execute SQL queries in [CHECKPOINT-AUDIT-2026-07-17.md](./CHECKPOINT-AUDIT-2026-07-17.md)
   - Collect adoption metrics, engagement data, technical health
   - Analyze patterns and recommend Phase 3 direction
   - Present findings to Lalit with implementation plan

3. 🎯 **2026-07-17 afternoon:** Lalit decision on Phase 3 direction
   - Approve chosen feature candidate from [PHASE-3-CANDIDATES.md](./PHASE-3-CANDIDATES.md)
   - Set expected completion date
   - Governor begins implementation immediately

---

## Contact & Escalation

If critical production issues prevent completing this checklist:

1. Check Vercel status: https://vercelstatus.com/
2. Check Supabase status: https://status.supabase.com/
3. If status pages are green but system is down: Contact Lalit with:
   - Error message (from logs)
   - What was checked (which endpoints failed)
   - When the issue started
   - Any recent deployments or changes

---

## Historical Context

This is day 6 of the 7-day measurement window. The compliance system has been deployed since 2026-07-10 with:

- ✅ Risk assessment (18-question questionnaire)
- ✅ Risk classification (unacceptable/high/medium/low)
- ✅ Obligation templates (28 EU AI Act obligations across all risk levels)
- ✅ Obligation CRUD and tracking (status, priority, due date, assignments)
- ✅ Compliance dashboard (metrics, health status, progress tracking)
- ✅ Duplicate detection on template imports
- ✅ RLS policies for multi-tenant security
- ✅ Email-based authentication
- ✅ Production monitoring and error tracking

All features have been tested and verified to work. This checkpoint measures real-world adoption.
