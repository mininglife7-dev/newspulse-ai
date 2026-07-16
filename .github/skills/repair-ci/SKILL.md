# Skill: repair-ci

**Purpose:** Diagnose and fix a red CI or workflow run.
**Inputs:** run ID (from Actions tab or API).
**Steps:**

1. List jobs → find the failed job and step
   (`/actions/runs/{id}/jobs`).
2. Pull that job's logs; read the first real error, not the last line.
3. Reproduce locally when possible (run-tests skill).
4. Fix root cause with the minimal change; never delete or skip a check to
   go green — a check that cannot pass must be fixed to reflect reality
   (lesson L-005), not removed.
5. Push, confirm the same job passes, cite old + new run IDs in the PR.
   **Expected output:** green run, root-cause sentence in the PR/commit.
   **Verification:** new run ID with `conclusion: success` on the same workflow.
   **Failure handling:** 3 failed attempts → record findings in the risk
   register and NEXT_ACTION notes; escalate only if Founder-gated
   (credentials, settings, billing).
