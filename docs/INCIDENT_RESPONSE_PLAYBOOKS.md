# NewsPulse AI — Incident Response Playbooks

**Status:** Production-Ready  
**Version:** 1.0  
**Created:** 2026-07-16

Quick decision trees and action checklists for common production incidents. Designed for 5-minute response times.

---

## Quick Decision Tree

```
Issue detected?
│
├─ Nothing loads (all 5xx)
│  └─ See: DATABASE_DOWN
│
├─ Login broken
│  └─ See: AUTH_FAILURE
│
├─ Specific feature broken
│  └─ See: FEATURE_BROKEN
│
├─ Slow responses (P95 > 5s)
│  └─ See: PERFORMANCE_DEGRADATION
│
├─ High error rate (> 5%)
│  └─ See: ERROR_SPIKE
│
└─ Something else?
   └─ See: UNKNOWN_ISSUE
```

---

## PLAYBOOK: Database Down

**Symptoms:** All API endpoints return 503 or timeout, `/api/health` shows database: "error"

**Timeline: < 2 minutes**

```
[0-30s] CONFIRM
  ☐ curl https://newspulse-ai.vercel.app/api/health
  ☐ Expect: 503 with "ok": false, "db": "error"
  ☐ If 200 with "ok": true → False alarm, not a database issue

[30-60s] CHECK SUPABASE
  ☐ Open https://app.supabase.com → Project Settings → Database
  ☐ Connection status: Connected?
    ✓ Connected → Problem might be on our side
    ✗ Not connected → Supabase is down
  ☐ Check https://supabase.com/status (ongoing outages?)

[1-2 min] QUICK INVESTIGATION
  ☐ Is it a code issue or infrastructure?
    • If recent deployment: Look at git diff
    • If no recent deploy: Likely infrastructure (Supabase)
  ☐ Check Vercel logs: Any deployment errors?

[2 min] DECISION
  ☐ Is this Supabase's fault? (status page says maintenance/outage)
    Yes → Inform team "Waiting for Supabase recovery"
    No  → Go to NEXT STEPS

[2+ min] NEXT STEPS
  Option A: ROLLBACK (if recent deploy likely caused it)
    1. Go to Vercel Dashboard → Deployments
    2. Find previous deployment (last known good)
    3. Promote to Production
    4. Wait 30-60 seconds
    5. Verify: curl /api/health (should return 200)

  Option B: INVESTIGATE & FIX (if confident)
    1. Check environment variables in Vercel Settings
    2. Verify database connection string is correct
    3. Check if connection pool is exhausted
    4. Apply quick fix and redeploy

  Option C: WAIT (if external service)
    1. Notify team: "Supabase maintenance, no action needed"
    2. Monitor every 5 minutes
    3. Alert when resolved
```

**Success Criteria:** `/api/health` returns 200 with "ok": true within 5 minutes

**Post-Incident:**

- [ ] Document if Supabase outage or our code
- [ ] Update runbook if new prevention step found

---

## PLAYBOOK: Authentication Failure

**Symptoms:** Login fails, error "Auth service unreachable" or persistent 401 errors, `/api/health` shows "auth": "critical"

**Timeline: < 3 minutes**

```
[0-20s] CONFIRM
  ☐ Try to log in yourself on https://newspulse-ai.vercel.app/auth/signup
  ☐ Does the signup form load? (HTML might load even if auth is down)
  ☐ Click "Sign Up" — does it fail?
    ✓ Yes, fails → Confirmed auth is broken
    ✗ No, works → False alarm or intermittent

[20-40s] CHECK SUPABASE AUTH
  ☐ Open https://app.supabase.com → Authentication
  ☐ Auth service status: Enabled? Functioning?
  ☐ Recent errors: Check Auth logs for failures
  ☐ Check https://supabase.com/status for auth outages

[40-60s] CHECK OUR CONFIGURATION
  ☐ Vercel Settings → Environment Variables
  ☐ Look for: NEXT_PUBLIC_SUPABASE_ANON_KEY
    Is it blank? → This is the problem!
    Is it wrong format? → Probably problem!
  ☐ Look for: NEXT_PUBLIC_SUPABASE_URL
    Is it pointing to correct Supabase project?

[1-2 min] INVESTIGATE RECENT CHANGES
  ☐ Recent deployment?
    Yes → Check what changed in auth code
           git diff HEAD~1 app/api/auth/
    No  → Likely Supabase or keys issue

[2-3 min] DECISION
  If keys look wrong in Vercel:
    → Grab correct values from Supabase
    → Update in Vercel Settings
    → Redeploy (or new deployment auto-triggers)

  If Supabase says auth is down:
    → Notify team "Supabase auth maintenance"
    → Monitor status page

  If recent code change broke it:
    → ROLLBACK to previous deployment
    → Debug auth code while rolled back
```

**Success Criteria:**

- [ ] Can sign up new user
- [ ] Can log in with existing account
- [ ] No "Auth service unreachable" errors

**Post-Incident:**

- [ ] If keys were wrong: Document how to prevent (1Password? secret rotation?)
- [ ] If code was broken: Add test case

---

## PLAYBOOK: Feature Broken

**Symptoms:** Specific endpoint returns errors (e.g., POST /api/assessment fails), other features work

**Timeline: < 5 minutes**

```
[0-30s] CONFIRM WHICH FEATURE
  ☐ Which endpoint is broken?
    • POST /api/assessment: Create assessment fails
    • PATCH /api/assessment/[id]: Update fails
    • POST /api/workspace/[id]/members: Invite member fails
  ☐ Manually test it: Trigger the feature in browser
  ☐ Check error message or response

[30-60s] CHECK RECENT CHANGES
  ☐ git log --oneline main -5
  ☐ Did a recent commit change this feature?
    Yes → git show [commit] | grep "assessment\|members\|whatever"
    No  → Might be external service (email, payment, etc.)

[1-2 min] UNDERSTAND THE ERROR
  ☐ What's the error code?
    400 Bad Request → Validation issue (likely our code)
    401 Unauthorized → Auth issue
    404 Not Found → Resource missing
    500 Server Error → Backend crashed
    503 Service Unavailable → Database/external service

  ☐ Check Sentry for error details
  ☐ Check Vercel logs for stack trace

[2-3 min] DECISION
  If it's input validation (400):
    → This might be user error
    → Check error message is helpful
    → If test data is wrong, feature works
    → Monitor if multiple users affected

  If it's a new bug from recent deploy:
    → ROLLBACK if error rate > 10%
    → HOT-FIX if we're confident

  If it's external service (payment, email):
    → Continue with fallback behavior
    → Notify user "Feature temporarily unavailable"
    → Monitor service status

  If unknown/unclear:
    → Safe choice: ROLLBACK previous deployment
    → Debug with old version to isolate issue
    → Deploy hot-fix once understood
```

**Success Criteria:** Feature works, errors gone, user can complete action

**Post-Incident:**

- [ ] Add test case for this scenario
- [ ] Update error messages if user-facing
- [ ] Document the fix if non-obvious

---

## PLAYBOOK: Performance Degradation

**Symptoms:** Responses slow (> 2-3 seconds), users report "spinning wheel", health check shows high latency

**Timeline: < 5 minutes**

```
[0-30s] CONFIRM SLOWNESS
  ☐ curl -v https://newspulse-ai.vercel.app/api/health
  ☐ How long did it take? Exceeding 2-3 seconds is slow
  ☐ Try multiple times: Is it consistent or intermittent?

[30-60s] IDENTIFY SLOW ENDPOINT
  ☐ Which endpoint is slow?
    • All endpoints slow? → Database issue
    • One endpoint slow? → Specific query issue
    • Variable slowness? → Load/concurrency issue
  ☐ Check Vercel Analytics: Which routes slow?
  ☐ Check Sentry: Any slow transaction traces?

[1-2 min] CHECK RESOURCES
  ☐ Database (Supabase):
    • Go to Monitoring → Logs
    • Any slow queries (> 1s)?
    • Connection pool status: How many active?

  ☐ External APIs:
    • Is third-party API slow? (Stripe, SendGrid, etc.)
    • Can we add timeout or fallback?

  ☐ Memory/CPU (Vercel):
    • Deployment details: Any warnings?
    • Too many concurrent requests?

[2-3 min] QUICK FIXES
  For database slow query:
    □ Add index on frequently-filtered column?
    □ Optimize query to fetch less data?
    □ Is N+1 query pattern happening?

  For external API slow:
    □ Increase timeout? (May make worse if already failing)
    □ Use cached response? (If data is stale, acceptable?)
    □ Degrade gracefully? (Skip optional data, return partial response?)

  For connection pool exhausted:
    □ Check Supabase project settings
    □ Increase max connections
    □ Monitor if it fixes immediately

  For load issue:
    □ Is traffic spike normal (marketing campaign)?
    □ Or is this unexpected (attack? viral)?
    □ Do we need to scale?

[3-5 min] DECISION
  If fix is < 1 minute and low-risk:
    → Apply quick fix
    → Redeploy
    → Monitor for 10 minutes

  If fix is uncertain or risky:
    → ROLLBACK recent deployment
    → Debug with old version
    → Deploy fix once verified

  If external service is slow:
    → Can't fix quickly
    → Accept degraded performance
    → Monitor their status page
    → Consider switching providers long-term
```

**Success Criteria:**

- [ ] Response time back to normal (< 1-2s)
- [ ] No user complaints about slowness
- [ ] All endpoints responsive

**Post-Incident:**

- [ ] Identify root cause: Code? Database? Infrastructure?
- [ ] Add monitoring alert for this metric
- [ ] Optimize if it's a code issue

---

## PLAYBOOK: Error Rate Spike

**Symptoms:** Error logs spike, Sentry shows 100+ errors/minute, multiple different failure types

**Timeline: < 5 minutes**

```
[0-30s] CONFIRM SPIKE
  ☐ Sentry dashboard: Error rate > 1%?
  ☐ Vercel Analytics: Error percentage spike visible?
  ☐ When did spike start? (Timestamp correlate with deploy?)

[30-60s] IDENTIFY PATTERN
  ☐ Is it one error repeating (e.g., "Cannot read property X")?
    Yes → Specific bug triggered by specific input
    No  → Multiple different errors (possible cascade)

  ☐ Which code path? (Which endpoint/feature?)
  ☐ All users or specific users? (Input data dependent?)

[1-2 min] RECENT CHANGES?
  ☐ git log --oneline main -3
  ☐ Was there a deployment in the last 30 minutes?
    Yes → Likely caused by deployment
    No  → External factor or race condition

  ☐ Check git diff of recent commit
  ☐ Does change explain the error type?

[2-3 min] DECISION
  If clear deployment caused it:
    → ROLLBACK immediately
    → Error rate should drop within 1 minute

  If error is external service related:
    → (Can't fix quickly)
    → Degrade gracefully if possible
    → Wait for service recovery

  If error is input-validation:
    → Might be legitimate user input causing cascade
    → Check if error message is helpful
    → No action needed if rate < 5%

  If unknown:
    → Safe choice: ROLLBACK
    → Diagnose with old version
    → Deploy hot-fix when understood
```

**Success Criteria:**

- [ ] Error rate back to normal (< 0.5%)
- [ ] Sentry not alerting
- [ ] No cascading failures

**Post-Incident:**

- [ ] Root cause: Code bug? External service? Bad data?
- [ ] Add test case if code bug
- [ ] Document if external service issue

---

## PLAYBOOK: Unknown Issue

**Use when issue doesn't fit other playbooks**

**Timeline: < 5 minutes decision**

```
[0-60s] GATHER DATA
  ☐ What's the symptom?
  ☐ When did it start?
  ☐ Who's affected?
  ☐ What's the error message/code?

  ☐ Check multiple monitoring sources:
    • Vercel dashboard (deployment status, errors)
    • Supabase console (database status)
    • Sentry (error tracking)
    • GitHub Actions (CI status)

[1-2 min] CATEGORIZE
  Does it sound more like:
    ☐ Database issue? → See DATABASE_DOWN
    ☐ Auth issue? → See AUTH_FAILURE
    ☐ Feature broken? → See FEATURE_BROKEN
    ☐ Slowness? → See PERFORMANCE_DEGRADATION
    ☐ Many errors? → See ERROR_SPIKE

  If none match:
    → Might be edge case or interaction
    → ROLLBACK is safest option

[2-5 min] ROLLBACK vs INVESTIGATE
  ☐ Recent deployment? (git log -3)
    Yes → ROLLBACK if unclear
    No  → Investigate external cause

  ☐ Time to diagnose vs time to rollback?
    < 2 min to understand? → Debug in place
    > 2 min unclear? → ROLLBACK, debug later

[5+ min] IF STILL UNKNOWN
  ☐ ROLLBACK to last known good
  ☐ If that fixes it: Issue is in recent code
  ☐ If that doesn't help: Issue is elsewhere
  ☐ Debug systematically after rollback
```

---

## Emergency Contacts

```
Primary: [Founder name/contact]
Secondary: [On-call engineer if applicable]

Alert channels:
- Slack: #production-incidents
- Email: [alert@company.com]
- Phone: [on-call if critical]
```

---

## Post-Incident Template

Copy and fill out within 24 hours of any incident:

```markdown
## Incident: [Name]

**Date:** YYYY-MM-DD HH:MM UTC  
**Duration:** X minutes  
**Severity:** CRITICAL / HIGH / MEDIUM  
**Resolved:** Yes ✓ / No (ongoing)

### What Happened

[Brief description of what users experienced]

### Root Cause

[Why did this happen? Code? Infrastructure? External?]

### Timeline

- HH:MM: Alert fired
- HH:MM: Confirmed issue
- HH:MM: Started response
- HH:MM: Rolled back / Fixed
- HH:MM: Verified recovery

### Immediate Response

- [ ] Affected users notified
- [ ] Team alerted
- [ ] Issue triaged
- [ ] Response initiated

### Resolution

- [ ] Rollback: [Commit ID]
- [ ] Or: Hot-fix: [Commit ID]
- [ ] Or: External service recovered

### Impact

- Estimated users affected: X
- Estimated revenue impact: $X
- SLA impact: [Did we violate SLA?]

### Prevention

What changes prevent recurrence?

1. [Code change]
2. [Test addition]
3. [Monitoring improvement]

### Follow-up

- [ ] Hot-fix merged and deployed (if needed)
- [ ] Runbook updated
- [ ] Team briefed
- [ ] Metrics reviewed
```

---

## Key Principles

1. **Decide fast** — Every minute costs money and trust. Make decisions in 3-5 minutes.
2. **Rollback first** — When uncertain, rollback then debug. It's the safest choice.
3. **Document always** — Every incident teaches us something. Document it.
4. **Automate prevention** — Add tests and monitoring to prevent recurrence.
5. **Blameless** — Focus on systems and process, not who made the mistake.

---

**Version:** 1.0  
**Next Review:** After first incident or quarterly
