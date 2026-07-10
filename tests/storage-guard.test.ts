import { describe, it, expect } from 'vitest';
import { capResultsForStorage, type NewsArticle } from '@/lib/supabase';

function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: 'Title',
    url: 'https://example.com/a',
    source: 'example.com',
    date: '2026-07-09',
    description: 'A description',
    ai_summary: 'A summary',
    ...overrides,
  };
}

describe('capResultsForStorage (risk R-13 storage guard)', () => {
  it('passes normal results through unchanged', () => {
    const input = [article(), article({ description: null })];
    const out = capResultsForStorage(input);
    expect(out).toEqual(input);
  });

  it('caps the number of stored results at 25', () => {
    const input = Array.from({ length: 100 }, () => article());
    expect(capResultsForStorage(input)).toHaveLength(25);
  });

  it('truncates oversized text fields', () => {
    const big = 'x'.repeat(100_000);
    const [out] = capResultsForStorage([
      article({ title: big, source: big, description: big, ai_summary: big }),
    ]);
    expect(out.title.length).toBeLessThanOrEqual(500);
    expect(out.source.length).toBeLessThanOrEqual(200);
    expect(out.description!.length).toBeLessThanOrEqual(4000);
    expect(out.ai_summary.length).toBeLessThanOrEqual(4000);
    expect(out.title.endsWith('…')).toBe(true);
  });

  it('keeps null description as null', () => {
    const [out] = capResultsForStorage([article({ description: null })]);
    expect(out.description).toBeNull();
  });

  it('bounds total serialized row size even under adversarial input', () => {
    const big = 'x'.repeat(1_000_000);
    const input = Array.from({ length: 200 }, () =>
      article({ description: big, ai_summary: big, title: big })
    );
    const out = capResultsForStorage(input);
    // 25 items × (~4000 × 2 + 500 + 200 + url/date overhead) ≈ well under 1 MB
    expect(JSON.stringify(out).length).toBeLessThan(1_000_000);
  });
});
