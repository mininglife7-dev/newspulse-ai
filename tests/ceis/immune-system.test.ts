import { describe, expect, it } from 'vitest';
import {
  extractRecordedConfidence,
  runImmuneSystem,
  type ImmuneContext,
} from '@/lib/ceis/immune-system';
import type { GenomeEntry } from '@/lib/ceis/types';
import { makeGap, makePrinciple } from './helpers';

function ctx(overrides: Partial<ImmuneContext> = {}): ImmuneContext {
  return {
    gap: makeGap(),
    rejectedIdeas: [],
    activeWork: [],
    ...overrides,
  };
}

describe('immune system', () => {
  it('accepts a strong, novel, evidenced principle', () => {
    const verdict = runImmuneSystem(makePrinciple(), ctx());
    expect(verdict.accepted).toBe(true);
    expect(verdict.rejections).toHaveLength(0);
  });

  it('rejects what already exists — with a reason', () => {
    const verdict = runImmuneSystem(
      makePrinciple(),
      ctx({
        gap: makeGap({
          status: 'already-exists',
          rationale:
            'Strong overlap (80%) with genome entry "AI article summarization".',
        }),
      })
    );
    expect(verdict.accepted).toBe(false);
    expect(verdict.rejections[0].rule).toBe('already-exists');
    expect(verdict.rejections[0].reason).toContain('AI article summarization');
  });

  it('protects active parallel work', () => {
    const p = makePrinciple({
      principle: 'Add semantic vector search over saved articles',
    });
    const verdict = runImmuneSystem(
      p,
      ctx({ activeWork: ['Semantic vector search over saved articles'] })
    );
    expect(verdict.accepted).toBe(false);
    expect(verdict.rejections.map((r) => r.rule)).toContain(
      'duplicate-of-active-work'
    );
  });

  it('never rediscovers a rejected idea without new evidence', () => {
    const rejected: GenomeEntry = {
      id: 'r1',
      kind: 'rejected-idea',
      title: 'Give users persistent context memory across sessions',
      summary: 'Rejected for complexity.',
      tags: [],
      evidence: 'confidence=0.80 at rejection',
      created_at: '2026-01-01T00:00:00Z',
    };
    const again = runImmuneSystem(
      makePrinciple({ confidence: 0.8 }),
      ctx({ rejectedIdeas: [rejected] })
    );
    expect(again.accepted).toBe(false);
    expect(again.rejections.map((r) => r.rule)).toContain(
      'previously-rejected'
    );

    // Meaningfully stronger evidence reopens the idea.
    const reopened = runImmuneSystem(
      makePrinciple({ confidence: 0.99 }),
      ctx({ rejectedIdeas: [rejected] })
    );
    expect(reopened.accepted).toBe(true);
  });

  it('rejects architecture conflicts against serverless-first', () => {
    const p = makePrinciple({
      why_it_worked:
        'They ran a long-running daemon polling feeds continuously.',
    });
    const verdict = runImmuneSystem(p, ctx());
    expect(verdict.rejections.map((r) => r.rule)).toContain(
      'architecture-conflict'
    );
  });

  it('rejects debt, reliability risk and unnecessary complexity', () => {
    const p = makePrinciple({
      engineering_complexity: 5,
      expected_roi: 1,
      risk: 5,
      estimated_customer_value: 2,
      implementation_difficulty: 5,
    });
    const rules = runImmuneSystem(p, ctx()).rejections.map((r) => r.rule);
    expect(rules).toContain('technical-debt');
    expect(rules).toContain('reliability-risk');
    expect(rules).toContain('unnecessary-complexity');
  });

  it('rejects weak evidence and pure hype', () => {
    const hype = makePrinciple({
      category: 'technology-trend',
      confidence: 0.3,
      estimated_customer_value: 1,
      business_value: 1,
    });
    const rules = runImmuneSystem(hype, ctx()).rejections.map((r) => r.rule);
    expect(rules).toContain('insufficient-evidence');
    expect(rules).toContain('hype-without-customer-value');
  });

  it('every rejection carries a human-readable reason', () => {
    const p = makePrinciple({ confidence: 0.1 });
    for (const r of runImmuneSystem(p, ctx()).rejections) {
      expect(r.reason.length).toBeGreaterThan(20);
    }
  });
});

describe('extractRecordedConfidence', () => {
  it('parses recorded confidence and defaults to 0.5', () => {
    expect(extractRecordedConfidence('confidence=0.72 at rejection; x')).toBe(
      0.72
    );
    expect(extractRecordedConfidence(null)).toBe(0.5);
    expect(extractRecordedConfidence('no numbers here')).toBe(0.5);
  });
});
