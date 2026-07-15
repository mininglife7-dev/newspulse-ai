import { describe, expect, it } from 'vitest';
import {
  computeEvolutionScore,
  overallEvolutionScore,
  scorePrinciple,
} from '@/lib/ceis/evolution-score';
import { makeDimensions, makeGap, makePrinciple } from './helpers';

describe('computeEvolutionScore', () => {
  it('stays within 0..100', () => {
    const best = computeEvolutionScore(
      makeDimensions({
        customer_value: 5,
        launch_impact: 5,
        innovation: 5,
        strategic_alignment: 5,
        engineering_cost: 1,
        maintenance_cost: 1,
        complexity: 1,
        risk: 1,
        confidence: 1,
        roi: 5,
      })
    );
    const worst = computeEvolutionScore(
      makeDimensions({
        customer_value: 1,
        launch_impact: 1,
        innovation: 1,
        strategic_alignment: 1,
        engineering_cost: 5,
        maintenance_cost: 5,
        complexity: 5,
        risk: 5,
        confidence: 0,
        roi: 1,
      })
    );
    expect(best.overall).toBe(100);
    expect(worst.overall).toBe(0);
  });

  it('inverts cost dimensions: cheaper is better', () => {
    const cheap = computeEvolutionScore(
      makeDimensions({ engineering_cost: 1 })
    );
    const expensive = computeEvolutionScore(
      makeDimensions({ engineering_cost: 5 })
    );
    expect(cheap.overall).toBeGreaterThan(expensive.overall);
  });

  it('scales the score by evidence confidence', () => {
    const confident = computeEvolutionScore(makeDimensions({ confidence: 1 }));
    const unconfident = computeEvolutionScore(
      makeDimensions({ confidence: 0.1 })
    );
    expect(confident.overall).toBeGreaterThan(unconfident.overall);
  });
});

describe('scorePrinciple', () => {
  it('rewards missing capabilities over already-covered ones', () => {
    const p = makePrinciple();
    const missing = scorePrinciple(p, makeGap({ status: 'missing' }));
    const partial = scorePrinciple(p, makeGap({ status: 'partially-exists' }));
    expect(missing.overall).toBeGreaterThan(partial.overall);
  });
});

describe('overallEvolutionScore', () => {
  it('returns 0 for no proposals and the mean otherwise', () => {
    expect(overallEvolutionScore([])).toBe(0);
    const a = computeEvolutionScore(makeDimensions());
    const b = computeEvolutionScore(
      makeDimensions({ customer_value: 1, roi: 1 })
    );
    const mean = overallEvolutionScore([a, b]);
    expect(mean).toBe(Math.round((a.overall + b.overall) / 2));
  });
});
