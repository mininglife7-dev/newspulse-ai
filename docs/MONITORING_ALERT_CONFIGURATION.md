# NewsPulse AI — Monitoring & Alert Configuration

**Status:** Pre-Production Setup  
**Created:** 2026-07-16  
**Authority:** Executive Governor (Autonomous Execution)

Quick-reference guide for configuring monitoring and alerting services. Use before first production deployment.

---

## Overview

Production monitoring requires three alert layers:

1. **Uptime Monitoring** — Is the site responding? (5-minute intervals)
2. **Error Tracking** — What's breaking? (Real-time)
3. **Performance Monitoring** — How fast? (Continuous)

---

## Part 1: Vercel Deployment Alerts

### Setup (5 minutes)

**Step 1: Go to Vercel Project Settings**

```
1. https://vercel.com/dashboard/newspulse-ai
2. Click Settings tab
3. Left sidebar: Notifications
```

**Step 2: Configure Email Notifications**

```
Enable:
☐ Deployment Started
☐ Deployment Ready (success)
☐ Deployment Error (build failed)
☐ Production Deployment (code deployed to prod)

Recipient: [your-email@company.com]
```

**Step 3: Configure Slack Integration (Optional)**

```
1. Settings → Integrations → Slack
2. Connect workspace
3. Choose #alerts channel
4. Same notifications as email
```

### What It Monitors

- Build success/failure
- Deployment completion
- Environment variable changes
- Custom domain issues

### What It Doesn't Monitor

- ❌ API response times
- ❌ Error rates
- ❌ Database performance
- ❌ Application-level issues

**→ Use Sentry/error tracking for those**

---

## Part 2: Application Uptime Monitoring

### Service Options

**FREE/CHEAP:**

- UptimeRobot (free tier: 50 monitors, alerts via Slack/Discord)
- StatusPage.io (basic free tier)
- Datadog free tier

**PAID:**

- PagerDuty (professional incident response)
- Opsgenie (alert aggregation)

### UptimeRobot Setup (Recommended for MVP)

**Create Monitor:**

```
1. https://uptimerobot.com → Add Monitor
2. Name: "NewsPulse AI - Production Health"
3. Type: "HTTP(s)"
4. URL: https://newspulse-ai.vercel.app/api/production-health
5. Request Method: GET
6. Headers:
   Authorization: Bearer [ADMIN_TOKEN from environment]
7. Interval: 5 minutes
8. Timeout: 10 seconds
```

**Alert Settings:**

```
Alert when down for: 2 checks (10 minutes)
Notification channel: Slack webhook → #alerts

Message template:
🚨 Production Down - NewsPulse AI
Status: [status]
Response time: [response_time]ms
Checked: [check_time]
```

**Smart Alerts:**

```
Configure escalation:
1. First failure: Log only (no alert)
2. 2+ failures (10 min down): Slack alert
3. 3+ failures (15 min down): Email to founder
4. 5+ failures (25 min down): Phone call (if available)
```

---

## Part 3: Error Tracking

### Service Options

**FREE:**

- Sentry (free tier: 5k errors/month)
- Rollbar (free tier: limited history)

**BETTER:**

- Sentry Pro ($75+/month): More storage, better tools
- Bugsnag: Similar price, good UI

### Sentry Setup

**Step 1: Create Project**

```
1. https://sentry.io → New Organization → NewsPulse AI
2. Create project: Platform = Next.js
3. Copy DSN (Data Source Name)
```

**Step 2: Add to Vercel**

```
1. Vercel Settings → Environment Variables
2. Add: SENTRY_DSN=[paste-from-sentry]
3. Redeploy
```

**Step 3: Configure Alerts**

```
In Sentry → Alerts → Create Alert Rule

Rule 1: Error Spike
  When: Error count > 10 in 5 minutes
  Actions: Notify #alerts on Slack

Rule 2: New Error Pattern
  When: New error type detected
  Actions: Notify #alerts

Rule 3: Critical Error
  When: "CRITICAL" tag in error
  Actions: Notify team immediately
```

**Step 4: Verify Integration**

```
In application code, test:
Sentry.captureException(new Error("Test error"));

Check Sentry dashboard: Error should appear within 30s
```

### What Sentry Tracks

- ✅ Uncaught exceptions
- ✅ API error responses
- ✅ Slow transactions (performance)
- ✅ Database errors
- ✅ Error trends and patterns

### What Sentry Doesn't Track

- ❌ Uptime (use UptimeRobot)
- ❌ Business metrics (custom dashboard)

---

## Part 4: Database Monitoring (Supabase)

### Built-in Monitoring

**Go to:** Supabase Console → Project → Monitoring

**Check regularly:**

```
1. Database Status
   ☐ CPU: < 70%
   ☐ Memory: < 80%
   ☐ Storage: Growing at expected rate

2. Query Performance
   ☐ Slow queries (> 1s): Any?
   ☐ Query count: Stable?
   ☐ Connection pool: < 80% utilized

3. Replication Status (if applicable)
   ☐ Replication lag: < 100ms
   ☐ WAL queue: Not growing
```

### Alerts to Set (Supabase → Alerts)

```
1. CPU > 80%
   Action: Scale up resources or optimize queries

2. Storage growing > 100MB/day
   Action: Check for data bloat or logging issues

3. Connection pool utilization > 90%
   Action: Increase max connections or check for leaks

4. Replication lag > 500ms
   Action: Check network, upgrade read replica
```

---

## Part 5: Application Performance Monitoring

### Vercel Analytics (Built-in)

**Access:** Vercel Dashboard → Analytics tab

**Metrics available:**

- Web Vitals (LCP, FCP, CLS)
- API route response times
- Request volume by endpoint
- Status code distribution

**Alert thresholds to set:**

```
1. Web Vitals LCP > 2.5s
   Impact: User perceives slow page load
   Action: Optimize next/image, lazy load JS

2. API P95 > 2s
   Impact: Affects user workflows
   Action: Optimize queries, add caching

3. Error rate > 1%
   Impact: Some users experience failures
   Action: Investigate error logs

4. 4xx rate spike
   Impact: Users submitting bad requests
   Action: Improve client-side validation, docs
```

### Custom Monitoring (via health endpoints)

**We have two health check endpoints:**

```
1. /api/health
   - Basic connectivity check
   - Database reachability
   - Called by UptimeRobot every 5 minutes

2. /api/production-health
   - Comprehensive health checks
   - Landing page loads?
   - Auth flow works?
   - API endpoints responding?
   - Required: Bearer token (ADMIN_TOKEN)
```

**Add alerts for production-health:**

```
UptimeRobot monitor:
  URL: https://newspulse-ai.vercel.app/api/production-health
  Headers: Authorization: Bearer [ADMIN_TOKEN]
  Alert: If response != 200 or status != "healthy"
```

---

## Part 6: Team Notifications

### Slack Integration

**Create alerts channel:**

```
#production-alerts (public)
#incidents (private, for team post-mortems)
#monitoring (system monitoring feed)
```

**Slack webhook URLs:**

```
1. Go to your workspace → Settings → Manage Apps
2. Search "Incoming Webhooks"
3. Create webhook for #production-alerts
4. Copy webhook URL
5. Add to UptimeRobot, Sentry, etc.
```

**Notification routing:**

```
Priority 1 (Critical):
  → Slack #production-alerts + email to founder

Priority 2 (High):
  → Slack #production-alerts

Priority 3 (Medium):
  → Slack #monitoring

Priority 4 (Low):
  → Email digest (daily)
```

### Message Format

**For consistent alerting, use this format:**

```
🚨 [CRITICAL/HIGH/MEDIUM] - [ISSUE TYPE]

What: [What's broken]
Where: [Which endpoint/feature]
When: [How long/timestamp]
Impact: [What users experience]
Status: [Investigating/Rolling back/Resolved]

Action: [What we're doing]
Next update: [When]
```

---

## Part 7: Alert Response SLA

### Response Time Commitments

| Severity | Detect   | Acknowledge | Resolve Target |
| -------- | -------- | ----------- | -------------- |
| CRITICAL | < 5 min  | < 5 min     | < 15 min       |
| HIGH     | < 10 min | < 10 min    | < 1 hour       |
| MEDIUM   | < 30 min | < 30 min    | < 4 hours      |
| LOW      | < 1 day  | < 1 day     | Next sprint    |

### On-Call Rotation (Optional)

For production services, consider:

```
1. Primary: [Founder or lead engineer]
2. Secondary: [Backup engineer]
3. Schedule: Rotate weekly

Tools: PagerDuty or Opsgenie for escalation
```

---

## Part 8: Pre-Production Checklist

**Before deploying to production, complete:**

```
Vercel Setup:
☐ Deployment notifications configured
☐ Environment variables set
☐ Production domain pointed correctly

Uptime Monitoring:
☐ UptimeRobot monitor created for /api/health
☐ Slack notifications working
☐ Test alert sent successfully

Error Tracking:
☐ Sentry project created and DSN added
☐ Sentry alerts configured
☐ Test error logged and notified

Database Monitoring:
☐ Supabase alerts configured
☐ Backup schedule verified
☐ Replication lag acceptable

Team Notification:
☐ Slack #production-alerts channel created
☐ Team members have notification access
☐ Escalation contacts documented

Documentation:
☐ Incident response playbooks reviewed
☐ Disaster recovery runbook reviewed
☐ On-call person identified
```

---

## Part 9: Monitoring Dashboard Setup

### Create Status Page (Optional but Recommended)

**Use:** StatusPage.io or Vercel's built-in

```
1. Create public status page
2. Add your critical services:
   - API availability
   - Database connectivity
   - Auth service
   - Customer dashboard

3. Set up automated status updates:
   - Green: All checks passing
   - Yellow: Degraded performance
   - Red: Critical issues

4. Share URL publicly (shows customers system health)
```

### Internal Monitoring Dashboard

**Assemble in Grafana or Datadog:**

```
Panels to include:
1. API response times (P50, P95, P99)
2. Error rate (% of requests)
3. Database connection pool usage
4. Memory usage
5. Request volume by endpoint
6. HTTP status code distribution

Refresh rate: 30 seconds (update every 30s)
Purpose: Visual status at a glance
```

---

## Part 10: Regular Maintenance

### Weekly (Founder)

```
☐ Review Sentry error summary
☐ Check UptimeRobot stats (uptime %)
☐ Review Vercel analytics trends
☐ Note any anomalies for follow-up
```

### Monthly (Team)

```
☐ Review alert volume (tuning needed?)
☐ Test disaster recovery procedures
☐ Update runbooks if issues found
☐ Review SLA compliance (did we respond fast enough?)
☐ Discuss trends and improvements
```

### Quarterly

```
☐ Audit monitoring coverage (any blind spots?)
☐ Review alert thresholds (still relevant?)
☐ Plan capacity (growing traffic?)
☐ Update incident response processes
```

---

## Part 11: Alert Fatigue Prevention

### Common Mistakes

❌ **TOO MANY ALERTS**

- Every metric produces alert
- Team ignores alerts (alert fatigue)
- Real issues get missed

✅ **RIGHT NUMBER OF ALERTS**

- Only critical + high
- Medium/low caught in dashboards
- Team takes each alert seriously

### Tuning Strategy

Start with:

```
1. Uptime checks (critical)
2. Error spikes (high)
3. Database connection pool (high)
```

After 1 week, add:

```
4. Performance degradation (if users complaining)
5. Specific error types (if recurring pattern)
```

Remove alerts that:

- Fire constantly but are expected
- Rarely lead to action
- Duplicate other alerts

---

## Quick Reference

### Critical Alerts (Act Now)

```
☐ Uptime check failing (< 5 min)
☐ Error rate > 5%
☐ Auth broken (> 10% failures)
☐ Database unreachable
☐ Health check returning 503
```

### Alert Links (Bookmarks)

```
Vercel: https://vercel.com/dashboard/newspulse-ai
Supabase: https://app.supabase.com/
Sentry: https://sentry.io/organizations/newspulse-ai/
UptimeRobot: https://uptimerobot.com/
StatusPage: [your-status-page-url]
```

### Test Alert Setup

```bash
# Trigger a test error
curl -X POST https://newspulse-ai.vercel.app/api/test-alert

# Check if:
1. Sentry receives error (Dashboard → Events)
2. Slack notification fires (#production-alerts)
3. UptimeRobot shows status change

All three? ✓ Alerts working correctly
```

---

## Conclusion

Monitoring is insurance. We hope to never use it, but when we do need it, every second matters. This configuration gives us:

- **5-minute incident detection** (UptimeRobot)
- **Real-time error visibility** (Sentry)
- **Performance trending** (Vercel Analytics)
- **Database health** (Supabase monitoring)
- **Team coordination** (Slack alerts)

**Set it up before deployment. Test it works before production goes live.**

---

**Version:** 1.0  
**Last Updated:** 2026-07-16  
**Owner:** Executive Governor
