# Production Monitoring Setup Guide

**Purpose:** Configure GitHub Actions workflows for automated production monitoring  
**Status:** Ready to configure (workflows created, awaiting GitHub Actions spending limit)  
**Effort:** 15-20 minutes setup, then automatic  
**Dependencies:** GitHub Actions spending limit ≥$50/month (Priority 0)

---

## Overview

NewsPulse AI includes three automated monitoring workflows that check production health every 5 minutes, hourly performance metrics, and 12-hourly error patterns. This guide walks through configuring the GitHub secrets these workflows need.

### Workflow Summary

| Workflow                         | Cadence                          | Purpose                                      | Status |
| -------------------------------- | -------------------------------- | -------------------------------------------- | ------ |
| `monitor-production-health.yml`  | Every 5 minutes                  | Health checks (deployment, APIs, database)   | Ready  |
| `track-performance-baseline.yml` | Every hour                       | Response time tracking, regression detection | Ready  |
| `aggregate-errors.yml`           | Every 12 hours (0:00, 12:00 UTC) | Error pattern detection, issue creation      | Ready  |

---

## Required GitHub Secrets

Add these secrets to GitHub repository settings at **Settings → Secrets and variables → Actions**.

### Critical (Required for core monitoring)

#### `VERCEL_API_TOKEN`

**Source:** [Vercel Dashboard](https://vercel.com/account/tokens)  
**Steps:**

1. Go to Vercel → Settings → Tokens
2. Click "Create Token"
3. Name: `newspulse-ai-monitoring`
4. Select "Full Access"
5. Copy token and add to GitHub Secrets

**Used by:**

- `monitor-production-health.yml` — Check deployment status
- `track-performance-baseline.yml` — Measure response time
- `aggregate-errors.yml` — Fetch error logs

#### `VERCEL_PROJECT_ID`

**Source:** [Vercel Project Settings](https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai/settings)  
**Steps:**

1. Go to your Vercel project
2. Settings → General → Project ID
3. Copy the ID and add to GitHub Secrets

**Used by:**

- `monitor-production-health.yml` — Query deployment API

---

### Optional (Recommended for alerting)

#### `SLACK_WEBHOOK_URL`

**Source:** Slack Workspace → Apps → Custom Integrations  
**Steps:**

1. Go to your Slack workspace
2. Create an Incoming Webhook (or browse existing ones)
3. Select channel where alerts should post (e.g., #alerts)
4. Copy Webhook URL
5. Add to GitHub Secrets

**Used by:**

- `monitor-production-health.yml` — Alert on deployment/API failures
- `track-performance-baseline.yml` — Alert on performance degradation
- `aggregate-errors.yml` — Alert on high error counts

**Example alert:** 🚨 Production Health Check Failed | Deployment: FAILED | API Health: 500 | Supabase: operational

#### `SENDGRID_API_KEY` (optional, Phase 2)

**Purpose:** Email digests of error patterns  
**Source:** [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)  
**When:** Configure in Phase 2 if email digests desired

---

## Setup Checklist

### Step 1: Verify Prerequisites (5 min)

- [ ] GitHub Actions spending limit increased to ≥$50/month
  - Go to GitHub Settings → Billing and plans → Actions
  - Set spending limit to $50 or higher
  - This allows workflows to run automatically

### Step 2: Get Vercel Credentials (5 min)

- [ ] Create Vercel API Token
  - Save token value (you'll only see it once)
- [ ] Copy Vercel Project ID
  - Format: `prj_xxxxx`

### Step 3: Configure GitHub Secrets (5 min)

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add secrets:

**Secret 1:**

- Name: `VERCEL_API_TOKEN`
- Value: [paste token from Vercel]

**Secret 2:**

- Name: `VERCEL_PROJECT_ID`
- Value: [paste project ID from Vercel]

**Secret 3 (optional, recommended):**

- Name: `SLACK_WEBHOOK_URL`
- Value: [paste webhook URL from Slack]

### Step 4: Verify Workflows Are Enabled (2 min)

1. Go to GitHub → Actions
2. Confirm you see:
   - Monitor Production Health
   - Track Performance Baseline
   - Aggregate Errors
3. Each should show "✓ active" (not disabled)

### Step 5: Test (3 min)

1. Go to Actions tab
2. Click "Monitor Production Health"
3. Click "Run workflow" button
4. Wait 2-3 minutes for results
5. Verify no errors in logs
6. Check Slack if webhook configured (should see alert or success)

---

## Workflow Details

### Monitor Production Health (5-minute cadence)

**File:** `.github/workflows/monitor-production-health.yml`

**Checks:**

1. Vercel deployment status (must be "READY")
2. `/api/health` endpoint (must return 200 with valid JSON)
3. `/api/alerts` endpoint (must return 200)
4. Supabase status (must be "operational")
5. Database connectivity (via health check response)

**On Failure:**

- Logs result to `monitoring-logs/health-checks.log`
- Sends Slack alert (if webhook configured)
- Creates GitHub issue if critical

**Logs:** View at `/monitoring-logs/health-checks.log` in repo

---

### Track Performance Baseline (Hourly)

**File:** `.github/workflows/track-performance-baseline.yml`

**Measurements:**

- Runs 10 requests to `/api/health` endpoint
- Calculates average response time
- Logs to `monitoring-logs/performance-baseline.csv`

**Alert Thresholds:**

- ⚠️ **Warning:** >1.0 second (2x baseline of ~500ms)
- 🔴 **Critical:** >5.0 seconds (10x baseline)

**Baseline Values:**

- Target: <500ms (0.5 seconds)
- Good: <1.0 second
- Concerning: >1.0 second

**On Failure:**

- Sends Slack alert if response time exceeds threshold
- Logs to CSV for trend analysis

---

### Aggregate Errors (Every 12 hours)

**File:** `.github/workflows/aggregate-errors.yml`

**Checks:**

1. Queries `/api/alerts` endpoint for active alerts
2. Counts by severity (critical, high, medium, low)
3. Checks database status via `/api/health`
4. Logs to `monitoring-logs/error-aggregation.log`

**Alert Severity:**

- 🔴 **Critical:** Any critical alerts present
- 🟠 **High:** High-severity alerts present
- 🟡 **Medium:** Medium-severity alerts only
- ✅ **Normal:** No alerts

**On Critical Errors:**

- Sends Slack alert immediately
- Creates GitHub issue for tracking
- Logs aggregated error data

**Run Times:** 00:00 UTC and 12:00 UTC (every 12 hours)

---

## Monitoring Logs

Workflows automatically log results to the repository:

### `monitoring-logs/health-checks.log`

Appended every 5 minutes with status and endpoint checks

```
2026-07-12T14:35:00Z | Status: success | Deployment: READY | API: 200 | DB: OK | Supabase: operational | Alerts: 0
```

### `monitoring-logs/performance-baseline.csv`

Appended hourly with timestamp, response time, status

```
2026-07-12T15:00:00Z,0.523,success
2026-07-12T16:00:00Z,0.487,success
```

### `monitoring-logs/error-aggregation.log`

Appended every 12 hours with error counts by severity

```
2026-07-12T00:00:00Z | Status: healthy | Critical: 0 | High: 0 | Total Alerts: 0 | Overall: success
```

**Note:** Logs are committed to git history; they grow over time. Consider archiving logs weekly (optional Phase 2 task).

---

## Troubleshooting

### Workflows Not Running

**Problem:** Workflows appear disabled or never execute  
**Solution:**

1. Check GitHub Actions spending limit
   - Settings → Billing → Actions
   - Verify limit is set to ≥$50/month
2. Verify workflows are enabled
   - Go to Actions → select workflow
   - Should see "Enable" button if disabled
3. Check for syntax errors
   - Go to Actions → workflow → view logs
   - Fix any YAML syntax issues

### "Invalid API Token" Error

**Problem:** Workflow logs show authentication failure  
**Solution:**

1. Verify Vercel token is correct
   - Go to Vercel → Settings → Tokens
   - Create new token if unsure
   - Update GitHub secret `VERCEL_API_TOKEN`
2. Verify secret name matches workflow
   - Workflow expects: `VERCEL_API_TOKEN`
   - GitHub secret must match exactly

### Missing Project ID

**Problem:** Workflow can't find project  
**Solution:**

1. Get correct project ID
   - Go to Vercel project
   - Settings → General → Project ID
   - Format: `prj_xxxxx`
2. Update GitHub secret `VERCEL_PROJECT_ID`

### Slack Alerts Not Arriving

**Problem:** Workflow runs but no Slack message  
**Solution:**

1. Verify webhook URL is correct
   - Go to Slack workspace → Apps → Custom Integrations → Incoming Webhooks
   - Confirm URL exists and channel is selected
2. Verify secret is set in GitHub
   - Settings → Secrets → check `SLACK_WEBHOOK_URL` exists
3. Test webhook manually
   - Run "Monitor Production Health" workflow manually
   - Wait 2-3 minutes for execution
   - Check Slack channel

### "Rate limit exceeded" from Vercel API

**Problem:** Workflow fails with rate limit error  
**Solution:**

- This is rare; Vercel allows 100+ requests/minute
- If occurs, spaces out workflow runs (change cron to every 10 min)
- Contact Vercel support if persistent

---

## Next Steps

### Immediate (Today)

1. Complete prerequisite: GitHub Actions spending limit ✓ (Priority 0)
2. Add GitHub secrets (15 min)
3. Enable workflows in Actions tab
4. Test "Monitor Production Health" manually

### After Spending Limit Restored

1. Workflows will start running automatically
2. Health checks every 5 minutes
3. Performance tracking every hour
4. Error aggregation every 12 hours
5. Slack alerts on issues (if configured)

### Phase 2 (Optional Enhancements)

1. Create public status page showing health checks
2. Build dashboard for performance trending
3. Add email digests for error patterns
4. Implement automated recovery for known issues
5. Cost anomaly detection

---

## Reference

**Related Documentation:**

- `MONITORING_AUTOMATION_PLAN.md` — Detailed workflow specifications
- `FOUNDER_MONITORING_DASHBOARD.md` — Manual health checks
- `INCIDENT_RESPONSE_RUNBOOKS.md` — How to respond to alerts
- `.github/workflows/` — Actual workflow YAML files

**Vercel API Docs:** https://vercel.com/docs/api  
**GitHub Secrets Docs:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
