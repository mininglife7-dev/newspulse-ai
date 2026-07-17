# Cathedral/EURO AI Production Readiness Checklist

## Final Verification Before Customer Pilot (Week 2)

**Authority:** Governor (Chief Advisor & Chief of Staff)  
**Date:** 2026-07-12  
**Due Date:** End of Week 1 (before Week 2 customer onboarding begins)  
**Audience:** Founder + Engineering Team  
**Status:** Ready for Founder Review

---

## Executive Summary

This checklist verifies all systems are production-ready for the first paying customer pilot. Use it to confirm:

- ✅ Infrastructure is stable and monitored
- ✅ Database is deployed and verified
- ✅ Application features work end-to-end
- ✅ Security and compliance controls are in place
- ✅ Support procedures are documented
- ✅ Monitoring and alerting are active
- ✅ Rollback procedures are documented
- ✅ Customer materials are ready
- ✅ Team is trained and prepared

**Total Checklist Items:** 67  
**Estimated Time to Complete:** 2-3 hours  
**Founder Must Verify:** YES (sign-off required before customer onboarding)

---

## SECTION 1: SUPABASE INFRASTRUCTURE (13 items)

### Database Schema

- [ ] **Schema deployed successfully** (verify: `docs/infra/DEPLOYMENT_EVIDENCE_TRACKING.md`)
  - Criteria: POST_DEPLOYMENT_VERIFICATION.sql shows 15 tables, 26 indexes, 37 policies
  - Evidence: Screenshot or output from verification script
  - Timeline: Founder must complete before Week 2 Day 1

- [ ] **All object counts verified**
  - Tables: 15 (9 application + 6 HERCULES + 1 audit)
  - Indexes: 26
  - RLS Policies: 37
  - Triggers: 1
  - Functions: 1
  - Evidence: Output from POST_DEPLOYMENT_VERIFICATION.sql

- [ ] **Schema idempotency tested** (optional but recommended)
  - Action: Run schema.sql TWICE against test database
  - Result: Second run should succeed with no "already exists" errors
  - Evidence: Test database logs or Founder confirmation

- [ ] **RLS policies enforcing multi-tenant isolation**
  - Verify: Run SECURITY_TESTS.sql
  - Expected: All tests should PASS (multi-tenant isolation verified)
  - Evidence: Security test output shows 15+ PASS results

### Connection & Credentials

- [ ] **Supabase project credentials verified**
  - Supabase URL: Reachable and responding
  - Anon key: Working (GET /api/health succeeds)
  - Service role key: Working (schema deployment succeeded)
  - Evidence: Successful deployment + API health check

- [ ] **Environment variables in production**
  - NEXT_PUBLIC_SUPABASE_URL set (production URL)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY set (production key)
  - SUPABASE_SERVICE_ROLE_KEY set (production key, not exposed)
  - Evidence: Deployment logs show correct env vars loaded
  - ⚠️ **CRITICAL:** No credentials in logs or source code

- [ ] **Email auth enabled in Supabase**
  - Action: Supabase Dashboard → Settings → Auth → Email
  - Verify: Email provider configured and working
  - Test: Send a test email (Founder can request reset email)
  - Evidence: Email received and reset link works

### Backup & Recovery

- [ ] **Database backups enabled**
  - Frequency: Daily automatic backups (Supabase default)
  - Verification: Supabase Dashboard → Backups tab shows recent backup
  - Test: (Optional) Restore a backup to verify integrity

- [ ] **Rollback procedure documented and accessible**
  - Document: `docs/infra/ROLLBACK_RECOVERY.md`
  - Contents: 3+ failure scenarios with recovery steps
  - Team trained: Founder has read and understands procedure
  - Evidence: Founder confirms review of rollback doc

- [ ] **Data export capability verified**
  - Feature: Customers can export data (Settings → Export)
  - Format: CSV (at minimum)
  - Test: Export a small dataset, verify it opens correctly
  - Evidence: Sample export file successfully created

### Monitoring & Alerting

- [ ] **Database monitoring enabled**
  - CPU usage: Visible and alert threshold set
  - Storage usage: Visible and projected to handle 30+ days of customer data
  - Query performance: Baseline established (see ITERATION 4)
  - Evidence: Supabase monitoring dashboard accessible

- [ ] **Automated daily health checks active**
  - Checks: Database connectivity, backup status, query performance
  - Frequency: Daily (automated)
  - Escalation: Alert sent if any check fails
  - Evidence: Monitoring system shows recent run

---

## SECTION 2: APPLICATION & API (14 items)

### Core Features

- [ ] **Sign-up flow working end-to-end**
  - Test case: New user email → verify email → set password → login
  - Expected: User profile auto-created, can access workspace setup
  - Evidence: Test user created and logged in successfully

- [ ] **Workspace creation working**
  - Test case: POST /api/workspace with company details
  - Expected: Workspace created, owner membership added, RLS isolation verified
  - Evidence: Test workspace visible, data isolated per RLS

- [ ] **AI Systems inventory working**
  - Test case: Create AI system in workspace
  - Expected: Record created, visible only to workspace members
  - Evidence: System appears in inventory list

- [ ] **Risk Assessment workflow working**
  - Test case: Create assessment → fill questions → save as draft/in-review
  - Expected: Multi-step form preserves data, status updates correctly
  - Evidence: Assessment created and status changes as expected

- [ ] **Evidence collection working**
  - Test case: Upload document → link to assessment
  - Expected: File uploaded, metadata captured, link established
  - Evidence: Evidence record created and accessible

- [ ] **Data isolation verified**
  - Test case: Create 2 test workspaces, verify User A cannot see User B data
  - Expected: RLS policies block cross-workspace access
  - Evidence: User A sees 0 records from User B workspace

### Performance & Stability

- [ ] **API response times acceptable** (p95 < 500ms)
  - Measurement: Track 10+ requests to each major endpoint
  - Results: 95th percentile response time < 500ms
  - Evidence: Performance baseline report (see ITERATION 4)

- [ ] **Form submissions reliable** (100% success rate)
  - Test: Submit 20+ forms across all major endpoints
  - Expected: 0 failures
  - Evidence: Transaction logs show all submissions succeeded

- [ ] **Session management working**
  - Test: Login → navigate → logout → try to access protected route
  - Expected: Protected routes redirect to login after logout
  - Evidence: Middleware correctly protecting routes

### Error Handling

- [ ] **Error messages clear and actionable**
  - Test: Trigger errors (missing fields, permission denied, server error)
  - Expected: User sees clear message, knows how to proceed or who to contact
  - Evidence: Error messages reviewed and approved by Founder

- [ ] **Graceful degradation on failures**
  - Test: Simulate database connection failure, API timeout
  - Expected: User sees friendly error, not stack trace
  - Evidence: Error handling code reviewed

---

## SECTION 3: SECURITY & COMPLIANCE (12 items)

### Authentication & Authorization

- [ ] **Password requirements enforced**
  - Minimum length: 8+ characters (verify in signup)
  - Special characters: Required or recommended
  - Evidence: Signup form validation tested

- [ ] **Session security**
  - HTTPS only: All traffic encrypted
  - Secure cookies: HttpOnly + Secure flags set
  - Session timeout: Set to reasonable value (e.g., 30 days)
  - Evidence: HTTP headers reviewed (Strict-Transport-Security, Secure cookie)

- [ ] **RLS policies covering all tables**
  - Application tables: 37 policies on 9 tables (verified)
  - HERCULES tables: Service-role-only (no public policies)
  - Coverage: 100% of customer-accessible tables
  - Evidence: Security test results show all policies enforced

### Data Protection

- [ ] **No sensitive data in logs**
  - Check: Review logs for passwords, tokens, PII
  - Expected: No secrets in logs or error messages
  - Evidence: Log review completed

- [ ] **Encryption at rest (Supabase default)**
  - Standard: Database encrypted at rest (Supabase managed)
  - Evidence: Supabase security documentation reviewed

- [ ] **Encryption in transit (HTTPS)**
  - Verify: All API calls over HTTPS only
  - Certificate: Valid and not self-signed
  - Evidence: Browser shows lock icon, certificate chain valid

- [ ] **API keys not exposed**
  - Check: Anon key not in API responses (OK if used client-side)
  - Check: Service role key only used server-side
  - Check: No keys in code, comments, or documentation
  - Evidence: Code review completed

### Compliance

- [ ] **GDPR readiness**
  - User deletion: Users can be deleted (ON DELETE SET NULL on FKs)
  - Data export: Customers can export their data
  - Privacy policy: Reviewed and customer-facing (link in footer)
  - Evidence: Privacy policy dated, GDPR requirements met

- [ ] **EU AI Act compliance framework**
  - Risk classification system: Implemented (Prohibited/High/Limited/Minimal)
  - Audit trail: Complete and tamper-proof (database level)
  - Compliance reporting: Customers can extract evidence
  - Evidence: Compliance framework docs reviewed

- [ ] **Audit logging**
  - Audit table exists: Yes (verified in schema)
  - Logging comprehensive: All sensitive operations logged
  - Tamper-proof: Cannot be modified after creation (database constraints)
  - Evidence: Audit log table schema reviewed

---

## SECTION 4: DEPLOYMENT & CI/CD (8 items)

### Build & Deploy

- [ ] **Production build successful**
  - Command: `npm run build`
  - Result: Succeeds without errors
  - Output: Next.js bundle ready for deployment
  - Evidence: Build logs show "✓ success"

- [ ] **All tests passing**
  - Total: 476/476 tests passing
  - Types: Unit, integration, E2E (if applicable)
  - Coverage: Core features verified
  - Evidence: Test output shows all PASS

- [ ] **Type checking clean** (TypeScript strict mode)
  - Command: `npm run type-check`
  - Result: No errors or warnings
  - Evidence: Type-check output clean

- [ ] **Linting clean**
  - Command: `npm run lint`
  - Result: No errors
  - Evidence: Lint output clean

### Deployment Process

- [ ] **Vercel deployment automated**
  - Trigger: Commits to `main` branch
  - Verification: Preview deployments working (PR #95 shows "Ready")
  - Evidence: Vercel dashboard shows successful deploys

- [ ] **Deployment rollback procedure documented**
  - Document: `docs/infra/ROLLBACK_RECOVERY.md`
  - Scenarios: Include code, database, and both combined
  - Team trained: Founder understands procedure
  - Evidence: Rollback doc reviewed

- [ ] **Environment variables managed securely**
  - Secrets not in code: ✓
  - Production secrets in Vercel secrets: ✓
  - Rotation plan: Documented
  - Evidence: Vercel environment settings reviewed

- [ ] **CI/CD monitoring active**
  - GitHub Actions: Running on all PRs and main
  - Status: All workflows passing
  - Alerts: On failure notification set up
  - Evidence: GitHub Actions workflow status green

---

## SECTION 5: DOCUMENTATION & TRAINING (10 items)

### Customer Materials

- [ ] **Quick-start guide prepared**
  - File: `docs/customer/QUICK_START_GUIDE.md`
  - Content: 5 simple steps, 15 minutes to productive
  - Review: Approved by Founder
  - Evidence: Guide reviewed and dated

- [ ] **Pilot onboarding playbook prepared**
  - File: `docs/customer/PILOT_ONBOARDING_PLAYBOOK.md`
  - Coverage: Week 1 pre-onboarding through Week 5 handoff
  - Detail: Daily activities, success criteria, troubleshooting
  - Review: Founder has read and customized for customer
  - Evidence: Playbook reviewed, customer name/details added

- [ ] **Feature tour prepared**
  - Format: Video (2-5 min) OR written guide (5 pages)
  - Coverage: Dashboard, AI inventory, risk assessment, evidence, remediation
  - Review: Approved by Founder
  - Evidence: Tour video/doc ready to send to customer

- [ ] **FAQ prepared**
  - Questions: Common setup issues, feature questions, troubleshooting
  - Answers: Clear and actionable
  - Review: Founder approved
  - Evidence: FAQ document ready

- [ ] **Support procedures documented**
  - File: `docs/customer/SUPPORT_SLA_AND_ESCALATION.md`
  - Content: SLA tiers, response times, escalation procedures
  - Team trained: Support team has read and understands
  - Evidence: SLA doc signed by customer

### Internal Runbooks

- [ ] **Operational runbook complete**
  - File: `docs/infra/OPERATIONAL_RUNBOOK.md`
  - Coverage: Day-1 deploy, daily checks, weekly reviews, incident response
  - Team trained: Founder + Governor understand procedures
  - Evidence: Runbook reviewed, team briefed

- [ ] **Troubleshooting guide prepared**
  - Coverage: Common customer issues and resolutions
  - Tested: Founder has verified solutions work
  - Evidence: Troubleshooting guide completed

- [ ] **Customer communication templates prepared**
  - Templates: Pre-onboarding email, kickoff, weekly updates, post-pilot
  - Customized: Customer name, dates, contact info added
  - Review: Founder approved
  - Evidence: Templates in email drafts or document

- [ ] **Team training completed**
  - Participants: Founder, Governor, support team (if any)
  - Topics: Product features, support procedures, escalation paths
  - Verification: Founder confirms team is ready
  - Evidence: Training notes or sign-off from Founder

---

## SECTION 6: MONITORING & ALERTING (10 items)

### Monitoring Infrastructure

- [ ] **Health endpoint working**
  - URL: GET /api/health
  - Response: JSON with status, timestamp, components
  - Frequency: Checked every 5 minutes by automated monitor
  - Evidence: Monitor shows recent successful checks

- [ ] **Application metrics collected**
  - Metrics: Response time (p50/p95/p99), error rate, requests/min
  - Storage: Baseline metrics recorded in `docs/infra/PERFORMANCE_BASELINE.md`
  - Historical data: 7+ days of baseline data collected
  - Evidence: Performance baseline document exists

- [ ] **Error tracking enabled**
  - Service: Sentry or similar (if configured)
  - Coverage: Production errors captured and alerted
  - Alerts: Founder notified if error rate spikes
  - Evidence: Error tracking dashboard accessible

- [ ] **Database query performance monitored**
  - Slow queries: Identified and optimized
  - Indexes: Verified to be in use (composite index for RLS lookups confirmed)
  - Query time targets: p95 < 100ms for common queries
  - Evidence: Query analysis completed

### Alerting & Escalation

- [ ] **Critical alerts configured**
  - System down: Alert if health check fails 2x in a row
  - Error rate spike: Alert if >5% of requests error
  - Response time degradation: Alert if p95 > 1000ms
  - Database down: Alert immediately
  - Evidence: Alert rules configured in monitoring system

- [ ] **Alert recipients configured**
  - Founder: Receives all CRITICAL alerts
  - Governor: Receives all HIGH+ alerts
  - Escalation: Defined (who to contact if Founder not available)
  - Evidence: Alert configuration verified

- [ ] **Alert testing completed**
  - Test: Trigger each alert type, verify Founder receives it
  - Response: Founder confirms receipt
  - Evidence: Alert test results documented

- [ ] **On-call schedule established** (if applicable)
  - Coverage: Someone always available for CRITICAL issues
  - Schedule: Posted and Founder confirmed
  - Evidence: On-call schedule visible

---

## SECTION 7: CUSTOMER-SPECIFIC PREPARATION (10 items)

### Workspace Setup

- [ ] **Customer workspace created**
  - Company name: Correct legal name
  - Owner account: Created and email verified
  - Admin account: Created for primary contact
  - Data isolation: Verified (only customer sees their workspace)
  - Evidence: Workspace accessible and isolated

- [ ] **Customer team invited**
  - Invitations: Sent to all team members
  - Status: Acceptance confirmed or pending
  - Role assignments: Owner/Admin/Member assigned correctly
  - Evidence: Team members listed in workspace

- [ ] **Customer data loaded (if any)**
  - Pre-load: Example AI systems or historical data (if applicable)
  - Format: Matches expected schema
  - Verification: Data visible and correct in workspace
  - Evidence: Customer confirms data looks correct

- [ ] **Customer credentials verified**
  - Email: Primary contact email confirmed
  - Password: Temporary password reset and new one set
  - 2FA: Optional but recommended if customer has high-security requirements
  - Evidence: Customer confirms login works

### Pilot-Specific Arrangements

- [ ] **Kickoff meeting scheduled**
  - Date/Time: Confirmed and on calendar
  - Attendees: Founder, customer primary contact, customer team
  - Agenda: Distributed to attendees
  - Materials: Ready (quick-start guide, feature tour, etc.)
  - Evidence: Calendar invite confirmed

- [ ] **Daily check-in calls scheduled**
  - Schedule: Mon-Fri, Week 2-3 (15 min each)
  - Time: Convenient for customer timezone
  - Conferencing: Zoom/Teams link prepared
  - Evidence: Calendar invites sent and accepted

- [ ] **Data back-up plan established**
  - Frequency: Customer data backed up daily (Supabase automatic)
  - Restoration: Tested and procedure documented
  - Customer awareness: Founder explained backup policy to customer
  - Evidence: Backup test completed

- [ ] **Pilot success criteria agreed**
  - Criteria: Listed in PILOT_ONBOARDING_PLAYBOOK.md
  - Customer approval: Founder confirms customer understands expectations
  - GO/NO-GO decision: Process for Week 5 decision documented
  - Evidence: Criteria shared with customer and acknowledged

---

## SECTION 8: FINAL SIGN-OFF & GO/NO-GO (1 item)

### Production Readiness Sign-Off

- [ ] **All 67 checklist items verified**
  - Completed: All items checked and evidence gathered
  - Blockers: None remaining
  - Founder review: Founder has reviewed all sections
  - Founder approval: Founder signs off below

**PRODUCTION GO DETERMINATION:**

```
Founder Name: ________________________________
Founder Email: ________________________________
Review Date: ________________________________
Review Time: ________________________________

Is EURO AI ready for customer pilot deployment?

  ☐ GO - All systems ready, proceed with customer onboarding (Week 2)
  ☐ GO WITH CAVEATS - Ready with known limitations documented
  ☐ NO-GO - Blockers identified, needs remediation

If NO-GO, describe blockers:
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________

Remediation plan:
___________________________________________________________________________
___________________________________________________________________________

Founder Signature (digital OK): ________________________________
Date: ________________________________
```

---

## Appendix: What If I Find a Blocker?

### If you find a blocker during this checklist:

1. **Document it clearly** (what's wrong, what impact)
2. **Assess severity:**
   - CRITICAL: Blocks customer use of core feature (fix before deploy)
   - HIGH: Impacts customer experience significantly (strongly recommend fix)
   - MEDIUM: Workaround exists (can document as known limitation)
   - LOW: Minor issue (can address in v1.1)

3. **Plan remediation:**
   - Who will fix it?
   - How long will it take?
   - When can it be deployed?
   - What testing is needed?

4. **Update this checklist:** Mark item as "BLOCKED" and document the issue/plan

5. **Communicate:** Update FOUNDER_BRIEF.md with blocker status

---

## Historical Record

| Date       | Founder              | Status  | Notes                     |
| ---------- | -------------------- | ------- | ------------------------- |
| 2026-07-12 | [Review in progress] | PENDING | Initial checklist created |
|            |                      |         |                           |

---

**This checklist must be completed and signed by Founder before customer pilot onboarding begins (Week 2).**

**Questions about items on this checklist? Refer to the relevant documentation:**

- Supabase: `docs/infra/DEPLOYMENT_FINAL_CHECKLIST.md`
- Operations: `docs/infra/OPERATIONAL_RUNBOOK.md`
- Customer: `docs/customer/PILOT_ONBOARDING_PLAYBOOK.md`
- Support: `docs/customer/SUPPORT_SLA_AND_ESCALATION.md`

---

_Last updated: 2026-07-12_  
_Version: 1.0_
