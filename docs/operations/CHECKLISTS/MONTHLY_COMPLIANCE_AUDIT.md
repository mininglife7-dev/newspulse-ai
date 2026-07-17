# Monthly Compliance Audit Checklist

**Type**: Checklist  
**Audience**: Operations, Compliance, Security, Governor Ω  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: First week of each month  
**Time Estimate**: 1.5-2 hours  
**Owner**: Governor Ω

---

## Purpose

Comprehensive monthly audit of compliance, security, data integrity, and operational standards. Verifies that the platform continues to meet EU AI Act compliance requirements, data residency obligations, and security standards.

**When to use**: First week of each month  
**Success criteria**: All checks pass, no data leaks, RLS enforced, backups verified

---

## Data Integrity & Isolation (20 min)

### Row Level Security (RLS) Verification

- [ ] RLS enabled on all tenant data tables

  ```sql
  SELECT relname, relrowsecurity FROM pg_class
  WHERE relname IN ('evidence', 'obligations', 'assessments', 'ai_systems', 'workspaces');
  ```

  Expected: All show `relrowsecurity = true`

- [ ] RLS policies exist for all access patterns

  ```sql
  SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
  ```
  - [ ] evidence: SELECT, UPDATE policies
  - [ ] obligations: SELECT, UPDATE policies
  - [ ] assessments: SELECT, UPDATE policies
  - [ ] ai_systems: SELECT, UPDATE policies

- [ ] Manual RLS bypass test (security team only)
  ```sql
  SET ROLE test_workspace_user;  -- Simulate different workspace
  SELECT COUNT(*) FROM evidence WHERE workspace_id != current_workspace_id;
  -- Must return: 0
  RESET ROLE;
  ```

### Workspace Isolation Verification

- [ ] Create test data in workspace A
  - Create AI system in workspace A
  - Create assessment, obligation, evidence
  - Document record IDs

- [ ] Switch to workspace B (different user account)
  - Verify workspace A data NOT visible
  - Cannot access workspace A's records via direct URL
  - Cannot query workspace A's data via API

- [ ] Test cross-workspace query attempts
  - Try to fetch workspace A record from workspace B
  - Verify: 403 Forbidden or empty result
  - Log any anomalies for investigation

### Data Consistency Checks

- [ ] No orphaned records (evidence without valid obligation)

  ```sql
  SELECT COUNT(*) FROM evidence
  WHERE obligation_id IS NOT NULL
  AND obligation_id NOT IN (SELECT id FROM obligations);
  ```

  Expected: 0

- [ ] No cross-workspace references

  ```sql
  SELECT COUNT(*) FROM evidence e
  WHERE workspace_id != (SELECT workspace_id FROM obligations WHERE id = e.obligation_id);
  ```

  Expected: 0

- [ ] No dangling foreign keys

  ```sql
  SELECT COUNT(*) FROM ai_systems WHERE workspace_id NOT IN (SELECT id FROM workspaces);
  ```

  Expected: 0

- [ ] No audit log tampering (if exists)
  - Check audit table exists and is protected
  - Verify immutability constraints

---

## Compliance & Standards (20 min)

### EU AI Act Compliance

- [ ] Data residency: EU only
  - Verify Supabase database region: EU ✓
  - No backups outside EU
  - No third-party data transfers outside EU

- [ ] Data processing compliance
  - [ ] Personal data handling: Within user control
  - [ ] Consent tracking: Present (if collecting)
  - [ ] Purpose limitation: Data used only for stated purpose
  - [ ] Data retention: Configured (check settings)

- [ ] User rights support
  - [ ] Right to access: Users can download their data? Yes ☐
  - [ ] Right to delete: Workspace deletion removes all data? Yes ☐
  - [ ] Right to portability: Data export available? Yes ☐

### Security Standards

- [ ] Authentication enforcement
  - [ ] All endpoints require auth except public pages
  - [ ] Session tokens have expiration
  - [ ] Logout properly clears sessions

- [ ] Encryption standards
  - [ ] All data in transit: HTTPS/TLS
  - [ ] Database at rest: Encrypted (Supabase default)
  - [ ] Secrets not stored in code

- [ ] Input validation
  - [ ] No SQL injection vectors
  - [ ] No XSS vulnerabilities
  - [ ] File uploads validated (type, size)

---

## Access Control & Audit (15 min)

### Team Member Audit

- [ ] Workspace: __________ audit period start: __________

For each workspace (sample critical ones):

- [ ] Owner count: __ (should be 1-2)
- [ ] Admin count: __ (matches team structure?)
- [ ] Inactive users removed? Yes ☐
- [ ] User permissions match roles? Yes ☐

### Access Log Review

- [ ] Review auth logs from past 30 days
  - [ ] Failed login attempts: __ (pattern analysis)
  - [ ] Unusual access patterns: None ☐
  - [ ] Accounts locked or compromised: None ☐

- [ ] API access audit
  - [ ] No unauthorized API keys
  - [ ] API key rotation schedule maintained
  - [ ] Service accounts have least privilege

---

## Backup & Disaster Recovery (15 min)

### Backup Status

- [ ] Daily backups completed
  - Last backup timestamp: __________
  - Size: __________
  - Encryption: Enabled ☐

- [ ] Weekly backups completed
  - Last backup timestamp: __________
  - Size: __________
  - Retention verified: 4 weeks ☐

- [ ] Backup integrity checks
  - Sample recent backup: __________
  - Can restore? Yes ☐
  - Restore time estimate: __________

### Recovery Readiness

- [ ] Rollback procedure tested (or tested last month)
  - [ ] Last test date: __________
  - [ ] Procedure still valid? Yes ☐
  - [ ] Recovery time: __ minutes

- [ ] Database recovery tested
  - [ ] Point-in-time recovery possible? Yes ☐
  - [ ] Estimated recovery time: __ minutes

---

## Database Health (15 min)

### Performance Metrics

- [ ] Query performance
  - Slowest query (last 30 days): __________ (__ ms)
  - No queries >1000ms? Yes ☐
  - Proper indexes in place? Yes ☐

- [ ] Connection health
  - Average connections: __ (target: <20)
  - Peak connections: __ (target: <50)
  - Connection pool leaks? No ☐

- [ ] Disk usage
  - Database size: __________
  - Growth trend: __________ per month
  - Projected full disk: __________ months away
  - Action needed? Yes ☐ No ☐

### Database Maintenance

- [ ] VACUUM & ANALYZE run
  - Last run: __________
  - Duration: __ seconds
  - Issues found: None ☐

- [ ] Unused indexes identified

  ```sql
  SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
  ```

  Count: __ (clean up if >5)

- [ ] Statistics up-to-date
  - Last ANALYZE: __________
  - Query plans stable? Yes ☐

---

## Security Scanning (15 min)

### Vulnerability Scanning

- [ ] Dependencies scanned for vulnerabilities

  ```bash
  npm audit
  ```
  - Vulnerabilities found: __
  - Critical vulnerabilities: __ (must fix immediately)
  - High vulnerabilities: __ (fix this sprint)

- [ ] Code static analysis (if running)
  - No new security issues introduced
  - Previous issues tracked/resolved

- [ ] OWASP top 10 spot check
  - [ ] No injection vulnerabilities
  - [ ] No broken authentication
  - [ ] No sensitive data exposure
  - [ ] No XML external entities
  - [ ] No broken access control
  - [ ] No security misconfiguration
  - [ ] No cross-site scripting
  - [ ] No insecure deserialization
  - [ ] No known vulnerable components
  - [ ] No insufficient logging

### Third-Party Security

- [ ] Supabase security status
  - Check: https://status.supabase.com
  - Any incidents in past 30 days? No ☐
  - Security advisories? None ☐

- [ ] Vercel security status
  - Any deployment security issues? No ☐
  - Build environment compromised? No ☐

---

## Monitoring & Alerting (10 min)

### Alert Configuration

- [ ] All critical services have alerts
  - [ ] Health endpoint failing
  - [ ] Error rate spike (>5%)
  - [ ] Database slow queries
  - [ ] CPU >80%
  - [ ] Disk space <10%

- [ ] Alert thresholds appropriate
  - Not too sensitive (avoiding alert fatigue)
  - Not too loose (would miss real issues)

### Alert Review

- [ ] Alerts triggered in past 30 days: __
- [ ] False positives: __
- [ ] Real incidents caught: __
- [ ] False negatives (issues not caught): None ☐

### On-Call Coverage

- [ ] On-call schedule current? Yes ☐
- [ ] All team members trained? Yes ☐
- [ ] Escalation procedures defined? Yes ☐

---

## Documentation & Runbooks (10 min)

### Procedures Updated

- [ ] All runbooks current (reflect actual procedures)
  - [ ] DEPLOYMENT.md: Current? Yes ☐
  - [ ] INCIDENT_RESPONSE.md: Current? Yes ☐
  - [ ] DATABASE_OPERATIONS.md: Current? Yes ☐
  - [ ] ROLLBACK.md: Current? Yes ☐

- [ ] New procedures since last month?
  - Document any new operational procedures
  - Update INDEX.md with references

### Knowledge System

- [ ] Ownership assignments up-to-date
  - [ ] Each runbook has an owner
  - [ ] Owner contact info current

- [ ] Links in docs working
  - Sample check: 5 random documentation links
  - All 5 working? Yes ☐

---

## Compliance with Standards (10 min)

### Engineering Standards

- [ ] Code follows style guide
  - ESLint passing? Yes ☐
  - Prettier formatted? Yes ☐
  - Type checking passing? Yes ☐

- [ ] Test coverage maintained
  - Unit tests: __ % (target: >80% lib/)
  - Integration tests: Running? Yes ☐
  - E2E tests: Running? Yes ☐

### Deployment Standards

- [ ] Pre-deployment checklist followed
  - Last 5 deployments reviewed
  - Checklists signed off? Yes ☐

- [ ] Post-deployment verification done
  - Last 5 deployments verified
  - Issues caught before reaching customers? Yes ☐

---

## Incident Response Review (10 min)

### Postmortems Completed

- [ ] Any incidents in past 30 days? Yes ☐ No ☐
- If yes:
  - [ ] Incident 1: Postmortem completed? Yes ☐
  - [ ] Incident 2: Postmortem completed? Yes ☐
  - [ ] Incident 3: Postmortem completed? Yes ☐

### Action Items Tracking

- [ ] Action items from postmortems tracked
  - Total action items: __
  - Completed: __
  - In progress: __
  - Blocked: __

---

## Customer Communication (5 min)

### Status Page

- [ ] Any incidents reported to customers? Yes ☐ No ☐
- [ ] Status page accurate? Yes ☐
- [ ] Incident history maintained? Yes ☐

### Support Issues

- [ ] Critical customer issues (if any)
  - List: __
  - Resolved: Yes ☐
  - Documented: Yes ☐

---

## Overall Compliance Status

### Summary

- [ ] Data integrity: PASS ☐ or identify issues: __
- [ ] Compliance: PASS ☐ or identify gaps: __
- [ ] Security: PASS ☐ or identify vulnerabilities: __
- [ ] Operations: PASS ☐ or identify problems: __

### Critical Issues Found

| Issue | Severity | Action | Owner | Due |
| ----- | -------- | ------ | ----- | --- |
|       |          |        |       |     |

### Recommendations

1. __
2. __
3. __

---

## Sign-Off

- [ ] Audit completed by: __________ on __________
- [ ] Review approved by: __________ on __________
- [ ] Issues documented in tracking system
- [ ] Next audit scheduled for: __________

---

## Related Documents

- `CHECKLISTS/WEEKLY_OPS_REVIEW.md` — Weekly operational checks
- `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — After-deployment checks
- `RUNBOOKS/INCIDENT_RESPONSE.md` — Incident handling procedures
- `docs/governance/ENGINEERING_STANDARDS.md` — Compliance standards

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
