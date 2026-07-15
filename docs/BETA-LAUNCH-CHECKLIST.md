# Beta Launch Checklist — EURO AI

**Status:** Ready for first customer  
**Date:** 2026-07-15  
**Timeline:** 30 minutes to launch

---

## Pre-Launch (Read These First)

Before executing infrastructure actions, read these documents **in this order**:

1. **docs/DEPLOYMENT-SIMULATION-GUIDE.md** ← START HERE
   - Exact step-by-step walkthrough of 5 infrastructure actions
   - Each action takes 5-10 minutes
   - Includes verification checkpoints at each step

2. **docs/BETA-FIRST-24-HOURS.md** ← Read while waiting for deployments
   - How to monitor first customer signup
   - What to watch in real-time
   - Emergency procedures if something breaks

3. **docs/DISASTER-RECOVERY-PROCEDURES.md** ← Reference only if needed
   - What to do if database gets corrupted
   - How to restore from backup
   - Rollback procedures

---

## The 5 Critical Actions (30 minutes total)

Execute these in order. Don't skip any.

### ☐ Action 1: GitHub Actions Spending Limit (5 min)
- **Go to:** https://github.com/mininglife7-dev/newspulse-ai/settings/billing/actions
- **Set limit to:** $50
- **Verify:** Recent workflow runs show green checkmarks (✅)
- **See:** DEPLOYMENT-SIMULATION-GUIDE.md → ACTION 1

### ☐ Action 2: Deploy Supabase Schema (10 min)
- **Go to:** https://app.supabase.com → SQL Editor
- **Paste:** Contents of `supabase/schema.sql`
- **Click:** Run (or Ctrl+Enter)
- **Verify:** 5 tables exist in Table Editor (workspaces, profiles, news_searches, companies, workspace_members)
- **See:** DEPLOYMENT-SIMULATION-GUIDE.md → ACTION 2

### ☐ Action 3: GitHub Secrets (5 min)
- **Get tokens:** Vercel account → Settings → Tokens
- **Get IDs:** Vercel → Project → Settings → Team ID, Project ID
- **Add 3 secrets:**
  - VERCEL_TOKEN = [token from step 1]
  - VERCEL_ORG_ID = [Team ID]
  - VERCEL_PROJECT_ID = [Project ID]
- **Verify:** 3 secrets listed in GitHub Settings → Secrets
- **See:** DEPLOYMENT-SIMULATION-GUIDE.md → ACTION 3

### ☐ Action 4: Vercel Environment Variables (5 min)
- **Get 5 keys:**
  - FIRECRAWL_API_KEY (from firecrawl.dev)
  - OPENAI_API_KEY (from platform.openai.com)
  - NEXT_PUBLIC_SUPABASE_URL (from supabase.com → Settings → API)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (from same location)
  - SUPABASE_SERVICE_ROLE_KEY (from same location)
- **Add to Vercel:** Settings → Environment Variables
- **Set scope:** Production
- **Trigger redeploy:** Push empty commit or click "Promote to Production"
- **Verify:** 5 variables listed in Vercel dashboard
- **See:** DEPLOYMENT-SIMULATION-GUIDE.md → ACTION 4

### ☐ Action 5: Production Smoke Test (5 min)
- **Health check:** https://newspulse-ai.vercel.app/api/health → should show `healthy: true`
- **Test signup:** 
  - Go to https://newspulse-ai.vercel.app
  - Click "Sign Up"
  - Email: testpilot1@example.com
  - Password: TestPassword123!
- **Confirm email:** Check inbox for confirmation link, click it
- **Create workspace:** Fill form, click "Create Workspace"
- **Verify data:** Go to Supabase → SQL Editor, run: `SELECT * FROM workspaces WHERE name = 'Test Workspace';`
- **Result:** Should show 1 row with your test data
- **See:** DEPLOYMENT-SIMULATION-GUIDE.md → ACTION 5

---

## Verification After All 5 Actions

✅ All critical checks must pass before inviting customer:

```
☐ GitHub Actions limit increased to $50+ (check Actions tab)
☐ Supabase schema deployed (5 tables visible)
☐ GitHub secrets configured (3 secrets listed)
☐ Vercel env vars set (5 variables listed)
☐ Health endpoint returns healthy: true
☐ Signup flow works end-to-end
☐ Email confirmation delivered
☐ Workspace creation succeeds
☐ Data persists in Supabase database
```

**If any check fails:** See DEPLOYMENT-SIMULATION-GUIDE.md → Troubleshooting section

---

## During First 24 Hours

### Monitoring Checklist
Every 5 minutes for first hour:
```
☐ Customer still engaged
☐ API health endpoint returns 200
☐ Vercel deployment shows "Ready"
☐ Error logs are clean
☐ External APIs responding
```

Every 15 minutes for first 6 hours:
```
☐ Response time still <1 sec
☐ Supabase data persisting
☐ Costs tracking as expected
☐ No suspicious activity
```

### Critical Metrics to Watch
- **Signup latency:** Should be <5 sec (baseline: 1-3 sec)
- **Search latency:** Should be <10 sec (baseline: 4-6 sec)
- **Error rate:** Should be <1% (baseline: 0%)
- **Database queries:** Should be <500ms (baseline: <200ms)
- **Costs:** Should be <$10 for first day (budget: $50)

### If Something Breaks
1. **Check logs:** Vercel → Deployments → Latest → Logs
2. **See emergency guide:** docs/BETA-FIRST-24-HOURS.md → EMERGENCY RESPONSE PROCEDURES
3. **Common issues:** Table showing 7 failure scenarios + fixes

---

## Resources

| Document | Purpose | When to Read |
|----------|---------|---|
| **DEPLOYMENT-SIMULATION-GUIDE.md** | Step-by-step for 5 actions | Before starting (required) |
| **BETA-FIRST-24-HOURS.md** | Operations + emergencies | While waiting for deployments + during Day 1 |
| **BETA-PERFORMANCE-BASELINE.md** | Performance targets | If search is slow |
| **DISASTER-RECOVERY-PROCEDURES.md** | Backup/restore/rollback | If something breaks |
| **TEST-COVERAGE-SUMMARY.md** | What's verified | For confidence assessment |
| **API-REFERENCE.md** | API endpoints | If debugging API issues |
| **Pre-Launch Validation Script** | Automated checks | `bash scripts/pre-launch-validation.sh` |

---

## Contact & Support

**Status Pages:**
- Vercel: https://www.vercelstatus.com
- Supabase: https://status.supabase.com
- Firecrawl: https://status.firecrawl.dev
- OpenAI: https://status.openai.com

**Support:**
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- Emergency: See docs/BETA-FIRST-24-HOURS.md → ESCALATION PROCEDURES

---

## Timeline

```
07:00 — Start reading DEPLOYMENT-SIMULATION-GUIDE.md
07:15 — Action 1: GitHub Actions (5 min)
07:20 — Action 2: Supabase schema (10 min)
07:30 — Action 3: GitHub secrets (5 min)
07:35 — Action 4: Vercel env vars (5 min)
   [Wait 2-3 min for Vercel deployment]
07:40 — Action 5: Smoke test (5 min)
   [Verify email, create workspace, confirm data in Supabase]
07:45 — Pre-launch validation: bash scripts/pre-launch-validation.sh
07:50 — Ready to invite first customer 🚀
```

---

## Success Criteria

After first 24 hours, check:

| Metric | Target | Status |
|--------|--------|--------|
| Uptime | 100% | ☐ |
| Error rate | <1% | ☐ |
| Signup completion | 100% | ☐ |
| Search latency | <5 sec | ☐ |
| Customer satisfaction | Positive | ☐ |
| No escalations | Yes | ☐ |
| Costs within budget | <$10 | ☐ |

**If all green:** Proceed to Phase 2 ✅  
**If any red:** Hold Phase 2, investigate issue (see docs/BETA-FIRST-24-HOURS.md)

---

## System Status

✅ **Code:** 405/405 tests passing  
✅ **Build:** Succeeds (4.0 seconds)  
✅ **TypeScript:** Strict mode, zero errors  
✅ **ESLint:** Zero violations  
✅ **Security:** Hardened (RLS, injection prevention, secure cookies)  
✅ **Documentation:** 8 comprehensive guides  
✅ **Preview Deployment:** Ready  

🎯 **Recommendation:** PROCEED WITH CONDITIONS (Execute 5 infrastructure actions)

---

**Engineering Complete.** Founder: Execute 5 actions above, then invite first customer.

Good luck! 🚀

---

**Last Updated:** 2026-07-15  
**Next Review:** After Phase 1 (day 7)  
**Version:** 1.0
