# DNA-GOV-011: Cost Anomaly Detection

**Status:** Implemented  
**Priority:** Medium  
**Phase:** 2 (Evolution)  
**Implemented:** 2026-07-11  

---

## Objective

Detect unusual spending patterns across Vercel and Supabase before they become budget-breaking surprises. Autonomous detection + Founder alerts via DNA-005 (unified alert hub).

---

## Problem Statement

Production deployments can incur unexpected costs due to:
- Database query inefficiencies (N+1 queries, missing indexes)
- Function invocation spikes (edge functions, API calls)
- Data transfer overages (CDN, external APIs)
- Accidental production data loads

**Without monitoring:** Founder discovers cost spike weeks later on monthly invoice.  
**With DNA-GOV-011:** Alerts within 24 hours of anomaly, before it becomes a $5K+ problem.

---

## Architecture

### Cost Baselines

Established normal spend ranges for Hobby/Starter tiers:

| Provider | Baseline | High Threshold | Critical Threshold |
|----------|----------|-------|---------|
| **Vercel** | $15/mo (pro-rata daily: $0.50) | $45/mo (3x) | $45/mo (3x+) |
| **Supabase** | $30/mo (pro-rata daily: $1.00) | $60/mo (2x) | $120/mo (4x+) |

These are conservative (typical hobby costs). As usage grows, the rolling 30-day average becomes the effective baseline.

### Detection Logic

1. **Fetch current costs** via provider APIs:
   - Vercel: `GET https://api.vercel.com/v3/billing/overview` (requires `VERCEL_TOKEN`)
   - Supabase: `GET https://api.supabase.com/v1/projects/{id}/billing/overview` (requires `SUPABASE_API_TOKEN`)

2. **Load 90-day history** from `.cost-history/` (filesystem persistence)

3. **Calculate baseline** as 30-day rolling average (or fallback to static baseline)

4. **Compare current vs baseline**:
   - Ratio ≥ 4x → **CRITICAL** alert
   - Ratio ≥ 1.5x → **HIGH** alert
   - Ratio < 1.5x → No alert

5. **Record anomaly** to alert hub (DNA-005) if any found

6. **Update history** with today's cost (idempotent daily append)

---

## API Endpoint

### `GET /api/cost-anomaly`

**Purpose:** On-demand cost anomaly detection with history update.

**Response (200 OK):**
```json
{
  "ok": true,
  "alertLevel": "ok" | "warning" | "critical",
  "timestamp": "2026-07-11T09:00:00Z",
  "summary": "No cost anomalies detected",
  "vercel": {
    "dailyCost": 0.5,
    "monthlyProjection": 15.0,
    "anomalyDetected": false
  },
  "supabase": {
    "dailyCost": 1.0,
    "monthlyProjection": 30.0,
    "anomalyDetected": false
  },
  "anomalies": []
}
```

**Response (503 Service Unavailable if critical anomaly):**
```json
{
  "ok": false,
  "alertLevel": "critical",
  "timestamp": "2026-07-11T09:00:00Z",
  "summary": "1 cost anomaly(ies) detected",
  "anomalies": [
    {
      "provider": "vercel",
      "metric": "monthly_cost",
      "currentCost": 150.0,
      "baselineCost": 15.0,
      "ratio": 10.0,
      "severity": "critical",
      "message": "Vercel costs are 1000% of baseline ($150.00/mo vs $15.00/mo baseline)"
    }
  ]
}
```

---

## GitHub Actions Workflow

**Workflow:** `.github/workflows/dna-cost-anomaly.yml`  
**Schedule:** Daily at 09:00 UTC  
**Manual trigger:** `workflow_dispatch`

Runs `/api/cost-anomaly` and logs results:
- ✅ No anomalies → Exit 0
- ⚠️ High anomaly → Exit 0, log warning
- 🔴 Critical anomaly → Exit 1 (failure notification)

---

## Integration with DNA-005

Anomalies detected by DNA-GOV-011 are automatically:
1. Converted to alert format via `anomaliesToAlerts()`
2. Recorded to the alert hub via `recordAlert()`
3. Included in `GET /api/alerts` unified endpoint
4. Visible in Founder's monitoring dashboard

---

## Required Environment Variables

For Vercel cost checks:
```bash
VERCEL_TOKEN=<bearer-token-from-vercel-settings>
```

For Supabase cost checks:
```bash
SUPABASE_API_TOKEN=<api-key-from-supabase>
SUPABASE_PROJECT_ID=<project-ref-id>
```

Both are optional. If missing, that provider's check is skipped (graceful degradation).

---

## Cost History Storage

History stored in `.cost-history/` (version controlled in `.gitignore`):

**Files:**
- `.cost-history/vercel-history.json` — Daily Vercel spend (90-day window)
- `.cost-history/supabase-history.json` — Daily Supabase spend (90-day window)

**Format:**
```json
[
  {
    "provider": "vercel",
    "date": "2026-07-01",
    "amount": 15.0
  },
  {
    "provider": "vercel",
    "date": "2026-07-02",
    "amount": 14.8
  }
]
```

---

## Test Coverage

**File:** `__tests__/cost-anomaly-detector.test.ts`  
**Tests:** 17/17 passing

Coverage:
- ✅ Report structure validation
- ✅ API error handling (Vercel 401, Supabase unavailable)
- ✅ Baseline threshold detection (critical, high, normal)
- ✅ Alert conversion and formatting
- ✅ Multiple concurrent anomalies
- ✅ ISO timestamp validation
- ✅ Null handling (missing API credentials)

---

## Future Enhancements

1. **Cost forecasting:** ML-based spend prediction (detect trend spike before hard threshold)
2. **Per-service breakdown:** Detect which table/function is expensive
3. **Slack integration:** Direct alerts to Founder's phone
4. **Budget policy:** Allow Founder to set custom thresholds per provider
5. **Cost attribution:** Link spikes to specific deployments or code changes

---

## Verification Checklist

- [x] Endpoint returns proper structure (200 / 503)
- [x] Anomaly detection logic correct (ratio calculations, thresholds)
- [x] Alert integration with DNA-005 working
- [x] GitHub Actions workflow scheduled and manual-triggerable
- [x] Test coverage 17/17 passing
- [x] Graceful degradation when APIs unavailable
- [x] Cost history persists and rolls over correctly
- [x] No sensitive data (tokens) logged in output

---

## Monitoring

**Check cost status:** `curl https://newspulse-ai.vercel.app/api/cost-anomaly`

**View all alerts:** `curl https://newspulse-ai.vercel.app/api/alerts`

**GitHub Actions:** `.github/workflows/dna-cost-anomaly.yml` (runs daily 09:00 UTC)

---

**DNA Registry:** Phase 2 / 8/100 DNA target  
**Previous DNA:** DNA-GOV-010 (Git Governance)  
**Next DNA:** DNS-GOV-012 (Schema Migration Validator)
