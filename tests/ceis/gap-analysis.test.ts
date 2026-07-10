import { describe, expect, it } from 'vitest';
import { analyzeGap, analyzeGaps } from '@/lib/ceis/gap-analysis';
import { SEED_GENOME } from '@/lib/ceis/genome';
import { makePrinciple } from './helpers';

describe('gap analysis against the seed genome', () => {
  it('flags a duplicate of an existing capability as already-exists', () => {
    const p = makePrinciple({
      principle:
        'Let organizations catalog their AI systems with vendor, type and purpose in an inventory',
      what_happened:
        'A compliance product added an AI systems inventory where organizations register name, vendor, purpose and status.',
      why_it_worked:
        'A per-workspace catalog registry of AI systems makes governance tractable.',
    });
    const gap = analyzeGap(p, SEED_GENOME);
    expect(gap.status).toBe('already-exists');
    expect(gap.matched_capability).toBe('AI system inventory');
    expect(gap.similarity).toBeGreaterThan(0.5);
  });

  it('classifies a genuinely novel principle as missing', () => {
    const p = makePrinciple({
      principle:
        'Offer collaborative annotation so teams discuss findings together',
      what_happened: 'Teams annotate shared documents collaboratively.',
      why_it_worked: 'Collaboration creates network lock-in.',
    });
    const gap = analyzeGap(p, SEED_GENOME);
    expect(gap.status).toBe('missing');
    expect(gap.matched_capability).toBeNull();
  });

  it('parks hard, low-ROI novel ideas as future opportunities', () => {
    const p = makePrinciple({
      principle: 'Train a proprietary foundation model on domain corpora',
      what_happened: 'A lab trained its own foundation model.',
      why_it_worked: 'Owning weights differentiates.',
      implementation_difficulty: 5,
      expected_roi: 1,
    });
    const gap = analyzeGap(p, SEED_GENOME);
    expect(gap.status).toBe('future-opportunity');
  });

  it('parks not-applicable ideas as future opportunities', () => {
    const p = makePrinciple({
      principle: 'Sell robotics hardware bundles alongside subscriptions',
      applies_to_euro_ai: false,
    });
    expect(analyzeGap(p, SEED_GENOME).status).toBe('future-opportunity');
  });

  it('always explains its rationale and maps every principle', () => {
    const principles = [
      makePrinciple(),
      makePrinciple({ principle: 'Something else entirely' }),
    ];
    const gaps = analyzeGaps(principles, SEED_GENOME);
    expect(gaps).toHaveLength(2);
    for (const g of gaps) {
      expect(g.rationale.length).toBeGreaterThan(10);
    }
  });
});
