# Launch Day Troubleshooting

**Use this if something goes wrong during launch**

---

## Quick Diagnosis

### Step 1: Check System Status

```bash
# Is the app up?
curl https://your-vercel-app.vercel.app/api/health
```

**Response:**

- ✅ `{"ok": true, "status": "healthy"}` → System OK, problem elsewhere
- ❌ `{"ok": false, "status": "degraded"}` → Database issue
- ❌ Connection refused / timeout → Vercel down

### Step 2: Check Which Component Failed

| Symptom                    | Likely Cause      | Action                     |
| -------------------------- | ----------------- | -------------------------- |
| `/api/health` returns 503  | Database down     | See: Database Issues       |
| Signup button doesn't work | Auth issue        | See: Authentication Issues |
| Can't create workspace     | RLS policy issue  | See: Permission Issues     |
| App loads but is slow      | Performance issue | See: Performance Issues    |
| Error pages showing        | Code issue        | See: Deployment Issues     |

---

## Database Issues

### Symptoms

- `/api/health` returns: `{"ok": false, "status": "degraded"}`
- Any API returns: "relation does not exist"
- Supabase connection times out

### Diagnosis

```bash
# Check database connectivity
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "https://YOUR_PROJECT.supabase.co/rest/v1/customers?limit=1"
```

**Response:**

- ✅ Empty array `[]` → Database connected
- ❌ 401 Unauthorized → API key invalid
- ❌ 404 Not Found → Schema not deployed
- ❌ Connection timeout → Supabase down

### Solutions

#### "Schema not deployed" (404 Not Found)

**Fix:**

1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor"
4. Paste entire `supabase/schema.sql`
5. Click "Run"
6. Wait for completion
7. Retry verification script

**Time to fix:** 2-3 minutes

#### "API key invalid" (401 Unauthorized)

**Fix:**

1. Check `.env.local` has correct keys:
   - `NEXT_PUBLIC_SUPABASE_URL` — should start with `https://`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — should be 50+ char string
   - `SUPABASE_SERVICE_ROLE_KEY` — should be 50+ char string
2. Go to Supabase → Settings → API
3. Copy correct keys
4. Update `.env.local`
5. Restart your app (if running locally) or redeploy

**Time to fix:** 2 minutes

#### "Supabase connection timeout"

**Fix:**

1. Check https://status.supabase.com
2. If Supabase is down: Wait for recovery
3. If Supabase is up:
   - Check your internet connection
   - Try from a different network (to rule out ISP issues)
   - Contact Supabase support

**Time to fix:** 5-30 minutes (depends on Supabase)

---

## Authentication Issues

### Symptoms

- Signup button doesn't work
- Email confirmation emails not received
- "Invalid email" error even for valid emails
- Password reset doesn't work

### Diagnosis

```bash
# Check if auth email is configured
# Look for SENDGRID_API_KEY in your environment
echo $SENDGRID_API_KEY
```

**Response:**

- ✅ Long string of characters → Email configured
- ❌ Empty / not set → Email not configured

### Solutions

#### "Email confirmation not received"

**Checklist:**

1. [ ] Check spam folder
2. [ ] Verify email address spelling
3. [ ] Try with a different email
4. [ ] Check SendGrid dashboard for failures

**Fix:**

1. Go to Supabase → Authentication → Email Templates
2. Click "Edit" on Confirmation Email
3. Send test email
4. If test email works: Check customer's spam
5. If test email fails: Check SendGrid API key

**Workaround (manual confirmation):**

1. Go to Supabase → Data Editor → `auth.users`
2. Find customer's account
3. Set `email_confirmed_at` to current timestamp
4. Customer can now login

**Time to fix:** 3-5 minutes

#### "Signup button doesn't respond"

**Diagnosis:**

1. Open browser DevTools (F12)
2. Click Console tab
3. Try to sign up
4. Look for error messages
5. Copy error message

**Common errors:**

**"CORS error" or "blocked by browser":**

- Fix: CORS configuration issue
- Solution: Check `lib/cors-config.ts`
- Verify production domain is whitelisted
- Redeploy if config changed

**"Missing environment variable":**

- Fix: SENDGRID_API_KEY or Supabase keys not set
- Solution: Add to `.env` or Vercel project settings
- Redeploy after adding

**"Network error":**

- Fix: API unreachable
- Solution: Check if Vercel deployment is live
- Verify `/api/health` responds

**Time to fix:** 5-10 minutes

---

## Permission Issues (RLS)

### Symptoms

- Signup works but workspace creation fails with 403
- User can see other users' data
- Error: "permission denied for..."

### Diagnosis

Check browser console for:

```
PostgreSQL: permission denied for table "workspaces"
```

Or run:

```bash
curl -H "Authorization: Bearer $CUSTOMER_JWT" \
  "https://YOUR_PROJECT.supabase.co/rest/v1/workspaces"
```

If returns 403 → RLS policy issue

### Solutions

#### "Permission denied creating workspace"

**Cause:** RLS policy not applied correctly

**Fix:**

1. Go to Supabase → SQL Editor
2. Run this query:
   ```sql
   -- Check if RLS is enabled
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'workspaces';
   ```
3. If returns result, RLS might need fixing
4. Redeploy schema with fresh execution
5. Or manually apply RLS policies:
   ```sql
   -- Create workspace policy
   CREATE POLICY "Users can create own workspaces"
   ON public.workspaces FOR INSERT
   WITH CHECK (auth.uid() = created_by);
   ```

**Simpler fix:**

1. Go to Supabase → Authentication tab
2. Check if customer email is verified
3. If not: Manually verify (see Authentication Issues section)

**Time to fix:** 3-5 minutes

#### "User sees other users' data"

**Cause:** RLS policy not restrictive enough or missing

**Fix:**

1. This is a security issue — do NOT launch if you see this
2. Immediately disable signup
3. Go to Supabase → SQL Editor
4. Review and fix RLS policies for affected tables
5. Test permissions before relaunching

**Time to fix:** 10-15 minutes (safety critical)

---

## Performance Issues

### Symptoms

- App loads slowly (>5 seconds)
- Dashboard takes 10+ seconds to load
- Health check latency is high (>1 second)

### Diagnosis

```bash
# Test response time
time curl https://your-vercel-app.vercel.app/api/health
```

**Expected:** <500ms  
**Acceptable:** <1000ms  
**Problem:** >1000ms

### Solutions

#### "High database query latency"

**Diagnosis:**

1. Go to Supabase → Query Performance
2. Look for slow queries (>1s)
3. Identify which queries are slow

**Fix options:**

1. **Add missing index:**
   ```sql
   -- Example: index for customer lookup
   CREATE INDEX idx_customers_workspace_id
   ON customers(workspace_id);
   ```
2. **Optimize query:** Check `lib/` for inefficient queries
3. **Scale database:** If Supabase limits hit

**Time to fix:** 5-10 minutes (usually just add index)

#### "High Vercel/App latency"

**Diagnosis:**

1. Check Vercel dashboard → Deployments
2. Click latest deployment
3. Check "Functions" tab for duration

**Fix options:**

1. **Check for N+1 queries:** Each API call doing multiple DB queries
   - Fix: Batch queries together
2. **Cold starts:** First request after deploy is slow
   - Fix: Normal, happens on first request only
3. **Large response payload:** API returning too much data
   - Fix: Add pagination or limit result size

**Time to fix:** 10-30 minutes (may require code change)

#### "Connection pool exhausted"

**Symptom:** "too many connections" error

**Fix:**

1. Go to Supabase → Database Settings
2. Increase connection pool size (if available)
3. Or restart Supabase connection pool

**Time to fix:** 2-5 minutes

---

## Deployment Issues

### Symptoms

- Getting 500 errors
- Page shows error instead of content
- "Deployment failed" in Vercel

### Diagnosis

```bash
# Check Vercel deployment status
# Go to: https://vercel.com/mininglife7-dev/newspulse-ai
# Look at Deployments tab
```

**Check:**

- [ ] Latest deployment shows "Ready"
- [ ] Build time <60 seconds
- [ ] No "Build Failed" status

### Solutions

#### "Deployment shows 'Building' for >5 min"

**Fix:**

1. Wait for deployment to complete
2. If still building after 10 min: Redeploy
3. In Vercel dashboard: Click "Redeploy" button

**Time to fix:** 5 minutes

#### "Deployment failed" or "Error" status

**Diagnosis:**

1. Click on failed deployment
2. Click "Build Logs" tab
3. Scroll to bottom
4. Copy error message

**Common fixes:**

**"TypeScript error":**

- Means code has errors
- Solution: Check git history, revert bad commit
- Or fix TypeScript error and redeploy

**"Build timeout":**

- Build took >60 seconds
- Solution: Usually temporary, just redeploy

**"Out of memory":**

- Build ran out of RAM
- Solution: May need to optimize build
- Contact Vercel support

**Time to fix:** 5-20 minutes

#### "Deployment succeeded but page shows error"

**Diagnosis:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Copy error message

**Common fixes:**

**"Cannot find module":**

- Missing dependency installed
- Solution: `npm install` and redeploy

**"Environment variable not found":**

- Missing `.env` var
- Solution: Add to Vercel project settings, redeploy

**Time to fix:** 2-5 minutes

---

## Customer Signup Issues

### Symptoms

- Customer says "couldn't sign up"
- Email says "invalid email" but email is valid
- Account appears created but customer can't login

### Solutions

#### "Customer can't login after signup"

**Diagnosis:**

1. Try signing up yourself with test email
2. Check if issue is account-specific or system-wide

**If system-wide:**

- See: Authentication Issues section

**If account-specific:**

1. Go to Supabase → Authentication → Users
2. Find customer's account
3. Check `email_confirmed_at` field
4. If empty: Email not confirmed
5. Manually set `email_confirmed_at` to current time
6. Customer should now be able to login

**Time to fix:** 2 minutes

#### "Account created twice"

**Cause:** Customer clicked signup twice

**Fix:**

1. Go to Supabase → Authentication → Users
2. Find duplicate accounts
3. Delete the older one
4. Keep the one with `email_confirmed_at` set
5. Contact customer: "Use the account you confirmed by email"

**Time to fix:** 2 minutes

---

## Monitor Issues

### Symptoms

- GitHub Actions workflows not running
- No alerts appearing
- "Spending limit exceeded" warning

### Solutions

#### "Workflows not running"

**Diagnosis:**

1. Go to https://github.com/mininglife7-dev/newspulse-ai/actions
2. Check if any workflows show recent runs

**Fixes:**

**"Spending limit exceeded":**

- Fix: Increase spending limit to $50+/month
- See: FOUNDER_IMMEDIATE_ACTIONS.md → Action 2
- Time to fix: 5 minutes

**"Workflows disabled":**

1. Go to Actions tab
2. Click "Enable" on each workflow
3. Workflows should start running

**Time to fix:** 2 minutes

#### "Alerts not sending"

**Diagnosis:**

1. Check `/api/alerts` endpoint returns data
2. Verify monitoring workflows are running

**Fix:**

1. If workflows not running: Enable them (see above)
2. If alerts configured for Slack/Email:
   - Verify API keys in GitHub Secrets
   - Re-add webhook if needed

**Time to fix:** 5-10 minutes

---

## When to Contact Support

**Contact Supabase support if:**

- Database is completely down (check status.supabase.com first)
- Data corruption suspected
- Need to restore backup
- Connection pool exhausted repeatedly

**Contact Vercel support if:**

- Deployment failing consistently
- Getting 5xx errors that don't resolve with rollback
- Need to scale infrastructure

**Contact SendGrid if:**

- Email system completely down
- Emails going to spam consistently
- Need to adjust sending rate

---

## Rollback Procedure

**If everything is broken and you need to recover:**

### Code Rollback (2 min)

1. Go to https://vercel.com/mininglife7-dev/newspulse-ai
2. Click "Deployments" tab
3. Find the last good deployment (before launch)
4. Click "Rollback" button
5. Vercel will redeploy the previous version
6. Verify `/api/health` returns success

### Database Rollback (5-10 min)

1. Go to Supabase → Backups
2. Find backup from before launch
3. Click "Restore"
4. Supabase will restore from backup
5. Verify data is restored

### Full Rollback (cancel launch)

1. Do code rollback (above)
2. Do database rollback (above)
3. Contact customer: "We need to postpone launch by X hours to fix an issue"
4. Fix the issue
5. Launch tomorrow after verification

**Total time to recover:** 15-20 minutes

---

## Escalation Path

**If you can't fix it:**

1. **Check:** All troubleshooting steps above
2. **Search:** GitHub issues for similar problems
3. **Ask:** Claude Code (Governor) for advice
4. **Contact support:**
   - Supabase: support@supabase.io
   - Vercel: support@vercel.com
   - SendGrid: https://support.sendgrid.com

**When asking for help, provide:**

- Exact error message (copy-paste)
- Steps to reproduce
- What you've already tried
- What you'd like to happen

---

## Common Launch Day Mistakes

**Don't do these:**

- ❌ Launch without testing signup
- ❌ Deploy new code on launch day (use proven code)
- ❌ Change environment variables without testing
- ❌ Ignore error alerts during launch
- ❌ Promise uptime guarantees to first customer
- ❌ Go dark when problems occur (communicate with customer)

**Do do these:**

- ✅ Test the full customer journey before inviting them
- ✅ Have this troubleshooting guide open
- ✅ Monitor `/api/health` every 5 minutes for first hour
- ✅ Keep customer informed if issues occur
- ✅ Have rollback plan ready

---

**Remember:** Most launch issues are minor and fixable in <5 minutes.

Stay calm. You've got this. 🚀
