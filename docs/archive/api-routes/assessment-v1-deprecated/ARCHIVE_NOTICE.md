# Archived: /api/assessment (v1)

**Archived Date**: 2026-07-16  
**Archived By**: Governor Ω (STAGE 2 Phase 2: API Consolidation)  
**Reason**: Superseded by `/api/assessments/` (v2)

## What This Was

Legacy assessment endpoint providing basic CRUD operations:

- `GET /api/assessment/` — List all assessments for workspace
- `POST /api/assessment/` — Create new assessment

## Why It Was Archived

The newer `/api/assessments/` endpoint (v2) provides:

- More complete feature set (query by systemId or assessmentId)
- Risk classification integration via `lib/risk-assessment`
- Automatic obligation generation and linking
- Proper TypeScript typing and error handling
- Dynamic rendering for fresh data

v1 was an earlier iteration that is no longer used. All active code has been migrated to v2.

## Migration Path

If you find a reference to `/api/assessment/`:

- Change to `POST /api/assessments/` for creating assessments
- Change to `GET /api/assessments?systemId=<id>` for fetching by system
- Change to `GET /api/assessments?assessmentId=<id>` for fetching by assessment

## Reference

- **Canonical v2**: `/app/api/assessments/`
- **Consolidation Plan**: `/docs/governor/STAGE_2_API_CONSOLIDATION_PLAN.md`
- **Risk Register**: `/docs/governor/risks/RISK-REGISTER.md` (RISK-002)
