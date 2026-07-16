# STAGE 2: Repository Organization — Detailed Implementation Roadmap

**Authority**: Governor Ω (STAGE 1 complete)  
**Status**: EXECUTING  
**Date Started**: 2026-07-16

---

## Mission

Consolidate repository documentation and API architecture into clear, maintainable structures.

**Objectives**:
1. Move ~150 old files to `docs/archive/` (checkpoint snapshots, old roadmaps, deprecated runbooks)
2. Consolidate governance documentation (single source of truth per topic)
3. Deduplicate API endpoints (assessment/assessments, deployment verification, error tracking)
4. Clarify experimental systems (evolution/hercules/cathedral-readiness)
5. Create documentation taxonomy
6. Verify no broken links

---

## Documentation Consolidation Plan

### Current State
- **Root-level files**: 27 markdown files (snapshots, launch docs, deployment runbooks)
- **docs/ directory**: 176 markdown files (governance, infrastructure, customer, compliance)
- **Total**: 203 markdown files
- **Problem**: Duplication (multiple versions of same docs), sprawl (unclear hierarchy)

### Target State
- **Root-level**: <5 files (README.md, CONTRIBUTING.md, CLAUDE.md, maybe 1-2 others)
- **docs/** structure:
  ```
  docs/
  ├── governance/           (authoritative governance: 8-10 files)
  ├── infrastructure/       (deployment, monitoring, runbooks: 5-7 files)
  ├── customer/            (onboarding, success: 4-5 files)
  ├── architecture/        (system design, API docs: 3-4 files)
  ├── compliance/          (policies, data handling: 2-3 files)
  └── archive/             (historical snapshots, superseded docs: ~150 files)
  ```
- **Total**: ~40 authoritative files + 150 archived

### Files to Archive (Move to docs/archive/)

**Category: Checkpoint Snapshots** (~10 files)
- `CHECKPOINT-*.md` (all variants: -2026-07-10-AFTERNOON, -2026-07-12-EVENING, etc.)
- `SESSION-CHECKPOINT-*.md`
- `CHECKPOINT-AUDIT-*.md`
- `CHECKPOINT-*-PROCEDURES.md`
- Reason: Snapshots of historical state, not living documents

**Category: Old Roadmaps & Phases** (~15 files)
- `PHASE-*.md` (all variants)
- `PHASE_*_ROADMAP.md`
- `EVOLUTION-STATUS-*.md`
- `GOVERNOR-EVOLUTION-CHECKPOINT-*.md`
- Reason: Superseded by IMPLEMENTATION_ROADMAP.md

**Category: Root-Level Launch/Deployment Docs** (~20 files)
- `LAUNCH-DAY-*.md` (all variants)
- `LAUNCH-READINESS-*.md`
- `WEEK-1-*.md`
- `POST-DEPLOYMENT-*.md`
- `DEPLOYMENT-*.md` (at root, duplicate of docs/ versions)
- `FOUNDER-*.md` (at root, duplicates of docs/ governance versions)
- `EXECUTIVE-*.md` (at root)
- `HANDOFF-*.md`
- Reason: Historical launch snapshots, superseded by continuous governance

**Category: Duplicate Governance Docs** (~8 files)
- Duplicate FOUNDER-BRIEF versions
- Duplicate FOUNDER-DECISION-BRIEF versions
- Duplicate runbooks (DEPLOYMENT-RUNBOOK-FOR-FOUNDER.md at root duplicate of docs/ versions)
- Reason: Keep authoritative version in docs/governance/, move duplicates to archive

**Category: Duplicate Customer Docs** (~5 files)
- Duplicate communication templates
- Old pilot playbooks
- Reason: Keep active versions in docs/customer/, move old variants

**Category: Old Infrastructure Docs** (~12 files)
- `PREDEPLOYMENT-AUDIT.md`
- `INDEPENDENT_VV_AUDIT.md`
- `AUTONOMOUS-*-REPORT-*.md`
- Various dated infrastructure reports
- Reason: Historical verification snapshots, superseded by continuous monitoring

**Category: Old Product/Integrity Docs** (~10 files)
- `BUTTON-STATUS-REPORT.md`
- `DASHBOARD-CONSISTENCY-*.md`
- Old product health snapshots
- Reason: Historical snapshots, not living documents

**Category: Miscellaneous Old Docs** (~50+ files across docs/governance/, docs/infra/, docs/governor/)
- Dated checkpoint reports (FINAL-24H-CHECKPOINT, SESSION-STATUS, etc.)
- Old verification reports (PRE-MERGE-VERIFICATION, PRE-LAUNCH-VERIFICATION)
- Utility docs (MEASUREMENT-WINDOW-*, CLAIM-PROTOCOL, GITHUB-ACTIONS-DIAGNOSTIC)
- Reason: Historical context, not actively maintained

**Total to Archive**: ~150 files

### Authoritative Documents to Keep (~40 files)

**Governance** (8 files):
- ✅ FOUNDER_ADVISOR_CONSTITUTION.md
- ✅ FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md
- ✅ FOUNDER_COMMUNICATION_CONSTITUTION.md
- ✅ AGENTS.md (STAGE 1)
- ✅ GOVERNOR_OPERATIONAL_FRAMEWORK.md (STAGE 1)
- ✅ DECISION_LOG.md (STAGE 1)
- ✅ REPORTING_STANDARDS.md (STAGE 1)
- ✅ IMPLEMENTATION_ROADMAP.md (all 10 stages)

**State & Execution** (5 files):
- ✅ PROJECT_STATE.md
- ✅ NEXT_ACTION.md
- ✅ STAGE_1_COMPLETION_CHECKLIST.md
- ⬜ STAGE_2_ROADMAP.md (this file, being created)
- ⬜ STAGE_2_COMPLETION_CHECKLIST.md (to create)

**Infrastructure & Operations** (6 files):
- ✅ DEPLOYMENT_RUNBOOK.md (canonical, in docs/infra/)
- ✅ DISASTER_RECOVERY_RUNBOOK.md
- ✅ INCIDENT_RESPONSE_PLAYBOOKS.md
- ✅ PRODUCTION_READINESS_CHECKLIST.md
- ✅ CI_GOVERNANCE.md or GITHUB-ACTIONS-*.md (TBD: select canonical)
- ✅ MONITORING_ALERT_CONFIGURATION.md

**Customer & Onboarding** (4 files):
- ✅ CUSTOMER_ONBOARDING_GUIDE.md
- ✅ QUICK_START_GUIDE.md (in docs/customer/)
- ✅ SUPPORT_SLA_AND_ESCALATION.md
- ✅ COMMUNICATION_TEMPLATES.md

**Compliance** (3 files):
- ✅ DATA_RETENTION_DELETION_POLICY.md
- ✅ PRODUCTION-CERTIFICATION-POLICY.md
- ✅ API.md or API_CLIENT_GUIDE.md (API documentation)

**Architecture** (3 files):
- ✅ CEIS.md (data system)
- ✅ ROADMAP.md (product roadmap)
- ✅ GETTING_STARTED.md

**Total**: ~40 authoritative documents (clean, living, actively maintained)

---

## API Route Consolidation Plan

### Current Duplicates

**Assessment Endpoints**:
- `/api/assessment/` (primary implementation)
- `/api/assessments/` (duplicate, needs consolidation)
- Decision: Keep `/api/assessment/` as canonical
- Action: Consolidate `assessments/` into `assessment/`, update customer references

**Deployment Verification Endpoints** (3 implementations):
- `/api/deployment-verification/` (comprehensive)
- `/api/deployment-canary/` (canary testing)
- `/api/verify-deployment/` (verification)
- Decision: Consolidate to `/api/deployment-verification/` (most complete)
- Action: Move `deployment-canary/` and `verify-deployment/` logic into `deployment-verification/`

**Error Tracking Endpoints** (3 implementations):
- `/api/errors/` (primary)
- `/api/error-tracking/` (tracking)
- `/api/error-rate/` (rates/analytics)
- Decision: Keep `/api/errors/` as primary, consolidate tracking into it
- Action: Move `error-tracking/` and `error-rate/` logic into `errors/`

**Experimental/Unclear Status**:
- `/api/evolution/` — Clarify: keep, archive, or activate?
- `/api/hercules/` — Clarify: keep, archive, or activate?
- `/api/cathedral-readiness/` — Clarify: keep, archive, or activate?
- Decision: Archive for now (can be resurrected if needed)
- Action: Move to `app/api/experimental/` or document decision in DECISION_LOG.md

### Consolidation Steps

1. **Audit each duplicate**: Understand what code is in each
2. **Identify unique functionality**: What does X do that Y doesn't?
3. **Merge implementations**: Combine into canonical endpoint
4. **Test consolidation**: Verify all customer flows still work
5. **Update documentation**: API docs reflect new structure
6. **Deprecation timeline** (if customers use deprecated endpoints):
   - Add deprecation warning to response headers
   - Log usage to understand customer impact
   - Provide 30-day migration window (if needed)

---

## Execution Checklist

### Phase 1: Documentation Consolidation

- [ ] Create `docs/archive/` directory structure
- [ ] Move ~150 old files to `docs/archive/`
  - [ ] Create `docs/archive/checkpoints/` (10 checkpoint files)
  - [ ] Create `docs/archive/phases/` (15 phase/roadmap files)
  - [ ] Create `docs/archive/launch/` (20 launch files)
  - [ ] Create `docs/archive/deprecated/` (remaining old docs)
- [ ] Delete or move root-level duplicate files (27 files)
- [ ] Update all internal links (verify no broken references)
- [ ] Update README.md to point to authoritative docs
- [ ] Create `docs/INDEX.md` (navigation/taxonomy)

### Phase 2: Documentation Cleanup

- [ ] Review docs/governance/ and consolidate duplicates
- [ ] Review docs/infra/ and consolidate duplicates
- [ ] Review docs/customer/ and consolidate duplicates
- [ ] Create `docs/architecture/` directory (if needed)
- [ ] Verify all links are valid
- [ ] Generate link report (broken links, if any)

### Phase 3: API Route Consolidation

- [ ] Audit `assessment/` vs `assessments/`
- [ ] Merge code into canonical endpoint
- [ ] Audit deployment verification (3 endpoints)
- [ ] Consolidate to `deployment-verification/`
- [ ] Audit error tracking (3 endpoints)
- [ ] Consolidate to `errors/`
- [ ] Decide on experimental: `evolution/`, `hercules/`, `cathedral-readiness/`
- [ ] Test consolidation (verify API still works)

### Phase 4: Verification & Reporting

- [ ] Run `npm run lint` (no errors)
- [ ] Run `npm run type-check` (no errors)
- [ ] Run `npm run test` (all pass)
- [ ] Generate link validation report
- [ ] Update PROJECT_STATE.md (Stage 2 complete)
- [ ] Create STAGE_2_COMPLETION_CHECKLIST.md
- [ ] Commit and push
- [ ] Update PR with completion evidence

---

## Estimated Timeline

| Phase | Work | Estimated Time |
|-------|------|-----------------|
| 1 | Documentation consolidation (move 150 files) | 1 hour |
| 2 | Documentation cleanup & link verification | 1 hour |
| 3 | API route consolidation | 1.5 hours |
| 4 | Verification, testing, reporting | 1 hour |
| **Total** | **STAGE 2 complete** | **~4.5 hours** |

---

## Risk Assessment

**Risks of Consolidation**:
- 🟡 MEDIUM: Breaking customer API calls if old endpoints are removed without deprecation
- 🟡 MEDIUM: Broken links in documentation if references not updated
- 🟢 LOW: Code merge conflicts (documentation only in Phase 1-2, code changes are localized in Phase 3)

**Mitigations**:
- Keep old routes as aliases/redirects during consolidation (don't delete immediately)
- Run link validation before and after (detect broken references)
- Test all customer journeys (smoke tests)
- Consolidate routes incrementally (test each one)

---

## Success Criteria

✅ All items in Execution Checklist complete  
✅ <50 authoritative documents remain in docs/  
✅ ~150 old files archived in docs/archive/  
✅ Duplicate API endpoints consolidated  
✅ All tests pass (npm test, type-check, lint)  
✅ No broken links found  
✅ PROJECT_STATE.md updated (Stage 2 complete)  
✅ NEXT_ACTION.md updated (Stage 3 preview)

---

## Updated By

**Session**: Governor Ω (STAGE 2 Execution)  
**Date**: 2026-07-16  
**Status**: Planning phase complete, execution ready
