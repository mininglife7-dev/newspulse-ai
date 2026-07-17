# Monitoring & Alerting Runbook

**Type**: Runbook  
**Audience**: DevOps Engineers, Backend Leads, Operations  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each alert configuration change or quarterly  
**Time Estimate**: Varies by operation  
**Owner**: Governor Ω

---

## Quick Reference

Monitoring setup for production platform. Covers metric collection, alert configuration, threshold tuning, and responding to alerts.

**When to use**: Setting up monitoring, responding to alerts, investigating performance issues  
**Success criteria**: All critical services monitored, alerts timely and actionable, false positive rate <10%

---

## Monitoring Architecture

### Data Sources

**Application Logs**

- Source: Vercel & Supabase
- Format: JSON structured logs
- Retention: 30 days
- Use: Error tracking, debugging

**Database Metrics**

- Source: Supabase monitoring dashboard
- Metrics: CPU, memory, disk, connections, query time
- Frequency: Real-time
- Use: Performance monitoring

**Request Metrics**

- Source: Vercel analytics
- Metrics: Request count, latency, status codes
- Frequency: Per request
- Use: Availability and performance

**Custom Metrics**

- Source: Application instrumentation
- Metrics: Business events, custom counters
- Frequency: As events occur
- Use: Business and custom monitoring

### Monitoring Stack

- **Logs**: Supabase dashboard & Vercel logs
- **Metrics**: Supabase monitoring + custom tracking
- **Uptime**: Vercel status + custom health checks
- **Alerting**: Vercel alerts + logging

---

## Critical Alerts Configuration

### 1. Service Availability (CRITICAL)

**Alert**: Service is down or not responding

**Metric**: Health endpoint response status

**Threshold**:

- Health endpoint returns non-200 status
- OR health endpoint doesn't respond within 10 seconds

**Trigger**:

```bash
# Manual test
curl -s https://newspulse-ai.vercel.app/api/health | jq .

# Should show: status: healthy
# If not: CRITICAL alert
```

**Action**:

1. Verify service down (ping, access website)
2. Check Vercel status page for outages
3. If Vercel OK: Check database connection
4. Escalate to on-call engineer immediately
5. Post status update to customers

**Runbook**: See INCIDENT_RESPONSE.md - Service Down scenario

---

### 2. Error Rate Spike (HIGH)

**Alert**: Unexpected increase in error responses

**Metric**: HTTP 5XX responses (server errors)

**Threshold**:

- Error rate >5% of requests
- OR >100 errors in 1 minute

**Trigger**:

- Consecutive 5XX responses
- Example: 3 requests in a row return 500

**Action**:

1. Check error logs (Supabase/Vercel dashboard)
2. Identify error pattern (what endpoint, what cause)
3. Determine scope (all users or specific workspace)
4. Decide: Fix forward or rollback (see decision tree)
5. Page on-call engineer if not already aware

**Common causes**:

- Deployment issue (new code)
- Database migration incomplete
- Database connectivity lost
- Out of memory
- Disk space full

**Fix approach by cause**:

- Code issue: Rollback and investigate
- Database: Check connection pool and restart if needed
- Disk: Clean up old logs/backups
- Memory: Restart service

---

### 3. Database Performance Degradation (HIGH)

**Alert**: Database queries getting slower

**Metric**: Database query average response time

**Threshold**:

- Average query time >500ms (for <100ms queries)
- OR 99th percentile (P99) >2000ms
- OR connection count >50

**Trigger**:

```sql
SELECT
  mean_time,
  max_time,
  calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 5;
```

**Action**:

1. Identify slow query (see DATABASE_OPERATIONS.md)
2. Check for missing indexes
3. Check connection pool for leaks
4. Check database CPU usage
5. If CPU high: Kill long-running queries
6. Implement fix or escalate

**Common causes**:

- Missing index
- N+1 queries (loop fetching)
- Full table scan
- Long transaction
- Connection pool leak

---

### 4. Disk Space Low (MEDIUM)

**Alert**: Database or storage running out of space

**Metric**: Disk usage percentage

**Threshold**:

- Disk >90% full: Alert
- Disk >95% full: Critical

**Check**:

- Supabase dashboard → Database → Monitoring
- Disk usage shown (bytes used / total)

**Action**:

1. Estimate time until full (usage growth rate)
2. Check what's taking space:
   - Data tables (largest ones)
   - Indexes
   - Logs or temporary files
3. Immediate actions:
   - Delete old logs (if log table)
   - Delete large old backups
   - Vacuum/analyze to reclaim space
4. Long-term:
   - Archive old data
   - Optimize indexes
   - Add disk space (if available)

---

### 5. High CPU Usage (MEDIUM)

**Alert**: Server running hot, approaching resource limits

**Metric**: CPU usage percentage

**Threshold**:

- CPU >80%: Alert and investigate
- CPU >95%: Critical, may impact service

**Check**:

- Supabase dashboard → Database → Monitoring → CPU
- Vercel deployment → Resources

**Action**:

1. Identify what's using CPU:
   - Check slow queries (see Database Operations)
   - Check for runaway processes
   - Check for hot endpoint
2. Kill expensive long-running queries
3. Restart service if needed
4. Add indexes to slow queries
5. Scale resources if pattern repeats

---

### 6. Deployment Failure (HIGH)

**Alert**: Deployment to production failed

**Metric**: Vercel build status

**Threshold**:

- Build failed to complete
- OR build completed but health check failed

**Trigger**:

- GitHub Actions CI/CD shows red ✗
- Vercel dashboard shows deployment failed
- Health endpoint returns non-200 after deploy

**Action**:

1. Check Vercel build logs for error
2. Common failures:
   - Type error (TypeScript)
   - Lint error
   - Test failure
   - Build timeout
3. Fix error locally and push new commit
4. Or rollback to previous working deploy
5. Notify team of issue

**Runbook**: See DEPLOYMENT.md - Deployment failure

---

### 7. Authentication Service Unavailable (CRITICAL)

**Alert**: Users cannot log in

**Metric**: Auth endpoint returning errors

**Threshold**:

- /api/auth endpoints returning 5XX
- Login failing for all users

**Action**:

1. Check Supabase auth status
2. Verify database connectivity
3. Check auth configuration
4. Restart auth service if applicable
5. Escalate immediately

---

## Alert Configuration & Tuning

### Setting Up Alerts

#### Vercel Alerts

1. Go to Vercel dashboard → Settings → Alerts
2. Configure:
   - Build failure → Notify immediately
   - Deployment failure → Notify immediately
   - CPU/memory spike → Notify if >80%
   - Response time degradation → Notify if >5s

#### Custom Health Checks

Set up periodic health checks:

```bash
# Run every 5 minutes
*/5 * * * * /usr/local/bin/health-check.sh

# health-check.sh:
#!/bin/bash
response=$(curl -s https://newspulse-ai.vercel.app/api/health)
status=$(echo $response | jq -r '.status')

if [ "$status" != "healthy" ]; then
  # Send alert
  curl -X POST https://hooks.slack.com/... \
    -d '{"text":"Health check failed: '$response'"}'
fi
```

#### Database Alerts

In Supabase dashboard:

1. Go to Database → Monitoring
2. Set alert thresholds:
   - CPU: >80%
   - Connections: >50
   - Disk: >90%
   - Query time: >1000ms average

### Tuning Thresholds

**Problem**: Too many false alerts (alert fatigue)

**Solution**: Adjust thresholds

1. Review past 30 days of alerts
2. Identify false positives (alerts that didn't indicate real problems)
3. Raise threshold on those alerts
4. Example: If CPU frequently spikes to 75% without issues, raise alert to 85%

**Problem**: Missing real issues

**Solution**: Lower thresholds

1. Review incidents from past month
2. Ask: "Would an alert have caught this?"
3. If no: Lower threshold
4. Example: Database query degradation → Lower from 1000ms to 500ms

**Best practice**:

- Review thresholds monthly
- Adjust based on actual impact
- Target: 90% of alerts are actionable

---

## Responding to Alerts

### Alert Response Workflow

```
1. Alert triggers
   ↓
2. Receive notification (Slack, email, pager)
   ↓
3. Acknowledge alert (confirm you're investigating)
   ↓
4. Assess severity & impact
   ↓
5. Begin investigation (see specific runbooks)
   ↓
6. Implement fix
   ↓
7. Verify resolution
   ↓
8. Close alert
   ↓
9. Document postmortem (if incident)
```

### Severity Assessment

**CRITICAL (P1)**:

- Service down completely
- Data loss or corruption
- Security breach
- All customers affected
- **Response time**: <5 minutes

**HIGH (P2)**:

- Service degraded (slow, errors)
- Some users affected
- Features broken
- **Response time**: <30 minutes

**MEDIUM (P3)**:

- Minor feature issue
- Performance degraded but acceptable
- Single user affected
- **Response time**: <2 hours

**LOW (P4)**:

- Cosmetic issue
- Informational alert
- **Response time**: <1 day

### Alert Acknowledgment

When you receive alert:

1. **Acknowledge** the alert (in monitoring system or Slack)
   - Confirms you received it
   - Prevents duplicate notifications

2. **Assess** the situation
   - Is service actually down?
   - Manual health check to confirm
   - Check if other alerts support this

3. **Decide** action
   - Real incident? Start investigation
   - False positive? Silence alert, investigate why
   - Known issue? Use runbook
   - Unknown issue? Page additional help

---

## Common Alert Scenarios

### Scenario 1: Health Check Failing

**Alert**: "Health endpoint returning 500"

**Investigation**:

```bash
# Step 1: Verify alert
curl -v https://newspulse-ai.vercel.app/api/health

# Step 2: Check each component
curl https://newspulse-ai.vercel.app/api/health | jq '.components'

# Output: which components are failing?
# {
#   "database": "✓ healthy",
#   "auth": "✗ down",
#   "cache": "✓ healthy"
# }
```

**If database down**:

- See DATABASE_OPERATIONS.md → Emergency Recovery
- Restart database or restore from backup

**If auth down**:

- Check Supabase auth service status
- Verify auth configuration
- Restart service

**If all down**:

- Check Vercel deployment status
- Check for recent deploy issues
- Rollback if needed (see ROLLBACK.md)

### Scenario 2: Error Rate Spike

**Alert**: "Error rate >5% (was <1%)"

**Investigation**:

```bash
# What errors are happening?
# Check Supabase logs:
# Dashboard → Logs → Filter: "error" or "500"
# Look for pattern: which endpoint, what error message?
```

**Common patterns**:

- `cannot acquire connection` → Connection pool issue
  - Action: Kill old connections, restart service

- `column does not exist` → Migration didn't run
  - Action: Apply pending migrations, restart

- `insufficient permissions` → RLS policy broken
  - Action: Check RLS policies, roll back recent changes

- `timeout` → Query too slow
  - Action: Add index, optimize query, or rollback

### Scenario 3: Database Slow

**Alert**: "Query average time >500ms"

**Investigation**:

```sql
-- Identify slowest queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 5;

-- Example result:
-- SELECT * FROM evidence WHERE workspace_id = ... : 1200ms
```

**Actions by cause**:

- Missing index → Add index
- Full table scan → Add WHERE clause or index
- N+1 pattern → Fix code to batch queries
- Long transaction → Break into smaller transactions

### Scenario 4: Disk Full

**Alert**: "Disk 95% full"

**Investigation**:

```sql
-- What's using space?
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname NOT IN ('pg_', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Actions**:

- Delete old backups
- Archive old data to storage
- Drop old indexes
- Vacuum & analyze
- If still full: Add disk space or scale database

### Scenario 5: Deployment Failed

**Alert**: "Vercel deployment failed"

**Investigation**:

1. Check Vercel dashboard → Deployments
2. Find failed deployment
3. Click to see error log
4. Common errors:
   - `ERR_MODULE_NOT_FOUND` → Missing dependency
   - `TypeScript compilation failed` → Type error in code
   - `Build timeout` → Build taking too long
   - `Health check failed` → Deploy completed but service down

**Action**:

- Fix error and redeploy
- Or rollback to previous version (see ROLLBACK.md)

---

## Monitoring Dashboard

### Key Metrics to Track

Create dashboard showing:

| Metric               | Current | Target | Status |
| -------------------- | ------- | ------ | ------ |
| Uptime               | _%      | 99.5%  | ✓      |
| Error rate           | _%      | <1%    | ✓      |
| P95 latency          | __ms    | <500ms | ✓      |
| CPU                  | __%     | <80%   | ✓      |
| Database connections | __      | <20    | ✓      |
| Disk used            | _%      | <90%   | ✓      |

### Weekly Review

Update these metrics in WEEKLY_OPS_REVIEW.md:

- Uptime for past 7 days
- Average error rate
- Page load times
- Database performance
- Active users
- Incidents (if any)

---

## Alerting Best Practices

### Alert Tuning

**Principle**: Alert only on actionable problems

❌ Bad alerts (create fatigue):

- "CPU is 75%" (normal variation)
- "Query took 105ms" (normal)
- "User clicked button" (too detailed)

✅ Good alerts (actionable):

- "Error rate >5% (was <1%)"
- "Database slow (avg >500ms)"
- "Service unreachable"
- "Disk >90% full"

### Notification Channels

**Immediate (real-time)**:

- CRITICAL alerts → SMS or pager
- On-call engineer notified

**Urgent (within 30 min)**:

- HIGH alerts → Slack + email
- Team notified

**Important (within hours)**:

- MEDIUM alerts → Email or dashboard
- Can be reviewed in morning

**FYI (no urgency)**:

- LOW alerts → Dashboard only
- Reviewed in weekly ops

### Alert Documentation

For each alert, document:

1. **What it monitors**: What metric/service
2. **Why it matters**: Impact if it fails
3. **Threshold**: When it triggers
4. **Root causes**: Common reasons it alerts
5. **Fix steps**: How to respond

---

## Monitoring Maintenance

### Monthly Tasks

- [ ] Review alert thresholds (tune if needed)
- [ ] Review false positive rate (<10%?)
- [ ] Review alert response times
- [ ] Check monitoring tool health
- [ ] Verify backups of monitoring data

### Quarterly Tasks

- [ ] Review new metrics to add
- [ ] Audit alerting rules for redundancy
- [ ] Train team on new alerts
- [ ] Update this runbook if practices changed

---

## Monitoring Tools Reference

### Supabase Dashboard

Access: https://supabase.com → Select project → Database → Monitoring

Shows:

- CPU, memory, disk usage
- Connection count
- Query performance
- Replication lag

### Vercel Dashboard

Access: https://vercel.com → Select project → Deployments

Shows:

- Deployment status
- Build logs
- Function performance
- Usage analytics

### Application Logs

Access: Supabase → Logs (same dashboard as monitoring)

Shows:

- SQL execution
- API requests
- Errors
- Custom events

---

## Related Documents

- `RUNBOOKS/INCIDENT_RESPONSE.md` — How to handle incidents
- `CHECKLISTS/WEEKLY_OPS_REVIEW.md` — Routine health checks
- `CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md` — Compliance verification
- `RUNBOOKS/DATABASE_OPERATIONS.md` — Database troubleshooting

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
