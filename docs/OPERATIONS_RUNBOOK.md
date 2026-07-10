# Operations Runbook

**Purpose:** Guide for day-to-day production operations  
**Audience:** Founder, Operations team  
**Updated:** 2026-07-10  

---

## Table of Contents

1. [Monitoring & Alerts](#monitoring--alerts)
2. [Common Issues & Fixes](#common-issues--fixes)
3. [Deployment & Rollback](#deployment--rollback)
4. [Performance Tuning](#performance-tuning)
5. [Scaling](#scaling)
6. [Security Incident Response](#security-incident-response)

---

## Monitoring & Alerts

### Real-Time Monitoring (Every 5-15 minutes)

**Vercel Dashboard:** https://vercel.com/mininglife7-dev/newspulse-ai

**Key Metrics:**
- **Health (`/api/health`)** — 5 min interval
  - Checks: Supabase connectivity, env vars present
  - Expected: `status: healthy` (200 OK)
  - Alert trigger: 3 consecutive failures → likely env var issue

- **Production Health (`/api/production-health`)** — 10 min interval
  - Checks: Auth flow, dashboard, API latency, error rates
  - Expected: `ok: true`, all checks healthy
  - Alert trigger: Any check degraded → investigate endpoint

- **Deployment Verification (`/api/verify-deployment`)** — 10 min interval
  - Checks: Latest code deployed and live
  - Expected: `status: healthy`, deployment matches latest commit
  - Alert trigger: Mismatch → may need to redeploy

- **Error Rate (`/api/error-rate`)** — 15 min interval
  - Tracks: Error rate percentage, error distribution
  - Expected: < 1% error rate
  - Alert trigger: > 5% error rate → check error logs

- **Alert Hub (`/api/alerts`)** — 10 min interval
  - Aggregates: System alerts, security issues, blockers
  - Expected: `ok: true`, no critical alerts
  - Alert trigger: Critical alert present → investigate immediately

- **Blocking Conditions (`/api/blocking-conditions`)** — 10 min interval
  - Checks: GitHub Actions status, external dependencies
  - Expected: No blockers detected
  - Alert trigger: Blocker found → check GitHub/external services

### How to Check Status (Without Dashboard)

**Terminal curl commands:**

```bash
# Health check
curl https://newspulse-ai.vercel.app/api/health

# Production health
curl https://newspulse-ai.vercel.app/api/production-health

# Deployment status
curl https://newspulse-ai.vercel.app/api/verify-deployment

# Error rate
curl https://newspulse-ai.vercel.app/api/error-rate

# Alerts
curl https://newspulse-ai.vercel.app/api/alerts

# Blocking conditions
curl https://newspulse-ai.vercel.app/api/blocking-conditions
```

**Expected responses:** All should return `ok: true` or `status: healthy`

---

## Common Issues & Fixes

### Issue 1: Health Check Failing (500 error)

**Symptom:** `/api/health` returns 503 or error message

**Causes:**
1. Environment variables missing
2. Supabase connection down
3. Vercel deployment issue

**Fix:**
1. Check Vercel environment variables:
   - Vercel dashboard → Settings → Environment Variables
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

2. Verify Supabase status:
   - Supabase dashboard → Status
   - Check: Database running, auth service running

3. Redeploy if needed:
   - Push dummy commit to main: `git commit --allow-empty -m "redeploy"`
   - Vercel auto-deploys

---

### Issue 2: Production Health Degraded

**Symptom:** `/api/production-health` returns degraded status

**Check each component:**

```bash
# 1. Auth flow health
curl https://newspulse-ai.vercel.app/api/production-health | grep auth

# Expected: "status": "healthy"
# If degraded: Auth signup/verification may be broken
```

**Fixes:**
- Auth flow broken: Check Supabase email provider enabled
- Dashboard slow: Check Supabase performance, consider caching
- API latency high: Check Vercel function duration, optimize queries

---

### Issue 3: Deployment Mismatch

**Symptom:** `/api/verify-deployment` shows latest code not deployed

**Likely cause:** Vercel build failure or deployment in progress

**Fix:**
1. Go to Vercel dashboard → Deployments
2. Check most recent deployment status
3. If failed: Review build logs, fix issue, push new commit
4. If in progress: Wait for completion (usually 2-5 minutes)

**If stuck:** Redeploy manually
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

---

### Issue 4: High Error Rate

**Symptom:** `/api/error-rate` shows > 5% errors

**Investigate:**

```bash
# Get error details
curl https://newspulse-ai.vercel.app/api/error-rate | grep endpoint

# Top failing endpoint will be listed
```

**Common causes:**
1. Supabase query timeout (database slow)
2. External API failure (GitHub API, Firecrawl, OpenAI)
3. Invalid user input (validation failure)
4. Rate limiting (too many requests from one IP)

**Fix depends on endpoint:**
- Database issue: Check Supabase dashboard → Monitor
- External API: Check service status page
- Validation: Review recent changes to input handling
- Rate limit: Increase rate limit in `lib/rate-limit.ts` if legitimate traffic

---

### Issue 5: Alerts (Critical)

**Symptom:** `/api/alerts` returns critical alerts

**Possible alerts:**
- "Deployment mismatch detected" → Fix: Redeploy
- "High error rate detected" → Fix: Investigate errors
- "External API failure" → Fix: Check GitHub/third-party status
- "Database performance degraded" → Fix: Scale Supabase or optimize queries

**Always log/track:**
- When alert occurred
- What was happening (customer traffic, new deployment, etc.)
- How long it lasted
- Root cause
- Fix applied

---

### Issue 6: Blocking Conditions

**Symptom:** `/api/blocking-conditions` returns blockers

**Common blockers:**
1. GitHub Actions down → Blocks deployment verification
2. GitHub API rate limited → Can't check workflow status
3. Supabase connection down → Database unavailable
4. Vercel deployment failed → New code not live

**Fix:**
- GitHub down: Wait for status.github.com to recover
- GitHub rate limited: Wait 1 hour or request higher quota
- Supabase down: Check Supabase status page
- Vercel failed: Check build logs, fix issue, redeploy

---

## Deployment & Rollback

### Deploying Code

**Normal flow:**
1. Code is on feature branch
2. Create pull request (optional)
3. Tests pass (183 tests)
4. Merge to `main`
5. Vercel auto-deploys (2-5 minutes)
6. Monitor `/api/verify-deployment` until deployment confirms live

**Deployment checklist:**
- ✅ All tests passing
- ✅ Build successful
- ✅ No breaking changes to database
- ✅ Monitoring endpoint ready

### Rolling Back (If Problem Found)

**Option 1: Revert last commit**
```bash
git revert HEAD --no-edit
git push origin main
# Vercel redeploys (2-5 minutes)
```

**Option 2: Reset to known good commit**
```bash
git reset --hard <good-commit-sha>
git push origin main --force-with-lease
# Vercel redeploys
```

**After rollback:**
1. Monitor `/api/production-health` for 5 minutes
2. Create new branch to fix issue
3. Test thoroughly
4. Re-deploy

---

## Performance Tuning

### Monitoring Performance

**Vercel Analytics:** Vercel dashboard → Analytics
- Real User Monitoring (RUM)
- Core Web Vitals
- API response times

**API Performance Targets:**
- `/api/workspace` (POST) — < 2s
- `/api/ai-systems` (POST) — < 1s
- `/api/dashboard` (GET) — < 500ms
- Other endpoints — < 1s

**If slow:**

1. **Query optimization** (if Supabase bottleneck):
   - Check slow query log
   - Add indexes if needed
   - Optimize SELECT queries (avoid N+1)

2. **Caching** (if repeated queries):
   - Adjust cache duration in `lib/cache-control.ts`
   - Add Redis layer if Supabase query heavy

3. **Function optimization** (if computation heavy):
   - Profile with Vercel Analytics
   - Reduce algorithm complexity
   - Move heavy work to background jobs

### Bundle Size

**Current:** ~102 KB (First Load JS)

**Monitor:** `npm run build` output shows bundle size

**If growing:**
1. Identify new dependency with `npm ls`
2. Consider alternative lightweight package
3. Or lazy-load non-critical features

---

## Scaling

### When to Scale

**Scale Supabase if:**
- Database connection limit reached
- Query latency > 200ms (check Supabase monitor)
- CPU usage > 80%

**Scale Vercel if:**
- Function duration consistently > 8s
- Memory usage > 512MB
- Need more concurrent requests

### How to Scale Supabase

**Upgrade plan:**
1. Supabase dashboard → Settings → Billing
2. Choose plan (Pro, Business)
3. Confirm upgrade
4. Monitor performance improvements

**Optimize instead of scale:**
- Add indexes to slow queries
- Batch queries together
- Use connection pooling
- Archive old data

### How to Scale Vercel

**Vercel Pro is already active** ($20/mo)
- Unlimited bandwidth
- Edge Middleware
- Monitoring & Analytics

**If needing more:**
- Upgrade to Vercel Business
- Or add CDN for static assets
- Or split into microservices

---

## Security Incident Response

### If Data Breach Suspected

**Immediate (Within 5 minutes):**
1. Check `/api/alerts` for security alerts
2. Review Vercel logs for unauthorized access
3. Check Supabase audit log for suspicious queries

**If confirmed:**
1. Disable affected user accounts (if specific)
2. Rotate credentials (GitHub token, Supabase keys)
3. Review access logs for scope of breach
4. Notify affected customers

**If rate limiting needed:**
1. Add IP to blocklist in Vercel middleware
2. Implement temporary rate limit boost
3. Monitor for DDoS patterns

---

### If Secrets Exposed

**Immediate:**
1. Go to Supabase dashboard → Settings → API Keys
2. Rotate `SUPABASE_SERVICE_ROLE_KEY`
3. Update Vercel environment variables
4. Redeploy

**Check for abuse:**
- Review Supabase audit log for unauthorized queries
- Check Vercel logs for suspicious requests
- Monitor error rate for unusual patterns

---

### If Compromise Detected

**Contain (5 minutes):**
1. Identify affected endpoints/features
2. Disable if possible (feature flag or rollback)
3. Stop accepting new data if data integrity compromised

**Investigate (30 minutes):**
1. Review audit logs for what was accessed
2. Determine scope (how many users affected)
3. Find root cause

**Remediate (Ongoing):**
1. Apply security fix
2. Test thoroughly
3. Redeploy
4. Verify no continued abuse

**Communicate:**
- Notify affected customers (required by law)
- Share incident timeline
- Explain mitigation steps

---

## Daily Operations Checklist

**Morning (5 minutes):**
- ✅ Check `/api/production-health` — all healthy?
- ✅ Review error rate (`/api/error-rate`) — < 1%?
- ✅ Check for alerts (`/api/alerts`) — any critical?
- ✅ Deployment status (`/api/verify-deployment`) — live?

**During Day:**
- ✅ Monitor Vercel dashboard for anomalies
- ✅ Respond to any alerts within 15 minutes
- ✅ Keep Supabase monitor visible (check occasionally)

**Evening (5 minutes):**
- ✅ Review day's error log for patterns
- ✅ Note any recurring issues for investigation
- ✅ Verify deployment was stable (24-hour post)

**Weekly (30 minutes):**
- ✅ Review performance metrics (bundle size, latency, errors)
- ✅ Plan any optimization or scaling
- ✅ Review customer feedback for reliability issues
- ✅ Check dependency updates for security patches

---

## Escalation Procedures

### Low Severity (Response time: 1 hour)

**Examples:** Typo in error message, minor UI bug, minor performance degradation

**Process:**
1. Create GitHub issue
2. Assign to developer
3. Plan for next sprint
4. No immediate action needed

### Medium Severity (Response time: 2 hours)

**Examples:** High error rate (1-5%), slow endpoint (1-3s), feature intermittently broken

**Process:**
1. Investigate root cause
2. Apply workaround if possible
3. Create fix in feature branch
4. Deploy fix to production
5. Monitor for 24 hours

### High Severity (Response time: 30 minutes)

**Examples:** Partial outage, data loss, security issue, > 10% error rate

**Process:**
1. Immediately investigate
2. Rollback if recent deployment caused it
3. Apply emergency fix
4. Deploy and monitor
5. Post-incident review within 24 hours

### Critical (Response time: 5 minutes)

**Examples:** Complete outage, data breach, RLS bypass, customer data exposed

**Process:**
1. Immediate action (rollback, disable feature)
2. Investigate root cause in parallel
3. Deploy fix when ready
4. Restore service
5. Incident report & security audit

---

## Contact & Escalation

**Founder:** mininglife7@gmail.com  
**On-call:** Check Vercel dashboard for critical alerts

**If can't resolve:**
1. Note exact error/issue
2. Review monitoring endpoints
3. Contact Founder with:
   - What's broken
   - When it broke
   - What's been tried
   - Current status

---

## Appendix: Useful Commands

```bash
# Check deployment status
curl https://newspulse-ai.vercel.app/api/verify-deployment

# Get detailed error information
curl https://newspulse-ai.vercel.app/api/error-rate

# Check for system alerts
curl https://newspulse-ai.vercel.app/api/alerts

# Check database connectivity
curl https://newspulse-ai.vercel.app/api/health

# Redeploy (if needed)
git commit --allow-empty -m "trigger redeploy"
git push origin main

# Rollback to previous version
git revert HEAD --no-edit
git push origin main

# View recent commits
git log --oneline -10

# View Vercel logs (requires Vercel CLI)
vercel logs <deployment-id>
```

---

**Last Updated:** 2026-07-10  
**Next Review:** 2026-07-17 (1 week after launch)  
**Maintained by:** Governor, Operations team
