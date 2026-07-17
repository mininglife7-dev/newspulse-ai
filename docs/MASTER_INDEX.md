# EURO AI Master Knowledge Index

**Purpose**: Complete navigation guide for all EURO AI institutional knowledge  
**Audience**: All team members (Founder, engineers, operations, customer success)  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-17

---

## START HERE BY ROLE

### I'm the Founder (Lalit)

**Your Dashboard**: `docs/governance/FOUNDER_BRIEF.md` — Rolling status on current phase, decisions pending, blockers.

**Key Reads**:

1. `docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md` — My mandate and how I operate
2. `docs/governance/DECISION_REGISTER.md` — Every decision made (DR-xxxx) with rationale
3. `docs/governance/STAGE_*_ROADMAP.md` — What's next and why
4. `docs/lessons/STAGE_*_LESSONS.md` — What we've learned

**When You Need To**:

- **Understand the system**: `docs/engineering/ARCHITECTURE.md`
- **Know the current risks**: `docs/governor/risks/RISK_REGISTER.md`
- **Review a decision**: Find DR-xxxx in `docs/governance/DECISION_REGISTER.md`
- **Understand a lesson**: Read `docs/lessons/STAGE_*_LESSONS.md`
- **Plan next phase**: Check `docs/governance/STAGE_*_ROADMAP.md` for objectives

### I'm an Engineer

**Your Onboarding Path**:

1. `docs/engineering/ARCHITECTURE.md` — System overview (30 min)
2. `docs/engineering/DATABASE_SCHEMA.md` — Data model and RLS (20 min)
3. `docs/engineering/PATTERNS/ROUTE_PATTERNS.md` — How we build APIs (20 min)
4. `docs/engineering/PATTERNS/SECURITY_PATTERNS.md` — Security requirements (20 min)

**When Implementing**:

- Check `docs/engineering/API_REFERENCE.md` — does my endpoint exist?
- Review `docs/engineering/PATTERNS/*.md` — which pattern applies?
- Run `docs/operations/PROCEDURES/TESTING_PROCEDURES.md` — testing strategy
- Complete `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md` before pushing

**When Debugging**:

1. `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md` — incident playbook
2. `docs/operations/PROCEDURES/VERIFICATION_STEPS.md` — verification checklist
3. `docs/lessons/LEARNING_LOG.md` — lessons from similar issues
4. `docs/governance/DECISION_REGISTER.md` — understand design decisions

### I'm in Operations / On-Call

**Your Dashboard**: `docs/operations/INDEX.md` — Quick access to all operational procedures.

**Critical Reads**:

- Before deployment: `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`
- During deployment: `docs/operations/RUNBOOKS/DEPLOYMENT.md`
- After deployment: `docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md`
- On-call shift: `docs/operations/PROCEDURES/ON_CALL_PROCEDURES.md`
- Incident occurs: `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`

**Weekly/Monthly**:

- Every Friday: `docs/operations/CHECKLISTS/WEEKLY_OPS_REVIEW.md`
- First Monday: `docs/operations/CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md`

### I'm in Customer Success

**Your Guide**: `docs/customer/ONBOARDING.md` — Step-by-step customer setup.

**When Customers Ask**:

1. Check `docs/customer/FAQ.md` first
2. Use `docs/customer/FEATURES.md` for feature questions
3. Follow `docs/customer/SUPPORT_PROCEDURES.md` for complex issues
4. Track success with `docs/customer/SUCCESS_METRICS.md`

---

## COMPLETE KNOWLEDGE MAP

### Governance (Authority & Decisions)

**Purpose**: How decisions are made, who has authority, what we've decided

| Document                                                  | Purpose                              | Audience            |
| --------------------------------------------------------- | ------------------------------------ | ------------------- |
| `governance/FOUNDER_ADVISOR_CONSTITUTION.md`              | Governor Ω mandate                   | Founder, Governor Ω |
| `governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md` | Autonomous execution rules           | Engineer leads      |
| `governance/GOVERNOR_CONSTITUTION.md`                     | Governor role and authority          | Governor Ω, Founder |
| `governance/DECISION_REGISTER.md`                         | All decisions (DR-xxxx)              | Everyone            |
| `governance/FOUNDER_BRIEF.md`                             | Current status and pending decisions | Founder             |
| `governance/ENGINEERING_STANDARDS.md`                     | Code quality, testing, patterns      | Engineers           |
| `governance/INTEGRATION_TEST_STANDARD.md`                 | Integration test requirements        | QA, Engineers       |
| `STAGE_*_ROADMAP.md`                                      | Phase objectives                     | All                 |

### Operational Knowledge (How to Run)

**Purpose**: Procedures, checklists, and playbooks for running the system

| Document                                                | Purpose                  | When to Use                |
| ------------------------------------------------------- | ------------------------ | -------------------------- |
| `operations/RUNBOOKS/DEPLOYMENT.md`                     | Deploy to production     | Before every deployment    |
| `operations/RUNBOOKS/INCIDENT_RESPONSE.md`              | Handle incidents         | When incident occurs       |
| `operations/RUNBOOKS/DATABASE_OPERATIONS.md`            | Database administration  | Schema changes, backups    |
| `operations/RUNBOOKS/CUSTOMER_ONBOARDING.md`            | Set up new customers     | New customer signup        |
| `operations/RUNBOOKS/MONITORING_AND_ALERTING.md`        | Monitor system health    | Daily operations           |
| `operations/RUNBOOKS/RELEASE_VERIFICATION.md`           | Verify releases          | After each release         |
| `operations/RUNBOOKS/SECURITY_OPERATIONS.md`            | Security procedures      | Security reviews, audits   |
| `operations/CHECKLISTS/PRE_DEPLOYMENT.md`               | Verify before push       | Before every deployment    |
| `operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` | Verify after deploy      | After every deployment     |
| `operations/CHECKLISTS/INCIDENT_POSTMORTEM.md`          | Document incidents       | After incident resolved    |
| `operations/CHECKLISTS/WEEKLY_OPS_REVIEW.md`            | Health check             | Every Friday               |
| `operations/CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md`     | Compliance review        | First Monday of month      |
| `operations/PROCEDURES/GIT_WORKFLOW.md`                 | Git conventions          | When working with branches |
| `operations/PROCEDURES/TESTING_PROCEDURES.md`           | Run tests locally & CI   | When implementing features |
| `operations/PROCEDURES/VERIFICATION_STEPS.md`           | Verify across dimensions | After implementation       |
| `operations/PROCEDURES/ROLLBACK.md`                     | Recover from errors      | Production emergency       |
| `operations/PROCEDURES/ON_CALL_PROCEDURES.md`           | On-call rotation         | On-call preparation        |

### Engineering Knowledge (How to Build)

**Purpose**: Architecture, APIs, database, and code patterns

| Document                                    | Purpose                              | Audience                  |
| ------------------------------------------- | ------------------------------------ | ------------------------- |
| `engineering/ARCHITECTURE.md`               | System design, components, data flow | New engineers, architects |
| `engineering/DATABASE_SCHEMA.md`            | Tables, RLS, relationships           | Backend, DBAs             |
| `engineering/API_REFERENCE.md`              | All endpoints, request/response      | Backend, frontend         |
| `engineering/PATTERNS/ROUTE_PATTERNS.md`    | API route structure                  | Backend engineers         |
| `engineering/PATTERNS/LIBRARY_PATTERNS.md`  | Domain logic organization            | Backend engineers         |
| `engineering/PATTERNS/TESTING_PATTERNS.md`  | Unit, integration, E2E               | All engineers             |
| `engineering/PATTERNS/REACT_PATTERNS.md`    | Component patterns                   | Frontend engineers        |
| `engineering/PATTERNS/SECURITY_PATTERNS.md` | Auth, validation, RLS                | All engineers             |

### Lessons & Learning (What We've Learned)

**Purpose**: Institutional memory and continuous learning

| Document                             | Purpose                     | Content                                |
| ------------------------------------ | --------------------------- | -------------------------------------- |
| `lessons/STAGE_0_LESSONS.md`         | Pre-launch insights         | Foundation learning                    |
| `lessons/STAGE_1_LESSONS.md`         | Governance stage            | Authority and decision-making          |
| `lessons/STAGE_2_LESSONS.md`         | GDPR compliance             | Compliance patterns and best practices |
| `lessons/STAGE_3_LESSONS.md`         | Standards stage             | Consistency and quality                |
| `lessons/LEARNING_LOG.md`            | Ongoing learning            | Captured during work                   |
| `lessons/DECISION_RETROSPECTIVES.md` | Why decisions worked/failed | Decision analysis                      |

### Customer Knowledge (How Customers Use Us)

**Purpose**: Customer-facing features and support

| Document                         | Purpose           | Audience         |
| -------------------------------- | ----------------- | ---------------- |
| `customer/ONBOARDING.md`         | First-time setup  | New customers    |
| `customer/FEATURES.md`           | Feature overview  | All customers    |
| `customer/SUPPORT_PROCEDURES.md` | Support playbooks | Support team     |
| `customer/SUCCESS_METRICS.md`    | Customer value    | Customer Success |
| `customer/FAQ.md`                | Common questions  | All customers    |

### Reference & Navigation (This Layer)

| Document                  | Purpose                                |
| ------------------------- | -------------------------------------- |
| `KNOWLEDGE_STRUCTURE.md`  | Knowledge architecture foundation      |
| `MASTER_INDEX.md`         | This file — complete navigation        |
| `GLOSSARY.md`             | Term definitions with cross-references |
| `DECISION_CONNECTIONS.md` | Map decisions to lessons and outcomes  |

---

## BY QUESTION

### Decision Questions

**"Why did we choose X?"** → `docs/governance/DECISION_REGISTER.md` (look for relevant DR-xxxx)

**"What did we learn from decision X?"** → `docs/lessons/DECISION_RETROSPECTIVES.md`

**Common decisions**:

- `DR-0001` — Use Supabase for auth
- `DR-0005` — Row Level Security for multi-tenancy
- `DR-0010` — Non-blocking audit logging
- `DR-0015` — Two-step confirmation for destructive ops

### Architecture Questions

**"How does the system work?"** → `docs/engineering/ARCHITECTURE.md`

**"What tables do we have?"** → `docs/engineering/DATABASE_SCHEMA.md`

**"What endpoints are available?"** → `docs/engineering/API_REFERENCE.md`

**"How do we build routes?"** → `docs/engineering/PATTERNS/ROUTE_PATTERNS.md`

**"How do we organize domain logic?"** → `docs/engineering/PATTERNS/LIBRARY_PATTERNS.md`

### Operations Questions

**"How do I deploy?"** → `docs/operations/RUNBOOKS/DEPLOYMENT.md`

**"What do I check before deploying?"** → `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`

**"What do I check after deploying?"** → `docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md`

**"An incident happened — what do I do?"** → `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`

**"How do I roll back?"** → `docs/operations/PROCEDURES/ROLLBACK.md`

**"I'm on call — how does it work?"** → `docs/operations/PROCEDURES/ON_CALL_PROCEDURES.md`

### Testing Questions

**"How do we test?"** → `docs/engineering/PATTERNS/TESTING_PATTERNS.md`

**"What tests do I need to write?"** → `docs/operations/PROCEDURES/TESTING_PROCEDURES.md`

**"What are the test coverage targets?"** → `docs/governance/INTEGRATION_TEST_STANDARD.md`

### Security Questions

**"What are the security requirements?"** → `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`

**"How do we handle authentication?"** → `docs/engineering/PATTERNS/SECURITY_PATTERNS.md` (Auth section)

**"How do we enforce access control?"** → `docs/engineering/PATTERNS/SECURITY_PATTERNS.md` (RLS section)

**"What validation do we need?"** → `docs/engineering/PATTERNS/SECURITY_PATTERNS.md` (Validation section)

### Compliance Questions

**"What GDPR requirements did we implement?"** → `docs/lessons/STAGE_2_LESSONS.md`

**"What compliance patterns do we use?"** → `docs/engineering/PATTERNS/SECURITY_PATTERNS.md` (Audit Logging section)

**"What's our compliance audit process?"** → `docs/operations/CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md`

### Learning Questions

**"What did we learn from Stage X?"** → `docs/lessons/STAGE_X_LESSONS.md`

**"What lessons have we captured?"** → `docs/lessons/LEARNING_LOG.md`

**"Has someone solved a similar problem?"** → Search `docs/lessons/LEARNING_LOG.md` or `DECISION_RETROSPECTIVES.md`

---

## BY STAGE

### STAGE 0: Pre-Launch Foundation

- What happened: `docs/lessons/STAGE_0_LESSONS.md`
- Decisions made: `docs/governance/DECISION_REGISTER.md` (DR-0001-0010)
- Knowledge: Foundation layer of institutional memory

### STAGE 1: Governance

- What happened: `docs/lessons/STAGE_1_LESSONS.md`
- Authority: `docs/governance/GOVERNOR_CONSTITUTION.md`
- Decisions: `docs/governance/DECISION_REGISTER.md` (DR-0011-0050)

### STAGE 2: GDPR Compliance

- What happened: `docs/lessons/STAGE_2_LESSONS.md`
- Patterns: `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`
- Implementation: `app/` (consent, audit logging, data export, erasure, etc.)

### STAGE 3: Staging Infrastructure

- Status: In progress (Founder action required)
- Roadmap: `docs/governance/STAGE_3_ROADMAP.md`
- Blockers: Supabase staging project provisioning

### STAGE 4: Knowledge Architecture

- Phase 4.1: `docs/KNOWLEDGE_STRUCTURE.md` ✅
- Phase 4.2: `docs/operations/INDEX.md` ✅
- Phase 4.3: `docs/engineering/INDEX.md` ✅
- Phase 4.4: `docs/lessons/STAGE_2_LESSONS.md` (captured) ✅
- Phase 4.5: This file + DECISION_CONNECTIONS.md 🔄

---

## DOCUMENT HIERARCHY

### Tier 1: Constitutions (Immutable Authority)

- `governance/FOUNDER_ADVISOR_CONSTITUTION.md`
- `governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md`
- `governance/GOVERNOR_CONSTITUTION.md`

These establish who has authority and how decisions are made. Changes require Founder action.

### Tier 2: Decision Register (Traced & Versioned)

- `governance/DECISION_REGISTER.md`

All decisions logged with DR-xxxx IDs, rationale, and consequences. Append-only — decisions not deleted or hidden.

### Tier 3: Operational Runbooks & Checklists (Procedural)

- `operations/RUNBOOKS/*.md`
- `operations/CHECKLISTS/*.md`

How-to guides maintained by operations team. Updated when procedures change.

### Tier 4: Engineering Patterns & Standards (Best Practices)

- `engineering/PATTERNS/*.md`
- `governance/ENGINEERING_STANDARDS.md`

Code patterns and standards. Updated as practices evolve. Engineers follow these.

### Tier 5: Reference (Auto-Generated / Complete)

- `engineering/API_REFERENCE.md`
- `engineering/DATABASE_SCHEMA.md`

Keep in sync with implementation. Updated when APIs or schema change.

### Tier 6: Lessons & Retrospectives (Learning)

- `lessons/STAGE_*_LESSONS.md`
- `lessons/LEARNING_LOG.md`
- `lessons/DECISION_RETROSPECTIVES.md`

Institutional memory. Append-only. Updated after each stage or significant learning.

### Tier 7: Navigation (This Layer)

- `MASTER_INDEX.md` (this file)
- `KNOWLEDGE_STRUCTURE.md`
- `GLOSSARY.md`
- `DECISION_CONNECTIONS.md`

Help people find what they need. Updated as structure evolves.

---

## SEARCH STRATEGIES

### "I need to find X"

1. **If X is a decision**: Search `DECISION_REGISTER.md` for "DR-" or topic
2. **If X is a procedure**: Search `operations/INDEX.md` for the procedure
3. **If X is a pattern**: Search `engineering/INDEX.md` for the pattern
4. **If X is a term**: Look in `GLOSSARY.md`
5. **If X is a lesson**: Check relevant `STAGE_X_LESSONS.md`

### "I need to understand Y"

1. Start with role-specific path above (I'm a [role])
2. Read the recommended starting documents
3. Follow cross-references in those documents

### "I need to change Z"

1. Find the relevant Tier document
2. Check ownership (see below)
3. Follow the update process for that tier
4. Update related cross-references

---

## MAINTENANCE & UPDATES

### Who Maintains What

| Domain                                                   | Owner                 | Update Frequency               |
| -------------------------------------------------------- | --------------------- | ------------------------------ |
| Governance/                                              | Governor Ω            | After decisions, each session  |
| operations/RUNBOOKS                                      | Operations Lead       | After procedure changes        |
| operations/CHECKLISTS                                    | Operations Lead       | Before each deployment         |
| engineering/                                             | Lead Engineer         | After architecture changes     |
| lessons/                                                 | Governor Ω            | After each stage, continuously |
| customer/                                                | Customer Success Lead | After feature releases         |
| This layer (MASTER_INDEX, KNOWLEDGE_STRUCTURE, GLOSSARY) | Governor Ω            | As structure evolves           |

### Update Process by Tier

**Constitutions (Tier 1)**: Only Founder can change. Requires explicit decision. Update DECISION_REGISTER.

**Decision Register (Tier 2)**: Append decision with DR-xxxx ID after decision made. Never delete or modify past entries.

**Runbooks & Checklists (Tier 3)**: Update when procedure changes. Note change date and reason in header.

**Patterns & Standards (Tier 4)**: Add new pattern when established. Update existing when practice evolves. Mark deprecated patterns clearly.

**Reference (Tier 5)**: Keep in sync with code. Update when APIs or schema change. Note change date.

**Lessons (Tier 6)**: Append after significant learning or stage completion. Never delete. Can mark as superseded if approach changes.

**Navigation (Tier 7)**: Update as structure changes. Ensure all new documents are indexed.

---

## CROSS-REFERENCES & CONNECTIONS

Documents reference each other throughout. Key connections:

- **Decisions → Lessons**: See `DECISION_CONNECTIONS.md`
- **Stage Roadmap → Lessons**: `STAGE_X_ROADMAP.md` → `STAGE_X_LESSONS.md`
- **Patterns → Examples**: Pattern docs link to actual code examples
- **Procedures → Checklists**: Runbooks link to related checklists
- **All → Governance**: Code and operations follow standards in governance/

---

## GLOSSARY & TERMS

For term definitions, see `GLOSSARY.md`. Key terms include:

- **AI System**: Artificial intelligence application subject to EU AI Act
- **Assessment**: Structured evaluation of AI system compliance
- **Obligation**: Specific requirement from assessment
- **Evidence**: Documentation supporting compliance
- **Workspace**: Tenant in multi-tenant system
- **RLS**: Row Level Security for data isolation
- **Governor Ω**: Autonomous executive authority
- **Decision (DR-xxxx)**: Logged architectural decision

---

## GETTING STARTED

### First Time In This System?

1. Read your role section at the top of this document
2. Follow the recommended reading path for your role
3. Use cross-references to dive deeper
4. Refer back to `MASTER_INDEX.md` when you get lost

### First Time Implementing a Feature?

1. Check `docs/engineering/API_REFERENCE.md` — does it exist?
2. Review `docs/engineering/PATTERNS/ROUTE_PATTERNS.md` — which pattern?
3. Review relevant security patterns in `SECURITY_PATTERNS.md`
4. Complete pre-deployment checklist before push

### First Time Deploying?

1. Read `docs/operations/RUNBOOKS/DEPLOYMENT.md`
2. Complete `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`
3. Execute deployment
4. Complete `docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md`

### First Time On-Call?

1. Read `docs/operations/PROCEDURES/ON_CALL_PROCEDURES.md`
2. Know `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`
3. Know `docs/operations/PROCEDURES/ROLLBACK.md`
4. Have `docs/operations/INDEX.md` bookmarked

---

## RELATED DOCUMENTS

- `docs/KNOWLEDGE_STRUCTURE.md` — Knowledge architecture foundation
- `docs/GLOSSARY.md` — Term definitions
- `docs/DECISION_CONNECTIONS.md` — Map of decisions to lessons
- `docs/governor/risks/RISK_REGISTER.md` — Current risk landscape
- `docs/governor/lessons/LESSONS.md` — Executive baseline learning

---

## DOCUMENT STATUS

| Document                | Status         | Last Updated |
| ----------------------- | -------------- | ------------ |
| MASTER_INDEX.md         | 🟢 Complete    | 2026-07-17   |
| KNOWLEDGE_STRUCTURE.md  | 🟢 Complete    | 2026-07-17   |
| GLOSSARY.md             | 🟢 Complete    | 2026-07-16   |
| DECISION_CONNECTIONS.md | 🟡 In Progress | -            |

---

**Generated by**: Governor Ω  
**Phase**: STAGE 4 Phase 4.5 (Knowledge Navigation & Discovery)  
**Status**: Knowledge System Navigation Complete  
**Next**: Complete DECISION_CONNECTIONS.md for decision-to-lesson mapping
