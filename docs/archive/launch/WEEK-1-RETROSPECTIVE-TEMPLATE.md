# 📋 Week 1 Retrospective Template

**Purpose:** Formal documentation of Week 1 learnings to inform Week 2-4 strategy  
**Completed By:** Founder  
**Due Date:** Friday, End of Day (Week 1, Day 7)  
**Time to Complete:** 45 minutes

---

## Executive Summary (5 min)

One sentence describing Week 1 outcome:

> [EXAMPLE: "Customer #1 successfully completed onboarding in 38 minutes with 90% satisfaction; platform stable with zero critical incidents."]

**Your Summary:**  
[Write 1-2 sentences]

---

## Customer #1 Journey (10 min)

### Completion Metrics

| Metric                           | Target  | Actual  | Status       |
| -------------------------------- | ------- | ------- | ------------ |
| **Signup to Account Created**    | <5 min  | ___ min | ✅ / ⚠️ / ❌ |
| **Account to Workspace Created** | <5 min  | ___ min | ✅ / ⚠️ / ❌ |
| **First AI System Added**        | <10 min | ___ min | ✅ / ⚠️ / ❌ |
| **Risk Assessment Completed**    | <15 min | ___ min | ✅ / ⚠️ / ❌ |
| **Report Generated**             | <5 min  | ___ min | ✅ / ⚠️ / ❌ |
| **Total Time (Signup→Report)**   | <45 min | ___ min | ✅ / ⚠️ / ❌ |

### What Worked Well

List 3-5 things that went smoothly:

1. [Example: "Customer found assessment questions clear"]
   - Evidence: [Customer feedback, logs, etc.]
   - Why it worked: [Your analysis]

2. [Example: "Platform generated report in <30 seconds"]
   - Evidence: [Performance metrics]
   - Why it worked: [Optimizations in place]

3. ...

### What Was Confusing

List 2-4 things customer got stuck on:

1. [Example: "Customer didn't understand 'AI System' vs 'Deployment'"]
   - Where: [In onboarding, step 3]
   - What customer did: [Tried to skip this section]
   - Impact: [5-minute delay; customer asked for help]
   - Fix for Customer #2: [Improve UI copy / add help text]

2. [Example: "Report download button not obvious"]
   - Where: [In compliance section]
   - What customer did: [Asked if PDF could be emailed]
   - Impact: [Requested new feature]
   - Fix for Customer #2: [Add prominent download button / email option]

3. ...

### Feature Requests from Customer #1

| Feature                           | Requested By | Problem It Solves                       | Effort Estimate | Priority |
| --------------------------------- | ------------ | --------------------------------------- | --------------- | -------- |
| [Example: Bulk import AI systems] | Customer #1  | Takes 10 min to add systems one-by-one  | 2-3 days        | High     |
| [Example: Email report]           | Customer #1  | Wants to share without dashboard access | 1-2 days        | Medium   |
| ...                               |              |                                         |                 |          |

**Action:** Add these to PHASE-2-ROADMAP.md feature request section.

### Customer Satisfaction

**Overall Satisfaction (1-5 stars):** ___ / 5

**Quote from customer (if available):**

> "[Customer's exact words about the platform]"

**Likelihood to Recommend (High / Medium / Low):**  
[Explanation: Does customer seem engaged? Would they refer others?]

---

## Platform Performance (10 min)

### Uptime & Reliability

```
Total Hours in Week 1: 168 hours
Downtime Incidents: ___
Total Downtime: ___ minutes
Uptime Percentage: ___% (target: >99%)
```

**Incidents Detail:**

- Incident 1: [What happened]
  - When: [Date/Time]
  - Duration: [Minutes]
  - Root Cause: [Why]
  - Fix Applied: [What was done]
  - Prevention: [To stop it next time]

### Performance Metrics

| Metric                | Target | Actual | Status       |
| --------------------- | ------ | ------ | ------------ |
| **Avg Response Time** | <2s    | ___ms  | ✅ / ⚠️ / ❌ |
| **95th Percentile**   | <5s    | ___ms  | ✅ / ⚠️ / ❌ |
| **Max Response Time** | <10s   | ___ms  | ✅ / ⚠️ / ❌ |
| **Database Queries**  | <100ms | ___ms  | ✅ / ⚠️ / ❌ |
| **Error Rate**        | <0.1%  | __%    | ✅ / ⚠️ / ❌ |

**Performance Analysis:**

- Was performance stable or trending up/down?
- [Explanation]
- Any slow operations?
- [List any operations that took >2 seconds]
- Any bottlenecks identified?
- [Database, API, frontend, etc.]

### Error & Issue Summary

| Error Type          | Count | Examples        |
| ------------------- | ----- | --------------- |
| 5xx (Server Errors) | ___   | [List examples] |
| 4xx (Client Errors) | ___   | [List examples] |
| Database Errors     | ___   | [List examples] |
| Network Issues      | ___   | [List examples] |
| Security Issues     | ___   | [List examples] |

**Critical Issues Found:**

- [Issue 1: description]
  - Severity: CRITICAL / HIGH / MEDIUM / LOW
  - Status: RESOLVED / IN-PROGRESS / DEFERRED
  - Action: [What was/will be done]

---

## Operational Performance (10 min)

### Support Workload

| Metric                  | Actual  | Notes                    |
| ----------------------- | ------- | ------------------------ |
| **Emails Received**     | ___     | [From customer]          |
| **Support Questions**   | ___     | [Topics]                 |
| **Issues Escalated**    | ___     | [To third-party support] |
| **Total Support Hours** | ___ hrs | [Mon-Fri only?]          |

**Support Efficiency:**

- Avg response time: ___ minutes (target: 60 min)
- Fastest response: ___ min
- Slowest response: ___ min
- % meeting SLA: __% (target: >90%)

### Communication Quality

**Email Tone & Clarity:**

- [Customer understood your explanations? YES / NO]
- [Did customer need follow-up clarification? YES / NO]
- [Any communication breakdown? YES / NO]

**Area to Improve:**  
[Description of what could be clearer next time]

### Operational Challenges

List operational issues that weren't technical:

1. [Example: "Had to wake up at 3 AM for customer timezone"]
   - Impact: [Burnout risk]
   - Solution for Week 2: [Hire support? Schedule async responses?]

2. [Example: "Spent 2 hours troubleshooting what turned out to be user confusion"]
   - Impact: [Documentation gap]
   - Solution for Week 2: [Add FAQ? Improve onboarding copy?]

3. ...

---

## Technical Debt Assessment (5 min)

### Known Issues (Non-Critical)

Log issues that don't block customers but should fix:

| Issue                                       | Severity | Impact   | Fix Effort | Defer To |
| ------------------------------------------- | -------- | -------- | ---------- | -------- |
| [Example: Report PDF styling off in Safari] | Low      | Cosmetic | 2 hours    | Phase 3  |
| [Example: Loading spinner not smooth]       | Low      | UX       | 1 hour     | Phase 2  |
| ...                                         |          |          |            |          |

### Code Quality Observations

- [ ] Any TypeScript errors encountered?
- [ ] Any console warnings in production?
- [ ] Any linting issues missed by pre-commit?
- [ ] Any database query performance issues?

**Documentation:**  
[Add to docs/TECHNICAL_DEBT.md]

---

## Key Learnings (10 min)

### What We Got Right

**About Product:**

- [Learning 1: What did customers love?]
- [Learning 2: What feature was most valuable?]
- [Learning 3: What workflow felt natural?]

**About Operations:**

- [Learning 1: What operational process worked smoothly?]
- [Learning 2: What tool/system was helpful?]
- [Learning 3: What communication style resonated?]

**About Engineering:**

- [Learning 1: What infrastructure decision paid off?]
- [Learning 2: What optimization was worthwhile?]
- [Learning 3: What safeguard caught an issue?]

### What We Should Improve

**Before Customer #2:**

1. [Change 1: Fix/improve this]
   - Why: [Customer feedback / technical issue / operational need]
   - Effort: [1-3 days]
   - Owner: [Lalit / Engineer / Support person]
   - Deadline: [Before customer #2 onboarding]

2. [Change 2]
   - Why: [...]
   - Effort: [...]
   - Owner: [...]
   - Deadline: [...]

3. ...

---

## Go/No-Go Decision for Week 2 (5 min)

### Are We Ready for Customer #2?

**Scoring (All must be ✅ to proceed):**

- [ ] ✅ Customer #1 satisfaction >4/5
  - Actual: ___ / 5
  - Status: PASS / CONCERN

- [ ] ✅ Platform uptime >99%
  - Actual: ___% uptime
  - Status: PASS / CONCERN

- [ ] ✅ Support load manageable (<2 hours/day)
  - Actual: ___ hours/day
  - Status: PASS / CONCERN

- [ ] ✅ No critical technical issues
  - Issues count: ___
  - Status: PASS / CONCERN

- [ ] ✅ Onboarding process repeatable
  - Evidence: [Customer completed journey successfully]
  - Status: PASS / CONCERN

### Go/No-Go Decision

**Recommendation:**  
☑️ **GO** — Ready to onboard customer #2 this week  
OR  
☐ **HOLD** — Fix [specific issues] first, then restart

**Rationale:**  
[2-3 sentences explaining your decision]

**If HOLD, what needs to fix?**

1. [Issue 1]
   - Fix plan: [What to do]
   - Timeline: [How long]
   - Owner: [Who]

---

## Week 2-4 Action Items

Based on Week 1 learnings:

### Week 2 (Customer #2 Onboarding)

**Before Customer #2 Arrives:**

- [ ] [Action 1: Fix/implement based on feedback]
  - Owner: [Lalit / Team]
  - Deadline: [Monday]

- [ ] [Action 2]
  - Owner: [...]
  - Deadline: [...]

### Week 3 (Iterate & Validate)

**If Customer #2 has similar friction:**

- [ ] [Action 1]
  - Owner: [...]
  - Deadline: [...]

### Weeks 3-4 (Scale)

**Feature Requests to Prioritize:**

1. [Top 1: Based on customer request counts]
   - Customers requesting: [1, 2, ...] (≥2 = Tier 1)
   - Effort: [1-2 days]
   - Value: [High / Medium / Low]

2. [Top 2]
   - Customers requesting: [...]
   - Effort: [...]
   - Value: [...]

---

## Metrics Summary for Records

**Save this for historical comparison:**

```
Week 1 Final Stats
==================
Date Completed: 2026-07-21
Customer #1 Satisfaction: ___ / 5
Uptime: ___%
Support Hours: ___ hrs
Platform Performance: ✅
Critical Incidents: ___
Go/No-Go Decision: ✅ GO / ❌ HOLD
Next Customer Onboarding: [Date]
```

---

## Appendix: Raw Data (Optional)

**Attach or reference:**

- [ ] Vercel deployment logs (Week 1 summary)
- [ ] Supabase performance metrics
- [ ] GitHub Actions workflow runs
- [ ] Customer email transcript (if useful)
- [ ] Browser console errors (if any)

---

## Sign-Off

**Retrospective Completed By:** [Name]  
**Date Completed:** [Date]  
**Next Review Date:** Friday, Week 2 end-of-day  
**Status:** ✅ READY FOR WEEK 2 / ⚠️ NEEDS ATTENTION

---

## Next Steps

1. [ ] File this retrospective in `docs/retrospectives/WEEK-1.md`
2. [ ] Update PHASE-2-ROADMAP.md with findings
3. [ ] Update FOUNDER_BRIEF.md with status
4. [ ] Plan changes for Week 2 based on learnings
5. [ ] Prepare welcome email for Customer #2

**Ready for Week 2? Let's ship it.** 🚀
