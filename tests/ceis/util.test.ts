import { describe, expect, it } from 'vitest';
import {
  clamp,
  excerpt,
  isoWeek,
  similarity,
  stableId,
  toScore5,
  tokenize,
} from '@/lib/ceis/util';

describe('stableId', () => {
  it('is deterministic for the same input', () => {
    expect(stableId('a', 'b')).toBe(stableId('a', 'b'));
  });

  it('differs for different inputs', () => {
    expect(stableId('a', 'b')).not.toBe(stableId('a', 'c'));
    expect(stableId('ab')).not.toBe(stableId('ba'));
  });

  it('produces a 16-char hex id', () => {
    expect(stableId('hello world')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('tokenize / similarity', () => {
  it('drops stop words and short tokens', () => {
    const tokens = tokenize('The AI is in the box');
    expect(tokens.has('the')).toBe(false);
    expect(tokens.has('box')).toBe(true);
  });

  it('returns 1 for identical text and 0 for disjoint text', () => {
    expect(
      similarity('vector search embeddings', 'vector search embeddings')
    ).toBe(1);
    expect(similarity('vector search', 'coffee brewing techniques')).toBe(0);
  });

  it('detects same idea in different words as partially similar', () => {
    const a = 'Add semantic vector search over saved news articles';
    const b = 'Semantic search across articles using vectors';
    expect(similarity(a, b)).toBeGreaterThan(0.3);
  });

  it('handles empty strings', () => {
    expect(similarity('', 'anything')).toBe(0);
  });
});

describe('isoWeek', () => {
  it('computes known ISO weeks', () => {
    expect(isoWeek(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-W01');
    expect(isoWeek(new Date(Date.UTC(2026, 6, 9)))).toBe('2026-W28');
    // Jan 1 2027 is a Friday → ISO week 53 of 2026.
    expect(isoWeek(new Date(Date.UTC(2027, 0, 1)))).toBe('2026-W53');
  });
});

describe('toScore5 / clamp / excerpt', () => {
  it('coerces valid values and falls back otherwise', () => {
    expect(toScore5(4)).toBe(4);
    expect(toScore5(4.4)).toBe(4);
    expect(toScore5(99)).toBe(3);
    expect(toScore5('nope', 2)).toBe(2);
  });

  it('clamps into range', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('truncates long text with an ellipsis', () => {
    const long = 'word '.repeat(100);
    const cut = excerpt(long, 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith('…')).toBe(true);
    expect(excerpt('short', 50)).toBe('short');
  });
});
