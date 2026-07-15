# Data Retention & Deletion Policy
## EURO AI — GDPR & Compliance Framework

**Authority:** Governor (Technical Operations)  
**Effective Date:** 2026-07-12  
**Scope:** All customer data in EURO AI production environment  
**Compliance:** GDPR Article 5(1)(e) (storage limitation), Article 17 (right to erasure)

---

## Executive Summary

EURO AI commits to:
1. **Retaining customer data** only as long as necessary for service delivery
2. **Deleting customer data** upon request within 30 days (GDPR compliance)
3. **Automatic purging** of certain data based on age and activity
4. **Transparent procedures** for customers to understand data lifecycle

This policy covers all data types: AI systems, risk assessments, evidence, user profiles, audit logs, and backups.

---

## Data Classification & Retention Periods

### Category 1: Active Customer Data (Indefinite Retention)
**Definition:** Data actively used by customer for compliance work

**Examples:**
- AI system inventory (name, vendor, risk classification)
- Risk assessments (responses to compliance questions)
- Evidence documents (uploaded compliance materials)
- Workspace configuration (team, permissions, settings)

**Retention Period:** **For the duration of the customer relationship** (active subscription) + 90 days post-cancellation

**Rationale:** Customers need this data available to reference past assessments and maintain compliance audit trails.

**Deletion Trigger:** Workspace cancellation + 90-day grace period

---

### Category 2: Workspace Member Data (Conditional Retention)
**Definition:** User profiles, roles, permissions, activity metadata

**Examples:**
- User email, name, role (Admin / Analyst / Viewer)
- Workspace membership and permissions
- Last login timestamp
- Activity metadata (who created which assessment, when)

**Retention Period:**
- **While active:** Entire duration of workspace + 90 days post-cancellation
- **If user leaves workspace:** User profile marked inactive, retained 30 days for audit trail, then deleted
- **If user deletes own account:** Immediate deletion of personally identifiable information; evidence.uploaded_by set to NULL

**Deletion Trigger:**
1. User manually deletes account via Settings → Account
2. Workspace admin removes user from team
3. Workspace cancels and 90-day grace expires

**Note:** Audit logs preserve the ACTION ("user X created assessment Y") but not the user's personal email/name.

---

### Category 3: Audit & Compliance Logs (Fixed Retention)
**Definition:** System-generated logs tracking actions for compliance

**Examples:**
- Audit log entries (who did what, when, from where)
- IP address and user agent on each action
- System event logs (login attempts, permission changes)

**Retention Period:** **7 years** (per EU recordkeeping requirements for financial/compliance audits)

**Deletion Trigger:** Automatic deletion after 7 years (managed by database trigger)

**Note:** These logs are anonymized of personal data (user email replaced with user_id); names not stored.

---

### Category 4: Backup & Archive Data (Graduated Retention)
**Definition:** Automated backups for disaster recovery

**Backup Schedule:**
- **Real-time backup:** Supabase continuous replication (3-region redundancy)
- **Daily backup:** Full database snapshot at 2:00 AM UTC
- **Weekly backup:** Long-term archive copy
- **Monthly backup:** Long-term compliance archive (kept for 12 months)

**Retention by Backup Type:**

| Backup Type | Frequency | Retention | Purpose |
|---|---|---|---|
| Real-time | Continuous | N/A (active) | Disaster recovery |
| Daily | Every 24h | 30 days | Quick restore |
| Weekly | Every 7 days | 12 weeks | Medium-term recovery |
| Monthly | Every month | 12 months | Compliance archive |

**Deletion Trigger:** Automatic based on retention schedule (no manual action needed)

**Note:** Backups are stored in same region as primary database; encrypted at rest.

---

### Category 5: HERCULES System Data (Enterprise Retention)
**Definition:** Internal EURO AI operational data (not customer-facing)

**Examples:**
- HERCULES workspace metadata
- Enterprise workspace association
- Living system status
- Internal audit trails

**Retention Period:** **Indefinite** (owned by EURO AI, not subject to customer deletion requests)

**Deletion Trigger:** None (EURO AI operational data)

**Note:** HERCULES data is subject to different governance (DNA-GOV-216) and is not affected by customer workspace deletion.

---

## Data Deletion Procedures

### Procedure 1: Customer-Initiated Workspace Deletion

**Trigger:** Workspace owner clicks "Delete Workspace" in Settings

**Steps:**

1. **Confirmation Dialog** (UI Layer)
   - Show: "Deleting [Workspace Name] is permanent. All data will be deleted after 90-day grace period."
   - Require: Email verification (confirm customer email address)
   - Require: Type workspace name to proceed

2. **Logical Deletion** (Immediate)
   - Mark workspace as `deleted_at = NOW()`
   - Set workspace status to "ARCHIVED"
   - Disable all user access (RLS policies block all queries)
   - Disable all API access
   - Send email confirmation to workspace owner

3. **90-Day Grace Period**
   - Customer can request restore via support (email support@euro-ai.production)
   - Data remains in database (hidden from user access)
   - Backups continue (in case of accidental deletion)

4. **Automatic Physical Deletion** (After 90 Days)
   - Run nightly cleanup job: `DELETE FROM workspaces WHERE deleted_at < NOW() - '90 days'::interval`
   - Cascade delete all related data:
     - ai_systems (workspace_id match)
     - risk_assessments (workspace_id match)
     - evidence (workspace_id match)
     - workspace_members (workspace_id match)
     - workspace_invites (workspace_id match)
     - Other workspace-specific data
   - Backups older than 90 days automatically deleted by Supabase retention policy

**Timeline:**
- T+0: Deletion requested
- T+0: Immediate confirmation email sent
- T+1-90 days: 90-day grace period (restore available)
- T+90: Automatic physical deletion executed
- T+90+30: Old backups purged by Supabase

**Customer Communication:**
```
Subject: Workspace Deletion Confirmation
Body:
Your EURO AI workspace "[Workspace Name]" has been marked for deletion.
Your data will be permanently deleted on [Date + 90 days].
To restore your workspace, reply to this email before that date.
```

---

### Procedure 2: User-Initiated Account Deletion

**Trigger:** User clicks "Delete My Account" in Settings → Account

**Steps:**

1. **Confirmation Dialog** (UI Layer)
   - Show: "Deleting your account is permanent. You will lose access to all workspaces."
   - Require: Password verification
   - Require: Type email address to proceed

2. **Immediate Data Anonymization** (Auth Layer)
   - Delete auth.users row (managed by Supabase Auth)
   - Cascade effect: All user_id foreign keys set to NULL (ON DELETE SET NULL)

3. **Profile Anonymization** (Database Layer)
   - Delete from public.profiles row
   - Audit logs: Replace user email with "deleted_user_[id]"
   - Evidence documents: Set evidence.uploaded_by = NULL

4. **Workspace Removal** (Business Logic)
   - Remove user from all workspace_members rows
   - If user was workspace owner and sole owner → workspace marked for deletion
   - If user was workspace owner but other owners exist → transfer ownership to longest-active owner
   - If user was member → simply remove from team

**Timeline:**
- T+0: Account deletion initiated
- T+0: Immediate auth.users deletion (managed by Supabase)
- T+0: Profile anonymization completed
- T+1: Confirmation email sent (if stored, else manual confirmation required)
- T+1-30: Audit logs still reference deleted account (for compliance)
- T+30: Audit logs may be purged if beyond 7-year retention window

**Customer Communication:**
```
Subject: EURO AI Account Deletion Complete
Body:
Your EURO AI account has been deleted.
Your personal data (email, profile) has been removed.
Historical audit records may remain for compliance purposes.
```

---

### Procedure 3: User Removal by Workspace Admin

**Trigger:** Workspace admin clicks "Remove User" in Settings → Team

**Steps:**

1. **Confirmation Dialog** (UI Layer)
   - Show: "Removing [User Email] from [Workspace Name]. They will lose access immediately."
   - No grace period (immediate access revocation)

2. **Immediate Access Removal** (Database Layer)
   - Delete from workspace_members where user_id = [target] AND workspace_id = [current]
   - RLS policies immediately block user access
   - Any active sessions invalidated

3. **Data Preservation** (Audit Trail)
   - Keep user's authored content (assessments, evidence)
   - Change ownership to workspace owner (auto-transfer)
   - Keep audit log entries (who created what, when)

4. **Notification** (Optional)
   - Send email to removed user: "You have been removed from workspace [Name]"
   - Send email to workspace admin: "User [Email] removed successfully"

**Timeline:**
- T+0: Removal requested by admin
- T+0: Immediate access revocation
- T+0: Confirmation emails sent
- T+1+: User data preserved for audit trail

**Customer Communication:**
```
Subject: Removed from EURO AI Workspace
Body:
You have been removed from the EURO AI workspace "[Workspace Name]".
If you have questions, contact the workspace admin or support@euro-ai.production.
```

---

### Procedure 4: Automatic Purging of Inactive Workspaces

**Trigger:** Automated nightly job (runs 2:00 AM UTC daily)

**Conditions:**
- Workspace has NO login activity for 180 days (6 months)
- Workspace has NO changes to assessments, evidence, or configuration for 180 days
- Workspace has NOT received support tickets for 180 days
- Workspace is marked as "inactive" by Governor (manual flag, sent warning email first)

**Steps:**

1. **Warning Notification** (Day 1 of inactivity detection)
   - Send email to workspace owner: "Your EURO AI workspace appears inactive"
   - Provide: "To restore activity, log in or contact support"
   - Provide: "Without activity, workspace will be deleted in 30 days"

2. **Second Notice** (Day 150)
   - If still inactive: Send second email (stronger language)
   - Provide: "Your workspace will be deleted in 30 days"
   - Provide: Contact Founder for exception

3. **Final Notice** (Day 170)
   - If still inactive: Send final email
   - Provide: "Your workspace will be deleted on [Date + 10 days]"

4. **Automatic Deletion** (Day 180)
   - Mark workspace as `deleted_at = NOW()`
   - Set status to "ARCHIVED"
   - Disable all access
   - Retain for 90-day grace period (see Procedure 1)

**Note:** This is a protective measure against stale data accumulation. Customers can always request restoration.

---

## GDPR Right to Erasure (Article 17)

### Scope

EURO AI honors GDPR Article 17 "Right to be Forgotten" with the following implementation:

**Applies to:**
- User personal data (email, name, profile information)
- Data that is no longer necessary for service delivery
- Data where legal basis has expired

**Does NOT apply to:**
- Data required by law (tax records, audit logs kept for 7 years)
- Data actively used for ongoing services (AI systems, risk assessments, if workspace is active)
- Anonymized data (cannot identify individual)

---

### Exercise Right to Erasure

**Request Method:**

Email: support@euro-ai.production  
Subject: GDPR Article 17 - Right to Erasure Request

**Required Information:**
- Your full name
- Your email address
- Workspace name (if applicable)
- Specific data categories to delete (or request all)

**Response Timeline:**

- **Acknowledgment:** Within 3 business days
- **Verification:** We verify you're the data subject or authorized representative
- **Execution:** Within 30 days of verification
- **Confirmation:** Email confirmation once deletion complete

---

### Deletion Response by Data Type

| Data Type | Action | Timeline |
|---|---|---|
| User profile (email, name) | Immediate deletion | Day 0-1 |
| Workspace membership | Immediate removal | Day 0-1 |
| Active assessments/evidence | Delete if workspace inactive; archive if active | Day 1-7 |
| Audit logs | Anonymize (remove name, keep ID) | Day 1-7 |
| Backups | Purge from backups (if <90 days old) | Day 7-30 |

---

### Example: Right to Erasure Request

**Customer Scenario:**
Jane Doe works at Customer Inc. She leaves the company. She requests her personal data be deleted.

**EURO AI Action:**
1. Delete Jane's auth.users record (Supabase Auth)
2. Delete Jane's profiles record
3. Remove Jane from workspace_members (across all workspaces)
4. Anonymize audit log entries: "Jane Doe" → "deleted_user_[id]"
5. Set Jane's uploaded evidence to owner = NULL
6. Send confirmation: "Your data has been deleted per GDPR Article 17"

**Result:**
- Jane has no personal data in EURO AI
- Historical audit trail preserved (compliant with 7-year retention)
- Evidence documents remain (ownership transferred)
- Jane cannot be identified from remaining data

---

## Data Protection Measures

### Encryption at Rest

**Standard:** AES-256

**Implementation:**
- Supabase PostgreSQL: Encrypted at storage layer
- Backups: Encrypted (managed by Supabase)
- Audit logs: Encrypted (same as primary database)

**Key Management:** Managed by Supabase (keys rotated per Supabase security policy)

---

### Encryption in Transit

**Standard:** TLS 1.2+

**Implementation:**
- All API communications: HTTPS required
- Database connections: Encrypted via Supabase connection string
- Backups: Encrypted during transfer

---

### Access Control

**Database Layer:** Row-Level Security policies enforce workspace isolation
- Authenticated users: Can see only their workspace data
- Service role: Full access (used internally by Governor/automation)
- Public anon key: No direct database access (API only)

**Application Layer:** API routes validate workspace membership before returning data

**Operational Layer:** Governor has access to all data (for debugging/support) with audit trail

---

## Compliance Standards

### GDPR Article 5: Principles Relating to Processing

- ✅ **Lawfulness, fairness, transparency:** Explicit policy, clear procedures
- ✅ **Purpose limitation:** Data used only for compliance work (unless explicitly consented)
- ✅ **Data minimization:** Only required fields collected
- ✅ **Accuracy:** Customer responsible; EURO AI provides tools to update
- ✅ **Storage limitation:** This policy; automatic purging implemented
- ✅ **Integrity & confidentiality:** Encryption + access control

### GDPR Article 17: Right to Erasure

- ✅ Implemented per section above
- ✅ 30-day response time
- ✅ Exceptions documented (legal retention, active services)

### ISO 27001: Information Security Management

- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ Access control (RLS policies)
- ✅ Audit trails (7-year retention)
- ✅ Backup strategy (3-region replication)

---

## Operational Procedures for Governor

### Daily Tasks

**2:00 AM UTC — Automated Backup**
```
Managed by Supabase (no manual action)
Verify: Check backup completion in Supabase dashboard
```

**Nightly — Purge Old Audit Logs**
```sql
DELETE FROM audit_log
WHERE created_at < NOW() - '7 years'::interval;
```

**Nightly — Mark Inactive Workspaces**
```sql
UPDATE workspaces
SET deleted_at = NOW()
WHERE 
  deleted_at IS NULL 
  AND last_activity_at < NOW() - '180 days'::interval
  AND warned_at IS NOT NULL
  AND warned_at < NOW() - '30 days'::interval;
```

### Weekly Tasks

**Monday 10:00 AM UTC — Audit Report**
- Verify: All automated purging jobs completed
- Report: Workspaces deleted, users removed, audit logs purged
- Check: No errors in deletion logs

### Monthly Tasks

**1st of month — Backup Verification**
- Test: Restore from 30-day-old backup to test environment
- Verify: Data integrity, all tables present
- Report: Restoration time, data completeness

---

## Exceptions & Escalations

### Exception Request: Extended Retention

**Scenario:** Customer needs data retained longer than standard policy

**Process:**
1. Customer emails: support@euro-ai.production with "RETENTION EXCEPTION" in subject
2. Governor reviews: Verifies legitimate business need
3. Governor authorizes: Grants 6-month extension (if justified)
4. Document: Exception logged in governance registry
5. Communicate: Confirm new retention end-date to customer

### Exception Request: Accelerated Deletion

**Scenario:** Customer needs data deleted before standard retention period

**Process:**
1. Customer emails: support@euro-ai.production with "ACCELERATED DELETION" in subject
2. Verify: Confirm customer identity + authority to request
3. Execute: Immediate deletion (per GDPR compliance)
4. Confirm: Send deletion confirmation email

### Legal Hold

**Scenario:** Law enforcement or court order requires data retention

**Process:**
1. Governor receives: Court order or legal subpoena
2. Escalate: Contact Founder immediately
3. Preserve: Hold all deletion procedures for affected data
4. Document: Store legal hold notice in secure location
5. Comply: Produce requested data per legal requirements

---

## Monitoring & Reporting

### Metrics to Track

| Metric | Frequency | Threshold | Action |
|---|---|---|---|
| Workspace deletions per month | Monthly | >5% of active | Investigate churn |
| Average data retention age | Monthly | N/A | Report trend |
| Right to erasure requests | Monthly | >2 per month | Escalate if > 5 |
| Backup restoration success | Monthly | 100% | Alert if <100% |
| Audit log growth (GB/month) | Monthly | <50 GB | Warn if >100 GB |

### Annual Compliance Audit

**Scope:** Verify policy compliance

**Procedure:**
1. Sample 10 random customer workspaces
2. Verify: Correct data retention applied
3. Verify: No unauthorized data remaining
4. Verify: Audit logs present and complete
5. Verify: Backups exist and recoverable
6. Report: PASSED or REMEDIATION REQUIRED
7. Document: Annual compliance certificate

---

## Amendments & Updates

**Last Updated:** 2026-07-12  
**Version:** 1.0  
**Next Review:** 2026-12-12 (6 months)

**Policy Owner:** Governor (Technical Operations)  
**Approval Required From:** Founder (before deployment)

**Change Log:**
- 2026-07-12 v1.0: Initial policy created

---

## Questions or Requests

**For Customers:**
- Email: support@euro-ai.production
- Subject line: "DATA RETENTION" or "RIGHT TO ERASURE"

**For Governor (Internal):**
- Reference: `/docs/governance/DATA_RETENTION_DELETION_POLICY.md`
- Automation location: `/scripts/` (scheduled jobs)
- Database schema: `/supabase/schema.sql` (CASCADE rules, ON DELETE clauses)

---

*This policy is binding on EURO AI and all customer agreements reference this document.*

*Last updated: 2026-07-12*  
*Version: 1.0*  
*Compliance Standard: GDPR (EU), ISO 27001*
