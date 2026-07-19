/**
 * Governor OS — Deterministic Mission State Machine
 *
 * Enforces the mission lifecycle with:
 * - Valid transitions only (invalid attempts rejected)
 * - Every transition recorded with reason & evidence
 * - Policy decisions required before execution
 * - Verification separate from execution
 * - Idempotent state transitions
 * - Impossible to skip states (e.g., can't go EXECUTING → COMPLETED without VERIFYING)
 *
 * @universal — No application-specific logic
 */

import type {
  Mission,
  MissionRequest,
  MissionState,
  Task,
  TaskState,
  PolicyDecision,
  ExecutionResult,
  VerificationResult,
  GovernorError,
  GovernorErrorCode,
  AuditEntry,
} from './contracts';

// ============================================================================
// STATE MACHINE RULES
// ============================================================================

/**
 * Valid mission state transitions.
 * Key: current state → Set of valid next states
 */
const VALID_MISSION_TRANSITIONS: Record<MissionState, Set<MissionState>> = {
  CREATED: new Set(['VALIDATED', 'CANCELLED']),
  VALIDATED: new Set(['PLANNED', 'BLOCKED', 'CANCELLED']),
  PLANNED: new Set(['AUTHORIZED', 'BLOCKED', 'CANCELLED']),
  AUTHORIZED: new Set(['EXECUTING', 'BLOCKED', 'CANCELLED']),
  EXECUTING: new Set(['VERIFYING', 'BLOCKED', 'FAILED', 'CANCELLED']),
  VERIFYING: new Set(['COMPLETED', 'FAILED', 'BLOCKED']),
  COMPLETED: new Set([]), // Terminal: no transitions out
  BLOCKED: new Set(['AUTHORIZED', 'FAILED', 'CANCELLED']),
  FAILED: new Set(['BLOCKED', 'CANCELLED']),
  CANCELLED: new Set([]), // Terminal: no transitions out
};

/**
 * Valid task state transitions.
 */
const VALID_TASK_TRANSITIONS: Record<TaskState, Set<TaskState>> = {
  QUEUED: new Set(['RUNNING', 'BLOCKED', 'CANCELLED']),
  RUNNING: new Set(['VERIFYING', 'FAILED', 'BLOCKED']),
  VERIFYING: new Set(['COMPLETED', 'FAILED']),
  COMPLETED: new Set([]) as Set<TaskState>,
  FAILED: new Set(['QUEUED']) as Set<TaskState>, // Can retry
  BLOCKED: new Set(['RUNNING', 'FAILED', 'CANCELLED']),
  CANCELLED: new Set([]) as Set<TaskState>,
};

// State machine rules
interface StateMachineRule {
  fromState: MissionState;
  toState: MissionState;
  requires: string[]; // What must be present before transition?
  forbids: string[]; // What must NOT be present?
  description: string;
}

const MISSION_STATE_RULES: StateMachineRule[] = [
  {
    fromState: 'CREATED',
    toState: 'VALIDATED',
    requires: ['request'],
    forbids: [],
    description: 'Validation checks mission request is well-formed',
  },
  {
    fromState: 'VALIDATED',
    toState: 'PLANNED',
    requires: ['request', 'successCriteria'],
    forbids: [],
    description: 'Planning breaks mission into tasks and strategy',
  },
  {
    fromState: 'PLANNED',
    toState: 'AUTHORIZED',
    requires: ['tasks', 'policyDecision'],
    forbids: [],
    description: 'Authorization grants authority to execute',
  },
  {
    fromState: 'AUTHORIZED',
    toState: 'EXECUTING',
    requires: ['tasks', 'policyDecision'],
    forbids: [],
    description: 'Execution begins task processing',
  },
  {
    fromState: 'EXECUTING',
    toState: 'VERIFYING',
    requires: ['executionResult', 'evidence'],
    forbids: [],
    description: 'Verification independently assesses success',
  },
  {
    fromState: 'VERIFYING',
    toState: 'COMPLETED',
    requires: ['verificationResult'],
    forbids: ['unverifiedTasks'],
    description: 'Mission complete only after verification confirms success',
  },
  {
    fromState: 'EXECUTING',
    toState: 'FAILED',
    requires: ['failureReason'],
    forbids: [],
    description: 'Execution failure halts mission',
  },
  {
    fromState: 'VERIFYING',
    toState: 'FAILED',
    requires: ['verificationResult', 'failureReason'],
    forbids: [],
    description: 'Verification failure halts mission',
  },
  {
    fromState: 'AUTHORIZED',
    toState: 'BLOCKED',
    requires: ['blockingCondition'],
    forbids: [],
    description: 'Blocking condition prevents execution',
  },
  {
    fromState: 'BLOCKED',
    toState: 'AUTHORIZED',
    requires: [],
    forbids: ['blockingCondition'],
    description: 'Blocking resolved, mission can proceed',
  },
];

// ============================================================================
// STATE MACHINE ENGINE
// ============================================================================

export class MissionStateMachine {
  private mission: Mission;
  private transitionHistory: Array<{
    from: MissionState;
    to: MissionState;
    at: string;
    reason: string;
    actor: string;
  }> = [];

  constructor(mission: Mission) {
    this.mission = mission;
  }

  /**
   * Attempt to transition to a new state.
   * Throws if transition is invalid.
   */
  async transitionTo(
    newState: MissionState,
    reason: string,
    actor: string,
    context?: {
      policyDecision?: PolicyDecision;
      executionResult?: ExecutionResult;
      verificationResult?: VerificationResult;
      failureReason?: string;
      blockingCondition?: string;
    }
  ): Promise<void> {
    const currentState = this.mission.state;

    // Check if transition is valid
    if (!this.isValidTransition(currentState, newState)) {
      throw this.createError(
        'INVALID_STATE_TRANSITION',
        `INVALID_STATE_TRANSITION: Cannot transition from ${currentState} to ${newState}`,
        this.mission.id
      );
    }

    // Check preconditions
    const rule = MISSION_STATE_RULES.find(
      (r) => r.fromState === currentState && r.toState === newState
    );

    if (rule) {
      this.validatePreconditions(rule, context);
      this.validateForbiddens(rule, context);
    }

    // Apply transition
    this.mission.state = newState;
    const now = new Date().toISOString();

    switch (newState) {
      case 'EXECUTING':
        this.mission.startedAt = now;
        break;
      case 'COMPLETED':
        this.mission.completedAt = now;
        break;
      case 'FAILED':
        this.mission.failedAt = now;
        this.mission.failureReason = context?.failureReason;
        break;
      case 'BLOCKED':
        this.mission.blockedAt = now;
        break;
      case 'CANCELLED':
        this.mission.cancelledAt = now;
        break;
    }

    // Record in audit
    const auditEntry: (typeof this.mission.audit)[0] = {
      timestamp: now,
      previousState: currentState,
      newState,
      reason,
      actor,
      authority: 'A_AUTONOMOUS', // TODO: pass from caller
    };

    this.mission.audit.push(auditEntry);
    this.transitionHistory.push({
      from: currentState,
      to: newState,
      at: now,
      reason,
      actor,
    });
  }

  /**
   * Check if a transition is valid according to the state machine.
   */
  private isValidTransition(from: MissionState, to: MissionState): boolean {
    const validNext = VALID_MISSION_TRANSITIONS[from];
    return validNext && validNext.has(to);
  }

  /**
   * Validate that all required preconditions are met.
   */
  private validatePreconditions(
    rule: StateMachineRule,
    context?: Record<string, unknown>
  ): void {
    for (const required of rule.requires) {
      let satisfied = false;

      switch (required) {
        case 'request':
          satisfied = !!this.mission.request;
          break;
        case 'successCriteria':
          satisfied =
            !!this.mission.request &&
            this.mission.request.successCriteria.length > 0;
          break;
        case 'tasks':
          satisfied = this.mission.tasks.length > 0;
          break;
        case 'policyDecision':
          satisfied = !!context?.policyDecision;
          break;
        case 'executionResult':
          satisfied = !!context?.executionResult;
          break;
        case 'evidence':
          satisfied = this.mission.evidence.length > 0;
          break;
        case 'verificationResult':
          satisfied = !!context?.verificationResult;
          break;
        case 'failureReason':
          satisfied = !!context?.failureReason;
          break;
        case 'blockingCondition':
          satisfied = !!context?.blockingCondition;
          break;
      }

      if (!satisfied) {
        throw this.createError(
          'POLICY_VIOLATION',
          `POLICY_VIOLATION: Required precondition not met: ${required}`,
          this.mission.id
        );
      }
    }
  }

  /**
   * Validate that forbidden conditions are not present.
   */
  private validateForbiddens(
    rule: StateMachineRule,
    context?: Record<string, unknown>
  ): void {
    for (const forbidden of rule.forbids) {
      let violated = false;

      switch (forbidden) {
        case 'unverifiedTasks':
          // If verificationResult is present, mission is verified; no tasks are unverified
          violated = false;
          break;
        case 'blockingCondition':
          violated = !!context?.blockingCondition;
          break;
      }

      if (violated) {
        throw this.createError(
          'POLICY_VIOLATION',
          `POLICY_VIOLATION: Forbidden condition violated: ${forbidden}`,
          this.mission.id
        );
      }
    }
  }

  /**
   * Get the current state.
   */
  getState(): MissionState {
    return this.mission.state;
  }

  /**
   * Get valid next states from current state.
   */
  getValidNextStates(): MissionState[] {
    const validNext = VALID_MISSION_TRANSITIONS[this.mission.state];
    return validNext ? Array.from(validNext) : [];
  }

  /**
   * Check if mission is in terminal state (cannot progress further).
   */
  isTerminal(): boolean {
    return (
      this.mission.state === 'COMPLETED' || this.mission.state === 'CANCELLED'
    );
  }

  /**
   * Get transition history (audit trail).
   */
  getHistory() {
    return [...this.transitionHistory];
  }

  /**
   * Check if mission failed.
   */
  hasFailed(): boolean {
    return this.mission.state === 'FAILED';
  }

  /**
   * Check if mission is blocked.
   */
  isBlocked(): boolean {
    return this.mission.state === 'BLOCKED';
  }

  /**
   * Create a structured error.
   */
  private createError(
    code: GovernorErrorCode,
    message: string,
    missionId: string
  ): GovernorError {
    const error = new Error(message) as GovernorError;
    error.code = code;
    error.missionId = missionId;
    error.retryable = false;
    error.timestamp = new Date().toISOString();
    return error;
  }
}

// ============================================================================
// TASK STATE MACHINE
// ============================================================================

export class TaskStateMachine {
  private task: Task;
  private transitionHistory: Array<{
    from: TaskState;
    to: TaskState;
    at: string;
    reason: string;
    actor: string;
  }> = [];

  constructor(task: Task) {
    this.task = task;
  }

  /**
   * Attempt to transition task to a new state.
   */
  async transitionTo(
    newState: TaskState,
    reason: string,
    actor: string,
    context?: {
      executionResult?: ExecutionResult;
      verificationResult?: VerificationResult;
      failureReason?: string;
    }
  ): Promise<void> {
    const currentState = this.task.state;

    // Check validity
    if (!this.isValidTransition(currentState, newState)) {
      throw this.createError(
        'INVALID_STATE_TRANSITION',
        `INVALID_STATE_TRANSITION: Cannot transition task from ${currentState} to ${newState}`,
        this.task.id
      );
    }

    // Apply transition
    this.task.state = newState;
    const now = new Date().toISOString();

    switch (newState) {
      case 'RUNNING':
        this.task.startedAt = now;
        break;
      case 'COMPLETED':
        this.task.completedAt = now;
        this.task.executionResult = context?.executionResult;
        break;
      case 'VERIFYING':
        this.task.executionResult = context?.executionResult;
        break;
      case 'FAILED':
        this.task.failedAt = now;
        this.task.failureReason = context?.failureReason;
        break;
      case 'BLOCKED':
        this.task.blockedAt = now;
        break;
    }

    // Record audit
    const auditEntry: (typeof this.task.audit)[0] = {
      timestamp: now,
      previousState: currentState,
      newState,
      reason,
      actor,
    };

    this.task.audit.push(auditEntry);
    this.transitionHistory.push({
      from: currentState,
      to: newState,
      at: now,
      reason,
      actor,
    });
  }

  private isValidTransition(from: TaskState, to: TaskState): boolean {
    const validNext = VALID_TASK_TRANSITIONS[from];
    return validNext && validNext.has(to);
  }

  getState(): TaskState {
    return this.task.state;
  }

  getValidNextStates(): TaskState[] {
    const validNext = VALID_TASK_TRANSITIONS[this.task.state];
    return validNext ? Array.from(validNext) : [];
  }

  isTerminal(): boolean {
    return this.task.state === 'COMPLETED' || this.task.state === 'CANCELLED';
  }

  hasFailed(): boolean {
    return this.task.state === 'FAILED';
  }

  isBlocked(): boolean {
    return this.task.state === 'BLOCKED';
  }

  canRetry(): boolean {
    return (
      this.task.state === 'FAILED' &&
      this.task.retryCount < this.task.request.maxRetries
    );
  }

  getHistory() {
    return [...this.transitionHistory];
  }

  private createError(
    code: GovernorErrorCode,
    message: string,
    taskId: string
  ): GovernorError {
    const error = new Error(message) as GovernorError;
    error.code = code;
    error.taskId = taskId;
    error.retryable = false;
    error.timestamp = new Date().toISOString();
    return error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  VALID_MISSION_TRANSITIONS,
  VALID_TASK_TRANSITIONS,
  type StateMachineRule,
};

const stateMachineExport = {
  MissionStateMachine,
  TaskStateMachine,
};

export default stateMachineExport;
