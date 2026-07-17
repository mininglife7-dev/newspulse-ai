# Alpha Cathedral Ω — Implementation Roadmap

**Authority**: Governor Ω Directive (2026-07-16)

**Objective**: Build Alpha Cathedral into a permanent institutional operating system through sequential, verified stages. No stage begins until the previous stage is objectively verified.

**Repository State Authority**: The repository state (committed code, documentation, merged PRs, deployed infrastructure) is the authoritative source of operational truth.

---

## STAGE 0: Repository Reconnaissance

**Mission**: Inventory the current state, identify architecture, detect duplication, and identify risks.

**Objectives**:

- Map repository structure and content
- Identify all governance and documentation layers
- Detect architectural duplication and deprecated systems
- Assess application code maturity
- Identify active vs. abandoned branches
- Document existing risks and technical debt

**Deliverables**:

- Repository Assessment Report (this document section)
- Duplication Inventory
- Active Systems Catalog
- Risk Baseline
- Architecture Map

**Verification Criteria**:

- ✅ Complete file inventory across all directories
- ✅ Git history reviewed for 50+ recent commits
- ✅ All governance documents cataloged
- ✅ API route endpoints enumerated
- ✅ Database schema current state documented
- ✅ npm scripts verified executable
- ✅ Active/deprecated code systems identified

**Files Changed**: 0 (reconnaissance only)

**Completion Status**: COMPLETE ✅

---

## Repository Assessment Report (STAGE 0 Output)

### Current Reality

**Repository**: `mininglife7-dev/newspulse-ai`  
**Product**: EURO AI — AI Governance Platform for EU AI Act Compliance  
**Tech Stack**: Next.js 16, React 19, TypeScript (strict), Supabase, Vercel  
**Status**: POST-LAUNCH INSTITUTIONAL BUILD (July 16, 2026)

### Inventory Summary

**Documentation Files**: ~300+ markdown files across root, docs/, and subdirectories

| Location         | Count | Status                          | Concern                     |
| ---------------- | ----- | ------------------------------- | --------------------------- |
| Root level *.md  | ~30   | Operational snapshots           | Heavy duplication           |
| docs/governance/ | ~95   | Governance & decisions          | Checkpoint overload         |
| docs/governor/   | ~85   | Executive baseline & deployment | Fragmented                  |
| docs/infra/      | ~50   | Infrastructure & runbooks       | Multiple competing runbooks |
| docs/integrity/  | ~10   | Product health audits           | Inconsistent format         |
| docs/customer/   | ~12   | Customer operations             | Duplication with governance |
| docs/compliance/ | ~2    | Compliance policy               | Minimal coverage            |

**Application Code**:

| Layer           | Status  | LOC                       | Assessment                                                |
| --------------- | ------- | ------------------------- | --------------------------------------------------------- |
| API Routes      | Active  | ~6,083                    | 42 endpoint directories, significant duplication detected |
| Pages           | Active  | ~19 customer-facing pages | Core routes implemented                                   |
| Components      | Active  | ~3 major systems          | UI layer functional                                       |
| Library         | Active  | ~20 core modules          | CEIS system primary value driver                          |
| Tests           | Partial | E2E + unit                | ~70% estimated coverage                                   |
| Database Schema | Stable  | ~30 tables                | 1 recent cleanup migration                                |

**Active Systems**:

1. **CEIS** (primary value system)
   - Extraction, pipeline, LLM orchestration, report generation
   - Data collectors: Firecrawl, HackerNews, Reddit, ArXiv, GitHub, web research
   - Mature, production-deployed

2. **EURO AI Platform** (customer SaaS)
   - Workspace, inventory, assessment, evidence, obligations, reporting
   - Customer auth (Supabase SSR)
   - Row-level security for tenant isolation
   - Deployed to production (Vercel)

3. **Governance & Monitoring**
   - Health endpoints (/api/health, /api/health/detailed)
   - Observability modules (logs, alerts, canary)
   - Verification endpoints (/api/verify-deployment)
   - Monitoring & alerting infrastructure

4. **Deployment & CI/CD**
   - GitHub Actions CI (lint, type-check, test, build)
   - Vercel preview + production deployments
   - Supabase migrations automated
   - Smoke tests & integration tests enabled

### Duplication Inventory (Critical Finding)

**High-Severity Duplication**:

1. **Assessment/Assessments** (`app/api/assessment/` vs. `app/api/assessments/`)
   - Risk: Duplicate data models, sync issues
   - Status: Both exist, unclear which is primary

2. **Deployment Verification** (3 implementations)
   - `/api/deployment-verification/`
   - `/api/deployment-canary/`
   - `/api/verify-deployment/`
   - Risk: Unclear which is canonical; inconsistent verification logic

3. **Error Tracking** (3 implementations)
   - `/api/errors/`, `/api/error-tracking/`, `/api/error-rate/`
   - Risk: Split error surface, inconsistent alerting

4. **Governance Documents** (multiple versions)
   - FOUNDER-BRIEF (docs/governance/, docs/governor/, CLAUDE.md, root level)
   - DECISION_REGISTER (multiple variants, unclear sync)
   - FOUNDER-DECISION-BRIEF vs. FOUNDER-QUICK-REFERENCE (near duplicates)
   - Risk: Authority confusion, stale copies, contradictory guidance

5. **Runbook Duplication**
   - DEPLOYMENT-RUNBOOK-FOR-FOUNDER (root)
   - DEPLOYMENT_RUNBOOK.md (docs/)
   - GOVERNOR-DEPLOYMENT-GUIDE.md (docs/governor/)
   - OPERATIONAL_RUNBOOK.md (docs/infra/)
   - Risk: Inconsistent procedures, unclear which is current

6. **Checkpoint Files** (10+ snapshots)
   - CHECKPOINT-2026-07-10-* (3 variants)
   - CHECKPOINT-2026-07-12-*
   - CHECKPOINT-2026-07-16-*
   - Plus CHECKPOINT-AUDIT-_, CHECKPOINT-EXECUTION-_, CHECKPOINT-PRE-*
   - Risk: Archive bloat, unclear which is actionable

**Medium-Severity Duplication**:

- PRE-DEPLOYMENT/PRODUCTION-READINESS (multiple versions)
- RISK-* registers (scattered across docs/governance/, docs/governor/risks/)
- Customer communication templates (root + docs/customer/)
- Monitoring setup guides (docs/infra/ + docs/governance/)
- Launch checklists (root + docs/governance/)

### Active vs. Deprecated Code Systems

**Active**: ✅

- CEIS data extraction and reporting
- EURO AI SaaS platform (workspace, inventory, assessment, evidence, obligations)
- Supabase auth and schema
- Vercel CI/CD pipeline
- Observability endpoints

**Unclear Status** (needs clarification):

- `app/evolution/` — appears abandoned
- `app/hercules/` — referenced in docs, unclear if active or reference implementation
- `/api/cathedral-readiness/` — experimental?
- `lib/feature-flag-controller.ts` — no flag infrastructure visible

**Deprecated/Archive Candidates**:

- Multiple checkpoint files (should move to archive/)
- Phase-2/Phase-3 roadmaps (superseded by PHASE-2-ROADMAP.md and Phase 3 work)
- Old governance snapshots (pre-consolidation)

### Architecture Issues

**Problem 1: API Route Fragmentation**

- 42 API route directories with overlapping concerns
- No clear naming convention or domain structure
- Unclear separation between alpha/beta/stable features
- Risk: Inconsistent API contracts, maintenance burden

**Problem 2: Documentation Authority**

- ~300+ files with unclear versioning or currency
- Multiple "source of truth" files for same concept
- Checkpoint snapshots unclear if historical or current
- Risk: Founder confusion, decision contradictions

**Problem 3: Governance Layering**

- Multiple Governor versions mentioned (v2, v3, Governor Ω, Hercules, Evolution, Cathedral, Living Organism)
- CONSOLIDATION_REGISTER exists but not applied to codebase
- Risk: Institutional confusion about authority and process

**Problem 4: Test Coverage Gaps**

- Integration tests separated from standard test run (by design, per recent commit)
- Smoke tests exist but no monitoring of CI status
- No automated customer journey verification
- Risk: Behavioral regressions in customer flows undetected

**Problem 5: Observability Incomplete**

- Health endpoints exist but no centralized dashboard
- Monitoring setup documented but not integrated
- Alert configuration in docs, not in code
- Risk: Production incidents delayed in discovery

### Risk Baseline

**Critical Risks**:

1. **RISK-001: Documentation Authority Collapse**
   - Impact: Founder makes decisions based on contradictory docs
   - Mitigation: Single source of truth per topic (Stage 2)
   - Severity: 🔴 HIGH

2. **RISK-002: API Duplication**
   - Impact: Data inconsistency, maintenance burden, customer bugs
   - Mitigation: Deduplicate and consolidate API layer (Stage 2)
   - Severity: 🔴 HIGH

3. **RISK-003: Governance Fragmentation**
   - Impact: Unclear execution authority, decision paralysis
   - Mitigation: Consolidate to Governor Ω authority (Stage 1)
   - Severity: 🔴 HIGH

**Medium Risks**:

4. **RISK-004: Test/Verification Gaps**
   - Impact: Behavioral regressions in production
   - Mitigation: Integrated customer journey verification (Stage 6)
   - Severity: 🟡 MEDIUM

5. **RISK-005: Observability Incomplete**
   - Impact: Slow incident detection and response
   - Mitigation: Observability framework (Stage 8)
   - Severity: 🟡 MEDIUM

### Next Stages

| Stage    | Mission                                                 | Priority | Dependencies |
| -------- | ------------------------------------------------------- | -------- | ------------ |
| STAGE 1  | Governance Kernel — Establish Governor Ω authority      | CRITICAL | STAGE 0 ✅   |
| STAGE 2  | Repository Organization — Consolidate duplication       | CRITICAL | STAGE 1      |
| STAGE 3  | Engineering Standards — Workflow & templates            | HIGH     | STAGE 1      |
| STAGE 4  | Knowledge Architecture — Documentation structure        | HIGH     | STAGE 2      |
| STAGE 5  | Reusable Skills — Engineering automation                | MEDIUM   | STAGE 3      |
| STAGE 6  | Customer Journey — End-to-end verification              | HIGH     | STAGE 5      |
| STAGE 7  | Automation Architecture — Workflows & approval          | MEDIUM   | STAGE 6      |
| STAGE 8  | Observability — Monitoring, logging, dashboards         | MEDIUM   | STAGE 6      |
| STAGE 9  | Evidence Framework — Every feature evidence-backed      | HIGH     | STAGE 8      |
| STAGE 10 | Production Readiness — Final institutional verification | CRITICAL | All prior    |

---

## STAGE 0 Completion Evidence

**Verification Checklist**:

- ✅ Repository file structure mapped
- ✅ ~300+ documentation files inventoried
- ✅ API endpoints enumerated (42 route directories)
- ✅ Active systems identified (CEIS, EURO AI, Observability)
- ✅ Git history reviewed (50+ commits, 4 branches)
- ✅ Database schema assessed (stable, 1 cleanup migration recent)
- ✅ npm scripts verified (8 available, lint/test/build functional)
- ✅ Critical duplication identified (Assessment, Deployment, Errors, Governance docs)
- ✅ Risk baseline established (5 critical/medium risks documented)
- ✅ Architecture issues documented (5 problem areas identified)

**Completion Criteria Met**: All verification items complete. Stage 0 READY FOR STAGE 1.

**Remaining Risks**:

- RISK-001: Documentation authority confusion (mitigated by Stage 1)
- RISK-002: API duplication (mitigated by Stage 2)
- RISK-003: Governance fragmentation (mitigated by Stage 1)
- RISK-004: Test/verification gaps (mitigated by Stage 6)
- RISK-005: Observability incomplete (mitigated by Stage 8)

**Lessons Learned** (documented for LESSONS.md):

1. **Fast iteration at scale produces documentation debt**: 300+ files indicate parallel sessions with checkpoint snapshots instead of versioned living documents.
2. **Governance consolidation is prerequisite for architecture work**: Can't fix code duplication without authority clarity.
3. **Institutional build requires sequential stages**: Attempting all at once produces fragmentation observed here.

---

## STAGE 0 Completion Statement

**Status**: COMPLETE ✅  
**Evidence**: Repository Assessment Report, Duplication Inventory, Risk Baseline documented above.  
**Authority**: Governor Ω — READY TO PROCEED TO STAGE 1.

**Next Action**: See NEXT_ACTION.md and STAGE_1_ROADMAP.md (to be created).
