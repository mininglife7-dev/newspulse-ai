# Technical Debt Register
**Last Updated:** 2026-07-12  
**Trend:** ↓ Decreasing (observability + E2E tests reduce unknown risk, flaky tests eliminated)

---

## High Priority (Address Before Phase 3 Launch)

### DEBT-001: External Infrastructure Blockers
**Category:** Infrastructure  
**Severity:** CRITICAL (blocks customer signup, CI/CD)  
**Owner:** Founder (action required)  
**Effort to Fix:** ~9 minutes

- [ ] Deploy `supabase/schema.sql` in Supabase SQL editor
- [ ] Enable Email auth in Supabase → Project Settings → Auth
- [ ] Verify GitHub Actions CI pipeline is operational (check billing/rate limits)

**Impact if Not Fixed:** Cannot deploy Phase 3, cannot run full E2E tests, cannot collect checkpoint metrics  
**Rollback:** N/A (infrastructure-only)

### DEBT-002: Supabase Row-Level Security Audit
**Category:** Security  
**Severity:** HIGH  
**Owner:** Governor  
**Effort to Fix:** 4-6 hours (independent reviewer)

**Issue:** RLS policies for multi-tenant isolation not independently verified  
**Current State:** Policies implemented per governance spec, but no third-party audit  
**Risk:** Potential data leakage between workspaces if policy logic has gap  
**Plan:** Q3 2026 — Schedule external security review

---

## Medium Priority (Address in Q3 2026)

### DEBT-003: Endpoint Coverage Gaps in Observability
**Category:** Observability  
**Severity:** MEDIUM  
**Owner:** Governor  
**Effort to Fix:** 6-8 hours

**Issue:** 15 analytics/reporting endpoints lack observability instrumentation  
**Current:** 8 critical paths instrumented (health, workspace, dashboard, evidence, team, ai-systems, incident-response, audit-trail)  
**Missing:** Assessment queries, obligation reports, compliance analytics, team management, workspace queries  
**Impact:** Blind spot for non-critical paths; doesn't affect core functionality  
**Plan:** Post-launch (after Phase 3 decision), if time permits

### DEBT-004: Integration Test Database Fixtures
**Category:** Testing  
**Severity:** MEDIUM  
**Owner:** Governor  
**Effort to Fix:** 4-6 hours

**Issue:** Multi-step integration tests use mocked Supabase, not real database state  
**Current:** 11 customer journey tests pass with mocked client  
**Limitation:** Cannot validate actual data persistence across multi-step workflows  
**Plan:** Q3 2026 — Build test database fixtures with cleanup automation

### DEBT-005: Metrics Storage TTL Implementation
**Category:** Operations  
**Severity:** MEDIUM  
**Owner:** Governor  
**Effort to Fix:** 2-3 hours

**Issue:** Ring buffer metrics auto-expire per code, but no persistent storage yet  
**Current:** 10k in-memory entries, auto-rollover  
**Limitation:** Metrics lost on app restart; no historical trend analysis  
**Plan:** Q3 2026 — Implement metrics archival to Supabase with 7-day retention

---

## Low Priority (Monitor, Address in Q4 2026)

### DEBT-006: Performance Optimization Opportunities
**Category:** Performance  
**Severity:** LOW  
**Owner:** Governor  
**Effort to Fix:** 8-12 hours (depends on bottleneck analysis)

**Identified Opportunities:**
- Database query optimization (especially for obligations, assessments with many rows)
- Caching layer for compliance dashboard (currently re-computes on every request)
- Connection pooling for Supabase client

**Plan:** Post-launch profiling; optimize based on actual usage patterns

### DEBT-007: Error Message Standardization
**Category:** DX  
**Severity:** LOW  
**Owner:** Governor  
**Effort to Fix:** 3-4 hours

**Issue:** Some endpoints return inconsistent error shapes  
**Current:** Error handler provides standard format, but some routes predate it  
**Impact:** Minor (client can handle both formats)  
**Plan:** Q3 2026 — Audit and standardize all error responses

### DEBT-008: Documentation Gaps
**Category:** Operations  
**Severity:** LOW  
**Owner:** Governor  
**Effort to Fix:** 2-3 hours

**Missing:**
- Runbook for observability alert response
- Deployment rollback procedures
- Database migration reversal guide

**Plan:** Before Phase 3 launch, create comprehensive operations guide

---

## Resolved Debt

### ✓ RESOLVED-001: Lack of Observability
**Fixed:** 2026-07-11  
**Solution:** Implemented comprehensive logging, metrics, and monitoring dashboard  
**Tests Added:** 11 E2E + 25 security tests

### ✓ RESOLVED-002: No Customer Journey Validation
**Fixed:** 2026-07-11  
**Solution:** Created E2E integration tests for critical paths  
**Coverage:** Health check, workspace creation, error handling, rate limiting

### ✓ RESOLVED-003: Unknown Security Posture of Observability
**Fixed:** 2026-07-11  
**Solution:** 25-test security audit covering PII, injection, access control, GDPR  
**Outcome:** No critical vulnerabilities found

### ✓ RESOLVED-004: Flaky Timing Test in Performance Metrics
**Fixed:** 2026-07-12  
**Issue:** Performance metrics test was timing-sensitive; occasionally failed due to system scheduling variations  
**Solution:** Increased sleep duration from 50ms to 100ms, added tolerance (threshold 80ms instead of 50ms)  
**Outcome:** Test now reliably passes; all 945 tests stable

---

## Metrics

**Total Debt Items:** 14 (8 active, 4 resolved, 2 monitoring)  
**Critical Blockers:** 1 (Founder action required)  
**Effort to Clear All:** ~45-60 hours (10-12 weeks at 5 hours/week)  
**Target Completion:** End of Q3 2026

**Trend:**
- 2026-06-01: 22 items (pre-observability)
- 2026-07-11: 14 items (30% reduction)
- 2026-07-12: 14 items (4 resolved, test reliability improved)
- Target 2026-09-30: < 10 items
