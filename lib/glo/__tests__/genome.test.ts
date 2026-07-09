import { describe, expect, it } from 'vitest';

import { LearningGenome } from '../genome';

const at = '2026-07-09T00:00:00.000Z';

describe('Phase 7 — rejected hypotheses are preserved, not erased', () => {
  it('keeps a rejected hypothesis in the ledger with a reason', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'euro-ai',
      statement: 'this obligation applies',
      at,
    });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'refuting',
      strength: 0.9,
      source: 'primary source contradicts it',
      at,
    });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'refuting',
      strength: 0.9,
      source: 'official guidance contradicts it',
      at,
    });

    const stored = genome.getHypothesis(h.id);
    expect(stored?.status).toBe('rejected');
    // Preserved: still retrievable and still counted.
    expect(genome.allHypotheses().map((x) => x.id)).toContain(h.id);
    expect(genome.hypothesesByStatus('rejected')).toHaveLength(1);
    expect(stored?.resolutionNote).toBeTruthy();
    expect(stored?.resolvedAt).toBe(at);
  });

  it('retire() preserves the hypothesis rather than deleting it', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'governor',
      statement: 'old idea',
      at,
    });
    genome.retire({
      hypothesisId: h.id,
      note: 'superseded by a better approach',
      at,
    });

    const stored = genome.getHypothesis(h.id);
    expect(stored?.status).toBe('retired');
    expect(stored?.resolutionNote).toBe('superseded by a better approach');
    expect(genome.allHypotheses()).toHaveLength(1);
  });

  it('a retired hypothesis is frozen — later evidence does not revive it', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'governor',
      statement: 'old idea',
      at,
    });
    genome.retire({ hypothesisId: h.id, note: 'withdrawn', at });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 1,
      source: 'late arrival',
      at,
    });
    expect(genome.getHypothesis(h.id)?.status).toBe('retired');
  });

  it('there is no delete/remove method on the genome', () => {
    const genome = new LearningGenome();
    const anyGenome = genome as unknown as Record<string, unknown>;
    expect(anyGenome.delete).toBeUndefined();
    expect(anyGenome.remove).toBeUndefined();
    expect(anyGenome.erase).toBeUndefined();
  });
});

describe('Phase 7 — a learning can only come from a supported hypothesis', () => {
  it('refuses to mint a learning from an unknown hypothesis', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'vajra',
      statement: 'unproven',
      at,
    });
    expect(() =>
      genome.learn({ hypothesisId: h.id, principle: 'nope', at })
    ).toThrowError(/not "supported"/);
  });

  it('allows a learning once the hypothesis is genuinely supported', () => {
    const genome = new LearningGenome();
    const h = genome.hypothesize({ organId: 'vajra', statement: 'proven', at });
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
    const learning = genome.learn({
      hypothesisId: h.id,
      principle: 'it works',
      at,
    });
    expect(learning.sourceHypothesisId).toBe(h.id);
    expect(genome.allLearnings()).toHaveLength(1);
  });
});
