# Supabase Schema Deployment Guide

> **Critical:** This step must complete before any customer can sign up. The schema creates the database tables, indexes, and Row-Level Security (RLS) policies that protect user data.

**Estimated time:** 5 minutes  
**Risk level:** ✅ Low (idempotent — safe to run multiple times)  
**Required:** Supabase project + console access

---

## Pre-deployment checklist

- ✅ You have a Supabase project (https://supabase.com/dashboard)
- ✅ You can access the SQL editor (Project → SQL Editor)
- ✅ You have at least one `Vercel` secret configured for `NEXT_PUBLIC_SUPABASE_URL`

---

## Step 1: Open the SQL Editor

1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Left sidebar → **SQL Editor**

---

## Step 2: Copy the schema

1. Open [`supabase/schema.sql`](../supabase/schema.sql) in your repository
2. Select all (`Ctrl+A` / `Cmd+A`)
3. Copy the entire file to clipboard

---

## Step 3: Run the schema

1. In the Supabase SQL Editor, paste the entire schema
2. Click **Run** (blue button, top-right)
3. Wait for "Success" message

**Expected output:** No errors. The tables and policies are now created.

---

## Step 4: Enable Email auth

1. **Project Settings** (left sidebar, bottom)
2. **Auth → Providers**
3. Scroll to **Email** and toggle **Enable Email provider**
4. Save

This allows customers to sign up with email + magic link verification.

---

## Step 5: Verify the setup

Run this SQL query in the SQL Editor to confirm all tables exist:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

**You should see:**

- `companies`
- `governance_priorities`
- `profiles`
- `workspace_members`
- `workspaces`

---

## Step 6: Restart the app (if running locally)

If you're running `npm run dev` in another terminal:

1. Stop the dev server (`Ctrl+C`)
2. Restart it (`npm run dev`)

The app will now connect to the live Supabase schema.

---

## Verify production deployment

Once you've deployed to Vercel:

1. Open `https://<your-vercel-url>/api/health`
2. Confirm you see `"status": "healthy"` (not error messages)

If you see missing env vars, add them in the Vercel dashboard:

- **Project Settings → Environment Variables**
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Troubleshooting

### "Error: relation 'public.profiles' does not exist"

**Cause:** The schema wasn't deployed or failed silently.  
**Fix:** Re-run the schema SQL in the Supabase SQL Editor. Check for error messages.

### "Error: permission denied for schema public"

**Cause:** Your Supabase role doesn't have permission.  
**Fix:** Ensure you're logged in as the project owner, not a team member with limited perms.

### "Email auth is not working — signup emails not arriving"

**Cause:** Email provider not enabled in Supabase.  
**Fix:** Go to **Project Settings → Auth → Providers** and toggle **Email** on.

### The app shows "Supabase connection error" on `/api/health`

**Cause:** Environment variables not set, or Supabase project is down.  
**Fix:**

1. Check Vercel dashboard → Environment Variables (confirm keys are set)
2. Check Supabase status at https://status.supabase.com

---

## What happens next

Once the schema is deployed and email auth is enabled:

1. Customers can navigate to `https://<your-url>/auth/signup`
2. Enter email → confirm in inbox → create workspace
3. Workspace data is stored securely in Supabase with RLS enforcement
4. Each workspace is isolated (no customer can see another's data)

---

## Disaster recovery

If something goes wrong:

**To undo all tables:**

```sql
drop schema if exists public cascade;
```

⚠️ **This deletes everything.** Only do this if the deployment completely failed.

Then re-run the full schema SQL above.

---

## Next steps

- ✅ Production deployment verified via `/api/health`
- ⏳ Send signup link to first customer
- ⏳ Monitor `/api/production-health` for uptime (set up external monitoring)

Questions? Check the [docs/](../) directory or open an issue.
