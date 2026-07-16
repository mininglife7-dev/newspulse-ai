# Disaster Recovery Procedures

**Purpose:** Step-by-step recovery procedures for critical system failures  
**Scope:** Database, Email, Cron, API, Deployment  
**Status:** Ready for Production  

---

## Quick Reference Matrix

| Failure Scenario | Detection | Recovery Time | Data Loss | Action |
|------------------|-----------|----------------|-----------|--------|
| Supabase Down | Health check fails | 5-10 min | None (read-only) | Failover to replicas |
| Email Provider Down | Failed sends in logs | 2-5 min | None (retryable) | Switch provider |
| Cron Not Running | No incidents collected | 10+ min | Possible | Manual trigger + restart |
| API Timeout | 504/503 response | 1-2 min | None | Scale/restart |
| Deployment Corrupted | Many 500 errors | 2-5 min | None | Rollback to previous |

---

## 1. Database (Supabase) Failures

### Scenario: Database Connection Timeout

**Symptoms:**
- API returns 500 "Database connection failed"
- Health check returns: `{"status": "unhealthy", "reason": "DB connection failed"}`
- All endpoints affected (production-wiring, error-collection, war-games)

**Immediate Actions (0-5 min):**

1. **Verify Supabase Status**
   ```bash
   # Check Supabase dashboard
   open https://app.supabase.com
   
   # Look for:
   # - Service status (green/red)
   # - Active connections count
   # - Query performance metrics
   ```

2. **Check Network Connectivity**
   ```bash
   # Test connection from Vercel
   curl https://newspulse-ai-production.vercel.app/api/health/db
   
   # Should return: {"database": "connected"} or error details
   ```

3. **Verify Environment Variables**
   ```bash
   # In Vercel dashboard → Settings → Environment Variables
   # Check:
   # - DATABASE_URL is set
   # - Connection string format is valid
   # - Credentials haven't expired
   ```

**Recovery Actions (5-15 min):**

**Option A: Supabase Service Restored (Wait)**
- No action needed, connection will resume
- Verify with: `curl https://newspulse-ai-production.vercel.app/api/health`

**Option B: Connection Pool Exhausted**
```bash
# 1. SSH to Supabase console (if available)
# 2. Check active connections
SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;

# 3. Kill idle connections (if safe)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state='idle' AND query_start < now() - interval '10 minutes';
```

**Option C: Replica Failover (Production Issue)**
```bash
# 1. Contact Supabase support for emergency failover
# 2. Failover to read replica (automatic in most plans)
# 3. Monitor: SELECT version(); -- to verify new DB

# During failover:
# - Write operations queued until primary restored
# - Read-only mode active
# - All clients reconnect automatically
```

**Monitoring Recovery:**
```bash
# Run every 30 seconds until healthy
./scripts/health-check.sh $CRON_SECRET $PRODUCTION_WIRING_SECRET

# Wait for all checks to pass:
# API Health: ✓
# Cron Endpoint: ✓
# War Games: ✓
```

**Data Integrity Check (After Recovery):**
```sql
-- Verify tables exist and have recent data
SELECT table_name FROM information_schema.tables WHERE table_schema='public';

-- Check recent incidents
SELECT COUNT(*) as incidents_24h FROM incidents 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Verify no data corruption
SELECT * FROM pg_stat_user_tables WHERE seq_scan > idx_scan LIMIT 5;
```

---

### Scenario: Supabase Data Corruption

**Symptoms:**
- Queries return null/empty when should have data
- Incident counts wrong or timestamps corrupt
- Error patterns fingerprints missing values

**Immediate Actions (0-2 min):**

1. **Stop Write Operations**
   ```bash
   # Disable cron job (go to EasyCron/cron.is and disable)
   # This prevents corrupt data propagation
   ```

2. **Alert Founder**
   ```bash
   Verify data integrity before proceeding further
   ```

**Recovery Actions:**

**Option A: Supabase Automated Backups** (RECOMMENDED)
```bash
# 1. Go to Supabase dashboard → Backups
# 2. Identify last known good backup (timestamp before corruption detected)
# 3. Click "Restore" on backup

# 4. Verify restore
SELECT created_at FROM incidents ORDER BY created_at DESC LIMIT 1;
```

**Option B: Point-in-Time Recovery (PITR)**
```bash
# Contact Supabase support
# Specify: "Restore to 2 hours ago" (adjust based on when corruption started)

# Provide:
# - Project name
# - Specific timestamp to restore to
# - Tables affected
```

**Post-Recovery:**
1. Run data integrity queries above
2. Compare incident counts with logs
3. Verify timestamps are sequential
4. Enable cron job after verification

---

## 2. Email Provider Failures

### Scenario: SendGrid API Down / Rate Limited

**Symptoms:**
- Alerts not arriving in founder's inbox
- Logs show "SendGrid API 429" or "503"
- email_service.ts returns `{delivered: false}`

**Immediate Actions (0-2 min):**

1. **Check SendGrid Status**
   ```bash
   # Check status page
   open https://status.sendgrid.com
   
   # Or test API directly
   curl -X GET https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

2. **Verify API Key**
   ```bash
   # In Vercel → Settings → Environment Variables
   # Check SENDGRID_API_KEY is set and valid
   ```

**Recovery Actions:**

**Option A: SendGrid Service Restored (Wait)**
- Automatic retry happens every 5 seconds
- Retries continue for up to 1 hour
- No action needed

**Option B: Rate Limit Exceeded**
```bash
# 1. Check rate limit headers
curl -v https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" 2>&1 | grep "X-RateLimit"

# 2. Response format:
# X-RateLimit-Limit: 600
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1626470400

# 3. Wait until reset time passes (usually 1 minute)
# 4. Retry sending
```

**Option C: Use Backup Email Provider**
```bash
# Switch to AWS SES or log-only mode

# In Vercel environment variables:
# Set EMAIL_PROVIDER=ses  (or log for testing)
# Set AWS_ACCESS_KEY_ID
# Set AWS_SECRET_ACCESS_KEY

# Verify:
curl https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"
```

**Option D: Use Email Fallback Log Mode**
```bash
# Temporary email backup while provider recovers

# In Vercel:
# Set EMAIL_PROVIDER=log

# All emails logged to console:
# [EMAIL_LOG] From: noreply@newspulse-ai.com To: te***@gmail.com Subject: 🚨 CRITICAL...

# Manually forward important alerts to founder:
vercel logs newspulse-ai --grep "CRITICAL" --follow
```

---

### Scenario: Slack Webhook Integration Failed

**Symptoms:**
- Slack notifications not arriving
- Logs show "Webhook request failed: 404" or "410"

**Immediate Actions:**

1. **Verify Webhook URL**
   ```bash
   # In Vercel environment:
   # Check SLACK_WEBHOOK_URL is present and valid
   
   # Format should be: https://hooks.slack.com/services/T.../B.../X...
   ```

2. **Test Webhook**
   ```bash
   # Send test message
   curl -X POST $SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Test message from newspulse-ai production"
     }'
   ```

**Recovery Actions:**

**Option A: Recreate Webhook**
```bash
# If webhook URL is stale (410 error):

# 1. Go to Slack workspace → Settings → Apps
# 2. Find "Incoming Webhooks"
# 3. Create new webhook for #alerts channel
# 4. Copy webhook URL
# 5. Update SLACK_WEBHOOK_URL in Vercel
# 6. Redeploy or restart function
```

**Option B: Disable Slack Temporarily**
```bash
# If Slack unreachable and blocking email:

# In Vercel environment:
# Unset or comment out: SLACK_WEBHOOK_URL

# Email alerts will continue working
# Revert after Slack restored
```

---

## 3. Cron Job Failures

### Scenario: External Cron Not Running

**Symptoms:**
- No error patterns collected for 5+ minutes
- Supabase `incidents` table has no new entries
- Logs show no `[error-collection-cron]` entries

**Immediate Actions (0-2 min):**

1. **Check Cron Service Dashboard**
   ```bash
   # EasyCron
   open https://www.easycron.com
   # Look for: Job status, Last execution, Next execution
   
   # cron.is
   open https://cron.is
   # Look for: Job running, Last log output
   ```

2. **Verify CRON_SECRET Matches**
   ```bash
   # In Vercel Settings → Environment Variables
   # Copy value of CRON_SECRET
   
   # In EasyCron/cron.is
   # Check header: Authorization: Bearer [SECRET]
   # Should match exactly
   ```

**Recovery Actions (2-10 min):**

**Option A: Re-enable Job in EasyCron**
```bash
# 1. Log into EasyCron
# 2. Find the error-collection job
# 3. If status is "Paused", click "Resume"
# 4. Check "Last Execution" timestamp
# 5. If old, manually trigger test:

curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Option B: Recreate Cron Job**
```bash
# If job is missing or corrupted:

# 1. Go to EasyCron → Create Cron Job
# 2. URL: https://newspulse-ai-production.vercel.app/api/production-error-collection/cron
# 3. Headers: Authorization: Bearer $CRON_SECRET
# 4. Cron: */1 * * * * (every minute)
# 5. Save

# 6. Test immediately
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET"

# Should return: {"success": true, "collected": N}
```

**Option C: Manual Collection Until Cron Restored**
```bash
# While cron service is being fixed:

# Every minute, run:
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET"

# Or create local script:
#!/bin/bash
while true; do
  curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
    -H "Authorization: Bearer $CRON_SECRET"
  sleep 60
done
```

**Option D: Switch Cron Provider**
```bash
# If EasyCron is down completely:

# Switch to cron.is
# 1. Go to https://cron.is
# 2. Create new job with same URL and header
# 3. Test: curl command above should return success

# Or use other cron service:
# - crontab.guru
# - WebCron
# - CloudFlare Workers Cron Triggers
```

---

## 4. API Endpoint Failures

### Scenario: Production Wiring Endpoint Timing Out

**Symptoms:**
- External systems get 504 "Gateway Timeout"
- Response takes > 30 seconds
- Some requests succeed, some timeout

**Immediate Actions (0-1 min):**

1. **Check Vercel Status**
   ```bash
   # Dashboard → Deployment → Activity
   # Look for: CPU usage, memory usage, cold starts
   ```

2. **Test Endpoint**
   ```bash
   # Time the request
   time curl -X GET https://newspulse-ai-production.vercel.app/api/production-wiring?action=status \
     -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"
   
   # Note response time - should be < 1 second
   ```

**Recovery Actions:**

**Option A: Database Timeout (Most Common)**
- See Database Failures section above
- Verify Supabase connection is working

**Option B: Query Performance Issue**
```bash
# 1. Check Supabase slow query log
# Supabase Dashboard → Monitoring → Queries
# Look for: queries taking > 5 seconds

# 2. Example slow query fix:
-- SLOW: Missing index on incidents table
SELECT * FROM incidents WHERE created_at > NOW() - INTERVAL '24 hours';

-- FAST: Add index
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);

-- VERIFY
EXPLAIN ANALYZE SELECT * FROM incidents WHERE created_at > NOW() - INTERVAL '24 hours' LIMIT 1000;
```

**Option C: High Load / Connection Pool Exhausted**
```bash
# 1. Scale Vercel function (in dashboard)
# Settings → Function → Concurrency (increase to 50-100)

# 2. Restart all connections
# Vercel automatic restart (deploy empty change)
git commit --allow-empty -m "Restart Vercel functions"
git push origin claude/governor-v3-eos-s3vkss

# 3. Switch to read-only mode temporarily
# Disable cron, disable external submissions
# Only accept GET queries until load decreases
```

**Option D: Memory Leak in API Code**
```bash
# Symptoms: Gradually increasing memory usage, eventual crash

# 1. Redeploy (clears memory)
vercel --prod

# 2. Monitor memory
# Vercel Dashboard → Deployment → Analytics → Function Memory

# 3. Debug if continues:
# Check app/api/production-wiring/route.ts for:
# - Unbounded arrays
# - Missing cleanup in event listeners
# - Circular references
```

---

## 5. Deployment Failures

### Scenario: Current Deployment Broken (Many 500 Errors)

**Symptoms:**
- 90%+ of requests return 500
- All endpoints affected
- Errors in Vercel logs: "TypeError" or "undefined"

**Immediate Actions (0-2 min):**

1. **Identify Problem Version**
   ```bash
   # Vercel Dashboard → Deployments
   # Recent deployments shown (chronological)
   # Note which deployment is "Production" (indicated)
   ```

2. **Check Error Logs**
   ```bash
   # Via CLI
   vercel logs newspulse-ai --follow
   
   # Look for: Stack traces, error messages, pattern
   # Example: "TypeError: Cannot read property 'foo' of undefined"
   ```

**Recovery Actions:**

**Option A: Rollback to Previous Working Deployment**
```bash
# FASTEST - rollback via CLI
vercel rollback

# You'll be prompted to select which deployment to rollback to
# Select the last known good deployment (before this one)

# Verify:
curl https://newspulse-ai-production.vercel.app/api/health
```

**Option B: Rollback Specific Commit**
```bash
# If rollback not available or unclear:

# 1. Find last good commit (git log)
git log --oneline | head -20

# 2. Reset branch to that commit (NOT destructive, creates new commit)
git revert <commit-hash>  # Creates inverse commit
git push origin main

# 3. Vercel auto-deploys from main, OR:
vercel --prod
```

**Option C: Fix and Redeploy (If Root Cause Known)**
```bash
# 1. Fix the bug locally
# Edit file, test: npm run build && npm run test

# 2. Commit and push
git commit -am "fix: Resolve production error"
git push origin main

# 3. Vercel redeploys automatically
# OR manually: vercel --prod

# 4. Monitor
vercel logs newspulse-ai --follow
```

**Option D: Scale Out if Not Code Issue**
```bash
# If rollback succeeds but still slow:

# Vercel Dashboard → Settings
# Function Concurrency: increase from 10 to 50
# Memory: increase from 1024MB to 3008MB

# OR use Vercel's automatic scaling
# Dashboard → Settings → Auto-Scaling: Enable

# Redeploy to apply changes
vercel --prod
```

---

## 6. Multi-System Cascade Failure

### Scenario: Database Down + Email Down (Cascading)

**Symptoms:**
- Multiple systems failing simultaneously
- Founder not receiving alerts about alerts failing
- System unable to recover automatically

**Immediate Actions (0-5 min):**

1. **Triage Failures**
   ```bash
   # Run quick checks
   curl https://newspulse-ai-production.vercel.app/api/health
   curl https://newspulse-ai-production.vercel.app/api/health/db
   
   # Check email logs
   vercel logs newspulse-ai --grep "EMAIL" --follow
   
   # Check Supabase status
   open https://app.supabase.com
   
   # Check SendGrid status
   open https://status.sendgrid.com
   ```

2. **Disable Cascading Failure**
   ```bash
   # Disable cron (prevents error collection flooding logs)
   # EasyCron dashboard → Job → Disable
   
   # This prevents more failures piling up
   ```

**Recovery Actions (Priority Order):**

**Priority 1: Restore Database** (Most Critical)
- See Database Failures section
- Cannot proceed without data layer

**Priority 2: Restore Email**
- See Email Provider Failures section
- Founder is blind without alerts

**Priority 3: Re-enable Cron**
- Once DB and Email restored
- Start from disabled state and verify each component

**Post-Recovery Validation:**
```bash
# 1. Database
curl https://newspulse-ai-production.vercel.app/api/health/db

# 2. Email (test send)
curl -X POST https://newspulse-ai-production.vercel.app/api/founder-alerting/test \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"

# 3. Cron
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET"

# 4. Full health check
./scripts/health-check.sh $CRON_SECRET $PRODUCTION_WIRING_SECRET
```

---

## 7. Security Incident Response

### Scenario: Compromised API Secret (CRON_SECRET or PRODUCTION_WIRING_SECRET)

**Symptoms:**
- Unauthorized requests detected in logs
- Same secret value publicly exposed (e.g., GitHub commit)
- External system using secret to cause damage

**Immediate Actions (0-2 min - CRITICAL):**

1. **Disable Current Secret**
   ```bash
   # Vercel Dashboard → Settings → Environment Variables
   # Find: CRON_SECRET and PRODUCTION_WIRING_SECRET
   # Delete or replace with placeholder
   
   # This immediately invalidates all old tokens
   ```

2. **Generate New Secret**
   ```bash
   # Locally (DO NOT commit this output)
   openssl rand -hex 32
   
   # Output: 64-character hex string
   # Example: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
   ```

3. **Update Environment Variable**
   ```bash
   # Vercel Dashboard → Settings → Environment Variables
   # CRON_SECRET = [new value]
   # PRODUCTION_WIRING_SECRET = [new value]
   
   # Redeploy: vercel --prod
   ```

4. **Audit Access Logs**
   ```bash
   # Check if unauthorized requests succeeded
   vercel logs newspulse-ai --grep "Unauthorized" --follow
   vercel logs newspulse-ai --grep "401" --follow
   
   # Check if unauthorized requests bypassed auth
   # Look for any "success" responses without proper auth
   ```

**Recovery Actions:**

**Option A: If Compromised Key Not Yet Used**
- Just rotate as above
- No damage to clean up
- Monitor for next 24 hours

**Option B: If Malicious Operations Detected**
```bash
# 1. Identify affected operations
# Check Supabase logs for operations from unauthorized user
# Time range: when secret was compromised to when disabled

# 2. Potential damage assessment
# - False incidents created?
# - Orchestrations with wrong remediation?
# - War games corrupting test data?

# 3. Rollback affected data
# If incidents corrupted:
SELECT * FROM incidents WHERE created_at > [compromise_time] AND created_at < [rotation_time];

# Review each incident
# DELETE if false positive, or UPDATE if incorrect

# 4. Audit trail
# Document:
# - When compromise detected
# - When secret rotated
# - What actions taken
# - What data affected
```

---

## Recovery Priorities & Runbook Index

| Priority | Component | Recovery Time Target | Runbook |
|----------|-----------|----------------------|---------|
| 1 | Database | 5-10 min | See Database Failures |
| 2 | Email Provider | 2-5 min | See Email Provider Failures |
| 3 | Cron | 5-15 min | See Cron Job Failures |
| 4 | API Endpoints | 1-2 min | See API Endpoint Failures |
| 5 | Deployment | 2-5 min | See Deployment Failures |
| CRITICAL | Security | < 2 min | See Security Incident Response |

---

## Escalation Matrix

| Issue | First Action | If Not Resolved | Escalation |
|-------|--------------|-----------------|------------|
| Cron not running | Check EasyCron job status | Recreate job | Contact EasyCron support |
| Email not sending | Check SendGrid status | Switch to SES | Manual email to founder |
| Database timeout | Check Supabase connection | Restart replica | Contact Supabase support |
| API returning 500 | Check Vercel logs | Rollback deployment | Request Vercel engineering |
| Data corruption | Stop writes | Restore backup | Supabase engineering + full audit |

---

## Testing Disaster Recovery

**Monthly DR Test Procedure:**
```bash
# 1. Schedule low-traffic time
# 2. Enable detailed logging: tail -f vercel logs
# 3. Simulate failure (locally, not production)
# 4. Run recovery procedure
# 5. Verify system recovers within SLA time
# 6. Document actual vs. planned time
# 7. Update runbooks if procedures changed
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Status:** Production Ready  
**Next Review:** 2026-08-16
