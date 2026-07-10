# Daily Checkpoint Log — 2026-07-10 to 2026-07-17

**Purpose:** Track adoption metrics during Pause-and-Measure window to inform Phase 3 prioritization

**Status:** 🟡 Awaiting Supabase schema deployment (blocked externally)

---

## Collection Schedule

- **Daily collection:** 09:00 UTC each day via `npm run checkpoint:collect`
- **Manual review:** Slack mentions, GitHub issues, customer feedback (daily)
- **Weekly analysis:** Fridays at 17:00 UTC (aggregation + trends)
- **Reporting deadline:** 2026-07-17, 17:00 UTC (audit results delivered)

---

## Setup Instructions

### Prerequisites

1. ✅ **Supabase schema deployed** — `supabase/schema.sql` executed against live database
2. ✅ **Environment variables configured** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ✅ **Database tables created** — `obligations`, `assessments`, `audit_logs`

### Automated Collection

Once prerequisites are met:

```bash
# Manual collection (run daily)
npm run checkpoint:collect

# Or: Add to GitHub Actions for automated daily 09:00 UTC collection
# (See DNA-GOV-001-DEPLOYMENT-GUIDE.md for scheduled workflow pattern)
```

### Output

Each run appends a daily report to this file showing:
- **Adoption Metrics** — Obligations created, assessments completed, templates imported
- **Engagement Metrics** — Status updates, CSV exports, searches performed
- **Health Metrics** — Error rates, performance, deployments
- **Qualitative Signals** — Slack mentions, GitHub issues, customer feedback (manual)
- **Trend** — Direction of key metrics (↗ increasing | → stable | ↘ declining)

---

## Collection Progress

| Date | Status | Adoption | Engagement | Health | Qualitative |
|------|--------|----------|------------|--------|------------|
| 2026-07-10 | ⏳ Pending | — | — | — | — |
| 2026-07-11 | ⏳ Pending | — | — | — | — |
| 2026-07-12 | ⏳ Pending | — | — | — | — |
| 2026-07-13 | ⏳ Pending | — | — | — | — |
| 2026-07-14 | ⏳ Pending | — | — | — | — |
| 2026-07-15 | ⏳ Pending | — | — | — | — |
| 2026-07-16 | ⏳ Pending | — | — | — | — |
| 2026-07-17 | ⏳ Pending | — | — | — | — |

---

## Manual Qualitative Review Tasks

### Daily (10-15 min)

1. **Slack Channel Scan** — Search `#general`, `#support`, `#feedback` for:
   - Keywords: "obligation", "compliance", "evidence", "audit", "report", "template", "custom"
   - Record: Who mentioned what, context, sentiment (positive/negative/neutral)
   - Example: "Team X mentioned they need to export trends"

2. **GitHub Issues Review** — Check new/updated issues for:
   - Feature requests related to Phase 2
   - Bug reports on existing features
   - Customer-filed issues (vs. internal)

### Weekly (Friday, 30 min)

1. **Direct customer feedback** — Reach out to 2-3 most active teams:
   - "How's Phase 2 working for you?"
   - "What feature would you use next?"
   - "Are obligations a good fit for your industry?"

2. **Aggregate themes** — Identify recurring feedback patterns:
   - What problem are teams trying to solve?
   - What's missing?
   - What's working well?

---

## Metrics Reference

### Tier 1: Adoption (Quantity)

**Obligations:**
- Total obligations created (today)
- Active workspaces using obligations
- Obligations from templates vs. manual
- Obligations with due dates

**Assessments:**
- Total assessments started
- Assessments completed (100%)
- Average completion rate (%)

### Tier 2: Engagement (Quality)

**Obligation Actions:**
- Status updates (marked in_progress, completed, etc.)
- Bulk status updates
- Due date changes
- CSV exports (teams sharing data)
- Search queries

**Assessment Engagement:**
- Abandonments (started but never completed)
- Average time per assessment

### Tier 3: Feature-Specific Metrics

**Progress Tracker:**
- Sessions that viewed progress bar
- Sessions with progress > 50%

**Dashboard Navigation:**
- Clicks between dashboard → obligations
- Navigation patterns

### Tier 4: Health (Stability)

**Error Rate:**
- API errors (4xx, 5xx by endpoint)
- Feature-specific error rates

**Performance:**
- p50, p95, p99 latency
- Page load times

### Tier 5: Qualitative (Context)

**Customer Feedback:**
- Slack mentions (keyword + sentiment)
- GitHub issues (open + closed)
- Direct interviews (feedback themes)

**Usage Patterns:**
- Which teams using Phase 2?
- Which features used most?
- Abandonment patterns?
- Power user discoveries?

---

## Trend Analysis Examples

### Rising Adoption (↗)

```
Total obligations: 245 → 312 (+27%)
Active workspaces: 12 → 15 (+25%)
Assessments completed: 8 → 14 (+75%)
→ Phase 2 features gaining traction; teams discovering value
```

### Stable Engagement (→)

```
Status updates: 42 → 44 (+5%)
CSV exports: 6 → 7 (+17%)
Search queries: 120 → 119 (-1%)
→ Steady usage patterns; no new behaviors emerging
```

### Declining Interest (↘)

```
New obligations: 85 → 62 (-27%)
Assessments started: 9 → 4 (-56%)
Active workspaces: 15 → 13 (-13%)
→ Adoption plateau or reversion; investigate blockers
```

---

## Phase 3 Decision Criteria

This data will inform Phase 3 prioritization on 2026-07-17:

**Evidence-Obligation Linking wins if:**
- Obligations per workspace > 15 (median)
- Status update rate > 5 per workspace per day
- Teams mention "proof" or "evidence" in feedback

**Audit Logging wins if:**
- Status/bulk update rate > 10 per workspace per day
- Teams mention "who changed it" or "history"
- Compliance audit mentions in feedback

**Advanced Analytics wins if:**
- CSV export rate > 50% of active teams export at least once
- Teams mention "trends", "velocity", "reports", "executive"
- Dashboard dwell time is high

**Template Iteration wins if:**
- Assessment abandonment > 20%
- Assessment completion < 40%
- Teams mention "templates don't fit our industry"

---

## Notes

- **Data privacy:** All metrics are workspace-aggregated; no PII included
- **Bias prevention:** Decision algorithm applied mechanically; no assumptions
- **Transparency:** All data and reasoning published; Founder can audit decision
- **Feedback loop:** Post-launch metrics (Phase 3) will validate our predictions

---

**Status:** Ready to begin collection once Supabase schema is deployed  
**Owner:** Governor (autonomous collection)  
**Last Updated:** 2026-07-10
