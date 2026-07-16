# Incident Response Runbooks

**Purpose:** Step-by-step procedures for responding to common production scenarios  
**Audience:** Founder / On-call operator  
**Status:** Ready to use

---

## Table of Contents

1. [Critical Incident Alert](#critical-incident-alert)
2. [High Error Rate Spike](#high-error-rate-spike)
3. [Remediation Failed](#remediation-failed)
4. [Suspected False Positive](#suspected-false-positive)
5. [Alert System Not Working](#alert-system-not-working)
6. [Cron Job Not Running](#cron-job-not-running)

---

## Critical Incident Alert

**Trigger:** Receive email/Slack alert: "🚨 CRITICAL: [Incident Description]"

**Goal:** Verify incident, confirm auto-remediation status, and decide on manual intervention within 5 minutes.

### Immediate Actions (0-2 minutes)

```
☐ Step 1: Open incident dashboard
  URL: https://newspulse-ai-production.vercel.app/dashboard
  Look for: Alert notification, red severity indicator

☐ Step 2: Get incident ID from alert email
  Subject line example: "🚨 CRITICAL: Database connection failed"
  Copy the incident ID (usually incident-abc123)

☐ Step 3: Check if remediation already executing
  On dashboard, look for:
  - Status: ✅ "Automated remediation in progress" OR
  - Status: ⏸️ "Awaiting manual review"
  
  If status is ✅: Go to "Monitoring" section
  If status is ⏸️: Go to "Decision" section
```

### Monitoring (If Auto-Remediation Executing)

```sql
-- Check remediation progress
SELECT 
  incident_id,
  severity,
  category,
  description,
  created_at,
  (NOW() - created_at) as age
FROM incidents
WHERE incident_id = 'incident-abc123';

-- Check what action is being taken
SELECT 
  incident_id,
  recommended_action,
  execution_status,
  created_at
FROM orchestrations
WHERE incident_id = 'incident-abc123';

-- Expected outputs:
-- recommended_action: rollback / scale / drain / notify
-- execution_status: executing / succeeded / failed
```

**Decision Tree:**
- If `execution_status = executing`: Wait 2-3 minutes, check again
- If `execution_status = succeeded`: ✅ Incident resolved, go to "Follow-up"
- If `execution_status = failed`: 🚨 Critical action needed

### If Remediation Failed

```
☐ Disable auto-remediation (prevent repeated failed attempts)
  1. SSH to deployment (or use Vercel CLI)
  2. Set environment: ENABLE_AUTO_REMEDIATION=false
  3. Restart application

☐ Manual intervention:
  If incident is: Database connection failure
    → Restart database service
    → Or failover to replica
  
  If incident is: Service crash
    → Rollback to previous version: vercel rollback
    → Or restart current version
  
  If incident is: Resource exhaustion
    → Increase instance size
    → Or clear caches
    → Or scale horizontally

☐ Monitor for recovery
  Run health check: curl https://newspulse-ai-production.vercel.app/api/health
  Expected: { "status": "healthy" }
```

### Follow-up (After Incident Resolved)

```
☐ Verify system stability
  - Check error rate returned to normal (< 1%)
  - Confirm no new critical incidents in last 5 minutes
  - Verify Supabase incident count stable

☐ Create post-mortem GitHub issue
  Title: [POST-MORTEM] CRITICAL: [What happened]
  Include:
    - Timeline of events
    - Detection time (target: < 30s)
    - Recovery time (target: < 120s)
    - Root cause analysis
    - Prevention measures for future

☐ Document lesson learned
  If auto-remediation failed: Why did it fail?
  If detection was slow: Could we improve fingerprinting?
  If false positive: How to prevent similar alerts?

☐ Re-enable auto-remediation (if disabled)
  ENABLE_AUTO_REMEDIATION=true
```

---

## High Error Rate Spike

**Trigger:** Multiple errors detected rapidly OR error rate > 5% detected

**Goal:** Understand error cause and prevent cascading failures within 10 minutes.

### Immediate Assessment (0-3 minutes)

```bash
# 1. Check current error rate
curl https://newspulse-ai-production.vercel.app/api/health | jq .error_rate

# 2. Get top error patterns
sqlite3 production.db << 'EOF'
SELECT 
  fingerprint,
  category,
  severity,
  occurrence_count
FROM error_patterns
WHERE last_seen > datetime('now', '-5 minutes')
ORDER BY occurrence_count DESC
LIMIT 5;
EOF

# 3. Check Vercel metrics
vercel analytics newspulse-ai --period 5m

# Decision: Is this a real issue or spike?
# - Real issue: Consistent errors, clear pattern
# - Temporary spike: Isolated errors, random patterns
```

### Investigation (3-8 minutes)

```sql
-- Get detailed error breakdown
SELECT 
  category,
  COUNT(*) as count,
  AVG(status_code) as avg_status,
  STRING_AGG(DISTINCT message, ', ' ORDER BY message) as messages
FROM error_log
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY category
ORDER BY count DESC;

-- Check if database is affected
SELECT 
  COUNT(*) as db_errors,
  MAX(error_time) as most_recent
FROM database_errors
WHERE error_time > NOW() - INTERVAL '5 minutes';

-- Check external service dependencies
SELECT 
  service_name,
  COUNT(*) as failures,
  AVG(response_time_ms) as avg_latency
FROM external_service_calls
WHERE status_code >= 400
  AND called_at > NOW() - INTERVAL '5 minutes'
GROUP BY service_name;
```

### Action (Decision Based on Category)

**If database errors:** 
```
☐ Check database connection pool: SELECT count(*) FROM pg_stat_activity;
☐ Check for long-running queries: SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;
☐ If exhausted: Increase pool size OR kill idle connections
☐ Monitor recovery
```

**If external service errors (SendGrid, Vercel API, etc.):**
```
☐ Check service status page (e.g., status.sendgrid.com)
☐ Check if we have rate limits: Look for 429 status codes
☐ If rate limited: Implement exponential backoff / queue retry
☐ Switch to fallback (e.g., log-only email if SendGrid down)
```

**If application errors (500, timeouts):**
```
☐ Check recent code changes: git log --oneline -5
☐ Check if incident maps to recent deployment
☐ Review Vercel logs: vercel logs newspulse-ai --grep "error"
☐ If recent change caused it: Rollback: vercel rollback
☐ Or restart: Redeploy current version
```

### Follow-up

```
☐ After error rate returns to normal (< 1% for 5+ min)
☐ Create learning GitHub issue
☐ Document root cause
☐ Implement permanent fix (e.g., improve retry logic)
```

---

## Remediation Failed

**Trigger:** Auto-remediation attempted but failed to resolve incident

**Symptom:** Incident still exists, MTTR > 180s, status shows "failed"

**Goal:** Determine why remediation failed and recover manually within 15 minutes.

### Immediate Triage (0-3 minutes)

```
☐ Check what remediation was attempted
  Query: SELECT recommended_action FROM orchestrations WHERE incident_id = '...';
  Expected: rollback / scale / drain / notify

☐ Check failure reason
  Query: SELECT failure_reason FROM orchestrations WHERE incident_id = '...';
  Look for: API error, timeout, validation failure, permission denied

☐ Verify incident still active
  Query: SELECT COUNT(*) FROM incidents WHERE resolved = false;
  If 0: Incident actually resolved, check why status shows failed
  If > 0: Incident ongoing, need manual intervention
```

### Debugging by Remediation Type

**If Rollback Failed:**
```bash
# Check Vercel API availability
curl https://api.vercel.com/v6/deployments \
  -H "Authorization: Bearer $VERCEL_API_TOKEN" | jq .

# Try manual rollback
vercel rollback
# Follow prompts to select previous deployment

# If Vercel API is down: manually deploy previous version
git checkout HEAD~1  # Previous commit
npm run build
vercel --prod
```

**If Auto-Scaling Failed:**
```bash
# Check current resource usage
vercel analytics newspulse-ai --detailed | grep "CPU\|Memory"

# Manually scale
vercel env add DATABASE_POOL_SIZE 50  # Increase pool
vercel env add CACHE_SIZE 1000  # Increase cache
vercel redeploy
```

**If Drain Failed:**
```bash
# Check queue depth
SELECT COUNT(*) FROM job_queue WHERE status = 'pending';

# Manually drain: Kill active jobs gracefully
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'newspulse-ai'
  AND state = 'active'
  AND query ILIKE '%SELECT%'  -- Only drop SELECT queries, not critical writes
```

### Recovery Step (If Auto-Remediation Can't Fix It)

```
☐ Option 1: Switch to fallback mode
  ENABLE_AUTO_REMEDIATION=false  # Stop trying auto-fixes
  EMAIL_PROVIDER=log              # Fall back to console logging
  Redeploy and restart

☐ Option 2: Scale down traffic
  Reduce vercel deployment % to 0
  Deploy new instance
  Bring it online at 1% traffic
  Gradually increase as stable

☐ Option 3: Full rollback
  vercel rollback --to <specific_deployment_id>
  This resets to known-good previous state
```

### Follow-up

```
☐ Once recovered: Document exactly what failed
☐ File GitHub issue: "Auto-remediation: [Action] failed because [Reason]"
☐ Improve: Update orchestration logic to handle this failure mode
☐ Test: Run war games to validate fix
☐ Deploy fix to prevent recurrence
```

---

## Suspected False Positive

**Trigger:** Incident alert received but no real error occurring

**Symptom:** Dashboard shows incident, but:
- Users report no issues
- No errors in Vercel logs
- Metrics look normal
- Incident is "phantom" issue

**Goal:** Validate if false positive, and fix fingerprinting logic if so.

### Investigation (0-10 minutes)

```sql
-- Get the suspect incident
SELECT * FROM incidents WHERE incident_id = 'incident-abc123';

-- Get associated error patterns
SELECT * FROM error_patterns WHERE fingerprint = (
  SELECT error_fingerprint FROM incidents WHERE incident_id = 'incident-abc123'
);

-- Check error count in last 5 minutes
SELECT COUNT(*) FROM errors 
WHERE category = [incident_category]
  AND created_at > NOW() - INTERVAL '5 minutes';

-- Check if similar errors occur normally (baseline)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as count
FROM errors
WHERE category = [incident_category]
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Interpretation

**It's a False Positive if:**
```
✓ Error count: 0-1 (isolated, not pattern)
✓ User impact: None (no complaints)
✓ Error type: Transient (timeout, DNS, etc.) that resolved itself
✓ Baseline: Similar errors occur every day at this time
```

**It's a Real Issue if:**
```
✓ Error count: > 5 in last 5 min
✓ User impact: Users report slowness/errors
✓ Error type: Consistent (database, auth, etc.)
✓ Baseline: This error count is abnormal
```

### If False Positive Confirmed

```
☐ Update fingerprinting logic
  File: lib/error-tracking.ts
  Function: generateFingerprint()
  
  Current: Normalizing to catch patterns
  Problem: Too aggressive, catching unrelated errors
  Fix: More specific normalization patterns

☐ Test: Run a war game to make sure fix works
  npm run test:war-games

☐ Adjust thresholds (if applicable)
  If false positive based on low count:
    - Increase MIN_ERROR_THRESHOLD to 5+ errors
    - Require pattern repeats within 60s
  
  If false positive based on transient errors:
    - Exclude certain error types (DNS, timeout)
    - Or require 3 consecutive errors before alert

☐ Deploy fix
☐ Monitor for 24 hours to confirm reduction
```

### Document Learning

```
GitHub Issue Template:
Title: [FALSE POSITIVE] [Error Type] - Fingerprinting too aggressive
Description:
  - Incident: [id]
  - Root cause: [what triggered false alert]
  - Fix applied: [how we changed fingerprinting]
  - Verification: [test command run to confirm]
```

---

## Alert System Not Working

**Trigger:** Incident occurs but NO email/Slack alert received

**Symptom:** Dashboard shows incident, but:
- Email inbox is empty
- Slack channel has no notification
- Alert status in DB shows "failed"

**Goal:** Restore alerting within 10 minutes.

### Quick Diagnostic (0-3 minutes)

```bash
# Test email sending
curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "critical",
    "description": "Test alert - manual trigger"
  }'

# Wait 2 minutes and check inbox/spam folder

# Check Slack (if configured)
# Look at Slack channel for notification
```

### Investigation by Channel

**Email Not Arriving:**

```bash
# Step 1: Check configuration
node scripts/pre-deployment-check.mjs | grep -A 5 "Email"

# Expected output should show:
# ✓ FOUNDER_EMAIL: lalit@...
# ✓ EMAIL_PROVIDER: sendgrid (or ses/log)
# ✓ SENDGRID_API_KEY: key...

# Step 2: Check Vercel logs for email errors
vercel logs newspulse-ai --grep "EMAIL" --follow

# Expected: [EMAIL] Sent via SendGrid to ex***@example.com
# Actual: [ERROR] Email send failed: [Reason]

# Step 3: Check email provider status
# SendGrid: https://status.sendgrid.com/
# AWS SES: AWS Console → SES → Sending statistics
# Check if service is degraded or if we're rate-limited

# Step 4: Verify email address
# Is FOUNDER_EMAIL configured correctly?
# Is it spelled right? (common: @gmail.com typos)
SELECT * FROM alerts WHERE delivery_status = 'failed' LIMIT 1;
# Look at "recipient_email" field
```

**Email Configuration Fix:**

```bash
# Option 1: Resend to fallback email
# Step A: Update FOUNDER_EMAIL in Vercel to a different address
# Step B: Redeploy or restart app
# Step C: Test again

# Option 2: Use console logging as fallback
# Step A: Set EMAIL_PROVIDER=log in Vercel
# Step B: Redeploy
# Step C: Alerts now log to Vercel logs (vercel logs newspulse-ai)

# Option 3: Fix SendGrid API key
# Step A: Get new key from SendGrid dashboard
# Step B: Update SENDGRID_API_KEY in Vercel
# Step C: Redeploy
# Step D: Test email send again
```

**Slack Not Notifying:**

```bash
# Step 1: Check webhook URL
vercel env ls | grep SLACK

# Step 2: Test Slack webhook directly
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test message from newspulse-ai",
    "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": "*Test*: Webhook is working"}}]
  }'

# Expected: Response shows "ok"
# Actual: Error message → webhook URL is wrong/expired

# Step 3: If webhook expired
# Regenerate in Slack: Workspace Settings → Incoming Webhooks → Create new
# Update SLACK_WEBHOOK_URL in Vercel
# Redeploy

# Step 4: Check Slack channel permissions
# Is bot allowed in the channel?
# Go to channel → Members → Search for Incoming Webhooks bot
```

### Recover Alerting

```
☐ If SendGrid down: Switch to console logging temporarily
  EMAIL_PROVIDER=log
  Alerts appear in: vercel logs newspulse-ai --grep "EMAIL_LOG"

☐ If Slack broken: Disable temporarily
  Unset SLACK_WEBHOOK_URL or set to empty
  Redeploy

☐ Monitor manual recovery
  Verify next incident creates alert successfully
  Set alarm to check Slack/email in 5 minutes

☐ Permanent fix
  After service recovers: Update keys/URLs
  Redeploy and test
```

---

## Cron Job Not Running

**Trigger:** No error collection happening (no new incident entries in Supabase)

**Symptom:**
- Supabase incidents table not growing
- Vercel logs show no "error-collection" entries for 5+ minutes
- Error patterns not updating

**Goal:** Restore cron job within 5 minutes.

### Diagnostic (0-2 minutes)

```bash
# Test cron endpoint manually
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET" \
  | jq .

# Expected output:
# {
#   "success": true,
#   "collected": 5,
#   "patterns": 3,
#   "incidents": 1,
#   "alerts": 1
# }

# If fails:
# - Check CRON_SECRET spelling/value
# - Check if endpoint URL correct
# - Check Vercel deployment status
```

### Investigation

```
☐ Step 1: Verify cron job is enabled
  - Log into EasyCron.com or cron.is
  - Find the job for: /api/production-error-collection/cron
  - Check: Job is "enabled" (not disabled)
  - Check: Job scheduled for "every 60 seconds" or "*/1 * * * *"

☐ Step 2: Check job history
  - Click on job in cron dashboard
  - Look at "Last runs" or "History"
  - Did it run in last 2 minutes? (Show status)
  - If not: Manually trigger test
  - If yes but failed: Check error message

☐ Step 3: Verify authentication
  - Check header in cron job configuration
  - Should be: Authorization: Bearer $CRON_SECRET
  - Is CRON_SECRET correct? (Same as in Vercel env)
  - If wrong: Update cron job with correct secret

☐ Step 4: Test with verbose logging
  - Enable debug mode if available
  - Manually trigger cron job
  - Check Vercel logs: vercel logs newspulse-ai --grep "error-collection"
```

### Recovery Steps

```
☐ If cron job is disabled:
  1. Click "Enable" in cron dashboard
  2. Manually trigger test
  3. Verify in Vercel logs

☐ If cron job missing:
  1. Recreate in EasyCron or cron.is
  2. URL: https://newspulse-ai-production.vercel.app/api/production-error-collection/cron
  3. Method: POST
  4. Header: Authorization: Bearer $CRON_SECRET
  5. Schedule: Every 60 seconds (or */1 * * * *)
  6. Save and test

☐ If CRON_SECRET wrong:
  1. Get current secret from Vercel: vercel env ls | grep CRON_SECRET
  2. Update cron job with correct value
  3. Test: Manually trigger and check for success

☐ Verify recovery:
  1. Wait 60 seconds
  2. Check Vercel logs: Should show "error-collection" running
  3. Check Supabase: Should see new incidents or patterns
```

---

## Escalation Matrix

| Scenario | Severity | Action | Escalate? |
|----------|----------|--------|-----------|
| CRITICAL alert + auto-remediation SUCCEEDING | HIGH | Monitor, verify recovery | No |
| CRITICAL alert + auto-remediation FAILING | CRITICAL | Manual intervention immediately | Yes |
| High error spike (< 5 min, recovers) | MEDIUM | Investigate, document | No |
| High error spike (> 15 min, ongoing) | CRITICAL | Emergency response | Yes |
| False positive incident | LOW | Fix fingerprinting, test | No |
| Alerts not arriving | MEDIUM | Restore alerting, verify | Yes |
| Cron job down (> 5 min) | CRITICAL | Restart cron immediately | Yes |

**Escalation means:** Contact DevOps, infrastructure team, or external vendor for immediate support.

---

## Quick Reference Cheat Sheet

```
🚨 CRITICAL INCIDENT?
1. Open dashboard: https://newspulse-ai-production.vercel.app/dashboard
2. Check auto-remediation status: ✅ (executing) or ⏸️ (needs manual help)
3. If ✅: Wait 2-3 minutes, check status again
4. If ⏸️ or not resolving: Manual intervention needed
   - Database issue: Restart DB or failover
   - Service crash: Rollback or redeploy
   - Resource exhausted: Increase limits or scale

📊 ERROR SPIKE?
1. Check error rate: curl .../api/health | jq .error_rate
2. Get top 5 patterns: SELECT... FROM error_patterns... LIMIT 5
3. Categorize: Database? External service? Application?
4. Act on category (see "High Error Rate Spike" section)

❌ REMEDIATION FAILED?
1. Disable auto-remediation: ENABLE_AUTO_REMEDIATION=false
2. Manual fix based on incident type
3. Monitor recovery: Error rate should drop
4. Create GitHub issue for permanent fix
5. Re-enable auto-remediation

❓ FALSE POSITIVE?
1. Verify no real errors: SELECT COUNT... WHERE category=X
2. Check user impact: Any complaints?
3. Review baseline: Do we normally see these errors?
4. If confirmed false positive: Update fingerprinting logic
5. Test: npm run test:war-games

⚠️ ALERTS NOT WORKING?
1. Test email: curl .../api/founder-alerting/test
2. Check config: node scripts/pre-deployment-check.mjs
3. If SendGrid down: Switch to EMAIL_PROVIDER=log
4. If Slack broken: Regenerate webhook URL
5. Redeploy and reverify

⏰ CRON NOT RUNNING?
1. Manual test: curl -X POST .../api/production-error-collection/cron -H "Auth: Bearer $SECRET"
2. Check cron job enabled in EasyCron/cron.is
3. Verify CRON_SECRET matches
4. Update/recreate cron job if needed
5. Monitor Vercel logs for "error-collection"
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Status:** Ready for production use
