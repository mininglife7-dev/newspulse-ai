# Operational Runbook — Cathedral Schema Deployment & Operations

**Document Version:** 1.0  
**Last Updated:** 2026-07-12  
**Authority:** Governor (Autonomous Execution)  
**Audience:** Operational team, on-call engineers

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedure](#deployment-procedure)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Rollback Procedures](#rollback-procedures)
5. [Common Issues & Resolution](#common-issues--resolution)
6. [Performance Monitoring](#performance-monitoring)
7. [Incident Response](#incident-response)
8. [Maintenance Tasks](#maintenance-tasks)

---

## Pre-Deployment Checklist

### ✓ Required Prerequisites

Before deploying schema.sql to production Supabase:

- [ ] Supabase project created: `yrroytwfdrafvajdfkog`
- [ ] Service role key obtained (from Supabase Dashboard → Settings → API)
- [ ] Database backup available (Supabase automatically backs up daily)
- [ ] Team notified: Expect 2-5 minute deployment window
- [ ] Rollback plan reviewed: See [Rollback Procedures](#rollback-procedures)

### ✓ Code Verification

- [ ] Read `/home/user/newspulse-ai/docs/infra/INDEPENDENT_VV_AUDIT.md`
- [ ] Confirm verdict: "PRODUCTION GO" ✅
- [ ] Review corrected schema: `/home/user/newspulse-ai/supabase/schema.sql`
- [ ] Verify deployment scripts exist:
  - `/home/user/newspulse-ai/supabase/PREFLIGHT_CHECK.sql`
  - `/home/user/newspulse-ai/supabase/POST_DEPLOYMENT_VERIFICATION.sql`
  - `/home/user/newspulse-ai/supabase/SECURITY_TESTS.sql`

### ✓ Infrastructure Verification

- [ ] Supabase project is in ACTIVE state
- [ ] Database connections: green (Supabase dashboard)
- [ ] No ongoing migrations (check Supabase Activity logs)
- [ ] No locked tables (check `pg_locks` if accessible)

### ✓ Communication

- [ ] Slack notification: "Deploying schema to production"
- [ ] Stakeholders notified: Founder, ops team
- [ ] Estimated downtime: ~5 minutes (worst case)

---

## Deployment Procedure

### Step 1: Run Preflight Check

**Purpose:** Detect conflicts before deployment

```bash
# In Supabase SQL Editor, create NEW QUERY
# Copy contents of supabase/PREFLIGHT_CHECK.sql
# Click "Run"
```

**Expected Output:**

```
=== PREFLIGHT SUMMARY ===
INDEXES    | X
POLICIES   | 0
TABLES     | 0
...

=== GO/NO-GO DECISION ===
GO: Database is clean. Safe to deploy schema.sql
```

**If NO-GO:** Stop here. Database already has objects. See [Rollback Procedures](#rollback-procedures) for clean-up.

---

### Step 2: Deploy Schema

**Copy Schema File:**

```bash
# Option A: Direct copy (recommended for Windows users)
# Open file: /home/user/newspulse-ai/supabase/schema.sql
# Select all (Ctrl+A)
# Copy (Ctrl+C)

# Option B: Via command line
cat /home/user/newspulse-ai/supabase/schema.sql | pbcopy  # macOS
cat /home/user/newspulse-ai/supabase/schema.sql | xclip   # Linux
```

**Deploy to Supabase:**

```
1. Go to: https://app.supabase.com/project/yrroytwfdrafvajdfkog/sql/new
2. Create NEW QUERY (important: not opening existing query)
3. Paste entire schema.sql (Ctrl+V)
4. Click "Run" button (bottom-right or Ctrl+Enter)
5. Wait for completion (typically 30-60 seconds)
```

**Success Indicator:**

- No error messages
- Query completes without "ERROR" or "FATAL"
- Browser shows query execution time (e.g., "Query completed in 0.5s")

**Failure Indicator:**

- Red error message: "ERROR: ..."
- Query timeout (>30 seconds with no progress)
- Connection lost message

If failure occurs: See [Rollback Procedures](#rollback-procedures) → Scenario 1

---

### Step 3: Immediate Validation

**Run POST_DEPLOYMENT_VERIFICATION.sql:**

```
1. Supabase SQL Editor → NEW QUERY
2. Copy contents of supabase/POST_DEPLOYMENT_VERIFICATION.sql
3. Click "Run"
```

**Expected Output:**

```
✓ PASS: table_status
✓ PASS: index_status
✓ PASS: policy_status
✓ PASS: trigger_status
✓ PASS: function_status

=== DEPLOYMENT STATUS ===
✓✓✓ DEPLOYMENT SUCCESSFUL ✓✓✓
```

**If ANY FAIL:** Stop immediately. Something is wrong. Review error output and see [Common Issues & Resolution](#common-issues--resolution).

---

### Step 4: Security Validation

**Run SECURITY_TESTS.sql:**

```
1. Supabase SQL Editor → NEW QUERY
2. Copy contents of supabase/SECURITY_TESTS.sql
3. Click "Run"
```

**Expected Output:**

```
✓ PASS: User A sees only their own workspace
✓ PASS: User A sees only their workspace companies
✓ PASS: Anonymous cannot read profiles
... (15+ PASS statements)
```

**If ANY FAIL:** Multi-tenant isolation is broken. Do NOT proceed. Rollback immediately. See [Rollback Procedures](#rollback-procedures) → Scenario 2.

---

### Step 5: Smoke Test (Application Level)

**Manual verification via application UI:**

1. Create new test user:

   ```
   - Sign up with test email: test-deploy-smoke@example.com
   - Verify profile auto-created (check Supabase)
   - Verify redirect to workspace creation
   ```

2. Create test workspace:

   ```
   - Name: "Smoke Test Workspace"
   - Verify workspace created
   - Verify user added as member (status=active)
   ```

3. Create test company:

   ```
   - Name: "Test Company"
   - Verify company accessible
   - Verify non-member cannot see company
   ```

4. Clean up:
   ```
   - Delete test user (via Supabase Auth dashboard)
   - Verify cascade deletes workspace & company
   - Verify no orphaned records in database
   ```

**If any smoke test fails:** See [Common Issues & Resolution](#common-issues--resolution).

---

### ✅ Deployment Complete

**Sign-off:**

- [ ] Preflight check: GO
- [ ] Schema deployment: Success
- [ ] POST_DEPLOYMENT_VERIFICATION: All PASS
- [ ] SECURITY_TESTS: All PASS
- [ ] Smoke tests: All passed
- [ ] Team notified: "Deployment successful"

**Time Invested:** ~15-20 minutes (with validation)

---

## Post-Deployment Validation

### Daily Checks (First Week)

**Every 24 hours for 7 days:**

```sql
-- Check for orphaned records
SELECT COUNT(*) as orphaned_profiles
FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

SELECT COUNT(*) as orphaned_workspaces
FROM public.workspaces
WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- Check RLS policy compliance
SELECT workspace_id, COUNT(*) as member_count
FROM public.workspace_members
WHERE status = 'active'
GROUP BY workspace_id;

-- Check audit trail growth
SELECT action, COUNT(*) as count
FROM public.audit_log
WHERE created_at > now() - interval '24 hours'
GROUP BY action;
```

**Expected:** No orphaned records, normal member counts, audit log growing

---

### Weekly Checks

```sql
-- Policy performance (check for slow queries)
SELECT * FROM pg_stat_statements
WHERE query LIKE '%workspace_members%'
ORDER BY mean_exec_time DESC
LIMIT 5;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Expected:** No slow queries, all indexes being used, tables reasonable size

---

## Rollback Procedures

### Scenario 1: Deployment Failed (Partial Objects)

**Symptoms:**

- Deployment stopped mid-execution
- Error message: "ERROR: ..."
- Some tables/indexes created, others missing

**Recovery:**

```sql
-- OPTION A: RESTART DEPLOYMENT (recommended)
-- If 90%+ of schema deployed, just re-run schema.sql
-- It's idempotent, will skip existing objects

-- OPTION B: FULL ROLLBACK (if something is corrupted)
-- See: docs/infra/ROLLBACK_RECOVERY.md → Scenario 1
-- Requires manual DROP statements
```

**Timing:** 5-10 minutes

---

### Scenario 2: RLS Policies Blocking All Access

**Symptoms:**

- Deployment succeeded
- Customers report "permission denied" on all queries
- Error: `ERROR: new row violates row-level security policy`

**Recovery:**

```sql
-- STEP 1: Check if profiles exist for all users
SELECT COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
-- Should be 0. If > 0, see Scenario 3 below

-- STEP 2: Check workspace membership status
SELECT COUNT(*) as inactive_members
FROM public.workspace_members
WHERE status != 'active';
-- Should be 0 or close to 0

-- STEP 3: Temporarily disable RLS (emergency only)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables ...
-- After investigation, re-enable RLS
```

**Timing:** 5-15 minutes

---

### Scenario 3: Signup Trigger Not Working

**Symptoms:**

- New users created but no profiles
- Users cannot log in
- Error: `new row violates not-null constraint`

**Recovery:**

```sql
-- STEP 1: Verify trigger exists
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Should be 1

-- STEP 2: Manually create missing profiles
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT id, email, created_at, NOW()
FROM auth.users u
WHERE id NOT IN (SELECT id FROM public.profiles);
-- This creates profiles for all users lacking them

-- STEP 3: Verify
SELECT COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
-- Should now be 0
```

**Timing:** 2-5 minutes

---

## Common Issues & Resolution

### Issue 1: "relation already exists"

**Error Message:**

```
ERROR: relation "profiles" already exists
```

**Cause:** Schema already deployed; running twice

**Resolution:**

```
This is OK! The schema uses CREATE TABLE IF NOT EXISTS.
The error appears when CREATE TABLE IF NOT EXISTS runs on existing table,
then trying to add indexes/constraints fails.

Solution: Run POST_DEPLOYMENT_VERIFICATION.sql to confirm all objects exist.
If all objects present, deployment is successful.
```

---

### Issue 2: "policy already exists"

**Error Message:**

```
ERROR: policy "Users can read their own profile" for table "profiles" already exists
```

**Cause:** DROP POLICY IF EXISTS didn't fire; policy wasn't dropped

**Resolution:**

```
This indicates the schema.sql was not fully executed the first time.

Solution:
1. Run PREFLIGHT_CHECK.sql to see what policies already exist
2. Manually drop conflicting policies:
   DROP POLICY IF EXISTS "Users can read their own profile" ON profiles CASCADE;
3. Re-run schema.sql
```

---

### Issue 3: "permission denied" on updates

**Error Message:**

```
ERROR: permission denied for schema public
or
ERROR: new row violates row-level security policy
```

**Cause:** RLS policy is too strict; user doesn't have access

**Resolution:**

```sql
-- STEP 1: Check which policies exist
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- STEP 2: Test policy manually
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"user-id-here","email":"user@example.com"}';

SELECT COUNT(*) FROM public.companies;
-- Should return number of companies user's workspace

-- STEP 3: If 0 rows, user might not be workspace member
SELECT COUNT(*) FROM public.workspace_members
WHERE user_id = 'user-id-here' AND status = 'active';
-- Should be >= 1
```

---

### Issue 4: Deployment takes >60 seconds

**Symptoms:**

- Schema deployment running for 1+ minutes
- No error but not completing

**Cause:** Large number of policies; slow index creation on big tables

**Resolution:**

```
Wait. The schema has 37 policies and 25 indexes.
On first deployment, PostgreSQL needs to:
- Create 15 tables
- Create 25 indexes (all new)
- Create 37 policies (all new)
- Create 1 trigger
- Create 1 function

This legitimately takes 30-120 seconds on first run.

Just wait. Do not cancel. Do not refresh.

After 2 minutes, if still running, check Supabase logs.
```

---

## Performance Monitoring

### Critical Metrics

**Daily Checks:**

```sql
-- 1. RLS Policy Latency
SELECT
  tablename,
  COUNT(*) as policy_count,
  (SELECT AVG(duration) FROM pg_stat_statements
   WHERE query LIKE '%workspace_members%') as avg_policy_check_ms
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
-- RLS policy checks should be < 1ms

-- 2. Index Hit Ratio
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;
-- All indexes should have idx_scan > 0 (being used)

-- 3. Slow Queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking > 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Weekly Performance Review

```sql
-- Query performance trends
SELECT
  DATE_TRUNC('day', query_start_time)::date as day,
  COUNT(*) as query_count,
  AVG(query_time_ms) as avg_latency,
  MAX(query_time_ms) as max_latency
FROM query_log
GROUP BY DATE_TRUNC('day', query_start_time)
ORDER BY day DESC
LIMIT 7;

-- Table growth rate
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Incident Response

### Level 1: Minor Issue (Service Degraded)

**Symptoms:**

- Some users seeing "slow" queries
- Occasional "permission denied" errors
- 1-5 users affected

**Response Time:** Within 1 hour

**Actions:**

1. Check RLS policy latency (see [Performance Monitoring](#performance-monitoring))
2. Check for missing indexes
3. Add indexes if needed:
   ```sql
   create index if not exists workspace_members_workspace_user_status_idx
     on public.workspace_members(workspace_id, user_id, status);
   ```
4. Monitor query performance before/after

---

### Level 2: Major Issue (Service Down)

**Symptoms:**

- Most users seeing "permission denied"
- Cannot create workspaces
- Cannot query companies

**Response Time:** Immediate (< 15 minutes)

**Actions:**

1. Verify RLS is enabled:

   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity = true;
   ```

2. Check if profiles exist:

   ```sql
   SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles);
   ```

   If > 0, see [Scenario 3: Signup Trigger Not Working](#scenario-3-signup-trigger-not-working)

3. Check workspace membership:

   ```sql
   SELECT COUNT(*) FROM public.workspace_members WHERE status = 'active';
   ```

4. If critical: Temporarily disable RLS (emergency):

   ```sql
   ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
   -- ... disable all app tables ...
   -- Fix issues while RLS is disabled
   -- Re-enable after fix
   ```

5. Once fixed, re-enable RLS and verify with SECURITY_TESTS.sql

---

### Level 3: Critical Issue (Data Corruption)

**Symptoms:**

- Orphaned records detected
- Foreign key constraint violations
- Cascade delete creating unexpected data loss

**Response Time:** Immediate (< 5 minutes)

**Actions:**

1. STOP all schema modifications (no migrations, no ALTER TABLE)
2. Create backup snapshot (Supabase auto-creates daily; request point-in-time restore)
3. Identify affected tables:
   ```sql
   -- Check for orphaned records
   SELECT COUNT(*) FROM public.ai_systems
   WHERE company_id NOT IN (SELECT id FROM public.companies);
   ```
4. Document incident: what happened, when, which records affected
5. Contact Supabase support for point-in-time restore if needed
6. Do NOT attempt manual repairs—let Supabase restore from backup

---

## Maintenance Tasks

### Weekly Maintenance

**Task 1: Analyze Table Growth**

```sql
SELECT
  tablename,
  n_live_tup as live_rows,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Action:** If any table > 1GB, analyze query patterns for optimization

**Task 2: Index Maintenance**

```sql
-- Reindex unused indexes
SELECT indexname FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_scan;
```

**Action:** Consider dropping unused indexes (frees space, speeds writes)

**Task 3: Vacuum & Analyze**

```
-- Supabase runs this automatically, but can be manual:
VACUUM ANALYZE public.workspace_members;
VACUUM ANALYZE public.companies;
```

### Monthly Maintenance

**Task 1: Audit Log Cleanup**

```sql
-- Archive old audit logs (older than 90 days)
-- Then delete
DELETE FROM public.audit_log
WHERE created_at < NOW() - interval '90 days';
```

**Task 2: Policy Performance Review**

```sql
-- Review slowest RLS checks
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%workspace_members%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Action:** If any RLS check > 10ms, investigate and add indexes

**Task 3: Data Integrity Check**

```sql
-- Verify no orphaned records
SELECT COUNT(*) as orphaned_ai_systems
FROM public.ai_systems
WHERE company_id NOT IN (SELECT id FROM public.companies)
   OR workspace_id NOT IN (SELECT id FROM public.workspaces);
```

---

## Quick Reference: Common Commands

```bash
# View current schema
psql -h db.yrroytwfdrafvajdfkog.supabase.co -U postgres -d postgres \
  -c "\dt public.*"

# Export schema
pg_dump -h db.yrroytwfdrafvajdfkog.supabase.co -U postgres --schema-only > schema_backup.sql

# Restore from backup
psql -h db.yrroytwfdrafvajdfkog.supabase.co -U postgres < schema_backup.sql
```

---

## Escalation Contacts

**Level 1 (Minor):** Check [Common Issues & Resolution](#common-issues--resolution)  
**Level 2 (Major):** See [Incident Response](#incident-response)  
**Level 3 (Critical):** Contact Supabase support + Founder

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-12  
**Next Review:** After first production month (v1.1)
