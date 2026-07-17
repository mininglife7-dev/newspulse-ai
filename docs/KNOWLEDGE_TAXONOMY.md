# Knowledge Taxonomy & Audience Guide

**Authority**: Governor Ω  
**Purpose**: Define how knowledge is organized, who should read what, and how to navigate the knowledge system  
**Last Updated**: 2026-07-16

---

## Knowledge Domains & Audiences

### 1. Governance Knowledge (Authority: Founder + Governor Ω)

**Location**: `docs/governance/`

**What it covers**:

- Authority and decision-making protocols
- Institutional constitutions
- Decision log with rationale and impact
- Reporting standards and communication protocols
- Standards and frameworks (engineering, testing, documentation)

**Who should read it**:

- **Founder**: Complete reading required (weekly review of new decisions, decision log)
- **Governor Ω**: Daily reference (decision protocol, boundaries, reporting requirements)
- **Engineering leads**: Standards section (ENGINEERING_STANDARDS.md, INTEGRATION_TEST_STANDARD.md)
- **Team members**: Only relevant standards for their domain

**Key documents**:

- `FOUNDER_ADVISOR_CONSTITUTION.md` — Governor Ω mandate and authority
- `FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md` — Autonomous decision framework
- `AGENTS.md` — Governor Ω identity, capabilities, boundaries
- `GOVERNOR_OPERATIONAL_FRAMEWORK.md` — Decision protocol (Class A/B/C/D)
- `DECISION_LOG.md` — Permanent record of architectural decisions
- `ENGINEERING_STANDARDS.md` — Code quality, testing, patterns
- `REPORTING_STANDARDS.md` — How Governor Ω communicates status

---

### 2. Operational Knowledge (Authority: Governor Ω)

**Location**: `docs/operations/`

**What it covers**:

- Runbooks: Step-by-step procedures for critical operations (deployment, incident response, database ops)
- Checklists: Pre/post-action verification and quality gates
- Procedures: Detailed how-tos for common tasks (git workflow, testing, release verification)

**Who should read it**:

- **On-call engineer**: Before touching production (runbooks + checklists)
- **Deployer**: Deployment runbook + pre-deployment checklist
- **New team members**: Complete reading during onboarding
- **Incident responder**: Incident response runbook + postmortem checklist
- **Operations team**: Database operations, monitoring procedures

**Subdirectories**:

- `RUNBOOKS/` — End-to-end procedures (deployment, incident response, database ops, release verification, customer onboarding)
- `CHECKLISTS/` — Verification and quality gates (pre-deployment, post-deployment, incident postmortem, weekly ops review, monthly compliance audit)
- `PROCEDURES/` — Detailed how-tos (git workflow, testing procedures, verification steps)
- `INDEX.md` — Navigation and quick reference

**Document Format**:

```
# [Operation Name] Runbook/Checklist

**Audience**: [who needs this]
**Prerequisites**: [what must be true before starting]
**Time estimate**: [how long this takes]
**Owner**: [who maintains this document]

## Quick Reference
[1-2 sentence summary]

## Step-by-Step Procedure
1. Step one
2. Step two
...

## Error Handling
- If X happens, do Y
- If Z happens, do W

## Verification
- [ ] Check 1
- [ ] Check 2

## Rollback (if applicable)
1. Rollback step 1
2. Rollback step 2
```

---

### 3. Engineering Knowledge (Authority: Governor Ω + Engineering Team)

**Location**: `docs/engineering/`

**What it covers**:

- System architecture and design decisions
- API endpoint reference (contracts, status codes, examples)
- Database schema with access patterns
- Code patterns with examples (routes, libraries, React components, testing)
- Infrastructure and deployment pipeline

**Who should read it**:

- **New engineer**: Complete reading during onboarding (architecture.md first, then patterns)
- **Code reviewer**: API_REFERENCE.md, patterns for review guidelines
- **Backend engineer**: API_REFERENCE.md, DATABASE_SCHEMA.md, patterns/library patterns
- **Frontend engineer**: Patterns (React, route contracts), API_REFERENCE.md
- **DevOps/Infrastructure**: Infrastructure section (deployment, CI/CD)

**Subdirectories**:

- `ARCHITECTURE.md` — System overview, component interactions, data flow
- `API_REFERENCE.md` — All endpoints, status codes, request/response examples
- `DATABASE_SCHEMA.md` — Tables, relationships, RLS policies, access patterns
- `PATTERNS/` — Reusable code patterns with examples
  - `ROUTE_PATTERNS.md` — API route structure, error handling patterns
  - `LIBRARY_PATTERNS.md` — Domain logic organization, module boundaries
  - `TESTING_PATTERNS.md` — Testing strategies, test fixtures, coverage targets
  - `REACT_PATTERNS.md` — Component patterns (server vs client), hooks, state management
  - `SECURITY_PATTERNS.md` — RLS enforcement, input validation, auth patterns

**Document Format**:

```
# [Pattern/Reference Name]

**Audience**: [engineers needing this]
**Related**: [links to related documents]
**Last Updated**: [date]

## Overview
[What this is and why it matters]

## Pattern Structure
[The standard pattern/structure]

## Example
[Real code example from the codebase]

## Common Variations
[Variations and when to use each]

## Testing Strategy
[How to test this pattern]

## Related Patterns
[Links to similar patterns]
```

---

### 4. Learning Knowledge (Authority: Governor Ω)

**Location**: `docs/lessons/`

**What it covers**:

- Lessons from each institutional stage (STAGE 0-3, then ongoing)
- Decision retrospectives: why decisions worked or failed
- What worked well and what was harder than expected
- Patterns observed and future improvements identified

**Who should read it**:

- **Governor Ω**: Before starting new phases (learn from what happened before)
- **Founder**: Periodic review of institutional learning
- **New team members**: Understand how the team learns and improves
- **Project reviewers**: Evidence of continuous improvement

**Documents**:

- `STAGE_1_LESSONS.md` — Governance kernel learnings
- `STAGE_2_LESSONS.md` — Repository organization learnings
- `STAGE_3_LESSONS.md` — Engineering standards enforcement learnings
- `STAGE_4_LESSONS.md` — Knowledge architecture learnings
- `LEARNING_LOG.md` — Running learning log (updated after each phase)
- `DECISION_RETROSPECTIVES.md` — Why major decisions succeeded or failed

**Document Format**:

```
# [Stage] Lessons Learned

**Stage**: [which stage]
**Date**: [completion date]
**Duration**: [how long it took]

## What Went Well
- [specific thing we did right]
- [observable positive outcome]
- [lesson: what this teaches us]

## What Was Harder Than Expected
- [what we underestimated]
- [why it was harder]
- [lesson: how to handle this better next time]

## What We'd Do Differently
- [specific improvement for next time]
- [why this would be better]

## Patterns Observed
- [cross-stage pattern noticed]
- [when to apply it]

## Future Improvements Identified
- [specific improvement suggestion]
- [priority: high/medium/low]
- [depends on: other improvements or stages]
```

---

### 5. Customer Knowledge (Authority: Governor Ω + Operations)

**Location**: `docs/customer/`

**What it covers**:

- Customer onboarding procedures
- Support playbooks and escalation paths
- Feature documentation and usage guides
- Success metrics and health indicators

**Who should read it**:

- **Customer success team**: Onboarding, support procedures
- **Support engineer**: Playbooks, troubleshooting guides
- **Founder**: Customer success metrics, feature requests
- **New team members**: Understanding what customers need

**Documents**:

- `ONBOARDING.md` — Step-by-step customer setup
- `SUPPORT_PROCEDURES.md` — How to help customers
- `SUCCESS_METRICS.md` — How to measure customer health
- `FEATURE_GUIDE.md` — Feature documentation for customers

---

## Knowledge Ownership Model

**Governance Knowledge**: Governor Ω (owns constitutions, decision log, reporting standards) + Founder (validates accuracy)

**Operational Knowledge**: On-call engineers (own procedures they use), Operations lead (owns ops index)

**Engineering Knowledge**: Lead engineer (owns architecture, API reference) + Domain leads (own their patterns)

**Learning Knowledge**: Governor Ω (owns learning capture process) + Team (contributes lessons)

**Customer Knowledge**: Customer success lead (owns onboarding, support) + Engineering (owns feature documentation)

### Ownership Responsibilities

1. **Keep it current**: Document changes within 1 week of implementation
2. **Review quarterly**: Ensure procedures still match reality
3. **Update on request**: When team members find gaps, fix within 48 hours
4. **Archive obsolete**: Move replaced procedures to docs/archive/deprecated/

---

## Versioning Strategy

### Version Control

- All documents live in git; history shows evolution over time
- No manual versioning needed — git is the version control

### Deprecation

- When a procedure changes, update the document in place (don't create v1, v2)
- If a procedure is completely replaced, move it to `docs/archive/deprecated/` with a note pointing to the replacement
- Never delete — always archive with pointer to successor

### Status Labels

Each document header should include:

- **Status**: Active / Deprecated / Draft / Archived
- **Last Updated**: YYYY-MM-DD
- **Owner**: Name/email of person maintaining it
- **Review Schedule**: When it should be reviewed (e.g., "quarterly" or "after each deployment")

---

## Navigation & Discovery

### Entry Points by Role

**I'm a new engineer**:

1. Start with `docs/engineering/ARCHITECTURE.md`
2. Read `docs/engineering/PATTERNS/` for your domain
3. Read `docs/governance/ENGINEERING_STANDARDS.md`
4. Skim `docs/operations/INDEX.md` to know what's available

**I'm deploying to production**:

1. Read `docs/operations/RUNBOOKS/DEPLOYMENT.md`
2. Complete `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`
3. After deployment, complete `docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md`

**I'm responding to an incident**:

1. Read `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`
2. After resolution, complete `docs/operations/CHECKLISTS/INCIDENT_POSTMORTEM.md`
3. Record lessons in `docs/lessons/LEARNING_LOG.md`

**I'm a Founder reviewing institutional health**:

1. Read latest entry in `docs/governor/PROJECT_STATE.md`
2. Review new decisions in `docs/governance/DECISION_LOG.md`
3. Check lessons in `docs/lessons/LEARNING_LOG.md`

### Cross-References

All documents should link to related knowledge:

- Standards documents → examples in PATTERNS/
- Runbooks → related procedures
- API_REFERENCE.md → database schema, patterns
- Decision Log → impact on architecture, operations

---

## Knowledge Update Checklist

When implementing a new feature or fixing a bug:

- [ ] Does this change the API? Update `docs/engineering/API_REFERENCE.md`
- [ ] Does this change the database? Update `docs/engineering/DATABASE_SCHEMA.md`
- [ ] Does this introduce a new pattern? Document in `docs/engineering/PATTERNS/`
- [ ] Does this affect operations? Update `docs/operations/` procedures
- [ ] Does this affect a governance boundary? Update `docs/governance/` or decision log
- [ ] What did we learn? Add to `docs/lessons/LEARNING_LOG.md`

---

## Authority & Maintenance

**Governor Ω** owns the knowledge system structure and ensures it stays current.  
**Founder** reviews governance and learning knowledge quarterly.  
**Team** contributes to their domain knowledge (operations, engineering, customer).

**Update frequency**:

- Governance: After each decision (Governor Ω)
- Operational: After each major change or quarterly review
- Engineering: After each pattern change or quarterly review
- Learning: After each phase completion or incident
- Customer: After each feature release or customer feedback

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.1)  
**Date**: 2026-07-16  
**Next**: Create template documents and INDEX files
