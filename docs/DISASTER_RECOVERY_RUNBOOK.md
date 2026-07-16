# NewsPulse AI — Disaster Recovery & Incident Response Runbook

**Created:** 2026-07-16  
**Status:** Production-Ready  
**Authority:** Executive Governor (Autonomous Execution)  
**Last Tested:** Pre-deployment validation framework established

---

## Overview

This runbook documents disaster recovery procedures, rollback strategies, and incident response playbooks for production failures. Covers detection, triage, recovery, and post-incident analysis.

**Key Principles:**

- **Detect fast:** Health checks run every 5 minutes
- **Triage fast:** Incident classification determines response path
- **Recover fast:** Rollback procedures tested and documented
- **Document:** Every incident creates a learning record

---

## Part 1: Incident Detection & Classification

### Health Monitoring

**Automated Monitoring:**

- Every 5 minutes: `/api/production-health` check (via Vercel Cron)
- Every 1 minute: `/api/health` check (basic connectivity)
- Real-time: Error tracking via application logs

**Detection SLA:**

- Critical issues: < 5 minutes
- Degraded performance: < 10 minutes
- Non-user-facing issues: Next check cycle

### Incident Classification

| Severity     | Examples                                           | Response Time     | Escalation                          |
| ------------ | -------------------------------------------------- | ----------------- | ----------------------------------- |
| **CRITICAL** | Auth down, database unreachable, 50%+ errors       | Immediate         | Rollback first, debug after         |
| **HIGH**     | Performance degraded (P95 > 5s), 10-20% error rate | 10 minutes        | Investigate, may rollback           |
| **MEDIUM**   | Error spike < 10%, specific feature failing        | 30 minutes        | Patch or wait for next deploy       |
| **LOW**      | Single endpoint slow, individual user issues       | Next business day | Monitor, document, fix in normal PR |

### Alert Indicators

**Critical Alerts (Act Immediately):**

```
- Health check: 503 or timeout (database unreachable)
- Error rate: > 20% (system not functioning)
- Auth flow: > 50% failures (users can't log in)
- API latency: P95 > 10s (all endpoints timing out)
- Database: Connection pool exhausted (no new connections)
- Memory: > 95% (process crashing soon)
```

**High Alerts (Investigate in 5-10 min):**

```
- Error rate: 10-20% (partial degradation)
- Auth failures: 10-20% (some users affected)
- API latency: P95 5-10s (slow but working)
- Database: Connections > 80% utilized
- Response time variance: P99 > 3x P50 (unstable)
```

**Medium Alerts (Track):**

```
- Error rate: 1-10% (minor issues)
- Specific endpoint failing (isolated problem)
- Database query slow (< 1s, not critical)
- Memory: 70-95% (monitor, no action yet)
```

---

## Part 2: Immediate Response (First 5 Minutes)

### Step 1: Confirm Issue

**Run immediately when alert fires:**

```bash
# Check if it's real (not a monitoring false positive)
curl -v https://newspulse-ai.vercel.app/api/health

# Expected: 200 OK with "ok": true
# If 503: Database is down
# If timeout: Network issue or app crash
```

**Verify across multiple checks:**

```bash
# Try different endpoints
curl https://newspulse-ai.vercel.app/  # Landing page
curl https://newspulse-ai.vercel.app/api/assessment  # API (expects 401 without token)
```

**Check multiple data points:**

- Vercel Dashboard: Deployment status, error logs
- Supabase Console: Database status, connection pool
- Browser Console: Load application manually, check errors

### Step 2: Classify Severity

**Decision Tree:**

```
Is database responding?
├─ NO  → CRITICAL: Database is down
│       Action: See "Database Connection Lost" section
│
├─ YES: Is auth working?
│       ├─ NO  → CRITICAL: Auth broken
│       │       Action: See "Authentication Failure" section
│       │
│       └─ YES: What's the error rate?
│               ├─ > 20% → CRITICAL: System degradation
│               │          Action: See "Rollback Decision" section
│               │
│               ├─ 10-20% → HIGH: Partial degradation
│               │          Action: Investigate + patch OR rollback
│               │
│               └─ < 10% → MEDIUM: Isolated issue
│                         Action: Monitor, document, fix in PR
```

### Step 3: Alert Team

**Send notification (Slack template):**

```
🚨 PRODUCTION INCIDENT - [SEVERITY]

Issue: [What's happening]
Detected: [When]
Impact: [Affected users/features]
Severity: [CRITICAL/HIGH/MEDIUM]

Investigating: [Who and when started investigating]
Status: Investigating / Fixing / Rolled back / Resolved

Last update: [timestamp]
```

---

## Part 3: Incident Response Playbooks

### CRITICAL: Database Connection Lost

**Symptoms:**

- `/api/health` returns 503
- All API endpoints fail with 500/503
- Supabase console shows "connection refused" or "connection pool exhausted"
- Error logs: `Error: connect ECONNREFUSED` or `too many connections`

**Response Checklist:**

```
1. CONFIRM IT'S REAL (30 seconds)
   ☐ curl /api/health → expect 503
   ☐ Supabase console → check database status
   ☐ Is Supabase status page showing outage?
     Yes → Wait for Supabase recovery, monitor health
     No  → Continue to step 2

2. IMMEDIATE ACTIONS (next 1-2 minutes)
   ☐ Check Supabase connection pool (Project Settings → Database)
     - If "Max connections: [X]" and "Current: [X]" (at max)
       → Kill idle connections or increase pool
   ☐ Restart application? (unlikely to fix DB issue)
   ☐ Are environment variables correct in Vercel?
     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

3. IF NOT RESOLVED IN 2 MINUTES → ROLLBACK
   ☐ Health check still 503?
   ☐ Supabase still unreachable?
   ☐ Go to Part 4: Rollback Procedure

4. AFTER RECOVERY
   ☐ Monitor /api/production-health for 30 minutes
   ☐ Check error logs for related failures
   ☐ Document: Did this relate to a code change? (if so, rollback + patch)
   ☐ Notify team: Issue resolved
```

**Root Cause Analysis:**

- Code change increased DB queries? (Query optimization needed)
- Connection pool too small? (Increase in Supabase settings)
- Supabase maintenance window? (Note timing, wait for recovery)
- DDoS or abuse spike? (Enable rate limiting, alert security)

---

### CRITICAL: Authentication Failures (> 10% of users)

**Symptoms:**

- `/api/health` returns 200 but shows "auth: degraded"
- Login fails for many users
- Supabase auth endpoints returning 5xx or timing out
- Error: `Auth service unreachable` or `Session validation failed`

**Response Checklist:**

```
1. CONFIRM IT'S REAL (30 seconds)
   ☐ Try logging in yourself (sign up link or existing test account)
   ☐ Check Supabase Auth status (Dashboard → Auth)
   ☐ Check error logs: Are auth failures from Supabase or our code?

2. CHECK ENVIRONMENT (1-2 minutes)
   ☐ Vercel Settings → Environment Variables
     - NEXT_PUBLIC_SUPABASE_URL: Does it match active Supabase project?
     - NEXT_PUBLIC_SUPABASE_ANON_KEY: Is it valid and from correct project?
     - SUPABASE_SERVICE_ROLE_KEY: Is it correct?
   ☐ Did a recent deployment change auth configuration?
   ☐ Are auth secrets rotated in external services?

3. IF ENVIRONMENT LOOKS GOOD (2-5 minutes)
   ☐ Is this a Supabase outage? (Check status page)
   ☐ Is our auth code broken? (Check last commit)
     Yes → Rollback to previous deployment
     No  → Continue investigation

4. IF STILL BROKEN → ROLLBACK
   ☐ Follow Part 4: Rollback Procedure
   ☐ After rollback, verify login works

5. AFTER RECOVERY
   ☐ Monitor auth success rate for 30 minutes
   ☐ Check Supabase auth logs
   ☐ Document: Was this code, secrets, or external service?
```

---

### CRITICAL: Error Rate Spike (> 20%)

**Symptoms:**

- Error logs show spike in failures
- Sentry shows unusual error patterns
- Specific error appearing 100+ times/minute
- Health check shows multiple degraded components

**Response Checklist:**

```
1. IDENTIFY BROKEN FEATURE (1-2 minutes)
   ☐ Check error logs: What endpoint/feature is failing?
   ☐ Sentry dashboard: What error is occurring?
   ☐ Can you reproduce? Try the failing feature yourself

2. IS IT CODE OR EXTERNAL? (2-3 minutes)
   ☐ Did this start after a recent deployment?
     Yes → The deployment broke something
     No  → External service issue
   ☐ Check recent commit message: What changed?
   ☐ Does the error point to our code or external API?

3. IF CODE BROKE IT (< 5 min threshold)
   ☐ Option A: ROLLBACK (safest, fastest)
     - Go to Part 4: Rollback Procedure
   ☐ Option B: HOT-FIX (if we know the issue)
     - Quick fix, test, deploy
     - Only if we're confident (< 2 min fix)
     - Otherwise rollback first, fix after

4. IF EXTERNAL SERVICE ISSUE
   ☐ What service? (Database, Auth, API, Cloud storage)
   ☐ Can we degrade gracefully?
     - Cache old results?
     - Return 503 instead of 500?
     - Disable affected feature?
   ☐ Monitor service status page
   ☐ Wait for recovery or rollback if unacceptable

5. AFTER RECOVERY
   ☐ Monitor error rate for 30+ minutes
   ☐ Verify feature works end-to-end
   ☐ Check for cascading failures
   ☐ Document root cause
```

---

### HIGH: Performance Degradation (P95 > 5s)

**Symptoms:**

- Health check shows high latency
- Users report slow responses
- Vercel Analytics shows P95 > 2-5 seconds
- Specific endpoints timing out

**Response Checklist:**

```
1. IDENTIFY SLOW ENDPOINT (2-3 minutes)
   ☐ Which endpoint is slow?
   ☐ Is it consistent or intermittent?
   ☐ Check database query logs: Are queries slow?
   ☐ Check Supabase connection pool: Is it near max?

2. IS IT DEGRADATION OR NEW ISSUE? (3-5 minutes)
   ☐ Did this start after a recent deployment?
     Yes → New code introduced inefficiency
     No  → External factor (database load, network)
   ☐ Check recent commits: What changed?

3. QUICK FIXES (if known cause, < 5 min)
   ☐ Is connection pool exhausted? Increase it temporarily
   ☐ Is a query slow? Check indexes in database
   ☐ Is external API slow? Increase timeout or use fallback
   ☐ Did caching break? Check Redis/memory cache

4. IF QUICK FIX DOESN'T WORK (> 5 min elapsed)
   ☐ ROLLBACK if recent deployment caused it
   ☐ Otherwise, accept degraded performance and patch later

5. INVESTIGATION (while system running or after rollback)
   ☐ Profile the slow endpoint: What's taking time?
   ☐ Check database slow query log
   ☐ Check external API latencies
   ☐ Create hot-fix or backlog for next sprint

6. AFTER IMPROVEMENT
   ☐ Monitor performance for 30+ minutes
   ☐ Verify P95 back to normal (< 1-2s)
   ☐ Document fix in runbook if it's a known issue
```

---

## Part 4: Rollback Procedure

### Decision to Rollback

**Rollback immediately if:**

- ✅ Health check failing (503) + 2+ minutes unresolved
- ✅ > 20% error rate + issue is in our code
- ✅ Auth broken for > 10% of users
- ✅ Can't identify root cause within 5 minutes
- ✅ Hot-fix failed or is risky

**Do NOT rollback if:**

- ❌ Issue is external (Supabase outage, network)
- ❌ We know the fix and can deploy in < 2 minutes
- ❌ Users aren't significantly impacted (< 5% error rate)

### Rollback Steps (< 2 minutes)

**Step 1: Identify Previous Good Deployment**

```bash
# In Vercel Dashboard → Deployments
# Find the last deployment that was working

# OR via git log
git log --oneline main | head -10
# Example:
# abc1234 Fix: assessment query timeout (CURRENT - BROKEN)
# def5678 Feature: new dashboard (known good)
# ghi9012 ...
```

**Step 2: Promote Previous Deployment**

```
Option A: Via Vercel Dashboard (easiest)
1. Go to https://vercel.com/dashboard/newspulse-ai
2. Find previous good deployment
3. Click three dots menu
4. Click "Promote to Production"
5. Confirm and wait 30-60 seconds

Option B: Via Git Revert (if dashboard fails)
1. git revert abc1234 (revert the bad commit)
2. git push origin main
3. Vercel auto-deploys
4. Wait 2-3 minutes for deployment
```

**Step 3: Verify Rollback (1-2 minutes)**

```bash
# Health check should return 200
curl https://newspulse-ai.vercel.app/api/health

# Try critical flows manually
# - Can you log in?
# - Can you create an assessment?
# - Does landing page load?

# Monitor error rate in Sentry
# Should drop to pre-incident levels within 1-2 minutes
```

**Step 4: Notify Team**

```
✅ INCIDENT RESOLVED

Rollback completed: [previous commit]
Issue: [what broke]
Impact: ~X minutes downtime
Root cause: [preliminary analysis]
Status: Monitoring for side effects
Next: [action - patch, investigation, etc.]
```

---

## Part 5: Investigation & Post-Incident

### Immediate Post-Incident (After Rollback)

**1. Root Cause Analysis (5-10 minutes)**

- What commit caused the issue?
- Was it code, configuration, or external service?
- Why wasn't it caught in testing?

**2. Create Hot-Fix or Backlog**

- If it's a quick fix (< 15 minutes): Deploy hot-fix after validation
- If it's complex: Add to backlog, do post-mortem analysis

**3. Update Runbook**

- Is this a known issue pattern? Add to playbook
- Update incident checklist based on what we learned

### Full Post-Mortem (Within 24 hours)

**Template:**

```markdown
## Incident Post-Mortem

**Incident:** [Name/ID]
**Date:** [When it happened]
**Duration:** X minutes
**Impact:** [Features down, % users affected, estimated revenue impact]

### Root Cause

[What actually failed?]

- Trigger: [What initiated the failure?]
- Contributing factors: [What made it worse?]

### Why Testing Missed This

- [Was it in test coverage?]
- [Did we test realistic load?]
- [Were assumptions wrong?]

### Actions to Prevent Recurrence

1. [Code change / test / monitoring]
2. [Infrastructure / configuration]
3. [Process / documentation]

### Implemented

- ☐ Hot-fix deployed and verified
- ☐ Root cause tests added
- ☐ Runbook updated
- ☐ Team notified
```

### Continuous Learning

**Track Incidents:**

- Create `docs/incidents/` directory
- Each incident gets a markdown file: `INCIDENT-2026-07-16-auth-failure.md`
- Updates to runbooks reference incident learnings

**Runbook Evolution:**

- Every incident reveals gaps in procedures
- Update playbooks within 24 hours of incident
- Share learnings with team

---

## Part 6: Disaster Recovery Testing

### Monthly Validation

**Test every month (or after major changes):**

```
1. Rollback Procedure (< 2 minutes)
   ☐ Identify previous deployment
   ☐ Promote via Vercel
   ☐ Verify health check passes
   ☐ Verify critical flows work

2. Database Recovery (< 5 minutes)
   ☐ Verify Supabase backups exist
   ☐ Test connection string is accessible
   ☐ Confirm RLS policies prevent unauthorized access

3. Configuration Recovery (< 10 minutes)
   ☐ Verify environment variables can be restored
   ☐ Verify secrets are accessible (GitHub, Vercel)
   ☐ Test: Can we redeploy from clean environment?

4. Alert Response (< 5 minutes)
   ☐ Verify monitoring alerts fire
   ☐ Confirm notifications are received
   ☐ Verify Sentry is logging errors
   ☐ Confirm team can be contacted quickly
```

**Document Test Results:**

- Date tested
- All procedures passed? ✅ Yes / ❌ No / ⚠️ Partial
- Any issues discovered? Document and fix
- Update runbook if procedures changed

---

## Part 7: Monitoring & Alerting Setup

### Vercel Alerts (Configure in Vercel Dashboard)

**Set these alerts:**

- ✅ Deployment failed → Notify team
- ✅ Error rate spike (> 1%) → Investigate
- ✅ Response time (P95 > 2s) → Performance issue
- ✅ CLS score degradation → User experience issue

### Health Check Monitoring

**Configuration:**

```
Service: [UptimeRobot / PagerDuty / Datadog / etc.]
Endpoint: https://newspulse-ai.vercel.app/api/production-health
Interval: 5 minutes
Auth: Bearer [ADMIN_TOKEN]
Alert on failure: After 2 consecutive failures (10 minutes)
Notification: Slack + Email
```

### Error Tracking (Sentry or equivalent)

**Configure:**

- ✅ Capture all 5xx errors
- ✅ Sample 50% of successful requests (detect degradation)
- ✅ Alert on new error patterns
- ✅ Alert when error rate spikes

---

## Part 8: Quick Reference Checklist

### If Production is Down

```
☐ 30 sec: Confirm it's real (curl health check)
☐ 1 min: Classify severity (CRITICAL/HIGH/MEDIUM)
☐ 1 min: Alert team on Slack
☐ 2 min: Investigate root cause (database? auth? code?)
☐ 3 min: Decide: rollback or fix?
☐ 5 min: Execute rollback if needed
☐ 1 min: Verify recovery
☐ 30 min: Monitor for cascading failures
☐ 1 hour: Initial root cause analysis
☐ 24 hours: Full post-mortem and runbook update
```

### Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard/newspulse-ai
- **Supabase Console:** https://app.supabase.com/
- **Sentry Dashboard:** https://sentry.io/organizations/newspulse-ai/
- **GitHub Repo:** https://github.com/mininglife7-dev/newspulse-ai
- **Health Check:** https://newspulse-ai.vercel.app/api/health
- **Production Health:** https://newspulse-ai.vercel.app/api/production-health

---

## Conclusion

Production incidents are inevitable. This runbook ensures we:

1. **Detect** them fast (5 minutes or less)
2. **Triage** them correctly (critical vs. non-critical)
3. **Recover** quickly (rollback < 2 minutes)
4. **Learn** from each (post-mortem within 24 hours)
5. **Improve** continuously (runbook updates)

**Every incident makes us more resilient.**

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Next Review:** 2026-08-16 (or after first incident)
