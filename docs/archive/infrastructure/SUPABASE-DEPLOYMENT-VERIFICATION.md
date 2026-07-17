# Supabase Deployment Verification Checklist

**Purpose:** Verify that the Supabase schema has been correctly deployed and all RLS policies are in place  
**Audience:** Founder (verification only; no CLI/code changes needed)  
**Time Required:** 10–15 minutes

---

## ⚠️ Critical Requirement

The compliance system (and all EURO AI features) will **silently fail** if the Supabase schema has not been deployed. This checklist helps you verify deployment before teams attempt to sign up or use the system.

**Status:** If you have NOT run the schema.sql in Supabase, **do this first** before teams use the system.

---

## Quick Deployment Status Check

### 1. Log into Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your EURO AI project
3. Navigate to **SQL Editor** (left sidebar)

### 2. Run the Preflight Check (Non-Destructive)

In the SQL Editor, run this query to see what's currently deployed:

```sql
-- Shows all existing tables (should see 20+ if schema is deployed)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected output if schema IS deployed:**

```
ai_systems
assessments
companies
evidence
governance_state
knowledge_memory
obligations
profiles
remediation_plans
risk_assessments
team_roles
workspace_members
workspaces
... (20+ total tables)
```

**If you see 0 tables or only `profiles`:** Schema has NOT been deployed. Proceed to "Deploy Schema" section below.

---

## Deploy Schema (If Needed)

### Option 1: Using Supabase SQL Editor (Recommended for Most Users)

1. Go to https://supabase.com/docs/guides/cli/local-development (for schema reference)
2. Or open `supabase/schema.sql` from the NewsPulse AI repository
3. Copy the **entire** contents of `/supabase/schema.sql` from the repo
4. In your Supabase SQL Editor, create a new query
5. Paste the entire schema
6. Click **Run** (top right)
7. Wait for completion (30–60 seconds)
8. Check for errors: **If all green, you're done. If red, scroll down to see error messages.**

**Expected result:** "Query executed successfully" with no errors

### Option 2: Using Supabase CLI (For Teams Comfortable with Command Line)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref <YOUR_PROJECT_ID>

# Push schema from local
supabase push

# Verify deployment
supabase db pull  # This will show you the current schema
```

### Schema Safety Features

The schema is **idempotent** — safe to run multiple times:

- Uses `CREATE TABLE IF NOT EXISTS` (won't fail if tables exist)
- Uses `CREATE OR REPLACE FUNCTION` (overwrites functions safely)
- Uses `CREATE INDEX IF NOT EXISTS` (won't fail if indexes exist)
- Uses `DROP TRIGGER IF EXISTS` (removes old triggers before recreating)

**You can safely re-run schema.sql without data loss.**

---

## Post-Deployment Verification

After deploying the schema, verify these 5 critical components:

### ✅ Check 1: All Tables Exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected:** 20+ tables including:

- `auth.users` (Supabase built-in)
- `profiles`, `workspaces`, `workspace_members`, `companies`
- `ai_systems`, `risk_assessments`, `assessments`
- `obligations`, `evidence`, `remediation_plans`
- `team_roles`, `governance_state`, `knowledge_memory`

**If missing:** Re-run schema.sql and check for error messages.

### ✅ Check 2: RLS Policies Are Enabled

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;
```

**Expected:** See tables like `obligations`, `workspace_members`, `evidence`, `ai_systems`, etc. (all should have RLS enabled)

**If empty:** RLS may not have been enabled. Check SQL Editor for errors in the schema deployment.

### ✅ Check 3: Row-Level Security Policies Exist

```sql
SELECT tablename, policyname, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected:** 30+ policies across tables (each table should have SELECT, INSERT, UPDATE, DELETE policies)

Example policies you should see:

- `obligations_select_workspace_members` — Members can read workspace obligations
- `workspace_members_select_own` — Users can see their workspace roster
- `evidence_insert_workspace_members` — Members can submit evidence

**If 0 policies:** Schema deployment may have failed at the RLS policy section. Check SQL Editor error log.

### ✅ Check 4: Key Functions Exist

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Expected:** Functions like:

- `handle_new_user` — Creates profile when user signs up
- `is_workspace_member` — RLS helper: checks if user is a workspace member
- `is_workspace_admin` — RLS helper: checks if user is a workspace admin

**If missing:** Re-run schema.sql.

### ✅ Check 5: Indexes Are Present

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
```

**Expected:** 20+ indexes on high-query tables

**If sparse:** Not critical for launch; queries will just be slower. Indexes can be added post-launch.

---

## Email Configuration Verification

The compliance system requires email verification for sign-ups. Verify Supabase email settings:

1. In Supabase dashboard, go to **Authentication** (left sidebar)
2. Click **Providers**
3. Click **Email** (not OAuth)
4. Verify:
   - ✅ **Enable email confirmations** is checked
   - ✅ **Confirm email** type is set (default is fine)
   - ✅ Redirect URLs include your Vercel domain (e.g., `https://your-app.vercel.app/auth/confirm`)

**Critical redirect URL:** Must match `AUTH_REDIRECT_URL` in your `.env.local` on Vercel

If email is not configured, sign-ups will succeed but confirmation emails won't send, leaving users stuck.

---

## Environment Variable Verification

After schema deployment, verify Vercel has the correct Supabase environment variables:

1. Go to your Vercel deployment settings
2. Go to **Environment Variables**
3. Check these are set:
   - `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key (safe to expose)
   - `SUPABASE_SERVICE_ROLE_KEY` — Private key (secret, should be masked)

**Do NOT commit these to git. Vercel environment variables are the safe place for secrets.**

Get these from Supabase:

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the values under "Project API keys"

---

## Quick System Test (After Schema Deployment)

Once schema is deployed and env vars are set on Vercel, test the end-to-end flow:

1. Go to https://your-app.vercel.app/auth/signup (your Vercel URL)
2. Sign up with a test email
3. Check your email for confirmation link
4. Click the link to confirm
5. You should be redirected to `/dashboard` and see your workspace setup form
6. Fill out the form (company name, employees range, etc.)
7. Check that you can navigate to `/obligations` and see the templates page

**If all steps work:** Schema is deployed correctly ✅

**If any step fails:**

- **Step 3 fails (no confirmation email):** Email provider not configured in Supabase
- **Step 5 fails (form doesn't save):** RLS policies not deployed; workspace creation is blocked
- **Step 7 fails (obligations page doesn't load):** Obligations table or RLS policies not deployed

---

## Rollback Procedure (If Needed)

If schema deployment causes issues, you can safely roll back:

1. Go to Supabase SQL Editor
2. Run: `SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;` to see schema version
3. Contact Anthropic support or check Supabase docs for rollback procedures

**Note:** The schema design uses `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE`, so re-running schema.sql multiple times is safe (idempotent). No rollback needed for re-runs.

---

## Post-Launch Maintenance

After schema is deployed and teams are using the system:

### Weekly: Monitor RLS Policy Performance

```sql
-- Check for policy evaluation delays
SELECT schemaname, tablename, policyname,
       COUNT(*) as evaluations
FROM pg_stat_statements
WHERE query LIKE '%policy%'
GROUP BY schemaname, tablename, policyname
ORDER BY evaluations DESC;
```

If any policy is evaluating too frequently (high count with slow query time), consider indexing or caching.

### Monthly: Verify Integrity

```sql
-- Check for orphaned foreign key references
SELECT * FROM obligations WHERE workspace_id NOT IN (SELECT id FROM workspaces);
SELECT * FROM assessments WHERE workspace_id NOT IN (SELECT id FROM workspaces);
```

Should return 0 rows (no orphans). If rows appear, investigate foreign key constraints.

### Before Major Releases

Run the full PREFLIGHT_CHECK.sql again to ensure no policy conflicts before deploying code changes:

```bash
# In Supabase SQL Editor, open supabase/PREFLIGHT_CHECK.sql
# Copy entire contents, paste into SQL Editor, run
# Review GO/NO-GO decision output
```

---

## Troubleshooting

### Problem: "Syntax error in SQL"

**Cause:** Schema file may have been partially copied or modified  
**Solution:** Copy schema.sql again carefully, ensure no truncation. Verify all lines present.

### Problem: "ERROR: policy already exists"

**Cause:** Schema was previously deployed; re-run is hitting existing policies  
**Solution:** This is not an error — the schema.sql should handle this with `DROP POLICY IF EXISTS`. If you see the error anyway, check for manually-created policies in your Supabase that aren't in schema.sql.

### Problem: "Deadline exceeded" during schema run

**Cause:** Large schema deployment on Hobby tier Supabase may take >60 seconds  
**Solution:** Re-run the same SQL. Supabase's `CREATE TABLE IF NOT EXISTS` pattern will skip already-created tables on retry. It's safe to re-run.

### Problem: RLS policies not enforced (queries succeed when they should fail)

**Cause:**

1. RLS not enabled on the table, OR
2. Service role key is being used instead of anon key

**Solution:**

- Verify `rowsecurity = true` for the table: `SELECT * FROM pg_tables WHERE tablename='obligations' AND rowsecurity=true;`
- Check that your API calls use the **anon key**, not service role key. Service role bypasses RLS.

### Problem: Forgot email confirmation, can't sign in

**Cause:** Email configuration issue or user never clicked link  
**Solution:**

1. In Supabase **Auth Users** tab, find the user
2. Click the user row
3. Manually mark as confirmed (or resend email)

---

## Deployment Checklist (Print & Use)

```
SUPABASE DEPLOYMENT VERIFICATION
Date: ___________    Person: ___________

[ ] Step 1: Logged into Supabase dashboard
[ ] Step 2: Ran preflight check — saw 20+ tables
[ ] Step 3: Copied schema.sql from repo
[ ] Step 4: Pasted into SQL Editor and ran (got "Query executed successfully")
[ ] Step 5: Verified all tables exist (Check 1)
[ ] Step 6: Verified RLS is enabled (Check 2)
[ ] Step 7: Verified RLS policies exist (Check 3)
[ ] Step 8: Verified functions exist (Check 4)
[ ] Step 9: Verified indexes exist (Check 5)
[ ] Step 10: Configured email provider in Supabase
[ ] Step 11: Set environment variables on Vercel
[ ] Step 12: Tested sign-up → confirmation → workspace setup → obligations page
[ ] COMPLETE: Schema is deployed and verified ✅
```

---

## Next Steps

Once verified:

1. ✅ Schema is deployed and all RLS policies are in place
2. ✅ Email confirmation is configured
3. ✅ Environment variables are set on Vercel
4. **→ Teams can now sign up and use the compliance system**

If you run into issues, check the **Troubleshooting** section above, or ask Governor for schema review.
