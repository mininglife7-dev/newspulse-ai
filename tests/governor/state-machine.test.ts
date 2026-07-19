/**
 * Governor OS — State Machine Tests
 *
 * Prove:
 * - Valid transitions work
 * - Invalid transitions are rejected
 * - State changes are audited
 * - Terminal states cannot transition
 * - Preconditions are enforced
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MissionStateMachine, TaskStateMachine } from '@/lib/governor/state-machine';
import type { Mission, Task } from '@/lib/governor/contracts';

// ============================================================================
// TEST DATA
// ============================================================================

function createTestMission(): Mission {
  return {
    schemaVersion: '1.0.0',
    id: 'mission_test_001',
    state: 'CREATED',
    request: {
      schemaVersion: '1.0.0',
      title: 'Test Mission',
      description: 'A mission for testing',
      objectives: ['Objective 1'],
      successCriteria: ['Success Criterion 1'],
      contextId: 'context_001',
      requestedBy: 'test-user',
      requestedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    tasks: [],
    evidence: [],
    audit: [],
  };
}

function createTestTask(): Task {
  return {
    schemaVersion: '1.0.0',
    id: 'task_test_001',
    state: 'QUEUED',
    request: {
      schemaVersion: '1.0.0',
      missionId: 'mission_test_001',
      title: 'Test Task',
      description: 'A task for testing',
      taskType: 'test',
      parameters: {},
      requiredAuthority: 'A_AUTONOMOUS',
      evidenceRequired: ['test-output'],
      successCriteria: [{ name: 'Task succeeds', description: 'Task must succeed', condition: 'success', required: true }],
      priority: 1,
      maxRetries: 3,
      timeoutMs: 60000,
    },
    createdAt: new Date().toISOString(),
    retryCount: 0,
    evidence: [],
    audit: [],
  };
}

// ============================================================================
// MISSION STATE MACHINE TESTS
// ============================================================================

describe('MissionStateMachine', () => {
  let mission: Mission;
  let sm: MissionStateMachine;

  beforeEach(() => {
    mission = createTestMission();
    sm = new MissionStateMachine(mission);
  });

  describe('Valid Transitions', () => {
    it('should allow CREATED → VALIDATED', async () => {
      await sm.transitionTo('VALIDATED', 'Validating mission', 'test-user');
      expect(sm.getState()).toBe('VALIDATED');
    });

    it('should allow VALIDATED → PLANNED', async () => {
      mission.state = 'VALIDATED';
      mission.tasks = ['task_001'];
      sm = new MissionStateMachine(mission);

      await sm.transitionTo('PLANNED', 'Planning mission', 'test-user');
      expect(sm.getState()).toBe('PLANNED');
    });

    it('should allow PLANNED → AUTHORIZED', async () => {
      mission.state = 'PLANNED';
      mission.tasks = ['task_001'];
      sm = new MissionStateMachine(mission);

      await sm.transitionTo(
        'AUTHORIZED',
        'Authorizing mission',
        'test-user',
        {
          policyDecision: {
            schemaVersion: '1.0.0',
            id: 'policy_001',
            taskId: 'task_001',
            decision: 'ALLOW',
            authority: 'A_AUTONOMOUS',
            rule: {
              schemaVersion: '1.0.0',
              action: 'test',
              requiredAuthority: 'A_AUTONOMOUS',
              rationale: 'Test action',
              riskLevel: 'LOW',
            },
            reasoning: 'Test policy',
            madeAt: new Date().toISOString(),
            madeBy: 'test-user',
            evidence: [],
          },
        }
      );

      expect(sm.getState()).toBe('AUTHORIZED');
    });

    it('should allow AUTHORIZED → EXECUTING', async () => {
      mission.state = 'AUTHORIZED';
      mission.tasks = ['task_001'];
      sm = new MissionStateMachine(mission);

      await sm.transitionTo(
        'EXECUTING',
        'Starting execution',
        'test-user',
        {
          policyDecision: {
            schemaVersion: '1.0.0',
            id: 'policy_001',
            taskId: 'task_001',
            decision: 'ALLOW',
            authority: 'A_AUTONOMOUS',
            rule: {
              schemaVersion: '1.0.0',
              action: 'test',
              requiredAuthority: 'A_AUTONOMOUS',
              rationale: 'Test action',
              riskLevel: 'LOW',
            },
            reasoning: 'Test policy',
            madeAt: new Date().toISOString(),
            madeBy: 'test-user',
            evidence: [],
          },
        }
      );

      expect(sm.getState()).toBe('EXECUTING');
      expect(mission.startedAt).toBeDefined();
    });

    it('should allow EXECUTING → VERIFYING', async () => {
      mission.state = 'EXECUTING';
      mission.startedAt = new Date().toISOString();
      mission.evidence = ['evidence_001'];
      sm = new MissionStateMachine(mission);

      await sm.transitionTo(
        'VERIFYING',
        'Starting verification',
        'test-user',
        {
          executionResult: {
            schemaVersion: '1.0.0',
            taskId: 'task_001',
            success: true,
            output: { status: 'success' },
            executedAt: new Date().toISOString(),
            executedBy: 'test-executor',
            durationMs: 1000,
            evidence: [
              {
                schemaVersion: '1.0.0',
                id: 'evidence_001',
                missionId: 'mission_test_001',
                taskId: 'task_001',
                type: 'test-output',
                source: 'test-runner',
                content: 'Test output',
                contentHash: 'abc123',
                collectedAt: new Date().toISOString(),
                producer: 'test-executor',
                relationship: 'proves-success',
                sensitivity: 'INTERNAL',
                isRedacted: false,
                provenance: 'direct',
                tags: ['test'],
              },
            ],
          },
        }
      );

      expect(sm.getState()).toBe('VERIFYING');
    });

    it('should allow VERIFYING → COMPLETED', async () => {
      mission.state = 'VERIFYING';
      mission.evidence = ['evidence_001'];
      sm = new MissionStateMachine(mission);

      await sm.transitionTo(
        'COMPLETED',
        'Mission succeeded',
        'test-user',
        {
          verificationResult: {
            schemaVersion: '1.0.0',
            taskId: 'task_001',
            status: 'VERIFIED',
            confidence: 100,
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'test-verifier',
            supportingEvidence: ['evidence_001'],
            gaps: [],
            contradictions: [],
            reasoning: 'All evidence supports success',
          },
        }
      );

      expect(sm.getState()).toBe('COMPLETED');
      expect(mission.completedAt).toBeDefined();
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject CREATED → COMPLETED (skipping states)', async () => {
      expect(async () => {
        await sm.transitionTo('COMPLETED', 'Trying to skip states', 'test-user');
      }).rejects.toThrow(/INVALID_STATE_TRANSITION/);
    });

    it('should reject COMPLETED → anything (terminal state)', async () => {
      mission.state = 'COMPLETED';
      mission.completedAt = new Date().toISOString();
      sm = new MissionStateMachine(mission);

      expect(async () => {
        await sm.transitionTo('FAILED', 'Trying to transition from terminal state', 'test-user');
      }).rejects.toThrow(/INVALID_STATE_TRANSITION/);
    });

    it('should reject CREATED → EXECUTING (invalid path)', async () => {
      expect(async () => {
        await sm.transitionTo('EXECUTING', 'Invalid transition', 'test-user');
      }).rejects.toThrow(/INVALID_STATE_TRANSITION/);
    });

    it('should reject EXECUTING → EXECUTING (same state)', async () => {
      mission.state = 'EXECUTING';
      sm = new MissionStateMachine(mission);

      expect(async () => {
        await sm.transitionTo('EXECUTING', 'Already executing', 'test-user');
      }).rejects.toThrow(/INVALID_STATE_TRANSITION/);
    });
  });

  describe('Precondition Enforcement', () => {
    it('should reject VERIFYING → COMPLETED without verification result', async () => {
      mission.state = 'VERIFYING';
      mission.evidence = ['evidence_001'];
      sm = new MissionStateMachine(mission);

      expect(async () => {
        await sm.transitionTo('COMPLETED', 'No verification result', 'test-user', {});
      }).rejects.toThrow(/POLICY_VIOLATION/);
    });

    it('should reject AUTHORIZED → EXECUTING without policy decision', async () => {
      mission.state = 'AUTHORIZED';
      sm = new MissionStateMachine(mission);

      expect(async () => {
        await sm.transitionTo('EXECUTING', 'No policy decision', 'test-user', {});
      }).rejects.toThrow(/POLICY_VIOLATION/);
    });
  });

  describe('Audit Trail', () => {
    it('should record all transitions in audit', async () => {
      await sm.transitionTo('VALIDATED', 'Validating', 'test-user');
      mission.tasks = ['task_001'];
      await sm.transitionTo('PLANNED', 'Planning', 'test-user');

      const history = sm.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        from: 'CREATED',
        to: 'VALIDATED',
        reason: 'Validating',
        actor: 'test-user',
      });
      expect(history[1]).toMatchObject({
        from: 'VALIDATED',
        to: 'PLANNED',
        reason: 'Planning',
        actor: 'test-user',
      });
    });

    it('should include audit entries in mission state', async () => {
      await sm.transitionTo('VALIDATED', 'Validating', 'test-user');

      expect(mission.audit).toHaveLength(1);
      expect(mission.audit[0]).toMatchObject({
        previousState: 'CREATED',
        newState: 'VALIDATED',
        reason: 'Validating',
        actor: 'test-user',
      });
      expect(mission.audit[0].timestamp).toBeDefined();
    });
  });

  describe('Terminal States', () => {
    it('should identify COMPLETED as terminal', async () => {
      mission.state = 'COMPLETED';
      sm = new MissionStateMachine(mission);

      expect(sm.isTerminal()).toBe(true);
    });

    it('should identify CANCELLED as terminal', async () => {
      mission.state = 'CANCELLED';
      sm = new MissionStateMachine(mission);

      expect(sm.isTerminal()).toBe(true);
    });

    it('should not identify EXECUTING as terminal', async () => {
      mission.state = 'EXECUTING';
      sm = new MissionStateMachine(mission);

      expect(sm.isTerminal()).toBe(false);
    });
  });

  describe('Blocking and Failure', () => {
    it('should allow blocking from AUTHORIZED state', async () => {
      mission.state = 'AUTHORIZED';
      sm = new MissionStateMachine(mission);

      await sm.transitionTo('BLOCKED', 'Blocker detected', 'test-user', {
        blockingCondition: 'Database migration in progress',
      });

      expect(sm.isBlocked()).toBe(true);
    });

    it('should allow transition out of BLOCKED state', async () => {
      mission.state = 'BLOCKED';
      mission.blockedAt = new Date().toISOString();
      sm = new MissionStateMachine(mission);

      await sm.transitionTo('AUTHORIZED', 'Blocker resolved', 'test-user');

      expect(sm.isBlocked()).toBe(false);
      expect(sm.getState()).toBe('AUTHORIZED');
    });

    it('should mark mission as failed', async () => {
      mission.state = 'EXECUTING';
      sm = new MissionStateMachine(mission);

      await sm.transitionTo('FAILED', 'Execution failed', 'test-user', {
        failureReason: 'Database connection timeout',
      });

      expect(sm.hasFailed()).toBe(true);
      expect(mission.failureReason).toBe('Database connection timeout');
    });
  });

  describe('Valid Next States', () => {
    it('should return correct valid next states from CREATED', () => {
      const validStates = sm.getValidNextStates();
      expect(validStates).toContain('VALIDATED');
      expect(validStates).toContain('CANCELLED');
      expect(validStates).not.toContain('COMPLETED');
    });

    it('should return empty array from COMPLETED', () => {
      mission.state = 'COMPLETED';
      sm = new MissionStateMachine(mission);

      const validStates = sm.getValidNextStates();
      expect(validStates).toHaveLength(0);
    });
  });
});

// ============================================================================
// TASK STATE MACHINE TESTS
// ============================================================================

describe('TaskStateMachine', () => {
  let task: Task;
  let sm: TaskStateMachine;

  beforeEach(() => {
    task = createTestTask();
    sm = new TaskStateMachine(task);
  });

  describe('Valid Task Transitions', () => {
    it('should allow QUEUED → RUNNING', async () => {
      await sm.transitionTo('RUNNING', 'Starting task', 'test-executor');
      expect(sm.getState()).toBe('RUNNING');
      expect(task.startedAt).toBeDefined();
    });

    it('should allow RUNNING → VERIFYING', async () => {
      task.state = 'RUNNING';
      task.startedAt = new Date().toISOString();
      sm = new TaskStateMachine(task);

      await sm.transitionTo('VERIFYING', 'Starting verification', 'test-executor', {
        executionResult: {
          schemaVersion: '1.0.0',
          taskId: 'task_test_001',
          success: true,
          output: {},
          executedAt: new Date().toISOString(),
          executedBy: 'test-executor',
          durationMs: 1000,
          evidence: [],
        },
      });

      expect(sm.getState()).toBe('VERIFYING');
    });

    it('should allow VERIFYING → COMPLETED', async () => {
      task.state = 'VERIFYING';
      sm = new TaskStateMachine(task);

      await sm.transitionTo('COMPLETED', 'Task verified', 'test-verifier', {
        verificationResult: {
          schemaVersion: '1.0.0',
          taskId: 'task_test_001',
          status: 'VERIFIED',
          confidence: 100,
          verifiedAt: new Date().toISOString(),
          verifiedBy: 'test-verifier',
          supportingEvidence: [],
          gaps: [],
          contradictions: [],
          reasoning: 'Task succeeded',
        },
      });

      expect(sm.getState()).toBe('COMPLETED');
      expect(task.completedAt).toBeDefined();
    });

    it('should allow FAILED → QUEUED (retry)', async () => {
      task.state = 'FAILED';
      task.failedAt = new Date().toISOString();
      task.retryCount = 0;
      sm = new TaskStateMachine(task);

      await sm.transitionTo('QUEUED', 'Retrying task', 'test-executor');

      expect(sm.getState()).toBe('QUEUED');
    });
  });

  describe('Invalid Task Transitions', () => {
    it('should reject QUEUED → COMPLETED (skipping states)', async () => {
      expect(async () => {
        await sm.transitionTo('COMPLETED', 'Skipping states', 'test-executor');
      }).rejects.toThrow(/INVALID_STATE_TRANSITION/);
    });

    it('should reject COMPLETED → anything (terminal)', async () => {
      task.state = 'COMPLETED';
      task.completedAt = new Date().toISOString();
      sm = new TaskStateMachine(task);

      expect(async () => {
        await sm.transitionTo('FAILED', 'Cannot revert from terminal', 'test-executor');
      }).rejects.toThrow(/INVALID_STATE_TRANSITION/);
    });
  });

  describe('Task Retry Logic', () => {
    it('should indicate task can retry when retryCount < maxRetries', () => {
      task.state = 'FAILED';
      task.retryCount = 0;
      task.request.maxRetries = 3;
      sm = new TaskStateMachine(task);

      expect(sm.canRetry()).toBe(true);
    });

    it('should indicate task cannot retry when retryCount >= maxRetries', () => {
      task.state = 'FAILED';
      task.retryCount = 3;
      task.request.maxRetries = 3;
      sm = new TaskStateMachine(task);

      expect(sm.canRetry()).toBe(false);
    });
  });
});
