# Data Retention Policy

**Policy Version:** 1.0  
**Last Updated:** 2026-07-15  
**Effective Date:** 2026-07-15  
**Status:** DRAFT (Requires legal review before production)

## Overview

This document defines how EURO AI retains, manages, and deletes user data, assessment data, and operational data in compliance with GDPR, CCPA, and other applicable privacy regulations.

## Retention Categories

### 1. User Account Data

**Data Type:** Profiles (name, email, preferences)

**Retention Period:** Duration of active account + 30 days after deletion request

**Rationale:**
- Active users: Required for service operation
- Post-deletion grace period: Allows user to recover account or for disputes
- After 30 days: Personal data anonymized/deleted

**Deletion Process:**
1. User requests account deletion
2. Account marked as `deleted` (soft delete for 30 days)
3. After 30 days, automatically hard-deleted from `profiles` table
4. References in `audit_logs` anonymized (user_id → NULL)

**Legal Basis:** GDPR Article 17 (Right to be Forgotten)

---

### 2. Workspace & Team Data

**Data Type:** Workspaces, workspace members, team assignments

**Retention Period:** Duration of workspace + 90 days after termination

**Rationale:**
- Active workspaces: Required for multi-tenant operations
- Post-termination period: Allows for dispute resolution, compliance audits
- After 90 days: Data deleted per workspace termination request

**Deletion Process:**
1. Workspace owner requests workspace deletion
2. All associated data marked for deletion (cascade on delete)
3. 90-day retention period begins
4. After 90 days:
   - All child tables deleted (cascade): companies, ai_systems, obligations, assessments
   - audit_logs archived (moved to archive table if needed for compliance)
   - `workspaces` record hard-deleted

**Special Cases:**
- If compliance audit ongoing: Retain until audit complete
- If legal hold: Retain indefinitely (contact legal)

**Legal Basis:** GDPR Article 17, Contract performance

---

### 3. AI System & Assessment Data

**Data Type:** AI systems, risk assessments, assessment history

**Retention Period:**
- **Active:** Indefinite (as long as needed for compliance)
- **Archived:** 7 years post-assessment finalization
- **Reason:** Compliance audit requirements, regulatory requirements

**Rationale:**
- Active assessments: Required for ongoing compliance management
- Archived assessments: Often required for audit trails (7-year standard for financial/compliance records)
- After 7 years: Minimal compliance value, deleted unless specific legal hold

**Deletion Process:**
1. Assessment marked as `archived` when superseded by new assessment
2. `archived_assessments` table retains full history
3. After 7 years:
   - Compliance team notified for any legal hold
   - If no hold: Delete from `archived_assessments`
   - Aggregate statistics retained (anonymized)

**Special Cases:**
- Regulated industries (healthcare, finance): Retain 10 years
- Active litigation/investigation: Retain indefinitely until resolved
- User account deletion: Delete associated assessments unless workspace requests retention

**Legal Basis:** Industry compliance requirements (SOC 2, ISO 27001, etc.)

---

### 4. Obligations & Compliance Data

**Data Type:** Compliance obligations, status tracking, due dates

**Retention Period:** Indefinite (with annual review)

**Rationale:**
- Compliance obligations are forward-looking and recurring
- Required for ongoing compliance management
- Marking as completed/archived != deletion
- Permanent record beneficial for trend analysis and compliance history

**Data Management:**
- Completed obligations: Retained indefinitely (status = 'completed')
- Abandoned obligations: Retained indefinitely (status = 'archived')
- No automatic deletion
- Workspace owner can manually request deletion per obligation if needed

**Special Cases:**
- If compliance obligation repeats annually: Retain across years
- If compliance obligation sunset: Mark as 'archived', retain 3 years minimum
- If legal requirement changes: Update obligation status, retain historical record

**Legal Basis:** Compliance documentation requirements

---

### 5. Evidence & Attachments

**Data Type:** Uploaded files, PDF reports, evidence documents

**Retention Period:**
- **Linked to active obligation:** Duration + 2 years after obligation closure
- **Compliance evidence:** 7 years minimum (audit trail)
- **Orphaned files:** 90 days (files without linked obligation)

**Rationale:**
- Evidence supports compliance proof
- 2-year post-closure: Covers typical audit lookback periods
- 7-year minimum: Standard compliance retention window
- Orphaned files: Clean up storage to reduce costs

**Deletion Process:**
1. When obligation deleted:
   - Evidence marked as `archived` (soft delete)
   - Storage file marked for deletion (soft delete)
   - 2-year retention clock starts
2. After 2 years:
   - If no holds: Physical file deleted from storage
   - Database record deleted
3. Orphaned files (>90 days): Automatic cleanup job deletes

**Special Cases:**
- Evidence for litigated obligation: Retain indefinitely
- Evidence for rejected obligation: Retain 3 years minimum
- Critical compliance evidence: No automatic deletion (must be manual)

**Legal Basis:** GDPR Article 5 (Data Minimization)

---

### 6. Audit Logs

**Data Type:** All logged actions, IP addresses, security events

**Retention Period:**
- **Active:** 2 years (for security monitoring)
- **Archived:** 7 years (for compliance audits)
- **Critical events:** Indefinite (security incidents, failed auth, data breaches)

**Rationale:**
- Recent logs: Required for incident response and security monitoring
- Archived logs: Often required for compliance audits and forensics
- Critical events: Must be retained for investigation purposes

**Deletion Process:**
1. Logs older than 2 years: Move to `audit_logs_archive` table (monthly job)
2. Logs older than 7 years in archive: Delete (unless marked as critical)
3. Critical security events: Never auto-deleted (requires manual review and deletion)

**Special Cases:**
- Ongoing investigation: Critical events retained indefinitely
- GDPR SAR (Subject Access Request): Log entries with user_id anonymized after 2 years
- Security audit: Logs retained per audit request (may extend retention)

**Legal Basis:** GDPR Article 33 (Security incident reporting)

---

### 7. Cost & System Monitoring Data

**Data Type:** Cost snapshots, error rates, deployment logs, performance metrics

**Retention Period:**
- **Recent (0-1 month):** Full detail (for incident response)
- **Medium (1-12 months):** Aggregated (1-day granularity)
- **Archive (>1 year):** Deleted

**Rationale:**
- Recent data: Required for real-time monitoring and debugging
- Medium-term: Trend analysis and capacity planning
- Old data: Minimal operational value, frees storage

**Deletion Process:**
1. Cost/monitoring data older than 1 year: Delete (automatic monthly job)
2. No manual intervention required
3. No audit/legal holds (operational data, not compliance-critical)

**Special Cases:**
- Active incident: Retain all data related to incident until resolved
- Post-incident review: Retain for 30 days after incident closure
- Performance trend needed: Request manual hold with justification

**Legal Basis:** Operational necessity only (not compliance-critical)

---

## User Rights & Requests

### Right to Access (GDPR Article 15)

**Request Process:**
1. User submits request via /api/subject-access-request (future endpoint)
2. Compliance team notified
3. Data compiled within 30 days
4. Delivered in portable format (JSON/CSV)
5. Includes: Profile, workspace, assessments, obligations, audit logs

**Data Excluded:**
- Other users' data (privacy)
- Metadata-only fields (internal IDs)
- Encrypted/hashed data (cannot be disclosed)

### Right to Deletion (GDPR Article 17)

**Request Process:**
1. User requests account deletion
2. Account marked as deleted (soft delete)
3. 30-day grace period
4. After 30 days: Hard delete executed
5. Confirmation email sent to user

**Exceptions:**
- Data required by law: Retained per legal requirement
- Active litigation: Retained per legal hold
- Active compliance obligations: Workspace owner notified

### Right to Data Portability (GDPR Article 20)

**Request Process:**
1. User requests data export
2. All user data compiled within 30 days
3. Delivered in standard format (JSON)
4. Includes: Profile, workspace ownership, assessments created

### Right to Rectification (GDPR Article 16)

**Process:**
1. User updates their profile directly in app
2. Changes apply immediately
3. Audit log records the update
4. No retention impact

---

## Data Retention Matrix

| Data Type | Retention Period | Auto-Delete | Legal Hold | GDPR Impact |
|-----------|------------------|------------|-----------|------------|
| User Profiles | 30 days after deletion | Yes | Yes | Article 17 |
| Workspaces | 90 days after termination | Yes | Yes | Article 17 |
| AI Systems | Indefinite | No | Yes | Compliance |
| Assessments | 7 years post-archive | Yes | Yes | Compliance |
| Obligations | Indefinite | No | Yes | Compliance |
| Evidence | 7 years + 2yr post-close | Yes | Yes | Article 5 |
| Audit Logs | 2yr active / 7yr archive | Yes | Yes | Article 33 |
| Cost Data | 1 year | Yes | No | Operational |
| Monitoring Data | 1 year | Yes | No | Operational |

---

## Implementation

### Automated Deletion Jobs

**Monthly Job: Archive Old Audit Logs**
```sql
-- Move audit logs >2 years old to archive table
INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';
```

**Monthly Job: Delete Old Cost Data**
```sql
-- Delete cost monitoring data >1 year old
DELETE FROM cost_snapshots 
WHERE created_at < NOW() - INTERVAL '1 year';
```

**Quarterly Job: Hard-Delete Marked Users**
```sql
-- Hard-delete users marked for deletion 30 days ago
DELETE FROM profiles 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
```

**Annual Job: Archive Old Assessments**
```sql
-- Move assessments >7 years to archive
INSERT INTO archived_assessments_long_term 
SELECT * FROM archived_assessments 
WHERE updated_at < NOW() - INTERVAL '7 years'
  AND NOT critical_hold;

DELETE FROM archived_assessments 
WHERE updated_at < NOW() - INTERVAL '7 years'
  AND NOT critical_hold;
```

### Monitoring & Compliance

**Quarterly Review:**
- Verify deletion jobs executing correctly
- Check for data marked as critical hold
- Review legal holds status
- Update retention policy if regulations change

**Annual Audit:**
- Verify compliance with retention policy
- Test data recovery procedures
- Update this policy document
- Train team on retention procedures

---

## Legal Holds & Exceptions

### Legal Hold Process

1. Legal team notifies data governance
2. Specific data marked with legal_hold = true
3. Retention clock paused
4. Data never auto-deleted while under hold
5. Once hold lifted: Retention clock resumes from pause point

### Regulatory Exceptions

**Healthcare (HIPAA/HITECH):**
- Retain 6 years minimum
- Implement additional encryption

**Finance (SOX/FINRA):**
- Retain 7 years minimum
- Include audit trail requirements

**Government Contracts (FedRAMP):**
- Retain per contract terms (typically 3-7 years)
- Enhanced backup procedures

---

## Policy Compliance & Certification

**Status:** DRAFT (Requires legal review)

**Required Before Production:**
- [ ] Legal review for GDPR compliance
- [ ] Legal review for CCPA compliance
- [ ] Legal review for industry-specific requirements (healthcare, finance, etc.)
- [ ] Security review for deletion procedures
- [ ] Technical review for implementation feasibility
- [ ] Data governance approval

**Maintenance:**
- Review annually
- Update for regulatory changes
- Incorporate feedback from audits
- Test procedures quarterly

---

## References

- GDPR: Regulation (EU) 2016/679
- CCPA: California Consumer Privacy Act
- HIPAA: Health Insurance Portability and Accountability Act
- SOC 2: Trust Service Criteria and Indicators

---

**Last Review:** 2026-07-15  
**Next Review Due:** 2027-07-15  
**Owner:** Data Governance & Privacy  
**Status:** DRAFT
