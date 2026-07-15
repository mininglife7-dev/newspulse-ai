import { describe, expect, it } from 'vitest';
import { heuristicPrinciples, normalizePrinciple } from '@/lib/ceis/extraction';
import { makeObservation } from './helpers';

describe('normalizePrinciple', () => {
  const obs = makeObservation();

  it('normalizes a well-formed raw principle', () => {
    const p = normalizePrinciple(
      {
        observation_ids: [obs.id],
        what_happened: 'X happened',
        why_it_worked: 'because Y',
        principle: 'Do Z when W',
        category: 'engineering-practice',
        applies_to_euro_ai: true,
        applies_to_cathedral: true,
        estimated_customer_value: 4,
        engineering_complexity: 2,
        business_value: 4,
        implementation_difficulty: 2,
        risk: 1,
        expected_roi: 5,
        confidence: 0.9,
      },
      [obs]
    );
    expect(p).not.toBeNull();
    expect(p!.category).toBe('engineering-practice');
    expect(p!.evidence[0]).toContain(obs.url);
    // Confidence blends LLM (0.9) and evidence (0.8) equally.
    expect(p!.confidence).toBeCloseTo(0.85, 5);
  });

  it('rejects principles without text or without real observations', () => {
    expect(normalizePrinciple({ principle: '' }, [obs])).toBeNull();
    expect(
      normalizePrinciple(
        { principle: 'Unfalsifiable claim', observation_ids: ['made-up-id'] },
        [obs]
      )
    ).toBeNull();
  });

  it('repairs invalid categories and scores instead of failing', () => {
    const p = normalizePrinciple(
      {
        observation_ids: [obs.id],
        principle: 'Valid principle',
        category: 'nonsense-category',
        estimated_customer_value: 42,
      },
      [obs]
    );
    expect(p!.category).toBe(obs.category);
    expect(p!.estimated_customer_value).toBe(3);
  });
});

describe('heuristicPrinciples (keyless fallback)', () => {
  it('only promotes confident observations, capped at 5, with reduced confidence', () => {
    const observations = [
      makeObservation({ title: 'strong 1', confidence: 0.9 }),
      makeObservation({ title: 'strong 2', confidence: 0.8 }),
      makeObservation({ title: 'weak', confidence: 0.4 }),
    ];
    const principles = heuristicPrinciples(observations);
    expect(principles).toHaveLength(2);
    expect(principles[0].confidence).toBeCloseTo(0.7, 5);
    expect(principles[0].observation_ids).toEqual([observations[0].id]);
  });
});
