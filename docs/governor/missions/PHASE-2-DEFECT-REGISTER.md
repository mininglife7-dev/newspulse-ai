# Phase 2 Defect Register

**Mission:** EURO AI Customer-Journey Shadow Execution  
**Last Updated:** 2026-07-22  
**Evidence Standard:** Verified / Estimated / Unknown / Blocked

---

## Defects by Classification

### BLOCKER (Customer cannot proceed)

#### D-2.2 — Email Verification Undeliverable in Production

**Title:** Real customers cannot receive confirmation emails (RISK-009)  
**Status:** OPEN  
**Discovered:** Phase 2 Step 1 (registration run `29599513287`)  
**Impact:** ALL Steps 2–14 blocked until resolved

**Technical Details:**

- **Root Cause:** Supabase project setting "Confirm email" = ON; default SMTP delivery restricted to project-team members
- **Observed Behavior:** Registration succeeds (HTTP 200, user+profile created), email to `test@example.com` never arrives (test account)
- **Verification:** Run `29599513287` shows registration complete but confirmation not received in email provider logs
- **Reproducibility:** Certain — affects all non-team emails in current Supabase configuration
- **Evidence Status:** Verified (run `29599513287`, Supabase project settings)

**Fix Options:**

1. **Fastest:** Disable "Confirm email" in Supabase project settings (email becomes optional)
2. **Recommended for production:** Configure custom SMTP (Resend, SendGrid, etc.) with valid credentials

**Owner:** Founder (Lalit)  
**Escalation:** Required — blocks customer journey; prevents Phase 2 Steps 2–14 execution  
**Timeline:** Must resolve before Phase 2 Step 2 can execute

---

### WARNING (Unexpected behavior, workaround exists)

#### D-2.1 — Confirmation Link Error UI Despite Successful Auth

**Title:** Customer sees error message on confirmation link click, but is actually authenticated  
**Status:** OPEN  
**Discovered:** Phase 2 Step 1 (registration run `29599513287`)  
**Impact:** UX confusion; customer may abandon workflow thinking registration failed

**Technical Details:**

- **Root Cause:** Likely mismatch between email confirmation state and Supabase auth session state; confirmation link handler shows error page while auth succeeds
- **Observed Behavior:** Customer clicks confirmation link → error page displayed → customer still authenticated in app
- **Evidence:** Run `29599513287` session record shows auth succeeded despite error UI
- **Reproducibility:** Confirmed in test account; likely reproduces for all confirmation link clicks
- **Evidence Status:** Verified (run `29599513287`, session record)

**Workaround:** Customer dismisses error and uses app (auth succeeded despite UI error); independent of email delivery fix

**Root Cause Hypothesis:**

- Email confirmation and Supabase auth use different session mechanisms
- Confirmation link validates email but doesn't sync with Supabase session state
- Page refresh likely resolves the perceived error

**Owner:** Engineering  
**Fix Priority:** After D-2.2 (email delivery) resolved  
**Estimated Effort:** Low (likely UI state synchronization issue)  
**Verification:** Once D-2.2 resolved, re-run Phase 2 Step 1 to confirm fix

---

## Defect Lifecycle

| Defect | Step | Discovered | Status | Owner           | Next Action                                      |
| ------ | ---- | ---------- | ------ | --------------- | ------------------------------------------------ |
| D-2.1  | 1    | 2026-07-22 | OPEN   | Engineering     | Re-verify after D-2.2 resolved + Step 1 re-run   |
| D-2.2  | 1    | 2026-07-22 | OPEN   | Founder (Lalit) | Disable "Confirm email" OR configure custom SMTP |

---

## Escalation Summary

**CRITICAL:** D-2.2 blocks all Phase 2 Steps 2–14. Requires Founder decision and action on RISK-009.

**Recommended Founder Action:**

1. Go to Supabase project settings (`cwbcvjiklrrkpmybefdp`)
2. Disable "Confirm email" in authentication settings (fastest) OR
3. Configure custom SMTP provider (Resend, SendGrid) with production credentials
4. Notify Governor when resolved; Phase 2 Step 2 can then execute

**Timeline:** Phase 2 progress stalled until D-2.2 resolved.
