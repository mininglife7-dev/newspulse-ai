# CATHEDRAL_IMMUNE_SYSTEM_SPEC — Threat Detection and Containment

**Version:** 1.0.0  
**Created:** 2026-07-19  
**Status:** Active

---

## Purpose

The Immune Organ detects and contains corruption, security violations, architectural drift, and malicious behavior. It operates independently of execution, decision-making, and approval engines.

---

## Threat Classes

### Class 1: Fabricated Evidence
**Detection:**
- Verification engine returns `VERIFIED_FAIL` or `INCONCLUSIVE` but task status claims `COMPLETED`
- Evidence artifact referenced but not present in ledger
- Hashes don't match for given artifact

**Quarantine:**
1. Flag mission and all derived evidence as `EVIDENCE_DISPUTED`
2. Prevent downstream tasks from using disputed evidence
3. Alert: "Fabricated evidence detected in mission M-XXX"
4. Escalate to Founder for investigation

**Investigation:**
- Review task execution logs
- Compare claimed output with actual output
- Check for manual evidence tampering

---

### Class 2: Unsupported Readiness Claims
**Detection:**
- GO / launch-ready / verified claim without required artifact (run ID, deploy log, test output)
- Timestamp of claim predates timestamp of evidence
- Claim cites nonexistent commit SHA or run ID

**Quarantine:**
1. Mark claim as `UNVERIFIED_CLAIM`
2. Revert any downstream deployment or GO decision
3. Alert: "Unsupported readiness claim: <detail>"
4. Require new evidence before claim can revert to supported

**Investigation:**
- Reproduce the claim condition
- Verify evidence genuinely exists and matches claim timestamp
- Check for retroactive evidence generation

---

### Class 3: Prompt Injection
**Detection:**
- Policy parser rejects unsafe syntax in tool selection instruction
- Command argument contains shell metacharacters (`;`, `|`, `$()`, backticks) without escaping
- Generated prompt contains untrusted input from:
  - Repository file contents
  - Tool outputs
  - User inputs
  - Prior LLM outputs

**Quarantine:**
1. Deny the unsafe instruction immediately (POLICY_DENY)
2. Log rejected instruction verbatim (redacted if needed)
3. Alert: "Prompt injection detected: <pattern>"
4. Terminate task; escalate to Founder

**Investigation:**
- Inspect instruction source (file, tool output, input)
- Determine if injection was intentional or accidental
- Update allowlist or sanitization logic

---

### Class 4: Secret Exposure
**Detection:**
- Redaction scanner finds AWS key, Supabase key, GitHub token, or bearer token in:
  - Command output
  - Log file
  - Evidence storage
  - Generated report
  - PR or commit message

**Quarantine:**
1. Flag evidence as `SECRETS_EXPOSED`
2. Mark secret as potentially compromised
3. Alert: "Secret detected in <location>; assume compromised"
4. Escalate to Founder (credential rotation required)

**Investigation:**
- How was secret exposed (which command, which code path)
- What scope does secret provide (read-only, write, full access)
- Who has seen the exposed secret (logs viewed, PR commented)

**Recovery:**
- Redact evidence
- Record redaction event (timestamp, reason, secret type)
- Suggest credential rotation

---

### Class 5: Permission Drift
**Detection:**
- Phenotype declares capability as VERIFIED but health check now fails
- Policy expects capability to be available but provider returns error
- Governor-assigned capability missing from environment

**Quarantine:**
1. Suspend affected capability (no new tasks using it)
2. Alert: "Capability <name> no longer available"
3. Escalate to Founder or environment admin

**Investigation:**
- Check environment state (is tool installed, is service running)
- Check permissions (read, write, execute)
- Determine if capability can be recovered or requires fallback

---

### Class 6: Memory Contradiction
**Detection:**
- Two facts in Memory Kernel contradict each other
  - E.g., PROJECT_STATE.md says "deployment succeeded" but DECISION_LOG.md says "deployment failed"
  - E.g., two DECISION_REGISTER entries make opposite claims about same topic
- Same fact appears in two locations with different values
- Stale fact (>30 days old) not marked for review

**Quarantine:**
1. Flag both contradictory sources
2. Mark conflict as `UNRESOLVED`
3. Alert: "Memory contradiction: <detail>"
4. Prevent dependent decisions until conflict resolved

**Investigation:**
- Compare timestamps of conflicting entries
- Check authority of each source (which carried more weight)
- Determine which is authoritative based on evidence and decision precedence
- Record resolution explicitly (no silent overwrites)

---

### Class 7: Provider Failure Pattern
**Detection:**
- Same provider fails N times in a row (N = max_consecutive_failures = 5)
- Provider error rate exceeds threshold (>10% failures)
- Provider latency exceeds homeostasis limit (>300s)

**Quarantine:**
1. Suspend provider from new task assignments
2. Activate fallback provider if available
3. Alert: "Provider <name> failing; switched to fallback"
4. Begin investigation in background

**Investigation:**
- Check provider health endpoint
- Review error logs for root cause
- Determine if provider needs:
  - Restart
  - Credential refresh
  - Fallback activation
  - Operator involvement

**Recovery:**
- Verify fallback is operational
- Re-test primary provider when available
- Return to primary when verified healthy

---

### Class 8: Architectural Drift
**Detection:**
- Genome validation fails (CATHEDRAL_GENOME.yaml no longer matches codebase)
- New code modifies Memory Kernel document without recorded decision
- Authority boundary changed without Founder approval
- Security rule modified by governed component (self-modification attempted)

**Quarantine:**
1. Prevent merge of drifted code
2. Alert: "Architectural drift detected in <file>"
3. Escalate to Founder immediately (red-line violation)

**Investigation:**
- Diff proposed change against canonical Genome
- Identify which law or principle was violated
- Determine if change is:
  - Legitimate evolution (requires approval decision)
  - Accidental drift (requires fix)
  - Intentional circumvention (requires security investigation)

**Recovery:**
- Revert to last stable version
- File decision for proposed legitimate change
- Reapply with proper approval

---

### Class 9: Evidence Tampering
**Detection:**
- Content hash for evidence entry no longer matches stored hash
- Evidence record in ledger is marked with timestamp T but entry appears to have been modified after T
- Append-only ledger shows DELETE operation (which should never occur)

**Quarantine:**
1. Isolate evidence repository
2. Flag ledger as `POTENTIALLY_COMPROMISED`
3. Alert: "Evidence tampering detected; audit trail at risk"
4. Escalate to Founder (may indicate breach)

**Investigation:**
- Restore from backup copy
- Compare hashes
- Determine what was changed and when
- Check access logs for unauthorized edits

**Recovery:**
- Restore clean copy from backup
- Identify and revoke compromised access
- Re-verify all dependent decisions using clean evidence

---

### Class 10: Policy Violation (Prohibited Action Attempted)
**Detection:**
- Task requests a prohibited action (from CATHEDRAL_DNA.yaml)
  - Secret exposure
  - Autonomous DNA modification
  - Uncontrolled evolution
  - Silent rewriting of Memory Kernel
  - Bypassing approval gates
- Policy Engine receives request for prohibited capability
- Approval gate is attempted to be bypassed programmatically

**Quarantine:**
1. Immediately DENY (policy_engine returns DENY, not ALLOW)
2. Alert: "Prohibited action attempted: <action>"
3. Log actor and rationale
4. Escalate to Founder

**Investigation:**
- Was this accidental or intentional
- If accidental: fix process
- If intentional: security incident

---

## Detection Rules Summary

| Threat | Detector | Signal | Response |
|--------|----------|--------|----------|
| Fabricated completion | Verification Engine | VERIFIED_FAIL ≠ COMPLETED | Quarantine evidence |
| Unsupported claim | Evidence Ledger | Artifact missing | Revert GO, escalate |
| Prompt injection | Policy Parser | Unsafe syntax | DENY, terminate task |
| Secret exposure | Redaction Scanner | Key pattern match | Flag, credential rotation |
| Permission drift | Capability Health Check | Capability unavailable | Suspend, fallback |
| Memory contradiction | Conflict Detector | Two facts conflict | Mark unresolved, escalate |
| Provider failure | Retry Counter | N failures | Suspend, fallback |
| Architectural drift | Genome Validator | Schema mismatch | DENY, escalate |
| Evidence tampering | Hash Verifier | Hash mismatch | Isolate, audit |
| Policy violation | Policy Engine | Prohibited action | DENY, escalate |

---

## Quarantine Procedure

### Step 1: Detect
Immune detector identifies threat and classifies it.

### Step 2: Isolate
Stop the threatened component from affecting downstream:
- Quarantine evidence (mark as disputed)
- Suspend capability (prevent new tasks)
- Suspend provider (switch to fallback)
- Revert decision (undo dependent changes)

### Step 3: Alert
Notify observers:
- Log threat to structured log
- Generate alert with threat class and detail
- Escalate to Founder if red-line violation

### Step 4: Investigate
Immune Organ begins investigation:
- Gather logs
- Compare to baseline
- Identify root cause
- Determine scope (how many decisions affected)

### Step 5: Determine Fix
Possible outcomes:
- **Clear:** Threat was false alarm; resume normal operation
- **Localize:** Threat was isolated incident; fix component; resume
- **Escalate:** Threat requires Founder decision; wait for approval
- **Recover:** Restore from backup; replay operations; resume

### Step 6: Verify Recovery
Once fix applied:
- Re-run health checks
- Verify dependent decisions still valid
- Check for new threats
- Return to service only if fully verified

---

## Immune Learning

After each quarantine and investigation:

1. **Record lesson:** What was the threat? How was it detected? How was it resolved?
2. **Improve detection:** Adjust detection rules to catch earlier or more accurately
3. **Improve prevention:** Update processes to prevent recurrence
4. **Update playbook:** Formalize response for this threat class

Example lesson (L-XXX):
```
Observation: Secret exposed in GitHub Actions log
Detection: Redaction scanner found AWS key pattern
Response: Rotated credential, flagged log, updated env var to use masked Secret
Lesson: GitHub Actions logs are not redacted automatically; must explicitly mask
Applied: All workflows now mask sensitive variables
Fitness: No future secret leaks in logs (0 incidents in next 1000 hours)
```

---

## Immunity Score

Track immune system effectiveness:

- Detection accuracy: % of real threats detected (target: >98%)
- False positive rate: % of incorrect threat flags (target: <2%)
- Quarantine effectiveness: % of threats contained without propagation (target: >99%)
- Investigation time: hours from detection to resolution (target: <4 hours)
- Learning application: % of lessons applied to prevention (target: >80%)

If immune score drops below thresholds, escalate to Founder for review of immune policies.
