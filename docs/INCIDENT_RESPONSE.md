# Incident Response Playbook

**Purpose:** Quick reference for handling production incidents  
**Audience:** Operations, Founder  
**Use when:** Something breaks in production  

---

## Quick Decision Tree

```
Is the service completely down?
├─ YES → Go to "COMPLETE OUTAGE" (p. 3)
└─ NO → Is error rate > 5%?
   ├─ YES → Go to "HIGH ERROR RATE" (p. 4)
   └─ NO → Is specific feature broken?
      ├─ YES → Go to "FEATURE BROKEN" (p. 5)
      └─ NO → Go to "PERFORMANCE ISSUE" (p. 6)
```

---

## Severity Levels

| Severity | Response Time | Example |
|----------|---------------|---------|
| Critical | 5 min | Complete outage, data breach |
| High | 30 min | 10% error rate, deployment stuck |
| Medium | 2 hours | 1-5% error rate, slow endpoint |
| Low | 1 day | Minor bug, typo in message |

---

## COMPLETE OUTAGE (Critical)

**Symptoms:**
- App not loading (404/503)
- All endpoints returning errors
- Vercel shows red status

**Response (5 minutes):**

### Step 1: Confirm Outage
```bash
# Check all endpoints
curl https://newspulse-ai.vercel.app/api/health
curl https://newspulse-ai.vercel.app/api/production-health
curl https://newspulse-ai.vercel.app (homepage)

# If all fail → confirmed outage
```

### Step 2: Identify Cause
**Most common causes:**

1. **Environment variables missing**
   - Check Vercel dashboard → Settings → Environment Variables
   - Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   - Fix: Re-add missing variable, redeploy

2. **Supabase down**
   - Check supabase.io status page
   - If down: Wait for recovery, no action needed
   - If up: Check database connection in app logs

3. **Recent deployment failed**
   - Check Vercel dashboard → Deployments
   - Click most recent deployment → View logs
   - Fix: Revert to previous commit

4. **DNS/SSL issue**
   - Check that domain is resolving
   - Check SSL certificate expiration
   - Contact Vercel support if needed

### Step 3: Emergency Action

**If Supabase is down:**
```
→ Wait for Supabase recovery
→ Monitor /api/health endpoint
→ Service should auto-recover
```

**If recent deployment caused it:**
```bash
# Revert to previous working version
git revert HEAD --no-edit
git push origin main

# Vercel redeploys automatically
# Monitor /api/production-health until healthy
```

**If environment variables missing:**
```
1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Add missing variables
4. Trigger redeploy:
   git commit --allow-empty -m "redeploy"
   git push origin main
```

### Step 4: Verify Recovery
```bash
# Wait 2-5 minutes for redeploy
# Then check:
curl https://newspulse-ai.vercel.app/api/production-health

# Expected: status: healthy, all checks passing
```

### Step 5: Post-Incident
- Document what happened
- Note time down
- Note root cause
- Note fix applied
- Review to prevent recurrence

---

## HIGH ERROR RATE (High/Critical)

**Symptoms:**
- Error rate > 5%
- Specific endpoint failing (400/500)
- Users reporting failures

**Response (30 minutes):**

### Step 1: Identify Failing Endpoint
```bash
curl https://newspulse-ai.vercel.app/api/error-rate
```

**Look for:** `criticalEndpoints` array shows which endpoint(s) are failing

**Common patterns:**
- All endpoints failing → Database problem
- One endpoint failing → Logic error in that endpoint
- Random failures → Rate limiting or timeout

### Step 2: Check Supabase
```
Go to Supabase dashboard:
1. Monitor tab → Check CPU, connections, query performance
2. SQL Editor → Check recent slow queries
3. Auth tab → Check if auth provider is enabled
```

**If database is slow:**
- High CPU usage → Query optimization needed
- High connection count → Connection limit reached
- Slow queries → Add index or optimize SELECT

### Step 3: Check Recent Changes
```bash
git log --oneline -5
# Review last 5 commits - did any change error-prone code?
```

**If recent deployment is suspect:**
```bash
# Check what changed
git diff HEAD~1 HEAD

# If obvious error, revert:
git revert HEAD --no-edit
git push origin main
```

### Step 4: Implement Fix
**Option A: Rollback** (if recent change)
```bash
git revert HEAD --no-edit
git push origin main
```

**Option B: Quick Fix** (if known issue)
```bash
# Create fix in feature branch
git checkout -b fix/high-error-rate
# Make fix
# Test locally
git commit -am "fix: resolve high error rate"
git push origin fix/high-error-rate
# Merge and deploy
git checkout main
git merge fix/high-error-rate
git push origin main
```

**Option C: Scaling** (if legitimate traffic spike)
```
1. Increase Supabase connection limit (Settings → Database → Max connections)
2. Increase Vercel function memory (Settings → Functions)
3. Or enable Vercel Pro features
```

### Step 5: Verify Fix
```bash
# Wait 5 minutes, then check error rate
curl https://newspulse-ai.vercel.app/api/error-rate

# Should show < 1% after fix
```

---

## FEATURE BROKEN (Medium)

**Symptoms:**
- Specific flow not working (e.g., signup, dashboard load)
- Error message shown to user
- Other features work fine

**Response (2 hours):**

### Step 1: Reproduce Locally

```bash
# Checkout main branch
git checkout main
git pull origin main

# Run locally
npm install
npm run dev

# Try to reproduce the issue at http://localhost:3000
```

### Step 2: Identify Root Cause

**If signup broken:**
- Check: Is email auth enabled in Supabase?
- Check: Is NEXT_PUBLIC_SUPABASE_URL set?
- Check: Can you connect to Supabase?

**If dashboard broken:**
- Check: Do you have a workspace?
- Check: Is RLS policy allowing access?
- Check: Any Supabase errors in console?

**If specific endpoint broken:**
```bash
# Test the endpoint
curl -X POST https://newspulse-ai.vercel.app/api/ai-systems \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# Check the error message
```

### Step 3: Create Fix

```bash
# Create fix branch
git checkout -b fix/broken-feature

# Make changes to fix issue
# Test locally
npm test

# Commit fix
git commit -am "fix: resolve broken feature"
git push origin fix/broken-feature

# Create PR (optional review)
# Merge to main
git checkout main
git merge fix/broken-feature
git push origin main
```

### Step 4: Deploy & Monitor

```bash
# Vercel auto-deploys
# Wait 2-5 minutes
# Verify fix:
- Try to reproduce issue
- Check error rate (should be normal)
- Check /api/production-health (all healthy)
```

---

## PERFORMANCE ISSUE (Medium)

**Symptoms:**
- App is slow (> 3 seconds to load)
- Endpoint timing out (> 10 seconds)
- Vercel shows high function duration

**Response (2 hours):**

### Step 1: Measure Performance

```bash
# Measure endpoint latency
curl -w "Total: %{time_total}s\n" https://newspulse-ai.vercel.app/api/dashboard

# Check Vercel Analytics
# Vercel dashboard → Analytics → API Functions
```

### Step 2: Identify Bottleneck

**Check each layer:**

1. **Frontend slow?** (Lighthouse)
   - Vercel dashboard → Analytics → Core Web Vitals
   - Fix: Optimize bundle size, lazy load, defer non-critical JS

2. **API slow?** (Function duration)
   - Check: Is Supabase query slow?
   - Check: Is external API call slow?
   - Fix: Optimize query, add caching, timeout external calls

3. **Database slow?** (Supabase monitor)
   - Check: High CPU?
   - Check: Slow query log?
   - Fix: Add index, optimize query, upgrade plan

### Step 3: Implement Fix

**If Supabase query is slow:**
```bash
# Example: Optimize query with index
# Go to Supabase SQL Editor
# Add index:
CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
```

**If function is slow:**
```bash
# Edit endpoint, reduce work
# Example: Remove N+1 query
git checkout -b perf/optimize-endpoint
# Make optimization
git commit -am "perf: optimize slow endpoint"
git push origin perf/optimize-endpoint
git merge to main
```

**If frontend is slow:**
```bash
# Reduce bundle size
# Remove unused dependencies
# Lazy load components
# Use dynamic imports for heavy components
```

### Step 4: Measure Improvement

```bash
# Re-measure after fix
curl -w "Total: %{time_total}s\n" https://newspulse-ai.vercel.app/api/dashboard

# Should see improvement of 20-50%
```

---

## SECURITY INCIDENT (Critical)

**Symptoms:**
- Unauthorized access detected
- Data breach suspected
- Injection attack attempt detected
- Credentials compromised

**Response (Immediate):**

### Step 1: Contain (5 minutes)

**If data breach suspected:**
```
1. Note timestamp of suspicious activity
2. Identify which data was accessed
3. Check: Is it still happening? (ongoing breach)
4. If ongoing: Rollback to known good version
```

**If credentials compromised:**
```
1. Go to Supabase → Settings → API Keys
2. Rotate SUPABASE_SERVICE_ROLE_KEY
3. Update Vercel environment variables
4. Redeploy:
   git commit --allow-empty -m "security: rotate credentials"
   git push origin main
```

### Step 2: Investigate (30 minutes)

```bash
# Check Supabase audit log
Supabase dashboard → Logs → Queries

# Look for:
- Unauthorized data access
- Unusual query patterns
- Multiple failed auth attempts

# Check Vercel logs
Vercel dashboard → Logs → Runtime Logs

# Look for:
- SQL injection attempts
- XSS attempts
- Unusual IP addresses
```

### Step 3: Remediate

**If injection vulnerability found:**
```bash
# Create security fix
git checkout -b security/fix-vulnerability
# Apply fix (likely in validation or query)
# Test: npm test
git commit -am "security: fix vulnerability"
git push origin security/fix-vulnerability
git merge to main
git push origin main
```

**If user data exposed:**
```
1. Determine scope (how many users affected)
2. Notify affected users (required by law)
3. Offer remedy (reset password, free monitoring, etc.)
4. Document incident
```

### Step 4: Post-Incident

- Review security logging
- Enable additional security monitoring
- Plan to prevent recurrence
- Schedule security audit
- Consider penetration testing

---

## ROLLBACK PROCEDURES

### Simple Rollback (Revert Last Commit)

```bash
git revert HEAD --no-edit
git push origin main

# Vercel auto-redeploys in 2-5 minutes
```

### Rollback to Specific Commit

```bash
# Find the commit SHA you want to rollback to
git log --oneline -10

# Example: Want to go back to abc123def456
git reset --hard abc123def456
git push origin main --force-with-lease

# Vercel auto-redeploys
```

### Rollback from Vercel UI

1. Vercel dashboard → Deployments
2. Find the previous working deployment
3. Click "Redeploy"
4. Confirm

---

## Escalation Matrix

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | 5 min | Immediate action, rollback if needed |
| High | 30 min | Investigate, fix, deploy |
| Medium | 2 hours | Diagnose, create fix, test, deploy |
| Low | 1 day | File issue, plan for next sprint |

---

## Post-Incident Checklist

After any incident:

- [ ] Document what happened (timeline)
- [ ] Note root cause
- [ ] Note fix applied
- [ ] Calculate downtime (if any)
- [ ] Notify affected customers (if critical)
- [ ] Update monitoring to catch similar issues
- [ ] Plan prevention (code change, new test, etc.)
- [ ] Schedule post-incident review (within 24 hours)

---

## Helpful Links

- **Vercel Dashboard:** https://vercel.com/mininglife7-dev/newspulse-ai
- **Supabase Dashboard:** https://app.supabase.com
- **GitHub Repo:** https://github.com/mininglife7-dev/newspulse-ai
- **Monitoring Endpoints:**
  - Health: https://newspulse-ai.vercel.app/api/health
  - Production Health: https://newspulse-ai.vercel.app/api/production-health
  - Error Rate: https://newspulse-ai.vercel.app/api/error-rate
  - Alerts: https://newspulse-ai.vercel.app/api/alerts

---

## When in Doubt

1. Check `/api/health` endpoint
2. Check `/api/production-health` for details
3. Rollback to previous version
4. Investigate root cause
5. Apply fix
6. Test & redeploy
7. Monitor for 24 hours

---

**Last Updated:** 2026-07-10  
**Next Review:** 2026-07-17 (post-launch)  
**Author:** Governor
