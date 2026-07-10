import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPostMortem,
  extractLearnings,
  generateInsights,
  createPreventionPlan,
  analyzePostMortemMetrics,
  formatPostMortemIssue,
  shouldCreatePostMortem,
  type PostMortem,
} from '@/lib/post-mortem';
import type { IncidentMetrics } from '@/lib/incident-metrics';

describe('Post-Mortem System', () => {
  const createMockMetrics = (overrides: Partial<IncidentMetrics>): IncidentMetrics => ({
    totalIncidents: 10,
    resolvedIncidents: 9,
    unresolvedIncidents: 1,
    averageMTTR: 15,
    averageMTTD: 2.5,
    successRate: 80,
    playbookEffectiveness: {
      deployment: 85,
      database: 75,
      api: 80,
    },
    medianResolutionTime: 14,
    p95ResolutionTime: 30,
    p99ResolutionTime: 45,
    trendDirection: 'stable',
    trendMagnitude: 0,
    ...overrides,
  });

  describe('Post-Mortem Creation', () => {
    it('should create post-mortem from incident data', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-001',
        'Database Connection Pool Exhaustion',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'high',
        'database',
        'Connection pool max size too low for traffic spike',
        ['database', 'api'],
        metrics
      );

      expect(postMortem.incidentId).toBe('incident-001');
      expect(postMortem.durationMinutes).toBe(25);
      expect(postMortem.severity).toBe('high');
      expect(postMortem.status).toBe('draft');
      expect(postMortem.impactedSystems).toContain('database');
    });

    it('should calculate duration correctly', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-002',
        'API Timeout',
        '2026-07-10T10:00:00Z',
        '2026-07-10T10:35:30Z',
        'medium',
        'api',
        'Slow database query',
        ['api'],
        metrics
      );

      expect(postMortem.durationMinutes).toBe(36);
    });

    it('should include incident metrics in post-mortem', () => {
      const metrics = createMockMetrics({ averageMTTR: 20, averageMTTD: 3.5, successRate: 75 });
      const postMortem = createPostMortem(
        'incident-003',
        'Auth Service Down',
        '2026-07-10T14:00:00Z',
        '2026-07-10T14:20:00Z',
        'critical',
        'auth',
        'Certificate expired',
        ['auth', 'api'],
        metrics
      );

      expect(postMortem.metrics.mttr).toBe(20);
      expect(postMortem.metrics.mttd).toBe(3.5);
      expect(postMortem.metrics.successRateImpact).toBe(25);
    });

    it('should handle related regressions', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-004',
        'Memory Leak',
        '2026-07-10T16:00:00Z',
        '2026-07-10T16:45:00Z',
        'high',
        'deployment',
        'New code version leaked memory',
        ['api'],
        metrics,
        ['82', '83']
      );

      expect(postMortem.relatedRegressions).toContain('82');
      expect(postMortem.relatedRegressions).toContain('83');
    });
  });

  describe('Post-Mortem Trigger Logic', () => {
    it('should require post-mortem for critical incidents', () => {
      expect(shouldCreatePostMortem('critical', 5, 2)).toBe(true);
    });

    it('should require post-mortem for high-severity incidents', () => {
      expect(shouldCreatePostMortem('high', 5, 2)).toBe(true);
    });

    it('should require post-mortem for medium incidents > 30 minutes', () => {
      expect(shouldCreatePostMortem('medium', 35, 2)).toBe(true);
    });

    it('should not require post-mortem for medium incidents < 30 minutes', () => {
      expect(shouldCreatePostMortem('medium', 20, 2)).toBe(false);
    });

    it('should require post-mortem for low incidents with high playbook impact', () => {
      expect(shouldCreatePostMortem('low', 5, 20)).toBe(true);
    });

    it('should not require post-mortem for low incidents with low playbook impact', () => {
      expect(shouldCreatePostMortem('low', 5, 10)).toBe(false);
    });
  });

  describe('Learning Extraction', () => {
    it('should extract root cause learning', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-005',
        'Test Incident',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'high',
        'database',
        'Connection pool exhausted',
        ['database'],
        metrics
      );

      const learnings = extractLearnings(postMortem);

      expect(learnings.length).toBeGreaterThan(0);
      const rootCauseLearning = learnings.find((l) => l.category === 'root-cause');
      expect(rootCauseLearning).toBeDefined();
      expect(rootCauseLearning?.title).toContain('Root Cause');
    });

    it('should extract detection gap for high MTTD', () => {
      const metrics = createMockMetrics({ averageMTTD: 5 });
      const postMortem = createPostMortem(
        'incident-006',
        'Slow Detection',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:15:00Z',
        'medium',
        'api',
        'Silent failure',
        ['api'],
        metrics
      );

      const learnings = extractLearnings(postMortem);
      const detectionGap = learnings.find((l) => l.category === 'detection-gap');
      expect(detectionGap).toBeDefined();
    });

    it('should extract resolution improvement need for high MTTR', () => {
      const metrics = createMockMetrics({ averageMTTR: 45 });
      const postMortem = createPostMortem(
        'incident-007',
        'Slow Resolution',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:50:00Z',
        'high',
        'deployment',
        'Complex rollback procedure',
        ['api'],
        metrics
      );

      const learnings = extractLearnings(postMortem);
      const processImprovement = learnings.find((l) => l.category === 'process-improvement');
      expect(processImprovement?.description).toContain('45 minutes');
    });

    it('should extract playbook effectiveness issues', () => {
      const metrics = createMockMetrics({ successRate: 60 });
      const postMortem = createPostMortem(
        'incident-008',
        'Playbook Failed',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:20:00Z',
        'medium',
        'database',
        'Playbook not applicable',
        ['database'],
        metrics
      );

      const learnings = extractLearnings(postMortem);
      const toolGap = learnings.find((l) => l.category === 'tool-gap');
      expect(toolGap).toBeDefined();
    });

    it('should extract multi-system correlation insights', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-009',
        'Cascading Failure',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:30:00Z',
        'critical',
        'infrastructure',
        'Network partition',
        ['database', 'api', 'deployment'],
        metrics
      );

      const learnings = extractLearnings(postMortem);
      const correlation = learnings.find((l) => l.category === 'process-improvement' && l.title === 'Multi-System Correlation');
      expect(correlation).toBeDefined();
    });
  });

  describe('Insight Generation', () => {
    it('should generate severity confirmation insight', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-010',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'high',
        'api',
        'Cause',
        ['api'],
        metrics
      );

      const insights = generateInsights(postMortem);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].insight).toContain('Severity classification');
    });

    it('should generate root cause insight', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-011',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'medium',
        'database',
        'Pool size too small',
        ['database'],
        metrics
      );

      const insights = generateInsights(postMortem);
      expect(insights.some((i) => i.insight.includes('Pool size too small'))).toBe(true);
    });

    it('should praise fast detection', () => {
      const metrics = createMockMetrics({ averageMTTD: 0.5 });
      const postMortem = createPostMortem(
        'incident-012',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'medium',
        'api',
        'Cause',
        ['api'],
        metrics
      );

      const insights = generateInsights(postMortem);
      expect(insights.some((i) => i.insight.includes('performed excellently'))).toBe(true);
    });

    it('should flag slow detection', () => {
      const metrics = createMockMetrics({ averageMTTD: 10 });
      const postMortem = createPostMortem(
        'incident-013',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'high',
        'api',
        'Cause',
        ['api'],
        metrics
      );

      const insights = generateInsights(postMortem);
      expect(insights.some((i) => i.insight.includes('Detection was delayed'))).toBe(true);
    });
  });

  describe('Prevention Plan Creation', () => {
    it('should create prevention plan from learnings', () => {
      const learnings = [
        {
          category: 'root-cause' as const,
          title: 'Database Pool Size',
          description: 'Pool size needs increase',
          actionable: true,
          priority: 'high' as const,
        },
        {
          category: 'detection-gap' as const,
          title: 'Add Monitoring',
          description: 'Monitor pool usage',
          actionable: true,
          priority: 'medium' as const,
        },
      ];

      const plan = createPreventionPlan(learnings);

      expect(plan.preventionMeasures.length).toBe(2);
      expect(plan.preventionMeasures[0].category).toBe('process');
      expect(plan.preventionMeasures[1].category).toBe('monitoring');
    });

    it('should set effectiveness based on measure count', () => {
      const learnings = Array(5).fill({
        category: 'root-cause' as const,
        title: 'Test',
        description: 'Test',
        actionable: true,
        priority: 'medium' as const,
      });

      const plan = createPreventionPlan(learnings);
      expect(plan.estimatedEffectiveness).toBe(75);
    });

    it('should handle non-actionable learnings', () => {
      const learnings = [
        {
          category: 'root-cause' as const,
          title: 'Actionable',
          description: 'Can fix',
          actionable: true,
          priority: 'high' as const,
        },
        {
          category: 'training-need' as const,
          title: 'Non-actionable',
          description: 'Cannot fix',
          actionable: false,
          priority: 'low' as const,
        },
      ];

      const plan = createPreventionPlan(learnings);
      expect(plan.preventionMeasures.length).toBe(1);
    });
  });

  describe('Post-Mortem Metrics Analysis', () => {
    it('should analyze metrics from empty list', () => {
      const metrics = analyzePostMortemMetrics([]);

      expect(metrics.totalIncidents).toBe(0);
      expect(metrics.incidentsReviewed).toBe(0);
      expect(metrics.topRootCauses.length).toBe(0);
    });

    it('should calculate average duration', () => {
      const pm1 = createPostMortem('inc1', 'T1', '2026-07-10T12:00:00Z', '2026-07-10T12:20:00Z', 'medium', 'db', 'C1', ['db'], createMockMetrics({}));
      pm1.status = 'approved';
      const pm2 = createPostMortem('inc2', 'T2', '2026-07-10T13:00:00Z', '2026-07-10T13:30:00Z', 'medium', 'api', 'C2', ['api'], createMockMetrics({}));
      pm2.status = 'approved';

      const metrics = analyzePostMortemMetrics([pm1, pm2]);

      expect(metrics.avgDurationMinutes).toBe(25);
    });

    it('should identify top root causes', () => {
      const pm1 = createPostMortem('inc1', 'T1', '2026-07-10T12:00:00Z', '2026-07-10T12:20:00Z', 'medium', 'db', 'Out of Memory', ['db'], createMockMetrics({}));
      const pm2 = createPostMortem('inc2', 'T2', '2026-07-10T13:00:00Z', '2026-07-10T13:30:00Z', 'medium', 'db', 'Out of Memory', ['db'], createMockMetrics({}));
      const pm3 = createPostMortem('inc3', 'T3', '2026-07-10T14:00:00Z', '2026-07-10T14:15:00Z', 'low', 'api', 'Timeout', ['api'], createMockMetrics({}));

      const metrics = analyzePostMortemMetrics([pm1, pm2, pm3]);

      expect(metrics.topRootCauses[0].cause).toBe('Out of Memory');
      expect(metrics.topRootCauses[0].count).toBe(2);
    });

    it('should identify top affected systems', () => {
      const pm1 = createPostMortem('inc1', 'T1', '2026-07-10T12:00:00Z', '2026-07-10T12:20:00Z', 'medium', 'db', 'C1', ['database', 'api'], createMockMetrics({}));
      const pm2 = createPostMortem('inc2', 'T2', '2026-07-10T13:00:00Z', '2026-07-10T13:30:00Z', 'medium', 'api', 'C2', ['api'], createMockMetrics({}));

      const metrics = analyzePostMortemMetrics([pm1, pm2]);

      expect(metrics.topAffectedSystems.some((s) => s.system === 'api')).toBe(true);
    });

    it('should calculate recurring regression rate', () => {
      const pm1 = createPostMortem('inc1', 'T1', '2026-07-10T12:00:00Z', '2026-07-10T12:20:00Z', 'medium', 'db', 'Connection Pool', ['db'], createMockMetrics({}));
      const pm2 = createPostMortem('inc2', 'T2', '2026-07-10T13:00:00Z', '2026-07-10T13:30:00Z', 'medium', 'db', 'Connection Pool', ['db'], createMockMetrics({}));
      const pm3 = createPostMortem('inc3', 'T3', '2026-07-10T14:00:00Z', '2026-07-10T14:15:00Z', 'low', 'api', 'Different Cause', ['api'], createMockMetrics({}));

      const metrics = analyzePostMortemMetrics([pm1, pm2, pm3]);

      expect(metrics.regressionRecurrenceRate).toBeGreaterThan(0);
    });
  });

  describe('GitHub Issue Formatting', () => {
    it('should format post-mortem for GitHub issue', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-014',
        'Database Failure',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'critical',
        'database',
        'Connection pool exhausted',
        ['database', 'api'],
        metrics
      );
      postMortem.learnings = extractLearnings(postMortem);
      postMortem.insights = generateInsights(postMortem);

      const issue = formatPostMortemIssue(postMortem);

      expect(issue.title).toContain('Post-Mortem');
      expect(issue.title).toContain('CRITICAL');
      expect(issue.body).toContain('Incident Overview');
      expect(issue.body).toContain('impact');
      expect(issue.labels).toContain('post-mortem');
      expect(issue.labels).toContain('severity-critical');
    });

    it('should include incident metrics in issue', () => {
      const metrics = createMockMetrics({ averageMTTR: 30, averageMTTD: 5 });
      const postMortem = createPostMortem(
        'incident-015',
        'API Timeout',
        '2026-07-10T10:00:00Z',
        '2026-07-10T10:45:00Z',
        'high',
        'api',
        'Database slow query',
        ['api', 'database'],
        metrics
      );

      const issue = formatPostMortemIssue(postMortem);

      expect(issue.body).toContain('30');
      expect(issue.body).toContain('5');
    });

    it('should include learnings in issue', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-016',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'medium',
        'api',
        'Cause',
        ['api'],
        metrics
      );
      postMortem.learnings = extractLearnings(postMortem);

      const issue = formatPostMortemIssue(postMortem);

      expect(issue.body).toContain('Key Learnings');
    });

    it('should include prevention plan in issue', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-017',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'high',
        'db',
        'Cause',
        ['db'],
        metrics
      );
      postMortem.learnings = extractLearnings(postMortem);
      postMortem.preventionPlan = createPreventionPlan(postMortem.learnings);

      const issue = formatPostMortemIssue(postMortem);

      expect(issue.body).toContain('Prevention Plan');
    });

    it('should include related regressions in issue', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-018',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:25:00Z',
        'high',
        'api',
        'Cause',
        ['api'],
        metrics,
        ['82', '83']
      );

      const issue = formatPostMortemIssue(postMortem);

      expect(issue.body).toContain('Related Regressions');
      expect(issue.body).toContain('#82');
    });
  });

  describe('Edge Cases', () => {
    it('should handle incidents with no affected systems', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-019',
        'Test',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:05:00Z',
        'low',
        'unknown',
        'Unknown cause',
        [],
        metrics
      );

      expect(postMortem).toBeDefined();
      expect(postMortem.impactedSystems.length).toBe(0);
    });

    it('should handle very short incidents', () => {
      const metrics = createMockMetrics({});
      const postMortem = createPostMortem(
        'incident-020',
        'Brief Issue',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:00:01Z',
        'low',
        'api',
        'Quick recovery',
        ['api'],
        metrics
      );

      expect(postMortem.durationMinutes).toBe(0);
    });

    it('should handle incidents with zero metrics', () => {
      const metrics = createMockMetrics({ averageMTTR: 0, averageMTTD: 0, successRate: 100 });
      const postMortem = createPostMortem(
        'incident-021',
        'No impact incident',
        '2026-07-10T12:00:00Z',
        '2026-07-10T12:05:00Z',
        'low',
        'monitoring',
        'False alarm',
        [],
        metrics
      );

      expect(postMortem.metrics.successRateImpact).toBe(0);
    });
  });
});
