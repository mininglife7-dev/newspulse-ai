# Skill: customer-journey

**Purpose:** Exercise the full first-customer journey against the live
environment and update DEMO_READINESS.md.
**Inputs:** production (or named staging) URL; a disposable test email.
**Steps (in customer order):**

1. Register → verify email → sign in.
2. Create workspace (company details, DE country).
3. Add an AI system to the inventory.
4. Complete a risk assessment; confirm classification renders.
5. View generated obligations; change one status.
6. Attach evidence to an obligation.
7. View compliance dashboard; generate a compliance report.
8. Create/track a remediation item.
9. Sign out/in — data persists; second test account cannot see the first
   account's data (tenant isolation at the UX level).
   **Expected output:** every DEMO_READINESS.md row moved to VERIFIED (with
   date, environment, evidence artifact) or BLOCKED (with exact failure).
   **Verification:** evidence per row — screenshot path, API response, or
   recorded session; no row left implicit.
   **Failure handling:** a broken step becomes BLOCKED with reproduction
   steps; file the fix as the next mission candidate; never mark VERIFIED on
   partial success.
