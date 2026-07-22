# VAJRA Phase 0 – Analysis Readiness Framework

**Authority:** Governor Executive Directive (VAJRA Primary Mission)  
**Effective Date:** 2026-07-22  
**Status:** READY FOR DISCOVERY OUTPUT

---

## Executive Summary

VAJRA Phase 0 (Recovery and Scientific Baseline) is prepared to execute immediately upon receiving the Windows discovery report.

This document defines:

1. **What we know with certainty** (verified facts only)
2. **What remains unknown** (awaiting discovery)
3. **Governor's analysis playbook** (how to process discovery output)
4. **Automated next steps** (Phase 0.1–0.5 execution sequence)
5. **Success gates** (what must be true to proceed to Phase 1)

---

## Part 1: Verified Facts (Certainties)

### VAJRA Does NOT Reside In Cloud

**Evidence:**

- Full search of `mininglife7-dev/newspulse-ai` cloud repository: 0 VAJRA references
- All cloud branches scanned (main, development, feature branches): No VAJRA code
- All cloud commit history searched: No VAJRA commits
- Vercel deployments checked: EURO AI only
- Supabase schemas checked: EURO AI schema only
- GitHub Actions CI/CD checked: EURO AI workflows only
- Documentation audit: No VAJRA designs, no VAJRA references

**Conclusion:** VAJRA source code, Git history, and all assets reside **Windows C: drive only** (assumed, awaiting verification).

### Windows Discovery Script Ready

**Evidence:**

- `tools/windows/Collect-VajraEvidence.ps1` exists (PowerShell evidence collector)
- `tools/windows/START_VAJRA_RECOVERY.cmd` exists (launcher)
- Scripts are read-only, non-destructive, safe
- Execution time: 30-60 seconds
- Output format: CSV, JSON, Markdown, checksums
- No secrets printed to console
- No network transmission

**Status:** Ready for Founder execution (on Windows laptop)

### Governor Has Execution Framework Ready

**Evidence:**

- `PHASE-0-INVESTIGATION-FRAMEWORK.md`: 350+ line detailed framework for Phases 0.1-0.5
- `VAJRA-PHASE-1-ADAPTER-FRAMEWORK.md`: Phase 1+ mission design complete
- `GOVERNOR_MISSION_FOR_VAJRA.md`: Permanent laws governing VAJRA operations
- Scientific method templates prepared
- 10-point Generalization Gate applied to research work
- Autonomy boundaries and escalation triggers documented

**Status:** All frameworks prepared, awaiting discovery input

---

## Part 2: Verified Unknowns (Awaiting Discovery)

### VAJRA Repository State

**Unknown facts** (will be answered by Windows discovery):

- [ ] **Repository location** — Exact path(s) on C: drive
- [ ] **Repository naming** — VAJRA, VAJRA_GOLD, VAJRA-RESEARCH, etc.
- [ ] **Git status** — Branch structure, remotes, commit count
- [ ] **Current branch** — What's checked out on Windows
- [ ] **Latest commit** — Hash, date, message
- [ ] **Dirty status** — Uncommitted changes present?
- [ ] **Total commit count** — Project maturity indicator
- [ ] **Remote configuration** — GitHub, GitLab, local, or none

### VAJRA Source Code & Structure

**Unknown facts** (will be answered by discovery):

- [ ] **Primary languages** — Python, C++, Java, mixed?
- [ ] **Project structure** — src/, tests/, data/, docs/, config/
- [ ] **Configuration files** — setup.py, pyproject.toml, requirements.txt, Makefile
- [ ] **Dependencies** — What's required to build/run
- [ ] **Build system** — pip, conda, npm, bazel, or other
- [ ] **Test suite location** — pytest, unittest, other frameworks
- [ ] **Entry points** — main.py, app.py, server.py, other
- [ ] **Documentation** — README, CONTRIBUTING, architecture docs

### VAJRA Build & Startup Capability

**Unknown facts** (will be answered by discovery + manual verification):

- [ ] **Can build successfully** — Dependencies available? Compilation clean?
- [ ] **Can startup without errors** — Configuration resolved? No fatal imports?
- [ ] **Required credentials** — API keys, broker connections, database configs
- [ ] **Configuration system** — Environment variables, config files, hardcoded
- [ ] **Data dependencies** — Market data feeds, backtesting datasets, training data
- [ ] **External integrations** — Broker APIs, data providers, cloud services

### VAJRA Scientific Assets

**Unknown facts** (will be answered by discovery + code inspection):

- [ ] **Strategies defined** — Names, descriptions, parameters, entry/exit logic
- [ ] **Models trained** — ML models, statistical models, their performance
- [ ] **Indicators implemented** — Technical, custom, data sources
- [ ] **Datasets available** — Market data periods, frequency (daily, intraday, tick)
- [ ] **Experiments recorded** — Experiment history, results, hypotheses
- [ ] **Validation methods** — Walk-forward? Out-of-sample? Monte Carlo?
- [ ] **Performance history** — Returns, drawdown, Sharpe, win rate, Profit Factor
- [ ] **Optimization history** — Parameter ranges tested, overfitting concerns

### VAJRA Operational State

**Unknown facts** (will be answered by discovery):

- [ ] **Is VAJRA actively maintained** — Commit frequency, last update date
- [ ] **Known defects** — Bug reports, TODO comments, GitHub issues
- [ ] **Technical debt** — Unfinished refactors, deprecated code, legacy systems
- [ ] **Research maturity** — Proof-of-concept? Production? Abandoned?
- [ ] **Backup copies** — VAJRA_GOLD or other versions present?
- [ ] **Documentation quality** — Well-documented or sparse?
- [ ] **Test coverage** — Comprehensive? Partial? Missing?

---

## Part 3: Discovery Report Processing Playbook

### Step 1: Windows Discovery Execution (Founder Action)

**Timeline:** Immediate upon this directive

**Founder executes:**

```
1. Download Collect-VajraEvidence.ps1 and START_VAJRA_RECOVERY.cmd
2. Double-click START_VAJRA_RECOVERY.cmd on Windows laptop
3. Wait for completion (30-60 seconds)
4. Upload C:\VAJRA_EVIDENCE_EXPORT\[timestamp]\ folder to Governor
```

**Expected output files:**

- `candidate_inventory.csv` — All found projects with metadata
- `candidate_inventory.json` — Machine-readable inventory
- `git_repository_map.md` — Git details for each repository
- `secret_risk_report.md` — Potential secrets (filenames only)
- `environment.json` — Scan environment details
- `checksums.sha256` — File integrity verification

### Step 2: Governor Phase 0.1 Analysis (Immediate upon receipt)

**Trigger:** Discovery output files received

**Governor executes:**

#### 0.1.1 Candidate Inventory Analysis

**Parse `candidate_inventory.csv`:**

- [ ] Filter for rows containing "vajra", "gold", "trading", "quant", "research"
- [ ] Sort by: IsGitRepository (true first), CommitCount (descending), LastModified (descending)
- [ ] Identify authoritative VAJRA (largest commit count, most recent activity)
- [ ] Identify VAJRA_GOLD or variants (backup copies, experimental versions)
- [ ] Document secondary projects (supporting tools, data collectors, analytics)

**Deliverable:** Repository Priority List

```
1. VAJRA (Path, Type, Size, CommitCount, LastModified)
2. VAJRA_GOLD (if present)
3. Supporting Projects (if any)
```

#### 0.1.2 Git Metadata Extraction

**Parse `git_repository_map.md`:**

- [ ] Current branch for VAJRA
- [ ] List of branches (main/master, develop, release/X, feature/X, abandoned branches)
- [ ] Latest commit (hash, date, message, author)
- [ ] Total commit count (indicates project maturity)
- [ ] Remote configuration (where does it push to?)
- [ ] Dirty status (uncommitted changes?)
- [ ] Untracked files (development in progress?)
- [ ] Branch protection rules (if any)

**Deliverable:** Git Status Report

```
Repository: VAJRA
Location: [Full path]
Current Branch: [branch name]
Latest Commit: [hash] - [date] - "[message]"
Commit Count: [number]
Dirty: [yes/no]
Untracked Files: [count]
Remotes: [origin, upstream, etc.]
```

#### 0.1.3 Secret Risk Assessment

**Parse `secret_risk_report.md`:**

- [ ] Identify potential secrets (API keys, credentials, tokens)
- [ ] Classify by sensitivity (API key < database password < live trading credentials)
- [ ] Determine if secrets are for: sandbox, test, production, or unknown
- [ ] Generate remediation checklist (rotate? remove? document-only?)
- [ ] Do NOT read secret values — work from filenames/types only

**Deliverable:** Secret Risk Inventory

```
Finding: [File path and type]
Severity: [HIGH/MEDIUM/LOW]
Remediation: [Action required]
```

#### 0.1.4 Repository Verification Report

**Combine findings into single report:**

**Repository Verification Report — VAJRA Phase 0.1**

| Item                     | Finding                                      | Evidence                |
| ------------------------ | -------------------------------------------- | ----------------------- |
| **Repository Location**  | [Full path]                                  | discovery output        |
| **Repository Type**      | Git / Mercurial / Other                      | git_repository_map.md   |
| **Current Branch**       | [branch name]                                | git_repository_map.md   |
| **Latest Commit**        | [hash] [date]                                | git_repository_map.md   |
| **Commit Count**         | [number] (maturity: active/stable/abandoned) | candidate_inventory.csv |
| **Dirty Status**         | [yes/no] (uncommitted changes)               | git_repository_map.md   |
| **Project Size**         | [MB] (indicates scope)                       | candidate_inventory.csv |
| **Primary Languages**    | [Python/C++/Java/Mixed]                      | environment.json        |
| **Backup Copies**        | [VAJRA_GOLD present/absent]                  | candidate_inventory.csv |
| **Secret Risk**          | [HIGH/MEDIUM/LOW] (remediation required)     | secret_risk_report.md   |
| **Next Phase Readiness** | [Ready/Blocked on X]                         | Summary                 |

**File location:** `docs/governor/missions/PHASE-0-<timestamp>/PHASE-0-1-REPOSITORY-VERIFICATION.md`

---

### Step 3: Governor Phase 0.2 Execution (After 0.1 report)

**Trigger:** Phase 0.1 analysis complete

**Objective:** Determine whether VAJRA can execute today

**Manual verification required** (cannot be automated from discovery output alone):

- [ ] Clone VAJRA repository to analysis environment
- [ ] Run `./build` or equivalent (verify build system works)
- [ ] Inspect `setup.py` / `requirements.txt` / `pyproject.toml` (dependency analysis)
- [ ] Run startup command (main.py, app.py, or equivalent)
- [ ] Document any build errors, missing dependencies, configuration gaps
- [ ] Classify each component (READY/PARTIAL/FAILED/UNKNOWN)

**Deliverable:** System Recovery Report

- Component status table (Trading Engine, Market Data, Strategy Module, Backtesting Engine, Research Tools, Config System, Test Suite, Documentation, Automation Scripts)
- Known build issues and workarounds
- Missing dependencies list
- Configuration requirements checklist

**File location:** `docs/governor/missions/PHASE-0-<timestamp>/PHASE-0-2-SYSTEM-RECOVERY.md`

---

### Step 4: Governor Phase 0.3 Execution (After 0.2 report)

**Trigger:** Phase 0.2 system recovery assessment complete

**Objective:** Produce verified scientific inventory

**Code inspection required** (systematic source code analysis):

- [ ] Find all strategy definitions (names, descriptions, parameters)
- [ ] Find all models (ML, statistical, entry/exit)
- [ ] Find all indicators (technical, custom)
- [ ] Find all datasets (sources, periods, quality notes)
- [ ] Find all experiments (recorded hypothesis, results, learning)
- [ ] Find all validation methods (walk-forward, out-of-sample, Monte Carlo)
- [ ] Find performance metrics (returns, drawdown, Sharpe, win rate, Calmar)

**Deliverable:** Scientific Baseline Report

- Strategies inventory (table: Name, Parameters, Entry Logic, Exit Logic, Risk Management, Performance History)
- Models inventory (table: Type, Purpose, Performance Metrics, Training Data, Validation Status)
- Indicators inventory (table: Name, Implementation, Parameters, Reliability)
- Datasets inventory (table: Source, Frequency, Period Covered, Quality Notes)
- Validation Methods (table: Method, Applicability, Assumptions, Known Issues)
- Performance History (table: Strategy/Model, Annual Return, Max Drawdown, Sharpe, Win Rate, Profit Factor, Period Covered)

**File location:** `docs/governor/missions/PHASE-0-<timestamp>/PHASE-0-3-SCIENTIFIC-BASELINE.md`

---

### Step 5: Governor Phase 0.4 Execution (After 0.3 report)

**Trigger:** Phase 0.3 scientific baseline complete

**Objective:** Create complete research asset inventory

**Research ledger inspection** (find all experiment records):

- [ ] Completed experiments (results validated, learning captured)
- [ ] Active experiments (in progress, expected timeline)
- [ ] Abandoned experiments (why abandoned, partial results)
- [ ] Unvalidated hypotheses (tested but not reproducible)
- [ ] Known defects (bugs, design flaws, reproducibility issues)
- [ ] Technical debt (refactors needed, deprecated code, legacy systems)
- [ ] Missing data (what's unavailable, impact on research)

**Deliverable:** Research Asset Inventory

- Completed Research (table: Hypothesis, Methodology, Results, Reproducibility Status, Learning Captured)
- Active Research (table: Hypothesis, Expected Timeline, Current Progress, Known Blockers)
- Abandoned Research (table: Hypothesis, Why Abandoned, Partial Results, Lessons Learned)
- Scientific Debt (table: Issue, Component Affected, Severity, Impact on Research)
- Missing Data (table: Data Type, Why Missing, Impact on Research, Workaround)

**File location:** `docs/governor/missions/PHASE-0-<timestamp>/PHASE-0-4-RESEARCH-INVENTORY.md`

---

### Step 6: Governor Phase 0.5 Execution (After 0.4 report)

**Trigger:** Phase 0.4 research inventory complete

**Objective:** Prioritize recovery work using mandated priority order

**Roadmap construction** (synthesize all Phase 0.1-0.4 findings):

**Priority Order (Non-Negotiable):**

1. **Recover** — Restore lost or incomplete work
2. **Verify** — Confirm reproducibility of existing results
3. **Measure** — Establish baseline performance metrics
4. **Understand** — Document how systems work
5. **Improve** — Enhance existing capabilities
6. **Optimize** — Performance tuning
7. **Scale** — Increase capacity

**For each identified issue:**

- [ ] Classify by priority level (Recover/Verify/Measure/Understand/Improve/Optimize/Scale)
- [ ] Estimate effort (hours)
- [ ] Identify dependencies (blockers, prerequisites)
- [ ] Document evidence for prioritization decision

**Deliverable:** Recovery Roadmap

- Task list (table: Priority Level, Task Name, Component, Estimated Effort, Blockers, Evidence)
- Dependency graph (which tasks block others)
- Timeline estimate (weeks to complete highest-priority tasks)
- Success criteria per task

**File location:** `docs/governor/missions/PHASE-0-<timestamp>/PHASE-0-5-RECOVERY-ROADMAP.md`

---

### Step 7: Final Phase 0 Synthesis

**Trigger:** All Phase 0.1-0.5 reports complete

**Objective:** Produce executive summary and verify success criteria

**Synthesis checklist:**

- [ ] **Question 1: Where is VAJRA?** — Answer from Phase 0.1 (repository location verified)
- [ ] **Question 2: What exactly exists?** — Answer from Phase 0.3-0.4 (complete inventory)
- [ ] **Question 3: What runs today?** — Answer from Phase 0.2 (system recovery status)
- [ ] **Question 4: What is broken?** — Answer from Phase 0.2 & 0.4 (defects and tech debt)
- [ ] **Question 5: What has already been proven?** — Answer from Phase 0.3 (validated strategies/models)
- [ ] **Question 6: What has never been validated?** — Answer from Phase 0.3 & 0.4 (unproven hypotheses)
- [ ] **Question 7: What should be repaired first?** — Answer from Phase 0.5 (top-priority recovery tasks)
- [ ] **Question 8: What is the current scientific baseline?** — Answer from Phase 0.3 (performance metrics)

**Deliverable:** Executive Summary + Risk Register

**File location:** `docs/governor/missions/PHASE-0-<timestamp>/PHASE-0-EXECUTIVE-SUMMARY.md`

---

## Part 4: Phase 0 Completion Gates

### Gate 1: Discovery Output Received & Verified

- [ ] `candidate_inventory.csv` received and parsed
- [ ] `git_repository_map.md` received and verified
- [ ] `secret_risk_report.md` analyzed (no blockers)
- [ ] `checksums.sha256` verified (file integrity OK)
- [ ] All files in: `C:\VAJRA_EVIDENCE_EXPORT\[timestamp]\`

### Gate 2: Phase 0.1–0.5 Reports Complete

- [ ] Phase 0.1: Repository Verification Report ✅
- [ ] Phase 0.2: System Recovery Report ✅
- [ ] Phase 0.3: Scientific Baseline Report ✅
- [ ] Phase 0.4: Research Asset Inventory ✅
- [ ] Phase 0.5: Recovery Roadmap ✅

### Gate 3: Success Criteria Met

- [ ] All 8 executive questions answered with evidence
- [ ] Risk register updated (no blockers to Phase 1)
- [ ] Recovery Roadmap prioritized per mandated order
- [ ] Phase 1 readiness confirmed

### Gate 4: Transition to Phase 1

- [ ] Phase 0 archive created: `docs/governor/missions/PHASE-0-<timestamp>/`
- [ ] NEXT_ACTION.md updated with Phase 1 mission
- [ ] Phase 1 Adapter Framework (VAJRA-PHASE-1-ADAPTER-FRAMEWORK.md) confirmed ready
- [ ] Governor autonomous execution authorized
- [ ] Phase 1: Autonomous Improvement & Research Velocity begins immediately

---

## Part 5: Success Metrics & Evidence Standards

### Readiness to Begin Phase 0.1

**Prerequisite:** Founder executes Windows discovery script

**Verification:**

- [ ] Discovery output files received
- [ ] Files are readable (CSV, JSON, Markdown)
- [ ] Checksums valid (file integrity verified)
- [ ] No corruption detected

**If not ready:** Report limitation honestly; do not proceed with assumptions

### Readiness to Begin Phase 1

**Prerequisites:**

- [ ] Phase 0.1-0.5 reports complete
- [ ] All 8 executive questions answered
- [ ] Recovery Roadmap created and prioritized
- [ ] Scientific baseline established
- [ ] No critical blockers identified (email config issues, credentials missing, etc.)

**If ready:** Proceed to Phase 1 (Autonomous Improvement & Research Velocity)

- [ ] Top 3 recovery tasks identified
- [ ] Research velocity baseline metrics prepared
- [ ] Experiment ledger framework ready
- [ ] Autonomy boundaries documented

---

## Part 6: Governance & Authority

### Discovery Phase (Phase 0.1)

**Governor Authority:** Full autonomy (analyzing discovery output)
**Founder Authority:** Execute Windows script only

### Analysis Phases (Phase 0.2-0.5)

**Governor Authority:** Full autonomy (analysis and report generation)
**Founder Authority:** Review reports, approve roadmap, authorize Phase 1 start

### Escalation Required If

- [ ] Discovery output indicates VAJRA is in cloud (contradicts current finding)
- [ ] Critical secrets discovered requiring immediate rotation
- [ ] System dependencies require license/authorization to build
- [ ] Recovery tasks conflict with other Founder priorities
- [ ] Phase 0 analysis suggests fundamental architectural redesign needed

---

## Implementation Timeline

**Phase 0.1 (Repository Discovery):** Upon discovery output received (~30 min analysis)
**Phase 0.2 (System Recovery):** Immediately after 0.1 (~1-2 hours)
**Phase 0.3 (Scientific Baseline):** Immediately after 0.2 (~2-4 hours)
**Phase 0.4 (Research Inventory):** Immediately after 0.3 (~2-3 hours)
**Phase 0.5 (Recovery Roadmap):** Immediately after 0.4 (~1-2 hours)

**Total Phase 0 Duration:** ~7-12 hours (fully concurrent, non-blocking)

**Phase 1 Start:** Immediately upon Phase 0 completion (same day expected)

---

## Status

✅ Framework prepared  
✅ Playbook documented  
✅ Success criteria defined  
✅ Escalation triggers documented  
⏳ Awaiting Windows discovery script execution

---

**Ready for Founder Action:** Execute `START_VAJRA_RECOVERY.cmd`

**Ready for Governor Execution:** Upon discovery output received

**Authority:** Governor Executive Directive (VAJRA Primary Mission)  
**Effective:** 2026-07-22
