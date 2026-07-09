import { describe, expect, it } from 'vitest';

import { LearningGenome } from '../genome';
import {
  ORGAN_REGISTRY,
  deriveMaturity,
  findFabricatedMaturity,
  listOrgans,
} from '../organs';
import type { OrganProfile } from '../types';

const at = '2026-07-09T00:00:00.000Z';

describe('Phase 7 — organ maturity cannot be fabricated', () => {
  it('every registry profile declares only `unknown` maturity', () => {
    for (const organ of ORGAN_REGISTRY) {
      expect(organ.declaredMaturity).toBe('unknown');
    }
  });

  it('derives `unknown` maturity for an organ with no records', () => {
    const genome = new LearningGenome();
    expect(deriveMaturity('sales-engine', genome)).toBe('unknown');
  });

  it('cannot reach `developing` without a genuinely supported hypothesis', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({ organId: 'vajra', statement: 'edge', at });
    // Only weak, non-decisive evidence: stays in testing, not supported.
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 0.4,
      source: 'weak',
      at,
    });
    expect(genome.getHypothesis(h.id)?.status).not.toBe('supported');
    expect(deriveMaturity('vajra', genome)).toBe('seed');
  });

  it('reaches `developing` only when evidence supports a hypothesis', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({ organId: 'vajra', statement: 'edge', at });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 0.9,
      source: 'a',
      at,
    });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 0.9,
      source: 'b',
      at,
    });
    expect(deriveMaturity('vajra', genome)).toBe('developing');
  });

  it('flags a profile that declares more maturity than the ledger earned', () => {
    const genome = new LearningGenome();
    // Simulate a fabricated profile (declares `proven` with an empty ledger).
    const fabricated: OrganProfile = {
      ...listOrgans()[0],
      declaredMaturity: 'proven' as OrganProfile['declaredMaturity'],
    };
    const offenders = findFabricatedMaturity(genome, [fabricated]);
    expect(offenders).toHaveLength(1);
    expect(offenders[0]?.earned).toBe('unknown');
  });

  it('passes the integrity check for the real registry on an empty genome', () => {
    const genome = new LearningGenome();
    expect(findFabricatedMaturity(genome)).toHaveLength(0);
  });
});
