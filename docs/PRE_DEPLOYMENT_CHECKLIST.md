# NewsPulse AI — Pre-Deployment Checklist

**Status:** Production-Ready Template  
**Created:** 2026-07-16  
**Purpose:** Final verification before staging and production deployment  
**Owner:** Executive Governor

---

## Overview

This checklist ensures every deployment is intentional, safe, and well-documented. Complete this checklist 24 hours before deployment, then again at deployment time.

**Timeline:**

- **24 hours before:** Technical readiness checks
- **1 hour before:** Final verification and team notification
- **During deployment:** Follow deployment runbook step-by-step
- **After deployment:** 24-hour monitoring checklist

---

## Part 1: Technical Readiness (24 Hours Before)

### Code Quality & Testing

```
Functional Requirements:
  ☐ All PR reviews completed and approved
  ☐ All commits are on main branch
  ☐ No uncommitted changes (git status clean)
  ☐ All commits are pushed to origin (git push current)

Code Quality:
  ☐ Run: npm run type-check (no TypeScript errors)
  ☐ Run: npm run lint (no linting errors)
  ☐ Run: npm test (all tests passing)
  ☐ Run: npm run build (production build succeeds)

Test Coverage:
  ☐ All unit tests passing (npm test shows green)
  ☐ Integration tests prepared (awaiting credentials)
  ☐ No test regressions from recent changes
  ☐ Critical path tests added for recent features
```

### Security Verification

```
Secrets & Credentials:
  ☐ No API keys in source code
  ☐ No database passwords in git history
  ☐ No OAuth tokens in commits
  ☐ .env.example has placeholders only (no real values)
  ☐ Verify: grep -r "API_KEY\|TOKEN\|SECRET" app/ lib/ (expect no matches)

Environment Variables:
  ☐ All required variables documented in .env.example
  ☐ No hardcoded values for different environments
  ☐ Secrets ready in secure storage (GitHub, Vercel, 1Password)
  ☐ Plan for rotating secrets post-deployment

Access Control:
  ☐ Database Row Level Security (RLS) policies reviewed
  ☐ API authentication enforced on all protected routes
  ☐ Authorization checks verified (owner/admin/member roles)
  ☐ No security vulnerabilities in OWASP Top 10
```

### Database Readiness

```
Migrations:
  ☐ All migrations are idempotent (can run multiple times safely)
  ☐ Backup plan exists if migration fails
  ☐ Rollback procedure tested (can revert schema)
  ☐ No breaking changes to existing data

Schema:
  ☐ Database indexes exist on frequently-queried columns
  ☐ Foreign key constraints properly defined
  ☐ RLS policies reviewed for tenant isolation
  ☐ Backup strategy confirmed with database provider
```

### Monitoring & Observability

```
Health Checks:
  ☐ /api/health endpoint returns 200 (database + app healthy)
  ☐ /api/production-health endpoint configured
  ☐ Health check tests passing
  ☐ Error tracking (Sentry) configured

Alerts:
  ☐ Uptime monitoring configured (UptimeRobot or similar)
  ☐ Sentry error alerts configured
  ☐ Slack notification channels created (#production-alerts)
  ☐ Alert thresholds reviewed and reasonable
  ☐ On-call contact list updated

Documentation:
  ☐ Deployment runbook reviewed (docs/DEPLOYMENT_RUNBOOK.md)
  ☐ Disaster recovery runbook reviewed (docs/DISASTER_RECOVERY_RUNBOOK.md)
  ☐ Incident response playbooks reviewed (docs/INCIDENT_RESPONSE_PLAYBOOKS.md)
  ☐ Monitoring alert configuration reviewed (docs/MONITORING_ALERT_CONFIGURATION.md)
  ☐ Post-deployment checklist prepared
```

---

## Part 2: Pre-Deployment Preparation (24 Hours Before)

### Communications

```
Team Notification:
  ☐ Notify team on Slack: "Deploying [app] at [TIME] on [DATE]"
  ☐ Mention expected downtime (if any)
  ☐ Provide rollback plan if things go wrong
  ☐ Share deployment runbook link

Customer Communication:
  ☐ If customer-facing: Notify customers of maintenance window
  ☐ If SaaS: Post status update (StatusPage.io)
  ☐ Include: What's changing, expected downtime, benefits

Support Team:
  ☐ Notify support: Prepare for customer issues
  ☐ Provide troubleshooting guide for new features
  ☐ Share incident response contacts
```

### Environment Setup

```
Staging Deployment:
  ☐ Deploy to staging (parallel Supabase + Vercel)
  ☐ Run integration tests against staging
  ☐ Smoke test critical workflows:
    - User signup flow
    - Assessment CRUD operations
    - Team member invitation
    - Data export/reporting
  ☐ Verify no errors in Sentry

Production Configuration:
  ☐ Vercel environment variables staged (ready to deploy)
  ☐ Supabase service role key secure
  ☐ GitHub Secrets configured
  ☐ External API keys (Stripe, SendGrid) verified
  ☐ DNS/domain configuration correct
```

### Backup & Rollback Planning

```
Backups:
  ☐ Database backup exists (Supabase auto-backup)
  ☐ Backup is verified recoverable (tested recently)
  ☐ Backup retention policy: 30+ days
  ☐ Restore procedure documented and tested

Rollback:
  ☐ Previous "known good" deployment identified
  ☐ Rollback procedure tested manually
  ☐ Can rollback within 5 minutes if needed
  ☐ Rollback doesn't require code changes (via Vercel dashboard)
```

---

## Part 3: Final Verification (1 Hour Before Deployment)

### Code & Configuration

```
Final Checks:
  ☐ git log main -1 (verify latest commit is what we want)
  ☐ git status (must be clean, nothing uncommitted)
  ☐ Vercel preview deployment: working ✓
  ☐ No recent commits introduced errors

Environment Variables:
  ☐ Vercel Settings → Environment Variables
  ☐ All required variables present: NEXT_PUBLIC_*, SUPABASE_*
  ☐ No test/development values in production config
  ☐ API keys are real and current (not rotated recently)
```

### System Health

```
Pre-Deployment System Status:
  ☐ Current production is healthy:
    - curl /api/health → 200 OK
    - No active incidents or alerts
    - Error rate < 0.5%
    - Response times normal (P95 < 2s)
  ☐ External services healthy:
    - Supabase status: green
    - GitHub status: green
    - Vercel status: green
  ☐ No scheduled maintenance windows colliding with deployment
```

### Team Readiness

```
Who's Involved:
  ☐ Deployment owner identified (who's running the deployment)
  ☐ On-call engineer available (for issues)
  ☐ Team in #production-alerts Slack channel
  ☐ Support team on standby

Final Sign-Off:
  ☐ Founder/Product Lead: Approved ✓
  ☐ Tech Lead: Verified all checks pass ✓
  ☐ QA: Staging tests pass ✓
  ☐ Timeline: Everyone agrees go/no-go decision
```

---

## Part 4: Deployment Execution Checklist

Follow this exactly as written. Don't skip steps.

```
Time T-5min (Final Pause):
  ☐ Everyone ready? (Slack: "Deploying in 5 minutes")
  ☐ No emergency changes? (Wait if yes)
  ☐ External services healthy? (Verify one more time)

Time T-0 (Deploy):
  ☐ git branch → verify main
  ☐ git log -1 → verify deployment commit
  ☐ Option A: Vercel auto-deployment (just merged to main, monitor)
  ☐ Option B: Manual → Vercel Dashboard → Promote to Production
  ☐ Slack: "Deployment started at [TIME]"

During Deployment (2-3 minutes):
  ☐ Watch Vercel build progress
  ☐ Monitor build logs for errors
  ☐ If build fails: Investigate, fix, re-push (see runbook)

After Deployment (5 minutes):
  ☐ Vercel shows "Ready" ✓
  ☐ curl /api/health → 200 OK (app responding)
  ☐ Slack: "Deployment complete, beginning verification"

Verification (5-10 minutes):
  ☐ Run smoke tests (see Part 4 in DEPLOYMENT_RUNBOOK.md)
  ☐ Check Sentry for new errors (should be none)
  ☐ Verify critical workflows work
  ☐ Slack: "Deployment verified ✓" or "Issues found, investigating"
```

---

## Part 5: Post-Deployment (First 24 Hours)

### Immediate Monitoring (First Hour)

```
Every 15 minutes for first 60 minutes:
  ☐ Health check: curl /api/health (expect 200)
  ☐ Error rate: Check Sentry (expect 0-0.5% normal)
  ☐ Slack: Check #production-alerts for automated alerts
  ☐ Support team: Any customer reports of issues?

If issues detected:
  ☐ Severity CRITICAL? → Rollback immediately (5 min max)
  ☐ Severity HIGH? → Investigate 10 min, then rollback if unclear
  ☐ Severity MEDIUM? → Investigate 30 min, monitor closely
  ☐ Severity LOW? → Log for later, monitor

If rollback needed:
  → Follow Part 5 of DEPLOYMENT_RUNBOOK.md (< 2 min)
  → Slack: "Rolled back to [previous-commit]"
  → Document reason for rollback
```

### Extended Monitoring (First 24 Hours)

```
Hourly Checks (First 4 hours):
  ☐ Error rate trending (should be stable, low)
  ☐ Response times stable (P95 < 2s)
  ☐ Database connection pool healthy (< 10 active)
  ☐ No cascading failures detected

End of Day Checks:
  ☐ Error rate for entire day < 0.5%?
  ☐ No performance degradation observed?
  ☐ Zero critical or high-severity issues?
  ☐ Customer feedback: Any issues reported?

Before Bed (Day 1):
  ☐ One final health check
  ☐ Verify monitoring alerts are working
  ☐ Escalate any issues to on-call engineer
```

### Post-Deployment Documentation (Day 1)

```
Deployment Record:
  ☐ Document deployment time
  ☐ Document deployment commit(s)
  ☐ Document any issues encountered
  ☐ Document rollbacks if any
  ☐ Document notable metrics (errors, latency)

Learning & Improvement:
  ☐ Any issues that were caught? Update runbooks
  ☐ Any manual steps that could be automated? File task
  ☐ Any monitoring gaps discovered? Add alerts
  ☐ Post-mortem if anything significant went wrong
```

---

## Part 6: Disaster Response

### If Something Goes Wrong During Deployment

**Critical Issue (Can't Access App):**

```
1. Immediately: Slack #production-alerts "CRITICAL: [issue]"
2. Within 2 min: Follow DISASTER_RECOVERY_RUNBOOK.md "Part 2: Immediate Response"
3. Decide: Rollback or investigate?
4. If unsure: ROLLBACK first, debug later
5. Slack: Notify team of status/decision
```

**High Issue (Feature Broken, Some Users Affected):**

```
1. Slack #production-alerts "[ISSUE] affecting [feature]"
2. Investigate root cause (5 min)
3. Decide: Rollback, hot-fix, or wait?
4. If unsure: ROLLBACK
5. Post update to Slack
```

**Medium Issue (Non-Critical, Isolated):**

```
1. Log issue in Slack
2. Monitor (doesn't require immediate action)
3. Can fix in next deployment or as hot-fix
```

**See:** `docs/INCIDENT_RESPONSE_PLAYBOOKS.md` for detailed response procedures

---

## Part 7: Sign-Off & Documentation

### Deployment Sign-Off

Person executing deployment:

- Name: ________________
- Date: ________________
- Time: ________________
- Commit: ________________

Verification completed by:

- Name: ________________
- Status: ✓ PASS / ⚠ ISSUES / ✗ FAILED

---

## Quick Reference Links

### Documentation

- **Deployment Runbook:** docs/DEPLOYMENT_RUNBOOK.md
- **Disaster Recovery:** docs/DISASTER_RECOVERY_RUNBOOK.md
- **Incident Response:** docs/INCIDENT_RESPONSE_PLAYBOOKS.md
- **Monitoring Setup:** docs/MONITORING_ALERT_CONFIGURATION.md
- **Production Monitoring:** docs/PRODUCTION_MONITORING_SETUP.md

### Tools & Dashboards

- **Vercel Dashboard:** https://vercel.com/dashboard/newspulse-ai
- **Supabase Console:** https://app.supabase.com/
- **Sentry Dashboard:** https://sentry.io/organizations/newspulse-ai/
- **Health Check:** https://newspulse-ai.vercel.app/api/health
- **Production Health:** https://newspulse-ai.vercel.app/api/production-health

### Validation

- **Production Readiness Script:** ./scripts/validate-production-readiness.sh
- **Health Check Tests:** tests/api-health.test.ts
- **Production Monitoring Tests:** tests/production-monitoring.test.ts

---

## Critical Decisions

### Go/No-Go Decision Framework

Before final sign-off, answer these questions:

**GO if:**

- ✅ All code quality checks pass (type-check, lint)
- ✅ All tests pass (unit, integration on staging)
- ✅ No known security vulnerabilities
- ✅ Database schema safe and reversible
- ✅ Monitoring alerts configured and working
- ✅ Rollback procedure tested and works
- ✅ Team is available and on standby
- ✅ No external dependencies broken/upgrading

**NO-GO if:**

- ❌ Any critical test failing
- ❌ Known security vulnerability unfixed
- ❌ Database migration irreversible
- ❌ Monitoring not working
- ❌ Rollback procedure untested
- ❌ Team unavailable or distracted
- ❌ External service maintenance window
- ❌ Recent hotfixes not integrated into main

---

## Templates

### Pre-Deployment Announcement

```
🚀 DEPLOYMENT NOTICE

App: NewsPulse AI (EURO AI)
Time: [DATE] at [TIME] UTC
Duration: ~5-10 minutes
Status: Staging → Production

What's changing:
- [Feature 1]
- [Bug fix 1]
- [Improvement 1]

Expected impact:
- Users will see [new feature]
- [Workflow] will be faster
- [Issue] will be fixed

Need help? Slack @[support-contact]
```

### Post-Deployment Summary

```
✅ DEPLOYMENT COMPLETE

Time: [Start] → [End] (Duration: X minutes)
Commit: [abc1234]
Version: [X.Y.Z]

Changes deployed:
- [List features/fixes]

Performance:
- Error rate: 0.1% (✓ normal)
- Response time P95: 250ms (✓ normal)
- Zero critical issues detected

Next steps:
- Monitor for 24 hours
- Rollback available if needed
- Feedback: #product-feedback
```

---

## Approval Sign-Off

Before deployment, obtain explicit approval:

**Product/Founder:**

- ☐ Approved deployment
- ☐ Agrees with timeline
- ☐ Ready to support if issues arise

**Engineering:**

- ☐ All code quality checks pass
- ☐ Tests verified passing
- ☐ Security review complete
- ☐ Deployment plan is sound

**Operations/Support:**

- ☐ Monitoring is ready
- ☐ Alerts configured
- ☐ Team on standby
- ☐ Communication plan ready

---

**Use this checklist for every deployment. Every step exists because of a lesson learned.**

**When in doubt, ask yourself: "What could go wrong?" If you can't answer that quickly, don't deploy.**

**Safe deployments are fast deployments because they need fewer rollbacks.**

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Next Review:** After first production deployment
