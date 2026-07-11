# Production Deployment Procedure

**Status:** Ready for execution upon Founder prerequisite approval  
**Timeline:** ~4 hours from prerequisite approval to pilot launch  
**Risk Level:** Low (with rollback available at every stage)

---

## Prerequisites Checklist

Before beginning deployment, Founder must complete these three actions:

### 1. GitHub Actions Billing Restoration
```
☐ GitHub.com → Organization Settings → Billing & Plans
☐ GitHub Actions → Set monthly spend cap to $50
☐ Enable Actions for repository
```

### 2. Supabase Production Schema Deployment
```
☐ Back up production Supabase instance via dashboard
☐ Obtain production database connection string (postgresql://...)
☐ Set SUPABASE_DB_URL environment variable locally
☐ Run: node scripts/deploy-supabase-schema.mjs --dry-run
☐ Verify dry run output (shows tables to be created)
☐ Run: node scripts/deploy-supabase-schema.mjs
☐ Verify: All 6 tables created in production database
```

**Tables Deployed:**
- `incidents` — Detected production incidents
- `error_patterns` — Error fingerprints
- `orchestrations` — Remediation decisions
- `alerts` — Founder notifications sent
- `post_mortems` — Incident post-mortems
- `prevention_measures` — GitHub issues created

### 3. Production Environment Variables

Set in Vercel Dashboard (Settings → Environment Variables):

```env
# Required
VERCEL_API_TOKEN=<from Vercel Settings → Tokens>
CRON_SECRET=<generate: openssl rand -hex 32>
FOUNDER_EMAIL=<your email address>
EMAIL_PROVIDER=sendgrid|ses|log

# Email Provider Configuration (choose one)
# Option A: SendGrid (Recommended)
SENDGRID_API_KEY=<from SendGrid account>

# Option B: AWS SES
AWS_ACCESS_KEY_ID=<from AWS IAM>
AWS_SECRET_ACCESS_KEY=<from AWS IAM>
AWS_REGION=us-east-1

# Option C: Console Logging (Development only)
# No additional configuration needed

# Optional but Recommended
SLACK_WEBHOOK_URL=<from Slack Incoming Webhooks>

# GitHub Integration
GITHUB_TOKEN=<from GitHub Settings → Developer settings → Personal access tokens>
GITHUB_OWNER=mininglife7-dev
GITHUB_REPO=newspulse-ai
```

---

## Phase 1: Validate Configuration (Duration: 5 minutes)

Once prerequisites are complete, validate environment before deployment.

### Step 1.1: Validate Local Environment
```bash
# Ensure all required environment variables are set locally
node scripts/validate-env.mjs production
```

**Expected Output:**
```
✓ VERCEL_API_TOKEN: <token>...
✓ CRON_SECRET: <secret>...
✓ FOUNDER_EMAIL: lalit@...
✓ EMAIL_PROVIDER: sendgrid
✓ SENDGRID_API_KEY: <key>...
✓ GITHUB_TOKEN: ghp_...

✅ ALL REQUIRED VARIABLES SET
```

**If failed:** Check environment variable setup in Vercel Dashboard.

### Step 1.2: Verify Supabase Connection
```bash
# Test connection to production database
psql "$SUPABASE_DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

**Expected Output:**
```
       table_name
──────────────────
 incidents
 error_patterns
 orchestrations
 alerts
 post_mortems
 prevention_measures
(6 rows)
```

---

## Phase 2: Staging Validation (Duration: 45 minutes)

Before touching production, validate full incident pipeline in staging.

### Step 2.1: Deploy to Staging
```bash
# Create staging deployment via Vercel
vercel env pull # Pull staging environment variables
git checkout main
npm run build   # Verify build succeeds
vercel --prod   # Deploy to staging environment
```

### Step 2.2: Verify Staging Endpoints
```bash
# Validate all endpoints operational
node scripts/verify-production-wiring.mjs https://<staging-url>
```

**Expected Output:**
```
✓ Health Check (GET /api/health)
✓ Error Collection (POST /api/production-error-collection/cron)
✓ Production Wiring (POST /api/production-wiring)
✓ War Games (POST /api/war-games)

Results: 4 passed, 0 failed

✅ All endpoints verified
```

### Step 2.3: Run War Games in Staging
```bash
# Execute all 5 synthetic incident scenarios
node scripts/run-war-games.mjs https://<staging-url> --report
```

**Expected Output:**
```
🎮 Running: Deployment Schema Mismatch
   ✓ Detected in 1234ms (target: <5000ms) ✓
   ✓ Recovered in 8234ms (target: <15000ms) ✓

🎮 Running: Connection Pool Exhaustion
   ✓ Detected in 9876ms (target: <10000ms) ⚠
   ✓ Recovered in 28234ms (target: <30000ms) ✓

[... 3 more scenarios ...]

Results: 5/5 passed

✅ All scenarios passed
```

**Go/No-Go Criteria:**
- ✓ MTTD < 30 seconds (detection speed)
- ✓ MTTR < 120 seconds (recovery time)
- ✓ False positive rate < 5%
- ✓ All scenarios passed

**If any scenario fails:**
1. Check staging logs: `vercel logs <staging-url>`
2. Diagnose issue
3. Fix and re-run
4. DO NOT proceed to production until all pass

### Step 2.4: Verify Email Alerting
```bash
# Send test alert to validate email delivery
curl -X POST https://<staging-url>/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"severity": "critical", "description": "Test alert"}'
```

**Expected:**
- Email arrives at `$FOUNDER_EMAIL` within 2 minutes
- Subject contains: "🚨 CRITICAL: Test alert"
- Slack message (if webhook configured) arrives within 30 seconds

**If email doesn't arrive:**
1. Check EMAIL_PROVIDER configuration
2. Verify SENDGRID_API_KEY (if SendGrid)
3. Check spam folder
4. Try with console logging: Set `EMAIL_PROVIDER=log` and check logs

### Step 2.5: Verify GitHub Integration
```bash
# Test GitHub issue creation
curl -X POST https://<staging-url>/api/test-github-issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"type": "postmortem", "title": "Test Issue"}'
```

**Expected:**
- GitHub issue created in repository
- Issue contains proper labels and formatting

---

## Phase 3: Production Deployment (Duration: 30 minutes)

Once staging passes all criteria, proceed to production.

### Step 3.1: Validate Production Configuration
```bash
# Final validation before going live
node scripts/validate-env.mjs production
```

### Step 3.2: Deploy to Production
```bash
# Build production version
npm run build

# Deploy to production (main branch)
vercel --prod --token $VERCEL_TOKEN
```

**Expected:**
- Deployment completes without errors
- Production URL shows "Ready" status in Vercel dashboard

### Step 3.3: Verify Production Endpoints
```bash
# Validate all endpoints operational in production
node scripts/verify-production-wiring.mjs https://newspulse-ai-production.vercel.app
```

### Step 3.4: Enable Cron Job (60-second interval)

Create external cron service to poll error collection every 60 seconds:

```bash
# Option 1: Use EasyCron.com
# 1. Visit https://www.easycron.com
# 2. Create new cron job
# 3. URL: https://newspulse-ai-production.vercel.app/api/production-error-collection/cron?cron_secret=$CRON_SECRET
# 4. Interval: Every 60 seconds
# 5. Save

# Option 2: Use cron.is
# Similar process at https://cron.is
```

### Step 3.5: Monitor Initial Deployment (First 2 hours)

```bash
# Watch for any errors during initial production run
vercel logs newspulse-ai --follow

# Check incident detection is working
curl https://newspulse-ai-production.vercel.app/api/health
# Should return: { "status": "healthy" }

# Verify Supabase logging
# Login to Supabase → Project → Inspect incidents table
# Should show entries as incidents are detected/resolved
```

---

## Phase 4: Pilot Launch (Duration: 48 hours)

With production validated, begin pilot launch with 5-10% of traffic.

### Step 4.1: Configure Traffic Split
```bash
# Option 1: Vercel Deployment Splitting
# Deploy new version as "pilot" deployment
vercel deploy --name pilot --token $VERCEL_TOKEN

# Route 5-10% of traffic to pilot, 90-95% to stable via Vercel
# (Configure in Vercel dashboard → Deployments → Traffic split)

# Option 2: Manual Canary (if no traffic splitting available)
# Deploy to separate deployment and monitor error rates
# - Monitor: error rate, MTTD, MTTR, alert delivery
# - If healthy after 2 hours: increase to 20% of traffic
# - If healthy after 4 hours: increase to 50% of traffic
# - If healthy after 8 hours: rollout to 100% of traffic
```

### Step 4.2: Monitor Pilot Metrics (Continuous)

```bash
# Dashboard: https://newspulse-ai-production.vercel.app/dashboard

# Metrics to watch:
# - Error rate: Should remain < 1% during pilot
# - Incident detection rate: Should be > 95% (when errors occur)
# - Alert delivery: Should be 100% (check email + Slack)
# - Remediation success rate: Should be > 90%
# - False positive rate: Should be < 5%

# Daily checklist during pilot:
# ☐ Check Supabase incidents table for entries
# ☐ Verify alerts being delivered
# ☐ Review GitHub issues being created
# ☐ Monitor Vercel logs for errors
# ☐ Check performance (should add < 100ms latency)
```

### Step 4.3: Pilot Success Criteria

All of the following must be true for 24 hours:

- ✓ Error rate < 1%
- ✓ Incident detection accuracy > 95%
- ✓ Alert delivery 100%
- ✓ No cascading failures
- ✓ MTTD < 30 seconds (when incidents occur)
- ✓ MTTR < 120 seconds (when incidents occur)
- ✓ False positive rate < 5%
- ✓ Founder approves via dashboard review

### Step 4.4: Gradual Rollout (After 24 hours pilot success)

```
Hour 0-24:    5-10% of traffic (pilot phase)
Hour 24-48:   20% of traffic (early adopters)
Hour 48-72:   50% of traffic (half rollout)
Hour 72+:     100% of traffic (full production)
```

At each stage:
- ☐ Monitor error rate
- ☐ Verify incident detection working
- ☐ Confirm alert delivery
- ☐ Check performance impact
- ☐ Review GitHub issues created

### Step 4.5: Full Rollout Criteria

Proceed to next traffic tier only if ALL conditions met:

- ✓ No increase in error rate
- ✓ Detection accuracy maintained > 95%
- ✓ Alerts delivered reliably
- ✓ No false positive spike
- ✓ Founder approval

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

If critical issue detected:

```bash
# 1. Disable cron job (stops error collection)
# Visit EasyCron or cron.is dashboard, delete job

# 2. Disable war games endpoint (optional, stops synthetic tests)
# Set environment variable: WAR_GAMES_ENABLED=false in Vercel

# 3. Revert to previous deployment
vercel rollback

# 4. Verify health endpoint
curl https://newspulse-ai-production.vercel.app/api/health
# Should return: { "status": "healthy" }

# 5. Notify Founder
# Email + Slack about rollback reason
```

### Partial Rollback (Traffic split)

If only affecting portion of traffic:

```bash
# Reduce traffic to affected deployment to 0%
# Keep stable deployment at 100%
# This immediately stops incident from affecting users

# Then debug and re-deploy fix
```

### Data Integrity Check

After rollback, verify no data loss:

```bash
# Check Supabase tables
psql "$SUPABASE_DB_URL" -c "
  SELECT COUNT(*) FROM incidents;
  SELECT COUNT(*) FROM error_patterns;
  SELECT COUNT(*) FROM alerts;
"

# All counts should remain unchanged (no data deletion)
```

---

## Troubleshooting

### Cron Job Not Running

**Symptom:** Error collection not executing at 60-second intervals

```bash
# 1. Verify cron job is active
# Visit EasyCron.com or cron.is dashboard
# Confirm job is enabled and scheduled

# 2. Check logs
vercel logs newspulse-ai --grep "error-collection"

# 3. Manually trigger to test
curl "https://newspulse-ai-production.vercel.app/api/production-error-collection/cron?cron_secret=$CRON_SECRET"
# Should return: { "success": true, "collected": N }

# 4. If manual works but scheduled doesn't
# Re-create cron job with correct URL
```

### Alerts Not Delivering

**Symptom:** Critical incidents not alerting Founder

```bash
# 1. Validate email configuration
node scripts/validate-env.mjs production

# 2. Test email send directly
curl -X POST https://newspulse-ai-production.vercel.app/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"severity": "critical"}'

# 3. Check email provider status
# - SendGrid: https://status.sendgrid.com/
# - AWS SES: AWS console → SES → Sending statistics

# 4. Check spam folder in email client

# 5. If still failing, switch to console logging
# Set EMAIL_PROVIDER=log in Vercel
# Then check Vercel logs for alert output
# Fix provider setup, re-enable
```

### Detection Too Slow

**Symptom:** MTTD > 30 seconds

```bash
# 1. Check cron interval
# Verify EasyCron/cron.is job running every 60 seconds

# 2. Check Vercel cold start time
# Should be < 5 seconds for this function

# 3. If cold starts are slow
# Deploy to faster region in Vercel dashboard
# Or increase cron frequency to 30-second interval
```

### False Positives Spiking

**Symptom:** Alerts for non-issues

```bash
# 1. Review error patterns in Supabase
psql "$SUPABASE_DB_URL" -c "SELECT * FROM error_patterns LIMIT 10;"

# 2. Check fingerprinting logic
# Is it grouping unrelated errors together?
# Look at fingerprint column - should be consistent

# 3. Adjust severity thresholds
# Edit lib/error-tracking.ts → getSeverityFromStatus()
# Re-deploy if needed

# 4. Review recent incidents
# Dashboard: https://newspulse-ai-production.vercel.app/dashboard
# Look for patterns in false positives
```

---

## Verification Checklist

### Pre-Deployment
- ☐ GitHub Actions enabled in organization
- ☐ Supabase schema deployed with all 6 tables
- ☐ All environment variables set in Vercel
- ☐ Email provider tested locally
- ☐ CRON_SECRET generated and stored

### Staging Validation
- ☐ Endpoints verified operational
- ☐ All 5 war game scenarios passed
- ☐ MTTD < 30 seconds measured
- ☐ MTTR < 120 seconds measured
- ☐ Email alerts working
- ☐ GitHub issue creation working
- ☐ Slack webhooks working (if configured)

### Production Deployment
- ☐ Production build successful
- ☐ Deployment URL ready in Vercel
- ☐ All endpoints verified in production
- ☐ Cron job configured and running
- ☐ Supabase connection verified
- ☐ First incident log entry visible in database
- ☐ Health endpoint responding correctly

### Pilot Launch (First 24 hours)
- ☐ Error rate < 1%
- ☐ Detection accuracy > 95%
- ☐ Alerts delivering reliably
- ☐ No cascading failures
- ☐ Logs clean (no recurring errors)
- ☐ Founder approval on dashboard

### Gradual Rollout
- ☐ Each traffic tier increase approved
- ☐ Metrics validated at each tier
- ☐ Performance acceptable (< 100ms added latency)
- ☐ Error rate unchanged after increase
- ☐ Founder sign-off at 100% rollout

---

## Success Metrics

After full production deployment:

| Metric | Target | Verification |
|--------|--------|---|
| MTTD | < 30s | Check `incidents` table, measure detection time |
| MTTR | < 120s | Check `orchestrations` table, measure recovery time |
| Alert Delivery | 100% | Check `alerts` table, verify 1 alert per incident |
| Issue Creation | 100% | Check GitHub, verify issue per critical incident |
| False Positive Rate | < 5% | Review incidents, calculate false positives |
| Uptime | > 99.5% | Monitor Vercel deployments, check error rate |
| Detection Accuracy | > 95% | Verify incidents detected within SLA |
| Error Handling | 100% | No cascading failures or silent failures |

---

## Support & Escalation

If issues arise during deployment:

1. **Technical Issues:** Check troubleshooting section above
2. **Environment Problems:** Verify prerequisite configuration
3. **Performance:** Check Vercel dashboard for resource usage
4. **Critical Blocker:** Disable cron job immediately, rollback deployment
5. **Founder Decision:** Contact Founder via email or Slack

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-11  
**Status:** Ready for execution
