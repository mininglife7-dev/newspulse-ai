# HERCULES Phase 5: Technical Debt Decision

**Date:** 2026-07-12  
**Status:** Decision Complete  
**Verdict:** 3 items required for v1.0, 0 deferred to v2.0

---

## Executive Summary

HERCULES v1.0 certification requires evaluating:

1. **DNA-012: Schema Migration Validator** — Zero-downtime database updates
2. **DNA-013: Feature Flag Controller** — A/B testing, gradual rollouts
3. **DNA-015: Deployment Canary** — Gradual rollout with automatic abort
4. **Multi-Enterprise Persistence** — Durable state across restarts

Each item classified by certification requirement and implementation urgency.

---

## Items Evaluated

### 1. DNA-012: Schema Migration Validator

**Description:** Zero-downtime database schema changes with backward compatibility verification

**Current Status:** Not implemented; design in governance backlog

**Assessment:**

| Criterion                  | Status   | Reasoning                                                                          |
| -------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Required for v1.0          | ✅ YES   | Cathedral launches to German enterprise 2026-08-15; requires safe schema evolution |
| Required before production | ✅ YES   | Any production database schema change without validation risks downtime            |
| Implemented                | ❌ NO    | Currently only ad-hoc SQL in Supabase SQL editor                                   |
| Complexity                 | MEDIUM   | Validates: backward compatibility, no implicit data loss, rollback safety          |
| Risk if skipped            | CRITICAL | Silent data corruption, customer downtime, EU AI Act audit failure                 |

**Decision:** **IMPLEMENT FOR V1.0**

**Rationale:** Cathedral will need to evolve schema as it onboards German enterprise (compliance requirements, reporting structures, audit trails). Without Schema Migration Validator, any change risks:

- Breaking running queries (downtime)
- Silent data loss (compliance violation)
- Impossible rollback (irreversible data change)

**Implementation Plan:**

1. Create `lib/schema-migration-validator.ts` with:
   - Backward compatibility checker (old queries still work)
   - Data loss detector (no `ALTER ... DROP COLUMN` without validation)
   - Rollback safety analyzer (can restore to previous schema)
2. Add as DNA-GOV-012 with 8-12 tests
3. Integrate with deployment pipeline: block schema changes that fail validation
4. Test against real Supabase schema evolution scenarios

**Target Completion:** Before first customer pilot (2026-09-01)

---

### 2. DNA-013: Feature Flag Controller

**Description:** A/B testing and gradual feature rollout with independent kill switches

**Current Status:** Not implemented; on backlog

**Assessment:**

| Criterion                  | Status | Reasoning                                                                                   |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Required for v1.0          | ✅ YES | German enterprise will expect controlled feature rollout, not all-or-nothing deployments    |
| Required before production | ✅ YES | Enables safe gradual rollout and rapid incident response (feature disable ≈ quick rollback) |
| Implemented                | ❌ NO  | All features always enabled on production                                                   |
| Complexity                 | MEDIUM | Requires: runtime feature state, per-enterprise override, telemetry                         |
| Risk if skipped            | HIGH   | Cannot do gradual rollouts, cannot isolate feature-specific incidents                       |

**Decision:** **IMPLEMENT FOR V1.0**

**Rationale:** Cathedral's compliance mission requires:

- Gradual feature rollout to new customer (don't destabilize with unvetted features)
- Quick feature disable on incidents (faster than code rollback)
- Per-customer feature control (different EU AI Act requirements by jurisdiction)

**Implementation Plan:**

1. Create `lib/feature-flags.ts` with:
   - Runtime feature registry (enterprise-scoped)
   - Per-enterprise toggle overrides
   - Telemetry hooks (track feature adoption)
2. Add as DNA-GOV-013 with 10-15 tests
3. Integrate with API routes: check feature flag before executing feature code
4. Add dashboard control for Founder: enable/disable features per enterprise

**Target Completion:** Before customer pilot (2026-09-01)

---

### 3. DNA-015: Deployment Canary

**Description:** Gradual rollout with automatic abort on error rate spike

**Current Status:** Not implemented; on backlog

**Assessment:**

| Criterion                  | Status         | Reasoning                                                                                        |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| Required for v1.0          | ✅ YES         | German enterprise will have production dependencies on Cathedral; cannot tolerate broken deploys |
| Required before production | ⚠️ CONDITIONAL | Required if Vercel auto-deploys from main; can skip if manual deployment gating exists           |
| Implemented                | ❌ NO          | All commits to main auto-deploy to production immediately                                        |
| Complexity                 | MEDIUM-HIGH    | Requires: traffic shaping, error rate monitoring, automatic abort logic                          |
| Risk if skipped            | HIGH           | Broken code reaches customer immediately; no safety net                                          |

**Decision:** **IMPLEMENT FOR V1.0 (Conditional)**

**Rationale:**

- Vercel auto-deploys all commits to main
- If a commit breaks the service, customer sees impact immediately
- Canary deployment can catch this within seconds and auto-abort
- Risk of skip: production outage during customer onboarding

**Implementation Plan:**

1. Create `lib/deployment-canary.ts` with:
   - Gradual traffic routing (10% → 25% → 50% → 100%)
   - Error rate monitoring during each phase
   - Automatic abort if error rate > threshold (e.g., 5% during canary)
2. Add as DNA-GOV-015 with 12-15 tests
3. Integrate with Vercel deployment pipeline: wait for canary success before full release
4. Telemetry: log all canary decisions for audit trail

**Target Completion:** Before customer onboarding (2026-09-01)

---

### 4. Multi-Enterprise Persistence

**Description:** Durable state storage for HERCULES kernel across server restarts

**Current Status:** Partially implemented (in-memory serialization, no database persistence)

**Assessment:**

| Criterion                  | Status     | Reasoning                                                                    |
| -------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Required for v1.0          | ✅ YES     | Kernel state (enterprises, missions, tasks) must survive server restart      |
| Required before production | ✅ YES     | Without persistence, every server restart loses all task state               |
| Implemented                | ⚠️ PARTIAL | State serialization implemented; durability to disk/database NOT implemented |
| Complexity                 | MEDIUM     | Requires: database schema, transaction safety, recovery validation           |
| Risk if skipped            | CRITICAL   | Server restart = complete mission loss, audit trail loss, all tasks lost     |

**Decision:** **IMPLEMENT FOR V1.0 (IMMEDIATE)**

**Rationale:**

- HERCULES kernel currently stores state only in memory
- If server restarts, all enterprise state is lost (missions, tasks, events, audit)
- Cathedral customer onboarding will require persistent missions and task queues
- Vercel deployments cause server restarts; state must survive this

**Implementation Plan:**

1. Extend Supabase schema with HERCULES tables:
   - `hercules_enterprises` (enterprise metadata)
   - `hercules_missions` (mission state)
   - `hercules_tasks` (task queue)
   - `hercules_events` (event log)
   - `hercules_audit` (audit trail)
2. Create `lib/hercules-persistence.ts` with:
   - Checkpoint writer (serialize kernel state → Supabase)
   - Checkpoint reader (restore kernel state ← Supabase on startup)
   - Transaction safety (atomic multi-table updates)
3. Add 15-20 tests:
   - Checkpoint creation and restoration
   - Concurrent checkpoint writes
   - Concurrent enterprise creation during checkpoint
   - Recovery from partial writes
4. Integrate with kernel lifecycle:
   - Checkpoint every 30 seconds (background)
   - Restore on kernel startup
5. Add monitoring: DNA-GOV system tracks persistence success rate

**Target Completion:** URGENT — Before Phase 6 (Failure-Driven Repair)

---

## Summary Decision Matrix

| Item                         | v1.0 | Production | Status              | Effort      | Start  |
| ---------------------------- | ---- | ---------- | ------------------- | ----------- | ------ |
| DNA-012 Schema Migrator      | ✅   | ✅         | NOT STARTED         | MEDIUM      | Now    |
| DNA-013 Feature Flags        | ✅   | ✅         | NOT STARTED         | MEDIUM      | Now    |
| DNA-015 Deployment Canary    | ✅   | ✅         | NOT STARTED         | MEDIUM-HIGH | Now    |
| Multi-Enterprise Persistence | ✅   | ✅         | PARTIAL (in-memory) | MEDIUM      | URGENT |

---

## Phase 5 Implementation Order

1. **IMMEDIATE (Next 2-3 hours):** Multi-Enterprise Persistence
   - Extends existing HERCULES kernel
   - Unblocks Phase 6 (requires durable state)
   - Prerequisite for all subsequent testing

2. **HIGH PRIORITY (Next 2 hours):** DNA-012 Schema Migration Validator
   - 2026-08-15 Production Launch approaches
   - Customer onboarding will require schema evolution
   - No schema safety currently exists

3. **HIGH PRIORITY (Next 2 hours):** DNA-013 Feature Flags
   - Enables gradual rollout (German enterprise requirement)
   - Enables rapid incident response
   - Prerequisite for confident customer onboarding

4. **MEDIUM PRIORITY (Next 3 hours):** DNA-015 Deployment Canary
   - Protects production from broken commits
   - Requires traffic routing (more complex)
   - Can be partially deferred if manual deployment gating exists

---

## Verification Checklist

- [ ] Multi-Enterprise Persistence implemented and verified
- [ ] DNA-012 Schema Validator implemented with 8+ tests
- [ ] DNA-013 Feature Flags implemented with 10+ tests
- [ ] DNA-015 Deployment Canary implemented with 12+ tests
- [ ] All new tests passing (total test count: 404+ → 440+)
- [ ] Production build successful
- [ ] TypeScript strict mode clean
- [ ] Supabase schema updated for persistence
- [ ] Persistence checkpoint/restore tested

---

## Risk Mitigation

If any implementation falls behind:

1. **Schema Migrator (DNA-012):** Can defer non-breaking schema changes to Phase 6; customer pilot may not require DB schema evolution
2. **Feature Flags (DNA-013):** Can simulate with URL parameters; full rollout control deferred to Phase 6
3. **Deployment Canary (DNA-015):** Can implement manual gating (require approval before 100% traffic); automatic abort deferred to Phase 6
4. **Persistence:** CANNOT defer — kernel must survive restarts; implement this first

---

## Next Phase Gate

**PHASE 5 COMPLETE when:**

- ✅ 4/4 items classified and decision documented
- ✅ 3/3 critical items (Persistence, Schema, Feature Flags) implemented
- ✅ Deployment Canary implemented OR manual gating confirmed sufficient
- ✅ All new tests passing
- ✅ Production build successful

**Ready for PHASE 6:** Failure-Driven Repair Loop
