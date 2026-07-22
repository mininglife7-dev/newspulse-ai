# CATHEDRAL_HOMEOSTASIS_SPEC — Operating Thresholds and Safe Degradation

**Version:** 1.0.0  
**Created:** 2026-07-19  
**Status:** Active

---

## Purpose

Homeostasis enforces operating thresholds to keep the Cathedral organism within safe bounds. When thresholds are exceeded, the system responds with graduated degradation: continue → degrade → pause → isolate → escalate.

The goal is **never run away unchecked**. The system must be able to slow down, fail safely, and ask for help.

---

## Operating Thresholds

### Execution Thresholds

| Metric | Threshold | Action on Breach | Rationale |
|--------|-----------|-----------------|-----------|
| Command duration | 300 seconds | Timeout; kill process; log; retry once | Prevent hanging commands from blocking queue |
| Max retries | 3 | Stop; escalate to Founder | Prevent infinite retry loops |
| Consecutive failures | 5 | Pause organ; switch fallback; escalate | Indicate systematic problem, not transient |
| Command output size | 50 KB | Truncate; store full in ledger; log summary | Prevent memory explosion from verbose output |
| Queue size | 100 tasks | Pause new task intake | Prevent queue from growing unchecked |

### Reliability Thresholds

| Metric | Threshold | Action on Breach | Rationale |
|--------|-----------|-----------------|-----------|
| CI pass rate | >95% | Investigate; block deployment | >5% failure indicates regression |
| Test coverage | >70% | Block merge; flag for review | Lower coverage increases defect risk |
| Test failure ratio | <5% | Pause test execution; investigate | Flaky tests erode confidence |
| Build duration | <600 seconds | Investigate; optimize; block if > 900s | Long builds block iteration speed |
| Deployment success rate | >95% | Pause deployments; investigate | High failure indicates infrastructure issue |

### Resource Thresholds

| Metric | Threshold | Action on Breach | Rationale |
|--------|-----------|-----------------|-----------|
| Unresolved blockers | ≤3 | Escalate if exceeds | Too many blockers indicate planning failure |
| Evidence deficiency | <95% completeness | Inconclusive mission; rerun; investigate | Incomplete evidence gating prevents false GO |
| Stale facts | >30 days | Mark for refresh; escalate if >45 days | Stale facts become unreliable guidance |
| Unresolved conflicts | 0 allowed | Immediate escalation | Contradictions must be resolved before use |
| Pending lessons | ≤10 | Pause lesson generation; review queue | Too many pending indicates slow validation |

### Security Thresholds

| Metric | Threshold | Action on Breach | Rationale |
|--------|-----------|-----------------|-----------|
| Security alerts | 1+ incident | Immediate escalation; quarantine affected component | Any security incident is red-line |
| Secret exposure | 0 allowed | Credential rotation; audit trail review; escalation | Secrets must never be exposed |
| Permission violations | 0 allowed | Deny action; log; escalate | Unauthorized access is critical |
| Policy violations | 0 allowed | Deny action; escalate | Prohibited actions must be prevented |

### Immune System Thresholds

| Metric | Threshold | Action on Breach | Rationale |
|--------|-----------|-----------------|-----------|
| False positive rate | <2% | Review detection rules; tune sensitivity | Too many false alarms desensitize responders |
| Detection delay | <1 minute | Optimize detectors; escalate if pattern repeats | Threats must be caught quickly |
| Quarantine escape | 0 allowed | Post-mortem; strengthen containment; escalate | Threats must not propagate |
| Unresolved quarantines | ≤5 tasks | Escalate if exceeds; expedite investigation | Don't accumulate stalled work |

---

## Response Strategies

When a threshold is breached, the system responds with increasing restrictiveness:

### Level 1: Continue (Nominal)
- Threshold not breached
- Proceed with normal operations
- Monitor for trend toward breach

### Level 2: Degrade
- One threshold breached
- Reduce scope but maintain service
- Examples:
  - CI slow: run subset of tests, full suite on merge
  - Deploy failing: use fallback provider
  - Evidence incomplete: mark mission inconclusive; do not claim GO

**Decision:** Can the mission proceed with reduced scope?
- Yes → Continue (report degradation)
- No → Move to Level 3

### Level 3: Pause
- Multiple thresholds breached OR single critical breach
- Halt new task intake
- Complete in-flight tasks
- Investigate root cause
- Examples:
  - >5 consecutive failures: pause all automation; investigate
  - Unresolved conflicts in memory: pause decisions until resolved
  - Evidence tampering detected: pause mission until audit complete

**Decision:** Can the issue be resolved in <1 hour?
- Yes → Investigate; retry at Level 1
- No → Move to Level 4

### Level 4: Isolate
- Systemic problem detected
- Disable affected component
- Switch to fallback
- Preserve state for audit
- Examples:
  - Provider failing consistently: suspend provider; activate fallback
  - Security threat: quarantine affected evidence
  - Architecture drift: revert to last stable version

**Decision:** Is fallback available and working?
- Yes → Continue with fallback (report degradation)
- No → Move to Level 5

### Level 5: Escalate
- No further autonomous recovery possible
- Stop all autonomous action
- Preserve evidence
- Alert Founder
- Wait for explicit decision
- Examples:
  - Fallback also failing
  - Resource exhaustion
  - Unresolved conflict after investigation
  - Critical security incident

**Escalation message includes:**
- What is the exact problem
- What has been attempted
- What resources are exhausted
- What action is required from Founder
- Time pressure (immediate, urgent, normal)

---

## Threshold Breach Timeline

### T+0: Detection
Homeostasis monitor detects breach.

### T+0-30s: Classification
Determine severity (Level 1-5) and which thresholds breached.

### T+30s-2m: Response
- Level 2: Log degradation, continue with reduced scope
- Level 3: Pause intake, investigate
- Level 4: Isolate, activate fallback
- Level 5: Escalate, stop autonomous action

### T+2m-60m: Investigation
- Gather evidence
- Identify root cause
- Determine if recoverable autonomously

### T+60m: Decision
- Threshold resolved: Return to Level 1, resume
- Threshold unresolved: Escalate or maintain degradation

---

## Per-Organ Thresholds

### Engineering Organ

| Metric | Threshold | Action |
|--------|-----------|--------|
| CI pass rate | >95% | Block deployment if <95% |
| Test coverage | >70% | Block merge if <70% |
| Build duration | <600s | Investigate if >600s |

### Compliance Organ

| Metric | Threshold | Action |
|--------|-----------|--------|
| Evidence completeness | ≥95% | Inconclusive if <95% |
| Customer understanding | No complaints | Escalate if customer confused |
| Assessment staleness | <30 days | Refresh if >30 days |

### Memory Organ

| Metric | Threshold | Action |
|--------|-----------|--------|
| Unresolved conflicts | 0 | Immediate escalation |
| Fact staleness | <30 days | Mark review needed |
| Provenance completeness | 100% | All facts sourced |

### Immune Organ

| Metric | Threshold | Action |
|--------|-----------|--------|
| Detection false positive rate | <2% | Tune rules if >2% |
| Unquarantined threats | 0 | Immediate escalation |
| Investigation resolution time | <4 hours | Escalate if >4 hours |

### Learning Organ

| Metric | Threshold | Action |
|--------|-----------|--------|
| Lesson validation rate | >95% | Escalate if <95% |
| Fitness degradation after lesson | 0% | Rollback immediately if declines |

---

## Automatic Actions on Breach

### No Surprises
Every threshold breach triggers an automatic, documented response. There are no silent failures or ignored breaches.

**Automatic response template:**
```
THRESHOLD_BREACH:
  threshold: <name>
  measurement: <current_value>
  limit: <threshold>
  severity: <Level 1-5>
  action: <continue | degrade | pause | isolate | escalate>
  timestamp: <ISO 8601>
  mission_id: <M-XXXX>
  task_id: <T-XXXX>
  evidence: <log reference, file path>
```

### Escalation Criteria

Auto-escalate to Founder if:
1. Level 5 (Escalate) is reached
2. Threshold breach persists >1 hour
3. Multiple independent thresholds breached simultaneously
4. Security threshold breached
5. Evidence or memory integrity compromised
6. Fallback also failing

Escalation includes exact state dump (don't make Founder guess what happened).

---

## Homeostasis Monitoring

Continuous monitoring metrics:

- [ ] Thresholds defined per organ (CATHEDRAL_ORGAN_REGISTRY.yaml)
- [ ] Monitoring rules deployed (will be in Governor OS code)
- [ ] Alert channels configured (Slack, logs, email)
- [ ] Fallback procedures documented
- [ ] Escalation contacts identified (Founder, ops team)

---

## Threshold Tuning

Thresholds may be adjusted based on observed behavior:

1. **Evidence:** Collect data for ≥100 mission cycles
2. **Analyze:** Determine if current threshold causes:
   - Too many false alarms (too strict)
   - Too many undetected issues (too loose)
3. **Propose:** Recommend new threshold with rationale
4. **Test:** Verify impact in sandbox
5. **Approve:** Founder review and approval
6. **Deploy:** Update CATHEDRAL_GENOME.yaml
7. **Monitor:** Measure fitness impact

Example: CI pass rate threshold of >95% is too strict if legitimate environmental issues cause ~3% failures. Could adjust to >92% after evidence review.

---

## Graduated Authority

Thresholds are **not** approval gates. They enable graduated decision-making:

- **Level 1 (nominal):** Full autonomous authority for that mission
- **Level 2 (degraded):** Reduce scope; same authority with caveats
- **Level 3 (paused):** Escalate for direction; no new autonomous action
- **Level 4 (isolated):** Manual fallback; no automation
- **Level 5 (escalated):** Founder decision required

This preserves autonomy for simple, healthy operations while protecting the system when conditions deteriorate.

