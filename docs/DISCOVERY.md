# Knowledge Discovery Guide

**Purpose**: Find institutional knowledge by problem, task, or question without knowing the document structure  
**Audience**: All users of EURO AI  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-16

---

## Quick Start: I Have a Problem

**Answer these questions in order:**

1. **What type of problem do I have?**
   - I don't understand how something works → [Architecture & Design](#architecture--design)
   - I need to build or modify code → [Building Code](#building-code)
   - I need to deploy or run operations → [Operations & Deployment](#operations--deployment)
   - I need to make a decision → [Decision Making](#decision-making)
   - I'm new and need to get oriented → [Onboarding](#onboarding)
   - I don't know what a term means → [Glossary](GLOSSARY.md)

2. **Within that category, which specific problem?** (See examples below)

3. **Follow the recommended path** (links to specific documents)

---

## By Problem Type

### Architecture & Design

**I want to understand...**

| Problem | Solution | Time |
|---------|----------|------|
| How the system works | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) system overview section | 15 min |
| Multi-tenancy and isolation | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) multi-tenancy section + [DATABASE_SCHEMA.md](engineering/DATABASE_SCHEMA.md) RLS section | 20 min |
| How data flows through system | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) data flow section | 10 min |
| API endpoints and formats | [API_REFERENCE.md](engineering/API_REFERENCE.md) | 15 min |
| How authentication works | [SECURITY_PATTERNS.md](engineering/PATTERNS/SECURITY_PATTERNS.md) session management section | 15 min |
| Why we built it this way | [LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) STAGE 4 section | 10 min |
| Deployment architecture | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) deployment section | 10 min |
| How to scale this system | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) scalability section | 10 min |

### Building Code

**I need to...**

| Task | Solution | Time |
|------|----------|------|
| Create a new API endpoint | [ROUTE_PATTERNS.md](engineering/PATTERNS/ROUTE_PATTERNS.md) | 20 min |
| Organize domain logic | [LIBRARY_PATTERNS.md](engineering/PATTERNS/LIBRARY_PATTERNS.md) | 15 min |
| Build a React component | [REACT_PATTERNS.md](engineering/PATTERNS/REACT_PATTERNS.md) | 20 min |
| Write tests for my code | [TESTING_PATTERNS.md](engineering/PATTERNS/TESTING_PATTERNS.md) | 20 min |
| Add validation to a form | [SECURITY_PATTERNS.md](engineering/PATTERNS/SECURITY_PATTERNS.md) validation section | 15 min |
| Understand database schema | [DATABASE_SCHEMA.md](engineering/DATABASE_SCHEMA.md) | 20 min |
| Implement RLS enforcement | [DATABASE_SCHEMA.md](engineering/DATABASE_SCHEMA.md) RLS section | 15 min |
| Add a new domain module | [LIBRARY_PATTERNS.md](engineering/PATTERNS/LIBRARY_PATTERNS.md) directory structure | 15 min |
| Check coding standards | [ENGINEERING_STANDARDS.md](governance/ENGINEERING_STANDARDS.md) | 15 min |
| Understand testing requirements | [ENGINEERING_STANDARDS.md](governance/ENGINEERING_STANDARDS.md) testing section | 10 min |

### Operations & Deployment

**I need to...**

| Task | Solution | Time |
|------|----------|------|
| Deploy to production | See [docs/operations/RUNBOOKS/DEPLOYMENT.md](operations/RUNBOOKS/DEPLOYMENT.md) | 15 min |
| Respond to an incident | See [docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md](operations/RUNBOOKS/INCIDENT_RESPONSE.md) | 15 min |
| Set up monitoring | See [docs/operations/RUNBOOKS/MONITORING_AND_ALERTING.md](operations/RUNBOOKS/MONITORING_AND_ALERTING.md) | 10 min |
| Perform database backup/recovery | See [docs/operations/RUNBOOKS/DATABASE_OPERATIONS.md](operations/RUNBOOKS/DATABASE_OPERATIONS.md) | 20 min |
| Verify deployment health | See [docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md](operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md) | 10 min |
| Understand operational procedures | See [docs/operations/INDEX.md](operations/INDEX.md) for all procedures | 10 min |

### Decision Making

**I need to decide...**

| Decision Type | Solution | Time |
|---------------|----------|------|
| Who has authority to decide X? | [docs/governor/DECISION_REGISTER.md](governor/DECISION_REGISTER.md) | 5 min |
| Should we make this architecture change? | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) + [DECISION_REGISTER.md](governor/DECISION_REGISTER.md) | 20 min |
| How should we build this feature? | Relevant [PATTERNS](engineering/PATTERNS/) document for the domain | 15 min |
| What's the decision criteria? | [GOVERNOR_OPERATIONAL_FRAMEWORK.md](governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md) | 10 min |
| When do I escalate this decision? | [GOVERNOR_OPERATIONAL_FRAMEWORK.md](governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md) escalation section | 5 min |
| What similar decisions have we made? | [DECISION_REGISTER.md](governor/DECISION_REGISTER.md) | 10 min |

### Onboarding

**I'm starting work on...**

| Role | Solution | Time |
|------|----------|------|
| Backend engineering | [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) backend engineer path | 45 min |
| Frontend engineering | [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) frontend engineer path | 45 min |
| DevOps/SRE operations | [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) DevOps/SRE path | 50 min |
| Architecture/technical leadership | [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) technical leader path | 60 min |
| First day at company | [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) new team member path | 90 min |
| Decision-making role | [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) decision maker path | 30 min |

---

## By Question Type

### "How do I...?"

**Technical How-To Questions:**
- "How do I create an API endpoint?" → [ROUTE_PATTERNS.md](engineering/PATTERNS/ROUTE_PATTERNS.md)
- "How do I write a test?" → [TESTING_PATTERNS.md](engineering/PATTERNS/TESTING_PATTERNS.md)
- "How do I build a component?" → [REACT_PATTERNS.md](engineering/PATTERNS/REACT_PATTERNS.md)
- "How do I organize domain logic?" → [LIBRARY_PATTERNS.md](engineering/PATTERNS/LIBRARY_PATTERNS.md)
- "How do I validate user input?" → [SECURITY_PATTERNS.md](engineering/PATTERNS/SECURITY_PATTERNS.md) validation section
- "How do I enforce authorization?" → [SECURITY_PATTERNS.md](engineering/PATTERNS/SECURITY_PATTERNS.md) session management section
- "How do I deploy?" → [docs/operations/RUNBOOKS/DEPLOYMENT.md](operations/RUNBOOKS/DEPLOYMENT.md)
- "How do I respond to an incident?" → [docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md](operations/RUNBOOKS/INCIDENT_RESPONSE.md)

### "Why did we...?"

**Historical/Rationale Questions:**
- "Why did we design it this way?" → [LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) STAGE 4 section
- "Why do we use Row Level Security?" → [DATABASE_SCHEMA.md](engineering/DATABASE_SCHEMA.md) RLS section + [ARCHITECTURE.md](engineering/ARCHITECTURE.md)
- "Why is documentation organized this way?" → [LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) STAGE 2 section
- "Why do we have this governance structure?" → [LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) STAGE 1 section
- "Why are procedures organized like this?" → [LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) STAGE 3 section

### "Who decides...?"

**Authority & Governance Questions:**
- "Who decides architecture changes?" → [DECISION_REGISTER.md](governor/DECISION_REGISTER.md) authority matrix
- "Who approves deployments?" → [DECISION_REGISTER.md](governor/DECISION_REGISTER.md) authority matrix
- "When do I escalate?" → [GOVERNOR_OPERATIONAL_FRAMEWORK.md](governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md)
- "What's the decision authority for X?" → [DECISION_REGISTER.md](governor/DECISION_REGISTER.md)

### "What's the definition of...?"

**Terminology Questions:**
- Look up the term in [GLOSSARY.md](GLOSSARY.md)
- If not found, search in the INDEX of the relevant domain:
  - Governance: [governance/INDEX.md](governance/INDEX.md)
  - Operations: [operations/INDEX.md](operations/INDEX.md)
  - Engineering: [engineering/INDEX.md](engineering/INDEX.md)

### "Where is...?"

**Finding Things Questions:**
- "Where are API endpoints documented?" → [engineering/API_REFERENCE.md](engineering/API_REFERENCE.md)
- "Where is the database schema?" → [engineering/DATABASE_SCHEMA.md](engineering/DATABASE_SCHEMA.md)
- "Where are code patterns?" → [engineering/PATTERNS/](engineering/PATTERNS/) (5 files by domain)
- "Where are operational procedures?" → [operations/RUNBOOKS/](operations/RUNBOOKS/)
- "Where are governance decisions?" → [governor/DECISION_REGISTER.md](governor/DECISION_REGISTER.md)
- "Where should I read first?" → [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) by your role

---

## By Document Type

### Architecture & Understanding
- [ARCHITECTURE.md](engineering/ARCHITECTURE.md) — System design, components, data flow, deployment
- [DATABASE_SCHEMA.md](engineering/DATABASE_SCHEMA.md) — Tables, relationships, RLS policies, testing
- [API_REFERENCE.md](engineering/API_REFERENCE.md) — All endpoints, request/response formats, status codes

### Patterns & Implementation
- [PATTERNS/ROUTE_PATTERNS.md](engineering/PATTERNS/ROUTE_PATTERNS.md) — Building API endpoints
- [PATTERNS/LIBRARY_PATTERNS.md](engineering/PATTERNS/LIBRARY_PATTERNS.md) — Organizing domain logic
- [PATTERNS/REACT_PATTERNS.md](engineering/PATTERNS/REACT_PATTERNS.md) — Building React components
- [PATTERNS/TESTING_PATTERNS.md](engineering/PATTERNS/TESTING_PATTERNS.md) — Writing tests
- [PATTERNS/SECURITY_PATTERNS.md](engineering/PATTERNS/SECURITY_PATTERNS.md) — Security & validation

### Governance & Decision Making
- [governor/DECISION_REGISTER.md](governor/DECISION_REGISTER.md) — All architectural decisions with rationale
- [governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md](governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md) — Decision authority, escalation
- [governance/FOUNDER_ADVISOR_CONSTITUTION.md](governance/FOUNDER_ADVISOR_CONSTITUTION.md) — Governor-founder relationship
- [governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md](governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md) — Autonomy boundaries
- [governance/ENGINEERING_STANDARDS.md](governance/ENGINEERING_STANDARDS.md) — Code and testing standards

### Learning & Institutional Wisdom
- [governance/lessons/LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) — Top 10 lessons + synthesis
- [governance/lessons/STAGE_1_LESSONS.md](governance/lessons/STAGE_1_LESSONS.md) — Governance consolidation lessons
- [governance/lessons/STAGE_2_LESSONS.md](governance/lessons/STAGE_2_LESSONS.md) — Knowledge architecture lessons
- [governance/lessons/STAGE_3_LESSONS.md](governance/lessons/STAGE_3_LESSONS.md) — Operational procedure lessons

### Navigation & Discovery
- [GLOSSARY.md](GLOSSARY.md) — Definitions of 50+ key terms
- [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) — Tailored paths by role
- [DISCOVERY.md](DISCOVERY.md) — This document: find knowledge by problem/task
- [governance/INDEX.md](governance/INDEX.md) — Central governance knowledge index
- [governance/lessons/INDEX.md](governance/lessons/INDEX.md) — Lessons navigation
- [engineering/INDEX.md](engineering/INDEX.md) — Engineering knowledge status
- [operations/INDEX.md](operations/INDEX.md) — Operational knowledge (procedures, checklists, runbooks)

---

## Search Strategies

### If you know the general area

1. **You know it's about governance:**
   - Start: [governance/INDEX.md](governance/INDEX.md) → find topic → read document

2. **You know it's about engineering:**
   - Start: [engineering/INDEX.md](engineering/INDEX.md) → find document → read

3. **You know it's about operations:**
   - Start: [operations/INDEX.md](operations/INDEX.md) → find runbook/checklist → read

4. **You know it's about learning/lessons:**
   - Start: [governance/lessons/INDEX.md](governance/lessons/INDEX.md) → find lesson → read

### If you don't know the area

1. **Start with your role:** [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) → find your role → follow the path

2. **Start with your problem:** This document → find your problem type → follow link

3. **Start with a term:** [GLOSSARY.md](GLOSSARY.md) → look up term → follow related links

4. **Start with a question:** Check "By Question Type" section above → follow link

---

## Common Paths

### New Engineer Onboarding

1. **Day 1:** [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) your role section (30 min)
2. **Day 1 afternoon:** Role-specific path (45 min)
3. **Day 2-3:** [governance/ENGINEERING_STANDARDS.md](governance/ENGINEERING_STANDARDS.md) (15 min)
4. **Week 1:** Your role's "Week 1" section in [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) (90 min)
5. **When building:** [PATTERNS/](engineering/PATTERNS/) relevant to your task (15-20 min)
6. **When testing:** [PATTERNS/TESTING_PATTERNS.md](engineering/PATTERNS/TESTING_PATTERNS.md) (20 min)

### Architecture Decision

1. Check: [governor/DECISION_REGISTER.md](governor/DECISION_REGISTER.md) authority matrix
2. Read: [GOVERNOR_OPERATIONAL_FRAMEWORK.md](governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md) if unclear
3. Research: Relevant [PATTERNS/](engineering/PATTERNS/) document
4. Context: [LEARNING_LOG.md](governance/lessons/LEARNING_LOG.md) cross-stage patterns
5. Decide: Follow authority from DECISION_REGISTER

### Operational Response

1. Check: [docs/operations/INDEX.md](operations/INDEX.md) find relevant runbook
2. Read: The runbook step-by-step
3. Verify: Check [docs/operations/CHECKLISTS/](operations/CHECKLISTS/) verification checklist
4. Escalate: Follow [governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md](governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md) if unclear
5. Improve: Document lessons for postmortem

---

## Getting Unstuck

**If you can't find what you need:**

1. **Try the GLOSSARY** [GLOSSARY.md](GLOSSARY.md) — term might be defined elsewhere
2. **Try INDEX for your domain** — each domain has an INDEX listing all documents
3. **Try AUDIENCE_GUIDE** [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md) — might guide you to right section
4. **Try the "Related" section** — every document has "Related Documents" links
5. **Try searching in files** — grep for a keyword if all else fails
6. **Ask for help** — if stuck, post in chat with the problem; someone can point to the right doc

---

## Document Cross-Reference Map

```
GLOSSARY.md ──→ All documents (definitions)
    ↓
AUDIENCE_GUIDE.md ──→ Role-specific paths
    ↓
DISCOVERY.md (this doc) ──→ Problem/task-based paths
    ↓
    ├─ governance/INDEX.md ──→ Governance documents
    │  ├─ DECISION_REGISTER.md
    │  ├─ FOUNDER_ADVISOR_CONSTITUTION.md
    │  ├─ ENGINEERING_STANDARDS.md
    │  └─ lessons/ ──→ Learning documents
    │
    ├─ engineering/INDEX.md ──→ Engineering documents
    │  ├─ ARCHITECTURE.md
    │  ├─ DATABASE_SCHEMA.md
    │  ├─ API_REFERENCE.md
    │  └─ PATTERNS/ ──→ 5 pattern documents
    │
    └─ operations/INDEX.md ──→ Operational documents
       ├─ RUNBOOKS/ ──→ Procedures
       └─ CHECKLISTS/ ──→ Verification
```

---

## Verification: Is This Guide Working?

**If you used this guide, did it help?**

- [ ] Found answer within 5 minutes
- [ ] Had to search multiple places (feedback: add faster path)
- [ ] Couldn't find answer (feedback: area needs documentation)
- [ ] Found answer but had to ask someone (feedback: discovery path needs update)

If you answer "no" to any of these, file an issue or post feedback — this guide improves based on usage.

---

**Updated By**: Governor Ω  
**Session**: STAGE 4 Phase 4.5 (Knowledge Navigation)  
**Status**: Complete  
**Related**: [AUDIENCE_GUIDE.md](AUDIENCE_GUIDE.md), [GLOSSARY.md](GLOSSARY.md), [governance/INDEX.md](governance/INDEX.md)
