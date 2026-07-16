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
| Release Verification | `RUNBOOKS/RELEASE_VERIFICATION.md` | 30 min | Deployer, QA |
| Customer Onboarding | `RUNBOOKS/CUSTOMER_ONBOARDING.md` | 1-2 hours | Sales, Customer Success |

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
| Git Workflow | `PROCEDURES/GIT_WORKFLOW.md` | Standard git operations |
| Testing Procedures | `PROCEDURES/TESTING_PROCEDURES.md` | Running tests locally and in CI |
| Verification Steps | `PROCEDURES/VERIFICATION_STEPS.md` | How to verify deployments work |
| Rollback Procedures | `PROCEDURES/ROLLBACK.md` | How to roll back on-production errors |

---

## By Role

### I'm a Deployer
1. Read `RUNBOOKS/DEPLOYMENT.md` — end-to-end process
2. Complete `CHECKLISTS/PRE_DEPLOYMENT.md` — before pushing
3. Complete `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — after deployment
4. Escalate to on-call if issues arise

### I'm On-Call
1. Know `RUNBOOKS/INCIDENT_RESPONSE.md` — keep nearby
2. Know `PROCEDURES/ROLLBACK.md` — for quick recovery
3. After incident, complete `CHECKLISTS/INCIDENT_POSTMORTEM.md`
4. Update `LEARNING_LOG.md` with lessons

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
| DEPLOYMENT.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| INCIDENT_RESPONSE.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| DATABASE_OPERATIONS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| RELEASE_VERIFICATION.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| CUSTOMER_ONBOARDING.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| PRE_DEPLOYMENT.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| POST_DEPLOYMENT_VERIFICATION.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| INCIDENT_POSTMORTEM.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| WEEKLY_OPS_REVIEW.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| MONTHLY_COMPLIANCE_AUDIT.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| GIT_WORKFLOW.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| TESTING_PROCEDURES.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| VERIFICATION_STEPS.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |
| ROLLBACK.md | 🔵 Queued | Governor Ω | STAGE 4 Phase 4.2 |

---

## Related Knowledge

- `docs/KNOWLEDGE_TAXONOMY.md` — Understanding how operational knowledge fits with other knowledge domains
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards for production changes
- `docs/lessons/LEARNING_LOG.md` — Learning from past operations
- `docs/customer/SUPPORT_PROCEDURES.md` — Customer support playbooks

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.1)  
**Date**: 2026-07-16  
**Next**: Phase 4.2 - Create all runbooks and checklists
