# Phase 3 Launch Checklist
**Purpose:** Verify all prerequisites before Phase 3 feature deployment  
**Owner:** CTO (Governor)  
**Use:** After infrastructure unblocking and feature decision

---

## Phase 0: Founder Prerequisites (Must Complete Before CTO Proceeds)

### Infrastructure Unblocking
- [ ] Deploy `supabase/schema.sql` in Supabase SQL editor
- [ ] Enable Email auth in Supabase → Project Settings → Auth
- [ ] Verify GitHub Actions CI/CD pipeline is operational
- [ ] Confirm customer signup workflow is working end-to-end

**Estimated Effort:** ~9 minutes  
**Verification:** CTO will validate by running full E2E test suite

### Feature Decision
- [ ] Founder selects Phase 3 feature:
  - [ ] Audit Logging (recommended)
  - [ ] Evidence Linking
  - [ ] Analytics
  - [ ] Template Iteration
- [ ] Feature choice communicated to CTO

**Timeline:** By 2026-07-17

---

## Phase 1: CTO Verification (Upon Infrastructure Unblocking)

### Infrastructure Validation
- [ ] Supabase schema deployed successfully
  - [ ] All tables present: `companies`, `workspaces`, `users`, `obligations`, `evidence`, `audit_events`, etc.
  - [ ] Row-Level Security (RLS) policies active on all multi-tenant tables
  - [ ] Auth triggers configured for magic link validation
- [ ] GitHub Actions CI/CD operational
  - [ ] Latest commit builds successfully on main
  - [ ] All tests pass in CI environment
  - [ ] Lint/typecheck/build gates passing
- [ ] Email authentication enabled
  - [ ] Test email signup flow works end-to-end
  - [ ] Magic link emails deliver correctly
  - [ ] User onboarding workflow completes

**Verification Commands:**
```bash
npm test                    # Verify all 945 tests pass
npm run build              # Verify build succeeds
npm run lint              # Verify no linting errors
```

**Success Criteria:**
- ✓ All 945 tests passing
- ✓ Build clean (no errors or warnings)
- ✓ Lint clean
- ✓ TypeScript strict mode compliant
- ✓ CI/CD pipeline green on main
- ✓ Vercel preview deployment successful
- ✓ Customer signup workflow verified

### Observability Validation
- [ ] `/api/metrics/dashboard` returns valid metrics
  - [ ] At least 8 endpoints showing metrics
  - [ ] Latency p95/p99 within SLA targets
  - [ ] No error spikes in past 1 hour
- [ ] `/api/metrics/sla-check` shows all endpoints compliant
- [ ] `/monitoring` dashboard loads and displays real data
- [ ] Request logging capturing all instrumented endpoints

**Expected Metrics:**
- p95 latency: < 1 second (target: ~150ms)
- p99 latency: < 2 seconds (target: ~250ms)
- Error rate: < 1%
- All endpoints: Green status

### Security Validation
- [ ] Security audit suite passing (25 tests)
  - [ ] No PII in logs or metrics
  - [ ] No credentials exposed in error messages
  - [ ] Rate limiting active on public endpoints
  - [ ] GDPR compliance validated
- [ ] No critical vulnerabilities in dependencies
  - [ ] `npm audit` shows 0 critical issues
  - [ ] Dependency versions pinned correctly
- [ ] Auth tokens and secrets properly isolated
  - [ ] No secrets in environment files
  - [ ] API keys not logged or exposed

---

## Phase 2: Feature Implementation (Upon Founder Decision)

### Pre-Implementation
- [ ] Feature branch created from current main
- [ ] Feature branch name: `phase-3-<feature-name>` (e.g., `phase-3-audit-logging`)
- [ ] Implementation plan reviewed (from PHASE-3-IMPLEMENTATION-READINESS.md)
- [ ] Rollback plan documented and tested

### Implementation Execution
- [ ] Feature code implemented per documented approach
- [ ] All quality gates satisfied:
  - [ ] Typecheck: Clean
  - [ ] Build: Green
  - [ ] Lint: Clean
  - [ ] Unit tests: New tests added, all passing
  - [ ] Integration tests: E2E paths validated
  - [ ] Documentation: README and ADRs updated
- [ ] No performance regression
  - [ ] p95 latency remains < 1 second
  - [ ] Memory usage stable
  - [ ] No new security vulnerabilities introduced
- [ ] Commit message includes feature name and implementation details

### Testing Coverage
- [ ] New unit tests for feature logic (min. 10 tests)
- [ ] Integration tests validating customer journey (min. 2 tests)
- [ ] Security tests if applicable (credentials, injection, etc.)
- [ ] E2E smoke tests on preview deployment
- [ ] Manual testing in preview environment

**Test Success Criteria:**
- ✓ All new tests passing
- ✓ All existing tests still passing (945 + new)
- ✓ No regression in any metric
- ✓ Feature works as documented in implementation plan

---

## Phase 3: Deployment Safety (Before Merging to Main)

### Pre-Deployment Review
- [ ] Pull request created with clear description
  - [ ] Title: `feat(phase3): Add <feature-name>`
  - [ ] Body: Summary, test plan, known limitations, rollback procedure
- [ ] Code review completed
  - [ ] No blocking comments
  - [ ] All suggestions addressed or documented
- [ ] Preview deployment verified
  - [ ] Feature works in preview environment
  - [ ] No errors in Vercel logs
  - [ ] Performance acceptable
- [ ] Final quality gate check
  - [ ] All 945 + new tests passing
  - [ ] Build succeeds
  - [ ] Lint clean
  - [ ] TypeScript strict mode compliant

### Deployment Execution
- [ ] Merge PR to main (squash or rebase, not merge commit)
- [ ] Monitor main branch deployment (Vercel auto-deploys)
  - [ ] Build succeeds
  - [ ] Deployment completes without errors
  - [ ] Application boots successfully
  - [ ] Health check passes
- [ ] Verify feature is live
  - [ ] Feature endpoint responds correctly
  - [ ] Data persists correctly
  - [ ] RLS policies enforced
  - [ ] Observability metrics collected
- [ ] Monitor metrics for 15 minutes post-deployment
  - [ ] No error spikes
  - [ ] Latency stable
  - [ ] No resource exhaustion
  - [ ] All SLAs holding

**Post-Deployment Monitoring:**
```bash
# Check metrics dashboard
curl https://newspulse-ai.vercel.app/api/metrics/dashboard

# Verify no errors
grep -i "error\|exception\|5[0-9][0-9]" vercel-logs.txt

# Confirm feature working
# [Feature-specific test based on selected feature]
```

---

## Phase 4: Rollback (If Needed)

### Immediate Rollback Trigger
If any of these occur within 1 hour of deployment, execute rollback:
- Critical error rate > 5% (vs. < 1% baseline)
- p95 latency > 5 seconds (vs. ~150ms baseline)
- p99 latency > 10 seconds (vs. ~250ms baseline)
- Security vulnerability discovered in feature code
- Data corruption or data loss observed
- Customer-impacting outage caused by feature

### Rollback Execution
1. Identify most recent stable commit (pre-feature)
   ```bash
   git log --oneline | grep -v phase-3
   ```

2. Revert to stable commit
   ```bash
   git revert HEAD --no-edit  # Creates a revert commit
   # OR
   git reset --hard <stable-commit-hash>  # Hard reset (use with caution)
   ```

3. Deploy revert
   - Push to main (if using git revert)
   - Vercel auto-deploys
   - Verify health check passes

4. Notify stakeholders
   - Document why rollback occurred
   - Root cause analysis scheduled for post-incident review
   - Monitoring for similar issues

5. Post-Incident
   - Investigate root cause
   - Add regression test to prevent recurrence
   - Document lesson learned in Technical Debt Register
   - Plan fix and re-deployment

**Rollback Success Criteria:**
- ✓ Previous version deployed and running
- ✓ Health check passing
- ✓ Metrics return to baseline within 5 minutes
- ✓ No data loss or corruption
- ✓ Customers able to use system normally

---

## Phase 5: Post-Launch (After 24 Hours)

### Health Check
- [ ] No errors in past 24 hours
- [ ] Latency stable and within SLA
- [ ] User adoption metrics positive (if applicable)
- [ ] No customer complaints reported
- [ ] Feature working as documented

### Update Living Artifacts
- [ ] Technology Roadmap updated with Phase 3 completion
- [ ] ADRs updated if any architectural decisions emerged during implementation
- [ ] Engineering Health Dashboard updated with Phase 3 metrics
- [ ] Technical Debt Register updated with any new items or resolved items
- [ ] Next phase (Phase 4 Q3 technical debt) confirmed

### Document Outcomes
- [ ] Implementation time recorded (vs. estimate)
- [ ] Issues encountered documented
- [ ] Lessons learned captured
- [ ] Improvements to process noted

---

## Success Definition

Phase 3 is successful when:

1. ✓ Feature deployed to production
2. ✓ No critical errors in first 24 hours
3. ✓ Customer-facing functionality working as documented
4. ✓ Observability capturing feature metrics
5. ✓ All quality gates remain green
6. ✓ No performance regression
7. ✓ No security vulnerabilities introduced
8. ✓ Engineering team confident in feature
9. ✓ Founder satisfied with outcome
10. ✓ Living artifacts updated with Phase 3 completion

---

## Timeline

| Phase | Owner | Effort | Timeline |
|---|---|---|---|
| **Phase 0: Prerequisites** | Founder | ~9 min | By 2026-07-12 EOD |
| **Phase 1: Verification** | CTO | ~1 hour | Upon infrastructure unblocking |
| **Phase 2: Implementation** | CTO | 3-5 days | After feature decision (by 2026-07-17) |
| **Phase 3: Deployment** | CTO | ~2 hours | After implementation complete |
| **Phase 4: Rollback** | CTO | On-demand | If needed within 1 hour of deployment |
| **Phase 5: Post-Launch** | CTO | ~1 hour | 24 hours after deployment |

**Total Timeline to Live:** ~4-6 days from feature decision

---

## Approvals

- [ ] Founder approves checklist
- [ ] CTO confirms readiness to execute

**Document Created:** 2026-07-12  
**Last Updated:** 2026-07-12  
**Next Review:** Upon Phase 3 feature decision

