# Governor OS — Coupling & Dependency Audit

**Analysis Date:** 2026-07-19T15:30:00Z  
**Analyst:** Governor Ω (Principal Systems Architect)  
**Scope:** Dependency classification for Governor OS independence  
**Mission:** Extract Governor OS as a reusable, application-neutral operating system  
**Status:** IN PROGRESS

---

## Executive Summary

Governor OS is currently **embedded within Euro AI** as a collection of loosely-coupled modules implementing governance concepts: Mission, Authority, Task, Evidence, Verification, Memory, Learning, and Evolution. The audit classifies ~25 files into 4 categories:

- **UNIVERSAL_CORE** (8 files): Application-neutral governance abstractions
- **EURO_AI_ADAPTER** (9 files): Euro AI–specific integrations and implementations
- **MIXED_REQUIRES_SPLIT** (5 files): Hybrid files needing refactoring
- **EXPERIMENTAL / DEPRECATED** (3 files): Not yet production-ready or superseded

**Critical Finding:** The Hercules Kernel (lib/hercules-kernel.ts) is the strongest UNIVERSAL_CORE candidate but requires:
1. Removal of 'Enterprise' concept (application-specific)
2. Addition of explicit PolicyDecision and VerificationResult types
3. Stronger state-machine enforcement (prevent invalid transitions)
4. Independent verification interfaces separate from execution

---

## File Classification Matrix

### UNIVERSAL_CORE — Application-Neutral Governor OS Foundation

These files implement pure governance concepts usable by any application.

#### 1. **lib/hercules-kernel.ts** (770 lines)

**Purpose:** Mission, Task, Authority, and Audit lifecycle management.

**Concepts Exported:**
- `AuthorityClass`: A_AUTONOMOUS | B_GUARDRAILS | C_FOUNDER_ONLY
- `Mission`, `Task`, `Objective`: Lifecycle entities
- `HerculesEvent`: Correlation-tracked event system
- `AuthorityRule`, `AuditEntry`: Policy and audit
- `HealthScore`: System health aggregation

**Current Imports:**
- None (only `crypto.UUID` type, unused)

**External Dependencies:**
- None in production

**Euro AI Coupling:**
- `Enterprise` interface: Specific to Euro AI multi-tenancy model
- `enterpriseId` fields throughout: Requires refactoring to `contextId` or `governanceId`
- `objectives: Objective[]` in Enterprise: Euro AI detail, not Governor-essential

**Proposed Status:** **UNIVERSAL_CORE** (minor refactoring needed)

**Risks:**
- Singleton pattern (`getInstance()`) prevents multiple independent instances
- State stored in-memory only — no persistence interface
- Authority matrix is hard-coded, not pluggable

**Extraction Notes:**
- Rename `Enterprise` → `GovernanceContext`
- Extract authority matrix to pluggable interface
- Add persistence adapters (if/when needed)
- Add type versioning to all exported types

---

#### 2. **lib/deployment-verification.ts** (538 lines)

**Purpose:** Evidence-based deployment verification (PASS/FAIL/RETRY logic).

**Concepts Exported:**
- `VerificationEvidence`: Evidence record with source, type, status
- `DeploymentVerificationReport`: Aggregated verification result
- `VerificationStatus`: PASS | PARTIAL | FAIL | UNKNOWN
- `VerificationCriteria`: Success rules (threshold-based)

**Current Imports:**
- None specific to Euro AI

**External Dependencies:**
- None explicit

**Euro AI Coupling:**
- File path references: `app/api/*`, `supabase/*` (hardcoded)
- Vercel-specific checks: deployment state via Vercel client
- Supabase-specific checks: database schema validation

**Proposed Status:** **MIXED_REQUIRES_SPLIT**

**Extraction Strategy:**
- Keep `VerificationEvidence`, `VerificationStatus`, `VerificationCriteria` as UNIVERSAL_CORE
- Move Vercel/Supabase/Github checks to EURO_AI_ADAPTER
- Define `VerificationAdapter` interface for pluggable checkers

---

#### 3. **lib/rollback-decision-engine.ts** (502 lines)

**Purpose:** Evidence-based rollback decisions using structured signal analysis.

**Concepts Exported:**
- `RollbackDecision`: Evidence-based decision with confidence scoring
- `DecisionEvidence`: Weighted signals (0-1 contribution)
- `RollbackPolicy`: Bounded retries, cooldowns, loop prevention
- `RollbackState`: State machine (pending → verifying → completed)

**Current Imports:**
- `deployment-verification.ts` (internal types)

**External Dependencies:**
- None

**Euro AI Coupling:**
- Assumes Git/Deployment context (deploymentId, previousDeploymentId)
- References rollback as Git-centric operation

**Proposed Status:** **UNIVERSAL_CORE** (minor abstraction refinement)

**Extraction Notes:**
- `RollbackDecision` should be renamed to `PolicyDecision` (more general)
- `DecisionEvidence` is exactly what Governor OS needs for evidence-based governance
- Loop detection and cooldown logic are universal

---

#### 4. **lib/autonomous-remediation.ts** (664 lines)

**Purpose:** Detect failures and apply bounded, auditable, reversible fixes.

**Concepts Exported:**
- `RemediationAction`: Bounded set of safe actions
- `ActionClassification`: safe-autonomous | reversible | founder-gated | prohibited
- `FailureCategory`: Classification of detected failures
- `RemediationAttempt`: Before/after state, evidence, result

**Current Imports:**
- None specific to application

**External Dependencies:**
- None explicit

**Euro AI Coupling:**
- Hardcoded failure categories (unhealthy-service, failed-deployment, error-rate-spike) — specific to web apps
- Service restart logic — application-specific
- Example remediations assume web service architecture

**Proposed Status:** **MIXED_REQUIRES_SPLIT**

**Extraction Strategy:**
- Keep `ActionClassification` and `RemediationAttempt` as UNIVERSAL_CORE
- Move specific failure detectors and actions to EURO_AI_ADAPTER
- Define `FailureDetector` and `Remediator` interfaces for adaptation

---

#### 5. **lib/incident-orchestration.ts** (436 lines)

**Purpose:** Track incidents, coordinate responses, escalate to Founder.

**Concepts Exported:**
- `Incident`: State machine (detected → investigating → resolved → closed)
- `IncidentResponse`: Evidence-based response decision
- `EscalationRule`: When/how to escalate to humans
- `IncidentCoordinator`: Orchestration logic

**Current Imports:**
- `incident-detection.ts`

**External Dependencies:**
- None explicit

**Euro AI Coupling:**
- Hardcoded incident types (deployment, database, API)
- Founder escalation assumes specific organization (Anne Catherine, Lalit)

**Proposed Status:** **MIXED_REQUIRES_SPLIT**

**Extraction Strategy:**
- Keep `Incident`, `IncidentResponse`, `EscalationRule` core types as UNIVERSAL_CORE
- Move incident-type detection to EURO_AI_ADAPTER
- Remove hardcoded founder references; use escalation callbacks instead

---

#### 6. **lib/incident-detection.ts** (444 lines)

**Purpose:** Detect operational failures from signals.

**Concepts Exported:**
- `HealthSignal`: Named metric with value, threshold, status
- `IncidentDetector`: Pattern matching over signals
- Detection rules: Unhealthy service, failed deployment, error spike, stalled job, degraded latency

**Current Imports:**
- None

**External Dependencies:**
- None

**Euro AI Coupling:**
- Metric names hard-coded (response_time, error_rate, deployment_status)
- Thresholds tuned for web applications

**Proposed Status:** **MIXED_REQUIRES_SPLIT**

**Extraction Strategy:**
- Keep `HealthSignal` and pattern-matching logic as UNIVERSAL_CORE
- Move metric definitions and thresholds to EURO_AI_ADAPTER
- Define `HealthMetric` interface for pluggable metrics

---

#### 7. **types/governance.ts** (124 lines)

**Purpose:** Governance dashboard state model for Euro AI launch readiness tracking.

**Actual Exports:**
- `BlockerStatus`, `MissionStatus`, `GoNoGoState`, `HealthStatus`: Generic enum types ✓
- `CategoryScore`: Launch category scoring (name, mainScore, currentScore, targetScore, owner)
- `LaunchBlocker`: Launch blocker (id: M-01, blocksStage: blocking|demo|mvp|post_launch)
- `Mission`: Launch mission (id: V2-1, impactScore, effortEstimate, owner)
- `DashboardState`: Launch readiness dashboard (launchReadiness %, customerReadiness %, pilotReadiness %)
- `DashboardError`, `DashboardResponse`: Error handling

**Current Imports:**
- None

**External Dependencies:**
- None

**Euro AI Coupling:**
- **HEAVY:** All domain concepts are Euro AI–specific:
  - `LaunchBlocker.blocksStage`: Demo vs MVP vs post-launch — specific to Euro AI customer journey
  - `Mission` format (V2-1): Specific to Euro AI roadmap numbering
  - `CategoryScore`: Euro AI category hierarchy (Customer, Pilot, Engineering, Security, Deployment)
  - `DashboardState` structure: Launch-centric metrics (customerReadiness, pilotReadiness, engineeringReadiness)
  - `criticalGates`: Build, CI, deployment gates — specific to CI/CD pipeline

**Proposed Status:** **EURO_AI_ADAPTER** (NOT Governor OS core)

**Action:** 
- Move entire file to Euro AI; these types model a specific product launch, not governance
- Governor OS should define generic types: `Evidence`, `PolicyDecision`, `VerificationResult`, `EscalationEvent`
- Euro AI can build `DashboardState` as a view over Governor OS core concepts

---

#### 8. **lib/knowledge-memory.ts** (238 lines)

**Purpose:** Session-scoped knowledge memory (what was learned this session).

**Concepts:**
- `MemoryRecord`: What happened (event + outcome)
- `LearningRecord`: Generalized from evidence (if X → then Y)
- Distinction between Memory and Learning

**Current Imports:**
- None specific to application

**External Dependencies:**
- None

**Euro AI Coupling:**
- Session-scoped only; no persistence

**Proposed Status:** **UNIVERSAL_CORE** (minor enhancement)

**Extraction Notes:**
- Add persistence interface
- Separate Memory (observational) from Learning (predictive)
- Ensure no secrets stored

---

### EURO_AI_ADAPTER — Application-Specific Integrations

These files implement Euro AI's use of Governor OS.

#### 1. **lib/governance-state.ts** (819 lines)

**Purpose:** Build canonical governance dashboard state for Euro AI compliance tracking.

**Imports:**
- `types/governance.ts`
- Hardcoded reference to EURO AI blockers, missions, categories

**Concepts:**
- `DashboardState`, `LaunchBlocker`, `CategoryScore`, `GoNoGoState`
- Specific to EURO AI customer journey (customer readiness, compliance readiness)

**Dependencies:**
- Supabase schema knowledge (table names, RLS policies)
- Mission/blocker definitions specific to EURO AI roadmap

**Proposed Status:** **EURO_AI_ADAPTER**

**Action:**
- Keep in Euro AI
- Create interface `GovernanceStateBuilder` in Governor OS
- Have Euro AI implement it

---

#### 2. **lib/cathedral-enterprise-init.ts** (474 lines)

**Purpose:** Initialize a complete enterprise system (Cathedral pattern).

**Concepts:**
- Enterprise setup, database schema, isolation layers
- Specific to EURO AI multi-tenancy model

**Imports:**
- Supabase, environment variables
- Hardcoded for EURO AI

**Proposed Status:** **EURO_AI_ADAPTER**

**Action:**
- Keep in Euro AI
- Define `SystemInitializer` interface in Governor OS
- Have Euro AI implement it

---

#### 3. **lib/production-monitoring.ts** (425 lines)

**Purpose:** Monitor production system health and detect anomalies.

**Concepts:**
- Service health, error rate, latency, deployment status
- Specific to web applications running on Vercel

**Imports:**
- Vercel API, Supabase
- Environment-specific

**Proposed Status:** **EURO_AI_ADAPTER**

**Action:**
- Define `HealthMonitor` interface in Governor OS
- Have Euro AI implement it

---

#### 4. **lib/deployment-verification.ts** (partial)

**Vercel-specific checks:**
- `verifyVercelDeployment()`: Check Vercel API status
- `verifyApplicationCode()`: Build/test verification

**Supabase-specific checks:**
- `verifySupabaseSchema()`: Database schema validation
- `verifySupabaseRLS()`: Row-Level Security policies

**Proposed Status:** **EURO_AI_ADAPTER** (split from universal verification types)

---

#### 5. **lib/production-wiring.ts** (374 lines)

**Purpose:** Wire production services (Supabase, Vercel, Claude API).

**Concepts:**
- Environment variable injection
- Service credential management
- Vercel/Supabase client setup

**Imports:**
- Supabase, Vercel, Claude API

**Proposed Status:** **EURO_AI_ADAPTER**

---

#### 6. **lib/feature-flag-controller.ts** (356 lines)

**Purpose:** Feature flag management specific to Euro AI.

**Imports:**
- Supabase (store flags in DB)
- Hardcoded flag names

**Proposed Status:** **EURO_AI_ADAPTER**

---

#### 7. **lib/customer-retention.ts** (618 lines)

**Purpose:** Predict and prevent customer churn.

**Proposed Status:** **EURO_AI_ADAPTER** (business logic, not governance)

---

#### 8. **lib/deployment-canary.ts** (417 lines)

**Purpose:** Canary deployment orchestration specific to Vercel.

**Proposed Status:** **EURO_AI_ADAPTER**

---

#### 9. **lib/git-governance.ts** (338 lines)

**Purpose:** Git and GitHub workflow enforcement.

**Imports:**
- GitHub API
- Hardcoded repository expectations

**Proposed Status:** **EURO_AI_ADAPTER** (may extract lightweight governance concepts later)

---

### MIXED_REQUIRES_SPLIT — Hybrid Files Needing Refactoring

#### 1. **lib/incident-orchestration.ts**

**Current State:** Mixes universal incident lifecycle with Euro AI escalation.

**Action:**
- Extract `Incident` state machine → UNIVERSAL_CORE
- Extract founder-hardcoded escalation → EURO_AI_ADAPTER
- Define `EscalationHandler` interface

---

#### 2. **lib/autonomous-remediation.ts**

**Current State:** Mixes universal remediation framework with web-app-specific actions.

**Action:**
- Extract `ActionClassification`, `RemediationAttempt` → UNIVERSAL_CORE
- Move specific failure detectors to EURO_AI_ADAPTER
- Define `FailureDetector`, `RemediationAction` interfaces

---

#### 3. **lib/deployment-verification.ts**

**Current State:** Mixes universal verification concepts with Vercel/Supabase details.

**Action:**
- Extract `VerificationEvidence`, `VerificationStatus` → UNIVERSAL_CORE
- Move Vercel/Supabase checks to EURO_AI_ADAPTER
- Define `VerificationChecker` interface

---

#### 4. **lib/incident-detection.ts**

**Current State:** Mixes universal signal matching with app-specific metrics.

**Action:**
- Extract signal matching logic → UNIVERSAL_CORE
- Move metric definitions to EURO_AI_ADAPTER
- Define `HealthMetric`, `SignalMatcher` interfaces

---

#### 5. **types/governance.ts**

**Status:** TBD (read full file first)

---

### EXPERIMENTAL / DEPRECATED — Not Yet Integrated

#### 1. **lib/hercules-persistence.ts**

**Purpose:** Persist Hercules Kernel state to database.

**Status:** EXPERIMENTAL — Not yet integrated into main flow

**Action:** Keep in separate branch; integrate when needed

---

#### 2. **lib/session-knowledge-memory.ts**

**Purpose:** Similar to knowledge-memory but session-scoped.

**Status:** EXPERIMENTAL — Redundancy with knowledge-memory.ts

**Action:** Consolidate or clarify distinction

---

#### 3. **lib/ceis/** (multiple files)

**Purpose:** Compliance & Evidence Intelligence System (custom LLM analysis).

**Status:** EURO_AI_SPECIFIC — Compliance framework for EU AI Act

**Action:** Keep in Euro AI; define adapter interface if needed

---

## Dependency Graph

```
UNIVERSAL_CORE
├── hercules-kernel.ts
│   ├── Exports: Mission, Task, Authority, Event, Audit
│   └── Imports: (none)
│
├── rollback-decision-engine.ts
│   ├── Exports: RollbackDecision, DecisionEvidence, RollbackPolicy
│   └── Imports: deployment-verification.ts
│
├── deployment-verification.ts (UNIVERSAL types only)
│   ├── Exports: VerificationEvidence, VerificationStatus
│   └── Imports: (none)
│
├── autonomous-remediation.ts (UNIVERSAL types only)
│   ├── Exports: ActionClassification, RemediationAttempt
│   └── Imports: (none)
│
├── incident-orchestration.ts (UNIVERSAL types only)
│   ├── Exports: Incident, IncidentResponse, EscalationRule
│   └── Imports: (none)
│
├── incident-detection.ts (UNIVERSAL patterns only)
│   ├── Exports: HealthSignal, DetectionPattern
│   └── Imports: (none)
│
├── knowledge-memory.ts
│   ├── Exports: MemoryRecord, LearningRecord
│   └── Imports: (none)
│
└── types/governance.ts (UNIVERSAL types only)
    └── TBD

EURO_AI_ADAPTER (depends on UNIVERSAL_CORE)
├── governance-state.ts
├── cathedral-enterprise-init.ts
├── production-monitoring.ts
├── production-wiring.ts
├── feature-flag-controller.ts
├── deployment-canary.ts
├── git-governance.ts
├── customer-retention.ts
└── CEIS-related modules

MIXED_REQUIRES_SPLIT (TBD)
├── deployment-verification.ts (App-specific checkers)
├── autonomous-remediation.ts (App-specific detectors)
├── incident-orchestration.ts (App-specific escalation)
├── incident-detection.ts (App-specific metrics)
└── types/governance.ts (may have Euro-specific types)
```

---

## Extraction Risk Analysis

| Module | Risk | Mitigation |
|--------|------|-----------|
| hercules-kernel.ts | Singleton pattern limits multi-instance use | Refactor to injectable factory |
| Types in types/governance.ts | May contain Euro-specific fields | Audit and split; UNIVERSAL only |
| deployment-verification.ts | Assumes Vercel/Supabase | Extract adapter interface for checkers |
| autonomous-remediation.ts | Assumes web-app architecture | Extract base types; move actions to adapter |
| incident-orchestration.ts | Founder escalation hardcoded | Replace with callback-based escalation |
| knowledge-memory.ts | No persistence | Add interface; implement in apps as needed |

---

## Refactoring Sequence

1. **Phase 1:** Audit types/governance.ts; classify all types
2. **Phase 2:** Split deployment-verification.ts (universal types → Governor OS; Vercel/Supabase → Euro AI)
3. **Phase 3:** Split incident-detection.ts (patterns → Governor OS; metrics → Euro AI)
4. **Phase 4:** Refactor hercules-kernel.ts (singleton → factory; Enterprise → GovernanceContext)
5. **Phase 5:** Define adapter interfaces (VerificationAdapter, RemediationAdapter, EscalationHandler)
6. **Phase 6:** Extract UNIVERSAL_CORE into lib/governor/
7. **Phase 7:** Create roadmap for separate Governor OS repository

---

## Remaining Investigations

- [ ] Read full types/governance.ts and classify every type
- [ ] Audit all test files for coupling patterns
- [ ] Check app/api/* routes for direct kernel dependencies
- [ ] Identify all Supabase schema assumptions in Governor code
- [ ] Document all hardcoded founder/customer references

---

## Next Steps

1. Complete this audit (read types/governance.ts fully)
2. Create GOVERNOR-OS-BOUNDARY.md (what belongs in/out of Governor OS)
3. Design versioned core contracts (Objective 4)
4. Refactor embedded code using adapter pattern
5. Create extraction roadmap (Objective 13)

