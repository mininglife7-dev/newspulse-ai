# CATHEDRAL_REGENERATION_SPEC — Organ Failure and Recovery

**Version:** 1.0.0  
**Created:** 2026-07-19  
**Status:** Active

---

## Purpose

Every critical Cathedral organ must have a recovery procedure. Regeneration is how the system restores a failed organ to service using either:

1. **Fallback activation** — temporary continuity while primary repair occurs
2. **Clean reconstruction** — rebuild from the Genome
3. **State restoration** — recover from backup and replay valid operations
4. **Hybrid recovery** — combination of the above

Regeneration is **not** an uncontrolled rollback. It's a structured, verifiable procedure.

---

## Regeneration Principles

1. **Fallback first** — Switch to proven alternative provider immediately
2. **Preserve evidence** — Never discard logs or audit trails during recovery
3. **Verify before use** — Health checks must pass before resuming service
4. **Graduated restoration** — Start limited; expand scope only after verification
5. **Document all recovery** — Record what was wrong, what was done, what worked

---

## Per-Organ Regeneration Procedures

### Engineering Organ Regeneration

**Triggered by:**
- CI broken (tests fail, build fails, lint errors)
- Deployment failed
- Code quality regression
- Performance regression

#### Step 1: Detect Failure
```
Detector: CI monitor, deployment monitor, test suite
Signal: Exit code non-zero, deployment rollback, quality metrics below threshold
Action: Isolate (pause new deployments), alert
```

#### Step 2: Diagnose
- Which commit introduced the failure?
  - Binary search: `git bisect` or revert recent commits
  - Run tests locally to confirm
- Which test failed? Which linter? Which build stage?
- Is this a transient issue (flaky test) or systematic?

#### Step 3: Identify Last Known Good (LKG)
```
LKG = last commit where CI passed and metrics were healthy
Criteria for LKG:
  - All tests passing (vitest, Playwright smoke)
  - Lint: 0 errors
  - Build: Success, <600s
  - Coverage: >70%
  - No security alerts
```

#### Step 4: Restore from LKG
```
git checkout <LKG-SHA>
npm ci  # clean install
npm run lint
npm run type-check
npm test -- --run
npm run build
```

Verify all steps succeed with same output signatures as before.

#### Step 5: Verify Health
```
✓ CI green (all tests passing)
✓ Coverage remains >70%
✓ No new errors
✓ Performance within bounds
✓ No security alerts
```

#### Step 6: Return to Service
- Commit is known-good
- Pause current deployment
- Resume from LKG if applicable
- Continue normal operations
- Schedule investigation of broken commit (what went wrong)

#### Step 7: Prevent Recurrence
- If systematic issue: add test to catch it
- If flaky test: stabilize it
- If missing validation: add to pre-commit hooks
- Record lesson (L-XXX): "What we learned from this failure"

#### Fallback Provider
If git history is corrupted or LKG cannot be identified:
- **Fallback:** Manual engineering
- **Action:** Founder or developer manually investigates and fixes
- **Time:** Hours, not minutes
- **Use only if:** Automated recovery impossible

---

### Compliance Organ Regeneration

**Triggered by:**
- Missing evidence artifact
- Evidence corruption (hash mismatch)
- Assessment stale (>30 days)
- Customer confusion (doesn't understand report)
- Obligation untracked

#### Step 1: Detect Failure
```
Detector: Evidence ledger validator, assessment age monitor, customer feedback
Signal: Evidence artifact missing, hash mismatch, assessment timestamp old
Action: Pause reporting, mark mission inconclusive
```

#### Step 2: Restore Evidence
- Check Evidence Ledger for all collected artifacts
- Verify content hashes (should match stored hashes)
- If ledger is clean, evidence is intact
- If hashes fail → potential tampering → escalate to Founder

#### Step 3: Rerun Assessment
```
For each obligation:
  1. Gather updated evidence (AI systems inventory, risk assessments, logs)
  2. Classify risk (High/Medium/Low per EU AI Act)
  3. Record findings
  4. Generate compliance findings
```

#### Step 4: Regenerate Report
- Use recovered evidence
- Regenerate compliance report
- Compare to previous report
  - If findings same: regeneration successful
  - If findings differ: investigate why (new evidence, better analysis, missed evidence)

#### Step 5: Verify with Customer
- Ask customer: "Does this report accurately reflect your AI systems?"
- Customer confirms or identifies gaps
- If gaps: recover missing evidence and regenerate

#### Step 6: Return to Service
- Mark assessment current (timestamp T)
- Resume compliance mission
- Schedule review date (T + 30 days)

#### Step 7: Prevent Recurrence
- Why was evidence missing? (collection failure, deletion, access denied)
- Why was assessment stale? (no review cycle)
- Improve evidence collection process
- Add automated staleness detection

#### Fallback Provider
- **Fallback:** Manual compliance review (Founder)
- **Use when:** Automated regeneration impossible (corrupted evidence)

---

### Memory Organ Regeneration

**Triggered by:**
- Lost evidence (file corrupted or deleted)
- Conflicting facts (two sources say opposite things)
- Unsourced claim (fact without evidence)
- Evidence tampering (hash mismatch)

#### Step 1: Detect Failure
```
Detector: Conflict detector, hash verifier, provenance checker
Signal: Hash mismatch, contradiction, unsourced claim
Action: Mark fact as disputed, escalate
```

#### Step 2: Restore from Git History
```
git log --all -- docs/governor/
git show <SHA>:<file>  # view file at that commit
Compare to current version
```

- If current is corrupted: restore from git history
- If current conflicts with history: preserve both; mark conflict

#### Step 3: Verify Hashes
- Recompute content hash for recovered file
- Compare to stored hash
- If match: recovery successful
- If mismatch: evidence was modified between generations

#### Step 4: Rebuild Evidence Index
- Regenerate evidence manifest
- Verify all artifacts are present
- Check provenance completeness

#### Step 5: Detect and Mark Conflicts
```
If two sources contradict:
  1. Preserve both original records
  2. Mark contradiction explicitly
  3. Compare dates, authority, evidence
  4. Note which is current trusted version
  5. Do NOT rewrite either source invisibly
```

#### Step 6: Return to Service
- Memory Kernel is restored
- Conflicts are marked (not hidden)
- Facts are properly sourced

#### Step 7: Prevent Recurrence
- Why was evidence lost? (access denied, disk failure, cleanup script)
- Why did contradiction occur? (parallel updates, old cache, wrong merge)
- Implement automated backups
- Implement conflict detection on writes
- Add pre-commit validation

#### Fallback Provider
- **Fallback:** File storage backup + git history
- **Use when:** Ledger is corrupted beyond repair

---

### Immune Organ Regeneration

**Triggered by:**
- Threat undetected (bypassed detection)
- Detection rule broken (produces false positives)
- Quarantine escaped (threat not contained)

#### Step 1: Post-Mortem
- What threat occurred?
- Why was it not detected?
- Was it detected but not acted upon?
- Did threat propagate despite quarantine?

#### Step 2: Improve Detection Rule
```
Add/improve detection:
  Threat pattern: <describe what to look for>
  Detector: <name of detector or new detector needed>
  Test case: <example of threat that should trigger>
  False positive rate: <acceptable>
  Detection latency: <target>
```

#### Step 3: Test Detection
- Inject threat into sandbox
- Verify detection triggers
- Verify false positive rate acceptable
- Verify response is correct

#### Step 4: Strengthen Containment
- If quarantine escaped: improve isolation
- If fallback not activated: improve fallback selection
- If Founder not alerted: improve escalation

#### Step 5: Deploy Improved Rules
- Update detection rules in Genome
- Deploy to current environment
- Monitor for improvements

#### Step 6: Learn
- Record immune lesson (L-XXX)
- Share pattern with other detection systems
- Improve overall immunity

#### Fallback Provider
- **Fallback:** Founder manual investigation and approval of threats
- **Use when:** Automated detection is impossible

---

### Learning Organ Regeneration

**Triggered by:**
- Lesson causes regression (fitness declined after application)
- Lesson validation failed (hypothesis wrong)
- Lesson leads to drift (unintended side effects)

#### Step 1: Detect Regression
```
Detector: Fitness monitor, mission outcome analyzer
Signal: Metric declined after lesson applied
Action: Pause lesson application, investigate
```

#### Step 2: Identify Cause
- Was lesson hypothesis wrong?
- Was lesson applied in wrong context?
- Was lesson incompletely tested?

#### Step 3: Rollback Lesson
- If lesson was recently applied: revert to previous behavior
- Verify fitness returns to baseline

#### Step 4: Revalidate Lesson
```
Run lesson through validation again:
  1. Baseline measurement
  2. Sandbox test with lesson applied
  3. Compare against baseline
  4. Check for side effects
  5. Determine if lesson is valid in some contexts but not others
```

#### Step 5: Categorize Outcome
- **Valid lesson, wrong context** → Apply more carefully (specific organs only)
- **Invalid lesson** → Discard; improve hypothesis validation
- **Incomplete lesson** → Add conditions/caveats

#### Step 6: Return to Service
- Resume with corrected lesson or without lesson
- Monitor fitness for stabilization

#### Fallback Provider
- **Fallback:** Disable all autonomous lessons; operate under manual Founder guidance

---

### Observability Organ Regeneration

**Triggered by:**
- Logs lost or corrupted
- Events not correlated (can't trace back to mission)
- Metrics unavailable

#### Step 1: Restore from Backup
```
If logs stored in:
  - SQLite: Restore from backup DB
  - JSON Lines: Restore from backup file
  - GitHub Actions: Fetch from workflow run artifacts
```

#### Step 2: Rebuild Indices
- Recompute mission/task correlations
- Rebuild metric time-series
- Verify data integrity

#### Step 3: Resume Collection
- Observability resumes from current point
- Historical logs are available for querying

#### Fallback Provider
- **Fallback:** Manual log inspection (slower, less automated)

---

## Regeneration Workflow (General)

```
FAILURE
  ↓
DETECT (health check fails, alert triggered)
  ↓
ISOLATE (pause affected work, activate fallback if available)
  ↓
DIAGNOSE (gather logs, identify root cause)
  ↓
RESTORE (from backup, from Genome, or via fallback)
  ↓
VERIFY (health checks pass, metrics return to baseline)
  ↓
RETURN TO SERVICE (resume normal operations)
  ↓
PREVENT RECURRENCE (improve detection, tests, process)
  ↓
LEARN (record lesson, update policies)
```

---

## Health Checks for Each Organ

### Engineering Health Check
```
✓ CI passes (lint, type-check, tests, build)
✓ Test coverage >70%
✓ Build duration <600s
✓ No security alerts
✓ Deployment successful
✓ Live environment serving requests
```

### Compliance Health Check
```
✓ Evidence ledger intact (no hash mismatches)
✓ All obligations tracked
✓ Assessment current (<30 days)
✓ Customer understands findings
✓ Report generated and delivered
```

### Memory Health Check
```
✓ No unresolved conflicts
✓ All facts sourced
✓ No stale facts (>30 days unmarked)
✓ No evidence corruption (hashes match)
✓ Provenance complete
```

### Immune Health Check
```
✓ Detection rules working (<2% false positive rate)
✓ Threats detected <1 minute
✓ Quarantine contains threats (100% success)
✓ Escalations reaching Founder
```

### Learning Health Check
```
✓ Lessons validated before application (>95% validation rate)
✓ No lesson causes regression (0 rollbacks)
✓ Lessons improve fitness (measurable baseline improvement)
```

---

## Escalation During Regeneration

If regeneration fails or stalls:

1. Continue for up to 1 hour
2. If unresolved after 1 hour → Escalate to Founder
3. Provide Founder with:
   - Exact failure description
   - Diagnosis (what was wrong)
   - Recovery attempt (what was tried)
   - Current state (what's running, what's paused)
   - Recommended action

Example escalation:
```
REGENERATION_FAILURE:
  organ: Engineering
  trigger: CI failed (tests failing)
  last_known_good: <SHA-123abc>
  recovery_attempt: Restore to LKG + re-run tests
  result: Still failing (4/150 tests failing)
  diagnosis: Tests are genuinely broken, not environmental
  current_state: Paused deployments; running on fallback (manual)
  time_elapsed: 45 minutes
  recommendation: Founder review; likely need targeted fix or revert
  escalation_required: true
```

