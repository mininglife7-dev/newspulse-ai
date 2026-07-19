/**
 * Governor OS Foundation — Core TypeScript Types
 * Defines mission, task, evidence, and capability types for the orchestration layer.
 * Separates deterministic fields (mission_id, task_id, timestamp, action, result)
 * from volatile fields (run_id, duration, row_id).
 */

// ============================================================================
// MISSION TYPES
// ============================================================================

export type MissionStatus = 'QUEUED' | 'PLANNING' | 'EXECUTING' | 'VERIFYING' | 'COMPLETE' | 'FAILED' | 'ESCALATED';
export type MissionClass = 'REFERENCE' | 'CUSTOMER_JOURNEY' | 'EVOLUTION' | 'COMPLIANCE';

export interface Mission {
  // Deterministic fields (mission_id is canonical identifier)
  mission_id: string; // M-YYYY-MM-DD-NNN format
  created_at: string; // ISO 8601 timestamp (fixed at mission creation)
  class: MissionClass;
  description: string;
  owner: string; // Governor Ω session or Founder
  authority_level: 'autonomous' | 'approval_required' | 'founder_only';

  // Mission state (deterministic for same repo state + inputs)
  status: MissionStatus;
  task_list: Task[];
  decisions: Record<string, string>; // key: decision_id, value: decision reason

  // Outcome (deterministic once execution complete)
  fitness_baseline?: number;
  fitness_post_execution?: number;
  final_verdict?: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'ESCALATED';
  completion_reason?: string;

  // Metadata (volatile, not hashed)
  run_id?: string; // Unique per execution attempt
  started_at?: string; // Actual start time
  completed_at?: string; // Actual completion time
  error?: string;
}

export type TaskStatus = 'QUEUED' | 'EXECUTING' | 'VERIFYING' | 'COMPLETE' | 'FAILED' | 'SKIPPED' | 'ESCALATED';
export type TaskClass = 'COMMAND' | 'VERIFICATION' | 'DECISION' | 'EVIDENCE_COLLECTION';

export interface Task {
  // Deterministic fields
  task_id: string; // T-XXXX-NNN format
  mission_id: string; // Reference to parent mission
  sequence: number; // 1-indexed order in mission
  class: TaskClass;
  description: string;

  // Task execution (deterministic for bounded execution)
  capability_required: string; // e.g., 'approved_command_execution'
  command?: string; // If class === COMMAND
  expected_exit_code?: number;
  verification_rule?: string; // If class === VERIFICATION

  // Execution outcome (deterministic)
  status: TaskStatus;
  exit_code?: number;
  stdout?: string; // Up to 50KB, truncated if larger
  stderr?: string;
  output_size?: number; // Bytes; if > 50KB, only summary stored

  // Verification (deterministic)
  verified?: boolean;
  verification_result?: 'PASS' | 'FAIL' | 'INCONCLUSIVE';

  // Metadata (volatile)
  run_id?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  output_hash?: string; // SHA-256 of full output (stored separately)
}

// ============================================================================
// EVIDENCE TYPES
// ============================================================================

export type EvidenceType = 'TASK_RESULT' | 'VERIFICATION_RESULT' | 'CAPABILITY_CHECK' | 'HEALTH_INDICATOR' | 'LESSON' | 'DECISION';

export interface EvidenceEntry {
  // Deterministic fields (used for hashing and immutability)
  evidence_id: string; // EV-YYYY-MM-DD-NNN format
  mission_id: string;
  task_id?: string; // Optional if not task-specific
  evidence_type: EvidenceType;
  timestamp: string; // ISO 8601, fixed at collection time
  actor: string; // Governor Ω or specific organ
  action: string; // What was done (e.g., "EXECUTE_COMMAND", "VERIFY_OUTPUT")

  // Content (deterministic)
  subject: string; // What was acted upon
  result: string; // Outcome (e.g., "SUCCESS", "FAILURE", exit code)
  summary: string; // Human-readable summary

  // Hash (deterministic, computed from above fields)
  content_hash: string; // SHA-256 of structured content

  // Metadata (volatile, not hashed)
  run_id?: string;
  collected_at?: string; // When physically stored
  retention_policy?: 'permanent' | 'audit_trail' | 'temporary';
}

// ============================================================================
// CAPABILITY TYPES
// ============================================================================

export type CapabilityDangerClass = 'SAFE' | 'AUDIT_REQUIRED' | 'APPROVAL_REQUIRED' | 'PROHIBITED';
export type CapabilityStatus = 'VERIFIED' | 'ASSUMED' | 'BLOCKED' | 'UNAVAILABLE';

export interface Capability {
  capability_id: string; // e.g., 'approved_command_execution'
  name: string;
  description: string;
  danger_class: CapabilityDangerClass;

  // Provider chain (first-available strategy)
  providers: Provider[];

  // Environment status
  status: CapabilityStatus;
  verified_at?: string; // When last verified in this environment
  error_message?: string; // If BLOCKED or UNAVAILABLE

  // Policy gates
  requires_approval: boolean;
  requires_audit: boolean;
  requires_evidence: boolean;
}

export interface Provider {
  provider_id: string;
  name: string;
  type: 'local' | 'external' | 'fallback';
  available: boolean;
  error?: string;
  latency_ms?: number;
}

// ============================================================================
// POLICY TYPES
// ============================================================================

export type PolicyAction = 'ALLOW' | 'ALLOW_WITH_AUDIT' | 'DENY';

export interface PolicyDecision {
  decision_id: string; // D-YYYY-MM-DD-NNN format
  timestamp: string; // ISO 8601
  task_id: string; // Which task triggered this decision
  capability_requested: string;
  action: PolicyAction;
  reason: string; // Why this action
  evidence: string[]; // References to evidence entries
}

// ============================================================================
// VERIFICATION TYPES
// ============================================================================

export type VerificationClass = 'EXIT_CODE' | 'OUTPUT_PARSING' | 'HEALTH_CHECK' | 'ARTIFACT_VALIDATION';

export interface VerificationResult {
  verification_id: string; // VF-YYYY-MM-DD-NNN format
  task_id: string;
  timestamp: string; // ISO 8601
  verification_class: VerificationClass;
  expected_outcome: string;
  actual_outcome: string;
  passed: boolean;
  confidence: number; // 0-1, how confident is verification
  notes: string;
}

// ============================================================================
// HEALTH INDICATOR TYPES
// ============================================================================

export interface HealthIndicator {
  indicator_id: string;
  organ: string;
  metric: string;
  value: number;
  threshold: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  measured_at: string; // ISO 8601
  mission_id?: string; // Associated mission if any
}

// ============================================================================
// LEARNING TYPES
// ============================================================================

export interface LessonCandidate {
  candidate_id: string; // LC-YYYY-MM-DD-NNN format
  mission_id: string;
  pattern: string; // What pattern was observed
  observation: string; // What was noticed
  hypothesis: string; // What might improve fitness
  expected_fitness_gain: number; // Percentage improvement
  confidence: number; // 0-1, how confident in hypothesis
  created_at: string; // ISO 8601
  status: 'CANDIDATE' | 'VALIDATING' | 'VALIDATED' | 'REJECTED' | 'APPLIED' | 'REVERTED';
}

// ============================================================================
// ERROR AND STATE TYPES
// ============================================================================

export interface GovernorError extends Error {
  code: string;
  context?: Record<string, unknown>;
  evidence_id?: string;
}

export interface ExecutionContext {
  mission_id: string;
  task_id: string;
  run_id: string; // Unique per execution attempt
  capability: Capability;
  policy_decision: PolicyDecision;
  actor: string; // Governor Ω session ID
}
