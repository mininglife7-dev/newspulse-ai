import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatPreventionIssue,
  orchestratePreventionIssues,
  validatePreventionEffectiveness,
  analyzePreventionEffectiveness,
  createPreventionIssueLink,
  generateMeasureId,
  type PreventionMeasureOrchestrationRequest,
  type PreventionIssueLink,
} from '@/lib/prevention-measure-orchestration';
import type { PreventionMeasure } from '@/lib/post-mortem';

describe('Prevention Measure Orchestration (DNS-024)', () => {
  describe('Measure ID Generation', () => {
    it('should generate unique measure IDs', () => {
      const id1 = generateMeasureId('incident-001', 0);
      const id2 = generateMeasureId('incident-001', 1);

      expect(id1).toBe('incident-001-measure-0');
      expect(id2).toBe('incident-001-measure-1');
      expect(id1).not.toBe(id2);
    });

    it('should generate consistent IDs for same input', () => {
      const id1 = generateMeasureId('incident-001', 0);
      const id2 = generateMeasureId('incident-001', 0);

      expect(id1).toBe(id2);
    });
  });

  describe('Issue Formatting', () => {
    it('should format prevention issue correctly', () => {
      const measure: PreventionMeasure = {
        measure: 'Add monitoring for database connections',
        category: 'monitoring',
        priority: 'high',
        owner: 'ops-team',
        dueDate: '2026-07-17',
        status: 'not-started',
      };

      const issue = formatPreventionIssue(
        'incident-001',
        'Database Connection Pool Exhaustion',
        measure,
        0,
        'high',
        ['#123', '#124']
      );

      expect(issue.title).toContain('Add monitoring for database connections');
      expect(issue.body).toContain('incident-001');
      expect(issue.body).toContain('Database Connection Pool Exhaustion');
      expect(issue.body).toContain('monitoring');
      expect(issue.body).toContain('ops-team');
      expect(issue.labels).toContain('prevention-measure');
      expect(issue.labels).toContain('type/monitoring');
      expect(issue.labels).toContain('P0');
      expect(issue.labels).toContain('severity-high');
    });

    it('should include related regressions in issue body', () => {
      const measure: PreventionMeasure = {
        measure: 'Implement circuit breaker',
        category: 'automation',
        priority: 'high',
        status: 'not-started',
      };

      const issue = formatPreventionIssue(
        'incident-002',
        'API Service Cascade Failure',
        measure,
        0,
        'critical',
        ['#500', '#501']
      );

      expect(issue.body).toContain('#500');
      expect(issue.body).toContain('#501');
      expect(issue.labels).toContain('severity-critical');
    });

    it('should map priority levels correctly', () => {
      const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
      const expectedLabels = ['P0', 'P1', 'P2'];

      priorities.forEach((priority, index) => {
        const measure: PreventionMeasure = {
          measure: 'Test measure',
          category: 'process',
          priority,
          status: 'not-started',
        };

        const issue = formatPreventionIssue(
          'incident-test',
          'Test',
          measure,
          0,
          'medium',
          []
        );

        expect(issue.labels).toContain(expectedLabels[index]);
      });
    });

    it('should include category labels', () => {
      const categories: Array<'process' | 'tooling' | 'training' | 'monitoring' | 'automation'> = [
        'process',
        'tooling',
        'training',
        'monitoring',
        'automation',
      ];
      const expectedLabels = [
        'type/process',
        'type/tooling',
        'type/training',
        'type/monitoring',
        'type/automation',
      ];

      categories.forEach((category, index) => {
        const measure: PreventionMeasure = {
          measure: 'Test measure',
          category,
          priority: 'medium',
          status: 'not-started',
        };

        const issue = formatPreventionIssue(
          'incident-test',
          'Test',
          measure,
          0,
          'medium',
          []
        );

        expect(issue.labels).toContain(expectedLabels[index]);
      });
    });
  });

  describe('Issue Orchestration', () => {
    it('should orchestrate prevention issue creation', async () => {
      const request: PreventionMeasureOrchestrationRequest = {
        incidentId: 'incident-001',
        postMortemTitle: 'Database Failure Post-Mortem',
        preventionMeasures: [
          {
            measure: 'Add connection pooling',
            category: 'tooling',
            priority: 'high',
            status: 'not-started',
          },
          {
            measure: 'Implement health checks',
            category: 'monitoring',
            priority: 'high',
            status: 'not-started',
          },
        ],
        relatedRegressions: ['#100'],
        severity: 'critical',
      };

      const results = await orchestratePreventionIssues(request);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].issueNumber).toBeDefined();
      expect(results[1].success).toBe(true);
      expect(results[1].issueNumber).toBeDefined();
      expect(results[0].issueNumber).not.toBe(results[1].issueNumber);
    });

    it('should handle invalid prevention measures', async () => {
      const request: PreventionMeasureOrchestrationRequest = {
        incidentId: 'incident-002',
        postMortemTitle: 'Test Post-Mortem',
        preventionMeasures: [
          {
            measure: '',
            category: 'process',
            priority: 'medium',
            status: 'not-started',
          } as PreventionMeasure,
        ],
        relatedRegressions: [],
        severity: 'medium',
      };

      const results = await orchestratePreventionIssues(request);

      expect(results[0].success).toBe(false);
      expect(results[0].errorMessage).toBeDefined();
    });

    it('should generate measure IDs in results', async () => {
      const request: PreventionMeasureOrchestrationRequest = {
        incidentId: 'incident-003',
        postMortemTitle: 'Test',
        preventionMeasures: [
          {
            measure: 'Measure 1',
            category: 'process',
            priority: 'high',
            status: 'not-started',
          },
        ],
        relatedRegressions: [],
        severity: 'high',
      };

      const results = await orchestratePreventionIssues(request);

      expect(results[0].measureId).toContain('incident-003');
      expect(results[0].measureId).toContain('measure');
    });
  });

  describe('Prevention Effectiveness Validation', () => {
    it('should mark closed measure without regression as effective', () => {
      const link: PreventionIssueLink = {
        measureId: 'measure-1',
        githubIssueNumber: 5001,
        createdAt: '2026-07-10T10:00:00Z',
        linkedIncidentId: 'incident-001',
        linkedRegressionIds: ['#100'],
        status: 'closed',
        closedAt: '2026-07-12T10:00:00Z',
      };

      const result = validatePreventionEffectiveness(link, 0);

      expect(result.effective).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should mark closed measure with regression as ineffective', () => {
      const link: PreventionIssueLink = {
        measureId: 'measure-2',
        githubIssueNumber: 5002,
        createdAt: '2026-07-10T10:00:00Z',
        linkedIncidentId: 'incident-002',
        linkedRegressionIds: ['#101'],
        status: 'closed',
        closedAt: '2026-07-12T10:00:00Z',
      };

      const result = validatePreventionEffectiveness(link, 10);

      expect(result.effective).toBe(false);
    });

    it('should mark in-progress measure as unknown effectiveness', () => {
      const link: PreventionIssueLink = {
        measureId: 'measure-3',
        githubIssueNumber: 5003,
        createdAt: '2026-07-10T10:00:00Z',
        linkedIncidentId: 'incident-003',
        linkedRegressionIds: ['#102'],
        status: 'in-progress',
      };

      const result = validatePreventionEffectiveness(link, 0);

      expect(result.effective).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Prevention Issue Links', () => {
    it('should create prevention issue link with correct structure', () => {
      const link = createPreventionIssueLink('measure-1', 5001, 'incident-001', ['#100', '#101']);

      expect(link.measureId).toBe('measure-1');
      expect(link.githubIssueNumber).toBe(5001);
      expect(link.linkedIncidentId).toBe('incident-001');
      expect(link.linkedRegressionIds).toContain('#100');
      expect(link.linkedRegressionIds).toContain('#101');
      expect(link.status).toBe('open');
      expect(link.closedAt).toBeUndefined();
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const link = createPreventionIssueLink('measure-2', 5002, 'incident-002', []);
      const after = new Date();

      const created = new Date(link.createdAt);
      expect(created.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Prevention Effectiveness Analysis', () => {
    it('should analyze multiple prevention measures', () => {
      const links: PreventionIssueLink[] = [
        createPreventionIssueLink('measure-1', 5001, 'incident-001', ['#100']),
        createPreventionIssueLink('measure-2', 5002, 'incident-001', ['#101']),
      ];

      // Mark first as closed and effective
      links[0].status = 'closed';
      links[0].closedAt = new Date().toISOString();

      const metrics = analyzePreventionEffectiveness(links, 0);

      expect(metrics.totalMeasures).toBe(2);
      expect(metrics.issuesCreated).toBe(2);
      expect(metrics.issuesClosed).toBe(1);
      expect(metrics.avgClosureTime).toBeDefined();
      expect(metrics.preventionEffectiveness).toBeGreaterThan(0);
    });

    it('should calculate zero effectiveness when all closed measures had regressions', () => {
      const links: PreventionIssueLink[] = [
        {
          measureId: 'measure-1',
          githubIssueNumber: 5001,
          createdAt: '2026-07-10T10:00:00Z',
          linkedIncidentId: 'incident-001',
          linkedRegressionIds: ['#100'],
          status: 'closed',
          closedAt: '2026-07-11T10:00:00Z',
        },
      ];

      const metrics = analyzePreventionEffectiveness(links, 10); // 10% recurrence

      expect(metrics.preventionEffectiveness).toBe(0);
    });

    it('should calculate 100% effectiveness when all closed measures were effective', () => {
      const links: PreventionIssueLink[] = [
        {
          measureId: 'measure-1',
          githubIssueNumber: 5001,
          createdAt: '2026-07-10T10:00:00Z',
          linkedIncidentId: 'incident-001',
          linkedRegressionIds: ['#100'],
          status: 'closed',
          closedAt: '2026-07-11T10:00:00Z',
        },
        {
          measureId: 'measure-2',
          githubIssueNumber: 5002,
          createdAt: '2026-07-10T10:00:00Z',
          linkedIncidentId: 'incident-001',
          linkedRegressionIds: ['#101'],
          status: 'closed',
          closedAt: '2026-07-12T10:00:00Z',
        },
      ];

      const metrics = analyzePreventionEffectiveness(links, 0); // 0% recurrence

      expect(metrics.preventionEffectiveness).toBe(100);
    });

    it('should calculate average closure time', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const links: PreventionIssueLink[] = [
        {
          measureId: 'measure-1',
          githubIssueNumber: 5001,
          createdAt: oneHourAgo.toISOString(),
          linkedIncidentId: 'incident-001',
          linkedRegressionIds: ['#100'],
          status: 'closed',
          closedAt: now.toISOString(),
        },
      ];

      const metrics = analyzePreventionEffectiveness(links, 0);

      expect(metrics.avgClosureTime).toBeDefined();
      expect(metrics.avgClosureTime).toBeGreaterThan(50); // ~60 minutes
      expect(metrics.avgClosureTime).toBeLessThan(70);
    });

    it('should handle empty prevention issues', () => {
      const metrics = analyzePreventionEffectiveness([], 0);

      expect(metrics.totalMeasures).toBe(0);
      expect(metrics.issuesCreated).toBe(0);
      expect(metrics.issuesClosed).toBe(0);
      expect(metrics.preventionEffectiveness).toBe(0);
      expect(metrics.avgClosureTime).toBeUndefined();
    });

    it('should timestamp metrics correctly', () => {
      const before = new Date();
      const metrics = analyzePreventionEffectiveness([], 0);
      const after = new Date();

      const metricsTime = new Date(metrics.timestamp);
      expect(metricsTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metricsTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle prevention measures with no owner', () => {
      const measure: PreventionMeasure = {
        measure: 'Deploy monitoring',
        category: 'monitoring',
        priority: 'high',
        status: 'not-started',
      };

      const issue = formatPreventionIssue('incident-001', 'Test', measure, 0, 'high', []);

      expect(issue.body).toContain('Unassigned');
    });

    it('should handle prevention measures with no due date', () => {
      const measure: PreventionMeasure = {
        measure: 'Update documentation',
        category: 'training',
        priority: 'medium',
        status: 'not-started',
      };

      const issue = formatPreventionIssue('incident-001', 'Test', measure, 0, 'medium', []);

      expect(issue.body).toContain('Not set');
    });

    it('should handle no related regressions', async () => {
      const request: PreventionMeasureOrchestrationRequest = {
        incidentId: 'incident-001',
        postMortemTitle: 'Test',
        preventionMeasures: [
          {
            measure: 'Test measure',
            category: 'process',
            priority: 'high',
            status: 'not-started',
          },
        ],
        relatedRegressions: [],
        severity: 'high',
      };

      const results = await orchestratePreventionIssues(request);

      expect(results[0].success).toBe(true);
    });

    it('should handle large number of prevention measures', async () => {
      const measures: PreventionMeasure[] = Array.from({ length: 50 }, (_, i) => ({
        measure: `Measure ${i}`,
        category: 'process' as const,
        priority: 'high' as const,
        status: 'not-started' as const,
      }));

      const request: PreventionMeasureOrchestrationRequest = {
        incidentId: 'incident-large',
        postMortemTitle: 'Large Test',
        preventionMeasures: measures,
        relatedRegressions: [],
        severity: 'high',
      };

      const results = await orchestratePreventionIssues(request);

      expect(results).toHaveLength(50);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should orchestrate full prevention workflow', async () => {
      // 1. Create prevention measures from post-mortem
      const request: PreventionMeasureOrchestrationRequest = {
        incidentId: 'incident-workflow',
        postMortemTitle: 'Critical Database Incident',
        preventionMeasures: [
          {
            measure: 'Add failover replication',
            category: 'tooling',
            priority: 'high',
            status: 'not-started',
          },
          {
            measure: 'Enhance monitoring',
            category: 'monitoring',
            priority: 'high',
            status: 'not-started',
          },
        ],
        relatedRegressions: ['#200'],
        severity: 'critical',
      };

      // 2. Orchestrate issue creation
      const results = await orchestratePreventionIssues(request);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);

      // 3. Create issue links
      const links = results.map((r) =>
        createPreventionIssueLink(
          r.measureId,
          r.issueNumber!,
          request.incidentId,
          request.relatedRegressions
        )
      );

      expect(links).toHaveLength(2);

      // 4. Analyze effectiveness
      const metrics = analyzePreventionEffectiveness(links, 0);

      expect(metrics.totalMeasures).toBe(2);
      expect(metrics.issuesCreated).toBe(2);
      expect(metrics.issuesClosed).toBe(0);
    });

    it('should track lifecycle of prevention measures', () => {
      // Create link
      const link = createPreventionIssueLink('measure-1', 5001, 'incident-001', ['#100']);
      expect(link.status).toBe('open');

      // Simulate progression
      link.status = 'in-progress';
      const metricsProgress = analyzePreventionEffectiveness([link], 0);
      expect(metricsProgress.issuesClosed).toBe(0);

      // Close with effectiveness
      link.status = 'closed';
      link.closedAt = new Date().toISOString();
      const metricsClosed = analyzePreventionEffectiveness([link], 0);
      expect(metricsClosed.issuesClosed).toBe(1);
      expect(metricsClosed.preventionEffectiveness).toBe(100);
    });
  });
});
