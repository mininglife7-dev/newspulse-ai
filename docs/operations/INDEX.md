# Operational Knowledge Index

**Purpose**: Quick reference for all operational procedures, checklists, and runbooks  
**Audience**: Operations team, on-call engineers, deployment leads  
**Owner**: Governor Ω  
**Last Updated**: 2026-07-16

---

## Quick Navigation

### Runbooks (Step-by-Step Procedures)

**Use these for critical operations — step-by-step guidance**

| Operation | File | Time | Audience |
|-----------|------|------|----------|
| Deployment to Production | `RUNBOOKS/DEPLOYMENT.md` | 15-30 min | Deployer, Release Lead |
| Incident Response | `RUNBOOKS/INCIDENT_RESPONSE.md` | Varies | On-call, Incident Commander |
| Database Operations | `RUNBOOKS/DATABASE_OPERATIONS.md` | Varies | DBA, DevOps |
| Release Verification | `RUNBOOKS/RELEASE_VERIFICATION.md` | 30-60 min | Deployer, QA |
| Customer Onboarding | `RUNBOOKS/CUSTOMER_ONBOARDING.md` | 1-2 hours | Sales, Customer Success |
| Monitoring & Alerting | `RUNBOOKS/MONITORING_AND_ALERTING.md` | Varies | DevOps, On-call |
| Security Operations | `RUNBOOKS/SECURITY_OPERATIONS.md` | Varies | Security, All Engineers |

### Checklists (Verification & Quality Gates)

**Use these to verify correctness before/after operations**

| Checklist | File | When to Use |
|-----------|------|-------------|
| Pre-Deployment | `CHECKLISTS/PRE_DEPLOYMENT.md` | Before every production push |
| Post-Deployment Verification | `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` | After every deployment |
| Incident Postmortem | `CHECKLISTS/INCIDENT_POSTMORTEM.md` | After incident resolution |
| Weekly Operational Review | `CHECKLISTS/WEEKLY_OPS_REVIEW.md` | Every Friday |
| Monthly Compliance Audit | `CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md` | First Monday of month |

### Procedures (Detailed How-Tos)

**Use these for common tasks that aren't full runbooks**

| Procedure | File | Purpose |
|-----------|------|---------|
| Git Workflow | `PROCEDURES/GIT_WORKFLOW.md` | Standard git operations and commit conventions |
| Testing Procedures | `PROCEDURES/TESTING_PROCEDURES.md` | Running tests locally and in CI |
| Verification Steps | `PROCEDURES/VERIFICATION_STEPS.md` | How to verify deployments work across 7 dimensions |
| Rollback Procedures | `PROCEDURES/ROLLBACK.md` | How to roll back on-production errors |
| On-Call Procedures | `PROCEDURES/ON_CALL_PROCEDURES.md` | On-call rotation, response, escalation, handoff |

---

## By Role

### I'm a Deployer
1. Read `RUNBOOKS/DEPLOYMENT.md` — end-to-end process
2. Complete `CHECKLISTS/PRE_DEPLOYMENT.md` — before pushing
3. Complete `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — after deployment
4. Escalate to on-call if issues arise

### I'm On-Call
1. Prepare with `PROCEDURES/ON_CALL_PROCEDURES.md` — before your shift
2. Know `RUNBOOKS/INCIDENT_RESPONSE.md` — keep nearby
3. Know `PROCEDURES/ROLLBACK.md` — for quick recovery
4. Monitor with `RUNBOOKS/MONITORING_AND_ALERTING.md` — understand alerts
5. After incident, complete `CHECKLISTS/INCIDENT_POSTMORTEM.md`
6. Update lessons from incident

### I'm a Database Administrator
1. Read `RUNBOOKS/DATABASE_OPERATIONS.md` — all database ops
2. Know backup/recovery procedures
3. Know RLS policy verification steps
4. Coordinate with deployment team on schema migrations

### I'm a Customer Success Lead
1. Read `RUNBOOKS/CUSTOMER_ONBOARDING.md` — customer setup
2. Follow checklist for each new customer
3. Escalate production issues to on-call
4. Track customer health from success metrics

### I'm Reviewing Operational Health
1. Check weekly: `CHECKLISTS/WEEKLY_OPS_REVIEW.md`
2. Check monthly: `CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md`
3. Review lessons: `docs/lessons/LEARNING_LOG.md`
4. Check incident trends in postmortem summaries

---

## Critical Paths

### Deployment Flow
```
Code Ready
  ↓
Run `PRE_DEPLOYMENT.md` checklist
  ↓
Follow `DEPLOYMENT.md` runbook
  ↓
Complete `POST_DEPLOYMENT_VERIFICATION.md` checklist
  ↓
Verify success metrics in `PROCEDURES/VERIFICATION_STEPS.md`
  ↓
Production Live
```

### Incident Response Flow
```
Issue Detected
  ↓
Follow `INCIDENT_RESPONSE.md` runbook
  ↓
If rollback needed: Use `PROCEDURES/ROLLBACK.md`
  ↓
Incident Resolved
  ↓
Complete `INCIDENT_POSTMORTEM.md` checklist
  ↓
Document lessons in `docs/lessons/LEARNING_LOG.md`
  ↓
Review with team
```

---

## Document Status

| Document | Status | Owner | Last Updated |
|----------|--------|-------|--------------|
| DEPLOYMENT.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| INCIDENT_RESPONSE.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| DATABASE_OPERATIONS.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| RELEASE_VERIFICATION.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| CUSTOMER_ONBOARDING.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| MONITORING_AND_ALERTING.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| SECURITY_OPERATIONS.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| PRE_DEPLOYMENT.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| POST_DEPLOYMENT_VERIFICATION.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| INCIDENT_POSTMORTEM.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| WEEKLY_OPS_REVIEW.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| MONTHLY_COMPLIANCE_AUDIT.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| GIT_WORKFLOW.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| TESTING_PROCEDURES.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| VERIFICATION_STEPS.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| ROLLBACK.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |
| ON_CALL_PROCEDURES.md | 🟢 Complete | Governor Ω | STAGE 4 Phase 4.2 |

---

## Related Knowledge

- `docs/KNOWLEDGE_TAXONOMY.md` — Understanding how operational knowledge fits with other knowledge domains
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards for production changes
- `docs/lessons/LEARNING_LOG.md` — Learning from past operations
- `docs/customer/SUPPORT_PROCEDURES.md` — Customer support playbooks

---

## Summary

**Phase 4.2 (Operational Knowledge)**: 100% Complete
- 8 Runbooks (deployment, incidents, database, releases, onboarding, monitoring, security)
- 5 Checklists (pre-deploy, post-deploy, postmortem, weekly review, monthly audit)
- 5 Procedures (git, testing, verification, rollback, on-call)
- **Total**: 17 comprehensive operational documents

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Status**: Phase 4.2 Complete - Ready for Phase 4.3 (Engineering Knowledge)  
**Next**: Phase 4.3 - Document engineering architecture, patterns, and standards
