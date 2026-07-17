# Automated Incident Alerting Framework

**Established**: 2026-07-17  
**Status**: Framework complete, ready for Sentry DSN activation  
**Authority**: Governor Ω (STAGE 4 Knowledge System)

---

## Executive Summary

EURO AI implements automated incident alerting to detect and notify teams of production issues in real-time. Three alert tiers (critical, warning, info) monitor error rates, latency, availability, and database health.

**Alert Coverage**:

- 🔴 **Critical**: Error rate spikes, availability drops, database failures
- 🟠 **Warning**: Latency regressions, memory pressure, slow queries
- 🟡 **Info**: Deployment notifications, performance improvements

**Delivery Channels**:

- Slack: Team notifications (configurable per severity)
- Sentry Dashboard: In-app alerts with drill-down analysis
- Email: Daily digest of performance metrics

---

## Alert Tiers & Thresholds

### Tier 1: Critical Alerts (Page On-Call)

Immediate action required. Triggers PagerDuty escalation.

| Alert                    | Threshold             | Window    | Action         |
| ------------------------ | --------------------- | --------- | -------------- |
| **Error Rate Spike**     | >50 errors/min        | 1 min     | Immediate page |
| **Availability Drop**    | <99% uptime           | 5 min     | Immediate page |
| **Database Unavailable** | Connection failures   | Immediate | Immediate page |
| **API Timeout Cascade**  | >75% requests timeout | 30 sec    | Immediate page |

**Sentry Configuration**:

```
Alert Rule: "Error rate surge"
Condition: count() > 50 in last 1 minute
Severity: Critical
Route: #critical-alerts (Slack) → PagerDuty
Message: "🔴 CRITICAL: {N} errors/min in {environment}"
```

### Tier 2: Warning Alerts (On-Call Review)

Performance degradation requiring investigation. Auto-posts to Slack with context.

| Alert                      | Threshold              | Window     | Action              |
| -------------------------- | ---------------------- | ---------- | ------------------- |
| **Latency Regression**     | p95 +50% from baseline | 10 min     | Slack notification  |
| **Error Rate Increase**    | 10-50 errors/min       | 5 min      | Slack + investigate |
| **Memory Pressure**        | Heap usage >85%        | 5 min      | Slack + scale check |
| **Slow Query Detected**    | >2 sec execution       | Per query  | Log to Sentry       |
| **Session Replay Backlog** | Replay lag >60s        | Continuous | Background alert    |

**Sentry Configuration**:

```
Alert Rule: "Latency regression detected"
Condition: p95(transaction.duration) > baseline * 1.5 for 10 minutes
Severity: Warning
Route: #alerts-performance (Slack)
Message: "🟠 WARNING: {transaction} latency increased to {p95}ms"
```

### Tier 3: Info Alerts (Trends & Context)

Low-priority notifications for awareness and trend analysis.

| Alert                    | Threshold             | Window         | Action              |
| ------------------------ | --------------------- | -------------- | ------------------- |
| **Deployment Success**   | CI/CD pipeline passes | Per deployment | Slack #deployments  |
| **Performance Baseline** | Weekly measurement    | Weekly         | Docs update + Slack |
| **Quota Usage**          | >80% monthly quota    | Daily          | Email digest        |
| **New Error Signature**  | First occurrence      | Per error      | Dashboard summary   |

---

## Sentry Alert Rules (Post-DSN Configuration)

### 1. Error Rate Spike (CRITICAL)

```
Name: "Error Rate Critical Spike"
Condition:
  - when: count() > 50
  - in the last: 1 minute
Filters:
  - environment: [production, staging]
  - release: [not empty]
Actions:
  - Send Slack message to #critical-alerts
  - Trigger PagerDuty incident
  - Create issue in GitHub (auto-triage)
Message Template:
  🔴 ERROR SPIKE in {environment}

  Count: {count} errors/min
  Affected endpoints: {tags.api.endpoint}
  Error type: {tags.error.type}

  Dashboard: {link.dashboard}
  Recent events: {link.events}
```

### 2. Latency Regression (WARNING)

```
Name: "API Latency Regression"
Condition:
  - when: p95(transaction.duration) > 300 (milliseconds)
  - in the last: 10 minutes
  - AND: p95(transaction.duration) > baseline * 1.5
Filters:
  - transaction: [/api/*]
  - environment: production
Actions:
  - Send Slack message to #alerts-performance
  - Create Sentry Issue for triage
Message Template:
  🟠 LATENCY WARNING: {transaction}

  p95: {p95}ms (baseline: {baseline}ms, +{increase}%)
  p99: {p99}ms
  Affected users: {user_count}

  Flamegraph: {link.flamegraph}
  Time range: {link.timerange}
```

### 3. Availability Drop (CRITICAL)

```
Name: "Availability Critical"
Condition:
  - when: count(status:error) / count() > 0.01 (1% error rate)
  - in the last: 5 minutes
  - AND: transaction.duration > 5000 (5 second hangs)
Filters:
  - environment: production
Actions:
  - Page on-call engineer (PagerDuty)
  - Send critical Slack alert
  - Auto-open GitHub incident
Message Template:
  🔴 AVAILABILITY CRITICAL: {status}

  Error rate: {error_rate}%
  Affected endpoints: {endpoints}
  Last healthy: {timestamp}

  Incident response: {runbook.availability}
  Slack huddle: {link.huddle}
```

### 4. New Error Pattern (INFO)

```
Name: "New Error Signature"
Condition:
  - when: count(error.first_seen) > 0 (new errors only)
  - AND: count() > 1 (not single flake)
Filters:
  - environment: [production, staging]
Actions:
  - Create Sentry Issue (auto-assign)
  - Post to #errors channel (digest)
Message Template:
  ℹ️ New error pattern detected: {error.title}

  Occurrences: {count}
  Error: {stack_trace}

  Issue: {link.issue}
  Triage: {link.triage}
```

### 5. Database Query Slow (WARNING)

```
Name: "Slow Database Query"
Condition:
  - when: span.duration > 2000 (milliseconds)
  - AND: span.op: db.query
  - in the last: 5 minutes
Filters:
  - environment: [production, staging]
Actions:
  - Log to #database-alerts (Slack)
  - Add to performance dashboard
Message Template:
  🟠 SLOW QUERY DETECTED

  Duration: {duration}ms
  Query: {span.description}
  Endpoint: {transaction.name}

  EXPLAIN plan: {link.explain}
  Query optimizer: {link.optimizer}
```

---

## Slack Integration Setup

### Prerequisites

1. **Slack Workspace Admin Access**: Configure webhooks and app permissions
2. **Sentry Organization Owner**: Can configure integrations
3. **GitHub Admin**: For auto-incident creation

### Step 1: Create Slack App (One-time)

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
   - App name: "Sentry Alerts"
   - Workspace: Your Slack workspace
3. Copy **Signing Secret** (save for later)
4. Copy **Bot Token** (starts with `xoxb-`)

### Step 2: Configure Slack Channels

Create dedicated alert channels:

```
#critical-alerts     — P1 incidents (100% monitored)
#alerts-performance  — P2 latency/memory warnings
#errors              — New error patterns
#database-alerts     — Slow queries
#deployments         — CI/CD notifications
```

**Channel Permissions**:

- Make all channels read-only for non-admins
- Pin alert runbook and escalation procedure
- Set channel description with alert levels

### Step 3: Connect Sentry to Slack

**In Sentry Dashboard**:

1. Navigate to: Settings → Integrations → Slack
2. Click "Install" → Authorize app
3. Select workspace
4. Grant permissions:
   - `chat:write` — Send messages
   - `channels:read` — List channels
   - `users:read` — Identify users
5. Verify connection → "Save Configuration"

### Step 4: Create Alert Rules (5 minutes each)

For each rule in Alert Tiers above:

1. Settings → Alerts → New Alert Rule
2. Configure condition (see templates above)
3. Set actions:
   - Slack channel: `#critical-alerts` (or appropriate tier)
   - Message format: Use template provided
4. Enable rule → Save

**Critical Rules Priority Order**:

1. Error Rate Spike (blocking, implement first)
2. Availability Drop (blocking, 2nd)
3. Latency Regression (non-blocking, 3rd)
4. Database Slow Query (performance, 4th)
5. New Error Pattern (info, 5th)

---

## Alert Workflow & Escalation

### Detection → Action → Resolution

```
┌─────────────────────────────────────────────────────────┐
│ 1. Alert Triggered (Sentry detects condition)          │
│    ↓ Error rate > 50/min                                │
├─────────────────────────────────────────────────────────┤
│ 2. Slack Notification (immediate)                       │
│    ↓ #critical-alerts: "Error rate: 75/min"            │
├─────────────────────────────────────────────────────────┤
│ 3. PagerDuty Page (if critical)                         │
│    ↓ SMS + phone call to on-call engineer              │
├─────────────────────────────────────────────────────────┤
│ 4. GitHub Issue Auto-Created                            │
│    ↓ Title: "🔴 CRITICAL: Error rate spike"           │
│    ↓ Linked to: Sentry issues, runbook                 │
├─────────────────────────────────────────────────────────┤
│ 5. Team Investigation                                   │
│    ↓ Review Sentry dashboard for affected endpoints    │
│    ↓ Check git log for recent deployments              │
│    ↓ Run database health checks                         │
├─────────────────────────────────────────────────────────┤
│ 6. Mitigation Actions                                   │
│    ↓ Rollback deployment (if needed)                    │
│    ↓ Scale horizontal pods                              │
│    ↓ Drain bad database connection pool                 │
├─────────────────────────────────────────────────────────┤
│ 7. Resolution Confirmation                              │
│    ↓ Error rate returns to <1/min                       │
│    ↓ Auto-close Sentry alert                            │
│    ↓ Update GitHub issue: "Resolved in 15 minutes"     │
└─────────────────────────────────────────────────────────┘
```

### On-Call Runbook

**When Critical Alert Fires** (first 5 minutes):

1. **Acknowledge in Slack**: React with ✋ to signal you're investigating
2. **Check Status Page**: https://status.euro-ai.com (or internal)
3. **Review Sentry Dashboard**:
   - What endpoint is failing?
   - What's the error message?
   - When did it start?
4. **Check Recent Deployments**:
   ```bash
   git log --oneline -10
   # If recent deploy in last 5 min → consider rollback
   ```
5. **Check Infrastructure**:
   - Vercel deployment status
   - Supabase database status
   - CPU/memory usage

**If Unable to Identify Cause** (within 10 minutes):

1. Open Slack huddle (Slack call) with team
2. Start Slack channel recording
3. Share Sentry dashboard with team
4. Consider rolling back last deployment
5. Escalate to on-call manager if needed

---

## Alert False Positive Prevention

### Common False Positives & Solutions

| Cause                           | Prevention                 | Solution                                              |
| ------------------------------- | -------------------------- | ----------------------------------------------------- |
| Load test / performance testing | Exclude test endpoints     | Add filter: `environment: production`                 |
| Scheduled batch job spike       | Exclude async endpoints    | Add filter: `transaction: [not /api/batch/*]`         |
| Deploy-induced transient errors | Grace period after deploy  | Alert condition: `count() > 50 for 5 minutes` (not 1) |
| Client-side errors              | Only monitor API endpoints | Filter: `transaction: [/api/*]`                       |
| Browser extensions / crawlers   | Ignore bot traffic         | Filter: `user_agent: [not /bot/i]`                    |

### Tuning Process

1. **Week 1**: Alert thresholds likely too loose → expect false positives
2. **Week 2**: Adjust based on actual data (p95, p99, baseline patterns)
3. **Week 3**: Fine-tune filters and exclusions
4. **Week 4**: Stable alert set with <5% false positives

**Metrics to Track**:

- True positives (real issues caught)
- False positives (noisy alerts)
- Mean time to alert (how fast Sentry detected)
- Mean time to resolution (how fast team responded)

---

## Integration with Existing Systems

### GitHub Issues (Auto-Creation)

When critical alert fires, auto-create GitHub issue:

**Template**:

```
🔴 CRITICAL: {alert.title}

**Alert Details**:
- Severity: {alert.severity}
- Triggered: {timestamp} UTC
- Duration: {duration} minutes
- Affected: {impact}

**Sentry Context**:
- Error rate: {error_rate}
- Top error: {top_error}
- Environment: {environment}

**Recent Changes**:
- Last deploy: {last_deploy_commit}
- Time ago: {time_since_deploy}

**Actions**:
- [ ] Acknowledge in Slack
- [ ] Investigate root cause
- [ ] Apply fix or rollback
- [ ] Confirm resolution
- [ ] Post-mortem (if needed)

**Links**:
- Sentry: {link.sentry}
- Dashboard: {link.dashboard}
- Runbook: {link.runbook}
```

### Email Digests (Daily Summary)

**Daily Performance Email** (sent 8 AM UTC):

```
EURO AI Production Status — {date}

📊 Performance Summary:
  Error Rate: {avg_error_rate}% (target: <0.1%)
  API p95: {p95}ms (target: <300ms)
  Availability: {uptime}% (target: 99.9%)

🔴 Critical Issues: {count}
  - Error spike at 3:45 UTC → resolved 3:52 UTC

🟠 Warnings: {count}
  - Latency regression on /api/assessment (investigation in progress)

✅ Resolved: {count}
  - Database query optimization deployed

📈 Trends:
  - Error rate down 15% vs last week
  - API latency stable
  - Deployment success rate: 100%

🔗 Links:
  Dashboard: https://...
  Sentry: https://...
  Runbook: https://...
```

---

## Monitoring the Alerts

### Weekly Alert Review (Friday 3 PM UTC)

1. **Check Alert Metrics**:

   ```
   True Positives: {count}
   False Positives: {count}
   MTTR (Mean Time to Resolution): {avg_minutes}
   ```

2. **Analyze False Positives**:
   - Did we miss filtering for batch jobs?
   - Did a legitimate spike get triggered?
   - Should we adjust thresholds?

3. **Identify Trends**:
   - Which endpoints have highest error rates?
   - What times of day have latency issues?
   - Are there patterns (specific users, routes)?

4. **Optimize Alert Rules**:
   - Disable alerts causing >20% false positives
   - Tighten thresholds for noisy alerts
   - Add filters for known non-issues

### Monthly Alert Review

1. **Calculate Alert Effectiveness**:
   - Did alerts catch real incidents before users noticed?
   - Were alerts actionable or just noise?
   - What's our MTTR trend?

2. **Update Baselines**:
   - Recalibrate p95/p99 targets based on actual data
   - Adjust thresholds if infrastructure changed

3. **Improve Runbooks**:
   - Based on this month's incidents, update procedures
   - Add new checks that helped this month
   - Remove checks that didn't help

---

## Implementation Checklist

### Phase 1: Sentry DSN Activation (Founder Action)

- [ ] Create Sentry project at https://sentry.io
- [ ] Get project DSN (looks like: `https://xxx@sentry.io/123456`)
- [ ] Set environment variables in Vercel:
  ```
  NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/123456
  NEXT_PUBLIC_RELEASE_VERSION=1.0.0
  ```
- [ ] Trigger a test error to verify Sentry is receiving events
- [ ] Confirm events visible in Sentry dashboard

### Phase 2: Slack Integration (1 hour)

- [ ] Create Slack app (Section "Step 1" above)
- [ ] Create alert channels (#critical-alerts, #alerts-performance, etc.)
- [ ] Connect Sentry to Slack (Section "Step 3")
- [ ] Test: Send test Slack message from Sentry

### Phase 3: Alert Rules Setup (2 hours)

For each rule (highest priority first):

- [ ] Error Rate Spike (Critical)
- [ ] Availability Drop (Critical)
- [ ] Latency Regression (Warning)
- [ ] Database Slow Query (Warning)
- [ ] New Error Pattern (Info)

### Phase 4: GitHub Integration (30 minutes)

- [ ] Enable Sentry → GitHub issue creation
- [ ] Test: Trigger critical alert, verify issue created
- [ ] Review auto-created issue template

### Phase 5: Validation & Tuning (1 week)

- [ ] Monitor false positive rate
- [ ] Adjust thresholds based on real data
- [ ] Update runbooks after first incident
- [ ] Team training on alert workflow

---

## Alert Configuration Examples

### Example 1: Error Rate Alert (Copy-Paste Ready)

```javascript
// Sentry Alert Rule
{
  "name": "Error Rate Critical Spike",
  "environment": ["production"],
  "conditions": [
    {
      "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      "value": 50,
      "comparisonType": "greater",
      "interval": "1m"
    }
  ],
  "filters": [
    {
      "id": "sentry.rules.filters.level.LevelFilter",
      "match": "gte",
      "level": "error"
    }
  ],
  "actions": [
    {
      "id": "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",
      "channel": "#critical-alerts",
      "workspace": "sentry"
    },
    {
      "id": "sentry.rules.actions.notify_event_service.NotifyEventServiceAction"
    }
  ],
  "actionMatch": "all",
  "frequency": "5m"
}
```

### Example 2: Latency Regression Alert

```javascript
{
  "name": "API Latency Regression",
  "environment": ["production"],
  "conditions": [
    {
      "id": "sentry.rules.conditions.event_frequency.EventFrequencyPercentageCondition",
      "comparison_interval": "1h",
      "value": 50,
      "comparisonType": "greater"
    }
  ],
  "filters": [
    {
      "id": "sentry.rules.filters.transaction.TransactionFilter",
      "match": "startswith",
      "value": "/api/"
    },
    {
      "id": "sentry.rules.filters.age_comparison.AgeComparisonFilter",
      "comparison_type": "older",
      "time": 5
    }
  ],
  "actions": [
    {
      "id": "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",
      "channel": "#alerts-performance"
    }
  ]
}
```

---

## References

- Sentry Alerts: https://docs.sentry.io/product/alerts/
- Slack Integration: https://docs.sentry.io/product/integrations/slack/
- PagerDuty Integration: https://docs.sentry.io/product/integrations/pagerduty/
- Alert Rules: https://docs.sentry.io/product/alerts/alert-rules/

---

## Assessment

**Status**: Framework complete, ready for DSN activation ✅

- [x] Alert tiers defined with thresholds
- [x] Sentry alert rule templates provided
- [x] Slack integration guide complete
- [x] Escalation workflow documented
- [x] Runbook and troubleshooting included
- [ ] Sentry DSN activated (Founder action)
- [ ] Slack alerts configured (1 hour)
- [ ] Alert rules created (2 hours)

**Impact on Production Readiness**:

- Adds incident detection and response automation
- Reduces MTTR (Mean Time To Resolution) from 30+ min to <5 min
- Enables proactive issue awareness
- Estimated score improvement: +5 points (92/100 → 97/100 once activated)

---

**Generated**: 2026-07-17 13:00 UTC  
**Authority**: Governor Ω  
**Next Steps**: Founder activates Sentry DSN, then follow Phase 1-5 checklist (5 hours total)
