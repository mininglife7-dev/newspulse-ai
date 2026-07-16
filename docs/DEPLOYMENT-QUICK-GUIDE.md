# Production Deployment Quick Guide

**For:** Founder  
**Time Estimate:** 4 hours from prerequisite approval to pilot launch  
**Status:** Ready to execute

---

## Prerequisites (Founder Actions Required)

### 1. Enable GitHub Actions Billing
**In GitHub Organization Settings:**
1. Go to Organization → Settings → Billing & plans
2. Scroll to "Actions" section
3. Click "Enable GitHub Actions"
4. Set monthly spend cap to $50

**Time:** 2 minutes

### 2. Deploy Supabase Production Schema
**Prerequisites:**
- Have Supabase production instance connection string available
- Have `psql` installed locally

**Steps:**
```bash
# Test database connection
psql "postgresql://user:password@db.supabase.co/postgres" \
  -c "SELECT 'Connected' as status;"

# Run schema deployment (shows preview, no changes yet)
cd ~/newspulse-ai
node scripts/deploy-supabase-schema.mjs --dry-run

# If dry-run looks good, apply changes
node scripts/deploy-supabase-schema.mjs

# Verify tables created
psql "postgresql://user:password@db.supabase.co/postgres" \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```

**Expected Tables:** incidents, error_patterns, orchestrations, alerts, post_mortems, prevention_measures  
**Time:** 5 minutes

### 3. Set Production Environment Variables
**In Vercel Dashboard (Project Settings → Environment Variables):**

```env
# Essential
VERCEL_API_TOKEN=<your Vercel API token>
CRON_SECRET=<generate: openssl rand -hex 32>
FOUNDER_EMAIL=<your email>
EMAIL_PROVIDER=sendgrid  # or ses / log
SENDGRID_API_KEY=<your SendGrid key>

# Optional but recommended
SLACK_WEBHOOK_URL=<your Slack webhook>
GITHUB_TOKEN=<your GitHub personal token>
PRODUCTION_WIRING_SECRET=<generate: openssl rand -hex 32>
```

**Time:** 5 minutes

**Total Prerequisite Time:** ~12 minutes

---

## Automated Verification

After prerequisites are set, run:

```bash
node scripts/pre-deployment-check.mjs
```

This validates:
- ✓ All environment variables configured
- ✓ Email provider setup correct
- ✓ API authentication in place
- ✓ Supabase schema deployed
- ✓ Critical code files present

**Output:** PASS/FAIL with specific remediation hints  
**Time:** 1 minute

---

## Phase 1: Build & Deploy (Duration: 15 minutes)

### Step 1: Verify Latest Main Branch
```bash
git fetch origin main
git checkout main
git pull origin main
```

### Step 2: Build Locally
```bash
npm run build
npm run test  # Verify tests still pass (should be 1013 tests)
```

**Expected Output:**
```
Test Files  57 passed (57)
Tests  1013 passed (1013)
```

### Step 3: Deploy to Production
```bash
# Via Vercel CLI (recommended)
vercel --prod

# Or: Merge PR #92 to main → auto-deploys
git push origin main
```

**Expected:** Vercel shows "Ready" status within 2 minutes

### Step 4: Verify Endpoints
```bash
# Test health
curl https://newspulse-ai-production.vercel.app/api/health

# Test error collection endpoint
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET" \
  | jq .

# Test production-wiring
curl -X POST https://newspulse-ai-production.vercel.app/api/production-wiring \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"deploymentId":"test","errorMetrics":{"totalErrors":0,"errorRate":0},"errorPatterns":[]}' \
  | jq .
```

---

## Phase 2: Configure External Cron (Duration: 5 minutes)

Error collection runs every 60 seconds via external cron service.

### Option A: EasyCron (Recommended)

1. Visit https://www.easycron.com
2. Click "Create Cron Job"
3. Enter URL:
   ```
   https://newspulse-ai-production.vercel.app/api/production-error-collection/cron
   ```
4. Set Header:
   ```
   Authorization: Bearer <YOUR_CRON_SECRET>
   ```
5. Set Cron Expression: `*/1 * * * *` (every minute)
6. Enable & Save

### Option B: cron.is

Similar process at https://cron.is

---

## Phase 3: Pilot Launch (Duration: 48 hours)

### Minute 0: Start Monitoring
```bash
# Watch Vercel logs
vercel logs newspulse-ai --follow

# Dashboard
open https://newspulse-ai-production.vercel.app/dashboard
```

### Hour 1 Checklist
- [ ] Cron job executed at least once (check logs)
- [ ] No errors in console
- [ ] Supabase entries appearing (check incidents table)
- [ ] Health check passing

### Hour 6 Checklist
- [ ] Multiple incidents detected and logged
- [ ] Alerts received (check email + Slack if configured)
- [ ] Recovery times reasonable (< 120s)
- [ ] No cascading failures

### Hour 24 Checklist
- [ ] Stable operation for 24 hours
- [ ] Error rate < 1%
- [ ] Detection accuracy > 95%
- [ ] All metrics normal

**If all pass:** Proceed to full rollout  
**If issues:** See Troubleshooting section below

---

## Troubleshooting Quick Reference

### Cron Job Not Running
```bash
# Manually trigger test
curl "https://newspulse-ai-production.vercel.app/api/production-error-collection/cron?cron_secret=$CRON_SECRET"

# Should return: { "success": true, "collected": N }
```

**If fails:** Check CRON_SECRET matches environment variable

### Alerts Not Sending
```bash
# Test email
curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"severity":"critical","description":"Test alert"}'

# Check spam folder
# Verify EMAIL_PROVIDER and credentials
```

### Deployment Rollback (If Needed)
```bash
# Disable cron immediately
# (Log into EasyCron/cron.is and disable the job)

# Rollback Vercel deployment
vercel rollback

# Verify health
curl https://newspulse-ai-production.vercel.app/api/health
```

---

## Success Metrics (Target Values)

After 24-hour pilot:

| Metric | Target | Check |
|--------|--------|-------|
| MTTD | < 30s | Incidents table |
| MTTR | < 120s | Orchestrations table |
| Accuracy | > 95% | Review incidents detected |
| Alerts | 100% delivery | Check email/Slack |
| False positives | < 5% | Review incident log |
| Uptime | > 99% | Vercel dashboard |

---

## Key Environment Variables Reference

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `VERCEL_API_TOKEN` | Deploy to Vercel | Vercel → Settings → Tokens |
| `CRON_SECRET` | Authorize cron calls | `openssl rand -hex 32` |
| `FOUNDER_EMAIL` | Where alerts go | Your email address |
| `EMAIL_PROVIDER` | Which service sends emails | sendgrid / ses / log |
| `SENDGRID_API_KEY` | SendGrid authentication | SendGrid account dashboard |
| `SLACK_WEBHOOK_URL` | Slack integration | Slack → Incoming Webhooks |
| `GITHUB_TOKEN` | GitHub integration | GitHub → Developer settings → Personal tokens |
| `PRODUCTION_WIRING_SECRET` | API authentication | `openssl rand -hex 32` |

---

## Support

For issues:
1. Check logs: `vercel logs newspulse-ai --follow`
2. See Troubleshooting section above
3. Review DEPLOYMENT-PROCEDURE.md for detailed steps

---

**Last Updated:** 2026-07-16  
**Status:** Production Ready
