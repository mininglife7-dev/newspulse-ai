# Incident Playbooks — EURO AI

**Purpose:** Step-by-step procedures for common production incidents  
**Audience:** Founder, operations team  
**Last Updated:** 2026-07-16  
**Status:** Ready for production use

---

## Quick Navigation

- [Database Connection Failure](#database-connection-failure)
- [API Endpoint Timeout](#api-endpoint-timeout)
- [Deployment Failure](#deployment-failure)
- [High Error Rate Spike](#high-error-rate-spike)
- [Customer Data Missing](#customer-data-missing)
- [Email Delivery Failure](#email-delivery-failure)
- [Performance Degradation](#performance-degradation)
- [Authentication System Failure](#authentication-system-failure)

---

## Incident Template: Database Connection Failure

**Symptoms:**
- `/api/health` returns degraded or unhealthy
- API endpoints return 500 errors with "database error" message
- Supabase console doesn't respond
- Multiple customers report "can't access dashboard"

**Severity:** CRITICAL (customers completely blocked)  
**Response Time:** 30 minutes  
**Owner:** Founder + Engineering

---

### Step 1: Verify the Issue (2 min)

```bash
# Can we reach Supabase?
curl https://your-project.supabase.co/rest/v1/health

# Should return: {"status":"ok"} or similar
# If timeout or error → Supabase is down or unreachable
```

**If Supabase down:**
1. Check https://supabase.com/status (official status page)
2. If it says incident: Supabase is having issues
3. → Go to Step 2B (Supabase is Down)

**If we can reach Supabase:**
- → Go to Step 2A (Connection Pool Issue)

---

### Step 2A: Connection Pool Issue (10 min)

**Scenario:** Supabase is up but we can't connect

**Diagnosis:**
1. **Check credentials in Vercel:**
   - Go to https://vercel.com/dashboard → EURO AI project
   - Settings → Environment Variables
   - Verify: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not empty

2. **Run simple query in Supabase Console:**
   - Go to https://app.supabase.com
   - Click "SQL Editor"
   - Run: `SELECT 1;`
   - If error: Database is unreachable

3. **Check firewall/network:**
   - Is Vercel IP whitelisted in Supabase? (Usually automatic, but check)
   - Supabase dashboard → Settings → Network

**Fixes:**
- **If credentials empty:** Paste them back into Vercel, redeploy
- **If database query fails:** Database may be corrupted, contact Supabase support
- **If firewall blocked:** Whitelist Vercel IPs in Supabase settings

**Time to fix:** 5-10 min

---

### Step 2B: Supabase is Down (10 min)

**If official Supabase status page shows incident:**

1. **Notify customers:**
   - Email: "We're experiencing a database outage caused by our provider Supabase. ETA: [time]"
   - Check their status page every 15 min for updates

2. **Check Supabase status regularly:**
   - Refresh https://supabase.com/status every 10 min
   - When they resolve: Service should auto-recover

3. **Escalate if needed:**
   - If outage >30 min: Contact Supabase support (premium plan has 1-hour SLA)
   - If outage >2 hours: Consider failover plan (restore from backup)

**No action needed from us — wait for Supabase to recover**

---

### Step 3: Recovery Verification (5 min)

Once database is reachable:

1. **Test health endpoint:**
   ```bash
   curl https://[app-url]/api/health
   # Should return: {"status":"healthy"}
   ```

2. **Test customer signup flow:**
   - Go to https://[app-url]/auth/signup
   - Enter test email/password
   - Should complete successfully

3. **Notify customers:**
   - Email: "Database issue resolved. All systems operational."

4. **Post-mortem:**
   - Document: What caused it? How to prevent?
   - Add test case to catch this in future

---

## Incident Template: API Endpoint Timeout

**Symptoms:**
- Specific endpoint slow (e.g., `/api/risk-assessments` slow)
- User reports: "Assessment takes 30 seconds to save"
- Endpoint sometimes succeeds, sometimes times out

**Severity:** HIGH (customer can't complete tasks)  
**Response Time:** 2 hours  
**Owner:** Founder + Engineering

---

### Step 1: Identify Slow Endpoint (5 min)

1. **Check Vercel logs for slow requests:**
   - Vercel Dashboard → Deployments → [Latest] → Logs
   - Look for requests with high `duration` (>3000ms)
   - Note the endpoint and method (POST /api/risk-assessments)

2. **Ask customer which action is slow:**
   - "Is it saving? Loading? Specific button?"
   - Correlate with endpoint

---

### Step 2: Diagnose Root Cause (10 min)

**Slow endpoints can be caused by:**

**A) Slow database query:**
```sql
-- Run in Supabase SQL Editor
EXPLAIN ANALYZE SELECT * FROM risk_assessments WHERE workspace_id = 'xxx';
-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**B) Slow external API call (Firecrawl, OpenAI):**
- Check Vercel logs for external API timing
- Look for calls to firecrawl.io or api.openai.com taking >5 seconds

**C) Server resource exhaustion:**
- Is Vercel CPU at 100%?
- Are there many concurrent requests?
- Check Vercel Analytics for spike in requests

**D) Unoptimized code:**
- Is code doing multiple queries in a loop?
- Is code doing unnecessary processing?

---

### Step 3: Temporary Workaround (5 min)

**While investigating:**

1. **Increase timeout:**
   - If request takes 10 seconds, timeout is probably 5 seconds
   - Can increase timeout in `lib/fetch-with-timeout.ts` (if implemented)
   - Redeploy

2. **Reduce load:**
   - If many customers hitting endpoint simultaneously, stagger requests
   - Or tell customer to try again in 5 min (wait for traffic to reduce)

3. **Use cached result:**
   - If assessment doesn't need real-time data, use cached version
   - Saves time on subsequent requests

---

### Step 4: Fix (varies)

**If database query slow:**
- Add index on workspace_id or frequently-filtered columns
- Optimize query (select specific columns, not *)

**If external API slow:**
- Add timeout/retry logic to external calls
- Implement caching (don't call every time)
- Or reduce number of external calls per request

**If server overloaded:**
- Distribute load (multiple regions, horizontal scaling)
- Optimize code to use fewer resources
- Or upgrade Vercel plan

---

### Step 5: Verify Fix (5 min)

1. **Time the endpoint:**
   ```bash
   time curl -X POST https://[app-url]/api/risk-assessments \
     -H "Content-Type: application/json" \
     -d '{"workspace_id":"xxx"}'
   # Should complete in <1 second
   ```

2. **Have customer test:**
   - Ask: "Is it faster now?"
   - Measure: "How long does it take now?"

3. **Monitor for regression:**
   - Watch Vercel logs for next 24 hours
   - If slow again: Might be load-related, not code issue

---

## Incident Template: Deployment Failure

**Symptoms:**
- After pushing code, Vercel shows ❌ "Build failed"
- Customers can't access app (old version still running until fix)
- Error message: "Failed to collect page data" or "Build timed out"

**Severity:** CRITICAL  
**Response Time:** 30 minutes  
**Owner:** Founder + Engineering

---

### Step 1: Check Deployment Status (1 min)

1. **Go to:** https://vercel.com/dashboard → EURO AI → Deployments
2. **Look at latest deployment:**
   - ❌ Failed: Read error message
   - ✅ Succeeded: Deployment is fine (issue is elsewhere)

**If succeeded:** This isn't a deployment issue, go to different incident playbook

---

### Step 2: Read Error Message (2 min)

**Click "Failed" deployment → View logs**

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to collect page data for /api/...` | Supabase client initialization failed | Check env vars are set in Vercel |
| `TypeError: Cannot find module '@supabase/...'` | Missing dependency after install | Run `npm install`, commit `package-lock.json` |
| `Build timed out after 60s` | Build taking too long | Optimize code or increase timeout |
| `env var X not found` | Environment variable not set in Vercel | Add to Vercel Settings → Environment Variables |

---

### Step 3: Quick Fix (5-10 min)

**Option A: Fix + Redeploy**
```bash
# If error is in code:
1. Fix the issue locally
2. Commit: git commit -m "fix: [issue]"
3. Push: git push origin [branch]
4. Vercel auto-rebuilds
5. Verify: Deployment should succeed (green ✓)
```

**Option B: Rollback**
```bash
# If fix is complex, roll back to last working version:
1. Go to Vercel Dashboard → Deployments
2. Find last ✓ successful deployment
3. Click "..." menu → Promote to Production
4. Deployment rolls back instantly
5. Investigate issue in dev environment
```

---

### Step 4: Prevent Recurrence (5 min)

**After deployment succeeds:**

1. **Test all critical flows:**
   - Go to https://[app-url] → Sign in → Create company → Add system
   - Verify basic flows work

2. **Add test to CI:**
   - If error was caught by test, add it so it catches in future
   - Run: `npm test` before next deployment

3. **Add pre-deploy check:**
   - Verify Vercel env vars are set before pushing
   - Verify `npm run build` succeeds locally before pushing

---

## Incident Template: High Error Rate Spike

**Symptoms:**
- Error rate jumps to 5%+ (many requests failing)
- Customer reports: "I clicked the button 10 times and got errors 8 times"
- Vercel logs show repeated errors

**Severity:** HIGH  
**Response Time:** 2 hours  
**Owner:** Founder + Engineering

---

### Step 1: Identify Error (5 min)

1. **Go to Vercel logs → Filter by ERROR**
2. **Count errors in last hour:**
   ```
   Filter: level:error AND timestamp:>NOW-1h
   ```
3. **See what percentage of total requests:**
   ```
   Errors: 200
   Total requests: 5000
   Error rate: 4% (high, should be <1%)
   ```

---

### Step 2: Categorize Errors (5 min)

**Look at error messages:**

```
Error 1: "Cannot read property 'workspace_id' of undefined" (x 150)
Error 2: "Database connection timeout" (x 30)
Error 3: "Rate limit exceeded" (x 20)
```

**Most common error:** First one (150 times) is a code bug

---

### Step 3: Determine Impact (5 min)

**Is it:**
- **All users affected?** (systematic bug, red alert)
- **Specific users?** (maybe bad data, less urgent)
- **Specific endpoint?** (isolated issue)
- **Intermittent?** (transient, may self-resolve)

**Example:**
- All users getting "workspace_id" error = systematic bug = CRITICAL
- Only one customer seeing "database timeout" = isolated = HIGH
- Rate limit errors = expected under load = MEDIUM

---

### Step 4: Immediate Mitigation (10 min)

**If widespread bug (affects all users):**
1. **Rollback immediately:** Vercel → Promotions → Select last good deployment
2. **Notify customers:** "We experienced an issue and have rolled back. Working on fix."
3. **Investigate in dev:** Clone the issue, find root cause, fix

**If isolated (one customer):**
1. **Contact customer:** Ask for more details
2. **Provide workaround:** "Try [alternative action]"
3. **Escalate to engineering:** Plan fix for next sprint

**If rate limit errors (under heavy load):**
1. **No action needed:** Expected when traffic spikes
2. **Monitor:** See if it normalizes
3. **Plan:** If happens regularly, implement rate limiting strategy

---

### Step 5: Fix & Prevention (15 min)

**If rollback was needed:**
1. **Fix bug locally:**
   - Recreate error
   - Identify root cause
   - Write test case
   - Fix code
2. **Deploy fixed version:**
   - git commit + git push
   - Verify Vercel build succeeds
3. **Test fix:**
   - Verify error is gone
   - Run `npm test` to ensure no regression

**If rate limiting:**
- Plan upgrade of rate limiting strategy for next sprint
- Document in RELIABILITY-HARDENING-PLAN.md

---

## Incident Template: Customer Data Missing

**Symptoms:**
- Customer reports: "My assessments disappeared!"
- Dashboard shows 0 assessments (but they created 3 yesterday)
- Database query shows data still exists (in Supabase)

**Severity:** CRITICAL (data loss panic)  
**Response Time:** 30 minutes  
**Owner:** Founder + Engineering (legal if actual data loss)

---

### Step 1: Verify Data Exists (5 min)

**In Supabase Console → SQL Editor:**
```sql
SELECT * FROM risk_assessments 
WHERE workspace_id = 'customer-workspace-id'
ORDER BY created_at DESC;
```

**Result:**
- ✅ Rows returned → Data exists (is display issue)
- ❌ No rows → Data deleted (is actual loss)

---

### Step 2: If Display Issue (5 min)

**Data exists in DB but not shown in UI**

**Possible causes:**
1. **RLS policy blocking customer:** Query returns empty due to row-level security
2. **Frontend filter bug:** UI filtering wrongly
3. **Database query wrong:** Querying wrong workspace_id
4. **Cache issue:** Showing stale data

**Fix:**
1. **Clear browser cache:**
   - Customer: F5 + Ctrl+Shift+Delete → Clear all
2. **Sign out + sign in:**
   - Refreshes session and data
3. **Try different browser:**
   - If works in Chrome but not Firefox → Browser issue

**If still missing:**
- Escalate to engineering: Check RLS policies and frontend queries

---

### Step 3: If Actual Data Loss (10 min)

**Data deleted from database**

**Possible causes:**
1. **Accidental cascade delete:** Customer deleted workspace = deleted all assessments
2. **Data corruption:** Database error
3. **Hacker:** Unauthorized deletion
4. **Bug:** Code deleting data it shouldn't

**Investigation:**
```sql
-- Check audit trail (if implemented)
SELECT * FROM audit_log 
WHERE workspace_id = 'xxx' 
AND action = 'DELETE'
ORDER BY timestamp DESC;

-- Or check if workspace still exists
SELECT * FROM workspaces WHERE id = 'xxx';
```

**Recovery:**
1. **If workspace deleted:** Can recover from backup (30-day window)
2. **If assessments deleted:** Can query backup
3. **Contact Supabase support:** Request backup restore

**Time to recover:** 1-2 hours (Supabase manual process)

---

### Step 4: Communication (5 min)

**Reassure customer:**
```
Hi [Customer],

We received your report about missing assessments. Here's what we found:

[If display issue]:
We located your data — it's safe in our system. The issue was a display glitch.
Solution: Clear your browser cache and sign back in. Your data should reappear.

[If actual loss]:
We've identified the issue and we're recovering your data from backup.
ETA: [time] — we'll have your assessments restored.
We apologize for the disruption.
```

---

## Incident Template: Email Delivery Failure

**Symptoms:**
- Customer reports: "I didn't receive verification email"
- Multiple customers saying emails not arriving
- No verification emails in inbox or spam

**Severity:** HIGH (blocks signup flow)  
**Response Time:** 2 hours  
**Owner:** Founder + Supabase Support

---

### Step 1: Verify Issue (5 min)

**Check Supabase email logs:**
1. Go to Supabase Console → Auth → Users
2. Click a user → View details
3. Check: "Email confirmed: yes/no"

**If email not confirmed:**
- Email delivery failed or user never clicked link

**Check Supabase email settings:**
1. Supabase Console → Auth → Email Templates
2. Verify email templates are configured
3. Check: Is email auth enabled? (Should be enabled)

---

### Step 2: Resend Email (5 min)

**Supabase has built-in resend:**
1. Supabase Console → Auth → Users
2. Click user
3. Click "..." menu → Resend confirmation email

**Or direct API call:**
```bash
curl -X POST https://your-project.supabase.co/auth/v1/resend \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","type":"signup"}'
```

---

### Step 3: Check Email Configuration (5 min)

**Supabase email auth settings:**
1. Go to Supabase Console → Auth → Email
2. Check: Is "Email" auth method enabled? (Should be)
3. Check: Are email templates configured? (Should have default templates)

**If auth disabled:**
- Enable it: Auth settings → Email → Toggle on
- Resend email to customer

---

### Step 4: Check Email Provider (10 min)

**Supabase uses Resend (email service) by default**

**If emails not arriving:**
1. **Check spam folder:** Email filters might block
2. **Check email address:** Typo in signup? (gmai.com instead of gmail.com)
3. **Contact Supabase support:** If provider is down
4. **Use custom email provider:** (Phase 2, if persistent issue)

---

### Step 5: Workaround (10 min)

**While waiting for email:**

**Option A: Manual verification**
```bash
# In Supabase Console SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'customer@example.com';
```

**Option B: Skip email verification (temporary)**
- Customer can sign in without verifying email
- Email verification can be done later

**Communicate to customer:**
```
Hi [Customer],

We're experiencing email delivery issues (we're investigating).

Temporary workaround:
- Click sign in with your email
- Leave the verification for now (you can still use the app)
- Verify email later when email service recovers

We expect to resolve this by [time].
Sorry for the disruption!
```

---

## Incident Template: Performance Degradation

**Symptoms:**
- Pages loading slowly (5-10 sec instead of 1-2 sec)
- API responses slow (500ms → 2000ms)
- Database queries timing out
- Customers report: "App is very slow today"

**Severity:** MEDIUM (users can still work, just slow)  
**Response Time:** 24 hours  
**Owner:** Founder + Engineering (operations if resource issue)

---

### Step 1: Confirm Issue (5 min)

**Measure response time:**
```bash
curl -w "@curl-format.txt" -o /dev/null -s https://[app-url]/api/health
# Check "total_time" — should be <100ms
```

**Check Vercel metrics:**
1. Vercel Dashboard → Analytics
2. Look at "Response Time" graph for past hour
3. Is it spiked? Compare to normal baseline

---

### Step 2: Identify Bottleneck (10 min)

**Is it:**
- **Frontend slow?** (JavaScript slow, many DOM nodes)
- **API slow?** (Database query or external API)
- **Database slow?** (Big table scan, missing index)

**Check Vercel function duration:**
```
Logs → Look for "duration: 2500ms" (slow)
Normal: 100-300ms
Slow: >1000ms
```

---

### Step 3: Check Load (5 min)

**Is traffic spike causing slowness?**

**Check Vercel metrics:**
- Requests per minute: Normal? (If 10x normal = overload)
- Concurrent function invocations: High? (Should be <10)

**If under heavy load:**
- This is normal (performance acceptable under load)
- Upgrade Vercel plan or implement caching

**If normal load but slow:**
- Code or database issue, investigate

---

### Step 4: Optimization Options (varies)

**Quick wins (5-15 min):**
1. **Restart database:** Sometimes helps with connection pool issues
   - Supabase Console → Settings → Restart
2. **Clear cache:** Browser cache can cause slow loads
   - Ask customer: Clear cache + refresh
3. **Reduce external API calls:** If calling Firecrawl/OpenAI, reduce frequency

**Medium-term (1-2 hours):**
1. **Add index on database:** If database query slow
2. **Implement caching:** If same data queried repeatedly
3. **Optimize query:** Select specific columns instead of *

**Long-term (1+ day):**
1. **Upgrade database plan:** If size is bottleneck
2. **Migrate to faster API:** If external API slow
3. **Horizontal scaling:** Multiple servers

---

### Step 5: Monitor (ongoing)

**After optimization:**
1. **Measure new response time:**
   ```bash
   curl -w "@curl-format.txt" https://[app-url]/api/health
   ```
2. **Compare to baseline:** Should match normal performance
3. **Monitor for regression:** Watch Vercel metrics for next 24 hours

---

## Incident Template: Authentication System Failure

**Symptoms:**
- Customers can't sign in
- "Invalid credentials" error even with correct password
- "Session expired" for all users
- New users can't sign up

**Severity:** CRITICAL (blocks all users)  
**Response Time:** 30 minutes  
**Owner:** Founder + Supabase Support

---

### Step 1: Verify Supabase Auth (2 min)

**Go to:** https://app.supabase.com → Auth

**Check:**
- Is "Email" auth method enabled? (Should be)
- Are auth policies in place? (Should be default)
- Any recent changes to auth settings? (Check for accidental disable)

---

### Step 2: Test Sign In Flow (5 min)

**Manual test:**
1. Go to https://[app-url]/auth/signin
2. Enter test credentials: `test@example.com` / `TestPassword123`
3. Click "Sign In"

**Result:**
- ✅ Success → Login flow works (issue might be specific user)
- ❌ Error → Auth system broken

---

### Step 3: Check Credentials (5 min)

**If test user fails:**

**Option A: User entered wrong password:**
- Have customer use "Forgot Password" reset link
- New password should work

**Option B: Account locked:**
- Supabase locks accounts after 10 failed attempts
- Contact Supabase support to unlock

**Option C: Account doesn't exist:**
- User never signed up
- Have them sign up fresh

---

### Step 4: Check Supabase Status (2 min)

**If auth broken for all users:**

1. Check Supabase status: https://supabase.com/status
2. If incident showing: Supabase auth down (not our issue)
   - Notify customers: "Our auth provider is down, ETA [time]"
   - Wait for recovery

3. If status OK: Auth config might be broken
   - Escalate to engineering

---

### Step 5: Workaround (10 min)

**If Supabase auth temporarily down:**

**Temporary bypass (not recommended for long-term):**
1. Disable login requirement temporarily (remove middleware check)
2. Redeploy
3. Re-enable when auth recovers
4. Ask customers to try again

**Better option:**
- Set messaging: "Sign-in temporarily unavailable, try again in [time]"
- Wait for Supabase recovery

---

## General Incident Management

### During Incident

1. **Diagnose (5-10 min):** Use playbook to identify root cause
2. **Communicate (5 min):** Tell affected customers what's happening
3. **Mitigate (10-30 min):** Implement immediate fix or workaround
4. **Verify (5 min):** Confirm fix works for customers
5. **Post-mortem (15 min):** Document what happened and how to prevent

### Incident Log Entry

```markdown
## Incident: [Brief Description]

**Date:** 2026-07-20  
**Time:** 14:35 UTC  
**Duration:** 15 minutes  
**Severity:** HIGH  
**Status:** RESOLVED  

### What Happened
[Description of incident]

### Root Cause
[Why it happened]

### Impact
- [Affected X customers]
- [Feature Y was broken]
- [No data loss]

### Resolution
[What was done to fix]

### Prevention
[How to prevent in future]
- [Action 1]
- [Action 2]
```

### Escalation Decision

**Escalate to engineering if:**
- Issue not in any playbook
- Playbook steps don't resolve it
- Root cause is unknown after 15 min
- Multiple systems affected
- Customer data at risk

---

## Post-Incident Review (24 hours after)

1. **Document:** What happened, timeline, impact
2. **Analyze:** Why did it happen? What failed?
3. **Improve:**
   - Add test case to catch issue
   - Update monitoring to alert on condition
   - Add safeguard to prevent recurrence
   - Update this playbook with learnings

---

**Incident Playbooks Complete**  
**Ready for Production Use**  
**Print or bookmark for quick reference during incidents**

**Remember: Calm, methodical diagnosis beats panicked reactions every time.**
