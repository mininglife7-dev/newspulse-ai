# STAGE 2 Phase 2: API Route Consolidation Plan

**Status**: Implementation Ready  
**Date**: 2026-07-16  
**Governor**: Governor Ω  
**Phase**: Documentation Consolidation Complete → API Consolidation In Progress

---

## Executive Summary

This document consolidates the API route duplication analysis from STAGE 0 and establishes a verified consolidation strategy for STAGE 2 Phase 2. Three sets of duplicate/redundant endpoints have been identified and evaluated. The consolidation requires archiving 3 routes and updating associated documentation.

---

## Consolidation Analysis

### 1. Assessment Routes

**Routes Identified**:

- `/api/assessment/` - Basic CRUD (GET all, POST create)
- `/api/assessments/` - Advanced implementation with risk classification and obligation auto-generation

**Analysis**:

| Aspect              | `/api/assessment/` | `/api/assessments/`                                                           |
| ------------------- | ------------------ | ----------------------------------------------------------------------------- |
| Implementation Size | 165 lines          | 294 lines                                                                     |
| Features            | Basic GET/POST     | GET (by systemId/assessmentId), POST (create/update with risk classification) |
| Risk Classification | Manual via body    | Automatic via `classifyRisk()` from `lib/risk-assessment`                     |
| Obligation Auto-Gen | None               | Yes - auto-links obligations to assessment                                    |
| Dynamic Rendering   | No                 | Yes (`export const dynamic = 'force-dynamic'`)                                |
| Active in Code      | GET only, basic    | GET (query-based), POST (full workflow)                                       |

**Decision**: Archive `/api/assessment/`  
**Reason**: `/api/assessments/` is more complete, properly typed, integrates with risk assessment library, and includes obligation auto-generation. `/api/assessment/` appears to be an earlier iteration.

**Action**:

- Move `/api/assessment/` → `/docs/archive/api-routes/assessment-v1-deprecated/`
- Keep `/api/assessments/` as canonical
- Search codebase for references to update

---

### 2. Deployment Verification Routes

**Routes Identified**:

- `/api/deployment-verification/` - Comprehensive health check + rollback decision engine (258 lines)
- `/api/deployment-canary/` - Canary deployment gradual rollout strategy (450+ lines)
- `/api/verify-deployment/` - Simple CI/CD deployment status check (110 lines)

**Analysis**:

| Aspect         | `deployment-verification`                             | `deployment-canary`                   | `verify-deployment`                      |
| -------------- | ----------------------------------------------------- | ------------------------------------- | ---------------------------------------- |
| Purpose        | Health checks + rollback decisions                    | Gradual code rollout 10%→25%→50%→100% | CI/CD status verification                |
| Implementation | GET/POST/PUT with rollback engine                     | GET/POST with canary metrics          | GET only with GitHub API integration     |
| Libraries Used | `deployment-verification`, `rollback-decision-engine` | `deployment-canary`                   | `deployment-verifier`                    |
| Used in Code   | Yes - incident-response module                        | Specialized feature                   | No - only referenced in docs (genome.ts) |
| Status         | Active in incident orchestration                      | Specialized feature                   | Documented but unused                    |

**Decision**: Archive `/api/verify-deployment/`  
**Reason**: Not used in code (only referenced in documentation). `/api/deployment-verification/` and `/api/deployment-canary/` serve distinct features and should both be retained.

**Action**:

- Move `/api/verify-deployment/` → `/docs/archive/api-routes/verify-deployment-deprecated/`
- Keep `/api/deployment-verification/` and `/api/deployment-canary/` as complementary endpoints
- Update genome.ts reference to clarify which endpoints are active

---

### 3. Error Tracking Routes

**Routes Identified**:

- `/api/errors/` - Skeleton implementation with hardcoded example data (86 lines)
- `/api/error-tracking/` - Complete error tracker with capture/aggregate/metrics (158 lines)
- `/api/error-rate/` - Error rate monitoring endpoint with thresholds (91 lines)

**Analysis**:

| Aspect         | `/api/errors/`               | `/api/error-tracking/`                 | `/api/error-rate/`               |
| -------------- | ---------------------------- | -------------------------------------- | -------------------------------- |
| Implementation | Skeleton/stub                | Complete with ErrorTracker class       | Complete monitoring endpoint     |
| Features       | Hardcoded response structure | Capture, aggregate, report errors      | Monitor error rate thresholds    |
| Data Source    | None (example data)          | In-memory ErrorTracker                 | Collected metrics from endpoints |
| Libraries Used | None (local types only)      | `error-tracking`                       | `error-rate-monitor`             |
| Used in Code   | No                           | Yes - imported by production-wiring.ts | Yes - part of monitoring DNA     |
| Status         | Example/placeholder          | Active production code                 | Active monitoring endpoint       |

**Decision**: Archive `/api/errors/`  
**Reason**: Skeleton implementation that was never completed. `/api/error-tracking/` and `/api/error-rate/` are both complete and serve complementary purposes in the monitoring architecture.

**Action**:

- Move `/api/errors/` → `/docs/archive/api-routes/errors-skeleton/`
- Keep `/api/error-tracking/` and `/api/error-rate/` as active monitoring endpoints
- Verify no client code references `/api/errors/`

---

## Implementation Checklist

- [ ] **Phase 2.1**: Create archive directories
  - [ ] `docs/archive/api-routes/` (base directory)
  - [ ] `docs/archive/api-routes/assessment-v1-deprecated/`
  - [ ] `docs/archive/api-routes/verify-deployment-deprecated/`
  - [ ] `docs/archive/api-routes/errors-skeleton/`

- [ ] **Phase 2.2**: Move routes to archive
  - [ ] Move `app/api/assessment/` with commit message
  - [ ] Move `app/api/verify-deployment/` with commit message
  - [ ] Move `app/api/errors/` with commit message

- [ ] **Phase 2.3**: Update references
  - [ ] Search codebase for imports of archived routes
  - [ ] Update `lib/ceis/genome.ts` to reflect canonical endpoints
  - [ ] Verify no broken references remain

- [ ] **Phase 2.4**: Documentation
  - [ ] Create `docs/archive/api-routes/README.md` with consolidation summary
  - [ ] Update `docs/API.md` to remove references to archived routes
  - [ ] Update `docs/governor/PROJECT_STATE.md` with completion status

- [ ] **Phase 2.5**: Verification
  - [ ] `npm run type-check` — confirm no TypeScript errors
  - [ ] `npm run lint` — confirm no ESLint violations
  - [ ] `npm run build` — confirm build succeeds
  - [ ] Verify no client code calls archived endpoints

---

## Risk Assessment

**RISK**: Breaking changes to public API  
**Mitigation**: Archived routes are not documented in API.md as public endpoints; only internal monitoring/ops routes. No customer-facing breaking changes.

**RISK**: Incomplete codebase search  
**Mitigation**: Run comprehensive grep before archival; verify with type-check after move.

**RISK**: Deployment verification references in CI/CD  
**Mitigation**: `/api/deployment-verification/` and `/api/deployment-canary/` remain available. `/api/verify-deployment/` was only in documentation, not actual CI/CD.

---

## Success Criteria

✅ All three deprecated routes moved to archive  
✅ No broken TypeScript references  
✅ No ESLint violations  
✅ Build succeeds  
✅ Documentation updated to reflect canonical endpoints  
✅ PR submitted for review

---

## References

- **STAGE 0**: `docs/governance/IMPLEMENTATION_ROADMAP.md` (API duplication inventory)
- **STAGE 2 Phase 1**: `docs/governor/STAGE_2_ROADMAP.md` (documentation consolidation)
- **Active**: `docs/API.md` (canonical API reference)
- **Risk Register**: `docs/governor/risks/RISK-REGISTER.md` (RISK-002: API route duplication)

---

## Next Action

Proceed with Phase 2.2 implementation (move routes to archive) upon Governor Ω verification of this plan.
