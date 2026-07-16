# Archived: /api/errors (Skeleton Implementation)

**Archived Date**: 2026-07-16  
**Archived By**: Governor Ω (STAGE 2 Phase 2: API Consolidation)  
**Reason**: Incomplete skeleton implementation with hardcoded example data

## What This Was

Placeholder error metrics endpoint:
- `GET /api/errors?last_hours=<n>` — Fetch error metrics for time window
- Returned hardcoded example response structure with no actual data
- Contained status classification logic (critical/warning/healthy)

## Why It Was Archived

This was a skeleton/placeholder implementation that was never completed:
- No actual error data collection (returned empty metrics with hardcoded examples)
- No database or tracking backend integration
- Functionality is properly provided by two complete, active endpoints:

1. **`/api/error-tracking/`** (Primary Error Capture)
   - Captures individual error events
   - Aggregates error metrics
   - Formats alerts based on severity
   - GET/POST/DELETE for full CRUD

2. **`/api/error-rate/`** (Monitoring & Thresholds)
   - Monitors error rate across endpoints
   - Enforces threshold-based alerting
   - DNA-GOV-004 endpoint (called every 5 minutes)
   - Detects critical endpoint failures

## Migration Path

If you find references to `/api/errors/`:
- For capturing errors: Use `/api/error-tracking/` with POST endpoint
- For monitoring error rate: Use `/api/error-rate/` GET endpoint
- Both endpoints provide comprehensive error handling that this skeleton did not

## Reference

- **Canonical Endpoints**: `/app/api/error-tracking/`, `/app/api/error-rate/`
- **Consolidation Plan**: `/docs/governor/STAGE_2_API_CONSOLIDATION_PLAN.md`
- **Risk Register**: `/docs/governor/risks/RISK-REGISTER.md` (RISK-002)
