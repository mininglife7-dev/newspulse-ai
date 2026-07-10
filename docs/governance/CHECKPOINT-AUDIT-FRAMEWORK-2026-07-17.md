# Checkpoint Audit Framework — 2026-07-17

**Purpose:** Systematically measure Phase 2 adoption and engagement (2026-07-10 to 2026-07-17) to make data-driven Phase 3 prioritization decision.

**Current Status:** Pause-and-Measure window open; Governor collecting metrics

---

## The Question We're Answering

**"Which Phase 3 candidate will create the most customer value and highest adoption velocity?"**

Based on real usage data from 2026-07-10 to 2026-07-17, we will rank:
1. Evidence-Obligation Linking
2. Audit Logging
3. Advanced Analytics
4. Template Library Iteration

---

## Metrics to Collect (Daily, 2026-07-10 to 2026-07-17)

### Tier 1: Adoption (Quantity — "Are teams using Phase 2?")

**Obligations Usage:**
- Total obligations created across all workspaces
- Obligations per workspace (distribution: median, min, max)
- Obligations imported via template (using auto-import feature)
- Obligations with due dates set
- Obligations manually created (custom obligations)

**Why this matters:** If teams aren't creating obligations, Phase 3 work on obligation-related features (Evidence-Obligation Linking, Audit Logging) has lower ROI.

**How to measure:**
```sql
SELECT
  COUNT(*) as total_obligations,
  COUNT(DISTINCT workspace_id) as active_workspaces,
  AVG(obligations_per_workspace) as avg_per_workspace,
  COUNT(*) FILTER (WHERE source = 'template_import') as template_imports,
  COUNT(*) FILTER (WHERE source = 'manual') as manual_creations,
  COUNT(*) FILTER (WHERE due_date IS NOT NULL) as with_due_dates
FROM obligations
WHERE created_at >= '2026-07-10' AND created_at < '2026-07-17';
```

**Assessments Usage:**
- Total assessments created
- Assessments started (> 0% complete)
- Assessments completed (100%)
- Questions answered (raw count)
- Average completion rate

**Why this matters:** If assessments aren't used, Template Iteration (industry-specific templates) has lower priority. If completion is low, Template Iteration may help (more relevant templates = higher completion).

**How to measure:**
```sql
SELECT
  COUNT(*) as total_assessments,
  COUNT(*) FILTER (WHERE progress > 0) as started,
  COUNT(*) FILTER (WHERE progress = 100) as completed,
  AVG(progress) as avg_completion_rate,
  COUNT(*) FILTER (WHERE progress > 0 AND progress < 100) as in_progress
FROM assessments
WHERE created_at >= '2026-07-10' AND created_at < '2026-07-17';
```

---

### Tier 2: Engagement (Quality — "How actively are teams using features?")

**Obligation Management Actions:**
- Status updates (marked in_progress, completed, etc.)
- Bulk status updates (multi-select actions)
- Due date changes
- CSV exports
- Search queries run

**Why this matters:** 
- High status update rate → Teams actively managing obligations → Evidence-Obligation Linking valuable (need to link evidence to prove completion)
- High bulk update rate → Teams want batch operations → Advanced Analytics + audit logging valuable
- High CSV export rate → Teams sharing with execs → Advanced Analytics valuable (trends for reports)
- High search rate → Large obligation sets → Template Iteration valuable (better organization)

**How to measure:**
```sql
SELECT
  COUNT(*) FILTER (WHERE action = 'status_update') as status_updates,
  COUNT(*) FILTER (WHERE action = 'bulk_status_update') as bulk_updates,
  COUNT(*) FILTER (WHERE action = 'due_date_change') as due_date_changes,
  COUNT(*) FILTER (WHERE action = 'csv_export') as csv_exports,
  COUNT(*) FILTER (WHERE action = 'search') as searches
FROM audit_logs
WHERE entity_type = 'obligation'
  AND action_date >= '2026-07-10' AND action_date < '2026-07-17';
```

**Assessment Engagement:**
- Average time spent per assessment (if available)
- Abandonments (started but never completed)
- Questions per session (engagement depth)

**Why this matters:** Low completion rate + high abandonment → Teams struggling with assessment length → Template Iteration (better, shorter templates) or Evidence-Obligation Linking (show how evidence maps to questions).

---

### Tier 3: Feature-Specific Metrics (Signals — "What's working, what's missing?")

**Progress Tracker Usage:**
- Sessions that viewed assessment progress bar
- Sessions that tracked progress > 50%

**Why this matters:** High usage = feature is valuable. Low usage = maybe shouldn't prioritize "polish" features.

**How to measure:**
- Telemetry: Track page views to `/assessment/[systemId]?show_progress=true`
- Or: Count assessments with progress > 50%

**Dashboard Navigation:**
- Clicks on "View Obligations" button
- Clicks between dashboard → compliance → obligations

**Why this matters:** Cross-navigation patterns show how features connect. If teams never nav to obligations from dashboard, maybe templates aren't the issue (they're using obligations already).

**How to measure:**
- Analytics: Track button clicks, page transitions
- Or: Count session paths through dashboard → obligations

---

### Tier 4: Error & Performance Signals (Health — "Is the system stable?")

**Error Rate:**
- API errors related to obligations (4xx, 5xx by endpoint)
- Error rates by feature (obligations, assessments, evidence, etc.)

**Why this matters:** If Evidence-Obligation Linking (file uploads) has high error rate, it's lower priority (higher risk). If existing features have high errors, fix those first.

**How to measure:**
```sql
SELECT
  feature,
  COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
  COUNT(*) as total_requests,
  100.0 * COUNT(*) FILTER (WHERE status_code >= 400) / COUNT(*) as error_rate
FROM api_logs
WHERE timestamp >= '2026-07-10' AND timestamp < '2026-07-17'
GROUP BY feature;
```

**Performance:**
- API response times (p50, p95, p99)
- Page load times (dashboard, obligations, assessment)

**Why this matters:** If obligations page is slow with large datasets, Advanced Analytics (trending) might make it worse (more data). Template Iteration might help (smaller, focused sets).

**How to measure:**
- Server logs: Track response times
- Client telemetry: Track page load times

---

### Tier 5: Qualitative Signals (Context — "What are teams saying?")

**Support/Feedback Channels:**
- Slack messages mentioning "obligations" or "compliance"
- GitHub issues/discussions raised by teams
- Direct feedback from early customers

**Why this matters:** Quantitative metrics miss nuance. If 10 teams mention "we need to export trends," that's Advanced Analytics demand. If 10 teams say "templates are generic," that's Template Iteration demand.

**How to measure:**
- Manually scan Slack #general and #support for keywords: "obligation," "compliance," "evidence," "audit," "report," "template," "custom"
- Review GitHub issues created by teams
- Ask 3-5 active teams directly: "What feature would you use next?"

**Example questions for direct feedback:**
- "Are your obligations a good fit for your industry/company?"
- "Do you know who changed what and when?" (audit logging signal)
- "How do you prove to regulators that you're compliant?" (evidence linking signal)
- "Would you like to see trends over time?" (analytics signal)

---

## Decision Algorithm (2026-07-17)

Once all metrics are collected, apply this decision framework:

### Step 1: Identify Clear Winner

**Evidence-Obligation Linking wins if:**
- Obligations per workspace > 15 (median)
- Status update rate > 5 per active workspace per day
- Teams mention "proof" or "evidence" in feedback

**Audit Logging wins if:**
- Status update or bulk update rate is high (> 10 per workspace per day)
- Teams mention "who changed it" or "history" in feedback
- Compliance audits mentioned in feedback

**Advanced Analytics wins if:**
- CSV export rate is high (> 50% of active teams export at least once)
- Teams mention "trends," "velocity," "reports," "executive" in feedback
- Dashboard dwell time is long (teams staring at metrics)

**Template Iteration wins if:**
- Assessment abandonment rate is high (> 20%)
- Assessment completion rate is low (< 40%)
- Teams mention "templates don't fit our industry" in feedback

### Step 2: Tie-Breaking Criteria (If Multiple Candidates Score Equally)

**Prioritize in this order:**
1. **Regulatory risk:** Audit Logging > Evidence-Obligation Linking > others (compliance is non-negotiable)
2. **Customer retention:** Whichever feature prevents churn (ask: "If we didn't build X next, would you leave?")
3. **Effort-to-impact:** Pick feature with highest ROI (effort days / adoption boost)
4. **Network effect:** Template Iteration creates community if public templates; Advanced Analytics enables benchmarking

### Step 3: Document Recommendation

Write 1-paragraph recommendation summarizing:
- Winner name
- Key evidence (top 2-3 metrics that drove decision)
- Why (customer impact, regulatory, adoption rate, etc.)
- Confidence (high/medium/low based on metric variance)
- Alternative (if close call, mention runner-up)

---

## Collection Responsibilities

**Governor (Autonomous):**
- Database queries (adoption, engagement, error rate, performance)
- GitHub/Slack keyword scans
- Aggregation and trend analysis

**Founder (If Needed):**
- Direct customer interviews (optional, if quantitative data inconclusive)
- Business context (regulatory timeline, customer contracts)
- Risk assessment (which feature has highest regulatory value)

---

## Daily Monitoring (2026-07-10 to 2026-07-17)

Each day at 09:00 UTC, Governor will collect:

```markdown
## Daily Checkpoint — [DATE]

**Adoption Metrics:**
- Total obligations: X (yesterday: Y, +Z)
- Active workspaces: X (new: Y)
- Template imports: X
- Assessments completed: X%

**Engagement Metrics:**
- Status updates: X (yesterday: Y)
- CSV exports: X
- Obligation searches: X

**Error Rate:**
- API errors: X% (target: < 1%)
- p99 latency: Xms (target: < 5s)

**Qualitative Signals:**
- Slack mentions: [list]
- GitHub issues: [list]
- Customer feedback: [summary]

**Trend:** [↗ increasing | → stable | ↘ declining]
```

Published to: `docs/governance/CHECKPOINT-DAILY-LOG.md` (append-only)

---

## Final Audit Report (2026-07-17)

At 17:00 UTC on 2026-07-17, Governor will deliver:

**CHECKPOINT-AUDIT-RESULTS-2026-07-17.md**

Containing:
1. **Summary** — 1 paragraph winner + recommendation
2. **Adoption Data** — 7-day trend graphs
3. **Engagement Breakdown** — Feature-by-feature analysis
4. **Error & Performance** — Health baseline
5. **Qualitative Themes** — What teams said
6. **Confidence Assessment** — High/medium/low (based on data coverage)
7. **Next Phase Start Date** — When development can begin

---

## Success Criteria for Audit

✅ **Audit succeeds if:**
- All quantitative metrics collected and analyzed
- Clear winner identified (or tie-break criteria applied)
- Recommendation has > 80% confidence
- Founder can decide without re-analysis

❌ **Audit fails if:**
- Inconclusive data (multiple candidates score equally)
- Missing key metrics (e.g., no engagement data)
- Low confidence (< 60%) — recommend extending measurement window

---

## Contingency: Extending Measurement Window

If the audit is inconclusive:

**Option 1: Extend 1 more week (2026-07-17 to 2026-07-24)**
- Collect more data to distinguish candidates
- Best if adoption is ramping up (need more time to stabilize)

**Option 2: Founder decides now, collect feedback during Phase 3**
- Don't wait; choose based on best available data
- Collect feedback post-launch to guide Phase 4

**Option 3: Parallel exploratory work**
- Quick proof-of-concept on 2-3 top candidates
- Decide based on prototype reception
- Slower to production but higher confidence

---

## Notes

- **No bias toward any candidate** — Data should speak, not assumptions
- **Transparency** — All metrics and reasoning published; Founder can audit the decision
- **Continuous improvement** — After Phase 3 ships, measure those metrics too (adoption, engagement, ROI)
- **Feedback loop** — Each launched feature improves our ability to predict next feature's success

---

**Status:** Framework ready. Measurements begin 2026-07-10. Report due 2026-07-17, 17:00 UTC.
