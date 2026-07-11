# Incident Response Playbook

**For:** Founder (Lalit) + Operations Team  
**Purpose:** Step-by-step procedures for responding to production incidents  
**Scope:** Detection → Response → Recovery → Learning  
**Last Updated:** 2026-07-11

---

## Quick Reference

| Severity | Response Time | Action | Owner |
|----------|---|---|---|
| **Critical** | < 5 min | Page Founder immediately, begin auto-remediation | Governor + Founder |
| **High** | < 30 min | Send alert, monitor auto-remediation | Governor |
| **Medium** | < 2 hours | Log alert, batch for review | Governor |
| **Low** | < 24 hours | Track for pattern learning | Governor |

---

## Part 1: Before an Incident (Preparation)

### 1.1 Pre-Flight Checklist

Before each day, verify these systems are healthy:

```bash
# Health check endpoint (run daily)
curl https://newspulse-ai-production.vercel.app/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-07-11T03:20:00Z",
#   "environment": "production"
# }
```

**Dashboard access:** https://newspulse-ai-production.vercel.app/dashboard  
**Vercel status:** https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai  
**Supabase status:** Supabase console → Project settings → Health check

### 1.2 Alerting Channels

**Email:** Configured in Vercel environment  
- Provider: SendGrid (or AWS SES)
- Recipient: Your `FOUNDER_EMAIL`
- Response: Check within 5 minutes of alert

**Slack:** Optional but recommended for real-time alerts  
- Channel: #incident-alerts (if configured)
- Setup: Vercel env var `SLACK_WEBHOOK_URL`
- Notifications include: Incident ID, severity, decision, dashboard link

### 1.3 Access Requirements

Keep these handy before an incident:

- **Vercel API token:** For manual deployment inspection
- **Supabase access:** For incident log inspection
- **GitHub access:** For creating post-mortem issues
- **Email access:** To read incident alerts

---

## Part 2: During an Incident (Response)

### 2.1 Critical Incident Alert (Page Founder)

**Trigger:** Severity = `critical`

**What you'll receive:**
- Email from `noreply@newspulse-ai.com`
- Subject: `🚨 CRITICAL: <incident description>`
- Slack message (if configured): [CRITICAL] <description>

**Your first actions (within 5 minutes):**

1. **Read the alert details**
   - Incident ID: `incident-XXXXX`
   - Affected services: `/api/search`, `/api/history`, etc.
   - Estimated user impact: 0.8 (80% of users)
   - Category: deployment-failure, database-connection, etc.

2. **Visit incident dashboard**
   - Link in alert: `https://newspulse-ai-production.vercel.app/dashboard?incident=<ID>`
   - View: Detected time, detection method (war games or production), evidence

3. **Understand the automated decision**
   - Recommended action: `execute-rollback`, `scale-infrastructure`, `notify-founder`
   - Recovery time estimate: 120s
   - Risk assessment: low/medium/high

### 2.2 Automated Remediation is Running

**The system has already:**
- Detected the incident (real error → pattern fingerprint)
- Analyzed root cause (detected incident analysis)
- Made a remediation decision (incident orchestration)
- Started fixing it (auto-remediation if available)

**Your role:** Monitor and be ready to intervene.

### 2.3 Monitor Remediation Progress

**Status checks (refresh every 30 seconds):**

```bash
# 1. Check incident status
curl "https://newspulse-ai-production.vercel.app/api/incidents/<incident-id>"

# Expected progression:
# - Status: "detecting" → "analyzing" → "remediating" → "resolved"
# - actionable: true (auto-remediation in progress)
# - decision.recommendedAction: "execute-rollback" or similar
```

**Watch for:**
- Remediation success: Status moves to "resolved", recovery time < estimate
- Remediation failure: Status stays "remediating" after 2× estimate
- New patterns: Additional errors during remediation attempt

### 2.4 When Auto-Remediation is Failing

**If recovery time exceeds estimate by 2×:**

1. **Check Vercel dashboard** for deployment status
   - URL: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
   - Look for: Build errors, deployment halted, runtime errors

2. **Check Supabase health**
   - Supabase console → Monitoring → Queries/Replication lag
   - Database might be overloaded or temporarily unavailable

3. **Manually trigger rollback** (last resort)
   ```bash
   # Vercel CLI
   vercel rollback
   ```

4. **Escalate decision**
   - If incident.severity = critical AND auto-remediation failed
   - Message received: Manual intervention required, awaiting your decision

### 2.5 Manual Remediation Decision Tree

| Incident Type | Symptom | Action |
|---|---|---|
| **Deployment failure** | "Build failed", "Runtime error" | `vercel rollback` to last-known-good |
| **Database connection pool exhausted** | "Connection refused" errors spike | Increase connection pool in Supabase settings, redeploy |
| **API rate limit (OpenAI)** | "Rate limit exceeded" | Batch requests, upgrade plan, contact OpenAI |
| **Downstream service down** | "Failed to fetch from API" | Contact third-party provider, switch to fallback |
| **Unknown (needs diagnosis)** | "Cannot determine root cause" | Check Vercel error logs + Supabase queries |

---

## Part 3: After Incident Recovery (Follow-Up)

### 3.1 Incident Closed

**You'll receive:**
- Email: `✅ Incident <ID> resolved in 45s`
- Dashboard shows: Status = "resolved", all services recovered

**Checklist:**
- [ ] Verify application is responding normally
- [ ] Check user-facing metrics (no errors in console)
- [ ] Confirm no cascading failures

### 3.2 Remediation Report

**Automated alert sent with:**
- Recovery time (45 seconds in example)
- Action taken: "Executed rollback to v1.2.3"
- Lesson learned: "Schema migration incompatible with v1.2.3"

**Your job:**
- Read the lesson learned
- Decide if this needs a prevention measure (GitHub issue)
- Assign to engineer for code review + fix

### 3.3 Post-Mortem (Same day)

**Within 1 hour of recovery:**

1. **Open dashboard** → Incident summary
2. **Identify root cause** from evidence:
   - Deployed schema change incompatible with running code
   - OpenAI API behavior changed, not documented

3. **File GitHub issue** for prevention:
   ```markdown
   Title: [Post-Mortem] Incident incident-001: Schema migration incompatibility
   
   ## Summary
   New migration deployed without code review. Old code tried to access missing column.
   
   ## Timeline
   - 2026-07-11 03:15:00 UTC: New migration deployed
   - 2026-07-11 03:15:05 UTC: First request fails (column not found)
   - 2026-07-11 03:15:45 UTC: Auto-rollback completed
   
   ## Prevention
   - [ ] Require both schema and code changes in same PR
   - [ ] Add migration test to CI
   - [ ] Deploy with blue-green strategy (not immediate rollout)
   ```

4. **Assign to engineer** with "hotfix" label
5. **Schedule retro** if needed (severity = critical)

### 3.4 Incident Learning

**The system automatically:**
- Records incident to Supabase `incidents` table
- Fingerprints error pattern to `error_patterns` table
- Tracks remediation outcome (success/failure/time)
- Logs lesson learned for prevention

**What happens next:**
- Similar errors within next 24h are recognized (same fingerprint)
- If same pattern occurs > 3×/hour → escalate to high-severity
- Prevention measures (GitHub issues) are grouped for batching

---

## Part 4: Recurring Incidents (Pattern Learning)

### 4.1 Repeated Error Pattern Alert

**Trigger:** Same fingerprint detected 5+ times in 24 hours

**You'll receive:**
- Email: `⚠️ Repeated Error Pattern: Database connection timeout (42 occurrences)`
- Alert includes: Pattern description, occurrence count, suggested prevention

**Your action:**
1. Decide: Is this a known bug or a new problem?
2. If new: Create GitHub issue with prevention steps
3. If known: No action (already tracked)

### 4.2 Prevention Measures

**Auto-remediation covers:**
- Rollback on deployment failure
- Connection pool scaling
- Rate limit backoff

**Manual prevention (you own these):**
- Code changes to prevent root cause
- Infrastructure config changes (connection pool size, timeout values)
- Process changes (deployment pre-checks, monitoring)

---

## Part 5: Staging War Games (Testing Before Production)

### 5.1 Run Synthetic Incidents in Staging

Before deploying new code to production, validate incident response:

```bash
# Endpoint: staging environment
curl -X POST https://newspulse-ai-staging.vercel.app/api/war-games \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Deployment Schema Mismatch"}'

# Expected response:
# {
#   "scenarioId": "scenario-001",
#   "incident": {...},
#   "decision": {...},
#   "remediationAttempted": true,
#   "success": true,
#   "recoveryTimeMs": 2500
# }
```

### 5.2 Five Core Scenarios

1. **Deployment Schema Mismatch** — Code accesses missing column
2. **Connection Pool Exhaustion** — Too many simultaneous DB connections
3. **External API Rate Limit** — OpenAI/Firecrawl hits rate limit
4. **Cascading Failure** — One service down causes others to fail
5. **Unhandled Exception** — Runtime error in serverless function

### 5.3 Expected Outcomes

| Scenario | Detected | Orchestrated | Remediated | Recovery |
|---|---|---|---|---|
| Schema Mismatch | ✓ (1s) | ✓ (2s) | ✓ Rollback (5s) | **5s** |
| Pool Exhaustion | ✓ (10s) | ✓ (15s) | ✓ Scale (30s) | **30s** |
| Rate Limit | ✓ (5s) | ✓ (10s) | ✓ Backoff (60s) | **60s** |
| Cascade | ✓ (20s) | ✓ (30s) | ✓ Isolate (45s) | **45s** |
| Exception | ✓ (2s) | ✓ (5s) | ✓ Redeploy (15s) | **15s** |

**Pass criteria:** All scenarios detected + remediated within SLA

---

## Part 6: Maintenance & Monitoring

### 6.1 Daily Checks (2 minutes)

```bash
# Health endpoint
curl https://newspulse-ai-production.vercel.app/api/health
# Should return: { "status": "healthy", ... }

# Dashboard
# Visit incident dashboard, check for any unresolved incidents
https://newspulse-ai-production.vercel.app/dashboard
```

### 6.2 Weekly Review (15 minutes)

- Review Supabase `incidents` table (any patterns?)
- Check GitHub issues labeled `incident-postmortem`
- Verify error collection cron is running (check Vercel logs)

### 6.3 Monthly Metrics

- Uptime: Target > 99.5%
- MTTD (Mean Time To Detect): Target < 30s
- MTTR (Mean Time To Remediate): Target < 120s
- False positive rate: Target < 5%

---

## Part 7: Troubleshooting

### Problem: Alert not received

**Check:**
1. Email provider configured: `EMAIL_PROVIDER` in Vercel
2. Recipient configured: `FOUNDER_EMAIL` in Vercel
3. Test email send:
   ```bash
   curl -X POST https://newspulse-ai-production.vercel.app/api/test-alert \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"severity": "critical"}'
   ```

### Problem: Incident shows "remediating" but no progress

**Check:**
1. Vercel deployment status (might be stuck)
2. Supabase connection (might be overloaded)
3. Logs: `vercel logs` or Supabase console → Monitoring

### Problem: Same error recurring every hour

**This means:**
1. Prevention measure not deployed yet
2. Auto-remediation is working but cause not fixed
3. Create GitHub issue if missing

---

## Part 8: Emergency Contacts

| Role | Contact | For |
|---|---|---|
| **Vercel Support** | https://vercel.com/support | Deployment issues |
| **Supabase Support** | https://supabase.com/support | Database issues |
| **SendGrid Support** | sendgrid.com/support | Email delivery |
| **OpenAI Support** | https://platform.openai.com/account/billing/limits | Rate limits |
| **Firecrawl Support** | firecrawl.dev/docs | Article fetching errors |

---

## Reference: Incident Examples

### Example 1: Successful Auto-Remediation

```
2026-07-11T03:15:00Z [DETECTED] Schema mismatch: column "preferences" not found
  - Error: "Cannot read property 'preferences' of undefined"
  - Severity: critical (500 error, 80% user impact)

2026-07-11T03:15:02Z [ORCHESTRATED] Recommended action: execute-rollback
  - Current state: analyzing
  - Evidence: ["Deployed v1.3.0 with migration", "Code references old schema"]

2026-07-11T03:15:05Z [REMEDIATING] Rollback to v1.2.3 initiated
  - Action: Vercel rollback, revert deployment

2026-07-11T03:15:45Z [RESOLVED] Incident closed
  - Recovery time: 45s
  - Action taken: Rolled back to v1.2.3
  - Lesson learned: Schema migrations must be in same PR as code changes

🚨 ALERT: Critical incident resolved. Check dashboard for details.
```

### Example 2: Manual Intervention Required

```
2026-07-11T14:30:00Z [DETECTED] Connection pool exhaustion
  - Error: "too many connections"
  - Severity: high (503 Service Unavailable, 50% user impact)

2026-07-11T14:30:05Z [ORCHESTRATED] Recommended action: scale-infrastructure
  - Current state: analyzing
  - Evidence: ["Connection count exceeded limit", "Spike in traffic"]

2026-07-11T14:30:30Z [REMEDIATING] Scaling connection pool from 20 to 40
  - Action: Update Supabase pool settings

2026-07-11T14:31:00Z [WAITING FOR FOUNDER] Auto-remediation not sufficient
  - Reason: Scaling succeeded but errors continue
  - Suggested action: Manual review of ongoing traffic spike
  - Decision needed: Reduce traffic, scale further, or find root cause

⏸️ ALERT: Manual intervention required. See dashboard for full incident details.
```

---

**Document Version:** 1.0  
**Next Review:** After first production incident or 30 days (whichever comes first)
