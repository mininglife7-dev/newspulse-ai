# Checkpoint Monitoring Setup Guide

**Purpose:** Establish daily collection infrastructure for Pause-and-Measure window (2026-07-10 to 2026-07-17)

**Timeline:** Deploy once Supabase schema is available (external blocker #2 fixed)

**Estimated setup time:** 15-30 minutes (depending on automation preference)

---

## Overview

The checkpoint audit framework measures Phase 2 adoption and engagement across 5 tiers:

1. **Tier 1: Adoption** — Obligations, assessments, templates (database queries)
2. **Tier 2: Engagement** — Actions, exports, searches (database queries)
3. **Tier 3: Feature-specific** — Progress tracker, navigation (database queries)
4. **Tier 4: Health** — Error rates, performance (application logs / APM)
5. **Tier 5: Qualitative** — Slack/GitHub/customer feedback (manual review)

This guide establishes the infrastructure to collect Tiers 1-4 automatically and Tier 5 via guided manual review.

---

## Prerequisites

✅ **Supabase schema deployed** — External blocker #2 fixed  
✅ **GitHub Actions working** — External blocker #1 fixed  
✅ **Database queries executable** — Tables created with data

---

## Step 1: Manual Collection (Minimal Setup)

For quick startup or testing, collect metrics manually each day:

```bash
# Run collection script (populates CHECKPOINT-DAILY-LOG.md)
npm run checkpoint:collect

# Output: Daily report appended to docs/governance/CHECKPOINT-DAILY-LOG.md
```

**Effort:** 5 minutes per day  
**Schedule:** Run at 09:00 UTC each morning  
**Pros:** Simple, no new automation, human review of output  
**Cons:** Requires manual daily execution

---

## Step 2: Automated Collection (Recommended Setup)

For hands-off daily collection, add a GitHub Actions workflow:

### 2.1 Create GitHub Actions Workflow

Create `.github/workflows/checkpoint-daily-collection.yml`:

```yaml
name: Checkpoint Daily Collection

on:
  schedule:
    # Run daily at 09:00 UTC
    - cron: '0 9 * * *'
  workflow_dispatch: # Allow manual trigger

permissions:
  contents: write
  pull-requests: write

jobs:
  collect:
    runs-on: ubuntu-latest
    name: Collect Daily Metrics

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Collect checkpoint metrics
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run checkpoint:collect

      - name: Commit and push daily log
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git config user.name "Governor"
          git config user.email "governor@euro-ai.dev"
          
          if git diff --quiet docs/governance/CHECKPOINT-DAILY-LOG.md; then
            echo "No changes to commit"
            exit 0
          fi
          
          git add docs/governance/CHECKPOINT-DAILY-LOG.md
          git commit -m "chore(checkpoint): Daily metric collection - $(date +%Y-%m-%d)"
          git push origin main

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Checkpoint collection failed"
          echo "Check logs at: https://github.com/${{ github.repository }}/actions"
```

### 2.2 Configure Secrets

In GitHub repo settings, add Supabase credentials:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = [your-anon-key]
```

**Effort:** 10 minutes  
**Schedule:** Automatic daily at 09:00 UTC  
**Pros:** Hands-off, automated commits, consistent timing  
**Cons:** Requires GitHub Actions setup, slightly more complex

---

## Step 3: Manual Qualitative Review (Daily)

While metrics are collected automatically, qualitative signals require manual review:

### 3.1 Daily Slack Scan (10 minutes)

Search Slack channels for adoption signals:

```
#general, #support, #feedback:
  - "obligation" OR "compliance" OR "evidence" OR "audit" OR "report" OR "template" OR "custom"
```

**Checklist:**

- [ ] Search keywords in channel history
- [ ] Record any mentions (who, what, context, sentiment)
- [ ] Copy relevant snippets to CHECKPOINT-DAILY-LOG.md

**Example entry:**

```markdown
### Qualitative Signals

**Slack mentions:**
- Team A: "We're using obligations to track GDPR requirements" (positive, evidence signal)
- Team B: "Templates don't cover our industry" (negative, template iteration signal)
- Team C: "Struggling with assessment length" (negative, template iteration signal)

**GitHub issues:** None new

**Customer feedback:** None this week
```

### 3.2 Weekly Customer Contact (Friday, 30 minutes)

Reach out to 2-3 most active teams:

**Template message:**

```
Hi [Team],

I'm gathering feedback on Phase 2 features (Obligation Tracking, Assessment Progress, Evidence Collection).

Quick questions:

1. How's Phase 2 working for your workflow?
2. What's missing or broken?
3. If you could build ONE feature next, what would it be?
4. Would you recommend this to other compliance teams?

[Link to CHECKPOINT-AUDIT-FRAMEWORK-2026-07-17.md § Phase 3 Decision Criteria]
```

**Channels:**
- Slack DMs to active team leads
- Email to primary contacts
- Optional: Slack poll in #general (1-question sentiment check)

**Recording:**

In CHECKPOINT-DAILY-LOG.md § Qualitative Signals, add:

```markdown
**Direct feedback (Week of 2026-07-14):**
- Team A: "Evidence linking would save us 3 hours/week" → Phase 3 candidate: Evidence-Obligation Linking
- Team B: "We need audit trails for compliance audits" → Phase 3 candidate: Audit Logging
- Team C: "Templates are too generic; we need industry-specific templates" → Phase 3 candidate: Template Iteration
```

---

## Step 4: Weekly Aggregation (Friday, 17:00 UTC)

At the end of each week, aggregate metrics and trends:

### 4.1 Update Trend Analysis

In CHECKPOINT-DAILY-LOG.md, add weekly summary:

```markdown
## Weekly Checkpoint — Week of 2026-07-10

**Adoption Trend:**
- Total obligations: 245 → 340 (+39%)
- Active workspaces: 12 → 18 (+50%)
- Assessments completed: 8 → 22 (+175%)
- Trend: ↗ **Strong adoption growth**

**Engagement Trend:**
- Status updates: 42 → 67 (+59%)
- CSV exports: 6 → 12 (+100%)
- Search queries: 120 → 145 (+21%)
- Trend: ↗ **Increasing active use**

**Customer Sentiment:**
- Positive mentions: 4 teams (evidence, audit, templates)
- Issues reported: 1 (slow assessment page)
- Overall: ↗ **Positive feedback trend**

**Phase 3 Candidate Signals:**
- Evidence-Obligation Linking: 2 mentions (evidence linking value)
- Audit Logging: 3 mentions (change history, compliance audits)
- Advanced Analytics: 1 mention (trending, reporting)
- Template Iteration: 2 mentions (industry-specific need)

**Recommendation:** Audit Logging leading based on customer feedback
```

### 4.2 Compare to Baseline

Track growth rate and saturation point:

```
Day 1 (2026-07-10):  245 obligations, 12 workspaces
Day 8 (2026-07-17): 340 obligations, 18 workspaces

Growth: +39% obligations, +50% workspaces
Status: ↗ Growing (adopting, not saturated)
```

---

## Step 5: Final Audit Report (2026-07-17, 17:00 UTC)

On the decision date, compile final results:

### 5.1 Generate CHECKPOINT-AUDIT-RESULTS-2026-07-17.md

Based on 7 days of data:

```markdown
# Checkpoint Audit Results — 2026-07-17

## Summary

**Winner: Audit Logging**

Audit Logging meets the decision criteria with highest confidence:
- 3 teams mentioned "who changed it" or "history" explicitly
- Status update rate is 67/day (target: >10/day) ✓
- Compliance audit mentioned in customer feedback ✓
- Adoption curve shows healthy growth (↗)
- Risk: Medium (new table, but lower complexity than Evidence-Obligation Linking)

**Recommendation:** Implement Audit Logging Phase 3. Evidence-Obligation Linking is close second (implement in Phase 4).

**Confidence:** High (70%+) — clear customer demand + strong adoption metrics

---

[Include adoption graphs, engagement breakdown, qualitative themes, etc.]
```

### 5.2 Deliver to Founder

Share results with clear recommendation:
- ✅ Winner + reasoning
- ✅ Adoption data + trends
- ✅ Customer feedback summary
- ✅ Phase 3 pre-design (already ready in PHASE-3-ARCHITECTURE-OPTIONS.md)

**Founder action:** Approve Phase 3 candidate (no further analysis needed)

---

## Monitoring Dashboard (Optional)

For real-time visibility, set up a simple dashboard:

### Option A: Google Sheets (Manual)

Create a shared spreadsheet with:
- Columns: Date, Obligations (count), Workspaces (count), Assessments (%), Engagement (actions/day)
- Update daily from CHECKPOINT-DAILY-LOG.md
- Add simple trend charts

### Option B: Grafana/Datadog (Advanced)

For production monitoring:
1. Connect Datadog/Grafana to Supabase
2. Create dashboard with real-time metrics
3. Set alerts for anomalies (e.g., adoption drops)

### Option C: Simple Markdown Table (Recommended)

Update CHECKPOINT-DAILY-LOG.md collection progress table daily:

```markdown
| Date | Obligations | Workspaces | Assessments % | Status |
|------|-------------|-----------|---------------|--------|
| 2026-07-10 | 245 | 12 | 30% | ✅ Collected |
| 2026-07-11 | 267 | 14 | 35% | ✅ Collected |
| ... | ... | ... | ... | ... |
| 2026-07-17 | 340 | 18 | 55% | ✅ Final Report |
```

---

## Troubleshooting

### Issue: Collection script fails with "table not found"

**Cause:** Supabase schema not deployed (external blocker #2)  
**Solution:** Deploy schema using `supabase/schema.sql` first

### Issue: Automated GitHub Actions workflow doesn't run

**Cause:** Secrets not configured or schedule syntax wrong  
**Solution:** Check GitHub Actions tab → Settings → Secrets configured

### Issue: Not collecting qualitative feedback

**Cause:** Manual review requires discipline  
**Solution:** Block 15 min daily and 30 min weekly on calendar for reviews

### Issue: Trend calculation is unclear

**Cause:** Small dataset in early days  
**Solution:** Use running average (3-day moving average) to smooth noise

---

## Success Criteria

✅ **Collection succeeds if:**
- Daily script runs and appends reports without errors
- 7 days of continuous data collected
- Qualitative feedback recorded from 5+ teams
- Trend analysis shows clear adoption pattern
- Decision algorithm produces > 70% confidence recommendation

❌ **Collection fails if:**
- Database queries timeout (performance issue)
- Qualitative feedback missing (manual review skipped)
- Multiple days of data missing (script never ran)
- Inconclusive results (all candidates score equally)

---

## Timeline

| Milestone | Date | Owner | Duration | Action |
|-----------|------|-------|----------|--------|
| Deploy Supabase schema | ASAP | Founder | 5 min | External blocker #2 |
| Setup collection script | 2026-07-10 | Governor | 5 min | `npm run checkpoint:collect` works |
| Setup GitHub Actions (optional) | 2026-07-10 | Governor | 10 min | Automated daily runs |
| Daily data collection | 2026-07-10 to 2026-07-17 | Automated | 5 min/day | Daily 09:00 UTC |
| Daily qualitative review | 2026-07-10 to 2026-07-17 | Governor | 10 min/day | Slack/GitHub scan |
| Weekly aggregation | Every Friday | Governor | 30 min | Trend analysis |
| Final audit report | 2026-07-17, 17:00 UTC | Governor | 2 hours | Results delivered |

---

## Next Steps

1. ✅ Once Supabase schema is deployed → Run `npm run checkpoint:collect`
2. ✅ (Optional) Setup GitHub Actions workflow for automated collection
3. ✅ Begin daily Slack/GitHub qualitative review
4. ✅ Review data daily and update trends
5. ✅ Deliver final audit results on 2026-07-17

---

**Status:** Ready to deploy once external blockers are fixed  
**Last Updated:** 2026-07-10
