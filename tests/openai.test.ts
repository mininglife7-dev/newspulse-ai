import { beforeAll, describe, expect, it } from 'vitest';
import { summarizeArticle, summarizeBatch } from '@/lib/openai';

// These tests exercise the deterministic fallback path: with no OPENAI_API_KEY
// configured, the client throws and summarizeArticle falls back to the source
// text. This lets us verify batching/ordering without any network call.
beforeAll(() => {
  delete process.env.OPENAI_API_KEY;
});

describe('summarizeArticle (fallback path)', () => {
  it('returns the title when there is no content to summarize', async () => {
    const out = await summarizeArticle({ title: 'Headline', content: '' });
    expect(out).toBe('Headline');
  });

  it('falls back to the source text when the API is unavailable', async () => {
    const out = await summarizeArticle({
      title: 'Headline',
      content: 'A short body of article text.',
    });
    expect(out).toBe('A short body of article text.');
  });

  it('truncates long fallback text to ~280 chars with an ellipsis', async () => {
    const long = 'x'.repeat(500);
    const out = await summarizeArticle({ title: 'T', content: long });
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(281);
  });
});

describe('summarizeBatch', () => {
  it('returns one summary per article, in the original order', async () => {
    const articles = [
      { title: 'A', content: 'alpha body' },
      { title: 'B', content: 'bravo body' },
      { title: 'C', content: 'charlie body' },
    ];
    const out = await summarizeBatch(articles, 2);
    expect(out).toEqual(['alpha body', 'bravo body', 'charlie body']);
  });

  it('handles an empty list', async () => {
    const out = await summarizeBatch([], 4);
    expect(out).toEqual([]);
  });
});
