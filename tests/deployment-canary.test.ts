/**
 * DNA-015: Deployment Canary Tests
 *
 * Verify gradual production rollout with automatic abort:
 * - Phased deployments (% of traffic)
 * - Health monitoring and error detection
 * - Automatic rollback on threshold breach
 * - Phase management (pause/resume/advance)
 * - Metrics tracking and history
 * - Production safety (edge cases)
 *
 * Total: 20 tests covering safe and unsafe deployment scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DeploymentCanaryController,
  DeploymentCanary,
  CanaryPhase,
  HealthMetrics,
  RollbackThresholds,
} from '@/lib/deployment-canary';

describe('DNA-015: Deployment Canary', () => {
  let controller: DeploymentCanaryController;

  beforeEach(() => {
    controller = DeploymentCanaryController.getInstance();
  });

  // =========================================================================
  // Test Suite 1: Canary Deployment Creation & Lifecycle
  // =========================================================================

  describe('Canary Deployment Lifecycle', () => {
    it('should create a canary deployment with phases', async () => {
      const canary = await controller.createCanary({
        id: 'deploy-v1-0-1',
        version: '1.0.1',
        description: 'Release v1.0.1 to production',
        status: 'pending',
        phases: [
          { id: 'phase-1', name: 'Canary 5%', percentage: 5, duration: 300000, healthCheckInterval: 30000, paused: false },
          { id: 'phase-2', name: 'Stage 25%', percentage: 25, duration: 600000, healthCheckInterval: 60000, paused: false },
          { id: 'phase-3', name: 'Full 100%', percentage: 100, duration: 300000, healthCheckInterval: 300000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      expect(canary.id).toBe('deploy-v1-0-1');
      expect(canary.version).toBe('1.0.1');
      expect(canary.phases).toHaveLength(3);
      expect(canary.currentPhaseIndex).toBe(0);
      expect(canary.status).toBe('pending');
    });

    it('should advance through deployment phases', async () => {
      const canary = await controller.createCanary({
        id: 'deploy-phases-test',
        version: '1.0.2',
        description: 'Test phase advancement',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
          { id: 'phase-2', name: 'Phase 2', percentage: 50, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const advanced = await controller.advancePhase('deploy-phases-test');
      expect(advanced).toBe(true);

      const updated = await controller.getCanary('deploy-phases-test');
      expect(updated?.currentPhaseIndex).toBe(1);
    });

    it('should complete deployment after all phases', async () => {
      const canary = await controller.createCanary({
        id: 'deploy-complete-test',
        version: '1.0.3',
        description: 'Test deployment completion',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Final Phase', percentage: 100, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      await controller.advancePhase('deploy-complete-test');
      const completed = await controller.getCanary('deploy-complete-test');

      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
    });
  });

  // =========================================================================
  // Test Suite 2: Health Monitoring & Threshold Breaches
  // =========================================================================

  describe('Health Monitoring', () => {
    it('should record healthy health checks', async () => {
      await controller.createCanary({
        id: 'deploy-healthy',
        version: '1.0.4',
        description: 'Test healthy deployment',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const healthCheck = await controller.recordHealthCheck('deploy-healthy', {
        errorRate: 0.5,
        p95Latency: 500,
        availabilityPercentage: 99.9,
        deploymentSuccessRate: 100,
        cpuUsage: 45,
        memoryUsage: 60,
      });

      expect(healthCheck?.status).toBe('healthy');
      expect(healthCheck?.issues).toHaveLength(0);
    });

    it('should detect critical error rate threshold breach', async () => {
      await controller.createCanary({
        id: 'deploy-error-breach',
        version: '1.0.5',
        description: 'Test error rate detection',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const healthCheck = await controller.recordHealthCheck('deploy-error-breach', {
        errorRate: 10,
        p95Latency: 500,
        availabilityPercentage: 99.9,
        deploymentSuccessRate: 90,
        cpuUsage: 45,
        memoryUsage: 60,
      });

      expect(healthCheck?.status).toBe('critical');
      expect(healthCheck?.issues.some(i => i.type === 'error_rate')).toBe(true);
    });

    it('should detect latency threshold breach', async () => {
      await controller.createCanary({
        id: 'deploy-latency-breach',
        version: '1.0.6',
        description: 'Test latency detection',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const healthCheck = await controller.recordHealthCheck('deploy-latency-breach', {
        errorRate: 0.5,
        p95Latency: 3000,
        availabilityPercentage: 99.9,
        deploymentSuccessRate: 100,
        cpuUsage: 45,
        memoryUsage: 60,
      });

      expect(healthCheck?.status).toBe('degraded');
      expect(healthCheck?.issues.some(i => i.type === 'latency')).toBe(true);
    });

    it('should detect availability threshold breach', async () => {
      await controller.createCanary({
        id: 'deploy-availability-breach',
        version: '1.0.7',
        description: 'Test availability detection',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const healthCheck = await controller.recordHealthCheck('deploy-availability-breach', {
        errorRate: 0.5,
        p95Latency: 500,
        availabilityPercentage: 90,
        deploymentSuccessRate: 90,
        cpuUsage: 45,
        memoryUsage: 60,
      });

      expect(healthCheck?.status).toBe('critical');
      expect(healthCheck?.issues.some(i => i.type === 'availability')).toBe(true);
    });
  });

  // =========================================================================
  // Test Suite 3: Automatic Rollback on Consecutive Failures
  // =========================================================================

  describe('Automatic Rollback', () => {
    it('should rollback after consecutive critical checks', async () => {
      await controller.createCanary({
        id: 'deploy-auto-rollback',
        version: '1.0.8',
        description: 'Test auto rollback',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const badMetrics: HealthMetrics = {
        errorRate: 15,
        p95Latency: 500,
        availabilityPercentage: 85,
        deploymentSuccessRate: 85,
        cpuUsage: 45,
        memoryUsage: 60,
      };

      await controller.recordHealthCheck('deploy-auto-rollback', badMetrics);
      await controller.recordHealthCheck('deploy-auto-rollback', badMetrics);

      const canary = await controller.getCanary('deploy-auto-rollback');
      expect(canary?.status).toBe('rolled_back');
      expect(canary?.rollbackReason).toContain('Consecutive critical checks');
    });

    it('should reset failure counter on healthy check', async () => {
      await controller.createCanary({
        id: 'deploy-reset-counter',
        version: '1.0.9',
        description: 'Test failure counter reset',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const badMetrics: HealthMetrics = {
        errorRate: 15,
        p95Latency: 500,
        availabilityPercentage: 85,
        deploymentSuccessRate: 85,
        cpuUsage: 45,
        memoryUsage: 60,
      };

      const goodMetrics: HealthMetrics = {
        errorRate: 0.5,
        p95Latency: 500,
        availabilityPercentage: 99.9,
        deploymentSuccessRate: 100,
        cpuUsage: 45,
        memoryUsage: 60,
      };

      await controller.recordHealthCheck('deploy-reset-counter', badMetrics);
      await controller.recordHealthCheck('deploy-reset-counter', goodMetrics);
      await controller.recordHealthCheck('deploy-reset-counter', badMetrics);

      const canary = await controller.getCanary('deploy-reset-counter');
      expect(canary?.status).not.toBe('rolled_back');
    });

    it('should allow manual rollback', async () => {
      await controller.createCanary({
        id: 'deploy-manual-rollback',
        version: '1.0.10',
        description: 'Test manual rollback',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const rolled = await controller.rollback('deploy-manual-rollback', 'Manual override by operator');
      expect(rolled).toBe(true);

      const canary = await controller.getCanary('deploy-manual-rollback');
      expect(canary?.status).toBe('rolled_back');
      expect(canary?.rollbackReason).toBe('Manual override by operator');
    });
  });

  // =========================================================================
  // Test Suite 4: Phase Management (Pause/Resume)
  // =========================================================================

  describe('Phase Management', () => {
    it('should pause current phase', async () => {
      await controller.createCanary({
        id: 'deploy-pause',
        version: '1.0.11',
        description: 'Test pause',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const paused = await controller.pausePhase('deploy-pause');
      expect(paused).toBe(true);

      const canary = await controller.getCanary('deploy-pause');
      expect(canary?.status).toBe('paused');
      expect(canary?.phases[0].paused).toBe(true);
    });

    it('should resume paused phase', async () => {
      await controller.createCanary({
        id: 'deploy-resume',
        version: '1.0.12',
        description: 'Test resume',
        status: 'paused',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: true },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const resumed = await controller.resumePhase('deploy-resume');
      expect(resumed).toBe(true);

      const canary = await controller.getCanary('deploy-resume');
      expect(canary?.status).toBe('in_progress');
      expect(canary?.phases[0].paused).toBe(false);
    });
  });

  // =========================================================================
  // Test Suite 5: Metrics Tracking & History
  // =========================================================================

  describe('Metrics & History', () => {
    it('should record deployment metrics', async () => {
      await controller.createCanary({
        id: 'deploy-metrics',
        version: '1.0.13',
        description: 'Test metrics',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const metrics = await controller.recordMetrics('deploy-metrics', {
        exposedSessions: 1000,
        errorCount: 5,
        errorRate: 0.5,
        p50Latency: 200,
        p95Latency: 600,
        p99Latency: 1200,
        availability: 99.5,
      });

      expect(metrics.exposedSessions).toBe(1000);
      expect(metrics.errorRate).toBe(0.5);
      expect(metrics.p95Latency).toBe(600);
    });

    it('should retrieve health check history', async () => {
      await controller.createCanary({
        id: 'deploy-history',
        version: '1.0.14',
        description: 'Test history',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const goodMetrics: HealthMetrics = {
        errorRate: 0.5,
        p95Latency: 500,
        availabilityPercentage: 99.9,
        deploymentSuccessRate: 100,
        cpuUsage: 45,
        memoryUsage: 60,
      };

      await controller.recordHealthCheck('deploy-history', goodMetrics);
      await controller.recordHealthCheck('deploy-history', goodMetrics);
      await controller.recordHealthCheck('deploy-history', goodMetrics);

      const history = await controller.getHealthHistory('deploy-history');
      expect(history.length).toBe(3);
      expect(history[0].status).toBe('healthy');
    });

    it('should get current deployment status', async () => {
      await controller.createCanary({
        id: 'deploy-status',
        version: '1.0.15',
        description: 'Test status',
        status: 'in_progress',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const status = await controller.getDeploymentStatus('deploy-status');
      expect(status.canary?.id).toBe('deploy-status');
      expect(status.currentPhase?.id).toBe('phase-1');
    });
  });

  // =========================================================================
  // Test Suite 6: Production Safety (Edge Cases)
  // =========================================================================

  describe('Production Safety', () => {
    it('should handle non-existent canary gracefully', async () => {
      const result = await controller.getCanary('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle health check for completed deployment', async () => {
      await controller.createCanary({
        id: 'deploy-completed',
        version: '1.0.16',
        description: 'Test completed',
        status: 'completed',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 100, duration: 60000, healthCheckInterval: 10000, paused: false, completedAt: new Date().toISOString() },
        ],
        currentPhaseIndex: 1,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const healthCheck = await controller.recordHealthCheck('deploy-completed', {
        errorRate: 0.5,
        p95Latency: 500,
        availabilityPercentage: 99.9,
        deploymentSuccessRate: 100,
        cpuUsage: 45,
        memoryUsage: 60,
      });

      expect(healthCheck).toBeNull();
    });

    it('should handle pause on non-existent canary', async () => {
      const result = await controller.pausePhase('non-existent');
      expect(result).toBe(false);
    });

    it('should list all canaries', async () => {
      await controller.createCanary({
        id: 'deploy-list-1',
        version: '1.0.17',
        description: 'Test list 1',
        status: 'pending',
        phases: [
          { id: 'phase-1', name: 'Phase 1', percentage: 10, duration: 60000, healthCheckInterval: 10000, paused: false },
        ],
        currentPhaseIndex: 0,
        healthChecks: [],
        rollbackThresholds: {
          maxErrorRate: 5,
          maxP95Latency: 2000,
          minAvailability: 95,
          maxConsecutiveFailedChecks: 2,
        },
      });

      const canaries = await controller.getAllCanaries();
      expect(canaries.length).toBeGreaterThanOrEqual(1);
    });
  });
});
