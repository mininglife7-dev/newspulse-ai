# Archived API Routes

This directory contains API routes that have been consolidated or superseded as part of the Alpha Cathedral institutional build program.

**Consolidation Date**: 2026-07-16  
**Phase**: STAGE 2 Phase 2: API Route Consolidation  
**Decision Authority**: Governor Ω

---

## Archive Contents

### 1. Assessment (v1) — Deprecated

**Path**: `assessment-v1-deprecated/`  
**Original Route**: `/api/assessment/`  
**Status**: Archived  
**Reason**: Superseded by `/api/assessments/` (v2) which includes risk classification and obligation auto-generation

**What Changed**:

- Remove basic assessment CRUD at `/api/assessment/`
- Use `/api/assessments/` for all assessment operations

**Files**:

- `route.ts` — Original implementation (165 lines)
- `[id]/` — Subdirectory with ID-based operations
- `ARCHIVE_NOTICE.md` — Consolidation details

---

### 2. Verify Deployment — Deprecated

**Path**: `verify-deployment-deprecated/`  
**Original Route**: `/api/verify-deployment/`  
**Status**: Archived  
**Reason**: Simple status check superseded by comprehensive `/api/deployment-verification/` and `/api/deployment-canary/` endpoints

**What Changed**:

- Remove simple CI/CD status check at `/api/verify-deployment/`
- Use `/api/deployment-verification/` for health checks with rollback decisions
- Use `/api/deployment-canary/` for gradual deployment monitoring

**Files**:

- `route.ts` — Original implementation (110 lines)
- `ARCHIVE_NOTICE.md` — Consolidation details

**Note**: This endpoint was referenced in documentation (genome.ts) but not actively used in production code.

---

### 3. Errors (Skeleton) — Incomplete

**Path**: `errors-skeleton/`  
**Original Route**: `/api/errors/`  
**Status**: Archived  
**Reason**: Incomplete skeleton implementation with hardcoded example data

**What Changed**:

- Remove skeleton error metrics endpoint at `/api/errors/`
- Use `/api/error-tracking/` for error capture and aggregation
- Use `/api/error-rate/` for error rate monitoring and alerting

**Files**:

- `route.ts` — Skeleton implementation (86 lines)
- `ARCHIVE_NOTICE.md` — Consolidation details

**Note**: This was a placeholder implementation that was never completed. Two complete, active endpoints now provide the functionality.

---

## Consolidation Summary

| Original Route            | Status   | Replacement                                 | Reason                                               |
| ------------------------- | -------- | ------------------------------------------- | ---------------------------------------------------- |
| `/api/assessment/`        | Archived | `/api/assessments/`                         | v1 superseded by more complete v2                    |
| `/api/verify-deployment/` | Archived | `/api/deployment-verification/`             | Simple check replaced by comprehensive health checks |
| `/api/errors/`            | Archived | `/api/error-tracking/` + `/api/error-rate/` | Incomplete skeleton replaced by complete monitoring  |

---

## Impact Assessment

**Code Changes Required**: None  
**Reason**: None of the archived routes were actively used in production code.

**Documentation Updates Required**:

- `docs/API.md` — Remove references to archived routes
- `lib/ceis/genome.ts` — Clarify active monitoring endpoints
- `docs/governor/PROJECT_STATE.md` — Record consolidation completion

---

## Recovery Instructions

If you need to restore an archived route:

1. Copy the route back from the archive:

   ```bash
   mv docs/archive/api-routes/<route>/ app/api/<route>/
   ```

2. Update `PROJECT_STATE.md` to revert consolidation status

3. Read the `ARCHIVE_NOTICE.md` in the archive to understand why it was consolidated

---

## References

- **Consolidation Plan**: `docs/governor/STAGE_2_API_CONSOLIDATION_PLAN.md`
- **Original Analysis**: `docs/governance/IMPLEMENTATION_ROADMAP.md` (API Duplication section)
- **Risk Register**: `docs/governor/risks/RISK-REGISTER.md` (RISK-002: API route duplication)
- **API Reference**: `docs/API.md` (current canonical endpoints)
- **Project State**: `docs/governor/PROJECT_STATE.md` (STAGE 2 completion tracking)
