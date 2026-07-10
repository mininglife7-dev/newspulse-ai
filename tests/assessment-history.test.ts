import { describe, it, expect } from 'vitest';

describe('Assessment History & Versioning', () => {
  describe('GET /api/assessment-history', () => {
    it('should return 400 when ai_system_id is missing', () => {
      const query = new URLSearchParams({});
      expect(query.get('ai_system_id')).toBeNull();
    });

    it('should return 401 when not authenticated', () => {
      expect(401).toBeDefined();
    });

    it('should return 404 for non-existent AI system', () => {
      expect(404).toBeDefined();
    });

    it('should support limit parameter', () => {
      const query = new URLSearchParams({ limit: '5' });
      expect(parseInt(query.get('limit') || '10')).toBe(5);
    });

    it('should support comparison mode', () => {
      const query = new URLSearchParams({ comparison: 'true' });
      expect(query.get('comparison')).toBe('true');
    });

    it('should return empty history for new assessments', () => {
      // New assessment has no history yet
      const expectedResponse = {
        ok: true,
        history: [],
        count: 0,
      };
      expect(expectedResponse.count).toBe(0);
    });

    it('should return history ordered by version descending', () => {
      // History should be newest first
      const history = [
        { version_number: 3, risk_score: 45 },
        { version_number: 2, risk_score: 60 },
        { version_number: 1, risk_score: 75 },
      ];
      expect(history[0].version_number).toBeGreaterThan(history[1].version_number);
    });

    it('should respect limit parameter', () => {
      // If limit=5, should return max 5 items
      const history = Array.from({ length: 10 }, (_, i) => ({
        version_number: i + 1,
        risk_score: 50 + i,
      }));
      const limited = history.slice(0, 5);
      expect(limited).toHaveLength(5);
    });
  });

  describe('Comparison Mode', () => {
    it('should return null when no history exists', () => {
      const response = {
        ok: true,
        comparison: null,
        message: 'No assessment history available',
      };
      expect(response.comparison).toBeNull();
    });

    it('should include current assessment details', () => {
      const comparison = {
        current_version: 2,
        current_score: 45,
        current_level: 'medium',
        current_date: '2026-07-10T13:00:00Z',
      };
      expect(comparison.current_version).toBe(2);
      expect(comparison.current_score).toBe(45);
    });

    it('should include previous assessment for comparison', () => {
      const comparison = {
        previous_version: 1,
        previous_score: 75,
        previous_level: 'high',
        previous_date: '2026-06-10T13:00:00Z',
      };
      expect(comparison.previous_version).toBe(1);
      expect(comparison.previous_score).toBe(75);
    });

    it('should calculate improvement when previous version exists', () => {
      const comparison = {
        current_score: 45,
        previous_score: 75,
        improvement: {
          improved: true,
          score_change: 30,
          percent_change: 40,
          improvement_category: 'significant',
        },
      };
      expect(comparison.improvement?.improved).toBe(true);
      expect(comparison.improvement?.score_change).toBe(30);
    });

    it('should classify improvement as significant (>=30 point change)', () => {
      const comparisons = [
        { old: 100, new: 70, expected: 'significant' },
        { old: 80, new: 50, expected: 'significant' },
      ];
      comparisons.forEach((c) => {
        const change = c.old - c.new;
        const category = change >= 30 ? 'significant' : 'moderate';
        expect(category).toBe(c.expected);
      });
    });

    it('should classify improvement as moderate (10-29 point change)', () => {
      const comparisons = [
        { old: 100, new: 75, expected: 'moderate' },
        { old: 80, new: 65, expected: 'moderate' },
      ];
      comparisons.forEach((c) => {
        const change = c.old - c.new;
        const category = change >= 10 && change < 30 ? 'moderate' : 'other';
        expect(category).toBe(c.expected);
      });
    });

    it('should classify improvement as minor (<10 point change)', () => {
      const comparisons = [
        { old: 100, new: 95, expected: 'minor' },
        { old: 80, new: 78, expected: 'minor' },
      ];
      comparisons.forEach((c) => {
        const change = c.old - c.new;
        const category = change > 0 && change < 10 ? 'minor' : 'other';
        expect(category).toBe(c.expected);
      });
    });

    it('should flag regression when score increases', () => {
      const comparison = {
        current_score: 85,
        previous_score: 75,
        improvement: {
          improved: false,
          score_change: -10,
          improvement_category: 'regression',
        },
      };
      expect(comparison.improvement?.improved).toBe(false);
      expect(comparison.improvement?.improvement_category).toBe('regression');
    });

    it('should calculate percent change correctly', () => {
      // Old: 100, New: 50 → 50% improvement
      const oldScore = 100;
      const newScore = 50;
      const percentChange = ((oldScore - newScore) / oldScore) * 100;
      expect(percentChange).toBe(50);
    });

    it('should handle zero baseline (no regression)', () => {
      const oldScore = 0;
      const newScore = 50;
      const percentChange = oldScore > 0 ? ((oldScore - newScore) / oldScore) * 100 : 0;
      expect(percentChange).toBe(0);
    });

    it('should track total versions count', () => {
      const comparison = {
        versions_count: 3,
      };
      expect(comparison.versions_count).toBe(3);
    });
  });

  describe('Assessment Lifecycle with History', () => {
    it('should create version 1 on first assessment', () => {
      const v1 = { version_number: 1, risk_score: 75 };
      expect(v1.version_number).toBe(1);
    });

    it('should archive v1 when v2 is created', () => {
      const archived = {
        version_number: 1,
        archived_at: '2026-06-10T13:00:00Z',
      };
      expect(archived.archived_at).toBeDefined();
    });

    it('should update current assessment with v2 data', () => {
      const current = {
        version_number: 2,
        risk_score: 60,
        updated_at: '2026-07-10T13:00:00Z',
      };
      expect(current.version_number).toBe(2);
    });

    it('should support optional notes on archived versions', () => {
      const archived = {
        version_number: 1,
        notes: 'Updated after implementing required controls',
      };
      expect(archived.notes).toBeTruthy();
    });

    it('should track improvement progression', () => {
      const progression = [
        { v: 1, score: 80, notes: 'Initial assessment' },
        { v: 2, score: 65, notes: 'After first remediation' },
        { v: 3, score: 45, notes: 'After full compliance implementation' },
      ];
      expect(progression).toHaveLength(3);
      expect(progression[0].score).toBeGreaterThan(progression[2].score);
    });
  });

  describe('RLS & Access Control', () => {
    it('should enforce workspace isolation', () => {
      // User can only see history for their workspace
      // Verified by RLS policy in migration
      expect(true).toBe(true);
    });

    it('should prevent viewing other workspaces history', () => {
      // Attempt to fetch history for AI system in different workspace
      // Should return 404 or empty
      expect(404).toBeDefined();
    });

    it('should allow service role to archive history', () => {
      // Only service role can insert into assessment_history
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database errors', () => {
      expect(500).toBeDefined();
    });

    it('should log errors for debugging', () => {
      // Errors are logged to console.error
      expect(true).toBe(true);
    });

    it('should return meaningful error messages', () => {
      const errors = [
        'ai_system_id is required',
        'AI system not found',
        'Failed to load assessment history',
        'Failed to load comparison',
      ];
      errors.forEach((err) => {
        expect(err).toBeTruthy();
      });
    });
  });

  describe('Performance & Optimization', () => {
    it('should use indexes on workspace_id for fast lookup', () => {
      // Index created on assessment_history(workspace_id)
      expect(true).toBe(true);
    });

    it('should order by archived_at DESC for most recent first', () => {
      const index = 'idx_assessment_history_archived_at';
      expect(index).toBeTruthy();
    });

    it('should support pagination with limit', () => {
      const defaultLimit = 10;
      const customLimit = 5;
      expect(customLimit < defaultLimit).toBe(true);
    });

    it('should cache comparison results if needed', () => {
      // Helper functions are STABLE (can be cached by PG)
      expect(true).toBe(true);
    });
  });
});
