import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlaybookForCategory,
  recordPlaybookUsage,
  getPlaybook,
  getAllPlaybooks,
  analyzePlaybookEffectiveness,
  applyPlaybookImprovement,
  getPlaybookImprovements,
  getPlaybookAnalysisHistory,
  generatePlaybookReport,
  formatPlaybookAsMarkdown,
  resetPlaybookStore,
  type PlaybookCategory,
} from '@/lib/playbook-optimization';

describe('DNS-021: Playbook Optimization', () => {
  beforeEach(() => {
    resetPlaybookStore();
  });

  describe('Playbook Retrieval', () => {
    it('retrieves playbook for incident category', () => {
      const playbook = getPlaybookForCategory('deployment');

      expect(playbook).toBeDefined();
      expect(playbook?.category).toBe('deployment');
      expect(playbook?.steps.length).toBeGreaterThan(0);
    });

    it('returns undefined for non-existent category', () => {
      const playbook = getPlaybookForCategory('unknown-category' as PlaybookCategory);
      expect(playbook).toBeUndefined();
    });

    it('retrieves playbook by ID', () => {
      const original = getPlaybookForCategory('deployment');
      if (original) {
        const retrieved = getPlaybook(original.id);
        expect(retrieved).toEqual(original);
      }
    });

    it('gets all playbooks sorted by effectiveness', () => {
      const playbooks = getAllPlaybooks();

      expect(playbooks.length).toBeGreaterThan(0);
      for (let i = 0; i < playbooks.length - 1; i++) {
        expect(playbooks[i].effectiveness).toBeGreaterThanOrEqual(playbooks[i + 1].effectiveness);
      }
    });
  });

  describe('Playbook Usage Tracking', () => {
    it('records playbook usage for incident', () => {
      const playbook = getPlaybookForCategory('database');
      if (playbook) {
        const initialUsage = playbook.usageCount;

        recordPlaybookUsage('incident-123', playbook.id);

        const updated = getPlaybook(playbook.id);
        expect(updated?.usageCount).toBe(initialUsage + 1);
        expect(updated?.lastUsedAt).toBeDefined();
      }
    });

    it('updates last used timestamp', () => {
      const playbook = getPlaybookForCategory('api');
      if (playbook) {
        recordPlaybookUsage('incident-456', playbook.id);
        const before = new Date().getTime();

        recordPlaybookUsage('incident-789', playbook.id);

        const updated = getPlaybook(playbook.id);
        const after = new Date().getTime();

        expect(updated?.lastUsedAt).toBeDefined();
        if (updated?.lastUsedAt) {
          const timestamp = new Date(updated.lastUsedAt).getTime();
          expect(timestamp).toBeGreaterThanOrEqual(before);
          expect(timestamp).toBeLessThanOrEqual(after);
        }
      }
    });
  });

  describe('Playbook Effectiveness Analysis', () => {
    it('analyzes playbook effectiveness from incident data', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const incidents = [
        {
          id: 'inc-1',
          category: 'deployment' as PlaybookCategory,
          resolved: true,
          resolutionTime: 10,
          findings: [{ title: 'Fast rollback', category: 'positive', impact: 'high' as const }],
        },
        {
          id: 'inc-2',
          category: 'deployment' as PlaybookCategory,
          resolved: true,
          resolutionTime: 12,
          findings: [{ title: 'Clear communication', category: 'positive', impact: 'high' as const }],
        },
        {
          id: 'inc-3',
          category: 'deployment' as PlaybookCategory,
          resolved: false,
          resolutionTime: 25,
          findings: [
            { title: 'Missing rollback procedure', category: 'gap', impact: 'high' as const },
            { title: 'No automation endpoint', category: 'gap', impact: 'medium' as const },
          ],
        },
      ];

      const analysis = analyzePlaybookEffectiveness(playbook.id, incidents);

      expect(analysis).toBeDefined();
      expect(analysis.recentIncidents).toBe(3);
      expect(analysis.successfulResolutions).toBe(2);
      expect(analysis.failedResolutions).toBe(1);
      expect(analysis.commonFailures).toContain('Missing rollback procedure');
    });

    it('calculates effectiveness score from success rate and time efficiency', () => {
      const playbook = getPlaybookForCategory('database');
      if (!playbook) return;

      const incidents = Array.from({ length: 10 }, (_, i) => ({
        id: `inc-${i}`,
        category: 'database' as PlaybookCategory,
        resolved: i < 8,
        resolutionTime: 20 + i * 2,
        findings: [{ title: 'Issue', category: 'gap', impact: 'medium' as const }],
      }));

      const analysis = analyzePlaybookEffectiveness(playbook.id, incidents);

      expect(analysis.effectivenessScore).toBeGreaterThan(0);
      expect(analysis.effectivenessScore).toBeLessThanOrEqual(100);
    });

    it('identifies declining playbook performance', () => {
      const playbook = getPlaybookForCategory('api');
      if (!playbook) return;

      const incidents = Array.from({ length: 10 }, (_, i) => ({
        id: `inc-${i}`,
        category: 'api' as PlaybookCategory,
        resolved: i < 5,
        resolutionTime: 15,
        findings: [{ title: 'Rate limit issue', category: 'gap', impact: 'high' as const }],
      }));

      const analysis = analyzePlaybookEffectiveness(playbook.id, incidents);

      if (analysis.effectivenessScore < playbook.effectiveness) {
        expect(analysis.trendDirection).toBe('declining');
      }
    });

    it('suggests improvements for failing playbooks', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const incidents = Array.from({ length: 5 }, (_, i) => ({
        id: `inc-${i}`,
        category: 'deployment' as PlaybookCategory,
        resolved: i === 0,
        resolutionTime: 30,
        findings: [
          { title: 'Missing validation step', category: 'gap', impact: 'high' as const },
          { title: 'No automated rollback', category: 'gap', impact: 'high' as const },
        ],
      }));

      const analysis = analyzePlaybookEffectiveness(playbook.id, incidents);

      if (analysis.successfulResolutions < 3) {
        expect(analysis.suggestedImprovements.length).toBeGreaterThan(0);
        expect(analysis.suggestedImprovements[0].priority).toBeDefined();
      }
    });
  });

  describe('Playbook Improvements', () => {
    it('applies step addition improvement', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const originalStepCount = playbook.steps.length;
      const newStep = {
        id: 'new-step',
        order: originalStepCount + 1,
        title: 'Validation Check',
        description: 'Verify deployment worked',
        expectedDuration: 5,
      };

      applyPlaybookImprovement(playbook.id, 'add-step', newStep, 'Add validation based on post-mortem findings');

      const updated = getPlaybook(playbook.id);
      expect(updated?.steps.length).toBe(originalStepCount + 1);
      expect(updated?.version).toBeGreaterThan(1);
    });

    it('applies step removal improvement', () => {
      const playbook = getPlaybookForCategory('database');
      if (!playbook || playbook.steps.length === 0) return;

      const stepToRemove = playbook.steps[0];
      const originalStepCount = playbook.steps.length;

      applyPlaybookImprovement(playbook.id, 'remove-step', {}, 'Redundant step removed', stepToRemove.id);

      const updated = getPlaybook(playbook.id);
      expect(updated?.steps.length).toBe(originalStepCount - 1);
      expect(updated?.steps.find((s) => s.id === stepToRemove.id)).toBeUndefined();
    });

    it('applies duration update improvement', () => {
      const playbook = getPlaybookForCategory('api');
      if (!playbook || playbook.steps.length === 0) return;

      const stepToUpdate = playbook.steps[0];
      const originalDuration = stepToUpdate.expectedDuration;

      applyPlaybookImprovement(
        playbook.id,
        'update-duration',
        { newDuration: 10 },
        'Optimized step based on data',
        stepToUpdate.id
      );

      const updated = getPlaybook(playbook.id);
      const updatedStep = updated?.steps.find((s) => s.id === stepToUpdate.id);
      expect(updatedStep?.expectedDuration).toBe(10);
      expect(updatedStep?.expectedDuration).not.toBe(originalDuration);
    });

    it('applies automation addition improvement', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook || playbook.steps.length === 0) return;

      const stepToUpdate = playbook.steps[0];

      applyPlaybookImprovement(
        playbook.id,
        'add-automation',
        { automation: '/api/deployments/validate' },
        'Automate validation step',
        stepToUpdate.id
      );

      const updated = getPlaybook(playbook.id);
      const updatedStep = updated?.steps.find((s) => s.id === stepToUpdate.id);
      expect(updatedStep?.automation).toBe('/api/deployments/validate');
    });

    it('retrieves improvement history for playbook', () => {
      const playbook = getPlaybookForCategory('database');
      if (!playbook) return;

      const newStep = {
        id: 'new-step-1',
        order: 6,
        title: 'New Step',
        description: 'Test',
        expectedDuration: 5,
      };

      applyPlaybookImprovement(playbook.id, 'add-step', newStep, 'First improvement');
      applyPlaybookImprovement(
        playbook.id,
        'update-duration',
        { newDuration: 8 },
        'Second improvement',
        playbook.steps[0].id
      );

      const improvements = getPlaybookImprovements(playbook.id);

      expect(improvements.length).toBe(2);
      expect(improvements.every((i) => i.playbookId === playbook.id)).toBe(true);
    });
  });

  describe('Playbook Analysis', () => {
    it('retrieves playbook analysis history', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const incidents = [
        {
          id: 'inc-1',
          category: 'deployment' as PlaybookCategory,
          resolved: true,
          resolutionTime: 12,
          findings: [{ title: 'Good', category: 'positive', impact: 'high' as const }],
        },
      ];

      analyzePlaybookEffectiveness(playbook.id, incidents);
      analyzePlaybookEffectiveness(playbook.id, incidents);

      const history = getPlaybookAnalysisHistory(playbook.id);

      expect(history.length).toBe(2);
      expect(history.every((a) => a.playbookId === playbook.id)).toBe(true);
    });
  });

  describe('Playbook Reporting', () => {
    it('generates playbook effectiveness report', () => {
      const report = generatePlaybookReport();

      expect(report.totalPlaybooks).toBeGreaterThan(0);
      expect(report.averageEffectiveness).toBeGreaterThan(0);
      expect(report.averageEffectiveness).toBeLessThanOrEqual(100);
      expect(report.mostEffective).toBeDefined();
      expect(report.leastEffective).toBeDefined();
    });

    it('identifies playbooks needing improvement', () => {
      const report = generatePlaybookReport();

      for (const playbook of report.playbooksNeedingImprovement) {
        expect(playbook.effectiveness).toBeLessThan(70);
      }
    });

    it('includes recent improvements in report', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const newStep = {
        id: 'new',
        order: 10,
        title: 'Test',
        description: 'Test',
        expectedDuration: 5,
      };

      applyPlaybookImprovement(playbook.id, 'add-step', newStep, 'Test improvement');

      const report = generatePlaybookReport();

      expect(report.recentImprovements.length).toBeGreaterThan(0);
      expect(report.recentImprovements[report.recentImprovements.length - 1].rationale).toContain('Test improvement');
    });
  });

  describe('Playbook Formatting', () => {
    it('formats playbook as markdown', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const markdown = formatPlaybookAsMarkdown(playbook);

      expect(markdown).toContain('# Incident Response Playbook: DEPLOYMENT');
      expect(markdown).toContain('## Steps');
      expect(markdown).toContain('## Tags');
      expect(markdown).toContain('Effectiveness');
      expect(markdown).toContain('Success Rate');
    });

    it('includes all playbook steps in markdown', () => {
      const playbook = getPlaybookForCategory('database');
      if (!playbook) return;

      const markdown = formatPlaybookAsMarkdown(playbook);

      for (const step of playbook.steps) {
        expect(markdown).toContain(step.title);
        expect(markdown).toContain(step.description);
      }
    });

    it('includes automation endpoints in markdown when present', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const markdown = formatPlaybookAsMarkdown(playbook);

      const automatedSteps = playbook.steps.filter((s) => s.automation);
      if (automatedSteps.length > 0) {
        for (const step of automatedSteps) {
          if (step.automation) {
            expect(markdown).toContain(step.automation);
          }
        }
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('closes feedback loop: incident → analysis → improvement → updated playbook', () => {
      const playbook = getPlaybookForCategory('api');
      if (!playbook) return;

      const initialVersion = playbook.version;
      const initialEffectiveness = playbook.effectiveness;

      // Simulate incidents
      const incidents = [
        {
          id: 'inc-1',
          category: 'api' as PlaybookCategory,
          resolved: false,
          resolutionTime: 40,
          findings: [{ title: 'Missing timeout handling', category: 'gap', impact: 'high' as const }],
        },
      ];

      // Analyze
      const analysis = analyzePlaybookEffectiveness(playbook.id, incidents);

      // Apply improvement
      if (analysis.suggestedImprovements.length > 0) {
        const suggestion = analysis.suggestedImprovements[0];
        applyPlaybookImprovement(playbook.id, 'add-step', { title: suggestion.improvement }, suggestion.rationale);
      }

      const updated = getPlaybook(playbook.id);

      expect(updated?.version).toBeGreaterThan(initialVersion);
      expect(updated?.steps.length).toBeGreaterThanOrEqual(playbook.steps.length);
    });

    it('tracks multiple improvements over time', () => {
      const playbook = getPlaybookForCategory('deployment');
      if (!playbook) return;

      const improvements = [];

      for (let i = 0; i < 3; i++) {
        const improvement = applyPlaybookImprovement(
          playbook.id,
          'update-duration',
          { newDuration: 10 + i },
          `Improvement ${i + 1}`,
          playbook.steps[0]?.id
        );

        if (improvement) improvements.push(improvement);
      }

      expect(improvements.length).toBe(3);

      const history = getPlaybookImprovements(playbook.id);
      expect(history.length).toBeGreaterThanOrEqual(3);
    });
  });
});
