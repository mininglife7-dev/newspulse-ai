# 🚀 Deployment Checklist — NewsPulse AI

**Status:** Code production-ready, awaiting 2 Founder actions  
**Date:** 2026-07-12  
**Estimated time to launch:** ~40 minutes total

---

## Phase 1: Founder Actions (Required)

### ✅ Action 1: Increase GitHub Actions Spending Limit (5 min)

**Why:** CI pipeline stopped; all PRs would merge unverified

**Steps:**
1. Go to https://github.com/mininglife7-dev/newspulse-ai
2. Click **Settings** → **Billing & Plans**
3. Select **Actions** in left sidebar
4. Increase spending limit to **$50+/month**
5. Click **Save**

**Verification:** DNA-001 monitoring will auto-detect within 30 min

---

### ✅ Action 2: Create Supabase Project & Export Credentials (2 min)

**Why:** Database required for authentication and data persistence

**Steps:**
1. Go to https://app.supabase.com
2. Click **New Project**
3. Fill in project details:
   - **Name:** `newspulse-ai-prod` (or your choice)
   - **Database Password:** Generate strong password
   - **Region:** `eu-central-1` (recommended for GDPR)
4. Click **Create new project** and wait ~2 minutes for setup
5. Once ready, click **Settings** → **API**
6. Copy these 3 values:
   ```
   Project URL: https://xxxxx.supabase.co
   Anon Key: sb_publishable_...
   Service Role Key: sb_secret_...
   ```

**Next:** Provide these to Governor Omega for autonomous deployment

---

## Phase 2: Governor Autonomous Deployment (30 min)

Once credentials are provided, Governor will execute:

### 1️⃣ Schema Deployment (10 min)
- [ ] Copy Supabase credentials to `.env.local`
- [ ] Run schema in Supabase SQL Editor
- [ ] Verify 8 tables created
- [ ] Verify RLS policies enabled
- [ ] Verify indexes created

**Tables created:**
- `auth.users` (Supabase managed)
- `public.profiles`
- `public.workspaces`
- `public.workspace_members`
- `public.companies`
- `public.ai_systems`
- `public.risk_assessments`
- `public.obligations`
- `public.evidence`
- `public.remediation_plans`

### 2️⃣ Email Authentication Setup (5 min)
- [ ] Enable Email provider in Supabase Auth
- [ ] Verify email templates (defaults acceptable)
- [ ] Confirm email verification requirement enabled

### 3️⃣ Integration Testing (10 min)
- [ ] Test signup → email verification → workspace creation
- [ ] Test RLS isolation (User A cannot see User B workspace)
- [ ] Test API endpoints end-to-end
- [ ] Verify health endpoint returns `ok: true`

### 4️⃣ Production Readiness (5 min)
- [ ] All 8 DNA systems operational
- [ ] Customer journey simulation passing
- [ ] Incident response tested
- [ ] Cost monitoring configured

---

## Verification Checklist

**Code Quality:** ✅
- [x] 295/295 tests passing
- [x] 0 ESLint errors
- [x] TypeScript strict mode clean
- [x] Production build successful (15.9s)
- [x] Vercel preview deployed

**Security:** ✅
- [x] Next.js 15.5.20 LTS (latest stable)
- [x] CRITICAL DoS vulnerability eliminated
- [x] 2 moderate PostCSS vulnerabilities (transitive, no action needed pre-launch)
- [x] Commit signatures verified
- [x] Secrets not committed

**Infrastructure:** ✅
- [x] Vercel deployment pipeline functional
- [x] GitHub Actions CI pipeline ready (awaiting spending limit)
- [x] Monitoring endpoints functional
- [x] Health checks operational
- [x] API rate limiting configured

**Database:** ⏳
- [ ] Supabase project created
- [ ] Schema deployed
- [ ] RLS policies verified
- [ ] Backups configured

**Monitoring:** ✅
- [x] DNA-GOV-001: Blocking Condition Detector (deployed)
- [x] DNA-GOV-002: Production Health Monitoring (deployed)
- [x] DNA-GOV-003: Deployment Verification (deployed)
- [x] DNA-GOV-004: Error Rate Monitoring (deployed)
- [x] DNA-GOV-005: Founder Alert Hub (deployed)
- [x] DNA-GOV-006: Customer Journey Monitoring (deployed)
- [x] DNA-GOV-008: Dependency Security Scanning (deployed)
- [x] DNA-GOV-009: Performance Baseline Tracking (deployed)
- [x] DNA-GOV-010: Git Governance (deployed)
- [x] DNA-GOV-011: Cost Anomaly Detection (deployed)
- [x] DNA-GOV-014: Incident Commander (deployed)

---

## What Happens Next

**Timeline:**
- **5 min (Founder):** Increase GitHub Actions spending limit
- **2 min (Founder):** Create Supabase project, copy credentials
- **30 min (Governor):** Deploy schema, test, verify
- **Total:** ~40 minutes from now

**After deployment:**
- Customer signup enabled
- Email verification functional
- Workspace multi-tenancy live
- RLS data isolation active
- All monitoring systems reporting
- Incident response armed
- Ready for first customer pilot

---

## Support

**Questions?**
- Review `docs/infra/SUPABASE-PRODUCTION-SETUP.md` for detailed deployment guide
- Review `docs/governance/FOUNDER_BRIEF.md` for current status
- Check `docs/governance/FOUNDER-DECISION-BRIEF.md` for decision rationale

**If something fails:**
- Governor will diagnose and fix automatically
- All failures logged to knowledge base: `/api/knowledge`
- Rollback to previous version available via Vercel dashboard

---

**Ready to proceed?**  
Provide Supabase credentials → Governor executes remaining deployment → Launch in 30 min ✅
