# EURO AI Glossary

**Purpose**: Define key terms used throughout EURO AI documentation  
**Audience**: All users of the knowledge system  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-16

---

## Core Concepts

### AI System

An artificial intelligence application operated by an organization and subject to EU AI Act compliance requirements. Examples: chatbot, recommendation engine, classification model, generative AI tool.

**Related**: Assessment, Risk Score, Obligation  
**See also**: `docs/engineering/ARCHITECTURE.md` (system inventory)

---

### Assessment

A structured evaluation of an AI system's compliance with EU AI Act requirements. Assessments identify risks, determine obligations, and generate evidence requirements.

**Related**: Risk Score, Obligation, Evidence  
**See also**: `docs/engineering/API_REFERENCE.md` (assessment endpoints)

---

### Compliance

Adherence to legal, regulatory, and organizational requirements. In EURO AI context: meeting EU AI Act obligations for AI systems.

**Related**: Obligation, Evidence, Assessment  
**See also**: `docs/operations/RUNBOOKS/COMPLIANCE_AUDITS.md`

---

### Obligation

A specific requirement an organization must fulfill to comply with EU AI Act. Generated from assessment results. Examples: maintain audit logs, conduct impact assessment, document training data.

**Related**: Assessment, Evidence, Compliance  
**See also**: `docs/engineering/API_REFERENCE.md` (obligation endpoints)

---

### Risk Score

Numerical assessment (0-100) of an AI system's compliance risk. Calculated from assessment findings. Determines obligation priority and monitoring intensity.

**Low**: 0-25 (minimal risk, basic monitoring)  
**Medium**: 26-50 (managed risk, standard monitoring)  
**High**: 51-75 (significant risk, intensive monitoring)  
**Critical**: 76-100 (severe risk, immediate action required)

**Related**: Assessment, Obligation  
**See also**: `docs/governance/lessons/STAGE_2_LESSONS.md` (assessment algorithms)

---

### Evidence

Documentation supporting compliance with obligations. Examples: audit logs, training data records, impact assessment reports, testing results.

**Related**: Obligation, Compliance  
**See also**: `docs/engineering/API_REFERENCE.md` (evidence endpoints)

---

### Workspace

A tenant in the EURO AI multi-tenant system. Each organization operates one or more workspaces, each containing AI systems, assessments, obligations, and evidence.

**Related**: Multi-tenancy, User, Role  
**See also**: `docs/engineering/ARCHITECTURE.md` (multi-tenancy section)

---

### Multi-Tenancy

Architectural pattern where a single application instance serves multiple independent customers (workspaces). Data isolation enforced by Row Level Security (RLS).

**Related**: Workspace, Row Level Security  
**See also**: `docs/engineering/DATABASE_SCHEMA.md` (RLS policies)

---

### Row Level Security (RLS)

Database-level access control ensuring users only see data from their workspace. Enforced at the database layer (Supabase PostgreSQL).

**Related**: Multi-tenancy, Workspace  
**See also**: `docs/engineering/DATABASE_SCHEMA.md` (RLS enforcement section)

---

## Governance Concepts

### Governor Ω

The institutional authority responsible for engineering decisions, knowledge management, and operational procedures. Acts as founder's chief of staff and autonomous engineer.

**Mandate**: `docs/governance/FOUNDER_ADVISOR_CONSTITUTION.md` + `docs/governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md`  
**See also**: `docs/governance/AGENTS.md`

---

### Decision Authority

Explicit assignment of who makes specific types of decisions. Documented in DECISION_REGISTER.

**Examples**:

- Code architecture → Governor Ω
- Product features → Founder
- Database schema → Governor Ω + Founder
- External commitments → Founder

**See also**: `docs/governor/DECISION_REGISTER.md`

---

### Escalation

Process of raising a decision to a higher authority when the normal decision-maker cannot or should not decide alone.

**Example**: If a code change affects user privacy, Governor escalates to Founder for decision.

**See also**: `docs/governance/GOVERNOR_OPERATIONAL_FRAMEWORK.md`

---

### Autonomous Execution

Authority for Governor Ω to make engineering decisions independently without waiting for founder approval. Limited to safe domains: code, testing, documentation, refactoring.

**Boundaries**: Does NOT include money decisions, legal commitments, strategy changes, or customer commitments.

**See also**: `docs/governance/FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md`

---

## Knowledge Architecture Concepts

### Knowledge Domain

A major category of knowledge. EURO AI has 5 domains:

1. **Governance** — Decision authority, constitutions, policies
2. **Operational** — Procedures, runbooks, checklists
3. **Engineering** — Architecture, patterns, APIs
4. **Learning** — Lessons, retrospectives, institutional wisdom
5. **Customer** — User-facing documentation (future)

**See also**: `docs/governance/INDEX.md`

---

### Single Source of Truth (SSOT)

Principle that each concept has one canonical document. Prevents duplicate documentation and confusion.

**Applied**: Every major concept has one authoritative document; other references link to it.

**See also**: `docs/governance/lessons/STAGE_2_LESSONS.md` (SSOT lesson)

---

### Documentation Ownership

Assignment of a person/role responsible for keeping a document accurate and current. Owner is accountable but not sole writer.

**Example**: "Owner: Governor Ω" means Governor is responsible for accuracy, but others can contribute.

**See also**: `docs/governance/lessons/STAGE_2_LESSONS.md` (ownership lesson)

---

### Cross-Domain Link

Reference between related documents in different knowledge domains. Helps readers find related knowledge.

**Example**: Operational runbook links to governance decision authority for escalation path.

**See also**: `docs/governance/lessons/STAGE_2_LESSONS.md` (cross-domain lesson)

---

## Operational Concepts

### Runbook

Step-by-step procedure for a specific operational task. Includes verification steps and recovery paths.

**Examples**: Deployment runbook, Incident response runbook, Database backup runbook.

**See also**: `docs/operations/RUNBOOKS/`

---

### Checklist

Concise verification guide confirming a procedure was executed correctly. Different from procedures (which teach; checklists verify).

**Example**: Post-deployment checklist verifies health checks, monitoring, and no errors.

**See also**: `docs/operations/CHECKLISTS/`

---

### Procedure

Detailed how-to guide for completing a task. Includes narrative explanation, examples, and context.

**Example**: Git workflow procedure explains branching strategy, commit messages, code review process.

**See also**: `docs/operations/PROCEDURES/`

---

### Incident

An unexpected event that disrupts service or introduces risk. Severity levels: Critical, High, Medium, Low.

**Critical**: Customer-facing system down > 15 minutes  
**High**: Potential customer impact or widespread internal impact  
**Medium**: Limited scope, can be addressed during business hours  
**Low**: Informational, no immediate action required

**See also**: `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`

---

### Postmortem

Structured analysis of an incident to understand what happened and improve systems/procedures. Blameless, focused on system improvement.

**See also**: `docs/operations/CHECKLISTS/INCIDENT_POSTMORTEM.md`

---

### Escalation Matrix

Defined mapping: incident severity → who to notify → when to notify them.

**Critical**: Immediate notification to founder + technical lead  
**High**: Notification within 15 minutes to technical lead  
**Medium**: Notification within 1 hour to team lead  
**Low**: Documented but no immediate notification

**See also**: `docs/operations/RUNBOOKS/INCIDENT_RESPONSE.md`

---

## Engineering Concepts

### API Route

Endpoint in the REST API. Follows Next.js App Router structure. Examples: `/api/workspace`, `/api/assessments`, `/api/evidence`.

**See also**: `docs/engineering/PATTERNS/ROUTE_PATTERNS.md`

---

### Domain Logic

Business logic specific to a domain (workspace, assessment, evidence, etc.). Organized in `/lib` directory with clear ownership per domain.

**See also**: `docs/engineering/PATTERNS/LIBRARY_PATTERNS.md`

---

### Row Level Security (RLS) Policy

Database rule enforcing that users only see data from their workspace. Implemented at Supabase PostgreSQL layer.

**Example**: `workspace_id = (auth.jwt() ->> 'workspace_id')`

**See also**: `docs/engineering/DATABASE_SCHEMA.md`

---

### Service Layer

Module in `/lib/{domain}/service.ts` containing business logic and orchestrating between queries and validation.

**See also**: `docs/engineering/PATTERNS/LIBRARY_PATTERNS.md`

---

### Query Layer

Module in `/lib/{domain}/queries.ts` containing all database access for a domain.

**See also**: `docs/engineering/PATTERNS/LIBRARY_PATTERNS.md`

---

### Validation Layer

Module in `/lib/{domain}/validation.ts` containing input validation using Zod schemas.

**See also**: `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`

---

### Server Component

React component that runs only on the server. Used for data fetching and server-side logic.

**See also**: `docs/engineering/PATTERNS/REACT_PATTERNS.md`

---

### Client Component

React component that runs in the browser. Marked with `'use client'`. Used for interactivity and browser APIs.

**See also**: `docs/engineering/PATTERNS/REACT_PATTERNS.md`

---

## Testing Concepts

### Unit Test

Test of a single function or module in isolation. Uses mocks for dependencies.

**Location**: `lib/{domain}/{module}.test.ts`  
**Tool**: Vitest

**See also**: `docs/engineering/PATTERNS/TESTING_PATTERNS.md`

---

### Integration Test

Test of multiple modules working together. Uses real database (test database).

**Location**: `lib/{domain}/__tests__/{name}.integration.test.ts`  
**Tool**: Vitest

**See also**: `docs/engineering/PATTERNS/TESTING_PATTERNS.md`

---

### End-to-End Test (E2E)

Test of complete user workflows through the browser. Tests the full stack.

**Location**: `e2e/{feature}.spec.ts`  
**Tool**: Playwright

**See also**: `docs/engineering/PATTERNS/TESTING_PATTERNS.md`

---

### Test Coverage

Percentage of code executed by tests. EURO AI targets: utilities 90%+, libraries 85%+, routes 80%+, components 70%+.

**See also**: `docs/engineering/PATTERNS/TESTING_PATTERNS.md`

---

## Security Concepts

### Authentication

Verifying that a user is who they claim to be. EURO AI uses Supabase SSR with cookie-based sessions.

**See also**: `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`

---

### Authorization

Verifying that an authenticated user has permission to perform an action. EURO AI uses role-based access control (RBAC).

**Roles**: Owner, Admin, Editor, Viewer

**See also**: `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`

---

### Input Validation

Verifying that user input conforms to expected format and constraints. Performed on both client and server.

**See also**: `docs/engineering/PATTERNS/SECURITY_PATTERNS.md`

---

### Rate Limiting

Restricting the number of requests per user per time window. Prevents abuse and DoS attacks.

**Default**: 60 req/min per user, 10 req/min for auth endpoints

**See also**: `docs/engineering/API_REFERENCE.md` (rate limiting policy)

---

## Acronyms & Abbreviations

| Acronym | Meaning                                                   |
| ------- | --------------------------------------------------------- |
| AI      | Artificial Intelligence                                   |
| API     | Application Programming Interface                         |
| CI/CD   | Continuous Integration / Continuous Deployment            |
| CRUD    | Create, Read, Update, Delete                              |
| E2E     | End-to-End                                                |
| EU      | European Union                                            |
| JSON    | JavaScript Object Notation                                |
| MCP     | Possibly "Multi-tenant Control Plane" (context-dependent) |
| RLS     | Row Level Security                                        |
| REST    | Representational State Transfer                           |
| RLS     | Row Level Security                                        |
| RBAC    | Role-Based Access Control                                 |
| SSOT    | Single Source of Truth                                    |
| SSR     | Server-Side Rendering                                     |
| URL     | Uniform Resource Locator                                  |
| UUID    | Universally Unique Identifier                             |

---

## Cross-References

### By Category

- **Governance**: Decision Authority, Governor Ω, Escalation, Autonomous Execution
- **Knowledge**: Knowledge Domain, Single Source of Truth, Documentation Ownership, Cross-Domain Link
- **Operations**: Runbook, Checklist, Procedure, Incident, Postmortem
- **Engineering**: API Route, Domain Logic, Service Layer, Query Layer, Validation Layer
- **Security**: Authentication, Authorization, Input Validation, Rate Limiting
- **Testing**: Unit Test, Integration Test, E2E Test, Test Coverage

### By Audience

- **Founders**: Governor Ω, Decision Authority, Escalation, Autonomous Execution
- **Technical Leaders**: Domain Logic, API Route, RLS, Authentication, Authorization
- **Operators**: Runbook, Checklist, Incident, Postmortem, Escalation Matrix
- **Engineers**: All engineering and testing concepts
- **New Members**: Workspace, Multi-tenancy, Assessment, Obligation, Evidence

---

**Updated By**: Governor Ω  
**Session**: STAGE 4 Phase 4.5 (Knowledge Navigation)  
**Status**: Complete
