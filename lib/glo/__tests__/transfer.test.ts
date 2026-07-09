import { describe, expect, it } from 'vitest';

import { LearningGenome } from '../genome';
import { decideTransfer, recommendTransfers } from '../transfer';
import type { Learning } from '../types';

const at = '2026-07-09T00:00:00.000Z';

/** Build a genome with one supported, learning-bearing hypothesis for `organId`. */
function seedLearning(
  organId: Parameters<LearningGenome['hypothesize']>[0]['organId'],
  statement: string,
  principle: string
): { genome: LearningGenome; learning: Learning } {
  const genome = new LearningGenome();
  const h = genome.hypothesize({ organId, statement, at });
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
  const learning = genome.learn({ hypothesisId: h.id, principle, at });
  return { genome, learning };
}

describe('Phase 7 — transfer recommendations do not auto-mutate another organ', () => {
  it('recommending a transfer does not change the genome or the target organ', () => {
    const { genome, learning } = seedLearning(
      'vajra',
      'stronger validation improves research',
      'Rigorous hypothesis validation and falsification tests raise research quality.'
    );

    const beforeHyp = JSON.stringify(genome.allHypotheses());
    const beforeEvidence = JSON.stringify(genome.allEvidence());
    const beforeLearnings = JSON.stringify(genome.allLearnings());

    const recs = recommendTransfers(learning, genome, at);

    // A real transfer opportunity is surfaced (VAJRA -> EURO AI)...
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.status === 'recommended')).toBe(true);
    expect(recs[0]?.toOrgan).toBe('euro-ai');

    // ...but nothing in the genome changed as a side effect.
    expect(JSON.stringify(genome.allHypotheses())).toBe(beforeHyp);
    expect(JSON.stringify(genome.allEvidence())).toBe(beforeEvidence);
    expect(JSON.stringify(genome.allLearnings())).toBe(beforeLearnings);

    // The target organ gained no hypotheses, evidence, or learnings.
    expect(genome.allHypotheses().every((h) => h.organId !== 'euro-ai')).toBe(
      true
    );
    expect(genome.learningsForOrgan('euro-ai')).toHaveLength(0);
  });

  it('never recommends transfers built on an unearned (unknown) learning', () => {
    // Force a learning whose source hypothesis lacks decisive evidence by
    // hand-constructing the learning object (bypassing genome.learn guards).
    const genome = new LearningGenome();
    const h = genome.hypothesize({
      organId: 'vajra',
      statement: 'weakly held',
      at,
    });
    genome.recordEvidence({
      hypothesisId: h.id,
      direction: 'supporting',
      strength: 0.3,
      source: 'weak',
      at,
    });
    const orphanLearning: Learning = {
      id: 'lrn_x',
      organId: 'vajra',
      principle: 'validation matters',
      sourceHypothesisId: h.id,
      createdAt: at,
    };
    expect(recommendTransfers(orphanLearning, genome, at)).toHaveLength(0);
  });

  it('decideTransfer returns a new object and does not mutate the recommendation', () => {
    const { genome, learning } = seedLearning(
      'vajra',
      'stronger validation improves research',
      'Rigorous hypothesis validation raises research quality.'
    );
    const [rec] = recommendTransfers(learning, genome, at);
    expect(rec).toBeDefined();

    const decided = decideTransfer(
      rec!,
      'accepted',
      at,
      'EURO AI will adopt it'
    );
    expect(decided).not.toBe(rec);
    expect(decided.status).toBe('accepted');
    // Original recommendation is untouched.
    expect(rec!.status).toBe('recommended');
    expect(rec!.decidedAt).toBeUndefined();
  });
});
