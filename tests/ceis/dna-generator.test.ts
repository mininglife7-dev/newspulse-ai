import { describe, expect, it } from 'vitest';
import {
  QUALITY_GATE_NAMES,
  buildProposal,
  dnaCode,
  freshGates,
} from '@/lib/ceis/dna-generator';
import { computeEvolutionScore } from '@/lib/ceis/evolution-score';
import { NOW, makeDimensions, makeGap, makePrinciple } from './helpers';

describe('freshGates / dnaCode', () => {
  it('creates all nine pending quality gates', () => {
    const gates = freshGates();
    expect(gates).toHaveLength(9);
    expect(new Set(gates.map((g) => g.name))).toEqual(
      new Set(QUALITY_GATE_NAMES)
    );
    expect(gates.every((g) => g.status === 'pending')).toBe(true);
  });

  it('derives a stable human code from the principle id', () => {
    expect(dnaCode('abc123def')).toBe('DNA-CABC12');
    expect(dnaCode('abc123def')).toBe(dnaCode('abc123def'));
  });
});

describe('buildProposal', () => {
  const principle = makePrinciple();
  const gap = makeGap();
  const score = computeEvolutionScore(makeDimensions());

  it('uses LLM output when present', () => {
    const p = buildProposal({
      principle,
      gap,
      score,
      raw: {
        title: 'Session memory for search',
        mission: 'Build memory.',
        priority: 'high',
        implementation_plan: ['a', 'b', 'c'],
        metrics: ['retention +10%'],
      },
      now: NOW,
    });
    expect(p.title).toBe('Session memory for search');
    expect(p.priority).toBe('high');
    expect(p.implementation_plan).toEqual(['a', 'b', 'c']);
    expect(p.status).toBe('proposed');
    expect(p.gates).toHaveLength(9);
    expect(p.evidence).toEqual(principle.evidence);
  });

  it('falls back to a complete template proposal on empty LLM output', () => {
    const p = buildProposal({ principle, gap, score, raw: {}, now: NOW });
    expect(p.title).toBe(principle.principle);
    expect(p.mission.length).toBeGreaterThan(0);
    expect(p.implementation_plan.length).toBeGreaterThanOrEqual(3);
    expect(p.testing_plan.length).toBeGreaterThanOrEqual(2);
    expect(p.rollback_plan.length).toBeGreaterThan(0);
    expect(p.metrics.length).toBeGreaterThanOrEqual(2);
    expect(p.owner).toBe('founder');
  });

  it('derives priority from the evolution score when LLM priority is invalid', () => {
    const high = buildProposal({
      principle,
      gap,
      score: { ...score, overall: 80 },
      raw: { priority: 'ASAP' as any },
      now: NOW,
    });
    expect(high.priority).toBe('high');
    const low = buildProposal({
      principle,
      gap,
      score: { ...score, overall: 40 },
      raw: {},
      now: NOW,
    });
    expect(low.priority).toBe('low');
  });
});
