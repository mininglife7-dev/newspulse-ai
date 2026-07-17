# Governance Knowledge Index

**Purpose**: Central reference for all governance, decision authority, and institutional knowledge  
**Audience**: Founders, technical leaders, decision-makers  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-16

---

## Quick Navigation

### I Need to Know...

| Question                                | Document                                       | Category      |
| --------------------------------------- | ---------------------------------------------- | ------------- |
| **Who decides X?**                      | `DECISION_REGISTER.md`                         | Authority     |
| **What's Governor Ω's mandate?**        | `FOUNDER_ADVISOR_CONSTITUTION.md`              | Mandate       |
| **When do I escalate?**                 | `GOVERNOR_OPERATIONAL_FRAMEWORK.md`            | Escalation    |
| **What can the agent do autonomously?** | `FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md` | Autonomy      |
| **How does Governor communicate?**      | `FOUNDER_COMMUNICATION_CONSTITUTION.md`        | Communication |
| **What lessons did we learn?**          | `lessons/LEARNING_LOG.md`                      | Learning      |
| **How should code be written?**         | `ENGINEERING_STANDARDS.md`                     | Standards     |
| **How should tests be written?**        | `INTEGRATION_TEST_STANDARD.md`                 | Standards     |

---

## By Category

### Governance & Authority

#### Foundational Documents

- **`FOUNDER_ADVISOR_CONSTITUTION.md`** — Governor Ω as strategic advisor (2.2 KB)
  - Founder-governor relationship
  - When governor advises, when founder decides
  - Communication expectations

- **`FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md`** — Governor Ω as autonomous engineer (3.6 KB)
  - Engineering autonomy boundaries
  - When governor makes decisions independently
  - Interruption conditions (money, strategy, legal, customer)

- **`FOUNDER_COMMUNICATION_CONSTITUTION.md`** — How Governor communicates (3.5 KB)
  - Communication standards
  - Report format and cadence
  - Information hierarchy

#### Authority & Decisions

- **`DECISION_REGISTER.md`** — Log of all architectural decisions (40 KB)
  - Every major decision documented
  - Decision rationale and trade-offs
  - Decision authority (who decided)
  - Active use: consult when ambiguous

- **`GOVERNOR_OPERATIONAL_FRAMEWORK.md`** — Decision boundaries (8.3 KB)
  - Decision types and authority
  - Escalation paths
  - Judgment rules

- **`DECISION_LOG.md`** — Historical decision log (14 KB)
  - Archive of past decisions
  - Decision context and outcomes
  - Used for pattern analysis

#### Governance Framework

- **`AGENTS.md`** — Governor Ω role definition (8.2 KB)
  - Core responsibilities
  - Capabilities and limitations
  - Interface with founder

### Standards & Policy

#### Code Quality

- **`ENGINEERING_STANDARDS.md`** — Code and testing standards (13 KB)
  - Code style, structure, patterns
  - Testing requirements
  - Documentation expectations
  - Security principles

- **`INTEGRATION_TEST_STANDARD.md`** — Integration test requirements (13 KB)
  - Test organization
  - Database setup
  - RLS testing
  - Coverage targets

#### Operations & Compliance

- **`PRODUCTION-CERTIFICATION-POLICY.md`** — Production readiness (14 KB)
  - Verification checklist
  - Security sign-off
  - Deployment eligibility

- **`DATA_RETENTION_DELETION_POLICY.md`** — Data lifecycle policy (18 KB)
  - Retention periods
  - Deletion procedures
  - Compliance requirements

### Institutional Learning

#### Stage Lessons (What We Learned)

- **`lessons/LEARNING_LOG.md`** — Synthesis of all lessons (13 KB)
  - Top 10 institutional lessons
  - By-stage summary
  - Cross-stage patterns
  - Lessons for different roles
  - Metrics for success
  - Decision framework

- **`lessons/STAGE_1_LESSONS.md`** — Governance consolidation (10 KB)
  - Authority hierarchy lessons
  - Governance debt accumulation
  - Dual mandate balance

- **`lessons/STAGE_2_LESSONS.md`** — Knowledge architecture (12 KB)
  - Documentation design lessons
  - Taxonomy and accessibility
  - Ownership patterns

- **`lessons/STAGE_3_LESSONS.md`** — Operational procedures (12 KB)
  - Procedure verification
  - Decision making under pressure
  - Operational decay prevention

- **`lessons/INDEX.md`** — Lessons navigation (5 KB)
  - Quick reference by audience
  - Recommended reading paths
  - Key patterns to remember

### Implementation & Planning

- **`IMPLEMENTATION_ROADMAP.md`** — 10-stage institutional build (11 KB)
  - All stages defined
  - Deliverables per stage
  - Verification criteria
  - Dependencies and sequencing

- **`STAGE_2_ROADMAP.md`** — Knowledge architecture detail (10 KB)
  - Knowledge taxonomy
  - 5 knowledge domains
  - Implementation strategy

### Operations & Reporting

- **`REPORTING_STANDARDS.md`** — Governor reporting format (8.6 KB)
  - Status report structure
  - Work tracking
  - Risk communication

- **`MONITORING_AUTOMATION_PLAN.md`** — Observability framework (12 KB)
  - Health checks
  - Alert criteria
  - Automation rules

---

## By Audience

### For Founders

**Start here**: `DECISION_REGISTER.md` (understand who decides what)

Then read in order:

1. `FOUNDER_ADVISOR_CONSTITUTION.md` (governor's advisory role)
2. `FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md` (when governor is autonomous)
3. `lessons/LEARNING_LOG.md` (key insights for founders)
4. `GOVERNOR_OPERATIONAL_FRAMEWORK.md` (when to escalate to you)

**Key Documents**:

- `DECISION_REGISTER.md` — consult when ambiguous on authority
- `lessons/STAGE_1_LESSONS.md` — governance insights

---

### For Technical Leaders

**Start here**: `ENGINEERING_STANDARDS.md` (code and testing standards)

Then read:

1. `INTEGRATION_TEST_STANDARD.md` (test requirements)
2. `DECISION_REGISTER.md` (who decides architecture questions)
3. `lessons/LEARNING_LOG.md` (lessons for architects)

**Key Documents**:

- `ENGINEERING_STANDARDS.md` — enforced in code review
- `DECISION_REGISTER.md` — reference for design decisions
- `lessons/STAGE_2_LESSONS.md` — knowledge organization patterns

---

### For Operations / SRE

**Start here**: `PRODUCTION-CERTIFICATION-POLICY.md` (readiness criteria)

Then read:

1. `GOVERNOR_OPERATIONAL_FRAMEWORK.md` (escalation paths)
2. `MONITORING_AUTOMATION_PLAN.md` (observability)
3. `DATA_RETENTION_DELETION_POLICY.md` (compliance)

**Key Documents**:

- `PRODUCTION-CERTIFICATION-POLICY.md` — deployment checklist
- `MONITORING_AUTOMATION_PLAN.md` — alert configuration
- `lessons/STAGE_3_LESSONS.md` — operational procedure patterns

---

### For New Team Members

**Start here**: `lessons/LEARNING_LOG.md` (top 10 lessons, quick overview)

Then read:

1. `FOUNDER_ADVISOR_CONSTITUTION.md` (understand governance)
2. `ENGINEERING_STANDARDS.md` (code standards)
3. `DECISION_REGISTER.md` (understand authority)

**Role-Specific**:

- **Backend Engineer**: Add `INTEGRATION_TEST_STANDARD.md`
- **Frontend Engineer**: Add `ENGINEERING_STANDARDS.md` (patterns section)
- **DevOps/SRE**: Add `MONITORING_AUTOMATION_PLAN.md`

---

## Related Knowledge

### Operational Knowledge

- `docs/operations/INDEX.md` — Runbooks, checklists, procedures
- `docs/operations/RUNBOOKS/` — Step-by-step procedures
- `docs/operations/PROCEDURES/` — Detailed how-tos

### Engineering Knowledge

- `docs/engineering/INDEX.md` — Architecture, API reference, patterns
- `docs/engineering/ARCHITECTURE.md` — System design
- `docs/engineering/PATTERNS/` — Code organization patterns

### Customer Knowledge

- `docs/customer/` — Customer-facing documentation (if exists)

---

## Key Documents: Must-Read

| Document                           | When             | Why                       |
| ---------------------------------- | ---------------- | ------------------------- |
| DECISION_REGISTER.md               | Making decisions | Know who decides and why  |
| ENGINEERING_STANDARDS.md           | Writing code     | Know what's expected      |
| lessons/LEARNING_LOG.md            | Starting work    | Learn from our experience |
| INTEGRATION_TEST_STANDARD.md       | Writing tests    | Meet test requirements    |
| PRODUCTION-CERTIFICATION-POLICY.md | Deploying        | Verify readiness          |

---

## Document Status

| Document                                     | Owner      | Status      | Last Updated |
| -------------------------------------------- | ---------- | ----------- | ------------ |
| FOUNDER_ADVISOR_CONSTITUTION.md              | Governor Ω | 🟢 Current  | STAGE 1      |
| FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md | Governor Ω | 🟢 Current  | STAGE 1      |
| FOUNDER_COMMUNICATION_CONSTITUTION.md        | Governor Ω | 🟢 Current  | STAGE 1      |
| DECISION_REGISTER.md                         | Governor Ω | 🟢 Current  | Ongoing      |
| GOVERNOR_OPERATIONAL_FRAMEWORK.md            | Governor Ω | 🟢 Current  | STAGE 1      |
| AGENTS.md                                    | Governor Ω | 🟢 Current  | STAGE 1      |
| ENGINEERING_STANDARDS.md                     | Governor Ω | 🟢 Current  | STAGE 2      |
| INTEGRATION_TEST_STANDARD.md                 | Governor Ω | 🟢 Current  | STAGE 3      |
| PRODUCTION-CERTIFICATION-POLICY.md           | Governor Ω | 🟢 Current  | STAGE 3      |
| DATA_RETENTION_DELETION_POLICY.md            | Governor Ω | 🟢 Current  | STAGE 1      |
| REPORTING_STANDARDS.md                       | Governor Ω | 🟢 Current  | STAGE 1      |
| MONITORING_AUTOMATION_PLAN.md                | Governor Ω | 🟢 Current  | STAGE 1      |
| lessons/LEARNING_LOG.md                      | Governor Ω | 🟢 Complete | STAGE 4      |
| lessons/STAGE_1_LESSONS.md                   | Governor Ω | 🟢 Complete | STAGE 4      |
| lessons/STAGE_2_LESSONS.md                   | Governor Ω | 🟢 Complete | STAGE 4      |
| lessons/STAGE_3_LESSONS.md                   | Governor Ω | 🟢 Complete | STAGE 4      |
| lessons/INDEX.md                             | Governor Ω | 🟢 Complete | STAGE 4      |

---

## Knowledge Maintenance

### Monthly Review

- Verify decision authority matrix is current
- Check if any governance updates are needed
- Review lessons for new patterns

### Quarterly Audit

- Verify all documents are current
- Check for stale decisions
- Update standards if needed

### Immediate Updates

- If governance changes, update DECISION_REGISTER immediately
- If standards change, update ENGINEERING_STANDARDS immediately
- Post-mortems feed back to lessons

---

## Search by Topic

### Authority & Decision-Making

- `DECISION_REGISTER.md` — All decisions and authority
- `GOVERNOR_OPERATIONAL_FRAMEWORK.md` — Escalation rules
- `lessons/STAGE_1_LESSONS.md` — Authority patterns

### Code Quality & Standards

- `ENGINEERING_STANDARDS.md` — Style, structure, testing
- `INTEGRATION_TEST_STANDARD.md` — Test requirements
- `lessons/STAGE_2_LESSONS.md` — Documentation standards

### Operations & Reliability

- `PRODUCTION-CERTIFICATION-POLICY.md` — Readiness criteria
- `MONITORING_AUTOMATION_PLAN.md` — Observability
- `lessons/STAGE_3_LESSONS.md` — Operational patterns

### Governance & Structure

- `FOUNDER_ADVISOR_CONSTITUTION.md` — Advisory relationship
- `FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md` — Autonomy bounds
- `AGENTS.md` — Governor role definition

### Learning & Improvement

- `lessons/LEARNING_LOG.md` — Top 10 lessons
- `lessons/STAGE_1_LESSONS.md` — Governance lessons
- `lessons/STAGE_2_LESSONS.md` — Knowledge lessons
- `lessons/STAGE_3_LESSONS.md` — Operational lessons

---

**Updated By**: Governor Ω  
**Session**: STAGE 4 Phase 4.4 (Learning & Lessons)  
**Status**: Complete  
**Next Review**: Quarterly governance audit
