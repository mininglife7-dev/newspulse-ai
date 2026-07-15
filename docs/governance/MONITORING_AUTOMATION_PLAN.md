# Production Monitoring Automation Plan

**Purpose:** Design automated health checking and alert escalation for production.  
**Status:** Specification (implementation blocked pending GitHub Actions spending limit)  
**Dependency:** GitHub Actions spending limit ≥$50/month  
**Timeline:** 2-3 hours implementation (Phase 2)

---

## Overview

Automate production monitoring to catch issues before customers notice them.

### Current State

- ✅ Manual monitoring dashboard (FOUNDER_MONITORING_DASHBOARD.md)
- ✅ Verification scripts (pre-customer-verification.sh, runtime-health-check.sh)
- ✅ Incident response runbooks (INCIDENT_RESPONSE_RUNBOOKS.md)
- ❌ Automated monitoring workflows (BLOCKED: GitHub Actions spending limit)

### Desired State

- ✅ Automated health checks every 5 minutes
- ✅ Real-time alerts on failures
- ✅ Historical trending for performance
- ✅ Email/Slack notifications
- ✅ Self-healing for common issues (auto-retry connection pools)

---

## Phase 1: Health Check Automation (5-minute cadence)

### Workflow: `monitor-production-health.yml`

**Trigger:** Every 5 minutes  
**Runs:** ~2 minutes  
**Actions:**

```yaml
name: Monitor Production Health
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch: # Manual trigger

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      # 1. Check deployment status
      - name: Check Vercel Status
        run: |
          STATUS=$(curl -s "https://api.vercel.com/v13/teams/me/projects/${{ secrets.VERCEL_PROJECT_ID }}/deployments?limit=1" \
            -H "Authorization: Bearer ${{ secrets.VERCEL_API_TOKEN }}" | jq '.deployments[0].state')
          if [[ "$STATUS" != '"READY"' ]]; then
            echo "❌ Deployment status: $STATUS"
            exit 1
          fi
          echo "✅ Deployment ready"

      # 2. Check API health
      - name: Check API Health
        run: |
          RESPONSE=$(curl -s https://newspulse-ai.vercel.app/api/health)
          DB_OK=$(echo "$RESPONSE" | jq -r '.db // "unknown"')
          if [[ "$DB_OK" != "ok" ]]; then
            echo "❌ Database connection failed"
            exit 1
          fi
          echo "✅ API healthy"

      # 3. Check error rate
      - name: Check Error Rate
        run: |
          # Query Vercel logs for errors in last 5 minutes
          ERROR_RATE=$(curl -s "https://api.vercel.com/v13/teams/me/projects/${{ secrets.VERCEL_PROJECT_ID }}/logs?since=-5m" \
            -H "Authorization: Bearer ${{ secrets.VERCEL_API_TOKEN }}" | jq '.logs[] | select(.level=="error") | length')
          if [[ $ERROR_RATE -gt 5 ]]; then
            echo "⚠️ High error rate: $ERROR_RATE errors in 5 min"
            exit 1
          fi
          echo "✅ Error rate normal: $ERROR_RATE errors"

      # 4. Check Supabase
      - name: Check Supabase Status
        run: |
          STATUS=$(curl -s "https://status.supabase.com/api/v2/status.json" | jq '.status.indicator')
          if [[ "$STATUS" != '"operational"' ]]; then
            echo "❌ Supabase status: $STATUS"
            exit 1
          fi
          echo "✅ Supabase operational"

      # 5. Log results
      - name: Log Results
        if: always()
        run: |
          TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
          RESULT="$TIMESTAMP,health-check,${{ job.status }}"
          # Append to workflow-logs in repo
          echo "$RESULT" >> monitoring-logs.txt
          git config user.email "governor@euroai.com"
          git config user.name "Governor"
          git add monitoring-logs.txt
          git commit -m "Log health check: ${{ job.status }}"
          git push

      # 6. Alert on failure
      - name: Alert on Failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🚨 Production Health Check Failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Production health check failed at '"$(date)"'\n\nCheck logs: '"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"'"
                  }
                }
              ]
            }'
```

**Monitoring Endpoints Checked:**

- `/api/health` — Database connectivity, deployment version
- Vercel API — Deployment status, build logs, error rates
- Supabase status API — Database service health
- GitHub Actions logs — Error patterns, failure rates

---

## Phase 2: Performance Baseline Tracking (Hourly)

### Workflow: `track-performance-baseline.yml`

**Trigger:** Hourly (every hour)  
**Runs:** ~1 minute  
**Purpose:** Detect performance regressions

```yaml
name: Track Performance Baseline
on:
  schedule:
    - cron: '0 * * * *' # Every hour

jobs:
  performance-check:
    runs-on: ubuntu-latest
    steps:
      - name: Measure API Response Time
        run: |
          # Measure 10 requests, get average
          for i in {1..10}; do
            curl -w '%{time_total}\n' -o /dev/null -s \
              https://newspulse-ai.vercel.app/api/health
          done > /tmp/times.txt

          AVG=$(awk '{s+=$1} END {print s/NR}' /tmp/times.txt)
          echo "Average response time: ${AVG}s"

          # Alert if >1 second (2x baseline)
          if (( $(echo "$AVG > 1.0" | bc -l) )); then
            echo "⚠️ Slow response: ${AVG}s"
            exit 1
          fi

          # Log baseline
          TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
          echo "$TIMESTAMP,$AVG" >> performance-log.csv

      - name: Push Performance Log
        run: |
          git config user.email "governor@euroai.com"
          git config user.name "Governor"
          git add performance-log.csv
          git commit -m "Log performance: ${{ job.status }}" || true
          git push
```

---

## Phase 3: Error Aggregation & Trending (Every 12 hours)

### Workflow: `aggregate-errors.yml`

**Trigger:** Every 12 hours (morning and evening)  
**Purpose:** Identify error patterns and trends

```yaml
name: Aggregate Errors
on:
  schedule:
    - cron: '0 0,12 * * *' # 00:00 and 12:00 UTC

jobs:
  aggregate-errors:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Error Logs
        run: |
          # Get last 12 hours of errors from Vercel
          ERRORS=$(curl -s "https://api.vercel.com/..." \
            -H "Authorization: Bearer ${{ secrets.VERCEL_API_TOKEN }}" \
            | jq '.logs[] | select(.level=="error")')

          # Group by error type
          echo "$ERRORS" | jq -r '.message' | sort | uniq -c | sort -rn > error-summary.txt

      - name: Identify Patterns
        run: |
          # Check for recurring errors
          cat error-summary.txt | while read count error; do
            if [[ $count -gt 10 ]]; then
              echo "🔴 Recurring error ($count occurrences): $error"
            fi
          done

      - name: Email Alert
        if: failure()
        run: |
          # Send email digest to founder
          curl -X POST https://api.sendgrid.com/v3/mail/send \
            -H "Authorization: Bearer ${{ secrets.SENDGRID_API_KEY }}" \
            -d '{
              "personalizations": [{
                "to": [{"email": "founder@euroai.com"}]
              }],
              "subject": "Production Error Summary - Last 12h",
              "content": [{"type": "text/plain", "value": "$(cat error-summary.txt)"}]
            }'
```

---

## Phase 4: Automated Recovery (Optional, Phase 2+)

### Auto-Recovery Actions

For known recoverable issues:

```yaml
- name: Recover from Connection Pool Exhaustion
  if: failure() && contains(github.event.pull_request.body, 'connection pool')
  run: |
    # Restart Vercel deployment
    curl -X POST https://api.vercel.com/v13/deployments \
      -H "Authorization: Bearer ${{ secrets.VERCEL_API_TOKEN }}" \
      -d '{"action": "redeploy", "deploymentId": "${{ secrets.LAST_DEPLOYMENT_ID }}"}'

    # Wait 2 minutes, re-check
    sleep 120
    curl -f https://newspulse-ai.vercel.app/api/health || exit 1
```

---

## Implementation Checklist

### Prerequisites

- [ ] GitHub Actions spending limit ≥$50/month (FOUNDER ACTION)
- [ ] Vercel API token in GitHub Secrets (FOUNDER ACTION)
- [ ] Supabase API credentials configured
- [ ] Slack webhook (optional, Phase 2)
- [ ] SendGrid API key (optional, for email alerts)

### Workflows to Create

#### Tier 1 (Critical, implement first)

- [ ] `monitor-production-health.yml` — 5-min cadence health checks
- [ ] `verify-deployment.yml` — Verify live code matches main branch

#### Tier 2 (Important, implement second)

- [ ] `track-performance-baseline.yml` — Hourly performance monitoring
- [ ] `aggregate-errors.yml` — 12-hourly error pattern detection

#### Tier 3 (Nice-to-have, implement later)

- [ ] `auto-recovery.yml` — Automated self-healing
- [ ] `cost-anomaly-detection.yml` — Alert on spending spikes
- [ ] `security-scan.yml` — Daily dependency vulnerability checks

### Secrets Needed

| Secret              | Source                                       | Required For          |
| ------------------- | -------------------------------------------- | --------------------- |
| `VERCEL_API_TOKEN`  | Vercel dashboard → Tokens                    | Deployment monitoring |
| `VERCEL_PROJECT_ID` | Vercel dashboard → Project settings          | Deployment API calls  |
| `SLACK_WEBHOOK_URL` | Slack workspace → Apps → Custom Integrations | Slack alerts          |
| `SENDGRID_API_KEY`  | SendGrid → API Keys                          | Email digests         |
| `SUPABASE_API_KEY`  | Supabase → API                               | Database monitoring   |

---

## Monitoring Dashboards (Phase 2)

Once workflows are running, create public dashboards:

### Real-Time Dashboard

- Current deployment status (Ready / Building / Failed)
- API response time (last 1h, last 24h)
- Error rate (last 1h)
- Database connection status
- Recent incidents (last 7 days)

### Historical Trends

- Performance baseline graph (30-day trend)
- Error rate trend (7-day)
- Uptime calendar (7-day, 30-day)
- Cost trend (weekly spending)

### Customer Impact

- Affected customers during outages
- Customer reported issues (last 24h)
- Customer satisfaction trend

---

## Alert Thresholds

### 🔴 CRITICAL (Immediate notification)

- Deployment status: FAILED
- API down: 3 consecutive health check failures
- Error rate: >15% in last 5 min
- Database connection: Failed

### 🟠 HIGH (30-minute digest)

- Response time: >2 sec (3x baseline)
- Error rate: 5-15% in last hour
- Memory usage: >80%
- Database query latency: >1 sec (p95)

### 🟡 MEDIUM (Hourly digest)

- Response time: >1 sec (2x baseline)
- Error rate: 1-5% in last hour
- Build warning: Tests pass but lint issues
- Cost spike: >1.5x daily average

---

## Current Blockers

🔴 **GitHub Actions Spending Limit**

- Current: $0 (limit exhausted)
- Required: ≥$50/month
- Action: Founder increases limit (FOUNDER_ACTION_BOARD.md #2)
- Timeline: 5 minutes to fix
- Blocking: All automated monitoring workflows

Once Founder increases limit:

1. Workflows will execute immediately
2. Health checks run every 5 minutes
3. Alerts begin firing
4. Trends start being collected

---

## Success Metrics (Phase 2)

After implementing automated monitoring:

✅ Health checks: 100% success rate for green deployments  
✅ Alert accuracy: <5% false positives  
✅ MTTR (Mean Time To Recovery): <30 min for critical issues  
✅ Performance trending: Detects 2x response time regressions  
✅ Error pattern detection: Identifies recurring issues within 24h

---

## Next Steps

1. **Founder** → Increase GitHub Actions spending limit to $50+/month
2. **Governor** → Create monitoring workflows (once limit restored)
3. **Governor** → Set up Slack/email notifications
4. **Founder** → Verify alerts are triggering on test incidents
5. **Governor** → Build public monitoring dashboard

---

## Reference

- DNS-GOV-001: Blocking Condition Detector (for upstream outage detection)
- DNS-GOV-002: Production Monitoring (5-minute health checks)
- DNS-GOV-004: Error Rate Monitoring (real-time error detection)
- INCIDENT_RESPONSE_RUNBOOKS.md: Procedures for responding to alerts
- OPERATIONAL_READINESS.md: Manual procedures during workflow downtime
