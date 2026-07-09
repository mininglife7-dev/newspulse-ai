import { describe, expect, it } from 'vitest';

import { assessConfidence, isSuccess, levelFor } from '../confidence';
import { LearningGenome } from '../genome';
import type { Evidence } from '../types';

const at = '2026-07-09T00:00:00.000Z';

function evidence(partial: Partial<Evidence>): Evidence {
  return {
    id: 'e',
    hypothesisId: 'h',
    organId: 'governor',
    direction: 'supporting',
    strength: 1,
    source: 'test',
    recordedAt: at,
    ...partial,
  };
}

describe('Phase 7 — unknown is never treated as success', () => {
  it('reports unknown for an empty evidence set', () => {
    const report = assessConfidence([]);
    expect(report.level).toBe('unknown');
    expect(report.hasEvidence).toBe(false);
    expect(isSuccess(report.level)).toBe(false);
  });

  it('isSuccess() rejects unknown and low', () => {
    expect(isSuccess('unknown')).toBe(false);
    expect(isSuccess('low')).toBe(false);
    expect(isSuccess('moderate')).toBe(true);
    expect(isSuccess('high')).toBe(true);
  });

  it('levelFor() can never return non-unknown without evidence', () => {
    for (const weight of [-5, -1, 0, 1, 5, 100]) {
      expect(levelFor(weight, false)).toBe('unknown');
    }
  });

  it('net non-positive evidence weight stays unknown, not success', () => {
    const report = assessConfidence([
      evidence({ direction: 'supporting', strength: 0.4 }),
      evidence({ direction: 'refuting', strength: 0.6 }),
    ]);
    expect(report.level).toBe('unknown');
    expect(isSuccess(report.level)).toBe(false);
  });
});

describe('Phase 7 — confidence requires evidence', () => {
  it('a freshly proposed hypothesis has unknown confidence', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'vajra',
      statement: 'edge exists',
      at,
    });
    const report = genome.confidenceFor(h.id);
    expect(report.hasEvidence).toBe(false);
    expect(report.level).toBe('unknown');
    expect(h.status).toBe('proposed');
  });

  it('confidence only rises once supporting evidence is recorded', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'vajra',
      statement: 'edge exists',
      at,
    });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 0.9,
      source: 'backtest',
      at,
    });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 0.9,
      source: 'out-of-sample',
      at,
    });
    const report = genome.confidenceFor(h.id);
    expect(report.hasEvidence).toBe(true);
    expect(isSuccess(report.level)).toBe(true);
    expect(genome.getHypothesis(h.id)?.status).toBe('supported');
  });

  it('there is no API to set confidence directly — only evidence moves it', () => {
    const genome = new LearningGenome();
    const anyGenome = genome as unknown as Record<string, unknown>;
    expect(anyGenome.setConfidence).toBeUndefined();
    expect(anyGenome.setStatus).toBeUndefined();
  });
});
