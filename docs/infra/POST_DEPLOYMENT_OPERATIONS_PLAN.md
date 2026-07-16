# Post-Deployment Operations Plan
## Cathedral/EURO AI — Phase Transition Framework

**Authority:** Governor (Chief Advisor & Chief of Staff)  
**Date:** 2026-07-12  
**Status:** AUTONOMOUS EXECUTION READY  
**Scope:** Day 1 → Week 2 → Month 1 operations and customer pilot handoff

---

## Executive Summary

**Purpose:** Define the operational transition from "schema deployed" to "customer pilot ready."

**Timeline:**
- **Day 1 (4 hours):** Deployment completion + immediate health verification
- **Week 1 (5 days):** Monitoring, baseline establishment, incident response readiness
- **Week 2 (7 days):** Customer pilot onboarding begins
- **Month 1 (30 days):** Operational tuning, compliance audit, feature rollout planning

**Governance:** All operational tasks execute autonomously per DNA-GOV-216. Engineering team continues building v1.1 features in parallel.

---

## PHASE 1: IMMEDIATE POST-DEPLOYMENT (Day 1, Hours 0-4)

### Hour 0: Deployment Completion Verification

**Founder Action Required:** Complete all 5 deployment phases from FOUNDER_RUNTIME_VERIFICATION_GUIDE.html

**Governor Autonomous Actions (Upon Notification):**

1. **Verify All Documentation Is Aligned**
   - [ ] DEPLOYMENT_READINESS_REPORT.md status updated to "DEPLOYED"
   - [ ] INDEPENDENT_VV_AUDIT.md confidence score locked at 8.2/10 (runtime verified)
   - [ ] FOUNDER_BRIEF.md updated with deployment completion
   - [ ] Commit documentation updates

2. **Establish Monitoring Baseline**
   - [ ] Create daily health check query (row counts by table)
   - [ ] Set baseline performance metrics (query response times)
   - [ ] Document baseline in OPERATIONAL_RUNBOOK.md

3. **Verify Production Access Permissions**
   - [ ] Service role key confirmed working (verified during deployment)
   - [ ] Anon key confirmed working (verified during security tests)
   - [ ] No credentials exposed in logs/documentation
   - [ ] Backup credentials stored securely per company policy

### Hour 1-2: Immediate Functionality Testing

**Governor Autonomous Actions:**

1. **Automated Smoke Tests (SQL-based)**
   ```
   Create test workspace
   Create test company
   Create test AI system
   Create test risk assessment
   Verify all data present and isolated
   Delete test workspace (verify cascade cleanup)
   ```

2. **RLS Policy Validation**
   - [ ] Anonymous user cannot read any protected tables (confirmed)
   - [ ] User A cannot see User B workspaces (confirmed)
   - [ ] RLS policies enforced on all 9 application tables (confirmed)

3. **Trigger Execution Verification**
   - [ ] New user signup creates profile automatically (test)
   - [ ] Profile fields populated correctly (test)
   - [ ] Trigger error handling works (test by simulating profile insert failure)

### Hour 2-3: Database Health Baseline

**Governor Autonomous Actions:**

1. **Object Count Verification**
   - [ ] Run POST_DEPLOYMENT_VERIFICATION.sql again (verify counts stable)
   - [ ] All 15 tables present and accessible
   - [ ] All 26 indexes functioning
   - [ ] All 37 RLS policies enforced

2. **Storage Assessment**
   - [ ] Database size: baseline (empty except test data)
   - [ ] Table sizes: capture for future growth tracking
   - [ ] Connection health: verify service role connectivity stable

3. **Backup Confirmation**
   - [ ] Supabase automated backups enabled
   - [ ] First backup scheduled/completed
   - [ ] Backup restoration procedure tested (recovery readiness)

### Hour 3-4: Operational Readiness Sign-Off

**Governor Autonomous Actions:**

1. **Create Post-Deployment Status Report**
   ```
   DEPLOYMENT COMPLETE - 2026-07-12 14:00 UTC
   
   ✅ Schema deployed successfully
   ✅ All object counts verified (15 tables, 26 indexes, 37 policies)
   ✅ Security tests passed (multi-tenant isolation confirmed)
   ✅ RLS policies enforced
   ✅ Trigger automation working
   ✅ Database backups enabled
   ✅ Monitoring baseline established
   
   Current State: PRODUCTION READY
   Confidence: 8.2/10 (now VERIFIED at runtime)
   Next Phase: Week 1 Operational Monitoring
   ```

2. **Update FOUNDER_BRIEF.md**
   - Add: "Schema deployment complete. Database ready for customer pilot."
   - Link to this post-deployment plan
   - Identify next Founder action: customer onboarding

3. **Trigger Week 1 Monitoring Cycle**
   - Begin automated daily health checks
   - Schedule weekly review procedures
   - Set up escalation triggers

---

## PHASE 2: WEEK 1 MONITORING (Days 2-8)

### Daily Checks (5 minutes/day)

**Autonomous Governor Tasks (Each morning 09:00 UTC):**

1. **Database Health Query**
   ```sql
   SELECT 
     schemaname, 
     tablename, 
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
     n_live_tup as row_count
   FROM pg_stat_user_tables
   ORDER BY pg_total_relation_size DESC;
   ```
   - Monitor: Row counts stable (only test data)
   - Alert if: Unexpected growth or table drops
   - Action: Investigate if growth detected

2. **Connection Pool Health**
   - Query: Count active connections to Supabase
   - Expected: <5 (should be idle day 1-2)
   - Alert if: Unexpectedly high connections during off-hours

3. **RLS Policy Performance**
   - Run: `EXPLAIN ANALYZE` on sample RLS-protected queries
   - Verify: Index scans (not full table scans)
   - Expected: <100ms response time
   - Alert if: >500ms (potential performance issue)

4. **Backup Verification**
   - Confirm: Daily backup completed
   - Verify: Backup size reasonable
   - Action: Document backup size trend

### Weekly Review (Friday, 30 minutes)

**Governor Autonomous Tasks (Every Friday 17:00 UTC):**

1. **Weekly Health Report**
   - Compile: Daily metrics into weekly summary
   - Analyze: Trends (row growth, query patterns, errors)
   - Document: Findings in OPERATIONAL_RUNBOOK.md

2. **Security Audit**
   - Query: Audit log table for any anomalies
   - Verify: No unauthorized access attempts
   - Review: RLS policy violations (if any)

3. **Incident Review**
   - Check: Any deployment-related issues this week?
   - Assess: Whether issues are expected (test data) or concerning
   - Action: If concerning, escalate to Founder

4. **Metrics Baseline Update**
   - Establish: Week 1 performance baseline
   - Document: For comparison to Week 2-4
   - Note: Expected to remain stable (no customer data yet)

---

## PHASE 3: CUSTOMER PILOT ONBOARDING (Week 2)

### Pre-Onboarding Checklist (Founder + Governor)

**Founder Action Required:**
- [ ] Customer contract signed (legal review complete)
- [ ] Customer credentials prepared (email/SSO)
- [ ] Compliance audit scheduled (regulatory requirements)
- [ ] Support team trained (on incident response)

**Governor Autonomous Actions:**
1. Create dedicated workspace/company for pilot customer
2. Pre-load sample AI systems (Cathedral, EURO)
3. Create sandbox risk assessments (for testing)
4. Prepare customer success runbook (pilot-specific)

### Onboarding Day (Week 2, Day 1)

**Founder Action:**
- Invite customer to platform
- Conduct kickoff meeting

**Governor Autonomous Actions:**
1. Monitor: Customer signup process
2. Verify: Profile auto-created (trigger working)
3. Monitor: Initial workspace creation
4. Alert: If any errors during onboarding

### Week 2 Monitoring (Daily)

**Founder Actions:**
- Customer tests workflows
- Reports issues/feedback

**Governor Autonomous Actions:**
1. Monitor: Database query patterns (customer behavior)
2. Alert: If unusual access patterns detected
3. Track: Customer data growth rate
4. Verify: RLS isolation (customer data segmented correctly)

---

## PHASE 4: OPERATIONAL STEADY STATE (Week 3+)

### Daily Operations

**Daily Health Check (Automated, 5 min):**
- Database connectivity
- Backup completion
- Row count growth (normal?)
- Active connections (<10?)

**Weekly Review (Automated, 30 min):**
- Metrics trend analysis
- Performance baseline comparison
- Incident review (if any)
- Capacity planning (at current growth rate, when will we need scaling?)

**Monthly Deep Review (Automated, 2 hours):**
- Database optimization analysis
- RLS policy efficiency review
- Index usage analysis
- Compliance audit preparation

### Escalation Triggers (Automatic to Founder)

**CRITICAL (Immediate):**
- [ ] Database connection failure (>5 min)
- [ ] Backup failure (2+ consecutive days)
- [ ] Security test failure (RLS policy violation)
- [ ] Data corruption detected

**HIGH (Within 1 hour):**
- [ ] Query response time >1000ms (performance degradation)
- [ ] Unexpected row growth (>100% in 1 day)
- [ ] Error rate spike in application logs

**MEDIUM (Within 8 hours):**
- [ ] Unused indexes identified (optimization opportunity)
- [ ] Storage growth trend concern (capacity planning needed)
- [ ] Customer support issue requiring schema modification

---

## PHASE 5: COMPLIANCE & REGULATORY (Month 1)

### EU AI Act Compliance Audit

**Timeline:** Week 3-4

**Governance:** Founder leads; Governor provides evidence

**Checklist:**
- [ ] Data governance audit (audit_log table populated)
- [ ] Privacy compliance (GDPR delete workflows)
- [ ] Transparency requirements (customer data access logs)
- [ ] Incident response procedures documented and tested

### Post-Audit Actions

**If Audit Passes:**
- [ ] Publish compliance certificate
- [ ] Update customer agreements
- [ ] Begin next customer recruitment

**If Issues Found:**
- [ ] Work with customer on remediation
- [ ] May delay next customer onboarding
- [ ] Plan v1.1 fixes

---

## PARALLEL WORK: V1.1 FEATURE DEVELOPMENT

While Week 1-4 operations proceed, engineering team works autonomously on v1.1:

### Scheduled v1.1 Deliverables

**DNA-013: Feature Flags** (Estimated 3 days)
- Enable gradual feature rollout
- Reduce risk of production issues
- Allow A/B testing

**DNA-015: Deployment Canary** (Estimated 4 days)
- Safe gradual database migrations
- Rollback procedures
- Zero-downtime deployments

**HERCULES Workspace FK Migration** (Estimated 2 days)
- Migrate enterprise_id from text to UUID
- Add foreign key constraint to workspaces
- Cascade delete behavior for HERCULES tables

**Trigger-Based Audit Logging** (Estimated 3 days)
- Implement database triggers for audit_log
- Automatic logging of sensitive operations
- Compliance audit ready

**Total v1.1 Effort:** 12 days (runs in parallel with customer pilot Week 1-2)

---

## DECISION MATRIX: WHEN TO ESCALATE TO FOUNDER

| Situation | Decision | Action |
|-----------|----------|--------|
| Daily health check passes | CONTINUE | No founder action required |
| Health check shows concern (slow queries) | INVESTIGATE | Governor analyzes; may auto-fix (index creation, query optimization) |
| Customer onboarding succeeds | PROCEED | Begin Week 2 monitoring |
| Customer onboarding fails | ESCALATE | Founder investigates; may require schema changes |
| Compliance audit fails | ESCALATE | Founder + customer review; plan remediation |
| Database backup fails | ESCALATE | Immediate founder attention (data protection issue) |
| RLS policy violation detected | ESCALATE | Critical security issue; immediate action required |

---

## SUCCESS CRITERIA: Production Readiness Complete

Schema deployment is confirmed "Production Ready" when:

- ✅ All daily health checks pass for 7 consecutive days
- ✅ Customer pilot onboarding succeeds
- ✅ Customer can complete core workflows (create workspace, add company, create risk assessment)
- ✅ No security test failures
- ✅ Compliance audit passes (or path to pass defined)
- ✅ Operational runbook procedures verified (tested)
- ✅ Monitoring alerts working and actionable
- ✅ v1.1 roadmap starting (parallel to production)

---

## GOVERNOR AUTONOMOUS RESPONSIBILITIES

Per DNA-GOV-216, Governor executes all operational tasks autonomously:

- ✅ Daily health monitoring
- ✅ Weekly analysis
- ✅ Customer pilot support
- ✅ Escalation decisions
- ✅ v1.1 feature development (parallel)
- ✅ Documentation updates

**Founder responsibility:** Make strategic decisions (next customer, roadmap priorities, funding allocation).

---

## NEXT ACTION

**Immediate (When Founder Completes Deployment):**

1. Notify Governor: "Deployment complete, all phases passed"
2. Governor: Begin Phase 1 immediate post-deployment verification
3. Timeline: Day 1 completion by 18:00 UTC
4. Founder: Continue with usual operations while Governor monitors

**Week 1:**
- Founder: Prepare customer onboarding materials
- Governor: Run daily health checks and weekly review

**Week 2:**
- Founder: Conduct customer pilot onboarding
- Governor: Intensive monitoring during customer ramp-up

**Month 1:**
- Founder: Customer success, feedback collection
- Governor: Compliance audit support, v1.1 development

---

**Sign-Off:**

**Prepared by:** Governor (Autonomous Execution Constitution - DNA-GOV-216)  
**Authority:** Founder Autonomous Execution Framework  
**Status:** READY FOR DEPLOYMENT PHASE TRANSITION  
**Next Document:** FOUNDER_RUNTIME_VERIFICATION_GUIDE.html (interactive deployment guide)

---

*This plan activates immediately upon Founder completing deployment verification. Governor operates autonomously per documented procedures; Founder intervenes only for strategic decisions.*
