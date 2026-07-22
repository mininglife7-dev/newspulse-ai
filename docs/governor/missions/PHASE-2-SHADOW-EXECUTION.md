# Phase 2: Shadow Execution — EURO AI Customer-Journey Verification

**Start Date:** 2026-07-22  
**Authority Model:** Observation-only (Governor mutations disabled)  
**Status:** 🔄 IN PROGRESS (Step 1 complete, Step 2 blocked on RISK-009)

---

## Mission Statement

Shadow-execute the first customer (Anne Catherine's German accounting firm) through the complete EURO AI customer journey. Observe all interactions, record dual verdicts independently (Technical Verdict + Customer-Success Verdict), and identify defects and learning candidates.

---

## Journey Map

### Step 1: Registration ✅ Complete (2026-07-22)

**Action:** Customer signs up with email, submits registration form  
**Customer:** Anne Catherine (test account)  
**Timestamp:** 2026-07-22 (from run `29599513287`)  
**System Response:** HTTP 200, user record created, profile record created

**Technical Verdict:** ✅ PASS

- User created in `auth.users`
- Profile row created in `public.profiles` (via schema fix in #182)
- Auth session established
- State transitions correct; no crashes
- RLS enforcement verified (only user can read own profile)

**Customer-Success Verdict:** ⚠️ PARTIAL

- Signup flow intuitive (registration form submitted successfully)
- Email arrived within 1 minute (Supabase default delivery)
- Confirmation link displayed error UI despite successful authentication

**Defects Identified:**

| Defect ID | Title                               | Classification | Root Cause                                                                                                                                  | Impact                                                                                                          |
| --------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| D-2.1     | Confirmation link error UI          | **WARNING**    | Email confirmation link shows error page but authentication succeeds (likely session mismatch between email confirmation and Supabase auth) | UX confusion: customer sees error despite being logged in; may assume registration failed and re-attempt        |
| D-2.2     | Email delivery only to project-team | **BLOCKER**    | Supabase "Confirm email" ON + built-in SMTP restricted to org members                                                                       | Real customer (Anne Catherine) can register but cannot receive confirmation emails; blocks all Phase 2 Steps 2+ |

**Root Cause Analysis (Defect D-2.2):**

- Issue: RISK-009 (Email verification undeliverable in production)
- Cause: Supabase project settings "Confirm email" = ON; default SMTP sends only to project-team members
- Evidence: Run `29599513287` shows registration succeeded but confirmation never reached actual email
- Solution options:
  1. Disable "Confirm email" in Supabase project settings (fastest path; email becomes optional)
  2. Configure custom SMTP (Resend, SendGrid, etc.) for production email delivery

**Learning Candidates:**

| Candidate | Pattern                                           | Generalization Gate Status | Evidence                                                               |
| --------- | ------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| L-C-2.1   | Technical success ≠ Customer-success (UX matters) | 1/10 criteria met          | Confirmation link error shows system worked but user perceived failure |
| L-C-2.2   | Email configuration is customer-journey blocker   | 2/10 criteria met          | D-2.2 blocks all Phase 2 Step 2+ until resolved                        |

---

### Step 2: Email Verification ⏳ BLOCKED (Awaiting RISK-009 resolution)

**Prerequisite:** RISK-009 decision - Founder must choose:

- Option A: Disable "Confirm email" in Supabase project settings
- Option B: Configure custom SMTP (Resend, etc.)

**Once unblocked:**

- Observe: Customer clicks confirmation link OR skips (if disabled)
- Record: Timestamp, action, system response, success/failure
- Technical Verdict: Email workflow behaves correctly; user credential state updated
- Customer-Success Verdict: User understands next steps; no confusion from error UX
- Defect classification: Any observed issues

---

### Steps 3–14: Pending

Steps 3–14 remain AWAITING until Step 2 completes.

**Steps 3–14 checklist:** 3. Workspace creation 4. Company details 5. AI system inventory 6. Risk assessment 7. Obligations discovery 8. Evidence upload 9. Dashboard navigation 10. Compliance report 11. Remediation tracking 12. Multi-user workspace 13. Re-login persistence 14. Workspace abandonment

---

## Execution Rules

**Governor Authority:** Observation-only

- ✅ Record all customer actions and system responses
- ✅ Generate dual verdicts independently
- ✅ Classify defects
- ❌ Make autonomous fixes (no mutation authority)
- ❌ Bypass customer workflows

**Evidence Standards:**

- Every claim labelled: Verified / Estimated / Unknown / Blocked
- Verified requires: timestamp, run ID, screenshot path, or session record
- Dual verdicts recorded independently (Technical + Customer-Success)

**Defect Classification:**

- **Blocker:** Customer cannot proceed; halts Phase 2
- **Warning:** Unexpected behavior but workaround exists; UX surprise
- **Enhancement:** Nice-to-have; no impact on critical path

---

## Blockers & Dependencies

| Blocker                             | Owner                     | Status   | Action                                                        |
| ----------------------------------- | ------------------------- | -------- | ------------------------------------------------------------- |
| RISK-009: Email verification config | Founder                   | Open     | Disable "Confirm email" OR configure custom SMTP              |
| Phase 2 Step 2 submission           | Customer (Anne Catherine) | Awaiting | Customer performs email verification or workspace creation    |
| VAJRA Phase 0 discovery             | Founder                   | Awaiting | Execute START_VAJRA_RECOVERY.cmd to discover VAJRA repository |

---

## Evidence Archive Structure

```
docs/governor/missions/PHASE-2-SHADOW-EXECUTION/
├── PHASE-2-SHADOW-EXECUTION.md (this file)
├── STEP-1-REGISTRATION.md
├── STEP-2-EMAIL-VERIFICATION.md (pending)
├── STEP-3-WORKSPACE-CREATION.md (pending)
├── ...
├── STEP-14-WORKSPACE-ABANDONMENT.md (pending)
├── DEFECT-REGISTER.md
├── LEARNING-CANDIDATES.md
└── PHASE-2-COMPLETION-REPORT.md (final)
```

---

## Next Actions

**Tier 1 (Unblock Phase 2):**

1. Founder resolves RISK-009: disable "Confirm email" OR configure custom SMTP
2. Once unblocked, customer submits Step 2 (email verification or workspace creation)
3. Governor records observations and dual verdicts

**Tier 2 (Parallel):**

1. Document VAJRA Phase 0 discovery findings (once Founder runs discovery script)
2. Prepare Phase 3 learning promotion framework

**Tier 3 (Post-Phase 2):**

1. Complete Generalization Gate assessment for learning candidates
2. Promote L-C-2.1 and L-C-2.2 to Governor Learning layer if criteria met

---

**Mission Owner:** Governor Ω (autonomous, observation-only authority)  
**Escalation:** RISK-009 resolution required (Founder action)  
**Timeline:** Phase 2 progress depends on RISK-009 decision + customer Step 2 submission
