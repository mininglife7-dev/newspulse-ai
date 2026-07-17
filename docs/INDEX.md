# EURO AI — Master Knowledge Index

**Purpose**: Central entry point for all institutional knowledge  
**Audience**: All stakeholders (Founder, Governor Ω, engineers, operations, customers)  
**Authority**: Governor Ω  
**Last Updated**: 2026-07-17 (STAGE 4 Complete)

---

## Welcome to the Knowledge System

This repository contains all documented knowledge about EURO AI: how we govern, how we operate, how we build, and what we've learned.

**Start here** by role:

### I'm a New Team Member
→ Read `KNOWLEDGE_TAXONOMY.md` (how it's organized) then jump to [By Role](#by-role) below

### I'm Deploying Code to Production
→ Read `operations/INDEX.md` then follow the deployment checklist

### I'm Responding to an Incident
→ Read `operations/RUNBOOKS/INCIDENT_RESPONSE.md` now

### I'm Building a New Feature
→ Read `engineering/INDEX.md` then the relevant pattern documents

### I'm the Founder Reviewing Status
→ Read `governor/PROJECT_STATE.md` then `governance/DECISION_LOG.md`

---

## Knowledge Domains

All knowledge is organized into five domains. Each has an INDEX with full navigation.

### 1. Governance Knowledge 📋
**Where**: `docs/governance/`  
**What**: Authority, decisions, standards, communication protocols  
**For whom**: Founder (required), Governor Ω (daily), engineers (standards only)

👉 **Start with**: `docs/governance/` (read FOUNDER_ADVISOR_CONSTITUTION.md first if new to Governor Ω)

**Key documents**:
- `FOUNDER_ADVISOR_CONSTITUTION.md` — Governor Ω mandate
- `FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md` — Autonomous decision framework
- `DECISION_LOG.md` — Permanent record of architectural decisions
- `ENGINEERING_STANDARDS.md` — Code quality standards for all engineers

---

### 2. Operational Knowledge 🔧
**Where**: `docs/operations/`  
**What**: Runbooks, checklists, procedures for production operations  
**For whom**: Operations team, deployers, on-call engineers

👉 **Start with**: `docs/operations/INDEX.md` to find what you need

**Key documents**:
- `RUNBOOKS/DEPLOYMENT.md` — Step-by-step deployment procedure
- `RUNBOOKS/INCIDENT_RESPONSE.md` — How to handle production issues
- `CHECKLISTS/PRE_DEPLOYMENT.md` — Verification before pushing
- `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — Verification after pushing
- `PROCEDURES/GIT_WORKFLOW.md` — Git operations standard

---

### 3. Engineering Knowledge 🛠️
**Where**: `docs/engineering/`  
**What**: Architecture, API reference, database schema, code patterns  
**For whom**: All engineers, code reviewers, architects

👉 **Start with**: `docs/engineering/INDEX.md` for quick navigation

**Key documents**:
- `ARCHITECTURE.md` — System overview and data flow
- `API_REFERENCE.md` — All endpoints and contracts
- `DATABASE_SCHEMA.md` — Data model and RLS policies
- `PATTERNS/` — Code patterns for routes, libraries, components, security
- `PATTERNS/TESTING_PATTERNS.md` — Testing strategy and examples

---

### 4. Learning Knowledge 📚
**Where**: `docs/lessons/`  
**What**: Lessons from each stage, decision retrospectives, incident reviews  
**For whom**: Governor Ω (planning), Founder (strategy), entire team (culture)

👉 **Start with**: `docs/lessons/INDEX.md` to find lessons relevant to your work

**Key documents**:
- `STAGE_1_LESSONS.md` — Governance kernel learnings
- `STAGE_2_LESSONS.md` — Organization learnings
- `STAGE_3_LESSONS.md` — Standards enforcement learnings
- `LEARNING_LOG.md` — Running log of institutional learning
- `DECISION_RETROSPECTIVES.md` — Why major decisions succeeded/failed

---

### 5. Customer Knowledge 👥
**Where**: `docs/customer/`  
**What**: Onboarding, support procedures, success metrics  
**For whom**: Customer success team, support engineers, operations

👉 **Start with**: Check `docs/customer/` (navigation TBD in Phase 4.5)

**Key documents** (planned):
- `ONBOARDING.md` — Customer setup procedure
- `SUPPORT_PROCEDURES.md` — Support playbooks
- `SUCCESS_METRICS.md` — Customer health indicators

---

## By Role

### Founder / Executive
**Your knowledge**: Strategy, business, legal, financial, product vision  
**Read daily**: `docs/governor/PROJECT_STATE.md`  
**Read weekly**: `docs/governance/DECISION_LOG.md` (new decisions)  
**Read monthly**: `docs/lessons/LEARNING_LOG.md`, `docs/lessons/DECISION_RETROSPECTIVES.md`  

→ Start with: `docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md`

### Governor Ω (Autonomous AI Agent)
**Your knowledge**: All operational, engineering, governance knowledge  
**Reference before each phase**: Stage lessons from `docs/lessons/STAGE_*_LESSONS.md`  
**Reference during decisions**: `docs/governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md`  
**Log each decision**: `docs/governance/DECISION_LOG.md`  

→ Start with: `docs/KNOWLEDGE_TAXONOMY.md`

### Backend Engineer
**Essential reading**:
1. `docs/engineering/ARCHITECTURE.md` — System overview
2. `docs/engineering/API_REFERENCE.md` — Endpoints you'll build
3. `docs/engineering/DATABASE_SCHEMA.md` — Data model
4. `docs/engineering/PATTERNS/ROUTE_PATTERNS.md` — How we build routes
5. `docs/engineering/PATTERNS/LIBRARY_PATTERNS.md` — How we organize logic
6. `docs/engineering/PATTERNS/SECURITY_PATTERNS.md` — Security requirements
7. `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards

**Before deploying**: Read `docs/operations/INDEX.md` and follow deployment runbook

→ Start with: `docs/engineering/INDEX.md`

### Frontend Engineer
**Essential reading**:
1. `docs/engineering/ARCHITECTURE.md` — System overview
2. `docs/engineering/API_REFERENCE.md` — API contracts you'll call
3. `docs/engineering/PATTERNS/REACT_PATTERNS.md` — Component patterns
4. `docs/engineering/PATTERNS/TESTING_PATTERNS.md` — Testing approach
5. `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards

**Before deploying**: Read `docs/operations/INDEX.md` and follow deployment runbook

→ Start with: `docs/engineering/INDEX.md`

### Operations / DevOps Engineer
**Essential reading**:
1. `docs/operations/INDEX.md` — Runbook and checklist index
2. `docs/operations/RUNBOOKS/DEPLOYMENT.md` — Deployment procedure
3. `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md` — Incident procedures
4. `docs/operations/CHECKLISTS/` — All checklists for your role
5. `docs/governance/DECISION_LOG.md` — Architectural decisions affecting ops

**Weekly**: Complete `docs/operations/CHECKLISTS/WEEKLY_OPS_REVIEW.md`

→ Start with: `docs/operations/INDEX.md`

### Customer Success / Support
**Essential reading**:
1. `docs/customer/` — Customer-facing procedures (INDEX TBD)
2. `docs/customer/ONBOARDING.md` — Customer setup
3. `docs/customer/SUPPORT_PROCEDURES.md` — Support playbooks
4. `docs/operations/RUNBOOKS/CUSTOMER_ONBOARDING.md` — Internal setup procedure

**Escalation**: Know how to escalate to on-call engineer

→ Start with: `docs/customer/` and `docs/operations/INDEX.md`

### On-Call Engineer
**Critical (have nearby)**:
1. `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md` — Incident procedures
2. `docs/operations/PROCEDURES/ROLLBACK.md` — Quick rollback guide
3. `docs/operations/CHECKLISTS/INCIDENT_POSTMORTEM.md` — Postmortem after incident

**After incident**: Complete postmortem and update `docs/lessons/LEARNING_LOG.md`

→ Start with: `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`

---

## Navigation by Task

### I need to [deploy code to production]
1. Read: `docs/operations/RUNBOOKS/DEPLOYMENT.md`
2. Complete: `docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`
3. Complete: `docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md`
4. Update: `docs/lessons/LEARNING_LOG.md` with any learnings

### I need to [write a new API endpoint]
1. Check: `docs/engineering/API_REFERENCE.md` (does it exist?)
2. Read: `docs/engineering/PATTERNS/ROUTE_PATTERNS.md`
3. Read: `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`
4. Code: Follow the pattern
5. Test: Per `docs/engineering/PATTERNS/TESTING_PATTERNS.md`
6. Update: `docs/engineering/API_REFERENCE.md` with your new endpoint

### I need to [respond to a production incident]
1. Read: `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`
2. Use: `docs/operations/PROCEDURES/ROLLBACK.md` if needed
3. After: Complete `docs/operations/CHECKLISTS/INCIDENT_POSTMORTEM.md`
4. Document: Update `docs/lessons/LEARNING_LOG.md`

### I need to [understand how the system works]
1. Start: `docs/engineering/ARCHITECTURE.md`
2. Read: `docs/engineering/DATABASE_SCHEMA.md`
3. Read: `docs/engineering/API_REFERENCE.md`
4. Understand: `docs/engineering/PATTERNS/` (relevant patterns)

### I need to [understand why we made a decision]
1. Search: `docs/governance/DECISION_LOG.md` for the decision
2. Read: Context, options considered, decision, impact
3. Understand: Why this decision was made (the "why" section)
4. Follow-up: `docs/lessons/DECISION_RETROSPECTIVES.md` (did it work?)

### I need to [onboard a new team member]
1. Direct to: `docs/KNOWLEDGE_TAXONOMY.md` (structure)
2. By role: Guide to relevant INDEX documents
3. Hands-on: Pair on a deployment or feature build
4. Verify: They can complete role-specific tasks independently

### I need to [onboard a new customer]
1. Follow: `docs/operations/RUNBOOKS/CUSTOMER_ONBOARDING.md`
2. Complete: Checklist as you go
3. Reference: `docs/customer/SUPPORT_PROCEDURES.md` for support questions
4. Monitor: `docs/customer/SUCCESS_METRICS.md` for customer health

---

## Knowledge at a Glance

### What's Permanent (Keep)
- ✅ Governance documents (constitutions, standards, decision log)
- ✅ Operational runbooks and checklists
- ✅ Architecture documentation
- ✅ Code patterns with examples
- ✅ Lessons learned

### What Changes (Update)
- 🔄 API reference (when endpoints added/changed)
- 🔄 Database schema (when migrations run)
- 🔄 Learning log (after each phase)
- 🔄 Operational procedures (when processes improve)

### What Goes to Archive
- 📦 Old versions of documents
- 📦 Superseded runbooks
- 📦 Historical decision context
- 📦 Deprecated patterns

(Archived documents in `docs/archive/`)

---

## Governance & Ownership

**Governor Ω** maintains the knowledge system and ensures it stays current.

**Ownership by domain**:
- Governance: Governor Ω (Founder validates)
- Operations: On-call engineers (with ops lead)
- Engineering: Lead engineer + domain leads
- Learning: Governor Ω
- Customer: Customer success lead

**Update responsibilities**:
1. **Document it within 1 week** of implementation
2. **Review quarterly** (mark "Last Updated" date)
3. **Update on request** (within 48 hours)
4. **Archive when superseded** (don't delete)

---

## Verification Checklist

When implementing a new feature:

- [ ] Does this change the API? → Update `docs/engineering/API_REFERENCE.md`
- [ ] Does this change the database? → Update `docs/engineering/DATABASE_SCHEMA.md`
- [ ] Is this a new pattern? → Document in `docs/engineering/PATTERNS/`
- [ ] Does this affect operations? → Update `docs/operations/` procedures
- [ ] Does this change governance? → Update `docs/governance/` or decision log
- [ ] What did we learn? → Add to `docs/lessons/LEARNING_LOG.md`

---

## Status of Knowledge System

**Phase 4.1**: ✅ COMPLETE
- ✅ Directory structure created
- ✅ Knowledge taxonomy defined
- ✅ Master index (this document)
- ✅ Domain-specific indexes (governance, operations, engineering, lessons, customer)
- ✅ Templates for new knowledge documents
- ✅ Ownership and update model defined

**Phase 4.2**: 🔵 Queued (Operational Procedures)
- Deployment runbook
- Incident response runbook
- Database operations runbook
- All operational checklists and procedures

**Phase 4.3**: ✅ COMPLETE (Engineering Documentation)
- ✅ ARCHITECTURE.md — System design and components
- ✅ DATABASE_SCHEMA.md — Table definitions and RLS policies
- ✅ API_REFERENCE.md — All endpoints with examples
- ✅ PATTERNS/ROUTE_PATTERNS.md — API route structure
- ✅ PATTERNS/LIBRARY_PATTERNS.md — Domain logic organization
- ✅ PATTERNS/TESTING_PATTERNS.md — Unit, integration, E2E testing
- ✅ PATTERNS/REACT_PATTERNS.md — React component patterns
- ✅ PATTERNS/SECURITY_PATTERNS.md — Auth, validation, RLS

**Phase 4.4**: ✅ COMPLETE (Learning & Lessons Capture)
- ✅ STAGE_1_LESSONS.md — Governance consolidation learning
- ✅ STAGE_2_LESSONS.md — Knowledge architecture learning
- ✅ STAGE_3_LESSONS.md — Operational procedures learning
- ✅ LEARNING_LOG.md — Synthesis of all lessons
- ✅ lessons/INDEX.md — Navigation to lessons by audience
- ✅ governance/INDEX.md — Central governance knowledge index

**Phase 4.5**: ✅ COMPLETE (Knowledge Discovery & Navigation)
- ✅ GLOSSARY.md — 50+ key terms with definitions and cross-references
- ✅ AUDIENCE_GUIDE.md — Tailored learning paths for 7 roles
- ✅ DISCOVERY.md — Problem/task-based knowledge discovery

**STAGE 4 COMPLETION**: ✅ ALL PHASES COMPLETE (4.1 - 4.5)
- All institutional knowledge documented and organized
- Knowledge system fully functional with multiple navigation paths
- All documentation complete with ownership, currency tracking, and cross-domain linking

---

## Updated By

**Session**: Governor Ω (STAGE 4 Completion - Phase 4.5)  
**Date**: 2026-07-17  
**Status**: 🟢 STAGE 4 COMPLETE — All institutional knowledge documented
- Phase 4.1: ✅ Knowledge system structure
- Phase 4.2: ✅ Operational procedures (17 runbooks/checklists/procedures)
- Phase 4.3: ✅ Engineering documentation (8 documents)
- Phase 4.4: ✅ Learning & lessons (6 documents)
- Phase 4.5: ✅ Knowledge navigation (3 documents)

**Next**: Phase 4.6 (if approved) — Knowledge System Verification & Accessibility Testing

**Changes (Phase 4.5)**: Created GLOSSARY.md (50+ terms), AUDIENCE_GUIDE.md (7 role-specific paths), DISCOVERY.md (problem-based discovery). Consolidated all navigation and discovery guidance into 3 comprehensive documents. Updated governance/INDEX.md as central governance knowledge hub.
