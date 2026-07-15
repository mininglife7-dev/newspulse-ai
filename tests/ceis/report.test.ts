import { describe, expect, it } from 'vitest';
import { buildReport } from '@/lib/ceis/report';
import type { EvolutionCycleResult } from '@/lib/ceis/types';
import { NOW, makeObservation, makePrinciple, makeProposal } from './helpers';

function makeCycle(
  overrides: Partial<EvolutionCycleResult> = {}
): EvolutionCycleResult {
  return {
    id: 'cycle1',
    started_at: NOW.toISOString(),
    finished_at: NOW.toISOString(),
    stats: {
      observations: 2,
      principles: 2,
      accepted: 1,
      rejected: 1,
      dna_generated: 1,
      collectors_run: 4,
      collectors_failed: 1,
    },
    observations: [
      makeObservation({
        title: 'Startup raises on memory agents',
        category: 'ai-startups',
      }),
      makeObservation({
        title: 'EU AI Act enforcement',
        category: 'governance-regulation',
      }),
    ],
    principles: [makePrinciple()],
    gaps: [],
    verdicts: [],
    proposals: [makeProposal({ title: 'Add session memory' })],
    rejected: [
      {
        principle: makePrinciple({ principle: 'Chase the hype train' }),
        verdict: {
          principle_id: 'x',
          accepted: false,
          rejections: [
            {
              rule: 'hype-without-customer-value',
              reason: 'No customer value.',
            },
          ],
        },
      },
    ],
    overall_evolution_score: 66,
    ...overrides,
  };
}

describe('buildReport', () => {
  it('includes every required section with content routed by category', () => {
    const report = buildReport(makeCycle(), NOW);
    expect(report.week).toBe('2026-W28');
    expect(report.overall_evolution_score).toBe(66);
    const md = report.markdown;
    expect(md).toContain('## Overall Evolution Score: 66/100');
    expect(md).toContain('Startup raises on memory agents'); // AI discoveries
    expect(md).toContain('EU AI Act enforcement'); // regulatory watch
    expect(md).toContain('Add session memory'); // DNA proposal
    expect(md).toContain('Chase the hype train'); // intentionally ignored
    expect(md).toContain('hype-without-customer-value');
    expect(md).toContain('never copies products'); // ethics footer
  });

  it('handles an empty cycle gracefully', () => {
    const report = buildReport(
      makeCycle({
        observations: [],
        proposals: [],
        rejected: [],
        overall_evolution_score: 0,
      }),
      NOW
    );
    expect(report.markdown).toContain(
      '_Nothing significant observed this cycle._'
    );
    expect(report.markdown).toContain('quiet week is a healthy immune system');
  });
});
