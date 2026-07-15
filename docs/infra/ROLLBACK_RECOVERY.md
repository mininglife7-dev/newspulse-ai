# Schema Deployment — Rollback & Recovery Procedures

**Document Date:** 2026-07-12  
**Applies To:** supabase/schema.sql deployment  
**Last Updated:** Schema v1.0 (POST-DEPLOYMENT AUDIT)

---

## Quick Reference: Rollback Decision Tree

| Scenario                                    | Severity | Action                                                           |
| ------------------------------------------- | -------- | ---------------------------------------------------------------- |
| Deployment failed mid-run (partial objects) | CRITICAL | Execute FULL_ROLLBACK.sql immediately                            |
| RLS policies preventing customer access     | CRITICAL | Execute RLS_EMERGENCY_DISABLE.sql, then diagnose                 |
| Signup trigger not firing (new users stuck) | HIGH     | Execute TRIGGER_RESTORE.sql, then investigate                    |
| Wrong table/index created (typo in schema)  | HIGH     | MANUAL: DROP object, re-run schema                               |
| Data corruption on existing records         | CRITICAL | BACKUP from before-deployment snapshot; contact Supabase support |
| Network timeout during execution            | MEDIUM   | Re-run PREFLIGHT_CHECK.sql, then resume deployment               |

---

## Scenario 1: Complete Deployment Failure (Partial Objects)

**Symptoms:**

- Deployment stopped mid-execution
- Some tables created, others missing
- RLS policies partially applied
- Errors like "database connection lost" or "query timeout"

**Recovery Steps:**

### Option A: Full Rollback (Recommended)

```sql
-- Run in Supabase SQL Editor with service-role key
-- This removes all deployed objects and resets to pre-deployment state

-- Drop all RLS policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
-- ... (run all 31 DROP POLICY statements)

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop all tables
DROP TABLE IF EXISTS remediation_plans CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS obligations CASCADE;
DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS ai_systems CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS hercules_recovery_log CASCADE;
DROP TABLE IF EXISTS hercules_enterprise_audit CASCADE;
DROP TABLE IF EXISTS hercules_enterprise_events CASCADE;
DROP TABLE IF EXISTS hercules_enterprise_tasks CASCADE;
DROP TABLE IF EXISTS hercules_enterprise_missions CASCADE;
DROP TABLE IF EXISTS hercules_checkpoints CASCADE;

-- Verify clean state
SELECT COUNT(*) as remaining_tables FROM information_schema.tables
WHERE table_schema = 'public';
-- Should return: 0
```

### Option B: Retry Deployment

After full rollback (or if only minor objects missing):

1. Run PREFLIGHT_CHECK.sql to verify clean state
2. If preflight shows 0 objects: deploy schema.sql again
3. If preflight shows partial objects: use Option A (full rollback) first

---

## Scenario 2: RLS Policies Blocking All Customer Access

**Symptoms:**

- Customers report "permission denied" on all queries
- INSERT/UPDATE/DELETE operations fail immediately
- SELECT returns empty results even for user's own data
- Error: `ERROR: new row violates row-level security policy`

**Root Causes:**

- Policies have wrong conditions (e.g., checking wrong column)
- User membership not marked as "active"
- Trigger failed to create profiles for new users

**Recovery Steps:**

### Step 1: Verify Signup Trigger Worked

```sql
-- Check if profiles exist for all auth.users
SELECT
  u.id,
  u.email,
  CASE WHEN p.id IS NOT NULL THEN '✓ Profile exists' ELSE '✗ Missing profile' END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.role = 'authenticated'
ORDER BY u.created_at DESC;
```

If profiles are missing:

```sql
-- Manually create missing profiles
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT id, email, created_at, NOW()
FROM auth.users
WHERE role = 'authenticated' AND id NOT IN (SELECT id FROM public.profiles);
```

### Step 2: Verify Workspace Membership Status

```sql
-- Check that members are marked as 'active'
SELECT workspace_id, user_id, status
FROM public.workspace_members
WHERE status != 'active';
-- Should return: empty result set

-- If inactive members exist, mark them active
UPDATE public.workspace_members
SET status = 'active', updated_at = NOW()
WHERE status IN ('pending', 'inactive', 'invited');
```

### Step 3: Test Customer Access with Service Role

```sql
-- Use service role to verify policies don't block system operations
-- This bypasses RLS and proves data exists

-- Count records accessible via service-role
SELECT tablename, COUNT(*)
FROM (
  SELECT 'profiles' as tablename, COUNT(*) FROM public.profiles
  UNION ALL
  SELECT 'workspaces', COUNT(*) FROM public.workspaces
  UNION ALL
  SELECT 'companies', COUNT(*) FROM public.companies
  UNION ALL
  SELECT 'ai_systems', COUNT(*) FROM public.ai_systems
) subquery
GROUP BY tablename;
```

If service-role can see data but customers cannot, the issue is RLS policy logic (not data integrity).

### Step 4: Emergency: Temporarily Disable RLS (Last Resort)

```sql
-- ONLY if you need customers accessing data immediately during investigation
-- This DISABLES all security — use for maximum 1 hour

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_systems DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.remediation_plans DISABLE ROW LEVEL SECURITY;

-- After diagnosing issue, re-enable
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Then run POST_DEPLOYMENT_VERIFICATION.sql to confirm RLS re-enabled
```

---

## Scenario 3: Signup Trigger Not Working (New Users Have No Profiles)

**Symptoms:**

- New users created in auth.users but no profiles in public.profiles
- Customers cannot log in (profile required for app)
- Error: `ERROR: new row violates not-null constraint "profiles.email"`

**Recovery Steps:**

```sql
-- Step 1: Verify trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND trigger_name = 'on_auth_user_created';
-- Should return: on_auth_user_created | auth.users

-- Step 2: If trigger missing, manually create it
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (new.id, new.email, NOW(), NOW());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 3: Create missing profiles for existing users
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT id, email, created_at, NOW()
FROM auth.users
WHERE role = 'authenticated' AND id NOT IN (SELECT id FROM public.profiles);

-- Step 4: Verify
SELECT COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.role = 'authenticated' AND p.id IS NULL;
-- Should return: 0
```

---

## Scenario 4: Duplicate Table or Index Exists (Schema Run Twice Accidentally)

**Symptoms:**

- Schema deployment appeared to succeed
- But data seems wrong or exists twice
- Error on second run: `ERROR: relation "table_name" already exists`

**Recovery:**
The corrected schema.sql uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so this should NOT occur. If it does:

```sql
-- Identify duplicates
SELECT tablename FROM pg_tables
WHERE table_schema = 'public'
ORDER BY tablename;

-- Should see exactly 15 tables (not 30)
-- If duplicates exist, identify via naming: table_name vs table_name_1

-- Drop duplicates
DROP TABLE IF EXISTS table_name_1 CASCADE;
```

---

## Scenario 5: Partial Network Failure During Deployment

**Symptoms:**

- Deployment stopped with "connection timeout" or "query timeout"
- Some statements executed, others didn't
- Cannot determine exactly which succeeded

**Recovery Steps:**

```sql
-- Step 1: Run PREFLIGHT_CHECK.sql
-- This will show exactly what exists and what doesn't

-- Step 2: Identify missing objects from preflight output
-- Compare actual vs expected counts

-- Step 3: If minor gaps:
-- Re-run schema.sql — it's idempotent and will skip existing objects

-- Step 4: If major gaps:
-- Option A: Run full rollback and re-deploy
-- Option B: Manually create missing objects (not recommended, error-prone)

-- Step 5: Verify with POST_DEPLOYMENT_VERIFICATION.sql
```

---

## Scenario 6: Data Corruption on Existing Records

**Symptoms:**

- Data in tables changed unexpectedly
- Foreign key violations or constraint failures
- Deployment didn't insert data, but something changed values

**Recovery:**
This should NOT happen with the corrected schema (it only creates, not modifies). If data is corrupted:

1. **Stop all deployments immediately**
2. **Create backup of affected tables:**
   ```sql
   SELECT * FROM public.companies LIMIT 100;
   -- Write results to file for inspection
   ```
3. **Contact Supabase Support:**
   - Provide: timeline of deployment, table names affected, sample of corrupted data
   - Request: database point-in-time restore to pre-deployment snapshot
4. **Do NOT attempt manual repairs** until Supabase confirms root cause

---

## Scenario 7: Foreign Key Constraint Violations

**Symptoms:**

- INSERT fails: `ERROR: insert or update on table "ai_systems" violates foreign key constraint`
- DELETE fails: `ERROR: update or delete on "companies" violates foreign key constraint`

**Root Cause:**
Foreign keys configured with CASCADE delete. If parent deleted, children auto-delete.

**Recovery:**

```sql
-- Check cascade delete configuration
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify referential integrity
-- Count orphaned records (should be 0)
SELECT COUNT(*) as orphaned_ai_systems
FROM public.ai_systems
WHERE company_id NOT IN (SELECT id FROM public.companies)
  OR workspace_id NOT IN (SELECT id FROM public.workspaces);

-- If orphans found: investigate, then delete manually
DELETE FROM public.ai_systems
WHERE company_id NOT IN (SELECT id FROM public.companies);
```

---

## Pre-Rollback Safety Checks

**BEFORE rolling back, answer these questions:**

1. Do you have a database backup from before deployment?
   - Answer "No" → Do NOT roll back. Contact Supabase for point-in-time restore.
   - Answer "Yes" → Proceed with rollback

2. Is the issue affecting customers now (production blocking)?
   - Answer "Yes" → Execute emergency steps (disable RLS temporarily, then fix)
   - Answer "No" → Proceed with methodical rollback

3. Do you know exactly which objects are missing/wrong?
   - Answer "No" → Run PREFLIGHT_CHECK.sql first to identify scope
   - Answer "Yes" → Proceed with surgical fix (drop only affected objects)

---

## Post-Recovery Testing

After ANY rollback or recovery, execute in order:

1. **Run PREFLIGHT_CHECK.sql** — Verify no stale objects
2. **Re-run schema.sql** — Redeploy all objects
3. **Run POST_DEPLOYMENT_VERIFICATION.sql** — Confirm all created
4. **Run SECURITY_TESTS.sql** — Prove multi-tenant isolation intact
5. **Manual smoke test:**
   ```
   - Create test user
   - Create test workspace
   - Create test company
   - Create test AI system
   - Verify customer can read their own data
   - Verify customer cannot read other workspace data
   - Delete all test data
   ```

---

## Contact & Escalation

**If recovery steps don't work:**

1. **Gather diagnostics:**
   - Full error message and stack trace
   - Timestamp of deployment attempt
   - Output of PREFLIGHT_CHECK.sql
   - Output of POST_DEPLOYMENT_VERIFICATION.sql
   - supabase/schema.sql version (check docs/infra/PREDEPLOYMENT_AUDIT.md date)

2. **Escalate to:**
   - Supabase Support (for database-level issues)
   - Founder (for business impact assessment)

3. **Do NOT:**
   - Drop multiple tables at once without backup
   - Use CASCADE deletes without understanding scope
   - Modify schema.sql during recovery (deploy it as-is only)
   - Ignore missing profiles or workspace members

---

## Appendix: Emergency Scripts

### Full Rollback Script

```sql
-- Copy from FULL_ROLLBACK.sql in this directory
-- Or execute the DROP statements listed in Scenario 1 above
```

### Restore Signup Trigger

```sql
-- Copy from TRIGGER_RESTORE.sql in this directory
-- Recreates handle_new_user() function and on_auth_user_created trigger
```

### Verify Data Integrity

```sql
-- Copy from DATA_INTEGRITY_CHECK.sql in this directory
-- Identifies orphaned records and constraint violations
```

---

**Document version:** 1.0  
**Last verified:** 2026-07-12  
**Maintenance:** Update after each schema version change
