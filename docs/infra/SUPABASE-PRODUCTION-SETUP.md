# Supabase Production Setup Guide

**Objective:** Deploy production database schema and configure Supabase for customer data  
**Timeline:** 15-30 minutes (mostly manual setup + waiting for deployment)  
**Prerequisites:** Supabase account with active project (EU region recommended for EURO AI)  
**Status:** READY FOR EXECUTION (code schema is tested and validated)  

---

## Executive Summary

This guide walks through deploying the NewsPulse AI database schema to production Supabase and configuring authentication for live customers.

**What's Included:**
- ✅ Complete database schema (tables, RLS policies, indexes)
- ✅ Authentication setup (Email/Password, OAuth-ready)
- ✅ Row-Level Security (RLS) for multi-tenant data isolation
- ✅ API integration (already configured in code)
- ✅ Testing procedures (verify connectivity and data access)

**What You'll Have After:**
- ✅ Production database running on Supabase
- ✅ User authentication enabled
- ✅ Workspace multi-tenancy configured
- ✅ Customer data protected with RLS
- ✅ Ready for first customer signup

---

## Pre-Deployment Checklist

**Before starting, verify:**

- [ ] Supabase account created and logged in
- [ ] Production project created (recommended: EU region for GDPR compliance)
- [ ] Project status is "Active" (check dashboard)
- [ ] You have Supabase project URL (looks like `https://xxxxx.supabase.co`)
- [ ] You have Supabase API keys (anon key and service_role key)
- [ ] GitHub repository cloned locally (for schema file access)

**If any checks fail:** Set up Supabase at https://app.supabase.com before proceeding.

---

## Phase 1: Deploy Database Schema (10 minutes)

### Step 1.1: Access Supabase SQL Editor

1. Go to https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. You'll see the SQL query editor

### Step 1.2: Load Schema File

The schema is located in your repo: `supabase/schema.sql`

**Option A: Copy-paste from file**
1. Open `supabase/schema.sql` in your text editor
2. Copy the entire file contents
3. Paste into Supabase SQL editor
4. Review the SQL (should see tables, policies, functions)

**Option B: Use Supabase CLI (Advanced)**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push schema
supabase db push
```

### Step 1.3: Execute Schema

**In Supabase SQL Editor:**

1. Paste the entire `schema.sql` content
2. Click **"Run"** button (or Ctrl+Enter)
3. Wait for execution to complete
4. Check for any errors in the output

**Expected output:**
```
Success! SQL executed.
```

**Common issues and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Table already exists" | Schema was already deployed | Safe to ignore, schema is idempotent |
| "Permission denied" | User lacks privileges | Ensure you're using project owner account |
| "Extension not found" | pgcrypto or uuid-ossp missing | Should auto-enable; contact Supabase support if not |

### Step 1.4: Verify Tables Created

After schema deployment:

1. Click **"Table Editor"** in left sidebar
2. You should see these tables:
   - `auth.users` (managed by Supabase Auth)
   - `public.profiles`
   - `public.companies`
   - `public.workspaces`
   - `public.governance_priorities`
   - `public.searches` (from NewsPulse)
   - Any others defined in schema

3. Click each table to verify structure:
   - Check columns are correct type
   - Check indexes exist
   - Verify RLS policies are enabled

**If tables don't appear:** Refresh browser or re-run schema deployment.

---

## Phase 2: Configure Authentication (5 minutes)

### Step 2.1: Enable Email Authentication

1. Go to **"Authentication"** in left sidebar
2. Click **"Providers"** tab
3. Find **"Email"** provider
4. Toggle **"Enabled"** to ON
5. Review settings:
   - "Confirm email" should be ON (users confirm via email link)
   - "Disable Signup" should be OFF (allow new users)
   - Auto confirm users should be OFF (require email verification)
6. Click **"Save"**

### Step 2.2: Configure Email Templates

Supabase sends automated emails for:
- Email confirmation
- Password reset
- Magic link login

**Customize templates (optional):**

1. Still in **Authentication** → **Email Templates**
2. You'll see templates for:
   - `Confirm signup`
   - `Invite user`
   - `Magic Link`
   - `Change Email`
   - `Recovery`

3. Edit any template to match your branding
   - Keep the magic link placeholder: `{{ .ConfirmationURL }}`
   - Personalize greeting/closing
   - Add logo if desired

4. Save each template

**Default templates work fine** — you can skip this and use defaults.

### Step 2.3: Configure OAuth Providers (Optional for Phase 1)

For future GitHub/Google login:

1. Go to **Authentication** → **Providers**
2. Find **"Google"** or **"GitHub"**
3. Follow provider-specific setup (requires OAuth app creation on Google/GitHub side)
4. Enable when credentials ready

**For now:** Email auth is sufficient for launch. Add OAuth later.

### Step 2.4: Verify Auth Settings

1. Go to **Authentication** → **Settings**
2. Check these values match:
   - Site URL: `https://newspulse-ai.vercel.app` (or your domain)
   - Redirect URLs: Same as Site URL + `/auth/confirm`
   - JWT Secret: Auto-generated (don't need to change)
   - JWT expiry: 3600 seconds (1 hour, default is fine)

3. Save if you made changes

---

## Phase 3: Configure Environment Variables (5 minutes)

### Step 3.1: Get Project Credentials

In Supabase dashboard:

1. Click **"Settings"** → **"API"**
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Public key (safe to expose in browser)
   - **Service Role Key**: Private key (keep secret, never commit to repo)

### Step 3.2: Update .env.local

In your project root, edit `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Private key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get actual values from Supabase → Settings → API**

### Step 3.3: Restart Dev Server

```bash
# Stop current dev server (Ctrl+C)
# Restart with new env vars
npm run dev

# Verify it connects:
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

---

## Phase 4: Test Production Setup (5 minutes)

### Step 4.1: Test Database Connection

**Via API:**
```bash
curl -X GET http://localhost:3000/api/health \
  -H "Content-Type: application/json"

# Expected response:
# {"status":"ok","timestamp":"2026-07-10T...","checks":{"database":"ok"}}
```

**Via Supabase Dashboard:**
1. Go to **"SQL Editor"**
2. Run test query:
   ```sql
   SELECT current_user, current_database;
   ```
3. Should return: `authenticated user` and `postgres`

### Step 4.2: Test Authentication Flow (Sign-up)

1. Open app at http://localhost:3000
2. Click **"Sign Up"**
3. Enter test email (e.g., `test@example.com`)
4. Enter password (e.g., `TestPassword123!`)
5. Click **"Create Account"**
6. Check email inbox for confirmation link
7. Click confirmation link
8. Should redirect back to app, logged in

**Check data was saved:**
- Go to Supabase → **Table Editor** → `auth.users`
- Should see your test user
- Go to `public.profiles` table
- Should see profile created with same email

### Step 4.3: Test Row-Level Security (RLS)

RLS ensures users can only see their own data:

1. Sign in as **User A** (e.g., `usera@example.com`)
2. Create a workspace in dashboard
3. Sign out
4. Sign in as **User B** (e.g., `userb@example.com`)
5. Try to access User A's workspace via URL:
   ```
   http://localhost:3000/workspace/[User-A-ID]
   ```
6. Should get 403 Forbidden or redirect to own workspace

**This proves RLS is working** — users can't access others' data.

### Step 4.4: Test API Endpoints

Test key API endpoints to verify production setup:

```bash
# 1. Health check (should work unauthenticated)
curl http://localhost:3000/api/health

# 2. Workspace creation (requires authentication)
# First, get auth token (sign in via browser)
# Then:
curl -X POST http://localhost:3000/api/workspace \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_name":"Test Org","employees_range":"1-10","company_website":"https://example.com"}'

# 3. Check workspace was created
# Via Supabase Table Editor → workspaces table
```

---

## Phase 5: Production Verification Checklist

Before declaring production-ready, verify all items:

- [ ] Database tables exist and have correct schema
  - Check `auth.users`, `profiles`, `companies`, `workspaces` tables
- [ ] Email authentication enabled
  - Verified by testing sign-up flow
- [ ] RLS policies active and protecting data
  - Verified by testing cross-user access
- [ ] Environment variables set correctly
  - NEXT_PUBLIC_SUPABASE_URL set
  - NEXT_PUBLIC_SUPABASE_ANON_KEY set
  - SUPABASE_SERVICE_ROLE_KEY set (private, not committed)
- [ ] API health endpoint working
  - `curl http://localhost:3000/api/health` returns 200
- [ ] Sign-up flow working end-to-end
  - Test email confirms and creates profile
- [ ] Multi-tenant isolation working
  - User A cannot see User B's workspaces/data
- [ ] Database backups enabled
  - Check Supabase → Settings → Backups (should show daily/weekly)

**All items checked = Production Ready**

---

## Phase 6: Production Deployment (5 minutes)

### Step 6.1: Deploy to Production

Once verified locally:

1. Commit env changes (if using version control):
   ```bash
   # DO NOT COMMIT SERVICE_ROLE_KEY to public repo!
   # Only commit NEXT_PUBLIC_SUPABASE_URL and ANON_KEY if needed
   git add .env.local
   git commit -m "Add Supabase production credentials"
   ```

2. Push to production branch:
   ```bash
   git push origin main
   ```

3. Vercel automatically deploys
   - Check Vercel dashboard for deployment status
   - Wait for "Ready" status (usually 2-3 min)

### Step 6.2: Verify Production Deployment

1. Visit production URL: `https://newspulse-ai.vercel.app`
2. Test full sign-up flow
3. Check API responses:
   ```bash
   curl https://newspulse-ai.vercel.app/api/health
   # Should return: {"status":"ok",...}
   ```

### Step 6.3: Configure Production Email

Update Supabase email settings to use production domain:

1. Go to **Authentication** → **Settings**
2. Update **Site URL** to production domain:
   ```
   https://newspulse-ai.vercel.app
   ```
3. Update **Redirect URLs**:
   ```
   https://newspulse-ai.vercel.app
   https://newspulse-ai.vercel.app/auth/confirm
   ```
4. Save

---

## Troubleshooting

### Issue: "Schema Deploy Failed"

**Symptom:** Error when running schema in SQL editor

**Solutions:**
1. Copy-paste entire `schema.sql` file (not partial)
2. Check for comment typos or syntax errors
3. Run in fresh Supabase project (new projects sometimes have issues)
4. Contact Supabase support if persists

### Issue: "Email Not Sending"

**Symptom:** Sign-up email confirmation never arrives

**Solutions:**
1. Check email spam folder
2. Verify email address in Supabase → **Authentication** → **Users**
3. Check email rate limiting (Supabase free tier: 1 email/sec)
4. Configure SMTP in Supabase → **Authentication** → **Email** (custom SMTP)

### Issue: "Cannot Access Dashboard After Sign-Up"

**Symptom:** Stuck on sign-in page after confirmation

**Solutions:**
1. Check browser console for errors
2. Clear browser cookies/localStorage
3. Verify session cookie is set (check browser DevTools → Application → Cookies)
4. Check Supabase RLS policies aren't overly restrictive

### Issue: "Production Database Different from Local"

**Symptom:** Works locally, fails in production

**Solutions:**
1. Verify environment variables are set in Vercel dashboard
2. Restart Vercel deployment (redeploy from dashboard)
3. Compare local `.env.local` with Vercel environment vars
4. Check Supabase project region matches app expectations

---

## Post-Launch Maintenance

### Daily Checks
- Monitor error rate via Vercel Analytics
- Check Supabase logs for authentication errors
- Verify daily backups are completing

### Weekly Checks
- Review RLS policies for new tables (if added)
- Check database storage usage
- Monitor query performance (Supabase → Statistics)

### Monthly Checks
- Review user growth and database scaling needs
- Update auth provider credentials if expired
- Archive old logs if needed

---

## Security Checklist (IMPORTANT)

Before going live with customers, verify:

- [ ] **Service Role Key Never Committed**
  - Check `.gitignore` includes `.env.local`
  - Check no `.env.local` in git history
  - Rotate Service Role Key if accidentally exposed

- [ ] **RLS Policies Active**
  - All tables have RLS enabled
  - All users can only see their own data
  - No data leaks between customers

- [ ] **HTTPS Enforced**
  - Site URL uses `https://`
  - Redirect URLs use `https://`
  - No `http://` in production config

- [ ] **Authentication Verified**
  - Email confirmation required (no auto-confirm)
  - Password requirements enforced
  - Session timeout configured

- [ ] **Backups Configured**
  - Daily backups enabled in Supabase
  - Tested restore procedure (at least once)
  - Know how to recover data if needed

- [ ] **Monitoring Active**
  - Error tracking (Sentry or similar) configured
  - Database performance monitored
  - User signup flows monitored

**All items checked = Secure for Production**

---

## FAQ

### Q: Can I use Supabase free tier for production?
**A:** Not recommended. Free tier has:
- 500 MB database
- 2 GB bandwidth/month
- No priority support
- Auto-paused when unused

**Recommendation:** Upgrade to paid plan ($25/month) for production.

### Q: How do I migrate data from dev to production?
**A:** Supabase provides migration tools:
1. Export data from dev environment
2. Import into production
3. Use Supabase Migration Tool for larger datasets
4. Contact support for complex migrations

### Q: What if I need to update the schema after launch?
**A:** Use Supabase Migrations:
1. Create SQL migration file
2. Apply via Supabase CLI: `supabase db push`
3. Verify on production before merging to main
4. Use zero-downtime migrations (ADD COLUMN with DEFAULT)

### Q: How do I scale the database as users grow?
**A:** Supabase handles scaling automatically:
- For read-heavy workloads: Enable Read Replicas
- For write-heavy: Optimize queries
- Monitor storage usage: Upgrade plan if needed
- Contact Supabase support for custom scaling

### Q: Can I use custom domain for email?
**A:** Yes, via SMTP configuration:
1. Supabase → Authentication → Email
2. Enable Custom SMTP
3. Provide your email provider (SendGrid, AWS SES, etc.)
4. Configure branding in email templates

### Q: How do I handle GDPR/data deletion requests?
**A:** Supabase provides:
1. User deletion via Dashboard
2. Bulk deletion via SQL (for admins)
3. Automatic deletion after 30 days if requested
4. Export user data: Supabase → Database → Export

---

## Success Criteria

Production database is ready when:

1. ✅ Schema deployed and all tables exist
2. ✅ Email authentication working end-to-end
3. ✅ Users can sign up, receive confirmation email, confirm account
4. ✅ RLS policies preventing cross-user data access
5. ✅ API endpoints responding to authenticated requests
6. ✅ Production Vercel deployment connects to Supabase
7. ✅ Backups configured and tested
8. ✅ HTTPS enforced
9. ✅ Error monitoring active
10. ✅ First customer can successfully sign up and use the app

**All 10 criteria met = Ready for Launch**

---

## Next Steps (After Deployment)

1. **Monitor first week:** Check logs, support emails, error rates
2. **Gather customer feedback:** What works, what doesn't
3. **Optimize based on usage:** Query performance, feature priorities
4. **Plan scaling:** Database growth, cron jobs, API optimization
5. **Expand features:** Add DNS-GOV-007, DNS-GOV-011 as customers use system

---

**Status:** READY FOR DEPLOYMENT  
**Effort:** 15-30 minutes  
**Risk Level:** LOW (schema is tested, procedure is straightforward)  
**Launch Impact:** CRITICAL (required for customer data)  

**Document created:** 2026-07-10  
**Last updated:** 2026-07-10

