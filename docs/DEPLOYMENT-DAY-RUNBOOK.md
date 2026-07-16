# Deployment Day Runbook

**Purpose:** Minute-by-minute script for production launch day  
**Duration:** 2 hours total (30 min deploy + 90 min monitoring)  
**Status:** Ready to execute

---

## 📋 Pre-Deployment (Do Before Starting)

**☐ Prerequisites all complete?**
- GitHub Actions billing: ✅ Enabled
- Supabase schema: ✅ Deployed
- Environment variables: ✅ Set in Vercel
- Pre-deployment check: ✅ Passing

If any unchecked, **STOP** and complete prerequisites first (see [FOUNDER-ACTION-BOARD.md](FOUNDER-ACTION-BOARD.md))

**☐ Ready to proceed?** Y / N

---

## Timeline: Deployment (0:00 - 0:30)

### 0:00 - Start: Verify Everything Ready

**Action:**
1. Open terminal
2. Navigate to repo: `cd ~/newspulse-ai`
3. Run pre-check: `node scripts/pre-deployment-check.mjs`

**Expected output:**
```
✅ READY FOR DEPLOYMENT
Pass Rate: 100%
```

**If you see ❌:** Fix issue and rerun before proceeding

**Duration:** 1 minute

---

### 0:01 - Fetch Latest Code

**Action:**
```bash
git fetch origin main
git checkout main
git pull origin main
```

**Expected output:**
```
Already on 'main'
Your branch is up to date with 'origin/main'
```

**Duration:** 1 minute

---

### 0:02 - Build Locally

**Action:**
```bash
npm run build
npm run test
```

**Expected output:**
```
Test Files  57 passed (57)
Tests  1013 passed (1013)
```

**If build fails:** Something is wrong with your local environment
- Verify Node version: `node --version` (should be 18+)
- Clear cache: `rm -rf node_modules && npm install`
- Rebuild: `npm run build`

**Duration:** 3-5 minutes

---

### 0:07 - Deploy to Vercel

**Action (Pick ONE):**

**Option A: Deploy via CLI (Recommended)**
```bash
vercel --prod
```

**Option B: Merge PR via GitHub** (auto-deploys in 2 min)
- Go to: https://github.com/mininglife7-dev/newspulse-ai/pull/92
- Click: "Merge pull request"
- Wait for Vercel to deploy automatically

**Expected output:**
- CLI shows: "Vercel CLI X.Y.Z"
- Asks: "Want to deploy to production?" → Type `y`
- Shows deployment URL
- Vercel dashboard shows status changing: "Building" → "Ready"

**Duration:** 1-2 minutes (deploy) + wait for build to complete

---

### 0:10 - Monitor Build on Vercel

**Action:**
1. Open: https://vercel.com/mininglife7-dev/newspulse-ai
2. Watch the Deployment section
3. Status should change: Building → Ready

**Watch for:** 
- ✅ If status shows "Ready" → GOOD, proceed
- ❌ If status shows "Error" → Deployment failed, see troubleshooting below

**Estimated build time:** 1-3 minutes

**Duration:** 3 minutes (watching)

---

### 0:13 - Verify Production Deployment

**Action: Test health endpoints**

```bash
# 1. Basic health
curl https://newspulse-ai-production.vercel.app/api/health

# 2. Database health
curl https://newspulse-ai-production.vercel.app/api/health/db

# 3. War games (verify production secret works)
curl https://newspulse-ai-production.vercel.app/api/war-games?action=scenarios \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"
```

**Expected responses:**
```
# Health: {"status": "healthy"}
# DB: {"database": "connected"}
# War games: {"total": 6, "scenarios": [...]}
```

**If any fails:** Check environment variables are set in Vercel, verify they're reachable from production

**Duration:** 2 minutes

---

### 0:15 - Test Email Configuration

**Action:**
```bash
curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
  -H "Content-Type: application/json"
```

**Expected:** Email arrives in your inbox within 10 seconds

**Check:** Your email inbox for test alert

**If email doesn't arrive:**
1. Check spam folder
2. Verify SENDGRID_API_KEY is correct
3. Check Vercel logs: `vercel logs newspulse-ai | grep EMAIL`

**Duration:** 2 minutes

---

## Timeline: Configure Cron (0:15 - 0:20)

### 0:15 - Set Up External Cron Job

**Go to:** https://www.easycron.com

**Steps:**
1. Login / Sign up (free)
2. Click "Create Cron Job"
3. Enter:
   - **URL:** `https://newspulse-ai-production.vercel.app/api/production-error-collection/cron`
   - **Method:** POST
   - **Header Name:** Authorization
   - **Header Value:** Bearer [CRON_SECRET from env vars]
   - **Cron:** `*/1 * * * *` (every minute)
4. Click "Save"

**Verification:**
- EasyCron shows "Next execution in X seconds"
- Last execution timestamp appears

**Duration:** 3-5 minutes

---

### 0:20 - Verify Cron Runs

**Action:**
```bash
# Wait 60 seconds for cron to run
sleep 60

# Check logs
vercel logs newspulse-ai --grep "error-collection-cron"
```

**Expected output:**
```
[error-collection-cron] Collected N error patterns in Xms
```

**If no output:**
1. Check EasyCron dashboard - did it execute?
2. Verify CRON_SECRET matches between Vercel and EasyCron
3. Check if job status is "Active"

**Duration:** 2 minutes

---

## Timeline: Pilot Monitoring Begins (0:20 - 2:00)

### Hour 1 Checklist (0:20 - 1:20)

**At 0:20 (Right after cron setup):**

- [ ] Cron job visible in logs
- [ ] Health check responding
- [ ] Database connected
- [ ] Email configuration tested

**At 1:00 (40 min after start):**

```bash
# Check database for incidents
psql "postgresql://[CONNECTION_STRING]" \
  -c "SELECT COUNT(*) FROM incidents WHERE created_at > NOW() - INTERVAL '1 hour';"

# Should see: at least 1-5 incidents
```

- [ ] Incidents are being detected
- [ ] Error patterns being collected
- [ ] Vercel logs show no critical errors

**Status:** ⏳ If all checks passing, continue to Hour 6

---

### Hour 6 Checklist (1:20 - 2:00, or actual time +6 hours)

**At 2:00 (40 min into hour 6):**

**Action:**
```bash
# Count incidents
psql "postgresql://[CONNECTION_STRING]" \
  -c "SELECT COUNT(*) FROM incidents WHERE created_at > NOW() - INTERVAL '6 hours';"

# Check alert delivery
psql "postgresql://[CONNECTION_STRING]" \
  -c "SELECT COUNT(*) FILTER (WHERE delivery_status='sent') as delivered, COUNT(*) as total FROM alerts WHERE created_at > NOW() - INTERVAL '6 hours';"

# Check recovery times
psql "postgresql://[CONNECTION_STRING]" \
  -c "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as recovery_time_sec FROM orchestrations WHERE execution_status='succeeded' AND created_at > NOW() - INTERVAL '6 hours';"
```

**Expected outputs:**
- Incidents: 10-100+ (depends on error rate in this period)
- Alerts delivered: 100% (all sent successfully)
- Recovery time: < 120 seconds average

**Verify:**
- [ ] Incidents detected: YES
- [ ] Alerts sent: YES (check email)
- [ ] No cascading failures: YES

**Status:** ⏳ Monitoring will continue. Hour 24 is tomorrow morning.

---

## Timeline: Ongoing Monitoring (Next 24 Hours)

### Hour 24 Checklist (Tomorrow Morning)

**At 24 hours after deployment:**

1. **Overall Stability:**
   ```bash
   # Check error rate in Vercel
   vercel analytics newspulse-ai | grep "Error Rate"
   ```

2. **Database Queries:**
   ```bash
   # Total incidents in 24 hours
   psql "postgresql://[CONNECTION_STRING]" \
     -c "SELECT COUNT(*) FROM incidents WHERE created_at > NOW() - INTERVAL '24 hours';"
   
   # Alert delivery rate
   psql "postgresql://[CONNECTION_STRING]" \
     -c "SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status='sent') / COUNT(*), 1) as delivery_rate FROM alerts WHERE created_at > NOW() - INTERVAL '24 hours';"
   
   # Average detection time (should be < 30s)
   psql "postgresql://[CONNECTION_STRING]" \
     -c "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as detection_time_sec FROM incidents WHERE created_at > NOW() - INTERVAL '24 hours';"
   ```

3. **Check for Issues:**
   ```bash
   # Any 500 errors?
   vercel logs newspulse-ai | grep "500" | wc -l
   
   # Any ERROR logs?
   vercel logs newspulse-ai | grep "ERROR" | wc -l
   ```

4. **Verify Cron Consistency:**
   ```bash
   # Cron should have run ~1440 times (60 sec × 60 min × 24 hours)
   vercel logs newspulse-ai --grep "error-collection-cron" | wc -l
   ```

---

## 🚨 Troubleshooting During Deployment

### Issue: Vercel Build Failed

**Symptoms:** Deployment shows "Error" status

**Fix:**
1. Click "Error" link in Vercel dashboard
2. Read error message in build logs
3. Common issues:
   - Node version mismatch → Run `node --version`
   - npm install failed → Run `rm -rf node_modules && npm install && npm run build`
   - TypeScript error → Run `npm run type-check` to see details

**Escalation:** See [DISASTER-RECOVERY-PROCEDURES.md](DISASTER-RECOVERY-PROCEDURES.md) → Deployment Failures

---

### Issue: Health Check Failing

**Symptoms:** `curl https://newspulse-ai-production.vercel.app/api/health` returns error

**Fix:**
1. Wait 30 seconds (cold start)
2. Retry curl command
3. If still failing, check:
   ```bash
   vercel logs newspulse-ai --follow
   ```
4. Look for errors, fix, redeploy

**Escalation:** See [DISASTER-RECOVERY-PROCEDURES.md](DISASTER-RECOVERY-PROCEDURES.md) → API Endpoint Failures

---

### Issue: Cron Job Not Running

**Symptoms:** No incidents detected after 1 hour

**Fix:**
1. Go to EasyCron dashboard
2. Check job status - is it "Active"?
3. Check "Last Execution" - is it recent (< 60 sec ago)?
4. If not, manually trigger test:
   ```bash
   curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
5. If fails, verify CRON_SECRET matches

**Escalation:** See [INCIDENT-RESPONSE-RUNBOOKS.md](INCIDENT-RESPONSE-RUNBOOKS.md) → Cron Job Not Running

---

### Issue: Emails Not Arriving

**Symptoms:** Test email doesn't arrive or critical alerts missing

**Fix:**
1. Check spam folder (Gmail, etc.)
2. Verify email address: `echo $FOUNDER_EMAIL`
3. Test manually:
   ```bash
   curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
     -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"
   ```
4. Check Vercel logs:
   ```bash
   vercel logs newspulse-ai | grep EMAIL
   ```
5. If SendGrid error, check API key:
   ```bash
   curl -X GET https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

**Escalation:** See [DISASTER-RECOVERY-PROCEDURES.md](DISASTER-RECOVERY-PROCEDURES.md) → Email Provider Failures

---

## ✅ Decision: Go/No-Go for Production

### After Hour 24, You'll Have Data

**Go Criteria (Proceed to Full Rollout):**
- ✅ MTTD (detection) < 30 seconds
- ✅ MTTR (recovery) < 120 seconds
- ✅ Alert delivery rate > 99%
- ✅ No 500 errors
- ✅ Cron ran every 60 seconds consistently

**No-Go Criteria (Investigate Further):**
- ❌ MTTD > 60 seconds
- ❌ MTTR > 180 seconds
- ❌ Alert delivery < 95%
- ❌ Multiple 500 errors
- ❌ Cron skipped any cycles

---

## 📞 If Something Goes Wrong

**During deployment (0:00-0:20):**
- See: [DISASTER-RECOVERY-PROCEDURES.md](DISASTER-RECOVERY-PROCEDURES.md) → Deployment Failures

**During Hour 1-6 pilot:**
- See: [INCIDENT-RESPONSE-RUNBOOKS.md](INCIDENT-RESPONSE-RUNBOOKS.md) → find matching scenario

**During Hour 24+ monitoring:**
- See: [INCIDENT-RESPONSE-RUNBOOKS.md](INCIDENT-RESPONSE-RUNBOOKS.md) for ongoing issues
- See: [MONITORING-SETUP.md](MONITORING-SETUP.md) for metrics interpretation

**Not sure what to do?**
- Check: [DOCUMENTATION-NAVIGATION.md](DOCUMENTATION-NAVIGATION.md) for index
- Or: Start with [docs/README.md](README.md)

---

## Summary: What You're Doing

1. **Deploy code to Vercel** (includes all security hardening, monitoring, incident response)
2. **Set up external cron** to run error collection every 60 seconds
3. **Monitor for 24 hours** to verify system meets performance targets
4. **Make go/no-go decision** for full production rollout

**Total time commitment:**
- Deployment day: 2 hours (30 min active + 90 min watching logs)
- Following 24 hours: ~30 min for Hour 24 verification checklist
- Following weeks: ~15 min daily for health checks

---

## Completion Checklist

**Before deploying:**
- [ ] Prerequisites complete (GitHub Actions, Supabase, env vars)
- [ ] Pre-deployment check passing
- [ ] All documentation reviewed

**After deployment:**
- [ ] Build completed (status = "Ready")
- [ ] Health checks passing
- [ ] Email test successful
- [ ] Cron job created and running

**Hour 1-6 checks:**
- [ ] Incidents detected
- [ ] Alerts delivered
- [ ] No cascading failures

**Hour 24 verification:**
- [ ] 24+ hours of stable operation
- [ ] Metrics on target (MTTD < 30s, MTTR < 120s, etc.)
- [ ] Go/No-Go decision made

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Status:** Production Ready

---

**Ready to deploy?** Start at **0:00 - Start: Verify Everything Ready** above.

**Questions?** See [DOCUMENTATION-NAVIGATION.md](DOCUMENTATION-NAVIGATION.md) for full index.
