/**
 * Governor OS Foundation — Mission Model
 * Implements mission state machine with deterministic state transitions.
 * Mission is the atomic unit of work orchestrated by Governor OS.
 */

import { Mission, MissionStatus, Task, TaskStatus } from './types';

/**
 * Mission state machine: valid transitions
 */
const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  QUEUED: ['PLANNING'],
  PLANNING: ['EXECUTING', 'FAILED'],
  EXECUTING: ['VERIFYING', 'FAILED'],
  VERIFYING: ['COMPLETE', 'FAILED'],
  COMPLETE: [], // Terminal state
  FAILED: ['PLANNING'], // Can retry after failure
  ESCALATED: [], // Terminal state (requires Founder decision)
};

/**
 * Task state machine: valid transitions
 */
const TASK_VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  QUEUED: ['EXECUTING', 'SKIPPED'],
  EXECUTING: ['VERIFYING', 'FAILED'],
  VERIFYING: ['COMPLETE', 'FAILED'],
  COMPLETE: [], // Terminal state
  FAILED: ['EXECUTING'], // Can retry
  SKIPPED: [], // Terminal state (not executed)
  ESCALATED: [], // Terminal state (requires Founder decision)
};

/**
 * Mission class: state machine and lifecycle management
 */
export class MissionModel {
  private mission: Mission;

  constructor(mission: Mission) {
    this.mission = mission;
  }

  /**
   * Create a new mission with deterministic ID
   */
  static create(
    missionClass: string,
    description: string,
    owner: string,
    authorityLevel: string,
    taskList: Task[] = []
  ): Mission {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const nonce = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const mission_id = `M-${dateStr}-${nonce}`;

    return {
      mission_id,
      created_at: timestamp,
      class: missionClass as any,
      description,
      owner,
      authority_level: authorityLevel as any,
      status: 'QUEUED',
      task_list: taskList,
      decisions: {},
    };
  }

  /**
   * Create a new task within this mission
   */
  addTask(
    taskClass: string,
    description: string,
    capabilityRequired: string,
    command?: string,
    verificationRule?: string
  ): Task {
    const sequence = this.mission.task_list.length + 1;
    const nonce = String(sequence).padStart(2, '0');
    const task_id = `${this.mission.mission_id}-${nonce}`;

    const task: Task = {
      task_id,
      mission_id: this.mission.mission_id,
      sequence,
      class: taskClass as any,
      description,
      capability_required: capabilityRequired,
      command,
      verification_rule: verificationRule,
      status: 'QUEUED',
    };

    this.mission.task_list.push(task);
    return task;
  }

  /**
   * Transition mission to a new state (with validation)
   */
  transitionTo(newStatus: MissionStatus, reason?: string): boolean {
    const currentStatus = this.mission.status;

    // Check if transition is valid
    const validTransitions = VALID_TRANSITIONS[currentStatus];
    if (!validTransitions.includes(newStatus)) {
      console.error(
        `Invalid mission transition: ${currentStatus} -> ${newStatus}`
      );
      return false;
    }

    // Record decision if provided
    if (reason) {
      const decisionId = `${this.mission.mission_id}-D${Object.keys(this.mission.decisions).length + 1}`;
      this.mission.decisions[decisionId] = reason;
    }

    this.mission.status = newStatus;
    return true;
  }

  /**
   * Transition a task within this mission to a new state
   */
  transitionTaskTo(taskId: string, newStatus: TaskStatus, exitCode?: number): boolean {
    const task = this.mission.task_list.find((t) => t.task_id === taskId);
    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return false;
    }

    // Check if transition is valid
    const validTransitions = TASK_VALID_TRANSITIONS[task.status];
    if (!validTransitions.includes(newStatus)) {
      console.error(
        `Invalid task transition: ${task.status} -> ${newStatus} for ${taskId}`
      );
      return false;
    }

    task.status = newStatus;
    if (exitCode !== undefined) {
      task.exit_code = exitCode;
    }

    return true;
  }

  /**
   * Record task execution result
   */
  recordTaskResult(
    taskId: string,
    exitCode: number,
    stdout: string,
    stderr: string
  ): boolean {
    const task = this.mission.task_list.find((t) => t.task_id === taskId);
    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return false;
    }

    task.exit_code = exitCode;
    task.stdout = stdout.length > 50000 ? stdout.slice(0, 50000) : stdout;
    task.stderr = stderr.length > 50000 ? stderr.slice(0, 50000) : stderr;
    task.output_size = (stdout.length + stderr.length);

    return true;
  }

  /**
   * Record task verification result
   */
  recordVerification(taskId: string, passed: boolean, result: string): boolean {
    const task = this.mission.task_list.find((t) => t.task_id === taskId);
    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return false;
    }

    task.verified = passed;
    task.verification_result = result as any;

    return true;
  }

  /**
   * Complete mission with final verdict
   */
  complete(
    verdict: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'ESCALATED',
    reason: string,
    fitnessScore?: number
  ): boolean {
    if (!this.transitionTo('COMPLETE', reason)) {
      return false;
    }

    this.mission.final_verdict = verdict;
    this.mission.completion_reason = reason;
    if (fitnessScore !== undefined) {
      this.mission.fitness_post_execution = fitnessScore;
    }

    return true;
  }

  /**
   * Escalate mission to Founder (terminal state, needs human decision)
   */
  escalate(reason: string): boolean {
    if (!this.transitionTo('ESCALATED', reason)) {
      return false;
    }

    this.mission.completion_reason = `Escalated: ${reason}`;
    return true;
  }

  /**
   * Get mission state (deterministic fields only, no volatiles)
   */
  toJSON(): Mission {
    return {
      mission_id: this.mission.mission_id,
      created_at: this.mission.created_at,
      class: this.mission.class,
      description: this.mission.description,
      owner: this.mission.owner,
      authority_level: this.mission.authority_level,
      status: this.mission.status,
      task_list: this.mission.task_list,
      decisions: this.mission.decisions,
      fitness_baseline: this.mission.fitness_baseline,
      fitness_post_execution: this.mission.fitness_post_execution,
      final_verdict: this.mission.final_verdict,
      completion_reason: this.mission.completion_reason,
    };
  }

  /**
   * Get all tasks in mission
   */
  getTasks(): Task[] {
    return this.mission.task_list;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.mission.task_list.find((t) => t.task_id === taskId);
  }

  /**
   * Count tasks by status
   */
  countTasksByStatus(status: TaskStatus): number {
    return this.mission.task_list.filter((t) => t.status === status).length;
  }

  /**
   * Check if mission is in terminal state
   */
  isTerminal(): boolean {
    return ['COMPLETE', 'FAILED', 'ESCALATED'].includes(this.mission.status);
  }

  /**
   * Check if all tasks are complete or skipped
   */
  allTasksComplete(): boolean {
    return this.mission.task_list.every(
      (t) => t.status === 'COMPLETE' || t.status === 'SKIPPED'
    );
  }

  /**
   * Check if any task failed
   */
  hasFailedTasks(): boolean {
    return this.mission.task_list.some((t) => t.status === 'FAILED');
  }

  /**
   * Get next queued task in sequence
   */
  getNextQueuedTask(): Task | undefined {
    return this.mission.task_list.find(
      (t) => t.status === 'QUEUED' && t.sequence > 0
    );
  }

  /**
   * Serialize for storage (deterministic fields only)
   */
  serialize(): string {
    const deterministic = {
      mission_id: this.mission.mission_id,
      created_at: this.mission.created_at,
      class: this.mission.class,
      description: this.mission.description,
      owner: this.mission.owner,
      authority_level: this.mission.authority_level,
      status: this.mission.status,
      decisions: this.mission.decisions,
      fitness_baseline: this.mission.fitness_baseline,
      fitness_post_execution: this.mission.fitness_post_execution,
      final_verdict: this.mission.final_verdict,
      completion_reason: this.mission.completion_reason,
    };

    return JSON.stringify(deterministic);
  }

  /**
   * Deserialize from storage
   */
  static deserialize(json: string): Mission {
    const data = JSON.parse(json);
    return {
      mission_id: data.mission_id,
      created_at: data.created_at,
      class: data.class,
      description: data.description,
      owner: data.owner,
      authority_level: data.authority_level,
      status: data.status,
      task_list: data.task_list || [],
      decisions: data.decisions || {},
      fitness_baseline: data.fitness_baseline,
      fitness_post_execution: data.fitness_post_execution,
      final_verdict: data.final_verdict,
      completion_reason: data.completion_reason,
    };
  }
}

/**
 * Validate mission integrity (all task IDs point to correct mission)
 */
export function validateMissionIntegrity(mission: Mission): boolean {
  return mission.task_list.every((task) => task.mission_id === mission.mission_id);
}
