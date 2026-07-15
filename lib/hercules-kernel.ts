/**
 * HERCULES Kernel — The unified core of the living enterprise organism.
 *
 * Responsibilities:
 * - Enterprise registry and multi-tenant isolation
 * - Mission and objective management
 * - Task queue with priority + state management
 * - Event bus with correlation tracking
 * - Authority matrix enforcement
 * - Unified health model
 * - Audit trail (all decisions + actions)
 * - Interruption recovery (save/restore state)
 *
 * The kernel is the only place governance decisions are computed.
 * All organs call through the kernel.
 */

import type { UUID } from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AuthorityClass = 'A_AUTONOMOUS' | 'B_GUARDRAILS' | 'C_FOUNDER_ONLY';

export type TaskState =
  | 'QUEUED'
  | 'RUNNING'
  | 'BLOCKED'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type HealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'AT_RISK'
  | 'CRITICAL'
  | 'UNKNOWN';

export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type ActionClass =
  | 'read'
  | 'analyze'
  | 'test'
  | 'document'
  | 'local_reversible'
  | 'application_code'
  | 'dependency_update'
  | 'test_migration'
  | 'spend_money'
  | 'customer_contract'
  | 'strategic_pivot';

// Enterprise & Mission

export interface Enterprise {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  missionStatement: string;
  objectives: Objective[];
  createdAt: string;
  lastActiveAt: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED';
  priority: 1 | 2 | 3 | 4 | 5;
  targetDate?: string;
  evidence: string[];
}

export interface Mission {
  id: string;
  enterpriseId: string;
  title: string;
  description: string;
  status: 'QUEUED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  objectives: string[]; // objective IDs
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// Task Management

export interface Task {
  id: string;
  enterpriseId: string;
  title: string;
  description: string;
  state: TaskState;
  priority: 1 | 2 | 3 | 4 | 5;
  authorityRequired: AuthorityClass;
  preconditions: string[];
  postconditions: string[];
  evidence: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  dependsOn: string[]; // other task IDs
  owner?: string;
}

// Event System

export interface HerculesEvent {
  id: string;
  correlationId: string;
  type: string;
  source: string;
  severity: EventSeverity;
  timestamp: string;
  enterpriseId: string;
  payload: Record<string, unknown>;
  acknowledgmentState: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  retryCount: number;
  tags: string[];
}

// Health Model

export interface HealthScore {
  status: HealthStatus;
  percentage: number;
  factors: HealthFactor[];
  lastCalculatedAt: string;
}

export interface HealthFactor {
  name: string;
  status: HealthStatus;
  value: number;
  threshold: number;
  source: string;
  lastUpdatedAt: string;
}

// Authority & Audit

export interface AuthorityRule {
  action: ActionClass;
  authorityRequired: AuthorityClass;
  rationale: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  enterpriseId: string;
  action: string;
  actor: string;
  authorityClass: AuthorityClass;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  reason?: string;
  evidence: string[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// HERCULES KERNEL SERVICE
// ============================================================================

export class HerculesKernel {
  private static instance: HerculesKernel;

  // Persistent state
  private enterprises: Map<string, Enterprise> = new Map();
  private missions: Map<string, Mission> = new Map();
  private tasks: Map<string, Task> = new Map();
  private events: HerculesEvent[] = [];
  private auditLog: AuditEntry[] = [];
  private authorityMatrix: Map<ActionClass, AuthorityRule> = new Map();
  private healthScores: Map<string, HealthScore> = new Map();

  // Transient state
  private lastHeartbeat: string = new Date().toISOString();
  private heartbeatIntervalMs: number = 30000; // 30 seconds
  private taskQueue: string[] = []; // task IDs in priority order

  private constructor() {
    this.initializeAuthorityMatrix();
  }

  static getInstance(): HerculesKernel {
    if (!HerculesKernel.instance) {
      HerculesKernel.instance = new HerculesKernel();
    }
    return HerculesKernel.instance;
  }

  // ========================================================================
  // ENTERPRISE MANAGEMENT
  // ========================================================================

  registerEnterprise(enterprise: Omit<Enterprise, 'createdAt' | 'lastActiveAt'>): Enterprise {
    const now = new Date().toISOString();
    const registeredEnterprise: Enterprise = {
      ...enterprise,
      createdAt: now,
      lastActiveAt: now,
    };

    this.enterprises.set(enterprise.id, registeredEnterprise);

    // Audit the registration
    this.recordAudit({
      action: 'enterprise.registered',
      actor: 'KERNEL',
      authorityClass: 'A_AUTONOMOUS',
      result: 'SUCCESS',
      evidence: [`Registered enterprise: ${enterprise.id}`],
      metadata: { enterprise: enterprise.name },
    } as any);

    return registeredEnterprise;
  }

  getEnterprise(enterpriseId: string): Enterprise | undefined {
    return this.enterprises.get(enterpriseId);
  }

  getAllEnterprises(): Enterprise[] {
    return Array.from(this.enterprises.values());
  }

  // ========================================================================
  // MISSION MANAGEMENT
  // ========================================================================

  createMission(
    enterpriseId: string,
    mission: Omit<Mission, 'id' | 'createdAt' | 'enterpriseId'>
  ): Mission {
    const now = new Date().toISOString();
    const missionId = `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newMission: Mission = {
      ...mission,
      id: missionId,
      createdAt: now,
      enterpriseId,
    };

    this.missions.set(missionId, newMission);

    this.recordAudit({
      action: 'mission.created',
      actor: 'KERNEL',
      authorityClass: 'B_GUARDRAILS',
      result: 'SUCCESS',
      evidence: [missionId],
      metadata: { mission: mission.title },
    });

    return newMission;
  }

  getMission(missionId: string): Mission | undefined {
    return this.missions.get(missionId);
  }

  updateMissionStatus(missionId: string, status: Mission['status']): void {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    mission.status = status;
    if (status === 'ACTIVE' && !mission.startedAt) {
      mission.startedAt = new Date().toISOString();
    }
    if (status === 'COMPLETED' && !mission.completedAt) {
      mission.completedAt = new Date().toISOString();
    }

    this.recordAudit({
      action: 'mission.status_updated',
      actor: 'KERNEL',
      authorityClass: 'B_GUARDRAILS',
      result: 'SUCCESS',
      evidence: [missionId],
      metadata: { newStatus: status },
    });
  }

  // ========================================================================
  // TASK MANAGEMENT (Priority Queue)
  // ========================================================================

  createTask(enterpriseId: string, task: Omit<Task, 'id' | 'createdAt' | 'retryCount' | 'enterpriseId'>): Task {
    const now = new Date().toISOString();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTask: Task = {
      ...task,
      id: taskId,
      createdAt: now,
      state: 'QUEUED',
      retryCount: 0,
      enterpriseId,
    };

    this.tasks.set(taskId, newTask);
    this.enqueueTask(taskId, task.priority);

    this.recordAudit({
      action: 'task.created',
      actor: 'KERNEL',
      authorityClass: 'B_GUARDRAILS',
      result: 'SUCCESS',
      evidence: [taskId],
      metadata: { priority: task.priority },
    });

    return newTask;
  }

  private enqueueTask(taskId: string, priority: number): void {
    // Simple priority queue: lower number = higher priority
    this.taskQueue.push(taskId);
    this.taskQueue.sort((a, b) => {
      const taskA = this.tasks.get(a);
      const taskB = this.tasks.get(b);
      if (!taskA || !taskB) return 0;
      return taskA.priority - taskB.priority;
    });
  }

  getNextTask(enterpriseId: string): Task | undefined {
    for (const taskId of this.taskQueue) {
      const task = this.tasks.get(taskId);
      if (
        task &&
        task.enterpriseId === enterpriseId &&
        task.state === 'QUEUED' &&
        this.preconditionsMet(task)
      ) {
        return task;
      }
    }
    return undefined;
  }

  private preconditionsMet(task: Task): boolean {
    // Simplified: all preconditions must be true
    // In production, evaluate actual state
    return true;
  }

  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.state !== 'QUEUED') throw new Error(`Task not queued: ${taskId}`);

    task.state = 'RUNNING';
    task.startedAt = new Date().toISOString();

    this.recordAudit({
      action: 'task.started',
      actor: 'KERNEL',
      authorityClass: 'A_AUTONOMOUS',
      result: 'SUCCESS',
      evidence: [taskId],
    });
  }

  completeTask(taskId: string, evidence: string[]): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.state = 'COMPLETED';
    task.completedAt = new Date().toISOString();
    task.evidence.push(...evidence);

    // Remove from queue
    this.taskQueue = this.taskQueue.filter((id) => id !== taskId);

    this.recordAudit({
      action: 'task.completed',
      actor: 'KERNEL',
      authorityClass: 'A_AUTONOMOUS',
      result: 'SUCCESS',
      evidence: [taskId, ...evidence],
    });
  }

  failTask(taskId: string, reason: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    // Retry logic
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.state = 'QUEUED';
      this.enqueueTask(taskId, task.priority);

      this.recordAudit({
        action: 'task.retry',
        actor: 'KERNEL',
        authorityClass: 'A_AUTONOMOUS',
        result: 'SUCCESS',
        evidence: [taskId],
        metadata: { retryCount: task.retryCount, maxRetries: task.maxRetries },
      });
    } else {
      task.state = 'FAILED';
      task.failureReason = reason;

      this.recordAudit({
        action: 'task.failed',
        actor: 'KERNEL',
        authorityClass: 'B_GUARDRAILS',
        result: 'FAILED',
        reason,
        evidence: [taskId],
      });
    }
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  emitEvent(
    enterpriseId: string,
    type: string,
    source: string,
    severity: EventSeverity,
    payload: Record<string, unknown>,
    tags: string[] = []
  ): HerculesEvent {
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const event: HerculesEvent = {
      id: eventId,
      correlationId,
      type,
      source,
      severity,
      timestamp: new Date().toISOString(),
      enterpriseId,
      payload,
      acknowledgmentState: 'NEW',
      retryCount: 0,
      tags,
    };

    this.events.push(event);

    // Keep only last 10,000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    return event;
  }

  getEvent(eventId: string): HerculesEvent | undefined {
    return this.events.find((e) => e.id === eventId);
  }

  getEventsByCorrelation(correlationId: string): HerculesEvent[] {
    return this.events.filter((e) => e.correlationId === correlationId);
  }

  acknowledgeEvent(eventId: string): void {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.acknowledgmentState = 'ACKNOWLEDGED';
    }
  }

  // ========================================================================
  // HEALTH MODEL
  // ========================================================================

  calculateHealth(enterpriseId: string): HealthScore {
    const factors: HealthFactor[] = [];

    // Aggregate health from all organs
    // TODO: Connect to actual monitoring systems

    const healthyFactors = factors.filter((f) => f.status === 'HEALTHY').length;
    const percentage = factors.length > 0 ? (healthyFactors / factors.length) * 100 : 0;

    let status: HealthStatus = 'UNKNOWN';
    if (percentage >= 90) status = 'HEALTHY';
    else if (percentage >= 70) status = 'DEGRADED';
    else if (percentage >= 50) status = 'AT_RISK';
    else if (percentage >= 0) status = 'CRITICAL';

    const health: HealthScore = {
      status,
      percentage: Math.round(percentage),
      factors,
      lastCalculatedAt: new Date().toISOString(),
    };

    this.healthScores.set(enterpriseId, health);
    return health;
  }

  getHealth(enterpriseId: string): HealthScore | undefined {
    return this.healthScores.get(enterpriseId);
  }

  // ========================================================================
  // AUTHORITY MATRIX & ENFORCEMENT
  // ========================================================================

  private initializeAuthorityMatrix(): void {
    const rules: [ActionClass, AuthorityRule][] = [
      [
        'read',
        {
          action: 'read',
          authorityRequired: 'A_AUTONOMOUS',
          rationale: 'Read operations are always safe',
          riskLevel: 'LOW',
        },
      ],
      [
        'analyze',
        {
          action: 'analyze',
          authorityRequired: 'A_AUTONOMOUS',
          rationale: 'Analysis produces no side effects',
          riskLevel: 'LOW',
        },
      ],
      [
        'test',
        {
          action: 'test',
          authorityRequired: 'A_AUTONOMOUS',
          rationale: 'Tests run in isolation',
          riskLevel: 'LOW',
        },
      ],
      [
        'application_code',
        {
          action: 'application_code',
          authorityRequired: 'B_GUARDRAILS',
          rationale: 'Requires test coverage and CI verification',
          riskLevel: 'MEDIUM',
        },
      ],
      [
        'dependency_update',
        {
          action: 'dependency_update',
          authorityRequired: 'B_GUARDRAILS',
          rationale: 'Requires security scan and regression tests',
          riskLevel: 'MEDIUM',
        },
      ],
      [
        'spend_money',
        {
          action: 'spend_money',
          authorityRequired: 'C_FOUNDER_ONLY',
          rationale: 'Financial decisions require Founder approval',
          riskLevel: 'CRITICAL',
        },
      ],
      [
        'customer_contract',
        {
          action: 'customer_contract',
          authorityRequired: 'C_FOUNDER_ONLY',
          rationale: 'Legal commitments require Founder approval',
          riskLevel: 'CRITICAL',
        },
      ],
      [
        'strategic_pivot',
        {
          action: 'strategic_pivot',
          authorityRequired: 'C_FOUNDER_ONLY',
          rationale: 'Strategic changes require Founder approval',
          riskLevel: 'CRITICAL',
        },
      ],
    ];

    rules.forEach(([action, rule]) => {
      this.authorityMatrix.set(action, rule);
    });
  }

  evaluateAuthority(action: ActionClass): AuthorityRule | undefined {
    return this.authorityMatrix.get(action);
  }

  requiresFounderApproval(action: ActionClass): boolean {
    const rule = this.authorityMatrix.get(action);
    return rule?.authorityRequired === 'C_FOUNDER_ONLY';
  }

  // ========================================================================
  // AUDIT LOGGING
  // ========================================================================

  private recordAudit(
    partial: Partial<Omit<AuditEntry, 'id' | 'timestamp' | 'enterpriseId'>>
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      enterpriseId: 'SYSTEM', // TODO: pull from context
      action: partial.action || 'unknown',
      actor: partial.actor || 'SYSTEM',
      authorityClass: partial.authorityClass || 'A_AUTONOMOUS',
      result: partial.result || 'SUCCESS',
      evidence: partial.evidence || [],
      metadata: partial.metadata || {},
    };

    this.auditLog.push(entry);

    // Keep only last 50,000 entries
    if (this.auditLog.length > 50000) {
      this.auditLog = this.auditLog.slice(-50000);
    }

    return entry;
  }

  getAuditLog(enterpriseId?: string, limit: number = 100): AuditEntry[] {
    let filtered = this.auditLog;
    if (enterpriseId) {
      filtered = filtered.filter((e) => e.enterpriseId === enterpriseId);
    }
    return filtered.slice(-limit);
  }

  // ========================================================================
  // HEARTBEAT & STATE MANAGEMENT
  // ========================================================================

  heartbeat(): void {
    this.lastHeartbeat = new Date().toISOString();

    // Process events
    this.processEvents();

    // Check for stalled tasks
    this.detectStalledTasks();

    // Calculate health
    for (const enterprise of this.enterprises.values()) {
      this.calculateHealth(enterprise.id);
      enterprise.lastActiveAt = this.lastHeartbeat;
    }
  }

  private processEvents(): void {
    // TODO: Connect to actual event handlers
  }

  private detectStalledTasks(): void {
    const now = Date.now();
    const stalledThresholdMs = 300000; // 5 minutes

    for (const task of this.tasks.values()) {
      if (
        task.state === 'RUNNING' &&
        task.startedAt &&
        now - new Date(task.startedAt).getTime() > stalledThresholdMs
      ) {
        this.emitEvent(
          task.enterpriseId,
          'task.stalled',
          'kernel',
          'WARNING',
          { taskId: task.id },
          ['stalled', 'task']
        );
      }
    }
  }

  getLastHeartbeat(): string {
    return this.lastHeartbeat;
  }

  // ========================================================================
  // STATE PERSISTENCE (for interruption recovery)
  // ========================================================================

  serializeState(): string {
    const state = {
      enterprises: Array.from(this.enterprises.entries()),
      missions: Array.from(this.missions.entries()),
      tasks: Array.from(this.tasks.entries()),
      events: this.events.slice(-1000), // Keep last 1000 events
      auditLog: this.auditLog.slice(-10000), // Keep last 10000 entries
      taskQueue: this.taskQueue,
      lastHeartbeat: this.lastHeartbeat,
    };

    return JSON.stringify(state);
  }

  deserializeState(jsonState: string): void {
    const state = JSON.parse(jsonState);

    this.enterprises = new Map(state.enterprises);
    this.missions = new Map(state.missions);
    this.tasks = new Map(state.tasks);
    this.events = state.events;
    this.auditLog = state.auditLog;
    this.taskQueue = state.taskQueue;
    this.lastHeartbeat = state.lastHeartbeat;

    console.log('[HERCULES] State restored from checkpoint');
  }

  // ========================================================================
  // PUBLIC ACCESSORS (for testing)
  // ========================================================================

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  // ========================================================================
  // DEBUG & INSPECTION
  // ========================================================================

  getSystemStatus() {
    return {
      enterprises: this.enterprises.size,
      missions: this.missions.size,
      tasks: this.tasks.size,
      queuedTasks: this.taskQueue.length,
      events: this.events.length,
      auditLogEntries: this.auditLog.length,
      lastHeartbeat: this.lastHeartbeat,
      allEnterprises: Array.from(this.enterprises.values()).map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        health: this.healthScores.get(e.id),
      })),
    };
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const getKernel = () => HerculesKernel.getInstance();

export function initializeKernel(): HerculesKernel {
  const kernel = HerculesKernel.getInstance();
  return kernel;
}
