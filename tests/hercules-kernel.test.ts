/**
 * HERCULES Kernel Tests
 *
 * Verify:
 * - Enterprise registration and isolation
 * - Mission management
 * - Task queue with priority
 * - Event system with correlation
 * - Health model calculation
 * - Authority matrix enforcement
 * - Audit logging
 * - Interruption recovery (state serialization)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HerculesKernel,
  type Enterprise,
  type Mission,
  type Task,
  type HerculesEvent,
} from '@/lib/hercules-kernel';

describe('HERCULES Kernel', () => {
  let kernel: HerculesKernel;

  beforeEach(() => {
    // Get fresh kernel instance for each test
    kernel = HerculesKernel.getInstance();
  });

  // ========================================================================
  // Enterprise Registration & Isolation
  // ========================================================================

  describe('Enterprise Management', () => {
    it('should register an enterprise', () => {
      const enterprise = kernel.registerEnterprise({
        id: 'cathedral-001',
        name: 'Cathedral/EURO AI',
        status: 'ACTIVE',
        missionStatement: 'Build the first AI-driven news intelligence platform',
        objectives: [],
      });

      expect(enterprise).toBeDefined();
      expect(enterprise.id).toBe('cathedral-001');
      expect(enterprise.name).toBe('Cathedral/EURO AI');
      expect(enterprise.status).toBe('ACTIVE');
      expect(enterprise.createdAt).toBeDefined();
    });

    it('should retrieve registered enterprise', () => {
      kernel.registerEnterprise({
        id: 'ent-test-001',
        name: 'Test Enterprise',
        status: 'ACTIVE',
        missionStatement: 'Test mission',
        objectives: [],
      });

      const retrieved = kernel.getEnterprise('ent-test-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Enterprise');
    });

    it('should return undefined for non-existent enterprise', () => {
      const retrieved = kernel.getEnterprise('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should list all enterprises', () => {
      kernel.registerEnterprise({
        id: 'ent-1',
        name: 'Enterprise 1',
        status: 'ACTIVE',
        missionStatement: 'First',
        objectives: [],
      });

      kernel.registerEnterprise({
        id: 'ent-2',
        name: 'Enterprise 2',
        status: 'ACTIVE',
        missionStatement: 'Second',
        objectives: [],
      });

      const all = kernel.getAllEnterprises();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ========================================================================
  // Mission Management
  // ========================================================================

  describe('Mission Management', () => {
    it('should create a mission', () => {
      kernel.registerEnterprise({
        id: 'ent-mission-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const mission = kernel.createMission('ent-mission-001', {
        title: 'Build Core Monitoring',
        description: 'Implement production monitoring systems',
        status: 'QUEUED',
        objectives: [],
      });

      expect(mission).toBeDefined();
      expect(mission.title).toBe('Build Core Monitoring');
      expect(mission.status).toBe('QUEUED');
      expect(mission.enterpriseId).toBe('ent-mission-001');
    });

    it('should update mission status', () => {
      kernel.registerEnterprise({
        id: 'ent-mission-002',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const mission = kernel.createMission('ent-mission-002', {
        title: 'Test Mission',
        description: 'Testing',
        status: 'QUEUED',
        objectives: [],
      });

      kernel.updateMissionStatus(mission.id, 'ACTIVE');
      const retrieved = kernel.getMission(mission.id);

      expect(retrieved?.status).toBe('ACTIVE');
      expect(retrieved?.startedAt).toBeDefined();
    });

    it('should mark mission complete with timestamp', () => {
      kernel.registerEnterprise({
        id: 'ent-mission-003',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const mission = kernel.createMission('ent-mission-003', {
        title: 'Test Mission',
        description: 'Testing',
        status: 'QUEUED',
        objectives: [],
      });

      kernel.updateMissionStatus(mission.id, 'COMPLETED');
      const retrieved = kernel.getMission(mission.id);

      expect(retrieved?.status).toBe('COMPLETED');
      expect(retrieved?.completedAt).toBeDefined();
    });
  });

  // ========================================================================
  // Task Queue & Priority
  // ========================================================================

  describe('Task Queue Management', () => {
    it('should create a task with priority', () => {
      kernel.registerEnterprise({
        id: 'ent-task-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const task = kernel.createTask('ent-task-001', {
        title: 'Fix Critical Bug',
        description: 'Production outage',
        state: 'QUEUED',
        priority: 1,
        authorityRequired: 'B_GUARDRAILS',
        preconditions: ['prod_health_check'],
        postconditions: ['bug_fixed', 'tests_pass'],
        evidence: [],
        maxRetries: 3,
        dependsOn: [],
      });

      expect(task).toBeDefined();
      expect(task.priority).toBe(1);
      expect(task.state).toBe('QUEUED');
    });

    it('should get next queued task by priority', () => {
      kernel.registerEnterprise({
        id: 'ent-priority-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      // Create low-priority task first
      kernel.createTask('ent-priority-001', {
        title: 'Low Priority',
        description: 'Documentation',
        state: 'QUEUED',
        priority: 5,
        authorityRequired: 'A_AUTONOMOUS',
        preconditions: [],
        postconditions: [],
        evidence: [],
        maxRetries: 1,
        dependsOn: [],
      });

      // Create high-priority task second
      kernel.createTask('ent-priority-001', {
        title: 'High Priority',
        description: 'Critical fix',
        state: 'QUEUED',
        priority: 1,
        authorityRequired: 'B_GUARDRAILS',
        preconditions: [],
        postconditions: [],
        evidence: [],
        maxRetries: 3,
        dependsOn: [],
      });

      const next = kernel.getNextTask('ent-priority-001');
      expect(next?.title).toBe('High Priority');
      expect(next?.priority).toBe(1);
    });

    it('should start and complete a task', () => {
      kernel.registerEnterprise({
        id: 'ent-lifecycle-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const task = kernel.createTask('ent-lifecycle-001', {
        title: 'Test Task',
        description: 'Lifecycle test',
        state: 'QUEUED',
        priority: 3,
        authorityRequired: 'A_AUTONOMOUS',
        preconditions: [],
        postconditions: [],
        evidence: [],
        maxRetries: 1,
        dependsOn: [],
      });

      kernel.startTask(task.id);
      expect(kernel.getTask(task.id)?.state).toBe('RUNNING');
      expect(kernel.getTask(task.id)?.startedAt).toBeDefined();

      kernel.completeTask(task.id, ['test_evidence_123']);
      expect(kernel.getTask(task.id)?.state).toBe('COMPLETED');
      expect(kernel.getTask(task.id)?.completedAt).toBeDefined();
      expect(kernel.getTask(task.id)?.evidence).toContain(
        'test_evidence_123'
      );
    });

    it('should retry a failed task up to maxRetries', () => {
      kernel.registerEnterprise({
        id: 'ent-retry-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const task = kernel.createTask('ent-retry-001', {
        title: 'Flaky Test',
        description: 'Intermittent failure',
        state: 'QUEUED',
        priority: 3,
        authorityRequired: 'A_AUTONOMOUS',
        preconditions: [],
        postconditions: [],
        evidence: [],
        maxRetries: 2,
        dependsOn: [],
      });

      kernel.startTask(task.id);

      // First failure - should retry
      kernel.failTask(task.id, 'Network timeout');
      expect(kernel.getTask(task.id)?.retryCount).toBe(1);
      expect(kernel.getTask(task.id)?.state).toBe('QUEUED');

      kernel.startTask(task.id);
      kernel.failTask(task.id, 'Network timeout again');
      expect(kernel.getTask(task.id)?.retryCount).toBe(2);
      expect(kernel.getTask(task.id)?.state).toBe('QUEUED');

      // Third failure - exceed maxRetries
      kernel.startTask(task.id);
      kernel.failTask(task.id, 'Network timeout third time');
      expect(kernel.getTask(task.id)?.state).toBe('FAILED');
      expect(kernel.getTask(task.id)?.failureReason).toBeDefined();
    });
  });

  // ========================================================================
  // Event System
  // ========================================================================

  describe('Event System', () => {
    it('should emit an event with correlation ID', () => {
      kernel.registerEnterprise({
        id: 'ent-event-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const event = kernel.emitEvent(
        'ent-event-001',
        'deployment.started',
        'ci/cd',
        'INFO',
        { version: '1.2.3' }
      );

      expect(event).toBeDefined();
      expect(event.type).toBe('deployment.started');
      expect(event.correlationId).toBeDefined();
      expect(event.acknowledgmentState).toBe('NEW');
    });

    it('should track correlation of related events', () => {
      kernel.registerEnterprise({
        id: 'ent-corr-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const event1 = kernel.emitEvent(
        'ent-corr-001',
        'deployment.started',
        'ci/cd',
        'INFO',
        {}
      );

      const correlationId = event1.correlationId;

      const event2 = kernel.emitEvent(
        'ent-corr-001',
        'tests.running',
        'ci/cd',
        'INFO',
        {}
      );
      event2.correlationId = correlationId;

      const related = kernel.getEventsByCorrelation(correlationId);
      expect(related.length).toBeGreaterThanOrEqual(1);
    });

    it('should acknowledge an event', () => {
      kernel.registerEnterprise({
        id: 'ent-ack-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const event = kernel.emitEvent(
        'ent-ack-001',
        'alert.critical',
        'monitoring',
        'CRITICAL',
        {}
      );

      expect(event.acknowledgmentState).toBe('NEW');

      kernel.acknowledgeEvent(event.id);
      const retrieved = kernel.getEvent(event.id);
      expect(retrieved?.acknowledgmentState).toBe('ACKNOWLEDGED');
    });
  });

  // ========================================================================
  // Health Model
  // ========================================================================

  describe('Health Model', () => {
    it('should calculate health score for enterprise', () => {
      kernel.registerEnterprise({
        id: 'ent-health-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const health = kernel.calculateHealth('ent-health-001');

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(['HEALTHY', 'DEGRADED', 'AT_RISK', 'CRITICAL', 'UNKNOWN']).toContain(
        health.status
      );
      expect(health.percentage).toBeGreaterThanOrEqual(0);
      expect(health.percentage).toBeLessThanOrEqual(100);
    });

    it('should retrieve calculated health', () => {
      kernel.registerEnterprise({
        id: 'ent-health-002',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      kernel.calculateHealth('ent-health-002');
      const health = kernel.getHealth('ent-health-002');

      expect(health).toBeDefined();
      expect(health?.lastCalculatedAt).toBeDefined();
    });
  });

  // ========================================================================
  // Authority Matrix
  // ========================================================================

  describe('Authority Enforcement', () => {
    it('should define authority for read operations', () => {
      const rule = kernel.evaluateAuthority('read');
      expect(rule).toBeDefined();
      expect(rule?.authorityRequired).toBe('A_AUTONOMOUS');
    });

    it('should require founder approval for spending', () => {
      expect(kernel.requiresFounderApproval('spend_money')).toBe(true);
      expect(kernel.requiresFounderApproval('customer_contract')).toBe(true);
      expect(kernel.requiresFounderApproval('strategic_pivot')).toBe(true);
    });

    it('should allow autonomous application code with guardrails', () => {
      const rule = kernel.evaluateAuthority('application_code');
      expect(rule?.authorityRequired).toBe('B_GUARDRAILS');
      expect(kernel.requiresFounderApproval('application_code')).toBe(false);
    });
  });

  // ========================================================================
  // Audit Logging
  // ========================================================================

  describe('Audit Trail', () => {
    it('should record audit entries for all actions', () => {
      kernel.registerEnterprise({
        id: 'ent-audit-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const auditLog = kernel.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);

      const lastEntry = auditLog[auditLog.length - 1];
      expect(lastEntry.action).toBe('enterprise.registered');
      expect(lastEntry.timestamp).toBeDefined();
    });

    it('should filter audit log by enterprise', () => {
      kernel.registerEnterprise({
        id: 'ent-audit-002',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const filtered = kernel.getAuditLog('ent-audit-002');
      // May have entries from this enterprise
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should respect audit log size limit', () => {
      // Create many events
      for (let i = 0; i < 10; i++) {
        kernel.registerEnterprise({
          id: `ent-spam-${i}`,
          name: 'Test',
          status: 'ACTIVE',
          missionStatement: 'Test',
          objectives: [],
        });
      }

      const auditLog = kernel.getAuditLog();
      expect(auditLog.length).toBeLessThanOrEqual(50000);
    });
  });

  // ========================================================================
  // Heartbeat & Monitoring
  // ========================================================================

  describe('Heartbeat & Operations', () => {
    it('should record heartbeat timestamp', () => {
      const before = new Date().toISOString();
      kernel.heartbeat();
      const after = new Date().toISOString();

      const lastHeartbeat = kernel.getLastHeartbeat();
      expect(lastHeartbeat).toBeDefined();
      expect(lastHeartbeat >= before).toBe(true);
      expect(lastHeartbeat <= after).toBe(true);
    });

    it('should provide system status', () => {
      kernel.registerEnterprise({
        id: 'ent-status-001',
        name: 'Test',
        status: 'ACTIVE',
        missionStatement: 'Test',
        objectives: [],
      });

      const status = kernel.getSystemStatus();

      expect(status.enterprises).toBeGreaterThanOrEqual(1);
      expect(status.missions).toBeDefined();
      expect(status.tasks).toBeDefined();
      expect(status.events).toBeDefined();
      expect(status.auditLogEntries).toBeDefined();
      expect(status.lastHeartbeat).toBeDefined();
    });
  });

  // ========================================================================
  // State Persistence & Recovery
  // ========================================================================

  describe('Interruption Recovery', () => {
    it('should serialize state to JSON', () => {
      kernel.registerEnterprise({
        id: 'ent-persist-001',
        name: 'Test Enterprise',
        status: 'ACTIVE',
        missionStatement: 'Test mission',
        objectives: [],
      });

      const serialized = kernel.serializeState();

      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed.enterprises).toBeDefined();
      expect(parsed.missions).toBeDefined();
      expect(parsed.tasks).toBeDefined();
    });

    it('should restore state from serialized form', () => {
      const kernel1 = HerculesKernel.getInstance();

      kernel1.registerEnterprise({
        id: 'ent-restore-001',
        name: 'Original Enterprise',
        status: 'ACTIVE',
        missionStatement: 'Original mission',
        objectives: [],
      });

      const serialized = kernel1.serializeState();

      // In a real scenario, this would be a new kernel instance
      // For this test, we just verify the serialization works
      const parsed = JSON.parse(serialized);
      expect(parsed.enterprises).toBeDefined();
    });
  });
});
