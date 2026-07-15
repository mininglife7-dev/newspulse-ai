# Pre-Flight Verification (After Supabase Deployment)

**Purpose:** Automated verification that Supabase schema deployed correctly and is ready for production launch  
**Audience:** Founder, Governor  
**Time:** 20 minutes  
**When:** Immediately after Supabase deployment completes  
**Must complete before:** Customer signup is enabled

---

## Overview

This checklist verifies:
1. ✅ All 9 database tables created
2. ✅ All indexes deployed
3. ✅ All RLS policies active
4. ✅ Email authentication enabled
5. ✅ Supabase connection working from production
6. ✅ Data isolation verified (cross-tenant access blocked)
7. ✅ Signup flow end-to-end working

**If any check fails:** Stop. Do not proceed with customer launch. Escalate to Governor.

---

## Phase 1: Database Structure Verification (5 min)

### Step 1.1: Verify all 9 tables exist

**In Supabase SQL Editor, run:**

```sql
select count(*) as table_count,
       string_agg(table_name, ', ' order by table_name) as tables
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE';
```

**Expected result:**
```
table_count | tables
9           | ai_systems, companies, evidence, obligations, profiles, remediation_plans, risk_assessments, workspace_members, workspaces
```

**If you see fewer than 9 tables:**
- ❌ FAIL: Schema deployment incomplete
- Action: Re-run full schema SQL in Supabase SQL Editor
- Escalate to Governor

---

### Step 1.2: Verify all 13 indexes created

**In Supabase SQL Editor, run:**

```sql
select count(*) as index_count,
       string_agg(indexname, ', ' order by indexname)
from pg_indexes
where schemaname = 'public'
  and indexname not like 'pg_toast%';
```

**Expected result:** At least 13 indexes

**Sample indexes (check for these specifically):**
```sql
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename in ('ai_systems', 'companies', 'obligations', 'workspace_members', 'workspaces')
order by tablename, indexname;
```

**Must see these indexes:**
- `profiles_email_idx` → profiles table
- `workspaces_owner_id_idx` → workspaces table
- `workspaces_slug_idx` → workspaces table
- `workspace_members_workspace_idx` → workspace_members table
- `workspace_members_user_idx` → workspace_members table
- `companies_workspace_idx` → companies table
- `ai_systems_company_idx` → ai_systems table
- `ai_systems_workspace_idx` → ai_systems table
- `risk_assessments_ai_system_idx` → risk_assessments table
- `risk_assessments_company_idx` → risk_assessments table
- `obligations_company_idx` → obligations table
- `obligations_status_idx` → obligations table
- `evidence_company_idx` → evidence table
- `evidence_obligation_idx` → evidence table
- `remediation_plans_company_idx` → remediation_plans table
- `remediation_plans_status_idx` → remediation_plans table

**If any index is missing:**
- ⚠️ WARNING: Performance may be degraded
- Action: Review schema.sql for missing indexes
- Decision: Can proceed if indexes are non-critical, but should re-run schema to add them

---

## Phase 2: Row-Level Security (RLS) Verification (5 min)

### Step 2.1: Verify RLS enabled on all tables

**In Supabase SQL Editor, run:**

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename not like 'pg_%'
order by tablename;
```

**Expected result:** All tables should have `rowsecurity = true`

**Example output:**
```
tablename           | rowsecurity
ai_systems          | true
companies           | true
evidence            | true
obligations         | true
profiles            | true
remediation_plans   | true
risk_assessments    | true
workspace_members   | true
workspaces          | true
```

**If any table shows `false`:**
- ❌ FAIL: RLS not enabled
- Action: Run this for each table with RLS disabled:
  ```sql
  alter table public.[table_name] enable row level security;
  ```
- Then proceed to Step 2.2

---

### Step 2.2: Verify RLS policies exist

**In Supabase SQL Editor, run:**

```sql
select count(*) as policy_count
from pg_policies
where schemaname = 'public';
```

**Expected result:** 14+ policies

**If count < 14:**
- ❌ FAIL: RLS policies incomplete
- Action: Re-run full schema SQL in Supabase SQL Editor
- Escalate to Governor

---

### Step 2.3: Test RLS isolation with two test users

**Create two test workspaces and verify data isolation:**

1. **Login to Vercel deployment** (`https://<your-url>/auth/signup`)
   - Email: `test-user-1@localhost`
   - Create workspace: `Test Company 1`
   - Create AI system: `System A1`

2. **Logout, then create second user**
   - Email: `test-user-2@localhost`
   - Create workspace: `Test Company 2`
   - Create AI system: `System B1`

3. **Verify isolation in Supabase SQL Editor**

   **As service_role (bypass RLS to verify data exists):**
   ```sql
   -- These queries should return data (verifying both users' data exists)
   select user_id, role, status from workspace_members 
   where email in ('test-user-1@localhost', 'test-user-2@localhost');
   
   -- Should see 2 workspace memberships
   ```

   **Now test as authenticated user (RLS enforced):**
   - Use `set local role authenticated; set local user_id to '<user-1-id>';`
   - Query: `select * from workspaces;`
   - Should return only `Test Company 1` workspace
   - Should NOT return `Test Company 2` workspace

4. **Decision:**
   - ✅ If User 1 sees only User 1's data: RLS working correctly
   - ❌ If User 1 can see User 2's data: RLS is broken
     - Action: Stop. Debug RLS policies.
     - Escalate to Governor immediately.

---

## Phase 3: Authentication Verification (3 min)

### Step 3.1: Email provider enabled

1. Go to Supabase dashboard → **Project Settings**
2. Left sidebar → **Auth → Providers**
3. Verify **Email** is toggled **ON** (blue switch)

**If Email is disabled:**
- Click toggle to enable
- Click **Save**
- Wait 30 seconds for configuration to apply

---

### Step 3.2: Test email signup flow

1. **Open production URL:** `https://<your-url>/auth/signup`
2. **Enter email:** `test-signup-$(date +%s)@example.com` (unique each time)
3. **Click "Send verification email"**
4. **Check inbox** (should arrive in <1 minute)
   - If not in Inbox, check Spam
   - If email doesn't arrive after 2 minutes: Email auth is broken
5. **Click verification link in email**
6. **Confirm redirected to** `https://<your-url>/auth/callback` then dashboard
7. **Verify dashboard loads** (should show empty state, no errors)

**If email doesn't arrive or link fails:**
- ❌ FAIL: Email authentication broken
- Action: 
  - Check Supabase email settings (Project Settings → Auth → Email Templates)
  - Verify SMTP provider configured (if using custom provider)
  - Re-enable Email provider (Step 3.1)
- Escalate to Governor

---

## Phase 4: Production Health Check (3 min)

### Step 4.1: Health endpoint responds

**Open in browser:** `https://<your-url>/api/health`

**Expected response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-15T14:30:00Z"
}
```

**If you see error or "unhealthy":**
- ❌ FAIL: Production configuration broken
- Action:
  - Check Vercel environment variables
  - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
  - Check Supabase project is accessible
- Escalate to Governor

---

### Step 4.2: Production health endpoint responds

**Open in browser:** `https://<your-url>/api/production-health`

**Expected response (200 OK):**
```json
{
  "status": "healthy",
  "checks": {
    "supabase_connection": "healthy",
    "database_query": "healthy",
    "rls_enforcement": "healthy"
  },
  "timestamp": "2026-07-15T14:30:00Z"
}
```

**If any check shows "unhealthy":**
- ⚠️ WARNING: Production not fully ready
- Take note of which check failed
- If `supabase_connection` failed: Database connection issue
  - Action: Verify Supabase project status and credentials
- If `database_query` failed: Database query issue
  - Action: Verify schema deployed correctly
- If `rls_enforcement` failed: RLS policies not working
  - Action: Go back to Phase 2 and re-verify RLS
- Escalate to Governor

---

## Phase 5: Error Rate Baseline (2 min)

### Step 5.1: Verify no errors in production logs

**In Vercel dashboard:**
1. Go to **Logs** (top navigation)
2. Filter by **Function Logs**
3. Look for any `5xx` errors in the last 10 minutes
4. Should see none (or only test requests from verification)

**If you see 5xx errors:**
- ⚠️ WARNING: Errors in production
- Action: Check error message details
- Common causes:
  - Database connection failed
  - Missing environment variables
  - RLS policy issue
- Escalate to Governor

---

### Step 5.2: Baseline metrics recorded

Document these baseline values (will be compared to post-launch metrics):

```
Date: 2026-07-15
Time: 14:35 UTC

✓ Supabase tables: 9/9 created
✓ Indexes: 13+ deployed
✓ RLS policies: Active
✓ Email auth: Enabled
✓ /api/health: Responding
✓ /api/production-health: All checks green
✓ Signup flow: Working
✓ Data isolation: Verified (cross-tenant access blocked)
✓ Error rate: < 0.1%
✓ Response time p95: < 500ms
```

---

## Final Sign-Off

**All checks passed?**

- [ ] ✅ All 9 tables created
- [ ] ✅ 13+ indexes deployed
- [ ] ✅ RLS policies active on all tables
- [ ] ✅ Data isolation verified
- [ ] ✅ Email auth enabled
- [ ] ✅ Signup flow works end-to-end
- [ ] ✅ `/api/health` responds 200 OK
- [ ] ✅ `/api/production-health` all checks green
- [ ] ✅ No 5xx errors in production logs
- [ ] ✅ Baseline metrics recorded

**If ALL checks pass:**
✅ **CLEARED FOR LAUNCH**

Proceed to `docs/LAUNCH_DAY_PROCEDURES.md` → Follow T-1 hour pre-launch checklist

**If ANY check fails:**
❌ **DO NOT PROCEED**

Document which check failed and escalate to Governor.

---

## Troubleshooting Guide

| Issue | Symptom | Fix |
|-------|---------|-----|
| Schema not deployed | "relation does not exist" error | Re-run full schema.sql in Supabase SQL Editor |
| RLS not enabled | Queries bypass data isolation | Run `alter table [name] enable row level security` for each table |
| RLS broken | User A sees User B's data | Debug RLS policies in Supabase, check workspace_membership logic |
| Email auth not working | Signup emails don't arrive | Enable Email provider in Project Settings → Auth → Providers |
| Environment variables missing | `/api/health` shows "unhealthy" | Add `NEXT_PUBLIC_SUPABASE_URL` and key to Vercel dashboard |
| Database query slow | Response time > 1 second | Verify indexes created, check Supabase connection |
| Production errors | 5xx errors in Vercel logs | Check Supabase project status, verify connection pool not exhausted |

---

## Document Control

**Created by:** Governor  
**Purpose:** Enable confident production launch after Supabase deployment  
**Valid:** After Supabase schema deployed  
**Last updated:** 2026-07-15

---

**Do not proceed to customer launch without completing all verification steps above.**
