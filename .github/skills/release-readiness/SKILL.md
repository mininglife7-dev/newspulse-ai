# Skill: release-readiness

**Purpose:** Produce an evidence-backed GO / CONDITIONAL GO / NO-GO
readiness verdict. This is the ONLY sanctioned way to issue one.
**Inputs:** the release/launch in question.
**Steps:**

1. Run **run-tests** (full gate) and record counts.
2. Run **verify-production** and **supabase-validation** (verify mode).
3. DEMO_READINESS.md: count VERIFIED / BLOCKED / UNKNOWN rows.
4. Risk register: list every Open risk ≥ High with owner.
5. Founder-pending items from PROJECT_STATE.md.
6. Verdict rule: GO requires all journey rows VERIFIED, no Open High risk
   without a Founder-accepted mitigation, CI green, DB verification green.
   Anything else is CONDITIONAL GO (name the conditions) or NO-GO.
   **Expected output:** dated report in `docs/governor/reports/` with a
   verdict; PROJECT_STATE.md updated; decision-log entry.
   **Verification:** every line of the verdict traces to a run ID, checklist
   row, or register entry. **A verdict without evidence is a Law 3 violation.**
   **Failure handling:** if evidence cannot be obtained, the affected item is
   UNKNOWN and the verdict cannot be GO — say so plainly.
