/**
 * Governor OS Foundation — Main Export
 * Exposes all core modules for orchestration and mission execution.
 */

// Core types
export * from './types';

// Schema and database
export { EVIDENCE_LEDGER_SCHEMA, DETERMINISTIC_FIELDS, VOLATILE_FIELDS, computeEvidenceHash } from './schema';

// Mission and state management
export { MissionModel, validateMissionIntegrity } from './mission';

// Capability and policy
export { CapabilityRegistry, getOrCreateRegistry } from './capability-registry';
export { PolicyEngine, getOrCreatePolicyEngine } from './policy-engine';

// Execution
export { ExecutionAdapter, EXECUTION_BOUNDS, executeNpm, executeGit, executeBash } from './execution-adapter';

// Planning and decomposition
export { Planner } from './planner';

// Evidence and verification
export {
  EvidenceLedger,
  getOrCreateLedger,
  recordTaskExecution,
  recordVerification,
  recordCapabilityCheck,
} from './evidence-ledger';

// Reference mission (proof of concept)
export { ReferenceMissionExecutor, executeReferenceMission } from './reference-mission';
export type { MissionExecutionReport } from './reference-mission';
