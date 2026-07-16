# Production Deployment Guide

## Quick Reference

**Environment**: Vercel (automatic via GitHub integration)  
**Trigger**: Push to `main` branch  
**Rollback**: Revert commit and push  
**Monitoring**: Vercel dashboard + structured logs  

---

## Pre-Deployment (1-2 hours before)

### 1. Verify Build & Tests
```bash
# Clean install
npm ci

# Run tests
npm run test

# Build for production
npm run build

# Check for lint issues
npm run lint
npm run type-check
```

**Success criteria**: All tests pass, build succeeds, no type errors.

### 2. Verify Environment Variables

In Vercel dashboard:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] Variables match `.env.example`

### 3. Backup Database

```bash
# Export current database state
supabase db pull

# Commit backup
git add supabase/
git commit -m "pre-deployment backup"
```

### 4. Create Release Branch (Optional)

For major deployments, create release branch:

```bash
# Create release branch
git checkout -b release/v1.0.0

# Tag version
git tag -a v1.0.0 -m "Production release 1.0.0"

# Push both
git push origin release/v1.0.0
git push origin v1.0.0
```

---

## Deployment Process

### Step 1: Final Code Review

Review changes going into production:

```bash
# See commits since last production deploy
git log --oneline production..main | head -20

# Or review PR if using feature branches
gh pr list --base main --state merged
```

**Check for**:
- [ ] Database migrations included
- [ ] No hardcoded secrets
- [ ] No experimental features
- [ ] All tests passing in CI
- [ ] Documentation updated

### Step 2: Push to Main

```bash
# Ensure you're on main branch
git checkout main

# Pull latest changes
git pull origin main

# Verify local build
npm run build

# Push to main
git push origin main
```

**GitHub Actions CI will automatically**:
- [ ] Run lint check
- [ ] Run type check
- [ ] Run tests
- [ ] Build project
- [ ] Report status

### Step 3: Monitor Vercel Deployment

Dashboard: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai

**Status indicators**:
- 🔵 **Building**: Deployment in progress (5-10 min)
- 🟢 **Ready**: Deployment successful, live in production
- 🔴 **Error**: Build or deployment failed

If status is **Error**:
1. Click on deployment to see error details
2. Review error message
3. If fixable: commit fix and push again
4. If critical: proceed to Rollback section

### Step 4: Verify Health Endpoint

Once "Ready" status:

```bash
# Check health endpoint
curl https://newspulse-ai.vercel.app/api/health

# Expected response:
# {
#   "ok": true,
#   "status": "healthy",
#   "timestamp": "2026-07-16T...",
#   "checks": { ... }
# }
```

### Step 5: Test Critical Workflows

Test in production environment:

1. **Access Dashboard**
   - Navigate to: https://newspulse-ai.vercel.app/dashboard
   - Verify page loads
   - Check that workspace loads

2. **Create Test Risk Assessment** (if test workspace available)
   - Navigate to: /risk-assessment
   - Complete assessment
   - Verify obligation creation
   - Check logs for errors

3. **View Obligations**
   - Navigate to: /remediation
   - Verify obligations display
   - Check data consistency

---

## Post-Deployment (30 minutes)

### 1. Monitor Error Rate

Check Vercel logs for errors:

```bash
vercel logs -f --limit 50
```

**Look for**:
- [ ] No 5xx error rate > 1%
- [ ] No recurring error patterns
- [ ] Request completion times normal
- [ ] Database queries responding

### 2. Verify Key Metrics

In logs, search for:

```
filter by: timestamp > now - 30m AND level == "error"
count: total errors
calculate: error_rate = errors / total_requests
target: < 1%
```

### 3. Check Monitoring Dashboard

If using external monitoring:

- [ ] Log ingestion working
- [ ] Metrics collected
- [ ] Alerts configured
- [ ] No alert threshold breaches

### 4. User Communication

If this is a major release, notify users:

> **Subject**: EURO AI Platform Update
>
> We've successfully deployed new features and improvements.
> - All systems operational
> - No action required from your team
> - Please report any issues via support

### 5. Update Status

- [ ] Mark deployment as successful
- [ ] Update version number if using semantic versioning
- [ ] Notify team in Slack/email
- [ ] Document any manual steps taken

---

## Rollback Procedure

Use only if critical issues discovered post-deployment.

### Option 1: Revert Previous Commit (Recommended)

```bash
# Revert the deployment commit
git revert HEAD

# Push reverted commit
git push origin main

# Vercel will automatically deploy the reverted code
```

**This method**:
- ✓ Creates a record of the revert
- ✓ Keeps git history clean
- ✓ Allows recovery if rollback itself fails

### Option 2: Force Previous Version (Emergency Only)

```bash
# Find the commit before the problematic deployment
git log --oneline | head -5

# Reset to previous commit (use commit hash)
git reset --hard abc123def456

# Force push (only in emergency)
git push --force-with-lease origin main
```

**This method**:
- ⚠️ Rewrites history
- ⚠️ Only use if revert doesn't work
- ⚠️ Requires force flag, increased risk

### Option 3: Via Vercel UI

In Vercel dashboard:
1. Go to Deployments tab
2. Find last known good deployment
3. Click "Redeploy"
4. Confirm redeployment

**After Rollback**:
1. [ ] Verify health endpoint
2. [ ] Monitor error rate (should decrease)
3. [ ] Test critical paths
4. [ ] Notify team
5. [ ] Create post-mortem issue

---

## Deployment Scenarios

### Scenario 1: Scheduled Release

**Timeline**: Plan 1-2 days ahead

1. Create release branch 1 day before
2. Send team notification (24 hours before)
3. Schedule deployment window (off-peak if possible)
4. Follow standard deployment process
5. Post-deployment: send update email

### Scenario 2: Critical Bug Fix

**Timeline**: Deploy ASAP

1. Verify fix in staging environment
2. Code review (expedited)
3. Push to main
4. Deploy immediately
5. Enhanced monitoring for 2 hours
6. Document incident

### Scenario 3: Multi-Part Deployment

**Example**: Database migration + code changes

1. **Part 1**: Deploy database migrations (if async-safe)
2. **Wait**: Verify migration success (15 min)
3. **Part 2**: Deploy code changes
4. **Verify**: Both parts working together

Or use feature flags:
1. Deploy code with feature flag OFF
2. Verify deployment successful
3. Enable feature flag
4. Monitor

### Scenario 4: Rollback Due to Issue

1. **Assess**: Critical or recoverable?
   - Critical (> 50% error rate): Rollback immediately
   - Moderate (1-5% error rate): Diagnose first
   - Minor (< 1% error rate): Monitor and fix forward

2. **Execute**: Follow rollback procedure
3. **Document**: What went wrong and why
4. **Fix**: Address root cause
5. **Re-deploy**: After fix verified

---

## Monitoring During Deployment

### Real-time Log Monitoring

```bash
# Follow deployment logs in real-time
vercel logs -f

# Filter by error level
vercel logs -f | grep '"level":"error"'

# Filter by specific endpoint
vercel logs -f | grep '/api/risk-assessment'
```

### Key Log Patterns to Watch

**Good signs**:
```json
{"level":"info","message":"Request completed","statusCode":200,"duration":45}
{"level":"info","message":"Risk assessment created successfully","duration":342}
```

**Warning signs**:
```json
{"level":"warn","message":"Rate limit exceeded","retryAfter":5}
{"level":"error","message":"Failed to create risk assessment","error":"database connection error"}
```

**Critical signs**:
```json
{"level":"error","message":"Unhandled exception in risk assessment creation","stack":"..."}
{"statusCode":503,"message":"Service Unavailable"}
```

---

## Performance Baseline

After deployment, confirm metrics match baseline:

| Metric | Target | Status |
|--------|--------|--------|
| Health check response | < 50ms | ✓ |
| /api/risk-assessment/create | < 500ms P95 | ✓ |
| /api/obligations/list | < 200ms P95 | ✓ |
| Error rate | < 1% | ✓ |
| Database queries | < 100ms P95 | ✓ |

If any metric degrades:
1. Check logs for errors
2. Review recent changes
3. Consider rollback if severe

---

## Deployment Checklist

```
PRE-DEPLOYMENT (2 hours before)
- [ ] All tests passing locally
- [ ] Build succeeds without errors
- [ ] No lint warnings
- [ ] Type checking passes
- [ ] Environment variables verified in Vercel
- [ ] Database backup completed
- [ ] Code review completed
- [ ] Team notified of deployment window

DEPLOYMENT
- [ ] Code pushed to main branch
- [ ] GitHub Actions CI passes
- [ ] Vercel deployment successful (status: Ready)
- [ ] Health endpoint verified

POST-DEPLOYMENT (30 minutes)
- [ ] Error rate < 1%
- [ ] No critical errors in logs
- [ ] Key endpoints responding correctly
- [ ] Database connectivity verified
- [ ] Authentication working
- [ ] Key metrics within baseline
- [ ] Team notification sent
- [ ] Deployment status documented

ONGOING MONITORING (First 24 hours)
- [ ] Check error logs hourly
- [ ] Monitor performance metrics
- [ ] Verify data consistency
- [ ] Watch for user-reported issues
- [ ] Review authentication logs
```

---

## Troubleshooting

### Build Fails in CI

```bash
# Reproduce locally
npm ci
npm run build

# Common causes:
# - Missing environment variables
# - Type errors (run npm run type-check)
# - Lint errors (run npm run lint)
# - Missing dependencies (run npm ci)
```

### Health Check Fails

```bash
# Test health endpoint
curl https://newspulse-ai.vercel.app/api/health -v

# Common causes:
# - Database unreachable (check Supabase status)
# - Environment variables not set
# - Build incomplete
```

### High Error Rate Post-Deployment

```bash
# Check error logs
vercel logs -f | grep '"level":"error"'

# Common causes:
# - Database migration not applied
# - Environment variable mismatch
# - Authentication service down
# - Rate limiting triggered
```

### Slow Response Times

```bash
# Check for slow queries
vercel logs -f | grep '"duration"' | sort -k12 -n

# Common causes:
# - Database query performance
# - Missing database indexes
# - N+1 query problems
# - Synchronous operations
```

---

## Getting Help

- **Deployment status**: Vercel dashboard
- **Logs**: `vercel logs` command or Vercel UI
- **Errors**: Search logs by error message
- **Performance**: Check response times in logs
- **Incidents**: Follow incident response procedures in OPERATIONAL_PROCEDURES.md

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-07-16  
**Next Review**: After first production deployment
