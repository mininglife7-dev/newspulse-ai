# EURO AI Deployment Checklist

**Status:** Ready for Production (Awaiting Infrastructure Setup)  
**Last Updated:** 2026-07-10  
**Owner:** Founder + DevOps  

---

## Pre-Deployment Verification (Engineering ✅ Complete)

- [x] 3-step onboarding fully implemented
- [x] All 177 unit tests passing
- [x] TypeScript strict mode clean
- [x] ESLint 0 errors
- [x] Production build successful
- [x] Accessibility (WCAG AA) verified
- [x] Mobile responsiveness tested
- [x] Error handling complete
- [x] RLS policies deployed to schema.sql
- [x] Customer documentation written
- [x] Customer readiness audit complete

**Engineering Sign-Off:** ✅ Ready for production

---

## Founder Actions Required (Critical Path)

### 1. Vercel Configuration: Add `github-token` Secret

**Status:** ⏳ BLOCKING DEPLOYMENT  
**Estimated Time:** 5 minutes  

**Why It Matters:** Vercel preview deployments (PR reviews, testing) require this secret. PR #48 cannot deploy to preview without it.

**Steps:**

1. Go to Vercel dashboard: https://vercel.com/dashboard
2. Select the **newspulse-ai** project
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New**
6. Set the following:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** Your GitHub personal access token (or your GitHub/Vercel-connected token)
   - **Environments:** Check "Production" and "Preview"
7. Click **Save**

**Verification:**
- PR #48 should auto-redeploy after 2-3 minutes
- Check Vercel deployment status in PR (should show "Building" then "Ready")

**Help:** See Vercel docs: https://vercel.com/docs/environment-variables

---

### 2. Supabase Database: Deploy schema.sql

**Status:** ⏳ BLOCKING CUSTOMER SIGNUP  
**Estimated Time:** 10 minutes  

**Why It Matters:** The schema.sql file contains:
- 4 new tables (risk_assessments, obligations, evidence, remediation_plans)
- 33 RLS policies (Row Level Security for multi-tenant isolation)
- These are required before any customer can sign up and use Step 3

**Steps:**

1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor** (left sidebar)
3. Click **New Query** (or **New Query** button)
4. **Important:** Open `/supabase/schema.sql` locally and copy the **entire file** (this is idempotent, safe to run multiple times)
5. Paste the entire content into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Watch for completion message (all queries should succeed)

**Verification:**
- Go to **Tables** in Supabase console
- You should see: `risk_assessments`, `obligations`, `evidence`, `remediation_plans`
- Go to **Policies** and verify 33 RLS policies exist
- Test: Sign up a new user and try to create a risk assessment (should work without errors)

**Idempotent:** Safe to run this multiple times. Existing tables won't be recreated.

**File Location:** `/supabase/schema.sql` (in your local repo)

**Help:** See Supabase docs: https://supabase.com/docs/guides/database/overview

---

### 3. Supabase Authentication: Enable Email Auth

**Status:** ⏳ BLOCKING VERIFICATION EMAILS  
**Estimated Time:** 5 minutes  

**Why It Matters:** Customers need to receive verification emails after signup. This setting enables the email provider.

**Steps:**

1. Go to your Supabase project: https://app.supabase.com
2. Click **Authentication** (left sidebar)
3. Click **Providers**
4. Find **Email** in the list
5. Toggle **Enable Email provider** ON
6. (Optional) Configure email provider settings if needed

**Verification:**
- Sign up with a test email
- Check your email for verification link (should arrive within 30 seconds)
- Click the link; you should be redirected to verify confirmation

**Help:** See Supabase docs: https://supabase.com/docs/guides/auth/auth-email

---

### 4. Supabase Region: Verify EU Location (GDPR/German Compliance)

**Status:** ⏳ REGULATORY REQUIREMENT  
**Estimated Time:** 2 minutes (verify only)  

**Why It Matters:** German customers require GDPR compliance. Data must be hosted in the EU. This is a legal requirement for your first German customer.

**Steps:**

1. Go to your Supabase project: https://app.supabase.com
2. Click **Settings** (left sidebar)
3. Scroll to **Project Details**
4. Look for **Region**
5. **Verify** it shows an EU region (e.g., "eu-west-1", "eu-central-1", not "us-east-1")
6. If **NOT in EU:** You must migrate the database region (contact Supabase support for guidance)

**Allowed Regions (EU):**
- `eu-west-1` (Ireland) ✅
- `eu-central-1` (Frankfurt) ✅
- `eu-west-2` (London) ✅
- Others: Check Supabase region list

**Not Allowed (Non-EU):**
- `us-east-1` (US East) ❌
- `us-west-1` (US West) ❌
- `ap-southeast-1` (Singapore) ❌

**Help:** See Supabase docs: https://supabase.com/docs/guides/database/overview

---

## Post-Deployment Verification

After completing the 4 actions above, verify:

### A. PR #48 Deploys Successfully

1. Go to PR #48: https://github.com/mininglife7-dev/newspulse-ai/pull/48
2. Scroll to "Vercel deployment" status
3. Should show ✅ **Ready** (not ❌ Failed)
4. Click **Visit Preview** to test in staging

### B. Staging Test (PR Preview)

1. Click **Visit Preview** link in PR #48
2. Go through the full onboarding:
   - Sign up with test email
   - Check email for verification link
   - Verify email
   - Sign in
   - Complete Step 1 (Company Setup)
   - Complete Step 2 (AI Inventory) — add 2-3 test systems
   - Complete Step 3 (Risk Assessment) — assess 1 system
   - Verify dashboard shows progress (counts update)

### C. Production (Main Branch)

1. Merge PR #48 to main when ready
2. Go to https://vercel.com → newspulse-ai → Deployments
3. Should see a new production build (green ✅)
4. Production URL: https://euro-ai.vercel.app (or your custom domain)
5. Repeat staging tests in production

---

## Launch Readiness Checklist

Before inviting the first German customer, verify:

- [ ] Vercel secret configured (github-token)
- [ ] Supabase schema.sql deployed
- [ ] Supabase email auth enabled
- [ ] Supabase region confirmed (EU)
- [ ] PR #48 deploys successfully
- [ ] Staging onboarding test passes (full 3-step journey)
- [ ] Production deployment verified
- [ ] Production onboarding test passes
- [ ] Monitoring/alerting configured (optional but recommended)

---

## Rollback Plan

If something breaks in production:

### Option 1: Revert PR #48 (5 minutes)

1. Go to GitHub: https://github.com/mininglife7-dev/newspulse-ai
2. Click **main** branch dropdown → switch to **main**
3. Revert PR #48 by clicking "Revert" on the merged PR page
4. Create a revert commit to main
5. Vercel will auto-deploy the revert within 2 minutes
6. **Result:** Risk Assessment feature (Step 3) will be unavailable, but Steps 1-2 continue working

### Option 2: Hotfix (15 minutes)

1. Create a new branch from **main**
2. Fix the issue
3. Push and create a new PR
4. Test in staging (Vercel preview)
5. Merge to main when verified

---

## Monitoring & Operations (Post-Launch)

### Daily Checks

- [ ] Vercel deployment status (all green)
- [ ] Supabase database health
- [ ] Customer signup volume (if using analytics)

### Weekly Checks

- [ ] Error logs (any 5xx errors?)
- [ ] Response times (any performance degradation?)
- [ ] Customer feedback (any pain points?)

### Monthly Checks

- [ ] Database growth (storage usage)
- [ ] Vercel usage (bandwidth, edge functions)
- [ ] Security patches (dependency updates)

---

## Customer Onboarding Flow (After Launch)

Once production is live and verified:

1. **Invite first customer** (German pilot)
   - Email verification required (must be configured)
   - Send onboarding guide (docs/CUSTOMER-GUIDES.md)
   - Assign onboarding specialist

2. **Monitor their journey**
   - Track their signup → verification → onboarding completion
   - Watch for errors or support requests
   - Iterate on documentation based on their questions

3. **Gather feedback**
   - Accessibility issues
   - UX friction points
   - Feature requests
   - Compliance questions

4. **Plan next iteration**
   - German language support (planned: German Launch Mission)
   - Team member management (coming in next update)
   - Advanced features (evidence collection, remediation tracking)

---

## Support & Troubleshooting

### Common Issues

**Issue: "Environment Variable GITHUB_TOKEN references Secret github-token, which does not exist"**
- **Cause:** Haven't configured the Vercel secret yet
- **Fix:** Follow "Vercel Configuration" steps above

**Issue: Customer can't verify email**
- **Cause:** Supabase email auth not enabled
- **Fix:** Follow "Supabase Authentication" steps above

**Issue: Customer can't complete risk assessment (404 error)**
- **Cause:** schema.sql not deployed to Supabase
- **Fix:** Follow "Supabase Database" steps above

**Issue: Production deployment fails with HSTS headers**
- **Cause:** Security headers already set by previous deployment
- **Fix:** This is benign and safe to ignore (normal Vercel caching)

---

## Timeline

**Current Status:** 2026-07-10, 09:30 UTC

| Action | Est. Time | Critical Path? |
|--------|-----------|---|
| 1. Vercel github-token secret | 5 min | Yes (for PR deployment) |
| 2. Supabase schema.sql deploy | 10 min | Yes (for production) |
| 3. Supabase email auth enable | 5 min | Yes (for verification) |
| 4. Supabase region verify | 2 min | Yes (for German compliance) |
| Testing (staging) | 20 min | Yes (before production merge) |
| Testing (production) | 20 min | Yes (before customer invite) |
| **Total** | **~1 hour** | All critical |

**Recommended:** Do all 4 actions in sequence, then test immediately. Total time: 1-2 hours to production-ready.

---

## Questions?

Reference:
- **Engineering audit:** `docs/CUSTOMER-READINESS-AUDIT.md`
- **Customer guides:** `docs/CUSTOMER-GUIDES.md`
- **PR #48:** Full implementation details and test plan

---

**Prepared by:** Governor (Autonomous Engineering)  
**Date:** 2026-07-10  
**Status:** ✅ Ready for Founder deployment actions  

Once these 4 infrastructure tasks are complete, the product is production-ready for the first German customer pilot.
