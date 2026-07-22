# Promoted Governor Rules — Phase 2 Learning Candidates

**Promotion Date:** 2026-07-22  
**Authority:** Governor Ω (Learning Promotion)  
**Precedence:** Governor Learning Layer (applies to all future phases + governed projects)

---

## Rule L-2.1: Dual Verdict Independence

**Source:** Phase 2 Step 1 observation (defect D-2.1, run 29599513287)  
**Generalization Gate:** 9/10 criteria met ✅

### The Rule

In observation-only missions, record Technical Verdict (system correctness) and Customer-Success Verdict (user perception) **independently**. Do not assume Technical-PASS implies Customer-Success-PASS.

### When It Applies

- Multi-tenant platforms with user-facing flows
- Systems with email/notification feedback
- Any customer-journey observation mission
- Adaptive Tool Acquisition (third-party API monitoring)
- EURO AI Phase 2+ (mandatory)
- VAJRA observation loops (recommended)

### Verification Protocol

1. **Technical Verdict:** Evaluate system state correctness
   - Database state correct?
   - API responses valid?
   - RLS policies enforced?
   - No crashes or timeouts?
   - **Result:** PASS or FAIL

2. **Customer-Success Verdict:** Evaluate user perception and clarity
   - Did user understand what happened?
   - Was UI feedback clear?
   - Did system behave as expected?
   - Would user feel confident to continue?
   - **Result:** PASS or FAIL

3. **Conflict Resolution:** If Technical-PASS + Customer-Success-FAIL:
   - Log as defect (WARNING or higher)
   - Investigate root cause:
     - Is it a UI feedback issue?
     - Is it a session/state synchronization issue?
     - Is it missing guidance or clarity?
   - Classify responsibility layer (UI, API, notification, session)

### Evidence Standard

- Screenshot or session record showing perception discrepancy
- Timestamp and exact reproduction steps
- Root-cause hypothesis
- Impact assessment (blocker, warning, enhancement)

### Example (From Phase 2 Step 1)

**What Happened:**

- Technical: Customer successfully registered (auth.users record created, session established) ✅
- UX: Confirmation email page displayed error message ❌
- Perception: User saw error → assumes registration failed

**Why It Matters:**

- System state was correct (customer is authenticated)
- But customer sees error → likely to abandon platform
- Result: high-confidence customer churn despite technical success

**Fix Applied:**

- Issue recorded as D-2.1 (UX feedback desynchronization)
- Email confirmation link error needs UI state sync fix
- Technical + Customer success both required for Phase 2 progression

### Impact on Future Work

All customer-journey missions now track two independent verdicts. Prevents the "green technical + red customer" surprise that derails customer confidence.

---

## Rule L-2.2: Pre-Mission Capability Audit — Email Delivery

**Source:** Phase 2 Step 1 blocker (RISK-009, run 29599513287)  
**Generalization Gate:** 10/10 criteria met ✅

### The Rule

Before beginning customer-journey observation missions, verify email delivery capability to **VERIFIED** state (not UNKNOWN). Email verification configuration must be explicitly decided: mandatory or optional. Test email delivery against real customer addresses (not team-only).

### When It Applies

- **Mandatory:** All customer-journey missions (Phase 2+)
- **Mandatory:** Any multi-tenant SaaS with user registration flows
- **Recommended:** Adaptive Tool Acquisition (third-party email service verification)
- **Recommended:** All phases beginning observation-only missions

### Pre-Journey Verification Checklist

**Email Delivery Capability Audit:**

- [ ] Email provider configured (Supabase built-in vs. Resend vs. SendGrid vs. other)
- [ ] Test email sent to real customer address (not team-only)
- [ ] Confirmation email received and verified
- [ ] Platform capability state documented: VERIFIED (not UNKNOWN)
- [ ] Configuration decision recorded: verification mandatory or optional

**Project State Update (before Phase execution):**

```markdown
## Email Capability Status

- Provider: [Supabase built-in | Resend | SendGrid | ...]
- Configuration: [Mandatory verification | Optional verification]
- Test Result: [VERIFIED date/time | UNKNOWN | BLOCKED reason]
- Decision Timestamp: [date]
- Decision Authority: [Founder | Governor]
```

### Failure Protocol

If email capability is UNKNOWN or BLOCKED when mission should execute:

1. **Do not proceed** to customer-journey Step 1
2. **Escalate** as RISK-00X (customer-critical)
3. **Record decision required** (Founder must choose configuration)
4. **Resume only when VERIFIED** (with evidence timestamp)

### Evidence Standard

- Email delivery test timestamp (when test email was sent)
- Confirmation email received timestamp (when customer received it)
- Screenshot or session record of successful verification
- Configuration decision documented in PROJECT_STATE.md
- Authority signature (Founder or Governor)

### Example (From Phase 2 Step 1 → RISK-009)

**What Happened:**

- Email provider: Supabase built-in
- Configuration: "Confirm email" ON (mandatory verification)
- Test result: UNKNOWN (not tested before phase start)
- Discovered during Step 1: Real customer email never arrived
- Root cause: Supabase restricts built-in SMTP to team members only

**Why It Blocked:**

- Customer cannot complete registration without email confirmation
- Email feature acts as an invisible dependency
- Discovered at customer-journey execution time (too late)
- Founder must decide: disable verification or configure custom SMTP

**Fix Applied:**

- Created RISK-009 Decision Guide
- Decision required before Phase 2 Step 2 can proceed
- Future phases will verify email BEFORE customer execution

### Impact on Future Work

**Governor Standard:** Email infrastructure is now treated as a critical prerequisite, not a post-launch polish item. All future customer-journey missions include email capability audit in their pre-execution checklist.

**Autonomous Scheduler Impact:** Missions will identify email-dependency blockers BEFORE entering WAITING state, reducing surprise blockers during customer execution.

---

## Integration Into Governor Systems

### AGENTS.md Update (Execution Loop)

Add to Step 1 (before any mission execution):

> **Capability Health Check:**
>
> - [ ] Email delivery capability VERIFIED (if customer-journey mission)
> - [ ] Third-party integrations tested (if Adaptive Tool Acquisition)
> - [ ] External dependencies confirmed non-UNKNOWN
> - [ ] Risk register updated with any critical gaps

### GOVERNOR_OPERATIONAL_CHARTER.md Update

Add to Learning Policy:

> **Phase 2 Learning Promotions:**
>
> - L-2.1: Dual Verdict Independence (Technical ≠ Customer-Success) — mandatory for all observation missions
> - L-2.2: Pre-Mission Capability Audit (Email Delivery) — mandatory for customer-journey missions

### Pre-Mission Execution Checklist (New)

**Template for all future missions:**

```markdown
## Pre-Execution Verification

- [ ] Dependencies identified (email, integrations, auth, etc.)
- [ ] External services tested (not just VERIFIED in code)
- [ ] Failure modes understood (what happens if dependency breaks)
- [ ] Founder decision recorded (if configuration choice required)
- [ ] Evidence collection system ready (logging, verdicts, defects)
```

### Future Phase Adoption

**When to apply L-2.2:**

- Phase 2 Steps 2–14 (immediately after RISK-009 resolution)
- VAJRA Phase 0 (discovery-phase email audit)
- Phase 3+ (all customer-journey extensions)
- Any new governed project with user registration

**When to apply L-2.1:**

- Phase 2 Steps 2–14 (all verdicts recorded independently)
- VAJRA Phase 1+ (if observation-mode interactions with customers)
- All future observation-only missions

---

## Learning Impact Assessment

### Governor Core Improvement

These two rules address:

1. **UX/Customer Clarity:** Prevents missed customer-success failures (Technical-PASS ≠ Customer-Success-PASS)
2. **Dependency Management:** Prevents surprise blockers during mission execution

### Reduction in Failure Modes

- ✅ Eliminates "green technical + red customer" surprises
- ✅ Moves email configuration verification to pre-phase (not mid-phase)
- ✅ Establishes independent verdict discipline for all missions

### Estimated Impact

- **Phase 2 Steps 2–14:** Faster progression (email pre-verified, verdicts independent)
- **VAJRA Phase 0+:** Email/capability audit prevents early blockers
- **Future projects:** Reusable playbook for customer-journey execution

---

## Promotion Authority

**Promoted By:** Governor Ω (Learning Layer)  
**Evidence Basis:** PHASE-2-LEARNING-CANDIDATES.md (generalization gate assessment)  
**Effective:** All phases Phase 2+ (mandatory for EURO AI; recommended for VAJRA)  
**Archive Location:** docs/governor/learning/LESSONS.md

**Next Review:** After Phase 2 completion (validate against Steps 2–14 additional evidence)

---

**Promotion Status:** COMPLETE  
**Integration Timeline:** Immediate (added to pre-mission checklist)  
**Reusability:** Governed Projects (EURO AI mandatory, VAJRA recommended, future projects)
