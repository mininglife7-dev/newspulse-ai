# Engineering Knowledge Index

**Purpose**: Quick reference for architecture, APIs, database schema, and code patterns  
**Audience**: Engineers, architects, code reviewers  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-16

---

## Quick Navigation

### System Design & Architecture

| Document | Purpose | Audience |
|----------|---------|----------|
| `ARCHITECTURE.md` | System overview, components, data flow | New engineers, architects |
| `API_REFERENCE.md` | All endpoints, request/response formats, status codes | Backend, frontend, integrators |
| `DATABASE_SCHEMA.md` | Tables, relationships, RLS policies, access patterns | Backend, database engineers |

---

## Code Patterns

These documents explain the patterns used throughout the codebase with real examples.

### Foundational

| Pattern | File | When to Use | Audience |
|---------|------|------------|----------|
| Route Pattern | `PATTERNS/ROUTE_PATTERNS.md` | Building API endpoints | Backend engineers |
| Library Patterns | `PATTERNS/LIBRARY_PATTERNS.md` | Organizing domain logic | Backend engineers |
| Testing Patterns | `PATTERNS/TESTING_PATTERNS.md` | Writing tests | All engineers |
| React Patterns | `PATTERNS/REACT_PATTERNS.md` | Building components | Frontend engineers |
| Security Patterns | `PATTERNS/SECURITY_PATTERNS.md` | Input validation, auth, RLS | All engineers |

---

## By Role

### I'm a New Backend Engineer
1. Read `ARCHITECTURE.md` — understand the system
2. Read `API_REFERENCE.md` — see what endpoints exist
3. Read `DATABASE_SCHEMA.md` — understand data model
4. Read `PATTERNS/ROUTE_PATTERNS.md` — how to write routes
5. Read `PATTERNS/LIBRARY_PATTERNS.md` — how to organize logic
6. Read `PATTERNS/SECURITY_PATTERNS.md` — security requirements

### I'm a New Frontend Engineer
1. Read `ARCHITECTURE.md` — understand the system
2. Read `API_REFERENCE.md` — what endpoints to call
3. Read `PATTERNS/REACT_PATTERNS.md` — component patterns
4. Read `PATTERNS/TESTING_PATTERNS.md` — testing approach

### I'm Writing an API Endpoint
1. Check `API_REFERENCE.md` — does this endpoint exist?
2. Follow `PATTERNS/ROUTE_PATTERNS.md` — standard structure
3. Validate input per `PATTERNS/SECURITY_PATTERNS.md`
4. Use error codes from `API_REFERENCE.md`
5. Update `API_REFERENCE.md` when done

### I'm Querying the Database
1. Review `DATABASE_SCHEMA.md` — understand the tables
2. Check RLS policies — ensure data isolation
3. Follow `PATTERNS/LIBRARY_PATTERNS.md` — organize queries in domain modules

### I'm Writing Tests
1. Review `PATTERNS/TESTING_PATTERNS.md` — testing strategy
2. Look at existing tests for examples
3. Check coverage targets and fixtures

### I'm Doing a Code Review
1. Check `PATTERNS/` for relevant patterns
2. Verify security per `PATTERNS/SECURITY_PATTERNS.md`
3. Compare against `API_REFERENCE.md` if API changes
4. Verify database isolation if database touched

---

## Architecture Quick Reference

### System Components

```
┌─────────────────────────────────────────────────────────┐
│ Customer Frontend (Next.js App Router)                   │
│ ├─ Workspace / Inventory / Assessment / Compliance      │
│ └─ Obligations / Evidence / Team / Governance            │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ API Routes (Next.js App Router)                          │
│ ├─ Customer-facing: /api/assessments, /api/evidence     │
│ ├─ Admin: /api/team, /api/compliance-dashboard          │
│ └─ Monitoring: /api/health, /api/alerts, /api/metrics   │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Domain Logic Layer (lib/)                                │
│ ├─ Risk assessment algorithms                            │
│ ├─ Obligation management                                 │
│ ├─ Evidence linking                                      │
│ ├─ Team/access management                                │
│ └─ Observability / monitoring                            │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Database (Supabase PostgreSQL)                           │
│ ├─ Workspace (multi-tenancy root)                        │
│ ├─ AI Systems / Assessments / Evidence / Obligations     │
│ ├─ RLS policies (workspace isolation)                    │
│ └─ Audit logs                                            │
└─────────────────────────────────────────────────────────┘
```

### Data Isolation

All data is isolated by `workspace_id`:
- **Authentication**: Supabase SSR cookie-based sessions
- **Authorization**: Row-Level Security (RLS) policies enforce workspace isolation
- **Every table** has `workspace_id` and RLS policy: `workspace_id = (auth.jwt() ->> 'workspace_id')`

---

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript strict
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase PostgreSQL (EU-hosted)
- **Auth**: Supabase SSR with cookie-based sessions
- **Testing**: Vitest (unit), Playwright (E2E), integration tests with test database
- **Deployment**: Vercel (global CDN, EU data residency)
- **Code Quality**: TypeScript strict, ESLint, Prettier, Husky pre-commit/pre-push

---

## Standards & Compliance

All code must comply with:
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality, testing, patterns
- `docs/governance/INTEGRATION_TEST_STANDARD.md` — Integration test requirements
- `.husky/pre-push` — Automated verification before push

---

## Document Status

| Document | Status | Owner | Last Updated |
|----------|--------|-------|--------------|
| ARCHITECTURE.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.3 |
| DATABASE_SCHEMA.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.3 |
| API_REFERENCE.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.3 |
| PATTERNS/ROUTE_PATTERNS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.3 |
| PATTERNS/LIBRARY_PATTERNS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.3 |
| PATTERNS/TESTING_PATTERNS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.3 |
| PATTERNS/REACT_PATTERNS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.3 |
| PATTERNS/SECURITY_PATTERNS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.3 |

---

## Related Knowledge

- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards
- `docs/governance/INTEGRATION_TEST_STANDARD.md` — Test standards
- `docs/operations/INDEX.md` — Operational procedures for deployment
- `docs/lessons/LEARNING_LOG.md` — Lessons from engineering decisions

---

## Phase 4.3 Progress

**Status**: IN PROGRESS (3 of 8 deliverables complete)
- ✓ ARCHITECTURE.md — System design and components  
- ✓ DATABASE_SCHEMA.md — Table definitions, RLS, and access patterns
- ✓ API_REFERENCE.md — Endpoint documentation
- ⏳ PATTERNS/*.md — Code patterns and examples (5 files remaining)

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.3)  
**Date**: 2026-07-16  
**Status**: Phase 4.3 IN PROGRESS - 3/8 core documentation complete  
**Completion**: ARCHITECTURE + DATABASE_SCHEMA + API_REFERENCE complete, continuing with code patterns
