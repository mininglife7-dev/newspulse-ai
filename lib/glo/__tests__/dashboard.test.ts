import { describe, expect, it } from 'vitest';

import { buildDashboardBlock } from '../dashboard';
import { LearningGenome } from '../genome';
import { buildSeededGenome, SEED_AT } from '../seed';

const at = '2026-07-09T00:00:00.000Z';

describe('Phase 7 — dashboard uses real evidence only', () => {
  it('reports honest zeros and unknowns for an empty genome', () => {
    const block = buildDashboardBlock(new LearningGenome(), at);
    expect(block.activeHypotheses).toBe(0);
    expect(block.supportedHypotheses).toBe(0);
    expect(block.evidenceGenerated).toBe(0);
    expect(block.learningsGenerated).toBe(0);
    expect(block.transferableLessons).toHaveLength(0);
    // No fabricated confidence anywhere.
    expect(block.confidenceDistribution.high).toBe(0);
    expect(block.confidenceDistribution.moderate).toBe(0);
    // Every organ honestly unknown when nothing is recorded.
    expect(block.unknownTerritory.organsAtUnknownMaturity).toBe(
      block.totalOrgans
    );
    expect(block.organs.every((o) => o.earnedMaturity === 'unknown')).toBe(
      true
    );
    expect(block.integrityOk).toBe(true);
  });

  it('every dashboard figure is backed by a real ledger record', () => {
    const genome = buildSeededGenome();
    const block = buildDashboardBlock(genome, SEED_AT);

    // Counts must equal what is actually in the genome — no inflation.
    expect(block.evidenceGenerated).toBe(genome.allEvidence().length);
    expect(block.learningsGenerated).toBe(genome.allLearnings().length);
    expect(block.supportedHypotheses).toBe(
      genome.hypothesesByStatus('supported').length
    );
    expect(block.rejectedHypotheses).toBe(
      genome.hypothesesByStatus('rejected').length
    );
    expect(block.preservedHypotheses).toBe(
      genome.hypothesesByStatus('rejected').length +
        genome.hypothesesByStatus('retired').length
    );

    // Confidence distribution sums to the number of hypotheses.
    const dist = block.confidenceDistribution;
    expect(dist.unknown + dist.low + dist.moderate + dist.high).toBe(
      genome.allHypotheses().length
    );

    // Seed is honest: at least one rejected (preserved) and one supported.
    expect(block.rejectedHypotheses).toBeGreaterThanOrEqual(1);
    expect(block.supportedHypotheses).toBeGreaterThanOrEqual(1);

    // Integrity holds: no organ over-declares maturity.
    expect(block.integrityOk).toBe(true);
  });

  it('surfaces a transferable lesson from the seeded, genuinely-supported learning', () => {
    const genome = buildSeededGenome();
    const block = buildDashboardBlock(genome, SEED_AT);
    // Governor's verification-discipline learning transfers to Founder Academy.
    expect(block.transferableLessons.length).toBeGreaterThanOrEqual(1);
    expect(
      block.transferableLessons.every((t) => t.status === 'recommended')
    ).toBe(true);
  });

  it('names a concrete next organism-wide experiment', () => {
    const block = buildDashboardBlock(buildSeededGenome(), SEED_AT);
    expect(block.nextBestOrganismExperiment).toMatch(/\w+/);
  });
});
