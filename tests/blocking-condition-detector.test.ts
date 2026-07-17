import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectActionsOutage,
  detectAllBlockingConditions,
  formatBlockingConditionAlert,
} from '@/lib/blocking-condition-detector';

describe('DNA-GOV-001: Blocking Condition Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectActionsOutage', () => {
    it('returns null when Actions is healthy (recent successful run exists)', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
            conclusion: 'success',
          },
          {
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            conclusion: 'success',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRuns,
      });

      const result = await detectActionsOutage('owner', 'repo', 'token');
      expect(result).toBeNull();
    });

    it('detects outage when no runs exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      });

      const result = await detectActionsOutage('owner', 'repo', 'token');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('actions_no_recent_runs');
      expect(result?.severity).toBe('high');
    });

    it('detects outage when no recent successful runs', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
            conclusion: 'failure',
          },
          {
            created_at: new Date(
              Date.now() - 2.5 * 60 * 60 * 1000
            ).toISOString(),
            conclusion: 'failure',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRuns,
      });

      const result = await detectActionsOutage('owner', 'repo', 'token');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('actions_no_recent_runs');
      expect(result?.severity).toBe('critical');
      expect(result?.description).toContain(
        'No successful workflow runs in the last 2 hours'
      );
    });

    it('detects API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const result = await detectActionsOutage('owner', 'repo', 'token');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('actions_outage');
      expect(result?.severity).toBe('critical');
      expect(result?.evidence[0]).toContain('503');
    });

    it('detects network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await detectActionsOutage('owner', 'repo', 'token');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('actions_outage');
      expect(result?.description).toContain('Network error');
    });
  });

  describe('detectAllBlockingConditions', () => {
    it('returns empty array when everything is healthy', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            conclusion: 'success',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRuns,
      });

      const result = await detectAllBlockingConditions(
        'owner',
        'repo',
        'token'
      );
      expect(result).toHaveLength(0);
    });

    it('aggregates multiple blocking conditions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      });

      const result = await detectAllBlockingConditions(
        'owner',
        'repo',
        'token'
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('actions_no_recent_runs');
    });
  });

  describe('formatBlockingConditionAlert', () => {
    it('formats alert with all required fields', () => {
      const condition = {
        type: 'actions_no_recent_runs' as const,
        severity: 'critical' as const,
        description: 'No successful runs',
        evidence: ['Run 1 failed', 'Run 2 failed'],
        discoveredAt: '2026-07-10T12:00:00Z',
        recommendedAction: 'Check Actions settings',
        estimatedImpact: 'Merges blocked',
      };

      const alert = formatBlockingConditionAlert(condition);
      expect(alert).toContain('CRITICAL: No successful runs');
      expect(alert).toContain('Run 1 failed');
      expect(alert).toContain('Check Actions settings');
      expect(alert).toContain('Merges blocked');
      expect(alert).toContain('2026-07-10T12:00:00Z');
    });
  });
});
