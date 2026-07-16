# Supabase Deployment Runbook — Step-by-Step for Founder

**Purpose:** Deploy the EURO AI database schema to production Supabase  
**Effort:** 20 minutes (mostly copy/paste)  
**Impact:** Enables user signup, workspace creation, all core features  
**Prerequisites:** Supabase account access, Supabase project created, MFA if required

---

## Part 1: Verify Supabase Project Access (2 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Login with your credentials
3. Select project: **newspulse-ai**
4. You should see:
   - Project name in header
   - SQL Editor tab (left sidebar)
   - Database section with Tables list
5. **If you see an error:** Project not found or auth failed
   - Contact: Support or check email for Supabase invite link

---

## Part 2: Preflight Check — Verify Database is Empty (3 min)

**Why:** The schema uses idempotent patterns (DROP IF EXISTS), but we verify the database is truly clean first.

### Step 1: Open SQL Editor
1. Click **SQL Editor** in left sidebar
2. Click **New Query**
3. Paste this query:

```sql
-- PREFLIGHT_CHECK: Verify database is empty before schema deployment
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public') AS existing_tables,
  (SELECT COUNT(*) FROM information_schema.indexes 
   WHERE schemaname = 'public') AS existing_indexes,
  (SELECT COUNT(*) FROM information_schema.constraint_column_usage 
   WHERE table_schema = 'public') AS existing_policies;
```

4. Click **Run** (or Ctrl+Enter)
5. **Expected result:**
   ```
   existing_tables | existing_indexes | existing_policies
   0               | 0                | 0
   ```

6. **If you see non-zero values:**
   - **DO NOT PROCEED** — database is not empty
   - Contact Governor or investigate what tables exist
   - You may need to DROP the existing objects first

---

## Part 3: Deploy Database Schema (5 min)

### Step 1: Copy the schema file
1. Open this file in your editor: `/home/user/newspulse-ai/supabase/schema.sql`
2. Select all text (Ctrl+A / Cmd+A)
3. Copy to clipboard (Ctrl+C / Cmd+C)

### Step 2: Paste into Supabase SQL Editor
1. Go back to Supabase SQL Editor
2. Click **New Query** (create a fresh query window)
3. Delete any placeholder text
4. Paste the entire schema.sql file (Ctrl+V / Cmd+V)
5. **You should see approximately 850 lines of SQL**

### Step 3: Execute the schema
1. Click **Run** button (or Ctrl+Enter)
2. **Expected:** "Query executed successfully" message at bottom
3. **Timing:** Should complete in 30-60 seconds
4. **Progress indicator:** Blue progress bar at bottom

### Step 4: Handle any errors (if they occur)
**If you see an error message:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `relation "X" already exists` | Table/index duplicate | Run DROP CASCADE, then re-run schema |
| `syntax error at line N` | SQL syntax problem | Don't edit; report to Governor |
| `permission denied for schema public` | Auth issue | Check RLS policies; may need service role key |
| `connection timeout` | Network issue | Wait 30s, try again |

---

## Part 4: Post-Deployment Verification (5 min)

### Step 1: Verify all objects created
1. Click **New Query** in SQL Editor
2. Paste this verification script:

```sql
-- POST_DEPLOYMENT_VERIFICATION: Confirm all schema objects
SELECT 
  'Tables' AS object_type, COUNT(*) AS count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  'Indexes', COUNT(*)
FROM information_schema.indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'RLS Policies', COUNT(*)
FROM information_schema.constraint_column_usage 
WHERE table_schema = 'public';
```

3. Click **Run**
4. **Expected result:**
   ```
   object_type  | count
   Tables       | 15
   Indexes      | 26
   RLS Policies | 37
   ```

5. **If counts don't match:**
   - Tables: expect 15 (9 app tables + 6 HERCULES tables + 1 audit)
   - Indexes: expect 26 (performance optimization)
   - RLS Policies: expect 37 (multi-tenant isolation)
   - If mismatch: Re-run schema.sql (idempotent pattern handles this)

### Step 2: Spot-check key tables exist
1. Click **New Query**
2. Paste:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' ORDER BY tablename;
```

3. Click **Run**
4. **You should see these tables in the list:**
   - `audit_logs` (audit trail)
   - `companies` (customer organizations)
   - `hercules_*` (6 tables for incident management state)
   - `profiles` (user profiles)
   - `workspace_members` (team access)
   - `workspaces` (customer workspaces)
   - And others (15 total)

---

## Part 5: Security Validation (5 min)

### Step 1: Verify Row-Level Security (RLS)
1. Click **New Query**
2. Paste this security test:

```sql
-- SECURITY_TEST: Verify RLS policies are enforced
-- This test confirms anonymous users cannot see data
SET role anon;
SELECT COUNT(*) FROM profiles;
-- Expected: 0 rows (RLS blocks access)
-- Reset role
RESET role;
```

3. Click **Run**
4. **Expected:** Query succeeds, returns 0 for anonymous user
5. **If you get permission denied error:** Good! RLS is working (that's what we want)

### Step 2: Verify multi-tenant isolation
1. Click **New Query**
2. Paste:

```sql
-- SECURITY_TEST: Verify service role can see schema
SET role service_role;
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
RESET role;
```

3. Click **Run**
4. **Expected:** Query succeeds, shows 15 (service role has full access)

---

## Part 6: Complete and Verify Access from App

### Step 1: Configure app environment
In your `.env.local` (or Vercel env vars), confirm:
```
NEXT_PUBLIC_SUPABASE_URL=https://yrroytwfdrafvajdfkog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_supabase_dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_supabase_dashboard>
```

### Step 2: Test from app
1. Restart your local dev server: `npm run dev`
2. Try to sign up: `/auth/signup`
3. You should be able to:
   - Create an account
   - Profile automatically created
   - Create a workspace
   - Access workspace dashboard

---

## Troubleshooting Guide

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| **"relation does not exist"** | Schema not deployed | Run Part 3 again |
| **Signup fails with 403** | RLS policies blocking auth | Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct |
| **Can't see my data in app** | Workspace isolation or auth issue | Check workspaces table and workspace_members |
| **Slow queries on workspaces** | Missing indexes | Verify indexes created (Part 4, Step 2) |
| **"permission denied" in SQL Editor** | Role/auth issue | Use default role; don't manually SET ROLE |

---

## What to Do After Deployment

1. **Test the full signup flow** (10 min manual smoke test)
   - Create user account
   - Verify profile auto-created
   - Create workspace
   - Invite team member
   - Verify access control

2. **Set up backups** (recommended, 5 min)
   - Go to Supabase: Settings → Backups
   - Enable daily backups
   - Store backup URL in secure location

3. **Configure email auth** (if not done)
   - Supabase Dashboard → Authentication → Providers
   - Enable Email/Password
   - Configure SMTP for password resets

4. **Next steps**
   - Enable GitHub Actions secrets (VERCEL_DEPLOYMENT_URL, ADMIN_TOKEN)
   - Activate DNA-GOV production monitors
   - Begin customer onboarding

---

## Support

**If something goes wrong:**
1. Check Troubleshooting Guide above
2. Screenshot the error
3. Check: `docs/infra/DEPLOYMENT_READINESS_REPORT.md` for context
4. Verify query syntax in `supabase/schema.sql`
5. Contact Governor or engineer with:
   - Error message (verbatim)
   - Step where it failed
   - Screenshot if possible

**Rollback (if needed):**
- The schema uses DROP IF EXISTS patterns, so re-running is safe
- To completely start over:
  - Go to Supabase: Settings → Danger Zone → Delete Database
  - Recreate database
  - Re-run Part 3

---

## Checklist

- [ ] Part 1: Verified Supabase project access
- [ ] Part 2: Ran preflight check, database empty
- [ ] Part 3: Copied schema.sql and deployed
- [ ] Part 3: Schema deployed successfully (no errors)
- [ ] Part 4: Verified all tables/indexes/policies count
- [ ] Part 4: Spot-checked key tables exist
- [ ] Part 5: Ran RLS security test
- [ ] Part 5: Verified service role access
- [ ] Part 6: Configured app environment variables
- [ ] Part 6: Tested signup flow end-to-end
- [ ] **DEPLOYMENT COMPLETE** ✅

**Timestamp:** _______________  
**Status:** ☐ SUCCESS ☐ FAILED (describe issue: ___________________)

---

**Questions?** Check `docs/infra/DEPLOYMENT_READINESS_REPORT.md` for architectural context or contact Governor.
