# Pilot Success Metrics Dashboard

## EURO AI — Customer Health Monitoring Framework (Weeks 1-5)

**Purpose:** Establish data-driven KPIs for monitoring customer pilot success. Governor uses this dashboard to track progress against targets, identify risks early, and inform weekly steering calls.

**Usage:** Fill in weekly (every Friday). Track actual vs. target. Escalate RED metrics (below 60% of target) to Founder immediately.

**Audience:** Governor (tracking), Founder (weekly review)

---

## Week-by-Week Success Criteria

### WEEK 1: Onboarding & Setup Phase

**Theme:** "Customer team is up and running"

| KPI                        | Target | Definition                                                     | Data Source                       | Frequency   |
| -------------------------- | ------ | -------------------------------------------------------------- | --------------------------------- | ----------- |
| **Team login completion**  | 100%   | % of team members who have successfully logged in              | Supabase auth logs                | Daily       |
| **Workspace exploration**  | 100%   | % of team members who have accessed Dashboard (any view)       | Application analytics             | Daily       |
| **Quick-start guide read** | 80%+   | % of team members who opened/reviewed guide document           | Support check-in calls            | End of week |
| **Live call attendance**   | 100%   | % of assigned attendees who joined kickoff call                | Calendar/meeting logs             | Day 3       |
| **AI systems added**       | 3-5    | Count of AI systems in inventory by end of week                | Supabase `ai_systems` table count | End of week |
| **Support tickets**        | 0-2    | Count of support issues raised this week (expect minimal)      | Email/Slack log                   | End of week |
| **Customer satisfaction**  | 8/10+  | NPS-style feedback from live call ("How likely to recommend?") | Feedback form after call          | Day 3       |

**Success Threshold:** All metrics meet targets OR within 10% of target

**Red Flag (Immediate Escalation):**

- ≤80% team login completion (indicates auth/access issue)
- 0 systems added (indicates confusion or resistance)
- ≥2 support blockers (indicates product fit issue)
- Customer satisfaction <7/10 (indicates poor kickoff experience)

---

### WEEK 2: Guided Workflow & First Assessment

**Theme:** "Customer creates first complete risk assessment"

| KPI                                  | Target   | Definition                                                            | Data Source                       | Frequency   |
| ------------------------------------ | -------- | --------------------------------------------------------------------- | --------------------------------- | ----------- |
| **Risk assessments started**         | 2+       | Count of draft/in-progress assessments                                | Supabase `risk_assessments` table | Mid-week    |
| **Risk assessments completed**       | 1        | Count of completed assessments (status="In Review")                   | Supabase `risk_assessments` table | End of week |
| **Evidence documents uploaded**      | 2+       | Count of evidence documents linked to assessments                     | Supabase `evidence` table         | End of week |
| **Assessment completion time**       | <4 hours | Time from "started" to "completed" (wall-clock)                       | Support observation notes         | Day 4-5     |
| **Questions answered (avg)**         | 8-10/10  | Average # of questions completed per assessment                       | Assessment content review         | End of week |
| **Evidence adequacy**                | 70%+     | % of assessments with sufficient evidence (per audit rubric)          | Governor manual review            | End of week |
| **Support escalations**              | 0-1      | Count of issues requiring Governor help (e.g., "How do I answer Q5?") | Email/Slack log                   | End of week |
| **Attendance: Tuesday sync**         | 100%     | % of working team at mid-week check-in                                | Calendar                          | Day 2       |
| **Attendance: Friday retrospective** | 100%     | % of sponsor + team at assessment review                              | Calendar                          | Day 5       |
| **Customer satisfaction**            | 8/10+    | Feedback from Friday retrospective                                    | Feedback form                     | Day 5       |

**Success Threshold:** Completed assessment by Friday EOD with ≥2 evidence docs linked AND customer satisfaction ≥8/10

**Red Flag (Immediate Escalation):**

- No assessments started by mid-week (indicates misunderstanding of workflow)
- Assessment incomplete by Friday EOD (indicates workflow friction or resource shortage)
- <1 evidence document uploaded (indicates resistance to documentation requirements)
- ≥2 support escalations (indicates product clarity issue)
- Customer satisfaction <7/10 (indicates poor experience)

---

### WEEK 3: Feature Validation & Independence

**Theme:** "Customer works independently; adds more systems/assessments"

| KPI                            | Target  | Definition                                                              | Data Source                           | Frequency   |
| ------------------------------ | ------- | ----------------------------------------------------------------------- | ------------------------------------- | ----------- |
| **New systems added**          | 4-6     | Count of systems added (not by Governor)                                | Supabase + audit trail                | End of week |
| **Total systems in inventory** | 8-10    | Total system count (cumulative from Weeks 1-3)                          | Supabase `ai_systems` table count     | End of week |
| **New assessments created**    | 3+      | Count of risk assessments (not by Governor)                             | Supabase `risk_assessments` table     | End of week |
| **Total assessments**          | 4+      | Total assessment count (cumulative)                                     | Supabase `risk_assessments` table     | End of week |
| **Evidence organization**      | 8+ docs | Total evidence documents uploaded                                       | Supabase `evidence` table count       | End of week |
| **Avg time per system**        | <20 min | (Total systems added ÷ hours spent on work) ≈ batch efficiency          | Support observation + customer report | End of week |
| **Export/backup testing**      | Yes     | Customer tested "Export to PDF" feature at least once                   | Customer email confirmation           | End of week |
| **Support questions**          | 0-1     | Count of non-blocking questions (expect minimal for routine work)       | Email/Slack log                       | End of week |
| **Async feedback quality**     | Good    | Customer's Friday async check-in shows clear progress + honest feedback | Email content review                  | Day 5       |
| **Product feedback**           | 1+      | Customer identifies at least one feature they like + one to improve     | Async check-in or hallway feedback    | End of week |

**Success Threshold:** ≥8 total systems + ≥4 total assessments + customer working independently (minimal Governor support needed)

**Red Flag (Immediate Escalation):**

- Total systems <6 (pace falling behind target)
- No new assessments in Week 3 (indicates motivation/clarity issue)
- ≥3 support questions (indicates confusion or product friction)
- Customer identifies critical product bug or blocker (not cosmetic issue)
- Async feedback is negative or vague ("unclear how to proceed")

---

### WEEK 4: Compliance Audit & Production Prep

**Theme:** "All assessments audit-ready; zero critical findings"

| KPI                             | Target     | Definition                                                | Data Source                      | Frequency   |
| ------------------------------- | ---------- | --------------------------------------------------------- | -------------------------------- | ----------- |
| **Assessments reviewed**        | 4/4        | Count of assessments that passed Governor audit           | Audit checklist                  | Mid-week    |
| **Audit findings: Critical**    | 0          | Count of critical issues (blockers)                       | Audit report                     | Day 3       |
| **Audit findings: Medium**      | 0-1        | Count of minor issues (cosmetic/documentation)            | Audit report                     | Day 3       |
| **Audit findings remediated**   | 100%       | % of findings addressed by customer before call           | Audit follow-up                  | Day 4       |
| **Evidence completeness**       | 90%+       | % of assessments with all required supporting docs        | Audit rubric scoring             | Day 3       |
| **Audit trail quality**         | 50+ events | Total audit log entries (shows governance activity)       | Supabase `audit_log` table count | End of week |
| **Backup tested**               | Yes        | Customer ran export; file generated successfully          | Customer confirmation            | Day 3-4     |
| **Team training completion**    | 100%       | % of team who completed "production operations" training  | Training attendance              | Day 4       |
| **Compliance sponsor approval** | Yes        | Compliance officer signed off on all assessments          | Email/signature                  | Day 4       |
| **Production readiness vote**   | Pass       | Founder + Governor agreement: "Ready for production"      | Meeting notes                    | Day 4       |
| **Attendance: Audit call**      | 100%       | % of sponsor + compliance + technical team at review call | Calendar                         | Day 4       |
| **Customer satisfaction**       | 8/10+      | Feedback from audit results call                          | Feedback form                    | Day 4       |

**Success Threshold:** Zero critical findings + all assessments audit-pass + compliance approval + Founder/Governor production GO vote

**Red Flag (Immediate Escalation):**

- ≥1 critical finding (workflow/data integrity issue)
- ≥3 medium findings (indicates quality slippage)
- Backup/export fails (indicates data protection risk)
- Compliance sponsor declines to approve (indicates trust/clarity issue)
- Production GO vote is "No" (indicates readiness concern)

---

### WEEK 5: Production Handoff & Scale-Up

**Theme:** "Transition to production; celebrate success; plan scale-up"

| KPI                                  | Target   | Definition                                                               | Data Source               | Frequency   |
| ------------------------------------ | -------- | ------------------------------------------------------------------------ | ------------------------- | ----------- |
| **Production handoff meeting held**  | Yes      | All operational docs delivered + team trained                            | Meeting notes             | Day 1-2     |
| **Backup/export procedure verified** | Yes      | Customer successfully backed up their data                               | Customer confirmation     | Day 2       |
| **SLA acknowledgment**               | Yes      | Customer confirms understanding of production support SLA                | Email/signed doc          | Day 2-3     |
| **Systems scaled to production**     | 8-10     | All pilot systems now live in production workspace (not pilot)           | Supabase workspace config | Day 3       |
| **Month 2 scale-up planned**         | Yes      | Schedule for adding remaining systems (Week 6+) established              | Calendar + kickoff doc    | Day 4       |
| **Executive celebration call held**  | Yes      | Sponsor + Governor + Founder present                                     | Calendar                  | Day 5       |
| **Compliance officer feedback**      | Positive | Written feedback on pilot experience (for case study)                    | Email                     | Day 5       |
| **NPS final score**                  | 8/10+    | "How likely to recommend EURO AI to peer organizations?"                 | Post-call survey          | Day 5       |
| **Team engagement score**            | 8/10+    | "How engaged/confident is your team in using EURO AI?"                   | Post-call survey          | Day 5       |
| **Roadmap interest**                 | Positive | Customer interested in v1.1 features (custom reports, bulk upload, etc.) | Meeting discussion notes  | Day 5       |
| **Case study participation**         | Yes/No   | Customer willing to be referenced in marketing/case studies              | Explicit ask at call      | Day 5       |
| **Upsell readiness**                 | Ready    | Customer positioned for Enterprise tier upgrade (post-Month 1)           | Governor assessment       | End of week |

**Success Threshold:** All production readiness items complete + NPS ≥8 + scheduled for Month 2 scale-up

**Red Flag (Immediate Escalation):**

- Backup/export procedure fails (critical risk)
- Customer expresses low confidence in platform ("Don't think we'll continue")
- NPS <7/10 (indicates pilot was not successful)
- No Month 2 scale-up scheduled (indicates intent to discontinue)

---

## Cross-Week Meta Metrics

**Track continuously (updated weekly):**

| Meta-Metric                      | Baseline   | Target Trajectory                         | Yellow Flag                           | Red Flag                               |
| -------------------------------- | ---------- | ----------------------------------------- | ------------------------------------- | -------------------------------------- |
| **Customer effort (hours/week)** | ~12 hrs W1 | 5 hrs W2 → 3 hrs W3 → 4 hrs W4 → 2 hrs W5 | >8 hrs W2 (too much friction)         | >12 hrs any week (unsustainable)       |
| **Governor effort (hours/week)** | ~6 hrs W1  | 8 hrs W2 → 4 hrs W3 → 6 hrs W4 → 2 hrs W5 | >10 hrs W3 (should be independent)    | >15 hrs any week (high support burden) |
| **Support response time (avg)**  | <2 hours   | <4 hours (pilot SLA)                      | >6 hours on any issue                 | >24 hours on any issue                 |
| **Feature adoption rate**        | 40% (W1)   | 70% (W2) → 90% (W3) → 95% (W4+)           | <60% by W3 (adoption gap)             | <40% by W4 (critical adoption issue)   |
| **Data quality score**           | 60%        | 75% (W2) → 85% (W3) → 95% (W4+)           | <70% by W3 (assessment quality issue) | <60% by W4 (critical quality issue)    |
| **Customer health score**        | TBD        | ≥75/100 (composite of above metrics)      | 50-74 (elevated risk)                 | <50 (critical risk)                    |

---

## Composite Customer Health Score

**Calculation (Updated Weekly):**

```
Health Score =
  (Adoption Rate × 0.25) +
  (Data Quality × 0.20) +
  (Support Response Time × 0.15) +
  (NPS/Satisfaction × 0.25) +
  (On-Track Delivery × 0.15)

Scale: 0-100
Green (≥75): On track
Yellow (50-74): Elevated risk; intervention recommended
Red (<50): Critical risk; immediate escalation
```

**Weekly Review:**

- Green → Continue as planned; document progress
- Yellow → Governor + Founder discuss intervention options
- Red → Immediate Founder call + contingency activation

---

## Weekly Governance Checklist

**Every Friday, Governor completes:**

- [ ] Fill in all KPIs for the completed week
- [ ] Calculate composite Health Score
- [ ] Flag any RED metrics (≤60% of target)
- [ ] Flag any YELLOW metrics (60-80% of target)
- [ ] Draft 1-paragraph summary of week's progress
- [ ] Identify 1-2 risks for Founder consideration
- [ ] Schedule Monday check-in (if needed)
- [ ] Update FOUNDER_BRIEF with metrics summary

**Founder Review (Monday Morning):**

- Review Governor's Friday summary
- Check Health Score trend (improving, stable, degrading?)
- Decide on any mid-week interventions
- Confirm next week's meeting schedule

---

## Risk Escalation Matrix

| Scenario                                                   | Health Score | Action                                                                                        |
| ---------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| Week 1 kickoff goes poorly (customer no-show, tech issues) | <60          | Governor calls Founder immediately; discuss contingency (reschedule? change approach?)        |
| Week 2: No assessments completed by Thursday               | <50          | Governor has deep conversation Friday morning; identify blockers; consider weekend support    |
| Week 3: Customer goes silent (no async feedback)           | <60          | Governor reaches out via Slack + email; verify customer is still engaged                      |
| Week 4: Audit finds critical issue                         | <50          | Founder involved in audit call; discussion of remediation approach                            |
| Week 5: NPS <7/10                                          | <60          | Retrospective call after celebration; diagnosis of what went wrong; recovery plan for Month 2 |
| Any week: Support backlog >2 days                          | <70          | Founder escalation; determine if issue is customer-specific or product-wide                   |

---

## Pilot Success Narrative

**Founder should think of the pilot as SUCCESS if:**

✅ Customer completes all 5 weeks without cancellation  
✅ 8-10 AI systems added to inventory (on schedule)  
✅ 4+ compliant risk assessments created (on schedule)  
✅ Audit produces zero critical findings  
✅ Customer NPS ≥8/10  
✅ Month 2 scale-up confirmed (customer commitment to add remaining systems)  
✅ Case study participation agreed (marketing value)

**Pilot is AT-RISK if:**
⚠️ Health Score drops below 70 at any point  
⚠️ Customer satisfaction dips below 7/10 at week-end check-in  
⚠️ No Month 2 scale-up scheduled by Week 4  
⚠️ Audit produces ≥2 critical findings

**Pilot is FAILURE if:**
❌ Customer withdraws from pilot (cancellation)  
❌ NPS <6/10 (would not recommend)  
❌ Audit uncovers data loss or security breach  
❌ Support burden exceeds >20 hours/week (unsustainable for Governor)

---

## Monthly Success Metrics (Weeks 6+)

**After pilot, track these for Month 2-3:**

| KPI                            | Target                   | Frequency        |
| ------------------------------ | ------------------------ | ---------------- |
| Systems added (Month 2)        | 10-15 total              | Weekly           |
| Assessments completed          | 10+ total                | Weekly           |
| Monthly compliance review held | Yes                      | Monthly          |
| Customer uptime/availability   | 99.9%+                   | Daily monitoring |
| Support SLA compliance         | 100%                     | Weekly review    |
| Customer satisfaction          | 8/10+                    | Quarterly NPS    |
| Feature request volume         | 1-2/month                | Monthly          |
| Upsell readiness               | Enterprise tier interest | End of Month 1   |

---

## Appendix: Data Collection Tools

**Where to find these metrics:**

| KPI                                                             | Source                       | How to Access                                              |
| --------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Login completion, system count, assessment count, evidence docs | Supabase tables              | Direct SQL queries (see queries below)                     |
| Audit findings, evidence adequacy                               | Manual Governor audit        | Governor's audit checklist (COMPLIANCE_AUDIT_CHECKLIST.md) |
| Support tickets, response time                                  | Email/Slack/ticketing system | Search inbox or support dashboard                          |
| Customer satisfaction, feedback                                 | Post-call surveys & email    | Responses to feedback forms sent after each call           |
| Meeting attendance                                              | Calendar invites & join logs | Check Zoom/Teams attendance reports                        |
| Time tracking                                                   | Support observation notes    | Governor's weekly status email                             |
| Backup/export testing                                           | Customer email confirmation  | Search for "export" or "backup" in customer messages       |

**Quick SQL Queries (Run in Supabase):**

```sql
-- Count systems for a customer
SELECT COUNT(*) as total_systems
FROM ai_systems
WHERE workspace_id = '[CUSTOMER_WORKSPACE_ID]';

-- Count assessments
SELECT COUNT(*) as total_assessments
FROM risk_assessments
WHERE workspace_id = '[CUSTOMER_WORKSPACE_ID]';

-- Count evidence docs
SELECT COUNT(*) as total_evidence
FROM evidence
WHERE workspace_id = '[CUSTOMER_WORKSPACE_ID]';

-- Audit trail activity
SELECT COUNT(*) as audit_events
FROM audit_log
WHERE workspace_id = '[CUSTOMER_WORKSPACE_ID]'
AND created_at >= '[WEEK_START_DATE]';
```

---

## Appendix: Weekly Report Template

**Governor fills this in every Friday (5 min):**

```markdown
## Week [#] Progress Report — [Customer Name]

**Reporting Date:** [Date]  
**Week Covered:** [Mon-Fri dates]  
**Report Author:** Governor

### Metrics Summary

- Systems in inventory: [#] (target: [target for week])
- Assessments completed: [#] (target: [target for week])
- Evidence documents: [#] (target: [target for week])
- Support tickets: [#] (target: ≤2)
- **Health Score:** [X/100] (trend: ↑ improving / → stable / ↓ degrading)

### Wins This Week

- [Bullet: one thing that went well]
- [Bullet: one achievement to celebrate]
- [Bullet: one customer engagement highlight]

### Risks / Blockers

- [If any: describe yellow/red metric]
- [If any: describe support issue or customer concern]
- [If any: describe product issue or misalignment]

### Next Week Preview

- Governor focus: [e.g., "Support Week 2 assessment creation"]
- Customer focus: [e.g., "Scale to 6 new systems"]
- Founder attention needed? [Yes/No] If yes: [Brief description]

### Founder Action Required (if any)

- [ ] Action 1: [Specific ask]
- [ ] Action 2: [Specific ask]
```

---

**Last Updated:** 2026-07-12  
**Version:** 1.0  
**Author:** Governor (EURO AI Customer Success)  
**Status:** Ready for weekly use beginning Week 1
