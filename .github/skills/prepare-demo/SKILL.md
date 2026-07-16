# Skill: prepare-demo

**Purpose:** Make the platform demonstrably ready for a specific customer
demo session.
**Inputs:** demo date; audience (first customer: German accounting firm);
whether real or sample data is to be shown.
**Steps:**

1. Run **verify-production** — no demo on unverified infrastructure.
2. Run **customer-journey** — every step the demo will show must be
   VERIFIED in DEMO_READINESS.md within the last 48h.
3. Prepare a demo workspace: realistic (fictional) company, 2–3 AI systems,
   one completed assessment with obligations and a report. Never real
   customer data.
4. Dry-run the exact demo path end-to-end once, timed.
5. Check the fallback: know the last-good deploy and the rollback step.
   **Expected output:** demo checklist appended to DEMO_READINESS.md with
   evidence links; a one-page demo script (docs/customer/).
   **Verification:** dry-run completed same-day, no errors encountered.
   **Failure handling:** any red step → demo is NOT ready; report exact gap to
   the Founder with the shortest fix path — never demo over a known break.
