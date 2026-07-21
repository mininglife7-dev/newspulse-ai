# Governor OS — Core Implementation

**Status:** FOUNDATIONAL (Phase 1 of Independence Mission)  
**Date:** 2026-07-19  
**Version:** 1.0.0

## Overview

Governor OS is an independent, reusable operating system for autonomous mission governance. It governs applications without knowing their domain, customer journey, or business logic.

This directory contains the core Governor OS implementation, designed to be:
- **Universal:** No application-specific code or dependencies
- **Safe:** Enforces policy before execution; prevents unauthorized actions
- **Verifiable:** Every action is audited; verification is independent from execution
- **Stable:** Versioned contracts ensure backwards compatibility
- **Transparent:** Decisions and evidence are available for review

---

## Architecture

### Core Modules

#### **contracts.ts** (1200+ lines)
Core versioned types defining Governor OS interfaces.

**Exports:**
- `MissionRequest`, `Mission` — Mission lifecycle
- `TaskRequest`, `Task` — Task lifecycle
- `AuthorityClass`, `PolicyDecision` — Authority and policy
- `ExecutionRequest`, `ExecutionResult` — Task execution
- `VerificationRequest`, `VerificationResult` — Independent verification
- `EvidenceRecord` — Append-only evidence ledger
- `EscalationEvent` — Human escalation events
- `MemoryRecord`, `LearningRecord`, `EvolutionProposal` — Memory/Learning/Evolution
- `AuditEntry` — Immutable audit trail
- Adapter interfaces: `ExecutionAdapter`, `VerificationAdapter`, `EscalationHandler`, `PolicyEngine`

**Schema Version:** 1.0.0  
**Guarantees:**
- Every type includes schema version for migration tracking
- Deterministic serialization (consistent field order)
- No secrets in records
- Backwards-compatible evolution path

---

#### **state-machine.ts** (400+ lines)
Deterministic mission and task state machines.

**Classes:**
- `MissionStateMachine` — Enforces mission lifecycle (CREATED → VALIDATED → PLANNED → AUTHORIZED → EXECUTING → VERIFYING → COMPLETED)
- `TaskStateMachine` — Enforces task lifecycle (QUEUED → RUNNING → VERIFYING → COMPLETED)

**Guarantees:**
- Invalid transitions rejected with clear error messages
- State changes audited with reason and actor
- Terminal states cannot be exited
- Preconditions enforced before transitions
- Idempotent state transitions

**State Transitions:**
```
Mission: CREATED → VALIDATED → PLANNED → AUTHORIZED → EXECUTING → VERIFYING → COMPLETED
         (can block/fail at various stages; BLOCKED can return to AUTHORIZED)

Task:    QUEUED → RUNNING → VERIFYING → COMPLETED
         (can fail/block; FAILED can retry as QUEUED)
```

**Tests:** `tests/governor/state-machine.test.ts`

---

### Architectural Boundary

See `docs/governor/GOVERNOR-OS-BOUNDARY.md` for the complete boundary definition.

**Governor OS contains:**
- ✅ Mission and task lifecycle management
- ✅ Authority envelopes and policy enforcement
- ✅ Deterministic state machines with transition rules
- ✅ Evidence ledger (append-only, hash-verified)
- ✅ Independent verification interfaces
- ✅ Memory, Learning, and Evolution (separate concepts)
- ✅ Audit and compliance records
- ✅ Adapter contracts for pluggable application behavior
- ✅ Error classification and retry bounds

**Governor OS does NOT contain:**
- ❌ Application-specific domain logic
- ❌ Customer data or user models
- ❌ Business rules or compliance frameworks
- ❌ Credentials or secrets
- ❌ UI or visualization code
- ❌ Database implementations

---

### Dependency & Coupling Analysis

See `docs/governor/GOVERNOR-OS-COUPLING-AUDIT.md` for the complete audit.

**UNIVERSAL_CORE files** (extracted from Euro AI):
- `lib/hercules-kernel.ts` — Mission/task/authority/audit core (requires refactoring)
- `lib/rollback-decision-engine.ts` — Evidence-based decision making
- `lib/knowledge-memory.ts` — Memory and learning records

**EURO_AI_ADAPTER files** (application-specific):
- `lib/governance-state.ts` — Launch readiness dashboard (Euro AI use)
- `lib/cathedral-enterprise-init.ts` — Enterprise onboarding (Euro AI feature)
- `lib/production-monitoring.ts` — Service health monitoring (Vercel-specific)
- `lib/feature-flag-controller.ts` — Feature flag management
- `lib/git-governance.ts` — GitHub workflow enforcement

**MIXED_REQUIRES_SPLIT files** (need refactoring):
- `lib/deployment-verification.ts` — Universal verification types + Vercel/Supabase adapters
- `lib/autonomous-remediation.ts` — Universal remediation framework + web-app-specific actions
- `lib/incident-orchestration.ts` — Universal incident lifecycle + founder escalation logic
- `lib/incident-detection.ts` — Universal signal matching + app-specific metrics

---

## Usage Examples

### 1. Creating a Mission

```typescript
import { MissionStateMachine } from '@/lib/governor/state-machine';
import type { MissionRequest } from '@/lib/governor/contracts';

const request: MissionRequest = {
  schemaVersion: '1.0.0',
  title: 'Deploy to Production',
  description: 'Deploy application to production servers',
  objectives: ['Deploy code', 'Run smoke tests', 'Verify traffic'],
  successCriteria: ['Deployment succeeds', 'All smoke tests pass', 'Traffic metrics normal'],
  contextId: 'org_12345', // Application context
  requestedBy: 'deployer_user',
  requestedAt: new Date().toISOString(),
};

const mission: Mission = {
  schemaVersion: '1.0.0',
  id: 'mission_' + Date.now(),
  state: 'CREATED',
  request,
  createdAt: new Date().toISOString(),
  tasks: [],
  evidence: [],
  audit: [],
};

const sm = new MissionStateMachine(mission);

// Validate mission
await sm.transitionTo('VALIDATED', 'Mission request validated', 'validator');

// Plan mission (create tasks)
mission.tasks = ['task_001', 'task_002'];
await sm.transitionTo('PLANNED', 'Tasks created', 'planner');
```

### 2. Checking Policy & Executing Task

```typescript
const policyEngine = new PolicyEngine();

// Evaluate policy
const decision = await policyEngine.evaluatePolicy(task, 'A_AUTONOMOUS');

if (decision.decision === 'ALLOW') {
  // Execute through adapter
  const adapter: ExecutionAdapter = /* application provides */;
  const result = await adapter.execute({
    taskId: task.id,
    policyDecision: decision,
    task,
  });

  // Task transitions to VERIFYING
  await taskSm.transitionTo('VERIFYING', 'Execution complete', 'executor', {
    executionResult: result,
  });
} else if (decision.decision === 'ESCALATE') {
  // Task cannot execute; requires human approval
  const escalationHandler: EscalationHandler = /* application provides */;
  await escalationHandler.handle({
    id: 'esc_' + Date.now(),
    taskId: task.id,
    reason: decision.decision,
    evidence: decision.evidence,
    authority: decision.authority,
    severity: 'HIGH',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  });
}
```

### 3. Verifying Task Success

```typescript
// Independent verification (separate from execution)
const verifyAdapter: VerificationAdapter = /* application provides */;
const verificationResult = await verifyAdapter.verify({
  schemaVersion: '1.0.0',
  taskId: task.id,
  intendedTask: task,
  executionResult: result,
  evidence: evidence_records,
  successCriteria: task.request.successCriteria,
});

if (verificationResult.status === 'VERIFIED') {
  await taskSm.transitionTo('COMPLETED', 'Task verified', 'verifier', {
    verificationResult,
  });
} else if (verificationResult.status === 'FAILED_VERIFICATION') {
  await taskSm.transitionTo('FAILED', 'Verification failed', 'verifier', {
    failureReason: verificationResult.reasoning,
  });
}
```

### 4. Recording Evidence

```typescript
const evidence: EvidenceRecord = {
  schemaVersion: '1.0.0',
  id: 'evidence_' + Date.now(),
  missionId: mission.id,
  taskId: task.id,
  type: 'deployment-log',
  source: 'ci-run-12345',
  content: '... deployment output ...',
  contentHash: sha256('... deployment output ...'),
  collectedAt: new Date().toISOString(),
  producer: 'ci-system',
  relationship: 'proves-deployment-succeeded',
  sensitivity: 'INTERNAL',
  isRedacted: false,
  provenance: 'ci-run-12345 → task → mission',
  tags: ['deployment', 'production', 'verified'],
};

mission.evidence.push(evidence.id);
```

---

## Key Guarantees

### 1. Policy Before Execution
No task can execute without an explicit `PolicyDecision` with `decision: 'ALLOW'`.

```typescript
if (!policyDecision || policyDecision.decision !== 'ALLOW') {
  throw new Error('ACTION_NOT_AUTHORIZED');
}
await adapter.execute(request); // Only if authorized
```

### 2. Verification Independent from Execution
The verifier receives only:
- The intended task
- The execution result
- The evidence provided
- Success criteria

The verifier cannot access:
- Execution logs
- Internal system state
- Secrets or credentials

### 3. Audit Trail is Immutable
Every state change, policy decision, execution, verification, and escalation is recorded:

```typescript
const audit: AuditEntry = {
  schemaVersion: '1.0.0',
  id: 'audit_' + Date.now(),
  timestamp: new Date().toISOString(),
  correlationId: mission.id,
  action: 'mission.state_changed',
  actor: 'system',
  authority: 'A_AUTONOMOUS',
  result: 'SUCCESS',
  evidence: ['mission_' + mission.id],
  metadata: { previousState: 'VALIDATED', newState: 'PLANNED' },
};
```

### 4. Evidence Integrity
Every evidence record includes:
- Content hash (SHA256) for bitrot detection
- Provenance chain
- Redaction metadata (secrets can be redacted without losing record)
- Source and producer tracking

### 5. No Silent Escalations
Escalated actions remain pending until explicitly approved by a human. No timeout-based auto-approval.

---

## Testing

### State Machine Tests
```bash
npm test -- tests/governor/state-machine.test.ts
```

Covers:
- ✅ Valid transitions succeed
- ✅ Invalid transitions rejected
- ✅ State changes are audited
- ✅ Terminal states cannot exit
- ✅ Preconditions enforced
- ✅ Retry logic correct
- ✅ Blocking and failure handling

### Integration Tests (in progress)
- Policy engine with actual adapters
- Evidence collection and verification
- Memory/Learning/Evolution lifecycle
- Audit trail completeness

---

## Future Work (Post-Refactoring)

### Phase 2: Adapter Implementations
- `lib/governor/adapters/execution-base.ts` — Base execution adapter
- `lib/governor/adapters/verification-base.ts` — Base verification adapter
- Applications (Euro AI, Vajra, Hermes) implement concrete adapters

### Phase 3: Persistence Layer
- Database-backed mission/task storage
- Audit log persistence
- Evidence ledger in append-only storage
- State machine recovery from checkpoints

### Phase 4: Learning & Evolution
- Learning rule extraction from verified evidence
- Evolution proposal workflow
- Automated learning approval (configurable risk thresholds)
- Conflict detection between competing learning

### Phase 5: Distributed Governance
- Multi-agent coordination
- Distributed policy evaluation
- Cross-system escalation
- Shared audit log federation

---

## References

- **Boundary Definition:** `docs/governor/GOVERNOR-OS-BOUNDARY.md`
- **Coupling Audit:** `docs/governor/GOVERNOR-OS-COUPLING-AUDIT.md`
- **Constitution:** `GOVERNOR_CONSTITUTION.md` (repository root)
- **Memory Kernel:** `AGENTS.md` (repository root)

---

## Maintenance

### Adding New States
1. Update `MissionState` or `TaskState` types in `contracts.ts`
2. Add transitions to `VALID_MISSION_TRANSITIONS` or `VALID_TASK_TRANSITIONS` in `state-machine.ts`
3. Add precondition rules to `MISSION_STATE_RULES` or `TASK_STATE_RULES`
4. Add state-specific handling in `transitionTo()` methods
5. Add tests for new transitions and preconditions

### Schema Evolution
- Bump `GOVERNOR_SCHEMA_VERSION` only when changing contract structure
- Add migration function in `contracts.ts`
- Update tests to verify backwards compatibility
- Document migration in commit message

### Adding New Evidence Types
- No changes to Governor OS needed; applications define types
- Use `type: string` in `EvidenceRecord.type`
- Document expected types in application adapter contracts

---

## License & Attribution

Part of Governor OS, a reusable autonomous mission governance framework developed for Euro AI compliance platform.

