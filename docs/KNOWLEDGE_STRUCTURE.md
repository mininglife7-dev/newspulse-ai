# Knowledge Architecture Index

**STAGE 4: Knowledge System Foundation**  
**Date**: 2026-07-17  
**Status**: Phase 4.1 Complete

---

## Knowledge Organization

EURO AI operates as a learning institution. Knowledge is organized by audience, type, and use case rather than by creation date or author.

### Domains

```
docs/
├── governance/              # Authority and decisions
│   ├── FOUNDER_ADVISOR_CONSTITUTION.md      # Founder-Governor relationship
│   ├── FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md
│   ├── GOVERNOR_CONSTITUTION.md             # Governor Ω mandate
│   ├── DECISION_REGISTER.md                 # All architectural decisions (DR-xxxx)
│   ├── FOUNDER_BRIEF.md                     # Rolling status for Founder
│   └── STAGE_*_ROADMAP.md                   # Each stage's objectives
│
├── operations/              # How to run the system
│   ├── INDEX.md                             # Navigation guide
│   ├── RUNBOOKS/
│   │   ├── DEPLOYMENT.md                    # Push → Production
│   │   ├── INCIDENT_RESPONSE.md             # Alert → Resolution
│   │   ├── DATABASE_OPERATIONS.md           # Migrations, backups, recovery
│   │   └── CUSTOMER_ONBOARDING.md           # Workspace setup
│   ├── CHECKLISTS/
│   │   ├── PRE_DEPLOYMENT.md                # Verify before push
│   │   ├── POST_DEPLOYMENT.md               # Verify after deploy
│   │   ├── INCIDENT_POSTMORTEM.md           # Incident analysis template
│   │   ├── WEEKLY_REVIEW.md                 # Operational health check
│   │   └── MONTHLY_COMPLIANCE.md            # Compliance audit
│   └── PROCEDURES/
│       ├── GIT_WORKFLOW.md                  # Branch strategy, commits, PRs
│       ├── TESTING_PROCEDURES.md            # Running and writing tests
│       └── MONITORING.md                    # Observability and alerts
│
├── engineering/             # How to build and maintain
│   ├── INDEX.md                             # Engineering knowledge map
│   ├── ARCHITECTURE.md                      # System design, components, data flow
│   ├── DATABASE_SCHEMA.md                   # All tables, relationships, RLS policies
│   ├── API_REFERENCE.md                     # All endpoints, status codes, examples
│   └── PATTERNS/
│       ├── ROUTE_PATTERNS.md                # Next.js API route structure
│       ├── LIBRARY_PATTERNS.md              # Domain logic organization
│       ├── REACT_PATTERNS.md                # Component patterns, server/client
│       ├── TESTING_PATTERNS.md              # Unit, integration, E2E strategies
│       └── SECURITY_PATTERNS.md             # Auth, validation, rate limiting
│
├── lessons/                 # What we've learned
│   ├── STAGE_0_LESSONS.md                   # Pre-launch learnings
│   ├── STAGE_1_LESSONS.md                   # Governance stage insights
│   ├── STAGE_2_LESSONS.md                   # Organization stage insights
│   ├── STAGE_3_LESSONS.md                   # Standards stage insights
│   ├── LEARNING_LOG.md                      # Ongoing learning captured
│   └── DECISION_RETROSPECTIVES.md           # Why decisions worked/failed
│
├── customer/                # How customers use us
│   ├── ONBOARDING.md                        # First-time setup guide
│   ├── FEATURES.md                          # Feature overview and usage
│   ├── SUPPORT_PROCEDURES.md                # How to help customers
│   ├── SUCCESS_METRICS.md                   # Measuring customer value
│   └── FAQ.md                               # Common questions and answers
│
└── archive/                 # Historical reference
    ├── checkpoints/                         # Snapshots at key milestones
    ├── phases/                              # Old phase documentation
    ├── deprecated/                          # Superseded decisions
    └── history/                             # Historical decisions and rationale
```

---

## Audience Guides

### For the Founder (Lalit)

**What to read first**:

1. `docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md` — How Governor Ω works
2. `docs/governance/FOUNDER_BRIEF.md` — Current status and decisions pending
3. `docs/governance/DECISION_REGISTER.md` — Every architectural decision with rationale

**When you need to decide**:

- What should we build next? → Phase roadmaps (STAGE_*_ROADMAP.md)
- Why was decision X made? → DECISION_REGISTER.md (look for DR-xxxx)
- What's the risk landscape? → `docs/governor/risks/RISK_REGISTER.md`

**To understand the system**:

- Architecture overview → `docs/engineering/ARCHITECTURE.md`
- Database design → `docs/engineering/DATABASE_SCHEMA.md`
- What we've learned → `docs/lessons/STAGE_*_LESSONS.md`

### For Engineers

**Onboarding (first time)**:

1. `docs/engineering/ARCHITECTURE.md` — How the system is organized
2. `docs/engineering/DATABASE_SCHEMA.md` — Data model and relationships
3. `docs/engineering/PATTERNS/*.md` — How we build things
4. `docs/governance/ENGINEERING_STANDARDS.md` — Code standards and conventions

**When implementing a feature**:

1. Check `docs/engineering/API_REFERENCE.md` for related endpoints
2. Review `docs/engineering/PATTERNS/ROUTE_PATTERNS.md` for structure
3. Run `docs/operations/PROCEDURES/TESTING_PROCEDURES.md`

**When debugging**:

1. Check incident playbooks → `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`
2. Review logs and monitoring → `docs/operations/PROCEDURES/MONITORING.md`
3. Trace decision context → `docs/governance/DECISION_REGISTER.md`

### For Operations

**Daily responsibilities**:

- Review `docs/operations/CHECKLISTS/WEEKLY_REVIEW.md`
- Follow runbooks in `docs/operations/RUNBOOKS/`
- Update monitoring dashboards per `docs/operations/PROCEDURES/MONITORING.md`

**When deploying**:

1. Run `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`
2. Execute `docs/operations/RUNBOOKS/DEPLOYMENT.md`
3. Verify `docs/operations/CHECKLISTS/POST_DEPLOYMENT.md`

**When incident occurs**:

1. Follow `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`
2. Document via `docs/operations/CHECKLISTS/INCIDENT_POSTMORTEM.md`
3. Update learnings in `docs/lessons/LEARNING_LOG.md`

### For Customer Success

**Onboarding customers**:

- Follow `docs/customer/ONBOARDING.md` step-by-step
- Use templates in `docs/customer/SUCCESS_METRICS.md`

**When customers ask questions**:

- Check `docs/customer/FAQ.md` first
- If not covered, use `docs/customer/FEATURES.md`
- Complex issues → `docs/customer/SUPPORT_PROCEDURES.md`

---

## Document Types

### Reference Documents

- **API_REFERENCE.md** — Auto-generated from code, all endpoints with examples
- **DATABASE_SCHEMA.md** — All tables, columns, relationships, RLS policies
- **ARCHITECTURE.md** — Component diagrams, data flow, deployment topology

### Runbooks (How-To)

- **Format**: Step-by-step numbered procedures
- **Audience**: Operations, developers
- **Examples**: DEPLOYMENT.md, INCIDENT_RESPONSE.md, DATABASE_OPERATIONS.md

### Checklists (Verification)

- **Format**: Checkbox items, before/after verification
- **Audience**: Everyone
- **Examples**: PRE_DEPLOYMENT.md, POST_DEPLOYMENT.md, MONTHLY_COMPLIANCE.md

### Decision Documents

- **Format**: Decision ID (DR-xxxx), Context, Decision, Rationale, Consequences
- **Storage**: `docs/governance/DECISION_REGISTER.md`
- **Example**: DR-0001 — Use Supabase for Auth

### Patterns & Standards

- **Format**: Problem → Solution → Code example → When to use
- **Storage**: `docs/engineering/PATTERNS/*.md` and `docs/governance/ENGINEERING_STANDARDS.md`
- **Examples**: ROUTE_PATTERNS.md, SECURITY_PATTERNS.md

### Lessons Learned

- **Format**: Stage context → What happened → What we learned → What's next
- **Storage**: `docs/lessons/STAGE_*_LESSONS.md` and LEARNING_LOG.md
- **Updated**: After each stage completes and continuously during work

---

## Maintenance & Ownership

### Update Responsibility

| Domain                | Owner            | Frequency                                    |
| --------------------- | ---------------- | -------------------------------------------- |
| governance/           | Governor Ω       | After decisions; reviewed each session       |
| operations/RUNBOOKS   | Ops team         | After procedure changes                      |
| operations/CHECKLISTS | Ops team         | Before each deployment                       |
| engineering/          | Lead Engineer    | After architecture changes                   |
| lessons/              | Governor Ω       | After each stage; continuously logged        |
| customer/             | Customer Success | After feature releases; continuously updated |

### Versioning

- **Major changes**: Note in document header with date and reason
- **For archived**: Move to `docs/archive/deprecated/` with deprecation notice
- **For decisions**: Use DECISION_REGISTER.md version history (append, never delete)

---

## Knowledge Discovery

### By Role

- See **Audience Guides** section above for quick links by role

### By Topic

- Use document names and INDEX.md files in each domain
- Example: Looking for auth patterns? → `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`

### By Decision

- All decisions in `docs/governance/DECISION_REGISTER.md` with decision IDs
- Example: "Why Supabase?" → Find DR-xxxx in register

### By Stage

- Each stage documented in roadmaps and lessons
- Example: "What did we learn in STAGE 3?" → `docs/lessons/STAGE_3_LESSONS.md`

---

## Templates

All new documents should follow appropriate templates:

- **Runbook template**: See `docs/operations/RUNBOOKS/DEPLOYMENT.md`
- **Checklist template**: See `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`
- **Pattern template**: See any file in `docs/engineering/PATTERNS/`
- **Lesson template**: See `docs/lessons/STAGE_1_LESSONS.md`

---

## STAGE 4 Progress

### Phase 4.1: Knowledge Structure Setup ✅ COMPLETE

- ✅ Directory structure created
- ✅ Knowledge taxonomy documented (this file)
- ✅ Audience guides defined
- ✅ Document types and templates referenced
- ✅ Ownership model established

### Phase 4.2: Operational Knowledge (Next)

- Runbooks for deployment, incidents, database, customer onboarding
- Checklists for pre/post deployment, incidents, weekly/monthly reviews
- Procedures for git workflow, testing, monitoring

### Phase 4.3: Engineering Knowledge

- Complete architecture documentation
- Database schema with RLS policies
- API reference with all endpoints
- Pattern guides for routes, libraries, components, testing, security

### Phase 4.4: Learning & Lessons

- Capture insights from STAGE 0-3
- Document decision retrospectives
- Maintain ongoing learning log

### Phase 4.5: Knowledge Navigation

- Master index and glossary
- Decision trace system
- Learning connections map

---

**Generated by Governor Ω**  
**STAGE 4 Phase 4.1 Foundation**
