# CATHEDRAL_EVOLUTION_PROTOCOL — Controlled Mutation and Improvement

**Version:** 1.0.0  
**Created:** 2026-07-19  
**Status:** Active

---

## Purpose

The Evolution Organ governs controlled mutation of the Cathedral organism. Evolution is **not** uncontrolled self-modification. It is:

- Versioned (every change has a unique ID and lineage)
- Baselined (before/after metrics are recorded)
- Reversible (every change has a tested rollback procedure)
- Fitness-measured (improvements are verified against fitness model)
- Approved (changes above the autonomy threshold require Founder approval)
- Learned (lessons are incorporated into future evolutions)

---

## Change Classes

### Class 1: Operational Adaptation
Examples:
- Adjust retry count from 3 to 4
- Increase test timeout from 180s to 300s
- Optimize Capability Registry query
- Improve health check latency
- Better task decomposition heuristic

**Characteristics:**
- Low risk (does not change system boundaries)
- Reversible (can revert in seconds)
- Localized (affects specific component only)
- Testable (can be validated in <1 hour)
- Autonomy: **Can be autonomous if evidence-backed**

**Approval process:**
1. Observe current behavior
2. Propose change with rationale
3. Test in sandbox
4. Compare against baseline
5. If no regression: Apply autonomously
6. Monitor for 24 hours
7. If rollback needed: Revert immediately

**Rollback:** Automatic revert on regression detection

---

### Class 2: Organ Adaptation
Examples:
- Replace a provider (e.g., npm → custom build tool)
- Add new capability to an organ
- Change organ workflow
- Add new health indicator
- Modify fallback procedure

**Characteristics:**
- Medium risk (may affect multiple components)
- Reversible (can revert in minutes to hours)
- Interdependent (may require coordinated changes)
- Requires testing (several hours of validation)
- Autonomy: **Requires approval decision; not autonomous**

**Approval process:**
1. Design change with full impact analysis
2. Test in sandbox environment
3. Run compatibility checks against all organs
4. Measure fitness impact
5. **Require Founder or Governor approval**
6. Deploy in controlled manner
7. Monitor for 48 hours
8. Rollback if issues detected

**Rollback:** Manual revert to previous organ configuration

---

### Class 3: Genome Evolution
Examples:
- Add new organ to Cathedral
- Change core interfaces (Mission, Task, Evidence schemas)
- Modify system-wide policy
- Add new capability category
- Change observability structure

**Characteristics:**
- High risk (affects entire system)
- Complex rollback (coordinated revert of multiple components)
- Far-reaching consequences (cascades across organs)
- Requires extended testing (days)
- Autonomy: **Requires formal review and Founder approval**

**Approval process:**
1. Formal proposal with impact analysis
2. Architecture review (is it sound?)
3. Security review (does it maintain security properties?)
4. Compatibility review (does it work with existing organs?)
5. Test plan (how will we verify it works?)
6. Rollback plan (how will we undo it?)
7. **Require Founder approval with evidence**
8. Deploy in feature-flagged manner (can be disabled)
9. Monitor for 1 week
10. Remove feature flag only after full validation

**Rollback:** Disable feature flag; revert to previous Genome version

---

### Class 4: DNA Change
Examples:
- Change Founder purpose
- Change customer promise
- Modify permanent principles
- Change authority boundaries
- Add/remove prohibited actions
- Modify evidence requirements
- Change security minimum

**Characteristics:**
- **Cannot be autonomous** (ever)
- **Requires explicit Founder approval** (only Founder can change DNA)
- Fundamental to Cathedral identity
- Can only be changed with full deliberation
- Autonomy: **Never autonomous; Founder only**

**Approval process:**
1. Founder proposes DNA change
2. Provide detailed rationale
3. Provide evidence that change is necessary
4. Provide impact analysis (what changes downstream?)
5. Propose new version number
6. Record change in CATHEDRAL_LINEAGE.md
7. Update CATHEDRAL_DNA.yaml
8. Cascade any required Genome changes

**Rollback:** Founder decision only; requires full re-approval to revert

---

## Evolution Record

Every change, regardless of class, must generate an immutable evolution record:

```yaml
evolution_id: "EV-<YYYY>-<MM>-<DD>-<NNN>"
date: "<ISO 8601>"
change_type: "operational | organ | genome | dna"
parent_genome: "1.0.0"
description: "<Human-readable summary>"

reason: "<Why is this change needed?>"

evidence:
  - "<run ID or file reference>"
  - "<supporting data>"

baseline_metrics:
  metric_1: "value at time of change"
  metric_2: "value at time of change"
  fitness_score: "baseline fitness"

proposed_change:
  affected_component: "<e.g., test_execution organ>"
  old_behavior: "<What was happening before>"
  new_behavior: "<What will happen after>"
  rationale: "<Why this is better>"

risk_assessment:
  risk_level: "low | medium | high"
  potential_negative_impact: "<What could go wrong>"
  blast_radius: "isolated | organ | system"
  reversibility: "immediate | gradual | requires_intervention"

sandbox_results:
  test_environment: "<e.g., local dev, staging>"
  duration: "2 hours"
  test_cases_run: 150
  test_cases_passed: 150
  test_cases_failed: 0
  fitness_comparison:
    baseline: "0.950"
    with_change: "0.955"
    improvement: "0.005 (+0.53%)"

approval:
  required: true # false for operational
  approved_by: "Founder"
  approval_date: "<ISO 8601>"
  approval_comment: "Justified by evidence; low risk; approved for deployment"

deployment:
  deployed_at: "<ISO 8601>"
  deployment_method: "feature_flag | direct | gradual_rollout"
  monitoring_period: "24 hours | 48 hours | 7 days"
  monitoring_metrics:
    - "fitness_score"
    - "error_rate"
    - "latency"

outcome:
  status: "success | rolled_back | in_progress"
  fitness_post_change: "0.955"
  issues_detected: []
  rollback_required: false
  rollback_date: null

next_genome_version: "1.0.1"

lineage:
  parent: "genome:1.0.0"
  child: "genome:1.0.1"
  applied_by: "Governor Ω (operational) | Founder (organ/genome/dna)"
```

---

## Baseline Preservation

Before every change:

1. **Measure baseline** (current state)
   - Fitness score
   - Health indicators
   - Performance metrics
   - Error rates
   - Customer satisfaction

2. **Define success criteria** (what counts as improvement?)
   - Fitness should improve by ≥X%
   - Error rate should decrease
   - Customer feedback improves
   - Performance improves

3. **Record baseline** (immutable snapshot)
   - Timestamp
   - All metric values
   - Git commit SHAs of components
   - Configuration state

4. **Test change** (apply in sandbox)
   - Deploy change to isolated environment
   - Run same tests/workloads as baseline
   - Measure metrics

5. **Compare** (did we improve?)
   - Compute fitness score with change
   - Compare to baseline
   - Identify regressions
   - Measure benefit

6. **Approve or reject**
   - If fitness improved: Deploy to production
   - If fitness declined: Reject change or understand tradeoff
   - If mixed: Document tradeoff; require approval

---

## Rollback Procedure (Mandatory)

Every change must have a tested, documented rollback:

```yaml
rollback_procedure:
  trigger: "Fitness score drops >2% OR error rate increases >5%"
  timeout: "Automatic after 7 days if no issues; manual earlier if detected"
  steps:
    - "Disable feature flag (if applicable)"
    - "Revert to previous version: git revert <SHA>"
    - "Re-run tests to verify clean revert"
    - "Monitor for 1 hour"
  estimated_duration: "5-30 minutes"
  data_loss: "None (changes are immutable; previous state restored)"
  testing:
    - "Rollback tested in sandbox before deployment"
    - "Rollback reverses all changes to previous state"
    - "Fitness score returns to baseline"
    - "No data corruption on rollback"
```

---

## Evolution Authorization

| Change Class | Can Execute | Requires Approval | Fallback |
|---|---|---|---|
| Operational | Governor (if evidence-backed) | No | Automatic rollback on regression |
| Organ | Governor Ω with Founder decision | Yes | Manual revert by Founder |
| Genome | Governor Ω with Founder decision | Yes | Feature flag disable + revert |
| DNA | Founder only | Yes (Founder decides) | Manual revert by Founder |

---

## Evolution Cadence

- **Operational:** Continuous (every mission)
- **Organ:** Weekly review (one organ adaptation per week)
- **Genome:** Monthly review (one genome evolution per month)
- **DNA:** Annual review (one DNA change per year if any)

---

## Contradictory Evolution

If two proposed changes conflict:

1. **Document conflict** (explicitly state contradiction)
2. **Measure fitness impact** of each
3. **Choose winner** (select change with greater fitness improvement)
4. **Record loser** (in CATHEDRAL_LINEAGE.md: "EV-X proposed but EV-Y selected instead")
5. **Revisit later** (if circumstances change, loser may be reconsidered)

Example:
```
EV-2026-07-20-001: Increase retry count from 3→4 (fitness +0.2%)
EV-2026-07-20-002: Decrease retry count from 3→2 (fitness +0.1%)
Conflict: Can't do both
Decision: Apply EV-001 (larger fitness gain)
Disposition: EV-002 rejected; revisit if latency requirements change
```

---

## Learning from Evolution

After each evolution:

1. **Observe outcome** (did it work as expected?)
2. **Compare expected vs actual**
3. **Identify surprises** (unexpected benefits or downsides)
4. **Record lesson** (L-XXX: What we learned)
5. **Update policies** (if this lesson should apply elsewhere)

Example lesson:
```
Lesson L-045:
  Observation: Increasing test timeout from 180s→300s reduced flaky failures
  Expected: Some tests should pass more consistently
  Actual: 5% more tests passing; E2E suite more reliable
  Root cause: Some slow but valid tests were timing out; more time allows them
  Applied to: All timeout calculations in pipeline
  Fitness impact: +0.8% reliability improvement
  Prevention: Baseline timeout on actual test suite duration, not guess
```

---

## Anti-Patterns (Never Do This)

1. **Silent change** — Apply change without recording evolution record
2. **No baseline** — Change behavior without measuring before/after
3. **No rollback** — Change with no documented way to revert
4. **Autonomous DNA change** — Modify permanent principles or authority
5. **Contradictory lessons** — Apply lesson that contradicts prior wisdom
6. **Unverified fitness** — Claim improvement without measurement
7. **Suppress regression** — Ignore fitness decline after change
8. **Feature creep** — Add capabilities without removing others
9. **One-way change** — Make change that cannot be reverted
10. **Self-modification of security** — Autonomous change to security rules

---

## Evolution Success Criteria

An evolution is **successful** if:

- ✓ Baseline captured before change
- ✓ Change deployed safely (tested in sandbox first)
- ✓ Fitness maintained or improved (≥baseline)
- ✓ Rollback procedure works (tested)
- ✓ Lesson recorded (if learning occurred)
- ✓ Change can be reverted if needed
- ✓ No regressions in other organs
- ✓ No security or safety violations

---

## Evolution Governance

- Cathedral DNA **cannot** be autonomously modified (Founder only)
- Genome changes require **formal review** (architecture, security, compatibility)
- Organ changes require **approval decision** (Governor + Founder agreement)
- Operational changes can be **autonomous** (if evidence-backed; automatic rollback if regression)

The system improves, but it improves intentionally, measurably, and reversibly.

