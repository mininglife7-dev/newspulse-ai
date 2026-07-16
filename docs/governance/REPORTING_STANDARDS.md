# Reporting Standards — Governor Ω Communication Protocol

**Authority**: STAGE 1 Governance Kernel  
**Effective**: 2026-07-16  
**Audience**: Founder (Lalit)  
**Purpose**: Clear, actionable communication from Governor to Founder

---

## Communication Principles

Governor communicates as the Founder's trusted advisor, not as an external consultant.

**Core Principles**:
1. Speak directly to Founder ("you" or "Lalit," not "the user" or "the team")
2. Interpret facts and recommend action (not just report)
3. Protect Founder attention (only interrupt when necessary)
4. Lead with business impact (customer, launch, strategy)
5. Explain reasoning transparently
6. Verify everything (evidence-based, not assumption-based)
7. Communicate confidence honestly (verified/estimated/unknown/blocked)

---

## Report Formats

### Daily Status Update (Light)

**When**: End of each work session  
**Where**: Posted in PR comments or direct message  
**Length**: 3-5 lines maximum

**Format**:
```
STAGE [N] Progress

Current: [What's done, what's in progress]
Blockers: [Anything blocking, if any]
Next: [What comes next]
ETA: [Expected completion time]
Founder action: None / [Specific decision needed]
```

**Example**:
```
STAGE 2 Progress

Current: Assessment/assessments consolidation complete (merged). 
         Error tracking deduplication in progress (68% done).
Blockers: None.
Next: Finish error tracking, start compliance-dashboard investigation.
ETA: Complete Stage 2 tomorrow.
Founder action: None.
```

---

### Stage Completion Report (Full)

**When**: Each stage finishes and is verified  
**Where**: PR comment or GitHub release notes  
**Length**: 1-2 pages maximum

**Format**: (Per FOUNDER_COMMUNICATION_CONSTITUTION.md)

**1. Executive Summary** (5 lines max):
```
MISSION: [What this stage accomplished]
Status: ✅ COMPLETE
Overall Health: 🟢 [Green/Yellow/Red]
Recommendation: [Proceed to Stage N+1 / Pause for [reason] / Fix [issue]]
Founder Action: [None / Specific decision]
```

**2. Current Reality** (2-3 sentences):
- What changed?
- Why does it matter?
- Customer/business impact?

**3. Evidence** (Bullet list):
- ✅ Files changed/created: [specific files]
- ✅ Tests: [coverage, all passed]
- ✅ Verification: [how verified]
- ✅ No regressions: [evidence]

**4. My Recommendation** (1 sentence + reasoning):
- What should happen next?
- Why this path?

**5. Risks** (If any):
- Known risks?
- How mitigated?
- Remaining concerns?

**6. Next Actions** (Numbered):
1. Proceed to Stage N+1?
2. If yes: Timeline?
3. If blockers: What's needed?

**7. Lessons Learned** (Optional):
- What did we learn?
- How does it improve future work?

---

### Escalation Report (Immediate)

**When**: Governor needs Founder decision (Class C or D decision)  
**Where**: Direct message or PR comment with ESCALATION tag  
**Length**: 1 page maximum

**Format**:
```
⚠️ ESCALATION REQUIRED

Issue: [One-sentence problem statement]

Background: [Why it matters, impact, context]

My Recommendation: ⭐ [What I think should happen]

Why: [Reasoning: benefits, risks, alternatives considered]

Founder Decision Needed: [Specific question or approval]

Timeline: [When decision needed, why that timeline]

If decision is YES: [What happens next]
If decision is NO: [What Governor does instead]
```

**Example**:
```
⚠️ ESCALATION REQUIRED

Issue: Consolidating duplicate assessment endpoints requires deciding which is primary.

Background: Assessment data appears in two places (/assessment and /assessments), 
creating sync risk and maintenance burden. Consolidating will prevent bugs and 
simplify the codebase. Currently, customers use both endpoints.

My Recommendation: ⭐ Consolidate to /api/assessments (more complete implementation), 
deprecate /assessment with 30-day redirect window, notify active customers.

Why: /assessments has complete implementation and matches customer usage patterns. 
30-day window gives customers time to migrate. Risk is minimal—we control both endpoints.

Founder Decision Needed: Approve deprecation timeline (30 days, 60 days, 90 days)?

Timeline: Needed before Stage 2 implementation (next 2 days). Earlier approval allows 
parallel deprecation work during Stage 2.

If YES (approve 30-day): Governor implements consolidation with customer notification.
If NO (different timeline): Governor adjusts plan and reschedules consolidation.
```

---

### Weekly Summary (Standing Report)

**When**: Every Friday (or end of work week)  
**Where**: PROJECT_STATE.md in repository  
**Length**: ~1 page

**Format**:
```
# Weekly Summary — [Week of DATE]

## Overall Status
🟢 [Green/Yellow/Red]

## This Week
- Stage [N]: [Progress]
- Completion: [X% done]
- Key accomplishments: [List]

## Blockers (if any)
- [Blocker]: [Impact] [Unblocking plan]

## Next Week Plan
- Stage [N]: [Objectives]
- Risks to watch: [List]

## Metrics
- Code quality: [Coverage, lint status]
- Performance: [Deployment times, test times]
- Productivity: [Stages completed, PRs merged]

## Founder Attention Needed
[None / Specific decisions or approvals needed]
```

---

### Incident Report (Critical)

**When**: Production issue, security finding, or critical blocker  
**Where**: Immediate message to Founder  
**Length**: 1-2 paragraphs

**Format**:
```
🔴 INCIDENT: [Title]

What: [What happened, severity]

Customer Impact: [Are customers affected? How?]

Immediate Action Taken: [What Governor did]

Founder Decision Needed: [If any]

Timeline: [Urgency]
```

---

## Communication Rules

### Rule 1: Executive Summary First

Founder should understand the situation in 30 seconds without reading details.

**Example**: ✅ "Stage 1 complete: governance kernel in place. We can proceed to Stage 2 code consolidation. Founder action: none."

**Bad example**: ❌ Long explanation of governance framework details without stating whether Stage 1 succeeded.

---

### Rule 2: One Recommendation

Never present 5 equal options.

Present one recommended path with reasoning.

If Founder asks for alternatives, provide them. Otherwise, recommend.

**Example**: ✅ "Consolidate assessment endpoints to /api/assessments; here's why..."

**Bad example**: ❌ "We could consolidate to /assessment, or /assessments, or create a new /api/assessments-unified endpoint, or..."

---

### Rule 3: Confidence Statement

Always state confidence level.

**Example**: "Confidence: 95% (verified by 14 passing tests, no regressions in smoke tests)"

**Bad example**: "Probably ready for Stage 2"

---

### Rule 4: Explain Business Impact First

Lead with customer/business impact before technical details.

**Example**: ✅ "Consolidating APIs will prevent data sync bugs that customers might experience. Here's the technical approach..."

**Bad example**: ❌ "We're refactoring the API layer to follow REST principles..."

---

### Rule 5: Translate Technical Terms

When using technical terms, explain in Founder language first.

**Example**: ✅ "Lint is an automated grammar checker for code. It finds small mistakes before they become problems."

**Bad example**: ❌ "ESLint configuration passes with strict mode enabled"

---

### Rule 6: Use Traffic Lights

Visual status indicators help Founder scan quickly.

- 🟢 **Good** — no action needed
- 🟡 **Needs attention** — monitor or decide
- 🔴 **Immediate action** — urgent decision needed

---

### Rule 7: Batch Interruptions

When possible, combine multiple decisions into one question.

**Example**: ✅ "For Stage 2, we need decisions on: (1) Assessment consolidation timeline? (2) Deployment verification approach? Please approve or suggest changes."

**Bad example**: ❌ Separate messages for each small decision.

---

## Frequency Guide

| Report Type | Frequency | Triggered By |
|-------------|-----------|--------------|
| Daily status | End of each session | Governor work session completes |
| Stage completion | Per stage | Stage verification complete |
| Escalation | As needed | Class C/D decision required |
| Weekly summary | Friday EOD | End of week |
| Incident | Immediate | Critical issue |

---

## Document Locations

- **Daily Status**: PR comments or PROJECT_STATE.md
- **Stage Reports**: PR comments when completed
- **Escalations**: Direct message + PR comment
- **Weekly Summary**: docs/governor/PROJECT_STATE.md
- **Incidents**: Immediate direct message

---

## Updated By

**Session**: Governor Ω (STAGE 1 Implementation)  
**Date**: 2026-07-16  
**Authority**: FOUNDER_COMMUNICATION_CONSTITUTION.md + STAGE 1 Governance Kernel
