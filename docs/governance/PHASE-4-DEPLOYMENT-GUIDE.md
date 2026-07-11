# Phase 4 Deployment Guide — Infrastructure Setup & Execution

**Status:** Vercel deployment blocked pending investigation; parallel infrastructure setup ready for immediate execution.

**Timeline:** 
- Vercel Pro upgrade: ✅ Completed (2026-07-10 19:06 UTC)
- Deployment attempts: 14 (Hobby: 1-13 failed, Pro: #14 failed after 52 sec)
- Root cause: Under investigation (likely not resource-limited)

---

## Executive Summary

**What's Ready:**
- Phase 4 code: ✅ Complete (641/641 tests passing, production-ready)
- Database schema: ✅ Ready to deploy
- Email auth: ✅ Ready to enable
- GitHub Actions: ✅ Ready to verify

**What's Blocked:**
- Vercel deployment: 🔴 Requires root cause investigation + Vercel support engagement

**Recommended Path Forward:**
1. **Immediately:** Deploy Supabase schema + enable email auth (5 min tasks, no dependencies)
2. **Simultaneously:** Engage Vercel support with deployment logs
3. **Once Vercel resolved:** Push code to production and run end-to-end tests

---

## Task 1: Deploy Supabase Schema (5 minutes)

### Step 1.1: Access Supabase SQL Editor
1. Go to https://supabase.com
2. Sign in to your Supabase project (same one hosting your existing compliance data)
3. Navigate: **SQL Editor** (left sidebar)

### Step 1.2: Create Migration
1. Click **+ New Query**
2. Name it: `20260710-phase-4-schema` (uses date format for versioning)
3. Paste entire contents of `/supabase/phase-4-schema.sql`

### Step 1.3: Execute Schema
1. Click **Run** (green button, top right)
2. Wait for completion (typically <30 seconds)

**Expected Output:**
```
Execution complete
11 tables created
14 indexes created
RLS policies applied
0 errors
```

### Step 1.4: Verify Tables Created
In Supabase dashboard, navigate to **Table Editor** and verify:
- ✓ `product_events`
- ✓ `product_event_aggregates`
- ✓ `observability_alerts`
- ✓ `onboarding_progress`
- ✓ `email_campaigns`
- ✓ `compliance_templates`
- ✓ `template_versions`
- ✓ `automation_rules`
- ✓ `automation_executions`
- ✓ `workspace_members`
- ✓ `workspace_audit_log`

All tables should show "RLS enabled" in the table settings.

---

## Task 2: Enable Email Authentication (3 minutes)

### Step 2.1: Access Supabase Auth Settings
1. In Supabase dashboard, navigate: **Authentication** → **Providers** (left sidebar)
2. Click **Email** provider

### Step 2.2: Enable Email Auth
1. Toggle **Enable Email** to ON
2. Under "Redirect URLs", add your production domain:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
3. Click **Save**

### Step 2.3: Configure Email Service (Optional but recommended)
1. Navigate: **Authentication** → **Email Templates**
2. Verify default templates are present:
   - Confirmation email
   - Password reset email
   - Magic link email
3. (Optional) Customize templates if needed

**Note:** Supabase provides free email sending for up to 50 recipients/day. For production, configure external email service (SendGrid, Postmark, Mailgun) in **Email** provider settings.

---

## Task 3: Verify GitHub Actions Billing (2 minutes)

### Step 3.1: Access GitHub Billing
1. Go to https://github.com/mininglife7-dev
2. Click **Settings** (top right avatar menu)
3. Navigate: **Billing and plans** (left sidebar)

### Step 3.2: Check Actions Spending
1. Click **Spending limits** under "GitHub Actions"
2. Verify:
   - Spending limit is enabled (recommended: $10-50/month for CI)
   - Current usage is reasonable
3. Take note of usage and remaining balance

**Expected Action:** If spending is high or limit seems low, adjust:
- Recommended limit for small projects: $50/month
- For this project with frequent CI runs: $20-30/month

---

## Task 4: Monitor Vercel Deployment Issue

### Step 4.1: Gather Diagnostic Information
While Vercel support investigates, collect:

1. **Deployment Log ID:** `dpl_6Y5nZ44dKCY7MrjLuzLkfqQFwCLB`
2. **Vercel Dashboard:** https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
3. **Build Environment:**
   - Node version: Check Vercel settings (should be 18.x or 20.x)
   - Build command: `npm run build`
   - Install command: `npm install`

### Step 4.2: Engage Vercel Support
1. Go to Vercel dashboard
2. Click **Support** (? icon, bottom left)
3. Select **Contact support**
4. Provide:
   - Deployment ID: `dpl_6Y5nZ44dKCY7MrjLuzLkfqQFwCLB`
   - Context: "14 consecutive deployment failures since 2026-07-10 19:03 UTC. Upgraded to Pro plan; failure pattern changed (now 52 sec vs 1-3 min before), suggesting not resource-limited."
   - Request: "Full build log and root cause analysis"

### Step 4.3: Alternative Investigation (if needed)
If you have Vercel CLI installed locally:
```bash
npx vercel inspect dpl_6Y5nZ44dKCY7MrjLuzLkfqQFwCLB --logs
```

This outputs the full build log which may reveal the actual error.

---

## Task 5: Prepare for Production Deployment (After Vercel Fixed)

Once Vercel deployment succeeds and Supabase schema is deployed, follow this checklist:

### Environment Variables
Verify these are configured in Vercel:
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key
- `FIRECRAWL_API_KEY` — Firecrawl API key
- `OPENAI_API_KEY` — OpenAI API key

Check in Vercel: **Settings** → **Environment Variables**

### Database Migrations
1. Verify Supabase schema deployed (Task 1)
2. All 11 tables present and RLS-enabled
3. Indexes created and active

### Email Service
1. Email auth enabled in Supabase (Task 2)
2. Test email sending:
   - Create test user via Supabase dashboard
   - Verify confirmation email arrives
   - (Optional) Configure production email service if not using Supabase defaults

### API Endpoints
After deployment, test these endpoints:
```bash
# Telemetry/Analytics
curl -X POST https://yourdomain.com/api/telemetry/event \
  -H "Content-Type: application/json" \
  -d '{"event_type":"page_load","category":"performance"}'

# Onboarding
curl -X POST https://yourdomain.com/api/onboarding/progress \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"...","step":"welcome"}'

# Team Collaboration
curl -X GET https://yourdomain.com/api/workspace/members
```

### End-to-End Testing
1. Sign up with new email
2. Complete onboarding flow (5 steps)
3. Create first assessment
4. Generate compliance report
5. Invite team member (if available)

---

## Deployment Order (Recommended)

### **Parallel Track 1: Infrastructure** (5 min, no dependencies)
1. ✅ Deploy Supabase schema (Task 1)
2. ✅ Enable email auth (Task 2)
3. ✅ Verify GitHub Actions billing (Task 3)

### **Parallel Track 2: Vercel Investigation** (ongoing)
1. Engage Vercel support with logs (Task 4)
2. Monitor for resolution
3. Re-deploy when root cause fixed

### **Sequential After Vercel:**
1. Confirm Vercel deployment succeeds
2. Verify environment variables in Vercel
3. Run end-to-end tests
4. Monitor production telemetry
5. Test compliance reports
6. Test team collaboration

---

## Success Criteria

### Infrastructure Setup Complete When:
- ✅ Supabase: All 11 Phase 4 tables present, RLS enabled
- ✅ Email: Authentication enabled, test email confirms delivery
- ✅ GitHub Actions: Spending limit verified and reasonable

### Production Deployment Complete When:
- ✅ Vercel: Deployment succeeds to production
- ✅ Code: Phase 4 DNA systems (GOV-014-017) live and responding
- ✅ Database: Schema deployed and accessible
- ✅ Email: Signup flow sends confirmation emails
- ✅ Tests: End-to-end onboarding flow succeeds
- ✅ Telemetry: Events recorded in product_events table

---

## Rollback Instructions (if needed)

If Vercel deployment fails again:

1. **Revert code deployment** — GitHub will show rollback option in Vercel dashboard
2. **Keep Supabase schema** — Tables are backward-compatible with existing code
3. **Investigate further** — Work with Vercel support on root cause

---

## Contact & Support

**For questions on this guide:**
- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- This project: `/home/user/newspulse-ai` (local development)

**For emergency issues:**
- Phase 4 architecture: `docs/phase-4/PHASE-4-ARCHITECTURE-PLAN.md`
- Checkpoint status: `docs/governance/CHECKPOINT-2026-07-10-PHASE-4-PREPARATION.md`
- Previous blockers: `docs/governance/DNA-GOV-012-DEPLOYMENT-RECOVERY.md`

---

**Generated:** 2026-07-10 19:10 UTC  
**Branch:** `claude/governor-evolution-charter-xac47i`  
**Status:** Ready for parallel execution
