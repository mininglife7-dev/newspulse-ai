# DNA-GOV-004: Cost Anomaly Detection

**Status:** Design Phase  
**Purpose:** Detect unexpected spending anomalies across Vercel and Supabase to prevent bill shock and catch compromised resources  
**Survival Metrics Improved:** Financial stability, operational awareness, security incident detection  
**Implementation Trigger:** After Vercel secret blocker resolved (DNA-GOV-001 deployment prerequisite)

---

## Problem Statement

**Current Reality:**
- Monthly Vercel and Supabase bills arrive with no visibility into spend trends
- A compromised AI API key (calling expensive LLM endpoints) could run up $1000s before detection
- Database query performance degradation (N+1 queries) shows up in retrospective invoice review, not in real-time
- No mechanism to correlate cost spikes with code changes, feature launches, or external events

**Evidence:**
- Manual invoice review is the only cost-monitoring mechanism (passive, post-fact)
- Deployment events (schema changes, new features) are not correlated with spending changes
- Customer support tickets about "unexpected bill spike" lack root cause tracking

**Impact:**
- Financial surprises damage Founder trust in cost predictability
- Security incidents (compromised keys, resource exhaustion) go undetected for weeks
- Feature performance regressions (inefficient queries) aren't connected to their cost
- No data for "cost per feature" analysis or pricing decisions

---

## Design: Cost Anomaly Detection

### Architecture

**Data Collection Layer** (runs daily, 3 AM UTC)

1. **Vercel Cost Snapshot**
   - Query Vercel API: `/v6/project/{projectId}` → fetch current month spending (USD)
   - Extract: current_spend, projected_month_end, usage_breakdown by category
   - Store in Supabase table: `cost_snapshots` (vercel)
   - Retention: 2 years (cost history for 24-month trend analysis)

2. **Supabase Cost Estimate** (proxy, since no direct cost API)
   - Query `pg_stat_statements`: aggregate query execution time, database size
   - Count: connection count, API call count (from `http_request_log` if available)
   - Estimate: rough cost based on Supabase pricing tiers
   - Store in Supabase table: `cost_snapshots` (supabase)

3. **Deployment Events** (from GitHub)
   - Fetch recent commits/PRs merged to `main`
   - Correlate timestamps with cost snapshots
   - Store in Supabase table: `deployment_events` (commit SHA, merged_at, author)

### Anomaly Detection Logic

**Threshold-based Detection** (simple, effective)

```typescript
interface CostSnapshot {
  date: string;
  provider: 'vercel' | 'supabase';
  daily_spend_usd: number;
  cumulative_spend_usd: number;
}

function detectAnomalies(snapshots: CostSnapshot[]): Alert[] {
  const alerts: Alert[] = [];
  const last30Days = snapshots.slice(-30);
  
  // Daily spend baseline: median of last 30 days
  const dailySpends = last30Days.map(s => s.daily_spend_usd).sort((a, b) => a - b);
  const medianDaily = dailySpends[Math.floor(dailySpends.length / 2)];
  const stdDev = calculateStdDev(dailySpends);
  
  // Alert if today's spend > baseline + (2.5 * std dev)
  const today = snapshots[snapshots.length - 1];
  const threshold = medianDaily + (2.5 * stdDev);
  
  if (today.daily_spend_usd > threshold) {
    alerts.push({
      severity: 'high',
      type: 'cost_spike',
      provider: today.provider,
      message: `Daily spend $${today.daily_spend_usd.toFixed(2)} exceeds baseline $${threshold.toFixed(2)}`,
      deployments_today: findDeploymentsOn(today.date),
      recommended_action: 'Review recent commits for expensive API calls or DB queries',
    });
  }
  
  // Alert if projected month-end > 150% of last month
  const projectedMonthEnd = today.cumulative_spend_usd * (30 / dayOfMonth);
  if (projectedMonthEnd > lastMonthTotal * 1.5) {
    alerts.push({
      severity: 'warning',
      type: 'projected_overage',
      message: `Projected month-end spend $${projectedMonthEnd.toFixed(2)} is 50% over last month`,
      current_spend: today.cumulative_spend_usd,
      days_into_month: dayOfMonth,
    });
  }
  
  return alerts;
}
```

**Alert Delivery**

- Email digest: Daily at 8 AM UTC (Founder receives cost briefing alongside DNA-GOV-003 security briefing)
- Slack webhook (future): Real-time alerts for high-severity spikes
- Dashboard: `/governance` page shows cost trend graph + recent anomalies

### Data Schema

```sql
-- Cost snapshots (immutable history)
CREATE TABLE cost_snapshots (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL, -- 'vercel' | 'supabase'
  date DATE NOT NULL,
  daily_spend_usd DECIMAL(10, 2),
  cumulative_spend_usd DECIMAL(10, 2),
  metadata JSONB, -- category breakdown, currency, raw API response
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, provider, date)
);

-- Deployment events (correlate code changes with costs)
CREATE TABLE deployment_events (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  commit_sha TEXT NOT NULL,
  merged_at TIMESTAMP NOT NULL,
  author_email TEXT,
  message TEXT,
  files_changed INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cost alerts (anomalies detected)
CREATE TABLE cost_alerts (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  alert_type TEXT NOT NULL, -- 'cost_spike' | 'projected_overage' | 'anomaly'
  severity TEXT NOT NULL, -- 'info' | 'warning' | 'high'
  provider TEXT,
  message TEXT NOT NULL,
  metadata JSONB, -- threshold, actual, baseline, related_deployments
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Cron Job

**Endpoint:** `GET /api/cost-monitoring`  
**Schedule:** Daily at 3 AM UTC (after deployment events settle)  
**Timeout:** 120 seconds  
**Dependencies:**
- Vercel API key (environment variable: `VERCEL_TOKEN`)
- GitHub token (already stored as `github-token` secret, DNA-GOV-001 prerequisite)
- Supabase admin client (already available)

**Flow:**
1. Fetch Vercel project spending (public endpoint, no auth needed if project is public)
2. Query Supabase for database metrics
3. Fetch recent merged commits from GitHub
4. Compare spending vs. 30-day baseline
5. Create cost snapshot in database
6. Detect anomalies, create alerts
7. Send Founder email digest if any alerts exist

### Example Alert Output

```
Subject: [COST] Daily Anomaly Detected — Vercel Spend $42.50 (baseline $8.75)

Provider: Vercel
Date: 2026-07-15
Severity: HIGH

Spend Spike:
  Actual: $42.50
  Baseline (30-day median): $8.75
  Exceeds by: 386%

Recent Deployments:
  - 3:41 PM: feat(search): Parallel LLM summarization (5 commits)
    Authors: governor
  - 2:15 PM: fix(api): Remove N+1 query in risk-assessments (1 commit)
    Authors: governor

Recommended Actions:
  1. Review LLM API usage in summarization feature
  2. Check Vercel Function runtime logs for errors/retries
  3. Monitor for 24 hours; expected to normalize after 2 AM UTC

Dashboard: https://vercel.com/dashboard/newspulse-ai
```

---

## Implementation Roadmap

### Phase 1: Core (Weeks 1-2)
- [ ] Create database schema (cost_snapshots, deployment_events, cost_alerts)
- [ ] Implement Vercel API client (`lib/vercel-cost.ts`)
- [ ] Implement anomaly detection logic
- [ ] Create cron endpoint with error handling

### Phase 2: Integration (Week 3)
- [ ] Wire to Vercel environment (create cron trigger in vercel.json)
- [ ] Test with real Vercel API
- [ ] Email digest template and delivery
- [ ] Add to governance dashboard

### Phase 3: Refinement (Week 4)
- [ ] Slack webhook integration
- [ ] Cost trend analysis page (30/60/90-day graphs)
- [ ] Deployment correlation: show cost impact per feature
- [ ] Customer-facing cost report export (PDF)

---

## Success Metrics

**Effectiveness:**
- Detects cost spikes >50% above baseline within 24 hours
- False positive rate < 5% (avoids alert fatigue)
- Founder receives actionable recommendations in every alert

**Reliability:**
- Cron job completes 99%+ of runs
- Data freshness: cost snapshots within 6 hours of market close
- No data loss (immutable snapshots ensure history never changes)

**Business Impact:**
- Founder can explain cost variance in monthly reviews (data-driven)
- Time to detect security incidents (compromised API key) reduces from weeks to <1 day
- Foundation for "cost per feature" analysis and pricing decisions

---

## Risks & Mitigations

**Risk:** Vercel API returns incomplete data (project visibility settings)  
**Mitigation:** Graceful fallback to prior day's snapshot; alert Founder if data unavailable for 3+ days

**Risk:** Threshold tuning catches too many/too few anomalies  
**Mitigation:** Start with conservative 2.5-sigma threshold; adjust after 30 days of baseline data

**Risk:** Supabase cost estimation is inaccurate (not official API)  
**Mitigation:** Use only as secondary signal; primary alert comes from Vercel (actual charge)

**Risk:** Database size grows unbounded (2 years of daily snapshots)  
**Mitigation:** Archive snapshots >1 year to separate table; keep 30-day window hot

---

## Future Extensions

1. **Cost Forecasting:** ML model predicting month-end spend based on feature launches, traffic spikes
2. **Multi-workspace Aggregation:** Parent org view showing cost distribution across customer workspaces
3. **Budget Alerts:** Warn when spending approaches a configurable monthly budget
4. **Chargeback Attribution:** Allocate costs to specific features/customers for accurate unit economics
5. **RI Optimization:** Recommend Vercel/Supabase reserved instances if usage patterns justify

---

## Dependency Chain

```
DNA-GOV-004 depends on:
  └─ Vercel secret "github-token" (from DNA-GOV-001)
     └─ Founder creates secret in Vercel settings

Can proceed in parallel:
  ✓ Design document (this)
  ✓ Database schema + RLS policies
  ✓ Unit tests for anomaly detection logic
  
Blocked until:
  ✗ Vercel deployment of DNA-GOV-001 (to activate cron)
```

---

**Decision Register Entry:** DNA-GOV-004 approved for design; implementation gate = Vercel secret creation (blocking all DNA deployment)
