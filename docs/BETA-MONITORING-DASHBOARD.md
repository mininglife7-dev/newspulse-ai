# NewsPulse AI — Beta Monitoring Dashboard Guide

**Document Type:** Operations Dashboard Documentation  
**Phase:** Beta Pilot Program  
**Last Updated:** 2026-07-12  
**Audience:** Founder, Operations Team

---

## Executive Summary

This guide explains the 11 DNA (Distributed Network Architecture) monitoring systems continuously watching NewsPulse AI during Beta. Each system autonomously detects specific failure modes and surfaces alerts via `/api/alerts`.

**Quick Start:**
- Check `/api/alerts` daily (should be empty if all systems green)
- Each alert includes: what's wrong, why it matters, recommended action
- Most alerts are automatically handled or degraded gracefully
- Critical alerts require immediate human intervention

---

## Accessing the Monitoring Dashboard

### Method 1: Direct API Check (Fastest)

```bash
curl https://newspulse-ai.vercel.app/api/alerts
```

**Response Format:**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-12T14:30:00Z",
  "alerts": [
    {
      "id": "alert-001",
      "system": "DNA-GOV-002",
      "severity": "critical|warning|info",
      "title": "High Error Rate",
      "message": "Error rate spiked to 15% in last 5 minutes",
      "detectedAt": "2026-07-12T14:30:00Z",
      "recommendedAction": "Check Vercel logs for errors"
    }
  ],
  "systems": {
    "health": { "status": "green", "lastCheck": "2026-07-12T14:29:00Z" },
    "deployments": { "status": "green", "lastCheck": "2026-07-12T14:29:00Z" },
    ...
  }
}
```

### Method 2: Vercel Dashboard (Weekly Review)

- Go to: https://vercel.com/dashboard
- Click: newspulse-ai project
- Navigate: Analytics → Logs
- Filter: Function logs, last 24 hours
- Search: `[alert]` or `[critical]`

### Method 3: Email Notifications (Set Up Once)

**Not yet configured in Beta.** To set up:

1. Add webhook to `/api/alerts-webhook` endpoint
2. Configure email service (SendGrid, AWS SES, etc.)
3. Send email on `severity: "critical"`

**Template (when implemented):**
```
To: founder@newspulse-ai.com
Subject: 🚨 CRITICAL: [System] [Alert Title]

[Alert message]
Detected: [Time]
Recommended action: [Action]
Details: https://newspulse-ai.vercel.app/api/alerts
```

---

## The 11 DNA Systems

### 1. DNA-GOV-001: Blocking Conditions Detector

**What It Does:** Identifies critical conditions that block deployments or indicate system problems.

**Checks:**
- GitHub Actions spending limit (if exhausted, CI can't run)
- Supabase connection status (if down, customer queries fail)
- External API availability (Firecrawl, OpenAI)
- Environment variables missing or invalid

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "GitHub Actions spending limit exhausted" | Critical | Increase limit in GitHub settings |
| "Supabase offline" | Critical | Check Supabase status page, contact support |
| "OpenAI API key invalid" | Critical | Verify OPENAI_API_KEY in Vercel |
| "Missing FIRECRAWL_API_KEY" | Critical | Add key to Vercel environment |

**When to Ignore:**
- None — all blocking conditions require action

**When to Escalate:**
- If blocking condition persists >1 hour: Email Founder + on-call engineer

---

### 2. DNA-GOV-002: Production Health Monitor

**What It Does:** Real-time health check every 5 minutes. Monitors uptime, latency, database health.

**Metrics Tracked:**
- Is the app responding? (HTTP 200 from /api/health)
- Database latency (query response time)
- External API latency (Firecrawl, OpenAI)
- Memory usage
- CPU utilization

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| App down (no response) | Critical | Check Vercel status, restart if needed |
| Database query >5s | Warning | Check for slow queries, may need index |
| Firecrawl latency >30s | Warning | Firecrawl is slow, this is expected during peak hours |
| High memory usage (>80%) | Warning | Monitor for memory leak, may need restart |

**Expected Behavior:**
- Green most of the time (99%+)
- Occasional yellows during high traffic
- Reds are rare and usually brief

**When to Ignore:**
- Occasional latency spikes (1-2 per day is normal)
- Brief yellow alerts if resolved within 5 minutes

**When to Escalate:**
- Red alert persisting >5 minutes: Possible outage, investigate immediately

---

### 3. DNA-GOV-003: Deployment Verifier

**What It Does:** Validates that deployments complete successfully. Checks build, tests, and rollback capability.

**Checks:**
- Build succeeds (npm run build)
- All tests pass (npm test)
- TypeScript compilation (zero errors)
- ESLint (zero violations)
- Deployment to production succeeds

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "Build failed: TypeScript error" | Critical | Fix TS error, re-deploy |
| "Tests failed: 5 tests failing" | Critical | Fix failing tests, re-deploy |
| "Deployment timeout" | Warning | Retry deployment from Vercel |
| "Rollback unavailable" | Critical | CRITICAL: No safe version to rollback to |

**When to Ignore:**
- None — deployment issues must be fixed before code reaches production

**When to Escalate:**
- If deployment fails 3+ times: Team discussion needed on root cause

---

### 4. DNA-GOV-004: Error Rate Monitor

**What It Does:** Tracks HTTP error rates (4xx, 5xx) in real-time.

**Thresholds:**
- Green: <1% error rate
- Yellow: 1-5% error rate
- Red: >5% error rate

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate 5.2% | Warning | Investigate which endpoint is failing |
| Error rate 12% | Critical | Likely outage, check Vercel logs immediately |
| High 404s (resources not found) | Info | Unusual but not critical |
| High 500s (internal errors) | Critical | System bug, investigate immediately |

**How to Investigate:**

```bash
# From Vercel Logs, filter by 5xx status
# Look for: Common error message patterns
# Check: Which endpoint(s) are failing?
# Ask: Did code just deploy? (Check recent commits)
```

**When to Ignore:**
- Occasional 404 from bot traffic (expected)
- Brief spikes (<5 min) that self-recover

**When to Escalate:**
- Sustained >5% error rate: Likely outage, needs immediate response

---

### 5. DNA-GOV-005: Alert Hub

**What It Does:** Central aggregator for all alerts from DNA systems. Routes alerts to appropriate handlers.

**Features:**
- Deduplicates similar alerts (avoid alert fatigue)
- Assigns severity levels
- Tracks alert history
- Correlates related alerts

**Example Alert Flow:**

```
Time: 14:30 — Error rate spikes to 8%
  ↓
DNA-GOV-004 generates alert: "High error rate"
  ↓
DNA-GOV-005 receives alert, checks if similar alerts exist
  ↓
Alert Hub realizes this is related to database being slow
  ↓
Combined alert: "High error rate due to slow database"
  ↓
Alert is routed to `/api/alerts` for Founder review
```

**When to Check Alert Hub:**
- Daily morning check
- After deployments (to verify no new issues)
- When notified of critical alert

---

### 6. DNA-GOV-006: Customer Journey Monitor

**What It Does:** Tracks the end-to-end customer experience. Simulates signup, search, history workflows.

**Workflows Monitored:**
- Signup → email verification → workspace creation
- Run search → get results → view history
- Multi-user workspace collaboration
- Session persistence across page reloads

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "Signup flow fails at email verification" | Critical | Email service issue or RLS policy broken |
| "Search returns 0 results when should return >0" | Critical | Firecrawl API issue or query broken |
| "Session lost on page reload" | Critical | Cookie/session storage broken |
| "Workspace member cannot see shared history" | Warning | RLS policy issue or cache stale |

**Success Metrics:**
- Signup completion: 100% (should never fail)
- Search success: 90%+ (some external API failures expected)
- Session persistence: 100%
- Multi-user access: 100%

**When to Ignore:**
- Occasional external API timeouts (these are graceful)

**When to Escalate:**
- Signup flow failing: Critical — customers can't use product
- Search success <80%: Investigate Firecrawl issues
- Session lost: Critical — security/usability issue

---

### 7. DNA-GOV-007: Security Alert Bridge

**What It Does:** Monitors for security issues. Detects potential vulnerabilities, suspicious patterns.

**Checks:**
- SQL injection attempts (detected in logs)
- XSS attempts (detected in logs)
- Brute force attacks (multiple failed logins from same IP)
- Suspicious data access patterns
- Secrets accidentally committed to code

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "SQL injection attempt detected" | Critical | Investigate, may indicate compromised account |
| "100+ failed login attempts from single IP" | Warning | Likely brute force, may want to block IP |
| "API key found in Git commit" | Critical | IMMEDIATELY rotate API key and revert commit |
| "Unusual data access pattern" | Warning | May indicate compromised account or bug |

**When to Ignore:**
- None — security alerts must be investigated

**When to Escalate:**
- If multiple security alerts: Possible breach, notify security team immediately

---

### 8. DNA-GOV-008: Dependency Security Scanner

**What It Does:** Scans npm dependencies for known vulnerabilities. Runs weekly.

**Checks:**
- npm audit for vulnerable packages
- Checks for EOL (end-of-life) dependencies
- Flags deprecated packages

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "Critical: Next.js 14.0.0 has DoS vulnerability" | Critical | Upgrade to patched version immediately |
| "Moderate: lodash 4.15.0 has prototype pollution" | Medium | Upgrade to patched version within 1 week |
| "Info: react-dom is outdated" | Info | Upgrade during next maintenance window |

**Update Policy:**
- Critical: Update within 24 hours, deploy immediately
- Moderate: Update within 1 week, deploy in next release
- Low/Info: Update during regular maintenance cycles

**When to Ignore:**
- False positives (sometimes dependencies are flagged but not actually vulnerable in your use case)
- Low-severity issues that require major version upgrades

**When to Escalate:**
- Critical security issues: Update and deploy ASAP

---

### 9. DNA-GOV-009: Performance Baseline Tracker

**What It Does:** Tracks performance metrics over time. Alerts when performance degrades.

**Baselines Tracked:**
- API response time (goal: <60s median, <90s p95)
- Build time (goal: <10 seconds)
- Bundle size (goal: <500KB main)
- Database query time (goal: <1s median)
- Page load time (goal: <3s)

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "API response time degraded 40%: 35s → 58s" | Warning | Likely due to increased load or query optimization needed |
| "Build time increased 50%: 6s → 9s" | Info | May be due to new dependencies, monitor trend |
| "Page load time increased 20%" | Warning | Check bundle size or asset optimization |
| "Database queries 30% slower" | Warning | May need query optimization or index |

**Interpretation:**
- Slow degradation (10-20%): Monitor, not critical
- Fast degradation (>30%): Investigate cause, may need rollback
- Sudden degradation: Likely caused by recent change

**When to Ignore:**
- Expected increases due to new features
- Small fluctuations (<10%) due to natural variation

**When to Escalate:**
- >30% degradation: Investigate root cause, consider rollback

---

### 10. DNA-GOV-010: Git Governance Monitor

**What It Does:** Ensures proper Git practices and deployment controls.

**Checks:**
- All production code is code-reviewed (before merge)
- Main branch is protected from direct pushes
- All commits are signed/verified
- Deployment logs are audited
- Feature branches follow naming convention

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "Direct push to main detected" | Critical | Undo the push immediately, use PR instead |
| "Merge without code review" | Critical | Revert the commit, enforce review process |
| "Unsigned commit deployed" | Warning | Verify committer identity, ensure signing enabled |

**When to Ignore:**
- None — Git governance ensures quality and security

**When to Escalate:**
- Multiple governance violations: Team discussion on process

---

### 11. DNA-GOV-011: Cost Anomaly Detector

**What It Does:** Monitors spending against projections. Alerts on unexpected cost increases.

**Tracks:**
- Vercel compute costs (daily)
- Supabase database costs (daily)
- Firecrawl API usage (daily)
- OpenAI API usage (daily)

**Expected Beta Costs:**
- Phase 1 (5-10 customers): $10-20/day
- Phase 2 (25-50 customers): $30-60/day
- Phase 3 (100+ customers): $100-200/day

**Alert Examples:**

| Condition | Severity | Action |
|-----------|----------|--------|
| "Vercel costs 3x expected: $60 vs $20 budget" | Critical | Investigate for runaway functions or abuse |
| "Firecrawl usage doubled overnight" | Warning | May be legitimate increase, or bug causing excessive requests |
| "Supabase database bill 50% over budget" | Warning | Check for runaway queries or storage usage |

**Cost Breakdown:**
```
Daily Budget (Phase 1):
  Vercel compute: ~$5
  Supabase: ~$5
  Firecrawl API: ~$5
  OpenAI API: ~$5
  ─────────────
  Total: ~$20/day
```

**Cost Optimization Queries:**

```sql
-- Find expensive operations (most API calls)
SELECT 
  EXTRACT(DATE FROM created_at) as day,
  COUNT(*) as search_count,
  AVG(response_time_ms) as avg_response_time
FROM news_searches
GROUP BY EXTRACT(DATE FROM created_at)
ORDER BY day DESC
LIMIT 7;

-- Find users with most searches (potential power users)
SELECT 
  user_id, 
  COUNT(*) as search_count,
  SUM(response_time_ms)::int as total_response_time
FROM news_searches
GROUP BY user_id
ORDER BY search_count DESC
LIMIT 10;
```

**When to Ignore:**
- Small overages (<10%) due to legitimate traffic increase
- One-time spikes that normalize

**When to Escalate:**
- Sustained overages (>50%): Investigate root cause
- Possible abuse: May need rate limiting or IP blocking

---

## Daily Monitoring Routine

### Morning (08:00 UTC)

1. **Check `/api/alerts`**
   ```bash
   curl https://newspulse-ai.vercel.app/api/alerts
   ```

2. **Count alerts by severity:**
   - Critical: 0? (If any, investigate immediately)
   - Warning: ≤2? (Monitor but can wait)
   - Info: Any number is OK

3. **Review overnight incidents:**
   - Check Vercel dashboard Logs tab
   - Search for errors or issues
   - Look for error patterns

4. **Test signup flow:**
   - Try creating account yourself
   - Verify email arrives
   - Verify workspace creation works
   - Verify search completes

5. **Check cost tracker:**
   - Yesterday's spend: Was it within budget?
   - Weekly trend: Spending going up or down?
   - Anomalies: Any unusual spikes?

### Weekly (Friday, 14:00 UTC)

1. **Review all systems:**
   - /api/alerts → check each system status
   - Vercel dashboard → deployment history
   - Supabase dashboard → database performance
   - GitHub → action runs and status

2. **Analyze metrics:**
   - Total customers added this week
   - Total searches completed
   - Error rate trend
   - Uptime percentage

3. **Customer feedback:**
   - Email summary: What are customers reporting?
   - Support queue: Any patterns in issues?
   - Satisfaction scores: Are customers happy?

4. **Plan next week:**
   - Any issues to fix?
   - Any optimizations needed?
   - Any risky deployments planned?

### Monthly (First day of month)

1. **Phase review:**
   - Are we on track for phase goals?
   - Any issues blocking next phase?
   - Do we need to extend current phase?

2. **Cost review:**
   - Actual spend vs budget
   - Cost per customer
   - Projections for full Beta

3. **Roadmap check:**
   - Feature development progress
   - Infrastructure improvements
   - Documentation completeness

---

## Alert Response Playbook

### Critical Alert Received

**Immediate (0-5 minutes):**
1. Verify the alert is real (reproduce the issue yourself)
2. Determine severity: Is customer impact happening right now?
3. Notify on-call engineer (if not you)
4. Start incident record (date, time, what happened)

**Short-term (5-30 minutes):**
1. Implement workaround or temporary fix if possible
2. Investigate root cause
3. Check if this is widespread or isolated
4. Communicate status to team

**Medium-term (30-120 minutes):**
1. Implement proper fix
2. Test fix in staging if possible
3. Deploy to production
4. Verify fix resolves issue

**Long-term (after incident):**
1. Document what happened and why
2. Identify process improvements to prevent recurrence
3. Update runbooks if needed
4. Debrief team on lessons learned

### Common Critical Alerts

**Alert: "Service Unavailable" / "App Down"**
```
Likely Cause: Vercel deployment failed or database down
Immediate Action: Check Vercel status page
Fix: Rollback to previous deployment
Verification: /api/health returns 200 OK
```

**Alert: "High Error Rate >5%"**
```
Likely Cause: Bug in recent code, external API down, or DB issue
Immediate Action: Check recent deployments
Investigate: Filter Vercel logs by 5xx, see common error
Fix: Either fix bug (if in our code) or rollback
Verification: Error rate drops to <1%
```

**Alert: "Database Connection Error"**
```
Likely Cause: Supabase connection pool exhausted or Supabase down
Immediate Action: Check Supabase status, restart pool if available
Fix: Increase connection pool size or reduce concurrent traffic
Verification: Queries complete successfully
```

**Alert: "API Key Invalid" or "Missing Environment Variable"**
```
Likely Cause: Env var expired, rotated, or misconfigured
Immediate Action: Check Vercel environment variables
Fix: Update invalid key or add missing variable
Verification: App starts successfully, queries work
Timeline: Critical — customers can't use product
```

---

## Integration with Operations Runbook

This monitoring dashboard works alongside the **BETA-ADMIN-RUNBOOK.md**:

- **Runbook** = "What to do" (procedures)
- **Dashboard** = "What to monitor" (metrics)

Together they enable proactive operations:

1. Use Dashboard to **detect** issues early
2. Use Runbook to **respond** with proven procedures
3. Use daily checks to **prevent** issues from becoming critical
4. Use alerts to **escalate** when human intervention needed

---

## Appendix: Alert Severity Definitions

| Severity | Definition | Action Required | Response Time |
|----------|-----------|------------------|----------------|
| **Critical** 🔴 | Customer impact happening now, system at risk | Immediate investigation and fix | <15 minutes |
| **Warning** 🟡 | Early warning sign, may degrade soon | Monitor closely, plan response | <4 hours |
| **Info** 🔵 | Informational, no immediate action needed | Review when convenient | <24 hours |

---

**Last Updated:** 2026-07-12  
**Next Review:** 2026-07-19 (Phase 1 → Phase 2)  
**Version:** 1.0
