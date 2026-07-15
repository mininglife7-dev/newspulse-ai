# Deployment Quick Start — Copy-Paste Commands
**For:** After founder approves 3 prerequisites  
**Time:** ~4 hours (mostly automated)  
**Risk:** Low (instant rollback available)

---

## Pre-Deployment Checklist

Before starting, verify:
- [ ] Founder approved 3 prerequisites
- [ ] GitHub Actions billing enabled ($50/month cap)
- [ ] Supabase production database accessible
- [ ] Environment variables set in Vercel (VERCEL_API_TOKEN, CRON_SECRET, etc.)
- [ ] SUPABASE_DB_URL set locally (for schema deployment)

---

## Phase 1: Configuration Validation (5 minutes)

### Step 1.1: Validate Environment Variables

```bash
# Verify all required variables are set
node scripts/validate-env.mjs production
```

**Expected output:**
```
✓ VERCEL_API_TOKEN: vercel_...
✓ CRON_SECRET: abc123...
✓ FOUNDER_EMAIL: lalit@...
✓ EMAIL_PROVIDER: sendgrid
✓ SENDGRID_API_KEY: SG.xxx...
✓ GITHUB_TOKEN: ghp_...

✅ ALL REQUIRED VARIABLES SET
```

### Step 1.2: Deploy Supabase Schema

```bash
# Dry run to see what will be deployed
node scripts/deploy-supabase-schema.mjs --dry-run
```

**Expected output:**
```
[dry-run] Tables to be created:
  - incidents
  - error_patterns
  - orchestrations
  - alerts
  - post_mortems
  - prevention_measures

[dry-run] Schema deployment ready
```

If dry-run passes, execute actual deployment:

```bash
# Execute the deployment
node scripts/deploy-supabase-schema.mjs
```

**Expected output:**
```
[deployment] Creating tables...
[deployment] ✓ incidents table created
[deployment] ✓ error_patterns table created
[deployment] ✓ orchestrations table created
[deployment] ✓ alerts table created
[deployment] ✓ post_mortems table created
[deployment] ✓ prevention_measures table created

✅ ALL 6 TABLES CREATED SUCCESSFULLY
```

### Step 1.3: Verify Database Connection

```bash
# Test Supabase connection
psql "$SUPABASE_DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```

**Expected output:**
```
        table_name
──────────────────
 alerts
 error_patterns
 incidents
 orchestrations
 post_mortems
 prevention_measures
(6 rows)
```

---

## Phase 2: Staging Validation (45 minutes)

### Step 2.1: Build Production Version

```bash
# Verify production build succeeds
npm run build
```

**Expected output:**
```
> next build

  ▲ Next.js 14.x.x
  ✓ Creating an optimized production build
  ✓ Compiled successfully
  ...
✓ Preload requests for static files: 1234ms

Build complete. Measurements:
  Pages with Build Log Warnings: 0

✨ Done in 45.23s
```

### Step 2.2: Deploy to Staging (via Vercel CLI)

```bash
# Pull staging environment variables
vercel env pull

# Deploy to staging
vercel
```

**Expected output:**
```
Vercel CLI 31.x.x
? Set up and deploy "~/newspulse-ai"? [Y/n] y
? Which scope should contain your project? [your-org]
? Link to existing project? [Y/n] n
? What's your project's name? newspulse-ai-staging
...
✓ Staging deployment ready at: https://newspulse-ai-staging.vercel.app
```

### Step 2.3: Verify Staging Endpoints

```bash
# Test all critical endpoints in staging
node scripts/verify-production-wiring.mjs https://newspulse-ai-staging.vercel.app
```

**Expected output:**
```
PRODUCTION WIRING VERIFICATION

Testing: https://newspulse-ai-staging.vercel.app

✓ Health Check (GET /api/health)
  Status: 200 ✓
  Response time: 45ms ✓

✓ Error Collection (POST /api/production-error-collection/cron)
  Status: 200 ✓
  Response time: 120ms ✓

✓ Production Wiring (POST /api/production-wiring)
  Status: 200 ✓
  Response time: 85ms ✓

✓ Metrics (GET /api/metrics)
  Status: 200 ✓
  Response time: 30ms ✓

Results: 4 passed, 0 failed

✅ All critical endpoints verified
```

### Step 2.4: Run War Games

```bash
# Execute 5 synthetic incident scenarios
node scripts/run-war-games.mjs https://newspulse-ai-staging.vercel.app --report
```

**Expected output:**
```
🎮 WAR GAMES: Testing incident response automation

🎮 Scenario 1: Deployment Schema Mismatch
   Injecting error...
   ✓ Detected in 2341ms (target: <5000ms) ✓
   ✓ Recovered in 8234ms (target: <15000ms) ✓
   ✓ PASSED

🎮 Scenario 2: Connection Pool Exhaustion
   Injecting error...
   ✓ Detected in 4567ms (target: <10000ms) ✓
   ✓ Recovered in 25123ms (target: <30000ms) ✓
   ✓ PASSED

[... 3 more scenarios ...]

SUMMARY
═══════
Total Scenarios: 5
Passed: 5
Failed: 0

✅ All scenarios passed. SLA targets met.
```

### Step 2.5: Test Email Alerting

```bash
# Send test alert to verify email delivery
curl -X POST https://newspulse-ai-staging.vercel.app/api/test-alert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "severity": "critical",
    "description": "Test alert from staging validation"
  }'
```

**Expected output:**
```json
{
  "success": true,
  "message": "Alert sent successfully",
  "channels": ["email", "slack"],
  "deliveryTime": 450
}
```

**Verification:**
- [ ] Test email arrives at FOUNDER_EMAIL within 2 minutes
- [ ] Check spam folder if not in inbox
- [ ] (If Slack configured) Webhook message appears in Slack channel

### Step 2.6: Go/No-Go Decision

```bash
# Run deployment readiness verification
node scripts/verify-deployment-readiness.mjs staging
```

**Expected output:**
```
✓ All 10+ checks passed
✓ DEPLOYMENT READY

Next steps:
1. Run: node scripts/verify-production-wiring.mjs https://newspulse-ai-production.vercel.app
2. Run war games in production
3. Enable cron job
4. Monitor pilot launch
```

**Decision:** Can we proceed to production deployment?
- [ ] Error rate: 0% ✓
- [ ] All endpoints working ✓
- [ ] War games passed ✓
- [ ] Email alerts working ✓
- [ ] SLA targets met ✓
- **Go / No-Go:** ________ (approval)

---

## Phase 3: Production Deployment (30 minutes)

### Step 3.1: Final Production Build

```bash
# Build final production version
npm run build
```

**Expected:** Build succeeds with zero errors

### Step 3.2: Deploy to Production

```bash
# Deploy to production (main branch via Vercel)
vercel --prod --token $VERCEL_TOKEN
```

**Expected output:**
```
Vercel CLI 31.x.x
> Deploying ~/newspulse-ai
✓ Production deployment ready
✓ URL: https://newspulse-ai-production.vercel.app

Congratulations! Your project has been deployed.
```

### Step 3.3: Verify Production Endpoints

```bash
# Validate all endpoints in production
node scripts/verify-production-wiring.mjs https://newspulse-ai-production.vercel.app
```

**Expected:** All 4 endpoints passing ✓

### Step 3.4: Test Production Health Check

```bash
# Verify production health endpoint
curl https://newspulse-ai-production.vercel.app/api/health

# Expected response:
# { "status": "healthy" }
```

### Step 3.5: Enable Cron Job (60-second interval)

Choose one of two options:

**Option A: Use EasyCron.com (Recommended)**

1. Visit https://www.easycron.com
2. Click "Cron Jobs" → "Create a new cron job"
3. Fill in:
   - **Cron Job URL:** `https://newspulse-ai-production.vercel.app/api/production-error-collection/cron?cron_secret=$CRON_SECRET`
   - **Cron Expression:** `*/1 * * * *` (every 1 minute)
   - **HTTP Method:** GET
   - **Timeout:** 30 seconds
4. Click "Create"
5. Save the cron job ID for reference

**Option B: Use cron.is**

1. Visit https://cron.is
2. Click "Create New Job"
3. Fill in same URL and interval as above
4. Click "Create Job"

**Verification:**

```bash
# Check that cron job is running by looking at logs
vercel logs newspulse-ai --follow

# You should see requests from cron service every 60 seconds:
# GET /api/production-error-collection/cron [200] 120ms
```

### Step 3.6: Monitor First Deployment (2 hours)

```bash
# Watch production logs
vercel logs newspulse-ai --follow

# Expected output every 60 seconds:
# [api/production-error-collection/cron] Collecting errors... found N errors
# [api/production-error-collection/cron] Processing N error patterns
# [api/production-error-collection/cron] Complete in 250ms
```

Check metrics endpoint:

```bash
# Check system metrics
curl https://newspulse-ai-production.vercel.app/api/metrics?format=text

# Expected:
# Total Incidents: 0 (or N if natural errors occurred)
# Success Rate: N%
# MTTD: Nms
# MTTR: Nms
```

---

## Phase 4: Pilot Launch (48 hours)

### Step 4.1: Enable Traffic Split (5-10% to incident response)

**Via Vercel Dashboard:**
1. Log into Vercel dashboard
2. Select newspulse-ai project
3. Go to Deployments
4. Select latest production deployment
5. Click "Manage" → "Traffic Split" or "Promote"
6. Set to route 5-10% to incident response system
7. 90-95% to stable deployment
8. Save

**Or: Use Vercel CLI**

```bash
# List recent deployments
vercel deployments

# Promote incident response deployment to get traffic
vercel promote <deployment-url> --traffic 10
```

### Step 4.2: Monitor Pilot Phase (Every 5-30 minutes for 48 hours)

**First 2 hours (5-10% traffic):**

```bash
# Check metrics every 5 minutes
watch -n 300 'curl -s https://newspulse-ai-production.vercel.app/api/metrics | jq .'

# Or manually:
curl https://newspulse-ai-production.vercel.app/api/metrics?format=text
```

**Look for:**
- Error rate: Should be 0% or stable
- Incident count: Should be 0 (or same as main app)
- Alert delivery: 100% (if any incidents)
- No cascading failures

**Hours 2-8 (increase to 20% traffic):**

```bash
# If all metrics look good after 2 hours, increase traffic
vercel promote <deployment-url> --traffic 20

# Continue monitoring every 10 minutes
```

**Hours 8-24 (increase to 50% traffic):**

```bash
# If still healthy, increase to 50%
vercel promote <deployment-url> --traffic 50

# Monitor every 15 minutes
```

**Hours 24-48 (increase to 100% traffic):**

```bash
# If SLA targets met (MTTD < 30s, MTTR < 120s), go to 100%
vercel promote <deployment-url> --traffic 100

# Monitor every 30 minutes
```

### Step 4.3: Monitor Dashboards During Pilot

**Vercel Metrics:**
```bash
# Check error rate, latency, invocations
# Dashboard: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
```

**Supabase Incident Log:**
```bash
# Check incidents being collected
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) as incident_count FROM incidents;"

# Check error patterns
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) as pattern_count FROM error_patterns;"

# Check alerts sent
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) as alerts_sent FROM alerts;"
```

**Metrics Endpoint:**
```bash
# Real-time metrics (every 30 minutes during pilot)
curl https://newspulse-ai-production.vercel.app/api/metrics?format=text
```

### Step 4.4: Pilot Success Criteria

After 48 hours at 100% traffic, verify:

- [ ] Error rate: < 0.1% (unchanged from baseline)
- [ ] Incident detection accuracy: > 95% (when errors occur)
- [ ] Alert delivery: 100% (all incidents notified)
- [ ] MTTD: < 30 seconds (when incidents occur)
- [ ] MTTR: < 120 seconds (when incidents occur)
- [ ] False positive rate: < 5%
- [ ] No cascading failures observed
- [ ] Supabase logging working (incidents table has entries)
- [ ] GitHub issues creating properly (postmortem labels)
- [ ] Performance impact: < 100ms added latency

**Decision:** Is pilot successful?
- [ ] YES - Proceed to 100% production rollout
- [ ] NO - Investigate and fix issues before rollout

---

## Emergency Rollback (< 5 minutes)

If critical issues detected at any time:

```bash
# Option 1: Disable cron job (stops all incident detection)
# Log into EasyCron.com or cron.is and delete the job

# Option 2: Revert to previous deployment
vercel rollback

# Option 3: Reduce traffic to incident response to 0%
vercel promote <stable-deployment-url> --traffic 100

# Verify health after rollback
curl https://newspulse-ai-production.vercel.app/api/health
# Expected: { "status": "healthy" }
```

---

## Post-Deployment Verification

After successful pilot launch:

```bash
# Run final readiness check
node scripts/verify-deployment-readiness.mjs production

# Expected output:
# ✓ DEPLOYMENT SUCCESSFUL
# ✓ All systems operational
# ✓ 24/7 automated incident response active
```

---

## Troubleshooting During Deployment

### Cron Job Not Firing

```bash
# Verify cron job is enabled in EasyCron/cron.is
# Check Vercel logs for errors:
vercel logs newspulse-ai --grep "error-collection"

# Manually trigger to test:
curl "https://newspulse-ai-production.vercel.app/api/production-error-collection/cron?cron_secret=$CRON_SECRET"
# Expected: { "success": true, "collected": N }
```

### Alerts Not Delivering

```bash
# Test email delivery:
curl -X POST https://newspulse-ai-production.vercel.app/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"severity": "critical", "description": "Test"}'

# Check email provider status:
# SendGrid: https://status.sendgrid.com/
# AWS SES: AWS Console → SES → Sending statistics
```

### War Games Failing

```bash
# Re-run war games with verbose output:
node scripts/run-war-games.mjs https://newspulse-ai-production.vercel.app --report --verbose

# Check for slow detection/recovery times
# Adjust if needed: increase cron frequency to 30s interval
```

---

## Next: Monitor & Learn

After successful 100% rollout:

1. **Daily monitoring** (first week)
   - Check incident count in Supabase
   - Review GitHub issues created
   - Monitor MTTD/MTTR metrics

2. **Weekly review** (ongoing)
   - Review post-mortems created
   - Adjust thresholds if needed
   - Track false positive trends

3. **Monthly optimization**
   - Analyze incident patterns
   - Update runbooks with learnings
   - Fine-tune fingerprinting logic

---

**Total Time from Prerequisites Approval to Full Production: ~48 hours**

All commands are copy-paste ready. Follow each step in order. Verify output matches expected before proceeding to next step.

**Status: READY FOR DEPLOYMENT**
