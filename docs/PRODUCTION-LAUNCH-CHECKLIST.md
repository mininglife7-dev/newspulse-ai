# Production Launch Checklist

**Purpose:** Final verification before production deployment  
**Timeline:** 4 hours from prerequisite approval to pilot launch  
**Decision Gate:** Founder Go/No-Go decision  
**Status:** Ready for execution

---

## Pre-Launch (FOUNDER ACTION REQUIRED)

### Prerequisites - Must Complete Before Proceeding

- [ ] **GitHub Actions Billing Enabled** (2 min)
  - [ ] Go to GitHub → Organization Settings → Billing & plans
  - [ ] Enable GitHub Actions
  - [ ] Set spend cap: $50/month
  - Verification: Settings shows "Actions" with green checkmark

- [ ] **Supabase Production Schema Deployed** (5 min)
  - [ ] Have Supabase connection string ready
  - [ ] Run: `psql $DATABASE_URL -c "SELECT 'Connected' as status;"`
  - [ ] Run: `node scripts/deploy-supabase-schema.mjs --dry-run`
  - [ ] Review output, verify tables listed
  - [ ] Run: `node scripts/deploy-supabase-schema.mjs` (commit changes)
  - Verification: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM incidents;"`

- [ ] **Production Environment Variables Set in Vercel** (5 min)
  - [ ] Vercel Dashboard → Project Settings → Environment Variables
  - [ ] Set: VERCEL_API_TOKEN (from Vercel Settings → Tokens)
  - [ ] Set: CRON_SECRET = `openssl rand -hex 32`
  - [ ] Set: FOUNDER_EMAIL = your email
  - [ ] Set: EMAIL_PROVIDER = sendgrid (or ses / log)
  - [ ] Set: SENDGRID_API_KEY (from SendGrid dashboard)
  - [ ] Set: GITHUB_TOKEN (from GitHub Settings → Developer settings)
  - [ ] Set: PRODUCTION_WIRING_SECRET = `openssl rand -hex 32`
  - Verification: `node scripts/pre-deployment-check.mjs` shows all ✓

### Automated Verification

- [ ] **Run Pre-Deployment Check** (1 min)
  ```bash
  node scripts/pre-deployment-check.mjs
  ```
  - [ ] All environment variables present
  - [ ] Email provider configured correctly
  - [ ] Credential formats valid
  - [ ] Critical code files exist
  - [ ] API authentication in place
  - [ ] Email masking implemented
  - [ ] Sensitive data protection verified
  - [ ] Tests passing (1013/1013)

**STOP HERE if any check fails** → Fix issue → Rerun check

---

## Build & Deploy Phase (30 min)

### Code Verification

- [ ] **Verify Latest Main Branch** (2 min)
  ```bash
  git fetch origin main
  git checkout main
  git pull origin main
  ```
  
- [ ] **Local Build Succeeds** (5 min)
  ```bash
  npm run build
  npm run test
  ```
  - [ ] Build completes with no errors
  - [ ] All 1013 tests pass
  - [ ] No TypeScript errors
  - [ ] No ESLint violations
  
### Deployment to Production

- [ ] **Deploy to Vercel Production** (2 min)
  ```bash
  vercel --prod
  ```
  OR merge to main (auto-deploys)
  
  - [ ] Vercel shows "Ready" status
  - [ ] Preview URL working: https://newspulse-ai-production.vercel.app
  - [ ] No build errors in logs

### Health Checks

- [ ] **Verify Core Endpoints** (3 min)
  ```bash
  # Health
  curl https://newspulse-ai-production.vercel.app/api/health
  # Response: {"status": "healthy"}
  
  # Error collection (with CRON_SECRET)
  curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
    -H "Authorization: Bearer $CRON_SECRET"
  # Response: {"success": true, "collected": N}
  
  # Production wiring (with PRODUCTION_WIRING_SECRET)
  curl -X POST https://newspulse-ai-production.vercel.app/api/production-wiring \
    -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
    -H "Content-Type: application/json" \
    -d '{
      "deploymentId":"test",
      "errorMetrics":{"totalErrors":0,"errorRate":0},
      "errorPatterns":[]
    }'
  # Response: 201 Created with incident/orchestration data
  
  # War games (with PRODUCTION_WIRING_SECRET)
  curl https://newspulse-ai-production.vercel.app/api/war-games?action=scenarios \
    -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"
  # Response: {"total": 6, "scenarios": [...]}
  ```

- [ ] **All health checks passing** ✓

---

## External Cron Configuration (5 min)

- [ ] **Configure Error Collection Cron** (5 min)
  
  **Option A: EasyCron (Recommended)**
  - [ ] Go to https://www.easycron.com
  - [ ] Sign up / Login
  - [ ] Click "Create Cron Job"
  - [ ] URL: `https://newspulse-ai-production.vercel.app/api/production-error-collection/cron`
  - [ ] Headers section:
    - [ ] Name: `Authorization`
    - [ ] Value: `Bearer $CRON_SECRET`
  - [ ] Cron Expression: `*/1 * * * *` (every minute)
  - [ ] Timezone: Your timezone
  - [ ] Enable & Save
  - Verification: Check "Last Execution" timestamp updates
  
  **Option B: cron.is**
  - [ ] Go to https://cron.is
  - [ ] Same configuration as EasyCron above

- [ ] **Test Cron Execution** (2 min)
  ```bash
  # Check if cron runs (wait for next minute boundary)
  sleep 60
  
  # Verify in logs
  vercel logs newspulse-ai --grep "error-collection-cron"
  
  # Should see: "Collected N error patterns in Xms"
  ```

---

## Pilot Launch Phase (48 hours)

### Hour 1 Checklist

- [ ] **Cron Job Running** 
  - [ ] Logs show execution (every 60 seconds)
  - [ ] No "Failed to collect" errors
  - [ ] Supabase shows new entries in incidents table
  
- [ ] **No API Errors**
  - [ ] Health check still returning 200
  - [ ] Vercel logs show no 5xx errors
  - [ ] No stack traces in logs
  
- [ ] **Database Connected**
  - [ ] Can query incidents: `SELECT COUNT(*) FROM incidents;`
  - [ ] Can query error_patterns: `SELECT COUNT(*) FROM error_patterns;`
  - [ ] No connection timeouts in logs
  
- [ ] **Email Provider Working**
  - [ ] Send test email: `curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
    -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"`
  - [ ] Check inbox (including spam)
  - [ ] Email arrives within 10 seconds

**Decision Point:** If Hour 1 checklist fails → ROLLBACK (see instructions below)

### Hour 6 Checklist

- [ ] **Incidents Detected & Logged**
  - [ ] At least 5 incidents in `incidents` table
  - [ ] Multiple error patterns in `error_patterns` table
  - [ ] Detection times averaging < 30 seconds (query: `MONITORING-SETUP.md` SQL)
  
- [ ] **Alerts Received**
  - [ ] Critical incident alerts in founder's inbox
  - [ ] Slack notifications (if configured)
  - [ ] Alert metadata correct (severity, description, timestamps)
  
- [ ] **Remediation Executing**
  - [ ] Orchestrations table has entries
  - [ ] Success rate > 90% (query: `MONITORING-SETUP.md` SQL)
  - [ ] No cascading failures
  
- [ ] **No Performance Degradation**
  - [ ] API response times < 1 second
  - [ ] Database queries completing normally
  - [ ] Cron job still running every 60 seconds

**Decision Point:** If Hour 6 checklist fails → Investigate + remediate (see `INCIDENT-RESPONSE-RUNBOOKS.md`)

### Hour 24 Checklist

- [ ] **Stable for 24 Hours**
  - [ ] No 500 errors in logs
  - [ ] No unexpected downtime
  - [ ] Cron ran 1440+ times (60 sec × 60 min × 24 hr)
  
- [ ] **Metrics Within Targets**
  - [ ] MTTD (Detection): < 30 seconds ✓
  - [ ] MTTR (Recovery): < 120 seconds ✓
  - [ ] Accuracy: > 95% (< 5% false positives) ✓
  - [ ] Alert Delivery: 100% ✓
  - [ ] Error Rate: < 1% ✓
  
- [ ] **No Unresolved Incidents**
  - [ ] All critical incidents have resolution
  - [ ] Post-mortems created for high/critical incidents
  - [ ] No stale alerts in queue
  
- [ ] **Monitoring Dashboard Operational**
  - [ ] Can access Supabase dashboard
  - [ ] Can run monitoring queries
  - [ ] Can access Vercel logs
  - [ ] Can trigger war games for testing

**Decision Point:** If ALL Hour 24 checks pass → PROCEED TO FULL ROLLOUT ✓

---

## Success Metrics (Target Values)

After 24-hour pilot, verify:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| MTTD (Detection) | < 30s | _____ | [ ] |
| MTTR (Recovery) | < 120s | _____ | [ ] |
| Detection Accuracy | > 95% | _____ | [ ] |
| Alert Delivery Rate | 100% | _____ | [ ] |
| Remediation Success | > 90% | _____ | [ ] |
| Uptime | > 99% | _____ | [ ] |
| False Positive Rate | < 5% | _____ | [ ] |
| Cron Execution | Every 60s | _____ | [ ] |

---

## Rollback Procedures (IF NEEDED)

### Quick Rollback (Emergency - < 5 min)

```bash
# 1. Stop external cron immediately
# Go to EasyCron/cron.is → Disable job

# 2. Rollback Vercel deployment
vercel rollback
# Select previous working deployment

# 3. Verify health
curl https://newspulse-ai-production.vercel.app/api/health

# 4. Document incident
# Create issue: "Rollback from [time] - reason: [description]"
```

### Full Rollback to Previous Release

```bash
# If rollback not available:
git revert HEAD
git push origin main
# Vercel auto-deploys from main

# Monitor:
vercel logs newspulse-ai --follow
```

### Data Recovery (If Needed)

```bash
# If data corruption suspected:
# Contact Supabase support for backup restore
# Provide: timestamp before corruption detected
```

---

## Troubleshooting During Pilot

### Issue: No Incidents Detected

**Checklist:**
- [ ] Cron job is running (check EasyCron dashboard)
- [ ] Cron secret is correct (compare CRON_SECRET value)
- [ ] API endpoint responding (curl health check)
- [ ] Database connected (Supabase dashboard shows activity)
- [ ] No errors in Vercel logs

**Fix:**
1. Manually trigger error collection: `curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron -H "Authorization: Bearer $CRON_SECRET"`
2. Check response for errors
3. Verify Supabase entries updated
4. If still not working, see `INCIDENT-RESPONSE-RUNBOOKS.md` section "Cron Job Not Running"

### Issue: Alerts Not Arriving

**Checklist:**
- [ ] Email provider credentials correct (check in Vercel)
- [ ] Founder email set correctly
- [ ] Check spam folder
- [ ] Check email service status (SendGrid status page)
- [ ] Manual test email: `curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"`

**Fix:**
1. Verify SENDGRID_API_KEY is set correctly
2. Test with: `curl https://api.sendgrid.com/v3/mail/send -H "Authorization: Bearer $SENDGRID_API_KEY"`
3. If failing, see `DISASTER-RECOVERY-PROCEDURES.md` section "Email Provider Failures"

### Issue: High Error Rate (> 10%)

**Checklist:**
- [ ] Check Vercel logs for error patterns
- [ ] Verify database connection (not timing out)
- [ ] Check API latency (not exceeding 30s timeout)
- [ ] Verify cron is not creating false positives

**Fix:**
1. Review `MONITORING-SETUP.md` for diagnostics
2. Run `INCIDENT-RESPONSE-RUNBOOKS.md` "High Error Rate Spike" procedure
3. If still elevated, consider rollback

---

## Documentation References

**For detailed procedures, see:**
- 📖 `DEPLOYMENT-QUICK-GUIDE.md` - Abbreviated deployment guide
- 📖 `API-SPECIFICATION.md` - All endpoint details and integration examples
- 📖 `MONITORING-SETUP.md` - Production monitoring and observability
- 📖 `INCIDENT-RESPONSE-RUNBOOKS.md` - Response procedures for common scenarios
- 📖 `DISASTER-RECOVERY-PROCEDURES.md` - Recovery for critical failures
- 📖 `SECURITY-AUDIT-FINDINGS.md` - Security hardening applied

---

## Post-Launch Activities

### After Hour 24 (Pilot Complete)

- [ ] **Review Pilot Results**
  - [ ] Compare actual metrics vs. targets (see table above)
  - [ ] Document any anomalies
  - [ ] Create issues for performance improvements

- [ ] **Expand Monitoring**
  - [ ] Enable Slack alerts (if not already)
  - [ ] Set up metrics dashboard
  - [ ] Configure alert thresholds (see `MONITORING-SETUP.md`)

- [ ] **Schedule Review Cycle**
  - [ ] Daily health checks for first week
  - [ ] Weekly metrics review for first month
  - [ ] Monthly deep dive + post-mortem analysis

### Day 3 (Full Rollout Decision)

- [ ] **Evaluate Pilot Results**
  - [ ] All metrics within targets? → FULL ROLLOUT
  - [ ] Some metrics off target? → Investigate & tune → Re-pilot
  - [ ] Critical issues found? → Rollback & redesign

- [ ] **If Full Rollout Approved**
  - [ ] Remove pilot-only restrictions
  - [ ] Enable all monitoring features
  - [ ] Schedule 30-day post-launch review

---

## Sign-Off

### Founder Authorization Required

**I have verified the following:**

- [ ] All prerequisites completed
- [ ] Pre-deployment check passing
- [ ] Build and deployment successful
- [ ] All health checks passing
- [ ] Cron job configured and running
- [ ] Hour 1 checklist complete
- [ ] Hour 6 checklist complete (or investigating)
- [ ] Hour 24 checklist complete (or acknowledged risks)

**Go/No-Go Decision:**

- [ ] **GO** - Proceed to full rollout (all metrics on target)
- [ ] **CONDITIONAL GO** - Proceed with monitoring (some metrics need tuning)
- [ ] **NO-GO** - Rollback and remediate (critical issues found)

**Founder Signature:** __________________ **Date:** __________

---

## Emergency Contacts

**If pilot fails critically:**
1. Disable cron: EasyCron dashboard → Job → Disable
2. Rollback: `vercel rollback`
3. Verify: `curl https://newspulse-ai-production.vercel.app/api/health`
4. Investigate: See `INCIDENT-RESPONSE-RUNBOOKS.md`

**Support Resources:**
- Vercel: support@vercel.com (emergency: status page)
- Supabase: support@supabase.com (emergency: status page)
- SendGrid: support@sendgrid.com (emergency: status page)

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Status:** Production Ready  
**Pilot Window:** 48 hours from deployment  
**Next Review:** 2026-07-18 (after pilot completes)
