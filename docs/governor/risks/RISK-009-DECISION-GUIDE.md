# RISK-009 Decision Guide — Email Verification Undeliverable

**What's Blocking:** Customer Phase 2 progression (email verification)  
**Severity:** CRITICAL  
**Timeline:** Resolution enables Phase 2 Steps 2–14 within 30–90 minutes of customer attempt  
**Decision Complexity:** Medium (2 paths, clear trade-offs)

---

## The Problem

Customer registration (Phase 2 Step 1) completed successfully. Email was delivered.  
But: **"Confirm email" is ON in Supabase project settings.**

With this setting enabled + no custom SMTP configured, Supabase only sends verification emails to the **project team**, not to real customers.

**Evidence:**

- Journey run `29599513287` (2026-07-22): Customer registration succeeded; confirmation email arrived for Founder (team member) but customer cannot receive email verification.
- Supabase project: `cwbcvjiklrrkpmybefdp` (EU Frankfurt)
- Setting location: Supabase dashboard → Project Settings → Auth → Email → "Confirm email" (toggle)

---

## Decision: Option A or Option B

### **Option A: Disable "Confirm email" (5 minutes, lowest friction)**

**Path:** Supabase dashboard → Project Settings (`cwbcvjiklrrkpmybefdp`) → Auth → Email section → Toggle "Confirm email" OFF

**What happens:**

- Email still exists as a user field
- Verification step is skipped
- User creates account → immediate workspace access (no email verification required)
- Email address recorded for future communication (password resets, notifications, etc.)

**Trade-off:**

- ✅ Fastest activation
- ❌ Email verification step missing from Phase 2 journey
- ❌ Does not prove the "email delivery + verification" workflow

**When to pick:** If goal is fastest Phase 2 validation and email verification is not critical to the customer journey shape.

---

### **Option B: Configure Custom SMTP (15–30 minutes, full email verification)**

**Path:** Supabase dashboard → Project Settings (`cwbcvjiklrrkpmybefdp`) → Auth → Email section → Custom SMTP

**Providers (pick one):**

- **Resend** (Founder-recommended for EURO AI): Fastest setup; free tier 100/day
  - Sign up at https://resend.com → Create API key → Copy into Supabase
  - Supabase config: SMTP server `smtp.resend.co`, port 465 (TLS), Auth Username (Resend), Password (API key)

- **SendGrid:** Industry standard; free tier 100/day
  - Sign up at https://sendgrid.com → Generate API key → Create SMTP credentials
  - Supabase config: SMTP server `smtp.sendgrid.net`, port 587 (TLS), Username `apikey`, Password (API key)

- **AWS SES / Mailgun / etc:** Alternative providers (more complex setup)

**What happens:**

- Email verification emails sent by your SMTP provider, not Supabase
- Real customers receive verification emails successfully
- Full end-to-end Phase 2 journey proven (registration → email → verification → workspace)

**Trade-off:**

- ✅ Complete email verification workflow tested with real customer
- ✅ Production-ready email infrastructure (critical before real customers)
- ❌ 15–30 min setup time (account creation, API key, Supabase config)

**When to pick:** If goal is proving production-ready email delivery and validating the complete customer onboarding workflow.

---

## Recommended Path: Option B

**Why:** EURO AI is positioning for first paying customer. Email delivery is non-negotiable in production. Proving the workflow now (with one test customer) is safer than discovering email breaks after customer payment.

**Timeline with Option B:**

1. Choose SMTP provider (2 min)
2. Create account + API key (3–5 min)
3. Configure in Supabase (2 min)
4. Test: customer submits Step 2 → verification email arrives → customer verifies → Phase 2 continues (10–15 min)
5. Phase 2 Steps 3–14 execute (30–60 min, customer-paced)

**Total time: 30–90 minutes**

---

## What Governor Does Automatically

Upon RISK-009 resolution (either option) + customer Step 2 attempt:

1. **Phase 2 resumes immediately**
2. **Steps 2–14 execute** with dual verdicts (Technical + Customer-Success)
3. **Evidence collected:** timestamps, actions, system responses
4. **Defects recorded:** if any workflow step fails, classified as Blocker/Warning/Enhancement
5. **Learning candidates assessed:** patterns promoted to Governor Core if they meet Generalization Gate (10 criteria)
6. **Customer-readiness verdict:** upon Step 14 completion, technical audit + customer-success certification produced
7. **Recommendation:** production readiness assessment for first paying customer

---

## Next Step for Founder

**Choose: Option A or Option B?**

Reply with your choice; Governor will:

1. Record the decision (DECISION_REGISTER.md)
2. Prepare customer for Step 2 attempt once resolved
3. Execute Phase 2 autonomously from Step 2 onward

---

**Decision Guide created:** 2026-07-22 (Governor Outcome Acceleration)  
**Reference:** RISK-009 in RISK-REGISTER.md; Phase 2 in NEXT_ACTION.md; Journey in docs/governor/missions/PHASE-2-SHADOW-EXECUTION.md
