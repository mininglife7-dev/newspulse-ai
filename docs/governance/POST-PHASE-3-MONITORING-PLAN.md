# Post-Phase-3 Monitoring Plan

**Purpose:** Define what to watch after Phase 3 feature deploys to ensure quality, adoption, and business impact

**Timeline:** Applies once Phase 3 feature goes live (target: ~2026-07-25 after 7-10 day implementation)

---

## The Question We're Answering

**"Is the Phase 3 feature working well and creating customer value?"**

Post-deployment monitoring verifies:
1. **Technical health:** Feature doesn't break existing functionality
2. **Adoption:** Teams actually use the new feature
3. **Customer satisfaction:** Teams like it (or identify pain points early)
4. **Business impact:** Does it move the needle on Phase 3 goals?

---

## Tier 1: Technical Health (Automated)

### Error Rate Monitoring

**Metric:** API errors for Phase 3 endpoints

**Target:** < 1% error rate on Phase 3 APIs  
**Alert:** If error rate > 2% for > 10 minutes

**How to collect:**
```sql
SELECT
  endpoint,
  COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
  COUNT(*) as total_requests,
  100.0 * COUNT(*) FILTER (WHERE status_code >= 400) / COUNT(*) as error_rate
FROM api_logs
WHERE endpoint LIKE '/api/[phase3-endpoint]%'
  AND timestamp > now() - interval '1 hour'
GROUP BY endpoint
ORDER BY error_rate DESC;
```

**What to do if high:**
- Review error types (validation vs. runtime vs. database)
- Check recent commits (did Phase 3 implementation break something?)
- Verify database connectivity
- Roll back if critical errors (> 5% on core endpoint)

### Performance Monitoring

**Metric:** API response times (p50, p95, p99)

**Target:** p99 < 5 seconds  
**Alert:** If p99 > 8 seconds for > 5 minutes

**How to collect:**
```sql
SELECT
  endpoint,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time_ms) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99,
  AVG(response_time_ms) as avg
FROM api_logs
WHERE endpoint LIKE '/api/[phase3-endpoint]%'
  AND timestamp > now() - interval '1 hour'
GROUP BY endpoint;
```

**What to do if slow:**
- Check database query performance (missing index?)
- Check file upload sizes (Evidence-Obligation Linking)
- Verify network latency to Supabase
- Optimize or scale if needed

### Database Health

**Metric:** Connection pool utilization, query performance

**Target:** Connection pool < 80% utilization  
**Alert:** If > 90% for > 5 minutes (indicates saturation)

**How to collect:**
- Supabase dashboard → Database → Connections
- Monitor: Active connections, max connections, query durations
- Watch for: Long-running queries, connection leaks

**What to do if high:**
- Identify slow queries (Phase 3 implementation might have N+1 queries)
- Add indexes if needed
- Scale connection pool if persistent
- Optimize query logic in API

### Deployment Health

**Metric:** Vercel deployment status, build times

**Target:** Build time < 5 minutes  
**Alert:** If build > 10 minutes (indicates degradation)

**How to collect:**
- Vercel dashboard → Project → Deployments
- Monitor: Build duration, build status, deploy status
- Watch for: Failures, slowdowns

**What to do if degraded:**
- Check git commit size (did we add large files?)
- Verify npm dependencies didn't bloat
- Review build logs for warnings
- Optimize bundle size if needed

---

## Tier 2: Adoption Metrics (Daily)

### Feature-Specific Usage

**Evidence-Obligation Linking (if chosen):**
- Evidence files uploaded (count)
- Obligations linked to evidence (count)
- Average evidence per obligation
- File types uploaded (PDF, Word, images, etc.)

**Audit Logging (if chosen):**
- Audit log entries created (count)
- Most common audit actions (status_update, obligation_link, etc.)
- Average audit log entries per workspace

**Advanced Analytics (if chosen):**
- Analytics dashboard views (count)
- Trend reports exported (count)
- Average dwell time on analytics page
- Most-viewed chart type (progress, velocity, risk distribution, etc.)

**Template Iteration (if chosen):**
- Custom templates created (count)
- Industry-specific template imports (count)
- Template customization rate
- Most-used industry filter

**How to collect:**
Database queries (similar to adoption metrics in checkpoint framework)

**What to do:**
- Day 1-2: Expect low usage (teams discovering feature)
- Day 3-7: Usage should ramp (early adopters using)
- Day 7+: Usage plateaus at steady state (typical adoption curve)
- If flat/declining: Teams don't know feature exists; need education/demo

### Feature Adoption Signals

**Target:** 20%+ of active workspaces use Phase 3 feature within 7 days  
**Alert:** If < 10% adoption after 7 days

**What to do if low adoption:**
- Analyze: Do teams know feature exists?
- Solution: Founder message/demo to teams
- Check: Is feature discoverable in UI? (nav links, buttons visible?)
- Verify: Feature works as intended (no bugs driving users away?)

---

## Tier 3: Qualitative Signals (Manual)

### Customer Feedback

**Channels:** Slack, GitHub issues, direct DMs

**What to ask:**
- "How's the new [feature] working for you?"
- "What's missing or broken?"
- "Would you recommend it to other compliance teams?"

**What to listen for:**
- Blockers: "I can't do X because Y"
- Workarounds: "I have to manually..."
- Praise: "This saves me X hours per week"
- Suggestions: "It would be great if..."

**How to collect:**
- Daily Slack scan: Search channel for feature name
- Weekly GitHub issues review: Look for feature-related complaints/praise
- Optional: Send Slack poll to 3-5 active teams: "Rate the new [feature]: 😍 😊 😐 😞"

**What to do:**
- Blockers (> 2 teams reporting same issue) → Hotfix immediately
- Suggestions (> 3 teams requesting same feature) → Add to Phase 4 backlog
- Praise (consistent positive feedback) → Share with Founder; document learning

### Usage Patterns

**What to observe:**
- Which teams are using it? (early adopters vs. late adopters)
- Which features within Phase 3 are used most? (if multi-feature)
- Are users abandoning workflows halfway? (incomplete usage)
- Are there power users who discovered hidden capabilities?

**How to collect:**
- User session tracking: Who logs in, which pages they visit
- Event tracking: Which Phase 3 features they interact with
- Qualitative: Ask teams "What do you use most?"

**What to do:**
- Optimize for power users' workflows (they've found high-value paths)
- Help non-users discover features (education gap)
- If abandonment high: Feature might be too confusing (add docs/tutorial)

---

## Tier 4: Business Impact (Weekly)

### Phase 3 Goal Measurement

**If Evidence-Obligation Linking:**
- Goal: "Teams can prove compliance"
- Metric: Evidence files linked to obligations (trending up?)
- Impact: Customer churn reduction? (ask teams: "Does this help you stay compliant?")

**If Audit Logging:**
- Goal: "Compliance officers have change history"
- Metric: Audit log views, exports (trending up?)
- Impact: Faster audit cycles? (ask: "Does this speed up your audits?")

**If Advanced Analytics:**
- Goal: "Executive visibility into compliance progress"
- Metric: Dashboard views, report exports (trending up?)
- Impact: Better strategic decisions? (ask: "Does this change how you prioritize?")

**If Template Iteration:**
- Goal: "Faster onboarding for new industries"
- Metric: Custom template creation, new workspace signups (trending up?)
- Impact: Reduced onboarding time? (ask: "Are templates more relevant now?")

### Regression Detection

**What to watch:** Did existing features break?

**Metrics:**
- Obligations page load time (should not slow down)
- Assessment completion rate (should not decrease)
- Compliance dashboard accuracy (should not degrade)

**How to collect:**
- Compare pre-Phase-3 metrics to post-Phase-3
- Baseline: 2026-07-18 (day before Phase 3 deploy)
- Compare: 2026-07-25 (one week after)

**What to do:**
- If regression: Investigate if Phase 3 caused it (or coincidence?)
- If Phase 3 caused: Hotfix or rollback
- If coincidence: Fix underlying issue

---

## Daily/Weekly Monitoring Schedule

### Daily (Automated) — 09:00 UTC

```markdown
## Daily Monitor — [DATE]

**Technical Health:**
- Error rate: [X]% (target: < 1%)
- p99 latency: [X]ms (target: < 5s)
- DB connections: [X]% utilized (target: < 80%)
- Vercel deployment: [status] (target: ✅)

**Adoption (Phase 3 feature):**
- Active users: [X] (trend: ↗ ↘ →)
- Feature interactions: [X] (trend: ↗ ↘ →)
- Error rate on new endpoints: [X]% (trend: ↗ ↘ →)

**Qualitative Signals:**
- Slack mentions: [list topics]
- GitHub issues: [list if any]
- Customer quotes: [snippets]

**Status:** 🟢 Healthy | 🟡 Degraded | 🔴 Critical
```

Publish to: `docs/governance/PHASE-3-DAILY-MONITOR.md` (append-only)

### Weekly (Manual) — Fridays 17:00 UTC

Run checkpoint analysis:

```markdown
## Weekly Checkpoint — Week of [DATE]

**Adoption Trend:**
- Growth rate: [X]% week-over-week
- Active workspace %: [X]% (target: 20%+)
- Feature adoption curve: On track? Ahead? Behind?

**Quality & Stability:**
- Critical errors: [X] (target: 0)
- Performance regressions: [list if any]
- Rollback incidents: [X] (target: 0)

**Customer Sentiment:**
- Positive feedback: [X] teams, key quote: "..."
- Issues reported: [X], severity breakdown (critical/high/medium/low)
- Requested features: [top 3]

**Business Impact:**
- [Phase 3 goal] progress: [X]% (target: trending up)
- Churn prevention: [X] at-risk teams engaged
- Next-phase demand signals: [list if any]

**Confidence:**
- Data quality: [High/Medium/Low] (enough samples to trust?)
- Risk level: [Low/Medium/High] (is Phase 3 healthy?)

**Recommendation:**
- Continue as-is, or
- Hotfix [X], or
- Investigate [X], or
- Rollback if [critical issue occurs]
```

Publish to: `docs/governance/PHASE-3-WEEKLY-CHECKPOINT.md` (weekly entries)

---

## Red Flags (Immediate Action)

Stop normal operations if any of these occur:

🔴 **Critical Error Spike**
- Error rate > 10% for > 5 minutes
- Action: Investigate root cause; rollback if necessary; notify Founder

🔴 **Performance Degradation**
- p99 latency > 30 seconds
- or Build time > 30 minutes
- Action: Identify bottleneck; scale/optimize; rollback if necessary

🔴 **Zero Adoption After 1 Week**
- < 5% of teams using Phase 3 feature
- Action: Check if feature is discoverable; verify it works; get direct feedback

🔴 **Multiple Teams Reporting Critical Issues**
- > 3 teams reporting same blocker
- Action: Hotfix immediately; communicate with teams

🔴 **Rollback Required**
- If Phase 3 is causing data loss, security breach, or widespread outages
- Action: Revert to previous version; notify Founder; incident post-mortem

---

## Success Criteria (One Month Post-Launch)

✅ **Phase 3 succeeds if:**
- 20%+ of workspaces are using the feature (adoption)
- Error rate < 1% consistently (stability)
- Positive customer feedback > negative (satisfaction)
- Measurable business impact (toward Phase 3 goal)
- Zero critical bugs in production (quality)

⚠️ **Phase 3 needs investigation if:**
- Adoption is 10-20% but growing (learning ramp, check back in 2 weeks)
- Error rate 2-5% (acceptable but monitor closely)
- Mixed feedback (some love it, some hate it; needs UX iteration)
- Business impact unclear (might need bigger sample size)

❌ **Phase 3 fails if:**
- Adoption < 10% after 2 weeks (teams don't want it)
- Error rate > 5% consistently (stability issue)
- Critical bugs or security issues (rollback immediately)
- Negative customer sentiment (> 70% complaints)

---

## Post-Mortem Template

If Phase 3 has significant issues or surprising outcomes:

```markdown
## Phase 3 Post-Mortem — [DATE]

**What we expected:**
- [Phase 3 goal]
- [Adoption target]
- [Success metrics]

**What actually happened:**
- [Actual adoption, feedback, impact]
- [Surprises, failures, learnings]

**Root causes:**
- [Why adoption was lower/higher than expected?]
- [Why quality issues occurred?]
- [What we missed in planning?]

**Actions taken:**
- [Hotfixes applied]
- [Communication to teams]
- [Plan adjustments]

**Learnings:**
- [What we learned about this feature]
- [What we'll do differently next time]
- [Improvements to process]

**Next steps:**
- [Follow-up work]
- [Timeline]
- [Owner]
```

---

## Tools & Dashboards (Future)

Once Phase 3 monitoring is running, consider building:

1. **Real-time metrics dashboard**
   - Error rate, latency, adoption, active users
   - Visible to Founder + team
   - Auto-alerts on red flags

2. **Weekly automated report**
   - Email/Slack summary of key metrics
   - Highlights, regressions, opportunities
   - 5-minute read

3. **Trend graphs**
   - Adoption over time (S-curve expected)
   - Feature usage by type
   - Performance stability baseline

---

## Timeline

| Milestone | Date | Owner | Action |
|-----------|------|-------|--------|
| Phase 3 deploys | 2026-07-25 | Governor | Launch feature; begin daily monitoring |
| Day 1-7 monitoring | 2026-07-25 to 2026-08-01 | Governor | Daily health checks; watch for red flags |
| Week 2 checkpoint | 2026-08-01 | Governor | Weekly analysis; adjust if needed |
| Week 3-4 monitoring | 2026-08-02 to 2026-08-08 | Governor | Continued daily checks |
| One-month review | 2026-08-10 | Governor | Phase 3 success assessment |
| Post-mortem (if needed) | 2026-08-10 | Governor | Document learnings, plan improvements |

---

**Status:** Ready to execute once Phase 3 deploys  
**Last Updated:** 2026-07-10
