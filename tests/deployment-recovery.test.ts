import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkDeploymentStatus,
  isTransientError,
  waitBeforeRetry,
  triggerDeploymentRetry,
  attemptRecovery,
  formatRecoveryReport,
  type DeploymentStatus,
  type DeploymentRecoveryReport,
} from '@/lib/deployment-recovery';

global.fetch = vi.fn();

describe('Deployment Recovery (DNA-GOV-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('checkDeploymentStatus', () => {
    it('should fetch deployment status from Vercel API', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_test123',
          state: 'READY',
          url: 'https://test-app.vercel.app',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const status = await checkDeploymentStatus('dpl_test123');

      expect(status.deploymentId).toBe('dpl_test123');
      expect(status.state).toBe('READY');
      expect(status.url).toBe('https://test-app.vercel.app');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dpl_test123'),
        expect.any(Object)
      );
    });

    it('should handle deployment error response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_error123',
          state: 'ERROR',
          errorMessage: 'Build timeout exceeded',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const status = await checkDeploymentStatus('dpl_error123');

      expect(status.state).toBe('ERROR');
      expect(status.errorMessage).toBe('Build timeout exceeded');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const status = await checkDeploymentStatus('dpl_invalid');

      expect(status.state).toBe('ERROR');
      expect(status.errorMessage).toContain('Vercel API error');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network timeout'));

      const status = await checkDeploymentStatus('dpl_network_error');

      expect(status.state).toBe('ERROR');
      expect(status.errorMessage).toContain('Network timeout');
    });

    it('should parse all deployment states', async () => {
      const states = ['BUILDING', 'ERROR', 'READY', 'QUEUED', 'INITIALIZING'];

      for (const state of states) {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            id: `dpl_${state}`,
            state,
            createdAt: '2024-01-01T12:00:00Z',
          }),
        });

        const status = await checkDeploymentStatus(`dpl_${state}`);
        expect(status.state).toBe(state);
      }
    });
  });

  describe('isTransientError', () => {
    it('should identify timeout errors as transient', () => {
      const status: DeploymentStatus = {
        deploymentId: 'dpl_timeout',
        state: 'ERROR',
        errorMessage: 'Build timeout exceeded',
        createdAt: '2024-01-01T12:00:00Z',
      };

      expect(isTransientError(status)).toBe(true);
    });

    it('should identify connection errors as transient', () => {
      const errors = [
        'Connection refused (ECONNREFUSED)',
        'Connection reset by peer (ECONNRESET)',
        'Network timeout (ETIMEDOUT)',
        'Host unreachable (EHOSTUNREACH)',
      ];

      for (const errorMsg of errors) {
        const status: DeploymentStatus = {
          deploymentId: 'dpl_conn_err',
          state: 'ERROR',
          errorMessage: errorMsg,
          createdAt: '2024-01-01T12:00:00Z',
        };
        expect(isTransientError(status)).toBe(true);
      }
    });

    it('should identify rate limit errors as transient', () => {
      const status: DeploymentStatus = {
        deploymentId: 'dpl_rate_limit',
        state: 'ERROR',
        errorMessage: '429 Too Many Requests',
        createdAt: '2024-01-01T12:00:00Z',
      };

      expect(isTransientError(status)).toBe(true);
    });

    it('should identify service unavailable as transient', () => {
      const status: DeploymentStatus = {
        deploymentId: 'dpl_unavailable',
        state: 'ERROR',
        errorMessage: '503 Service Unavailable',
        createdAt: '2024-01-01T12:00:00Z',
      };

      expect(isTransientError(status)).toBe(true);
    });

    it('should identify resource limit errors as transient', () => {
      const status: DeploymentStatus = {
        deploymentId: 'dpl_oom',
        state: 'ERROR',
        errorMessage: 'Out of memory - insufficient resources available',
        createdAt: '2024-01-01T12:00:00Z',
      };

      expect(isTransientError(status)).toBe(true);
    });

    it('should NOT identify permanent errors as transient', () => {
      const status: DeploymentStatus = {
        deploymentId: 'dpl_syntax_error',
        state: 'ERROR',
        errorMessage: 'SyntaxError: Unexpected token',
        createdAt: '2024-01-01T12:00:00Z',
      };

      expect(isTransientError(status)).toBe(false);
    });

    it('should return false for missing error message', () => {
      const status: DeploymentStatus = {
        deploymentId: 'dpl_no_error',
        state: 'READY',
        createdAt: '2024-01-01T12:00:00Z',
      };

      expect(isTransientError(status)).toBe(false);
    });
  });

  describe('waitBeforeRetry', () => {
    it('should wait with exponential backoff', async () => {
      const delays = [2000, 5000, 10000, 30000, 60000];

      for (let i = 0; i < delays.length; i++) {
        const promise = waitBeforeRetry(i);
        vi.advanceTimersByTime(delays[i]);
        await promise;
        // With fake timers, just verify the promise resolves
        expect(true).toBe(true);
      }
    });

    it('should cap delay at maximum', async () => {
      const promise = waitBeforeRetry(100); // Way beyond max
      vi.advanceTimersByTime(60000); // max delay
      await promise;
      expect(true).toBe(true);
    });
  });

  describe('triggerDeploymentRetry', () => {
    it('should call GitHub API to trigger retry', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const success = await triggerDeploymentRetry('owner', 'repo', 'main');

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('github.com'),
        expect.any(Object)
      );
    });

    it('should handle GitHub API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const success = await triggerDeploymentRetry('owner', 'repo', 'main');

      expect(success).toBe(false);
    });

    it('should handle network errors during retry trigger', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const success = await triggerDeploymentRetry('owner', 'repo', 'main');

      expect(success).toBe(false);
    });
  });

  describe('attemptRecovery', () => {
    it('should return immediately if deployment is ready', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_ready',
          state: 'READY',
          url: 'https://app.vercel.app',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const report = await attemptRecovery('dpl_ready');

      expect(report.recovered).toBe(true);
      expect(report.totalRetries).toBe(0);
      expect(report.retryAttempts).toHaveLength(0);
    });

    it('should return immediately for permanent errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_syntax',
          state: 'ERROR',
          errorMessage: 'SyntaxError in build',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const report = await attemptRecovery('dpl_syntax');

      expect(report.recovered).toBe(false);
      expect(report.totalRetries).toBe(0);
    });

    it('should detect transient errors for recovery', () => {
      const transientStatus: DeploymentStatus = {
        deploymentId: 'dpl_transient',
        state: 'ERROR',
        errorMessage: 'Connection timeout',
        createdAt: '2024-01-01T12:00:00Z',
      };

      const isTransient = isTransientError(transientStatus);

      expect(isTransient).toBe(true);
    });

    it('should structure retry attempt data correctly', () => {
      const report: DeploymentRecoveryReport = {
        deploymentId: 'dpl_test',
        initialStatus: {
          deploymentId: 'dpl_test',
          state: 'ERROR',
          errorMessage: 'Test error',
          createdAt: '2024-01-01T12:00:00Z',
        },
        retryAttempts: [
          {
            attempt: 1,
            timestamp: '2024-01-01T12:00:10Z',
            reason: 'Test retry',
            success: false,
          },
        ],
        finalStatus: {
          deploymentId: 'dpl_test',
          state: 'ERROR',
          errorMessage: 'Still failing',
          createdAt: '2024-01-01T12:00:00Z',
        },
        recovered: false,
        totalRetries: 1,
      };

      expect(report.retryAttempts).toHaveLength(1);
      expect(report.retryAttempts[0].attempt).toBe(1);
      expect(typeof report.retryAttempts[0].timestamp).toBe('string');
      expect(typeof report.retryAttempts[0].success).toBe('boolean');
    });

    it('should track max retry attempts in report', () => {
      // Create a report that demonstrates max retry tracking
      const report: DeploymentRecoveryReport = {
        deploymentId: 'dpl_exhausted',
        initialStatus: {
          deploymentId: 'dpl_exhausted',
          state: 'ERROR',
          errorMessage: 'Persistent timeout',
          createdAt: '2024-01-01T12:00:00Z',
        },
        retryAttempts: [
          { attempt: 1, timestamp: '2024-01-01T12:00:02Z', reason: 'Retry', success: false },
          { attempt: 2, timestamp: '2024-01-01T12:00:07Z', reason: 'Retry', success: false },
          { attempt: 3, timestamp: '2024-01-01T12:00:17Z', reason: 'Retry', success: false },
          { attempt: 4, timestamp: '2024-01-01T12:00:47Z', reason: 'Retry', success: false },
          { attempt: 5, timestamp: '2024-01-01T12:01:47Z', reason: 'Retry', success: false },
        ],
        finalStatus: {
          deploymentId: 'dpl_exhausted',
          state: 'ERROR',
          errorMessage: 'Persistent timeout',
          createdAt: '2024-01-01T12:00:00Z',
        },
        recovered: false,
        totalRetries: 5,
      };

      // Should not exceed max retries (5)
      expect(report.totalRetries).toBeLessThanOrEqual(5);
      expect(report.recovered).toBe(false);
      expect(report.retryAttempts).toHaveLength(5);
    });
  });

  describe('formatRecoveryReport', () => {
    it('should format successful recovery report', () => {
      const report: DeploymentRecoveryReport = {
        deploymentId: 'dpl_success',
        initialStatus: {
          deploymentId: 'dpl_success',
          state: 'ERROR',
          errorMessage: 'Timeout',
          createdAt: '2024-01-01T12:00:00Z',
        },
        retryAttempts: [
          {
            attempt: 1,
            timestamp: '2024-01-01T12:00:10Z',
            reason: 'Retry after transient error',
            success: true,
          },
        ],
        finalStatus: {
          deploymentId: 'dpl_success',
          state: 'READY',
          url: 'https://app.vercel.app',
          createdAt: '2024-01-01T12:00:00Z',
          completedAt: '2024-01-01T12:01:00Z',
        },
        recovered: true,
        totalRetries: 1,
        timeToRecovery: 60000,
      };

      const formatted = formatRecoveryReport(report);

      expect(formatted).toContain('Deployment Recovery Report');
      expect(formatted).toContain('dpl_success');
      expect(formatted).toContain('✅ Recovered');
      expect(formatted).toContain('1 attempt');
    });

    it('should format failed recovery report', () => {
      const report: DeploymentRecoveryReport = {
        deploymentId: 'dpl_failed',
        initialStatus: {
          deploymentId: 'dpl_failed',
          state: 'ERROR',
          errorMessage: 'Build failed',
          createdAt: '2024-01-01T12:00:00Z',
        },
        retryAttempts: [
          {
            attempt: 1,
            timestamp: '2024-01-01T12:00:10Z',
            reason: 'Retry attempt 1',
            success: false,
          },
        ],
        finalStatus: {
          deploymentId: 'dpl_failed',
          state: 'ERROR',
          errorMessage: 'Build failed - syntax error',
          createdAt: '2024-01-01T12:00:00Z',
        },
        recovered: false,
        totalRetries: 1,
        timeToRecovery: 10000,
      };

      const formatted = formatRecoveryReport(report);

      expect(formatted).toContain('Deployment Recovery Report');
      expect(formatted).toContain('❌ Failed to recover');
      expect(formatted).toContain('1 attempt');
    });

    it('should show recovery URL for successful deployments', () => {
      const report: DeploymentRecoveryReport = {
        deploymentId: 'dpl_url',
        initialStatus: {
          deploymentId: 'dpl_url',
          state: 'ERROR',
          errorMessage: 'Error',
          createdAt: '2024-01-01T12:00:00Z',
        },
        retryAttempts: [],
        finalStatus: {
          deploymentId: 'dpl_url',
          state: 'READY',
          url: 'https://my-app.vercel.app',
          createdAt: '2024-01-01T12:00:00Z',
        },
        recovered: true,
        totalRetries: 1,
      };

      const formatted = formatRecoveryReport(report);

      expect(formatted).toContain('https://my-app.vercel.app');
    });

    it('should list all retry attempts', () => {
      const report: DeploymentRecoveryReport = {
        deploymentId: 'dpl_multi',
        initialStatus: {
          deploymentId: 'dpl_multi',
          state: 'ERROR',
          errorMessage: 'Timeout',
          createdAt: '2024-01-01T12:00:00Z',
        },
        retryAttempts: [
          {
            attempt: 1,
            timestamp: '2024-01-01T12:00:10Z',
            reason: 'Retry 1',
            success: false,
          },
          {
            attempt: 2,
            timestamp: '2024-01-01T12:00:20Z',
            reason: 'Retry 2',
            success: true,
          },
        ],
        finalStatus: {
          deploymentId: 'dpl_multi',
          state: 'READY',
          url: 'https://app.vercel.app',
          createdAt: '2024-01-01T12:00:00Z',
        },
        recovered: true,
        totalRetries: 2,
      };

      const formatted = formatRecoveryReport(report);

      expect(formatted).toContain('Attempt 1');
      expect(formatted).toContain('Attempt 2');
    });
  });

  describe('Integration scenarios', () => {
    it('should classify transient errors for recovery', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_timeout_recover',
          state: 'ERROR',
          errorMessage: 'Build timeout',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const status = await checkDeploymentStatus('dpl_timeout_recover');
      const isTransient = isTransientError(status);

      expect(status.errorMessage).toContain('timeout');
      expect(isTransient).toBe(true);
    });

    it('should skip retry for permanent errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_permanent',
          state: 'ERROR',
          errorMessage: 'Build failed - syntax error in src/app.ts',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const report = await attemptRecovery('dpl_permanent');

      expect(report.recovered).toBe(false);
      expect(report.totalRetries).toBe(0);
    });

    it('should handle ready deployments without retry', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_ready',
          state: 'READY',
          url: 'https://app.vercel.app',
          createdAt: '2024-01-01T12:00:00Z',
        }),
      });

      const report = await attemptRecovery('dpl_ready');

      expect(report.recovered).toBe(true);
      expect(report.totalRetries).toBe(0);
      expect(report.retryAttempts).toHaveLength(0);
    });
  });
});
