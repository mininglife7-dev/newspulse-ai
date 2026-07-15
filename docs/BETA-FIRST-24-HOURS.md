# EURO AI Beta — First 24 Hours Operations Guide

**Purpose:** Rapid response procedures for the critical first day of customer usage.  
**Audience:** Founder, operations team, customer support  
**Timeline:** First 24 hours after first customer signup

---

## Pre-Launch Checklist (1 hour before first invite)

Before inviting the first customer, complete these verification steps:

### 1. Environment Validation (5 min)

Run the pre-launch validation script:
```bash
cd /home/user/newspulse-ai
bash scripts/pre-launch-validation.sh
```

Expected output:
```
✓ Build succeeds (next build)
✓ TypeScript strict mode (zero errors)
✓ ESLint validation (zero violations)
✓ All tests passing (405 tests)
✓ Vercel config: Frankfurt region (EU/GDPR)
✓ Environment example file exists
✓ Supabase schema exists (5 tables)
✓ Row-Level Security policies defined (8 policies)
✓ Documentation: All 7 files present
✓ Environment files excluded from Git
✓ No hardcoded API keys in source
✓ No critical TODOs blocking launch
```

**If ANY checks fail:** Do NOT invite customers. Fix the issue first.

### 2. Production Health Check (2 min)

```bash
# Check API health
curl -s https://newspulse-ai.vercel.app/api/health | jq .

# Expected response
{
  "healthy": true,
  "timestamp": "2026-07-15T10:30:00Z",
  "database": "connected",
  "externalAPIs": "reachable"
}
```

**If unhealthy:** Check Vercel deployments dashboard. Redeploy if needed.

### 3. Database Connectivity (2 min)

Test from Supabase dashboard:
```sql
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected: 5 tables (workspaces, workspace_members, profiles, news_searches, companies)

**If fewer tables:** Schema deployment failed. Re-run schema.sql in Supabase SQL Editor.

### 4. API Key Validation (2 min)

Test each external API is accessible:
```bash
# Firecrawl test
curl -s -H "Authorization: Bearer $FIRECRAWL_API_KEY" https://api.firecrawl.dev/v0/crawl

# OpenAI test
curl -s -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models | head -c 50

# Supabase test (already did this above, but verify auth works)
```

**If any fail:** Credentials missing or incorrect in Vercel environment variables.

---

## Critical Metrics to Monitor (Every 15 minutes for first hour)

### Dashboard 1: Customer Success

| Metric | Target | Check | How Often |
|--------|--------|-------|-----------|
| Signup completion | 100% | Verify customer email confirmed | Continuous |
| Workspace creation | <5 sec | Check Supabase (workspaces table) | After signup |
| First search latency | <3 sec | Firecrawl API response time | Per search |
| Database writes | No errors | Check Vercel logs for exceptions | Continuous |

### Dashboard 2: System Health

| Metric | Target | Check | How Often |
|--------|--------|-------|-----------|
| API response time | <1 sec | Vercel analytics dashboard | Every 5 min |
| Error rate | 0% | Vercel deployments → Logs | Continuous |
| Database connections | <5 active | Supabase dashboard | Every 5 min |
| External API health | 100% | Manual curl tests | Every 15 min |

### Dashboard 3: Cost Tracking

| Cost Driver | Expected | Check | How Often |
|-------------|----------|-------|-----------|
| Firecrawl API calls | $0.10 - $0.50 (per search) | Firecrawl dashboard | Per search |
| OpenAI completions | $0.05 - $0.20 (per summary) | OpenAI usage dashboard | Per search |
| Supabase database | $0 (free tier) or $25 (pro) | Supabase dashboard | Every 30 min |
| Vercel serverless | $0 (hobby) or $20+ (Pro) | Vercel analytics | Every 30 min |

**Critical:** If costs spike unexpectedly, immediately check for runaway loops or attacks. See EMERGENCY RESPONSE below.

---

## Real-Time Monitoring Checklist

### Every 5 Minutes (First Hour)

```
☐ Customer still engaged (check database for recent activity)
☐ API health endpoint returns 200 + healthy: true
☐ Vercel deployment shows "Ready" (no errors)
☐ Error logs are clean (check Vercel logs for exceptions)
☐ External APIs responding (spot-check Firecrawl, OpenAI)
```

### Every 15 Minutes (First 6 Hours)

```
☐ Review Vercel analytics → Response time still <1 sec
☐ Review Supabase → New user data persisting correctly
☐ Spot-check database queries run fast (<500ms)
☐ Monitor cost accrual (unusual spike = problem)
☐ Verify email confirmation working (check Supabase auth logs)
```

### Every 1 Hour (First 24 Hours)

```
☐ Customer feedback positive (gather any errors they reported)
☐ Review GitHub Actions → No failed deployments
☐ Verify uptime (if UptimeRobot configured, should show 100%)
☐ Database backup completed (if automated backup enabled)
☐ Security: No suspicious activity in logs
```

---

## EMERGENCY RESPONSE PROCEDURES

### Symptom: Customer Cannot Sign Up (Signup Page Blank or 500 Error)

**Diagnosis (2 min):**
```bash
# Check API health
curl https://newspulse-ai.vercel.app/api/health

# Check Vercel logs
# Go to: https://vercel.com → Projects → newspulse-ai → Deployments → Latest → Function logs

# Check Supabase connectivity
# Go to: https://app.supabase.com → SQL Editor
# Run: SELECT COUNT(*) FROM profiles;
```

**If health check fails:**
→ Vercel deployment is broken. See FIX A below.

**If health check passes but signup fails:**
→ Application error. Check Vercel function logs for specific error message.

**FIX A: Redeploy from Vercel Dashboard (2 min)**
```
1. Go to: https://vercel.com → Projects → newspulse-ai
2. Click "Deployments" tab
3. Find latest deployment (should have checkmark)
4. If latest shows red X:
   - Click it → see build error
   - Fix error locally → push new commit to main
   - Vercel auto-redeploys
5. If latest shows checkmark but API is down:
   - Click "Promote to Production" on a working deployment
6. Wait 1-2 minutes for deployment to stabilize
7. Test: curl https://newspulse-ai.vercel.app/api/health
```

**FIX B: Re-deploy Schema (3 min)**
```
1. Go to: https://app.supabase.com → SQL Editor
2. Copy entire contents of supabase/schema.sql
3. Paste into editor
4. Click "Run"
5. Wait for success message
6. Verify: Tables appear in Supabase → Table Editor
```

---

### Symptom: API Health Check Returns Errors

**Diagnosis:**
```bash
curl -i https://newspulse-ai.vercel.app/api/health
```

**Common errors and fixes:**

#### Error: "Cannot find module 'firecrawl-js'"
- **Cause:** Dependency not installed during build
- **Fix:** Push new commit to trigger rebuild (or force redeploy from Vercel)

#### Error: "undefined process.env.FIRECRAWL_API_KEY"
- **Cause:** Environment variable not set in Vercel
- **Fix:** Go to Vercel → Settings → Environment Variables → verify all 5 vars are set → Redeploy

#### Error: "Connection refused to supabase"
- **Cause:** Supabase credentials invalid or DB down
- **Fix:** 
  1. Verify NEXT_PUBLIC_SUPABASE_URL is correct (from Supabase → Settings → API)
  2. Verify SUPABASE_SERVICE_ROLE_KEY is correct
  3. Check Supabase status page (is there an outage?)
  4. Redeploy app to refresh connections

#### Error: "503 Service Unavailable"
- **Cause:** Vercel or external API temporarily down
- **Fix:** Wait 2 minutes and retry. If persists after 5 min, see ESCALATION below.

---

### Symptom: Search Takes > 5 Seconds or Hangs

**Diagnosis (during search):**
```bash
# Monitor Vercel logs in real-time
# Go to: Vercel → Projects → newspulse-ai → Deployments → Latest → Function logs
# Filter by "search" API route
# Look for timing and error messages
```

**Common causes and fixes:**

#### Firecrawl API is slow
- **Check:** https://status.firecrawl.dev (is there an outage?)
- **Fix:** Search is retried up to 3 times. Wait 30 sec and tell customer to retry.

#### OpenAI API is slow
- **Check:** https://status.openai.com (is there an outage?)
- **Fix:** Retry in 1 minute. If persists, switch to faster model (gpt-3.5-turbo).

#### Database query is slow
- **Check:** Supabase → SQL Editor → run EXPLAIN on slow query
- **Fix:** 
  1. Check for missing indexes (should have been created by schema.sql)
  2. Check if RLS policy is doing full table scan
  3. If >1000 searches, data might need pagination

#### Timeout (after 30 seconds)
- **Cause:** Vercel function hit 30-second timeout
- **Fix:** This is a hard limit. Search took too long. Try:
  1. Retry the search (might be temporary)
  2. If still timing out, reduce number of articles in Firecrawl request
  3. Reduce number of summaries requested

---

### Symptom: Data Not Persisting (Create workspace, refresh page, data gone)

**Diagnosis:**
```sql
-- In Supabase SQL Editor
SELECT * FROM workspaces ORDER BY created_at DESC LIMIT 1;
```

**If data exists in database but doesn't show in UI:**
- **Cause:** Session cookie issue or RLS policy blocking reads
- **Fix:**
  1. Clear browser cookies: Cmd+Shift+Delete → Delete cookies for newspulse-ai.vercel.app
  2. Log out and log back in
  3. Try creating workspace again

**If data doesn't exist in database:**
- **Cause:** Write failed silently (RLS policy or database error)
- **Fix:**
  1. Check Vercel logs for exceptions during workspace creation
  2. Verify user_id in session matches auth.users table
  3. Check Supabase RLS policy on workspaces table allows INSERT

---

### Symptom: 403 Forbidden on Any API Call

**Diagnosis:**
- **Most likely cause:** Supabase RLS policy is blocking the operation

**Fix:**
```sql
-- In Supabase SQL Editor, check RLS policy for the affected table
SELECT polname, poldef FROM pg_policy WHERE polrelname = 'workspaces';

-- Temporarily disable RLS to isolate the issue (CAREFUL - security risk)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- Re-test the operation
-- If it works, the policy was the problem
-- Re-enable RLS and fix the policy
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
```

---

### Symptom: Customer Complains About Slow Performance

**Baseline comparison:**
- Expected for first search: 3-5 seconds
- Expected for subsequent searches: <2 seconds (cached)
- Expected for UI interactions: <500ms

**If actual > baseline by >50%:**

1. **Check external API status (2 min):**
   ```
   - Firecrawl: https://status.firecrawl.dev
   - OpenAI: https://status.openai.com
   ```

2. **Check your app's performance (2 min):**
   ```
   - Vercel Analytics: https://vercel.com → Projects → newspulse-ai → Analytics
   - Look for high latency or errors
   ```

3. **Check database performance (2 min):**
   ```sql
   -- In Supabase SQL Editor
   SELECT 
     schemaname, tablename, 
     round(100 * live_tuples / nullif(live_tuples+dead_tuples, 0), 1) as bloat_ratio
   FROM pg_stat_user_tables
   ORDER BY live_tuples DESC;
   ```

4. **If database is slow:**
   - Run VACUUM: `VACUUM ANALYZE;` in Supabase
   - Check for missing indexes: `SELECT * FROM pg_indexes WHERE schemaname='public';`
   - If lots of dead tuples (bloat >50%): This is a capacity issue. See ESCALATION below.

---

### Symptom: Unexpected High Costs (Bill jumped 10x)

**Immediate action (2 min):**
```bash
# STOP INCOMING TRAFFIC to prevent further costs
# Option 1: Pause Vercel deployment (safest)
# Option 2: Delete API keys temporarily (nuclear option, breaks everything)

# In Vercel: Projects → newspulse-ai → Settings → Pause Deployment
```

**Diagnosis (while paused):**

1. **Check Vercel function logs:**
   ```
   Look for loops calling external APIs repeatedly
   Look for ever-growing request counts
   Look for unusual latency patterns
   ```

2. **Check for attacks:**
   ```
   Look for requests from single IP hitting API 1000s of times
   Look for requests with unusual parameters (huge search terms, etc)
   Look for rapid workspace/user creation
   ```

3. **Check cost drivers:**
   - Firecrawl dashboard: How many API calls?
   - OpenAI dashboard: How many tokens?
   - Which endpoint is causing the spike?

**Fix options (in order of preference):**

**Option 1: Rate limiting (safe, temporary)**
- Already built-in. Verify it's working: Make 100 requests in 1 second, should get 429s
- If not working: Set env var `RATE_LIMIT_ENABLED=true` in Vercel

**Option 2: Cap Firecrawl calls**
- Reduce max articles per search (currently 10)
- Filter to recent articles only
- Implement search result caching

**Option 3: Cap OpenAI spending**
- Reduce number of summaries (batch them)
- Switch to faster/cheaper model
- Implement response caching

**Option 4: Investigate root cause**
- Was there a bug that made a loop?
- Did customer start a mass crawl intentionally?
- Is there an attack?

**After fixing, resume production:**
```
Vercel → Projects → newspulse-ai → Settings → Resume Deployment
```

---

## ESCALATION PROCEDURES

### When to Escalate to External Support

**Firecrawl is down (red on status page):**
- Can't fix this yourself
- Customer will need to retry later
- Document: "Firecrawl maintenance window until [time]"

**OpenAI is down (red on status page):**
- Can't fix this yourself
- Switch to degraded mode (no AI summaries, raw articles only)
- Document: "AI summaries temporarily unavailable due to upstream outage"

**Supabase is down (red on status page):**
- Can't fix this yourself
- Entire app is broken
- Document: "Service unavailable due to database maintenance"
- Apologize to customer, offer credit

**Database corruption (cannot write, indexes broken):**
- Restore from backup
- Contact Supabase support
- Allow 30-60 minutes for recovery

**Vercel build fails (nothing deploys):**
- Code error during build
- Fix locally, test with `npm run build`, push new commit
- Vercel auto-redeploys

**GitHub Actions blocked:**
- Spending limit reached
- Increase limit in GitHub → Settings → Billing → Actions
- Wait 5 min for Actions to resume

---

## Success Criteria (After First 24 Hours)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | 100% | ___ | ☐ |
| Error rate | <1% | ___ | ☐ |
| Signup completion | 100% | ___ | ☐ |
| Search latency | <5 sec | ___ | ☐ |
| Customer satisfaction | Positive | ___ | ☐ |
| No escalations | Yes | ___ | ☐ |
| Costs within budget | <$10 | ___ | ☐ |

---

## Quick Reference: Common Commands

### Check System Status
```bash
# Full health check
curl https://newspulse-ai.vercel.app/api/health | jq .

# Check if Vercel app is deployed
curl -I https://newspulse-ai.vercel.app

# Check Supabase reachability
curl -H "Authorization: Bearer $ANON_KEY" https://your-project.supabase.co/rest/v1/
```

### Restart/Redeploy
```bash
# Force redeploy from Vercel
# Option 1: Make a trivial commit to main
git commit --allow-empty -m "ci: Force redeploy"
git push origin main

# Option 2: Click "Promote to Production" in Vercel UI
# Option 3: Trigger GitHub Actions manually via API
```

### Emergency Database Check
```sql
-- In Supabase SQL Editor

-- Check recent user activity
SELECT user_id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Check recent workspace activity
SELECT id, name, created_at FROM workspaces ORDER BY created_at DESC LIMIT 5;

-- Check recent searches
SELECT id, query, created_at FROM news_searches ORDER BY created_at DESC LIMIT 5;

-- Check for errors
SELECT * FROM pg_catalog.pg_indexes WHERE schemaname = 'public';
```

### Monitor Logs Live
```bash
# If you have Vercel CLI installed
vercel logs --follow

# Or watch Vercel dashboard: https://vercel.com → Deployments → Logs
```

---

## Contact Info & Resources

**If you get stuck:**

1. **Check Troubleshooting above** (95% of issues)
2. **Read Operations Runbook:** `/docs/infra/OPERATIONS-RUNBOOK.md`
3. **Check external status pages:**
   - Firecrawl: https://status.firecrawl.dev
   - OpenAI: https://status.openai.com
   - Supabase: https://status.supabase.com
   - Vercel: https://www.vercelstatus.com
4. **Contact support (include logs):**
   - Supabase: https://supabase.com/support
   - Vercel: https://vercel.com/support
   - OpenAI: https://help.openai.com
   - Firecrawl: https://docs.firecrawl.dev/support

---

**Last Updated:** 2026-07-15  
**Next Review:** After first 10 customers sign up  
**Owner:** Governor  
**Version:** 1.0
