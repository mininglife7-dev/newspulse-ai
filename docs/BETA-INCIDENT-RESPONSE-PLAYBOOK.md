# NewsPulse AI — Beta Incident Response Playbook

**Document Type:** Incident Response Procedures  
**Phase:** Beta Pilot Program  
**Last Updated:** 2026-07-12  
**Audience:** On-Call Engineer, Support Team, Founder

---

## Quick Reference

| Incident | Severity | Decision Time | Fix Time | Owner |
|----------|----------|---------------|----------|-------|
| Service Down (can't reach app) | P0-Critical | 5 min | 30 min | On-call eng |
| Signup Flow Broken | P0-Critical | 5 min | 30 min | On-call eng |
| Search Fails for All Users | P0-Critical | 5 min | 30 min | On-call eng |
| High Error Rate (>5%) | P1-High | 15 min | 60 min | On-call eng |
| Search Slow (>90s) | P2-Medium | 30 min | 120 min | On-call eng |
| Single Customer Issue | P3-Medium | 60 min | 240 min | Support team |
| Data Integrity Issue | P0-Critical | 5 min | Varies | Founder + eng |

---

## Incident Lifecycle

### Phase 1: Detection (0-5 minutes)

Someone notices something is wrong:

**Sources:**
- DNA-GOV-002 alert (Health Monitor)
- DNA-GOV-004 alert (Error Rate Monitor)
- Customer email to support@newspulse-ai.com
- You trying to use the app and it fails

**Immediate Actions:**
1. **Verify it's real** — Not a false positive or your internet
2. **Determine scope** — Is it you, one customer, or everyone?
3. **Assign owner** — Who will handle this?
4. **Create incident record** — Start tracking

**Incident Record Template:**
```
Incident #: INC-001
Title: [Brief description]
Severity: P0 / P1 / P2 / P3
Detected: 2026-07-12 14:30 UTC
Detected By: [Name]
Status: INVESTIGATING
Affected Users: [# or "all"]
Root Cause: [TBD]
Owner: [Name]
Last Updated: [Timestamp]
```

### Phase 2: Diagnosis (5-30 minutes)

**Goal:** Understand what's broken and why.

**Diagnosis Steps:**

1. **Check Your Own System**
   ```bash
   # Can you access the app?
   curl https://newspulse-ai.vercel.app/
   
   # Can you reach the API?
   curl https://newspulse-ai.vercel.app/api/health
   
   # What's the response? (200 OK? 500 error? Timeout?)
   ```

2. **Check System Status**
   - Vercel dashboard: https://vercel.com/dashboard (Deployment status?)
   - Supabase dashboard: https://app.supabase.com (Database responding?)
   - GitHub Actions: https://github.com/mininglife7-dev/newspulse-ai/actions (Build passing?)
   - External APIs: Check Firecrawl, OpenAI status pages

3. **Check Logs**
   ```bash
   # From Vercel Function Logs
   # Filter by: recent timestamps, error status codes
   # Look for: Error messages, stack traces, patterns
   
   # Common patterns:
   # "Cannot connect to database" = Database down
   # "API key invalid" = Env var issue
   # "Timeout" = External API slow
   # "TypeError: cannot read property" = Code bug
   ```

4. **Ask Clarifying Questions**
   - When did it start?
   - Did something deploy recently? (Check git log)
   - Is it all customers or one?
   - Can you reproduce it consistently?
   - What's the exact error message?

5. **Determine Root Cause**
   - **If System Down:** Vercel/Supabase issue
   - **If API Errors:** Likely code bug or env var
   - **If Timeout:** External API slow
   - **If RLS Error (403):** Database policy issue
   - **If Login Issue:** Session/cookie problem

**Update Incident Record:**
```
Root Cause: [What we've determined]
Status: [INVESTIGATING → FIX IN PROGRESS → RESOLVED]
Next Step: [What we're doing to fix]
```

### Phase 3: Immediate Action (30-60 minutes)

**Goal:** Restore service quickly (temporary if needed).

**Option A: Quick Fix (If Code Bug)**
1. Identify the bad code
2. Fix it (or revert the commit)
3. Deploy to production
4. Verify fix works
5. Monitor for 15 minutes

**Option B: Rollback (If Recent Deployment Broke Things)**
1. Identify the broken deployment
2. Rollback to previous known-good version
3. Verify all systems respond
4. Communicate to customers
5. Plan permanent fix for later

**Option C: Workaround (If External API Down)**
1. Temporarily disable the broken feature
2. Return graceful error to customers
3. Document expected recovery time
4. Update status page

**Option D: Scale (If Database Connection Pool Exhausted)**
1. Increase connection pool size in Supabase
2. Restart database connections
3. Monitor for recovery
4. Optimize queries to reduce connection usage

**Example Rollback:**
```bash
# Check recent deployments
vercel list

# Rollback to previous version
vercel rollback

# Verify health
curl https://newspulse-ai.vercel.app/api/health
```

### Phase 4: Validation (60-90 minutes)

**Goal:** Confirm fix worked and won't regress.

**Validation Checklist:**
- [ ] Service responding normally? (/api/health)
- [ ] Error rate back to normal (<1%)?
- [ ] Latency normal? (Usually <60s)
- [ ] Can you reproduce the original issue? (Should fail to reproduce)
- [ ] Try the full customer workflow (signup → search → history)
- [ ] Check logs for any new errors
- [ ] Monitor alerts for 15 minutes (should be stable)

**Update Incident Record:**
```
Status: RESOLVED
Resolved: 2026-07-12 15:00 UTC
Duration: 30 minutes
Root Cause: [Confirmed cause]
Permanent Fix: [What we'll do to prevent recurrence]
```

### Phase 5: Communication (Throughout)

**During Incident:**
```
Email to affected customers (if any):
Subject: NewsPulse AI Service Issue [Investigating]

We are experiencing issues with [feature]. Our team is investigating.
Expected resolution: [estimate]
Status page: https://status.newspulse-ai.com

We'll update this email with progress.
```

**When Resolved:**
```
Email to customers:
Subject: NewsPulse AI Service Issue [RESOLVED]

The issue has been resolved at 15:00 UTC.
Duration: 30 minutes
Root cause: [Brief explanation]
Impact: [How many customers affected]

We apologize for the disruption.
— NewsPulse Operations Team
```

### Phase 6: Post-Incident (Next 24-48 hours)

**Goal:** Prevent this from happening again.

**Immediate Post-Mortem:**
1. Document exactly what happened (timeline of events)
2. What caused it (root cause analysis)
3. Why we didn't catch it sooner (detection gap?)
4. How to prevent in future (process improvement)

**Permanent Fix (If Needed):**
- If rollback was temporary: Fix the code and re-deploy
- If it was a configuration issue: Document and update runbooks
- If it was a monitoring gap: Add new alert

**Update Runbooks:**
- Did this scenario reveal a missing procedure? Add it.
- Did an existing procedure not work well? Update it.
- Did we learn something new? Document it.

**Knowledge Sharing:**
- Brief team on what happened and why
- Share updated procedures
- Thank people who helped resolve

---

## Specific Incident Scenarios

### Scenario 1: Service Down (Can't Reach App)

**Symptoms:**
- curl to app returns "Connection timeout" or "Connection refused"
- Customers report blank page or "Service Unavailable"
- /api/health doesn't respond

**Diagnosis (5 min):**

```bash
# Step 1: Is it your internet?
curl https://google.com  # If this works, it's not your internet

# Step 2: Can you reach Vercel?
curl https://vercel.com  # If yes, Vercel is up

# Step 3: Check Vercel deployment status
# Go to: https://vercel.com/newspulse-ai/dashboard
# Look for: Red X or "Failed" on latest deployment

# Step 4: Check database
# Go to: https://app.supabase.com
# Look for: Database status indicator
```

**Common Causes:**

| Cause | Evidence | Fix |
|-------|----------|-----|
| **Deployment failed** | Red X in Vercel | Rollback to previous version |
| **Database down** | Supabase status page shows incident | Wait for Supabase recovery or restore backup |
| **Out of connections** | Supabase shows "connection pool full" | Restart pool or increase size |
| **Vercel outage** | Vercel status page shows incident | Wait for recovery, ~15-60 min typical |
| **DNS issue** | Can reach Vercel but not our domain | Check DNS settings in Vercel |

**Fix Priority:**
1. If deployment error: Rollback immediately (2 min)
2. If database issue: Check Supabase status, may need escalation
3. If Vercel outage: Wait for recovery, communicate to customers

**Rollback Procedure:**
```bash
# List recent deployments
vercel list --limit 10

# See which one failed (look for red status)
# Rollback to the one before
vercel rollback

# Verify
curl https://newspulse-ai.vercel.app/api/health
# Should return: {"healthy": true, ...}
```

**Communication:**
```
Incident: Service Down
Duration: 30 minutes
Cause: Deployment error
Fix: Rolled back to previous stable version
Status: RESOLVED
```

---

### Scenario 2: Signup Flow Broken

**Symptoms:**
- Customer completes signup but doesn't receive email
- Customer receives email but clicking link gives error
- Customer clicks link but workspace doesn't create
- Signup completes but customer can't log back in

**Diagnosis (5 min):**

Test the flow yourself:
```bash
# Step 1: Send signup email
curl -X POST https://newspulse-ai.vercel.app/auth/signup \
  -d "email=test-$(date +%s)@example.com"
# Should return: 200 OK

# Step 2: Check if email was sent
# Check spam folder (wait 2 min for delivery)
# Email should be from noreply@supabase.io

# Step 3: Click verification link in email
# Browser should redirect to workspace creation form

# Step 4: Create workspace
curl -X POST https://newspulse-ai.vercel.app/api/workspace \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Test Workspace"}'
# Should return: 201 Created with workspace ID
```

**Common Causes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| No email received | Email service down, or address typo | Verify address, check Supabase email settings |
| Email bounces | Address invalid or blocked | Ask customer to confirm email |
| Link doesn't work | Session expired (>24h old) or link tampered | Send new signup link |
| Workspace not created | RLS policy issue or database error | Check Supabase logs, may need to manually create |
| Can't log back in | Session cookie issue | Clear cookies, try signing in again |

**Fix Priority:**
1. If email service down: Verify in Supabase dashboard, may need to reconfigure
2. If customer issue: Manually create workspace for them (temporary), fix issue long-term
3. If RLS issue: Fix policy in Supabase, re-deploy if needed

**Manual Workspace Creation** (Last Resort):
```sql
-- In Supabase SQL Editor
-- Create workspace for customer
INSERT INTO workspaces (id, owner_id, name, company_name)
VALUES (gen_random_uuid(), 'USER_ID_HERE', 'Customer Company', 'Customer Company')
RETURNING id;

-- Verify it was created
SELECT * FROM workspaces WHERE owner_id = 'USER_ID_HERE';
```

**Communication:**
```
We experienced an issue with our email verification service. 
We've manually created your workspace and you should be able to 
sign in now at https://newspulse-ai.vercel.app

Please try again and let us know if you encounter any issues.
```

---

### Scenario 3: Search Results Failing (High Error Rate)

**Symptoms:**
- Customers report "Search failed" or "Try again later"
- Error rate in monitoring shows >5%
- Some searches work, some fail (inconsistent)

**Diagnosis (5 min):**

```bash
# Step 1: Try searching yourself
# Go to app, run a search
# Expect it to fail or succeed inconsistently

# Step 2: Check error logs
# Vercel dashboard → Logs
# Filter by 5xx status codes
# Look for error messages

# Step 3: Check external APIs
# Are Firecrawl and OpenAI responding?
curl -H "Authorization: Bearer FIRECRAWL_KEY" \
  https://api.firecrawl.dev/v1/health
# Should return 200 OK

# Step 4: Check database for errors
# Supabase dashboard → Logs
# Look for "connection refused" or "query timeout"
```

**Common Causes:**

| Cause | Evidence | Fix |
|-------|----------|-----|
| **Firecrawl API down** | Firecrawl health check fails | Wait for recovery or implement queue |
| **OpenAI API rate limit** | OpenAI logs show 429 errors | Implement request batching or upgrade plan |
| **Database timeout** | Logs show "query exceeded timeout" | Add index or optimize query |
| **Code bug** | Same error in all failures | Fix bug or rollback recent deployment |
| **Memory leak** | API runs out of memory | Restart or investigate memory usage |

**Fix Priority:**
1. External API issue: Already handled gracefully, customer sees "service busy"
2. Code bug: Fix or rollback
3. Database issue: Optimize queries or add indexes

**Quick Investigation:**
```bash
# Which step is failing?
# Logs should show: [search-request] → [firecrawl-call] → [openai-call] → [db-insert]

# If fails at firecrawl: External API issue
# If fails at openai: External API issue  
# If fails at db-insert: Database or code issue
```

**Temporary Workaround:**
```
If external API is down but will recover soon:
- Return graceful error: "Service temporarily busy, try again in 5 minutes"
- Implement retry: Automatically retry after timeout
- Queue requests: Retry failed searches hourly
```

**Communication:**
```
We're experiencing high error rates on our news search service.
Our team is investigating. This is typically caused by high demand
on our third-party services.

Please try again in 5 minutes. We apologize for the inconvenience.
```

---

### Scenario 4: High Error Rate (>5%)

**Symptoms:**
- Monitoring alert: "Error rate 7.5%"
- Multiple types of errors (not just one endpoint)
- Affects multiple customers (not just one)

**Diagnosis (5 min):**

```bash
# Step 1: What's the error rate now?
curl https://newspulse-ai.vercel.app/api/alerts | jq '.systems.errors'

# Step 2: What's the error distribution?
# Vercel dashboard → Logs
# Filter by 5xx, group by status code:
# - 500: Internal server error (we broke it)
# - 502: Bad gateway (Vercel issue)
# - 503: Service unavailable (dependency down)
# - 504: Gateway timeout (slow response)

# Step 3: When did it start?
# Check recent deployments
git log --oneline -10

# Step 4: Did code just deploy?
# If yes, that's likely the cause
# If no, check external services
```

**Common Causes:**

| Cause | Error Type | Fix |
|-------|-----------|-----|
| **Code bug in recent PR** | 500 Internal error | Rollback deployment |
| **Database connection pool exhausted** | 500 or 503 | Increase pool size |
| **Firecrawl API down** | 503 Service unavailable | Wait for recovery |
| **Vercel infrastructure issue** | 502 Bad gateway | Wait for recovery |
| **Env var misconfigured** | 500 with "undefined" error | Fix env var in Vercel |

**Fix Priority:**
1. If recent deployment: Rollback immediately
2. If database issue: Increase connections
3. If external API: Implement graceful degradation
4. If infrastructure: Wait for provider to recover

**Rollback If Recent Deployment:**
```bash
# Check when error rate started
# vs when last deployment finished

# If deployment finished <5 min before error spike:
vercel rollback

# Verify error rate drops back to <1%
```

**Communication:**
```
We're experiencing higher than normal error rates. Our team is 
investigating the root cause.

Error rate: 7.5% (normal: <1%)
Affected feature: News search
Estimated resolution: 15 minutes

We'll send an update shortly.
```

---

### Scenario 5: Database Performance Degradation

**Symptoms:**
- Searches taking >90 seconds (normal: 60s)
- Latency monitor alert: "P95 latency 120s (was 60s)"
- "Query timeout" errors in some requests

**Diagnosis (5 min):**

```sql
-- In Supabase SQL Editor
-- Find slow queries
SELECT query, mean_exec_time FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- >1 second
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Unused indexes
ORDER BY idx_scan;
```

**Common Causes:**

| Cause | Evidence | Fix |
|-------|----------|-----|
| **Missing index** | Slow query on frequently-used column | Add index to that column |
| **Excessive connections** | Connection count >150 of 200 | Reduce connection usage or increase pool |
| **Large table scan** | "Sequential scan" on big table | Add index to WHERE clause |
| **N+1 query problem** | Many sequential queries instead of JOIN | Refactor to use JOIN |

**Fix: Add Missing Index**
```sql
-- Example: searches are slow on workspace_id
CREATE INDEX idx_news_searches_workspace ON news_searches(workspace_id);

-- Verify index was created
SELECT * FROM pg_stat_user_indexes 
WHERE tablename = 'news_searches';
```

**Verify Fix:**
```sql
-- Re-run the slow query
-- Should be much faster now
EXPLAIN ANALYZE SELECT * FROM news_searches 
WHERE workspace_id = 'specific-id'
LIMIT 100;
```

**Communication:**
```
We're experiencing slower than normal search times. We've identified
a database performance issue and are implementing a fix.

Expected resolution: 10 minutes (requires database restart)
Impact: Searches may take longer during this time
```

---

### Scenario 6: Memory Leak (Process Using Excessive Memory)

**Symptoms:**
- Performance dashboard shows memory usage increasing over time
- Vercel restarts function (memory limit exceeded)
- Error messages like "JavaScript heap out of memory"

**Diagnosis:**

This is usually a code issue. Look for:
- Unbounded arrays/objects growing over time
- Event listeners not cleaned up
- Circular references preventing garbage collection

**Common Causes:**

```javascript
// BAD: Global array growing unbounded
let results = [];
export async function POST(req) {
  // ... process request ...
  results.push(data);  // Memory leaks!
}

// GOOD: Use database instead
export async function POST(req) {
  // ... process request ...
  await db.insert(data);  // Frees memory
}
```

**Fix:**
1. Identify the leaking code
2. Fix it (usually by using database instead of in-memory)
3. Deploy fix
4. Verify memory usage stays constant

**Temporary Workaround (If Fix Not Ready):**
```
In Vercel function settings: Reduce timeout
This forces function to restart more often, clearing memory
Not ideal but buys time for permanent fix
```

**Communication:**
```
We identified a memory issue in our search processing. We're 
deploying a fix that will improve performance and reliability.

No customer impact expected, this is a backend optimization.
Deployment: Within 5 minutes
```

---

## Escalation Decision Tree

```
Issue detected
    ↓
[Can you reproduce it?]
├─ No → False positive, close incident
└─ Yes ↓
   [Is service down or error rate >5%?]
   ├─ Yes → P0-CRITICAL, page on-call engineer + Founder immediately
   └─ No ↓
      [Is customer unable to use product?]
      ├─ Yes → P1-HIGH, email on-call + Founder within 1 hour
      └─ No ↓
         [Is there a workaround or degraded experience?]
         ├─ Yes → P2-MEDIUM, create ticket, fix within 24 hours
         └─ No → P3-LOW, backlog for next sprint
```

---

## Useful Commands Reference

### Vercel Debugging

```bash
# See current deployments
vercel list --limit 20

# See logs from last deployment
vercel logs --follow

# Rollback to previous version
vercel rollback

# View function logs
vercel logs --tail  # Follow logs in real-time
```

### Supabase Debugging

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Find longest-running query
SELECT pid, usename, application_name, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Check slow query log
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Clear slow query stats (to reset baseline)
SELECT pg_stat_statements_reset();
```

### Git Debugging

```bash
# See recent commits (what deployed?)
git log --oneline -20

# See changes in last commit
git show HEAD

# Check git status
git status

# Compare current vs main
git diff main
```

---

## Incident Communication Templates

### During Incident (Initial Report)

```
Subject: [INCIDENT] [Severity] NewsPulse Issue

We are investigating an issue affecting [service/feature].

Status: INVESTIGATING
Started: [Time UTC]
Severity: [P0/P1/P2]
Affected Users: [# or "unknown"]

We'll provide updates every 15 minutes.
Status page: https://status.newspulse-ai.com

— NewsPulse Operations Team
```

### During Incident (Progress Update)

```
Subject: [UPDATE] NewsPulse Incident - Identified Root Cause

We've identified the issue: [Brief description]

Root Cause: [What happened]
Impact: [How many customers affected]
Expected Resolution: [Time estimate]

We're working on a fix now. Next update in 15 minutes.

— NewsPulse Operations Team
```

### When Resolved

```
Subject: [RESOLVED] NewsPulse Incident - Service Restored

Issue Status: RESOLVED
Duration: [Time from start to resolution]
Impact: [How many customers affected]

Root Cause Analysis:
- What: [What failed]
- Why: [Why it failed]
- Fix: [What we did to fix it]

Preventive Measures:
- [What we'll do to prevent recurrence]

We apologize for the disruption.

— NewsPulse Operations Team
```

---

## Learning & Improvement

**After Every Incident:**

1. **Document It**
   - Create a post-mortem document
   - Include timeline, root cause, impact
   - Store in `/docs/incidents/INC-NNN-incident-name.md`

2. **Analyze It**
   - Did we detect it quickly? (Good → keep doing, Bad → add monitoring)
   - Did we fix it quickly? (Good → proven process, Bad → update runbook)
   - Could we have prevented it? (Yes → add safeguard, No → accept risk)

3. **Share It**
   - Brief the team on what happened
   - Share the post-mortem
   - Celebrate if well-handled recovery
   - Identify improvements for next time

4. **Improve It**
   - Update runbooks with new procedures
   - Add monitoring/alerts for this issue type
   - Train team on this scenario
   - Verify fix prevents recurrence

---

**Last Updated:** 2026-07-12  
**Next Review:** 2026-07-19 (After Phase 1 incidents if any)  
**Version:** 1.0
