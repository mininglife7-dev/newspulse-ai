import { describe, it, expect, beforeEach } from 'vitest';
import {
  planCanaryDeployment,
  getCanaryDeployment,
  startCanaryDeployment,
  recordCanaryMetrics,
  incrementCanaryStage,
  completeCanaryDeployment,
  abortCanaryDeployment,
  getCanaryHealthSnapshots,
  getLatestCanarySnapshot,
  getCanarySummary,
  formatCanaryStatus,
  resetCanaryHub,
  type CanaryStageConfig,
} from '@/lib/deployment-canary';

describe('Deployment Canary Controller - DNA-GOV-015', () => {
  beforeEach(() => {
    resetCanaryHub();
  });

  describe('planCanaryDeployment', () => {
    it('creates a new canary deployment in planning state', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
      ];

      const deployment = planCanaryDeployment(
        'New Checkout Flow',
        'abc123def456',
        '2.1.0',
        'Redesigned checkout with faster processing',
        stages
      );

      expect(deployment.name).toBe('New Checkout Flow');
      expect(deployment.version).toBe('2.1.0');
      expect(deployment.status).toBe('planning');
      expect(deployment.currentPercentage).toBe(0);
      expect(deployment.commit).toBe('abc123def456');
    });

    it('generates unique deployment ID', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [],
        },
      ];

      const deployment1 = planCanaryDeployment('A', 'c1', 'v1', 'desc', stages);
      const deployment2 = planCanaryDeployment('B', 'c2', 'v2', 'desc', stages);

      expect(deployment1.id).not.toBe(deployment2.id);
    });

    it('initializes metrics with baseline values', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', []);

      expect(deployment.metrics.error_rate.status).toBe('ok');
      expect(deployment.metrics.latency.status).toBe('ok');
      expect(deployment.metrics.availability.current).toBe(100);
    });
  });

  describe('getCanaryDeployment', () => {
    it('returns undefined for non-existent deployment', () => {
      const deployment = getCanaryDeployment('nonexistent');
      expect(deployment).toBeUndefined();
    });

    it('retrieves planned deployment by ID', () => {
      const created = planCanaryDeployment('Test', 'abc', 'v1', '', []);
      const retrieved = getCanaryDeployment(created.id);

      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test');
    });
  });

  describe('startCanaryDeployment', () => {
    it('transitions deployment from planning to staged', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [],
        },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      const started = startCanaryDeployment(deployment.id);

      expect(started?.status).toBe('staged');
      expect(started?.currentStage).toBe(1);
      expect(started?.currentPercentage).toBe(10);
    });

    it('records stage in history', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [],
        },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      const updated = getCanaryDeployment(deployment.id)!;
      expect(updated.stageHistory.length).toBe(1);
      expect(updated.stageHistory[0].stage).toBe(1);
      expect(updated.stageHistory[0].status).toBe('running');
    });

    it('throws error if already started', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
      ]);

      startCanaryDeployment(deployment.id);

      expect(() => startCanaryDeployment(deployment.id)).toThrow();
    });

    it('returns undefined for non-existent deployment', () => {
      const result = startCanaryDeployment('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('recordCanaryMetrics', () => {
    it('records metrics snapshot with all metrics', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      const snapshot = recordCanaryMetrics(deployment.id, {
        error_rate: 2,
        latency: 1500,
        availability: 99.8,
        memory: 512,
        cpu: 25,
      });

      expect(snapshot.metrics.error_rate).toBe(2);
      expect(snapshot.metrics.latency).toBe(1500);
      expect(snapshot.allHealthy).toBe(true);
    });

    it('detects warning-level metrics', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      const snapshot = recordCanaryMetrics(deployment.id, {
        error_rate: 7, // Above warning (5) but below critical (15)
        latency: 1500,
        availability: 99.8,
        memory: 512,
        cpu: 25,
      });

      expect(snapshot.warnings.length).toBeGreaterThan(0);
      expect(snapshot.warnings[0]).toContain('error_rate');
    });

    it('detects critical metrics and auto-aborts', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      recordCanaryMetrics(deployment.id, {
        error_rate: 20, // Above critical
        latency: 1500,
        availability: 99.8,
        memory: 512,
        cpu: 25,
      });

      const updated = getCanaryDeployment(deployment.id)!;
      expect(updated.status).toBe('aborted');
      expect(updated.abortReason).toContain('Critical metrics exceeded');
    });

    it('throws error for non-existent deployment', () => {
      expect(() =>
        recordCanaryMetrics('nonexistent', {
          error_rate: 0,
          latency: 0,
          availability: 100,
          memory: 0,
          cpu: 0,
        })
      ).toThrow();
    });

    it('tracks metric history in snapshots', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [],
        },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      recordCanaryMetrics(deployment.id, {
        error_rate: 2,
        latency: 1500,
        availability: 99.8,
        memory: 512,
        cpu: 25,
      });

      recordCanaryMetrics(deployment.id, {
        error_rate: 3,
        latency: 1600,
        availability: 99.7,
        memory: 520,
        cpu: 26,
      });

      const snapshots = getCanaryHealthSnapshots(deployment.id);
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].metrics.error_rate).toBe(2);
      expect(snapshots[1].metrics.error_rate).toBe(3);
    });
  });

  describe('incrementCanaryStage', () => {
    it('increments to next stage', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
        { stage: 2, percentage: 25, duration: 15, thresholds: [] },
        { stage: 3, percentage: 50, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      const incremented = incrementCanaryStage(deployment.id);

      expect(incremented?.currentStage).toBe(2);
      expect(incremented?.currentPercentage).toBe(25);
      expect(incremented?.status).toBe('active');
    });

    it('marks previous stage as completed', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
        { stage: 2, percentage: 25, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);
      incrementCanaryStage(deployment.id);

      const updated = getCanaryDeployment(deployment.id)!;
      expect(updated.stageHistory[0].status).toBe('completed');
      expect(updated.stageHistory[0].completedAt).toBeDefined();
    });

    it('auto-completes when reaching 100%', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
        { stage: 2, percentage: 100, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);
      incrementCanaryStage(deployment.id);

      const updated = getCanaryDeployment(deployment.id)!;
      expect(updated.status).toBe('complete');
      expect(updated.completedAt).toBeDefined();
    });

    it('throws error if already complete', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 100, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);
      completeCanaryDeployment(deployment.id);

      expect(() => incrementCanaryStage(deployment.id)).toThrow();
    });
  });

  describe('completeCanaryDeployment', () => {
    it('marks deployment as complete', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', [
        { stage: 1, percentage: 100, duration: 15, thresholds: [] },
      ]);

      startCanaryDeployment(deployment.id);
      const completed = completeCanaryDeployment(deployment.id);

      expect(completed?.status).toBe('complete');
      expect(completed?.completedAt).toBeDefined();
    });

    it('returns undefined for non-existent deployment', () => {
      const result = completeCanaryDeployment('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('abortCanaryDeployment', () => {
    it('aborts active deployment with reason', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
      ]);

      startCanaryDeployment(deployment.id);
      const aborted = abortCanaryDeployment(
        deployment.id,
        'Customer reports critical bug'
      );

      expect(aborted?.status).toBe('aborted');
      expect(aborted?.abortReason).toBe('Customer reports critical bug');
      expect(aborted?.abortedAt).toBeDefined();
    });

    it('throws error if already complete', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', [
        { stage: 1, percentage: 100, duration: 15, thresholds: [] },
      ]);

      startCanaryDeployment(deployment.id);
      completeCanaryDeployment(deployment.id);

      expect(() => abortCanaryDeployment(deployment.id, 'Too late')).toThrow();
    });
  });

  describe('getCanaryHealthSnapshots', () => {
    it('returns empty array for new deployment', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', []);
      const snapshots = getCanaryHealthSnapshots(deployment.id);

      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBe(0);
    });

    it('returns all recorded snapshots', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      for (let i = 0; i < 5; i++) {
        recordCanaryMetrics(deployment.id, {
          error_rate: i,
          latency: 1000 + i * 100,
          availability: 100 - i,
          memory: 512 + i * 10,
          cpu: 25 + i,
        });
      }

      const snapshots = getCanaryHealthSnapshots(deployment.id);
      expect(snapshots.length).toBe(5);
    });
  });

  describe('getLatestCanarySnapshot', () => {
    it('returns undefined for new deployment', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', []);
      const snapshot = getLatestCanarySnapshot(deployment.id);

      expect(snapshot).toBeUndefined();
    });

    it('returns most recent snapshot', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      recordCanaryMetrics(deployment.id, {
        error_rate: 1,
        latency: 1000,
        availability: 100,
        memory: 512,
        cpu: 25,
      });
      recordCanaryMetrics(deployment.id, {
        error_rate: 2,
        latency: 1100,
        availability: 99.9,
        memory: 522,
        cpu: 26,
      });
      recordCanaryMetrics(deployment.id, {
        error_rate: 3,
        latency: 1200,
        availability: 99.8,
        memory: 532,
        cpu: 27,
      });

      const latest = getLatestCanarySnapshot(deployment.id);
      expect(latest?.metrics.error_rate).toBe(3);
      expect(latest?.metrics.latency).toBe(1200);
    });
  });

  describe('getCanarySummary', () => {
    it('returns undefined for non-existent deployment', () => {
      const summary = getCanarySummary('nonexistent');
      expect(summary).toBeUndefined();
    });

    it('provides deployment summary with progress', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
        { stage: 2, percentage: 25, duration: 15, thresholds: [] },
        { stage: 3, percentage: 100, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment(
        'Test Deploy',
        'abc123',
        'v2.0',
        'New feature',
        stages
      );
      startCanaryDeployment(deployment.id);
      recordCanaryMetrics(deployment.id, {
        error_rate: 1,
        latency: 1000,
        availability: 99.9,
        memory: 512,
        cpu: 25,
      });

      const summary = getCanarySummary(deployment.id)!;

      expect(summary.name).toBe('Test Deploy');
      expect(summary.version).toBe('v2.0');
      expect(summary.status).toBe('staged');
      expect(summary.progress).toContain('Stage 1 of 3');
      expect(summary.progress).toContain('10%');
      expect(summary.health).toContain('Healthy');
      expect(summary.lastMetrics.error_rate).toBe(1);
    });
  });

  describe('formatCanaryStatus', () => {
    it('displays planning status', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', []);
      const status = formatCanaryStatus(deployment);

      expect(status).toContain('📋');
      expect(status).toContain('planning');
      expect(status).toContain('Test');
    });

    it('displays active status with progress', () => {
      const stages: CanaryStageConfig[] = [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
      ];

      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', stages);
      startCanaryDeployment(deployment.id);

      const status = formatCanaryStatus(deployment);
      expect(status).toContain('🚀');
      expect(status).toContain('staged');
      expect(status).toContain('10%');
    });

    it('displays abort status with reason', () => {
      const deployment = planCanaryDeployment('Test', 'c', 'v1', '', [
        { stage: 1, percentage: 10, duration: 15, thresholds: [] },
      ]);

      startCanaryDeployment(deployment.id);
      abortCanaryDeployment(deployment.id, 'Critical bug detected');

      const status = formatCanaryStatus(deployment);
      expect(status).toContain('⛔');
      expect(status).toContain('aborted');
      expect(status).toContain('Critical bug detected');
    });
  });

  describe('Integration: Gradual Deployment Workflow', () => {
    it('simulates complete gradual deployment', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 10,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
        {
          stage: 2,
          percentage: 25,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
        {
          stage: 3,
          percentage: 50,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
        {
          stage: 4,
          percentage: 100,
          duration: 0,
          thresholds: [
            { metric: 'error_rate', criticalMax: 15, warningMax: 5 },
            { metric: 'latency', criticalMax: 5000, warningMax: 2000 },
          ],
        },
      ];

      const deployment = planCanaryDeployment(
        'Checkout v3',
        'commit-abc',
        'v3.0',
        'New checkout flow',
        stages
      );

      // Stage 1: 10%
      startCanaryDeployment(deployment.id);
      expect(getCanaryDeployment(deployment.id)?.currentPercentage).toBe(10);

      recordCanaryMetrics(deployment.id, {
        error_rate: 2,
        latency: 1800,
        availability: 99.95,
        memory: 512,
        cpu: 28,
      });

      // Stage 2: 25%
      incrementCanaryStage(deployment.id);
      expect(getCanaryDeployment(deployment.id)?.currentPercentage).toBe(25);

      recordCanaryMetrics(deployment.id, {
        error_rate: 3,
        latency: 1900,
        availability: 99.9,
        memory: 520,
        cpu: 29,
      });

      // Stage 3: 50%
      incrementCanaryStage(deployment.id);
      expect(getCanaryDeployment(deployment.id)?.currentPercentage).toBe(50);

      recordCanaryMetrics(deployment.id, {
        error_rate: 4,
        latency: 2000,
        availability: 99.85,
        memory: 530,
        cpu: 30,
      });

      // Stage 4: 100% (auto-completes)
      incrementCanaryStage(deployment.id);
      const final = getCanaryDeployment(deployment.id)!;
      expect(final.currentPercentage).toBe(100);
      expect(final.status).toBe('complete');

      const summary = getCanarySummary(deployment.id)!;
      expect(summary.status).toBe('complete');
      expect(summary.progress).toContain('Stage 4 of 4');
    });
  });

  describe('Integration: Auto-Abort on Critical Metrics', () => {
    it('aborts deployment when error rate exceeds critical threshold', () => {
      const stages: CanaryStageConfig[] = [
        {
          stage: 1,
          percentage: 25,
          duration: 15,
          thresholds: [
            { metric: 'error_rate', criticalMax: 10, warningMax: 5 },
          ],
        },
      ];

      const deployment = planCanaryDeployment(
        'Risky Feature',
        'c',
        'v1',
        '',
        stages
      );
      startCanaryDeployment(deployment.id);

      recordCanaryMetrics(deployment.id, {
        error_rate: 3,
        latency: 1500,
        availability: 99.9,
        memory: 512,
        cpu: 25,
      });

      expect(getCanaryDeployment(deployment.id)?.status).toBe('staged');

      // Record critical metric
      recordCanaryMetrics(deployment.id, {
        error_rate: 18, // Exceeds critical
        latency: 1500,
        availability: 98,
        memory: 512,
        cpu: 25,
      });

      const aborted = getCanaryDeployment(deployment.id)!;
      expect(aborted.status).toBe('aborted');
      expect(aborted.abortReason).toContain('Critical metrics exceeded');
    });
  });
});
