# Data Retention & Deletion Policy

## EURO AI (Cathedral) — GDPR Compliance & Data Lifecycle Management

**Authority:** Governor (Chief Advisor & Chief of Staff)  
**Effective Date:** 2026-07-12  
**Scope:** EURO AI multi-tenant SaaS platform; all customer data

---

## Executive Summary

EURO AI respects the EU's General Data Protection Regulation (GDPR), including the right to be forgotten. This document defines:

1. **Data retention periods** for different data types
2. **Deletion procedures** for user data and workspaces
3. **Backup & recovery policies** to balance compliance with business continuity
4. **Audit trail** for all deletion operations
5. **Customer rights** regarding data access, export, and deletion

---

## Part 1: Data Retention Periods

### Workspace Data (Customer-Controlled)

| Data Type               | Retention Period        | Why This Period                                 | Customer Control                             |
| ----------------------- | ----------------------- | ----------------------------------------------- | -------------------------------------------- |
| **AI Systems**          | Until workspace deleted | Core business data; customer owns               | Full (can delete anytime)                    |
| **Risk Assessments**    | Until workspace deleted | Core compliance data; audit trail needs it      | Full (can delete anytime)                    |
| **Evidence Documents**  | Until workspace deleted | Compliance evidence; required for audits        | Full (can delete anytime)                    |
| **Remediation Records** | Until workspace deleted | Legal evidence; customer compliance requirement | Full (can delete anytime)                    |
| **HERCULES Event Logs** | Until workspace deleted | Enterprise operating system records             | Governor-controlled (immutable during pilot) |

**Why:** Customer data is the customer's property. EURO AI retains it as long as the customer wants it.

### User Account Data

| Data Type                      | Retention Period            | Why This Period                                   | Notes                                       |
| ------------------------------ | --------------------------- | ------------------------------------------------- | ------------------------------------------- |
| **Profile (name, email, org)** | Until user deletion request | User identity; customer owns                      | GDPR right to be forgotten applies          |
| **Auth logs (login history)**  | 90 days                     | Security monitoring; aged logs can be deleted     | Automatic purge after 90 days               |
| **Workspace membership**       | Until user deletion         | Audit trail; shows who had access to what         | Retained for compliance (can be anonymized) |
| **Audit trail entries**        | 7 years (EU regulation)     | Legal/regulatory requirement for business records | Immutable after 30 days                     |

**Why:** 90-day auth log retention balances security investigation needs with privacy. 7-year audit log retention satisfies EU business record requirements.

### System Data (Non-Customer)

| Data Type               | Retention Period  | Why This Period                          | Deletion                               |
| ----------------------- | ----------------- | ---------------------------------------- | -------------------------------------- |
| **Application logs**    | 30 days           | Troubleshooting & incident investigation | Auto-purged; no customer control       |
| **Performance metrics** | 90 days           | Capacity planning & alerting             | Auto-purged; aggregated after 30 days  |
| **Error reports**       | 30 days           | Bug tracking & fixes                     | Auto-purged; no PII included           |
| **Monitoring data**     | 365 days (annual) | Year-over-year health trending           | Auto-purged; no customer data included |

**Why:** Operational data needed for platform health; no customer PII included; auto-deletion after periods expire.

---

## Part 2: Deletion Procedures

### Individual User Deletion (GDPR Right to be Forgotten)

**Trigger:** User requests deletion via support email or sends GDPR data deletion request.

**Process:**

**Step 1: Receive Request (Governor)**

- Customer or user sends: "I want to delete my account" or "Please exercise my right to be forgotten"
- Governor responds within 24 hours: "Understood. We'll process your deletion within 30 days per GDPR."
- Governor opens ticket: "User Deletion Request — [User Name]"

**Step 2: Validation (Governor)**

- Confirm user identity (email address + workspace)
- Confirm user is not a workspace owner (see "Workspace Owner Deletion" below if they are)
- Check for active sessions; warn user they'll be logged out

**Step 3: Data Preparation (Governor)**

- Run deletion query:
  ```sql
  BEGIN;
  -- Check what data will be affected
  SELECT workspace_id, COUNT(*) as content_count
  FROM risk_assessments
  WHERE user_id = '[USER_ID]'
  GROUP BY workspace_id;

  -- Document: All assessments authored by user will become unattributed
  -- (author_id → NULL per FK ON DELETE SET NULL policy)

  COMMIT;
  ```

**Step 4: Customer Notification (Governor)**

- Email customer: "User [Name] will be deleted in 24 hours. You can cancel this request by replying to this email."
- Include: List of content that will become unattributed (assessments, evidence, comments)
- Include: Option to download user's data before deletion (export feature)

**Step 5: Deletion Execution (Governor)**

- After 24-hour cooling-off period, execute:
  ```sql
  BEGIN;

  -- Anonymize user name/email
  UPDATE auth.users
  SET email = 'deleted-' || gen_random_uuid() || '@deleted.local'
  WHERE id = '[USER_ID]';

  -- Anonymize profile
  UPDATE profiles
  SET full_name = 'Deleted User'
  WHERE user_id = '[USER_ID]';

  -- Log deletion
  INSERT INTO audit_log (workspace_id, user_id, action, resource_type, details)
  VALUES (NULL, '[USER_ID]', 'user_deleted', 'auth.users',
    'User account permanently deleted per GDPR request');

  -- Supabase automatically cascades deletes to workspace_members, etc.
  -- via FK constraints

  COMMIT;
  ```

**Step 6: Verification (Governor)**

- Confirm user cannot log in
- Confirm auth.users email is anonymized
- Confirm profile is anonymized
- Send confirmation email: "Your account has been permanently deleted. You can no longer log in to EURO AI."

**Step 7: Archive (Governor)**

- Save deletion request + approval in secure archive (encrypted backups)
- Retain for 7 years (EU regulation: business records)

**Success Criteria:**

- User cannot authenticate
- User data is anonymized (not deleted outright, for audit trail integrity)
- Audit log shows deletion timestamp + who approved it
- Customer acknowledged deletion via email

---

### Workspace Deletion (Customer Cancellation)

**Trigger:** Customer cancels pilot or production subscription. Want to delete all their data.

**Process:**

**Step 1: Receive Request (Governor)**

- Customer/workspace owner sends: "We want to delete our workspace and all data"
- Governor responds: "Understood. We'll delete your workspace within 48 hours. Please confirm in writing that this is intentional."

**Step 2: Owner Confirmation (Governor)**

- Workspace owner must reply to confirmation email: "Yes, delete everything"
- Or via support form: "I confirm deletion of workspace [Workspace ID]"
- Cooling-off period: 48 hours (no irreversible action for 2 days)

**Step 3: Data Backup (Governor)**

- Before deletion, offer customer a complete data export:
  ```
  "Would you like a backup of your data before we delete it?
   Download link: [CSV export of all systems, assessments, evidence]
   Valid for 7 days."
  ```
- Optional: Customer requests backup via email

**Step 4: Final Confirmation (Governor)**

- Send final confirmation email:
  "Your workspace [Workspace Name] will be permanently deleted on [Date+48hrs].
  After deletion, you cannot recover any data.
  Reply to confirm, or email support@euro-ai.production to cancel deletion."

**Step 5: Deletion Execution (Governor + Founder)**

- After 48 hours + owner approval:
  ```sql
  BEGIN;

  -- Log deletion (before any data is deleted)
  INSERT INTO audit_log (workspace_id, action, resource_type, details)
  VALUES ('[WORKSPACE_ID]', 'workspace_deleted', 'workspaces',
    'Workspace permanently deleted per customer request. Owner: [Owner Name]. Date: [Date].');

  -- Delete all workspace-specific data (cascades via FK)
  DELETE FROM workspaces WHERE id = '[WORKSPACE_ID]';

  -- Cascading deletes will handle:
  -- - workspace_members
  -- - ai_systems
  -- - risk_assessments
  -- - evidence
  -- - remediation_tasks
  -- - hercules_* (enterprise records associated with workspace)

  COMMIT;
  ```

**Step 6: Verification (Governor)**

- Confirm workspace no longer appears in customer's account
- Confirm all related data deleted (via count queries)
- Send confirmation email: "Your workspace and all data have been permanently deleted."

**Step 7: Archive Deletion Request (Governor)**

- Save customer's deletion request + approvals in secure archive
- Retain for 7 years (EU regulation: business records)

**Success Criteria:**

- Workspace no longer accessible
- All child data deleted
- Audit log captures deletion event (immutable)
- Customer confirmed deletion via email
- Backup offered and provided (if requested)

---

### Aged Data Auto-Deletion

**Auth Logs (Auto-purge after 90 days):**

Scheduled job (runs daily at 2 AM UTC):

```sql
DELETE FROM auth_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Application Logs (Auto-purge after 30 days):**

Scheduled job (runs daily at 2 AM UTC):

```sql
DELETE FROM application_logs
WHERE created_at < NOW() - INTERVAL '30 days'
AND NOT contains_error = true;

-- Keep error logs for 90 days for debugging
DELETE FROM application_logs
WHERE contains_error = true
AND created_at < NOW() - INTERVAL '90 days';
```

**Performance Metrics (Auto-purge after 90 days):**

Scheduled job (runs weekly, Sundays at 3 AM UTC):

```sql
-- Aggregate metrics older than 30 days into summaries
INSERT INTO performance_metrics_summary (metric_name, daily_avg, date_range)
SELECT metric_name, AVG(value), '[30-90 days ago]'
FROM performance_metrics
WHERE created_at >= NOW() - INTERVAL '90 days'
AND created_at < NOW() - INTERVAL '30 days'
GROUP BY metric_name;

-- Delete detailed metrics older than 90 days
DELETE FROM performance_metrics
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Part 3: Audit Trail & Immutability

### Audit Log Requirements

**The audit_log table is immutable after 30 days.** This satisfies GDPR's balance between:

- **Right to be forgotten:** User personal data deleted
- **Business records:** Compliance history retained anonymously

**Immutable audit log fields:**

```
id: UUID (primary key; never changes)
workspace_id: UUID (identifies which customer; can be deleted but log entry remains)
user_id: UUID (anonymized if user deleted; log entry remains with user_id = NULL)
action: TEXT (what was done: 'user_deleted', 'assessment_created', etc.)
resource_type: TEXT (what was affected: 'auth.users', 'risk_assessments', etc.)
resource_id: UUID (ID of deleted/modified item; can point to deleted data)
details: JSONB (metadata; never altered)
ip_address: INET (where action originated; can be anonymized after 90 days)
user_agent: TEXT (browser/app info; can be anonymized after 90 days)
created_at: TIMESTAMP (when action occurred; immutable)
```

**Modification rules:**

- ✅ Allowed: Anonymize user_id field after user deletion
- ✅ Allowed: Truncate ip_address after 90 days (for privacy)
- ❌ NOT allowed: Delete audit log entry itself
- ❌ NOT allowed: Modify created_at timestamp
- ❌ NOT allowed: Modify action or resource_type

**Example: Audit log after user deletion**

Before deletion:

```
id: 550e8400-e29b-41d4-a716-446655440000
workspace_id: e10ee1b2-99a3-4d4c-a5a0-a9e9f3e0e6b1
user_id: 3fa85f64-5717-4562-b3fc-2c963f66afa6  (← Real user ID)
action: assessment_created
resource_type: risk_assessments
details: {"assessment_name": "ChatGPT Risk Assessment"}
created_at: 2026-05-10 14:22:00 UTC
```

After user deletion (30+ days later):

```
id: 550e8400-e29b-41d4-a716-446655440000  (← Unchanged)
workspace_id: e10ee1b2-99a3-4d4c-a5a0-a9e9f3e0e6b1  (← Unchanged)
user_id: NULL  (← Anonymized; no longer links to user)
action: assessment_created  (← Unchanged)
resource_type: risk_assessments  (← Unchanged)
details: {"assessment_name": "ChatGPT Risk Assessment"}  (← Unchanged)
created_at: 2026-05-10 14:22:00 UTC  (← Unchanged)
```

**Benefit:** Audit trail proves "something was created on this date by someone in this workspace" without revealing who (privacy), while maintaining business continuity (company still has compliance proof).

---

## Part 4: Backup & Recovery Policies

### Automatic Backups

**Supabase manages daily backups automatically.**

| Backup Type            | Frequency        | Retention             | Recovery Time |
| ---------------------- | ---------------- | --------------------- | ------------- |
| Automated snapshot     | Daily (2 AM UTC) | 7 days                | ~15 minutes   |
| Point-in-time recovery | Every 6 hours    | 28 days               | ~30 minutes   |
| Long-term archive      | Weekly           | 1 year (cold storage) | ~24 hours     |

**Governor cannot directly access Supabase backups.** Restoration requires Supabase support.

### Customer-Managed Backups (Recommended)

**Customers should export their data regularly.** EURO AI provides:

1. **One-click export to CSV** (in Settings → Export)
   - All systems, assessments, evidence metadata
   - Does NOT include audit trail (audit log is immutable)
   - Format: .zip file with multiple CSVs
   - Can be scheduled weekly via email (future v1.1 feature)

2. **API-based backup** (for technical teams)
   - Export endpoint: GET /api/export
   - Authentication: Bearer token
   - Returns: Full workspace data as JSON
   - Rate limit: 1 export per day (to prevent abuse)

**Recommended frequency:** Weekly backups (every Friday)

**Storage:** Customer keeps backup in their own secure storage (Google Drive, AWS S3, etc.)

---

## Part 5: Special Cases

### HERCULES Event Logs (Immutable by Design)

**HERCULES records are service-role-only. Deletion is NOT permitted** (even by customer on request).

Rationale:

- HERCULES tracks enterprise governance decisions (Cathedral operating as Enterprise 001)
- Audit trail shows historical state of enterprise decisions
- Deleting would violate governance compliance
- Customer does not "own" HERCULES records (Founder does)

**What if customer wants to delete HERCULES data?**

- Governor explains: HERCULES is immutable governance record; cannot be deleted
- Governor offers: Anonymization of sensitive HERCULES metadata (on case-by-case basis)
- Founder approval required for any HERCULES modification

### Evidence Documents (File Retention)

**When risk assessment is deleted, do we delete uploaded files?**

Answer: **Files are soft-deleted (marked as deleted, but not physically removed for 30 days).**

Process:

1. Customer deletes assessment
2. File marked with deleted_at timestamp in database
3. File remains on storage for 30 days (in case of accidental deletion)
4. After 30 days, automated cleanup removes file from storage
5. Audit log records deletion: "evidence_deleted, file_id=[ID], deleted_by=[USER]"

**Benefit:** Accidental deletion can be recovered within 30 days; no permanent loss.

---

## Part 6: Customer Rights (GDPR Compliance)

### Right to Access (Article 15)

**Customer can request:** "Give me all my data in a machine-readable format"

**EURO AI provides:**

- CSV export via Settings → Export (downloadable immediately)
- API export via GET /api/export?format=json (for technical teams)
- Email export: support@euro-ai.production with subject line "Access Request"

**Response time:** Within 30 days (GDPR standard)

### Right to Rectification (Article 16)

**Customer can request:** "Fix incorrect data in my assessments"

**EURO AI provides:**

- Edit feature in platform (customer can edit any field)
- Or email Governor: "Please correct [data] in my workspace"

**Response time:** Immediate (customer-controlled) or within 7 days (Governor-assisted)

### Right to Erasure (Article 17 — "Right to be Forgotten")

**Customer can request:** "Delete my account and all my data"

**EURO AI provides:**

- User deletion procedure (see Part 2, Section 1)
- Workspace deletion procedure (see Part 2, Section 2)

**Response time:** Within 30 days; cooling-off period of 48 hours before irreversible deletion

**Exceptions:**

- Audit log entries cannot be deleted (retained for 7 years for compliance)
- HERCULES records cannot be deleted (immutable governance records)
- Backups retain deleted data for up to 7 days (automatic recovery windows)

### Right to Data Portability (Article 20)

**Customer can request:** "Give me my data in a format I can import to another service"

**EURO AI provides:**

- CSV export (can be imported to Excel, other platforms)
- JSON export (can be parsed programmatically)
- Format: Standardized schema (documented in API docs)

**Response time:** Within 30 days (via Settings → Export or API)

### Right to Restrict Processing (Article 18)

**Customer can request:** "Don't process my data; just store it"

**EURO AI limitation:** Not currently supported for pilot customers. Processing is minimal (read-only access), but full restriction requires engineering work (v1.1 feature).

**What we do instead:**

- Freeze workspace (disable all editing; read-only mode)
- Stop sending any notifications or reports
- Continue automatic backups (for your protection)

**Request:** Email support@euro-ai.production with "Restrict Processing Request"

---

## Part 7: Procedures by Role

### Customer (Workspace Owner)

**You can:**

- Delete your own account (right to be forgotten)
- Delete entire workspace (right to erasure)
- Export your data anytime (right to portability)
- Correct any data (right to rectification)
- Request backup before deletion (risk mitigation)

**You cannot:**

- Delete audit logs (immutable for compliance)
- Restore data after 48-hour cooling-off period expires (irreversible)
- Access deleted users' personal data (anonymized)

**How to:**

1. **Delete your account:** Settings → Account → "Delete Account"
2. **Delete workspace:** Settings → Workspace → "Delete Workspace"
3. **Export data:** Settings → Export → "Download CSV"
4. **Request access/rectification:** Email support@euro-ai.production

### Governor (Support & Operations)

**You handle:**

- Receiving deletion requests from customers
- Validating customer identity
- Executing deletions (after customer confirmation)
- Notifying customers of completion
- Archiving deletion requests (7 years)
- Monitoring automated purges (auth logs, app logs, metrics)

**You cannot:**

- Delete data without customer written request + confirmation
- Modify audit logs
- Restore deleted data (only Supabase can do point-in-time recovery)

**Tools available:**

- Supabase SQL console (for manual verification queries)
- Supabase backup dashboard (for restore requests to Supabase support)
- Audit log viewer (in-platform: Settings → Audit Trail)

### Founder

**You approve:**

- Workspace deletions (after 48-hour cooling period expires)
- Any HERCULES data modifications
- Data retention policy changes
- Exceptions to standard deletion procedures (rare cases)

**You monitor:**

- Deletion request volume (governance metric)
- Average deletion processing time (SLA: 30 days max)
- Any unscheduled/unauthorized deletions (security audits)

---

## Part 8: Data Retention & Deletion Checklist

**Use this checklist for deletion processing:**

- [ ] **Receive Request:** Customer or user submits deletion request with clear intent
- [ ] **Validate Identity:** Confirm requester is account owner or workspace owner
- [ ] **Document Request:** Open support ticket; record request details + timestamp
- [ ] **Customer Notification:** Send confirmation email; explain consequences; start cooling-off period
- [ ] **Data Preparation:** Run verification queries; confirm what will be deleted/anonymized
- [ ] **Final Confirmation:** Customer must reply/confirm ("Yes, delete")
- [ ] **Cooling-Off Period:** Wait 48 hours for workspace deletion; 24 hours for user deletion
- [ ] **Backup Offer:** Offer customer a CSV export before irreversible deletion
- [ ] **Execution:** Run deletion SQL after cooling period + confirmation
- [ ] **Verification:** Confirm deletion via access test + count queries
- [ ] **Customer Notification:** Send completion email with proof of deletion
- [ ] **Archive:** Save deletion request + approvals in secure backup (7-year retention)
- [ ] **Audit Log Review:** Verify deletion event recorded in audit_log (immutable)

---

## Part 9: Monitoring & Auditing

### Monthly Deletion Report (Governor → Founder)

**Report contents:**

- Total user deletions this month
- Total workspace deletions this month
- Average processing time (from request to completion)
- Any issues/exceptions
- Any failed deletion attempts

**Frequency:** First Friday of each month

**Example:**

```
July 2026 Deletion Report:
- User deletions: 2
- Workspace deletions: 0
- Avg processing time: 4 days (target: ≤30 days) ✅
- Issues: None
- Next month outlook: Expecting 0-1 deletions (no customer churn known)
```

### Annual GDPR Compliance Audit (Founder)

**Review:**

- All deletion procedures executed correctly
- Audit logs are immutable (no tampering)
- Backups retained per policy
- No unauthorized data access during deletion
- Customer rights honored (response times <30 days)
- No data breaches related to deletion process

**Frequency:** Annually (July; 1-year anniversary of go-live)

---

## Part 10: Data Retention Policy Exceptions

### Pilot Customers (Special Handling)

**During pilot phase (Weeks 1-5):**

- Workspace deletion requests require Founder approval (to protect pilot investment)
- User deletion allowed normally
- Data export encouraged weekly

**After pilot completion (Week 6+):**

- Workspace deletion requests follow standard procedure
- No special approvals needed

### HERCULES Data (Immutable by Design)

**HERCULES workspace records cannot be deleted because:**

- They are enterprise governance records (not customer-specific)
- They are foundational to Cathedral's living enterprise operating system
- Deletion would create audit gaps

**Exception process:** Only Founder can approve HERCULES data modifications (rare cases only)

### Legal Hold (Litigation/Investigation)

**If customer data is subject to legal hold:**

- Governor notifies Founder immediately
- All deletion requests are paused
- Data is preserved indefinitely until legal hold lifted
- Customer notified: "We received a legal hold; your data will be retained per legal requirement"

**Process:**

- Founder receives legal hold notice from lawyer
- Founder pauses all deletion operations for affected workspace(s)
- Governor documents hold in audit log: "legal_hold_initiated, reason: [litigation detail]"
- Deletion requests are declined: "We cannot honor this request due to pending litigation"

---

## Part 11: Frequently Asked Questions

**Q: If a customer deletes their workspace, can we recover it?**  
A: Not automatically. We'll keep their data in Supabase backups for 7 days. After that, only Supabase can do point-in-time recovery (ask them within 30 days). Encourage customers to export before deletion.

**Q: What if a user deletes their account but still wants to use the platform?**  
A: They can't. Deleting a user account is irreversible. They'd need to create a new account (new user ID). Explain this in the confirmation email.

**Q: How long do we keep audit logs?**  
A: 7 years (EU regulatory requirement for business records). They're immutable; customer cannot request deletion.

**Q: What about payment records and invoices?**  
A: Separate system (outside EURO AI). Retained per tax/accounting requirements (7-10 years depending on jurisdiction). Contact Founder for payment data deletions.

**Q: Can a workspace owner delete another user's account?**  
A: No. Only the user themselves can request account deletion. Workspace owner can remove them from the workspace (workspace_members) but cannot delete their auth account.

**Q: If we're acquired or go out of business, what happens to customer data?**  
A: Customer data is deleted per this policy unless customer explicitly opts in to data transfer. Customers will receive 60-day notice and opportunity to download their data.

---

## Part 12: Implementation Status

| Procedure                          | Status          | Implemented By         | Notes                                    |
| ---------------------------------- | --------------- | ---------------------- | ---------------------------------------- |
| User account deletion              | ✅ Ready        | Governor (SQL trigger) | Tested in dev; verified idempotent       |
| Workspace deletion                 | ✅ Ready        | Governor (SQL trigger) | 48-hour cooling period enforced          |
| Aged data purge (90-day auth logs) | ⏳ Pending      | DevOps (scheduled job) | Need cron job setup on Supabase          |
| Audit log immutability             | ✅ Ready        | Database constraints   | Primary key lock + no UPDATE permissions |
| User export (CSV)                  | ✅ Ready        | Application API        | Settings → Export available now          |
| API export (JSON)                  | ⏳ Pending v1.1 | Engineering            | Scheduled for Month 2 development        |
| Right to restrict processing       | ⏳ Pending v1.1 | Engineering            | Requires read-only workspace mode        |

---

## Summary for Customers

**In your onboarding materials, include:**

> **Your Data Rights (GDPR Compliance)**
>
> EURO AI gives you full control over your data:
>
> ✅ **Export anytime:** Settings → Export gives you a backup of all your data as CSV  
> ✅ **Delete anytime:** Settings → Account → Delete Account (48-hour confirmation required)  
> ✅ **Delete workspace:** Settings → Workspace → Delete (48-hour cooling period; all data removed)  
> ✅ **Audit trail:** All actions logged; you can view who changed what and when  
> ✅ **Right to be forgotten:** Full compliance with GDPR Article 17
>
> We retain automated backups for 7 days after deletion (for accident recovery).  
> We retain compliance audit logs for 7 years (regulatory requirement).  
> We never sell your data.

---

**Last Updated:** 2026-07-12  
**Version:** 1.0  
**Author:** Governor (Chief Advisor & Chief of Staff)  
**Reviewed By:** [Founder Name]  
**Status:** Ready for customer onboarding
