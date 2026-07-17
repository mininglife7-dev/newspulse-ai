import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLatestCommit,
  getLatestDeployment,
  verifyDeployment,
  formatDeploymentAlert,
} from '@/lib/deployment-verifier';

describe('Deployment Verifier (DNA-GOV-003)', () => {
  const testOwner = 'mininglife7-dev';
  const testRepo = 'newspulse-ai';
  const testToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatestCommit', () => {
    it('fetches latest commit from main branch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sha: 'abc123def456',
          commit: { message: 'feat: add new feature' },
          created_at: '2026-07-10T12:00:00Z',
        }),
      });

      const result = await getLatestCommit(testOwner, testRepo, testToken);

      expect(result).toEqual({
        sha: 'abc123def456',
        message: 'feat: add new feature',
        timestamp: '2026-07-10T12:00:00Z',
      });
    });

    it('returns null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await getLatestCommit(testOwner, testRepo, testToken);

      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await getLatestCommit(testOwner, testRepo, testToken);

      expect(result).toBeNull();
    });
  });

  describe('getLatestDeployment', () => {
    it('fetches latest production deployment', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              sha: 'abc123def456',
              created_at: '2026-07-10T12:00:00Z',
              statuses_url: 'https://api.github.com/repos/.../statuses',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              state: 'success',
              created_at: '2026-07-10T12:05:00Z',
              target_url: 'https://newspulse-ai.vercel.app',
              description: 'Deployment succeeded',
            },
          ],
        });

      const result = await getLatestDeployment(testOwner, testRepo, testToken);

      expect(result).toEqual(
        expect.objectContaining({
          commitSha: 'abc123def456',
          deploymentState: 'success',
          isLive: true,
        })
      );
    });

    it('detects pending deployment', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              sha: 'abc123def456',
              created_at: '2026-07-10T12:00:00Z',
              statuses_url: 'https://api.github.com/repos/.../statuses',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              state: 'pending',
              created_at: '2026-07-10T12:05:00Z',
            },
          ],
        });

      const result = await getLatestDeployment(testOwner, testRepo, testToken);

      expect(result?.deploymentState).toBe('pending');
      expect(result?.isLive).toBe(false);
    });

    it('detects failed deployment', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              sha: 'abc123def456',
              created_at: '2026-07-10T12:00:00Z',
              statuses_url: 'https://api.github.com/repos/.../statuses',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              state: 'failure',
              created_at: '2026-07-10T12:05:00Z',
              description: 'Deployment failed',
            },
          ],
        });

      const result = await getLatestDeployment(testOwner, testRepo, testToken);

      expect(result?.deploymentState).toBe('failed');
      expect(result?.isLive).toBe(false);
    });

    it('returns null when no deployments found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await getLatestDeployment(testOwner, testRepo, testToken);

      expect(result).toBeNull();
    });
  });

  describe('verifyDeployment', () => {
    it('returns healthy when latest code is deployed and live', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sha: 'abc123def456',
            commit: { message: 'feat: add feature' },
            created_at: '2026-07-10T12:00:00Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              sha: 'abc123def456',
              created_at: '2026-07-10T12:00:00Z',
              statuses_url: 'https://api.github.com/repos/.../statuses',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              state: 'success',
              created_at: '2026-07-10T12:05:00Z',
              target_url: 'https://newspulse-ai.vercel.app',
            },
          ],
        });

      const result = await verifyDeployment(testOwner, testRepo, testToken);

      expect(result.status).toBe('healthy');
      expect(result.currentDeployment?.isLive).toBe(true);
      expect(result.mismatch).toBeFalsy();
    });

    it('returns warning when deployed commit differs from latest commit', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sha: 'abc123def456',
            commit: { message: 'feat: new feature' },
            created_at: '2026-07-10T12:00:00Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              sha: 'old456def789',
              created_at: '2026-07-10T11:00:00Z',
              statuses_url: 'https://api.github.com/repos/.../statuses',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              state: 'success',
              created_at: '2026-07-10T11:05:00Z',
              target_url: 'https://newspulse-ai.vercel.app',
            },
          ],
        });

      const result = await verifyDeployment(testOwner, testRepo, testToken);

      expect(result.status).toBe('warning');
      expect(result.mismatch).toBe(true);
      expect(result.alert).toContain('does not match');
    });

    it('returns warning when deployment is pending', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sha: 'abc123def456',
            commit: { message: 'feat: feature' },
            created_at: '2026-07-10T12:00:00Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              sha: 'abc123def456',
              created_at: '2026-07-10T12:00:00Z',
              statuses_url: 'https://api.github.com/repos/.../statuses',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              state: 'pending',
              created_at: '2026-07-10T12:00:00Z',
            },
          ],
        });

      const result = await verifyDeployment(testOwner, testRepo, testToken);

      expect(result.status).toBe('warning');
      expect(result.currentDeployment?.isLive).toBe(false);
    });

    it('returns critical when latest commit cannot be fetched', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await verifyDeployment(testOwner, testRepo, testToken);

      expect(result.status).toBe('critical');
      expect(result.latestCommit).toBeNull();
    });

    it('returns critical when no deployment found', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sha: 'abc123def456',
            commit: { message: 'feat: feature' },
            created_at: '2026-07-10T12:00:00Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const result = await verifyDeployment(testOwner, testRepo, testToken);

      expect(result.status).toBe('critical');
      expect(result.currentDeployment).toBeNull();
    });
  });

  describe('formatDeploymentAlert', () => {
    it('formats healthy status', () => {
      const result = formatDeploymentAlert({
        status: 'healthy',
        currentDeployment: {
          commitSha: 'abc123def456',
          commitMessage: 'feat: add feature',
          deploymentState: 'success',
          isLive: true,
          deployedAt: '2026-07-10T12:05:00Z',
        },
        latestCommit: {
          sha: 'abc123def456',
          message: 'feat: add feature',
          timestamp: '2026-07-10T12:00:00Z',
        },
      });

      expect(result).toContain('✅');
      expect(result).toContain('verified');
      expect(result).toContain('abc123d');
    });

    it('formats warning status', () => {
      const result = formatDeploymentAlert({
        status: 'warning',
        currentDeployment: null,
        latestCommit: null,
        alert: 'Deployment is pending',
      });

      expect(result).toContain('⚠️');
      expect(result).toContain('warning');
    });

    it('formats critical status', () => {
      const result = formatDeploymentAlert({
        status: 'critical',
        currentDeployment: null,
        latestCommit: null,
        alert: 'No production deployment found',
      });

      expect(result).toContain('🔴');
      expect(result).toContain('critical');
    });
  });
});
