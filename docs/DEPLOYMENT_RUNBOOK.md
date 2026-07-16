# NewsPulse AI — Production Deployment Runbook

**Last Updated:** 2026-07-15  
**Status:** Ready for Use  
**Version:** 1.0

---

## Overview

This runbook provides step-by-step instructions for deploying NewsPulse AI to production. Covers prerequisites, deployment process, verification, rollback, and post-deployment monitoring.

**Estimated Duration:** 30 minutes (normal) | 60 minutes (first-time)

---

## Pre-Deployment Checklist (Do This First)

**1 day before deployment:**

- [ ] Merge all PRs and commits to `main` branch
- [ ] Verify all tests pass locally: `npm run test`
- [ ] Verify TypeScript strict mode: `npm run type-check`
- [ ] Verify build succeeds: `npm run build`
- [ ] Create release notes (features, fixes, known issues)
- [ ] Notify team on Slack: "Deploying at [TIME]"

**At deployment time:**

- [ ] Pull latest `main` branch
- [ ] Verify no uncommitted changes: `git status`
- [ ] Confirm Vercel preview deployment successful
- [ ] Database migrations applied to staging (if any)
- [ ] Customer support team notified and ready
- [ ] Rollback plan reviewed and tested

---

## Part 1: Code Deployment

### Step 1: Verify Branch State

```bash
# Verify on main branch
git branch

# Should output:
# * main
#   develop
#   claude/euro-ai-governance-transform-r5rydy

# Verify no uncommitted changes
git status

# Should output: "On branch main, your branch is up to date with 'origin/main'"

# Verify recent commits
git log --oneline -5
```

### Step 2: Push to Production

NewsPulse AI uses **automatic deployment** via Vercel GitHub integration:

**Option A: Automatic Deployment (Recommended)**

1. All commits to `main` branch automatically deploy to production
2. Preview deployments created for all PRs
3. No manual push needed

**Option B: Manual Vercel Deployment**

If automatic deployment is disabled:

1. Go to Vercel Dashboard: https://vercel.com/dashboard/newspulse-ai
2. Find latest commit in `main` branch
3. Click **"Promote to Production"**
4. Confirm deployment

### Step 3: Monitor Build

Go to Vercel Dashboard and monitor:

```
Project: newspulse-ai
Status: Building... → Ready
Build Duration: 2-3 minutes (expected)
```

**If build fails:**

1. Click on failed deployment to view logs
2. Check common errors:
   - TypeScript compilation error (fix type error, recommit)
   - Dependency issue (verify package.json, run `npm install`)
   - Environment variable missing (see Part 2)
3. Fix issue and recommit to `main` (auto-redeploy)
4. If urgent: rollback using Step 5 in Part 1

---

## Part 2: Environment Variables

### Required Variables (Production)

These must be set in Vercel environment settings:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# External Services (if integrated)
OPENAI_API_KEY=[key]
FIRECRAWL_API_KEY=[key]
RESEND_API_KEY=[key]

# Feature Flags
NEXT_PUBLIC_ENABLE_ASSESSMENTS=true
NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT=true

# Optional
SENTRY_DSN=[sentry-project-url]
NODE_ENV=production
```

### To Set Variables in Vercel

1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Add each variable with value
3. Click **"Save"**
4. Variables apply to next deployment

### To Verify Variables

After deployment, verify they're loaded:

1. Go to deployment URL
2. Open browser DevTools Console
3. Verify no errors about missing API keys
4. Check health endpoint: `GET /api/health`

---

## Part 3: Database Migration (If Needed)

### Before Deployment

If this release includes database schema changes:

**1. Create Migration**

```bash
# Run this BEFORE deploying code
npx supabase migration new [name]
# Example: npx supabase migration new add_assessments_table

# Edit generated file in: supabase/migrations/[date]_[name].sql
# Write SQL to create/alter tables
```

**2. Test Migration Locally**

```bash
# Reset local database (CAREFUL—deletes local data)
npx supabase db reset

# Verify migration ran
npx supabase db pull  # Confirm schema matches

# Run local tests
npm run test
```

**3. Deploy Migration to Staging**

```bash
npx supabase db push --linked
# Links to staging project (confirm project ID)
```

**4. Deploy to Production**

```bash
npx supabase db push --linked
# Links to production project (CONFIRM THIS)
# Double-check project ID before proceeding!
```

### After Deployment

```bash
# Verify migration applied
select * from information_schema.tables
where table_name = '[new_table_name]';

# Verify data integrity
select count(*) from [table_name];
```

---

## Part 4: Deployment Verification

### Immediate Checks (5 minutes)

**1. Health Check**

```bash
# Should return 200 OK with healthy status
curl https://newspulse-ai.vercel.app/api/health

# Expected response:
{
  "ok": true,
  "database": "healthy",
  "auth": "healthy",
  "uptime_seconds": 120,
  "response_time_ms": 45
}
```

**2. Smoke Tests**

Test core workflows manually:

**Workspace Creation:**

1. Navigate to https://newspulse-ai.vercel.app
2. Sign in or create account
3. Create workspace: "Test Company Inc."
4. Verify workspace appears in dashboard

**Assessment Creation:**

1. Go to Assessments tab
2. Click "New Assessment"
3. Create: AI System "test-gpt4", Risk Level "High", Score 75
4. Verify assessment appears in list

**Team Invitation:**

1. Go to Settings → Team Members
2. Click "Invite Member"
3. Invite: "test-colleague@example.com", Role "member"
4. Verify invitation shows as "Pending"

**3. API Tests**

```bash
# List assessments
curl -H "Authorization: Bearer [user-token]" \
  https://newspulse-ai.vercel.app/api/assessment

# Should return 200 with assessment list (may be empty)

# Health check (no auth needed)
curl https://newspulse-ai.vercel.app/api/health

# Should return 200 with healthy status
```

### Extended Checks (10 minutes)

**1. Vercel Dashboard**

- Deployment status: Ready ✅
- Build log: No errors
- Preview URL: Works
- Production domain: Works

**2. Error Tracking (Sentry)**

```
https://sentry.io/organizations/newspulse-ai/
```

- Last 5 errors: Should be pre-deployment errors only
- No new error patterns
- Error rate: 0% (expected for new deployment)

**3. Database (Supabase)**

```
https://app.supabase.com/
```

- Database status: Healthy
- Connection pool: < 5 active
- Recent logs: No errors
- Query performance: Normal

**4. Monitoring Dashboards**

- Vercel Analytics: Loading
- API response times: Normal (< 1s)
- Web Vitals: Good (LCP, CLS, FCP)

---

## Part 5: Rollback Procedure (If Needed)

### Automatic Rollback (Emergency)

If deployment breaks production severely:

**1. Identify Previous Good Deployment**

Go to Vercel Dashboard → **Deployments**

Find last known good deployment (check timestamp, commit message)

**2. Promote Previous Deployment**

1. Click on deployment from step 1
2. Click **"Promote to Production"**
3. Confirm action
4. Wait 30 seconds for rollback to complete

**3. Verify Rollback**

```bash
# Health check should return healthy
curl https://newspulse-ai.vercel.app/api/health

# Manual smoke test (same as Part 4)
```

**4. Investigate Failure**

1. Compare deployments in Vercel dashboard
2. Check git diff between commits
3. Review build logs
4. Check error tracking (Sentry)
5. Notify team on Slack

### Git Rollback (If Needed)

If Vercel rollback doesn't work:

```bash
# Identify commit before bad deployment
git log --oneline main | head -5

# Example output:
# abc1234 Deployment that broke things
# def5678 Previous good deployment
# ghi9012 ...

# Reset to previous good commit
git reset --hard def5678

# Force push to main (CAREFUL—rewrites history)
git push origin main --force-with-lease

# Vercel will auto-redeploy
```

---

## Part 6: Post-Deployment Monitoring

### First Hour (Active Monitoring)

**Every 15 minutes:**

1. Check health endpoint: `curl /api/health`
2. Check Vercel Analytics for errors
3. Check Sentry for new errors
4. Check support email for issues

**Actions if issues found:**

- Error spike? → Check error tracking, investigate cause
- Performance degradation? → Check database metrics, consider rollback
- Auth failures? → Verify Supabase credentials, check logs
- Timeout errors? → Check database connection pool, consider rolling back

### First Day (Ongoing Monitoring)

**Schedule:**

- 8:00 AM: Morning check (all green?)
- 12:00 PM: Midday check
- 3:00 PM: Afternoon check
- 6:00 PM: Evening check
- Before bed: Final check

**What to check:**

- [ ] Health check: 200 OK
- [ ] Error rate: < 0.5%
- [ ] Response time P95: < 2s
- [ ] Database performance: Normal
- [ ] No new error patterns in Sentry
- [ ] Uptime: 100% (no 5xx errors)

**Alert conditions:**

- Error rate > 1% → Investigate immediately
- Health check failing → Rollback if needed
- Response time P95 > 5s → Check database
- Database connection pool exhausted → Scale up

### First Week (Normal Operations)

**Daily:**

- Morning: Check health metrics
- Afternoon: Review error log trends
- Evening: Check database performance

**Weekly:**

- Review SLO metrics
- Check customer feedback
- Plan any hotfixes needed

---

## Part 7: Release Notes & Communication

### Release Notes Template

```markdown
# NewsPulse AI v1.0.0 — July 15, 2026

## Features ✨

- Workspace management with atomic RPC transactions
- Team member invitation with role-based access control
- AI system risk assessments (CRUD operations)
- Email notifications via Resend
- Comprehensive API client SDK (TypeScript)

## Fixes 🐛

- [MAJOR-2] Removed unused current_workspace_id column
- [CRITICAL-1] Added server-side idempotency check

## Breaking Changes ⚠️

None in this release.

## Known Issues 🚧

- Bulk assessment export (coming Q3 2026)
- SSO integration (coming Q4 2026)

## Documentation 📚

- [API Client Guide](./API_CLIENT_GUIDE.md)
- [Customer Onboarding](./CUSTOMER_ONBOARDING_GUIDE.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)

## Rollout

- Timeline: 7/15/2026 2:00 PM UTC
- Downtime: 0 minutes (zero-downtime deployment)
- Rollback plan: Available in Vercel dashboard

Deployed by: Governor (Claude AI)
```

### Notification Channels

**Before Deployment (4 hours):**

Slack #announcements:

```
🚀 NewsPulse AI v1.0.0 deploying today at 2:00 PM UTC
Features: Workspace management, team members, assessments
Expected downtime: 0 minutes
Release notes: [link]
```

**After Deployment (15 minutes):**

Slack #announcements:

```
✅ NewsPulse AI v1.0.0 deployed successfully!
Health: ✅ All systems green
API: ✅ Response time < 1s
DB: ✅ Connection pool healthy
Start testing: [link to dashboard]
```

**If Rollback Needed:**

Slack #alerts:

```
🔄 Rolling back NewsPulse AI due to [reason]
Rollback commit: [sha]
Expected recovery: 2 minutes
Status page: [link]
```

---

## Part 8: Common Issues & Solutions

### Issue: Build Fails with TypeScript Error

**Error Message:**

```
error TS2339: Property 'X' does not exist
```

**Solution:**

1. Fix TypeScript error locally: `npm run type-check`
2. Commit fix: `git add . && git commit -m "fix: [error]"`
3. Push to main: `git push origin main`
4. Vercel will auto-redeploy

### Issue: Health Check Returns 503

**Error:** `"database": "degraded"`

**Solution:**

1. Check Supabase console for connection issues
2. Verify SUPABASE_URL and keys are correct
3. Restart Vercel deployment: Go to Vercel → Deployments → Redeploy
4. If persists, rollback

### Issue: Database Migration Failed

**Error:** `Migration 20260715_xxx.sql failed`

**Solution:**

1. Check Supabase dashboard for error details
2. Revert migration: Delete migration file, reset DB
3. Fix SQL syntax and try again
4. Test in staging first before production retry

### Issue: Performance Degradation

**Symptom:** Response times increase after deployment

**Solution:**

1. Check database connection pool: Supabase console
2. Check query performance: Supabase monitoring
3. Check for new N+1 queries in code
4. Rollback if no obvious cause
5. Investigate with team

---

## Part 9: Success Criteria

Deployment is successful when:

- ✅ Vercel build completes without errors (< 3 min)
- ✅ Health check returns 200 OK
- ✅ All 514 tests still passing in CI
- ✅ Zero errors in Sentry for first 10 minutes
- ✅ API response time P95 < 1 second
- ✅ Database healthy (no connection pool issues)
- ✅ No customer-reported issues in first 24 hours
- ✅ Web Vitals maintained (LCP, CLS, FCP good)

---

## Part 10: Post-Deployment Tasks

### Immediate (Same day)

- [ ] Monitor deployment for 2 hours
- [ ] Run smoke tests from Part 4
- [ ] Check error tracking (Sentry) for patterns
- [ ] Respond to any customer issues

### Next Day

- [ ] Review SLO metrics (availability, response time, errors)
- [ ] Check database growth and performance
- [ ] Analyze user adoption (dashboard usage, feature adoption)
- [ ] Document any issues found and fixes applied

### Next Week

- [ ] Retrospective on deployment process
- [ ] Document any improvements for next deployment
- [ ] Plan Q4 2026 features
- [ ] Gather customer feedback

---

## Emergency Contacts

**On-Call Engineer:**

- Name: [TBD]
- Phone: [TBD]
- Email: [TBD]

**Escalation:**

- Lead: [TBD]
- CTO: [TBD]

**External Contacts:**

- Vercel Support: https://vercel.com/help
- Supabase Support: https://supabase.com/support

---

## Quick Reference

**Useful Links:**

- Vercel Dashboard: https://vercel.com/dashboard/newspulse-ai
- Supabase Console: https://app.supabase.com
- Sentry Dashboard: https://sentry.io
- GitHub Repository: https://github.com/mininglife7-dev/newspulse-ai
- Production URL: https://newspulse-ai.vercel.app

**Commands:**

```bash
# Test locally
npm run test

# Type check
npm run type-check

# Build
npm run build

# Verify deployment
curl https://newspulse-ai.vercel.app/api/health
```

---

**Version:** 1.0 | **Last Updated:** July 15, 2026 | **Status:** Ready for Use

For questions or issues, reach out to on-call engineer or team lead.

**Next deployment:** Target date to be announced.
