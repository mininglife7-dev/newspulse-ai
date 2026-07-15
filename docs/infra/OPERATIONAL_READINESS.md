# Operational Readiness — EURO AI Launch Procedures

**Status:** Ready for Founder Review  
**Last Updated:** 2026-07-12  
**Audience:** Founder, Support Team, On-Call Engineers

---

## Executive Summary

EURO AI is production-code-ready. This document covers the operational procedures the Founder needs to execute independently:

1. **Deployment:** Steps to go live
2. **Monitoring:** What to watch for
3. **Rollback:** How to recover if needed
4. **Incident Response:** Playbooks for common failures
5. **Maintenance:** Routine operational tasks

---

## Pre-Launch Checklist

**CRITICAL — Must Complete Before Any Customer Signup:**

- [ ] **Supabase Schema Deployed**
  - Action: Follow `SUPABASE-PRODUCTION-SETUP.md` (6 phases, 15-30 min)
  - Verify: Run the verification script in Phase 5 of that guide
  - Without this: Customer signup fails with 403 (missing RLS policies)

- [ ] **GitHub Actions Spending Limit Increased**
  - Action: GitHub Settings → Billing → Actions → $50+/month
  - Verify: Workflows start executing within 5 minutes
  - Without this: Monitoring goes dark, no alerts

- [ ] **Email Auth Enabled in Supabase**
  - Action: Supabase dashboard → Settings → Auth → Email (enable)
  - Configure: SMTP or use Supabase-provided email (free tier)
  - Without this: Verification emails don't send

**RECOMMENDED — Before First Customer:**

- [ ] **Vercel Auto-Deploy Configured**
  - Current: Already configured (deploys on main branch push)
  - Verify: Check Vercel project settings
  - Backup: Manual deploy via `vercel deploy --prod` if needed

- [ ] **Vercel Preview Deployments Disabled** (optional)
  - Purpose: Save resources, disable if not needed
  - Setting: Vercel dashboard → Project Settings → Deployments

- [ ] **Secrets Configured in Vercel**
  - Required: SUPABASE_SERVICE_ROLE_KEY (server-side only)
  - Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Verify: Vercel Settings → Environment Variables

- [ ] **Database Backups Scheduled**
  - Action: Supabase dashboard → Backups → Set daily backups
  - Default: 7-day retention (free tier)
  - Test: Verify you can restore from backup (don't actually restore)

---

## Deployment Procedure

### Automatic Deployment (Recommended)

```
1. Commit code to main branch
2. Push to GitHub: git push origin main
3. Vercel auto-detects and starts building
4. Check Vercel dashboard for build status
5. Once "Ready", deployment is live
6. DNS-GOV-003 auto-verifies code is live within 10 min
```

### Manual Deployment (If Needed)

```bash
# Requires Vercel CLI installed
npm i -g vercel

# Deploy to production
vercel deploy --prod

# Verify deployment
curl https://newspulse-ai.vercel.app/api/health
```

### Deployment Verification

All 3 health checks must pass:

1. **DNS-GOV-003: Deployment Verification**
   - Check: GET /api/verify-deployment
   - Expected: `{"live": true, "version": "<latest-commit-sha>"}`
   - Timing: Runs every 10 minutes automatically

2. **DNS-GOV-002: Production Monitoring**
   - Check: GET /api/production-health
   - Expected: Landing page renders, signup works, API responds
   - Timing: Runs every 5 minutes automatically

3. **Manual Smoke Test**
   - Browser: Navigate to https://newspulse-ai.vercel.app
   - Verify: Landing page loads, no console errors
   - Next: Try signup flow without completing (optional)

---

## Monitoring Dashboard

### Real-Time Monitoring (Always Check These)

**Founder Alert Hub:** GET /api/alerts
```json
{
  "alerts": [
    {
      "severity": "critical",
      "type": "deployment_failed",
      "message": "Latest code failed to build",
      "timestamp": "2026-07-12T12:00:00Z"
    }
  ],
  "status": "ok" // or "warning" or "critical"
}
```

**Production Health:** GET /api/production-health
```json
{
  "landing_page": "ok",
  "signup_flow": "ok",
  "api_health": "ok",
  "supabase_connection": "ok",
  "timestamp": "2026-07-12T12:05:00Z"
}
```

**Error Rate Monitoring:** GET /api/error-rate
```json
{
  "last_1h": "0.2%", // critical if >15%
  "last_24h": "0.1%",
  "trending": "stable"
}
```

### Daily Checks (Morning)

1. **Check /api/alerts** — Any critical alerts overnight?
2. **Check /api/security-scan** — New vulnerabilities?
3. **Check /api/cost-anomaly** — Unexpected spending?
4. **Check /api/production-health** — All systems healthy?

Expected time: 2-3 minutes.

### Weekly Review

1. **Performance trends** — GET /api/performance-baseline
   - Watch for latency increases or bundle size bloat
   - Action: Investigate if >1.5x baseline

2. **Customer retention insights** — GET /api/customer-retention?action=metrics
   - How many customers are at-risk?
   - Are segments balanced?

3. **Knowledge log** — GET /api/knowledge
   - What patterns/risks were recorded?
   - Any recurring issues?

---

## Rollback Procedure

### Scenario: Latest Deployment Breaks Customer Signup

**Time to recover: 2-5 minutes**

#### Option A: Revert via Git (Recommended)

```bash
# Identify last good commit (check GitHub commit history)
# Example: abc1234 was working, def5678 broke signup

git revert def5678
git push origin main

# Vercel auto-deploys the revert
# Verify: curl https://newspulse-ai.vercel.app/api/health
```

#### Option B: Rollback via Vercel Dashboard

1. Open Vercel project dashboard
2. Click "Deployments" tab
3. Find last "Ready" deployment (typically previous one)
4. Click "..." menu → "Promote to Production"
5. Verify: GET /api/health returns `{"ok": true}`

#### Option C: Manual Revert via Vercel CLI

```bash
# List recent deployments
vercel list --production

# Promote a previous deployment to production
vercel promote <deployment-url> --prod

# Verify
curl https://newspulse-ai.vercel.app/api/health
```

#### After Rollback: Recovery Steps

1. **Confirm rollback successful**
   - DNS-GOV-003 should report old version as "live" within 10 min
   - Check GET /api/production-health for all "ok" status

2. **Alert customers (if needed)**
   - If rollback lasted >10 min, send status update
   - Example: "Brief outage resolved. Services restored. Investigation ongoing."

3. **Debug root cause**
   - Check error logs in Vercel dashboard
   - Search /api/error-rate for spike timing
   - Review the broken commit for obvious issues

4. **Fix and redeploy**
   - Once root cause identified, commit fix
   - Deploy via normal process
   - Full test suite must pass before pushing to main

---

## Incident Response Playbook

### Critical Alert: Error Rate >15%

**Severity:** CRITICAL | **TTR Goal:** <10 min | **Action:** Investigate immediately

#### Steps

1. **Confirm real issue**
   - Check /api/error-rate (automated monitoring)
   - Manually test signup/login at newspulse-ai.vercel.app
   - Check Vercel logs for deployment errors

2. **Identify scope**
   - Is it all customers or specific feature?
   - Check recent commits — did something change?
   - Use Vercel Function Logs to see error messages

3. **Rapid diagnosis**
   - If recent deployment: ROLLBACK immediately
   - If database issue: Check Supabase status page + connection
   - If config issue: Check .env secrets in Vercel (not expired keys)

4. **Recovery**
   - Rollback (if deployment issue)
   - OR fix in code + redeploy (if bug fix)
   - OR contact Supabase support (if database down)

5. **Post-incident**
   - Document root cause in /api/knowledge
   - Add test case to prevent recurrence
   - Schedule post-mortem (if human error)

#### Example: Signup Breaks After Deploy

```
1. Check /api/production-health → "signup_flow": "error"
2. Check Vercel logs → "missing SUPABASE_SERVICE_ROLE_KEY"
3. Action: Vercel Settings → confirm env var is present
4. If missing: Add it, redeploy, test
5. If present: Might be expired — rotate it, redeploy
6. If still broken: Rollback to previous version
```

### Critical Alert: Uptime <95%

**Severity:** CRITICAL | **TTR Goal:** <30 min | **Action:** Investigate immediately

Usually indicates:

1. **DNS/CDN issue** — Vercel infrastructure problem (rare)
   - Check Vercel status page: status.vercel.com
   - If outage: Wait for Vercel to recover (usually <5 min)

2. **Supabase down** — Database unavailable
   - Check Supabase status page: status.supabase.com
   - If outage: Wait for recovery (usually <30 min)
   - Backup: Vercel shows "degraded" status via /api/production-health

3. **GitHub Actions down** — Monitoring workflows can't run
   - Check GitHub status page: status.github.com
   - This doesn't affect customer access, only alerts
   - Low priority unless coincides with other issues

### Critical Alert: Spending >3x Baseline

**Severity:** HIGH | **TTR Goal:** <1 hour | **Action:** Investigate

Expected costs:

- Vercel: ~$15/month (Hobby tier) or $20+/month (Pro tier)
- Supabase: ~$30/month (free tier + usage)
- **Total:** ~$45-50/month = ~$1.50/day

If you see $150+/day spending:

1. **Check Vercel dashboard** → Function execution or bandwidth spike?
2. **Check Supabase dashboard** → Storage or query anomaly?
3. **Check GitHub Actions** → Workflow running excessively?
4. **Possible causes:**
   - Infinite loop in background job
   - Storage leak (debug logging too verbose)
   - DDoS attack (unlikely at launch)
   - Customer testing with high API call volume

**Action:** If legitimate traffic spike, congratulations (growth!). If anomaly, investigate root cause.

---

## Maintenance Tasks

### Daily (2-3 min)

- [ ] Check /api/alerts for critical issues
- [ ] Verify /api/production-health all green

### Weekly (10-15 min)

- [ ] Review /api/error-rate trends
- [ ] Check /api/cost-anomaly for spending patterns
- [ ] Review /api/security-scan for new vulnerabilities
- [ ] Read /api/knowledge for any recorded issues

### Monthly (30-45 min)

- [ ] Review Vercel analytics (requests, bandwidth, performance)
- [ ] Review Supabase database performance (query stats)
- [ ] Test backup restoration (Supabase → restore from backup → verify)
- [ ] Review customer retention metrics (who's at-risk?)
- [ ] Plan next month's features (based on customer feedback)

### Quarterly (2-3 hours)

- [ ] Security audit: Check for new vulnerabilities (npm audit)
- [ ] Cost optimization: Any ways to reduce Vercel/Supabase spend?
- [ ] Capacity planning: Storage growth rate? Query performance degradation?
- [ ] Roadmap alignment: Are we building what customers need?

---

## Emergency Contacts

| Issue | Contact | Response Time |
|-------|---------|---|
| Vercel Down | Vercel Status Page | <5 min |
| Supabase Down | Supabase Status Page | <30 min |
| Email Not Sending | Supabase Settings (Email Auth) | <5 min (if misconfigured) |
| GitHub Actions Down | GitHub Status Page | <15 min |
| Billing Issues | Vercel/Supabase dashboards | 1 hour (manual review) |

---

## Frequently Asked Questions

**Q: What if I accidentally delete something from the database?**

A: Supabase backups restore your entire database to a point-in-time (7-day retention on free tier). Go to Supabase dashboard → Backups → restore to a time before deletion. This may take 10-30 minutes.

**Q: What if a customer forgets their password?**

A: Password reset is available on the sign-in page. Supabase sends a reset link via email. If email is broken, manually reset via Supabase Auth dashboard (rare).

**Q: Can I deploy without tests?**

A: Technically yes (git push to main). But I recommend always running `npm test` locally before pushing:

```bash
npm test          # 30 seconds, validates everything
npm run build     # Confirms production build works
git push          # Deploy
```

**Q: What if Vercel randomly goes down?**

A: It won't. Vercel has 99.95% uptime SLA. If you see an outage, check status.vercel.com. If confirmed outage, Twitter (@vercel) usually has updates.

**Q: How do I know if a customer is about to churn?**

A: Check GET /api/customer-retention?action=high-risk. This lists customers with risk score >70, ranked by urgency. Reaches out via email/Slack (DNS-GOV-018 retention triggers).

---

## Founder Accountability Checklist

Before launching to first customer, confirm:

- [ ] Supabase schema is deployed (verified by test signup)
- [ ] Email verification works (test signup, check email)
- [ ] GitHub Actions is funded (check Settings → Billing)
- [ ] Monitoring alerts reach you (test via /api/alerts)
- [ ] You understand how to rollback (practice once locally)
- [ ] You know the deployment procedure (practiced it)
- [ ] You have backup for Vercel/Supabase password

---

## Success Criteria

Launch is successful when:

1. ✅ Founder can independently deploy code
2. ✅ Founder can independently rollback if needed
3. ✅ Monitoring alerts reach Founder in real-time
4. ✅ First customer completes signup → workspace → dashboard
5. ✅ First customer can return next day without support
6. ✅ No critical production issues in first week

---

## Notes for Future Self

Every time you deploy:

1. Commit message should be clear: `feat: DNS-GOV-XXX: Description`
2. Test suite must pass: `npm test`
3. Build must succeed: `npm run build`
4. Push to main: `git push origin main`
5. Watch Vercel for deployment status (2-3 minutes)
6. Verify via /api/health (should return `ok: true`)

If anything feels wrong or you hit an error you haven't seen before, document it in /api/knowledge endpoint so future operations team learns from it.

Never deploy on Friday afternoon. Deploy early in the week so you can monitor for 24+ hours.
