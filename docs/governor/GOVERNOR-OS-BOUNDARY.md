# Governor OS — Constitutional Boundary

**Version:** 1.0  
**Date:** 2026-07-19  
**Author:** Governor Ω (Principal Systems Architect)  
**Status:** FOUNDATIONAL (governs all extraction work)

---

## Preamble

Governor OS governs applications. It does not know the application's domain, customer journey, compliance requirements, or business logic. Governor OS knows only:

- What mission was authorized
- What actions are permitted
- What evidence is required
- What was executed
- Whether execution succeeded
- Whether verification is independent
- When escalation is mandatory
- What should be remembered
- What should be learned
- How future behavior should improve

This document defines the precise architectural boundary between Governor OS (reusable, application-neutral) and applications (Euro AI, Vajra, Hermes, or future systems).

---

## GOVERNOR OS SHALL CONTAIN

### 1. Mission Lifecycle & State Machine

**Included:**
- Mission creation, validation, authorization
- Task lifecycle (QUEUED → RUNNING → VERIFYING → COMPLETED | FAILED | CANCELLED)
- Invalid transition prevention (e.g., cannot skip VERIFYING before COMPLETED)
- State change auditing with immutable records
- Timestamped progression (createdAt, startedAt, completedAt)
- Unique deterministic mission IDs with schema versioning

**Excluded:**
- Application-specific mission types (e.g., "Customer Journey Verification", "EU Migration")
- Business-logic mission validation (e.g., "Cannot run this mission until deployment is green")
- Application domain concepts (e.g., product launch phases)

**Rationale:** The lifecycle is universal. What the mission *does* is application-specific.

---

### 2. Authority Envelopes & Policy Enforcement

**Included:**
- Define authority classes (e.g., A_AUTONOMOUS, B_GUARDRAILS, C_FOUNDER_ONLY)
- Policy decision engine: given an action and authority, return ALLOW | DENY | ESCALATE | REQUIRE_EVIDENCE | REQUIRE_APPROVAL
- Authority matrix: which actions require which authority
- Pluggable authority evaluation (so applications can define custom authority rules)
- Audit trail of every authority decision (action, result, who decided, when)
- Explicit separation: policy decision must come *before* execution; execution cannot bypass policy

**Excluded:**
- Application-specific actions (e.g., "push to production", "delete customer data")
- Business rules (e.g., "can only deploy between 10am-2pm")
- Role-based access control (RBAC) systems (applications implement RBAC; Governor OS just enforces decisions)

**Rationale:** The framework is universal. The rules are application-specific.

---

### 3. Execution Interfaces & Adapters

**Included:**
- `ExecutionAdapter`: Interface that applications implement to execute tasks
  - Input: structured `ExecutionRequest` (task ID, parameters, evidence requirements)
  - Output: structured `ExecutionResult` (success/failure, output, evidence provided)
  - Guarantee: adapter returns deterministically; no side effects if task not authorized
- `ToolAdapter`: Interface for external tool integration (filesystem, shell, GitHub, browser, etc.)
  - Each adapter declares: capabilities, side effects, required authority, input sanitization rules
  - No adapter has unrestricted access
- Idempotency support: same request with same ID can be executed multiple times safely

**Excluded:**
- Specific tool implementations (Governor OS doesn't implement GitHub API, shell execution, etc.)
- Application-specific task types
- Business logic (applications orchestrate tasks; Governor OS just coordinates)

**Rationale:** Governor OS defines the contract. Applications implement the execution.

---

### 4. Evidence Ledger — Append-Only, Deterministic

**Included:**
- Evidence record structure: ID, mission ID, task ID, type, source, timestamp, content-hash, producer, relationship to success criteria, sensitivity classification, verification status, provenance, redaction status
- Append-only guarantee at logical level (no mutation or deletion after creation)
- Evidence integrity: content-hash prevents tampering (bitrot detection)
- Redaction support: secrets can be redacted without evidence loss (redaction metadata preserved)
- Deduplication: detect and mark duplicate/stale/unrelated evidence
- Contradiction detection: flag evidence that contradicts other evidence
- No secrets allowed in raw evidence (pre-collection validation)

**Excluded:**
- Application-specific evidence types (e.g., "deployment screenshot", "customer signup email")
- Evidence interpretation (e.g., "this test output proves feature X works")
- Evidence *requirements* by task type (applications specify what evidence they need for each task)

**Rationale:** The structure and integrity model are universal. The content is application-defined.

---

### 5. Independent Verification

**Included:**
- Verification request: task ID, execution result, evidence supplied
- Verification logic: compare intended task with what actually happened; check for contradictions, missing evidence, stale evidence
- Verification results: VERIFIED | PARTIALLY_VERIFIED | UNVERIFIED | CONTRADICTED | FAILED_VERIFICATION
- Explicit separation: execution and verification must be logically independent
  - A verifier can report "task executed but we can't prove it succeeded"
  - Verifier cannot access execution logs directly; only evidence provided
- Adversarial verification support: given contradictory claims, verifier must flag for human review
- Rollback/containment assessment: if task failed, was harm contained?

**Excluded:**
- Application-specific success criteria (applications define what counts as success for each task)
- Domain-specific verification (applications implement verifiers for their domain)
- Verification *procedures* (applications describe how to verify; Governor OS enforces that verification happened)

**Rationale:** The framework is universal. The criteria are application-specific.

---

### 6. Memory, Learning, & Evolution (Separate Concepts)

**Memory:**
- Record objective facts: what mission was requested, what task was executed, what evidence was collected, what the result was
- No inference, no generalization
- Auditable, timestamped
- Tied to specific mission/task IDs
- Used for accountability and debugging

**Learning:**
- Generalized patterns from verified evidence: "when X happens, Y is likely to follow"
- Requires verified outcomes (cannot learn from unverified results)
- Must include source evidence links (auditable)
- Explicit approval before learning enters policy (no silent policy mutation)
- Can conflict with existing learning (must flag for review)

**Evolution:**
- Proposal to change policies, strategies, or capabilities based on evidence
- Requires: expected benefit, risk assessment, reversibility plan, validation plan
- Must link to source lessons
- Requires explicit approval (no automatic constitutional change)
- Rolled back if validation fails

**Included in Governor OS:**
- Structures for Memory, Learning, Evolution records
- Separation enforced at storage layer (cannot accidentally blend)
- Audit trail proving which learning was approved when
- Rollback support for evolution proposals

**Excluded:**
- Application-specific learning rules
- Business-logic policy mutations
- Domain-specific evolution strategies

**Rationale:** The framework and separation are universal. The content is application-defined.

---

### 7. Escalation Rules & Handlers

**Included:**
- Define escalation conditions: which actions or failures require human decision
- Escalation event structure: action, reason, evidence, required authority, escalation path
- Escalation tracking: PENDING → ACKNOWLEDGED → RESOLVED | REJECTED
- Escalation callback interface: applications implement `EscalationHandler` to notify humans
- Escalation audit trail: who decided, when, evidence provided, approval/rejection
- Guarantee: no escalated action executes until explicit approval (never timeout-approved)

**Excluded:**
- Specific escalation targets (who the human is)
- Notification mechanisms (email, Slack, SMS)
- Business logic for escalation decisions (applications define when to escalate)

**Rationale:** The framework is universal. The destinations are application-specific.

---

### 8. Audit & Compliance Records

**Included:**
- Immutable audit log: every decision, execution, verification, escalation
- Audit entry: timestamp, actor, action, authority required, authority granted, result, reason, evidence
- Auditability guarantee: logs survive service restart; cannot be deleted or modified
- Audit query interface: retrieve by date range, action type, authority class, actor, result
- Compliance support: prove which actions were authorized and by whom
- Correlation IDs: trace request through mission → task → execution → verification

**Excluded:**
- Specific audit queries (applications build reports from raw audit data)
- Compliance interpretation (applications determine if audit satisfies regulations)
- Long-term retention (applications decide how long to keep archives)

**Rationale:** The structure is universal. The interpretation is application-specific.

---

### 9. Error & Failure Classification

**Included:**
- Deterministic error types: ActionNotAuthorized, EvidenceMissing, VerificationFailed, EscalationPending, InvalidStateTransition, PolicyViolation, DependencyUnmet
- Failure categorization: transient (retry-able) vs permanent (requires human decision)
- Loop-prevention logic: detect and prevent infinite retry loops
- Bounded retry policy: max retries, exponential backoff, cooldown periods

**Excluded:**
- Application-specific error handling (applications decide what to do with each error type)
- Business-logic error recovery (applications implement recovery strategies)

**Rationale:** The taxonomy and safety rules are universal. The response is application-specific.

---

### 10. Configuration & Contracts

**Included:**
- Versioned type contracts (every type has schema version for migration)
- Deterministic serialization (JSON with consistent field order)
- Stable identifiers (IDs don't change, new entities get new IDs)
- Validated at serialization/deserialization boundaries (schema version matching)
- Backwards-compatibility strategy (specify which changes are safe, which require new version)
- Runtime type validation where appropriate (strict TypeScript, validation at I/O boundaries)

**Excluded:**
- Application configuration (environment variables, feature flags, business rules)
- Custom serialization formats

**Rationale:** The framework is universal. The configuration is application-specific.

---

## GOVERNOR OS SHALL NOT CONTAIN

### Application-Specific Domain Logic

**Examples of exclusions:**
- EU AI Act compliance assessment logic
- Customer onboarding workflows
- Billing and payment logic
- Marketing and retention strategies
- Feature-specific business rules
- Customer or user data models
- Reporting or analytics logic

**Rationale:** Applications embed these. Governor OS is task-agnostic.

---

### Application Credentials & Secrets

**Exclusions:**
- Database credentials (applications provide connection strings)
- API keys (applications inject keys into adapters)
- OAuth tokens (applications manage token refresh)
- SSL certificates (applications handle HTTPS)

**Rationale:** Secrets never appear in logs or Governor OS code. Applications manage secrets in their own secure vault.

---

### Production Environment Configuration

**Exclusions:**
- Deployment targets (Vercel, AWS, GCP)
- Database selection (Supabase, PostgreSQL, MongoDB)
- Feature flags
- Scaling parameters
- Rate-limit thresholds

**Rationale:** These are application decisions. Governor OS is infrastructure-agnostic.

---

### Customer Data & Business Models

**Exclusions:**
- Customer workspaces, teams, permissions
- AI system inventory
- Compliance assessment data
- Evidence artifacts specific to customer domain
- Billing and invoicing

**Rationale:** Multi-tenancy and data isolation are applications' responsibility. Governor OS coordinates execution; applications own data governance.

---

### User Interface

**Exclusions:**
- Dashboard layouts, visualizations, components
- Customer journey flows
- Report generation (applications call Governor OS APIs and build custom reports)
- Notifications and alerts (applications implement notification layers)

**Rationale:** Governor OS exposes data via APIs. Applications build UIs.

---

### Application-Specific Adapters

**Excluded from core; applications implement:**
- GitHub API integration (Governor OS defines `GitAdapter` interface; apps implement it)
- Supabase schema validation (Governor OS defines `DatabaseAdapter` interface; apps implement it)
- Vercel deployment orchestration (Governor OS defines `DeploymentAdapter` interface; apps implement it)
- Incident detection for their domain (Governor OS defines `FailureDetector` interface; apps implement it)
- Remediation actions (Governor OS defines `RemediationAction` interface; apps implement it)

**Rationale:** Adapters are the application's responsibility. Governor OS defines the contract.

---

## Adapter Contracts (Architecture Interface)

### ExecutionAdapter

```typescript
interface ExecutionAdapter {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  // Guaranteed: no side effects if authorization not granted
  // Guaranteed: idempotent (same ID can re-execute safely)
}

interface ExecutionRequest {
  taskId: string;
  taskType: string; // Application-defined (e.g., "deploy", "test", "scan")
  parameters: Record<string, unknown>; // Application schema
  authority: AuthorityClass; // Caller's authority level
  evidenceRequired: string[]; // What evidence must be provided on completion
}

interface ExecutionResult {
  taskId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  evidence: EvidenceRecord[]; // Execution supplies its own evidence
}
```

### ToolAdapter

```typescript
interface ToolAdapter {
  declare(): ToolDeclaration;
  execute(request: ToolRequest): Promise<ToolResult>;
}

interface ToolDeclaration {
  name: string;
  capabilities: string[];
  sideEffects: string[];
  requiredAuthority: AuthorityClass;
  inputSanitization: (input: unknown) => unknown;
}

interface ToolRequest {
  toolName: string;
  action: string;
  parameters: Record<string, unknown>;
}

interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}
```

### VerificationAdapter

```typescript
interface VerificationAdapter {
  verify(request: VerificationRequest): Promise<VerificationResult>;
}

interface VerificationRequest {
  taskId: string;
  intendedTask: Task;
  executionResult: ExecutionResult;
  evidence: EvidenceRecord[];
  successCriteria: SuccessCriterion[];
}

interface VerificationResult {
  taskId: string;
  status: 'verified' | 'partially-verified' | 'unverified' | 'contradicted' | 'failed';
  evidence: string[]; // Evidence IDs that support this result
  gaps: string[]; // Missing evidence or contradictions
  confidence: number; // 0-100
}
```

### EscalationHandler

```typescript
interface EscalationHandler {
  handle(event: EscalationEvent): Promise<void>;
}

interface EscalationEvent {
  escalationId: string;
  action: ActionClass;
  reason: string;
  evidence: EvidenceRecord[];
  requiredAuthority: AuthorityClass;
  deadline?: string;
}
```

---

## Boundary Enforcement Mechanisms

### 1. No Application Data in Governor OS

- Governor OS never reads from application database tables
- Governor OS never writes to application-specific database tables
- Governor OS stores only:
  - Mission/task/evidence records (generic, application-neutral)
  - Policy decisions and audit logs
  - No customer data, user data, or business data

### 2. No Hardcoded Application Knowledge

- Governor OS has zero hardcoded references to:
  - Application URLs or endpoints
  - Feature names or product capabilities
  - Customer names, team names, or organizational structure
  - Compliance frameworks (EU AI Act, GDPR, etc.)
  - Business metrics or KPIs

### 3. Adapter-Based Extensibility

- Every application-specific behavior must go through an adapter
- Adapters are injected at initialization time
- Governor OS never imports adapters directly; applications provide them

### 4. Type System Enforcement

- All Governor OS types are marked with `@universal` JSDoc tag
- All Euro AI–specific types are marked with `@euro-ai-adapter` JSDoc tag
- Type compatibility checked in CI (universal types cannot import from adapter types)
- Schema versioning in all contracts (detect breaking changes)

### 5. API Boundary

Governor OS exposes only:
- `createMission(request)` → Mission
- `createTask(missionId, request)` → Task
- `executeTask(taskId, adapter)` → ExecutionResult
- `verifyTask(taskId, adapter)` → VerificationResult
- `recordEvidence(taskId, evidence)` → EvidenceRecord
- `getAuditLog(filters?)` → AuditEntry[]
- `escalateDecision(reason)` → EscalationEvent

Applications call these APIs; Governor OS never calls into application code except through adapters.

---

## Testing the Boundary

### Test Isolation

- Test Governor OS core without any adapters (pure state machine tests)
- Test adapters separately (integration tests with applications)
- Prove a broken adapter doesn't break Governor OS

### Boundary Tests

- Prove Governor OS cannot import Euro AI types
- Prove Governor OS runs correctly with a null/no-op adapter
- Prove Governor OS cannot access Supabase tables directly
- Prove Governor OS cannot mutate production config

### Contract Compliance Tests

- Every adapter must satisfy the interface contract
- Missing/incorrect methods caught at compile time
- Runtime behavior validation (execution result structure matches schema)

---

## Migration Path: Extracting to Independent Repository

When Governor OS is ready for independent use (post-refactoring):

1. Create new repository: `governor-os` (or `governor`)
2. Copy UNIVERSAL_CORE files from Euro AI
3. Copy this document and contracts to Governor OS repo
4. Define `@euro-ai-adapter/*` module structure in Euro AI
5. Euro AI imports from Governor OS as NPM package or monorepo dependency
6. Other applications (Vajra, Hermes) do the same

**Invariant:** Governor OS has zero dependencies on Euro AI; Euro AI depends on Governor OS.

---

## Exceptions & Future Considerations

### When the boundary may relax (rare):

1. **Standardized abstractions:** If multiple applications need the same adapter (e.g., 3+ apps need Supabase adapter), consider moving to Governor OS as `@optional-adapter`
2. **Safety-critical logic:** If an adapter implements a universal safety rule (e.g., "never delete production data without 2-person approval"), consider moving to core
3. **Regulatory compliance:** If multiple applications need the same compliance record structure, standardize in Governor OS

### When to escalate boundary changes:

- Any change to core Governor OS interfaces requires Founder approval
- Any removal of universal guarantees (e.g., "audit logs are immutable") requires Founder approval
- Any addition of application-specific logic to core requires explicit architectural review

---

## Conclusion

This boundary is **absolute and inviolable**:

- **Governor OS is reusable.** It contains no application knowledge.
- **Governor OS is safe.** It enforces policy before execution and cannot be bypassed.
- **Governor OS is verifiable.** Every action is audited; every decision is recorded.
- **Governor OS is transparent.** Decisions and evidence are available for review.

Applications are responsible for:
- Defining what they need governed
- Implementing adapters for their domain
- Calling Governor OS APIs
- Interpreting results and acting on them

Governor OS is responsible for:
- Enforcing the rules applications tell it to enforce
- Recording and verifying all actions
- Preventing unauthorized execution
- Escalating decisions it cannot make

This separation ensures Governor OS can serve many applications while remaining trustworthy, predictable, and maintainable.

