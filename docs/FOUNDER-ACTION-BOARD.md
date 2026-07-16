# Founder Action Board

**Purpose:** Consolidate ALL founder actions needed for production launch  
**Status:** Ready for execution  
**Timeline:** 30 minutes to complete all actions

---

## ⚡ CRITICAL: Start Here

You have 3 things to do before production deployment. All are quick (30 min total).

**After these 3 steps, you can deploy to production immediately.**

---

## Action 1: Enable GitHub Actions Billing (2 minutes)

**Why:** Vercel CI/CD pipeline requires GitHub Actions to run tests

**Steps:**
1. Go to: https://github.com/settings/billing/actions
2. Click: "Enable GitHub Actions"
3. Set spending limit: $50/month
4. ✅ Save

**Verification:** Settings page shows "Actions" with green checkmark

**Time:** 2 minutes  
**Status:** ⏳ Pending

---

## Action 2: Deploy Supabase Production Schema (5 minutes)

**Why:** Database tables must exist before production operation

**Prerequisites:**
- Have Supabase project connection string ready
- Know your Supabase password

**Steps:**

1. **Test database connection:**
   ```bash
   psql "postgresql://user:password@db.supabase.co/postgres" \
     -c "SELECT 'Connected' as status;"
   ```
   
   You should see: `status: Connected`

2. **Preview what will be deployed:**
   ```bash
   cd ~/newspulse-ai
   node scripts/deploy-supabase-schema.mjs --dry-run
   ```
   
   Review output. You should see tables being created:
   - incidents
   - error_patterns
   - orchestrations
   - alerts
   - post_mortems
   - prevention_measures

3. **Execute deployment (commits schema to database):**
   ```bash
   node scripts/deploy-supabase-schema.mjs
   ```

4. **Verify tables created:**
   ```bash
   psql "postgresql://user:password@db.supabase.co/postgres" \
     -c "SELECT COUNT(*) FROM incidents;"
   ```
   
   You should see: `count: 0` (empty table, which is correct)

**Verification:** All 6 tables exist and are queryable

**Time:** 5 minutes  
**Status:** ⏳ Pending

---

## Action 3: Set Production Environment Variables (5 minutes)

**Why:** System needs secrets to authenticate requests and send emails

**Steps:**

1. **Go to Vercel Dashboard:**
   - Open: https://vercel.com/newspulse-ai/settings/environment-variables

2. **Generate two secrets (locally, don't commit):**
   ```bash
   # Generate CRON_SECRET
   openssl rand -hex 32
   # Copy output, you'll need it below
   
   # Generate PRODUCTION_WIRING_SECRET
   openssl rand -hex 32
   # Copy output, you'll need it below
   ```

3. **Add environment variables to Vercel:**

   | Variable Name | Value | Where to Get It |
   |---------------|-------|-----------------|
   | CRON_SECRET | (paste from step 2) | `openssl rand -hex 32` |
   | PRODUCTION_WIRING_SECRET | (paste from step 2) | `openssl rand -hex 32` |
   | FOUNDER_EMAIL | your-email@example.com | Your email address |
   | EMAIL_PROVIDER | sendgrid | Fixed value |
   | SENDGRID_API_KEY | (your key) | SendGrid dashboard → Settings → API Keys |
   | GITHUB_TOKEN | (your token) | GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) |
   | VERCEL_API_TOKEN | (your token) | Vercel → Settings → Tokens → Create new |

   **How to add in Vercel:**
   - For each variable:
     1. Click "Add New"
     2. Enter Name and Value
     3. Click "Save"
     4. Repeat for all 7 variables

4. **Verify all variables set:**
   ```bash
   node scripts/pre-deployment-check.mjs
   ```
   
   You should see: ✓ All environment variables present

**Verification:** `node scripts/pre-deployment-check.mjs` shows all green checkmarks

**Time:** 5 minutes  
**Status:** ⏳ Pending

---

## ✅ Automated Verification (After All 3 Actions)

**Command:**
```bash
node scripts/pre-deployment-check.mjs
```

**Expected output:**
```
Environment Variables
  ✓ VERCEL_API_TOKEN: vk_...
  ✓ CRON_SECRET: a1b2c3...
  ✓ FOUNDER_EMAIL: your-email@example.com
  ✓ EMAIL_PROVIDER: sendgrid
  ✓ GITHUB_TOKEN: ghp_...
  ✓ PRODUCTION_WIRING_SECRET: d4e5f6...
  ✓ SENDGRID_API_KEY: SG.***

Email Provider Configuration
  ✓ EMAIL_PROVIDER value: sendgrid
  ✓ SENDGRID_API_KEY: Set

Credential Format Validation
  ✓ VERCEL_API_TOKEN format: OK
  ✓ CRON_SECRET format: OK
  ✓ FOUNDER_EMAIL format: OK

✅ READY FOR DEPLOYMENT
```

**If you see ❌ FAILED on any check:**
1. Fix the issue (see error message)
2. Rerun: `node scripts/pre-deployment-check.mjs`
3. Repeat until all checks pass

---

## 🚀 Deploy to Production (When Ready)

**After prerequisites above are complete and verified, you can deploy:**

```bash
git fetch origin main
git checkout main
git pull origin main

npm run build
npm run test

# Deploy
vercel --prod
```

**Or if you prefer, just merge PR #92 to main** (auto-deploys)

---

## ⚙️ Configure External Cron (5 minutes, After Deployment)

**When:** Do this AFTER deployment completes and shows "Ready"

**Purpose:** Error collection runs every 60 seconds

**Steps:**

1. **Go to EasyCron:** https://www.easycron.com
2. **Sign up / Login** (free account)
3. **Click "Create Cron Job"**
4. **Enter:**
   - URL: `https://newspulse-ai-production.vercel.app/api/production-error-collection/cron`
   - Request method: POST
   - Header name: `Authorization`
   - Header value: `Bearer [CRON_SECRET]` (use value from Action 3)
   - Cron expression: `*/1 * * * *` (every minute)

5. **Save and enable**

**Verification:** 
- EasyCron dashboard shows "Last Execution" timestamp updates every 60 seconds
- OR: `vercel logs newspulse-ai --grep "error-collection-cron"` shows execution logs

**Time:** 5 minutes  
**Status:** ⏳ Pending (after deployment)

---

## 📊 Start 48-Hour Pilot (After Cron Configured)

**When:** Immediately after external cron is running

**What to do:**

**Hour 1 Checklist (10 min):**
- [ ] Cron job executing (check EasyCron or logs)
- [ ] Health check passing: `curl https://newspulse-ai-production.vercel.app/api/health`
- [ ] Database connected: `curl https://newspulse-ai-production.vercel.app/api/health/db`
- [ ] Email test (should arrive in inbox): `curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"`

**Hour 6 Checklist (15 min):**
- [ ] Incidents detected and logged in Supabase
- [ ] Critical alerts received in email
- [ ] No cascading failures
- [ ] Recovery times reasonable

**Hour 24 Checklist (20 min):**
- [ ] 24 hours of stable operation
- [ ] Metrics on target (MTTD < 30s, MTTR < 120s)
- [ ] Alert delivery 100%

**After all pass:** Production is ready for full rollout ✅

---

## 🎯 Decision Point

**After 24-hour pilot complete:**

- ✅ All metrics on target → **FULL ROLLOUT** (production is live)
- ⚠️  Some metrics off → Investigate + re-pilot for another 24 hours  
- ❌ Critical issues → Rollback (see [DISASTER-RECOVERY-PROCEDURES.md](DISASTER-RECOVERY-PROCEDURES.md))

---

## 📞 If You Need Help

**Before deploying:**
- Run: `node scripts/pre-deployment-check.mjs` (tells you what's missing)
- Read: [PRODUCTION-LAUNCH-CHECKLIST.md](PRODUCTION-LAUNCH-CHECKLIST.md)

**During pilot:**
- Incident detected? See: [INCIDENT-RESPONSE-RUNBOOKS.md](INCIDENT-RESPONSE-RUNBOOKS.md)
- System failing? See: [DISASTER-RECOVERY-PROCEDURES.md](DISASTER-RECOVERY-PROCEDURES.md)

**For any question:**
- Start: [docs/README.md](README.md)
- Search: [DOCUMENTATION-NAVIGATION.md](DOCUMENTATION-NAVIGATION.md)

---

## Summary: What You're Doing

This system automatically detects production errors and makes remediation decisions (rollback, scale, drain, or notify). After these 3 actions, it will:

1. **Detect** errors every 60 seconds
2. **Analyze** severity and category
3. **Decide** remediation action (auto or manual)
4. **Execute** the remediation (if safe)
5. **Alert** you of critical incidents
6. **Learn** from incidents via post-mortems

All 100% automated. You just need to:
1. Enable GitHub Actions billing
2. Deploy Supabase schema
3. Set environment variables
4. Then you can deploy to production

---

## ✅ Completion Checklist

Mark as complete when done:

- [ ] **Action 1:** GitHub Actions billing enabled
- [ ] **Action 2:** Supabase schema deployed
- [ ] **Action 3:** Environment variables set in Vercel
- [ ] **Verification:** `node scripts/pre-deployment-check.mjs` passes
- [ ] **Deployment:** `vercel --prod` successful + shows "Ready"
- [ ] **Cron Setup:** External cron configured + executing
- [ ] **Hour 1 Pilot:** All checks passing
- [ ] **Hour 6 Pilot:** All checks passing
- [ ] **Hour 24 Pilot:** All checks passing + metrics on target
- [ ] **Decision:** Go/No-Go for full rollout

---

## 📝 Contact & Support

If you get stuck on any step:
1. Check error message from `pre-deployment-check.mjs` (usually tells you exactly what to fix)
2. See [PRODUCTION-LAUNCH-CHECKLIST.md](PRODUCTION-LAUNCH-CHECKLIST.md) for detailed version
3. Check [DOCUMENTATION-NAVIGATION.md](DOCUMENTATION-NAVIGATION.md) for complete index

---

**Status:** Ready for founder action  
**Total Time Required:** 30 minutes (actions) + 48 hours (pilot monitoring)  
**Production Readiness:** 100%

**Next step:** Complete Action 1 (GitHub Actions), then proceed through Actions 2 and 3.

After 3 actions complete → You can deploy to production immediately.
