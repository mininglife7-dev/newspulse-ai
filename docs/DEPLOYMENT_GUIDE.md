# Deployment Checklist for EURO AI Compliance Platform

**For:** Lalit (Founder)  
**Phase:** Post-Phase 1+ (ready to production)  
**Est. Time:** 15 minutes

## Prerequisites Check

- [ ] GitHub access to mininglife7-dev/newspulse-ai
- [ ] Vercel project admin access
- [ ] Supabase project admin access
- [ ] Personal GitHub token with `repo` scope (for github-token secret)

---

## Step 1: Fix Vercel Deployment (Required)

**Current Status:** Deployment failing with missing `github-token` secret

### Action
1. Go to https://vercel.com/dashboard
2. Select project: `newspulse-ai`
3. Click: Settings → Environment Variables
4. Create new variable:
   - **Name:** `github-token`
   - **Value:** [Personal GitHub token with repo read access]
   - **Environment:** Production, Preview, Development (all three)
5. Click Save
6. Redeploy PR #83 or push a new commit to trigger build

### Verification
- Vercel build completes successfully
- PR #83 shows green checkmark from Vercel

---

## Step 2: Deploy Supabase Schema (Required)

**Current Status:** Code ready, live project needs schema migration

### Action
1. Go to https://supabase.com → Project Dashboard
2. Open SQL Editor
3. Copy entire contents of `/supabase/schema.sql` (from this repo)
4. Paste into SQL editor
5. Click "Run" (schema is idempotent — safe to run multiple times)
6. Verify: No errors, output shows "Success"

### Schema Includes
- All tables: auth, companies, workspaces, workspace_members, ai_systems, etc.
- Row Level Security (RLS) policies for workspace isolation
- Indexes for performance (created_at, workspace_id, status, priority)
- Functions: assign_obligation(), get_user_obligations()

### Verification
- No SQL errors
- Tables visible in Supabase Table Editor
- RLS policies enforced (verify in Auth → Policies)

---

## Step 3: Enable Email Auth (Required)

**Current Status:** Auth works; email confirmation needed for sign-up

### Action
1. Go to Supabase Project Settings → Authentication
2. Under "Providers" find "Email"
3. Ensure "Email" provider is enabled (should be by default)
4. Save

### Verification
- Email provider shows "Enabled" status
- Sign-up flow sends confirmation emails

---

## Step 4: Verify Production Readiness (Recommended)

### Email Configuration
- [ ] Confirm Supabase SMTP is configured (Project → Settings → Email Templates)
  - From: Should be Supabase default
  - Reply-to: Should be configured

### Environment Variables
- [ ] Verify all required env vars are set (check `.env.example` for reference)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (backend only)
  - `GITHUB_TOKEN` (Vercel — just added above)

### Database Region
- [ ] Confirm Supabase region is EU (for GDPR compliance)

---

## Step 5: Test End-to-End in Production

### User Journey (Post-deployment)
1. Visit https://your-deployment-url.vercel.app
2. Click "Sign Up"
3. Enter email + password
4. Check email for verification link (should arrive in <1 min)
5. Click link → Redirects to `/auth/confirm`
6. Complete workspace setup form (Company Name, Industry, etc.)
7. Redirected to Dashboard → should show empty state
8. Create AI System (Inventory → Add AI system)
9. Start Assessment (13 questions, auto-advance)
10. Finalize → View Remediation Plan (recommendations + obligations)
11. Upload Evidence (Obligations page → expand item → upload file)
12. Export Report (PDF generation)
13. Bulk Import (CSV with obligation_id, status, priority)

### Expected Results
- ✅ All forms save data to database
- ✅ Dashboard shows live data (systems, assessments, obligations)
- ✅ PDFs generate correctly
- ✅ Bulk import processes without errors
- ✅ No console errors (check DevTools)

---

## Step 6: Monitor Production

### Immediate (First Hour)
- [ ] Check Sentry/error logs for any issues
- [ ] Verify users can complete sign-up flow
- [ ] Monitor Vercel deployment logs

### Ongoing (Daily)
- DNA-GOV-001 (Blocking Condition Detector) — runs every 30 min
  - Checks: GitHub Actions health, Vercel status, Supabase uptime
  - If blocker found: Check `/api/blocking-conditions` endpoint
  
- DNA-GOV-002 (Production Monitoring) — ready after secret added
  - Checks: Landing page, signup form, API health
  - Schedule: Every 5 minutes

---

## Rollback Plan (If Needed)

### If Deployment Fails
1. Vercel: Automatic rollback to previous commit
2. Supabase: Schema is idempotent (run again to reset)
3. GitHub: Revert PR #83 and push

### If Test User Can't Sign Up
1. Check Supabase email settings (Settings → Email Templates)
2. Check spam folder for confirmation email
3. Verify SMTP relay is working (Supabase logs)

---

## Success Criteria

✅ You'll know everything works when:
- [ ] PR #83 CI passes (green checkmark)
- [ ] Test user completes full workflow (sign-up → assessment → report → bulk import)
- [ ] Dashboard shows real data
- [ ] PDF export generates without errors
- [ ] No errors in Vercel deployment logs

---

## Support & Troubleshooting

### If Vercel Build Fails
- Check: Are all env vars present? (Settings → Environment Variables)
- Check: Is github-token secret correctly set?
- Solution: Redeploy manually from Vercel dashboard

### If Supabase Schema Fails
- Error: "table already exists" → Schema already deployed (OK)
- Error: "permission denied" → Check Supabase project access
- Solution: Run schema in SQL editor with sufficient permissions

### If Email Doesn't Arrive
- Check: Email provider enabled? (Auth → Providers → Email)
- Check: SMTP configured? (Project Settings → Email Templates)
- Check: Spam folder (Gmail, Outlook often flag Supabase emails)

---

## Timeline

- **Current (now):** Code complete, all tests passing
- **+5 min:** Add github-token secret to Vercel
- **+10 min:** Deploy Supabase schema
- **+5 min:** Enable Email auth
- **+15 min:** Test end-to-end
- **Total:** ~35 minutes to full production readiness

---

## Questions?

Refer to:
- FOUNDER_BRIEF.md (status, features)
- docs/governance/MISSION-HANDOVER-2026-07-10.md (decisions)
- PR #83 (code changes, test results)
