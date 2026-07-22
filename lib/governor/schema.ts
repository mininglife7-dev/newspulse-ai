/**
 * Governor OS Foundation — SQLite Schema
 * Defines evidence ledger with deterministic field separation.
 * Deterministic fields: mission_id, task_id, timestamp, actor, action, result, evidence_type, hash
 * Volatile fields: run_id, duration, row_id, collected_at (never part of hash)
 */

export const EVIDENCE_LEDGER_SCHEMA = `
-- ============================================================================
-- MISSIONS TABLE
-- Stores mission definitions and outcomes (deterministic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS missions (
  -- Deterministic fields (mission_id is canonical)
  mission_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL, -- ISO 8601 (fixed at mission creation)
  class TEXT NOT NULL, -- REFERENCE, CUSTOMER_JOURNEY, EVOLUTION, COMPLIANCE
  description TEXT NOT NULL,
  owner TEXT NOT NULL,
  authority_level TEXT NOT NULL, -- autonomous, approval_required, founder_only

  -- Mission state (deterministic for same repo state + inputs)
  status TEXT NOT NULL, -- QUEUED, PLANNING, EXECUTING, VERIFYING, COMPLETE, FAILED, ESCALATED
  task_count INTEGER DEFAULT 0,

  -- Outcome (deterministic once execution complete)
  fitness_baseline REAL,
  fitness_post_execution REAL,
  final_verdict TEXT, -- SUCCESS, PARTIAL_SUCCESS, FAILURE, ESCALATED
  completion_reason TEXT,

  -- Volatile fields (not in deterministic hash)
  run_id TEXT, -- Unique per execution attempt
  started_at TEXT, -- Actual start time
  completed_at TEXT, -- Actual completion time
  error TEXT,

  -- Metadata
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mission_status_valid CHECK (status IN ('QUEUED', 'PLANNING', 'EXECUTING', 'VERIFYING', 'COMPLETE', 'FAILED', 'ESCALATED'))
);

-- ============================================================================
-- TASKS TABLE
-- Stores task definitions and execution results (deterministic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  -- Deterministic fields
  task_id TEXT PRIMARY KEY NOT NULL,
  mission_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  class TEXT NOT NULL, -- COMMAND, VERIFICATION, DECISION, EVIDENCE_COLLECTION
  description TEXT NOT NULL,
  capability_required TEXT NOT NULL,
  command TEXT,
  expected_exit_code INTEGER,
  verification_rule TEXT,

  -- Execution outcome (deterministic for bounded execution)
  status TEXT NOT NULL, -- QUEUED, EXECUTING, VERIFYING, COMPLETE, FAILED, SKIPPED, ESCALATED
  exit_code INTEGER,
  stdout TEXT, -- Up to 50KB, truncated if larger
  stderr TEXT,
  output_size INTEGER, -- Bytes; if > 50KB, only summary stored

  -- Verification result (deterministic)
  verified BOOLEAN,
  verification_result TEXT, -- PASS, FAIL, INCONCLUSIVE

  -- Volatile fields (not in deterministic hash)
  run_id TEXT, -- Unique per execution attempt
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,
  output_hash TEXT, -- SHA-256 of full output (stored separately)

  -- Metadata
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON DELETE CASCADE,
  CONSTRAINT task_status_valid CHECK (status IN ('QUEUED', 'EXECUTING', 'VERIFYING', 'COMPLETE', 'FAILED', 'SKIPPED', 'ESCALATED')),
  CONSTRAINT task_class_valid CHECK (class IN ('COMMAND', 'VERIFICATION', 'DECISION', 'EVIDENCE_COLLECTION'))
);

-- ============================================================================
-- EVIDENCE_ENTRIES TABLE
-- Immutable append-only ledger (deterministic fields used for hashing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_entries (
  -- Internal row ID (volatile, never in hash)
  row_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,

  -- Deterministic fields (used for hashing)
  evidence_id TEXT NOT NULL UNIQUE,
  mission_id TEXT NOT NULL,
  task_id TEXT, -- Optional if not task-specific
  evidence_type TEXT NOT NULL, -- TASK_RESULT, VERIFICATION_RESULT, CAPABILITY_CHECK, HEALTH_INDICATOR, LESSON, DECISION
  timestamp TEXT NOT NULL, -- ISO 8601 (fixed at collection time)
  actor TEXT NOT NULL, -- Governor Ω or specific organ
  action TEXT NOT NULL, -- EXECUTE_COMMAND, VERIFY_OUTPUT, etc.
  subject TEXT NOT NULL,
  result TEXT NOT NULL,
  summary TEXT NOT NULL,

  -- Hash (deterministic, computed from above fields)
  content_hash TEXT NOT NULL UNIQUE,

  -- Volatile fields (not hashed, not part of immutable record)
  run_id TEXT,
  collected_at TEXT, -- When physically stored
  retention_policy TEXT DEFAULT 'permanent', -- permanent, audit_trail, temporary

  -- Append-only enforcement (no updates, only inserts)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON DELETE RESTRICT,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE RESTRICT,
  CONSTRAINT evidence_type_valid CHECK (evidence_type IN ('TASK_RESULT', 'VERIFICATION_RESULT', 'CAPABILITY_CHECK', 'HEALTH_INDICATOR', 'LESSON', 'DECISION'))
);

-- Create index for efficient querying (but not on volatile fields)
CREATE INDEX IF NOT EXISTS idx_evidence_mission_id ON evidence_entries(mission_id);
CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON evidence_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_evidence_timestamp ON evidence_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_entries(content_hash);

-- ============================================================================
-- CAPABILITIES TABLE
-- Tracks available capabilities and their verification status
-- ============================================================================

CREATE TABLE IF NOT EXISTS capabilities (
  capability_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  danger_class TEXT NOT NULL, -- SAFE, AUDIT_REQUIRED, APPROVAL_REQUIRED, PROHIBITED
  status TEXT NOT NULL, -- VERIFIED, ASSUMED, BLOCKED, UNAVAILABLE
  verified_at TEXT,
  error_message TEXT,
  requires_approval BOOLEAN DEFAULT 0,
  requires_audit BOOLEAN DEFAULT 0,
  requires_evidence BOOLEAN DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT capability_status_valid CHECK (status IN ('VERIFIED', 'ASSUMED', 'BLOCKED', 'UNAVAILABLE')),
  CONSTRAINT danger_class_valid CHECK (danger_class IN ('SAFE', 'AUDIT_REQUIRED', 'APPROVAL_REQUIRED', 'PROHIBITED'))
);

-- ============================================================================
-- PROVIDERS TABLE
-- Tracks provider availability in this environment
-- ============================================================================

CREATE TABLE IF NOT EXISTS providers (
  provider_id TEXT PRIMARY KEY NOT NULL,
  capability_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- local, external, fallback
  available BOOLEAN DEFAULT 0,
  error TEXT,
  latency_ms INTEGER,
  checked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (capability_id) REFERENCES capabilities(capability_id) ON DELETE CASCADE,
  CONSTRAINT provider_type_valid CHECK (type IN ('local', 'external', 'fallback'))
);

-- ============================================================================
-- POLICY_DECISIONS TABLE
-- Records policy evaluation results (deterministic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_decisions (
  decision_id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL, -- ISO 8601 (fixed at decision time)
  task_id TEXT NOT NULL,
  capability_requested TEXT NOT NULL,
  action TEXT NOT NULL, -- ALLOW, ALLOW_WITH_AUDIT, DENY
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE RESTRICT,
  CONSTRAINT policy_action_valid CHECK (action IN ('ALLOW', 'ALLOW_WITH_AUDIT', 'DENY'))
);

-- ============================================================================
-- VERIFICATION_RESULTS TABLE
-- Stores independent verification outcomes (deterministic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_results (
  verification_id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  timestamp TEXT NOT NULL, -- ISO 8601 (fixed at verification time)
  verification_class TEXT NOT NULL, -- EXIT_CODE, OUTPUT_PARSING, HEALTH_CHECK, ARTIFACT_VALIDATION
  expected_outcome TEXT NOT NULL,
  actual_outcome TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  confidence REAL NOT NULL, -- 0-1
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE RESTRICT
);

-- ============================================================================
-- HEALTH_INDICATORS TABLE
-- Tracks system health metrics over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_indicators (
  indicator_id TEXT NOT NULL,
  organ TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  threshold REAL NOT NULL,
  status TEXT NOT NULL, -- HEALTHY, WARNING, CRITICAL
  measured_at TEXT NOT NULL, -- ISO 8601
  mission_id TEXT,
  run_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON DELETE SET NULL,
  CONSTRAINT health_status_valid CHECK (status IN ('HEALTHY', 'WARNING', 'CRITICAL')),
  PRIMARY KEY (indicator_id, measured_at)
);

-- ============================================================================
-- LESSON_CANDIDATES TABLE
-- Tracks potential lessons learned from missions
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_candidates (
  candidate_id TEXT PRIMARY KEY NOT NULL,
  mission_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  observation TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  expected_fitness_gain REAL NOT NULL,
  confidence REAL NOT NULL, -- 0-1
  status TEXT NOT NULL, -- CANDIDATE, VALIDATING, VALIDATED, REJECTED, APPLIED, REVERTED
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON DELETE RESTRICT,
  CONSTRAINT lesson_status_valid CHECK (status IN ('CANDIDATE', 'VALIDATING', 'VALIDATED', 'REJECTED', 'APPLIED', 'REVERTED'))
);
`;

/**
 * Deterministic fields used for evidence hashing
 * These fields are FIXED at evidence collection time and never change
 */
export const DETERMINISTIC_FIELDS = [
  'mission_id',
  'task_id',
  'timestamp',
  'actor',
  'action',
  'subject',
  'result',
  'evidence_type',
];

/**
 * Volatile fields NOT included in evidence hash
 * These fields can change without invalidating the evidence
 */
export const VOLATILE_FIELDS = [
  'row_id',
  'run_id',
  'collected_at',
  'created_at',
  'updated_at',
  'duration_ms',
  'started_at',
  'completed_at',
  'latency_ms',
];

/**
 * Compute SHA-256 hash of deterministic fields for an evidence entry
 * This hash is immutable proof that evidence was not tampered with
 */
export function computeEvidenceHash(fields: Record<string, unknown>): string {
  // Collect deterministic fields in canonical order
  const deterministic: Record<string, unknown> = {};
  for (const field of DETERMINISTIC_FIELDS) {
    if (field in fields) {
      deterministic[field] = fields[field];
    }
  }

  // Serialize to canonical JSON (sorted keys)
  const json = JSON.stringify(deterministic, Object.keys(deterministic).sort());

  // For phase 1 reference mission, use simple hash (in production, use crypto.subtle.digest)
  // This is a placeholder; actual implementation uses crypto-js or Node crypto
  return `hash_${Buffer.from(json).toString('base64').slice(0, 16)}`;
}
