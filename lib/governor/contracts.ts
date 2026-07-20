/**
 * Governor OS — Core Versioned Contracts
 *
 * These are the stable, application-neutral interfaces that all applications
 * using Governor OS must implement and respect. Every type includes a schema
 * version for backwards-compatibility tracking.
 *
 * @universal — This module contains ONLY Governor OS core types. No application-specific imports.
 */

// ============================================================================
// SCHEMA VERSIONING
// ============================================================================

export const GOVERNOR_SCHEMA_VERSION = '1.0.0';

/**
 * Every contract type must declare its schema version.
 * Applications must verify version compatibility before processing.
 */
export interface Versioned {
  schemaVersion: string; // Semver: MAJOR.MINOR.PATCH
}

/**
 * Schema compatibility rules:
 * - MAJOR bump: breaking change, requires new type name
 * - MINOR bump: additive change, backwards-compatible
 * - PATCH bump: bug fix, no schema change
 */
export type SchemaCompatibility =
  'compatible' | 'incompatible' | 'requires-migration';

export function checkSchemaCompatibility(
  current: string,
  expected: string
): SchemaCompatibility {
  const [currentMajor] = current.split('.');
  const [expectedMajor] = expected.split('.');

  if (currentMajor !== expectedMajor) {
    return 'incompatible';
  }

  if (current === expected) {
    return 'compatible';
  }

  // Same major version but different minor/patch
  return 'compatible'; // Backwards-compatible
}

// ============================================================================
// CORE TYPES — MISSION & TASK LIFECYCLE
// ============================================================================

export type MissionState =
  | 'CREATED'
  | 'VALIDATED'
  | 'PLANNED'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED'
  | 'CANCELLED';

export type TaskState =
  | 'QUEUED'
  | 'RUNNING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED'
  | 'CANCELLED';

export interface MissionRequest extends Versioned {
  schemaVersion: '1.0.0';
  title: string;
  description: string;
  objectives: string[]; // Objective descriptions
  successCriteria: string[]; // What counts as success?
  contextId: string; // Application context (NOT customer ID or user ID)
  requestedBy: string; // Who authorized this?
  requestedAt: string; // ISO 8601 timestamp
  deadline?: string; // Optional deadline
}

export interface Mission extends Versioned {
  schemaVersion: '1.0.0';
  id: string; // Deterministic, globally unique
  state: MissionState;
  request: MissionRequest;
  createdAt: string; // ISO 8601
  startedAt?: string;
  completedAt?: string;
  blockedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  failureReason?: string; // Why did it fail/block?
  tasks: string[]; // Task IDs
  evidence: string[]; // Evidence IDs collected during mission
  audit: MissionAuditEntry[];
}

export interface MissionAuditEntry {
  timestamp: string; // ISO 8601
  previousState: MissionState;
  newState: MissionState;
  reason: string;
  actor: string;
  authority: AuthorityClass;
}

export interface TaskRequest extends Versioned {
  schemaVersion: '1.0.0';
  missionId: string;
  title: string;
  description: string;
  taskType: string; // Application-defined: 'deploy', 'test', 'verify', etc.
  parameters: Record<string, unknown>; // Application-specific task params
  requiredAuthority: AuthorityClass;
  dependsOn?: string[]; // Task IDs that must complete first
  evidenceRequired: string[]; // What evidence must be collected?
  successCriteria: SuccessCriterion[];
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  maxRetries: number; // Bounded retry count
  timeoutMs: number; // Execution timeout
}

export interface Task extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  state: TaskState;
  request: TaskRequest;
  createdAt: string; // ISO 8601
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  failedAt?: string;
  blockedAt?: string;
  failureReason?: string;
  executionResult?: ExecutionResult;
  verificationResult?: VerificationResult;
  retryCount: number;
  evidence: string[]; // Evidence IDs
  audit: TaskAuditEntry[];
}

export interface TaskAuditEntry {
  timestamp: string;
  previousState: TaskState;
  newState: TaskState;
  reason: string;
  actor: string;
  authority: AuthorityClass;
}

// ============================================================================
// AUTHORITY & POLICY
// ============================================================================

export type AuthorityClass = 'A_AUTONOMOUS' | 'B_GUARDRAILS' | 'C_FOUNDER_ONLY';

export type ActionClass = string; // Applications define their own action types

export type PolicyDecisionType =
  'ALLOW' | 'DENY' | 'ESCALATE' | 'REQUIRE_EVIDENCE' | 'REQUIRE_APPROVAL';

export interface AuthorityEnvelope extends Versioned {
  schemaVersion: '1.0.0';
  authority: AuthorityClass;
  grantedAt: string; // ISO 8601
  grantedBy: string;
  expiresAt?: string;
  constraints?: Record<string, unknown>; // Application-specific constraints
}

export interface PolicyRule extends Versioned {
  schemaVersion: '1.0.0';
  action: ActionClass;
  requiredAuthority: AuthorityClass;
  rationale: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PolicyDecision extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  taskId: string;
  decision: PolicyDecisionType;
  authority: AuthorityClass;
  rule: PolicyRule;
  reasoning: string;
  madeAt: string; // ISO 8601
  madeBy: string;
  evidence: string[]; // What evidence informed this decision?
  requiresApprovalFrom?: string; // If REQUIRE_APPROVAL, who must approve?
  approvedAt?: string;
  approvedBy?: string;
  denialReason?: string; // If DENY, why?
}

// ============================================================================
// EXECUTION & VERIFICATION
// ============================================================================

export interface ExecutionRequest extends Versioned {
  schemaVersion: '1.0.0';
  taskId: string;
  policyDecision: PolicyDecision; // Task cannot execute without policy decision
  task: Task;
}

export interface ExecutionResult extends Versioned {
  schemaVersion: '1.0.0';
  taskId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  errorCode?: string; // Structured error type
  executedAt: string; // ISO 8601
  executedBy: string;
  durationMs: number;
  evidence: EvidenceRecord[]; // Execution produces evidence
  sideEffects?: string[]; // Declare any side effects
}

export interface SuccessCriterion {
  name: string;
  description: string;
  condition: string; // Human-readable or machine-interpretable
  required: boolean; // Must this criterion pass?
}

export interface VerificationRequest extends Versioned {
  schemaVersion: '1.0.0';
  taskId: string;
  intendedTask: Task;
  executionResult: ExecutionResult;
  evidence: EvidenceRecord[];
  successCriteria: SuccessCriterion[];
}

export type VerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'CONTRADICTED'
  | 'FAILED_VERIFICATION';

export interface VerificationResult extends Versioned {
  schemaVersion: '1.0.0';
  taskId: string;
  status: VerificationStatus;
  confidence: number; // 0-100: how confident are we in this result?
  verifiedAt: string; // ISO 8601
  verifiedBy: string;
  supportingEvidence: string[]; // Evidence IDs that support this result
  gaps: string[]; // Missing evidence or unmet criteria
  contradictions: string[]; // Evidence that contradicts success
  reasoning: string;
}

// ============================================================================
// EVIDENCE & RECORDS
// ============================================================================

export type EvidenceType = string; // Applications define: 'test-output', 'deployment-log', 'screenshot', etc.

export interface EvidenceRecord extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  missionId: string;
  taskId: string;
  type: EvidenceType;
  source: string; // Where did this evidence come from? (e.g., 'ci-run-123', 'user-upload')
  content: string; // The actual evidence (log, output, artifact URL, etc.)
  contentHash: string; // SHA256 hash for integrity checking
  collectedAt: string; // ISO 8601
  producer: string; // Who/what produced this?
  relationship: string; // How does it relate to success criteria? (e.g., 'proves-deployment-succeeded')
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SECRET';
  isRedacted: boolean;
  redactionReason?: string;
  provenance: string; // Chain of custody (for audit)
  tags: string[]; // Free-form tags for search
}

export interface EvidenceSummary {
  totalRecords: number;
  byType: Record<EvidenceType, number>;
  bySensitivity: Record<string, number>;
  oldestAt: string; // ISO 8601
  newestAt: string;
  redactedCount: number;
}

// ============================================================================
// ESCALATION & HUMAN DECISION
// ============================================================================

export type EscalationReason = string; // Applications define reasons

export interface EscalationEvent extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  taskId: string;
  reason: EscalationReason;
  evidence: string[]; // Evidence IDs requiring human review
  authority: AuthorityClass; // What authority level required?
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string; // ISO 8601
  deadline?: string; // When must this be decided?
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'REJECTED';
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string; // What did the human decide?
}

// ============================================================================
// MEMORY, LEARNING & EVOLUTION
// ============================================================================

export interface MemoryRecord extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  missionId: string;
  taskId: string;
  recordedAt: string; // ISO 8601
  event: string; // What happened? (objective fact)
  evidence: string[]; // Evidence supporting this memory
}

export interface LearningRecord extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  sourceMissions: string[]; // Which missions provided evidence?
  pattern: string; // Generalized pattern: "when X → likely Y"
  confidence: number; // 0-100: how confident?
  evidence: string[]; // Evidence IDs supporting this learning
  learnedAt: string; // ISO 8601
  learnedBy: string;
  status:
    'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'DEPRECATED';
  approvedAt?: string;
  approvedBy?: string;
  conflictsWith?: string[]; // Other learning IDs that contradict this
}

export interface EvolutionProposal extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  title: string;
  description: string;
  motivation: string; // Why propose this change?
  expectedBenefit: string;
  risks: string[];
  reversible: boolean;
  validationPlan: string; // How will we know if this works?
  sourceLearning: string[]; // Which learning IDs support this?
  proposedAt: string; // ISO 8601
  proposedBy: string;
  status:
    | 'PROPOSED'
    | 'APPROVED'
    | 'EXECUTING'
    | 'VALIDATED'
    | 'REJECTED'
    | 'ROLLED_BACK';
  approvedAt?: string;
  approvedBy?: string;
  rollbackReason?: string;
}

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

export interface AuditEntry extends Versioned {
  schemaVersion: '1.0.0';
  id: string;
  timestamp: string; // ISO 8601
  correlationId: string; // Trace related entries
  action: string;
  actor: string;
  authority: AuthorityClass;
  result: 'SUCCESS' | 'DENIED' | 'FAILED' | 'ESCALATED';
  reason?: string;
  evidence: string[]; // Evidence IDs related to this action
  metadata: Record<string, unknown>;
}

// ============================================================================
// ERRORS & FAILURE MODES
// ============================================================================

export type GovernorErrorCode =
  | 'ACTION_NOT_AUTHORIZED'
  | 'EVIDENCE_MISSING'
  | 'VERIFICATION_FAILED'
  | 'ESCALATION_PENDING'
  | 'INVALID_STATE_TRANSITION'
  | 'POLICY_VIOLATION'
  | 'DEPENDENCY_UNMET'
  | 'TASK_TIMEOUT'
  | 'RETRY_EXHAUSTED'
  | 'ROLLBACK_FAILED'
  | 'SCHEMA_MISMATCH'
  | 'UNKNOWN_ERROR';

export interface GovernorError extends Error {
  code: GovernorErrorCode;
  taskId?: string;
  missionId?: string;
  retryable: boolean;
  timestamp: string;
}

// ============================================================================
// ADAPTER CONTRACTS
// ============================================================================

/**
 * ExecutionAdapter — Applications implement this to execute tasks.
 * Governor OS never calls application code directly; always through adapters.
 */
export interface ExecutionAdapter {
  /**
   * Execute a task request.
   *
   * GUARANTEES:
   * - If policyDecision.decision !== 'ALLOW', must not execute task
   * - Must return deterministically (same input → same output)
   * - Idempotent (same taskId can be re-executed safely)
   * - No side effects if authorization not granted
   *
   * OBLIGATIONS:
   * - Provide evidence supporting the result
   * - Declare any side effects
   * - Sanitize inputs (no injection attacks)
   */
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

/**
 * VerificationAdapter — Applications implement this to verify task success.
 * Execution and verification must be logically independent.
 */
export interface VerificationAdapter {
  /**
   * Verify a task's success.
   *
   * GUARANTEES:
   * - Must not access execution logs directly (only provided evidence)
   * - Must evaluate against success criteria, not execution mechanism
   * - Can report "task executed but we can't prove it succeeded"
   * - Must detect contradictions in evidence
   *
   * OBLIGATIONS:
   * - Provide evidence supporting the verification result
   * - Explain gaps in evidence
   * - Assess confidence level (0-100)
   */
  verify(request: VerificationRequest): Promise<VerificationResult>;
}

/**
 * EscalationHandler — Applications implement this to handle escalations.
 * Governor OS will not execute escalated actions until explicitly approved.
 */
export interface EscalationHandler {
  /**
   * Handle an escalation event requiring human decision.
   *
   * GUARANTEES:
   * - Governor OS will not proceed until explicit approval
   * - No timeout-based auto-approval
   * - Full audit trail of decision
   *
   * OBLIGATIONS:
   * - Notify appropriate human (email, Slack, etc.)
   * - Provide evidence and context
   * - Implement approval/rejection flow
   */
  handle(event: EscalationEvent): Promise<void>;

  /**
   * Check approval status of an escalation.
   */
  getStatus(escalationId: string): Promise<EscalationEvent>;

  /**
   * Approve an escalation.
   */
  approve(
    escalationId: string,
    approvedBy: string,
    resolution: string
  ): Promise<void>;

  /**
   * Reject an escalation.
   */
  reject(
    escalationId: string,
    rejectedBy: string,
    reason: string
  ): Promise<void>;
}

// ============================================================================
// POLICY CONTRACTS
// ============================================================================

/**
 * PolicyEngine — Evaluates policies and makes authorization decisions.
 * Pluggable so applications can define custom rules.
 */
export interface PolicyEngine {
  /**
   * Evaluate a policy decision for a task.
   * Applications configure rules; Governor OS enforces them.
   */
  evaluatePolicy(
    task: Task,
    authority: AuthorityClass
  ): Promise<PolicyDecision>;

  /**
   * Register a policy rule.
   */
  addRule(rule: PolicyRule): void;

  /**
   * Get all rules.
   */
  getRules(): PolicyRule[];
}

// ============================================================================
// SERIALIZATION & DETERMINISM
// ============================================================================

/**
 * All Governor OS contracts must be deterministically serializable.
 * Use this function for JSON serialization (consistent field order).
 */
export function serializeGovernorObject<T extends Versioned>(obj: T): string {
  return JSON.stringify(obj, (key, value) => {
    // Consistent key ordering
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = value[key];
            return result;
          },
          {} as Record<string, unknown>
        );
    }
    return value;
  });
}

/**
 * Deserialize with schema version validation.
 */
export function deserializeGovernorObject<T extends Versioned>(
  json: string,
  expectedType: T,
  expectedVersion?: string
): T {
  const obj = JSON.parse(json) as T;

  // Verify schema version
  if (expectedVersion && obj.schemaVersion !== expectedVersion) {
    const compat = checkSchemaCompatibility(obj.schemaVersion, expectedVersion);
    if (compat === 'incompatible') {
      throw new Error(
        `Schema mismatch: got ${obj.schemaVersion}, expected ${expectedVersion}`
      );
    }
  }

  return obj;
}

const governorContractsExport = {
  GOVERNOR_SCHEMA_VERSION,
  checkSchemaCompatibility,
  serializeGovernorObject,
  deserializeGovernorObject,
};

export default governorContractsExport;
