# Operations Runbook — EURO AI (NewsPulse AI)

**Audience:** Founder, DevOps, on-call engineer  
**Last Updated:** 2026-07-11  
**Review Frequency:** Monthly (or after every incident)

---

## Quick Reference

### Critical URLs
- **Production:** https://newspulse-ai.vercel.app (Vercel auto-deploys from `main`)
- **Staging:** (Not yet configured — Phase 2)
- **Monitoring Dashboard:** GET `/api/alerts` (unified alert hub)
- **Health Check:** GET `/api/health`
- **Vercel Dashboard:** https://vercel.com → newspulse-ai
- **Supabase Dashboard:** https://app.supabase.com → [Project]
- **GitHub Actions:** https://github.com/mininglife7-dev/newspulse-ai/actions

### Escalation Path

| Severity | Response | Owner | Timeline |
|----------|----------|-------|----------|
| 🔴 **Critical** (error >15%, uptime <95%, cost spike 4x+) | Auto-alert via DNA-005 + DNA-014 auto-rollback attempt | Governor/Founder | <5 min decision |
| 🟠 **High** (error >5%, cost spike 1.5x-4x) | Alert + manual review recommended | Founder/Governor | <30 min |
| 🟡 **Medium** (test failure, slow build, minor cost drift) | Log + review in daily standup | Governor | <24 hours |
| 🟢 **Low** (info alerts, cosmetic issues) | Log only | Governor | Next sprint |

---

## Common Incidents & Solutions

### Incident 1: High Error Rate (>15%)

**Symptoms:**
- Alert from DNA-GOV-004 (Error Rate Monitor)
- `/api/health` shows error count spike
- Customers report "something broke"

**Investigation (5 min):**

1. Check error details:
   ```
   GET /api/alerts → Look for "error-rate" severity=critical
   ```

2. Identify affected endpoint:
   ```
   Vercel logs (https://vercel.com → Deployments → [latest] → Logs)
   Search: "error" or "Error"
   ```

3. Check recent deployments:
   ```
   Vercel → Deployments → Sort by date
   If last deploy <30 min ago, likely cause
   ```

**Response Options:**

**Option A: Rollback (if confident error was introduced by recent deploy)**
1. Go to Vercel → Deployments
2. Find the last known-good deployment (2+ hours old)
3. Click deployment → "Promote to Production"
4. Wait 30 sec for DNS propagation
5. Verify: `GET /api/health` should return healthy

**Option B: Investigate and Fix (if error is pre-existing)**
1. Check which API route is failing (parse Vercel logs)
2. Look at code changes in last 24 hours: `git log --oneline -20`
3. If findable: git revert the problematic commit
4. Push to main: `git push origin main`
5. Wait for Vercel to deploy (visible at https://vercel.com)
6. Verify: `GET /api/health`

**Prevention:**
- DNA-GOV-010 enforces test requirements before merge
- All PRs must have passing tests before merge
- If CI is down (GitHub Actions), do NOT merge to main

---

### Incident 2: Supabase Unreachable

**Symptoms:**
- Signup fails (403 Forbidden)
- History list returns 503 Service Unavailable
- DNS-GOV-001 detects Supabase status = down
- Alert: "Supabase health check failed"

**Investigation (3 min):**

1. Check Supabase status:
   ```
   https://status.supabase.com
   OR
   Supabase dashboard → Help → System Status
   ```

2. Verify in our system:
   ```
   GET /api/health
   Check: "supabase": { "status": "..." }
   ```

**Response:**

**If Supabase is having an outage (their infrastructure):**
- Alert customers: "Service temporarily unavailable, we're monitoring resolution"
- Wait for Supabase status page update (typically <30 min)
- DO NOT attempt rollback (data layer, not code problem)
- Check status page every 10 min
- Post update when service restored

**If only our project is down (configuration issue):**
1. Check Supabase dashboard → Settings → General
   - Verify project status = "Active"
   - Verify region = eu-central-1 (or intended region)

2. Check authentication:
   - Login to Supabase
   - Verify API keys haven't been rotated recently
   - Verify env vars in Vercel match current keys

3. Restart connection:
   - Vercel → Settings → Environment Variables
   - Re-save any Supabase vars (forces re-read)
   - Trigger manual redeploy: `git push origin main` (or any commit)

**Prevention:**
- Rotate Supabase keys only during maintenance windows
- Always update Vercel env vars BEFORE rotating keys
- Use Supabase status webhook (Phase 2 recommendation)

---

### Incident 3: GitHub Actions Spending Limit Hit (CI Stops)

**Symptoms:**
- All PR checks show as "skipped" or "cancelled"
- Merges to main don't trigger deployment
- DNA-GOV-001 detects: "No Actions runs in last 2 hours"
- Alert: "GitHub Actions spending limit reached"

**Recovery (5 min):**

1. Go to GitHub → Settings → Billing & plans → Actions
2. Check: "Spending limit reached?" — Yes
3. Increase limit:
   - Set to $50+ per month (covers typical usage)
   - OR disable limit if budget allows
4. Verify:
   - Existing PRs should re-trigger automatically
   - If not, push dummy commit to any PR: `git commit --allow-empty -m "Retrigger CI"`

**Prevention:**
- Set spending limit 1-2x expected monthly usage
- Set email alert at 50% of limit
- Monitor DNA-GOV-011 (Cost Anomaly Detection) for unexpected spikes
- Review monthly billing in GitHub Settings

---

### Incident 4: Deployment Failed / Code Not Live

**Symptoms:**
- You pushed a commit 30+ min ago, but it's not on production
- DNA-GOV-003 alerts: "Deployed code hash doesn't match latest commit"
- Vercel shows "Failed" for latest deployment

**Investigation (3 min):**

1. Check deployment status:
   ```
   Vercel → Deployments → [latest]
   Look for: "Building", "Failed", "Error"
   ```

2. Read build logs:
   ```
   Click "Logs" tab
   Search for "error" or "Error"
   ```

3. Common reasons:
   - **Missing env var:** "Error: FIRECRAWL_API_KEY is not defined"
     - Fix: Vercel → Settings → Environment Variables → add missing var
   - **Build script error:** "npm run build" exited with status 1
     - Fix: Local build debug (below)
   - **Dependency conflict:** "node_modules not found"
     - Fix: Vercel → Settings → Build & Development → clear cache

**Recovery:**

**Option A: Fix locally and push (if root cause found)**
```bash
# Reproduce the error locally
npm install
npm run build   # Should see the same error

# Fix the issue (e.g., add missing env var, update package)
# Then commit and push
git add .
git commit -m "fix: [description]"
git push origin main

# Vercel auto-redeploys
```

**Option B: Rollback to prior working deployment**
```
Vercel → Deployments → [previous deployment, green checkmark]
→ Click "Promote to Production"
→ Wait 30 sec for DNS
```

**Prevention:**
- All commits must pass `npm run build` locally before push
- CI (GitHub Actions) should catch this before merge (if limit raised)
- Use DNA-GOV-003 to auto-detect deployment mismatches

---

### Incident 5: Unexpected Cost Spike

**Symptoms:**
- Alert from DNA-GOV-011: "Cost anomaly detected"
- Vercel bill 3x+ expected
- OR Supabase bill 4x+ expected

**Investigation (10 min):**

1. Check which service spiked:
   ```
   GET /api/cost-anomaly
   Check: vercel vs supabase costs
   ```

2. Verify actual usage:
   ```
   Vercel → Analytics → Check bandwidth, compute usage
   Supabase → Usage → Check database/auth/storage
   ```

3. Common causes:
   - **Vercel:** Sudden traffic spike, Edge compute overrun, preview deployments
   - **Supabase:** Large data import, inefficient query (N+1), backup storage

**Response:**

**For Vercel overage:**
```
1. Check recent commits — did anything fetch huge data?
2. Check Analytics → Edge compute — any slow endpoints?
3. If yes → Revert that commit
4. If no → Wait for bill to stabilize (often false alarm if spike is <1 hour)
```

**For Supabase overage:**
```
1. Supabase → Logs → Check for slow/repeated queries
2. Check storage usage → Any large files stored?
3. If found → Delete/optimize and monitor
4. If not found → Contact Supabase support (might be billing glitch)
```

**Prevention:**
- Set hard spend limit in both services (optional but recommended)
- DNA-GOV-011 monitors continuously and alerts early
- Review costs weekly via DNA-GOV-011

---

### Incident 6: Security Vulnerability Detected

**Symptoms:**
- Alert from DNA-GOV-008: "Critical vulnerability found"
- Alert shows specific CVE (e.g., CVE-2024-12345)
- GitHub Dependabot or npm audit finds high/critical

**Response (30 min to 2 hours depending on severity):**

**Step 1: Assess Impact (5 min)**
```bash
# Check if vulnerability affects production code
npm audit | grep -i "fix available"

# Determine severity:
# - Critical: Production code affected → IMMEDIATE action
# - High: Dev/build code affected → action before next release
# - Moderate: Transitive dependency → can wait a few days
```

**Step 2: Patch (varies by dependency)**

**Option A: Auto-update (if safe)**
```bash
# Try automatic fix
npm audit fix

# Verify no breaking changes
npm run build
npm test

# Commit and push
git add package*.json
git commit -m "chore: security patch - address CVE-XXXX"
git push origin main
```

**Option B: Manual update (if auto-fix fails)**
```bash
# Update specific package
npm install [package-name]@latest

# Test thoroughly
npm run build
npm test

# Commit
git add package*.json
git commit -m "chore: update [package-name] for CVE-XXXX"
git push origin main
```

**Option C: Workaround (if patch not available)**
- If no fix available, document mitigation strategy
- File issue with maintainer
- Plan upgrade to future version that has fix
- Document in Risk Register

**Prevention:**
- DNA-GOV-008 scans daily at 09:00 UTC
- GitHub Dependabot alerts on new vulnerabilities
- Review alerts within 24 hours
- Critical vulnerabilities: patch within 2 hours

---

### Incident 7: Customer Reports Data Loss / Cannot See History

**Symptoms:**
- Customer says: "My searches disappeared!"
- GET /api/history returns empty array []
- Customer profile exists but search history empty

**Investigation (10 min):**

1. Verify in database:
   ```
   Supabase → Table Editor → news_searches
   Filter: WHERE user_id = [customer-id]
   Should see recent searches
   ```

2. Check customer workspace:
   ```
   Supabase → Table Editor → workspaces
   Filter: WHERE id = [workspace-id]
   Verify: exists and owner_id matches user_id
   ```

3. Check RLS policies:
   ```
   Supabase → SQL Editor → Run:
   SELECT * FROM auth.users() WHERE id = [user-id];
   Result: Should show user exists
   ```

**Response:**

**If data truly missing:**
1. Check deletion logs (if implemented):
   ```
   Supabase → audit_log table (Phase 2)
   Filter: action = 'delete', user_id = [customer-id]
   ```

2. Check backup:
   ```
   Supabase → Backups → Select point-in-time backup
   Query backup for customer's data
   If found: can restore point-in-time
   ```

3. If no backup help available:
   - Apologize to customer (data loss event)
   - Offer credit/compensation per SLA
   - File incident report

**If data exists but not visible:**
1. Check row-level security:
   ```
   Supabase → SQL Editor → Run:
   SELECT * FROM news_searches 
   WHERE user_id = auth.uid();
   ```

2. If returns empty but manually query shows data:
   - RLS policy is blocking user
   - Debug: check workspace membership

3. Fix:
   - Verify user is in correct workspace
   - If workspaces are multi-tenant: verify workspace_id on search records

**Prevention:**
- Verify customer can see data immediately after signup (E2E test)
- Implement audit logging before Phase 2
- Regular backup restore drills (quarterly)

---

### Incident 8: Service Latency / Slow Responses

**Symptoms:**
- Customer reports: "App is slow"
- DNA-GOV-002 alerts: "High latency detected"
- `/api/health` returns: latency: 5000+ ms (5+ seconds)
- Baseline typically 500-1500 ms

**Investigation (5 min):**

1. Check which endpoint is slow:
   ```
   GET /api/health
   Look at each service latency:
   - landing_page: XXms
   - signup_page: XXms
   - api_search: XXms
   - database: XXms
   ```

2. Check Vercel metrics:
   ```
   Vercel → Analytics → Functions
   Sort by duration: Find slowest endpoints
   ```

3. Common causes:
   - **Firecrawl slow:** API is overloaded (external, can't fix)
   - **OpenAI slow:** API is overloaded (external, can't fix)
   - **Supabase slow:** Query inefficiency or connection pool exhausted
   - **Cold start:** First request after deploy (normal, <5s warm-up)

**Response:**

**External service slow (Firecrawl/OpenAI):**
```
1. No action needed — wait for service to recover
2. Alert customers: "We're experiencing slower performance due to vendor delays"
3. Monitor: Come back in 10 min
```

**Supabase slow:**
```
1. Supabase dashboard → Monitor → check "Active connections"
   If max connections reached: too many concurrent queries
   Solution: Increase project tier or add connection pooling

2. Check slow query log:
   Supabase → Logs → Filter: duration > 1000
   If found: optimize query (add index, etc.)

3. Check memory/CPU:
   Supabase → Monitor → Memory/CPU gauge
   If high: consider upgrade to higher tier
```

**Cold start (after new deploy):**
```
This is normal. First request takes 3-5 sec. Subsequent requests are <1s.
No action needed; inform customer: "Initial response can be slow, subsequents are faster"
```

**Prevention:**
- DNA-GOV-009 tracks latency baseline and alerts on regressions
- Use caching where possible (client-side, Redis, etc.)
- Optimize Supabase queries: add indexes for WHERE clauses
- Monitor cold-start impact: Phase 2 recommendation (Vercel Pro tier has warmer containers)

---

## Maintenance Windows

### Planned Maintenance Checklist

**Before maintenance (announce 24 hours prior):**
```
1. Post maintenance window: GET /api/alerts (send notification to Founder)
2. Notify customers: "Scheduled maintenance 2026-07-15 10:00-11:00 UTC"
3. Prepare rollback plan (identify last stable commit)
4. Test changes locally: `npm run build && npm test`
```

**During maintenance (window = X hours):**
```
1. Create feature branch: git checkout -b maint/2026-07-15-[description]
2. Make changes (schema migration, config, etc.)
3. Test thoroughly locally and in staging (if available)
4. Create PR with detailed change description
5. Merge to main when ready
6. Monitor: DNA-GOV-001/002/003 for any issues
```

**After maintenance:**
```
1. Verify /api/health returns healthy
2. Spot-check key flows (signup, search, history)
3. Post update: "Maintenance complete, all systems normal"
4. Document what was done in decision register
5. If any issues: activate incident response above
```

### Backup & Restore Schedule

**Daily:** Supabase auto-backup (free, 30-day retention)  
**Weekly:** Manual offsite backup to object storage (Phase 1 checkbox)  
**Monthly:** Restore drill (simulate recovery on scratch project)

**To restore from backup:**
```
1. Supabase → Backups → Select point-in-time
2. Click "Restore" (creates temporary project)
3. Verify: Connect and query restored data
4. Document: Recovery time = [X minutes]
5. If satisfied: Delete temporary project
```

---

## Monitoring Cadence

### Daily (Automated)

- DNA-GOV-001: Blocking condition check (every 30 min)
- DNA-GOV-002: Health check (every 5 min)
- DNA-GOV-003: Deployment verification (every 10 min)
- DNA-GOV-004: Error rate check (every 5 min)
- DNA-GOV-008: Security scan (09:00 UTC)
- DNA-GOV-009: Performance baseline (on build)
- DNA-GOV-011: Cost anomaly (09:00 UTC)

### Weekly (Manual)

- Review `GET /api/alerts` for any warnings (Monday morning)
- Check Vercel Analytics → bandwidth & compute trends
- Check Supabase Usage → storage & auth activity
- Review GitHub Actions logs for any flaky tests

### Monthly (Manual)

- Cost review: Vercel + Supabase bills
- Backup restore drill
- Security audit: npm audit output, GitHub Dependabot alerts
- Performance review: compare baseline to month-ago metrics

---

## Scaling & Capacity Planning

### Signs You Need to Scale Up

| Metric | Threshold | Action |
|--------|-----------|--------|
| Vercel compute >$20/month | Spending >1.33x baseline | Review code efficiency |
| Vercel compute >$50/month | Spending >3x baseline | Upgrade to Pro tier or optimize |
| Supabase active connections | >50% of limit (varies by tier) | Upgrade tier or add pooling |
| Supabase storage | >80% of plan limit | Upgrade or implement retention policy |
| Error rate | >1% sustained | Investigate root cause |
| Latency p95 | >5 sec sustained | Investigate root cause |

### Upgrade Procedures

**Vercel: Hobby → Pro ($20/month)**
- Vercel → Settings → Plan → Upgrade to Pro
- Enables: real-time monitoring, better performance
- No downtime

**Supabase: Free → Pro ($25/month)**
- Supabase → Settings → Billing → Upgrade to Pro
- Enables: daily backups, higher quotas
- No downtime

---

## Contact & Escalation

| Role | Contact | Use For |
|------|---------|---------|
| **Founder (Lalit)** | mininglife7@gmail.com | Critical decisions, spending approval, legal matters |
| **Vercel Support** | support.vercel.com | Deployment issues, networking |
| **Supabase Support** | support.supabase.com | Database, auth, API issues |
| **Firecrawl Support** | contact@firecrawl.dev | API issue, rate limits |
| **OpenAI Support** | support.openai.com | API issues, billing disputes |
| **GitHub Support** | support.github.com | Actions, secrets, access issues |

---

## Appendix A: Useful Commands

```bash
# Check if production is healthy
curl https://newspulse-ai.vercel.app/api/health

# View recent commits
git log --oneline -20

# Revert a bad commit
git revert [commit-hash]
git push origin main

# Emergency rollback to specific commit
git reset --hard [commit-hash]
git push --force-with-lease origin main

# Check local build
npm run build

# Run all tests
npm test

# Check security vulnerabilities
npm audit

# Check what would change in Supabase schema
# (use SQL editor's "Preview" before running)
```

---

## Appendix B: Decision Log Template

When you resolve an incident, document it:

```markdown
## Incident: [Title]
**Date:** 2026-07-11 15:30 UTC
**Severity:** 🔴 Critical / 🟠 High / 🟡 Medium
**Owner:** [Who handled it]

### What Happened
[Description of symptoms]

### Root Cause
[Why it happened]

### Resolution
[What we did]

### Verification
[How we confirmed it's fixed]

### Prevention
[How to prevent next time]

### Artifacts
- Evidence: [links to logs, screenshots, etc.]
- Decision: [link to decision register entry]
```

