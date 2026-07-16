# Production Monitoring & Observability Setup

**Purpose:** Monitor production incident response system health and performance  
**Time to Setup:** 20 minutes  
**Status:** Ready for configuration

---

## Monitoring Stack Components

```
Production Alerts         Email + Slack (FounderAlertingSystem)
         ↓
Incident Detection       Error patterns → Incidents (DNS-027, DNS-025)
         ↓
Remediation Tracking     Orchestrations → Metrics (DNS-017, DNS-020)
         ↓
Learning System          Post-mortems → Prevention (DNS-019, DNS-022)
         ↓
Observability Layer      Supabase + Vercel Logs
```

---

## 1. Supabase Dashboard Monitoring

### Core Tables to Watch

**incidents**
- New entries every time an error pattern is detected
- `severity` column: critical, high, medium, low
- `description` column: human-readable summary
- `detectionTime` column: milliseconds from error to detection

```sql
-- Check recent incidents (last 24 hours)
SELECT 
  incident_id,
  severity,
  category,
  description,
  created_at
FROM incidents
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Check detection performance
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_detection_time_sec,
  MIN(EXTRACT(EPOCH FROM (updated_at - created_at))) as min_detection_time_sec,
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_detection_time_sec
FROM incidents
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**error_patterns**
- All unique error fingerprints detected
- `occurrenceCount` shows how often pattern occurs
- `severity` inferred from HTTP status codes

```sql
-- Find most common error patterns
SELECT 
  fingerprint,
  category,
  severity,
  occurrence_count,
  last_seen
FROM error_patterns
WHERE last_seen > NOW() - INTERVAL '24 hours'
ORDER BY occurrence_count DESC
LIMIT 10;
```

**orchestrations**
- Remediation decisions for each incident
- `recommendedAction`: rollback, scale, drain, notify
- `executionStatus`: planned, executing, succeeded, failed

```sql
-- Check remediation success rate
SELECT 
  COUNT(*) FILTER (WHERE execution_status = 'succeeded') as successful,
  COUNT(*) FILTER (WHERE execution_status = 'failed') as failed,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE execution_status = 'succeeded') / COUNT(*), 1) as success_rate
FROM orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check average recovery time
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_recovery_time_sec,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at))) as p95_recovery_time_sec
FROM orchestrations
WHERE execution_status = 'succeeded'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**alerts**
- Every notification sent to founder/team
- `deliveryStatus`: sent, failed, pending

```sql
-- Check alert delivery status
SELECT 
  COUNT(*) FILTER (WHERE delivery_status = 'sent') as delivered,
  COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status = 'sent') / COUNT(*), 1) as delivery_rate
FROM alerts
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Supabase Dashboard Quick Links

1. **Incidents Overview**
   - Open Supabase → Project → SQL Editor
   - Run query above to see recent incidents
   - Look for: detection time < 30s, severity distribution

2. **Error Pattern Analysis**
   - Check `error_patterns` table for top patterns
   - Identify if same patterns repeating (should create prevention issues)

3. **Remediation Metrics**
   - Check `orchestrations` table for success rate
   - Target: > 90% success rate
   - Target: recovery time < 120s

4. **Alert Delivery**
   - Check `alerts` table for delivery status
   - Target: 100% delivery rate
   - If failures: check email/Slack configuration

---

## 2. Vercel Logs Monitoring

### Real-Time Log Monitoring

```bash
# Watch logs live
vercel logs newspulse-ai --follow

# Filter by error collection cron
vercel logs newspulse-ai --grep "error-collection" --follow

# Filter by email alerts
vercel logs newspulse-ai --grep "EMAIL" --follow

# Check recent deployments
vercel ls
```

### Key Log Patterns to Monitor

**Healthy Patterns:**
```
[error-collection-cron] Collected 5 error patterns in 234ms
[EMAIL] Sent via SendGrid to ex***@example.com: "🚨 CRITICAL: Database..."
[war-games] Scenario execution completed: Pool Exhaustion (8234ms)
[orchestration] Decision: execute-rollback (Risk: high)
```

**Warning Patterns (Investigate):**
```
[error-collection-cron] Failed to collect errors: Network timeout
[EMAIL] Email send failed: SendGrid API 429 (rate limited)
[orchestration] Decision: notify-founder (No auto-remediation available)
```

**Error Patterns (Immediate Action):**
```
[ERROR] CRON_SECRET validation failed
[ERROR] Supabase connection failed
[ERROR] Email provider misconfigured
```

---

## 3. Metrics Dashboard (DIY)

### Metrics to Track (Manually)

Create a simple dashboard/spreadsheet to track daily:

| Metric | Target | Check Daily | Location |
|--------|--------|------------|----------|
| MTTD (Detection) | < 30s | Supabase incidents table | avg detection_time |
| MTTR (Recovery) | < 120s | Supabase orchestrations table | avg recovery_time |
| Detection Accuracy | > 95% | Review incidents in dashboard | false positive count |
| Alert Delivery | 100% | Supabase alerts table | delivery_status = 'sent' / total |
| Remediation Success | > 90% | Supabase orchestrations table | succeeded / total |
| Cron Job Frequency | Every 60s | Vercel logs | error-collection timestamps |
| Error Rate (App) | < 1% | Vercel analytics | error percentage |
| Incidents Detected | Depends | Supabase incidents count | incident_id count |

### Daily Checklist Template

```markdown
## Production Health Check - [DATE]

### Supabase Metrics
- [ ] Incidents detected: ___ (expected: 0-5)
- [ ] Detection time: avg ___ ms (target: < 30000ms)
- [ ] Recovery time: avg ___ ms (target: < 120000ms)
- [ ] Alert delivery rate: __% (target: 100%)
- [ ] Remediation success: __% (target: > 90%)

### Vercel Metrics
- [ ] Error rate: ___ (target: < 1%)
- [ ] Cron job last run: ___ (should be recent)
- [ ] Deployment status: [Ready/Error]

### Alerts Received
- [ ] Email alerts: ___ (expected: notify on critical incidents)
- [ ] Slack alerts: ___ (if configured)
- [ ] False positives noted: ___

### Issues Found
- [ ] None
- [ ] Minor (log for investigation)
- [ ] Critical (immediate action needed)

### Action Items
- [ ] ...
```

---

## 4. Alert Configuration

### Email Alerts

**Configured in:** FounderAlertingSystem (lib/founder-alerting.ts)  
**Recipients:** Founder email (FOUNDER_EMAIL env var)  
**Channels:**
- Critical incidents (severity = critical)
- Remediation success/failure
- Repeated error patterns

**Expected Alert Examples:**
```
Subject: 🚨 CRITICAL: Database connection failed
From: noreply@newspulse-ai.com
To: founder@example.com

Content: Incident details, recovery estimate, action button to dashboard
```

### Slack Alerts (Optional)

**Configured via:** SLACK_WEBHOOK_URL environment variable

**Setup Steps:**
1. Go to Slack workspace → Settings → Integrations
2. Create Incoming Webhook
3. Copy webhook URL
4. Set SLACK_WEBHOOK_URL in Vercel environment

**Expected Alert Format:**
```
🚨 CRITICAL: Database connection failed
• Incident ID: incident-abc123
• Category: Database
• Severity: CRITICAL
• Decision: Rollback deployment
• Status: ✅ Automated remediation in progress
[View Incident Dashboard Button]
```

---

## 5. Health Checks

### Endpoint Health Monitoring

```bash
# Basic health check (should return { status: "healthy" })
curl https://newspulse-ai-production.vercel.app/api/health -s | jq .

# Verify error collection is working
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET" -s | jq .

# Check war games endpoint (requires auth)
curl https://newspulse-ai-production.vercel.app/api/war-games?action=scenarios \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" -s | jq .total

# Verify database connection
curl https://newspulse-ai-production.vercel.app/api/health/db -s | jq .database
```

### Automated Health Monitoring Script

```bash
#!/bin/bash
# Save as: scripts/health-check.sh

PROD_URL="https://newspulse-ai-production.vercel.app"
CRON_SECRET="$1"
WIRING_SECRET="$2"

echo "=== Production Health Check ==="
echo "Time: $(date)"

# 1. API Health
echo -n "API Health: "
curl -s "$PROD_URL/api/health" | jq -r '.status' || echo "FAILED"

# 2. Cron Endpoint
echo -n "Cron Endpoint: "
curl -s -X POST "$PROD_URL/api/production-error-collection/cron" \
  -H "Authorization: Bearer $CRON_SECRET" | jq -r '.success' || echo "FAILED"

# 3. War Games (List scenarios)
echo -n "War Games: "
curl -s "$PROD_URL/api/war-games?action=scenarios" \
  -H "Authorization: Bearer $WIRING_SECRET" | jq -r '.total' && echo " scenarios available" || echo "FAILED"

echo "=== End Health Check ==="
```

**Usage:**
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh $CRON_SECRET $PRODUCTION_WIRING_SECRET
```

---

## 6. Incident Investigation Workflow

### When Alert Received

1. **Immediate (< 5 min)**
   - Check dashboard: https://newspulse-ai-production.vercel.app/dashboard
   - Note incident ID from alert
   - Check if auto-remediation executed

2. **Quick Assessment (5-15 min)**
   ```sql
   -- Get incident details
   SELECT * FROM incidents WHERE incident_id = 'incident-abc123';
   
   -- Get associated error patterns
   SELECT * FROM error_patterns 
   WHERE fingerprint = (SELECT error_fingerprint FROM incidents WHERE incident_id = 'incident-abc123');
   
   -- Check remediation decision
   SELECT * FROM orchestrations WHERE incident_id = 'incident-abc123';
   ```

3. **Deep Dive (15+ min)**
   - Check Vercel logs: `vercel logs newspulse-ai --grep "incident-abc123"`
   - Review production metrics for that time period
   - Check if incident is still ongoing or resolved

4. **Documentation**
   - Create post-mortem issue if critical
   - Note lessons learned
   - Update playbooks if needed

---

## 7. Performance Baselines

### Normal Operation Baselines

**Detection (MTTD):**
- Minimum: 5 seconds (fastest detection)
- Average: 15-20 seconds (normal)
- Maximum: 30 seconds (acceptable)
- **Alert if:** MTTD > 60 seconds for 3 consecutive incidents

**Recovery (MTTR):**
- Minimum: 10 seconds (fast rollback)
- Average: 60-90 seconds (normal remediation)
- Maximum: 120 seconds (acceptable)
- **Alert if:** MTTR > 180 seconds for critical incident

**Detection Accuracy:**
- Expected: 95%+ (only 1 false positive per 20 incidents)
- **Alert if:** False positive rate > 10% in last 24 hours

**Alert Delivery:**
- Expected: 100% delivery rate
- **Alert if:** Delivery rate < 99% (1+ missed alerts)

---

## 8. Monthly Review Process

### End-of-Month Metrics Review

```sql
-- Generate monthly report
SELECT 
  'MTTD' as metric,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds,
  MIN(EXTRACT(EPOCH FROM (updated_at - created_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_seconds
FROM incidents
WHERE created_at > DATE_TRUNC('month', NOW())
UNION ALL
SELECT 
  'MTTR',
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))),
  MIN(EXTRACT(EPOCH FROM (updated_at - created_at))),
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at)))
FROM orchestrations
WHERE created_at > DATE_TRUNC('month', NOW())
  AND execution_status = 'succeeded';
```

### Questions to Answer

1. Were SLA targets met? (MTTD < 30s, MTTR < 120s)
2. What was the most common error pattern?
3. Did any false positives occur? What caused them?
4. What prevention measures were created?
5. Are there patterns in remediation failures?

---

## Support & Troubleshooting

**Monitoring Not Working?**
1. Check Vercel deployment is "Ready"
2. Verify Supabase connection: `psql $SUPABASE_DB_URL -c "SELECT 1"`
3. Check environment variables: `node scripts/pre-deployment-check.mjs`
4. Review Vercel logs: `vercel logs newspulse-ai --follow`

**Alerts Not Arriving?**
1. Check EMAIL_PROVIDER configuration
2. Test email send: See "Alert Configuration" section
3. Check spam folder
4. Review Vercel logs for email errors

**Metrics Look Off?**
1. Verify data in Supabase (correct tables, recent entries)
2. Check if cron job is running (every 60 seconds)
3. Review error patterns for data quality issues
4. Check if incidents are actually occurring in production

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Status:** Ready for use
