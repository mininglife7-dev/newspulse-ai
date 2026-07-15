# Pre-Launch Verification Checklist

**Purpose:** Final verification before first customer launch  
**Timeline:** 1-2 hours total  
**Status:** Ready to verify  
**Owner:** Founder

---

## Quick Summary

This checklist consolidates everything needed to verify the system is production-ready. Work through each section sequentially. Green checkmarks = ready to launch.

**Estimated time breakdown:**

- Prerequisites: 20-35 min (blocked Founder actions)
- Code verification: 7 min (scripts)
- Deployment verification: 10 min (manual checks)
- Monitoring setup: 15 min (GitHub secrets)
- Pre-flight checklist: 5 min
- **Total: 1-2 hours**

---

## PART 1: Prerequisites (BLOCKING — Do First)

### Priority 0 Actions

These must complete before any other verification. Follow `FOUNDER_ACTION_BOARD.md` Priority 0.

- [ ] **Supabase Schema Deployed** (15-30 min)
  - Instructions: `docs/infra/SUPABASE-PRODUCTION-SETUP.md`
  - Verify: Go to Supabase → SQL Editor
  - Should see tables: customers, searches, sessions, workspaces, etc.
  - Status: Schema present and queries return results

- [ ] **GitHub Actions Spending Limit Increased** (5 min)
  - Go to GitHub → Settings → Billing and plans → Actions
  - Set spending limit to $50/month (or higher)
  - Verify: Limit shows on billing page
  - Status: Actions can now run automatically

---

## PART 2: Code & Build Verification (7 minutes)

### Local Build Verification

Run the pre-customer verification script:

```bash
bash scripts/pre-customer-verification.sh --verbose
```

**Expected output:**

```
✅ Node.js available: v20.x
✅ npm available: v10.x
✅ Git available
✅ .env.local configured
✅ Dependencies installed
✅ TypeScript build successful
✅ ESLint clean
✅ Prettier formatted
✅ All 551 tests passing
✅ Database schema valid
✅ API routes defined
✅ Ready for customer launch
```

**If any ❌ fails:** Fix before proceeding

- Tests failing? Run `npm test` to debug
- Build errors? Run `npm run type-check` to fix
- Lint issues? Run `npm run lint -- --fix` to fix

**Expected time:** 5-7 minutes

---

## PART 3: Deployment Verification (10 minutes)

### Live Deployment Status

Verify Vercel deployment is ready and working:

1. **Check Vercel Status**
   - [ ] Go to [Vercel dashboard](https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai)
   - [ ] Latest deployment shows "Ready" (not "Failed" or "Building")
   - [ ] Deployment timestamp is recent (< 1 hour)

2. **Run Runtime Health Check**

   ```bash
   bash scripts/runtime-health-check.sh --quick
   ```

   **Expected output:**

   ```
   ✅ Deployment accessible
   ✅ API health endpoint: 200 OK
   ✅ Database connectivity: ok
   ✅ Response time: 0.523s
   ✅ Production ready
   ```

3. **Manual Endpoint Verification**

   Test in your browser or curl:

   ```bash
   # Should return 200 with {"ok": true, "db": "ok", ...}
   curl https://newspulse-ai.vercel.app/api/health

   # Should return 200 with alert data
   curl https://newspulse-ai.vercel.app/api/alerts
   ```

   - [ ] `/api/health` returns 200 with `"db": "ok"`
   - [ ] `/api/alerts` returns 200 with `"alerts": []` or alert list
   - [ ] Both endpoints respond in <1 second

**Expected time:** 3-5 minutes

---

## PART 4: Monitoring Setup (15 minutes)

Follow `docs/infra/MONITORING_SETUP_GUIDE.md` to configure monitoring:

### Step 1: Get Vercel Credentials (5 min)

- [ ] Create Vercel API Token
  - Go to [Vercel Tokens](https://vercel.com/account/tokens)
  - Create new token named `newspulse-ai-monitoring`
  - Copy token (you'll only see it once)

- [ ] Get Vercel Project ID
  - Go to Vercel project Settings → General
  - Copy Project ID (format: `prj_xxxxx`)

### Step 2: Configure GitHub Secrets (5 min)

- [ ] Go to GitHub → Settings → Secrets and variables → Actions
- [ ] Add secret: `VERCEL_API_TOKEN` = [paste token from Vercel]
- [ ] Add secret: `VERCEL_PROJECT_ID` = [paste project ID]
- [ ] (Optional) Add secret: `SLACK_WEBHOOK_URL` = [paste Slack webhook if you have one]

**Verify secrets added:**

```bash
# (Can't view values, just check they exist in GitHub UI)
# Settings → Secrets → should see 2-3 secrets listed
```

### Step 3: Enable & Test Workflows (5 min)

- [ ] Go to GitHub → Actions tab
- [ ] Verify workflows are enabled:
  - [ ] "Monitor Production Health" — enabled
  - [ ] "Track Performance Baseline" — enabled
  - [ ] "Aggregate Errors" — enabled

- [ ] Manually trigger test run:
  1. Click "Monitor Production Health"
  2. Click "Run workflow"
  3. Wait 2-3 minutes for execution
  4. Verify "✓ Workflow completed successfully"
  5. Check logs show all health checks passed

**Expected log output:**

```
✅ Deployment ready: https://newspulse-ai.vercel.app
✅ API health: OK, Database: OK
✅ No active alerts
✅ Supabase operational
```

---

## PART 5: Documentation Review (5 minutes)

Verify you have the key docs ready:

- [ ] Read `docs/customer/FIRST_CUSTOMER_PLAYBOOK.md`
  - Understand the 7-step customer journey
  - Review common friction points
  - Know the support SLAs

- [ ] Read `docs/infra/FOUNDER_MONITORING_DASHBOARD.md`
  - Understand what to check daily
  - Know where the dashboard URLs are
  - Review troubleshooting guide

- [ ] Have email templates ready
  - `docs/customer/COMMUNICATION_TEMPLATES.md`
  - Customize welcome email template for first customer
  - Have it ready to send

- [ ] Understand support process
  - `docs/customer/SUPPORT_TICKET_SYSTEM.md`
  - Know the SLA response times
  - Understand severity levels

- [ ] Bookmark monitoring links
  - Vercel dashboard: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
  - Supabase dashboard: https://app.supabase.com
  - GitHub Actions: https://github.com/mininglife7-dev/newspulse-ai/actions
  - Health endpoint: https://newspulse-ai.vercel.app/api/health

---

## PART 6: Pre-Flight Checklist (5 minutes)

Final systems check before inviting first customer:

### Infrastructure

- [ ] Vercel deployment: Ready
- [ ] Supabase database: Schema deployed, accessible
- [ ] GitHub Actions: Spending limit increased, workflows enabled
- [ ] Monitoring: Secrets configured, health check passes

### Monitoring

- [ ] 5-minute health checks: Enabled
- [ ] Hourly performance tracking: Enabled
- [ ] 12-hourly error aggregation: Enabled
- [ ] Slack alerts: (Optional, can enable later)

### Documentation

- [ ] Customer playbook: Read and understood
- [ ] Monitoring dashboard: Bookmarked
- [ ] Support SLAs: Documented and ready
- [ ] Email templates: Customized and ready

### APIs & Endpoints

- [ ] `/api/health` → 200, `"db": "ok"`
- [ ] `/api/alerts` → 200
- [ ] Response time < 1 second
- [ ] No errors in deployment logs

### Customer Readiness

- [ ] First customer email address ready
- [ ] Welcome email template customized
- [ ] Support contact info documented
- [ ] Success metrics understood (METRICS_TRACKING_SPECIFICATION.md)

---

## PART 7: Go/No-Go Decision

After completing all checks above, answer these questions:

### All systems operational?

- [ ] Yes, all checks passed (GREEN) → **Ready to launch**
- [ ] No, some checks failed (RED) → Fix issues and re-run

### Monitoring working?

- [ ] Yes, health checks pass (GREEN) → **Ready to launch**
- [ ] No, monitoring issues (RED) → Review MONITORING_SETUP_GUIDE.md troubleshooting

### Team ready?

- [ ] Yes, Founder understands procedures (GREEN) → **Ready to launch**
- [ ] No, need more practice (RED) → Review FIRST_CUSTOMER_PLAYBOOK.md again

---

## PART 8: Launch Day

Once all checks pass, you're ready for first customer.

### Before Customer Joins

1. Verify health endpoint one last time (should be instant)
2. Review welcome email one final time
3. Ensure you're monitoring the alerts dashboard
4. Have INCIDENT_RESPONSE_RUNBOOKS.md open (just in case)

### When Customer Signs Up

1. Send welcome email using template
2. Monitor `/api/alerts` dashboard
3. Track signup funnel metrics (METRICS_TRACKING_SPECIFICATION.md)
4. Verify customer successfully logged in
5. Follow 7-step journey in FIRST_CUSTOMER_PLAYBOOK.md

### Week 1 Operations

- [ ] Daily: Check health dashboard (FOUNDER_MONITORING_DASHBOARD.md)
- [ ] Daily: Track metrics using daily checklist
- [ ] Within SLA: Respond to any customer support requests
- [ ] Monitor: Automated alerts for any issues
- [ ] Review: Performance baselines (should be stable)
- [ ] Check: Error rates (should be 0%)

---

## Rollback / Emergency

If something goes wrong before first customer:

1. **Deployment broken?**
   - Go to Vercel → Deployments
   - Click previous deployment
   - Click "Promote to Production"
   - Wait 2-3 minutes

2. **Database issue?**
   - Go to Supabase → Backups
   - Check if recovery available
   - Or re-run SUPABASE-PRODUCTION-SETUP.md

3. **GitHub Actions spending?**
   - Disable workflows temporarily
   - Increase spending limit
   - Re-enable workflows

4. **Monitoring broken?**
   - Doesn't affect production (just visibility)
   - Reconfigure GitHub secrets (MONITORING_SETUP_GUIDE.md)
   - Manual monitoring via FOUNDER_MONITORING_DASHBOARD.md still works

---

## Success Criteria

✅ **You can launch when ALL of these are true:**

1. Supabase schema deployed and working
2. GitHub Actions spending limit ≥$50/month
3. `pre-customer-verification.sh` returns exit code 0
4. `runtime-health-check.sh` returns exit code 0
5. `/api/health` endpoint returns 200 with `"db": "ok"`
6. `/api/alerts` endpoint returns 200
7. Vercel deployment shows "Ready"
8. GitHub Actions workflows pass manual test run
9. GitHub secrets configured (VERCEL_API_TOKEN, VERCEL_PROJECT_ID)
10. You've read all customer playbook and support docs
11. First customer email is ready to send
12. You understand daily monitoring procedures

**If all 11 criteria are green: 🚀 Ready to launch**

---

## Reference

**Documents to have on hand:**

- `FOUNDER_ACTION_BOARD.md` — Daily checklist
- `FIRST_CUSTOMER_PLAYBOOK.md` — Customer journey procedures
- `FOUNDER_MONITORING_DASHBOARD.md` — Daily monitoring routine
- `INCIDENT_RESPONSE_RUNBOOKS.md` — Emergency procedures
- `MONITORING_SETUP_GUIDE.md` — GitHub secrets configuration
- `COMMUNICATION_TEMPLATES.md` — Email templates

**Scripts to run:**

- `scripts/pre-customer-verification.sh --verbose` — Code/build ready
- `scripts/runtime-health-check.sh --quick` — Deployment ready

**External links:**

- Vercel: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
- Supabase: https://app.supabase.com
- GitHub: https://github.com/mininglife7-dev/newspulse-ai
