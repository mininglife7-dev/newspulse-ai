# Operation Single Throne: Consolidation Plan

**Phase:** 3 (Planning & Preservation)  
**Status:** DRAFT FOR EXECUTION  
**Authority:** Governor Ω under Operation Single Throne  

---

## EXECUTIVE SUMMARY

46 branches across 8 categories contain parallel work that must be consolidated into single Governor Ω authority before the session ends. The 3 open PRs represent the most critical work:

- **PR #148:** Governor Ω v2.0 institutional memory (+1 commit, ready)
- **PR #146:** Cathedral evolution documentation (+1 commit, ready)
- **PR #124:** Billing/team system (+261 commits, diverged, critical)

Additionally, recent work on `governor-bootstrap-protocol` (+89 commits) and `production-readiness-final` (+2 commits) suggests Phase 2 hardening is mature and must be assessed.

**Primary Risk:** PR #124's 261 commits represent substantial billing and team management work. If lost, we lose months of development.

**Primary Opportunity:** Many branches can be consolidated into Governor Ω's `docs/governor/` institutional memory without full merges. Methodologies, lessons, and decisions can be archived rather than kept as live executives.

---

## CONSOLIDATION STRATEGY

### Consolidation Principles

1. **Preserve First:** No branch deleted until its work is either merged, cherry-picked, or documented.
2. **Single Authority:** Only Governor Ω has executive power; other branches become knowledge/playbooks.
3. **Verify Before Merge:** All merges must pass CI; no unverified work reaches main.
4. **Document Everything:** Every decision, lesson, and playbook preserved in `docs/governor/`.
5. **Transparent Disposition:** Each branch gets a formal decision record explaining why it was merged, archived, or stopped.

### Consolidation Categories

#### Category A: IMMEDIATE MERGE (Ready to Land)
Branches with 1-2 commits, up-to-date with main, no conflicts.

- `claude/governor-omega-v2-w29yi4` (PR #148)
- `claude/cathedral-evolution-system-ku0h5l` (PR #146)
- `claude/production-readiness-final` (PR #125?)

**Action:** Review, verify CI passes, merge as-is.

#### Category B: CRITICAL PRESERVATION (Diverged, Must Be Handled)
Branches with 50+ commits, diverged from main, representing substantial work.

- `claude/repair-git-remotes-p1ez7c` (PR #124) — **261 commits**
- `claude/governor-bootstrap-protocol-h56kwb` — **89 commits**

**Action:** 
1. Analyze each commit in detail
2. Determine if work should be cherry-picked, rebased, or fully merged
3. Identify conflicts with current main
4. Plan rebase/merge strategy
5. Execute carefully with staged testing

#### Category C: ASSESS & PRESERVE (Multiple Governor variants)
Branches representing other Governor evolution phases.

- All other Governor-* branches (v2, v3, bootstrap, evolution, etc.)
- Cathedral-related branches
- Hercules-related branches

**Action:**
1. Collect latest commit from each
2. Extract useful decisions/lessons
3. Document in `docs/governor/` institutional memory
4. Stop the executive function (it's not Governor Ω)
5. Archive the branch

#### Category D: FEATURE/FIX ASSESSMENT (Individual features)
Branches for specific features or fixes.

- `feat/rate-limiter-telemetry`
- `feat/sla-violation-alerting`
- All other targeted fixes

**Action:**
1. Check if work is already on main
2. If not, assess for inclusion in Governor Ω's work stream
3. Cherry-pick or merge as appropriate
4. Stop or merge

#### Category E: SAFE ARCHIVAL (History & Backups)
Branches that are historical records or safety backups.

- `backup/main-pre-forcepush-1719dcf`

**Action:** Keep but mark read-only. Reference in DECISION_REGISTER for historical context.

---

## DETAILED CONSOLIDATION PLAN

### Phase 3a: Critical Branches (Day 1)

#### Task 3a-1: Assess PR #124 (Billing/Team — 261 commits)

**Objective:** Understand what billing/team work exists and how to integrate it.

**Steps:**
1. Fetch `origin/claude/repair-git-remotes-p1ez7c` locally
2. Analyze commits:
   - Run `git log origin/main..origin/claude/repair-git-remotes-p1ez7c --format="%h %s"` to get all 261 commit subjects
   - Group by feature area (billing, team, tests, docs, fixes)
   - Identify merge commits vs squashed work
3. Check for conflicts:
   - `git diff origin/main...origin/claude/repair-git-remotes-p1ez7c --name-only | wc -l`
   - Identify files changed and potential conflicts
4. Assess code quality:
   - Run TypeScript check on the branch
   - Run lint
   - Check test coverage
5. Decision:
   - **Option A:** Full merge (if clean and all tests pass)
   - **Option B:** Rebase onto current main (if conflicts but work is sound)
   - **Option C:** Cherry-pick critical commits (if selective merge is better)
   - **Option D:** Document and archive if work is superseded

**Output:** Decision record with chosen option and justification.

#### Task 3a-2: Assess PR #148 (Governor Ω v2 Institutional Memory — 1 commit)

**Objective:** Review Governor Ω v2.0's institutional memory system for incorporation.

**Steps:**
1. Review the commit: `git show 0c59d99`
2. Examine new files:
   - `docs/governor/README.md` — what structure does it define?
   - `docs/governor/executive/BASELINE-2026-07-16.md` — what's the baseline?
   - `docs/governor/lessons/LESSONS.md` — what lessons are documented?
   - `docs/governor/risks/RISK-REGISTER.md` — what risks are identified?
3. Assess overlap with current governance docs
4. Decision:
   - Merge as-is if structure is useful
   - Modify structure if it conflicts with Ω consolidation model
   - Incorporate content but restructure as needed

**Output:** Review decision with merged structure.

#### Task 3a-3: Assess PR #146 (Cathedral — 1 commit)

**Objective:** Review Cathedral evolution documentation.

**Steps:**
1. Review the DECISION_REGISTER update
2. Understand what DR-0021 says about Cathedral/Living Organization
3. Assess whether Cathedral deserves continued executive status or becomes a playbook/department
4. Decision: Merge the DR entry, but make clear that Cathedral is now a methodology within Ω, not an independent executive

**Output:** Merged DR entry + architecture decision.

#### Task 3a-4: Assess Governor Bootstrap (89 commits)

**Objective:** Understand what Phase 2 hardening and bootstrap work exists.

**Steps:**
1. Get latest commit: `git log origin/claude/governor-bootstrap-protocol-h56kwb -1 --format="%h %ai %s"`
2. Analyze commits: group by feature area (infrastructure, hardening, docs, tests)
3. Check for overlap with main or production-readiness-final branch
4. Determine if this is duplicate work or distinct contribution
5. Decision:
   - If distinct and valuable: merge or cherry-pick key commits
   - If overlaps with production-readiness-final: consolidate and pick one branch
   - If infrastructure work: assess for inclusion in `docs/infra/`

**Output:** Merge/cherry-pick plan or archival decision.

### Phase 3b: Governor Variants Assessment (Day 2)

**Objective:** Inventory all Governor variants and decide disposition.

**Action for each Governor variant branch:**
1. Check latest commit timestamp
2. Extract any unique decisions or lessons
3. Document in `GOVERNOR_EVOLUTION_REGISTER.md`
4. Decide: Keep as archived playbook, or stop
5. If keeping: create read-only marker in branch
6. If stopping: document reasons

**Output:** `GOVERNOR_EVOLUTION_REGISTER.md` with full history of all Governor attempts.

### Phase 3c: Feature/Fix Assessment (Day 2)

**Objective:** Triage remaining feature and fix branches.

**Action for each feature/fix branch:**
1. Check if work is already on main
2. If yes: mark as "merged elsewhere"
3. If no: assess value and conflicts
4. Decide: cherry-pick, full merge, or archive
5. Execute decision

**Output:** Updated CONSOLIDATION_INVENTORY with all decisions made.

### Phase 3d: Documentation & Authority Consolidation (Day 3)

**Objective:** Consolidate governance, decisions, and authority into single Ω structure.

**Actions:**
1. Merge or integrate all governance documentation
2. Consolidate all DECISION_REGISTER entries
3. Consolidate all RISK_REGISTER entries
4. Create final GOVERNOR_OMEGA_CONSTITUTION.md
5. Update CLAUDE.md to reflect single authority
6. Verify no conflicting guidance exists
7. Create ARCHITECTURE.md documenting Cathedral, Hercules, Living Organism as capabilities, not executives

**Output:** Single source of truth in `docs/governor/` with no conflicts.

### Phase 3e: Final Verification & Cleanup (Day 3-4)

**Objective:** Verify consolidation is complete and safe.

**Actions:**
1. CI pass: `npm run lint`, `npm run type-check`, `npm test`, `npm run build`
2. No conflicts: all merges clean
3. All work preserved: git log shows all original commits
4. All decisions documented: DECISION_REGISTER and CONSOLIDATION_REGISTER complete
5. Authority clear: only Governor Ω has executive power
6. Specialist sessions stopped: all parallel Governors archived/stopped

**Output:** Consolidation completion report ready for Founder.

---

## EXECUTION CHECKLIST

### Pre-Consolidation
- [ ] Consolidation Inventory created
- [ ] Consolidation Plan drafted
- [ ] All branches fetched and assessed
- [ ] Freeze declared on parallel sessions

### Consolidation Execution
- [ ] Task 3a-1: PR #124 assessed and merged/archived
- [ ] Task 3a-2: PR #148 reviewed and merged
- [ ] Task 3a-3: PR #146 reviewed and merged
- [ ] Task 3a-4: Governor Bootstrap assessed and merged/archived
- [ ] Governor variants inventory complete
- [ ] Feature/fix branches triaged
- [ ] All decisions documented in CONSOLIDATION_REGISTER

### Post-Consolidation
- [ ] All new work merged or cherry-picked
- [ ] `docs/governor/` contains single source of truth
- [ ] CLAUDE.md updated to reflect Governor Ω sole authority
- [ ] CI passing (lint, type-check, tests, build)
- [ ] No uncommitted changes
- [ ] No merge conflicts
- [ ] Parallel sessions marked as archived
- [ ] Founder briefed on consolidation completion

### Final Handoff
- [ ] Consolidation report created
- [ ] All evidence documented
- [ ] Next priorities clear
- [ ] Work-in-progress limit enforced (1 executive, max 2 specialized sessions)

---

## RISKS & MITIGATIONS

### Risk: Merge Conflicts in Diverged Branches
**Mitigation:** Create temporary feature branches for conflict resolution; test locally before pushing.

### Risk: Lost Work from PR #124
**Mitigation:** Preserve all 261 commits in git history; if merge fails, create separate archive branch with all commits documented.

### Risk: Parallel Executives Override Decision
**Mitigation:** Update CLAUDE.md to remove their mandates; mark all parallel constitutions as archived in docs.

### Risk: CI Failure After Consolidation
**Mitigation:** Test each merge locally; run full CI suite before pushing; stage large merges carefully.

### Risk: Confusion About Authority
**Mitigation:** Create clear FOUNDER_ACTION_REQUIRED decision board; only Governor Ω can update priority queue.

---

## SUCCESS CRITERIA

Consolidation is successful when:

1. **All branches merged or archived:** Every branch has a documented disposition
2. **All work preserved:** No commits lost; git history intact
3. **Single source of truth:** `docs/governor/` is authoritative; no conflicting guidance in other branches
4. **Single authority:** Only Governor Ω has executive power; all parallel Governors archived
5. **Clean main:** CI passing, no conflicts, production-ready
6. **Work-in-progress limit:** Only one priority stream active (Governor Ω); specialist sessions stopped
7. **Founder briefed:** Clear report on consolidation, new authority, remaining risks

---

## TIMELINE

- **Phase 1 (Complete):** Freeze declared, inventory created
- **Phase 2 (Complete):** Branches assessed, consolidation plan drafted
- **Phase 3a (Next):** Critical branches (PR #124, #148, #146, bootstrap) consolidated
- **Phase 3b (Following):** Governor variants archived, decisions preserved
- **Phase 3c (Following):** Features/fixes triaged
- **Phase 3d (Following):** Documentation consolidated, authority clarified
- **Phase 3e (Final):** Verification, cleanup, completion report
- **Phase 4:** Founder action (review, approve, deploy)

---

## NEXT IMMEDIATE ACTIONS

1. **Governor Ω (this session):** Execute Phase 3a tasks in order
   - Assess PR #124 in detail
   - Review PR #148 institutional memory
   - Review PR #146 Cathedral decision
   - Assess Governor Bootstrap

2. **All Parallel Sessions:** No new work; stand by for consolidation signals

3. **Founder:** Brief on consolidation progress at Phase 3d checkpoint

