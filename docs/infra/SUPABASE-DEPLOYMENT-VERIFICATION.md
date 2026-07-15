# Supabase Deployment Verification Guide

**Objective:** Validate that the production schema deployed successfully and is production-ready  
**Timeline:** 10-15 minutes  
**When to Use:** Immediately after running `supabase/schema.sql` in Supabase SQL Editor  
**Status:** READY FOR EXECUTION

---

## Executive Summary

After deploying the schema to production Supabase, use these exact SQL queries to verify:

1. ✅ All required tables exist
2. ✅ Row-Level Security (RLS) is enabled
3. ✅ Profile auto-creation trigger is installed
4. ✅ Foreign key relationships are correct
5. ✅ All indexes are present
6. ✅ RLS policies are active

Do not consider deployment successful until ALL verification queries pass.

---

## Pre-Verification Checklist

Before running verification:

- [ ] Schema deployment completed successfully (Supabase showed "Success!")
- [ ] No error messages in Supabase SQL Editor output
- [ ] You're logged into the correct Supabase project
- [ ] You have access to the SQL Editor

---

## Verification Queries

### Query 1: Verify Core Tables Exist

**Purpose:** Confirm all required customer-data tables were created

**Run this in Supabase SQL Editor:**

```sql
-- Check that all required tables exist
select
  table_schema,
  table_name,
  case
    when table_schema = 'auth' then '✓ Auth System'
    when table_name = 'profiles' then '✓ User Profiles'
    when table_name = 'workspaces' then '✓ Organizations'
    when table_name = 'workspace_members' then '✓ Memberships'
    when table_name = 'companies' then '✓ Governed Companies'
    when table_name = 'ai_systems' then '✓ AI Inventory'
    when table_name = 'risk_assessments' then '✓ Risk Assessment'
    when table_name = 'obligations' then '✓ Compliance Obligations'
    when table_name = 'evidence' then '✓ Evidence'
    when table_name = 'remediation_plans' then '✓ Remediation Plans'
    else '? Unknown table'
  end as purpose
from information_schema.tables
where
  (table_schema = 'public' and table_name in (
    'profiles',
    'workspaces',
    'workspace_members',
    'companies',
    'ai_systems',
    'risk_assessments',
    'obligations',
    'evidence',
    'remediation_plans'
  ))
  or
  (table_schema = 'auth' and table_name = 'users')
order by table_schema, table_name;
```

**Expected Output:**

```
table_schema │ table_name              │ purpose
─────────────┼────────────────────────┼───────────────────────
auth         │ users                  │ ✓ Auth System
public       │ ai_systems             │ ✓ AI Inventory
public       │ companies              │ ✓ Governed Companies
public       │ evidence               │ ✓ Evidence
public       │ obligations            │ ✓ Compliance Obligations
public       │ profiles               │ ✓ User Profiles
public       │ remediation_plans      │ ✓ Remediation Plans
public       │ risk_assessments       │ ✓ Risk Assessment
public       │ workspace_members      │ ✓ Memberships
public       │ workspaces             │ ✓ Organizations
(10 rows)
```

**✅ Pass Criteria:** All 10 tables present (9 public + 1 auth.users)

---

### Query 2: Verify Row-Level Security is Enabled

**Purpose:** Confirm RLS is active on all customer-data tables (default deny, explicit allow)

```sql
-- Check RLS status on all public tables
select
  table_name,
  case when rowsecurity = true then '✓ ENABLED' else '❌ DISABLED' end as rls_status,
  row_number() over (order by table_name) as seq
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

**Expected Output (RLS ENABLED on all):**

```
table_name              │ rls_status
────────────────────────┼───────────
ai_systems              │ ✓ ENABLED
companies               │ ✓ ENABLED
evidence                │ ✓ ENABLED
obligations             │ ✓ ENABLED
profiles                │ ✓ ENABLED
remediation_plans       │ ✓ ENABLED
risk_assessments        │ ✓ ENABLED
workspace_members       │ ✓ ENABLED
workspaces              │ ✓ ENABLED
(9 rows)
```

**✅ Pass Criteria:** All 9 tables show `✓ ENABLED`

---

### Query 3: Verify RLS Policies are Installed

**Purpose:** Confirm that access-control policies exist (at minimum 13 policies)

```sql
-- List all RLS policies
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as policy_condition_short
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

**Expected Output (Sample):**

```
schemaname │ tablename │ policyname                          │ permissive │ roles  │ policy_condition_short
────────────┼───────────┼────────────────────────────────────┼────────────┼────────┼──────────────────────────
public     │ companies │ Members can insert workspace...     │ true      │ {role} │ ...
public     │ companies │ Members can read workspace...       │ true      │ {role} │ ...
public     │ profiles  │ Users can insert their own profile  │ true      │ {role} │ ...
public     │ profiles  │ Users can read their own profile    │ true      │ {role} │ ...
public     │ profiles  │ Users can update their own profile  │ true      │ {role} │ ...
public     │ workspaces│ Authenticated users can create...   │ true      │ {role} │ ...
public     │ workspaces│ Owners can add themselves as...     │ true      │ {role} │ ...
...
(13+ rows)
```

**✅ Pass Criteria:** At least 13 policies listed

---

### Query 4: Verify Profile Auto-Creation Trigger

**Purpose:** Confirm the trigger function and trigger exist for auto-profile creation on signup

```sql
-- Check for profile auto-creation trigger
select
  tgname as trigger_name,
  relname as table_name,
  proname as function_name,
  tgtype as trigger_type,
  case when tgenabled = 'O' then '✓ ENABLED' else '⚠ DISABLED' end as status
from pg_trigger
join pg_class on tgrelid = pg_class.oid
join pg_proc on pg_trigger.tgfoid = pg_proc.oid
where relname = 'users' and tgname like '%auth_user%'
order by tgname;
```

**Alternative (if above returns empty, check function exists):**

```sql
-- Check if the profile creation function exists
select
  proname as function_name,
  pg_catalog.pg_get_functiondef(oid) as function_definition
from pg_proc
where proname = 'handle_new_user'
and pg_catalog.pg_get_namespace(pronamespace) = 'public';
```

**Expected Output:**

```
function_name │ status
───────────────┼──────────────
handle_new_user│ ✓ ENABLED
(1 row)
```

**✅ Pass Criteria:** `handle_new_user` function exists and trigger is active

**If trigger NOT found:**

- Manually verify the trigger exists:
  ```sql
  select * from pg_trigger where tgname = 'on_auth_user_created';
  ```
- If empty, the trigger did not deploy. Check SQL output for errors.

---

### Query 5: Verify Foreign Keys and Cascading Deletes

**Purpose:** Confirm data integrity constraints are in place

```sql
-- List all foreign key relationships
select
  constraint_name,
  table_schema || '.' || table_name as from_table,
  column_name as from_column,
  referenced_table_schema || '.' || referenced_table_name as to_table,
  referenced_column_name as to_column,
  delete_rule,
  update_rule
from information_schema.referential_constraints
where constraint_schema = 'public'
order by table_name, constraint_name;
```

**Expected Output (Sample):**

```
constraint_name                │ from_table           │ from_column  │ to_table      │ to_column │ delete_rule │ update_rule
────────────────────────────────┼──────────────────────┼──────────────┼───────────────┼───────────┼─────────────┼────────────
companies_workspace_id_fkey     │ public.companies     │ workspace_id │ public.worksp │ id        │ CASCADE     │ CASCADE
profiles_id_fkey               │ public.profiles      │ id           │ auth.users    │ id        │ CASCADE     │ CASCADE
workspaces_owner_id_fkey       │ public.workspaces    │ owner_id     │ auth.users    │ id        │ CASCADE     │ CASCADE
workspace_members_user_id_fkey │ public.workspace_mem │ user_id      │ auth.users    │ id        │ CASCADE     │ CASCADE
workspace_members_workspace_id │ public.workspace_mem │ workspace_id │ public.worksp │ id        │ CASCADE     │ CASCADE
...
(10+ rows)
```

**✅ Pass Criteria:** All foreign keys use `CASCADE` for delete (ensures data integrity)

---

### Query 6: Verify Indexes Exist

**Purpose:** Confirm performance indexes are installed

```sql
-- Check all indexes on public tables
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

**Expected Indexes (Minimum):**

- `profiles_email_idx` on profiles(email)
- `workspaces_owner_id_idx` on workspaces(owner_id)
- `workspaces_slug_idx` on workspaces(slug)
- `workspace_members_*` indexes
- `companies_workspace_idx` on companies(workspace_id)

**✅ Pass Criteria:** At least 6-8 indexes present

---

## Post-Verification Test (Manual Browser)

Once all SQL queries pass, test the actual signup flow:

### Step 1: Clear Browser Cache

1. Open http://localhost:3000 in a **new incognito/private window**
2. Or manually clear cookies for localhost

### Step 2: Sign Up (Don't Use test@example.com)

1. Go to http://localhost:3000/auth/signup
2. Enter a **real or disposable email** (not test@example.com):
   - Real: your.email@gmail.com
   - Disposable: Use MailinatorPro, TempMail, or similar
3. Enter password (min 8 chars)
4. Check "I agree to terms"
5. Click "Sign Up"
6. Expected: "Check your email to confirm your account"

### Step 3: Confirm Email

1. Check the email inbox for Supabase confirmation link
2. Click the confirmation link
3. Expected: Redirected to http://localhost:3000/dashboard
4. Expected: Dashboard loads (or sign-in if session not established)

### Step 4: Verify Profile Was Created

1. In Supabase, go to **Table Editor** → **profiles**
2. Look for a row with the email you used
3. Expected columns:
   - `id`: Should match auth.users.id
   - `email`: Should match signup email
   - `created_at`: Should be recent timestamp
   - `updated_at`: Should be recent timestamp

**✅ Manual Test Pass:** Profile row created automatically, no manual inserts needed

---

## Verification Checklist

Before declaring deployment complete, verify:

- [ ] Query 1: All 10 tables present (9 public + auth.users)
- [ ] Query 2: All 9 public tables have RLS ENABLED
- [ ] Query 3: At least 13 RLS policies installed
- [ ] Query 4: `handle_new_user` trigger function exists
- [ ] Query 5: Foreign keys with CASCADE delete rules present
- [ ] Query 6: At least 6-8 performance indexes present
- [ ] Manual test: Browser signup → email confirmation works
- [ ] Manual test: Profile row auto-created (verified in table editor)
- [ ] Manual test: Dashboard loads after confirmation
- [ ] No error messages in Supabase SQL Editor or browser console

---

## Troubleshooting

### Issue: Query 1 Returns Fewer Than 10 Tables

**Problem:** Tables didn't create

**Solutions:**

1. Check Supabase SQL Editor output for errors
2. Re-run `supabase/schema.sql` (it's idempotent)
3. Contact Supabase support with exact error message

---

### Issue: RLS Shows DISABLED on Some Tables

**Problem:** RLS enforcement didn't activate

**Solutions:**

```sql
-- Manually enable RLS on a table
alter table public.profiles enable row level security;
```

Then re-run Query 2 to verify.

---

### Issue: Query 4 Shows No Trigger

**Problem:** Profile creation trigger didn't install

**Solutions:**

1. Manually re-run trigger section from schema:
   ```sql
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, email, first_name, last_name, created_at, updated_at)
     values (
       new.id,
       new.email,
       new.raw_user_meta_data ->> 'first_name',
       new.raw_user_meta_data ->> 'last_name',
       now(),
       now()
     );
     return new;
   exception when others then
     raise warning 'Error creating profile for user %: %', new.id, sqlerrm;
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row
     execute function public.handle_new_user();
   ```
2. Re-test signup

---

### Issue: Manual Signup Works But Profile Not Created

**Problem:** Trigger exists but isn't firing

**Solutions:**

1. Check Supabase logs for trigger errors
2. Verify trigger is enabled: Query 4
3. Check if profile was inserted manually by workspace API (upsert)

---

## Final Acceptance Criteria

Production Supabase deployment is **VERIFIED COMPLETE** when:

1. ✅ All 10 tables exist (Query 1)
2. ✅ All 9 tables have RLS enabled (Query 2)
3. ✅ All 13+ policies installed (Query 3)
4. ✅ Trigger function exists (Query 4)
5. ✅ Foreign keys with CASCADE (Query 5)
6. ✅ Indexes present (Query 6)
7. ✅ Browser signup → confirmation works
8. ✅ Profile auto-created (no manual insert)
9. ✅ No error messages anywhere

**Result:** Supabase is production-ready for customer signups.

---

**Document Version:** 2026-07-10  
**Status:** READY FOR USE  
**Last Updated:** (Autonomous deployment guide v1)
