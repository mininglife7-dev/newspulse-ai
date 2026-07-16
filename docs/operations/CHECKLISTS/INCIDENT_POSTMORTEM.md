# Incident Postmortem Checklist

**Type**: Checklist  
**Audience**: On-Call Engineers, Incident Commander, Engineering Team  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After every production incident  
**Owner**: Governor Ω

---

## Purpose

Complete thorough analysis of production incidents to understand what happened, why it happened, and what will prevent it from happening again. This is not blame-focused but learning-focused.

**When to use**: Within 24 hours of incident resolution

**Participants**: 
- Technical Lead (who investigated)
- Incident Commander (who managed response)
- Code Author (if caused by recent change)
- Product/Operations (for business impact)

**Time estimate**: 1-2 hours for team discussion + 1 hour for documentation

---

## Incident Context

### Basic Information

- [ ] **Incident ID**: `INC-YYYY-MM-DD-NNN` (auto-generated)
  - Format: Year-Month-Day-Sequence
  - Example: `INC-2026-07-16-001`

- [ ] **Incident Name**
  - Brief title, 5-10 words
  - Example: "Auth service returning 500 errors"
  - Example: "Database connection pool exhaustion"

- [ ] **Date & Time**
  - Start time: `[UTC time]` (when first detected)
  - End time: `[UTC time]` (when resolved)
  - Duration: `[minutes/hours]`
  - On-call engineer: `[name]`

- [ ] **Severity Level** (circle one)
  - 🔴 Critical (customers blocked from core features)
  - 🟠 High (features slow or frequent errors)
  - 🟡 Medium (partial feature degradation or single customer affected)
  - 🟢 Low (minor feature issue, no customer impact)

- [ ] **Affected Customers**
  - All customers: `[ ] Yes  [ ] No`
  - If no, how many: `[number]`
  - Specific workspaces: `[list]`
  - Specific features: `[list]`

- [ ] **Scope of Impact**
  - Revenue impact: `[dollars or N/A]`
  - SLA breach: `[ ] Yes  [ ] No`
  - Data loss: `[ ] Yes  [ ] No`
  - Security exposure: `[ ] Yes  [ ] No`

---

## Timeline

Create a detailed timeline of the incident (fill from incident response notes):

### Detection Phase

- [ ] **Detection method**: How did we first learn about the incident?
  - `[ ]` Monitoring alert (which alert?)
  - `[ ]` Customer report (how? Slack? Email? Support?)
  - `[ ]` Team member observation (which team member?)
  - `[ ]` Other: `[description]`

- [ ] **Detection timestamp**: `[exact time]`

- [ ] **Detection to alert time**: `[minutes]`
  - How long between actual problem start and our awareness?
  - Could monitoring be improved to detect sooner?

### Investigation Phase

Document the investigation timeline (use actual times):

| Time | Action | Findings |
|------|--------|----------|
| 14:23 UTC | Checked health endpoint | Response time 5s |
| 14:25 UTC | Reviewed error logs | 1000+ 500 errors/min |
| 14:27 UTC | Checked database | High connection count, 250 active |
| 14:30 UTC | Reviewed deployments | Deployment 30 min prior |
| ... | ... | ... |

### Resolution Phase

- [ ] **Root cause identified at**: `[time]`
- [ ] **Resolution started at**: `[time]`
- [ ] **Resolution completed at**: `[time]`
- [ ] **Customer-visible recovery at**: `[time]` (when service seemed normal again)

### Total Duration Breakdown

- Detection to action: `[minutes]` (How long before we started working?)
- Investigation time: `[minutes]` (How long to find root cause?)
- Resolution time: `[minutes]` (How long to fix?)
- Verification time: `[minutes]` (How long to confirm fixed?)

---

## Root Cause Analysis

### What Happened

Describe the incident in neutral, factual terms:

**Customer Experience**: What did customers see or experience?
```
[Describe what customers experienced]
```

**System Behavior**: What did systems do wrong?
```
[Describe system behavior that was incorrect]
```

**Scope**: Which components/features affected?
```
[List affected components]
```

### Why It Happened

Root cause analysis (use 5 Whys technique):

**Why 1**: Why did the system fail?
```
[Answer]
```

**Why 2**: Why did that condition exist?
```
[Answer]
```

**Why 3**: Why wasn't it detected/prevented?
```
[Answer]
```

**Why 4**: Why did our procedures not catch it?
```
[Answer]
```

**Root Cause** (most fundamental reason):
```
[One or two sentences explaining the root cause]
```

### Contributing Factors

- [ ] **Recent deployment**: Code change introduced bug
- [ ] **Configuration issue**: Wrong settings in production
- [ ] **Infrastructure issue**: Platform (Vercel, Supabase) problem
- [ ] **Load/traffic**: Unusual spike exposed weakness
- [ ] **Data issue**: Unexpected data state caused problem
- [ ] **Process failure**: Procedure not followed correctly
- [ ] **Other**: `[description]`

---

## What Worked Well

What did we do right? What should we repeat?

- [ ] **Rapid detection**
  - Our monitoring caught it quickly
  - Or: Team member noticed and reported quickly
  - Action: Keep doing this

- [ ] **Clear communication**
  - Team responded quickly to incident channel
  - Status updates were timely and clear
  - Action: Maintain communication discipline

- [ ] **Quick decision-making**
  - Team decided on rollback/fix strategy quickly
  - No long debates about what to do
  - Action: Continue using decision framework

- [ ] **Effective teamwork**
  - Clear roles (IC, Tech Lead, Communications)
  - People worked well together
  - Action: Use same team for future incidents

- [ ] **Other**
  - `[What went well?]`
  - Action: `[How to repeat?]`

---

## What Could Be Better

What should we improve? What would prevent this next time?

### Immediate Improvements (Can do within 1 week)

- [ ] **Monitoring improvement**
  - Current: `[What we monitored]`
  - Problem: `[Why it wasn't caught earlier]`
  - Fix: `[Specific monitoring alert to add]`
  - Action owner: `[Who will implement]`
  - Timeline: `[By when]`

- [ ] **Alert improvement**
  - Current: `[What alert we have]`
  - Problem: `[Why it was too slow/unclear]`
  - Fix: `[Change to alert]`
  - Action owner: `[Who]`
  - Timeline: `[By when]`

- [ ] **Testing improvement**
  - Current: `[Test coverage gaps]`
  - Problem: `[Why test didn't catch it]`
  - Fix: `[New test case to add]`
  - Action owner: `[Who]`
  - Timeline: `[By when]`

- [ ] **Documentation improvement**
  - Current: `[What runbook/procedure exists]`
  - Problem: `[Why it wasn't followed/clear]`
  - Fix: `[Update to documentation]`
  - Action owner: `[Who]`
  - Timeline: `[By when]`

- [ ] **Other quick improvements**
  - `[Improvement]`
  - Action owner: `[Who]`
  - Timeline: `[By when]`

### Longer-Term Improvements (Will take weeks/months)

- [ ] **Architecture improvement**
  - Problem: `[Design weakness that allowed this]`
  - Solution: `[Architectural change]`
  - Effort: `[Estimate: hours/days/weeks]`
  - Priority: `[High/Medium/Low]`
  - Tracked in: `[GitHub issue or decision log]`

- [ ] **Automation improvement**
  - Problem: `[Manual process that failed]`
  - Solution: `[Automate this]`
  - Effort: `[Estimate]`
  - Priority: `[Priority]`
  - Tracked in: `[GitHub issue]`

- [ ] **Training improvement**
  - Problem: `[Team gap that caused this]`
  - Solution: `[Training or documentation]`
  - Target audience: `[Who needs training]`
  - Timeline: `[When]`

---

## Lessons Learned

What principle or pattern did we learn that applies beyond this incident?

**Lesson 1**:
```
If [condition], then [consequence].
Therefore: [What we should do to prevent similar issues]
```

**Lesson 2**:
```
[Another lesson]
Therefore: [Action]
```

**Lesson 3**:
```
[Another lesson]
Therefore: [Action]
```

---

## Action Items

Summary of what will happen next:

| Action | Owner | Target Date | Priority | Tracked In |
|--------|-------|-------------|----------|-----------|
| Add monitoring alert for connection pool | [Name] | 2026-07-17 | Critical | GH #123 |
| Update DATABASE_OPERATIONS.md runbook | [Name] | 2026-07-18 | High | GH #124 |
| Add test for connection pool exhaustion | [Name] | 2026-07-18 | High | GH #125 |
| Review RLS policies for similar gaps | [Name] | 2026-07-20 | Medium | GH #126 |

---

## Communication

- [ ] **Internal Slack post**
  - Posted to: `[Slack channel]`
  - Message included: What happened, why, what we'll do
  - Timestamp: `[when posted]`

- [ ] **Customer notification** (if needed)
  - [ ] No notification needed (internal issue, no customer impact)
  - [ ] Notification sent to: `[customer(s)]`
  - [ ] Communication method: `[Email/Support/Blog/Other]`
  - [ ] Message included: What happened, how it was fixed, what we'll do
  - [ ] Timestamp: `[when sent]`

- [ ] **Documentation updated**
  - [ ] LEARNING_LOG.md: Added lesson captured
  - [ ] Relevant runbook: Updated if procedure needs improvement
  - [ ] DECISION_LOG.md: Added if decision made about this

---

## Sign-Off

Incident is officially documented when all participants have reviewed and confirmed:

- [ ] **Technical Lead reviewed**: Confirms root cause analysis accurate
  - Name: `[name]`
  - Date: `[date]`
  - Signature: Acknowledged ✓

- [ ] **Incident Commander reviewed**: Confirms response appropriate
  - Name: `[name]`
  - Date: `[date]`
  - Signature: Acknowledged ✓

- [ ] **Engineering Lead reviewed**: Confirms action items appropriate
  - Name: `[name]`
  - Date: `[date]`
  - Signature: Acknowledged ✓

---

## File Organization

Save postmortem as: `docs/archive/incidents/INC-YYYY-MM-DD-NNN.md`

Example: `docs/archive/incidents/INC-2026-07-16-001.md`

---

## Related Documents

- `RUNBOOKS/INCIDENT_RESPONSE.md` — How to respond to incidents (this is post-response analysis)
- `docs/lessons/LEARNING_LOG.md` — Where lessons are captured for future reference
- `docs/governance/DECISION_LOG.md` — If decisions made about system changes

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
