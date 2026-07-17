# Knowledge Navigation by Audience

**Purpose**: Tailored reading paths and resource recommendations for different roles  
**Audience**: All users of EURO AI  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-16

---

## Quick Audience Selector

**I'm a...**

| Role                  | Start Here                                          | Time   |
| --------------------- | --------------------------------------------------- | ------ |
| **Founder/Leader**    | [Governance Path](#founder--leadership)             | 60 min |
| **Technical Leader**  | [Architecture Path](#technical-leader--architect)   | 60 min |
| **Backend Engineer**  | [Backend Path](#backend-engineer)                   | 45 min |
| **Frontend Engineer** | [Frontend Path](#frontend-engineer)                 | 45 min |
| **DevOps/SRE**        | [Operations Path](#devopssite-reliability-engineer) | 50 min |
| **New Team Member**   | [Onboarding Path](#new-team-member--first-day)      | 90 min |
| **Decision Maker**    | [Decision Path](#decision-maker)                    | 30 min |

---

## Founder / Leadership

**Goal**: Understand governance structure, decision authority, and key institutional knowledge

### Day 1 (30 minutes)

1. **`docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md`** (5 min)
   - Your relationship with Governor Ω
   - When to consult, when Governor acts independently

2. **`docs/governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md`** (5 min)
   - When Governor makes autonomous decisions
   - Interruption conditions (when Governor escalates to you)

3. **`docs/governor/DECISION_REGISTER.md`** (10 min)
   - Browse the decision matrix (first section)
   - Skim example decisions to understand pattern

4. **`docs/governance/lessons/LEARNING_LOG.md`** (Top 10 Lessons) (10 min)
   - Key institutional wisdom from STAGE 1-4
   - Patterns that apply to your decisions

### Week 1 (Additional 30 minutes)

5. **`docs/governance/INDEX.md`** (15 min)
   - Overview of all governance documentation
   - Know where to look for authority questions

6. **`docs/governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md`** (15 min)
   - Escalation paths and boundaries
   - When governance issues come to you

### As Needed

- **`docs/governor/DECISION_REGISTER.md`** (full) — consult when ambiguous on authority
- **`docs/governance/lessons/STAGE_1_LESSONS.md`** — deep dive into governance patterns
- **`docs/operations/INDEX.md`** — understand operational readiness

### Success Metrics

✅ Know who decides what (can consult DECISION_REGISTER)  
✅ Know when Governor escalates to you  
✅ Understand autonomous execution boundaries  
✅ Can explain governance structure to others

---

## Technical Leader / Architect

**Goal**: Understand system architecture, code standards, and design decision processes

### Day 1 (45 minutes)

1. **`docs/engineering/ARCHITECTURE.md`** (15 min)
   - System overview and components
   - Multi-tenancy design
   - Data flow patterns

2. **`docs/engineering/DATABASE_SCHEMA.md`** (15 min)
   - Table structure
   - Row Level Security (RLS) enforcement
   - Access patterns

3. **`docs/governance/ENGINEERING_STANDARDS.md`** (15 min)
   - Code style and structure
   - Testing requirements
   - Documentation expectations

### Week 1 (Additional 45 minutes)

4. **`docs/engineering/API_REFERENCE.md`** (20 min)
   - API endpoints
   - Request/response formats
   - Decision matrix (when to create vs. extend endpoints)

5. **`docs/engineering/PATTERNS/`** (25 min)
   - Skim route patterns
   - Skim library patterns
   - Skim security patterns

6. **`docs/governance/lessons/LEARNING_LOG.md`** (Cross-stage patterns) (10 min)
   - Architectural patterns that emerged
   - Why certain patterns were chosen

### As Needed (per decision type)

- **`docs/engineering/PATTERNS/ROUTE_PATTERNS.md`** — designing new endpoints
- **`docs/engineering/PATTERNS/LIBRARY_PATTERNS.md`** — organizing domain logic
- **`docs/engineering/PATTERNS/REACT_PATTERNS.md`** — building components
- **`docs/engineering/PATTERNS/SECURITY_PATTERNS.md`** — security decisions
- **`docs/governor/DECISION_REGISTER.md`** — past architecture decisions

### Success Metrics

✅ Can explain system architecture (frontend, API, database, auth)  
✅ Understand multi-tenancy and RLS enforcement  
✅ Know code and testing standards  
✅ Can make or recommend architecture decisions

---

## Backend Engineer

**Goal**: Understand how to build API routes and domain logic following EURO AI patterns

### Day 1 (30 minutes)

1. **`docs/engineering/ARCHITECTURE.md`** (Quick read: system components only) (5 min)

2. **`docs/engineering/API_REFERENCE.md`** (Brief read: endpoint list + status codes) (5 min)

3. **`docs/engineering/PATTERNS/ROUTE_PATTERNS.md`** (15 min)
   - How to structure API routes
   - Authentication and authorization patterns
   - Error handling

### Week 1 (Additional 30 minutes)

4. **`docs/engineering/PATTERNS/LIBRARY_PATTERNS.md`** (15 min)
   - How to organize domain logic
   - Service/Query/Validation layers

5. **`docs/engineering/PATTERNS/SECURITY_PATTERNS.md`** (15 min)
   - Input validation requirements
   - RLS enforcement

### Before First PR

6. **`docs/governance/ENGINEERING_STANDARDS.md`** (10 min)
   - Code standards you must follow
   - Testing requirements

7. **`docs/engineering/PATTERNS/TESTING_PATTERNS.md`** (Unit Tests section) (10 min)
   - How to test your code

### When Writing a Feature

- **`docs/engineering/PATTERNS/ROUTE_PATTERNS.md`** — new endpoint pattern
- **`docs/engineering/API_REFERENCE.md`** — check if endpoint exists
- **`docs/engineering/DATABASE_SCHEMA.md`** — understand data model
- **`docs/engineering/PATTERNS/SECURITY_PATTERNS.md`** — validation and auth

### Success Metrics

✅ Can write a new API endpoint following patterns  
✅ Know how to structure domain logic  
✅ Understand authentication/authorization boundaries  
✅ Can write tests meeting coverage targets

---

## Frontend Engineer

**Goal**: Understand component patterns, API usage, and testing approach

### Day 1 (30 minutes)

1. **`docs/engineering/ARCHITECTURE.md`** (Frontend section only) (5 min)

2. **`docs/engineering/API_REFERENCE.md`** (Skim endpoints, focus on structure) (10 min)

3. **`docs/engineering/PATTERNS/REACT_PATTERNS.md`** (15 min)
   - Component structure
   - Server vs. client components
   - State management patterns

### Week 1 (Additional 20 minutes)

4. **`docs/engineering/PATTERNS/TESTING_PATTERNS.md`** (E2E section) (10 min)
   - How to write end-to-end tests

5. **`docs/engineering/PATTERNS/SECURITY_PATTERNS.md`** (Form validation section) (10 min)
   - Client-side validation patterns

### Before First PR

6. **`docs/governance/ENGINEERING_STANDARDS.md`** (5 min)
   - Code standards

### When Building a Feature

- **`docs/engineering/API_REFERENCE.md`** — which endpoints to call
- **`docs/engineering/PATTERNS/REACT_PATTERNS.md`** — component patterns
- **`docs/engineering/PATTERNS/TESTING_PATTERNS.md`** — E2E testing

### Success Metrics

✅ Can build a new page following component patterns  
✅ Know which API endpoints to call  
✅ Can write E2E tests  
✅ Understand server vs. client component boundaries

---

## DevOps/Site Reliability Engineer

**Goal**: Understand deployment, monitoring, incident response, and operational procedures

### Day 1 (40 minutes)

1. **`docs/operations/INDEX.md`** (10 min)
   - Overview of all operational knowledge
   - Runbooks and procedures

2. **`docs/operations/RUNBOOKS/DEPLOYMENT.md`** (10 min)
   - Deployment procedure
   - Pre-deployment verification

3. **`docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`** (10 min)
   - Incident classification
   - Response procedures
   - Escalation paths

4. **`docs/operations/CHECKLISTS/PRE_DEPLOYMENT.md`** (5 min)
   - Quality gates before deployment

### Week 1 (Additional 30 minutes)

5. **`docs/operations/RUNBOOKS/DATABASE_OPERATIONS.md`** (15 min)
   - Database backups and recovery
   - Migration procedures

6. **`docs/operations/CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md`** (10 min)
   - Verification steps after deployment

7. **`docs/operations/RUNBOOKS/MONITORING_AND_ALERTING.md`** (5 min)
   - Alert configuration
   - Monitoring strategy

### Before On-Call

8. **`docs/operations/RUNBOOKS/SECURITY_OPERATIONS.md`** (10 min)
   - Security incident response

9. **`docs/operations/PROCEDURES/ON_CALL_PROCEDURES.md`** (10 min)
   - On-call responsibilities

### For Specific Tasks

- **`docs/operations/RUNBOOKS/`** — step-by-step procedures
- **`docs/operations/CHECKLISTS/`** — verification gates
- **`docs/governance/lessons/STAGE_3_LESSONS.md`** — operational patterns

### Success Metrics

✅ Can deploy with confidence (follow deployment runbook)  
✅ Know how to respond to incidents (follow incident runbook)  
✅ Understand escalation paths  
✅ Can verify deployment health

---

## New Team Member / First Day

**Goal**: Understand the system, culture, and how to get productive

### Day 1 Morning (45 minutes)

1. **`docs/governance/lessons/LEARNING_LOG.md`** (Top 10 Lessons + Summary) (15 min)
   - Key insights from development
   - Cultural values

2. **`docs/GLOSSARY.md`** (Skim, bookmark for reference) (10 min)
   - Key terminology

3. **`docs/engineering/ARCHITECTURE.md`** (System overview) (15 min)
   - What the system does
   - How components fit together

4. **`docs/AUDIENCE_GUIDE.md`** (This document) (5 min)
   - Find your role's detailed path

### Day 1 Afternoon (45 minutes)

5. **Your Role's Specific Path** (from above sections)
   - Backend: Start [Backend Path](#backend-engineer)
   - Frontend: Start [Frontend Path](#frontend-engineer)
   - DevOps: Start [DevOpssite-reliability-engineer](#devopssite-reliability-engineer)

### Day 2-3

6. **`docs/governance/ENGINEERING_STANDARDS.md`** (10 min)
   - Code and testing standards

7. **`docs/governance/INDEX.md`** (10 min)
   - Overview of governance (bookmark for reference)

8. **Set up development environment**
   - Follow README
   - Run tests to verify setup

### Week 1

9. **Your Role's Week 1 Path** (from above sections)

### Success Metrics

✅ Can explain what EURO AI does  
✅ Know your role's knowledge path  
✅ Development environment is set up  
✅ Can build something small (bug fix, documentation, test)

---

## Decision Maker

**Goal**: Quickly get the context and decision criteria for a specific decision

### Strategy / Product Decision

1. **`docs/governor/DECISION_REGISTER.md`** — lookup decision authority (2 min)
2. **`docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md`** — founder authority (2 min)
3. **Read the specific decision** in DECISION_REGISTER if relevant (5 min)

### Code / Architecture Decision

1. **`docs/governor/DECISION_REGISTER.md`** — lookup authority (2 min)
2. **Relevant PATTERNS document** — understand options (10 min)
   - Example: Creating an endpoint → `PATTERNS/ROUTE_PATTERNS.md`
3. **`docs/engineering/ARCHITECTURE.md`** — understand constraints (5 min)

### Operational / Procedure Decision

1. **`docs/operations/INDEX.md`** — find relevant runbook (5 min)
2. **Relevant runbook** — understand current procedure (10 min)
3. **`docs/governance/lessons/STAGE_3_LESSONS.md`** — understand patterns (10 min)

### Governance / Authority Decision

1. **`docs/governor/DECISION_REGISTER.md`** — lookup similar decisions (5 min)
2. **`docs/governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md`** — understand precedent (5 min)
3. **`docs/governance/lessons/STAGE_1_LESSONS.md`** — understand principles (10 min)

---

## Role Comparison Matrix

| Need                | Founder   | Tech Lead | Backend   | Frontend | DevOps    | New Hire  |
| ------------------- | --------- | --------- | --------- | -------- | --------- | --------- |
| System Architecture | Quick     | Deep      | Quick     | Quick    | Quick     | Quick     |
| Code Standards      | Reference | Deep      | Deep      | Deep     | —         | Deep      |
| API Reference       | Reference | Deep      | Deep      | Deep     | Reference | Reference |
| Patterns            | Reference | Deep      | Deep      | Deep     | Reference | skim      |
| Governance          | Deep      | Quick     | —         | —        | —         | Quick     |
| Operational         | Reference | Reference | Reference | —        | Deep      | Quick     |
| Lessons             | Deep      | Deep      | —         | —        | —         | Deep      |

---

## Key Documents by Question

**I need to know...**

| Question                            | Document                                        | Read Time |
| ----------------------------------- | ----------------------------------------------- | --------- |
| Who decides X?                      | `docs/governor/DECISION_REGISTER.md`            | 5 min     |
| How do I build Y?                   | Role-specific PATTERNS document                 | 15 min    |
| What's the API for Z?               | `docs/engineering/API_REFERENCE.md`             | 10 min    |
| How should I respond to incident A? | `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md` | 15 min    |
| What does term X mean?              | `docs/GLOSSARY.md`                              | 2 min     |
| Why did we build it this way?       | `docs/governance/lessons/`                      | 15 min    |
| How do I deploy?                    | `docs/operations/RUNBOOKS/DEPLOYMENT.md`        | 15 min    |

---

## Success Criteria by Role

### Founder/Leadership

- [ ] Know decision authority matrix
- [ ] Know when Governor escalates to you
- [ ] Can explain governance structure
- [ ] Understand autonomous execution boundaries

### Technical Leader

- [ ] Can explain system architecture
- [ ] Know code and testing standards
- [ ] Can make architecture decisions
- [ ] Know how to evaluate design proposals

### Backend Engineer

- [ ] Can write an API route following patterns
- [ ] Understand domain logic organization
- [ ] Know authentication/authorization boundaries
- [ ] Can write tests meeting coverage targets

### Frontend Engineer

- [ ] Can build a page following patterns
- [ ] Know which API endpoints to call
- [ ] Can write E2E tests
- [ ] Understand server/client component boundaries

### DevOps/SRE

- [ ] Can deploy with confidence
- [ ] Know how to respond to incidents
- [ ] Understand escalation paths
- [ ] Can verify deployment health

### New Team Member

- [ ] Can explain what EURO AI does
- [ ] Development environment works
- [ ] Know your role's knowledge path
- [ ] Can complete a small task

---

**Updated By**: Governor Ω  
**Session**: STAGE 4 Phase 4.5 (Knowledge Navigation)  
**Status**: Complete
