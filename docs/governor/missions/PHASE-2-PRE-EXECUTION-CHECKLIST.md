# Phase 2 Pre-Execution Checklist (Steps 2–14)

**Authority:** Governor Learning Layer (L-2.1, L-2.2)  
**Effective Date:** 2026-07-22  
**Purpose:** Eliminate surprise blockers before customer-journey execution; verify external dependencies before mission start

---

## Pre-Execution Requirements (Do NOT proceed without all ✅)

### 1. Email Delivery Capability Audit (L-2.2 Mandatory)

**Objective:** Verify email delivery to VERIFIED state (not UNKNOWN)

- [ ] **Email provider configured** — Supabase project `cwbcvjiklrrkpmybefdp`: "Confirm email" setting decided
  - [ ] **Option A chosen:** "Confirm email" DISABLED (verification optional) — 5 min Founder action
  - [ ] **Option B chosen:** Custom SMTP configured (Resend/SendGrid) — 15–30 min Founder action + verification
  - [ ] Decision timestamp recorded in PROJECT_STATE.md
  - [ ] Founder authority signature documented

- [ ] **Email delivery tested** — Confirmation email successfully received
  - [ ] Test email sent to customer address (not team-only)
  - [ ] Delivery timestamp recorded
  - [ ] Email content verified (confirmation link present, readable, actionable)
  - [ ] Screenshot or session record captured

- [ ] **Project state updated** — EMAIL_CAPABILITY_STATUS section added to PROJECT_STATE.md

  ```markdown
  ## Email Capability Status

  - Provider: [Supabase built-in | Resend | SendGrid | ...]
  - Configuration: [Mandatory verification | Optional verification]
  - Test Result: VERIFIED [timestamp]
  - Decision Timestamp: [date/time]
  - Decision Authority: [Founder | Governor]
  - Evidence: [Test email received, screenshot reference]
  ```

- [ ] **Risk escalation cleared** — RISK-009 marked RESOLVED with decision evidence

**If email capability is UNKNOWN or BLOCKED:**

- Do NOT proceed to Step 2
- Escalate as RISK-00X (customer-critical, blocker)
- Record decision required
- Resume only when VERIFIED

---

### 2. External Dependencies Verified

**Objective:** Confirm third-party integrations operational before customer journey

- [ ] **Supabase database connectivity** — `/api/health` endpoint returns 200 OK
  - [ ] Database responds to queries (RLS enforcement verified)
  - [ ] Session handling functional (cookie-based SSR auth)
  - [ ] Real customer tenant isolation tested (not just team workspace)

- [ ] **Authentication system** — Supabase SSR auth operational
  - [ ] Registration flow completes without errors
  - [ ] Email confirmation links are generated correctly
  - [ ] Session persistence verified across page reloads

- [ ] **Vercel deployment** — Production deployment stable
  - [ ] Preview branch builds and deploys
  - [ ] No pending CI/CD failures
  - [ ] Monitoring health checks passing

- [ ] **Slack notifications** (if configured for alerts) — Integration confirmed
  - [ ] Alert channel accessible
  - [ ] Test notification delivery working

---

### 3. Evidence Collection System Ready (L-2.1 Mandatory)

**Objective:** Prepare to record Technical Verdict and Customer-Success Verdict independently

- [ ] **Journey map template prepared** — Step, timestamp, actor, action, result, technical verdict, customer-success verdict
  - [ ] 14 row template created
  - [ ] Column definitions clear (what each verdict measures)
  - [ ] Evidence capture method defined (screenshots, logs, notes)

- [ ] **Technical verdict criteria defined** — System correctness checklist
  - [ ] Database state transitions correct?
  - [ ] API responses valid (status codes, data structure)?
  - [ ] RLS policies enforced (tenant isolation verified)?
  - [ ] No crashes, timeouts, or 5xx errors?
  - [ ] Session state consistent?
  - **Verdict categories:** PASS / FAIL / PARTIAL

- [ ] **Customer-success verdict criteria defined** — User perception checklist
  - [ ] User understood what happened (clear feedback)?
  - [ ] UI guidance was present and readable?
  - [ ] System behaved as expected (no surprises)?
  - [ ] User felt confident to continue (no abandonment risk)?
  - [ ] Would user recommend this flow to colleague?
  - **Verdict categories:** PASS / FAIL / PARTIAL

- [ ] **Conflict resolution protocol documented**
  - [ ] If Technical-PASS + Customer-Success-FAIL → classify as defect (WARNING or higher)
  - [ ] Root cause investigation template (UI feedback? State sync? Clarity?)
  - [ ] Responsibility layer assignment (UI, API, notification, session)

---

### 4. Defect Classification Framework Ready

**Objective:** Standardize how defects are recorded and prioritized

- [ ] **Defect severity levels defined**
  - [ ] **BLOCKER:** Customer cannot proceed; blocks roadmap
  - [ ] **WARNING:** Unexpected but workaround exists; customer may abandon
  - [ ] **ENHANCEMENT:** Nice-to-have; non-critical

- [ ] **Defect register template created** — File location: `docs/governor/missions/PHASE-2-<timestamp>/DEFECTS.md`
  - [ ] Columns: Step, Defect ID, Title, Technical Verdict, Customer-Success Verdict, Severity, Root Cause, Remediation Path, Status

- [ ] **Known defects from Phase 2 Step 1 documented**
  - [ ] **D-2.1:** Confirmation link error page (Technical-PASS, Customer-Success-FAIL)
    - [ ] Awaiting remediation before Phase 2 Step 2 progression
    - [ ] UI state synchronization fix identified
    - [ ] Owner assigned (if applicable)

---

### 5. Learning Validation Preparation (Phase 2 Step 2+ Confirmation)

**Objective:** Prepare to validate L-2.1 and L-2.2 against Phase 2 Step 2+ evidence

- [ ] **L-2.1 Validation Criteria** — Dual Verdict Independence holds?
  - [ ] Technical Verdict and Customer-Success Verdict recorded independently (no cross-contamination)
  - [ ] At least one step shows Technical-PASS + Customer-Success-FAIL (if not, rule still valid but not fully tested)
  - [ ] Each verdict supported by evidence (logs, screenshots, user feedback)
  - [ ] Conflict resolution protocol followed (if defect detected)

- [ ] **L-2.2 Validation Criteria** — Pre-Mission Audit prevented surprises?
  - [ ] Email delivery confirmed BEFORE Step 2 execution (not discovered mid-step)
  - [ ] Decision recorded (Option A or B) with evidence
  - [ ] Test email delivery successful
  - [ ] Configuration state matches decision

- [ ] **Generalization Gate confirmation** — Both rules maintain ≥9/10 applicability
  - [ ] Rules applicable to Phase 2 Steps 2–14 (yes)
  - [ ] Rules applicable to future customer-journey missions (yes)
  - [ ] Rules reusable for VAJRA observation loops (yes, L-2.1; yes with caveats, L-2.2)

---

### 6. Founder Confirmation Checkpoint

**Objective:** Confirm Founder awareness before customer execution

- [ ] **Founder reviewed pre-execution summary**
  - [ ] All ✅ boxes above completed
  - [ ] Any risks or unknowns surfaced and documented
  - [ ] Founder approval to proceed: **GO** or **HOLD**

- [ ] **Customer readiness confirmed**
  - [ ] Anne Catherine (first customer) ready to attempt Step 2
  - [ ] Expected timeline: 30–90 min total for Steps 2–14
  - [ ] Customer has been briefed on journey structure (if applicable)

- [ ] **Founder escalation path confirmed**
  - [ ] If blocker discovered during Phase 2: escalation channel clear
  - [ ] If defect requires Founder decision: escalation template prepared
  - [ ] Governor authority boundaries clear (observation-only, no mutations)

---

## Autonomous Execution Readiness

**When all 6 sections above are ✅ complete:**

Governor will proceed with Phase 2 Steps 2–14 as autonomous observation-only mission:

1. **Evidence Tracking:** Technical Verdict + Customer-Success Verdict recorded independently for each step
2. **Defect Capture:** Any blocker, warning, or enhancement logged immediately
3. **Real-Time Escalation:** Blocker defects escalated to Founder within 5 min of discovery
4. **Learning Validation:** L-2.1 and L-2.2 rules validated against live evidence
5. **Post-Mission Delivery:** Journey map, defect register, verdicts, learning assessment delivered upon completion

---

## Timeline

- **Pre-Execution Verification:** 15–30 min (email test, dependency checks, checklist completion)
- **Phase 2 Steps 2–14 Execution:** 30–90 min (customer-paced progression)
- **Evidence Analysis:** 30–60 min (verdict generation, learning validation)
- **Total Mission Duration:** 75–180 min (1.5–3 hours)

---

## Success Criteria

✅ Phase 2 completes only when:

- All 14 customer-journey steps complete
- Technical Verdict: PASS for each step (or PARTIAL with root cause documented)
- Customer-Success Verdict: PASS for each step (or WARNING/ENHANCEMENT with remediation path)
- Known defects remediated or accepted by Founder
- L-2.1 validation: Dual verdict independence confirmed
- L-2.2 validation: Email audit prevented blockers
- Evidence archive created and linked in PROJECT_STATE.md
- Customer-readiness verdict: GO or HOLD with reasoning

---

**Prepared By:** Governor Ω (Learning Layer)  
**Authority:** L-2.1, L-2.2 Promoted Rules  
**Status:** READY FOR RISK-009 RESOLUTION + STEP 2 EXECUTION  
**Next Trigger:** RISK-009 resolved + customer submission of Step 2
